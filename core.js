/* ============ KONFIGURASI ============ */
const COMP = [['kehadiran','Kehadiran'],['tugas1','Tugas 1'],['tugas2','Tugas 2'],['uts','UTS'],['uas','UAS']];
// Skala bawaan: [huruf, nilai minimum, bobot mutu]. Nilai aktif disimpan di DB.config.scale (lihat data.js).
const DEFAULT_SCALE = [['A',85,4],['B',70,3],['C',55,2],['D',40,1],['E',0,0]];
let SCALE = DEFAULT_SCALE.map(x=>x.slice());
const SEM_NOW = 'Ganjil 2026/2027';   // bawaan; semester aktif sebenarnya: semNow()
const KEY = 'sipenil.v2';              // kunci localStorage dipertahankan agar data lama terbaca
const DB_VERSION = 3;
const PW_MIN = 8;
const PW_DEFAULT = 'test123';          // password awal dosen dan mahasiswa
const PW_ADMIN_DEFAULT = 'admin123';   // password awal admin

/* ============ UTIL ============ */
const $ = (s,e=document)=>e.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>b.toString(36).padStart(2,'0')).join('').slice(0,10);
// pembulatan half-up 2 desimal yang kebal galat floating point (84.995 -> 85, bukan 84.99)
const r2 = n => Math.round(parseFloat((n*100).toPrecision(12)))/100;
const fmt = n => (n==null||isNaN(n))?'-':String(r2(n)).replace('.',',');
const now = () => new Date().toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});
function toast(m,ms){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),ms||(m.length>70?4500:2600))}
// normalisasi username: tidak peka huruf besar/kecil; spasi dan tanda petik diabaikan (Ma'mun = mamun)
const normUser = s => String(s??'').toLowerCase().replace(/['’`\s]/g,'');

/* ============ SEMESTER ============ */
// Format baku: "Ganjil 2026/2027" atau "Genap 2026/2027" (tahun kedua = tahun pertama + 1)
function parseSem(str){
  const m=/^(ganjil|genap)\s+(\d{4})\s*\/\s*(\d{4})$/i.exec(String(str??'').trim());
  if(!m) return null;
  const y1=+m[2], y2=+m[3]; if(y2!==y1+1) return null;
  const term=m[1].toLowerCase()==='ganjil'?1:2;
  return {term,y1,y2,name:`${term===1?'Ganjil':'Genap'} ${y1}/${y2}`,key:y1*10+term};
}
const semName = s => parseSem(s)?.name ?? String(s??'').trim();
// urutan kronologis: tahun akademik dulu, baru Ganjil sebelum Genap
function cmpSem(a,b){
  const x=parseSem(a), y=parseSem(b);
  if(x&&y) return x.key-y.key; if(x) return -1; if(y) return 1;
  return String(a).localeCompare(String(b));
}

/* ============ KALKULASI ============ */
function gradeOf(n){
  const s=[...SCALE].sort((a,b)=>b[1]-a[1]);
  for(const g of s) if(n>=g[1]) return {l:g[0],p:g[2]};
  const last=s[s.length-1]; return {l:last[0],p:last[2]};
}
// Nilai akhir dibulatkan 2 desimal LEBIH DULU, baru dikonversi ke huruf, supaya angka yang tampil
// dan huruf mutu selalu konsisten. Komponen kosong dihitung 0 sampai semuanya terisi.
function calc(course, s){
  let acc=0, filledW=0, wSum=0; const missing=[];
  for(const [k] of COMP){
    const w=+course.w[k]||0; wSum+=w;
    const v=s?s[k]:null;
    if(v==null||v===''||isNaN(+v)){ if(w>0) missing.push(k); continue }
    acc += w*(+v)/100; filledW += w;
  }
  const total=r2(acc), g=gradeOf(total);
  return {total, acc:total, filledW:r2(filledW), wSum:r2(wSum), weightOk:Math.abs(wSum-100)<0.005,
          missing, complete:missing.length===0, letter:g.l, point:g.p};
}
// Nilai minimum komponen `key` agar nilai akhir (yang sudah dibulatkan) >= target
function simulate(course, s, key, target){
  const w=+course.w[key]||0;
  if(!w) return {type:'nobobot'};
  if(s[key]!=null) return {type:'done'};
  let others=0, empty=[];
  for(const [k] of COMP){ if(k===key) continue; const wk=+course.w[k]||0;
    if(s[k]!=null) others += wk*s[k]/100; else if(wk>0) empty.push(k) }
  let need=Math.ceil(((target-0.005-others)/w*100)*100-1e-9)/100;   // batas bawah sebelum pembulatan
  if(need<=0) return {type:'safe',empty};
  // verifikasi lewat calc() agar rumus simulasi dan rumus nilai akhir tidak pernah berbeda
  for(let i=0;i<5 && need<=100;i++){
    if(calc(course,{...s,[key]:need}).total>=target) break;
    need=r2(need+0.01);
  }
  if(need>100) return {type:'impossible',need:r2(need),empty};
  return {type:'need',need,empty};
}
const lbl = k => COMP.find(c=>c[0]===k)[1];

/* ============ IMPOR CSV ============ */
// Pemisah dideteksi dari baris pertama: koma, titik koma, atau tab (di luar tanda kutip).
function csvDelim(text){
  const first=text.split(/\r\n|\n|\r/).find(l=>l.trim())||'';
  let best=',', bc=-1;
  for(const d of [',',';','\t']){
    let n=0,q=false;
    for(const ch of first){ if(ch==='"') q=!q; else if(!q&&ch===d) n++ }
    if(n>bc){best=d;bc=n}
  }
  return best;
}
// Parser sesuai RFC 4180: sel berkutip boleh memuat pemisah, baris baru, dan "" (kutip ganda).
function csvTokenize(text, delim){
  const rows=[]; let row=[], cell='', q=false, line=1, startLine=1;
  const endCell=()=>{row.push(cell);cell=''};
  const endRow=()=>{endCell(); if(row.some(c=>c.trim()!=='')) rows.push({line:startLine,cells:row.map(c=>c.trim())}); row=[]};
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){
      if(ch==='"'){ if(text[i+1]==='"'){cell+='"';i++} else q=false }
      else { if(ch==='\n') line++; cell+=ch }
    }
    else if(ch==='"' && cell.trim()===''){ q=true; cell='' }
    else if(ch===delim){ endCell() }
    else if(ch==='\r'){ if(text[i+1]==='\n') i++; line++; endRow(); startLine=line }
    else if(ch==='\n'){ line++; endRow(); startLine=line }
    else cell+=ch;
  }
  if(q) return {rows,error:`Tanda kutip dibuka tetapi tidak ditutup (mulai baris ${startLine}).`};
  endRow();
  return {rows};
}
const HEAD_ALIAS={nim:'nim',nomorinduk:'nim',nomorindukmahasiswa:'nim',kehadiran:'kehadiran',presensi:'kehadiran',hadir:'kehadiran',
  tugas1:'tugas1',tugas2:'tugas2',uts:'uts',uas:'uas'};
const hnorm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
// Nilai: angka 0-100 dengan maksimal 2 desimal; desimal boleh memakai titik atau koma (koma harus berkutip bila pemisah juga koma)
function parseScoreCell(raw){
  const t=String(raw).trim();
  if(!/^[-+]?\d+(?:[.,]\d+)?$/.test(t)) return {err:`bukan angka ("${t}")`};
  if(!/^[-+]?\d+(?:[.,]\d{1,2})?$/.test(t)) return {err:`maksimal 2 angka desimal ("${t}")`};
  const v=parseFloat(t.replace(',','.'));
  if(v<0||v>100) return {err:`di luar rentang 0-100 (${t})`};
  return {v};
}
// Membuat rencana impor TANPA mengubah data. Semua-atau-tidak-sama-sekali: bila ada galat, tidak ada nilai yang diterapkan.
function csvPlan(text, cid){
  const out={rows:[],errors:[],warnings:[],changed:0,unchanged:0};
  const err=(line,msg)=>out.errors.push({line,msg});
  text=String(text??'').replace(/^﻿/,'');
  if(!text.trim()){err(0,'Data CSV kosong.');return out}
  const t=csvTokenize(text,csvDelim(text));
  if(t.error){err(0,t.error);return out}
  const rows=t.rows;
  if(!rows.length){err(0,'Tidak ada baris data.');return out}
  let cols=['nim','kehadiran','tugas1','tugas2','uts','uas'];
  if(rows[0].cells.some(c=>HEAD_ALIAS[hnorm(c)]==='nim')){
    const head=rows.shift();
    cols=head.cells.map(c=>HEAD_ALIAS[hnorm(c)]||null);
    head.cells.forEach((c,i)=>{if(c&&!cols[i]) out.warnings.push(`Kolom "${c}" tidak dikenal dan diabaikan.`)});
    const seen=new Set();
    cols.forEach(c=>{if(c){ if(seen.has(c)) err(head.line,`Kolom "${c}" muncul lebih dari sekali.`); seen.add(c)}});
    if(!cols.some(c=>c&&c!=='nim')) err(head.line,'Header tidak memuat kolom nilai (kehadiran, tugas1, tugas2, uts, uas).');
    if(out.errors.length) return out;
  }
  if(!rows.length){err(0,'Tidak ada baris data setelah header.');return out}
  const iNim=cols.indexOf('nim'); const seenNim=new Map();
  for(const r of rows){
    if(r.cells.length>cols.length){err(r.line,`Kolom berlebih (${r.cells.length}, seharusnya maksimal ${cols.length}). Periksa tanda koma/kutip.`);continue}
    let nim=(r.cells[iNim]||'').replace(/^'/,'').trim();
    if(!nim){err(r.line,'NIM kosong.');continue}
    if(/^\d(?:[.,]\d+)?e[+-]?\d+$/i.test(nim)){err(r.line,`NIM "${nim}" terbaca sebagai angka ilmiah (efek Excel). Format kolom NIM sebagai teks lalu ekspor ulang.`);continue}
    if(seenNim.has(nim)){err(r.line,`NIM ${nim} duplikat (sudah muncul di baris ${seenNim.get(nim)}).`);continue}
    seenNim.set(nim,r.line);
    const m=DB.users.find(u=>u.role==='mahasiswa'&&u.nim===nim);
    if(!m){err(r.line,`NIM ${nim} tidak ditemukan.`);continue}
    const e=DB.enr.find(x=>x.c===cid&&x.m===m.id);
    if(!e){err(r.line,`${nim} (${m.nama}) tidak terdaftar di mata kuliah ini.`);continue}
    const changes=[]; let bad=false, any=false;
    cols.forEach((k,i)=>{
      if(!k||k==='nim') return;
      const raw=r.cells[i]; if(raw===undefined||raw==='') return;
      any=true;
      const p=parseScoreCell(raw);
      if(p.err){err(r.line,`${nim} kolom ${lbl(k)}: ${p.err}`);bad=true;return}
      if(e.s[k]!==p.v) changes.push({k,old:e.s[k],n:p.v});
    });
    if(bad) continue;
    if(!any){out.warnings.push(`Baris ${r.line} (${nim}) tidak berisi nilai, dilewati.`);continue}
    if(changes.length){out.changed++;out.rows.push({line:r.line,nim,m,e,changes})} else out.unchanged++;
  }
  return out;
}

/* ============ PASSWORD (PBKDF2-SHA256 via Web Crypto) ============ */
// Catatan: ini perlindungan tahap awal di sisi browser. Autentikasi sungguhan dipindahkan ke server pada Tahap 2.
const PBKDF2_ITER = 210000;
const b64 = u8 => btoa(String.fromCharCode(...u8));
const unb64 = s => Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function hashPw(pw, salt, iter=PBKDF2_ITER){
  if(!(globalThis.crypto&&crypto.subtle)) throw new Error('NO_SUBTLE');
  salt = salt || crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:iter},key,256);
  return {alg:'pbkdf2-sha256',iter,salt:b64(salt),hash:b64(new Uint8Array(bits))};
}
function sameStr(a,b){a=String(a);b=String(b);let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0}
async function verifyPw(pw, rec){
  const h = await hashPw(pw, unb64(rec.salt), rec.iter);
  return sameStr(h.hash, rec.hash);
}
