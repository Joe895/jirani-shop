import { config } from './config.js';
import { prisma } from './prisma.js';

const shortcode = process.env.MPESA_SHORTCODE ?? '';
let tokenCache: { token: string; expiresAt: number } | null = null;

function timestamp(): string {
  const dateParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const part = (type: string) => dateParts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}${part('month')}${part('day')}${part('hour')}${part('minute')}${part('second')}`;
}

function password(time: string): string {
  return Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${time}`).toString('base64');
}

async function jsonFetch(url: string, options: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Daraja request failed with HTTP ${response.status}`);
  return data;
}
async function token(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const basic = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const result = await jsonFetch(`${config.mpesaBase}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET', headers: { Authorization: `Basic ${basic}` },
  });
  if (typeof result.access_token !== 'string') throw new Error('Daraja OAuth did not return a token.');
  tokenCache = { token: result.access_token, expiresAt: Date.now() + Math.max(60, Number(result.expires_in ?? 3600) - 120) * 1000 };
  return tokenCache.token;
}

export async function initiateStk(order: { orderNumber: string; total: number; phone: string }) {
  const time = timestamp();
  const result = await jsonFetch(`${config.mpesaBase}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode, Password: password(time), Timestamp: time,
      TransactionType: process.env.MPESA_TRANSACTION_TYPE ?? 'CustomerPayBillOnline',
      Amount: order.total, PartyA: order.phone, PartyB: shortcode, PhoneNumber: order.phone,
      CallBackURL: `${config.publicApiUrl}/api/payments/mpesa/callback/${config.callbackSecret}`,
      AccountReference: order.orderNumber, TransactionDesc: 'Jirani Shop order',
    }),
  });
  if (String(result.ResponseCode) !== '0' || !result.CheckoutRequestID) {
    throw new Error(typeof result.ResponseDescription === 'string' ? result.ResponseDescription : 'M-Pesa STK request was declined.');
  }
  return { checkoutRequestId: String(result.CheckoutRequestID), merchantRequestId: String(result.MerchantRequestID ?? '') };
}

async function stkQuery(checkoutRequestId: string): Promise<number | null> {
  const time = timestamp();
  const result = await jsonFetch(`${config.mpesaBase}/mpesa/stkpushquery/v1/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ BusinessShortCode: shortcode, Password: password(time), Timestamp: time, CheckoutRequestID: checkoutRequestId }),
  });
  return result.ResultCode == null ? null : Number(result.ResultCode);
}

/** Callback metadata PLUS a successful independent Daraja status query are required. */
export async function reconcilePayment(paymentId: string): Promise<'PAID' | 'PENDING'> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment || payment.status !== 'PENDING' || !payment.checkoutRequestId || !payment.callbackReceipt) return 'PENDING';
  if (payment.callbackAmount !== payment.amount || payment.callbackPhone !== payment.phone) return 'PENDING';
  const resultCode = await stkQuery(payment.checkoutRequestId);
  if (resultCode !== 0) return 'PENDING';
  await prisma.$transaction(async tx => {
    const changed = await tx.payment.updateMany({ where: { id: payment.id, status: 'PENDING' },
      data: { status: 'SUCCESS', mpesaReceipt: payment.callbackReceipt } });
    if (changed.count) await tx.order.updateMany({ where: { id: payment.orderId, status: 'PENDING_PAYMENT' }, data: { status: 'PAID' } });
  });
  return 'PAID';
}

export async function failPayment(paymentId: string, reason: string) {
  await prisma.$transaction(async tx => {
    const changed = await tx.payment.updateMany({ where: { id: paymentId, status: 'PENDING' },
      data: { status: 'FAILED', failureReason: reason.slice(0, 200) } });
    if (!changed.count) return;
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: { include: { items: true } } } });
    if (!payment) return;
    const cancelled = await tx.order.updateMany({ where: { id: payment.orderId, status: 'PENDING_PAYMENT' }, data: { status: 'CANCELLED' } });
    if (cancelled.count) for (const item of payment.order.items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
  });
}
