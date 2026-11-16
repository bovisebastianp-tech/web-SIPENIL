/* ============ DATA ============ */
let DB, SESSION=null, UI={}, LAST='', STORE_OK=true, LOAD_NOTES=[];

// Dosen dan mata kuliah: Jadwal Perkuliahan Sistem Informasi, Semester V Ganjil 2026/2027
// [username (nama depan), nama lengkap]
const DOSEN_AWAL = [
  ['joko','Joko Sarono, S.Kom., M.M.'],
  ['warno','Warno, M.Kom'],
  ['habibah','Habibah Nurfauziah, S.Kom., M.S.I.'],
  ['hendarto','Hendarto, S.Kom., M.Kom.'],
  ['imam','Imam Suprapta, S.E., M.M.'],
  ['mamun',"Ma'mun Johari, S.Kom., M.Kom."],
  ['mochammad','Mochammad Arief Sutisna, S.Kom., M.Kom.'],
  ['robby','Robby Al Aziz, S.Kom., M.Kom.']
];
// [kode, nama, sks, indeks dosen di DOSEN_AWAL]
const MK_AWAL = [
  ['FIK010508','Hukum Siber',2,0],
  ['FIK010610','Rekayasa Perangkat Lunak',3,1],
  ['FIK010607','Testing dan Implementasi Sistem',3,2],
  ['FIK010609','Interaksi Manusia dan Komputer',3,3],
  ['FIK010812','Sistem Informasi Akuntansi',3,4],
  ['FIK010809','Teknologi IoT',3,5],
  ['FIK010205','Dakwah Digital',3,6],
  ['FIK010306','Pemrograman III',3,7]
];
// [NIM, nama]
const MHS_AWAL = [
  ['2401010001','Denny Saputra'],['2401010003','Eva Yuliana'],['2401010004','Riska Nur Alifah'],
  ['2401010005','Alif Putra Abiyyu'],['2401010006','Muhammad Alif Rayzidan'],['2401010007','Ahmad Fauzan'],
  ['2401010008','Muhammad Revaldo'],['2401010010','Tria Ajrina'],['2401010011','Muhammad Aditya Syam Firdaus'],
  ['2401010013','Elsa Fajrian Syaharani'],['2401010015','Kharisma Shaqilaini'],['2401010016','Bovi Sebastian Pratama'],
  ['2401010017','Inas Raihanah Sani'],['2401010019','Madu Trya Hijridianti'],['2401010021','Dwi Mustafidah'],
  ['2401010022','Fadlan Hestu Syahputra'],['2401010023','Gojali Rahmatullah'],['2401010024','Indah Rahma Sahari'],
  ['2401010025','Kessya Ayu Mariam'],['2401010026','Maira Puspita'],['2401010028','Nurul Azmi'],
  ['2401010029','Syifa Aulia Salamah'],['2401010030','Teuku Ridwan Maulana'],['2401010031','Winda'],
  ['2401010032','Muksit Albani Fadila'],['2401010033','Ahmad Wahyudin'],['2401010037','Muhammad Khoirul Amri'],
  ['2401010039','Kafka Febrian'],['2401010041','Syahira Ramadhani'],['2401010045','Siti Hapshoh'],
  ['2401010046','Muhammad Luthfi Bukhari']
];

const emptyScores = () => ({kehadiran:null,tugas1:null,tugas2:null,uts:null,uas:null});
const initialPw = role => role==='admin'?PW_ADMIN_DEFAULT:PW_DEFAULT;
const defaultConfig = () => ({scale:DEFAULT_SCALE.map(x=>x.slice()), passMinPoint:1, semAktif:SEM_NOW});

// Akun baru: pw=null berarti "masih memakai password awal" (tidak ada password yang disimpan).
// Setelah pengguna mengganti password, pw berisi hash PBKDF2 + salt.
function seed(){
  const d={v:DB_VERSION,config:defaultConfig(),users:[],courses:[],enr:[],log:[]};
  d.users.push({id:'a1',role:'admin',username:'admin',pw:null,mustChange:true,nama:'Admin Akademik'});
  DOSEN_AWAL.forEach((x,i)=>d.users.push({id:'d'+(i+1),role:'dosen',username:x[0],pw:null,mustChange:true,nama:x[1]}));
  MHS_AWAL.forEach((m,i)=>d.users.push({id:'m'+(i+1),role:'mahasiswa',username:m[0],nim:m[0],pw:null,mustChange:true,nama:m[1]}));
  const W={kehadiran:10,tugas1:10,tugas2:10,uts:30,uas:40};
  MK_AWAL.forEach((k,i)=>d.courses.push({id:'c'+(i+1),kode:k[0],nama:k[1],sks:k[2],semester:SEM_NOW,dosenId:'d'+(k[3]+1),w:{...W},published:false,locked:false}));
  // semua mahasiswa terdaftar di semua mata kuliah semester ini; nilai masih kosong
  d.users.filter(u=>u.role==='mahasiswa').forEach(u=>{
    d.courses.forEach(c=>d.enr.push({c:c.id,m:u.id,s:emptyScores()}));
  });
  return d;
}

// Migrasi data lama (v2: password plaintext, semester teks bebas, data yatim) ke v3. Idempotent.
async function migrate(d){
  const notes=[];
  if(!d.config) d.config=defaultConfig();
  d.config.scale = validScale(d.config.scale)?d.config.scale:DEFAULT_SCALE.map(x=>x.slice());
  if(d.config.passMinPoint==null) d.config.passMinPoint=1;
  if(!d.config.semAktif) d.config.semAktif=SEM_NOW;
  if(!Array.isArray(d.log)) d.log=[];
  for(const u of d.users){
    if('password' in u){
      if(u.password===initialPw(u.role)){u.pw=null;u.mustChange=true}
      else if(u.password){u.pw=await hashPw(String(u.password));u.mustChange=false}
      else {u.pw=null;u.mustChange=true}
      delete u.password; notes.push(`Password plaintext akun "${u.username}" dihapus dari penyimpanan.`);
    }
    if(u.pw===undefined) u.pw=null;
    if(u.mustChange===undefined) u.mustChange=!u.pw;
    if(u.role==='mahasiswa'&&!u.nim) u.nim=u.username;
  }
  const seenKode=new Set();
  for(const c of d.courses){
    c.w=c.w||{}; COMP.forEach(([k])=>{const v=+c.w[k];c.w[k]=isFinite(v)&&v>=0?v:0});
    c.sks=Math.max(1,Math.round(+c.sks||1));
    c.published=!!c.published; c.locked=!!c.locked;
    const ps=parseSem(c.semester);
    if(ps) c.semester=ps.name; else notes.push(`Mata kuliah ${c.kode}: format semester "${c.semester}" tidak baku (contoh: Ganjil 2026/2027).`);
    const kk=String(c.kode).trim().toLowerCase()+'|'+semName(c.semester).toLowerCase();
    if(seenKode.has(kk)) notes.push(`Kode mata kuliah ganda: ${c.kode} (${c.semester}).`); seenKode.add(kk);
    if(c.published&&Math.abs(COMP.reduce((t,[k])=>t+c.w[k],0)-100)>0.005) notes.push(`Mata kuliah ${c.kode} dipublikasi dengan total bobot bukan 100%.`);
  }
  const uids=new Set(d.users.map(u=>u.id)), cids=new Set(d.courses.map(c=>c.id)), pair=new Set();
  const before=d.enr.length;
  d.enr=d.enr.filter(e=>{
    if(!uids.has(e.m)||!cids.has(e.c)) return false;
    const k=e.c+'|'+e.m; if(pair.has(k)) return false; pair.add(k);
    e.s={...emptyScores(),...(e.s||{})};
    for(const [k2] of COMP){const v=e.s[k2]; e.s[k2]=(v===''||v==null||isNaN(+v))?null:Math.min(100,Math.max(0,+v))}
    return true;
  });
  if(before!==d.enr.length) notes.push(`${before-d.enr.length} data pendaftaran yatim/duplikat dibersihkan.`);
  d.log=d.log.filter(l=>l&&(!l.c||cids.has(l.c)));
  d.v=DB_VERSION;
  return notes;
}
function validScale(s){
  return Array.isArray(s)&&s.length>=2&&s.every(g=>Array.isArray(g)&&g.length===3&&typeof g[0]==='string'&&isFinite(g[1])&&isFinite(g[2]))
    &&s.some(g=>+g[1]===0);
}

async function load(){
  try{localStorage.removeItem('sipenil.v1')}catch(e){} // data demo lama
  let raw=null;
  try{raw=localStorage.getItem(KEY)}catch(e){STORE_OK=false}
  if(raw){
    try{DB=JSON.parse(raw)}catch(e){
      // data rusak: JANGAN ditimpa diam-diam. Simpan salinan untuk pemulihan manual.
      try{localStorage.setItem(KEY+'.rusak-'+Date.now(),raw)}catch(_){}
      LOAD_NOTES.push('Data tersimpan rusak dan tidak dapat dibaca. Salinan dicadangkan; data awal dimuat.');
      DB=null;
    }
    if(DB&&(!Array.isArray(DB.users)||!Array.isArray(DB.courses)||!Array.isArray(DB.enr))){
      try{localStorage.setItem(KEY+'.rusak-'+Date.now(),raw)}catch(_){}
      LOAD_NOTES.push('Struktur data tidak valid. Salinan dicadangkan; data awal dimuat.');
      DB=null;
    }
  }
  if(!DB){DB=seed()}
  else if((DB.v||2)<DB_VERSION) LOAD_NOTES.push(...await migrate(DB));
  SCALE=DB.config.scale;
  save();
  try{SESSION=sessionStorage.getItem('sipenil.u')}catch(e){}
  if(SESSION&&!user(SESSION)) SESSION=null;
  if(LOAD_NOTES.length) console.warn('[SIPENIL] Catatan pemuatan data:\n- '+LOAD_NOTES.join('\n- '));
}
// Mengembalikan true bila tersimpan. Bila gagal (kuota penuh / penyimpanan diblokir), perubahan
// di memori DIBATALKAN supaya tampilan tidak menunjukkan data yang tidak benar-benar tersimpan.
function save(){
  const s=JSON.stringify(DB);
  try{
    localStorage.setItem(KEY,s); LAST=s; STORE_OK=true; return true;
  }catch(e){
    STORE_OK=false;
    if(LAST){ try{DB=JSON.parse(LAST);SCALE=DB.config.scale}catch(_){} }
    toast('Gagal menyimpan: penyimpanan browser penuh atau diblokir. Perubahan dibatalkan.',6000);
    if(typeof render==='function'&&LAST) render();
    return false;
  }
}
const user = id => DB.users.find(u=>u.id===id);
const course = id => DB.courses.find(c=>c.id===id);
const me = () => SESSION?user(SESSION):null;
const enrOf = c => DB.enr.filter(e=>e.c===c);
const semNow = () => semName(DB.config.semAktif||SEM_NOW);
function logAdd(courseId,text){DB.log.unshift({t:now(),by:me()?.nama||'-',c:courseId,text});DB.log=DB.log.slice(0,3000)}

/* ============ KHS ============ */
// Semua mata kuliah yang sudah dipublikasi dihitung untuk IPS/IPK (termasuk nilai E).
// SKS "lulus" hanya yang bobot mutunya >= DB.config.passMinPoint (bawaan: 1 = D).
function khsOf(studentId){
  const rows=DB.enr.filter(e=>e.m===studentId).map(e=>({c:course(e.c),s:e.s})).filter(x=>x.c&&x.c.published)
    .map(x=>({...x,r:calc(x.c,x.s)}));
  const bySem={};
  rows.forEach(r=>{const k=semName(r.c.semester);(bySem[k]=bySem[k]||[]).push(r)});
  const sum=(a,f)=>a.reduce((t,r)=>t+f(r),0);
  const ip=a=>{const s=sum(a,r=>r.c.sks);return s?r2(sum(a,r=>r.c.sks*r.r.point)/s):0};
  const min=DB.config.passMinPoint??1;
  return {bySem, sems:Object.keys(bySem).sort(cmpSem), ipk:ip(rows),
    sks:sum(rows,r=>r.c.sks), sksLulus:sum(rows.filter(r=>r.r.point>=min),r=>r.c.sks),
    ips:s=>ip(bySem[s]||[])};
}
const pill = (l)=>l?`<span class="g-pill g-${esc(l)}">${esc(l)}</span>`:`<span class="g-pill g-none">-</span>`;
