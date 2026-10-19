'use strict';
/* ═══════════ 4. STATE + OPSLAG ═══════════ */
let state;
function clone(o){return JSON.parse(JSON.stringify(o));}
function merge(t,o){
  for(const k in o){
    if(!(k in t)) continue;
    const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
    if(isObj(t[k])){ if(isObj(o[k])) merge(t[k],o[k]); }
    else t[k]=o[k];
  }
}
const isHex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
const oneOf=(v,list,def)=>list.includes(v)?v:def;
function sanitize(s){
  ['A','B'].forEach(k=>{
    const d=DEFAULTS[k],x=s[k];
    if(!ROOTS[x.root]) x.root='C';
    if(x.type!=='custom'&&!SCALES[x.type]) x.type=d.type;
    if(typeof x.formula!=='string') x.formula='';
    x.label=oneOf(x.label,['note','deg','none'],'note');
    x.cmode=oneOf(x.cmode,['fixed','degree'],'fixed');
    if(!isHex(x.color)) x.color=d.color;
    x.on=x.on!==false&&x.on!=='false';
  });
  s.theme=oneOf(s.theme,['auto','light','dark'],'auto');
  const S=s.set,DS=DEFAULTS.set;
  /* eenmalig (deze versie): gedeelde noten weer in de gedeelde kleur; daarna blijft je eigen keuze gewoon bewaard */
  if(!S.sharedV2){S.sharedStyle='own';S.sharedV2=true;}
  SETTINGS.forEach(g=>g.items.forEach(it=>{
    const v=S[it.key],def=DS[it.key];
    if(it.type==='select') S[it.key]=it.options.some(o=>String(o[0])===String(v))?v:def;
    else if(it.type==='range') S[it.key]=(typeof v==='number'||(typeof v==='string'&&v!==''))&&isFinite(+v)?clamp(v,it.min,it.max):def;
    else if(it.type==='check') S[it.key]=typeof v==='boolean'?v:def;
    else if(it.type==='color') S[it.key]=isHex(v)?v:def;
    else if(it.type==='palette') S[it.key]=Array.isArray(v)&&v.length===12&&v.every(isHex)?v:def.slice();
  }));
  S.outside=oneOf(S.outside,['hide','faint'],DS.outside);
  S.chordSize=oneOf(String(S.chordSize),['3','7','9'],DS.chordSize);
  S.xDeg=/^(\d|1[01])$/.test(String(S.xDeg))?String(S.xDeg):DS.xDeg;
  S.xQual=ARPS.some(a=>a.id===S.xQual)?S.xQual:DS.xQual;
  S.customLo=clamp(S.customLo,0,MAXF);S.customHi=clamp(S.customHi,0,MAXF);
  if(isHex(S.colWood)){S.wood='custom';S.woodCustom=S.colWood;}   /* migratie: oude eigen houtkleur wordt "Custom" */
  S.colWood='';
  S.wood=oneOf(S.wood,Object.keys(WOODS).concat('custom'),DS.wood);
  if(!isHex(S.woodCustom)) S.woodCustom=DS.woodCustom;
  if(!Array.isArray(s.pos.selected)) s.pos.selected=[];
  s.pos.selected=s.pos.selected.filter(i=>Number.isInteger(i)&&i>=0);
  s.pos.ref=oneOf(s.pos.ref,['A','B'],'A');
  if(typeof s.pos.system!=='string') s.pos.system='auto';
  const mf=s.pos.mf&&typeof s.pos.mf==='object'?s.pos.mf:{},okF=x=>x&&[1,2,3,4,5].includes(x.f)&&Number.isFinite(+x.mid)?{f:x.f,mid:+x.mid}:null;
  s.pos.mf={A:okF(mf.A),B:okF(mf.B)};
  sanitizeProgs(s);
  return s;
}
function load(){
  const s=clone(DEFAULTS);
  let raw=null;
  try{raw=localStorage.getItem(KEY); if(raw) merge(s,JSON.parse(raw));}
  catch(e){try{if(raw)localStorage.setItem(KEY+'.bad',raw);}catch(x){}}   /* onleesbaar: kopie bewaren vóórdat save() hem overschrijft */
  return sanitize(s);
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}homeSum();}
/* Samenvatting voor Home (huidige progressie + venster), los bewaard én meegegeven in de Home-link (#pr=…) */
function homeSum(){try{const p=state.progs&&(state.progs.find(x=>x.id===state.view.prog)||state.progs[0]);if(!p)return;
  const lo=state.pv.win===false?3:state.pv.lo,sum={p:{id:p.id,name:p.name},chords:p.sections.flatMap(x=>x.chords).map(c=>({sym:c.sym,root:c.root,type:c.type,bars:c.bars})),lo,hi:lo+state.pv.span-1};
  sum.log=Object.fromEntries(Object.entries(SLOG||{}).sort().slice(-200));
  localStorage.setItem('practiceRoom.scaleSum',JSON.stringify(sum));
  const a=document.getElementById('lnkHome');if(a)a.href=T.links.home+'#pr='+encodeURIComponent(JSON.stringify({scale:sum}));}catch(e){}}

/* ── Houtsoort: alleen nog voor de opslag (wood/woodCustom blijven bewaard); in de schil is de hals altijd palissander/kaartstijl
   en wordt 'practiceRoom.board' niet meer gelezen of geschreven. ── */
const WOODS={rosewood:['#3e2518','#24150d'],ebony:['#25201d','#131110'],pauferro:['#6e432a','#4b2c1a'],maple:['#ecd6aa','#d6b47c']};
/* hals licht of donker: volgt de kaartstijl uit menu S (paper/staff = licht), niet meer de houtsoort */
const woodLight=()=>/^(paper|staff)$/.test(document.body.dataset.card||'');

/* ═══════════ 5. DERIVE: state → D ═══════════ */
let D=null;
const lastOk={A:null,B:null};
function derive(){
  if(state.view.mode==='prog'&&curProg()){deriveProg();return;}
  const errs={A:'',B:''};
  const sc={};
  ['A','B'].forEach(k=>{
    if(k==='B'&&!state.B.on){sc.B=null;return;}
    try{sc[k]=makeScale(state[k]);lastOk[k]=sc[k];}
    catch(e){errs[k]=e.message;sc[k]=lastOk[k]||buildScale(state[k].root,entriesOf(SCALES.major),{name:SCALES.major.name,parent:0});}
  });
  const TN=TUNINGS[state.set.tuning]||TUNINGS.std;
  const showA=state.A.on!==false,showB=!!sc.B;
  const refKey=((state.pos.ref==='B'||!showA)&&sc.B)?'B':'A';
  const ref=sc[refKey];
  const sysList=availableSystems(ref,state.set.tuning);
  let sys=state.pos.system;
  if(sys==='auto'||!sysList.some(x=>x[0]===sys)) sys=defaultSystem(sysList,ref);
  const positions=computePositions(sys,ref,TN,state.set);
  let sel=state.pos.selected.filter(i=>Number.isInteger(i)&&i>=0&&i<positions.length);
  if(sys==='custom') sel=[0];
  D={A:sc.A,B:sc.B,showA,showB,cmp:showA&&showB,tuning:TN,refKey,ref,sysList,sys,positions,sel,errs,stats:{AB:0,A:0,B:0}};
  /* Martino-vormen in Compare A/B: A en B krijgen elk hun eigen mineurvormen (via de mineurconversie van de toonladder);
     je kiest per kant een vorm op de vormenkaart, ze worden over elkaar gelegd. Geen keuze = die kant over de hele hals. */
  if(sys==='martino'){const mf=state.pos.mf;D.fmRows=[];D.shapeRings=[];
    ['A','B'].forEach(k=>{if(!sc[k]||(k==='A'&&!showA))return;const pc=mRootPcScale(sc[k]),P=formPlaces(pc,TN),pin=mf[k];
      let cur=null;if(pin){const l=P.filter(p=>p.f===pin.f);if(l.length)cur=l.reduce((a,b)=>Math.abs(b.mid-pin.mid)<Math.abs(a.mid-pin.mid)?b:a);}
      D.fmRows.push({key:k,name:mNameScale(sc[k]),sub:scaleTitle(sc[k]),pc,cur});
      if(cur){D.positions.push({n:cur.f,label:'',sub:'',instances:[{lo:cur.lo,hi:cur.hi,cells:null,rows:cur.rows,key:k}]});D.sel.push(D.positions.length-1);D.shapeRings.push(...cur.shape);}});}
}
/* mineurconversie voor een toonladder: grote terts + kleine septiem → vanaf 5; grote terts → vanaf 6;
   kleine terts + ♭5 zonder reine kwint → vanaf ♭3; anders mineur vanaf de grondtoon */
function mRuleScale(sc){const iv=new Set(sc.notes.map(n=>n.iv));
  if(iv.has(4))return iv.has(10)?7:9;if(iv.has(3))return iv.has(6)&&!iv.has(7)?3:0;return 0;}
const mRootPcScale=sc=>mod(sc.root.pc+mRuleScale(sc),12);
const mNameScale=sc=>{const pc=mRootPcScale(sc),n=sc.pcMap.get(pc);return(n?n.name:ROOTS[PC_FLAT[pc]].name)+'m';};
