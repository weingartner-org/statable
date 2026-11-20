<script lang="ts">
  import { tick } from 'svelte';
  import { s, L, Lp, melde, oeffneNeueDaten, setzeFragebogen, setzeFragebogenEingaben } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import { anzeigeSprache } from '../lib/fragebogen-aktionen.svelte';
  import { bilder, entwurfInsProjekt } from '../lib/fragebogen-editor.svelte';
  import { eingabenInsProjekt, eingabenVon } from '../lib/eingabemaske.svelte';
  import { datensatzTabelle } from '../lib/doppeleingabe-daten';
  import { lese } from '../lib/papierbogen';
  import { leseOptionenFuer, ordneBoegen, offeneFragen, durchgangAusBoegen, korrekturSchluessel, type GescannteSeite, type Korrekturen } from '../lib/papierbogen-einlesen';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * „Gescannte Antwortbögen einlesen“ (E8, Teil 2b-2). Bilder und PDF-Dateien werden im Browser zu Graustufen, `lese` findet die Kästchen,
   * `ordneBoegen` ordnet die Seiten zu Bögen. Unsichere Kästchen und mehrere Kreuze bei Einfachauswahl entscheidet die Person (nie geraten).
   * Nichts wird hochgeladen. Gelesen werden nur Kreuze in Kästchen, keine Handschrift.
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  const sprache = $derived(anzeigeSprache(plan));

  let seiten = $state<GescannteSeite[]>([]);
  let kor = $state<Korrekturen>({});
  let trotzdem = $state(false);
  let arbeitet = $state('');
  let fehler = $state('');

  const sammlung = $derived(ordneBoegen(plan, sprache, seiten));
  const offenGesamt = $derived(sammlung.boegen.reduce((n, b) => n + offeneFragen(b, kor).length, 0));
  const ergebnis = $derived(durchgangAusBoegen(sammlung, kor, trotzdem));
  const grundText = (g: string) => ({
    keineMarken: L('Eckmarken nicht gefunden', 'corner marks not found'),
    markenUnklar: L('Eckmarken unklar', 'corner marks unclear'),
    kennleisteUngueltig: L('Kennleiste nicht lesbar', 'ID strip not readable'),
    kennungFremd: L('gehört zu einem anderen Fragebogen', 'belongs to another questionnaire'),
    seiteFremd: L('Seite gehört nicht zu diesem Bogen', 'page does not belong to this sheet'),
    doppelt: L('Seite doppelt vorhanden', 'page present twice'),
    keineLesung: L('nicht lesbar', 'not readable'),
  } as Record<string, string>)[g] ?? g;

  async function einlesen(dateien: FileList | null) {
    if (!dateien?.length) return;
    fehler = '';
    const neu: GescannteSeite[] = [];
    try {
      const { bildAusDatei, bilderAusPdf } = await import('../lib/papierbogen-bild');
      const opt = leseOptionenFuer(plan, sprache);
      for (const d of Array.from(dateien)) {
        arbeitet = L(`Wird gelesen: ${d.name} …`, `Reading: ${d.name} …`);
        await tick();
        try {
          const pdf = /\.pdf$/i.test(d.name) || d.type === 'application/pdf';
          const bs = pdf ? await bilderAusPdf(d, (n, v) => { arbeitet = L(`Wird gelesen: ${d.name}, Seite ${n} von ${v} …`, `Reading: ${d.name}, page ${n} of ${v} …`); }) : [await bildAusDatei(d)];
          bs.forEach((b, i) => neu.push({ quelle: bs.length > 1 ? `${d.name} (${i + 1})` : d.name, lesung: lese(b, opt) }));
        } catch {
          neu.push({ quelle: d.name, lesung: { ok: false, fehler: 'keineMarken' } as never });
        }
      }
      seiten = [...seiten, ...neu];
      const sm = ordneBoegen(plan, sprache, seiten);
      sage(Lp(sm.boegen.length, 'Ein Bogen erkannt.', `${sm.boegen.length} Bögen erkannt.`, 'One sheet recognised.', `${sm.boegen.length} sheets recognised.`) + ' ' + (sm.abgelehnt.length ? L(`${sm.abgelehnt.length} Seiten abgelehnt.`, `${sm.abgelehnt.length} pages rejected.`) : ''));
    } catch (e) {
      fehler = L(`Das Einlesen ging nicht: ${(e as Error).message}`, `Reading did not work: ${(e as Error).message}`);
      sage(fehler, 'dringend');
    } finally { arbeitet = ''; }
  }

  function waehle(bogen: number, nr: number, wert: string) {
    const k = korrekturSchluessel(bogen, nr);
    if (wert === '') { const { [k]: _w, ...rest } = kor; kor = rest; return; }
    kor = { ...kor, [k]: wert === 'leer' ? [] : [Number(wert)] };
  }
  function leeren() { seiten = []; kor = {}; trotzdem = false; fehler = ''; sage(L('Eingelesene Bögen entfernt.', 'Scanned sheets removed.')); }

  const eingabenPlaene = () => (s.projekt ? s.fragebogen : [plan]);
  const alleEntwurf = () => ({ [plan.id]: eingabenVon(plan.id) });
  async function uebernehmen() {
    if (!ergebnis.uebernommen.length) return;
    arbeitet = L('Datensatz wird erzeugt …', 'Creating the data set …');
    try {
      const hatteProjekt = !!s.projekt, planAlt = [...eingabenPlaene()], bildAlt = bilder(), eingAlt = { ...(hatteProjekt ? s.fragebogenEingaben : alleEntwurf()) };
      const t = datensatzTabelle(plan, ergebnis.durchgang, sprache);
      const titel = plan.titel || L('Fragebogen', 'Questionnaire');
      await oeffneNeueDaten(L(`Gescannte Bögen: ${titel}`, `Scanned sheets: ${titel}`), L(`Papierbögen (${ergebnis.uebernommen.length})`, `Paper sheets (${ergebnis.uebernommen.length})`), t.spalten, t.zeilen);
      if (hatteProjekt) { await setzeFragebogen(planAlt, bildAlt); await setzeFragebogenEingaben(eingAlt); }
      else { entwurfInsProjekt(); eingabenInsProjekt(); }
      await tick();
      setTimeout(() => document.getElementById('fb-pb-t')?.focus(), 0);
    } catch (e) { melde(L(`Der Datensatz ließ sich nicht erzeugen: ${(e as Error).message}`, `The data set could not be created: ${(e as Error).message}`)); }
    finally { arbeitet = ''; }
  }
</script>

<section class="pb" aria-label={L('Gescannte Antwortbögen', 'Scanned answer sheets')}>
  <div class="kopf"><h2 id="fb-pb-t" tabindex="-1">{L('Gescannte Antwortbögen einlesen (Papierbogen)', 'Read in scanned answer sheets (paper sheet)')}</h2><HilfeLink id="fragebogen-planen" text={L('Hilfe zum Papierbogen', 'Help on the paper sheet')} /></div>
  <p class="hilfe">{L('Scannen oder fotografieren Sie die ausgefüllten Antwortbögen (Bild oder PDF, jede Seite einzeln oder mehrere zusammen). Statable liest nur Kreuze in Kästchen, keine Handschrift, und alles bleibt in Ihrem Browser. Ist ein Kästchen unsicher oder sind bei einer Einfachauswahl mehrere gekreuzt, entscheiden Sie. Statable rät nie.', 'Scan or photograph the filled-in answer sheets (image or PDF, one page at a time or several together). Statable reads only crosses in boxes, not handwriting, and everything stays in your browser. If a box is uncertain or several are crossed in a single-choice question, you decide. Statable never guesses.')}</p>

  <div class="eingabe">
    <label for="fb-pb-datei">{L('Bilder oder PDF-Dateien der Bögen', 'Images or PDF files of the sheets')}</label>
    <input id="fb-pb-datei" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" disabled={!!arbeitet} onchange={(e) => { void einlesen(e.currentTarget.files); e.currentTarget.value = ''; }} aria-describedby="fb-pb-datei-h">
    <p id="fb-pb-datei-h" class="hilfe">{L('Gerade, hell ausgeleuchtet, alle vier Eckmarken im Bild. Pro Seite wird der Bogen über die Kennleiste zugeordnet.', 'Straight, well lit, all four corner marks in the picture. Each page is assigned to its sheet by the ID strip.')}</p>
  </div>

  {#if arbeitet}<p><Rechnet text={arbeitet} /></p>{/if}
  {#if fehler}<p class="fehl">{fehler}</p>{/if}

  {#if seiten.length}
    <div class="ergebnis" data-testid="fb-pb-ergebnis">
      <h3>{L('Erkannte Bögen', 'Recognised sheets')}</h3>
      <p data-testid="fb-pb-zahlen">{Lp(sammlung.boegen.length, '1 Bogen erkannt', `${sammlung.boegen.length} Bögen erkannt`, '1 sheet recognised', `${sammlung.boegen.length} sheets recognised`)}, {L(`${offenGesamt} Fragen warten auf Ihre Entscheidung`, `${offenGesamt} questions wait for your decision`)}.</p>

      {#if sammlung.abgelehnt.length}
        <h3>{L('Nicht übernommen', 'Not accepted')}</h3>
        <ul class="zahlen">
          {#each sammlung.abgelehnt as a}<li>{a.quelle}: {grundText(a.grund)}</li>{/each}
        </ul>
      {/if}

      {#each sammlung.boegen as b (b.bogen)}
        {@const offen = offeneFragen(b, kor)}
        <h3>{L(`Bogen ${b.bogen}`, `Sheet ${b.bogen}`)}</h3>
        {#if b.fehlendeSeiten.length}<p class="fehl">{L(`Es fehlen Seiten: ${b.fehlendeSeiten.join(', ')}. Der Bogen bleibt draußen, bis alle Seiten da sind.`, `Pages missing: ${b.fehlendeSeiten.join(', ')}. The sheet stays out until all pages are there.`)}</p>{/if}
        {#if offen.length}
          <table class="ct">
            <caption class="nur-vorleser">{L(`Offene Fragen im Bogen ${b.bogen}`, `Open questions on sheet ${b.bogen}`)}</caption>
            <thead><tr><th scope="col">{L('Frage', 'Question')}</th><th scope="col">{L('Gelesen', 'Read')}</th><th scope="col">{L('Ihre Wahl', 'Your choice')}</th></tr></thead>
            <tbody>
              {#each offen as f (f.nr)}
                <tr>
                  <th scope="row">{f.nr}</th>
                  <td>{f.stand === 'mehrere' ? L(`mehrere Kreuze (${f.codes.join(', ')})`, `several crosses (${f.codes.join(', ')})`) : L(`unsicher${f.codes.length ? ` (sicher: ${f.codes.join(', ')})` : ''}`, `uncertain${f.codes.length ? ` (sure: ${f.codes.join(', ')})` : ''}`)}</td>
                  <td>
                    <select aria-label={L(`Antwort für Frage ${f.nr} im Bogen ${b.bogen}`, `Answer for question ${f.nr} on sheet ${b.bogen}`)} onchange={(e) => waehle(b.bogen, f.nr, e.currentTarget.value)}>
                      <option value="">{L('Noch nicht gewählt', 'Not chosen yet')}</option>
                      {#each f.moeglich as c}<option value={String(c)}>{L(`Code ${c}`, `Code ${c}`)}</option>{/each}
                      <option value="leer">{L('Keine Antwort', 'No answer')}</option>
                    </select>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else if !b.fehlendeSeiten.length}
          <p>{L('Alles eindeutig gelesen.', 'Everything read unambiguously.')}</p>
        {/if}
      {/each}

      <label class="schalter"><input type="checkbox" bind:checked={trotzdem}> {L('Auch Bögen mit offenen Fragen oder fehlenden Seiten übernehmen (offene Fragen bleiben leer)', 'Also include sheets with open questions or missing pages (open questions stay empty)')}</label>
      <p data-testid="fb-pb-stand">{L(`${ergebnis.uebernommen.length} von ${sammlung.boegen.length} Bögen sind bereit.`, `${ergebnis.uebernommen.length} of ${sammlung.boegen.length} sheets are ready.`)}</p>
      <div class="akt">
        <button class="k" type="button" data-testid="fb-pb-uebernehmen" aria-disabled={ergebnis.uebernommen.length && !arbeitet ? undefined : 'true'} onclick={() => { if (ergebnis.uebernommen.length && !arbeitet) void uebernehmen(); }}>{L('Als Datensatz übernehmen', 'Take over as data set')}</button>
        <button class="k leise" type="button" onclick={leeren}>{L('Alle eingelesenen Bögen entfernen', 'Remove all scanned sheets')}</button>
      </div>
    </div>
  {/if}
</section>

<style>
  .pb { display: flex; flex-direction: column; gap: var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3) var(--a4); }
  .kopf { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: center; }
  .pb h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .pb h3 { font: 650 var(--gr-h3, 1.1rem)/1.25 var(--schrift-ui); margin: var(--a3) 0 0; }
  .pb h2:focus-visible { outline: 3px solid var(--fokus); outline-offset: 2px; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); max-width: 44rem; }
  .eingabe label { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
  .pb input[type='file'] { font: inherit; min-height: var(--ziel); max-width: 100%; }
  .pb input:focus-visible, .pb select:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  .pb select { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a1) var(--a2); max-width: 100%; }
  .ergebnis { display: flex; flex-direction: column; gap: var(--a2); }
  .ergebnis p { margin: 0; }
  .fehl { color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); margin: 0; }
  .fehl::before { content: '! '; }
  .zahlen { margin: 0; padding-inline-start: var(--a5); }
  .schalter { display: flex; gap: var(--a2); align-items: center; min-height: var(--ziel); }
  .schalter input { width: 1.4rem; height: 1.4rem; }
  .akt { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; }
  table.ct { border-collapse: collapse; max-width: 100%; }
  table.ct th, table.ct td { padding: var(--a1) var(--a3); text-align: start; border-bottom: 1px solid var(--linie); vertical-align: top; }
  .nur-vorleser { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  :global(:where(:root.eng-600)) .akt { flex-direction: column; align-items: stretch; }
</style>
