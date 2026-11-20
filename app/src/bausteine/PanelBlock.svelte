<script lang="ts">
  /**
   * B2 Teil 1b: „Gleiche Einheiten über die Zeit? (Paneldaten, feste und zufällige Effekte)“ unter der Regression („Lässt sich etwas vorhersagen?“, Gruppe „Anders rechnen“).
   * Eigene Daten: Gruppenkennung (Firma, Person, Land …), Ziel (Zahl) und Zahlen-Merkmale. Rechnet im Browser (lib/panelblock.ts, Kern lib/panel.ts), erst auf Klick.
   * Eine Tabelle für alle Modelle, dazu F-Test und Hausman-Test als Sätze; R-Skript in Basis-R. Beschreibend, ohne Deutung.
   * Fachblatt docs/ausbau/FACHBLATT-B2-OEKONOMETRIE.md, Abschnitt Teil 1b.
   */
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';
  import { s, L, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { komma, ohneNull } from '../lib/ergebnis';
  import { herunterladen, heute } from '../lib/export';
  import { rSkriptZip } from '../lib/rskript';
  import { PANEL_MAX, PANEL_WENIG_GRUPPEN, bauePanelSkript, panelBlockRechne, panelDaten, type PanelBlockFehler } from '../lib/panelblock';
  import type { Koef, PanelErgebnis } from '../lib/panel';

  const kennung = $props.id();
  const nm = (c: { name: string; bezeichnung: string }) => c.bezeichnung.trim() || c.name;
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  const gruppenKandidaten = $derived(s.spalten.filter(c => c.art !== 'datum'));
  let gruppe = $state(''), ziel = $state(''), merkmale = $state<string[]>([]), laeuft = $state(false);
  let res = $state<{ e: PanelErgebnis; gruppe: string; ziel: string; merkmale: string[]; weg: number } | PanelBlockFehler | null>(null);
  $effect(() => { void gruppe; void ziel; void merkmale.join('|'); res = null; });
  const merkmalKandidaten = $derived(zahlen.filter(c => c.name !== ziel && c.name !== gruppe));
  $effect(() => { const gut = merkmale.filter(n => n !== ziel && n !== gruppe && zahlen.some(c => c.name === n)); if (gut.length !== merkmale.length) merkmale = gut; });
  const umschalten = (n: string, an: boolean) => { merkmale = an ? [...merkmale, n] : merkmale.filter(x => x !== n); };
  const wort = (n: string) => { const c = s.spalten.find(x => x.name === n); return c ? nm(c) : n; };

  async function rechnen() {
    if (laeuft || !gruppe || !ziel || !merkmale.length) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    const d = panelDaten(s.spalten, s.zeilen, gruppe, ziel, merkmale);
    if ('fehler' in d) res = d;
    else { const e = panelBlockRechne(d); res = 'fehler' in e ? e : { e, gruppe, ziel, merkmale: [...merkmale], weg: d.weg }; }
    laeuft = false;
    sage(res && 'fehler' in res ? fehlerText(res) : L('Panel gerechnet.', 'Panel calculated.'), res && 'fehler' in res ? 'dringend' : undefined);
  }
  const fehlerText = (f: PanelBlockFehler) => f.fehler === 'keine-merkmale' ? L('Bitte Gruppenkennung, Ziel und mindestens ein Merkmal wählen.', 'Please choose the group identifier, the outcome and at least one feature.')
    : f.fehler === 'zu-viele-faelle' ? L(`Mehr als ${komma(PANEL_MAX, 0)} Fälle mit allen Angaben: Das rechnet der Browser zu lange. Bitte vorher Fälle auswählen (Daten → Fälle auswählen).`, `More than ${komma(PANEL_MAX, 0)} cases with all answers: that takes the browser too long. Please select cases first (Data → Select cases).`)
    : f.fehler === 'zu-wenig-gruppen' ? L('Die Gruppenkennung hat nur eine Gruppe; Paneldaten brauchen mindestens zwei.', 'The group identifier has only one group; panel data need at least two.')
    : f.fehler === 'zu-wenig-faelle' ? L('Zu wenige Fälle: Es braucht mehr Fälle als Gruppen plus Merkmale. Passt die Gruppenkennung (zum Beispiel jede Zeile eine eigene Gruppe)?', 'Too few cases: there must be more cases than groups plus features. Is the group identifier right (for example every row its own group)?')
    : f.fehler === 'konstant' ? L(`Diese Merkmale ändern sich innerhalb jeder Gruppe nie und fallen bei festen Effekten weg: ${(f.namen ?? []).map(wort).join(', ')}. Bitte weglassen (sie lassen sich nur zwischen Gruppen vergleichen, nicht mit festen Effekten).`, `These features never change within a group and drop out with fixed effects: ${(f.namen ?? []).map(wort).join(', ')}. Please leave them out (they can only be compared between groups, not with fixed effects).`)
    : f.fehler === 'nichts-variiert' ? L('Kein Merkmal ändert sich innerhalb der Gruppen; feste Effekte sind nicht rechenbar.', 'No feature changes within the groups; fixed effects cannot be calculated.')
    : L('Die Merkmale hängen so eng zusammen (oder sind so gleichförmig), dass sich das Modell nicht rechnen lässt. Eines der Merkmale weglassen.', 'The features are so closely related (or so uniform) that the model cannot be calculated. Leave one of the features out.');

  const ok = $derived(res && !('fehler' in res) ? res : null);
  const z = (v: number, n = 3) => (Number.isFinite(v) ? komma(v, n) : '-');
  const pw = (v: number) => (!Number.isFinite(v) ? '-' : v < 0.001 ? L('< ,001', '< .001') : ohneNull(v, 3));
  /** Die Modelle in fester Reihenfolge; zufällige Effekte nur, wenn gerechnet. */
  const modelle = $derived(ok ? [
    { id: 'fe', name: L('Feste Effekte (Within)', 'Fixed effects (within)'), m: ok.e.within, off: 0 },
    ...(ok.e.zufaellig ? [{ id: 're', name: L('Zufällige Effekte', 'Random effects'), m: ok.e.zufaellig, off: 1 }] : []),
    { id: 'po', name: L('Pooled (alles zusammen)', 'Pooled (all together)'), m: ok.e.pooled, off: 1 },
    ...(ok.e.between ? [{ id: 'be', name: L('Between (Gruppenmittel)', 'Between (group means)'), m: ok.e.between, off: 1 }] : [])
  ] : []);
  const koefVon = (m: { m: { koef: Koef[] }; off: number }, j: number) => m.m.koef[j + m.off]!;
  const saetze = $derived.by(() => {
    if (!ok) return [] as string[];
    const e = ok.e;
    const aus = [
      L(`${e.N} Fälle in ${e.n} Gruppen gehen ein${ok.weg ? ` (${ok.weg} mit Lücken bleiben außen vor)` : ''}; ${e.ausgewogen ? `jede Gruppe hat ${e.minT} Zeitpunkte (ausgewogen)` : `die Gruppen haben ${e.minT} bis ${e.maxT} Zeitpunkte (nicht ausgewogen)`}.`, `${e.N} cases in ${e.n} groups are included${ok.weg ? ` (${ok.weg} with gaps are left out)` : ''}; ${e.ausgewogen ? `every group has ${e.minT} time points (balanced)` : `the groups have ${e.minT} to ${e.maxT} time points (unbalanced)`}.`),
      L(`Gibt es Unterschiede zwischen den Gruppen? F-Test auf Gruppen-Effekte: F(${e.ftest.df1}; ${e.ftest.df2}) = ${z(e.ftest.F, 2)}, p ${pw(e.ftest.p).startsWith('<') ? pw(e.ftest.p) : '= ' + pw(e.ftest.p)}.`, `Are there differences between the groups? F test for group effects: F(${e.ftest.df1}, ${e.ftest.df2}) = ${z(e.ftest.F, 2)}, p ${pw(e.ftest.p).startsWith('<') ? pw(e.ftest.p) : '= ' + pw(e.ftest.p)}.`)
    ];
    if (e.hausman) aus.push(L(`Hausman-Test (feste gegen zufällige Effekte): χ²(${e.hausman.df}) = ${z(e.hausman.chi2, 2)}, p ${pw(e.hausman.p).startsWith('<') ? pw(e.hausman.p) : '= ' + pw(e.hausman.p)}.`, `Hausman test (fixed against random effects): χ²(${e.hausman.df}) = ${z(e.hausman.chi2, 2)}, p ${pw(e.hausman.p).startsWith('<') ? pw(e.hausman.p) : '= ' + pw(e.hausman.p)}.`));
    if (e.rho !== null) aus.push(L(`Bei zufälligen Effekten entfallen ${komma(e.rho * 100, 0)} % der Restvarianz auf Unterschiede zwischen den Gruppen (ρ).`, `With random effects ${komma(e.rho * 100, 0)}% of the residual variance is due to differences between the groups (ρ).`));
    if (!e.ausgewogen) aus.push(L('Zufällige Effekte und der Hausman-Test gibt es nur bei ausgewogenem Panel (jede Gruppe gleich viele Zeitpunkte), denn bei ungleich vielen Zeitpunkten gibt es mehrere gebräuchliche Rechenwege.', 'Random effects and the Hausman test are only given for a balanced panel (every group the same number of time points), because with unequal numbers of time points there are several common ways of calculating.'));
    if (e.n < PANEL_WENIG_GRUPPEN) aus.push(L(`Mit ${e.n} Gruppen (unter ${PANEL_WENIG_GRUPPEN}) sind die cluster-robusten Standardfehler unsicher und oft zu klein.`, `With ${e.n} groups (under ${PANEL_WENIG_GRUPPEN}) the cluster-robust standard errors are unreliable and often too small.`));
    return aus;
  });

  function rSkript() {
    if (!ok) return;
    try {
      const sk = bauePanelSkript({ spalten: s.spalten, zeilen: s.zeilen, gruppe: ok.gruppe, ziel: ok.ziel, merkmale: ok.merkmale, r: ok.e, titel: L('Paneldaten', 'Panel data'), datum: heute() });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if gruppenKandidaten.length >= 2 && zahlen.length >= 2}
  <details class="auf panel" style="margin-top:var(--a4)"><summary>{L('Gleiche Einheiten über die Zeit? (Paneldaten, feste und zufällige Effekte)', 'The same units over time? (panel data, fixed and random effects)')}</summary>
    <p class="heft-text">{L('Bei Paneldaten wird dieselbe Einheit (Firma, Person, Land) mehrfach gemessen, zum Beispiel jedes Jahr. Dann unterscheiden sich Einheiten oft auf eine Weise, die man nicht gemessen hat. Feste Effekte (fixed effects, Within) rechnen das heraus, indem sie jede Einheit nur mit sich selbst vergleichen; zufällige Effekte (random effects) behandeln die Unterschiede als Zufall und nutzen auch den Vergleich zwischen den Einheiten. Die cluster-robusten Standardfehler (Gruppe = Cluster) rechnen damit, dass die Messungen derselben Einheit nicht unabhängig sind.', 'With panel data the same unit (firm, person, country) is measured several times, for example every year. Units then often differ in ways that were not measured. Fixed effects (within) take that out by comparing each unit only with itself; random effects treat the differences as chance and also use the comparison between units. Cluster-robust standard errors (group = cluster) allow for the measurements of the same unit not being independent.')}</p>
    <p class="hilfe"><HilfeLink id="paneldaten" text={L('Hilfe: Paneldaten', 'Help: panel data')} /></p>
    <div class="panel-zeile">
      <div class="eingabe"><label for="pa-g-{kennung}">{L('Woran erkennt man die Einheit? (Gruppenkennung)', 'What identifies the unit? (group identifier)')}</label>
        <select id="pa-g-{kennung}" bind:value={gruppe}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each gruppenKandidaten as c (c.name)}<option value={c.name}>{nm(c)}</option>{/each}</select></div>
      <div class="eingabe"><label for="pa-z-{kennung}">{L('Was soll erklärt werden? (Zahl)', 'What should be explained? (number)')}</label>
        <select id="pa-z-{kennung}" bind:value={ziel}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen.filter(c => c.name !== gruppe) as c (c.name)}<option value={c.name}>{nm(c)}</option>{/each}</select></div>
    </div>
    {#if gruppe && ziel}
      <fieldset style="border:0;padding:0;margin:var(--a2) 0"><legend style="font-weight:600">{L('Wodurch? (Zahlen-Spalten, die sich innerhalb einer Einheit ändern)', 'By what? (number columns that change within a unit)')}</legend>
        {#each merkmalKandidaten as c (c.name)}<label class="schalter" style="display:inline-flex;margin-inline-end:var(--a4)"><input type="checkbox" checked={merkmale.includes(c.name)} onchange={(ev) => umschalten(c.name, ev.currentTarget.checked)} />{nm(c)}</label>{/each}
      </fieldset>
      <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft || !merkmale.length}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{ok ? L('Panel neu rechnen', 'Recalculate panel') : L('Panel rechnen', 'Calculate panel')}{/if}</button></div>
    {/if}
    {#if res && 'fehler' in res}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if ok}
      <div class="panel-saetze">{#each saetze as t (t)}<p class="heft-text">{t}</p>{/each}</div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Wirkung von „${wort(ok.ziel)}“ nach Modell`, `Effect on “${wort(ok.ziel)}” by model`)}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Merkmal – Modell', 'Feature – model')}</th><th scope="col">b</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">p</th><th scope="col">{L('Standardfehler (cluster-robust)', 'Standard error (cluster-robust)')}</th><th scope="col">{L('p (cluster-robust)', 'p (cluster-robust)')}</th></tr></thead>
        <tbody>{#each ok.merkmale as n, j (n)}{#each modelle as m (m.id)}{@const c = koefVon(m, j)}<tr><th scope="row" style="text-align: start">{wort(n)} – {m.name}</th><td style="text-align:end">{z(c.b, 4)}</td><td style="text-align:end">{z(c.se, 4)}</td><td style="text-align:end">{pw(c.p)}</td><td style="text-align:end">{m.id === 'be' ? '-' : z(c.seCluster, 4)}</td><td style="text-align:end">{m.id === 'be' ? '-' : pw(c.pC)}</td></tr>{/each}{/each}</tbody>
      </table></div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Angepasste Modelle', 'Fitted models')}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Modell', 'Model')}</th><th scope="col">{L('Fälle', 'Cases')}</th><th scope="col">R²</th></tr></thead>
        <tbody>{#each modelle as m (m.id)}<tr><th scope="row" style="text-align: start">{m.name}</th><td style="text-align:end">{m.m.N}</td><td style="text-align:end">{z(m.m.r2, 3)}</td></tr>{/each}</tbody>
      </table></div>
      <div class="knopfzeile"><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Auch feste Effekte zeigen nur Zusammenhänge innerhalb der Einheiten, keine Ursachen: Alles, was sich bei einer Einheit zugleich ändert und nicht gemessen ist, kann mitwirken. Das R² der Modelle ist nicht vergleichbar (jedes erklärt etwas anderes). Der klassische Hausman-Test gilt nicht für cluster-robuste Fehler; die beiden Standardfehler-Spalten zeigen, wie viel die Annahme unabhängiger Messungen ausmacht. Die Standardfehler folgen der Formel von Stata und sandwich (CR1); das R-Paket plm rechnet bei festen Effekten eine etwas kleinere Korrektur.', 'Even fixed effects show only relationships within units, not causes: anything that changes together for a unit and is not measured can contribute. The R² of the models is not comparable (each explains something different). The classical Hausman test is not valid for cluster-robust errors; the two standard-error columns show how much the assumption of independent measurements matters. The standard errors follow the formula of Stata and sandwich (CR1); the R package plm uses a slightly smaller correction for fixed effects.')}</p>
    {/if}
  </details>
{/if}

<style>
  .panel-zeile { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); align-items: end; margin-block: var(--a2); }
  .panel-zeile .eingabe { max-width: 340px; margin: 0; }
</style>
