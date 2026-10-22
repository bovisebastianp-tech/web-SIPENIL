/* ============ ADMIN ============ */
function adminTabs(){return [['mhs','Mahasiswa'],['dsn','Dosen'],['mk','Mata Kuliah'],['plot','Plotting'],['khs','Cetak KHS']]}
function viewAdmin(){
  const t=UI.tab;
  let b='';
  if(t==='mhs'||t==='dsn'){
    const role=t==='mhs'?'mahasiswa':'dosen';
    const list=DB.users.filter(u=>u.role===role);
    b=`<div class="row between" style="margin-bottom:14px"><h2>Data ${t==='mhs'?'Mahasiswa':'Dosen'} (${list.length})</h2><button class="btn" data-a="uAdd">+ Tambah</button></div>
    <div class="card"><div class="tw"><table class="cards-m"><thead><tr><th>${t==='mhs'?'NIM':'Username'}</th><th>Nama</th><th>Aksi</th></tr></thead><tbody>
    ${list.map(u=>`<tr><td data-l="${t==='mhs'?'NIM':'Username'}">${esc(u.username)}</td><td data-l="Nama">${esc(u.nama)}</td>
      <td class="full"><div class="row"><button class="btn ghost sm" data-a="uEdit" data-id="${u.id}">Ubah</button><button class="btn ghost sm" data-a="uReset" data-id="${u.id}">Reset password</button><button class="btn danger sm" data-a="uDel" data-id="${u.id}">Hapus</button></div></td></tr>`).join('')||'<tr><td colspan="3" class="muted">Belum ada data.</td></tr>'}
    </tbody></table></div></div>`;
  }
  if(t==='mk'){
    b=`<div class="row between" style="margin-bottom:14px"><h2>Mata Kuliah (${DB.courses.length})</h2><button class="btn" data-a="cAdd">+ Tambah</button></div>
    <div class="card"><div class="tw"><table class="cards-m"><thead><tr><th>Kode</th><th>Nama</th><th class="num">SKS</th><th>Semester</th><th>Dosen</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
    ${DB.courses.map(c=>`<tr><td data-l="Kode">${esc(c.kode)}</td><td data-l="Nama">${esc(c.nama)}</td><td class="num" data-l="SKS">${c.sks}</td><td data-l="Semester">${esc(c.semester)}</td>
      <td data-l="Dosen">${esc(user(c.dosenId)?.nama||'-')}</td><td data-l="Status">${statusBadge(c)}</td>
      <td class="full"><div class="row"><button class="btn ghost sm" data-a="cEdit" data-id="${c.id}">Ubah</button><button class="btn danger sm" data-a="cDel" data-id="${c.id}">Hapus</button></div></td></tr>`).join('')}
    </tbody></table></div></div>`;
  }
  if(t==='plot'){
    const cid=UI.plotC||DB.courses[0]?.id; const c=course(cid);
    const students=DB.users.filter(u=>u.role==='mahasiswa');
    const enrolled=new Set(enrOf(cid).map(e=>e.m));
    b=`<h2 style="margin-bottom:14px">Plotting Dosen &amp; Mahasiswa</h2>
    <div class="card stack"><div class="grid g2"><div><label>Mata kuliah</label><select data-a="plotC">${DB.courses.map(x=>`<option value="${x.id}" ${x.id===cid?'selected':''}>${esc(x.kode+' - '+x.nama+' ('+x.semester+')')}</option>`).join('')}</select></div>
    <div><label>Dosen pengampu</label><select data-a="plotD">${DB.users.filter(u=>u.role==='dosen').map(d=>`<option value="${d.id}" ${c&&d.id===c.dosenId?'selected':''}>${esc(d.nama)}</option>`).join('')}</select></div></div>
    <div><label>Mahasiswa terdaftar (${enrolled.size} dari ${students.length})</label>
    <div class="grid g3">${students.map(s=>`<label style="font-weight:500;display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" style="width:auto" data-a="plotM" data-id="${s.id}" ${enrolled.has(s.id)?'checked':''}>${esc(s.nama)} <span class="muted small">${esc(s.nim)}</span></label>`).join('')}</div></div></div>`;
  }
  if(t==='khs'){
    const students=DB.users.filter(u=>u.role==='mahasiswa');
    const sid=UI.khsS||students[0]?.id;
    b=`<h2 style="margin-bottom:14px" class="no-print">Cetak KHS</h2><div class="card no-print row" style="margin-bottom:16px"><div style="flex:1;min-width:220px"><label>Mahasiswa</label><select data-a="khsS">${students.map(s=>`<option value="${s.id}" ${s.id===sid?'selected':''}>${esc(s.nim+' - '+s.nama)}</option>`).join('')}</select></div></div>`+khsView(sid);
  }
  return shell(adminTabs(),b);
}
function statusBadge(c){return c.published?'<span class="badge b-pub">Dipublikasi</span>':'<span class="badge b-draft">Draf</span>'}
