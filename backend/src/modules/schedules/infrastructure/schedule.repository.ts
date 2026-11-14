import { prisma } from '../../../shared/database';

export class ScheduleRepository {
  findAll() {
    return prisma.schedule.findMany({ include: { asset: true }, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return prisma.schedule.findUnique({ where: { id } });
  }

  findActiveByAsset(assetId: string, excludeId?: string) {
    return prisma.schedule.findFirst({
      where: { assetId, complete: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true, code: true, activity: true },
    });
  }

  create(data: {
    assetId: string;
    activity: string;
    type: string;
    frequency: string;
    due: Date;
    pic: string;
    picEmail?: string | null;
    completionNote?: string | null;
    complete: boolean;
    finished: Date | null;
    code: string;
    machine: string;
    area: string;
    createdById: string;
  }) {
    return prisma.schedule.create({ data, include: { asset: true } });
  }

  update(id: string, data: Record<string, unknown>) {
    return prisma.schedule.update({ where: { id }, data, include: { asset: true } });
  }

  delete(id: string) {
    return prisma.schedule.delete({ where: { id } });
  }
}
