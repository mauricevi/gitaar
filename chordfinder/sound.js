/* ═══════════ 4. KLANK ═══════════
   Overgenomen uit Chord Moves (§4): piano en contrabas uit backing-sounds.js (mag ontbreken: dan een eenvoudige synth),
   met dezelfde afstelling (velocity → volume, helderdere piano, galm, milde compressor). */
let actx=null,IR=null,SND=null,sndPromise=null;
const VEL={piano:80,bass:105},MIX={piano:1,bass:1,reverb:.16};
const midiF=m=>440*Math.pow(2,(m-69)/12);
function audio(){if(!actx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;actx=new AC();}
  if(actx.state==='suspended')actx.resume();return actx;}
function b64buf(s){const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer;}
function decode(s){return new Promise((res,rej)=>actx.decodeAudioData(b64buf(s),res,rej)).then(buf=>{
  /* MP3 begint met een korte stilte: zoek de inzet, zodat alles precies op de tel valt */
  const d=buf.getChannelData(0);let pk=0;for(let i=0;i<d.length;i++)pk=Math.max(pk,Math.abs(d[i]));
  let i=0;while(i<d.length&&Math.abs(d[i])<pk*.002)i++;return{buf,off:Math.max(0,i-8)/buf.sampleRate};});}
function loadSounds(){const B=window.BACKING_SOUNDS;if(!B||!audio())return Promise.resolve(null);if(sndPromise)return sndPromise;
  const job=grp=>Promise.all(Object.keys(B[grp]).map(k=>decode(B[grp][k]).then(r=>Object.assign(r,{key:+k}))));
  sndPromise=Promise.all([job('piano'),job('bass')]).then(([p,b])=>{SND={piano:p.sort((x,y)=>x.key-y.key),bass:b.sort((x,y)=>x.key-y.key),scale:B.scale};return SND;})
    .catch(()=>{SND=null;return null;});
  return sndPromise;}
function makeIR(){const sr=actx.sampleRate,n=Math.floor(sr*1.4),ir=actx.createBuffer(2,n,sr);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);let lp=0;for(let i=0;i<n;i++){lp=lp*.6+(Math.random()*2-1)*.4;d[i]=lp*Math.pow(1-i/n,3);}}return ir;}
/* mengpaneel per keer afspelen (zo kan stoppen alles tegelijk laten wegsterven): piano- en basbus → galm → compressor */
function chain(vol){const out=actx.createGain();out.gain.value=1;out.connect(actx.destination);
  const comp=actx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=2.5;comp.attack.value=.01;comp.release.value=.2;comp.knee.value=10;comp.connect(out);
  if(!IR)IR=makeIR();const verb=actx.createConvolver();verb.buffer=IR;const wet=actx.createGain();wet.gain.value=MIX.reverb;verb.connect(wet).connect(comp);
  const sc=SND?SND.scale:{piano:1,bass:1},db=x=>Math.pow(10,x/20),B=window.BACKING_SOUNDS;
  /* vol = {piano, bass, drums} 0–100 (schuifjes in Progression); zonder vol: zoals afgesteld */
  const base={piano:(SND?.5*db(4.5)/sc.piano:.5)*MIX.piano,bass:(SND?.5*db(2.7)/sc.bass:.35)*MIX.bass,drums:hasDrums()?.5*db(1)/(B.scale&&B.scale.drum||1):1};
  const vf=k=>vol&&vol[k]!=null?Math.pow(vol[k]/100,2):1;
  const pg=actx.createGain();pg.gain.value=base.piano*vf('piano');
  const pk=actx.createBiquadFilter();pk.type='peaking';pk.frequency.value=1600;pk.Q.value=.8;pk.gain.value=4;pg.connect(pk).connect(comp);   /* iets helderdere piano */
  const ps=actx.createGain();ps.gain.value=.22;pg.connect(ps).connect(verb);
  const bg=actx.createGain();bg.gain.value=base.bass*vf('bass');bg.connect(comp);
  const bs=actx.createGain();bs.gain.value=.04;bg.connect(bs).connect(verb);
  const dg=actx.createGain();dg.gain.value=base.drums*vf('drums');
  const hs=actx.createBiquadFilter();hs.type='highshelf';hs.frequency.value=6000;hs.gain.value=5;dg.connect(hs).connect(comp);   /* meer glans op de bekkens */
  const ds=actx.createGain();ds.gain.value=.12;dg.connect(ds).connect(verb);
  return{out,piano:pg,bass:bg,drums:dg,base};}
/* volume van één instrument tijdens het spelen bijstellen */
function mixVol(mix,k,v){if(mix&&mix[k])try{mix[k].gain.setTargetAtTime(mix.base[k]*Math.pow(v/100,2),actx.currentTime,.05);}catch(e){}}
/* één sample: toonhoogte via playbackRate, lengte via een dempende envelope */
function playSample(s,t,gain,out,rate,len,rel){const src=actx.createBufferSource(),g=actx.createGain();src.buffer=s.buf;src.playbackRate.value=rate||1;
  g.gain.value=gain;src.connect(g).connect(out);src.start(Math.max(t,actx.currentTime),s.off);
  if(len){const end=Math.min(t+len,t+(s.buf.duration-s.off)/(rate||1)-.05);g.gain.setValueAtTime(gain,end);g.gain.setTargetAtTime(0,end,rel||.05);src.stop(end+(rel||.05)*6);}}
const nearestS=(list,m)=>list.reduce((a,b)=>Math.abs(b.key-m)<Math.abs(a.key-m)?b:a);
const velG=(v,ref)=>Math.pow(v/ref,2);
/* reserveklanken als backing-sounds.js ontbreekt */
function pluck(f,t,d,out){const o=actx.createOscillator(),o2=actx.createOscillator(),g=actx.createGain(),lp=actx.createBiquadFilter(),g2=actx.createGain();
  o.type='sawtooth';o2.type='triangle';o.frequency.value=f;o2.frequency.value=f*2;g2.gain.value=.5;
  lp.type='lowpass';lp.frequency.setValueAtTime(Math.min(f*9,9000),t);lp.frequency.exponentialRampToValueAtTime(f*1.6,t+d);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(lp);o2.connect(g2);g2.connect(lp);lp.connect(g);g.connect(out);o.start(t);o2.start(t);o.stop(t+d+.05);o2.stop(t+d+.05);}
function bassSynth(m,t,dur,out){const o=actx.createOscillator(),g=actx.createGain();o.type='triangle';o.frequency.value=midiF(m);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.5,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur+.05);
  o.connect(g).connect(out);o.start(t);o.stop(t+dur+.1);}
function pianoNote(m,t,len,v,bus){if(!SND){pluck(midiF(m),t,Math.max(.25,len),bus);return;}
  const s=nearestS(SND.piano,m);playSample(s,t,velG(v,VEL.piano),bus,Math.pow(2,(m-s.key)/12),len,.07);}
function bassPlay(m,t,len,v,bus){if(!SND){bassSynth(m,t,len,bus);return;}
  const s=nearestS(SND.bass,m);playSample(s,t,velG(v,VEL.bass),bus,Math.pow(2,(m-s.key)/12),len,.035);}
/* ── drums (Progression): opnames uit backing-sounds.js (window.BACKING_SOUNDS.drum), alleen de vijf die we gebruiken;
   ontbreken ze, dan eenvoudige synthklanken. Afstelling (velocity, onderlinge balans) uit toonladder/backing.js ── */
let DRS=null,drPromise=null,drFail=false;
const DRVEL={ride:90,kick:100,stick:90,pedal:80,snare:90},DRDB={ride:2,kick:-5,stick:-9,pedal:0,snare:0};
const hasDrums=()=>!!(window.BACKING_SOUNDS&&window.BACKING_SOUNDS.drum);
function loadDrums(){if(!hasDrums()||!audio())return Promise.resolve(null);if(drPromise)return drPromise;
  const B=window.BACKING_SOUNDS.drum;
  drPromise=Promise.all(Object.keys(DRVEL).filter(k=>B[k]).map(k=>decode(B[k]).then(r=>[k,r])))
    .then(l=>{DRS=Object.fromEntries(l);return DRS;}).catch(()=>{drFail=true;DRS=null;return null;});
  return drPromise;}
let NOISE=null;
function drNoise(){if(NOISE)return NOISE;const n=actx.sampleRate|0;NOISE=actx.createBuffer(1,n,actx.sampleRate);const d=NOISE.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return NOISE;}
function drMetal(t,dur,vol,hp,out){const g=actx.createGain(),h=actx.createBiquadFilter(),nz=actx.createBufferSource();h.type='highpass';h.frequency.value=hp;
  nz.buffer=drNoise();nz.connect(h).connect(g).connect(out);nz.start(t,Math.random()*.5);nz.stop(t+dur+.05);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+dur);}
function drKick(t,vol,out){const o=actx.createOscillator(),g=actx.createGain();o.type='sine';
  o.frequency.setValueAtTime(95,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.22);
  o.connect(g).connect(out);o.start(t);o.stop(t+.25);}
function drStick(t,out){const o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=1320;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.06);
  o.connect(g).connect(out);o.start(t);o.stop(t+.08);}
function drum(k,t,v,out){t=Math.max(t,actx.currentTime);
  if(DRS&&DRS[k]){playSample(DRS[k],t,velG(v,DRVEL[k])*Math.pow(10,(DRDB[k]||0)/20),out);return;}
  if(hasDrums()&&!drFail)return;                                 /* opnames worden nog ingelezen */
  if(k==='ride')drMetal(t,.6,.08*v/90,5000,out);else if(k==='pedal')drMetal(t,.08,.05*v/80,5000,out);
  else if(k==='snare')drMetal(t,.16,.1*v/90,1400,out);else if(k==='kick')drKick(t,.25*v/100,out);else drStick(t,out);}
/* basnoot tussen E1 en E2, zo dicht mogelijk bij ref */
function near(pc,ref){let best=null;for(let m=28;m<=40;m++)if(mod(m,12)===pc&&(best==null||Math.abs(m-ref)<Math.abs(best-ref)))best=m;return best;}
/* een vorm laten horen: licht aangeslagen van laag naar hoog (of als arpeggio), met de bas eronder als die aanstaat */
function playShape(c,v,arp){if(!c||!v||!audio())return;act();
  const go=()=>{const mix=chain(),t=actx.currentTime+.04,step=arp?.2:.028,N=v.notes.length;
    v.notes.forEach((x,k)=>pianoNote(x.midi,t+k*step,arp?.9+(N-k)*step:2.2,arp?80:72,mix.piano));
    if(S.bass)bassPlay(near(c.bassPc!=null?c.bassPc:c.rootPc,33),t,arp?N*step+1:2.4,104,mix.bass);
    setTimeout(()=>{try{mix.out.disconnect();}catch(e){}},6500);};
  if(SND||!window.BACKING_SOUNDS)go();else loadSounds().then(go);}
/* opnames alvast inlezen bij de eerste klik ergens op de pagina */
addEventListener('pointerdown',()=>{if(window.BACKING_SOUNDS&&audio())loadSounds();},{once:true});
/* één noot (bij het neerzetten van een noot in "What's this chord?") */
function tapNote(m){if(!audio())return;
  const go=()=>{const mix=chain();pianoNote(m,actx.currentTime+.02,1.2,76,mix.piano);setTimeout(()=>{try{mix.out.disconnect();}catch(e){}},3000);};
  if(SND||!window.BACKING_SOUNDS)go();else loadSounds().then(go);}
