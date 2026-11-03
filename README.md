# Karya Bahana Berlian HRGA

## Asset & Maintenance Dashboard

Aplikasi untuk mengelola master aset, jadwal maintenance, reminder, histori pekerjaan, dan laporan HRGA.

## Struktur Proyek

```text
KBB_HRGA_SourceCode_V4_DOWNLOAD_ULANG/
├── frontend-vite/       # Frontend React + Vite baru
│   ├── src/
│   └── package.json
├── index.html            # Frontend legacy (dipertahankan)
├── css/
├── js/
├── assets/
├── KBB_HRGA_MAINTENANCE SCHEDULE Prototype.html
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── index.ts
│   │   ├── shared/
│   │   └── modules/
│   │       ├── auth/
│   │       ├── assets/
│   │       └── schedules/
│   ├── package.json
│   └── .env.example
└── docker-compose.yml
```

Backend menggunakan layered architecture:

```text
module/
├── presentation/    # Route dan controller HTTP
├── application/     # Service dan use case
└── infrastructure/  # Repository dan akses database
```

## Menjalankan Aplikasi

### Prasyarat

- Node.js 20 atau lebih baru.
- Docker Desktop.

### Menyalakan PostgreSQL

```powershell
docker compose up -d
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` dan ganti `JWT_SECRET` dengan secret acak yang panjang.

### Menyiapkan backend

```powershell
Set-Location backend
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Buka `http://localhost:3000` di Chrome atau Microsoft Edge.

Login awal:

| Username | Password |
| --- | --- |
| `admin` | `admin123` |

Password admin dapat diubah pada `backend\.env` sebelum menjalankan `npm run db:seed`.

## API Utama

- `POST /api/auth/login` — login.
- `POST /api/auth/register` — membuat akun baru.
- `POST /api/auth/logout` — logout.
- `GET /api/auth/me` — memeriksa sesi aktif.
- `GET|POST /api/assets` — membaca dan membuat aset.
- `PUT|DELETE /api/assets/:id` — mengubah dan menghapus aset.
- `GET|POST /api/schedules` — membaca dan membuat jadwal.
- `PUT|DELETE /api/schedules/:id` — mengubah dan menghapus jadwal.
- `POST /api/sync` — sinkronisasi data legacy frontend ke PostgreSQL.

## Database

PostgreSQL dikelola dengan Prisma dan memiliki tabel:

- `User` — akun dan password hash.
- `Asset` — master aset.
- `Schedule` — jadwal dan histori pekerjaan.

Backend menjadi sumber data utama untuk login, aset, dan jadwal. Adapter `js/api-sync.js` memuat data PostgreSQL saat sesi login tersedia dan mengirim perubahan dari UI lama ke `/api/sync`. Fallback `localStorage` tetap dipertahankan agar prototype tidak rusak ketika backend offline.

## Frontend React + Vite

Frontend baru tersedia di `frontend-vite/`. File legacy di root repository tidak dihapus
agar dapat dipakai sebagai pembanding selama migrasi.

```powershell
Set-Location frontend-vite
npm install
npm run dev
```

Vite berjalan di `http://localhost:5173` dan meneruskan request `/api` ke backend
di `http://localhost:3000`. Jalankan backend pada terminal terpisah sesuai langkah
di atas.

Sinkronisasi legacy bersifat upsert: data baru dan perubahan dikirim ke database, tetapi penghapusan dari UI lama belum menghapus record PostgreSQL. Ini sengaja dibuat aman untuk tahap migrasi awal.

## Fitur Frontend

- Login dan logout berbasis session cookie HTTP-only.
- Master Asset.
- Maintenance Calendar.
- Master Schedule.
- Reminder Center.
- Maintenance History.
- Grafik dan laporan.
- Import/export aset Excel atau CSV.

## Catatan Keamanan

- Jangan commit `backend/.env`.
- Ganti `JWT_SECRET` dan password database untuk deployment.
- Password disimpan sebagai hash bcrypt.
- Login membutuhkan backend; jangan membuka `frontend/index.html` langsung dengan double-click.
- Belum tersedia role/hak akses dan audit log.

## Data Legacy

Versi prototype sebelumnya menyimpan data jadwal dan aset di `localStorage`. Data tersebut tetap dapat dibaca oleh kode frontend lama, tetapi migrasi ke PostgreSQL perlu dilakukan melalui proses import tersendiri.
