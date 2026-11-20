<script lang="ts">
  import { untrack, onDestroy } from 'svelte';
  import { s, L, Lp } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/datenassistent';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName } from '../lib/skalabau';
  import { rangBefehl, type RangOpt } from '../lib/rangbildung';
  import { fehlerSatz, spaltenOption } from '../lib/datenassistentsaetze';
  import { wendeAn } from '../lib/datenassistentlauf';
  import { probeSpalten, type Probe } from '../lib/datenassistentprobe';
  import { AUTO_ZELLEN, Vorschau } from '../lib/assistentvorschau.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import ProbeTabelle from './ProbeTabelle.svelte';

  /**
   * „Ränge bilden“ (Später S-C, Fachblatt 4.4): genau wie SPSS RANK. Immer OHNE Fallgewicht (der Befehl setzt WEIGHT OFF davor und danach wieder das Gewicht);
   * zwei Prozentränge mit zwei Namen: „Rangprozent (SPSS)“ hier, „Prozentrang (Mitte)“ in der Normwert-Karte.
   */
  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  const namen = $derived(s.spalten.map(x => x.name));
  const quellen = $derived(s.spalten.filter(c => c.art !== 'text'));
  let spalte = $state('');
  let gruppe = $state('');
  let art = $state<RangOpt['art']>('rang');
  let bindungen = $state<NonNullable<RangOpt['bindungen']>>('mean');
  let richtung = $state<'auf' | 'ab'>('auf');
  let formel = $state<NonNullable<RangOpt['formel']>>('blom');
  let k = $state(4);
  let fehlendEin = $state(false);
  let zielEigen = $state<string | null>(null);
  const ARTEN: { id: RangOpt['art']; name: () => string; ziel: () => string }[] = [
    { id: 'rang', name: () => L('Rang', 'Rank'), ziel: () => L('rang', 'rank') }, { id: 'rangprozent', name: () => L('Rangprozent (SPSS): Rang / Fallzahl · 100', 'Rank percent (SPSS): rank / N · 100'), ziel: () => L('rangprozent', 'rank_percent') },
    { id: 'anteil', name: () => L('Rang-Anteil: Rang / Fallzahl', 'Rank fraction: rank / N'), ziel: () => L('rang_anteil', 'rank_fraction') }, { id: 'normal', name: () => L('Normalrang (z-Wert zum Rang)', 'Normal score (z value of the rank)'), ziel: () => L('normalrang', 'normal_score') },
    { id: 'gruppen', name: () => L('Gruppen nach Rang (Quartile, Dezile …)', 'Groups by rank (quartiles, deciles …)'), ziel: () => L('rang_gruppe', 'rank_group') }, { id: 'savage', name: () => L('Savage-Wert', 'Savage score'), ziel: () => L('savage', 'savage') }
  ];
  const zielVorschlag = $derived(freierName(`${ARTEN.find(a => a.id === art)!.ziel()}_${spalte || 'x'}`.slice(0, 60), namen));
  const ziel = $derived(zielEigen ?? zielVorschlag);
  const opt = $derived<RangOpt>({ art, bindungen, richtung, formel, k, fehlend: fehlendEin ? 'einschliessen' : 'ausschliessen' });
  const ergebnis = $derived.by((): { syntax: string; bezeichnung: string } | { problem: string } => {
    if (!spalte) return { problem: L('Welche Spalte gerangt werden soll, ist noch nicht gewählt.', 'The column to rank has not been chosen yet.') };
    try { const b = rangBefehl(daten, { ...opt, spalte, ziel, ...(gruppe ? { gruppe } : {}), gewicht: s.gewicht ?? null }); return { syntax: b.syntax, bezeichnung: b.bezeichnung }; }
    catch (f) { return { problem: fehlerSatz(f) }; }
  });
  const syntax = $derived('syntax' in ergebnis ? ergebnis.syntax : '');
  /** Fälle ohne gültige Gruppe: sie bekommen keinen Rang (leer), nie einen eigenen. */
  const ohneGruppe = $derived.by(() => { const i = s.spalten.findIndex(c => c.name === gruppe); return gruppe && i >= 0 ? s.zeilen.filter(z => istFehlend(s.spalten[i]!, z[i] ?? null)).length : 0; });

  const vs = new Vorschau<Probe>();
  onDestroy(() => vs.verwerfe());
  const gross = $derived(s.zeilen.length * s.spalten.length > AUTO_ZELLEN);
  const probe = (sx: string, z: string, q: string, g: string) => probeSpalten(sx, [q, ...(g ? [g] : []), z]);
  $effect(() => { const sx = syntax, z = ziel, q = spalte, g = gruppe; if (!sx) return; untrack(() => vs.plane(() => probe(sx, z, q, g), !gross)); });
  const rechneVorschau = () => { if (syntax) void vs.jetzt(() => probe(syntax, ziel, spalte, gruppe)); };

  const lad = new Laedt();
  async function anwenden() { if (syntax) await lad.mit(() => wendeAn(L(`${ziel} berechnet (Ränge)`, `${ziel} calculated (ranks)`), syntax)); }
</script>

<AssistentRahmen id="rang" titel={L('Ränge bilden', 'Compute ranks')} befehlName={L('Ränge bilden', 'Compute ranks')}
  einleitung={L('Aus den Werten einer Spalte Ränge machen (der kleinste Wert hat Rang 1), dazu Rangprozente, Normalränge, Gruppen und Savage-Werte - zum Beispiel für Rangtests oder zum Bilden von Gruppen.', 'Turn the values of a column into ranks (the smallest value has rank 1), plus rank percents, normal scores, groups and Savage scores - for example for rank tests or to form groups.')}
  {syntax} problem={'problem' in ergebnis ? ergebnis.problem : ''}
  hinweise={[L('Ränge werden ohne Fallgewicht gebildet: Jeder Fall bekommt seinen eigenen Rang. Ein aktives Fallgewicht wird dafür kurz ausgeschaltet und danach wieder eingeschaltet.', 'Ranks are formed without case weight: every case gets its own rank. An active case weight is switched off briefly for this and switched on again afterwards.'),
    L('Das „Rangprozent (SPSS)“ ist Rang geteilt durch die Fallzahl mal 100; der höchste Wert hat immer 100. Der „Prozentrang (Mitte)“ der Karte Normwerte rechnet (Rang − 0,5) / Fallzahl · 100. Beide sind richtig, aber nicht dasselbe.', 'The "rank percent (SPSS)" is rank divided by N times 100; the highest value always has 100. The "percentile rank (middle)" of the Norm values card uses (rank − 0.5) / N · 100. Both are correct, but not the same.'),
    ...(ohneGruppe ? [Lp(ohneGruppe, `${ohneGruppe} Fall hat keine gültige Gruppe und bekommt keinen Rang (die Zelle bleibt leer).`, `${ohneGruppe} Fälle haben keine gültige Gruppe und bekommen keinen Rang (die Zellen bleiben leer).`, `${ohneGruppe} case has no valid group and gets no rank (the cell stays empty).`, `${ohneGruppe} cases have no valid group and get no rank (the cells stay empty).`)] : []),
    ...(art === 'gruppen' ? [L('Gleiche Werte kommen in dieselbe Gruppe; deshalb sind die Gruppen bei vielen Bindungen nicht gleich groß.', 'Equal values go into the same group; so the groups are not equally large when there are many ties.')] : []),
    ...(art === 'normal' ? [L('Normalränge machen die Verteilung nur näherungsweise symmetrisch und glatt; sie ersetzen nicht die Prüfung der Voraussetzungen.', 'Normal scores make the distribution only approximately symmetric and smooth; they do not replace checking the assumptions.')] : [])]}
  anwendenText={L('Ränge bilden', 'Compute ranks')} anwenden={anwenden} kannAnwenden={!!syntax && !vs.wert?.fehler.length} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <div class="as-felder">
      <div class="as-feld"><label for="ra-spalte">{L('Welche Spalte?', 'Which column?')}</label>
        <select id="ra-spalte" bind:value={spalte}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each quellen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      <div class="as-feld"><label for="ra-art">{L('Was soll entstehen?', 'What should be created?')}</label>
        <select id="ra-art" bind:value={art}>{#each ARTEN as a}<option value={a.id}>{a.name()}</option>{/each}</select></div>
      <div class="as-feld"><label for="ra-richtung">{L('Richtung', 'Direction')}</label>
        <select id="ra-richtung" bind:value={richtung}><option value="auf">{L('aufsteigend (kleinster Wert = Rang 1)', 'ascending (smallest value = rank 1)')}</option><option value="ab">{L('absteigend (größter Wert = Rang 1)', 'descending (largest value = rank 1)')}</option></select></div>
      <div class="as-feld"><label for="ra-bind">{L('Gleiche Werte (Bindungen)', 'Equal values (ties)')}</label>
        <select data-begriff="bindung" id="ra-bind" bind:value={bindungen}><option value="mean">{L('mittlerer Rang (SPSS-Voreinstellung)', 'mean rank (SPSS default)')}</option><option value="low">{L('niedrigster Rang', 'lowest rank')}</option><option value="high">{L('höchster Rang', 'highest rank')}</option><option value="condense">{L('lückenlos (1, 2, 3 …)', 'condensed (1, 2, 3 …)')}</option></select></div>
      {#if art === 'normal'}<div class="as-feld"><label for="ra-formel">{L('Formel', 'Formula')}</label>
        <select id="ra-formel" bind:value={formel}><option value="blom">Blom</option><option value="tukey">Tukey</option><option value="rankit">Rankit</option><option value="vw">{L('Van der Waerden', 'Van der Waerden')}</option></select></div>{/if}
      {#if art === 'gruppen'}<div class="as-feld"><label for="ra-k">{L('Zahl der Gruppen (4 = Quartile, 10 = Dezile)', 'Number of groups (4 = quartiles, 10 = deciles)')}</label>
        <input id="ra-k" type="number" min="2" max="100" step="1" class="as-schmal" bind:value={k}></div>{/if}
      <div class="as-feld"><label for="ra-gruppe">{L('Rang je Gruppe (freiwillig)', 'Rank within groups (optional)')}</label>
        <select id="ra-gruppe" bind:value={gruppe}><option value="">{L('für alle zusammen', 'for everyone together')}</option>{#each s.spalten as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      <div class="as-feld"><label for="ra-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="ra-name" type="text" autocomplete="off" value={ziel} oninput={(e) => (zielEigen = e.currentTarget.value)}></div>
    </div>
    <label data-begriff="fehlendcode" class="as-eins"><input type="checkbox" bind:checked={fehlendEin}>{L('„Keine Angabe“-Codes wie gültige Werte mitrangieren', 'Rank "no answer" codes like valid values')}</label>
  {/snippet}
  {#snippet vorschau()}
    <ProbeTabelle {vs} bereit={!!syntax} neu={rechneVorschau} />
  {/snippet}
</AssistentRahmen>
