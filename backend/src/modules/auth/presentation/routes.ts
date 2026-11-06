import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../../shared/auth';
import { loginLimiter } from '../../../shared/rate-limit';
import { AuthService } from '../application/auth.service';
import { UserRepository } from '../infrastructure/user.repository';
import { AuthController } from './controller';

const router = Router();
const credentials = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(8).max(100),
});
const userCredentials = credentials.extend({
  role: z.enum(['admin', 'superadmin']),
  email: z.union([z.literal(''), z.string().trim().email().max(120)]).optional(),
});
const userUpdate = userCredentials.partial();
const controller = new AuthController(new AuthService(new UserRepository()));

router.get('/me', requireAuth, controller.me);
router.get('/users', requireAuth, requireRole(['superadmin']), controller.listUsers);
router.post('/login', loginLimiter, (req, res, next) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Username atau password tidak valid.' });
  req.body = parsed.data;
  return controller.login(req, res).catch(next);
});
router.post('/users', requireAuth, requireRole(['superadmin']), (req, res, next) => {
  const parsed = userCredentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Username minimal 3 karakter dan password minimal 8 karakter.' });
  req.body = parsed.data;
  return controller.createUser(req, res).catch(next);
});
router.put('/users/:id', requireAuth, requireRole(['superadmin']), (req, res, next) => {
  const parsed = userUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Data user tidak valid. Username minimal 3 karakter dan password minimal 8 karakter.' });
  req.body = parsed.data;
  return controller.updateUser(req, res).catch(next);
});
router.delete('/users/:id', requireAuth, requireRole(['superadmin']), (req, res, next) => {
  return controller.deleteUser(req, res).catch(next);
});
router.post('/logout', requireAuth, controller.logout);

export { router as authRouter };
