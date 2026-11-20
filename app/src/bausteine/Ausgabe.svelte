<script lang="ts">
  import { getContext } from 'svelte';
  import TabelleUmbauen from './TabelleUmbauen.svelte';
  import { pivotGrund, pivotIstGrund, type Pivot } from '../lib/pivot';
  import type { Blatt } from '../lib/sitzung.svelte';
  import type { OutputItem } from '../engine/types';
  import { psppText } from '../output/woerterbuch.svelte';
  import { tabelleDe, deDict, woerterbuchBereit, exportiereTabelleWord, exportiereTabelleExcel } from '../lib/export';
  import { kopiereTabelleApa } from '../lib/tabellenexport';
  import ExportMenue, { type ExportEintrag } from './ExportMenue.svelte';
  import { melde } from '../lib/sitzung.svelte';
  import type { TableItem } from '../engine/types';
  import { freundlich } from '../lib/meldungen';
  import { s, d, L, Lp, istEn, sichern, aktuelleSprache } from '../lib/sitzung.svelte';
  import { ANSICHTEN, STANDARD_ANSICHT, ansichtName, tonCss, tonFett, type Ansicht } from '../lib/tabellenfarben';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';
  import { rollrahmen } from '../lib/rollrahmen';
  import type { Dict } from '../output/format-de';
  import { berichtTabellenVorschlag, tabellenSchluessel } from '../lib/berichtsatz';
  import { tabelleHtmlStruktur } from '../lib/tabellenstruktur';
  import { kurzform } from '../lib/kurzkoepfe';

  /** Eindeutige Vorsätze für die ids der Kopfzellen (Verweise `headers`, `aria-describedby`): je Baustein und Tabelle. */
  const kennung = $props.id();

  /** stelle: nur auf der Seite „Befehle“ - führt von einer Fehlermeldung zur Stelle im Text. */
  let { items, nurTabellen = false, ohneMenue = false, stelle }: { items: OutputItem[]; nurTabellen?: boolean; ohneMenue?: boolean; stelle?: (meldung: string) => { zeile: number; zeigen: () => void } | null } = $props();
  let dc = $state<Dict | null>(null);
  /** Tabellen erst zeichnen, wenn das Wörterbuch der Sprache da ist - sonst steht kurz der englische PSPP-Titel als Tabellenname im Baum. */
  const bereit = $derived(woerterbuchBereit(dc, aktuelleSprache()));
  /** Tabelle umbauen (S-G): nur wo ein Blatt die Wahl speichern kann und die Tabelle einfach genug ist. */
  const holeBlatt = getContext<(() => Blatt | null) | undefined>('dgBlatt');
  let umbauOffen = $state<string | null>(null);
  const pivotVon = (k: string): Pivot => holeBlatt?.()?.pivot?.[k] ?? pivotGrund();
  function umbaue(k: string, n: Pivot) {
    const b = holeBlatt?.(); if (!b) return;
    const rest = { ...(b.pivot ?? {}) };
    if (pivotIstGrund(n)) delete rest[k]; else rest[k] = n;
    b.pivot = Object.keys(rest).length ? rest : undefined;
    void sichern();
  }
  // Wörterbuch der gewählten Sprache - neu, wenn die Sprache wechselt (vorher einmal beim Start: nach einem Wechsel veraltet)
  /** Berichtswahl (Johannes 01.11.): Statable schlägt Tabellen vor; jede hat hier den Schalter „Im Bericht“. Weitere Tabellen des Blatts lassen sich dazuwählen. */
  const vorschlagKeys = $derived.by(() => { const b = holeBlatt?.(); if (!b || ohneMenue || nurTabellen === undefined) return null; try { return new Set(berichtTabellenVorschlag(b).map(tabellenSchluessel)); } catch { return null; } });
  const imBerichtAn = (it: TableItem) => { const b = holeBlatt?.(), k = tabellenSchluessel(it); return !b ? false : vorschlagKeys?.has(k) ? !(b.berichtTabellenAus ?? []).includes(k) : (b.berichtTabellenMit ?? []).includes(k); };
  function berichtUmschalten(it: TableItem, an: boolean) {
    const b = holeBlatt?.(); if (!b) return; const k = tabellenSchluessel(it);
    const feld = vorschlagKeys?.has(k) ? 'berichtTabellenAus' : 'berichtTabellenMit', liste = new Set(b[feld] ?? []);
    if (feld === 'berichtTabellenAus' ? !an : an) liste.add(k); else liste.delete(k);
    b[feld] = liste.size ? [...liste] : undefined;
    melde(an ? L('Die Tabelle kommt in den Bericht.', 'The table goes into the report.') : L('Die Tabelle bleibt aus dem Bericht.', 'The table stays out of the report.'));
    void sichern();
  }
  $effect(() => { void s.einst.sprache; deDict().then(x => (dc = x)); });
  const sichtbar = $derived(items.filter(i => i.type === 'table' || (!nurTabellen && i.type === 'message') || (!nurTabellen && i.type === 'title' && i.level === 1)));
  void s.einst.zahl;
  /** Menü einer Tabelle: für Word kopieren (APA), als Word-Datei, als Excel-Datei.  Die Nummer in „Tabelle n“ zählt fortlaufend in der Arbeit (lib/tabellenexport.ts). */
  /** Gewählte Ansicht je Tabelle in diesem Bild (die Tabelle selbst merkt sie sich auch, für Export und Projekt). */
  let wahl = $state<Record<number, Ansicht>>({});
  const muster = (a: Ansicht) => [0, 1, 2].map(g => tonCss({ ansicht: a, gruppe: g, n: 3, gesamtZeile: false, gesamtSpalte: false }) ?? 'var(--blatt)').concat(tonCss({ ansicht: a, gruppe: 0, n: 1, gesamtZeile: true, gesamtSpalte: false }) ?? 'var(--blatt)');
  const ansichtEintraege = (it: TableItem, i: number): ExportEintrag[] => ANSICHTEN.map(a => ({
    id: a, text: ansichtName(a, istEn()), an: (wahl[i] ?? it.ansicht ?? s.einst.tabAnsicht ?? STANDARD_ANSICHT) === a, muster: muster(a),
    tun: () => { wahl[i] = a; try { it.ansicht = a; sichern(); } catch { /* Tabelle nur zur Anzeige erzeugt: gilt für dieses Bild */ } }
  }));
  /** Erste Gruppe im Menü der Tabelle: „Im Bericht“ zum Ankreuzen (früher ein Schalter in der Leiste; das Häkchen zeigt den Zustand, darum immer derselbe Text). */
  const berichtEintrag = (it: TableItem): ExportEintrag[] => vorschlagKeys && holeBlatt?.() ? [{ id: 'bericht', gruppe: L('Bericht', 'Report'), text: L('Im Bericht', 'In report'), pruef: imBerichtAn(it), tun: () => berichtUmschalten(it, !imBerichtAn(it)) }] : [];
  const tabellenEintraege = (it: TableItem): ExportEintrag[] => [
    { id: 'kopie', icon: 'kopieren', text: L('In Word kopieren (APA)', 'Copy for Word (APA)'), tun: async () => { const n = await kopiereTabelleApa(it); melde(n ? L(`Tabelle kopiert als „Tabelle ${n}“ - in Word einfügen, die Nummer bei Bedarf anpassen.`, `Table copied as "Table ${n}" - paste it into Word and adjust the number if needed.`) : d('Das Kopieren ist hier nicht möglich. Nimm „Als Word-Datei“.', 'Das Kopieren ist hier nicht möglich. Nehmen Sie „Als Word-Datei“.', 'Copying is not possible here. Use "As Word file".')); } },
    { id: 'word', text: L('Als Word-Datei (APA)', 'As Word file (APA)'), tun: () => exportiereTabelleWord(it) },
    { id: 'excel', text: L('Als Excel-Datei', 'As Excel file'), tun: () => exportiereTabelleExcel(it) }
  ];
</script>

{#if !nurTabellen && items.some(i => i.type === 'chart')}
  <div class="meldung-karte" role="status" style="margin:var(--a3) 0"><Icon n="info" /><div><h3>{L('Diagramme aus Befehlen zeigt Statable nicht', 'Statable does not show charts from commands')}</h3><p>{Lp(items.filter(i => i.type === 'chart').length, 'PSPP hat ein Diagramm erzeugt (z. B. /HISTOGRAM). Die Zahlen stehen unten; Histogramm, Boxplot, Säulen und Scree-Plot gibt es im Blatt zur passenden Frage unter „Diagramme“.', 'PSPP hat Diagramme erzeugt (z. B. /HISTOGRAM). Die Zahlen stehen unten; Histogramm, Boxplot, Säulen und Scree-Plot gibt es im Blatt zur passenden Frage unter „Diagramme“.', 'PSPP produced a chart (e.g. /HISTOGRAM). The numbers are below; histogram, box plot, bars and scree plot are available on the sheet for the matching question under "Charts".', 'PSPP produced charts (e.g. /HISTOGRAM). The numbers are below; histogram, box plot, bars and scree plot are available on the sheet for the matching question under "Charts".')}</p></div></div>
{/if}
{#if !bereit && sichtbar.some(i => i.type === 'table')}<p class="leise-text" role="status"><Rechnet text={L('Wird geladen …', 'Loading …')} /></p>{/if}
<div class="ausgabe-raster">
{#each sichtbar as it, i (i)}
  {#if it.type === 'table'}
    {#if bereit}
    {@const tb = tabelleDe({ ...it, ansicht: wahl[i] ?? it.ansicht }, dc)}
    {@const st = tabelleHtmlStruktur(tb, { praefix: `${kennung}-${i}`, kurz: s.einst.kurzeKoepfe ? (x) => kurzform(x, aktuelleSprache()) : undefined })}
    <div class="tabelle-karte">
    {#if !ohneMenue}<div class="tabelle-menue">{#if vorschlagKeys && holeBlatt?.() && !imBerichtAn(it)}<span class="tab-bericht" role="note">{L('nicht im Bericht', 'not in report')}</span>{/if}{#if tb.einfach && tb.schluessel && holeBlatt?.()}<button type="button" class="k leise klein" aria-expanded={umbauOffen === tb.schluessel} onclick={() => (umbauOffen = umbauOffen === tb.schluessel ? null : tb.schluessel!)}>{L('Umbauen', 'Rearrange')}</button>{/if}<ExportMenue eintraege={ansichtEintraege(it, i)} name={`${L('Tabelle', 'Table')}: ${tb.titel}`} symbol="streifen" art={L('Ansicht', 'View')} tipp={L('Farbige Ansicht der Tabelle wählen - so geht sie auch in den Export', 'Choose the color view of the table - the export uses it too')} klein /><ExportMenue klein eintraege={[...berichtEintrag(it), ...tabellenEintraege(it)]} name={`${L('Tabelle', 'Table')}: ${tb.titel}`} /></div>{/if}
    {#if umbauOffen && umbauOffen === tb.schluessel}<TabelleUmbauen ur={tabelleDe({ ...it, ansicht: wahl[i] ?? it.ansicht }, dc, true)} p={pivotVon(tb.schluessel)} aendere={(n) => umbaue(tb.schluessel!, n)} schliesse={() => (umbauOffen = null)} />{/if}
    <div class="ausgabe-tabelle" use:rollrahmen={L(`${tb.titel}, nach rechts scrollbar`, `${tb.titel}, scrollable to the right`)}>
      <table class="apa">
        <caption><b>{tb.titel}</b></caption>
        <thead>{#each st.kopf as row}<tr>{#each row as c}{#if c.art === 'th'}<th id={c.id} colspan={c.colspan} rowspan={c.rowspan} scope={c.scope} aria-describedby={c.describedby} style:text-align={c.z.zahl ? 'right' : undefined} style:background={tonCss(c.z.ton)}>{#if c.z.tipp}<a class="zt zt-spalte kopf-tipp" href="#hilfe/{c.z.tipp.id}" data-tipp={c.z.tipp.text}>{c.text}</a>{:else}<span class="zt zt-spalte">{c.text}</span>{/if}{#if c.marken}<sup class="fn-marke">{c.marken}</sup>{/if}</th>{:else}<td colspan={c.colspan} rowspan={c.rowspan} style:background={tonCss(c.z.ton)}><span class="nur-vorleser">{L('Eckzelle ohne Beschriftung', 'Corner cell without label')}</span></td>{/if}{/each}</tr>{/each}</thead>
        <tbody>{#each st.koerper as row}<tr>{#each row as c}{#if c.art === 'th'}<th id={c.id} scope="row" colspan={c.colspan} rowspan={c.rowspan} aria-describedby={c.describedby} style:background={tonCss(c.z.ton)} style:font-weight={c.z.ton?.gesamtZeile && c.z.ton.ansicht !== 'aus' ? 650 : undefined}><span class="zt">{c.text}</span>{#if c.marken}<sup class="fn-marke">{c.marken}</sup>{/if}</th>{:else}<td headers={c.headers} colspan={c.colspan} rowspan={c.rowspan} aria-describedby={c.describedby} style:text-align={c.z.zahl ? 'right' : 'left'} style:background={tonCss(c.z.ton)} style:font-weight={tonFett(c.z.ton) ? 650 : undefined}>{c.text}{#if c.marken}<sup class="fn-marke">{c.marken}</sup>{/if}</td>{/if}{/each}</tr>{/each}</tbody>
      </table>
      {#each st.fuss as f}<p class="anmerkung" id={f.id}>{f.text}</p>{/each}
      {#if st.abkuerzungen.length}<p class="anmerkung">{L('Abkürzungen', 'Abbreviations')}: {#each st.abkuerzungen as a, k (a.kurz)}{k ? '; ' : ''}<b>{a.kurz}</b> {a.lang}{/each}</p>{/if}
    </div>
    </div>
    {/if}
  {:else if it.type === 'message'}
    {@const f = freundlich(it.text, it.severity)}
    <div class="meldung-karte" role={it.severity === 'error' ? 'alert' : 'status'} style="margin:var(--a3) 0">
      <Icon n={it.severity === 'error' ? 'hinweis' : 'info'} />
      <div><h3>{f.titel}</h3><p>{f.text}</p><p class="tun">{f.tun}</p></div>
      {#if stelle}{@const st = stelle(it.text)}{#if st}<div class="knopfzeile"><button class="k leise" type="button" onclick={st.zeigen}><Icon n="befehl" />{L(`Zeile ${st.zeile} im Befehl zeigen`, `Show line ${st.zeile} in the commands`)}</button></div>{/if}{/if}
      <details class="auf"><summary>{L('Details (Originalmeldung von PSPP)', 'Details (original PSPP message)')}</summary><pre>{f.original}</pre></details>
    </div>
  {:else if it.type === 'title'}
    <h3 class="ausgabe-titel">{psppText(it.text, aktuelleSprache())}</h3>
  {/if}
{/each}
</div>

<style>
  .kopf-tipp { color: inherit; text-decoration: underline dotted; text-underline-offset: 3px; text-decoration-thickness: 1px; }
  .kopf-tipp:hover, .kopf-tipp:focus-visible { text-decoration-style: solid; }
  /* Mehrere Tabellen nebeneinander, wenn Platz ist - jede in ihrer natürlichen Breite, in Lesereihenfolge Zeile für Zeile; eine breite Tabelle bekommt eine eigene Zeile. Überschriften und Meldungen über die ganze Breite. */
  .ausgabe-raster { display: flex; flex-wrap: wrap; column-gap: var(--a6); align-items: flex-start; }
  .ausgabe-raster > :not(.tabelle-karte) { flex: 1 1 100%; }
  .tabelle-karte { flex: 0 1 auto; min-width: 0; max-width: 100%; }
  /* Lange Beschriftungen (ganze Fragetexte) brechen um, statt die Tabelle über die ganze Seite zu ziehen. */
  .zt { display: inline-block; max-width: 30ch; }
  .zt-spalte { max-width: 16ch; }
  th[colspan] > .zt { max-width: none; }
  .fn-marke { font-size: 0.75em; margin-inline-start: 1px; }
  .tabelle-menue { display: flex; justify-content: flex-end; align-items: center; gap: 2px; margin-bottom: 0; }
  .tab-bericht { margin-inline-end: var(--a3); font-size: var(--gr-klein); color: var(--tinte-2); }
  /* Knöpfe klein und nah an der Tabelle (10.10.): der Abstand über der Überschrift der Tabelle schrumpft. */
  .tabelle-menue + .ausgabe-tabelle :global(table.apa) { margin-top: var(--a1); }
  .ausgabe-tabelle { overflow-x: auto; margin-bottom: var(--a4); }
  .ausgabe-tabelle :global(th[scope="row"]) { text-align: start; font-weight: 400; }
  .ausgabe-tabelle :global(td) { white-space: nowrap; }
  .ausgabe-titel { font: 650 var(--gr-text)/1.3 var(--schrift-ui); color: var(--tinte-2); margin: var(--a5) 0 var(--a2); }
</style>
