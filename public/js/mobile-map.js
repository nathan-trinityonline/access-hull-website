// Mobile signal map: needs ward-data.js (GEO) and mobile-data.js (MOB) first.
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const OPS=[['Any','Best network'],['EE','EE'],['O2','O2'],['Three','Three'],['Vodafone','Vodafone']];
  const MEASURES=[['di','Data indoors','mobile data inside homes and buildings'],['do','Data outdoors','mobile data outdoors'],['vi','Calls indoors','calls inside homes and buildings']];
  // Share of addresses with good signal; worst bin first (red) to best (green)
  const BINS=[{min:0,max:50,lab:'Under 50%'},{min:50,max:70,lab:'50–70%'},{min:70,max:85,lab:'70–85%'},{min:85,max:95,lab:'85–95%'},{min:95,max:101,lab:'95%+'}];
  const col=i=>`var(--s${i+1})`;
  const binOf=v=>BINS.findIndex(b=>v>=b.min&&v<b.max);
  const hasData=typeof MOB!=='undefined'&&MOB&&MOB.wards;
  let op='Any', ms='di', selected=null;

  function pct(ward,o,m){
    const w=hasData&&MOB.wards[ward]; const c=w&&w[o]&&w[o][m];
    const t=c?c[0]+c[1]+c[2]:0;
    return t?{good:100*c[0]/t,limited:100*c[1]/t,none:100*c[2]/t,n:t}:null;
  }
  const fmt=v=>v>=99.5&&v<100?'>99%':v>0&&v<0.5?'<1%':Math.round(v)+'%';

  // switches
  function buttons(el,items,get,set){
    el.innerHTML='';
    items.forEach(([k,lab])=>{const b=document.createElement('button');b.type='button';b.textContent=lab;b.dataset.k=k;
      b.addEventListener('click',()=>{set(k);render()});el.appendChild(b)});
    return ()=>el.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===get()));
  }
  const syncOps=buttons($('ms-ops'),OPS,()=>op,k=>op=k);
  const syncMs=buttons($('ms-measures'),MEASURES,()=>ms,k=>ms=k);
  $('ms-scale').innerHTML=BINS.map((b,i)=>`<span><i style="background:${col(i)}"></i>${b.lab}</span>`).join('');

  // map
  const NS='http://www.w3.org/2000/svg';
  const el=(t,a,p)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e};
  const svg=$('ms-map'); svg.setAttribute('viewBox',`0 0 ${GEO.W} ${GEO.H+34}`);
  const gW=el('g',{},svg), paths={};
  const names=Object.keys(GEO.wards);
  names.forEach(n=>{
    const p=el('path',{d:GEO.wards[n].d,class:'ward area',tabindex:0,role:'button'},gW);
    p.addEventListener('mouseenter',()=>show(n));p.addEventListener('focus',()=>show(n));
    p.addEventListener('click',()=>select(n));
    p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(n)}});
    paths[n]=p;
  });
  svg.addEventListener('mouseleave',()=>show(selected));
  const hum=el('text',{x:GEO.W/2+60,y:GEO.H+18,class:'geo-label','text-anchor':'middle'},svg);hum.textContent='HUMBER ESTUARY';

  function show(n){
    Object.entries(paths).forEach(([k,p])=>p.classList.toggle('sel',k===n));
    if(n)gW.appendChild(paths[n]);
    const d=$('ms-detail');
    if(!n||!hasData){d.innerHTML='<p>Hover or tap a ward to compare the four networks.</p>';return}
    const w=MOB.wards[n], label=MEASURES.find(m=>m[0]===ms)[1];
    const rows=OPS.slice(1).map(([k,lab])=>{const v=pct(n,k,ms);if(!v)return '';
      return `<span>${lab}</span><span class="ms-bar" title="Good ${fmt(v.good)}, limited ${fmt(v.limited)}, none ${fmt(v.none)}"><i class="g" style="width:${v.good}%"></i><i class="l" style="width:${v.limited}%"></i></span><b>${fmt(v.good)}</b>`}).join('');
    const best=pct(n,'Any',ms);
    d.innerHTML=`<div class="row1"><h3>${esc(n)}</h3><span class="chip">${esc(label)}</span></div>
      <div class="facts"><span><b>${w.n.toLocaleString('en-GB')}</b> addresses</span>${best?`<span>Good signal on at least one network <b>${fmt(best.good)}</b></span>`:''}</div>
      <div class="comps ms-comps">${rows}</div>
      <p class="ms-key"><i class="g"></i> Good <i class="l"></i> Limited <i class="n"></i> None</p>`;
  }
  function select(n){selected=n;document.querySelectorAll('#ms-list button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.n===n));show(n)}

  function render(){
    syncOps();syncMs();
    const opLab=OPS.find(o=>o[0]===op)[1], m=MEASURES.find(x=>x[0]===ms);
    $('ms-note').textContent=op==='Any'
      ?`Share of addresses in each ward with good ${m[2]} on at least one of the four networks.`
      :`Share of addresses in each ward with good ${opLab} ${m[2]}.`;
    names.forEach(n=>{const v=pct(n,op,ms);
      paths[n].setAttribute('fill',v?col(binOf(v.good)):'var(--soft)');
      paths[n].setAttribute('aria-label',v?`${n}: ${fmt(v.good)} of addresses have good ${opLab} ${m[1].toLowerCase()}`:n)});
    const order=names.filter(n=>pct(n,op,ms)).sort((a,b)=>pct(a,op,ms).good-pct(b,op,ms).good);
    const list=$('ms-list');list.innerHTML='';
    order.forEach((n,i)=>{const v=pct(n,op,ms);const li=document.createElement('li');
      li.innerHTML=`<button type="button" class="lrow" data-n="${esc(n)}" aria-pressed="${n===selected}"><span class="rk">${i+1}</span><span class="sw" style="background:${col(binOf(v.good))}"></span><span class="nm">${esc(n)}</span><span class="num">${fmt(v.good)}</span><span class="num">${fmt(v.none)}</span></button>`;
      const b=li.firstChild;b.addEventListener('click',()=>select(n));
      b.addEventListener('mouseenter',()=>show(n));b.addEventListener('mouseleave',()=>show(selected));
      list.appendChild(li)});
    $('ms-lh').textContent=`${opLab} · ${m[1].toLowerCase()}, by ward`;
    if(!selected&&order.length)selected=order[0];
    show(selected);
  }

  if(!hasData){$('ms-empty').hidden=false}
  else{$('ms-src').textContent=`Sources: Ofcom mobile coverage API, ${MOB.premises.toLocaleString('en-GB')} addresses in ${MOB.postcodes.toLocaleString('en-GB')} postcodes, updated ${new Date(MOB.updated).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}; ONS Postcode Directory (Open Government Licence).`}
  render();
})();
