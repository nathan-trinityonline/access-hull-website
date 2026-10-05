// Homepage: "How at risk is your ward?" finder. Needs ward-data.js and ward-map.js first.
(function(){
  const pick=document.getElementById('ward-pick');
  WARDS.map(w=>w[0]).sort().forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n;pick.appendChild(o)});
  pick.value='Orchard Park';
  function upd(){
    const n=pick.value,w=byName[n],d=DD.ward[n];
    const top=Object.values(DD.lsoa).filter(l=>l.ward===n&&l.pct>=90).length, all=Object.values(DD.lsoa).filter(l=>l.ward===n).length;
    document.getElementById('f-dr').textContent='#'+d.rD;
    document.getElementById('f-imd').textContent='#'+w[4];
    document.getElementById('f-note').textContent=`${top} of its ${all} neighbourhoods are in England's riskiest 10% for digital exclusion.`;
  }
  pick.addEventListener('change',upd);upd();
  function goWard(n){
    if(typeof setView==='function'){setView('deri');select(n);}
    document.getElementById('map').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  }
  document.getElementById('f-go').addEventListener('click',()=>goWard(pick.value));

})();
