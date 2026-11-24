<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { rutsch } from '../lib/rutsch';
  import { tick } from 'svelte';
  import { sage } from '../lib/ansage';
  import { DateiFehler } from '../lib/einlesen';
  import { zuGrossText, type Groesse } from '../lib/groessengrenze';
  import { s, d, L, Lp, motor, melde, meldeFehler, textAbgebrochen, oeffneDatei, sichern, aendere, type Blatt } from '../lib/sitzung.svelte';
  import { befehle, merkeSyntax } from '../lib/befehlsspeicher.svelte';
  import { exportiereErgebnisseExcel, herunterladen } from '../lib/export';
  import { teileBefehle, lauf as teilLauf, stelleAus, bereich, type Teil } from '../lib/befehlsteile';
  import { spssAngleichen, angleichText } from '../lib/spssangleich';
  import { bausteine, type Baustein, type Werte, type Feld } from '../lib/bausteine';
  import { spalteNach } from '../lib/sitzung.svelte';
  import { ort } from '../i18n/profil';
  import Befehlsfeld from '../bausteine/Befehlsfeld.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Ausgabe from '../bausteine/Ausgabe.svelte';
  import BalkenBlock from '../bausteine/BalkenBlock.svelte';
  import { balkenQuelle } from '../lib/balkenquelle';
  import { regressionZuLauf, type RegStreu } from '../lib/regstreu';
  import Streudiagramm from '../bausteine/Streudiagramm.svelte';
  import DiagrammExport from '../bausteine/DiagrammExport.svelte';
  import { EngineAbbruch, EngineAbgebrochen } from '../engine/wasm-engine';
  import Abbrechen from '../bausteine/Abbrechen.svelte';
  import { zaehle } from '../lib/zaehlen';
  import { befehlsTitel, befehlsInhalt } from '../lib/befehlsname';

  let laeuft = $state(false);
  let feld = $state<HTMLTextAreaElement>();
  const AENDERT = /^\s*(COMPUTE|RECODE|MISSING VALUES|VALUE LABELS|VARIABLE LABELS|VARIABLE LEVEL|SELECT IF|SORT CASES|DELETE VARIABLES|RENAME VARIABLES|STRING|NUMERIC|AUTORECODE|GET|DATA LIST|NEW FILE|WEIGHT|SPLIT FILE|FILTER|AGGREGATE|ADD VALUE LABELS|FORMATS|COUNT|IF|DO IF|RANK|MATCH FILES|ADD FILES)\b/im;

  /** Später S-F2 (E): Der Baustein „Nach Gruppen erkunden“ (EXAMINE /VARIABLES=y BY g) bekommt das Bild „Mittelwert nach Gruppe“; die Daten werden zur Zeit des Laufs festgehalten, damit Tabelle und Bild zusammenpassen. */
  function balkenZuLauf(text: string): { balken?: { y: string; g: string; quelle: ReturnType<typeof balkenQuelle> } } {
    const m = /^\s*EXAMINE\s+\/VARIABLES=(\S+)\s+BY\s+(\S+?)\s*(?:\n|$)/im.exec(text);
    if (!m || !s.projekt || !s.spalten.some(c => c.name === m[1]) || !s.spalten.some(c => c.name === m[2])) return {};
    const quelle = balkenQuelle(m[1]!, m[2]!);
    return quelle.ok ? { balken: { y: m[1]!, g: m[2]!, quelle } } : {};
  }
  /** PSPP zeichnet in REGRESSION kein Diagramm: bei einem x Streudiagramm mit Regressionsgerade aus denselben Daten (lib/regstreu.ts). */
  function regZuLauf(text: string): { regstreu?: RegStreu[] } {
    const r = regressionZuLauf(text);
    return r.length ? { regstreu: r } : {};
  }
  /** zeilen[k]: Zeile im ganzen Text, aus der Zeile k des Laufs stammt - damit Fehlermeldungen auf die richtige Stelle zeigen. */
  async function ausfuehren(text = befehle.text, zeilen = text.split('\n').map((_, k) => k)) {
    if (!text.trim() || laeuft) return;
    laeuft = true;
    try {
      const e = await motor();
      const t0 = performance.now();
      // Was SPSS 27-29 beim Einfügen schreibt und PSPP nicht kennt (/ES, OUTS, VARIABLES … /METHOD=ENTER …), wird angeglichen und unter der Ausgabe genannt (lib/spssangleich.ts).
      const a = spssAngleichen(text, zeilen, !!s.projekt);
      // Befehle, die Daten ändern, laufen mit Schnappschuss für Rückgängig; reine Auswertungen ohne.
      const r = AENDERT.test(a.syntax) && s.projekt ? await aendere(L('Befehle ausgeführt', 'Commands run'), a.syntax) : await e.run(a.syntax);
      // Meldungen von Statable selbst (Übersprungenes, nicht Gespeichertes - lib/spssbefehle.ts): vor und nach den Ergebnissen
      const von = (xs: string[]) => xs.map(text => ({ type: 'message' as const, severity: 'warning' as const, text }));
      const items = [...von(a.meldungen.vorher), ...r.items, ...von(a.meldungen.nachher)];
      geloescht = [];
      const neu = { id: Date.now(), syntax: a.syntax, zeilen: a.zeilen, items, ms: Math.round(performance.now() - t0), zeit: Date.now(), ...(a.aenderungen.length ? { angeglichen: a.aenderungen } : {}), ...balkenZuLauf(a.syntax), ...(regZuLauf(a.syntax)) } as (typeof befehle.laeufe)[number];
      // Jeder Lauf mit Ergebnis wird sofort ein eigener Reiter mit sprechendem Namen (Johannes 03.11.); Fehlerläufe und reine Datenänderungen bleiben nur hier.
      const reiter = reiterAus(neu);
      if (reiter) neu.blattId = reiter;
      befehle.laeufe = [...befehle.laeufe, neu];
      await tick();
      document.getElementById('lauf-' + befehle.laeufe.at(-1)!.id)?.focus();
      // Fehler nie nur als Farbe: sofort ansagen, mit der Zeile im Befehlsfeld (Fokus liegt auf der Überschrift der Ausgabe)
      const fehler = r.items.find(x => x.type === 'message' && x.severity === 'error');
      if (fehler && fehler.type === 'message') { const st = stelle(neu, fehler.text); sage(st ? L(`Fehler in Zeile ${st.zeile}: ${fehler.text}`, `Error in line ${st.zeile}: ${fehler.text}`) : L(`Fehler: ${fehler.text}`, `Error: ${fehler.text}`), 'dringend'); }
    } catch (err) {
      if (err instanceof EngineAbgebrochen) { melde(textAbgebrochen()); return; }
      if (!(err instanceof EngineAbbruch)) throw err;
      // Die Engine ist abgestürzt (Fehler in PSPP, nicht in den Befehlen) - sie startet neu, die Daten werden wieder eingefüllt. Als Lauf mit Fehlermeldung zeigen, nie still; erklärt wird sie über die Regel „engine-absturz“ in messages.*.json.
      const meldung = `Statable: PSPP crashed and was restarted. ${err.grund}`;
      befehle.laeufe = [...befehle.laeufe, { id: Date.now(), syntax: text, zeilen, items: [{ type: 'message', severity: 'error', text: meldung }], ms: 0, zeit: Date.now() }];
      await tick();
      document.getElementById('lauf-' + befehle.laeufe.at(-1)!.id)?.focus();
    } finally { laeuft = false; }
  }
  /** Strg + Eingabe: ist im Feld etwas markiert, läuft nur das. */
  function tastenLauf() {
    const f = feld!, a = f.selectionStart, b = f.selectionEnd;
    if (a === b) { ausfuehren(); return; }
    const erste = befehle.text.slice(0, a).split('\n').length - 1, text = befehle.text.slice(a, b);
    ausfuehren(text, text.split('\n').map((_, k) => erste + k));
  }
  // Einzeln ausführen: jeder Befehl ein Kästchen. Gemerkt wird der Text des Befehls, nicht seine Nummer - Einfügen darüber verschiebt nichts.
  const TEILE = $derived(teileBefehle(befehle.text));
  let angehakt = $state<string[]>([]);
  const gewaehlt = $derived(TEILE.filter(x => angehakt.includes(x.text)));
  const kurz = (x: Teil) => { const z = x.text.slice(x.text.indexOf(x.kopf)).replace(/\s+/g, ' '); return z.length > 90 ? z.slice(0, 88) + ' …' : z; };
  function hake(x: Teil, an: boolean) { angehakt = an ? [...angehakt, x.text] : angehakt.filter(y => y !== x.text); }
  function angehakteAusfuehren() { if (!gewaehlt.length) return; const r = teilLauf(befehle.text, gewaehlt); ausfuehren(r.syntax, r.zeilen); }
  /** Fehlerstelle einer Meldung im Textfeld markieren. */
  function stelle(l: (typeof befehle.laeufe)[number], meldung: string) {
    const st = stelleAus(meldung), b = st && bereich(befehle.text, l.zeilen ?? [], st);
    if (!b) return null;
    return { zeile: b.zeile, zeigen: () => {
      const f = feld!; f.focus(); f.setSelectionRange(b.von, b.bis);
      f.scrollTop = Math.max(0, (b.zeile - 3) * (parseFloat(getComputedStyle(f).lineHeight) || 24));
      f.scrollIntoView({ block: 'center', behavior: 'smooth' });
      melde(L(`Zeile ${b.zeile} ist im Befehl markiert.`, `Line ${b.zeile} is selected in the commands.`));
    } };
  }
  function speichern() {
    if (!befehle.text.trim()) return;
    const name = (befehle.name || L('befehle', 'commands')).replace(/\.(sps|txt|syntax)$/i, '') + '.sps';
    // Mit BOM: SPSS erkennt so UTF-8 (Umlaute); Windows-Zeilenenden für den Editor dort.
    herunterladen(new TextEncoder().encode('\uFEFF' + befehle.text.replace(/\r?\n/g, '\r\n')), name, 'text/plain');
    melde(L(`Befehle gespeichert: ${name}. Sie liegen bei den Downloads.`, `Commands saved: ${name}. You will find them in your downloads.`));
  }
  /** Datei öffnen (Excel wird erst jetzt nachgeladen) und Excel-Export eines Laufs: Animation im Knopf, gegen Doppelklick gesperrt. */
  const ladeDatei = new Laedt(), ladeExcel = new Laedt();
  let excelLauf = $state(0);
  async function datei(f: File | undefined) {
    if (!f || ladeDatei.aktiv) return;
    try {
      const r = await ladeDatei.mit(() => oeffneDatei(f)); if (!r) return;
      if (r === 'daten' || r === 'projekt') melde(r === 'projekt' ? L(`Projekt geöffnet: ${f.name}`, `Project opened: ${f.name}`) : L(`Daten geöffnet: ${f.name}`, `Data opened: ${f.name}`)); else { merkeSyntax(r.syntax, r.name); melde(L(`Befehle geladen: ${f.name}`, `Commands loaded: ${f.name}`)); feld?.focus(); }
    } catch (e) {
      if (e instanceof DateiFehler && e.grund === 'abgebrochen') return;   // Excel-Blatt: Frage abgebrochen
      if (e instanceof DateiFehler && e.grund === 'gross') { const x = JSON.parse(e.details) as { g: Groesse; bytes: number }, z = zuGrossText(f.name, x.g, x.bytes); melde(`${z.text} ${z.tun}`); }
      else meldeFehler(L(`„${f.name}“ ließ sich nicht öffnen.`, `"${f.name}" couldn't be opened.`));
    }
  }
  type Lauf = (typeof befehle.laeufe)[number];
  /** Legt aus einem Lauf den Reiter an (nur mit offenen Daten und einem Ergebnis ohne Fehlermeldung); gibt die Blatt-Nummer zurück. Hat der Lauf schon einen offenen Reiter, wird kein zweiter gemacht. */
  function reiterAus(l: Lauf, auchLeer = false): string | null {
    if (!s.projekt) return null;
    if (l.blattId && s.blaetter.some(b => b.id === l.blattId)) return l.blattId;
    if (l.items.some(i => i.type === 'message' && i.severity === 'error')) return null;
    if (!auchLeer && (!befehlsInhalt(l.syntax, L) || !l.items.some(i => i.type === 'table' || i.type === 'chart' || i.type === 'image'))) return null;
    // Derselbe Befehl mit demselben Ergebnis (also auf denselben Daten) liefert immer das Gleiche: kein zweiter Reiter, sondern ein Hinweis auf den ersten (Johannes 03.11.).
    const schluessel = JSON.stringify(l.items), gleich = s.blaetter.find(b => b.art === 'befehle' && b.syntax === l.syntax && JSON.stringify(b.items) === schluessel);
    if (gleich) { melde(L(`Diese Auswertung gibt es schon im Reiter „${gleich.titel}“.`, `This analysis already exists in the tab "${gleich.titel}".`)); return gleich.id; }
    const titel = befehlsTitel(l.syntax, s.blaetter.filter(b => b.art === 'befehle').map(b => b.titel), L);
    const b: Blatt = { id: Math.random().toString(36).slice(2, 8), titel, art: 'befehle', l1: null, l2: null, syntax: l.syntax, items: l.items, ergebnis: null, imBericht: true, notiz: '', zeit: Date.now(), ...(l.regstreu ? { regstreu: l.regstreu } : {}) };
    s.blaetter = [...s.blaetter, b]; zaehle('verfahren', 'befehle'); sichern();
    melde(L(`Neuer Reiter: ${titel}`, `New tab: ${titel}`));
    return b.id;
  }
  function insHeft(l: Lauf) {
    if (!s.projekt) { melde(d('Öffne zuerst Daten - dann kommt das Ergebnis in die Auswertung.', 'Öffnen Sie zuerst Daten - dann kommt das Ergebnis in die Auswertung.', 'Open data first - then the result goes into Analysis.')); return; }
    const id = reiterAus(l, true);
    if (id) { l.blattId = id; location.hash = '#blatt/' + id; }
  }
  // Bausteine mit den Spalten der offenen Daten. Ein Klick ersetzt nur einen leeren oder unveränderten Baustein, sonst kommt er ans Ende.
  const GRUPPEN = $derived(s.projekt ? bausteine(s.spalten, s.zeilen, s.gewicht) : []);
  let zuletzt = '';
  async function einsetzen(b: string) {
    const ersetzt = !befehle.text.trim() || befehle.text === zuletzt;
    const vorne = ersetzt ? '' : befehle.text.replace(/\s*$/, '') + '\n\n';
    befehle.text = zuletzt = vorne + b;
    await tick();
    feld?.focus(); feld?.setSelectionRange(vorne.length, befehle.text.length);
  }
  // Baustein mit Spaltenwahl: ein kleines Formular, vorbelegt mit der Vorwahl.
  let offen = $state<{ b: Baustein; werte: Werte } | null>(null);
  async function oeffneBaustein(b: Baustein) {
    if (offen?.b.id === b.id) { offen = null; return; }
    offen = { b, werte: Object.fromEntries(b.felder.map(f => [f.id, [...f.vorgabe]])) };
    await tick();
    (document.querySelector('#bs-form select, #bs-form input') as HTMLElement | null)?.focus();
  }
  function schliesseBaustein() { const id = offen?.b.id; offen = null; tick().then(() => document.getElementById('bs-k-' + id)?.focus()); }
  const fehlt = $derived(offen ? offen.b.felder.filter(f => (offen!.werte[f.id]?.length ?? 0) < (offen!.b.mindestens[f.id] ?? 1)) : []);
  const vorschau = $derived(offen && !fehlt.length ? offen.b.bau(offen.werte) : '');
  function kreuze(f: Feld, name: string, an: boolean) {
    const alt = offen!.werte[f.id] ?? [];
    offen!.werte[f.id] = an ? f.optionen.filter(o => o === name || alt.includes(o)) : alt.filter(o => o !== name);
  }
  const mitBez = (name: string) => { const b = spalteNach(name)?.bezeichnung; return b && b !== name ? `${name} - ${b.length > 40 ? b.slice(0, 38) + ' …' : b}` : name; };
  // Spaltenname an der Schreibmarke einfügen, mit Leerzeichen davor, wenn nötig.
  async function spalteEinfuegen(name: string) {
    const f = feld!, t = befehle.text, a = f.selectionStart ?? t.length, e = f.selectionEnd ?? a;
    const davor = a > 0 && !/[\s(=,/]/.test(t[a - 1]!) ? ' ' : '';
    befehle.text = t.slice(0, a) + davor + name + t.slice(e);
    await tick();
    const p = a + davor.length + name.length; f.focus(); f.setSelectionRange(p, p);
  }
  // Ausgaben: einzeln oder alle zuklappen; löschen lässt sich bis zum nächsten Lauf zurückholen.
  let zu = $state<number[]>([]);
  let geloescht = $state<typeof befehle.laeufe>([]);
  const alleZu = $derived(befehle.laeufe.length > 0 && befehle.laeufe.every(l => zu.includes(l.id)));
  const klappe = (id: number) => (zu = zu.includes(id) ? zu.filter(x => x !== id) : [...zu, id]);
  function alleLoeschen() { geloescht = befehle.laeufe; befehle.laeufe = []; melde(d('Ausgaben gelöscht. Du kannst sie bis zum nächsten Lauf zurückholen.', 'Ausgaben gelöscht. Sie können sie bis zum nächsten Lauf zurückholen.', 'Outputs deleted. You can bring them back until the next run.')); }
</script>

<div class="tisch ohne-rand"><section class="blatt rund" aria-labelledby="bf-t">
  <SeitenKopf titelId="bf-t" titel={L('Befehle', 'Commands')} hilfe={{ id: 'befehle-seite', text: L('Hilfe zu den Befehlen', 'Help on commands') }}>
    {#snippet aktionen()}
    <label class="k" style="cursor:pointer" aria-disabled={ladeDatei.aktiv ? 'true' : undefined}>{#if ladeDatei.sichtbar}<Rechnet imKnopf text={L('Wird geöffnet …', 'Opening …')} />{:else}<Icon n="datei" />{L('Datei öffnen', 'Open file')}{/if}<input type="file" class="nur-vorleser" accept=".sps,.txt,.syntax,.sav,.dta,.xlsx,.csv,.ods,.statable" disabled={ladeDatei.aktiv} onchange={(e) => datei((e.currentTarget as HTMLInputElement).files?.[0])}></label><span class="nur-vorleser" role="status">{ladeDatei.sichtbar || ladeExcel.sichtbar ? L('Wird geladen …', 'Loading …') : ''}</span>
    <button class="k" type="button" data-tipp={L('Speichert die Befehle als .sps-Datei auf diesem Gerät', 'Saves the commands as an .sps file on this device')} onclick={speichern} aria-disabled={!befehle.text.trim() ? 'true' : undefined}><Icon n="download" />{L('Speichern (.sps)', 'Save (.sps)')}</button>
    {/snippet}
    {#snippet untertitel()}<p>{d('Hier laufen Befehle (Syntax) wie in PSPP oder SPSS - zum Beispiel .sps-Dateien aus einem Kurs, einem Buch oder einem früheren Projekt. Öffne zuerst die Daten (zum Beispiel .sav, .xlsx oder .csv), dann die Befehle, dann „Alle ausführen“.', 'Hier laufen Befehle (Syntax) wie in PSPP oder SPSS - zum Beispiel .sps-Dateien aus einem Kurs, einem Buch oder einem früheren Projekt. Öffnen Sie zuerst die Daten (zum Beispiel .sav, .xlsx oder .csv), dann die Befehle, dann „Alle ausführen“.', 'Commands (syntax) run here, as in PSPP or SPSS - for example .sps files from a course, a book or an earlier project. Open the data (for example .sav, .xlsx or .csv) first, then the commands, then "Run all".')}</p>{/snippet}
  </SeitenKopf>

  <div class="bf-raster"><div class="bf-links">
  <p style="display:flex;gap:var(--a3);flex-wrap:wrap;align-items:center;margin-bottom:var(--a3)">
    <span class="original"><Icon n="tabelle" />{s.projekt ? Lp(s.zeilen.length, `Daten: ${s.projekt.name} · ${s.zeilen.length} Zeile`, `Daten: ${s.projekt.name} · ${s.zeilen.length} Zeilen`, `Data: ${s.projekt.name} · ${s.zeilen.length} row`, `Data: ${s.projekt.name} · ${s.zeilen.length} rows`) : L('Noch keine Daten geöffnet', 'No data open yet')}</span>
    {#if befehle.name}<span class="original"><Icon n="befehl" />{L('Befehle', 'Commands')}: {befehle.name}</span>{/if}</p>
  <div class="eingabe"><label for="syntax">{L('Befehle', 'Commands')}</label>
    <Befehlsfeld id="syntax" bind:feld bind:value={befehle.text}
      placeholder={L('Zum Beispiel: DESCRIPTIVES /VARIABLES=alter.', 'For example: DESCRIPTIVES /VARIABLES=alter.')}
      onkeydown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); tastenLauf(); } }} />
    <span class="hilfe">{L('Strg + Eingabe führt alles aus - ist etwas markiert, nur das Markierte. Jeder Befehl endet mit einem Punkt.', 'Ctrl + Enter runs everything - or only the selection, if there is one. Every command ends with a period.')}</span></div>
  {#if s.spalten.length}
    <details class="auf spalten"><summary>{L('Spalten einfügen', 'Insert columns')} <small>{s.spalten.length}</small></summary>
      <div class="reihe">{#each s.spalten as sp (sp.name)}<button class="k leise" type="button" data-tipp={sp.bezeichnung ? L(`${sp.name} (${sp.bezeichnung}) an der Cursorstelle einfügen`, `Insert ${sp.name} (${sp.bezeichnung}) at the cursor`) : L(`${sp.name} an der Cursorstelle einfügen`, `Insert ${sp.name} at the cursor`)} aria-label={L(`${sp.name} einfügen`, `Insert ${sp.name}`)} onclick={() => spalteEinfuegen(sp.name)}>{sp.name}</button>{/each}</div></details>
  {/if}
  <div class="knopfzeile" style="margin:var(--a3) 0 var(--a5)">
    <button class="k haupt gross" type="button" data-tipp={L('Führt alle Befehle aus (Strg+Eingabe); bei Markierung nur das Markierte', 'Runs all commands (Ctrl+Enter); only the selection if text is selected')} onclick={() => ausfuehren()} aria-disabled={laeuft || !befehle.text.trim() ? 'true' : undefined}>{#if laeuft}<Rechnet imKnopf text={L('Statable rechnet …', 'Statable is calculating …')} />{:else}{L('Alle ausführen', 'Run all')}{/if}</button>
    <Abbrechen aktiv={laeuft} />
  </div>
  {#if TEILE.length > 1}
    <details class="auf einzeln"><summary>{L('Einzeln ausführen', 'Run one by one')} <small>{TEILE.length} {L('Befehle', 'commands')}{gewaehlt.length ? L(`, ${gewaehlt.length} angehakt`, `, ${gewaehlt.length} checked`) : ''}</small></summary>
      <fieldset><legend class="nur-vorleser">{L('Befehle zum Ausführen anhaken', 'Check the commands to run')}</legend>
        <ul>{#each TEILE as x (x.von)}<li><label><input type="checkbox" checked={angehakt.includes(x.text)} onchange={(e) => hake(x, e.currentTarget.checked)}><span class="zeile">{L('Zeile', 'Line')} {x.von + 1}</span><code>{kurz(x)}</code></label></li>{/each}</ul>
      </fieldset>
      <div class="knopfzeile">
        <button class="k haupt" type="button" onclick={angehakteAusfuehren} aria-disabled={laeuft || !gewaehlt.length ? 'true' : undefined}>{L('Angehakte ausführen', 'Run checked')}{gewaehlt.length ? ` (${gewaehlt.length})` : ''}</button>
        <button class="k leise" type="button" onclick={() => (angehakt = TEILE.map(x => x.text))}>{L('Alle anhaken', 'Check all')}</button>
        <button class="k leise" type="button" onclick={() => (angehakt = [])} aria-disabled={!gewaehlt.length ? 'true' : undefined}>{L('Keinen', 'None')}</button>
      </div>
    </details>
  {/if}
  {#if GRUPPEN.length}
    <section class="bausteine" aria-labelledby="bs-t"><h2 id="bs-t">{L('Bausteine', 'Building blocks')} <small>{d('mit den Spalten deiner Daten - anpassen, dann ausführen', 'mit den Spalten Ihrer Daten - anpassen, dann ausführen', 'filled with the columns of your data - adjust, then run')}</small></h2>
      {#each GRUPPEN as g (g.id)}
        <details class="auf"><summary>{g.titel} <small>{g.bausteine.length}</small></summary>
          <div class="reihe">{#each g.bausteine as b (b.id)}<button class="k leise" id="bs-k-{b.id}" type="button" data-tipp={b.syntax} aria-expanded={offen?.b.id === b.id} aria-controls={offen?.b.id === b.id ? 'bs-form' : undefined} onclick={() => oeffneBaustein(b)}>{b.titel}</button>{/each}</div>
          {#if offen && g.bausteine.some(b => b.id === offen!.b.id)}
            <div class="bs-form" transition:rutsch id="bs-form" role="group" aria-labelledby="bs-form-t">
              <h3 id="bs-form-t">{offen.b.titel}</h3>
              <div class="felder">
                {#each offen.b.felder as f (f.id)}
                  {#if f.mehrere}
                    <fieldset><legend>{f.titel}</legend><div class="kaesten">{#each f.optionen as o (o)}<label><input type="checkbox" checked={offen.werte[f.id]?.includes(o)} onchange={(e) => kreuze(f, o, e.currentTarget.checked)}>{mitBez(o)}</label>{/each}</div></fieldset>
                  {:else}
                    <div class="eingabe"><label for="bs-{f.id}">{f.titel}</label><select id="bs-{f.id}" value={offen.werte[f.id]?.[0]} onchange={(e) => (offen!.werte[f.id] = [e.currentTarget.value])}>{#each f.optionen as o (o)}<option value={o}>{mitBez(o)}</option>{/each}</select></div>
                  {/if}
                {/each}
              </div>
              {#if fehlt.length}<p class="hilfe" use:ergebnisAnsage>{fehlt.map(f => L(`„${f.titel}“: mindestens ${offen!.b.mindestens[f.id] ?? 1} Spalten anhaken.`, `"${f.titel}": check at least ${offen!.b.mindestens[f.id] ?? 1} columns.`)).join(' ')}</p>
              {:else}<pre class="befehl" aria-label={L('Vorschau', 'Preview')}>{vorschau}</pre>{/if}
              <div class="knopfzeile">
                <button class="k haupt" type="button" aria-disabled={fehlt.length ? 'true' : undefined} onclick={() => { if (!fehlt.length) { const v = vorschau; offen = null; einsetzen(v); } }}>{L('Einsetzen', 'Insert')}</button>
                <button class="k leise" type="button" onclick={schliesseBaustein}>{L('Abbrechen', 'Cancel')}</button>
              </div>
            </div>
          {/if}</details>
      {/each}
    </section>
  {/if}

  </div>
  <div class="bf-rechts">
  {#if befehle.laeufe.length}
    <div class="ausgaben-kopf"><span>{L('Ausgaben', 'Outputs')} <small>{befehle.laeufe.length}</small></span>
      <button class="k leise" type="button" onclick={() => (zu = alleZu ? [] : befehle.laeufe.map(l => l.id))}><Icon n={alleZu ? 'runter' : 'hoch'} />{alleZu ? L('Alle aufklappen', 'Expand all') : L('Alle zuklappen', 'Collapse all')}</button>
      <button class="k leise" type="button" onclick={alleLoeschen}><Icon n="zu" />{L('Alle löschen', 'Delete all')}</button></div>
    <p class="hilfe ausgaben-hinweis">{L('Jede Ausgabe mit Ergebnis bekommt von selbst einen eigenen Reiter („Befehl 1: …“, „Befehl 2: …“). Fehler und reine Datenänderungen bleiben nur hier; sie lassen sich mit „Als Auswertung übernehmen“ trotzdem als Reiter ablegen.', 'Every output with a result gets its own tab automatically ("Command 1: …", "Command 2: …"). Errors and pure data changes stay here only; you can still add them as a tab with "Add to Analysis".')}</p>
  {:else if geloescht.length}
    <div class="ausgaben-kopf"><button class="k leise" type="button" onclick={() => { befehle.laeufe = geloescht; geloescht = []; }}><Icon n="rueck" />{L(`Gelöschte Ausgaben zurückholen (${geloescht.length})`, `Bring back deleted outputs (${geloescht.length})`)}</button></div>
  {/if}
  {#each [...befehle.laeufe].reverse() as l (l.id)}
    <section class="lauf" aria-labelledby="lauf-{l.id}">
      <div class="lauf-kopf"><h2 id="lauf-{l.id}" tabindex="-1">{L('Ausgabe von', 'Output from')} {new Date(l.zeit).toLocaleTimeString(ort(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })} <small>{l.ms} ms</small></h2>
        <button class="k leise" type="button" aria-expanded={!zu.includes(l.id)} aria-controls="lauf-inhalt-{l.id}" onclick={() => klappe(l.id)}><Icon n={zu.includes(l.id) ? 'runter' : 'hoch'} />{zu.includes(l.id) ? L('Aufklappen', 'Expand') : L('Zuklappen', 'Collapse')}</button>
        {#if l.blattId && s.blaetter.some(b => b.id === l.blattId)}<a class="k leise" href="#blatt/{l.blattId}"><Icon n="blatt" />{L('Reiter öffnen', 'Open tab')}</a>
        {:else}<button class="k leise" type="button" onclick={() => insHeft(l)}><Icon n="blatt" />{L('Als Auswertung übernehmen', 'Add to Analysis')}</button>{/if}
        <button class="k leise" type="button" aria-disabled={ladeExcel.aktiv ? 'true' : undefined} onclick={() => { excelLauf = l.id; void ladeExcel.mit(() => exportiereErgebnisseExcel([{ titel: befehle.name || L('Befehle', 'Commands'), items: l.items }], befehle.name || L('Befehle', 'Commands'))); }}>{#if ladeExcel.sichtbar && excelLauf === l.id}<Rechnet imKnopf text={L('Wird geladen …', 'Loading …')} />{:else}<Icon n="download" />Excel{/if}</button></div>
      <div id="lauf-inhalt-{l.id}" class="zuklapp" class:zu={zu.includes(l.id)}><div class="zuklapp-innen">
      <details class="auf"><summary>{L('Befehl', 'Command')}</summary><pre class="befehl">{l.syntax}</pre></details>
      {#if l.angeglichen?.length}
        <div class="angeglichen" role="note"><p><b>{L('Für PSPP angepasst', 'Adjusted for PSPP')}</b> - {L('Diese Teile kommen aus SPSS und gibt es in PSPP nicht. Statable hat sie weggelassen oder umgeschrieben; die übrigen Zahlen ändert das nicht.', 'These parts come from SPSS and do not exist in PSPP. Statable has left them out or rewritten them; this does not change the other numbers.')}</p>
          <ul>{#each l.angeglichen as x, i (i)}<li>{L(`Zeile ${x.zeile + 1}`, `Line ${x.zeile + 1}`)} ({x.befehl}): {x.was} - {angleichText(x.grund)}</li>{/each}</ul></div>
      {/if}
      <Ausgabe items={l.items} stelle={(m) => stelle(l, m)} />
      {#if l.balken}<BalkenBlock yName={l.balken.y} gName={l.balken.g} name={(n) => n} fest={l.balken.quelle} />{/if}
      {#each l.regstreu ?? [] as r (r.x + '|' + r.y)}
        <DiagrammExport titel={L(`${r.y} und ${r.x} - Regressionsgerade`, `${r.y} and ${r.x} - regression line`)}><Streudiagramm punkte={r.punkte} xText={r.x} yText={r.y} /></DiagrammExport>
      {/each}
      {#if !l.items.some(i => i.type === 'table' || i.type === 'message')}<p style="color:var(--tinte-2)">{L('Ausgeführt. Dieser Befehl erzeugt keine Tabelle.', 'Done. This command produces no table.')}</p>{/if}
      </div></div>
    </section>
  {/each}
  </div></div>
</section></div>

<style>
  .einzeln { margin: 0 0 var(--a4); }
  .einzeln fieldset { border: 0; padding: 0; margin: 0; }
  .einzeln ul { list-style: none; padding-block: 0 var(--a2); padding-inline: var(--a4) 0; margin: 0; max-height: 20rem; overflow-y: auto; }
  .einzeln label { display: flex; align-items: center; gap: var(--a2); min-height: var(--ziel); cursor: pointer; border-radius: var(--r-klein); padding: 0 var(--a2); }
  .einzeln label:hover { background: var(--akzent-hell); }
  .einzeln input { width: 18px; height: 18px; accent-color: var(--akzent); margin: 0; flex: none; }
  .einzeln .zeile { color: var(--tinte-2); font-size: var(--gr-klein); min-width: 5.5em; flex: none; }
  .einzeln code { font: 400 var(--gr-klein)/1.4 var(--schrift-befehl); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .einzeln .knopfzeile { padding-inline-start: var(--a4); }
  .spalten { margin: var(--a2) 0 0; }
  .spalten summary small { font-weight: 400; color: var(--tinte-2); }
  .spalten .reihe { display: flex; flex-wrap: wrap; gap: var(--a1); padding-block: 6px var(--a2); padding-inline: var(--a4) 0; max-height: 12rem; overflow-y: auto; }
  .spalten .reihe .k { font: 400 var(--gr-klein)/1.2 var(--schrift-befehl); }
  .bs-form { margin-block: 0 var(--a3); margin-inline: var(--a4) 0; padding: var(--a3) var(--a4); border-radius: var(--r); background: var(--blatt-2); display: flex; flex-direction: column; gap: var(--a3); max-width: 46rem; }
  .bs-form h3 { font: 650 var(--gr-text)/1.3 var(--schrift-ui); margin: 0; }
  .bs-form .felder { display: flex; flex-wrap: wrap; gap: var(--a3); }
  .bs-form .felder .eingabe { flex: 1 1 14rem; }
  .bs-form fieldset { border: 0; padding: 0; margin: 0; flex: 1 1 100%; }
  .bs-form legend { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); padding: 0; margin-bottom: var(--a1); }
  .bs-form .kaesten { display: flex; flex-wrap: wrap; gap: 0 var(--a3); max-height: 10rem; overflow-y: auto; }
  .bs-form .kaesten label { display: flex; align-items: center; gap: var(--a2); min-height: var(--ziel); cursor: pointer; }
  .bs-form .kaesten input { width: 18px; height: 18px; accent-color: var(--akzent); margin: 0; }
  .bs-form pre.befehl { margin: 0; font: 400 var(--gr-klein)/1.5 var(--schrift-befehl); white-space: pre-wrap; background: var(--blatt); padding: var(--a2) var(--a3); border-radius: var(--r-klein); }
  .bs-form .hilfe { margin: 0; color: var(--hinweis); font-size: var(--gr-klein); }
  .ausgaben-kopf { display: flex; gap: var(--a2); align-items: center; flex-wrap: wrap; border-top: 1px solid var(--linie); padding-top: var(--a3); }
  .ausgaben-hinweis { margin: var(--a2) 0 var(--a3); }
  .ausgaben-kopf span { font-weight: 650; margin-inline-end: auto; }
  .ausgaben-kopf small { font-weight: 400; color: var(--tinte-2); }
  .bausteine { margin: 0 0 var(--a5); }
  .bausteine h2 { font: 650 var(--gr-text)/1.3 var(--schrift-ui); margin-bottom: var(--a1); }
  .bausteine h2 small, .bausteine summary small { font-weight: 400; color: var(--tinte-2); }
  .bausteine details.auf { padding: 0; }
  .bausteine .reihe { display: flex; flex-wrap: wrap; gap: var(--a1); padding-block: 0 var(--a2); padding-inline: var(--a4) 0; }
  .lauf { border-top: 1px solid var(--linie); padding-top: var(--a4); margin-top: var(--a4); }
  .lauf-kopf { display: flex; gap: var(--a2); align-items: center; flex-wrap: wrap; }
  .lauf-kopf h2 { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin-inline-end: auto; }
  .lauf-kopf small { font-weight: 400; color: var(--tinte-2); }
  .angeglichen { margin: var(--a2) 0; padding: var(--a2) var(--a3); border-inline-start: 3px solid var(--fokus); background: color-mix(in srgb, var(--fokus) 6%, transparent); font-size: var(--s-klein, .9rem); }
  .angeglichen ul { margin: var(--a1) 0 0; padding-inline-start: 1.2em; }
</style>
