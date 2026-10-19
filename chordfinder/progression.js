/* ═══════════ 9. PROGRESSION (voice leading) ═══════════
   Akkoordsymbolen → per akkoord één vorm, gekozen over de hele rij met Viterbi (zoals voiceLead() in Chord Moves):
   kosten per vorm (bas, positie, snarenset, melodienoot bovenin) + kosten per overgang (handverschuiving + stemstappen,
   in "Top line" ook de sprong van de bovenste stem). Vormen in S.pLock liggen vast; de rest past zich eromheen aan.
   S.pLock = {volgnummer: {s: symbool, k: frets, t: soort, h: 1?}}: zonder h = gelockt door de gebruiker (blijft),
   met h = "vastgehouden" (tijdelijk bevroren zodat alleen andere akkoorden veranderen; Re-fit of een andere instelling laat ze weer los).
   S.pTypes = {volgnummer: {s: symbool, t: soort}} = eigen voicingsoort voor één akkoord; S.pFit = 'refit'|'keep' (wat er met de rest gebeurt als je een vorm kiest).
   Opslag (in 'chordFinder.v1'): pText, pType, pMode, pPos, pMel, pTempo, pLoop, pLock, pTypes, pFit, pgF (filters, zie pgPass),
   en voor de band (fase 4): pStyle, pDrums, pVol = {piano (= "Chords"), bass, drums} (0–100).
   Niet meer gelezen (blijven staan): pStr (vervangen door de snarenset in pgF), pLine (de band speelt altijd walking), pBNeck.
   Een vorm kiezen gaat in het venster "choose a shape" (pgOpen); meer akkoorden geselecteerd = acties op de transportplank (pgRenderSel).
   Alle namen hier beginnen met pg/PG: de scripts delen één scope. */
const PG_MODES=['smooth','pos','strings','top'];
const PG_FB=['drop2','shell','triad','barre','close'];      /* geen vorm in de gekozen soort? dan de eerste die wel bestaat */
const PG_GUIDE=['3','♭3','7','♭7'];
const PG_MAX=64;
const PG_STEPK=8;                                              /* Stepwise: kosten als de laagste noot van de vorm de baslijn niet volgt */
/* akkoordsoorten die de Scale Trainer kent en wij niet: dan het dichtstbijzijnde eenvoudigere akkoord */
const PG_SIMPLER=[[/m6\/9/,'m6'],[/m\(?maj9\)?/i,'m(maj7)'],[/m9[♭b]5/,'m7b5'],[/m7[♭b]9/,'m7'],[/maj9[♯#]5/,'maj7#5'],
  [/maj13/,'maj9'],[/7[♭b]9[♭b]13/,'7b9'],[/13[♭b]9/,'7b9'],[/13[♯#]11/,'7#11'],[/7[♭b]13/,'7#5']];
let PG=null,PGSEL=0,PGP=null,PGSET=new Set([0]),PGANC=0;   /* PGSEL = akkoord in het zijpaneel, PGSET = alle geselecteerde, PGANC = begin van Shift-selectie */
const pgCache=new Map();
function pgVoicings(c,type){const k=c.sym+'|'+type;if(!pgCache.has(k))pgCache.set(k,voicingsOf(c,type));return pgCache.get(k);}
/* favorieten (★, S.favs, zie render.js) van dit akkoord op zijn grondtoon, van elke voicingsoort (dezelfde frets één keer); niet in pgCache: de lijst verandert.
   Voicingsoort 'fav' (S.pType of S.pTypes[i].t) = de voice leading kiest alleen uit deze vormen; heeft de akkoordsoort er geen, dan de gewone soort (x.nofav) */
function pgFavs(c){const ts=new Set(S.favs.filter(f=>f.q===c.q).map(f=>f.t)),seen=new Set();
  return VTYPES.filter(t=>ts.has(t)).flatMap(t=>pgVoicings(c,t).filter(v=>isFav(c,v))).filter(v=>!seen.has(v.key)&&seen.add(v.key));}
const pgTName=t=>t==='fav'?T.favType:T.types[t];
const pgTypes=()=>VTYPES.map(t=>[t,T.types[t]]).concat([['fav',T.favType]]);
const pgQ=c=>QUAL[c.q].sym||T.major;
const pgTop=v=>v.notes[v.notes.length-1];
const pgBassPc=c=>c.bassPc!=null?c.bassPc:c.rootPc;
const pgLab=(c,x)=>ivName(mod(x.pc-c.rootPc,12),c.q);

/* ── tekst lezen ── spaties tussen akkoorden, | = nieuwe regel, duur achter het akkoord: Cmaj7(2), G7:½, D7*2; % = nog eens */
function pgParse(txt){const list=[],bad=[],approx=[];
  String(txt||'').split('|').forEach((sec,si)=>sec.split(/\s+/).filter(Boolean).forEach(tok=>{
    if(list.length>=PG_MAX)return;
    let t=tok,bars=1;const bm=/(?:\((½|1\/2|0?\.5|\d)\)|[:*](½|1\/2|0?\.5|\d))$/.exec(t);
    if(bm){const x=bm[1]||bm[2];bars=/½|\/|\./.test(x)?.5:Math.min(4,Math.max(1,+x||1));t=t.slice(0,bm.index);}
    if(t==='%'){if(list.length)list.push({c:list[list.length-1].c,bars,sec:si});return;}
    let c=parseChord(t);
    if(!c){for(const[rx,to]of PG_SIMPLER)if(rx.test(t)){c=parseChord(t.replace(rx,to));if(c){approx.push(t+' → '+c.sym);break;}}}
    if(c)list.push({c,bars,sec:si});else bad.push(tok);}));
  return{list,bad,approx};}
/* melodie: één noot per akkoord, - = vrij */
function pgMelody(txt){const out=[],bad=[];
  String(txt||'').split(/\s+/).filter(Boolean).forEach(t=>{if(/^[-_.x]$/i.test(t)){out.push(null);return;}
    const n=parseNote(t[0].toUpperCase()+t.slice(1));if(n)out.push(nPc(n));else{out.push(null);bad.push(t);}});
  return{list:out,bad};}
/* progressies uit de Scale Trainer (alleen lezen, nooit schrijven): {name, tempo, sections:[{chords:[{sym, bars}]}]} */
function pgStProgs(){const s=read('toonladderTrainer:v1'),ps=s&&Array.isArray(s.progs)?s.progs:[];
  const bt=b=>b===.5?'(½)':[2,3,4].includes(b)?'('+b+')':'';
  return ps.filter(p=>p&&typeof p==='object'&&Array.isArray(p.sections)).map(p=>({
    name:typeof p.name==='string'&&p.name.trim()?p.name.slice(0,60):'Untitled',tempo:+p.tempo,
    text:p.sections.map(sec=>(sec&&Array.isArray(sec.chords)?sec.chords:[]).filter(c=>c&&typeof c.sym==='string'&&c.sym)
      .map(c=>c.sym.replace(/\s+/g,'')+bt(+c.bars)).join(' ')).filter(Boolean).join(' | ')})).filter(p=>p.text);}

/* ── kosten ── pgDist = stemstappen in halve tonen, stemmen van boven naar beneden gepaard (een extra slash-bas telt niet mee) */
function pgDist(a,b){const A=a.notes,B=b.notes,m=Math.min(A.length,B.length);let d=0;
  for(let j=1;j<=m;j++)d+=Math.abs(A[A.length-j].midi-B[B.length-j].midi);return d;}
/* per noot van b: hoeveel halve tonen hij verschoof t.o.v. dezelfde stem in a (null = nieuwe stem) */
function pgMotion(a,b){const A=a.notes,B=b.notes,out=B.map(()=>null);
  for(let j=1;j<=Math.min(A.length,B.length);j++)out[B.length-j]=B[B.length-j].midi-A[A.length-j].midi;return out;}
/* vorm ligt op snarenset set (een slash-bas op een lagere snaar mag erbij) */
const pgOnSet=(v,set)=>v.strs===set||v.strs.length===set.length+1&&v.strs.endsWith(set);
function pgCosts(set){const m=S.pMode;
  const un=(v,x)=>{let k=0;
    if(x.bsPc!=null){if(v.notes[0].pc!==x.bsPc)k+=PG_STEPK;}                  /* baslijn Stepwise: de laagste noot volgt de lijn waar dat kan */
    else if(v.notes[0].pc!==pgBassPc(x.c)&&v.type!=='rootless')k+=v.type==='shell'||v.type==='barre'?1.2:.25;   /* omkeringen zijn prima, grondtoon onderin iets beter */
    if(m==='pos')k+=(Math.max(0,S.pPos-1-v.lo)+Math.max(0,v.hi-S.pPos-4))*3+Math.abs(v.center-S.pPos-1.5)*.15;
    else k+=Math.abs(v.center-6)*.04+Math.abs(v.notes.reduce((a,n)=>a+n.midi,0)/v.notes.length-60)*.06;   /* zonder voorkeur: midden op de hals, niet te laag (modderig) */
    if(set&&!pgOnSet(v,set))k+=6;
    if(x.mel!=null&&pgTop(v).pc!==x.mel)k+=6;
    return k;};
  const pr=(a,b)=>{let k=Math.abs(a.center-b.center)*(m==='strings'?.25:.45)+pgDist(a,b)*.3;
    if(a.strs!==b.strs&&m!=='strings')k+=.4;
    if(m==='top')k+=Math.abs(pgTop(a).midi-pgTop(b).midi)*.8;
    return k;};
  return{un,pr};}
/* Viterbi: X = akkoorden met kandidaten (een vergrendeld akkoord heeft er één) → goedkoopste rij */
function pgViterbi(X,un,pr){const C=X.map(x=>x.lock?[x.lock]:x.vs);
  let cost=C[0].map(v=>un(v,X[0]));const back=[];
  for(let i=1;i<C.length;i++){const nc=[],bk=[];
    C[i].forEach(v=>{let best=1e9,bi=0;C[i-1].forEach((u,j)=>{const k=cost[j]+pr(u,v);if(k<best){best=k;bi=j;}});nc.push(best+un(v,X[i]));bk.push(bi);});
    cost=nc;back.push(bk);}
  let j=cost.indexOf(Math.min(...cost));const tot=cost[j],path=[C[C.length-1][j]];
  for(let i=C.length-2;i>=0;i--){j=back[i][j];path.unshift(C[i][j]);}
  return{path,tot};}

/* ── filters (strook "Strings & filters", S.pgF): beperken welke vormen de voice leading mag kiezen.
   str = snarenset (een slash-bas eronder mag), inv = omkering 0–3 (slash-akkoorden en "9 in bass" vallen erbuiten),
   top = soort topnoot: R, 3 (ook 2 en 4 van sus), 5, 7 (ook 6), x = kleurnoot. Past geen enkele vorm van een akkoord,
   dan houdt dat akkoord alle vormen (x.nofit, ≠ op de kaart); een vastgezette vorm blijft altijd staan. ── */
const pgDeg=l=>l==='R'?'R':/^[♭♯]?3$|^[24]$/.test(l)?'3':/^[♭♯]?5$/.test(l)?'5':/^[♭♯]?7$|^6$/.test(l)?'7':'x';
const pgFOn=()=>S.pgF.str!=='all'||S.pgF.inv!=='all'||S.pgF.top!=='all';
const pgPass=v=>{const F=S.pgF;return(F.str==='all'||pgOnSet(v,F.str))&&(F.inv==='all'||v.inv===+F.inv)&&(F.top==='all'||pgDeg(v.top)===F.top);};
const PG_LINE='walk';   /* de band speelt altijd een walking bass (S.pLine/S.pBNeck blijven bewaard maar worden niet meer gelezen) */

/* ── afleiden: S → PG = {list (alle akkoorden), ok (met vorm), bad, approx, melBad, sets, set, costs, stats}
   per akkoord: all = alle vormen van zijn soort, vs = na de filters (de kandidaten) ── */
function pgDerive(){const P=pgParse(S.pText),M=pgMelody(S.pMel),fon=pgFOn();
  const list=P.list.map((x,i)=>{const o=S.pTypes[i],own=!!(o&&o.s===x.c.sym&&(VTYPES.includes(o.t)||o.t==='fav')),tp=own?o.t:S.pType;
    let all=tp==='fav'?pgFavs(x.c):pgVoicings(x.c,tp),fb=null,nofav=false;
    if(tp==='fav'&&!all.length){nofav=true;fb=own&&S.pType!=='fav'?S.pType:PG_FB[0];all=pgVoicings(x.c,fb);}   /* geen favorieten: de gewone soort */
    if(!all.length)for(const t of PG_FB){if(t===tp||t===fb)continue;const w=pgVoicings(x.c,t);if(w.length){all=w;fb=t;break;}}
    const fv=fon?all.filter(pgPass):all,nofit=fon&&!!all.length&&!fv.length,vs=nofit?all:fv;
    const L=S.pLock[i],lock=L&&L.s===x.c.sym?pgFindLock(x.c,tp,L):null;
    return Object.assign({},x,{i,tp,own,all,vs,fb,nofav,nofit,lock,held:!!(lock&&L.h),mel:S.pMode==='top'&&M.list[i]!=null?M.list[i]:null,v:null,mv:null,bsPc:null,bl:null});});
  const ok=list.filter(x=>x.vs.length||x.lock);
  /* snarensets: hoeveel akkoorden er een vorm op hebben, vóór de filters (voor de knoppen en voor "Same strings") */
  const cnt=new Map();
  ok.forEach(x=>{const s=new Set();x.all.forEach(v=>{s.add(v.strs);if(x.c.bassPc!=null)s.add(v.strs.slice(1));});s.forEach(k=>cnt.set(k,(cnt.get(k)||0)+1));});
  const top=Math.max(0,...cnt.values()),sets=[...cnt.keys()].filter(k=>cnt.get(k)>=Math.max(1,top/2)&&k.length>=3)
    .sort((a,b)=>cnt.get(b)-cnt.get(a)||b.length-a.length||(a<b?1:-1)).slice(0,8);
  let set=null,res=null,costs=pgCosts(null);
  if(ok.length){
    /* Same strings: met een snarenset in de filters is dat de set, anders de beste */
    if(S.pMode==='strings'){const tries=S.pgF.str!=='all'?[S.pgF.str]:sets;
      tries.forEach(s=>{const cs=pgCosts(s),r=pgViterbi(ok,cs.un,cs.pr);if(!res||r.tot<res.tot){res=r;set=s;costs=cs;}});}
    if(!res)res=pgViterbi(ok,costs.un,costs.pr);
    ok.forEach((x,k)=>{x.v=res.path[k];x.mv=k?pgMotion(ok[k-1].v,x.v):x.v.notes.map(()=>null);});
    const BL=bsLines(ok,PG_LINE);ok.forEach((x,k)=>{x.bl=BL[k];});}
  let st=0,ct=0,fr=0;
  for(let k=1;k<ok.length;k++){const a=ok[k-1].v,b=ok[k].v;st+=pgDist(a,b);fr+=Math.abs(Math.round(b.center-a.center));ct+=ok[k].mv.filter(d=>d===0).length;}
  PG={list,ok,bad:P.bad,approx:P.approx,melBad:M.bad,sets,set,costs,stats:{st,ct,fr}};
  if(PGSEL>=list.length)PGSEL=Math.max(0,list.length-1);
  PGSET=new Set([...PGSET].filter(i=>i<list.length));if(!PGSET.has(PGSEL))PGSET=new Set([PGSEL]);if(PGANC>=list.length)PGANC=PGSEL;}
/* een vastgelegde vorm terugvinden: eerst in de soort waarin hij gekozen is, dan in de soort van het akkoord, dan overal */
function pgFindLock(c,tp,L){for(const t of[L.t,tp,...VTYPES]){if(!VTYPES.includes(t))continue;const v=pgVoicings(c,t).find(w=>w.key===L.k);if(v)return v;}return null;}

/* ── scherm ── */
const pgCls=x=>(v,n)=>{const j=v.notes.indexOf(n),l=pgLab(x.c,n);return(PG_GUIDE.includes(l)?' gt':'')+(x.mv&&x.mv[j]===0?' hd':'');};
function pgArrow(d){return d==null?'':d===0?'<small class="mvh" aria-label="held">•</small>':'<small class="mv">'+(d>0?'↑':'↓')+Math.abs(d)+'</small>';}
function pgCard(x){const c=x.c,v=x.v,on=x.i===PGSEL,sel=PGSET.has(x.i),head='<div class="pgh"><b>'+esc(c.sym)+'</b>'+
    (x.bars!==1?'<span class="cap">'+esc(T.pg.bars(x.bars))+'</span>':'')+(v&&isFav(c,v)?'<span class="pgfv" title="'+esc(T.pg.isFav)+'" aria-label="'+esc(T.pg.isFav)+'">★</span>':'')+(v?pgLkBtn(x):'')+'</div>';
  const cl=(on?' on':'')+(sel?' sel':'');
  if(!v)return'<div class="pgc none'+cl+'" data-i="'+x.i+'">'+head+'<p class="note">'+esc(T.pg.noShape)+'</p></div>';
  const cls=pgCls(x),vo=v.notes.map((n,j)=>({n,d:x.mv[j]})).reverse(),tp=v.type!==S.pType||x.tp==='fav'?T.types[v.type]:'';
  return'<div class="pgc'+cl+(x.lock?x.held?' hl':' lk':'')+'" data-i="'+x.i+'">'+head+
    '<button type="button" class="pgdg" data-i="'+x.i+'" aria-pressed="'+sel+'" aria-label="'+esc(T.pg.cardL(c.sym,fretTxt(v)))+'" title="'+esc(fretTxt(v))+'">'+diagram(c,v,null,n=>cls(v,n))+'</button>'+
    '<p class="cap pgi">'+(x.nofav&&!x.lock?'<b class="pgnf" title="'+esc(T.pg.noFav(pgQ(c),T.types[x.fb]))+'">'+esc(T.pg.noFavS)+'</b> ':'')+(x.nofit&&!x.lock?'<b class="pgnf" title="'+esc(T.pg.noFit)+'">≠</b> ':'')+(tp?'<b class="pgt">'+esc(tp)+'</b> · ':'')+esc(invTxt(v,true))+' · '+esc([...v.strs].join(''))+'</p>'+
    '<ol class="pgv">'+vo.map(o=>{const l=pgLab(c,o.n);return'<li><b class="'+(PG_GUIDE.includes(l)?'gt':'')+'" title="'+esc(toneName(c,o.n.pc))+'">'+esc(l)+'</b>'+pgArrow(o.d)+'</li>';}).join('')+'</ol>'+
    pgBassRow(x)+'</div>';}
/* slotje op de kaart: vrij (verschijnt bij hover), vastgehouden (punaise) of gelockt */
const pgState=x=>!x.lock?'free':x.held?'held':'lock';
function pgLkBtn(x){const st=pgState(x),l=T.pg.lkL[st](x.c.sym);
  return'<button type="button" class="pglk '+st+'" data-lk="'+x.i+'" aria-pressed="'+(st==='lock')+'" aria-label="'+esc(l)+'" title="'+esc(l)+'">'+(st==='held'?ICON.pin:ICON.lock)+'</button>';}
/* de baslijn onder het diagram: noot + interval t.o.v. het akkoord; oranje = naderingsnoot */
function pgBassRow(x){const L=bsShow(x.bl);if(!L.length)return'';
  return'<p class="pgb" aria-label="'+esc(T.pg.bassL(L.map(e=>e.name).join(' ')))+'">'+L.map((e,j)=>'<span class="bn'+(e.ap?' ap':'')+'" data-bk="'+x.i+'-'+j+'"'+
    (e.ap?' title="'+esc(T.pg.apTo(e.ap.kind,e.ap.to))+'"':'')+'><b>'+esc(e.name)+'</b><small>'+esc(e.lab)+'</small></span>').join('')+'</p>';}
function pgRender(){pgDerive();const P=PG,inp=$('#pgIn'),mel=$('#pgMel');
  if(document.activeElement!==inp)inp.value=S.pText;if(document.activeElement!==mel)mel.value=S.pMel;pgGrow();
  $('#pgErr').textContent=P.bad.length?T.pg.bad(P.bad):'';$('#pgApprox').textContent=P.approx.length?T.pg.approx(P.approx):'';$('#pgApprox').hidden=!P.approx.length;
  $('#pgMelErr').textContent=P.melBad.length?T.pg.badMel(P.melBad):'';
  const st=pgStProgs(),sel=$('#pgSt');sel.hidden=!st.length;
  if(st.length)sel.innerHTML='<option value="">'+esc(T.pg.st)+'</option>'+st.map((p,i)=>'<option value="'+i+'">'+esc(p.name)+'</option>').join('');
  seg($('#pgType'),pgTypes(),S.pType,'pgtype');
  seg($('#pgMode'),PG_MODES.map(m=>[m,T.pg.mode[m]]),S.pMode,'pgmode');
  $('#pgModeHelp').textContent=T.pg.modeHelp[S.pMode];
  $('#pgPosRow').hidden=S.pMode!=='pos';$('#pgMelRow').hidden=S.pMode!=='top';
  $('#pgPos').value=S.pPos;
  pgRenderStrip();
  seg($('#segLab'),Object.entries(T.lab),S.labels,'lab');   /* Labels staat in de kolom (gedeeld met de Finder) */
  seg($('#pgStyle'),PG_STYLES.map(k=>[k,T.pg.style[k]]),S.pStyle,'pgstyle');$('#pgDrums').checked=S.pDrums;
  document.querySelectorAll('#pgMix input').forEach(el=>{el.value=S.pVol[el.dataset.vol];});
  $('#pgTempo').value=S.pTempo;$('#pgBpm').textContent=T.pg.bpm(S.pTempo);$('#pgLoop').checked=S.pLoop;$('#pgBass').checked=S.bass;
  pgRenderBar();
  $('#pgSum').textContent=P.ok.length>1?T.pg.sumS(P.stats.st,P.stats.ct):'';$('#pgSum').title=P.ok.length>1?T.pg.sum(P.stats.st,P.stats.ct,P.stats.fr):'';   /* kort op de plank, alles in de tooltip */
  /* één rij per regel van de invoer */
  const secs=[];P.list.forEach(x=>{if(!secs.length||secs[secs.length-1].sec!==x.sec)secs.push({sec:x.sec,xs:[]});secs[secs.length-1].xs.push(x);});
  $('#pgRows').innerHTML=!P.list.length?'<p class="note pgempty">'+esc(T.pg.empty)+'</p>':secs.map(s=>'<div class="pgrow">'+s.xs.map(pgCard).join('')+'</div>').join('');
  $('#pgLegend').hidden=!P.ok.length;
  pgMark(PGP&&!PGP.loading?PGP.cur:-1);
  pgRenderSel();pgRenderModal();pgTransport();pgFit();}
/* De kaarten passen op het scherm (de pagina scrolt niet, net als Find voicings): pgFit() zoekt de grootste schaal (--fit, PG_FIT_MIN–1 maal
   "Diagram size") waarbij alle regels in het vak #pgRows passen; groter dan "Diagram size" worden ze niet. Past het ook op PG_FIT_MIN niet,
   dan scrolt alleen het vak met de kaarten. Opnieuw bij elke weergave en bij een ander venster of kolom (refit() in ui.js). */
const PG_FIT_MIN=.56;
function pgFit(){const g=$('#pgRows');if(!g||!g.offsetParent)return;
  g.style.overflow='hidden';   /* tijdens het meten geen schuifbalk (die verandert de breedte) */
  const fits=f=>{g.style.setProperty('--fit',f);return g.scrollHeight<=g.clientHeight+1;};
  if(!fits(1)&&fits(PG_FIT_MIN)){let lo=PG_FIT_MIN,hi=1;for(let i=0;i<7;i++){const m=(lo+hi)/2;if(fits(m))lo=m;else hi=m;}g.style.setProperty('--fit',lo);}
  g.style.overflow='';}
/* invoerveld zo hoog als de tekst (één regel als het past) */
function pgGrow(){const t=$('#pgIn');if(!t.offsetParent)return;t.style.height='auto';t.style.height=t.scrollHeight+2+'px';}
/* strook "Strings & filters" (zelfde onderdeel als in Find voicings, stripRender in render.js) */
function pgRenderStrip(){const F=S.pgF,sets=PG.sets.includes(F.str)||F.str==='all'?PG.sets:PG.sets.concat([F.str]);
  const sum=[F.str!=='all'&&F.str,F.inv!=='all'&&T.invShort[+F.inv],F.top!=='all'&&T.topIs(T.topDeg[F.top])].filter(Boolean).join(' · ');
  stripRender('fsProg',[
    {k:'str',l:T.strL,cur:F.str,items:[['all',T.all],...sets.slice().sort(sortSets).map(k=>[k,[...k].join(' ')])]},
    {k:'inv',l:T.fInv,cur:F.inv,items:[['all',T.any],...T.invShort.map((l,i)=>[String(i),l])]},
    {k:'top',l:T.topL,cur:F.top,items:[['all',T.any],...PG_TOPS.map(k=>[k,T.topDeg[k],null,T.topDegL[k]])]}],
    '<span class="help l fsh" tabindex="0" aria-label="About the filters">?<i>'+esc(T.fHelpP)+'</i></span>',sum);}
/* balk boven de kaarten: alles selecteren, vastgehouden akkoorden loslaten, alle locks weg */
function pgRenderBar(){const L=PG.list,nh=L.filter(x=>x.held).length,nl=L.filter(x=>x.lock&&!x.held).length;
  $('#pgSelAll').disabled=L.length<2;$('#pgKept').textContent=T.pg.keptN(nh);$('#pgRefitAll').disabled=!nh;$('#pgRefitAll').title=T.pg.releaseL;
  $('#pgLocked').textContent=T.pg.lockedN(nl);$('#pgUnlock').disabled=!nl&&!nh;$('#pgUnlock').title=T.pg.unlockAll(nl+nh);}
const pgSel=()=>[...PGSET].filter(i=>PG.list[i]).sort((a,b)=>a-b);
/* meer akkoorden geselecteerd (Ctrl/Shift-klik): Lock, Re-fit en een voicingsoort voor de hele selectie, op de transportplank */
function pgRenderSel(){const xs=pgSel().map(i=>PG.list[i]),multi=xs.length>1,wv=xs.filter(y=>y.v);
  $('#pgSelBar').hidden=!multi;$('#pgSum').hidden=multi;
  seg($('#pgFit'),Object.entries(T.pg.fit),S.pFit,'pgfit');$('#pgFitHelp').textContent=Object.values(T.pg.fitHelp).join(' ');
  if(!multi)return;
  const cnt={free:0,held:0,lock:0};wv.forEach(y=>cnt[pgState(y)]++);
  $('#pgSelN').textContent=T.pg.selBar(xs.length);$('#pgSelN').title=xs.map(y=>y.c.sym).join('  ')+(wv.length?' · '+T.pg.stateN(cnt):'');
  const allL=wv.length&&wv.every(y=>pgState(y)==='lock'),lb=$('#pgSLock');
  lb.innerHTML=ICON.lock+'<span>'+esc(allL?T.pg.unlock:T.pg.lock)+'</span>';lb.disabled=!wv.length;lb.setAttribute('aria-pressed',!!allL);
  $('#pgSRefit').innerHTML=ICON.refit+'<span>'+esc(T.pg.refit)+'</span>';$('#pgSRefit').disabled=!wv.length;$('#pgSRefit').title=T.pg.refitL;
  /* eigen soort: gekozen als de hele selectie dezelfde heeft */
  const own=xs.every(y=>!y.own)?'def':xs.every(y=>y.own&&y.tp===xs[0].tp)?xs[0].tp:'';
  $('#pgSType').innerHTML='<option value="" disabled'+(own?'':' selected')+'>'+esc(T.pg.typeAll)+'…</option>'+
    [['def',T.pg.typeDef(pgTName(S.pType))],...pgTypes()].map(([v,l])=>'<option value="'+v+'"'+(v===own?' selected':'')+'>'+esc(l)+'</option>').join('');}

/* ── venster "choose a shape": alle vormen van één akkoord (alle vormen van zijn soort, ook buiten de filters),
   per omkering een rij, tabjes per snarenset. PGM = {i: volgnummer, str: tabje ('all' of snarenset), order: keys op het scherm} of null.
   Klik = die vorm kiezen (vastzetten, zoals voorheen in het zijpaneel); de andere akkoorden passen zich aan of blijven staan (S.pFit). ── */
let PGM=null;
function pgOpen(i){const x=PG.list[i];if(!x)return;
  if(!(PGSET.size===1&&PGSEL===i))pgSelect(i,false,'one');
  const was=PGM;PGM={i,str:'all',order:[]};
  if(was&&was.str!=='all'&&x.all.some(v=>v.strs===was.str))PGM.str=was.str;   /* volgend akkoord: hetzelfde tabje als dat bestaat */
  else if(!was&&S.pgF.str!=='all'&&x.all.some(v=>v.strs===S.pgF.str))PGM.str=S.pgF.str;
  pgRenderModal();if(!was)$('#pgModal .pgm').focus();}
function pgClose(){if(!PGM)return;const i=PGM.i;PGM=null;$('#pgModal').hidden=true;
  const c=document.querySelector('#pgRows .pgc[data-i="'+i+'"] .pgdg');if(c)c.focus();}
function pgRenderModal(){const box=$('#pgModal');if(!PGM){box.hidden=true;return;}
  const x=PG.list[PGM.i];if(!x){pgClose();return;}
  box.hidden=false;
  const k=PG.ok.indexOf(x),a=k>0?PG.ok[k-1]:null,b=k>=0?PG.ok[k+1]:null,n=PG.list.length;
  $('#pgMH').innerHTML='<b>'+esc(x.c.sym)+'</b> <span>· '+esc(T.pg.mH)+'</span>';
  $('#pgMPrev').disabled=PGM.i<=0;$('#pgMNext').disabled=PGM.i>=n-1;
  $('#pgMSub').textContent=T.pg.chordN(x.i+1,n)+(x.bars!==1?' · '+T.pg.bars(x.bars):'')+(x.v?' · '+T.frets+' '+fretTxt(x.v):'');
  const st=x.v?pgState(x):'';$('#pgMState').textContent=x.v?T.pg.state[st]:T.pg.noShape;$('#pgMState').className='note pgst '+st;
  const pb=$('#pgMPlay');pb.disabled=!x.v;pb.innerHTML=ICON.play+'<span>'+esc(T.pg.hear)+'</span>';
  const lb=$('#pgMLock');lb.disabled=!x.v;lb.setAttribute('aria-pressed',st==='lock');lb.innerHTML=ICON.lock+'<span>'+esc(st==='lock'?T.pg.unlock:T.pg.lock)+'</span>';
  $('#pgMRefit').disabled=!x.v;$('#pgMRefit').innerHTML=ICON.refit+'<span>'+esc(T.pg.refit)+'</span>';$('#pgMRefit').title=T.pg.refitL;
  const nh=PG.list.filter(y=>y.held).length,rb=$('#pgMRel');rb.hidden=!nh;rb.innerHTML=ICON.pin+'<span>'+esc(T.pg.release(nh))+'</span>';rb.title=T.pg.releaseL;
  seg($('#pgMType'),[['def',T.pg.typeDef(pgTName(S.pType))],...pgTypes()],x.own?x.tp:'def','pgmtype');
  /* alle vormen van de soort; een vastgezette vorm uit een andere soort hoort er ook bij. Bovenaan een rij ★ = de favorieten van dit akkoord
     (elke voicingsoort), behalve als het akkoord al uit de favorieten kiest (dan zijn de rijen eronder dat al) */
  const base=x.v&&!x.all.includes(x.v)?[x.v].concat(x.all):x.all,fl=x.tp!=='fav'||x.nofav?pgFavs(x.c):[];
  const sk=new Set(),all=fl.concat(base).filter(v=>{const k=v.type+'|'+v.key;return!sk.has(k)&&sk.add(k);}),cnt=new Map();all.forEach(v=>cnt.set(v.strs,(cnt.get(v.strs)||0)+1));
  if(PGM.str!=='all'&&!cnt.has(PGM.str))PGM.str='all';
  seg($('#pgMStr'),[['all',T.all+' · '+all.length],...[...cnt.keys()].sort(sortSets).map(s=>[s,s+' · '+cnt.get(s)])],PGM.str,'mstr');
  const inS=v=>PGM.str==='all'||v.strs===PGM.str,vs=base.filter(inS),fon=pgFOn();
  const rows=[{r:'fav',vs:fl.filter(inS)}].concat([0,1,2,3,null].map(r=>({r,vs:vs.filter(v=>v.inv===r)}))).filter(o=>o.vs.length);
  PGM.tl=[];PGM.order=[...new Set(rows.flatMap(o=>o.vs.map(v=>v.key)))];
  const tile=v=>{const on=v===x.v,hd=a&&a.v?pgMotion(a.v,v):null,mv=(a&&a.v?pgDist(a.v,v):0)+(b&&b.v?pgDist(v,b.v):0);
    const cls=nn=>{const j=v.notes.indexOf(nn);return(PG_GUIDE.includes(pgLab(x.c,nn))?' gt':'')+(hd&&hd[j]===0?' hd':'');};
    const fv=isFav(x.c,v),fz=fv?T.favOn:T.favOff;PGM.tl.push(v);
    return'<div class="dgw"><button type="button" class="dg mc'+(on?' on':'')+(fon&&!pgPass(v)?' nf':'')+'" data-k="'+v.key+'" aria-pressed="'+on+'" aria-label="'+esc(T.shapeBtn(x.c.sym+', '+invTxt(v),fretTxt(v)))+'" title="'+esc(fretTxt(v))+'">'+
      (on?'<span class="cur">'+(st==='lock'?ICON.lock:st==='held'?ICON.pin:'')+esc(T.pg.cur)+'</span>':'')+diagram(x.c,v,null,cls)+
      '<span class="cp">'+esc(v.strs)+' · '+esc(T.topIs(v.top))+((a&&a.v)||(b&&b.v)?' · <span title="'+esc(T.pg.movesL(mv))+'">'+esc(T.pg.moves(mv))+'</span>':'')+'</span></button>'+
      '<button type="button" class="fav'+(fv?' on':'')+'" data-fx="'+(PGM.tl.length-1)+'" aria-pressed="'+fv+'" aria-label="'+esc(fz)+'" title="'+esc(fz)+'">★</button></div>';};
  const rt=r=>r==='fav'?'<span><span class="gst" aria-hidden="true">★</span> '+esc(T.favT)+'</span>':esc(r!=null?T.inv[r]:T.other);
  $('#pgMBody').innerHTML=(x.nofav?'<p class="note pgnfm">'+esc(T.pg.noFavM(pgQ(x.c),T.types[x.fb]))+'</p>':'')+
    (!rows.length?'<p class="note">'+esc(T.pg.noShape)+'</p>':rows.map(o=>'<div class="pgmr'+(o.r==='fav'?' gfav':'')+'"><h3 class="px">'+rt(o.r)+' <small>'+o.vs.length+'</small></h3><div class="pgmd">'+o.vs.map(tile).join('')+'</div></div>').join(''));
  pgMFit();}
/* zo groot als past: schaal --mf (0,7–1,45 × Diagram size) zolang alle rijen in het venster passen; anders scrolt het venster zelf.
   Rijen onder elkaar of in twee kolommen naast elkaar (.two): wat de grootste diagrammen geeft */
function pgMFit(){const g=$('#pgMBody');g.style.overflow='hidden';
  const fits=f=>{g.style.setProperty('--mf',f);return g.scrollHeight<=g.clientHeight+1;};
  const best=()=>{if(fits(1.45))return 1.45;let lo=.7,hi=1.45;if(!fits(lo))return lo;for(let k=0;k<7;k++){const m=(lo+hi)/2;if(fits(m))lo=m;else hi=m;}return lo;};
  g.classList.remove('two');let r=best();
  if(r<1.45&&g.querySelectorAll('.pgmr').length>1){g.classList.add('two');const r2=best();if(r2>r+.02)r=r2;else g.classList.remove('two');}
  g.style.setProperty('--mf',r);g.style.overflow='';}
/* een vorm uit het venster kiezen (klik of ← →): horen, en vastzetten als hij nog niet vast staat */
function pgMPick(key){const x=PGM&&PG.list[PGM.i];if(!x)return;const v=x.v&&x.v.key===key?x.v:(PGM.tl||[]).find(w=>w.key===key);if(!v)return;
  playShape(x.c,v);logChord(x.c.sym);if(v===x.v&&pgState(x)==='lock')return;pgDo('pick',v,[x.i]);}
/* selecteren: how = 'one' (gewone klik), 'toggle' (Ctrl/Cmd), 'range' (Shift) */
function pgSelect(i,play,how){if(!PG.list[i])return;
  if(how==='toggle'){if(PGSET.has(i)&&PGSET.size>1){PGSET.delete(i);if(PGSEL===i)PGSEL=pgSel()[0];}else{PGSET.add(i);PGSEL=i;}PGANC=i;}
  else if(how==='range'){const a=Math.min(PGANC,i),b=Math.max(PGANC,i);PGSET=new Set();for(let k=a;k<=b;k++)PGSET.add(k);PGSEL=i;}
  else if(how!=='keep'){PGSET=new Set([i]);PGSEL=i;PGANC=i;}
  document.querySelectorAll('#pgRows .pgc').forEach(el=>{const k=+el.dataset.i,s=PGSET.has(k);el.classList.toggle('on',k===PGSEL);el.classList.toggle('sel',s);
    const b=el.querySelector('.pgdg');if(b)b.setAttribute('aria-pressed',s);});
  pgRenderSel();const x=PG.list[PGSEL];if(play&&x.v){playShape(x.c,x.v);logChord(x.c.sym);}}
function pgSet(fn){fn();act();save();pgRender();}
/* ── vastleggen en opnieuw berekenen ──
   pgHold: alle akkoorden die nu vrij zijn (behalve skip) vasthouden zoals ze staan, zodat alleen skip verandert. */
const pgLk=(x,v,h)=>Object.assign({s:x.c.sym,k:v.key,t:v.type},h?{h:1}:{});
function pgHold(skip){PG.ok.forEach(y=>{if(y.v&&!y.lock&&!skip.includes(y.i))S.pLock[y.i]=pgLk(y,y.v,true);});}
const pgDropHolds=()=>Object.keys(S.pLock).forEach(i=>{if(S.pLock[i].h)delete S.pLock[i];});
function pgDo(kind,arg,idx){const sel=idx||pgSel(),xs=sel.map(i=>PG.list[i]).filter(y=>y&&y.v),keep=S.pFit==='keep';
  pgSet(()=>{
    if(kind==='pick'){const x=PG.list[sel[0]];if(keep)pgHold([x.i]);S.pLock[x.i]=pgLk(x,arg);}
    else if(kind==='lock')xs.forEach(y=>{S.pLock[y.i]=pgLk(y,y.v);});
    else if(kind==='unlock')sel.forEach(i=>{delete S.pLock[i];});                   /* alleen de lock eraf; de andere akkoorden niet vasthouden */
    else if(kind==='release')sel.forEach(i=>{if(S.pLock[i]&&S.pLock[i].h)delete S.pLock[i];});
    else if(kind==='refit'){pgHold(sel);sel.forEach(i=>{delete S.pLock[i];});}       /* alleen de selectie opnieuw, de rest blijft staan */
    else if(kind==='type'){if(keep)pgHold(sel);
      sel.forEach(i=>{const y=PG.list[i];if(arg==='def')delete S.pTypes[i];else S.pTypes[i]={s:y.c.sym,t:arg};delete S.pLock[i];});}
    else if(kind==='refitAll')pgDropHolds();
    else if(kind==='unlockAll')S.pLock={};});}
/* lock aan/uit voor de selectie (of één akkoord): alles gelockt → los, anders vastzetten */
function pgToggleLock(idx){const xs=(idx||pgSel()).map(i=>PG.list[i]).filter(y=>y&&y.v);if(!xs.length)return;
  pgDo(xs.every(y=>pgState(y)==='lock')?'unlock':'lock',null,idx);}

/* ── afspelen met band: piano speelt de gekozen vormen (comping-ritme per stijl), bas de baslijn (bass.js), drums optioneel.
   Plant per akkoord vooruit (een stukje voor het begint), zodat tempo, stijl en gekozen vormen meteen meeveranderen
   (zoals sched() in Chord Moves). Ritmes en drumpatronen vereenvoudigd uit toonladder/backing.js: geen fills, geen arrangement. ── */
const PG_STYLES=['swing','bossa','straight'];
const PG_SWING=2/3;                                     /* swing: de "en" valt op 2/3 van de tel */
/* pianoritme per maat (4) en per halve maat (2): [positie in tellen, lengte in tellen]; x.5 = de "en" */
const PG_COMP={
  swing:{4:[[[0,1.4],[1.5,.4]],[[1,.4],[3,.4]],[[0,.4],[1.5,1.6]],[[0,1.8],[2.5,.4]],[[1.5,.4],[3,.9]],[[0,.9],[2,.4],[3.5,.4]]],
         2:[[[0,.9]],[[1,.4]],[[0,.4],[1.5,.4]]]},
  bossa:{4:[[[0,.45],[1,.45],[2.5,1.2]],[[0,.45],[1.5,.45],[3,.9]],[[0,1.4],[1.5,1.9]],[[0,.45],[2,.45],[2.5,1.2]]],
         2:[[[0,.45],[1,.9]],[[0,1.4]]]},
  straight:{4:[[[0,1.8],[2,1.8]],[[0,.9],[1.5,.4],[2,1.8]],[[0,1.4],[1.5,2.4]],[[0,.9],[2.5,1.4]]],
         2:[[[0,1.8]],[[0,.9],[1.5,.4]]]}};
const pgRnd=(a,b)=>a+Math.random()*(b-a);
function pgComp(st,n,p){const P=PG_COMP[st],hits=[];
  for(let off=0;off<n;){const len=n-off>=4?4:2,opts=P[len].filter(x=>x!==p.last),pat=opts[Math.floor(Math.random()*opts.length)];p.last=pat;
    pat.forEach(([b,l])=>hits.push({b:off+b,len:l,v:pgRnd(64,76)+(b===0&&off===0?4:0)}));off+=len;}
  return hits;}
/* één tel drums (beat = tel sinds de start; t = tijd van de tel, te = tijd van de "en") */
const PG_BOSSA={ride:[81,54,68,73,80,54,67,74],kick:{0:101,3:111,4:122,7:82},clave:[[0,3,6],[2,5]]};
function pgDrumBeat(st,beat,t,te,bus){const b=beat%4,h=()=>pgRnd(-.003,.003);
  if(st==='swing'){drum('ride',t+h(),[84,88,82,89][b]+pgRnd(-4,4),bus);
    if(b%2){drum('ride',te+h(),79+pgRnd(-5,3),bus);drum('pedal',t-.012,64,bus);}   /* "ding-a" en hi-hat op 2 en 4 */
    drum('kick',t,27+pgRnd(-3,3),bus);return;}                                      /* "feathering": heel zacht op elke tel */
  const bar=Math.floor(beat/4)%2;
  [[b*2,t],[b*2+1,te]].forEach(([e,tt])=>{
    if(st==='bossa'){drum('ride',tt+h(),PG_BOSSA.ride[e],bus);const k=PG_BOSSA.kick[e];if(k)drum('kick',tt,k,bus);
      if(PG_BOSSA.clave[bar].includes(e))drum('stick',tt,84,bus);if(e===2||e===6)drum('pedal',tt,43,bus);}
    else{drum('ride',tt+h(),(e%2?56:76)+pgRnd(-3,3),bus);if(e===0||e===4||e===5&&bar)drum('kick',tt,e===5?80:98,bus);}});
  if(st==='straight'&&b%2)drum('snare',t,74+pgRnd(-4,4),bus);}                     /* backbeat op 2 en 4 */
function pgPlay(){pgStop();if(!audio()||!PG||!PG.ok.length)return;
  const go=()=>{act();PGP={mix:chain(S.pVol),k:0,cur:-1,beat:0,last:null,t:actx.currentTime+.08,timers:[],iv:null};pgSched();PGP.iv=setInterval(pgSched,40);pgTransport();};
  const need=[];if(!SND&&window.BACKING_SOUNDS)need.push(loadSounds());if(S.pDrums&&hasDrums()&&!DRS)need.push(loadDrums());
  if(!need.length)go();else{PGP={loading:true,timers:[]};pgTransport();Promise.all(need).then(()=>{if(PGP&&PGP.loading){PGP=null;go();}});}}
function pgSched(){const p=PGP;if(!p||p.loading)return;
  while(p.t<actx.currentTime+.3){const L=PG.ok,N=L.length;if(!N){pgStop();return;}if(p.k>=N)p.k=0;
    const x=L[p.k],spb=60/S.pTempo,n=Math.max(2,Math.round(x.bars*4)),st=S.pStyle,sw=st==='swing'?PG_SWING:.5,t0=p.t,M=p.mix;
    const tb=b=>{const w=Math.floor(b+1e-6),f=b-w;return t0+(w+(Math.abs(f-.5)<.01?sw:f))*spb;};   /* tel → tijd, met swing op de "en" */
    pgComp(st,n,p).forEach(h=>{const ns=x.v.notes;ns.forEach((o,j)=>pianoNote(o.midi,tb(h.b)+j*.01,h.len*spb,h.v+(j===ns.length-1?4:0),M.piano));});
    if(S.bass&&x.bl)bsFeel(x.bl,st).forEach(e=>bassPlay(e.m,tb(e.b),e.len*spb*.95,e.v,M.bass));
    if(S.pDrums)for(let b=0;b<n;b++)pgDrumBeat(st,p.beat+b,tb(b),tb(b+.5),M.drums);
    const i=x.i,sym=x.c.sym,ms=t=>Math.max(0,(t-actx.currentTime)*1000);
    p.timers=p.timers.slice(-64);p.timers.push(setTimeout(()=>{if(PGP===p){p.cur=i;pgMark(i);act();logChord(sym);}},ms(t0)));
    bsShow(x.bl).forEach((e,j)=>p.timers.push(setTimeout(()=>{if(PGP===p)pgMarkBass(i+'-'+j);},ms(tb(e.b)))));
    p.beat+=n;p.t+=n*spb;p.k++;
    if(p.k>=N&&!S.pLoop){clearInterval(p.iv);p.iv=null;const end=p.t;p.timers.push(setTimeout(()=>{if(PGP===p)pgStop(true);},(end-actx.currentTime)*1000+150));break;}}}
function pgStop(soft){const p=PGP;if(!p)return;PGP=null;clearInterval(p.iv);p.timers.forEach(clearTimeout);
  if(p.mix)try{const g=p.mix.out.gain;g.cancelScheduledValues(actx.currentTime);g.setValueAtTime(g.value,actx.currentTime);g.setTargetAtTime(0,actx.currentTime,soft?.5:.03);
    setTimeout(()=>{try{p.mix.out.disconnect();}catch(e){}},soft?3000:400);}catch(e){}
  pgMark(-1);pgMarkBass(null);pgTransport();}
function pgMarkBass(k){document.querySelectorAll('#pgRows .bn').forEach(el=>el.classList.toggle('now',el.dataset.bk===k));}
function pgMark(i){document.querySelectorAll('#pgRows .pgc').forEach(el=>el.classList.toggle('play',+el.dataset.i===i));}
function pgTransport(){const b=$('#pgPlay');if(!b)return;const on=!!PGP;b.innerHTML=(on?ICON.stop:ICON.play)+'<span>'+esc(on?T.pg.stop:T.pg.play)+'</span>';
  b.setAttribute('aria-pressed',on);b.disabled=!PG||!PG.ok.length;}

/* ── bediening ── */
function pgBind(){
  ICON.lock='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  ICON.stop='<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2.5" y="2.5" width="9" height="9" rx="1.5" fill="currentColor"/></svg>';
  ICON.pin='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M9 3h6l-1 6 4 4H6l4-4z"/><path d="M12 13v8"/></svg>';
  ICON.refit='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>';
  [['#pgInL','inL'],['#pgInHelp','inHelp'],['#pgTypeL',null],['#pgModeL','modeL'],['#pgPosL','posL'],['#pgMelL','melL'],
   ['#pgTempoL','tempo'],['#pgLoopL','loop'],['#pgBassL','bass'],['#pgLegend','legend'],['#pgKeys','keys'],['#pgHeldL','heldL'],['#pgHeldHelp','heldHelp'],
   ['#pgStyleL','styleL'],['#pgDrumsL','drums'],['#pgSelAll','selAll'],['#pgSelHelp','selHelp'],['#pgFitL','fitL'],['#pgMHelp','mHelp'],['#pgMTypeL','mTypeL'],['#pgMStrL','mStrL']]
    .forEach(([id,k])=>{$(id).textContent=k?T.pg[k]:T.typeL;});
  [['#pgMPrev',ICON.prev,T.pg.prevC],['#pgMNext',ICON.next,T.pg.nextC],['#pgMX',null,T.pg.close]].forEach(([id,ic,l])=>{const b=$(id);if(ic)b.innerHTML=ic;b.setAttribute('aria-label',l);b.title=l;});
  $('#pgSelAll').textContent=T.pg.selAll;$('#pgRefitAll').textContent=T.pg.releaseB;$('#pgUnlock').textContent=T.pg.unlockB;$('#pgSelLbl').textContent=T.pg.selL;
  $('#pgIn').placeholder=T.pg.inPh;$('#pgMel').placeholder=T.pg.melPh;$('#pgMel').title=T.pg.melHelp;
  $('#pgSt').setAttribute('aria-label',T.pg.stL);
  $('#pgPos').innerHTML=Array.from({length:12},(_,k)=>k+1).map(f=>'<option value="'+f+'">'+esc(T.pg.posOpt(f))+'</option>').join('');
  /* typen: pas na een korte pauze opnieuw rekenen */
  let tm=null;const later=fn=>{clearTimeout(tm);tm=setTimeout(fn,350);};
  $('#pgIn').addEventListener('input',e=>{const t=e.target.value;pgGrow();later(()=>pgSet(()=>{S.pText=t.slice(0,800);}));});
  $('#pgIn').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();clearTimeout(tm);pgSet(()=>{S.pText=e.target.value.slice(0,800);});}});
  $('#pgMel').addEventListener('input',e=>{const t=e.target.value;later(()=>pgSet(()=>{S.pMel=t.slice(0,300);pgDropHolds();}));});
  $('#pgSt').addEventListener('change',e=>{const p=pgStProgs()[+e.target.value];e.target.value='';if(!p)return;
    pgSet(()=>{S.pText=p.text.slice(0,800);S.pLock={};S.pTypes={};PGSEL=0;PGSET=new Set([0]);PGANC=0;if(p.tempo>=40&&p.tempo<=260)S.pTempo=Math.round(p.tempo);});});
  $('#pgType').addEventListener('click',e=>{const b=e.target.closest('[data-pgtype]');if(b)pgSet(()=>{S.pType=b.dataset.pgtype;pgDropHolds();});});   /* andere soort: vastgehouden vormen los, gelockte blijven */
  $('#pgMode').addEventListener('click',e=>{const b=e.target.closest('[data-pgmode]');if(b)pgSet(()=>{S.pMode=b.dataset.pgmode;pgDropHolds();});});
  $('#pgPos').addEventListener('change',e=>pgSet(()=>{S.pPos=+e.target.value;pgDropHolds();}));
  /* filters (strook "Strings & filters"): andere filters = vastgehouden vormen los, gelockte blijven */
  $('#fsProg').addEventListener('click',e=>{const b=e.target.closest('[data-fk]');
    if(e.target.closest('[data-fclear]'))pgSet(()=>{S.pgF={str:'all',inv:'all',top:'all'};pgDropHolds();});
    else if(b)pgSet(()=>{S.pgF[b.dataset.fk]=b.dataset.fv;pgDropHolds();});});
  $('#pgTempo').addEventListener('input',e=>{S.pTempo=+e.target.value;$('#pgBpm').textContent=T.pg.bpm(S.pTempo);save();});
  $('#pgLoop').addEventListener('change',e=>{S.pLoop=e.target.checked;save();});
  $('#pgBass').addEventListener('change',e=>{S.bass=e.target.checked;save();});
  /* band: stijl, drums, volumes (de sleutel 'piano' blijft in de opslag; op het scherm heet hij "Chords") */
  $('#pgMix').innerHTML=['piano','bass','drums'].map(k=>'<label class="row"><span>'+esc(T.pg.vol[k])+'</span><input type="range" min="0" max="100" step="1" data-vol="'+k+'" aria-label="'+esc(T.pg.volL(T.pg.vol[k]))+'"></label>').join('');
  $('#pgStyle').addEventListener('click',e=>{const b=e.target.closest('[data-pgstyle]');if(b)pgSet(()=>{S.pStyle=b.dataset.pgstyle;});});
  $('#pgDrums').addEventListener('change',e=>{S.pDrums=e.target.checked;save();if(S.pDrums&&PGP)loadDrums();});
  $('#pgMix').addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.vol;if(!k)return;S.pVol[k]=+e.target.value;save();if(PGP)mixVol(PGP.mix,k,S.pVol[k]);});
  $('#pgPlay').addEventListener('click',()=>{if(PGP)pgStop();else pgPlay();});
  $('#pgUnlock').addEventListener('click',()=>pgDo('unlockAll'));
  $('#pgRefitAll').addEventListener('click',()=>pgDo('refitAll'));
  $('#pgSelAll').addEventListener('click',()=>{PGSET=new Set(PG.list.map(x=>x.i));pgSelect(PGSEL,false,'keep');});
  $('#pgRows').addEventListener('click',e=>{const u=e.target.closest('[data-lk]');
    if(u){const i=+u.dataset.lk;if(PG.list[i].held)pgDo('release',null,[i]);else pgToggleLock([i]);return;}   /* punaise = loslaten */
    /* gewone klik = dit akkoord en het venster "choose a shape" (klik op het diagram speelt hem ook); Ctrl/Shift-klik = selectie uitbreiden */
    const c=e.target.closest('.pgc');if(!c)return;const how=e.shiftKey?'range':e.ctrlKey||e.metaKey?'toggle':'one',i=+c.dataset.i;
    if(how!=='one'){pgSelect(i,false,how);return;}
    const x=PG.list[i];if(e.target.closest('.pgdg')&&x.v){playShape(x.c,x.v);logChord(x.c.sym);}
    pgOpen(i);});
  /* Shift-klik selecteert geen tekst */
  $('#pgRows').addEventListener('mousedown',e=>{if(e.shiftKey)e.preventDefault();});
  /* selectie op de transportplank */
  $('#pgSLock').addEventListener('click',()=>pgToggleLock());
  $('#pgSRefit').addEventListener('click',()=>pgDo('refit'));
  $('#pgSType').addEventListener('change',e=>{const t=e.target.value;if(t)pgDo('type',t);});
  $('#pgFit').addEventListener('click',e=>{const b=e.target.closest('[data-pgfit]');if(b)pgSet(()=>{S.pFit=b.dataset.pgfit;});});
  /* venster "choose a shape": klik ernaast of × sluit; vorm kiezen = vastzetten, de rest wordt opnieuw berekend of blijft staan (S.pFit) */
  $('#pgModal').addEventListener('click',e=>{if(e.target===e.currentTarget)pgClose();});
  $('#pgMX').addEventListener('click',pgClose);
  $('#pgMPrev').addEventListener('click',()=>{if(PGM)pgOpen(PGM.i-1);});
  $('#pgMNext').addEventListener('click',()=>{if(PGM)pgOpen(PGM.i+1);});
  $('#pgMPlay').addEventListener('click',()=>{const x=PGM&&PG.list[PGM.i];if(x&&x.v){playShape(x.c,x.v);logChord(x.c.sym);}});
  $('#pgMLock').addEventListener('click',()=>{if(PGM)pgToggleLock([PGM.i]);});
  $('#pgMRefit').addEventListener('click',()=>{if(PGM)pgDo('refit',null,[PGM.i]);});
  $('#pgMRel').addEventListener('click',()=>pgDo('refitAll'));
  $('#pgMType').addEventListener('click',e=>{const b=e.target.closest('[data-pgmtype]');if(b&&PGM)pgDo('type',b.dataset.pgmtype,[PGM.i]);});
  $('#pgMStr').addEventListener('click',e=>{const b=e.target.closest('[data-mstr]');if(b&&PGM){PGM.str=b.dataset.mstr;pgRenderModal();}});
  $('#pgMBody').addEventListener('click',e=>{const f=e.target.closest('[data-fx]'),b=e.target.closest('.dg');
    if(f){const x=PG.list[PGM.i],v=PGM.tl[+f.dataset.fx];if(x&&v){favToggle(x.c,v);pgRender();}return;}   /* ster = favoriet aan/uit (dezelfde lijst als Find voicings) */
    if(b)pgMPick(b.dataset.k);});
  let mt=0;addEventListener('resize',()=>{clearTimeout(mt);mt=setTimeout(()=>{if(PGM)pgMFit();},150);});
  document.addEventListener('keydown',e=>{if(S.mode!=='prog'||e.altKey)return;const tag=e.target&&e.target.tagName;
    if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')return;
    if(PGM&&!e.ctrlKey&&!e.metaKey){   /* in het venster: ← → vorm, Shift+← → akkoord, Spatie horen, Esc dicht (L en R zoals hieronder) */
      const x=PG.list[PGM.i],d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;
      if(e.key==='Escape'){e.preventDefault();pgClose();return;}
      if(d&&e.shiftKey){e.preventDefault();if(PG.list[PGM.i+d])pgOpen(PGM.i+d);return;}
      if(d){e.preventDefault();const O=PGM.order,j=x&&x.v?O.indexOf(x.v.key):-1,k=O[j<0?0:Math.min(O.length-1,Math.max(0,j+d))];if(k&&(!x.v||k!==x.v.key))pgMPick(k);return;}
      if(e.key===' '&&tag!=='BUTTON'){e.preventDefault();$('#pgMPlay').click();return;}}
    else if(PGM)return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();$('#pgSelAll').click();return;}
    if(e.metaKey||e.ctrlKey)return;const n=PG.list.length;
    if(e.key==='Enter'&&tag!=='BUTTON'&&n){e.preventDefault();pgOpen(PGSEL);return;}
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();if(n)pgSelect(Math.min(n-1,Math.max(0,PGSEL+(e.key==='ArrowRight'?1:-1))),!e.shiftKey,e.shiftKey?'range':'one');}
    else if(e.key==='Escape'&&PGSET.size>1)pgSelect(PGSEL,false,'one');
    else if(e.key.toLowerCase()==='l'&&n)pgToggleLock();
    else if(e.key.toLowerCase()==='r'&&n)pgDo('refit');
    else if(e.key===' '&&tag!=='BUTTON'){e.preventDefault();if(PGP)pgStop();else pgPlay();}});}
