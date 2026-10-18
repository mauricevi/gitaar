'use strict';
function importFromLink(){
  const m=/[#&]add=([^&]*)/.exec(location.hash);if(!m)return;
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  let d;try{d=JSON.parse(decodeURIComponent(m[1]));}catch(e){return;}
  if(!d||typeof d.chords!=='string')return;
  const parsed=parseText(d.chords).map(sec=>sec.filter(c=>!c.bad));if(!parsed.flat().length)return;
  const name=(typeof d.name==='string'&&d.name.trim()?d.name.trim():PT.untitled).slice(0,80),sections=makeSections(parsed);
  let p=state.progs.find(x=>x.name===name&&progToText(x)===progToText({sections}));
  if(!p){p={id:newId(),name,tempo:clamp(+d.tempo||100,40,240),sections};state.progs.push(p);}
  if(['swing','bossa','ballad'].includes(d.style))state.pv.band.style=d.style;
  state.view.prog=p.id;state.view.sel=0;state.view.mode='prog';}

/* thema gedeeld met alle Practice Room-apps ('practiceRoom.theme': auto, light of dark) */
const THEMEKEY='practiceRoom.theme';
function readTheme(){try{const t=JSON.parse(localStorage.getItem(THEMEKEY)||'null');return['auto','light','dark'].includes(t)?t:null;}catch(e){return null;}}
function writeTheme(){try{localStorage.setItem(THEMEKEY,JSON.stringify(state.theme));}catch(e){}}

/* Getalvelden met data-drag (BPM): slepen omhoog = sneller, omlaag = langzamer (1 BPM per 4 pixels, met Shift 5 per stap);
   scrollen erboven werkt ook. Klikken zonder te slepen opent het veld om te typen. */
function bindDragNumbers(){let D=null;
  const set=(el,v)=>{v=clamp(v,+el.min||0,+el.max||999);if(+el.value!==v){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));}};
  document.addEventListener('pointerdown',e=>{const el=e.target.closest('input[data-drag]');if(!el||e.button>0||document.activeElement===el)return;
    D={el,y:e.clientY,v:+el.value||+el.min||0,moved:false,id:e.pointerId};e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch(x){}});
  document.addEventListener('pointermove',e=>{if(!D||e.pointerId!==D.id)return;const dy=D.y-e.clientY;if(!D.moved&&Math.abs(dy)<4)return;
    D.moved=true;document.body.classList.add('dragnum');set(D.el,Math.round(D.v+dy/4*(e.shiftKey?5:1)));});
  const end=e=>{if(!D||e.pointerId!==D.id)return;const d=D;D=null;document.body.classList.remove('dragnum');
    if(d.moved)d.el.dispatchEvent(new Event('change',{bubbles:true}));else{d.el.focus();d.el.select();}};
  document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
  let wt=null;
  document.addEventListener('wheel',e=>{const el=e.target.closest&&e.target.closest('input[data-drag]');if(!el)return;e.preventDefault();
    set(el,(+el.value||0)+(e.deltaY<0?1:-1)*(e.shiftKey?5:1));clearTimeout(wt);wt=setTimeout(()=>el.dispatchEvent(new Event('change',{bubbles:true})),400);},{passive:false});}

function init(){
  state=load();
  bindDragNumbers();
  {const t=readTheme();if(t)state.theme=t;else writeTheme();}
  importFromLink();
  if(!readSharedWood()&&state.set.wood==='custom') writeSharedWood();   /* oude eigen houtkleur doorgeven aan de andere tools */
  applyText();
  buildRows();
  buildSettings();
  bindBoardUI();
  bindProgUI();
  $('#btnTheme').addEventListener('click',()=>{state.theme=state.theme==='auto'?'light':(state.theme==='light'?'dark':'auto');writeTheme();update();});
  $('#btnSet').addEventListener('click',()=>{const p=$('#panelSet');p.open=true;p.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
  let armed=false,timer=null;
  $('#btnReset').addEventListener('click',()=>{
    const msg=$('#resetMsg');
    if(!armed){armed=true;msg.textContent=T.reset.sure;timer=setTimeout(()=>{armed=false;msg.textContent='';},4000);return;}
    clearTimeout(timer);armed=false;msg.textContent=T.reset.done;
    const w=[state.set.wood,state.set.woodCustom],keep={progs:state.progs,view:state.view,pv:state.pv};   /* houtsoort en progressies blijven staan */
    SPREF={};try{localStorage.removeItem('toonladderTrainer:scalePref');}catch(e){}
    state=clone(DEFAULTS);state.set.wood=w[0];state.set.woodCustom=w[1];Object.assign(state,keep);lastOk.A=lastOk.B=null;buildSettings();update();
    setTimeout(()=>{msg.textContent='';},2500);
  });
  /* houtkleur gewijzigd in een andere tool of tabblad */
  addEventListener('storage',e=>{if(e.key===SHARED){readSharedWood();applyWood();woodSel();}
    if(e.key===THEMEKEY){const t=readTheme();if(t&&t!==state.theme){state.theme=t;update();}}});
  /* in een ingesloten weergave (zoals een artifact) leidt de zijbalk nergens heen */
  try{if(window.top!==window.self)$('#side').hidden=true;}catch(e){}
  update();
}

const API={parseFormula,buildScale,makeScale,SCALES,ROOTS,TUNINGS,computePositions,availableSystems,defaultSystem,cagedPositions,npsPositions,windowPositions,DEFAULTS,mod};
if(typeof module!=='undefined'&&module.exports) module.exports=API;
if(typeof document!=='undefined'&&document.getElementById('rows')) init();
