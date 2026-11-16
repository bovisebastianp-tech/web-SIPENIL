/* ============ ADMIN ============ */
function adminTabs(){return [['mhs','Mahasiswa'],['dsn','Dosen'],['mk','Mata Kuliah'],['plot','Plotting'],['khs','Cetak KHS']]}

/* --- daftar yang bisa dicari/difilter --- */
const actionCell = u => `<td class="full"><div class="row"><button class="btn ghost sm" data-a="uEdit" data-id="${u.id}">Ubah</button><button class="btn ghost sm" data-a="uReset" data-id="${u.id}">Reset password</button><button class="btn danger sm" data-a="uDel" data-id="${u.id}">Hapus</button></div></td>`;
LISTS.mhs={size:25,unit:'mahasiswa',defaults:{},emptyAll:'Belum ada data.',empty:emptyRow(3),
  items:()=>DB.users.filter(u=>u.role==='mahasiswa'),
  match:(u,st)=>qMatch(st.q,u.nim||u.username,u.nama),
  row:u=>`<tr><td data-l="NIM">${esc(u.username)}</td><td data-l="Nama">${esc(u.nama)}</td>${actionCell(u)}</tr>`};
const coursesOf = id => DB.courses.filter(c=>c.dosenId===id);
LISTS.dsn={size:25,unit:'dosen',defaults:{mk:'all'},emptyAll:'Belum ada data.',empty:emptyRow(4),
  items:()=>DB.users.filter(u=>u.role==='dosen'),
  fix:st=>{if(st.mk!=='all'&&st.mk!=='_none'&&!course(st.mk)) st.mk='all'},   // mata kuliah yang difilter sudah dihapus
  match:(u,st)=>qMatch(st.q,u.nama,u.username)&&(st.mk==='all'||(st.mk==='_none'?!coursesOf(u.id).length:coursesOf(u.id).some(c=>c.id===st.mk))),
  row:u=>`<tr><td data-l="Username">${esc(u.username)}</td><td data-l="Nama">${esc(u.nama)}</td><td data-l="Mata kuliah">${esc(coursesOf(u.id).map(c=>c.nama).join(', ')||'-')}</td>${actionCell(u)}</tr>`};
// plotting: daftar mahasiswa untuk mata kuliah terpilih; taken = sudah terdaftar di mata kuliah itu
const plotCid = () => course(UI.plotC)?UI.plotC:DB.courses[0]?.id;
LISTS.plot={size:48,unit:'mahasiswa',defaults:{status:'all'},emptyAll:'<span class="muted">Belum ada mahasiswa.</span>',
  empty:h=>`<div class="muted empty-msg">${h}</div>`,
  items:()=>{const en=new Set(enrOf(plotCid()).map(e=>e.m));return DB.users.filter(u=>u.role==='mahasiswa').map(u=>({u,taken:en.has(u.id)}))},
  match:(x,st)=>qMatch(st.q,x.u.nim,x.u.nama)&&(st.status==='all'||(st.status==='in')===x.taken),
  row:x=>{const c=course(plotCid());return `<label class="plot-item"><input type="checkbox" style="width:auto" data-a="plotM" data-id="${x.u.id}" ${x.taken?'checked':''} ${c?.published?'disabled':''}>${esc(x.u.nama)} <span class="muted small">${esc(x.u.nim)}</span></label>`},
  after:(box,p)=>{const b=$('[data-a=plotAll]',box),n=$('[data-a=plotNone]',box);if(b)b.textContent=`Pilih semua hasil${p.found?` (${p.found})`:''}`;if(n)n.textContent='Batalkan pilihan hasil'}};
// sinkronkan centang & jumlah terdaftar dengan DB tanpa menggambar ulang daftar (baris tidak "melompat" saat dicentang)
function plotSync(){
  const c=course(plotCid()); if(!c) return;
  const en=new Set(enrOf(c.id).map(e=>e.m)), total=DB.users.filter(u=>u.role==='mahasiswa').length;
  document.querySelectorAll('[data-a=plotM]').forEach(cb=>{cb.checked=en.has(cb.dataset.id)});
  const el=$('#plotCnt'); if(el) el.textContent=`Mahasiswa terdaftar (${en.size} dari ${total})`;
}
function viewAdmin(){
  const t=UI.tab;
  let b='';
  if(t==='mhs'||t==='dsn'){
    const isM=t==='mhs', p=listParts(t);
    const filters=isM?[]:[{key:'mk',label:'Filter mata kuliah yang diampu',options:[['all','Semua mata kuliah'],
      ...DB.courses.map(c=>[c.id,c.nama+(DB.courses.filter(x=>x.nama===c.nama).length>1?` (${c.semester})`:'')]),['_none','Belum mengampu']]}];
    b=`<div class="row between" style="margin-bottom:14px"><h2>Data ${isM?'Mahasiswa':'Dosen'} (${p.total})</h2><button class="btn" data-a="uAdd">+ Tambah</button></div>
    <div class="card"><div class="lst" data-list="${t}">${listHead(t,{ph:isM?'Cari nama mahasiswa atau NIM...':'Cari nama dosen atau username...',filters},p)}
    <div class="tw"><table class="cards-m"><thead><tr><th>${isM?'NIM':'Username'}</th><th>Nama</th>${isM?'':'<th>Mata Kuliah</th>'}<th>Aksi</th></tr></thead><tbody data-rows>${p.rows}</tbody></table></div>${listFoot(p)}</div></div>`;
  }
  if(t==='mk'){
    b=`<div class="row between" style="margin-bottom:14px"><h2>Mata Kuliah (${DB.courses.length})</h2><button class="btn" data-a="cAdd">+ Tambah</button></div>
    <div class="card"><div class="tw"><table class="cards-m"><thead><tr><th>Kode</th><th>Nama</th><th class="num">SKS</th><th>Semester</th><th>Dosen</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
    ${DB.courses.map(c=>`<tr><td data-l="Kode">${esc(c.kode)}</td><td data-l="Nama">${esc(c.nama)}</td><td class="num" data-l="SKS">${c.sks}</td><td data-l="Semester">${esc(c.semester)}</td>
      <td data-l="Dosen">${esc(user(c.dosenId)?.nama||'-')}</td><td data-l="Status">${statusBadge(c)}</td>
      <td class="full"><div class="row"><button class="btn ghost sm" data-a="cEdit" data-id="${c.id}">Ubah</button><button class="btn danger sm" data-a="cDel" data-id="${c.id}">Hapus</button></div></td></tr>`).join('')||'<tr><td colspan="7" class="muted">Belum ada mata kuliah. Klik "+ Tambah" untuk membuat.</td></tr>'}
    </tbody></table></div></div>`;
  }
  if(t==='plot'){
    const cid=plotCid(); const c=course(cid);
    const students=DB.users.filter(u=>u.role==='mahasiswa');
    const enrolled=new Set(enrOf(cid).map(e=>e.m));
    b=`<h2 style="margin-bottom:14px">Plotting Dosen &amp; Mahasiswa</h2>`+(!c?`<div class="card muted">Belum ada mata kuliah. Tambahkan di menu Mata Kuliah terlebih dahulu.</div>`:(()=>{
    const p=listParts('plot'), dis=c.published?'disabled':'';
    return `${c.published?`<div class="alert info" style="margin-bottom:14px">Mata kuliah ini sudah dipublikasi, jadi mahasiswa tidak dapat ditambah atau dikeluarkan. Dosen tetap dapat diganti.</div>`:''}
    <div class="card stack"><div class="grid g2"><div><label>Mata kuliah</label><select data-a="plotC">${DB.courses.map(x=>`<option value="${x.id}" ${x.id===cid?'selected':''}>${esc(x.kode+' - '+x.nama+' ('+x.semester+')')}</option>`).join('')}</select></div>
    <div><label>Dosen pengampu</label><select data-a="plotD">${DB.users.filter(u=>u.role==='dosen').map(d=>`<option value="${d.id}" ${c&&d.id===c.dosenId?'selected':''}>${esc(d.nama)}</option>`).join('')}</select></div></div>
    <div><label id="plotCnt">Mahasiswa terdaftar (${enrolled.size} dari ${students.length})</label>
    <div class="lst" data-list="plot">${listHead('plot',{ph:'Cari nama mahasiswa atau NIM...',
      filters:[{key:'status',label:'Filter status pengambilan mata kuliah',options:[['all','Semua mahasiswa'],['in','Sudah mengambil'],['out','Belum mengambil']]}],
      tools:`<button type="button" class="btn ghost sm" data-a="plotAll" ${dis}>Pilih semua hasil${p.found?` (${p.found})`:''}</button><button type="button" class="btn ghost sm" data-a="plotNone" ${dis}>Batalkan pilihan hasil</button>`},p)}
    <div class="plot-grid" data-rows>${p.rows}</div>${listFoot(p)}</div></div></div>`})());
  }
  if(t==='khs'){
    const students=DB.users.filter(u=>u.role==='mahasiswa');
    const sid=students.some(x=>x.id===UI.khsS)?UI.khsS:students[0]?.id;
    b=`<h2 style="margin-bottom:14px" class="no-print">Cetak KHS</h2>`+(!students.length?'':`<div class="card no-print row" style="margin-bottom:16px"><div style="flex:1;min-width:220px"><label>Mahasiswa</label><select data-a="khsS">${students.map(s=>`<option value="${s.id}" ${s.id===sid?'selected':''}>${esc(s.nim+' - '+s.nama)}</option>`).join('')}</select></div></div>`)+(students.length?khsView(sid):'<div class="card muted">Belum ada mahasiswa.</div>');
  }
  return shell(adminTabs(),b);
}
function statusBadge(c){return c.published?'<span class="badge b-pub">Dipublikasi</span>':'<span class="badge b-draft">Draf</span>'}
