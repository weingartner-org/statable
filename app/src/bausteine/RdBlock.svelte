<script lang="ts">
  /**
   * B2 Teil 2d-2: „Gibt es an einer Schwelle einen Sprung? (Regressions-Diskontinuität)“ unter der Regression („Lässt sich etwas vorhersagen?“, Gruppe „Anders rechnen“).
   * Eigene Daten: Ergebnis und Zuteilungsvariable (Zahlen-Spalten), Schwelle, Bandbreiten (mehrere nebeneinander), Ordnung, Gewichte. Rechnet im Browser (lib/rdblock.ts, Kern lib/rd.ts), erst auf Klick.
   * Der Sprung steht für jede Bandbreite in einer Zeile; je nach Bandbreite ändert sich die Schätzung, darum immer mehrere. Beschreibend, ohne Deutung; Hinweise auf Grenzen immer dabei.
   * Fachblatt docs/ausbau/FACHBLATT-B2-OEKONOMETRIE.md, Abschnitt Teil 2d-2.
   */
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';
  import { s, L, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { komma, ohneNull } from '../lib/ergebnis';
  import { herunterladen, heute } from '../lib/export';
  import { rSkriptZip } from '../lib/rskript';
  import { RD_MAX, RD_BANDBREITEN_MAX, baueRdSkript, bandbreitenVorschlag, leseBandbreiten, rdBlockRechne, rdDaten, type RdBlockFehler, type RdZeile } from '../lib/rdblock';
  import type { RdErgebnis, RdKern } from '../lib/rd';

  const kennung = $props.id();
  const nm = (c: { name: string; bezeichnung: string }) => c.bezeichnung.trim() || c.name;
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let ziel = $state(''), zuteilung = $state(''), schwelleText = $state('0'), bwText = $state(''), bwAngefasst = $state(false);
  let ordnung = $state<'1' | '2'>('1'), kern = $state<RdKern>('dreieck'), laeuft = $state(false);
  let res = $state<{ z: RdZeile[]; ziel: string; zuteilung: string; schwelle: number; bw: number[]; ordnung: 1 | 2; kern: RdKern; n: number; weg: number } | RdBlockFehler | null>(null);
  $effect(() => { void ziel; void zuteilung; void schwelleText; void bwText; void ordnung; void kern; res = null; });
  const wort = (n: string) => { const c = s.spalten.find(x => x.name === n); return c ? nm(c) : n; };

  /** Vorschlag für die Bandbreiten, solange die Person das Feld nicht selbst angefasst hat. */
  $effect(() => {
    if (!zuteilung || bwAngefasst) return;
    const sp = zahlen.find(c => c.name === zuteilung); if (!sp) return;
    const ix = s.spalten.indexOf(sp);
    const x = s.zeilen.map(r => r[ix]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const v = bandbreitenVorschlag(x);
    if (v.length) bwText = v.map(h => komma(h, 6).replace(/,?0+$/, '')).join('; ');
  });

  const schwelle = $derived(Number(schwelleText.replace(',', '.')));
  async function rechnen() {
    if (laeuft || !ziel || !zuteilung) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    const d = rdDaten(s.spalten, s.zeilen, ziel, zuteilung);
    if ('fehler' in d) res = d;
    else {
      const bw = leseBandbreiten(bwText), o = ordnung === '2' ? 2 : 1;
      const z = schwelleText.trim() === '' ? ({ fehler: 'schwelle' } as RdBlockFehler) : rdBlockRechne(d, schwelle, bw, o, kern);
      res = Array.isArray(z) ? { z, ziel, zuteilung, schwelle, bw, ordnung: o, kern, n: d.y.length, weg: d.weg } : z;
    }
    laeuft = false;
    sage(res && 'fehler' in res ? fehlerText(res) : L('Regressions-Diskontinuität gerechnet.', 'Regression discontinuity calculated.'), res && 'fehler' in res ? 'dringend' : undefined);
  }
  const fehlerText = (f: RdBlockFehler) => f.fehler === 'keine-auswahl' ? L('Bitte Ergebnis und Zuteilungsvariable wählen (beides Zahlen-Spalten).', 'Please choose the outcome and the assignment variable (both number columns).')
    : f.fehler === 'doppelt' ? L('Ergebnis und Zuteilungsvariable müssen verschiedene Spalten sein.', 'The outcome and the assignment variable must be different columns.')
    : f.fehler === 'schwelle' ? L('Bitte eine Schwelle als Zahl angeben.', 'Please enter a threshold as a number.')
    : f.fehler === 'keine-bandbreite' ? L('Bitte mindestens eine Bandbreite angeben (eine Zahl größer als 0, mehrere getrennt durch Leerzeichen oder Semikolon).', 'Please enter at least one bandwidth (a number greater than 0, several separated by spaces or semicolons).')
    : f.fehler === 'zu-viele-faelle' ? L(`Mehr als ${komma(RD_MAX, 0)} Fälle mit allen Angaben: Das rechnet der Browser zu lange. Bitte vorher Fälle auswählen (Daten → Fälle auswählen).`, `More than ${komma(RD_MAX, 0)} cases with all answers: that takes the browser too long. Please select cases first (Data → Select cases).`)
    : L('Diese Bandbreite lässt sich nicht rechnen.', 'This bandwidth cannot be calculated.');
  const zeileFehler = (f: string) => f === 'eine-seite' ? L('Fälle nur auf einer Seite der Schwelle', 'cases on one side of the threshold only')
    : f === 'zu-wenig-faelle' ? L('zu wenige Fälle im Fenster', 'too few cases in the window')
    : f === 'bandbreite' ? L('Bandbreite ungültig', 'invalid bandwidth')
    : L('nicht rechenbar', 'cannot be calculated');

  const ok = $derived(res && !('fehler' in res) ? res : null);
  const z = (v: number, n = 2) => (Number.isFinite(v) ? komma(v, n) : '-');
  const pw = (v: number) => (!Number.isFinite(v) ? '-' : v < 0.001 ? L('< ,001', '< .001') : ohneNull(v, 3));
  const gerechnet = $derived(ok ? ok.z.filter((r): r is { h: number; e: RdErgebnis } => !('fehler' in r.e)) : []);
  const saetze = $derived.by(() => {
    if (!ok) return [] as string[];
    const aus = [L(`${ok.n} Fälle gehen ein${ok.weg ? ` (${ok.weg} mit Lücken bleiben außen vor)` : ''}. Die Schwelle liegt bei ${z(ok.schwelle, 2)}.`, `${ok.n} cases are included${ok.weg ? ` (${ok.weg} with gaps are left out)` : ''}. The threshold is at ${z(ok.schwelle, 2)}.`)];
    if (gerechnet.length) {
      const bs = gerechnet.map(r => r.e.b), lo = Math.min(...bs), hi = Math.max(...bs);
      aus.push(gerechnet.length === 1
        ? L(`Unmittelbar an der Schwelle springt „${wort(ok.ziel)}“ um ${z(gerechnet[0]!.e.b)} (Standardfehler robust ${z(gerechnet[0]!.e.seRobust)}, p ${pw(gerechnet[0]!.e.pR).startsWith('<') ? pw(gerechnet[0]!.e.pR) : '= ' + pw(gerechnet[0]!.e.pR)}).`, `Right at the threshold “${wort(ok.ziel)}” jumps by ${z(gerechnet[0]!.e.b)} (robust standard error ${z(gerechnet[0]!.e.seRobust)}, p ${pw(gerechnet[0]!.e.pR).startsWith('<') ? pw(gerechnet[0]!.e.pR) : '= ' + pw(gerechnet[0]!.e.pR)}).`)
        : L(`Je nach Bandbreite springt „${wort(ok.ziel)}“ an der Schwelle um ${z(lo)} bis ${z(hi)}. Liegen die Schätzungen eng beieinander, hängt der Befund wenig von der Bandbreite ab.`, `Depending on the bandwidth, “${wort(ok.ziel)}” jumps at the threshold by ${z(lo)} to ${z(hi)}. If the estimates lie close together, the finding depends little on the bandwidth.`));
    }
    return aus;
  });

  function rSkript() {
    if (!ok) return;
    try {
      const sk = baueRdSkript({ spalten: s.spalten, zeilen: s.zeilen, ziel: ok.ziel, zuteilung: ok.zuteilung, schwelle: ok.schwelle, bandbreiten: ok.bw, ordnung: ok.ordnung, kern: ok.kern, zeilenErg: ok.z, titel: L('Regressions-Diskontinuität', 'Regression discontinuity'), datum: heute() });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if zahlen.length >= 2}
  <details class="auf rdd" style="margin-top:var(--a4)"><summary>{L('Gibt es an einer Schwelle einen Sprung? (Regressions-Diskontinuität)', 'Is there a jump at a threshold? (regression discontinuity)')}</summary>
    <p class="heft-text">{L('Manchmal entscheidet eine Schwelle, wer eine Maßnahme bekommt: wer mindestens 18 Punkte hat, besteht; wer mehr Stimmen hat, gewinnt. Fälle knapp links und knapp rechts der Schwelle unterscheiden sich sonst kaum. Springt das Ergebnis genau an der Schwelle, spricht das für eine Wirkung der Maßnahme. Hier wird links und rechts der Schwelle je eine Gerade (oder Parabel) angepasst; der Sprung ist der Abstand der beiden an der Schwelle. Nur wer sicher ab der Schwelle behandelt wird und davor nicht (scharfe Variante), ist hier richtig.', 'Sometimes a threshold decides who gets a measure: whoever has at least 18 points passes; whoever has more votes wins. Cases just left and just right of the threshold otherwise hardly differ. If the outcome jumps exactly at the threshold, that points to an effect of the measure. Here a line (or parabola) is fitted on each side of the threshold; the jump is the distance between the two at the threshold. This fits only if everyone from the threshold up is treated and nobody below is (sharp design).')}</p>
    <p class="hilfe"><HilfeLink id="regressions-diskontinuitaet" text={L('Hilfe: Regressions-Diskontinuität', 'Help: regression discontinuity')} /></p>
    <div class="rdd-zeile">
      <div class="eingabe"><label for="rd-z-{kennung}">{L('Was soll verglichen werden? (Zahl)', 'What should be compared? (number)')}</label>
        <select id="rd-z-{kennung}" bind:value={ziel}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen.filter(c => c.name !== zuteilung) as c (c.name)}<option value={c.name}>{nm(c)}</option>{/each}</select></div>
      <div class="eingabe"><label for="rd-x-{kennung}">{L('Welche Spalte entscheidet über die Behandlung? (Zuteilungsvariable)', 'Which column decides about the treatment? (assignment variable)')}</label>
        <select id="rd-x-{kennung}" bind:value={zuteilung}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen.filter(c => c.name !== ziel) as c (c.name)}<option value={c.name}>{nm(c)}</option>{/each}</select></div>
    </div>
    {#if ziel && zuteilung}
      <div class="rdd-zeile">
        <div class="eingabe"><label for="rd-s-{kennung}">{L('Wo liegt die Schwelle? (ab hier behandelt)', 'Where is the threshold? (treated from here on)')}</label>
          <input id="rd-s-{kennung}" type="text" inputmode="decimal" bind:value={schwelleText} /></div>
        <div class="eingabe"><label for="rd-b-{kennung}">{L(`Bandbreiten: wie weit um die Schwelle zählt ein Fall? (bis zu ${RD_BANDBREITEN_MAX}, mit Leerzeichen getrennt)`, `Bandwidths: how far around the threshold does a case count? (up to ${RD_BANDBREITEN_MAX}, separated by spaces)`)}</label>
          <input id="rd-b-{kennung}" type="text" inputmode="decimal" bind:value={bwText} oninput={() => { bwAngefasst = true; }} /></div>
      </div>
      <div class="rdd-zeile">
        <div class="eingabe"><label for="rd-o-{kennung}">{L('Wie gebogen darf der Verlauf sein? (Ordnung)', 'How curved may the course be? (order)')}</label>
          <select id="rd-o-{kennung}" bind:value={ordnung}><option value="1">{L('Gerade (Ordnung 1)', 'Line (order 1)')}</option><option value="2">{L('Parabel (Ordnung 2)', 'Parabola (order 2)')}</option></select></div>
        <div class="eingabe"><label for="rd-k-{kennung}">{L('Zählen nahe Fälle stärker? (Gewichte)', 'Do near cases count more? (weights)')}</label>
          <select id="rd-k-{kennung}" bind:value={kern}><option value="dreieck">{L('Ja, je näher, desto stärker (dreieckig)', 'Yes, the nearer the stronger (triangular)')}</option><option value="gleich">{L('Nein, alle gleich', 'No, all equal')}</option></select></div>
      </div>
      <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{ok ? L('Sprung neu rechnen', 'Recalculate jump') : L('Sprung rechnen', 'Calculate jump')}{/if}</button></div>
    {/if}
    {#if res && 'fehler' in res}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if ok}
      <div class="rdd-saetze">{#each saetze as t (t)}<p class="heft-text">{t}</p>{/each}</div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Sprung von „${wort(ok.ziel)}“ an der Schwelle, nach Bandbreite`, `Jump of “${wort(ok.ziel)}” at the threshold, by bandwidth`)}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Bandbreite', 'Bandwidth')}</th><th scope="col">{L('Fälle (links; rechts)', 'Cases (left; right)')}</th><th scope="col">{L('Sprung', 'Jump')}</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">p</th><th scope="col">{L('Standardfehler (robust)', 'Standard error (robust)')}</th><th scope="col">{L('p (robust)', 'p (robust)')}</th></tr></thead>
        <tbody>{#each ok.z as r (r.h)}
          {#if 'fehler' in r.e}<tr><th scope="row" style="text-align: start">{komma(r.h, 4).replace(/,?0+$/, '')}</th><td colspan="6">{zeileFehler(r.e.fehler)}</td></tr>
          {:else}<tr><th scope="row" style="text-align: start">{komma(r.h, 4).replace(/,?0+$/, '')}</th><td style="text-align:end">{r.e.n} ({r.e.nLinks}; {r.e.nRechts})</td><td style="text-align:end"><b>{z(r.e.b)}</b></td><td style="text-align:end">{z(r.e.se)}</td><td style="text-align:end">{pw(r.e.p)}</td><td style="text-align:end">{z(r.e.seRobust)}</td><td style="text-align:end">{pw(r.e.pR)}</td></tr>{/if}
        {/each}</tbody>
      </table></div>
      <div class="knopfzeile"><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Der Sprung gilt nur für Fälle direkt an der Schwelle, nicht für alle. Er spricht nur dann für eine Wirkung, wenn niemand die Zuteilungsvariable gezielt knapp über die Schwelle schieben konnte (sonst unterscheiden sich die Fälle links und rechts doch) und wenn nichts anderes an derselben Schwelle ansetzt. Schmale Bandbreiten sind genauer, aber ungenauer geschätzt: Es bleiben wenige Fälle. Statable wählt die Bandbreite nicht automatisch; darum stehen mehrere nebeneinander, und es lässt sich prüfen, ob der Sprung bleibt. Die Standardfehler gelten für größere Stichproben.', 'The jump holds only for cases right at the threshold, not for all. It points to an effect only if nobody could push the assignment variable just above the threshold on purpose (otherwise the cases on the left and right differ after all) and if nothing else starts at the same threshold. Narrow bandwidths are more accurate in what they compare but less precisely estimated: few cases remain. Statable does not choose the bandwidth automatically; that is why several are shown side by side, so one can check whether the jump stays. The standard errors hold for larger samples.')}</p>
    {/if}
  </details>
{/if}

<style>
  .rdd-zeile { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); align-items: end; margin-block: var(--a2); }
  .rdd-zeile .eingabe { max-width: 340px; margin: 0; }
</style>
