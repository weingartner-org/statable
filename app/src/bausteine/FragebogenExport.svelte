<script lang="ts">
  import { L, melde } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import { befundZiel } from '../lib/fragebogenplan-editor';
  import { anzeigeSprache, springeZu } from '../lib/fragebogen-aktionen.svelte';
  import { erzeugeExport, exportEintraege, sperrFehler, type ExportId } from '../lib/fragebogenexport-menue';
  import { planPruefen } from '../lib/fragebogenplan';
  import type { LinkInfo } from '../lib/fragebogendatei';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * Export-Menü (Fragebogen planen, 2G zu 2E): ein Knopf klappt eine Liste mit zehn Knöpfen auf (kein Popup: die Liste steht im Lesefluss).
   * Bei Fehlern in den Regeln sind alle Einträge gesperrt (`aria-disabled`, bleiben mit Tab erreichbar); der Grund und ein Sprunglink zum ersten Fehler stehen darüber.
   * Esc klappt zu und gibt den Fokus an den Menüknopf zurück. Nach dem Speichern sagt die Ansage den Dateinamen.
   * Darunter „Zum Verschicken“ (Stufe 3C): Fragebogen-Datei (eine HTML-Datei zum Ausfüllen) und Link zum Ausfüllen. Beide sind gesperrt, wenn der Plan Fehler hat oder der Schlüssel für die Antworten fehlt;
   * der Grund steht dabei. Der Link erscheint in einem Feld mit „Kopieren“; ist er zu lang für Messenger (über 8.000 Zeichen), steht der Hinweis „Datei statt Link“ dabei.
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  let offen = $state(false);
  let laeuft = $state<ExportId | ''>('');
  let sprache = $state('');
  let textAuchWord = $state(false);
  let knopf = $state<HTMLButtonElement>();
  const fehler = $derived(sperrFehler(plan));
  const gesperrt = $derived(fehler.length > 0);
  const spr = $derived(plan.sprachen.includes(sprache) ? sprache : anzeigeSprache(plan));
  const eintraege = $derived(exportEintraege());
  const sprachName = (sp: string) => (sp === 'de' ? L('Deutsch', 'German') : sp === 'en' ? L('Englisch', 'English') : sp);
  const erster = $derived(fehler[0]);
  // Stufe 3C: zum Verschicken
  let versandLaeuft = $state<'datei' | 'link' | ''>('');
  let link = $state<LinkInfo | null>(null);
  const schluesselFehlt = $derived(planPruefen(plan, { wege: ['datei'] }).find(b => b.regel === 'empfaenger-fehlt'));
  const versandGrund = $derived(gesperrt ? L('Gesperrt: Der Plan hat Fehler (siehe oben).', 'Blocked: the plan has errors (see above).') : schluesselFehlt ? schluesselFehlt.text : '');
  const versandGesperrt = $derived(versandGrund !== '');
  $effect(() => { void plan.geaendert; void plan.empfaenger?.schluessel; link = null; });
  async function versandDatei() {
    if (versandGesperrt) { sage(versandGrund); return; }
    if (versandLaeuft) return;
    versandLaeuft = 'datei';
    const langsam = setTimeout(() => sage(L('Fragebogen-Datei wird erstellt …', 'Creating the questionnaire file …')), 1200);
    try {
      const { fragebogenDatei, fragebogenDateiname } = await import('../lib/fragebogendatei');
      const text = await fragebogenDatei(plan), name = fragebogenDateiname(plan);
      const bytes = new TextEncoder().encode(text);
      const { herunterladen } = await import('../lib/export');
      herunterladen(bytes, name, 'text/html;charset=utf-8');
      clearTimeout(langsam);
      const kb = Math.round(bytes.length / 1024);
      sage(L(`„${name}“ gespeichert (Download), ${kb} KB. Am Computer im Browser öffnen; für Handys besser den Link nehmen.`, `"${name}" saved (download), ${kb} KB. Open it in a browser on a computer; for phones the link is better.`), 'dringend');
    } catch { clearTimeout(langsam); melde(L('Die Fragebogen-Datei ließ sich nicht erstellen.', 'The questionnaire file could not be created.')); }
    finally { versandLaeuft = ''; }
  }
  async function versandLink() {
    if (versandGesperrt) { sage(versandGrund); return; }
    if (versandLaeuft) return;
    versandLaeuft = 'link';
    try {
      const { fragebogenLinkInfo } = await import('../lib/fragebogendatei');
      link = fragebogenLinkInfo(plan);
      sage(link.zuLang
        ? L(`Link erstellt, aber mit ${link.laenge} Zeichen zu lang für Messenger. Besser die Fragebogen-Datei nehmen.`, `Link created, but at ${link.laenge} characters too long for messengers. Better use the questionnaire file.`)
        : L(`Link erstellt (${link.laenge} Zeichen). Er steht im Feld darunter, mit dem Knopf „Kopieren“.`, `Link created (${link.laenge} characters). It is in the box below, with the "Copy" button.`), 'dringend');
    } catch { melde(L('Der Link ließ sich nicht erstellen.', 'The link could not be created.')); }
    finally { versandLaeuft = ''; }
  }
  async function linkKopieren() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.link); sage(L('Link kopiert.', 'Link copied.'), 'dringend'); }
    catch { sage(L('Das Kopieren hat nicht geklappt. Markieren Sie den Link im Feld von Hand.', 'Copying did not work. Select the link in the box by hand.'), 'dringend'); document.getElementById('fb-ex-link')?.focus(); }
  }
  // E8 Teil 2a: Papierbogen zum Scannen
  let bogenAnzahl = $state(10);
  let bogenLaeuft = $state(false);
  async function papierbogen() {
    if (gesperrt) { sage(L('Der Export ist gesperrt, solange der Fragebogen Fehler hat.', 'Export is blocked while the questionnaire has errors.')); return; }
    if (bogenLaeuft) return;
    bogenLaeuft = true;
    try {
      const { papierbogenDruck, papierbogenDateiname } = await import('../lib/papierbogen-druck');
      const d = papierbogenDruck(plan, spr, bogenAnzahl), name = papierbogenDateiname(plan, spr);
      const { herunterladen } = await import('../lib/export');
      herunterladen(new TextEncoder().encode(d.html), name, 'text/html;charset=utf-8');
      const rest = d.nichtLesbar.length ? L(` Nicht lesbar (kein Kästchen möglich): Frage ${d.nichtLesbar.join(', ')}.`, ` Not readable (no box possible): question ${d.nichtLesbar.join(', ')}.`) : '';
      sage(L(`„${name}“ gespeichert: ${d.boegen} Bögen, ${d.seiten} Seiten, ${d.fragen} Fragen.${rest} Beim Drucken 100 % und Hintergrundgrafiken einschalten.`, `"${name}" saved: ${d.boegen} sheets, ${d.seiten} pages, ${d.fragen} questions.${rest} When printing, use 100 % and turn on background graphics.`), 'dringend');
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      melde(m === 'keineFragen' ? L('Der Papierbogen braucht mindestens eine Frage mit Antwortcodes zum Ankreuzen.', 'The paper sheet needs at least one question with answer codes to tick.') : L('Der Papierbogen ließ sich nicht erstellen.', 'The paper sheet could not be created.'));
    } finally { bogenLaeuft = false; }
  }
  const springbar = (element: string | undefined) => { const z = befundZiel(plan, element); return !!(z.auswahl || z.liste); };
  const kannSpringen = $derived(!!erster && springbar(erster.element));

  async function tue(id: ExportId, name: string) {
    if (gesperrt) { sage(L('Der Export ist gesperrt, solange der Fragebogen Fehler hat. Die Fehler stehen bei den Befunden.', 'Export is blocked while the questionnaire has errors. The errors are listed in the findings.')); return; }
    if (laeuft) return;
    laeuft = id;
    // „wird erstellt“ nur, wenn es wirklich dauert: Eine sofortige Ansage verdrängte sonst die Erfolgsmeldung (NVDA spricht nur die erste).
    const langsam = setTimeout(() => sage(L(`${name} wird erstellt …`, `Creating ${name} …`)), 1200);
    try {
      const dateien = await erzeugeExport(id, plan, spr, { textAuchWord });
      const { herunterladen } = await import('../lib/export');
      for (const f of dateien) herunterladen(f.bytes, f.name, f.typ);
      const namen = dateien.map(f => `„${f.name}“`).join(L(' und ', ' and '));
      clearTimeout(langsam);
      sage(L(`${namen} gespeichert (Download).`, `${namen.replace(/[„“]/g, '"')} saved (download).`), 'dringend');
    } catch (e) {
      clearTimeout(langsam);
      const m = e instanceof Error ? e.message : '';
      melde(m.startsWith('planFehler') ? L(`Der Export ist gesperrt: ${m.replace(/^planFehler:?\s*/, '')}`, `Export is blocked: ${m.replace(/^planFehler:?\s*/, '')}`) : L('Der Export ließ sich nicht erstellen.', 'The export could not be created.'));
    } finally { laeuft = ''; }
  }
  function taste(e: KeyboardEvent) { if (e.key === 'Escape' && offen) { e.stopPropagation(); offen = false; knopf?.focus(); sage(L('Export-Menü geschlossen.', 'Export menu closed.')); } }
</script>

<section class="ex" aria-label={L('Exportieren', 'Export')} onkeydown={taste}>
  <button class="k" type="button" bind:this={knopf} id="fb-ex-knopf" aria-expanded={offen} aria-controls="fb-ex-liste" onclick={() => { offen = !offen; sage(!offen ? L('Export-Menü geschlossen.', 'Export menu closed.') : gesperrt ? L(`Export-Menü geöffnet, gesperrt: ${fehler.length === 1 ? '1 Fehler' : fehler.length + ' Fehler'}.${kannSpringen ? ' Der Sprunglink zum ersten Fehler steht zuerst.' : ''}`, `Export menu opened, blocked: ${fehler.length === 1 ? '1 error' : fehler.length + ' errors'}.${kannSpringen ? ' The jump link to the first error comes first.' : ''}`) : L('Export-Menü geöffnet: zehn Formate.', 'Export menu opened: ten formats.')); }}>
    <Icon n="download" />{L('Exportieren (Dateiformate)', 'Export (file formats)')}
  </button>
  {#if offen}
    <div class="panel" id="fb-ex-liste" role="group" aria-label={L('Exportformate', 'Export formats')} aria-describedby={gesperrt ? 'fb-ex-grund' : undefined}>
      {#if gesperrt}
        <div class="banner ruhig" data-testid="fb-ex-gesperrt"><Icon n="hinweis" />
          <p id="fb-ex-grund">{L(`Der Export ist gesperrt: Die Prüfung der Regeln meldet ${fehler.length === 1 ? 'einen Fehler' : fehler.length + ' Fehler'}. Erster Fehler: ${erster!.text}`, `Export is blocked: the check of the rules reports ${fehler.length === 1 ? 'one error' : fehler.length + ' errors'}. First error: ${erster!.text}`)}</p>
          {#if kannSpringen}<button class="k leise" type="button" onclick={() => springeZu(erster!.element)}>{L('Zum ersten Fehler springen', 'Jump to the first error')}</button>{/if}
          {#if fehler.length > 1}
            <ul class="weitere" aria-label={L('Weitere Fehler mit Sprunglink', 'Further errors with jump link')}>
              {#each fehler.slice(1, 9) as f, i (i)}
                <li>{f.text}{#if springbar(f.element)} <button class="k leise" type="button" aria-label={L(`Zur Stelle springen: ${f.text}`, `Jump to the place: ${f.text}`)} onclick={() => springeZu(f.element)}>{L('Zur Stelle springen', 'Jump to the place')}</button>{/if}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
      {#if plan.sprachen.length > 1}
        <div class="eingabe">
          <label for="fb-ex-sprache">{L('Sprache der Datei', 'Language of the file')}</label>
          <select id="fb-ex-sprache" value={spr} onchange={(e) => (sprache = e.currentTarget.value)}>{#each plan.sprachen as sp (sp)}<option value={sp}>{sprachName(sp)}</option>{/each}</select>
        </div>
      {/if}
      <ul>
        {#each eintraege as x (x.id)}
          <li>
            <button class="k eintrag" type="button" aria-disabled={gesperrt ? 'true' : undefined} aria-describedby="fb-ex-was-{x.id}" onclick={() => void tue(x.id, x.name)}>
              {#if laeuft === x.id}<Rechnet imKnopf text={L('Wird erstellt …', 'Creating …')} />{:else}<span class="name">{x.name}</span>{#if gesperrt} <span class="marke" aria-hidden="true">({L('gesperrt', 'blocked')})</span>{/if}{/if}
            </button>
            <span class="was" id="fb-ex-was-{x.id}">{x.was}{#if x.warnung} <strong>{x.warnung}</strong>{/if}</span>
          </li>
        {/each}
      </ul>
      <div class="versand" role="group" aria-labelledby="fb-ex-versand-t">
        <p class="titel" id="fb-ex-versand-t">{L('Zum Verschicken: Fragebogen zum Ausfüllen', 'To send out: questionnaire to fill in')}</p>
        {#if versandGrund && !gesperrt}<p class="was" id="fb-ex-versand-grund" data-testid="fb-versand-grund">{versandGrund}</p>{/if}
        <ul>
          <li>
            <button class="k eintrag" type="button" aria-disabled={versandGesperrt ? 'true' : undefined} aria-describedby="fb-ex-was-datei {gesperrt ? 'fb-ex-grund' : versandGrund ? 'fb-ex-versand-grund' : ''}" data-testid="fb-versand-datei" onclick={() => void versandDatei()}>
              {#if versandLaeuft === 'datei'}<Rechnet imKnopf text={L('Wird erstellt …', 'Creating …')} />{:else}<span class="name">{L('Fragebogen-Datei (zum Ausfüllen)', 'Questionnaire file (to fill in)')}</span>{#if versandGesperrt} <span class="marke" aria-hidden="true">({L('gesperrt', 'blocked')})</span>{/if}{/if}
            </button>
            <span class="was" id="fb-ex-was-datei">{L('Eine einzelne HTML-Datei, die ohne Netz im Browser läuft (Computer). Die Antworten werden im Gerät verschlüsselt und kommen als Datei, Text oder QR-Code zurück.', 'A single HTML file that runs in the browser without a network (computer). Answers are encrypted on the device and come back as file, text or QR code.')}</span>
          </li>
          <li>
            <button class="k eintrag" type="button" aria-disabled={versandGesperrt ? 'true' : undefined} aria-describedby="fb-ex-was-link {gesperrt ? 'fb-ex-grund' : versandGrund ? 'fb-ex-versand-grund' : ''}" data-testid="fb-versand-link" onclick={() => void versandLink()}>
              {#if versandLaeuft === 'link'}<Rechnet imKnopf text={L('Wird erstellt …', 'Creating …')} />{:else}<span class="name">{L('Link zum Ausfüllen', 'Link to fill in')}</span>{#if versandGesperrt} <span class="marke" aria-hidden="true">({L('gesperrt', 'blocked')})</span>{/if}{/if}
            </button>
            <span class="was" id="fb-ex-was-link">{L('Ein Link, den Befragte am Handy oder Computer öffnen. Der Fragebogen steckt im Link hinter dem „#“ und geht nie an einen Server.', 'A link that respondents open on a phone or computer. The questionnaire is inside the link after the "#" and never goes to a server.')}</span>
          </li>
          <li>
            <button class="k eintrag" type="button" aria-disabled={versandGesperrt ? 'true' : undefined} aria-describedby="fb-ex-was-station {gesperrt ? 'fb-ex-grund' : versandGrund ? 'fb-ex-versand-grund' : ''}" data-testid="fb-versand-station" onclick={() => { if (versandGesperrt) sage(versandGrund); else location.hash = 'station'; }}>
              <span class="name">{L('Erhebungsstation öffnen (ein Gerät für viele)', 'Open survey station (one device for many)')}</span>{#if versandGesperrt} <span class="marke" aria-hidden="true">({L('gesperrt', 'blocked')})</span>{/if}
            </button>
            <span class="was" id="fb-ex-was-station">{L('Ein Tablet oder Laptop, an dem viele Personen nacheinander ausfüllen. Jede Antwort wird sofort verschlüsselt im Gerät abgelegt; die Station mahnt zur Sicherungsdatei.', 'A tablet or laptop where many people fill in one after another. Every answer is stored encrypted on the device at once; the station reminds you to save a backup file.')}</span>
          </li>
        </ul>
        {#if link}
          <div class="linkfeld" data-testid="fb-link-feld">
            <label for="fb-ex-link">{L('Link zum Ausfüllen', 'Link to fill in')}</label>
            <textarea id="fb-ex-link" readonly rows="3" spellcheck="false" aria-describedby={link.zuLang ? 'fb-link-lang' : undefined} value={link.link}></textarea>
            <button class="k" type="button" onclick={() => void linkKopieren()}>{L('Link kopieren', 'Copy link')}</button>
            {#if link.zuLang}<p class="was" id="fb-link-lang" data-testid="fb-link-zu-lang"><strong>{L('Datei statt Link:', 'File instead of link:')}</strong> {L(`Dieser Link hat ${link.laenge} Zeichen (mehr als 8.000). Messenger kürzen lange Links, dann geht der Fragebogen verloren. Nehmen Sie lieber die Fragebogen-Datei.`, `This link has ${link.laenge} characters (more than 8,000). Messengers shorten long links, and the questionnaire would be lost. Better use the questionnaire file.`)}</p>{/if}
          </div>
        {/if}
      </div>
      <div class="versand" role="group" aria-labelledby="fb-ex-bogen-t">
        <p class="titel" id="fb-ex-bogen-t">{L('Papierbogen zum Scannen (Kreuze in Kästchen)', 'Paper sheet for scanning (crosses in boxes)')}</p>
        <div class="eingabe">
          <label for="fb-ex-bogen-n">{L('Anzahl Bögen (1 bis 500)', 'Number of sheets (1 to 500)')}</label>
          <input id="fb-ex-bogen-n" type="number" min="1" max="500" inputmode="numeric" bind:value={bogenAnzahl} aria-describedby="fb-ex-was-bogen" />
        </div>
        <button class="k eintrag" type="button" aria-disabled={gesperrt ? 'true' : undefined} aria-describedby="fb-ex-was-bogen {gesperrt ? 'fb-ex-grund' : ''}" data-testid="fb-papierbogen" onclick={() => void papierbogen()}>
          {#if bogenLaeuft}<Rechnet imKnopf text={L('Wird erstellt …', 'Creating …')} />{:else}<span class="name">{L('Antwortbogen speichern (HTML zum Drucken)', 'Save answer sheet (HTML to print)')}</span>{#if gesperrt} <span class="marke" aria-hidden="true">({L('gesperrt', 'blocked')})</span>{/if}{/if}
        </button>
        <span class="was" id="fb-ex-was-bogen">{L('Ein Antwortbogen mit Eckmarken und Kennleiste, jeder Bogen mit eigener Nummer. Der Wortlaut steht auf der Papierfassung; der Antwortbogen zeigt Fragenummer, Anfang der Frage und die Codes. Gelesen werden nur Kreuze in Kästchen, keine Handschrift. Fragen ohne Antwortcodes (Tabellen, freie Texte) lassen sich so nicht erfassen.', 'An answer sheet with corner marks and an ID strip, each sheet with its own number. The wording is on the paper version; the answer sheet shows question number, start of the question and the codes. Only crosses in boxes are read, not handwriting. Questions without answer codes (tables, free text) cannot be captured this way.')}</span>
      </div>
      <label class="schalter"><input type="checkbox" bind:checked={textAuchWord}>{L('Textfassung zusätzlich als schlichte Word-Datei speichern', 'Also save the text version as a plain Word file')}</label>
      <p class="hilfe">{L('Dateinamen entstehen aus dem Titel des Fragebogens. Papierbögen und Textfassung: siehe die Hilfe zu „Papierfassungen“.', 'File names are made from the title of the questionnaire. Paper forms and text version: see the help on "paper versions".')}</p>
    </div>
  {/if}
</section>

<style>
  .ex { display: flex; flex-direction: column; gap: var(--a2); align-items: flex-start; min-width: 0; }
  .panel { display: flex; flex-direction: column; gap: var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); min-width: 0; max-width: 100%; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  li { display: flex; flex-direction: column; gap: var(--a1); align-items: flex-start; }
  .eintrag { text-align: start; white-space: normal; }
  .eintrag[aria-disabled='true'] { cursor: not-allowed; border-style: dashed; }
  .marke { font-weight: 650; }
  .was { font-size: var(--gr-klein); color: var(--tinte-2); }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .schalter { display: flex; gap: var(--a2); align-items: center; }
  .versand { display: flex; flex-direction: column; gap: var(--a2); border-top: 1px solid var(--linie-stark); padding-top: var(--a3); }
  .titel { margin: 0; font-weight: 650; }
  .linkfeld { display: flex; flex-direction: column; gap: var(--a1); align-items: flex-start; }
  .linkfeld textarea { width: 100%; max-width: 100%; box-sizing: border-box; font-family: var(--schrift-mono, monospace); font-size: var(--gr-klein); overflow-wrap: anywhere; }
</style>
