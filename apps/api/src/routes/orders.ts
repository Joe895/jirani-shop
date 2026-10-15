import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { deliveryFee, normalizeKenyanPhone } from '../lib/business.js';
import { requireAuth } from '../middleware/auth.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);
const checkout = z.object({
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(9).max(25),
  county: z.string().trim().min(2).max(80),
  town: z.string().trim().min(2).max(80),
  address: z.string().trim().max(250),
  deliveryMethod: z.enum(['delivery', 'pickup']),
}).refine(d => d.deliveryMethod === 'pickup' || d.address.length >= 5, { message: 'A delivery address is required.' });

const includeOrder = { items: true, payment: { select: { status: true, failureReason: true } } } as const;
ordersRouter.post('/', rateLimit({ windowMs: 60_000, limit: 8 }), async (req, res) => {
  const parsed = checkout.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid checkout details.' }); return; }
  const body = parsed.data;
  const outstanding = await prisma.order.count({ where: { userId: req.authUser!.id, status: 'PENDING_PAYMENT' } });
  if (outstanding >= 5) { res.status(429).json({ error: 'Please complete or cancel your earlier unpaid orders first.' }); return; }
  let phone: string;
  try { phone = normalizeKenyanPhone(body.phone); }
  catch (error) { res.status(400).json({ error: (error as Error).message }); return; }
  if (new Set(body.items.map(item => item.productId)).size !== body.items.length) {
    res.status(400).json({ error: 'Duplicate products are not allowed. Update the quantity instead.' }); return;
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const ids = body.items.map(item => item.productId);
      const products = await tx.product.findMany({ where: { id: { in: ids }, isActive: true } });
      if (products.length !== ids.length) throw new Error('Some products are no longer available.');
      const productMap = new Map(products.map(product => [product.id, product]));
      const lines = body.items.map(item => {
        const product = productMap.get(item.productId)!;
        return { productId: product.id, name: product.name, imageUrl: product.imageUrl,
          quantity: item.quantity, unitPrice: product.price, lineTotal: product.price * item.quantity };
      });
      // Stock reservation and order creation happen in ONE transaction, preventing overselling.
      for (const line of lines) {
        const changed = await tx.product.updateMany({
          where: { id: line.productId, stock: { gte: line.quantity }, isActive: true },
          data: { stock: { decrement: line.quantity } },
        });
        if (!changed.count) throw new Error(`Insufficient stock for ${line.name}.`);
      }
      const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const fee = deliveryFee(subtotal, body.county, body.deliveryMethod);
      return tx.order.create({
        data: {
          orderNumber: `JS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
          userId: req.authUser!.id, fullName: body.fullName, phone, county: body.county,
          town: body.town, address: body.address, deliveryMethod: body.deliveryMethod,
          subtotal, deliveryFee: fee, total: subtotal + fee, items: { create: lines },
        }, include: includeOrder,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 12000 });
    res.status(201).json({ order: result });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      res.status(409).json({ error: 'Stock changed during checkout. Please try again.' }); return;
    }
    if (error instanceof Error && /stock|available/i.test(error.message)) {
      res.status(409).json({ error: error.message }); return;
    }
    throw error;
  }
});

ordersRouter.get('/my', async (req, res) => {
  const orders = await prisma.order.findMany({ where: { userId: req.authUser!.id }, include: includeOrder, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ orders });
});
ordersRouter.get('/:id', async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: String(req.params.id), userId: req.authUser!.id }, include: includeOrder });
  if (!order) { res.status(404).json({ error: 'Order not found.' }); return; }
  res.json({ order });
});
ordersRouter.post('/:id/cancel', async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: String(req.params.id), userId: req.authUser!.id }, include: { items: true, payment: true } });
  if (!order) { res.status(404).json({ error: 'Order not found.' }); return; }
  if (order.status !== 'PENDING_PAYMENT' || order.payment) {
    res.status(409).json({ error: 'This order cannot be cancelled while payment is being processed.' }); return;
  }
  const changed = await prisma.$transaction(async tx => {
    const updated = await tx.order.updateMany({ where: { id: order.id, status: 'PENDING_PAYMENT' }, data: { status: 'CANCELLED' } });
    if (updated.count) {
      for (const item of order.items) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
    return updated.count;
  });
  res.json({ ok: changed > 0 });
});
