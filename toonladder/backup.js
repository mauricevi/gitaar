/* ══ BACK-UP · gelijk in alle Practice Room-pagina's (Home, Fretboard Trainer, Scale Trainer, Note Prompter, Chord Moves) ══════
   Exporteren: alle Practice Room-gegevens die deze pagina kan zien → één .json-bestand in je Downloads.
   Importeren: één of meer van die bestanden → samenvoegen met wat er al is → pagina herladen.
     · Instellingen, voortgang en progressies: de geïmporteerde versie vervangt de huidige.
     · Oefenlogboeken en zelf ingevulde minuten (kalender): per dag samengevoegd, de hoogste waarde blijft.
   Het wegschrijven gebeurt ná het herladen en vóórdat de app zijn gegevens leest, zodat de app ze niet meteen
   weer overschrijft met wat hij nog in zijn geheugen had.
   Knoppen verschijnen in elk element met id="prBackup" (data-app = naam van de pagina, data-btn = knopstijl). */
var PRB=(function(){
  'use strict';
  var RX=/^(fretTrainer|toonladderTrainer|practiceRoom|notePrompter|chordMoves|chordFinder)/;
  var APPS=[['fretTrainer','Fretboard Trainer'],['toonladderTrainer','Scale Trainer'],['notePrompter','Note Prompter'],['chordMoves','Chord Moves'],['chordFinder','Chord Finder'],['practiceRoom','Home and shared settings']];
  var LOGS=/(\.log|:log|^practiceRoom\.manual)$/;
  var TXT={exp:'Export backup',imp:'Import backup…',
    saved:function(f,list){return 'Saved '+f+' with: '+list+'.';},
    missing:function(list){return ' Not visible from this page: '+list+'. If you used that in this browser, export from there too.';},
    done:function(list,n){return 'Imported '+n+' item'+(n===1?'':'s')+': '+list+'.';},
    none:'Nothing to export yet.',bad:function(n){return n+' file'+(n===1?' is':'s are')+' not a Practice Room backup.';},
    note:'One file with your progress, settings and practice log. Use it to move to another browser or computer.'};
  var ls=null;try{ls=window.localStorage;}catch(e){}

  /* een vorige import afmaken (na het herladen, vóór de app iets leest) */
  try{var pend=sessionStorage.getItem('prImport');
    if(pend&&ls){sessionStorage.removeItem('prImport');var P=JSON.parse(pend);
      Object.keys(P.data).forEach(function(k){if(RX.test(k))ls.setItem(k,P.data[k]);});
      sessionStorage.setItem('prImportDone',JSON.stringify({apps:P.apps,n:P.n,bad:P.bad}));}}catch(e){}

  function appsIn(keys){return APPS.filter(function(a){return keys.some(function(k){return k.indexOf(a[0])===0;});}).map(function(a){return a[1];});}
  function snapshot(){var d={};if(!ls)return d;for(var i=0;i<ls.length;i++){var k=ls.key(i);if(k&&RX.test(k))d[k]=ls.getItem(k);}return d;}
  /* logboeken per dag samenvoegen: de grootste waarde (seconden of minuten) wint */
  function mergeLog(a,b){var A,B;try{A=JSON.parse(a)||{};}catch(e){A={};}try{B=JSON.parse(b)||{};}catch(e){return a;}
    var size=function(v){return typeof v==='number'?v:v&&typeof v==='object'?(+v.s||0):0;};
    Object.keys(B).forEach(function(day){if(!(day in A)||size(B[day])>size(A[day]))A[day]=B[day];});
    return JSON.stringify(A);}
  function stamp(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}

  function doExport(app,msg){var data=snapshot(),keys=Object.keys(data);
    if(!keys.length){msg(TXT.none);return;}
    var file='practice-room-backup-'+stamp()+'.json';
    var blob=new Blob([JSON.stringify({type:'practice-room-backup',v:1,created:new Date().toISOString(),from:app,data:data},null,1)],{type:'application/json'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file;document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},3000);
    var have=appsIn(keys),miss=APPS.slice(0,4).map(function(x){return x[1];}).filter(function(n){return have.indexOf(n)<0;});
    msg(TXT.saved(file,have.join(', '))+(miss.length?TXT.missing(miss.join(', ')):''));}

  function doImport(files,msg){
    Promise.all([].map.call(files,function(f){return f.text();})).then(function(texts){
      var cur=snapshot(),out={},bad=0;
      texts.forEach(function(t){var o;try{o=JSON.parse(t);}catch(e){o=null;}
        if(!o||o.type!=='practice-room-backup'||!o.data||typeof o.data!=='object'){bad++;return;}
        Object.keys(o.data).forEach(function(k){var v=o.data[k];if(!RX.test(k)||typeof v!=='string')return;
          var base=k in out?out[k]:cur[k];out[k]=LOGS.test(k)&&base!=null?mergeLog(base,v):v;});});
      var keys=Object.keys(out);
      if(!keys.length){msg(TXT.bad(bad||files.length));return;}
      try{sessionStorage.setItem('prImport',JSON.stringify({data:out,apps:appsIn(keys),n:keys.length,bad:bad}));}catch(e){msg('Could not import: '+e.message);return;}
      location.reload();});}

  function mount(){var el=document.getElementById('prBackup');if(!el||el.dataset.ready)return;el.dataset.ready='1';
    var app=el.dataset.app||document.title,cls=el.dataset.btn||'';
    el.innerHTML='<div class="prb-row"><button type="button" class="'+cls+'" data-prb="exp">'+TXT.exp+'</button>'
      +'<button type="button" class="'+cls+'" data-prb="imp">'+TXT.imp+'</button>'
      +'<input type="file" accept=".json,application/json" multiple hidden aria-label="Backup files"></div>'
      +'<p class="prb-msg" role="status">'+TXT.note+'</p>';
    var m=el.querySelector('.prb-msg'),inp=el.querySelector('input'),msg=function(t){m.textContent=t;};
    el.querySelector('[data-prb="exp"]').onclick=function(){doExport(app,msg);};
    el.querySelector('[data-prb="imp"]').onclick=function(){inp.value='';inp.click();};
    inp.onchange=function(){if(inp.files&&inp.files.length)doImport(inp.files,msg);};
    try{var dn=sessionStorage.getItem('prImportDone');if(dn){sessionStorage.removeItem('prImportDone');var D=JSON.parse(dn);
      msg(TXT.done(D.apps.join(', '),D.n)+(D.bad?' '+TXT.bad(D.bad):''));var dt=el.closest('details');if(dt)dt.open=true;var hs=el.closest('[hidden]');if(hs)hs.hidden=false;if(el.scrollIntoView)setTimeout(function(){el.scrollIntoView({block:'center'});},300);}}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else setTimeout(mount,0);
  return{mount:mount,mergeLog:mergeLog};
})();
