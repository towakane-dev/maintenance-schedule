import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { prisma } from '../../../shared/database';
import { UserRepository } from './user.repository';

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const user = await new UserRepository().upsert(username, await bcrypt.hash(password, 12));
  console.log(`Admin account ready: ${username}`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOffset = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date;
  };
  const demoAssets = [
    { code: 'FAS-001', name: 'AC Ruang HRGA', category: 'Fasilitas', area: 'Office / HRGA', owner: 'Tim GA' },
    { code: 'ELK-001', name: 'CCTV Area Parkir', category: 'Elektronik', area: 'Area Parkir', owner: 'Vendor CCTV' },
    { code: 'VEH-001', name: 'Mobil Operasional 01', category: 'Kendaraan', area: 'Pool Kendaraan', owner: 'Vendor Bengkel' },
    { code: 'BGN-001', name: 'Atap Gedung Office', category: 'Gedung & Bangunan', area: 'Gedung Office', owner: 'Tim GA' },
    { code: 'FAS-002', name: 'Pompa Air Utama', category: 'Fasilitas', area: 'Utility', owner: 'Tim GA' },
    { code: 'ELK-002', name: 'Printer HRGA', category: 'Elektronik', area: 'Office / HRGA', owner: 'IT Support' },
    { code: 'VEH-002', name: 'Kendaraan Operasional 02', category: 'Kendaraan', area: 'Pool Kendaraan', owner: 'Driver GA' },
    { code: 'BGN-002', name: 'Drainase Pabrik', category: 'Gedung & Bangunan', area: 'Pabrik', owner: 'Tim GA' },
    { code: 'FAS-003', name: 'Genset Kantor', category: 'Fasilitas', area: 'Utility', owner: 'Vendor Genset' },
    { code: 'ELK-003', name: 'Proyektor Meeting', category: 'Elektronik', area: 'Meeting Room', owner: 'IT Support' },
  ];
  const assets = new Map<string, { id: string; code: string; name: string }>();
  for (const demoAsset of demoAssets) {
    const asset = await prisma.asset.upsert({
      where: { code: demoAsset.code },
      update: demoAsset,
      create: { ...demoAsset, company: 'PT Karya Bahana Berlian', condition: 'Baik' },
    });
    assets.set(asset.code, asset);
  }

  const demoSchedules = [
    ['FAS-001', 'Cuci filter dan inspeksi freon', 'Preventive', '3 Bulanan', -8, 'Tim GA', true, -9],
    ['ELK-001', 'Perbaikan kamera offline', 'Corrective', 'Insidental', -5, 'Vendor CCTV', false, null],
    ['VEH-001', 'Servis berkala dan pemeriksaan rem', 'Preventive', '6 Bulanan', 3, 'Vendor Bengkel', false, null],
    ['BGN-001', 'Inspeksi kebocoran', 'Preventive', '6 Bulanan', 6, 'Tim GA', false, null],
    ['FAS-002', 'Pemeriksaan tekanan dan kebocoran', 'Preventive', 'Bulanan', -2, 'Tim GA', true, 0],
    ['ELK-002', 'Penggantian roller printer', 'Corrective', 'Insidental', -11, 'IT Support', true, -10],
    ['VEH-002', 'Pemeriksaan oli dan ban', 'Preventive', 'Bulanan', -1, 'Driver GA', false, null],
    ['BGN-002', 'Pembersihan saluran', 'Preventive', '3 Bulanan', 14, 'Tim GA', false, null],
    ['FAS-003', 'Uji fungsi dan pengecekan oli', 'Preventive', 'Bulanan', 21, 'Vendor Genset', false, null],
    ['ELK-003', 'Pemeriksaan fungsi dan kabel', 'Preventive', '6 Bulanan', 0, 'IT Support', false, null],
  ] as const;
  for (const [code, activity, type, frequency, dueOffset, pic, complete, finishedOffset] of demoSchedules) {
    const asset = assets.get(code);
    if (!asset) continue;
    const due = dateOffset(dueOffset);
    await prisma.schedule.upsert({
      where: { id: `demo-${code}` },
      update: { code, machine: asset.name, area: demoAssets.find((item) => item.code === code)!.category, activity, type, frequency, due, pic, complete, finished: finishedOffset === null ? null : dateOffset(finishedOffset), assetId: asset.id, createdById: user.id },
      create: { id: `demo-${code}`, code, machine: asset.name, area: demoAssets.find((item) => item.code === code)!.category, activity, type, frequency, due, pic, complete, finished: finishedOffset === null ? null : dateOffset(finishedOffset), assetId: asset.id, createdById: user.id },
    });
  }
  console.log(`Demo data ready: ${demoAssets.length} assets, ${demoSchedules.length} schedules`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
