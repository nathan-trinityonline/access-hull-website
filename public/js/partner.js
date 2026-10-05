// Partner questionnaire: five steps with validation, review and sending.
(function(){
  const $=id=>document.getElementById(id);
  const {fail,firstBad,badMsg,send,replay}=window.ahForms;
  const form=$('pq'),out=$('pq-out'),steps=[...form.querySelectorAll('.step')],items=[...$('pq-steps').children];
  const vals=n=>[...form.querySelectorAll(`input[name="${n}"]:checked`)].map(x=>x.value);
  const f=id=>$(id).value.trim();
  let cur=0;
  function rec(){return {org:f('pq-org'),type:f('pq-type'),website:f('pq-web'),wards:vals('wards'),involve:vals('involve'),supports:vals('who'),reach:f('pq-reach'),publicSpace:f('pq-space'),wifi:f('pq-wifi'),name:f('pq-name'),role:f('pq-role'),email:f('pq-email'),phone:f('pq-phone'),message:f('pq-msg')}}
  function review(){
    const r=rec(),rows=[['Organisation',r.org],['Type',r.type],['Website',r.website],['Areas',r.wards.join(', ')],['Get involved by',r.involve.join(', ')],['Supports',r.supports.join(', ')],['Residents a month',r.reach],['Public space',r.publicSpace],['Free Wi-Fi',r.wifi],['Name',r.name],['Role',r.role],['Email',r.email],['Phone',r.phone],['Message',r.message]];
    const dl=$('pq-review');dl.innerHTML='';
    rows.forEach(([k,v])=>{const dt=document.createElement('dt');dt.textContent=k;const dd=document.createElement('dd');dd.textContent=v||'Not given';if(!v)dd.className='na';dl.append(dt,dd)});
  }
  function show(i,anim){
    cur=i;steps.forEach((s,j)=>s.hidden=j!==i);if(anim)replay(steps[i]);
    items.forEach((li,j)=>{li.className=j<i?'done':j===i?'on':''});
    $('pq-bar').style.width=((i+1)/steps.length*100)+'%';
    $('pq-stepinfo').textContent=`Step ${i+1} of ${steps.length}: ${items[i].textContent}`;
    $('pq-prev').hidden=i===0;$('pq-next').hidden=i===steps.length-1;$('pq-submit').hidden=i!==steps.length-1;
    out.textContent='';out.className='pq-out';
    if(i===steps.length-1)review();
  }
  function check(i){
    const bad=firstBad(steps[i]);
    if(bad){out.textContent=badMsg(bad);out.className='pq-out err';bad.focus();return false}
    if(i===1&&!vals('involve').length){out.textContent='Please choose at least one way you would like to get involved.';out.className='pq-out err';form.querySelector('input[name="involve"]').focus();return false}
    return true;
  }
  function top(){$('pq-h').scrollIntoView({block:'start'})}
  $('pq-next').addEventListener('click',()=>{if(check(cur)){show(cur+1,true);top();const s=steps[cur].querySelector('input,select,textarea');if(s)s.focus({preventScroll:true})}});
  $('pq-prev').addEventListener('click',()=>{show(cur-1,true);top()});
  form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type!=='checkbox'&&cur<steps.length-1){e.preventDefault();$('pq-next').click()}});
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    for(let i=0;i<steps.length-1;i++){if(firstBad(steps[i])||(i===1&&!vals('involve').length)){show(i);check(i);return}}
    const sub=$('pq-submit');sub.disabled=true;out.className='pq-out';out.textContent='Sending…';
    const ok=await send(form);
    sub.disabled=false;
    if(ok){form.hidden=true;const d=$('pq-done');d.hidden=false;d.focus()}
    else{out.className='pq-out err';out.textContent=fail}
  });
  show(0);
})();
