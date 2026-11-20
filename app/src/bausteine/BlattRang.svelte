<script lang="ts">
  import type { Blatt } from '../lib/sitzung.svelte';
  import { L, d, melde, sichern } from '../lib/sitzung.svelte';
  import type { RangErgebnis, RangVorschlag } from '../lib/rangtests';
  import { rangMitteText, rangTestName, rangVorschlagText } from '../lib/rangsaetze';
  import { istWeitere, type JtWahl, type WeitereArt } from '../lib/rangweitereblatt';
  import { weitereGeht, weitereMitteText } from '../lib/rangweiteresaetze';
  import { rangAnschalten } from '../lib/rangwahl';
  import HilfeLink from './HilfeLink.svelte';
  import BlattRobust, { type RobustDaten } from './BlattRobust.svelte';

  /** Wahl unter dem Ergebnis von „Unterscheiden sich Gruppen?“ und „Hat sich etwas verändert?“: Mittelwertvergleich (t-Test, Varianzanalyse) oder
   *  „Ohne Normalverteilung (Rangtest)“ (Mann-Whitney, Kruskal-Wallis, Wilcoxon). Die Wahl steht am Blatt (`blatt.rang`) und kommt mit der Projektdatei;
   *  fehlt sie (alte Projekte), gilt der Mittelwertvergleich. Statable schaltet nie von selbst um. Abschlusstest F5: Der Grund für einen Rangtest steht schon
   *  in der Prüfliste vor dem Rechnen; hier nennt der Satz denselben Grund (aus den aktuellen Daten, `vorschlag`) - kein „vorgeschlagen“ nach dem Ergebnis. */
  let { blatt, paired, rang, nachrechnen, vorschlag, grund = null, sperre = null, weitere = null, gruppenZahl = null, robustDaten = null }: { blatt: Blatt; paired: boolean | 'mw'; rang: RangErgebnis | null; nachrechnen: () => RangErgebnis | null; vorschlag: RangVorschlag | null; grund?: string | null; /** Satz, wenn das Blatt mit Fallgewicht gerechnet wurde: Rangtests zählen jede Zeile einmal und sind gesperrt */ sperre?: string | null;
    /** Welle S-B: rechnet einen der weiteren Rangtests aus den Daten (null: geht nicht); fehlt bei Messwiederholung */ weitere?: ((art: WeitereArt, opt?: JtWahl) => RangErgebnis | null) | null; /** Zahl der Gruppen (Gruppenvergleich), sonst null */ gruppenZahl?: number | null;
    /** Field-Stufe 3b: Daten für „Robust (getrimmte Mittel)“ (Yuen, getrimmte Varianzanalyse); fehlt bei Messwiederholung und mit Fallgewicht */ robustDaten?: RobustDaten | null } = $props();
  const kennung = $props.id();
  // Für Blätter ohne gespeicherten Rangtest (alte Projekte): aus den Daten rechnen, nur um Vorschlag und Möglichkeit zu zeigen.
  const r = $derived(rang ?? nachrechnen());
  const robustAn = $derived(!!blatt.robust && !!robustDaten);
  const an = $derived(!!blatt.rang && !!r && !robustAn);

  function waehle(neu: boolean) {
    if (neu) { rangAnschalten(blatt, rang, nachrechnen); return; }
    blatt.rang = false; blatt.robust = false; void sichern();
    melde(paired === 'mw' ? L('Jetzt: Varianzanalyse mit Messwiederholung.', 'Now: repeated-measures analysis of variance.') : paired ? L('Jetzt: t-Test für gepaarte Stichproben.', 'Now: paired-samples t test.') : L('Jetzt: Mittelwertvergleich.', 'Now: comparison of means.'));
  }

  function waehleRobust() {
    blatt.robust = true; blatt.rang = false; void sichern();
    melde(L('Jetzt: robuster Vergleich mit getrimmten Mitteln.', 'Now: robust comparison with trimmed means.'));
  }

  /* ---------- Welle S-B: weitere Rangtests (Vorzeichen, Median, Jonckheere-Terpstra, Kolmogorov-Smirnov) in derselben Wahl ---------- */
  /** Welche weiteren Rangtests passen zu dieser Frage? Vorher-Nachher: Vorzeichentest; Gruppen: Mediantest (ab 2), Jonckheere-Terpstra (ab 3), Kolmogorov-Smirnov (genau 2). */
  const optionen = $derived<WeitereArt[]>(!weitere || paired === 'mw' ? [] : paired ? ['vorzeichen'] : gruppenZahl === null ? [] : [...(['median', 'jt', 'ks'] as WeitereArt[]).filter(a => weitereGeht(a, gruppenZahl) === null)]);
  const arten: Record<WeitereArt, () => string> = {
    vorzeichen: () => L('Vorzeichentest', 'Sign test'), median: () => L('Mediantest', 'Median test'), jt: () => 'Jonckheere-Terpstra', ks: () => L('Kolmogorov-Smirnov (zwei Stichproben)', 'Kolmogorov-Smirnov (two samples)')
  };
  const standardName = $derived(paired === true ? 'Wilcoxon' : gruppenZahl === 2 ? 'Mann-Whitney' : 'Kruskal-Wallis');
  const art = $derived<WeitereArt | ''>(blatt.rangArt && optionen.includes(blatt.rangArt) ? blatt.rangArt : '');
  const wahlJt = $derived<JtWahl>({ umkehren: !!blatt.rangOpt?.umkehren, seite: blatt.rangOpt?.seite ?? 'zwei' });
  function waehleArt(neu: WeitereArt | '', opt: JtWahl = wahlJt) {
    const x = neu ? weitere?.(neu, opt) ?? null : nachrechnen();
    if (!x) { melde(L('Dieser Rangtest lässt sich mit diesen Daten nicht rechnen.', 'This rank test cannot be calculated with these data.')); return; }
    blatt.ergebnis = { ...(blatt.ergebnis as object), rang: x };
    blatt.rangArt = neu || undefined; blatt.rangOpt = neu === 'jt' ? { umkehren: !!opt.umkehren, seite: opt.seite ?? 'zwei' } : undefined; void sichern();
    melde(L(`Jetzt: ${rangTestName(x)} (ohne Normalverteilung).`, `Now: ${rangTestName(x)} (no normal distribution).`));
  }
</script>

{#if sperre}
<div class="korr-wahl rang-wahl" style="margin-top:var(--a4)"><h3 style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Annahme einer Normalverteilung', 'Assumption of a normal distribution')}</h3><p style="color:var(--tinte-2)">{sperre}</p></div>
{:else}
<div class="korr-wahl rang-wahl" role="radiogroup" aria-labelledby="rang-t-{kennung}" style="margin-top:var(--a4)">
  <h3 id="rang-t-{kennung}" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Annahme einer Normalverteilung', 'Assumption of a normal distribution')}</h3>
  <div class="segment">
    <label><input type="radio" name="rang-{kennung}" value="mittel" checked={!an && !robustAn} onchange={() => waehle(false)}>{paired === 'mw' ? L('Varianzanalyse (Mittelwerte)', 'Analysis of variance (means)') : paired ? L('t-Test (Mittelwerte)', 't test (means)') : L('Mittelwerte (t-Test, Varianzanalyse)', 'Means (t test, analysis of variance)')}</label>
    <label data-begriff="rangtest"><input type="radio" name="rang-{kennung}" value="rang" checked={an} disabled={!r} onchange={() => waehle(true)}>{L('Ohne Normalverteilung (Rangtest)', 'No normal distribution (rank test)')}</label>
    {#if robustDaten}<label data-begriff="getrimmtes-mittel"><input type="radio" name="rang-{kennung}" value="robust" checked={robustAn} onchange={waehleRobust}>{L('Robust (getrimmte Mittel)', 'Robust (trimmed means)')}</label>{/if}
  </div>
  {#if r && !robustAn}
    <p style="color:var(--tinte-2);margin-top:var(--a2)">{rangVorschlagText(vorschlag ?? r.vorschlag, paired)}</p>
    {#if an}<p style="color:var(--tinte-2);margin-top:var(--a2)">{r && istWeitere(r) ? weitereMitteText(r) : rangMitteText(paired)}</p>{/if}
    {#if an && optionen.length}
      <div class="eingabe" style="max-width:420px;margin-top:var(--a3)"><label for="rang-art-{kennung}">{L('Welcher Rangtest?', 'Which rank test?')}</label>
        <select id="rang-art-{kennung}" aria-describedby="rang-art-h-{kennung}" onchange={(ev) => waehleArt(ev.currentTarget.value as WeitereArt | '')}>
          <option value="" selected={art === ''}>{standardName} ({L('Standard', 'default')})</option>
          <optgroup label={L('Weitere Rangtests', 'More rank tests')}>{#each optionen as a (a)}<option data-begriff={a === 'vorzeichen' ? 'vorzeichentest' : a === 'median' ? 'mediantest' : a === 'jt' ? 'jonckheere' : 'kolmogorov-smirnov'} value={a} selected={art === a}>{arten[a]()}</option>{/each}</optgroup>
        </select>
        <p id="rang-art-h-{kennung}" class="hilfe">{art === 'vorzeichen' ? d('Der Vorzeichentest zählt nur die Richtung der Veränderung. Er ist schwächer als Wilcoxon, braucht aber nichts über die Größe der Veränderung. SPSS rechnet ab 25 Paaren mit einer Näherung; Statable rechnet immer exakt.', 'Der Vorzeichentest zählt nur die Richtung der Veränderung. Er ist schwächer als Wilcoxon, braucht aber nichts über die Größe der Veränderung. SPSS rechnet ab 25 Paaren mit einer Näherung; Statable rechnet immer exakt.', 'The sign test counts only the direction of the change. It is weaker than Wilcoxon but needs nothing about the size of the change. SPSS uses an approximation from 25 pairs; Statable always calculates exactly.')
          : art === 'median' ? L('Der Mediantest hat bei vielen Werten genau auf dem Median wenig Aussagekraft; bei Likert-Daten ist Kruskal-Wallis meist besser. Bei zwei Gruppen ist das maßgebliche p der exakte Test nach Fisher.', 'The median test has little power when many values lie exactly on the median; for Likert data Kruskal-Wallis is usually better. With two groups the main p is the exact Fisher test.')
          : art === 'jt' ? d('Jonckheere-Terpstra passt, wenn du vorab eine Richtung begründen kannst (zum Beispiel Klasse 5 < 6 < 7). Ohne begründete Reihenfolge nimm Kruskal-Wallis.', 'Jonckheere-Terpstra passt, wenn Sie vorab eine Richtung begründen können (zum Beispiel Klasse 5 < 6 < 7). Ohne begründete Reihenfolge nehmen Sie Kruskal-Wallis.', 'Jonckheere-Terpstra fits when you can justify a direction in advance (for example grade 5 < 6 < 7). Without a justified order use Kruskal-Wallis.')
          : art === 'ks' ? L('Kolmogorov-Smirnov reagiert auf jeden Unterschied der Verteilungen, nicht nur auf die Lage; gegenüber einer reinen Verschiebung ist Mann-Whitney schärfer.', 'Kolmogorov-Smirnov reacts to any difference between the distributions, not just to location; against a pure shift Mann-Whitney is sharper.')
          : L('Die weiteren Rangtests prüfen andere Fragen als der Standard; Statable wechselt nie von selbst.', 'The other rank tests ask different questions than the default; Statable never switches by itself.')}
          {' '}<HilfeLink id="rangtests-weitere" text={L('Hilfe: Weitere Rangtests', 'Help: More rank tests')} /></p>
      </div>
      {#if art === 'jt'}
        <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Reihenfolge und Alternative', 'Order and alternative')}</legend>
          <label class="schalter"><input type="checkbox" checked={!!wahlJt.umkehren} onchange={(ev) => waehleArt('jt', { ...wahlJt, umkehren: ev.currentTarget.checked })}>{L('Reihenfolge der Gruppen umkehren', 'Reverse the order of the groups')}</label>
          <div class="segment" role="radiogroup" aria-label={L('Alternative', 'Alternative')} style="margin-top:var(--a2)">{#each [['zwei', L('zweiseitig (wie SPSS)', 'two-sided (as SPSS)')], ['steigt', L('einseitig: steigt', 'one-sided: rises')], ['faellt', L('einseitig: fällt', 'one-sided: falls')]] as [w, tx] (w)}<label data-begriff="einseitig-zweiseitig"><input type="radio" name="jt-seite-{kennung}" value={w} checked={wahlJt.seite === w} onchange={() => waehleArt('jt', { ...wahlJt, seite: w as 'zwei' | 'steigt' | 'faellt' })}>{tx}</label>{/each}</div>
          <p class="hilfe">{d('Lege die Richtung fest, bevor du das Ergebnis siehst. „Steigt“ heißt: Die Werte werden mit der Reihenfolge der Gruppen größer (die Reihenfolge steht im Ergebnis).', 'Legen Sie die Richtung fest, bevor Sie das Ergebnis sehen. „Steigt“ heißt: Die Werte werden mit der Reihenfolge der Gruppen größer (die Reihenfolge steht im Ergebnis).', 'Fix the direction before you see the result. "Rises" means: the values get larger with the order of the groups (the order is shown in the result).')}</p>
        </fieldset>
      {/if}
    {/if}
  {:else if !robustAn}
    <p style="color:var(--tinte-2);margin-top:var(--a2)">{grund ?? L('Der Rangtest lässt sich mit diesen Daten nicht rechnen (zu wenige Werte oder keine Unterschiede).', 'The rank test cannot be calculated with these data (too few values or no differences).')}</p>
  {/if}
  {#if robustAn && robustDaten}<BlattRobust {blatt} daten={robustDaten} />{/if}
</div>
{/if}
