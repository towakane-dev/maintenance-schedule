import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, requireAuth } from '../../../shared/auth';
import { AssetRepository } from '../../assets/infrastructure/asset.repository';
import { ScheduleService } from '../application/schedule.service';
import { ScheduleRepository } from '../infrastructure/schedule.repository';
import { ScheduleController } from './controller';

const router = Router();
const scheduleInput = z.object({
  assetId: z.string().min(1),
  activity: z.string().trim().min(1).max(90),
  type: z.string().trim().max(30).default('Preventive'),
  frequency: z.string().trim().max(30).default('Insidental'),
  due: z.coerce.date(),
  pic: z.string().trim().min(1).max(50),
  complete: z.boolean().default(false),
  finished: z.preprocess((value) => value || null, z.coerce.date().nullable().default(null)),
});
const controller = new ScheduleController(new ScheduleService(new ScheduleRepository(), new AssetRepository()));

router.use(requireAuth);
router.get('/', controller.list);
router.post('/', (req: AuthRequest, res, next) => {
  const parsed = scheduleInput.safeParse(req.body);
  if (!parsed.success || !req.userId) return res.status(400).json({ error: 'Data jadwal tidak lengkap atau tidak valid.' });
  req.body = parsed.data;
  return controller.create(req, res).catch(next);
});
router.put('/:id', (req, res, next) => {
  const parsed = scheduleInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Data jadwal tidak valid.' });
  req.body = parsed.data;
  return controller.update(req, res).catch(next);
});
router.delete('/:id', controller.delete);

export { router as schedulesRouter };
