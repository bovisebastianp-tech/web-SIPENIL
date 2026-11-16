/* ============ ROOT RENDER ============ */
function render(){
  const app=$('#app'); const u=me();
  if(!u){app.innerHTML=viewLogin();return}
  if(!UI.tab) UI.tab = u.role==='admin'?'mhs':u.role==='dosen'?'courses':'dash';
  app.innerHTML = u.role==='admin'?viewAdmin():u.role==='dosen'?viewDosen():viewMhs();
}
function go(patch){Object.assign(UI,patch);render()}
// Simpan lalu render ulang. Mengembalikan false bila penyimpanan gagal (perubahan sudah dibatalkan oleh save()).
function done(msg){if(!save())return false;render();if(msg)toast(msg);return true}

/* ============ HAK AKSES (lapis kedua; penegakan sebenarnya di server pada Tahap 2) ============ */
const ACT_ROLE={uAdd:'admin',uEdit:'admin',uReset:'admin',uDel:'admin',cAdd:'admin',cEdit:'admin',cDel:'admin',
  plotC:'admin',plotD:'admin',plotM:'admin',plotAll:'admin',plotNone:'admin',khsS:'admin',
  open:'dosen',back:'dosen',ctab:'dosen',wSave:'dosen',csvGo:'dosen',publish:'dosen',unlock:'dosen',simT:'mahasiswa'};
// mata kuliah milik dosen yang sedang login; null + pesan bila bukan miliknya
function myCourse(id){
  const u=me(), c=course(id||UI.cid);
  if(!u||u.role!=='dosen'||!c||c.dosenId!==u.id){toast('Anda tidak berhak mengakses mata kuliah ini');return null}
  return c;
}

/* ============ VALIDASI FORM ============ */
const KODE_RE=/^[A-Za-z0-9][A-Za-z0-9._\- ]{1,19}$/;
const NIM_RE=/^[A-Za-z0-9][A-Za-z0-9.\-]{2,29}$/;
function uForm(role,u){
  const isM=role==='mahasiswa';
  modal((u?'Ubah ':'Tambah ')+(isM?'Mahasiswa':'Dosen'),[
    {name:'username',label:isM?'NIM':'Username',value:u?.username,maxlength:isM?30:40},{name:'nama',label:'Nama lengkap',value:u?.nama,maxlength:100}],
  (o,err)=>{
    const un=o.username.trim().replace(/\s+/g,' '), nama=o.nama.trim().replace(/\s+/g,' ');
    if(!un||!nama){err('NIM/username dan nama tidak boleh kosong.');return false}
    if(isM&&!NIM_RE.test(un)){err('NIM hanya boleh huruf/angka/titik/strip (3-30 karakter), tanpa spasi.');return false}
    if(!isM&&normUser(un).length<2){err('Username minimal 2 karakter.');return false}
    if(nama.length<2){err('Nama minimal 2 karakter.');return false}
    if(DB.users.some(x=>normUser(x.username)===normUser(un)&&x.id!==u?.id)){err('Username/NIM sudah dipakai akun lain.');return false}
    if(u){u.username=un;u.nama=nama;if(isM)u.nim=un}
    else DB.users.push({id:uid(),role,username:un,nim:isM?un:undefined,nama,pw:null,mustChange:true});
    return done('Tersimpan')===false?false:undefined;
  });
}
function cForm(c){
  const dsn=DB.users.filter(u=>u.role==='dosen').map(d=>[d.id,d.nama]);
  if(!dsn.length){toast('Tambahkan dosen terlebih dahulu');return}
  const lockedPub=!!c?.published;
  modal(c?'Ubah Mata Kuliah':'Tambah Mata Kuliah',[
    {name:'kode',label:'Kode',value:c?.kode,maxlength:20},{name:'nama',label:'Nama mata kuliah',value:c?.nama,maxlength:100},
    {name:'sks',label:'SKS',type:'number',min:1,max:6,step:1,value:c?.sks||3},
    {name:'semester',label:'Semester (contoh: Ganjil 2026/2027)',value:c?.semester||semNow(),placeholder:'Ganjil 2026/2027'},
    {name:'dosenId',label:'Dosen pengampu',type:'select',options:dsn,value:c?.dosenId}],
  (o,err)=>{
    const kode=o.kode.trim().replace(/\s+/g,' '), nama=o.nama.trim().replace(/\s+/g,' ');
    if(!KODE_RE.test(kode)){err('Kode 2-20 karakter (huruf, angka, titik, strip, garis bawah).');return false}
    if(nama.length<2){err('Nama mata kuliah minimal 2 karakter.');return false}
    if(!/^\d+$/.test(String(o.sks).trim())||+o.sks<1||+o.sks>6){err('SKS harus bilangan bulat 1-6.');return false}
    const ps=parseSem(o.semester);
    if(!ps){err('Format semester harus "Ganjil" atau "Genap" diikuti tahun akademik, mis. Ganjil 2026/2027.');return false}
    if(!user(o.dosenId)){err('Dosen pengampu tidak valid.');return false}
    if(DB.courses.some(x=>x.id!==c?.id&&x.kode.trim().toLowerCase()===kode.toLowerCase()&&semName(x.semester)===ps.name)){
      err(`Kode ${kode} sudah dipakai mata kuliah lain pada semester ${ps.name}.`);return false}
    if(c&&lockedPub&&(+o.sks!==c.sks||ps.name!==semName(c.semester))){
      err('SKS dan semester tidak dapat diubah karena nilai sudah dipublikasi (akan mengubah IPS/IPK mahasiswa). Tarik publikasi lebih dulu.');return false}
    const d={kode,nama,sks:+o.sks,semester:ps.name,dosenId:o.dosenId};
    if(c){ if(d.dosenId!==c.dosenId) logAdd(c.id,`Dosen pengampu diganti: ${user(c.dosenId)?.nama||'-'} → ${user(d.dosenId).nama}`); Object.assign(c,d) }
    else DB.courses.push({id:uid(),...d,w:{kehadiran:10,tugas1:10,tugas2:10,uts:30,uas:40},published:false,locked:false});
    return done('Tersimpan')===false?false:undefined;
  });
}
const INITIAL_PWS=[PW_DEFAULT,PW_ADMIN_DEFAULT];

/* ============ AKSI ============ */
const A={
  logout(){SESSION=null;try{sessionStorage.removeItem('sipenil.u')}catch(e){}UI={sim:{}};render()},
  tab(el){UI.tab=el.dataset.v;UI.cid=null;render()},
  open(el){const c=myCourse(el.dataset.id);if(c){if(UI.f)delete UI.f.nilai;go({cid:c.id,ctab:'nilai'})}},   // filter nilai dimulai bersih untuk tiap mata kuliah
  back(){if(UI.f)delete UI.f.nilai;go({cid:null})},
  ctab(el){go({ctab:el.dataset.v})},
  chPw(){
    const u=me();
    modal('Ganti password',[
      {name:'old',label:'Password saat ini',type:'password',autocomplete:'current-password'},
      {name:'n1',label:`Password baru (minimal ${PW_MIN} karakter)`,type:'password',autocomplete:'new-password',minlength:PW_MIN,maxlength:128},
      {name:'n2',label:'Ulangi password baru',type:'password',autocomplete:'new-password'}],
    async (o,err)=>{
      const cur=me(); if(!cur){return false}
      const okOld=cur.pw?await verifyPw(o.old,cur.pw):sameStr(o.old,initialPw(cur.role));
      if(!okOld){err('Password saat ini salah.');return false}
      if(o.n1.length<PW_MIN){err(`Password baru minimal ${PW_MIN} karakter.`);return false}
      if(o.n1!==o.n2){err('Konfirmasi password baru tidak sama.');return false}
      if(INITIAL_PWS.includes(o.n1)||sameStr(o.n1,o.old)||normUser(o.n1)===normUser(cur.username)){err('Password baru terlalu mudah ditebak atau sama dengan yang lama.');return false}
      cur.pw=await hashPw(o.n1); cur.mustChange=false;
      if(!done('Password berhasil diganti')) return false;
    });
  },
  uAdd(){uForm(UI.tab==='mhs'?'mahasiswa':'dosen')},
  uEdit(el){const u=user(el.dataset.id);if(u&&u.role!=='admin')uForm(u.role,u)},
  uReset(el){const u=user(el.dataset.id);if(!u||u.role==='admin')return;
    confirmBox(`Reset password ${u.nama} ke password awal (${PW_DEFAULT})? Pengguna akan diminta menggantinya.`,()=>{u.pw=null;u.mustChange=true;done('Password direset ke password awal')},'Reset')},
  uDel(el){const u=user(el.dataset.id);if(!u||u.role==='admin')return;
    if(u.role==='dosen'){
      const n=DB.courses.filter(c=>c.dosenId===u.id).length;
      if(n){toast(`${u.nama} masih mengampu ${n} mata kuliah. Pindahkan dulu lewat menu Plotting agar nilai tidak ikut terhapus.`);return}
    }
    const pub=DB.enr.filter(e=>e.m===u.id&&course(e.c)?.published).length;
    const msg=u.role==='mahasiswa'
      ?`Hapus ${u.nama}? Seluruh nilai mahasiswa ini ikut terhapus${pub?` (termasuk ${pub} nilai yang sudah dipublikasi dan riwayat KHS)`:''}. Tindakan ini tidak dapat dibatalkan.`
      :`Hapus ${u.nama}?`;
    confirmBox(msg,()=>{DB.users=DB.users.filter(x=>x.id!==u.id);DB.enr=DB.enr.filter(e=>e.m!==u.id);done('Data dihapus')},'Hapus')},
  cAdd(){cForm()},cEdit(el){const c=course(el.dataset.id);if(c)cForm(c)},
  cDel(el){const c=course(el.dataset.id);if(!c)return;
    const n=enrOf(c.id).filter(e=>Object.values(e.s).some(v=>v!=null)).length;
    confirmBox(`Hapus mata kuliah ${c.nama}? ${c.published?'Nilai mata kuliah ini SUDAH DIPUBLIKASI; KHS, IPS, dan IPK mahasiswa ikut berubah. ':''}${n?`${n} mahasiswa sudah memiliki nilai dan semuanya akan terhapus. `:''}Tindakan ini tidak dapat dibatalkan.`,
      ()=>{DB.courses=DB.courses.filter(x=>x.id!==c.id);DB.enr=DB.enr.filter(e=>e.c!==c.id);DB.log=DB.log.filter(l=>l.c!==c.id);done('Mata kuliah dihapus')},'Hapus')},
  plotC(el){UI.plotC=el.value;if(UI.f&&UI.f.plot)UI.f.plot.page=1;render()},
  plotD(el){const c=course(UI.plotC||DB.courses[0]?.id);if(!c||!user(el.value))return;
    if(c.dosenId===el.value)return;
    logAdd(c.id,`Dosen pengampu diganti: ${user(c.dosenId)?.nama||'-'} → ${user(el.value).nama}`);
    c.dosenId=el.value;done('Dosen diperbarui')},
  plotM(el){const c=course(plotCid());if(!c||!user(el.dataset.id)){plotSync();return}
    if(c.published){toast('Mata kuliah sudah dipublikasi. Tarik publikasi dulu untuk mengubah peserta.');plotSync();return}
    const mid=el.dataset.id;
    // daftar tidak digambar ulang: baris tetap di tempatnya walau filter "sudah/belum mengambil" sedang aktif
    if(el.checked){
      if(!DB.enr.some(e=>e.c===c.id&&e.m===mid)) DB.enr.push({c:c.id,m:mid,s:emptyScores()});
      if(save()) plotSync();
    }else{
      const e=DB.enr.find(x=>x.c===c.id&&x.m===mid);
      const has=e&&Object.values(e.s).some(v=>v!=null);
      const rm=()=>{DB.enr=DB.enr.filter(x=>!(x.c===c.id&&x.m===mid));if(save())plotSync()};
      if(has) confirmBox(`${user(mid).nama} sudah memiliki nilai di mata kuliah ini. Mengeluarkan akan menghapus nilainya. Lanjutkan?`,rm,'Keluarkan',()=>plotSync());
      else rm();
    }},
  // Pilih semua / batalkan: berlaku untuk SEMUA hasil filter yang sedang aktif (semua halaman), bukan seluruh mahasiswa
  plotAll(){const c=course(plotCid());if(!c)return;
    if(c.published){toast('Mata kuliah sudah dipublikasi. Tarik publikasi dulu untuk mengubah peserta.');return}
    const add=listResults('plot').filter(x=>!x.taken);
    if(!add.length){toast('Semua mahasiswa pada hasil ini sudah terpilih');return}
    add.forEach(x=>DB.enr.push({c:c.id,m:x.u.id,s:emptyScores()}));
    if(!save())return; plotSync(); toast(`${add.length} mahasiswa ditambahkan`)},
  plotNone(){const c=course(plotCid());if(!c)return;
    if(c.published){toast('Mata kuliah sudah dipublikasi. Tarik publikasi dulu untuk mengubah peserta.');return}
    const ids=new Set(listResults('plot').filter(x=>x.taken).map(x=>x.u.id));
    if(!ids.size){toast('Tidak ada mahasiswa terpilih pada hasil ini');return}
    const graded=enrOf(c.id).filter(e=>ids.has(e.m)&&Object.values(e.s).some(v=>v!=null)).length;
    const go_=()=>{DB.enr=DB.enr.filter(e=>!(e.c===c.id&&ids.has(e.m)));if(!save())return;plotSync();toast(`${ids.size} mahasiswa dikeluarkan`)};
    if(graded) confirmBox(`${graded} dari ${ids.size} mahasiswa sudah memiliki nilai di mata kuliah ini. Mengeluarkan mereka akan menghapus nilainya. Lanjutkan?`,go_,'Keluarkan');
    else go_()},
  khsS(el){UI.khsS=el.value;render()},
  simT(el){UI.sim[el.dataset.id]={t:el.value};render()},
  wSave(){const c=myCourse();if(!c)return;
    if(c.locked){toast('Nilai terkunci. Buka kunci di tab Rekap & Publikasi untuk mengubah bobot.');return}
    const w={};let sum=0;
    for(const k of COMP){
      const raw=($(`[data-w="${k[0]}"]`).value||'').trim().replace(',','.');
      const v=raw===''?NaN:Number(raw);
      if(!isFinite(v)||v<0||v>100){toast(`Bobot ${k[1]} harus berupa angka 0 sampai 100`);return}
      if(r2(v)!==v){toast(`Bobot ${k[1]}: maksimal 2 angka desimal`);return}
      w[k[0]]=v;sum+=v;
    }
    if(Math.abs(sum-100)>0.001){toast(`Total bobot ${r2(sum)}%. Harus tepat 100%`);return}
    const old=JSON.stringify(c.w);
    if(JSON.stringify(w)===old){toast('Tidak ada perubahan bobot');return}
    c.w=w;logAdd(c.id,'Bobot diubah: '+COMP.map(k=>`${k[1]} ${w[k[0]]}%`).join(', '));
    done('Bobot disimpan')},
  csvGo(){const c=myCourse();if(!c)return;
    if(c.locked){toast('Nilai terkunci. Buka kunci terlebih dahulu.');return}
    const plan=csvPlan($('#csvText').value,c.id);
    const rep=$('#csvReport');
    const list=(arr,cls)=>arr.length?`<ul class="report ${cls}">${arr.slice(0,40).map(x=>`<li>${esc(x)}</li>`).join('')}${arr.length>40?`<li>... dan ${arr.length-40} lainnya</li>`:''}</ul>`:'';
    if(plan.errors.length){
      rep.innerHTML=`<div class="alert"><b>Impor dibatalkan, tidak ada nilai yang diubah.</b> Perbaiki ${plan.errors.length} masalah berikut lalu coba lagi:</div>`
        +list(plan.errors.map(e=>(e.line?`Baris ${e.line}: `:'')+e.msg),'bad')+list(plan.warnings,'warn');
      return;
    }
    if(!plan.changed){rep.innerHTML=`<div class="alert info">Tidak ada nilai yang berubah${plan.unchanged?` (${plan.unchanged} baris sama dengan data saat ini)`:''}.</div>`+list(plan.warnings,'warn');return}
    for(const r of plan.rows){
      r.changes.forEach(ch=>{r.e.s[ch.k]=ch.n});
      logAdd(c.id,`Impor CSV · ${r.m.nim} ${r.m.nama}: `+r.changes.map(ch=>`${lbl(ch.k)} ${ch.old??'kosong'} → ${ch.n}`).join(', '));
    }
    if(!save()) return;
    go({ctab:'nilai'});
    toast(`${plan.changed} baris diimpor`+(plan.unchanged?`, ${plan.unchanged} tidak berubah`:'')+(plan.warnings.length?`, ${plan.warnings.length} peringatan`:''))},
  publish(){const c=myCourse();if(!c)return;
    const es=enrOf(c.id);
    if(!es.length){toast('Belum ada mahasiswa di mata kuliah ini');return}
    if(!calc(c,{}).weightOk){toast('Total bobot harus tepat 100% sebelum publikasi');return}
    const inc=es.filter(e=>!calc(c,e.s).complete);
    if(inc.length){toast(`Publikasi dibatalkan: ${inc.length} mahasiswa belum memiliki nilai lengkap`);return}
    confirmBox('Kunci & publikasikan nilai akhir ke mahasiswa?',()=>{
      c.published=true;c.locked=true;logAdd(c.id,'Nilai dikunci & dipublikasi');done('Nilai dipublikasi')},'Kunci & Publikasi')},
  unlock(){const c=myCourse();if(!c)return;
    modal('Buka kunci nilai',[{name:'why',label:'Alasan koreksi (wajib, minimal 5 karakter)',maxlength:200}],(o,err)=>{
      const why=o.why.trim();
      if(why.length<5){err('Alasan wajib diisi (minimal 5 karakter).');return false}
      c.locked=false;c.published=false;   // publikasi ditarik sampai dipublikasi ulang agar mahasiswa tidak melihat nilai setengah dikoreksi
      logAdd(c.id,'Kunci dibuka, publikasi ditarik. Alasan: '+why);
      if(!save()) return false;
      go({ctab:'nilai'});toast('Kunci dibuka dan publikasi ditarik. Publikasikan ulang setelah koreksi.');
    },'Buka kunci')}
};
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-a]');
  if(!el||el.tagName==='SELECT'||el.tagName==='INPUT'||!A[el.dataset.a])return;
  runAct(el);
});
function runAct(el){
  const need=ACT_ROLE[el.dataset.a], u=me();
  if(need&&(!u||u.role!==need)){toast('Tindakan tidak diizinkan untuk peran Anda');return}
  if(!need&&!u)return;
  try{A[el.dataset.a](el)}catch(err){console.error(err);toast('Terjadi kesalahan: '+err.message)}
}
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.id==='csvFile'&&el.files[0]){
    const f=el.files[0];
    if(f.size>2*1024*1024){toast('Berkas terlalu besar (maksimal 2 MB)');el.value='';return}
    const r=new FileReader();r.onload=()=>{$('#csvText').value=r.result;const rep=$('#csvReport');if(rep)rep.innerHTML=''};
    r.onerror=()=>toast('Gagal membaca berkas');r.readAsText(f);return}
  if(el.tagName==='SELECT'&&el.dataset.a&&A[el.dataset.a]){runAct(el);return}
  if(el.type==='checkbox'&&el.dataset.a){runAct(el);return}
  if(el.dataset.score){
    const u=me();if(!u||u.role!=='dosen')return;
    const [mid,k]=el.dataset.score.split('|');const c=myCourse();if(!c)return;
    const en=DB.enr.find(x=>x.c===c.id&&x.m===mid);if(!en)return;
    const revert=()=>{el.value=en.s[k]??''};
    if(c.locked){toast('Nilai terkunci');revert();return}
    if(el.validity.badInput){toast('Nilai harus berupa angka');revert();return}
    const raw=el.value.trim().replace(',','.');
    const v=raw===''?null:Number(raw);
    if(v!=null&&(!isFinite(v)||v<0||v>100)){toast('Nilai harus 0 sampai 100');revert();return}
    if(v!=null&&r2(v)!==v){toast('Nilai maksimal 2 angka desimal');revert();return}
    const old=en.s[k];if(old===v)return;en.s[k]=v;
    logAdd(c.id,`${user(mid).nim} ${user(mid).nama}: ${lbl(k)} ${old??'kosong'} → ${v??'kosong'}`);
    if(!save())return;    // save() sudah membatalkan perubahan dan merender ulang
    const row=el.closest('tr'),r=calc(c,en.s);
    $('[data-cell=tot]',row).textContent=fmt(r.total);$('[data-cell=g]',row).innerHTML=pill(r.letter);
  }
});
document.addEventListener('input',e=>{
  if(e.target.dataset.w){const sum=r2(COMP.reduce((t,k)=>t+(+$(`[data-w="${k[0]}"]`).value||0),0));
    const s=$('#wsum');s.textContent=sum+'%';s.className='wsum '+(Math.abs(sum-100)<0.005?'ok':'bad')}
});
document.addEventListener('submit',async e=>{
  if(e.target.id!=='fLogin')return;
  e.preventDefault();
  const form=e.target, btn=$('button',form), errEl=$('#lerr');
  const f=new FormData(form), uname=normUser(f.get('u')), pw=String(f.get('p')||'');
  btn.disabled=true;errEl.textContent='';
  try{
    const u=DB.users.find(x=>normUser(x.username)===uname);
    let ok=false;
    if(u) ok=u.pw?await verifyPw(pw,u.pw):sameStr(pw,initialPw(u.role));
    else await hashPw(pw);   // waktu respons setara agar akun yang ada tidak mudah ditebak
    if(!ok){errEl.textContent='Username atau password salah.';return}
    SESSION=u.id;try{sessionStorage.setItem('sipenil.u',u.id)}catch(err){}
    UI={sim:{}};render();
  }catch(err){
    console.error(err);
    errEl.textContent=err.message==='NO_SUBTLE'?'Browser ini tidak mendukung enkripsi untuk login. Buka SIPENIL lewat HTTPS atau localhost.':'Terjadi kesalahan saat masuk. Coba lagi.';
  }finally{btn.disabled=false}
});

load().then(()=>{UI={sim:{}};render()}).catch(err=>{
  console.error(err);
  $('#app').innerHTML='<div class="login-wrap"><div class="card login"><h1>Gagal memuat data</h1><p class="muted">Periksa konsol browser. Data lama tidak dihapus.</p></div></div>';
});
