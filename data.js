/* ============ DATA ============ */
let DB, SESSION=null, UI={};

const PW_DEFAULT = 'test123'; // password awal dosen dan mahasiswa

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

function seed(){
  const d={users:[],courses:[],enr:[],log:[]};
  d.users.push({id:'a1',role:'admin',username:'admin',password:'admin123',nama:'Admin Akademik'});
  DOSEN_AWAL.forEach((x,i)=>d.users.push({id:'d'+(i+1),role:'dosen',username:x[0],password:PW_DEFAULT,nama:x[1]}));
  MHS_AWAL.forEach((m,i)=>d.users.push({id:'m'+(i+1),role:'mahasiswa',username:m[0],nim:m[0],password:PW_DEFAULT,nama:m[1]}));
  const W={kehadiran:10,tugas1:10,tugas2:10,uts:30,uas:40};
  MK_AWAL.forEach((k,i)=>d.courses.push({id:'c'+(i+1),kode:k[0],nama:k[1],sks:k[2],semester:SEM_NOW,dosenId:'d'+(k[3]+1),w:{...W},published:false,locked:false}));
  // semua mahasiswa terdaftar di semua mata kuliah semester ini; nilai masih kosong
  d.users.filter(u=>u.role==='mahasiswa').forEach(u=>{
    d.courses.forEach(c=>d.enr.push({c:c.id,m:u.id,s:{kehadiran:null,tugas1:null,tugas2:null,uts:null,uas:null}}));
  });
  return d;
}
function load(){
  try{localStorage.removeItem('sipenil.v1')}catch(e){} // data demo lama
  try{DB=JSON.parse(localStorage.getItem(KEY))}catch(e){}
  if(!DB||!DB.users){DB=seed();save()}
  try{SESSION=sessionStorage.getItem('sipenil.u')}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}}
const user = id => DB.users.find(u=>u.id===id);
const course = id => DB.courses.find(c=>c.id===id);
const me = () => user(SESSION);
const enrOf = c => DB.enr.filter(e=>e.c===c);
function logAdd(courseId,text){DB.log.unshift({t:now(),by:me().nama,c:courseId,text});DB.log=DB.log.slice(0,300)}

/* ============ KHS ============ */
function khsOf(studentId){
  const rows=DB.enr.filter(e=>e.m===studentId).map(e=>({c:course(e.c),s:e.s})).filter(x=>x.c&&x.c.published)
    .map(x=>({...x,r:calc(x.c,x.s)}));
  const bySem={};
  rows.forEach(r=>(bySem[r.c.semester]=bySem[r.c.semester]||[]).push(r));
  const ip=a=>{const s=a.reduce((t,r)=>t+r.c.sks,0);return s?a.reduce((t,r)=>t+r.c.sks*r.r.point,0)/s:0};
  return {bySem,ipk:ip(rows),sks:rows.reduce((t,r)=>t+r.c.sks,0),ips:s=>ip(bySem[s]||[])};
}
const pill = (l)=>l?`<span class="g-pill g-${l}">${l}</span>`:`<span class="g-pill g-none">-</span>`;
