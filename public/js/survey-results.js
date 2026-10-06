// Live survey results from /api/results.php (totals only, small groups held back),
// plus the staff export for people signed in to the content editor.
(function(){
  const $=id=>document.getElementById(id);
  const MIN_FALLBACK=5;

  // ---- live results ----
  function bars(el,obj,note){
    el.innerHTML='';
    if(!obj){el.innerHTML=`<p class="sr-note">${note||'Not enough answers yet.'}</p>`;return}
    Object.entries(obj).sort((a,b)=>b[1]-a[1]).forEach(([label,p])=>{
      const r=document.createElement('div');r.className='sr-row';r.title=`${label}: ${p}%`;
      const l=document.createElement('span');l.className='sr-l';l.textContent=label;
      const t=document.createElement('span');t.className='sr-track';const b=document.createElement('i');b.style.width=p+'%';t.appendChild(b);
      const v=document.createElement('span');v.className='sr-v';v.textContent=p+'%';
      r.append(l,t,v);el.appendChild(r)});
  }
  let mapBuilt=false;const wardPath={};
  function buildMap(){
    const svg=$('sr-map');if(typeof GEO==='undefined'){svg.style.display='none';return}
    svg.setAttribute('viewBox',`0 0 ${GEO.W} ${GEO.H}`);const NS='http://www.w3.org/2000/svg';
    Object.entries(GEO.wards).forEach(([n,g])=>{const p=document.createElementNS(NS,'path');p.setAttribute('d',g.d);p.setAttribute('class','sr-ward');const t=document.createElementNS(NS,'title');p.appendChild(t);svg.appendChild(p);wardPath[n]=p});
    mapBuilt=true;
  }
  function render(d){
    const N=d.total,MIN=d.min||MIN_FALLBACK;
    $('sr-upd').textContent=N?`${N.toLocaleString('en-GB')} response${N===1?'':'s'} · updated ${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`:'';
    $('sr-empty').hidden=d.enough;$('sr-body').hidden=!d.enough;
    if(!d.enough){
      $('sr-empty').querySelector('h2').textContent=N?'Results coming soon':'No responses yet';
      $('sr-empty').querySelector('p').textContent=N?`Results appear once ${MIN} people have taken part, so no one can be identified. ${N} so far.`:'Results will appear here as soon as people start taking part. Be the first.';
      return;
    }
    const k=d.kpis;
    $('sr-kpis').innerHTML='';
    [[N.toLocaleString('en-GB'),'people have taken part'],[k.help+'%','asked us for help'],[k.noHome+'%','have no home broadband'],[k.neverTariff+'%','had never heard of social tariffs'],[(k.confidence==null?'–':k.confidence.toFixed(1))+' / 5','average confidence online']].forEach(([b,s])=>{const li=document.createElement('li');const bb=document.createElement('b');bb.textContent=b;const ss=document.createElement('span');ss.textContent=s;li.append(bb,ss);$('sr-kpis').appendChild(li)});
    bars($('sr-impact'),d.impact);bars($('sr-skills'),d.skills);
    bars($('sr-help'),d.help,`Shown once ${MIN} people have asked for help.`);
    bars($('sr-access'),d.access);bars($('sr-cost'),d.cost);
    if(!mapBuilt)buildMap();
    const by=d.wards||{};const shown=Object.values(by);const max=Math.max(MIN,...shown);
    Object.entries(wardPath).forEach(([w,p])=>{const n=by[w]||0;let fill='var(--soft)';
      if(n>=MIN){const k=Math.min(4,Math.floor((n-MIN)/Math.max(1,(max-MIN+1))*5));fill=`var(--c${k+1})`}
      p.setAttribute('fill',fill);p.firstChild.textContent=n>=MIN?`${w}: ${n} responses`:`${w}: fewer than ${MIN} responses`});
    $('sr-leg').innerHTML=`<span><i style="background:var(--soft)"></i>Fewer than ${MIN}</span><span><i style="background:var(--c1)"></i>${MIN}</span><span class="sr-ramp"><i style="background:var(--c2)"></i><i style="background:var(--c3)"></i><i style="background:var(--c4)"></i><i style="background:var(--c5)"></i></span><span>${max} responses</span>`;
  }
  let failed=false;
  function load(){
    fetch('/api/results.php',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(!d.ok)throw 0;failed=false;render(d)}).catch(()=>{
      if(!failed)$('sr-upd').textContent='Live updates are paused. Refresh the page to try again.';failed=true;
    });
  }
  load();setInterval(()=>{if(!document.hidden)load()},60000);

  // ---- staff export ----
  // Anyone signed in to the content editor (/admin/) with publish access sees this.
  const box=$('sr-admin');let token='';
  try{token=(JSON.parse(localStorage.getItem('decap-cms-user')||'{}').token)||''}catch(e){}
  const post=body=>fetch('/api/export.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({token},body))});
  if(token)post({check:true}).then(r=>{if(r.ok){box.querySelector('p').textContent='Only staff signed in to the content editor can see this. Downloads an Excel file with the latest data.';box.hidden=false}}).catch(()=>{});
  const msg=t=>{$('sr-x-msg').textContent=t};
  // Minimal .xlsx writer (no external library): stored ZIP of SpreadsheetML parts
  const XL=(function(){
    const enc=new TextEncoder();
    const crcT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
    const crc=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcT[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0};
    function zip(files){
      const parts=[],central=[];let off=0;
      files.forEach(([name,str])=>{
        const nb=enc.encode(name),db=enc.encode(str),c=crc(db);
        const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint32(14,c,true);h.setUint32(18,db.length,true);h.setUint32(22,db.length,true);h.setUint16(26,nb.length,true);
        parts.push(new Uint8Array(h.buffer),nb,db);
        const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint32(16,c,true);ch.setUint32(20,db.length,true);ch.setUint32(24,db.length,true);ch.setUint16(28,nb.length,true);ch.setUint32(42,off,true);
        central.push(new Uint8Array(ch.buffer),nb);off+=30+nb.length+db.length;
      });
      const cdSize=central.reduce((a,b)=>a+b.length,0);
      const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,off,true);
      const all=parts.concat(central,[new Uint8Array(e.buffer)]);const out=new Uint8Array(all.reduce((a,b)=>a+b.length,0));let p=0;all.forEach(x=>{out.set(x,p);p+=x.length});return out;
    }
    const esc=s=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const col=i=>{let s='';i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
    function sheetXml(rows){
      const keys=rows.length?Object.keys(rows[0]):['Note'];const data=rows.length?rows:[{Note:''}];
      const cell=(v,r,c,st)=>{const ref=col(c)+r;if(typeof v==='number'&&isFinite(v))return `<c r="${ref}"${st?` s="${st}"`:''}><v>${v}</v></c>`;return `<c r="${ref}" t="inlineStr"${st?` s="${st}"`:''}><is><t xml:space="preserve">${esc(v==null?'':v)}</t></is></c>`};
      let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>'+keys.map((k,i)=>`<col min="${i+1}" max="${i+1}" width="${Math.min(50,Math.max(12,k.length+4))}" customWidth="1"/>`).join('')+'</cols><sheetData>';
      x+='<row r="1">'+keys.map((k,i)=>cell(k,1,i,1)).join('')+'</row>';
      data.forEach((row,ri)=>{x+=`<row r="${ri+2}">`+keys.map((k,i)=>cell(row[k],ri+2,i,0)).join('')+'</row>'});
      x+='</sheetData>'+(rows.length?`<autoFilter ref="A1:${col(keys.length-1)}${rows.length+1}"/>`:'')+'</worksheet>';return x;
    }
    return function build(sheets){
      const f=[['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>'],
        ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
        ['xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>`<sheet name="${esc(s.name.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>'],
        ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
        ['xl/styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF08222E"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>']];
      sheets.forEach((s,i)=>f.push([`xl/worksheets/sheet${i+1}.xml`,sheetXml(s.rows)]));
      return zip(f);
    };
  })();
  const flat=v=>Array.isArray(v)?v.join('; '):(v===true?'Yes':v===false?'No':(v==null?'':v));
  const fmtDate=s=>s?(s.length>10?new Date(s.replace(' ','T')+'Z').toLocaleString('en-GB'):new Date(s).toLocaleDateString('en-GB')):'';
  const asRows=(list,cols)=>list.map(r=>{const o={'Submitted':fmtDate(r.submitted)};Object.entries(cols).forEach(([label,key])=>o[label]=flat(typeof key==='function'?key(r):r[key]));return o});
  const formRows=list=>list.map(({submitted,...rest})=>Object.assign({'Submitted':fmtDate(submitted)},rest));
  $('sr-x-btn').addEventListener('click',async()=>{
    const btn=$('sr-x-btn');btn.disabled=true;msg('Gathering the latest data…');
    try{
      const withContacts=$('sr-x-contacts').checked;
      const r=await post({contacts:withContacts});const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(r.status===403?'signin':'server');
      const resp=d.responses,TASKS=JSON.parse($('sr-tasks').textContent);
      const cols={'Completed for':'who','Ward':'ward','Age':'age','Disability or long-term condition':'disability','Gets online at home by':'access','Devices':'devices','How often online':'freq','Cost in last 12 months':'cost','Social tariffs':'tariff','Gets benefits':'benefits'};
      TASKS.forEach(t=>cols['Skill: '+t]=x=>(x.skills||{})[t]||'');
      Object.assign(cols,{'Confidence (1-5)':x=>x.confidence||'','Offline makes harder':'impact','Asked for help':'wantHelp','Help wanted':'helpWith','Help preferred':'helpHow','Comments':'comments'});
      const by={};resp.forEach(r=>{const w=r.ward||'Not given';(by[w]=by[w]||{n:0,h:0,nb:0,nt:0});by[w].n++;if(r.wantHelp)by[w].h++;if(!(r.access||[]).includes('Home broadband'))by[w].nb++;if(r.tariff==='No, never')by[w].nt++});
      const pc=(a,b)=>b?Math.round(a/b*100):0;
      const sRows=Object.entries(by).sort((a,b)=>b[1].n-a[1].n).map(([w,v])=>({'Ward':w,'Responses':v.n,'Asked for help':v.h,'% asked for help':pc(v.h,v.n),'% no home broadband':pc(v.nb,v.n),'% never heard of social tariffs':pc(v.nt,v.n)}));
      const sheets=[];const add=(name,rows,empty)=>sheets.push({name,rows:rows.length?rows:[{Note:empty}]});
      add('Summary by ward',sRows,'No survey responses yet');
      add('Survey responses',asRows(resp,cols),'No survey responses yet');
      if(withContacts){
        add('Help requests',asRows(d.help,{'Status':x=>x.status||'new','First name':'firstName','Phone':'phone','Email':'email','Best time':'bestTime','Language':'language','Support needs':'supportNeeds','Postcode':'postcode','Ward':'ward','Help wanted':'helpWith','Help preferred':'helpHow','Completed for':'completedFor','OK to share with partner':'shareWithPartner'}),'No help requests yet');
        add('Partner questionnaires',formRows(d.forms.partner),'No partner questionnaires yet');
        add('Contact enquiries',formRows(d.forms.contact),'No enquiries yet');
        add('Device donations',formRows(d.forms['donate-a-device']),'No donation offers yet');
      }
      const blob=new Blob([XL(sheets)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`access-hull-${withContacts?'all-data':'survey'}-${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
      msg(`Downloaded. ${resp.length} survey response${resp.length===1?'':'s'}${withContacts?', plus help requests and form submissions':''}.`);
    }catch(e){
      msg(e&&e.message==='signin'?'Your editor sign-in has expired. Sign in again at /admin/ and come back.':'Couldn’t create the spreadsheet. Please try again.');
    }
    btn.disabled=false;
  });
})();
