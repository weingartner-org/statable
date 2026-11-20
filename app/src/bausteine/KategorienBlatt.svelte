<script lang="ts" module>
  /** Rückgängig innerhalb des Blatts: Schnappschüsse der Kategorien und Zuordnung je Blatt (nur im Speicher, nicht in der Projektdatei). */
  const STAPEL = new Map<string, string[]>();
</script>

<script lang="ts">
  /**
   * Das Blatt „Offene Antworten ordnen“ (Welle 4, G7): Kategorien anlegen, Antworten zuordnen, zählen, auf Wunsch als Spalten in die Daten übernehmen.
   * Zustand im Blatt (`blatt.kat`, Projektdatei); Logik in lib/kategorisieren.ts und lib/kategorienblatt.ts. Kein Test, keine KI.
   */
  import { untrack } from 'svelte';
  import { s, L, Lp, d, melde, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { HINWEIS_NICHT_VERWENDET } from '../lib/gewichte';
  import { zitat } from '../i18n/profil';
  import { schliessen } from '../lib/blattentfernen.svelte';
  import { haeufigkeiten, zustaende } from '../lib/kategorisieren';
  import { anzeige, antwortenVon, bezeichnungVon, sicht } from '../lib/kategorienblatt';
  import { saetzeKategorien, tabellenKategorien } from '../lib/kategoriensaetze';
  import { exportiereBerichtWord, exportiereErgebnisseExcel } from '../lib/export';
  import { rechenText } from '../lib/eigenercode';
  import Icon from './Icon.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import ExportMenue, { type ExportEintrag } from './ExportMenue.svelte';
  import KategorienLeitfaden from './KategorienLeitfaden.svelte';
  import KategorienZuordnen from './KategorienZuordnen.svelte';
  import KategorienErgebnis from './KategorienErgebnis.svelte';
  import KategorienThemen from './KategorienThemen.svelte';

  let { blatt }: { blatt: Blatt } = $props();
  const kb = $derived(blatt.kat);

  /** Welche Kodierung gerade bearbeitet wird; bei der zweiten ist die erste Zuordnung verborgen. */
  let aktiv = $state<1 | 2>(1);
  let rueckZahl = $state(STAPEL.get(untrack(() => blatt.id))?.length ?? 0);

  const spalteDa = $derived(!!kb && s.spalten.some(x => x.name === kb.spalte));
  const antw = $derived(kb && spalteDa ? antwortenVon(kb) : []);
  const anz = $derived(kb ? anzeige(kb) : null);
  const z = $derived(kb ? sicht(kb, kb.zuordnung2 ? aktiv : 1) : null);
  const zs = $derived(z ? zustaende(antw, z) : []);
  const h = $derived(z ? haeufigkeiten(antw, z) : null);

  /** Das gespeicherte Ergebnis (für Bericht und Export) bleibt der Stand von Kategorien, Zuordnung und Daten. */
  function ergebnisAktualisieren() {
    if (!kb || !anz) return;
    const neu = { typ: 'kategorien', e: $state.snapshot(anz) };
    if (JSON.stringify(neu) !== JSON.stringify($state.snapshot(blatt.ergebnis))) { blatt.ergebnis = neu; void sichern(); }
  }
  $effect(() => { void anz; untrack(ergebnisAktualisieren); });

  const schnappschuss = () => JSON.stringify({ z: $state.snapshot(kb!.z), z2: $state.snapshot(kb!.zuordnung2) ?? null });
  /** Eine Änderung ausführen: vorher den Stand merken (Rückgängig), danach Ergebnis und Projekt aktualisieren. */
  function tue(f: () => void) {
    if (!kb) return;
    const st = STAPEL.get(blatt.id) ?? [];
    st.push(schnappschuss()); if (st.length > 200) st.shift();
    STAPEL.set(blatt.id, st); rueckZahl = st.length;
    f();
    void sichern();
  }
  function zurueck() {
    const st = STAPEL.get(blatt.id); const letzter = st?.pop();
    if (!kb || !letzter) return;
    rueckZahl = st!.length;
    const alt = JSON.parse(letzter) as { z: typeof kb.z; z2: typeof kb.zuordnung2 | null };
    kb.z.kategorien = alt.z.kategorien; kb.z.mehrfach = alt.z.mehrfach; kb.z.zuordnung = alt.z.zuordnung;
    kb.zuordnung2 = alt.z2 ?? undefined;
    if (!kb.zuordnung2) aktiv = 1;
    void sichern();
    ansagen(L('Rückgängig gemacht.', 'Undone.'));
  }
  const ansagen = (text: string) => { sage(text); };

  const saetze = $derived(anz ? saetzeKategorien(anz) : null);
  /** Word, PDF und Excel wie bei allen Blättern (Tabellen aus dem gespeicherten Ergebnis). */
  const blattExport = $derived<ExportEintrag[]>([
    { id: 'word', text: L('Als Word-Datei', 'As Word file'), tun: async () => { ergebnisAktualisieren(); await exportiereBerichtWord([blatt], [], blatt.titel, `${blatt.titel} - ${L('Ergebnisse', 'Results')}`); } },
    { id: 'pdf-bf', text: L('Als PDF (über Drucken)', 'As PDF (via Print)'), tun: async () => { ergebnisAktualisieren(); const { druckeBerichtBarrierefrei } = await import('../lib/druckansicht'); await druckeBerichtBarrierefrei([blatt], [], blatt.titel, n => s.spalten.find(x => x.name === n)?.bezeichnung || n); } },
    { id: 'excel', text: L('Als Excel-Datei', 'As Excel file'), tun: async () => { ergebnisAktualisieren(); await exportiereErgebnisseExcel([{ titel: blatt.titel, text: saetze ? `${saetze.haupt} ${saetze.zusatz.replace(/\n/g, ' ')}` : undefined, items: anz ? tabellenKategorien(anz) : [] }], blatt.titel, rechenText([blatt])); } }
  ]);
</script>

<div class="tisch ohne-rand"><article class="blatt" aria-labelledby="blatt-t">
  <div class="blatt-kopf"><h1 id="blatt-t">{blatt.titel}</h1>
    <label class="schalter"><input type="checkbox" bind:checked={blatt.imBericht} onchange={() => { void sichern(); melde(blatt.imBericht ? L('Im Bericht.', 'In the report.') : L('Nicht mehr im Bericht. Das Blatt bleibt im Heft.', 'No longer in the report. The page stays in your notebook.')); }}>{L('Im Bericht', 'In report')}</label>
    <button class="k leise" type="button" disabled={!rueckZahl} onclick={zurueck}><Icon n="rueck" />{L('Rückgängig', 'Undo')}{#if rueckZahl}{' '}({rueckZahl}){/if}</button></div>
  {#if s.gewicht}<p class="heft-text" role="note">{HINWEIS_NICHT_VERWENDET()}</p>{/if}

  {#if !kb || !h || !z || !anz}
    <p class="heft-text" role="alert">{L('Zu diesem Blatt fehlt der Stand der Kategorien. Es lässt sich nicht öffnen.', 'The state of the categories is missing for this page. It cannot be opened.')}</p>
  {:else if !spalteDa}
    <p class="fehlt-hinweis" role="alert"><b>{L(`Die Spalte ${zitat(kb.spalte)} gibt es nicht mehr.`, `The column ${zitat(kb.spalte)} no longer exists.`)}</b> {L('Die Kategorien und Zuordnungen bleiben im Blatt gespeichert, lassen sich aber ohne die Spalte nicht zuordnen oder übernehmen.', 'The categories and assignments stay saved in the page but cannot be assigned or written to the data without the column.')}</p>
  {:else}
  <section class="feld" aria-label={L('Schritt 1', 'Step 1')}><span class="nr fertig" aria-hidden="true"><Icon n="haken" /></span><div><h2 id="f1-t" tabindex="-1">{d('Deine Frage', 'Ihre Frage', 'Your question')}</h2><div class="feld-inhalt">
    <p class="lueckensatz kompakt">{L('Ich möchte die offenen Antworten der Spalte ', 'I want to sort the open answers of the column ')}<u>{bezeichnungVon(kb)}</u>{L(' in Kategorien ordnen.', ' into categories.')}</p>
    <p class="heft-text" style="margin-top:var(--a2)">{Lp(h.nZeilen - h.nLeer, `${h.nZeilen - h.nLeer} Antwort mit Text, ${h.nZeilen} Zeilen insgesamt.`, `${h.nZeilen - h.nLeer} Antworten mit Text, ${h.nZeilen} Zeilen insgesamt.`, `${h.nZeilen - h.nLeer} answer with text, ${h.nZeilen} rows in total.`, `${h.nZeilen - h.nLeer} answers with text, ${h.nZeilen} rows in total.`)}
      {#if kb.kennung}{L(`Die Zeilen werden über die Spalte ${zitat(kb.kennung)} erkannt.`, `Rows are recognised by the column ${zitat(kb.kennung)}.`)}
      {:else}{L('Ohne Kennungsspalte merkt sich Statable die Zeilen nach ihrer Nummer; Zeilen löschen oder umsortieren verschiebt dann die Zuordnung.', 'Without an ID column Statable remembers the rows by their number; deleting or re-sorting rows then shifts the assignment.')}{/if}
      <HilfeLink id="frage-kategorien" text={L('Hilfe: Offene Antworten ordnen', 'Help: ordering open answers')} /></p>
  </div></div></section>

  <section class="feld" aria-label={L('Schritt 2', 'Step 2')}><span class="nr" aria-hidden="true">2</span><div><h2 id="f2-t" tabindex="-1">{L('Kategorien', 'Categories')}</h2><div class="feld-inhalt">
    <KategorienLeitfaden {kb} {h} {tue} {ansagen} />
  </div></div></section>

  <section class="feld" aria-label={L('Schritt 3', 'Step 3')}><span class="nr" aria-hidden="true">3</span><div><h2 id="f3-t" tabindex="-1">{L('Antworten zuordnen', 'Assign answers')}</h2><div class="feld-inhalt">
    {#if kb.zuordnung2}
      <div class="kb-kodierung">
        <div class="segment" role="group" aria-label={L('Welche Kodierung', 'Which coding')}>
          <label><input type="radio" name="kb-kodierung" checked={aktiv === 1} onchange={() => (aktiv = 1)}>{L('Erste Kodierung', 'First coding')}</label>
          <label><input type="radio" name="kb-kodierung" checked={aktiv === 2} onchange={() => (aktiv = 2)}>{L('Zweite Kodierung', 'Second coding')}</label>
        </div>
        <p class="hilfe">{aktiv === 2 ? L('Zu sehen ist nur die Zuordnung der zweiten Kodierung; die erste ist verborgen.', 'Only the assignment of the second coding is shown; the first one is hidden.') : L('Zu sehen ist die erste Kodierung. Für die zweite Person zur zweiten Kodierung wechseln: Dort ist die erste verborgen.', 'The first coding is shown. For the second person switch to the second coding: there the first one is hidden.')}</p>
      </div>
    {/if}
    <KategorienZuordnen {z} {antw} {zs} {tue} {ansagen} />
  </div></div></section>

  <section class="feld" aria-label={L('Schritt 4', 'Step 4')}><span class="nr" aria-hidden="true">4</span><div><h2 id="f4-t" tabindex="-1">{L('Ergebnis', 'Result')}</h2><div class="feld-inhalt">
    <p class="ergebnis-satz">{saetze?.haupt}</p>
    <KategorienErgebnis {blatt} {anz} {h} {aktiv} setzeAktiv={(nr) => (aktiv = nr)} {tue} {ansagen} />
    <KategorienThemen {blatt} {z} {antw} {zs} />
    <div class="knopfzeile" style="margin:var(--a3) 0"><ExportMenue eintraege={blattExport} name={`${L('ganzes Blatt', 'whole page')}: ${blatt.titel}`} /></div>
    <details class="auf"><summary>{L('Notiz und Blatt', 'Note and page')}</summary>
      <div class="eingabe" style="margin:var(--a2) 0"><label for="notiz">{d('Deine Notiz (kommt in den Bericht)', 'Ihre Notiz (kommt in den Bericht)', 'Your note (goes into the report)')}</label><textarea id="notiz" bind:value={blatt.notiz} oninput={() => sichern()}></textarea></div>
      <button class="k leise" type="button" onclick={() => (schliessen.offen = { id: blatt.id, titel: blatt.titel })}>{L('Blatt entfernen', 'Remove page')}</button></details>
  </div></div></section>
  {/if}
</article></div>

<style>
  .kb-kodierung { display: flex; flex-direction: column; gap: var(--a2); margin-bottom: var(--a3); }
  .kb-kodierung .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); max-width: 62ch; }
</style>
