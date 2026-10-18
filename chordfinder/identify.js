/* ═══════════ 8. WHAT'S THIS CHORD? ═══════════
   Noten op de hals → mogelijke akkoordnamen. Elke grondtoon (12) × elke akkoordsoort in QUAL krijgt strafpunten:
   ontbrekende tonen (de kenmerkende tonen het zwaarst, de reine kwint het lichtst, de grondtoon ertussen = rootless),
   een andere toon in de bas (omkering), een basnoot buiten het akkoord (slash-akkoord) en een klein beetje voor
   ingewikkelder akkoorden. Laagste score bovenaan; zo komt C6 vóór Am7/C, en C vóór Cmaj7 (zonder 7). */
/* kenmerkende tonen: alles behalve grondtoon en reine kwint (bij 13 en m11 mag de 9 ook ontbreken) */
const DEFINES=id=>QUAL[id].iv.map(x=>mod(x,12)).filter(x=>x!==0&&x!==7&&!(id==='13'&&x===2));
const ROOTN=pc=>parseNote(ROOTS12[pc]);
function identify(f){
  const ns=f.map((x,s)=>x>=0?{s,midi:OPEN[s]+x,pc:mod(OPEN[s]+x,12)}:null).filter(Boolean),pcs=[...new Set(ns.map(n=>n.pc))];
  if(pcs.length<2)return[];
  const bass=ns.reduce((a,b)=>b.midi<a.midi?b:a).pc,out=[];
  for(let r=0;r<12;r++)for(const q of Object.keys(QUAL)){
    const iv=[...new Set(QUAL[q].iv.map(x=>mod(x,12)))],T=new Set(iv.map(x=>mod(r+x,12))),extra=pcs.filter(p=>!T.has(p));
    /* één toon buiten het akkoord mag alleen als het de bas is (slash-akkoord, bijv. D/C) */
    const slash=extra.length===1&&extra[0]===bass&&pcs.length>=4;if(extra.length&&!slash)continue;
    const miss=iv.filter(x=>!pcs.includes(mod(r+x,12)));if(iv.length-miss.length<2)continue;
    const def=DEFINES(q);let sc=.12*iv.length;
    miss.forEach(x=>{sc+=x===0?2.2:x===7?.35:def.includes(x)?3:1;});
    sc+=slash?2.4:bass===r?0:1;
    out.push({r,q,sc,miss,slash});}
  out.sort((a,b)=>a.sc-b.sc);
  const seen=new Set(),res=[],best=out.length?out[0].sc:0;
  for(const o of out){if(o.sc>best+3.6)break;   /* veel slechter dan de beste: weglaten */
    const root=ROOTN(o.r),plainC=makeChord(root,o.q,null);
    const bn=bass===o.r?null:o.slash?ROOTN(bass):parseNote(toneName(plainC,bass))||ROOTN(bass);
    const c=makeChord(root,o.q,bn);if(seen.has(c.sym))continue;seen.add(c.sym);
    const lab=ivName(mod(bass-o.r,12),o.q),role=o.slash?null:bass===o.r?0:lab in ROLE?ROLE[lab]:null;
    res.push({c,sc:o.sc,slash:o.slash,inv:role,low:lab,miss:o.miss.map(x=>x===0?'R':ivName(x,o.q))});
    if(res.length>=8)break;}
  return res;}

/* ── scherm ── S.idf = frets per snaar (−1 = gedempt), S.idSel = gekozen naam in de lijst */
let ID=null;   /* {v (de vorm), list (namen), sel} */
function deriveId(){const v=mk(S.idf,'id'),list=v.notes.length?identify(S.idf):[];ID={v,list,sel:list[Math.min(S.idSel,list.length-1)]||null};}
const idLab=x=>ID.sel?ivName(mod(x.pc-ID.sel.c.rootPc,12),ID.sel.c.q):ROOTS12[x.pc];
function idInfo(o){const p=o.slash||o.inv===0?[]:[o.inv!=null?T.inv[o.inv]:T.inBass(o.low)];   /* slash-bas staat al in de naam */
  if(o.miss.includes('R'))p.push(T.id.rootless);
  const m=o.miss.filter(x=>x!=='R');if(m.length)p.push(T.id.no(m.join(', ')));
  return p.join(' · ');}
function renderId(){deriveId();const v=ID.v,has=v.notes.length>0;
  $('#idNeck').innerHTML=neckSvg(v.notes.map(x=>({s:x.s,f:x.f,cls:ID.sel&&x.pc===ID.sel.c.rootPc?'rt':'dt',lab:idLab(x)})),true);
  $('#idShape').hidden=!has;
  if(has){$('#idDg').innerHTML=diagram(ID.sel?ID.sel.c:null,v,idLab);
    $('#idFrets').textContent=fretTxt(v);
    $('#idNotes').innerHTML=v.notes.map(x=>'<span class="nt"><b>'+esc(ROOTS12[x.pc])+'</b>'+(ID.sel?'<small>'+esc(idLab(x))+'</small>':'')+'</span>').join('');}
  const L=ID.list;
  $('#idList').innerHTML=!L.length?'<p class="note">'+esc(new Set(v.notes.map(x=>x.pc)).size<2?T.id.none:T.id.noMatch)+'</p>':
    L.map((o,i)=>'<li class="idr'+(o===ID.sel?' on':'')+'"><button type="button" class="idn" data-i="'+i+'" aria-pressed="'+(o===ID.sel)+'"><b>'+esc(o.c.sym)+'</b><small>'+esc(idInfo(o))+'</small></button>'+
      '<button type="button" class="act" data-open="'+i+'" aria-label="'+esc(T.id.openL(o.c.sym))+'">'+esc(T.id.open)+'</button></li>').join('');}
/* naar de Finder met dit akkoord; staat precies deze vorm in een van de soorten, dan die soort en vorm kiezen */
function idOpen(o){const key=ID.v.f.join(',');S.mode='find';S.str=S.low=S.top='all';S.from=1;S.to=MAXF;
  for(const t of VTYPES)if(voicingsOf(o.c,t).some(v=>v.key===key)){S.type=t;S.sel=key;break;}
  prevSel=null;renderMode();setChord(o.c);scrollTo({top:0,behavior:'smooth'});}
function bindId(){
  $('#idNeck').addEventListener('click',e=>{const r=e.target.closest('.cell');if(!r)return;const s=+r.dataset.s,f=+r.dataset.f;
    S.idf[s]=S.idf[s]===f?-1:f;S.idSel=0;act();save();renderId();if(S.idf[s]===f)tapNote(OPEN[s]+f);});
  $('#idList').addEventListener('click',e=>{const o=e.target.closest('[data-open]'),b=e.target.closest('[data-i]');
    if(o){idOpen(ID.list[+o.dataset.open]);return;}
    if(b){S.idSel=+b.dataset.i;save();renderId();}});
  $('#idClear').addEventListener('click',()=>{S.idf=[-1,-1,-1,-1,-1,-1];S.idSel=0;save();renderId();});
  const play=arp=>{if(!ID.v.notes.length)return;const lo=ID.v.notes.reduce((a,b)=>b.midi<a.midi?b:a);
    playShape(ID.sel?ID.sel.c:{rootPc:lo.pc,bassPc:null},ID.v,arp);if(ID.sel)logChord(ID.sel.c.sym);};
  $('#idPlay').addEventListener('click',()=>play(false));$('#idArp').addEventListener('click',()=>play(true));
  $('#segMode').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b||b.dataset.mode===S.mode)return;S.mode=b.dataset.mode;save();renderMode();});}
/* modus: Finder, What's this chord? of Progression (progression.js) */
function renderMode(){const m=S.mode;seg($('#segMode'),Object.entries(T.mode),m,'mode');
  $('#vFind').hidden=m!=='find';$('#vId').hidden=m!=='id';$('#vProg').hidden=m!=='prog';
  $('#sub').textContent=m==='id'?T.id.sub:m==='prog'?T.pg.sub:T.sub;
  $('#howTxt').textContent=m==='prog'?T.pg.how:T.how;
  if(m==='find')update();if(m==='id')renderId();if(m==='prog')pgRender();else pgStop();}   /* Labels en Bass zijn gedeeld: Finder bijwerken */
