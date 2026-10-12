/* ================= Spanish: translate interface text after each render ================= */
S.lang=store.get('lang','en');
const ES_MON={Jan:'ene',Feb:'feb',Mar:'mar',Apr:'abr',May:'may',Jun:'jun',Jul:'jul',Aug:'ago',Sep:'sept',Oct:'oct',Nov:'nov',Dec:'dic'};
const ES_MONL={January:'enero',February:'febrero',March:'marzo',April:'abril',May:'mayo',June:'junio',July:'julio',August:'agosto',September:'septiembre',October:'octubre',November:'noviembre',December:'diciembre'};
const DATE_RX='(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \\d{1,2}, \\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:uary|ruary|ch|il|e|y|ust|tember|ober|ember)? \\d{4})';
const PH={e:'(.+?)',m:'(\\$[\\d.,]+[KMB]?)',d:'('+DATE_RX+')',p:'(-?\\d[\\d,]*(?:\\.\\d+)?%)',n:'(\\d[\\d,]*(?:\\.\\d+)?)'};
function esDate(s){
  let m=s.match(/^(\w{3}) (\d{1,2}), (\d{4})$/);if(m&&ES_MON[m[1]])return `${m[2]} ${ES_MON[m[1]]} ${m[3]}`;
  m=s.match(/^(\w+) (\d{4})$/);if(m)return `${ES_MONL[m[1]]||ES_MON[m[1]]||m[1]} ${m[2]}`;
  return s;
}
let I18N_EXACT=null,I18N_RX=null;
function i18nCompile(){
  if(I18N_EXACT)return;
  I18N_EXACT=new Map();I18N_RX=[];
  const dict=typeof ES_DICT!=='undefined'?ES_DICT:{};
  for(const [en,es] of Object.entries(dict)){
    if(!es||es===en)continue;
    if(!/\{[emdpn]\}/.test(en)){I18N_EXACT.set(en,es);continue}
    const kinds=[];const src=en.replace(/[.*+?^$()|[\]\\]/g,'\\$&').replace(/\{([emdpn])\}/g,(_,k)=>{kinds.push(k);return PH[k]});
    const lit=en.split(/\{[emdpn]\}/).sort((a,b)=>b.length-a.length)[0];
    if(lit.replace(/[^A-Za-z]/g,'').length<3)continue;
    try{I18N_RX.push({rx:new RegExp('^'+src+'$'),kinds,es,lit,len:en.length})}catch(e){}
  }
  I18N_RX.sort((a,b)=>b.len-a.len);
}
function i18nStr(raw){
  const t=raw.replace(/\s+/g,' ').trim();if(!t||!/[A-Za-z]/.test(t))return null;
  let out=I18N_EXACT.get(t);
  if(out==null){
    for(const r of I18N_RX){
      if(!t.includes(r.lit))continue;
      const m=r.rx.exec(t);if(!m)continue;
      let i=0;out=r.es.replace(/\{([emdpn])\}/g,(_,k)=>{const v=m[1+i++];return v==null?'':k==='d'?esDate(v):k==='e'?(I18N_EXACT.get(v)||v):v});
      break;
    }
  }
  if(out==null)return null;
  const lead=raw.match(/^\s*/)[0],trail=raw.match(/\s*$/)[0];
  return lead+out+trail;
}
function translateRoot(root){
  if(!root||S.lang!=='es')return;
  i18nCompile();
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;return p&&!p.closest('script,style,svg,.notr,.logo')?1:2}});
  const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
  for(const n of nodes){const v=i18nStr(n.nodeValue);if(v!=null&&v!==n.nodeValue)n.nodeValue=v}
  root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el=>['placeholder','aria-label','title'].forEach(a=>{const v=el.getAttribute(a);if(!v)return;const t=i18nStr(v);if(t!=null)el.setAttribute(a,t.trim())}));
}
function translateAll(){
  document.documentElement.lang=S.lang==='es'?'es':'en';
  if(S.lang!=='es')return;
  ['#app','#panel','#tabbar','#drawer'].forEach(s=>{const el=$(s);if(el)translateRoot(el)});
}
function setLang(l){S.lang=l;store.set('lang',l);const d=$('#drawer');const wasOpen=d&&!d.hidden;render();if(wasOpen){const pn=d.querySelector('.dpanel');pn.innerHTML=drawerHtml()}}
window.addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(!b)return;e.preventDefault();e.stopPropagation();setLang(b.dataset.lang)},true);
/* run last: translate, then add plain-language term explanations in the active language */
const _render6=render;
render=function(){_render6();try{translateAll();if(S.lang==='es'){glossify($('#app'))}}catch(e){console.warn(e)}};
const _openSheet3=openSheet;
openSheet=function(t,h){_openSheet3(t,h);try{if(S.lang==='es'){translateRoot($('#panel'));glossify($('#panel'))}}catch(e){console.warn(e)}};
const _drawerHtmlEN=drawerHtml;
drawerHtml=function(){const s=_drawerHtmlEN();if(S.lang!=='es')return s;const t=document.createElement('div');t.innerHTML=s;try{translateRoot(t)}catch(e){}return t.innerHTML};
