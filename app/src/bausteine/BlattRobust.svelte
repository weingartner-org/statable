<script lang="ts" module>
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  export type RobustDaten = { art: 'gruppen'; gruppen: { name: string; werte: number[] }[] } | { art: 'gepaart'; vorher: string; nachher: string; paare: [number, number][] };
</script>
<script lang="ts">
  /** Ergebnis der Wahl „Robust (getrimmte Mittel)“ unter „Unterscheiden sich Gruppen?“ und „Hat sich etwas verändert?“ (Field-Stufe 3b).
   *  Zwei Gruppen: Yuen-Test; gepaart: Yuen-Test für gepaarte Werte; drei und mehr Gruppen: getrimmte Varianzanalyse (t1way) mit Paarvergleichen (lincon).
   *  Rechnet im Browser (lib/robust.ts), Trimmung am Blatt (`blatt.robustTr`, Standard 20 %). */
  import type { Blatt } from '../lib/sitzung.svelte';
  import { L, melde, sichern } from '../lib/sitzung.svelte';
  import { komma, pWert } from '../lib/ergebnis';
  import { lincon, t1way, TRIM_STANDARD, trimH, yuen, yuend, type RobustFehler } from '../lib/getrimmt';
  import { linconSatz, t1waySatz, trimErklaerung, trimText, wannRobust, yuendSatz, yuenSatz } from '../lib/getrimmtsaetze';
  import HilfeLink from './HilfeLink.svelte';

  let { blatt, daten }: { blatt: Blatt; daten: RobustDaten } = $props();
  const kennung = $props.id();
  const tr = $derived(Math.min(0.4, Math.max(0.05, (blatt.robustTr ?? TRIM_STANDARD * 100) / 100)));
  const STUFEN = [5, 10, 15, 20, 25, 30, 40];
  const fehlerText = (f: RobustFehler) => f.fehler === 'zu-wenig' ? L('Zu wenige Werte nach dem Trimmen (mindestens 2 je Gruppe nötig). Eine kleinere Trimmung wählen.', 'Too few values after trimming (at least 2 per group needed). Choose a smaller trimming.') : L('Nach dem Trimmen streuen die Werte nicht mehr. Eine kleinere Trimmung wählen.', 'After trimming the values no longer vary. Choose a smaller trimming.');
  const z2 = (v: number) => komma(v, 2);
  const pp = (p: number) => pWert(p).replace(/^= /, '');

  const gr = $derived(daten.art === 'gruppen' ? daten.gruppen : []);
  const zweiR = $derived(daten.art === 'gruppen' && gr.length === 2 ? yuen(gr[0]!.werte, gr[1]!.werte, tr) : null);
  const mehrR = $derived(daten.art === 'gruppen' && gr.length > 2 ? t1way(gr, tr) : null);
  const paareR = $derived(daten.art === 'gruppen' && gr.length > 2 ? lincon(gr, tr) : null);
  const gepaartR = $derived(daten.art === 'gepaart' ? yuend(daten.paare.map(p => p[0]), daten.paare.map(p => p[1]), tr) : null);
  const fehler = $derived([zweiR, mehrR, gepaartR].map(x => (x && 'fehler' in x ? x : null)).find(Boolean) ?? null);
  const zwei = $derived(zweiR && !('fehler' in zweiR) ? zweiR : null);
  const mehr = $derived(mehrR && !('fehler' in mehrR) ? mehrR : null);
  const paare = $derived(paareR && !('fehler' in paareR) ? paareR : null);
  const gepaart = $derived(gepaartR && !('fehler' in gepaartR) ? gepaartR : null);
  const nMin = $derived(daten.art === 'gruppen' ? Math.min(...gr.map(g => g.werte.length)) : daten.paare.length);
  const saetze = $derived.by(() => {
    if (zwei) return [yuenSatz(zwei, gr[0]!.name, gr[1]!.name)];
    if (gepaart && daten.art === 'gepaart') return [yuendSatz(gepaart, daten.vorher, daten.nachher)];
    if (mehr) return [t1waySatz(mehr), ...(paare ? paare.map(p => linconSatz(p, gr[p.i]!.name, gr[p.j]!.name)) : [])];
    return [];
  });
  function setze(v: number) { blatt.robustTr = v; void sichern(); melde(L(`Trimmung jetzt ${v} % je Seite.`, `Trimming now ${v}% per side.`)); }
</script>

<div role="region" aria-labelledby="rob-t-{kennung}" style="margin-top:var(--a3);padding-top:var(--a3);border-top:1px solid var(--linie-stark)">
  <h3 id="rob-t-{kennung}" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)" data-begriff="getrimmtes-mittel">{L('Robust (getrimmte Mittel)', 'Robust (trimmed means)')}</h3>
  <p style="color:var(--tinte-2)">{wannRobust()}</p>
  <div class="eingabe" style="max-width:320px;margin-top:var(--a2)"><label for="rob-tr-{kennung}">{L('Trimmung je Seite', 'Trimming per side')}</label>
    <select id="rob-tr-{kennung}" aria-describedby="rob-tr-h-{kennung}" onchange={(ev) => setze(Number(ev.currentTarget.value))}>{#each STUFEN as v (v)}<option value={v} selected={Math.round(tr * 100) === v}>{v} %{v === 20 ? ` (${L('Standard', 'default')})` : ''}</option>{/each}</select>
    <p id="rob-tr-h-{kennung}" class="hilfe">{trimErklaerung(tr, nMin)}</p></div>
  {#if fehler}
    <p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText(fehler)}</p>
  {:else}
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L(`Getrimmte Mittel (${trimText(tr)} je Seite)`, `Trimmed means (${trimText(tr)} per side)`)}</b></caption>
      <thead><tr><th scope="col">{L('Gruppe', 'Group')}</th><th scope="col">n</th><th scope="col">{L('Werte im Mittel', 'Values in the mean')}</th><th scope="col">{L('Getrimmtes Mittel', 'Trimmed mean')}</th></tr></thead>
      <tbody>
        {#if daten.art === 'gruppen'}
          {#each gr as g, i (i)}<tr><th scope="row" style="text-align: start">{g.name}</th><td style="text-align:right">{g.werte.length}</td><td style="text-align:right">{trimH(g.werte.length, tr)}</td><td style="text-align:right">{z2(zwei ? (i === 0 ? zwei.m1 : zwei.m2) : mehr ? mehr.gruppen[i]!.mittel : NaN)}</td></tr>{/each}
        {:else if gepaart}
          <tr><th scope="row" style="text-align: start">{daten.vorher}</th><td style="text-align:right">{gepaart.n}</td><td style="text-align:right">{trimH(gepaart.n, tr)}</td><td style="text-align:right">{z2(gepaart.m1)}</td></tr>
          <tr><th scope="row" style="text-align: start">{daten.nachher}</th><td style="text-align:right">{gepaart.n}</td><td style="text-align:right">{trimH(gepaart.n, tr)}</td><td style="text-align:right">{z2(gepaart.m2)}</td></tr>
        {/if}
      </tbody>
    </table></div>
    {#if zwei || gepaart}
      {@const y = (zwei ?? gepaart)!}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b data-begriff="yuen-test">{zwei ? L('Yuen-Test', 'Yuen test') : L('Yuen-Test für gepaarte Werte', 'Yuen test for paired values')}</b></caption>
        <thead><tr><th scope="col">{L('Differenz der getrimmten Mittel', 'Difference of the trimmed means')}</th><th scope="col">{L('95 %-Intervall', '95% interval')}</th><th scope="col">t</th><th scope="col">df</th><th scope="col">p</th></tr></thead>
        <tbody><tr><td style="text-align:right">{z2(y.diff)}</td><td style="text-align:right">[{z2(y.lo)}; {z2(y.hi)}]</td><td style="text-align:right">{z2(y.t)}</td><td style="text-align:right">{z2(y.df)}</td><td style="text-align:right">{pp(y.p)}</td></tr></tbody>
      </table></div>
    {:else if mehr}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b data-begriff="robuste-varianzanalyse">{L('Robuste Varianzanalyse (getrimmt)', 'Robust analysis of variance (trimmed)')}</b></caption>
        <thead><tr><th scope="col">F</th><th scope="col">df1</th><th scope="col">df2</th><th scope="col">p</th></tr></thead>
        <tbody><tr><td style="text-align:right">{z2(mehr.F)}</td><td style="text-align:right">{komma(mehr.df1, 0)}</td><td style="text-align:right">{z2(mehr.df2)}</td><td style="text-align:right">{pp(mehr.p)}</td></tr></tbody>
      </table></div>
      {#if paare}
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L('Paarvergleiche der getrimmten Mittel', 'Pairwise comparisons of the trimmed means')}</b></caption>
          <thead><tr><th scope="col">{L('Vergleich', 'Comparison')}</th><th scope="col">{L('Differenz', 'Difference')}</th><th scope="col">t</th><th scope="col">df</th><th scope="col">{L('p (roh)', 'p (raw)')}</th><th scope="col">{L('p (nach Hochberg)', 'p (Hochberg)')}</th></tr></thead>
          <tbody>{#each paare as p, k (k)}<tr><th scope="row" style="text-align: start">{gr[p.i]!.name} - {gr[p.j]!.name}</th><td style="text-align:right">{z2(p.psihat)}</td><td style="text-align:right">{z2(p.t)}</td><td style="text-align:right">{z2(p.df)}</td><td style="text-align:right">{pp(p.pRoh)}</td><td style="text-align:right">{pp(p.p)}</td></tr>{/each}</tbody>
        </table></div>
        <p class="hilfe">{L('Die p-Werte der Paarvergleiche sind wegen der Mehrfachprüfung nach Hochberg angepasst (wie in R, Paket WRS2). Konfidenzintervalle der Paarvergleiche fehlen hier.', 'The p values of the pairwise comparisons are adjusted for multiple testing by Hochberg (as in R, package WRS2). Confidence intervals of the pairwise comparisons are not shown here.')}</p>
      {/if}
    {/if}
    <p class="heft-text" use:ergebnisAnsage style="margin-top:var(--a2)">{saetze.join(' ')}</p>
    <p class="hilfe">{L('Statable rechnet das selbst, nach den Verfahren von Wilcox (R-Paket WRS2: yuen, yuend, t1way, lincon). Die Tabelle weiter oben zeigt unverändert den gewöhnlichen Test.', 'Statable calculates this itself, following the procedures of Wilcox (R package WRS2: yuen, yuend, t1way, lincon). The table further above still shows the ordinary test.')} <HilfeLink id="robuste-verfahren" text={L('Hilfe: Robuste Verfahren', 'Help: Robust procedures')} /></p>
  {/if}
</div>
