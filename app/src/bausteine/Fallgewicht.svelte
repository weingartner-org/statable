<script lang="ts">
  import { dialogFokus } from './dialogFokus';
  import { tick, untrack } from 'svelte';
  import { s, d, L } from '../lib/sitzung.svelte';
  import { gewichtDialog, gewichtsKandidaten, pruefeSpalte, gewichtHinweise, gewichtFehlerSatz, setzeFallgewicht, schalteFallgewichtAus, beantworteGewichtFrage, artName, entwurfProblemSatz } from '../lib/fallgewicht.svelte';
  import { klumpenFrage, klumpenSperrSatz, einsamName, einsamSatz, entwurfWirksam, EINSAME_REGELN, type EinsameRegel, type Entwurf, type GewichtArt } from '../lib/gewichte';
  import { entwurfPruefen } from '../lib/umfrageentwurf';
  import HilfeLink from './HilfeLink.svelte';
  import FallgewichtRaking from './FallgewichtRaking.svelte';
  import Icon from './Icon.svelte';

  /** Der Dialog „Fallgewicht“: Spalte wählen und die Pflichtfrage „Häufigkeit oder Umfrage?“ beantworten. Dieselbe Maske beantwortet die Frage nach einem Gewicht,
   *  das aus einer SPSS-Datei oder aus einem Befehl kommt: dann steht die Spalte fest. Ohne Antwort rechnet kein Blatt (Fachblatt S-A, 1.3, Falle 1). */
  let dlg = $state<HTMLDialogElement>();
  let spalte = $state('');
  let art = $state<GewichtArt | ''>('');
  /** Pflichtangabe beim Umfragegewicht (Später S-D2, Entscheidung Opus 1): ja = Personen einzeln gezogen; nein = „Nein oder weiß nicht“; leer = noch nicht beantwortet. */
  let klumpenfrei = $state<'ja' | 'nein' | 'plan' | ''>('');
  /** Abschnitt 6, Teil A: der Stichprobenplan (leer = nicht angegeben) - Spalten der Daten und die Regel für Schichten mit einem Klumpen. */
  let eSchicht = $state(''), eKlumpen = $state(''), eFpc = $state(''), eKlumpen2 = $state(''), eFpc2 = $state(''), eEinsam = $state<EinsameRegel | ''>('');
  /** Zwei Wege: eine vorhandene Spalte als Gewicht wählen oder Gewichte aus bekannten Rändern berechnen (Raking, Später S-F2 B). */
  let weg = $state<'spalte' | 'raking'>('spalte');
  let fehler = $state('');
  let laeuft = $state(false);
  const frage = $derived(s.gewichtFrage);
  const kandidaten = $derived(gewichtsKandidaten());
  /** Die Wahl, die der Dialog gerade prüft. */
  const wahl = $derived(frage ?? spalte);
  const pruefung = $derived(wahl && art ? pruefeSpalte(wahl, art) : null);
  const hinweise = $derived(pruefung && art && !pruefung.fehler ? gewichtHinweise(pruefung, { spalte: wahl, art }) : []);
  const fehlerSatz = $derived(pruefung?.fehler && art ? gewichtFehlerSatz(pruefung, { spalte: wahl, art }) : '');
  /** Die Angaben zum Plan; die zweite Stufe zählt nur mit erster Stufe und beiden Angaben zur Grundgesamtheit (sonst wird sie nicht angeboten). */
  const planEntwurf = $derived<Entwurf>({ ...(eSchicht ? { schicht: eSchicht } : {}), ...(eKlumpen ? { klumpen: eKlumpen } : {}), ...(eFpc ? { fpc: eFpc } : {}), ...(eKlumpen && eFpc && eKlumpen2 ? { klumpen2: eKlumpen2 } : {}), ...(eKlumpen && eFpc && eKlumpen2 && eFpc2 ? { fpc2: eFpc2 } : {}), ...(eSchicht && eEinsam ? { einsam: eEinsam } : {}) });
  const planWirksam = $derived(entwurfWirksam(planEntwurf));
  const planProblem = $derived(klumpenfrei === 'plan' && planWirksam ? entwurfPruefen(planWirksam, wahl, s.spalten) : null);
  const planSatz = $derived(planProblem ? entwurfProblemSatz(planProblem) : '');
  const planSpalten = $derived(s.spalten.filter(sp => sp.name !== wahl));
  const kannSetzen = $derived(!!wahl && !!art && !!pruefung && !pruefung.fehler && !laeuft && (art !== 'umfrage' || klumpenfrei !== '') && (art !== 'umfrage' || klumpenfrei !== 'plan' || (!!planWirksam && !planProblem)));
  const hatGewicht = $derived(!!s.gewicht || !!frage);

  /** Merkt, für welche Frage der Dialog sich schon von selbst geöffnet hat - geschlossen bleibt er, bis die Frage wechselt oder die Person ihn öffnet. */
  let gefragt: string | null = null;
  $effect(() => { const f = s.gewichtFrage; untrack(() => { if (f && f !== gefragt) { gefragt = f; gewichtDialog.offen = true; } if (!f) gefragt = null; }); });
  $effect(() => {
    if (gewichtDialog.offen && dlg && !dlg.open) {
      untrack(() => { spalte = gewichtDialog.spalte || (s.gewicht?.spalte ?? ''); weg = 'spalte'; art = s.gewicht?.art ?? ''; const pl = s.gewicht?.art === 'umfrage' ? entwurfWirksam(s.gewicht.entwurf) : null; klumpenfrei = pl ? 'plan' : s.gewicht?.art === 'umfrage' && typeof s.gewicht.klumpenfrei === 'boolean' ? (s.gewicht.klumpenfrei ? 'ja' : 'nein') : ''; eSchicht = pl?.schicht ?? ''; eKlumpen = pl?.klumpen ?? ''; eFpc = pl?.fpc ?? ''; eKlumpen2 = pl?.klumpen2 ?? ''; eFpc2 = pl?.fpc2 ?? ''; eEinsam = pl?.einsam ?? ''; fehler = ''; });
      dlg.showModal();
      tick().then(() => document.getElementById(frage ? 'fg-art-h' : 'fg-spalte')?.focus());
    } else if (!gewichtDialog.offen && dlg?.open) dlg.close();
  });
  const zu = () => { gewichtDialog.offen = false; };
  async function setzen() {
    if (!kannSetzen || !art) return;
    laeuft = true; fehler = '';
    try {
      const ein = art === 'umfrage' ? klumpenfrei === 'ja' : undefined, plan = art === 'umfrage' && klumpenfrei === 'plan' ? planWirksam ?? undefined : undefined;
      const f = frage ? await beantworteGewichtFrage(art, ein, plan) : await setzeFallgewicht({ spalte, art, ...(ein === undefined ? {} : { klumpenfrei: ein }), ...(plan ? { entwurf: plan } : {}) });
      if (f) fehler = f; else zu();
    } finally { laeuft = false; }
  }
  async function ausschalten() { laeuft = true; try { await schalteFallgewichtAus(); zu(); } finally { laeuft = false; } }
</script>

<dialog bind:this={dlg} use:dialogFokus class="fg" aria-labelledby="fg-t" aria-describedby="fg-text" onclose={() => { gewichtDialog.offen = false; }} oncancel={(e) => { e.preventDefault(); zu(); }}>
  <form class="dialog-innen" onsubmit={(e) => { e.preventDefault(); void setzen(); }}>
    <div class="dialog-kopf"><Icon n={frage ? 'hinweis' : 'regler'} k={frage ? 'hw' : undefined} /><h2 id="fg-t">{frage ? L(`Was bedeutet ${frage}?`, `What does ${frage} mean?`) : L('Fallgewicht', 'Case weight')}</h2>
      <HilfeLink id="fallgewichte" text={L('Hilfe zum Fallgewicht', 'Help on the case weight')} /></div>
    <p id="fg-text">{frage
      ? L(`In den Daten ist ${frage} als Fallgewicht eingeschaltet - aus einer SPSS-Datei oder durch einen Befehl. Statable rechnet erst weiter, wenn klar ist, was die Zahlen bedeuten.`, `${frage} is switched on as a case weight in the data - from an SPSS file or by a command. Statable does not calculate further until it is clear what the numbers mean.`)
      : L('Ein Fallgewicht sagt, wie stark eine Zeile zählt. Es gilt dann für alle Auswertungen des Projekts.', 'A case weight says how strongly a row counts. It then applies to all analyses of the project.')}</p>
    {#if !frage}
      <div class="segment" role="radiogroup" aria-label={L('Woher kommen die Gewichte?', 'Where do the weights come from?')}>
        <label><input id="fg-weg-spalte" type="radio" name="fg-weg" value="spalte" bind:group={weg}>{L('Vorhandene Spalte wählen', 'Choose an existing column')}</label>
        <label data-begriff="raking"><input id="fg-weg-raking" type="radio" name="fg-weg" value="raking" bind:group={weg}>{L('Gewichte berechnen (Raking, Kalibrieren)', 'Calculate weights (raking, calibration)')}</label>
      </div>
    {/if}
    {#if !frage && weg === 'raking'}
      <FallgewichtRaking fertig={zu} />
      <div class="knopfzeile"><button class="k leise" type="button" onclick={zu}>{L('Abbrechen', 'Cancel')}</button></div>
    {:else}
    {#if !frage}
      <div class="eingabe"><label for="fg-spalte">{L('Spalte mit dem Fallgewicht', 'Column with the case weight')}</label>
        <select id="fg-spalte" bind:value={spalte}>
          <option value="">{L('Bitte wählen', 'Please choose')}</option>
          {#each kandidaten as k (k.name)}<option value={k.name}>{k.bezeichnung ? `${k.name} - ${k.bezeichnung}` : k.name}</option>{/each}
        </select></div>
    {/if}
    <fieldset class="fg-art"><legend>{L('Was bedeuten die Zahlen?', 'What do the numbers mean?')}</legend>
      <label data-begriff="gewichtung" class="fg-wahl"><input id="fg-art-h" type="radio" name="fg-art" value="haeufigkeit" bind:group={art}><span><b>{L('Häufigkeitsgewicht', 'Frequency weight')}</b>
        {L('Die Zeile steht für mehrere gleiche Fälle: 3 heißt dreimal. Es sind ganze Zahlen. Tests rechnen, als gäbe es die Fälle wirklich so oft.', 'The row stands for several identical cases: 3 means three times. The numbers are whole numbers. Tests calculate as if the cases really occurred that often.')}</span></label>
      <label data-begriff="umfragegewicht" class="fg-wahl"><input id="fg-art-u" type="radio" name="fg-art" value="umfrage" bind:group={art}><span><b>{L('Umfragegewicht', 'Survey weight')}</b>
        {L('Die Zahl gleicht aus, dass Befragte unterschiedlich wahrscheinlich ausgewählt wurden (Hochrechnungsgewicht). Statable zeigt gewichtete Mittelwerte, Anteile und Prozente. Tests und Intervalle gibt es nur, wenn die Personen einzeln gezogen wurden oder der Stichprobenplan bekannt ist (siehe unten).', 'The number adjusts for respondents having been selected with different probabilities (design weight). Statable shows weighted means, proportions and percentages. Tests and intervals are only available if the people were drawn individually or the sampling design is known (see below).')}</span></label>
    </fieldset>
    {#if art === 'umfrage'}
      <fieldset class="fg-art"><legend id="fg-klumpenfrei-l">{klumpenFrage().frage}</legend>
        <label data-begriff="umfrage-stichprobenplan" class="fg-wahl"><input id="fg-klumpenfrei-ja" type="radio" name="fg-klumpenfrei" value="ja" bind:group={klumpenfrei}><span><b>{klumpenFrage().ja}</b>
          {L('Dann rechnet Statable Standardfehler, Intervalle und Tests mit den Gewichten (Taylor-Linearisierung, ohne Schichten und Klumpen).', 'Then Statable calculates standard errors, intervals and tests with the weights (Taylor linearization, without strata and clusters).')}</span></label>
        <label data-begriff="umfrage-stichprobenplan" class="fg-wahl"><input id="fg-klumpenfrei-nein" type="radio" name="fg-klumpenfrei" value="nein" bind:group={klumpenfrei}><span><b>{klumpenFrage().nein}</b>
          {klumpenSperrSatz()}</span></label>
        <label data-begriff="umfrage-stichprobenplan" class="fg-wahl"><input id="fg-klumpenfrei-plan" type="radio" name="fg-klumpenfrei" value="plan" bind:group={klumpenfrei}><span><b>{L('Nein, ich gebe den Stichprobenplan an', 'No, I will state the sampling design')}</b>
          {L('Schichten, Klumpen und die Größe der Grundgesamtheit. Dann rechnet Statable Standardfehler, Intervalle und Tests mit diesem Plan.', 'Strata, clusters and the size of the population. Statable then calculates standard errors, intervals and tests with this design.')}</span></label>
      </fieldset>
      {#if klumpenfrei === 'plan'}
        <fieldset class="fg-art fg-plan"><legend>{L('Stichprobenplan', 'Sampling design')}</legend>
          <p class="fg-hinweis"><HilfeLink id="umfrage-stichprobenplan" text={L('Hilfe zum Stichprobenplan', 'Help on the sampling design')} /></p>
          <div class="eingabe"><label for="fg-p-schicht">{L('Schicht (wahlweise)', 'Stratum (optional)')}</label>
            <select id="fg-p-schicht" bind:value={eSchicht}><option value="">{L('Keine Schichten', 'No strata')}</option>{#each planSpalten as k (k.name)}<option value={k.name}>{k.bezeichnung ? `${k.name} - ${k.bezeichnung}` : k.name}</option>{/each}</select></div>
          <div class="eingabe"><label for="fg-p-klumpen">{L('Klumpen, zum Beispiel Schule oder Haushalt (wahlweise)', 'Cluster, for example school or household (optional)')}</label>
            <select id="fg-p-klumpen" bind:value={eKlumpen}><option value="">{L('Keine Klumpen', 'No clusters')}</option>{#each planSpalten as k (k.name)}<option value={k.name}>{k.bezeichnung ? `${k.name} - ${k.bezeichnung}` : k.name}</option>{/each}</select></div>
          <div class="eingabe"><label for="fg-p-fpc">{eKlumpen ? L('Zahl der Klumpen in der Grundgesamtheit, je Schicht (wahlweise)', 'Number of clusters in the population, per stratum (optional)') : L('Anzahl in der Grundgesamtheit, je Schicht (wahlweise)', 'Number in the population, per stratum (optional)')}</label>
            <select id="fg-p-fpc" bind:value={eFpc}><option value="">{L('Nicht angegeben', 'Not stated')}</option>{#each planSpalten.filter(k => k.art === 'zahl') as k (k.name)}<option value={k.name}>{k.bezeichnung ? `${k.name} - ${k.bezeichnung}` : k.name}</option>{/each}</select></div>
          {#if eKlumpen && eFpc}
            <div class="eingabe"><label for="fg-p-klumpen2">{L('Zweite Stufe: Einheiten in den Klumpen (wahlweise)', 'Second stage: units within the clusters (optional)')}</label>
              <select id="fg-p-klumpen2" bind:value={eKlumpen2}><option value="">{L('Keine zweite Stufe', 'No second stage')}</option>{#each planSpalten as k (k.name)}<option value={k.name}>{k.bezeichnung ? `${k.name} - ${k.bezeichnung}` : k.name}</option>{/each}</select></div>
            {#if eKlumpen2}
              <div class="eingabe"><label for="fg-p-fpc2">{L('Zahl der Einheiten der zweiten Stufe in der Grundgesamtheit, je Klumpen', 'Number of second-stage units in the population, per cluster')}</label>
                <select id="fg-p-fpc2" bind:value={eFpc2}><option value="">{L('Nicht angegeben', 'Not stated')}</option>{#each planSpalten.filter(k => k.art === 'zahl') as k (k.name)}<option value={k.name}>{k.bezeichnung ? `${k.name} - ${k.bezeichnung}` : k.name}</option>{/each}</select></div>
              {#if !eFpc2}<p class="fg-hinweis">{L('Ohne diese Angabe spielt die zweite Stufe keine Rolle und wird nicht verwendet.', 'Without this information the second stage plays no role and is not used.')}</p>{/if}
            {/if}
          {/if}
          {#if eSchicht}
            <div class="eingabe"><label for="fg-p-einsam">{L('Schicht mit nur einem Klumpen', 'Stratum with only one cluster')}</label>
              <select id="fg-p-einsam" bind:value={eEinsam}><option value="">{L('Nicht zulassen: Statable meldet die Schichten', 'Do not allow: Statable reports the strata')}</option>{#each EINSAME_REGELN as r (r)}<option value={r}>{einsamName(r)}</option>{/each}</select>
              <p class="fg-hinweis">{einsamSatz()}</p></div>
          {/if}
          {#if planSatz}<p class="fg-fehler" role="alert">{planSatz}</p>{/if}
        </fieldset>
      {/if}
    {/if}
    <div class="fg-meldung">
      {#if fehlerSatz || fehler}<p class="fg-fehler" role="alert">{fehler || fehlerSatz}</p>{/if}
      {#each hinweise as h (h)}<p class="fg-hinweis">{h}</p>{/each}
    </div>
    <div class="knopfzeile">
      <button class="k haupt" type="submit" disabled={!kannSetzen}>{frage ? L('So verwenden', 'Use it like this') : L('Fallgewicht setzen', 'Set the case weight')}</button>
      {#if hatGewicht}<button class="k" type="button" disabled={laeuft} onclick={() => void ausschalten()}>{L('Fallgewicht ausschalten', 'Switch the case weight off')}</button>{/if}
      <button class="k leise" type="button" onclick={zu}>{frage ? L('Später entscheiden', 'Decide later') : L('Abbrechen', 'Cancel')}</button>
    </div>
    {/if}
  </form>
</dialog>

<style>
  .fg-art { border: 0; padding: 0; margin: 0; display: grid; gap: var(--a2); }
  .fg-art legend { font-weight: 650; margin-bottom: var(--a2); padding: 0; }
  .fg-wahl { display: flex; gap: var(--a3); align-items: flex-start; padding: var(--a2) var(--a3); border: 1px solid var(--linie); border-radius: var(--r-mittel, 8px); cursor: pointer; }
  .fg-wahl:has(input:checked) { border-color: var(--akzent); background: var(--akzent-hell); }
  .fg-wahl input { margin-top: .35em; flex: none; }
  .fg-wahl b { display: block; }
  .fg-plan { padding-inline-start: var(--a3); }
  .fg-meldung { min-height: 1.5em; display: grid; gap: var(--a2); }
  .fg-meldung p { margin: 0; color: var(--tinte-2); }
  .fg-meldung .fg-fehler { color: var(--tinte); font-weight: 650; }
</style>
