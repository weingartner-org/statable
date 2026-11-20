<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /**
   * Der Weg „Gewichte berechnen (Raking)“ im Dialog „Fallgewicht“ (Später, Welle S-F2, Teil B). Aus bekannten Randverteilungen der Grundgesamtheit (Zahlen oder Anteile)
   * rechnet lib/raking.ts Umfragegewichte; das Ergebnis wird eine NEUE Spalte. Danach kommt die Pflichtfrage „einzeln gezogen“, dann wird die Spalte als Umfragegewicht gesetzt.
   * Der Dialog ersetzt das Fallgewicht; ein schon gesetztes Fallgewicht ist KEIN Ausgangsgewicht (dafür gibt es die Wahl „Ausgangsgewicht aus Spalte“).
   */
  import { s, d, L } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { gewichtsKandidaten, rakingKandidaten, rakingKategorien, rakingStart, rakingRaender, rakingRechnen, rakingUebernehmen, kalStart, kalNameStandard, kalibrierenRechnen, kalibrierenUebernehmen, type KalVerfahren, type KalRechnung } from '../lib/fallgewicht.svelte';
  import { kalibrierenHinweisSatz } from '../lib/genauigkeit';
  import { KAL_MAX_MERKMALE } from '../lib/genauigkeit';
  import { Lp } from '../lib/sitzung.svelte';
  import { rakingSaetze, rakingFehlerSatz, rakingSeSatz, RAKING_MAX_MERKMALE, type RakingErgebnis } from '../lib/raking';
  import { klumpenFrage, klumpenSperrSatz } from '../lib/gewichte';
  import { lesbar } from '../lib/verzeichnis';
  import { Laedt } from '../lib/laedt.svelte';
  import Rechnet from './Rechnet.svelte';

  let { fertig }: { fertig: () => void } = $props();

  let z = $state(rakingStart());
  let klumpen = $state<'ja' | 'nein' | ''>('');
  let verfahren = $state<KalVerfahren>('raking');
  let kal = $state(kalStart());
  let kalErg = $state<{ schluessel: string; r: KalRechnung } | null>(null);
  const kalibriert = $derived(verfahren !== 'raking');
  const maxMerkmale = $derived(kalibriert ? KAL_MAX_MERKMALE : RAKING_MAX_MERKMALE);
  function waehleVerfahren(v: KalVerfahren) {
    verfahren = v;
    if (v !== 'raking' && z.merkmale.length > KAL_MAX_MERKMALE) { for (const m of z.merkmale.slice(KAL_MAX_MERKMALE)) delete z.eingaben[m]; z.merkmale = z.merkmale.slice(0, KAL_MAX_MERKMALE); }
    if (z.name === 'raking_gewicht' || z.name === kalNameStandard) z.name = v === 'raking' ? 'raking_gewicht' : kalNameStandard;
    klumpen = '';
  }
  let fehler = $state('');
  let ergebnis = $state<{ schluessel: string; erg: RakingErgebnis } | null>(null);
  const lad = new Laedt(), setzt = new Laedt();

  const kandidaten = $derived(rakingKandidaten());
  const kat = $derived(Object.fromEntries(z.merkmale.map(m => [m, rakingKategorien(m) ?? []])));
  const ausgangKandidaten = $derived(gewichtsKandidaten());
  const anzeige = (m: string) => lesbar(s.spalten.find(x => x.name === m), true);
  const raender = $derived(rakingRaender(z));
  /** Das Ergebnis gilt nur, solange die Eingaben dieselben sind wie beim Rechnen. */
  const schluessel = $derived(JSON.stringify([$state.snapshot(z), s.zeilen.length, verfahren, $state.snapshot(kal)]));
  const aktuell = $derived(!kalibriert && ergebnis && ergebnis.schluessel === schluessel ? ergebnis.erg : null);
  const aktuellK = $derived(kalibriert && kalErg && kalErg.schluessel === schluessel ? kalErg.r : null);
  const kalOk = $derived(aktuellK && aktuellK.ok ? aktuellK : null);
  const summeVon = (m: string) => raender.raender[z.merkmale.indexOf(m)] ? Object.values(raender.raender[z.merkmale.indexOf(m)]!).reduce((a, v) => a + v, 0) : 0;
  const kannRechnen = $derived(z.merkmale.length >= 1 && raender.ungueltig.length === 0 && !lad.aktiv && !setzt.aktiv);
  const kannSetzen = $derived(((!!aktuell && aktuell.ok) || (!!kalOk && kalOk.erg.negativ === 0)) && klumpen !== '' && !setzt.aktiv);

  function umschalten(name: string, an: boolean) {
    if (an) { if (z.merkmale.length >= maxMerkmale || z.merkmale.includes(name)) return; z.merkmale = [...z.merkmale, name]; z.eingaben[name] = {}; }
    else { z.merkmale = z.merkmale.filter(m => m !== name); delete z.eingaben[name]; }
  }
  const stichprobeEinfuegen = (m: string) => { z.eingaben[m] = Object.fromEntries((kat[m] ?? []).map(k => [k.wert, String(k.n)])); };
  async function rechnen() {
    fehler = '';
    const sk = schluessel;
    await lad.mit(async () => {
      await new Promise(r => setTimeout(r, 30));
      if (!kalibriert) { ergebnis = { schluessel: sk, erg: rakingRechnen(z) }; return; }
      try { kalErg = { schluessel: sk, r: await kalibrierenRechnen(z, verfahren as 'linear' | 'begrenzt', kal) }; }
      catch (e) { kalErg = null; fehler = (e as Error)?.message || L('Das Rechnen ist fehlgeschlagen.', 'The calculation failed.'); }
    });
  }
  async function setzen() {
    if (!kannSetzen) return;
    await setzt.mit(async () => {
      const f = kalOk ? await kalibrierenUebernehmen(z, kalOk.erg, verfahren as 'linear' | 'begrenzt', klumpen === 'ja') : aktuell ? await rakingUebernehmen(z, aktuell, klumpen === 'ja') : null;
      if (f) fehler = f; else fertig();
    });
  }
  const eins = (v: number) => zahlDe(Math.round(v * 10) / 10, 1);
  const zwei = (v: number) => zahlDe(Math.round(v * 100) / 100, 2);
  const merkmaleText = $derived(z.merkmale.map(anzeige));
</script>

<div class="rk">
  <fieldset class="fg-art"><legend>{L('Welches Verfahren?', 'Which method?')}</legend>
    <div class="rk-liste" role="radiogroup" aria-label={L('Verfahren', 'Method')}>
      <label class="rk-merkmal"><input id="rk-v-raking" type="radio" name="rk-verfahren" checked={verfahren === 'raking'} onchange={() => waehleVerfahren('raking')}>{L('Raking', 'Raking')}</label>
      <label class="rk-merkmal"><input id="rk-v-linear" type="radio" name="rk-verfahren" checked={verfahren === 'linear'} onchange={() => waehleVerfahren('linear')}>{L('Linear kalibrieren (GREG)', 'Calibrate linearly (GREG)')}</label>
      <label class="rk-merkmal"><input id="rk-v-begrenzt" type="radio" name="rk-verfahren" checked={verfahren === 'begrenzt'} onchange={() => waehleVerfahren('begrenzt')}>{L('Begrenzt kalibrieren', 'Calibrate with limits')}</label>
    </div>
    {#if kalibriert}<span class="hilfe">{L('Kalibrieren passt die Gewichte so an, dass die Summen der Grundgesamtheit stimmen. Linear kann negative Gewichte ergeben; begrenzt hält den Faktor neu zu alt zwischen zwei Grenzen. Es braucht Zahlen der Grundgesamtheit, keine Anteile.', 'Calibration adjusts the weights so that the population totals match. Linear can give negative weights; with limits, the factor new to old stays between two limits. It needs population counts, not shares.')}</span>{/if}
  </fieldset>
  <p class="hilfe">{d('Du kennst die Verteilung der Grundgesamtheit (zum Beispiel aus dem Zensus) für ein oder mehrere Merkmale. Statable rechnet Gewichte, die die Stichprobe an diese Ränder angleichen, und legt sie als neue Spalte an.',
    'Sie kennen die Verteilung der Grundgesamtheit (zum Beispiel aus dem Zensus) für ein oder mehrere Merkmale. Statable rechnet Gewichte, die die Stichprobe an diese Ränder angleichen, und legt sie als neue Spalte an.',
    'You know the distribution of your population (for example from a census) for one or more variables. Statable calculates weights that adjust the sample to these margins and creates them as a new column.')}</p>

  <fieldset class="fg-art"><legend>{L('1  Welche Merkmale haben bekannte Ränder?', '1  Which variables have known margins?')}</legend>
    {#if kandidaten.length === 0}
      <p class="hilfe">{L('Keine Spalte hat zwischen 2 und 50 verschiedene Werte. Raking braucht Merkmale mit Gruppen, zum Beispiel Geschlecht oder Altersgruppe.', 'No column has between 2 and 50 different values. Raking needs variables with groups, for example gender or age group.')}</p>
    {:else}
      <div class="rk-liste" role="group" aria-label={L('Merkmale', 'Variables')}>
        {#each kandidaten as k (k.name)}
          <label class="rk-merkmal"><input id={`rk-merkmal-${k.name}`} type="checkbox" checked={z.merkmale.includes(k.name)} disabled={!z.merkmale.includes(k.name) && z.merkmale.length >= maxMerkmale} onchange={(e) => umschalten(k.name, (e.currentTarget as HTMLInputElement).checked)}>{lesbar(k, true)}</label>
        {/each}
      </div>
      <span class="hilfe">{L(`Bis zu ${maxMerkmale} Merkmale. Mit einem Merkmal ist es eine einfache Anpassung (Poststratifizierung); ab zwei gleicht Raking nur die Ränder an, nicht die Verbindung der Merkmale.`, `Up to ${maxMerkmale} variables. With one variable it is a simple adjustment (poststratification); from two, raking adjusts only the margins, not the combination of the variables.`)}</span>
    {/if}
  </fieldset>

  {#if z.merkmale.length}
    <fieldset class="fg-art"><legend>{L('2  Wie sieht die Grundgesamtheit aus?', '2  What does the population look like?')}</legend>
      <span class="hilfe">{L('Zahl oder Anteil je Kategorie, wie in der Quelle (nichts ist vorgegeben). Jeder Rand wird durch seine eigene Summe geteilt. Die Quelle gehört in den Bericht.', 'A number or share per category, as in the source (nothing is preset). Each margin is divided by its own sum. The source belongs in the report.')}</span>
      {#each z.merkmale as m, mi (m)}
        <div class="rk-rand">
          <h3>{anzeige(m)}</h3>
          <table class="rk-tab"><thead><tr><th scope="col">{L('Kategorie', 'Category')}</th><th scope="col" class="r">{L('in der Stichprobe', 'in the sample')}</th><th scope="col">{L('in der Grundgesamtheit', 'in the population')}</th></tr></thead>
            <tbody>
              {#each kat[m] ?? [] as k, ki (k.wert)}
                <tr><th scope="row">{k.label}</th><td class="r">{k.n}</td>
                  <td><input id={`rk-${mi}-${ki}`} type="text" inputmode="decimal" autocomplete="off" aria-label={`${anzeige(m)}, ${k.label}`} value={z.eingaben[m]?.[k.wert] ?? ''} oninput={(e) => { (z.eingaben[m] ??= {})[k.wert] = (e.currentTarget as HTMLInputElement).value; }} aria-invalid={raender.ungueltig.some(u => u.merkmal === m && u.kategorie === k.wert) ? 'true' : undefined} aria-describedby={raender.ungueltig.some(u => u.merkmal === m && u.kategorie === k.wert) ? 'rk-fehler-zahl' : undefined} style="max-width:12ch"></td></tr>
              {/each}
            </tbody></table>
          <div class="knopfzeile"><button class="k klein" type="button" onclick={() => stichprobeEinfuegen(m)}>{L('Verteilung der Stichprobe einfügen', 'Insert the distribution of the sample')}</button>
            <span class="hilfe">{L(`Summe: ${zahlDe(summeVon(m))}`, `Sum: ${zahlDe(summeVon(m))}`)}</span></div>
        </div>
      {/each}
      {#if raender.ungueltig.length}<p class="fg-fehler" role="alert" id="rk-fehler-zahl">{L('Mindestens ein Feld enthält keine Zahl.', 'At least one field does not contain a number.')}</p>{/if}
    </fieldset>

    <fieldset class="fg-art"><legend>{L('3  Ausgangsgewicht und Name', '3  Starting weight and name')}</legend>
      <div class="eingabe"><label for="rk-ausgang">{L('Ausgangsgewicht aus Spalte (optional)', 'Starting weight from column (optional)')}</label>
        <select id="rk-ausgang" bind:value={z.ausgang}>
          <option value="">{L('Keines (alle Fälle zählen gleich)', 'None (all cases count equally)')}</option>
          {#each ausgangKandidaten as k (k.name)}<option value={k.name}>{lesbar(k, true)}</option>{/each}
        </select>
        <span class="hilfe">{L('Zum Beispiel das Designgewicht einer Stichprobe mit ungleichen Auswahlwahrscheinlichkeiten. Ein schon gesetztes Fallgewicht wird nicht von selbst benutzt.', 'For example the design weight of a sample with unequal selection probabilities. A case weight that is already set is not used automatically.')}</span></div>
      {#if kalibriert}
        <div class="eingabe"><label for="rk-gesamt">{L('Gesamtzahl der Grundgesamtheit (optional)', 'Total of the population (optional)')}</label><input id="rk-gesamt" type="text" inputmode="decimal" autocomplete="off" bind:value={kal.gesamt} style="max-width:16ch">
          <span class="hilfe">{L('Leer: die Summe des ersten Merkmals.', 'Empty: the sum of the first variable.')}</span></div>
      {/if}
      {#if verfahren === 'begrenzt'}
        <div class="eingabe"><label for="rk-lo">{L('Untere Grenze des Faktors (neu durch alt)', 'Lower limit of the factor (new over old)')}</label><input id="rk-lo" type="text" inputmode="decimal" autocomplete="off" bind:value={kal.lo} style="max-width:10ch"></div>
        <div class="eingabe"><label for="rk-hi">{L('Obere Grenze des Faktors', 'Upper limit of the factor')}</label><input id="rk-hi" type="text" inputmode="decimal" autocomplete="off" bind:value={kal.hi} style="max-width:10ch">
          <span class="hilfe">{L('Die untere Grenze liegt zwischen 0 und 1, die obere über 1.', 'The lower limit is between 0 and 1, the upper one above 1.')}</span></div>
      {/if}
      <div class="eingabe"><label for="rk-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="rk-name" type="text" bind:value={z.name} style="max-width:24ch"></div>
    </fieldset>

    <div class="knopfzeile"><button id="rk-rechnen" class="k haupt" type="button" disabled={!kannRechnen} onclick={() => void rechnen()}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{kalibriert ? L('Gewichte kalibrieren', 'Calibrate weights') : L('Gewichte berechnen', 'Calculate weights')}</button></div>
  {/if}

  {#if lad.sichtbar}<p role="status"><Rechnet text={L('Die Gewichte werden berechnet …', 'The weights are being calculated …')} /></p>{/if}

  {#if aktuellK}
    <div class="rk-erg" use:ergebnisAnsage={{ satz: 'h3, .rk-satz', anzahl: 2, anfang: true }}>
      {#if !aktuellK.ok}
        <p class="fg-fehler" role="alert">{aktuellK.satz}</p>
      {:else}
        {@const e = aktuellK.erg}
        <h3>{L('Ergebnis', 'Result')}</h3>
        <dl>
          <div><dt>{L('Größte Abweichung eines Rands', 'Largest deviation of a margin')}</dt><dd>{e.maxAbweichung * aktuellK.plan.gesamt < 1e-4 ? L('unter 0,0001 Personen', 'under 0.0001 people') : L(`${zahlDe(e.maxAbweichung * aktuellK.plan.gesamt, 4)} Personen`, `${zahlDe(e.maxAbweichung * aktuellK.plan.gesamt, 4)} people`)}</dd></div>
          <div><dt>{L('Faktor neu durch alt, kleinster bis größter', 'Factor new over old, smallest to largest')}</dt><dd>{zwei(e.gMin)} {L('bis', 'to')} {zwei(e.gMax)}</dd></div>
          <div><dt>{L('Effektive Stichprobengröße (Kish)', 'Effective sample size (Kish)')}</dt><dd>{L(`${eins(e.kishNeff)} von ${e.nGewichtet} Fällen`, `${eins(e.kishNeff)} of ${e.nGewichtet} cases`)}</dd></div>
          <div><dt>{L('Designeffekt', 'Design effect')}</dt><dd>{zwei(e.designeffekt)}</dd></div>
          <div><dt>{L('Kleinstes Gewicht', 'Smallest weight')}</dt><dd>{zwei(e.kleinstes)}</dd></div>
          <div><dt>{L('Größtes Gewicht', 'Largest weight')}</dt><dd>{zwei(e.groesstes)}</dd></div>
          <div><dt>{L('Negative Gewichte', 'Negative weights')}</dt><dd>{e.negativ}</dd></div>
        </dl>
        {#each e.hinweise as h (h)}<p class="rk-satz" lang={s.einst.sprache}>{kalibrierenHinweisSatz(h, e)}</p>{/each}
        {#if e.hinweise.includes('begrenzt-kalibrieren') && verfahren === 'linear'}<div class="knopfzeile"><button id="rk-zu-begrenzt" class="k" type="button" onclick={() => waehleVerfahren('begrenzt')}>{L('Begrenzt kalibrieren', 'Calibrate with limits')}</button></div>{/if}
        {#if e.ohneGewicht.length}<p class="hilfe">{Lp(e.ohneGewicht.length, `${e.ohneGewicht.length} Zeile bekam kein neues Gewicht (kein Ausgangsgewicht oder ein Wert fehlt).`, `${e.ohneGewicht.length} Zeilen bekamen kein neues Gewicht (kein Ausgangsgewicht oder ein Wert fehlt).`, `${e.ohneGewicht.length} row got no new weight (no starting weight or a value is missing).`, `${e.ohneGewicht.length} rows got no new weight (no starting weight or a value is missing).`)}</p>{/if}
        <p class="hilfe">{L('Kalibrieren gleicht nur die angegebenen Summen an. Standardfehler rechnet Statable danach mit den neuen Gewichten als festen Zahlen.', 'Calibration adjusts only the totals given. Statable then calculates standard errors with the new weights as fixed numbers.')}</p>
        {#if e.negativ === 0}
        <fieldset class="fg-art"><legend id="rk-klumpen-l2">{klumpenFrage().frage}</legend>
          <label data-begriff="umfrage-stichprobenplan" class="fg-wahl"><input id="rk-klumpen-ja" type="radio" name="rk-klumpen" value="ja" bind:group={klumpen}><span><b>{klumpenFrage().ja}</b>
            {L('Dann rechnet Statable Standardfehler, Intervalle und Tests mit den Gewichten (Taylor-Linearisierung, ohne Schichten und Klumpen).', 'Then Statable calculates standard errors, intervals and tests with the weights (Taylor linearization, without strata and clusters).')}</span></label>
          <label data-begriff="umfrage-stichprobenplan" class="fg-wahl"><input id="rk-klumpen-nein" type="radio" name="rk-klumpen" value="nein" bind:group={klumpen}><span><b>{klumpenFrage().nein}</b>
            {klumpenSperrSatz()}</span></label>
        </fieldset>
        {/if}
        {#if fehler}<p class="fg-fehler" role="alert">{fehler}</p>{/if}
        <div class="knopfzeile"><button id="rk-setzen" class="k haupt" type="button" disabled={!kannSetzen} onclick={() => void setzen()}>{#if setzt.sichtbar}<Rechnet imKnopf />{/if}{L('Spalte anlegen und als Umfragegewicht setzen', 'Create the column and set it as the survey weight')}</button></div>
      {/if}
    </div>
  {:else if aktuell}
    <div class="rk-erg" use:ergebnisAnsage={{ satz: 'h3, .rk-satz', anzahl: 2, anfang: true }}>
      {#if !aktuell.ok}
        <p class="fg-fehler" role="alert">{rakingFehlerSatz(aktuell, merkmaleText)}</p>
      {:else}
        <h3>{L('Ergebnis', 'Result')}</h3>
        <dl>
          <div><dt>{L('Durchgänge', 'Iterations')}</dt><dd>{aktuell.durchgaenge}</dd></div>
          <div><dt>{L('Größte Abweichung eines Rands', 'Largest deviation of a margin')}</dt><dd>{aktuell.maxAbweichung * aktuell.nGewichtet < 1e-4 ? L('unter 0,0001 Personen', 'under 0.0001 people') : L(`${zahlDe(aktuell.maxAbweichung * aktuell.nGewichtet, 4)} Personen`, `${zahlDe(aktuell.maxAbweichung * aktuell.nGewichtet, 4)} people`)}</dd></div>
          <div><dt>{L('Effektive Stichprobengröße (Kish)', 'Effective sample size (Kish)')}</dt><dd>{L(`${eins(aktuell.kish)} von ${aktuell.nGewichtet} Fällen`, `${eins(aktuell.kish)} of ${aktuell.nGewichtet} cases`)}</dd></div>
          <div><dt>{L('Designeffekt', 'Design effect')}</dt><dd>{zwei(aktuell.designeffekt)}</dd></div>
          <div><dt>{L('Kleinstes Gewicht', 'Smallest weight')}</dt><dd>{zwei(aktuell.kleinstes)}</dd></div>
          <div><dt>{L('Größtes Gewicht', 'Largest weight')}</dt><dd>{zwei(aktuell.groesstes)}</dd></div>
          <div><dt>{L('Verhältnis größtes zu kleinstem', 'Ratio of largest to smallest')}</dt><dd>{eins(aktuell.verhaeltnis)}</dd></div>
        </dl>
        {#each rakingSaetze(aktuell, merkmaleText) as satz (satz)}<p class="rk-satz" lang={s.einst.sprache}>{satz}</p>{/each}
        <p class="hilfe">{rakingSeSatz()}</p>
        <p class="hilfe">{L('Raking gleicht nur die angegebenen Ränder an. Was daran hängt, bleibt verzerrt. Ist die gemeinsame Verteilung der Merkmale bekannt, ist die Poststratifizierung mit allen Zellen genauer.', 'Raking adjusts only the margins given. Whatever depends on them stays biased. If you know the joint distribution of the variables, poststratification with all cells is more accurate.')}</p>

        <fieldset class="fg-art"><legend id="rk-klumpen-l">{klumpenFrage().frage}</legend>
          <label data-begriff="umfrage-stichprobenplan" class="fg-wahl"><input id="rk-klumpen-ja" type="radio" name="rk-klumpen" value="ja" bind:group={klumpen}><span><b>{klumpenFrage().ja}</b>
            {L('Dann rechnet Statable Standardfehler, Intervalle und Tests mit den Gewichten (Taylor-Linearisierung, ohne Schichten und Klumpen).', 'Then Statable calculates standard errors, intervals and tests with the weights (Taylor linearization, without strata and clusters).')}</span></label>
          <label data-begriff="umfrage-stichprobenplan" class="fg-wahl"><input id="rk-klumpen-nein" type="radio" name="rk-klumpen" value="nein" bind:group={klumpen}><span><b>{klumpenFrage().nein}</b>
            {klumpenSperrSatz()}</span></label>
        </fieldset>
        {#if fehler}<p class="fg-fehler" role="alert">{fehler}</p>{/if}
        <div class="knopfzeile"><button id="rk-setzen" class="k haupt" type="button" disabled={!kannSetzen} onclick={() => void setzen()}>{#if setzt.sichtbar}<Rechnet imKnopf />{/if}{L('Spalte anlegen und als Umfragegewicht setzen', 'Create the column and set it as the survey weight')}</button></div>
      {/if}
    </div>
  {:else if fehler}
    <p class="fg-fehler" role="alert">{fehler}</p>
  {/if}
</div>

<style>
  .rk { display: grid; gap: var(--a4); }
  .rk-liste { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); }
  .rk-merkmal { display: inline-flex; gap: var(--a2); align-items: center; cursor: pointer; }
  .rk-rand { display: grid; gap: var(--a2); }
  .rk-rand h3, .rk-erg h3 { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin: 0; }
  .rk-tab { border-collapse: collapse; width: 100%; max-width: 560px; }
  .rk-tab th, .rk-tab td { text-align: start; padding: var(--a1) var(--a3); border-bottom: 1px solid var(--linie); font-weight: 400; }
  .rk-tab thead th { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; }
  .rk-tab tbody th { font-weight: 600; }
  .rk-tab .r { text-align: right; font-variant-numeric: tabular-nums; }
  .rk-tab input { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a1) var(--a3); width: 100%; }
  .rk-tab input[aria-invalid='true'] { border-color: var(--verlust); }
  .rk-erg { display: grid; gap: var(--a3); background: var(--blatt-2); border-radius: var(--r); padding: var(--a4); }
  .rk-erg dl { display: grid; gap: var(--a1); margin: 0; }
  .rk-erg dl div { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--a3); border-bottom: 1px solid var(--linie); padding: var(--a1) 0; }
  .rk-erg dt { color: var(--tinte-2); }
  .rk-erg dd { margin: 0; font-weight: 650; font-variant-numeric: tabular-nums; }
  .rk-satz { margin: 0; }
  .fg-art { border: 0; padding: 0; margin: 0; display: grid; gap: var(--a2); }
  .fg-art legend { font-weight: 650; margin-bottom: var(--a2); padding: 0; }
  .fg-wahl { display: flex; gap: var(--a3); align-items: flex-start; padding: var(--a2) var(--a3); border: 1px solid var(--linie); border-radius: var(--r-mittel, 8px); cursor: pointer; }
  .fg-wahl:has(input:checked) { border-color: var(--akzent); background: var(--akzent-hell); }
  .fg-wahl input { margin-top: .35em; flex: none; }
  .fg-wahl b { display: block; }
  .fg-fehler { margin: 0; color: var(--tinte); font-weight: 650; }
</style>
