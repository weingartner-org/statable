<script lang="ts">
  /**
   * Forschungsplanung (Stufe V2, Teil 2b): Datenmanagementplan (18 Fragen) oder Präregistrierung (21 Fragen) in eigener Kurzfassung.
   * Die Person setzt je Frage den Stand und schreibt den Text. „Statable weiß“ zeigt nur Zahlen aus dem Projekt; „Als Antwort übernehmen“
   * hängt den Satz an ihren Text an, danach gehört er ihr. Keine Gesamtnote, nur „x von n bearbeitet“. Rechnet in `lib/planung.ts`.
   * Ansagen nur über `sage`, keine eigenen Live-Regionen.
   */
  import { L, s, setzePlanung } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { herunterladen } from '../lib/export';
  import { PLAN_LISTEN, PLAN_STAENDE, KEINE_RECHTSBERATUNG, antwortVon, bereichName, fragenDerListe, listeName, planHinweise, planungWord, quelleText, setzeAntwort, standText, zaehlung, type PlanListe, type PlanStand } from '../lib/planung';
  import { planQuellen } from '../lib/planung-quellen';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const word = new Laedt();

  let liste = $state<PlanListe>('dmp');
  let nurOffen = $state(false);
  /** Bei „nur noch offene“ gilt die Auswahl vom Moment des Einschaltens: Eine Frage verschwindet nicht, während man in ihr arbeitet. */
  let offenFest = $state<Set<string>>(new Set());

  const fragen = $derived(fragenDerListe(liste));
  const zeilen = $derived(nurOffen ? fragen.filter(f => offenFest.has(f.kennung)) : fragen);
  const z = $derived(zaehlung(s.planung, liste));
  const zahlText = $derived(L(`${z.bearbeitet} von ${z.n} Fragen bearbeitet, ${z.nochOffen} noch offen.`, `${z.bearbeitet} of ${z.n} questions worked on, ${z.nochOffen} still open.`));
  const tipps = $derived(planHinweise(planQuellen({
    fragebogen: s.fragebogen,
    qual: s.qual,
    daten: s.spalten.length ? { zeilen: s.zeilen.length, spalten: s.spalten } : undefined,
  })));

  function merkeOffene() {
    offenFest = new Set(fragen.filter(f => { const st = antwortVon(s.planung, liste, f.kennung)?.stand; return !st || st === 'offen'; }).map(f => f.kennung));
  }
  function waehleListe(l: PlanListe) {
    liste = l;
    if (nurOffen) merkeOffene();
    sage(L(`Liste gewählt: ${listeName(l)}. ${zahlText}`, `List chosen: ${listeName(l)}. ${zahlText}`));
  }
  function schalteFilter(an: boolean) {
    nurOffen = an;
    if (an) merkeOffene();
    sage(an ? L(`${offenFest.size} offene Fragen werden gezeigt.`, `${offenFest.size} open questions are shown.`) : L(`Alle ${fragen.length} Fragen werden gezeigt.`, `All ${fragen.length} questions are shown.`));
  }
  const nr = (kennung: string): number => fragen.findIndex(f => f.kennung === kennung) + 1;

  function setzeStand(kennung: string, stand: PlanStand) {
    void setzePlanung(setzeAntwort(s.planung, liste, kennung, { stand }) ?? []);
    sage(L(`Frage ${nr(kennung)}: ${standText(stand)}.`, `Question ${nr(kennung)}: ${standText(stand)}.`));
  }
  /** Text beim Verlassen des Felds speichern. Ohne Stand setzt Statable „Offen“ (nie „Ausgefüllt“) und sagt das an. */
  function speichereText(kennung: string, wert: string) {
    const alt = antwortVon(s.planung, liste, kennung);
    if ((alt?.text ?? '') === wert.trim()) return;
    const stand = alt?.stand ?? (wert.trim() ? 'offen' as const : undefined);
    void setzePlanung(setzeAntwort(s.planung, liste, kennung, { text: wert, ...(stand ? { stand } : {}) }) ?? []);
    sage(alt?.stand ? L(`Frage ${nr(kennung)}: Text gespeichert.`, `Question ${nr(kennung)}: text saved.`)
      : L(`Frage ${nr(kennung)}: Text gespeichert, Stand auf „Offen“ gesetzt.`, `Question ${nr(kennung)}: text saved, status set to "Open".`));
  }
  /** Hinweis in den Text übernehmen: hängt den Satz an und setzt den Fokus ins Feld; Stand bleibt, wie die Person ihn gesetzt hat. */
  function uebernimm(kennung: string, text: string) {
    const alt = antwortVon(s.planung, liste, kennung);
    const neu = alt?.text ? `${alt.text}\n${text}` : text;
    const stand = alt?.stand ?? 'offen' as const;
    void setzePlanung(setzeAntwort(s.planung, liste, kennung, { text: neu, stand }) ?? []);
    sage(L(`Frage ${nr(kennung)}: Satz übernommen.`, `Question ${nr(kennung)}: sentence taken over.`));
    document.getElementById(`pl-t-${kennung}`)?.focus();
  }

  const dateiname = (): string => {
    const n = (s.projekt?.name || 'Statable').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Statable';
    return `${n} - ${liste === 'dmp' ? L('Datenmanagementplan', 'Data management plan') : L('Präregistrierung', 'Preregistration')}.docx`;
  };
  async function wordSpeichern() {
    await word.mit(async () => {
      const name = dateiname();
      herunterladen(await planungWord(s.projekt?.name ?? '', s.planung, liste, L('de', 'en') === 'en' ? 'en' : 'de'), name, WORD);
      sage(L(`${name} wird heruntergeladen.`, `${name} is being downloaded.`));
    });
  }
</script>

<div class="pl">
  <p class="hilfe">{L('Sie beantworten die Fragen selbst. Statable setzt keinen Stand für Sie, schreibt keinen Text und bewertet Ihre Studie nicht. Was Statable im Projekt sieht, steht als Zahl unter der Frage („Statable weiß“); Sie entscheiden, ob Sie es übernehmen.', 'You answer the questions yourself. Statable sets no status for you, writes no text and does not rate your study. What Statable sees in the project is shown as a figure below the question ("Statable knows"); you decide whether to take it over.')}</p>
  <p class="hilfe">{KEINE_RECHTSBERATUNG()}</p>
  <p class="hilfe">{L('Tragen Sie hier keine Namen von Teilnehmenden ein: Das Pseudonymisieren des Projekts verändert diese Texte nicht.', 'Do not enter names of participants here: pseudonymising the project does not change these texts.')}</p>

  <fieldset class="auswahl">
    <legend>{L('Welche Liste?', 'Which list?')}</legend>
    {#each PLAN_LISTEN as l (l)}
      <label class="radio"><input type="radio" name="pl-liste" value={l} checked={liste === l} onchange={() => waehleListe(l)}>{listeName(l)}</label>
    {/each}
  </fieldset>
  <p class="hilfe" id="pl-quelle">{quelleText(liste)}</p>
  <p id="pl-zahl">{zahlText}</p>
  <label class="radio"><input type="checkbox" id="pl-filter" checked={nurOffen} onchange={(e) => schalteFilter(e.currentTarget.checked)}>{L('Nur noch offene Fragen zeigen', 'Show only questions still open')}</label>
  <div class="knopfzeile">
    <button class="k" id="pl-word" type="button" aria-disabled={word.aktiv ? 'true' : undefined} onclick={() => { if (!word.aktiv) void wordSpeichern(); }}><Icon n="download" />{L(`${liste === 'dmp' ? 'Datenmanagementplan' : 'Präregistrierung'} als Word speichern`, `Save ${liste === 'dmp' ? 'data management plan' : 'preregistration'} as Word`)}</button>
  </div>
  {#if word.sichtbar}<p class="hilfe"><Rechnet text={L('Word-Datei wird erzeugt …', 'Creating the Word file …')} /></p>{/if}

  {#if !zeilen.length}
    <p class="hilfe">{L('Keine Frage ist mehr offen.', 'No question is open any more.')}</p>
  {:else}
    {#each zeilen as f, i (f.kennung)}
      {@const a = antwortVon(s.planung, liste, f.kennung)}
      {#if i === 0 || zeilen[i - 1]!.bereich !== f.bereich}
        <h3 class="bereich">{f.bereich}. {bereichName(liste, f.bereich)}</h3>
      {/if}
      <fieldset class="frage" id="pl-{f.kennung}">
        <legend>{nr(f.kennung)}. {f.frage()} <span class="begriff">({f.begriff})</span></legend>
        <p class="hilfe">{f.hilfe()}</p>
        <div class="stand" role="radiogroup" aria-label={L(`Stand zu Frage ${nr(f.kennung)}`, `Status of question ${nr(f.kennung)}`)}>
          {#each PLAN_STAENDE as x (x)}
            <label class="radio"><input type="radio" name="pl-{liste}-{f.kennung}" value={x} checked={a?.stand === x} onchange={() => setzeStand(f.kennung, x)}>{standText(x)}</label>
          {/each}
        </div>
        <label class="nur-sr" for="pl-t-{f.kennung}">{L(`Antwort zu Frage ${nr(f.kennung)}`, `Answer to question ${nr(f.kennung)}`)}</label>
        <textarea id="pl-t-{f.kennung}" rows="3" maxlength="20000" value={a?.text ?? ''} onchange={(e) => speichereText(f.kennung, e.currentTarget.value)}></textarea>
        {#each tipps[f.kennung] ?? [] as t (t.text)}
          <p class="tipp"><span class="weiss">{L('Statable weiß:', 'Statable knows:')}</span> {t.text}
            {#if t.ziel}<a href="#{t.ziel}">{t.zielText}</a>{/if}
            <button class="k leise klein" type="button" onclick={() => uebernimm(f.kennung, t.text)}>{L('Als Antwort übernehmen', 'Take over as answer')}</button></p>
        {/each}
      </fieldset>
    {/each}
  {/if}
</div>

<style>
  .pl { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  p { margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); }
  .auswahl { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .auswahl legend { padding: 0; margin-bottom: var(--a2); font-weight: 600; }
  .radio { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .radio input { min-width: 24px; min-height: 24px; margin: 0; }
  .bereich { margin: var(--a4) 0 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); overflow-wrap: anywhere; }
  .frage { border: 1px solid var(--linie); border-radius: var(--radius, 8px); margin: 0; padding: var(--a3); display: flex; flex-direction: column; gap: var(--a2); min-width: 0; }
  .frage legend { font-weight: 600; padding: 0 var(--a2); overflow-wrap: anywhere; }
  .stand { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); }
  .frage textarea { width: 100%; box-sizing: border-box; font: inherit; min-height: 4.5rem; }
  .begriff { color: var(--tinte-2); font-weight: 400; }
  .tipp { color: var(--tinte-2); font-size: var(--gr-klein); }
  .weiss { font-weight: 600; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .nur-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
