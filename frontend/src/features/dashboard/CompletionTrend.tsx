import { Schedule } from '../../shared/api';

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function CompletionTrend({ schedules }: { schedules: Schedule[] }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: MONTHS_ID[date.getMonth()], count: 0 };
  });
  for (const item of schedules) {
    if (!item.complete || !item.finished) continue;
    const bucket = months.find((month) => month.key === item.finished!.slice(0, 7));
    if (bucket) bucket.count += 1;
  }
  const max = Math.max(...months.map((month) => month.count), 1);
  const total = months.reduce((sum, month) => sum + month.count, 0);
  return <section className="panel trend-panel"><div className="insight-heading"><div><span className="section-eyebrow">TREN / 6 BULAN TERAKHIR</span><h2>Tren Penyelesaian</h2></div><strong>{total}</strong></div><p className="insight-description">Jumlah jadwal yang diselesaikan per bulan.</p><div className="trend-chart">{months.map((month) => <div className="trend-col" key={month.key}><b>{month.count}</b><div className="trend-bar"><i style={{ height: `${month.count ? Math.round(month.count / max * 100) : 0}%` }} /></div><span>{month.label}</span></div>)}</div></section>;
}
