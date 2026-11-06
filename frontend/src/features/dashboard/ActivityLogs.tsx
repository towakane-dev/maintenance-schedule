import { useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { ActivityLog } from '../../shared/api';
import { Pagination } from '../../shared/components/Pagination';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function actionLabel(action: string) {
  return ({ CREATE: 'Membuat', UPDATE: 'Mengubah', DELETE: 'Menghapus', COMPLETE: 'Menyelesaikan', LOGIN_SUCCESS: 'Login', LOGIN_FAILED: 'Login gagal', LOGOUT: 'Logout', EMAIL_DIGEST: 'Email digest' } as Record<string, string>)[action] || action;
}

function entityLabel(entity: string) {
  return ({ Asset: 'Aset', Schedule: 'Jadwal', User: 'User', Auth: 'Auth', Notification: 'Notifikasi' } as Record<string, string>)[entity] || entity;
}

const fieldLabel: Record<string, string> = { username: 'Username', email: 'Email', role: 'Role', code: 'Kode', name: 'Nama', activity: 'Aktivitas', due: 'Due date', pic: 'PIC', complete: 'Status selesai', finished: 'Tanggal selesai', type: 'Jenis', frequency: 'Frekuensi', area: 'Area', category: 'Kategori', location: 'Lokasi', condition: 'Kondisi', notes: 'Catatan' };
const keyLabel = (key: string) => ({ code: 'kode', name: 'nama', username: 'username', role: 'role', imported: 'import', activity: 'aktivitas', machine: 'aset' } as Record<string, string>)[key] || key;

/** Render metadata audit: diff perubahan {field:{from,to}} atau info ringkas. */
function Detail({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return <>—</>;
  const changes = metadata.changes as Record<string, { from: unknown; to: unknown }> | undefined;
  if (changes && Object.keys(changes).length) {
    return <div className="log-changes">{Object.entries(changes).map(([field, change]) => <span key={field}><b>{fieldLabel[field] || field}:</b> {change.from === null || change.from === '' ? <i>(kosong)</i> : String(change.from)} → {change.to === null || change.to === '' ? <i>(kosong)</i> : String(change.to)}</span>)}</div>;
  }
  const parts = Object.entries(metadata).filter(([key]) => key !== 'changes').map(([key, value]) => `${keyLabel(key)}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
  return parts.length ? <code>{parts.join(' · ')}</code> : <>—</>;
}

export function ActivityLogs({ logs, total, loading, onPageChange, onRefresh, onFilter }: { logs: ActivityLog[]; total: number; loading: boolean; onPageChange: (page: number) => void; onRefresh: () => void; onFilter: (filters: { user?: string; action?: string; entity?: string; from?: string; to?: string }) => void }) {
  const [page, setPage] = useState(1);
  const [user, setUser] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const changePage = (nextPage: number) => { setPage(nextPage); onPageChange(nextPage); };
  const apply = () => { setPage(1); onFilter({ user, action, entity, from, to }); };
  const reset = () => { setUser(''); setAction(''); setEntity(''); setFrom(''); setTo(''); setPage(1); onFilter({}); };
  return <section className="panel" id="activity-logs"><div className="reporttop"><div><span className="section-eyebrow">AUDIT / ACTIVITY LOG</span><h2>Activity Logs</h2><p>Riwayat aktivitas pengguna dan perubahan data dalam sistem.</p></div><button className="secondary" onClick={onRefresh}><RefreshCw size={15} /> Refresh</button></div>
    <div className="schedule-filters"><label className="schedule-search"><span>Cari user</span><div><Search size={14} /><input placeholder="Username..." value={user} onChange={(event) => setUser(event.target.value)} /></div></label><label>Aksi<select value={action} onChange={(event) => setAction(event.target.value)}><option value="">Semua Aksi</option>{['CREATE', 'UPDATE', 'DELETE', 'COMPLETE', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'EMAIL_DIGEST'].map((item) => <option key={item} value={item}>{actionLabel(item)}</option>)}</select></label><label>Entity<select value={entity} onChange={(event) => setEntity(event.target.value)}><option value="">Semua Entity</option>{['Asset', 'Schedule', 'User', 'Auth'].map((item) => <option key={item} value={item}>{entityLabel(item)}</option>)}</select></label><label>Dari<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Sampai<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button className="secondary schedule-reset" onClick={reset}>Reset</button><button onClick={apply}>Terapkan</button></div>
    <div className="tablewrap activity-log-table-wrap"><table><thead><tr><th>Waktu</th><th>User</th><th>Aktivitas</th><th>Entity</th><th>Detail</th><th>IP Address</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{formatDate(log.createdAt)}</td><td><strong>{log.user?.username || 'System'}</strong></td><td><span className={`pill ${log.action === 'DELETE' || log.action === 'LOGIN_FAILED' ? 'overdue' : log.action === 'CREATE' || log.action === 'COMPLETE' ? 'completed' : 'pending'}`}>{actionLabel(log.action)}</span></td><td>{entityLabel(log.entity)}</td><td><Detail metadata={log.metadata} /></td><td>{log.ipAddress || '—'}</td></tr>)}</tbody></table>{!loading && logs.length === 0 && <p className="empty">Belum ada aktivitas yang sesuai filter.</p>}{loading && <p className="empty">Memuat activity logs...</p>}</div><Pagination page={page} total={total} onChange={changePage} /></section>;
}
