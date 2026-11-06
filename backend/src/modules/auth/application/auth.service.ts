import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { UserRepository } from '../infrastructure/user.repository';

export class AuthService {
  constructor(private readonly users: UserRepository) {}

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
    return this.users.update(id, patch);
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
    return jwt.sign({}, process.env.JWT_SECRET!, { subject: userId, expiresIn: '8h' });
  }

  findPublicUser(userId: string) {
    return this.users.findPublicById(userId);
  }

  listUsers() {
    return this.users.findAllPublic();
  }
}
