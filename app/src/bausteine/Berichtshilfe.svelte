<script lang="ts">
  /**
   * Berichtshilfe (Stufe A5): COREQ oder SRQR in eigener Kurzfassung als echte Tabelle (Fachblatt Berichtshilfe, Abschnitt 4).
   * Die Person setzt je Punkt den Stand; Statable zeigt nur Hinweise aus dem Projekt („Statable weiß“) mit Sprung und setzt nie „erfüllt“.
   * Keine Gesamtnote, nur „x von n bearbeitet“ und „noch offen“. Rechnet in `lib/berichtshilfe.ts`. Keine eigenen Live-Regionen, Ansagen über `sage`.
   */
  import { L, s } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { aendere, sprache } from '../lib/kodieren.svelte';
  import { herunterladen } from '../lib/export';
  import { BERICHT_LISTEN, DOI, berichtHinweise, berichtshilfeWord, listeName, punktStand, punkteDerListe, quelleText, setzeBerichtPunkt, standText, zaehlung } from '../lib/berichtshilfe';
  import { BERICHT_STAENDE, type BerichtListe, type BerichtPunktStand, type QualProjekt } from '../lib/qualprojekt';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    /** das ganze Projekt (die Berichtshilfe betrifft die ganze Studie) */
    q: QualProjekt;
    /** Einzelfall-Modus an: verdeckt, weil Hinweise und Notizen andere Fälle zusammenfassen */
    einzelAn: boolean;
  }
  let { q, einzelAn }: Props = $props();

  const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const word = new Laedt();

  let liste = $state<BerichtListe>('coreq');
  let nurOffen = $state(false);
  /** Bei „nur noch offene“ gilt die Auswahl vom Moment des Einschaltens: Eine Zeile verschwindet nicht, während man in ihr arbeitet. */
  let offenFest = $state<Set<string>>(new Set());

  const punkte = $derived(punkteDerListe(liste));
  const zeilen = $derived(nurOffen ? punkte.filter(p => offenFest.has(p.kennung)) : punkte);
  const tipps = $derived(berichtHinweise(q, { leitfaeden: s.leitfaeden.length }));
  const z = $derived(zaehlung(q, liste));
  const zahlText = $derived(L(`${z.bearbeitet} von ${z.n} Punkten bearbeitet, ${z.nochOffen} noch offen.`, `${z.bearbeitet} of ${z.n} items worked on, ${z.nochOffen} still open.`));

  function merkeOffene() {
    offenFest = new Set(punkte.filter(p => { const st = punktStand(q, liste, p.kennung)?.stand; return !st || st === 'offen'; }).map(p => p.kennung));
  }
  function waehleListe(l: BerichtListe) {
    liste = l;
    if (nurOffen) merkeOffene();
    sage(L(`Liste gewählt: ${listeName(l)}. ${zahlText}`, `List chosen: ${listeName(l)}. ${zahlText}`));
  }
  function schalteFilter(an: boolean) {
    nurOffen = an;
    if (an) merkeOffene();
    sage(an ? L(`${offenFest.size} offene Punkte werden gezeigt.`, `${offenFest.size} open items are shown.`) : L(`Alle ${punkte.length} Punkte werden gezeigt.`, `All ${punkte.length} items are shown.`));
  }

  function setzeStand(kennung: string, nummer: string, stand: BerichtPunktStand) {
    aendere(L(`Stand von Punkt ${nummer} zurückgenommen`, `Status of item ${nummer} undone`), q0 => setzeBerichtPunkt(q0, liste, kennung, { stand }));
    sage(L(`Punkt ${nummer}: ${standText(stand)}.`, `Item ${nummer}: ${standText(stand)}.`));
  }
  /** Fundstelle oder Notiz beim Verlassen des Felds speichern. Ohne Stand setzt Statable „Offen“ (nie „Erfüllt“) und sagt das an, damit nichts verloren geht. */
  function speichereText(kennung: string, nummer: string, feld: 'fundstelle' | 'notiz', wert: string) {
    const alt = punktStand(q, liste, kennung);
    if ((alt?.[feld] ?? '') === wert.trim()) return;
    if (!alt && !wert.trim()) return;
    aendere(L(`Text bei Punkt ${nummer} zurückgenommen`, `Text at item ${nummer} undone`), q0 => setzeBerichtPunkt(q0, liste, kennung, { [feld]: wert, ...(alt ? {} : { stand: 'offen' as const }) }));
    const was = feld === 'fundstelle' ? L('Fundstelle', 'Location') : L('Notiz', 'Note');
    sage(alt ? L(`Punkt ${nummer}: ${was} gespeichert.`, `Item ${nummer}: ${was.toLowerCase()} saved.`)
      : L(`Punkt ${nummer}: ${was} gespeichert, Stand auf „Offen“ gesetzt.`, `Item ${nummer}: ${was.toLowerCase()} saved, status set to "Open".`));
  }

  const dateiname = (): string => {
    const n = (q.name || 'Statable').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Statable';
    return `${n} - ${liste === 'coreq' ? 'COREQ' : 'SRQR'}.docx`;
  };
  async function wordSpeichern() {
    await word.mit(async () => {
      const name = dateiname();
      herunterladen(await berichtshilfeWord(q, liste, sprache()), name, WORD);
      sage(L(`${name} wird heruntergeladen.`, `${name} is being downloaded.`));
    });
  }
</script>

<div class="bh">
  <h3 id="ko-bh-t" tabindex="-1" data-nolink>{L('Was muss in meinen Methodenteil? (Berichtshilfe COREQ, SRQR)', 'What belongs in my methods section? (Reporting checklist COREQ, SRQR)')}</h3>
  {#if einzelAn}
    <p class="hilfe">{L('Die Berichtshilfe fasst die ganze Studie zusammen. Im Einzelfall-Modus ist sie verdeckt, damit Sie nichts aus anderen Fällen sehen. Verlassen Sie den Einzelfall-Modus, um weiterzuarbeiten.', 'The reporting checklist summarises the whole study. In single-case mode it is hidden so that you see nothing from other cases. Leave the mode to continue.')}</p>
  {:else}
    <p class="hilfe">{L('Sie prüfen selbst, was Ihr Bericht schon enthält. Statable setzt nichts für Sie und bildet keine Gesamtnote: Die Liste zeigt, was berichtet ist, nicht, ob die Studie gut ist. Was Statable im Projekt sieht, steht als Hinweis in der Spalte „Statable weiß“.', 'You check yourself what your report already contains. Statable sets nothing for you and forms no overall score: the list shows what is reported, not whether the study is good. What Statable sees in the project is shown as a note in the column "Statable knows".')}</p>

    <fieldset class="auswahl">
      <legend>{L('Welche Liste?', 'Which list?')}</legend>
      {#each BERICHT_LISTEN as l (l)}
        <label class="radio"><input type="radio" name="ko-bh-liste" value={l} checked={liste === l} onchange={() => waehleListe(l)}>{listeName(l)}</label>
      {/each}
    </fieldset>
    <p class="hilfe" id="ko-bh-quelle">{quelleText(liste)} <a href={DOI[liste]} target="_blank" rel="noopener noreferrer">{L('Originalartikel (DOI)', 'Original article (DOI)')}</a></p>
    <p id="ko-bh-zahl">{zahlText}</p>
    <label class="radio"><input type="checkbox" id="ko-bh-filter" checked={nurOffen} onchange={(e) => schalteFilter(e.currentTarget.checked)}>{L('Nur noch offene Punkte zeigen', 'Show only items still open')}</label>
    <!-- Word-Knopf über der Tabelle: dahinter lägen fast 100 Tab-Stopps (Erstnutzer-Probe A5) -->
    <div class="knopfzeile">
      <button class="k" id="ko-bh-word" type="button" aria-disabled={word.aktiv ? 'true' : undefined} onclick={() => { if (!word.aktiv) void wordSpeichern(); }}><Icon n="download" />{L(`${liste === 'coreq' ? 'COREQ' : 'SRQR'} als Word-Anhang speichern`, `Save ${liste === 'coreq' ? 'COREQ' : 'SRQR'} as Word appendix`)}</button>
    </div>
    {#if word.sichtbar}<p class="hilfe"><Rechnet text={L('Word-Datei wird erzeugt …', 'Creating the Word file …')} /></p>{/if}

    {#if !zeilen.length}
      <p class="hilfe">{L('Kein Punkt ist mehr offen.', 'No item is open any more.')}</p>
    {:else}
      <div class="tabelle-rahmen" role="region" tabindex="0" aria-label={L(`Berichtshilfe ${liste === 'coreq' ? 'COREQ' : 'SRQR'}`, `Reporting checklist ${liste === 'coreq' ? 'COREQ' : 'SRQR'}`)}>
        <table class="tab">
          <caption>{L(`${liste === 'coreq' ? 'COREQ' : 'SRQR'}: Punkt, Stand, Fundstelle, Notiz und was Statable weiß`, `${liste === 'coreq' ? 'COREQ' : 'SRQR'}: item, status, location, note and what Statable knows`)}</caption>
          <thead>
            <tr>
              <th scope="col">{L('Nr.', 'No.')}</th>
              <th scope="col">{L('Punkt', 'Item')}</th>
              <th scope="col">{L('Stand', 'Status')}</th>
              <th scope="col">{L('Fundstelle (Seite in der Arbeit)', 'Location (page in your work)')}</th>
              <th scope="col">{L('Notiz', 'Note')}</th>
              <th scope="col">{L('Statable weiß', 'Statable knows')}</th>
            </tr>
          </thead>
          <tbody>
            {#each zeilen as p, i (p.kennung)}
              {@const st = punktStand(q, liste, p.kennung)}
              {#if i === 0 || zeilen[i - 1]!.bereich() !== p.bereich()}
                <tr class="bereich"><th scope="colgroup" colspan="6">{p.bereich()}</th></tr>
              {/if}
              <tr id="ko-bh-{p.kennung}">
                <th scope="row">{p.nummer}</th>
                <td>{p.text()} <span class="begriff">({p.begriff})</span></td>
                <td>
                  <fieldset class="stand">
                    <legend class="nur-sr">{L(`Stand zu Punkt ${p.nummer}: ${p.text()}`, `Status of item ${p.nummer}: ${p.text()}`)}</legend>
                    {#each BERICHT_STAENDE as x (x)}
                      <label class="radio"><input type="radio" name="ko-bh-{liste}-{p.kennung}" value={x} checked={st?.stand === x} onchange={() => setzeStand(p.kennung, p.nummer, x)}>{standText(x)}</label>
                    {/each}
                  </fieldset>
                </td>
                <td>
                  <label class="nur-sr" for="ko-bh-f-{p.kennung}">{L(`Fundstelle zu Punkt ${p.nummer}`, `Location for item ${p.nummer}`)}</label>
                  <input id="ko-bh-f-{p.kennung}" type="text" value={st?.fundstelle ?? ''} onchange={(e) => speichereText(p.kennung, p.nummer, 'fundstelle', e.currentTarget.value)}>
                </td>
                <td>
                  <label class="nur-sr" for="ko-bh-n-{p.kennung}">{L(`Notiz zu Punkt ${p.nummer}`, `Note for item ${p.nummer}`)}</label>
                  <textarea id="ko-bh-n-{p.kennung}" rows="2" value={st?.notiz ?? ''} onchange={(e) => speichereText(p.kennung, p.nummer, 'notiz', e.currentTarget.value)}></textarea>
                </td>
                <td>
                  {#each tipps[p.kennung] ?? [] as t (t.text)}
                    <p class="tipp">{t.text}{#if t.ziel} <a href="#{t.ziel}">{t.zielText}</a>{/if}</p>
                  {/each}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<style>
  .bh { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); overflow-wrap: anywhere; }
  p { margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); }
  .auswahl { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .auswahl legend { padding: 0; margin-bottom: var(--a2); font-weight: 600; }
  .radio { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .radio input { min-width: 24px; min-height: 24px; margin: 0; }
  .stand { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a1); min-width: 10rem; }
  .tabelle-rahmen { overflow-x: auto; position: relative; }
  /* U1: am Handy brachen die Spalten Buchstabe für Buchstabe um; die Tabelle behält eine Mindestbreite und rollt im Rahmen waagrecht */
  .tab { border-collapse: collapse; width: 100%; min-width: 46rem; font-size: var(--gr-klein); }
  .tab caption { text-align: start; font-weight: 600; padding-bottom: var(--a2); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: top; overflow-wrap: break-word; }
  .tab td input, .tab td textarea { width: 100%; min-width: 8rem; box-sizing: border-box; font: inherit; min-height: 24px; }
  .bereich th { font-weight: 650; padding-top: var(--a3); }
  .begriff { color: var(--tinte-2); }
  .tipp { color: var(--tinte-2); }
  .tipp + .tipp { margin-top: var(--a1); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .nur-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
