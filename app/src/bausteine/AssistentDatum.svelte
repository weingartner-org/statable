<script lang="ts">
  import { untrack, onDestroy } from 'svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName } from '../lib/skalabau';
  import { datumBefehl, type DatumOpt, type Einheit } from '../lib/datumrechnen';
  import { fehlerSatz, spaltenOption } from '../lib/datenassistentsaetze';
  import { wendeAn } from '../lib/datenassistentlauf';
  import { probeSpalten, type Probe } from '../lib/datenassistentprobe';
  import { AUTO_ZELLEN, Vorschau } from '../lib/assistentvorschau.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import ProbeTabelle from './ProbeTabelle.svelte';

  /**
   * „Datum und Zeit“ (Später S-C, Fachblatt 4.5): Alter und Dauer wie PSPP/SPSS DATEDIFF (vollendete Einheiten, 29.2. zählt am 1.3.); Jahr, Monat, Tag, Wochentag.
   * „Heute“ gibt es nie still: der Stichtag steht als Datum im Befehl und in der Beschriftung der Spalte.
   */
  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  const namen = $derived(s.spalten.map(x => x.name));
  const datums = $derived(s.spalten.filter(c => c.art === 'datum'));
  let modus = $state<'alter' | 'differenz' | 'teil'>('alter');
  let geburt = $state(''), von = $state(''), bis = $state(''), datumSp = $state('');
  let stichtagArt = $state<'datum' | 'spalte'>('datum');
  let stichtagDatum = $state(''), stichtagSpalte = $state('');
  let einheit = $state<Einheit>('days');
  let teil = $state<'jahr' | 'monat' | 'tag' | 'wochentag'>('jahr');
  let zielEigen = $state<string | null>(null);
  /** Namensvorschläge: je Fall ein fester Text (nichts wird aus Wörtern zusammengesetzt). */
  const DAUER_NAME = () => ({ years: L('dauer_jahre', 'duration_years'), quarters: L('dauer_quartale', 'duration_quarters'), months: L('dauer_monate', 'duration_months'), weeks: L('dauer_wochen', 'duration_weeks'), days: L('dauer_tage', 'duration_days'), hours: L('dauer_stunden', 'duration_hours'), minutes: L('dauer_minuten', 'duration_minutes'), seconds: L('dauer_sekunden', 'duration_seconds') });
  const TEIL_NAME = () => ({ jahr: L('datum_jahr', 'date_year'), monat: L('datum_monat', 'date_month'), tag: L('datum_tag', 'date_day'), wochentag: L('datum_wochentag', 'date_weekday') });
  const zielVorschlag = $derived(freierName(modus === 'alter' ? L('alter_jahre', 'age_years') : modus === 'differenz' ? DAUER_NAME()[einheit] : TEIL_NAME()[teil], namen));
  const ziel = $derived(zielEigen ?? zielVorschlag);
  const EINHEITEN: { id: Einheit; name: () => string }[] = [
    { id: 'years', name: () => L('Jahre', 'Years') }, { id: 'quarters', name: () => L('Quartale', 'Quarters') }, { id: 'months', name: () => L('Monate', 'Months') }, { id: 'weeks', name: () => L('Wochen', 'Weeks') },
    { id: 'days', name: () => L('Tage', 'Days') }, { id: 'hours', name: () => L('Stunden', 'Hours') }, { id: 'minutes', name: () => L('Minuten', 'Minutes') }, { id: 'seconds', name: () => L('Sekunden', 'Seconds') }
  ];
  const opt = $derived.by((): DatumOpt | null => {
    if (modus === 'alter') return geburt && (stichtagArt === 'datum' ? stichtagDatum : stichtagSpalte) ? { art: 'alter', geburt, stichtag: stichtagArt === 'datum' ? { art: 'datum', datum: stichtagDatum } : { art: 'spalte', spalte: stichtagSpalte }, ziel } : null;
    if (modus === 'differenz') return von && bis ? { art: 'differenz', von, bis, einheit, ziel } : null;
    return datumSp ? { art: 'teil', datum: datumSp, teil, ziel } : null;
  });
  const ergebnis = $derived.by((): { syntax: string } | { problem: string } => {
    if (!datums.length) return { problem: L('In den Daten gibt es keine Datumsspalte. Datumsangaben müssen als Datum gelesen sein (zum Beispiel 17.10.2026 oder 2026-10-17).', 'There is no date column in the data. Dates must be read as dates (for example 17.10.2026 or 2026-10-17).') };
    if (!opt) return { problem: L('Die Auswahl ist noch nicht vollständig.', 'The selection is not complete yet.') };
    try { return { syntax: datumBefehl(daten, opt).syntax }; } catch (f) { return { problem: fehlerSatz(f) }; }
  });
  const syntax = $derived('syntax' in ergebnis ? ergebnis.syntax : '');
  const quellen = $derived(modus === 'alter' ? [geburt, ...(stichtagArt === 'spalte' ? [stichtagSpalte] : [])] : modus === 'differenz' ? [von, bis] : [datumSp]);

  const vs = new Vorschau<Probe>();
  onDestroy(() => vs.verwerfe());
  const gross = $derived(s.zeilen.length * s.spalten.length > AUTO_ZELLEN);
  const probe = (sx: string, z: string, q: string[]) => probeSpalten(sx, [...q.filter(Boolean), z]);
  $effect(() => { const sx = syntax, z = ziel, q = quellen; if (!sx) return; untrack(() => vs.plane(() => probe(sx, z, q), !gross)); });
  const rechneVorschau = () => { if (syntax) void vs.jetzt(() => probe(syntax, ziel, quellen)); };

  const lad = new Laedt();
  async function anwenden() { if (syntax) await lad.mit(() => wendeAn(L(`${ziel} berechnet (Datum)`, `${ziel} calculated (date)`), syntax)); }
  const heuteIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
</script>

<AssistentRahmen id="datum" titel={L('Datum und Zeit', 'Date and time')} befehlName={L('Datum und Zeit', 'Date and time')}
  einleitung={L('Das Alter aus dem Geburtsdatum, die Dauer zwischen zwei Daten oder ein Teil des Datums (Jahr, Monat, Tag, Wochentag) als neue Spalte.', 'The age from the date of birth, the time between two dates, or a part of the date (year, month, day, weekday) as a new column.')}
  {syntax} problem={'problem' in ergebnis ? ergebnis.problem : ''}
  hinweise={[L('Gerechnet werden vollendete Einheiten, wie in SPSS: Wer am 29.2.2000 geboren ist, wird am 1.3. ein Jahr älter, nicht am 28.2. Ist das Ergebnis negativ, liegt das erste Datum nach dem zweiten.', 'Completed units are calculated, as in SPSS: someone born on 29.2.2000 turns a year older on 1.3., not on 28.2. A negative result means the first date lies after the second one.'),
    L('Uhrzeiten werden so gerechnet, wie sie dastehen, ohne Zeitzone und ohne Sommerzeit: Über die Zeitumstellung ist eine Dauer um eine Stunde anders als auf der Wanduhr.', 'Times are calculated as they stand, without time zone and daylight saving time: across the clock change a duration differs by an hour from the wall clock.'),
    ...(vs.wert?.fehler.length ? [L(`PSPP meldet: ${vs.wert.fehler[0]}`, `PSPP reports: ${vs.wert.fehler[0]}`)] : [])]}
  anwendenText={L('Berechnen', 'Calculate')} anwenden={anwenden} kannAnwenden={!!syntax && !vs.wert?.fehler.length} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <div class="as-feld"><span class="lbl" id="da-modus">{L('Was soll berechnet werden?', 'What should be calculated?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="da-modus">
        <label><input type="radio" name="da-modus" value="alter" bind:group={modus}>{L('Alter in Jahren', 'Age in years')}</label>
        <label><input type="radio" name="da-modus" value="differenz" bind:group={modus}>{L('Dauer zwischen zwei Daten', 'Time between two dates')}</label>
        <label><input type="radio" name="da-modus" value="teil" bind:group={modus}>{L('Teil eines Datums', 'Part of a date')}</label></div></div>
    <div class="as-felder">
      {#if modus === 'alter'}
        <div class="as-feld"><label for="da-geb">{L('Geburtsdatum', 'Date of birth')}</label><select id="da-geb" bind:value={geburt}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each datums as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        <div class="as-feld"><label for="da-sart">{L('Alter am …', 'Age on …')}</label><select id="da-sart" bind:value={stichtagArt}><option value="datum">{L('einem festen Stichtag', 'a fixed date')}</option><option value="spalte">{L('dem Datum in einer Spalte', 'the date in a column')}</option></select></div>
        {#if stichtagArt === 'datum'}
          <div class="as-feld"><label for="da-stag">{L('Stichtag', 'Date')}</label><input id="da-stag" type="date" bind:value={stichtagDatum}>
            <button class="k leise" type="button" onclick={() => (stichtagDatum = heuteIso())}>{L('Heutiges Datum eintragen', 'Enter today’s date')}</button>
            <span class="as-hilfe">{L('Das Datum steht fest im Befehl. So ändert sich das Ergebnis nicht, wenn die Datei morgen wieder geöffnet wird.', 'The date is fixed in the command. So the result does not change when the file is opened again tomorrow.')}</span></div>
        {:else}
          <div class="as-feld"><label for="da-sp">{L('Spalte mit dem Stichtag', 'Column with the date')}</label><select id="da-sp" bind:value={stichtagSpalte}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each datums as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        {/if}
      {:else if modus === 'differenz'}
        <div class="as-feld"><label for="da-von">{L('Von (früheres Datum)', 'From (earlier date)')}</label><select id="da-von" bind:value={von}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each datums as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        <div class="as-feld"><label for="da-bis">{L('Bis (späteres Datum)', 'To (later date)')}</label><select id="da-bis" bind:value={bis}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each datums as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        <div class="as-feld"><label for="da-ein">{L('In welcher Einheit?', 'In which unit?')}</label><select id="da-ein" bind:value={einheit}>{#each EINHEITEN as e}<option value={e.id}>{e.name()}</option>{/each}</select></div>
      {:else}
        <div class="as-feld"><label for="da-dat">{L('Datumsspalte', 'Date column')}</label><select id="da-dat" bind:value={datumSp}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each datums as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
        <div class="as-feld"><label for="da-teil">{L('Welcher Teil?', 'Which part?')}</label><select id="da-teil" bind:value={teil}><option value="jahr">{L('Jahr', 'Year')}</option><option value="monat">{L('Monat', 'Month')}</option><option value="tag">{L('Tag im Monat', 'Day of the month')}</option><option value="wochentag">{L('Wochentag (Sonntag = 1)', 'Weekday (Sunday = 1)')}</option></select></div>
      {/if}
      <div class="as-feld"><label for="da-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="da-name" type="text" autocomplete="off" value={ziel} oninput={(e) => (zielEigen = e.currentTarget.value)}></div>
    </div>
  {/snippet}
  {#snippet vorschau()}
    <ProbeTabelle {vs} bereit={!!syntax} neu={rechneVorschau} />
  {/snippet}
</AssistentRahmen>
