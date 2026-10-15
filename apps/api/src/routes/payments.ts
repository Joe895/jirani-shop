import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../lib/config.js';
import { prisma } from '../lib/prisma.js';
import { failPayment, initiateStk, reconcilePayment } from '../lib/mpesa.js';
import { normalizeKenyanPhone } from '../lib/business.js';
import { requireAuth } from '../middleware/auth.js';

export const paymentsRouter = Router();
const throttle = rateLimit({ windowMs: 60_000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false });
paymentsRouter.get('/mode', (_req, res) => res.json({ mode: config.mode === 'mock' ? 'mock' : 'daraja' }));

paymentsRouter.post('/mpesa/stk', throttle, requireAuth, async (req, res) => {
  if (config.mode === 'mock') { res.status(409).json({ error: 'Demo mode enabled. Use simulated checkout instead.' }); return; }
  const parsed = z.object({ orderId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'An order is required.' }); return; }
  const order = await prisma.order.findFirst({ where: { id: parsed.data.orderId, userId: req.authUser!.id }, include: { payment: true } });
  if (!order) { res.status(404).json({ error: 'Order not found.' }); return; }
  if (order.status !== 'PENDING_PAYMENT' || order.payment) {
    res.status(409).json({ error: 'Payment was already initiated for this order. View its status in My Orders.' }); return;
  }
  // Record intent first. If a network request times out, do not automatically retry and risk double-charging.
  const created = await prisma.payment.create({
    data: { orderId: order.id, amount: order.total, phone: order.phone, status: 'PENDING' },
  }).catch(() => null);
  if (!created) { res.status(409).json({ error: 'Payment request already exists for this order.' }); return; }
  try {
    const pushed = await initiateStk(order);
    await prisma.payment.update({ where: { id: created.id }, data: pushed });
    res.json({ message: 'M-Pesa prompt requested. Complete payment on your phone.', orderId: order.id });
  } catch (error) {
    // A timed-out request might have reached Safaricom; retaining the intent prevents duplicate prompts.
    console.error('Daraja initiation issue:', error instanceof Error ? error.message : 'Unknown error');
    res.status(502).json({ error: 'Could not confirm the STK request. Please check My Orders before retrying checkout.' });
  }
});

paymentsRouter.post('/mock/complete', throttle, requireAuth, async (req, res) => {
  if (config.mode !== 'mock') { res.status(404).json({ error: 'Not available.' }); return; }
  const parsed = z.object({ orderId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Order ID required.' }); return; }
  const order = await prisma.order.findFirst({ where: { id: parsed.data.orderId, userId: req.authUser!.id }, include: { payment: true } });
  if (!order || order.status !== 'PENDING_PAYMENT' || order.payment) {
    res.status(409).json({ error: 'Order is unavailable for demo checkout.' }); return;
  }
  await prisma.$transaction(async tx => {
    await tx.payment.create({ data: {
      orderId: order.id, phone: order.phone, amount: order.total, status: 'SUCCESS',
      mpesaReceipt: `DEMO-${order.orderNumber}`,
    } });
    await tx.order.updateMany({ where: { id: order.id, status: 'PENDING_PAYMENT' }, data: { status: 'PAID' } });
  });
  res.json({ ok: true, message: 'Demo checkout succeeded. No money was charged.' });
});

paymentsRouter.post('/mpesa/callback/:secret', async (req, res) => {
  if (config.mode === 'mock') { res.status(404).json({ error: 'Not available.' }); return; }
  const expected = Buffer.from(config.callbackSecret);
  const provided = Buffer.from(String(req.params.secret));
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) { res.sendStatus(404); return; }
  const callback = req.body?.Body?.stkCallback;
  if (!callback || typeof callback.CheckoutRequestID !== 'string' || typeof callback.ResultCode !== 'number') {
    res.status(400).json({ error: 'Malformed callback.' }); return;
  }
  const payment = await prisma.payment.findUnique({ where: { checkoutRequestId: callback.CheckoutRequestID } });
  if (!payment) { res.json({ ResultCode: 0, ResultDesc: 'Received; unknown checkout ID.' }); return; }
  if (payment.status !== 'PENDING') { res.json({ ResultCode: 0, ResultDesc: 'Already handled.' }); return; }
  if (callback.ResultCode !== 0) {
    await failPayment(payment.id, String(callback.ResultDesc ?? 'Payment unsuccessful'));
  } else {
    const fields = Object.fromEntries((callback.CallbackMetadata?.Item ?? [])
      .filter((item: { Name?: unknown }) => typeof item.Name === 'string')
      .map((item: { Name: string; Value: unknown }) => [item.Name, item.Value]));
    let phone = '';
    try { phone = normalizeKenyanPhone(String(fields.PhoneNumber ?? '')); } catch { /* invalid metadata: do not verify */ }
    const amount = Number(fields.Amount);
    const receipt = typeof fields.MpesaReceiptNumber === 'string' ? fields.MpesaReceiptNumber : '';
    if (receipt && Number.isFinite(amount) && amount === payment.amount && phone === payment.phone) {
      await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' },
        data: { callbackReceipt: receipt, callbackAmount: amount, callbackPhone: phone } });
      try { await reconcilePayment(payment.id); }
      catch (error) { console.error('Awaiting query confirmation for callback:', error instanceof Error ? error.message : 'Unknown'); }
    } else console.error('Rejected M-Pesa callback: metadata mismatch for checkout ID', callback.CheckoutRequestID);
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted.' });
});

paymentsRouter.post('/mpesa/verify', throttle, requireAuth, async (req, res) => {
  if (config.mode === 'mock') { res.status(404).json({ error: 'Not available.' }); return; }
  const parsed = z.object({ orderId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Order ID required.' }); return; }
  const payment = await prisma.payment.findFirst({ where: { orderId: parsed.data.orderId, order: { userId: req.authUser!.id } } });
  if (!payment) { res.status(404).json({ error: 'Payment not found.' }); return; }
  if (payment.status === 'PENDING' && payment.callbackReceipt) {
    try { await reconcilePayment(payment.id); }
    catch (error) { console.error('M-Pesa verification still pending:', error instanceof Error ? error.message : 'Unknown'); }
  }
  const refreshed = await prisma.payment.findUnique({ where: { id: payment.id }, select: { status: true, failureReason: true } });
  res.json({ payment: refreshed });
});
