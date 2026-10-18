/* ════════════════════════════════════════════════════════════════════════════
   PRACTICE ROOM · geheim menu "Look" (toets S) voor de gedeelde schil. Gewoon script, één globale naam: LOOK.
   Laden vóór shared/rail.js (die leest LOOK.S.blur en het decor). Geen knop: S opent/sluit (niet tijdens typen), Esc sluit.
   Alles wat een ontwerpafweging is (letter, maten, doorzichtigheid, onscherpte, korrel) staat hier als instelling en
   komt als CSS-variabele op <html> (zie :root in shared/room.css voor de standaardwaarden).
   Opslag: 'practiceRoom.look' (gedeeld door alle trainers; een andere letter geldt dus overal). Onleesbaar → kopie naar
   'practiceRoom.look.bad', standaardwaarden gebruiken. Decor is per app: {decor: {<app-id>: 'own'|<hoek>|'room'}}.
   Home heeft een eigen menu (practiceRoom.room) en leest dit niet.
   Een app kan eigen regels toevoegen die hij zelf bewaart: LOOK.add([{k,t,l,o,def,get(),set(v)}]) en LOOK.on(fn) = na elke wijziging.
   Kleine letters (textCase 'lower'): body.lc zet alles in kleine letters; muzikale tekens (akkoorden, noten, intervallen,
   romeinse cijfers, losse hoofdletters zoals toetsen en snaarnamen, MIDI/dB/Hz…) zet LOOK.mus() vanzelf in <span class="mus">,
   ook in tekst die later verschijnt (MutationObserver). Invoervelden, keuzelijsten en SVG-tekst veranderen nooit.
   ════════════════════════════════════════════════════════════════════════════ */
const LOOK={
  KEY:'practiceRoom.look',
  /* naam, font-family, gewicht, grootte-factor, letterafstand (zelfde keuzes als Home) */
  FONTS:{dotgothic:['DotGothic16','"DotGothic16"',400,1,'.02em'],pixelify:['Pixelify Sans','"Pixelify Sans"',500,1,'0'],
    vt323:['VT323','"VT323"',400,1.3,'.01em'],spacemono:['Space Mono','"Space Mono"',700,.92,'-.01em'],
    handjet:['Handjet','"Handjet"',500,1.15,'0'],bricolage:['Bricolage (no pixel font)','"Bricolage Grotesque"',700,1,'-.01em']},
  DECOR:[['own','Own corner of the room'],['chord-finder','Desk (Chord Finder)'],['scale-trainer','Music stand (Scale Trainer)'],['fretboard','Guitars (Fretboard)'],
    ['lick-lab','Amp (Lick Lab)'],['note-prompter','Metronome (Note Prompter)'],['tuner','Pedalboard (Tuner)'],['room','The whole room']],
  /* de instellingen: k = sleutel, v = CSS-variabele (met eenheid u), d = standaard */
  ROWS:[
    {h:'Type'},
    {k:'font',t:'select',l:'Title & label font',d:'dotgothic'},
    {k:'fontScale',t:'range',l:'Title & label size',min:.8,max:1.5,step:.05,d:1},
    {k:'textCase',t:'select',l:'Text case',o:[['normal','Normal'],['lower','lowercase (chords stay)']],d:'normal'},
    {h:'Scene'},
    {k:'decor',t:'select',l:'Background',d:'own'},
    {k:'blur',t:'range',l:'Background blur (px)',min:0,max:16,step:1,d:6},
    {k:'grain',t:'range',l:'Grain',min:0,max:1.4,step:.05,v:'--grain-o',d:.7},
    {k:'veil',t:'range',l:'Veil',min:0,max:.6,step:.02,v:'--veil',d:0},
    {k:'scrim',t:'range',l:'Shade behind the title',min:0,max:.8,step:.02,v:'--scrim',d:.42},
    {h:'Materials'},
    {k:'paper',t:'range',l:'Parchment panels',min:.5,max:1,step:.01,v:'--paper-a',d:.87},
    {k:'glass',t:'range',l:'Glass (rail, play bar)',min:.25,max:.95,step:.01,v:'--glass-a',d:.6},
    {k:'cardA',t:'range',l:'Card opacity',min:.6,max:1,step:.01,v:'--card-a',d:.95},
    {k:'colW',t:'range',l:'Side column width',min:260,max:440,step:10,v:'--colpw',u:'px',d:320},
    {h:'Cards'},
    {k:'card',t:'select',l:'Card style',o:[['rosewood','Rosewood neck'],['paper','Paper'],['staff','Paper + staff lines']],d:'rosewood'}],
  S:null,extra:[],fns:[],box:null,obs:null,

  init(){LOOK.ROWS.find(r=>r.k==='font').o=Object.entries(LOOK.FONTS).map(([k,f])=>[k,f[0]]);
    LOOK.ROWS.find(r=>r.k==='decor').o=LOOK.DECOR;
    LOOK.S=LOOK.load();LOOK.apply();
    addEventListener('keydown',e=>{
      if(e.key==='Escape'&&LOOK.box&&!LOOK.box.hidden){LOOK.toggle(false);return;}
      if((e.key!=='s'&&e.key!=='S')||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
      const t=e.target;if(t&&(t.closest&&t.closest('input,textarea,select,[contenteditable="true"]')))return;
      e.preventDefault();LOOK.toggle();});},

  /* ── opslag ── */
  load(){const s={decor:{}};LOOK.ROWS.forEach(r=>{if(r.k&&r.k!=='decor')s[r.k]=r.d;});let raw=null;
    try{raw=localStorage.getItem(LOOK.KEY);}catch(e){}if(raw==null)return s;let o=null;try{o=JSON.parse(raw);}catch(e){}
    if(!o||typeof o!=='object'||Array.isArray(o)){try{localStorage.setItem(LOOK.KEY+'.bad',raw);}catch(e){}return s;}
    LOOK.ROWS.forEach(r=>{if(!r.k||r.k==='decor'||!(r.k in o))return;const v=o[r.k];
      if(r.t==='select'&&r.o.some(x=>x[0]===v))s[r.k]=v;
      else if(r.t==='range'&&typeof v==='number'&&isFinite(v))s[r.k]=Math.max(r.min,Math.min(r.max,v));});
    if(o.decor&&typeof o.decor==='object'&&!Array.isArray(o.decor))Object.keys(o.decor).forEach(a=>{
      if(/^[a-z-]{1,30}$/.test(a)&&LOOK.DECOR.some(x=>x[0]===o.decor[a]))s.decor[a]=o.decor[a];});
    return s;},
  save(){try{localStorage.setItem(LOOK.KEY,JSON.stringify(LOOK.S));}catch(e){}},
  app(){const n=document.querySelector('nav.rail');return n&&n.dataset.app||'';},
  decorOf(app){return LOOK.S&&LOOK.S.decor[app]||'own';},
  get(k){return k==='decor'?LOOK.decorOf(LOOK.app()):LOOK.S[k];},

  /* ── toepassen ── */
  apply(){const S=LOOK.S,R=document.documentElement.style,f=LOOK.FONTS[S.font]||LOOK.FONTS.dotgothic,B=document.body;
    R.setProperty('--df',f[1]);R.setProperty('--dw',f[2]);R.setProperty('--dfs',f[3]*S.fontScale);R.setProperty('--dls',f[4]);
    LOOK.ROWS.forEach(r=>{if(r.v)R.setProperty(r.v,S[r.k]+(r.u||''));});
    B.dataset.card=S.card;
    B.classList.toggle('lc',S.textCase==='lower');LOOK.lower(S.textCase==='lower');},
  set(k,v){if(k==='decor')LOOK.S.decor[LOOK.app()]=v;else LOOK.S[k]=v;LOOK.save();LOOK.apply();
    if((k==='decor'||k==='blur')&&(typeof ROOM!=='undefined'))ROOM.bg();
    LOOK.fns.forEach(fn=>{try{fn(k);}catch(e){}});},
  add(rows){LOOK.extra.push(...rows);if(LOOK.box&&!LOOK.box.hidden)LOOK.render();},
  on(fn){LOOK.fns.push(fn);},
  reset(){const decor=Object.assign({},LOOK.S.decor);delete decor[LOOK.app()];   /* decor van andere apps blijft */
    LOOK.S={decor};LOOK.ROWS.forEach(r=>{if(r.k&&r.k!=='decor')LOOK.S[r.k]=r.d;});
    LOOK.extra.forEach(r=>{if('def'in r)r.set(r.def);});
    LOOK.save();LOOK.apply();if((typeof ROOM!=='undefined'))ROOM.bg();LOOK.fns.forEach(fn=>{try{fn('reset');}catch(e){}});LOOK.render();},

  /* ── het menu ── */
  toggle(o){if(!LOOK.box)LOOK.build();o=o==null?LOOK.box.hidden:o;LOOK.box.hidden=!o;if(o){LOOK.render();LOOK.box.querySelector('.lk-x').focus();}},
  build(){const b=document.createElement('div');b.className='lookbox';b.hidden=true;b.setAttribute('role','dialog');b.setAttribute('aria-label','Look settings');
    b.innerHTML='<div class="lk-h"><h3 class="px">Look</h3><button type="button" class="lk-x" aria-label="Close">✕</button></div>'+
      '<p class="lk-n">Secret menu: press S to open or close. Saved in this browser, for every trainer.</p><div class="lk-rows"></div>'+
      '<div class="lk-f"><button type="button" class="lk-reset">Reset to defaults</button></div>';
    document.body.appendChild(b);LOOK.box=b;
    b.querySelector('.lk-x').onclick=()=>LOOK.toggle(false);b.querySelector('.lk-reset').onclick=()=>LOOK.reset();
    b.addEventListener('input',e=>{const el=e.target.closest('[data-k]');if(!el)return;const k=el.dataset.k,x=LOOK.extra.find(r=>r.k===k),r=x||LOOK.ROWS.find(r=>r.k===k);
      const v=r.t==='range'?+el.value:el.value;if(r.t==='range'){const out=el.parentNode.querySelector('output');if(out)out.textContent=LOOK.fmt(v);}
      if(x){x.set(v);LOOK.fns.forEach(fn=>{try{fn(k);}catch(e){}});}else LOOK.set(k,v);});},
  fmt(v){return Math.round(v*100)/100;},
  render(){if(!LOOK.box)return;const rows=[...LOOK.ROWS,...LOOK.extra];
    LOOK.box.querySelector('.lk-rows').innerHTML=rows.map(r=>{if(r.h)return'<div class="lk-g px">'+r.h+'</div>';
      const v=r.get?r.get():LOOK.get(r.k);let c='';
      if(r.t==='select')c='<select data-k="'+r.k+'">'+r.o.map(([k,n])=>'<option value="'+k+'"'+(k===v?' selected':'')+'>'+n+'</option>').join('')+'</select>';
      else c='<span class="lk-rv"><input type="range" data-k="'+r.k+'" min="'+r.min+'" max="'+r.max+'" step="'+r.step+'" value="'+v+'"><output>'+LOOK.fmt(v)+'</output></span>';
      return'<label class="lk-r"><span>'+r.l+'</span>'+c+'</label>';}).join('');},

  /* ── kleine letters, behalve muziek ──
     Beschermd (blijft zoals geschreven): akkoordsymbolen en noten (C, D♭, F♯m7♭5, A7♯9/B♯, Bb-7 → "Bb"), losse hoofdletters
     (interval R, toetsen L/R/S, snaarnamen e B G D A E), romeinse cijfers (I–VII met ♭/♯ en maj7/m7/°/ø), M3/m3,
     afkortingen en eenheden waar hoofdletters tellen. Kleine letters die al klein zijn, hoeven niet beschermd. */
  RX:new RegExp([
    '(?<![\\p{L}\\d])[A-G](?:[♭♯#]|b(?=m|add|aug|dim|sus|alt|[^\\p{L}]|$))?(?:maj|min|m|dim|aug|sus|add|alt|M|ø|°|\\+|[0-9]|[♭♯#b](?=\\d)|\\(|\\)|,)*(?:/(?:[A-G][♭♯#b]?|\\d+))*(?![\\p{L}])',
    '(?<![\\p{L}\\d])[♭♯b]?(?:VII|VI|IV|V|III|II|I)(?:maj7?|m7?|7|°7?|ø7?)?(?![\\p{L}])',
    '(?<![\\p{L}\\d])[A-Z](?![\\p{L}])',
    '(?<![\\p{L}\\d])M\\d+(?![\\p{L}])',
    '(?<![\\p{L}])(?:MIDI|iReal Pro|iReal|dB|kHz|Hz|Esc|Space|Ctrl|Shift|Enter)(?![\\p{L}])'].join('|'),'gu'),
  SKIP:'.mus,script,style,textarea,select,option,input,svg,.lookbox select',
  mus(root){if(!root)return;if(root.nodeType===3){LOOK.wrap(root);return;}if(root.nodeType!==1||root.closest(LOOK.SKIP))return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),list=[];let n;
    while((n=w.nextNode()))list.push(n);list.forEach(LOOK.wrap);},
  wrap(n){const p=n.parentElement;if(!p||p.closest(LOOK.SKIP)||!n.data.trim())return;
    const t=n.data,ms=[...t.matchAll(LOOK.RX)].filter(m=>m[0]&&/[A-Z]/.test(m[0]));if(!ms.length)return;
    const f=document.createDocumentFragment();let at=0;
    ms.forEach(m=>{if(m.index>at)f.appendChild(document.createTextNode(t.slice(at,m.index)));
      const s=document.createElement('span');s.className='mus';s.textContent=m[0];f.appendChild(s);at=m.index+m[0].length;});
    if(at<t.length)f.appendChild(document.createTextNode(t.slice(at)));n.replaceWith(f);},
  lower(on){if(!on){if(LOOK.obs){LOOK.obs.disconnect();LOOK.obs=null;}return;}
    if(LOOK.obs)return;LOOK.mus(document.body);
    LOOK.obs=new MutationObserver(rs=>rs.forEach(r=>{if(r.type==='characterData')LOOK.mus(r.target);else r.addedNodes.forEach(LOOK.mus);}));
    LOOK.obs.observe(document.body,{childList:true,subtree:true,characterData:true});}
};
LOOK.init();
