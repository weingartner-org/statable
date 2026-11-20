<script lang="ts">
  import { untrack, onDestroy } from 'svelte';
  import { s, L, Lp } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName } from '../lib/skalabau';
  import { zaehlenBefehl, anzahlBefehl, zaehlenWerte, type ZaehlWert } from '../lib/datenassistentc';
  import { fehlerSatz, spaltenOption } from '../lib/datenassistentsaetze';
  import { wendeAn } from '../lib/datenassistentlauf';
  import { probeSpalten, type Probe } from '../lib/datenassistentprobe';
  import { AUTO_ZELLEN, Vorschau } from '../lib/assistentvorschau.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import ProbeTabelle from './ProbeTabelle.svelte';

  /** „Zählen“ (Später S-C, Fachblatt 4.1): wie viele der gewählten Fragen einen Wert treffen - nur gültige Antworten, nie fehlend; dazu „Anzahl gültig“ und „Anzahl fehlend“. */
  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  const namen = $derived(s.spalten.map(x => x.name));
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let modus = $state<'treffer' | 'gueltig' | 'fehlend'>('treffer');
  let gewaehlt = $state<string[]>([]);
  const ordnung = $derived(namen.filter(n => gewaehlt.includes(n)));
  type Regel = { art: 'wert' | 'bereich' | 'fehlend' | 'systemfehlend'; a: string; b: string };
  let regeln = $state<Regel[]>([{ art: 'wert', a: '', b: '' }]);
  let zielEigen = $state<string | null>(null);
  const zielVorschlag = $derived(freierName(modus === 'treffer' ? L('anzahl', 'count') : modus === 'gueltig' ? L('anzahl_gueltig', 'n_valid') : L('anzahl_fehlend', 'n_missing'), namen));
  const ziel = $derived(zielEigen ?? zielVorschlag);

  const zahl = (t: string): number | null => { const x = t.trim().replace(',', '.'); return x !== '' && Number.isFinite(Number(x)) ? Number(x) : null; };
  const zaehle = $derived.by((): ZaehlWert[] | null => {
    const aus: ZaehlWert[] = [];
    for (const r of regeln) {
      if (r.art === 'wert') { const v = zahl(r.a); if (v === null) return null; aus.push({ wert: v }); }
      else if (r.art === 'bereich') {
        const von = r.a.trim() === '' ? 'LO' : zahl(r.a), bis = r.b.trim() === '' ? 'HI' : zahl(r.b);
        if (von === null || bis === null) return null; aus.push({ bereich: [von, bis] });
      } else aus.push({ fehlend: r.art === 'fehlend' ? 'MISSING' : 'SYSMIS' });
    }
    return aus.length ? aus : null;
  });
  /** Ein Mehrfachset als Auswahl: Spalten und Zählwert aus dem Set übernehmen. */
  function ausSet(name: string) {
    const set = s.sets.find(x => x.name === name); if (!set) return;
    gewaehlt = [...set.spalten]; modus = 'treffer';
    if (typeof set.zaehlwert === 'number') regeln = [{ art: 'wert', a: String(set.zaehlwert), b: '' }];
  }

  const ergebnis = $derived.by((): { syntax: string } | { problem: string } => {
    if (!gewaehlt.length) return { problem: L('Mindestens eine Spalte wählen, über die gezählt wird.', 'Choose at least one column to count over.') };
    try {
      if (modus === 'treffer') {
        if (!zaehle) return { problem: L('Die Werte, die gezählt werden sollen, sind noch nicht vollständig.', 'The values to be counted are not complete yet.') };
        return { syntax: zaehlenBefehl(daten, { spalten: ordnung, ziel, zaehle }).syntax };
      }
      return { syntax: anzahlBefehl(daten, { art: modus === 'gueltig' ? 'gueltig' : 'fehlend', spalten: ordnung, ziel }).syntax };
    } catch (f) { return { problem: fehlerSatz(f) }; }
  });
  const syntax = $derived('syntax' in ergebnis ? ergebnis.syntax : '');

  const vs = new Vorschau<Probe>();
  onDestroy(() => vs.verwerfe());
  const gross = $derived(s.zeilen.length * s.spalten.length > AUTO_ZELLEN);
  const probe = (sx: string, z: string, ein: string[]) => probeSpalten(sx, [...ein.slice(0, 4), z]);
  $effect(() => { const sx = syntax, z = ziel, ein = ordnung; if (!sx) return; untrack(() => vs.plane(() => probe(sx, z, ein), !gross)); });
  const rechneVorschau = () => { if (syntax) void vs.jetzt(() => probe(syntax, ziel, ordnung)); };

  const verteilung = $derived.by(() => {
    if (modus !== 'treffer' || !zaehle || !gewaehlt.length || !(s.zeilen.length * ordnung.length < AUTO_ZELLEN)) return '';
    try {
      const w = zaehlenWerte(daten, { spalten: ordnung, ziel, zaehle }), ohne = w.filter(x => x === 0).length;
      return Lp(ohne, `${ohne} Person hat keinen Treffer (0).`, `${ohne} Personen haben keinen Treffer (0).`, `${ohne} person has no hit (0).`, `${ohne} people have no hit (0).`);
    } catch { return ''; }
  });

  const lad = new Laedt();
  async function anwenden() {
    if (!syntax) return;
    await lad.mit(() => wendeAn(L(`${ziel} gezählt`, `${ziel} counted`), syntax));
  }
  function plus() { regeln = [...regeln, { art: 'wert', a: '', b: '' }]; }
  function weg(i: number) { regeln = regeln.filter((_, k) => k !== i); }
</script>

<AssistentRahmen id="zaehlen" titel={L('Zählen', 'Count')} befehlName={L('Zählen', 'Count')}
  einleitung={L('Wie viele der gewählten Fragen hat jede Person mit einem bestimmten Wert beantwortet - zum Beispiel mit 4 oder 5? Oder: wie viele Antworten sind gültig, wie viele fehlen?', 'How many of the chosen questions did each person answer with a certain value - for example 4 or 5? Or: how many answers are valid and how many are missing?')}
  {syntax} problem={'problem' in ergebnis ? ergebnis.problem : ''}
  hinweise={[L('Gezählt werden nur gültige Antworten. Eine Antwort, die als „keine Angabe“ markiert ist (zum Beispiel -9), zählt nie als Treffer, auch nicht in einem Bereich. (PSPP-COUNT zählt sie dort mit; Statable nicht.)', 'Only valid answers are counted. An answer marked as "no answer" (for example -9) is never a hit, not even in a range. (PSPP COUNT counts it there; Statable does not.)'),
    ...(verteilung ? [verteilung] : []), ...(vs.wert?.fehler.length ? [L(`PSPP meldet: ${vs.wert.fehler[0]}`, `PSPP reports: ${vs.wert.fehler[0]}`)] : [])]}
  anwendenText={L('Zählen', 'Count')} anwenden={anwenden} kannAnwenden={!!syntax && !vs.wert?.fehler.length} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <div class="as-feld"><span class="lbl" id="za-modus">{L('Was soll gezählt werden?', 'What should be counted?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="za-modus">
        <label><input type="radio" name="za-modus" value="treffer" bind:group={modus}>{L('Antworten mit bestimmten Werten', 'Answers with certain values')}</label>
        <label><input type="radio" name="za-modus" value="gueltig" bind:group={modus}>{L('Anzahl gültiger Antworten', 'Number of valid answers')}</label>
        <label data-begriff="fehlende-werte"><input type="radio" name="za-modus" value="fehlend" bind:group={modus}>{L('Anzahl fehlender Antworten', 'Number of missing answers')}</label></div></div>
    <fieldset class="as-gruppe"><legend>{L('Über welche Spalten?', 'Over which columns?')}</legend>
      {#if s.sets.length}<div class="as-feld"><label for="za-set">{L('Oder die Optionen eines Mehrfachantwort-Sets', 'Or the options of a multiple-response set')}</label>
        <select id="za-set" onchange={(e) => { ausSet(e.currentTarget.value); e.currentTarget.value = ''; }}><option value="">{L('Set wählen', 'Choose a set')}</option>{#each s.sets as x}<option value={x.name}>{x.label || x.name}</option>{/each}</select></div>{/if}
      <ul class="as-liste">{#each zahlen as c (c.name)}<li class:an={gewaehlt.includes(c.name)}><label><input type="checkbox" value={c.name} bind:group={gewaehlt}><span>{c.name}{#if c.bezeichnung}<small>{c.bezeichnung}</small>{/if}</span></label></li>{/each}</ul>
      <div class="knopfzeile"><button class="k leise" type="button" onclick={() => (gewaehlt = zahlen.map(c => c.name))}>{L('Alle Zahlenspalten', 'All number columns')}</button><button class="k leise" type="button" onclick={() => (gewaehlt = [])}>{L('Keine', 'None')}</button></div>
    </fieldset>
    {#if modus === 'treffer'}
      <fieldset class="as-gruppe"><legend>{L('Welche Werte zählen?', 'Which values count?')}</legend>
        <ul class="as-regeln bed">{#each regeln as r, i}
          <li><select aria-label={L(`Art der Regel ${i + 1}`, `Kind of rule ${i + 1}`)} bind:value={r.art}>
              <option value="wert">{L('Ein Wert', 'One value')}</option><option value="bereich">{L('Ein Bereich von … bis …', 'A range from … to …')}</option>
              <option data-begriff="fehlende-werte" value="fehlend">{L('Fehlende Antworten (leer und „keine Angabe“)', 'Missing answers (empty and "no answer")')}</option><option value="systemfehlend">{L('Nur leere Zellen', 'Only empty cells')}</option></select>
            {#if r.art === 'wert'}<input type="text" inputmode="decimal" autocomplete="off" aria-label={L('Wert', 'Value')} bind:value={r.a}><span></span>
            {:else if r.art === 'bereich'}<input type="text" inputmode="decimal" autocomplete="off" aria-label={L('von (leer = nach unten offen)', 'from (empty = open downwards)')} placeholder={L('von', 'from')} bind:value={r.a}><input type="text" inputmode="decimal" autocomplete="off" aria-label={L('bis (leer = nach oben offen)', 'to (empty = open upwards)')} placeholder={L('bis', 'to')} bind:value={r.b}>
            {:else}<span></span><span></span>{/if}
            {#if regeln.length > 1}<button class="k leise nur-symbol" type="button" aria-label={L(`Regel ${i + 1} entfernen`, `Remove rule ${i + 1}`)} onclick={() => weg(i)}>×</button>{:else}<span></span>{/if}</li>{/each}</ul>
        <div class="knopfzeile"><button class="k leise" type="button" onclick={plus}>{L('Weiterer Wert', 'Another value')}</button></div>
        <p class="as-hilfe">{L('Mit mehreren Werten zählt eine Spalte einmal, wenn sie einen davon trifft.', 'With several values a column counts once if it matches any of them.')}</p>
      </fieldset>
    {/if}
    <div class="as-feld"><label for="za-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="za-name" type="text" autocomplete="off" value={ziel} oninput={(e) => (zielEigen = e.currentTarget.value)}></div>
  {/snippet}
  {#snippet vorschau()}
    <ProbeTabelle {vs} bereit={!!syntax} neu={rechneVorschau} />
  {/snippet}
</AssistentRahmen>
