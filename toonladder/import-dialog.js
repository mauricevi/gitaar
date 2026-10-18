'use strict';
/* ── Import uit iReal Pro ───────────────────────────────────────────────────────
   iReal Pro deelt nummers als link: irealb://Titel=Componist==Stijl=Toonsoort==1r34LbKcu7<versleutelde akkoorden>=…
   (meerdere nummers gescheiden door ===, de laatste is de naam van de playlist). Zo'n link staat ook in de
   HTML-bestanden die iReal Pro exporteert. Hier: link(s) vinden → ontsleutelen → maten lezen → herhalingen,
   voltes en D.C./D.S. uitschrijven → tekst in ons eigen formaat (die je in het venster nog kunt nakijken).
   Gebaseerd op de openbare beschrijving van het formaat (irealpro.com) en de open-source parsers ireal-reader en pyRealParser. */
const IR_PREFIX='1r34LbKcu7';
function irUnscramble(s){let r='';                                      /* blokken van 50 tekens: een vaste tekenwissel */
  while(s.length>50){const p=s.slice(0,50);s=s.slice(50);
    if(s.length<2){r+=p;continue;}
    const a=p.split('');for(let i=0;i<5;i++){a[i]=p[49-i];a[49-i]=p[i];}for(let i=10;i<24;i++){a[i]=p[49-i];a[49-i]=p[i];}r+=a.join('');}
  return r+s;}
/* alle nummers uit geplakte tekst of een geëxporteerd bestand */
function irSongs(text){const out=[],re=/ireal(b|book):\/\/([^"'\s]+)/g;let m;
  while((m=re.exec(String(text||'')))){let d=m[2];try{d=decodeURIComponent(d);}catch(e){}
    const parts=d.split('===');if(parts.length>1&&parts[parts.length-1].indexOf('=')<0)parts.pop();   /* playlistnaam */
    parts.forEach(x=>{const s=irSong(x,m[1]==='book');if(s)out.push(s);});}
  return out;}
function irSong(data,old){const f=data.split('=');let mi=f.findIndex(x=>x.startsWith(IR_PREFIX)),music;
  if(mi>=0)music=irUnscramble(f[mi].slice(IR_PREFIX.length));
  else{mi=f.findIndex((x,i)=>i>2&&/[|\[{]/.test(x));if(mi<0)return null;music=f[mi];}   /* oud irealbook-formaat: niet versleuteld */
  const after=f.slice(mi+1).map(Number),bpm=after.find(n=>n>=40&&n<=300)||0;
  return{title:(f[0]||'').trim()||PT.untitled,composer:(f[1]||'').trim(),style:((old?f[2]:f[3])||'').trim(),key:((old?f[3]:f[4])||'').trim(),bpm,music};}
/* akkoordsoort van iReal (^7, -7, h7, o7 …) → onze schrijfwijze; lukt het niet, dan stap voor stap vereenvoudigen */
function irChord(tok){const m=/^([A-G][b#]?)(.*?)(\/[A-G][b#]?)?$/.exec(tok);if(!m)return null;
  let q=m[2].replace(/^-/,'m').replace(/\^/g,'maj').replace(/^h7?/,'m7b5').replace(/^min/,'m').replace(/^o(?!7)/,'dim').replace(/^o7/,'dim7');
  const bass=m[3]||'',tries=[q];let t=q;
  while(/([b#]\d+|sus\d?|add\d+|alt)$/.test(t)&&t.length){t=t.replace(/([b#]\d+|sus\d?|add\d+|alt)$/,'');tries.push(t);}
  tries.push(/^m7b5/.test(q)?'m7b5':/^mmaj/.test(q)?'mmaj7':/^m/.test(q)?'m7':/^maj/.test(q)?'maj7':/^dim/.test(q)?'dim7':/^6/.test(q)?'6':/^\d/.test(q)?'7':'');
  for(const x of tries){const c=parseChord(m[1]+x+bass);if(!c.bad)return{sym:c.sym,simple:x!==q};}
  return null;}
/* de akkoordregel van iReal → maten (lijst akkoorden per maat), met secties, herhalingen en voltes uitgeschreven */
function irBars(music){
  const s=music.replace(/XyQ/g,' ').replace(/Kcl/g,'|x').replace(/LZ/g,'|');
  const bars=[];let cur=null,sec=null,dc=null,dc3=false,fine=-1,segno=-1,ts=null;const qs=[];
  const open=()=>cur||(cur={ch:[],sec:null,rs:false,re:false,end:0,copy:0});
  const has=b=>b&&(b.ch.length||b.copy);
  const close=()=>{if(has(cur)){bars.push(cur);cur=null;}};      /* lege maat: vlaggen (herhaling, volte) gaan mee naar de volgende */
  for(let i=0;i<s.length;){const c=s[i],rest=s.slice(i);let m;
    if(c==='<'){const j=s.indexOf('>',i),txt=s.slice(i+1,j<0?s.length:j).toLowerCase().replace(/\s+/g,' ');
      if(/d\.? ?c\.? al (3rd|third)/.test(txt))dc3=true;
      else if(/d\.? ?c\.? al fine/.test(txt))dc={from:'start',to:'fine'};else if(/d\.? ?c\.? al coda/.test(txt))dc={from:'start',to:'coda'};
      else if(/d\.? ?s\.? al coda/.test(txt))dc={from:'segno',to:'coda'};else if(/d\.? ?s\.? al fine/.test(txt))dc={from:'segno',to:'fine'};
      else if(/^ ?fine ?$/.test(txt))fine=bars.length+(has(cur)?1:0);
      i=j<0?s.length:j+1;continue;}
    if(c==='('){const j=s.indexOf(')',i);i=j<0?s.length:j+1;continue;}       /* alternatieve akkoorden: overslaan */
    if(c==='*'&&s[i+1]){sec=s[i+1];i+=2;continue;}                          /* sectie *A, *B, *V (verse), *i (intro) */
    if((m=/^T(\d)(\d)/.exec(rest))){if(!ts)ts=m[1]+'/'+m[2];i+=3;continue;}
    if((m=/^N(\d)/.exec(rest))){open().end=+m[1];i+=2;continue;}            /* volte 1, 2, 3 */
    if(c==='{'){close();open().rs=true;i++;continue;}
    if(c==='}'){if(has(cur)){cur.re=true;close();}else if(bars.length)bars[bars.length-1].re=true;i++;continue;}
    if('|[]Z'.includes(c)){close();i++;continue;}
    if(c==='x'){open().copy=1;i++;continue;}                                /* vorige maat herhalen */
    if(c==='r'){open().copy=2;i++;continue;}                                /* vorige twee maten herhalen */
    if(c==='S'){segno=bars.length+(has(cur)?1:0);i++;continue;}
    if(c==='Q'){qs.push(bars.length+(has(cur)?1:0));i++;continue;}
    if(c==='n'||c==='p'||c==='W'){open().ch.push(null);i++;continue;}       /* N.C. / slash / onzichtbaar: vorig akkoord loopt door */
    if((m=/^[A-G][b#]?(?:min|maj|sus|add|alt|[0-9+\-^hob#])*(?:\/[A-G][b#]?)?/.exec(rest))){const b=open();if(sec){b.sec=sec;sec=null;}b.ch.push(m[0]);i+=m[0].length;continue;}
    if(sec&&cur&&cur.copy){cur.sec=sec;sec=null;}
    i++;}                                                                   /* spaties, s/l (grootte), f, Y, U, komma's … */
  close();
  const B=[];
  bars.forEach(b=>{
    if(b.copy===1&&!b.ch.length){if(B.length)B.push(Object.assign({},b,{ch:B[B.length-1].ch.slice()}));}
    else if(b.copy===2&&!b.ch.length){if(B.length>1){B.push(Object.assign({},b,{ch:B[B.length-2].ch.slice()}));B.push({ch:B[B.length-2].ch.slice(),sec:null,rs:false,re:false,end:0});}}
    else B.push(b);});
  /* herhalingen + voltes uitschrijven */
  const out=[];let start=0,pass=1,guard=0;
  for(let i=0;i<B.length&&guard++<4000;){const b=B[i];
    if(b.rs&&i!==start){start=i;pass=1;}
    if(dc3&&b.end===3&&pass!==3){                                          /* D.C. al 3rd ending: A nog eens, dan volte 3 */
      const f0=Math.max(0,B.findIndex(x=>x.rs)),e0=B.findIndex(x=>x.end);if(e0>f0)out.push(...B.slice(f0,e0).map((x,k)=>Object.assign({},x,{sec:k?null:x.sec})));
      pass=3;out.push(b);i++;continue;}
    if(b.end&&b.end!==pass){let j=i+1;while(j<B.length&&B[j].end!==pass)j++;i=j<B.length?j:i+1;continue;}
    out.push(b);
    if(b.re){const anyEnd=B.slice(start,i+1).some(x=>x.end),next=B.slice(i+1).some(x=>x.end===pass+1);
      if(anyEnd?next:pass===1){pass++;i=start;continue;}pass=1;}
    i++;}
  /* D.C./D.S. al Fine/Coda: nog één keer vanaf het begin (of het segno), zonder herhalingen en eerste voltes */
  if(dc){const from=dc.from==='segno'&&segno>=0?segno:0,stop=dc.to==='fine'?(fine>0?fine:B.length):(qs.length?qs[0]:B.length);let skip=false;
    for(let i=from;i<Math.min(stop,B.length);i++){const b=B[i];if(b.end)skip=b.end===1;if(!skip)out.push(Object.assign({},b,{sec:i===from?b.sec:null}));if(b.re)skip=false;}
    if(dc.to==='coda'&&qs.length>1)for(let i=qs[1];i<B.length;i++)out.push(B[i]);}
  return{bars:out,ts};}
/* maten → tekst in ons formaat: secties met |, akkoorden met hun lengte, gelijke akkoorden achter elkaar samengevoegd */
function irToText(song){
  const{bars,ts}=irBars(song.music),notes={simplified:new Set(),split:0,unknown:new Set()},secs=[];let last=null,cur=null;
  const add=(sym,len)=>{if(cur.length&&cur[cur.length-1].sym===sym&&cur[cur.length-1].len+len<=4&&[0.5,1,2,3,4].includes(cur[cur.length-1].len+len)){cur[cur.length-1].len+=len;return;}cur.push({sym,len});};
  bars.forEach(b=>{if(b.sec||!cur){cur=[];secs.push(cur);}
    let ch=b.ch.map(x=>{if(x==null)return last;const c=irChord(x);if(!c){notes.unknown.add(x);return last;}if(c.simple)notes.simplified.add(x+' → '+c.sym);last=c.sym;return c.sym;});
    if(ch.length>2){notes.split++;ch=[ch[0],ch[ch.length-1]];}           /* 3–4 akkoorden in een maat: eerste en laatste */
    ch=ch.filter(x=>x!=null);if(!ch.length&&last)ch=[last];
    if(ch.length===1)add(ch[0],1);else if(ch.length===2){add(ch[0],.5);add(ch[1],.5);}});
  const text=secs.filter(x=>x.length).map(sec=>sec.map(x=>x.sym+(x.len===1?'':'('+(x.len===.5?'½':x.len)+')')).join(' ')).join(' | ');
  return{text,ts,notes};}
const irBandStyle=st=>/bossa|latin|samba|afro|cuban|calypso|rumba|cha/i.test(st)?'bossa':/ballad/i.test(st)?'ballad':'swing';

/* iReal-paneel in het venster "New progression": plakken of bestand openen → één nummer invullen, of kiezen uit een playlist */
let irFound=[],irStyle=null;
function irShow(text){irFound=irSongs(text);const msg=$('#irMsg');$('#irList').innerHTML='';$('#irQ').hidden=true;$('#irAll').hidden=true;
  if(!irFound.length){msg.textContent=String(text||'').trim()?TS.ir.none:'';return;}
  if(irFound.length===1){irApply(irFound[0]);return;}
  msg.textContent=TS.ir.found(irFound.length);$('#irQ').hidden=irFound.length<8;$('#irAll').hidden=false;$('#irAll').textContent=TS.ir.all(irFound.length);irList();}
function irList(){const q=($('#irQ').value||'').toLowerCase().trim();
  const l=irFound.map((x,i)=>[x,i]).filter(([x])=>!q||(x.title+' '+x.composer).toLowerCase().includes(q)).slice(0,60);
  $('#irList').innerHTML=l.map(([x,i])=>'<button type="button" class="irs" data-irs="'+i+'"><b>'+esc(x.title)+'</b><small>'+esc([x.composer,x.style,x.key].filter(Boolean).join(' · '))+'</small></button>').join('');}
function irApply(song){const r=irToText(song);
  $('#shName').value=song.title;$('#shChords').value=r.text;tplName=false;if(song.bpm)$('#shTempo').value=song.bpm;
  irStyle=song.style?irBandStyle(song.style):null;
  const n=r.notes,extra=[];
  if(irStyle)extra.push(TS.ir.style(song.style,PT.bandItems[irStyle]));
  if(r.ts&&r.ts!=='4/4')extra.push(TS.ir.ts(r.ts));
  if(n.simplified.size)extra.push(TS.ir.simple([...n.simplified].slice(0,6).join(', ')+(n.simplified.size>6?' …':'')));
  if(n.split)extra.push(TS.ir.split(n.split));
  if(n.unknown.size)extra.push(TS.ir.unknown([...n.unknown].join(', ')));
  $('#irMsg').textContent=TS.ir.done(song.title)+(extra.length?' '+extra.join(' '):'');
  document.querySelectorAll('#irList .irs').forEach(b=>b.setAttribute('aria-pressed',irFound[+b.dataset.irs]===song));
  sheetPreview();}
function irAddAll(){let n=0,last=null;
  irFound.forEach(song=>{const parsed=parseText(irToText(song).text).map(sec=>sec.filter(c=>!c.bad));if(!parsed.flat().length)return;
    last={id:newId(),name:song.title.slice(0,80),tempo:clamp(song.bpm||100,40,240),sections:makeSections(parsed)};state.progs.push(last);n++;});
  if(!last)return;state.view.prog=last.id;state.view.sel=0;state.view.mode='prog';editing=false;$('#sheet').close();update();}
function bindIreal(){
  $('#irIn').addEventListener('input',e=>irShow(e.target.value));
  $('#irFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>irShow(rd.result);rd.readAsText(f);e.target.value='';});
  $('#irQ').addEventListener('input',irList);
  $('#irList').addEventListener('click',e=>{const b=e.target.closest('[data-irs]');if(b)irApply(irFound[+b.dataset.irs]);});
  $('#irAll').addEventListener('click',irAddAll);}

/* ── venster "New progression" / "Edit progression" ── */
let sheetMode='new',tplName=false;
const reEsc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function openSheet(mode){
  progStop();sheetMode=mode;tplName=false;const p=curProg(),edit=mode==='edit'&&p;
  $('#shTitle').textContent=edit?TS.editT:TS.newT;
  $('#shName').value=edit?p.name:'';$('#shChords').value=edit?progToText(p):'';$('#shTempo').value=edit?p.tempo:100;
  $('#shChords').placeholder=TS.placeholder;$('#shName').placeholder=PT.untitled;
  $('#shTplWrap').hidden=!!edit;
  const tp=[[TS.blank,'',''],...T.templates.map(x=>[x[0],x[1],x[0]])];
  irStyle=null;irFound=[];$('#shIr').hidden=true;$('#irIn').value='';$('#irMsg').textContent='';$('#irList').innerHTML='';$('#irQ').hidden=$('#irAll').hidden=true;
  if(p&&!edit)tp.push([TS.copy,progToText(p),PT.copyOf(p.name)]);
  $('#shTpl').innerHTML=tp.map((x,i)=>'<button type="button" class="chip" data-tpl="'+i+'">'+esc(x[0])+'</button>').join('')
    +'<button type="button" class="chip ir" data-irb="1" aria-pressed="false">'+esc(TS.ir.chip)+'</button>';
  $('#shTpl').onclick=e=>{const ib=e.target.closest('[data-irb]');
    if(ib){const on=$('#shIr').hidden;$('#shIr').hidden=!on;ib.setAttribute('aria-pressed',on);if(on)$('#irIn').focus();return;}
    const b=e.target.closest('[data-tpl]');if(!b)return;const x=tp[+b.dataset.tpl];
    $('#shChords').value=x[1];if(!$('#shName').value.trim()||tplName){$('#shName').value=x[2];tplName=!!x[2];}
    document.querySelectorAll('#shTpl .chip').forEach(c=>c.setAttribute('aria-pressed',c===b));sheetPreview();};
  sheetPreview();$('#sheet').showModal();$('#shChords').focus();}
function sheetPreview(){
  const parsed=parseText($('#shChords').value),all=parsed.flat(),bad=all.filter(c=>c.bad);
  $('#shErr').innerHTML=bad.map(b=>'<span class="w">'+esc(TS.unknown(b.bad))+'</span>'+(b.fix?'<button type="button" class="chip" data-fix="'+esc(b.bad)+'" data-to="'+esc(b.fix)+'">'+esc(TS.use(b.fix))+'</button>':'')).join('');
  const keys=[],sk=sectionKeys(parsed.map(sec=>sec.filter(c=>!c.bad)));
  $('#shPrev').innerHTML=parsed.map((sec,si)=>{const k=sk[si];if(k)keys.push(secLabel(si)+': '+keyName(k));
    return '<div class="psec"><div class="psl"><b>'+secLabel(si)+'</b><small>'+esc(keyName(k))+'</small></div><div class="ptiles">'
      +sec.map(c=>c.bad?'<div class="tw"><div class="tile warn"><span class="rn">?</span><b>'+esc(c.bad)+'</b></div></div>'
        :'<div class="tw" style="flex:'+c.bars+' 1 '+(c.bars*100)+'px"><div class="tile"><span class="rn">'+esc(romanOf(c,k))+'</span><b>'+esc(c.sym)+'</b><span class="sc">'+esc(shortName(suggestScales(c,k)[0]))+'</span><span class="br">'+esc(PT.bars(c.bars))+'</span></div></div>').join('')
      +'</div></div>';}).join('');
  $('#shKeys').textContent=(keys.length?TS.keys(keys.join(' · ')):'')+(sheetMode==='edit'?TS.keep:'');
  $('#shSave').disabled=!!bad.length||!all.length;}
function bindSheet(){
  const dlg=$('#sheet');
  $('#shChords').addEventListener('input',sheetPreview);
  $('#shName').addEventListener('input',()=>{tplName=false;});
  $('#shErr').addEventListener('click',e=>{const b=e.target.closest('[data-fix]');if(!b)return;const ta=$('#shChords');
    ta.value=ta.value.replace(new RegExp('(^|[\\s|])'+reEsc(b.dataset.fix)+'(?=[\\s|]|$)'),'$1'+b.dataset.to);sheetPreview();ta.focus();});
  $('#shCancel').addEventListener('click',()=>dlg.close());
  $('#shSave').addEventListener('click',()=>{
    const parsed=parseText($('#shChords').value);if(parsed.flat().some(c=>c.bad)||!parsed.flat().length)return;
    const name=$('#shName').value.trim().slice(0,80)||PT.untitled,tempo=clamp($('#shTempo').value||100,40,240),p=curProg();
    if(sheetMode==='edit'&&p){p.name=name;p.tempo=tempo;p.sections=makeSections(parsed,p);state.view.sel=Math.min(state.view.sel,Math.max(0,flat(p).length-1));}
    else{const np={id:newId(),name,tempo,sections:makeSections(parsed)};state.progs.push(np);state.view.prog=np.id;state.view.sel=0;editing=false;}
    if(irStyle){state.pv.band.style=irStyle;irStyle=null;}                    /* stijl uit iReal (Bossa, Ballad …) voor de band */
    state.view.mode='prog';dlg.close();update();});}

/* Statische teksten uit TEXT (elementen met data-t / data-ta) */
const pathGet=p=>p.split('.').reduce((o,k)=>o&&o[k],TEXT);
function applyText(){
  document.querySelectorAll('[data-t]').forEach(el=>{const v=pathGet(el.dataset.t);if(typeof v==='string')el.textContent=v;});
  document.querySelectorAll('[data-ta]').forEach(el=>{const v=pathGet(el.dataset.ta);if(typeof v==='string'){el.setAttribute('aria-label',v);el.title=v;}});
  $('#lnkHome').href=T.links.home;$('#lnkFret').href=T.links.fret;homeSum();$('#btnReset').textContent=T.reset.btn;
  document.title=T.nav.scales;
}

function update(){
  stopPlay();
  derive();
  const pm=!!D.prog;
  modeUI(pm);renderSide();renderHead();
  if(pm){renderProgCard();renderInsp();}
  else{syncRows();renderNotes('A');renderNotes('B');renderDiatonic();renderExtra();renderPosBar();}
  renderBoard();renderFormMap();
  if(!pm)scrollToSel();
  renderLegend();
  renderCompare();
  syncSettings();
  applyLook();
  save();
}

/* Progressie die een andere Practice Room-app meegeeft in de link (Chord Moves → "Open in Scale Trainer"):
   toonladder-trainer.html#add={"name":…,"chords":"G B C Cm","tempo":92,"style":"swing"} → toevoegen (of de bestaande openen) */
