/* ═══════════ 8. BASLIJNEN ═══════════
   Per akkoord van de progressie de noten van de bas, in tellen vanaf het begin van het akkoord:
   Roots (grondtoon of slash-bas op 1 en 3), Root & 5th (twee-tel), Approach (grondtoon + naderingsnoot op de laatste tel),
   Walking (kwarten: akkoord- en toonladdertonen, de laatste tel nadert het volgende akkoord) en Stepwise (omkeringen,
   met Viterbi gekozen zodat de bas zo veel mogelijk met halve of hele stappen loopt; progression.js laat dan ook de
   laagste noot van de gitaarvorm die lijn volgen). Naar walkLine()/bassFor() in toonladder/backing.js en near() in sound.js,
   maar zonder toeval: wat op het scherm staat, is wat de bas speelt. Bereik E1–C3 (MIDI 28–48), zoals een contrabas;
   op de hals een octaaf hoger (zo noteer je gitaar). Alle namen hier beginnen met bs/BS: de scripts delen één scope. */
const BS_LINES=['roots','r5','approach','walk','step'];
const BS_LO=28,BS_HI=45,BS_TOP=48;   /* grondtonen tot A2, walking tot C3 */
/* toonladder per akkoordsoort (halve tonen boven de grondtoon): waar de walking bass zijn doorgangsnoten uit haalt */
const BS_SC=(()=>{const g={ion:[0,2,4,5,7,9,11],lyd:[0,2,4,6,7,9,11],lydA:[0,2,4,6,8,9,11],dor:[0,2,3,5,7,9,10],mel:[0,2,3,5,7,9,11],
    mix:[0,2,4,5,7,9,10],phd:[0,1,4,5,7,8,10],alt:[0,1,3,4,6,8,10],lydD:[0,2,4,6,7,9,10],wt:[0,2,4,6,8,10],loc:[0,1,3,5,6,8,10],dim:[0,2,3,5,6,8,9,11]},
  m={ion:'maj 6 69 add9 maj7 maj9',lyd:'maj7s11',lydA:'maj7s5',dor:'m m6 madd9 m7 m9 m11',mel:'mMaj7',mix:'7 9 13 sus2 sus4 7sus4 9sus4',
    phd:'7b9',alt:'7s9 7alt',lydD:'7s11',wt:'7b5 7s5 aug',loc:'m7b5',dim:'dim dim7'},o={};
  Object.keys(m).forEach(k=>m[k].split(' ').forEach(q=>{o[q]=g[k];}));return o;})();
const bsFirst=c=>c.bassPc!=null?c.bassPc:c.rootPc;
const bsScale=c=>new Set((BS_SC[c.q]||BS_SC.maj).map(x=>mod(c.rootPc+x,12)));
/* akkoordtonen zonder spanningen (grondtoon, terts, kwint, septiem/sext), plus een eventuele slash-bas */
function bsCore(c){const s=new Set(QUAL[c.q].iv.filter(x=>x<12).map(x=>mod(c.rootPc+x,12)));if(c.bassPc!=null)s.add(c.bassPc);return s;}
function bsNear(pc,ref){let best=null;for(let m=BS_LO;m<=BS_HI;m++)if(mod(m,12)===pc&&(best==null||Math.abs(m-ref)<Math.abs(best-ref)))best=m;return best;}
/* naam van een basnoot, gespeld bij het akkoord (een slash-bas zoals hij geschreven is) */
function bsSpell(c,pc){if(c.bass&&pc===c.bassPc)return c.bass;if(pc===c.rootPc)return c.root;
  return nice(spellPc(mod(c.root.l+LABDEG[ivLab(mod(pc-c.rootPc,12),c.q)]-1,7),pc));}
/* interval t.o.v. het akkoord: akkoordtonen zoals in de diagrammen, andere noten als toonladdertrap */
const BS_DEG=['R','♭2','2','♭3','3','4','♭5','5','♭6','6','♭7','7'];
function bsLab(c,pc){const s=mod(pc-c.rootPc,12);return QUAL[c.q].iv.some(x=>x<12&&mod(x,12)===s)?ivName(s,c.q):BS_DEG[s];}

/* naderingsnoot naar tgt (MIDI) vanaf cur: kom je van onderen, dan een halve toon eronder; van boven een toonladderstap
   erboven (anders een halve toon). Chromatisch of diatonisch volgt uit de toonladder van het huidige akkoord. */
function bsApproach(c,tgt,cur,k){const sc=bsScale(c),up=cur<tgt||cur===tgt&&k%2===0;
  const dia=d=>{for(const s of [1,2]){const m=tgt+d*s;if(sc.has(mod(m,12)))return m;}return null;};
  const opts=(up?[tgt-1,dia(-1),dia(1),tgt+1]:[dia(1),tgt+1,tgt-1,dia(-1)]).filter(m=>m!=null&&m>=BS_LO&&m<=BS_TOP&&m!==cur&&m!==tgt);
  const m=opts.length?opts[0]:tgt;return{m,kind:sc.has(mod(m,12))?'dia':'chr',below:m<tgt};}
/* walking: tel 1 = basnoot, dan akkoordtonen (vooral op 3) en toonladdertonen, in de richting van het volgende akkoord */
function bsWalk(c,R,tgt,n,k){const ch=bsCore(c),pool=new Set([...ch,...bsScale(c)]),line=[R];
  for(let i=1;i<n-1;i++){const cur=line[i-1],left=n-1-i;let best=null,bs=-1e9;
    for(let m=Math.max(BS_LO,cur-7);m<=Math.min(BS_TOP,cur+7);m++){if(m===cur||!pool.has(mod(m,12)))continue;
      let s=0;if(ch.has(mod(m,12)))s+=i%4===0?3:i%2===0?2.2:1.2;
      s-=Math.abs(Math.abs(m-tgt)-left*2)*.55;                     /* richting het volgende akkoord blijven bewegen */
      if(Math.abs(m-cur)>4)s-=1;
      if(i>1&&m===line[i-2])s-=1.5;                                /* niet heen en weer */
      if(i%4&&i>3&&m===line[i-4])s-=.8;                            /* lange akkoorden: niet elke maat hetzelfde */
      if(mod(m,12)===mod(tgt,12))s-=1.5;                           /* het volgende akkoord niet al voorspellen */
      s+=((k*7+i*13+m*5)%9)/9*.9;                                  /* vaste "toevalsvariatie": elk akkoord net anders */
      if(s>bs){bs=s;best=m;}}
    line.push(best==null?cur:best);}
  return line;}
/* kwint van het akkoord (of ♭5/♯5) dicht bij de basnoot; is de slash-bas zelf de kwint, dan de grondtoon */
function bsFifth(c,R){const iv=QUAL[c.q].iv.map(x=>mod(x,12)),f=[7,6,8].find(x=>iv.includes(x));
  let pc=mod(c.rootPc+(f==null?7:f),12);if(pc===mod(R,12))pc=c.rootPc;
  let best=null;for(let m=BS_LO;m<=BS_HI;m++)if(mod(m,12)===pc&&m!==R&&(best==null||Math.abs(m-R)<Math.abs(best-R)))best=m;return best==null?R:best;}

/* Stepwise: per akkoord een basnoot (grondtoon of omkering) zodat de bas met halve/hele stappen loopt, zoals C – G/B – Am – Am/G.
   Een geschreven slash-bas ligt vast. Alleen noten waar de gekozen soort voicing ook een vorm op heeft (laagste noot).
   Kosten: grondtoon 0, terts .5, septiem .8, kwint 1.4 (eerste akkoord ×2.5, laatste ×2: begin en eind graag op de grondtoon);
   stap 0, zelfde noot .8, terts 1.6, kwart 2.2, tritonus 2.6. */
const BS_W=[0,.5,1.4,.8],BS_MV=[.8,0,0,1.6,1.6,2.2,2.6];
function bsStep(X){if(!X.length)return[];
  const C=X.map(x=>{const c=x.c;if(c.bassPc!=null)return[{pc:c.bassPc,w:0}];
    const all=[...bsCore(c)].map(pc=>{const r=ROLE[ivName(mod(pc-c.rootPc,12),c.q)];return{pc,w:r==null?1.5:BS_W[r]};});
    const lows=new Set((x.vs||[]).map(v=>v.notes[0].pc)),ok=all.filter(o=>lows.has(o.pc));
    return ok.length?ok:all;});
  const mv=(a,b)=>{const d=mod(b-a,12);return BS_MV[Math.min(d,12-d)];};
  let cost=C[0].map(o=>o.w*2.5);const back=[];
  for(let i=1;i<C.length;i++){const nc=[],bk=[];
    C[i].forEach(o=>{let best=1e9,bi=0;C[i-1].forEach((u,j)=>{const k=cost[j]+mv(u.pc,o.pc);if(k<best){best=k;bi=j;}});nc.push(best+o.w*(i===C.length-1?2:1));bk.push(bi);});
    cost=nc;back.push(bk);}
  let j=cost.indexOf(Math.min(...cost));const out=[C[C.length-1][j].pc];
  for(let i=C.length-2;i>=0;i--){j=back[i][j];out.unshift(C[i][j].pc);}
  return out;}

/* alle akkoorden: X = [{c, bars, bsPc (alleen Stepwise)}] → per akkoord [{b, len (tellen), m (MIDI), pc, v, name, lab, ap}];
   ap = {kind: 'chr'|'dia', to: naam van de doelnoot} bij een naderingsnoot. Na het laatste akkoord komt het eerste weer (loop). */
function bsLines(X,kind){let prev=36;
  return X.map((x,k)=>{const c=x.c,nx=X[(k+1)%X.length],n=Math.max(2,Math.round(x.bars*4)),
      pc=kind==='step'&&x.bsPc!=null?x.bsPc:bsFirst(c),npc=kind==='step'&&nx.bsPc!=null?nx.bsPc:bsFirst(nx.c),
      R=bsNear(pc,prev),tgt=bsNear(npc,R),ev=[];
    const add=(b,len,m,v,ap)=>ev.push({b,len,m,pc:mod(m,12),v,ap:ap||null});
    /* naderingsnoot op tel b: diatonisch gespeld zoals in de toonladder, chromatisch vanaf de doelnoot (F♯ → G, A♭ → G) */
    const appr=(b,cur)=>{const a=bsApproach(c,tgt,cur,k),tn=bsSpell(nx.c,npc),pc=mod(a.m,12);
      add(b,1,a.m,100,{kind:a.kind,to:nName(tn),sp:a.kind==='dia'?bsSpell(c,pc):nice(spellPc(mod(tn.l+(a.below?-1:1),7),pc))});};
    if(kind==='walk'){const line=bsWalk(c,R,tgt,n,k);line.forEach((m,i)=>add(i,1,m,i%2?104:96));appr(n-1,line[n-2]);}
    else if(kind==='approach'){for(let b=0;b<n-2;b+=2)add(b,2,R,104);add(n-2,1,R,100);appr(n-1,R);}
    else if(kind==='r5'){const F=bsFifth(c,R);for(let b=0;b<n;b+=2)add(b,Math.min(2,n-b),(b/2)%2?F:R,104);}
    else for(let b=0;b<n;b+=2)add(b,Math.min(2,n-b),R,104);   /* roots en stepwise: halve noten */
    ev.forEach(e=>{e.name=e.ap?nName(e.ap.sp):nName(bsSpell(c,e.pc));e.lab=bsLab(c,e.pc);});
    prev=ev[ev.length-1].m;return ev;});}
/* voor het scherm: dezelfde noot achter elkaar maar één keer */
function bsShow(ev){const out=[];(ev||[]).forEach(e=>{const l=out[out.length-1];if(l&&l.m===e.m&&!e.ap)return;out.push(e);});return out;}
/* ritme per stijl: bossa speelt een halve noot als "dum . . d" (gepunteerde kwart + achtste op dezelfde noot) */
function bsFeel(ev,style){if(style!=='bossa')return ev;const out=[];
  ev.forEach(e=>{if(e.len<2){out.push(e);return;}
    out.push(Object.assign({},e,{len:1.4}),Object.assign({},e,{b:e.b+1.5,len:.45,v:e.v-8}));
    if(e.len>=3)out.push(Object.assign({},e,{b:e.b+2,len:e.len-2.1}));});
  return out;}
/* op de hals: een octaaf hoger op de lage E-, A-, D- en G-snaar, in positie spelen (de hand schuift alleen als het moet).
   X = akkoorden met bl (zie bsLines) → per akkoord per getoonde noot {s, f} */
function bsFrets(X){let hand=1;
  return X.map(x=>bsShow(x.bl).map(e=>{const m=e.m+12;let best=null,bc=1e9;
    for(let s=0;s<4;s++){const f=m-OPEN[s];if(f<0||f>MAXF)continue;
      const k=(f===0?.4:f<hand?hand-f:f>hand+3?f-hand-3:0)+s*.05;if(k<bc){bc=k;best={s,f};}}
    if(best&&best.f>0){if(best.f<hand)hand=best.f;else if(best.f>hand+3)hand=best.f-3;}
    return best;}));}
