<script lang="ts">
  import { untrack, tick, onDestroy } from 'svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName } from '../lib/skalabau';
  import { bedingung, berechneBefehl, leereErgebnisse, mindestzahl, zeilenStatistikBefehl, type Zeilenfunktion } from '../lib/datenassistent';
  import { anzeigeWert, ergebnisSaetze, fehlerSatz, mindestSatz, spaltenOption } from '../lib/datenassistentsaetze';
  import { probelauf, wendeAn } from '../lib/datenassistentlauf';
  import { AUTO_ZELLEN, Vorschau } from '../lib/assistentvorschau.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import BedingungsFeld, { bedingungsTeile, neueBedingung, type BedingungsZeile } from './BedingungsFeld.svelte';
  import Rechnet from './Rechnet.svelte';

  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  const namen = $derived(s.spalten.map(x => x.name));
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let modus = $state<'formel' | 'zeilen'>('formel');

  /* ---------- Formel ---------- */
  let ausdruck = $state('');
  let feld = $state<HTMLInputElement>();
  /** Text an der Schreibmarke einfügen; `rueck` Zeichen zurück (z. B. in die Klammer von LN()). */
  async function einfuegen(t: string, rueck = 0) {
    const von = feld?.selectionStart ?? ausdruck.length, bis = feld?.selectionEnd ?? ausdruck.length;
    ausdruck = ausdruck.slice(0, von) + t + ausdruck.slice(bis);
    await tick();
    feld?.focus();
    const pos = von + t.length - rueck;
    feld?.setSelectionRange(pos, pos);
  }
  const RECHENZEICHEN: { text: string; t: string; name: () => string }[] = [
    { text: '+', t: ' + ', name: () => L('plus', 'plus') }, { text: '−', t: ' - ', name: () => L('minus', 'minus') },
    { text: '×', t: ' * ', name: () => L('mal', 'times') }, { text: '÷', t: ' / ', name: () => L('geteilt durch', 'divided by') },
    { text: '(', t: '(', name: () => L('Klammer auf', 'open bracket') }, { text: ')', t: ')', name: () => L('Klammer zu', 'close bracket') },
    { text: 'x²', t: ' ** 2', name: () => L('hoch zwei', 'squared') }
  ];
  const FUNKTIONEN: { t: string; name: () => string }[] = [
    { t: 'LN', name: () => L('natürlicher Logarithmus', 'natural logarithm') }, { t: 'EXP', name: () => L('e hoch', 'e to the power') },
    { t: 'SQRT', name: () => L('Wurzel', 'square root') }, { t: 'ABS', name: () => L('Betrag', 'absolute value') }, { t: 'RND', name: () => L('runden', 'round') }
  ];

  /* ---------- Mittelwert, Summe … über mehrere Spalten ---------- */
  let fn = $state<Zeilenfunktion>('MEAN');
  let gewaehlt = $state<string[]>([]);
  let mindestWahl = $state<'eins' | 'haelfte' | 'zahl'>('haelfte');   // Später S-C (Entscheidung Opus 5): neue Skalenwerte brauchen mindestens die Hälfte der Fragen; gespeicherte Befehle bleiben unverändert
  let mindestZahl = $state('2');
  const FN: { fn: Zeilenfunktion; name: () => string; ziel: () => string }[] = [
    { fn: 'MEAN', name: () => L('Mittelwert', 'Mean'), ziel: () => L('mittelwert', 'mean') }, { fn: 'SUM', name: () => L('Summe', 'Sum'), ziel: () => L('summe', 'sum') },
    { fn: 'MIN', name: () => L('Minimum', 'Minimum'), ziel: () => L('minimum', 'minimum') }, { fn: 'MAX', name: () => L('Maximum', 'Maximum'), ziel: () => L('maximum', 'maximum') },
    { fn: 'SD', name: () => L('Standardabweichung', 'Standard deviation'), ziel: () => L('sd', 'sd') }
  ];
  const fnName = $derived(FN.find(x => x.fn === fn)!.name());
  const gewaehltOrdnung = $derived(namen.filter(n => gewaehlt.includes(n)));
  const mindestWunsch = $derived<number | 'haelfte'>(mindestWahl === 'eins' ? 1 : mindestWahl === 'haelfte' ? 'haelfte' : Number(mindestZahl.replace(',', '.')) || 1);
  const mindestAufgeloest = $derived(gewaehltOrdnung.length ? mindestzahl(gewaehltOrdnung.length, mindestWunsch) : 1);

  /* ---------- Ziel und weitere Einstellungen ---------- */
  let zielArt = $state<'neu' | 'vorhanden'>('neu');
  let zielEigen = $state<string | null>(null);
  let vorhandenWahl = $state('');
  const zielVorschlag = $derived(freierName(modus === 'formel' ? L('ergebnis', 'result') : FN.find(x => x.fn === fn)!.ziel(), namen));
  const ziel = $derived(zielArt === 'vorhanden' ? vorhandenWahl : (zielEigen ?? zielVorschlag));
  let dezimalen = $state(2);
  let bezeichnungEigen = $state<string | null>(null);
  const bezeichnungVorschlag = $derived(modus === 'zeilen' ? L(`${fnName} aus ${gewaehltOrdnung.join(', ')}`, `${fnName} of ${gewaehltOrdnung.join(', ')}`) : ausdruck.trim());
  const bezeichnung = $derived(bezeichnungEigen ?? bezeichnungVorschlag);
  let bedZeilen = $state<BedingungsZeile[]>([]);
  let verknuepfung = $state<'AND' | 'OR'>('AND');

  /* ---------- Der Befehl ---------- */
  /** Spaltennamen, die in der Formel vorkommen - die Eingaben, deren Lücken das Ergebnis leer machen (die Spalten der Bedingung zählen getrennt). */
  const eingaben = $derived.by(() => {
    if (modus === 'zeilen') return gewaehltOrdnung;
    const woerter = new Set(ausdruck.toUpperCase().match(/[\p{L}@#$][\p{L}\p{N}_.@#$]*/gu) ?? []);
    return namen.filter(n => woerter.has(n.toUpperCase()));
  });
  /** Die Bedingung von „Nur wenn …“ als PSPP-Ausdruck; leer ohne Bedingung. */
  const bedAusdruck = $derived.by(() => { const b = bedingungsTeile(bedZeilen, daten.spalten); return modus === 'formel' && 'teile' in b && b.teile.length ? bedingung(b.teile, verknuepfung, daten) : ''; });
  const ergebnis = $derived.by((): { syntax: string } | { problem: string } => {
    if (zielArt === 'vorhanden' && !vorhandenWahl) return { problem: L('Welche Spalte überschrieben werden soll, ist noch nicht gewählt.', 'The column to overwrite has not been chosen yet.') };
    try {
      if (modus === 'zeilen') {
        if (gewaehlt.length < 2) return { problem: L('Mindestens zwei Spalten wählen, über die gerechnet wird.', 'Choose at least two columns to calculate over.') };
        const b = zeilenStatistikBefehl(daten, { fn, spalten: gewaehltOrdnung, mindestens: mindestWunsch, ziel, bezeichnung, ueberschreiben: zielArt === 'vorhanden' });
        return { syntax: b.syntax };
      }
      if (!ausdruck.trim()) return { problem: L('Die Formel ist noch leer.', 'The formula is still empty.') };
      const bed = bedingungsTeile(bedZeilen, daten.spalten);
      if ('problem' in bed) return bed;
      const b = berechneBefehl(daten, {
        ziel, ausdruck: ausdruck.trim(), dezimalen, bezeichnung, ueberschreiben: zielArt === 'vorhanden',
        bedingung: bed.teile.length ? bedingung(bed.teile, verknuepfung, daten) : undefined
      });
      return { syntax: b.syntax };
    } catch (f) { return { problem: fehlerSatz(f) }; }
  });
  const syntax = $derived('syntax' in ergebnis ? ergebnis.syntax : '');

  /* ---------- Vorschau (Probelauf in der Engine, danach wieder der alte Stand) ---------- */
  interface Probe { zeilen: Wert[][]; spalten: Spalte[]; saetze: string[]; fehler: string[] }
  const vs = new Vorschau<Probe>();
  onDestroy(() => vs.verwerfe());
  const gross = $derived(s.zeilen.length * s.spalten.length > AUTO_ZELLEN);
  async function probe(sx: string, z: string, ein: string[], bed: string): Promise<Probe> {
    // Mit Bedingung kommt eine Hilfsspalte (1 / 0 / leer) dazu, damit die Fälle ohne Bedingung getrennt gezählt werden
    const hilfe = freierName('zz_bedingung', namen);
    const r = await probelauf(bed ? `${sx}\nCOMPUTE ${hilfe} = (${bed}).\nEXECUTE.` : sx);
    if (!r.daten) return { zeilen: [], spalten: [], saetze: [], fehler: r.fehler };
    const spalten = [...ein, z].map(n => r.daten!.spalten.find(c => c.name.toUpperCase() === n.toUpperCase())).filter((c): c is Spalte => !!c);
    const idx = spalten.map(c => r.daten!.spalten.indexOf(c));
    return {
      spalten, zeilen: r.daten.zeilen.slice(0, 10).map(row => idx.map(i => row[i] ?? null)),
      saetze: ergebnisSaetze(leereErgebnisse(r.daten, z, ein.filter(n => n.toUpperCase() !== z.toUpperCase()), bed ? hilfe : undefined)), fehler: []
    };
  }
  $effect(() => { const sx = syntax, z = ziel, ein = eingaben, bed = bedAusdruck; if (!sx) return; untrack(() => vs.plane(() => probe(sx, z, ein, bed), !gross)); });
  const rechneVorschau = () => { if (syntax) void vs.jetzt(() => probe(syntax, ziel, eingaben, bedAusdruck)); };

  /* ---------- Sätze ---------- */
  const mindestText = $derived(modus === 'zeilen' && gewaehltOrdnung.length >= 2 ? mindestSatz(fn, gewaehltOrdnung.length, fn === 'SD' ? Math.max(2, mindestAufgeloest) : mindestAufgeloest) : '');
  const formelHinweise = $derived.by(() => {
    if (modus !== 'formel') return [];
    const aus: string[] = [L('Fehlt bei einer Person ein Wert, den die Formel braucht, bleibt ihr Ergebnis leer. Funktionen wie MEAN(a, b) rechnen dagegen mit den vorhandenen Werten.', 'If a value the formula needs is missing for a person, their result stays empty. Functions like MEAN(a, b) instead use the values that are present.')];
    if (/\d,\d/.test(ausdruck)) aus.push(L('Dezimalzahlen werden in der Formel mit Punkt geschrieben (2.5), ein Komma trennt Angaben in Funktionen.', 'Decimal numbers are written with a point in the formula (2.5); a comma separates arguments in functions.'));
    if (ausdruck.includes('/')) aus.push(L('Ist ein Teiler 0, ist das Ergebnis leer - auch bei 0 geteilt durch 0 (PSPP selbst machte daraus 0).', 'If a divisor is 0, the result is empty - also for 0 divided by 0 (PSPP itself would make it 0).'));
    return aus;
  });

  const lad = new Laedt();
  async function anwenden() {
    if (!syntax) return;
    await lad.mit(() => wendeAn(L(`${ziel} berechnet`, `${ziel} calculated`), syntax));
  }
  const zeilenMax = 10;
</script>

<AssistentRahmen id="berechnen" titel={L('Berechnen', 'Calculate')} befehlName={L('Berechnen', 'Calculate')}
  einleitung={L('Eine neue Spalte aus einer Formel oder aus dem Mittelwert, der Summe oder einem anderen Kennwert mehrerer Spalten.', 'A new column from a formula, or from the mean, sum or another statistic of several columns.')}
  {syntax} problem={'problem' in ergebnis ? ergebnis.problem : ''} hinweise={[...formelHinweise, ...(vs.wert?.fehler.length ? [L(`PSPP meldet: ${vs.wert.fehler[0]}`, `PSPP reports: ${vs.wert.fehler[0]}`)] : [])]}
  anwendenText={L('Berechnen', 'Calculate')} anwenden={anwenden} kannAnwenden={!!syntax && !vs.wert?.fehler.length} laeuft={lad.sichtbar} ueberschreibt={zielArt === 'vorhanden' ? vorhandenWahl : ''}>
  {#snippet haupt()}
    <div class="as-feld"><span class="lbl" id="be-modus">{L('Was soll berechnet werden?', 'What should be calculated?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="be-modus">
        <label><input type="radio" name="be-modus" value="formel" bind:group={modus}>{L('Eine Formel', 'A formula')}</label>
        <label><input type="radio" name="be-modus" value="zeilen" bind:group={modus}>{L('Mittelwert, Summe … mehrerer Spalten', 'Mean, sum … of several columns')}</label></div></div>
    {#if modus === 'formel'}
      <div class="as-feld"><label for="be-formel">{L('Formel', 'Formula')}</label>
        <input id="be-formel" type="text" autocomplete="off" spellcheck="false" placeholder={L('z. B. gewicht / (groesse / 100) ** 2', 'e.g. weight / (height / 100) ** 2')} bind:this={feld} bind:value={ausdruck}></div>
      <div class="as-bausteine" role="group" aria-label={L('Bausteine für die Formel', 'Building blocks for the formula')}>
        <select aria-label={L('Spalte in die Formel einfügen', 'Insert a column into the formula')} value="" onchange={(e) => { const v = e.currentTarget.value; e.currentTarget.value = ''; if (v) void einfuegen(v); }}>
          <option value="">{L('Spalte einfügen …', 'Insert a column …')}</option>{#each zahlen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select>
        {#each RECHENZEICHEN as z}<button class="k klein" type="button" aria-label={/^[A-Za-z0-9²]/.test(z.text) ? `${z.text.replace("²", "")} ${z.name()}` : z.name()} onclick={() => einfuegen(z.t)}>{z.text}</button>{/each}
        {#each FUNKTIONEN as f}<button class="k klein" type="button" aria-label={`${f.t} ${f.name()}`} data-tipp={f.name()} onclick={() => einfuegen(`${f.t}()`, 1)}>{f.t}</button>{/each}
      </div>
    {:else}
      <div class="as-feld"><label for="be-fn">{L('Kennwert je Person', 'Statistic per person')}</label>
        <select id="be-fn" bind:value={fn}>{#each FN as f}<option value={f.fn}>{f.name()}</option>{/each}</select></div>
      <fieldset class="as-gruppe"><legend>{L('Über welche Spalten?', 'Over which columns?')}</legend>
        <ul class="as-liste">{#each zahlen as c (c.name)}
          <li class:an={gewaehlt.includes(c.name)}><label><input type="checkbox" checked={gewaehlt.includes(c.name)} onchange={(e) => (gewaehlt = e.currentTarget.checked ? [...gewaehlt, c.name] : gewaehlt.filter(x => x !== c.name))}><span><b>{c.name}</b>{#if c.bezeichnung}<small>{c.bezeichnung}</small>{/if}</span></label></li>
        {/each}</ul></fieldset>
      <div class="as-feld"><span class="lbl" id="be-min">{L('Wie viele Werte braucht eine Person mindestens?', 'How many values does a person need at least?')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="be-min">
          <label><input type="radio" name="be-min" value="eins" bind:group={mindestWahl}>{L('einen (alle vorhandenen zählen)', 'one (all present values count)')}</label>
          <label><input type="radio" name="be-min" value="haelfte" bind:group={mindestWahl}>{L('mindestens die Hälfte', 'at least half')}</label>
          <label><input type="radio" name="be-min" value="zahl" bind:group={mindestWahl}>{L('eine Zahl', 'a number')}</label></div>
        {#if mindestWahl === 'zahl'}<input class="as-schmal" type="text" inputmode="numeric" autocomplete="off" aria-label={L('Mindestzahl gültiger Werte', 'Minimum number of valid values')} bind:value={mindestZahl}>{/if}
        {#if mindestText}<p class="as-satz">{mindestText}</p>{/if}
        <p class="as-hilfe">{L('Vorgabe: mindestens die Hälfte der Fragen (eine Faustregel). Wer weniger beantwortet hat, bekommt keinen Wert - die Zelle bleibt leer, es steht keine 0 da. Statable schätzt keine fehlenden Antworten.', 'Default: at least half of the questions (a rule of thumb). Anyone who answered fewer gets no value - the cell stays empty, not 0. Statable does not estimate missing answers.')}</p></div>
    {/if}
  {/snippet}

  {#snippet weitere()}
    <div class="as-feld"><span class="lbl" id="be-ziel">{L('Wohin kommt das Ergebnis?', 'Where does the result go?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="be-ziel">
        <label><input type="radio" name="be-ziel" value="neu" bind:group={zielArt}>{L('In eine neue Spalte', 'Into a new column')}</label>
        <label><input type="radio" name="be-ziel" value="vorhanden" bind:group={zielArt}>{L('Eine vorhandene Spalte überschreiben', 'Overwrite an existing column')}</label></div></div>
    {#if zielArt === 'neu'}
      <div class="as-feld"><label for="be-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="be-name" type="text" autocomplete="off" value={ziel} oninput={(e) => (zielEigen = e.currentTarget.value)}></div>
    {:else}
      <div class="as-feld"><label for="be-vorh">{L('Welche Spalte?', 'Which column?')}</label>
        <select id="be-vorh" bind:value={vorhandenWahl}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each s.spalten as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      {#if vorhandenWahl}<p class="as-warn">{L(`Die Spalte „${vorhandenWahl}“ wird mit dem Ergebnis überschrieben. „Rückgängig“ in der Kopfzeile stellt sie wieder her.`, `The column "${vorhandenWahl}" is overwritten with the result. "Undo" in the header restores it.`)}</p>{/if}
    {/if}
    <div class="as-feld"><label for="be-bez">{L('Bezeichnung der Spalte (freiwillig)', 'Label of the column (optional)')}</label><input id="be-bez" type="text" autocomplete="off" value={bezeichnung} oninput={(e) => (bezeichnungEigen = e.currentTarget.value)}></div>
    {#if modus === 'formel'}
      <div class="as-feld"><label for="be-dez">{L('Nachkommastellen im Ergebnis', 'Decimal places in the result')}</label>
        <select id="be-dez" class="as-schmal" bind:value={dezimalen}>{#each [0, 1, 2, 3, 4] as n}<option value={n}>{n}</option>{/each}</select>
        <span class="as-hilfe">{L('Das ist nur die Anzeige; gerechnet wird genau.', 'This is only the display; the calculation is exact.')}</span></div>
      {#if bedZeilen.length}
        <BedingungsFeld bind:zeilen={bedZeilen} bind:verknuepfung spalten={daten.spalten} id="be" />
        <p class="as-hilfe">{zielArt === 'vorhanden'
          ? L('Nur für Personen, bei denen die Bedingung gilt, wird gerechnet; bei allen anderen bleibt der bisherige Wert der Spalte stehen.', 'Only people for whom the condition holds are calculated; for all others the existing value of the column stays.')
          : L('Nur für Personen, bei denen die Bedingung gilt, wird gerechnet; bei allen anderen bleibt das Ergebnis leer.', 'Only people for whom the condition holds are calculated; for all others the result stays empty.')}</p>
      {:else}
        <div class="knopfzeile"><button class="k" type="button" onclick={() => (bedZeilen = [neueBedingung(s.spalten[0]?.name)])}>{L('Nur wenn … (Bedingung)', 'Only if … (condition)')}</button></div>
      {/if}
    {/if}
  {/snippet}

  {#snippet vorschau()}
    {#if !syntax}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald die Eingaben vollständig sind.', 'The preview appears as soon as the entries are complete.')}</p>
    {:else if vs.wert && !vs.wert.fehler.length}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau, die ersten 10 Fälle', 'Preview, the first 10 cases')}>
        <table class="as-tab"><thead><tr>{#each vs.wert.spalten as c}<th scope="col" class:zahl={c.art === 'zahl'}>{c.name}</th>{/each}</tr></thead>
          <tbody>{#each vs.wert.zeilen.slice(0, zeilenMax) as z}<tr>{#each vs.wert.spalten as c, i}<td class:zahl={typeof z[i] === 'number'}>{anzeigeWert(c, z[i] ?? null)}</td>{/each}</tr>{/each}</tbody></table></div>
      {#if vs.wert.saetze.length}<ul class="as-hinweise" aria-label={L('Leere Ergebnisse', 'Empty results')}>{#each vs.wert.saetze as t}<li><span>{t}</span></li>{/each}</ul>
      {:else}<p class="as-hilfe">{L('Alle Ergebnisse haben einen Wert.', 'Every result has a value.')}</p>{/if}
    {:else if vs.laeuft}<p><Rechnet text={L('Die Vorschau wird gerechnet …', 'The preview is being calculated …')} /></p>
    {:else if vs.wert?.fehler.length}<p class="as-hilfe">{L('Mit dieser Formel kommt keine Vorschau zustande.', 'No preview can be made with this formula.')}</p>
    {:else}<button class="k" type="button" onclick={rechneVorschau}>{L('Vorschau berechnen', 'Calculate preview')}</button>{/if}
  {/snippet}
</AssistentRahmen>
