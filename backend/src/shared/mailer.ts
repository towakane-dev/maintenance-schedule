import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const mailFrom = process.env.MAIL_FROM || 'HRGA System <no-reply@localhost>';

export const mailerReady = Boolean(smtpHost && smtpUser && smtpPass);

const transporter = mailerReady
  ? nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser!, pass: smtpPass! } })
  : null;

export async function sendMail(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[mail:dry-run] to=${to} | subject="${subject}" | body=${html.length} chars (SMTP belum dikonfigurasi di .env)`);
    return false;
  }
  await transporter.sendMail({ from: mailFrom, to, subject, html });
  return true;
}
