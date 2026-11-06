import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Schedule } from '../../shared/api';
import { Pagination, PAGE_SIZE } from '../../shared/components/Pagination';
import { scheduleStatus } from './status';

export function ScheduleTable({ schedules, today, loading, onEdit, onDelete, onAdd }: { schedules: Schedule[]; today: string; loading: boolean; onEdit: (schedule: Schedule) => void; onDelete: (id: string) => void; onAdd: () => void }) {
  const [page, setPage] = useState(1);
  const urlParams = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState(urlParams.get('search') ?? '');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState(urlParams.get('status') ?? '');
  const [type, setType] = useState('');
  const areas = useMemo(() => [...new Set(schedules.map((item) => item.area))].sort(), [schedules]);
  const visible = useMemo(() => schedules.filter((item) => {
    const text = `${item.code} ${item.machine} ${item.activity} ${item.pic}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (!area || item.area === area) && (!status || scheduleStatus(item, today) === status) && (!type || item.type === type);
  }), [schedules, search, area, status, type, today]);
  useEffect(() => { setPage(1); }, [search, area, status, type]);
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return <section className="panel" id="schedule"><div className="reporttop"><div><span className="section-eyebrow">PLANNING / MAINTENANCE</span><h2>Master Schedule Maintenance</h2><p>Kelola jadwal maintenance berdasarkan aset, PIC, status, dan area.</p></div><div className="schedule-heading-actions"><p className="result-count">{loading ? 'Memuat data...' : `${visible.length} jadwal ditemukan`}</p><button onClick={onAdd}><Plus size={15} /> Tambah Jadwal</button></div></div><div className="schedule-filters"><label className="schedule-search"><span>Cari jadwal</span><div><Search size={14} /><input placeholder="Kode, aset, aktivitas, PIC..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></label><label>Area<select value={area} onChange={(event) => setArea(event.target.value)}><option value="">Semua Area</option>{areas.map((item) => <option key={item}>{item}</option>)}</select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Semua Status</option><option>Completed</option><option>Upcoming</option><option>Pending</option><option>Overdue</option></select></label><label>Jenis<select value={type} onChange={(event) => setType(event.target.value)}><option value="">Semua Jenis</option><option>Preventive</option><option>Corrective</option></select></label><button className="secondary schedule-reset" onClick={() => { setSearch(''); setArea(''); setStatus(''); setType(''); }}>Reset</button></div><div className="tablewrap schedule-table-wrap"><table className="schedule-table"><thead><tr><th>Kode / Aset</th><th>Area</th><th>Aktivitas</th><th>Jenis</th><th>Frekuensi</th><th>Due Date</th><th>Tanggal Selesai</th><th>PIC</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{pageItems.map((item) => { const itemStatus = scheduleStatus(item, today); return <tr key={item.id}><td><strong>{item.code}</strong><small>{item.machine}</small></td><td>{item.area}</td><td>{item.activity}</td><td>{item.type}</td><td>{item.frequency}</td><td>{item.due.slice(0, 10)}</td><td>{item.finished?.slice(0, 10) || '—'}</td><td>{item.pic}</td><td><span className={`pill ${itemStatus.toLowerCase()}`}>{itemStatus}</span></td><td className="tableactions"><button className="secondary icon-action" aria-label={`Edit ${item.code}`} title="Edit jadwal" onClick={() => onEdit(item)}><Pencil size={15} /></button><button className="danger icon-action" aria-label={`Hapus ${item.code}`} title="Hapus jadwal" onClick={() => onDelete(item.id)}><Trash2 size={15} /></button></td></tr>; })}</tbody></table>{!loading && !pageItems.length && <p className="empty">Tidak ada jadwal yang sesuai filter.</p>}</div><Pagination page={page} total={visible.length} onChange={setPage} /></section>;
}
