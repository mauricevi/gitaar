/* ══ BACK-UP (PRB) · één gedeelde kopie voor Home en alle trainers in de schil ══
   Exporteren: alle Practice Room-gegevens die deze pagina kan zien → één .json-bestand in je Downloads.
   Importeren: één of meer van die bestanden → samenvoegen met wat er al is → pagina herladen.
     · Instellingen, voortgang en progressies: de geïmporteerde versie vervangt de huidige.
     · Oefenlogboeken en zelf ingevulde minuten (kalender): per dag samengevoegd, de hoogste waarde blijft.
   Het wegschrijven gebeurt ná het herladen en vóórdat de app zijn gegevens leest, zodat de app ze niet meteen
   weer overschrijft met wat hij nog in zijn geheugen had. Daarom laden met <script src="shared/backup.js"> vóór de app-scripts.
   Lokaal (file://, localhost) en op GitHub Pages is de opslag gescheiden: exporteer op het adres waar je oefent. Knoppen verschijnen in het element met id="prBackup"
   (data-app = naam van de pagina, data-btn = knopstijl; in de schil "act sm", opmaak .prb-row/.prb-msg in room.css).
   Vangnet: vóór het wegschrijven van een import downloadt de pagina eerst de huidige stand
   (practice-room-before-import-<datum>.json, zelfde formaat); elke sleutel wordt los weggeschreven, mislukte worden gemeld.
   Laatste export: datum in practiceRoom.lastBackup (ISO-tekst als JSON); een import zet die nooit terug naar een oudere.
   Elke Backup-sectie toont stil "Last backup: … ago" of "No backup yet".
   Ook Chord Moves laadt dit bestand (er is geen losse kopie meer).
   Bestandsformaat {type:'practice-room-backup',v:1,created,from,data:{sleutel:tekst}} niet wijzigen:
   oude back-ups moeten blijven werken en de oude kopieën moeten nieuwe back-ups kunnen lezen.
   Nieuwe app-sleutel? Voorvoegsel in RX (en een naam in APPS) zetten.
   Lick Lab (practiceRoom.lickLab) en Tuner (practiceRoom.tuner) vallen onder practiceRoom; APPS geeft ze alleen een eigen naam. */
var PRB=(function(){
  'use strict';
  var RX=/^(fretTrainer|toonladderTrainer|practiceRoom|notePrompter|chordMoves|chordFinder)/;
  var APPS=[['fretTrainer','Fretboard Trainer'],['toonladderTrainer','Scale Trainer'],['notePrompter','Note Prompter'],['chordMoves','Chord Moves'],['chordFinder','Chord Finder'],['practiceRoom.lickLab','Lick Lab'],['practiceRoom.tuner','Tuner'],['practiceRoom','Home and shared settings']];
  var LOGS=/(\.log|:log|^practiceRoom\.manual)$/,LAST='practiceRoom.lastBackup';
  var TXT={exp:'Export backup',imp:'Import backup…',
    saved:function(f,list){return 'Saved '+f+' with: '+list+'.';},
    missing:function(list){return ' Not visible from this page: '+list+'. If you used that in this browser, export from there too.';},
    done:function(list,n){return 'Imported '+n+' item'+(n===1?'':'s')+': '+list+'.';},
    from:function(ds){return ' Backup from '+ds.join(', ')+'.';},
    fail:function(ks){return ' Could not write: '+ks.join(', ')+'. Your copy from before the import is in Downloads.';},
    before:function(f){return 'Saved your current data as '+f+' first. Importing…';},
    last:function(t){return t==null?'No backup yet.':'Last backup: '+t+'.';},
    none:'Nothing to export yet.',bad:function(n){return n+' file'+(n===1?' is':'s are')+' not a Practice Room backup.';},
    note:'One file with your progress, settings and practice log. Use it to move to another browser or computer.'};
  var ls=null;try{ls=window.localStorage;}catch(e){}

  /* een vorige import afmaken (na het herladen, vóór de app iets leest); elke sleutel apart, mislukte onthouden */
  try{var pend=sessionStorage.getItem('prImport');
    if(pend&&ls){sessionStorage.removeItem('prImport');var P=JSON.parse(pend),fail=[];
      Object.keys(P.data).forEach(function(k){if(!RX.test(k))return;try{ls.setItem(k,P.data[k]);}catch(e){fail.push(k);}});
      var ok=Object.keys(P.data).filter(function(k){return RX.test(k)&&fail.indexOf(k)<0;});
      sessionStorage.setItem('prImportDone',JSON.stringify({apps:fail.length?appsIn(ok):P.apps,n:P.n-fail.length,bad:P.bad,fail:fail,dates:P.dates||[]}));}}catch(e){}

  function appsIn(keys){return APPS.filter(function(a){return keys.some(function(k){return k.indexOf(a[0])===0;});}).map(function(a){return a[1];});}
  function snapshot(){var d={};if(!ls)return d;for(var i=0;i<ls.length;i++){var k=ls.key(i);if(k&&RX.test(k))d[k]=ls.getItem(k);}return d;}
  /* logboeken per dag samenvoegen: de grootste waarde (seconden of minuten) wint */
  function mergeLog(a,b){var A,B;try{A=JSON.parse(a)||{};}catch(e){A={};}try{B=JSON.parse(b)||{};}catch(e){return a;}
    var size=function(v){return typeof v==='number'?v:v&&typeof v==='object'?(+v.s||0):0;};
    Object.keys(B).forEach(function(day){if(!(day in A)||size(B[day])>size(A[day]))A[day]=B[day];});
    return JSON.stringify(A);}
  function stamp(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  /* datum van de laatste export (ms) uit practiceRoom.lastBackup, of null */
  function lastAt(v){var t;try{t=Date.parse(JSON.parse(v));}catch(e){return null;}return isNaN(t)?null:t;}
  function lastText(){var t=null;try{t=ls?lastAt(ls.getItem(LAST)):null;}catch(e){}if(t==null)return TXT.last(null);
    var d=new Date(t),a=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()),n=new Date(),b=Date.UTC(n.getFullYear(),n.getMonth(),n.getDate()),k=Math.round((b-a)/864e5);
    return TXT.last(k<=0?'today':k===1?'yesterday':k+' days ago');}
  function fmtDay(iso){var t=Date.parse(iso);if(isNaN(t))return null;
    try{return new Date(t).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return new Date(t).toISOString().slice(0,16).replace('T',' ');}}
  /* één bestand in Downloads; de blob-URL blijft even bestaan zodat de download klaar is */
  function save(file,app,data){
    var blob=new Blob([JSON.stringify({type:'practice-room-backup',v:1,created:new Date().toISOString(),from:app,data:data},null,1)],{type:'application/json'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file;document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},3000);}

  function doExport(app,msg){var data=snapshot(),keys=Object.keys(data);
    if(!keys.length){msg(TXT.none);return;}
    var file='practice-room-backup-'+stamp()+'.json';
    save(file,app,data);
    try{ls.setItem(LAST,JSON.stringify(new Date().toISOString()));}catch(e){}
    var have=appsIn(keys),miss=APPS.slice(0,4).map(function(x){return x[1];}).filter(function(n){return have.indexOf(n)<0;});
    msg(TXT.saved(file,have.join(', '))+(miss.length?TXT.missing(miss.join(', ')):''));}

  function doImport(files,msg){
    Promise.all([].map.call(files,function(f){return f.text();})).then(function(texts){
      var cur=snapshot(),out={},bad=0,dates=[];
      texts.forEach(function(t){var o;try{o=JSON.parse(t);}catch(e){o=null;}
        if(!o||o.type!=='practice-room-backup'||!o.data||typeof o.data!=='object'){bad++;return;}
        var dn=fmtDay(o.created);if(dn)dates.push(dn);
        Object.keys(o.data).forEach(function(k){var v=o.data[k];if(!RX.test(k)||typeof v!=='string')return;
          var base=k in out?out[k]:cur[k];
          if(k===LAST){if(base==null||(lastAt(v)||0)>(lastAt(base)||0))out[k]=v;return;}   /* laatste export: nooit terug naar een oudere */
          out[k]=LOGS.test(k)&&base!=null?mergeLog(base,v):v;});});
      var keys=Object.keys(out);
      if(!keys.length){msg(TXT.bad(bad||files.length));return;}
      try{sessionStorage.setItem('prImport',JSON.stringify({data:out,apps:appsIn(keys),n:keys.length,bad:bad,dates:dates}));}catch(e){msg('Could not import: '+e.message);return;}
      /* vangnet: eerst de huidige stand downloaden, dan pas herladen (en daarna wegschrijven) */
      var wait=0;
      if(Object.keys(cur).length){var f='practice-room-before-import-'+stamp()+'.json';
        try{save(f,'before import',cur);msg(TXT.before(f));wait=1500;}
        catch(e){try{sessionStorage.removeItem('prImport');}catch(_){}msg('Could not save a copy of your current data first, so nothing was imported: '+e.message);return;}}
      setTimeout(function(){location.reload();},wait);});}

  function mount(){var el=document.getElementById('prBackup');if(!el||el.dataset.ready)return;el.dataset.ready='1';
    var app=el.dataset.app||document.title,cls=el.dataset.btn||'';
    el.innerHTML='<div class="prb-row"><button type="button" class="'+cls+'" data-prb="exp">'+TXT.exp+'</button>'
      +'<button type="button" class="'+cls+'" data-prb="imp">'+TXT.imp+'</button>'
      +'<input type="file" accept=".json,application/json" multiple hidden aria-label="Backup files"></div>'
      +'<p class="prb-msg" role="status">'+TXT.note+'</p><p class="prb-msg prb-last"></p>';
    var m=el.querySelector('.prb-msg'),inp=el.querySelector('input'),msg=function(t){m.textContent=t;};
    var lb=el.querySelector('.prb-last'),showLast=function(){lb.textContent=lastText();};showLast();
    el.querySelector('[data-prb="exp"]').onclick=function(){doExport(app,msg);showLast();};
    el.querySelector('[data-prb="imp"]').onclick=function(){inp.value='';inp.click();};
    inp.onchange=function(){if(inp.files&&inp.files.length)doImport(inp.files,msg);};
    try{var dn=sessionStorage.getItem('prImportDone');if(dn){sessionStorage.removeItem('prImportDone');var D=JSON.parse(dn);
      msg(TXT.done(D.apps.join(', '),D.n)+(D.dates&&D.dates.length?TXT.from(D.dates):'')+(D.bad?' '+TXT.bad(D.bad):'')+(D.fail&&D.fail.length?TXT.fail(D.fail):''));var dt=el.closest('details');if(dt)dt.open=true;if(typeof ROOM!=='undefined'&&ROOM.open&&el.closest('.col'))ROOM.open(true,true);var hs=el.closest('[hidden]');if(hs)hs.hidden=false;if(el.scrollIntoView)setTimeout(function(){el.scrollIntoView({block:'center'});},300);}}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else setTimeout(mount,0);
  return{mount:mount,mergeLog:mergeLog};
})();
