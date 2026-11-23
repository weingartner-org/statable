<script lang="ts">
  import { rutsch } from '../lib/rutsch';
  import { tick } from 'svelte';
  import { spendeMoeglich } from '../lib/spende';
  import { metaDirekt } from '../lib/metaentwurf.svelte';
  import { zitat, ort } from '../i18n/profil';
  import { zm } from '../lib/zeitmarke';
  import { s, d, L, oeffneBeispiel, oeffneDatei, oeffneTabelle, oeffneNeueDaten, oeffneEurostat, weiterarbeiten, neueStudie, melde } from '../lib/sitzung.svelte';
  import { fbImport } from '../lib/fragebogenimport.svelte';
  import { erkenneImSav, vorschlagSatz } from '../lib/fragebogen';
  import FragebogenDialog from '../bausteine/FragebogenDialog.svelte';
  import QdaDialog from '../bausteine/QdaDialog.svelte';
  import EurostatDialog from '../bausteine/EurostatDialog.svelte';
  import { OFFLINE } from '../lib/offline';
  import type { EurostatTabelle, EurostatQuelle } from '../lib/eurostat';
  import ProjektListe from '../bausteine/ProjektListe.svelte';
  import type { NeueSpalte } from '../lib/eingabe';
  import { DateiFehler } from '../lib/einlesen';
  import { zuGrossText, type Groesse } from '../lib/groessengrenze';
  import { merkeSyntax } from '../lib/befehlsspeicher.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import Logo from '../bausteine/Logo.svelte';
  import { zahlDe } from '../lib/format';
  import HilfeLink from '../bausteine/HilfeLink.svelte';
  import { apiDa, waehleDatei, type DateiZugriff } from '../lib/dateiziel';

  let laeuft = $state<null | string>(null);
  let fehlerRoh = $state<null | { art: 'format' | 'leer' | 'lesen' | 'neuer' | 'stata' | 'gross'; name: string; details?: string }>(null);
  const fehler = $derived.by((): { titel: string; text: string; tun: string; details?: string } | null => {
    const f = fehlerRoh; if (!f) return null;
    const name = f.name;
    if (f.art === 'gross') { const x = JSON.parse(f.details ?? '{}') as { g: Groesse; bytes: number }; return zuGrossText(name, x.g, x.bytes); }
    if (f.art === 'format') return { titel: L('Dieses Dateiformat kennt Statable nicht', "Statable doesn't know this file format"), text: L(`„${name}“ ist keine Tabelle, die Statable lesen kann.`, `"${name}" isn't a table that Statable can read.`), tun: d('Öffne eine Excel-, CSV-, OpenDocument-, SPSS-, Stata- oder SAS-Datei (.xlsx, .csv, .ods, .sav, .dta, .sas7bdat, .xpt), eine Befehlsdatei (.sps) oder ein gespeichertes Projekt (.statable).', 'Öffnen Sie eine Excel-, CSV-, OpenDocument-, SPSS-, Stata- oder SAS-Datei (.xlsx, .csv, .ods, .sav, .dta, .sas7bdat, .xpt), eine Befehlsdatei (.sps) oder ein gespeichertes Projekt (.statable).', 'Open an Excel, CSV, OpenDocument, SPSS, Stata or SAS file (.xlsx, .csv, .ods, .sav, .dta, .sas7bdat, .xpt), a command file (.sps) or a saved project (.statable).'), details: f.details };
    if (f.art === 'stata') return { titel: L('Diese Stata-Version kann Statable nicht lesen', "Statable can't read this Stata version"), text: L(`„${name}“ ist in einem Stata-Dateiformat gespeichert (Nummer ${f.details}), das Statable noch nicht kennt.`, `"${name}" is saved in a Stata file format (number ${f.details}) that Statable doesn't know yet.`), tun: d('Speichere die Daten in Stata mit „save, version(14)“ (oder „saveold“) noch einmal, oder exportiere sie als .csv oder .sav. Dann lässt sich die Datei öffnen.', 'Speichern Sie die Daten in Stata mit „save, version(14)“ (oder „saveold“) noch einmal, oder exportieren Sie sie als .csv oder .sav. Dann lässt sich die Datei öffnen.', 'Save the data again in Stata with "save, version(14)" (or "saveold"), or export it as .csv or .sav. Then the file can be opened.') };
    if (f.art === 'neuer') return { titel: L('Dieses Projekt ist aus einer neueren Fassung von Statable', 'This project is from a newer version of Statable'), text: L(`„${name}“ lässt sich hier noch nicht öffnen.`, `"${name}" can't be opened here yet.`), tun: d('Lade die Seite neu, dann holt Statable die neue Fassung.', 'Laden Sie die Seite neu, dann holt Statable die neue Fassung.', 'Reload the page, then Statable will get the new version.') };
    if (f.art === 'leer') return { titel: L('In der Datei stehen keine Daten', 'The file contains no data'), text: L(`„${name}“ ist leer - darin stehen weder Spaltennamen noch Werte.`, `"${name}" is empty - it contains neither column names nor values.`), tun: d('Wähle eine andere Datei.', 'Wählen Sie eine andere Datei.', 'Choose another file.'), details: f.details };
    return { titel: L('Diese Datei lässt sich nicht lesen', "This file can't be read"), text: d(`${zitat(name || L('Die Datei', 'The file'))} ist beschädigt oder hat ein anderes Format, als ihre Endung sagt. Deine anderen Daten sind nicht betroffen.`, `${zitat(name || L('Die Datei', 'The file'))} ist beschädigt oder hat ein anderes Format, als ihre Endung sagt. Ihre anderen Daten sind nicht betroffen.`, `${zitat(name || L('Die Datei', 'The file'))} is damaged or has a different format than its extension says. Your other data isn't affected.`), tun: d('Speichere sie in deinem Programm noch einmal als .xlsx, .csv oder .sav.', 'Speichern Sie sie in Ihrem Programm noch einmal als .xlsx, .csv oder .sav.', 'Save it again as .xlsx, .csv or .sav in your program.'), details: f.details };
  });
  let ueber = $state(false);
  let langsam = $state(false);
  /** Größe der Datei, die gerade geöffnet wird (Bytes); 0 bei Beispielen und gespeicherten Projekten */
  let dateiBytes = $state(0);
  /** Warum es dauert (Abschlusstest A5): Nur solange das Programm oder der Rechenkern noch lädt, kommt das aus dem Netz; danach liegt es an der Datei - Statable rechnet auf dem Gerät. */
  const langsamText = $derived.by(() => {
    if (s.motor !== 'bereit') return L('Das dauert länger als sonst, vermutlich wegen der Internetverbindung.', 'This is taking longer than usual, probably because of the internet connection.');
    const mb = (dateiBytes / 1e6).toLocaleString(ort(), { maximumFractionDigits: 0 });
    return dateiBytes >= 10e6
      ? d(`Die Datei ist groß (${mb} MB). Das Öffnen dauert eine Weile - Statable rechnet auf deinem Gerät.`, `Die Datei ist groß (${mb} MB). Das Öffnen dauert eine Weile - Statable rechnet auf Ihrem Gerät.`, `The file is large (${mb} MB). Opening takes a while - Statable works on your device.`)
      : d('Das dauert länger als sonst. Statable rechnet auf deinem Gerät.', 'Das dauert länger als sonst. Statable rechnet auf Ihrem Gerät.', 'This is taking longer than usual. Statable works on your device.');
  });

  async function mitLaden(was: string, f: () => Promise<string | void>, bytes = 0) {
    laeuft = was; fehlerRoh = null; langsam = false; dateiBytes = bytes;
    const uhr = setTimeout(() => (langsam = true), 6000);
    try { const ziel = await f(); location.hash = ziel || 'daten'; }
    catch (e) {
      if (e instanceof DateiFehler && e.grund === 'abgebrochen') return;   // Excel-Blatt: die Person hat die Frage abgebrochen - kein Fehler
      const name = e instanceof DateiFehler ? e.datei : '';
      fehlerRoh = e instanceof DateiFehler && e.grund === 'format' ? { art: 'format', name }
        : e instanceof DateiFehler && e.grund === 'leer' ? { art: 'leer', name }
        : e instanceof DateiFehler && e.grund === 'neuer' ? { art: 'neuer', name }
        : e instanceof DateiFehler && e.grund === 'stata' ? { art: 'stata', name, details: e.details }
        : e instanceof DateiFehler && e.grund === 'gross' ? { art: 'gross', name, details: e.details }
        : { art: 'lesen', name, details: s.fehler?.details ?? String(e) };
    } finally { clearTimeout(uhr); laeuft = null; }
  }
  const datei = async (f: File | undefined, handle?: DateiZugriff | null) => {
    if (!f) return;
    // Später S-C: Erst erkennen, ob es ein Fragebogen-Export ist; dann entscheidet die Person im Dialog (nichts passiert still).
    let gelesen: Awaited<ReturnType<typeof fbImport.pruefe>>['gelesen'];
    if (/\.(csv|tsv|txt|xlsx|xlsm|xls|ods|json)$/i.test(f.name)) {
      laeuft = f.name; dateiBytes = f.size;
      try { const p = await fbImport.pruefe(f, handle); if (p.offen) return; gelesen = p.gelesen; } finally { laeuft = null; }
    }
    zm('start-pruefe-fertig');
    return mitLaden(f.name, async () => {
      zm('mitLaden-innen');
      const r = await oeffneDatei(f, handle ?? undefined, gelesen);
      if (r === 'daten' || r === 'projekt') { if (/\.(sav|zsav)$/i.test(f.name)) savHinweis(); return 'daten'; }
      merkeSyntax(r.syntax, r.name); return 'befehle';
    }, f.size);
  };
  /** Eine .sav, deren Fehlend-Codes (zum Beispiel -77 bei Unipark) nicht gesetzt sind: nur sagen, nichts ändern. */
  function savHinweis() {
    const v = erkenneImSav({ spalten: $state.snapshot(s.spalten), zeilen: s.zeilen }).vorschlaege.filter(x => x.art === 'fehlend');
    if (v.length) melde(`${v.slice(0, 2).map(vorschlagSatz).join(' ')}${v.length > 2 ? ' …' : ''} ${L('Unter „Daten bearbeiten“ → „Fehlendcodes setzen“ lassen sich die Codes markieren.', 'You can mark the codes under "Edit data" → "Set missing codes".')}`);
  }
  /* Fragebogen-Dialog und Codierungen (MAXQDA, ATLAS.ti, NVivo) */
  async function fbUebernehmen() {
    await mitLaden(fbImport.name, async () => { try { await oeffneTabelle(fbImport.zuOeffnen(), fbImport.name); await fbImport.uebernehmeNachOeffnen(); } finally { fbImport.schliesse(); } });
  }
  async function fbRoh() {
    await mitLaden(fbImport.name, async () => { try { await oeffneTabelle(fbImport.zuOeffnen(true), fbImport.name); } finally { fbImport.schliesse(); } });
  }
  let qdaDatei = $state<File | null>(null);
  async function qdaOeffnen(name: string, quelle: string, spalten: import('../lib/verzeichnis').Spalte[], zeilen: import('../lib/eingabe').Wert[][]) {
    await mitLaden(name, async () => { try { await oeffneNeueDaten(name, quelle, spalten, zeilen); } finally { qdaDatei = null; } });
  }
  /* Daten von Eurostat: nur auf Klick, nicht in der Offline-Fassung. Das Öffnen ist kein Schritt im Protokoll der Datenänderungen. */
  let eurostatOffen = $state(false);
  async function eurostatOeffnen(tab: EurostatTabelle, quelle: EurostatQuelle, sha: string | null) {
    await mitLaden(`Eurostat ${quelle.datensatz}`, async () => { try { await oeffneEurostat(tab, quelle, sha); } finally { eurostatOffen = false; } });
  }
  /** Ziehen auf die Startseite: bei einer .statable-Datei in Chrome/Edge auch den Zugriff mitnehmen, damit Strg+S in dieselbe Datei geht. */
  async function abgelegt(e: DragEvent) {
    e.preventDefault(); ueber = false;
    const f = e.dataTransfer?.files[0]; if (!f) return;
    const item = e.dataTransfer?.items[0] as (DataTransferItem & { getAsFileSystemHandle?: () => Promise<unknown> }) | undefined;
    const zugriff = /\.statable$/i.test(f.name) && item?.getAsFileSystemHandle ? item.getAsFileSystemHandle().catch(() => null) : null;   // nur innerhalb des Drop-Ereignisses abrufbar
    const h = (await zugriff) as (DateiZugriff & { kind?: string }) | null;
    datei(f, h?.kind === 'file' ? h : null);
  }
  /** Das Ziehen gilt für die ganze Seite, nicht nur für die Mitte: Eine Datei, die daneben fällt, würde sonst vom Browser geöffnet und Statable verlassen (Abnahme 4, B6). */
  const mitDatei = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
  $effect(() => {
    const ueberFenster = (e: DragEvent) => { if (!mitDatei(e)) return; e.preventDefault(); ueber = true; };
    const raus = (e: DragEvent) => { if (!e.relatedTarget) ueber = false; };
    const ablegen = (e: DragEvent) => { if (mitDatei(e)) void abgelegt(e); };
    addEventListener('dragover', ueberFenster); addEventListener('dragleave', raus); addEventListener('drop', ablegen);
    return () => { removeEventListener('dragover', ueberFenster); removeEventListener('dragleave', raus); removeEventListener('drop', ablegen); };
  });
  async function projektWaehlen() {
    try { const w = await waehleDatei(); if (w) datei(w.datei, w.handle); } catch { /* Auswahl nicht möglich: das normale Dateifeld bleibt */ }
  }
  /** Meta-Analyse ohne eigene Daten: leeres Projekt mit einer Spalte, dann gleich das Blatt mit der Meta-Analyse. */
  function metaStart() {
    metaDirekt.an = true;
    mitLaden(L('Meta-Analyse', 'Meta-analysis'), async () => { await neueStudie(L('Meta-Analyse', 'Meta-analysis'), [{ bezeichnung: L('Nummer', 'ID'), art: 'zahl', gruppen: '' }]); return 'blatt/neu'; });
  }
  /* ---------- Neue Studie ---------- */
  type Zeile = { bezeichnung: string; art: 'zahl' | 'gruppenzahl' | 'text' | 'datum'; gruppen: string };
  let anlegen = $state(false);
  /** V2: nach dem Anlegen gleich die Planung (Datenmanagementplan, Präregistrierung) öffnen statt die Dateneingabe */
  let danachPlanen = $state(false);
  let studie = $state({ name: '', spalten: [{ bezeichnung: L('Nummer', 'ID'), art: 'zahl', gruppen: '' }, { bezeichnung: '', art: 'zahl', gruppen: '' }] as Zeile[] });
  function spalteMehr() { studie.spalten.push({ bezeichnung: '', art: 'zahl', gruppen: '' }); tick().then(() => document.getElementById(`ns-b-${studie.spalten.length - 1}`)?.focus()); }
  function anlegenLos(e: SubmitEvent) {
    e.preventDefault();
    const sp = studie.spalten.filter(z => z.bezeichnung.trim());
    if (!sp.length) { melde(L('Bitte mindestens eine Spalte benennen.', 'Please name at least one column.')); document.getElementById('ns-b-0')?.focus(); return; }
    const neu: NeueSpalte[] = sp.map(z => ({ bezeichnung: z.bezeichnung, art: z.art === 'gruppenzahl' ? 'zahl' : z.art, gruppen: z.art === 'gruppenzahl' ? z.gruppen : '' }));
    const titel = studie.name || L('Neue Studie', 'New study');
    mitLaden(titel, async () => { await neueStudie(studie.name, neu); return danachPlanen ? 'planung' : 'daten/bearbeiten'; });
  }

</script>

{#if laeuft}
  <div class="laden"><div class="laden-karte" role="status">
    <Logo groesse={48} />
    <h1>{s.motor === 'bereit' ? L('Die Datei wird geöffnet.', 'The file is being opened.') : L('Der Statistik-Motor startet.', 'The statistics engine is starting.')}</h1>
    <p>{s.motor === 'bereit' ? laeuft : L('Beim ersten Mal dauert das ein paar Sekunden. Danach startet er sofort.', 'The first time takes a few seconds. After that it starts right away.')}</p>
    <ol class="schritte">
      <li class={s.motorSchritt > 0 ? 'fertig' : 'laeuft'}>{#if s.motorSchritt > 0}<Icon n="haken" k="ok" />{:else}<span class="punkt-ort"><Rechnet /></span>{/if}{L('Programm laden', 'Loading program')}{#if s.motorSchritt === 0 && s.motorBytes[1]}<span class="lade-balken" role="progressbar" aria-label={L('Programm laden', 'Loading program')} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(100 * s.motorBytes[0] / s.motorBytes[1])}><span style="width:{100 * s.motorBytes[0] / s.motorBytes[1]}%"></span></span><small class="lade-zahl">{zahlDe(s.motorBytes[0] / 1e6, 1)} {L('von', 'of')} {zahlDe(s.motorBytes[1] / 1e6, 1)} MB</small>{/if}</li>
      <li class={s.motorSchritt > 1 ? 'fertig' : s.motorSchritt === 1 ? 'laeuft' : ''}>{#if s.motorSchritt > 1}<Icon n="haken" k="ok" />{:else if s.motorSchritt === 1}<span class="punkt-ort"><Rechnet /></span>{:else}<span class="punkt"></span>{/if}{L('Rechenkern starten', 'Starting statistics engine')}</li>
      <li class={s.motorSchritt > 1 ? 'laeuft' : ''}>{#if s.motorSchritt > 1}<span class="punkt-ort"><Rechnet /></span>{:else}<span class="punkt"></span>{/if}{L('Daten öffnen', 'Opening data')}</li>
    </ol>
    {#if langsam}<div class="banner ruhig" role="status" style="margin-top:var(--a5)"><Icon n="info" /><p>{langsamText}</p></div>{/if}
  </div></div>
{:else if fbImport.offen && fbImport.erk}
  <FragebogenDialog fb={fbImport} uebernehmen={fbUebernehmen} roh={fbRoh} zu={() => fbImport.schliesse()} />
{:else if qdaDatei}
  <QdaDialog datei={qdaDatei} oeffnen={qdaOeffnen} zu={() => (qdaDatei = null)} />
{:else if eurostatOffen && !OFFLINE}
  <EurostatDialog oeffnen={eurostatOeffnen} zu={() => (eurostatOffen = false)} />
{:else}
<div class="start">
  <h1>{s.projekte.length ? L('Willkommen zurück', 'Welcome back') : d('Womit möchtest du anfangen?', 'Womit möchten Sie anfangen?', 'Where would you like to start?')} <HilfeLink id="start-seite" text={L('Hilfe zur Startseite', 'Help on the start page')} /></h1>
  <p class="unter">{d('Übe mit den Beispieldaten oder öffne deine eigene Datei.', 'Üben Sie mit den Beispieldaten oder öffnen Sie Ihre eigene Datei.', 'Practice with the example data or open your own file.')}</p>

  {#if fehler}
    <div class="meldung-karte" role="alert" style="margin-bottom:var(--a5)"><Icon n="hinweis" />
      <div><h2>{fehler.titel}</h2><p>{fehler.text}</p><p class="tun">{fehler.tun}</p></div>
      {#if fehler.details}<details class="auf"><summary>{L('Details', 'Details')}</summary><pre>{fehler.details}</pre></details>{/if}
    </div>
  {/if}

  <ProjektListe oeffne={(id, name) => mitLaden(name, async () => { await weiterarbeiten(id); })} />

  <!-- Stufe 2 (Usability): drei große Wege. Wer „Ich kenne mich aus“ gewählt hat (s.einst.profi), sieht „Eigene Datei öffnen“ zuerst. -->
  {#snippet wegBeispiel(erster: boolean)}
    <section class="weg-gross" aria-labelledby="bsp-t">
      <Icon n="gluehbirne" k="gross" />
      <h2 id="bsp-t">{L('Mit einem Beispiel üben', 'Practice with an example')}</h2>
      <p>{L('Eine erfundene Befragung von 120 Personen zu Schlaf, Handy und Konzentration - etwa 10 Minuten, ohne Vorkenntnisse.', 'A made-up survey of 120 people about sleep, phone use and concentration - about 10 minutes, no prior knowledge needed.')}</p>
      <div class="weg-knoepfe"><button class="k gross" class:haupt={erster} type="button" onclick={() => mitLaden(L('Beispieldaten', 'Example data'), oeffneBeispiel)}>{L('Beispiel öffnen', 'Open example')}</button>
        <a class="weg-leise" href="#beispiele">{L('Alle Beispiele ansehen', 'See all examples')}</a></div>
    </section>
  {/snippet}
  {#snippet wegDatei(erster: boolean)}
    <section class="weg-gross weg-datei" class:ueber aria-labelledby="eigen-t">
      <Icon n="datei" k="gross" />
      <h2 id="eigen-t">{L('Eigene Datei öffnen', 'Open your own file')}</h2>
      <p>{d('Ziehe die Datei hierher oder wähle sie aus. Sie bleibt auf deinem Gerät.', 'Ziehen Sie die Datei hierher oder wählen Sie sie aus. Sie bleibt auf Ihrem Gerät.', 'Drag the file here or choose it. It stays on your device.')}</p>
      <div class="weg-knoepfe"><label class="k gross" class:haupt={erster} style="cursor:pointer">{L('Datei auswählen', 'Choose file')}<input type="file" class="nur-vorleser" accept=".statable,.xlsx,.xlsm,.xls,.ods,.csv,.tsv,.txt,.json,.sav,.zsav,.dta,.sas7bdat,.xpt,.sps" onchange={(e) => datei((e.currentTarget as HTMLInputElement).files?.[0])}></label>
        <p class="formate">{L('Excel, CSV, SPSS, Stata, SAS und mehr', 'Excel, CSV, SPSS, Stata, SAS and more')} <HilfeLink id="daten-oeffnen" text={L('Alle Dateiformate', 'All file formats')} /></p>
        {#if apiDa()}<button class="weg-leise" type="button" onclick={projektWaehlen} data-tipp={L('Öffnet ein gespeichertes Projekt; Strg+S speichert danach in dieselbe Datei', 'Opens a saved project; Ctrl+S then saves to the same file')}>{L('Projektdatei öffnen', 'Open project file')}</button>{/if}</div>
    </section>
  {/snippet}
  {#snippet wegStudie()}
    <section class="weg-gross" aria-labelledby="neu-t">
      <Icon n="stift" k="gross" />
      <h2 id="neu-t">{L('Neue Studie anlegen', 'Create a new study')}</h2>
      <p>{L('Für Fragebögen auf Papier oder Werte aus einem Versuch: Spalten festlegen und die Daten direkt eintippen.', 'For paper questionnaires or values from an experiment: set up the columns and type the data in directly.')}</p>
      <div class="weg-knoepfe"><button class="k gross" type="button" aria-expanded={anlegen} onclick={() => { anlegen = !anlegen; if (anlegen) tick().then(() => document.getElementById('ns-name')?.focus()); }}>{anlegen ? L('Schließen', 'Close') : L('Studie anlegen', 'Create study')}</button></div>
    </section>
  {/snippet}
  <div class="wege">
    {#if s.einst.profi}{@render wegDatei(true)}{@render wegBeispiel(false)}{:else}{@render wegBeispiel(true)}{@render wegDatei(false)}{/if}
    {@render wegStudie()}
  </div>
  {#if anlegen}
    <form class="studie-form klappt" transition:rutsch onsubmit={anlegenLos} aria-labelledby="neu-t">
      <div class="eingabe"><label for="ns-name">{L('Name der Studie', 'Name of the study')}</label><input id="ns-name" type="text" bind:value={studie.name} placeholder={L('z. B. Lesemotivation 4. Klasse', 'e.g. Reading motivation, grade 4')}></div>
      <fieldset><legend>{L('Spalten', 'Columns')} - {d('was du je Person erfasst', 'was Sie je Person erfassen', 'what you record for each person')}</legend>
        {#each studie.spalten as z, i}
          <div class="studie-spalte">
            <div class="eingabe"><label for="ns-b-{i}">{L('Spalte', 'Column')} {i + 1}</label><input id="ns-b-{i}" type="text" bind:value={z.bezeichnung} placeholder={L('z. B. Geschlecht', 'e.g. Gender')}></div>
            <div class="eingabe"><label for="ns-a-{i}">{L('Was steht drin?', 'What does it contain?')}</label>
              <select id="ns-a-{i}" bind:value={z.art}><option value="zahl">{L('Zahlen (Punkte, Alter, Note)', 'Numbers (points, age, grade)')}</option><option value="gruppenzahl">{L('Gruppen als Zahlen (1 = ja, 2 = nein)', 'Groups as numbers (1 = yes, 2 = no)')}</option><option value="text">{L('Wörter (Klasse, Schule)', 'Words (class, school)')}</option><option value="datum">{L('Datum', 'Date')}</option></select></div>
            {#if z.art === 'gruppenzahl'}<div class="eingabe"><label for="ns-g-{i}">{L('Gruppen', 'Groups')}</label><input id="ns-g-{i}" type="text" bind:value={z.gruppen} placeholder={L('1 = ja, 2 = nein', '1 = yes, 2 = no')}></div>{/if}
            {#if studie.spalten.length > 1}<button class="k leise nur-symbol" type="button" aria-label={L(`Spalte ${i + 1} entfernen`, `Remove column ${i + 1}`)} onclick={() => studie.spalten.splice(i, 1)}><Icon n="x" /></button>{/if}
          </div>
        {/each}
        <button class="k leise" type="button" onclick={spalteMehr}><Icon n="plus" />{L('Weitere Spalte', 'Another column')}</button>
      </fieldset>
      <p class="hilfe">{d('Spalten kannst du später jederzeit ergänzen oder umbenennen.', 'Spalten können Sie später jederzeit ergänzen oder umbenennen.', 'You can add or rename columns at any time later.')}</p>
      <label class="radio"><input type="checkbox" bind:checked={danachPlanen}>{L('Danach die Studie planen (Datenmanagementplan, Präregistrierung)', 'Then plan the study (data management plan, preregistration)')}</label>
      <div class="knopfzeile"><button class="k haupt gross" type="submit">{danachPlanen ? L('Anlegen und Studie planen', 'Create and plan the study') : L('Anlegen und Daten eingeben', 'Create and enter data')}</button></div>
    </form>
  {/if}

  <!-- Weitere Einstiege: ruhige Liste in zwei Gruppen, je eine Zeile (R11). Fachbegriffe im Satz verlinkt der Begriffsverlinker. -->
  <section class="weitere" aria-labelledby="weitere-t">
    <h2 id="weitere-t">{L('Weitere Einstiege', 'More ways to start')}</h2>
    <div class="weitere-gruppen">
      <div class="weitere-gruppe">
        <h3 id="weitere-ohne">{L('Ohne eigene Daten', 'Without data of your own')}</h3>
        <ul class="einstiege" aria-labelledby="weitere-ohne">
          <li class="lernen-tuer"><Icon n="gluehbirne" /><a href="#lernen">{L('Statistik lernen', 'Learn statistics')}</a><span>{L('Lernpfade aus kurzen Einheiten mit Erklärung, Beispiel und Übungsfragen.', 'Learning paths of short units with explanation, example and practice questions.')}</span></li>
          <li class="verstehen-tuer"><Icon n="rechnen" /><a href="#verstehen">{L('Rechner und Regler', 'Calculators and sliders')}</a><span>{L('Verteilungen, Konfidenzintervalle und Tests zum Ausprobieren.', 'Distributions, confidence intervals and tests to try out.')}</span></li>
          <li class="planen-tuer"><Icon n="planen" /><a href="#planen">{L('Studie planen (Fallzahl)', 'Plan a study (sample size)')}</a><span>{L('Wie viele Personen brauche ich? Stichprobengröße mit Poweranalyse, vor der Datenerhebung.', 'How many people do I need? Sample size with power analysis, before data collection.')}</span></li>
          <li class="fragebogen-tuer"><Icon n="planen" /><a href="#fragebogen">{L('Fragebogen planen (Fragebogenentwicklung)', 'Plan a questionnaire (questionnaire development)')}</a><span>{L('Seiten, Fragen und Antworten anlegen, nach festen Regeln prüfen, auch eine XLSForm aus KoboToolbox oder ODK öffnen.', 'Create pages, questions and answers, check them against fixed rules, also open an XLSForm from KoboToolbox or ODK.')}</span></li>
          <li class="interviews-tuer"><Icon n="planen" /><a href="#interviews">{L('Interviews vorbereiten und auswerten (qualitative Daten)', 'Prepare and analyse interviews (qualitative data)')}</a><span>{L('Interview-Leitfaden in vier Schritten (Leitfaden nach Helfferich) entwickeln und die Auswertung vorbereiten.', 'Develop an interview guide in four steps (guide after Helfferich) and prepare the analysis.')}</span></li>
          <li class="meta-tuer"><Icon n="studien" /><button type="button" onclick={metaStart}>{L('Studien zusammenfassen (Meta-Analyse)', 'Combine studies (meta-analysis)')}</button><span>{L('Ergebnisse mehrerer Studien zu einem Gesamtergebnis, mit Forest-Plot und Funnel-Plot.', 'Results of several studies combined into one overall result, with forest plot and funnel plot.')}</span></li>
        </ul>
      </div>
      <div class="weitere-gruppe">
        <h3 id="weitere-quellen">{L('Andere Quellen', 'Other sources')}</h3>
        <ul class="einstiege" aria-labelledby="weitere-quellen">
          <li class="qda-tuer"><Icon n="studien" /><label style="cursor:pointer">{L('Codierungen aus MAXQDA, ATLAS.ti oder NVivo', 'Codings from MAXQDA, ATLAS.ti or NVivo')}<input type="file" class="nur-vorleser" accept=".xlsx,.xlsm,.xls,.ods,.csv,.tsv,.txt" onchange={(e) => { const f = e.currentTarget.files?.[0]; if (f) qdaDatei = f; e.currentTarget.value = ''; }}></label><span>{L('Code-Matrix als Excel- oder CSV-Datei öffnen und die Codes je Dokument auswerten; der Text der Interviews bleibt draußen.', 'Open the code matrix as an Excel or CSV file and analyse the codes per document; the text of the interviews stays out.')}</span></li>
          {#if !OFFLINE}<li class="eurostat-tuer"><Icon n="zeitreihe" /><button type="button" onclick={() => (eurostatOffen = true)}>{L('Daten von Eurostat', 'Data from Eurostat')}</button><span>{L('Öffentliche Daten der Europäischen Union; eine Anfrage geht erst im nächsten Schritt hinaus.', 'Public data of the European Union; a request is only sent in the next step.')}</span></li>{/if}
        </ul>
      </div>
    </div>
  </section>

  <div class="banner ruhig" style="margin-top:var(--a5)"><Icon n="geraet" />
    <p>{d('Deine Daten bleiben in diesem Browser auf diesem Gerät und gehen an keinen Server. An einem fremden oder gemeinsam genutzten Rechner speichere das Projekt am Ende in eine Datei (Strg+S), zum Beispiel in dein OneDrive, und öffne sie später auf jedem Gerät hier wieder.', 'Ihre Daten bleiben in diesem Browser auf diesem Gerät und gehen an keinen Server. An einem fremden oder gemeinsam genutzten Rechner speichern Sie das Projekt am Ende in eine Datei (Strg+S), zum Beispiel in Ihr OneDrive, und öffnen sie später auf jedem Gerät hier wieder.', 'Your data stays in this browser on this device and goes to no server. On a shared or someone else\'s computer, save the project to a file when you finish (Ctrl+S), for example to your OneDrive, and open it here again later on any device.')} <a href="#hilfe/datenschutz-projekt">{L('Mehr dazu', 'More')}</a></p></div>
  <p class="fuss"><a href="#impressum">{L('Impressum', 'Legal notice')}</a><a href="#datenschutz">{L('Datenschutz', 'Privacy')}</a><a href="#behoerden">{L('Für Behörden', 'For public bodies')}</a><a href="#barrierefreiheit">{L('Barrierefreiheit', 'Accessibility')}</a>{#if spendeMoeglich()}<a href="#unterstuetzen">{L('Unterstützen', 'Support')}</a>{/if}<span>{L('Freie Software (GPL)', 'Free software (GPL)')}</span></p>
</div>
{/if}
