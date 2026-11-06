import { useState } from 'react';
import { Schedule } from '../../shared/api';
import { Download } from 'lucide-react';
import { Pagination, PAGE_SIZE } from '../../shared/components/Pagination';

export function History({ schedules, onExport }: { schedules: Schedule[]; onExport: () => void }) {
  const completed = schedules.filter((item) => item.complete).sort((a, b) => (b.finished || '').localeCompare(a.finished || ''));
  const [page, setPage] = useState(1);
  const pageItems = completed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return <section className="panel" id="history"><div className="reporttop"><div><h2>Maintenance History</h2><p>Pekerjaan yang sudah selesai.</p></div><button className="secondary" onClick={onExport}><Download size={15} /> Export History CSV</button></div><div className="tablewrap"><table><thead><tr><th>Kode / Aset</th><th>Aktivitas</th><th>Due Date</th><th>Selesai</th><th>PIC</th><th>Ketepatan</th></tr></thead><tbody>{pageItems.map((item) => <tr key={item.id}><td><strong>{item.code}</strong><small>{item.machine}</small></td><td>{item.activity}</td><td>{item.due.slice(0, 10)}</td><td>{item.finished?.slice(0, 10) || '—'}</td><td>{item.pic}</td><td>{item.finished && item.finished.slice(0, 10) <= item.due.slice(0, 10) ? <span className="pill completed">On-Time</span> : <span className="pill overdue">Late</span>}</td></tr>)}</tbody></table></div><Pagination page={page} total={completed.length} onChange={setPage} /></section>;
}
