/* ═══════════ 1. THEORIE ═══════════
   Spelling, akkoordsoorten (QUAL) en intervallabels: overgenomen uit Chord Moves (§1), zodat beide pagina's hetzelfde
   spellen en dezelfde vier noten kiezen. Nieuw hier: akkoordsymbolen lezen (Cmaj7, G7/B, B♭-7, Fø …). */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mod=(n,m)=>((n%m)+m)%m;
const LET='CDEFGAB',LPC=[0,2,4,5,7,9,11];
const accOf=s=>[...(s||'')].reduce((a,c)=>a+(c==='#'||c==='♯'?1:c==='b'||c==='♭'?-1:0),0);
const accStr=a=>a>0?'♯'.repeat(a):'♭'.repeat(-a);
const accAscii=a=>a>0?'#'.repeat(a):'b'.repeat(-a);
const spellPc=(l,pc)=>({l,a:mod(pc-LPC[l]+6,12)-6});
const nPc=n=>mod(LPC[n.l]+n.a,12);
const nName=n=>LET[n.l]+accStr(n.a),nAscii=n=>LET[n.l]+accAscii(n.a);
/* dubbele kruizen/mollen vermijden: dan de buurletter (F𝄪 → G) */
function nice(n){if(Math.abs(n.a)<=1)return n;const pc=nPc(n);
  for(const d of [1,-1]){const s=spellPc(mod(n.l+d,7),pc);if(Math.abs(s.a)<=1)return s;}return n;}
/* grondtonen: C♭, F♭, E♯ en B♯ als B, E, F en C schrijven */
function plain(n){const pc=nPc(n);return n.a&&LPC.includes(pc)?{l:LPC.indexOf(pc),a:0}:n;}
function parseNote(s){const m=/^([A-G])([#♯b♭]?)$/.exec(String(s||'').trim());return m?{l:LET.indexOf(m[1]),a:accOf(m[2])}:null;}

/* akkoordsoorten: sym = achter de grondtoon op het scherm, st = zoals de Scale Trainer het leest,
   iv = intervallen (halve tonen), d2 = vier noten voor drop 2, tri = drie noten voor Triads (zonder grondtoon waar dat mooier is),
   sh = [terts, septiem, kleurnoot] voor Shells, bar = barrévormen (frets t.o.v. de grondtoon; null = snaar niet spelen)
   op de lage E (E), de A (A) en de D-snaar (D). Een vorm toevoegen: zes getallen van lage E naar hoge e. */
const n=null;
const QUAL={
 maj:   {sym:'',      st:'',        iv:[0,4,7],          d2:[0,4,7,0],  tri:[0,4,7],  sh:[4,7],     bar:{E:[0,2,2,1,0,0],A:[n,0,2,2,2,0],D:[n,n,0,2,3,2]}},
 m:     {sym:'m',     st:'m',       iv:[0,3,7],          d2:[0,3,7,0],  tri:[0,3,7],  sh:[3,7],     bar:{E:[0,2,2,0,0,0],A:[n,0,2,2,1,0],D:[n,n,0,2,3,1]}},
 dim:   {sym:'°',     st:'dim',     iv:[0,3,6],          d2:[0,3,6,0],  tri:[0,3,6],  sh:[3,6],     bar:{E:[0,1,2,0,n,n],A:[n,0,1,2,1,n],D:[n,n,0,1,3,1]}},
 aug:   {sym:'+',     st:'aug',     iv:[0,4,8],          d2:[0,4,8,0],  tri:[0,4,8],  sh:[4,8],     bar:{E:[0,n,2,1,1,n],A:[n,0,3,2,2,n],D:[n,n,0,3,3,2]}},
 sus2:  {sym:'sus2',  st:'sus2',    iv:[0,2,7],          d2:[0,2,7,0],  tri:[0,2,7],  sh:[2,7],     bar:{A:[n,0,2,2,0,0],D:[n,n,0,2,3,0]}},
 sus4:  {sym:'sus4',  st:'sus4',    iv:[0,5,7],          d2:[0,5,7,0],  tri:[0,5,7],  sh:[5,7],     bar:{E:[0,2,2,2,0,0],A:[n,0,2,2,3,0],D:[n,n,0,2,3,3]}},
 '6':   {sym:'6',     st:'6',       iv:[0,4,7,9],        d2:[0,4,7,9],  tri:[4,7,9],  sh:[4,9],     bar:{E:[0,n,-1,1,0,n],A:[n,0,2,2,2,2],D:[n,n,0,2,0,2]}},
 m6:    {sym:'m6',    st:'m6',      iv:[0,3,7,9],        d2:[0,3,7,9],  tri:[3,7,9],  sh:[3,9],     bar:{E:[0,n,-1,0,0,n],A:[n,0,n,-1,1,0],D:[n,n,0,2,0,1]}},
 '69':  {sym:'6/9',   st:'6/9',     iv:[0,4,7,9,14],     d2:[0,4,9,2],  tri:[4,9,2],  sh:[4,9,2],   bar:{A:[n,0,-1,-1,0,0]}},
 add9:  {sym:'add9',  st:'add9',    iv:[0,4,7,14],       d2:[0,4,7,2],  tri:[4,7,2],  sh:[4,7,2],   bar:{A:[n,0,2,4,2,n]}},
 madd9: {sym:'m(add9)',st:'m(add9)',iv:[0,3,7,14],       d2:[0,3,7,2],  tri:[3,7,2],  sh:[3,7,2],   bar:{A:[n,0,2,4,1,n]}},
 maj7:  {sym:'maj7',  st:'maj7',    iv:[0,4,7,11],       d2:[0,4,7,11], tri:[4,7,11], sh:[4,11],    bar:{E:[0,n,1,1,0,n],A:[n,0,2,1,2,0],D:[n,n,0,2,2,2]}},
 m7:    {sym:'m7',    st:'m7',      iv:[0,3,7,10],       d2:[0,3,7,10], tri:[3,7,10], sh:[3,10],    bar:{E:[0,2,0,0,0,0],A:[n,0,2,0,1,0],D:[n,n,0,2,1,1]}},
 '7':   {sym:'7',     st:'7',       iv:[0,4,7,10],       d2:[0,4,7,10], tri:[4,7,10], sh:[4,10],    bar:{E:[0,2,0,1,0,0],A:[n,0,2,0,2,0],D:[n,n,0,2,1,2]}},
 m7b5:  {sym:'m7♭5',  st:'m7b5',    iv:[0,3,6,10],       d2:[0,3,6,10], tri:[3,6,10], sh:[3,10,6],  bar:{E:[0,n,0,0,-1,n],A:[n,0,1,0,1,n],D:[n,n,0,1,1,1]}},
 dim7:  {sym:'°7',    st:'dim7',    iv:[0,3,6,9],        d2:[0,3,6,9],  tri:[3,6,9],  sh:[3,9,6],   bar:{E:[0,n,-1,0,-1,n],A:[n,0,1,-1,1,n],D:[n,n,0,1,0,1]}},
 mMaj7: {sym:'m(maj7)',st:'m(maj7)',iv:[0,3,7,11],       d2:[0,3,7,11], tri:[3,7,11], sh:[3,11],    bar:{E:[0,n,1,0,0,n],A:[n,0,2,1,1,0],D:[n,n,0,2,2,1]}},
 '7sus4':{sym:'7sus4',st:'7sus4',   iv:[0,5,7,10],       d2:[0,5,7,10], tri:[5,7,10], sh:[5,10],    bar:{E:[0,2,0,2,0,0],A:[n,0,2,0,3,0],D:[n,n,0,2,1,3]}},
 maj9:  {sym:'maj9',  st:'maj9',    iv:[0,4,7,11,14],    d2:[0,4,11,2], tri:[7,11,2], sh:[4,11,2],  bar:{A:[n,0,-1,1,0,n]}},
 m9:    {sym:'m9',    st:'m9',      iv:[0,3,7,10,14],    d2:[0,3,10,2], tri:[3,10,2], sh:[3,10,2],  bar:{E:[0,n,0,0,0,2],A:[n,0,-2,0,0,n]}},
 '9':   {sym:'9',     st:'9',       iv:[0,4,7,10,14],    d2:[0,4,10,2], tri:[4,10,2], sh:[4,10,2],  bar:{A:[n,0,-1,0,0,0]}},
 '13':  {sym:'13',    st:'13',      iv:[0,4,7,10,14,21], d2:[0,4,10,9], tri:[4,10,9], sh:[4,10,9],  bar:{E:[0,n,0,1,2,n],A:[n,0,n,0,2,2]}},
 '7b9': {sym:'7♭9',   st:'7b9',     iv:[0,4,7,10,13],    d2:[0,4,10,1], tri:[4,10,1], sh:[4,10,1],  bar:{E:[0,n,0,1,0,1],A:[n,0,-1,0,-1,n]}},
 '7s9': {sym:'7♯9',   st:'7#9',     iv:[0,4,7,10,15],    d2:[0,4,10,3], tri:[4,10,3], sh:[4,10,3],  bar:{A:[n,0,-1,0,1,n]}},
 '7alt':{sym:'7alt',  st:'7alt',    iv:[0,4,10,15,20],   d2:[4,10,3,8], tri:[4,10,8], sh:[4,10,3],  bar:{A:[n,0,-1,0,1,1]}},
 maj7s11:{sym:'maj7♯11',st:'maj7#11',iv:[0,4,7,11,18],   d2:[0,4,11,6], tri:[4,6,11], sh:[4,11,6],  bar:{A:[n,0,1,1,2,n]}},
 '7s11':{sym:'7♯11',  st:'7#11',    iv:[0,4,7,10,18],    d2:[0,4,10,6], tri:[4,10,6], sh:[4,10,6],  bar:{A:[n,0,1,0,2,n]}},
 m11:   {sym:'m11',   st:'m11',     iv:[0,3,7,10,17],    d2:[0,3,10,5], tri:[10,3,5], sh:[3,10,5],  bar:{A:[n,0,0,0,1,n]}},
 '7b5': {sym:'7♭5',   st:'7b5',     iv:[0,4,6,10],       d2:[0,4,6,10], tri:[4,6,10], sh:[4,10,6],  bar:{E:[0,n,0,1,-1,n],A:[n,0,1,0,2,n]}},
 '7s5': {sym:'7♯5',   st:'7#5',     iv:[0,4,8,10],       d2:[0,4,8,10], tri:[4,8,10], sh:[4,10,8],  bar:{E:[0,n,0,1,1,n],A:[n,0,n,0,2,1]}},
 '9sus4':{sym:'9sus4',st:'9sus4',   iv:[0,5,7,10,14],    d2:[0,5,10,2], tri:[10,2,5], sh:[5,10,2],  bar:{A:[n,0,0,0,0,n]}},
 maj7s5:{sym:'maj7♯5',st:'maj7#5',  iv:[0,4,8,11],       d2:[0,4,8,11], tri:[4,8,11], sh:[4,11,8],  bar:{E:[0,n,1,1,1,n]}}
};

/* intervallabel van een akkoordtoon (halve tonen boven de grondtoon), passend bij de akkoordsoort */
function ivLab(s,id){const iv=QUAL[id].iv.map(x=>mod(x,12)),has=x=>iv.includes(x),sev=has(10)||has(11);
  switch(s){case 0:return'R';case 1:return'♭9';case 2:return id==='sus2'?'2':'9';case 3:return has(4)?'♯9':'♭3';case 4:return'3';
    case 5:return sev&&(has(3)||has(4))?'11':'4';case 6:return has(7)||/s11/.test(id)?'♯11':'♭5';case 7:return'5';
    case 8:return has(7)||id==='7alt'?'♭13':'♯5';case 9:return id==='13'?'13':'6';case 10:return'♭7';default:return'7';}}
const LABDEG={'R':1,'♭9':2,'9':2,'2':2,'♯9':2,'♭3':3,'3':3,'4':4,'11':4,'♯11':4,'♭5':5,'5':5,'♯5':5,'♭13':6,'13':6,'6':6,'♭7':7,'7':7};
const toneName=(c,pc)=>nName(nice(spellPc(mod(c.root.l+LABDEG[ivLab(mod(pc-c.rootPc,12),c.q)]-1,7),pc)));
/* label voor op het scherm: op een septiemakkoord heet de 6 een 13 (C7 met A = C13) */
const ivName=(s,id)=>{const l=ivLab(s,id);return l==='6'&&QUAL[id].iv.some(x=>mod(x,12)===10)?'13':l;};

/* akkoordsoorten in groepen, voor de knoppen */
const QGROUPS=[['triads',['maj','m','dim','aug','sus2','sus4']],
  ['sevenths',['maj7','m7','7','m7b5','dim7','mMaj7','7sus4','6','m6']],
  ['ext',['maj9','m9','9','13','m11','9sus4','69','add9','madd9']],
  ['alt',['7b9','7s9','7alt','7b5','7s5','7s11','maj7s11','maj7s5']]];
const ROOTS12=['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];

/* ── akkoordsymbool lezen ── achter de grondtoon: Δ7, -7, ø, °7, alt, b9 … (zelfde schrijfwijzen als de Scale Trainer) */
function normQ(q){
  q=q.replace(/\s+/g,'').replace(/[()]/g,'').replace(/b/g,'♭').replace(/#/g,'♯');
  if(q==='Δ'||q==='△'||q==='^')return'maj7';q=q.replace(/^\^/,'maj');
  q=q.replace(/^(min|mi|-)/,'m');
  q=q.replace(/^(Maj|MAJ|maj|Ma|ma|M|Δ|△)/,'maj');
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
/* schrijfwijze na normQ → akkoordsoort in QUAL */
const SYMQ={'':'maj',m:'m',dim:'dim',aug:'aug',sus2:'sus2',sus4:'sus4','6':'6',m6:'m6','6/9':'69',add9:'add9',madd9:'madd9',
  maj7:'maj7',m7:'m7','7':'7','m7♭5':'m7b5',dim7:'dim7',mmaj7:'mMaj7','7sus4':'7sus4',maj9:'maj9',m9:'m9','9':'9','13':'13',
  '7♭9':'7b9','7♯9':'7s9','7alt':'7alt','maj7♯11':'maj7s11','7♯11':'7s11',m11:'m11','7♭5':'7b5','7♯5':'7s5','9sus4':'9sus4',
  'maj7♯5':'maj7s5',m7b5:'m7b5',maj6:'6',sus:'sus4','2':'sus2',add2:'add9'};
/* één akkoord, bijv. "Cmaj7", "Bb-7", "G7/B", "F#ø" → {root, rootPc, q, bass, bassPc, sym} of null */
function parseChord(txt){
  const t=String(txt||'').trim().replace(/♯/g,'#').replace(/♭/g,'b');
  const m=/^([A-Ga-g])([#b]?)(.*?)(?:\/([A-Ga-g])([#b]?))?$/.exec(t);if(!m)return null;
  const q=SYMQ[normQ(m[3])];if(!q||!QUAL[q])return null;
  const root=nice({l:LET.indexOf(m[1].toUpperCase()),a:accOf(m[2])});
  let bass=m[4]?nice({l:LET.indexOf(m[4].toUpperCase()),a:accOf(m[5])}):null;
  if(bass&&nPc(bass)===nPc(root))bass=null;
  return makeChord(root,q,bass);}
function makeChord(root,q,bass){
  return{root,rootPc:nPc(root),q,bass:bass||null,bassPc:bass?nPc(bass):null,
    sym:nName(root)+QUAL[q].sym+(bass?'/'+nName(bass):''),ascii:nAscii(root)+QUAL[q].sym.replace(/♭/g,'b').replace(/♯/g,'#')+(bass?'/'+nAscii(bass):'')};}
