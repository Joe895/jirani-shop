import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { makeSlug } from '../lib/business.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/overview', async (_req, res) => {
  const [customers, products, orders, paid, recentOrders] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.order.aggregate({ where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } }, _sum: { total: true }, _count: true }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { user: { select: { name: true } } } }),
  ]);
  res.json({ customers, products, orders, paidOrders: paid._count, revenue: paid._sum.total ?? 0, recentOrders });
});
adminRouter.get('/products', async (_req, res) => {
  const products = await prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: 'desc' } });
  res.json({ products });
});
adminRouter.get('/orders', async (_req, res) => {
  const orders = await prisma.order.findMany({ include: { user: { select: { name: true, email: true } }, items: true, payment: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ orders });
});
const productSchema = z.object({
  name: z.string().trim().min(3).max(130), description: z.string().trim().min(10).max(2000),
  price: z.number().int().min(1).max(10000000), stock: z.number().int().min(0).max(100000),
  categoryId: z.string().min(1), imageUrl: z.string().url().startsWith('https://').max(1000),
  compareAt: z.number().int().positive().nullable().optional(), badge: z.string().trim().max(40).nullable().optional(),
  featured: z.boolean().default(false), isActive: z.boolean().default(true),
});
adminRouter.post('/products', async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid product.' }); return; }
  const { name, ...rest } = parsed.data;
  const slug = `${makeSlug(name)}-${Math.random().toString(36).slice(2, 6)}`;
  const product = await prisma.product.create({ data: { name, slug, ...rest } });
  res.status(201).json({ product });
});
adminRouter.patch('/products/:id', async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid product details.' }); return; }
  const existing = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) { res.status(404).json({ error: 'Product not found.' }); return; }
  const product = await prisma.product.update({ where: { id: existing.id }, data: parsed.data });
  res.json({ product });
});
adminRouter.patch('/orders/:id/status', async (req, res) => {
  const parsed = z.object({ status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED']) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid order status.' }); return; }
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) } });
  if (!order) { res.status(404).json({ error: 'Order not found.' }); return; }
  const allowed: Record<string, string[]> = { PAID: ['PROCESSING'], PROCESSING: ['SHIPPED'], SHIPPED: ['DELIVERED'] };
  if (!(allowed[order.status] ?? []).includes(parsed.data.status)) {
    res.status(409).json({ error: 'Orders must be paid before fulfilment and progress in sequence.' }); return;
  }
  const changed = await prisma.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: parsed.data.status } });
  if (!changed.count) { res.status(409).json({ error: 'Order changed. Refresh and try again.' }); return; }
  res.json({ ok: true });
});
