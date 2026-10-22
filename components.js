/* ============ MODAL ============ */
function modal(title, fields, onOk, okLabel='Simpan'){
  const el=document.createElement('div');el.className='ov';
  el.innerHTML=`<form class="modal"><h2 style="margin-bottom:14px">${esc(title)}</h2>${fields.map(f=>`
    <div class="field"><label>${esc(f.label)}</label>${f.type==='select'
      ?`<select name="${f.name}">${f.options.map(o=>`<option value="${esc(o[0])}" ${o[0]==f.value?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`
      :`<input name="${f.name}" type="${f.type||'text'}" value="${esc(f.value??'')}" ${f.req!==false?'required':''} ${f.min!=null?`min="${f.min}"`:''}>`}</div>`).join('')}
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>Batal</button><button class="btn">${okLabel}</button></div></form>`;
  document.body.appendChild(el);
  const close=()=>el.remove();
  el.addEventListener('click',e=>{if(e.target===el||e.target.dataset.x!==undefined)close()});
  $('form',el).addEventListener('submit',e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));if(onOk(o)!==false)close()});
  const f=$('input,select',el);f&&f.focus();
}
function confirmBox(msg,onOk,label='Ya, lanjutkan'){
  const el=document.createElement('div');el.className='ov';
  el.innerHTML=`<div class="modal"><p style="margin:0 0 16px">${esc(msg)}</p><div class="row" style="justify-content:flex-end"><button class="btn ghost" data-x>Batal</button><button class="btn" data-ok>${label}</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener('click',e=>{if(e.target===el||e.target.dataset.x!==undefined)el.remove();if(e.target.dataset.ok!==undefined){el.remove();onOk()}});
}

/* ============ RENDER: LOGIN ============ */
function viewLogin(){
  return `<div class="login-wrap"><div class="card login stack">
    <div class="logo"><i>S</i>SIPENIL</div>
    <div><h1>Masuk</h1><p class="muted small" style="margin:4px 0 0">Sistem Informasi Pengelolaan dan Kalkulasi Nilai Mahasiswa</p></div>
    <form id="fLogin">
      <div class="field"><label>Username / NIM</label><input name="u" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus></div>
      <div class="field"><label>Password</label><input name="p" type="password" autocomplete="current-password" required></div>
      <p id="lerr" class="small" style="color:var(--danger);margin:0 0 10px"></p>
      <button class="btn" style="width:100%;justify-content:center">Masuk</button>
    </form>
  </div></div>`;
}

/* ============ RENDER: SHELL ============ */
function shell(tabs, body){
  const u=me();
  return `<header class="top"><div class="logo" style="font-size:1.1rem"><i style="width:30px;height:30px;font-size:.95rem">S</i>SIPENIL</div>
    <div class="who"><div class="meta" style="text-align:right"><b>${esc(u.nama)}</b><span class="muted small" style="text-transform:capitalize">${u.role}</span></div>
    <div class="av">${esc(u.nama[0])}</div><button class="btn ghost sm" data-a="logout">Keluar</button></div></header>
  <nav class="tabs">${tabs.map(t=>`<button class="${UI.tab===t[0]?'on':''}" data-a="tab" data-v="${t[0]}">${t[1]}</button>`).join('')}</nav>
  <main>${body}</main>`;
}
function pwTools(){return ''}
