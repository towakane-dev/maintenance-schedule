import { Prisma } from '@prisma/client';
import { AssetRepository } from '../infrastructure/asset.repository';

export class AssetService {
  constructor(private readonly assets: AssetRepository) {}

  list() {
    return this.assets.findAll();
  }

  create(data: Prisma.AssetCreateInput) {
    return this.assets.create(data);
  }

  async createMany(data: Prisma.AssetCreateInput[]) {
    const created = [];
    for (const item of data) created.push(await this.assets.create(item));
    return created;
  }

  findById(id: string) {
    return this.assets.findById(id);
  }

  update(id: string, data: Prisma.AssetUpdateInput) {
    return this.assets.update(id, data);
  }

  delete(id: string) {
    return this.assets.delete(id);
  }
}
