import { Asset, Schedule } from '../../shared/api';
import { scheduleStatus } from '../schedules/status';
import { CompletionTrend } from './CompletionTrend';

function DashboardSkeleton() {
  const block = (width: string, height: number) => <span className="skel" style={{ width, height }} />;
  return <div aria-hidden="true">
    <section className="stats">{Array.from({ length: 6 }, (_, index) => <div className="skel-card" key={index}>{block('55%', 10)}{block('38%', 28)}{block('72%', 9)}</div>)}</section>
    <section className="dashboard-insights">{Array.from({ length: 2 }, (_, index) => <div className="skel-card panel-skel" key={index}>{block('40%', 11)}{block('70%', 9)}{block('100%', 12)}{block('92%', 12)}{block('85%', 12)}{block('96%', 12)}</div>)}</section>

  </div>;
}

export function OverviewMetrics({ assets, schedules, loading, today, onNavigate }: { assets: Asset[]; schedules: Schedule[]; loading: boolean; today: string; onNavigate: (path: string) => void }) {
  if (loading) return <DashboardSkeleton />;

  const completed = schedules.filter((item) => item.complete).length;
  const overdue = schedules.filter((item) => scheduleStatus(item, today) === 'Overdue').length;
  const dueToday = schedules.filter((item) => !item.complete && item.due.slice(0, 10) === today);
  const pending = schedules.filter((item) => scheduleStatus(item, today) === 'Pending').length;
  const attention = schedules.filter((item) => !item.complete && (scheduleStatus(item, today) === 'Overdue' || item.due.slice(0, 10) === today)).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  const conditionColors: Record<string, string> = { Baik: '#21a874', 'Perlu Perbaikan': '#b17d12', Rusak: '#d71920', 'Belum Dicek': '#9aa0a8', 'Tidak Aktif': '#c1c4cb' };
  const conditionSummary = ['Baik', 'Perlu Perbaikan', 'Rusak', 'Belum Dicek', 'Tidak Aktif'].map((condition) => ({ condition, count: assets.filter((item) => item.condition === condition).length })).filter((row) => row.count > 0);

  const statCards: { label: string; value: string | number; hint: string; to?: string; className?: string }[] = [
    { label: 'Total Asset', value: assets.length, hint: 'Aset dalam Master Asset', to: '/assets' },
    { label: 'Total Schedule', value: schedules.length, hint: 'Jadwal maintenance', to: '/schedule' },
    { label: 'Completed', value: completed, hint: 'Pekerjaan selesai', to: '/schedule?status=Completed', className: 'done' },
    { label: 'Pending', value: pending, hint: 'Belum masuk 7 hari', to: '/schedule?status=Pending' },
    { label: 'Overdue', value: overdue, hint: overdue ? 'Klik untuk lihat jadwal' : 'Lewat due date', to: '/schedule?status=Overdue', className: `over${overdue ? ' hot' : ' calm'}` },
    { label: 'Completion Rate', value: `${schedules.length ? Math.round(completed / schedules.length * 100) : 0}%`, hint: 'Rasio selesai' },
  ];

  return <>
    <section className="stats">
      {statCards.map((card) => {
        const content = <><span>{card.label}</span><b>{card.value}</b><small>{card.hint}</small></>;
        return card.to
          ? <button type="button" className={`stat clickable${card.className ? ` ${card.className}` : ''}`} onClick={() => onNavigate(card.to!)} key={card.label}>{content}</button>
          : <div className={`stat${card.className ? ` ${card.className}` : ''}`} key={card.label}>{content}</div>;
      })}
    </section>
    {!schedules.length && <div className="dashboard-empty">Belum ada jadwal maintenance. Tambahkan jadwal pertama dari halaman Master Schedule.</div>}
    {!!schedules.length && <section className="dashboard-insights">
      <div className="panel insight-panel"><div className="insight-heading"><div><span className="section-eyebrow">ACTION REQUIRED</span><h2>Perlu perhatian</h2></div><strong>{overdue + dueToday.length}</strong></div><p className="insight-description">Jadwal overdue dan jatuh tempo hari ini.</p>{attention.length ? <div className="insight-list">{attention.map((item) => <div className="insight-row" key={item.id}><div><strong>{item.code} — {item.machine}</strong><span>{item.activity}</span></div><div className="insight-meta"><small>{item.pic}</small><b className={scheduleStatus(item, today).toLowerCase()}>{scheduleStatus(item, today) === 'Overdue' ? `${Math.abs(Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${item.due.slice(0, 10)}T12:00:00`).getTime()) / 86400000))} hari terlambat` : 'Jatuh tempo hari ini'}</b></div></div>)}</div> : <div className="insight-empty">Tidak ada jadwal yang mendesak.</div>}</div>
      <div className="panel insight-panel"><div className="insight-heading"><div><span className="section-eyebrow">ASSET HEALTH</span><h2>Kondisi Aset</h2></div><strong>{assets.length}</strong></div><p className="insight-description">Kondisi semua aset di Master Asset.</p>{conditionSummary.length ? <div className="rank-list">{conditionSummary.map((item) => <div className="rank-row" key={item.condition}><div><strong>{item.condition}</strong><span>{Math.round(item.count / (assets.length || 1) * 100)}% dari aset</span></div><b>{item.count}</b><div className="rank-bar"><i className="workload" style={{ width: `${assets.length ? item.count / assets.length * 100 : 0}%`, background: conditionColors[item.condition] }} /></div></div>)}</div> : <div className="insight-empty">Belum ada data aset.</div>}</div>
    </section>}
    {!!schedules.length && <CompletionTrend schedules={schedules} />}
  </>;
}
