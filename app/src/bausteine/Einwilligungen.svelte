<script module lang="ts">
  /** Einmal je Sitzung angesagt; weggeklickte Hinweise bleiben für die Sitzung weg (nicht im Projekt gespeichert). */
  let hinweiseAngesagt = false;
  const wegMerk: string[] = [];
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import { L, Lp, aktuelleSprache, melde } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendereQualProjekt, qualProjekt } from '../lib/interviews.svelte';
  import { EINWILLIGUNGS_PUNKTE, EINWILLIGUNGS_STAENDE, type Einwilligung, type EinwilligungsPunkt, type EinwilligungsStand } from '../lib/qualprojekt';
  import {
    PUNKT_WORT, WIDERRUF_SATZ, aktuelleEinwilligung, bearbeiteEinwilligung, bestaetigeGeloescht, datumAnzeige, erledigeWiedervorlage, heuteIso, neueEinwilligung,
    oeffnenHinweise, setzePunkt, standVon, standWort, widerrufe, type OeffnenHinweis
  } from '../lib/einwilligung';
  import { KEINE_RECHTSBERATUNG } from '../lib/datenschutzvorlage';
  import { einwilligungsvorlageHtml, einwilligungsvorlageOffen, einwilligungsvorlageTitel, einwilligungsvorlageWord } from '../lib/einwilligung-vorlage';
  import { dateiname } from '../lib/dateiname';

  /**
   * „Einwilligung (gestuft und als Prozess)“ (Feinstruktur F2B). Vorlage zum Ausgeben, Einwilligungsliste je Fall (Stand je Punkt als Wort, Widerruf, Wiedervorlage,
   * Löschdatum, Zugriffskreis, Verlauf) und Hinweise beim Öffnen. Statable warnt und erinnert, es sperrt und löscht nie und urteilt nie rechtlich.
   * Bestätigungen laufen über die gemeinsame Ansage (`melde`), es gibt keine eigene Live-Region.
   */
  const sp = $derived<'de' | 'en'>(aktuelleSprache() === 'de' ? 'de' : 'en');
  const q = $derived(qualProjekt());
  const wer = $derived(q?.ich);
  const heute = heuteIso();
  const FORMEN: { id: Einwilligung['form']; text: string }[] = [
    { id: 'schriftlich', text: L('schriftlich', 'in writing') }, { id: 'muendlich-aufnahme', text: L('mündlich, auf Aufnahme', 'spoken, on the recording') },
    { id: 'digital', text: L('digital', 'digital') }, { id: 'andere', text: L('andere', 'other') }
  ];
  const standText = (st: EinwilligungsStand | 'fehlt') => standWort(st, sp);
  const punktText = (p: EinwilligungsPunkt) => PUNKT_WORT[sp][p];

  /* ---------- Vorlage ---------- */
  let kontakt = $state(''), verantwortlich = $state('');
  const vorlageOpt = $derived({ kontakt, verantwortlich });
  const offeneStellen = $derived(einwilligungsvorlageOffen(sp, vorlageOpt));
  async function vorlageWord() {
    try {
      const { herunterladen } = await import('../lib/export');
      const name = `${dateiname(einwilligungsvorlageTitel(sp))}.docx`;
      herunterladen(await einwilligungsvorlageWord(sp, vorlageOpt), name, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      melde(L(`Vorlage als Word-Datei „${name}“ gespeichert (Download).`, `Template saved as Word file "${name}" (download).`), false, true);
    } catch { melde(L('Die Word-Datei ließ sich nicht erstellen.', 'The Word file could not be created.'), false, true); }
  }
  async function vorlageHtml() {
    try {
      const { herunterladen } = await import('../lib/export');
      const name = `${dateiname(einwilligungsvorlageTitel(sp))}.html`;
      herunterladen(new TextEncoder().encode(einwilligungsvorlageHtml(sp, vorlageOpt)), name, 'text/html;charset=utf-8');
      melde(L(`Vorlage als HTML-Datei „${name}“ gespeichert (Download).`, `Template saved as HTML file "${name}" (download).`), false, true);
    } catch { melde(L('Die HTML-Datei ließ sich nicht erstellen.', 'The HTML file could not be created.'), false, true); }
  }

  /* ---------- Hinweise beim Öffnen ---------- */
  let weg = $state<string[]>([...wegMerk]);
  const schluessel = (h: OeffnenHinweis) => `${h.art}|${h.einwilligung}|${h.datum ?? ''}`;
  const hinweise = $derived(q ? oeffnenHinweise(q, heute, sp).filter(h => !weg.includes(schluessel(h))) : []);
  $effect(() => {
    if (hinweiseAngesagt || !hinweise.length) return;
    hinweiseAngesagt = true;
    sage(Lp(hinweise.length, 'Zur Einwilligung gibt es 1 Hinweis. Er steht oben im Abschnitt Einwilligung.', `Zur Einwilligung gibt es ${hinweise.length} Hinweise. Sie stehen oben im Abschnitt Einwilligung.`, 'There is 1 note on consent. It is at the top of the consent section.', `There are ${hinweise.length} notes on consent. They are at the top of the consent section.`), 'hoeflich');
  });
  async function nachHinweis() {
    await tick();
    (document.getElementById('ew-hinw-t') ?? document.getElementById('iv-einw-t'))?.focus();
  }
  function blendeAus(h: OeffnenHinweis) { const k = schluessel(h); wegMerk.push(k); weg = [...weg, k]; melde(L('Hinweis für diese Sitzung ausgeblendet. Er kommt beim nächsten Öffnen des Projekts wieder.', 'Note hidden for this session. It comes back the next time the project is opened.')); void nachHinweis(); }
  function loescheBestaetigt(h: OeffnenHinweis) {
    const e = q?.einwilligungen?.find(x => x.id === h.einwilligung);
    const was = h.art === 'aufnahme-widerrufen' ? 'aufnahme' : (e?.loeschen?.find(l => !l.erledigt && l.bis === h.datum)?.was ?? 'aufnahme');
    aendereQualProjekt(p => bestaetigeGeloescht(p, h.einwilligung, was, heute, wer));
    melde(L('Eingetragen: Löschen bestätigt. Der Eintrag steht im Verlauf.', 'Entered: deletion confirmed. The entry is in the history.'));
    void nachHinweis();
  }
  function wiedervorlageErledigt(h: OeffnenHinweis) {
    const e = q?.einwilligungen?.find(x => x.id === h.einwilligung);
    const i = e?.wiedervorlage?.findIndex(w => !w.erledigt && w.datum === h.datum) ?? -1;
    if (i < 0) return;
    aendereQualProjekt(p => erledigeWiedervorlage(p, h.einwilligung, i, heute, wer));
    melde(L('Eingetragen: Wiedervorlage erledigt.', 'Entered: follow-up done.'));
    void nachHinweis();
  }

  /* ---------- Einwilligungsliste ---------- */
  type NeuForm = { fassung: string; form: Einwilligung['form'] };
  let neu = $state<Record<string, NeuForm>>({});
  /** Aufgeklappte Fälle: von Hand gemerkt, damit eine Änderung den Fall nicht zuklappt (Tastatur-Probe F2, H1/H2) */
  let offen = $state<Record<string, boolean>>({});
  const neuVon = (fall: string): NeuForm => neu[fall] ?? { fassung: '', form: 'schriftlich' };
  async function lege(fall: string) {
    const n = neuVon(fall);
    const e = neueEinwilligung(fall, n.fassung.trim(), n.form);
    aendereQualProjekt(p => ({ ...p, einwilligungen: [...(p.einwilligungen ?? []), e], protokoll: [...p.protokoll, { zeit: Date.now(), ...(wer ? { kodierende: wer } : {}), was: `Einwilligung ${p.faelle.find(f => f.id === fall)?.name ?? fall}: angelegt` }] }));
    neu = { ...neu, [fall]: { fassung: '', form: 'schriftlich' } };
    offen = { ...offen, [fall]: true };
    melde(L('Einwilligung angelegt. Alle Punkte stehen auf „offen“.', 'Consent entry created. All points are set to "open".'));
    await tick();
    document.getElementById(`ew-fass-${e.id}`)?.focus();
  }
  const fallName = (id: string) => q?.faelle.find(f => f.id === id)?.name ?? id;
  const kurz = (e: Einwilligung | undefined) => (e ? EINWILLIGUNGS_PUNKTE.map(p => `${punktText(p)} ${standText(standVon(e, p))}`).join(', ') : L('keine Einwilligung eingetragen', 'no consent entered'));

  function stand(e: Einwilligung, punkt: EinwilligungsPunkt, st: EinwilligungsStand, datum?: string) {
    const d = datum || e.punkte.find(p => p.punkt === punkt)?.datum || heute;
    aendereQualProjekt(p => setzePunkt(p, e.id, punkt, st, d, wer));
    melde(L(`Fall ${fallName(e.fall)}, ${punktText(punkt)}: ${standText(st)} (${datumAnzeige(d, sp)}).`, `Case ${fallName(e.fall)}, ${punktText(punkt)}: ${standText(st)} (${datumAnzeige(d, sp)}).`) + (st === 'widerrufen' ? ` ${WIDERRUF_SATZ[sp]}` : ''));
  }
  function datumAendern(e: Einwilligung, punkt: EinwilligungsPunkt, datum: string) {
    if (!datum) return;
    const s = standVon(e, punkt);
    stand(e, punkt, s === 'fehlt' ? 'offen' : s, datum);
  }
  function feld(e: Einwilligung, felder: Parameters<typeof bearbeiteEinwilligung>[2], was: string, ansage: string) {
    aendereQualProjekt(p => bearbeiteEinwilligung(p, e.id, felder, was, wer));
    melde(ansage);
  }

  type WfForm = { datum: string; punkte: EinwilligungsPunkt[]; notiz: string };
  let wf = $state<Record<string, WfForm>>({});
  const wfVon = (id: string): WfForm => wf[id] ?? { datum: heute, punkte: [], notiz: '' };
  let widerrufSatzFuer = $state('');
  function widerrufen(e: Einwilligung) {
    const f = wfVon(e.id);
    if (!f.punkte.length || !f.datum) { melde(L('Bitte mindestens einen Punkt ankreuzen und ein Datum eintragen.', 'Please tick at least one point and enter a date.'), false, true); return; }
    aendereQualProjekt(p => widerrufe(p, e.id, f.punkte, f.datum, f.notiz, wer));
    wf = { ...wf, [e.id]: { datum: heute, punkte: [], notiz: '' } };
    widerrufSatzFuer = e.id;
    melde(L(`Widerruf für Fall ${fallName(e.fall)} eingetragen: ${f.punkte.map(punktText).join(', ')}. `, `Withdrawal for case ${fallName(e.fall)} entered: ${f.punkte.map(punktText).join(', ')}. `) + WIDERRUF_SATZ[sp], false, true);
  }
  function schalteWiderrufPunkt(id: string, p: EinwilligungsPunkt, an: boolean) {
    const f = wfVon(id);
    wf = { ...wf, [id]: { ...f, punkte: an ? [...new Set([...f.punkte, p])] : f.punkte.filter(x => x !== p) } };
  }

  type WvForm = { datum: string; anlass: string };
  let wv = $state<Record<string, WvForm>>({});
  const wvVon = (id: string): WvForm => wv[id] ?? { datum: '', anlass: '' };
  function wvNeu(e: Einwilligung) {
    const f = wvVon(e.id);
    if (!f.datum || !f.anlass.trim()) { melde(L('Bitte Datum und Anlass eintragen.', 'Please enter a date and a reason.'), false, true); return; }
    feld(e, { wiedervorlage: [...(e.wiedervorlage ?? []), { datum: f.datum, anlass: f.anlass.trim() }] }, `Wiedervorlage ${datumAnzeige(f.datum, 'de')} eingetragen (${f.anlass.trim()})`, L(`Wiedervorlage am ${datumAnzeige(f.datum, 'de')} eingetragen.`, `Follow-up on ${f.datum} entered.`));
    wv = { ...wv, [e.id]: { datum: '', anlass: '' } };
  }
  type LoForm = { was: 'aufnahme' | 'kontaktdaten' | 'andere'; bis: string };
  let lo = $state<Record<string, LoForm>>({});
  const loVon = (id: string): LoForm => lo[id] ?? { was: 'aufnahme', bis: '' };
  const LOESCH_ART: { id: LoForm['was']; text: string }[] = [{ id: 'aufnahme', text: L('Aufnahme', 'Recording') }, { id: 'kontaktdaten', text: L('Kontaktdaten', 'Contact data') }, { id: 'andere', text: L('andere Daten', 'Other data') }];
  const loeschText = (w: LoForm['was']) => LOESCH_ART.find(a => a.id === w)?.text ?? w;
  function loNeu(e: Einwilligung) {
    const f = loVon(e.id);
    if (!f.bis) { melde(L('Bitte ein Datum für das Löschen eintragen.', 'Please enter a date for the deletion.'), false, true); return; }
    feld(e, { loeschen: [...(e.loeschen ?? []), { was: f.was, bis: f.bis }] }, `Löschdatum ${datumAnzeige(f.bis, 'de')} eingetragen (${f.was})`, L(`Löschdatum ${datumAnzeige(f.bis, 'de')} für ${loeschText(f.was)} eingetragen. Statable löscht nichts selbst.`, `Deletion date ${f.bis} entered for ${loeschText(f.was)}. Statable deletes nothing itself.`));
    lo = { ...lo, [e.id]: { was: 'aufnahme', bis: '' } };
  }

  const verlauf = (fall: string) => (q?.protokoll ?? []).filter(a => a.was.startsWith(`Einwilligung ${fallName(fall)}:`)).slice().reverse();
  const zeitText = (ms: number) => { const d = new Date(ms); const z = (n: number) => String(n).padStart(2, '0'); return `${datumAnzeige(heuteIso(d), sp)} ${z(d.getHours())}:${z(d.getMinutes())}`; };
  const aeltere = (e: Einwilligung) => (q?.einwilligungen ?? []).filter(x => x.fall === e.fall && x.id !== e.id).length;
</script>

<div class="ew" role="group" aria-label={L('Einwilligung', 'Consent')}>
  <p class="hilfe">{L('Einwilligung ist kein einmaliges Formular, sondern ein Vorgang: Sie erklären vorher, bleiben im Gespräch aufmerksam, fragen vor der Veröffentlichung noch einmal und ermöglichen den Widerruf. Statable merkt sich den Stand je Person und Punkt, warnt beim Exportieren und erinnert an Fristen. Statable sperrt nichts, löscht nie selbst und urteilt nie rechtlich.', 'Consent is not a one-off form but a process: you explain beforehand, stay attentive during the conversation, ask again before publishing and make withdrawal possible. Statable remembers the status per person and point, warns when exporting and reminds you of deadlines. Statable never blocks anything, never deletes by itself and never makes legal judgements.')}</p>
  <p class="hinweis">{KEINE_RECHTSBERATUNG[sp]}</p>

  {#if hinweise.length}
    <section class="hinweise" aria-label={L('Fristen und Warnungen zur Einwilligung', 'Deadlines and warnings on consent')}>
      <h3 id="ew-hinw-t" tabindex="-1">{Lp(hinweise.length, 'Hinweis zur Einwilligung (1)', `Hinweise zur Einwilligung (${hinweise.length})`, 'Note on consent (1)', `Notes on consent (${hinweise.length})`)}</h3>
      <ul>
        {#each hinweise as h (schluessel(h))}
          <li>
            <p>{h.satz}</p>
            <div class="zeile">
              {#if h.art === 'aufnahme-widerrufen' || h.art === 'loeschen-bald' || h.art === 'loeschen-ueberfaellig'}
                <button class="k" type="button" aria-label={`${L('Ja, gelöscht', 'Yes, deleted')}: ${h.satz}`} onclick={() => loescheBestaetigt(h)}>{L('Ja, gelöscht', 'Yes, deleted')}</button>
              {:else}
                <button class="k" type="button" aria-label={`${L('Erledigt', 'Done')}: ${h.satz}`} onclick={() => wiedervorlageErledigt(h)}>{L('Erledigt', 'Done')}</button>
              {/if}
              <button class="k leise" type="button" aria-label={`${L('Für diese Sitzung ausblenden', 'Hide for this session')}: ${h.satz}`} onclick={() => blendeAus(h)}>{L('Für diese Sitzung ausblenden', 'Hide for this session')}</button>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section aria-labelledby="ew-vorlage-t">
    <h3 id="ew-vorlage-t">{L('Vorlage für die Einwilligung zum Interview', 'Template for consent to the interview')}</h3>
    <p class="hilfe">{L('Ein Text mit den Teilen, die die Literatur nennt: wer forscht, Thema, Ablauf, Aufnahme, Zugang, Anonymisierung, Grenzen der Vertraulichkeit, Freiwilligkeit, Widerruf, fünf Kästchen (Teilnahme, Tonaufnahme, Zitate, Archivierung, Weitergabe) und Unterschrift. Was Sie noch eintragen müssen, steht in eckigen Klammern.', 'A text with the parts named in the literature: who is researching, topic, procedure, recording, access, anonymisation, limits of confidentiality, voluntariness, withdrawal, five boxes (participation, audio recording, quotations, archiving, sharing) and signature. What you still have to fill in is in square brackets.')}</p>
    <div class="felder">
      <div class="eingabe"><label for="ew-kontakt">{L('Kontakt (Name, E-Mail oder Anschrift)', 'Contact (name, email or address)')}</label><input id="ew-kontakt" type="text" autocomplete="off" bind:value={kontakt}></div>
      <div class="eingabe"><label for="ew-verantw">{L('Verantwortliche Stelle (Person oder Hochschule)', 'Responsible body (person or university)')}</label><input id="ew-verantw" type="text" autocomplete="off" bind:value={verantwortlich}></div>
    </div>
    <div class="zeile">
      <button class="k haupt" type="button" onclick={() => void vorlageWord()}>{L('Vorlage als Word speichern', 'Save template as Word')}</button>
      <button class="k" type="button" onclick={() => void vorlageHtml()}>{L('Vorlage als HTML speichern', 'Save template as HTML')}</button>
    </div>
    <p class="hilfe" data-testid="ew-offen">{offeneStellen.length
      ? Lp(offeneStellen.length, 'Noch 1 Stelle in eckigen Klammern auszufüllen.', `Noch ${offeneStellen.length} Stellen in eckigen Klammern auszufüllen.`, '1 place in square brackets still to fill in.', `${offeneStellen.length} places in square brackets still to fill in.`)
      : L('Alle Angaben sind ausgefüllt.', 'All details are filled in.')}</p>
  </section>

  <section aria-labelledby="ew-liste-t">
    <h3 id="ew-liste-t">{L('Einwilligung je Fall (Stand, Widerruf, Fristen)', 'Consent per case (status, withdrawal, deadlines)')}</h3>
    {#if !q || !q.faelle.length}
      <p class="hilfe">{L('Es gibt noch keinen Fall. Fälle entstehen, wenn Sie beim Einlesen eines Transkripts jede befragte Person oder jedes Dokument als Fall anlegen lassen, oder im Kodier-Arbeitsplatz unter „Fälle und Variablen“. Danach tragen Sie hier je Fall die Einwilligung ein, ohne Klarnamen: die Fall-Kennung genügt.', 'There is no case yet. Cases arise when you let each respondent or each document become a case while reading in a transcript, or in the coding workplace under "Cases and variables". Then you enter the consent for each case here, without real names: the case label is enough.')}</p>
    {:else}
      {#each q.faelle as f (f.id)}
        {@const e = aktuelleEinwilligung(q, f.id)}
        <details class="fall" open={offen[f.id] ?? (!!e && hinweise.some(h => h.fall === f.id))} ontoggle={(ev) => { const o = ev.currentTarget.open; if (offen[f.id] !== o) offen = { ...offen, [f.id]: o }; }}>
          <summary><span class="fname">{L(`Fall ${f.name}`, `Case ${f.name}`)}</span> <span class="fstand">{kurz(e)}</span></summary>
          {#if e}
            {#if aeltere(e)}<p class="hilfe">{Lp(aeltere(e), 'Es gibt 1 ältere Fassung der Einwilligung dieses Falls. Sie bleibt erhalten; hier gilt die neueste.', `Es gibt ${aeltere(e)} ältere Fassungen der Einwilligung dieses Falls. Sie bleiben erhalten; hier gilt die neueste.`, 'There is 1 older version of this case\'s consent. It is kept; the newest one applies here.', `There are ${aeltere(e)} older versions of this case's consent. They are kept; the newest one applies here.`)}</p>{/if}
            <div class="felder">
              <div class="eingabe"><label for={`ew-fass-${e.id}`}>{L('Fassung (Name oder Datum der Vorlage, die unterschrieben wurde)', 'Version (name or date of the form that was signed)')}</label>
                <input id={`ew-fass-${e.id}`} type="text" autocomplete="off" value={e.fassung} onchange={(ev) => feld(e, { fassung: ev.currentTarget.value.trim() }, `Fassung geändert (${ev.currentTarget.value.trim()})`, L('Fassung geändert.', 'Version changed.'))}></div>
              <div class="eingabe"><label for={`ew-form-${e.id}`}>{L('Form', 'Form')}</label>
                <select id={`ew-form-${e.id}`} value={e.form} onchange={(ev) => feld(e, { form: ev.currentTarget.value as Einwilligung['form'] }, `Form geändert (${ev.currentTarget.value})`, L('Form geändert.', 'Form changed.'))}>
                  {#each FORMEN as fm (fm.id)}<option value={fm.id}>{fm.text}</option>{/each}
                </select></div>
            </div>

            {#each EINWILLIGUNGS_PUNKTE as p (p)}
              {@const st = standVon(e, p)}
              <fieldset class="punkt">
                <legend>{punktText(p)}: <strong>{standText(st)}</strong></legend>
                <div class="radios">
                  {#each EINWILLIGUNGS_STAENDE as s (s)}
                    <label class="schalter"><input type="radio" name={`ew-${e.id}-${p}`} value={s} checked={st === s} onchange={() => stand(e, p, s)}>{standText(s)}</label>
                  {/each}
                </div>
                <div class="eingabe kurz"><label for={`ew-dat-${e.id}-${p}`}>{L('Datum der letzten Änderung', 'Date of the last change')}</label>
                  <input id={`ew-dat-${e.id}-${p}`} type="date" value={e.punkte.find(x => x.punkt === p)?.datum ?? ''} onchange={(ev) => datumAendern(e, p, ev.currentTarget.value)}></div>
              </fieldset>
            {/each}

            <details class="unter">
              <summary>{L('Widerruf eintragen', 'Enter a withdrawal')}</summary>
              <div class="felder">
                <div class="eingabe kurz"><label for={`ew-wd-${e.id}`}>{L('Datum des Widerrufs', 'Date of withdrawal')}</label><input id={`ew-wd-${e.id}`} type="date" value={wfVon(e.id).datum} onchange={(ev) => (wf = { ...wf, [e.id]: { ...wfVon(e.id), datum: ev.currentTarget.value } })}></div>
                <fieldset class="gruppe"><legend>{L('Umfang: welche Punkte werden zurückgenommen?', 'Scope: which points are withdrawn?')}</legend>
                  {#each EINWILLIGUNGS_PUNKTE as p (p)}
                    <label class="schalter"><input type="checkbox" checked={wfVon(e.id).punkte.includes(p)} onchange={(ev) => schalteWiderrufPunkt(e.id, p, ev.currentTarget.checked)}>{punktText(p)}</label>
                  {/each}
                </fieldset>
                <div class="eingabe"><label for={`ew-wn-${e.id}`}>{L('Notiz (frei, zum Beispiel wie der Widerruf ankam)', 'Note (free text, for example how the withdrawal arrived)')}</label><textarea id={`ew-wn-${e.id}`} rows="2" value={wfVon(e.id).notiz} oninput={(ev) => (wf = { ...wf, [e.id]: { ...wfVon(e.id), notiz: ev.currentTarget.value } })}></textarea></div>
              </div>
              <div class="zeile"><button class="k haupt" type="button" onclick={() => widerrufen(e)}>{L('Widerruf eintragen', 'Enter withdrawal')}</button></div>
              {#if widerrufSatzFuer === e.id}<p class="hinweis">{WIDERRUF_SATZ[sp]}</p>{/if}
              {#if e.widerrufe?.length}
                <h4>{L('Bisherige Widerrufe', 'Earlier withdrawals')}</h4>
                <ul>{#each e.widerrufe as w, i (i)}<li>{datumAnzeige(w.datum, sp)}: {w.punkte.map(punktText).join(', ')}{w.notiz ? ` - ${w.notiz}` : ''}</li>{/each}</ul>
              {/if}
            </details>

            <details class="unter">
              <summary>{L('Wiedervorlage (noch einmal fragen)', 'Follow-up (ask again)')}</summary>
              {#if e.wiedervorlage?.length}
                <ul>{#each e.wiedervorlage as w, i (i)}
                  <li>{datumAnzeige(w.datum, sp)}: {w.anlass} - <strong>{w.erledigt ? L(`erledigt am ${datumAnzeige(w.erledigt, 'de')}`, `done on ${w.erledigt}`) : L('offen', 'open')}</strong>
                    {#if !w.erledigt}<button class="k leise" type="button" aria-label={`${L('Erledigt', 'Done')}: ${w.anlass}`} onclick={() => { aendereQualProjekt(p => erledigeWiedervorlage(p, e.id, i, heute, wer)); melde(L('Eingetragen: Wiedervorlage erledigt.', 'Entered: follow-up done.')); }}>{L('Erledigt', 'Done')}</button>{/if}</li>
                {/each}</ul>
              {/if}
              <div class="felder">
                <div class="eingabe kurz"><label for={`ew-wvd-${e.id}`}>{L('Datum', 'Date')}</label><input id={`ew-wvd-${e.id}`} type="date" value={wvVon(e.id).datum} onchange={(ev) => (wv = { ...wv, [e.id]: { ...wvVon(e.id), datum: ev.currentTarget.value } })}></div>
                <div class="eingabe"><label for={`ew-wva-${e.id}`}>{L('Anlass (zum Beispiel „vor der Veröffentlichung noch einmal fragen“)', 'Reason (for example "ask again before publishing")')}</label><input id={`ew-wva-${e.id}`} type="text" autocomplete="off" value={wvVon(e.id).anlass} oninput={(ev) => (wv = { ...wv, [e.id]: { ...wvVon(e.id), anlass: ev.currentTarget.value } })}></div>
              </div>
              <div class="zeile"><button class="k" type="button" onclick={() => wvNeu(e)}>{L('Wiedervorlage eintragen', 'Enter follow-up')}</button></div>
            </details>

            <details class="unter">
              <summary>{L('Löschdatum (Aufnahme, Kontaktdaten)', 'Deletion date (recording, contact data)')}</summary>
              <p class="hilfe">{L('Statable merkt sich nur das Datum und erinnert Sie. Gelöscht wird von Ihnen selbst; die Aufnahme liegt ohnehin nicht im Projekt.', 'Statable only remembers the date and reminds you. You delete yourself; the recording is not in the project anyway.')}</p>
              {#if e.loeschen?.length}
                <ul>{#each e.loeschen as l, i (i)}
                  <li>{loeschText(l.was)}: {L('bis', 'by')} {datumAnzeige(l.bis, sp)} - <strong>{l.erledigt ? L(`gelöscht am ${datumAnzeige(l.erledigt, 'de')}`, `deleted on ${l.erledigt}`) : L('noch nicht bestätigt', 'not yet confirmed')}</strong>
                    {#if !l.erledigt}<button class="k leise" type="button" aria-label={`${L('Ja, gelöscht', 'Yes, deleted')}: ${loeschText(l.was)}`} onclick={() => { aendereQualProjekt(p => bestaetigeGeloescht(p, e.id, l.was, heute, wer)); melde(L('Eingetragen: Löschen bestätigt.', 'Entered: deletion confirmed.')); }}>{L('Ja, gelöscht', 'Yes, deleted')}</button>{/if}</li>
                {/each}</ul>
              {/if}
              <div class="felder">
                <div class="eingabe kurz"><label for={`ew-loa-${e.id}`}>{L('Was', 'What')}</label>
                  <select id={`ew-loa-${e.id}`} value={loVon(e.id).was} onchange={(ev) => (lo = { ...lo, [e.id]: { ...loVon(e.id), was: ev.currentTarget.value as LoForm['was'] } })}>
                    {#each LOESCH_ART as a (a.id)}<option value={a.id}>{a.text}</option>{/each}
                  </select></div>
                <div class="eingabe kurz"><label for={`ew-lob-${e.id}`}>{L('Löschen bis', 'Delete by')}</label><input id={`ew-lob-${e.id}`} type="date" value={loVon(e.id).bis} onchange={(ev) => (lo = { ...lo, [e.id]: { ...loVon(e.id), bis: ev.currentTarget.value } })}></div>
              </div>
              <div class="zeile"><button class="k" type="button" onclick={() => loNeu(e)}>{L('Löschdatum eintragen', 'Enter deletion date')}</button></div>
            </details>

            <div class="eingabe"><label for={`ew-zug-${e.id}`}>{L('Zugriffskreis (wer darf die Daten sehen: nur ich, mein Team, die Betreuerin …)', 'Access group (who may see the data: only me, my team, the supervisor …)')}</label>
              <input id={`ew-zug-${e.id}`} type="text" autocomplete="off" value={e.zugriffskreis ?? ''} onchange={(ev) => feld(e, { zugriffskreis: ev.currentTarget.value.trim() }, `Zugriffskreis geändert (${ev.currentTarget.value.trim()})`, L('Zugriffskreis gespeichert.', 'Access group saved.'))}></div>

            {@const v = verlauf(f.id)}
            <h4 id={`ew-verl-t-${e.id}`}>{L('Verlauf (jede Änderung, nichts wird überschrieben)', 'History (every change, nothing is overwritten)')}</h4>
            {#if v.length}
              <ol aria-labelledby={`ew-verl-t-${e.id}`}>{#each v as a, i (i)}<li><time datetime={new Date(a.zeit).toISOString()}>{zeitText(a.zeit)}</time>: {a.was}{a.vorher !== undefined && a.nachher !== undefined ? ` (${String(a.vorher)} → ${String(a.nachher)})` : ''}</li>{/each}</ol>
            {:else}<p class="hilfe">{L('Noch keine Änderung.', 'No change yet.')}</p>{/if}
          {:else}
            <p class="hilfe">{L('Für diesen Fall ist keine Einwilligung eingetragen. Statable warnt dann beim Exportieren von Text dieses Falls, sperrt aber nichts.', 'No consent is entered for this case. Statable then warns when you export text from this case, but blocks nothing.')}</p>
          {/if}

          <details class="unter" open={!e}>
            <summary>{e ? L('Neue Fassung der Einwilligung anlegen', 'Create a new version of the consent') : L('Einwilligung anlegen', 'Create consent entry')}</summary>
            <div class="felder">
              <div class="eingabe"><label for={`ew-nf-${f.id}`}>{L('Fassung (Name oder Datum der Vorlage)', 'Version (name or date of the form)')}</label><input id={`ew-nf-${f.id}`} type="text" autocomplete="off" value={neuVon(f.id).fassung} oninput={(ev) => (neu = { ...neu, [f.id]: { ...neuVon(f.id), fassung: ev.currentTarget.value } })}></div>
              <div class="eingabe kurz"><label for={`ew-nm-${f.id}`}>{L('Form', 'Form')}</label>
                <select id={`ew-nm-${f.id}`} value={neuVon(f.id).form} onchange={(ev) => (neu = { ...neu, [f.id]: { ...neuVon(f.id), form: ev.currentTarget.value as Einwilligung['form'] } })}>
                  {#each FORMEN as fm (fm.id)}<option value={fm.id}>{fm.text}</option>{/each}
                </select></div>
            </div>
            <div class="zeile"><button class="k" type="button" onclick={() => lege(f.id)}>{L(`Einwilligung für Fall ${f.name} anlegen`, `Create consent entry for case ${f.name}`)}</button></div>
          </details>
        </details>
      {/each}
    {/if}
  </section>

  <details class="einordnung">
    <summary>{L('Einwilligung ist kein Formular (Texte zur Einordnung)', 'Consent is not a form (notes for context)')}</summary>
    <ul>
      <li>{L('Einwilligung ist ein Vorgang im Gespräch, nicht nur eine Unterschrift. Sie kann sich ändern. (von Unger 2018; Malik, Wintersteller und Wöhrer 2021)', 'Consent is a process within the conversation, not just a signature. It can change. (von Unger 2018; Malik, Wintersteller and Wöhrer 2021)')}</li>
      <li>{L('Achten Sie im Gespräch auf Zeichen von Nicht-Wollen (Zögern, Ausweichen, Themenwechsel) und bieten Sie an, eine Frage zu überspringen oder zu pausieren.', 'During the conversation watch for signs of not wanting to (hesitating, evading, changing the subject) and offer to skip a question or pause.')}</li>
      <li>{L('Kinder, Jugendliche und abhängige Personen (zum Beispiel eigene Schülerinnen und Schüler, Mitarbeitende, Patientinnen und Patienten): Die Zustimmung der Sorgeberechtigten ersetzt nicht die eigene Zustimmung des Kindes, und Abhängigkeit kann ein Ja erzwingen. Statable gibt hier keine Regel, nur den Hinweis, das mit Ihrer Betreuung zu klären.', 'Children, young people and dependent persons (for example your own pupils, staff, patients): the consent of those with parental responsibility does not replace the child\'s own consent, and dependence can force a yes. Statable gives no rule here, only the advice to clarify this with your supervisor.')}</li>
      <li>{L('Biographische Interviews lassen sich schwer ganz unkenntlich machen. Sagen Sie das ehrlich. (von Unger 2018)', 'Biographical interviews are hard to make completely unrecognisable. Say so honestly. (von Unger 2018)')}</li>
      <li>{L('Archivierung nur mit eigener Zustimmung zu diesem Punkt. (von Unger 2018)', 'Archiving only with consent to this very point. (von Unger 2018)')}</li>
      <li>{L('Speicherort: Ein Speicher im Web ist nicht automatisch sicher. Statable speichert lokal und bietet für die Projektdatei ein Passwort an. (Denzin und Lincoln 2018)', 'Storage place: storage on the web is not automatically safe. Statable saves locally and offers a password for the project file. (Denzin and Lincoln 2018)')}</li>
    </ul>
  </details>
</div>

<style>
  .ew { display: flex; flex-direction: column; gap: var(--a4); align-items: stretch; }
  .ew h3 { font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); margin: 0 0 var(--a2); }
  .ew h4 { font: 650 var(--gr-klein)/1.3 var(--schrift-ui); margin: var(--a3) 0 var(--a1); }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0 0 var(--a2); }
  .hinweis { margin: 0; font-weight: 600; border-inline-start: 4px solid var(--akzent); padding-inline-start: var(--a3); }
  .hinweise { border: 2px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3) var(--a4); }
  .hinweise ul { margin: 0; padding-inline-start: var(--a4); display: flex; flex-direction: column; gap: var(--a3); }
  .hinweise p { margin: 0 0 var(--a2); }
  .felder { display: flex; flex-wrap: wrap; gap: var(--a3); margin-bottom: var(--a3); }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); flex: 1 1 18rem; min-width: 0; }
  .eingabe.kurz { flex: 0 1 13rem; }
  .eingabe label { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
  .ew input[type='text'], .ew input[type='date'], .ew select, .ew textarea { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a2) var(--a3); width: 100%; box-sizing: border-box; }
  .zeile { display: flex; flex-wrap: wrap; gap: var(--a2); margin-bottom: var(--a2); }
  .fall { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a2) var(--a4); margin-bottom: var(--a3); }
  .fall > summary { cursor: pointer; min-height: var(--ziel); display: flex; flex-wrap: wrap; gap: var(--a3); align-items: center; }
  .fname { font-weight: 650; }
  .fstand { font-size: var(--gr-klein); color: var(--tinte-2); }
  .unter { border-top: 1px solid var(--linie); padding-top: var(--a2); margin-top: var(--a2); }
  .unter > summary { cursor: pointer; min-height: var(--ziel); display: flex; align-items: center; font-weight: 600; }
  .punkt, .gruppe { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0 0 var(--a2); min-width: 0; }
  .punkt legend, .gruppe legend { font-size: var(--gr-klein); padding: 0 var(--a1); }
  .radios { display: flex; flex-wrap: wrap; gap: var(--a1) var(--a4); }
  .schalter { display: flex; gap: var(--a2); align-items: center; min-height: var(--ziel); }
  .schalter input { width: 1.4rem; height: 1.4rem; }
  .einordnung > summary { cursor: pointer; min-height: var(--ziel); display: flex; align-items: center; font-weight: 600; }
  .ew ul, .ew ol { margin: 0 0 var(--a2); padding-inline-start: var(--a4); }
</style>
