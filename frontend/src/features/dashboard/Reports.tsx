import { useState } from 'react';
import { Asset, Schedule } from '../../shared/api';
import { localDateString } from '../../shared/date';
import { scheduleStatus } from '../schedules/status';
import { Download, FileDown, Printer } from 'lucide-react';
import { Pagination, PAGE_SIZE } from '../../shared/components/Pagination';

const STATUS_ORDER = ['Completed', 'Upcoming', 'Pending', 'Overdue'] as const;
const STATUS_COLORS: Record<string, string> = { Completed: '#21a874', Upcoming: '#d9a514', Pending: '#e5e7eb', Overdue: '#d71920' };

export function Reports({ assets, schedules, onCsv, onPrint, onPng }: { assets: Asset[]; schedules: Schedule[]; onCsv: () => void; onPrint: () => void; onPng: () => void }) {
  const today = localDateString(new Date());
  const categories = [...new Set(assets.map((asset) => asset.category))];
  const [page, setPage] = useState(1);
  const pageCategories = categories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const catOf = (item: Schedule) => assetById.get(item.assetId)?.category ?? '';
  const categoryRows = categories.map((category) => {
    const rows = schedules.filter((item) => catOf(item) === category);
    const counts = STATUS_ORDER.map((status) => rows.filter((item) => scheduleStatus(item, today) === status).length);
    return { category, counts, total: rows.length };
  });
  const maxTotal = Math.max(...categoryRows.map((row) => row.total), 1);
  const completedCount = schedules.filter((item) => item.complete).length;
  const overdueCount = schedules.filter((item) => scheduleStatus(item, today) === 'Overdue').length;
  const completedWithFinished = schedules.filter((item) => item.complete && item.finished);
  const onTimeCount = completedWithFinished.filter((item) => item.finished!.slice(0, 10) <= item.due.slice(0, 10)).length;



  return <section className="panel" id="reports">
    <div className="reporttop"><div><h2>Grafik Hasil &amp; Laporan Maintenance</h2><p>Rekap status berdasarkan kategori aset sesuai filter.</p></div><div className="actions"><button className="secondary" onClick={onPng}><Download size={15} /> Unduh Grafik PNG</button><button className="secondary" onClick={onPrint}><Printer size={15} /> Cetak / Simpan PDF</button><button className="secondary" onClick={onCsv}><FileDown size={15} /> Data Laporan CSV</button></div></div>
    <div className="charts"><div><h3>Status Maintenance per Kategori</h3><div className="reportchart">{categoryRows.map((row) => <div className="chartrow" key={row.category}><span>{row.category}</span><div className="charttrack">{row.counts.map((count, index) => <span className="segment" key={STATUS_ORDER[index]} style={{ width: `${row.total ? count / maxTotal * 100 : 0}%`, background: STATUS_COLORS[STATUS_ORDER[index]] }} />)}</div><b>{row.total}</b></div>)}</div></div><div><h3>Ringkasan Realisasi</h3><div className="reportstats"><div className="reportmetric"><span>Total jadwal</span><strong>{schedules.length}</strong></div><div className="reportmetric"><span>Selesai</span><strong>{completedCount}</strong></div><div className="reportmetric"><span>Overdue</span><strong>{overdueCount}</strong></div><div className="reportmetric"><span>Completion Rate</span><strong>{schedules.length ? Math.round(completedCount / schedules.length * 100) : 0}%</strong></div><div className="reportmetric"><span>On-Time Compliance</span><strong>{completedWithFinished.length ? Math.round(onTimeCount / completedWithFinished.length * 100) : 0}%</strong></div></div></div></div>
    <div className="report-table"><table><thead><tr><th>Kategori</th><th>Total</th><th>Completed</th><th>Pending</th><th>Completion Rate</th></tr></thead><tbody>{pageCategories.map((category) => { const rows = schedules.filter((item) => catOf(item) === category); const done = rows.filter((item) => item.complete).length; return <tr key={category}><td><strong>{category}</strong></td><td>{rows.length}</td><td>{done}</td><td>{rows.length - done}</td><td>{rows.length ? `${Math.round(done / rows.length * 100)}%` : '0%'}</td></tr>; })}</tbody></table></div><Pagination page={page} total={categories.length} onChange={setPage} />
  </section>;
}
