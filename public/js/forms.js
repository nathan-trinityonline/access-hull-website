// Shared form helpers: validation messages and sending.
// Forms post to /api/form.php, which emails each form to the addresses set in api/config.php on the server.
window.ahForms=(function(){
  const b=document.body.dataset;
  const fail=`We couldn't send this. Please try again, or email ${b.email}`+(b.phone?` or call ${b.phone}.`:'.');
  const labelOf=x=>(x.closest('label')?x.closest('label').firstChild.textContent.trim().replace(/\s*\(optional\)/,''):'this').toLowerCase();
  function firstBad(scope){
    return [...scope.querySelectorAll('[required]')].find(x=>x.type==='checkbox'?!x.checked:!x.value.trim()||(x.type==='email'&&!x.checkValidity()));
  }
  function badMsg(x){return x.id==='dd-own'?'Please confirm the devices are yours to give away.':x.type==='checkbox'?'Please tick the box to say we can contact you.':x.type==='email'&&x.value.trim()?'Please enter a valid email address.':'Please fill in '+labelOf(x)+'.'}
  // Post the form's fields, url-encoded. Ticked boxes that share a name are joined into one value.
  async function send(form){
    const vals={};
    for(const [k,v] of new FormData(form)){if(typeof v!=='string')continue;vals[k]=k in vals?vals[k]+', '+v:v}
    try{
      const r=await fetch(form.getAttribute('action')||'/api/form.php',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body:new URLSearchParams(vals).toString()});
      return r.ok;
    }catch(e){return false}
  }
  const replay=el=>{if(!el)return;el.classList.remove('vin');void el.offsetWidth;el.classList.add('vin')};
  return {fail,firstBad,badMsg,send,replay};
})();
