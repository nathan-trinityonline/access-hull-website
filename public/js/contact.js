// Contact form: validation and sending.
(function(){
  const $=id=>document.getElementById(id);
  const {fail,firstBad,badMsg,send}=window.ahForms;
  const ct=$('ct'),cout=$('ct-out');
  ct.addEventListener('submit',async e=>{
    e.preventDefault();
    const bad=firstBad(ct);
    if(bad){cout.textContent=badMsg(bad);cout.className='pq-out err';bad.focus();return}
    const sub=$('ct-submit');sub.disabled=true;cout.className='pq-out';cout.textContent='Sending…';
    const ok=await send(ct);
    sub.disabled=false;
    if(ok){ct.hidden=true;const d=$('ct-done');d.hidden=false;d.focus()}
    else{cout.className='pq-out err';cout.textContent=fail}
  });
})();
