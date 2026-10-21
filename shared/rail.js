/* ════════════════════════════════════════════════════════════════════════════
   PRACTICE ROOM · gedeelde schil (hoort bij shared/room.css). Gewoon script, één globale naam: ROOM.
   Zet op de pagina:
     <div class="bgfx photo"></div><div class="bgfx tex"></div><div class="bgfx grain"></div>
     <nav class="rail" data-app="chord-finder"></nav>   (data-base="../" als de pagina in een submap staat)
   en laad dit script ná die elementen: het tekent de icoonbalk, zet de eigen hoek van de kamer als achtergrond
   (home/corners/corner-<app>.jpg, of wat het menu S kiest), maakt de korrel (klein PNG-tegeltje, lichter dan SVG-ruisfilters)
   en zet de palissander-verlopen #rw (diagram, staand) en #rwh (hele hals, liggend) in de pagina.
   De link naar Home krijgt id="lnkHome" (apps zetten daar hun logboek in, zie homeLink()).
   Chord Moves staat bewust niet in de balk.
   Overgang: klik in de balk → html.pr-leave (warme afdekking uit room.css), dan navigeren; achtergrond klaar → LOOK.ready().
   ════════════════════════════════════════════════════════════════════════════ */
const ROOM={
  /* [app-id, bestand, naam, icoon (SVG-inhoud, viewBox 0 0 24 24)] */
  apps:[
    ['room','index.html','Practice Room','<path d="M4 11 12 4l8 7v9H4z"/><path d="M9.5 20v-5h5v5"/>'],
    null,
    ['fretboard','fretboard-trainer.html','Fretboard Trainer','<path d="M3 18c3 0 3-4 6-4s3 4 6 4 3-12 6-12"/><circle cx="9" cy="14" r="1.2"/><circle cx="15" cy="18" r="1.2"/>'],
    ['scale-trainer','toonladder-trainer.html','Scale Trainer','<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M3 10h18M3 14h18M8 6v12M13 6v12M18 6v12"/>'],
    ['chord-finder','chord-finder.html','Chord Finder','<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M5 7h14M9.7 3v18M14.3 3v18M5 11h14M5 15h14"/><circle cx="12" cy="9" r="1.4" fill="currentColor"/><circle cx="16.6" cy="13" r="1.4" fill="currentColor"/>'],
    ['lick-lab','lick-lab.html','Lick Lab','<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'],
    ['note-prompter','note-prompter.html','Note Prompter','<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M9 21h6M12 17v4"/><path d="M10 13V8l4 2.5z"/>'],
    ['tuner','tuner.html','Tuner','<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l3.5-6"/><circle cx="12" cy="16" r="1.3" fill="currentColor"/>']],
  /* apps met een eigen hoek van de kamer */
  corners:['chord-finder','scale-trainer','fretboard','lick-lab','note-prompter','tuner'],

  rail(nav){const app=nav.dataset.app,base=nav.dataset.base||'';
    nav.setAttribute('aria-label','Apps');
    nav.innerHTML=ROOM.apps.map(a=>!a?'<div class="sep"></div>':
      '<a href="'+base+a[1]+'"'+(a[0]==='room'?' id="lnkHome"':'')+(a[0]===app?' class="on" aria-current="page"':'')+' aria-label="'+a[2]+'">'+
      '<svg viewBox="0 0 24 24" aria-hidden="true">'+a[3]+'</svg><span class="px">'+a[2]+'</span></a>').join('');},

  /* achtergrond: één keer onscherp in een canvas tekenen, opnieuw alleen bij een andere venstergrootte of als de
     instellingen (menu S, shared/look.js) iets anders kiezen. Een CSS-filter zou bij elk scrollbeeld opnieuw rekenen.
     Geen toDataURL nodig (via file:// zou het canvas "besmet" zijn). Decor: eigen hoek (standaard), een andere hoek of de hele kamer. */
  app:'',base:'',img:null,cv:null,
  bgSrc(){const d=typeof LOOK!=='undefined'?LOOK.decorOf(ROOM.app):'own',c=d==='own'?ROOM.app:d;
    return d==='room'?ROOM.base+'home/room.jpg':ROOM.corners.includes(c)?ROOM.base+'home/corners/corner-'+c+'.jpg':null;},
  bgDraw(){const ph=document.querySelector('.bgfx.photo'),img=ROOM.img,cv=ROOM.cv;if(!ph||!img||!img.naturalWidth||!cv)return;
    const x=cv.getContext('2d'),W=ph.clientWidth||innerWidth+160,H=ph.clientHeight||innerHeight+160,s=Math.max(W/img.naturalWidth,H/img.naturalHeight),w=img.naturalWidth*s,h=img.naturalHeight*s;
    /* onscherp is onscherp: op een kleiner canvas tekenen (k keer kleiner, blur ook k keer kleiner) en door CSS laten oprekken.
       Ziet er hetzelfde uit, maar Firefox rekent de canvas-blur op de CPU: een kwart van de breedte = 1/16 van het werk. */
    const b=typeof LOOK!=='undefined'?LOOK.S.blur:6,k=b>=2?Math.min(4,b/1.5):1;
    cv.width=Math.round(W/k);cv.height=Math.round(H/k);x.filter='blur('+(b/k)+'px) saturate(1.05)';x.drawImage(img,(W-w)/2/k,(H-h)/2/k,w/k,h/k);},
  bg(){const ph=document.querySelector('.bgfx.photo');if(!ph)return;const src=ROOM.bgSrc();
    if(!src){ph.innerHTML='';ph.style.backgroundImage='';return;}
    if(!ROOM.cv){const cv=document.createElement('canvas'),x=cv.getContext('2d');
      if(!x||!('filter' in x)){ph.classList.add('live');ph.style.backgroundImage='url('+src+')';return;}   /* terugval: CSS-filter */
      ROOM.cv=cv;let t=0;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(ROOM.bgDraw,150);});}
    if(ROOM.img&&ROOM.img.dataset.src===src){ROOM.bgDraw();return;}
    const img=new Image();img.dataset.src=src;img.onload=img.onerror=()=>{if(ROOM.img!==img)return;ROOM.bgDraw();if(!ROOM.cv.parentNode)ph.appendChild(ROOM.cv);ROOM.ready();};
    ROOM.img=img;img.src=src;},
  /* achtergrond staat er: de warme afdekking (room.css, body::after) mag wegvloeien */
  ready(){if(typeof LOOK!=='undefined')LOOK.ready();else document.documentElement.classList.add('pr-ready');},

  /* weggaan via de balk: afdekking terug (dezelfde warme kleur waarmee Home en de trainers beginnen), dan navigeren.
     Bij hover alvast de pagina en zijn beeld ophalen. */
  leave(nav){const pre=new Set();
    nav.addEventListener('mouseover',e=>{const a=e.target.closest('a[href]');if(!a||a.classList.contains('on')||pre.has(a.href))return;pre.add(a.href);   /* eigen pagina niet opnieuw ophalen */
      /* gewone fetch (vult de cache), geen <link rel=prefetch> in <head>: daarmee viel de opmaak in Firefox op GitHub Pages om */
      if(location.protocol!=='file:')fetch(a.href,{credentials:'same-origin'}).catch(()=>{});
      const id=(ROOM.apps.find(x=>x&&a.getAttribute('href')===ROOM.base+x[1])||[])[0];
      if(id==='room')new Image().src=ROOM.base+'home/room.jpg';else if(ROOM.corners.includes(id))new Image().src=ROOM.base+'home/corners/corner-'+id+'.jpg';});
    nav.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a||a.classList.contains('on')||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
      e.preventDefault();const R=document.documentElement;if(R.classList.contains('pr-leave'))return;R.classList.add('pr-leave');
      let done=false;const go=()=>{if(done)return;done=true;location.href=a.href;};setTimeout(go,140);});   /* = de .14s van pr-leave in room.css */
    addEventListener('pageshow',()=>document.documentElement.classList.remove('pr-leave'));},   /* terug met Vorige (bfcache) */

  /* korrel: 180×180 tegeltje, licht en donker door elkaar (zelfde niveau als de schets) */
  tile(w,h,px){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),im=x.createImageData(w,h);
    for(let i=0;i<w*h;i++)im.data.set(px(i%w,(i/w)|0),i*4);x.putImageData(im,0,0);return'url('+c.toDataURL()+')';},
  textures(){const r=Math.random,R=document.documentElement.style;
    try{R.setProperty('--grain',ROOM.tile(180,180,()=>{const v=r();return v>.5?[255,236,210,(v-.5)*46]:[0,0,0,(.5-v)*60];}));
      R.setProperty('--paper',ROOM.tile(160,160,()=>{const v=r();return[90,60,30,v>.93?40:v*16];}));}catch(e){}},   /* papiervezel voor kaartstijl "Paper" */

  /* palissander: staand diagram (nerf in de lengte → verloop over de breedte) en liggende hals */
  defs(){const g=(id,x2,y2)=>'<linearGradient id="'+id+'" x1="0" y1="0" x2="'+x2+'" y2="'+y2+'"><stop offset="0" stop-color="#43251a"/><stop offset=".35" stop-color="#5a3322"/><stop offset=".7" stop-color="#4f2c1d"/><stop offset="1" stop-color="#3f2217"/></linearGradient>';
    const d=document.createElement('div');
    d.innerHTML='<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'+g('rw',1,0)+g('rwh',0,1)+'</defs></svg>';
    document.body.prepend(d.firstChild);},

  /* inklapbare kolom: el = <aside class="col">, knoppen [data-col="shut"] en [data-col="open"]; onChange(open) bewaart de stand.
     Vanuit code: ROOM.open() / ROOM.open(false) / ROOM.toggle() (bewaart via onChange), ROOM.isOpen().
     ROOM.open(o,true) = alleen tonen, niet bewaren (bv. de stand opnieuw zetten na een import). */
  col:null,colSet:null,
  column(el,open,onChange){
    const set=o=>{o=!!o;el.classList.toggle('shut',!o);el.setAttribute('aria-expanded',o);};set(open);
    ROOM.col=el;ROOM.colSet=(o,quiet)=>{const was=ROOM.isOpen();set(o);if(!quiet&&!!o!==was&&onChange)onChange(!!o);};
    el.addEventListener('click',e=>{const b=e.target.closest('[data-col]');if(!b)return;const o=b.dataset.col==='open';set(o);if(onChange)onChange(o);});},
  open(o=true,quiet){if(ROOM.colSet)ROOM.colSet(o,quiet);},
  toggle(){ROOM.open(!ROOM.isOpen());},
  isOpen(){return !!ROOM.col&&!ROOM.col.classList.contains('shut');},

  /* rec-lampje als op een cassettedeck, rechtsboven in de kop van de middenkolom (.top, rechts uitgelijnd met de middenkolom):
     brandt zolang de oefentijd telt, met de oefentijd van vandaag ernaast.
     ROOM.status({rec,time,log}) — waarde of functie (elke seconde gelezen). rec = true/false (oefentijd loopt),
     time = seconden vandaag in deze app (uit het eigen logboek, alleen lezen; null/weglaten = de app heeft geen logboek),
     log = eigen logboeksleutel (dan telt "alle trainers" de live waarde van deze app i.p.v. de opgeslagen).
     Wat te zien is (aan/uit, venster, lampje, welke tijd) kiest het menu S (shared/look.js, groep "Rec lamp"). */
  st:null,deck:null,roomT:null,
  LOGS:['fretTrainer.log','toonladderTrainer:log','notePrompter.log','chordMoves.log','chordFinder.log','practiceRoom.lickLab.log'],
  /* pagina open en actief: laatste invoer < 60 s geleden in een zichtbaar tabblad (start bij het openen), net als in de Scale Trainer */
  lastIn:Date.now(),
  status(o){if(!ROOM.st){ROOM.st={};setInterval(ROOM.deckTick,1000);
      ['pointerdown','keydown','input','wheel'].forEach(ev=>addEventListener(ev,()=>{ROOM.lastIn=Date.now();},{passive:true,capture:true}));
      if(typeof LOOK!=='undefined')LOOK.on(()=>ROOM.deckTick());}
    Object.assign(ROOM.st,o||{});ROOM.deckTick();},
  /* oefentijd vandaag over alle trainers: alle logboeken + wat je zelf invulde (zelfde bronnen als de kalender op Home) */
  roomToday(){const now=Date.now(),own=ROOM.st.log,d=new Date(),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(!ROOM.roomT||now-ROOM.roomT.at>10000||ROOM.roomT.k!==k){const r=key=>{try{return JSON.parse(localStorage.getItem(key));}catch(e){return null;}};
      const per={};ROOM.LOGS.forEach(key=>{const l=r(key),e=l&&l[k];per[key]=e&&typeof e==='object'&&isFinite(e.s)?+e.s:0;});
      const m=r('practiceRoom.manual');per.manual=m&&isFinite(m[k])?m[k]*60:0;ROOM.roomT={at:now,k,per};}
    let s=0;Object.entries(ROOM.roomT.per).forEach(([key,v])=>{s+=key===own?0:v;});
    const t=ROOM.val('time');return s+(own&&t!=null?t:own?ROOM.roomT.per[own]||0:0);},
  val(k){const v=ROOM.st[k];try{return typeof v==='function'?v():v;}catch(e){return null;}},
  deckTick(){if(!ROOM.st)return;const L=typeof LOOK!=='undefined'&&LOOK.S||{},top=document.querySelector('.main .top');if(!top)return;
    if(!ROOM.deck){const d=document.createElement('span');d.className='deck px';d.setAttribute('role','status');
      d.innerHTML='<span class="dk-rec"><i></i>REC</span><span class="dk"><b></b><small></small></span>';ROOM.deck=d;}
    const d=ROOM.deck;if(d.parentNode!==top)top.appendChild(d);
    d.hidden=L.deck==='off';if(d.hidden)return;
    d.dataset.lamp=L.deckLamp||'pulse';d.dataset.win=L.deckWin||'window';
    const rec=!!ROOM.val('rec')||(document.visibilityState==='visible'&&Date.now()-ROOM.lastIn<=60000);d.classList.toggle('on',rec);d.querySelector('.dk-rec').title=rec?'Practice time is counting':'Not counting: start practising';
    /* tijd: "app" = dit logboek (heeft de app er geen, dan alle trainers), "room" = alle logboeken samen */
    const tm=L.deckTime||'app',own=ROOM.val('time'),room=tm==='room'||(tm==='app'&&own==null),el=d.querySelector('.dk');
    el.hidden=tm==='off';if(el.hidden)return;
    const sec=room?ROOM.roomToday():own,m=Math.floor(sec/60),v=Math.floor(m/60)+':'+String(m%60).padStart(2,'0'),lab=room?'all today':'today';
    if(el.firstChild.textContent!==v)el.firstChild.textContent=v;if(el.lastChild.textContent!==lab)el.lastChild.textContent=lab;
    el.title='Practice time today'+(room?' (all trainers)':' in this trainer')+': '+m+' min';},

  init(){const nav=document.querySelector('nav.rail');
    if(nav){ROOM.app=nav.dataset.app||'';ROOM.base=nav.dataset.base||'';ROOM.rail(nav);ROOM.leave(nav);}
    ROOM.bg();ROOM.textures();ROOM.defs();
    if(!ROOM.img)ROOM.ready();}   /* geen beeld te laden (of CSS-terugval): meteen tonen */
};
ROOM.init();
