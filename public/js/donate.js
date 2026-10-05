// Donate a device: four steps with validation, review and sending.
(function(){
  const $=id=>document.getElementById(id);
  const {fail,firstBad,badMsg,send,replay}=window.ahForms;
  const f=id=>$(id).value.trim();
  const fm=$('dd'),o=$('dd-out'),st=[...fm.querySelectorAll('.step')],it=[...$('dd-steps').children];
  const rv=n=>(fm.querySelector(`input[name="${n}"]:checked`)||{}).value;
  const qtys=()=>[...$('dd-qty').querySelectorAll('input')].map(x=>[x.dataset.k,Math.max(0,parseInt(x.value,10)||0)]).filter(x=>x[1]>0);
  const isBiz=()=>rv('dd-who')!=='An individual', isCol=()=>rv('dd-how')==='Collection';
  const dropHint=$('dd-how-hint').textContent;
  function sync(){
    $('dd-org-l').hidden=!isBiz();$('dd-org').required=isBiz();
    $('dd-addr-l').hidden=!isCol();$('dd-addr').required=isCol();
    $('dd-how-hint').textContent=isCol()?'We collect donations of 10 or more devices. For fewer, we may ask you to drop them off.':dropHint;
  }
  fm.addEventListener('change',sync);sync();
  let c=0;
  function data(){return {donorType:rv('dd-who'),organisation:isBiz()?f('dd-org'):'',name:f('dd-name'),email:f('dd-email'),phone:f('dd-phone'),postcode:f('dd-pc'),age:f('dd-age'),condition:f('dd-cond'),chargers:f('dd-chg'),details:f('dd-desc'),handover:rv('dd-how'),collectionAddress:isCol()?f('dd-addr'):'',timing:f('dd-when'),wipeCertificate:$('dd-cert').checked}}
  function review(){
    const d=data(),q=qtys(),tot=q.reduce((a,x)=>a+x[1],0);
    const rows=[['Donating as',d.donorType+(d.organisation?' ('+d.organisation+')':'')],['Name',d.name],['Email',d.email],['Phone',d.phone],['Postcode',d.postcode],['Devices',q.map(x=>x[1]+' × '+x[0]).join(', ')+' ('+tot+' in total)'],['Age',d.age],['Condition',d.condition],['Chargers',d.chargers],['Details',d.details],['Handover',d.handover==='Collection'?'Collection from '+d.collectionAddress:d.handover],['When',d.timing],['Data-wipe certificate',d.wipeCertificate?'Yes':'No']];
    const dl=$('dd-review');dl.innerHTML='';
    rows.forEach(([k,v])=>{const dt=document.createElement('dt');dt.textContent=k;const dd=document.createElement('dd');dd.textContent=v||'Not given';if(!v)dd.className='na';dl.append(dt,dd)});
  }
  function show(i,anim){
    c=i;st.forEach((s,j)=>s.hidden=j!==i);if(anim)replay(st[i]);it.forEach((li,j)=>li.className=j<i?'done':j===i?'on':'');
    $('dd-bar').style.width=((i+1)/st.length*100)+'%';$('dd-stepinfo').textContent=`Step ${i+1} of ${st.length}: ${it[i].textContent}`;
    $('dd-prev').hidden=i===0;$('dd-next').hidden=i===st.length-1;$('dd-submit').hidden=i!==st.length-1;o.textContent='';o.className='pq-out';
    if(i===st.length-1)review();
  }
  function err(m,el){o.textContent=m;o.className='pq-out err';if(el)el.focus();return false}
  function check(i){
    const bad=firstBad(st[i]);if(bad)return err(badMsg(bad),bad);
    if(i===1&&!qtys().length)return err('Please enter how many devices you would like to donate.',$('dd-q-laptop'));
    return true;
  }
  $('dd-next').addEventListener('click',()=>{if(check(c)){show(c+1,true);$('dd-form-h').scrollIntoView({block:'start'})}});
  $('dd-prev').addEventListener('click',()=>{show(c-1,true);$('dd-form-h').scrollIntoView({block:'start'})});
  fm.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&!['checkbox','radio'].includes(e.target.type)&&c<st.length-1){e.preventDefault();$('dd-next').click()}});
  fm.addEventListener('submit',async e=>{
    e.preventDefault();
    for(let i=0;i<st.length;i++){if(!check(i)){if(i!==c){show(i);check(i)}return}}
    const s=$('dd-submit');s.disabled=true;o.className='pq-out';o.textContent='Sending…';
    const ok=await send(fm);
    s.disabled=false;
    if(ok){fm.hidden=true;const d=$('dd-done');d.hidden=false;d.focus()}else err(fail);
  });
  show(0);
})();
