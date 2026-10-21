'use strict';
/* ═══════════ 6. RENDER ═══════════ */
const $=(s,r)=>(r||document).querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function lum(h){const c=hexRGB(h).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];}
function hexRGB(h){h=String(h).replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16)||0;return [(n>>16)&255,(n>>8)&255,n&255];}
function textOn(h){const L=lum(h);return (L+0.05)/0.05>1.05/(L+0.05)?'#141210':'#ffffff';}
function colorOf(k,n){return state[k].cmode==='degree'?state.set.palette[n.iv]:state[k].color;}
function labOf(k,n){const m=D&&D.lab?D.lab:state[k].label;return m==='note'?n.name:(m==='deg'?n.label:'');}
function fsz(t,r){const n=[...t].length;return r*(n<=1?1.02:n===2?0.92:n===3?0.74:0.6);}

/* geometrie van het bord (SVG-eenheden). X0 = de kam; links daarvan alleen snaarnamen en open snaren, zonder hout. */
const G={X0:70,W:1300,TOP:34,GAP:44,PAD:22,VBW:1390,VBH:350};

function dotG(o){
  const {cx,cy,r,fill,fill2,tc,l1,l2,ring,title,pc,cls,sq}=o;
  let s='<g class="n'+(cls?' '+cls:'')+'" data-pc="'+pc+'"><title>'+esc(title)+'</title>';
  if(sq){
    const h=r*0.9,R=h+3.4;
    if(ring&&ring.length) s+='<rect x="'+(cx-R)+'" y="'+(cy-R)+'" width="'+2*R+'" height="'+2*R+'" rx="'+R*0.4+'" fill="none" stroke="'+ring[ring.length-1]+'" stroke-width="2.2"/>';
    s+='<rect class="core" x="'+(cx-h)+'" y="'+(cy-h)+'" width="'+2*h+'" height="'+2*h+'" rx="'+h*0.32+'" fill="'+fill+'"/>';
    if(l1) s+='<text x="'+cx+'" y="'+cy+'" dy=".35em" text-anchor="middle" font-size="'+fsz(l1,r)+'" fill="'+tc+'">'+esc(l1)+'</text>';
    return s+'</g>';
  }
  if(ring&&ring.length){
    const R=r+3.4,C=2*Math.PI*R;
    if(ring.length===1) s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="'+ring[0]+'" stroke-width="2.2"/>';
    else s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="'+ring[0]+'" stroke-width="2.2" stroke-dasharray="'+C/2+' '+C/2+'"/>'
          +'<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="'+ring[1]+'" stroke-width="2.2" stroke-dasharray="'+C/2+' '+C/2+'" stroke-dashoffset="'+C/2+'"/>';
  }
  if(fill2){
    s+='<path class="core" d="M'+cx+' '+(cy-r)+'A'+r+' '+r+' 0 0 0 '+cx+' '+(cy+r)+'Z" fill="'+fill+'"/>'
      +'<path class="core" d="M'+cx+' '+(cy-r)+'A'+r+' '+r+' 0 0 1 '+cx+' '+(cy+r)+'Z" fill="'+fill2+'"/>';
  }else s+='<circle class="core" cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+fill+'"/>';
  const halo=fill2?' stroke="rgba(0,0,0,.6)" stroke-width="2.4" paint-order="stroke" stroke-linejoin="round"':'';
  if(l1&&l2){
    const f=r*0.6;
    s+='<text x="'+cx+'" y="'+(cy-r*0.36)+'" dy=".35em" text-anchor="middle" font-size="'+f+'" fill="'+tc+'"'+halo+'>'+esc(l1)+'</text>'
      +'<text x="'+cx+'" y="'+(cy+r*0.42)+'" dy=".35em" text-anchor="middle" font-size="'+f+'" fill="'+tc+'"'+halo+'>'+esc(l2)+'</text>';
  }else if(l1){
    s+='<text x="'+cx+'" y="'+cy+'" dy=".35em" text-anchor="middle" font-size="'+fsz(l1,r)+'" fill="'+tc+'"'+halo+'>'+esc(l1)+'</text>';
  }
  return s+'</g>';
}

function renderBoard(){
  const S=state.set,TN=D.tuning,r=+S.dotSize,sp=S.fretSpacing;
  const fx=n=>G.X0+(sp==='equal'?G.W*n/MAXF:G.W*(1-Math.pow(2,-n/12))/(1-Math.pow(2,-MAXF/12)));
  const cxF=n=>n===0?G.X0-26:(fx(n-1)+fx(n))/2;
  const cyS=s=>G.TOP+G.PAD+(5-s)*G.GAP;
  const yTop=G.TOP,yBot=G.TOP+2*G.PAD+5*G.GAP,xEnd=G.X0+G.W+18,R=9;
  const regs=D.sel.length?D.sel.flatMap(i=>D.positions[i].instances):null;
  const vis=(X,s,f)=>{
    if(!regs) return true;
    if(regs.some(g=>g.key)&&!regs.some(g=>g.key===X)) return true;   /* Martino: voor deze kant geen vorm gekozen */
    const isRef=X===D.refKey;
    return regs.some(g=>{
      if(g.key){if(g.key!==X)return false;return !!g.rows[s]&&f>=g.rows[s][0]&&f<=g.rows[s][1];}   /* Martino-vorm van A of B */
      if(isRef) return g.cells?g.cells.has(s+':'+f):(f>=g.lo&&f<=g.hi);
      if(g.rows) return !!g.rows[s]&&f>=g.rows[s][0]&&f<=g.rows[s][1];
      return f>=g.lo&&f<=g.hi;
    });
  };
  let vb='0 0 '+G.VBW+' '+G.VBH,zm='';
  const wholeF=!!(D.prog&&D.fA&&!state.pv.fzoom);       /* Martino-vormen over de hele hals (niet inzoomen) */
  if(D.prog&&regs&&!wholeF){                                    /* progressie met venster: inzoomen rond de positie */
    const lo=Math.min(...regs.map(z=>z.lo)),hi=Math.max(...regs.map(z=>z.hi)),left=lo<=0?G.X0-50:fx(lo-1),right=fx(Math.min(hi,MAXF)),
      c=(left+right)/2,vw=Math.min(G.VBW,Math.max(780,right-left+140));   /* breed genoeg voor twee vormen */
    vb=Math.max(0,Math.min(G.VBW-vw,c-vw/2)).toFixed(1)+' 0 '+vw+' '+G.VBH;zm=' data-c="'+c.toFixed(1)+'" data-vw="'+vw.toFixed(1)+'"';}   /* fitBoard mag breder */
  $('#board').classList.toggle('zoom',!!(D.prog&&regs&&!wholeF));
  let o='<svg viewBox="'+vb+'"'+zm+' data-vb="'+vb+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+esc(T.board.aria)+'">';
  /* effen hout vanaf de kam, afgeronde hoeken alleen aan het eind */
  o+='<path class="bwood" d="M'+G.X0+' '+yTop+'H'+(xEnd-R)+'Q'+xEnd+' '+yTop+' '+xEnd+' '+(yTop+R)+'V'+(yBot-R)+'Q'+xEnd+' '+yBot+' '+(xEnd-R)+' '+yBot+'H'+G.X0+'Z"/>';
  if(S.inlays){
    const cyM=(cyS(2)+cyS(3))/2,c1=(cyS(1)+cyS(2))/2,c2=(cyS(4)+cyS(3))/2;
    [3,5,7,9,15,17,19,21].forEach(n=>{o+='<circle class="inl" cx="'+cxF(n)+'" cy="'+cyM+'" r="6.5"/>';});
    o+='<circle class="inl" cx="'+cxF(12)+'" cy="'+c1+'" r="6.5"/><circle class="inl" cx="'+cxF(12)+'" cy="'+c2+'" r="6.5"/>';
  }
  for(let n=1;n<=MAXF;n++) o+='<line class="wire" x1="'+fx(n)+'" y1="'+yTop+'" x2="'+fx(n)+'" y2="'+yBot+'" stroke-width="4"/>';
  o+='<rect class="nutr" x="'+(G.X0-6)+'" y="'+yTop+'" width="7" height="'+(yBot-yTop)+'"/>';
  D.bands=[];
  if(regs){
    D.sel.forEach(i=>D.positions[i].instances.forEach(g=>{
      const x1=g.lo<=0?G.X0-50:fx(g.lo-1)+1.5,x2=fx(Math.min(g.hi,MAXF))-1.5;
      D.bands.push([x1,x2]);
      const kc=g.key?' style="--bc:'+state[g.key].color+'"':'';
      o+='<rect class="band'+(g.key?' bk':'')+'" x="'+x1+'" y="'+(yTop-8)+'" width="'+Math.max(6,x2-x1)+'" height="'+(yBot-yTop+16)+'" rx="10"'+kc+'/>'
        +(g.key?'<text class="bandl bk" x="'+(g.key==='A'?x1+8:x2-8)+'" y="'+(yTop-13)+'" style="--bc:'+state[g.key].color+';text-anchor:'+(g.key==='A'?'start':'end')+'">'+g.key+' · '+PT.formN(D.positions[i].n)+'</text>'   /* A links, B rechts */
          :'<text class="bandl" x="'+((x1+x2)/2)+'" y="'+(yTop-13)+'">'+(D.sys==='custom'?'':(D.sys==='forms'?PT.formN(D.positions[i].n):D.positions[i].n))+'</text>');
    }));
  }
  for(let s=0;s<6;s++){
    const w=(3.2-s*0.42).toFixed(2);
    o+='<line class="stro" x1="'+(G.X0-50)+'" y1="'+cyS(s)+'" x2="'+(G.X0-6)+'" y2="'+cyS(s)+'" stroke-width="'+w+'"/>'
      +'<line class="strl" x1="'+G.X0+'" y1="'+cyS(s)+'" x2="'+xEnd+'" y2="'+cyS(s)+'" stroke-width="'+w+'"/>';
    if(S.stringNames) o+='<text class="snm" x="14" y="'+(cyS(s)+4)+'">'+esc(TN.names[s])+'</text>';
  }
  if(S.fretNums!=='off'){
    const marks=[3,5,7,9,12,15,17,19,21];
    for(let n=1;n<=MAXF;n++){
      const k=marks.includes(n); if(S.fretNums==='marks'&&!k) continue;
      o+='<text class="fnum'+(k?' k':'')+'" x="'+cxF(n)+'" y="'+(yBot+22)+'">'+n+'</text>';
    }
  }
  if(D.prog&&!D.pcmp){o+=progDots(TN,r,cxF,cyS,regs)+'</svg>';$('#board').innerHTML=o;return;}
  /* noten */
  const back=[],front=[];
  const st={AB:0,A:0,B:0},foc=S.cmpFocus,cmp=D.cmp;
  for(let s=0;s<6;s++)for(let f=0;f<=MAXF;f++){
    const pc=mod(TN.open[s]+f,12);
    const a=D.showA?D.A.pcMap.get(pc):null,b=D.B?D.B.pcMap.get(pc):null;
    if(!a&&!b) continue;
    const visible=!!((a&&vis('A',s,f))||(b&&vis('B',s,f)));
    if(!visible&&S.outside!=='faint'&&!wholeF) continue;               /* hele hals: noten buiten de vorm vaag */
    const cls=a&&b?'AB':(a?'A':'B');
    const dim=cmp&&((foc==='diff'&&cls==='AB')||(foc==='same'&&cls!=='AB'));
    let fill,fill2=null;
    if(cls==='A') fill=colorOf('A',a);
    else if(cls==='B') fill=colorOf('B',b);
    else if(S.sharedStyle==='split'){fill=colorOf('A',a);fill2=colorOf('B',b);}
    else fill=S.colShared;
    const la=a?labOf('A',a):'',lb=b?labOf('B',b):'';
    let l1,l2='';
    if(cls==='A') l1=la; else if(cls==='B') l1=lb;
    else if(S.sharedLabel==='B') l1=lb||la;
    else{l1=la||lb;if(S.sharedLabel==='both'&&la&&lb&&la!==lb){l1=la;l2=lb;}}
    const ring=[];
    if(a&&a.iv===0&&(state.A.cmode==='fixed'||cmp)) ring.push(state.A.color);
    if(b&&b.iv===0&&(state.B.cmode==='fixed'||cmp)) ring.push(state.B.color);
    const parts=[];
    if(a) parts.push('A: '+a.name+' ('+a.label+')');
    if(b) parts.push('B: '+b.name+' ('+b.label+')');
    const title=T.board.dot(6-s,TN.names[s],f,parts.join(' · '));
    const cx=cxF(f),cy=cyS(s),sq=cls==='B'&&cmp&&S.shapeB;
    if(!visible||dim){
      back.push(dotG({cx,cy,r:r*0.5,fill,fill2,tc:'#fff',l1:'',l2:'',ring:null,title,pc,cls:visible?'dim':'faint',sq}));
      continue;
    }
    st[cls]++;
    front.push(dotG({cx,cy,r,fill,fill2,tc:fill2?'#fff':textOn(fill),l1,l2,ring:ring.length?ring:null,title,pc,cls:'',sq}));
  }
  const rings=(D.shapeRings||[]).filter(([s,f])=>f>=0&&f<=MAXF).map(([s,f])=>'<circle class="shp on" cx="'+cxF(f)+'" cy="'+cyS(s)+'" r="'+(r+6)+'"/>').join('');   /* m7-grepen van de vormen */
  o+=back.join('')+front.join('')+rings+'</svg>';
  D.stats=st;
  $('#board').innerHTML=o;
}

/* Bord in de resterende hoogte van het middenvak (#scroll), zodat niets scrolt. Ingezoomd (venster) wordt het beeld breder:
   meer frets eromheen in plaats van een hoger bord; daarna (of op de hele hals) wordt het bord lager en staat het in het midden.
   Nooit lager dan BMIN: past het dan nog niet, dan scrolt het middenvak. Geeft {h: hoogte, nat: hoogte zonder passen, fit: past alles}. */
const BMIN=200;
function fitBoard(){
  const svg=$('#board svg'),sc=$('#scroll'),wrap=sc&&sc.firstElementChild,bd=$('#board');
  if(!svg||!wrap)return{h:0,nat:0,fit:true};
  svg.setAttribute('viewBox',svg.dataset.vb);svg.style.height='';bd.style.minWidth='';
  /* gemeten tot onder de bordkaart: de vergelijkingskaart (Compare A / B) eronder mag, net als vroeger, scrollen */
  const cs=getComputedStyle(sc),room=sc.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom),
    bx=svg.getBoundingClientRect(),nat=bx.height,
    avail=Math.floor(room-($('#cardBoard').getBoundingClientRect().bottom-wrap.getBoundingClientRect().top-nat))-2;
  if(nat<=avail)return{h:nat,nat,fit:true};
  const t=Math.max(BMIN,avail),zc=+svg.dataset.c,zw=+svg.dataset.vw;let h=nat;
  if(zw&&bx.width){const vw=Math.min(G.VBW,Math.max(zw,bx.width*G.VBH/t)),x=Math.max(0,Math.min(G.VBW-vw,zc-vw/2));
    svg.setAttribute('viewBox',x.toFixed(1)+' 0 '+vw.toFixed(1)+' '+G.VBH);h=bx.width*G.VBH/vw;}
  if(h>t+.5){svg.style.height=t+'px';bd.style.minWidth='0';h=t;}
  return{h,nat,fit:avail>=BMIN};
}

/* Smal scherm: na het kiezen van een positie die positie in beeld schuiven (alleen als de keuze verandert). */
let lastSelKey=null;
function scrollToSel(){
  const key=D.sys+'|'+D.sel.join(',')+'|'+D.refKey+'|'+(D.bands[0]||[]).join(',');
  if(key===lastSelKey) return;
  lastSelKey=key;
  const w=$('.bwrap'),svg=$('#board svg');
  if(!D.bands.length||!svg||w.scrollWidth<=w.clientWidth+1) return;
  const k=svg.getBoundingClientRect().width/G.VBW,[x1,x2]=D.bands[0];
  const left=Math.max(0,((x1+x2)/2)*k-w.clientWidth/2);
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  w.scrollTo({left,behavior:reduce?'auto':'smooth'});
}

function renderLegend(){
  const S=state.set,cmp=D.cmp,L=T.legend;
  const sw=(bg,t,sq)=>'<span class="lg"><i style="background:'+bg+(sq?';border-radius:3px':'')+'"></i>'+esc(t)+'</span>';
  if(D.prog&&!D.pcmp){const pv=state.pv;
    $('#legend').innerHTML=(pv.tones?sw(CT,PT.legTone):'')+(pv.scale?sw(ST,PT.legScale):'')+(pv.tones&&pv.scale?sw(CT,PT.legOut,true):'')
      +'<span class="lg" style="color:var(--tx)"><i class="ring"></i><span style="color:var(--mut)">'+esc(PT.legRoot)+'</span></span>'
      +(pv.guide?'<span class="lg"><i class="gdl"></i>'+esc(PT.legGuide)+'</span>':'')
      +(D.fA?'<span class="lg"><i class="ring" style="border-color:'+SHAPE_C+'"></i>'+esc(PT.legShape(mName(D.ch)))+'</span>':'');return;}
  const sqB=k=>k==='B'&&cmp&&S.shapeB;
  let h='';
  ['A','B'].forEach(k=>{
    if(!D[k]||(k==='A'&&!D.showA)) return;
    const nm=scaleTitle(D[k]);
    if(state[k].cmode==='degree'){
      h+='<span class="lg"><b>'+esc(cmp?L.only(k)+(sqB(k)?L.square:''):L.perDeg)+':</b> '+esc(nm)+' <span class="dg">'
        +D[k].notes.map(n=>{const c=colorOf(k,n);return '<span style="background:'+c+';color:'+textOn(c)+'">'+esc(n.label)+'</span>';}).join('')+'</span></span>';
    }else h+=sw(state[k].color,(cmp?L.only(k)+(sqB(k)?L.square:'')+': ':'')+nm,sqB(k));
  });
  if(cmp){
    const bg=S.sharedStyle==='split'?'linear-gradient(90deg,'+state.A.color+' 50%,'+state.B.color+' 50%)':S.colShared;
    h+=sw(bg,L.both);
  }
  h+='<span class="lg" style="color:var(--tx)"><i class="ring"></i><span style="color:var(--mut)">'+esc(L.root)+'</span></span>';
  if(cmp&&S.cmpFocus==='diff') h+='<span>'+esc(L.diff)+'</span>';
  if(cmp&&S.cmpFocus==='same') h+='<span>'+esc(L.same)+'</span>';
  if(D.shapeRings&&D.shapeRings.length)h+='<span class="lg"><i class="ring" style="border-color:'+SHAPE_C+'"></i>'+esc(PT.legShapes)+'</span>';
  $('#legend').innerHTML=h;
}

function renderPosBar(){
  $('#sysSel').innerHTML=D.sysList.map(([id,l])=>'<option value="'+id+'"'+(id===D.sys?' selected':'')+'>'+esc(l)+'</option>').join('');
  $('#refWrap').classList.toggle('inv',!D.cmp||D.sys==='martino');
  $('#refSel').value=D.refKey;
  $('#outSel').value=state.set.outside;
  const cust=D.sys==='custom';
  $('#customBox').classList.toggle('inv',!cust);
  if(cust){
    if(document.activeElement!==$('#cLo')) $('#cLo').value=state.set.customLo;
    if(document.activeElement!==$('#cHi')) $('#cHi').value=state.set.customHi;
  }
  const host=$('#posChips');
  if(cust||D.sys==='martino'){host.innerHTML='';return;}            /* Martino: keuze via de vormenkaart */
  let h='<button type="button" class="chip pc" data-p="all" aria-pressed="'+(D.sel.length===0)+'"><b>'+esc(T.pos.whole)+'</b><small>'+esc(T.pos.wholeSub)+'</small></button>';
  D.positions.forEach((p,i)=>{
    h+='<button type="button" class="chip pc" data-p="'+i+'" aria-pressed="'+D.sel.includes(i)+'" title="'+esc(p.title)+'"><b>'+p.n+'</b><small>'+esc(p.sub)+'</small></button>';
  });
  h+='<button type="button" class="chip step" data-p="prev" aria-label="'+esc(T.pos.prev)+'">←</button><button type="button" class="chip step" data-p="next" aria-label="'+esc(T.pos.next)+'">→</button>';
  host.innerHTML=h;
}

function renderNotes(k){
  const host=$('#notes'+k);
  $('#name'+k).textContent=D[k]&&(k!=='A'||D.showA)?scaleTitle(D[k]):'–';
  if(!D[k]||(k==='A'&&!D.showA)){host.innerHTML='';return;}
  const ns=D[k].kind==='arp'?D[k].notes.slice().sort((a,b)=>a.semis-b.semis):D[k].notes;
  host.innerHTML=ns.map(n=>'<span class="nc'+(n.iv===0?' r':'')+'" data-pc="'+n.pc+'" style="--c:'+colorOf(k,n)+'"><b>'+esc(n.name)+'</b><i>'+esc(n.label)+'</i></span>').join('');
}

function renderCompare(){
  const card=$('#cardCmp'),C=T.cmp;
  if(!D.cmp||(D.prog&&!D.pcmp)){card.hidden=true;return;}
  card.hidden=false;$('#hCmp').textContent=D.pcmp?D.ch.sym+' → '+D.ch2.sym:T.ui.compareTitle;
  const A=D.A,B=D.B,cA=state.A.color,cB=state.B.color,cS=state.set.colShared;
  const both=[],onlyA=[],onlyB=[];
  for(let pc=0;pc<12;pc++){const a=A.pcMap.get(pc),b=B.pcMap.get(pc);if(a&&b)both.push([a,b]);else if(a)onlyA.push(a);else if(b)onlyB.push(b);}
  const dotI=c=>'<i style="background:'+c+'"></i>';
  const scope=D.sel.length?C.scope(D.stats.AB,D.stats.A,D.stats.B):'';
  $('#cmpSum').innerHTML='<span>'+dotI(cS)+'<b>'+both.length+'</b> '+C.common+'</span><span>'+dotI(cA)+'<b>'+onlyA.length+'</b> '+C.onlyA+'</span><span>'+dotI(cB)+'<b>'+onlyB.length+'</b> '+C.onlyB+'</span>'
    +(scope?'<span style="color:var(--mut)">'+esc(scope)+'</span>':'');
  const base=A.root.pc;
  let h='<span></span>';
  for(let k=0;k<12;k++) h+='<span class="h">'+INT_LBL[k]+'</span>';
  const row=(lbl,sc,c)=>{
    let r='<span class="l">'+lbl+'</span>';
    for(let k=0;k<12;k++){const n=sc.pcMap.get(mod(base+k,12));
      r+=n?'<span class="cc on" style="--c:'+c+';--ct:'+textOn(c)+'" title="'+esc(lbl+': '+n.name+' = '+C.deg+' '+n.label)+'">'+esc(n.name)+'<small>'+esc(n.label)+'</small></span>':'<span class="cc"></span>';}
    return r;
  };
  h+=row('A',A,cA)+row('B',B,cB);
  h+='<span class="l" style="font-weight:500;color:var(--mut)">'+esc(C.match)+'</span>';
  for(let k=0;k<12;k++){
    const pc=mod(base+k,12),a=A.pcMap.has(pc),b=B.pcMap.has(pc);
    const c=a&&b?cS:(a?cA:(b?cB:''));
    h+='<span class="cc res'+(c?' x':'')+'"'+(c?' style="--c:'+c+'"':'')+'></span>';
  }
  $('#cmpStrip').innerHTML=h;
  const tag=(t,c)=>'<span class="tag" style="--c:'+c+';--ct:'+textOn(c)+'">'+esc(t)+'</span>';
  const none='<span class="tag plain">'+esc(C.none)+'</span>';
  const bothTxt=both.map(([a,b])=>tag(a.name+(a.name!==b.name?' ('+b.name+')':'')+' · A: '+a.label+' = B: '+b.label,cS)).join('')||none;
  const aTxt=onlyA.map(n=>tag(n.name+' · A: '+n.label,cA)).join('')||none;
  const bTxt=onlyB.map(n=>tag(n.name+' · B: '+n.label,cB)).join('')||none;
  const used=new Set(),shifts=[];
  onlyA.forEach(a=>{
    let best=null;
    onlyB.forEach(b=>{
      if(used.has(b.pc)) return;
      const d=mod(b.pc-a.pc+6,12)-6;
      if(Math.abs(d)===1&&(!best||Math.abs(d)<Math.abs(best.d))) best={b,d};
    });
    if(best){used.add(best.b.pc);shifts.push(a.name+' ('+a.label+') → '+best.b.name+' ('+best.b.label+') '+(best.d>0?'+1':'−1'));}
  });
  $('#cmpLists').innerHTML=
    '<div class="li"><b>'+esc(C.hCommon)+'</b>'+bothTxt+'</div>'
   +'<div class="li"><b>'+esc(C.hA)+'</b>'+aTxt+'</div>'
   +'<div class="li"><b>'+esc(C.hB)+'</b>'+bTxt+'</div>'
   +(shifts.length?'<div class="li"><b>'+esc(C.hShift)+'</b>'+shifts.map(t=>'<span class="tag plain">'+esc(t)+'</span>').join('')+'</div>':'');
}
