/* ============ DOSEN ============ */
function viewDosen(){
  const u=me();
  if(UI.cid){return shell([['courses','Mata Kuliah Saya']],viewCourse(UI.cid))}
  const list=DB.courses.filter(c=>c.dosenId===u.id);
  const b=`<h1 style="margin-bottom:4px">Mata kuliah yang diampu</h1><p class="muted" style="margin:0 0 16px">Pilih mata kuliah untuk mengatur bobot dan mengisi nilai.</p>
  <div class="grid g2">${list.map(c=>{const n=enrOf(c.id).length;const done=enrOf(c.id).filter(e=>calc(c,e.s).complete).length;
    return `<div class="card stack"><div class="row between"><b>${esc(c.kode)}</b>${statusBadge(c)}</div><h3>${esc(c.nama)}</h3>
    <div class="muted small">${c.sks} SKS &middot; ${esc(c.semester)}<br>${n} mahasiswa &middot; ${done} nilai lengkap</div>
    <div class="bar"><i style="width:${n?done/n*100:0}%"></i></div>
    <button class="btn" data-a="open" data-id="${c.id}">Kelola nilai</button></div>`}).join('')||'<div class="card muted">Belum ada mata kuliah yang ditugaskan oleh admin.</div>'}</div>`;
  return shell([['courses','Mata Kuliah Saya']],b);
}
function viewCourse(cid){
  const c=course(cid); if(!c) return '';
  const tab=UI.ctab||'nilai';
  const head=`<button class="btn ghost sm no-print" data-a="back">&larr; Kembali</button>
  <div class="row between" style="margin:14px 0 0"><div><h1>${esc(c.nama)}</h1><div class="muted small">${esc(c.kode)} &middot; ${c.sks} SKS &middot; ${esc(c.semester)}</div></div>
  <div class="row">${statusBadge(c)}${c.locked?'<span class="badge b-lock">Terkunci</span>':''}</div></div>
  <div class="sub-tabs">${[['nilai','Input Nilai'],['bobot','Bobot Nilai'],['impor','Impor CSV'],['rekap','Rekap & Publikasi'],['log','Riwayat Perubahan']].map(t=>`<button class="${tab===t[0]?'on':''}" data-a="ctab" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  let b='';
  const lockNote=c.locked?`<div class="alert info" style="margin-bottom:14px">Nilai sudah dikunci &amp; dipublikasi. Buka kunci (dengan alasan) di tab <b>Rekap &amp; Publikasi</b> untuk melakukan koreksi.</div>`:'';
  if(tab==='nilai'){
    const es=enrOf(cid);
    b=lockNote+`<div class="card"><div class="tw"><table class="cards-m"><thead><tr><th>NIM</th><th>Nama</th>${COMP.map(k=>`<th class="num">${k[1]}<br><span style="font-weight:500">${c.w[k[0]]}%</span></th>`).join('')}<th class="num">Akhir</th><th class="num">Huruf</th></tr></thead><tbody>
    ${es.map(e=>{const r=calc(c,e.s),m=user(e.m);return `<tr data-m="${e.m}"><td data-l="NIM">${esc(m.nim)}</td><td data-l="Nama"><b>${esc(m.nama)}</b></td>
      ${COMP.map(k=>`<td class="num" data-l="${k[1]} (${c.w[k[0]]}%)"><input type="number" min="0" max="100" step="0.01" inputmode="decimal" data-score="${e.m}|${k[0]}" value="${e.s[k[0]]??''}" ${c.locked?'disabled':''} aria-label="${k[1]} ${esc(m.nama)}"></td>`).join('')}
      <td class="num" data-l="Nilai akhir" data-cell="tot">${fmt(r.total)}</td><td class="num" data-l="Huruf" data-cell="g">${pill(r.letter)}</td></tr>`}).join('')||'<tr><td colspan="9" class="muted">Belum ada mahasiswa. Admin dapat mendaftarkan lewat menu Plotting.</td></tr>'}
    </tbody></table></div><p class="small muted" style="margin:12px 0 0">Kosongkan kolom jika belum dinilai. Nilai akhir menghitung komponen kosong sebagai 0 sampai semuanya terisi. Perubahan tersimpan otomatis.</p></div>`;
  }
  if(tab==='bobot'){
    const sum=COMP.reduce((t,k)=>t+(+c.w[k[0]]||0),0);
    b=lockNote+`<div class="card stack"><div class="grid g3">${COMP.map(k=>`<div><label>${k[1]} (%)</label><input type="number" min="0" max="100" data-w="${k[0]}" value="${c.w[k[0]]}" ${c.locked?'disabled':''}></div>`).join('')}</div>
    <div class="row between"><div>Total bobot: <span id="wsum" class="wsum ${sum===100?'ok':'bad'}">${sum}%</span> <span class="muted small">(wajib 100%)</span></div>
    <button class="btn" data-a="wSave" ${c.locked?'disabled':''}>Simpan bobot</button></div></div>
    <div class="card" style="margin-top:16px"><h3 style="margin-bottom:8px">Skala huruf mutu</h3><div class="row">${SCALE.map(s=>`<span>${pill(s[0])} <span class="small muted">&ge; ${s[1]} (${s[2].toFixed(1)})</span></span>`).join('')}</div></div>`;
  }
  if(tab==='impor'){
    b=lockNote+`<div class="card stack"><p style="margin:0">Tempel data atau pilih berkas CSV dengan kolom:<br><code>NIM,kehadiran,tugas1,tugas2,uts,uas</code></p>
    <input type="file" id="csvFile" accept=".csv,.txt,text/csv" ${c.locked?'disabled':''}>
    <textarea id="csvText" rows="7" placeholder="2401001,95,80,85,70,78&#10;2401002,90,75,,60," ${c.locked?'disabled':''}></textarea>
    <div class="row"><button class="btn" data-a="csvGo" ${c.locked?'disabled':''}>Impor nilai</button><span class="small muted">Sel kosong akan dilewati (nilai lama tidak diubah).</span></div></div>`;
  }
  if(tab==='rekap'){
    const es=enrOf(cid);const rs=es.map(e=>calc(c,e.s));const done=rs.filter(r=>r.complete).length;
    const avg=rs.length?rs.reduce((t,r)=>t+r.total,0)/rs.length:0;
    const dist={};SCALE.forEach(s=>dist[s[0]]=0);rs.forEach(r=>dist[r.letter]++);
    b=`<div class="grid g3"><div class="card stat"><div class="muted small">Mahasiswa</div><div class="n">${es.length}</div></div>
    <div class="card stat"><div class="muted small">Nilai lengkap</div><div class="n">${done}/${es.length}</div></div>
    <div class="card stat"><div class="muted small">Rata-rata nilai akhir</div><div class="n">${fmt(avg)}</div></div></div>
    <div class="card" style="margin-top:16px"><h3 style="margin-bottom:10px">Sebaran huruf mutu</h3><div class="row">${SCALE.map(s=>`<span>${pill(s[0])} <b>${dist[s[0]]}</b></span>`).join('')}</div></div>
    <div class="card stack" style="margin-top:16px"><h3>Publikasi</h3>
    ${c.published?`<div class="alert info">Nilai akhir sudah dapat dilihat mahasiswa. Untuk koreksi, buka kunci terlebih dahulu; setiap perubahan dicatat di riwayat.</div><div><button class="btn danger" data-a="unlock">Buka kunci untuk koreksi</button></div>`
    :`<p class="muted" style="margin:0">Sebelum dipublikasi, mahasiswa hanya melihat nilai komponen. Setelah "Kunci &amp; Publikasi", nilai akhir dan huruf mutu muncul dan input dikunci.</p>
    ${done<es.length?`<div class="alert">Masih ada ${es.length-done} mahasiswa dengan komponen nilai kosong (dihitung 0).</div>`:''}
    <div><button class="btn" data-a="publish" ${es.length?'':'disabled'}>Kunci &amp; Publikasi</button></div>`}</div>`;
  }
  if(tab==='log'){
    const L=DB.log.filter(l=>l.c===cid);
    b=`<div class="card"><div class="tw"><table class="cards-m"><thead><tr><th>Waktu</th><th>Oleh</th><th>Perubahan</th></tr></thead><tbody>
    ${L.map(l=>`<tr><td data-l="Waktu">${esc(l.t)}</td><td data-l="Oleh">${esc(l.by)}</td><td data-l="Perubahan">${esc(l.text)}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Belum ada catatan.</td></tr>'}</tbody></table></div></div>`;
  }
  return head+b;
}
