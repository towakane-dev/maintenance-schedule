/* HRGA / KARYA BAHANA BERLIAN — Master Asset module v4
   Offline data in localStorage only, not a company-wide database.
   XLSX import uses bundled JSZip (no CDN required). */
const AssetDB=(()=>{
  'use strict';
  const KEY='kbb-hrga-assets-v4';
  const CATEGORIES=['Fasilitas','Elektronik','Kendaraan','Gedung & Bangunan'];
  const COLUMNS=['Kode Aset','Nama Aset','Kategori','Entitas Perusahaan','Area','Lokasi Detail','Merek','Model / Tipe','Serial Number / Plat','Tahun Perolehan','Penanggung Jawab','Kondisi','Catatan'];
  const FIELDS=['code','name','category','company','area','location','brand','model','serial','year','owner','condition','notes'];
  const $a=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const trim=v=>String(v??'').trim(), norm=v=>trim(v).normalize('NFKC').toUpperCase();
  let assets=[], editCode=null, pending=null;
  function normalizeCategory(v){const s=trim(v).toLowerCase();if(['fasilitas','facility','facilities'].includes(s))return 'Fasilitas';if(['elektronik','electronic','electronics'].includes(s))return 'Elektronik';if(['kendaraan','vehicle','car','mobil'].includes(s))return 'Kendaraan';if(['gedung','bangunan','gedung & bangunan','gedung dan bangunan','building'].includes(s))return 'Gedung & Bangunan';return CATEGORIES.find(x=>x.toLowerCase()===s)||''}
  function fromSchedule(rows){const map=new Map();for(const x of rows){const code=norm(x.code);if(!code||map.has(code))continue;map.set(code,{code,name:trim(x.machine),category:normalizeCategory(x.area)||'Fasilitas',company:'',area:'',location:'',brand:'',model:'',serial:'',year:'',owner:trim(x.pic),condition:'Belum Dicek',notes:''})}return [...map.values()]}
  try{const old=JSON.parse(localStorage.getItem(KEY));assets=Array.isArray(old)?old:fromSchedule(JSON.parse(localStorage.getItem('maintpro-demo-v1'))||[])}catch{assets=[]}
  // migrate records from original schedule data only if the asset database is missing.
  function initFromSchedule(){if(localStorage.getItem(KEY)===null){assets=fromSchedule(items);persist()}else{try{const a=JSON.parse(localStorage.getItem(KEY));assets=Array.isArray(a)?a:fromSchedule(items)}catch{assets=fromSchedule(items)}}
    // Users may have old schedule codes not registered yet: preserve links and add partial profiles.
    let changed=false;for(const a of fromSchedule(items)){if(!assets.some(b=>norm(b.code)===norm(a.code))){assets.push(a);changed=true}}if(changed)persist();
  }
  const persist=()=>localStorage.setItem(KEY,JSON.stringify(assets));
  function completeness(x){return [x.code,x.name,x.category,x.company,x.area,x.location,x.condition].every(v=>trim(v))?'Lengkap':'Belum Lengkap'}
  const active=x=>x.condition!=='Tidak Aktif';
  function notify(message,error=false){const e=$a('#asset-alert');e.hidden=false;e.textContent=message;e.classList.toggle('error',error);e.scrollIntoView({block:'nearest'});setTimeout(()=>{if(e.textContent===message)e.hidden=true},9000)}
  function render(){
    const prior=$a('#asset-company-filter').value;
    const companies=[...new Set(assets.map(x=>trim(x.company)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    $a('#asset-company-filter').innerHTML='<option value="">Semua Entitas</option>'+companies.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
    $a('#asset-company-filter').value=companies.includes(prior)?prior:'';
    const search=trim($a('#asset-search').value).toLowerCase(),cat=$a('#asset-category-filter').value,company=$a('#asset-company-filter').value,complete=$a('#asset-completeness-filter').value;
    const list=assets.filter(x=>(!search||[x.code,x.name,x.category,x.company,x.area,x.location,x.brand,x.model,x.serial].some(v=>String(v||'').toLowerCase().includes(search)))&&(!cat||x.category===cat)&&(!company||x.company===company)&&(!complete||completeness(x)===complete)).sort((a,b)=>a.code.localeCompare(b.code));
    $a('#asset-total').textContent=assets.length;
    $a('#asset-verified').textContent=assets.filter(x=>completeness(x)==='Lengkap').length;
    $a('#asset-incomplete').textContent=assets.filter(x=>completeness(x)!=='Lengkap').length;
    $a('#asset-active').textContent=assets.filter(active).length;
    $a('#k-assets').textContent=assets.length;
    $a('#asset-rows').innerHTML=list.map(x=>{
      const scheduleCount=items.filter(i=>norm(i.code)===norm(x.code)).length;
      return `<tr><td><strong>${esc(x.code)}</strong></td><td><strong>${esc(x.name)}</strong><small>${esc(x.brand||'')}${x.model?' / '+esc(x.model):''}</small></td><td>${esc(x.category)}</td><td>${esc(x.company||'—')}</td><td>${esc(x.area||'—')}<small>${esc(x.location||'')}</small></td><td>${esc(x.condition||'Belum Dicek')}</td><td><span class="pill ${completeness(x)==='Lengkap'?'completed':'pending'}">${completeness(x)}</span></td><td>${scheduleCount}</td><td><div class="tableactions"><button class="secondary" type="button" data-asset-edit="${esc(x.code)}">Edit</button><button class="danger" type="button" data-asset-delete="${esc(x.code)}" ${scheduleCount?'disabled title="Ada jadwal atau histori terkait"':''}>Hapus</button></div></td></tr>`;
    }).join('')||'<tr><td colspan="9" class="empty">Tidak ada aset yang cocok. Klik Tambah Aset atau Import Excel.</td></tr>';
  }
  function fillScheduleChoices(){
    const sel=$a('#schedule-asset');const previous=sel.value;
    sel.innerHTML='<option value="">-- Pilih aset terdaftar --</option>'+assets.filter(active).sort((a,b)=>a.name.localeCompare(b.name)).map(a=>`<option value="${esc(a.code)}">${esc(a.code)} — ${esc(a.name)} (${esc(a.category)})</option>`).join('');
    if(assets.some(a=>a.code===previous&&active(a)))sel.value=previous;
  }
  function prepareScheduleModal(x){
    fillScheduleChoices();
    if(x){const a=assets.find(y=>norm(y.code)===norm(x.code));if(a){$a('#schedule-asset').value=a.code;fillReadonly(a)}}
    else{$a('#schedule-asset').value='';fillReadonly(null)}
  }
  function fillReadonly(a){const f=$a('#form').elements;f.code.value=a?.code||'';f.machine.value=a?.name||'';f.area.value=a?.category||'';
    $a('#schedule-asset-help').textContent=a?`${a.company||'Entitas belum diisi'} • ${a.area||'Area belum diisi'} • ${a.location||'Lokasi belum diisi'}`:'Jika aset belum ada, tambahkan melalui menu Master Asset terlebih dahulu.';
  }
  function applySelectedAsset(data){const a=assets.find(x=>norm(x.code)===norm(data.assetSelect));if(!a||!active(a))return false;data.code=a.code;data.machine=a.name;data.area=a.category;return true}
  function openModal(code=null){
    editCode=code;const x=assets.find(v=>v.code===code);
    const form=$a('#asset-form');form.reset();for(const field of FIELDS){form.elements[field].value=x?.[field]??(field==='condition'?'Baik':'')}
    form.elements.code.readOnly=Boolean(x);
    $a('#asset-formtitle').textContent=x?'Edit Data Aset':'Tambah Aset Baru';$a('#asset-back').classList.add('show');form.elements[x?'name':'code'].focus();
  }
  function closeModal(){$a('#asset-back').classList.remove('show')}
  function applyAssetEdits(before,after){if(before){for(const i of items){if(norm(i.code)===norm(before.code)){i.code=after.code;i.machine=after.name;i.area=after.category}}save()}}
  function assetFormSubmit(ev){ev.preventDefault();const data=Object.fromEntries(new FormData(ev.currentTarget));
    for(const key of FIELDS)data[key]=trim(data[key]);data.code=norm(data.code);data.category=normalizeCategory(data.category);
    if(!data.code||!data.name||!data.category){alert('Kode, Nama, dan Kategori aset wajib diisi.');return}
    if(!editCode&&assets.some(a=>norm(a.code)===data.code)){alert('Kode aset sudah terdaftar. Gunakan kode unik atau edit aset yang sudah ada.');return}
    if(editCode){const idx=assets.findIndex(a=>a.code===editCode);if(idx<0)return;const old=assets[idx];assets[idx]={...old,...data};applyAssetEdits(old,assets[idx]);}
    else assets.push(data);
    persist();closeModal();render();fillScheduleChoices();if(typeof window.render==='function')window.render();else render();notify('Aset '+data.code+' berhasil '+(editCode?'diperbarui.':'ditambahkan.')+' Kini tersedia saat membuat jadwal.');
  }
  function csvEncode(rows){return '\ufeff'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n')}
  function blobDownload(text,name,type='text/csv;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function exportAssets(){blobDownload(csvEncode([COLUMNS,...assets.map(a=>FIELDS.map(f=>a[f]))]),'KBB_Master_Asset.csv')}
  function importTemplate(){const a=document.createElement('a');a.href='assets/Template_Master_Asset_KBB.xlsx';a.download='Template_Master_Asset_KBB.xlsx';a.click();}
  // CSV parser with support for quotation marks, quoted line breaks, and Excel UTF-8 BOM.
  function parseCSV(text){const rows=[];let row=[],v='',q=false;const s=text.replace(/^\uFEFF/,'');for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(q&&s[i+1]==='"'){v+='"';i++}else q=!q}else if(c===','&&!q){row.push(v);v=''}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&s[i+1]==='\n')i++;row.push(v);if(row.some(x=>x!==''))rows.push(row);row=[];v=''}else v+=c}row.push(v);if(row.some(x=>x!==''))rows.push(row);return rows}
  async function parseXLSX(file){
    if(typeof JSZip==='undefined')throw Error('Pustaka Excel lokal tidak ditemukan. Gunakan file CSV atau pastikan folder js/vendor ikut disalin.');
    const zip=await JSZip.loadAsync(file);
    const find=(p)=>zip.file(p);
    const load=async p=>{const file=find(p);if(!file)throw Error('Struktur Excel tidak lengkap: '+p);return new DOMParser().parseFromString(await file.async('text'),'application/xml')};
    const wb=await load('xl/workbook.xml');const sheets=wb.getElementsByTagNameNS('*','sheet');if(!sheets.length)throw Error('Sheet Excel tidak ditemukan.');
    const sheet=sheets[0],rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    let target='xl/worksheets/sheet1.xml';
    if(find('xl/_rels/workbook.xml.rels')&&rid){const rels=await load('xl/_rels/workbook.xml.rels');const rel=[...rels.getElementsByTagNameNS('*','Relationship')].find(e=>e.getAttribute('Id')===rid);if(rel){const path=rel.getAttribute('Target');target=path.startsWith('/')?path.slice(1):path.startsWith('xl/')?path:'xl/'+path}}
    const ss=[];if(find('xl/sharedStrings.xml')){const strings=await load('xl/sharedStrings.xml');for(const si of strings.getElementsByTagNameNS('*','si'))ss.push([...si.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join(''))}
    const doc=await load(target),rows=[];
    for(const r of doc.getElementsByTagNameNS('*','row')){const cells=[];for(const c of r.getElementsByTagNameNS('*','c')){
      const ref=c.getAttribute('r')||'A',col=ref.match(/^[A-Z]+/i)?.[0]||'A';let ix=0;for(const l of col.toUpperCase())ix=ix*26+(l.charCodeAt(0)-64);ix--;
      const type=c.getAttribute('t'),v=c.getElementsByTagNameNS('*','v')[0];
      let value=v?v.textContent:'';
      if(type==='s')value=ss[Number(value)]??'';
      else if(type==='inlineStr')value=[...c.getElementsByTagNameNS('*','t')].map(n=>n.textContent).join('');
      else if(type==='b')value=value==='1'?'Ya':'Tidak';
      cells[ix]=value;
    }rows.push(cells)}
    return rows.filter(r=>r.some(c=>trim(c)!==''));
  }
  function cleanHeader(v){return trim(v).toLowerCase().replace(/[^a-z0-9]/g,'')}
  const HEADER_MAP={
    code:['kodeaset','kode','assetcode','assetid','idasset'],name:['namaaset','namabarang','namafasilitas','assetname'],
    category:['kategori','kategoriasset','kategoriaset','category','jenisasset'],company:['entitasperusahaan','entitas','perusahaan','company','pt'],
    area:['area','departemen','department','unitkerja'],location:['lokasidetail','lokasi','location','ruangan'],
    brand:['merek','merk','brand'],model:['modeltipe','model','tipe','type'],serial:['serialnumberplat','serialnumber','serial','nomorseri','nopol','nomorpolisi'],
    year:['tahunperolehan','tahunbeli','tahunpembelian','year'],owner:['penanggungjawab','pic','owner','pengguna'],
    condition:['kondisi','kondisiaset','condition'],notes:['catatan','keterangan','notes','remark']
  };
  function parseIncoming(rows){
    if(!rows.length)throw Error('File Excel / CSV kosong.');
    const hdr=rows[0].map(cleanHeader),indices={};for(const f of FIELDS){indices[f]=hdr.findIndex(s=>HEADER_MAP[f].includes(s))}
    if(indices.code<0||indices.name<0||indices.category<0)throw Error('Header wajib tidak ditemukan: Kode Aset, Nama Aset, Kategori. Silakan gunakan template yang disediakan.');
    const valid=[],errors=[],seen=new Set();let duplicate=0,updated=0,added=0;
    rows.slice(1).forEach((row,i)=>{
      if(!row.some(c=>trim(c)))return;
      const data={};for(const f of FIELDS)data[f]=indices[f]<0?'':trim(row[indices[f]]);
      data.code=norm(data.code);data.category=normalizeCategory(data.category);
      if(!data.code||!data.name||!data.category){errors.push('Baris '+(i+2)+': kode, nama, atau kategori tidak valid.');return}
      if(seen.has(data.code)){duplicate++;errors.push('Baris '+(i+2)+': kode duplikat di file ('+data.code+').');return}seen.add(data.code);
      if(assets.some(a=>norm(a.code)===data.code))updated++;else added++;
      valid.push(data);
    });
    if(!valid.length)throw Error('Tidak ada baris aset valid untuk diimport. '+errors.slice(0,3).join(' '));
    return {valid,errors,duplicate,added,updated};
  }
  function showImportPreview(parsed){pending=parsed;$a('#import-summary').innerHTML=`<p>Periksa data sebelum disimpan. Aset berkode sama akan diperbarui dengan nilai dari file; kolom yang kosong tetap menggunakan data lama.</p><div class="import-numbers"><span>Baru <b>${parsed.added}</b></span><span>Update <b>${parsed.updated}</b></span><span>Ditolak <b>${parsed.errors.length}</b></span></div>${parsed.errors.length?`<div class="import-warnings">${esc(parsed.errors.slice(0,15).join('\n'))}${parsed.errors.length>15?'\n…':''}</div>`:''}`;
    $a('#import-preview').innerHTML=`<table class="import-preview-table"><thead><tr><th>Kode</th><th>Nama Aset</th><th>Kategori</th><th>Entitas</th><th>Area</th></tr></thead><tbody>${parsed.valid.slice(0,10).map(a=>`<tr><td>${esc(a.code)}</td><td>${esc(a.name)}</td><td>${esc(a.category)}</td><td>${esc(a.company)}</td><td>${esc(a.area)}</td></tr>`).join('')}</tbody></table><p class="hint">Menampilkan maksimal 10 baris pratinjau dari ${parsed.valid.length} baris yang siap diimpor.</p>`;
    $a('#import-back').classList.add('show');
  }
  function commitImport(){if(!pending)return;for(const row of pending.valid){const i=assets.findIndex(a=>norm(a.code)===row.code);if(i>=0){const old=assets[i];const updated={...old};for(const field of FIELDS)if(trim(row[field]))updated[field]=row[field];assets[i]=updated;applyAssetEdits(old,updated)}else assets.push({...row,condition:row.condition||'Belum Dicek'});}const counts=pending;pending=null;persist();$a('#import-back').classList.remove('show');render();fillScheduleChoices();window.render();notify(`${counts.added} aset baru ditambahkan, ${counts.updated} diperbarui, ${counts.errors.length} baris dilewati.`)}
  function bind(){
    $a('#asset-add').onclick=$a('#openaddasset').onclick=()=>openModal();
    $a('#asset-close').onclick=$a('#asset-cancel').onclick=closeModal;
    $a('#asset-back').onclick=e=>{if(e.target.id==='asset-back')closeModal()};
    $a('#asset-form').addEventListener('submit',assetFormSubmit);
    for(const id of ['asset-search','asset-company-filter','asset-category-filter','asset-completeness-filter'])$a('#'+id).addEventListener(id==='asset-search'?'input':'change',render);
    $a('#asset-rows').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.assetEdit)openModal(b.dataset.assetEdit);if(b.dataset.assetDelete){const code=b.dataset.assetDelete;if(items.some(x=>norm(x.code)===norm(code))){alert('Aset tidak bisa dihapus karena memiliki jadwal atau riwayat maintenance.');return}if(confirm('Hapus aset '+code+' dari Master Asset?')){assets=assets.filter(a=>a.code!==code);persist();render();fillScheduleChoices();notify('Aset '+code+' dihapus.')}}};
    $a('#schedule-asset').addEventListener('change',e=>{const x=assets.find(a=>a.code===e.target.value);fillReadonly(x)});
    $a('#asset-export').onclick=exportAssets;$a('#asset-template').onclick=importTemplate;
    $a('#asset-import').onclick=()=>$a('#asset-file').click();
    $a('#asset-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const rows=/\.xlsx$/i.test(f.name)?await parseXLSX(f):/\.csv$/i.test(f.name)?parseCSV(await f.text()):null;if(!rows)throw Error('Format file tidak didukung. Pilih .xlsx atau .csv');showImportPreview(parseIncoming(rows))}catch(err){notify('Import gagal: '+err.message,true)}finally{e.target.value=''}};
    $a('#import-close').onclick=$a('#import-cancel').onclick=()=>{$a('#import-back').classList.remove('show');pending=null};
    $a('#import-confirm').onclick=commitImport;
  }
  function resetFromSchedule(){assets=fromSchedule(items);persist();render()}
  function init(){initFromSchedule();bind();render();fillScheduleChoices()}
  document.addEventListener('DOMContentLoaded',init);
  return {render,prepareScheduleModal,applySelectedAsset,resetFromSchedule,exportAssets};
})();
