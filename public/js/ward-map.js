// Interactive ward map: needs ward-data.js first.
const byName=Object.fromEntries(WARDS.map(w=>[w[0],w]));
const esc=s=>s.replace(/&/g,'&amp;');
const IMD_BINS=[{min:0,max:20,lab:"Under 20"},{min:20,max:30,lab:"20–30"},{min:30,max:40,lab:"30–40"},{min:40,max:50,lab:"40–50"},{min:50,max:101,lab:"50+"}];
const PCT_BINS=[{min:0,max:50,lab:"Below median"},{min:50,max:70,lab:"50–70th"},{min:70,max:80,lab:"70–80th"},{min:80,max:90,lab:"80–90th"},{min:90,max:101,lab:"Riskiest 10%"}];
const bin=(B,v)=>B.findIndex(b=>v>=b.min&&v<b.max);
const col=i=>`var(--c${i+1})`;
// ward DERI colour: place ward average against England neighbourhood thresholds
const E=DD.eng;
const wardPctBin=s=>s>=E.p90?4:s>=E.p80?3:s>=E.p70?2:s>=E.p50?1:0;
const LABEL_FIX={"Beverley & Newland":[292,300],"Longhill & Bilton Grange":[700,300]};
const NS="http://www.w3.org/2000/svg";
const el=(t,a={},p)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e};

const svg=document.getElementById('map');
svg.setAttribute('viewBox',`0 0 ${GEO.W} ${GEO.H+34}`);
const gL=el('g',{},svg), gW=el('g',{},svg), gO=el('g',{},svg), gB=el('g',{},svg);
const wardPaths={}, outlines={}, lsoaPaths={};
WARDS.forEach(w=>{
  const g=GEO.wards[w[0]];
  const p=el('path',{d:g.d,class:'ward area',fill:col(bin(IMD_BINS,w[2])),tabindex:0,role:'button','aria-label':`${w[0]}, deprivation rank ${w[4]} of 21`},gW);
  p.addEventListener('mouseenter',()=>showWard(w[0]));p.addEventListener('focus',()=>showWard(w[0]));
  p.addEventListener('click',()=>select(w[0]));
  p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(w[0])}});
  wardPaths[w[0]]=p;
  outlines[w[0]]=el('path',{d:g.d,class:'wline'},gO);
});
Object.entries(DD.lsoa).forEach(([code,L])=>{
  const p=el('path',{d:GEO.lsoa[code],class:'lsoa area',fill:col(bin(PCT_BINS,L.pct)),tabindex:0,role:'button','aria-label':`Neighbourhood ${L.name}, ${L.ward}, riskier than ${Math.floor(L.pct)}% of English neighbourhoods`},gL);
  p.addEventListener('mouseenter',()=>showLsoa(code));p.addEventListener('focus',()=>showLsoa(code));
  p.addEventListener('click',()=>{select(L.ward,true);showLsoa(code)});
  p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(L.ward,true);showLsoa(code)}});
  lsoaPaths[code]=p;
});
svg.addEventListener('mouseleave',()=>showWard(selected));
const badges={};
WARDS.forEach(w=>{
  const g=GEO.wards[w[0]];const [x,y]=LABEL_FIX[w[0]]||[g.lx,g.ly];
  const b=el('g',{class:'badge',transform:`translate(${x},${y})`},gB);
  el('circle',{r:14},b);const t=el('text',{'text-anchor':'middle',dy:'5'},b);
  badges[w[0]]={g:b,t};
});
const hum=el('text',{x:GEO.W/2+60,y:GEO.H+18,class:'geo-label','text-anchor':'middle'},svg);hum.textContent='HUMBER ESTUARY';
const rh=el('text',{class:'geo-label',transform:'translate(358,232) rotate(68)'},svg);rh.textContent='River Hull';rh.style.fontSize='12px';
const pxkm=65.44,sx=GEO.W-30-2*pxkm,sy=26;
el('path',{d:`M${sx},${sy-6}V${sy}H${sx+2*pxkm}V${sy-6}`,class:'ui-line'},svg);
const st=el('text',{x:sx+pxkm,y:sy+18,class:'ui-ink','text-anchor':'middle'},svg);st.textContent='2 km';
const na=el('g',{transform:`translate(${GEO.W-30},62)`},svg);
el('path',{d:'M0,-12L6,6L0,2L-6,6Z',fill:'var(--muted)'},na);
const nt=el('text',{y:22,class:'ui-ink','text-anchor':'middle'},na);nt.textContent='N';

const list=document.getElementById('list'), btns={};
const detail=document.getElementById('detail');
let view='deri', selected='Orchard Park';

function rankOf(name){return view==='imd'?byName[name][4]:DD.ward[name].rD}
function renderList(){
  const order=WARDS.map(w=>w[0]).sort((a,b)=>rankOf(a)-rankOf(b));
  list.innerHTML='';
  order.forEach(n=>{
    const w=byName[n], d=DD.ward[n], shift=w[4]-d.rD;
    const sw=view==='imd'?col(bin(IMD_BINS,w[2])):col(wardPctBin(d.deri));
    const sh=Math.abs(shift)>=4?`<span class="shift">${shift>0?'↑'+shift:'↓'+(-shift)}</span>`:'';
    const li=document.createElement('li');
    li.innerHTML=`<button type="button" class="lrow" aria-pressed="${n===selected}"><span class="rk">${rankOf(n)}</span><span class="sw" style="background:${sw}"></span><span class="nm">${esc(n)}</span><span class="num">${w[4]}</span><span class="num">${d.rD}${sh}</span></button>`;
    const b=li.firstChild;b.addEventListener('click',()=>select(n));
    b.addEventListener('mouseenter',()=>showWard(n));b.addEventListener('mouseleave',()=>showWard(selected));
    btns[n]=b;list.appendChild(li);
  });
  document.getElementById('lh').textContent=view==='imd'?'All 21 wards, ranked by deprivation':'All 21 wards, ranked by digital exclusion risk';
}
function compBars(o){
  const rows=[["Age &amp; health",o.demo],["Broadband",o.bb],["Deprivation",o.dep]];
  return `<div class="comps">${rows.map(([l,v])=>`<span>${l}</span><span class="bar"><i style="width:${v*10}%"></i></span><b style="color:var(--fg)">${v.toFixed(1)}</b>`).join('')}</div>`;
}
function showWard(name){
  const w=byName[name], d=DD.ward[name];
  Object.entries(outlines).forEach(([n,p])=>p.classList.toggle('sel',view==='deri'&&n===name));
  Object.entries(wardPaths).forEach(([n,p])=>p.classList.toggle('sel',view==='imd'&&n===name));
  if(view==='imd')gW.appendChild(wardPaths[name]); else gO.appendChild(outlines[name]);
  Object.values(lsoaPaths).forEach(p=>p.classList.remove('sel'));
  const nTop=Object.values(DD.lsoa).filter(l=>l.ward===name&&l.pct>=90).length, nAll=Object.values(DD.lsoa).filter(l=>l.ward===name).length;
  const diff=w[4]-d.rD;
  let why='';
  if(diff>=4)why=`Ranks ${diff} places higher on digital risk than on deprivation, mainly because ${Math.round(d.age65*100)}% of residents are 65+ (Hull average 15%).`;
  else if(diff<=-4)why=`Ranks ${-diff} places lower on digital risk than on deprivation. It has a younger population: ${Math.round(d.age65*100)}% are 65+ (Hull average 15%).`;
  detail.innerHTML=`<div class="row1"><h3>${esc(name)}</h3><span class="chip">Deprivation #${w[4]}</span><span class="chip">Digital risk #${d.rD}</span></div>
  <div class="facts"><span>IMD 2025 score <b>${w[2].toFixed(1)}</b></span><span>Digital risk score <b>${d.deri.toFixed(2)}</b> / 10</span><span><b>${nTop}</b> of ${nAll} neighbourhoods in England's riskiest 10%</span></div>
  ${view==='deri'?compBars({demo:d.demography,bb:d.broadband,dep:d.deprivation}):''}
  <p>${[why,w[6]].filter(Boolean).join(' ')}</p>`;
}
function showLsoa(code){
  const L=DD.lsoa[code];
  Object.values(lsoaPaths).forEach(p=>p.classList.toggle('sel',p===lsoaPaths[code]));
  gL.appendChild(lsoaPaths[code]);
  const pc=Math.floor(L.pct);
  detail.innerHTML=`<div class="row1"><h3>${esc(L.name.replace('Kingston upon Hull','Hull'))}</h3><span class="chip">${esc(L.ward)} ward</span></div>
  <div class="facts"><span>Digital risk score <b>${L.deri.toFixed(2)}</b> / 10</span><span>Riskier than <b>${pc}%</b> of English neighbourhoods</span><span>Population <b>${L.pop.toLocaleString('en-GB')}</b></span><span>Aged 65+ <b>${Math.round(L.age65*100)}%</b></span><span>No qualifications (2011) <b>${Math.round(L.noqual*100)}%</b></span></div>
  ${compBars(L)}`;
}
function select(name,keep){
  selected=name;
  Object.entries(btns).forEach(([n,b])=>b.setAttribute('aria-pressed',n===name?'true':'false'));
  if(!keep)showWard(name); else {showWard(name)}
}
function setView(v){
  view=v;
  document.getElementById('v-imd').setAttribute('aria-pressed',v==='imd');
  document.getElementById('v-deri').setAttribute('aria-pressed',v==='deri');
  gL.style.display=v==='deri'?'':'none'; gO.style.display=v==='deri'?'':'none';
  gW.style.display=v==='imd'?'':'none'; gB.style.display=v==='imd'?'':'none';
  WARDS.forEach(w=>{badges[w[0]].t.textContent=w[4];badges[w[0]].g.style.display=w[4]<=10?'':'none'});
  const B=v==='imd'?IMD_BINS:PCT_BINS;
  document.getElementById('scale').innerHTML=B.map((b,i)=>`<span><i style="background:${col(i)}"></i>${b.lab}</span>`).join('');
  document.getElementById('lt').textContent=v==='imd'?'IMD 2025 score':'Risk vs all English neighbourhoods';
  document.getElementById('ends').textContent=v==='imd'?'Higher score = more deprived':'Percentile of the digital exclusion risk score';
  document.getElementById('viewnote').textContent=v==='imd'
   ?'Each ward is shaded by its 2025 deprivation score, a stand-in for digital poverty. Numbers mark the 10 most deprived wards.'
   :'Each of Hull’s 166 neighbourhoods is shaded by its digital exclusion risk score, ranked against every neighbourhood in England. The score combines age and health, broadband quality and deprivation. Ward boundaries are outlined.';
  renderList(); showWard(selected);
}
document.getElementById('v-imd').addEventListener('click',()=>setView('imd'));
document.getElementById('v-deri').addEventListener('click',()=>setView('deri'));
setView('deri');

