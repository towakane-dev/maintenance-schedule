import { FormEvent, useEffect, useState } from 'react';
import { api, User } from '../../shared/api';
import { Toast } from '../../shared/components/Toast';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setToast(''); setSubmitting(true);
    try {
      const result = await api.login({ username, password });
      onLogin(result.user);
    } catch (reason) { setToast(reason instanceof Error ? reason.message : 'Permintaan gagal.'); setSubmitting(false); }
  }
  return <main className="login-screen"><div className="login-layout">
    <section className="login-intro"><div className="login-brand"><span className="login-brand-mark"><img src="/assets/images/kbb-symbol.png" alt="" /></span><span><strong>HRGA SYSTEM</strong><small>Maintenance Management</small></span></div><div className="login-intro-copy"><span className="section-eyebrow">KARYA BAHANA BERLIAN</span><h1>Maintenance yang lebih teratur, terukur, dan terkendali.</h1><p>Kelola aset, jadwal maintenance, reminder, dan laporan dalam satu workspace.</p></div><div className="login-trust"><ShieldCheck size={16} /><span>Workspace internal untuk tim HRGA</span></div></section>
    <form className="login-card" onSubmit={submit}><div className="login-card-heading"><span className="section-eyebrow">WELCOME BACK</span><h2>Masuk ke dashboard</h2><p>Gunakan akun HRGA kamu untuk melanjutkan.</p></div>
      <div className="login-fields"><label className="field">Username<input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} autoComplete="username" placeholder="Masukkan username" required /></label><label className="field">Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="current-password" placeholder="Masukkan password" required /><button type="button" className="password-toggle" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label></div>
      <Toast message={toast} variant="error" onClose={() => setToast('')} /><button className="login-submit" type="submit" disabled={submitting}>{submitting ? 'Memproses...' : <>Masuk ke Dashboard <ArrowRight size={15} /></>}</button>
      <small className="login-footer">© Karya Bahana Berlian · Internal HRGA System</small>
    </form>
  </div></main>;
}
