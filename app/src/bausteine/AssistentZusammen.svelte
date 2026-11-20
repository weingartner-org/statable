<script lang="ts">
  import { pk } from '../lib/befehlstext';
  import { untrack, onDestroy } from 'svelte';
  import { s, L, Lp } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { gueltigerName } from '../lib/skalabau';
  import { AssistentFehler, anhaengenBefehl, anhaengenPruefen, namenskonflikte, zuordnenBefehl, zuordnenPruefen, type Beziehung } from '../lib/datenassistent';
  import { anhaengenSaetze, anzeigeWert, fehlerSatz, spaltenOption, sperreSatz, zuordnenSaetze } from '../lib/datenassistentsaetze';
  import { ZWEITE_DATEI, ladeZweiteDatei, legeZweiteBereit, probelauf, wendeAn, type ZweiteDatei } from '../lib/datenassistentlauf';
  import { AUTO_ZELLEN, Vorschau } from '../lib/assistentvorschau.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  let modus = $state<'anhaengen' | 'spalten'>('spalten');

  /* ---------- Die zweite Datei ---------- */
  let zweite = $state<ZweiteDatei | null>(null);
  let ladeFehler = $state('');
  let dateiFeld = $state<HTMLInputElement>();
  const laden = new Laedt();
  async function waehleDatei(e: Event) {
    const feld = e.currentTarget as HTMLInputElement, datei = feld.files?.[0];
    feld.value = '';
    if (!datei) return;
    ladeFehler = '';
    await laden.mit(async () => {
      try { zweite = await ladeZweiteDatei(datei); }
      catch (f) { zweite = null; ladeFehler = fehlerSatz(f instanceof AssistentFehler ? f : new AssistentFehler('lesen', datei.name)); }
    });
  }

  /* ---------- Kennung und Beziehung ---------- */
  let kennungA = $state(''), kennungB = $state('');
  let beziehung = $state<Beziehung>('1:1');
  let umbenennenEigen = $state<Record<string, string>>({});
  /** Beim Laden einer Datei: gleich benannte Spalte als Kennung vorschlagen (bevorzugt eine, die wie eine Kennung heißt). */
  $effect(() => {
    const z = zweite; if (!z) return;
    untrack(() => {
      const gemeinsam = daten.spalten.filter(a => z.daten.spalten.some(b => b.name.toUpperCase() === a.name.toUpperCase()));
      const wahl = gemeinsam.find(c => /(^|_)(id|kennung|code|nr|pid)$|^(id|kennung|code|nr|pid)/i.test(c.name)) ?? gemeinsam[0];
      kennungA = wahl?.name ?? ''; kennungB = wahl ? z.daten.spalten.find(b => b.name.toUpperCase() === wahl.name.toUpperCase())!.name : '';
      umbenennenEigen = {};
    });
  });

  const konflikte = $derived(zweite && kennungB ? namenskonflikte(daten, zweite.daten, kennungB) : []);
  /** Für jede doppelte Spalte der zweiten Datei ein neuer Name (Vorschlag oder eigener) - gilt als ausdrückliche Wahl, weil er sichtbar im Formular steht. */
  const umbenennen = $derived(Object.fromEntries(konflikte.map(k => [k.name, umbenennenEigen[k.name] ?? k.vorschlag])));
  const umbenennenProblem = $derived.by(() => {
    const vergeben = new Set([...daten.spalten.map(c => c.name), ...(zweite?.daten.spalten.map(c => c.name) ?? [])].map(n => n.toUpperCase()));
    const neue = Object.values(umbenennen);
    for (const n of neue) {
      if (!gueltigerName(n)) return L(`„${n}“ ist kein gültiger Spaltenname.`, `"${n}" is not a valid column name.`);
      if (vergeben.has(n.toUpperCase()) || neue.filter(x => x.toUpperCase() === n.toUpperCase()).length > 1) return L(`Der Name „${n}“ ist schon vergeben.`, `The name "${n}" is already taken.`);
    }
    return '';
  });

  /* ---------- Prüfung und Befehl ---------- */
  const anhaengenP = $derived(zweite ? anhaengenPruefen(daten, zweite.daten) : null);
  const zuordnenP = $derived(zweite && kennungA && kennungB ? zuordnenPruefen(daten, zweite.daten, { beziehung, kennungA, kennungB, umbenennen }) : null);
  const ergebnis = $derived.by((): { syntax: string; zeilen: number } | { problem: string } => {
    if (!zweite) return { problem: L('Zuerst die zweite Datei wählen.', 'First choose the second file.') };
    try {
      if (modus === 'anhaengen') {
        return { syntax: [`* ${pk(L(`Fälle anhängen: die zweite Datei „${zweite.name}“ liegt in der Engine als ${ZWEITE_DATEI}`, `Append cases: the second file "${zweite.name}" is in the engine as ${ZWEITE_DATEI}`))}.`, anhaengenBefehl(daten, zweite.daten, ZWEITE_DATEI)].join('\n'), zeilen: daten.zeilen.length + zweite.daten.zeilen.length };
      }
      if (!kennungA || !kennungB) return { problem: L('Die Kennung ist noch nicht gewählt: eine Spalte, die in beiden Dateien dieselbe Person oder Klasse nennt.', 'The ID is not chosen yet: a column that names the same person or class in both files.') };
      if (umbenennenProblem) return { problem: umbenennenProblem };
      const o = { beziehung, kennungA, kennungB, umbenennen };
      const b = zuordnenBefehl(daten, zweite.daten, o, '/zz_b.sav');
      const syntax = [
        `* ${pk(L(`Spalten hinzufügen über die Kennung: die zweite Datei „${zweite.name}“ liegt in der Engine als ${ZWEITE_DATEI}`, `Add columns by ID: the second file "${zweite.name}" is in the engine as ${ZWEITE_DATEI}`))}.`,
        `* ${L('Zuerst wird die zweite Datei vorbereitet (Fälle ohne Kennung weg, nach Kennung sortiert), dann zugeordnet', 'First the second file is prepared (cases without ID removed, sorted by ID), then matched')}.`,
        `SAVE OUTFILE='/zz_a.sav'.`, `GET FILE='${ZWEITE_DATEI}'.`, b.vorbereitungB, `SAVE OUTFILE='/zz_b.sav'.`, `GET FILE='/zz_a.sav'.`, b.syntax
      ].join('\n');
      return { syntax, zeilen: daten.zeilen.length + (beziehung === '1:1' ? zuordnenP!.b.faelleOhnePartner : 0) };
    } catch (f) {
      if (f instanceof AssistentFehler && f.code === 'sperre' && modus === 'spalten' && zuordnenP?.sperren.length) return { problem: sperreSatz(zuordnenP.sperren[0]!) };
      if (f instanceof AssistentFehler && f.code === 'sperre') return { problem: L('Die Fälle lassen sich so nicht anhängen: Bei einer Spalte stehen Zahl und Text gegeneinander.', 'The cases cannot be appended like this: for one column a number is set against text.') };
      return { problem: fehlerSatz(f) };
    }
  });
  const syntax = $derived('syntax' in ergebnis ? ergebnis.syntax : '');
  const saetze = $derived(modus === 'anhaengen' ? (anhaengenP ? anhaengenSaetze(anhaengenP) : []) : (zuordnenP ? zuordnenSaetze(zuordnenP, beziehung) : []));

  /* ---------- Vorschau: die ersten Fälle des Ergebnisses (Probelauf) ---------- */
  interface Probe { spalten: Spalte[]; zeilen: Wert[][]; anzahl: number; fehler: string[] }
  const vs = new Vorschau<Probe>();
  onDestroy(() => vs.verwerfe());
  const gross = $derived((s.zeilen.length + (zweite?.daten.zeilen.length ?? 0)) * s.spalten.length > AUTO_ZELLEN);
  async function probe(sx: string, z: ZweiteDatei): Promise<Probe> {
    await legeZweiteBereit(z);
    const r = await probelauf(sx);
    if (!r.daten) return { spalten: [], zeilen: [], anzahl: 0, fehler: r.fehler };
    return { spalten: r.daten.spalten, zeilen: r.daten.zeilen.slice(0, 5), anzahl: r.daten.zeilen.length, fehler: [] };
  }
  $effect(() => { const sx = syntax, z = zweite; if (!sx || !z) return; untrack(() => vs.plane(() => probe(sx, z), !gross)); });
  const rechneVorschau = () => { if (syntax && zweite) void vs.jetzt(() => probe(syntax, zweite!)); };

  const lad = new Laedt();
  async function anwenden() {
    if (!syntax || !zweite) return;
    const z = zweite;
    await lad.mit(async () => {
      await legeZweiteBereit(z);
      await wendeAn(modus === 'anhaengen' ? L(`Fälle aus „${z.name}“ angehängt`, `Cases from "${z.name}" appended`) : L(`Spalten aus „${z.name}“ hinzugefügt`, `Columns from "${z.name}" added`), syntax);
    });
  }
</script>

<AssistentRahmen id="zusammen" titel={L('Zusammenführen', 'Merge')} befehlName={L('Zusammenführen', 'Merge')}
  einleitung={L('Eine zweite Datei mit den Daten verbinden: entweder weitere Fälle darunter anhängen (gleiche Spalten) oder weitere Spalten hinzufügen, die über eine Kennung (Person, Klasse) zusammenpassen.', 'Combine a second file with the data: either append more cases below (same columns) or add more columns that match through an ID (person, class).')}
  {syntax} problem={'problem' in ergebnis ? ergebnis.problem : ''}
  hinweise={[...saetze, ...(vs.wert?.fehler.length ? [L(`PSPP meldet: ${vs.wert.fehler[0]}`, `PSPP reports: ${vs.wert.fehler[0]}`)] : [])]}
  anwendenText={L('Zusammenführen', 'Merge')} anwenden={anwenden} kannAnwenden={!!syntax && !vs.wert?.fehler.length} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <div class="as-feld"><span class="lbl" id="zu-modus">{L('Wie soll verbunden werden?', 'How should they be combined?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="zu-modus">
        <label><input type="radio" name="zu-modus" value="spalten" bind:group={modus}>{L('Spalten hinzufügen (über eine Kennung)', 'Add columns (by an ID)')}</label>
        <label><input type="radio" name="zu-modus" value="anhaengen" bind:group={modus}>{L('Fälle anhängen (gleiche Spalten)', 'Append cases (same columns)')}</label></div></div>

    <div class="as-feld"><span class="lbl">{L('Zweite Datei', 'Second file')}</span>
      <div class="knopfzeile">
        <input class="nur-vorleser" type="file" id="zu-datei" tabindex="-1" aria-label={L('Zweite Datei', 'Second file')} accept=".sav,.dta,.sas7bdat,.xpt,.csv,.txt,.tsv,.xlsx,.xlsm,.xls,.ods" bind:this={dateiFeld} onchange={waehleDatei}>
        <button class="k" type="button" disabled={laden.aktiv} onclick={() => dateiFeld?.click()}>{#if laden.sichtbar}<Rechnet imKnopf />{:else}<Icon n="ordner" />{/if}{zweite ? L('Andere Datei wählen', 'Choose another file') : L('Datei wählen', 'Choose a file')}</button>
        {#if zweite}<span class="as-satz">{L(`„${zweite.name}“: ${zweite.daten.zeilen.length} Fälle, ${zweite.daten.spalten.length} Spalten`, `"${zweite.name}": ${zweite.daten.zeilen.length} cases, ${zweite.daten.spalten.length} columns`)}</span>{/if}
      </div>
      <span class="as-hilfe">{L('SPSS (.sav), Stata (.dta), CSV oder Excel. Die Datei bleibt auf diesem Gerät.', 'SPSS (.sav), Stata (.dta), CSV or Excel. The file stays on this device.')}</span>
      {#if ladeFehler}<p class="as-problem" role="status">{ladeFehler}</p>{/if}
    </div>

    {#if modus === 'spalten' && zweite}
      <div class="as-felder">
        <div class="as-feld"><label for="zu-ka">{L('Kennung in den Daten', 'ID in the data')}</label>
          <select id="zu-ka" bind:value={kennungA}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each daten.spalten as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        <div class="as-feld"><label for="zu-kb">{L('Kennung in der zweiten Datei', 'ID in the second file')}</label>
          <select id="zu-kb" bind:value={kennungB}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zweite.daten.spalten as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      </div>
      <div class="as-feld"><span class="lbl" id="zu-bez">{L('Wie passen die Dateien zusammen?', 'How do the files match?')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="zu-bez">
          <label><input type="radio" name="zu-bez" value="1:1" bind:group={beziehung}>{L('Eine Zeile je Kennung in beiden Dateien', 'One row per ID in both files')}</label>
          <label><input type="radio" name="zu-bez" value="viele:1" bind:group={beziehung}>{L('Viele zu einer (mehrere Personen je Klasse)', 'Many to one (several people per class)')}</label></div></div>
      {#if konflikte.length}
        <fieldset class="as-gruppe"><legend>{L('Spalten mit gleichem Namen', 'Columns with the same name')}</legend>
          <p class="as-hilfe">{Lp(konflikte.length, 'Diese Spalte gibt es in beiden Dateien. PSPP würde die aus der zweiten Datei still weglassen; sie heißt im Ergebnis so:', 'Diese Spalten gibt es in beiden Dateien. PSPP würde die aus der zweiten Datei still weglassen; sie heißen im Ergebnis so:', 'This column exists in both files. PSPP would silently drop the one from the second file; it is named like this in the result:', 'These columns exist in both files. PSPP would silently drop those from the second file; they are named like this in the result:')}</p>
          <div class="as-felder">{#each konflikte as k}<div class="as-feld"><label for="zu-n-{k.name}">{k.name}</label><input id="zu-n-{k.name}" type="text" autocomplete="off" value={umbenennen[k.name]} oninput={(e) => (umbenennenEigen[k.name] = e.currentTarget.value)}></div>{/each}</div></fieldset>
      {/if}
    {/if}
  {/snippet}

  {#snippet vorschau()}
    {#if !syntax}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald die zweite Datei und die Kennung feststehen und nichts mehr gesperrt ist.', 'The preview appears as soon as the second file and the ID are set and nothing is blocked any more.')}</p>
    {:else if vs.wert && !vs.wert.fehler.length}
      <p class="as-satz">{L(`Das Ergebnis hat ${vs.wert.anzahl} Fälle und ${vs.wert.spalten.length} Spalten.`, `The result has ${vs.wert.anzahl} cases and ${vs.wert.spalten.length} columns.`)}</p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau, die ersten 5 Fälle', 'Preview, the first 5 cases')}>
        <table class="as-tab"><thead><tr>{#each vs.wert.spalten as c}<th scope="col" class:zahl={c.art === 'zahl'}>{c.name}</th>{/each}</tr></thead>
          <tbody>{#each vs.wert.zeilen as z}<tr>{#each vs.wert.spalten as c, i}<td class:zahl={typeof z[i] === 'number'}>{anzeigeWert(c, z[i] ?? null)}</td>{/each}</tr>{/each}</tbody></table></div>
    {:else if vs.laeuft}<p><Rechnet text={L('Die Vorschau wird gerechnet …', 'The preview is being calculated …')} /></p>
    {:else if vs.wert?.fehler.length}<p class="as-hilfe">{L('So kommt keine Vorschau zustande.', 'No preview can be made like this.')}</p>
    {:else}<button class="k" type="button" onclick={rechneVorschau}>{L('Vorschau berechnen', 'Calculate preview')}</button>{/if}
  {/snippet}
</AssistentRahmen>
