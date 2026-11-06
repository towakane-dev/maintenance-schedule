import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, requireAuth, requireRole } from './shared/auth';
import { prisma } from './shared/database';

const router = Router();
const asset = z.object({
  code: z.string().trim().min(1).max(35),
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  company: z.string().optional().default(''),
  area: z.string().optional().default(''),
  location: z.string().optional().default(''),
  brand: z.string().optional().default(''),
  model: z.string().optional().default(''),
  serial: z.string().optional().default(''),
  year: z.string().optional().default(''),
  owner: z.string().optional().default(''),
  condition: z.string().optional().default('Belum Dicek'),
  notes: z.string().optional().default(''),
});
const schedule = z.object({
  code: z.string().min(1),
  machine: z.string().min(1),
  area: z.string().min(1),
  activity: z.string().min(1),
  type: z.string().default('Preventive'),
  frequency: z.string().default('Insidental'),
  due: z.coerce.date(),
  pic: z.string().min(1),
  complete: z.boolean().default(false),
  finished: z.preprocess((value) => value || null, z.coerce.date().nullable().default(null)),
});
const payload = z.object({ assets: z.array(asset), schedules: z.array(schedule) });

router.use(requireAuth, requireRole(['superadmin']));
router.post('/', async (req: AuthRequest, res) => {
  const parsed = payload.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Payload sinkronisasi tidak valid.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of parsed.data.assets) {
      await tx.asset.upsert({
        where: { code: item.code.toUpperCase() },
        update: item,
        create: { ...item, code: item.code.toUpperCase() },
      });
    }

    for (const item of parsed.data.schedules) {
      const linkedAsset = await tx.asset.findUnique({ where: { code: item.code.toUpperCase() } });
      if (!linkedAsset) continue;
      const existing = await tx.schedule.findFirst({
        where: { assetId: linkedAsset.id, activity: item.activity, due: item.due },
      });
      const data = {
        code: linkedAsset.code,
        machine: linkedAsset.name,
        area: linkedAsset.category,
        activity: item.activity,
        type: item.type,
        frequency: item.frequency,
        due: item.due,
        pic: item.pic,
        complete: item.complete,
        finished: item.finished,
        assetId: linkedAsset.id,
      };
      if (existing) await tx.schedule.update({ where: { id: existing.id }, data });
      else await tx.schedule.create({ data: { ...data, createdById: req.userId! } });
    }
  });

  res.status(204).end();
});

export { router as syncRouter };
