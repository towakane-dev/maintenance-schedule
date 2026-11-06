import { AssetRepository } from '../../assets/infrastructure/asset.repository';
import { ScheduleRepository } from '../infrastructure/schedule.repository';

export class ScheduleService {
  constructor(
    private readonly schedules: ScheduleRepository,
    private readonly assets: AssetRepository,
  ) {}

  list() {
    return this.schedules.findAll();
  }

  async create(data: {
    assetId: string;
    activity: string;
    type: string;
    frequency: string;
    due: Date;
    pic: string;
    complete: boolean;
    finished: Date | null;
    createdById: string;
  }) {
    const asset = await this.assets.findById(data.assetId);
    if (!asset) return null;
    return this.schedules.create({
      ...data,
      code: asset.code,
      machine: asset.name,
      area: asset.category,
    });
  }

  findById(id: string) {
    return this.schedules.findById(id);
  }

  update(id: string, data: Record<string, unknown>) {
    return this.schedules.update(id, data);
  }

  delete(id: string) {
    return this.schedules.delete(id);
  }
}
