import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { setSession, clearSession, requireAuth } from '../middleware/auth.js';

export const authRouter = Router();
const schema = z.object({
  name: z.string().trim().min(2).max(90),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10).max(128),
});
authRouter.post('/register', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Enter a valid name, email and password (10+ characters).' }); return; }
  const { name, email, password } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } })) { res.status(409).json({ error: 'This email is already registered.' }); return; }
  const passwordHash = await bcrypt.hash(password, 12);
  // Role is not user-selectable. Admins are provisioned separately via the seed script.
  const user = await prisma.user.create({ data: { name, email, passwordHash, role: 'CUSTOMER' }, select: { id: true, name: true, email: true, role: true } });
  setSession(res, user.id); res.status(201).json({ user });
});
authRouter.post('/login', rateLimit({ windowMs: 15 * 60_000, limit: 12 }), async (req, res) => {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Enter your email and password.' }); return; }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) { res.status(401).json({ error: 'Incorrect email or password.' }); return; }
  setSession(res, user.id);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
authRouter.post('/logout', (_req, res) => { clearSession(res); res.json({ ok: true }); });
authRouter.get('/me', requireAuth, (req, res) => res.json({ user: req.authUser }));
