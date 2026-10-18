/* ═══════════ 2. VOICINGS ═══════════
   Alle bruikbare vormen van één akkoord in een gekozen soort: frets 1–15, hooguit 5 frets breed, geen losse snaren.
   Basis (mk, place, shells, barré, slash-bas) overgenomen uit Chord Moves (§2). Nieuw: drop 3, drop 2&4, close en rootless,
   en per vorm de omkering, de topnoot en de snarenset. Snaar 0 = lage E … 5 = hoge e (op het scherm: snaar 6 … 1). */
const OPEN=[40,45,50,55,59,64],MAXF=15;
function mk(f,src,pen){const notes=[];f.forEach((x,s)=>{if(x>=0)notes.push({s,f:x,midi:OPEN[s]+x,pc:mod(OPEN[s]+x,12)});});
  const fr=notes.map(x=>x.f);return{f,src,pen:pen||0,notes,center:fr.reduce((a,b)=>a+b,0)/fr.length,lo:Math.min(...fr),hi:Math.max(...fr)};}
/* toonklassen pcs (van laag naar hoog) op snaren strs leggen; elke stem hoger dan de vorige, minder dan een octaaf erboven.
   o.span = hoeveel frets de hand mag overspannen (4 = vijf frets), o.close = drieklank binnen een octaaf, o.gap0 = grotere sprong bas → rest */
function place(pcs,strs,o){o=o||{};const out=[],span=o.span||4;
  (function rec(i,fr,prev,mn,mx){
    if(i===pcs.length){if(o.close&&OPEN[strs[strs.length-1]]+fr[fr.length-1]-OPEN[strs[0]]-fr[0]>=12)return;
      const f=[-1,-1,-1,-1,-1,-1];strs.forEach((s,k)=>{f[s]=fr[k];});out.push(f);return;}
    const s=strs[i];
    for(let x=1;x<=MAXF;x++){if(mod(OPEN[s]+x,12)!==pcs[i])continue;const m=OPEN[s]+x;
      if(i>0){const g=m-prev;if(g<=0||g>=(i===1&&o.gap0?o.gap0:12))continue;}
      const a=Math.min(mn,x),b=Math.max(mx,x);if(b-a>span)continue;
      rec(i+1,fr.concat(x),m,a,b);}})(0,[],0,99,-1);
  return out;}

/* ── soorten ──
   Drop-voicings: neem een gesloten akkoord (vier noten binnen een octaaf, alle omkeringen) en laat stemmen een octaaf zakken.
   Gesloten c0 < c1 < c2 < c3 (van laag naar hoog) → drop 2: c2 c0 c1 c3 · drop 3: c1 c0 c2 c3 · drop 2&4: c0 c2 c1 c3. */
const VTYPES=['drop2','drop3','drop24','close','rootless','shell','triad','barre'];
const DROP={close:c=>c,drop2:c=>[c[2],c[0],c[1],c[3]],drop3:c=>[c[1],c[0],c[2],c[3]],drop24:c=>[c[0],c[2],c[1],c[3]]};
const SETS4={adj:[[0,1,2,3],[1,2,3,4],[2,3,4,5]],drop3:[[0,2,3,4],[1,3,4,5]],drop24:[[0,1,3,4],[1,2,4,5]]};
/* gesloten ligging in alle omkeringen; een drieklank krijgt zijn onderste noot een octaaf hoger erbij (C E G C) */
function closeOrders(set){const u=[...new Set(set.map(x=>mod(x,12)))].sort((a,b)=>a-b),out=[];
  if(u.length===3)for(let k=0;k<3;k++){const r=[0,1,2].map(j=>u[(k+j)%3]);out.push([r[0],r[1],r[2],r[0]]);}
  else if(u.length===4)for(let k=0;k<4;k++)out.push([0,1,2,3].map(j=>u[(k+j)%4]));
  return out;}
/* rootless (Bill Evans-idee, als drop 2 op de gitaar): de grondtoon eruit, een kleurnoot erin.
   Eerst de 9; zit er al een 9 (♭9, 9, ♯9) in, dan de kwint. Bij een gewoon 7-akkoord ook de 13 in plaats van de kwint. */
function rootlessSet(id){if(id==='dim7')return null;const s=QUAL[id].d2.map(x=>mod(x,12)),has=x=>s.includes(x);
  if(new Set(s).size<4)return null;if(!has(0))return s;
  const add=!(has(1)||has(2)||has(3)&&has(4))?2:!has(7)&&!has(6)&&!has(8)?7:null;if(add==null)return null;
  let r=s.map(x=>x===0?add:x);if(id==='7')r=r.map(x=>x===7?9:x);
  return new Set(r).size===4?r:null;}
/* shells: [volgorde van laag naar hoog, snaren] (R = grondtoon, 3, 7 = septiem/sext/kwint, c = kleurnoot) */
const SH3=[[['R','3','7'],[0,1,2]],[['R','3','7'],[1,2,3]],[['R','7','3'],[0,2,3]],[['R','7','3'],[1,3,4]],[['R','7','3'],[0,1,3]],[['R','7','3'],[1,2,4]],[['R','3','7'],[2,3,4]]];
const SH4=[[['R','3','7','c'],[0,1,2,3]],[['R','3','7','c'],[1,2,3,4]],[['R','7','3','c'],[0,2,3,4]],[['R','7','3','c'],[1,3,4,5]],[['R','c','7','3'],[0,1,2,3]],[['R','c','7','3'],[1,2,3,4]]];

function typeCands(c,type){const q=QUAL[c.q],P=x=>mod(c.rootPc+x,12),out=[];
  if(DROP[type]||type==='rootless'){const set=type==='rootless'?rootlessSet(c.q):q.d2;if(!set)return out;
    const dr=DROP[type==='rootless'?'drop2':type],strs=type==='drop3'?SETS4.drop3:type==='drop24'?SETS4.drop24:SETS4.adj;
    closeOrders(set).forEach(o=>strs.forEach(st=>place(dr(o).map(P),st,{span:type==='close'?5:4}).forEach(f=>out.push(mk(f,type)))));}
  else if(type==='shell'){const[g3,g7,col]=q.sh,map={R:0,'3':g3,'7':g7,c:col};
    const run=pats=>pats.forEach(([o,st])=>place(o.map(t=>P(map[t])),st).forEach(f=>out.push(mk(f,'shell'))));
    run(SH3);if(col!=null)run(SH4);}
  else if(type==='triad'){const u=[...new Set(q.tri.map(x=>mod(x,12)))].sort((a,b)=>a-b);
    for(let k=0;k<u.length;k++){const o=[0,1,2].map(j=>u[(k+j)%u.length]);
      [[0,1,2],[1,2,3],[2,3,4],[3,4,5]].forEach(st=>place(o.map(P),st,{close:true}).forEach(f=>out.push(mk(f,'triad'))));}}
  else if(type==='barre'){[['E',0],['A',1],['D',2]].forEach(([fm,rs])=>{const t=q.bar&&q.bar[fm];if(!t)return;
      for(let r=1;r<=MAXF;r++){if(mod(OPEN[rs]+r,12)!==c.rootPc)continue;const f=t.map(o=>o==null?-1:r+o);
        if(f.some(x=>x!==-1&&(x<1||x>MAXF)))continue;out.push(mk(f,'bar'+fm));}});}
  return out;}
/* slash-akkoord: de basnoot op een vrije lagere snaar erbij (vormen die al op die noot beginnen blijven zoals ze zijn) */
function addBass(v,b){const low=v.notes[0];if(low.pc===b)return[v];const out=[];
  for(let s=0;s<low.s;s++)for(let x=1;x<=MAXF;x++){const m=OPEN[s]+x;if(mod(m,12)!==b||m>=low.midi||low.midi-m>=24)continue;
    if(Math.max(v.hi,x)-Math.min(v.lo,x)>4)continue;const f=v.f.slice();f[s]=x;out.push(mk(f,v.src,v.pen));}
  return out;}

/* ── per vorm: omkering, bas- en topnoot, snarenset ──
   Omkering = welke akkoordtoon onderin ligt: grondtoon, terts (of sus-noot), kwint, septiem (of sext). Anders: "9 in bass". */
const ROLE={'R':0,'♭3':1,'3':1,'2':1,'4':1,'♭5':2,'5':2,'♯5':2,'♭7':3,'7':3,'6':3};
function describe(c,v){const lab=pc=>ivName(mod(pc-c.rootPc,12),c.q),lo=v.notes[0],tp=v.notes[v.notes.length-1];
  v.type=/^bar/.test(v.src)?'barre':v.src;v.key=v.f.join(',');
  v.low=lab(lo.pc);v.top=lab(tp.pc);v.inv=v.low in ROLE?ROLE[v.low]:null;
  v.strs=v.notes.map(x=>6-x.s).join('');
  return v;}
/* alle vormen van akkoord c in soort type, gesorteerd van laag naar hoog op de hals */
function voicingsOf(c,type){let out=typeCands(c,type);
  if(c.bassPc!=null)out=out.flatMap(v=>addBass(v,c.bassPc));
  const seen=new Set();out=out.filter(v=>{const k=v.f.join();if(seen.has(k))return false;seen.add(k);return true;});
  return out.map(v=>describe(c,v)).sort((a,b)=>a.lo-b.lo||a.notes[0].s-b.notes[0].s||a.hi-b.hi);}
