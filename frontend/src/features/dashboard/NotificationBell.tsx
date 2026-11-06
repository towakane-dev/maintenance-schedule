import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { Notification, api } from '../../shared/api';

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
}

function dayLabel(value: string) {
  const day = new Date(value).toDateString();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (day === today) return 'Hari ini';
  if (day === yesterday) return 'Kemarin';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(value));
}

const typeDot: Record<string, string> = { OVERDUE: 'dot-red', DUE_1: 'dot-orange', DUE_3: 'dot-yellow' };
const typeLabel: Record<string, string> = { OVERDUE: 'Overdue', DUE_1: 'Besok', DUE_3: 'H-3' };

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    void api.notifications().then((items) => { if (active) setNotifications(items); }).catch(() => undefined);
    const stream = new EventSource('/api/notifications/stream', { withCredentials: true });
    const handler = (event: MessageEvent<string>) => {
      const item = JSON.parse(event.data) as Notification;
      setNotifications((current) => [item, ...current.filter((existing) => existing.id !== item.id)]);
    };
    stream.addEventListener('notification', handler);
    return () => { active = false; stream.removeEventListener('notification', handler); stream.close(); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => { if (!wrapRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown); };
  }, [open]);
  const unread = notifications.filter((item) => !item.isRead).length;
  const grouped: { label: string; items: Notification[] }[] = [];
  for (const item of notifications) {
    const label = dayLabel(item.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.label === label) last.items.push(item);
    else grouped.push({ label, items: [item] });
  }
  async function markRead(item: Notification) {
    if (item.isRead) return;
    await api.markNotificationRead(item.id);
    setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
  }
  async function markAllRead() {
    if (!unread) return;
    await api.markAllNotificationsRead();
    setNotifications((current) => current.map((entry) => ({ ...entry, isRead: true })));
  }
  function openTarget(item: Notification) {
    void markRead(item);
    const code = item.schedule?.code;
    window.history.pushState({}, '', code ? `/schedule?search=${encodeURIComponent(code)}` : '/schedule');
    window.dispatchEvent(new PopStateEvent('popstate'));
    setOpen(false);
  }
  return <div className="notification-wrap" ref={wrapRef}><button className="notification-button" aria-label="Notifikasi" aria-expanded={open} onClick={() => setOpen(!open)}><Bell size={17} />{unread > 0 && <span>{unread > 9 ? '9+' : unread}</span>}</button>{open && <div className="notification-panel"><div className="notification-panel-head"><strong>Notifikasi{unread > 0 ? ` · ${unread} baru` : ''}</strong><div className="notification-head-actions">{unread > 0 && <button className="notification-markall" onClick={() => void markAllRead()}><CheckCheck size={14} /> Tandai dibaca</button>}<button className="notification-close" aria-label="Tutup notifikasi" onClick={() => setOpen(false)}><X size={15} /></button></div></div>{notifications.length ? <div className="notification-list">{grouped.map((group) => <div key={group.label}>{group.items.length > 1 && <div className="notification-day">{group.label}</div>}{group.items.map((item) => <button className={`notification-item ${item.isRead ? '' : 'unread'}`} key={item.id} onClick={() => openTarget(item)}><span className={`notification-dot ${typeDot[item.type] ?? 'dot-grey'}${item.isRead ? ' read' : ''}`} aria-hidden="true" /><div className="notification-body"><div className="notification-item-top"><strong>{item.title}</strong>{typeLabel[item.type] && <span className={`pill ${item.type === 'OVERDUE' ? 'overdue' : item.type === 'DUE_1' ? 'upcoming' : 'pending'}`}>{typeLabel[item.type]}</span>}</div><p>{item.message}</p><small>{relativeTime(item.createdAt)}</small></div></button>)}</div>)}</div> : <p className="notification-empty">Belum ada notifikasi.</p>}</div>}</div>;
}
