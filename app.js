/* ============ ROOT RENDER ============ */
function render(){
  const app=$('#app'); const u=me();
  if(!u){app.innerHTML=viewLogin();return}
  if(!UI.tab) UI.tab = u.role==='admin'?'mhs':u.role==='dosen'?'courses':'dash';
  app.innerHTML = u.role==='admin'?viewAdmin():u.role==='dosen'?viewDosen():viewMhs();
}
function go(patch){Object.assign(UI,patch);render()}

/* ============ AKSI ============ */
function parseCSV(text){
  const rows=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>l.split(/[,;\t]/).map(x=>x.trim()));
  if(rows.length&&/nim/i.test(rows[0][0])) rows.shift();
  return rows;
}
function uForm(role,u){
  const isM=role==='mahasiswa';
  modal((u?'Ubah ':'Tambah ')+(isM?'Mahasiswa':'Dosen'),[
    {name:'username',label:isM?'NIM':'Username',value:u?.username},{name:'nama',label:'Nama lengkap',value:u?.nama}],
  o=>{
    const un=o.username.trim();
    if(DB.users.some(x=>x.username===un&&x.id!==u?.id)){toast('Username/NIM sudah dipakai');return false}
    if(u){u.username=un;u.nama=o.nama.trim();if(isM)u.nim=un}
    else DB.users.push({id:uid(),role,username:un,nim:isM?un:undefined,nama:o.nama.trim(),password:PW_DEFAULT});
    save();render();toast('Tersimpan');
  });
}
function cForm(c){
  const dsn=DB.users.filter(u=>u.role==='dosen').map(d=>[d.id,d.nama]);
  modal(c?'Ubah Mata Kuliah':'Tambah Mata Kuliah',[
    {name:'kode',label:'Kode',value:c?.kode},{name:'nama',label:'Nama mata kuliah',value:c?.nama},
    {name:'sks',label:'SKS',type:'number',min:1,value:c?.sks||3},{name:'semester',label:'Semester',value:c?.semester||SEM_NOW},
    {name:'dosenId',label:'Dosen pengampu',type:'select',options:dsn,value:c?.dosenId}],
  o=>{
    if(!o.dosenId){toast('Tambahkan dosen dulu');return false}
    const d={kode:o.kode.trim(),nama:o.nama.trim(),sks:Math.max(1,+o.sks||1),semester:o.semester.trim(),dosenId:o.dosenId};
    if(c)Object.assign(c,d);else DB.courses.push({id:uid(),...d,w:{kehadiran:10,tugas1:10,tugas2:10,uts:30,uas:40},published:false,locked:false});
    save();render();toast('Tersimpan');
  });
}
const A={
  logout(){SESSION=null;try{sessionStorage.removeItem('sipenil.u')}catch(e){}UI={sim:{}};render()},
  tab(el){UI.tab=el.dataset.v;UI.cid=null;render()},
  open(el){go({cid:el.dataset.id,ctab:'nilai'})},
  back(){go({cid:null})},
  ctab(el){go({ctab:el.dataset.v})},
  uAdd(){uForm(UI.tab==='mhs'?'mahasiswa':'dosen')},
  uEdit(el){const u=user(el.dataset.id);uForm(u.role,u)},
  uReset(el){const u=user(el.dataset.id);confirmBox(`Reset password ${u.nama} ke ${PW_DEFAULT}?`,()=>{u.password=PW_DEFAULT;save();toast('Password direset ke '+PW_DEFAULT)})},
  uDel(el){const u=user(el.dataset.id);confirmBox(`Hapus ${u.nama}? Data nilai terkait ikut terhapus.`,()=>{
    DB.users=DB.users.filter(x=>x.id!==u.id);DB.enr=DB.enr.filter(e=>e.m!==u.id);
    if(u.role==='dosen')DB.courses=DB.courses.filter(c=>c.dosenId!==u.id);save();render()},'Hapus')},
  cAdd(){cForm()},cEdit(el){cForm(course(el.dataset.id))},
  cDel(el){const c=course(el.dataset.id);confirmBox(`Hapus mata kuliah ${c.nama} beserta nilainya?`,()=>{DB.courses=DB.courses.filter(x=>x.id!==c.id);DB.enr=DB.enr.filter(e=>e.c!==c.id);save();render()},'Hapus')},
  plotC(el){UI.plotC=el.value;render()},
  plotD(el){const c=course(UI.plotC||DB.courses[0].id);c.dosenId=el.value;save();toast('Dosen diperbarui')},
  plotM(el){const cid=UI.plotC||DB.courses[0].id;
    if(el.checked){if(!DB.enr.some(e=>e.c===cid&&e.m===el.dataset.id))DB.enr.push({c:cid,m:el.dataset.id,s:{kehadiran:null,tugas1:null,tugas2:null,uts:null,uas:null}})}
    else DB.enr=DB.enr.filter(e=>!(e.c===cid&&e.m===el.dataset.id));
    save();render()},
  khsS(el){UI.khsS=el.value;render()},
  simT(el){UI.sim[el.dataset.id]={t:el.value};render()},
  wSave(){const c=course(UI.cid);const w={};let sum=0;
    COMP.forEach(k=>{const v=+$(`[data-w="${k[0]}"]`).value;w[k[0]]=isNaN(v)?0:v;sum+=w[k[0]]});
    if(sum!==100){toast('Total bobot harus tepat 100%');return}
    const old=JSON.stringify(c.w);c.w=w;
    if(JSON.stringify(w)!==old)logAdd(c.id,'Bobot diubah: '+COMP.map(k=>`${k[1]} ${w[k[0]]}%`).join(', '));
    save();toast('Bobot disimpan')},
  csvGo(){const c=course(UI.cid);let n=0,bad=[];
    parseCSV($('#csvText').value).forEach(r=>{
      const m=DB.users.find(u=>u.role==='mahasiswa'&&u.nim===r[0]);
      const e=m&&DB.enr.find(x=>x.c===c.id&&x.m===m.id);
      if(!e){bad.push(r[0]);return}
      COMP.forEach((k,i)=>{const raw=r[i+1];if(raw===undefined||raw==='')return;const v=parseFloat(raw.replace(',','.'));
        if(isNaN(v)||v<0||v>100)return;if(e.s[k[0]]!==v){e.s[k[0]]=v}});
      n++});
    if(n)logAdd(c.id,`Impor CSV: ${n} baris nilai`);
    save();toast(`${n} baris diimpor`+(bad.length?`, NIM tidak dikenal: ${bad.slice(0,4).join(', ')}`:''));
    if(n)go({ctab:'nilai'})},
  publish(){const c=course(UI.cid);confirmBox('Kunci & publikasikan nilai akhir ke mahasiswa?',()=>{c.published=true;c.locked=true;logAdd(c.id,'Nilai dikunci & dipublikasi');save();render();toast('Nilai dipublikasi')},'Kunci & Publikasi')},
  unlock(){const c=course(UI.cid);modal('Buka kunci nilai',[{name:'why',label:'Alasan koreksi (wajib)'}],o=>{
    c.locked=false;logAdd(c.id,'Kunci dibuka. Alasan: '+o.why.trim());save();go({ctab:'nilai'});toast('Kunci dibuka. Publikasikan ulang setelah koreksi.')},'Buka kunci')}
};
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-a]');
  if(el&&el.tagName!=='SELECT'&&el.tagName!=='INPUT'&&A[el.dataset.a])A[el.dataset.a](el);
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.tagName==='SELECT'&&el.dataset.a&&A[el.dataset.a]){A[el.dataset.a](el);return}
  if(el.type==='checkbox'&&el.dataset.a){A[el.dataset.a](el);return}
  if(el.dataset.score){
    const [mid,k]=el.dataset.score.split('|');const c=course(UI.cid);
    const en=DB.enr.find(x=>x.c===c.id&&x.m===mid);if(!en||c.locked)return;
    let v=el.value===''?null:parseFloat(el.value);
    if(v!=null&&(isNaN(v)||v<0||v>100)){toast('Nilai harus 0 sampai 100');el.value=en.s[k]??'';return}
    const old=en.s[k];if(old===v)return;en.s[k]=v;
    logAdd(c.id,`${user(mid).nim} ${user(mid).nama}: ${lbl(k)} ${old??'kosong'} → ${v??'kosong'}`);
    save();
    const row=el.closest('tr'),r=calc(c,en.s);
    $('[data-cell=tot]',row).textContent=fmt(r.total);$('[data-cell=g]',row).innerHTML=pill(r.letter);
  }
});
document.addEventListener('input',e=>{
  if(e.target.dataset.w){const sum=COMP.reduce((t,k)=>t+(+$(`[data-w="${k[0]}"]`).value||0),0);
    const s=$('#wsum');s.textContent=sum+'%';s.className='wsum '+(sum===100?'ok':'bad')}
});
document.addEventListener('submit',e=>{
  if(e.target.id==='fLogin'){e.preventDefault();
    // username tidak peka huruf besar/kecil; spasi dan tanda petik diabaikan (Ma'mun = mamun)
    const norm=s=>String(s).toLowerCase().replace(/['’`\s]/g,'');
    const f=new FormData(e.target);const uname=norm(f.get('u'));
    const u=DB.users.find(x=>norm(x.username)===uname&&x.password===f.get('p'));
    if(!u){$('#lerr').textContent='Username atau password salah.';return}
    SESSION=u.id;try{sessionStorage.setItem('sipenil.u',u.id)}catch(err){}
    UI={sim:{}};render()}
});
document.addEventListener('change',e=>{
  if(e.target.id==='csvFile'&&e.target.files[0]){const r=new FileReader();r.onload=()=>{$('#csvText').value=r.result};r.readAsText(e.target.files[0])}
});

load();UI={sim:{}};render();
