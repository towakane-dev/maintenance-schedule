import { prisma } from '../../shared/database';
import { publishNotification } from './stream';
import { sendMail } from '../../shared/mailer';
import { escapeHtml } from './email-digest';

function localDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const reminderLabel: Record<string, string> = { DUE_3: 'Reminder H-3', DUE_1: 'Reminder H-1', OVERDUE: 'Overdue' };

type PicEmailSchedule = {
  code: string; machine: string; activity: string; type?: string; frequency?: string;
  due: Date; pic: string; picEmail: string | null;
};

function emailTheme(label: string) {
  const text = label.toLowerCase();
  if (text.includes('overdue')) return { accent: '#d71920', badge: 'OVERDUE' };
  return { accent: '#b17d12', badge: label.toUpperCase() };
}

function renderPicReminderEmail(schedule: PicEmailSchedule, label: string, today: string): string {
  const theme = emailTheme(label);
  const isOverdue = theme.badge === 'OVERDUE';
  const hairline = 'border-bottom:1px solid #eceef0;';
  const row = (key: string, value: string, accent = false, last = false) =>
    `<tr><td style="padding:9px 16px;${last ? '' : hairline}font-size:10px;font-weight:700;color:#9699a0;width:132px;text-transform:uppercase;letter-spacing:0.6px">${key}</td><td style="padding:9px 16px;${last ? '' : hairline}font-size:12px;color:#202126;text-align:right;${accent ? `color:${theme.accent};font-weight:700;` : ''}">${value}</td></tr>`;
  return `<div style="margin:0;padding:0;background:#f2f3f5"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3f5;padding:28px 0"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e9eaed;border-radius:6px;font-family:Arial,Helvetica,sans-serif"><tr><td style="padding:22px 28px 0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#202126;border-radius:6px;width:34px;height:34px;text-align:center;vertical-align:middle;font-weight:bold;color:#ffffff;font-size:12px">KBB</td><td style="padding-left:10px"><strong style="font-size:13px;color:#202126">HRGA SYSTEM</strong><br><span style="font-size:11px;color:#9699a0">Maintenance Management</span></td></tr></table></td><td align="right"><span style="display:inline-block;padding:5px 12px;border:1px solid ${theme.accent};border-radius:999px;color:${theme.accent};font-weight:bold;font-size:10px;letter-spacing:1px">${escapeHtml(theme.badge)}</span></td></tr></table><div style="margin:24px 0 0;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#9699a0;text-transform:uppercase">Reminder / Maintenance</div><h1 style="margin:8px 0 4px;font-size:19px;color:#202126">Reminder Maintenance</h1><p style="margin:0;font-size:12px;color:#71757d">Anda tercatat sebagai PIC jadwal berikut.</p></td></tr><tr><td style="padding:16px 28px 0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e9eaed;border-radius:6px;background:#ffffff">${row('Kode Jadwal', `<strong>${escapeHtml(schedule.code)}</strong>`)}${row('Aset', escapeHtml(schedule.machine))}${row('Aktivitas', escapeHtml(schedule.activity))}${row('Jenis', escapeHtml(schedule.type || '-'))}${row('Frekuensi', escapeHtml(schedule.frequency || '-'))}${row('Jatuh Tempo', escapeHtml(localDate(schedule.due)), isOverdue)}${row('PIC', escapeHtml(schedule.pic), false, true)}</table><p style="margin:16px 0 0;font-size:11px;color:#71757d;line-height:1.6">Tandai jadwal sebagai selesai di HRGA System setelah pekerjaan dikerjakan.</p></td></tr><tr><td style="padding:24px 28px 26px 28px"><p style="margin:0;font-size:10px;color:#9699a0;line-height:1.6">Email otomatis dari HRGA System — PT Karya Bahana Berlian · Mohon tidak dibalas · Dikirim ${escapeHtml(today)}</p></td></tr></table></td></tr></table></div>`;
}

/** Susun + kirim email reminder satu jadwal ke PIC-nya. Return true bila benar-benar terkirim
 * (SMTP terisi); false berarti dry-run atau gagal — dipanggil oleh loop otomatis & tombol manual. */
export async function sendScheduleEmailToPic(schedule: PicEmailSchedule, label: string): Promise<boolean> {
  if (!schedule.picEmail) return false;
  const subject = `${label}: ${schedule.code} — ${schedule.activity}`;
  try {
    return await sendMail(schedule.picEmail, subject, renderPicReminderEmail(schedule, label, localDate(new Date())));
  } catch (reason) {
    console.error(`[mail:pic] gagal kirim ke ${schedule.picEmail}`, reason);
    return false;
  }
}

/** Email ke PIC jadwal: H-3/H-1 terkirim sekali di hariannya, Overdue di-nagging 1x per hari
 * sampai jadwal ditandai selesai. Dedupe via marker ActivityLog per (jadwal, jenis, hari). */
async function emailPic(schedule: {
  id: string; code: string; machine: string; activity: string; due: Date; pic: string; picEmail: string | null;
}, type: string, days: number, today: string) {
  if (!schedule.picEmail) return;
  const marker = `${schedule.id}:${type}:${today}`;
  const already = await prisma.activityLog.findFirst({ where: { action: 'PIC_REMINDER_EMAIL', entityId: marker } });
  if (already) return;
  await sendScheduleEmailToPic(schedule, reminderLabel[type] ?? type);
  // Marker tetap ditulis walau dry-run/gagal agar loop 60 detik tidak mengulang.
  await prisma.activityLog.create({ data: { action: 'PIC_REMINDER_EMAIL', entity: 'Schedule', entityId: marker, metadata: { scheduleId: schedule.id, type, to: schedule.picEmail, days } } });
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
    await emailPic(schedule, type, days, today);
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
