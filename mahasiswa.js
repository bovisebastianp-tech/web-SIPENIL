/* ============ MAHASISWA ============ */
function viewMhs(){
  const u=me(); const t=UI.tab;
  const tabs=[['dash','Nilai Saya'],['khs','KHS']];
  let b='';
  if(t==='khs'){ b=khsView(u.id) }
  else{
    const k=khsOf(u.id);
    const mine=DB.enr.filter(e=>e.m===u.id).map(e=>({c:course(e.c),s:e.s})).filter(x=>x.c);
    const cur=mine.filter(x=>x.c.semester===SEM_NOW);
    b=`<h1 style="margin-bottom:14px">Halo, ${esc(u.nama.split(' ')[0])}</h1>
    <div class="grid g3" style="margin-bottom:20px"><div class="card stat"><div class="muted small">IPK</div><div class="n">${k.sks?k.ipk.toFixed(2):'-'}</div></div>
    <div class="card stat"><div class="muted small">SKS lulus (dipublikasi)</div><div class="n">${k.sks}</div></div>
    <div class="card stat"><div class="muted small">Semester berjalan</div><div class="n" style="font-size:1.1rem;padding-top:8px">${SEM_NOW}</div></div></div>
    <h2 style="margin-bottom:12px">Nilai semester berjalan</h2>
    <div class="grid g2">${cur.map(x=>courseCard(x)).join('')||'<div class="card muted">Belum terdaftar di mata kuliah semester ini.</div>'}</div>`;
  }
  return shell(tabs,b);
}
function courseCard({c,s}){
  const r=calc(c,s);
  const sel=UI.sim[c.id]||{t:'A'};
  const tg=SCALE.find(x=>x[0]===sel.t)[1];
  const simKey='uas';
  let res='';
  const sm=simulate(c,s,simKey,tg);
  if(sm.type==='nobobot') res='Bobot UAS pada mata kuliah ini 0%, simulasi tidak tersedia.';
  else if(sm.type==='done') res=`Nilai UAS sudah masuk (${fmt(s.uas)}). Nilai akhir ${c.published?'':'sementara '}${fmt(r.total)}.`;
  else if(sm.type==='impossible') res=`Target ${sel.t} tidak mungkin dicapai: butuh UAS ${fmt(sm.need)} (di atas 100).`;
  else if(sm.type==='safe') res=`Target ${sel.t} sudah aman, berapa pun nilai UAS-mu.`;
  else res=`Kamu perlu nilai UAS minimal <b>${fmt(sm.need)}</b> untuk mendapat ${sel.t}.`;
  const extra=(sm.empty&&sm.empty.length)?`<div class="small" style="margin-top:6px;font-weight:500">Komponen belum masuk (${sm.empty.map(lbl).join(', ')}) dihitung 0.</div>`:'';
  return `<div class="card"><div class="row between"><div><div class="muted small">${esc(c.kode)} &middot; ${c.sks} SKS</div><h3>${esc(c.nama)}</h3></div>
    ${c.published?pill(r.letter):'<span class="badge b-draft">Belum final</span>'}</div>
    <div class="comps">${COMP.map(([k,l])=>`<div class="comp"><small>${l} &middot; ${c.w[k]}%</small><b>${s[k]==null?'-':fmt(s[k])}</b><div class="bar"><i style="width:${s[k]??0}%"></i></div></div>`).join('')}</div>
    <div>${c.published?`Nilai akhir: <b>${fmt(r.total)}</b> (${r.letter})`:`Poin terkumpul sementara: <b>${fmt(r.acc)}</b> dari bobot terisi ${r.filledW}%`}</div>
    ${c.published?'':`<div class="small muted">Nilai akhir muncul setelah dosen mempublikasikan.</div>
    <div class="sim"><b>Simulasi target nilai</b><div class="row" style="margin-top:8px"><label style="margin:0">Target nilai akhir</label>
    <select style="width:auto" data-a="simT" data-id="${c.id}">${SCALE.slice(0,4).map(g=>`<option ${g[0]===sel.t?'selected':''}>${g[0]}</option>`).join('')}</select></div>
    <div class="res">${res}</div>${extra}</div>`}</div>`;
}
