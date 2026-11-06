import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from './database';

export async function recordActivity(
  req: Request & { userId?: string },
  data: { action: string; entity: string; entityId?: string; metadata?: Prisma.InputJsonValue },
) {
  return prisma.activityLog.create({
    data: {
      userId: req.userId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      metadata: data.metadata,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
    },
  });
}

type JsonValue = string | number | boolean | null;
const isoDate = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, 10) : value);
const normalize = (value: unknown): JsonValue => {
  const prepared = isoDate(value);
  if (prepared === null || prepared === undefined) return null;
  return typeof prepared === 'number' || typeof prepared === 'boolean' ? prepared : String(prepared);
};

/** Hitung perubahan field dari-ke untuk metadata audit; Date dibulatkan ke tanggal. */
export function diffChanges(before: Record<string, unknown>, after: Record<string, unknown>, fields: string[]): Record<string, { from: JsonValue; to: JsonValue }> {
  const changes: Record<string, { from: JsonValue; to: JsonValue }> = {};
  for (const field of fields) {
    const from = normalize(before[field]);
    const to = normalize(after[field]);
    if (String(from) !== String(to)) changes[field] = { from, to };
  }
  return changes;
}

export async function recordActivitySafely(  req: Request & { userId?: string },
  data: { action: string; entity: string; entityId?: string; metadata?: Prisma.InputJsonValue },
) {
  try {
    await recordActivity(req, data);
  } catch (error) {
    console.error('Failed to write activity log', { error, action: data.action, entity: data.entity, entityId: data.entityId });
  }
}
