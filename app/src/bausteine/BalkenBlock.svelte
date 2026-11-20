<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { untrack, getContext } from 'svelte';
  import { ordneNach, reiheFuer } from '../lib/gestalt';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { s, L, Lp, d } from '../lib/sitzung.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { balkenQuelle, gruppenLabel, type BalkenQuelle } from '../lib/balkenquelle';
  import { balkenSatz, balkenHinweise, BALKEN_GRUPPEN_MAX, type GruppeKz } from '../lib/balken';
  import { gruppenRechnen } from '../lib/umfrage-gr-rechnen';
  import { umfrageRechnen } from '../lib/rverfahren.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import Gruppenmittel from './Gruppenmittel.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  /**
   * „Mittelwert nach Gruppe“ als Bild, 2 bis 12 Gruppen, auch ohne Test (Später S-F2, E): Punkte mit Mittelwert und 95-%-KI als Vorschlag, Säulen als Wahl (immer ab 0), kein Standardfehler allein.
   * Der Satz zu überlappenden Intervallen steht immer unter dem Bild. Fallgewicht: Häufigkeitsgewicht rechnet; Umfragegewicht zeigt Mittelwerte ohne Striche, mit „einzeln gezogen: Ja“ kommen die Striche aus R (survey).
   */
  let { yName, gName, name, titel = '', fest }: { yName: string; gName: string; name: (n: string) => string; titel?: string; /** Daten zur Zeit eines früheren Laufs (Befehle): dann keine Neuberechnung aus der Sitzung */ fest?: BalkenQuelle } = $props();
  const q = $derived(fest ?? balkenQuelle(yName, gName));
  let art = $state<'punkte' | 'saeulen'>('punkte'), fehler = $state<'ki' | 'se' | 'sd' | 'keine'>('ki'), einzel = $state(true), offen = $state(false);
  const id = $props.id();

  /* Umfragegewicht mit „Personen einzeln gezogen: Ja“: Mittelwerte und Intervalle aus dem Stichprobenplan (R, survey), wie im Gruppenvergleich. */
  let design = $state<GruppeKz[] | null>(null), designFehler = $state(false);
  const lad = new Laedt();
  let stand = 0;
  $effect(() => {
    const qq = q;
    if (fest || !qq.ok || qq.gewicht !== 'umfrage' || !qq.klumpenfrei || !qq.w) { design = null; designFehler = false; return; }
    const mein = ++stand, w = qq.w, roh = qq.gruppen;
    untrack(() => void lad.mit(async () => {
      try {
        const db = await gruppenRechnen(umfrageRechnen, yName, gName, w, s.zeilen, s.spalten, $state.snapshot(s.gewicht?.entwurf));   // der Stichprobenplan der Person (Abschnitt 6) geht über dieselbe Stelle wie bei allen Karten
        if (mein !== stand) return;
        const gr = (db.r.gruppen ?? []) as { code: number; n: number; mittel: number; se: number; df: number; kiU: number; kiO: number }[];
        if (db.r.fehlerCode || !gr.length) { design = null; designFehler = true; return; }
        design = gr.map(x => {
          const name2 = gruppenLabel(gName, db.gruppenWerte![x.code - 1]!), alt = roh.find(k => k.gruppe === name2);
          return { gruppe: name2, n: x.n, mittel: x.mittel, sd: null, se: x.se, df: x.df, kiU: x.kiU, kiO: x.kiO, min: alt?.min ?? x.mittel, max: alt?.max ?? x.mittel };
        });
        designFehler = false;
      } catch { if (mein === stand) { design = null; designFehler = true; } }
    }));
  });

  const gruppen = $derived(q.ok ? (design ?? q.gruppen) : []);
  /** Welche Striche gibt es wirklich? Umfragegewicht ohne Plan: keine; sonst die Wahl. */
  const fehlerEff = $derived<'ki' | 'se' | 'sd' | 'keine'>(q.ok && q.gewicht === 'umfrage' ? (design ? (fehler === 'sd' ? 'keine' : fehler) : 'keine') : fehler);
  const ytext = $derived(name(yName)), xtext = $derived(name(gName));
  const o = $derived({ art, fehler: fehlerEff, einzel, sw: false, titel: titel || L(`Mittelwert von ${ytext} nach ${xtext}`, `Mean of ${ytext} by ${xtext}`), y: ytext });
  const satz = $derived(balkenSatz({ art, fehler: fehlerEff }));
  const hinweise = $derived.by((): string[] => {
    if (!q.ok) return [];
    const aus = [...balkenHinweise(gruppen)];
    if (q.ausgelassen > 0) aus.push(Lp(q.ausgelassen, `${q.ausgelassen} Zeile ohne Wert, Gruppe oder Gewicht bleibt unberücksichtigt.`, `${q.ausgelassen} Zeilen ohne Wert, Gruppe oder Gewicht bleiben unberücksichtigt.`, `${q.ausgelassen} row without a value, group or weight is left out.`, `${q.ausgelassen} rows without a value, group or weight are left out.`));
    if (q.gewicht === 'haeufigkeit') aus.push(L('Mit Häufigkeitsgewicht zählt jede Zeile so oft, wie ihr Gewicht sagt: n ist die Summe der Gewichte, das Intervall rechnet damit wie bei wiederholten Zeilen.', 'With a frequency weight each row counts as often as its weight says: n is the sum of the weights, and the interval is calculated as for repeated rows.'));
    if (q.gewicht === 'umfrage' && !q.klumpenfrei) aus.push(L('Mit Umfragegewicht zeigt das Bild gewichtete Mittelwerte ohne Striche. Intervalle brauchen beim Fallgewicht die Angabe „Personen einzeln gezogen: Ja“ oder den Stichprobenplan.', 'With a survey weight the chart shows weighted means without whiskers. Intervals need the answer "people drawn individually: yes" or the sampling design in the case weight.'));
    if (q.gewicht === 'umfrage' && q.klumpenfrei && design) aus.push(L('Mittelwerte und Striche kommen aus dem Stichprobenplan (R, Paket survey); die Punkte zeigen die einzelnen Werte ohne Gewicht.', 'Means and whiskers come from the sampling design (R, package survey); the dots show the single values without weight.'));
    if (q.gewicht === 'umfrage' && q.klumpenfrei && designFehler) aus.push(L('Die Striche aus dem Stichprobenplan ließen sich nicht rechnen; das Bild zeigt die gewichteten Mittelwerte ohne Striche.', 'The whiskers from the sampling design could not be calculated; the chart shows the weighted means without whiskers.'));
    if (q.gekuerzt) aus.push(L('Die Punkte zeigen höchstens 500 Personen je Gruppe (eine feste Auswahl); Mittelwert und Intervall rechnen mit allen.', 'The dots show at most 500 people per group (a fixed selection); the mean and the interval use everyone.'));
    return aus;
  });
  const sperrText = (c: string, n?: number): string => c === 'zu-viele-gruppen' ? d(`Das Bild zeigt höchstens ${BALKEN_GRUPPEN_MAX} Gruppen; die Spalte ${xtext} hat ${n ?? '?'}. Fasse Gruppen zusammen oder wähle einen Ausschnitt.`, `Das Bild zeigt höchstens ${BALKEN_GRUPPEN_MAX} Gruppen; die Spalte ${xtext} hat ${n ?? '?'}. Fassen Sie Gruppen zusammen oder wählen Sie einen Ausschnitt.`, `The chart shows at most ${BALKEN_GRUPPEN_MAX} groups; the column ${xtext} has ${n ?? '?'}. Combine groups or choose a subset.`)
    : c === 'zu-wenig-gruppen' ? L('Für das Bild braucht es mindestens zwei Gruppen mit Werten.', 'The chart needs at least two groups with values.')
    : c === 'gewicht' ? L('Das Fallgewicht ist gerade nicht verwendbar; das Bild wartet darauf.', 'The case weight cannot be used at the moment; the chart waits for it.')
    : L('Es gibt keine gültigen Werte für das Bild.', 'There are no valid values for the chart.');
  /** Reihenfolge der Gruppen aus „Gestalten“ (S-G): dieselben Gruppen, andere Reihenfolge. */
  const holeBlatt = getContext<(() => Blatt | null) | undefined>('dgBlatt');
  const geordnet = $derived.by(() => { const namen = gruppen.map(g => g.gruppe), r = reiheFuer(holeBlatt?.()?.gestalt, namen); return r ? ordneNach(namen, r).map(n => gruppen.find(g => g.gruppe === n)!) : gruppen; });
</script>

<div class="balkenblock">
  {#if q.ok}
    <DiagrammExport titel={o.titel} kategorien={[{ label: L('Reihenfolge der Gruppen', 'Order of the groups'), namen: gruppen.map(g => g.gruppe), feld: 'reihe' }]}><Gruppenmittel gruppen={geordnet} punkte={q.punkte} {o} xText={xtext} /></DiagrammExport>
    {#if lad.sichtbar}<p class="hilfe" role="status"><Rechnet text={L('Intervalle aus dem Stichprobenplan werden gerechnet …', 'Intervals from the sampling design are being calculated …')} /></p>{/if}
    <p class="hilfe balken-satz" style="margin-top:var(--a2)">{satz}</p>
    {#if hinweise.length}<ul class="balken-hinweise" aria-label={L('Hinweise zum Bild', 'Notes on the chart')}>{#each hinweise as h}<li><Icon n="hinweis" k="hw" /><span>{h}</span></li>{/each}</ul>{/if}
    <div class="knopfzeile" style="margin-top:var(--a3)">
      <button class="k leise" type="button" aria-expanded={offen} aria-controls="{id}-form" onclick={() => (offen = !offen)}><Icon n="regler" />{offen ? L('Fertig', 'Done') : L('Bild anpassen', 'Adjust chart')}</button>
    </div>
    {#if offen}
      <form id="{id}-form" class="einstellungen klappt" onsubmit={(ev) => ev.preventDefault()} aria-label={L('Bild anpassen', 'Adjust chart')}>
        <div class="einst-gruppe" style="padding-top:0"><h3>{L('Art', 'Type')}</h3>
          <div class="segment" role="radiogroup" aria-label={L('Art', 'Type')}>{#each [['punkte', L('Punkte mit Mittelwert', 'Dots with mean')], ['saeulen', L('Säulen (ab 0)', 'Bars (from 0)')]] as [w, t]}<label data-begriff={w === 'saeulen' ? 'saeulendiagramm' : undefined}><input type="radio" name="{id}-art" value={w} checked={art === w} onchange={() => (art = w as 'punkte' | 'saeulen')}>{t}</label>{/each}</div>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{art === 'saeulen' ? L('Säulen verstecken, wie die Werte verteilt sind. Für Mittelwerte sind Punkte meist ehrlicher.', 'Bars hide how the values are spread out. For means, dots are usually more honest.') : L('Zeigt jede Person und den Mittelwert. Empfohlen.', 'Shows every person and the mean. Recommended.')}</p></div>
        <div class="einst-gruppe"><h3>{L('Striche um den Mittelwert', 'Whiskers around the mean')}</h3>
          <div class="segment" role="radiogroup" aria-label={L('Striche um den Mittelwert', 'Whiskers around the mean')}>{#each [['ki', L('95 %-KI', '95% CI')], ['se', L('Standardfehler', 'Standard error')], ['sd', L('Standardabweichung', 'Standard deviation')], ['keine', L('keine', 'none')]] as [w, t]}<label data-begriff={w === 'ki' ? 'konfidenzintervall' : w === 'se' ? 'standardfehler' : w === 'sd' ? 'standardabweichung' : undefined}><input type="radio" name="{id}-fehler" value={w} checked={fehler === w} onchange={() => (fehler = w as 'ki' | 'se' | 'sd' | 'keine')}>{t}</label>{/each}</div></div>
        {#if art === 'punkte'}<div class="einst-gruppe"><label class="schalter"><input type="checkbox" bind:checked={einzel}>{L('Einzelne Personen zeigen', 'Show individual people')}</label></div>{/if}
      </form>
    {/if}
    <p class="hilfe"><HilfeLink id="balken-mittelwerte" text={L('Hilfe: Mittelwerte nach Gruppe im Bild', 'Help: means by group in a chart')} /></p>
  {:else}
    <p class="hilfe" use:ergebnisAnsage>{sperrText(q.code, q.anzahl)}</p>
  {/if}
</div>

<style>
  .balken-hinweise { list-style: none; padding: 0; margin: var(--a3) 0 0; display: flex; flex-direction: column; gap: var(--a2); max-width: var(--breite-text); }
  .balken-hinweise li { display: flex; gap: var(--a2); align-items: flex-start; }
  .balken-hinweise :global(.ico) { flex: none; margin-top: 3px; }
</style>
