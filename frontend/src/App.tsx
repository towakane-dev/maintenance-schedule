import { FormEvent, useEffect, useState } from 'react';
import { AssetForm, emptyAsset } from './features/assets/AssetForm';
import { AssetTable } from './features/assets/AssetTable';
import { Login } from './features/auth/Login';
import { UserForm } from './features/auth/UserForm';
import { UserTable } from './features/auth/UserTable';
import { Calendar } from './features/dashboard/Calendar';
import { OverviewMetrics } from './features/dashboard/OverviewMetrics';
import { History } from './features/dashboard/History';
import { ActivityLogs } from './features/dashboard/ActivityLogs';
import { Reminders } from './features/dashboard/Reminders';
import { Reports } from './features/dashboard/Reports';
import { NotificationBell } from './features/dashboard/NotificationBell';
import { ScheduleForm, emptySchedule, ScheduleFormValue } from './features/schedules/ScheduleForm';
import { ScheduleTable } from './features/schedules/ScheduleTable';
import { scheduleStatus } from './features/schedules/status';
import { api, ActivityLog, Asset, Schedule, User, UserRecord } from './shared/api';
import { Toast } from './shared/components/Toast';
import { localDateString } from './shared/date';
import { downloadCsv } from './shared/csv';
import { AlertTriangle, BarChart3, Menu as MenuIcon, Check as CheckIcon, BellRing, CalendarDays, ChevronsLeft, ChevronsRight, ClipboardList, History as HistoryIcon, LayoutDashboard, LogOut, Package, ScrollText, Users, X } from 'lucide-react';

function Dashboard({ user, onLogout, initialToast }: { user: User; onLogout: () => void; initialToast?: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLogTotal, setActivityLogTotal] = useState(0);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormValue>(emptySchedule);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(initialToast ?? '');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [assetEditor, setAssetEditor] = useState<Asset | null>(null);
  const [assetDeleteTarget, setAssetDeleteTarget] = useState<Asset | null>(null);
  const [scheduleDeleteTarget, setScheduleDeleteTarget] = useState<Schedule | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Schedule | null>(null);
  const [completeDate, setCompleteDate] = useState('');
  const [completeNote, setCompleteNote] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userEditor, setUserEditor] = useState(false);
  const [userEditTarget, setUserEditTarget] = useState<UserRecord | null>(null);
  const [userDeleteTarget, setUserDeleteTarget] = useState<UserRecord | null>(null);
  const [scheduleEditor, setScheduleEditor] = useState(false);
  const [scheduleEditId, setScheduleEditId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(() => window.location.pathname || '/');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('hrga-sidebar') === 'collapsed');
  const activePath = activePage.split('?')[0];
  const page = activePath === '/' ? 'overview' : activePath.slice(1);
  const today = localDateString();

  const [logFilters, setLogFilters] = useState<{ user?: string; action?: string; entity?: string; from?: string; to?: string }>({});
  async function refresh(activityPage = 1, resources: { assets?: boolean; schedules?: boolean; logs?: boolean; users?: boolean } = { assets: true, schedules: true, logs: user?.role === 'superadmin' }, logQuery?: { user?: string; action?: string; entity?: string; from?: string; to?: string }) {
    setLoading(true);
    try {
      const [nextAssets, nextSchedules, nextLogs, nextUsers] = await Promise.all([
        resources.assets ? api.assets() : Promise.resolve(null),
        resources.schedules ? api.schedules() : Promise.resolve(null),
        resources.logs ? api.activityLogs(activityPage, 10, logQuery ?? logFilters) : Promise.resolve(null),
        resources.users ? api.users() : Promise.resolve(null),
      ]);
      if (nextAssets) setAssets(nextAssets);
      if (nextSchedules) setSchedules(nextSchedules);
      if (nextLogs) { setActivityLogs(nextLogs.items); setActivityLogTotal(nextLogs.total); }
      if (nextUsers) setUsers(nextUsers);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Data gagal dimuat.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { if (activePath === '/users') void refresh(1, { users: true }); }, [activePage]);
  useEffect(() => {
    if (!toast && !error) return;
    const timer = window.setTimeout(() => { setToast(''); setError(''); }, 3500);
    return () => window.clearTimeout(timer);
  }, [toast, error]);
  useEffect(() => {
    const handlePopState = () => setActivePage(window.location.pathname + window.location.search || '/');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const totalCompleted = schedules.filter((item) => item.complete).length;
  const totalOverdue = schedules.filter((item) => scheduleStatus(item, today) === 'Overdue').length;
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  async function saveAsset(event: FormEvent, value = assetForm) { event.preventDefault(); try { await api.createAsset(value); setAssetForm(emptyAsset); setAssetEditor(null); await refresh(1, { assets: true, logs: true }); setToast('Aset berhasil ditambahkan.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Aset gagal disimpan.'); } }
  async function importAssets(data: Omit<Asset, 'id'>[]) { if (!data.length) { setError('CSV tidak memiliki data aset yang valid.'); return; } try { await api.importAssets(data); await refresh(1, { assets: true, logs: true }); setToast(`${data.length} aset berhasil diimport.`); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Import aset gagal.'); } }
  async function saveSchedule(event: FormEvent) { event.preventDefault(); const editing = Boolean(scheduleEditId); const duplicate = schedules.find((x) => x.id !== scheduleEditId && !x.complete && x.assetId === scheduleForm.assetId); if (duplicate) { setError(`Aset ini masih punya 1 jadwal aktif (${duplicate.code} — ${duplicate.activity}). Selesaikan dulu sebelum menambah jadwal baru.`); return; } try { const payload = { ...scheduleForm, finished: scheduleForm.complete ? scheduleForm.finished || today : null }; if (scheduleEditId) await api.updateSchedule(scheduleEditId, payload); else await api.createSchedule(payload); setScheduleForm(emptySchedule); setScheduleEditId(null); await refresh(1, { schedules: true, logs: true }); setToast(editing ? 'Jadwal berhasil diperbarui.' : 'Jadwal berhasil ditambahkan.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Jadwal gagal disimpan.'); } }
  function editSchedule(item: Schedule) { setScheduleForm({ assetId: item.assetId, activity: item.activity, type: item.type, frequency: item.frequency, due: item.due.slice(0, 10), pic: item.pic, picEmail: item.picEmail, completionNote: item.completionNote, complete: item.complete, finished: item.finished?.slice(0, 10) || null }); setScheduleEditId(item.id); setScheduleEditor(true); }
  async function submitCompleteSchedule() { if (!completeTarget) return; try { await api.updateSchedule(completeTarget.id, { complete: true, finished: completeDate || today, completionNote: completeNote || null }); setCompleteTarget(null); await refresh(1, { schedules: true, logs: true }); setToast('Jadwal ditandai selesai.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Jadwal gagal diselesaikan.'); } }
  async function removeSchedule(schedule: Schedule) { try { await api.deleteSchedule(schedule.id); setScheduleDeleteTarget(null); await refresh(1, { schedules: true, logs: true }); setToast('Jadwal berhasil dihapus.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Jadwal gagal dihapus.'); } }
  async function removeAsset(asset: Asset) { try { await api.deleteAsset(asset.id); setAssetDeleteTarget(null); await refresh(1, { assets: true, logs: true }); setToast('Aset berhasil dihapus.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Aset gagal dihapus.'); } }
  async function saveEditedAsset(event: FormEvent) { event.preventDefault(); if (!assetEditor) return; if (!assetEditor.id) return saveAsset(event, assetEditor); try { const { id, ...data } = assetEditor; await api.updateAsset(id, data); setAssetEditor(null); await refresh(1, { assets: true, logs: true }); setToast('Aset berhasil diperbarui.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Aset gagal diperbarui.'); } }
  async function saveUser(event: FormEvent, values: { username: string; password: string; role: User['role']; email: string }) {
    event.preventDefault();
    try {
      if (userEditTarget) {
        const { password, ...data } = values;
        await api.updateUser(userEditTarget.id, password ? { ...data, password } : data);
        setToast('User berhasil diperbarui.');
      } else {
        await api.createUser(values);
        setToast('User berhasil ditambahkan.');
      }
      setUserEditor(false);
      setUserEditTarget(null);
      await refresh(1, { logs: true, users: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'User gagal disimpan.'); }
  }
  async function removeUser(target: UserRecord) {
    try {
      await api.deleteUser(target.id);
      setUserDeleteTarget(null);
      await refresh(1, { logs: true, users: true });
      setToast('User berhasil dihapus.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'User gagal dihapus.'); }
  }
  function exportCsv() {
    downloadCsv('hrga-maintenance-schedule.csv', [['Kode', 'Aset', 'Aktivitas', 'Due Date', 'PIC', 'Status'], ...schedules.map((item) => [item.code, item.machine, item.activity, item.due.slice(0, 10), item.pic, scheduleStatus(item, today)])]);
  }
  function exportHistory() { downloadCsv('maintenance-history.csv', [['Kode', 'Aset', 'Aktivitas', 'Due Date', 'Selesai', 'PIC', 'Catatan'], ...schedules.filter((x) => x.complete).map((x) => [x.code, x.machine, x.activity, x.due.slice(0, 10), x.finished?.slice(0, 10) || '', x.pic, x.completionNote || ''])]); }
  function exportReport() { downloadCsv('maintenance-report.csv', [['Kode', 'Aset', 'Aktivitas', 'Status'], ...schedules.map((x) => [x.code, x.machine, x.activity, scheduleStatus(x, today)])]); }
  function exportReportPng() { const colors: Record<string, string> = { Completed: '#21a874', Upcoming: '#d9a514', Pending: '#e5e7eb', Overdue: '#d71920' }; const order = ['Completed', 'Upcoming', 'Pending', 'Overdue']; const categories = [...new Set(assets.map((a) => a.category))]; const rowsByCategory = categories.map((category) => ({ category, rows: schedules.filter((x) => x.area === category) })); const maxTotal = Math.max(...rowsByCategory.map((r) => r.rows.length), 1); const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = Math.max(420, 200 + rowsByCategory.length * 44); const context = canvas.getContext('2d'); if (!context) return; context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.fillStyle = '#202126'; context.font = '24px Arial'; context.fillText('HRGA Maintenance Report', 40, 50); context.font = '15px Arial'; context.fillText(`Total: ${schedules.length} | Selesai: ${schedules.filter((x) => x.complete).length} | Overdue: ${schedules.filter((x) => scheduleStatus(x, today) === 'Overdue').length}`, 40, 85); let legendX = 40; for (const status of order) { context.fillStyle = colors[status]; context.fillRect(legendX, 105, 12, 12); context.fillStyle = '#62666f'; context.fillText(status, legendX + 18, 116); legendX += context.measureText(status).width + 46; } let y = 155; for (const row of rowsByCategory) { context.fillStyle = '#202126'; context.font = '13px Arial'; context.fillText(row.category.slice(0, 24), 40, y + 22); let x = 200; for (const status of order) { const count = row.rows.filter((item) => scheduleStatus(item, today) === status).length; const width = count / maxTotal * 620; if (count) { context.fillStyle = colors[status]; context.fillRect(x, y + 8, Math.max(width, 2), 24); x += width; } } context.fillStyle = '#202126'; context.fillText(String(row.rows.length), 845, y + 26); y += 44; } const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = 'maintenance-report.png'; link.click(); }
  function exportAssets() { downloadCsv('assets.csv', [['Kode Aset', 'Nama Aset', 'Kategori', 'Entitas', 'Area', 'Lokasi', 'Kondisi'], ...assets.map((x) => [x.code, x.name, x.category, x.company, x.area, x.location, x.condition])]); }
  function downloadAssetTemplate() { downloadCsv('template-assets.csv', [['Kode Aset', 'Nama Aset', 'Kategori', 'Entitas Perusahaan', 'Area', 'Lokasi Detail', 'Merek', 'Model / Tipe', 'Serial Number / Plat', 'Tahun Perolehan', 'Penanggung Jawab', 'Kondisi', 'Catatan']]); }

  const navItems = [['Overview Dashboard', '/'], ['Master Asset', '/assets'], ['Maintenance Calendar', '/calendar'], ['Master Schedule', '/schedule'], ['Reminder Center', '/reminders'], ['Maintenance History', '/history'], ['Grafik & Reports', '/reports'], ...(user.role === 'superadmin' ? [['User Management', '/users'], ['Activity Logs', '/activity-logs']] : [])] as const;
  function navigate(path: string) { window.history.pushState({}, '', path); setActivePage(path); setMobileNavOpen(false); }
  function toggleSidebar() {
    setSidebarCollapsed((value) => {
      localStorage.setItem('hrga-sidebar', value ? 'expanded' : 'collapsed');
      return !value;
    });
  }
  const navIcons: Record<string, typeof LayoutDashboard> = { '/': LayoutDashboard, '/assets': Package, '/calendar': CalendarDays, '/schedule': ClipboardList, '/reminders': BellRing, '/history': HistoryIcon, '/reports': BarChart3, '/users': Users, '/activity-logs': ScrollText };
  return <div className="shell"><aside className={(sidebarCollapsed ? 'sidebar collapsed' : 'sidebar') + (mobileNavOpen ? ' open' : '')}><div className="brand-side"><div className="brand-mark"><img src="/assets/images/kbb-symbol.png" alt="" /></div><div className="brand-copy"><strong>HRGA SYSTEM</strong><span>Maintenance Management</span></div><button className="sidebar-toggle" aria-label={sidebarCollapsed ? 'Perlebar sidebar' : 'Perkecil sidebar'} title={sidebarCollapsed ? 'Perlebar sidebar' : 'Perkecil sidebar'} onClick={toggleSidebar}>{sidebarCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}</button></div><div className="sidebar-label">WORKSPACE / HRGA</div><nav className="nav">{navItems.map(([item, path]) => { const Icon = navIcons[path]; return <a className={activePath === path ? 'active' : ''} href={path} title={item} onClick={(event) => { event.preventDefault(); navigate(path); }} key={item}><Icon size={15} className="nav-icon" /><span className="nav-text">{item}</span></a>; })}</nav><div className="sidebar-footer"><span className="footer-line" /><div className="sidebar-account"><strong>{user.username}</strong><small>{user.role}</small></div><button className="sidebar-logout" onClick={onLogout}><LogOut size={14} /><span className="nav-text">Logout</span></button><strong>KARYA BAHANA BERLIAN</strong><small>Internal management dashboard</small></div></aside>
    {mobileNavOpen && <div className="mobile-backdrop" onClick={() => setMobileNavOpen(false)} />}
    <main id="overview"><div className="corporate-topbar"><button type="button" className="mobile-nav-toggle" aria-label="Buka menu navigasi" onClick={() => setMobileNavOpen(true)}><MenuIcon size={22} /></button><div className="corporate-brand"><img src="/assets/images/logo-kbb.jpg" alt="Karya Bahana Berlian" /></div><div className="header-actions"><NotificationBell /></div></div><Toast message={error} variant="error" onClose={() => setError('')} /><Toast message={toast} onClose={() => setToast('')} />
      {page === 'overview' && <OverviewMetrics assets={assets} schedules={schedules} loading={loading} today={today} onNavigate={navigate} />}
      {page === 'calendar' && <Calendar schedules={schedules} month={calendarMonth} today={today} selectedDate={selectedDate} onSelectDate={setSelectedDate} onPrevious={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} onNext={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} onAddDate={(date) => { setSelectedDate(''); setScheduleForm({ ...emptySchedule, due: date }); setScheduleEditId(null); setScheduleEditor(true); }} />}
      <div className="grid">{userEditor && <UserForm user={userEditTarget} onSubmit={saveUser} onCancel={() => { setUserEditor(false); setUserEditTarget(null); }} />}{assetEditor && <AssetForm title={assetEditor.id ? 'Edit Aset' : 'Tambah Aset'} value={assetEditor} onChange={(value) => setAssetEditor({ ...assetEditor, ...value })} onSubmit={saveEditedAsset} onCancel={() => setAssetEditor(null)} />}{scheduleEditor && <ScheduleForm title={scheduleEditId ? 'Edit Jadwal' : 'Tambah Jadwal'} assets={assets} value={scheduleForm} onChange={setScheduleForm} onSubmit={(event) => { void saveSchedule(event).then(() => setScheduleEditor(false)); }} onCancel={() => { setScheduleEditId(null); setScheduleEditor(false); }} />}{assetDeleteTarget && <div className="modalback show" role="dialog" aria-modal="true" aria-labelledby="delete-asset-title"><div className="modal delete-modal"><div className="modal-title-row"><div className="delete-heading"><div className="delete-icon"><AlertTriangle size={17} /></div><div><span className="section-eyebrow">MASTER ASSET / KONFIRMASI</span><h2 id="delete-asset-title">Hapus aset?</h2></div></div><button aria-label="Tutup konfirmasi" className="secondary" type="button" onClick={() => setAssetDeleteTarget(null)}><X size={16} /></button></div><div className="delete-target"><strong>{assetDeleteTarget.code} — {assetDeleteTarget.name}</strong><small>{[assetDeleteTarget.category, assetDeleteTarget.area].filter(Boolean).join(' · ') || assetDeleteTarget.company}</small></div><p>Tindakan ini tidak dapat dibatalkan.</p><div className="modalfooter"><button type="button" className="secondary" onClick={() => setAssetDeleteTarget(null)}>Batal</button><button type="button" className="danger" onClick={() => void removeAsset(assetDeleteTarget)}>Hapus Aset</button></div></div></div>}{scheduleDeleteTarget && <div className="modalback show" role="dialog" aria-modal="true" aria-labelledby="delete-schedule-title"><div className="modal delete-modal"><div className="modal-title-row"><div className="delete-heading"><div className="delete-icon"><AlertTriangle size={17} /></div><div><span className="section-eyebrow">MASTER SCHEDULE / KONFIRMASI</span><h2 id="delete-schedule-title">Hapus jadwal?</h2></div></div><button aria-label="Tutup konfirmasi" className="secondary" type="button" onClick={() => setScheduleDeleteTarget(null)}><X size={16} /></button></div><div className="delete-target"><strong>{scheduleDeleteTarget.code} — {scheduleDeleteTarget.activity}</strong><small>{[scheduleDeleteTarget.machine, scheduleDeleteTarget.due.slice(0, 10)].join(' · ')}</small></div><p>Tindakan ini tidak dapat dibatalkan.</p><div className="modalfooter"><button type="button" className="secondary" onClick={() => setScheduleDeleteTarget(null)}>Batal</button><button type="button" className="danger" onClick={() => void removeSchedule(scheduleDeleteTarget)}>Hapus Jadwal</button></div></div></div>}{completeTarget && <div className="modalback show" role="dialog" aria-modal="true" aria-labelledby="complete-title"><div className="modal"><div className="delete-heading"><div className="delete-icon" style={{ background: '#e6f4ee', color: '#21a874' }}><CheckIcon size={17} /></div><div><span className="section-eyebrow">MASTER SCHEDULE / SELESAIKAN</span><h2 id="complete-title">Tandai selesai?</h2></div></div><p style={{ margin: '0 0 14px 0', fontSize: 13, color: '#71757d' }}><strong>{completeTarget.code}</strong> — {completeTarget.activity}</p><label className="field">Tanggal selesai<input type="date" value={completeDate} onChange={(e) => setCompleteDate(e.target.value)} /></label><label className="field">Catatan hasil (opsional)<textarea rows={3} placeholder="Apa yang dikerjakan, temuan, kondisi..." value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} /></label><div className="modalfooter"><button type="button" className="secondary" onClick={() => setCompleteTarget(null)}>Batal</button><button type="button" onClick={() => void submitCompleteSchedule()}>Tandai Selesai</button></div></div></div>}{userDeleteTarget && <div className="modalback show" role="dialog" aria-modal="true" aria-labelledby="delete-user-title"><div className="modal delete-modal"><div className="modal-title-row"><div className="delete-heading"><div className="delete-icon"><AlertTriangle size={17} /></div><div><span className="section-eyebrow">HRGA TEAM / KONFIRMASI</span><h2 id="delete-user-title">Hapus user?</h2></div></div><button aria-label="Tutup konfirmasi" className="secondary" type="button" onClick={() => setUserDeleteTarget(null)}><X size={16} /></button></div><div className="delete-target"><strong>{userDeleteTarget.username}</strong><small>{userDeleteTarget.role === 'superadmin' ? 'Superadmin' : 'Admin'}</small></div><p>Tindakan ini tidak dapat dibatalkan.</p><div className="modalfooter"><button type="button" className="secondary" onClick={() => setUserDeleteTarget(null)}>Batal</button><button type="button" className="danger" onClick={() => void removeUser(userDeleteTarget)}>Hapus User</button></div></div></div>}</div>{activePath === '/assets' && <AssetTable assets={assets} schedules={schedules} onEdit={setAssetEditor} onDelete={setAssetDeleteTarget} onAdd={() => setAssetEditor({ id: '', ...emptyAsset })} onExport={exportAssets} onTemplate={downloadAssetTemplate}       onImport={importAssets} />}{activePath === '/schedule' && <ScheduleTable key={activePage} schedules={schedules} today={today} loading={loading} onEdit={editSchedule} onDelete={(id) => setScheduleDeleteTarget(schedules.find((schedule) => schedule.id === id) || null)} onAdd={() => { setScheduleForm(emptySchedule); setScheduleEditId(null); setScheduleEditor(true); }} onComplete={(item) => { setCompleteTarget(item); setCompleteDate(today); setCompleteNote(''); }} />}{activePath === '/reminders' && <Reminders schedules={schedules} today={today} onToast={setToast} onError={setError} />}{activePath === '/history' && <History schedules={schedules} onExport={exportHistory} onEdit={editSchedule} onDelete={(id) => setScheduleDeleteTarget(schedules.find((schedule) => schedule.id === id) || null)} />            }{activePath === '/reports' && <Reports assets={assets} schedules={schedules} onCsv={exportReport} onPrint={() => window.print()} onPng={exportReportPng} />}            {activePath === '/users' && user.role === 'superadmin' && <UserTable users={users} loading={loading} onAdd={() => { setError(''); setUserEditTarget(null); setUserEditor(true); }} onEdit={(item) => { setError(''); setUserEditTarget(item); setUserEditor(true); }} onDelete={(item) => { setError(''); setUserDeleteTarget(item); }} />}{activePath === '/activity-logs' && user.role === 'superadmin' && <ActivityLogs logs={activityLogs} total={activityLogTotal} loading={loading} onPageChange={(pageNumber) => void refresh(pageNumber, { logs: true })} onRefresh={() => void refresh(1, { logs: true })} onFilter={(filters) => { setLogFilters(filters); void refresh(1, { logs: true }, filters); }} />}
    </main></div>;
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  useEffect(() => { api.me().then((result) => setUser(result.user)).catch(() => undefined).finally(() => setAuthLoading(false)); }, []);
  if (authLoading) return <main className="auth-loading" aria-live="polite"><div className="loading-content"><span className="loading-spinner" aria-hidden="true" /><strong>Memuat aplikasi</strong><span>Mohon tunggu sebentar...</span></div></main>;
  if (!user) return <Login onLogin={(loggedIn) => { setJustLoggedIn(true); setUser(loggedIn); }} />;
  const validRoutes = ['/', '/assets', '/calendar', '/schedule', '/reminders', '/history', '/reports', ...(user.role === 'superadmin' ? ['/users', '/activity-logs'] : [])];
  if (!validRoutes.includes(window.location.pathname)) return <NotFound onHome={() => { window.history.pushState({}, '', '/'); window.location.reload(); }} />;
  return <Dashboard user={user} initialToast={justLoggedIn ? `Selamat datang kembali, ${user.username}!` : undefined} onLogout={() => { void api.logout().finally(() => setUser(null)); }} />;
}

function NotFound({ onHome }: { onHome: () => void }) {
  return <main className="not-found"><div className="not-found-card"><span className="section-eyebrow">ERROR / 404</span><strong>Halaman tidak ditemukan</strong><p>Alamat yang Anda buka tidak tersedia.</p><button onClick={onHome}>Kembali ke Dashboard</button></div></main>;
}
