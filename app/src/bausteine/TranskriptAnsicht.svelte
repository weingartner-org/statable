<script lang="ts">
  /**
   * Ansicht eines geöffneten Transkripts (Paket 4C-2): Angaben, Abspieler mit Aufnahme, Hinweise des Prüfers, Redeanteile, der Text als Beiträge
   * (lesen, bearbeiten, teilen, zusammenlegen, einfügen) und der Export. Alle Änderungen am Text laufen über `lib/transkript-bearbeiten.ts`
   * und lassen sich zurücknehmen. Ansagen nur über `sage()`. Text aus dem Transkript wird nur als Text angezeigt, nie als HTML.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { dateiname } from '../lib/dateiname';
  import { aendereDokument, iv, qualProjekt } from '../lib/interviews.svelte';
  import { programmName } from '../lib/interviews-qual';
  import { textBearbeitbar, type Dokument } from '../lib/qualprojekt';
  import { aendereBeitrag, fuegeBeitragEin, legeZusammen } from '../lib/transkript-bearbeiten';
  import { pruefeTranskript, uebernimmVorschlag, type Hinweis, type Regelwerk } from '../lib/transkript-pruefen';
  import { zaehleBefragt, zaehlerHinweis, zaehlerSatz, type Auswahl } from '../lib/zaehler-befragt';
  import { alleInhalte, beitragTeile, codepoints } from '../lib/transkript-text';
  import { formatZeit } from '../lib/zeitmarken';
  import {
    abspielName, abspielTaste, beitragTitel, beitragBezeichnung, kopfAbschnitte, laufenderBeitrag, rollenName, seiteVon, seitenBereich, seitenText, seitenZahl, teileAnSchreibmarke, zeitmarkenForm, fehlerText,
  } from '../lib/transkript-ansicht';
  import ExportMenue, { type ExportEintrag } from './ExportMenue.svelte';
  import TranskriptAbspieler from './TranskriptAbspieler.svelte';
  import TranskriptHinweise from './TranskriptHinweise.svelte';
  import TranskriptRedeanteile from './TranskriptRedeanteile.svelte';

  let { dok, alle, schliessen }: { dok: Dokument; alle: Dokument[]; schliessen: () => void } = $props();

  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
  const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const t = $derived(dok.transkript!);
  const abschnitte = $derived(t.abschnitte);
  const n = $derived(abschnitte.length);
  const regeln = $derived<Regelwerk>(t.regeln ?? 'einfach');
  const inhalte = $derived(alleInhalte(dok));
  // Namen zum Anonymisieren (nur Regelwerk Froschauer und Lueger): nur in dieser Sitzung, nie im Projekt gespeichert; Statable rät keine Namen
  let namenText = $state('');
  const namenListe = $derived(namenText.split(/[\n;]/).map(x => x.trim()).filter(x => x !== ''));
  const hinweise = $derived(pruefeTranskript(dok, regeln, sprache(), { namen: namenListe }));
  const gesperrt = $derived(!textBearbeitbar(dok, qualProjekt() ?? { segmente: [] }));
  const namen = $derived(new Map(t.sprecher.map(s => [s.id, s.name])));
  const nameVon = (i: number): string | undefined => { const id = abschnitte[i]?.sprecher; return id ? namen.get(id) : undefined; };
  const kopf = $derived(kopfAbschnitte(abschnitte));
  const bz = (i: number, gross = false): string => beitragBezeichnung(i, kopf, sprache(), gross);
  const hatZeit = $derived(abschnitte.some(a => a.zeitMs !== undefined));

  let abspieler = $state<ReturnType<typeof TranskriptAbspieler>>();
  let spielt = $state(false);
  let posMs = $state(0);
  const laeuft = $derived(spielt ? laufenderBeitrag(abschnitte, posMs) : -1);

  let seite = $state(0);
  const seiteWirklich = $derived(Math.min(seite, seitenZahl(n) - 1));
  const bereich = $derived(seitenBereich(n, seiteWirklich));
  const sichtbar = $derived(Array.from({ length: Math.max(0, bereich.bis - bereich.von) }, (_, k) => bereich.von + k));

  /* ---------- Änderungen mit Rückgängig */
  // Beispielinterview: die Aufnahme wartet, bis der Abspieler da ist
  $effect(() => {
    const f = iv.aufnahmeWartet;
    if (f && abspieler) { iv.aufnahmeWartet = null; void abspieler.ladeDatei(f); }
  });
  let verlauf = $state<Dokument[]>([]);
  const opt = () => ({ segmenteVorhanden: gesperrt });
  function aendere(neu: Dokument) {
    verlauf = [...verlauf.slice(-49), $state.snapshot(dok) as Dokument];
    aendereDokument(dok.id, () => neu);
  }
  function rueckgaengig() {
    const alt = verlauf.at(-1);
    if (!alt) return;
    verlauf = verlauf.slice(0, -1);
    // Aufnahme und Regeln, die inzwischen gewählt wurden, bleiben
    aendereDokument(dok.id, d => ({ ...alt, ...(d.medium ? { medium: d.medium } : {}), transkript: { ...alt.transkript!, ...(d.transkript?.regeln ? { regeln: d.transkript.regeln } : {}) } }));
    bearbeite = null;
    sage(L('Letzte Änderung zurückgenommen.', 'Last change undone.'));
  }
  const fehlerSatz = (e: unknown): string => fehlerText(e, sprache());

  /* ---------- Angaben */
  function setzeRegeln(r: Regelwerk) {
    aendereDokument(dok.id, d => ({ ...d, geaendert: Date.now(), transkript: { ...d.transkript!, regeln: r } }));
    const z = pruefeTranskript({ ...dok, transkript: { ...t, regeln: r } }, r, sprache(), { namen: namenListe }).length;
    const de = r === 'einfach' ? 'einfach' : r === 'erweitert' ? 'erweitert' : 'Froschauer und Lueger';
    const en = r === 'einfach' ? 'simple' : r === 'erweitert' ? 'extended' : 'Froschauer and Lueger';
    sage(L(`Regeln: ${de}. ${Lp(z, '1 Hinweis.', `${z} Hinweise.`, '1 note.', `${z} notes.`)}`, `Rules: ${en}. ${Lp(z, '1 note.', `${z} notes.`, '1 note.', `${z} notes.`)}`));
  }

  /* ---------- Zähler für die befragte Person: Auswahl im Text, sonst das ganze Transkript */
  let wurzel = $state<HTMLElement>();
  let auswahl = $state<Auswahl | undefined>(undefined);
  let auswahlTimer: ReturnType<typeof setTimeout> | undefined;
  const hatBefragte = $derived(t.sprecher.some(s => s.rolle === 'befragt'));
  const zaehlung = $derived(hatBefragte ? zaehleBefragt(dok, auswahl) : null);
  const zaehlerText = $derived(zaehlung ? `${zaehlerSatz(zaehlung, sprache())}${zaehlerHinweis(zaehlung, sprache()) ? ' ' + zaehlerHinweis(zaehlung, sprache()) : ''}` : '');
  /** Die Auswahl im Browser als Bereich in `dok.text` (Codepoints): von der ersten bis zur letzten angeschnittenen Beitragszeile. */
  function leseAuswahl(): Auswahl | undefined {
    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !wurzel) return undefined;
    const r = sel.getRangeAt(0);
    let von: number | undefined, bis: number | undefined;
    let cps: string[] | undefined;
    for (const p of wurzel.querySelectorAll<HTMLElement>('.btext[data-beitrag]')) {
      if (!sel.containsNode(p, true)) continue;
      const i = Number(p.dataset.beitrag);
      const text = inhalte[i] ?? '';
      const ganz = document.createRange(); ganz.selectNodeContents(p);
      const bisAnfang = (grenze: 'start' | 'ende'): number => {
        const x = document.createRange(); x.setStart(ganz.startContainer, ganz.startOffset);
        if (grenze === 'start') x.setEnd(r.startContainer, r.startOffset); else x.setEnd(r.endContainer, r.endOffset);
        return x.toString().length;
      };
      const u0 = r.compareBoundaryPoints(Range.START_TO_START, ganz) > 0 ? Math.min(text.length, bisAnfang('start')) : 0;
      const u1 = r.compareBoundaryPoints(Range.END_TO_END, ganz) < 0 ? Math.min(text.length, bisAnfang('ende')) : text.length;
      cps ??= codepoints(dok.text);
      const anfang = beitragTeile(cps, dok, i).inhalt.start;
      const a = anfang + Array.from(text.slice(0, u0)).length, b = anfang + Array.from(text.slice(0, u1)).length;
      if (b <= a) continue;
      von = von === undefined ? a : Math.min(von, a);
      bis = bis === undefined ? b : Math.max(bis, b);
    }
    return von !== undefined && bis !== undefined ? { start: von, ende: bis } : undefined;
  }
  function beiAuswahl() {
    clearTimeout(auswahlTimer);
    // Nach dem Markieren (entprellt) sagt die gemeinsame Ansage-Region das Ergebnis; es gibt keine eigene Live-Region (Wächter `ansage-waechter.test.ts`).
    auswahlTimer = setTimeout(async () => {
      const neu = leseAuswahl();
      if (neu?.start === auswahl?.start && neu?.ende === auswahl?.ende) return;
      auswahl = neu;
      if (neu) { await tick(); if (zaehlerText) sage(zaehlerText); }
    }, 500);
  }
  $effect(() => { document.addEventListener('selectionchange', beiAuswahl); return () => { document.removeEventListener('selectionchange', beiAuswahl); clearTimeout(auswahlTimer); }; });
  const beiMedium = (m: NonNullable<Dokument['medium']>) => { aendereDokument(dok.id, d => ({ ...d, medium: m, geaendert: Date.now() })); };

  /* ---------- Tasten (F4, F8, F9, Umschalt+F8/F9, Umschalt+F4) */
  function taste(e: KeyboardEvent) {
    const a = abspielTaste(e);
    if (!a) return;
    if (!abspieler?.bereit() || document.querySelector('dialog[open]')) return;   // ohne Aufnahme bleibt die Taste frei
    e.preventDefault();
    if (e.repeat) return;
    switch (a) {
      case 'umschalten': abspieler.umschalten(); break;
      case 'zurueck': abspieler.zurueck(); break;
      case 'vor': abspieler.vor(); break;
      case 'langsamer': abspieler.langsamer(); break;
      case 'schneller': abspieler.schneller(); break;
      case 'zeitmarke': void zeitmarkeEinfuegen(); break;
    }
  }
  async function zeitmarkeEinfuegen() {
    if (bearbeite === null || !ta || !abspieler) { sage(L('Umschalt+F4 setzt die Zeitmarke nur, während Sie einen Beitrag bearbeiten.', 'Shift+F4 sets the time mark only while you are editing a contribution.')); return; }
    const marke = formatZeit(abspieler.zeit(), zeitmarkenForm(dok));
    const a = ta.selectionStart, b = ta.selectionEnd;
    editText = editText.slice(0, a) + marke + editText.slice(b);
    await tick();
    ta.focus(); ta.setSelectionRange(a + marke.length, a + marke.length);
    sage(L(`Zeitmarke ${formatZeit(abspieler.zeit(), 'hms')} eingefügt.`, `Time mark ${formatZeit(abspieler.zeit(), 'hms')} inserted.`));
  }

  /* ---------- Hinweise */
  async function zurStelle(i: number) {
    seite = seiteVon(n, i); bearbeite = null;
    await tick();
    const e = document.getElementById(`iv-bh-${i}`);
    e?.scrollIntoView({ block: 'center' });
    e?.focus();
  }
  async function uebernimmHinweis(h: Hinweis) {
    if (gesperrt) { sage(L('Der Text ist gesperrt.', 'The text is locked.'), 'dringend'); return; }
    try {
      const neu = uebernimmVorschlag(dok, h);
      const rest = pruefeTranskript(neu, regeln, sprache(), { namen: namenListe }).length;
      aendere(neu);
      bearbeite = null;
      sage(L(`Vorschlag übernommen in ${bz(h.abschnitt)}. ${Lp(rest, 'Noch 1 Hinweis.', `Noch ${rest} Hinweise.`, '1 note left.', `${rest} notes left.`)}`, `Suggestion applied in ${bz(h.abschnitt)}. ${Lp(rest, '1 note left.', `${rest} notes left.`, '1 note left.', `${rest} notes left.`)}`));
      await tick();
      document.getElementById('iv-hin-kopf')?.focus();
    } catch (e) { sage(fehlerSatz(e), 'dringend'); }
  }

  /* ---------- Bearbeiten eines Beitrags */
  let bearbeite = $state<number | null>(null);
  let editText = $state('');
  let editSprecher = $state('');
  let editFehler = $state('');
  let ta = $state<HTMLTextAreaElement>();
  const editName = $derived(bearbeite === null ? '' : nameVon(bearbeite) ?? '');
  const naechsterGleich = $derived(bearbeite !== null && bearbeite + 1 < n && abschnitte[bearbeite + 1]?.sprecher === abschnitte[bearbeite]?.sprecher);

  async function beginneBearbeiten(i: number) {
    bearbeite = i; editText = inhalte[i] ?? ''; editSprecher = abschnitte[i]?.sprecher ?? ''; editFehler = '';
    await tick();
    ta?.focus();
  }
  async function zurueckZumKnopf(i: number) { await tick(); document.getElementById(`iv-b-ed-${i}`)?.focus(); }
  const mitEdit = (i: number): Dokument => aendereBeitrag(dok, i, editText, editSprecher || undefined, opt());
  function zeigeFehler(e: unknown) { editFehler = fehlerSatz(e); sage(editFehler, 'dringend'); }

  async function uebernehmen() {
    const i = bearbeite;
    if (i === null) return;
    try {
      const neu = mitEdit(i);
      const gleich = neu.text === dok.text && neu.transkript!.abschnitte[i]!.sprecher === abschnitte[i]!.sprecher;
      if (!gleich) aendere(neu);
      bearbeite = null; editFehler = '';
      await zurueckZumKnopf(i);
      sageSpaeter(gleich ? L(`${bz(i, true)} unverändert.`, `${bz(i, true)} unchanged.`) : L(`${bz(i, true)} geändert.`, `${bz(i, true)} changed.`), 500);
    } catch (e) { zeigeFehler(e); }
  }
  async function abbrechen() {
    const i = bearbeite;
    bearbeite = null; editFehler = '';
    if (i !== null) { await zurueckZumKnopf(i); sageSpaeter(L(`Bearbeiten von ${bz(i)} abgebrochen.`, `Editing of ${bz(i)} cancelled.`), 500); }
  }
  async function teilen() {
    const i = bearbeite;
    if (i === null || !ta) return;
    try {
      const neu = teileAnSchreibmarke(dok, i, editText, editSprecher || undefined, ta.selectionStart, opt());
      aendere(neu);
      bearbeite = null; editFehler = '';
      await zurueckZumKnopf(i);
      sageSpaeter(L(`${bz(i, true)} geteilt in ${bz(i)} und ${bz(i + 1)}.`, `${bz(i, true)} split into ${bz(i)} and ${bz(i + 1)}.`), 500);
    } catch (e) { zeigeFehler(e); }
  }
  async function zusammenlegen() {
    const i = bearbeite;
    if (i === null) return;
    if (!naechsterGleich) { zeigeFehler(new Error(L('Nur Beiträge derselben Person lassen sich zusammenlegen.', 'Only contributions of the same person can be merged.'))); return; }
    try {
      aendere(legeZusammen(mitEdit(i), i, opt()));
      bearbeite = null; editFehler = '';
      await zurueckZumKnopf(i);
      sageSpaeter(L(`${bz(i, true)} und ${bz(i + 1)} zusammengelegt.`, `${bz(i, true)} and ${bz(i + 1)} merged.`), 500);
    } catch (e) { zeigeFehler(e); }
  }
  async function einfuegen() {
    const i = bearbeite;
    if (i === null) return;
    try {
      const neu = fuegeBeitragEin(mitEdit(i), i, editSprecher || undefined, opt());
      aendere(neu);
      seite = seiteVon(n + 1, i + 1);
      await tick();
      await beginneBearbeiten(i + 1);
      sageSpaeter(L(`Neuer Beitrag eingefügt (nach ${bz(i)}). Er ist zum Schreiben geöffnet.`, `New contribution inserted (after ${bz(i)}). It is open for writing.`), 500);
    } catch (e) { zeigeFehler(e); }
  }
  function editTaste(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) { e.preventDefault(); void uebernehmen(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); void abbrechen(); }
  }

  /* ---------- Seiten */
  function wechsleSeite(neu: number) {
    seite = Math.min(Math.max(0, neu), seitenZahl(n) - 1);
    bearbeite = null;
    sage(seitenText(n, seite, sprache()));
  }

  /* ---------- Export */
  async function wordAus(zeit: 'keine' | 'anfang' | 'f4') {
    const [{ transkriptWord }, { herunterladen }] = await Promise.all([import('../lib/transkript-ausgabe'), import('../lib/export')]);
    herunterladen(await transkriptWord($state.snapshot(dok) as Dokument, { zeit }, sprache()), `${dateiname(dok.name)} - ${L('Transkript', 'Transcript')}.docx`, WORD);
    sage(L('Transkript als Word-Datei gespeichert.', 'Transcript saved as Word file.'));
  }
  async function wordFLAus() {
    const [{ transkriptWordFL }, { herunterladen }] = await Promise.all([import('../lib/transkript-word-fl'), import('../lib/export')]);
    herunterladen(await transkriptWordFL($state.snapshot(dok) as Dokument, sprache()), `${dateiname(dok.name)} - ${L('Transkript nach Froschauer und Lueger', 'Transcript after Froschauer and Lueger')}.docx`, WORD);
    sage(L('Transkript als Word-Datei mit Zeilennummern gespeichert.', 'Transcript saved as Word file with line numbers.'));
  }
  async function textAus() {
    const [{ alsF4Text }, { herunterladen }] = await Promise.all([import('../lib/transkript-ausgabe'), import('../lib/export')]);
    herunterladen(new TextEncoder().encode(alsF4Text($state.snapshot(dok) as Dokument)), `${dateiname(dok.name)} - ${L('Transkript', 'Transcript')}.txt`, 'text/plain;charset=utf-8');
    sage(L('Transkript als Text gespeichert.', 'Transcript saved as text.'));
  }
  async function vttAus() {
    const [{ alsVtt }, { herunterladen }] = await Promise.all([import('../lib/transkript-ausgabe'), import('../lib/export')]);
    try {
      herunterladen(new TextEncoder().encode(alsVtt($state.snapshot(dok) as Dokument)), `${dateiname(dok.name)} - ${L('Transkript', 'Transcript')}.vtt`, 'text/vtt;charset=utf-8');
      sage(L('Transkript als WebVTT gespeichert.', 'Transcript saved as WebVTT.'));
    } catch (e) { sage(fehlerSatz(e), 'dringend'); }
  }
  const exportEintraege = $derived<ExportEintrag[]>([
    { id: 'w-keine', gruppe: L('Word', 'Word'), text: L('Word, ohne Zeitangaben', 'Word, without times'), icon: 'download', tun: () => wordAus('keine') },
    { id: 'w-anfang', gruppe: L('Word', 'Word'), text: L('Word, Zeit am Anfang jedes Beitrags', 'Word, time at the start of each contribution'), icon: 'download', tun: () => wordAus('anfang') },
    { id: 'w-f4', gruppe: L('Word', 'Word'), text: L('Word, Zeitmarke am Ende (f4-Form)', 'Word, time mark at the end (f4 form)'), icon: 'download', tun: () => wordAus('f4') },
    { id: 'w-fl', gruppe: L('Word', 'Word'), text: L('Word nach Froschauer und Lueger (Zeilennummern, Zeilenabstand 1,5, breiter Rand)', 'Word after Froschauer and Lueger (line numbers, line spacing 1.5, wide margin)'), icon: 'download', tun: () => wordFLAus() },
    { id: 'text', gruppe: L('Text', 'Text'), text: L('Text (f4-Form, .txt)', 'Text (f4 form, .txt)'), icon: 'download', tun: textAus },
    ...(hatZeit ? [{ id: 'vtt', gruppe: L('Untertitel', 'Subtitles'), text: L('WebVTT (.vtt)', 'WebVTT (.vtt)'), icon: 'download', tun: vttAus }] : []),
  ]);
</script>

<svelte:window onkeydown={taste} />

{#snippet seitenwahl(kennung: string)}
  {#if seitenZahl(n) > 1}
    <div class="seiten" role="group" aria-label={L('Seiten der Beiträge', 'Pages of contributions')}>
      <button class="k klein" type="button" disabled={seiteWirklich === 0} onclick={() => wechsleSeite(seiteWirklich - 1)}>{L('Vorige Seite', 'Previous page')}</button>
      <label for="iv-sw-{kennung}" class="nur-vorleser">{L('Seite wählen', 'Choose page')}</label>
      <select id="iv-sw-{kennung}" value={seiteWirklich} onchange={(e) => wechsleSeite(Number(e.currentTarget.value))}>
        {#each Array.from({ length: seitenZahl(n) }, (_, k) => k) as k (k)}<option value={k}>{seitenText(n, k, sprache())}</option>{/each}
      </select>
      <button class="k klein" type="button" disabled={seiteWirklich >= seitenZahl(n) - 1} onclick={() => wechsleSeite(seiteWirklich + 1)}>{L('Nächste Seite', 'Next page')}</button>
    </div>
  {/if}
{/snippet}

<section class="offen" bind:this={wurzel} aria-label={L('Geöffnetes Transkript', 'Open transcript')}>
  <div class="ta-kopf">
    <h3 id="iv-offen-t" tabindex="-1">{L(`Transkript: ${dok.name}`, `Transcript: ${dok.name}`)}</h3>
    <button class="k leise" type="button" onclick={schliessen}>{L('Transkript schließen', 'Close transcript')}</button>
  </div>

  <h4>{L('Angaben zum Transkript', 'About this transcript')}</h4>
  <dl class="angaben">
    <dt>{L('Programm', 'Program')}</dt><dd>{programmName(t.quelle ?? '') || L('unbekannt', 'unknown')}</dd>
    <dt>{L('Datei', 'File')}</dt><dd>{dok.datei?.name ?? L('eingefügter Text', 'pasted text')}</dd>
    <dt>{L('Beiträge', 'Contributions')}</dt><dd>{n}</dd>
    <dt>{L('Personen', 'People')}</dt><dd>{t.sprecher.length ? t.sprecher.map(s => (s.rolle ? `${s.name} (${rollenName(s.rolle, sprache())})` : s.name)).join(', ') : L('keine erkannt', 'none recognised')}</dd>
  </dl>
  <fieldset class="regeln">
    <legend>{L('Transkriptionsregeln (Regelwerk wählen)', 'Transcription rules (choose a rule set)')}</legend>
    <label class="schalter"><input type="radio" name="iv-regeln" checked={regeln === 'einfach'} onchange={() => setzeRegeln('einfach')}>{L('Dresing und Pehl, einfach (geglättet: gut lesbar, ohne Wortabbrüche und Hörersignale)', 'Dresing and Pehl, simple (smoothed: easy to read, without broken-off words and listener signals)')}</label>
    <label class="schalter"><input type="radio" name="iv-regeln" checked={regeln === 'erweitert'} onchange={() => setzeRegeln('erweitert')}>{L('Dresing und Pehl, erweitert (wortgenau: mit Wortabbrüchen und Betonungen)', 'Dresing and Pehl, extended (verbatim: with broken-off words and emphasis)')}</label>
    <label class="schalter"><input type="radio" name="iv-regeln" checked={regeln === 'froschauer-lueger'} onchange={() => setzeRegeln('froschauer-lueger')}>{L('Froschauer und Lueger (exakt: für Feinstruktur- und Systemanalyse, mit Pausen, Dehnung und Unterbrechungen)', 'Froschauer and Lueger (exact: for fine-structure and system analysis, with pauses, drawn-out words and interruptions)')}</label>
    <p class="hilfe">{L('Die einfachen Regeln genügen für eine Inhaltszusammenfassung, die erweiterten für eine Themen- und Codeanalyse. Die Regeln nach Froschauer und Lueger brauchen Sie für eine Feinstrukturanalyse (nur kurze Ausschnitte) oder eine Systemanalyse. Hörersignale wie „mhm“ bleiben dort Text.', 'The simple rules suffice for a content summary, the extended ones for a thematic or code analysis. You need the rules after Froschauer and Lueger for a fine-structure analysis (short extracts only) or a system analysis. Listener signals such as "mhm" stay text there.')}</p>
    {#if regeln === 'froschauer-lueger'}
      <div class="eingabe">
        <label for="iv-namen">{L('Namen zum Anonymisieren (einer je Zeile)', 'Names to anonymise (one per line)')}</label>
        <textarea id="iv-namen" rows="3" spellcheck="false" bind:value={namenText} aria-describedby="iv-namen-h"></textarea>
        <p id="iv-namen-h" class="hilfe">{L('Statable rät keine Namen. Was hier steht, meldet der Prüfer, wenn es im Klartext im Transkript steht. Die Liste wird nicht gespeichert.', 'Statable does not guess names. The checker reports what is written here if it appears in plain text in the transcript. The list is not saved.')}</p>
      </div>
    {/if}
  </fieldset>

  <h4>{L('Aufnahme abspielen (Abspieler)', 'Play the recording (player)')}</h4>
  <TranskriptAbspieler bind:this={abspieler} medium={dok.medium} {beiMedium} bind:spielt bind:posMs />

  <TranskriptHinweise {dok} {hinweise} {gesperrt} kopfId="iv-hin-kopf" {zurStelle} uebernehmen={uebernimmHinweis} />

  <h4>{L('Redeanteile (Anteile am Gespräch)', 'Speaking shares (shares of the conversation)')}</h4>
  <TranskriptRedeanteile {dok} {alle} faelle={qualProjekt()?.faelle ?? []} />

  <div class="ta-kopf">
    <h4 id="iv-text-t" tabindex="-1">{L(`Text in Beiträgen (${n})`, `Text in contributions (${n})`)}</h4>
    <button class="k klein" type="button" disabled={verlauf.length === 0} onclick={rueckgaengig}>{L('Letzte Änderung zurücknehmen', 'Undo last change')}</button>
    <ExportMenue klein eintraege={exportEintraege} name={`${L('Transkript', 'Transcript')}: ${dok.name}`} />
  </div>
  {#if hatBefragte}
    <p class="zaehler" id="iv-zaehler">{zaehlerText}</p>
    <p class="hilfe">{L('Gezählt wird, was Sie im Text markieren, sonst das ganze Transkript. Es zählen nur die Beiträge der befragten Person. Nicht mitgezählt werden Zeitmarken, Pausenpunkte, Klammern mit Anmerkungen, Geräusche zwischen > und <, Unterbrechungen zwischen Schrägstrichen und Zeilen, die mit /I1: beginnen. Ein anonymisierter Name zwischen < und > zählt als ein Wort, ein gedehntes Wort und ein gegendertes Wort mit Doppelpunkt ebenso.', 'What you select in the text is counted, otherwise the whole transcript. Only the contributions of the respondent count. Not counted are time stamps, pause dots, brackets with remarks, noises between > and <, interruptions between slashes and lines that start with /I1:. An anonymised name between < and > counts as one word, and so do a drawn-out word and a gendered word with a colon.')}</p>
  {/if}
  {#if !hatZeit}<p class="hilfe">{L('Dieses Transkript hat keine Zeitangaben. WebVTT gibt es nur mit Zeiten, und „Ab hier abspielen“ fehlt. Korrigieren neben der Aufnahme geht trotzdem.', 'This transcript has no times. WebVTT is only available with times, and "Play from here" is missing. Correcting next to the recording still works.')}</p>{/if}
  {#if gesperrt}<p class="hilfe">{L('Dieser Text hat schon Textstellen mit Codes und ist gesperrt. Er lässt sich nicht mehr ändern, damit die Stellen nicht verrutschen.', 'This text already has passages with codes and is locked. It can no longer be changed, so the passages do not shift.')}</p>{/if}
  {#if n === 0}<p>{L('Dieses Transkript hat keine Beiträge.', 'This transcript has no contributions.')}</p>{/if}

  {@render seitenwahl('oben')}
  {#each sichtbar as i (i)}
    {@const a = abschnitte[i]!}
    {@const name = nameVon(i)}
    <div class="beitrag" class:laeuft={laeuft === i} class:bearb={bearbeite === i}>
      <div class="bkopf">
        <h5 id="iv-bh-{i}" tabindex="-1">{beitragTitel(i, name, a.zeitMs, sprache(), kopf)}</h5>
        {#if laeuft === i}<span class="lauf" aria-hidden="true">{L('läuft', 'playing')}</span>{/if}
      </div>
      {#if bearbeite === i}
        <div class="edit" role="group" aria-label={L(`${bz(i, true)} bearbeiten`, `Edit ${bz(i)}`)}>
          <div class="eingabe">
            <label for="iv-b-text">{L(`Text von ${bz(i)}${editName ? `, ${editName}` : ''}`, `Text of ${bz(i)}${editName ? `, ${editName}` : ''}`)}</label>
            <textarea id="iv-b-text" bind:this={ta} bind:value={editText} rows="6" spellcheck="true" onkeydown={editTaste} aria-describedby="iv-b-hilfe{editFehler ? ' iv-b-fehler' : ''}"></textarea>
            <p id="iv-b-hilfe" class="hilfe">{L('Strg+Eingabe übernimmt, Esc bricht ab. Umschalt+F4 setzt die Zeitmarke der Aufnahme an die Schreibmarke.', 'Ctrl+Enter applies, Esc cancels. Shift+F4 puts the time mark of the recording at the caret.')}</p>
            {#if editFehler}<p id="iv-b-fehler" class="fehl">{editFehler}</p>{/if}
          </div>
          {#if t.sprecher.length}
            <div class="eingabe">
              <label for="iv-b-sprecher">{L('Sprecher oder Sprecherin', 'Speaker')}</label>
              <select id="iv-b-sprecher" bind:value={editSprecher}>
                {#if !a.sprecher}<option value="">{L('(keine Person)', '(no person)')}</option>{/if}
                {#each t.sprecher as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
              </select>
            </div>
          {/if}
          <div class="knopfzeile">
            <button class="k haupt" type="button" onclick={() => void uebernehmen()}>{L('Übernehmen', 'Apply')}</button>
            <button class="k leise" type="button" onclick={() => void abbrechen()}>{L('Abbrechen', 'Cancel')}</button>
          </div>
          <div class="knopfzeile" role="group" aria-label={L('Beitrag umbauen', 'Restructure the contribution')}>
            <button class="k klein" type="button" onclick={() => void teilen()}>{L('Beitrag hier teilen', 'Split contribution here')}</button>
            <button class="k klein" type="button" aria-disabled={naechsterGleich ? undefined : 'true'} onclick={() => void zusammenlegen()}>{L('Mit nächstem zusammenlegen', 'Merge with next')}</button>
            <button class="k klein" type="button" onclick={() => void einfuegen()}>{L('Beitrag danach einfügen', 'Insert contribution after')}</button>
          </div>
        </div>
      {:else}
        <p class="btext" data-beitrag={i}>{inhalte[i] ?? ''}{#if !inhalte[i]}<span class="leer">{L('(kein Text)', '(no text)')}</span>{/if}</p>
        <div class="knopfzeile">
          {#if abspieler?.bereit() && a.zeitMs !== undefined}
            <button class="k klein" type="button" aria-label={abspielName(a.zeitMs, sprache())} onclick={() => abspieler?.abspielenAb(a.zeitMs!)}>{L('Ab hier abspielen', 'Play from here')}</button>
          {/if}
          {#if !gesperrt}
            <button class="k klein leise" id="iv-b-ed-{i}" type="button" aria-label={L(`Bearbeiten: ${bz(i)}${name ? `, ${name}` : ''}`, `Edit: ${bz(i)}${name ? `, ${name}` : ''}`)} onclick={() => void beginneBearbeiten(i)}>{L('Bearbeiten', 'Edit')}</button>
          {/if}
        </div>
      {/if}
    </div>
  {/each}
  {@render seitenwahl('unten')}
</section>

<style>
  .offen { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a3) var(--a4); background: var(--blatt); display: flex; flex-direction: column; gap: var(--a3); }
  .ta-kopf { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: center; }
  .offen h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .offen h4 { margin: var(--a3) 0 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .ta-kopf h4 { margin: 0; }
  .offen h5 { margin: 0; font: 650 var(--gr-klein)/1.3 var(--schrift-ui); }
  .offen h3:focus-visible, .offen h4:focus-visible, .offen h5:focus-visible { outline: 3px solid var(--fokus); outline-offset: 2px; }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .zaehler { margin: 0; font-weight: 600; }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .fehl::before { content: '! '; }
  .angaben { display: grid; grid-template-columns: max-content 1fr; gap: var(--a1) var(--a3); margin: 0; font-size: var(--gr-klein); }
  .angaben dt { font-weight: 600; color: var(--tinte-2); }
  .angaben dd { margin: 0; overflow-wrap: anywhere; }
  .regeln { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .regeln legend { font-weight: 600; padding: 0 var(--a1); }
  .seiten { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; }
  .seiten select, .edit select, .edit textarea { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a1) var(--a3); box-sizing: border-box; }
  .edit textarea { width: 100%; padding: var(--a2) var(--a3); }
  .regeln textarea { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); width: 100%; padding: var(--a2) var(--a3); box-sizing: border-box; }
  .regeln textarea:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  .edit textarea:focus-visible, .edit select:focus-visible, .seiten select:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  .eingabe label { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
  .beitrag { border: 1px solid var(--linie); border-inline-start: 6px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); display: flex; flex-direction: column; gap: var(--a2); }
  .beitrag.laeuft { border-inline-start-color: var(--akzent); border-inline-start-style: double; border-inline-start-width: 8px; }
  .beitrag.bearb { border-color: var(--linie-stark); }
  .bkopf { display: flex; gap: var(--a3); align-items: baseline; }
  .lauf { font-size: var(--gr-klein); font-weight: 700; border: 1px solid var(--akzent); border-radius: var(--r-klein); padding: 0 var(--a2); }
  .btext { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .leer { color: var(--tinte-2); font-style: italic; }
  .edit { display: flex; flex-direction: column; gap: var(--a3); }
</style>
