/* ═══════════ 9. PROGRESSION (voice leading) ═══════════
   Akkoordsymbolen → per akkoord één vorm, gekozen over de hele rij met Viterbi (zoals voiceLead() in Chord Moves):
   kosten per vorm (bas, positie, snarenset, melodienoot bovenin) + kosten per overgang (handverschuiving + stemstappen,
   in "Top line" ook de sprong van de bovenste stem). Vergrendelde vormen (S.pLock) liggen vast; de rest past zich eromheen aan.
   Opslag (in 'chordFinder.v1'): pText, pType, pMode, pPos, pStr, pMel, pTempo, pLoop, pLock = {volgnummer: {s: symbool, k: frets}}.
   Alle namen hier beginnen met pg/PG: de scripts delen één scope. */
const PG_MODES=['smooth','pos','strings','top'];
const PG_FB=['drop2','shell','triad','barre','close'];      /* geen vorm in de gekozen soort? dan de eerste die wel bestaat */
const PG_GUIDE=['3','♭3','7','♭7'];
const PG_MAX=64;
/* akkoordsoorten die de Scale Trainer kent en wij niet: dan het dichtstbijzijnde eenvoudigere akkoord */
const PG_SIMPLER=[[/m6\/9/,'m6'],[/m\(?maj9\)?/i,'m(maj7)'],[/m9[♭b]5/,'m7b5'],[/m7[♭b]9/,'m7'],[/maj9[♯#]5/,'maj7#5'],
  [/maj13/,'maj9'],[/7[♭b]9[♭b]13/,'7b9'],[/13[♭b]9/,'7b9'],[/13[♯#]11/,'7#11'],[/7[♭b]13/,'7#5']];
let PG=null,PGSEL=0,PGP=null;
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
    if(v.notes[0].pc!==pgBassPc(x.c)&&v.type!=='rootless')k+=v.type==='shell'||v.type==='barre'?1.2:.25;   /* omkeringen zijn prima, grondtoon onderin iets beter */
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
  const list=P.list.map((x,i)=>{let vs=pgVoicings(x.c,S.pType),fb=null;
    if(!vs.length)for(const t of PG_FB){if(t===S.pType)continue;const w=pgVoicings(x.c,t);if(w.length){vs=w;fb=t;break;}}
    const L=S.pLock[i],lock=L&&L.s===x.c.sym&&vs.find(v=>v.key===L.k)||null;
    return Object.assign({},x,{i,vs,fb,lock,mel:S.pMode==='top'&&M.list[i]!=null?M.list[i]:null,v:null,mv:null});});
  const ok=list.filter(x=>x.vs.length);
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
    ok.forEach((x,k)=>{x.v=res.path[k];x.mv=k?pgMotion(ok[k-1].v,x.v):x.v.notes.map(()=>null);});}
  let st=0,ct=0,fr=0;
  for(let k=1;k<ok.length;k++){const a=ok[k-1].v,b=ok[k].v;st+=pgDist(a,b);fr+=Math.abs(Math.round(b.center-a.center));ct+=ok[k].mv.filter(d=>d===0).length;}
  PG={list,ok,bad:P.bad,approx:P.approx,melBad:M.bad,sets,set,costs,stats:{st,ct,fr}};
  if(PGSEL>=list.length)PGSEL=Math.max(0,list.length-1);}

/* ── scherm ── */
const pgCls=x=>(v,n)=>{const j=v.notes.indexOf(n),l=pgLab(x.c,n);return(PG_GUIDE.includes(l)?' gt':'')+(x.mv&&x.mv[j]===0?' hd':'');};
function pgArrow(d){return d==null?'':d===0?'<small class="mvh" aria-label="held">•</small>':'<small class="mv">'+(d>0?'↑':'↓')+Math.abs(d)+'</small>';}
function pgCard(x){const c=x.c,v=x.v,on=x.i===PGSEL,head='<div class="pgh"><b>'+esc(c.sym)+'</b>'+
    (x.lock?'<button type="button" class="pglk" data-unlock="'+x.i+'" aria-label="'+esc(T.pg.lockL(c.sym))+'" title="'+esc(T.pg.unlock)+'">'+ICON.lock+'</button>':'')+
    (x.bars!==1?'<span class="cap">'+esc(T.pg.bars(x.bars))+'</span>':'')+'</div>';
  if(!v)return'<div class="pgc none" data-i="'+x.i+'">'+head+'<p class="note">'+esc(T.pg.noShape)+'</p></div>';
  const cls=pgCls(x),vo=v.notes.map((n,j)=>({n,d:x.mv[j]})).reverse();
  return'<div class="pgc'+(on?' on':'')+(x.lock?' lk':'')+'" data-i="'+x.i+'">'+head+
    '<button type="button" class="pgdg" data-i="'+x.i+'" aria-pressed="'+on+'" aria-label="'+esc(T.pg.cardL(c.sym,fretTxt(v)))+'" title="'+esc(fretTxt(v))+'">'+diagram(c,v,null,n=>cls(v,n))+'</button>'+
    '<p class="cap pgi">'+esc(invTxt(v,true))+' · '+esc([...v.strs].join(''))+(x.fb?' · '+esc(T.pg.fb(T.types[x.fb])):'')+'</p>'+
    '<ol class="pgv">'+vo.map(o=>{const l=pgLab(c,o.n);return'<li><b class="'+(PG_GUIDE.includes(l)?'gt':'')+'" title="'+esc(toneName(c,o.n.pc))+'">'+esc(l)+'</b>'+pgArrow(o.d)+'</li>';}).join('')+'</ol></div>';}
function pgAlts(x){const k=PG.ok.indexOf(x),a=PG.ok[k-1],b=PG.ok[k+1],{un,pr}=PG.costs;
  return x.vs.filter(v=>v!==x.v).map(v=>({v,sc:un(v,x)+(a?pr(a.v,v):0)+(b?pr(v,b.v):0),mv:(a?pgDist(a.v,v):0)+(b?pgDist(v,b.v):0)}))
    .sort((p,q)=>p.sc-q.sc).slice(0,16);}
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
  $('#pgTempo').value=S.pTempo;$('#pgBpm').textContent=T.pg.bpm(S.pTempo);$('#pgLoop').checked=S.pLoop;$('#pgBass').checked=S.bass;
  $('#pgUnlock').hidden=!P.list.some(x=>x.lock);
  $('#pgSum').textContent=P.ok.length>1?T.pg.sum(P.stats.st,P.stats.ct,P.stats.fr):'';
  /* één rij per regel van de invoer */
  const secs=[];P.list.forEach(x=>{if(!secs.length||secs[secs.length-1].sec!==x.sec)secs.push({sec:x.sec,xs:[]});secs[secs.length-1].xs.push(x);});
  $('#pgRows').innerHTML=!P.list.length?'<p class="note" style="margin-top:12px">'+esc(T.pg.empty)+'</p>':secs.map(s=>'<div class="pgrow">'+s.xs.map(pgCard).join('')+'</div>').join('');
  $('#pgLegend').hidden=!P.ok.length;
  pgMark(PGP&&!PGP.loading?PGP.cur:-1);
  pgRenderAlts();pgTransport();}
function pgRenderAlts(){const x=PG.list[PGSEL],box=$('#pgAltBox');box.hidden=!x||!x.v;if(box.hidden)return;
  $('#pgAltH').textContent=T.pg.altH(x.c.sym,x.i+1);
  const lb=$('#pgAltLock');lb.hidden=!x.lock;lb.innerHTML=ICON.lock+'<span>'+esc(T.pg.unlock)+'</span>';
  const A=pgAlts(x);
  $('#pgAlts').innerHTML=!A.length?'<p class="note">'+esc(T.pg.noAlt)+'</p>':A.map(o=>
    '<button type="button" class="dg" data-k="'+o.v.key+'" aria-label="'+esc(T.shapeBtn(x.c.sym+', '+invTxt(o.v),fretTxt(o.v)))+'" title="'+esc(fretTxt(o.v)+' · '+T.pg.movesL(o.mv))+'">'+
      diagram(x.c,o.v)+'<span class="cp">'+esc(T.pg.moves(o.mv))+' · '+esc(invTxt(o.v,true))+' · '+esc([...o.v.strs].join(''))+'</span></button>').join('');}
function pgSelect(i,play){if(!PG.list[i])return;PGSEL=i;
  document.querySelectorAll('#pgRows .pgc').forEach(el=>{const on=+el.dataset.i===i;el.classList.toggle('on',on);const b=el.querySelector('.pgdg');if(b)b.setAttribute('aria-pressed',on);});
  pgRenderAlts();const x=PG.list[i];if(play&&x.v){playShape(x.c,x.v);logChord(x.c.sym);}}
function pgSet(fn){fn();act();save();pgRender();}

/* ── afspelen: elk akkoord op 1 en 3 (halve noten), bas op dezelfde tellen; plant steeds een stukje vooruit, zodat
   tempo en gekozen vormen meteen meeveranderen (zoals sched() in Chord Moves) ── */
function pgPlay(){pgStop();if(!audio()||!PG||!PG.ok.length)return;
  const go=()=>{act();PGP={mix:chain(),k:0,cur:-1,t:actx.currentTime+.08,timers:[],iv:null,bass:null};pgSched();PGP.iv=setInterval(pgSched,40);pgTransport();};
  if(SND||!window.BACKING_SOUNDS)go();else{PGP={loading:true,timers:[]};pgTransport();loadSounds().then(()=>{if(PGP&&PGP.loading){PGP=null;go();}});}}
function pgSched(){const p=PGP;if(!p||p.loading)return;
  while(p.t<actx.currentTime+.3){const L=PG.ok,N=L.length;if(!N){pgStop();return;}if(p.k>=N)p.k=0;
    const x=L[p.k],spb=60/S.pTempo,beats=Math.max(2,x.bars*4),dur=x.bars*4*spb;
    for(let b=0;b<beats;b+=2){const t=p.t+b*spb,len=Math.min(2,beats-b)*spb;
      x.v.notes.forEach((n,j)=>pianoNote(n.midi,t+j*.012,len*.92,b%4===0?72:62,p.mix.piano));
      if(S.bass){const m=near(pgBassPc(x.c),p.bass==null?34:p.bass);p.bass=m;bassPlay(m,t,len*.95,b%4===0?110:98,p.mix.bass);}}
    const at=p.t,i=x.i,sym=x.c.sym;
    p.timers=p.timers.slice(-32);p.timers.push(setTimeout(()=>{if(PGP===p){p.cur=i;pgMark(i);act();logChord(sym);}},Math.max(0,(at-actx.currentTime)*1000)));
    p.t+=dur;p.k++;
    if(p.k>=N&&!S.pLoop){clearInterval(p.iv);p.iv=null;const end=p.t;p.timers.push(setTimeout(()=>{if(PGP===p)pgStop(true);},(end-actx.currentTime)*1000+150));break;}}}
function pgStop(soft){const p=PGP;if(!p)return;PGP=null;clearInterval(p.iv);p.timers.forEach(clearTimeout);
  if(p.mix)try{const g=p.mix.out.gain;g.cancelScheduledValues(actx.currentTime);g.setValueAtTime(g.value,actx.currentTime);g.setTargetAtTime(0,actx.currentTime,soft?.5:.03);
    setTimeout(()=>{try{p.mix.out.disconnect();}catch(e){}},soft?3000:400);}catch(e){}
  pgMark(-1);pgTransport();}
function pgMark(i){document.querySelectorAll('#pgRows .pgc').forEach(el=>el.classList.toggle('play',+el.dataset.i===i));}
function pgTransport(){const b=$('#pgPlay');if(!b)return;const on=!!PGP;b.innerHTML=(on?ICON.stop:ICON.play)+'<span>'+esc(on?T.pg.stop:T.pg.play)+'</span>';
  b.setAttribute('aria-pressed',on);b.disabled=!PG||!PG.ok.length;}

/* ── bediening ── */
function pgBind(){
  ICON.lock='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  ICON.stop='<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2.5" y="2.5" width="9" height="9" rx="1.5" fill="currentColor"/></svg>';
  [['#pgInL','inL'],['#pgInHelp','inHelp'],['#pgTypeL',null],['#pgModeL','modeL'],['#pgPosL','posL'],['#pgStrL','strL'],['#pgMelL','melL'],
   ['#pgTempoL','tempo'],['#pgLoopL','loop'],['#pgBassL','bass'],['#pgUnlock','unlockAll'],['#pgLegend','legend'],['#pgAltHelp','altHelp'],['#pgKeys','keys']]
    .forEach(([id,k])=>{$(id).textContent=k?T.pg[k]:T.typeL;});
  $('#pgLabL').textContent=T.labL;$('#pgIn').placeholder=T.pg.inPh;$('#pgMel').placeholder=T.pg.melPh;$('#pgMel').title=T.pg.melHelp;
  $('#pgSt').setAttribute('aria-label',T.pg.stL);
  $('#pgPos').innerHTML=Array.from({length:12},(_,k)=>k+1).map(f=>'<option value="'+f+'">'+esc(T.pg.posOpt(f))+'</option>').join('');
  /* typen: pas na een korte pauze opnieuw rekenen */
  let tm=null;const later=fn=>{clearTimeout(tm);tm=setTimeout(fn,350);};
  $('#pgIn').addEventListener('input',e=>{const t=e.target.value;later(()=>pgSet(()=>{S.pText=t.slice(0,800);}));});
  $('#pgIn').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();clearTimeout(tm);pgSet(()=>{S.pText=e.target.value.slice(0,800);});}});
  $('#pgMel').addEventListener('input',e=>{const t=e.target.value;later(()=>pgSet(()=>{S.pMel=t.slice(0,300);}));});
  $('#pgSt').addEventListener('change',e=>{const p=pgStProgs()[+e.target.value];e.target.value='';if(!p)return;
    pgSet(()=>{S.pText=p.text.slice(0,800);S.pLock={};PGSEL=0;if(p.tempo>=40&&p.tempo<=260)S.pTempo=Math.round(p.tempo);});});
  $('#pgType').addEventListener('click',e=>{const b=e.target.closest('[data-pgtype]');if(b)pgSet(()=>{S.pType=b.dataset.pgtype;S.pLock={};});});   /* andere soort: vergrendelingen passen niet meer */
  $('#pgMode').addEventListener('click',e=>{const b=e.target.closest('[data-pgmode]');if(b)pgSet(()=>{S.pMode=b.dataset.pgmode;});});
  $('#pgPos').addEventListener('change',e=>pgSet(()=>{S.pPos=+e.target.value;}));
  $('#pgStr').addEventListener('click',e=>{const b=e.target.closest('[data-pgstr]');if(b)pgSet(()=>{S.pStr=b.dataset.pgstr;});});
  $('#pgLab').addEventListener('click',e=>{const b=e.target.closest('[data-pglab]');if(b)pgSet(()=>{S.labels=b.dataset.pglab;});});
  $('#pgTempo').addEventListener('input',e=>{S.pTempo=+e.target.value;$('#pgBpm').textContent=T.pg.bpm(S.pTempo);save();});
  $('#pgLoop').addEventListener('change',e=>{S.pLoop=e.target.checked;save();});
  $('#pgBass').addEventListener('change',e=>{S.bass=e.target.checked;save();});
  $('#pgPlay').addEventListener('click',()=>{if(PGP)pgStop();else pgPlay();});
  $('#pgUnlock').addEventListener('click',()=>pgSet(()=>{S.pLock={};}));
  $('#pgRows').addEventListener('click',e=>{const u=e.target.closest('[data-unlock]');
    if(u){pgSet(()=>{delete S.pLock[u.dataset.unlock];});return;}
    const c=e.target.closest('.pgc');if(c)pgSelect(+c.dataset.i,!!e.target.closest('.pgdg'));});
  $('#pgAltLock').addEventListener('click',()=>pgSet(()=>{delete S.pLock[PGSEL];}));
  /* alternatief kiezen = vergrendelen; de rest wordt opnieuw berekend */
  $('#pgAlts').addEventListener('click',e=>{const b=e.target.closest('.dg');const x=PG.list[PGSEL];if(!b||!x)return;
    const v=x.vs.find(w=>w.key===b.dataset.k);if(!v)return;
    pgSet(()=>{S.pLock[x.i]={s:x.c.sym,k:v.key};});playShape(x.c,v);logChord(x.c.sym);});
  document.addEventListener('keydown',e=>{if(S.mode!=='prog'||e.metaKey||e.ctrlKey||e.altKey)return;const tag=e.target&&e.target.tagName;
    if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=PG.list.length;if(n)pgSelect(Math.min(n-1,Math.max(0,PGSEL+(e.key==='ArrowRight'?1:-1))),true);}
    else if(e.key===' '&&tag!=='BUTTON'){e.preventDefault();if(PGP)pgStop();else pgPlay();}});}
