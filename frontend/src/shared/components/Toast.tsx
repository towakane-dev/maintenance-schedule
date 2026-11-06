import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export function Toast({ message, variant = 'success', onClose }: { message: string; variant?: 'success' | 'error'; onClose: () => void }) {
  if (!message) return null;
  const Icon = variant === 'error' ? AlertCircle : CheckCircle2;
  return <div className={variant === 'error' ? 'toast error' : 'toast'} role={variant === 'error' ? 'alert' : 'status'}><Icon size={18} /><span>{message}</span><button className="toast-close" aria-label="Tutup notifikasi" onClick={onClose}><X size={15} /></button></div>;
}
