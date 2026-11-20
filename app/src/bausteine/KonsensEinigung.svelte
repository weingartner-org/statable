<script lang="ts">
  /**
   * Konsens beim Kodieren (Stufe 5, Paket 5E1): je Abweichung eine Feldgruppe (Legende „Abweichung 3 von 17: …“), Textstellen, Entscheidung, Begründung (Pflicht),
   * optional eine Kodierregel; „Konsens anlegen“ legt eine neue Kodierende an (A und B bleiben unverändert), danach Tabelle vorher und nachher und das Protokoll als Word.
   * Rechenkern: `lib/konsens.ts`. Offene Entscheidungen liegen im Projekt (`qualitativ/konsens.json`), man kann aufhören und später weitermachen.
   * Keine eigenen Live-Regionen: nur `sage()`. Text der Textstellen nur als Text.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { dez } from '../i18n/profil';
  import { Laedt } from '../lib/laedt.svelte';
  import { dateiname } from '../lib/dateiname';
  import { ersetzeQualProjekt, konsensEntwurf, qualProjekt, setzeKonsensEntwurf } from '../lib/interviews.svelte';
  import { segmentUebereinstimmung, type SegmentErgebnis } from '../lib/segmentuebereinstimmung';
  import { abweichungenAnzeige, konsensMitVergleich, konsensName, konsensProtokollDaten, regelCodes, wahlMoeglichkeiten, type AbweichungAnzeige, type KonsensProtokollDaten } from '../lib/qualauswertung-ausgabe';
  import { istEntschieden, zahlEntschieden, type KonsensEntwurf } from '../lib/konsens-zustand';
  import type { Wahl } from '../lib/konsens';
  import type { QualProjekt } from '../lib/qualprojekt';
  import Rechnet from './Rechnet.svelte';

  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
  const lade = new Laedt();
  const q = $derived(qualProjekt());
  const entwurf = $derived(konsensEntwurf());
  const namen = $derived({ a: q?.kodierende.find(k => k.id === entwurf?.a)?.name ?? '?', b: q?.kodierende.find(k => k.id === entwurf?.b)?.name ?? '?' });
  const anz = $derived.by<AbweichungAnzeige[]>(() => {
    if (!q || !entwurf) return [];
    const e = segmentUebereinstimmung(q, { a: entwurf.a, b: entwurf.b, codes: entwurf.codes, schwelle: entwurf.schwelle });
    return abweichungenAnzeige(q, e.abweichungen, namen, sprache());
  });
  const position = $derived(Math.min(entwurf?.position ?? 0, Math.max(0, anz.length - 1)));
  const aktuell = $derived<AbweichungAnzeige | undefined>(anz[position]);
  const entschieden = $derived(entwurf ? anz.filter(x => istEntschieden(entwurf.entscheidungen.find(e => e.abweichung === x.id))).length : 0);
  const optionen = $derived(aktuell ? wahlMoeglichkeiten(aktuell.art, aktuell.stellen, namen, sprache()) : []);

  /** Die Eingaben der gerade angezeigten Abweichung */
  let form = $state<{ id: string; wahl: Wahl | ''; begr: string; regelAn: boolean; regelCode: string; regelText: string }>({ id: '', wahl: '', begr: '', regelAn: false, regelCode: '', regelText: '' });
  let fehlerBegr = $state(false);
  let fehlerAnlegen = $state('');
  let kname = $state('');
  let fertig = $state<{ name: string; anzahl: number; vorher: SegmentErgebnis; nachherA: SegmentErgebnis; nachherB: SegmentErgebnis; offen: number; daten: KonsensProtokollDaten } | null>(null);

  function ladeForm(a: AbweichungAnzeige) {
    const en = entwurf?.entscheidungen.find(x => x.abweichung === a.id);
    const rc = regelCodes(a);
    form = { id: a.id, wahl: en?.wahl ?? '', begr: en?.begruendung ?? '', regelAn: !!en?.regel, regelCode: en?.regel?.code ?? rc[0]?.id ?? '', regelText: en?.regel?.text ?? '' };
    fehlerBegr = false;
  }
  $effect(() => { const a = aktuell; if (a && form.id !== a.id) ladeForm(a); });

  function aendere(f: (e: KonsensEntwurf) => KonsensEntwurf) { const e = konsensEntwurf(); if (e) setzeKonsensEntwurf(f({ ...e, entscheidungen: [...e.entscheidungen], codes: [...e.codes] })); }
  /** Schreibt die Eingaben der angezeigten Abweichung in den Entwurf (ohne Wahl wird die Entscheidung entfernt). */
  function speichere() {
    if (!form.id) return;
    const id = form.id, f = { ...form };
    aendere(e => {
      const rest = e.entscheidungen.filter(x => x.abweichung !== id);
      if (f.wahl !== '') rest.push({ abweichung: id, wahl: f.wahl, begruendung: f.begr, ...(f.regelAn && f.regelText.trim() && f.regelCode ? { regel: { code: f.regelCode, text: f.regelText.trim() } } : {}) });
      return { ...e, entscheidungen: rest };
    });
  }
  const begruendet = (): boolean => (form.begr.match(/\S+/g) ?? []).length >= 1;
  async function gehe(zu: number) {
    aendere(e => ({ ...e, position: Math.max(0, Math.min(anz.length - 1, zu)) }));
    await tick();
    const l = document.getElementById('qk-leg'); l?.scrollIntoView({ block: 'start' }); l?.focus();
  }
  async function weiter() {
    speichere();
    if (form.wahl !== '' && !begruendet()) { await meldeFehlendeBegruendung(); return; }
    await gehe(position + 1);
  }
  async function zurueck() { speichere(); await gehe(position - 1); }
  async function meldeFehlendeBegruendung() {
    fehlerBegr = true;
    await tick();
    sage(L('Bitte eine Begründung eintragen, mindestens ein Wort.', 'Please enter a reason, at least one word.'), 'dringend');
    document.getElementById('qk-begr')?.focus();
  }

  async function anlegen() {
    const e = konsensEntwurf();
    if (!q || !e) return;
    speichere();
    const aktuellerE = konsensEntwurf()!;
    const unvollstaendig = aktuellerE.entscheidungen.find(x => !istEntschieden(x));
    if (unvollstaendig) {
      const i = anz.findIndex(x => x.id === unvollstaendig.abweichung);
      fehlerAnlegen = L(`Bei Abweichung ${i + 1} fehlt die Begründung. Tragen Sie sie ein oder nehmen Sie die Entscheidung zurück.`, `Deviation ${i + 1} has no reason. Enter one or withdraw the decision.`);
      sage(fehlerAnlegen, 'dringend');
      if (i >= 0) { await gehe(i); fehlerBegr = true; await tick(); }
      return;
    }
    fehlerAnlegen = '';
    await lade.mit(async () => {
      // ohne offenes Projekt liegt das qualitative Projekt als Svelte-Zustand (Proxy) vor; `konsensAnlegen` kopiert mit structuredClone, das keine Proxys kann
      const qs = $state.snapshot(q) as QualProjekt;
      const jetzt = Date.now(), name = konsensName(qs, e.a, e.b, kname);
      const r = konsensMitVergleich(qs, aktuellerE, name, jetzt);
      const daten = konsensProtokollDaten(qs, aktuellerE, r, sprache(), jetzt);
      ersetzeQualProjekt(r.projekt);
      setzeKonsensEntwurf(undefined);
      fertig = { name, anzahl: r.projekt.kodierungen.filter(k => k.kodierende === r.konsens).length, vorher: r.vorher, nachherA: r.nachherA, nachherB: r.nachherB, offen: r.offen.length, daten };
      form = { id: '', wahl: '', begr: '', regelAn: false, regelCode: '', regelText: '' };
      kname = '';
    });
    await tick();
    const h = document.getElementById('qk-erg-t'); h?.scrollIntoView({ block: 'start' }); h?.focus();
    if (fertig) sageSpaeter(L(`Konsens angelegt: Person „${fertig.name}“ mit ${Lp(fertig.anzahl, '1 Kodierung', `${fertig.anzahl} Kodierungen`, '1 coding', `${fertig.anzahl} codings`)}.`, `Consensus created: person "${fertig.name}" with ${Lp(fertig.anzahl, '1 Kodierung', `${fertig.anzahl} Kodierungen`, '1 coding', `${fertig.anzahl} codings`)}.`), 600);
  }

  async function alsWord() {
    const f = fertig;
    if (!f) return;
    await lade.mit(async () => {
      const [{ konsensProtokollWord, konsensDateiname }, { herunterladen }] = await Promise.all([import('../lib/konsensexport'), import('../lib/export')]);
      const bytes = await konsensProtokollWord(f.daten);
      herunterladen(bytes, konsensDateiname(f.daten) || `${dateiname('Konsens')}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      sage(L('Protokoll als Word-Datei gespeichert.', 'Protocol saved as a Word file.'));
    });
  }
  const pz = (p: number | null): string => (p === null ? '-' : `${dez((p * 100).toFixed(1))} %`);
  const k2 = (x: number | null): string => (x === null ? '-' : dez(x.toFixed(2)));
  const proz = $derived(entwurf ? Math.round(entwurf.schwelle * 100) : 90);
</script>

{#if entwurf}
  <div class="konsens">
    <h3 id="qk-t" tabindex="-1">{L('Einigung beim Kodieren (Konsens)', 'Agreement in coding (consensus)')}</h3>
    <p class="hilfe">{L(`Sie einigen sich über die Abweichungen zwischen ${namen.a} und ${namen.b} (Schwelle ${proz} %). Statable legt daraus eine neue Person an. ${namen.a} und ${namen.b} bleiben unverändert.`, `You agree on the deviations between ${namen.a} and ${namen.b} (threshold ${proz} %). Statable creates a new person from it. ${namen.a} and ${namen.b} stay unchanged.`)}</p>
    <p id="qk-fortschritt"><strong>{L(`${entschieden} von ${anz.length} entschieden`, `${entschieden} of ${anz.length} decided`)}</strong>{#if entwurf.entscheidungen.length > entschieden} {L(`(${entwurf.entscheidungen.length - entschieden} davon mit Wahl, aber ohne Begründung)`, `(${entwurf.entscheidungen.length - entschieden} of them with a choice but no reason)`)}{/if}</p>

    {#if aktuell}
      <fieldset class="abw">
        <legend id="qk-leg" tabindex="-1">{aktuell.legende}</legend>
        <p>{L(`Dokument: „${aktuell.dokument}“`, `Document: "${aktuell.dokument}"`)}</p>
        <ul class="stellen" aria-label={L('Textstellen dieser Abweichung', 'Passages of this deviation')}>
          {#each aktuell.stellen as s, i (i)}<li><strong>{s.name}</strong>{L(`, Code „${s.codeName}“: „${s.text}“`, `, code "${s.codeName}": "${s.text}"`)}</li>{/each}
        </ul>

        <fieldset class="innen">
          <legend>{L('Was soll im Konsens gelten?', 'What should apply in the consensus?')}</legend>
          {#each optionen as o (o.wert)}
            <label class="schalter"><input type="radio" name="qk-wahl" value={o.wert} checked={form.wahl === o.wert} onchange={() => { form.wahl = o.wert; speichere(); }}>{o.text}</label>
          {/each}
          {#if form.wahl !== ''}<button class="k klein leise" type="button" onclick={() => { form.wahl = ''; fehlerBegr = false; speichere(); }}>{L('Entscheidung zurücknehmen', 'Withdraw the decision')}</button>{/if}
        </fieldset>

        <div class="eingabe"><label for="qk-begr">{L('Begründung (Pflicht, mindestens ein Wort)', 'Reason (required, at least one word)')}</label>
          <textarea id="qk-begr" rows="3" bind:value={form.begr} aria-required="true" aria-invalid={fehlerBegr ? 'true' : undefined} aria-describedby={fehlerBegr ? 'qk-begr-fehl' : undefined}
            onblur={() => speichere()} oninput={() => { if (fehlerBegr && begruendet()) fehlerBegr = false; }}></textarea>
          {#if fehlerBegr}<p class="fehl" id="qk-begr-fehl">{L('Bitte eine Begründung eintragen, mindestens ein Wort.', 'Please enter a reason, at least one word.')}</p>{/if}</div>

        <label class="schalter"><input type="checkbox" bind:checked={form.regelAn} onchange={() => speichere()}>{L(`Als Kodierregel zu „${regelCodes(aktuell).find(c => c.id === form.regelCode)?.name ?? regelCodes(aktuell)[0]?.name ?? ''}“ übernehmen`, `Take over as a coding rule for "${regelCodes(aktuell).find(c => c.id === form.regelCode)?.name ?? regelCodes(aktuell)[0]?.name ?? ''}"`)}</label>
        {#if form.regelAn}
          {#if regelCodes(aktuell).length > 1}
            <div class="eingabe"><label for="qk-regel-code">{L('Zu welchem Code gehört die Regel?', 'Which code does the rule belong to?')}</label>
              <select id="qk-regel-code" bind:value={form.regelCode} onchange={() => speichere()}>{#each regelCodes(aktuell) as c (c.id)}<option value={c.id}>{c.name}</option>{/each}</select></div>
          {/if}
          <div class="eingabe"><label for="qk-regel-text">{L('Text der Kodierregel', 'Text of the coding rule')}</label>
            <textarea id="qk-regel-text" rows="2" bind:value={form.regelText} onblur={() => speichere()}></textarea></div>
          <p class="hilfe">{L('Die Regel wird mit dem Datum an die Regeln des Codes im Kodierleitfaden angehängt.', 'The rule is appended with the date to the rules of the code in the coding guide.')}</p>
        {/if}

        <div class="knopfzeile">
          {#if position > 0}<button class="k" type="button" onclick={() => void zurueck()}>{L('Zurück', 'Back')}</button>{/if}
          {#if position < anz.length - 1}<button class="k haupt" type="button" onclick={() => void weiter()}>{L('Weiter', 'Next')}</button>{:else}<span class="hilfe">{L('Das ist die letzte Abweichung.', 'This is the last deviation.')}</span>{/if}
        </div>
      </fieldset>
    {:else}
      <p>{L('Keine Abweichungen: Bei dieser Schwelle haben beide gleich kodiert. Sie können den Konsens trotzdem anlegen.', 'No deviations: at this threshold both coded the same. You can still create the consensus.')}</p>
    {/if}

    <div class="anlegen">
      <div class="eingabe"><label for="qk-name">{L('Name der Konsens-Person', 'Name of the consensus person')}</label>
        <input id="qk-name" type="text" bind:value={kname} maxlength="80" autocomplete="off" placeholder={q ? konsensName(q, entwurf.a, entwurf.b) : ''}></div>
      {#if anz.length - entschieden > 0}<p class="hilfe">{Lp(anz.length - entschieden, '1 Abweichung ist noch offen. Sie wird nicht in den Konsens übernommen.', `${anz.length - entschieden} Abweichungen sind noch offen. Sie werden nicht in den Konsens übernommen.`, '1 deviation is still open. It is not taken into the consensus.', `${anz.length - entschieden} deviations are still open. They are not taken into the consensus.`)}</p>{/if}
      {#if fehlerAnlegen}<p class="fehl" id="qk-anlegen-fehl">{fehlerAnlegen}</p>{/if}
      <div class="knopfzeile"><button class="k haupt" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} aria-describedby={fehlerAnlegen ? 'qk-anlegen-fehl' : undefined} onclick={() => { if (!lade.aktiv) void anlegen(); }}>{L('Konsens anlegen', 'Create consensus')}</button></div>
      {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Konsens wird angelegt …', 'Creating the consensus …')} /></p>{/if}
    </div>
  </div>
{/if}

{#if fertig}
  <div class="konsens" id="qk-erg">
    <h3 id="qk-erg-t" tabindex="-1">{L(`Ergebnis der Einigung: ${fertig.name}`, `Result of the agreement: ${fertig.name}`)}</h3>
    <p>{L(`Die neue Person „${fertig.name}“ hat ${Lp(fertig.anzahl, '1 Kodierung', `${fertig.anzahl} Kodierungen`, '1 coding', `${fertig.anzahl} codings`)}. Sie steht jetzt unter den Kodierenden.`, `The new person "${fertig.name}" has ${Lp(fertig.anzahl, '1 Kodierung', `${fertig.anzahl} Kodierungen`, '1 coding', `${fertig.anzahl} codings`)}. It now appears among the coders.`)}
      {#if fertig.offen} {Lp(fertig.offen, '1 Abweichung blieb offen und ist nicht im Konsens.', `${fertig.offen} Abweichungen blieben offen und sind nicht im Konsens.`, '1 deviation stayed open and is not in the consensus.', `${fertig.offen} deviations stayed open and are not in the consensus.`)}{/if}</p>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
    <div class="rahmen" role="region" tabindex="0" aria-label={L('Übereinstimmung vorher und nachher, seitlich scrollbar', 'Agreement before and after, scrollable sideways')}>
      <table class="tab">
        <caption class="nur-vorleser">{L('Übereinstimmung auf Segmentebene vorher und nachher', 'Agreement at passage level before and after')}</caption>
        <thead><tr><th scope="col">{L('Vergleich', 'Comparison')}</th><th scope="col">{L('Einheiten', 'Units')}</th><th scope="col">{L('Übereinstimmend', 'Matching')}</th><th scope="col">{L('Prozent', 'Percent')}</th><th scope="col">{L('Brennan-Prediger', 'Brennan-Prediger')}</th></tr></thead>
        <tbody>
          <tr><th scope="row">{L(`Vorher: ${fertig.daten.personA} gegen ${fertig.daten.personB}`, `Before: ${fertig.daten.personA} against ${fertig.daten.personB}`)}</th><td>{fertig.vorher.einheiten}</td><td>{fertig.vorher.uebereinstimmend}</td><td>{pz(fertig.vorher.prozent)}</td><td>{k2(fertig.vorher.kappaBP)}</td></tr>
          <tr><th scope="row">{L(`Nachher: ${fertig.daten.personA} gegen Konsens`, `After: ${fertig.daten.personA} against consensus`)}</th><td>{fertig.nachherA.einheiten}</td><td>{fertig.nachherA.uebereinstimmend}</td><td>{pz(fertig.nachherA.prozent)}</td><td>{k2(fertig.nachherA.kappaBP)}</td></tr>
          <tr><th scope="row">{L(`Nachher: ${fertig.daten.personB} gegen Konsens`, `After: ${fertig.daten.personB} against consensus`)}</th><td>{fertig.nachherB.einheiten}</td><td>{fertig.nachherB.uebereinstimmend}</td><td>{pz(fertig.nachherB.prozent)}</td><td>{k2(fertig.nachherB.kappaBP)}</td></tr>
        </tbody>
      </table>
    </div>
    <p class="hilfe">{L('Nach der Einigung ist die Übereinstimmung mit dem Konsens kein Gütemaß mehr, sondern zeigt, wie viel sich geändert hat.', 'After the agreement, the match with the consensus is no longer a quality measure, but shows how much has changed.')}</p>
    <div class="knopfzeile">
      <button class="k haupt" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void alsWord(); }}>{L('Protokoll als Word', 'Protocol as Word')}</button>
      <button class="k leise" type="button" onclick={() => { fertig = null; }}>{L('Ergebnis schließen', 'Close result')}</button>
    </div>
    {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Wird erzeugt …', 'Creating …')} /></p>{/if}
  </div>
{/if}

<style>
  .konsens { display: flex; flex-direction: column; gap: var(--a3); }
  .konsens h3 { margin: var(--a3) 0 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .abw { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); margin: 0; display: flex; flex-direction: column; gap: var(--a3); }
  .abw legend { font-weight: 650; padding: 0 var(--a1); }
  .abw legend:focus-visible { outline: 2px solid var(--akzent); outline-offset: 2px; }
  .innen { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .innen legend { font-weight: 600; padding: 0 var(--a1); }
  .stellen { margin: 0; padding-inline-start: var(--a4); font-size: var(--gr-klein); display: flex; flex-direction: column; gap: var(--a1); }
  .anlegen { display: flex; flex-direction: column; gap: var(--a2); }
  .rahmen { overflow-x: auto; }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: middle; }
  .tab thead th { font-weight: 650; }
  .tab tbody th { font-weight: 600; }
</style>
