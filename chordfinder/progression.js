/* ═══════════ 9. PROGRESSION (voice leading) ═══════════
   Akkoordsymbolen → per akkoord één vorm, gekozen over de hele rij met Viterbi (zoals voiceLead() in Chord Moves):
   kosten per vorm (bas, positie, snarenset, melodienoot bovenin) + kosten per overgang (handverschuiving + stemstappen,
   in "Top line" ook de sprong van de bovenste stem). Vormen in S.pLock liggen vast; de rest past zich eromheen aan.
   S.pLock = {volgnummer: {s: symbool, k: frets, t: soort, h: 1?}}: zonder h = gelockt door de gebruiker (blijft),
   met h = "vastgehouden" (tijdelijk bevroren zodat alleen andere akkoorden veranderen; Re-fit of een andere instelling laat ze weer los).
   S.pTypes = {volgnummer: {s: symbool, t: soort}} = eigen voicingsoort voor één akkoord; S.pFit = 'refit'|'keep' (wat er met de rest gebeurt als je een vorm kiest).
   Opslag (in 'chordFinder.v1'): pText, pType, pMode, pPos, pStr, pMel, pTempo, pLoop, pLock, pTypes, pFit,
   en voor de band (fase 4): pLine (baslijn, zie bass.js), pStyle, pDrums, pVol = {piano, bass, drums} (0–100), pBNeck (baslijn op de hals).
   Baslijn Stepwise: eerst kiest bsStep() de basnoten, daarna krijgt een vorm met een andere laagste noot extra kosten.
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

/* ── afleiden: S → PG = {list (alle akkoorden), ok (met vorm), bad, approx, melBad, sets, set, costs, stats} ── */
function pgDerive(){const P=pgParse(S.pText),M=pgMelody(S.pMel);
  const list=P.list.map((x,i)=>{const o=S.pTypes[i],own=!!(o&&o.s===x.c.sym&&VTYPES.includes(o.t)),tp=own?o.t:S.pType;
    let vs=pgVoicings(x.c,tp),fb=null;
    if(!vs.length)for(const t of PG_FB){if(t===tp)continue;const w=pgVoicings(x.c,t);if(w.length){vs=w;fb=t;break;}}
    const L=S.pLock[i],lock=L&&L.s===x.c.sym?pgFindLock(x.c,tp,L):null;
    return Object.assign({},x,{i,tp,own,vs,fb,lock,held:!!(lock&&L.h),mel:S.pMode==='top'&&M.list[i]!=null?M.list[i]:null,v:null,mv:null,bsPc:null,bl:null});});
  const ok=list.filter(x=>x.vs.length||x.lock);
  if(S.pLine==='step'){const sp=bsStep(ok);ok.forEach((x,k)=>{x.bsPc=sp[k];});}   /* eerst de baslijn, dan de vormen eromheen */
  /* snarensets: hoeveel akkoorden er een vorm op hebben (voor de knoppen en voor Auto) */
  const cnt=new Map();
  ok.forEach(x=>{const s=new Set();x.vs.forEach(v=>{s.add(v.strs);if(x.c.bassPc!=null)s.add(v.strs.slice(1));});s.forEach(k=>cnt.set(k,(cnt.get(k)||0)+1));});
  const top=Math.max(0,...cnt.values()),sets=[...cnt.keys()].filter(k=>cnt.get(k)>=Math.max(1,top/2)&&k.length>=3)
    .sort((a,b)=>cnt.get(b)-cnt.get(a)||b.length-a.length||(a<b?1:-1)).slice(0,8);
  let set=null,res=null,costs=pgCosts(null);
  if(ok.length){
    if(S.pMode==='strings'){const tries=S.pStr!=='auto'&&sets.includes(S.pStr)?[S.pStr]:sets;
      tries.forEach(s=>{const cs=pgCosts(s),r=pgViterbi(ok,cs.un,cs.pr);if(!res||r.tot<res.tot){res=r;set=s;costs=cs;}});}
    if(!res)res=pgViterbi(ok,costs.un,costs.pr);
    ok.forEach((x,k)=>{x.v=res.path[k];x.mv=k?pgMotion(ok[k-1].v,x.v):x.v.notes.map(()=>null);});
    const BL=bsLines(ok,S.pLine),BF=bsFrets(ok.map((x,k)=>({bl:BL[k]})));ok.forEach((x,k)=>{x.bl=BL[k];x.bf=BF[k];});}
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
function pgCard(x){const c=x.c,v=x.v,on=x.i===PGSEL,sel=PGSET.has(x.i),head='<div class="pgh"><b>'+esc(c.sym)+'</b>'+(v?pgLkBtn(x):'')+
    (x.bars!==1?'<span class="cap">'+esc(T.pg.bars(x.bars))+'</span>':'')+'</div>';
  const cl=(on?' on':'')+(sel?' sel':'');
  if(!v)return'<div class="pgc none'+cl+'" data-i="'+x.i+'">'+head+'<p class="note">'+esc(T.pg.noShape)+'</p></div>';
  const cls=pgCls(x),vo=v.notes.map((n,j)=>({n,d:x.mv[j]})).reverse(),tp=v.type!==S.pType?T.types[v.type]:'';
  return'<div class="pgc'+cl+(x.lock?x.held?' hl':' lk':'')+'" data-i="'+x.i+'">'+head+
    '<button type="button" class="pgdg" data-i="'+x.i+'" aria-pressed="'+sel+'" aria-label="'+esc(T.pg.cardL(c.sym,fretTxt(v)))+'" title="'+esc(fretTxt(v))+'">'+diagram(c,v,null,n=>cls(v,n))+'</button>'+
    '<p class="cap pgi">'+(tp?'<b class="pgt">'+esc(tp)+'</b> · ':'')+esc(invTxt(v,true))+' · '+esc([...v.strs].join(''))+'</p>'+
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
/* de baslijn van het gekozen akkoord op de hals (een octaaf hoger), met cijfers in speelvolgorde; ring = begin van het volgende akkoord */
function pgRenderBass(){const box=$('#pgBassBox'),x=PG.list[PGSEL];box.hidden=!S.pBNeck||!x||!x.bl;if(box.hidden)return;
  const k=PG.ok.indexOf(x),nx=PG.ok[(k+1)%PG.ok.length],L=bsShow(x.bl),dots=new Map();
  $('#pgBassH').textContent=T.pg.bNeckH(x.c.sym,x.i+1);
  L.forEach((e,j)=>{const p=x.bf[j];if(!p)return;const id=p.s+','+p.f,d=dots.get(id);
    if(d)d.lab+=','+(j+1);else dots.set(id,{s:p.s,f:p.f,cls:e.ap?'dt hl':e.pc===x.c.rootPc?'rt':'dt',lab:String(j+1)});});
  const q=nx&&nx.bf[0];if(q&&!dots.has(q.s+','+q.f))dots.set('n',{s:q.s,f:q.f,cls:'ct cr',small:true,lab:'›'});
  $('#pgBassNeck').innerHTML=neckSvg([...dots.values()],false);}
function pgAlts(x){const k=PG.ok.indexOf(x),a=PG.ok[k-1],b=PG.ok[k+1],{un,pr}=PG.costs;
  return x.vs.filter(v=>v!==x.v).map(v=>({v,sc:un(v,x)+(a?pr(a.v,v):0)+(b?pr(v,b.v):0),mv:(a?pgDist(a.v,v):0)+(b?pgDist(v,b.v):0)}))
    .sort((p,q)=>p.sc-q.sc).slice(0,24);}
function pgRender(){pgDerive();const P=PG,inp=$('#pgIn'),mel=$('#pgMel');
  if(document.activeElement!==inp)inp.value=S.pText;if(document.activeElement!==mel)mel.value=S.pMel;
  $('#pgErr').textContent=P.bad.length?T.pg.bad(P.bad):'';$('#pgApprox').textContent=P.approx.length?T.pg.approx(P.approx):'';$('#pgApprox').hidden=!P.approx.length;
  $('#pgMelErr').textContent=P.melBad.length?T.pg.badMel(P.melBad):'';
  const st=pgStProgs(),sel=$('#pgSt');sel.hidden=!st.length;
  if(st.length)sel.innerHTML='<option value="">'+esc(T.pg.st)+'</option>'+st.map((p,i)=>'<option value="'+i+'">'+esc(p.name)+'</option>').join('');
  seg($('#pgType'),VTYPES.map(t=>[t,T.types[t]]),S.pType,'pgtype');
  seg($('#pgMode'),PG_MODES.map(m=>[m,T.pg.mode[m]]),S.pMode,'pgmode');
  $('#pgModeHelp').textContent=T.pg.modeHelp[S.pMode];
  $('#pgPosRow').hidden=S.pMode!=='pos';$('#pgStrRow').hidden=S.pMode!=='strings';$('#pgMelRow').hidden=S.pMode!=='top';
  $('#pgPos').value=S.pPos;
  chips($('#pgStr'),[['auto',S.pStr==='auto'&&P.set?T.pg.autoIs(P.set):T.pg.auto],...P.sets.map(k=>[k,[...k].join(' ')])],P.sets.includes(S.pStr)?S.pStr:'auto','pgstr');
  seg($('#pgLab'),Object.entries(T.lab),S.labels,'pglab');
  seg($('#pgLine'),BS_LINES.map(k=>[k,T.pg.line[k]]),S.pLine,'pgline');$('#pgLineHelp').textContent=T.pg.lineHelp[S.pLine];
  seg($('#pgStyle'),PG_STYLES.map(k=>[k,T.pg.style[k]]),S.pStyle,'pgstyle');$('#pgDrums').checked=S.pDrums;$('#pgBNeck').checked=S.pBNeck;
  document.querySelectorAll('#pgMix input').forEach(el=>{el.value=S.pVol[el.dataset.vol];});
  $('#pgTempo').value=S.pTempo;$('#pgBpm').textContent=T.pg.bpm(S.pTempo);$('#pgLoop').checked=S.pLoop;$('#pgBass').checked=S.bass;
  pgRenderBar();
  $('#pgSum').textContent=P.ok.length>1?T.pg.sum(P.stats.st,P.stats.ct,P.stats.fr):'';
  /* één rij per regel van de invoer */
  const secs=[];P.list.forEach(x=>{if(!secs.length||secs[secs.length-1].sec!==x.sec)secs.push({sec:x.sec,xs:[]});secs[secs.length-1].xs.push(x);});
  $('#pgRows').innerHTML=!P.list.length?'<p class="note" style="margin-top:12px">'+esc(T.pg.empty)+'</p>':secs.map(s=>'<div class="pgrow">'+s.xs.map(pgCard).join('')+'</div>').join('');
  $('#pgLegend').hidden=!P.ok.length;
  pgMark(PGP&&!PGP.loading?PGP.cur:-1);
  pgRenderSide();pgTransport();}
/* balk boven de kaarten: alles selecteren, vastgehouden akkoorden loslaten, alle locks weg */
function pgRenderBar(){const L=PG.list,nh=L.filter(x=>x.held).length,nl=L.filter(x=>x.lock&&!x.held).length;
  $('#pgSelAll').hidden=L.length<2;$('#pgRefitAll').hidden=!nh;$('#pgRefitAll').textContent=T.pg.refitAll(nh);
  $('#pgUnlock').hidden=!nl&&!nh;$('#pgUnlock').textContent=T.pg.unlockAll(nl+nh);}
const pgSel=()=>[...PGSET].filter(i=>PG.list[i]).sort((a,b)=>a-b);
/* zijpaneel: het gekozen akkoord (of de selectie), acties, eigen voicingsoort, alternatieven */
function pgRenderSide(){const box=$('#pgSide');box.hidden=!PG.list.length;if(box.hidden){$('#pgBassBox').hidden=true;return;}
  const xs=pgSel().map(i=>PG.list[i]),x=PG.list[PGSEL],multi=xs.length>1,wv=xs.filter(y=>y.v);
  $('#pgSelH').textContent=multi?T.pg.selN(xs.length):x.c.sym;
  $('#pgSelSub').textContent=multi?xs.map(y=>y.c.sym).join('  '):T.pg.chordN(x.i+1,PG.list.length)+(x.bars!==1?' · '+T.pg.bars(x.bars):'')+(x.v?' · '+fretTxt(x.v):'');
  const cnt={free:0,held:0,lock:0};wv.forEach(y=>cnt[pgState(y)]++);
  $('#pgState').textContent=!wv.length?T.pg.noShape:multi?T.pg.stateN(cnt):T.pg.state[pgState(x)];
  $('#pgState').className='note pgst '+(multi?'':x.v?pgState(x):'');
  const allL=wv.length&&wv.every(y=>pgState(y)==='lock'),lb=$('#pgSLock');
  lb.innerHTML=ICON.lock+'<span>'+esc(allL?T.pg.unlock:T.pg.lock)+'</span>';lb.disabled=!wv.length;lb.setAttribute('aria-pressed',!!allL);
  $('#pgSRefit').innerHTML=ICON.refit+'<span>'+esc(T.pg.refit)+'</span>';$('#pgSRefit').disabled=!wv.length;$('#pgSRefit').title=T.pg.refitL;
  const pb=$('#pgSPlay');pb.hidden=multi||!x.v;pb.innerHTML=ICON.play+'<span>'+esc(T.pg.hear)+'</span>';
  /* eigen soort: knop ingedrukt als de hele selectie dezelfde heeft */
  const own=xs.every(y=>!y.own)?'def':xs.every(y=>y.own&&y.tp===xs[0].tp)?xs[0].tp:null;
  seg($('#pgSType'),[['def',T.pg.typeDef(T.types[S.pType])],...VTYPES.map(t=>[t,T.types[t]])],own,'pgstype');
  $('#pgSTypeL').textContent=multi?T.pg.typeAll:T.pg.typeOne;
  seg($('#pgFit'),Object.entries(T.pg.fit),S.pFit,'pgfit');$('#pgFitHelp').textContent=T.pg.fitHelp[S.pFit];
  pgRenderAlts(multi?null:x);pgRenderBass();}
function pgRenderAlts(x){const box=$('#pgAlts');$('#pgFitRow').hidden=$('#pgFitHelp').hidden=!x||!x.v;
  if(!x){$('#pgAltH').textContent=T.pg.altH0;box.innerHTML='<p class="note">'+esc(T.pg.oneAlt)+'</p>';return;}
  $('#pgAltH').textContent=T.pg.altH(x.c.sym,T.types[x.fb||x.tp]);
  if(!x.v){box.innerHTML='<p class="note">'+esc(T.pg.noShape)+'</p>';return;}
  const btn=(v,cap,on)=>'<button type="button" class="dg'+(on?' on':'')+'" data-k="'+v.key+'" data-t="'+v.type+'" aria-pressed="'+on+'" aria-label="'+esc(T.shapeBtn(x.c.sym+', '+invTxt(v),fretTxt(v)))+'" title="'+esc(fretTxt(v))+'">'+
    diagram(x.c,v)+'<span class="cp">'+cap+'</span></button>';
  const A=pgAlts(x),cur=btn(x.v,'<b>'+esc(T.pg.cur)+'</b> · '+esc(invTxt(x.v,true))+' · '+esc([...x.v.strs].join('')),true);
  box.innerHTML=cur+(!A.length?'<p class="note">'+esc(T.pg.noAlt)+'</p>':A.map(o=>btn(o.v,esc(T.pg.moves(o.mv))+' · '+esc(invTxt(o.v,true))+' · '+esc([...o.v.strs].join('')),false)).join(''));}
/* selecteren: how = 'one' (gewone klik), 'toggle' (Ctrl/Cmd), 'range' (Shift) */
function pgSelect(i,play,how){if(!PG.list[i])return;
  if(how==='toggle'){if(PGSET.has(i)&&PGSET.size>1){PGSET.delete(i);if(PGSEL===i)PGSEL=pgSel()[0];}else{PGSET.add(i);PGSEL=i;}PGANC=i;}
  else if(how==='range'){const a=Math.min(PGANC,i),b=Math.max(PGANC,i);PGSET=new Set();for(let k=a;k<=b;k++)PGSET.add(k);PGSEL=i;}
  else if(how!=='keep'){PGSET=new Set([i]);PGSEL=i;PGANC=i;}
  document.querySelectorAll('#pgRows .pgc').forEach(el=>{const k=+el.dataset.i,s=PGSET.has(k);el.classList.toggle('on',k===PGSEL);el.classList.toggle('sel',s);
    const b=el.querySelector('.pgdg');if(b)b.setAttribute('aria-pressed',s);});
  pgRenderSide();const x=PG.list[PGSEL];if(play&&x.v){playShape(x.c,x.v);logChord(x.c.sym);}}
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
    else if(kind==='unlock'){if(keep)pgHold(sel);sel.forEach(i=>{delete S.pLock[i];});}
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
  [['#pgInL','inL'],['#pgInHelp','inHelp'],['#pgTypeL',null],['#pgModeL','modeL'],['#pgPosL','posL'],['#pgStrL','strL'],['#pgMelL','melL'],
   ['#pgTempoL','tempo'],['#pgLoopL','loop'],['#pgBassL','bass'],['#pgLegend','legend'],['#pgKeys','keys'],
   ['#pgLineL','lineL'],['#pgStyleL','styleL'],['#pgDrumsL','drums'],['#pgBNeckL','bNeck'],['#pgBassHelp','bNeckHelp'],['#pgSelAll','selAll'],['#pgSelHelp','selHelp'],['#pgFitL','fitL']]
    .forEach(([id,k])=>{$(id).textContent=k?T.pg[k]:T.typeL;});
  $('#pgLabL').textContent=T.labL;$('#pgIn').placeholder=T.pg.inPh;$('#pgMel').placeholder=T.pg.melPh;$('#pgMel').title=T.pg.melHelp;
  $('#pgSt').setAttribute('aria-label',T.pg.stL);
  $('#pgPos').innerHTML=Array.from({length:12},(_,k)=>k+1).map(f=>'<option value="'+f+'">'+esc(T.pg.posOpt(f))+'</option>').join('');
  /* typen: pas na een korte pauze opnieuw rekenen */
  let tm=null;const later=fn=>{clearTimeout(tm);tm=setTimeout(fn,350);};
  $('#pgIn').addEventListener('input',e=>{const t=e.target.value;later(()=>pgSet(()=>{S.pText=t.slice(0,800);}));});
  $('#pgIn').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();clearTimeout(tm);pgSet(()=>{S.pText=e.target.value.slice(0,800);});}});
  $('#pgMel').addEventListener('input',e=>{const t=e.target.value;later(()=>pgSet(()=>{S.pMel=t.slice(0,300);pgDropHolds();}));});
  $('#pgSt').addEventListener('change',e=>{const p=pgStProgs()[+e.target.value];e.target.value='';if(!p)return;
    pgSet(()=>{S.pText=p.text.slice(0,800);S.pLock={};S.pTypes={};PGSEL=0;PGSET=new Set([0]);PGANC=0;if(p.tempo>=40&&p.tempo<=260)S.pTempo=Math.round(p.tempo);});});
  $('#pgType').addEventListener('click',e=>{const b=e.target.closest('[data-pgtype]');if(b)pgSet(()=>{S.pType=b.dataset.pgtype;pgDropHolds();});});   /* andere soort: vastgehouden vormen los, gelockte blijven */
  $('#pgMode').addEventListener('click',e=>{const b=e.target.closest('[data-pgmode]');if(b)pgSet(()=>{S.pMode=b.dataset.pgmode;pgDropHolds();});});
  $('#pgPos').addEventListener('change',e=>pgSet(()=>{S.pPos=+e.target.value;pgDropHolds();}));
  $('#pgStr').addEventListener('click',e=>{const b=e.target.closest('[data-pgstr]');if(b)pgSet(()=>{S.pStr=b.dataset.pgstr;pgDropHolds();});});
  $('#pgLab').addEventListener('click',e=>{const b=e.target.closest('[data-pglab]');if(b)pgSet(()=>{S.labels=b.dataset.pglab;});});
  $('#pgTempo').addEventListener('input',e=>{S.pTempo=+e.target.value;$('#pgBpm').textContent=T.pg.bpm(S.pTempo);save();});
  $('#pgLoop').addEventListener('change',e=>{S.pLoop=e.target.checked;save();});
  $('#pgBass').addEventListener('change',e=>{S.bass=e.target.checked;save();});
  /* band: baslijn (Stepwise verandert ook de vormen), stijl, drums, volumes, baslijn op de hals */
  $('#pgMix').innerHTML=['piano','bass','drums'].map(k=>'<label class="krow cap"><span>'+esc(T.pg.vol[k])+'</span><input type="range" min="0" max="100" step="1" data-vol="'+k+'" aria-label="'+esc(T.pg.volL(T.pg.vol[k]))+'"></label>').join('');
  $('#pgLine').addEventListener('click',e=>{const b=e.target.closest('[data-pgline]');if(b)pgSet(()=>{S.pLine=b.dataset.pgline;pgDropHolds();});});
  $('#pgStyle').addEventListener('click',e=>{const b=e.target.closest('[data-pgstyle]');if(b)pgSet(()=>{S.pStyle=b.dataset.pgstyle;});});
  $('#pgDrums').addEventListener('change',e=>{S.pDrums=e.target.checked;save();if(S.pDrums&&PGP)loadDrums();});
  $('#pgMix').addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.vol;if(!k)return;S.pVol[k]=+e.target.value;save();if(PGP)mixVol(PGP.mix,k,S.pVol[k]);});
  $('#pgBNeck').addEventListener('change',e=>{S.pBNeck=e.target.checked;save();pgRenderBass();});
  $('#pgPlay').addEventListener('click',()=>{if(PGP)pgStop();else pgPlay();});
  $('#pgUnlock').addEventListener('click',()=>pgDo('unlockAll'));
  $('#pgRefitAll').addEventListener('click',()=>pgDo('refitAll'));
  $('#pgSelAll').addEventListener('click',()=>{PGSET=new Set(PG.list.map(x=>x.i));pgSelect(PGSEL,false,'keep');});
  $('#pgRows').addEventListener('click',e=>{const u=e.target.closest('[data-lk]');
    if(u){pgToggleLock([+u.dataset.lk]);return;}
    const c=e.target.closest('.pgc');if(!c)return;const how=e.shiftKey?'range':e.ctrlKey||e.metaKey?'toggle':'one';
    pgSelect(+c.dataset.i,how==='one'&&!!e.target.closest('.pgdg'),how);});
  /* Shift-klik selecteert geen tekst */
  $('#pgRows').addEventListener('mousedown',e=>{if(e.shiftKey)e.preventDefault();});
  $('#pgSLock').addEventListener('click',()=>pgToggleLock());
  $('#pgSRefit').addEventListener('click',()=>pgDo('refit'));
  $('#pgSPlay').addEventListener('click',()=>{const x=PG.list[PGSEL];if(x&&x.v){playShape(x.c,x.v);logChord(x.c.sym);}});
  $('#pgSType').addEventListener('click',e=>{const b=e.target.closest('[data-pgstype]');if(b)pgDo('type',b.dataset.pgstype);});
  $('#pgFit').addEventListener('click',e=>{const b=e.target.closest('[data-pgfit]');if(b)pgSet(()=>{S.pFit=b.dataset.pgfit;});});
  /* vorm kiezen = vastzetten; de rest wordt opnieuw berekend of blijft staan (S.pFit) */
  $('#pgAlts').addEventListener('click',e=>{const b=e.target.closest('.dg');const x=PG.list[PGSEL];if(!b||!x)return;
    const v=x.vs.find(w=>w.key===b.dataset.k)||(x.v&&x.v.key===b.dataset.k?x.v:null);if(!v)return;
    playShape(x.c,v);logChord(x.c.sym);if(v===x.v&&pgState(x)==='lock')return;pgDo('pick',v,[x.i]);});
  document.addEventListener('keydown',e=>{if(S.mode!=='prog'||e.altKey)return;const tag=e.target&&e.target.tagName;
    if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();$('#pgSelAll').click();return;}
    if(e.metaKey||e.ctrlKey)return;const n=PG.list.length;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();if(n)pgSelect(Math.min(n-1,Math.max(0,PGSEL+(e.key==='ArrowRight'?1:-1))),!e.shiftKey,e.shiftKey?'range':'one');}
    else if(e.key==='Escape'&&PGSET.size>1)pgSelect(PGSEL,false,'one');
    else if(e.key.toLowerCase()==='l'&&n)pgToggleLock();
    else if(e.key.toLowerCase()==='r'&&n)pgDo('refit');
    else if(e.key===' '&&tag!=='BUTTON'){e.preventDefault();if(PGP)pgStop();else pgPlay();}});}
