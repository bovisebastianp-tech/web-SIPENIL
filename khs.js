/* ============ KHS ============ */
function khsView(sid){
  const s=user(sid); if(!s) return '';
  const k=khsOf(sid); const sems=Object.keys(k.bySem).sort();
  if(!sems.length) return `<div class="card"><p class="muted" style="margin:0">Belum ada nilai akhir yang dipublikasi.</p></div>`;
  return `<div class="card stack"><div class="row between"><div><h2>Kartu Hasil Studi</h2><div class="muted small">${esc(s.nama)} &middot; NIM ${esc(s.nim)}</div></div>
    <button class="btn no-print" onclick="window.print()">Cetak / Simpan PDF</button></div>
    ${sems.map(sm=>`<div><h3 style="margin-bottom:8px">Semester ${esc(sm)}</h3><div class="tw"><table><thead><tr><th>Kode</th><th>Mata Kuliah</th><th class="num">SKS</th><th class="num">Nilai</th><th class="num">Huruf</th><th class="num">Mutu</th></tr></thead><tbody>
    ${k.bySem[sm].map(r=>`<tr><td>${esc(r.c.kode)}</td><td>${esc(r.c.nama)}</td><td class="num">${r.c.sks}</td><td class="num">${fmt(r.r.total)}</td><td class="num">${pill(r.r.letter)}</td><td class="num">${r.r.point.toFixed(1)}</td></tr>`).join('')}
    </tbody></table></div><p style="margin:8px 0 0"><b>IPS: ${k.ips(sm).toFixed(2)}</b></p></div>`).join('')}
    <div class="alert info"><b>IPK: ${k.ipk.toFixed(2)}</b> &middot; Total SKS: ${k.sks}</div>
    <p class="small muted print-only">Dicetak dari SIPENIL pada ${now()}.</p></div>`;
}
