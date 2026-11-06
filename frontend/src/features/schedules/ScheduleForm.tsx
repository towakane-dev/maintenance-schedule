import { FormEvent, useMemo, useState } from 'react';
import { Asset } from '../../shared/api';

export type ScheduleFormValue = { assetId: string; activity: string; type: string; frequency: string; due: string; pic: string; complete: boolean; finished: string | null };
export const emptySchedule: ScheduleFormValue = { assetId: '', activity: '', type: 'Preventive', frequency: 'Bulanan', due: '', pic: '', complete: false, finished: null };

export function ScheduleForm({ assets, value, onChange, onSubmit, onCancel, title = 'Tambah Jadwal' }: { assets: Asset[]; value: ScheduleFormValue; onChange: (value: ScheduleFormValue) => void; onSubmit: (event: FormEvent) => void; onCancel?: () => void; title?: string }) {
  const selectedAsset = assets.find((asset) => asset.id === value.assetId);
  const [assetQuery, setAssetQuery] = useState(selectedAsset ? `${selectedAsset.code} — ${selectedAsset.name}` : '');
  const filteredAssets = useMemo(() => assets.filter((asset) => `${asset.code} ${asset.name} ${asset.category} ${asset.area}`.toLowerCase().includes(assetQuery.toLowerCase())).slice(0, 8), [assets, assetQuery]);
  return <div className="modalback show"><div className="modal"><h2>{title}</h2><form onSubmit={onSubmit}><div className="formgrid">
    <label className="field asset-select-field">Cari dan pilih aset *<input value={assetQuery} placeholder="Cari kode, nama, kategori, atau area..." onChange={(e) => { setAssetQuery(e.target.value); onChange({ ...value, assetId: '' }); }} required={!value.assetId} /></label>
    {assetQuery && !value.assetId && <div className="asset-search-results">{filteredAssets.length ? filteredAssets.map((asset) => <button type="button" className="asset-search-result" key={asset.id} onClick={() => { onChange({ ...value, assetId: asset.id }); setAssetQuery(`${asset.code} — ${asset.name}`); }}><strong>{asset.code}</strong><span>{asset.name} · {asset.category}</span></button>) : <p className="asset-search-empty">Aset tidak ditemukan.</p>}</div>}
    {selectedAsset && <div className="selected-asset"><span>Aset terpilih</span><strong>{selectedAsset.code} — {selectedAsset.name}</strong><button type="button" className="link-button" onClick={() => { onChange({ ...value, assetId: '' }); setAssetQuery(''); }}>Ganti</button></div>}
    <label className="field">Aktivitas<input placeholder="Lubrikasi & inspeksi" value={value.activity} onChange={(e) => onChange({ ...value, activity: e.target.value })} required /></label>
    <label className="field">Jenis Maintenance<select value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value })}><option>Preventive</option><option>Corrective</option></select></label>
    <label className="field">Frekuensi<select value={value.frequency} onChange={(e) => onChange({ ...value, frequency: e.target.value })}><option>Insidental</option><option>Harian</option><option>Mingguan</option><option>Bulanan</option><option>3 Bulanan</option><option>6 Bulanan</option><option>Tahunan</option></select></label>
    <label className="field">Due Date<input type="date" value={value.due} onChange={(e) => onChange({ ...value, due: e.target.value })} required /></label>
    <label className="field">PIC<input placeholder="Teknisi A" value={value.pic} onChange={(e) => onChange({ ...value, pic: e.target.value })} required /></label>
    <label className="field">Status<select value={value.complete ? 'true' : 'false'} onChange={(e) => onChange({ ...value, complete: e.target.value === 'true' })}><option value="false">Belum selesai</option><option value="true">Completed</option></select></label>
    <label className="field">Tanggal selesai<input type="date" value={value.finished || ''} onChange={(e) => onChange({ ...value, finished: e.target.value || null })} /></label>
    </div><div className="modalfooter"><button type="button" className="secondary" onClick={onCancel}>Batal</button><button>{title.startsWith('Edit') ? 'Simpan Perubahan' : 'Simpan Jadwal'}</button></div>
  </form></div></div>;
}
