/* ═══════════ 3. OPSLAG ═══════════
   'chordFinder.v1' = instellingen (akkoord, soort, filters), 'chordFinder.log' = oefentijd per dag (voor de kalender op Home):
   {"2026-10-18":{s:seconden,p:[akkoorden]}}. Onleesbare opslag wordt niet overschreven maar eerst bewaard als KEY+'.bad'. */
const KEY='chordFinder.v1',LOGKEY='chordFinder.log',SHARED='practiceRoom.board',THEMEKEY='practiceRoom.theme';
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}};
function readSafe(k){let raw=null;try{raw=localStorage.getItem(k);}catch(e){return null;}if(raw==null)return null;
  try{return JSON.parse(raw);}catch(e){try{if(localStorage.getItem(k+'.bad')==null)localStorage.setItem(k+'.bad',raw);}catch(_){}return null;}}   /* eerste kapotte versie blijft bewaard */
/* vóór het wegschrijven van het logboek de opgeslagen versie erbij (ander tabblad): per dag blijft de grootste tijd */
function logMerge(k,L){const o=readSafe(k),sz=v=>v&&typeof v==='object'?+v.s||0:0;if(!o||typeof o!=='object'||Array.isArray(o))return L;
  Object.keys(o).forEach(d=>{if(!(d in L)||sz(o[d])>sz(L[d]))L[d]=o[d];});return L;}
const DEF={theme:'auto',chord:'Cmaj7',type:'drop2',str:'all',low:'all',top:'all',from:1,to:MAXF,labels:'int',group:'set',allTones:false,bass:true,sel:null,
  mode:'find',idf:[-1,3,2,0,1,0],idSel:0,   /* mode = Finder, What's this chord? of Progression; idf = frets per snaar daar (−1 = gedempt) */
  /* Progression (zie progression.js): tekst, soort, voice-leadingmodus, positie, snarenset, melodie, tempo, loop, vergrendelde vormen */
  pText:'Dm7 G7 Cmaj7(2) | Am7 D7 Gmaj7(2)',pType:'drop2',pMode:'smooth',pPos:5,pStr:'auto',pMel:'',pTempo:120,pLoop:true,pLock:{},pTypes:{},pFit:'refit',
  /* band (fase 4): baslijn, stijl, drums, volume per instrument (0–100), baslijn op de hals */
  pLine:'walk',pStyle:'swing',pDrums:true,pVol:{piano:100,bass:100,drums:80},pBNeck:false,
  dgSize:100,   /* grootte van alle akkoorddiagrammen in procenten (80–200) */
  colOpen:true,cardDet:'compact',   /* kolom rechts open/dicht; kaartdetails in Progression: compact (naam, diagram, omkering) of full (+ stemmen en baslijn) */
  /* strook "Strings & filters" open/dicht (beide modi); filters in Progression: snarenset, omkering (0–3), topnoot (R/3/5/7/x = kleurnoot);
     favorieten (Find voicings): verschuifbare vormen {q: akkoordsoort, t: voicingsoort, s: snarenset, i: halve tonen boven de grondtoon per noot} */
  fOpen:false,pgF:{str:'all',inv:'all',top:'all'},favs:[]};
const PG_TOPS=['R','3','5','7','x'];
function load(){const o=readSafe(KEY),s=Object.assign({},DEF,o&&typeof o==='object'&&!Array.isArray(o)?o:{}),str=x=>typeof x==='string'?x.slice(0,40):'all';
  s.theme=['auto','light','dark'].includes(s.theme)?s.theme:'auto';
  s.chord=typeof s.chord==='string'&&parseChord(s.chord)?s.chord:DEF.chord;
  s.type=VTYPES.includes(s.type)||s.type==='fav'?s.type:DEF.type;   /* 'fav' = keuze "★ Favourites" (alle favorieten van deze akkoordsoort) */
  s.str=str(s.str);s.low=str(s.low);s.top=str(s.top);s.sel=typeof s.sel==='string'?s.sel.slice(0,40):null;
  s.from=Math.min(MAXF,Math.max(1,Math.round(+s.from)||1));s.to=Math.min(MAXF,Math.max(s.from,Math.round(+s.to)||MAXF));
  s.labels=Object.keys(T.lab).includes(s.labels)?s.labels:'int';s.group=Object.keys(T.group).includes(s.group)?s.group:'set';
  s.allTones=!!s.allTones;s.bass=s.bass!==false;
  s.mode=['find','id','prog'].includes(s.mode)?s.mode:'find';s.idSel=Math.max(0,Math.round(+s.idSel)||0);
  s.idf=Array.isArray(s.idf)&&s.idf.length===6?s.idf.map(x=>Number.isInteger(x)&&x>=0&&x<=MAXF?x:-1):DEF.idf.slice();
  s.pText=typeof s.pText==='string'?s.pText.slice(0,800):DEF.pText;s.pType=VTYPES.includes(s.pType)||s.pType==='fav'?s.pType:DEF.pType;   /* 'fav' = alleen favorieten (★) */
  s.pMode=['smooth','pos','strings','top'].includes(s.pMode)?s.pMode:'smooth';s.pPos=Math.min(12,Math.max(1,Math.round(+s.pPos)||5));
  s.pStr=typeof s.pStr==='string'&&/^(auto|[1-6]{2,6})$/.test(s.pStr)?s.pStr:'auto';s.pMel=typeof s.pMel==='string'?s.pMel.slice(0,300):'';
  s.pTempo=Math.min(260,Math.max(40,Math.round(+s.pTempo)||120));s.pLoop=s.pLoop!==false;
  const lk=s.pLock&&typeof s.pLock==='object'&&!Array.isArray(s.pLock)?s.pLock:{};s.pLock={};
  Object.keys(lk).forEach(i=>{const x=lk[i];if(/^\d{1,2}$/.test(i)&&x&&typeof x.s==='string'&&typeof x.k==='string'){const o={s:x.s.slice(0,40),k:x.k.slice(0,40)};
    if(VTYPES.includes(x.t))o.t=x.t;if(x.h)o.h=1;s.pLock[i]=o;}});
  /* eigen voicingsoort per akkoord (volgnummer → {s: symbool, t: soort}) en wat er gebeurt bij een gekozen vorm */
  const ty=s.pTypes&&typeof s.pTypes==='object'&&!Array.isArray(s.pTypes)?s.pTypes:{};s.pTypes={};
  Object.keys(ty).forEach(i=>{const x=ty[i];if(/^\d{1,2}$/.test(i)&&x&&typeof x.s==='string'&&(VTYPES.includes(x.t)||x.t==='fav'))s.pTypes[i]={s:x.s.slice(0,40),t:x.t};});
  s.pFit=s.pFit==='keep'?'keep':'refit';
  s.pLine=['roots','r5','approach','walk','step'].includes(s.pLine)?s.pLine:DEF.pLine;
  s.pStyle=['swing','bossa','straight'].includes(s.pStyle)?s.pStyle:DEF.pStyle;s.pDrums=s.pDrums!==false;s.pBNeck=!!s.pBNeck;
  const vo=s.pVol&&typeof s.pVol==='object'&&!Array.isArray(s.pVol)?s.pVol:{};s.pVol={};
  s.dgSize=typeof s.dgSize==='number'&&isFinite(s.dgSize)?Math.min(200,Math.max(80,Math.round(s.dgSize/10)*10)):DEF.dgSize;
  Object.keys(DEF.pVol).forEach(k=>{s.pVol[k]=typeof vo[k]==='number'&&isFinite(vo[k])?Math.min(100,Math.max(0,Math.round(vo[k]))):DEF.pVol[k];});
  s.colOpen=s.colOpen!==false;s.cardDet=s.cardDet==='full'?'full':'compact';
  s.fOpen=!!s.fOpen;
  /* filters Progression; nog niet bewaard + "Same strings" met een vaste snarenset (pStr, wordt niet meer gelezen) → die set als filter */
  const own=o&&typeof o==='object'?o:{},pf=own.pgF&&typeof own.pgF==='object'&&!Array.isArray(own.pgF)?own.pgF:own.pMode==='strings'&&/^[1-6]{2,6}$/.test(own.pStr)?{str:own.pStr}:{};
  s.pgF={str:typeof pf.str==='string'&&/^(all|[1-6]{2,6})$/.test(pf.str)?pf.str:'all',inv:['0','1','2','3'].includes(pf.inv)?pf.inv:'all',top:PG_TOPS.includes(pf.top)?pf.top:'all'};
  s.favs=(Array.isArray(s.favs)?s.favs:[]).filter(f=>f&&typeof f==='object'&&Object.prototype.hasOwnProperty.call(QUAL,f.q)&&VTYPES.includes(f.t)&&typeof f.s==='string'&&/^[1-6]{2,6}$/.test(f.s)&&
    Array.isArray(f.i)&&f.i.length===f.s.length&&f.i.every(x=>Number.isInteger(x)&&x>=0&&x<12)).slice(0,300).map(f=>({q:f.q,t:f.t,s:f.s,i:f.i.slice()}));
  return s;}
let S=load();favSync();
(function(){const t=read(THEMEKEY);if(['auto','light','dark'].includes(t))S.theme=t;})();   /* thema: alleen nog bewaard (de schil is altijd daglicht), niet meer gebruikt */
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

/* kolom rechts (shared/rail.js: ROOM.column): open/dicht = S.colOpen. In alle modi alleen Settings (instellen, niet spelen):
   Progression ook band, kaartdetails, bewerken; Find voicings ook "All chord tones". De gekozen vorm (Find voicings) staat op de
   transportplank #fdTray, een vorm kiezen in Progression gaat in het venster "choose a shape". Filters staan nooit hier,
   maar in de strook "Strings & filters" onder de voicingsoort. Labels niet in What's this chord?. */
function renderCol(){const m=S.mode,pg=m==='prog';
  ['#setBand','#setDisp','#setEdit'].forEach(id=>{$(id).hidden=!pg;});$('#labRow').hidden=m==='id';$('#tonesRow').hidden=m!=='find';
  $('#pgTray').hidden=!pg;$('#fdTray').hidden=m!=='find';
  document.body.dataset.mode=m;
  seg($('#segDet'),Object.entries(T.det),S.cardDet,'det');document.body.dataset.detail=S.cardDet;}

/* oefenlogboek: tijd telt tussen twee acties (max 60 s); de akkoorden die je liet klinken komen in de lijst van die dag */
let LOG=(()=>{const l=readSafe(LOGKEY);return l&&typeof l==='object'&&!Array.isArray(l)?l:{};})(),lastAct=0,logDirty=false;
const dayKey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>{const k=dayKey(),e=LOG[k];if(!e||typeof e!=='object')LOG[k]={s:0,p:[]};if(!Array.isArray(LOG[k].p))LOG[k].p=[];return LOG[k];};
function act(){const now=Date.now();if(lastAct&&now-lastAct<=60000){const e=today();e.s=Math.round((e.s+(now-lastAct)/1000)*10)/10;logDirty=true;}lastAct=now;}
function logChord(sym){const e=today();if(!e.p.includes(sym)&&e.p.length<40){e.p.push(sym);logDirty=true;}}
function logSave(){if(!logDirty)return;logDirty=false;logMerge(LOGKEY,LOG);
  const ks=Object.keys(LOG).sort();ks.slice(0,Math.max(0,ks.length-400)).forEach(k=>delete LOG[k]);
  try{localStorage.setItem(LOGKEY,JSON.stringify(LOG));}catch(e){}homeLink();}
/* logboek ook meegeven in de Home-link (#pr=…), voor browsers die de opslag per bestand scheiden */
function homeLink(){try{const log=Object.fromEntries(Object.entries(LOG).sort().slice(-200).map(([k,v])=>[k,{s:Math.round(v.s||0),p:(v.p||[]).slice(0,8)}]));
  $('#lnkHome').href='index.html#pr='+encodeURIComponent(JSON.stringify({finder:{log}}));}catch(e){}}
setInterval(logSave,5000);
addEventListener('pagehide',logSave);

/* ═══════════ 6. AFLEIDEN (S → D) EN BEDIENING ═══════════
   D = {c (akkoord), all (alle vormen van de soort), list (na filters), groups, order (volgorde op het scherm), sel (gekozen vorm)} */
let D=null,prevSel=null;
function derive(){const c=parseChord(S.chord)||parseChord(DEF.chord),all=S.type==='fav'?favVoicings(c):voicingsOf(c,S.type);
  /* een filter dat voor dit akkoord niet bestaat, gaat terug naar "alle" */
  if(S.str!=='all'&&!all.some(v=>v.strs===S.str))S.str='all';
  if(S.low!=='all'&&!all.some(v=>v.low===S.low))S.low='all';
  if(S.top!=='all'&&!all.some(v=>v.top===S.top))S.top='all';
  const list=all.filter(v=>(S.str==='all'||v.strs===S.str)&&(S.low==='all'||v.low===S.low)&&(S.top==='all'||v.top===S.top)&&v.lo>=S.from&&v.hi<=S.to);
  D={c,all,list};D.groups=groupsOf(list);D.order=[...new Set(D.groups.flatMap(g=>g.vs))];   /* een favoriet staat ook in zijn eigen groep: één keer tellen */
  /* gekozen vorm: dezelfde frets, anders (na een ander akkoord) de vorm die het dichtst bij de vorige ligt, op dezelfde snaren */
  let sel=D.order.find(v=>v.key===S.sel)||null;
  if(!sel&&prevSel&&D.order.length)sel=D.order.reduce((b,v)=>{const k=v2=>Math.abs(v2.center-prevSel.center)+(v2.strs===prevSel.strs?0:3);return k(v)<k(b)?v:b;});
  D.sel=sel||D.order[0]||null;if(D.sel){S.sel=D.sel.key;prevSel=D.sel;}}
function update(){derive();save();renderChord();renderFilters();renderDetail();RES.paged=false;renderResults();}
/* opnieuw passend maken (ander venster, kolom open/dicht, andere diagramgrootte): de vormen in Find voicings, de kaarten in Progression */
function refit(){if(S.mode==='prog'){pgFit();return;}if(S.mode!=='find'||!D)return;RES.paged=false;renderResults();}
function setChord(c){if(!c)return;S.chord=c.ascii;$('#chordErr').textContent='';act();update();}
function pick(v,play){if(!v)return;S.sel=v.key;prevSel=v;D.sel=v;save();renderDetail();
  document.querySelectorAll('#groups .dg').forEach(b=>{const on=b.dataset.k===v.key;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
  if(play){playShape(D.c,v);logChord(D.c.sym);}}
/* ← →: door de vormen die nu te zien zijn (gekozen groepen, zonder dubbele) */
function step(d){const O=D.shown&&D.shown.length?D.shown:D.order;if(!O.length)return;const i=O.indexOf(D.sel),v=O[Math.min(O.length-1,Math.max(0,i+d))];
  if(v&&v!==D.sel){pick(v,true);const b=document.querySelector('#groups .dg[data-k="'+v.key+'"]');if(b&&b.scrollIntoView)b.scrollIntoView({block:'nearest',inline:'nearest'});}}

function bind(){
  $('#dgSize').addEventListener('input',e=>{S.dgSize=+e.target.value;save();applyDgSize();refit();});
  /* de vormen passend houden bij een andere venstergrootte of als de kolom in- of uitklapt */
  let rt=0;if(window.ResizeObserver)new ResizeObserver(()=>{clearTimeout(rt);rt=setTimeout(refit,120);}).observe($('#scroll'));
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refit);
  /* groepen kiezen: tabjes en kopjes; Shift-klik = erbij/eraf (geen tekst selecteren) */
  $('#gTabs').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(b)groupClick(b.dataset.g,e.shiftKey);});
  ['#gTabs','#groups'].forEach(id=>$(id).addEventListener('mousedown',e=>{if(e.shiftKey)e.preventDefault();}));
  /* strook "Strings & filters": de knop klapt hem in beide modi open/dicht; de Finder-filters zelf hier, die van Progression in pgBind() */
  document.querySelectorAll('[data-fs]').forEach(b=>b.addEventListener('click',()=>{S.fOpen=!S.fOpen;save();if(S.mode==='prog')pgRender();else update();}));
  $('#fsFind').addEventListener('click',e=>{const b=e.target.closest('[data-fk]');
    if(e.target.closest('[data-fclear]')){S.str=S.low=S.top='all';S.from=1;S.to=MAXF;act();update();return;}
    if(b){S[b.dataset.fk]=b.dataset.fv;act();update();}});
  $('#fsFind').addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.fr,n=+e.target.value;if(!k)return;
    if(k==='from'){S.from=n;if(S.to<n)S.to=n;}else{S.to=n;if(S.from>n)S.from=n;}update();});
  /* akkoordsoort: uitklapvenster achter de knop "Type"; sluit na een keuze, met Esc of bij een klik ernaast */
  const qp=$('#qualPop'),qb=$('#btnQual'),qShow=o=>{qp.hidden=!o;qb.setAttribute('aria-expanded',o);};
  qb.addEventListener('click',()=>qShow(qp.hidden));
  document.addEventListener('click',e=>{if(!qp.hidden&&!e.target.closest('.qpop'))qShow(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!qp.hidden){qShow(false);qb.focus();}});
  ROOM.column($('#col'),S.colOpen,o=>{S.colOpen=o;save();});
  $('#segDet').addEventListener('click',e=>{const b=e.target.closest('[data-det]');if(!b)return;S.cardDet=b.dataset.det;save();renderCol();LOOK.render();});
  /* akkoord intypen: pas na een korte pauze lezen; een onbekend akkoord laat de vorige staan */
  let tm=null;
  $('#inChord').addEventListener('input',e=>{clearTimeout(tm);const t=e.target.value;tm=setTimeout(()=>{if(!t.trim()){$('#chordErr').textContent='';return;}
    const c=parseChord(t);if(c)setChord(c);else $('#chordErr').textContent=T.badChord(t.trim());},350);});
  $('#inChord').addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(tm);const c=parseChord(e.target.value);if(c){setChord(c);e.target.value=c.sym;}else $('#chordErr').textContent=T.badChord(e.target.value.trim());}});
  $('#inChord').addEventListener('blur',e=>{if(parseChord(e.target.value)||!e.target.value.trim()){e.target.value=D.c.sym;$('#chordErr').textContent='';}});
  $('#segRoot').addEventListener('click',e=>{const b=e.target.closest('[data-root]');if(!b)return;const r=parseNote(b.dataset.root);
    let bass=D.c.bass;if(bass){const d=mod(nPc(bass)-D.c.rootPc,12);bass=nice(spellPc(mod(r.l+(mod(bass.l-D.c.root.l,7)),7),nPc(r)+d));}   /* slash-bas schuift mee */
    setChord(makeChord(r,D.c.q,bass));});
  $('#qualRows').addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(!b)return;setChord(makeChord(D.c.root,b.dataset.q,D.c.bass));qShow(false);});
  $('#segType').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(!b)return;S.type=b.dataset.type;act();update();});
  $('#segLab').addEventListener('click',e=>{const b=e.target.closest('[data-lab]');if(!b)return;S.labels=b.dataset.lab;save();renderMode();});   /* één knop in de kolom, voor Finder en Progression */
  $('#segGroup').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(!b)return;S.group=b.dataset.group;RES.gsel=new Set();update();});
  $('#tgTones').addEventListener('change',e=>{S.allTones=e.target.checked;save();renderDetail();});
  $('#tgBass').addEventListener('change',e=>{S.bass=e.target.checked;save();});
  $('#btnShowAll').addEventListener('click',()=>{S.str=S.low=S.top='all';S.from=1;S.to=MAXF;RES.gsel=new Set();update();});
  /* vorm kiezen, ster = favoriet aan/uit, kopje = groep kiezen */
  $('#groups').addEventListener('click',e=>{const f=e.target.closest('[data-fav]'),g=e.target.closest('.gh'),b=e.target.closest('.dg');
    if(f){const v=D.order.find(x=>x.key===f.dataset.fav);if(v){favToggle(D.c,v);update();}return;}
    if(g){groupClick(g.dataset.g,e.shiftKey);return;}
    if(!b)return;pick(D.order.find(v=>v.key===b.dataset.k),true);});
  $('#btnPlay').addEventListener('click',()=>{if(D.sel){playShape(D.c,D.sel);logChord(D.c.sym);}});
  $('#btnArp').addEventListener('click',()=>{if(D.sel){playShape(D.c,D.sel,true);logChord(D.c.sym);}});
  $('#dBig').addEventListener('click',()=>{if(D.sel)playShape(D.c,D.sel);});
  $('#btnPrev').addEventListener('click',()=>step(-1));$('#btnNext').addEventListener('click',()=>step(1));
  document.addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;const tag=e.target&&e.target.tagName;
    if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA'||S.mode!=='find')return;
    if(e.key==='ArrowRight'){e.preventDefault();step(1);}else if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}
    else if(e.key===' '&&tag!=='BUTTON'){e.preventDefault();if(D.sel){playShape(D.c,D.sel);logChord(D.c.sym);}}});
  addEventListener('storage',e=>{if(e.key===SHARED)applyWood();});}
