import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import { User, UserRecord } from '../../shared/api';

export type UserFormValue = { username: string; password: string; role: User['role']; email: string };

export function UserForm({ user, onSubmit, onCancel }: { user?: UserRecord | null; onSubmit: (event: FormEvent, values: UserFormValue) => void; onCancel: () => void }) {
  const editing = Boolean(user);
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>(user?.role ?? 'admin');
  return <div className="modalback show" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
    <div className="modal user-modal">
      <div className="modal-title-row"><div><span className="section-eyebrow">HRGA TEAM / USER ACCESS</span><h2 id="user-form-title">{editing ? 'Edit User' : 'Tambah User'}</h2></div><button aria-label="Tutup form user" className="secondary" type="button" onClick={onCancel}><X size={16} /></button></div>
      <p className="modal-description">{editing ? `Ubah data akun ${user?.username}. Biarkan password kosong jika tidak ingin menggantinya.` : 'Buat akun baru untuk anggota tim HRGA. User akan dapat login setelah akun dibuat.'}</p>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(event, { username, password, role, email }); }}>
        <div className="user-form-fields"><label className="field">Username<input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={50} autoComplete="off" required /></label><label className="field">Email (untuk reminder)<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={120} autoComplete="off" placeholder="nama@kbb.co.id" /></label><label className="field">Password{editing ? ' (opsional)' : ''}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={editing ? undefined : 8} maxLength={100} autoComplete="new-password" placeholder={editing ? 'Biarkan kosong untuk mempertahankan password' : ''} required={!editing} /></label><label className="field">Role<select value={role} onChange={(event) => setRole(event.target.value as User['role'])}><option value="admin">Admin</option><option value="superadmin">Superadmin</option></select></label></div>
        <p className="form-hint">{editing ? 'Isi kolom password hanya jika ingin mengganti password (minimal 8 karakter).' : 'Password minimal 8 karakter.'}</p>
        <div className="modalfooter"><button type="button" className="secondary" onClick={onCancel}>Batal</button><button type="submit">{editing ? 'Simpan Perubahan' : 'Buat User'}</button></div>
      </form>
    </div>
  </div>;
}
