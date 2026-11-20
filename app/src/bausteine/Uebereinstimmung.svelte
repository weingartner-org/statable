<script lang="ts">
  /**
   * „Kodieren wir gleich?“ (Intercoder-Übereinstimmung), Stufe 5, Paket 5E1: Paar, Schwelle, Codes, Ergebnis auf Dokument- und Segmentebene als Tabellen,
   * Abweichungsliste nach Gruppen, Einstieg in den Konsens (`KonsensEinigung.svelte`). Rechenkerne: `lib/qualauswertung.ts`, `lib/segmentuebereinstimmung.ts`.
   * Text der Textstellen kommt nur als Text auf die Seite (nie als HTML).
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { dez } from '../i18n/profil';
  import { iv, konsensEntwurf, qualProjekt, setzeKonsensEntwurf } from '../lib/interviews.svelte';
  import { dokumentUebereinstimmung } from '../lib/qualauswertung';
  import { segmentUebereinstimmung, type SegmentErgebnis } from '../lib/segmentuebereinstimmung';
  import { ART_REIHENFOLGE, SCHWELLE_SATZ, abweichungenAnzeige, artText, kodierbareCodes, type AbweichungAnzeige } from '../lib/qualauswertung-ausgabe';
  import type { IntercoderErgebnis } from '../lib/intercoder';
  import KonsensEinigung from './KonsensEinigung.svelte';

  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
  const q = $derived(qualProjekt());
  const codes = $derived(q ? kodierbareCodes(q) : []);
  const personen = $derived(q?.kodierende ?? []);
  const hatKodierungen = $derived((q?.kodierungen.length ?? 0) > 0);
  const SCHWELLEN = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

  let a = $state(''), b = $state('');
  let schwelle = $state(90);
  let gewaehlt = $state<string[]>([]);
  let angefangen = $state(false);
  $effect(() => { if (!angefangen && codes.length) { gewaehlt = codes.map(c => c.id); angefangen = true; } });
  $effect(() => {
    if (personen.length >= 2 && (!personen.some(p => p.id === a) || !personen.some(p => p.id === b) || a === b)) { a = personen[0]!.id; b = personen[1]!.id; }
  });

  interface Erg { a: string; b: string; schwelle: number; codes: string[]; dok: { ergebnis: IntercoderErgebnis; jeCode: { code: string; beide: number; nurA: number; nurB: number; keiner: number }[] }; seg: SegmentErgebnis; anz: AbweichungAnzeige[]; namen: { a: string; b: string } }
  let erg = $state<Erg | null>(null);
  const nameVon = (id: string): string => personen.find(p => p.id === id)?.name ?? '?';
  const codeName = (id: string): string => q?.codes.find(c => c.id === id)?.name ?? id;
  const gleich = (x: string[], y: string[]): boolean => x.length === y.length && [...x].sort().every((v, i) => v === [...y].sort()[i]);

  async function berechnen() {
    if (!q) return;
    if (!a || !b || a === b) { sage(L('Bitte zwei verschiedene Personen wählen.', 'Please choose two different people.'), 'dringend'); document.getElementById('qu-a')?.focus(); return; }
    if (!gewaehlt.length) { sage(L('Bitte mindestens einen Code wählen.', 'Please choose at least one code.'), 'dringend'); document.getElementById('qu-codes-leg')?.focus(); return; }
    const cs = [...gewaehlt], s = schwelle / 100;
    const seg = segmentUebereinstimmung(q, { a, b, codes: cs, schwelle: s });
    const namen = { a: nameVon(a), b: nameVon(b) };
    erg = { a, b, schwelle: s, codes: cs, dok: dokumentUebereinstimmung(q, { a, b, codes: cs }), seg, anz: abweichungenAnzeige(q, seg.abweichungen, namen, sprache()), namen };
    await tick();
    const h = document.getElementById('qu-erg-t'); h?.scrollIntoView({ block: 'start' }); h?.focus();
    sage(L(`Übereinstimmung berechnet: ${Lp(erg.seg.abweichungen.length, '1 Abweichung', `${erg.seg.abweichungen.length} Abweichungen`, '1 deviation', `${erg.seg.abweichungen.length} deviations`)} auf Segmentebene.`, `Agreement calculated: ${Lp(erg.seg.abweichungen.length, '1 Abweichung', `${erg.seg.abweichungen.length} Abweichungen`, '1 deviation', `${erg.seg.abweichungen.length} deviations`)} at passage level.`));
  }

  async function konsensBeginnen() {
    const e = erg;
    if (!e) return;
    const vorhanden = konsensEntwurf();
    const neu = () => { setzeKonsensEntwurf({ a: e.a, b: e.b, codes: e.codes, schwelle: e.schwelle, entscheidungen: [], position: 0 }); void tick().then(zumKonsens); };
    if (!vorhanden) { neu(); return; }
    if (vorhanden.a === e.a && vorhanden.b === e.b && vorhanden.schwelle === e.schwelle && gleich(vorhanden.codes, e.codes)) { zumKonsens(); return; }
    iv.rueckfrage = {
      titel: L('Eine neue Einigung beginnen?', 'Start a new agreement?'),
      text: L('Es gibt schon eine angefangene Einigung für andere Personen, Codes oder eine andere Schwelle. Ihre Entscheidungen dort gehen verloren, wenn Sie eine neue beginnen.', 'There is already an agreement in progress for other people, codes or another threshold. Your decisions there are lost if you start a new one.'),
      ja: L('Neue Einigung beginnen', 'Start new agreement'), tun: neu,
    };
  }
  function zumKonsens() { const h = document.getElementById('qk-t'); h?.scrollIntoView({ block: 'start' }); h?.focus(); }
  const fortsetzen = $derived.by(() => { const v = konsensEntwurf(); return !!erg && !!v && v.a === erg.a && v.b === erg.b && v.schwelle === erg.schwelle && gleich(v.codes, erg.codes); });

  const k2 = (x: number | null): string => (x === null ? '-' : dez(x.toFixed(2)));
  const pz = (p: number | null): string => (p === null ? '-' : `${dez((p * 100).toFixed(1))} %`);
  const zeilenDok = $derived(erg ? [
    { name: L('Prozent übereinstimmend', 'Percent agreement'), wert: pz(erg.dok.ergebnis.prozent.wert) },
    { name: L('Cohens Kappa', "Cohen's kappa"), wert: k2(erg.dok.ergebnis.cohen) },
    { name: L('Brennan-Prediger-Koeffizient', 'Brennan-Prediger coefficient'), wert: k2(erg.dok.ergebnis.bp.wert) },
    { name: L('Krippendorffs Alpha', "Krippendorff's alpha"), wert: k2(erg.dok.ergebnis.alpha.wert) },
    { name: L('Gwets AC1', "Gwet's AC1"), wert: k2(erg.dok.ergebnis.ac1.wert) },
  ] : []);
</script>

<div class="ue" role="group" aria-label={L('Intercoder-Übereinstimmung', 'Intercoder agreement')}>
  {#if !q || !hatKodierungen || personen.length < 2}
    <p class="hilfe">{L('Dafür braucht es mindestens zwei Kodierende mit Kodierungen. Lesen Sie zum Beispiel eine .qdpx-Datei ein, in der zwei Personen dieselben Interviews kodiert haben.', 'This needs at least two coders with codings. For example, read in a .qdpx file in which two people coded the same interviews.')}</p>
  {:else}
    <p class="hilfe">{L('Übereinstimmung zu messen passt zu Verfahren mit festem Kodierleitfaden (zum Beispiel inhaltlich strukturierende Inhaltsanalyse). Bei reflexiver thematischer Analyse ist sie nicht sinnvoll; dort zählt das Gespräch über die Deutung.', 'Measuring agreement suits methods with a fixed coding guide (for example structuring content analysis). With reflexive thematic analysis it makes no sense; there the conversation about the interpretation counts.')}</p>

    <fieldset class="gruppe">
      <legend>{L('Wer wird verglichen?', 'Who is compared?')}</legend>
      <div class="eingabe"><label for="qu-a">{L('Kodierende Person A', 'Coder A')}</label>
        <select id="qu-a" bind:value={a}>{#each personen as p (p.id)}<option value={p.id} disabled={p.id === b}>{p.name}</option>{/each}</select></div>
      <div class="eingabe"><label for="qu-b">{L('Kodierende Person B', 'Coder B')}</label>
        <select id="qu-b" bind:value={b}>{#each personen as p (p.id)}<option value={p.id} disabled={p.id === a}>{p.name}</option>{/each}</select></div>
      <div class="eingabe"><label for="qu-schw">{L('Zwei Textstellen gelten als gleich ab einer Deckung von', 'Two passages count as the same from an overlap of')}</label>
        <select id="qu-schw" bind:value={schwelle}>{#each SCHWELLEN as s (s)}<option value={s}>{s} %</option>{/each}</select></div>
      <p class="hilfe">{SCHWELLE_SATZ(schwelle / 100, sprache())}</p>
      <fieldset class="gruppe innen">
        <legend id="qu-codes-leg" tabindex="-1">{L(`Codes (${gewaehlt.length} von ${codes.length} gewählt)`, `Codes (${gewaehlt.length} of ${codes.length} chosen)`)}</legend>
        <div class="knopfzeile">
          <button class="k klein" type="button" onclick={() => { gewaehlt = codes.map(c => c.id); }}>{L('Alle Codes wählen', 'Choose all codes')}</button>
          <button class="k klein" type="button" onclick={() => { gewaehlt = []; }}>{L('Keinen Code wählen', 'Choose no code')}</button>
        </div>
        {#each codes as c (c.id)}
          <label class="schalter" style="padding-inline-start: {c.ebene * 1.25}rem"><input type="checkbox" value={c.id} bind:group={gewaehlt}>{c.name}</label>
        {/each}
      </fieldset>
    </fieldset>
    <div class="knopfzeile"><button class="k haupt" id="qu-berechnen" type="button" onclick={() => void berechnen()}>{L('Berechnen', 'Calculate')}</button></div>

    {#if erg}
      <h3 id="qu-erg-t" tabindex="-1">{L(`Ergebnis: ${erg.namen.a} und ${erg.namen.b}`, `Result: ${erg.namen.a} and ${erg.namen.b}`)}</h3>

      <h4 id="qu-dok-t">{L('Auf Dokumentebene: Hat die Person den Code im Dokument vergeben?', 'At document level: did the person assign the code in the document?')}</h4>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="rahmen" role="region" tabindex="0" aria-label={L('Übereinstimmung auf Dokumentebene, seitlich scrollbar', 'Agreement at document level, scrollable sideways')}>
        <table class="tab">
          <caption class="nur-vorleser">{L('Übereinstimmung auf Dokumentebene', 'Agreement at document level')}</caption>
          <thead><tr><th scope="col">{L('Maß', 'Measure')}</th><th scope="col">{L('Wert', 'Value')}</th></tr></thead>
          <tbody>{#each zeilenDok as z (z.name)}<tr><th scope="row">{z.name}</th><td>{z.wert}</td></tr>{/each}</tbody>
        </table>
      </div>
      <p class="hilfe">{L('AC1 bleibt auch dann sinnvoll, wenn fast alle in dieselbe Kategorie fallen (Kappa-Paradox).', 'AC1 stays meaningful even when almost everything falls into the same category (kappa paradox).')}
        {#if erg.dok.ergebnis.paradox} {L('Hier ist das der Fall: Kappa kann deshalb niedrig sein, obwohl die Prozent hoch sind.', 'That is the case here: kappa can therefore be low although the percentage is high.')}{/if}</p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="rahmen" role="region" tabindex="0" aria-label={L('Vierfeldertafel je Code, seitlich scrollbar', 'Four-field table per code, scrollable sideways')}>
        <table class="tab">
          <caption class="nur-vorleser">{L('Je Code: in wie vielen Dokumenten haben beide, nur A, nur B oder keiner den Code vergeben', 'Per code: in how many documents did both, only A, only B or neither assign the code')}</caption>
          <thead><tr><th scope="col">{L('Code', 'Code')}</th><th scope="col">{L('Beide', 'Both')}</th><th scope="col">{L(`Nur ${erg.namen.a}`, `Only ${erg.namen.a}`)}</th><th scope="col">{L(`Nur ${erg.namen.b}`, `Only ${erg.namen.b}`)}</th><th scope="col">{L('Keiner', 'Neither')}</th></tr></thead>
          <tbody>{#each erg.dok.jeCode as c (c.code)}<tr><th scope="row">{codeName(c.code)}</th><td>{c.beide}</td><td>{c.nurA}</td><td>{c.nurB}</td><td>{c.keiner}</td></tr>{/each}</tbody>
        </table>
      </div>

      <h4 id="qu-seg-t">{L('Auf Segmentebene: Haben beide dieselbe Textstelle mit demselben Code versehen?', 'At passage level: did both mark the same passage with the same code?')}</h4>
      <p class="hilfe">{SCHWELLE_SATZ(erg.schwelle, sprache())}</p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="rahmen" role="region" tabindex="0" aria-label={L('Übereinstimmung auf Segmentebene, seitlich scrollbar', 'Agreement at passage level, scrollable sideways')}>
        <table class="tab">
          <caption class="nur-vorleser">{L('Übereinstimmung auf Segmentebene je Code und gesamt', 'Agreement at passage level per code and in total')}</caption>
          <thead><tr><th scope="col">{L('Code', 'Code')}</th><th scope="col">{L('Einheiten', 'Units')}</th><th scope="col">{L('Übereinstimmend', 'Matching')}</th><th scope="col">{L(`Nur ${erg.namen.a}`, `Only ${erg.namen.a}`)}</th><th scope="col">{L(`Nur ${erg.namen.b}`, `Only ${erg.namen.b}`)}</th><th scope="col">{L('Prozent', 'Percent')}</th></tr></thead>
          <tbody>
            {#each erg.seg.jeCode as c (c.code)}<tr><th scope="row">{codeName(c.code)}</th><td>{c.einheiten}</td><td>{c.uebereinstimmend}</td><td>{c.nurA}</td><td>{c.nurB}</td><td>{pz(c.prozent)}</td></tr>{/each}
            <tr><th scope="row">{L('Gesamt', 'Total')}</th><td>{erg.seg.einheiten}</td><td>{erg.seg.uebereinstimmend}</td><td>{erg.seg.nurA}</td><td>{erg.seg.nurB}</td><td>{pz(erg.seg.prozent)}</td></tr>
          </tbody>
        </table>
      </div>
      <p>{L(`Zufallsbereinigt nach Brennan und Prediger (k = ${erg.seg.k} Codes): ${k2(erg.seg.kappaBP)}.`, `Chance-corrected after Brennan and Prediger (k = ${erg.seg.k} codes): ${k2(erg.seg.kappaBP)}.`)}</p>
      <p class="hilfe">{L('Auf Segmentebene gibt es kein Feld „beide haben nichts kodiert“. Darum nimmt Statable hier den Wert nach Brennan und Prediger, der die Zufallsübereinstimmung aus der Zahl der Codes schätzt.', 'At passage level there is no cell "both coded nothing". So Statable takes the value after Brennan and Prediger here, which estimates chance agreement from the number of codes.')}</p>

      <h4 id="qu-abw-t">{L(`Abweichungen (${erg.anz.length})`, `Deviations (${erg.anz.length})`)}</h4>
      {#if !erg.anz.length}
        <p>{L('Keine Abweichungen: Bei dieser Schwelle haben beide gleich kodiert.', 'No deviations: at this threshold both coded the same.')}</p>
      {:else}
        {#each ART_REIHENFOLGE as art (art)}
          {@const liste = erg.anz.filter(x => x.art === art)}
          {#if liste.length}
            <h5 id="qu-abw-{art}">{artText(art, sprache())} ({liste.length})</h5>
            <ul class="abw" aria-labelledby="qu-abw-{art}">
              {#each liste as x (x.id)}
                <li>
                  <strong>{L(`Abweichung ${x.nr}`, `Deviation ${x.nr}`)}</strong>{L(`, Dokument „${x.dokument}“`, `, document "${x.dokument}"`)}
                  <ul>
                    {#each x.stellen as s, i (i)}<li>{L(`${s.name}, Code „${s.codeName}“: „${s.text}“`, `${s.name}, code "${s.codeName}": "${s.text}"`)}</li>{/each}
                  </ul>
                </li>
              {/each}
            </ul>
          {/if}
        {/each}
        <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => void konsensBeginnen()}>{fortsetzen ? L('Einigung fortsetzen (Konsens)', 'Continue the agreement (consensus)') : L('Einigung beginnen (Konsens)', 'Start the agreement (consensus)')}</button></div>
      {/if}
    {/if}

    <KonsensEinigung />
  {/if}
</div>

<style>
  .ue { display: flex; flex-direction: column; gap: var(--a3); }
  .ue h3 { margin: var(--a3) 0 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .ue h4 { margin: var(--a2) 0 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .ue h5 { margin: var(--a2) 0 0; font: 600 var(--gr-klein)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .gruppe { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .gruppe legend { font-weight: 600; padding: 0 var(--a1); }
  .gruppe.innen { border-style: dashed; }
  .rahmen { overflow-x: auto; }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: middle; }
  .tab thead th { font-weight: 650; }
  .tab tbody th { font-weight: 600; }
  .abw { margin: 0; padding-inline-start: var(--a4); display: flex; flex-direction: column; gap: var(--a2); font-size: var(--gr-klein); }
  .abw ul { padding-inline-start: var(--a4); margin: var(--a1) 0 0; }
</style>
