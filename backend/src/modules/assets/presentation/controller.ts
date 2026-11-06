import { Response } from 'express';
import { AuthRequest } from '../../../shared/auth';
import { diffChanges, recordActivitySafely } from '../../../shared/activity-log';
import { AssetService } from '../application/asset.service';

export class AssetController {
  constructor(private readonly service: AssetService) {}

  private id(req: AuthRequest) {
    return String(req.params.id);
  }

  list = async (_req: AuthRequest, res: Response) => res.json(await this.service.list());

  create = async (req: AuthRequest, res: Response) => {
    try {
      const asset = await this.service.create(req.body);
      await recordActivitySafely(req, { action: 'CREATE', entity: 'Asset', entityId: asset.id, metadata: { code: asset.code, name: asset.name } });
      res.status(201).json(asset);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ error: 'Kode aset sudah terdaftar.' });
        return;
      }
      throw error;
    }
  };

  createMany = async (req: AuthRequest, res: Response) => {
    try {
      const assets = await this.service.createMany(req.body);
      await recordActivitySafely(req, { action: 'CREATE', entity: 'Asset', metadata: { imported: assets.length } });
      res.status(201).json(assets);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ error: 'Import gagal karena ada kode aset yang sudah terdaftar.' });
        return;
      }
      throw error;
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const id = this.id(req);
      const before = await this.service.findById(id);
      const asset = await this.service.update(id, req.body);
      const changes = before ? diffChanges(before as Record<string, unknown>, asset as Record<string, unknown>, Object.keys(req.body)) : {};
      await recordActivitySafely(req, { action: 'UPDATE', entity: 'Asset', entityId: asset.id, metadata: { code: asset.code, changes } });
      res.json(asset);
    } catch {
      res.status(404).json({ error: 'Aset tidak ditemukan.' });
    }
  };

  delete = async (req: AuthRequest, res: Response) => {
    const id = this.id(req);
    const before = await this.service.findById(id);
    try {
      await this.service.delete(id);
      await recordActivitySafely(req, { action: 'DELETE', entity: 'Asset', entityId: id, metadata: before ? { code: before.code, name: before.name } : undefined });
      res.status(204).end();
    } catch {
      res.status(409).json({ error: 'Aset tidak dapat dihapus karena tidak ditemukan atau masih digunakan jadwal.' });
    }
  };
}
