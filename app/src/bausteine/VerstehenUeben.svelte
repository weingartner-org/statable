<script lang="ts" module>
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { Frage, Gemischt, Thema, ThemaModul, Antwortstand } from '../lernen/fragen';
  /** Die laufende Runde überlebt den Sprung in die Hilfe und zurück; die Themenübersicht beendet sie. Nichts davon wird gespeichert. */
  let gemerkt: { schluessel: string; thema?: Thema; modul: ThemaModul; runde: Frage[]; nr: number; misch: Gemischt[]; gewaehlt: number | null; haken: number[]; geprueft: boolean; erg: Antwortstand[]; phase: 'frage' | 'ende' } | undefined;
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import { L, Lp, waehle, aktuelleSprache } from '../lib/sitzung.svelte';
  import { dez } from '../i18n/profil';
  import { VERFAHREN } from '../lib/verfahren';
  import { artikelModul } from '../hilfe/artikel-laden';
  import { suche } from '../hilfe/suche';
  import type { Artikel } from '../hilfe/kern';
  import { zufall } from '../lib/zufall';
  import { verzoegert } from '../lib/laedt.svelte';
  import Rechnet from './Rechnet.svelte';
  import ArtikelBloecke from './ArtikelBloecke.svelte';
  import FrageDiagramm from './FrageDiagramm.svelte';
  import type { Block } from '../hilfe/kern';
  import { SEITE } from '../lernen/fragen-seite';
  import TextMitItems from './TextMitItems.svelte';
  import { teileItems, type TextTeil } from '../lib/item-liste';
  import { ZELLEN } from '../lernen/fragen-zellen';
  import {
    sichtbareThemen, THEMEN, ladeThema, ladeAuswahl, baueRunde, mischeAntworten, falscheNochEinmal, istRichtig, zaehleRichtig, eingeschaetzt,
    type Tabelle, type Diagramm
  } from '../lernen/fragen';

  /**
   * Üben: Fragen mit Erklärung (Fachblatt UEBEN-MC.md). `thema` kommt aus `#verstehen/ueben/<thema>`; leer = Suche und Themen. Nichts wird gespeichert.
   * `auswahl`: stattdessen genau diese Fragen (zum Beispiel die einer Lerneinheit, aus einem oder mehreren Themenmodulen), in ihrer Reihenfolge und ohne Themenübersicht.
   * `beiAntwort` meldet jede beantwortete Frage nach außen.
   */
  let { thema = '', auswahl, beiAntwort, seite = $bindable() }: { thema?: string; auswahl?: { id: string; titel: string; themen: string[]; ids: string[] }; beiAntwort?: (frage: Frage, richtig: boolean) => void; seite?: { id: string; titel: string } } = $props();

  const sp = $derived(aktuelleSprache());
  const zeit = () => (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;

  // ---- Hilfe-Artikel (für Suche und Links), erst bei Bedarf ----
  let liste = $state<Artikel[]>([]);
  let listeFuer = $state('');
  let listeLaedt = $state(false);
  const ladeListe = async () => {
    if (listeFuer === sp) return;
    listeLaedt = true;
    try { const m = await artikelModul(sp); liste = m.artikelListe(sp); listeFuer = sp; } catch { /* Links bleiben dann ohne Titel */ } finally { listeLaedt = false; }
  };
  /** Der Name der Rechenkarte, wie er in „Neue Auswertung“ steht (nie die Kennung). */
  const karteName = (id: string) => VERFAHREN.find(v => v.id === id)?.titel ?? '';
  /** Quellen für Lesende: Kennungen aus der Wissensdatei (`wissen:…`) sind keine Quelle; „u. a.“ und „und“ in der Sprache der Oberfläche. */
  const belegZeile = (b: string[]) => b.filter(x => !x.startsWith('wissen:')).map(x => x.replace(/ u\. a\./g, ' ' + L('u. a.', 'et al.')).replace(/ und /g, ' ' + L('und', 'and') + ' ')).join('; ');
  const titelVon = (id: string) => liste.find(a => a.id === id)?.titel ?? id;

  // ---- Suche und Themen ----
  let frage = $state('');
  const themen = $derived(sichtbareThemen());
  const alsArtikel = (t: Thema): Artikel => ({ id: t.id, bereich: 'verstehen', titel: `${waehle(t.alltag)} ${waehle(t.fach)}`, stichwoerter: [t.id], inhalt: [], verwandt: [] });
  const gefunden = $derived.by(() => {
    const q = frage.trim();
    if (!q) return themen;
    const ids = new Set<string>();
    for (const h of suche(themen.map(alsArtikel), q, sp)) ids.add(h.artikel.id);
    for (const h of suche(liste, q, sp)) for (const t of themen) if (t.hilfe.includes(h.artikel.id)) ids.add(t.id);
    return themen.filter(t => ids.has(t.id));
  });
  $effect(() => { if (frage.trim()) void ladeListe(); });

  // ---- Runde ----
  type Phase = 'waehlen' | 'laedt' | 'frage' | 'ende' | 'fehler';
  let phase = $state<Phase>('waehlen');
  let modul = $state<ThemaModul>();
  let aktThema = $state<Thema>();
  let runde = $state<Frage[]>([]);
  let nr = $state(0);
  let misch = $state<Gemischt[]>([]);
  let gewaehlt = $state<number | null>(null);
  /** „Mehrere möglich“: die Plätze der Aussagen, die als „stimmt“ angehakt sind, und ob schon geprüft wurde. */
  let haken = $state<number[]>([]);
  let geprueft = $state(false);
  let erg = $state<Antwortstand[]>([]);
  const f = $derived(runde[nr]);
  /** Die Frage ist beantwortet: bei einer Antwort mit der Wahl, bei „mehrere möglich“ mit dem Prüfen. */
  const beantwortet = $derived(f?.mehrfach ? geprueft : gewaehlt !== null);
  const nochmal = $derived(falscheNochEinmal(erg));
  const laedtAn = verzoegert(() => phase === 'laedt');
  let kopfEl = $state<HTMLElement>();
  let rueckEl = $state<HTMLElement>();
  let endeEl = $state<HTMLElement>();

  function zeige(i: number) {
    nr = i; gewaehlt = null; haken = []; geprueft = false;
    misch = mischeAntworten(runde[i]!, zufall(zeit()));
    tick().then(() => kopfEl?.focus({ preventScroll: true }));
  }
  function starte(fragen: Frage[]) {
    runde = fragen; erg = []; phase = 'frage'; zeige(0);
  }
  async function oeffne(id: string) {
    const t = THEMEN.find(x => x.id === id && x.n > 0);
    if (!t) { phase = 'waehlen'; return; }
    if (gemerkt?.schluessel === id) {
      ({ modul, runde, nr, misch, gewaehlt, haken, geprueft, erg, phase } = gemerkt); aktThema = t; void ladeListe();
      tick().then(() => (phase === 'ende' ? endeEl : beantwortet ? rueckEl : kopfEl)?.focus({ preventScroll: true }));
      return;
    }
    aktThema = t; phase = 'laedt';
    try {
      const [m] = await Promise.all([ladeThema(id), ladeListe()]);
      if (thema !== id) return;
      modul = m; starte(baueRunde(m.FRAGEN, zufall(zeit())));
    } catch { if (thema === id) phase = 'fehler'; }
  }
  /** Eine Auswahl von Fragen (Lerneinheit): alle, in der Reihenfolge der Auswahl. */
  async function oeffneAuswahl(a: NonNullable<typeof auswahl>) {
    aktThema = undefined;
    if (gemerkt?.schluessel === `a:${a.id}`) {
      ({ modul, runde, nr, misch, gewaehlt, haken, geprueft, erg, phase } = gemerkt); void ladeListe();
      tick().then(() => (phase === 'ende' ? endeEl : beantwortet ? rueckEl : kopfEl)?.focus({ preventScroll: true }));
      return;
    }
    phase = 'laedt';
    try {
      const [m] = await Promise.all([ladeAuswahl(a.themen, a.ids), ladeListe()]);
      if (auswahl?.id !== a.id) return;
      modul = m; starte(m.FRAGEN);
    } catch { if (auswahl?.id === a.id) phase = 'fehler'; }
  }
  $effect(() => { const t = thema, a = auswahl; if (a) void oeffneAuswahl(a); else if (t) void oeffne(t); else { phase = 'waehlen'; aktThema = undefined; gemerkt = undefined; } });
  $effect(() => { if ((aktThema || auswahl) && modul && (phase === 'frage' || phase === 'ende')) gemerkt = { schluessel: auswahl ? `a:${auswahl.id}` : aktThema!.id, thema: aktThema, modul, runde, nr, misch, gewaehlt, haken, geprueft, erg, phase }; });

  // ---- Erklärung zur Frage: am Rand, wo der Rand fehlt (schmale Fenster) unter der Frage ----
  const seiteId = $derived(phase === 'frage' && f ? SEITE[f.id] : undefined);
  $effect(() => { seite = seiteId ? { id: seiteId, titel: titelVon(seiteId) } : undefined; return () => { seite = undefined; }; });
  let seiteBloecke = $state<Block[]>([]);
  $effect(() => {
    const id = seiteId, s2 = sp; let gilt = true;
    if (!id) { seiteBloecke = []; return; }
    artikelModul(s2).then(m => { if (gilt) seiteBloecke = m.artikelTeile(id, ['kurz'], s2); }).catch(() => { if (gilt) seiteBloecke = []; });
    return () => { gilt = false; };
  });
  /** Zuerst die Erklärung zur Frage, dann die übrigen Hilfe-Links, ohne Doppelte. */
  const hilfeLinks = (x: Frage) => [...new Set([...(SEITE[x.id] ? [SEITE[x.id]!] : []), ...x.hilfe])];

  function waehleAntwort(g: Gemischt) {
    if (gewaehlt !== null || !f || f.mehrfach) return;
    gewaehlt = g.nr;
    erg = [...erg, { frage: f, gewaehlt: g.nr }];
    beiAntwort?.(f, !!g.a.richtig);
    tick().then(() => rueckEl?.focus({ preventScroll: false }));
  }
  /** „Mehrere möglich“: Aussage an- oder abhaken, solange nicht geprüft ist. */
  function schalte(nrAussage: number) {
    if (geprueft || !f?.mehrfach) return;
    haken = haken.includes(nrAussage) ? haken.filter(x => x !== nrAussage) : [...haken, nrAussage];
  }
  /** „Prüfen“ geht auch ohne Haken: dann gilt jede Aussage als „stimmt nicht“. */
  function pruefe() {
    if (geprueft || !f?.mehrfach) return;
    geprueft = true;
    const wahl = [...haken].sort((a, b) => a - b);
    erg = [...erg, { frage: f, gewaehlt: wahl }];
    beiAntwort?.(f, istRichtig({ frage: f, gewaehlt: wahl }));
    tick().then(() => rueckEl?.focus({ preventScroll: false }));
  }
  function weiter() {
    if (nr + 1 < runde.length) zeige(nr + 1);
    else { phase = 'ende'; tick().then(() => endeEl?.focus()); }
  }
  const nochEinmal = () => starte(nochmal);
  const neueRunde = () => modul && starte(auswahl ? modul.FRAGEN : baueRunde(modul.FRAGEN, zufall(zeit())));

  /** Zifferntasten 1 bis 5 und Eingabe gelten nur, solange der Fokus in der Frage steht (WCAG 2.1.4: kein Kürzel aus einer einzelnen Taste im ganzen Fenster).
   *  Der Handler hängt darum am Fragebereich, nicht am Fenster. */
  const taste = (e: KeyboardEvent) => {
    if (phase !== 'frage' || beantwortet || e.ctrlKey || e.metaKey || e.altKey) return;
    const z = e.target as HTMLElement | null;
    const kasten = z instanceof HTMLInputElement && z.type === 'checkbox';
    if (z && (z.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(z.tagName) && !kasten))) return;
    if (f?.mehrfach) {
      // Tasten 1 bis 4 schalten die Aussagen um, Eingabe prüft (auf dem Knopf „Prüfen“ löst Eingabe ihn selbst aus).
      const k = ['1', '2', '3', '4'].indexOf(e.key);
      if (k >= 0 && misch[k]) { e.preventDefault(); schalte(misch[k]!.nr); }
      else if (e.key === 'Enter' && !(z && /^(BUTTON|A)$/.test(z.tagName))) { e.preventDefault(); pruefe(); }
      return;
    }
    const i = ['1', '2', '3', '4', '5'].indexOf(e.key);
    if (i >= 0 && misch[i]) { e.preventDefault(); waehleAntwort(misch[i]!); }
  };

  // ---- Anzeige ----
  /** Zahl im Format der Sprache, Text der Zeile aus ZELLEN (Zeilenbeschriftungen in jeder Sprache), sonst unverändert (Namen aus den Daten). */
  const zelle = (v: string | number) => (typeof v === 'number' ? dez(String(v)) : /^<?-?\d*\.\d+$/.test(v) ? dez(v) : Object.hasOwn(ZELLEN, v) ? waehle(ZELLEN[v]!) : v);
  const tabellen = $derived<Tabelle[]>(f ? [...(f.fall ? (modul?.FAELLE?.[f.fall]?.tabellen ?? []) : []), ...(f.tabelle ? [f.tabelle] : [])] : []);
  /** Diagramme der Fallreihe (`FAELLE[fall].diagramme`) und der Frage selbst, nach den Tabellen. */
  /** Stamm mit Aufzählung von Fragen: Überschrift bis zur Liste, danach Liste und Rest (Johannes 13.11.2026). */
  const stammTeile = $derived.by(() => {
    const t = f ? teileItems(waehle(f.stamm)) : [];
    const erst = t[0];
    return t.length > 1 && erst?.art === 'text' ? { kopf: erst.t, rest: t.slice(1) } : { kopf: f ? waehle(f.stamm) : '', rest: [] as TextTeil[] };
  });
  const diagramme = $derived<Diagramm[]>(f ? [...(f.fall ? (modul?.FAELLE?.[f.fall]?.diagramme ?? []) : []), ...(f.diagramm ? [f.diagramm] : [])] : []);
  const richtigeAntwort = $derived(f?.antworten.find(a => a.richtig));
  const gewaehlteAntwort = $derived(f && gewaehlt !== null ? f.antworten[gewaehlt] : undefined);
  const stimmt = $derived(!!gewaehlteAntwort?.richtig);
  /** „Mehrere möglich“: je aussage (Platz in der Fragedatei), ob richtig eingeschätzt; und wie viele. */
  const richtigEingeschaetzt = $derived(f?.mehrfach ? eingeschaetzt(f, haken) : []);
  const zahlEingeschaetzt = $derived(richtigEingeschaetzt.filter(Boolean).length);
</script>

{#if phase === 'waehlen'}
  <div class="ue-suche">
    <label for="ue-suche">{L('Thema suchen', 'Search for a topic')}</label>
    <input id="ue-suche" type="search" bind:value={frage} autocomplete="off" spellcheck="false"
      placeholder={L('z. B. „Faktorenanalyse“ oder „Ist mein Fragebogen verlässlich?“', 'e.g. "factor analysis" or "is my questionnaire reliable?"')} />
  </div>
  <p class="nur-vorleser" use:ergebnisAnsage>{frage.trim() ? Lp(gefunden.length, `${gefunden.length} Thema`, `${gefunden.length} Themen`, `${gefunden.length} topic`, `${gefunden.length} topics`) : ''}</p>
  {#if gefunden.length}
    <ul class="vst-kacheln ue-themen" aria-label={L('Themen', 'Topics')}>
      {#each gefunden as t (t.id)}
        <li class="vst-kachel">
          <div class="vst-kachel-kopf"><h2>{waehle(t.alltag)}</h2></div>
          <p>{waehle(t.fach)} · {Lp(t.n, `${t.n} Frage`, `${t.n} Fragen`, `${t.n} question`, `${t.n} questions`)}</p>
          <a class="k" href="#verstehen/ueben/{t.id}">{L('Üben', 'Practise')}<span class="nur-vorleser"> {waehle(t.fach)}</span></a>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="leise-text">{frage.trim() ? L('Dazu gibt es noch keine Fragen. Ein Oberbegriff kann helfen.', 'There are no questions on this yet. A broader term may help.') : L('Noch keine Fragen vorhanden.', 'No questions yet.')}</p>
  {/if}
{:else if phase === 'laedt'}
  <p role="status">{#if laedtAn.an}<Rechnet text={L('Fragen werden geladen …', 'Loading questions …')} />{/if}</p>
{:else if phase === 'fehler'}
  <p role="alert">{L('Die Fragen konnten nicht geladen werden (kein Netz?).', 'The questions could not be loaded (no connection?).')} <button type="button" class="k leise" onclick={() => (auswahl ? oeffneAuswahl(auswahl) : oeffne(thema))}>{L('Nochmal versuchen', 'Try again')}</button></p>
{:else if phase === 'frage' && f}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <section class="ue-frage" aria-label={L('Frage', 'Question')} onkeydown={taste}>
    <p class="ue-lauf">{aktThema ? waehle(aktThema.fach) + ' · ' : auswahl ? auswahl.titel + ' · ' : ''}{L(`Frage ${nr + 1} von ${runde.length}`, `Question ${nr + 1} of ${runde.length}`)}</p>
    <div class="ue-spalten" class:mit-material={tabellen.length > 0 || diagramme.length > 0}><div class="ue-material">
    {#if f.fall && modul?.FAELLE?.[f.fall]}<TextMitItems klasse="ue-fall" text={waehle(modul.FAELLE[f.fall]!.titel)} />{/if}
    {#each tabellen as t, ti}
      <figure class="ue-tab">
        <div class="ue-tab-rahmen"><table aria-labelledby={t.titel ? undefined : `ue-tq-${ti}`}>
          {#if t.titel}<caption>{waehle(t.titel)}</caption>{/if}
          <thead><tr>{#each t.kopf as k}<th scope="col">{waehle(k)}</th>{/each}</tr></thead>
          <tbody>{#each t.zeilen as z}<tr>{#each z as c, i}{#if i === 0}<th scope="row">{zelle(c)}</th>{:else}<td>{zelle(c)}</td>{/if}{/each}</tr>{/each}</tbody>
        </table></div>
        <figcaption id="ue-tq-{ti}">{waehle(t.quelle)}</figcaption>
      </figure>
    {/each}
    {#each diagramme as dg}<FrageDiagramm d={dg} />{/each}
    </div><div class="ue-arbeit">
    <h2 id="ue-stamm" class="ue-stamm" tabindex="-1" bind:this={kopfEl}>{stammTeile.kopf}</h2>
    {#if stammTeile.rest.length}<TextMitItems klasse="ue-stamm-rest" id="ue-stamm-rest" teile={stammTeile.rest} />{/if}
    {#if f.mehrfach}
      <fieldset class="ue-aussagen" aria-labelledby={stammTeile.rest.length ? 'ue-stamm ue-stamm-rest' : 'ue-stamm'} aria-describedby="ue-legende">
        <legend id="ue-legende" class="nur-vorleser">{L('Aussagen: Haken setzen, was stimmt', 'Statements: tick those that are correct')}</legend>
        {#each misch as g, i (g.nr)}
          {@const an = haken.includes(g.nr)}
          <div class="ue-aussage" class:geprueft class:ok={geprueft && richtigEingeschaetzt[g.nr]} class:daneben={geprueft && !richtigEingeschaetzt[g.nr]}>
            <input type="checkbox" id="ue-aussage-{g.nr}" checked={an} disabled={geprueft} onchange={() => schalte(g.nr)} />
            <label for="ue-aussage-{g.nr}"><kbd aria-hidden="true">{i + 1}</kbd><span>{waehle(g.a.text)}</span></label>
            {#if geprueft}
              <div class="ue-urteil">
                <p><b>{g.a.richtig ? L('Die Aussage stimmt.', 'The statement is correct.') : L('Die Aussage stimmt nicht.', 'The statement is not correct.')}</b>
                  {richtigEingeschaetzt[g.nr] ? L('Richtig eingeschätzt.', 'Judged correctly.') : an ? L('Falsch eingeschätzt: angehakt, aber sie stimmt nicht.', 'Judged wrongly: ticked, but it is not correct.') : L('Falsch eingeschätzt: nicht angehakt, aber sie stimmt.', 'Judged wrongly: not ticked, but it is correct.')}</p>
                <p>{waehle(g.a.warum)}</p>
              </div>
            {/if}
          </div>
        {/each}
      </fieldset>
      {#if !geprueft}<div><button type="button" class="k haupt" onclick={pruefe}>{L('Prüfen', 'Check')}</button></div>{/if}
    {:else}
    <ul class="ue-antworten" aria-labelledby={stammTeile.rest.length ? 'ue-stamm ue-stamm-rest' : 'ue-stamm'}>
      {#each misch as g, i (g.nr)}
        {@const gew = gewaehlt === g.nr}
        <li><button type="button" class="ue-antwort" class:richtig={gewaehlt !== null && !!g.a.richtig} class:falsch={gew && !g.a.richtig}
          aria-disabled={gewaehlt !== null} aria-pressed={gewaehlt !== null ? gew : undefined} onclick={() => waehleAntwort(g)}>
          <kbd aria-hidden="true">{i + 1}</kbd><span>{waehle(g.a.text)}</span>
          {#if gewaehlt !== null && g.a.richtig}<span class="nur-vorleser"> ({L('richtig', 'correct')})</span>{:else if gew}<span class="nur-vorleser"> ({L('falsch', 'wrong')})</span>{/if}
        </button></li>
      {/each}
    </ul>
    {/if}
    {#if seiteId && seiteBloecke.length}
      <p class="ue-seite-hinweis nur-vorleser">{L('Erklärung dazu in der Seitenleiste: ', 'Explanation in the side panel: ')}{titelVon(seiteId)}</p>
      <details class="ue-seite auf"><summary>{L('Erklärung: ', 'Explanation: ')}{titelVon(seiteId)}</summary><ArtikelBloecke bloecke={seiteBloecke} /></details>
    {/if}
    {#if f.mehrfach}
      {#if geprueft}
        <div class="ue-rueck" class:ok={zahlEingeschaetzt === f.antworten.length} role="region" aria-labelledby="ue-rueck-m-t">
          <h3 id="ue-rueck-m-t" tabindex="-1" bind:this={rueckEl}>{L(`${zahlEingeschaetzt} von ${f.antworten.length} Aussagen richtig eingeschätzt`, `${zahlEingeschaetzt} of ${f.antworten.length} statements judged correctly`)}</h3>
          <p>{zahlEingeschaetzt === f.antworten.length ? L('Die Frage zählt als richtig.', 'The question counts as correct.') : L('Die Frage zählt erst als richtig, wenn alle Aussagen richtig eingeschätzt sind.', 'The question only counts as correct when all statements are judged correctly.')}</p>
          <p class="ue-links">
            {#each hilfeLinks(f) as h}<a href="#hilfe/{h}">{L('Hilfe: ', 'Help: ')}{titelVon(h)}</a>{/each}
            {#if f.karte && karteName(f.karte)}<a href="#blatt/neu">{L('Rechenkarte in Statable: ', 'Calculation card in Statable: ')}{karteName(f.karte)}</a>{/if}
            {#if f.probieren}<a href="#verstehen/{f.probieren}">{L('Ausprobieren', 'Try it out')}</a>{/if}
          </p>
          {#if belegZeile(f.belege)}<p class="ue-belege">{L('Beleg: ', 'Source: ')}{belegZeile(f.belege)}</p>{/if}
          <button type="button" class="k haupt" onclick={weiter}>{nr + 1 < runde.length ? L('Nächste Frage', 'Next question') : L('Zum Ergebnis', 'To the result')}</button>
        </div>
      {/if}
    {/if}
    {#if !f.mehrfach && gewaehlt !== null && richtigeAntwort && gewaehlteAntwort}
      <div class="ue-rueck" class:ok={stimmt} role="region" aria-labelledby="ue-rueck-t">
        <h3 id="ue-rueck-t" tabindex="-1" bind:this={rueckEl}>{stimmt ? L('Richtig.', 'Correct.') : L('Falsch.', 'Wrong.')}</h3>
        {#if stimmt}
          <p>{waehle(richtigeAntwort.warum)}</p>
        {:else}
          <p><b>{L('Richtig ist:', 'Correct is:')}</b> {waehle(richtigeAntwort.text)}</p>
          <p>{waehle(richtigeAntwort.warum)}</p>
          <p><b>{L('Diese Antwort stimmt so nicht:', 'This answer does not hold:')}</b> {waehle(gewaehlteAntwort.warum)}</p>
        {/if}
        <p class="ue-links">
          {#each hilfeLinks(f) as h}<a href="#hilfe/{h}">{L('Hilfe: ', 'Help: ')}{titelVon(h)}</a>{/each}
          {#if f.karte && karteName(f.karte)}<a href="#blatt/neu">{L('Rechenkarte in Statable: ', 'Calculation card in Statable: ')}{karteName(f.karte)}</a>{/if}
          {#if f.probieren}<a href="#verstehen/{f.probieren}">{L('Ausprobieren', 'Try it out')}</a>{/if}
        </p>
        {#if belegZeile(f.belege)}<p class="ue-belege">{L('Beleg: ', 'Source: ')}{belegZeile(f.belege)}</p>{/if}
        <button type="button" class="k haupt" onclick={weiter}>{nr + 1 < runde.length ? L('Nächste Frage', 'Next question') : L('Zum Ergebnis', 'To the result')}</button>
      </div>
    {/if}
    </div></div>
  </section>
{:else if phase === 'ende'}
  <section class="ue-ende" aria-label={L('Ergebnis der Runde', 'Result of the round')}>
    <h2 id="ue-ende-t" tabindex="-1" bind:this={endeEl}>{L(`${zaehleRichtig(erg)} von ${erg.length} richtig`, `${zaehleRichtig(erg)} of ${erg.length} correct`)}</h2>
    {#if nochmal.length}
      <h3>{L('Das war falsch', 'These were wrong')}</h3>
      <ol class="ue-fehler">
        {#each erg.filter(x => !istRichtig(x)) as x (x.frage.id)}
          <li>
            <TextMitItems klasse="ue-rueck-stamm" text={waehle(x.frage.stamm)} />
            {#if typeof x.gewaehlt === 'number'}
              <p>{L('Gewählt: ', 'Chosen: ')}{waehle(x.frage.antworten[x.gewaehlt]!.text)}</p>
              <p>{L('Irrtum: ', 'Mistake: ')}{waehle(x.frage.antworten[x.gewaehlt]!.warum)}</p>
            {:else}
              {@const wahl = x.gewaehlt}
              {#each eingeschaetzt(x.frage, wahl) as ok, k}{#if !ok}
                <p>{x.frage.antworten[k]!.richtig ? L('Nicht angehakt, aber sie stimmt: ', 'Not ticked, but it is correct: ') : L('Angehakt, aber sie stimmt nicht: ', 'Ticked, but it is not correct: ')}{waehle(x.frage.antworten[k]!.text)}</p>
                <p>{L('Warum: ', 'Why: ')}{waehle(x.frage.antworten[k]!.warum)}</p>
              {/if}{/each}
            {/if}
            <p class="ue-links">{#each hilfeLinks(x.frage) as h}<a href="#hilfe/{h}">{L('Hilfe: ', 'Help: ')}{titelVon(h)}</a>{/each}</p>
          </li>
        {/each}
      </ol>
    {/if}
    <div class="ue-knoepfe">
      {#if nochmal.length}<button type="button" class="k haupt" onclick={nochEinmal}>{L('Falsche noch einmal', 'Redo the wrong ones')}</button>{/if}
      <button type="button" class="k" onclick={neueRunde}>{auswahl ? L('Alle noch einmal', 'All again') : L('Neue Runde', 'New round')}</button>
      {#if !auswahl}<a class="k leise" href="#verstehen/ueben">{L('Andere Themen', 'Other topics')}</a>{/if}
    </div>
  </section>
{/if}

<style>
  .ue-suche { display: grid; gap: var(--a1); margin-bottom: var(--a3); }
  .ue-suche label { font-weight: 650; }
  .ue-suche input { width: 100%; min-height: 44px; padding: 0 var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); font: 400 var(--gr-text)/1.2 var(--schrift-ui); }
  .leise-text, .ue-lauf, .ue-belege { color: var(--tinte-2); }
  .ue-lauf, .ue-belege { font-size: var(--gr-klein); }
  /* Im DOM steht der Hinweis vor den Antworten (Screenreader lesen ihn beim Erreichen der Frage); sehende Nutzer sehen ihn weiter darunter. */
  :global(.ue-fall) { font-weight: 650; margin: 0 0 var(--a2); }
  :global(.ue-fall li), :global(.ue-stamm-rest li) { font-weight: 400; }
  :global(.ue-stamm-rest) { font: 650 var(--gr-h2)/1.35 var(--schrift-ui); margin-top: var(--a2); }
  :global(.ue-stamm-rest ul) { font-size: var(--gr-text, 1rem); }
  :global(.ue-rueck-stamm > p) { font-weight: 700; }
  .ue-frage { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--a3); container-type: inline-size; }
  .ue-frage > .ue-lauf, .ue-material, .ue-arbeit { max-width: var(--breite-text); }
  .ue-spalten, .ue-material, .ue-arbeit { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--a3); align-content: start; min-width: 0; }
  /* Breit genug: Fall, Tabelle und Diagramm links, Frage, Antworten und Rückmeldung rechts - die Tabelle bleibt beim Antworten sichtbar. Reihenfolge im Code unverändert. */
  @container (min-width: calc(2 * 50ch + 3rem)) { .ue-spalten.mit-material { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: var(--a6); align-items: start; } }
  .ue-stamm { font: 650 var(--gr-h2)/1.35 var(--schrift-ui); margin: 0; }
  .ue-stamm:focus-visible, .ue-rueck h3:focus-visible, .ue-ende h2:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; border-radius: 4px; }
  .ue-aussagen { border: 0; margin: 0; padding: 0; display: grid; gap: var(--a2); min-width: 0; }
  .ue-aussage { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--a1) var(--a3); align-items: start; padding: var(--a3) var(--a4); border: 1px solid var(--linie-stark); border-radius: var(--r-gross); background: var(--blatt); }
  .ue-aussage input { width: 22px; height: 22px; margin: 2px 0 0; accent-color: var(--akzent); }
  .ue-aussage input:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
  .ue-aussage label { display: flex; gap: var(--a3); align-items: flex-start; cursor: pointer; }
  .ue-aussage label kbd { flex: none; border: 1px solid var(--linie-stark); border-radius: 4px; padding: 0 7px; font-weight: 600; color: var(--tinte-2); }
  .ue-aussage.geprueft label { cursor: default; }
  .ue-aussage.ok { border-color: var(--akzent); border-width: 2px; }
  .ue-aussage.daneben { border-style: dashed; border-width: 2px; }
  .ue-urteil { grid-column: 2; display: grid; gap: var(--a1); }
  .ue-urteil p { margin: 0; }
  .ue-tab { margin: 0; }
  .ue-tab-rahmen { overflow-x: auto; }
  .ue-tab table { border-collapse: collapse; font-variant-numeric: tabular-nums; }
  .ue-tab th, .ue-tab td { padding: var(--a1) var(--a3); border-bottom: 1px solid var(--linie); text-align: right; }
  .ue-tab th[scope='row'], .ue-tab thead th:first-child { text-align: start; }
  .ue-tab caption { text-align: start; font-weight: 650; padding-bottom: var(--a1); max-width: 100cqi; position: sticky; inset-inline-start: 0; }   /* breite Tabelle am Handy: Überschrift bricht in der sichtbaren Breite um und bleibt beim seitlichen Scrollen stehen */
  .ue-tab figcaption { font-size: var(--gr-klein); color: var(--tinte-2); margin-top: var(--a1); }
  ul { list-style: none; margin: 0; padding: 0; }
  .ue-antworten { display: grid; gap: var(--a2); }
  .ue-antwort { display: flex; align-items: flex-start; gap: var(--a3); width: 100%; min-height: 56px; padding: var(--a3) var(--a4); border: 1px solid var(--linie-stark); border-radius: var(--r-gross); background: var(--blatt); color: var(--tinte); font: 400 var(--gr-text)/1.4 var(--schrift-ui); text-align: start; cursor: pointer; }
  .ue-antwort:hover { background: var(--akzent-hell); border-color: var(--akzent); }
  .ue-antwort kbd { flex: none; border: 1px solid var(--linie-stark); border-radius: 4px; padding: 0 7px; font-weight: 600; color: var(--tinte-2); }
  .ue-antwort[aria-disabled='true'] { cursor: default; }
  .ue-antwort.richtig { border-color: var(--akzent); border-width: 2px; background: var(--akzent-hell); }
  .ue-antwort.falsch { border-style: dashed; border-width: 2px; }
  .ue-rueck { border: 1px solid var(--linie-stark); border-inline-start: 4px solid var(--linie-stark); border-radius: var(--r-gross); padding: var(--a4); display: grid; gap: var(--a2); justify-items: start; }
  .ue-rueck.ok { border-inline-start-color: var(--akzent); }
  .ue-rueck h3 { margin: 0; font: 650 var(--gr-h2)/1.3 var(--schrift-ui); }
  .ue-rueck p, .ue-fehler p { margin: 0; }
  .ue-links { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); }
  .ue-fehler { display: grid; gap: var(--a4); padding-inline-start: var(--a5); max-width: var(--breite-text); }
  .ue-ende h2 { font: 650 var(--gr-h1)/1.3 var(--schrift-ui); margin: 0 0 var(--a3); }
  .ue-ende h3 { margin: var(--a4) 0 var(--a2); }
  .ue-seite { display: none; }
  :global(:where(:root.eng-700)) .ue-seite { display: block; }
  :global(:where(:root.eng-700)) .ue-seite-hinweis { display: none; }
  .ue-knoepfe { display: flex; flex-wrap: wrap; gap: var(--a3); margin-top: var(--a5); }
</style>
