'use strict';
/* ── BACKING TRACK ──────────────────────────────────────────────────────────────
   Piano, contrabas en drums spelen je progressie, in drie stijlen: Swing, Bossa en Ballad.
   De band speelt als een trio: hij bouwt op over de chorussen (LEVEL), speelt fills aan het eind van secties (FILLS),
   kan beginnen met een intro van 4 maten en eindigt (met Loop uit) op een slotakkoord.
   Ritmes, velocities, registers en mix zijn afgeleid van een iReal Pro-export (Blue Bossa, 106 BPM).
   Klanken: echte opnames uit backing-sounds.js (zelfde map). Ontbreekt dat bestand, dan klinken eenvoudige synthklanken.
   Planner: elke 25 ms worden de tellen ingepland die binnen 120 ms vallen (Web Audio-klok), zodat het ritme strak blijft.

   ▸ MIX: het basisvolume per instrument (1 = zoals afgesteld op de iReal-opname). De schuifjes in het Band-menu
     werken daar bovenop. Pas hier aan als je de standaardbalans anders wilt. */
const MIX={piano:1,bass:1,drums:1,reverb:.16};

/* ▸ STIJLEN. Swing en Bossa: posities in achtsten binnen een maat (0 = tel 1, 1 = "1-en", 2 = tel 2 …), lengtes in tellen.
     'p' = "push": de pianist speelt het vólgende akkoord al op de laatste achtste (anticipatie).
     Ballad (naar een iReal-export van Summertime, 60 BPM): posities in tellen, met triolen (.33 / .67);
     's' = zachter herhaalde aanslag, 'f' = klein loopje in de bovenstem. Bas: R = grondtoon, 5 = kwint,
     O = octaaf, A = opmaat naar het volgende akkoord. */
const STYLE={
  swing:{
    /* ride: elke tel, plus het "a"-tikje na tel 2 en 4; velocities zoals in de referentie */
    ride:[84,88,82,89],skip:79,pedal:64,feather:27,snareP:.35,
    comp4:[[[0,3]],[[0,1.5],[4,1.5]],[[1,.35],[4,.6]],[[0,.35],[3,2]],[[0,.35],[5,.35]],[[3,.35]],[[5,.35],[7,'p']],[[0,3],[7,'p']],[[1,.35],[7,'p']],[[2,.35],[5,1.5]]],
    after4:[[],[[3,.35]],[[5,.35]],[[5,.35],[7,'p']],[[7,'p']],[[4,.6]]],   /* na een push: tel 1 is al gespeeld */
    comp2:[[[0,1.5]],[[1,.35]],[[0,.35],[3,'p']],[[3,'p']]],
    after2:[[],[[2,.35]]],
    push:[.35,.35,2.5],pianoVel:[70,90],
    /* "in 2" (eerste chorus bij Build up): bas op 1 en 3, af en toe een opmaat; R/5/A zoals bij Ballad */
    two4:[[[0,2,'R'],[2,2,'5']],[[0,2,'R'],[2,2,'5']],[[0,2,'R'],[2,1.5,'5'],[3.5,.5,'A']],[[0,1.5,'R'],[1.5,.5,'R'],[2,2,'5']],[[0,2,'R'],[2,1,'5'],[3,1,'A']]],
    two2:[[[0,2,'R']],[[0,1.5,'R'],[1.5,.5,'A']]]},
  bossa:{
    ride:[81,54,68,73,80,54,67,74],                         /* rechte achtsten */
    kick:{0:101,3:111,4:122,7:82},pedalAt:[2,6],pedal:43,
    clave:[[0,3,6],[2,5]],stick:84,                         /* side-stick, patroon over twee maten */
    comp4:[[[0,.5],[2,.5],[5,1],[7,'p']],[[0,.5],[4,.5],[5,1],[7,'p']],[[0,1.5],[3,2],[7,'p']],[[0,.5],[4,.5],[5,1]],[[0,.5],[2,.5],[5,1]],[[0,3.5]],[[0,1.5],[3,2]]],
    after4:[[[1,.5],[2,1.5],[5,1],[7,'p']],[[3,2],[7,'p']],[[1,.5],[2,1.5],[5,1]],[[3,2]]],
    comp2:[[[0,.5],[1,1]],[[0,1.5]],[[0,.5],[3,'p']]],
    after2:[[[1,1]],[[2,1]]],
    push:[.5,.5,2,4],pianoVel:[77,84]},
  ballad:{
    grid:'beat',swirl:70,feather:25,pedal:50,slap:50,trim:{piano:-1,bass:1,drums:-3},   /* trim: dB per instrument t.o.v. de andere stijlen */          /* brushes: veeg op elke tel, zachte bassdrum, pedaal op 2 en 4 */
    comp4:[[[0,4]],[[0,4]],[[0,2],[2,2,'s']],[[0,2],[2,2,'s']],[[0,2.6],[2.67,1.33,'s']],[[0,.6],[.67,2.2,'s'],[3,1]],
           [[0,1.6],[1.67,2.3,'s']],[[0,2],[2,.3],[2.67,1.33,'s']],[[0,1.67,'f'],[2,2]],[[.67,3.3]]],
    comp2:[[[0,2]],[[0,2]],[[0,.6],[.67,1.33,'s']],[[0,1.67,'f']]],
    bass4:[[[0,2,'R'],[2,2,'5']],[[0,2,'R'],[2,2,'5']],[[0,2,'R'],[2,1.67,'5'],[3.67,.33,'A']],[[0,1.67,'R'],[1.67,.33,'R'],[2,2,'5']],
           [[0,2,'R'],[2,1,'5'],[3,1,'O']],[[0,1,'R'],[1,1,'5'],[2,2,'R']],[[0,2,'R'],[2,2,'R']]],
    bass2:[[[0,2,'R']],[[0,1.67,'R'],[1.67,.33,'A']],[[0,1.67,'R'],[1.67,.33,'R']]],
    pianoVel:[94,102]}};

/* ▸ ARRANGEMENT (schakelaar "Build up"): de band groeit over de chorussen, zoals een echt trio.
     Niveau 0 = eerste chorus (en de intro): swing "in 2", piano spaarzaam, drums lichter.
     Niveau 1 = tweede chorus: walking bass, normaal comping, drummer pakt de pushes van de piano mee.
     Niveau 2 = vanaf het derde chorus: meer snare, vollere piano, iets luider.
     Eén chorus = één keer de vorm (of de gekozen loop-maten); korte vormen tellen pas na minstens 8 maten als chorus.
     ride/pianoV = velocity erbij, density = voorkeur voor drukke (+) of rustige (−) pianoritmes,
     snareP = kans op een snare-accent per maat, catchP = kans dat de drums een piano-push meespelen, skip = kans op een skip-noot in de walking bass. */
const LEVEL=[
  {ride:-6,snareP:.12,snare2:0,pianoV:-6,density:-1.5,catchP:0,skip:.1,drumV:.88},
  {ride:0,snareP:.35,snare2:0,pianoV:0,density:0,catchP:.4,skip:.2,drumV:1},
  {ride:3,snareP:.6,snare2:.35,pianoV:4,density:.8,catchP:.65,skip:.3,drumV:1.08}];

/* ▸ FILLS (schakelaar "Drum fills"): groot aan het eind van een sectie of chorus, klein om de 4 maten daartussen.
     big/small = lengte in tellen. Elke fill: [positie in tellen vanaf het begin van de fill, drum, velocity];
     .33/.67 = triolen (.67 valt in swing samen met de swing-achtste), .5/.25 = rechte achtsten/zestienden.
     Na een grote fill volgt op de 1 een crash (in het eerste chorus alleen na de intro, zachter). */
const FILLS={
  swing:{big:2,small:1,
    bigs:[[[.67,'snare',70],[1,'snare',76],[1.67,'snare',96],[1.67,'kick',72]],
          [[0,'snare',58],[.33,'snare',52],[.67,'snare',68],[1,'tomH',82],[1.33,'tomH',74],[1.67,'tomL',92]],
          [[0,'tomH',80],[.67,'tomH',70],[1,'tomL',84],[1.67,'tomL',90],[1.67,'kick',62]],
          [[.67,'snare',84],[1.67,'kick',86]],
          [[0,'snare',64],[.67,'kick',70],[1,'snare',74],[1.67,'snare',94]]],
    smalls:[[[.67,'snare',70]],[[0,'snare',56],[.67,'snare',72]],[[.67,'kick',74]],[[.33,'snare',48],[.67,'snare',70]]]},
  bossa:{big:2,small:1,
    bigs:[[[0,'snare',70],[.5,'snare',62],[1,'tomH',82],[1.5,'tomL',88]],
          [[1,'snare',60],[1.25,'snare',54],[1.5,'snare',70],[1.75,'snare',82]],
          [[0,'stick',84],[.5,'tomH',72],[1,'tomH',74],[1.5,'tomL',86]]],
    smalls:[[[.5,'snare',62]],[[.5,'tomL',70]],[[0,'snare',54],[.5,'snare',66]]]},
  ballad:{big:1,small:1,
    bigs:[[[.33,'tap',46],[.67,'slap',58]],[[0,'btom',50],[.33,'btom',46],[.67,'slap',60]],[[.67,'bopen',44]]],
    smalls:[[[.67,'slap',52]],[[.33,'tap',42],[.67,'slap',52]]]}};

const nBeats=c=>Math.max(2,Math.round(c.bars*4));
/* maten van de progressie: begintel van elk akkoord, totaal aantal tellen; loopR = gekozen maten om te herhalen */
function geom(p){const L=flat(p),starts=[];let acc=0;L.forEach(x=>{starts.push(acc);acc+=nBeats(x.c);});return{L,starts,total:acc,bars:Math.ceil(acc/4)};}
function loopRange(p,G){G=G||geom(p);const r=p.loopR;if(!r||!G.total)return null;
  const a=Math.min(r[0],G.bars-1),b=Math.min(r[1],G.bars-1);return a>b?null:[a*4,Math.min((b+1)*4,G.total)];}   /* in tellen [van, tot) */
const chordAtPos=(G,pos)=>{let i=0;while(i<G.starts.length-1&&G.starts[i+1]<=pos)i++;return i;};
const progPlayer={on:false,loading:false,timer:null,bus:null,next:0,ci:0,cb:0,bb:0,k:0,seek:null,pos:0,gen:false,
  bassEv:[],comp:[],vo:null,vo2:null,pushV:null,pushed:false,prev:36,snare:-1,snare2:-1,vis:[],dur:0,vb:-1,vci:false,g:null,
  intro:0,wraps:0,crashIn:0,crashV:0,fillLeft:0,fillBig:false,memo:{}};   /* intro = resterende tellen intro, wraps = aantal keer rond */
const midiF=m=>440*Math.pow(2,(m-69)/12);
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const wpick=(a,w)=>{const ws=a.map(w),tot=ws.reduce((x,y)=>x+y,0);let r=Math.random()*tot;for(let i=0;i<a.length;i++){r-=ws[i];if(r<=0)return a[i];}return a[a.length-1];};   /* gewogen keuze */
/* niveau van het huidige chorus (zie LEVEL) */
function chorusLvl(G,R){const P=progPlayer;if(state.pv.band.build===false)return 1;if(P.intro>0)return 0;
  const bars=((R?R[1]-R[0]:G.total)/4)||1,k=Math.max(1,Math.ceil(8/bars));return Math.min(2,Math.floor(P.wraps/k));}
/* frasegrenzen in tellen: het einde van de vorm/loop en het begin van een sectie = groot (een sectiegrens telt pas als groot
   als de vorige grote grens minstens 8 maten terug ligt), om de 4 maten daartussen = klein.
   Heel korte loops (minder dan 2 maten) krijgen geen fills. */
function phraseMarks(G,R){const A=R?R[0]:0,E=R?R[1]:G.total,len=E-A,big=new Set(),small=new Set();if(len<8)return{big,small,A,E};
  (len>=16?big:small).add(E);
  let lastBig=A;
  G.L.forEach((x,i)=>{if(i&&x.si!==G.L[i-1].si){const st=G.starts[i];if(st<=A||st>=E)return;if(st-lastBig>=32&&E-st>=16){big.add(st);lastBig=st;}else small.add(st);}});
  const bs=[A,...[...big].sort((a,b)=>a-b)];
  for(let j=0;j<bs.length-1;j++)for(let x=bs[j]+16;x<=bs[j+1]-8;x+=16)small.add(x);   /* niet vlak voor een grote grens */
  return{big,small,A,E};}

/* ── klanken laden (eenmalig, bij de eerste keer Play) ── */
let SND=null,sndPromise=null;
function b64buf(s){const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer;}
function decode(s){return new Promise((res,rej)=>actx.decodeAudioData(b64buf(s),res,rej)).then(buf=>{
  /* MP3 begint met een korte stilte: zoek de inzet, zodat alles precies op de tel valt */
  const d=buf.getChannelData(0);let pk=0;for(let i=0;i<d.length;i++)pk=Math.max(pk,Math.abs(d[i]));
  let i=0;while(i<d.length&&Math.abs(d[i])<pk*.002)i++;return {buf,off:Math.max(0,i-8)/buf.sampleRate};});}
function loadSounds(){
  const S=window.BACKING_SOUNDS;if(!S)return Promise.resolve(null);
  if(sndPromise)return sndPromise;
  const job=(grp,num)=>Promise.all(Object.keys(S[grp]).map(k=>decode(S[grp][k]).then(r=>Object.assign(r,{key:num?+k:k}))));
  sndPromise=Promise.all([job('piano',1),job('bass',1),job('drum',0)]).then(([p,b,d])=>{
    SND={piano:p.sort((x,y)=>x.key-y.key),bass:b.sort((x,y)=>x.key-y.key),drum:Object.fromEntries(d.map(x=>[x.key,x])),scale:S.scale};return SND;})
    .catch(()=>{SND=null;return null;});
  return sndPromise;}

/* ── mengpaneel: per instrument een bus (volume) + galm, daarna een milde compressor ── */
const VEL={piano:80,bass:105,ride:90,kick:100,stick:90,pedal:80,snare:90,swirl:70,tap:60,slap:60,bkick:60,bpedal:60,bopen:50,crash:90,tomH:90,tomL:90,bcrash:70,btom:70};   /* velocity van de opnames */
const DRUM_DB={ride:2,kick:-5,stick:-9,pedal:0,snare:0,swirl:0,tap:0,slap:0,bkick:0,bpedal:0,bopen:0,crash:-5,tomH:-4,tomL:-3,bcrash:-9,btom:-5};   /* onderlinge balans van het drumstel (dB) */
const SWIRL=.022;                                                              /* niveau van de doorlopende brush-veeg */
const volOf=k=>Math.pow((state.pv.band.vol[k]??100)/100,2);
function makeIR(){const sr=actx.sampleRate,n=Math.floor(sr*1.4),ir=actx.createBuffer(2,n,sr);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);let lp=0;for(let i=0;i<n;i++){lp=lp*.6+(Math.random()*2-1)*.4;d[i]=lp*Math.pow(1-i/n,3);}}return ir;}
function bandGraph(){
  const out=actx.createGain();out.gain.value=1;out.connect(actx.destination);
  const comp=actx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=2.5;comp.attack.value=.01;comp.release.value=.2;comp.knee.value=10;comp.connect(out);
  const verb=actx.createConvolver();verb.buffer=makeIR();const wet=actx.createGain();wet.gain.value=MIX.reverb;verb.connect(wet).connect(comp);
  /* afstelling: de opnames zijn per groep genormaliseerd (scale); 0.5/scale zet ze terug op soundfont-niveau,
     de dB-waarden komen uit de vergelijking met de iReal-opname */
  const sc=SND?SND.scale:{piano:1,bass:1,drum:1},db=x=>Math.pow(10,x/20);
  const gt=false;                                                   /* comping op piano (zoals vroeger); gitaar alleen nog voor Play A/B en de toonladder */
  const base={piano:gt?GTR_LVL:SND?.5*db(4.5)/sc.piano:.5,bass:SND?.5*db(2.7)/sc.bass:.35,drums:SND?.5*db(1)/sc.drum:1};
  const bus={};
  [['piano',.22],['bass',.04],['drums',.12]].forEach(([k,send])=>{
    if(k==='piano'&&gt){bus.piano=GTR.bus(actx,comp,{verb,wetScale:1/MIX.reverb,gain:base.piano*MIX.piano*volOf('piano')}).vol;return;}   /* galm via deze mix */
    const g=actx.createGain();g.gain.value=base[k]*MIX[k]*volOf(k);
    if(k==='drums'){const hs=actx.createBiquadFilter();hs.type='highshelf';hs.frequency.value=6000;hs.gain.value=5;g.connect(hs).connect(comp);}  /* meer glans op de bekkens */
    else if(k==='piano'){const pk=actx.createBiquadFilter();pk.type='peaking';pk.frequency.value=1600;pk.Q.value=.8;pk.gain.value=4;g.connect(pk).connect(comp);}  /* iets helderdere piano */
    else g.connect(comp);const s=actx.createGain();s.gain.value=send;g.connect(s).connect(verb);bus[k]=g;});
  return {out,bus,base};}
function setVol(k){const P=progPlayer;if(P.g&&P.g.bus[k])P.g.bus[k].gain.setTargetAtTime(P.g.base[k]*MIX[k]*volOf(k),actx.currentTime,.05);}

/* ── één sample afspelen: toonhoogte via playbackRate, lengte via een dempende envelope ── */
function playSample(s,t,gain,out,rate,len,rel){
  const src=actx.createBufferSource(),g=actx.createGain();src.buffer=s.buf;src.playbackRate.value=rate||1;
  g.gain.value=gain;src.connect(g).connect(out);src.start(Math.max(t,actx.currentTime),s.off);
  if(len){const end=Math.min(t+len,t+(s.buf.duration-s.off)/(rate||1)-.05);g.gain.setValueAtTime(gain,end);g.gain.setTargetAtTime(0,end,rel||.05);src.stop(end+(rel||.05)*6);}}
const nearestS=(list,m)=>list.reduce((a,b)=>Math.abs(b.key-m)<Math.abs(a.key-m)?b:a);
const velG=(v,ref)=>Math.pow(v/ref,2);           /* velocity → volume (zoals GM-synths dat doen) */

const gtrBus=b=>typeof GTR!=='undefined'&&!!GTR.busOf(b);
/* akkoordnoot: gitaar als de bus een gitaarbus is (losse noten van het loopje), anders piano */
function pianoNote(m,t,len,v,out){
  if(gtrBus(out)){GTR.note(actx,out,m,t,{len,vel:v});return;}
  if(!SND){pluck(midiF(m),t,Math.max(.25,len),out);return;}
  const s=nearestS(SND.piano,m);playSample(s,t,velG(v,VEL.piano),out,Math.pow(2,(m-s.key)/12),len,.07);}
function bassPlay(m,t,len,v,out){
  if(!SND){bassNote(m,t,len,out);return;}
  const s=nearestS(SND.bass,m);playSample(s,t,velG(v,VEL.bass),out,Math.pow(2,(m-s.key)/12),len,.035);}
function drum(k,t,v,out){const tr=STYLE[state.pv.band.style].trim;if(tr&&tr.drums&&k!=='stick')v*=Math.pow(10,tr.drums/40);
  if(!SND){if(/crash/.test(k))metal(t,1.6,.07*v/90,3500,out);else if(/tom/.test(k))kick(t,.18*v/90,out);else if(k==='ride')metal(t,.6,.08*v/90,5000,out);else if(/pedal|open|slap|tap|swirl/.test(k))metal(t,.08,.05*v/80,5000,out);else if(/kick/.test(k))kick(t,.25*v/100,out);else stick(t,v>100,out);return;}
  const s=SND.drum[k];if(s)playSample(s,t,velG(v,VEL[k])*Math.pow(10,(DRUM_DB[k]||0)/20),out);}

/* brush-"swirl": ruis die over de tel aanzwelt en weer wegzakt (de veeg van de borstel over het vel) */
function swirl(t,d,out,lvl){const src=actx.createBufferSource(),bp=actx.createBiquadFilter(),g=actx.createGain();
  src.buffer=noiseBuf();src.loop=true;bp.type='bandpass';bp.frequency.value=2600;bp.Q.value=.7;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(lvl,t+d*.5);g.gain.linearRampToValueAtTime(lvl*.3,t+d*.98);g.gain.linearRampToValueAtTime(.0001,t+d+.06);
  src.connect(bp).connect(g).connect(out);src.start(t,Math.random()*.5);src.stop(t+d+.1);}
/* reserveklanken als backing-sounds.js ontbreekt */
let NOISE=null;
function noiseBuf(){if(NOISE)return NOISE;const n=actx.sampleRate|0;NOISE=actx.createBuffer(1,n,actx.sampleRate);const d=NOISE.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return NOISE;}
function metal(t,dur,vol,hp,out){
  const g=actx.createGain(),h=actx.createBiquadFilter(),nz=actx.createBufferSource();h.type='highpass';h.frequency.value=hp;
  nz.buffer=noiseBuf();nz.connect(h).connect(g).connect(out);nz.start(t,Math.random()*.5);nz.stop(t+dur+.05);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+dur);}
function kick(t,vol,out){const o=actx.createOscillator(),g=actx.createGain();o.type='sine';
  o.frequency.setValueAtTime(95,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.22);
  o.connect(g).connect(out);o.start(t);o.stop(t+.25);}
function stick(t,acc,out){const o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=acc?1760:1320;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(acc?.35:.22,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.06);
  o.connect(g).connect(out);o.start(t);o.stop(t+.08);}
function bassNote(m,t,dur,out){const o=actx.createOscillator(),g=actx.createGain();o.type='triangle';o.frequency.value=midiF(m);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.5,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur+.05);
  o.connect(g).connect(out);o.start(t);o.stop(t+dur+.1);}

/* ── noten kiezen ── */
const LO=28,HI=45;
function near(pc,ref,lo=LO,hi=HI){let best=null;for(let m=lo;m<=hi;m++)if(mod(m,12)===pc&&(best==null||Math.abs(m-ref)<Math.abs(best-ref)))best=m;return best;}
const scaleOfChord=c=>SCALES[c.scale]?scaleOfC(c):chordScale(c);
/* toonladder waar piano en bas hun kleurtonen/doorgangsnoten uit halen: jouw keuze per akkoord,
   of (schakelaar uit) de standaardsuggestie op de grondtoon, zodat de band "neutraal" blijft */
const bandScale=c=>state.pv.band.fscale===false?buildScale(c.root,entriesOf(SCALES[suggestScales(c,null)[0]||'ionian']),{name:''}):scaleOfChord(c);
/* walking bass (swing): grondtoon op 1, akkoord-/toonladdertonen ertussen, naderingsnoot naar het volgende akkoord */
function walkLine(c,nx,n,prev){
  const cs=chordScale(c),chordPc=new Set(cs.notes.map(x=>x.pc)),sc=bandScale(c);
  const pool=new Set([...sc.notes.map(x=>x.pc),...chordPc]),root=near(ROOTS[c.root].pc,prev),tgt=near(ROOTS[nx.root].pc,root);
  const line=[root];
  for(let i=1;i<n-1;i++){const cur=line[i-1],left=n-1-i,cand=[];
    for(let m=Math.max(LO,cur-7);m<=Math.min(HI,cur+7);m++){if(m===cur||!pool.has(mod(m,12)))continue;
      let s2=Math.random()*1.5;
      if(chordPc.has(mod(m,12)))s2+=i%2===0?2.2:1.2;               /* akkoordtonen, vooral op tel 3 */
      s2-=Math.abs(Math.abs(m-tgt)-left*2)*.35;                      /* richting het volgende akkoord blijven bewegen */
      s2-=Math.abs(m-cur)>4?1:0;
      if(i>1&&m===line[i-2])s2-=1.5;                                 /* niet heen en weer */
      cand.push([s2,m]);}
    line.push(cand.length?cand.sort((x,y)=>y[0]-x[0])[0][1]:cur);}
  if(n>=2){const last=line[n-2],opts=[[tgt-1,3],[tgt+1,3],[tgt+2,1.5],[tgt-2,1.5],[tgt+7<=HI?tgt+7:tgt-5,1]]
      .filter(([m])=>m>=LO&&m<=HI&&m!==last&&m!==tgt).map(([m,w])=>[w+Math.random()*2-(Math.abs(m-last)>5?1.5:0),m]).sort((x,y)=>y[0]-x[0]);
    line.push(opts.length?opts[0][1]:tgt);}
  return line.slice(0,n);}
/* kwint van het akkoord (of verlaagde/verhoogde kwint), in de buurt van de grondtoon */
function fifthNear(c,root){const iv=chordScale(c).notes.map(n=>n.iv),f=[7,6,8].find(x=>iv.includes(x))??7;
  return root<=36?root+f:root+f-12;}
/* pianovoicing: terts + septiem + kleurtonen (9, 13, alteraties) + eventueel kwint, met grondtoon ertussen;
   geplaatst rond het midden van de piano en zo dicht mogelijk bij het vorige akkoord (stemvoering) */
/* ▸ VASTE VOICINGS per akkoordsoort, overgenomen uit de iReal Pro-export van Blue Bossa (piano-spoor, alle drie de chorussen).
     Per akkoordsoort (id uit REGISTRY): [halftonen boven de grondtoon van laag naar hoog, aantal keer gespeeld in de opname].
     De piano kiest daaruit op stemvoering (zo dicht mogelijk bij het vorige akkoord), met een kleine voorkeur voor wat iReal
     het vaakst speelt. Een vorm valt af als hij een noot bevat die niet in je toonladder voor dat akkoord zit
     (bijv. de 9 op een frygisch m7-akkoord). Andere akkoordsoorten: de berekende voicing (zie voicing()).
     Voorbeelden in C: m7 = E♭ B♭ C E♭ G · 7♭9 (G7♭9) = F G B F A♭ · maj7 (D♭maj7) = C D♭ F A♭ · m7♭5 (Dm7♭5) = D C F A♭ */
const TPL={
  aM7:[[[3,10,12,15,19],7],[[7,10,12,15,22],7],[[7,12,15,17,22],7],[[10,15,19,24,27],6],[[3,10,12,14,17],6],[[7,12,14,15,22],4],
       [[0,5,10,15,19],4],[[0,3,7,10,15],4],[[3,7,12,15,22],3],[[10,15,19,22,24],2],[[0,10,15,19],2]],
  aDom7:[[[7,10,16,19,24],1],[[10,16,19,24,28],1],[[10,16,19,24],1],[[10,12,16,19,24],1]],
  a7b9:[[[10,12,16,22,25],14],[[10,13,16,22,24],1]],
  aMaj7:[[[11,12,16,19],4],[[11,12,16,19,23],4],[[4,11,12,14,19],2],[[11,12,14,19],1],[[4,11,12,16,21],1],[[7,12,16,23],1]],
  aM7b5:[[[0,10,15,18],10],[[3,10,12,15,18],7],[[0,6,10,15],1]]};
function tplVoicing(c,prev,avoidTop){
  const list=TPL[c.type];if(!list)return null;
  const rp=ROOTS[c.root].pc,ok=new Set([...chordScale(c).notes.map(n=>n.pc),...bandScale(c).notes.map(n=>n.pc)]);
  const target=prev?prev.reduce((a,b)=>a+b,0)/prev.length:63,most=Math.max(...list.map(x=>x[1]));let best=null,bs=1e9;
  list.forEach(([t,n])=>{if(!t.every(x=>ok.has(mod(rp+x,12))))return;                  /* past niet in je toonladder */
    const pref=.9*(1-n/most);
    for(let base=24+rp;base<=72;base+=12){const v=t.map(x=>base+x);
      if(v[0]<47||v[0]>60||v[v.length-1]>77||(v[0]<50&&v[1]-v[0]<7))continue;          /* register van de opname: D3 … C5; laag alleen met ruimte */
      const mean=v.reduce((a,b)=>a+b,0)/v.length,top=v[v.length-1];
      const sc=Math.abs(mean-target)+.2*Math.abs(mean-62)+pref+Math.random()*.5+(avoidTop!=null?(top===avoidTop?8:Math.abs(top-avoidTop)>5?3:0):0);
      if(sc<bs){bs=sc;best=v;}}});
  return best;}
function voicing(c,prev,avoidTop){
  const fixed=tplVoicing(c,prev,avoidTop);if(fixed)return fixed;
  const civ=[...new Set(chordScale(c).notes.map(n=>n.iv))],has=x=>civ.includes(x),siv=new Set(bandScale(c).notes.map(n=>(n.pc-ROOTS[c.root].pc+12)%12));
  const third=[4,3].find(has)??[5,2].find(has),sev=[10,11].find(has)??(has(9)?9:null),fifth=[7,6,8].find(has);
  const dom=third===4&&sev===10,ext=civ.filter(x=>x!==0&&x!==third&&x!==sev&&x!==7);
  const col=[];
  if(dom){if(!ext.some(x=>x===1||x===3))col.push(siv.has(2)?2:siv.has(1)?1:null);if(!ext.some(x=>x===8))col.push(siv.has(9)?9:siv.has(8)?8:null);}
  else if(siv.has(2)&&!ext.some(x=>x===1||x===3))col.push(2);else if(third===3&&siv.has(5))col.push(5);
  const ivs=[];[third,sev,...ext,...col,fifth].forEach(x=>{if(x!=null&&x!==0&&!ivs.includes(x)&&ivs.length<4)ivs.push(x);});
  if(ivs.length<3)ivs.push(0);
  const rp=ROOTS[c.root].pc,pcs=ivs.map(x=>mod(rp+x,12)).sort((x,y)=>x-y),target=prev?prev.reduce((a,b)=>a+b,0)/prev.length:63;
  /* kandidaten: elke omkering, gesloten (alle stemmen binnen een octaaf) én "drop 2" (op één na hoogste stem een octaaf lager) */
  const cands=[];
  for(let r=0;r<pcs.length;r++)for(let lo=44;lo<=61;lo++){if(mod(lo,12)!==pcs[r])continue;
    const v=[lo];for(let j=1;j<pcs.length;j++){let m=v[j-1]+1;while(mod(m,12)!==pcs[(r+j)%pcs.length])m++;v.push(m);}
    cands.push(v);if(v.length>=4){const d=v.slice();d[d.length-2]-=12;cands.push(d.sort((x,y)=>x-y));}}
  let best=null,bs=1e9;
  cands.forEach(v=>{if(v[0]<50||v[v.length-1]>74)return;                        /* register van de referentie: D3 … D5 */
    const mean=v.reduce((a,b)=>a+b,0)/v.length;
    let sc=Math.abs(mean-target)+.2*Math.abs(mean-63)+(v[1]-v[0]<=2&&v[0]<57?4:0)+(v[1]-v[0]<=2&&v[2]-v[1]<=2?3:0);   /* geen modder onderin */
    if(avoidTop!=null){const top=v[v.length-1];sc+=top===avoidTop?8:Math.abs(top-avoidTop)>5?3:0;}   /* andere bovenstem, maar dichtbij */
    if(sc<bs){bs=sc;best=v;}});
  /* grondtoon erbij als hij ruim tussen twee stemmen past (geen dichte cluster) */
  const root=[...Array(30)].map((_,i)=>48+i).find(m=>{if(mod(m,12)!==rp||m<=best[0]||m>=best[best.length-1]||best.includes(m))return false;
    const lo=Math.max(...best.filter(x=>x<m)),hi=Math.min(...best.filter(x=>x>m));return m-lo>=2&&hi-m>=2&&hi-lo>=5;});
  return root!=null&&!ivs.includes(0)?[...best,root].sort((a,b)=>a-b):best;}
/* pianoritme voor één akkoord: patronen per maat (4 tellen) of halve maat (2 tellen).
   Uitkomst: aanslagen met b = positie in tellen vanaf het begin van het akkoord. */
function compFor(st,n,pushedIn,canPush,lvl=1,memo={}){
  const hits=[],beat=st.grid==='beat',dn=LEVEL[lvl].density;let pushed=pushedIn,off=0;
  while(off<n){const len=n-off>=4?4:2,last=off+len>=n;
    let opts=len===4?(pushed&&st.after4?st.after4:st.comp4):(pushed&&st.after2?st.after2:st.comp2);
    if(last&&!canPush)opts=opts.filter(p=>!p.some(h=>h[1]==='p'));if(!opts.length)opts=[[]];
    const fresh=opts.length>1?opts.filter(x=>x!==memo.last):opts;
    const pat=wpick(fresh,x=>Math.pow(1+x.length,dn));memo.last=pat;pushed=false;
    pat.forEach(([pos,l,fl])=>{const isP=l==='p';
      hits.push({b:off+(beat?pos:pos/2),len:isP?pick(st.push):l,push:isP&&last,ant:isP,soft:fl==='s',fill:fl==='f'});if(isP)pushed=true;});
    off+=len;}
  return hits;}
/* bas voor één akkoord: swing = walking (kwartnoten, soms een "skip"), bossa = grondtoon/kwint op 1, 2-en, 3, 4-en,
   ballad = "two-feel" (halve noten) met af en toe een triool-opmaat */
/* "in 2": halve noten (grondtoon/kwint) met af en toe een opmaat 'A' naar het volgende akkoord (Ballad, en Swing in het eerste chorus) */
function twoFeel(st4,st2,c,nx,n,P,lo,hi){const root=near(ROOTS[c.root].pc,P.prev,lo,hi),f=fifthNear(c,root)<root?fifthNear(c,root)+12:fifthNear(c,root);
  const nr=near(ROOTS[nx.root].pc,root,lo,hi),ev=[];
  for(let off=0;off<n;off+=4){const len=n-off>=4?4:2,last=off+len>=n;
    pick(len===4?st4:st2).forEach(([pos,l,k])=>{if(k==='A'&&!last)k='R';
      const m=k==='R'?root:k==='5'?f:k==='O'?(root+12<=52?root+12:root):pick([nr-2,nr-1,nr+1,nr-5>=lo?nr-5:nr+7]);
      ev.push({b:off+pos,len:l*.95,m,v:100});});}
  P.prev=root;return ev;}
function bassFor(style,c,nx,n,P,lvl=1){
  if(style==='ballad'){
    if(lvl>=2){const line=walkLine(c,nx,n,P.prev);P.prev=line[n-1];return line.map((m,i)=>({b:i,len:.9,m,v:i%2?98:92}));}   /* derde chorus: rustig walken */
    return twoFeel(STYLE.ballad.bass4,STYLE.ballad.bass2,c,nx,n,P,28,40);}
  if(style==='bossa'){const root=near(ROOTS[c.root].pc,P.prev,31,43),f=fifthNear(c,root),ev=[];
    for(let off=0;off<n;off+=4){ev.push({b:off,len:1.4,m:root,v:100});
      if(n-off>=4){ev.push({b:off+1.5,len:.45,m:Math.random()<.5?root:f,v:100},{b:off+2,len:1.4,m:f,v:100},{b:off+3.5,len:.45,m:f,v:100});}
      else ev.push({b:off+1.5,len:.45,m:f,v:100});}
    P.prev=root;return ev;}
  if(lvl===0)return twoFeel(STYLE.swing.two4,STYLE.swing.two2,c,nx,n,P,28,43);                /* swing, eerste chorus: in 2 */
  const line=walkLine(c,nx,n,P.prev),ev=line.map((m,i)=>({b:i,len:.95,m,v:i%2?112:100}));
  if(n>=4&&Math.random()<Math.min(.6,LEVEL[lvl].skip*n/4)){const j=1+Math.floor(Math.random()*(n-2));ev[j].len=.6;ev.push({b:j+.5,len:.3,m:line[j],v:92});}   /* skip-noot */
  P.prev=line[n-1];return ev;}

/* ── afspelen ── */
function progStop(){
  const P=progPlayer;P.loading=false;
  if(!P.on&&!P.timer){if(D&&D.prog)renderHead();return;}
  clearInterval(P.timer);P.timer=null;P.on=false;P.vb=-1;P.dur=0;showBar(-1);
  P.vis.forEach(clearTimeout);P.vis=[];
  if(P.g){const b=P.g.out;P.g=null;
    try{b.gain.cancelScheduledValues(actx.currentTime);b.gain.setTargetAtTime(0,actx.currentTime,0.04);setTimeout(()=>{try{b.disconnect();}catch(e){}},400);}catch(e){}}
  if(D&&D.prog){renderHead();renderProgCard();}}
const at=(t,fn)=>{progPlayer.vis.push(setTimeout(fn,Math.max(0,(t-actx.currentTime)*1000)));};
function showBar(b){document.querySelectorAll('#loopR .lc').forEach(e=>e.classList.toggle('now',+e.dataset.bar===b));}
function showBeat(i,ci){progPlayer.vb=i;progPlayer.vci=ci;document.querySelectorAll('#beats i').forEach((e,j)=>{e.className=j===i?'on'+(ci?' ci':''):'';});}
/* slotakkoord: eindigt de vorm op een dominant, dan landt de band op het akkoord een kwint lager (of een halve toon lager:
   tritonus-substituut), bij voorkeur het eerste akkoord van de vorm, anders een ander akkoord uit de progressie met die grondtoon.
   Eindigt de vorm op een half-verminderd akkoord of een II (of V) van het eerste akkoord: dan het eerste akkoord.
   Anders wordt het laatste akkoord nog één keer aangeslagen. */
function endChord(G,R){const L=G.L,last=L[R?chordAtPos(G,R[1]-1):L.length-1].c,first=L[R?chordAtPos(G,R[0]):0].c;
  const iv=chordScale(last).notes.map(n=>n.iv),dom=iv.includes(4)&&iv.includes(10),half=iv.includes(3)&&iv.includes(6)&&iv.includes(10);
  const rp=ROOTS[last.root].pc,d=mod(rp-ROOTS[first.root].pc,12),all=[first,...L.map(x=>x.c)];
  if(dom){for(const t of [mod(rp+5,12),mod(rp-1,12)]){const hit=all.find(c=>ROOTS[c.root].pc===t);if(hit)return hit;}return first;}
  return half||d===2||d===7?first:last;}
/* het slot zelf: crash + bassdrum, lage grondtoon, en een gebroken akkoord op de piano met de 9 erbovenop */
function playEnding(t,q,G,R){
  const P=progPlayer,b=state.pv.band,style=b.style,st=STYLE[style],B=P.g.bus,spb=60/clamp(q.tempo,40,240);
  const c=endChord(G,R),hold=Math.max(2.4,4*spb);
  if(b.drums){if(style==='ballad'){drum('bcrash',t,56,B.drums);drum('bkick',t,72,B.drums);if(SND)swirl(t,Math.min(hold,3),B.drums,SWIRL*1.3);}
    else{drum('crash',t,98,B.drums);drum('kick',t,96,B.drums);}}
  if(b.bass)bassPlay(near(ROOTS[c.root].pc,P.prev,28,40),t,hold,110,B.bass);
  if(b.piano){let v=voicing(c,P.vo2||P.vo);const top=v[v.length-1],nine=mod(ROOTS[c.root].pc+2,12);
    if(bandScale(c).notes.some(x=>x.pc===nine)&&!v.some(m=>mod(m,12)===nine)){let m=top+1;while(mod(m,12)!==nine)m++;if(m-top<=7&&m<=79)v=[...v,m];}
    const vel=(st.pianoVel[1]+2)*(st.trim&&st.trim.piano?Math.pow(10,st.trim.piano/40):1);
    if(gtrBus(B.piano))GTR.chord(actx,B.piano,v,t,{strum:.045,len:hold,vel});
    else v.forEach((m,i)=>pianoNote(m,t+i*.045,hold,vel+(i===v.length-1?4:-2),B.piano));}   /* van laag naar hoog gebroken */
  at(t,()=>{if(P.on)showBeat(0,false);});
  at(t+hold+.9,progStop);}
/* één drumfill inplannen (alle slagen ineens, ze vallen binnen de komende 1–2 tellen) */
function playFill(t,spb,kind,lv){const P=progPlayer,style=state.pv.band.style,F=FILLS[style],sw=style==='swing'?state.pv.band.swing:.5;
  const fill=pick(kind==='big'?F.bigs:F.smalls),len=kind==='big'?F.big:F.small;
  fill.forEach(([pos,k,v])=>{const w=Math.floor(pos+1e-6),f=pos-w,tf=t+(w+(Math.abs(f-.67)<.02&&style==='swing'?sw:f))*spb;
    drum(k,tf+rnd(-.004,.004),v*lv.drumV+rnd(-4,3),P.g.bus.drums);});
  P.fillLeft=len;P.fillBig=kind==='big';if(kind==='big')P.crashIn=len;}
function scheduleBeat(t){
  const P=progPlayer,q=curProg();if(!q){progStop();return;}const L=flat(q);if(!L.length){progStop();return;}
  const spb=60/clamp(q.tempo,40,240),band=state.pv.band,style=band.style,st=STYLE[style],B=P.g.bus;
  const sw=style==='swing'?band.swing:.5,tE=e=>t+(e%2?spb*sw:0);   /* tijd van een achtste binnen deze tel */
  /* tijd van een positie b (in tellen vanaf het begin van het akkoord); swing verschuift de "en"-achtste */
  const tB=b=>{const w=Math.floor(b+1e-6),f=b-w;return t+(w-P.cb)*spb+(style==='swing'&&Math.abs(f-.5)<.01?sw:f)*spb;},now=b=>Math.floor(b+1e-6)===P.cb;
  if(P.k<0){                                                    /* aftellen: vier tikken op de side-stick */
    const n=4+P.k;drum('stick',t,n===0?110:90,B.drums);at(t,()=>showBeat(n,true));P.k++;P.next+=spb;return;}
  const G=geom(q),R=loopRange(q,G);
  /* naar een positie springen (aangeklikt akkoord, start van een loop): akkoord + tel daarbinnen */
  const seekPos=pos=>{P.ci=chordAtPos(G,pos);P.cb=pos-G.starts[P.ci];P.pos=pos;P.gen=true;P.pushed=false;};
  if(P.seek!=null){seekPos(Math.min(P.seek,G.total-1));P.seek=null;P.bb=0;if(P.on&&P.started){P.intro=0;P.fillLeft=0;P.crashIn=0;}P.started=true;}
  if(P.ci>=L.length||P.pos>=G.total)seekPos(R?R[0]:0);
  const c=L[P.ci].c,n=nBeats(c),lvl=chorusLvl(G,R),lv=LEVEL[lvl];
  if(P.cb===0||P.gen){                                          /* nieuw akkoord: bas en piano voor het hele akkoord bepalen */
    const end=G.starts[P.ci]+n,atEnd=R?end>=R[1]:P.ci===L.length-1,
      nx=R&&end>=R[1]?L[chordAtPos(G,R[0])].c:L[(P.ci+1)%L.length].c,canPush=state.pv.loop||!atEnd||P.intro>n;   /* na het loop-einde volgt het begin van de loop */
    P.gen=false;
    P.bassEv=bassFor(style,c,nx,n,P,lvl);
    const prevV=P.vo2||P.vo;
    P.vo=P.pushed&&P.pushV?P.pushV:voicing(c,prevV);
    P.vo2=n>=8&&Math.random()<.75?voicing(c,P.vo,P.vo[P.vo.length-1]):null;   /* lang akkoord: halverwege een andere ligging */
    P.comp=compFor(st,n,P.pushed,canPush,lvl,P.memo);P.pushed=false;
    P.pushV=P.comp.some(h=>h.push)?voicing(nx,P.vo2||P.vo):null;
    const ci=P.ci,dur=(n-P.cb)*spb;at(t,()=>{if(!P.on)return;P.dur=dur;state.view.sel=ci;update();});}
  const beat=P.bb%4,trimV=k=>st.trim&&st.trim[k]?Math.pow(10,st.trim[k]/40):1;   /* dB → velocity-factor (velocity telt kwadratisch) */
  /* drums */
  if(band.drums){const hum=()=>rnd(-.003,.003);
    /* crash op de 1 na een grote fill (eerste chorus: alleen na de intro, zachter) */
    if(P.crashIn>0&&--P.crashIn===0&&(P.crashV||lvl>0&&(style!=='ballad'||P.pos===(R?R[0]:0)))){   /* ballad: alleen bij een nieuw chorus */
      if(style==='ballad')drum('bcrash',t,lvl>0?50:42,B.drums);else drum('crash',t,(lvl>1?98:lvl>0?90:76)+rnd(-4,2),B.drums);
      drum(style==='ballad'?'bkick':'kick',t,style==='ballad'?64:84,B.drums);P.crashV=0;}
    if(P.fillLeft>0)P.fillLeft--;
    if(band.fills!==false&&!P.fillLeft&&!P.crashIn){const F=FILLS[style],M=phraseMarks(G,R),pos=P.pos;let kind=null;
      if(P.intro>0&&P.intro===F.big){kind='big';P.crashV=1;}                    /* einde van de intro */
      else if(M.big.has(pos+F.big))kind='big';
      else if(M.small.has(pos+F.small)&&Math.random()<((pos+F.small-M.A)%32===0?.75:.35))kind='small';
      if(kind)playFill(t,spb,kind,lv);}
    const inFill=P.fillLeft>0&&P.fillBig;                                      /* grote fill: geen ride, wel hi-hat */
    if(style==='swing'){
      if(!inFill){drum('ride',t+hum(),(st.ride[beat]+lv.ride+rnd(-4,4))*lv.drumV,B.drums);
        if(beat%2)drum('ride',tE(1)+hum(),(st.skip+lv.ride+rnd(-5,3))*lv.drumV,B.drums);}         /* "ding-a" */
      if(beat%2)drum('pedal',t-.012,st.pedal,B.drums);                          /* hi-hat-pedaal op 2 en 4, net voor de tel */
      drum('kick',t,st.feather+rnd(-3,3),B.drums);                              /* "feathering": heel zacht op elke tel */
      if(beat===0){P.snare=Math.random()<lv.snareP?pick([1,3,5,7]):-1;P.snare2=Math.random()<lv.snare2?pick([2,5,6,7].filter(x=>x!==P.snare)):-1;}   /* snare-accenten */
      if(!P.fillLeft)[P.snare,P.snare2].forEach(e=>{if(e>=0&&Math.floor(e/2)===beat)drum('snare',tE(e),rnd(55,90)*lv.drumV,B.drums);});
      /* de drummer speelt een push van de piano mee (snare of bassdrum op de "en" van 4) */
      const ph=band.piano&&!P.fillLeft&&P.comp.find(h=>h.ant&&now(h.b));
      if(ph&&Math.random()<lv.catchP)drum(Math.random()<.6?'kick':'snare',tB(ph.b),rnd(68,86)*lv.drumV,B.drums);}
    else if(style==='ballad'){const bar=Math.floor(P.bb/4),end=band.fills===false&&bar%8===7&&beat===3;   /* zonder fills: elke 8 maten een kleine afsluiter */
      drum('swirl',t+hum(),st.swirl+rnd(-3,3),B.drums);if(SND)swirl(t,spb,B.drums,SWIRL*(beat%2?1.15:1)*(lvl?1:.85));
      drum('bkick',t,st.feather+rnd(-2,2),B.drums);
      if(beat%2)drum(end?'bopen':'bpedal',t,end?40:st.pedal,B.drums);
      if(beat===0){P.slaps=[0,1,2,3].filter(()=>Math.random()<[.08,.18,.3][lvl]);}   /* losse tikjes op de laatste triool */
      if(!P.fillLeft&&(P.slaps||[]).includes(beat))drum('slap',t+spb*.67,st.slap+rnd(-6,4),B.drums);
      if(end)drum('slap',t+spb*.75,st.slap,B.drums);}
    else{const bar=Math.floor(P.bb/4)%2;
      for(const e of [beat*2,beat*2+1]){const te=tE(e);
        if(!inFill){drum('ride',te+hum(),(st.ride[e]+lv.ride+rnd(-3,3))*lv.drumV,B.drums);
          if(st.kick[e])drum('kick',te,st.kick[e]*lv.drumV,B.drums);
          if(st.clave[bar].includes(e))drum('stick',te,st.stick,B.drums);}
        if(st.pedalAt.includes(e))drum('pedal',te,st.pedal,B.drums);}}}
  /* bas */
  if(band.bass)P.bassEv.forEach(ev=>{if(now(ev.b))bassPlay(ev.m,tB(ev.b),ev.len*spb,ev.v*trimV('bass'),B.bass);});
  /* piano */
  if(band.piano)P.comp.forEach(h=>{if(!now(h.b))return;
    const v0=(rnd(st.pianoVel[0],st.pianoVel[1])+lv.pianoV-(h.soft?14:0))*trimV('piano'),notes=h.push&&P.pushV?P.pushV:P.vo2&&h.b>=4?P.vo2:P.vo,te=tB(h.b);
    if(h.push){P.pushed=true;}
    if(gtrBus(B.piano))GTR.chord(actx,B.piano,notes,te,{len:h.len*spb,vel:v0+rnd(-4,4)});         /* gitaar: licht aangeslagen */
    else notes.forEach((m,i)=>pianoNote(m,te+i*rnd(0,.006),h.len*spb,v0+rnd(-4,4)+(i===notes.length-1?5:0),B.piano));
    if(h.fill){const top=notes[notes.length-1],pcs=bandScale(c).notes.map(x=>x.pc),lo=[1,2,3].map(d=>top-d).find(m=>pcs.includes(mod(m,12)))??top-2;
      pianoNote(lo,tB(h.b+1.33),.33*spb,v0-8,B.piano);pianoNote(top,tB(h.b+1.67),.3*spb,v0-6,B.piano);}});   /* loopje in de bovenstem */
  const bar=Math.floor(P.pos/4);at(t,()=>{showBeat(beat,false);showBar(bar);});
  const inIntro=P.intro>0;if(inIntro)P.intro--;
  P.cb++;P.bb++;P.pos++;
  /* einde van de vorm (of de loop-maten): opnieuw (Loop aan, of nog in de intro), anders het slot */
  const wrap=to=>{if(!inIntro)P.wraps++;seekPos(to);},
    finish=t1=>{P.k=1e9;if(band.ending!==false)playEnding(t1,q,G,R);else at(t1,progStop);};
  if(R&&P.pos>=R[1]){if(state.pv.loop||inIntro)wrap(R[0]);else finish(t+spb);}
  else if(P.cb>=n){P.cb=0;P.ci++;
    if(P.ci>=L.length){if(state.pv.loop||inIntro)wrap(R?R[0]:0);else finish(t+spb);}}
  P.next+=spb;}
function startBand(){
  const P=progPlayer;if(!P.loading)return;P.loading=false;
  const p=curProg();if(!p||!flat(p).length){renderHead();return;}
  P.on=true;P.g=bandGraph();
  const G=geom(p),R=loopRange(p,G),si=Math.min(state.view.sel,G.L.length-1),band=state.pv.band;
  P.seek=R&&!(G.starts[si]>=R[0]&&G.starts[si]<R[1])?R[0]:G.starts[si];   /* start bij het gekozen akkoord, of bij het begin van de loop */
  P.ci=0;P.cb=0;P.pos=0;P.bb=0;P.prev=36;P.vo=null;P.vo2=null;P.pushV=null;P.pushed=false;P.snare=-1;P.snare2=-1;
  P.intro=0;P.wraps=0;P.crashIn=0;P.crashV=0;P.fillLeft=0;P.fillBig=false;P.memo={};P.started=false;
  /* intro: de laatste 4 maten vóór het startpunt (meestal het slot van de vorm), daarna begint het eerste chorus */
  if(band.intro==='bars'){const A=R?R[0]:0,E=R?R[1]:G.total,len=E-A,ib=Math.min(16,len);P.intro=ib;P.seek=A+mod(P.seek-A-ib,len);}
  P.k=band.intro==='count'?-4:0;P.next=actx.currentTime+.12;P.dur=0;
  P.timer=setInterval(()=>{if(!P.on)return;while(P.on&&P.k<1e9&&P.next<actx.currentTime+.12)scheduleBeat(P.next);},25);
  update();}                                                    /* ook een eventuele Shift-vergelijking sluiten */
function progPlay(){
  stopPlay();state.view.cmp=null;const p=curProg();if(!p||!flat(p).length)return;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{actx=actx||new AC();if(actx.state==='suspended')actx.resume();}catch(e){return;}
  const P=progPlayer;P.loading=true;renderHead();
  loadSounds().then(startBand);}                                /* eerste keer: klanken uitpakken (duurt een fractie van een seconde) */
