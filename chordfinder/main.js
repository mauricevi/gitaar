/* ═══════════ 7. START ═══════════
   Een akkoord meegeven in de link kan ook: chord-finder.html#G7/B (het type voicing blijft wat je laatst koos). */
function init(){
  document.title=T.title;$('#h1').textContent=T.title;$('#sub').textContent=T.sub;
  $('#inChord').placeholder=T.chordPh;$('#keysHint').textContent=T.keysHint;$('#howTxt').textContent=T.how;
  $('#btnPlay').innerHTML=ICON.play+'<span>'+esc(T.play)+'</span>';$('#btnArp').innerHTML=ICON.arp+'<span>'+esc(T.arp)+'</span>';
  $('#btnPrev').innerHTML=ICON.prev;$('#btnPrev').setAttribute('aria-label',T.prev);$('#btnNext').innerHTML=ICON.next;$('#btnNext').setAttribute('aria-label',T.next);
  const h=decodeURIComponent((location.hash||'').slice(1)),hc=h&&parseChord(h);if(hc)S.chord=hc.ascii;
  try{if(window.top!==window.self)$('#side').hidden=true;}catch(e){}   /* in een ingesloten weergave leidt de zijbalk nergens heen */
  $('#idTitle').textContent=T.id.title;$('#idHow').textContent=T.id.how;$('#idClear').textContent=T.id.clear;$('#idNamesH').textContent=T.id.names;
  $('#idPlay').innerHTML=ICON.play+'<span>'+esc(T.play)+'</span>';$('#idArp').innerHTML=ICON.arp+'<span>'+esc(T.arp)+'</span>';
  if(hc)S.mode='find';
  applyTheme();applyWood();bind();bindId();pgBind();update();renderMode();homeLink();}
init();
/* voor de console: API.parseChord('G7/B'), API.voicingsOf(API.parseChord('Cmaj7'),'drop3') */
const API={parseChord,voicingsOf,rootlessSet,identify,pgParse,QUAL,get D(){return D;},get S(){return S;},get PG(){return PG;}};
