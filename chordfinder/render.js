/* ═══════════ 5. WEERGAVE ═══════════
   Akkoorddiagram (zelfde tekening als Chord Moves), de hele hals, de knoppen en het raster met vormen. */
const ICON={
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

/* kleur per interval (CSS: iR grondtoon, i3 terts, i5 kwint, i7 septiem (en de 6 die hem vervangt), ix kleurtonen) */
function ivCls(c,x){if(!c||!c.q)return'';const l=ivName(mod(x.pc-c.rootPc,12),c.q);
  return' '+(l==='R'?'iR':/^[♭♯]?3$/.test(l)?'i3':/^[♭♯]?5$/.test(l)?'i5':/^[♭♯]?7$/.test(l)||l==='6'?'i7':'ix');}
/* akkoorddiagram: verticaal, lage E links. lab(x) = label per noot (standaard: volgens de knop Labels);
   cls(x) = extra klassen per noot (Progression: guide tones, liggende noten);
   losse snaren (fret 0, alleen bij "What's this chord?") als open rondje boven de topkam.
   Hals van palissander (verloop #rw uit shared/rail.js) met een vage nerf en inlegstippen op 3 5 7 9 12 15. */
function diagram(c,v,lab,cls){lab=lab||(x=>labOf(c,x));
  const fl=v.notes.filter(x=>x.f>0).map(x=>x.f),lo=fl.length?Math.min(...fl):1,hi=fl.length?Math.max(...fl):1;
  const start=lo<=2&&hi<=4?1:lo,rows=Math.max(4,hi-start+1);
  const X=s=>26+s*17,top=24,step=24,bot=top+rows*step,Y=f=>top+(f-start+.5)*step,W=134;
  let h='<svg class="cd" viewBox="0 0 '+W+' '+(bot+6)+'" aria-hidden="true"><rect class="wd" x="'+(X(0)-9)+'" y="'+top+'" width="'+(X(5)-X(0)+18)+'" height="'+(rows*step)+'" rx="3"/>';
  [.15,1.35,2.2,2.85,3.6,4.4,5.2].forEach(g=>{const x=X(0)+g*17;h+='<line class="gr" x1="'+x+'" x2="'+(x+1.5)+'" y1="'+top+'" y2="'+bot+'"/>';});
  [3,5,7,9,12,15].filter(f=>f>=start&&f<start+rows).forEach(f=>(f===12?[1.5,3.5]:[2.5]).forEach(k=>{h+='<circle class="mk" cx="'+(X(0)+k*17)+'" cy="'+Y(f)+'" r="3.2"/>';}));
  for(let r=0;r<=rows;r++)h+='<line class="'+(r===0&&start===1?'nut':'fr')+'" x1="'+(X(0)-9)+'" x2="'+(X(5)+9)+'" y1="'+(top+r*step)+'" y2="'+(top+r*step)+'"/>';
  for(let s=0;s<6;s++)h+='<line class="st" x1="'+X(s)+'" x2="'+X(s)+'" y1="'+top+'" y2="'+bot+'" stroke-width="'+(1.7-s*.17).toFixed(2)+'"/>';
  if(start>1)h+='<text class="fn" x="8" y="'+(Y(start)+3.5)+'" text-anchor="middle">'+start+'</text>';
  v.f.forEach((x,s)=>{if(x<0)h+='<text class="mx" x="'+X(s)+'" y="'+(top-8)+'" text-anchor="middle">×</text>';});
  /* barré-streep: alleen bij barrévormen, als de laagste fret op de buitenste gespeelde snaren ligt en ertussen niets gedempt is */
  if(v.type==='barre'){const us=v.notes.map(x=>x.s),a=us[0],b=us[us.length-1];
    if(b>a&&v.f[a]===v.lo&&v.f[b]===v.lo&&v.f.slice(a,b+1).every(x=>x>=v.lo))h+='<rect class="dt" x="'+(X(a)-7)+'" y="'+(Y(v.lo)-7)+'" width="'+(X(b)-X(a)+14)+'" height="14" rx="7"/>';}
  v.notes.forEach(x=>{const cx=X(x.s),op=x.f===0,cy=op?top-11:Y(x.f),l=lab(x),k=cls?cls(x):'';
    h+='<circle class="'+(op?'op':(c&&x.pc===c.rootPc?'rt':'dt')+ivCls(c,x))+k+'" cx="'+cx+'" cy="'+cy+'" r="'+(op?7:8.4)+'"'+
      (/\bhd\b/.test(k)?'><title>'+esc(T.pg.heldT)+'</title></circle>':'/>');   /* liggende noot: uitleg bij aanwijzen */
    if(l)h+='<text class="'+(op?'ol':'dl')+'" x="'+cx+'" y="'+(cy+3)+'" text-anchor="middle">'+esc(l)+'</text>';});
  return h+'</svg>';}

/* de hele hals, horizontaal (hoge e boven, zoals tab). dots = [{s,f,cls,lab,small}];
   cells = klikbare vakjes per snaar en fret (fret 0 = losse snaar, links van de topkam) */
function neckSvg(dots,cells){const F=MAXF,W=46,L=44,top=20,gap=22,bot=top+gap*5,Wt=L+F*W+10,X=f=>f?L+(f-.5)*W:L-21,Y=s=>top+(5-s)*gap;
  let h='<svg class="nkb" viewBox="0 0 '+Wt+' '+(bot+30)+'" aria-hidden="true"><rect class="wd" x="'+L+'" y="'+(top-9)+'" width="'+(F*W)+'" height="'+(gap*5+18)+'" rx="3"/>';
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
/* de hele hals liggend en laag (Find voicings, transportplank): hoge e boven, fret 1–15 naar rechts, losse snaar links van de topkam.
   Klein gehouden: hij laat vooral zien wáár de vorm ligt (en met "All chord tones" de akkoordtonen eromheen) */
function neckH(dots){const F=MAXF,W=34,L=26,top=8,G=14,X=f=>f?L+(f-.5)*W:L-13,Y=s=>top+(5-s)*G,bot=top+5*G;
  let h='<svg class="nkh" viewBox="0 0 '+(L+F*W+6)+' '+(bot+22)+'" preserveAspectRatio="xMaxYMid meet" aria-hidden="true"><rect class="wd" x="'+L+'" y="'+(top-6)+'" width="'+(F*W)+'" height="'+(5*G+12)+'" rx="3"/>';
  [3,5,7,9,15].forEach(f=>{h+='<circle class="mk" cx="'+X(f)+'" cy="'+(top+G*2.5)+'" r="3.2"/>';});
  [1.5,3.5].forEach(k=>{h+='<circle class="mk" cx="'+X(12)+'" cy="'+(top+G*k)+'" r="3.2"/>';});
  for(let f=0;f<=F;f++)h+='<line class="'+(f?'fr':'nut')+'" x1="'+(L+f*W)+'" x2="'+(L+f*W)+'" y1="'+(top-6)+'" y2="'+(bot+6)+'"/>';
  for(let s=0;s<6;s++)h+='<line class="st" x1="'+(L-22)+'" x2="'+(L+F*W)+'" y1="'+Y(s)+'" y2="'+Y(s)+'" stroke-width="'+(1.7-s*.2).toFixed(2)+'"/>';
  [3,5,7,9,12,15].forEach(f=>{h+='<text class="fn" x="'+X(f)+'" y="'+(bot+19)+'" text-anchor="middle">'+f+'</text>';});
  dots.forEach(d=>{const cx=X(d.f),cy=Y(d.s);h+='<circle class="'+d.cls+(d.f?'':' opn')+'" cx="'+cx+'" cy="'+cy+'" r="'+(d.small?4.6:6.8)+'"/>';
    if(d.lab&&!d.small)h+='<text class="ml" x="'+cx+'" y="'+(cy+2.7)+'" text-anchor="middle">'+esc(d.lab)+'</text>';});
  return h+'</svg>';}
/* de gekozen vorm op de hele hals (liggend), en eventueel alle akkoordtonen klein */
function neck(c,v){const dots=[];
  if(S.allTones){const pcs=new Set(QUAL[c.q].iv.map(x=>mod(c.rootPc+x,12)));if(c.bassPc!=null)pcs.add(c.bassPc);
    for(let s=0;s<6;s++)for(let f=0;f<=MAXF;f++){const pc=mod(OPEN[s]+f,12);if(!pcs.has(pc)||v&&v.f[s]===f)continue;
      dots.push({s,f,small:true,cls:'ct'+(pc===c.rootPc?' cr':''),lab:labOf(c,{pc})});}}
  if(v)v.notes.forEach(x=>dots.push({s:x.s,f:x.f,cls:(x.pc===c.rootPc?'rt':'dt')+ivCls(c,x),lab:labOf(c,x)}));
  return neckH(dots);}

/* ── akkoord kiezen ── (de akkoordsoorten staan in een uitklapvenster achter de knop "Type") */
function renderChord(){const c=D.c,inp=$('#inChord');
  if(document.activeElement!==inp)inp.value=c.sym;
  $('#btnQual').innerHTML=esc(T.qualL)+' <b>'+esc(QUAL[c.q].sym||T.major)+'</b> ▾';
  seg($('#segRoot'),ROOTS12.map(r=>[r,r]),ROOTS12.find(r=>nPc(parseNote(r))===c.rootPc),'root');
  $('#qualRows').innerHTML=QGROUPS.map(([g,ids])=>'<div class="frow"><span class="lb">'+esc(T.qg[g])+'</span><div class="chips" role="group" aria-label="'+esc(T.qg[g])+'">'+
    ids.map(id=>'<button type="button" class="chip" data-q="'+id+'" aria-pressed="'+(id===c.q)+'">'+esc(nName(c.root)+QUAL[id].sym)+'</button>').join('')+'</div></div>').join('');}

/* ── strook "Strings & filters": hetzelfde onderdeel in Find voicings (#fsFind) en Progression (#fsProg) ──
   Altijd zichtbaar is alleen de knop (achter de voicingsoort), met een korte samenvatting van wat er aan staat; open/dicht = S.fOpen (beide modi).
   rows = [{k: sleutel, l: label, cur, items: [[waarde, label, aantal?, title?]]}]; extra = html achteraan (fretbereik, uitleg). */
const sortSets=(a,b)=>b[0]-a[0]||(a<b?1:-1);   /* snarensets: van de lage naar de hoge snaren */
function stripRender(id,rows,extra,sum){const host=$('#'+id),btn=document.querySelector('[data-fs][aria-controls="'+id+'"]');
  host.hidden=!S.fOpen;btn.setAttribute('aria-expanded',S.fOpen);btn.classList.toggle('on',!!sum);
  btn.innerHTML='<span>'+esc(T.filt)+'</span>'+(sum?'<b>'+esc(sum)+'</b>':'')+'<span class="car" aria-hidden="true">▾</span>';
  if(!S.fOpen)return;
  host.innerHTML=rows.map(r=>'<div class="frow"><span class="lb px">'+esc(r.l)+'</span><div class="chips" role="group" aria-label="'+esc(r.l)+'">'+
    r.items.map(([v,l,n,t])=>'<button type="button" class="chip" data-fk="'+r.k+'" data-fv="'+esc(v)+'" aria-pressed="'+(v===r.cur)+'"'+(t?' title="'+esc(t)+'"':'')+'>'+esc(l)+(n!=null?'<small>'+n+'</small>':'')+'</button>').join('')+
    '</div></div>').join('')+(extra||'')+(sum?'<button type="button" class="lnk fclr" data-fclear="1">'+esc(T.fClear)+'</button>':'');}
/* omkering als knoplabel: de laagste noot (interval) → Root / 1st inv / … of "9 in bass" */
const lowTxt=l=>l in ROLE?T.invShort[ROLE[l]]:T.inBass(l);

/* ── soort en filters (de knoppen tonen alleen wat er voor dit akkoord bestaat, met het aantal vormen) ── */
function renderFilters(){const A=D.all;
  seg($('#segType'),VTYPES.map(t=>[t,T.types[t]]).concat([['fav',T.favType]]),S.type,'type');$('#groupRow').hidden=S.type==='fav';
  $('#typeHelp').textContent=T.typeHelp[S.type];
  const count=(f)=>{const m=new Map();A.forEach(v=>{const k=f(v);m.set(k,(m.get(k)||0)+1);});return m;};
  const sets=count(v=>v.strs),lows=count(v=>v.low),tops=count(v=>v.top);
  const sum=[S.str!=='all'&&[...S.str].join(''),S.low!=='all'&&lowTxt(S.low),S.top!=='all'&&T.topIs(S.top),(S.from>1||S.to<MAXF)&&T.frets+' '+S.from+'–'+S.to].filter(Boolean).join(' · ');
  const fo=cur=>Array.from({length:MAXF},(_,k)=>k+1).map(f=>'<option value="'+f+'"'+(f===cur?' selected':'')+'>'+f+'</option>').join('');
  stripRender('fsFind',[
    {k:'str',l:T.strL,cur:S.str,items:[['all',T.all],...[...sets.keys()].sort(sortSets).map(k=>[k,[...k].join(' '),sets.get(k)])]},
    {k:'low',l:T.fInv,cur:S.low,items:[['all',T.any],...[...lows.keys()].sort(byIv).map(k=>[k,lowTxt(k),lows.get(k),T.inBass(k)])]},
    {k:'top',l:T.topL,cur:S.top,items:[['all',T.any],...[...tops.keys()].sort(byIv).map(k=>[k,k,tops.get(k)])]}],
    '<div class="frow"><span class="lb px">'+esc(T.fretL)+'</span><span class="krow"><select data-fr="from" aria-label="From fret">'+fo(S.from)+'</select><span class="cap">'+esc(T.to)+'</span><select data-fr="to" aria-label="To fret">'+fo(S.to)+'</select></span></div>',sum);
  seg($('#segLab'),Object.entries(T.lab),S.labels,'lab');
  seg($('#segGroup'),Object.entries(T.group),S.group,'group');
  $('#tgTones').checked=S.allTones;$('#tgBass').checked=S.bass;}

/* ── de gekozen vorm (transportplank #fdTray): naam, soort, noten, frets, spelen, en de vorm op de hele hals ── */
function renderDetail(){const c=D.c,v=D.sel;
  $('#dTitle').textContent=c.sym;$('#dBig').innerHTML=neck(c,v);$('#fdTray').classList.toggle('empty',!v);
  $('#btnPlay').disabled=$('#btnArp').disabled=$('#dBig').disabled=!v;
  if(!v){$('#dInfo').innerHTML='<p class="dmeta">'+esc(D.all.length?T.noneFilter:noneTxt())+'</p>';$('#btnPrev').disabled=$('#btnNext').disabled=true;return;}
  const notes=v.notes.map(x=>'<span class="fdn"><b>'+esc(toneName(c,x.pc))+'</b><small>'+esc(ivName(mod(x.pc-c.rootPc,12),c.q))+'</small></span>').join('');
  $('#dInfo').innerHTML='<p class="dmeta">'+esc(T.types[v.type])+' · '+esc(invTxt(v))+' · '+esc(T.topIs(v.top))+'</p>'+
    '<p class="fdl" aria-label="'+esc(T.notes)+'">'+notes+'<span class="mono" title="'+esc(T.strName(v.strs))+'">'+esc(fretTxt(v))+'</span></p>';
  const O=D.shown||D.order,i=O.indexOf(v);$('#btnPrev').disabled=i<=0;$('#btnNext').disabled=i<0||i>=O.length-1;}

/* ── favorieten: een verschuifbare vorm = akkoordsoort + voicingsoort + snarenset + interval per snaar (halve tonen boven de grondtoon),
   los van de grondtoon; een favoriet van Cmaj7 staat dus bij elke maj7. S.favs = [{q, t, s, i: [..]}] ── */
const favIv=(c,v)=>v.notes.map(n=>mod(n.pc-c.rootPc,12));
const favId=f=>f.q+'|'+f.t+'|'+f.s+'|'+f.i.join('.');
const favKey=(c,v)=>favId({q:c.q,t:v.type,s:v.strs,i:favIv(c,v)});
let FAVS=new Set();
const favSync=()=>{FAVS=new Set(S.favs.map(favId));};
const isFav=(c,v)=>FAVS.has(favKey(c,v));
function favToggle(c,v){const k=favKey(c,v),j=S.favs.findIndex(f=>favId(f)===k);
  if(j>=0)S.favs.splice(j,1);else if(S.favs.length<300)S.favs.push({q:c.q,t:v.type,s:v.strs,i:favIv(c,v)});
  favSync();save();}
/* keuze "★ Favourites": alle favorieten van deze akkoordsoort, van elke voicingsoort, op deze grondtoon (per soort in volgorde van VTYPES; dezelfde frets één keer) */
function favVoicings(c){const ts=new Set(S.favs.filter(f=>f.q===c.q).map(f=>f.t)),seen=new Set();
  return VTYPES.filter(t=>ts.has(t)).flatMap(t=>voicingsOf(c,t).filter(v=>isFav(c,v))).filter(v=>!seen.has(v.key)&&seen.add(v.key));}
const noneTxt=()=>S.type==='fav'?T.noFavs(QUAL[D.c.q].sym||T.major):T.noneType(T.types[S.type]);

/* ── raster: per groep een rij vormen, van laag naar hoog op de hals; de favorieten (★) als eerste groep ── */
function groupsOf(list){
  /* "★ Favourites": één groep per voicingsoort (Group by geldt hier niet) */
  if(S.type==='fav'){const m=new Map();list.forEach(v=>{if(!m.has(v.type))m.set(v.type,[]);m.get(v.type).push(v);});
    return[...m].map(([t,vs])=>({key:'t'+t,title:T.types[t],tab:T.types[t],vs}));}
  const fv=list.filter(v=>isFav(D.c,v)),fg=fv.length?[{key:'fav',title:T.favT,tab:T.favG,vs:fv}]:[];
  if(S.group==='none')return fg.concat([{key:'all',title:fg.length?T.grpAll:'',tab:T.grpAll,vs:list}]);
  const m=new Map(),key=v=>S.group==='set'?v.strs:v.inv!=null?'i'+v.inv:'b'+v.low;
  list.forEach(v=>{const k=key(v);if(!m.has(k))m.set(k,[]);m.get(k).push(v);});
  let ks=[...m.keys()];
  if(S.group==='set')ks.sort(sortSets);
  else ks.sort((a,b)=>a[0]!==b[0]?(a[0]==='i'?-1:1):a[0]==='i'?a.slice(1)-b.slice(1):byIv(a.slice(1),b.slice(1)));
  return fg.concat(ks.map(k=>({key:k,title:S.group==='set'?T.strName(k):k[0]==='i'?T.inv[+k.slice(1)]:T.inBass(k.slice(1)),
    tab:S.group==='set'?k:k[0]==='i'?T.invShort[+k.slice(1)]:T.inBass(k.slice(1)),vs:m.get(k)})));}
/* De vormen passen altijd op het scherm (de pagina scrolt niet): fitShapes() zoekt de grootste schaal (--fit, FIT_MIN–FIT_MAX maal
   "Diagram size") waarbij alles in het vak past; weinig vormen worden dus groter. Past het ook op FIT_MIN niet, dan één groep tegelijk met tabjes (RES.paged);
   pas als ook één groep niet past, scrolt het vak zelf. RES.paged gaat terug naar false bij een ander akkoord, filter of venster.
   Groepen kiezen (tabjes of kopjes): RES.gsel = gekozen groepen (leeg = alle). Klik = alleen die groep, Shift-klik = erbij of eraf,
   klik op de enige gekozen groep = weer alle. Bij een eigen keuze staat elke vorm er één keer (een favoriet niet nog eens in zijn eigen rij)
   en wordt er niet gebladerd (past het niet, dan scrolt het vak); bij "alle" blijven de rijen heel. */
const FIT_MIN=.68,FIT_MAX=1.5;
const RES={paged:false,page:null,gsel:new Set()};
function groupClick(k,shift){const G=D.groups,g=RES.gsel;
  if(!k)RES.gsel=new Set();
  else if(shift){if(!g.size)G.forEach(x=>{if(x.key!==k)g.add(x.key);});else if(g.has(k))g.delete(k);else g.add(k);
    if(g.size===G.length)g.clear();}
  else if(g.size===1&&g.has(k))g.clear();
  else RES.gsel=new Set([k]);
  RES.paged=false;renderResults();renderDetail();}
function fitShapes(){const g=$('#groups');if(!g||!g.offsetParent)return true;
  g.style.overflow='hidden';   /* tijdens het meten geen schuifbalk: die verandert de breedte en daarmee de uitkomst */
  const fits=f=>{g.style.setProperty('--fit',f);return g.scrollHeight<=g.clientHeight+1;},done=r=>{g.style.overflow='';return r;};
  if(fits(FIT_MAX))return done(true);if(!fits(FIT_MIN))return done(false);
  let lo=FIT_MIN,hi=FIT_MAX;for(let i=0;i<7;i++){const m=(lo+hi)/2;if(fits(m))lo=m;else hi=m;}
  g.style.setProperty('--fit',lo);return done(true);}
function renderResults(){const c=D.c,L=D.list,G=D.groups,tabs=$('#gTabs');
  $('#resCount').textContent=T.count(L.length)+(L.length<D.all.length?' / '+D.all.length:'');
  $('#btnShowAll').hidden=L.length===D.all.length;
  const keys=new Set(G.map(g=>g.key));[...RES.gsel].forEach(k=>{if(!keys.has(k))RES.gsel.delete(k);});
  if(!L.length){tabs.hidden=true;D.shown=[];$('#groups').innerHTML='<p class="note">'+esc(D.all.length?T.noneFilter:noneTxt())+'</p>';return;}
  const own=RES.gsel.size>0,paged=!own&&RES.paged&&G.length>1;let show=own?G.filter(g=>RES.gsel.has(g.key)):G;
  if(paged){const g=G.find(x=>x.key===RES.page)||G.find(x=>x.key!=='fav'&&x.vs.includes(D.sel))||G[0];RES.page=g.key;show=[g];}
  if(own){const seen=new Set();show=show.map(g=>Object.assign({},g,{vs:g.vs.filter(v=>!seen.has(v.key)&&seen.add(v.key))})).filter(g=>g.vs.length);}
  const on=new Set(paged?[RES.page]:own?RES.gsel:[]);
  /* tabjes: All + elke groep (met aantal); ingedrukt = wat er te zien is */
  tabs.hidden=G.length<2;
  tabs.innerHTML='<button type="button" data-g="" aria-pressed="'+!on.size+'">'+esc(T.grpAll)+'</button>'+
    G.map(x=>'<button type="button" data-g="'+esc(x.key)+'" aria-pressed="'+on.has(x.key)+'" title="'+esc((x.title||x.tab)+' · '+T.grpL)+'">'+(x.key==='fav'?'<span class="gst" aria-hidden="true">★</span><span class="vh">'+esc(T.favT)+'</span>':esc(x.tab))+' <small>'+x.vs.length+'</small></button>').join('');
  const seen=new Set();D.shown=show.flatMap(g=>g.vs).filter(v=>!seen.has(v.key)&&seen.add(v.key));   /* volgorde voor ← → */
  $('#groups').innerHTML=show.map(g=>{const t=g.title&&!paged;return'<div class="grp'+(t?'':' solo')+(g.key==='fav'?' gfav':'')+'">'+
    (t?'<button type="button" class="gh" data-g="'+esc(g.key)+'" aria-pressed="'+on.has(g.key)+'" title="'+esc(T.grpL)+'">'+'<span>'+(g.key==='fav'?'<span class="gst" aria-hidden="true">★</span> ':'')+esc(g.title)+'</span> <small>'+g.vs.length+'</small></button>':'')+'<div class="dgs">'+
    g.vs.map(v=>{const cap=S.group==='inv'?[...v.strs].join(' '):invTxt(v,true),fv=isFav(c,v);
      return'<div class="dgw"><button type="button" class="dg'+(v===D.sel?' on':'')+'" data-k="'+v.key+'" aria-pressed="'+(v===D.sel)+'" aria-label="'+esc(T.shapeBtn(c.sym+', '+invTxt(v),fretTxt(v)))+'" title="'+esc(fretTxt(v))+'">'+
        diagram(c,v)+'<span class="cp">'+esc(cap)+' · '+esc(T.topIs(v.top))+'</span></button>'+
        '<button type="button" class="fav'+(fv?' on':'')+'" data-fav="'+v.key+'" aria-pressed="'+fv+'" aria-label="'+esc(fv?T.favOn:T.favOff)+'" title="'+esc(fv?T.favOn:T.favOff)+'">★</button></div>';}).join('')+'</div></div>';}).join('');
  if(!fitShapes()&&!paged&&!own&&G.length>1){RES.paged=true;renderResults();}}

/* grootte van alle akkoorddiagrammen: één CSS-variabele (--dg) waar de rasters en kaarten mee rekenen */
function applyDgSize(){document.documentElement.style.setProperty('--dg',S.dgSize/100);const el=$('#dgSize');el.value=S.dgSize;
  const l=T.dgSize(S.dgSize);el.setAttribute('aria-label',l);el.setAttribute('aria-valuetext',S.dgSize+'%');$('#dgSizeL').title=l;}
/* houtsoort, gedeeld met de andere tools ('practiceRoom.board') */
const WOODS={rosewood:'#3e2518',ebony:'#25201d',pauferro:'#6e432a',maple:'#ecd6aa'};
function applyWood(){const b=read(SHARED)||{},c=WOODS[b.wood]||(b.wood==='custom'&&/^#[0-9a-f]{6}$/i.test(b.custom||'')?b.custom:WOODS.rosewood);
  const v=parseInt(c.slice(1),16),l=(.2126*(v>>16&255)+.7152*(v>>8&255)+.0722*(v&255))/255,r=document.documentElement.style;
  r.setProperty('--wd1',c);
  if(l>.55){r.setProperty('--wfret','rgba(110,92,64,.45)');r.setProperty('--wnut','#7d7a73');r.setProperty('--wstr','#6f675b');r.setProperty('--wdot','#2b2620');r.setProperty('--wdtx','#f5efe6');}
  else['--wfret','--wnut','--wstr','--wdot','--wdtx'].forEach(k=>r.removeProperty(k));}
