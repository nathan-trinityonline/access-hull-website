// Social tariff checker: tick benefits to see matching tariffs.
(function(){
  const $=id=>document.getElementById(id);
  // --- social tariff checker ---
  const OFF=[
    {n:'KCOM Full Fibre Flex',d:'Broadband, 30Mbps',p:'£14.99',q:['uc','pc','jsa','esa','is','hb','pip','dla','aa','care']},
    {n:'KCOM Full Fibre Flex Plus',d:'Broadband, 50Mbps',p:'£19.99',q:['uc','pc','jsa','esa','is','hb','pip','dla','aa','care']},
    {n:'O2 Essential Plan',d:'Mobile, 10GB data',p:'£10',q:['uc','pc','is','jsa','esa']},
    {n:'SMARTY Social Tariff',d:'Mobile, unlimited data',p:'£12',q:['uc','pc','jsa','esa','is']},
    {n:'VOXI For Now',d:'Mobile, unlimited data for 6 months',p:'£10',q:['uc','jsa','esa','pip','dla','aa']}
  ];
  const ben=$('st-ben'),res=$('st-res'),rh=$('st-res-h');
  function stUpd(){
    const sel=[...ben.querySelectorAll('input:checked')].map(x=>x.value);
    res.innerHTML='';
    const m=sel.length?OFF.filter(o=>o.q.some(q=>sel.includes(q))):[];
    rh.textContent=!sel.length?'Tick a benefit to see your options':m.length?`You may qualify for ${m.length} social tariff${m.length>1?'s':''}`:'No social tariffs match';
    m.forEach(o=>{const li=document.createElement('li');li.innerHTML=`<span><b></b><small></small></span><em></em>`;li.querySelector('b').textContent=o.n;li.querySelector('small').textContent=o.d;li.querySelector('em').textContent=o.p+'/mo';res.appendChild(li);if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&li.animate)li.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:320,delay:res.children.length*50,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'})});
    const fs=document.createElement('li');fs.className='free';fs.innerHTML='<span><b>National Databank free SIM</b><small>For anyone on a low income, no benefits needed</small></span><em>Free</em>';res.appendChild(fs);
  }
  ben.addEventListener('change',stUpd);stUpd();

})();
