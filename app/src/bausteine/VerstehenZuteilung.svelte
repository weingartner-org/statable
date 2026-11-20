<script module lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { STARTWERT_ZUTEILUNG } from '../lib/zuteilung';
  /** Die Eingaben bleiben beim Wechsel zur Hilfe und zurück erhalten (Zustand nur im Modul, nie im Projekt). */
  const z = $state({
    modus: 'auswahl' as 'auswahl' | 'zuteilung' | 'verdeckt',
    startwert: String(STARTWERT_ZUTEILUNG),
    quelle: 'zahl' as 'zahl' | 'liste', n: '100', k: '10', liste: '',
    art: 'bloecke' as 'bloecke' | 'feste',
    gruppen: [{ name: 'A', v: '1', g: '10' }, { name: 'B', v: '1', g: '10' }],
    N: '24', bg: '4, 6', aufrunden: false,
    geschichtet: false, sch: [{ name: 'S1', n: '12' }, { name: 'S2', n: '12' }]
  });
</script>
<script lang="ts">
  import { untrack } from 'svelte';
  import { L, melde } from '../lib/sitzung.svelte';
  import { verzoegert } from '../lib/laedt.svelte';
  import { liesZahl } from '../lib/verteilungen';
  import { ganzZahl } from '../i18n/profil';
  import { herunterladen } from '../lib/export';
  import {
    MAX_GRUPPEN, MAX_SCHICHTEN, MIN_GRUPPEN, auswahlCsv, stichprobeAusListe, stichprobeZiehen, vollstaendigCsv, vollstaendigZuteilen, zuteilen, zuteilungCsv,
    type AuswahlAusListe, type StichprobeErgebnis, type ZuteilungErgebnis, type ZuteilungFehler
  } from '../lib/zuteilung';
  import {
    zuteilungAuswahlSatz, zuteilungDoppeltSatz, zuteilungFehlerSatz, zuteilungGerechnet, zuteilungLehrmittelSatz, zuteilungLeerSatz, zuteilungSchichtenSatz, zuteilungStichprobeSatz, zuteilungUnvollstaendigSatz, zuteilungVorhersagSatz, zuteilungWarnSatz
  } from '../lib/zuteilungsaetze';
  import DiagrammExport from './DiagrammExport.svelte';
  import Zuteilungsverlauf from './Zuteilungsverlauf.svelte';
  import Icon from './Icon.svelte';
  import VerstehenVerdeckt from './VerstehenVerdeckt.svelte';
  import Rechnet from './Rechnet.svelte';

  const kennung = $props.id();
  const ZEILEN_MAX = 200;
  /** Schneller 32-Bit-Hash (FNV-1a): erkennt eine Änderung der Liste, ohne den ganzen Text im Schlüssel zu tragen. */
  const kurzHash = (t: string) => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  const sw = $derived(/^\s*\d+\s*$/.test(z.startwert) ? Number(z.startwert) : NaN);
  const ganz = (t: string) => { const v = liesZahl(t); return Number.isInteger(v) ? v : NaN; };
  const bloecke = $derived(z.bg.split(/[;,\s]+/).filter(Boolean).map(Number));

  type Fertig =
    | { art: 'auswahl-zahl'; r: StichprobeErgebnis; n: number; k: number }
    | { art: 'auswahl-liste'; r: AuswahlAusListe; k: number }
    | { art: 'block'; r: ZuteilungErgebnis | ZuteilungFehler; n: number }
    | { art: 'feste'; r: ReturnType<typeof vollstaendigZuteilen>; groessen: number[] };
  const eingabe = $derived(JSON.stringify([z.modus, sw, z.quelle, z.n, z.k, z.quelle === 'liste' && z.modus === 'auswahl' ? z.liste.length + ':' + kurzHash(z.liste) : '', z.art, z.gruppen, z.N, z.bg, z.aufrunden, z.geschichtet, z.sch]));
  let stand = $state.raw<{ eingabe: string; f: Fertig; sw: number } | null>(null);
  let lauf = 0;
  const bereit = $derived(stand?.eingabe === eingabe);
  const animation = verzoegert(() => !bereit);

  function rechne(): Fertig {
    if (z.modus === 'auswahl') {
      const k = ganz(z.k);
      if (z.quelle === 'zahl') { const n = ganz(z.n); return { art: 'auswahl-zahl', r: stichprobeZiehen(n, k, sw), n, k }; }
      return { art: 'auswahl-liste', r: stichprobeAusListe(z.liste, k, sw), k };
    }
    const namen = z.gruppen.map(g => g.name.trim());
    if (z.art === 'feste') { const groessen = z.gruppen.map(g => ganz(g.g)); return { art: 'feste', r: vollstaendigZuteilen({ groessen, gruppen: namen, startwert: sw }), groessen }; }
    const verhaeltnis = z.gruppen.map(g => ganz(g.v));
    const basis = { gruppen: namen, verhaeltnis, blockgroessen: bloecke, startwert: sw, aufrunden: z.aufrunden };
    if (z.geschichtet) return { art: 'block', r: zuteilen({ ...basis, schichten: z.sch.map(s => ({ name: s.name.trim(), n: ganz(s.n) })) }), n: 0 };
    const n = ganz(z.N);
    return { art: 'block', r: zuteilen({ ...basis, n }), n };
  }
  $effect(() => {
    const k = eingabe;
    untrack(() => {
      if (stand?.eingabe === k) return;
      const mein = ++lauf;
      setTimeout(() => { if (mein === lauf) stand = { eingabe: k, f: rechne(), sw }; }, 0);
    });
  });
  /** Das letzte fertige Ergebnis bleibt stehen, bis das neue da ist (kein Flackern beim Tippen). */
  const f = $derived(stand?.f ?? null);
  const swF = $derived(stand?.sw ?? NaN);
  const nGesamt = $derived(f && f.art === 'auswahl-zahl' ? f.n : f && f.art === 'auswahl-liste' && f.r.ok ? f.r.n : 0);

  const hinzu = () => { if (z.gruppen.length < MAX_GRUPPEN) z.gruppen.push({ name: String.fromCharCode(65 + z.gruppen.length), v: '1', g: '10' }); };
  const weg = (i: number) => { if (z.gruppen.length > MIN_GRUPPEN) z.gruppen.splice(i, 1); };
  const schHinzu = () => { if (z.sch.length < MAX_SCHICHTEN) z.sch.push({ name: `S${z.sch.length + 1}`, n: '12' }); };
  const schWeg = (i: number) => { if (z.sch.length > 1) z.sch.splice(i, 1); };
  const summeVerh = $derived(z.gruppen.reduce((a, g) => a + (ganz(g.v) || 0), 0));

  /** Der laufende Unterschied der Gruppengrößen nach jedem Fall, je Schicht (für das Bild). */
  const verlauf = $derived.by(() => {
    if (!f || f.art !== 'block' || !f.r.ok) return null;
    const r = f.r, namen = r.eingabe.gruppen, reihen: { name: string; werte: number[] }[] = [];
    const je = new Map<string, string[]>();
    for (const x of r.liste) { const k = x.schicht ?? ''; if (!je.has(k)) je.set(k, []); je.get(k)!.push(x.gruppe); }
    for (const [name, folge] of je) {
      const c = new Array<number>(namen.length).fill(0), w: number[] = [];
      for (const g of folge) { c[namen.indexOf(g)]!++; w.push(Math.max(...c) - Math.min(...c)); }
      reihen.push({ name: name || L('Liste', 'List'), werte: w });
    }
    const gleich = r.eingabe.verhaeltnis.length === 2 && r.eingabe.verhaeltnis[0] === r.eingabe.verhaeltnis[1];
    return { reihen, grenze: gleich ? Math.max(...r.eingabe.blockgroessen) / 2 : null };
  });
  const unvollstaendig = $derived.by(() => {
    if (!f || f.art !== 'block' || !f.r.ok) return null;
    const r = f.r;
    if (r.eingabe.aufrunden) return null;
    const rest = r.bloecke.some((b, i) => b.groessen.reduce((a, c) => a + c, 0) > r.kontrolle[i]!.jeGruppe.reduce((a, c) => a + c, 0));
    return rest ? Math.max(...r.kontrolle.map(k => k.maxAbweichung)) : null;
  });
  const schichtHinweis = $derived.by(() => {
    if (!f || f.art !== 'block' || !f.r.ok || !f.r.eingabe.schichten) return false;
    const r = f.r, groesste = Math.max(...r.eingabe.blockgroessen);
    return r.kontrolle.length >= MAX_SCHICHTEN || r.kontrolle.some(k => k.jeGruppe.reduce((a, c) => a + c, 0) < groesste);
  });

  function csvText(): string {
    if (!f) return '';
    if (f.art === 'auswahl-zahl' && f.r.ok) return auswahlCsv({ gezogen: f.r.gezogen.map(String), n: f.n, k: f.k }, { startwert: swF });
    if (f.art === 'auswahl-liste' && f.r.ok) return auswahlCsv({ gezogen: f.r.gezogen, n: f.r.n, k: f.k }, { startwert: swF });
    if (f.art === 'block' && f.r.ok) return zuteilungCsv(f.r, { startwert: swF });
    if (f.art === 'feste' && f.r.ok) return vollstaendigCsv({ liste: f.r.liste, groessen: f.groessen }, { startwert: swF });
    return '';
  }
  const dateiName = () => `${z.modus === 'auswahl' ? L('Zufallsauswahl', 'Random-selection') : L('Zuteilungsliste', 'Allocation-list')}-${swF}.csv`;
  function speichern() { const t = csvText(); if (!t) return; herunterladen(new TextEncoder().encode('﻿' + t), dateiName(), 'text/csv;charset=utf-8'); melde(L('CSV-Datei gespeichert. Sie liegt bei den Downloads.', 'CSV file saved. You will find it in your downloads.')); }
  async function kopieren() { const t = csvText(); if (!t) return; try { await navigator.clipboard.writeText(t); melde(L('Die Liste ist in der Zwischenablage.', 'The list is on the clipboard.')); } catch { melde(L('Kopieren war nicht möglich. Bitte die CSV-Datei speichern.', 'Copying was not possible. Please save the CSV file.')); } }
  const kannExportieren = $derived(!!f && ((f.art === 'auswahl-zahl' && f.r.ok) || (f.art === 'auswahl-liste' && f.r.ok) || (f.art === 'block' && f.r.ok) || (f.art === 'feste' && f.r.ok)));
</script>

{#if z.modus !== 'verdeckt'}<div class="banner ruhig vst-hinweis" role="note" style="margin-bottom:var(--a4)"><Icon n="hinweis" /><p><b>{zuteilungLehrmittelSatz()}.</b> {zuteilungWarnSatz()}</p></div>{/if}

<div class="vst-raster">
  <div class="vst-links">
    <fieldset class="vst-gruppe"><legend>{L('1  Was soll geschehen?', '1  What should happen?')}</legend>
      <div class="vst-wahl" role="radiogroup" aria-label={L('Auswahl oder Zuteilung', 'Selection or allocation')} style="grid-template-columns:1fr">
        <label data-begriff="einfache-zufallsstichprobe"><input type="radio" name="vz-modus" value="auswahl" bind:group={z.modus}><span>{L('Personen aus einer Liste auswählen', 'Select people from a list')} <span class="zeichen">({L('einfache Zufallsstichprobe', 'simple random sample')})</span></span></label>
        <label data-begriff="randomisierung"><input type="radio" name="vz-modus" value="zuteilung" bind:group={z.modus}><span>{L('Personen auf Gruppen verteilen', 'Distribute people to groups')} <span class="zeichen">({L('Zuteilungsliste', 'allocation list')})</span></span></label>
        <label><input type="radio" name="vz-modus" value="verdeckt" bind:group={z.modus}><span>{L('Personen nacheinander verdeckt zuteilen', 'Allocate people one after another, concealed')} <span class="zeichen">({L('Liste bleibt verborgen', 'list stays hidden')})</span></span></label>
      </div>
      <span class="hilfe">{zuteilungStichprobeSatz()}</span>
    </fieldset>

    {#if z.modus === 'verdeckt'}
      <VerstehenVerdeckt />
    {:else if z.modus === 'auswahl'}
      <fieldset class="vst-gruppe"><legend>{L('2  Die Liste', '2  The list')}</legend>
        <div class="segment" role="radiogroup" aria-label={L('Woraus wird ausgewählt?', 'What is selected from?')}>
          <label><input type="radio" name="vz-quelle" value="zahl" bind:group={z.quelle}>{L('Nummern 1 bis N', 'Numbers 1 to N')}</label>
          <label><input type="radio" name="vz-quelle" value="liste" bind:group={z.quelle}>{L('Eigene Liste einfügen', 'Paste your own list')}</label>
        </div>
        <div class="vst-paar">
          {#if z.quelle === 'zahl'}<div class="eingabe"><label for="vz-n-{kennung}">{L('Zahl der Fälle N', 'Number of cases N')}</label><input id="vz-n-{kennung}" type="text" inputmode="numeric" autocomplete="off" bind:value={z.n}></div>{/if}
          <div class="eingabe"><label for="vz-k-{kennung}">{L('Wie viele werden ausgewählt? (k)', 'How many are selected? (k)')}</label><input id="vz-k-{kennung}" type="text" inputmode="numeric" autocomplete="off" bind:value={z.k}></div>
        </div>
        {#if z.quelle === 'liste'}
          <div class="eingabe"><label for="vz-liste-{kennung}">{L('Eine Kennung je Zeile', 'One ID per line')}</label>
            <textarea id="vz-liste-{kennung}" rows="8" spellcheck="false" autocomplete="off" bind:value={z.liste} style="font-family:inherit;width:100%"></textarea>
            <span class="hilfe">{L('Die Liste bleibt in diesem Browser; sie wird nirgends gespeichert und nicht in die Adresse geschrieben. Doppelte Kennungen werden nicht entfernt, sondern gemeldet.', 'The list stays in this browser; it is saved nowhere and not written into the address. Duplicate IDs are not removed but reported.')}</span></div>
        {/if}
      </fieldset>
    {:else}
      <fieldset class="vst-gruppe"><legend>{L('2  Das Verfahren', '2  The method')}</legend>
        <div class="segment" role="radiogroup" aria-label={L('Verfahren der Zuteilung', 'Method of allocation')}>
          <label data-begriff="blockrandomisierung"><input type="radio" name="vz-art" value="bloecke" bind:group={z.art}>{L('Blockrandomisierung', 'Block randomisation')}</label>
          <label><input type="radio" name="vz-art" value="feste" bind:group={z.art}>{L('Feste Gruppengrößen', 'Fixed group sizes')}</label>
        </div>
        <div class="vst-rollt"><table class="vst-tabelle" aria-label={L('Gruppen der Zuteilung', 'Groups of the allocation')}>
          <thead><tr><th scope="col">{L('Gruppe', 'Group')}</th><th scope="col">{z.art === 'bloecke' ? L('Anteil im Verhältnis', 'Share in the ratio') : L('Größe', 'Size')}</th><th scope="col"><span class="nur-vorleser">{L('Entfernen', 'Remove')}</span></th></tr></thead>
          <tbody>{#each z.gruppen as g, i (i)}
            <tr><td><input type="text" autocomplete="off" aria-label={L(`Name der Gruppe ${i + 1}`, `Name of group ${i + 1}`)} bind:value={g.name}></td>
              <td>{#if z.art === 'bloecke'}<input type="text" inputmode="numeric" autocomplete="off" aria-label={L(`Anteil von Gruppe ${i + 1}`, `Share of group ${i + 1}`)} bind:value={g.v}>{:else}<input type="text" inputmode="numeric" autocomplete="off" aria-label={L(`Größe von Gruppe ${i + 1}`, `Size of group ${i + 1}`)} bind:value={g.g}>{/if}</td>
              <td>{#if z.gruppen.length > MIN_GRUPPEN}<button type="button" class="k leise" onclick={() => weg(i)} aria-label={L(`Gruppe ${i + 1} entfernen`, `Remove group ${i + 1}`)}><Icon n="x" /></button>{/if}</td></tr>
          {/each}</tbody></table></div>
        <div><button type="button" class="k" onclick={hinzu} disabled={z.gruppen.length >= MAX_GRUPPEN}><Icon n="plus" /> {L('Gruppe hinzufügen', 'Add a group')}</button></div>
        {#if z.art === 'bloecke'}
          <span class="hilfe">{L('Verhältnis: 1 und 1 heißt gleich große Gruppen, 2 und 1 heißt doppelt so viele in der ersten.', 'Ratio: 1 and 1 means equally large groups, 2 and 1 means twice as many in the first.')}</span>
        {/if}
      </fieldset>

      {#if z.art === 'bloecke'}
        <fieldset class="vst-gruppe"><legend>{L('3  Plätze und Blöcke', '3  Places and blocks')}</legend>
          <label data-begriff="schichtung" class="vst-schalter"><input type="checkbox" bind:checked={z.geschichtet}><span>{L('Nach Schichten getrennt (zum Beispiel nach Zentrum oder Geschlecht)', 'Separately by strata (for example by centre or sex)')}</span></label>
          {#if z.geschichtet}
            <div class="vst-rollt"><table class="vst-tabelle" aria-label={L('Schichten', 'Strata')}>
              <thead><tr><th scope="col">{L('Schicht', 'Stratum')}</th><th scope="col">{L('Plätze', 'Places')}</th><th scope="col"><span class="nur-vorleser">{L('Entfernen', 'Remove')}</span></th></tr></thead>
              <tbody>{#each z.sch as s, i (i)}
                <tr><td><input type="text" autocomplete="off" aria-label={L(`Name der Schicht ${i + 1}`, `Name of stratum ${i + 1}`)} bind:value={s.name}></td>
                  <td><input type="text" inputmode="numeric" autocomplete="off" aria-label={L(`Plätze in Schicht ${i + 1}`, `Places in stratum ${i + 1}`)} bind:value={s.n}></td>
                  <td>{#if z.sch.length > 1}<button type="button" class="k leise" onclick={() => schWeg(i)} aria-label={L(`Schicht ${i + 1} entfernen`, `Remove stratum ${i + 1}`)}><Icon n="x" /></button>{/if}</td></tr>
              {/each}</tbody></table></div>
            <div><button type="button" class="k" onclick={schHinzu} disabled={z.sch.length >= MAX_SCHICHTEN}><Icon n="plus" /> {L('Schicht hinzufügen', 'Add a stratum')}</button></div>
          {:else}
            <div class="eingabe"><label for="vz-N-{kennung}">{L('Zahl der Plätze N', 'Number of places N')}</label><input id="vz-N-{kennung}" type="text" inputmode="numeric" autocomplete="off" bind:value={z.N} style="max-width:14ch"></div>
          {/if}
          <div class="eingabe"><label for="vz-bg-{kennung}">{L('Blockgrößen (mehrere, mit Komma getrennt)', 'Block sizes (several, separated by commas)')}</label><input id="vz-bg-{kennung}" type="text" autocomplete="off" bind:value={z.bg} style="max-width:20ch">
            <span class="hilfe">{L(`Jede Blockgröße muss ein Vielfaches von ${summeVerh || 1} sein (der Summe des Verhältnisses). Mehrere Größen werden gemischt, damit der Schluss eines Blocks nicht zu erraten ist.`, `Every block size must be a multiple of ${summeVerh || 1} (the sum of the ratio). Several sizes are mixed so that the end of a block cannot be guessed.`)}</span></div>
          <label class="vst-schalter"><input type="checkbox" bind:checked={z.aufrunden}><span>{L('Den letzten Block voll lassen (die Liste wird dann länger als die Zahl der Plätze)', 'Keep the last block complete (the list then becomes longer than the number of places)')}</span></label>
        </fieldset>
      {/if}
    {/if}

    {#if z.modus !== 'verdeckt'}<fieldset class="vst-gruppe"><legend>{z.modus === 'auswahl' || z.art === 'feste' ? L('3  Der Startwert', '3  The seed') : L('4  Der Startwert', '4  The seed')}</legend>
      <div class="eingabe"><label for="vz-sw-{kennung}">{L('Startwert (ganze Zahl)', 'Seed (whole number)')}</label><input id="vz-sw-{kennung}" type="text" inputmode="numeric" autocomplete="off" bind:value={z.startwert} style="max-width:16ch" aria-invalid={Number.isNaN(sw) ? 'true' : undefined} aria-describedby={(Number.isNaN(sw)) ? 'vz-fehler-{kennung}' : undefined}>
        <span class="hilfe">{L('Gleicher Startwert, gleiche Liste: so lässt sich alles nachrechnen. Ein anderer Startwert gibt eine andere Liste. Der Startwert kommt nie aus der Uhr.', 'The same seed gives the same list: everything can be recalculated. A different seed gives a different list. The seed never comes from the clock.')}</span></div>
    </fieldset>{/if}
  </div>

  {#if z.modus !== 'verdeckt'}<div class="vst-rechts" aria-busy={bereit ? undefined : 'true'}>
    {#if !bereit && animation.an}<p class="heft-text"><Rechnet text={L('Die Liste wird erstellt …', 'The list is being created …')} /></p>{/if}
    {#if !f}
      <p class="nur-vorleser" role="status">{L('Die Liste wird erstellt …', 'The list is being created …')}</p>
    {:else if f.art === 'auswahl-zahl' || f.art === 'auswahl-liste'}
      {#if !f.r.ok}
        <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="vz-fehler-{kennung}">{zuteilungFehlerSatz(f.r.code)}</p></div>
      {:else}
        {@const r = f.r}
        <section class="vst-ergebnis" aria-labelledby="vz-erg-t-{kennung}"><h2 id="vz-erg-t-{kennung}">{L('Die Auswahl', 'The selection')}</h2>
          <p class="vst-zeile"><b>{zuteilungLehrmittelSatz()}</b></p>
          <p class="vst-zeile">{zuteilungAuswahlSatz(f.k, nGesamt, swF)}</p>
          <p class="vst-zeile klein">{zuteilungGerechnet({ art: 'stichprobe', n: nGesamt, k: f.k, startwert: swF })}</p>
          <div class="vst-rollt"><table class="vst-tabelle" aria-label={L('Gezogene Fälle in Ziehungsreihenfolge', 'Drawn cases in order of drawing')}>
            <thead><tr><th scope="col" class="zahl-sp">{L('Ziehung', 'Draw')}</th><th scope="col">{f.art === 'auswahl-zahl' ? L('Nummer', 'Number') : L('Kennung', 'ID')}</th></tr></thead>
            <tbody>{#each r.gezogen.slice(0, ZEILEN_MAX) as g, i (i)}<tr><td class="zahl-sp">{i + 1}</td><td>{g}</td></tr>{/each}</tbody></table></div>
          {#if r.gezogen.length > ZEILEN_MAX}<p class="vst-zeile klein">{L(`Es werden die ersten ${ZEILEN_MAX} gezeigt; die ganze Auswahl steht im Export.`, `The first ${ZEILEN_MAX} are shown; the whole selection is in the export.`)}</p>{/if}
          <p class="vst-zeile klein">{L('In der Reihenfolge der Liste:', 'In the order of the list:')} {r.sortiert.slice(0, 40).join(', ')}{r.gezogen.length > 40 ? ' …' : ''}</p>
        </section>
        {#if f.art === 'auswahl-liste'}
          {#if f.r.ok && f.r.leer > 0}<p class="banner ruhig vst-hinweis"><Icon n="info" /><span>{zuteilungLeerSatz(f.r.leer)}</span></p>{/if}
          {#if f.r.ok && f.r.doppelt.length > 0}<p class="banner vst-hinweis"><Icon n="hinweis" /><span>{zuteilungDoppeltSatz(f.r.doppelt.length, f.r.doppelt)}</span></p>{/if}
        {/if}
      {/if}
    {:else if f.art === 'feste'}
      {#if !f.r.ok}
        <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="vz-fehler-{kennung}">{zuteilungFehlerSatz(f.r.code)}</p></div>
      {:else}
        {@const r = f.r}
        <section class="vst-ergebnis" aria-labelledby="vz-erg-t-{kennung}"><h2 id="vz-erg-t-{kennung}">{L('Die Zuteilung', 'The allocation')}</h2>
          <p class="vst-zeile"><b>{zuteilungLehrmittelSatz()}</b></p>
          <p class="vst-zeile klein">{zuteilungGerechnet({ art: 'vollstaendig', groessen: f.groessen, startwert: swF, strom: 0 })}</p>
          <div class="vst-rollt"><table class="vst-tabelle" aria-label={L('Zuteilung', 'Allocation')}>
            <thead><tr><th scope="col" class="zahl-sp">{L('Nr', 'No.')}</th><th scope="col">{L('Gruppe', 'Group')}</th></tr></thead>
            <tbody>{#each r.liste.slice(0, ZEILEN_MAX) as x (x.nr)}<tr><td class="zahl-sp">{x.nr}</td><td>{x.gruppe}</td></tr>{/each}</tbody></table></div>
          {#if r.liste.length > ZEILEN_MAX}<p class="vst-zeile klein">{L(`Es werden die ersten ${ZEILEN_MAX} gezeigt; die ganze Liste steht im Export.`, `The first ${ZEILEN_MAX} are shown; the whole list is in the export.`)}</p>{/if}
        </section>
      {/if}
    {:else}
      {#if !f.r.ok}
        <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="vz-fehler-{kennung}">{zuteilungFehlerSatz(f.r.code)}</p></div>
      {:else}
        {@const r = f.r}
        <section class="vst-ergebnis" aria-labelledby="vz-erg-t-{kennung}"><h2 id="vz-erg-t-{kennung}">{L('Die Zuteilungsliste', 'The allocation list')}</h2>
          <p class="vst-zeile"><b>{zuteilungLehrmittelSatz()}</b></p>
          <p class="vst-zeile klein">{zuteilungGerechnet({ art: 'block', verhaeltnis: r.eingabe.verhaeltnis, blockgroessen: r.eingabe.blockgroessen, startwert: swF, strom: 0, schichten: r.eingabe.schichten })}</p>
          <div class="vst-rollt"><table class="vst-tabelle" aria-label={L('Kontrollzahlen', 'Control figures')}>
            <thead><tr>{#if r.eingabe.schichten}<th scope="col">{L('Schicht', 'Stratum')}</th>{/if}{#each r.eingabe.gruppen as g (g)}<th scope="col" class="zahl-sp">{g}</th>{/each}<th scope="col" class="zahl-sp">{L('Blöcke', 'Blocks')}</th><th scope="col" class="zahl-sp">{L('Größter Unterschied', 'Largest difference')}</th></tr></thead>
            <tbody>{#each r.kontrolle as k (k.schicht ?? '')}<tr>{#if r.eingabe.schichten}<th scope="row">{k.schicht}</th>{/if}{#each k.jeGruppe as c, i (i)}<td class="zahl-sp">{ganzZahl(c)}</td>{/each}<td class="zahl-sp">{k.bloecke}</td><td class="zahl-sp">{k.maxAbweichung}</td></tr>{/each}</tbody></table></div>
          <div class="vst-rollt" style="margin-top:var(--a3)"><table class="vst-tabelle" aria-label={L('Zuteilungsliste', 'Allocation list')}>
            <thead><tr><th scope="col" class="zahl-sp">{L('Nr', 'No.')}</th>{#if r.eingabe.schichten}<th scope="col">{L('Schicht', 'Stratum')}</th>{/if}<th scope="col">{L('Gruppe', 'Group')}</th><th scope="col" class="zahl-sp">{L('Block', 'Block')}</th></tr></thead>
            <tbody>{#each r.liste.slice(0, ZEILEN_MAX) as x, i (i)}<tr><td class="zahl-sp">{x.nr}</td>{#if r.eingabe.schichten}<td>{x.schicht}</td>{/if}<td>{x.gruppe}</td><td class="zahl-sp">{x.block}</td></tr>{/each}</tbody></table></div>
          {#if r.liste.length > ZEILEN_MAX}<p class="vst-zeile klein">{L(`Es werden die ersten ${ZEILEN_MAX} von ${ganzZahl(r.liste.length)} Zeilen gezeigt; die ganze Liste steht im Export.`, `The first ${ZEILEN_MAX} of ${ganzZahl(r.liste.length)} lines are shown; the whole list is in the export.`)}</p>{/if}
        </section>
        {#if verlauf}
          <section class="vst-block"><h2>{L('Was Blöcke bewirken', 'What blocks do')}</h2>
            <DiagrammExport titel={L('Verlauf des Unterschieds der Gruppengrößen', 'Course of the difference of the group sizes')}><Zuteilungsverlauf reihen={verlauf.reihen} grenze={verlauf.grenze} /></DiagrammExport>
          </section>
        {/if}
        <p class="vst-zeile">{zuteilungVorhersagSatz()}</p>
        {#if unvollstaendig !== null}<p class="vst-zeile">{zuteilungUnvollstaendigSatz(unvollstaendig)}</p>{/if}
        {#if schichtHinweis}<p class="vst-zeile">{zuteilungSchichtenSatz()}</p>{/if}
      {/if}
    {/if}
    {#if f && kannExportieren}
      <div style="display:flex;flex-wrap:wrap;gap:var(--a3)">
        <button type="button" class="k haupt" onclick={speichern}><Icon n="download" /> {L('Als CSV speichern', 'Save as CSV')}</button>
        <button type="button" class="k" onclick={kopieren}><Icon n="kopieren" /> {L('In die Zwischenablage kopieren', 'Copy to the clipboard')}</button>
      </div>
      <p class="vst-zeile klein">{L('Jede Datei beginnt mit der Zeile „Lehrmittel - nicht für echte Studien (keine Verdeckung)“, dem Startwert und dem Verfahren.', 'Every file begins with the line “Teaching tool - not for real studies (no concealment)”, the seed and the method.')}</p>
    {/if}
  </div>{/if}
</div>
