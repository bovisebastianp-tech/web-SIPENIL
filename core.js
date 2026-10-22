/* ============ KONFIGURASI ============ */
const COMP = [['kehadiran','Kehadiran'],['tugas1','Tugas 1'],['tugas2','Tugas 2'],['uts','UTS'],['uas','UAS']];
const SCALE = [['A',85,4],['B',70,3],['C',55,2],['D',40,1],['E',0,0]]; // huruf, nilai minimum, bobot mutu
const SEM_NOW = 'Ganjil 2026/2027';
const KEY = 'sipenil.v2';

/* ============ UTIL ============ */
const $ = (s,e=document)=>e.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2,9);
const r2 = n => Math.round(n*100)/100;
const fmt = n => (n==null||isNaN(n))?'-':String(r2(n)).replace('.',',');
const now = () => new Date().toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2400)}

/* ============ KALKULASI ============ */
function gradeOf(n){for(const g of SCALE) if(n>=g[1]) return {l:g[0],p:g[2]};return {l:'E',p:0}}
function calc(course, s){
  let total=0, acc=0, filledW=0, missing=[];
  for(const [k,label] of COMP){
    const w=+course.w[k]||0, v=s?s[k]:null;
    if(v==null||v===''){ if(w>0) missing.push(k); continue }
    acc += w*v/100; filledW += w;
  }
  total = acc; // komponen kosong dihitung 0
  const g = gradeOf(total);
  return {total:r2(total), acc:r2(acc), filledW, missing, complete:missing.length===0, letter:g.l, point:g.p};
}
// berapa nilai komponen `key` yang dibutuhkan agar nilai akhir >= target
function simulate(course, s, key, target){
  const w=+course.w[key]||0;
  if(!w) return {type:'nobobot'};
  if(s[key]!=null) return {type:'done'};
  let others=0, empty=[];
  for(const [k] of COMP){ if(k===key) continue; const wk=+course.w[k]||0;
    if(s[k]!=null) others += wk*s[k]/100; else if(wk>0) empty.push(k) }
  const need=(target-others)/w*100;
  if(need>100) return {type:'impossible',need:r2(need),empty};
  if(need<=0) return {type:'safe',empty};
  return {type:'need',need:Math.ceil(need*10)/10,empty};
}
const lbl = k => COMP.find(c=>c[0]===k)[1];
