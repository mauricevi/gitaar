# Practice Room — project bible

Gitaar-oefenapp voor jazz/gitaar: een verzameling losse, zelfstandige HTML-trainers met een startpagina. Eén gebruiker (Maurice), draait lokaal in de browser (Chrome/Edge) op de **desktop**.

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
Zelfde opzet als `toonladder/` (één gedeelde scope, volgorde telt): `style.css`, `backup.js`, `text.js` (`T`), `theory.js` (spelling + `QUAL` + `parseChord`), `voicings.js` (`voicingsOf(c,type)`), `sound.js`, `render.js`, `ui.js` (opslag, log, `derive()` → `D`, events), `identify.js` ("What's this chord?": `identify(frets)` → namen, eigen weergave; ook `renderMode()` voor de drie modi), `bass.js` (baslijnen voor Progression: `bsLines(X,kind)` → per akkoord basnoten in tellen, soorten Roots/Root & 5th/Approach/Walking/Stepwise; `bsStep()` kiest omkeringen voor Stepwise; deterministisch, dus scherm = wat de bas speelt; alle namen beginnen met `bs`/`BS`), `progression.js` ("Progression": akkoordsymbolen → per akkoord een vorm via Viterbi-voice-leading (`pgDerive()` → `PG`), alternatieven vergrendelen; baslijn onder elk akkoord en optioneel op de hals; afspelen met band: piano-comping, bas, drums in Swing/Bossa/Straight; alle namen beginnen met `pg`/`PG`; leest progressies uit de Scale Trainer alleen), `main.js`.
Theorie (`QUAL`, spelling) en de basis van de voicing-zoeker zijn **kopieën** uit `chord-moves.html` §1–2: een fout daar ook hier nakijken.
Opslag Progression: nieuwe velden in `chordFinder.v1` (`pText`, `pType`, `pMode`, `pPos`, `pStr`, `pMel`, `pTempo`, `pLoop`, `pLock` = {volgnummer: {s: symbool, k: frets, t: soort, h: 1 = alleen vastgehouden}}, `pTypes` = {volgnummer: {s, t}} (eigen voicingsoort per akkoord), `pFit` = refit|keep; fase 4: `pLine`, `pStyle`, `pDrums`, `pVol` = {piano, bass, drums} 0–100, `pBNeck`; plus `dgSize` = grootte van alle diagrammen 80–200%, schuifje in de kop, via CSS-variabele `--dg`), gevalideerd in `load()` (`ui.js`).
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

## Werkwijze
- Geen testsuite: controleer door de pagina te openen en de console te checken op fouten.
- Nieuwe app-sleutel? Voeg het voorvoegsel toe aan `RX`/`APPS` in **alle** kopieën van de back-up (PRB), anders gaat hij niet mee in een back-up.