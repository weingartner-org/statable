<script lang="ts">
  import HilfeLink from './HilfeLink.svelte';
  import { untrack } from 'svelte';
  import { L, d, melde, sichern } from '../lib/sitzung.svelte';
  import { verzoegert } from '../lib/laedt.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { gewichtStatus, sperrSatz } from '../lib/gewichte';
  import { stellenTitel } from '../lib/gewichtkarten';
  import { zitat } from '../i18n/profil';
  import {
    NORMAL_MIN_N, ausreisserHinweis, boxCoxAsync, referenzBoxCox, referenzNormal, referenzRang, satzReferenzRang, referenzHinweis,
    type BoxCox, type BoxCoxErgebnis, type NormalErgebnis, type RangErgebnis
  } from '../lib/referenzbereich';
  import {
    ausreisserHinweisSaetze, begriffeSatz, boxCoxFehlerSatz, gruppenSatz, lambdaSatz, nichtNormalSatz, rangHinweisSaetze, regelSatz, satzReferenzBoxCox, satzReferenzNormal, tabelleReferenz, type BereichZeile
  } from '../lib/referenzsaetze';
  import { BOXCOX_MAX_N, gruppenKandidaten, gruppenNamen, leereReferenz, spalteGilt, zahlenSpalten, zahlenWerte, type ReferenzWahl } from '../lib/verteilungwege';
  import Ausgabe from './Ausgabe.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * „Referenzbereich bestimmen“ unter dem Ergebnis von „Wie verteilt sich etwas?“ (Später, Welle S-D, M7): der Bereich, in dem die mittleren 95 % der Referenzpersonen liegen (2,5. bis 97,5. Perzentil),
   * mit dem 90-%-Konfidenzintervall der beiden Grenzen. Rangmethode (Typ 6; Intervall ab n = 119) oder Normalverteilung mit exaktem Intervall, auf Wunsch nach Box-Cox mit λ und Intervall - nie still transformiert.
   * Rechnet in JavaScript aus den Zahlenspalten; die Wahl gehört zum Blatt (`blatt.weg.referenz`). Mit einem Fallgewicht ist die Option gesperrt (eine Referenzperson zählt einmal).
   */
  let { blatt }: { blatt: Blatt } = $props();
  const kennung = $props.id();

  const spalten = $derived(zahlenSpalten(blatt));
  const wahl = $derived<ReferenzWahl>({ ...leereReferenz(), ...(blatt.weg?.referenz ?? {}) });
  const spalte = $derived(spalteGilt(wahl, spalten));
  const label = $derived(spalten.find(x => x.name === spalte)?.label ?? spalte);
  const gesperrt = $derived(!!blatt.gewicht && gewichtStatus('referenz:alle', blatt.gewicht.art) === 'sperren');
  const gruppenOpt = $derived(wahl.an ? gruppenKandidaten(spalte) : []);
  const gruppe = $derived(gruppenOpt.some(g => g.name === wahl.gruppe) ? wahl.gruppe : '');

  function setze(neu: Partial<ReferenzWahl>, satz?: string) {
    blatt.weg = { ...blatt.weg, referenz: { ...wahl, spalte, gruppe, ...neu } };
    void sichern();
    if (satz) melde(satz);
  }

  interface Teil { name?: string; n: number; rang: RangErgebnis; normal: NormalErgebnis; bc: BoxCoxErgebnis | { fehler: 'nicht-positiv' | 'n-zu-klein' } | null; bcInfo: BoxCox | null; zeilen: BereichZeile }
  interface Grund { name?: string; n: number; rang: RangErgebnis; normal: NormalErgebnis; ok: number[] }
  /** Die schnelle Rechnung (Rangmethode und Normalverteilung): eine Gruppe oder alle Werte zusammen. */
  const grundTeile = $derived.by((): Grund[] | null => {
    if (!wahl.an || gesperrt || !spalte) return null;
    const x = zahlenWerte(spalte);
    const paare: [string | undefined, (number | null)[]][] = [];
    if (gruppe) {
      const namen = gruppenNamen(gruppe), reihenfolge: string[] = [], je = new Map<string, (number | null)[]>();
      x.forEach((v, i) => { const g = namen[i] ?? ''; if (g === '') return; if (!je.has(g)) { reihenfolge.push(g); je.set(g, []); } je.get(g)!.push(v); });
      for (const g of reihenfolge) paare.push([g, je.get(g)!]);
    } else paare.push([undefined, x]);
    return paare.map(([name, w]) => { const rang = referenzRang(w); return { name, n: rang.n, rang, normal: referenzNormal(w), ok: w.filter((v): v is number => v !== null) }; });
  });

  /** Box-Cox braucht viele Durchgänge über alle Werte: Es rechnet in Häppchen (lib/referenzbereich.ts `boxCoxAsync`), die Lade-Animation läuft, und ein neuer Wunsch löst den alten ab. */
  const bcAn = $derived(wahl.methode === 'normal' && wahl.boxcox);
  const bcSchluessel = $derived(bcAn && grundTeile ? JSON.stringify([spalte, gruppe, wahl.lambda, grundTeile.map(g => [g.n, g.ok.reduce((a, b) => a + b, 0)])]) : '');
  interface BcStand { schluessel: string; liste: { bc: Teil['bc']; bcInfo: BoxCox | null }[] }
  let bcStand = $state<BcStand | null>(null);
  let lauf = 0;
  const bcBereit = $derived(!bcAn || (!!bcSchluessel && bcStand?.schluessel === bcSchluessel));
  const bcAnimation = verzoegert(() => bcAn && !bcBereit);
  $effect(() => {
    const k = bcSchluessel;
    untrack(() => {
      if (!k) { lauf++; return; }
      if (bcStand?.schluessel === k) return;
      const mein = ++lauf, gt = grundTeile!, art = wahl.lambda;
      void (async () => {
        const liste: BcStand['liste'] = [];
        for (const g of gt) {
          if (g.n > BOXCOX_MAX_N) { liste.push({ bc: null, bcInfo: null }); continue; }
          const info = await boxCoxAsync(g.ok, () => mein === lauf);
          if (info === null || mein !== lauf) return;            // ein neuer Wunsch hat übernommen
          if ('fehler' in info) { liste.push({ bc: { fehler: 'nicht-positiv' }, bcInfo: null }); continue; }
          await new Promise<void>(r => setTimeout(r, 0));
          if (mein !== lauf) return;
          liste.push({ bc: referenzBoxCox(g.ok, art === 'null' ? 0 : art === 'halb' ? 0.5 : info.lambda), bcInfo: info });
        }
        bcStand = { schluessel: k, liste };
      })();
    });
  });
  /** Die ganze Rechnung mit Zeilen für die Tabelle; mit Box-Cox erst, wenn es fertig ist. */
  const teile = $derived.by((): Teil[] | null => {
    if (!grundTeile) return null;
    return grundTeile.map((g, i) => {
      const { name, n, rang, normal } = g, b = bcAn && bcBereit ? bcStand!.liste[i] ?? { bc: null, bcInfo: null } : { bc: null, bcInfo: null }, bc = b.bc, bcInfo = b.bcInfo;
      const art: BereichZeile['art'] = wahl.methode === 'rang' ? 'rang' : bc && !('fehler' in bc) ? 'boxcox' : 'normal';
      const zeilen: BereichZeile = art === 'rang'
        ? { gruppe: name, art, n, unten: rang.unten, oben: rang.oben, kiUnten: rang.ki?.unten ?? null, kiOben: rang.ki?.oben ?? null }
        : art === 'boxcox' ? { gruppe: name, art, n, unten: (bc as BoxCoxErgebnis).unten.orig, oben: (bc as BoxCoxErgebnis).oben.orig, kiUnten: (bc as BoxCoxErgebnis).unten.origKi, kiOben: (bc as BoxCoxErgebnis).oben.origKi }
        : { gruppe: name, art, n, unten: normal.fehler ? null : normal.unten, oben: normal.fehler ? null : normal.oben, kiUnten: normal.fehler ? null : normal.kiUnten, kiOben: normal.fehler ? null : normal.kiOben };
      return { name, n, rang, normal, bc, bcInfo, zeilen };
    });
  });
  const tabelle = $derived(teile ? tabelleReferenz(teile.map(t => t.zeilen), label, wahl.einheit.trim()) : null);
  const grosseSpalte = $derived(!!teile && teile.some(t => t.n > BOXCOX_MAX_N));

  /** Ausreißer-Hinweis (nur Hinweis, nie entfernt): über alle Werte der Spalte, mit der Zeilennummer der Daten. */
  const hinweis = $derived.by(() => {
    if (!wahl.an || gesperrt || !spalte) return null;
    const x = zahlenWerte(spalte), zeilen = x.flatMap((v, i) => (v === null ? [] : [i + 1])), ok = x.filter((v): v is number => v !== null);
    if (ok.length < 4) return null;
    const lam = wahl.methode === 'normal' && wahl.boxcox ? (teile?.[0]?.bc && !('fehler' in teile[0].bc) ? teile[0].bc.lambda : undefined) : undefined;
    const h = ausreisserHinweis(ok, lam === undefined ? {} : { lambda: lam });
    return { ...h, tukey: { unten: h.tukey.unten.map(i => zeilen[i - 1]!), oben: h.tukey.oben.map(i => zeilen[i - 1]!) } };
  });
  const satzTeil = (t: Teil): string => {
    const u = wahl.einheit.trim();
    if (wahl.methode === 'rang') return satzReferenzRang(t.rang, u);
    if (t.bc && !('fehler' in t.bc)) return satzReferenzBoxCox(t.bc, t.n, u);
    return satzReferenzNormal(t.normal, u);
  };
</script>

<details class="auf" style="margin-top:var(--a4)" open={wahl.an}><summary>{L('Weitere Wege: Referenzbereich bestimmen', 'More options: determine a reference range')}</summary>
  <p class="hilfe"><HilfeLink id="referenzbereich" text={L('Hilfe: Referenzbereich', 'Help: reference range')} /></p>
  <p class="heft-text" style="margin:var(--a2) 0">{d('Hier bestimmst du aus den Werten von Referenzpersonen den Bereich, in dem 95 % von ihnen liegen (2,5. bis 97,5. Perzentil), und siehst, wie genau die beiden Grenzen bestimmt sind. Das ist etwas anderes als ein Normwert oder ein Konfidenzintervall des Mittelwerts.',
    'Hier bestimmen Sie aus den Werten von Referenzpersonen den Bereich, in dem 95 % von ihnen liegen (2,5. bis 97,5. Perzentil), und sehen, wie genau die beiden Grenzen bestimmt sind. Das ist etwas anderes als ein Normwert oder ein Konfidenzintervall des Mittelwerts.',
    'Here you determine, from the values of reference individuals, the range in which 95% of them lie (2.5th to 97.5th percentile), and see how precisely the two limits are determined. This is different from a norm value or a confidence interval of the mean.')}</p>
  {#if !spalten.length}
    <p class="heft-text">{L('Dieses Blatt hat keine Zahlenspalte, aus der sich ein Referenzbereich bestimmen ließe.', 'This page has no number column from which a reference range could be determined.')}</p>
  {:else}
    <label class="schalter"><input type="checkbox" checked={wahl.an} onchange={(ev) => setze({ an: ev.currentTarget.checked }, ev.currentTarget.checked ? L('Referenzbereich wird bestimmt.', 'Reference range is being determined.') : L('Referenzbereich ausgeblendet.', 'Reference range hidden.'))}>{L('Referenzbereich bestimmen', 'Determine a reference range')}</label>
    {#if wahl.an}
      <p class="hilfe" role="note">{referenzHinweis()}</p>
      {#if gesperrt && blatt.gewicht}
        <p class="heft-text" style="margin-top:var(--a3)" role="alert">{sperrSatz('referenz:alle', blatt.gewicht, stellenTitel('referenz:alle'))}</p>
      {:else}
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:var(--a3);margin-top:var(--a3)">
          {#if spalten.length > 1}
            <div class="eingabe"><label for="ref-sp-{kennung}">{L('Welche Spalte?', 'Which column?')}</label>
              <select id="ref-sp-{kennung}" value={spalte} onchange={(ev) => setze({ spalte: ev.currentTarget.value, gruppe: '' })}>{#each spalten as sp (sp.name)}<option value={sp.name}>{sp.label}</option>{/each}</select></div>
          {/if}
          <div class="eingabe"><label for="ref-gr-{kennung}">{L('Getrennte Bereiche nach (freiwillig)', 'Separate ranges by (optional)')}</label>
            <select id="ref-gr-{kennung}" value={gruppe} onchange={(ev) => setze({ gruppe: ev.currentTarget.value })}><option value="">{L('keine Gruppen', 'no groups')}</option>{#each gruppenOpt as g (g.name)}<option value={g.name}>{g.label}</option>{/each}</select></div>
          <div class="eingabe"><label for="ref-ei-{kennung}">{L('Einheit (freiwillig)', 'Unit (optional)')}</label>
            <input id="ref-ei-{kennung}" type="text" autocomplete="off" spellcheck="false" style="max-width:12ch" value={wahl.einheit} onchange={(ev) => setze({ einheit: ev.currentTarget.value })}></div>
        </div>
        <div class="segment" role="radiogroup" aria-label={L('Verfahren', 'Method')} style="margin-top:var(--a3)">
          <label><input type="radio" name="ref-m-{kennung}" value="rang" checked={wahl.methode === 'rang'} onchange={() => setze({ methode: 'rang' })}>{L('Rangmethode (Voreinstellung)', 'Rank method (default)')}</label>
          <label data-begriff="normalverteilung"><input type="radio" name="ref-m-{kennung}" value="normal" checked={wahl.methode === 'normal'} onchange={() => setze({ methode: 'normal' })}>{L('Normalverteilung', 'Normal distribution')}</label>
        </div>
        <p class="hilfe" style="margin-top:var(--a2)">{wahl.methode === 'rang'
          ? L('Die Rangmethode braucht keine Annahme über die Verteilung. Das Konfidenzintervall der Grenzen gibt es erst ab 119 Werten, die Punktschätzung ab 39.', 'The rank method needs no assumption about the distribution. The confidence interval of the limits exists only from 119 values, the point estimate from 39.')
          : L(`Die Normalverteilung braucht mindestens ${NORMAL_MIN_N} Werte und eine Verteilung, die annähernd normal ist. Das Konfidenzintervall wird exakt berechnet.`, `The normal distribution needs at least ${NORMAL_MIN_N} values and a distribution that is approximately normal. The confidence interval is calculated exactly.`)}</p>
        {#if wahl.methode === 'normal'}
          <label class="schalter" style="margin-top:var(--a2)"><input type="checkbox" checked={wahl.boxcox} onchange={(ev) => setze({ boxcox: ev.currentTarget.checked })} aria-describedby="ref-bc-h-{kennung}">{L('Vorher nach Box-Cox transformieren', 'Transform with Box-Cox first')}</label>
          <p id="ref-bc-h-{kennung}" class="hilfe">{L('Für schiefe Werte, die nur positiv sind. Statable zeigt den Exponenten λ mit seinem Intervall und transformiert nie, ohne es zu sagen.', 'For skewed values that are all positive. Statable shows the exponent λ with its interval and never transforms without saying so.')}</p>
          {#if wahl.boxcox}
            <div class="segment" role="radiogroup" aria-label={L('Wert von λ', 'Value of λ')} style="margin-top:var(--a2)">
              <label><input type="radio" name="ref-l-{kennung}" value="schaetzung" checked={wahl.lambda === 'schaetzung'} onchange={() => setze({ lambda: 'schaetzung' })}>{L('λ aus den Daten schätzen', 'Estimate λ from the data')}</label>
              <label data-begriff="logarithmus"><input type="radio" name="ref-l-{kennung}" value="null" checked={wahl.lambda === 'null'} onchange={() => setze({ lambda: 'null' })}>{L('Logarithmus (λ = 0)', 'Logarithm (λ = 0)')}</label>
              <label><input type="radio" name="ref-l-{kennung}" value="halb" checked={wahl.lambda === 'halb'} onchange={() => setze({ lambda: 'halb' })}>{L('Wurzel (λ = ,5)', 'Square root (λ = .5)')}</label>
            </div>
            {#if grosseSpalte}<p class="hilfe" role="note">{L(`Mit mehr als ${BOXCOX_MAX_N} Werten rechnet Statable Box-Cox nicht; es gilt die Normalverteilung ohne Transformation.`, `With more than ${BOXCOX_MAX_N} values Statable does not calculate Box-Cox; the normal distribution without transformation applies.`)}</p>{/if}
          {/if}
        {/if}

        {#if bcAn && !bcBereit}
          {#if bcAnimation.an}<p class="heft-text" style="margin-top:var(--a4)" role="status"><Rechnet text={L('Box-Cox wird gerechnet …', 'Box-Cox is being calculated …')} /></p>{/if}
        {:else if teile && tabelle}
          {#each teile as t, i (t.name ?? i)}
            <div style="margin:var(--a4) 0 0">
              {#if t.name !== undefined}<h3 style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L(`Gruppe ${zitat(t.name)}`, `Group ${zitat(t.name)}`)}</h3>{/if}
              <p class="ergebnis-satz">{satzTeil(t)}</p>
              {#if wahl.methode === 'rang'}
                {#each rangHinweisSaetze(t.rang) as h (h)}<p class="heft-text" style="margin-top:var(--a2)">{h}</p>{/each}
              {:else}
                {#if t.normal.fehler && !(t.bc && !('fehler' in t.bc))}<p class="heft-text" style="margin-top:var(--a2)">{satzReferenzNormal(t.normal, wahl.einheit.trim())}</p>{/if}
                {#if t.normal.hinweise.includes('nicht-normal') && !(t.bc && !('fehler' in t.bc))}<p class="heft-text" style="margin-top:var(--a2)" role="note">{nichtNormalSatz(t.normal.shapiroP)}</p>{/if}
                {#if t.bc && 'fehler' in t.bc}<p class="heft-text" style="margin-top:var(--a2)" role="note">{boxCoxFehlerSatz(t.bc.fehler)}</p>{/if}
                {#if t.bc && !('fehler' in t.bc) && t.bcInfo}<p class="heft-text" style="margin-top:var(--a2)">{lambdaSatz(t.bcInfo, t.bc.lambda)}</p>{/if}
              {/if}
            </div>
          {/each}
          <div style="margin-top:var(--a3)"><Ausgabe items={[tabelle]} nurTabellen /></div>
          <p class="hilfe" style="margin-top:var(--a2)">{regelSatz()}</p>
          <p class="hilfe">{begriffeSatz()}</p>
          {#if gruppe}<p class="hilfe">{gruppenSatz()}</p>{/if}
          {#if hinweis}
            <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a4) 0 var(--a2)">{L('Auffällige Werte (nur ein Hinweis)', 'Conspicuous values (only a hint)')}</h3>
            {#each ausreisserHinweisSaetze(hinweis) as h (h)}<p class="heft-text" style="margin-top:var(--a2)">{h}</p>{/each}
          {/if}
        {/if}
      {/if}
    {/if}
  {/if}
</details>
