// Community survey: six steps, sent to /api/survey.php. Answers are anonymous;
// contact details are only sent when someone asks for help.
(function(){
  const $=id=>document.getElementById(id);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TASKS=JSON.parse($('sv-q').textContent).tasks;
  const form=$('sv'),out=$('sv-out'),steps=[...form.querySelectorAll('.step')],items=[...$('sv-steps').children];
  const wardSel=$('sv-ward'),helpBox=$('sv-help');
  const email=document.body.dataset.email,phone=document.body.dataset.phone;
  const reach=phone?`email ${email} or call ${phone}`:`email ${email}`;

  // "None" style answers can't be combined with others
  const EXCL=/^(None|I don't get online)/;
  form.querySelectorAll('.sv-chk').forEach(box=>box.addEventListener('change',e=>{
    const t=e.target;if(!t.checked)return;const excl=EXCL.test(t.value);
    box.querySelectorAll('input').forEach(x=>{if(x!==t&&(excl||EXCL.test(x.value)))x.checked=false});
  }));
  form.addEventListener('change',e=>{if(e.target.name==='wantHelp')helpBox.hidden=e.target.value!=='Yes'});

  // ---- read answers ----
  const radio=n=>(form.querySelector(`input[name="${n}"]:checked`)||{}).value||'';
  const checks=n=>[...form.querySelectorAll(`input[name="${n}"]:checked`)].map(x=>x.value);
  const f=id=>$(id).value.trim();
  const wantsHelp=()=>radio('wantHelp')==='Yes';
  function payload(){
    const skills={};TASKS.forEach((t,i)=>skills[t]=radio('sk'+i));
    const answers={who:radio('who'),ward:wardSel.value,age:radio('age'),disability:radio('disability'),access:checks('access'),devices:checks('devices'),freq:radio('freq'),cost:checks('cost'),tariff:radio('tariff'),benefits:radio('benefits'),skills,confidence:radio('confidence'),impact:checks('impact'),wantHelp:wantsHelp(),helpWith:wantsHelp()?checks('helpWith'):[],helpHow:wantsHelp()?radio('helpHow'):'',comments:f('sv-more')};
    const help=wantsHelp()?{firstName:f('sv-name'),phone:f('sv-phone'),email:f('sv-email'),bestTime:$('sv-time').value,language:f('sv-lang'),supportNeeds:f('sv-needs'),postcode:f('sv-pc'),shareWithPartner:$('sv-share').checked,consent:$('sv-consent').checked}:null;
    return {answers,help,'bot-field':form.elements['bot-field'].value};
  }

  // ---- steps ----
  let cur=0;
  const err=(m,el)=>{out.textContent=m;out.className='pq-out err';if(el&&el.focus)el.focus();return false};
  function check(i){
    const s=steps[i];
    if(i===0&&!wardSel.value)return err('Please choose the area you live in. Choose "Not sure" if you don’t know.',wardSel);
    for(const box of s.querySelectorAll('[data-required]')){
      const n=box.dataset.name;if(!s.querySelector(`input[name="${n}"]:checked`)){const q=box.closest('.grp').querySelector('.gl').textContent.replace(/ Choose all that apply\.| 1 is not at all, 5 is very confident\./,'');return err('Please answer: '+q,box.querySelector('input'))}
    }
    if(i===3){for(let k=0;k<TASKS.length;k++)if(!radio('sk'+k))return err('Please answer for: '+TASKS[k],form.querySelector(`input[name="sk${k}"]`))}
    if(i===5&&wantsHelp()){
      if(!f('sv-name'))return err('Please tell us your first name so we know who to ask for.',$('sv-name'));
      if(!f('sv-phone')&&!f('sv-email'))return err('Please give us a phone number or email so we can contact you.',$('sv-phone'));
      if(f('sv-email')&&!$('sv-email').checkValidity())return err('Please enter a valid email address.',$('sv-email'));
      if(!$('sv-consent').checked)return err('Please tick the box to say we can contact you about getting help.',$('sv-consent'));
    }
    return true;
  }
  function show(i){
    cur=i;steps.forEach((s,j)=>s.hidden=j!==i);items.forEach((li,j)=>li.className=j<i?'done':j===i?'on':'');
    if(!reduce&&steps[i].animate)steps[i].animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:350,easing:'cubic-bezier(.2,.7,.2,1)'});
    $('sv-bar').style.width=((i+1)/steps.length*100)+'%';$('sv-stepinfo').textContent=`Step ${i+1} of ${steps.length}: ${items[i].textContent}`;
    $('sv-prev').hidden=i===0;$('sv-next').hidden=i===steps.length-1;$('sv-submit').hidden=i!==steps.length-1;out.textContent='';out.className='pq-out';
  }
  const toTop=()=>{const t=form.getBoundingClientRect().top+scrollY-110;if(scrollY>t)window.scrollTo({top:t,behavior:reduce?'auto':'smooth'})};
  $('sv-next').addEventListener('click',()=>{if(check(cur)){show(cur+1);toTop()}});
  $('sv-prev').addEventListener('click',()=>{show(cur-1);toTop()});
  form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&!['checkbox','radio'].includes(e.target.type)&&cur<steps.length-1){e.preventDefault();$('sv-next').click()}});

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    for(let i=0;i<steps.length;i++){if(!check(i)){if(i!==cur){show(i);check(i)}return}}
    const btn=$('sv-submit');btn.disabled=true;out.className='pq-out';out.textContent='Sending…';
    const data=payload();let res=null;
    try{const r=await fetch('/api/survey.php',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)});res=await r.json()}catch(err){}
    btn.disabled=false;
    if(!res||!res.ok){out.className='pq-out err';out.textContent=res&&res.error==='busy'?'You’ve sent a few of these recently. Please try again in 10 minutes.':`We couldn’t send your answers. Please try again, or ${reach}.`;return}
    form.hidden=true;const d=$('sv-done');d.hidden=false;d.focus();
    $('sv-done-p').textContent=data.answers.wantHelp?'Your answers have been added to the live results, and we’ll be in touch within 5 working days about getting help.':'Your answers have been added to the live results.';
    loadCount();
  });
  $('sv-again').addEventListener('click',()=>{form.reset();helpBox.hidden=true;form.hidden=false;$('sv-done').hidden=true;show(0);toTop()});
  show(0);

  function loadCount(){fetch('/api/results.php').then(r=>r.json()).then(d=>{if(d&&d.ok)$('sv-count').textContent=d.total.toLocaleString('en-GB')}).catch(()=>{})}
  loadCount();
})();
