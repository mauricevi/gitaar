'use strict';
/* ═══════════ 7. UI ═══════════ */
const ICON={
  auto:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  light:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  dark:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor"/></svg>'
};
let hostTheme;
function applyLook(){
  const root=document.documentElement,t=state.theme;
  if(hostTheme===undefined) hostTheme=root.getAttribute('data-theme');
  if(t==='auto'){ if(hostTheme) root.setAttribute('data-theme',hostTheme); else root.removeAttribute('data-theme'); }
  else root.setAttribute('data-theme',t);
  applyWood();
  root.style.setProperty('--bw',clamp(state.set.boardWidth,700,3000)+'px');
  root.style.setProperty('--mainw',+state.set.pageWidth>=2600?'none':clamp(state.set.pageWidth,1000,2600)+'px');   /* paginabreedte; 2600 = volle breedte */
  const b=$('#btnTheme'),l=T.theme.label(T.theme[t]); b.innerHTML=ICON[t]; b.title=l; b.setAttribute('aria-label',l);
  ['A','B'].forEach(k=>{const sw=$('#sw'+k);sw.style.setProperty('--c',state[k].color);sw.style.setProperty('--ct',textOn(state[k].color));});
}

/* Kaarten A en B */
function buildRows(){
  const R=T.row;
  const rootOpts=ROOT_LIST.map(r=>'<option value="'+r[0]+'">'+r[1]+'</option>').join('');
  const typeOpts=REGISTRY.map(g=>'<optgroup label="'+esc(g.group)+'">'+g.items.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join('')+'</optgroup>').join('')
    +'<optgroup label="'+esc(R.own)+'"><option value="custom">'+esc(R.custom)+'</option></optgroup>';
  let h='';
  ['A','B'].forEach(k=>{
    h+='<section class="card srow" data-k="'+k+'" id="row'+k+'" aria-label="'+esc(R.scale(k))+'">'
     +'<div class="sch">'
     +'<label class="sw" id="sw'+k+'" title="'+esc(R.colour(k))+'"><input type="color" id="col'+k+'" aria-label="'+esc(R.colour(k))+'"><span>'+k+'</span></label>'
     +'<div class="scn"><div class="cap">'+esc(R.scale(k))+'</div><b id="name'+k+'"></b></div>'
     +'<button type="button" class="ib play" id="play'+k+'" aria-pressed="false"></button>'
     +'<label class="tg" title="'+esc(R.show(k))+'"><input type="checkbox" role="switch" id="on'+k+'" aria-label="'+esc(R.show(k))+'"><i></i></label>'
     +'</div>'
     +'<div class="fields">'
     +'<label class="fld"><span>'+esc(R.root)+'</span><select id="root'+k+'">'+rootOpts+'</select></label>'
     +'<label class="fld"><span>'+esc(R.type)+'</span><select id="type'+k+'">'+typeOpts+'</select></label>'
     +'<label class="fld"><span>'+esc(R.labels)+'</span><select id="lbl'+k+'"><option value="note">'+esc(R.notes)+'</option><option value="deg">'+esc(R.degrees)+'</option><option value="none">'+esc(R.none)+'</option></select></label>'
     +'<label class="fld"><span>'+esc(R.cmode)+'</span><select id="cm'+k+'"><option value="fixed">'+esc(R.one)+'</option><option value="degree">'+esc(R.perDeg)+'</option></select></label>'
     +'</div>'
     +'<input type="text" class="fml" id="fml'+k+'" placeholder="'+esc(R.formula)+'" aria-label="'+esc(R.formulaLabel(k))+'" hidden autocomplete="off" spellcheck="false">'
     +'<p class="err" id="err'+k+'" role="alert" hidden></p>'
     +'<div class="notes" id="notes'+k+'"></div></section>';
  });
  $('#rows').innerHTML=h;
  ['A','B'].forEach(k=>{
    const on=(id,ev,fn)=>$('#'+id).addEventListener(ev,fn);
    on('col'+k,'input',e=>{state[k].color=e.target.value;update();});
    on('root'+k,'change',e=>{state[k].root=e.target.value;update();});
    on('type'+k,'change',e=>{state[k].type=e.target.value;if(e.target.value==='custom'&&!state[k].formula) state[k].formula='1 2 b3 4 5 b6 7';update();});
    on('lbl'+k,'change',e=>{state[k].label=e.target.value;update();});
    on('cm'+k,'change',e=>{state[k].cmode=e.target.value;update();});
    on('play'+k,'click',()=>playScale(k));
    on('fml'+k,'input',e=>{state[k].formula=e.target.value;update();});
  });
  $('#onA').addEventListener('change',e=>{state.A.on=e.target.checked;update();});
  $('#onB').addEventListener('change',e=>{state.B.on=e.target.checked;if(!state.B.on&&state.pos.ref==='B') state.pos.ref='A';update();});
}

function syncRows(){
  ['A','B'].forEach(k=>{
    const st=state[k],set=(id,v)=>{const e=$('#'+id);if(e.value!==v)e.value=v;};
    set('col'+k,st.color);set('root'+k,st.root);set('type'+k,st.type);set('lbl'+k,st.label);set('cm'+k,st.cmode);
    const f=$('#fml'+k);f.hidden=st.type!=='custom';set('fml'+k,st.formula);
    const er=$('#err'+k);er.hidden=!D.errs[k];er.textContent=D.errs[k]?D.errs[k]+T.row.keepLast:'';
  });
  $('#onA').checked=state.A.on!==false;
  $('#onB').checked=!!state.B.on;
  $('#rowA').classList.toggle('off',state.A.on===false);
  $('#rowB').classList.toggle('off',!state.B.on);
}

/* ── Akkoorden van A → B ──
   Diatonisch: stapel tertsen op elke graad van A en herken het resultaat in de arpeggio-groepen van REGISTRY. */
const ROMAN=['I','II','III','IV','V','VI','VII'];
const ARPS=REGISTRY.filter(g=>g.kind==='arp').flatMap(g=>g.items);
const symOf=it=>it?(it.sym!=null?it.sym:it.name):'';
function romanSuffix(sym){
  if(/^m7♭5/.test(sym)) return 'ø7'+sym.slice(4);
  if(/^m9♭5/.test(sym)) return 'ø9'+sym.slice(4);
  if(/^dim7/.test(sym)) return '°7'+sym.slice(4);
  if(sym==='dim') return '°';
  if(sym==='aug') return '+';
  return /^m(?!aj)/.test(sym)?sym.slice(1):sym;
}
const isMinorF=f=>/(^| )b3( |$)/.test(f);
function chordFor(sc,i,size){
  const N=sc.notes,r=N[i],iv=k=>mod(N[(i+k)%7].pc-r.pc,12);
  const th={3:'b3',4:'3'}[iv(2)],fi={6:'b5',7:'5',8:'#5'}[iv(4)],se={9:'bb7',10:'b7',11:'7'}[iv(6)],ni={1:'b9',2:'9',3:'#9'}[iv(1)];
  if(!th||!fi||(size!=='3'&&!se)||(size==='9'&&!ni)) return null;
  const f3='1 '+th+' '+fi,f7=f3+' '+se,formula=size==='3'?f3:(size==='7'?f7:f7+' '+ni);
  const it=ARPS.find(x=>x.f===formula),id=it?it.id:null;
  let sym=symOf(it);
  if(!it){
    const it7=ARPS.find(x=>x.f===f7);
    sym=it7?symOf(it7)+'('+accStr(ni[0]==='b'?-1:ni[0]==='#'?1:0)+'9)':'?';
  }
  const l=(sc.root.letter+r.degNum-1)%7;
  const rootId=rootIdOf(l,mod(r.pc-LPC[l]+6,12)-6,r.pc);
  const num=ROMAN[(r.degNum-1)%7]||'?';
  const pre=r.label.replace(/\d+$/,'');
  return {id,formula,rootId,name:r.name+sym,roman:pre+(th==='b3'?num.toLowerCase():num)+romanSuffix(sym)};
}
function renderDiatonic(){
  const host=$('#dchips'),sc=D.A,size=state.set.chordSize;
  document.querySelectorAll('#diat [data-cs]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cs===size));
  if(sc.size!==7||sc.kind==='arp'){host.innerHTML='<p class="dnote">'+esc(T.diatNote)+'</p>';return;}
  host.innerHTML=sc.notes.map((n,i)=>{
    const c=chordFor(sc,i,size);
    if(!c) return '<button type="button" class="dc" disabled><b>'+ROMAN[i]+'</b><small>—</small></button>';
    const on=state.B.on&&state.B.root===c.rootId&&(state.B.type==='custom'?state.B.formula===c.formula:state.B.type===c.id);
    return '<button type="button" class="dc" data-i="'+i+'" aria-pressed="'+on+'" title="'+esc(c.name+' · '+c.formula)+'"><b>'+esc(c.roman)+'</b><small>'+esc(c.name)+'</small></button>';
  }).join('');
}
/* Niet-diatonische akkoorden: elke chromatische graad van A + elk akkoordtype uit REGISTRY. */
const CHROM=[['',0],['♭',1],['',1],['♭',2],['',2],['',3],['♭',4],['',4],['♭',5],['',5],['♭',6],['',6]];
function arpItem(id){return ARPS.find(x=>x.id===id)||ARPS[0];}
function xChord(semis,id){
  const A=D.A,it=arpItem(id),sym=symOf(it);
  const pc=mod(A.root.pc+semis,12),[acc,ni]=CHROM[semis],l=(A.root.letter+ni)%7;
  const ac=mod(pc-LPC[l]+6,12)-6,name=LETTERS[l]+accStr(ac),rootId=rootIdOf(l,ac,pc);
  const num=ROMAN[ni];
  return {id:it.id,rootId,name:name+sym,roman:acc+(isMinorF(it.f)?num.toLowerCase():num)+romanSuffix(sym)};
}
function applyChord(rootId,id){state.B.root=rootId;state.B.on=true;state.B.type=id;state.B.formula='';update();}
function renderExtra(){
  const d=$('#xDeg'),q=$('#xQual');
  if(!q.options.length) q.innerHTML=REGISTRY.filter(g=>g.kind==='arp').map(g=>'<optgroup label="'+esc(g.group.replace(/^Arpeggio · /,''))+'">'
    +g.items.map(it=>'<option value="'+it.id+'">'+esc(it.name)+'</option>').join('')+'</optgroup>').join('');
  const key=D.A.root.id;
  if(d.dataset.key!==key){d.innerHTML=CHROM.map((c,i)=>'<option value="'+i+'">'+c[0]+ROMAN[c[1]]+' ('+xChord(i,'aMaj').name+')</option>').join('');d.dataset.key=key;}
  if(d.value!==String(state.set.xDeg)) d.value=state.set.xDeg;
  if(q.value!==state.set.xQual) q.value=state.set.xQual;
}

function stepPos(d){
  if(D.sys==='custom'||!D.positions.length) return;
  const n=D.positions.length;
  const cur=D.sel.length===1?D.sel[0]:(d>0?-1:0);
  state.pos.selected=[mod(cur+d,n)];
  update();
}

function bindBoardUI(){
  $('#sysSel').addEventListener('change',e=>{state.pos.system=e.target.value;state.pos.selected=[];update();});
  $('#refSel').addEventListener('change',e=>{state.pos.ref=e.target.value;update();});
  $('#outSel').addEventListener('change',e=>{state.set.outside=e.target.value;update();});
  $('#cLo').addEventListener('input',e=>{state.set.customLo=clamp(e.target.value,0,MAXF);update();});
  $('#cHi').addEventListener('input',e=>{state.set.customHi=clamp(e.target.value,0,MAXF);update();});
  $('#posChips').addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    const p=b.dataset.p;
    if(p==='all') state.pos.selected=[];
    else if(p==='prev'||p==='next'){stepPos(p==='next'?1:-1);return;}
    else{
      const i=+p,s=new Set(D.sel);
      if(s.has(i)) s.delete(i); else s.add(i);
      state.pos.selected=[...s].sort((x,y)=>x-y);
    }
    update();
  });
  $('#diat').addEventListener('click',e=>{
    const cs=e.target.closest('[data-cs]');
    if(cs){state.set.chordSize=cs.dataset.cs;update();return;}
    const b=e.target.closest('button[data-i]');if(!b)return;
    const c=chordFor(D.A,+b.dataset.i,state.set.chordSize);if(!c)return;
    state.B.root=c.rootId;state.B.on=true;
    if(c.id){state.B.type=c.id;state.B.formula='';}else{state.B.type='custom';state.B.formula=c.formula;}
    update();
  });
  const pickX=()=>{state.set.xDeg=$('#xDeg').value;state.set.xQual=$('#xQual').value;const c=xChord(+state.set.xDeg,state.set.xQual);applyChord(c.rootId,c.id);};
  $('#xApply').title=T.ui.applyTitle;
  $('#xApply').addEventListener('click',pickX);$('#xDeg').addEventListener('change',pickX);$('#xQual').addEventListener('change',pickX);
  /* markeer dezelfde noot overal: hover, of tik om vast te zetten */
  const host=$('#board');let sticky=null;
  const setHl=pc=>{const sv=host.firstElementChild;if(!sv)return;if(pc==null)sv.removeAttribute('data-hl');else sv.setAttribute('data-hl',pc);};
  host.addEventListener('pointerover',e=>{const g=e.target.closest('g.n');if(g&&sticky==null)setHl(g.dataset.pc);});
  host.addEventListener('pointerout',e=>{if(sticky==null&&!e.relatedTarget?.closest?.('g.n'))setHl(null);});
  host.addEventListener('click',e=>{
    const g=e.target.closest('g.n');
    if(!g||sticky===g.dataset.pc){sticky=null;setHl(null);return;}
    sticky=g.dataset.pc;setHl(sticky);
  });
  document.addEventListener('keydown',e=>{
    const t=e.target;if(t&&/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName))return;
    if(document.querySelector('dialog[open]'))return;
    if(D.prog){                                   /* progressie: ← → = vorig/volgend akkoord, spatie = akkoord spelen, Esc = stop */
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();if(!D.list.length)return;const d=e.key==='ArrowRight'?1:-1,n=D.list.length;
        if(e.shiftKey){let c=mod((D.pcmp?D.cmpIdx:D.idx)+d,n);if(c===D.idx)c=mod(c+d,n);compareWith(c);}   /* Shift + pijl: vergelijk met het volgende/vorige akkoord */
        else selectChord(mod(D.idx+d,n));}
      else if(e.key===' '&&(!/^(BUTTON|A)$/.test(t.tagName)||t.classList.contains('tile'))){e.preventDefault();if(e.repeat)return;(progPlayer.on||progPlayer.loading)?progStop():progPlay();}   /* spatie = band starten/stoppen */
      else if(e.key==='Escape'){if(bandOpen){bandOpen=false;renderHead();return;}progStop();stopPlay();if(D.pcmp){state.view.cmp=null;update();}}
      return;}
    if(e.key==='ArrowRight'){e.preventDefault();stepPos(1);}
    else if(e.key==='ArrowLeft'){e.preventDefault();stepPos(-1);}
    else if(e.key==='Escape'){state.pos.selected=[];update();}
  });
  const css=[];for(let pc=0;pc<12;pc++) css.push('#board svg[data-hl="'+pc+'"] g.n:not([data-pc="'+pc+'"]){opacity:.28}#board svg[data-hl="'+pc+'"] g.n[data-pc="'+pc+'"] .core{stroke:#fff;stroke-width:2.6}');
  const st=document.createElement('style');st.textContent=css.join('');document.head.appendChild(st);
}

/* Instellingen: alles wordt uit dit schema opgebouwd. Nieuwe optie = één regel hier + default in DEFAULTS.set.
   type 'wood' = de houtsoortkiezer (gedeeld met de andere tools). */
const Z=T.set;
const SETTINGS=[
 {title:Z.board,items:[{key:'wood',type:'wood',label:Z.wood}]},
 {title:Z.colours,items:[
   {key:'colShared',type:'color',label:Z.colShared},
   {key:'sharedStyle',type:'select',label:Z.sharedStyle,options:[['own',Z.own],['split',Z.split]]},
   {key:'shapeB',type:'check',label:Z.shapeB}]},
 {title:Z.perDeg,note:Z.perDegNote,items:[{key:'palette',type:'palette'}]},
 {title:Z.display,items:[
   {key:'dotSize',type:'range',label:Z.dotSize,min:9,max:16,step:0.5},
   {key:'pageWidth',type:'range',label:Z.pageWidth,min:1000,max:2600,step:50},
   {key:'boardWidth',type:'range',label:Z.boardWidth,min:800,max:3000,step:50},
   {key:'fretSpacing',type:'select',label:Z.fretSpacing,options:[['real',Z.real],['equal',Z.equal]]},
   {key:'fretNums',type:'select',label:Z.fretNums,options:[['marks',Z.marks],['all',Z.all],['off',Z.off]]},
   {key:'inlays',type:'check',label:Z.inlays},
   {key:'stringNames',type:'check',label:Z.stringNames}]},
 {title:Z.comparison,items:[
   {key:'cmpFocus',type:'select',label:Z.cmpFocus,options:[['all',Z.allEq],['diff',Z.diffOnly],['same',Z.sameOnly]]},
   {key:'sharedLabel',type:'select',label:Z.sharedLabel,options:[['A',Z.fromA],['B',Z.fromB],['both',Z.bothSmall]]}]},
 {title:Z.sound,items:[
   {key:'tempo',type:'range',label:Z.tempo,min:50,max:200,step:5},
   {key:'playMode',type:'select',label:Z.playMode,options:[['up',Z.up],['updown',Z.updown]]}]},
 {title:Z.scalePref,note:Z.scalePrefNote,wide:true,items:[{key:'scalePref',type:'scalePref'}]},
 {title:Z.postun,items:[
   {key:'numbering',type:'select',label:Z.numbering,options:[['neck',Z.neck],['degree',Z.degree]]},
   {key:'winSpan',type:'select',label:Z.winSpan,options:[['4',Z.frets(4)],['5',Z.frets(5)],['6',Z.frets(6)]]},
   {key:'tuning',type:'select',label:Z.tuning,options:Object.keys(TUNINGS).map(id=>[id,TUNINGS[id].name])}]}
];

function woodSel(){const box=$('#woodPick');if(!box)return;box.innerHTML='';const S=state.set;
  Object.keys(WOODS).forEach(w=>{const b=document.createElement('button');b.type='button';b.className='wood';b.setAttribute('aria-pressed',S.wood===w);
    b.innerHTML='<i style="background:linear-gradient('+WOODS[w][0]+','+WOODS[w][1]+')"></i>'+esc(T.woods[w]);
    b.onclick=()=>{S.wood=w;writeSharedWood();update();woodSel();};box.append(b);});
  const lb=document.createElement('label');lb.className='wood';lb.setAttribute('aria-pressed',S.wood==='custom');
  lb.innerHTML='<i style="background:linear-gradient('+S.woodCustom+','+shade(S.woodCustom,.68)+')"></i>'+esc(T.woods.custom)+'<input type="color" aria-label="'+esc(T.woods.custom)+'">';
  const inp=lb.querySelector('input');inp.value=S.woodCustom;
  inp.oninput=()=>{S.wood='custom';S.woodCustom=inp.value;applyWood();lb.querySelector('i').style.background='linear-gradient('+inp.value+','+shade(inp.value,.68)+')';};
  inp.onchange=()=>{writeSharedWood();update();woodSel();};
  box.append(lb);}

function buildSettings(){
  const host=$('#setHost');host.innerHTML='';
  SETTINGS.forEach(g=>{
    const sec=document.createElement('section');sec.className='sg'+(g.wide?' wide':'');
    sec.innerHTML='<h3>'+esc(g.title)+'</h3>'+(g.note?'<p class="cap">'+esc(g.note)+'</p>':'');
    g.items.forEach(it=>{
      if(it.type==='scalePref'){sec.insertAdjacentHTML('beforeend',scalePrefHtml());return;}
      if(it.type==='wood'){const w=document.createElement('div');w.className='woods';w.id='woodPick';w.setAttribute('role','group');w.setAttribute('aria-label',it.label);sec.appendChild(w);return;}
      if(it.type==='palette'){
        const pal=document.createElement('div');pal.className='pal';
        INT_LBL.forEach((l,i)=>{
          const lb=document.createElement('label');lb.innerHTML='<span>'+l+'</span><input type="color" id="pal'+i+'" aria-label="'+esc(Z.perDeg)+' '+l+'">';
          const inp=lb.querySelector('input');inp.value=state.set.palette[i];
          inp.addEventListener('input',()=>{state.set.palette[i]=inp.value;update();});
          pal.appendChild(lb);
        });
        sec.appendChild(pal);return;
      }
      const row=document.createElement('div');row.className='sr';
      const id='set-'+it.key;
      let ctl='';
      if(it.type==='select') ctl='<select id="'+id+'">'+it.options.map(o=>'<option value="'+o[0]+'">'+esc(o[1])+'</option>').join('')+'</select>';
      else if(it.type==='check') ctl='<input type="checkbox" id="'+id+'">';
      else if(it.type==='range') ctl='<input type="range" id="'+id+'" min="'+it.min+'" max="'+it.max+'" step="'+it.step+'"><output class="rv" id="'+id+'-v" for="'+id+'"></output>';
      else if(it.type==='color') ctl='<input type="color" id="'+id+'">';
      row.innerHTML='<label for="'+id+'">'+esc(it.label)+'</label><span class="v">'+ctl+'</span>';
      sec.appendChild(row);
    });
    host.appendChild(sec);
  });
  host.querySelectorAll('[data-sp]').forEach(e=>e.addEventListener('change',()=>setScalePref(e.dataset.sp,e.value)));
  SETTINGS.forEach(g=>g.items.forEach(it=>{
    if(it.type==='palette'||it.type==='wood'||it.type==='scalePref') return;
    const e=$('#set-'+it.key);
    const read=()=>it.type==='check'?e.checked:(it.type==='range'?+e.value:e.value);
    e.addEventListener(it.type==='select'||it.type==='check'?'change':'input',()=>{state.set[it.key]=read();update();});
  }));
  woodSel();
  syncSettings();
}
/* ── voorkeurstoonladder per akkoordsoort ── */
const SP_MAIN=['aMaj7','aM7','aDom7','aM7b5','aDim7','aMMaj7','a7sus4','a6','am6','a7b9','a7s9','a7alt','a7s11'];   /* direct zichtbaar; de rest onder "More chord types" */
function scalePrefHtml(){const Y=T.set;
  const opts=id=>'<option value="">'+esc(Y.spAuto)+'</option>'+REGISTRY.filter(g=>!g.kind).map(g=>'<optgroup label="'+esc(g.group)+'">'
      +g.items.map(x=>'<option value="'+x.id+'"'+(SPREF[id]===x.id?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'</optgroup>').join('');
  const extra=a=>{const x=/ \(/.test(a.name)?a.name.replace(/^[^(]*\(|\)$/g,''):a.name;return x&&x!==a.sym?' <small class="cap">'+esc(x)+'</small>':'';};   /* "7 (dominant)" → dominant */
  const row=a=>'<div class="sr"><label for="sp-'+a.id+'"><b class="spc">C'+esc(a.sym)+'</b>'+extra(a)+'</label><span class="v"><select id="sp-'+a.id+'" data-sp="'+a.id+'">'+opts(a.id)+'</select></span></div>';
  const main=SP_MAIN.map(id=>ARPS.find(a=>a.id===id)).filter(Boolean),rest=ARPS.filter(a=>!SP_MAIN.includes(a.id));
  const nSet=rest.filter(a=>SPREF[a.id]).length;
  return '<div class="spgrid">'+main.map(row).join('')+'</div>'
    +'<details class="spmore"'+(nSet?' open':'')+'><summary>'+esc(Y.spMore)+'</summary><div class="spgrid">'+rest.map(row).join('')+'</div></details>';}
/* nieuwe voorkeur: akkoorden van die soort die nog op de voorgestelde toonladder staan, schuiven mee;
   toonladders die je zelf per akkoord koos (of met "Start on") blijven staan */
function setScalePref(type,val){const todo=[];
  state.progs.forEach(p=>{const ks=sectionKeys(p.sections.map(x=>x.chords));
    p.sections.forEach((sec,si)=>sec.chords.forEach(c=>{if(c.type===type&&!c.soff&&c.scale===suggestScales(c,ks[si])[0])todo.push([c,ks[si]]);}));});
  if(val)SPREF[type]=val;else delete SPREF[type];
  try{localStorage.setItem('toonladderTrainer:scalePref',JSON.stringify(SPREF));}catch(e){}
  todo.forEach(([c,k])=>{c.scale=suggestScales(c,k)[0]||c.scale;});
  update();}
function syncSettings(){
  SETTINGS.forEach(g=>g.items.forEach(it=>{
    if(it.type==='wood'||it.type==='scalePref') return;
    if(it.type==='palette'){state.set.palette.forEach((c,i)=>{const e=$('#pal'+i);if(e&&e.value!==c)e.value=c;});return;}
    const e=$('#set-'+it.key),v=state.set[it.key];
    if(it.type==='check') e.checked=!!v;
    else{const want=String(v);if(e.value!==want)e.value=want;}
    if(it.type==='range') $('#set-'+it.key+'-v').textContent=it.key==='pageWidth'&&+v>=2600?T.set.full:v;
  }));
}

/* ── Afspelen (Web Audio): toonladder of akkoordtonen omhoog, optioneel weer omlaag ── */
const ICON_PLAY='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_STOP='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';
let actx=null,playTimers=[],playing=null,playBus=null;
function syncPlayBtns(){['A','B'].forEach(k=>{const b=$('#play'+k),l=playing===k?T.row.stop(k):T.row.play(k);b.innerHTML=playing===k?ICON_STOP:ICON_PLAY;b.setAttribute('aria-pressed',playing===k);b.setAttribute('aria-label',l);b.title=l;b.disabled=(k==='A'?state.A.on===false:!state.B.on);});}
function stopPlay(){
  playTimers.forEach(clearTimeout);playTimers=[];
  if(playBus){const b=playBus;playBus=null;
    try{b.gain.cancelScheduledValues(actx.currentTime);b.gain.setTargetAtTime(0,actx.currentTime,0.015);setTimeout(()=>{try{b.disconnect();}catch(e){}},150);}catch(e){}}
  document.querySelectorAll('.nc.playing').forEach(e=>e.classList.remove('playing'));
  playing=null;syncPlayBtns();
}
function pluck(f,t,d,out){
  const o=actx.createOscillator(),o2=actx.createOscillator(),g=actx.createGain(),lp=actx.createBiquadFilter(),g2=actx.createGain();
  o.type='sawtooth';o2.type='triangle';o.frequency.value=f;o2.frequency.value=f*2;g2.gain.value=0.5;
  lp.type='lowpass';lp.frequency.setValueAtTime(Math.min(f*9,9000),t);lp.frequency.exponentialRampToValueAtTime(f*1.6,t+d);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.22,t+0.006);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  o.connect(lp);o2.connect(g2);g2.connect(lp);lp.connect(g);g.connect(out);
  o.start(t);o2.start(t);o.stop(t+d+0.05);o2.stop(t+d+0.05);
}
function playScale(k,over){
  if(playing===k){stopPlay();return;}
  stopPlay();
  const sc=over||D[k];if(!sc||(!over&&k==='A'&&!D.showA)) return;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC) return;
  try{actx=actx||new AC();if(actx.state==='suspended')actx.resume();}catch(e){return;}
  const ord=sc.notes.slice().sort((a,b)=>a.semis-b.semis);
  const base=52+mod(sc.root.pc-4,12);
  const top=base+12*(Math.floor(ord[ord.length-1].semis/12)+1);
  let seq=ord.map(n=>({pc:n.pc,m:base+n.semis}));
  seq.push({pc:sc.root.pc,m:top});
  if(state.set.playMode==='updown') seq=seq.concat(seq.slice(0,-1).reverse());
  const step=60/clamp(state.set.tempo,40,240)/2,t0=actx.currentTime+0.06;
  playing=k;syncPlayBtns();
  playBus=actx.createGain();playBus.gain.value=1;playBus.connect(actx.destination);
  const bus=playBus;
  seq.forEach((q,i)=>{
    pluck(440*Math.pow(2,(q.m-69)/12),t0+i*step,step*2.2,bus);
    playTimers.push(setTimeout(()=>{
      document.querySelectorAll('#notes'+k+' .nc.playing').forEach(e=>e.classList.remove('playing'));
      const c=document.querySelector('#notes'+k+' .nc[data-pc="'+q.pc+'"]');if(c)c.classList.add('playing');
    },(0.06+i*step)*1000));
  });
  playTimers.push(setTimeout(()=>{if(playBus===bus)playBus=null;stopPlay();setTimeout(()=>{try{bus.disconnect();}catch(e){}},step*3000);},(0.06+seq.length*step+0.3)*1000));
}
