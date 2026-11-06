# Karya Bahana Berlian HRGA

## Asset & Maintenance System

Aplikasi internal HRGA untuk mengelola master aset, jadwal maintenance, reminder, histori pekerjaan, notifikasi realtime, audit log, dan laporan.

## Struktur Proyek

```text
KBB_HRGA_SourceCode_V4_DOWNLOAD_ULANG/
├── frontend/              # Frontend React 19 + Vite + TypeScript
│   ├── public/assets/     # Logo dan template import
│   ├── src/
│   │   ├── features/      # Komponen per halaman (auth, assets, schedules, dashboard)
│   │   ├── shared/        # API client, util, komponen bersama
│   │   └── styles.css     # Design system (satu sumber gaya)
│   └── vite.config.ts
├── backend/               # API Express 5 + TypeScript + Prisma
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts
│   │   ├── shared/        # Database, auth, rate-limit, mailer, activity log
│   │   └── modules/
│   │       ├── auth/              # Login, sesi, manajemen user & role
│   │       ├── assets/            # Master aset + import CSV
│   │       ├── schedules/         # Jadwal maintenance
│   │       ├── notifications/     # Notifikasi realtime (SSE) + digest email
│   │       └── activity-logs/     # Audit trail
│   ├── package.json
│   └── .env.example
└── docker-compose.yml     # PostgreSQL untuk development (opsional)
```

Backend menggunakan layered architecture:

```text
module/
├── presentation/    # Route dan controller HTTP
├── application/     # Service dan use case
└── infrastructure/  # Repository dan akses database
```

## Menjalankan Aplikasi (Development)

### Prasyarat

- Node.js 20 atau lebih baru.
- PostgreSQL 14+ (instalasi lokal, atau `docker compose up -d` dari file yang tersedia).

### Konfigurasi

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env`:

- `DATABASE_URL` — koneksi PostgreSQL lokal.
- `JWT_SECRET` — wajib diganti dengan secret acak yang panjang (`openssl rand -hex 48`).
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — kredensial superadmin awal untuk seed.
- `SMTP_*` — opsional; kosongkan untuk mode dry-run email reminder.

### Menyiapkan backend

```powershell
Set-Location backend
npm ci
npm run db:generate
npm run db:migrate deploy
npm run db:seed
npm run dev
```

API berjalan di `http://localhost:3000`. Kredensial awal mengikuti
`ADMIN_USERNAME` / `ADMIN_PASSWORD` pada `.env` — segera ganti password
melalui halaman User Management setelah login pertama.

### Menjalankan frontend

```powershell
Set-Location frontend
npm ci
npm run dev
```

Vite berjalan di `http://localhost:5173` dan meneruskan request `/api`
ke backend di `http://localhost:3000`. Jalankan backend pada terminal terpisah.

## Fitur

- Login/logout berbasis session cookie HTTP-only + rate limiting.
- Role `admin` dan `superadmin` dengan proteksi endpoint.
- Overview dashboard: statistik, tren penyelesaian, beban PIC.
- Master Asset dengan import/export CSV.
- Master Schedule dengan filter dan pencarian.
- Maintenance Calendar dengan detail per tanggal.
- Reminder Center (H-7, H-3, Hari H, overdue) dengan filter.
- Notifikasi realtime via Server-Sent Events.
- User Management (tambah/edit user, email untuk reminder).
- Activity Logs sebagai audit trail.
- Grafik, laporan, dan export CSV.

## API Utama

| Endpoint | Keterangan |
| --- | --- |
| `POST /api/auth/login` | Login (rate limit 5 gagal / 15 menit per IP+username) |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/me` | Sesi aktif |
| `GET|POST /api/auth/users` | Daftar & buat user (superadmin) |
| `PUT|DELETE /api/auth/users/:id` | Edit & hapus user (superadmin) |
| `GET|POST /api/assets` · `POST /api/assets/import` | Master aset & import massal |
| `PUT|DELETE /api/assets/:id` | Ubah & hapus aset |
| `GET|POST /api/schedules` | Jadwal maintenance |
| `PUT|DELETE /api/schedules/:id` | Ubah & hapus jadwal |
| `GET /api/notifications` · `GET /api/notifications/stream` | Notifikasi + stream realtime |
| `PATCH /api/notifications/:id/read` · `PATCH /api/notifications/read-all` | Tandai dibaca |
| `GET /api/activity-logs` | Audit trail (superadmin) |
| `POST /api/sync` | Sinkronisasi data legacy (superadmin) |
| `GET /api/health` | Health check |

## Database

PostgreSQL dikelola dengan Prisma:

- `User` — akun, role, dan email (untuk reminder).
- `Asset` — master aset.
- `Schedule` — jadwal dan histori pekerjaan.
- `Notification` — notifikasi per user.
- `ActivityLog` — audit trail aksi pengguna.

## Produksi

- Build frontend (`npm run build`) — backend menyajikan hasilnya sebagai
  static file lengkap dengan SPA fallback, sehingga cukup satu service.
- Jalankan `npx prisma migrate deploy` saat rilis.
- Set `NODE_ENV=production` (mengaktifkan cookie `secure`), HTTPS via
  reverse proxy, dan `app.set('trust proxy', 1)` sudah terpasang.
- Gunakan `JWT_SECRET` dan password admin yang berbeda per lingkungan.
- Jadwalkan backup `pg_dump` harian.

## Catatan Keamanan

- Jangan pernah commit `backend/.env`.
- Password disimpan sebagai hash bcrypt (cost 12).
- Session token JWT di cookie httpOnly + sameSite lax.
- Rate limiting: 300 request / 15 menit per IP untuk API,
  5 percobaan login gagal / 15 menit per IP+username.
- Role dan audit log aktif untuk semua aksi penting.
