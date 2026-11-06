import { Request, Response } from 'express';
import { AuthRequest } from '../../../shared/auth';
import { diffChanges, recordActivitySafely } from '../../../shared/activity-log';
import { AuthService } from '../application/auth.service';

const sessionCookie = (res: Response, token: string) => res.cookie('hrga_session', token, {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000,
});

export class AuthController {
  constructor(private readonly service: AuthService) {}

  me = async (req: AuthRequest, res: Response) => {
    const user = await this.service.findPublicUser(req.userId!);
    if (!user) {
      res.clearCookie('hrga_session');
      res.status(401).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }
    res.json({ user });
  };

  listUsers = async (_req: AuthRequest, res: Response) => {
    res.json(await this.service.listUsers());
  };

  login = async (req: AuthRequest, res: Response) => {
    const user = await this.service.authenticate(req.body.username, req.body.password);
    if (!user) {
      await recordActivitySafely(req, { action: 'LOGIN_FAILED', entity: 'Auth', metadata: { username: req.body.username } });
      res.status(401).json({ error: 'Username atau password salah.' });
      return;
    }
    req.userId = user.id;
    await recordActivitySafely(req, { action: 'LOGIN_SUCCESS', entity: 'Auth', entityId: user.id, metadata: { username: user.username } });
    sessionCookie(res, this.service.createToken(user.id));
    res.json({ user });
  };

  createUser = async (req: AuthRequest, res: Response) => {
    const user = await this.service.register(req.body.username, req.body.password, req.body.role, req.body.email);
    if (user === 'email_taken') {
      res.status(409).json({ error: 'Email sudah digunakan user lain.' });
      return;
    }
    if (!user) {
      res.status(409).json({ error: 'Username sudah digunakan.' });
      return;
    }
    await recordActivitySafely(req, { action: 'CREATE', entity: 'User', entityId: user.id, metadata: { username: user.username } });
    res.status(201).json({ user });
  };

  updateUser = async (req: AuthRequest, res: Response) => {
    const result = await this.service.updateUser(String(req.params.id), req.body, req.userId!);
    if (result === 'username_taken') {
      res.status(409).json({ error: 'Username sudah digunakan.' });
      return;
    }
    if (result === 'email_taken') {
      res.status(409).json({ error: 'Email sudah digunakan user lain.' });
      return;
    }
    if (result === 'not_found') {
      res.status(404).json({ error: 'User tidak ditemukan.' });
      return;
    }
    if (result === 'own_role') {
      res.status(400).json({ error: 'Tidak dapat mengubah role akun sendiri.' });
      return;
    }
    const before = await this.service.findPublicUser(String(req.params.id));
    const changes = before ? diffChanges({ username: before.username, email: before.email, role: before.role }, { username: result.username, email: result.email ?? null, role: result.role }, ['username', 'email', 'role']) : {};
    await recordActivitySafely(req, { action: 'UPDATE', entity: 'User', entityId: result.id, metadata: { username: result.username, changes } });
    res.json({ user: result });
  };

  deleteUser = async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const before = await this.service.findPublicUser(id);
    const result = await this.service.deleteUser(id, req.userId!);
    if (result === 'own_account') {
      res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri.' });
      return;
    }
    if (result === 'has_schedules') {
      res.status(409).json({ error: 'User tidak dapat dihapus karena masih ada jadwal yang dibuat olehnya.' });
      return;
    }
    if (result === 'not_found') {
      res.status(404).json({ error: 'User tidak ditemukan.' });
      return;
    }
    await recordActivitySafely(req, { action: 'DELETE', entity: 'User', entityId: id, metadata: before ? { username: before.username, role: before.role } : undefined });
    res.status(204).end();
  };

  logout = async (req: AuthRequest, res: Response) => {
    await recordActivitySafely(req, { action: 'LOGOUT', entity: 'Auth', entityId: req.userId });
    res.clearCookie('hrga_session');
    res.status(204).end();
  };
}
