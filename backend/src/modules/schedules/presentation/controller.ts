import { Request, Response } from 'express';
import { AuthRequest } from '../../../shared/auth';
import { diffChanges, recordActivitySafely } from '../../../shared/activity-log';
import { ScheduleService } from '../application/schedule.service';

export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  private id(req: Request) {
    return String(req.params.id);
  }

  list = async (_req: AuthRequest, res: Response) => res.json(await this.service.list());

  create = async (req: AuthRequest, res: Response) => {
    const schedule = await this.service.create({ ...req.body, createdById: req.userId! });
    if (!schedule) {
      res.status(404).json({ error: 'Aset tidak ditemukan.' });
      return;
    }
    await recordActivitySafely(req, { action: 'CREATE', entity: 'Schedule', entityId: schedule.id, metadata: { code: schedule.code, activity: schedule.activity } });
    res.status(201).json(schedule);
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const id = this.id(req);
      const before = await this.service.findById(id);
      const schedule = await this.service.update(id, req.body);
      const changes = before ? diffChanges(before as Record<string, unknown>, schedule as Record<string, unknown>, Object.keys(req.body)) : {};
      await recordActivitySafely(req, { action: schedule.complete ? 'COMPLETE' : 'UPDATE', entity: 'Schedule', entityId: schedule.id, metadata: { code: schedule.code, changes } });
      res.json(schedule);
    } catch {
      res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    }
  };

  delete = async (req: AuthRequest, res: Response) => {
    const id = this.id(req);
    const before = await this.service.findById(id);
    try {
      await this.service.delete(id);
      await recordActivitySafely(req, { action: 'DELETE', entity: 'Schedule', entityId: id, metadata: before ? { code: before.code, activity: before.activity, machine: before.machine } : undefined });
      res.status(204).end();
    } catch {
      res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    }
  };
}
