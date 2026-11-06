import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../../shared/auth';
import { AssetService } from '../application/asset.service';
import { AssetRepository } from '../infrastructure/asset.repository';
import { AssetController } from './controller';

const router = Router();
const assetInput = z.object({
  code: z.string().trim().min(1).max(35),
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  company: z.string().trim().max(90).default(''),
  area: z.string().trim().max(90).default(''),
  location: z.string().trim().max(120).default(''),
  brand: z.string().trim().max(90).default(''),
  model: z.string().trim().max(90).default(''),
  serial: z.string().trim().max(90).default(''),
  year: z.string().trim().max(4).default(''),
  owner: z.string().trim().max(90).default(''),
  condition: z.string().trim().max(40).default('Belum Dicek'),
  notes: z.string().trim().max(500).default(''),
});
const assetImport = z.array(assetInput).min(1).max(500);
const controller = new AssetController(new AssetService(new AssetRepository()));

router.use(requireAuth);
router.get('/', controller.list);
router.post('/', (req, res, next) => {
  const parsed = assetInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Data aset tidak lengkap atau tidak valid.' });
  req.body = parsed.data;
  return controller.create(req, res).catch(next);
});
router.post('/import', (req, res, next) => {
  const parsed = assetImport.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'File CSV kosong atau format kolom tidak sesuai.' });
  req.body = parsed.data;
  return controller.createMany(req, res).catch(next);
});
router.put('/:id', (req, res, next) => {
  const parsed = assetInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Data aset tidak valid.' });
  req.body = parsed.data;
  return controller.update(req, res).catch(next);
});
router.delete('/:id', controller.delete);

export { router as assetsRouter };
