# Practice Room — project bible

Gitaar-oefenapp voor jazz/gitaar: een verzameling losse, zelfstandige HTML-trainers met een startpagina. Eén gebruiker (Maurice), draait in **Firefox** op de **desktop**, normaal via GitHub Pages (`https://mauricevi.github.io/gitaar/`), soms lokaal via `file://`. localStorage is per adres: GitHub Pages, `file://` en de preview-server (`localhost:8765`) hebben elk hun eigen voortgang; de echte data staat op GitHub Pages. Wijzigingen zijn daar pas te zien na commit + push. Test ook in Firefox.

## Bestanden
| Bestand | Wat |
|---|---|
| `index.html` | Startpagina "Practice Room": schermvullend beeld `home/room.png` van de oefenkamer; objecten zijn links naar de trainers (klikzones in TOOLS), labels met rec-lampje en samenvatting uit de trainers, mini-kalender + kalendervenster (oefentijd, doelen, back-up). Beweging alleen óver het beeld (lampjes, stof, damp, zzz, vogels; geen vervorming), dag/nacht op de klok. Toets E = klikzones tekenen, S = geheim menu (opslag `practiceRoom.room`). Leest trainerdata alleen |
| `toonladder-trainer.html` | **Scale Trainer**: dunne schil (HTML-structuur + `<script src>`-lijst); code staat in `toonladder/` (zie hieronder) |
| `fretboard-trainer.html` | **Fretboard Trainer**: noten op de hals, spaced repetition ("notes due today") |
| `chord-moves.html` | **Chord Moves**: akkoordwisselingen oefenen, piano + bas |
| `chord-finder.html` | **Chord Finder**: dunne schil; alle voicings van een akkoord (drop 2/3/2&4, close, rootless, shells, triads, barré), filters op snarenset/omkering/topnoot. Code in `chordfinder/` (zie hieronder) |
| `lick-lab.html` | **Lick Lab**: licks over een progressie, loop met piano/bas/klik |
| `note-prompter.html` | **Note Prompter**: noten voorlezen/oefenen |
| `tuner.html` | **Tuner**: microfoon via `getUserMedia` |
| `backing-sounds.js` | ~500 KB base64-MP3's (piano, contrabas, drums). **Nooit volledig inlezen of bewerken.** Optioneel: trainers werken zonder |
| `shared/room.css` + `shared/rail.js` | **Gedeelde schil** voor de trainers (nu alleen Chord Finder; de rest volgt één voor één): daglicht-tokens, twee materialen (`.paper` = doorschijnend perkament voor lezen/invullen, `.glass` = warm glas voor bediening over de scène), `.seg`, amber schakelaar `.tg`, `?`-uitleg `.help` (`.dn`/`.l`/`.r`/`.wide`), kolom rechts `.col` (inklapbaar, `.shut`), transportplank `.tray`, pixelletter `.px` (DotGothic16). `rail.js` = één globale `ROOM`: tekent de icoonbalk (`<nav class="rail" data-app="…">`, alleen apps, Chord Moves bewust niet), tekent `home/corners/corner-<app>.jpg` één keer onscherp (6px) in een canvas als achtergrond, maakt de korrel (`--grain`) en de palissander-verlopen `#rw`/`#rwh`; `ROOM.column(el,open,onChange)` = in/uitklappen. Laden vóór de app-scripts. **Geen live blur** (`filter`/`backdrop-filter`) gebruiken: die rekent bij elk scrollbeeld opnieuw en maakte scrollen traag; panelen/glas zijn daarom iets dichter |
| `shared/look.js` | **Geheim menu "Look"** (toets S, niet tijdens typen; Esc sluit; geen knop), één globale `LOOK`, laden vóór `rail.js`. Alle ontwerpafwegingen van de schil staan hier als instelling → CSS-variabele op `<html>` (standaarden in `:root` van `room.css`): titel/label-letter + grootte, Text case (normal/lowercase), achtergrond (eigen hoek, andere hoek, hele kamer; per app), blur, korrel, sluier, schaduw achter de titel, perkament-, glas- en kaartdoorzichtigheid, kolombreedte, kaartstijl (rosewood/paper/staff). Opslag `practiceRoom.look` (gedeeld door alle trainers, gevalideerd, onleesbaar → `.bad`; valt onder `practiceRoom` in `RX`/`APPS` van de back-up). Een app voegt eigen regels toe met `LOOK.add([{k,t,l,o,def,get,set}])` (die bewaart de app zelf) en `LOOK.on(fn)`. **Nieuwe afweging in de schil? Maak er een regel in dit menu van, niet hard coderen.** Home heeft een eigen menu (`practiceRoom.room`) |
| `home/corners/` | Per app een eigen hoek van de kamer (`corner-chord-finder.jpg`, `-scale-trainer`, `-fretboard`, `-lick-lab`, `-note-prompter`, `-tuner`), gemaakt bij `home/room.png` |

### Scale Trainer: map `toonladder/`
Gewone scripts (geen modules, geen IIFE) die **één globale scope delen**, geladen in deze volgorde (volgorde telt):
| Bestand | Inhoud |
|---|---|
| `style.css` | alle CSS |
| `backup.js` | export/import backup (PRB, zelfde code als in de andere pagina's) |
| `text.js` | `TEXT`/`T`: alle schermtekst |
| `theory.js` | 1 DATA (REGISTRY, TUNINGS, DEFAULTS), 2 THEORIE, 3 POSITIES |
| `state.js` | 4 STATE + opslag, 5 DERIVE (state → D) |
| `render.js` | 6 RENDER: bord, legenda, kaarten, vergelijking |
| `ui.js` | 7 UI: instellingen, events, akkoorden A→B, afspelen toonladder |
| `progressions.js` | 8 PROGRESSIES: bewerken, transponeren, Martino-vormen, maatbalk, acties |
| `backing.js` | backing track (samples, mixer, noten kiezen, afspelen) |
| `import-dialog.js` | iReal Pro-import en venster "New progression" |
| `main.js` | `init()`, thema, `API`-export |
Nieuwe top-level namen in deze bestanden mogen niet botsen met andere (ze delen scope). Nieuw bestand = `<script src>` toevoegen in `toonladder-trainer.html`.

### Chord Finder: map `chordfinder/`
Zelfde opzet als `toonladder/` (één gedeelde scope, volgorde telt), in de gedeelde schil (`shared/`, zie boven; daglicht, geen thema-knop meer: `theme` blijft in de opslag staan maar wordt genegeerd): `style.css` (alleen wat Chord Finder zelf nodig heeft, bovenop `shared/room.css`), `backup.js`, `text.js` (`T`), `theory.js` (spelling + `QUAL` + `parseChord`), `voicings.js` (`voicingsOf(c,type)`), `sound.js`, `render.js`, `ui.js` (opslag, log, `derive()` → `D`, events), `identify.js` ("What's this chord?": `identify(frets)` → namen, eigen weergave; ook `renderMode()` voor de drie modi), `bass.js` (baslijnen voor Progression: `bsLines(X,kind)` → per akkoord basnoten in tellen, soorten Roots/Root & 5th/Approach/Walking/Stepwise; `bsStep()` kiest omkeringen voor Stepwise; deterministisch, dus scherm = wat de bas speelt; alle namen beginnen met `bs`/`BS`), `progression.js` ("Progression": akkoordsymbolen → per akkoord een vorm via Viterbi-voice-leading (`pgDerive()` → `PG`), alternatieven vergrendelen; baslijn onder elk akkoord en optioneel op de hals; afspelen met band: piano-comping, bas, drums in Swing/Bossa/Straight; alle namen beginnen met `pg`/`PG`; leest progressies uit de Scale Trainer alleen), `main.js`.
Theorie (`QUAL`, spelling) en de basis van de voicing-zoeker zijn **kopieën** uit `chord-moves.html` §1–2: een fout daar ook hier nakijken.
Opslag Progression: nieuwe velden in `chordFinder.v1` (`pText`, `pType`, `pMode`, `pPos`, `pStr`, `pMel`, `pTempo`, `pLoop`, `pLock` = {volgnummer: {s: symbool, k: frets, t: soort, h: 1 = alleen vastgehouden}}, `pTypes` = {volgnummer: {s, t}} (eigen voicingsoort per akkoord), `pFit` = refit|keep; fase 4: `pLine`, `pStyle`, `pDrums`, `pVol` = {piano, bass, drums} 0–100, `pBNeck`; plus `dgSize` = grootte van alle diagrammen 80–200%, schuifje in de kolom rechts (Display), via CSS-variabele `--dg`; schil: `colOpen` = kolom rechts open (true/false), `cardDet` = kaartdetails in Progression `compact` (naam, diagram, omkering) of `full` (+ stemmen en baslijn per kaart), ook als regel in het menu S via `LOOK.add`), gevalideerd in `load()` (`ui.js`).
Indeling: zichtbaar in het midden blijven invoer, voicing, voice leading, baslijn en (Progression) de transportplank; de kolom rechts heeft in Progression twee tabbladen: Chord (gekozen akkoord, acties, eigen voicing, vormen) en Settings (Band, Display, Editing, Backup); in de andere modi alleen Settings. `renderCol()` in `ui.js` regelt wat per modus te zien is. Find voicings past op één scherm: bovenaan akkoord (soorten in een uitklapvenster achter "Type"), grondtoon, voicing en snarenset; de vormen vullen de rest via `fitShapes()` (`render.js`: schaal 0,68–1,5 × Diagram size; past het niet, dan tabjes per groep, pas daarna scrolt het vak zelf). De gekozen vorm staat in de kolom (tab Chord, met de hele hals staand: `neckV()`), laagste noot/topnoot/fretbereik in Settings → Filters.
Drums: `sound.js` leest alleen ride/kick/stick/pedal/snare uit `BACKING_SOUNDS.drum` (`loadDrums()`), met synth-terugval.
Plan: fase 1 Finder (klaar) · 2 "What's this chord?" (noten klikken → naam, klaar) · 3 progressie + voice leading + alternatieven (klaar) · 4 baslijnen + afspelen met band (klaar).

## Tech stack
- Vanilla HTML/CSS/JS, **geen build, geen npm, geen framework, geen dependencies**. De meeste pagina's zijn één bestand met `<style>` en `<script>` inline; de Scale Trainer is gesplitst (zie boven).
- Web Audio API voor geluid. Google Fonts (Bricolage Grotesque, JetBrains Mono) is het enige externe.
- Opslag uitsluitend `localStorage`, altijd in `try/catch`. Sleutels per app, bv. `fretTrainer.v1`, `chordMoves.v1`, `chordFinder.v1`, `notePrompter.v1`, `toonladderTrainer:v1`, plus `*.log` voor oefentijd per dag (kalender op Home leest die).
- Taal: UI in het Engels, code-commentaar in het Nederlands.

## Regels
1. **Opslagformaat is heilig**: bestaande localStorage-sleutels en -structuur niet wijzigen zonder migratie; voortgang van de gebruiker mag nooit verloren gaan. Onleesbare data niet overschrijven (patroon: kopie naar `KEY+'.bad'`).
2. Geen nieuwe dependencies, geen bundler, geen CDN-scripts, geen ES-modules (die werken niet via `file://`). Gewone `<script src>` met relatieve paden is prima; openen via dubbelklik/`file://` moet blijven werken.
3. Home leest alleen (read-only) uit de data van de trainers; schrijf nooit vanuit Home naar hun sleutels.
4. Houd de stijl aan: donker thema, CSS-variabelen in `:root`, thema `auto/light/dark` waar al aanwezig.
5. Pas alleen de gevraagde trainer aan; houd wijzigingen klein en lokaal.
6. Bestanden zijn groot: gebruik Grep om de juiste plek te vinden en lees alleen dat stuk (offset/limit). Lees nooit een heel HTML-bestand, `toonladder/progressions.js` of `backing-sounds.js` in één keer.
7. Instellingen/teksten staan in een blok "JOUW INSTELLINGEN" onderaan het `<script>` van `index.html`.
8. **Alleen desktop.** Mobiel/smalle schermen worden niet gebruikt: geen tijd steken in mobiele optimalisatie of in testen op telefoonbreedte. Ontwerp voor een desktopscherm en benut de ruimte (grotere diagrammen, meer naast elkaar). Bestaande responsive CSS mag blijven staan, maar hoeft niet bijgehouden te worden.

### Kleine letters: muziek in `.mus`
Met Text case = lowercase (menu S) krijgt `<body>` de klasse `lc` en wordt alle tekst klein, behalve: `.mus`, invoervelden, keuzelijsten en SVG-tekst. Kopjes die met CSS in HOOFDLETTERS staan, blijven zo. `LOOK.mus()` zet muzikale tekens vanzelf in `<span class="mus">` (ook tekst die later verschijnt): akkoordsymbolen en noten (C, D♭, F♯m7♭5, A7♯9/B♯), losse hoofdletters (interval R, toetsen, snaarnamen e B G D A E), romeinse cijfers (I–VII, ♭VI, Imaj7), M3, MIDI/dB/Hz/iReal Pro/Esc/Space. **Regel: muzikale tekens moeten altijd herkenbaar of in `.mus` staan.** Een nieuw soort teken dat het patroon (`LOOK.RX`) niet kent → zelf in `<span class="mus">` zetten of `LOOK.RX` uitbreiden. Op `<button>` staat `text-transform` apart (knoppen erven het niet vanzelf).

## Werkwijze
- Geen testsuite: controleer door de pagina te openen en de console te checken op fouten.
- Nieuwe app-sleutel? Voeg het voorvoegsel toe aan `RX`/`APPS` in **alle** kopieën van de back-up (PRB), anders gaat hij niet mee in een back-up.