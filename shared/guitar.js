/* ════════════════════════════════════════════════════════════════════════════
   PRACTICE ROOM · zachte jazzgitaar (archtop met flatwounds), gesynthetiseerd. Gewoon script, één globale naam: GTR.
   Geen modules, geen AudioWorklet (moet via file:// in Firefox werken), geen opnames nodig.
   Hoe: per MIDI-noot één keer een Karplus-Strong-snaar uitrekenen in een AudioBuffer (± 2 ms per noot) en bewaren;
   afspelen = alleen een AudioBufferSourceNode + gain per noot. Klankkleur (body, helderheid) zit in een paar
   biquads per "bus", niet per noot. Galm: één gedeelde ConvolverNode met een korte kamer-impuls, of de galm van de app.
   Gebruik:
     GTR.chord(ctx, dest, [midi…], when, {strum, arp, vel, len, damp})   noten laag → hoog, strum in s (standaard S.strum)
     GTR.note(ctx, dest, midi, when, {vel, len})                         één noot; len = loslaten na len s (anders uitklinken)
     GTR.bus(ctx, dest, {verb, wetScale, gain})                         eigen klankbus (vol = volumeknop) → dest
     GTR.warm(ctx)                                                      alvast alle noten uitrekenen (in stukjes, op de achtergrond)
     GTR.look()                                                         regels in het geheime menu S (als shared/look.js er is)
   Een nieuw akkoord op dezelfde bus dempt het vorige (zoals een gitarist die de snaren loslaat).
   Instellingen in 'practiceRoom.guitar' (gedeeld door alle trainers; onleesbaar → kopie naar '.bad').
   ════════════════════════════════════════════════════════════════════════════ */
const GTR=(()=>{
  /* ── JOUW INSTELLINGEN (standaardwaarden; in het menu S aan te passen) ── */
  const DEF={
    bright:2400,   /* low-pass in Hz: lager = donkerder, meer flatwound */
    reverb:.15,    /* galm (wet t.o.v. droog) */
    strum:.026,    /* tijd tussen de snaren bij aanslaan, in s */
    arp:.2,        /* tijd tussen de noten bij arpeggio, in s */
    decay:3.4};    /* uitklinktijd (T60, tot -60 dB) van een lage noot, in s */
  const LIM={bright:[1000,6000],reverb:[0,.6],strum:[0,.08],arp:[.08,.5],decay:[1,5]};
  const KEY='practiceRoom.guitar';
  /* vaste afstelling */
  const BODY=[[110,1.1,3],[240,1,2],[3200,.9,-3]];   /* [Hz, Q, dB]: luchtresonantie, warmte, minder "tik" */
  const PICK=.2,SOFT=1500,MIX_MS=.06;                  /* aanslagplek (deel van de snaar), aanslagfilter Hz, zelfde akkoord binnen 60 ms */

  const S=load();
  function load(){const s=Object.assign({},DEF);let raw=null;try{raw=localStorage.getItem(KEY);}catch(e){}
    if(raw==null)return s;let o=null;try{o=JSON.parse(raw);}catch(e){}
    if(!o||typeof o!=='object'||Array.isArray(o)){try{localStorage.setItem(KEY+'.bad',raw);}catch(e){}return s;}
    Object.keys(DEF).forEach(k=>{const v=o[k];if(typeof v==='number'&&isFinite(v))s[k]=Math.max(LIM[k][0],Math.min(LIM[k][1],v));});
    return s;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

  /* per AudioContext: buffercache, galm, bussen, klinkende stemmen */
  const CTX=new WeakMap(),BUS=new WeakMap();
  function st(ctx){let c=CTX.get(ctx);if(!c){c={buf:new Map(),ir:null,verb:null,buses:[],voices:[]};CTX.set(ctx,c);}return c;}
  const midiF=m=>440*Math.pow(2,(m-69)/12);

  /* ── één snaar uitrekenen (Karplus-Strong met fractionele vertraging) ── */
  function render(ctx,m){const sr=ctx.sampleRate,f=midiF(m),P=sr/f;
    const t60=Math.max(1,S.decay*Math.pow(110/f,.2)),dur=Math.min(t60*.85+.3,5),n=Math.floor(sr*dur);
    let N=Math.floor(P-.5),d=P-.5-N;if(d<.1&&N>2){N--;d+=1;}         /* lus = N + 0,5 (middeling) + d (allpass) */
    /* verlies per omloop voor de gewenste uitklinktijd van de grondtoon; de middeling dempt die al met cos(πf/sr) */
    const C=(1-d)/(1+d),g=Math.min(.99995,Math.pow(10,-3/(t60*f))/Math.cos(Math.PI*f/sr));
    /* aanslag: zachte ruis (twee keer low-pass) met een kam voor de aanslagplek; geen gelijkspanning */
    const line=new Float32Array(N),a=Math.exp(-2*Math.PI*Math.min(SOFT,f*6)/sr),k=Math.max(1,Math.round(N*PICK));
    let l1=0,l2=0,mean=0;const ex=new Float32Array(N);
    for(let i=0;i<N;i++){l1=a*l1+(1-a)*(Math.random()*2-1);l2=a*l2+(1-a)*l1;ex[i]=l2;}
    for(let i=0;i<N;i++){line[i]=ex[i]-(i>=k?ex[i-k]:0);mean+=line[i];}
    mean/=N;for(let i=0;i<N;i++)line[i]-=mean;
    const out=new Float32Array(n);let idx=0,prev=0,x1=0,y1=0;
    for(let i=0;i<n;i++){const s=line[idx];out[i]=s;
      const av=.5*(s+prev);prev=s;const ap=C*av+x1-C*y1;x1=av;y1=ap;
      line[idx]=g*ap;if(++idx===N)idx=0;}
    /* zachte inzet (2 ms), uitfaden aan het eind, gelijk niveau over de hals */
    const att=Math.floor(sr*.002),fo=Math.floor(sr*.25);
    for(let i=0;i<att;i++)out[i]*=i/att;
    for(let i=0;i<fo;i++)out[n-1-i]*=i/fo;
    let pk=1e-6;const w=Math.min(n,Math.floor(sr*.15));for(let i=0;i<w;i++)pk=Math.max(pk,Math.abs(out[i]));
    const sc=.32*Math.pow(196/f,.18)/pk;for(let i=0;i<n;i++)out[i]*=sc;
    const b=ctx.createBuffer(1,n,sr);(b.copyToChannel?b.copyToChannel(out,0):b.getChannelData(0).set(out));return b;}
  function buf(ctx,m){const c=st(ctx);m=Math.round(Math.max(28,Math.min(100,m)));let b=c.buf.get(m);if(!b){b=render(ctx,m);c.buf.set(m,b);}return b;}
  /* alle noten van de gitaar alvast uitrekenen, 3 per tik, zodat het eerste akkoord niet hoeft te wachten */
  function warm(ctx,lo=40,hi=88){const c=st(ctx);if(c.warm)return;c.warm=1;let m=lo;
    const tick=()=>{for(let j=0;j<3&&m<=hi;j++,m++)if(!c.buf.has(m))buf(ctx,m);if(m<=hi)setTimeout(tick,30);};setTimeout(tick,30);}

  /* ── korte kamergalm: vroege reflecties + donker wordende staart (± 0,9 s) ── */
  function ir(ctx){const c=st(ctx);if(c.ir)return c.ir;const sr=ctx.sampleRate,n=Math.floor(sr*1.1),b=ctx.createBuffer(2,n,sr);
    const pre=Math.floor(sr*.008),ER=[[.011,.5],[.017,.38],[.023,.3],[.031,.22],[.043,.16]];
    for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lp=0;
      for(let i=pre;i<n;i++){const t=(i-pre)/sr,a=.25+.6*Math.min(1,t/.6);     /* hoe later, hoe donkerder */
        lp=a*lp+(1-a)*(Math.random()*2-1);d[i]=lp*Math.exp(-6.9*t/.85)*.9;}
      ER.forEach(([t,v])=>{const i=Math.floor(sr*(t+(ch?.0023:0)));if(i<n)d[i]+=v*(ch?-1:1);});}
    c.ir=b;return b;}
  function verb(ctx){const c=st(ctx);if(!c.verb){c.verb=ctx.createConvolver();c.verb.buffer=ir(ctx);c.verb.connect(ctx.destination);}return c.verb;}

  /* ── klankbus: in → highpass → body → low-pass → vol → dest, en vol → galm ── */
  function bus(ctx,dest,o={}){const c=st(ctx),input=ctx.createGain(),hp=ctx.createBiquadFilter(),lp=ctx.createBiquadFilter(),vol=ctx.createGain(),send=ctx.createGain();
    hp.type='highpass';hp.frequency.value=70;hp.Q.value=.6;let x=input;x.connect(hp);x=hp;
    BODY.forEach(([fq,q,db])=>{const p=ctx.createBiquadFilter();p.type='peaking';p.frequency.value=fq;p.Q.value=q;p.gain.value=db;x.connect(p);x=p;});
    lp.type='lowpass';lp.frequency.value=S.bright;lp.Q.value=.5;x.connect(lp);lp.connect(vol);
    vol.gain.value=o.gain!=null?o.gain:1;vol.connect(dest);
    const ws=o.wetScale||1;send.gain.value=S.reverb*ws;vol.connect(send);send.connect(o.verb||verb(ctx));
    const B={ctx,input,lp,vol,send,ws,g0:-1,voices:[]};BUS.set(vol,B);BUS.set(input,B);
    c.buses.push(B);if(c.buses.length>24)c.buses.shift();return B;}
  /* dest mag een bus zijn, een node waar al een bus bij hoort (bv. bus.vol), of een gewone node (dan maakt GTR er één) */
  function busOf(x){return x&&(x.voices?x:BUS.get(x))||null;}
  function toBus(ctx,dest){let B=busOf(dest);if(B)return B;B=bus(ctx,dest);BUS.set(dest,B);return B;}

  /* ── spelen ── */
  function damp(v,t){if(v.end<=t)return;v.end=t;const g=v.g.gain;
    try{g.cancelScheduledValues(t);g.setTargetAtTime(0,t,.03);v.src.stop(t+.25);}catch(e){}}
  function dampAll(list,t){list.forEach(v=>damp(v,t));}
  function prune(c,B,now){c.voices=c.voices.filter(v=>v.end>now);B.voices=B.voices.filter(v=>v.end>now);}
  /* o.vel 0–127 (standaard 76), o.len = loslaten na len s, o.group false = hoort bij het akkoord dat al klinkt */
  function note(ctx,dest,m,when,o={}){const c=st(ctx),B=toBus(ctx,dest),now=ctx.currentTime,t=Math.max(when,now);
    prune(c,B,now);
    if(o.group!==false&&t-B.g0>MIX_MS){dampAll(B.voices,t-.004);B.g0=t;}      /* nieuw akkoord: het vorige loslaten */
    const b=buf(ctx,m),src=ctx.createBufferSource(),g=ctx.createGain(),vel=o.vel!=null?o.vel:76;
    const amp=Math.pow(Math.max(1,Math.min(127,vel))/90,1.6);src.buffer=b;
    g.gain.setValueAtTime(amp,t);src.connect(g).connect(B.input);src.start(t);
    let end=t+b.duration;
    if(o.len&&t+o.len<end){end=t+o.len;g.gain.setTargetAtTime(0,end,.06);src.stop(end+.4);}   /* loslaten: kort dempen */
    const v={src,g,end};B.voices.push(v);c.voices.push(v);return v;}
  /* noten laag → hoog; strum = tussenruimte (s), arp = arpeggio (S.arp); damp 'all' = ook andere bussen dempen */
  function chord(ctx,dest,midis,when,o={}){const c=st(ctx),B=toBus(ctx,dest),t=Math.max(when,ctx.currentTime);
    if(o.damp==='all'){prune(c,B,ctx.currentTime);dampAll(c.voices,t-.004);}
    const ms=[...midis].sort((a,b)=>a-b),step=o.arp?(o.arp===true?S.arp:o.arp):(o.strum!=null?o.strum:S.strum),vel=o.vel!=null?o.vel:76;
    return ms.map((m,k)=>note(ctx,B,m,t+k*step+(k&&!o.arp?(Math.random()-.5)*.004:0),
      {vel:vel*(1-.025*k)+(k===ms.length-1?3:0)+(Math.random()-.5)*4,len:o.len?o.len+(ms.length-1-k)*step*(o.arp?1:0):0,group:k===0}));}

  /* ── instellen (ook terwijl het klinkt) ── */
  function set(k,v){if(!(k in DEF)||typeof v!=='number'||!isFinite(v))return;S[k]=Math.max(LIM[k][0],Math.min(LIM[k][1],v));save();
    if(k==='decay')CTX_all(c=>{c.buf.clear();c.warm=0;});
    CTX_all(c=>c.buses.forEach(B=>{const n=B.ctx.currentTime;
      if(k==='bright')B.lp.frequency.setTargetAtTime(S.bright,n,.05);
      if(k==='reverb')B.send.gain.setTargetAtTime(S.reverb*B.ws,n,.05);}));}
  const seen=[];function CTX_all(fn){seen.forEach(ctx=>{const c=CTX.get(ctx);if(c)fn(c);});}
  function ok(ctx){try{if(!ctx||!ctx.createBufferSource||!ctx.createConvolver)return false;if(!seen.includes(ctx))seen.push(ctx);st(ctx);buf(ctx,60);return true;}catch(e){return false;}}

  /* regels in het geheime menu S (Look), bewaard in practiceRoom.guitar */
  function look(){if(typeof LOOK==='undefined'||!LOOK.add||look.done)return;look.done=1;
    const r=(k,l,min,max,step,mul=1)=>({k:'gtr_'+k,t:'range',l,min,max,step,def:DEF[k]*mul,get:()=>Math.round(S[k]*mul*1000)/1000,set:v=>set(k,v/mul)});
    LOOK.add([{h:'Guitar sound'},r('bright','Guitar brightness (Hz)',1000,6000,100),r('reverb','Guitar reverb',0,.6,.01),
      r('strum','Strum speed (ms)',0,80,1,1000),r('arp','Arpeggio step (ms)',80,500,10,1000),r('decay','Guitar ring (s)',1,5,.1)]);}

  return{S,DEF,chord,note,bus,busOf,warm,ir,verb,set,ok,look,damp:(ctx,t)=>{const c=st(ctx);dampAll(c.voices,t!=null?t:ctx.currentTime);}};
})();
