<script module lang="ts">
  import type { VerdecktEinstellung, VerdecktListe, ProtokollZeile } from '../lib/zuteilungverdeckt';
  const SCHLUESSEL = 'statable-verdeckt-zuteilung';
  interface Lauf { salz: string; fp: string; liste: VerdecktListe; einst: VerdecktEinstellung; zeiger: number[]; protokoll: ProtokollZeile[]; offen: boolean; start: string }
  interface Zustand { gruppen: { name: string; v: string }[]; bg: string; N: string; geschichtet: boolean; sch: { name: string; n: string }[]; aufrunden: boolean; lauf: Lauf | null }
  function laden(): Zustand {
    const frisch: Zustand = { gruppen: [{ name: 'A', v: '1' }, { name: 'B', v: '1' }], bg: '4, 6', N: '40', geschichtet: false, sch: [{ name: 'S1', n: '20' }, { name: 'S2', n: '20' }], aufrunden: false, lauf: null };
    try { const t = localStorage.getItem(SCHLUESSEL); if (t) { const o = JSON.parse(t) as Zustand; if (o && Array.isArray(o.gruppen)) return { ...frisch, ...o }; } } catch { /* ohne Speicher läuft es nur ohne Wiederherstellung */ }
    return frisch;
  }
  /** Der Zustand bleibt beim Neuladen der Seite erhalten (nur in diesem Browser, nie im Projekt und nie auf einem Server). */
  const z = $state<Zustand>(laden());
</script>
<script lang="ts">
  import { L, melde } from '../lib/sitzung.svelte';
  import { liesZahl } from '../lib/verteilungen';
  import { herunterladen } from '../lib/export';
  import { MAX_GRUPPEN, MAX_SCHICHTEN, MIN_GRUPPEN } from '../lib/zuteilung';
  import { zuteilungFehlerSatz } from '../lib/zuteilungsaetze';
  import { fingerabdruck, kryptoSalz, listenText, protokollCsv, verdecktErzeugen } from '../lib/zuteilungverdeckt';
  import Icon from './Icon.svelte';

  const kennung = $props.id();
  const ganz = (t: string) => { const v = liesZahl(t); return Number.isInteger(v) ? v : NaN; };
  const bloecke = $derived(z.bg.split(/[;,\s]+/).filter(Boolean).map(Number));
  $effect(() => { try { localStorage.setItem(SCHLUESSEL, JSON.stringify($state.snapshot(z))); } catch { /* siehe oben */ } });

  let fehler = $state(''), laeuft = $state(false), name = $state(''), schichtWahl = $state(''), letzte = $state<{ kennung: string; gruppe: string } | null>(null), bestaetigt = $state(false), neuBestaetigt = $state(false);
  const hinzu = () => { if (z.gruppen.length < MAX_GRUPPEN) z.gruppen.push({ name: String.fromCharCode(65 + z.gruppen.length), v: '1' }); };
  const weg = (i: number) => { if (z.gruppen.length > MIN_GRUPPEN) z.gruppen.splice(i, 1); };
  const schHinzu = () => { if (z.sch.length < MAX_SCHICHTEN) z.sch.push({ name: `S${z.sch.length + 1}`, n: '20' }); };
  const schWeg = (i: number) => { if (z.sch.length > 1) z.sch.splice(i, 1); };
  const summeVerh = $derived(z.gruppen.reduce((a, g) => a + (ganz(g.v) || 0), 0));

  async function start() {
    if (laeuft) return;
    laeuft = true; fehler = '';
    try {
      const einst: VerdecktEinstellung = { gruppen: z.gruppen.map(g => g.name.trim()), verhaeltnis: z.gruppen.map(g => ganz(g.v)), blockgroessen: bloecke, aufrunden: z.aufrunden, ...(z.geschichtet ? { schichten: z.sch.map(s => ({ name: s.name.trim(), n: ganz(s.n) })) } : { n: ganz(z.N) }) };
      const liste = verdecktErzeugen(einst);
      if ('ok' in liste) { fehler = zuteilungFehlerSatz(liste.code); return; }
      const salz = kryptoSalz(), fp = await fingerabdruck(salz, liste);
      z.lauf = { salz, fp, liste, einst, zeiger: liste.schichten.map(() => 0), protokoll: [], offen: false, start: new Date().toISOString() };
      schichtWahl = liste.schichten[0]?.name ?? ''; letzte = null; bestaetigt = false; neuBestaetigt = false; name = '';
    } catch { fehler = L('Dieser Browser kann die Festlegung nicht rechnen (die Funktion „Web Crypto“ fehlt). Die Seite muss über https oder localhost geöffnet sein.', 'This browser cannot calculate the commitment (the "Web Crypto" function is missing). The page must be opened over https or localhost.'); }
    finally { laeuft = false; }
  }

  const lauf = $derived(z.lauf);
  const mitSchichten = $derived(!!lauf?.einst.schichten);
  const sIdx = $derived(lauf ? Math.max(0, lauf.liste.schichten.findIndex(s => (s.name ?? '') === schichtWahl)) : 0);
  const rest = $derived(lauf ? lauf.liste.schichten[sIdx]!.folge.length - lauf.zeiger[sIdx]! : 0);
  const gesamtRest = $derived(lauf ? lauf.liste.schichten.reduce((a, s, i) => a + s.folge.length - lauf.zeiger[i]!, 0) : 0);
  const kennungOk = $derived(name.trim() !== '' && name.trim().length <= 100 && !/[\u0000-\u001f]/.test(name));
  const doppelt = $derived(!!lauf && kennungOk && lauf.protokoll.some(p => p.kennung === name.trim()));
  const kannZuteilen = $derived(!!lauf && !lauf.offen && kennungOk && !doppelt && rest > 0);

  function zuteilen() {
    if (!lauf || !kannZuteilen) return;
    const gruppe = lauf.liste.schichten[sIdx]!.folge[lauf.zeiger[sIdx]!]!;
    lauf.zeiger[sIdx]!++;
    lauf.protokoll.push({ nr: lauf.protokoll.length + 1, schicht: lauf.liste.schichten[sIdx]!.name, kennung: name.trim(), gruppe, zeit: new Date().toISOString() });
    letzte = { kennung: name.trim(), gruppe }; name = '';
  }

  const kopf = (offen: boolean): string[] => !lauf ? [] : [
    'Lehrmittel - nicht für echte Studien (verdeckter Modus, aber ohne zugelassenes System)',
    `Festlegung (SHA-256 von Salz und Liste): ${lauf.fp}`,
    `Start: ${lauf.start}`,
    `Verfahren: Blockrandomisierung ${lauf.einst.verhaeltnis.join(':')}, Blockgrößen ${lauf.einst.blockgroessen.join(', ')}, Gruppen ${lauf.einst.gruppen.join(', ')}${lauf.einst.schichten ? `, Schichten ${lauf.einst.schichten.map(s => `${s.name} (${s.n})`).join(', ')}` : `, Plätze ${lauf.einst.n}`}, Zufall aus dem Browser (Web Crypto)`,
    offen ? 'Die Liste ist offengelegt: Fingerabdruck = SHA-256 von Salz, Zeilenumbruch und dem Text der Liste' : 'Die Liste ist noch verdeckt'
  ];
  function csv() { if (!lauf) return; herunterladen(new TextEncoder().encode('﻿' + protokollCsv(kopf(lauf.offen), lauf.protokoll, { schichten: mitSchichten }, lauf.offen ? { salz: lauf.salz, liste: lauf.liste } : undefined)), 'Zuteilungsprotokoll.csv', 'text/csv;charset=utf-8'); melde(L('CSV-Datei gespeichert. Sie liegt bei den Downloads.', 'CSV file saved. It is in your downloads.')); }
  function offenlegen() { if (lauf && bestaetigt) lauf.offen = true; }
  function neu() { if (neuBestaetigt) { z.lauf = null; letzte = null; bestaetigt = false; neuBestaetigt = false; } }
  const ft = (t: string) => t.length > 64 ? t.slice(0, 64) : t;
</script>

<div class="banner vst-hinweis" role="note" style="margin-bottom:var(--a3)"><Icon n="hinweis" /><p>{L('Verdeckter Modus: Die Liste entsteht beim Start aus dem Zufall des Browsers und wird nicht gezeigt. Jede Person bekommt ihre Gruppe erst, wenn sie eingetragen ist; das Ergebnis lässt sich nicht zurücknehmen. Verdeckt ist die Liste nur vor dem Blick auf den Bildschirm: Wer die Entwicklerwerkzeuge des Browsers öffnet, kann sie lesen. Es bleibt ein Lehrmittel. Eine echte Studie braucht ein dafür zugelassenes System mit verdeckter Zuteilung und das Protokoll der Einrichtung.', 'Concealed mode: the list is created at the start from the browser\'s randomness and is not shown. Each person gets their group only when they are entered; the result cannot be taken back. The list is concealed only from a look at the screen: anyone who opens the browser\'s developer tools can read it. It remains a teaching tool. A real study needs an approved system with concealed allocation and the protocol of the institution.')}</p></div>

{#if !lauf}
  <fieldset class="vst-gruppe"><legend>{L('2  Das Verfahren', '2  The method')}</legend>
    <div class="vst-rollt"><table class="vst-tabelle" aria-label={L('Gruppen der Zuteilung', 'Groups of the allocation')}>
      <thead><tr><th scope="col">{L('Gruppe', 'Group')}</th><th scope="col">{L('Anteil im Verhältnis', 'Share in the ratio')}</th><th scope="col"><span class="nur-vorleser">{L('Entfernen', 'Remove')}</span></th></tr></thead>
      <tbody>{#each z.gruppen as g, i (i)}
        <tr><td><input type="text" autocomplete="off" aria-label={L(`Name der Gruppe ${i + 1}`, `Name of group ${i + 1}`)} bind:value={g.name}></td>
          <td><input type="text" inputmode="numeric" autocomplete="off" aria-label={L(`Anteil von Gruppe ${i + 1}`, `Share of group ${i + 1}`)} bind:value={g.v}></td>
          <td>{#if z.gruppen.length > MIN_GRUPPEN}<button type="button" class="k leise" onclick={() => weg(i)} aria-label={L(`Gruppe ${i + 1} entfernen`, `Remove group ${i + 1}`)}><Icon n="x" /></button>{/if}</td></tr>
      {/each}</tbody></table></div>
    <div><button type="button" class="k" onclick={hinzu} disabled={z.gruppen.length >= MAX_GRUPPEN}><Icon n="plus" /> {L('Gruppe hinzufügen', 'Add a group')}</button></div>
    <label class="vst-schalter"><input type="checkbox" bind:checked={z.geschichtet}><span>{L('Nach Schichten getrennt (zum Beispiel nach Zentrum oder Geschlecht)', 'Separately by strata (for example by centre or sex)')}</span></label>
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
      <div class="eingabe"><label for="vv-N-{kennung}">{L('Zahl der Plätze N', 'Number of places N')}</label><input id="vv-N-{kennung}" type="text" inputmode="numeric" autocomplete="off" bind:value={z.N} style="max-width:14ch"></div>
    {/if}
    <div class="eingabe"><label for="vv-bg-{kennung}">{L('Blockgrößen (mehrere, mit Komma getrennt)', 'Block sizes (several, separated by commas)')}</label><input id="vv-bg-{kennung}" type="text" autocomplete="off" bind:value={z.bg} style="max-width:22ch">
      <span class="hilfe">{L(`Jede Blockgröße muss ein Vielfaches von ${summeVerh || 1} sein. Mehrere Größen werden gemischt, damit der Schluss eines Blocks nicht zu erraten ist. Für den verdeckten Modus sind mehrere Größen besonders wichtig.`, `Every block size must be a multiple of ${summeVerh || 1}. Several sizes are mixed so that the end of a block cannot be guessed. For the concealed mode several sizes are especially important.`)}</span></div>
    <label class="vst-schalter"><input type="checkbox" bind:checked={z.aufrunden}><span>{L('Den letzten Block voll lassen (die Liste wird dann länger als die Zahl der Plätze)', 'Keep the last block complete (the list then becomes longer than the number of places)')}</span></label>
  </fieldset>
  <div class="knopfzeile"><button type="button" class="k haupt" onclick={start} disabled={laeuft}>{L('Verdeckte Liste erstellen und festlegen', 'Create the concealed list and commit to it')}</button></div>
  {#if fehler}<div class="banner" role="alert"><Icon n="hinweis" /><p>{fehler}</p></div>{/if}
{:else}
  <section class="vst-ergebnis" aria-labelledby="vv-fest-{kennung}"><h2 id="vv-fest-{kennung}">{L('Festlegung', 'Commitment')}</h2>
    <p class="vst-zeile">{L('Die Liste ist erstellt und verdeckt. Dieser Fingerabdruck legt sie fest; er sollte vor der ersten Aufnahme notiert werden (zum Beispiel im Studienprotokoll).', 'The list is created and concealed. This fingerprint commits to it; it should be written down before the first enrolment (for example in the study protocol).')}</p>
    <p class="vst-zeile klein" style="font-family:monospace;word-break:break-all">{lauf.fp}</p>
    <p class="vst-zeile klein">{L(`Noch ${gesamtRest} Plätze frei, ${lauf.protokoll.length} vergeben.`, `${gesamtRest} places left, ${lauf.protokoll.length} assigned.`)}</p>
  </section>

  {#if !lauf.offen}
    <fieldset class="vst-gruppe"><legend>{L('Nächste Person', 'Next person')}</legend>
      {#if mitSchichten}
        <div class="eingabe" style="max-width:260px"><label for="vv-s-{kennung}">{L('Schicht der Person', 'Stratum of the person')}</label>
          <select id="vv-s-{kennung}" bind:value={schichtWahl}>{#each lauf.liste.schichten as s, i (i)}<option value={s.name ?? ''}>{s.name}</option>{/each}</select>
          <span class="hilfe">{L(`In dieser Schicht sind noch ${rest} Plätze frei.`, `In this stratum ${rest} places are left.`)}</span></div>
      {/if}
      <div class="eingabe" style="max-width:340px"><label for="vv-k-{kennung}">{L('Kennung der Person (kein Name; zum Beispiel eine Nummer)', 'ID of the person (not a name; for example a number)')}</label>
        <input id="vv-k-{kennung}" type="text" autocomplete="off" maxlength="100" bind:value={name} onkeydown={(e) => { if (e.key === 'Enter') zuteilen(); }} aria-invalid={doppelt} aria-describedby={(doppelt) ? 'vv-doppelt-{kennung}' : undefined}>
        {#if doppelt}<span class="hilfe" role="alert" id="vv-doppelt-{kennung}">{L('Diese Kennung ist schon vergeben. Eine Person bekommt nur eine Zuteilung.', 'This ID is already assigned. A person gets only one allocation.')}</span>{/if}
        {#if rest <= 0}<span class="hilfe" role="alert">{L('Alle Plätze sind vergeben.', 'All places are taken.')}</span>{/if}</div>
      <div class="knopfzeile"><button type="button" class="k haupt" onclick={zuteilen} disabled={!kannZuteilen}>{L('Person zuteilen', 'Allocate person')}</button></div>
      {#if letzte}<p class="vst-zeile" role="status"><b>{L(`Kennung ${ft(letzte.kennung)}: Gruppe ${letzte.gruppe}`, `ID ${ft(letzte.kennung)}: group ${letzte.gruppe}`)}</b></p>{/if}
    </fieldset>
  {/if}

  {#if lauf.protokoll.length}
    <div class="vst-rollt"><table class="vst-tabelle" aria-label={L('Protokoll', 'Log')}>
      <thead><tr><th scope="col" class="zahl-sp">{L('Nr', 'No.')}</th>{#if mitSchichten}<th scope="col">{L('Schicht', 'Stratum')}</th>{/if}<th scope="col">{L('Kennung', 'ID')}</th><th scope="col">{L('Gruppe', 'Group')}</th><th scope="col">{L('Zeit', 'Time')}</th></tr></thead>
      <tbody>{#each lauf.protokoll.slice(-100).reverse() as p (p.nr)}<tr><td class="zahl-sp">{p.nr}</td>{#if mitSchichten}<td>{p.schicht}</td>{/if}<td>{p.kennung}</td><td>{p.gruppe}</td><td>{p.zeit.slice(0, 19).replace('T', ' ')}</td></tr>{/each}</tbody></table></div>
    {#if lauf.protokoll.length > 100}<p class="vst-zeile klein">{L('Es werden die letzten 100 gezeigt; das ganze Protokoll steht im Export.', 'The last 100 are shown; the whole log is in the export.')}</p>{/if}
    <div class="knopfzeile"><button type="button" class="k haupt" onclick={csv}><Icon n="download" /> {L('Protokoll als CSV speichern', 'Save the log as CSV')}</button></div>
  {/if}

  {#if !lauf.offen}
    <fieldset class="vst-gruppe"><legend>{L('Ende der Aufnahme', 'End of enrolment')}</legend>
      <label class="vst-schalter"><input type="checkbox" bind:checked={bestaetigt}><span>{L('Die Aufnahme ist beendet. Danach wird die Liste offengelegt und es wird niemand mehr zugeteilt.', 'Enrolment has ended. Afterwards the list is disclosed and nobody is allocated any more.')}</span></label>
      <div class="knopfzeile"><button type="button" class="k" onclick={offenlegen} disabled={!bestaetigt}>{L('Liste offenlegen', 'Disclose the list')}</button></div>
    </fieldset>
  {:else}
    <section class="vst-ergebnis" aria-labelledby="vv-off-{kennung}"><h2 id="vv-off-{kennung}">{L('Offengelegte Liste', 'Disclosed list')}</h2>
      <p class="vst-zeile">{L('Wer den SHA-256-Wert aus Salz, Zeilenumbruch und dem Text der Liste neu rechnet, muss den Fingerabdruck von oben erhalten. Dann wurde die Liste nach dem Start nicht geändert. Das Protokoll muss zu dieser Liste passen.', 'Anyone who recalculates the SHA-256 value from the salt, a line break and the text of the list must get the fingerprint from above. Then the list was not changed after the start. The log must match this list.')}</p>
      <p class="vst-zeile klein" style="font-family:monospace;word-break:break-all">{L('Salz', 'Salt')}: {lauf.salz}</p>
      <p class="vst-zeile klein" style="font-family:monospace;word-break:break-all;white-space:pre-wrap">{listenText(lauf.liste)}</p>
    </section>
  {/if}

  <fieldset class="vst-gruppe"><legend>{L('Neu beginnen', 'Start over')}</legend>
    <label class="vst-schalter"><input type="checkbox" bind:checked={neuBestaetigt}><span>{L('Die jetzige Liste und das Protokoll werden gelöscht. Das lässt sich nicht zurücknehmen; vorher das Protokoll speichern.', 'The present list and the log are deleted. This cannot be taken back; save the log first.')}</span></label>
    <div class="knopfzeile"><button type="button" class="k" onclick={neu} disabled={!neuBestaetigt}>{L('Alles löschen und neu beginnen', 'Delete everything and start over')}</button></div>
  </fieldset>
{/if}
