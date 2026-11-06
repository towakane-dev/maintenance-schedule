import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../../../shared/auth';
import { prisma } from '../../../shared/database';
import { notificationClients } from '../stream';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { schedule: { select: { code: true, machine: true, activity: true, due: true } } },
  });
  res.json(notifications);
});

router.patch('/:id/read', async (req: AuthRequest, res) => {
  const notification = await prisma.notification.updateMany({ where: { id: String(req.params.id), userId: req.userId! }, data: { isRead: true } });
  if (!notification.count) { res.status(404).json({ error: 'Notifikasi tidak ditemukan.' }); return; }
  res.status(204).end();
});

router.patch('/read-all', async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({ where: { userId: req.userId!, isRead: false }, data: { isRead: true } });
  res.status(204).end();
});

router.get('/stream', (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const clients = notificationClients.get(req.userId!);
  clients?.add(res);
  if (!clients) notificationClients.set(req.userId!, new Set([res]));
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);
  req.on('close', () => { clearInterval(heartbeat); notificationClients.get(req.userId!)?.delete(res); });
});

export { router as notificationsRouter };
