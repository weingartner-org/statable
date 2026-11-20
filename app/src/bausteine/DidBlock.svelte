<script lang="ts">
  /**
   * B2 Teil 2c: „Hat die Maßnahme etwas verändert? (Differenz-in-Differenzen)“ unter der Regression („Lässt sich etwas vorhersagen?“, Gruppe „Anders rechnen“).
   * Eigene Daten: Ziel, Gruppenspalte (0 = Vergleichsgruppe, 1 = behandelt), Zeitspalte (0 = vorher, 1 = nachher), übrige Merkmale (Zahlen-Spalten). Rechnet im Browser (lib/didblock.ts, Kern lib/did.ts), erst auf Klick.
   * Vier Gruppenmittel und die Differenz stehen immer vor dem Regressionsergebnis; der Hinweis auf die Annahme gleichlaufender Trends steht immer dabei. Beschreibend, ohne Deutung.
   * Fachblatt docs/ausbau/FACHBLATT-B2-OEKONOMETRIE.md, Abschnitt Teil 2c.
   */
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';
  import { s, L, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { komma, ohneNull } from '../lib/ergebnis';
  import { herunterladen, heute } from '../lib/export';
  import { rSkriptZip } from '../lib/rskript';
  import { DID_MAX, baueDidSkript, didBlockRechne, didDaten, type DidBlockFehler } from '../lib/didblock';
  import type { DidErgebnis } from '../lib/did';

  const kennung = $props.id();
  const nm = (c: { name: string; bezeichnung: string }) => c.bezeichnung.trim() || c.name;
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let ziel = $state(''), gruppe = $state(''), zeit = $state(''), exo = $state<string[]>([]), laeuft = $state(false);
  let res = $state<{ e: DidErgebnis; ziel: string; gruppe: string; zeit: string; exo: string[]; weg: number } | DidBlockFehler | null>(null);
  $effect(() => { void ziel; void gruppe; void zeit; void exo.join('|'); res = null; });
  const exoKandidaten = $derived(zahlen.filter(c => ![ziel, gruppe, zeit].includes(c.name)));
  $effect(() => { const e2 = exo.filter(n => n !== ziel && n !== gruppe && n !== zeit && zahlen.some(c => c.name === n)); if (e2.length !== exo.length) exo = e2; });
  const umschaltenExo = (n: string, an: boolean) => { exo = an ? [...exo, n] : exo.filter(x => x !== n); };
  const wort = (n: string) => { const c = s.spalten.find(x => x.name === n); return c ? nm(c) : n; };

  async function rechnen() {
    if (laeuft || !ziel || !gruppe || !zeit) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    const d = didDaten(s.spalten, s.zeilen, ziel, gruppe, zeit, exo);
    if ('fehler' in d) res = d;
    else { const e = didBlockRechne(d, wort(gruppe), wort(zeit)); res = 'fehler' in e ? e : { e, ziel, gruppe, zeit, exo: [...exo], weg: d.weg }; }
    laeuft = false;
    sage(res && 'fehler' in res ? fehlerText(res) : L('Differenz-in-Differenzen gerechnet.', 'Difference-in-differences calculated.'), res && 'fehler' in res ? 'dringend' : undefined);
  }
  const fehlerText = (f: DidBlockFehler) => f.fehler === 'keine-auswahl' ? L('Bitte Ziel, Gruppenspalte und Zeitspalte wählen (alles Zahlen-Spalten).', 'Please choose the outcome, the group column and the time column (all number columns).')
    : f.fehler === 'doppelt' ? L('Eine Spalte darf nur an einer Stelle stehen.', 'A column may appear in one place only.')
    : f.fehler === 'keine-null-eins' ? L('Gruppen- und Zeitspalte dürfen nur die Werte 0 und 1 enthalten (0 = Vergleichsgruppe bzw. vorher, 1 = behandelt bzw. nachher).', 'The group and time columns may contain only the values 0 and 1 (0 = comparison group or before, 1 = treated or after).')
    : f.fehler === 'leere-gruppe' ? L('Alle vier Gruppen brauchen Fälle: Behandelte und Vergleichsgruppe, jeweils vorher und nachher.', 'All four groups need cases: treated and comparison group, each before and after.')
    : f.fehler === 'zu-viele-faelle' ? L(`Mehr als ${komma(DID_MAX, 0)} Fälle mit allen Angaben: Das rechnet der Browser zu lange. Bitte vorher Fälle auswählen (Daten → Fälle auswählen).`, `More than ${komma(DID_MAX, 0)} cases with all answers: that takes the browser too long. Please select cases first (Data → Select cases).`)
    : f.fehler === 'zu-wenig-faelle' ? L('Zu wenige Fälle für so viele Spalten.', 'Too few cases for so many columns.')
    : L('Die Spalten hängen so eng zusammen (oder sind so gleichförmig), dass sich das Modell nicht rechnen lässt. Eine der Spalten weglassen.', 'The columns are so closely related (or so uniform) that the model cannot be calculated. Leave one of the columns out.');

  const ok = $derived(res && !('fehler' in res) ? res : null);
  const z = (v: number, n = 3) => (Number.isFinite(v) ? komma(v, n) : '-');
  const pw = (v: number) => (!Number.isFinite(v) ? '-' : v < 0.001 ? L('< ,001', '< .001') : ohneNull(v, 3));
  const pGleich = (v: number) => (pw(v).startsWith('<') ? pw(v) : '= ' + pw(v));
  const saetze = $derived.by(() => {
    if (!ok) return [] as string[];
    const e = ok.e, m = e.mittel, d = e.koef[3]!, mit = ok.exo.length > 0;
    const aus = [
      L(`${e.n} Fälle gehen ein${ok.weg ? ` (${ok.weg} mit Lücken bleiben außen vor)` : ''}.`, `${e.n} cases are included${ok.weg ? ` (${ok.weg} with gaps are left out)` : ''}.`),
      L(`Die behandelte Gruppe änderte sich um ${z(m.m11 - m.m10, 2)}, die Vergleichsgruppe um ${z(m.m01 - m.m00, 2)}. Die Differenz der Änderungen (Differenz-in-Differenzen) beträgt ${z(e.didMittel, 2)}.`, `The treated group changed by ${z(m.m11 - m.m10, 2)}, the comparison group by ${z(m.m01 - m.m00, 2)}. The difference of the changes (difference-in-differences) is ${z(e.didMittel, 2)}.`),
      mit
        ? L(`Mit den übrigen Merkmalen im Modell beträgt sie ${z(d.b, 2)} (Standardfehler ${z(d.se, 2)}, p ${pGleich(d.p)}; robust ${z(d.seRobust, 2)}, p ${pGleich(d.pR)}).`, `With the other features in the model it is ${z(d.b, 2)} (standard error ${z(d.se, 2)}, p ${pGleich(d.p)}; robust ${z(d.seRobust, 2)}, p ${pGleich(d.pR)}).`)
        : L(`Als Regressionskoeffizient: ${z(d.b, 2)} (Standardfehler ${z(d.se, 2)}, p ${pGleich(d.p)}; robust ${z(d.seRobust, 2)}, p ${pGleich(d.pR)}).`, `As a regression coefficient: ${z(d.b, 2)} (standard error ${z(d.se, 2)}, p ${pGleich(d.p)}; robust ${z(d.seRobust, 2)}, p ${pGleich(d.pR)}).`)
    ];
    return aus;
  });

  function rSkript() {
    if (!ok) return;
    try {
      const sk = baueDidSkript({ spalten: s.spalten, zeilen: s.zeilen, ziel: ok.ziel, gruppe: ok.gruppe, zeit: ok.zeit, exo: ok.exo, r: ok.e, titel: L('Differenz-in-Differenzen', 'Difference-in-differences'), datum: heute() });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if zahlen.length >= 3}
  <details class="auf did" style="margin-top:var(--a4)"><summary>{L('Hat die Maßnahme etwas verändert? (Differenz-in-Differenzen)', 'Did the measure change anything? (difference-in-differences)')}</summary>
    <p class="heft-text">{L('Eine Gruppe wird von einer Maßnahme getroffen (behandelt), eine andere nicht (Vergleichsgruppe); beide werden vorher und nachher gemessen. Verglichen werden die Änderungen: Was die behandelte Gruppe mehr (oder weniger) geändert hat als die Vergleichsgruppe, wird der Maßnahme zugeschrieben. Das gilt nur, wenn beide Gruppen ohne die Maßnahme gleichlaufend weitergegangen wären (Annahme gleichlaufender Trends). Mit nur einem Zeitpunkt vorher lässt sich diese Annahme aus den Daten nicht prüfen.', 'One group is hit by a measure (treated), another is not (comparison group); both are measured before and after. The changes are compared: what the treated group changed more (or less) than the comparison group is attributed to the measure. This holds only if both groups would have moved in parallel without the measure (parallel trends assumption). With only one point in time before, this assumption cannot be checked from the data.')}</p>
    <p class="hilfe"><HilfeLink id="differenz-in-differenzen" text={L('Hilfe: Differenz-in-Differenzen', 'Help: difference-in-differences')} /></p>
    <div class="did-zeile">
      <div class="eingabe"><label for="did-z-{kennung}">{L('Was soll verglichen werden? (Zahl)', 'What should be compared? (number)')}</label>
        <select id="did-z-{kennung}" bind:value={ziel}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen as c (c.name)}<option value={c.name}>{nm(c)}</option>{/each}</select></div>
      <div class="eingabe"><label for="did-g-{kennung}">{L('Welche Spalte trennt die Gruppen? (1 = behandelt, 0 = Vergleich)', 'Which column separates the groups? (1 = treated, 0 = comparison)')}</label>
        <select id="did-g-{kennung}" bind:value={gruppe}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen.filter(c => c.name !== ziel && c.name !== zeit) as c (c.name)}<option value={c.name}>{nm(c)}</option>{/each}</select></div>
      <div class="eingabe"><label for="did-t-{kennung}">{L('Welche Spalte trennt vorher und nachher? (1 = nachher, 0 = vorher)', 'Which column separates before and after? (1 = after, 0 = before)')}</label>
        <select id="did-t-{kennung}" bind:value={zeit}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen.filter(c => c.name !== ziel && c.name !== gruppe) as c (c.name)}<option value={c.name}>{nm(c)}</option>{/each}</select></div>
    </div>
    {#if ziel && gruppe && zeit}
      <fieldset style="border:0;padding:0;margin:var(--a2) 0"><legend style="font-weight:600">{L('Was soll sonst noch im Modell stehen? (übrige Merkmale, freiwillig)', 'What else should be in the model? (other features, optional)')}</legend>
        {#each exoKandidaten as c (c.name)}<label class="schalter" style="display:inline-flex;margin-inline-end:var(--a4)"><input type="checkbox" checked={exo.includes(c.name)} onchange={(ev) => umschaltenExo(c.name, ev.currentTarget.checked)} />{nm(c)}</label>{/each}
      </fieldset>
      <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{ok ? L('Differenz-in-Differenzen neu rechnen', 'Recalculate difference-in-differences') : L('Differenz-in-Differenzen rechnen', 'Calculate difference-in-differences')}{/if}</button></div>
    {/if}
    {#if res && 'fehler' in res}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if ok}
      <div class="did-saetze">{#each saetze as t (t)}<p class="heft-text">{t}</p>{/each}</div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Mittelwerte von „${wort(ok.ziel)}“ nach Gruppe und Zeit`, `Means of “${wort(ok.ziel)}” by group and time`)}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Gruppe', 'Group')}</th><th scope="col">{L('Vorher', 'Before')}</th><th scope="col">{L('Nachher', 'After')}</th><th scope="col">{L('Änderung', 'Change')}</th></tr></thead>
        <tbody>
          <tr><th scope="row" style="text-align: start">{L(`Vergleichsgruppe (n = ${ok.e.mittel.n00}; ${ok.e.mittel.n01})`, `Comparison group (n = ${ok.e.mittel.n00}; ${ok.e.mittel.n01})`)}</th><td style="text-align:end">{z(ok.e.mittel.m00, 2)}</td><td style="text-align:end">{z(ok.e.mittel.m01, 2)}</td><td style="text-align:end">{z(ok.e.mittel.m01 - ok.e.mittel.m00, 2)}</td></tr>
          <tr><th scope="row" style="text-align: start">{L(`Behandelte (n = ${ok.e.mittel.n10}; ${ok.e.mittel.n11})`, `Treated (n = ${ok.e.mittel.n10}; ${ok.e.mittel.n11})`)}</th><td style="text-align:end">{z(ok.e.mittel.m10, 2)}</td><td style="text-align:end">{z(ok.e.mittel.m11, 2)}</td><td style="text-align:end">{z(ok.e.mittel.m11 - ok.e.mittel.m10, 2)}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Differenz der Änderungen', 'Difference of the changes')}</th><td></td><td></td><td style="text-align:end"><b>{z(ok.e.didMittel, 2)}</b></td></tr>
        </tbody>
      </table></div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Regression auf „${wort(ok.ziel)}“ mit Wechselwirkung (die Zeile „×“ ist die Differenz-in-Differenzen)`, `Regression on “${wort(ok.ziel)}” with interaction (the “×” row is the difference-in-differences)`)}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Merkmal', 'Feature')}</th><th scope="col">b</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">p</th><th scope="col">{L('Standardfehler (robust)', 'Standard error (robust)')}</th><th scope="col">{L('p (robust)', 'p (robust)')}</th></tr></thead>
        <tbody>{#each ok.e.koef as c, i (c.name)}<tr><th scope="row" style="text-align: start">{i === 0 ? L('(Konstante)', '(Constant)') : c.name}</th><td style="text-align:end">{z(c.b, 2)}</td><td style="text-align:end">{z(c.se, 2)}</td><td style="text-align:end">{pw(c.p)}</td><td style="text-align:end">{z(c.seRobust, 2)}</td><td style="text-align:end">{pw(c.pR)}</td></tr>{/each}</tbody>
      </table></div>
      <div class="knopfzeile"><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Die Differenz-in-Differenzen deutet nur dann auf eine Wirkung der Maßnahme, wenn beide Gruppen ohne sie gleichlaufend weitergegangen wären. Das lässt sich mit einem Zeitpunkt vorher nicht prüfen; mit mehreren Zeitpunkten vorher würde man die Verläufe vergleichen. Auch dürfen die Gruppen nicht schon vorher auf die Maßnahme reagiert haben, und nichts anderes darf nur eine der beiden Gruppen getroffen haben. Die Standardfehler gelten für größere Stichproben; bei wenigen Gruppen oder wenigen behandelten Einheiten sind sie zu klein.', 'The difference-in-differences points to an effect of the measure only if both groups would have moved in parallel without it. That cannot be checked with one point in time before; with several points in time before one would compare the paths. The groups also must not have reacted to the measure beforehand, and nothing else may have hit only one of the two groups. The standard errors hold for larger samples; with few groups or few treated units they are too small.')}</p>
    {/if}
  </details>
{/if}

<style>
  .did-zeile { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); align-items: end; margin-block: var(--a2); }
  .did-zeile .eingabe { max-width: 340px; margin: 0; }
</style>
