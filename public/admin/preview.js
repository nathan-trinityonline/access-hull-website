// Live previews in the content editor, styled with the site's own CSS.
(function(){
  // The site's stylesheet has a hashed name, so find it from the homepage.
  if(window.AH_PREVIEW_CSS)CMS.registerPreviewStyle(window.AH_PREVIEW_CSS);
  else fetch('/').then(r=>r.text()).then(t=>{const m=t.match(/href="(\/_astro\/[^"]+\.css)"/);if(m)CMS.registerPreviewStyle(m[1])}).catch(()=>{});

  const fmt=d=>{try{return new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}catch(e){return d}};
  const art='<svg class="bp-art" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="800" height="450" fill="var(--navy)"/><path d="M360 450 L620 0 L800 0 L800 450 Z" fill="var(--brand)"/><path d="M500 520 L700 170 L900 520" fill="none" stroke="var(--navy)" stroke-width="40" stroke-linejoin="round" stroke-linecap="round"/><path d="M600 520 L700 345 L800 520" fill="none" stroke="var(--navy)" stroke-width="40" stroke-linejoin="round" stroke-linecap="round"/></svg>';

  const NewsPreview=createClass({render(){
    const e=this.props.entry,g=k=>e.getIn(['data',k])||'';
    const cta=e.getIn(['data','cta']);
    return h('article',{},
      h('header',{className:'bp-hero'},h('div',{className:'ah-in bp-hero-in'},
        h('div',{className:'bp-hero-txt'},
          h('p',{className:'bp-crumb'},h('a',{href:'#'},'News & guides'),' / ',g('category')),
          h('h1',{},g('title')||'Article title'),
          h('p',{className:'bp-hdek'},g('dek')),
          h('p',{className:'bp-hmeta'},(g('date')?fmt(g('date'))+'  ·  ':'')+'By the Access:Hull team')),
        h('div',{className:'bp-hero-art',dangerouslySetInnerHTML:{__html:art}}))),
      h('div',{className:'ah-sec bp-sec'},h('div',{className:'ah-in bp-grid'},
        h('div',{className:'bp-body'},this.props.widgetFor('body')),
        h('aside',{className:'bp-side'},cta&&cta.get('label')?h('a',{className:'btn btn-p bp-cta',href:'#'},cta.get('label')):null))));
  }});
  CMS.registerPreviewTemplate('news',NewsPreview);

  const ContactPreview=createClass({render(){
    const e=this.props.entry,g=k=>e.getIn(['data',k]);
    const addr=(g('address')||[]).toJS?g('address').toJS():[];
    return h('div',{className:'ah-sec'},h('div',{className:'ah-in'},h('aside',{className:'ct-side'},
      h('h2',{},'Other ways to reach us'),
      h('dl',{},h('dt',{},'Email'),h('dd',{},g('email')),h('dt',{},'Phone'),h('dd',{},g('phone')),
        h('dt',{},'Office'),h('dd',{},['Access:Hull'].concat(addr).map((l,i)=>h('span',{key:i,style:{display:'block'}},l))),
        h('dt',{},'Opening hours'),h('dd',{},g('hours'))))));
  }});
  CMS.registerPreviewTemplate('contact',ContactPreview);

  const VenuesPreview=createClass({render(){
    const vs=(this.props.entry.getIn(['data','venues'])||[]);const list=vs.toJS?vs.toJS():[];
    return h('div',{className:'ah-sec'},h('div',{className:'ah-in'},h('ol',{className:'fh-list'},list.map((v,i)=>
      h('li',{className:'fh-item',key:i},
        h('div',{className:'fh-ih'},h('span',{className:'fh-type t-'+String(v.type||'').split(' ')[0].toLowerCase()},v.type)),
        h('h3',{},v.name),
        h('dl',{className:'hub-d'},h('dt',{},'Address'),h('dd',{},[v.address,v.postcode].filter(Boolean).join(' ')+(v.area?' · '+v.area:'')),h('dt',{},'Open'),h('dd',{},v.hours||'Check opening times before you visit'),v.phone?h('dt',{},'Phone'):null,v.phone?h('dd',{},v.phone):null),
        h('div',{className:'offer'},(v.services||[]).map(s=>h('span',{key:s},s))))))));
  }});
  CMS.registerPreviewTemplate('venues',VenuesPreview);
})();
