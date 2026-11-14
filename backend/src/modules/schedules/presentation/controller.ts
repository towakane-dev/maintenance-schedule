import { Request, Response } from 'express';
import { AuthRequest } from '../../../shared/auth';
import { diffChanges, recordActivitySafely } from '../../../shared/activity-log';
import { sendScheduleEmailToPic } from '../../notifications/service';
import { ScheduleService } from '../application/schedule.service';

export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  private id(req: Request) {
    return String(req.params.id);
  }

  /** Kirim manual email reminder ke PIC jadwal (tombol di Reminder Center). */
  emailPic = async (req: AuthRequest, res: Response) => {
    const schedule = await this.service.findById(this.id(req));
    if (!schedule) {
      res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
      return;
    }
    if (!schedule.picEmail) {
      res.status(400).json({ error: 'Jadwal ini belum memiliki email PIC — isi dulu lewat Edit Jadwal.' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const due = schedule.due.toISOString().slice(0, 10);
    const days = Math.round((new Date(`${due}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
    const label = days < 0 ? 'Overdue' : days === 0 ? 'Hari H' : `H-${days}`;
    const sent = await sendScheduleEmailToPic(schedule as { code: string; machine: string; activity: string; due: Date; pic: string; picEmail: string | null }, label);
    await recordActivitySafely(req, { action: 'PIC_EMAIL_MANUAL', entity: 'Schedule', entityId: schedule.id, metadata: { code: schedule.code, to: schedule.picEmail, sent } });
    res.json({ sent, to: schedule.picEmail });
  };

  list = async (_req: AuthRequest, res: Response) => res.json(await this.service.list());

  create = async (req: AuthRequest, res: Response) => {
    const schedule = await this.service.create({ ...req.body, createdById: req.userId! });
    if (schedule === 'duplicate') {
      res.status(409).json({ error: 'Aset ini masih memiliki 1 jadwal maintenance aktif. Selesaikan jadwal sebelumnya dulu sebelum menambah jadwal baru.' });
      return;
    }
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
      if (before && (req.body.assetId || req.body.activity)) {
        const mergedAsset = String(req.body.assetId ?? before.assetId);
        const mergedActivity = String(req.body.activity ?? before.activity);
        if (await this.service.hasActiveSchedule(mergedAsset, id)) {
          res.status(409).json({ error: 'Aset ini masih memiliki 1 jadwal maintenance aktif. Selesaikan jadwal sebelumnya dulu sebelum menambah jadwal baru.' });
          return;
        }
      }
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
