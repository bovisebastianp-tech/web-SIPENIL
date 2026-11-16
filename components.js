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
