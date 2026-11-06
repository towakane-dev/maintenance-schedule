import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './database';

export type AuthRequest = Request & { userId?: string };

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies.hrga_session;
  if (!token) {
    res.status(401).json({ error: 'Login diperlukan.' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.clearCookie('hrga_session');
    res.status(401).json({ error: 'Sesi login tidak valid atau sudah kedaluwarsa.' });
  }
}

export function requireRole(roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Login diperlukan.' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Anda tidak memiliki akses untuk tindakan ini.' });
      return;
    }
    next();
  };
}
