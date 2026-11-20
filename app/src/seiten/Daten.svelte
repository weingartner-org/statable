<script lang="ts">
  import { istFehlend } from '../lib/fehlend';
  import { rutsch } from '../lib/rutsch';
  import { einmal } from '../lib/einmal';
  import { breitenZeilen } from '../lib/breitenzeilen';
  import { zeilenHoehe } from '../lib/groesse.svelte';
  import { rasterAbbildung, ersteZeile, obenFuerZeile } from '../lib/rasterhoehe';
  import { tick, onMount, untrack } from 'svelte';
  import { ohneBeiwerk } from '../lib/einlesen';
  import { s, d, L, Lp, melde, meldeFehler, sichern, aendereDaten, einstSpeichern, wenigBewegung, liesAlsTausender, liesAlsZahl, schliesseLesehinweis } from '../lib/sitzung.svelte';
  import { baueSpalte, leseEingabe, leseEinfuegen, type Wert, type NeueSpalte } from '../lib/eingabe';
  import { exportiereDatenSav } from '../lib/export';
  import { fundSchluessel, type Fund } from '../lib/datencheck';
  import { pruefAnzahl, rundgangSichtbar } from '../lib/rundgang';
  import { lesbar, istSondercode, type Spalte } from '../lib/verzeichnis';
  import { zahlDe } from '../lib/format';
  import { dez, zitat } from '../i18n/profil';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import HilfeLink from '../bausteine/HilfeLink.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import { exportiereDatenExcel, exportiereDatenCsv } from '../lib/export';
  import ExportMenue, { type ExportEintrag } from '../bausteine/ExportMenue.svelte';
  import { ASSISTENTEN, ASSISTENT_GRUPPEN } from '../lib/datenassistenten';
  import RandSchalter from '../bausteine/RandSchalter.svelte';
  import FachFrage from '../bausteine/FachFrage.svelte';
  import { gewichtPruefung, gewichtVorschlag, oeffneGewichtDialog } from '../lib/fallgewicht.svelte';
  import { sperrSatz } from '../lib/gewichte';
  import { frageVorschlag } from '../lib/beispielvorschlag.svelte';
  import { wuensche } from '../lib/ausreisserwunsch.svelte';
  import DatenDiagramm from '../bausteine/DatenDiagramm.svelte';
  import DatenSuchen from '../bausteine/DatenSuchen.svelte';
  import DatenLesemodus from '../bausteine/DatenLesemodus.svelte';
  import { lesemodus, setzeLesemodus, ALLES_BIS_ZELLEN } from '../lib/lesemodus.svelte';
  import { seiteVonZeile } from '../lib/datenseiten';
  import { fundTitel as titel, fundZeileNr as nr, fundSatz, erledigeFund as erledige, lasseFund as lasse } from '../lib/datencheckaktion';

  /** Höhe einer Tabellenzeile in px - muss zu `table.raster td` (height 30 px, Linie eingerechnet) passen, sonst springt das Scrollen. Gemessen 07.10.: 30. */
  /** Zeilenhöhe in px - wächst mit der Größe (− / + im Kopf), gleich wie `--zeile` in app.css. */
  const ZEILE = $derived(zeilenHoehe());
  /** Daten-Check als Blatt von unten (nur in schmalen oder stark vergrößerten Fenstern, sonst steht er als Seitenleiste daneben). */
  let checkAuf = $state(false);
  /** Spaltenköpfe: der Knopf in der Ecke links oben wechselt Name → Bezeichnung → senkrecht. */
  const KOEPFE = ['name', 'lang', 'senkrecht'] as const;
  const koepfeText = (k: string) => k === 'name' ? L('Namen', 'Names') : k === 'lang' ? L('Bezeichnungen', 'Labels') : L('Bezeichnungen senkrecht', 'Labels, vertical');
  const koepfeNaechste = $derived(KOEPFE[(KOEPFE.indexOf(s.einst.koepfe) + 1) % KOEPFE.length]!);
  let huelle = $state<HTMLDivElement>();
  let oben = $state(0);
  let hoehe = $state(600);
  /** Bei sehr vielen Zeilen ist der Platzhalter höher, als ein Element werden darf (lib/rasterhoehe.ts): dann klebt die Tabelle oben und der Bildlauf wird auf die Zeilen umgerechnet. */
  const abb = $derived(rasterAbbildung(s.zeilen.length, ZEILE, hoehe));
  let bearbeiten = $state(location.hash.includes('bearbeiten'));
  /** Kleine und mittlere Tabellen stehen ganz als echte Tabelle da (Johannes 08.11.: kein Lesemodus nötig): Screenreader und Braillezeile lesen alle Zeilen, Strg+Alt+Pfeile, Bild ab und „Gehe zu“ gehen von selbst. Nur große Tabellen (und das Eingeben mit je einem Feld je Zelle) bleiben virtuell. */
  const alles = $derived(!bearbeiten && s.zeilen.length * s.spalten.length <= ALLES_BIS_ZELLEN);
  const start = $derived(alles ? 0 : abb.skaliert ? ersteZeile(oben, abb) : Math.max(0, Math.floor(oben / ZEILE) - 10));
  const ende = $derived(alles ? s.zeilen.length : Math.min(s.zeilen.length, start + Math.ceil(hoehe / ZEILE) + (abb.skaliert ? 2 : 20)));
  let blitz = $state(-1);
  /** Lesemodus (Seiten zu 50 Zeilen als echte Tabelle): aktuelle Seite (ab 0) und der Baustein, damit „Zeigen“ und die Suche dorthin springen können. */
  let lesePage = $state(0);
  let lese = $state<{ geheZuZeile: (r: number, i?: number | null) => Promise<boolean> }>();

  const offen = $derived(s.funde.filter(f => !s.entscheid[fundSchluessel(f)]));
  const fundZellen = $derived.by(() => {
    const m = new Set<string>();
    for (const f of offen) {
      if (f.art === 'ausreisser') m.add(`${f.zeile}:${f.spalte}`);
      else if (f.art !== 'leer') for (const z of f.zeilen) m.add(`${z}:${f.spalte}`);
    }
    return m;
  });
  const erledigt = $derived(Object.entries(s.entscheid));
  /** Funde und Lesehinweise (was beim Einlesen gedeutet wurde) zusammen */
  const anzahl = $derived(pruefAnzahl(s.funde, s.entscheid, s.lesehinweise.length, fundSchluessel));
  /** „Als Tausender lesen“ liest die Datei neu ein - nur, solange an den Daten nichts geändert wurde: kein Blatt und im Verlauf nur Schritte des Einlesens
   *  (nach „Rückgängig“ gilt das wieder, N2; `ungesichert` allein sagt nur, dass noch nicht in eine Datei gespeichert wurde). */
  const kannNeuLesen = $derived(!s.blaetter.length && s.verlauf.every(x => x.lese));




  /** Vom Daten-Check zum Ausreißertest (Welle S-D, T2): die Frage „Wie verteilt sich etwas?“ mit dieser Spalte; „Ausreißer prüfen“ ist dort gleich an. */
  function pruefeMitTest(spalte: string) {
    frageVorschlag.v = { art: 'verteilung', w: { l1: [spalte], l2: [], l3: [], l4: [] } };
    wuensche(spalte);
    location.hash = 'blatt/neu';
  }
  function zeige(zeile: number) {
    if (lesen) { blitz = zeile; setTimeout(() => (blitz = -1), 1700); void lese?.geheZuZeile(zeile); return; }
    huelle?.scrollTo({ top: obenFuerZeile(zeile - hoehe / (2 * ZEILE), abb), behavior: wenigBewegung() ? 'auto' : 'smooth' });
    blitz = zeile; setTimeout(() => (blitz = -1), 1700);
  }
  /** Lesemodus ein- und ausschalten; beim Einschalten die Seite der gerade sichtbaren Zeile, beim Eingeben ist er aus. */
  function wechsleLesemodus() {
    const wirdAn = bearbeiten ? true : !lesemodus.an;
    if (wirdAn) { lesePage = seiteVonZeile(start); bearbeiten = false; }
    setzeLesemodus(wirdAn);
  }
  /** „Gehe zu Zeile“ und Treffer der Suche: springt sofort zur Zeile, lässt sie aufblitzen und setzt den Fokus darauf (beim Eingeben auf die erste Zelle der Zeile). */
  async function geheZu(r: number, i?: number | null) {
    if (lesen) { if (r >= 0 && r < s.zeilen.length) { blitz = r; setTimeout(() => (blitz = -1), 1700); await lese?.geheZuZeile(r, i); } return; }
    if (!huelle || r < 0 || r >= s.zeilen.length) return;
    huelle.scrollTop = obenFuerZeile(r - hoehe / (2 * ZEILE), abb);
    blitz = r; setTimeout(() => (blitz = -1), 1700);
    await tick(); await new Promise(x => setTimeout(x, 30));
    if (bearbeiten) { const el = document.getElementById(`z-${r}-${i ?? 0}`) as HTMLInputElement | null; el?.focus({ preventScroll: true }); el?.select(); el?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    else { const el = document.getElementById(i != null ? `dc-${r}-${i}` : `dz-${r}`); el?.focus({ preventScroll: true }); if (i != null) el?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  /** Spaltenbreiten aus allen Zeilen (genau bei bis zu 300 verschiedenen Werten, sonst aus den Zeilen mit den Extremwerten und einer Stichprobe, lib/breitenzeilen.ts), nicht nur aus den gerade gezeichneten - sonst springt die Tabelle beim Scrollen,
   *  sobald eine breitere Zeile ins Bild kommt (Johannes 07.10.: „soll sich nach der breitesten Spalte ausrichten“). */
  let schriftDa = $state(0);
  onMount(() => { document.fonts?.ready.then(() => schriftDa++); });
  let messer: CanvasRenderingContext2D | null = null;
  /** Ziffern stehen in der Tabelle mit fester Breite (tabular-nums) - darum jede Ziffer als „0“ messen, die breiteste. */
  const breiten = $derived.by(() => {
    void schriftDa;
    messer ??= document.createElement('canvas').getContext('2d');
    if (!messer) return [] as number[];
    const st = getComputedStyle(document.body);
    messer.font = `400 ${st.fontSize} ${st.fontFamily}`;
    const lang = s.einst.koepfe === 'lang', senk = s.einst.koepfe === 'senkrecht';
    const px = parseFloat(st.fontSize) || 16, zeile = Math.ceil(px * 1.25);
    return s.spalten.map((sp, i) => {
      const schon = new Map<string, number>(); let m = 0;
      for (const r of einmal(s.zeilen, `breitenzeilen|${i}`, () => breitenZeilen(s.zeilen, i))) { const tx = zelle(s.zeilen[r]![i] ?? null, i).t.replace(/\d/g, '0'); let w = schon.get(tx); if (w === undefined) { w = messer!.measureText(tx).width; schon.set(tx, w); } if (w > m) m = w; }
      const daten = Math.ceil(m) + 20;  // + Innenabstand links und rechts (2 × 8 px), Linie, Rundung
      if (senk) return Math.max(daten, 3 * zeile + 16);  // senkrecht: mindestens drei Zeilen Platz, bei breiteren Daten mehr
      if (!lang) return daten;
      // Kompromiss (Johannes 08.10.): Bezeichnungen sollen nicht in schmalen Spalten zu hohen Türmen werden. Die Spalte wird so breit,
      // dass die Bezeichnung in etwa drei Zeilen passt (nicht breiter als 200 px) - die Daten bestimmen nur die Untergrenze.
      messer!.font = `650 ${st.fontSize} ${st.fontFamily}`;
      const kopf = messer!.measureText(kopfText(sp)).width;
      messer!.font = `400 ${px * 0.85}px ${st.fontFamily}`;
      const klein = messer!.measureText(`${sp.bezeichnung ? sp.name + ' · ' : ''}${artText(i)}`).width;
      messer!.font = `400 ${st.fontSize} ${st.fontFamily}`;
      const kopfBreite = Math.ceil(Math.max(klein, Math.min(kopf, Math.max(kopf / 2.4 + 16, 110)))) + 20;
      return Math.max(daten, Math.min(kopfBreite, 200));
    });
  });
  /** Senkrechte Köpfe so kurz wie möglich: die Länge wird gesucht, bei der die Bezeichnung gerade noch in die erlaubten Zeilen passt
   *  (mindestens drei, bei breiteren Daten mehr) - die Zelle ist nie höher als nötig. */
  function senkrecht(node: HTMLElement, p: { breite: number; stand: number }) {
    const voll = node.textContent ?? '';
    function passe(q: { breite: number }) {
      const st = getComputedStyle(node), z = parseFloat(st.lineHeight) || 20;
      const maxBreite = Math.max(3, Math.floor((q.breite - 16) / z)) * z + 1;  // mindestens drei Zeilen Platz, bei breiteren Daten mehr
      const deckel = Math.round(z * 12);                                                      // und nicht höher als zwölf Zeilenhöhen
      const passt = (h: number) => { node.style.height = `${h}px`; return node.offsetWidth <= maxBreite && node.scrollHeight <= h + 1; };
      node.textContent = voll;
      if (!passt(deckel)) {                                                                   // zu lang: kürzen, der Hinweis zeigt alles
        let n = voll.length;
        while (n > 8 && !passt(deckel)) { n -= 4; node.textContent = voll.slice(0, n).trimEnd() + ' …'; }
      }
      let lo = 20, hi = deckel;
      while (hi - lo > 3) { const mitte = Math.floor((lo + hi) / 2); if (passt(mitte)) hi = mitte; else lo = mitte; }
      node.style.height = `${hi + 4}px`;
    }
    passe(p);
    return { update: passe };
  }
  /** Kopftext: die ganze Bezeichnung (erst ab 120 Zeichen gekürzt) - in den Köpfen ist Platz, der Hinweis zeigt sie ganz. */
  const herkunft = $derived(`${L('Original', 'Original')}: ${s.projekt?.quelle} · ${L('wird nie verändert', 'never changed')}`);
  const kopfText = (sp: Spalte) => { const b = lesbar(sp); return b.length > 120 ? b.slice(0, 118).trimEnd() + ' …' : b; };
  const breiteNr = $derived.by(() => { void schriftDa; void breiten; return messer ? Math.max(40, Math.ceil(messer.measureText(String(s.zeilen.length).replace(/\d/g, '0')).width) + 20) : 40; });
  function zelle(v: string | number | null, i: number): { t: string; k: string } {
    const sp = s.spalten[i]!;
    if (v === null) return { t: L('leer', 'blank'), k: 'leer' };
    if (typeof v === 'number') {
      if (istFehlend(sp, v)) return { t: istSondercode(sp, v) ? `${Object.entries(sp.werteLabels).find(([w]) => Number(w) === v)?.[1] ?? '.'} · ${L('fehlend', 'missing')}` : `${zahlDe(v)} · ${L('keine Angabe', 'no answer')}`, k: 'zahl ka' };
      const lbl = sp.werteLabels[String(v)];
      return { t: lbl ? `${zahlDe(v)} ${lbl}` : zahlDe(v), k: 'zahl' };
    }
    return { t: v, k: '' };
  }
  /* ---------- Bearbeiten ---------- */
  /** Lesemodus gilt nur, solange nicht eingegeben wird (Eingeben braucht die Eingabefelder der normalen Tabelle). */
  const lesen = $derived(lesemodus.an && !bearbeiten && !alles);
  /** Von der Befehlspalette verlangt: Eingeben beenden und die Seite der sichtbaren Zeile zeigen. */
  $effect(() => { if (lesemodus.anfrage > 0) untrack(() => { bearbeiten = false; lesePage = seiteVonZeile(start); if (alles) melde(L('Diese Tabelle ist klein genug: Sie steht komplett da, ein Lesemodus ist nicht nötig.', 'This table is small enough: it is shown completely, no reading mode is needed.')); }); });
  $effect(() => { if (location.hash.includes('bearbeiten')) { history.replaceState(null, '', '#daten'); setTimeout(() => fokus(0, 0), 200); } });
  let kette: Promise<unknown> = Promise.resolve();
  /** Noch nicht übernommene Werte je Zelle - Eingabe-Taste und Verlassen des Felds melden denselben Wert zweimal. */
  const wartend = new Map<string, Wert>();
  /** Zelle, deren Eingabe abgelehnt wurde (`aria-invalid` mit Grund, bis die nächste Eingabe kommt). */
  let ungueltig = $state<{ k: string; grund: string } | null>(null);
  /** Änderungen laufen nacheinander und setzen immer auf dem neuesten Stand auf. */
  const nacheinander = (f: () => Promise<unknown>) => (kette = kette.then(f, f));
  /** Was im Eingabefeld steht: bei Gruppen der Name („Förderung"), sonst die Zahl mit dem gewählten Dezimalzeichen. */
  const roh = (v: Wert, i = -1) => {
    if (v === null) return '';
    if (typeof v !== 'number') return v;
    const lbl = i >= 0 ? s.spalten[i]?.werteLabels[String(v)] : undefined;
    return lbl ?? dez(String(v));
  };
  const kopie = () => s.zeilen.map(z => [...z]) as Wert[][];
  const spaltenKopie = () => $state.snapshot(s.spalten);

  /** Gibt `false` zurück, wenn die Eingabe abgelehnt wurde (der Fokus bleibt dann in der Zelle, damit der Grund dort angesagt wird). */
  function setze(r: number, i: number, el: HTMLInputElement): boolean {
    const sp = s.spalten[i]!; let ein = el.value;
    // Bei Gruppen mit Zahlen darf man auch den Namen tippen: „ja" statt 1.
    if (sp.art === 'zahl') { const k = Object.entries(sp.werteLabels).find(([, l]) => l.toLowerCase() === ein.trim().toLowerCase()); if (k) ein = k[0]; }
    const r2 = leseEingabe(sp, ein);
    if ('fehler' in r2) { ungueltig = { k: `${r}:${i}`, grund: r2.fehler }; meldeFehler(r2.fehler); el.value = roh(s.zeilen[r]?.[i] ?? null, i); tick().then(() => el.focus()); return false; }
    const k = `${r}:${i}`;
    if (ungueltig?.k === k) ungueltig = null;
    if (wartend.has(k) ? wartend.get(k) === r2.wert : (s.zeilen[r]?.[i] ?? null) === r2.wert) return true;
    wartend.set(k, r2.wert);
    nacheinander(async () => { const z = kopie(); if (z[r]) { z[r]![i] = r2.wert; await aendereDaten(L(`Zeile ${r + 1}, ${kopfText(sp)} geändert`, `Row ${r + 1}, ${kopfText(sp)} changed`), spaltenKopie(), z, true, { art: 'zelle' }); } wartend.delete(k); });
    return true;
  }
  /** Einfügen aus Excel (D3): mehrere Zellen werden ab dieser Zelle auf Zeilen und Spalten verteilt; ein einzelner Wert wird vom Feld selbst eingefügt. */
  function einfuegen(e: ClipboardEvent, r: number, i: number) {
    const roh = e.clipboardData?.getData('text/plain') ?? '';
    if (!/[\n\r\t]/.test(roh)) return;
    const res = leseEinfuegen(s.spalten, s.zeilen as Wert[][], roh, { zeile: r, spalte: i });
    if (!res) return;
    e.preventDefault();
    if ('fehler' in res) { meldeFehler(res.fehler); return; }
    nacheinander(async () => { await aendereDaten(Lp(res.anzahl, `${res.anzahl} Wert eingefügt`, `${res.anzahl} Werte eingefügt`, `${res.anzahl} value pasted`, `${res.anzahl} values pasted`), spaltenKopie(), res.zeilen, false, { art: 'einfuegen' }); });
  }
  async function fokus(r: number, i: number) {
    if (huelle && (abb.skaliert ? (r < start || r + 1 > start + (hoehe - 60) / ZEILE) : (r * ZEILE < oben || (r + 1) * ZEILE > oben + hoehe - 60))) huelle.scrollTop = obenFuerZeile(r - hoehe / (2 * ZEILE), abb);
    await tick(); await new Promise(r => setTimeout(r, 0));
    const el = document.getElementById(`z-${r}-${i}`) as HTMLInputElement | null; el?.focus(); el?.select();
  }
  /** Tasten, die kommen, während nach der Eingabe-Taste die neue Zeile entsteht - sie gehören schon in die neue(n) Zeile(n). Je Eingabe-Taste ein neuer Eintrag. */
  let vorlauf: string[] | null = null;
  function taste(e: KeyboardEvent, r: number, i: number) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (vorlauf !== null) { if (e.key === 'Enter') { vorlauf.push(''); e.preventDefault(); } return; }
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault(); if (!setze(r, i, e.currentTarget as HTMLInputElement)) return;
      if (r + 1 < s.zeilen.length) fokus(r + 1, i); else if (e.key === 'Enter') { vorlauf = ['']; zeileDazu(i); }
    } else if (e.key === 'ArrowUp' && r > 0) { e.preventDefault(); if (!setze(r, i, e.currentTarget as HTMLInputElement)) return; fokus(r - 1, i); }
    else if (e.key === 'Escape') { (e.currentTarget as HTMLInputElement).value = roh(s.zeilen[r]?.[i] ?? null, i); }
  }
  /** Zeichen landen über `beforeinput` im Vorlauf - so kommen auch eingefügter Text und Bildschirm-Tastaturen mit. */
  function vorEingabe(e: InputEvent) {
    if (vorlauf === null) return;
    e.preventDefault();
    const i = vorlauf.length - 1;
    if (e.inputType.startsWith('insert') && e.data) vorlauf[i] += e.data;
    else if (e.inputType === 'deleteContentBackward') vorlauf[i] = vorlauf[i]!.slice(0, -1);
  }
  function zeileDazu(spalte = 0) {
    nacheinander(async () => {
      const z = kopie(); z.push(s.spalten.map(() => null));
      if (await aendereDaten(L('Zeile angefügt', 'Row added'), spaltenKopie(), z, true, { art: 'zeilePlus' })) {
        await fokus(z.length - 1, spalte);
        const el = document.getElementById(`z-${z.length - 1}-${spalte}`) as HTMLInputElement | null;
        const [jetzt = '', ...rest] = vorlauf ?? [];
        vorlauf = null;
        // Wie getippt einfügen, damit das Verlassen des Felds den Wert übernimmt (ein per Code gesetzter Wert löst kein `change` aus).
        if (el && jetzt && !document.execCommand('insertText', false, jetzt)) el.value = jetzt;
        // Schon wieder die Eingabe-Taste gedrückt: Wert übernehmen und die nächste Zeile anlegen.
        if (el && rest.length) { vorlauf = rest; setze(z.length - 1, spalte, el); zeileDazu(spalte); return; }
      }
      vorlauf = null;
    });
  }
  function zeileWeg(r: number) {
    nacheinander(async () => { const z = kopie(); z.splice(r, 1); await aendereDaten(L(`Zeile ${r + 1} gelöscht`, `Row ${r + 1} deleted`), spaltenKopie(), z, false, { art: 'zeileWeg' }); });
  }
  let neueSpalte = $state<NeueSpalte & { offen: boolean; gruppenArt: boolean }>({ offen: false, bezeichnung: '', art: 'zahl', gruppen: '', gruppenArt: false });
  function spalteDazu(ev: SubmitEvent) {
    ev.preventDefault();
    const n = neueSpalte; if (!n.bezeichnung.trim()) { melde(L('Bitte einen Namen für die Spalte eingeben.', 'Please enter a name for the column.')); return; }
    nacheinander(async () => {
      const sp = baueSpalte({ bezeichnung: n.bezeichnung, art: n.art, gruppen: n.gruppenArt ? n.gruppen : '' }, s.spalten.map(x => x.name));
      if (await aendereDaten(L(`Spalte „${n.bezeichnung.trim()}“ angefügt`, `Column "${n.bezeichnung.trim()}" added`), [...spaltenKopie(), sp], kopie().map(z => [...z, null]), false, { art: 'spaltePlus' })) {
        neueSpalte = { offen: false, bezeichnung: '', art: 'zahl', gruppen: '', gruppenArt: false }; fokus(0, s.spalten.length - 1);
      }
    });
  }

  /** Das Fallgewicht (Fachblatt S-A, 1.4): die Spalte trägt ein Zeichen im Kopf, Zeilen, die nicht mitzählen (Gewicht 0 oder fehlend), sind grau und gekennzeichnet. */
  const gw = $derived(gewichtPruefung());
  const gewichtsSpalte = (i: number) => !!s.gewicht && s.spalten[i]!.name.toLowerCase() === s.gewicht.spalte.toLowerCase();
  const nullZeile = (r: number) => !!gw && !gw.fehler && gw.w[r] === 0;
  let vorschlagWeg = $state<string | null>(null);
  /** Diagramm direkt aus den Daten (bausteine/DatenDiagramm.svelte). */
  let diagrammAuf = $state(false);
  const vorschlag = $derived(gewichtVorschlag());
  const artText = (i: number) => { const sp = s.spalten[i]!; const a = sp.art === 'datum' ? L('Datum', 'Date') : sp.art === 'text' ? L('Gruppen/Text', 'Groups/text') : Object.keys(sp.werteLabels).length ? L('Gruppen (Zahlen)', 'Groups (numbers)') : L('Zahl', 'Number'); return gewichtsSpalte(i) ? L(`${a} · Fallgewicht`, `${a} · case weight`) : a; };

  /** Menü „Daten bearbeiten“: gruppiert statt einer langen Liste (Johannes 08.11.: übersichtlich, nie doppelt). */
  const bearbeitenEintraege = $derived.by((): ExportEintrag[] => {
    const ein = (id: string, text: string, icon: string, tun: () => void, gruppe: string, an?: boolean): ExportEintrag => ({ id, text, icon, tun, gruppe, ...(an === undefined ? {} : { an }) });
    const zeilen: ExportEintrag[] = [
      ein('eingeben', L('Zellen direkt eingeben und ändern', 'Enter and change cells directly'), 'bearbeiten', () => { bearbeiten = !bearbeiten; if (bearbeiten) fokus(0, 0); }, L('Zellen', 'Cells'), bearbeiten),
      ein('gewicht', s.gewicht ? L(`Fallgewicht ${s.gewicht.spalte}: ändern oder ausschalten`, `Case weight ${s.gewicht.spalte}: change or switch off`) : L('Fallgewicht setzen', 'Set a case weight'), 'regler', () => oeffneGewichtDialog(), L('Eigenschaften der Daten', 'Properties of the data'))
    ];
    for (const g of ASSISTENT_GRUPPEN) {
      if (g.id === 'tabelle') zeilen.push(ein('umformen', L('Umstrukturieren (breit ↔ lang)', 'Reshape (wide ↔ long)'), 'umformen', () => { location.hash = 'umformen'; }, g.name()));
      for (const id of g.ids) { const a = ASSISTENTEN.find(x => x.id === id); if (a) zeilen.push(ein(a.id, a.name(), a.icon, () => { location.hash = `bearbeiten/${a.id}`; }, g.name())); }
    }
    return zeilen;
  });
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && checkAuf) { checkAuf = false; e.preventDefault(); } }} />
{#if s.spalten.length}<DatenDiagramm bind:offen={diagrammAuf} />{/if}
<div class="tisch breit">
  <section class="blatt" aria-labelledby="daten-t">
    <SeitenKopf dicht titelId="daten-t" titelTipp={herkunft} titel={s.projekt?.name ?? ''} hilfe={{ id: 'daten-seite', text: L('Hilfe zur Datenseite', 'Help on the data page') }}>
      {#snippet mitte()}
      <span class="daten-masse" data-tipp={herkunft}>{Lp(s.zeilen.length, `${s.zeilen.length} Zeile`, `${s.zeilen.length} Zeilen`, `${s.zeilen.length} row`, `${s.zeilen.length} rows`)} · {Lp(s.spalten.length, `${s.spalten.length} Spalte`, `${s.spalten.length} Spalten`, `${s.spalten.length} column`, `${s.spalten.length} columns`)}</span>
      <nav class="ansicht" aria-label={L('Ansicht der Daten', 'View of the data')}><span class="ansicht-an" aria-current="page">{L('Daten', 'Data')}</span><a href="#spalten" data-tipp={L('Spalten beschreiben: Namen, Gruppen, Messniveau', 'Describe columns: names, groups, level of measurement')}>{L('Spalten', 'Columns')}</a></nav>
      {/snippet}
      {#snippet aktionen()}
      <ExportMenue name={L('Daten bearbeiten', 'Edit data')} art="" symbol="bearbeiten" beschriftung={L('Daten bearbeiten', 'Edit data')} tipp={L('Zellen eingeben, umkodieren, berechnen, Fälle auswählen, Tabelle umbauen, Fallgewicht', 'Enter cells, recode, calculate, select cases, rebuild the table, case weight')}
        eintraege={bearbeitenEintraege} />
      <button class="k" type="button" aria-haspopup="dialog" data-tipp={L('Diagramm aus einer oder zwei Spalten zeichnen', 'Draw a chart from one or two columns')} onclick={() => (diagrammAuf = true)}><Icon n="diagramm" />{L('Diagramm', 'Chart')}</button>
      <ExportMenue name={L('Daten exportieren', 'Export data')} beschriftung={L('Export', 'Export')} tipp={L('Daten speichern als Excel, SPSS oder CSV', 'Save the data as Excel, SPSS or CSV')} eintraege={[
        { id: 'xlsx', text: L('Excel (.xlsx)', 'Excel (.xlsx)'), tun: () => exportiereDatenExcel() },
        { id: 'sav', text: L('SPSS (.sav)', 'SPSS (.sav)'), tun: () => exportiereDatenSav() },
        { id: 'csv-codes', text: L('CSV mit Codes (1, 2, 3 …)', 'CSV with codes (1, 2, 3 …)'), tun: () => exportiereDatenCsv(false) },
        { id: 'csv-text', text: L('CSV mit Beschriftungen (weiblich, männlich …)', 'CSV with labels (female, male …)'), tun: () => exportiereDatenCsv(true) }]} />
      {#if !alles}<button class="k" type="button" aria-pressed={lesen} data-tipp={L('Lesemodus: die Tabelle in Seiten zu 50 Zeilen zeigen, gut für Screenreader und Braillezeile', 'Reading mode: show the table in pages of 50 rows, good for screen readers and braille displays')} onclick={wechsleLesemodus}>{L('Lesemodus', 'Reading mode')}</button>{/if}
      {#if bearbeiten}<button class="k haupt" type="button" onclick={() => (bearbeiten = false)}><Icon n="stift" />{L('Fertig', 'Done')}</button>{/if}
      {/snippet}
    </SeitenKopf>
    {#if s.zeilen.length}<DatenSuchen {geheZu} />{/if}
    {#if !rundgangSichtbar(s.einst, s.rundgangOffen)}<FachFrage />{/if}
    {#if vorschlag && vorschlagWeg !== vorschlag.name}
      <p class="gw-vorschlag" role="note">{L(`Die Spalte ${vorschlag.name} sieht nach einem Fallgewicht aus.`, `The column ${vorschlag.name} looks like a case weight.`)}
        <button class="k" type="button" onclick={() => oeffneGewichtDialog(vorschlag.name)}>{L('Als Fallgewicht verwenden …', 'Use as case weight …')}</button>
        <button class="k leise" type="button" onclick={() => (vorschlagWeg = vorschlag.name)}>{L('Nein, danke', 'No, thanks')}</button></p>
    {/if}
    {#if lesen}
      <DatenLesemodus bind:this={lese} bind:seite={lesePage} zelle={zelle} {fundZellen} {blitz} />
    {:else}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich muss per Tastatur erreichbar sein, WCAG 2.1.1) -->
    <div class="raster-huelle" bind:this={huelle} bind:clientHeight={hoehe} onscroll={(e) => (oben = (e.currentTarget as HTMLElement).scrollTop)} tabindex="0" role="region" id="daten-region" aria-label={Lp(s.zeilen.length, `Datentabelle, ${s.zeilen.length} Zeile`, `Datentabelle, ${s.zeilen.length} Zeilen`, `Data table, ${s.zeilen.length} row`, `Data table, ${s.zeilen.length} rows`)}>
      <div class="raster-hoch" style={abb.skaliert ? `height:${abb.gesamt}px` : undefined}>
      <table class="raster koepfe-{s.einst.koepfe}" aria-labelledby="daten-region" aria-colcount={s.spalten.length + 1} class:raster-klebt={abb.skaliert} aria-rowcount={s.zeilen.length + 1} style={s.einst.koepfe === 'lang' || s.einst.koepfe === 'senkrecht' ? `width:${breiteNr + breiten.reduce((a, b) => a + b, 0)}px` : undefined}>
        <colgroup><col style="width:{breiteNr}px">{#each breiten as b, i (i)}<col style="width:{b}px">{/each}</colgroup>
        <thead><tr aria-rowindex={1}><th scope="col" class="ecke"><button class="ecke-k" type="button" onclick={() => { s.einst.koepfe = koepfeNaechste; einstSpeichern(); }}
            aria-label={L(`Zeile. Spaltenköpfe: ${koepfeText(s.einst.koepfe)} - wechseln zu ${koepfeText(koepfeNaechste)}`, `Row. Column headers: ${koepfeText(s.einst.koepfe)} - switch to ${koepfeText(koepfeNaechste)}`)}
            data-tipp={L(`Spaltenköpfe: ${koepfeText(s.einst.koepfe)}. Klicken: ${koepfeText(koepfeNaechste)}`, `Column headers: ${koepfeText(s.einst.koepfe)}. Click: ${koepfeText(koepfeNaechste)}`)}><Icon n={s.einst.koepfe === 'senkrecht' ? 'kopf-senkrecht' : s.einst.koepfe === 'lang' ? 'kopf-lang' : 'kopf-name'} /></button></th>{#each s.spalten as sp, i}<th scope="col" class:gw-spalte={gewichtsSpalte(i)} data-tipp={`${lesbar(sp)}${sp.bezeichnung ? ` (${sp.name})` : ''} · ${artText(i)}`}>{#if s.einst.koepfe === 'name'}{sp.name}{#if gewichtsSpalte(i)}<span class="gw-punkt" role="img" aria-label={L('Fallgewicht', 'Case weight')}>w</span>{/if}<span class="nur-vorleser"> {`${lesbar(sp)}${sp.bezeichnung ? ` (${sp.name})` : ''} · ${artText(i)}`}</span>{:else if s.einst.koepfe === 'senkrecht'}<span class="senk" aria-hidden="true" use:senkrecht={{ breite: breiten[i] ?? 80, stand: schriftDa }}>{kopfText(sp)}</span><span class="nur-vorleser">{`${lesbar(sp)}${sp.bezeichnung ? ` (${sp.name})` : ''} · ${artText(i)}`}</span>{:else}<span class="kopf-in"><span class="kopf-text">{kopfText(sp)}</span>{' '}<small>{sp.bezeichnung ? sp.name + ' · ' : ''}{artText(i)}</small></span>{/if}</th>{/each}</tr></thead>
        <tbody>
          {#if start > 0 && !abb.skaliert}<tr style="height:{start * ZEILE}px" aria-hidden="true"></tr>{/if}
          {#each s.zeilen.slice(start, ende) as z, j (start + j)}
            {@const r = start + j}
            <tr class:blitz={blitz === r} class:gw-null={nullZeile(r)} aria-rowindex={r + 2}><th scope="row" id="dz-{r}" tabindex="-1">{r + 1}{#if nullZeile(r)}<span class="gw-null-zeichen" data-tipp={L('Zählt nicht mit: Das Fallgewicht ist 0 oder fehlt', 'Not counted: the case weight is 0 or missing')}>∅</span><span class="nur-vorleser">{L('zählt nicht mit (Fallgewicht 0 oder fehlend)', 'not counted (case weight 0 or missing)')}</span>{/if}{#if bearbeiten}<button class="zeile-weg" type="button" aria-label={L(`Zeile ${r + 1} löschen`, `Delete row ${r + 1}`)} onclick={() => zeileWeg(r)}><Icon n="x" /></button>{/if}</th>
              {#if bearbeiten}
                {#each z as v, i}<td class="ein{s.spalten[i]!.art === 'zahl' ? ' zahl' : ''}"><input id="z-{r}-{i}" class="zelle-ein" value={roh(v, i)} aria-invalid={ungueltig?.k === `${r}:${i}` ? 'true' : undefined} aria-describedby={ungueltig?.k === `${r}:${i}` ? 'z-fehler' : undefined} oninput={() => { if (ungueltig?.k === `${r}:${i}`) ungueltig = null; }} autocomplete="off" spellcheck="false" inputmode={s.spalten[i]!.art === 'zahl' && !Object.keys(s.spalten[i]!.werteLabels).length ? 'decimal' : undefined} aria-label={L(`${lesbar(s.spalten[i], true)}, Zeile ${r + 1}`, `${lesbar(s.spalten[i], true)}, row ${r + 1}`)} onchange={(e) => setze(r, i, e.currentTarget)} onkeydown={(e) => taste(e, r, i)} onbeforeinput={vorEingabe} onpaste={(e) => einfuegen(e, r, i)} onfocus={(e) => (e.currentTarget.dataset.stand = e.currentTarget.value)}></td>{/each}
              {:else}
                {#each z as v, i}{@const c = zelle(v, i)}<td id="dc-{r}-{i}" tabindex="-1" class="{c.k}{fundZellen.has(`${r}:${s.spalten[i]!.name}`) ? ' fund' : ''}">{c.t}</td>{/each}
              {/if}</tr>
          {/each}
          {#if ende < s.zeilen.length && !abb.skaliert}<tr style="height:{(s.zeilen.length - ende) * ZEILE}px" aria-hidden="true"></tr>{/if}
        </tbody>
      </table>
      </div>
    </div>
    {/if}
    {#if bearbeiten}
      <span id="z-fehler" class="nur-vorleser">{ungueltig?.grund ?? ''}</span>
      <div class="eingabe-leiste">
        <button class="k" type="button" onclick={() => zeileDazu()}><Icon n="plus" />{L('Zeile anfügen', 'Add row')}</button>
        <button class="k" type="button" aria-expanded={neueSpalte.offen} onclick={() => { neueSpalte.offen = !neueSpalte.offen; if (neueSpalte.offen) tick().then(() => document.getElementById('ns-name')?.focus()); }}><Icon n="plus" />{L('Spalte anfügen', 'Add column')}</button>
        <p class="hilfe">{d('Eingabe übernimmt den Wert und geht eine Zeile tiefer. Tab geht nach rechts. Bei Gruppen kannst du die Zahl oder den Namen tippen.', 'Eingabe übernimmt den Wert und geht eine Zeile tiefer. Tab geht nach rechts. Bei Gruppen können Sie die Zahl oder den Namen tippen.', 'Enter saves the value and moves down one row. Tab moves right. For groups you can type the number or the name.')}</p>
      </div>
      {#if neueSpalte.offen}
        <form class="neue-spalte klappt" transition:rutsch onsubmit={spalteDazu}>
          <div class="eingabe"><label for="ns-name">{L('Name der Spalte', 'Column name')}</label><input id="ns-name" type="text" bind:value={neueSpalte.bezeichnung} placeholder={L('z. B. Note Mathematik', 'e.g. Math grade')}></div>
          <div class="eingabe"><label for="ns-art">{L('Was steht drin?', 'What does it contain?')}</label>
            <select id="ns-art" value={neueSpalte.gruppenArt ? 'gruppenzahl' : neueSpalte.art} onchange={(e) => { const w = (e.currentTarget as HTMLSelectElement).value; neueSpalte.gruppenArt = w === 'gruppenzahl'; neueSpalte.art = w === 'gruppenzahl' ? 'zahl' : w as NeueSpalte['art']; }}>
              <option value="zahl">{L('Zahlen (z. B. Punkte, Alter)', 'Numbers (e.g. points, age)')}</option><option value="gruppenzahl">{L('Gruppen als Zahlen (1 = ja, 2 = nein)', 'Groups as numbers (1 = yes, 2 = no)')}</option><option value="text">{L('Wörter (z. B. Klasse, Schule)', 'Words (e.g. class, school)')}</option><option value="datum">{L('Datum', 'Date')}</option></select></div>
          {#if neueSpalte.gruppenArt}<div class="eingabe"><label for="ns-gr">{L('Gruppen', 'Groups')}</label><input id="ns-gr" type="text" bind:value={neueSpalte.gruppen} placeholder={L('1 = ja, 2 = nein', '1 = yes, 2 = no')}></div>{/if}
          <div class="knopfzeile"><button class="k haupt" type="submit">{L('Spalte anfügen', 'Add column')}</button><button class="k leise" type="button" onclick={() => (neueSpalte.offen = false)}>{L('Abbrechen', 'Cancel')}</button></div>
        </form>
      {/if}
    {/if}
  </section>

  {#if anzahl}
    <button class="check-leiste" type="button" aria-expanded={checkAuf} aria-controls="check-feld" onclick={() => (checkAuf = !checkAuf)}>
      <Icon n="hinweis" k="hw" /><span>{L('Daten-Check', 'Data check')} · {Lp(anzahl, `${anzahl} Hinweis`, `${anzahl} Hinweise`, `${anzahl} note`, `${anzahl} notes`)}</span>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style:transform={checkAuf ? 'rotate(180deg)' : 'none'}><path d="M6 15l6-6 6 6"/></svg>
    </button>
  {/if}
  <aside id="check-feld" class="rand check" class:auf={checkAuf} aria-labelledby="check-t">
    <RandSchalter text={anzahl ? `${L('Daten-Check', 'Data check')} · ${anzahl}` : L('Daten-Check', 'Data check')} />
    <div class="check-kopf"><h2 id="check-t" tabindex="-1">{L('Daten-Check', 'Data check')}</h2><HilfeLink id="daten-check" text={L('Hilfe zum Daten-Check', 'Help on the data check')} />
      <p>{anzahl ? Lp(anzahl, 'Ein Hinweis zu den Daten. Kurz prüfen - so fallen Eingabefehler nicht in die Ergebnisse.', `${anzahl} Hinweise zu den Daten. Kurz prüfen - so fallen Eingabefehler nicht in die Ergebnisse.`, 'One note on the data. Check it briefly so input errors do not end up in the results.', `${anzahl} notes on the data. Check them briefly so input errors do not end up in the results.`) : !s.zeilen.length ? d('Die Datei hat Spalten, aber noch keine Zeilen mit Antworten. Zum Rechnen braucht Statable Daten - über „Daten eingeben“ kannst du welche eintragen.', 'Die Datei hat Spalten, aber noch keine Zeilen mit Antworten. Zum Rechnen braucht Statable Daten - über „Daten eingeben“ können Sie welche eintragen.', 'The file has columns but no rows with answers yet. Statable needs data to calculate - use “Enter data” to add some.') : L('Alles angeschaut. Die Daten sind bereit.', 'All checked. Everything is ready.')}</p></div>
    {#if s.gewicht}<p class="gw-hinweis-check">{sperrSatz('datencheck:alle', s.gewicht, '')} {L('Der Daten-Check zählt Zeilen, nicht gewichtete Fälle.', 'The data check counts rows, not weighted cases.')}</p>{/if}
    {#each offen as f (fundSchluessel(f))}
      <div class="fund-karte"><h3><Icon n="hinweis" k="hw" />{titel(f)}</h3>
        {#if f.art === 'schreibweise'}
          <p>{fundSatz(f)}</p>
          <div class="vorher-nachher"><div><b>{L('Jetzt', 'Now')}</b>{Object.entries(f.vorher).map(([k, v]) => `${k} ${v}`).join(' · ')}</div><Icon n="runter" k="dreh" /><div><b>{L('Danach', 'After')}</b>{Object.entries(f.nachher).map(([k, v]) => `${k} ${v}`).join(' · ')}</div></div>
          <div class="knopfzeile"><button class="k haupt" type="button" data-tipp={L('Schreibt die Schreibweisen einheitlich', 'Unifies the spellings')} onclick={() => erledige(f)}>{L('Zusammenfassen', 'Merge')}</button><button class="k leise" type="button" data-tipp={L('Springt in der Tabelle zur ersten betroffenen Zeile', 'Jumps to the first affected row in the table')} onclick={() => zeige(f.zeilen[0]!)}><Icon n="auge" />{L('Zeigen', 'Show')}</button><button class="k leise" type="button" data-tipp={L('Lässt die Daten unverändert und merkt sich, dass dies geprüft ist', 'Leaves the data unchanged and remembers that this was checked')} onclick={() => lasse(f)}>{L('So lassen', 'Leave as is')}</button></div>
        {:else if f.art === 'platzhalter'}
          <p>{fundSatz(f)}</p>
          <div class="vorher-nachher"><div><b>{L('Jetzt', 'Now')}</b>{L('Mittelwert', 'Mean')} {zahlDe(f.mittelVorher, 2)}</div><Icon n="runter" k="dreh" /><div><b>{L('Danach', 'After')}</b>{L('Mittelwert', 'Mean')} {zahlDe(f.mittelNachher, 2)}</div></div>
          <div class="knopfzeile"><button class="k haupt" type="button" data-tipp={L('Zählt diese Einträge nicht mit, wie leere Felder', 'Does not count these entries, like empty cells')} onclick={() => erledige(f)}>{L('Als „keine Angabe“ behandeln', 'Treat as "no answer"')}</button><button class="k leise" type="button" data-tipp={L('Springt in der Tabelle zur ersten betroffenen Zeile', 'Jumps to the first affected row in the table')} onclick={() => zeige(f.zeilen[0]!)}><Icon n="auge" />{L('Zeigen', 'Show')}</button><button class="k leise" type="button" data-tipp={L('Lässt die Daten unverändert und merkt sich, dass dies geprüft ist', 'Leaves the data unchanged and remembers that this was checked')} onclick={() => lasse(f)}>{L('So lassen', 'Leave as is')}</button></div>
        {:else if f.art === 'leer'}
          <p>{Lp(f.anzahl, `Bei Zeile ${f.zeilen.slice(0, 5).map(z => nr(z)).join(', ')}${f.anzahl > 5 ? ' …' : ''} fehlt ein Wert. Diese Personen werden nur bei Rechnungen mit dieser Spalte ausgelassen.`, `Bei den Zeilen ${f.zeilen.slice(0, 5).map(z => nr(z)).join(', ')}${f.anzahl > 5 ? ' …' : ''} fehlt ein Wert. Diese Personen werden nur bei Rechnungen mit dieser Spalte ausgelassen.`, `Row ${f.zeilen.slice(0, 5).map(z => nr(z)).join(', ')}${f.anzahl > 5 ? ' …' : ''} has a blank value. These people are only left out of calculations that use this column.`, `Rows ${f.zeilen.slice(0, 5).map(z => nr(z)).join(', ')}${f.anzahl > 5 ? ' …' : ''} have blank values. These people are only left out of calculations that use this column.`)}</p>
          <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => erledige(f)}>{L('Verstanden', 'Got it')}</button><button class="k leise" type="button" data-tipp={L('Springt in der Tabelle zur ersten betroffenen Zeile', 'Jumps to the first affected row in the table')} onclick={() => zeige(f.zeilen[0]!)}><Icon n="auge" />{L('Zeigen', 'Show')}</button></div>
        {:else}
          <p>{fundSatz(f)}</p>
          <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => lasse(f)}>{L('Wert behalten', 'Keep value')}</button><button class="k" type="button" data-tipp={L('Springt in der Tabelle zur ersten betroffenen Zeile', 'Jumps to the first affected row in the table')} onclick={() => zeige(f.zeile)}>{L('Zeigen', 'Show')}</button><button class="k leise" type="button" data-tipp={L('Öffnet „Wie verteilt sich etwas?“ mit dieser Spalte und dem Ausreißertest. Der Test entfernt nichts.', 'Opens "How is something distributed?" with this column and the outlier test. The test removes nothing.')} onclick={() => pruefeMitTest(f.spalte)}>{L('Mit einem Test genauer prüfen', 'Check more closely with a test')}</button></div>
        {/if}
      </div>
    {/each}
    {#each s.lesehinweise as h, hi (hi + h.art)}
      <div class="fund-karte"><h3><Icon n="hinweis" k="hw" />{#if h.art === 'lesart' || h.art === 'beiwerk'}{L(`${h.kopf}: Werte wie ${h.beispiele.slice(0, 2).join(', ')}`, `${h.kopf}: values like ${h.beispiele.slice(0, 2).join(', ')}`)}{:else if h.art === 'titel'}{@const liste = h.zeilen.map(z => `${z.zeile} ${zitat(z.text)}`).join(', ')}{Lp(h.zeilen.length, `Zeile ${liste} als Titel übersprungen`, `Zeilen ${liste} als Titel übersprungen`, `Row ${liste} skipped as a title`, `Rows ${liste} skipped as titles`)}{:else}{Lp(h.zeilen.length, 'Eine Zeile hat eine andere Zahl von Feldern', `${h.zeilen.length} Zeilen haben eine andere Zahl von Feldern`, 'One row has a different number of fields', `${h.zeilen.length} rows have a different number of fields`)}{/if}</h3>
        {#if h.art === 'beiwerk'}
          {@const prozent = h.zeichen.includes('%')}
          {@const bsp = h.beispiele[0]!}
          {@const zahl = String(ohneBeiwerk(bsp))}
          <p>{prozent
            ? L(`In „${h.kopf}“ stehen nur Zahlen mit %-Zeichen (${h.beispiele.join(', ')}). Statable liest die Spalte deshalb als Text. Als Zahl gelesen entfällt das Zeichen: ${bsp} wird ${zahl}, die Zahl steht dann in Prozent (45 % ist 45, nicht 0,45).`, `"${h.kopf}" has only numbers with a % sign (${h.beispiele.join(', ')}). Statable therefore reads the column as text. Read as a number, the sign is dropped: ${bsp} becomes ${zahl}, and the number is in percent (45% is 45, not 0.45).`)
            : L(`In „${h.kopf}“ stehen nur Zahlen mit Währungszeichen (${h.beispiele.join(', ')}). Statable liest die Spalte deshalb als Text. Als Zahl gelesen entfällt das Zeichen: ${bsp} wird ${zahl}. Die Währung steht dann nur noch in der Überschrift.`, `"${h.kopf}" has only numbers with a currency sign (${h.beispiele.join(', ')}). Statable therefore reads the column as text. Read as a number, the sign is dropped: ${bsp} becomes ${zahl}. The currency is then only in the heading.`)}</p>
          <div class="knopfzeile">{#if kannNeuLesen}<button class="k haupt" type="button" data-tipp={L('Liest die Datei neu ein: Das Zeichen entfällt, die Spalte wird eine Zahlenspalte', 'Reads the file again: the sign is dropped and the column becomes a number column')} onclick={() => liesAlsZahl(h.kopf)}>{L('Als Zahl lesen', 'Read as number')}</button>{/if}<button class="k" type="button" onclick={() => schliesseLesehinweis(hi)}>{L('So richtig', 'That is right')}</button></div>
        {:else if h.art === 'lesart'}
          <p>{L(`In „${h.kopf}“ stehen Werte wie ${h.beispiele[0]} - gelesen als ${dez(h.beispiele[0]!)}. Sind es Tausender (${h.beispiele[0]} = ${h.beispiele[0]!.replace('.', '')}), hier umschalten.`, `"${h.kopf}" has values like ${h.beispiele[0]} - read as ${dez(h.beispiele[0]!)}. If they are thousands (${h.beispiele[0]} = ${h.beispiele[0]!.replace('.', '')}), switch here.`)}</p>
          <div class="knopfzeile">{#if kannNeuLesen}<button class="k" type="button" data-tipp={L('Liest die Datei neu ein: Werte wie 1.333 gelten dann als 1333', 'Reads the file again: values like 1.333 then count as 1333')} onclick={() => liesAlsTausender(h.kopf)}>{L('Als Tausender lesen', 'Read as thousands')}</button>{/if}<button class="k haupt" type="button" onclick={() => schliesseLesehinweis(hi)}>{L('So richtig', 'That is right')}</button></div>
        {:else if h.art === 'titel'}
          <p>{Lp(h.zeilen.length, `Über der Tabelle stand eine Zeile, die nur einen Text enthält. Statable hat sie nicht als Daten gelesen. Die Spaltennamen stehen in Zeile ${h.kopfzeile}.`, `Über der Tabelle standen Zeilen, die nur einen Text enthalten. Statable hat sie nicht als Daten gelesen. Die Spaltennamen stehen in Zeile ${h.kopfzeile}.`, `Above the table there was a row with only a text in it. Statable did not read it as data. The column names are in row ${h.kopfzeile}.`, `Above the table there were rows with only a text in them. Statable did not read them as data. The column names are in row ${h.kopfzeile}.`)}</p>
          <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => schliesseLesehinweis(hi)}>{L('Verstanden', 'Got it')}</button></div>
        {:else}
          {@const liste = `${h.zeilen.slice(0, 5).map(z => `${z.zeile} (${z.felder})`).join(', ')}${h.zeilen.length > 5 ? ' …' : ''}`}
          <p>{L(`Die Kopfzeile hat ${h.erwartet} Felder, in den Zeilen ${liste} (Zeile, Felder) ist es anders. Überzählige Werte werden nicht gelesen. Oft steht ein Trennzeichen mitten in einem Text - die Zeilen in der Datei prüfen.`, `The header has ${h.erwartet} fields; rows ${liste} (row, fields) differ. Extra values are not read. Often a separator sits inside a text - check those lines in the file.`)}</p>
          <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => schliesseLesehinweis(hi)}>{L('Verstanden', 'Got it')}</button><button class="k leise" type="button" onclick={() => zeige(h.zeilen[0]!.zeile - 1)}><Icon n="auge" />{L('Zeigen', 'Show')}</button></div>
        {/if}
      </div>
    {/each}
    {#each erledigt as [k, v] (k)}
      <div class="fund-karte erledigt"><h3><Icon n="haken" k="ok" /><span>{k.split(':')[0] === 'schreibweise' ? L('Schreibweisen zusammengefasst', 'Spellings merged') : k.split(':')[0] === 'platzhalter' ? L(`${k.split(':')[2]} gilt als „keine Angabe“`, `${k.split(':')[2]} counts as "no answer"`) : k.split(':')[0] === 'leer' ? L('Leere Felder: verstanden', 'Blank cells: got it') : L('Auffälliger Wert: behalten', 'Unusual value: kept')}{v === 'gelassen' ? L(' (so gelassen)', ' (left as is)') : ''} · {k.split(':')[1]}</span></h3></div>
    {/each}
    {#if !anzahl}<a class="k haupt gross" href="#blatt/neu">{d('Jetzt eine Auswertung starten', 'Jetzt eine Auswertung starten', 'Start an analysis now')}</a>{/if}
  </aside>
</div>

<style>
  :global(.ico.dreh) { transform: rotate(-90deg); }
  /* „?“ direkt hinter der Überschrift „Daten-Check“, nicht in einer eigenen Zeile (Usability Stufe 7, R5). */
  .check-kopf h2 { display: inline; margin-inline-end: var(--a1); vertical-align: middle; }
  .gw-vorschlag { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2) var(--a3); margin: var(--a2) 0; padding: var(--a2) var(--a3); border-inline-start: 3px solid var(--akzent); background: var(--akzent-hell); border-radius: var(--r-klein); }
  :global(th.gw-spalte) { box-shadow: inset 0 -3px 0 var(--akzent); }
  .gw-punkt { margin-inline-start: .35em; padding: 0 .35em; border-radius: 999px; background: var(--akzent); color: var(--tinte-auf-akzent); font-size: .8em; font-weight: 700; }
  :global(tr.gw-null td) { color: var(--tinte-2); background: var(--blatt-2); }
  .gw-hinweis-check { margin: var(--a2) 0; color: var(--tinte-2); }
  .gw-null-zeichen { margin-inline-start: .35em; color: var(--tinte-2); }
</style>
