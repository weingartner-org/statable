<script lang="ts">
  import { s, L, Lp, melde } from '../lib/sitzung.svelte';
  import { spaltenOption } from '../lib/datenassistentsaetze';
  import { abgleichen, abgleichCodeSatz, abgleichWarnungen, abgleichNameGruppe, abgleichNameRolle, K_MIN, K_MAX, type AbgleichErgebnis } from '../lib/abgleich';
  import { abgleichEingabe, abgleichAnwenden, type AbgleichWahl } from '../lib/abgleichlauf.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * „Fälle und Kontrollen abgleichen“ (Abschnitt 6): zu jedem Fall (1) bis zu k Kontrollen (0) mit denselben Ankern und ähnlichen Zahlen suchen. Statable rechnet es selbst (JavaScript, lib/abgleich.ts);
   * das Ergebnis sind zwei neue Spalten, die Zeilen der Datei bleiben, wie sie sind. Gerechnet wird erst auf Knopfdruck, damit große Dateien beim Eintippen nicht stocken.
   */
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let fall = $state('');
  let anker = $state<string[]>([]);
  let zeilenWahl = $state<{ spalte: string; tol: string }[]>([{ spalte: '', tol: '' }]);
  let k = $state(1);

  const komma = (t: string): number => (t.trim() === '' ? NaN : Number(t.trim().replace(',', '.')));
  /** Die Wahl als einfache Daten (keine Proxys), oder `null`, solange etwas fehlt. */
  const wahl = $derived.by((): AbgleichWahl | null => {
    if (!fall) return null;
    const z = zeilenWahl.filter(r => r.spalte);
    if (!z.length || z.some(r => !(komma(r.tol) >= 0))) return null;
    return { fall, anker: [...anker], zahlen: z.map(r => ({ spalte: r.spalte, toleranz: komma(r.tol) })), k };
  });
  const sig = $derived(JSON.stringify(wahl));
  let roh = $state.raw<{ sig: string; r: AbgleichErgebnis } | null>(null);
  const ergebnis = $derived(roh && roh.sig === sig ? roh.r : null);
  const ok = $derived(ergebnis && ergebnis.ok ? ergebnis : null);

  /** Was die Wahl noch braucht (ein Satz) oder leer. */
  const wahlProblem = $derived.by((): string => {
    if (!fall) return L('Die Spalte, die Fälle (1) und Kontrollen (0) unterscheidet, ist noch nicht gewählt.', 'The column that tells cases (1) from controls (0) has not been chosen yet.');
    const z = zeilenWahl.filter(r => r.spalte);
    if (!z.length) return L('Es fehlt mindestens eine Zahlenspalte, nach der abgeglichen wird.', 'At least one number column to match on is missing.');
    if (z.some(r => !(komma(r.tol) >= 0))) return L('Die Toleranz fehlt oder ist keine Zahl von 0 an. Bei 0 zählt nur ein gleicher Wert.', 'The tolerance is missing or not a number from 0 upwards. With 0 only an equal value counts.');
    const alle = [fall, ...anker, ...z.map(r => r.spalte)];
    if (new Set(alle).size < alle.length) return L('Jede Spalte darf nur an einer Stelle vorkommen: als Fall-Spalte, als Anker oder als Zahl.', 'Each column may be used in one place only: as the case column, as an exact match or as a number.');
    return '';
  });
  const problem = $derived(wahlProblem || (ergebnis && !ergebnis.ok ? abgleichCodeSatz(ergebnis.code).text : ''));
  const hinweise = $derived.by((): string[] => {
    const h = abgleichWarnungen(ok ?? undefined);
    if (s.gewicht) h.push(L('Das Fallgewicht geht in den Abgleich nicht ein.', 'The case weight is not used in the matching.'));
    return h;
  });

  function rechnen() {
    if (!wahl || wahlProblem) return;
    const e = abgleichEingabe(wahl, s.spalten, s.zeilen);
    roh = { sig, r: e ? abgleichen(e) : { ok: false, code: 'laenge' } };
  }
  const lad = new Laedt();
  async function anwenden() {
    if (!wahl || !ok) return;
    await lad.mit(async () => {
      try {
        const n = await abgleichAnwenden(wahl, ok);
        if (n) melde(L(`Die Spalten ${n.gruppe} und ${n.rolle} sind angelegt.`, `The columns ${n.gruppe} and ${n.rolle} have been created.`), true);
      } catch (f) { melde(L('Das ließ sich nicht rechnen. Es ist alles wie vorher.', 'This could not be calculated. Everything is as it was before.')); console.error(f); }
    });
  }
  const fmt = (v: number | null) => (v === null ? '-' : (Math.round(v * 1000) / 1000).toString().replace('.', ','));
  const kWerte = Array.from({ length: K_MAX - K_MIN + 1 }, (_, i) => K_MIN + i);
  function ankerUm(name: string) { anker = anker.includes(name) ? anker.filter(n => n !== name) : [...anker, name]; }
</script>

<AssistentRahmen id="abgleich" titel={L('Fälle und Kontrollen abgleichen', 'Match cases and controls')} befehlName={L('Fälle und Kontrollen abgleichen', 'Match cases and controls')}
  einleitung={L('Zu jedem Fall (1) werden bis zu k Kontrollen (0) gesucht, die in den gewählten Merkmalen gleich oder ähnlich sind. Das Ergebnis sind zwei neue Spalten: die Nummer des Fall-Paars und die Rolle jeder Zeile. Die Zeilen der Datei bleiben, wie sie sind.', 'For each case (1), up to k controls (0) are searched that are equal or similar in the chosen characteristics. The result is two new columns: the number of the case group and the role of each row. The rows of the file stay as they are.')}
  {hinweise} {problem} syntax=""
  anwendenText={L('Neue Spalten anlegen', 'Create new columns')} anwenden={anwenden} kannAnwenden={!!ok && !wahlProblem} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <div class="as-felder">
      <div class="as-feld"><label for="ab-fall">{L('Spalte mit Fall (1) und Kontrolle (0)', 'Column with case (1) and control (0)')}</label>
        <select id="ab-fall" bind:value={fall}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      <fieldset class="as-feld"><legend>{L('Muss genau gleich sein (Text oder Zahl)', 'Must be exactly equal (text or number)')}</legend>
        <div class="segment" role="group">{#each s.spalten.filter(c => c.name !== fall && !zeilenWahl.some(r => r.spalte === c.name)) as c (c.name)}<label><input type="checkbox" checked={anker.includes(c.name)} onchange={() => ankerUm(c.name)}>{spaltenOption(c)}</label>{/each}</div></fieldset>
      {#each zeilenWahl as r, i}
        <div class="as-feld"><label for="ab-z{i}">{L(`Zahl ${i + 1}`, `Number ${i + 1}`)}</label>
          <select id="ab-z{i}" bind:value={r.spalte}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlen.filter(c => c.name !== fall) as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        <div class="as-feld"><label for="ab-t{i}">{L(`Toleranz für Zahl ${i + 1}`, `Tolerance for number ${i + 1}`)}</label>
          <input id="ab-t{i}" type="text" inputmode="decimal" autocomplete="off" bind:value={r.tol} aria-describedby="ab-th">
          {#if zeilenWahl.length > 1}<button class="k leise" type="button" onclick={() => (zeilenWahl = zeilenWahl.filter((_, q) => q !== i))}>{L('Zahl entfernen', 'Remove number')}</button>{/if}</div>
      {/each}
      <p id="ab-th" class="as-hilfe">{L('Die Toleranz ist der größte erlaubte Abstand. Bei 0 zählt nur ein gleicher Wert.', 'The tolerance is the largest allowed distance. With 0 only an equal value counts.')}</p>
      <div class="knopfzeile"><button class="k" type="button" onclick={() => (zeilenWahl = [...zeilenWahl, { spalte: '', tol: '' }])}>{L('Weitere Zahl', 'Add a number')}</button></div>
      <div class="as-feld"><label for="ab-k">{L('Kontrollen je Fall', 'Controls per case')}</label>
        <select id="ab-k" bind:value={k}>{#each kWerte as w}<option value={w}>{w}</option>{/each}</select></div>
      <div class="knopfzeile"><button class="k haupt" type="button" onclick={rechnen} disabled={!wahl || !!wahlProblem}>{L('Abgleich berechnen', 'Calculate the matching')}</button></div>
    </div>
  {/snippet}
  {#snippet vorschau()}
    {#if ok}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Ergebnis des Abgleichs', 'Result of the matching')}>
        <table class="as-tab"><thead><tr><th scope="col">{L('Kennzahl', 'Measure')}</th><th scope="col">{L('Anzahl', 'Number')}</th></tr></thead>
          <tbody>
            <tr><td>{L('Fälle gesamt', 'Cases in total')}</td><td class="zahl">{ok.faelle}</td></tr>
            <tr><td>{L('voll abgeglichen', 'fully matched')}</td><td class="zahl">{ok.voll}</td></tr>
            <tr><td>{L('teilweise abgeglichen', 'partly matched')}</td><td class="zahl">{ok.teilweise}</td></tr>
            <tr><td>{L('ohne Kontrolle', 'without a control')}</td><td class="zahl">{ok.ohne}</td></tr>
            <tr><td>{L('Kontrollen gefunden', 'controls found')}</td><td class="zahl">{ok.kontrollen}</td></tr>
            <tr><td>{L('Zeilen, die nicht teilnehmen', 'rows that do not take part')}</td><td class="zahl">{ok.ausgeschlossen}</td></tr>
          </tbody></table>
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Standardisierte Mittelwertdifferenz', 'Standardized mean difference')} style="margin-top:var(--a3)">
        <table class="as-tab"><thead><tr><th scope="col">{L('Zahl', 'Number')}</th><th scope="col">{L('Differenz davor', 'Difference before')}</th><th scope="col">{L('Differenz danach', 'Difference after')}</th></tr></thead>
          <tbody>{#each ok.smd as m, i}<tr><td>{wahl?.zahlen[i]?.spalte ?? ''}</td><td class="zahl">{fmt(m.vorher)}</td><td class="zahl">{fmt(m.nachher)}</td></tr>{/each}</tbody></table>
      </div>
      <p class="as-hilfe">{L('Die standardisierte Mittelwertdifferenz ist der Unterschied der Mittelwerte von Fällen und Kontrollen, geteilt durch die gemeinsame Streuung. Davor sind alle Fälle und Kontrollen gemeint, danach nur die abgeglichenen.', 'The standardized mean difference is the difference between the means of cases and controls divided by the common spread. Before means all cases and controls, after means only the matched ones.')}</p>
      <p class="as-hilfe">{Lp(ok.faelle - ok.ohne, `${ok.faelle - ok.ohne} Fall-Paar bekommt die Nummer in der Spalte ${abgleichNameGruppe()}; die Rolle steht in der Spalte ${abgleichNameRolle()}.`, `${ok.faelle - ok.ohne} Fall-Paare bekommen die Nummer in der Spalte ${abgleichNameGruppe()}; die Rolle steht in der Spalte ${abgleichNameRolle()}.`, `${ok.faelle - ok.ohne} case group gets its number in the column ${abgleichNameGruppe()}; the role is in the column ${abgleichNameRolle()}.`, `${ok.faelle - ok.ohne} case groups get their number in the column ${abgleichNameGruppe()}; the role is in the column ${abgleichNameRolle()}.`)}</p>
    {:else}<p class="as-hilfe">{L('Das Ergebnis erscheint, sobald alles gewählt ist und der Abgleich berechnet wurde.', 'The result appears as soon as everything is chosen and the matching has been calculated.')}</p>{/if}
    <p class="as-hilfe"><HilfeLink id="fallkontrolle-abgleich" text={L('Hilfe: Fälle und Kontrollen abgleichen', 'Help: matching cases and controls')} /></p>
  {/snippet}
</AssistentRahmen>
