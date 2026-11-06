import { prisma } from '../../shared/database';
import { mailerReady, sendMail } from '../../shared/mailer';
import type { Schedule } from '@prisma/client';

function jakartaDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function groupByReminder(schedules: Schedule[], today: string) {
  const overdue: Schedule[] = [];
  const h1: Schedule[] = [];
  const h3: Schedule[] = [];
  for (const schedule of schedules) {
    const days = Math.round((new Date(`${jakartaDate(schedule.due)}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
    if (days < 0) overdue.push(schedule);
    else if (days === 1) h1.push(schedule);
    else if (days === 3) h3.push(schedule);
  }
  const byDue = (a: Schedule, b: Schedule) => a.due.getTime() - b.due.getTime();
  return { overdue: overdue.sort(byDue), h1: h1.sort(byDue), h3: h3.sort(byDue) };
}

function renderSection(title: string, color: string, items: Schedule[]) {
  if (!items.length) return '';
  const rows = items.map((item) => `<tr><td style="padding:7px 10px;border-bottom:1px solid #eceef0;font-weight:650">${escapeHtml(item.code)}</td><td style="padding:7px 10px;border-bottom:1px solid #eceef0">${escapeHtml(item.machine)}</td><td style="padding:7px 10px;border-bottom:1px solid #eceef0">${escapeHtml(item.activity)}</td><td style="padding:7px 10px;border-bottom:1px solid #eceef0">${escapeHtml(jakartaDate(item.due))}</td><td style="padding:7px 10px;border-bottom:1px solid #eceef0">${escapeHtml(item.pic)}</td></tr>`).join('');
  return `<h3 style="margin:18px 0 8px;color:${color};font-size:14px">${title} (${items.length})</h3><table style="border-collapse:collapse;width:100%;font-size:12px;color:#2b2d31"><thead><tr><th align="left" style="padding:7px 10px;background:#f5f6f7">Kode</th><th align="left" style="padding:7px 10px;background:#f5f6f7">Aset</th><th align="left" style="padding:7px 10px;background:#f5f6f7">Aktivitas</th><th align="left" style="padding:7px 10px;background:#f5f6f7">Due</th><th align="left" style="padding:7px 10px;background:#f5f6f7">PIC</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export async function sendDailyDigest() {
  const today = jakartaDate(new Date());
  const already = await prisma.activityLog.findFirst({ where: { action: 'EMAIL_DIGEST', entityId: today } });
  if (already) return false;
  const schedules = await prisma.schedule.findMany({ where: { complete: false } });
  const { overdue, h1, h3 } = groupByReminder(schedules, today);
  const total = overdue.length + h1.length + h3.length;
  if (!total) return false;
  const users = await prisma.user.findMany({ where: { email: { not: null } } });
  let sent = 0;
  for (const user of users) {
    if (!user.email) continue;
    const html = `<div style="font-family:Arial,sans-serif;max-width:640px"><h2 style="margin:0 0 4px;color:#202126">Reminder Maintenance HRGA</h2><p style="margin:0 0 10px;color:#71757d;font-size:12px">Ringkasan jadwal per ${today} — total ${total} jadwal perlu perhatian.</p>${renderSection('🔴 Overdue', '#c81e27', overdue)}${renderSection('🟠 H-1 (Besok)', '#b17d12', h1)}${renderSection('🟡 H-3', '#926200', h3)}<p style="margin:20px 0 0;color:#9699a0;font-size:11px">Email otomatis dari HRGA System — Karya Bahana Berlian. Mohon tidak membalas.</p></div>`;
    if (await sendMail(user.email, `Reminder Maintenance HRGA — ${total} jadwal perlu perhatian (${today})`, html)) sent += 1;
  }
  await prisma.activityLog.create({ data: { action: 'EMAIL_DIGEST', entity: 'Notification', entityId: today, metadata: { total, recipients: users.length, sent } } });
  console.log(`[mail:digest] ${today}: ${total} jadwal → ${sent} email terkirim`);
  return true;
}

export function scheduleDailyDigest() {
  if (!mailerReady) {
    console.log('[mail:digest] SMTP belum dikonfigurasi — email reminder harian nonaktif. Isi SMTP_* di .env untuk mengaktifkan.');
    return;
  }
  setInterval(() => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const hour = Number(values.hour);
    if (hour === 7) void sendDailyDigest();
  }, 10 * 60 * 1000);
}
