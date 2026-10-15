import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { config } from '../lib/config.js';
import { prisma } from '../lib/prisma.js';

export type AuthUser = { id: string; email: string; name: string; role: Role };
declare global {
  namespace Express { interface Request { authUser?: AuthUser } }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.jirani_session;
  if (!token) { res.status(401).json({ error: 'Please sign in to continue.' }); return; }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    if (typeof payload.sub !== 'string') throw new Error('Invalid token');
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, email: true, role: true } });
    if (!user) { res.status(401).json({ error: 'Session expired. Please sign in.' }); return; }
    req.authUser = user;
    next();
  } catch { res.status(401).json({ error: 'Session expired. Please sign in.' }); }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.authUser?.role !== 'ADMIN') { res.status(403).json({ error: 'Admin access required.' }); return; }
  next();
}

export function setSession(res: Response, userId: string) {
  const token = jwt.sign({}, config.jwtSecret, { subject: userId, expiresIn: '7d', algorithm: 'HS256' });
  res.cookie('jirani_session', token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 7 * 24 * 3600 * 1000,
  });
}
export function clearSession(res: Response) {
  res.clearCookie('jirani_session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
}
