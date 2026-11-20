<script lang="ts">
  import { L, Lp, melde, s } from '../lib/sitzung.svelte';
  import { aendereKodierleitfaden, codesListe, entwurfInsProjekt, entwurfWartet, iv, qualEntwurfInsProjekt, qualProjekt } from '../lib/interviews.svelte';
  import { voreinstellung } from '../lib/arbeitsweise';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import LeitfadenAssistent from '../bausteine/LeitfadenAssistent.svelte';
  import LeitfadenRueckfrage from '../bausteine/LeitfadenRueckfrage.svelte';
  import TranskriptEinlesen from '../bausteine/TranskriptEinlesen.svelte';
  import Protokolle from '../bausteine/Protokolle.svelte';
  import Kodierleitfaden from '../bausteine/Kodierleitfaden.svelte';
  import QdpxEinlesen from '../bausteine/QdpxEinlesen.svelte';
  import FallCodeMatrix from '../bausteine/FallCodeMatrix.svelte';
  import Uebereinstimmung from '../bausteine/Uebereinstimmung.svelte';
  import Pseudonymisieren from '../bausteine/Pseudonymisieren.svelte';
  import Einwilligungen from '../bausteine/Einwilligungen.svelte';
  import FeinstrukturArbeitsplatz from '../bausteine/FeinstrukturArbeitsplatz.svelte';
  import FeinstrukturListe from '../bausteine/FeinstrukturListe.svelte';
  import { tick } from 'svelte';

  /**
   * „Interviews vorbereiten und auswerten (qualitative Daten)“ - Stufe 4. Seit U1 Teil 2 (14.11.) elf Bereiche in vier Gruppen nach dem Arbeitsablauf; ursprünglich: Leitfaden (Paket 4D), Transkripte (4C: einlesen, Sprecher zuordnen, Liste),
   * Kodierleitfaden (4E, mit den Codes im qualitativen Projekt). Die Seite braucht keine Daten; die Leitfäden liegen im Projekt (Autospeichern) oder, ohne Projekt, in dieser Sitzung.
   */
  function zuStelle(id: string) { const e = document.getElementById(id); e?.scrollIntoView({ block: 'start' }); e?.focus(); }
  /* Sprung aus dem Kodier-Arbeitsplatz (Stufe A3): `#interviews/<Überschrift>` springt zum Bereich */
  const SPRUNGZIELE = ['iv-kodier-t', 'iv-ueber-t', 'iv-fein-t'];
  /* U1 Teil 2: vier Gruppen nach dem Arbeitsablauf - Vorbereiten, Erheben, Auswerten, Austauschen; die Sprungleiste nennt nur die Gruppen */
  $effect(() => {
    const h = location.hash.replace(/^#/, '');
    const ziel = h.startsWith('interviews/') ? h.slice('interviews/'.length) : '';
    if (SPRUNGZIELE.includes(ziel)) void tick().then(tick).then(() => zuStelle(ziel));
  });
  /** Reflexive thematische Analyse: Übereinstimmung eingeklappt, mit Satz und Quelle (Fachblatt Arbeitsweisen 1); nichts gesperrt */
  const ueberEingeklappt = $derived(!!voreinstellung(qualProjekt()).uebereinstimmungEingeklappt);
  async function schliesseArbeitsplatz() {
    iv.feinstruktur = null;
    await tick();
    zuStelle('iv-fein-t');
  }
  function uebernehmen() {
    const n = entwurfInsProjekt(); const q = qualEntwurfInsProjekt();
    if (n) melde(Lp(n, 'Der Leitfaden liegt jetzt im Projekt.', `${n} Leitfäden liegen jetzt im Projekt.`, 'The guide is now in the project.', `${n} guides are now in the project.`) + (q ? ' ' + L('Transkripte und Kategorien auch.', 'Transcripts and categories too.') : ''));
    else if (q) melde(L('Transkripte und Kategorien liegen jetzt im Projekt.', 'Transcripts and categories are now in the project.'));
  }
</script>

<div class="tisch ohne-rand"><article class="blatt ivs" aria-label={L('Interviews', 'Interviews')}>
  <SeitenKopf titel={L('Interviews vorbereiten und auswerten (qualitative Daten)', 'Prepare and analyse interviews (qualitative data)')} titelId="iv-t" fokussierbar zurueck />
  {#if iv.feinstruktur}
    <p><button class="k" type="button" onclick={() => void schliesseArbeitsplatz()}>{L('Arbeitsplatz schließen', 'Close the workplace')}</button></p>
    <FeinstrukturArbeitsplatz />
  {:else}
  <p class="heft-text">{L('Hier bereiten Sie Interviews vor: Sie entwickeln einen Leitfaden, lesen die Transkripte ein und halten fest, wann welche Kategorie passt. Statable schreibt Aufnahmen nicht selbst ab. Die Hinweise sind Vorschläge. Was passt, entscheiden Sie.', 'Here you prepare interviews: you develop a guide, later read in the transcripts and record when which category fits. Statable does not transcribe recordings itself. The notes are suggestions. You decide what fits.')}</p>

  {#if !s.projekt}
    <p class="heft-text hinweis-ohne"><Icon n="hinweis" /><span>{L('Es ist kein Projekt geöffnet. Leitfaden, Transkripte und Kategorien bleiben nur in dieser Sitzung erhalten. Öffnen Sie ein Projekt, dann werden sie mit gespeichert.', 'No project is open. Guide, transcripts and categories only stay for this session. Open a project and they are saved along with it.')}</span></p>
  {:else if !entwurfWartet()}
    <p class="hilfe">{L(`Leitfäden, Transkripte und Kategorien werden automatisch mit dem Projekt „${s.projekt.name}“ gespeichert.`, `Guides, transcripts and categories are saved automatically with the project "${s.projekt.name}".`)}</p>
  {:else}
    <div class="banner ruhig"><Icon n="hinweis" /><p>{L('Sie haben Leitfäden, Transkripte oder Kategorien ohne Projekt angelegt. Ins Projekt übernehmen, damit sie mit gespeichert werden?', 'You created guides, transcripts or categories without a project. Move them into the project so they are saved along with them?')}</p>
      <button class="k" type="button" onclick={uebernehmen}>{L('Ins Projekt übernehmen', 'Move into the project')}</button></div>
  {/if}

  <nav class="sprung" aria-label={L('Sprunglinks', 'Jump links')}>
    <button class="k leise" type="button" onclick={() => zuStelle('iv-g-vor')}>{L('Vorbereiten: Leitfaden, Einwilligung', 'Prepare: guide, consent')}</button>
    <button class="k leise" type="button" onclick={() => zuStelle('iv-g-erheben')}>{L('Erheben: Transkripte, Protokolle', 'Collect: transcripts, protocols')}</button>
    <button class="k leise" type="button" onclick={() => zuStelle('iv-g-auswerten')}>{L('Auswerten: Kodieren, Feinstrukturanalyse, Kodierleitfaden, Fall-Code-Matrix, Übereinstimmung', 'Analyse: coding, fine structure analysis, coding guide, case-code matrix, agreement')}</button>
    <button class="k leise" type="button" onclick={() => zuStelle('iv-g-weiter')}>{L('Austauschen: REFI-QDA, Pseudonymisieren', 'Exchange: REFI-QDA, pseudonymising')}</button>
  </nav>

  <!-- U1 Teil 2: elf Bereiche in vier Gruppen nach dem Arbeitsablauf (R10). Die Gruppen sind Regionen mit Namen, die Bereiche behalten ihre h2 (die Bausteine haben innen h3 bis h5). -->
  <section class="gruppe" aria-labelledby="iv-g-vor">
    <p class="gruppe-titel" id="iv-g-vor" tabindex="-1">{L('Vorbereiten', 'Prepare')}</p>
    <div class="raster">
      <div class="teil">
        <h2 id="iv-leit-t" tabindex="-1">{L('Interview-Leitfaden (Leitfaden nach Helfferich)', 'Interview guide (guide after Helfferich)')}</h2>
        <LeitfadenAssistent />
      </div>
      <div class="teil">
        <h2 id="iv-einw-t" tabindex="-1">{L('Einwilligung (gestuft und als Prozess)', 'Consent (staged and as a process)')}</h2>
        <Einwilligungen />
      </div>
    </div>
  </section>

  <section class="gruppe" aria-labelledby="iv-g-erheben">
    <p class="gruppe-titel" id="iv-g-erheben" tabindex="-1">{L('Erheben', 'Collect')}</p>
    <div class="raster">
      <div class="teil">
        <h2 id="iv-trans-t" tabindex="-1">{L('Transkripte (Interviewtexte einlesen und prüfen)', 'Transcripts (read in and check interview texts)')}</h2>
        <TranskriptEinlesen />
      </div>
      <div class="teil">
        <h2 id="iv-prot-t" tabindex="-1">{L('Protokolle (Interviewprotokoll, Gedächtnisprotokoll, Feldnotizen)', 'Protocols (interview protocol, memory protocol, field notes)')}</h2>
        <Protokolle />
      </div>
    </div>
  </section>

  <section class="gruppe" aria-labelledby="iv-g-auswerten">
    <p class="gruppe-titel" id="iv-g-auswerten" tabindex="-1">{L('Auswerten', 'Analyse')}</p>
    <div class="raster">
      <div class="teil">
        <h2 id="iv-kodieren-t" tabindex="-1">{L('Kodieren (Kodier-Arbeitsplatz)', 'Coding (coding workplace)')}</h2>
        <p class="heft-text">{L('Im Kodier-Arbeitsplatz geben Sie Textstellen Codes, mit der Maus, der Tastatur oder dem Screenreader. Ein einzelnes Transkript öffnen Sie oben in der Liste mit „Kodieren“.', 'In the coding workplace you assign codes to passages of text, with the mouse, the keyboard or a screen reader. To open a single transcript, use "Code" in the list above.')}</p>
        <div class="knopfzeile"><button class="k" id="iv-kodieren-oeffnen" type="button" onclick={() => (location.hash = 'kodieren')}>{L('Kodier-Arbeitsplatz öffnen', 'Open the coding workplace')}</button></div>
      </div>
      <div class="teil">
        <h2 id="iv-fein-t" tabindex="-1">{L('Feinstrukturanalyse (Sequenzanalyse nach Froschauer und Lueger)', 'Fine structure analysis (sequential analysis after Froschauer and Lueger)')}</h2>
        <FeinstrukturListe />
      </div>
      <div class="teil breit">
        <h2 id="iv-kodier-t" tabindex="-1">{L('Kodierleitfaden (Kategorien mit Definition und Ankerbeispiel)', 'Coding guide (categories with definition and anchor example)')}</h2>
        <Kodierleitfaden codes={codesListe()} aendern={aendereKodierleitfaden} sprache={L('de', 'en') === 'en' ? 'en' : 'de'} />
      </div>
      <div class="teil breit">
        <h2 id="iv-matrix-t" tabindex="-1">{L('Wie oft kommt welcher Code vor? (Fall-Code-Matrix, Quantifizieren)', 'How often does which code occur? (case-code matrix, quantitizing)')}</h2>
        <FallCodeMatrix />
      </div>
      <div class="teil breit">
        <h2 id="iv-ueber-t" tabindex="-1">{L('Kodieren wir gleich? (Intercoder-Übereinstimmung)', 'Do we code alike? (intercoder agreement)')}</h2>
        {#if ueberEingeklappt}
          <p class="heft-text" id="iv-ueber-warum">{L('Ihre Arbeitsweise ist die reflexive thematische Analyse. Dort ist eine Übereinstimmungszahl kein Gütemaß: Die Deutung der forschenden Person ist die Stärke des Verfahrens, kein Fehler (Braun und Clarke 2021). Darum ist dieser Bereich eingeklappt. Sie können ihn trotzdem öffnen.', 'Your approach is reflexive thematic analysis. There, an agreement figure is not a quality measure: the interpretation of the researcher is the strength of the method, not an error (Braun and Clarke 2021). That is why this area is collapsed. You can still open it.')}</p>
          <details class="dh-auf">
            <summary id="iv-ueber-auf" aria-describedby="iv-ueber-warum">{L('Übereinstimmung trotzdem zeigen', 'Show agreement anyway')}</summary>
            <Uebereinstimmung />
          </details>
        {:else}
          <Uebereinstimmung />
        {/if}
      </div>
    </div>
  </section>

  <section class="gruppe" aria-labelledby="iv-g-weiter">
    <p class="gruppe-titel" id="iv-g-weiter" tabindex="-1">{L('Austauschen', 'Exchange')}</p>
    <div class="raster">
      <div class="teil">
        <h2 id="iv-qdpx-t" tabindex="-1">{L('Projekt aus MAXQDA, ATLAS.ti, NVivo oder QualCoder einlesen (REFI-QDA, .qdpx)', 'Read in a project from MAXQDA, ATLAS.ti, NVivo or QualCoder (REFI-QDA, .qdpx)')}</h2>
        <QdpxEinlesen />
      </div>
      <div class="teil">
        <h2 id="iv-pseudo-t" tabindex="-1">{L('Personen unkenntlich machen (Pseudonymisieren)', 'Make people unrecognisable (pseudonymising)')}</h2>
        <Pseudonymisieren />
      </div>
    </div>
  </section>
  {/if}
</article></div>

<LeitfadenRueckfrage />

<style>
  .ivs { display: flex; flex-direction: column; gap: var(--a3); }
  .hinweis-ohne { display: flex; gap: var(--a2); align-items: flex-start; margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .sprung { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .teil { display: flex; flex-direction: column; gap: var(--a3); min-inline-size: 0; }
  .teil h2 { margin: 0; font: 650 var(--gr-h2)/1.25 var(--schrift-ui); }
  .gruppe { display: flex; flex-direction: column; gap: var(--a3); border-block-start: 2px solid var(--linie); padding-block-start: var(--a3); }
  .gruppe-titel { margin: 0; font: 650 var(--gr-klein)/1.2 var(--schrift-ui); letter-spacing: .06em; text-transform: uppercase; color: var(--tinte-2); }
  .raster { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--a5) var(--a6); align-items: start; }
  /* Auf breiten Schirmen zwei Spalten (Breiten nur über lib/groesse.svelte.ts); große Tabellen über beide */
  :global(:root.weit-1400) .raster { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  :global(:root.weit-1400) .teil.breit { grid-column: 1 / -1; }
</style>
