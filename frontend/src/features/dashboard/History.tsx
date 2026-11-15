import { useState } from 'react';
import { Schedule } from '../../shared/api';
import { Download, Pencil, Printer, Trash2 } from 'lucide-react';
import { Pagination, PAGE_SIZE } from '../../shared/components/Pagination';

export function History({ schedules, onExport, onEdit, onDelete }: { schedules: Schedule[]; onExport: () => void; onEdit: (schedule: Schedule) => void; onDelete: (id: string) => void }) {
  const completed = schedules.filter((item) => item.complete).sort((a, b) => (b.finished || '').localeCompare(a.finished || ''));
  const [page, setPage] = useState(1);
  const pageItems = completed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const onTime = completed.filter((item) => item.finished && item.finished.slice(0, 10) <= item.due.slice(0, 10)).length;
  const late = completed.length - onTime;
  const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  return <section className="panel" id="history"><div className="reporttop"><div><h2>Maintenance History</h2><p>Arsip jadwal yang sudah selesai. Bisa diedit untuk koreksi tanggal atau dikembalikan ke aktif.</p></div><div className="actions"><button className="secondary" onClick={() => window.print()}><Printer size={15} /> Cetak / Simpan PDF</button><button className="secondary" onClick={onExport}><Download size={15} /> Export History CSV</button></div></div><div className="tablewrap"><table><thead><tr><th>Kode / Aset</th><th>Aktivitas</th><th>Due Date</th><th>Selesai</th><th>PIC</th><th>Ketepatan</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>{pageItems.map((item) => <tr key={item.id}><td><strong>{item.code}</strong><small>{item.machine}</small></td><td>{item.activity}</td><td>{item.due.slice(0, 10)}</td><td>{item.finished?.slice(0, 10) || '—'}</td><td>{item.pic}</td><td>{item.finished && item.finished.slice(0, 10) <= item.due.slice(0, 10) ? <span className="pill completed">On-Time</span> : <span className="pill overdue">Late</span>}</td><td>{item.completionNote || '—'}</td><td className="tableactions"><button className="secondary icon-action" aria-label={`Edit ${item.code}`} title="Edit / kembalikan ke aktif" onClick={() => onEdit(item)}><Pencil size={15} /></button><button className="danger icon-action" aria-label={`Hapus ${item.code}`} title="Hapus jadwal" onClick={() => onDelete(item.id)}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div><Pagination page={page} total={completed.length} onChange={setPage} />
    <div className="print-doc" aria-hidden="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #202126', paddingBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#d71920', fontWeight: 700 }}>KARYA BAHANA BERLIAN — HRGA SYSTEM</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#202126', marginTop: 4 }}>Maintenance History</div>
        </div>
        <div style={{ fontSize: 10, color: '#71757d', textAlign: 'right' }}>Dicetak: {printDate}<br />Total: {completed.length} jadwal selesai</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14, fontSize: 10, color: '#202126' }}>
        <thead><tr>{['Kode', 'Aset', 'Aktivitas', 'Due', 'Selesai', 'PIC', 'Ketepatan', 'Catatan'].map((h) => <th key={h} style={{ textAlign: 'left', borderBottom: '1.5px solid #202126', padding: '6px 8px', fontWeight: 700 }}>{h}</th>)}</tr></thead>
        <tbody>{completed.map((item) => {
          const onTimeItem = Boolean(item.finished && item.finished.slice(0, 10) <= item.due.slice(0, 10));
          return <tr key={item.id}>
            <td style={{ borderBottom: '0.5pt solid #cccccc', padding: '5px 8px', fontWeight: 700 }}>{item.code}</td>
            <td style={{ borderBottom: '0.5pt solid #cccccc', padding: '5px 8px' }}>{item.machine}</td>
            <td style={{ borderBottom: '0.5pt solid #cccccc', padding: '5px 8px' }}>{item.activity}</td>
            <td style={{ borderBottom: '0.5pt solid #cccccc', padding: '5px 8px' }}>{item.due.slice(0, 10)}</td>
            <td style={{ borderBottom: '0.5pt solid #cccccc', padding: '5px 8px' }}>{item.finished?.slice(0, 10) || '-'}</td>
            <td style={{ borderBottom: '0.5pt solid #cccccc', padding: '5px 8px' }}>{item.pic}</td>
            <td style={{ borderBottom: '0.5pt solid #cccccc', padding: '5px 8px' }}>{item.finished ? (onTimeItem ? 'On-Time' : 'Late') : '-'}</td>
            <td style={{ borderBottom: '0.5pt solid #cccccc', padding: '5px 8px' }}>{item.completionNote || '-'}</td>
          </tr>;
        })}</tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 10, color: '#71757d' }}>On-Time: {onTime} · Late: {late} · Dicetak dari HRGA System pada {printDate}</div>
    </div>
  </section>;
}
