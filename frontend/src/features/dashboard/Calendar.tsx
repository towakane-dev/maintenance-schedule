import { Schedule } from '../../shared/api';
import { scheduleStatus } from '../schedules/status';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export function Calendar({ schedules, month, today, selectedDate, onSelectDate, onPrevious, onNext }: { schedules: Schedule[]; month: Date; today: string; selectedDate: string; onSelectDate: (date: string) => void; onPrevious: () => void; onNext: () => void }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const title = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(month);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1;
    if (day < 1 || day > days) return <div className="day muted" key={index} />;
    const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const daySchedules = schedules.filter((item) => item.due.slice(0, 10) === date);
    return <button className={`day ${date === today ? 'today' : ''} ${selectedDate === date ? 'active' : ''}`} key={date} onClick={() => onSelectDate(date)} title={daySchedules.length ? `${daySchedules.length} jadwal` : 'Tidak ada maintenance'}>
      {day}{daySchedules.length > 0 && <em>● {daySchedules.length} jadwal</em>}
    </button>;
  });
  const selectedSchedules = schedules.filter((item) => item.due.slice(0, 10) === selectedDate);
  const selectedTitle = selectedDate ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date(`${selectedDate}T12:00:00`)) : '';
  return <section className="panel" id="calendar"><div className="calhead"><h2>Maintenance Calendar</h2><div className="actions"><button className="secondary icon-action" aria-label="Bulan sebelumnya" type="button" onClick={onPrevious}><ChevronLeft size={16} /></button><strong>{title}</strong><button className="secondary icon-action" aria-label="Bulan berikutnya" type="button" onClick={onNext}><ChevronRight size={16} /></button></div></div><div className="calgrid">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => <div className="weekday" key={day}>{day}</div>)}{cells}</div><p className="hint">Klik tanggal untuk melihat detail maintenance pada tanggal tersebut.</p>{selectedDate && <div className="modalback show" role="dialog" aria-modal="true" aria-labelledby="calendar-detail-title" onClick={(event) => { if (event.target === event.currentTarget) onSelectDate(''); }}><div className="modal calendar-detail-modal"><div className="modal-title-row"><div><span className="section-eyebrow">MAINTENANCE CALENDAR / DETAIL</span><h2 id="calendar-detail-title">{selectedTitle}</h2></div><button aria-label="Tutup detail tanggal" className="secondary" type="button" onClick={() => onSelectDate('')}><X size={16} /></button></div>{selectedSchedules.length ? <div className="calendar-detail-list">{selectedSchedules.map((item) => <div className="calendar-detail-item" key={item.id}><div><strong>{item.code} — {item.machine}</strong><span>{item.activity}</span></div><div><span>{item.area}</span><b>{item.pic}</b></div></div>)}</div> : <p className="empty">Tidak ada maintenance pada tanggal ini.</p>}</div></div>}</section>;
}
