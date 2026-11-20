<script lang="ts">
  import { s, L, Lp, d, melde, aendereDaten, setzeZusatz } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName, gueltigerName } from '../lib/skalabau';
  import { anzeigeWert, spaltenOption } from '../lib/datenassistentsaetze';
  import { Laedt } from '../lib/laedt.svelte';
  import { dateiname } from '../lib/dateiname';
  import {
    pruefeRegeln, leseRegeln, regelnAlsText, regelnAusText, zahlLesen, regelSatz, regelArtName, regelProblemSatz, regelSpalten, ergebnisSatz, keineKorrekturSatz, erfuelltSatz, nichtPruefbarSatz, listeKuerzungSatz, dateiFehlerSatz,
    REGEL_ARTEN, VERGLEICHE, PLAUSI_MAX_REGELN, PLAUSI_MAX_WERTE, PLAUSI_MAX_ZEILEN_LISTE, type Regel, type RegelArt, type Vergleich, type PlausiErgebnis, type PlausiSpalte
  } from '../lib/plausibel';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  /**
   * „Plausibilität prüfen“ (Abschnitt 4): Regeln anlegen, Fälle auflisten, nichts ändern. Rechnet in JavaScript (lib/plausibel.ts), in Portionen, ohne eval und ohne freien Ausdruck.
   * Die Regeln gehören zum Projekt, lassen sich als Datei speichern und kommen in die Vorlage. Eine erfüllte Regel beweist nicht, dass der Wert stimmt.
   * Auf Wunsch entsteht eine neue Spalte mit der Zahl verletzter Regeln je Zeile; das ist die einzige Änderung und sie lässt sich rückgängig machen.
   */
  const regeln = $derived((s.zusatz.plausi ?? []) as Regel[]);
  const namen = $derived(s.spalten.map(c => c.name));
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  const nichtDatum = $derived(s.spalten.filter(c => c.art !== 'datum'));

  let art = $state<RegelArt>('bereich');
  let spalte = $state(''), minT = $state(''), maxT = $state(''), erlaubtT = $state('');
  let wennSp = $state(''), wennOp = $state<Vergleich>('='), wennWert = $state(''), dannSp = $state(''), dannOp = $state<Vergleich>('='), dannWert = $state('');
  let teile = $state<string[]>([]), ziel = $state(''), tolT = $state('0'), schluessel = $state<string[]>([]);
  let fehler = $state('');
  let neueSpalte = $state(false), spaltenName = $state('');
  let ergebnis = $state<{ e: PlausiErgebnis; regeln: Regel[]; zeilen: unknown; stand: string } | null>(null);
  let fortschritt = $state<{ n: number; von: number } | null>(null);
  let abbruch: AbortController | null = null;
  let eingabe = $state<HTMLInputElement>();
  const lad = new Laedt(), schreibt = new Laedt();
  /** Der Prozenttext wechselt laufend und steht darum nicht in einer Live-Region; angesagt wird nur der Anfang. */
  $effect(() => { if (lad.sichtbar) sage(L('Wird gerechnet …', 'Calculating …')); });

  const artVon = (n: string) => s.spalten.find(c => c.name === n)?.art;
  /** Ein Wert für einen Vergleich: bei Zahlenspalten eine Zahl, bei Text der Text. */
  function wertFuer(sp: string, t: string): string | number | null {
    if (artVon(sp) === 'zahl') return zahlLesen(t);
    return t === '' ? null : t;
  }
  function neueRegel() {
    fehler = '';
    if (regeln.length >= PLAUSI_MAX_REGELN) { fehler = Lp(PLAUSI_MAX_REGELN, `Es sind höchstens ${PLAUSI_MAX_REGELN} Regel möglich.`, `Es sind höchstens ${PLAUSI_MAX_REGELN} Regeln möglich.`, `At most ${PLAUSI_MAX_REGELN} rule is possible.`, `At most ${PLAUSI_MAX_REGELN} rules are possible.`); return; }
    let roh: unknown = null;
    if (art === 'bereich') {
      const mi = minT.trim() === '' ? null : zahlLesen(minT), ma = maxT.trim() === '' ? null : zahlLesen(maxT);
      if (!spalte) { fehler = L('Die Spalte ist noch nicht gewählt.', 'The column has not been chosen yet.'); return; }
      if ((minT.trim() !== '' && mi === null) || (maxT.trim() !== '' && ma === null)) { fehler = L('Kleinster und größter Wert müssen Zahlen sein, zum Beispiel 0 oder 12,5.', 'The smallest and largest value must be numbers, for example 0 or 12.5.'); return; }
      if (mi === null && ma === null) { fehler = L('Mindestens eine Grenze ist nötig.', 'At least one limit is needed.'); return; }
      if (mi !== null && ma !== null && mi > ma) { fehler = L('Der kleinste Wert ist größer als der größte.', 'The smallest value is larger than the largest.'); return; }
      roh = { art, spalte, min: mi, max: ma };
    } else if (art === 'werte') {
      if (!spalte) { fehler = L('Die Spalte ist noch nicht gewählt.', 'The column has not been chosen yet.'); return; }
      const zeilen = erlaubtT.split(/\r?\n/).map(z => z.trim()).filter(Boolean);
      if (!zeilen.length) { fehler = L('Mindestens ein erlaubter Wert ist nötig, einer je Zeile.', 'At least one allowed value is needed, one per line.'); return; }
      if (zeilen.length > PLAUSI_MAX_WERTE) { fehler = Lp(PLAUSI_MAX_WERTE, `Es sind höchstens ${PLAUSI_MAX_WERTE} Wert möglich.`, `Es sind höchstens ${PLAUSI_MAX_WERTE} Werte möglich.`, `At most ${PLAUSI_MAX_WERTE} value is possible.`, `At most ${PLAUSI_MAX_WERTE} values are possible.`); return; }
      const w = zeilen.map(z => wertFuer(spalte, z));
      if (w.some(x => x === null)) { fehler = L('Bei einer Zahlenspalte müssen alle erlaubten Werte Zahlen sein.', 'For a number column all allowed values must be numbers.'); return; }
      roh = { art, spalte, erlaubt: w };
    } else if (art === 'wenn') {
      if (!wennSp || !dannSp) { fehler = L('Beide Spalten (A und B) müssen gewählt sein.', 'Both columns (A and B) must be chosen.'); return; }
      const a = wertFuer(wennSp, wennWert), b = wertFuer(dannSp, dannWert);
      if (a === null || b === null) { fehler = L('Die Vergleichswerte fehlen oder passen nicht zur Spalte: Zahlenspalten brauchen Zahlen.', 'The comparison values are missing or do not fit the column: number columns need numbers.'); return; }
      if ((artVon(wennSp) === 'text' && wennOp !== '=' && wennOp !== '!=') || (artVon(dannSp) === 'text' && dannOp !== '=' && dannOp !== '!=')) { fehler = L('Bei Text sind nur „=“ und „≠“ möglich.', 'For text only "=" and "≠" are possible.'); return; }
      roh = { art, wenn: { spalte: wennSp, op: wennOp, wert: a }, dann: { spalte: dannSp, op: dannOp, wert: b } };
    } else if (art === 'summe') {
      const tol = zahlLesen(tolT);
      if (teile.length < 2) { fehler = L('Mindestens zwei Spalten zum Addieren wählen.', 'Choose at least two columns to add.'); return; }
      if (!ziel) { fehler = L('Die Spalte, die die Summe sein soll, ist noch nicht gewählt.', 'The column that should equal the sum has not been chosen yet.'); return; }
      if (teile.includes(ziel)) { fehler = L('Die Summenspalte darf nicht zu den addierten Spalten gehören.', 'The sum column must not be one of the added columns.'); return; }
      if (tol === null || tol < 0) { fehler = L('Die Toleranz muss eine Zahl ab 0 sein.', 'The tolerance must be a number from 0.'); return; }
      roh = { art, teile: [...teile], ziel, toleranz: tol };
    } else {
      if (!schluessel.length) { fehler = L('Mindestens eine Spalte für den Schlüssel wählen.', 'Choose at least one column for the key.'); return; }
      roh = { art, spalten: [...schluessel] };
    }
    const neu = leseRegeln([{ ...(roh as object), id: `r${Date.now().toString(36)}` }])[0];
    if (!neu) { fehler = L('Die Regel ist nicht gültig.', 'The rule is not valid.'); return; }
    void speichereRegeln([...regeln, neu]);
    melde(L('Die Regel ist angelegt.', 'The rule has been added.'), true);
  }
  async function speichereRegeln(neu: Regel[]) {
    const rein = leseRegeln($state.snapshot(neu));   // eigene Kopie: nie ein Proxy in die Ablage
    await setzeZusatz({ plausi: rein });
    ergebnis = null;
  }
  function weg(i: number) { void speichereRegeln(regeln.filter((_, k) => k !== i)); }

  const plausiSpalten = (): PlausiSpalte[] => s.spalten.map(c => ({ name: c.name, art: c.art, fehlend: [...c.fehlend], fehlendBereich: c.fehlendBereich ?? null, ...(c.leerGueltig !== undefined ? { leerGueltig: c.leerGueltig } : {}) }));
  const standText = () => `${s.zeilen.length}/${s.spalten.length}/${s.verlauf.length}`;
  async function pruefen() {
    if (!regeln.length) return;
    abbruch = new AbortController();
    fortschritt = { n: 0, von: s.zeilen.length };
    const meine = $state.snapshot(regeln) as Regel[], zeilenRef = s.zeilen, stand = standText();
    const r = await lad.mit(() => pruefeRegeln(plausiSpalten(), zeilenRef as unknown as (string | number | null)[][], meine, { mitAnzahl: true, signal: abbruch!.signal, fortschritt: (n, von) => { fortschritt = { n, von }; } }));
    fortschritt = null;
    if (r && !r.abgebrochen) ergebnis = { e: r, regeln: meine, zeilen: zeilenRef, stand };
    else if (r?.abgebrochen) melde(L('Die Prüfung wurde abgebrochen.', 'The check was cancelled.'));
  }
  const veraltet = $derived(!!ergebnis && ergebnis.stand !== standText());

  const spaltenIdx = (n: string) => s.spalten.findIndex(c => c.name.toLowerCase() === n.toLowerCase());
  /** Für jede Zeile der Liste: die Werte der Spalten, die in den verletzten Regeln vorkommen. */
  const listeSpalten = $derived.by((): string[] => {
    if (!ergebnis) return [];
    const aus: string[] = [];
    for (const z of ergebnis.e.liste) for (const ri of z.regeln) for (const n of regelSpalten(ergebnis.regeln[ri]!)) { const c = s.spalten[spaltenIdx(n)]; if (c && !aus.includes(c.name)) aus.push(c.name); }
    return aus.slice(0, 8);
  });
  const nameVorschlag = $derived(freierName(L('Verletzte_Regeln', 'Violated_rules'), namen));
  const spaltenNameEff = $derived(spaltenName || nameVorschlag);
  const nameProblem = $derived(!neueSpalte ? '' : !spaltenNameEff.trim() ? L('Die neue Spalte braucht einen Namen.', 'The new column needs a name.') : !gueltigerName(spaltenNameEff) ? L('Der Name der neuen Spalte ist nicht erlaubt: Er beginnt mit einem Buchstaben und hat keine Leerzeichen.', 'The name of the new column is not allowed: it starts with a letter and has no spaces.') : namen.some(n => n.toUpperCase() === spaltenNameEff.toUpperCase()) ? L('Eine Spalte mit diesem Namen gibt es schon. Bitte einen neuen Namen wählen.', 'A column with this name already exists. Please choose a new name.') : '');
  const kannSchreiben = $derived(!!ergebnis && !veraltet && neueSpalte && !nameProblem && !!ergebnis.e.anzahl);
  const problem = $derived(!regeln.length ? L('Es gibt noch keine Regel.', 'There is no rule yet.') : !neueSpalte ? L('Die neue Spalte ist nicht gewählt. Die Prüfung selbst ändert nichts.', 'The new column is not selected. The check itself changes nothing.') : !ergebnis ? L('Erst „Regeln prüfen“.', 'First "Check rules".') : veraltet ? L('Die Daten haben sich seit der Prüfung geändert. Bitte noch einmal prüfen.', 'The data have changed since the check. Please check again.') : nameProblem);

  async function anlegen() {
    if (!kannSchreiben || !ergebnis) return;
    const anzahl = ergebnis.e.anzahl!;
    await schreibt.mit(async () => {
      try {
        const nSp: Spalte = { name: spaltenNameEff, bezeichnung: L('Zahl der verletzten Regeln', 'Number of violated rules'), art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} };
        const spalten = [...($state.snapshot(s.spalten) as Spalte[]), nSp], zeilen = s.zeilen.map((z, i): Wert[] => [...z, anzahl[i] ?? 0]);
        const ok = await aendereDaten(L(`${spaltenNameEff} angelegt (verletzte Regeln)`, `${spaltenNameEff} created (violated rules)`), spalten, zeilen, true, { art: 'plausibel', nicht: 'art' });
        if (ok) melde(L(`Die Spalte ${spaltenNameEff} ist angelegt. Sie zählt je Zeile die verletzten Regeln; nicht prüfbare Regeln zählen nicht mit.`, `The column ${spaltenNameEff} has been created. It counts the violated rules per row; rules that are not checkable do not count.`), true);
      } catch (f) { melde(L('Das ließ sich nicht rechnen. Es ist alles wie vorher.', 'This could not be calculated. Everything is as it was before.')); console.error(f); }
    });
  }

  function speichern() {
    const url = URL.createObjectURL(new Blob([regelnAlsText($state.snapshot(regeln) as Regel[])], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${dateiname(s.projekt?.name ?? '')} - ${L('Regeln', 'Rules')}.json` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function oeffnen(ev: Event) {
    const el = ev.currentTarget as HTMLInputElement, f = el.files?.[0]; el.value = '';
    if (!f) return;
    fehler = '';
    if (f.size > 2 * 1024 * 1024) { fehler = dateiFehlerSatz('zu-gross'); return; }
    const r = regelnAusText(await f.text());
    if (!r.ok) { fehler = dateiFehlerSatz(r.grund); return; }
    const frei = PLAUSI_MAX_REGELN - regeln.length;
    const dazu = r.regeln.map((x, i) => ({ ...x, id: `d${Date.now().toString(36)}${i}` })).slice(0, Math.max(0, frei)) as Regel[];
    await speichereRegeln([...regeln, ...dazu]);
    melde(Lp(dazu.length, `${dazu.length} Regel gelesen.`, `${dazu.length} Regeln gelesen.`, `${dazu.length} rule read.`, `${dazu.length} rules read.`) + (r.verworfen || dazu.length < r.regeln.length ? ' ' + Lp(r.verworfen + r.regeln.length - dazu.length, `${r.verworfen + r.regeln.length - dazu.length} Regel wurde nicht übernommen (ungültig oder zu viele).`, `${r.verworfen + r.regeln.length - dazu.length} Regeln wurden nicht übernommen (ungültig oder zu viele).`, `${r.verworfen + r.regeln.length - dazu.length} rule was not taken over (invalid or too many).`, `${r.verworfen + r.regeln.length - dazu.length} rules were not taken over (invalid or too many).`) : ''), true);
  }
  const OP: Record<Vergleich, string> = { '=': '=', '!=': '≠', '<': '<', '<=': '≤', '>': '>', '>=': '≥' };
  const wahlListe = (liste: string[], n: string, an: boolean) => (an ? [...liste, n] : liste.filter(x => x !== n));
</script>

<AssistentRahmen id="plausibel" titel={L('Plausibilität prüfen', 'Check plausibility')} befehlName={L('Plausibilität prüfen', 'Check plausibility')}
  einleitung={L('Regeln anlegen und die Zeilen auflisten, die eine Regel nicht erfüllen. Statable ändert dabei nichts. Auf Wunsch entsteht eine neue Spalte mit der Zahl der verletzten Regeln je Zeile. Die Regeln gehören zum Projekt und lassen sich als Datei speichern.', 'Create rules and list the rows that do not meet a rule. Statable changes nothing in doing so. On request a new column is created with the number of violated rules per row. The rules belong to the project and can be saved as a file.')}
  hinweise={[keineKorrekturSatz(), erfuelltSatz(), nichtPruefbarSatz()]} {problem} syntax=""
  anwendenText={L('Neue Spalte anlegen', 'Create new column')} anwenden={anlegen} kannAnwenden={kannSchreiben} laeuft={schreibt.sichtbar}>
  {#snippet haupt()}
    <fieldset class="as-gruppe">
      <legend>{L('Neue Regel', 'New rule')}</legend>
      <div class="as-felder">
        <div class="as-feld"><label for="pl-art">{L('Art der Regel', 'Kind of rule')}</label>
          <select id="pl-art" bind:value={art} onchange={() => (fehler = '')}>{#each REGEL_ARTEN as a}<option value={a}>{regelArtName(a)}</option>{/each}</select></div>
        {#if art === 'bereich'}
          <div class="as-feld"><label for="pl-sp">{L('Spalte (Zahlen)', 'Column (numbers)')}</label>
            <select id="pl-sp" bind:value={spalte}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
          <div class="as-feld"><label for="pl-min">{L('Kleinster erlaubter Wert (leer = keine Grenze)', 'Smallest allowed value (empty = no limit)')}</label><input id="pl-min" type="text" inputmode="decimal" autocomplete="off" bind:value={minT}></div>
          <div class="as-feld"><label for="pl-max">{L('Größter erlaubter Wert (leer = keine Grenze)', 'Largest allowed value (empty = no limit)')}</label><input id="pl-max" type="text" inputmode="decimal" autocomplete="off" bind:value={maxT}></div>
        {:else if art === 'werte'}
          <div class="as-feld"><label for="pl-sp">{L('Spalte', 'Column')}</label>
            <select id="pl-sp" bind:value={spalte}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each nichtDatum as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
          <div class="as-feld"><label for="pl-erl">{L('Erlaubte Werte, einer je Zeile', 'Allowed values, one per line')}</label><textarea id="pl-erl" rows="4" bind:value={erlaubtT}></textarea></div>
        {:else if art === 'wenn'}
          <div class="as-feld"><label for="pl-wsp">{L('Wenn (A): Spalte', 'If (A): column')}</label>
            <select id="pl-wsp" bind:value={wennSp}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each nichtDatum as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
          <div class="as-feld"><label for="pl-wop">{L('Vergleich', 'Comparison')}</label><select id="pl-wop" bind:value={wennOp}>{#each VERGLEICHE as o}<option value={o}>{OP[o]}</option>{/each}</select></div>
          <div class="as-feld"><label for="pl-wwert">{L('Wert', 'Value')}</label><input id="pl-wwert" type="text" autocomplete="off" bind:value={wennWert}></div>
          <div class="as-feld"><label for="pl-dsp">{L('Dann (B): Spalte', 'Then (B): column')}</label>
            <select id="pl-dsp" bind:value={dannSp}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each nichtDatum as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
          <div class="as-feld"><label for="pl-dop">{L('Vergleich', 'Comparison')}</label><select id="pl-dop" bind:value={dannOp}>{#each VERGLEICHE as o}<option value={o}>{OP[o]}</option>{/each}</select></div>
          <div class="as-feld"><label for="pl-dwert">{L('Wert', 'Value')}</label><input id="pl-dwert" type="text" autocomplete="off" bind:value={dannWert}></div>
        {:else if art === 'summe'}
          <div class="as-feld"><span class="lbl" id="pl-teile-l">{L('Spalten, die addiert werden', 'Columns that are added')}</span>
            <div class="as-chips" role="group" aria-labelledby="pl-teile-l">{#each zahlen as c (c.name)}<label class="as-chip"><input type="checkbox" checked={teile.includes(c.name)} onchange={(e) => (teile = wahlListe(teile, c.name, e.currentTarget.checked))}>{c.name}</label>{/each}</div></div>
          <div class="as-feld"><label for="pl-ziel">{L('Soll gleich sein: Spalte', 'Should equal: column')}</label>
            <select id="pl-ziel" bind:value={ziel}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
          <div class="as-feld"><label for="pl-tol">{L('Toleranz (so viel darf die Summe abweichen)', 'Tolerance (how far the sum may differ)')}</label><input id="pl-tol" class="as-schmal" type="text" inputmode="decimal" autocomplete="off" bind:value={tolT}></div>
        {:else}
          <div class="as-feld"><span class="lbl" id="pl-schl-l">{L('Spalten, die zusammen nur einmal vorkommen dürfen', 'Columns that may occur only once together')}</span>
            <div class="as-chips" role="group" aria-labelledby="pl-schl-l">{#each s.spalten as c (c.name)}<label class="as-chip"><input type="checkbox" checked={schluessel.includes(c.name)} onchange={(e) => (schluessel = wahlListe(schluessel, c.name, e.currentTarget.checked))}>{c.name}</label>{/each}</div></div>
        {/if}
      </div>
      {#if fehler}<p class="as-problem" role="alert">{fehler}</p>{/if}
      <div class="knopfzeile"><button class="k" type="button" onclick={neueRegel}><Icon n="plus" />{L('Regel hinzufügen', 'Add rule')}</button></div>
    </fieldset>

    <fieldset class="as-gruppe">
      <legend>{L('Regeln des Projekts', 'Rules of the project')}</legend>
      {#if regeln.length}
        <ol class="as-regeln-liste">
          {#each regeln as r, i (r.id)}<li><span>{regelSatz(r)}</span> <button class="k leise" type="button" onclick={() => weg(i)} aria-label={L(`Regel ${i + 1} entfernen`, `Remove rule ${i + 1}`)}><Icon n="x" />{L('Entfernen', 'Remove')}</button></li>{/each}
        </ol>
      {:else}<p class="as-leer">{L('Es gibt noch keine Regel.', 'There is no rule yet.')}</p>{/if}
      <div class="knopfzeile">
        <button class="k" type="button" onclick={speichern} disabled={!regeln.length}><Icon n="download" />{L('Regeln als Datei speichern', 'Save rules as a file')}</button>
        <button class="k" type="button" onclick={() => eingabe?.click()}><Icon n="ordner" />{L('Regeln aus Datei lesen', 'Read rules from a file')}</button>
        <input bind:this={eingabe} type="file" accept=".json,application/json" hidden onchange={oeffnen}>
      </div>
      <p class="as-hilfe">{L('Gelesene Regeln kommen zu den vorhandenen dazu. Die Regeln stehen auch in der Vorlage des Projekts.', 'Rules that are read are added to the existing ones. The rules are also part of the template of the project.')}</p>
    </fieldset>

    <div class="knopfzeile">
      <button class="k haupt" type="button" onclick={pruefen} disabled={!regeln.length || lad.aktiv}><Icon n="haken" />{L('Regeln prüfen', 'Check rules')}</button>
      {#if lad.aktiv}<button class="k" type="button" onclick={() => abbruch?.abort()}>{L('Abbrechen', 'Cancel')}</button>{/if}
    </div>
    {#if lad.sichtbar}<p><Rechnet text={fortschritt && fortschritt.von > 0 ? L(`Statable prüft … ${Math.min(100, Math.round((fortschritt.n / (fortschritt.von * (regeln.some(r => r.art === 'schluessel') ? 2 : 1))) * 100))} %`, `Statable is checking … ${Math.min(100, Math.round((fortschritt.n / (fortschritt.von * (regeln.some(r => r.art === 'schluessel') ? 2 : 1))) * 100))} %`) : L('Statable prüft …', 'Statable is checking …')} /></p>{/if}
    <p class="as-hilfe"><HilfeLink id="plausibilitaet" text={L('Hilfe: Plausibilität prüfen', 'Help: check plausibility')} /></p>
  {/snippet}
  {#snippet weitere()}
    <label class="as-eins"><input type="checkbox" bind:checked={neueSpalte}><span>{L('Neue Spalte mit der Zahl der verletzten Regeln anlegen', 'Create a new column with the number of violated rules')}</span></label>
    {#if neueSpalte}<div class="as-feld"><label for="pl-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="pl-name" type="text" autocomplete="off" value={spaltenNameEff} oninput={(e) => (spaltenName = e.currentTarget.value)}></div>{/if}
  {/snippet}
  {#snippet vorschau()}
    {#if ergebnis}
      {#if veraltet}<p class="as-warn" role="status">{L('Die Daten haben sich seit dieser Prüfung geändert. Die Zahlen unten gelten für den früheren Stand.', 'The data have changed since this check. The numbers below apply to the earlier state.')}</p>{/if}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Ergebnis je Regel', 'Result per rule')}>
        <table class="as-tab"><thead><tr><th scope="col">{L('Regel', 'Rule')}</th><th scope="col" class="zahl">{L('geprüft', 'checked')}</th><th scope="col" class="zahl">{L('verletzt', 'violated')}</th><th scope="col" class="zahl">{L('nicht prüfbar', 'not checkable')}</th></tr></thead>
          <tbody>{#each ergebnis.e.regeln as e, i}<tr><th scope="row" style="white-space:normal;max-width:36rem">{i + 1}. {regelSatz(ergebnis.regeln[i]!)}{#if regelProblemSatz(e)}<br><small>{regelProblemSatz(e)}</small>{/if}</th><td class="zahl">{e.geprueft}</td><td class="zahl">{e.verletzt}</td><td class="zahl">{e.nichtPruefbar}</td></tr>{/each}</tbody></table>
      </div>
      <ul class="as-hinweise" aria-label={L('Zu jeder Regel', 'For each rule')}>{#each ergebnis.e.regeln as e, i}<li><Icon n="hinweis" k="hw" /><span>{i + 1}. {ergebnisSatz(e)}{#if e.bedingungZutraf !== undefined && !regelProblemSatz(e)} {L(`Die Bedingung A traf in ${e.bedingungZutraf} Zeilen zu.`, `Condition A applied in ${e.bedingungZutraf} rows.`)}{/if}</span></li>{/each}</ul>
      <h4>{Lp(ergebnis.e.zeilenVerletzt, `${ergebnis.e.zeilenVerletzt} Zeile mit mindestens einer verletzten Regel`, `${ergebnis.e.zeilenVerletzt} Zeilen mit mindestens einer verletzten Regel`, `${ergebnis.e.zeilenVerletzt} row with at least one violated rule`, `${ergebnis.e.zeilenVerletzt} rows with at least one violated rule`)}</h4>
      {#if listeKuerzungSatz(ergebnis.e.zeilenVerletzt)}<p class="as-hilfe">{listeKuerzungSatz(ergebnis.e.zeilenVerletzt)}</p>{/if}
      {#if ergebnis.e.liste.length}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L(`Zeilen mit verletzten Regeln, höchstens ${PLAUSI_MAX_ZEILEN_LISTE}`, `Rows with violated rules, at most ${PLAUSI_MAX_ZEILEN_LISTE}`)} style="max-height:28rem">
          <table class="as-tab"><thead><tr><th scope="col" class="zahl">{L('Zeile', 'Row')}</th><th scope="col">{L('Verletzte Regeln', 'Violated rules')}</th>{#each listeSpalten as n}<th scope="col">{n}</th>{/each}</tr></thead>
            <tbody>{#each ergebnis.e.liste as z (z.zeile)}<tr><th scope="row" class="zahl">{z.zeile + 1}</th><td>{z.regeln.map(r => r + 1).join(', ')}</td>{#each listeSpalten as n}{@const i = spaltenIdx(n)}<td class:zahl={typeof (s.zeilen[z.zeile]?.[i]) === 'number'}>{anzeigeWert(s.spalten[i], (s.zeilen[z.zeile]?.[i] ?? null) as Wert)}</td>{/each}</tr>{/each}</tbody></table>
        </div>
      {/if}
    {:else}<p class="as-hilfe">{L('Das Ergebnis erscheint nach „Regeln prüfen“.', 'The result appears after "Check rules".')}</p>{/if}
  {/snippet}
</AssistentRahmen>

<style>
  .as-regeln-liste { margin: 0; padding-inline-start: 1.5rem; display: flex; flex-direction: column; gap: var(--a2); max-width: var(--breite-text); }
  .as-regeln-liste li { overflow-wrap: anywhere; }
  textarea { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a2); width: 100%; box-sizing: border-box; }
  textarea:focus-visible { border-color: var(--fokus); box-shadow: var(--fokus-ring); }
</style>
