'use strict';
/* ═══════════ 8. PROGRESSIES ═══════════
   Een progressie = {id, name, tempo, sections:[{chords:[{sym, root, type, bars, bass, scale}]}]}.
   type = arpeggio-id uit REGISTRY (het akkoord), scale = toonladder-id die je over dat akkoord speelt (grondtoon = grondtoon akkoord).
   Op het bord: B = akkoordtonen, A = toonladder; de positie (fretvenster) blijft staan als je van akkoord wisselt.
   Invoer: tekst als "Dm7b5 G7b9 Cm7(2) | Ebm7 Ab7 Dbmaj7" → parseText(); '|' begint een nieuwe sectie, (2) = twee maten. */
const PT=T.prog,TS=T.sheet;
const CT='#ff9f0a',ST='#efe8da';                       /* kleur akkoordtoon / toonladdertoon */
const BARS=[0.5,1,2,3,4];
const SYMID={};ARPS.forEach(a=>{SYMID[a.sym.replace(/[()]/g,'')]=a.id;});
const symOfId=id=>symOf(arpItem(id));
const newId=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const secLabel=i=>String.fromCharCode(65+i%26)+(i>=26?Math.floor(i/26):'');
/* akkoordfamilie, voor toonsoort, trap en suggesties */
function famOf(id){const s=symOfId(id);
  if(/^m[79]♭5/.test(s))return 'hd';
  if(/^dim/.test(s))return 'dim';
  if(/^m\(maj/.test(s))return 'mM';
  if(/^m(?!aj)/.test(s))return 'min';
  if(/^aug|^maj[79]♯5/.test(s))return 'aug';
  if(/sus/.test(s))return /^[79]/.test(s)?'dom':'sus';
  if(s===''||/^maj|^6|^add9/.test(s))return 'maj';
  return 'dom';}
/* akkoordsymbool achter de grondtoon → vaste schrijfwijze (Δ7, -7, ø, °7, alt, b9 … worden herkend) */
function normQ(q){
  q=q.replace(/\s+/g,'').replace(/[()]/g,'').replace(/b/g,'♭').replace(/#/g,'♯');
  q=q.replace(/^(min|mi|-)/,'m');
  q=q.replace(/^(Maj|MAJ|maj|Ma(?!dd)|ma(?!dd)|M(?!add)|Δ|△)/,'maj');   /* niet de "ma" van madd9 (Cm(add9)) */
  q=q.replace(/^m(M|Maj|maj|Δ|△)/,'mmaj');
  q=q.replace(/^(ø|Ø)7?/,'m7♭5');
  q=q.replace(/^(°|o)7/,'dim7').replace(/^(°|o)$/,'dim');
  q=q.replace(/^(\+|aug)7/,'7♯5').replace(/^7\+$/,'7♯5');
  if(q==='+')q='aug';
  q=q.replace(/-(?=\d)/g,'♭').replace(/\+(?=\d)/g,'♯');
  if(q==='maj')q='';
  if(q==='alt')q='7alt';
  if(q==='69')q='6/9';if(q==='m69')q='m6/9';
  if(q==='sus')q='sus4';if(q==='7sus')q='7sus4';if(q==='9sus')q='9sus4';
  if(q==='maj♯11')q='maj7♯11';
  return q;}
function parseBars(x){if(x==='½'||x==='1/2'||x==='.5'||x==='0.5')return .5;const n=+x;return BARS.includes(n)?n:Math.min(4,Math.max(1,Math.round(n)||1));}
const barsTxt=b=>b===1?'':'('+(b===.5?'½':b)+')';
function parseChord(tok){
  let t=String(tok).trim(),bars=1;const raw=t;
  const bm=/(?:\((½|1\/2|0?\.5|\d)\)|[:*](½|1\/2|0?\.5|\d))$/.exec(t);
  if(bm){bars=parseBars(bm[1]||bm[2]);t=t.slice(0,bm.index);}
  let bass='';const sl=/\/([A-G])([#♯b♭]?)$/.exec(t);
  if(sl){bass=sl[1]+(/[#♯]/.test(sl[2])?'♯':sl[2]?'♭':'');t=t.slice(0,sl.index);}
  const m=/^([A-G])([#♯b♭]?)(.*)$/.exec(t);
  if(!m)return{bad:raw};
  const li=LETTERS.indexOf(m[1]),acc=m[2]?(/[#♯]/.test(m[2])?1:-1):0,pc=mod(LPC[li]+acc,12),root=rootIdOf(li,acc,pc);
  const id=SYMID[normQ(m[3])];
  if(!id)return{bad:raw};
  return{root,type:id,bars,bass,sym:ROOTS[root].name+symOfId(id)+(bass?'/'+bass:'')};}
/* voorstel bij een tikfout, bijv. "Ddmaj7" → "D♭maj7" */
function suggestFix(raw){
  const t=String(raw).trim(),tries=[],m=/^([A-G])([a-g])(.*)$/.exec(t);
  if(m)tries.push(m[1]+'b'+m[3],m[1]+'#'+m[3],m[1]+m[3]);
  if(/^[a-g]/.test(t))tries.push(t[0].toUpperCase()+t.slice(1));
  for(const x of tries){const c=parseChord(x);if(!c.bad)return c.sym+barsTxt(c.bars);}
  return null;}
function parseText(text){
  return String(text||'').split('|').map(x=>x.trim()).filter(Boolean)
    .map(sec=>sec.split(/\s+/).filter(Boolean).map(tok=>{const c=parseChord(tok);return c.bad?{bad:tok,fix:suggestFix(tok)}:c;}));}
const progToText=p=>p.sections.map(sec=>sec.chords.map(c=>c.sym+barsTxt(c.bars)).join(' ')).join(' | ');
/* toonsoort per sectie: probeer alle majeur- en mineurtoonsoorten, kies de beste diatonische pasvorm */
const KMAJ=['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'],KMIN=['C','C♯','D','E♭','E','F','F♯','G','G♯','A','B♭','B'];
/* pasvorm per trap: diatonisch = 3; I7/IV7 (blues) = 2; secundaire dominanten = 1.5 */
const FIT={maj:{0:{maj:3,dom:2},2:{min:3,dom:1.5},4:{min:3,dom:1.5},5:{maj:3,dom:2,min:1},7:{dom:3,sus:3},9:{min:3,dom:1.5},11:{hd:3,dim:3,dom:1.5}},
           min:{0:{min:3,mM:3},2:{hd:3,dim:3},3:{maj:3,aug:3},5:{min:3,dom:1},7:{dom:3},8:{maj:3},10:{dom:3,maj:2},11:{dim:2}}};
function keyScore(chs,k,md){
  let sc=md==='min'?-.25:0;const pc=c=>ROOTS[c.root].pc,ton=c=>mod(pc(c)-k,12)===0&&FIT[md][0][famOf(c.type)]!=null;
  chs.forEach((c,i)=>{const fit=FIT[md][mod(pc(c)-k,12)],f=famOf(c.type);sc+=fit?(fit[f]!=null?fit[f]:.5):-1;
    const nx=chs[i+1];   /* V → I: alleen als het doel geen dominant is */
    if(nx&&f==='dom'&&famOf(nx.type)!=='dom'&&mod(pc(nx)-pc(c),12)===5&&mod(pc(nx)-k,12)===0)sc+=2;});
  if(ton(chs[chs.length-1]))sc+=2.5;if(ton(chs[0]))sc+=3;   /* begin en eind op de tonica wegen zwaar */
  return sc;}
function detectKey(chs){
  if(!chs||!chs.length)return null;let best=null;
  for(let k=0;k<12;k++)for(const md of ['maj','min']){const sc=keyScore(chs,k,md);if(!best||sc>best.sc)best={k,md,sc};}
  return best;}
/* toonsoort per sectie: de toonsoort van het hele stuk, tenzij de sectie duidelijk ergens anders staat (bijv. een ii–V–I naar D♭) */
function sectionKeys(secs){
  const g=detectKey(secs.flatMap(x=>x));
  return secs.map(ch=>{if(!ch.length)return null;const b=detectKey(ch);if(!g)return b;
    return keyScore(ch,b.k,b.md)-keyScore(ch,g.k,g.md)>=5?b:g;});}
const keyName=k=>k?PT.key((k.md==='maj'?KMAJ:KMIN)[k.k],k.md):'';
const NUMS=['I','♭II','II','♭III','III','IV','♯IV','V','♭VI','VI','♭VII','VII'];
function romanOf(c,k){if(!k)return'';
  const iv=mod(ROOTS[c.root].pc-k.k,12),f=famOf(c.type),n=k.md==='min'&&iv===6?'♭V':NUMS[iv];
  return (['min','hd','dim','mM'].includes(f)?n.replace(/[IV]+/,x=>x.toLowerCase()):n)+romanSuffix(symOfId(c.type));}
/* toonladdersuggesties per akkoord, rekening houdend met de functie in de toonsoort; de eerste is de standaard */
function suggestScales(c,k){
  const s=symOfId(c.type),f=famOf(c.type),iv=k?mod(ROOTS[c.root].pc-k.k,12):-1,maj=!!k&&k.md==='maj',min=!!k&&k.md==='min';let l;
  if(f==='hd')l=['locrian2','locrian'];
  else if(f==='dim')l=['dimWH'];
  else if(f==='mM')l=['melMinor','harmMinor'];
  else if(f==='aug')l=/^maj/.test(s)?['lydianAug']:['wholeTone','lydianAug'];
  else if(f==='sus')l=['mixolydian','ionian'];
  else if(f==='maj')l=s==='maj7♯11'||(maj&&iv===5)||(min&&iv===8)?['lydian','ionian']:['ionian','lydian'];
  else if(f==='min'){
    if(s==='m7♭9')l=['phrygian','dorianb2'];
    else if(/^m6/.test(s))l=['melMinor','dorian'];
    else if(maj&&iv===9)l=['aeolian','dorian','phrygian'];
    else if(maj&&iv===4)l=['phrygian','aeolian','dorian'];
    else if(min&&iv===0)l=['dorian','aeolian','melMinor'];
    else l=['dorian','aeolian','phrygian'];
  }else{
    if(/sus/.test(s))l=['mixolydian','dorian'];
    else if(s==='7♯11')l=['lydianDom','mixolydian'];
    else if(s==='7alt'||s==='7♯9')l=['altered','dimHW'];
    else if(s==='7♯5'||s==='7♭5')l=['wholeTone','altered'];
    else if(/♭9/.test(s))l=['phrygDom','dimHW','altered'];
    else if(min&&iv===7)l=['phrygDom','altered','dimHW'];
    else if(maj&&(iv===0||iv===5))l=['mixolydian','bebopDom','lydianDom'];     /* I7, IV7 (blues) */
    else if(maj&&(iv===4||iv===9||iv===11))l=['phrygDom','mixolydian','altered'];   /* V7 van een mineurakkoord */
    else if(maj&&iv===2)l=['mixolydian','lydianDom'];                             /* V7 van V */
    else if(maj&&iv===7)l=['mixolydian','bebopDom','lydianDom'];
    else l=['lydianDom','mixolydian','bebopDom'];
  }
  const pf=SPREF[c.type];if(pf&&SCALES[pf]&&SCALES[pf].kind!=='arp')l=[pf,...l.filter(x=>x!==pf)];   /* jouw voorkeur gaat voor */
  return l.filter(id=>SCALES[id]);}
function makeSections(parsed,old){
  const oks=parsed.map(sec=>sec.filter(c=>!c.bad)),keys=sectionKeys(oks);
  return parsed.map((sec,si)=>{const ok=oks[si],k=keys[si];
    return{chords:ok.map((c,ci)=>{const prev=old&&old.sections[si]&&old.sections[si].chords[ci];
      const keep=prev&&prev.root===c.root&&prev.type===c.type;
      return{sym:c.sym,root:c.root,type:c.type,bars:c.bars,bass:c.bass||'',scale:keep?prev.scale:(suggestScales(c,k)[0]||'ionian'),soff:keep?prev.soff||0:0,fsel:keep?prev.fsel||null:null,moff:keep&&Number.isInteger(prev.moff)?prev.moff:null};})};});}
function sanitizeProgs(s){
  if(s.progs===null)s.progs=[{id:newId(),name:T.seed.name,tempo:100,sections:makeSections(parseText(T.seed.chords))}];
  if(!Array.isArray(s.progs))s.progs=[];
  s.progs=s.progs.filter(p=>p&&typeof p==='object').map(p=>({
    id:typeof p.id==='string'&&p.id?p.id:newId(),
    name:typeof p.name==='string'&&p.name.trim()?p.name.slice(0,80):PT.untitled,
    tempo:clamp(p.tempo||100,40,240),
    loopR:Array.isArray(p.loopR)&&p.loopR.length===2&&p.loopR.every(x=>Number.isInteger(x)&&x>=0)?[Math.min(...p.loopR),Math.max(...p.loopR)]:null,trans:Number.isInteger(p.trans)?mod(p.trans+5,12)-5:0,
    sections:(Array.isArray(p.sections)&&p.sections.length?p.sections:[{chords:[]}]).map(sec=>({chords:(sec&&Array.isArray(sec.chords)?sec.chords:[])
      .filter(c=>c&&ROOTS[c.root]&&ARPS.some(a=>a.id===c.type))
      .map(c=>({sym:typeof c.sym==='string'&&c.sym?c.sym:ROOTS[c.root].name+symOfId(c.type),root:c.root,type:c.type,
        bars:BARS.includes(+c.bars)?+c.bars:1,bass:typeof c.bass==='string'?c.bass:'',
        scale:SCALES[c.scale]&&SCALES[c.scale].kind!=='arp'?c.scale:'ionian',soff:Number.isInteger(c.soff)?mod(c.soff,12):0,
        fsel:[1,2,3,4,5].includes(c.fsel)?c.fsel:null,moff:Number.isInteger(c.moff)?mod(c.moff,12):null}))}))}));
  const v=s.view;v.mode=oneOf(v.mode,['compare','prog'],'compare');
  if(!s.progs.some(p=>p.id===v.prog))v.prog=s.progs[0]?s.progs[0].id:null;
  if(v.mode==='prog'&&!v.prog)v.mode='compare';
  v.sel=Math.max(0,parseInt(v.sel,10)||0);v.cmp=null;
  v.col=v.col!==false;v.tab=oneOf(v.tab,['main','set'],'main');
  const pv=s.pv,DP=DEFAULTS.pv;
  ['win','forms','fstay','fzoom','tones','scale','guide','loop'].forEach(k=>{if(typeof pv[k]!=='boolean')pv[k]=DP[k];});
  pv.fc=Number.isFinite(+pv.fc)?Math.min(MAXF,Math.max(0,+pv.fc)):5;
  pv.labels=oneOf(pv.labels,['deg','sdeg','mdeg','note'],'deg');pv.cmpKind=oneOf(pv.cmpKind,['scales','tones','mixed'],'scales');
  const bd=pv.band&&typeof pv.band==='object'?pv.band:{};const vl=bd.vol&&typeof bd.vol==='object'?bd.vol:{};
  pv.band={style:oneOf(bd.style,['swing','bossa','ballad'],'swing'),fscale:bd.fscale!==false,piano:bd.piano!==false,bass:bd.bass!==false,drums:bd.drums!==false,count:bd.count!==false,
    intro:oneOf(bd.intro,['count','bars','none'],bd.count===false?'none':'count'),build:bd.build!==false,fills:bd.fills!==false,ending:bd.ending!==false,
    swing:[.5,.6,.67,.72].includes(+bd.swing)?+bd.swing:.67,vol:Object.fromEntries(['piano','bass','drums'].map(k=>[k,Number.isFinite(+vl[k])?Math.min(150,Math.max(0,+vl[k])):100]))};pv.span=oneOf(+pv.span,[4,5,6],5);pv.lo=clamp(pv.lo,0,MAXF-pv.span+1)|0;}
const shortName=id=>SCALES[id].name.replace(/ \((?!half-whole|whole-half)[^)]*\)$/,'');   /* "Diminished (half-whole)" houdt zijn toevoeging */
const curProg=()=>state.progs.find(p=>p.id===state.view.prog)||null;
const flat=p=>p.sections.flatMap((sec,si)=>sec.chords.map((c,ci)=>({si,ci,c})));
/* ── transponeren: alle akkoorden n halve tonen omhoog/omlaag; de spelling (♯/♭) volgt de nieuwe toonsoort per sectie.
   Toonladders per akkoord blijven gewoon staan (ze zijn relatief aan de grondtoon). p.trans onthoudt hoever je van het origineel zit. */
function spellPc(pc,sharp){const nat=ROOT_LIST.find(r=>r[3]===0&&ROOTS[r[0]].pc===pc);if(nat)return nat[0];
  const r=ROOT_LIST.find(r=>r[3]===(sharp?1:-1)&&ROOTS[r[0]].pc===pc);return r?r[0]:PC_FLAT[pc];}
function transposeProg(p,n){
  const keys=sectionKeys(p.sections.map(x=>x.chords));
  p.sections.forEach((sec,si)=>{const k=keys[si],tk=k?mod(k.k+n,12):0,
      sharp=!!k&&(k.md==='maj'?[7,2,9,4,11,6]:[4,11,6,1,8]).includes(tk);      /* G D A E B F♯ majeur, E B F♯ C♯ G♯ mineur: kruizen */
    sec.chords.forEach(c=>{c.root=spellPc(mod(ROOTS[c.root].pc+n,12),sharp);
      if(c.bass){const m=/^([A-G])([♯♭]?)$/.exec(c.bass);
        if(m)c.bass=ROOTS[spellPc(mod(LPC[LETTERS.indexOf(m[1])]+(m[2]==='♯'?1:m[2]==='♭'?-1:0)+n,12),sharp)].name;}
      c.sym=ROOTS[c.root].name+symOfId(c.type)+(c.bass?'/'+c.bass:'');});});
  p.trans=mod((p.trans||0)+n+5,12)-5;}                                          /* −5 … +6 */
const flatIndex=(p,si,ci)=>p.sections.slice(0,si).reduce((a,x)=>a+x.chords.length,0)+ci;
const chordScale=c=>buildScale(c.root,entriesOf(SCALES[c.type]),{name:SCALES[c.type].name,sym:symOfId(c.type),kind:'arp',parent:null});
/* ── toonladder vanaf een andere grondtoon ──
   c.soff = afstand in halve tonen van de akkoordgrondtoon tot de grondtoon van de toonladder (0 = zelfde grondtoon).
   Voorbeeld: Dm7♭5 met soff 3 en Melodic minor = F melodisch mineur (dezelfde noten als D Locrian ♮2).
   Omdat het een afstand is, blijft het kloppen bij transponeren en bij het wijzigen van de grondtoon. */
const hasB5=c=>{const iv=chordScale(c).notes.map(n=>n.iv);return iv.includes(6)&&!iv.includes(7);};
const offName=(c,o)=>['1','♭2','2','♭3','3','4',hasB5(c)?'♭5':'♯4','5','♭6','6','♭7','7'][mod(o,12)];
function sRootId(c,o){o=mod(o||0,12);if(!o)return c.root;                         /* spelling via de lettertrap: D + ♭3 = F, niet E♯ */
  const R=ROOTS[c.root],step=[0,1,1,2,2,3,hasB5(c)?4:3,4,5,5,6,6][o],li=(R.letter+step)%7,pc=mod(R.pc+o,12);
  return rootIdOf(li,mod(pc-LPC[li]+6,12)-6,pc);}
const scaleOfC=(c,o=c.soff,id=c.scale)=>buildScale(sRootId(c,o),entriesOf(SCALES[id]),{name:SCALES[id].name,parent:null});
const scaleName=c=>(c.soff?ROOTS[sRootId(c,c.soff)].name+' ':'')+shortName(c.scale);
const PCSET=new Map();
function pcsOf(pc,id){const k=pc+'|'+id;if(!PCSET.has(k))PCSET.set(k,buildScale(PC_FLAT[pc],entriesOf(SCALES[id]),{name:''}).notes.map(n=>n.pc).sort((a,b)=>a-b).join(','));return PCSET.get(k);}
/* voorkeursvolgorde voor toonladders vanaf een andere grondtoon */
const FROM_PREF=['melMinor','dorian','aeolian','ionian','lydian','mixolydian','harmMinor','lydianDom','phrygian','altered','harmMajor','majPent','minPent','dimHW','dimWH','wholeTone','locrian','blues','majBlues'];
/* suggesties: toonladders op die grondtoon die alle akkoordtonen bevatten (alleen een reine kwint mag ontbreken), op voorkeur */
function sugFrom(c,k,o){if(!mod(o,12))return suggestScales(c,k);
  const ct=chordScale(c).notes,g=[...guideOf(c).keys()],sp=mod(ROOTS[c.root].pc+o,12);
  return FROM_PREF.filter(id=>SCALES[id]).map((id,i)=>{const set=pcsOf(sp,id).split(',').map(Number);
      return{id,i,ok:g.every(pc=>set.includes(pc))&&ct.every(x=>x.iv===7||set.includes(x.pc))};})
    .filter(x=>x.ok).slice(0,4).map(x=>x.id);}
/* dezelfde noten, anders bekeken: andere grondtoon + toonladder met precies dezelfde tonen (bijv. D Locrian ♮2 = F Melodic minor) */
const PARENTS=['ionian','melMinor','harmMinor','harmMajor','majPent','minPent','dimHW','wholeTone'];
function sameNotes(c){if(!SCALES[c.scale])return[];
  const rp=ROOTS[c.root].pc,me=pcsOf(mod(rp+(c.soff||0),12),c.scale),out=[];
  for(let o=0;o<12;o++){const ids=o===0?REGISTRY.filter(g=>!g.kind).flatMap(g=>g.items.map(x=>x.id)):PARENTS;
    ids.forEach(id=>{if(SCALES[id]&&!(o===mod(c.soff||0,12)&&id===c.scale)&&pcsOf(mod(rp+o,12),id)===me&&!out.some(x=>x.o===o))out.push({o,id});});}
  return out.sort((a,b)=>(a.o===0?-1:0)-(b.o===0?-1:0)||PARENTS.indexOf(a.id)-PARENTS.indexOf(b.id)).slice(0,3);}
/* ── Pat Martino: de 5 mineurvormen ("Linear Expressions: Forms"), vastgelegd in G mineur, standaardstemming ──
   rows  = per snaar (laag E → hoog e) het fretvak van de vorm; binnen dat vak tonen we de noten van jouw toonladder,
           dus bij natuurlijk mineur precies de PDF, bij Dorisch schuift alleen E♭ → E mee.
   shape = de m7-greep van de vorm (de rode stippen in de PDF).
   Correcties t.o.v. de diagrammen, volgens de tabs: vorm 3 hoge e = fret 8–10, vorm 5 hoge e = 13–17, vorm 2 lage E vanaf fret 5. */
const MARTINO={root:7,std:[40,45,50,55,59,64],forms:[
  {rows:[[3,6],[3,6],[3,5],[2,5],[3,6],[3,6]],shape:[[0,3],[2,3],[3,3],[4,3]]},          /* Gm7         */
  {rows:[[5,8],[5,8],[5,8],[5,8],[6,8],[5,8]],shape:[[0,6],[2,5],[3,7],[4,6]]},          /* B♭6         */
  {rows:[[8,11],[8,10],[7,10],[7,10],[8,11],[8,10]],shape:[[0,10],[2,8],[3,10],[4,8]]},  /* Gm7/D       */
  {rows:[[10,13],[10,13],[10,13],[10,12],[10,13],[10,13]],shape:[[0,13],[2,12],[3,12],[4,11]]}, /* Gm7/F */
  {rows:[[13,15],[12,15],[12,15],[12,15],[13,16],[13,17]],shape:[[0,15],[2,15],[3,15],[4,15]]}]};  /* Gm7 */
/* mineurconversie (Martino): m7 → zelf, 7 → mineur vanaf de 5, m7♭5 → vanaf ♭3, maj7 → vanaf 6 (Cmaj7 = Am).
   c.moff = eigen keuze per akkoord (afstand in halve tonen), anders deze regel. */
const mRule=c=>{const f=famOf(c.type);return f==='dom'||f==='sus'?7:f==='hd'?3:f==='maj'||f==='aug'?9:0;};
const mOff=c=>Number.isInteger(c.moff)?c.moff:mRule(c);
const mName=c=>ROOTS[sRootId(c,mOff(c))].name+'m';
/* alle plaatsingen van de 5 vormen voor een mineurgrondtoon, die op de hals passen (0–22), in de huidige stemming */
function formPlaces(pc,TN){const out=[],k=mod(pc-MARTINO.root,12),d=s=>MARTINO.std[s]-TN.open[s];
  MARTINO.forms.forEach((F,i)=>[k-12,k,k+12].forEach(o=>{
    const rows=F.rows.map(([a,b],s)=>[a+o+d(s),b+o+d(s)]),lo=Math.min(...rows.map(r=>r[0])),hi=Math.max(...rows.map(r=>r[1]));
    if(lo<0||hi>MAXF)return;
    out.push({f:i+1,o,rows,lo,hi,mid:(lo+hi)/2,shape:F.shape.map(([st,fr])=>[st,fr+o+d(st)])});}));
  return out.sort((a,b)=>a.lo-b.lo||a.f-b.f);}
/* welke vorm tonen: "Stay in position" = de vorm die het dichtst bij je plek (pv.fc) ligt; anders je gekozen vorm per akkoord.
   pin = vaste keuze voor akkoord B in een Shift-vergelijking */
let fpinB=null;
function formFor(c,TN,pin){const P=formPlaces(ROOTS[sRootId(c,mOff(c))].pc,TN);if(!P.length)return null;
  const near=(l,m)=>l.reduce((a,b)=>Math.abs(b.mid-m)<Math.abs(a.mid-m)?b:a),fc=state.pv.fc,of=f=>P.filter(p=>p.f===f);
  if(pin&&of(pin.f).length)return near(of(pin.f),pin.mid);
  if(state.pv.fstay)return near(P,fc);
  return near(of(c.fsel||1).length?of(c.fsel||1):P,fc);}
/* terts en septiem van een akkoord (voor de "guide tones" van het volgende akkoord) */
function guideOf(c){const sc=chordScale(c),ivs=sc.notes.map(n=>n.iv);
  const third=[4,3].find(x=>ivs.includes(x))??[5,2].find(x=>ivs.includes(x)),sev=[10,11,9].find(x=>ivs.includes(x))??7;
  const m=new Map();[third,sev].forEach(x=>{if(x==null)return;const n=sc.notes.find(y=>y.iv===x);if(n)m.set(n.pc,n.name);});return m;}
function deriveProg(){
  const p=curProg(),list=flat(p),pv=state.pv,TN=TUNINGS[state.set.tuning]||TUNINGS.std;
  const keys=sectionKeys(p.sections.map(sec=>sec.chords));
  const idx=list.length?Math.min(state.view.sel,list.length-1):0;state.view.sel=idx;
  const it=list[idx],ch=it?it.c:null;
  const Bf=ch?chordScale(ch):null,Af=ch?scaleOfC(ch):null;
  const hi=Math.min(MAXF,pv.lo+pv.span-1);
  const nx=list.length>1?list[(idx+1)%list.length].c:null;
  D={prog:true,p,list,idx,ch,keys,key:it?keys[it.si]:null,A:pv.scale?Af:null,B:pv.tones?Bf:null,Afull:Af,Bfull:Bf,
     showA:pv.scale,showB:pv.tones,cmp:false,tuning:TN,refKey:'A',ref:Af,sysList:[],sys:'custom',
     positions:pv.win?[{n:'',label:'',sub:'',instances:[{lo:pv.lo,hi,cells:null}]}]:[],sel:pv.win?[0]:[],
     errs:{A:'',B:''},stats:{AB:0,A:0,B:0},guide:pv.guide&&nx?guideOf(nx):null,bands:[]};
  /* Shift-vergelijking: A = gekozen akkoord, B = vergeleken akkoord; tonen volgens pv.cmpKind, kleuren zoals Compare A / B */
  const ci=state.view.cmp;
  if(ci!=null&&list[ci]&&ci!==idx){
    const c2=list[ci].c,kind=pv.cmpKind,scaleOf=c=>scaleOfC(c);
    Object.assign(D,{pcmp:true,cmpIdx:ci,ch2:c2,key2:keys[list[ci].si],A:kind==='tones'?Bf:Af,B:kind==='scales'?scaleOf(c2):chordScale(c2),
      showA:true,showB:true,cmp:true,guide:null,lab:pv.labels});
  }else state.view.cmp=null;
  /* Martino-vormen: de gekozen vorm (en bij Shift-vergelijking die van akkoord B) als positie met een vak per snaar */
  D.fA=D.fB=D.fshape=D.fmRows=D.shapeRings=null;
  if(pv.forms&&ch){const inst=(F,key)=>({lo:F.lo,hi:F.hi,cells:null,rows:F.rows,key}),fa=formFor(ch,TN);
    if(fa){D.fA=fa;D.sys='forms';D.positions=[{n:fa.f,label:'',sub:'',instances:[inst(fa,D.pcmp?'A':null)]}];D.sel=[0];
      D.fshape=new Set(fa.shape.map(([a,b])=>a+':'+b));
      D.fmRows=[{key:'A',name:mName(ch),sub:PT.formsOver(ch.sym),pc:ROOTS[sRootId(ch,mOff(ch))].pc,cur:fa}];
      if(D.pcmp){const fb=formFor(D.ch2,TN,fpinB&&fpinB.i===ci?fpinB:null);D.shapeRings=fa.shape.slice();
        if(fb){D.fB=fb;D.positions.push({n:fb.f,label:'',sub:'',instances:[inst(fb,'B')]});D.sel=[0,1];D.shapeRings.push(...fb.shape);
          D.fmRows.push({key:'B',name:mName(D.ch2),sub:PT.formsOver(D.ch2.sym),pc:ROOTS[sRootId(D.ch2,mOff(D.ch2))].pc,cur:fb});}}}}}
/* noten op het bord in een progressie: akkoordtonen oranje, toonladdertonen licht, buiten de toonladder = vierkantje */
const SHAPE_C='#e5484d';
const MDEG=['1','♭2','2','♭3','3','4','♭5','5','♭6','6','♭7','7'];               /* graden vanaf de mineurgrondtoon */                                          /* rood, zoals de greep in de PDF */
function progDots(TN,r,cxF,cyS,regs){
  if(!D.ch)return'';
  const A=D.A,B=D.B,cr=ROOTS[D.ch.root].pc,civ=new Set(D.Bfull.notes.map(n=>n.iv)),S=state.set,pv=state.pv;
  const tl=iv=>({0:'1',1:'♭9',2:'9',3:civ.has(4)?'♯9':'♭3',4:'3',5:'11',6:civ.has(7)?'♯11':'♭5',7:'5',8:civ.has(4)&&!civ.has(7)&&!civ.has(6)?'♯5':'♭13',9:civ.has(10)||civ.has(11)?'13':'6',10:'♭7',11:'7'})[iv];
  const ringC=woodLight()?'#1c1c1e':'#ffffff',back=[],front=[],gd=[];
  for(let s=0;s<6;s++)for(let f=0;f<=MAXF;f++){
    const pc=mod(TN.open[s]+f,12),inS=A&&A.pcMap.get(pc),inC=B&&B.pcMap.get(pc),cx=cxF(f),cy=cyS(s);
    const visible=!regs||regs.some(z=>z.rows?(!!z.rows[s]&&f>=z.rows[s][0]&&f<=z.rows[s][1]):(f>=z.lo&&f<=z.hi)),g=D.guide&&D.guide.has(pc)&&visible;
    const shp=!!D.fshape&&D.fshape.has(s+':'+f);                    /* noot van de m7-greep van de Martino-vorm */
    if(!inS&&!inC){
      if(shp)gd.push('<circle class="shp" cx="'+cx+'" cy="'+cy+'" r="'+(r*.75)+'"/>');
      if(g)gd.push('<g class="n" data-pc="'+pc+'"><title>'+esc(PT.legGuide+': '+D.guide.get(pc))+'</title><circle class="gd" cx="'+cx+'" cy="'+cy+'" r="'+(r*.9)+'"/><text class="gdt" x="'+cx+'" y="'+cy+'" dy=".35em" text-anchor="middle" font-size="'+fsz(D.guide.get(pc),r*.9)+'">'+esc(D.guide.get(pc))+'</text></g>');
      continue;}
    if(!visible&&S.outside!=='faint'&&!(D.fA&&!pv.fzoom))continue;    /* vormen over de hele hals: rest vaag tonen */
    const iv=mod(pc-cr,12),deg=inC?inC.label:tl(iv),
      lab=pv.labels==='deg'?deg:pv.labels==='sdeg'?(inS?inS.label:deg):pv.labels==='mdeg'?(D.fA?MDEG[mod(iv-mOff(D.ch),12)]:deg):(inS?inS.name:inC.name);
    const fill=inC?CT:ST,sq=!!inC&&!inS&&!!A,title=PT.dot(6-s,TN.names[s],f,(inS||inC).name+' ('+deg+')');
    if(!visible){back.push(dotG({cx,cy,r:r*.5,fill,tc:'#1c1c1e',l1:'',title,pc,cls:'faint',sq}));continue;}
    const rg=[];if(inC&&iv===0)rg.push(ringC);if(shp)rg.push(SHAPE_C);
    front.push(dotG({cx,cy,r:inC?r:r*.9,fill,tc:'#1c1c1e',l1:lab,title,pc,cls:'',sq,ring:rg.length?rg:null}));
    if(g)gd.push('<circle class="gd" cx="'+cx+'" cy="'+cy+'" r="'+(r+6.5)+'"/>');
  }
  return back.join('')+front.join('')+gd.join('');}

/* ── weergave van de progressie ── */
let editing=false,bandOpen=false,headHtml='';
/* Band-menu: stijl, swinggevoel, start (aftellen/intro), arrangement (opbouw, fills, slot), per instrument aan/uit + volume */
function bandPop(){const b=state.pv.band,I=PT.bandItems;
  const seg=(act,list,cur)=>'<span class="seg">'+list.map(([v,l])=>'<button type="button" data-a="'+act+'" data-v="'+v+'" aria-pressed="'+(String(cur)===String(v))+'">'+esc(l)+'</button>').join('')+'</span>';
  const sw=(k,l)=>'<label class="tg"><input type="checkbox" role="switch" data-band="'+k+'" aria-label="'+esc(l)+'"'+(b[k]?' checked':'')+'><i></i></label>';
  return '<div class="bpop" role="group" aria-label="'+esc(PT.band)+'">'
    +'<div class="lrow st"><span>'+esc(I.style)+'</span>'+seg('style',[['swing',I.swing],['bossa',I.bossa],['ballad',I.ballad]],b.style)+'</div>'
    +(b.style==='swing'?'<div class="lrow st"><span>'+esc(I.feel)+'</span>'+seg('swing',[[.5,I.straight],[.6,I.light],[.67,I.medium],[.72,I.heavy]],b.swing)+'</div>':'')
    +'<div class="lrow st"><span>'+esc(I.start)+'</span>'+seg('intro',[['count',I.countIn],['bars',I.intro],['none',I.none]],b.intro)+'</div>'
    +'<div class="bsub">'+esc(I.arrange)+'</div>'
    +[['build',I.build,I.buildSub],['fills',I.fills,I.fillsSub],['ending',I.ending,I.endingSub]].map(([k,l,sub])=>'<div class="lrow"><span>'+esc(l)+'<small class="sub">'+esc(sub)+'</small></span>'+sw(k,l)+'</div>').join('')
    +'<div class="bsub">'+esc(I.volume)+'</div>'
    +[['piano',I.piano],['bass',I.bass],['drums',I.drums]].map(([k,l])=>'<div class="lrow ins"><span>'+esc(l)+'</span><input type="range" min="0" max="150" step="5" data-vol="'+k+'" aria-label="'+esc(l)+' volume">'+sw(k,l)+'</div>').join('')
    +'<div class="lrow"><span>'+esc(I.fscale)+'<small class="sub">'+esc(I.fscaleSub)+'</small></span>'+sw('fscale',I.fscale)+'</div></div>';}
const fmtBars=b=>b%1?(Math.floor(b)||'')+'½':String(b);
function modeUI(pm){
  $('#rows').hidden=pm;$('#progCard').hidden=!pm;
  $('#posBar').hidden=pm;$('#posChips').hidden=pm;$('#hintCmp').hidden=pm;$('#pvBar').hidden=!pm;
  $('#progBar').hidden=!pm;$('#cmpBar').hidden=pm;document.body.dataset.mode=pm?'prog':'compare';}
function renderSide(){
  $('#navCmp').setAttribute('aria-pressed',!D.prog);
  $('#progBtns').innerHTML=state.progs.map(p=>{const on=!!(D.prog&&D.p.id===p.id),n=flat(p).length;
    return '<button type="button" data-prog="'+esc(p.id)+'" aria-pressed="'+on+'" title="'+esc(p.name+' · '+PT.meta(n,fmtBars(flat(p).reduce((a,x)=>a+x.c.bars,0)),''))+'">'+esc(p.name)+'</button>';}).join('');}
function renderHead(){
  const pb=$('#progBar');
  if(!D.prog){pb.innerHTML='';headHtml='';$('#hBoard').textContent=T.ui.fretboard;renderCmpTray();return;}
  const p=D.p,bars=D.list.reduce((a,x)=>a+x.c.bars,0),keys=[...new Set(D.keys.filter(Boolean).map(keyName))].join(' · ');
  $('#hSub').textContent=p.name+' · '+PT.meta(D.list.length,fmtBars(bars),keys);
  const h='<button type="button" class="play" data-a="play">'+(progPlayer.loading?esc(PT.loading):progPlayer.on?'■ '+esc(PT.stop):'▶ '+esc(PT.play))+'</button>'
    +'<span class="beats" id="beats" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'
    +'<span class="bandw"><button type="button" class="act" data-a="band" aria-expanded="'+bandOpen+'">'+esc(PT.band)+' ▾</button>'+(bandOpen?bandPop():'')+'</span>'
    +'<button type="button" class="act" data-a="loop" aria-pressed="'+state.pv.loop+'">↻ '+esc(PT.loop)+'</button>'
    +'<label class="tempo" title="Drag up or down, or click to type"><input type="number" id="pTempo" min="40" max="240" value="'+p.tempo+'" aria-label="Tempo" data-drag> BPM</label>'
    +'<span class="tempo trn" role="group" aria-label="'+esc(PT.trans)+'"><button type="button" data-a="tr" data-v="-1" title="'+esc(PT.transDown)+'" aria-label="'+esc(PT.transDown)+'">−</button><span>'+esc(PT.trans)
      +(p.trans?' <b>'+(p.trans>0?'+':'−')+Math.abs(p.trans)+'</b>':'')+'</span><button type="button" data-a="tr" data-v="1" title="'+esc(PT.transUp)+'" aria-label="'+esc(PT.transUp)+'">+</button></span>'
    +'<button type="button" class="act" data-a="edit" aria-pressed="'+editing+'">'+esc(editing?PT.done:PT.edit)+'</button>';
  if(h!==headHtml){pb.innerHTML=h;headHtml=h;
    pb.querySelectorAll('[data-vol]').forEach(r=>{r.value=state.pv.band.vol[r.dataset.vol];});
    if(progPlayer.on&&progPlayer.vb>=0)showBeat(progPlayer.vb,progPlayer.vci);}
  if(D.pcmp){const k=state.pv.cmpKind,sc=c=>(c.soff?'':ROOTS[c.root].name+' ')+scaleName(c);
    $('#hBoard').innerHTML='<span style="color:'+state.A.color+'">A</span> '+esc(k==='tones'?D.ch.sym:sc(D.ch))+' <span class="cap">'+PT.cmp.arrow+'</span> <span style="color:'+state.B.color+'">B</span> '+esc(k==='scales'?sc(D.ch2):D.ch2.sym);return;}
  $('#hBoard').innerHTML=D.ch?esc(D.ch.sym)+' <span class="cap">'+esc(PT.over)+'</span> '+esc((D.ch.soff?'':ROOTS[D.ch.root].name+' ')+scaleName(D.ch))
    +(D.fA?' <span class="cap">· '+esc(PT.formHead(mName(D.ch),D.fA.f))+'</span>':''):esc(PT.boardEmpty);}
let delArmed=null;
function renderProgCard(){
  const p=D.p,eb=$('#editBar');let h='';
  eb.hidden=!editing;
  if(editing)eb.innerHTML='<input type="text" id="pName" value="'+esc(p.name)+'" aria-label="'+esc(PT.name)+'" autocomplete="off">'
    +'<button type="button" class="act" data-a="asText">'+esc(PT.asText)+'</button><button type="button" class="act" data-a="dup">'+esc(PT.dup)+'</button>'
    +'<button type="button" class="act danger" data-a="delProg">'+esc(delArmed?PT.delSure:PT.delProg)+'</button>';
  p.sections.forEach((sec,si)=>{const k=D.keys[si];
    h+='<div class="psec" data-s="'+si+'"><div class="psl"><b>'+secLabel(si)+'</b><small>'+esc(keyName(k))+'</small>'
      +(editing&&!sec.chords.length&&p.sections.length>1?'<button type="button" class="mini" data-a="remSec" data-s="'+si+'" aria-label="'+esc(PT.remSec)+'">✕</button>':'')+'</div><div class="ptiles" data-s="'+si+'">';
    sec.chords.forEach((c,ci)=>{const fi=flatIndex(p,si,ci),on=fi===D.idx;
      const isB=D.pcmp&&fi===D.cmpIdx,bdg=D.pcmp&&on?'<i class="bdg" style="background:'+state.A.color+';--bc:'+textOn(state.A.color)+'">A</i>':isB?'<i class="bdg" style="background:'+state.B.color+';--bc:'+textOn(state.B.color)+'">B</i>':'';
      h+='<div class="tw'+(progPlayer.on&&on&&progPlayer.dur?' playing':'')+(isB?' cmpB':'')+'" data-i="'+fi+'"'+(editing?' draggable="true"':'')+' style="flex:'+c.bars+' 1 '+(c.bars*118)+'px;--cB:'+state.B.color+(progPlayer.on&&on?';--dur:'+progPlayer.dur.toFixed(2)+'s':'')+'">'
        +'<button type="button" class="tile" data-a="sel" data-i="'+fi+'" aria-current="'+on+'"'+(isB?' aria-description="B"':'')+'>'+bdg+'<span class="rn">'+esc(romanOf(c,k))+'</span><b>'+esc(c.sym)+'</b><span class="sc">'+esc(scaleName(c))+'</span><span class="br">'+esc(PT.bars(c.bars))+'</span></button>'
        +(editing?'<button type="button" class="del" data-a="del" data-i="'+fi+'" aria-label="'+esc(PT.removeChord(c.sym))+'">✕</button>':'')+'</div>';});
    if(editing)h+='<input class="addc" data-s="'+si+'" placeholder="'+esc(PT.addChord)+'" aria-label="'+esc(PT.addChordLabel(secLabel(si)))+'" autocomplete="off" spellcheck="false">';
    h+='</div></div>';});
  if(editing)h+='<button type="button" class="act" data-a="addSec" style="margin-top:8px">'+esc(PT.addSec)+'</button>';
  if(!D.list.length&&!editing)h+='<p class="cap">'+esc(PT.empty)+'</p>';
  $('#secs').innerHTML=h;
  renderLoopBar();}
/* ── vormenkaart: de 5 Martino-vormen van het akkoord als blokjes over de hele hals; klik = die vorm op het bord.
   Bij een Shift-vergelijking een tweede rij voor akkoord B, zodat je ziet welke vorm waar over welke valt. ── */
function renderFormMap(){
  const box=$('#formMap'),rows=D.fmRows||[];box.hidden=!rows.length;if(!rows.length){box.innerHTML='';return;}
  const pct=f=>(f/(MAXF+1)*100).toFixed(2)+'%',multi=rows.length>1||!D.prog;
  let h='<div class="fhd"><span>'+esc(PT.fmTitle)+'</span>'+(!D.prog?'<span class="cap">'+esc(PT.fmHint)+'</span>':'')
    +'<button type="button" class="info" data-a="minfo" aria-label="'+esc(PT.mi.btn)+'" title="'+esc(PT.mi.btn)+'">i</button></div>';
  rows.forEach(r=>{const P=formPlaces(r.pc,D.tuning),lanes=[],cur=r.cur;
    P.forEach(p=>{let l=lanes.findIndex(e=>e<p.lo);if(l<0){l=lanes.length;lanes.push(-1);}lanes[l]=p.hi;p.lane=l;});   /* overlappende vormen onder elkaar */
    const col=multi?state[r.key].color:'var(--ac)',tc=multi?textOn(state[r.key].color):'#fff';
    h+='<div class="frow" style="--fc:'+col+';--fcT:'+tc+'"><span class="fl">'+(multi?'<i>'+r.key+'</i>':'')+'<b>'+esc(r.name)+'</b><small>'+esc(r.sub)+'</small></span>'
      +'<div class="ftrack" style="height:'+(lanes.length*24)+'px">'
      +P.map(p=>'<button type="button" class="fb'+(cur&&p.f===cur.f&&p.o===cur.o?' on':'')+'" data-a="fpick" data-row="'+r.key+'" data-f="'+p.f+'" data-mid="'+p.mid+'" style="left:'+pct(p.lo)+';width:'+pct(p.hi-p.lo+1)+';top:'+(p.lane*24)+'px" title="'+esc(PT.formT(p.f,p.lo,p.hi))+'">'+p.f+'</button>').join('')
      +'</div></div>';});
  h+='<div class="frow ruler"><span class="fl"></span><div class="ftrack">'+[0,3,5,7,9,12,15,17,19,21].map(n=>'<span style="left:'+pct(n+.5)+'">'+n+'</span>').join('')+'</div></div>';
  box.innerHTML=h;}
/* ── maatbalk: sleep over de maten om een stuk te herhalen (zoals de cycle-balk in Logic) ── */
function renderLoopBar(){
  const box=$('#loopR'),p=D.p;if(editing||!D.list.length){box.hidden=true;return;}box.hidden=false;
  const G=geom(p),R=loopRange(p,G),a=R?R[0]/4:-1,b=R?Math.ceil(R[1]/4)-1:-1,L=G.L;
  let cells='';
  for(let i=0;i<G.bars;i++){const ch=L.filter((x,j)=>G.starts[j]>=i*4&&G.starts[j]<i*4+4).map(x=>x.c.sym);
    cells+='<span class="lc'+(i>=a&&i<=b?' in':'')+(i===a?' a':'')+(i===b?' b':'')+'" data-bar="'+i+'"><small>'+(i+1)+'</small><b>'+esc(ch.length?ch.join(' '):'%')+'</b></span>';}
  box.innerHTML='<div class="lhd"><span>↻ '+esc(PT.loopBars)+'</span>'+(R?'<b>'+esc(PT.barsRange(a+1,b+1))+'</b><button type="button" class="mini" data-a="loopClear" aria-label="'+esc(PT.loopClear)+'">✕</button>':'<span class="cap">'+esc(PT.loopHint)+'</span>')+'</div>'
    +'<div class="lcells" role="group" aria-label="'+esc(PT.loopBars)+'">'+cells+'</div>';
  const lo=R?R[0]:-1,hi=R?R[1]:-1;
  document.querySelectorAll('#secs .tw').forEach(el=>{const j=+el.dataset.i,s0=G.starts[j],e0=s0+nBeats(L[j].c);el.classList.toggle('out',!!R&&(e0<=lo||s0>=hi));});}
function setLoop(a,b){const p=curProg();if(!p)return;
  p.loopR=a==null?null:[Math.min(a,b),Math.max(a,b)];
  if(progPlayer.on){const R=loopRange(p);if(R&&(progPlayer.pos<R[0]||progPlayer.pos>=R[1]))progPlayer.seek=R[0];}   /* buiten het nieuwe stuk → meteen erheen */
  update();}
function bindLoopBar(){
  const box=$('#loopR');let drag=null;
  const cellAt=e=>{const el=document.elementFromPoint(e.clientX,e.clientY);const c=el&&el.closest('#loopR .lc');return c?+c.dataset.bar:null;};
  const paint=()=>{const a=Math.min(drag.a,drag.b),b=Math.max(drag.a,drag.b);
    box.querySelectorAll('.lc').forEach(e=>{const i=+e.dataset.bar;e.classList.toggle('in',i>=a&&i<=b);e.classList.toggle('a',i===a);e.classList.toggle('b',i===b);});};
  box.addEventListener('mousedown',e=>{const i=cellAt(e);if(i==null||e.button!==0)return;e.preventDefault();drag={a:i,b:i,moved:false};paint();});
  document.addEventListener('mousemove',e=>{if(!drag)return;const i=cellAt(e);if(i!=null&&i!==drag.b){drag.b=i;drag.moved=true;paint();}});
  document.addEventListener('mouseup',()=>{if(!drag)return;const d=drag;drag=null;const p=curProg(),r=p&&p.loopR;
    if(!d.moved&&r&&d.a>=r[0]&&d.a<=r[1])setLoop(null);     /* klik binnen het gekozen stuk = loop weghalen */
    else setLoop(d.a,d.b);});
  box.addEventListener('click',e=>{if(e.target.closest('[data-a="loopClear"]'))setLoop(null);});}
/* noten die gedeeld zijn, alleen in A of B, en halve-toonverschuivingen (zelfde logica als de vergelijkingskaart) */
function cmpInfo(A,B){const both=[],oa=[],ob=[];
  for(let pc=0;pc<12;pc++){const a=A.pcMap.get(pc),b=B.pcMap.get(pc);if(a&&b)both.push(a);else if(a)oa.push(a);else if(b)ob.push(b);}
  const used=new Set(),sh=[];
  oa.forEach(a=>{let best=null;ob.forEach(b=>{if(used.has(b.pc))return;const d=mod(b.pc-a.pc+6,12)-6;if(Math.abs(d)===1&&!best)best={b,d};});
    if(best){used.add(best.b.pc);sh.push(a.name+' → '+best.b.name+' '+(best.d>0?'+1':'−1'));}});
  return{both,oa,ob,sh};}
function scaleSelect(id,c,k){const sug=suggestScales(c,k);
  return '<select class="sc" id="'+id+'" aria-label="'+esc(id==='sA'?PT.cmp.scaleOf('A'):PT.cmp.scaleOf('B'))+'">'
    +'<optgroup label="'+esc(PT.suggested)+'">'+sug.map(x=>'<option value="'+x+'"'+(x===c.scale?' selected':'')+'>'+esc(SCALES[x].name)+'</option>').join('')+'</optgroup>'
    +REGISTRY.filter(g=>!g.kind).map(g=>'<optgroup label="'+esc(g.group)+'">'+g.items.filter(x=>!sug.includes(x.id)).map(x=>'<option value="'+x.id+'"'+(x.id===c.scale?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'</optgroup>').join('')+'</select>';}
function renderInspCmp(){
  const box=$('#insp'),C=PT.cmp,pv=state.pv,k=pv.cmpKind,S=state.set,info=cmpInfo(D.A,D.B);
  const sw=x=>'<i class="sw2" style="background:'+state[x].color+';color:'+textOn(state[x].color)+'">'+x+'</i>';
  const seg=(a,cur,opts)=>'<span class="seg">'+opts.map(([v,l])=>'<button type="button" data-a="'+a+'" data-v="'+v+'" aria-pressed="'+(cur===v)+'">'+esc(l)+'</button>').join('')+'</span>';
  const tg=(attr,on,label)=>'<label class="lrow"><span>'+esc(label)+'</span><span class="tg"><input type="checkbox" role="switch" '+attr+(on?' checked':'')+'><i></i></span></label>';
  let h='<div><div class="grpt">'+esc(C.title)+'</div><section class="card list">'
   +'<div class="lrow"><span class="nm">'+sw('A')+'<b>'+esc(D.ch.sym)+'</b></span>'+(k!=='tones'?scaleSelect('sA',D.ch,D.key):'')+'</div>'
   +'<div class="lrow"><span class="nm">'+sw('B')+'<b>'+esc(D.ch2.sym)+'</b></span>'+(k==='scales'?scaleSelect('sB',D.ch2,D.key2):'')+'</div>'
   +'<div class="lrow st"><span>'+esc(C.kind)+'</span>'+seg('cmpKind',k,[['scales',C.scales],['tones',C.tones],['mixed',C.mixed]])+'<span class="cap">'+esc(C.kindHelp[k])+'</span></div>'
   +'<div class="lrow" style="justify-content:flex-start;gap:8px"><button type="button" class="act" data-a="cmpSwap" title="'+esc(C.swap)+'">⇄ '+esc(C.swapShort)+'</button><button type="button" class="act" data-a="cmpStop">'+esc(C.stop)+'</button></div>'
   +'</section></div>';
  h+='<div><div class="grpt">'+esc(C.diff)+'</div><section class="card list"><div class="dchips">'
   +'<span style="background:'+S.colShared+';color:'+textOn(S.colShared)+'">'+esc(C.common(info.both.length))+'</span>'
   +'<span style="background:'+state.A.color+';color:'+textOn(state.A.color)+'">'+esc(C.onlyA(info.oa.length))+'</span>'
   +'<span style="background:'+state.B.color+';color:'+textOn(state.B.color)+'">'+esc(C.onlyB(info.ob.length))+'</span></div>'
   +'<div class="lrow" style="flex-wrap:wrap;justify-content:flex-start;gap:6px;padding:8px 0">'+(info.sh.length?info.sh.map(x=>'<span class="tag plain">'+esc(x)+'</span>').join(''):'<span class="cap">'+esc(C.none)+'</span>')+'</div></section></div>';
  h+='<div><div class="grpt">'+esc(C.colours)+'</div><section class="card list">'
   +'<div class="lrow"><label for="cA">'+esc(C.colA)+'</label><input type="color" id="cA" value="'+state.A.color+'"></div>'
   +'<div class="lrow"><label for="cB">'+esc(C.colB)+'</label><input type="color" id="cB" value="'+state.B.color+'"></div>'
   +'<div class="lrow"><label for="cS">'+esc(C.colS)+'</label><input type="color" id="cS" value="'+S.colShared+'"></div>'
   +tg('data-cm="A"',state.A.cmode==='degree',C.perA)+tg('data-cm="B"',state.B.cmode==='degree',C.perB)
   +'<div class="lrow st"><span>'+esc(C.shared)+'</span>'+seg('shStyle',S.sharedStyle,[['own',C.own],['split',C.split]])+'</div>'
   +tg('data-sq="1"',S.shapeB,C.square)
   +'<div class="lrow st"><span>'+esc(C.focus)+'</span>'+seg('focus',S.cmpFocus,[['all',C.all],['diff',C.diffs],['same',C.same]])+'</div>'
   +'<div class="lrow st"><span>'+esc(C.sharedText)+'</span>'+seg('shLab',S.sharedLabel,[['A','A'],['B','B'],['both',C.both]])+'</div>'
   +'</section><p class="cap" style="margin:6px 14px 0">'+esc(C.note)+'</p></div>';
  h+='<div><div class="grpt">'+esc(PT.show)+'</div><section class="card list"><div class="lrow"><span>'+esc(PT.labels)+'</span>'+seg('lab',pv.labels,[['deg',PT.deg],['note',PT.notes]])+'</div></section></div>';
  box.innerHTML=h;}
function posGroup(){const pv=state.pv,c=D.ch;let lo='';for(let f=0;f<=MAXF-pv.span+1;f++)lo+='<option value="'+f+'"'+(f===pv.lo?' selected':'')+'>'+f+'</option>';
  const b=(v,l,on)=>'<button type="button" data-a="win" data-v="'+v+'" aria-pressed="'+on+'">'+esc(l)+'</button>';
  let h='<div><div class="grpt">'+esc(PT.position)+'</div><section class="card list"><div class="lrow"><span class="seg">'+b(0,PT.whole,!pv.win&&!pv.forms)+b(1,PT.window,pv.win&&!pv.forms)+b(2,PT.forms,!!pv.forms)+'</span></div>';
  if(pv.forms&&c){const auto=mRule(c),nm=o=>ROOTS[sRootId(c,o)].name+'m';
    h+='<div class="lrow"><label for="iMoff">'+esc(PT.mFrom)+'</label><select id="iMoff"><option value=""'+(Number.isInteger(c.moff)?'':' selected')+'>'+esc(PT.mAuto(nm(auto),offName(c,auto)))+'</option>'
      +[...Array(12).keys()].map(o=>'<option value="'+o+'"'+(c.moff===o?' selected':'')+'>'+esc(nm(o)+' ('+offName(c,o)+')')+'</option>').join('')+'</select></div>'
      +'<label class="lrow"><span>'+esc(PT.fzoom)+'</span><span class="tg"><input type="checkbox" role="switch" data-pv="fzoom"'+(pv.fzoom?' checked':'')+'><i></i></span></label>'
      +'<label class="lrow"><span>'+esc(PT.stay)+'</span><span class="tg"><input type="checkbox" role="switch" data-pv="fstay"'+(pv.fstay?' checked':'')+'><i></i></span></label>'
      +'</section><p class="cap" style="margin:6px 14px 0">'+esc(pv.fstay?PT.formsCapStay:PT.formsCap)+'</p></div>';return h;}
  h+=(pv.win?'<div class="lrow"><label for="iLo">'+esc(PT.fromFret)+'</label><select id="iLo">'+lo+'</select></div><div class="lrow"><label for="iSpan">'+esc(PT.width)+'</label><select id="iSpan">'+[4,5,6].map(n=>'<option value="'+n+'"'+(n===pv.span?' selected':'')+'>'+esc(PT.frets(n))+'</option>').join('')+'</select></div>':'')
   +'</section><p class="cap" style="margin:6px 14px 0">'+esc(PT.stays)+'</p></div>';
  return h;}
/* positie in een progressie (hele hals · venster · Martino-vormen): als balk boven het bord */
function renderPvBar(){$('#pvBar').innerHTML=D.ch?posGroup():'';}
function renderInsp(){
  const box=$('#insp');renderPvBar();if(!D.ch){box.innerHTML='';return;}
  if(D.pcmp){renderInspCmp();return;}
  const c=D.ch,k=D.key,so=c.soff||0,sug=sugFrom(c,k,so),pv=state.pv,list=sug.slice();if(!list.includes(c.scale))list.push(c.scale);
  /* "Start on": de akkoordtonen als snelle keuze, plus elke andere noot via het keuzemenu */
  const ct=[...new Set(chordScale(c).notes.map(n=>n.iv))].filter(x=>x<12).sort((a,b)=>a-b).filter(x=>[0,3,4,6,7,8,9,10,11].includes(x)).slice(0,4);
  const nm=o=>ROOTS[sRootId(c,o)].name,same=sameNotes(c);
  const eq=id=>{if(!so)return'';const e=REGISTRY.filter(g=>!g.kind).flatMap(g=>g.items).find(x=>pcsOf(ROOTS[c.root].pc,x.id)===pcsOf(mod(ROOTS[c.root].pc+so,12),id));
    return e?'<em class="eqn">= '+esc(ROOTS[c.root].name+' '+shortName(e.id))+'</em>':'';};
  const tg=(key,label)=>'<label class="lrow"><span>'+esc(label)+'</span><span class="tg"><input type="checkbox" role="switch" data-pv="'+key+'"'+(pv[key]?' checked':'')+'><i></i></span></label>';
  let lo='';for(let f=0;f<=MAXF-pv.span+1;f++)lo+='<option value="'+f+'"'+(f===pv.lo?' selected':'')+'>'+f+'</option>';
  let h='<div><div class="grpt">'+esc(PT.chordN(D.idx+1,D.list.length))+'</div><section class="card list">'
   +'<div class="lrow"><label for="iSym">'+esc(PT.chord)+'</label><input type="text" id="iSym" value="'+esc(c.sym)+'" title="'+esc(PT.symHint)+'" autocomplete="off" spellcheck="false"></div>'
   +'<p class="err" id="iErr" hidden></p>'
   +(k?'<div class="lrow"><span>'+esc(PT.func)+'</span><span class="v">'+esc(PT.inKey(romanOf(c,k),keyName(k)))+'</span></div>':'')
   +'<div class="lrow"><span>'+esc(PT.barsL)+'</span><span class="stp"><button type="button" data-a="barsDown" aria-label="'+esc(PT.fewer)+'">−</button><b>'+esc(PT.bars(c.bars))+'</b><button type="button" data-a="barsUp" aria-label="'+esc(PT.more)+'">+</button></span></div>'
   +(D.list.length>1?'<div class="lrow"><button type="button" class="act" data-a="cmpNext">⇄ '+esc(PT.cmp.with)+'</button><span class="cap">Shift-click</span></div>':'')
   +'</section></div>';
  h+='<div><div class="grpt">'+esc(PT.scaleOver)+'<button type="button" class="info" data-a="info" aria-label="'+esc(PT.infoBtn)+'" title="'+esc(PT.infoBtn)+'">i</button></div><section class="card list">'
   +'<div class="lrow st"><span>'+esc(PT.startOn)+'</span><span class="seg so">'+ct.map(o=>'<button type="button" data-a="soff" data-v="'+o+'" aria-pressed="'+(o===so)+'"><b>'+esc(nm(o))+'</b><small>'+esc(offName(c,o))+'</small></button>').join('')
     +'<select id="iSoff" aria-label="'+esc(PT.otherNote)+'"'+(ct.includes(so)?'':' class="on"')+'><option value="">'+esc(PT.otherNote)+'</option>'
     +[...Array(12).keys()].map(o=>'<option value="'+o+'"'+(o===so&&!ct.includes(so)?' selected':'')+'>'+esc(nm(o)+' ('+offName(c,o)+')')+'</option>').join('')+'</select></span></div>'
   +list.map((id,j)=>'<button type="button" class="opt" data-a="scale" data-id="'+id+'" aria-pressed="'+(id===c.scale)+'"><span class="ck">'+(id===c.scale?'✓':'')+'</span>'
     +(so?'<span class="two">'+esc(nm(so)+' '+shortName(id))+eq(id)+'</span>':esc(SCALES[id].name)+(j===0&&sug[0]===id?'<small>'+esc(PT.suggested)+'</small>':''))+'</button>').join('')
   +(same.length?'<div class="lrow same"><span class="cap">'+esc(PT.sameNotes)+'</span>'+same.map(x=>'<button type="button" class="tag" data-a="seq" data-o="'+x.o+'" data-id="'+x.id+'">'+esc(nm(x.o)+' '+shortName(x.id))+(x.o?' <small>'+esc(PT.fromDeg(offName(c,x.o)))+'</small>':'')+'</button>').join('')+'</div>':'')
   +'<div class="lrow"><select id="iAll" aria-label="'+esc(PT.allScales)+'"><option value="">'+esc(PT.allScales)+'</option>'
   +REGISTRY.filter(g=>!g.kind).map(g=>'<optgroup label="'+esc(g.group)+'">'+g.items.map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('')+'</optgroup>').join('')
   +'</select></div></section><p class="cap" style="margin:6px 14px 0">'+esc(PT.scaleNote)+'</p></div>';
  h+='<div><div class="grpt">'+esc(PT.show)+'</div><section class="card list">'+tg('tones',PT.tones)+tg('scale',PT.scaleT)+tg('guide',PT.guide)
   +'<div class="lrow'+(so||(pv.forms&&mOff(c))?' st':'')+'"><span>'+esc(PT.labels)+'</span><span class="seg"><button type="button" data-a="lab" data-v="deg" aria-pressed="'+(pv.labels==='deg'||(pv.labels==='sdeg'&&!so)||(pv.labels==='mdeg'&&!(pv.forms&&mOff(c))))+'">'+esc(PT.deg)+'</button>'
     +(so?'<button type="button" data-a="lab" data-v="sdeg" aria-pressed="'+(pv.labels==='sdeg')+'" title="'+esc(PT.sdegHint(nm(so)))+'">'+esc(nm(so))+' = 1</button>':'')
     +(pv.forms&&mOff(c)?'<button type="button" data-a="lab" data-v="mdeg" aria-pressed="'+(pv.labels==='mdeg')+'" title="'+esc(PT.mdegHint(mName(c)))+'">'+esc(mName(c))+' = 1</button>':'')
     +'<button type="button" data-a="lab" data-v="note" aria-pressed="'+(pv.labels==='note')+'">'+esc(PT.notes)+'</button></span></div></section></div>';
  if(editing)h+='<div><div class="grpt">'+esc(PT.editH)+'</div><section class="card list"><div class="lrow" style="justify-content:flex-start;gap:8px"><button type="button" class="act" data-a="mv" data-v="-1">← '+esc(PT.moveL)+'</button><button type="button" class="act" data-a="mv" data-v="1">'+esc(PT.moveR)+' →</button></div>'
   +'<div class="lrow"><button type="button" class="act danger" data-a="del" data-i="'+D.idx+'">'+esc(PT.delChord)+'</button></div></section></div>';
  box.innerHTML=h;}

const isAlt=c=>/♭9|♯9|♯5|♭13|alt|♭5/.test(symOfId(c.type));
const SUPER=[[3,'melMinor',c=>famOf(c.type)==='hd'],[1,'melMinor',c=>famOf(c.type)==='dom'&&isAlt(c)],[1,'dimWH',c=>famOf(c.type)==='dom'&&/♭9/.test(symOfId(c.type))],
  [6,'majPent',c=>famOf(c.type)==='dom'&&isAlt(c)],[7,'melMinor',c=>famOf(c.type)==='dom'&&!isAlt(c)],[7,'dorian',c=>famOf(c.type)==='dom'&&!isAlt(c)],
  [7,'ionian',c=>famOf(c.type)==='maj'],[4,'minPent',c=>famOf(c.type)==='maj'],[9,'melMinor',c=>famOf(c.type)==='aug'&&/^maj/.test(symOfId(c.type))],
  [10,'ionian',c=>famOf(c.type)==='min'],[2,'minPent',c=>famOf(c.type)==='min'],[0,'melMinor',c=>famOf(c.type)==='mM'],[0,'dimWH',c=>famOf(c.type)==='dim']];
/* uitleg Pat Martino: mineurconversie en de vijf vormen; de regel van het gekozen akkoord wordt gemarkeerd */
function openMInfo(){const M=PT.mi,c=D&&D.prog?D.ch:null,hit=c?{0:0,7:1,3:2,9:3}[mRule(c)]:-1;
  let h='<p class="lead">'+esc(M.intro)+'</p>'
   +'<div><h3>'+esc(M.convT)+'</h3>'+(c?'<p class="cap">'+esc(M.forThis(c.sym,mName(c)))+'</p>':'')
   +'<div class="supt"><div class="sr hd m">'+M.cols.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>'
   +M.conv.map((r,i)=>'<div class="sr m'+(i===hit?' hit':'')+'"><span class="ch">'+esc(r.ch)+'</span><span><b>'+esc(r.think)+'</b><small>'+esc(r.ex)+'</small></span><span>'+esc(r.why)+'</span></div>').join('')
   +'</div></div>'
   +'<div><h3>'+esc(M.formsT)+'</h3><div class="supt">'+M.forms.map((x,i)=>'<div class="sr m2"><span class="ch">'+esc(PT.formN(i+1))+'</span><span>'+esc(x)+'</span></div>').join('')+'</div>'
   +'<p class="cap" style="margin-top:8px">'+esc(M.formsNote)+'</p></div>'
   +'<div class="grp"><h3>'+esc(M.howT)+'</h3><ol>'+M.how.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></div>';
  $('#inTitle').textContent=M.title;$('#inClose').textContent=PT.sup.done;$('#inBody').innerHTML=h;$('#infoSheet').showModal();}
/* het (i)-venster: uitleg + tabel; regels die bij het gekozen akkoord passen worden gemarkeerd met het voorbeeld in de juiste toonsoort */
function openInfo(){const S=PT.sup,c=D&&D.ch,hits=c?SUPER.map((r,i)=>r[2](c)?i:-1).filter(i=>i>=0):[];
  let h='<p class="lead">'+esc(S.intro)+'</p><div class="grp"><h3>'+esc(S.howT)+'</h3><ol>'+S.how.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></div>'
   +'<div><h3>'+esc(S.tableT)+'</h3>'+(c?'<p class="cap">'+esc(hits.length?S.forThis(c.sym,hits.length):S.none(c.sym))+'</p>':'')
   +'<div class="supt"><div class="sr hd">'+S.cols.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>'
   +S.rows.map((r,i)=>{const hit=hits.includes(i),here=hit?S.here(c.sym,ROOTS[sRootId(c,SUPER[i][0])].name+' '+shortName(SUPER[i][1])):r.ex;
      return '<div class="sr'+(hit?' hit':'')+'"><span class="ch">'+esc(r.ch)+'</span><span><b>'+esc(r.play)+'</b><small>'+esc(here)+'</small></span><span>'+esc(r.same)+'</span><span>'+esc(r.hear)+'</span></div>';}).join('')
   +'</div></div><p class="cap">'+esc(S.tip)+'</p>';
  $('#inTitle').textContent=S.title;$('#inClose').textContent=S.done;$('#inBody').innerHTML=h;$('#infoSheet').showModal();}
function bindInfo(){$('#inClose').addEventListener('click',()=>$('#infoSheet').close());
  $('#infoSheet').addEventListener('click',e=>{if(e.target.id==='infoSheet')$('#infoSheet').close();});}   /* klik naast het venster sluit het */
/* andere startnoot: kies de best passende toonladder op die noot (houd de huidige als die nog past) */
function setSoff(c,o){if(mod(o,12)===(c.soff||0))return;c.soff=mod(o,12);
  const s=sugFrom(c,D.key,c.soff);if(!s.includes(c.scale))c.scale=s[0]||c.scale;}
/* ── acties ── */
/* tijdens het afspelen springt een klik op een akkoord de band daarheen (vanaf de volgende tel), zonder te stoppen */
function selectChord(i){if(progPlayer.on){progPlayer.seek=geom(curProg()).starts[i]||0;state.view.sel=i;state.view.cmp=null;update();return;}
  progStop();state.view.sel=i;state.view.cmp=null;update();}
function compareWith(i){if(!D.list.length||i===D.idx)return;progStop();state.view.cmp=i;update();}
function openProg(id){progStop();if(state.view.prog!==id)state.view.sel=0;state.view.mode='prog';state.view.prog=id;delArmed=null;update();}
function locate(fi){const l=flat(curProg());return l[fi]||null;}
function moveChord(fi,toSi,toCi){
  const p=curProg(),at=locate(fi);if(!at)return;
  const c=p.sections[at.si].chords.splice(at.ci,1)[0];
  if(at.si===toSi&&toCi>at.ci)toCi--;
  p.sections[toSi].chords.splice(Math.max(0,Math.min(toCi,p.sections[toSi].chords.length)),0,c);
  state.view.sel=flat(p).findIndex(x=>x.c===c);update();}
function moveBy(d){
  const p=curProg(),at=locate(D.idx);if(!at)return;
  if(d<0){if(at.ci>0)moveChord(D.idx,at.si,at.ci-1);else if(at.si>0)moveChord(D.idx,at.si-1,p.sections[at.si-1].chords.length);}
  else{if(at.ci<p.sections[at.si].chords.length-1)moveChord(D.idx,at.si,at.ci+2);else if(at.si<p.sections.length-1)moveChord(D.idx,at.si+1,0);}}
function delChord(fi){const p=curProg(),at=locate(fi);if(!at)return;progStop();
  p.sections[at.si].chords.splice(at.ci,1);state.view.sel=Math.max(0,Math.min(fi,flat(p).length-1));update();}
function act(a,el,ev){
  const p=curProg(),pv=state.pv,c=D.ch;
  if(a!=='delProg'&&delArmed){clearTimeout(delArmed);delArmed=null;}
  switch(a){
    case 'sel':if(ev&&ev.shiftKey){const fi=+el.dataset.i;if(fi===D.idx)break;if(state.view.cmp===fi){state.view.cmp=null;update();}else compareWith(fi);}else selectChord(+el.dataset.i);break;
    case 'cmpNext':compareWith(mod(D.idx+1,D.list.length));break;
    case 'cmpStop':state.view.cmp=null;update();break;
    case 'cmpSwap':if(D.pcmp){const a=D.idx;state.view.sel=D.cmpIdx;state.view.cmp=a;update();}break;
    case 'cmpKind':pv.cmpKind=el.dataset.v;update();break;
    case 'shStyle':state.set.sharedStyle=el.dataset.v;update();break;
    case 'focus':state.set.cmpFocus=el.dataset.v;update();break;
    case 'shLab':state.set.sharedLabel=el.dataset.v;update();break;
    case 'play':(progPlayer.on||progPlayer.loading)?progStop():progPlay();break;
    case 'loop':pv.loop=!pv.loop;update();break;
    case 'tr':{const p=curProg();if(p){transposeProg(p,+el.dataset.v);update();}}break;
    case 'band':bandOpen=!bandOpen;renderHead();break;
    case 'swing':pv.band.swing=+el.dataset.v;save();renderHead();break;
    case 'style':pv.band.style=el.dataset.v;save();renderHead();break;
    case 'intro':pv.band.intro=el.dataset.v;pv.band.count=el.dataset.v==='count';save();renderHead();break;
    case 'edit':editing=!editing;update();break;
    case 'del':delChord(+el.dataset.i);break;
    case 'remSec':p.sections.splice(+el.dataset.s,1);update();break;
    case 'addSec':p.sections.push({chords:[]});update();{const ins=document.querySelectorAll('.addc');if(ins.length)ins[ins.length-1].focus();}break;
    case 'barsUp':case 'barsDown':if(c){const i=BARS.indexOf(c.bars);c.bars=BARS[Math.max(0,Math.min(BARS.length-1,i+(a==='barsUp'?1:-1)))];update();}break;
    case 'scale':if(c){c.scale=el.dataset.id;update();}break;
    case 'info':openInfo();break;
    case 'fpick':{const fm=+el.dataset.f,mid=+el.dataset.mid,k=el.dataset.row;     /* vorm gekozen op de vormenkaart */
      if(!D.prog){const cur=state.pos.mf[k];state.pos.mf[k]=cur&&cur.f===fm&&Math.abs(cur.mid-mid)<.01?null:{f:fm,mid};}   /* Compare A/B: nog eens klikken = weg */
      else if(k==='B')fpinB={i:state.view.cmp,f:fm,mid};else if(c){c.fsel=fm;pv.fc=mid;}update();}break;
    case 'minfo':openMInfo();break;
    case 'soff':if(c){setSoff(c,+el.dataset.v);update();}break;
    case 'seq':if(c){c.soff=+el.dataset.o;c.scale=el.dataset.id;update();}break;          /* zelfde noten, andere grondtoon */
    case 'lab':pv.labels=el.dataset.v;update();break;
    case 'win':pv.win=el.dataset.v==='1';pv.forms=el.dataset.v==='2';update();break;
    case 'mv':moveBy(+el.dataset.v);break;
    case 'asText':openSheet('edit');break;
    case 'dup':{const cp=JSON.parse(JSON.stringify(p));cp.id=newId();cp.name=PT.copyOf(p.name);state.progs.splice(state.progs.indexOf(p)+1,0,cp);openProg(cp.id);break;}
    case 'delProg':
      if(!delArmed){delArmed=setTimeout(()=>{delArmed=null;if(D.prog)renderProgCard();},4000);renderProgCard();break;}
      clearTimeout(delArmed);delArmed=null;progStop();
      {const i=state.progs.indexOf(p);state.progs.splice(i,1);const nx=state.progs[Math.min(i,state.progs.length-1)];
       editing=false;if(nx){state.view.prog=nx.id;state.view.sel=0;}else{state.view.mode='compare';state.view.prog=null;}update();}
      break;
  }}
/* chord-symbool in de inspector of in een "+ chord"-veld: Enter = toepassen */
function addChords(si,text,input){
  const p=curProg(),toks=text.split(/\s+/).filter(Boolean),bad=[];let last=null;
  toks.forEach(t=>{const r=parseChord(t);if(r.bad){bad.push(t);return;}
    const k=sectionKeys(p.sections.map((x,i)=>i===si?x.chords.concat([r]):x.chords))[si];
    const ch={sym:r.sym,root:r.root,type:r.type,bars:r.bars,bass:r.bass||'',scale:suggestScales(r,k)[0]||'ionian'};p.sections[si].chords.push(ch);last=ch;});
  if(last)state.view.sel=flat(p).findIndex(x=>x.c===last);
  update();
  if(bad.length){const n=$('.addc[data-s="'+si+'"]');if(n){n.value=bad.join(' ');n.classList.add('bad');n.title=PT.badSym(bad[0]);n.focus();}}
  else{const n=$('.addc[data-s="'+si+'"]');if(n)n.focus();}}
function bindProgUI(){
  $('#navCmp').addEventListener('click',()=>{progStop();editing=false;state.view.mode='compare';update();});
  $('#progList').addEventListener('click',e=>{const b=e.target.closest('[data-prog]');if(b)openProg(b.dataset.prog);});
  $('#btnNew').addEventListener('click',()=>openSheet('new'));
  document.addEventListener('click',e=>{if(bandOpen&&!e.target.closest('.bandw')){bandOpen=false;if(D&&D.prog)renderHead();}});
  $('.shell').addEventListener('dblclick',e=>{if(!editing&&D&&D.prog&&e.target.closest('.tw .tile')){editing=true;update();}});   /* dubbelklik op een akkoord = bewerkmodus */
  $('.shell').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b&&(b.closest('#progBar,#progCard,#insp,#pvBar')||(b.closest('#formMap'))))act(b.dataset.a,b,e);});
  /* tijdens het slepen meteen het nieuwe tempo laten horen (de band leest het tempo per tel) */
  $('.shell').addEventListener('input',e=>{const t=e.target,p=curProg();if(p&&t.id==='pTempo'&&t.value!=='')p.tempo=clamp(t.value,40,240);});
  $('.shell').addEventListener('change',e=>{const t=e.target,p=curProg();if(!p)return;
    if(t.id==='pTempo'){p.tempo=clamp(t.value,40,240);update();}
    else if(t.id==='pName'){p.name=t.value.trim().slice(0,80)||PT.untitled;update();}
    else if(t.id==='iAll'&&t.value&&D.ch){D.ch.scale=t.value;update();}
    else if(t.id==='iSoff'&&t.value!==''&&D.ch){setSoff(D.ch,+t.value);update();}
    else if(t.id==='iMoff'&&D.ch){D.ch.moff=t.value===''?null:+t.value;update();}
    else if(t.id==='iLo'){state.pv.lo=+t.value;update();}
    else if(t.id==='iSpan'){state.pv.span=+t.value;state.pv.lo=Math.min(state.pv.lo,MAXF-state.pv.span+1);update();}
    else if(t.dataset.band){state.pv.band[t.dataset.band]=t.checked;save();renderHead();}
    else if(t.dataset.pv){state.pv[t.dataset.pv]=t.checked;update();}
    else if(t.dataset.cm){state[t.dataset.cm].cmode=t.checked?'degree':'fixed';update();}
    else if(t.dataset.sq){state.set.shapeB=t.checked;update();}
    else if((t.id==='sA'||t.id==='sB')&&D.pcmp){(t.id==='sA'?D.ch:D.ch2).scale=t.value;update();}
    else if(t.id==='cA'||t.id==='cB'||t.id==='cS'){update();}});
  /* kleuren live bijwerken tijdens het kiezen */
  $('.shell').addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.vol){state.pv.band.vol[t.dataset.vol]=+t.value;setVol(t.dataset.vol);save();}});
  $('.shell').addEventListener('input',e=>{const t=e.target;if(!D||!D.pcmp)return;
    if(t.id==='cA')state.A.color=t.value;else if(t.id==='cB')state.B.color=t.value;else if(t.id==='cS')state.set.colShared=t.value;else return;
    renderBoard();renderLegend();renderCompare();});
  $('.shell').addEventListener('keydown',e=>{const t=e.target;if(e.key!=='Enter')return;
    if(t.id==='iSym'){e.preventDefault();const r=parseChord(t.value);
      if(r.bad){const er=$('#iErr');er.hidden=false;er.textContent=PT.badSym(t.value)+(suggestFix(t.value)?' → '+suggestFix(t.value):'');return;}
      const c=D.ch,k=D.key;Object.assign(c,{sym:r.sym,root:r.root,type:r.type,bass:r.bass||''});if(t.value.match(/\(|[:*]/))c.bars=r.bars;
      c.scale=suggestScales(c,sectionKeys(curProg().sections.map(x=>x.chords))[D.list[D.idx].si])[0]||c.scale;update();}
    else if(t.classList.contains('addc')){e.preventDefault();if(t.value.trim())addChords(+t.dataset.s,t.value.trim(),t);}
    else if(t.id==='pName'){t.blur();}});
  /* slepen in de Edit-modus */
  const secs=$('#secs');let dragI=null;
  const clear=()=>document.querySelectorAll('.drop').forEach(x=>x.classList.remove('drop'));
  secs.addEventListener('dragstart',e=>{const w=e.target.closest('.tw');if(!w||!editing)return;dragI=+w.dataset.i;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(dragI));}catch(x){}});
  secs.addEventListener('dragover',e=>{if(dragI==null)return;const w=e.target.closest('.tw'),z=e.target.closest('.ptiles');if(!z)return;e.preventDefault();clear();(w||z).classList.add('drop');});
  secs.addEventListener('dragleave',e=>{if(!secs.contains(e.relatedTarget))clear();});
  secs.addEventListener('drop',e=>{if(dragI==null)return;e.preventDefault();clear();const w=e.target.closest('.tw'),z=e.target.closest('.ptiles');if(!z){dragI=null;return;}
    const p=curProg(),si=+z.dataset.s;let ci=p.sections[si].chords.length;
    if(w){const at=locate(+w.dataset.i);if(at&&at.si===si)ci=at.ci;}
    const from=dragI;dragI=null;if(w&&+w.dataset.i===from)return;moveChord(from,si,ci);});
  secs.addEventListener('dragend',()=>{dragI=null;clear();});
  bindSheet();bindLoopBar();bindInfo();bindIreal();}
