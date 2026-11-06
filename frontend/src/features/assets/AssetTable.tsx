import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { Download, Eye, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { Asset, Schedule } from '../../shared/api';
import { categories } from './AssetForm';
import { PAGE_SIZE, Pagination } from '../../shared/components/Pagination';

export function AssetTable({ assets, schedules, onDelete, onEdit, onAdd, onExport, onTemplate, onImport }: {
  assets: Asset[]; schedules: Schedule[]; onDelete: (asset: Asset) => void; onEdit: (asset: Asset) => void;
  onAdd: () => void; onExport: () => void; onTemplate: () => void; onImport: (assets: Omit<Asset, 'id'>[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('');
  const [completeness, setCompleteness] = useState('');
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [page, setPage] = useState(1);
  const fileInput = useRef<HTMLInputElement>(null);
  const companies = useMemo(() => [...new Set(assets.map((asset) => asset.company).filter(Boolean))].sort(), [assets]);
  const complete = (asset: Asset) => [asset.code, asset.name, asset.category, asset.company, asset.area, asset.location, asset.condition].every(Boolean);
  const visible = assets.filter((asset) => {
    const text = [asset.code, asset.name, asset.category, asset.company, asset.area, asset.location, asset.brand, asset.model, asset.serial].join(' ').toLowerCase();
    return text.includes(search.toLowerCase()) && (!company || asset.company === company) && (!category || asset.category === category) && (!completeness || (completeness === 'Lengkap' ? complete(asset) : !complete(asset)));
  }).sort((a, b) => a.code.localeCompare(b.code));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  function parseCsv(text: string) {
    const rows = text.split(/\r?\n/).filter(Boolean).map((line) => line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map((value) => value.replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || []);
    const headers = rows.shift()?.map((header) => header.toLowerCase()) || [];
    const aliases: Record<string, keyof Omit<Asset, 'id'>> = { 'kode aset': 'code', kode: 'code', 'nama aset': 'name', nama: 'name', kategori: 'category', 'entitas perusahaan': 'company', entitas: 'company', 'area / departemen': 'area', area: 'area', 'lokasi detail': 'location', lokasi: 'location', merek: 'brand', 'model / tipe': 'model', model: 'model', 'serial number / plat': 'serial', serial: 'serial', 'tahun perolehan': 'year', tahun: 'year', 'penanggung jawab': 'owner', kondisi: 'condition', 'catatan aset': 'notes', catatan: 'notes' };
    return rows.map((row) => {
      const asset = { ...({ company: '', area: '', location: '', brand: '', model: '', serial: '', year: '', owner: '', condition: 'Belum Dicek', notes: '' } as Omit<Asset, 'id'>) };
      headers.forEach((header, index) => { const key = aliases[header]; if (key) asset[key] = row[index] || asset[key]; });
      return asset;
    }).filter((asset) => asset.code && asset.name && asset.category);
  }
  function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void file.text().then((text) => onImport(parseCsv(text)));
    event.target.value = '';
  }
  return <section className="panel" id="assets">
    <div className="reporttop"><div><span className="section-eyebrow">REGISTRY / INVENTARISASI HRGA</span><h2>Master Asset</h2><p>Daftarkan aset sekali, lalu pilih dari daftar saat membuat maintenance schedule. Aset yang sudah digunakan tidak bisa dihapus agar riwayat tetap terjaga.</p></div>
      <div className="actions asset-actions"><button className="secondary" onClick={onTemplate}><Download size={15} /> Template CSV</button><button className="secondary" onClick={onExport}><Download size={15} /> Export Aset CSV</button><button className="secondary" onClick={() => fileInput.current?.click()}><Upload size={15} /> Import CSV</button><input ref={fileInput} className="hidden-file-input" type="file" accept=".csv,text/csv" onChange={importFile} /><button onClick={onAdd}><Plus size={15} /> Tambah Aset</button></div>
    </div>
    <div className="asset-overview"><div><span>Jumlah Aset</span><strong>{assets.length}</strong></div><div><span>Data Lengkap</span><strong>{assets.filter(complete).length}</strong></div><div><span>Perlu Dilengkapi</span><strong>{assets.filter((asset) => !complete(asset)).length}</strong></div><div><span>Aset Aktif</span><strong>{assets.filter((asset) => asset.condition !== 'Tidak Aktif').length}</strong></div></div>
    <div className="asset-filters"><label>Cari aset<input placeholder="Kode, nama, merek, lokasi..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><label>Entitas Perusahaan<select value={company} onChange={(event) => setCompany(event.target.value)}><option value="">Semua Entitas</option>{companies.map((item) => <option key={item}>{item}</option>)}</select></label><label>Kategori<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Semua Kategori</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Status Pendataan<select value={completeness} onChange={(event) => setCompleteness(event.target.value)}><option value="">Semua Status</option><option>Lengkap</option><option>Belum Lengkap</option></select></label></div>
    <div className="tablewrap"><table className="asset-table"><thead><tr><th>Kode Aset</th><th>Nama Aset</th><th>Kategori</th><th>Entitas</th><th>Area / Lokasi</th><th>Kondisi</th><th>Pendataan</th><th>Jumlah Jadwal</th><th>Aksi</th></tr></thead><tbody>{pageItems.map((asset) => { const isComplete = complete(asset); const scheduleCount = schedules.filter((item) => item.assetId === asset.id || item.code === asset.code).length; return <tr key={asset.id}><td><strong>{asset.code}</strong></td><td><strong>{asset.name}</strong><small>{[asset.brand, asset.model].filter(Boolean).join(' / ')}</small></td><td>{asset.category}</td><td>{asset.company || '—'}</td><td>{asset.area || '—'}<small>{asset.location}</small></td><td>{asset.condition}</td><td><span className={`pill ${isComplete ? 'completed' : 'pending'}`}>{isComplete ? 'Lengkap' : 'Belum Lengkap'}</span></td><td>{scheduleCount}</td><td className="tableactions"><button className="secondary view-asset" aria-label={`Lihat detail ${asset.code}`} title="Lihat detail" onClick={() => setDetailAsset(asset)}><Eye size={15} /></button><button className="secondary icon-action" aria-label={`Edit ${asset.code}`} title="Edit aset" onClick={() => onEdit(asset)}><Pencil size={15} /></button><button className="danger icon-action" aria-label={`Hapus ${asset.code}`} disabled={scheduleCount > 0} title={scheduleCount ? 'Ada jadwal terkait' : 'Hapus aset'} onClick={() => onDelete(asset)}><Trash2 size={15} /></button></td></tr>; })}</tbody></table></div><Pagination page={page} total={visible.length} onChange={setPage} />
    {detailAsset && <div className="modalback show" role="dialog" aria-modal="true" aria-labelledby="asset-detail-title"><div className="modal asset-detail-modal"><div className="modal-title-row"><div><span className="section-eyebrow">MASTER ASSET / DETAIL</span><h2 id="asset-detail-title">{detailAsset.name}</h2><p>{detailAsset.code}</p></div><button aria-label="Tutup detail aset" className="secondary" type="button" onClick={() => setDetailAsset(null)}><X size={16} /></button></div><div className="asset-detail-grid"><div><span>Kategori</span><strong>{detailAsset.category}</strong></div><div><span>Kondisi</span><strong>{detailAsset.condition}</strong></div><div><span>Entitas Perusahaan</span><strong>{detailAsset.company || '—'}</strong></div><div><span>Area / Departemen</span><strong>{detailAsset.area || '—'}</strong></div><div><span>Lokasi Detail</span><strong>{detailAsset.location || '—'}</strong></div><div><span>Merek</span><strong>{detailAsset.brand || '—'}</strong></div><div><span>Model / Tipe</span><strong>{detailAsset.model || '—'}</strong></div><div><span>Serial Number / Plat</span><strong>{detailAsset.serial || '—'}</strong></div><div><span>Tahun Perolehan</span><strong>{detailAsset.year || '—'}</strong></div><div><span>Penanggung Jawab</span><strong>{detailAsset.owner || '—'}</strong></div><div><span>Status Pendataan</span><strong>{complete(detailAsset) ? 'Lengkap' : 'Belum Lengkap'}</strong></div><div><span>Jumlah Jadwal</span><strong>{schedules.filter((item) => item.assetId === detailAsset.id || item.code === detailAsset.code).length}</strong></div><div className="asset-detail-notes"><span>Catatan Aset</span><strong>{detailAsset.notes || '—'}</strong></div></div><div className="modalfooter"><button className="secondary" type="button" onClick={() => setDetailAsset(null)}>Tutup</button><button type="button" onClick={() => { setDetailAsset(null); onEdit(detailAsset); }}>Edit Aset</button></div></div></div>}
  </section>;
}
