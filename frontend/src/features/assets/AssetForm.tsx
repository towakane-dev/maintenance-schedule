import { FormEvent } from 'react';
import { Asset } from '../../shared/api';
import { X } from 'lucide-react';

export const categories = ['Fasilitas', 'Elektronik', 'Kendaraan', 'Gedung & Bangunan'];
export const emptyAsset: Omit<Asset, 'id'> = { code: '', name: '', category: categories[0], company: '', area: '', location: '', brand: '', model: '', serial: '', year: '', owner: '', condition: 'Baik', notes: '' };
type AssetFormValue = Omit<Asset, 'id'> & { id?: string };

export function AssetForm({ value, onChange, onSubmit, onCancel, title = 'Tambah Aset' }: { value: AssetFormValue; onChange: (value: AssetFormValue) => void; onSubmit: (event: FormEvent) => void; onCancel?: () => void; title?: string }) {
  return <div className="modalback show"><div className="modal asset-modal"><div className="modal-title-row"><div><span className="section-eyebrow">MASTER ASSET / HRGA</span><h2>{title}</h2></div><button aria-label="Tutup" className="secondary" type="button" onClick={onCancel}><X size={16} /></button></div><form onSubmit={onSubmit}><div className="formgrid">
    <label className="field">Kode Aset *<input value={value.code} onChange={(e) => onChange({ ...value, code: e.target.value.toUpperCase() })} required readOnly={Boolean(value.id)} /></label>
    <label className="field">Nama Aset *<input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} required /></label>
    <label className="field">Kategori *<select value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
    <label className="field">Entitas Perusahaan<input value={value.company} onChange={(e) => onChange({ ...value, company: e.target.value })} placeholder="PT Karya Bahana Berlian" /></label>
    <label className="field">Area / Departemen<input value={value.area} onChange={(e) => onChange({ ...value, area: e.target.value })} placeholder="Office / HRGA" /></label>
    <label className="field">Lokasi Detail<input value={value.location} onChange={(e) => onChange({ ...value, location: e.target.value })} /></label>
    <label className="field">Merek<input value={value.brand} onChange={(e) => onChange({ ...value, brand: e.target.value })} /></label>
    <label className="field">Model / Tipe<input value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} /></label>
    <label className="field">Serial Number / Plat<input value={value.serial} onChange={(e) => onChange({ ...value, serial: e.target.value })} /></label>
    <label className="field">Tahun Perolehan<input value={value.year} onChange={(e) => onChange({ ...value, year: e.target.value })} type="number" min="1900" max="2100" /></label>
    <label className="field">Penanggung Jawab<input value={value.owner} onChange={(e) => onChange({ ...value, owner: e.target.value })} /></label>
    <label className="field">Kondisi Aset<select value={value.condition} onChange={(e) => onChange({ ...value, condition: e.target.value })}><option>Baik</option><option>Perlu Perbaikan</option><option>Rusak</option><option>Belum Dicek</option><option>Tidak Aktif</option></select></label>
    <label className="field span-two">Catatan Aset<textarea value={value.notes} onChange={(e) => onChange({ ...value, notes: e.target.value })} rows={2} /></label>
    </div><p className="hint">* Wajib diisi. Informasi lain boleh dilengkapi secara bertahap.</p><div className="modalfooter"><button type="button" className="secondary" onClick={onCancel}>Batal</button><button>{title.startsWith('Edit') ? 'Simpan Perubahan' : 'Simpan Aset'}</button></div>
  </form></div></div>;
}
