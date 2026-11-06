import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const jsonHandler = (message: string) => (_req: unknown, res: { status: (code: number) => { json: (body: object) => void } }) => {
  res.status(429).json({ error: message });
};

/** Limiter global untuk semua endpoint /api. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: jsonHandler('Terlalu banyak permintaan. Coba lagi nanti.'),
});

/** Limiter ketat untuk login; hanya menghitung percobaan yang gagal,
 * dikunci per kombinasi IP + username agar satu akun salah password
 * tidak mengunci pengguna lain di jaringan kantor yang sama. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const body = req.body as { username?: unknown };
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip ?? '')}-${username}`;
  },
  handler: jsonHandler('Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit.'),
});
