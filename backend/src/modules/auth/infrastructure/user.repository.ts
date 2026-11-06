import { prisma } from '../../../shared/database';

export class UserRepository {
  findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  }

  findPublicById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, username: true, email: true, role: true } });
  }

  findAllPublic() {
    return prisma.user.findMany({ select: { id: true, username: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  }

  create(username: string, passwordHash: string, role = 'admin', email?: string | null) {
    return prisma.user.create({ data: { username, passwordHash, role, email: email || null }, select: { id: true, username: true, role: true } });
  }

  findByEmail(email: string, excludeId?: string) {
    return prisma.user.findFirst({ where: { email, ...(excludeId ? { id: { not: excludeId } } : {}) } });
  }

  update(id: string, data: { username?: string; passwordHash?: string; role?: string; email?: string | null }) {
    return prisma.user.update({ where: { id }, data, select: { id: true, username: true, email: true, role: true } });
  }

  remove(id: string) {
    return prisma.user.delete({ where: { id }, select: { id: true } });
  }

  countSchedules(id: string) {
    return prisma.schedule.count({ where: { createdById: id } });
  }

  upsert(username: string, passwordHash: string) {
    return prisma.user.upsert({
      where: { username },
      update: { passwordHash, role: 'superadmin' },
      create: { username, passwordHash, role: 'superadmin' },
    });
  }
}
