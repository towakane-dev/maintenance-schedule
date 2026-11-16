import { useEffect, useState } from 'react';
import { SlidersHorizontal, Mail, Search } from 'lucide-react';
import { api, Schedule } from '../../shared/api';
import { Pagination, PAGE_SIZE } from '../../shared/components/Pagination';
import { scheduleStatus } from '../schedules/status';

function daysUntil(due: string, today: string) {
  return Math.round((new Date(`${due.slice(0, 10)}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
}

export function Reminders({ schedules, today, onToast, onError }: { schedules: Schedule[]; today: string; onToast?: (message: string) => void; onError?: (message: string) => void }) {
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [reminderFilter, setReminderFilter] = useState('');
  const [picFilter, setPicFilter] = useState('');
  const [emailTarget, setEmailTarget] = useState<Schedule | null>(null);
  const [sending, setSending] = useState(false);
  async function sendEmail() {
    if (!emailTarget) return;
    setSending(true);
    try {
      const result = await api.emailPicReminder(emailTarget.id);
      if (onToast) onToast(result.sent ? `Email reminder terkirim ke ${result.to}.` : 'SMTP belum dikonfigurasi — email dicetak ke log server (mode dry-run).');
      setEmailTarget(null);
    } catch (reason) {
      if (onError) onError(reason instanceof Error ? reason.message : 'Gagal mengirim email reminder.');
    } finally {
      setSending(false);
    }
  }
  const reminders = schedules.filter((item) => {
    if (item.complete) return false;
    return daysUntil(item.due, today) <= 7;
  });
  const label = (item: Schedule) => {
    const days = daysUntil(item.due, today);
    return days < 0 ? 'Overdue' : days === 0 ? 'Hari H' : `H-${days}`;
  };
  const pics = [...new Set(reminders.map((item) => item.pic))].sort();
  const filtered = reminders.filter((item) => {
    const text = `${item.code} ${item.machine} ${item.activity} ${item.pic}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (!reminderFilter || label(item) === reminderFilter) && (!picFilter || item.pic === picFilter);
  });
  useEffect(() => { setPage(1); }, [search, reminderFilter, picFilter]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return <section className="panel" id="reminders"><div className="reporttop"><div><h2>Reminder Center — Jadwal Berulang</h2><p>Reminder H-7, H-3, Hari H, dan overdue.</p></div><p className="result-count">{filtered.length} dari {reminders.length} reminder</p></div><div className="stats reminder-stats"><div className="stat"><span>H-7</span><b>{reminders.filter((x) => daysUntil(x.due, today) === 7).length}</b></div><div className="stat"><span>H-3</span><b>{reminders.filter((x) => daysUntil(x.due, today) === 3).length}</b></div><div className="stat"><span>Hari H</span><b>{reminders.filter((x) => daysUntil(x.due, today) === 0).length}</b></div><div className="stat over"><span>Overdue</span><b>{reminders.filter((x) => scheduleStatus(x, today) === 'Overdue').length}</b></div></div><div className={'schedule-filters' + (showFilters ? ' open' : '')}><button type="button" className="filters-toggle" aria-expanded={showFilters} aria-label="Tampilkan filter" onClick={() => setShowFilters((v) => !v)}><SlidersHorizontal size={19} /></button><div className="filters-body"><label className="schedule-search"><span>Cari reminder</span><div><Search size={14} /><input placeholder="Kode, aset, aktivitas, PIC..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></label><label>Reminder<select value={reminderFilter} onChange={(event) => setReminderFilter(event.target.value)}><option value="">Semua</option><option>Overdue</option><option>Hari H</option><option>H-7</option><option>H-3</option><option>H-1</option></select></label><label>PIC<select value={picFilter} onChange={(event) => setPicFilter(event.target.value)}><option value="">Semua PIC</option>{pics.map((pic) => <option key={pic}>{pic}</option>)}</select></label><button className="secondary schedule-reset" onClick={() => { setSearch(''); setReminderFilter(''); setPicFilter(''); }}>Reset</button></div></div><div className="tablewrap"><table><thead><tr><th>Aset</th><th>Jadwal</th><th>Due</th><th>Reminder</th><th>PIC</th><th>Email</th></tr></thead><tbody>{pageItems.map((item) => <tr key={item.id}><td><strong>{item.code}</strong><small>{item.machine}</small></td><td>{item.activity}</td><td>{item.due.slice(0, 10)}</td><td><span className={`pill ${scheduleStatus(item, today).toLowerCase()}`}>{label(item)}</span></td><td>{item.pic}</td><td><button className="secondary icon-action" disabled={!item.picEmail} title={item.picEmail ? `Kirim email reminder ke ${item.picEmail}` : 'Belum ada email PIC — isi lewat Edit Jadwal'} aria-label={`Kirim email reminder ke PIC ${item.code}`} onClick={() => setEmailTarget(item)}><Mail size={15} /></button></td></tr>)}</tbody></table>{!filtered.length && <p className="empty">Tidak ada reminder yang sesuai filter.</p>}</div><Pagination page={page} total={filtered.length} onChange={setPage} />{emailTarget && <div className="modalback show" role="dialog" aria-modal="true" aria-labelledby="email-title"><div className="modal"><div className="delete-heading"><div className="delete-icon" style={{ background: '#eef2f7', color: '#202126' }}><Mail size={17} /></div><div><span className="section-eyebrow">REMINDER / KIRIM EMAIL</span><h2 id="email-title">Kirim email reminder?</h2></div></div><p style={{ margin: '0 0 6px 0', fontSize: 13, color: '#71757d' }}><strong>{emailTarget.code}</strong> — {emailTarget.activity}</p><p style={{ margin: '0 0 14px 0', fontSize: 12, color: '#71757d' }}>Akan dikirim ke PIC: <strong>{emailTarget.picEmail}</strong></p><div className="modalfooter"><button type="button" className="secondary" onClick={() => setEmailTarget(null)}>Batal</button><button type="button" disabled={sending} onClick={() => void sendEmail()}>{sending ? 'Mengirim...' : 'Kirim Email'}</button></div></div></div>}</section>;
}
