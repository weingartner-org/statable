<script lang="ts">
  import { untrack, onDestroy } from 'svelte';
  import { s, L, Lp } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName } from '../lib/skalabau';
  import { winsorBefehl, winsorWarnung, WINSOR_OBEN, WINSOR_UNTEN, type WinsorErgebnis } from '../lib/winsorbefehl';
  import { fehlerSatz, spaltenOption } from '../lib/datenassistentsaetze';
  import { wendeAn } from '../lib/datenassistentlauf';
  import { probeSpalten, type Probe } from '../lib/datenassistentprobe';
  import { AUTO_ZELLEN, Vorschau } from '../lib/assistentvorschau.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { komma } from '../lib/ergebnis';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import ProbeTabelle from './ProbeTabelle.svelte';

  /**
   * „Winsorisieren“ (Field-Stufe 3b): Ausreißer auf Grenzen setzen statt sie zu löschen. Eine NEUE Spalte, das Original bleibt; Grenzen als Perzentile (Standard 20 % und 80 %).
   * Ein Rückgängig-Schritt und ein Protokolleintrag (Art „Berechnen“); Fallgewicht: jede Zeile zählt für die Perzentile einmal (Hinweis im Assistenten).
   */
  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  const namen = $derived(s.spalten.map(x => x.name));
  const quellen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let spalte = $state('');
  let unten = $state(WINSOR_UNTEN);
  let oben = $state(WINSOR_OBEN);
  let zielEigen = $state<string | null>(null);
  const zielVorschlag = $derived(freierName(`${spalte || 'x'}_${L('winsor', 'winsor')}`.slice(0, 60), namen));
  const ziel = $derived(zielEigen ?? zielVorschlag);
  const ergebnis = $derived.by((): WinsorErgebnis | { problem: string } => {
    if (!spalte) return { problem: L('Welche Spalte winsorisiert werden soll, ist noch nicht gewählt.', 'The column to winsorize has not been chosen yet.') };
    if (!(Number.isFinite(unten) && Number.isFinite(oben)) || unten < 0 || oben > 100 || unten >= oben) return { problem: L('Die Grenzen passen nicht: Die untere muss kleiner sein als die obere, beide zwischen 0 und 100 Prozent.', 'The limits do not fit: the lower one must be smaller than the upper one, both between 0 and 100 percent.') };
    try { return winsorBefehl(daten, { spalte, ziel, unten, oben }); } catch (f) { return { problem: fehlerSatz(f) }; }
  });
  const e = $derived('syntax' in ergebnis ? ergebnis : null);
  const syntax = $derived(e?.syntax ?? '');

  const vs = new Vorschau<Probe>();
  onDestroy(() => vs.verwerfe());
  const gross = $derived(s.zeilen.length * s.spalten.length > AUTO_ZELLEN);
  const probe = (sx: string, z: string, q: string) => probeSpalten(sx, [q, z]);
  $effect(() => { const sx = syntax, z = ziel, q = spalte; if (!sx) return; untrack(() => vs.plane(() => probe(sx, z, q), !gross)); });
  const rechneVorschau = () => { if (syntax) void vs.jetzt(() => probe(syntax, ziel, spalte)); };

  const lad = new Laedt();
  async function anwenden() { if (e) await lad.mit(() => wendeAn(L(`${ziel} berechnet (winsorisiert, ${unten} % bis ${oben} %)`, `${ziel} calculated (winsorized, ${unten}% to ${oben}%)`), e.syntax)); }
  const geaendert = $derived(e ? e.nUnten + e.nOben : 0);
</script>

<AssistentRahmen id="winsor" titel={L('Winsorisieren', 'Winsorizing')} befehlName={L('Winsorisieren', 'Winsorizing')}
  einleitung={L('Extreme Werte einer Spalte auf Grenzen setzen, statt sie zu löschen: Werte unter dem unteren Perzentil werden auf dieses gesetzt, Werte über dem oberen Perzentil auf das obere. Das Ergebnis steht in einer neuen Spalte, die Original-Spalte bleibt.', 'Set extreme values of a column to limits instead of deleting them: values below the lower percentile are set to it, values above the upper percentile to the upper one. The result goes into a new column, the original column stays.')}
  {syntax} problem={'problem' in ergebnis ? ergebnis.problem : ''}
  hinweise={[winsorWarnung(),
    L('Die Grenzen sind Perzentile der gültigen Werte (wie R quantile, Typ 7). Jede Zeile zählt einmal; ein Fallgewicht wird dafür nicht benutzt. Fehlende Werte bleiben leer.', 'The limits are percentiles of the valid values (as R quantile, type 7). Every row counts once; a case weight is not used for this. Missing values stay empty.'),
    ...(e ? [Lp(geaendert, `Bei ${geaendert} von ${e.nGueltig} gültigen Werten ändert sich etwas (${e.nUnten} unten, ${e.nOben} oben). Grenzen: ${komma(Number(e.lo.toPrecision(6)), 3)} und ${komma(Number(e.hi.toPrecision(6)), 3)}.`, `Bei ${geaendert} von ${e.nGueltig} gültigen Werten ändert sich etwas (${e.nUnten} unten, ${e.nOben} oben). Grenzen: ${komma(Number(e.lo.toPrecision(6)), 3)} und ${komma(Number(e.hi.toPrecision(6)), 3)}.`, `${geaendert} of ${e.nGueltig} valid values change (${e.nUnten} below, ${e.nOben} above). Limits: ${komma(Number(e.lo.toPrecision(6)), 3)} and ${komma(Number(e.hi.toPrecision(6)), 3)}.`, `${geaendert} of ${e.nGueltig} valid values change (${e.nUnten} below, ${e.nOben} above). Limits: ${komma(Number(e.lo.toPrecision(6)), 3)} and ${komma(Number(e.hi.toPrecision(6)), 3)}.`)] : []),
    ...(vs.wert?.fehler.length ? [L(`PSPP meldet: ${vs.wert.fehler[0]}`, `PSPP reports: ${vs.wert.fehler[0]}`)] : [])]}
  anwendenText={L('Winsorisieren', 'Winsorizing')} anwenden={anwenden} kannAnwenden={!!syntax && !vs.wert?.fehler.length} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <div class="as-felder">
      <div class="as-feld"><label for="ws-spalte">{L('Welche Spalte?', 'Which column?')}</label>
        <select id="ws-spalte" bind:value={spalte}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each quellen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      <div class="as-feld"><label for="ws-unten">{L('Untere Grenze (Perzentil in %)', 'Lower limit (percentile in %)')}</label>
        <input id="ws-unten" type="number" min="0" max="99" step="1" class="as-schmal" bind:value={unten}></div>
      <div class="as-feld"><label for="ws-oben">{L('Obere Grenze (Perzentil in %)', 'Upper limit (percentile in %)')}</label>
        <input id="ws-oben" type="number" min="1" max="100" step="1" class="as-schmal" bind:value={oben}></div>
      <div class="as-feld"><label for="ws-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="ws-name" type="text" autocomplete="off" value={ziel} oninput={(ev) => (zielEigen = ev.currentTarget.value)}></div>
    </div>
  {/snippet}
  {#snippet vorschau()}
    <ProbeTabelle {vs} bereit={!!syntax} neu={rechneVorschau} />
  {/snippet}
</AssistentRahmen>
