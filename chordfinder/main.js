/* ═══════════ 7. START ═══════════
   Een akkoord meegeven in de link kan ook: chord-finder.html#G7/B (het type voicing blijft wat je laatst koos). */
function init(){
  document.title=T.title;$('#h1').textContent=T.title;
  $('#inChord').placeholder=T.chordPh;$('#keysHint').textContent=T.keysHint;$('#howTxt').textContent=T.how;
  $('#btnPlay').innerHTML=ICON.play+'<span>'+esc(T.play)+'</span>';$('#btnArp').innerHTML=ICON.arp;$('#btnArp').setAttribute('aria-label',T.arp);$('#btnArp').title=T.arp;
  $('#btnPrev').innerHTML=ICON.prev;$('#btnPrev').setAttribute('aria-label',T.prev);$('#btnNext').innerHTML=ICON.next;$('#btnNext').setAttribute('aria-label',T.next);
  const h=decodeURIComponent((location.hash||'').slice(1)),hc=h&&parseChord(h);if(hc)S.chord=hc.ascii;
  try{if(window.top!==window.self)$('#side').hidden=true;}catch(e){}   /* in een ingesloten weergave leidt de zijbalk nergens heen */
  $('#idTitle').textContent=T.id.title;$('#idHow').textContent=T.id.how;$('#idClear').textContent=T.id.clear;$('#idNamesH').textContent=T.id.names;
  $('#idPlay').innerHTML=ICON.play+'<span>'+esc(T.play)+'</span>';$('#idArp').innerHTML=ICON.arp+'<span>'+esc(T.arp)+'</span>';
  if(hc)S.mode='find';
  applyDgSize();applyWood();bind();bindId();pgBind();update();renderMode();homeLink();
  /* menu S (shared/look.js): kaartdetails is een keuze van deze app (bewaard in chordFinder.v1); na elke wijziging opnieuw passend maken */
  LOOK.add([{k:'cardDet',t:'select',l:'Card details',o:Object.entries(T.det),def:'compact',get:()=>S.cardDet,set:v=>{S.cardDet=v;save();renderCol();}}]);
  LOOK.on(()=>refit());
  /* rec-lampje (cassettedeck, shared/rail.js): rec = oefentijd telt (actie < 60 s geleden, zie act()) of de band speelt; tijd = logboek van vandaag */
  ROOM.status({log:LOGKEY,rec:()=>(!!lastAct&&Date.now()-lastAct<=60000)||!!(PGP&&!PGP.loading),time:()=>{const e=LOG[dayKey()];return e&&e.s||0;}});}
init();
/* voor de console: API.parseChord('G7/B'), API.voicingsOf(API.parseChord('Cmaj7'),'drop3') */
const API={parseChord,voicingsOf,rootlessSet,identify,pgParse,QUAL,get D(){return D;},get S(){return S;},get PG(){return PG;}};
