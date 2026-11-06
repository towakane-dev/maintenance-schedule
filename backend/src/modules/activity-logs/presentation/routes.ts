import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { requireAuth, requireRole } from '../../../shared/auth';
import { prisma } from '../../../shared/database';

const router = Router();

router.use(requireAuth, requireRole(['superadmin']));
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const { user, action, entity, from, to } = req.query as Record<string, string | undefined>;
    const where: Prisma.ActivityLogWhereInput = {};
    if (user) where.user = { username: { contains: user, mode: 'insensitive' } };
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(`${from}T00:00:00`);
      if (to) where.createdAt.lte = new Date(`${to}T23:59:59`);
    }
    const [total, items] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { username: true } } },
      }),
    ]);
    res.json({ items, total });
  } catch (error) {
    next(error);
  }
});

export { router as activityLogsRouter };
