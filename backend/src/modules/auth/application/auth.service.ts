import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { UserRepository } from '../infrastructure/user.repository';
import { RefreshTokenRepository } from '../infrastructure/refresh-token.repository';

// Durasi sesi bisa dioverride lewat backend/.env (ACCESS_TOKEN_MINUTES, REFRESH_TOKEN_DAYS).
export const ACCESS_TOKEN_MINUTES = Number(process.env.ACCESS_TOKEN_MINUTES) || 15;
export const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 7;

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async authenticate(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
    return { id: user.id, username: user.username, role: user.role };
  }

  async register(username: string, password: string, role = 'admin', email?: string) {
    const existing = await this.users.findByUsername(username);
    if (existing) return null;
    if (email) {
      const existingEmail = await this.users.findByEmail(email);
      if (existingEmail) return 'email_taken' as const;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.users.create(username, passwordHash, role, email);
    return { id: user.id, username: user.username, role: user.role };
  }

  async updateUser(id: string, data: { username?: string; password?: string; role?: string; email?: string }, requesterId: string) {
    const current = await this.users.findPublicById(id);
    if (!current) return 'not_found' as const;
    const patch: { username?: string; passwordHash?: string; role?: string; email?: string | null } = {};
    if (data.username !== undefined) {
      const existing = await this.users.findByUsername(data.username);
      if (existing && existing.id !== id) return 'username_taken' as const;
      patch.username = data.username;
    }
    if (data.email !== undefined) {
      if (!data.email) {
        patch.email = null;
      } else {
        const existingEmail = await this.users.findByEmail(data.email, id);
        if (existingEmail) return 'email_taken' as const;
        patch.email = data.email;
      }
    }
    if (data.role !== undefined && data.role !== current.role && id === requesterId) return 'own_role' as const;
    if (data.role !== undefined) patch.role = data.role;
    if (data.password) patch.passwordHash = await bcrypt.hash(data.password, 12);
    if (!Object.keys(patch).length) return current;
    const updated = await this.users.update(id, patch);
    // Reset kredensial harus mencabut semua sesi lama user ini (refresh token tidak boleh lolos dari reset).
    if (patch.passwordHash) await this.refreshTokens.revokeAllForUser(id);
    return updated;
  }

  async deleteUser(id: string, requesterId: string) {
    if (id === requesterId) return 'own_account' as const;
    if ((await this.users.countSchedules(id)) > 0) return 'has_schedules' as const;
    try {
      await this.users.remove(id);
      return 'deleted' as const;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') return 'has_schedules' as const;
        if (error.code === 'P2025') return 'not_found' as const;
      }
      throw error;
    }
  }

  createToken(userId: string) {
    return jwt.sign({}, process.env.JWT_SECRET!, { subject: userId, expiresIn: `${ACCESS_TOKEN_MINUTES}m` });
  }

  private hashToken(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async issueRefreshToken(userId: string) {
    const raw = crypto.randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    await this.refreshTokens.create(this.hashToken(raw), userId, expiresAt);
    return raw;
  }

  async rotateRefreshToken(raw: string) {
    const tokenHash = this.hashToken(raw);
    const record = await this.refreshTokens.findByHash(tokenHash);
    if (!record) return null;
    if (record.revokedAt) {
      // Token yang sudah dicabut dipakai lagi (reuse) → cabut semua sesi user ini.
      await this.refreshTokens.revokeAllForUser(record.userId);
      return null;
    }
    if (record.expiresAt.getTime() < Date.now() || !record.user) return null;
    // Klaim eksklusif: hanya satu request paralel yang berhasil mencabut (count 1).
    // Yang kalah berarti token ini baru saja dirotasi oleh pemegang lain — tolak.
    const claimed = await this.refreshTokens.revoke(tokenHash);
    if (claimed.count !== 1) return null;
    const token = await this.issueRefreshToken(record.userId);
    return { userId: record.userId, user: record.user, token };
  }

  async revokeRefreshToken(raw: string) {
    await this.refreshTokens.revoke(this.hashToken(raw));
  }

  findPublicUser(userId: string) {
    return this.users.findPublicById(userId);
  }

  listUsers() {
    return this.users.findAllPublic();
  }
}
