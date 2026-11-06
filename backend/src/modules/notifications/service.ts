import { prisma } from '../../shared/database';
import { publishNotification } from './stream';

function localDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function checkNotifications() {
  const today = localDate(new Date());
  const schedules = await prisma.schedule.findMany({ where: { complete: false }, include: { createdBy: { select: { id: true } } } });
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const schedule of schedules) {
    const due = localDate(schedule.due);
    const todayTime = new Date(`${today}T12:00:00`).getTime();
    const dueTime = new Date(`${due}T12:00:00`).getTime();
    const days = Math.round((dueTime - todayTime) / 86400000);
    const type = days === 3 ? 'DUE_3' : days === 1 ? 'DUE_1' : days < 0 ? 'OVERDUE' : null;
    if (!type) continue;
    const title = type === 'OVERDUE' ? 'Maintenance overdue' : `Maintenance H-${days}`;
    const message = `${schedule.code} — ${schedule.activity} (${due})`;
    for (const user of users) {
      const notification = await prisma.notification.createMany({ data: [{ userId: user.id, scheduleId: schedule.id, type, title, message }] , skipDuplicates: true });
      if (notification.count) {
        const created = await prisma.notification.findFirst({ where: { userId: user.id, scheduleId: schedule.id, type }, include: { schedule: { select: { code: true, machine: true, activity: true, due: true } } } });
        if (created) publishNotification(user.id, created);
      }
    }
  }
}
