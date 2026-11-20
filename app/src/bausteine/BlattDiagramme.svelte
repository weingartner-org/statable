<script lang="ts">
  import type { Blatt } from '../lib/sitzung.svelte';
  import { L, sichern } from '../lib/sitzung.svelte';
  import { sperrSatz } from '../lib/gewichte';
  import { stellenTitel } from '../lib/gewichtkarten';
  import type { Faktoren, Kreuz, Verteilung, Vorhersage } from '../lib/ergebnis';
  import { dvMit, dvRat, type DvOptionen } from '../lib/diagramm';
  import { antwortSkala, restDaten, screeDaten, verteilungsDaten } from '../lib/diagrammquellen';
  import DiagrammExport from './DiagrammExport.svelte';
  import { haeufigGeordnet, kreuzGeordnet } from '../lib/gestalt';
  import Verteilungsdiagramm from './Verteilungsdiagramm.svelte';
  import Qqdiagramm from './Qqdiagramm.svelte';
  import Haeufigkeitsdiagramm, { liegt } from './Haeufigkeitsdiagramm.svelte';
  import Paretodiagramm from './Paretodiagramm.svelte';
  import Kreuzdiagramm from './Kreuzdiagramm.svelte';
  import Residuendiagramm from './Residuendiagramm.svelte';
  import Screeplot from './Screeplot.svelte';
  import HistogrammErweitert from './HistogrammErweitert.svelte';
  import { werteVon } from '../lib/blatttitel';
  import { istSetName } from '../lib/mehrfach';
  import { s as sitzung } from '../lib/sitzung.svelte';

  /** Die Diagramme unter dem Ergebnis von Verteilung, Kreuztabelle, Regression (linear) und Faktorenanalyse: sichtbar, aber zuklappbar.
   *  Wo es zwei Arten gibt, wählt eine kleine Auswahl mit kurzem Rat; die Wahl steht am Blatt (`blatt.dv`) und kommt mit der Projektdatei. */
  let { blatt, erg, name }: { blatt: Blatt; erg: { typ: string; e?: unknown } | null; name: (n: string) => string } = $props();
  const kennung = $props.id();
  const o = $derived(dvMit(blatt.dv));
  /** Mit Fallgewicht gerechnet: Diagramme aus den einzelnen Zeilen zählen jede Zeile einmal und sind gesperrt (Fachblatt S-A, 1.5); die aus gewichteten Tabellen (Häufigkeiten, Kreuztabelle, Scree) bleiben. */
  const gwSatz = (id: string): string | null => (blatt.gewicht ? sperrSatz(id, blatt.gewicht, stellenTitel(id)) : null);
  function setze<K extends keyof DvOptionen>(k: K, w: DvOptionen[K]) { blatt.dv = { ...(blatt.dv ?? {}), [k]: w }; void sichern(); }

  const verteilung = $derived(erg?.typ === 'verteilung' ? verteilungsDaten(blatt, erg.e as Verteilung, name) : null);
  const kreuz = $derived(erg?.typ === 'kreuz' && (erg.e as Kreuz).zaehlung?.tab.length ? (erg.e as Kreuz) : null);
  const rest = $derived(erg?.typ === 'vorhersage' ? restDaten(blatt, erg.e as Vorhersage) : null);
  const scree = $derived(erg?.typ === 'faktor' ? screeDaten(erg.e as Faktoren) : null);
  const zielName = $derived(erg?.typ === 'vorhersage' ? name((erg.e as Vorhersage).ziel) : '');
  /** Zahlenspalten der Auswahl (höchstens sechs), für das Histogramm mit eigenen Klassen und je Gruppe. */
  const histSpalten = $derived(erg?.typ === 'verteilung' ? werteVon(blatt).l1.filter(n => !istSetName(n) && sitzung.spalten.find(c => c.name === n)?.art === 'zahl').slice(0, 6) : []);
  const da = $derived(!!((verteilung && (verteilung.zahlen.length || verteilung.haeufig.length)) || kreuz || rest || scree));
</script>

{#if da}
  <details class="auf dv" open={!o.zu} ontoggle={(ev) => { const zu = !(ev.currentTarget as HTMLDetailsElement).open; if (zu !== o.zu) setze('zu', zu); }}>
    <summary>{L('Diagramme', 'Charts')}</summary>
    <div class="dv-inhalt">
      {#if verteilung}
        {#if verteilung.zahlen.length}
          <div class="einst-gruppe" style="padding-top:0">
            <h3>{L('Zahlen darstellen als', 'Show numbers as')}</h3>
            <div class="segment" role="radiogroup" aria-label={L('Zahlen darstellen als', 'Show numbers as')}>{#each [['hist', L('Histogramm', 'Histogram')], ['box', L('Boxplot', 'Box plot')], ['qq', L('Q-Q-Diagramm', 'Q-Q plot')]] as [w, t]}<label data-begriff={w === 'hist' ? 'histogramm' : w === 'box' ? 'boxplot' : 'qq-diagramm'}><input type="radio" name="dv-v-{kennung}" value={w} checked={o.verteilung === w} onchange={() => setze('verteilung', w as DvOptionen['verteilung'])}>{t}</label>{/each}</div>
            <p style="color:var(--tinte-2);margin-top:var(--a2)">{dvRat.verteilung(o.verteilung)}</p>
            {#if o.verteilung === 'hist'}<label data-begriff="normalverteilung" class="schalter"><input type="checkbox" checked={o.normal} onchange={(ev) => setze('normal', ev.currentTarget.checked)}>{L('Normalverteilungskurve zeigen', 'Show normal curve')}</label>{/if}
          </div>
          {#each verteilung.zahlen as z (z.titel)}
            <DiagrammExport sperre={gwSatz(o.verteilung === 'box' ? 'diagramm:box' : o.verteilung === 'qq' ? 'verteilung:normalitaet' : 'diagramm:histogramm')} titel={`${z.titel} - ${o.verteilung === 'box' ? L('Boxplot', 'Box plot') : o.verteilung === 'qq' ? L('Q-Q-Diagramm', 'Q-Q plot') : L('Histogramm', 'Histogram')}`}>{#if o.verteilung === 'qq'}<Qqdiagramm werte={z.werte} titel={z.titel} />{:else}<Verteilungsdiagramm werte={z.werte} titel={z.titel} art={o.verteilung} normal={o.normal} />{/if}</DiagrammExport>
          {/each}
          {#if o.verteilung === 'hist' && !blatt.gewicht}{#each histSpalten as n (n)}<HistogrammErweitert spalte={n} {name} />{/each}{/if}
        {/if}
        {#if verteilung.haeufig.length}
          <div class="einst-gruppe" style={verteilung.zahlen.length ? '' : 'padding-top:0'}>
            <h3>{L('Kategorien zeigen als', 'Show categories as')}</h3>
            <div class="segment" role="radiogroup" aria-label={L('Kategorien zeigen als', 'Show categories as')}>{#each [['anzahl', L('Anzahl', 'Count')], ['prozent', L('Prozent', 'Percent')]] as [w, t]}<label data-begriff={w === 'anzahl' ? 'absolute-haeufigkeit' : 'prozent'}><input type="radio" name="dv-h-{kennung}" value={w} checked={o.haeufig === w} onchange={() => setze('haeufig', w as DvOptionen['haeufig'])}>{t}</label>{/each}</div>
          </div>
          <label class="schalter" style="margin-top:var(--a2)"><input type="checkbox" checked={o.pareto} onchange={(ev) => setze('pareto', ev.currentTarget.checked)}>{L('Zusätzlich als Pareto-Diagramm (nach Größe sortiert, mit kumulierter Linie)', 'Also as a Pareto chart (sorted by size, with a cumulative line)')}</label>
          {#each verteilung.haeufig as h (h.name)}
            <DiagrammExport titel={`${h.name} - ${liegt(h) ? L('Balkendiagramm', 'Bar chart') : L('Säulendiagramm', 'Bar chart')}`} kategorien={[{ label: L('Reihenfolge der Stufen', 'Order of the levels'), namen: h.werte.map(w => w.name), feld: 'reihe' }]}><Haeufigkeitsdiagramm h={haeufigGeordnet(h, blatt.gestalt)} prozent={o.haeufig === 'prozent'} /></DiagrammExport>
            {#if o.pareto && h.werte.length >= 2}<DiagrammExport titel={`${h.name} - ${L('Pareto-Diagramm', 'Pareto chart')}`}><Paretodiagramm {h} /></DiagrammExport>{/if}
          {/each}
        {/if}
      {:else if kreuz}
        <div class="einst-gruppe" style="padding-top:0">
          <h3>{L('Art', 'Type')}</h3>
          <div class="segment" role="radiogroup" aria-label={L('Art', 'Type')}>{#each [['gruppiert', L('Säulen nebeneinander', 'Bars side by side')], ['gestapelt', L('Gestapelt auf 100 %', 'Stacked to 100%')]] as [w, t]}<label><input type="radio" name="dv-k-{kennung}" value={w} checked={o.kreuz === w} onchange={() => setze('kreuz', w as DvOptionen['kreuz'])}>{t}</label>{/each}</div>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{dvRat.kreuz(o.kreuz)}</p>
          {#if o.kreuz === 'gruppiert'}
            <div class="segment" style="margin-top:var(--a2)" role="radiogroup" aria-label={L('Was die Säulen zeigen', 'What the bars show')}>{#each [['prozent', L('Prozent in der Gruppe', 'Percent in the group')], ['anzahl', L('Anzahl Personen', 'Number of people')]] as [w, t]}<label><input type="radio" name="dv-kw-{kennung}" value={w} checked={o.kreuzWert === w} onchange={() => setze('kreuzWert', w as DvOptionen['kreuzWert'])}>{t}</label>{/each}</div>
          {/if}
        </div>
        <DiagrammExport titel={`${kreuz.gezaehlt} ${L('nach', 'by')} ${kreuz.gruppen} - ${L('Säulendiagramm', 'Bar chart')}`} kategorien={kreuz.zaehlung ? [{ label: L('Reihenfolge der Antworten', 'Order of the answers'), namen: kreuz.zaehlung.spalten, feld: 'reihe' }, { label: L('Reihenfolge der Gruppen', 'Order of the groups'), namen: kreuz.zaehlung.zeilen, feld: 'reiheB' }] : []}><Kreuzdiagramm e={kreuzGeordnet(kreuz, blatt.gestalt)} art={o.kreuz} wert={o.kreuzWert} skala={antwortSkala(blatt, kreuz)} /></DiagrammExport>
      {:else if rest}
        <div class="einst-gruppe" style="padding-top:0">
          <h3>{L('Diagramm', 'Chart')}</h3>
          <div class="segment" role="radiogroup" aria-label={L('Diagramm', 'Chart')}>{#each [['rest', L('Reste gegen Vorhergesagt', 'Residuals vs. predicted')], ['qq', L('Q-Q-Diagramm der Reste', 'Q-Q plot of residuals')]] as [w, t]}<label data-begriff={w === 'qq' ? 'qq-diagramm' : 'residuenplot'}><input type="radio" name="dv-r-{kennung}" value={w} checked={o.rest === w} onchange={() => setze('rest', w as DvOptionen['rest'])}>{t}</label>{/each}</div>
          <p style="color:var(--tinte-2);margin-top:var(--a2)">{dvRat.rest(o.rest)}</p>
        </div>
        <DiagrammExport sperre={gwSatz('diagramm:streu')} titel={`${zielName} - ${o.rest === 'qq' ? L('Q-Q-Diagramm der Reste', 'Q-Q plot of residuals') : L('Reste gegen vorhergesagte Werte', 'Residuals vs predicted values')}`}><Residuendiagramm r={rest} art={o.rest} zielText={zielName} /></DiagrammExport>
      {:else if scree}
        <DiagrammExport titel={L('Scree-Plot', 'Scree plot')}><Screeplot eigen={scree.eigen} extrahiert={scree.extrahiert} /></DiagrammExport>
      {/if}
    </div>
  </details>
{/if}

<style>
  .dv { margin-top: var(--a5); }
  .dv-inhalt { padding-top: var(--a3); display: grid; gap: var(--a4); }
  .dv-inhalt :global(.einst-gruppe h3) { font-size: var(--s-klein, .9rem); margin-bottom: var(--a2); }
</style>
