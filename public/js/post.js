// Article page: copy-link button.
(function(){
  const $=id=>document.getElementById(id);
  const b=$('bp-sh-copy');if(!b)return;
  b.addEventListener('click',()=>{
    const url=b.dataset.url;
    const done=()=>{b.textContent='Link copied';setTimeout(()=>b.textContent='Copy link',2500)};
    const fallback=()=>{const i=$('bp-sh-url');i.hidden=false;i.value=url;i.select();b.textContent='Select and copy the link'};
    try{navigator.clipboard.writeText(url).then(done,fallback)}catch(err){fallback()}
  });
})();
