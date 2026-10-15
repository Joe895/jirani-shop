import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
export const catalogRouter = Router();

catalogRouter.get('/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json({ categories });
});
catalogRouter.get('/products', async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 120);
  const category = String(req.query.category ?? '');
  const sort = String(req.query.sort ?? 'newest');
  const featured = req.query.featured === 'true';
  const orderBy = sort === 'price-low' ? { price: 'asc' as const }
    : sort === 'price-high' ? { price: 'desc' as const }
    : { createdAt: 'desc' as const };
  const products = await prisma.product.findMany({
    where: {
      isActive: true, ...(featured ? { featured: true } : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { description: { contains: q, mode: 'insensitive' as const } }] } : {}),
    },
    include: { category: { select: { name: true, slug: true } } },
    orderBy, take: 60,
  });
  res.json({ products });
});
catalogRouter.get('/products/:slug', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { slug: String(req.params.slug) }, include: { category: true } });
  if (!product?.isActive) { res.status(404).json({ error: 'Product not found.' }); return; }
  res.json({ product });
});
