// Global behaviour for every page: menu, sticky header, stat count-ups, reading progress, map reveal, cookie consent.

(function(){
  const mb=document.getElementById('menu-btn'),nav=document.getElementById('main-nav');
  const setMenu=o=>{nav.classList.toggle('open',o);mb.setAttribute('aria-expanded',o);mb.setAttribute('aria-label',o?'Close menu':'Open menu');document.querySelector('.ah-head').classList.toggle('menu-open',o)};
  mb.addEventListener('click',()=>setMenu(!nav.classList.contains('open')));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){setMenu(false);mb.focus()}});
  addEventListener('resize',()=>{if(innerWidth>980&&nav.classList.contains('open'))setMenu(false)});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));

})();

(function(){
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const head=document.querySelector('.ah-head');
  const onScroll=()=>head.classList.toggle('scrolled',scrollY>40);
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  if(reduce)return;
  const stats=[...document.querySelectorAll('.ah-stats b, .st-facts b')];
  const parse=s=>{const m=s.match(/^([^0-9]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/);if(!m)return null;return {pre:m[1],n:parseFloat(m[2].replace(/,/g,'')),dec:(m[2].split('.')[1]||'').length,comma:m[2].includes(','),suf:m[3]}};
  const fmt=(p,v)=>{let s=v.toFixed(p.dec);if(p.comma)s=Number(s).toLocaleString('en-GB',{minimumFractionDigits:p.dec,maximumFractionDigits:p.dec});return p.pre+s+p.suf};
  const run=el=>{const final=el.dataset.final||el.textContent;el.dataset.final=final;const p=parse(final);if(!p)return;const t0=performance.now(),D=1100;
    const tick=t=>{const k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3);el.textContent=fmt(p,p.n*e);if(k<1)requestAnimationFrame(tick);else el.textContent=final};requestAnimationFrame(tick)};
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){run(e.target);io.unobserve(e.target)}}),{threshold:.6});
    stats.forEach(s=>io.observe(s));
  }
})();

(function(){
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // reading progress bar under the header
  const bar=document.getElementById('ah-prog');
  let ticking=false;
  const prog=()=>{ticking=false;const max=document.documentElement.scrollHeight-innerHeight;const k=max>200?Math.min(1,Math.max(0,scrollY/max)):0;bar.style.transform='scaleX('+k+')';bar.parentNode.classList.toggle('on',max>200&&scrollY>4)};
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(prog)}},{passive:true});
  addEventListener('resize',prog);prog();
  if(reduce||!('IntersectionObserver' in window))return;
  // map: neighbourhoods fill in from lowest to highest risk the first time the map is seen
  const map=document.getElementById('map');
  if(map&&map.animate){
    const io=new IntersectionObserver(es=>{es.forEach(e=>{if(!e.isIntersecting)return;io.disconnect();
      map.querySelectorAll('path.area').forEach(p=>{const m=(p.getAttribute('fill')||'').match(/--c(\d)/);const bin=m?+m[1]-1:0;
        p.animate([{opacity:.06},{opacity:1}],{duration:520,delay:120+bin*260+Math.random()*160,easing:'ease-out',fill:'backwards'})});
      map.querySelectorAll('.wline,.badge').forEach(p=>p.animate([{opacity:0},{opacity:1}],{duration:500,delay:1450,fill:'backwards'}));
      document.querySelectorAll('#list li').forEach((li,i)=>li.animate([{opacity:0,transform:'translateX(-10px)'},{opacity:1,transform:'none'}],{duration:380,delay:200+i*45,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'}));
    })},{threshold:.3});
    io.observe(map);
  }
})();

(function(){
  // Cookie consent: UK GDPR / PECR style. Nothing optional runs until the visitor opts in.
  const KEY='ah-consent', VERSION=1, MAX_AGE_DAYS=365, PREF_KEY='ah-prefs';
  const $=id=>document.getElementById(id);
  const banner=$('ck-banner'),dlg=$('ck-dlg'),pref=$('ck-pref'),an=$('ck-an'),toast=$('ck-toast');
  const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
  function setCookie(v){try{document.cookie=KEY+'='+encodeURIComponent(v)+';max-age='+(MAX_AGE_DAYS*86400)+';path=/;SameSite=Lax;Secure'}catch(e){}}
  function readCookie(){try{const m=document.cookie.match(new RegExp('(?:^|; )'+KEY+'=([^;]*)'));return m?decodeURIComponent(m[1]):null}catch(e){return null}}
  function load(){
    const raw=store.get(KEY)||readCookie();if(!raw)return null;
    try{const c=JSON.parse(raw);if(c.v!==VERSION)return null;if(Date.now()-new Date(c.date).getTime()>MAX_AGE_DAYS*864e5)return null;return c}catch(e){return null}
  }
  let consent=load();
  const listeners={analytics:[],preferences:[]};
  const api=window.ahConsent={
    has:cat=>cat==='essential'||!!(consent&&consent.prefs&&consent.prefs[cat]),
    on:(cat,fn)=>{(listeners[cat]=listeners[cat]||[]).push(fn);if(api.has(cat))try{fn()}catch(e){}},
    open:()=>openDialog(),
    get:()=>consent
  };
  function save(prefs,how){
    const before={analytics:api.has('analytics'),preferences:api.has('preferences')};
    consent={v:VERSION,date:new Date().toISOString(),prefs:{analytics:!!prefs.analytics,preferences:!!prefs.preferences}};
    const s=JSON.stringify(consent);store.set(KEY,s);setCookie(s);
    if(!consent.prefs.preferences)store.del(PREF_KEY); // withdrawing consent deletes what we stored
    ['analytics','preferences'].forEach(c=>{if(!before[c]&&api.has(c))(listeners[c]||[]).forEach(fn=>{try{fn()}catch(e){}})});
    if(consent.prefs.preferences)restorePrefs();
    renderStatus();
    return how;
  }
  function showBanner(){banner.hidden=false;$('ck-b-done').hidden=true;banner.querySelector('.ck-b-in').hidden=false;document.body.classList.add('ck-open')}
  function hideBanner(){banner.hidden=true;document.body.classList.remove('ck-open')}
  function confirmBanner(msg){banner.querySelector('.ck-b-in').hidden=true;const d=$('ck-b-done');d.hidden=false;$('ck-b-done-t').textContent=msg;d.querySelector('button').focus({preventScroll:true});clearTimeout(confirmBanner.t);confirmBanner.t=setTimeout(hideBanner,8000)}
  function say(msg){toast.textContent=msg;toast.hidden=false;clearTimeout(say.t);say.t=setTimeout(()=>toast.hidden=true,4000)}
  let lastFocus=null;
  function openDialog(){
    pref.checked=api.has('preferences');an.checked=api.has('analytics');lastFocus=document.activeElement;
    if(dlg.showModal){try{dlg.showModal()}catch(e){dlg.setAttribute('open','')}}else dlg.setAttribute('open','');
    pref.focus();
  }
  function closeDialog(){if(dlg.close)dlg.close();else dlg.removeAttribute('open');if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true})}
  const MSG={accept:'You’ve accepted all cookies.',reject:'You’ve rejected optional cookies.',save:'Your cookie settings have been saved.'};
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-ck]');if(!b)return;const a=b.dataset.ck;
    if(a==='accept'||a==='reject'||a==='save'){
      const fromDlg=!!b.closest('#ck-dlg');
      save(a==='accept'?{analytics:true,preferences:true}:a==='reject'?{analytics:false,preferences:false}:{analytics:an.checked,preferences:pref.checked});
      if(fromDlg){closeDialog();hideBanner();say(MSG[a]+' You can change them at any time.')}
      else confirmBanner(MSG[a]+' You can change your cookie settings at any time.');
    }
    else if(a==='manage'||a==='open'){e.preventDefault();openDialog()}
    else if(a==='close'){closeDialog()}
    else if(a==='close-go'){closeDialog()}
    else if(a==='hide'){hideBanner()}
  });
  dlg.addEventListener('cancel',()=>{setTimeout(()=>{if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true})},0)});
  dlg.addEventListener('click',e=>{if(e.target===dlg)closeDialog()});

  // "Remember my settings": postcode and ward, only with consent
  function getPrefs(){try{return JSON.parse(store.get(PREF_KEY)||'{}')}catch(e){return {}}}
  function putPrefs(p){if(api.has('preferences'))store.set(PREF_KEY,JSON.stringify(Object.assign(getPrefs(),p)))}
  function restorePrefs(){
    const p=getPrefs();
    if(p.postcode){['fh-pc','pc-mini-in'].forEach(id=>{const el=$(id);if(el&&!el.value)el.value=p.postcode})}
    const w=$('ward-pick');if(p.ward&&w&&[...w.options].some(o=>o.value===p.ward)&&w.value!==p.ward){w.value=p.ward;w.dispatchEvent(new Event('change'))}
  }
  document.addEventListener('submit',e=>{const f=e.target;if(f.id==='fh-form'||f.id==='pc-mini'){const v=(f.querySelector('input')||{}).value;if(v&&v.trim())putPrefs({postcode:v.trim().toUpperCase()})}},true);
  document.addEventListener('change',e=>{if(e.target.id==='ward-pick')putPrefs({ward:e.target.value})},true);
  api.on('preferences',restorePrefs);

  // Analytics hook: nothing is loaded today. Add a privacy-friendly tool here later and it will only run after consent.
  api.on('analytics',()=>{ /* load analytics script here */ });

  // live status on the cookies policy page
  function renderStatus(){
    const s=$('ck-status');if(!s)return;
    const c=consent;
    s.textContent=!c?'You haven’t made a choice yet, so only essential cookies are in use.':
      `Remember my settings: ${c.prefs.preferences?'on':'off'}. Analytics: ${c.prefs.analytics?'on':'off'}. Saved on ${new Date(c.date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}.`;
  }
  renderStatus();
  if(!consent)showBanner();
})();
