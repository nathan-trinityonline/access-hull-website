// Find digital help: postcode search and filters over the venue list (src/data/venues.json).
// A postcode is geocoded with postcodes.io and places are sorted by real distance.
// If postcodes.io can't be reached, it falls back to matching postcode districts (HU7, nearby districts, then the rest).
(function(){
  const $=id=>document.getElementById(id);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const V=JSON.parse($('venue-data').textContent).map((v,i)=>Object.assign({id:i,out:v.postcode.split(' ')[0]},v));
  // postcode districts next to each other, for "nearby" results
  const ADJ={HU1:['HU2','HU3','HU8','HU9'],HU2:['HU1','HU3','HU5','HU8'],HU3:['HU1','HU2','HU4','HU5'],HU4:['HU3','HU5','HU10','HU13'],HU5:['HU2','HU3','HU4','HU6','HU10','HU16'],HU6:['HU5','HU7','HU2','HU16'],HU7:['HU6','HU8','HU11'],HU8:['HU7','HU9','HU2','HU1'],HU9:['HU8','HU1','HU12'],HU10:['HU4','HU5','HU13','HU16'],HU11:['HU7','HU8','HU12'],HU12:['HU9','HU11','HU8'],HU13:['HU4','HU10','HU14'],HU14:['HU13','HU10','HU15'],HU15:['HU14','HU13'],HU16:['HU5','HU6','HU10','HU17'],HU17:['HU16','HU6','HU7'],HU18:['HU11','HU7'],HU19:['HU12','HU9'],HU20:['HU10','HU13','HU14']};
  const CITY=['HU1','HU2','HU3','HU4','HU5','HU6','HU7','HU8','HU9'];
  const NEED=['Free computers','Free Wi-Fi','Free SIMs','Digital help','Council services','Printing','Job search help'];
  const TYPES=['Library','Council hub','Community group','Jobcentre'];
  const need=new Set(),types=new Set();
  let out='',here=null,label='';  // here = {lat,lng} of the searched postcode when geocoded
  function chips(box,list,set){list.forEach(n=>{const b=document.createElement('button');b.type='button';b.className='fh-chip';b.textContent=n;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{set.has(n)?set.delete(n):set.add(n);b.setAttribute('aria-pressed',set.has(n));render()});box.appendChild(b)})}
  chips($('fh-chips'),NEED,need);chips($('fh-types'),TYPES,types);
  $('fh-clear').addEventListener('click',()=>{need.clear();types.clear();document.querySelectorAll('.fh-chip').forEach(b=>b.setAttribute('aria-pressed','false'));render()});
  const norm=s=>s.toUpperCase().replace(/[^A-Z0-9]/g,'');
  function parse(s){const n=norm(s);const m=n.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})?$/);if(!m)return null;return {out:m[1],full:m[2]?m[1]+' '+m[2]:null}}
  // --- distance ---
  const rad=d=>d*Math.PI/180;
  function miles(a,b){const R=3958.8,dl=rad(b.lat-a.lat),dg=rad(b.lng-a.lng);const h=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
  const dist=v=>here&&v.lat!=null?miles(here,v):null;
  const fmtMi=m=>m<0.1?'Under 0.1 miles':m.toFixed(1)+' miles away';
  const API='https://api.postcodes.io';
  async function getJSON(url,opt){const r=await fetch(url,opt);if(!r.ok)throw new Error(r.status);return r.json()}
  let venueCoords=null;
  async function loadVenueCoords(){
    if(venueCoords)return venueCoords;
    const pcs=[...new Set(V.map(v=>v.postcode))];
    const j=await getJSON(API+'/postcodes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postcodes:pcs})});
    const m={};(j.result||[]).forEach(x=>{if(x.result)m[x.query]={lat:x.result.latitude,lng:x.result.longitude}});
    V.forEach(v=>{const c=m[v.postcode];if(c){v.lat=c.lat;v.lng=c.lng}});
    return venueCoords=m;
  }
  async function locate(p){
    const j=p.full?await getJSON(API+'/postcodes/'+encodeURIComponent(p.full)):await getJSON(API+'/outcodes/'+encodeURIComponent(p.out));
    const r=j.result;if(!r||r.latitude==null)throw new Error('no location');
    return {lat:r.latitude,lng:r.longitude};
  }
  // --- ranking ---
  function rank(v){if(!out)return 0;if(v.out===out)return 0;if((ADJ[out]||[]).includes(v.out))return 1;return 2}
  function el(t,c,txt){const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
  function card(v,lab){
    const li=el('li','fh-item');
    const head=el('div','fh-ih');head.appendChild(el('span','fh-type t-'+v.type.split(' ')[0].toLowerCase(),v.type));if(lab)head.appendChild(el('span','fh-near',lab));li.appendChild(head);
    li.appendChild(el('h3',null,v.name));
    const dl=el('dl','hub-d');const add=(k,val)=>{if(!val)return;dl.appendChild(el('dt',null,k));dl.appendChild(el('dd',null,val))};
    add('Address',v.address+' '+v.postcode+' · '+v.area);add('Open',v.hours||'Check opening times before you visit');add('Phone',v.phone);li.appendChild(dl);
    const of=el('div','offer');v.services.forEach(s=>of.appendChild(el('span',null,s)));li.appendChild(of);
    const ac=el('div','fh-act');
    const dir=el('a','fh-link','Directions');dir.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v.name+', '+v.address+' '+v.postcode);dir.rel='noopener';ac.appendChild(dir);
    if(v.link){const a=el('a','fh-link',v.type==='Library'?'Opening times':'More information');a.href=v.link;a.rel='noopener';ac.appendChild(a)}
    li.appendChild(ac);return li;
  }
  function render(){
    let list=V.filter(v=>(!need.size||[...need].every(n=>v.services.includes(n)))&&(!types.size||types.has(v.type)));
    const byDist=here&&list.some(v=>v.lat!=null);
    if(byDist)list.sort((a,b)=>(dist(a)??1e9)-(dist(b)??1e9)||a.name.localeCompare(b.name));
    else list.sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name));
    const L=$('fh-list');L.innerHTML='';
    const lab=v=>{if(byDist){const d=dist(v);return d==null?'':fmtMi(d)}return !out?'':v.out===out?'In '+out:(ADJ[out]||[]).includes(v.out)?'Nearby · '+v.out:''};
    list.forEach((v,i)=>{const c=card(v,lab(v));L.appendChild(c);if(!reduce&&c.animate&&i<12)c.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:320,delay:i*40,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'})});
    $('fh-empty').hidden=list.length>0;
    $('fh-res-h').textContent=out?'Places near '+(label||out):'All places in Hull';
    if(byDist){const w=list.filter(v=>dist(v)!=null&&dist(v)<=1).length;$('fh-count').textContent=`${w} within a mile, ${list.length} in total, closest first`}
    else{const inA=out?list.filter(v=>v.out===out).length:0,nb=out?list.filter(v=>rank(v)===1).length:0;
      $('fh-count').textContent=out?`${inA} in ${out}, ${nb} nearby, ${list.length} in total`:`${list.length} places`}
  }
  let seq=0;
  async function search(val){
    const msg=$('fh-msg');const p=parse(val||'');const my=++seq;
    here=null;label='';
    if(!val||!val.trim()){out='';msg.textContent='';render();return}
    if(!p){msg.textContent='Please enter a postcode, for example HU7 4EF, or just the first part, such as HU7.';msg.className='pc-msg err';return}
    if(!p.out.startsWith('HU')){out='';msg.textContent='That postcode isn’t in the Hull area, so we’re showing every place in Hull.';msg.className='pc-msg';render();return}
    out=p.out;
    const n=V.filter(v=>v.out===out).length;
    const outside=ADJ[out]&&!CITY.includes(out);
    msg.textContent=outside?`${out} is just outside the city. We’re showing the closest places in Hull first.`:n?`Showing places in ${out} first, then nearby areas.`:`We don’t list anywhere in ${out} yet, so we’re showing nearby areas first.`;
    msg.className='pc-msg';render();
    // Upgrade to real distances when postcodes.io answers
    try{
      const [loc]=await Promise.all([locate(p),loadVenueCoords()]);
      if(my!==seq)return;
      here=loc;label=p.full||p.out;
      msg.textContent=outside?`${label} is just outside the city. Here are the closest places in Hull.`:`Showing the closest places to ${label} first.`;
      render();
    }catch(e){
      if(my!==seq)return;
      if(p.full&&String(e.message)==='404'){msg.textContent=`We couldn’t find ${p.full}, so we’re showing places in ${out} and nearby areas first.`}
    }
  }
  $('fh-form').addEventListener('submit',e=>{e.preventDefault();const v=$('fh-pc').value;try{const u=new URL(location.href);if(v.trim())u.searchParams.set('pc',v.trim());else u.searchParams.delete('pc');history.replaceState(null,'',u)}catch(err){}search(v);const t=$('fh-res-h');if(t)t.scrollIntoView({block:'start'})});
  // Arriving from the homepage postcode box (/find-help/?pc=HU7)
  const q=new URLSearchParams(location.search).get('pc');
  if(q){$('fh-pc').value=q;search(q);requestAnimationFrame(()=>{const t=$('fh-res-h');if(t)t.scrollIntoView({block:'start'})})}
})();
