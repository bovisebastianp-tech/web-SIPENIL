/* ============ MODAL ============ */
// fields: {name,label,type,value,req,min,max,step,minlength,maxlength,placeholder,autocomplete,options}
// onOk boleh mengembalikan false (tetap terbuka) atau Promise (tombol dinonaktifkan sampai selesai).
// cancelable=false menyembunyikan tombol Batal dan mencegah penutupan lewat klik latar.
function modal(title, fields, onOk, okLabel='Simpan', cancelable=true){
  const el=document.createElement('div');el.className='ov';
  const attr=(n,v)=>v!=null?` ${n}="${esc(v)}"`:'';
  el.innerHTML=`<form class="modal" novalidate><h2 style="margin-bottom:14px">${esc(title)}</h2>${fields.map(f=>`
    <div class="field"><label>${esc(f.label)}</label>${f.type==='select'
      ?`<select name="${esc(f.name)}">${f.options.map(o=>`<option value="${esc(o[0])}" ${o[0]==f.value?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`
      :`<input name="${esc(f.name)}" type="${esc(f.type||'text')}" value="${esc(f.value??'')}" ${f.req!==false?'required':''}${attr('min',f.min)}${attr('max',f.max)}${attr('step',f.step)}${attr('minlength',f.minlength)}${attr('maxlength',f.maxlength)}${attr('placeholder',f.placeholder)}${attr('autocomplete',f.autocomplete||'off')}>`}</div>`).join('')}
    <p class="small modal-err" role="alert" style="color:var(--danger);margin:0 0 10px;min-height:1.2em"></p>
    <div class="row" style="justify-content:flex-end">${cancelable?'<button type="button" class="btn ghost" data-x>Batal</button>':''}<button class="btn" data-submit>${esc(okLabel)}</button></div></form>`;
  document.body.appendChild(el);
  const close=()=>el.remove();
  const showErr=m=>{$('.modal-err',el).textContent=m||''};
  el.addEventListener('click',e=>{if((e.target===el&&cancelable)||e.target.dataset.x!==undefined)close()});
  const form=$('form',el);
  form.addEventListener('submit',async e=>{
    e.preventDefault(); showErr('');
    // validasi HTML dasar (kolom wajib, panjang minimal) dengan pesan berbahasa Indonesia
    const bad=[...form.elements].find(x=>x.name&&x.willValidate&&!x.checkValidity());
    if(bad){const lab=bad.closest('.field')?.querySelector('label')?.textContent||bad.name;
      const v=bad.validity;
      showErr(v.valueMissing?`${lab}: wajib diisi.`:v.tooShort?`${lab}: minimal ${bad.minLength} karakter.`:v.rangeUnderflow?`${lab}: minimal ${bad.min}.`:v.rangeOverflow?`${lab}: maksimal ${bad.max}.`:v.stepMismatch?`${lab}: harus berupa bilangan bulat.`:`${lab}: isian tidak valid.`);bad.focus();return}
    const o=Object.fromEntries(new FormData(form));
    const btn=$('[data-submit]',el); btn.disabled=true;
    try{
      let r=onOk(o,showErr); if(r&&r.then) r=await r;
      if(r!==false) close(); else btn.disabled=false;
    }catch(err){console.error(err);showErr('Terjadi kesalahan: '+(err.message==='NO_SUBTLE'?'browser tidak mendukung enkripsi. Buka lewat HTTPS atau localhost.':err.message));btn.disabled=false}
  });
  const f=$('input,select',el);f&&f.focus();
}
function confirmBox(msg,onOk,label='Ya, lanjutkan',onCancel){
  const el=document.createElement('div');el.className='ov';
  el.innerHTML=`<div class="modal" role="dialog" aria-modal="true"><p style="margin:0 0 16px">${esc(msg)}</p><div class="row" style="justify-content:flex-end"><button class="btn ghost" data-x>Batal</button><button class="btn" data-ok>${esc(label)}</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener('click',e=>{
    if(e.target===el||e.target.dataset.x!==undefined){el.remove();onCancel&&onCancel()}
    if(e.target.dataset.ok!==undefined){el.remove();onOk()}});
}

/* ============ RENDER: LOGIN ============ */
function viewLogin(){
  return `<div class="login-wrap"><div class="card login stack">
    <div class="logo"><i>S</i>SIPENIL</div>
    <div><h1>Masuk</h1><p class="muted small" style="margin:4px 0 0">Sistem Informasi Pengelolaan dan Kalkulasi Nilai Mahasiswa</p></div>
    <form id="fLogin">
      <div class="field"><label>Username / NIM</label><input name="u" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus></div>
      <div class="field"><label>Password</label><input name="p" type="password" autocomplete="current-password" required></div>
      <p id="lerr" class="small" role="alert" style="color:var(--danger);margin:0 0 10px;min-height:1.2em"></p>
      <button class="btn" style="width:100%;justify-content:center">Masuk</button>
    </form>
    ${STORE_OK?'':'<div class="alert">Penyimpanan browser tidak tersedia (mode privat atau diblokir). Data tidak akan tersimpan setelah halaman ditutup.</div>'}
  </div></div>`;
}

/* ============ RENDER: SHELL ============ */
function shell(tabs, body){
  const u=me();
  const warn=u.mustChange?`<div class="alert no-print" style="margin-bottom:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between"><span><b>Anda masih memakai password awal.</b> Ganti sekarang agar akun aman.</span><button class="btn sm" data-a="chPw">Ganti password</button></div>`:'';
  return `<header class="top"><div class="logo" style="font-size:1.1rem"><i style="width:30px;height:30px;font-size:.95rem">S</i>SIPENIL</div>
    <div class="who"><div class="meta" style="text-align:right"><b>${esc(u.nama)}</b><span class="muted small" style="text-transform:capitalize">${esc(u.role)}</span></div>
    <div class="av">${esc(u.nama[0])}</div><button class="btn ghost sm" data-a="chPw">Ganti password</button><button class="btn ghost sm" data-a="logout">Keluar</button></div></header>
  <nav class="tabs">${tabs.map(t=>`<button class="${UI.tab===t[0]?'on':''}" data-a="tab" data-v="${esc(t[0])}">${esc(t[1])}</button>`).join('')}</nav>
  <main>${warn}${STORE_OK?'':'<div class="alert" style="margin-bottom:16px">Penyimpanan browser tidak tersedia: perubahan tidak akan tersimpan.</div>'}${body}</main>`;
}

/* ============ PENCARIAN, FILTER & PAGINATION (daftar) ============ */
// Setiap daftar didaftarkan di LISTS[nama] dengan: size, unit, defaults, emptyAll, items(), match(item,state), row(item), empty(html).
// Status pencarian/filter disimpan di UI.f[nama]. Saat pengguna mengetik, HANYA isi tabel, jumlah hasil, dan
// pagination yang digambar ulang (bukan seluruh halaman), sehingga kursor tidak hilang dan tidak ada reload.
const LISTS={};
// huruf kecil, tanpa aksen, apostrof diabaikan (Ma'mun = mamun), spasi berlebih dirapikan
const normQ = s => String(s??'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/['’`]/g,'').replace(/\s+/g,' ').trim();
// Setiap kata pada kueri harus ada (sebagian pun cukup) di salah satu bidang: "alif abiyyu" cocok dengan "Alif Putra Abiyyu"
function qMatch(q,...fields){
  const t=normQ(q); if(!t) return true;
  const hay=normQ(fields.join(' '));
  return t.split(' ').every(w=>hay.includes(w));
}
function fstate(name){
  UI.f=UI.f||{}; const L=LISTS[name];
  return UI.f[name]=UI.f[name]||{q:'',page:1,...(L.defaults||{})};
}
function listActive(name){
  const L=LISTS[name], st=fstate(name);
  return st.q.trim()!==''||Object.keys(L.defaults||{}).some(k=>st[k]!==L.defaults[k]);
}
function listResults(name){
  const L=LISTS[name], st=fstate(name); L.fix&&L.fix(st);
  return L.items().filter(x=>L.match(x,st));
}
const emptyRow = cols => html => `<tr><td colspan="${cols}" class="empty muted">${html}</td></tr>`;
function listParts(name){
  const L=LISTS[name], st=fstate(name); L.fix&&L.fix(st);
  const all=L.items(), res=all.filter(x=>L.match(x,st));
  const pages=Math.max(1,Math.ceil(res.length/L.size));
  st.page=Math.min(Math.max(1,st.page|0),pages);
  const from=(st.page-1)*L.size, slice=res.slice(from,from+L.size), active=listActive(name);
  const rows=res.length?slice.map(L.row).join('')
    :L.empty(all.length?'<b>Data tidak ditemukan</b><br><span class="small">Coba kata kunci lain atau klik Reset filter.</span>':L.emptyAll);
  const info=active?`Ditemukan <b>${res.length}</b> dari ${all.length} ${L.unit}`:`Total <b>${all.length}</b> ${L.unit}`;
  const pager=res.length>L.size?`<div class="pager no-print"><span class="small muted">Menampilkan ${from+1}&ndash;${from+slice.length} dari ${res.length}</span>
    <div class="row" style="gap:8px"><button class="btn ghost sm" data-fa="page" data-p="${st.page-1}" ${st.page<=1?'disabled':''}>&lsaquo; Sebelumnya</button>
    <span class="small">Halaman ${st.page} dari ${pages}</span>
    <button class="btn ghost sm" data-fa="page" data-p="${st.page+1}" ${st.page>=pages?'disabled':''}>Berikutnya &rsaquo;</button></div></div>`:'';
  return {rows,info,pager,active,found:res.length,total:all.length,page:st.page,pages};
}
const SVG_SEARCH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
// opts: {ph, label, filters:[{key,label,options:[[nilai,teks]]}], tools:html tambahan di baris jumlah hasil}
function listHead(name,opts,p){
  const st=fstate(name);
  return `<div class="toolbar no-print" role="search">
    <div class="search">${SVG_SEARCH}<input type="search" data-fq autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="${esc(opts.ph)}" aria-label="${esc(opts.label||opts.ph)}" value="${esc(st.q)}"></div>
    ${(opts.filters||[]).map(f=>`<select data-ff="${esc(f.key)}" aria-label="${esc(f.label)}">${f.options.map(o=>`<option value="${esc(o[0])}" ${o[0]===st[f.key]?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`).join('')}
    <button type="button" class="btn ghost sm" data-fa="reset" ${p.active?'':'disabled'}>Reset filter</button></div>
  <div class="list-meta no-print"><span class="small muted" data-info aria-live="polite">${p.info}</span>${opts.tools?`<span class="row" style="gap:8px">${opts.tools}</span>`:''}</div>`;
}
const listFoot = p => `<div data-pager>${p.pager}</div>`;
// menggambar ulang isi daftar saja
function listRefresh(name){
  const box=$(`.lst[data-list="${name}"]`); if(!box) return;
  const p=listParts(name), L=LISTS[name];
  $('[data-rows]',box).innerHTML=p.rows; $('[data-info]',box).innerHTML=p.info; $('[data-pager]',box).innerHTML=p.pager;
  $('[data-fa=reset]',box).disabled=!p.active;
  L.after&&L.after(box,p);
}
document.addEventListener('input',e=>{
  const el=e.target; if(el.dataset.fq===undefined) return;
  const name=el.closest('.lst')?.dataset.list; if(!name||!LISTS[name]) return;
  const st=fstate(name); st.q=el.value; st.page=1; listRefresh(name);
});
document.addEventListener('change',e=>{
  const el=e.target; if(el.dataset.ff===undefined) return;
  const name=el.closest('.lst')?.dataset.list; if(!name||!LISTS[name]) return;
  const st=fstate(name); st[el.dataset.ff]=el.value; st.page=1; listRefresh(name);
});
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-fa]'); if(!el) return;
  const box=el.closest('.lst'), name=box?.dataset.list; if(!name||!LISTS[name]) return;
  const st=fstate(name);
  if(el.dataset.fa==='reset'){
    UI.f[name]={q:'',page:1,...(LISTS[name].defaults||{})};
    const s=UI.f[name]; $('[data-fq]',box).value='';
    box.querySelectorAll('[data-ff]').forEach(x=>x.value=s[x.dataset.ff]);
    listRefresh(name); $('[data-fq]',box).focus();
  }
  if(el.dataset.fa==='page'){ st.page=+el.dataset.p; listRefresh(name) }
});
