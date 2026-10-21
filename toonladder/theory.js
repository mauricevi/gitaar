'use strict';
/* ═══════════ 1. DATA ═══════════ */
const KEY='toonladderTrainer:v1';
/* Oefenlogboek per dag (voor de kalender op Home): {"2026-10-08":{s:seconden,p:[progressies]}}. Eigen opslagsleutel.
   Telt mee: de band speelt, of je deed iets in de app in de laatste 60 s terwijl het tabblad zichtbaar is. */
/* logboek veilig lezen: onleesbaar → kopie naar '.bad' (als die er nog niet is), dan leeg verder */
function logRead(k){let raw=null;try{raw=localStorage.getItem(k);}catch(e){return{};}if(raw==null)return{};
  try{const o=JSON.parse(raw);if(o&&typeof o==='object'&&!Array.isArray(o))return o;}catch(e){}
  try{if(localStorage.getItem(k+'.bad')==null)localStorage.setItem(k+'.bad',raw);}catch(e){}return{};}
/* vóór het wegschrijven de opgeslagen versie erbij (ander tabblad): per dag blijft de grootste tijd */
function logMerge(k,L){const o=logRead(k),sz=v=>v&&typeof v==='object'?+v.s||0:0;
  Object.keys(o).forEach(d=>{if(!(d in L)||sz(o[d])>sz(L[d]))L[d]=o[d];});return L;}
var SLOG=logRead('toonladderTrainer:log'),lastAct=Date.now(),logTicks=0;
const dayKey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');   /* lokale datum JJJJ-MM-DD */
['pointerdown','keydown','input','wheel'].forEach(ev=>addEventListener(ev,()=>{lastAct=Date.now();},{passive:true,capture:true}));
setInterval(()=>{const playing=typeof progPlayer!=='undefined'&&progPlayer.on;
  if(!playing&&(document.visibilityState!=='visible'||Date.now()-lastAct>60000))return;
  const e=SLOG[dayKey()]||(SLOG[dayKey()]={s:0,p:[]});e.s+=5;
  if(state&&state.view.mode==='prog'){const p=curProg();if(p&&!e.p.includes(p.name)){e.p.push(p.name);e.p=e.p.slice(-6);}}
  if(++logTicks%3===0){logMerge('toonladderTrainer:log',SLOG);const ks=Object.keys(SLOG).sort();ks.slice(0,Math.max(0,ks.length-400)).forEach(k=>delete SLOG[k]);
    try{localStorage.setItem('toonladderTrainer:log',JSON.stringify(SLOG));}catch(x){}homeSum();}},5000);
/* Voorkeurstoonladder per akkoordsoort (Instellingen → Scale per chord type): {akkoordsoort-id: toonladder-id}.
   Eigen opslagsleutel, omdat merge() alleen vaste sleutels bewaart. Leeg = de suggestie op basis van de toonsoort. */
var SPREF=(()=>{try{const o=JSON.parse(localStorage.getItem('toonladderTrainer:scalePref'));return o&&typeof o==='object'&&!Array.isArray(o)?o:{};}catch(e){return{};}})();
const MAXF=22;
const LETTERS=['C','D','E','F','G','A','B'];
const LPC=[0,2,4,5,7,9,11];
const MAJ=[0,2,4,5,7,9,11];
const INT_LBL=['1','♭2','2','♭3','3','4','♭5','5','♭6','6','♭7','7'];

/* Toonladders als formule. parent = halve tonen van de grondtoon naar de grondtoon van de "parent-majeur" (voor CAGED). */
const REGISTRY=[
 {group:'Common',items:[
  {id:'major',name:'Major',f:'1 2 3 4 5 6 7',parent:0},
  {id:'natMinor',name:'Natural minor',f:'1 2 b3 4 5 b6 b7',parent:3},
  {id:'harmMinor',name:'Harmonic minor',f:'1 2 b3 4 5 b6 7',parent:3},
  {id:'melMinor',name:'Melodic minor (ascending)',f:'1 2 b3 4 5 6 7',parent:3}]},
 {group:'Modes of major',items:[
  {id:'ionian',name:'Ionian (= major)',f:'1 2 3 4 5 6 7',parent:0},
  {id:'dorian',name:'Dorian',f:'1 2 b3 4 5 6 b7',parent:10},
  {id:'phrygian',name:'Phrygian',f:'1 b2 b3 4 5 b6 b7',parent:8},
  {id:'lydian',name:'Lydian',f:'1 2 3 #4 5 6 7',parent:7},
  {id:'mixolydian',name:'Mixolydian',f:'1 2 3 4 5 6 b7',parent:5},
  {id:'aeolian',name:'Aeolian (= natural minor)',f:'1 2 b3 4 5 b6 b7',parent:3},
  {id:'locrian',name:'Locrian',f:'1 b2 b3 4 b5 b6 b7',parent:1}]},
 {group:'Modes of melodic minor',items:[
  {id:'dorianb2',name:'Dorian ♭2',f:'1 b2 b3 4 5 6 b7'},
  {id:'lydianAug',name:'Lydian ♯5',f:'1 2 3 #4 #5 6 7'},
  {id:'lydianDom',name:'Lydian dominant',f:'1 2 3 #4 5 6 b7'},
  {id:'mixob6',name:'Mixolydian ♭6',f:'1 2 3 4 5 b6 b7'},
  {id:'locrian2',name:'Locrian ♮2',f:'1 2 b3 4 b5 b6 b7'},
  {id:'altered',name:'Altered (super Locrian)',f:'1 b2 #2 3 b5 b6 b7'}]},   /* jazzspelling: ♭9 ♯9 3 ♭5 ♭13 ♭7 */
 {group:'Modes of harmonic minor',items:[
  {id:'phrygDom',name:'Phrygian dominant',f:'1 b2 3 4 5 b6 b7'},
  {id:'ionian5',name:'Ionian ♯5',f:'1 2 3 4 #5 6 7'},
  {id:'dorian4',name:'Dorian ♯4',f:'1 2 b3 #4 5 6 b7'},
  {id:'lydian2',name:'Lydian ♯2',f:'1 #2 3 #4 5 6 7'},
  {id:'locrian6',name:'Locrian ♮6',f:'1 b2 b3 4 b5 6 b7'}]},
 {group:'Symmetric',items:[
  {id:'dimWH',name:'Diminished (whole-half)',f:'1 2 b3 4 b5 b6 6 7'},
  {id:'dimHW',name:'Diminished (half-whole)',f:'1 b2 #2 3 #4 5 6 b7'},          /* dominantspelling: ♭9 ♯9 3 ♯11 5 13 ♭7 */
  {id:'wholeTone',name:'Whole tone',f:'1 2 3 #4 #5 b7'},
  {id:'augmented',name:'Augmented (hexatonic)',f:'1 #2 3 5 #5 7'}]},
 {group:'Pentatonic and blues',items:[
  {id:'majPent',name:'Major pentatonic',f:'1 2 3 5 6',parent:0},
  {id:'minPent',name:'Minor pentatonic',f:'1 b3 4 5 b7',parent:3},
  {id:'minBlues',name:'Minor blues',f:'1 b3 4 b5 5 b7',parent:3},
  {id:'majBlues',name:'Major blues',f:'1 2 b3 3 5 6',parent:0}]},
 {group:'Arpeggio · triads',kind:'arp',items:[
  {id:'aMaj',name:'Major',sym:'',f:'1 3 5'},
  {id:'aMin',name:'Minor (m)',sym:'m',f:'1 b3 5'},
  {id:'aDim',name:'Diminished (dim)',sym:'dim',f:'1 b3 b5'},
  {id:'aAug',name:'Augmented (aug)',sym:'aug',f:'1 3 #5'},
  {id:'aSus2',name:'sus2',sym:'sus2',f:'1 2 5'},
  {id:'aSus4',name:'sus4',sym:'sus4',f:'1 4 5'}]},
 {group:'Arpeggio · 6 and add9',kind:'arp',items:[
  {id:'a6',name:'6',sym:'6',f:'1 3 5 6'},
  {id:'am6',name:'m6',sym:'m6',f:'1 b3 5 6'},
  {id:'a69',name:'6/9',sym:'6/9',f:'1 3 5 6 9'},
  {id:'am69',name:'m6/9',sym:'m6/9',f:'1 b3 5 6 9'},
  {id:'aAdd9',name:'add9',sym:'add9',f:'1 3 5 9'},
  {id:'amAdd9',name:'m(add9)',sym:'m(add9)',f:'1 b3 5 9'}]},
 {group:'Arpeggio · 7th chords',kind:'arp',items:[
  {id:'aMaj7',name:'maj7',sym:'maj7',f:'1 3 5 7'},
  {id:'aM7',name:'m7',sym:'m7',f:'1 b3 5 b7'},
  {id:'aDom7',name:'7 (dominant)',sym:'7',f:'1 3 5 b7'},
  {id:'aM7b5',name:'m7♭5 (half-diminished)',sym:'m7♭5',f:'1 b3 b5 b7'},
  {id:'aDim7',name:'dim7',sym:'dim7',f:'1 b3 b5 bb7'},
  {id:'aMMaj7',name:'m(maj7)',sym:'m(maj7)',f:'1 b3 5 7'},
  {id:'aMaj7s5',name:'maj7♯5',sym:'maj7♯5',f:'1 3 #5 7'},
  {id:'a7sus4',name:'7sus4',sym:'7sus4',f:'1 4 5 b7'}]},
 {group:'Arpeggio · 9th chords',kind:'arp',items:[
  {id:'aMaj9',name:'maj9',sym:'maj9',f:'1 3 5 7 9'},
  {id:'am9',name:'m9',sym:'m9',f:'1 b3 5 b7 9'},
  {id:'a9',name:'9',sym:'9',f:'1 3 5 b7 9'},
  {id:'amMaj9',name:'m(maj9)',sym:'m(maj9)',f:'1 b3 5 7 9'},
  {id:'am9b5',name:'m9♭5',sym:'m9♭5',f:'1 b3 b5 b7 9'},
  {id:'am7b9',name:'m7♭9',sym:'m7♭9',f:'1 b3 5 b7 b9'},
  {id:'aMaj9s5',name:'maj9♯5',sym:'maj9♯5',f:'1 3 #5 7 9'},
  {id:'a9sus4',name:'9sus4',sym:'9sus4',f:'1 4 5 b7 9'}]},
 {group:'Arpeggio · 11 and 13',kind:'arp',items:[
  {id:'aMaj7s11',name:'maj7♯11',sym:'maj7♯11',f:'1 3 5 7 #11'},
  {id:'am11',name:'m11',sym:'m11',f:'1 b3 5 b7 9 11'},
  {id:'aMaj13',name:'maj13',sym:'maj13',f:'1 3 5 7 9 13'},
  {id:'a13',name:'13',sym:'13',f:'1 3 5 b7 9 13'}]},
 {group:'Arpeggio · altered dominant',kind:'arp',items:[
  {id:'a7b5',name:'7♭5',sym:'7♭5',f:'1 3 b5 b7'},
  {id:'a7s5',name:'7♯5',sym:'7♯5',f:'1 3 #5 b7'},
  {id:'a7b9',name:'7♭9',sym:'7♭9',f:'1 3 5 b7 b9'},
  {id:'a7s9',name:'7♯9',sym:'7♯9',f:'1 3 5 b7 #9'},
  {id:'a7s11',name:'7♯11',sym:'7♯11',f:'1 3 5 b7 #11'},
  {id:'a7b9b13',name:'7♭9♭13',sym:'7♭9♭13',f:'1 3 5 b7 b9 b13'},
  {id:'a7alt',name:'7alt',sym:'7alt',f:'1 3 b5 b7 b9 #9'}]},
 {group:'Other',items:[
  {id:'doubleHarm',name:'Double harmonic (Byzantine)',f:'1 b2 3 4 5 b6 7'},
  {id:'hungMinor',name:'Hungarian minor',f:'1 2 b3 #4 5 b6 7'},
  {id:'hirajoshi',name:'Hirajoshi',f:'1 2 b3 5 b6'},
  {id:'bebopDom',name:'Bebop dominant',f:'1 2 3 4 5 6 b7 7'}]}
];
const SCALES={};
REGISTRY.forEach(g=>g.items.forEach(s=>{SCALES[s.id]=Object.assign({group:g.group,kind:g.kind||'scale',parent:null},s);}));

/* Grondtonen (id, weergave, letterindex, alteratie) */
const ROOT_LIST=[['C','C',0,0],['C#','C♯',0,1],['Db','D♭',1,-1],['D','D',1,0],['D#','D♯',1,1],['Eb','E♭',2,-1],['E','E',2,0],
 ['F','F',3,0],['F#','F♯',3,1],['Gb','G♭',4,-1],['G','G',4,0],['G#','G♯',4,1],['Ab','A♭',5,-1],['A','A',5,0],['A#','A♯',5,1],['Bb','B♭',6,-1],['B','B',6,0]];
const ROOTS={};
ROOT_LIST.forEach(([id,name,letter,acc])=>{ROOTS[id]={id,name,letter,acc,pc:mod(LPC[letter]+acc,12)};});
const PC_FLAT=['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

/* Stemmingen: open-snaartonen als absolute halve tonen (E2=40), laag → hoog */
const TUNINGS={
 std:{name:'Standard (E A D G B E)',open:[40,45,50,55,59,64],names:['E','A','D','G','B','E']},
 halfDown:{name:'Half step down (E♭ A♭ D♭ G♭ B♭ E♭)',open:[39,44,49,54,58,63],names:['E♭','A♭','D♭','G♭','B♭','E♭']},
 dropD:{name:'Drop D (D A D G B E)',open:[38,45,50,55,59,64],names:['D','A','D','G','B','E']},
 dadgad:{name:'DADGAD',open:[38,45,50,55,57,62],names:['D','A','D','G','A','D']},
 openG:{name:'Open G (D G D G B D)',open:[38,43,50,55,59,62],names:['D','G','D','G','B','D']},
 openD:{name:'Open D (D A D F♯ A D)',open:[38,45,50,54,57,62],names:['D','A','D','F♯','A','D']}
};

const DEFAULTS={
 v:1,theme:'auto',
 A:{root:'C',type:'major',formula:'',label:'note',color:'#4f8cff',cmode:'fixed',on:true},
 B:{root:'C',type:'natMinor',formula:'',label:'note',color:'#ff9f43',cmode:'fixed',on:true},
 pos:{system:'auto',ref:'A',selected:[],mf:{A:null,B:null}},
 progs:null,                                   /* null = nog nooit opgeslagen → er komt één voorbeeldprogressie */
 view:{mode:'compare',prog:null,sel:0,cmp:null,col:true,tab:'main'},      /* cmp = index van het vergeleken akkoord (Shift-klik) · col = kolom rechts open, tab = tabblad daarin (main | set) */        /* mode: compare | prog · sel = index van het gekozen akkoord */
 pv:{win:true,forms:false,fstay:true,fzoom:false,fc:5,lo:5,span:5,tones:true,scale:true,guide:true,labels:'deg',loop:true,cmpKind:'scales',
     band:{style:'swing',fscale:true,piano:true,bass:true,drums:true,count:true,intro:'count',build:true,fills:true,ending:true,swing:.67,vol:{piano:100,bass:100,drums:100}}},   /* backing track */   /* weergave in progressies */
 set:{
  colShared:'#f1ede2',colWood:'',wood:'rosewood',woodCustom:'#7a4a2a',
  palette:['#ef4444','#9b6bd1','#2fb5a8','#f2b632','#ffd23f','#6bbf59','#c46bb0','#4f8cff','#8a7cf0','#3fbf9f','#ff8a3d','#ff5fa2'],
  dotSize:12.5,fretSpacing:'real',fretNums:'marks',inlays:true,stringNames:true,boardWidth:1150,pageWidth:2600,
  outside:'hide',cmpFocus:'all',sharedStyle:'own',sharedV2:false,sharedLabel:'A',shapeB:true,
  winSpan:5,numbering:'neck',tuning:'std',customLo:5,customHi:9,tempo:110,playMode:'up',chordSize:'7',xDeg:'3',xQual:'aM7'
 }
};

/* ═══════════ 2. THEORIE ═══════════ */
function mod(n,m){return ((n%m)+m)%m;}
function clamp(v,a,b){v=+v;if(!isFinite(v))v=a;return Math.min(b,Math.max(a,v));}
function accStr(n){return n===0?'':(n>0?'♯'.repeat(n):'♭'.repeat(-n));}

/* Formule ("1 2 b3 5 6") → [{deg,acc,semis,pc}] gesorteerd op pitch class. Gooit Error bij fouten. */
function parseFormula(text){
  const toks=String(text||'').trim().split(/[\s,;]+/).filter(Boolean);
  if(toks.length<2) throw new Error(T.err.few);
  if(!toks.includes('1')) throw new Error(T.err.root);
  const out=[],seen=new Set();
  for(const t of toks){
    const m=/^([b♭]*|[#♯]*)(1[0-3]|[1-9])$/.exec(t);
    if(!m) throw new Error(T.err.bad(t));
    const acc=m[1]?(/[#♯]/.test(m[1][0])?m[1].length:-m[1].length):0;
    const deg=+m[2];
    const semis=MAJ[(deg-1)%7]+12*Math.floor((deg-1)/7)+acc;
    const pc=mod(semis,12);
    if(seen.has(pc)) throw new Error(T.err.dup(t));
    seen.add(pc);
    out.push({deg,acc,semis,pc});
  }
  out.sort((x,y)=>x.pc-y.pc);
  return out;
}
const _parsed={};
function entriesOf(def){return _parsed[def.id]||(_parsed[def.id]=parseFormula(def.f));}

/* Bouwt een toonladder. Notennaam volgt de graad (letter = grondtoonletter + graad-1), dus F majeur heeft B♭ en geen A♯. */
function buildScale(rootId,entries,meta){
  const R=ROOTS[rootId]||ROOTS.C;
  const notes=entries.map(e=>{
    const letter=(R.letter+e.deg-1)%7;
    const pc=mod(R.pc+e.semis,12);
    const acc=mod(pc-LPC[letter]+6,12)-6;
    return {pc,name:LETTERS[letter]+accStr(acc),label:accStr(e.acc)+e.deg,degNum:e.deg,semis:e.semis,iv:mod(pc-R.pc,12)};
  });
  const pcMap=new Map(); notes.forEach(n=>pcMap.set(n.pc,n));
  return {name:meta.name,sym:meta.sym,kind:meta.kind||'scale',root:R,notes,pcMap,size:notes.length,parent:meta.parent==null?null:meta.parent};
}
function heurParent(entries){return entries.some(e=>e.pc===4)?0:(entries.some(e=>e.pc===3)?3:null);}
function makeScale(st){
  if(st.type==='custom'){
    const en=parseFormula(st.formula);
    return buildScale(st.root,en,{name:T.row.custom.replace('…',''),parent:heurParent(en)});
  }
  const def=SCALES[st.type]||SCALES.major,en=entriesOf(def);
  return buildScale(st.root,en,{name:def.name,sym:def.sym,parent:def.parent==null?heurParent(en):def.parent,kind:def.kind});
}
/* Weergavenaam: "C Major" of "Cmaj7 arpeggio" */
const scaleTitle=sc=>sc.kind==='arp'?sc.root.name+(sc.sym!=null?sc.sym:'')+' '+T.row.arp:sc.root.name+' '+sc.name;
function rootIdOf(letter,acc,pc){
  const id=LETTERS[letter]+(acc>0?'#'.repeat(acc):'b'.repeat(-acc));
  return ROOTS[id]?id:PC_FLAT[mod(pc,12)];
}

/* ═══════════ 3. POSITIES ═══════════ */
/* off = eerste fret t.o.v. de grondtoon r van de parent-majeur op de lage E, len = breedte in frets. */
const CAGED_SHAPES=[{id:'E',off:-1,len:4},{id:'D',off:1,len:5},{id:'C',off:4,len:4},{id:'A',off:6,len:5},{id:'G',off:8,len:5}];
function cagedPositions(ref,TN){
  const r=mod(ref.root.pc+ref.parent-TN.open[0],12);
  const res=[];
  CAGED_SHAPES.forEach(sh=>{
    const lo0=r+sh.off,inst=[];
    for(let j=-1;j<=2;j++){
      const lo=lo0+12*j,hi=lo+sh.len-1,a=Math.max(lo,0),b=Math.min(hi,MAXF);
      if(b-a+1>=3) inst.push({lo:a,hi:b,cells:null});
    }
    if(inst.length) res.push({shape:sh.id,instances:inst,sortKey:inst[0].lo});
  });
  return res;
}
function windowPositions(ref,TN,span){
  const res=[];
  ref.notes.forEach((n,i)=>{
    const f0=mod(n.pc-TN.open[0],12),inst=[];
    [0,12].forEach(sh=>{const lo=f0+sh,hi=Math.min(lo+span-1,MAXF); if(lo<=MAXF&&hi-lo+1>=3) inst.push({lo,hi,cells:null});});
    if(inst.length) res.push({startNote:n,degIndex:i,instances:inst,sortKey:f0});
  });
  return res;
}
/* Noten per snaar: 'c' opeenvolgende toonladdernoten per snaar; de volgende snaar begint bij de eerstvolgende toonladdernoot. */
function npsPositions(ref,TN,c){
  const pcs=new Set(ref.notes.map(n=>n.pc));
  const next=p=>{for(let d=1;d<=12;d++) if(pcs.has(mod(p+d,12))) return p+d; return p+12;};
  const res=[];
  ref.notes.forEach((n,i)=>{
    const f0=mod(n.pc-TN.open[0],12);
    let p=TN.open[0]+f0; const cells=[];
    for(let s=0;s<6;s++){
      if(s>0){
        p=next(p);
        let g=0;while(p-TN.open[s]<0&&g++<24){cells.push([s-1,p-TN.open[s-1]]);p=next(p);}
      }
      for(let k=0;k<c;k++){if(k>0)p=next(p);cells.push([s,p-TN.open[s]]);}
    }
    const inst=[];
    [0,12].forEach(sh=>{
      const kept=cells.map(([s,f])=>[s,f+sh]).filter(([s,f])=>f<=MAXF);
      if(kept.length>=cells.length*0.5&&kept.some(k=>k[0]===0)){
        const fr=kept.map(k=>k[1]);
        inst.push({lo:Math.min.apply(null,fr),hi:Math.max.apply(null,fr),cells:new Set(kept.map(([s,f])=>s+':'+f)),rows:rowsOf(kept)});
      }
    });
    if(inst.length) res.push({startNote:n,degIndex:i,instances:inst,sortKey:f0});
  });
  return res;
}
function rowsOf(cells){
  const r=[null,null,null,null,null,null];
  cells.forEach(([s,f])=>{r[s]=r[s]?[Math.min(r[s][0],f),Math.max(r[s][1],f)]:[f,f];});
  return r;
}
/* Vult gaten in een positie: alle tonen tussen de laagste en hoogste noot moeten erin zitten. */
function fillGaps(inst,ref,TN){
  const cells=[];
  for(let s=0;s<6;s++)for(let f=inst.lo;f<=inst.hi;f++){
    if(!ref.pcMap.has(mod(TN.open[s]+f,12))) continue;
    if(inst.cells&&!inst.cells.has(s+':'+f)) continue;
    cells.push([s,f]);
  }
  if(!cells.length) return inst;
  const have=new Set(cells.map(([s,f])=>TN.open[s]+f));
  const lo=Math.min(...have),hi=Math.max(...have);
  let added=false;
  for(let q=lo+1;q<hi;q++){
    if(have.has(q)||!ref.pcMap.has(mod(q,12))) continue;
    let best=null;
    for(let s=0;s<6;s++){
      const f=q-TN.open[s]; if(f<0||f>MAXF) continue;
      const d=f<inst.lo?inst.lo-f:(f>inst.hi?f-inst.hi:0);
      if(!best||d<best.d) best={s,f,d};
    }
    if(best){cells.push([best.s,best.f]);have.add(q);added=true;}
  }
  if(!added) return inst;
  const fr=cells.map(c=>c[1]);
  return {lo:Math.min(inst.lo,...fr),hi:Math.max(inst.hi,...fr),cells:new Set(cells.map(([s,f])=>s+':'+f)),rows:inst.rows?rowsOf(cells):null,filled:true};
}
function availableSystems(ref,tuningId){
  const l=[],arp=ref.kind==='arp';
  if(ref.parent!=null&&tuningId==='std') l.push(['caged',T.sys.caged]);
  if(arp) l.push(['nps',T.sys.arp(ref.size)]);
  else if(ref.size===7) l.push(['nps',T.sys.nps3]);
  else if(ref.size===5||ref.size===6) l.push(['nps',T.sys.nps2(ref.size)]);
  l.push(['martino',T.sys.martino]);
  l.push(['window',T.sys.window]);
  l.push(['custom',T.sys.custom]);
  return l;
}
function defaultSystem(list,ref){
  const ids=list.map(x=>x[0]);
  if(ref.size===7&&ref.kind!=='arp'&&ids.includes('nps')) return 'nps';
  if(ids.includes('caged')) return 'caged';
  if(ids.includes('nps')&&ref.kind!=='arp') return 'nps';
  return 'window';
}
function computePositions(sys,ref,TN,S){
  if(sys==='martino')return [];                                   /* Martino-vormen: per A en B apart, zie derive() */
  let raw;
  if(sys==='caged') raw=cagedPositions(ref,TN);
  else if(sys==='nps') raw=npsPositions(ref,TN,ref.size===7&&ref.kind!=='arp'?3:2);
  else if(sys==='window') raw=windowPositions(ref,TN,+S.winSpan||5);
  else{
    let lo=clamp(S.customLo,0,MAXF),hi=clamp(S.customHi,0,MAXF); if(hi<lo){const t=lo;lo=hi;hi=t;}
    return [{n:1,label:T.pos.range(lo,hi),sub:lo+'–'+hi,title:T.pos.custom,instances:[{lo,hi,cells:null}]}];
  }
  raw.forEach(p=>{p.instances=p.instances.map(g=>fillGaps(g,ref,TN));});
  const byNeck=sys==='caged'||S.numbering==='neck';
  raw.sort((a,b)=>byNeck?a.sortKey-b.sortKey:a.degIndex-b.degIndex);
  raw.forEach((p,i)=>{
    p.n=byNeck?i+1:p.degIndex+1;
    const f=p.instances[0], rng=f.lo+'–'+f.hi;
    if(sys==='caged'){p.label=T.pos.caged(p.n,p.shape);p.sub=p.shape+' · '+rng;}
    else{p.label=T.pos.from(p.n,p.startNote.name);p.sub=T.pos.fr(rng);}
    p.title=T.pos.title(p.label,p.instances.map(x=>x.lo+'–'+x.hi).join(T.pos.and));
  });
  return raw;
}
