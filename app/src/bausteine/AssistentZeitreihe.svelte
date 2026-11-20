<script lang="ts">
  import { s, L, Lp, melde, aendereDaten } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName, gueltigerName } from '../lib/skalabau';
  import { zeitreiheHelfer, lueckenSatz, ersterWertSatz, mittelBeschriftung, helferSaetze, type HelferArt, type HelferOk } from '../lib/zeitreihenhelfer';
  import { isoVon } from '../lib/zeitreiheblatt';
  import { anzeigeWert, spaltenOption } from '../lib/datenassistentsaetze';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import Icon from './Icon.svelte';

  /**
   * „Verschieben und glätten“ (Später S-F2, C.1; Fachblatt SPAETER-F2-ERGAENZUNGEN und „Entscheidungen Opus (19.10.)“ 7): aus einer Zahlenspalte neue Spalten bilden - Wert der vorigen oder nächsten Messung,
   * Veränderung (auch in Prozent), gleitender Mittelwert - je Person im Langformat, Reihenfolge nach der Zeitspalte. Statable rechnet es selbst (JavaScript); die Zeilen der Datei bleiben, wie sie sind.
   * Lücken in der Zeit: Voreinstellung „nach Reihenfolge der Messungen“ (wie SPSS CREATE) mit gut sichtbarem Hinweis über der Vorschau; Wahl „nur bei Abstand k“.
   */
  const namen = $derived(s.spalten.map(x => x.name));
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  const zeitSp = $derived(s.spalten.filter(c => c.art === 'zahl' || c.art === 'datum'));
  let x = $state(''), person = $state(''), zeit = $state('');
  let art = $state<HelferArt>('vorwert');
  let k = $state(1), spanne = $state(3), schritt = $state(1);
  let abstand = $state<'reihenfolge' | 'zeit'>('reihenfolge');
  let mitAktuell = $state(true);
  let zielEigen = $state<string | null>(null);

  const ARTEN: { id: HelferArt; name: () => string; ziel: () => string }[] = [
    { id: 'vorwert', name: () => L('Wert der vorigen Messung (Vorwert, Verzögerung k)', 'Value of the previous measurement (lag k)'), ziel: () => (k > 1 ? L(`davor${k}`, `before${k}`) : L('davor', 'before')) },
    { id: 'folgewert', name: () => L('Wert der nächsten Messung (Folgewert, k)', 'Value of the next measurement (lead k)'), ziel: () => (k > 1 ? L(`danach${k}`, `after${k}`) : L('danach', 'after')) },
    { id: 'veraenderung', name: () => L('Veränderung zur vorigen Messung (Wert minus Wert davor)', 'Change from the previous measurement (value minus value before)'), ziel: () => L('Veränderung_zur_vorigen_Messung', 'Change_from_previous') },
    { id: 'prozent', name: () => L('Veränderung zur vorigen Messung in Prozent', 'Change from the previous measurement in percent'), ziel: () => L('Veränderung_Prozent', 'Change_percent') },
    { id: 'mittel-zentriert', name: () => L('Gleitender Mittelwert, zentriert um die Messung', 'Moving average, centered on the measurement'), ziel: () => L(`gleitend${spanne}`, `moving${spanne}`) },
    { id: 'mittel-zurueck', name: () => L('Gleitender Mittelwert der zurückliegenden Messungen', 'Moving average of the preceding measurements'), ziel: () => L(`gleitend_zurueck${spanne}`, `moving_back${spanne}`) }
  ];
  const mitK = $derived(art === 'vorwert' || art === 'folgewert'), mitSpanne = $derived(art === 'mittel-zentriert' || art === 'mittel-zurueck');
  const abstandWahl = $derived(art === 'vorwert' || art === 'folgewert' || art === 'veraenderung' || art === 'prozent');
  const zielVorschlag = $derived(art === 'veraenderung' || art === 'prozent' ? freierName(ARTEN.find(a => a.id === art)!.ziel(), namen) : freierName(`${x || 'x'}_${ARTEN.find(a => a.id === art)!.ziel()}`.slice(0, 60), namen));
  const ziel = $derived(zielEigen ?? zielVorschlag);

  /** Die drei Spalten als Zahlen und Text für die Rechnung; Lücken und „keine Angabe“-Werte sind null, ein Datum wird zur Tageszahl. */
  const eingabe = $derived.by(() => {
    const ix = s.spalten.findIndex(c => c.name === x), ip = s.spalten.findIndex(c => c.name === person), iz = s.spalten.findIndex(c => c.name === zeit);
    if (ix < 0 || iz < 0) return null;
    const sx = s.spalten[ix]!, sz = s.spalten[iz]!, sp = ip >= 0 ? s.spalten[ip]! : null;
    const xs = s.zeilen.map(z => { const v = z[ix]; return typeof v === 'number' && Number.isFinite(v) && !istFehlend(sx, v) ? v : null; });
    const ts = s.zeilen.map(z => {
      const v = z[iz];
      if (sz.art === 'datum') { const iso = typeof v === 'string' ? isoVon(v) : null; const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null; return m ? Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000) : null; }
      return typeof v === 'number' && Number.isFinite(v) && !istFehlend(sz, v) ? v : null;
    });
    const ids = sp ? s.zeilen.map((z): string | number | null => { const v = z[ip]; return v === null || v === undefined || v === '' || (typeof v === 'number' && istFehlend(sp, v)) ? null : v; }) : null;
    return { xs, ts, ids, datum: sz.art === 'datum' };
  });
  const lauf = $derived.by((): { ok: true; r: HelferOk } | { ok: false; satz: string } => {
    if (!x) return { ok: false, satz: L('Welche Spalte verschoben oder geglättet werden soll, ist noch nicht gewählt.', 'The column to shift or smooth has not been chosen yet.') };
    if (!zeit || !eingabe) return { ok: false, satz: L('Die Zeitspalte ist noch nicht gewählt. Sie bestimmt die Reihenfolge der Messungen.', 'The time column has not been chosen yet. It sets the order of the measurements.') };
    if (x === zeit || x === person || (person && person === zeit)) return { ok: false, satz: L('Zahlenspalte, Personenspalte und Zeitspalte müssen verschiedene Spalten sein.', 'The number column, the person column and the time column must be different columns.') };
    const r = zeitreiheHelfer({ id: eingabe.ids, zeit: eingabe.ts, x: eingabe.xs, art, k, spanne, abstand: abstandWahl ? abstand : 'reihenfolge', schritt: schritt, mitAktuell });
    if (r.ok) return { ok: true, r };
    const n = r.zeilen?.length ?? 0;
    switch (r.code) {
      case 'doppelt': return { ok: false, satz: Lp(n, `${n} Zeile hat dieselbe Person und denselben Zeitpunkt wie eine andere. Dann ist die Reihenfolge nicht eindeutig; Statable rechnet nicht weiter (SPSS tut es still). Bitte die Zeilen prüfen, zum Beispiel mit dem Assistenten „Doppelte Fälle“.`, `${n} Zeilen haben dieselbe Person und denselben Zeitpunkt wie eine andere. Dann ist die Reihenfolge nicht eindeutig; Statable rechnet nicht weiter (SPSS tut es still). Bitte die Zeilen prüfen, zum Beispiel mit dem Assistenten „Doppelte Fälle“.`, `${n} row has the same person and the same time as another. The order is then not unique; Statable stops (SPSS carries on silently). Please check the rows, for example with the assistant "Duplicate cases".`, `${n} rows have the same person and the same time as another. The order is then not unique; Statable stops (SPSS carries on silently). Please check the rows, for example with the assistant "Duplicate cases".`) };
      case 'k': return { ok: false, satz: L('Die Verzögerung k muss eine ganze Zahl ab 1 sein.', 'The lag k must be a whole number from 1.') };
      case 'spanne': return { ok: false, satz: L('Die Spanne muss eine ganze Zahl ab 2 sein.', 'The span must be a whole number from 2.') };
      case 'schritt': return { ok: false, satz: L('Die Zeiteinheit muss eine Zahl über 0 sein.', 'The time unit must be a number above 0.') };
      default: return { ok: false, satz: L('Das lässt sich so nicht rechnen.', 'This cannot be calculated that way.') };
    }
  });
  const ergebnis = $derived(lauf.ok ? lauf.r : null);
  const nameProblem = $derived(!ziel.trim() ? L('Die neue Spalte braucht einen Namen.', 'The new column needs a name.') : !gueltigerName(ziel) ? L('Der Name der neuen Spalte ist nicht erlaubt: Er beginnt mit einem Buchstaben und hat keine Leerzeichen.', 'The name of the new column is not allowed: it starts with a letter and has no spaces.') : namen.some(n => n.toUpperCase() === ziel.toUpperCase()) ? L('Eine Spalte mit diesem Namen gibt es schon. Bitte einen neuen Namen wählen.', 'A column with this name already exists. Please choose a new name.') : '');
  const problem = $derived(!lauf.ok ? lauf.satz : nameProblem);

  const hinweise = $derived.by((): string[] => {
    if (!ergebnis) return [];
    const aus: string[] = [];
    if (art === 'vorwert' || art === 'folgewert') aus.push(ersterWertSatz(ergebnis.erstesFehlt, art));
    if (ergebnis.hinweise.includes('prozent-null')) aus.push(L('Wo der Wert davor 0 ist, lässt sich keine Veränderung in Prozent berechnen; dort bleibt die Zelle leer.', 'Where the value before is 0, a change in percent cannot be calculated; the cell stays empty.'));
    if (ergebnis.hinweise.includes('zeitluecken') === false && abstand === 'zeit' && abstandWahl) aus.push(L('Mit „nur bei Abstand k“ bleibt die Zelle leer, wenn die Messung im richtigen Abstand fehlt.', 'With "only at distance k" the cell stays empty when the measurement at the right distance is missing.'));
    if (art === 'mittel-zentriert' && spanne % 2 === 0) aus.push(L('Bei gerader Spanne zählen die beiden äußeren Werte halb (Mittel zweier nicht zentrierter Mittel), wie in der Karte Zeitreihen und in R.', 'With an even span the two outer values count half (mean of two non-centered means), as in the Time series card and in R.'));
    if (eingabe?.datum && abstand === 'zeit' && abstandWahl) aus.push(L('Ein Datum zählt hier in Tagen. Bei Monats- oder Jahresdaten ist „nach Reihenfolge der Messungen“ die bessere Wahl.', 'A date counts in days here. For monthly or yearly data "by order of the measurements" is the better choice.'));
    if (s.gewicht) aus.push(L('Das Fallgewicht geht in die neue Spalte nicht ein.', 'The case weight is not used in the new column.'));
    return aus;
  });
  /** Gut sichtbar über dem Ergebnis (Opus 7): bei wie vielen Personen Zeitpunkte zwischen den Messungen fehlen. */
  const lueckenText = $derived(ergebnis && ergebnis.hinweise.includes('zeitluecken') ? lueckenSatz(ergebnis.personenMitLuecke) : '');

  const zeigeSp = $derived([person, zeit, x].filter(Boolean).map(n => s.spalten.find(c => c.name === n)!).filter(Boolean));
  const vorschauZeilen = $derived.by(() => {
    if (!ergebnis) return [] as number[];
    // die ersten Zeilen; Personen mit Lücke zuerst, damit man den Fall sieht
    return s.zeilen.map((_, i) => i).slice(0, 12);
  });
  const fmt = (v: number | null) => (v === null ? '' : Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6).replace('.', ','));

  const lad = new Laedt();
  async function anwenden() {
    if (!ergebnis || nameProblem) return;
    await lad.mit(async () => {
      try {
        const nSp: Spalte = { name: ziel, bezeichnung: ARTEN.find(a => a.id === art)!.name(), art: 'zahl', niveau: 'metrisch', format: ergebnis.werte.every(v => v === null || Number.isInteger(v)) ? 'F8.0' : 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} };
        const spalten = [...($state.snapshot(s.spalten) as Spalte[]), nSp], zeilen = s.zeilen.map((z, i): Wert[] => [...z, ergebnis.werte[i] ?? null]);
        const text = L(`${ziel} berechnet (${ARTEN.find(a => a.id === art)!.name()})`, `${ziel} calculated (${ARTEN.find(a => a.id === art)!.name()})`);
        const ok = await aendereDaten(text, spalten, zeilen, true, { art: 'zeitreihe' });
        if (ok) melde(`${helferSaetze(ergebnis, art, { spalte: ziel }).join(' ')}`, true);
      } catch (f) { melde(L('Das ließ sich nicht rechnen. Es ist alles wie vorher.', 'This could not be calculated. Everything is as it was before.')); console.error(f); }
    });
  }
</script>

<AssistentRahmen id="zeitreihe" titel={L('Verschieben und glätten', 'Shift and smooth')} befehlName={L('Verschieben und glätten', 'Shift and smooth')}
  einleitung={L('Aus einer Zahlenspalte neue Spalten bilden: den Wert der vorigen oder nächsten Messung, die Veränderung zur vorigen Messung und den gleitenden Mittelwert - je Person, in der Reihenfolge der Zeit. Das entspricht LAG, LEAD, DIFF, MA und PMA im SPSS-Befehl CREATE. Die Daten brauchen eine Zeile je Messung (Langformat).', 'Create new columns from a number column: the value of the previous or next measurement, the change from the previous measurement and the moving average - per person, in the order of time. This corresponds to LAG, LEAD, DIFF, MA and PMA in the SPSS command CREATE. The data need one row per measurement (long format).')}
  {hinweise} {problem} syntax=""
  anwendenText={L('Neue Spalte anlegen', 'Create new column')} anwenden={anwenden} kannAnwenden={!!ergebnis && !nameProblem} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <div class="as-felder">
      <div class="as-feld"><label for="zr-x">{L('Welche Zahlenspalte?', 'Which number column?')}</label>
        <select id="zr-x" bind:value={x}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      <div class="as-feld"><label for="zr-person">{L('Personenspalte (freiwillig; ohne gilt alles als eine Reihe)', 'Person column (optional; without it everything is one series)')}</label>
        <select id="zr-person" bind:value={person}><option value="">{L('keine: eine einzige Reihe', 'none: a single series')}</option>{#each s.spalten as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      <div class="as-feld"><label for="zr-zeit">{L('Zeitspalte (bestimmt die Reihenfolge)', 'Time column (sets the order)')}</label>
        <select id="zr-zeit" bind:value={zeit}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zeitSp as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      <div class="as-feld"><label for="zr-art">{L('Was soll entstehen?', 'What should be created?')}</label>
        <select id="zr-art" bind:value={art}>{#each ARTEN as a}<option value={a.id}>{a.name()}</option>{/each}</select></div>
      {#if mitK}<div class="as-feld"><label for="zr-k">{L('Verzögerung k (wie viele Messungen weiter)', 'Lag k (how many measurements further)')}</label>
        <input id="zr-k" type="number" min="1" step="1" class="as-schmal" bind:value={k}></div>{/if}
      {#if mitSpanne}<div class="as-feld"><label for="zr-spanne">{L('Spanne (Zahl der Messungen im Fenster)', 'Span (number of measurements in the window)')}</label>
        <input id="zr-spanne" type="number" min="2" step="1" class="as-schmal" bind:value={spanne}></div>{/if}
      {#if art === 'mittel-zurueck'}<div class="as-feld"><label for="zr-aktuell">{L('Welche Werte gehen ein?', 'Which values are included?')}</label>
        <select id="zr-aktuell" bind:value={mitAktuell}><option value={true}>{mittelBeschriftung(true)}</option><option value={false}>{mittelBeschriftung(false)}</option></select></div>{/if}
      <div class="as-feld"><label for="zr-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="zr-name" type="text" autocomplete="off" value={ziel} oninput={(e) => (zielEigen = e.currentTarget.value)}></div>
    </div>
  {/snippet}
  {#snippet weitere()}
    {#if abstandWahl}
      <fieldset class="as-gruppe"><legend>{L('Fehlt eine Messung in der Zeit', 'When a measurement is missing in time')}</legend>
        <div class="segment"><label><input type="radio" name="zr-abstand" value="reihenfolge" bind:group={abstand}>{L('nach Reihenfolge der Messungen (wie SPSS)', 'by order of the measurements (as in SPSS)')}</label>
          <label><input type="radio" name="zr-abstand" value="zeit" bind:group={abstand}>{L('nur wenn der Abstand genau k Zeiteinheiten beträgt', 'only if the distance is exactly k time units')}</label></div>
        {#if abstand === 'zeit'}<div class="as-feld" style="margin-top:var(--a2)"><label for="zr-schritt">{L('Eine Zeiteinheit ist so groß wie', 'One time unit is as large as')}</label>
          <input id="zr-schritt" type="number" min="0" step="any" class="as-schmal" bind:value={schritt}>
          <span class="hilfe">{eingabe?.datum ? L('Bei einem Datum in Tagen.', 'For a date, in days.') : L('In den Einheiten der Zeitspalte (zum Beispiel 1 bei Wochen 1, 2, 3).', 'In the units of the time column (for example 1 for weeks 1, 2, 3).')}</span></div>{/if}
      </fieldset>
    {:else}<p class="as-hilfe">{L('Für diese Art gelten immer die Messungen der Reihe nach; eine Wahl zu Lücken in der Zeit gibt es nicht.', 'For this type the measurements always count in order; there is no choice for gaps in time.')}</p>{/if}
  {/snippet}
  {#snippet vorschau()}
    {#if lueckenText}<p class="zr-luecke" role="status"><Icon n="hinweis" k="hw" /><span><b>{lueckenText}</b> {L('Wer das nicht will, wählt unter „Weitere Wege“: nur wenn der Abstand genau k Zeiteinheiten beträgt.', 'If you do not want this, choose under "More options": only if the distance is exactly k time units.')}</span></p>{/if}
    {#if ergebnis && eingabe}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau, die ersten 12 Zeilen', 'Preview, the first 12 rows')}>
        <table class="as-tab"><thead><tr>{#each zeigeSp as c}<th scope="col">{c.name}</th>{/each}<th scope="col">{ziel}</th></tr></thead>
          <tbody>{#each vorschauZeilen as i}<tr>{#each zeigeSp as c}<td class:zahl={typeof s.zeilen[i]![s.spalten.indexOf(c)] === 'number'}>{anzeigeWert(c, s.zeilen[i]![s.spalten.indexOf(c)] ?? null)}</td>{/each}<td class="zahl">{fmt(ergebnis.werte[i] ?? null)}</td></tr>{/each}</tbody></table>
      </div>
      <p class="as-hilfe">{Lp(ergebnis.personen, `${ergebnis.personen} Person`, `${ergebnis.personen} Personen`, `${ergebnis.personen} person`, `${ergebnis.personen} people`)}, {Lp(ergebnis.werte.filter(v => v === null).length, `${ergebnis.werte.filter(v => v === null).length} leere Zeile`, `${ergebnis.werte.filter(v => v === null).length} leere Zeilen`, `${ergebnis.werte.filter(v => v === null).length} empty row`, `${ergebnis.werte.filter(v => v === null).length} empty rows`)}. <HilfeLink id="verschieben-glaetten" text={L('Hilfe: Verschieben und glätten', 'Help: shift and smooth')} /></p>
    {:else}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald Zahlenspalte und Zeitspalte gewählt sind.', 'The preview appears as soon as the number column and the time column are chosen.')}</p>{/if}
  {/snippet}
</AssistentRahmen>

<style>
  .zr-luecke { display: flex; gap: var(--a2); align-items: flex-start; padding: var(--a2) var(--a3); border: 1px solid var(--akzent); border-radius: var(--r); background: var(--blatt-2); max-width: var(--breite-text); margin: 0; }
  .zr-luecke :global(.ico) { flex: none; margin-top: 3px; }
</style>
