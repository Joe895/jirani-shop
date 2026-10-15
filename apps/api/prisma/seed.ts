import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const categories = [
  { name: 'Electronics', slug: 'electronics', tagline: 'Gadgets for everyday life', imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=700&q=85' },
  { name: 'Fashion', slug: 'fashion', tagline: 'Find your everyday look', imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=700&q=85' },
  { name: 'Home & Living', slug: 'home-living', tagline: 'Feel right at home', imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=700&q=85' },
  { name: 'Accessories', slug: 'accessories', tagline: 'The little extras', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&q=85' },
];
const products = [
  { name: 'Everyday Wireless Headphones', slug: 'everyday-wireless-headphones', description: 'Comfortable over-ear wireless headphones with a lightweight design, clear sound and easy everyday use.', price: 3890, compareAt: 4500, stock: 16, category: 'electronics', badge: 'Popular', featured: true, imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=850&q=85' },
  { name: 'Streetwise Canvas Sneakers', slug: 'streetwise-canvas-sneakers', description: 'Versatile, easygoing canvas sneakers for city walks, campus and weekend adventures.', price: 2750, compareAt: 3300, stock: 21, category: 'fashion', badge: 'New drop', featured: true, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=850&q=85' },
  { name: 'Karibu Ceramic Coffee Mug', slug: 'karibu-ceramic-coffee-mug', description: 'Minimalist ceramic mug for unhurried mornings and a favourite cup of chai or coffee.', price: 950, compareAt: null, stock: 48, category: 'home-living', badge: null, featured: true, imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=850&q=85' },
  { name: 'Classic Everyday Wristwatch', slug: 'classic-everyday-wristwatch', description: 'A timeless analog wristwatch with a clean dial and comfortable strap for daily wear.', price: 4250, compareAt: 4990, stock: 12, category: 'accessories', badge: 'Bestseller', featured: true, imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=850&q=85' },
  { name: 'Compact Everyday Backpack', slug: 'compact-everyday-backpack', description: 'A smart, practical backpack for your commute, books, laptop accessories and daily essentials.', price: 3200, compareAt: null, stock: 24, category: 'fashion', badge: null, featured: true, imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=850&q=85' },
  { name: 'Portable Bluetooth Speaker', slug: 'portable-bluetooth-speaker', description: 'Small portable Bluetooth speaker made for playlists, podcasts and relaxed weekends.', price: 2990, compareAt: 3490, stock: 28, category: 'electronics', badge: 'Hot deal', featured: true, imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=850&q=85' },
  { name: 'Soft Cotton Essential Tee', slug: 'soft-cotton-essential-tee', description: 'Relaxed-fit everyday cotton t-shirt that pairs with everything in your wardrobe.', price: 1490, compareAt: null, stock: 60, category: 'fashion', badge: null, featured: false, imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=850&q=85' },
  { name: 'Modern Ceramic Table Vase', slug: 'modern-ceramic-table-vase', description: 'A simple modern vase to give your table, shelf or workspace a thoughtful touch.', price: 1850, compareAt: 2300, stock: 18, category: 'home-living', badge: null, featured: false, imageUrl: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=850&q=85' },
  { name: 'Simple Everyday Sunglasses', slug: 'simple-everyday-sunglasses', description: 'Classic easy-to-wear sunglasses for sunshine, road trips and outdoor days.', price: 1750, compareAt: null, stock: 40, category: 'accessories', badge: 'New', featured: false, imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=850&q=85' },
  { name: 'Stainless Steel Travel Bottle', slug: 'stainless-steel-travel-bottle', description: 'Reusable stainless steel bottle that fits conveniently into your busy daily routine.', price: 1990, compareAt: null, stock: 34, category: 'home-living', badge: null, featured: false, imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=850&q=85' },
  { name: 'Wireless Everyday Mouse', slug: 'wireless-everyday-mouse', description: 'Compact wireless mouse for home, office or study setups with smooth, easy navigation.', price: 1650, compareAt: null, stock: 38, category: 'electronics', badge: null, featured: false, imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=850&q=85' },
  { name: 'Minimal Leather Card Holder', slug: 'minimal-leather-card-holder', description: 'Slim card holder for keeping daily cards and essentials neatly organized.', price: 2100, compareAt: null, stock: 25, category: 'accessories', badge: null, featured: false, imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=850&q=85' },
];

async function main() {
  const bySlug = new Map<string, string>();
  for (const category of categories) {
    const saved = await prisma.category.upsert({ where: { slug: category.slug }, update: category, create: category });
    bySlug.set(saved.slug, saved.id);
  }
  for (const item of products) {
    const { category, ...data } = item;
    await prisma.product.upsert({ where: { slug: item.slug }, update: {}, create: { ...data, categoryId: bySlug.get(category)! } });
  }
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword && adminPassword.length >= 12 && !adminPassword.startsWith('set_a_')) {
    const exists = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!exists) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await prisma.user.create({ data: { name: 'Jirani Shop Admin', email: adminEmail, passwordHash, role: 'ADMIN' } });
      console.log('Admin account created. Change the temporary password before public deployment.');
    } else console.log('Admin account already exists; no credentials changed.');
  } else console.log('Admin not provisioned. Set ADMIN_EMAIL and a unique ADMIN_PASSWORD (12+ chars) in apps/api/.env, then rerun seed.');
  console.log(`Seeded ${categories.length} categories and ${products.length} demo products.`);
}
main().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => prisma.$disconnect());
