<script lang="ts">
  import { s, L, Lp, d, melde, aendereDaten } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName, gueltigerName } from '../lib/skalabau';
  import { isoVon } from '../lib/zeitreiheblatt';
  import { rasterErkennen } from '../lib/zeitreihe';
  import { anzeigeWert, spaltenOption } from '../lib/datenassistentsaetze';
  import { basisWechseln, jahrVonIso, vorjahr, verketten, preisIndex, indexCodeSatz, zeitSperreSatz, laspeyresPaascheSatz, verkettenWarnung, vorjahrHinweis, VORJAHR_L, type VorjahrRaster, type Gut, type IndexCode, type ZeitSperre } from '../lib/indexzahlen';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * „Indexzahlen“ (Abschnitt 3, Teil 1): aus Zahlenspalten eine neue Spalte bilden - Basisperiode wechseln, Veränderung zum Vorjahr, zwei Reihen verketten, Laspeyres- und Paasche-Index (auch als Mengenindex).
   * Statable rechnet es selbst (JavaScript, lib/indexzahlen.ts); die Zeilen der Datei bleiben, wie sie sind. Lücken werden nie aufgefüllt und nie geschätzt: Wo ein nötiger Wert fehlt, ist die Zelle leer oder die Rechnung gesperrt.
   */
  type Art = 'basis' | 'vorjahr' | 'verketten' | 'laspeyres' | 'paasche' | 'menge';
  const namen = $derived(s.spalten.map(c => c.name));
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let art = $state<Art>('basis');
  let x = $state(''), zeit = $state(''), a = $state(''), b = $state('');
  let basisArt = $state<'zeitpunkt' | 'jahr'>('jahr'), basisWert = $state('');
  let rasterWahl = $state<VorjahrRaster | ''>('');
  let uWahl = $state<number | null>(null), richtung = $state<'neu' | 'alt'>('neu');
  let paare = $state<{ p: string; q: string }[]>([{ p: '', q: '' }, { p: '', q: '' }]);
  let basisZeile = $state(0);
  let zielEigen = $state<string | null>(null);

  const ARTEN: { id: Art; name: () => string; ziel: () => string }[] = [
    { id: 'basis', name: () => L('Basisperiode wechseln (neue Basis = 100)', 'Change the base period (new base = 100)'), ziel: () => L('Index_neue_Basis', 'Index_new_base') },
    { id: 'vorjahr', name: () => L('Veränderung zum Vorjahr in Prozent', 'Change from the previous year in percent'), ziel: () => L('Veraenderung_Vorjahr_Prozent', 'Change_prev_year_percent') },
    { id: 'verketten', name: () => L('Zwei Reihen verketten (alte und neue Reihe)', 'Chain two series (old and new series)'), ziel: () => L('Verkettet', 'Chained') },
    { id: 'laspeyres', name: () => L('Preisindex nach Laspeyres (Mengen der Basisperiode)', 'Price index by Laspeyres (quantities of the base period)'), ziel: () => L('Laspeyres', 'Laspeyres') },
    { id: 'paasche', name: () => L('Preisindex nach Paasche (aktuelle Mengen)', 'Price index by Paasche (current quantities)'), ziel: () => L('Paasche', 'Paasche') },
    { id: 'menge', name: () => L('Mengenindex (Laspeyres)', 'Quantity index (Laspeyres)'), ziel: () => L('Mengenindex', 'Quantity_index') }
  ];
  const aktArt = $derived(ARTEN.find(t => t.id === art)!);
  const zielVorschlag = $derived(freierName(art === 'basis' || art === 'vorjahr' ? `${x || 'x'}_${aktArt.ziel()}`.slice(0, 60) : aktArt.ziel(), namen));
  const ziel = $derived(zielEigen ?? zielVorschlag);

  /** Die Zahlen einer Spalte; Lücken und „keine Angabe“-Werte sind null. */
  function zahlenVon(name: string): (number | null)[] | null {
    const i = s.spalten.findIndex(c => c.name === name); if (i < 0) return null;
    const c = s.spalten[i]!;
    return s.zeilen.map(z => { const v = z[i]; return typeof v === 'number' && Number.isFinite(v) && !istFehlend(c, v) ? v : null; });
  }
  /** Die Zeitspalte als Beschriftung je Zeile. */
  const zeitText = $derived.by((): string[] | null => {
    const i = s.spalten.findIndex(c => c.name === zeit); if (i < 0) return null;
    return s.zeilen.map(z => anzeigeWert(s.spalten[i], z[i] ?? null));
  });
  const zeile = (i: number) => zeitText ? zeitText[i]! : L(`Zeile ${i + 1}`, `Row ${i + 1}`);
  /** Die Zeitspalte als ISO-Datum je Zeile: Datum und Text im Datumsformat; ganze Zahlen von 1000 bis 3000 zählen als Jahr (1. Januar). */
  const zeitIso = $derived.by((): (string | null)[] | null => {
    const i = s.spalten.findIndex(c => c.name === zeit); if (i < 0) return null;
    return s.zeilen.map(z => { const v = z[i]; if (typeof v === 'string') return isoVon(v); return typeof v === 'number' && Number.isInteger(v) && v >= 1000 && v <= 3000 ? `${v}-01-01` : null; });
  });
  const jahre = $derived(zeitIso ? zeitIso.map(jahrVonIso) : null);

  const xs = $derived(x ? zahlenVon(x) : null);
  const optionen = $derived.by((): string[] => {
    if (art !== 'basis' || !zeitText) return [];
    if (basisArt === 'jahr') return [...new Set((jahre ?? []).filter((j): j is number => j !== null))].sort((p, q) => p - q).map(String);
    return [...new Set(zeitText)].slice(0, 2000);
  });
  $effect(() => { if (art === 'basis' && optionen.length && !optionen.includes(basisWert)) basisWert = optionen[0]!; });

  const erkannt = $derived.by((): VorjahrRaster | null => {
    const iso = zeitIso?.filter((t): t is string => !!t);
    if (!iso || iso.length < 2) return null;
    const r = rasterErkennen([...new Set(iso.map(t => t.slice(0, 10)))].sort()).raster;
    return r === 'zeilen' ? null : (r as VorjahrRaster);
  });
  const rasterEff = $derived<VorjahrRaster | null>((rasterWahl || erkannt || null));

  const gemeinsam = $derived.by((): number[] => {
    const va = a ? zahlenVon(a) : null, vb = b ? zahlenVon(b) : null;
    return va && vb ? va.flatMap((_, i) => (va[i] !== null && vb[i] !== null ? [i] : [])) : [];
  });
  $effect(() => { if (art === 'verketten' && gemeinsam.length && (uWahl === null || !gemeinsam.includes(uWahl))) uWahl = gemeinsam[gemeinsam.length - 1]!; });

  type Lauf = { ok: true; werte: (number | null)[]; hinweise: string[]; gesperrt: number; luecken: string } | { ok: false; satz: string; klein?: string };
  const lauf = $derived.by((): Lauf => {
    const nein = (code: IndexCode, k = {}): Lauf => { const t = indexCodeSatz(code, k); return { ok: false, satz: t.text, ...(t.klein ? { klein: t.klein } : {}) }; };
    if (art === 'basis') {
      if (!x || !xs) return { ok: false, satz: L('Die Spalte, die auf eine neue Basis gebracht werden soll, ist noch nicht gewählt.', 'The column to be put on a new base has not been chosen yet.') };
      if (!zeit || !zeitText) return { ok: false, satz: L('Die Zeitspalte ist noch nicht gewählt. Sie sagt, welche Zeilen die Basisperiode bilden.', 'The time column has not been chosen yet. It says which rows form the base period.') };
      if (x === zeit) return { ok: false, satz: L('Zahlenspalte und Zeitspalte müssen verschiedene Spalten sein.', 'The number column and the time column must be different columns.') };
      if (!basisWert) return { ok: false, satz: basisArt === 'jahr' ? d('In der Zeitspalte ist kein Jahr zu erkennen. Wähle „Ein Zeitpunkt“ oder eine andere Spalte.', 'In der Zeitspalte ist kein Jahr zu erkennen. Wählen Sie „Ein Zeitpunkt“ oder eine andere Spalte.', 'No year can be recognised in the time column. Choose "A single point in time" or another column.') : L('Die Basisperiode ist noch nicht gewählt.', 'The base period has not been chosen yet.') };
      const zeilen = basisArt === 'jahr' ? (jahre ?? []).flatMap((j, i) => (j === Number(basisWert) ? [i] : [])) : zeitText.flatMap((t, i) => (t === basisWert ? [i] : []));
      const r = basisWechseln(xs, zeilen);
      if (!r.ok) return nein(r.code, { fehlend: r.fehlend });
      const h: string[] = [];
      if (zeilen.length > 1) h.push(basisArt === 'jahr' ? Lp(zeilen.length, `Die Basis ist das Mittel von ${zeilen.length} Zeile.`, `Die Basis ist das Mittel von ${zeilen.length} Zeilen (${zeitText[zeilen[0]!]} bis ${zeitText[zeilen.at(-1)!]}).`, `The base is the mean of ${zeilen.length} row.`, `The base is the mean of ${zeilen.length} rows (${zeitText[zeilen[0]!]} to ${zeitText[zeilen.at(-1)!]}).`) : L(`Der Zeitpunkt kommt in ${zeilen.length} Zeilen vor. Die Basis ist der Mittelwert dieser Zeilen.`, `The point in time occurs in ${zeilen.length} rows. The base is the mean of these rows.`));
      const leer = r.werte.filter(v => v === null).length;
      return { ok: true, werte: r.werte, hinweise: h, gesperrt: 0, luecken: leer ? Lp(leer, `${leer} Zeile bleibt leer, weil dort kein Wert steht.`, `${leer} Zeilen bleiben leer, weil dort kein Wert steht.`, `${leer} row stays empty because there is no value.`, `${leer} rows stay empty because there is no value.`) : '' };
    }
    if (art === 'vorjahr') {
      if (!x || !xs) return { ok: false, satz: L('Die Zahlenspalte ist noch nicht gewählt.', 'The number column has not been chosen yet.') };
      if (!rasterEff) return { ok: false, satz: zeit ? L('Das Raster der Zeitpunkte (monatlich, vierteljährlich, jährlich, wöchentlich) ist nicht zu erkennen. Bitte unter „Weitere Wege“ wählen.', 'The spacing of the points in time (monthly, quarterly, yearly, weekly) cannot be recognised. Please choose it under "More options".') : L('Das Raster ist noch nicht gewählt: Sind die Zeilen Monate, Vierteljahre, Jahre oder Wochen? Bitte unter „Weitere Wege“ wählen.', 'The spacing has not been chosen yet: are the rows months, quarters, years or weeks? Please choose it under "More options".') };
      if (x === zeit) return { ok: false, satz: L('Zahlenspalte und Zeitspalte müssen verschiedene Spalten sein.', 'The number column and the time column must be different columns.') };
      if (zeit && zeitIso && !zeitIso.some(Boolean)) return { ok: false, satz: L('Die Zeitspalte enthält keine Daten, die Statable lesen kann.', 'The time column contains no dates Statable can read.') };
      const r = vorjahr(xs, rasterEff, zeit ? zeitIso : null);
      if (!r.ok) return nein(r.code, { zeilen: r.zeilen?.length });
      const h: string[] = [vorjahrHinweis()];
      if (!zeit) h.push(L('Ohne Zeitspalte zählt Statable die Zeilen der Reihe nach: Jede Zeile ist ein Zeitpunkt, und es fehlt keiner dazwischen.', 'Without a time column Statable counts the rows in order: each row is one point in time, and none is missing in between.'));
      if (r.ohneDatum) h.push(Lp(r.ohneDatum, `${r.ohneDatum} Zeile hat kein lesbares Datum und bleibt leer.`, `${r.ohneDatum} Zeilen haben kein lesbares Datum und bleiben leer.`, `${r.ohneDatum} row has no readable date and stays empty.`, `${r.ohneDatum} rows have no readable date and stay empty.`));
      const leer = r.werte.filter(v => v === null).length;
      return { ok: true, werte: r.werte, hinweise: h, gesperrt: 0, luecken: Lp(leer, `${leer} Zeile bleibt leer (kein Vorjahreswert, Lücke oder Vorwert 0).`, `${leer} Zeilen bleiben leer (kein Vorjahreswert, Lücke oder Vorwert 0).`, `${leer} row stays empty (no value from the previous year, gap or previous value 0).`, `${leer} rows stay empty (no value from the previous year, gap or previous value 0).`) };
    }
    if (art === 'verketten') {
      const va = a ? zahlenVon(a) : null, vb = b ? zahlenVon(b) : null;
      if (!va || !vb) return { ok: false, satz: L('Alte und neue Reihe sind noch nicht beide gewählt.', 'The old and the new series have not both been chosen yet.') };
      if (a === b) return { ok: false, satz: L('Alte und neue Reihe müssen verschiedene Spalten sein.', 'The old and the new series must be different columns.') };
      const r = verketten(va, vb, uWahl);
      if (!r.ok) return nein(r.code);
      const h: string[] = [verkettenWarnung()];
      if (r.gemeinsam.length > 1) h.push(L(`Die Reihen haben ${r.gemeinsam.length} gemeinsame Zeitpunkte. Gerechnet wird mit ${zeile(r.u)}; unter „Weitere Wege“ lässt sich ein anderer wählen.`, `The series have ${r.gemeinsam.length} common points in time. The calculation uses ${zeile(r.u)}; another one can be chosen under "More options".`));
      const werte = richtung === 'neu' ? r.aufNeu : r.aufAlt;
      const leer = werte.filter(v => v === null).length;
      return { ok: true, werte, hinweise: h, gesperrt: 0, luecken: leer ? Lp(leer, `${leer} Zeile bleibt leer, weil dort keine der beiden Reihen einen Wert hat.`, `${leer} Zeilen bleiben leer, weil dort keine der beiden Reihen einen Wert hat.`, `${leer} row stays empty because neither series has a value there.`, `${leer} rows stay empty because neither series has a value there.`) : '' };
    }
    // Preis- und Mengenindex
    const gueter: Gut[] = [];
    for (const p of paare) { const vp = p.p ? zahlenVon(p.p) : null, vq = p.q ? zahlenVon(p.q) : null; if (vp && vq) gueter.push({ p: vp, q: vq }); }
    const gewaehlt = paare.flatMap(p => [p.p, p.q]).filter(Boolean);
    if (new Set(gewaehlt).size < gewaehlt.length) return { ok: false, satz: L('Jede Preis- und Mengenspalte darf nur einmal vorkommen.', 'Each price and quantity column may be used only once.') };
    if (gueter.length < paare.length) return { ok: false, satz: L('Zu jedem Gut gehören eine Preis- und eine Mengenspalte. Bitte beide wählen.', 'Each good needs a price column and a quantity column. Please choose both.') };
    const r = preisIndex(gueter, basisZeile);
    if (!r.ok) return nein(r.code, { grund: r.grund });
    const werte = art === 'laspeyres' ? r.laspeyres : art === 'paasche' ? r.paasche : r.menge;
    const h: string[] = [];
    if (art !== 'menge') h.push(laspeyresPaascheSatz());
    const sp = r.gesperrt.filter(g => werte[g.zeile] === null);
    const gruende = [...new Set(sp.map(g => g.grund))] as ZeitSperre[];
    for (const g of gruende) h.push(zeitSperreSatz(sp.filter(t => t.grund === g).length, g));
    return { ok: true, werte, hinweise: h, gesperrt: sp.length, luecken: '' };
  });
  const ergebnis = $derived(lauf.ok ? lauf : null);
  const nameProblem = $derived(!ziel.trim() ? L('Die neue Spalte braucht einen Namen.', 'The new column needs a name.') : !gueltigerName(ziel) ? L('Der Name der neuen Spalte ist nicht erlaubt: Er beginnt mit einem Buchstaben und hat keine Leerzeichen.', 'The name of the new column is not allowed: it starts with a letter and has no spaces.') : namen.some(n => n.toUpperCase() === ziel.toUpperCase()) ? L('Eine Spalte mit diesem Namen gibt es schon. Bitte einen neuen Namen wählen.', 'A column with this name already exists. Please choose a new name.') : '');
  const problem = $derived(!lauf.ok ? lauf.satz : nameProblem);
  const hinweise = $derived.by((): string[] => {
    const h = [...(ergebnis?.hinweise ?? [])];
    if (ergebnis?.luecken) h.push(ergebnis.luecken);
    if (!lauf.ok && lauf.klein) h.push(lauf.klein);
    if (s.gewicht) h.push(L('Das Fallgewicht geht in die neue Spalte nicht ein.', 'The case weight is not used in the new column.'));
    return h;
  });

  const quellen = $derived((art === 'basis' || art === 'vorjahr' ? [x] : art === 'verketten' ? [a, b] : paare.flatMap(p => [p.p, p.q])).filter(Boolean));
  const zeigeSp = $derived([zeit, ...quellen].filter((n, i, l) => n && l.indexOf(n) === i).slice(0, 6).map(n => s.spalten.find(c => c.name === n)!).filter(Boolean));
  const fmt = (v: number | null) => (v === null ? '' : Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6).replace('.', ','));
  const lad = new Laedt();
  async function anwenden() {
    if (!ergebnis || nameProblem) return;
    await lad.mit(async () => {
      try {
        const nSp: Spalte = { name: ziel, bezeichnung: aktArt.name(), art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} };
        const spalten = [...($state.snapshot(s.spalten) as Spalte[]), nSp], zeilen = s.zeilen.map((z, i): Wert[] => [...z, ergebnis.werte[i] ?? null]);
        const ok = await aendereDaten(L(`${ziel} berechnet (${aktArt.name()})`, `${ziel} calculated (${aktArt.name()})`), spalten, zeilen, true, { art: 'index' });
        if (ok) melde(L(`Die Spalte ${ziel} ist angelegt (${aktArt.name()}).${ergebnis.gesperrt ? ` ${ergebnis.gesperrt} Zeitpunkte sind gesperrt und bleiben leer.` : ''}`, `The column ${ziel} has been created (${aktArt.name()}).${ergebnis.gesperrt ? ` ${ergebnis.gesperrt} points in time are blocked and stay empty.` : ''}`), true);
      } catch (f) { melde(L('Das ließ sich nicht rechnen. Es ist alles wie vorher.', 'This could not be calculated. Everything is as it was before.')); console.error(f); }
    });
  }
  function paarNeu() { paare = [...paare, { p: '', q: '' }]; }
  function paarWeg(i: number) { paare = paare.filter((_, k) => k !== i); }
  const RASTER: { id: VorjahrRaster; name: () => string }[] = [
    { id: 'monatlich', name: () => L('monatlich (Vorjahr = 12 Zeilen davor)', 'monthly (previous year = 12 rows before)') },
    { id: 'vierteljaehrlich', name: () => L('vierteljährlich (4 davor)', 'quarterly (4 before)') },
    { id: 'jaehrlich', name: () => L('jährlich (1 davor)', 'yearly (1 before)') },
    { id: 'woechentlich', name: () => L('wöchentlich (52 davor)', 'weekly (52 before)') },
    { id: 'taeglich', name: () => L('täglich (gesperrt)', 'daily (blocked)') },
    { id: 'ungleich', name: () => L('ungleich verteilt (gesperrt)', 'unevenly spaced (blocked)') }
  ];
</script>

<AssistentRahmen id="index" titel={L('Indexzahlen', 'Index numbers')} befehlName={L('Indexzahlen', 'Index numbers')}
  einleitung={L('Aus Zahlenspalten eine Indexspalte bilden: die Basisperiode wechseln, die Veränderung zum Vorjahr berechnen, zwei Reihen verketten oder einen Preis- oder Mengenindex nach Laspeyres und Paasche bilden. Statable rundet in der Rechnung nie und füllt keine Lücken auf: Wo ein nötiger Wert fehlt, bleibt die Zelle leer oder die Rechnung ist gesperrt.', 'Create an index column from number columns: change the base period, calculate the change from the previous year, chain two series or form a price or quantity index by Laspeyres and Paasche. Statable never rounds in the calculation and does not fill in gaps: where a required value is missing, the cell stays empty or the calculation is blocked.')}
  {hinweise} {problem} syntax=""
  anwendenText={L('Neue Spalte anlegen', 'Create new column')} anwenden={anwenden} kannAnwenden={!!ergebnis && !nameProblem} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <div class="as-felder">
      <div class="as-feld"><label for="ix-art">{L('Was soll entstehen?', 'What should be created?')}</label>
        <select id="ix-art" bind:value={art} onchange={() => (zielEigen = null)}>{#each ARTEN as t}<option value={t.id}>{t.name()}</option>{/each}</select></div>
      {#if art === 'basis' || art === 'vorjahr'}
        <div class="as-feld"><label for="ix-x">{L('Welche Zahlenspalte?', 'Which number column?')}</label>
          <select id="ix-x" bind:value={x}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        <div class="as-feld"><label for="ix-zeit">{art === 'basis' ? L('Zeitspalte (Datum, Jahr oder Beschriftung)', 'Time column (date, year or label)') : L('Zeitspalte (Datum oder Jahr; ohne gilt die Reihenfolge der Zeilen)', 'Time column (date or year; without it the order of the rows applies)')}</label>
          <select id="ix-zeit" bind:value={zeit}><option value="">{art === 'basis' ? L('Spalte wählen', 'Choose a column') : L('keine: Zeilen der Reihe nach', 'none: rows in order')}</option>{#each s.spalten as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      {/if}
      {#if art === 'basis'}
        <div class="as-feld"><span id="ix-basisart">{L('Die Basis ist', 'The base is')}</span>
          <div class="segment" role="radiogroup" aria-labelledby="ix-basisart"><label data-begriff="basisjahr"><input type="radio" name="ix-ba" value="jahr" bind:group={basisArt}>{L('ein ganzes Jahr (Mittel des Jahres)', 'a whole year (mean of the year)')}</label>
            <label data-begriff="basisjahr"><input type="radio" name="ix-ba" value="zeitpunkt" bind:group={basisArt}>{L('ein Zeitpunkt', 'a single point in time')}</label></div></div>
        <div class="as-feld"><label for="ix-bw">{basisArt === 'jahr' ? L('Welches Jahr?', 'Which year?') : L('Welcher Zeitpunkt?', 'Which point in time?')}</label>
          <select id="ix-bw" bind:value={basisWert} disabled={!optionen.length}>{#if !optionen.length}<option value="">{L('erst die Zeitspalte wählen', 'choose the time column first')}</option>{/if}{#each optionen as o}<option value={o}>{o}</option>{/each}</select></div>
      {:else if art === 'verketten'}
        <div class="as-feld"><label for="ix-a">{L('Alte Reihe', 'Old series')}</label>
          <select id="ix-a" bind:value={a}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        <div class="as-feld"><label for="ix-b">{L('Neue Reihe', 'New series')}</label>
          <select id="ix-b" bind:value={b}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        <div class="as-feld"><label for="ix-vz">{L('Zeitspalte (nur zur Beschriftung)', 'Time column (for labelling only)')}</label>
          <select id="ix-vz" bind:value={zeit}><option value="">{L('keine: Zeilennummer', 'none: row number')}</option>{#each s.spalten as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        <div class="as-feld"><span id="ix-rich">{L('Auf welche Basis?', 'To which base?')}</span>
          <div class="segment" role="radiogroup" aria-labelledby="ix-rich"><label><input type="radio" name="ix-r" value="neu" bind:group={richtung}>{L('auf die neue Basis (die alte Reihe wird umgerechnet)', 'to the new base (the old series is converted)')}</label>
            <label><input type="radio" name="ix-r" value="alt" bind:group={richtung}>{L('auf die alte Basis (die neue Reihe wird umgerechnet)', 'to the old base (the new series is converted)')}</label></div></div>
      {:else if art !== 'vorjahr'}
        {#each paare as p, i}
          <div class="as-feld"><label for="ix-p{i}">{L(`Gut ${i + 1}: Preis`, `Good ${i + 1}: price`)}</label>
            <select id="ix-p{i}" bind:value={p.p}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
          <div class="as-feld"><label for="ix-q{i}">{L(`Gut ${i + 1}: Menge`, `Good ${i + 1}: quantity`)}</label>
            <select id="ix-q{i}" bind:value={p.q}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select>
            {#if paare.length > 2}<button class="k leise" type="button" onclick={() => paarWeg(i)}>{L('Gut entfernen', 'Remove good')}</button>{/if}</div>
        {/each}
        <div class="knopfzeile"><button class="k" type="button" onclick={paarNeu}>{L('Weiteres Gut', 'Add a good')}</button></div>
        <div class="as-feld"><label for="ix-pz">{L('Zeitspalte (nur zur Beschriftung)', 'Time column (for labelling only)')}</label>
          <select id="ix-pz" bind:value={zeit}><option value="">{L('keine: Zeilennummer', 'none: row number')}</option>{#each s.spalten as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        <div class="as-feld"><label for="ix-bz">{L('Basisperiode', 'Base period')}</label>
          <select id="ix-bz" bind:value={basisZeile}>{#each s.zeilen.slice(0, 2000) as _, i}<option value={i}>{zeile(i)}</option>{/each}</select></div>
      {/if}
      <div class="as-feld"><label for="ix-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="ix-name" type="text" autocomplete="off" value={ziel} oninput={(e) => (zielEigen = e.currentTarget.value)}></div>
      <p class="as-hilfe"><HilfeLink id="indexzahlen" text={L('Hilfe: Indexzahlen', 'Help: index numbers')} /></p>
    </div>
  {/snippet}
  {#snippet weitere()}
    {#if art === 'vorjahr'}
      <div class="as-feld"><label for="ix-raster">{L('Raster der Zeitpunkte', 'Spacing of the points in time')}</label>
        <select id="ix-raster" bind:value={rasterWahl}><option value="">{erkannt ? L('wie erkannt', 'as recognised') : L('bitte wählen', 'please choose')}</option>{#each RASTER as t}<option value={t.id}>{t.name()}</option>{/each}</select>
        <span class="hilfe">{rasterEff && VORJAHR_L[rasterEff] ? Lp(VORJAHR_L[rasterEff], `Der Vorjahreswert liegt ${VORJAHR_L[rasterEff]} Platz davor.`, `Der Vorjahreswert liegt ${VORJAHR_L[rasterEff]} Plätze davor.`, `The value of the previous year is ${VORJAHR_L[rasterEff]} place before.`, `The value of the previous year is ${VORJAHR_L[rasterEff]} places before.`) : L('Bei täglichen oder ungleich verteilten Zeitpunkten rechnet Statable nicht.', 'Statable does not calculate for daily or unevenly spaced points in time.')}</span></div>
    {:else if art === 'verketten'}
      <div class="as-feld"><label for="ix-u">{L('Gemeinsamer Zeitpunkt', 'Common point in time')}</label>
        <select id="ix-u" bind:value={uWahl} disabled={!gemeinsam.length}>{#if !gemeinsam.length}<option value={null}>{L('keiner: beide Reihen brauchen eine gemeinsame Zeile', 'none: both series need a common row')}</option>{/if}{#each gemeinsam as g}<option value={g}>{zeile(g)}</option>{/each}</select>
        <span class="hilfe">{L('Vorgabe ist der letzte gemeinsame Zeitpunkt.', 'The default is the last common point in time.')}</span></div>
    {:else}<p class="as-hilfe">{L('Für diese Wahl gibt es keine weiteren Wege.', 'There are no further options for this choice.')}</p>{/if}
  {/snippet}
  {#snippet vorschau()}
    {#if ergebnis}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau, die ersten 12 Zeilen', 'Preview, the first 12 rows')}>
        <table class="as-tab"><thead><tr>{#each zeigeSp as c}<th scope="col">{c.name}</th>{/each}<th scope="col">{ziel}</th></tr></thead>
          <tbody>{#each s.zeilen.slice(0, 12) as _, i}<tr>{#each zeigeSp as c}<td class:zahl={typeof s.zeilen[i]![s.spalten.indexOf(c)] === 'number'}>{anzeigeWert(c, s.zeilen[i]![s.spalten.indexOf(c)] ?? null)}</td>{/each}<td class="zahl">{fmt(ergebnis.werte[i] ?? null)}</td></tr>{/each}</tbody></table>
      </div>
    {:else}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald alle nötigen Spalten gewählt sind.', 'The preview appears as soon as all required columns are chosen.')}</p>{/if}
  {/snippet}
</AssistentRahmen>
