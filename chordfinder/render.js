/* ═══════════ 5. WEERGAVE ═══════════
   Akkoorddiagram (zelfde tekening als Chord Moves), de hele hals, de knoppen en het raster met vormen. */
const ICON={auto:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  light:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  dark:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor"/></svg>',
  play:'<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5l9.5 5.5L3 12.5z" fill="currentColor"/></svg>',
  arp:'<svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true"><path d="M2 12l4-4 4 2 4-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  prev:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'};
/* volgorde van intervallen in de knoppen (laagste noot, topnoot) */
const IVORDER=['R','♭9','9','2','♯9','♭3','3','4','11','♯11','♭5','5','♯5','♭13','6','13','♭7','7'];
const byIv=(a,b)=>IVORDER.indexOf(a)-IVORDER.indexOf(b);
const labOf=(c,x)=>S.labels==='int'?ivName(mod(x.pc-c.rootPc,12),c.q):S.labels==='note'?toneName(c,x.pc):'';
const fretTxt=v=>v.f.map(x=>x<0?'x':x).join(' ');
const invTxt=(v,short)=>v.inv!=null?(short?T.invShort:T.inv)[v.inv]:T.inBass(v.low);

function seg(host,items,cur,key){host.innerHTML=items.map(([v,l])=>'<button type="button" data-'+key+'="'+esc(v)+'" aria-pressed="'+(v===cur)+'">'+esc(l)+'</button>').join('');}
function chips(host,items,cur,key){host.innerHTML=items.map(([v,l,n])=>'<button type="button" class="chip" data-'+key+'="'+esc(v)+'" aria-pressed="'+(v===cur)+'">'+esc(l)+(n!=null?'<small>'+n+'</small>':'')+'</button>').join('');}

/* akkoorddiagram: verticaal, lage E links. lab(x) = label per noot (standaard: volgens de knop Labels);
   cls(x) = extra klassen per noot (Progression: guide tones, liggende noten);
   losse snaren (fret 0, alleen bij "What's this chord?") als open rondje boven de topkam */
function diagram(c,v,lab,cls){lab=lab||(x=>labOf(c,x));
  const fl=v.notes.filter(x=>x.f>0).map(x=>x.f),lo=fl.length?Math.min(...fl):1,hi=fl.length?Math.max(...fl):1;
  const start=lo<=2&&hi<=4?1:lo,rows=Math.max(4,hi-start+1);
  const X=s=>26+s*17,top=24,step=24,bot=top+rows*step,Y=f=>top+(f-start+.5)*step,W=134;
  let h='<svg viewBox="0 0 '+W+' '+(bot+6)+'" aria-hidden="true"><rect class="wd" x="'+(X(0)-9)+'" y="'+top+'" width="'+(X(5)-X(0)+18)+'" height="'+(rows*step)+'" rx="3"/>';
  for(let r=0;r<=rows;r++)h+='<line class="'+(r===0&&start===1?'nut':'fr')+'" x1="'+(X(0)-9)+'" x2="'+(X(5)+9)+'" y1="'+(top+r*step)+'" y2="'+(top+r*step)+'"/>';
  for(let s=0;s<6;s++)h+='<line class="st" x1="'+X(s)+'" x2="'+X(s)+'" y1="'+top+'" y2="'+bot+'" stroke-width="'+(2.1-s*.25).toFixed(2)+'"/>';
  if(start>1)h+='<text class="fn" x="8" y="'+(Y(start)+3.5)+'" text-anchor="middle">'+start+'</text>';
  v.f.forEach((x,s)=>{if(x<0)h+='<text class="mx" x="'+X(s)+'" y="'+(top-8)+'" text-anchor="middle">×</text>';});
  /* barré-streep: alleen bij barrévormen, als de laagste fret op de buitenste gespeelde snaren ligt en ertussen niets gedempt is */
  if(v.type==='barre'){const us=v.notes.map(x=>x.s),a=us[0],b=us[us.length-1];
    if(b>a&&v.f[a]===v.lo&&v.f[b]===v.lo&&v.f.slice(a,b+1).every(x=>x>=v.lo))h+='<rect class="dt" x="'+(X(a)-7)+'" y="'+(Y(v.lo)-7)+'" width="'+(X(b)-X(a)+14)+'" height="14" rx="7"/>';}
  v.notes.forEach(x=>{const cx=X(x.s),op=x.f===0,cy=op?top-11:Y(x.f),l=lab(x);
    h+='<circle class="'+(op?'op':c&&x.pc===c.rootPc?'rt':'dt')+(cls?cls(x):'')+'" cx="'+cx+'" cy="'+cy+'" r="'+(op?7:8.4)+'"/>';
    if(l)h+='<text class="'+(op?'ol':'dl')+'" x="'+cx+'" y="'+(cy+3)+'" text-anchor="middle">'+esc(l)+'</text>';});
  return h+'</svg>';}

/* de hele hals, horizontaal (hoge e boven, zoals tab). dots = [{s,f,cls,lab,small}];
   cells = klikbare vakjes per snaar en fret (fret 0 = losse snaar, links van de topkam) */
function neckSvg(dots,cells){const F=MAXF,W=46,L=44,top=20,gap=22,bot=top+gap*5,Wt=L+F*W+10,X=f=>f?L+(f-.5)*W:L-21,Y=s=>top+(5-s)*gap;
  let h='<svg viewBox="0 0 '+Wt+' '+(bot+30)+'" aria-hidden="true"><rect class="wd" x="'+L+'" y="'+(top-9)+'" width="'+(F*W)+'" height="'+(gap*5+18)+'" rx="3"/>';
  [3,5,7,9,15].forEach(f=>{h+='<circle class="mk" cx="'+X(f)+'" cy="'+(top+gap*2.5)+'" r="4.5"/>';});
  h+='<circle class="mk" cx="'+X(12)+'" cy="'+(top+gap*1.5)+'" r="4.5"/><circle class="mk" cx="'+X(12)+'" cy="'+(top+gap*3.5)+'" r="4.5"/>';
  for(let f=0;f<=F;f++)h+='<line class="'+(f===0?'nut':'fr')+'" x1="'+(L+f*W)+'" x2="'+(L+f*W)+'" y1="'+(top-9)+'" y2="'+(bot+9)+'"/>';
  for(let s=0;s<6;s++)h+='<line class="st" x1="'+(cells?L-36:L)+'" x2="'+(L+F*W)+'" y1="'+Y(s)+'" y2="'+Y(s)+'" stroke-width="'+(2.1-s*.25).toFixed(2)+'"/>';
  [1,3,5,7,9,12,15].forEach(f=>{h+='<text class="fn" x="'+X(f)+'" y="'+(bot+26)+'" text-anchor="middle">'+f+'</text>';});
  dots.forEach(d=>{const cx=X(d.f),cy=Y(d.s);
    h+='<circle class="'+d.cls+'" cx="'+cx+'" cy="'+cy+'" r="'+(d.small?7:10.5)+'"/>';
    if(d.lab)h+='<text class="'+(d.small?'cl':'nl')+'" x="'+cx+'" y="'+(cy+(d.small?2.8:3.5))+'" text-anchor="middle">'+esc(d.lab)+'</text>';});
  if(cells)for(let s=0;s<6;s++)for(let f=0;f<=F;f++)
    h+='<rect class="cell" data-s="'+s+'" data-f="'+f+'" x="'+(f?L+(f-1)*W:L-42)+'" y="'+(Y(s)-gap/2)+'" width="'+(f?W:42)+'" height="'+gap+'"/>';
  return h+'</svg>';}
/* de gekozen vorm groot, en eventueel alle akkoordtonen klein */
function neck(c,v){const dots=[];
  if(S.allTones){const pcs=new Set(QUAL[c.q].iv.map(x=>mod(c.rootPc+x,12)));if(c.bassPc!=null)pcs.add(c.bassPc);
    for(let s=0;s<6;s++)for(let f=0;f<=MAXF;f++){const pc=mod(OPEN[s]+f,12);if(!pcs.has(pc)||v&&v.f[s]===f)continue;
      dots.push({s,f,small:true,cls:'ct'+(pc===c.rootPc?' cr':''),lab:labOf(c,{pc})});}}
  if(v)v.notes.forEach(x=>dots.push({s:x.s,f:x.f,cls:x.pc===c.rootPc?'rt':'dt',lab:labOf(c,x)}));
  return neckSvg(dots,false);}

/* ── akkoord kiezen ── */
function renderChord(){const c=D.c,inp=$('#inChord');
  if(document.activeElement!==inp)inp.value=c.sym;
  seg($('#segRoot'),ROOTS12.map(r=>[r,r]),ROOTS12.find(r=>nPc(parseNote(r))===c.rootPc),'root');
  $('#qualRows').innerHTML=QGROUPS.map(([g,ids])=>'<div class="frow"><span class="lb">'+esc(T.qg[g])+'</span><div class="chips" role="group" aria-label="'+esc(T.qg[g])+'">'+
    ids.map(id=>'<button type="button" class="chip" data-q="'+id+'" aria-pressed="'+(id===c.q)+'">'+esc(nName(c.root)+QUAL[id].sym)+'</button>').join('')+'</div></div>').join('');}

/* ── soort en filters (de knoppen tonen alleen wat er voor dit akkoord bestaat, met het aantal vormen) ── */
function renderFilters(){const A=D.all;
  seg($('#segType'),VTYPES.map(t=>[t,T.types[t]]),S.type,'type');
  $('#typeHelp').textContent=T.typeHelp[S.type];
  const count=(f)=>{const m=new Map();A.forEach(v=>{const k=f(v);m.set(k,(m.get(k)||0)+1);});return m;};
  const sets=count(v=>v.strs),lows=count(v=>v.low),tops=count(v=>v.top);
  chips($('#chStr'),[['all',T.all],...[...sets.keys()].sort((a,b)=>b[0]-a[0]||(a<b?1:-1)).map(k=>[k,[...k].join(' '),sets.get(k)])],S.str,'str');
  chips($('#chLow'),[['all',T.any],...[...lows.keys()].sort(byIv).map(k=>[k,k,lows.get(k)])],S.low,'low');
  chips($('#chTop'),[['all',T.any],...[...tops.keys()].sort(byIv).map(k=>[k,k,tops.get(k)])],S.top,'top');
  ['#selFrom','#selTo'].forEach((id,i)=>{const el=$(id),cur=i?S.to:S.from;
    el.innerHTML=Array.from({length:MAXF},(_,k)=>k+1).map(f=>'<option value="'+f+'"'+(f===cur?' selected':'')+'>'+f+'</option>').join('');});
  seg($('#segLab'),Object.entries(T.lab),S.labels,'lab');
  seg($('#segGroup'),Object.entries(T.group),S.group,'group');
  $('#tgTones').checked=S.allTones;$('#tgBass').checked=S.bass;}

/* ── de gekozen vorm groot, met de hele hals ── */
function renderDetail(){const c=D.c,v=D.sel,box=$('#detail');
  $('#dTitle').textContent=c.sym;
  if(!v){$('#dBig').innerHTML='';$('#dInfo').innerHTML='<p class="note">'+esc(D.all.length?T.noneFilter:T.noneType(T.types[S.type]))+'</p>';
    $('#dNeck').innerHTML=neck(c,null);box.classList.add('empty');return;}
  box.classList.remove('empty');
  $('#dBig').innerHTML=diagram(c,v);
  const notes=v.notes.map(x=>'<span class="nt"><b>'+esc(toneName(c,x.pc))+'</b><small>'+esc(ivName(mod(x.pc-c.rootPc,12),c.q))+'</small></span>').join('');
  $('#dInfo').innerHTML='<p class="dmeta">'+esc(T.types[v.type])+' · '+esc(invTxt(v))+' · '+esc(T.topIs(v.top))+'</p>'+
    '<p class="cap">'+esc(T.strName(v.strs))+' · '+esc(T.frets)+' <span class="mono">'+esc(fretTxt(v))+'</span></p>'+
    '<h3 style="margin-top:14px">'+esc(T.notes)+'</h3><div class="nts">'+notes+'</div>';
  $('#dNeck').innerHTML=neck(c,v);
  const i=D.order.indexOf(v);$('#btnPrev').disabled=i<=0;$('#btnNext').disabled=i<0||i>=D.order.length-1;}

/* ── raster: per groep een rij vormen, van laag naar hoog op de hals ── */
function groupsOf(list){
  if(S.group==='none')return[{title:'',vs:list}];
  const m=new Map(),key=v=>S.group==='set'?v.strs:v.inv!=null?'i'+v.inv:'b'+v.low;
  list.forEach(v=>{const k=key(v);if(!m.has(k))m.set(k,[]);m.get(k).push(v);});
  let ks=[...m.keys()];
  if(S.group==='set')ks.sort((a,b)=>b[0]-a[0]||(a<b?1:-1));
  else ks.sort((a,b)=>a[0]!==b[0]?(a[0]==='i'?-1:1):a[0]==='i'?a.slice(1)-b.slice(1):byIv(a.slice(1),b.slice(1)));
  return ks.map(k=>({title:S.group==='set'?T.strName(k):k[0]==='i'?T.inv[+k.slice(1)]:T.inBass(k.slice(1)),vs:m.get(k)}));}
function renderResults(){const c=D.c,L=D.list;
  $('#resCount').textContent=T.count(L.length)+(L.length<D.all.length?' / '+D.all.length:'');
  $('#btnShowAll').hidden=L.length===D.all.length;
  if(!L.length){$('#groups').innerHTML='<p class="note">'+esc(D.all.length?T.noneFilter:T.noneType(T.types[S.type]))+'</p>';return;}
  $('#groups').innerHTML=D.groups.map(g=>(g.title?'<h3 class="gh">'+esc(g.title)+' <small>'+g.vs.length+'</small></h3>':'')+'<div class="dgs">'+
    g.vs.map(v=>{const cap=S.group==='inv'?[...v.strs].join(' '):invTxt(v,true);
      return'<button type="button" class="dg'+(v===D.sel?' on':'')+'" data-k="'+v.key+'" aria-pressed="'+(v===D.sel)+'" aria-label="'+esc(T.shapeBtn(c.sym+', '+invTxt(v),fretTxt(v)))+'" title="'+esc(fretTxt(v))+'">'+
        diagram(c,v)+'<span class="cp">'+esc(cap)+' · '+esc(T.topIs(v.top))+'</span></button>';}).join('')+'</div>').join('');}

function applyTheme(){const r=document.documentElement;if(S.theme==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',S.theme);
  const b=$('#btnTheme'),l='Theme: '+T.theme[S.theme];b.innerHTML=ICON[S.theme];b.title=l;b.setAttribute('aria-label',l);}
/* houtsoort, gedeeld met de andere tools ('practiceRoom.board') */
const WOODS={rosewood:'#3e2518',ebony:'#25201d',pauferro:'#6e432a',maple:'#ecd6aa'};
function applyWood(){const b=read(SHARED)||{},c=WOODS[b.wood]||(b.wood==='custom'&&/^#[0-9a-f]{6}$/i.test(b.custom||'')?b.custom:WOODS.rosewood);
  const v=parseInt(c.slice(1),16),l=(.2126*(v>>16&255)+.7152*(v>>8&255)+.0722*(v&255))/255,r=document.documentElement.style;
  r.setProperty('--wd1',c);
  if(l>.55){r.setProperty('--wfret','rgba(110,92,64,.45)');r.setProperty('--wnut','#7d7a73');r.setProperty('--wstr','#6f675b');r.setProperty('--wdot','#2b2620');r.setProperty('--wdtx','#f5efe6');}
  else['--wfret','--wnut','--wstr','--wdot','--wdtx'].forEach(k=>r.removeProperty(k));}
