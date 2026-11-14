import { prisma } from '../../../shared/database';

export class RefreshTokenRepository {
  create(tokenHash: string, userId: string, expiresAt: Date) {
    return prisma.refreshToken.create({ data: { tokenHash, userId, expiresAt } });
  }

  findByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, username: true, role: true } } } });
  }

  revoke(tokenHash: string) {
    return prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  deleteExpired() {
    return prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
