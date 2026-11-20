<script lang="ts">
  import Kursiv from '../bausteine/Kursiv.svelte';
  import { sage } from '../lib/ansage';
  import { s, d, L, Lp, istEn, sichern, setzeIntegration, einstSpeichern, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { exportiereBerichtWord, exportiereErgebnisseExcel } from '../lib/export';
  import Icon from '../bausteine/Icon.svelte';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Ausgabe from '../bausteine/Ausgabe.svelte';
  import { lesbar } from '../lib/verzeichnis';
  import { berichtSatz, berichtTabellen, stichprobenText, excelTabellen } from '../lib/berichtsatz';
  import { rechenText } from '../lib/eigenercode';
  import { onDestroy, untrack } from 'svelte';
  import BlattSeite from './Blatt.svelte';
  import { veralteteVon, standVon, fehlendeSpalten } from '../lib/blattstand';
  import { werteVon } from '../lib/blatttitel';
  import { neuRechnen, neuRechnenAbbrechen, darfNeuRechnen, rechenstand, ende, type Auftrag } from '../lib/neurechnen.svelte';
  import { rStatus } from '../lib/rverfahren.svelte';
  import { brauchtRBlatt } from '../lib/live';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { veraltetMarke } from '../lib/export';
  import { zitat, dp } from '../i18n/profil';
  import { protokollAnhang } from '../lib/protokollsaetze';
  import { INTEGRATION_FELDER, integrationAusgefuellt, integrationFrage, INTEGRATION_MAX } from '../lib/integration';
  import { baueRBericht, rGewichtFelder, rSkriptMoeglich, rSkriptZip, type RBerichtBlatt, type RErgebnis } from '../lib/rskript';
  import { herunterladen, heute } from '../lib/export';
  import { aktivesGewicht } from '../lib/fallgewicht.svelte';

  /** Anhang „Protokoll der Datenänderungen“ (Abschnitt 6, Teil B): in Vorschau, Word und PDF, solange es Einträge gibt. */
  let mitAnhang = $state(true);
  const anhang = $derived(mitAnhang && (s.protokoll.length || s.datei?.eurostat) ? protokollAnhang(s.protokoll, s.datei) : undefined);

  /** Blätter, deren Spalten entfernt wurden, haben nur noch alte Zahlen: sie gehören nicht in den Bericht und werden nicht neu gerechnet (D12). */
  const fehlt = (b: Blatt) => fehlendeSpalten(b, s);
  const imBericht = (b: Blatt) => b.imBericht && !fehlt(b).length && !b.gesperrt;
  const im = $derived(s.blaetter.filter(imBericht));
  const text = berichtSatz;
  function schiebe(i: number, r: -1 | 1) {
    const a = [...s.blaetter], j = i + r; if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j]!, a[i]!]; s.blaetter = a; sichern();
    queueMicrotask(() => document.querySelector<HTMLElement>(`[data-schiebe="${a[j]!.id}${r}"]`)?.focus());
    melde(L(`„${a[j]!.titel}“ ist jetzt an Stelle ${j + 1}.`, `"${a[j]!.titel}" is now in position ${j + 1}.`));
  }
  /* ---------- Veraltete Blätter (Abnahme 4, B1) ----------
   * Hat sich ein Datenstand geändert, den ein Blatt benutzt, rechnet der Bericht das Blatt beim Öffnen und vor jedem Export neu (PSPP und eigener Code; R-Verfahren nur mit geladenem R).
   * Was nicht neu gerechnet werden kann, bleibt sichtbar als „veraltet“ gekennzeichnet - in der Vorschau und in Word, PDF und Excel. */
  const veraltet = $derived(veralteteVon(s.blaetter.filter(b => !fehlt(b).length), s));
  const veraltetIds = $derived(new Set(veraltet.map(b => b.id)));
  /** Pro Blatt und Datenstand nur ein Versuch, damit ein Blatt, das sich nicht rechnen lässt, nicht ständig neu angestoßen wird. */
  const versucht = new Set<string>();
  const auftraege = (nurNeue: boolean, mitR = false): Auftrag[] => veralteteVon(s.blaetter.filter(b => !fehlt(b).length), s)
    .filter(b => darfNeuRechnen(b.art, rStatus.bereit, mitR, b.zus, b.gewicht) && !(nurNeue && versucht.has(b.id + '|' + standVon(werteVon(b), s))))
    .sort((a, b) => Number(b.imBericht) - Number(a.imBericht))
    .map(b => { versucht.add(b.id + '|' + standVon(werteVon(b), s)); return { id: b.id, mitR }; });
  let neuGerechnet = $state(0);
  async function laufen(a: Auftrag[]) {
    if (!a.length) return;
    const vorher = a.filter(x => veraltetIds.has(x.id)).length;
    await neuRechnen(a);
    const nachher = veralteteVon(s.blaetter, s).filter(b => a.some(x => x.id === b.id)).length;
    neuGerechnet += vorher - nachher;
  }
  $effect(() => { void veraltet; untrack(() => { void laufen(auftraege(true)); }); });
  onDestroy(() => neuRechnenAbbrechen());
  const rechnetNeu = $derived(rechenstand.aktuell !== null);
  const nochOffen = $derived(Math.max(1, rechenstand.gesamt - rechenstand.fertig));
  /** Vor jedem Export: veraltete Blätter noch einmal neu rechnen (auch solche, die schon einmal gescheitert sind - die Daten können sich zurückgeändert haben). Danach weiß die Person, was veraltet bleibt. */
  async function vorExport() {
    await laufen(auftraege(false));
    const rest = veralteteVon(s.blaetter.filter(imBericht), s).length;
    if (rest) melde(Lp(rest, 'Ein Ergebnis ist veraltet und im Export gekennzeichnet.', `${rest} Ergebnisse sind veraltet und im Export gekennzeichnet.`, 'One result is outdated and marked in the export.', `${rest} results are outdated and marked in the export.`));
  }
  /** Export (Neu-Rechnen, Nachladen von Excel/Word/PDF, Erzeugen): Animation im Knopf, alle drei gesperrt, bis die Datei fertig ist. */
  const lad = new Laedt();
  let ladeWas = $state<'excel' | 'pdf-bf' | 'word' | 'r' | ''>('');
  const exportiere = (was: 'excel' | 'pdf-bf' | 'word' | 'r', f: () => Promise<void>) => { ladeWas = was; return lad.mit(f); };
  const frisch = () => s.blaetter.filter(imBericht);
  async function neuMitR(id: string) { versucht.delete(id); await laufen([{ id, mitR: true }]); }
  async function excel() { await vorExport(); const bl = frisch(); await exportiereErgebnisseExcel(bl.map(b => ({ titel: b.titel, text: text(b) || undefined, items: excelTabellen(b), veraltet: veraltetMarke(b) || undefined })), s.projekt?.name ?? 'Bericht', rechenText(bl)); }
  async function word() { await vorExport(); const bl = frisch(); await exportiereBerichtWord(bl, [stichprobenText(bl, s.zeilen.length, istEn())], `${L('Bericht', 'Report')} ${s.projekt?.name ?? ''}`, undefined, anhang, { integration: $state.snapshot(s.integration) }); }
  async function pdfBf() { await vorExport(); const bl = frisch(); const { druckeBerichtBarrierefrei } = await import('../lib/druckansicht'); await druckeBerichtBarrierefrei(bl, [stichprobenText(bl, s.zeilen.length, istEn())], `${L('Bericht', 'Report')} ${s.projekt?.name ?? ''}`, n => lesbar(s.spalten.find(x => x.name === n), true), anhang); }
  const stichprobe = $derived(stichprobenText(im, s.zeilen.length, istEn()));
  /* ---------- B1 Teil 2e: der ganze Bericht als ein R-Skript ---------- */
  /** Ein Blatt für das R-Skript; veraltete Blätter (alte Zahlen) zählen als „ohne Skript“. */
  const rBlatt = (b: Blatt): RBerichtBlatt => {
    const w = werteVon(b);
    return { erg: veraltetIds.has(b.id) ? null : (b.ergebnis as RErgebnis | null | undefined), ctx: { spalten: s.spalten, zeilen: s.zeilen, blattSpalten: [...w.l1, ...w.l2, ...w.l3, ...w.l4], titel: b.titel, datum: heute(), ...rGewichtFelder(b.gewicht, aktivesGewicht()) } };
  };
  const rMoeglich = $derived(im.some(b => { const x = rBlatt(b); return rSkriptMoeglich(x.erg, x.ctx); }));
  async function rSkript() {
    await vorExport();
    const titel = `${L('Bericht', 'Report')} ${s.projekt?.name ?? ''}`.trim();
    const res = baueRBericht(frisch().map(rBlatt), titel, heute());
    if (!res) { meldeFehler(L('Zu keinem Blatt im Bericht gibt es ein R-Skript.', 'There is no R script for any page in the report.')); return; }
    herunterladen(rSkriptZip(res), `${res.rName.replace(/.R$/, '')}.zip`, 'application/zip');
    melde(res.ohne.length
      ? Lp(res.ohne.length, `R-Skript mit Daten gespeichert (${res.rName}). Ein Blatt hat kein R-Skript und steht nur im Kopf des Skripts.`, `R-Skript mit Daten gespeichert (${res.rName}). ${res.ohne.length} Blätter haben kein R-Skript und stehen nur im Kopf des Skripts.`, `R script with data saved (${res.rName}). One page has no R script and is only listed at the top of the script.`, `R script with data saved (${res.rName}). ${res.ohne.length} pages have no R script and are only listed at the top of the script.`)
      : L(`R-Skript mit Daten gespeichert (${res.rName} und ${res.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${res.rName} and ${res.csvName}). You will find it in your downloads.`));
  }
</script>

{#snippet altHinweis(b: Blatt)}{#if veraltetIds.has(b.id) && !rechnetNeu}<p class="veraltet-hinweis" role="note"><b>{L('Veraltet', 'Outdated')}{dp()}</b> {L('Die Daten wurden nach dieser Rechnung geändert.', 'The data were changed after this calculation.')}{#if brauchtRBlatt(b.art, b.zus, b.gewicht) && !rStatus.bereit}{' '}{L('Dieses Verfahren braucht R.', 'This method needs R.')}{/if}{' '}<button class="k leise" type="button" onclick={() => neuMitR(b.id)}>{L('Neu rechnen', 'Recalculate')}</button>{#if rechenstand.gescheitert.includes(b.id)}{' '}{L('Mit den jetzigen Daten ließ es sich nicht rechnen.', 'It could not be calculated with the current data.')}{' '}<a href="#blatt/{b.id}">{L('Blatt öffnen', 'Open page')}</a>{/if}</p>{/if}{/snippet}
{#if !s.blaetter.length}
  <div class="tisch ohne-rand"><div class="leer-zustand"><Icon n="bericht" k="gross" /><h1>{L('Der Bericht ist noch leer', 'The report is still empty')}</h1><p>{d('Jede Frage, die du stellst, wird ein Blatt. Die Blätter, die du auswählst, ergeben hier deinen Bericht.', 'Jede Frage, die Sie stellen, wird ein Blatt. Die Blätter, die Sie auswählen, ergeben hier Ihren Bericht.', 'Every question you ask becomes a page. The pages you choose make up your report here.')}</p><a class="k haupt" href="#blatt/neu">{L('Erste Auswertung starten', 'Ask your first question')}</a></div></div>
{:else}
<div style="padding:0 var(--a4) var(--a3);">
  <SeitenKopf titel={L('Bericht', 'Report')} hilfe={{ id: 'bericht-seite', text: L('Hilfe zum Bericht', 'Help on the report') }}>
    {#snippet aktionen()}
  <button class="k" type="button" data-tipp={L('Die PSPP-Tabellen aller Blätter im Bericht in einer Excel-Datei', 'The PSPP tables of all pages in the report in one Excel file')} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={() => exportiere('excel', excel)}>{#if lad.sichtbar && ladeWas === 'excel'}<Rechnet imKnopf text={L('Wird geladen …', 'Loading …')} />{:else}<Icon n="download" />{L('Als Excel', 'As Excel')}{/if}</button>
  {#if rMoeglich}<button class="k" type="button" data-tipp={L('Alle Blätter des Berichts als ein R-Skript mit den Daten (CSV) zum Nachrechnen in R. Blätter mit anderen Verfahren stehen nur im Kopf des Skripts.', 'All pages of the report as one R script with the data (CSV) to recalculate in R. Pages with other methods are only listed at the top of the script.')} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={() => exportiere('r', rSkript)}>{#if lad.sichtbar && ladeWas === 'r'}<Rechnet imKnopf text={L('Wird geladen …', 'Loading …')} />{:else}<Icon n="download" />{L('Als R-Skript (.zip)', 'As R script (.zip)')}{/if}</button>{/if}
  <button class="k" type="button" data-tipp={L('Der Bericht als getaggtes PDF: öffnet die Druckansicht, dort „Als PDF speichern“ wählen. Nicht PDF/UA-konform; der barrierefreie Weg ist die Word-Datei.', 'The report as a tagged PDF: opens the print view, choose "Save as PDF" there. Not PDF/UA conformant; the accessible route is the Word file.')} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={() => exportiere('pdf-bf', pdfBf)}>{#if lad.sichtbar && ladeWas === 'pdf-bf'}<Rechnet imKnopf text={L('Wird geladen …', 'Loading …')} />{:else}<Icon n="download" />{L('Als PDF (über Drucken)', 'As PDF (via Print)')}{/if}</button>
  <button class="k haupt" type="button" data-tipp={L('Der Bericht als Word-Datei zum Weiterschreiben, Tabellen im APA-Stil', 'The report as a Word file to keep editing, tables in APA style')} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={() => exportiere('word', word)}>{#if lad.sichtbar && ladeWas === 'word'}<Rechnet imKnopf text={L('Wird geladen …', 'Loading …')} />{:else}<Icon n="download" />{L('Als Word-Datei', 'As Word file')}{/if}</button><span class="nur-vorleser" role="status">{lad.sichtbar ? L('Wird geladen …', 'Loading …') : ''}</span>
    {/snippet}
  </SeitenKopf>
  <label class="schalter" style="margin-bottom:var(--a3)" data-tipp={L('Word-Bericht: Beschreibung und Datentabelle stehen nach jedem Diagramm im Text. Der Alternativtext am Bild (für Screenreader) bleibt immer.', 'Word report: description and data table follow every chart in the text. The alt text on the image (for screen readers) always stays.')}><input type="checkbox" checked={s.einst.wordBildbeschreibungen !== false} onchange={(e) => { s.einst.wordBildbeschreibungen = (e.currentTarget as HTMLInputElement).checked; einstSpeichern(); }}><span>{L('Bildbeschreibungen im Text', 'Image descriptions in the text')}</span></label>
  <details class="auf integration" style="margin-bottom:var(--a3)" open={integrationAusgefuellt(s.integration) || undefined}><summary>{L('Integration der Daten (Mixed Methods)', 'Integration of the data (mixed methods)')}</summary>
    <p class="klein-hinweis" style="margin:var(--a2) 0">{L('Nur für Arbeiten, die Zahlen und Texte verbinden. Die Antworten kommen als eigener Abschnitt in den Word-Bericht, wenn mindestens eine ausgefüllt ist.', 'Only for work that combines numbers and texts. The answers go into the Word report as a section of their own if at least one is filled in.')}</p>
    {#each INTEGRATION_FELDER as f (f)}
      <div class="eingabe"><label for="int-{f}">{integrationFrage(f)}</label><textarea id="int-{f}" rows="3" maxlength={INTEGRATION_MAX} value={s.integration[f] ?? ''} onchange={(ev) => { setzeIntegration(f, ev.currentTarget.value); sage(L('Integration gespeichert.', 'Integration saved.')); }}></textarea></div>
    {/each}
  </details>
  {#if s.protokoll.length}<label class="schalter" style="margin-bottom:var(--a3)"><input type="checkbox" bind:checked={mitAnhang}><span>{L('Anhang: Protokoll der Datenänderungen', 'Appendix: log of data changes')}</span></label>{/if}
  <p style="color:var(--tinte-2);margin-bottom:var(--a4)">{Lp(s.blaetter.length, `Das Heft hat ${s.blaetter.length} Blatt, ${im.length} davon im Bericht.`, `Das Heft hat ${s.blaetter.length} Blätter, ${im.length} davon im Bericht.`, `Your notebook has ${s.blaetter.length} page, ${im.length} of them in the report.`, `Your notebook has ${s.blaetter.length} pages, ${im.length} of them in the report.`)} {d('Rechts siehst du, wie er aussieht.', 'Rechts sehen Sie, wie er aussieht.', 'On the right you can see what it looks like.')}</p>
  <p style="color:var(--tinte-2);margin-bottom:var(--a4)">{d('Statable schlägt für jedes Blatt die passenden Tabellen und einen Satz vor. Was wirklich im Bericht steht, bestimmst du: Auf dem Blatt hat jede Tabelle im Menü „Export“ den Eintrag „Im Bericht“, auch die „Weiteren Auswertungen“ lassen sich dazuwählen.', 'Statable schlägt für jedes Blatt die passenden Tabellen und einen Satz vor. Was wirklich im Bericht steht, bestimmen Sie: Auf dem Blatt hat jede Tabelle im Menü „Export“ den Eintrag „Im Bericht“, auch die „Weiteren Auswertungen“ lassen sich dazuwählen.', 'Statable suggests the fitting tables and a sentence for every page. You decide what really goes into the report: on the page every table has the entry "In report" in its "Export" menu, and the "More results" can be added too.')}</p>
  <div class="neu-status" role="status" aria-live="polite">{#if rechnetNeu}<p class="neu-rechnet"><Rechnet />{Lp(nochOffen, `${nochOffen} Ergebnis wird neu gerechnet …`, `${nochOffen} Ergebnisse werden neu gerechnet …`, `${nochOffen} result is being recalculated …`, `${nochOffen} results are being recalculated …`)} <span class="klein-hinweis">{L('Die Daten haben sich seit der Rechnung geändert.', 'The data have changed since it was calculated.')}</span></p>{:else if neuGerechnet}<p class="neu-fertig">{Lp(neuGerechnet, `${neuGerechnet} Ergebnis wurde neu gerechnet, weil sich die Daten geändert haben.`, `${neuGerechnet} Ergebnisse wurden neu gerechnet, weil sich die Daten geändert haben.`, `${neuGerechnet} result was recalculated because the data had changed.`, `${neuGerechnet} results were recalculated because the data had changed.`)}</p>{/if}</div></div>
{#if rechenstand.aktuell}{@const a = rechenstand.aktuell}{#key a.id}<div class="rechenknecht" aria-hidden="true" inert><BlattSeite id={a.id} nurRechnen mitR={a.mitR} ende={ok => ende(a.id, ok)} /></div>{/key}{/if}
<div class="bericht">
  <ol style="list-style:none;margin:0;padding:0;display:grid;gap:var(--a3)" aria-label={L('Blätter in der Reihenfolge des Berichts', 'Pages in report order')}>
    {#each s.blaetter as b, i (b.id)}
      <li class="bericht-karte" class:aus={!imBericht(b)}>
        <div class="reihenfolge"><button class="k leise nur-symbol" type="button" data-schiebe="{b.id}-1" aria-label={L(`${b.titel} nach oben`, `Move ${b.titel} up`)} aria-disabled={i === 0 ? 'true' : undefined} onclick={() => schiebe(i, -1)}><Icon n="hoch" /></button><button class="k leise nur-symbol" type="button" data-schiebe="{b.id}1" aria-label={L(`${b.titel} nach unten`, `Move ${b.titel} down`)} aria-disabled={i === s.blaetter.length - 1 ? 'true' : undefined} onclick={() => schiebe(i, 1)}><Icon n="runter" /></button></div>
        <div><h3><a href="#blatt/{b.id}">{b.titel}</a></h3></div>
        <label class="schalter" data-tipp={L('Nimmt dieses Blatt in den Bericht auf oder lässt es weg', 'Includes this page in the report or leaves it out')}><input type="checkbox" bind:checked={b.imBericht} onchange={() => sichern()}><span class="nur-vorleser">{b.titel}: </span>{L('Im Bericht', 'In report')}</label>
        {@render altHinweis(b)}
        {#if fehlt(b).length}{@const liste = fehlt(b).map(n => zitat(n)).join(', ')}<p class="veraltet-hinweis" role="note"><b>{Lp(fehlt(b).length, `Die Spalte ${liste} gibt es nicht mehr.`, `Die Spalten ${liste} gibt es nicht mehr.`, `The column ${liste} no longer exists.`, `The columns ${liste} no longer exist.`)}</b> {L('Das Blatt bleibt aus dem Bericht.', 'The page is left out of the report.')} <a href="#blatt/{b.id}">{L('Blatt öffnen', 'Open page')}</a></p>{:else if b.gesperrt}<p class="veraltet-hinweis" role="note"><b>{L('Diese Frage lässt sich zurzeit nicht rechnen.', 'This question cannot be calculated at the moment.')}</b> {L('Das Blatt bleibt aus dem Bericht.', 'The page is left out of the report.')} <a href="#blatt/{b.id}">{L('Blatt öffnen', 'Open page')}</a></p>{:else}
        <p class="vorschau">{#if text(b)}<Kursiv text={text(b)} />{:else}{L('Tabellen von PSPP.', 'Tables from PSPP.')}{/if}</p>{/if}
        <div class="eingabe"><label for="n-{b.id}">{d('Deine Notiz dazu (kommt in den Bericht)', 'Ihre Notiz dazu (kommt in den Bericht)', 'Your note on this (goes into the report)')}</label><textarea id="n-{b.id}" bind:value={b.notiz} oninput={() => sichern()}></textarea></div>
      </li>
    {/each}
  </ol>
  <div class="papier" aria-label={L('Vorschau des Berichts', 'Report preview')}>
    <h2 style="margin-top:0">{L('Ergebnisse', 'Results')}</h2>
    <p>{stichprobe.text}</p>
    {#each im as b (b.id)}
      {@render altHinweis(b)}
      {#if text(b)}<p><Kursiv text={text(b)} /></p>{/if}
      {#if b.notiz}<p class="notiz-zitat">{b.notiz}</p>{/if}
      <Ausgabe items={berichtTabellen(b).slice(0, 20)} nurTabellen ohneMenue />
    {/each}
    {#if integrationAusgefuellt(s.integration)}
      <h2>{L('Integration der Daten (Mixed Methods)', 'Integration of the data (mixed methods)')}</h2>
      {#each INTEGRATION_FELDER as f (f)}{#if s.integration[f]?.trim()}<h3>{integrationFrage(f)}</h3><p>{s.integration[f]}</p>{/if}{/each}
    {/if}
    {#if anhang}
      <h2>{anhang.titel}</h2>
      <div class="anhang-huelle"><table class="anhang"><thead><tr>{#each anhang.kopf as k}<th scope="col">{k}</th>{/each}</tr></thead><tbody>{#each anhang.zeilen as z}<tr>{#each z as c}<td>{c}</td>{/each}</tr>{/each}</tbody></table></div>
    {/if}
  </div>
</div>
{/if}

<style>
  .rechenknecht { display: none; }
  .neu-status:empty { display: none; }
  .neu-status p { margin: 0 0 var(--a3); display: flex; gap: var(--a2); align-items: center; flex-wrap: wrap; padding: var(--a2) var(--a3); border-radius: var(--r-klein); background: var(--akzent-hell); color: var(--akzent-tinte); }
  .klein-hinweis { color: var(--tinte-2); }
  /* Die Vorschau ist immer weißes Papier, auch im Dunkelmodus: eigene Farben */
  .papier :global(.veraltet-hinweis) { text-indent: 0; background: #F2EAF6; color: #4F2D63; border-inline-start-color: #7B4F8E; }
  .papier :global(.veraltet-hinweis .k) { color: #0B5C52; }
  .bericht-karte :global(.veraltet-hinweis) { grid-column: 2 / 4; }
  .veraltet-hinweis { margin: var(--a2) 0 0; padding: var(--a2) var(--a3); border-inline-start: 3px solid var(--hinweis-linie); background: var(--hinweis-hell); color: var(--hinweis); border-radius: var(--r-klein); }
  /* Vorschau: breite Tabellen scrollen waagerecht in ihrer eigenen Box, statt am Rand abgeschnitten zu werden. */
  .papier :global(.ausgabe-tabelle) { overflow-x: auto; max-width: 100%; margin-bottom: 14px; }
  .papier :global(.ausgabe-tabelle table.apa) { font-size: 13px; }
  .papier :global(.ausgabe-tabelle p.anmerkung) { font-size: 12.5px; }
  /* Blattkarte: der Satz bestimmt die Höhe, kein Leerraum darüber oder darunter. */
  :global(.bericht > ol) { align-content: start; }
  .papier :global(p.anmerkung) { text-indent: 0; }
  .anhang-huelle { overflow-x: auto; max-width: 100%; }
  .anhang { border-collapse: collapse; font-size: 12px; width: 100%; }
  .anhang th, .anhang td { text-align: start; vertical-align: top; padding: 2px 6px; border-bottom: 1px solid #ccc; overflow-wrap: anywhere; }
  .bericht-karte :global(.vorschau) { margin: 0; }
</style>
