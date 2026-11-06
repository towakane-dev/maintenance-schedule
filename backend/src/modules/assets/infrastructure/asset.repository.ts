import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database';

export class AssetRepository {
  findAll() {
    return prisma.asset.findMany({ orderBy: { code: 'asc' } });
  }

  findById(id: string) {
    return prisma.asset.findUnique({ where: { id } });
  }

  create(data: Prisma.AssetCreateInput) {
    return prisma.asset.create({ data: { ...data, code: data.code.toUpperCase() } });
  }

  update(id: string, data: Prisma.AssetUpdateInput) {
    return prisma.asset.update({ where: { id }, data });
  }

  delete(id: string) {
    return prisma.asset.delete({ where: { id } });
  }
}
