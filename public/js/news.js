// News listing: topic filter. The page is server-rendered with every post; this re-renders the cards for a topic.
(function(){
  const $=id=>document.getElementById(id);
  const POSTS=JSON.parse($('post-data').textContent);
  const CATS=['All','Guides','Data & insight'];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function thumb(p){
    const v=p.i%3;const bg=v===1?'var(--brand)':'var(--navy)', slab=v===1?'var(--navy)':'var(--brand)', ch=v===1?'var(--brand)':'var(--navy)';
    const x=[620,520,700][v];
    return `<svg class="bp-art" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="800" height="450" fill="${bg}"/><path d="M${x-260} 450 L${x} 0 L800 0 L800 450 Z" fill="${slab}"/><path d="M${x-120} 520 L${x+80} 170 L${x+280} 520" fill="none" stroke="${ch}" stroke-width="40" stroke-linejoin="round" stroke-linecap="round"/><path d="M${x-20} 520 L${x+80} 345 L${x+180} 520" fill="none" stroke="${ch}" stroke-width="40" stroke-linejoin="round" stroke-linecap="round"/><path d="M60 520 L260 170 L460 520" fill="none" stroke="${slab}" stroke-width="40" stroke-linejoin="round" stroke-linecap="round" opacity=".12"/></svg>`;
  }
  function el(t,c,txt){const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
  function card(p,feat){
    const a=el('a','bp-card'+(feat?' feat':''));a.href=p.href;
    const fig=el('div','bp-thumb');fig.innerHTML=thumb(p);fig.appendChild(el('span','bp-cat',p.cat));a.appendChild(fig);
    const b=el('div','bp-cbody');
    b.appendChild(el('p','bp-meta',p.date+'  ·  '+p.mins+' min read'));
    b.appendChild(el(feat?'h2':'h3',null,p.title));b.appendChild(el('p','bp-dek',p.dek));
    b.appendChild(el('span','bp-more','Read more'));a.appendChild(b);return a;
  }
  let cat='All';
  const chips=$('bl-cats');
  CATS.forEach(c=>{const b=el('button','fh-chip',c);b.type='button';b.setAttribute('aria-pressed',c===cat);b.addEventListener('click',()=>{cat=c;[...chips.children].forEach(x=>x.setAttribute('aria-pressed',x.textContent===c));renderList()});chips.appendChild(b)});
  function renderList(){
    const list=POSTS.filter(p=>cat==='All'||p.cat===cat);
    const f=$('bl-feat');f.innerHTML='';if(list[0])f.appendChild(card(list[0],true));
    const g=$('bl-grid');g.innerHTML='';list.slice(1).forEach((p,i)=>{const c=card(p);g.appendChild(c);if(!reduce&&c.animate)c.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:320,delay:i*60,fill:'backwards',easing:'cubic-bezier(.2,.7,.2,1)'})});
  }
})();
