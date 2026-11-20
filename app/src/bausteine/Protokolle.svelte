<script module lang="ts">
  /** Schalter „Beobachtet oder gedeutet?“: gilt für die ganze Sitzung (nicht im Projekt gespeichert). */
  export const deutungHinweis = $state({ an: true });
</script>

<script lang="ts">
  /**
   * Protokolle (Interviewprotokoll, Gedächtnisprotokoll, Beobachtungsprotokoll) und Feldnotizen, Stufe F2A.
   * Rechenkern: `lib/protokolle.ts`, `lib/deutungsmarker.ts`, `lib/protokoll-word.ts`; Beschriftungen: `lib/protokoll-texte.ts`.
   * Ablage im qualitativen Projekt (`lib/interviews.svelte.ts`). Der Entwurf wird nach kurzer Pause und beim Verlassen eines Feldes gespeichert.
   * Deutungsmarker: Liste unter dem Beobachtungsfeld, nie im Feld, nie als Fehler. Ansagen nur über `sageSpaeter()` (keine eigene Live-Region).
   * Text aus dem Projekt wird nur als Text angezeigt, nie als HTML.
   */
  import { onDestroy, tick } from 'svelte';
  import { L, Lp, d } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { dateiname } from '../lib/dateiname';
  import { entferneFeldnotiz, entferneProtokollAusProjekt, iv, legeFeldnotizAn, legeProtokollAn, qualProjekt, speichereProtokoll } from '../lib/interviews.svelte';
  import type { Memo, Protokoll } from '../lib/qualprojekt';
  import { INTERVIEW_FELDER, beginneSchritt1, neueFeldnotiz, neuesProtokoll, wirktWieStichworte } from '../lib/protokolle';
  import { findeDeutungsmarker, type DeutungsStelle } from '../lib/deutungsmarker';
  import { BEOBACHTUNG_FELD_TEXT, INTERVIEW_FELD_TEXT, KOPF_TEXT, PROTOKOLL_ART, SCHRITT_TEXT, datumAnzeige } from '../lib/protokoll-texte';
  import { formatZeit, leseZeit } from '../lib/zeitmarken';

  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
  const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const q = $derived(qualProjekt());
  const protokolle = $derived(q?.protokolle ?? []);
  const faelle = $derived(q?.faelle ?? []);
  const transkripte = $derived((q?.dokumente ?? []).filter(d => d.transkript));
  const feldnotizen = $derived((q?.memos ?? []).filter(m => m.art && m.art !== 'memo'));
  const fallName = (id?: string): string => faelle.find(f => f.id === id)?.name ?? '';

  let entwurf = $state<Protokoll | null>(null);
  let schritt = $state<1 | 2 | 3>(1);
  let rechtschreib = $state(false);
  let weg = $state<string | null>(null);
  let notizArt = $state<'feldnotiz-empirisch' | 'feldnotiz-methodisch' | 'feldnotiz-theoretisch'>('feldnotiz-empirisch');
  let notizText = $state('');
  let stelleText = $state('');
  let stelleZeit = $state('');
  let stelleFehler = $state('');
  let fehler = $state('');

  const titelVon = (p: Protokoll): string => {
    const t = [PROTOKOLL_ART[p.art][sprache()]];
    const f = fallName(p.fall); if (f) t.push(f);
    if (p.kopf.datum) t.push(datumAnzeige(p.kopf.datum, sprache()));
    return t.join(' - ');
  };

  /* ---------- Speichern */
  let timer: ReturnType<typeof setTimeout> | undefined;
  function speichere() {
    if (timer) { clearTimeout(timer); timer = undefined; }
    if (entwurf) speichereProtokoll($state.snapshot(entwurf) as Protokoll);
  }
  function geaendert() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(speichere, 600);
  }
  onDestroy(() => { speichere(); for (const a of angesagt.values()) a.weg?.(); });

  async function oeffne(p: Protokoll, fokus = true) {
    speichere();
    entwurf = structuredClone($state.snapshot(p)) as Protokoll;
    const s = entwurf.schritte;
    schritt = s?.s3 ? 3 : s?.s2 ? 2 : 1;
    angesagt.clear();
    stelleText = ''; stelleZeit = ''; stelleFehler = '';
    if (fokus) { await tick(); document.getElementById('pr-editor-t')?.focus(); }
  }
  async function neu(art: Protokoll['art']) {
    speichere();
    const p = neuesProtokoll(art);
    legeProtokollAn(p);
    await oeffne(p, false);
    sage(L(`${PROTOKOLL_ART[art].de} angelegt.`, `${PROTOKOLL_ART[art].en} created.`));
    await tick(); document.getElementById('pr-editor-t')?.focus();
  }
  function schliesse() {
    speichere(); entwurf = null;
    void tick().then(() => document.getElementById('pr-liste-t')?.focus());
  }
  function entferne(p: Protokoll) {
    if (weg !== p.id) { weg = p.id; sage(L('Noch einmal wählen, um das Protokoll zu entfernen.', 'Choose again to remove the protocol.')); return; }
    weg = null;
    if (entwurf?.id === p.id) entwurf = null;
    entferneProtokollAusProjekt(p.id);
    sage(L('Protokoll entfernt.', 'Protocol removed.'));
    void tick().then(() => document.getElementById('pr-liste-t')?.focus());
  }

  /* ---------- Kopf */
  function setzeKopf(feld: 'datum' | 'uhrzeit' | 'ort' | 'kontaktweg', v: string) {
    if (!entwurf) return;
    if (v.trim()) entwurf.kopf[feld] = v; else delete entwurf.kopf[feld];
    geaendert();
  }
  function setzeDauer(v: string) {
    if (!entwurf) return;
    const z = v.trim() === '' ? NaN : Number(v);
    if (Number.isFinite(z) && z >= 0) entwurf.kopf.dauerMin = z; else delete entwurf.kopf.dauerMin;
    geaendert();
  }
  function setzeBezug(feld: 'fall' | 'dokument', v: string) {
    if (!entwurf) return;
    if (v) entwurf[feld] = v; else delete entwurf[feld];
    geaendert();
  }
  function setzeFeld(key: string, v: string) { if (entwurf) { entwurf.felder[key] = v; geaendert(); } }

  /* ---------- Schwierige Stellen */
  function stelleHinzu() {
    if (!entwurf) return;
    stelleFehler = '';
    const t = stelleText.trim();
    if (!t) { stelleFehler = L('Schreiben Sie zuerst auf, was an der Stelle schwierig war.', 'First write down what was difficult about the passage.'); return; }
    const st: NonNullable<Protokoll['schwierigeStellen']>[number] = { text: t };
    if (entwurf.dokument && stelleZeit.trim()) {
      const ms = leseZeit(stelleZeit) ?? leseZeit('00:' + stelleZeit.trim());
      if (ms === null) { stelleFehler = L('Die Zeit verstehe ich nicht. Schreiben Sie sie so: 12:30 oder 1:12:30.', 'I do not understand the time. Write it like this: 12:30 or 1:12:30.'); return; }
      st.zeitMs = ms;
    }
    entwurf.schwierigeStellen = [...(entwurf.schwierigeStellen ?? []), st];
    stelleText = ''; stelleZeit = '';
    geaendert(); speichere();
    sage(L('Schwierige Stelle hinzugefügt.', 'Passage added.'));
  }
  function stelleWeg(i: number) {
    if (!entwurf?.schwierigeStellen) return;
    entwurf.schwierigeStellen = entwurf.schwierigeStellen.filter((_, j) => j !== i);
    speichere(); sage(L('Schwierige Stelle entfernt.', 'Passage removed.'));
  }
  /** Öffnet das Transkript im Abschnitt „Transkripte“. Ein Sprung zur Zeitmarke ist von hier aus nicht möglich: der Abspieler gehört zur Transkript-Ansicht. */
  async function zuTranskript(dokId: string) {
    iv.offen = dokId;
    await tick();
    const e = document.getElementById('iv-trans-t');
    e?.scrollIntoView({ block: 'start' }); e?.focus();
  }

  /* ---------- Gedächtnisprotokoll */
  function schritt1Tippen(v: string) {
    if (!entwurf) return;
    const p = beginneSchritt1(entwurf, Date.now());
    entwurf.schritte = { ...p.schritte, s1: { text: v, beginn: p.schritte!.s1!.beginn } };
    geaendert();
  }
  function schritt2Tippen(feld: 'text' | 'notizen', v: string) {
    if (!entwurf) return;
    const alt = entwurf.schritte?.s2 ?? { text: '' };
    const neuS2 = { ...alt, [feld]: v };
    entwurf.schritte = { ...entwurf.schritte, s2: neuS2 };
    geaendert();
  }
  async function weiter() {
    if (!entwurf) return;
    if (schritt === 1) {
      if (!entwurf.schritte?.s1) entwurf.schritte = { ...entwurf.schritte, s1: { text: '', beginn: Date.now() } };
      if (!entwurf.schritte?.s2) entwurf.schritte = { ...entwurf.schritte, s2: { text: '' } };
      schritt = 2;
    } else if (schritt === 2) {
      if (!entwurf.schritte?.s3) entwurf.schritte = { ...entwurf.schritte, s3: { abschnitte: [{ beobachtung: '', ueberlegung: '' }] } };
      schritt = 3;
    }
    speichere();
    sage(L(`Schritt ${schritt}. Die früheren Schritte stehen darüber und lassen sich nur lesen.`, `Step ${schritt}. The earlier steps stand above and can only be read.`));
    await tick(); document.getElementById('pr-schritt-' + schritt)?.focus();
  }
  function abschnittPlus() {
    if (!entwurf?.schritte?.s3) return;
    entwurf.schritte.s3.abschnitte = [...entwurf.schritte.s3.abschnitte, { beobachtung: '', ueberlegung: '' }];
    speichere();
    const n = entwurf.schritte.s3.abschnitte.length;
    sage(L(`Abschnitt ${n} hinzugefügt.`, `Section ${n} added.`));
    void tick().then(() => document.getElementById('pr-ab-b-' + (n - 1))?.focus());
  }
  function abschnittWeg(i: number) {
    if (!entwurf?.schritte?.s3) return;
    const liste = entwurf.schritte.s3.abschnitte;
    if (liste.length <= 1) { sage(L('Der letzte Abschnitt bleibt stehen.', 'The last section stays.')); return; }
    entwurf.schritte.s3.abschnitte = liste.filter((_, j) => j !== i);
    speichere();
    sage(L(`Abschnitt ${i + 1} entfernt.`, `Section ${i + 1} removed.`));
    void tick().then(() => document.getElementById('pr-ab-b-' + Math.max(0, i - 1))?.focus());
  }
  function abschnittTippen(i: number, feld: 'beobachtung' | 'ueberlegung', v: string) {
    if (!entwurf?.schritte?.s3) return;
    entwurf.schritte.s3.abschnitte[i]![feld] = v;
    geaendert();
  }
  const uhrzeitVon = (ms: number): string => new Date(ms).toLocaleString(sprache() === 'de' ? 'de-AT' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' });

  /* ---------- Deutungsmarker */
  const stellenVon = (text: string): DeutungsStelle[] => (deutungHinweis.an ? findeDeutungsmarker(text, sprache()) : []);
  /** Der Satz in drei Teilen: vor der Stelle, die Stelle, nach der Stelle. */
  function satzTeile(text: string, st: DeutungsStelle): [string, string, string] {
    const von = Math.max(0, text.lastIndexOf(st.satz, st.start));
    const rel = st.start - von;
    return [st.satz.slice(0, rel), st.treffer, st.satz.slice(rel + st.treffer.length)];
  }
  const angesagt = new Map<string, { n: number; weg?: () => void }>();
  /** Sagt die Zahl der Stellen an, wenn sie sich geändert hat, nach kurzer Pause. Beim ersten Sehen eines Feldes nichts. */
  function meldeAnzahl(key: string, n: number) {
    const a = angesagt.get(key);
    if (!a) { angesagt.set(key, { n }); return; }
    if (a.n === n) return;
    a.weg?.();
    a.n = n;
    a.weg = sageSpaeter(n > 0
      ? Lp(n, 'Beobachtet oder gedeutet? 1 Stelle', `Beobachtet oder gedeutet? ${n} Stellen`, 'Observed or interpreted? 1 passage', `Observed or interpreted? ${n} passages`)
      : L('Keine Stelle mehr markiert.', 'No passage marked any more.'), 1500);
  }
  const zahlen = $derived.by(() => {
    const m = new Map<string, number>();
    if (!entwurf) return m;
    if (entwurf.art === 'beobachtung') m.set('b', stellenVon(entwurf.felder.beobachtung ?? '').length);
    if (entwurf.art === 'gedaechtnis' && schritt === 3) (entwurf.schritte?.s3?.abschnitte ?? []).forEach((a, i) => m.set('s3-' + i, stellenVon(a.beobachtung).length));
    return m;
  });
  $effect(() => { for (const [k, n] of zahlen) meldeAnzahl(k, n); });

  /* ---------- Word */
  async function wordAus(p: Protokoll) {
    fehler = '';
    try {
      if (entwurf?.id === p.id) speichere();
      const aktuell = (qualProjekt()?.protokolle ?? []).find(x => x.id === p.id) ?? p;
      const proj = qualProjekt();
      if (!proj) return;
      const [{ protokollWord }, { herunterladen }] = await Promise.all([import('../lib/protokoll-word'), import('../lib/export')]);
      const bytes = await protokollWord($state.snapshot(aktuell) as Protokoll, $state.snapshot(proj) as typeof proj, sprache());
      herunterladen(bytes, `${dateiname(titelVon(aktuell))}.docx`, WORD);
      sage(L('Word-Datei gespeichert.', 'Word file saved.'));
    } catch (e) {
      fehler = L('Die Word-Datei konnte nicht erstellt werden.', 'The Word file could not be created.') + ' ' + (e instanceof Error ? e.message : '');
    }
  }

  /* ---------- Feldnotizen */
  const notizName = (a: Memo['art']): string => ({
    'feldnotiz-empirisch': L('empirisch (was geschah)', 'empirical (what happened)'),
    'feldnotiz-methodisch': L('methodisch (wie ich vorgegangen bin)', 'methodological (how I proceeded)'),
    'feldnotiz-theoretisch': L('theoretisch (Gedanken zur Forschungsfrage)', 'theoretical (thoughts on the research question)'),
    memo: 'Memo'
  } as Record<string, string>)[a ?? 'memo'] ?? '';
  function notizSpeichern() {
    const t = notizText.trim();
    if (!t) { sage(L('Die Notiz ist noch leer.', 'The note is still empty.')); return; }
    legeFeldnotizAn(neueFeldnotiz(notizArt, t, entwurf ? [{ art: 'protokoll', id: entwurf.id }] : []));
    notizText = '';
    sage(L('Feldnotiz gespeichert.', 'Field note saved.'));
  }
  function notizWeg(m: Memo) {
    entferneFeldnotiz(m.id);
    sage(L('Feldnotiz entfernt.', 'Field note removed.'));
    void tick().then(() => document.getElementById('pr-notiz-t')?.focus());
  }
</script>

{#snippet marker(text: string, id: string)}
  {@const st = stellenVon(text)}
  {#if deutungHinweis.an && st.length}
    <div class="dm" id={id} role="group" aria-label={Lp(st.length, 'Beobachtet oder gedeutet? 1 Stelle', `Beobachtet oder gedeutet? ${st.length} Stellen`, 'Observed or interpreted? 1 passage', `Observed or interpreted? ${st.length} passages`)}>
      <p class="dm-t">{Lp(st.length, 'Beobachtet oder gedeutet? 1 Stelle', `Beobachtet oder gedeutet? ${st.length} Stellen`, 'Observed or interpreted? 1 passage', `Observed or interpreted? ${st.length} passages`)}</p>
      <ul>
        {#each st as x (x.start)}
          {@const t = satzTeile(text, x)}
          <li><span class="zitat">„{t[0]}<mark>{t[1]}</mark>{t[2]}“</span> <span class="frage">{L('Ist das beobachtet oder gedeutet?', 'Is this observed or interpreted?')}</span></li>
        {/each}
      </ul>
    </div>
  {/if}
{/snippet}

<div class="pr" role="group" aria-label={L('Protokolle (Interviewprotokoll, Gedächtnisprotokoll, Feldnotizen)', 'Protocols (interview protocol, memory protocol, field notes)')}>
  <p class="heft-text">{L('Halten Sie fest, was um ein Gespräch oder eine Beobachtung herum geschah. Das Interviewprotokoll (Postskript) schreiben Sie gleich nach dem Gespräch. Das Gedächtnisprotokoll entsteht aus der Erinnerung in drei Schritten. Statable deutet nichts selbst: Die Hinweise sind Fragen an Sie.', 'Record what happened around an interview or an observation. You write the interview protocol (postscript) right after the conversation. The memory protocol is written from memory in three steps. Statable does not interpret anything itself: the notes are questions to you.')}</p>

  <div class="knopfzeile">
    <button class="k" type="button" id="pr-neu-iv" onclick={() => void neu('interview')}>{L('Neues Interviewprotokoll', 'New interview protocol')}</button>
    <button class="k" type="button" id="pr-neu-ge" onclick={() => void neu('gedaechtnis')}>{L('Neues Gedächtnisprotokoll', 'New memory protocol')}</button>
    <button class="k" type="button" id="pr-neu-be" onclick={() => void neu('beobachtung')}>{L('Neues Beobachtungsprotokoll', 'New observation protocol')}</button>
  </div>

  <label class="schalter"><input type="checkbox" bind:checked={deutungHinweis.an}>{L('Hinweise „Beobachtet oder gedeutet?“ zeigen (nur im Beobachtungsfeld)', 'Show the notes "observed or interpreted?" (observation field only)')}</label>

  {#if fehler}<p class="fehl">{fehler}</p>{/if}

  <h3 id="pr-liste-t" tabindex="-1">{L('Ihre Protokolle', 'Your protocols')}</h3>
  {#if protokolle.length}
    <ul class="liste" aria-labelledby="pr-liste-t">
      {#each protokolle as p (p.id)}
        <li>
          <span class="name">{titelVon(p)}</span>
          <button class="k klein" type="button" aria-label="{L('Öffnen', 'Open')}: {titelVon(p)}" aria-current={entwurf?.id === p.id ? 'true' : undefined} onclick={() => void oeffne(p)}>{L('Öffnen', 'Open')}</button>
          <button class="k klein leise" type="button" aria-label="{L('Word-Datei', 'Word file')}: {titelVon(p)}" onclick={() => void wordAus(p)}>{L('Word', 'Word')}</button>
          <button class="k klein leise" type="button" aria-label="{weg === p.id ? L('Wirklich entfernen', 'Really remove') : L('Entfernen', 'Remove')}: {titelVon(p)}" onclick={() => entferne(p)}>{weg === p.id ? L('Wirklich entfernen?', 'Really remove?') : L('Entfernen', 'Remove')}</button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="hilfe">{L('Noch kein Protokoll. Wählen Sie oben eine Art.', 'No protocol yet. Choose a type above.')}</p>
  {/if}

  {#if entwurf}
    {@const e = entwurf}
    <section class="editor" aria-label={L('Protokoll bearbeiten', 'Edit protocol')}>
      <h3 id="pr-editor-t" tabindex="-1">{titelVon(e)}</h3>

      <fieldset class="kopf">
        <legend>{L('Kopf (Angaben zum Gespräch)', 'Header (details of the conversation)')}</legend>
        <div class="eingabe"><label for="pr-fall">{KOPF_TEXT.fall[sprache()]}</label>
          <select id="pr-fall" value={e.fall ?? ''} onchange={(ev) => setzeBezug('fall', ev.currentTarget.value)}>
            <option value="">{L('(kein Fall gewählt)', '(no case chosen)')}</option>
            {#each faelle as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
          </select></div>
        <div class="eingabe"><label for="pr-datum">{KOPF_TEXT.datum[sprache()]}</label>
          <input id="pr-datum" type="date" value={e.kopf.datum ?? ''} onchange={(ev) => setzeKopf('datum', ev.currentTarget.value)}></div>
        <div class="eingabe"><label for="pr-zeit">{KOPF_TEXT.uhrzeit[sprache()]}</label>
          <input id="pr-zeit" type="time" value={e.kopf.uhrzeit ?? ''} onchange={(ev) => setzeKopf('uhrzeit', ev.currentTarget.value)}></div>
        <div class="eingabe"><label for="pr-ort">{KOPF_TEXT.ort[sprache()]}</label>
          <input id="pr-ort" type="text" maxlength="120" autocomplete="off" aria-describedby="pr-ort-h" value={e.kopf.ort ?? ''} oninput={(ev) => setzeKopf('ort', ev.currentTarget.value)}>
          <span class="hilfe" id="pr-ort-h">{L('Nur allgemein, zum Beispiel „Café“, nie eine Adresse.', 'General only, for example "café", never an address.')}</span></div>
        {#if e.art === 'interview'}
          <div class="eingabe"><label for="pr-dauer">{KOPF_TEXT.dauer[sprache()]}</label>
            <input id="pr-dauer" type="number" min="0" step="1" inputmode="numeric" value={e.kopf.dauerMin ?? ''} oninput={(ev) => setzeDauer(ev.currentTarget.value)}></div>
          <div class="eingabe"><label for="pr-kontakt">{KOPF_TEXT.kontaktweg[sprache()]}</label>
            <input id="pr-kontakt" type="text" maxlength="120" autocomplete="off" value={e.kopf.kontaktweg ?? ''} oninput={(ev) => setzeKopf('kontaktweg', ev.currentTarget.value)}></div>
          <div class="eingabe"><label for="pr-dok">{L('Transkript (Dokument)', 'Transcript (document)')}</label>
            <select id="pr-dok" value={e.dokument ?? ''} onchange={(ev) => setzeBezug('dokument', ev.currentTarget.value)}>
              <option value="">{L('(kein Transkript gewählt)', '(no transcript chosen)')}</option>
              {#each transkripte as d (d.id)}<option value={d.id}>{d.name}</option>{/each}
            </select></div>
        {/if}
      </fieldset>
      {#if !faelle.length}<p class="hilfe">{L('Es gibt noch keinen Fall. Fälle entstehen, wenn Sie ein Transkript einlesen. Sie können das Protokoll auch ohne Fall schreiben.', 'There is no case yet. Cases are created when you read in a transcript. You can also write the protocol without a case.')}</p>{/if}

      {#if e.art === 'interview'}
        {#each INTERVIEW_FELDER as key (key)}
          {@const text = e.felder[key] ?? ''}
          <div class="eingabe">
            <label for="pr-f-{key}">{INTERVIEW_FELD_TEXT[key]!.name[sprache()]}</label>
            <span class="hilfe" id="pr-f-{key}-h">{INTERVIEW_FELD_TEXT[key]!.frage[sprache()]}</span>
            {#if wirktWieStichworte(text)}<span class="hilfe" id="pr-f-{key}-s">{d('Schreibe in ganzen Sätzen, nicht in Stichworten.', 'Schreiben Sie in ganzen Sätzen, nicht in Stichworten.', 'Write in whole sentences, not in keywords.')}</span>{/if}
            <textarea id="pr-f-{key}" rows="4" value={text} aria-describedby="pr-f-{key}-h{wirktWieStichworte(text) ? ` pr-f-${key}-s` : ''}" oninput={(ev) => setzeFeld(key, ev.currentTarget.value)} onblur={speichere}></textarea>
          </div>
        {/each}

        <fieldset class="kopf">
          <legend>{L('Schwierige Stellen', 'Difficult passages')}</legend>
          {#if e.schwierigeStellen?.length}
            <ul class="liste" aria-label={L('Schwierige Stellen', 'Difficult passages')}>
              {#each e.schwierigeStellen as st, i (i)}
                <li>
                  <span class="name">{#if st.zeitMs !== undefined}<strong>{formatZeit(st.zeitMs, 'hms')}</strong> {/if}{st.text}</span>
                  {#if e.dokument}<button class="k klein" type="button" aria-label="{L('Zur Stelle im Transkript', 'To the passage in the transcript')}: {st.text}" onclick={() => void zuTranskript(e.dokument!)}>{L('Zur Stelle im Transkript', 'To the passage in the transcript')}</button>{/if}
                  <button class="k klein leise" type="button" aria-label="{L('Entfernen', 'Remove')}: {st.text}" onclick={() => stelleWeg(i)}>{L('Entfernen', 'Remove')}</button>
                </li>
              {/each}
            </ul>
          {/if}
          <div class="eingabe"><label for="pr-st-text">{L('Was war an der Stelle schwierig?', 'What was difficult about the passage?')}</label>
            <textarea id="pr-st-text" rows="2" bind:value={stelleText} aria-describedby={stelleFehler ? 'pr-st-fehler' : undefined}></textarea></div>
          {#if e.dokument}
            <div class="eingabe"><label for="pr-st-zeit">{L('Zeitmarke im Transkript (zum Beispiel 12:30)', 'Time mark in the transcript (for example 12:30)')}</label>
              <input id="pr-st-zeit" type="text" inputmode="numeric" autocomplete="off" bind:value={stelleZeit}></div>
          {:else}
            <p class="hilfe">{L('Wählen Sie oben ein Transkript, dann können Sie zu jeder Stelle eine Zeitmarke angeben.', 'Choose a transcript above, then you can give a time mark for each passage.')}</p>
          {/if}
          {#if stelleFehler}<p class="fehl" id="pr-st-fehler">{stelleFehler}</p>{/if}
          <div class="knopfzeile"><button class="k" type="button" onclick={stelleHinzu}>{L('Schwierige Stelle hinzufügen', 'Add passage')}</button></div>
        </fieldset>
      {:else if e.art === 'beobachtung'}
        {@const bt = e.felder.beobachtung ?? ''}
        <div class="eingabe">
          <label for="pr-f-beobachtung">{BEOBACHTUNG_FELD_TEXT.beobachtung.name[sprache()]}</label>
          <span class="hilfe" id="pr-f-beobachtung-h">{BEOBACHTUNG_FELD_TEXT.beobachtung.frage[sprache()]}</span>
          <textarea id="pr-f-beobachtung" rows="6" value={bt} aria-describedby="pr-f-beobachtung-h{deutungHinweis.an && stellenVon(bt).length ? ' pr-dm-b' : ''}" oninput={(ev) => setzeFeld('beobachtung', ev.currentTarget.value)} onblur={speichere}></textarea>
          {@render marker(bt, 'pr-dm-b')}
        </div>
        <div class="eingabe">
          <label for="pr-f-ueberlegung">{BEOBACHTUNG_FELD_TEXT.ueberlegung.name[sprache()]}</label>
          <span class="hilfe" id="pr-f-ueberlegung-h">{BEOBACHTUNG_FELD_TEXT.ueberlegung.frage[sprache()]}</span>
          <textarea id="pr-f-ueberlegung" rows="4" value={e.felder.ueberlegung ?? ''} aria-describedby="pr-f-ueberlegung-h" oninput={(ev) => setzeFeld('ueberlegung', ev.currentTarget.value)} onblur={speichere}></textarea>
        </div>
      {:else}
        <ol class="schritte" aria-label={L('Drei Schritte', 'Three steps')}>
          <li>
            <h4 id="pr-schritt-1" tabindex="-1">{SCHRITT_TEXT.s1.name[sprache()]}</h4>
            {#if schritt === 1}
              <p class="hilfe" id="pr-s1-h">{SCHRITT_TEXT.s1.frage[sprache()]} {L('Statable merkt sich die Uhrzeit, wenn Sie zu schreiben beginnen.', 'Statable notes the time when you start writing.')}</p>
              <label class="schalter"><input type="checkbox" bind:checked={rechtschreib} aria-describedby="pr-rs-h">{L('Rechtschreibhinweise zeigen', 'Show spelling hints')}</label>
              <span class="hilfe" id="pr-rs-h">{L('Aus, damit Sie schnell schreiben und nichts verbessern. Das kommt später.', 'Off, so that you write quickly and fix nothing. That comes later.')}</span>
              <label class="nur-vorleser" for="pr-s1">{SCHRITT_TEXT.s1.name[sprache()]}</label>
              <textarea id="pr-s1" rows="10" spellcheck={rechtschreib} value={e.schritte?.s1?.text ?? ''} aria-describedby="pr-s1-h" oninput={(ev) => schritt1Tippen(ev.currentTarget.value)} onblur={speichere}></textarea>
              {#if e.schritte?.s1}<p class="hilfe">{L('Begonnen:', 'Started:')} {uhrzeitVon(e.schritte.s1.beginn)}</p>{/if}
              <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => void weiter()}>{L('Weiter zu Schritt 2', 'On to step 2')}</button></div>
            {:else}
              <p class="lesen"><span class="nur-vorleser">{L('Schritt 1, nur zum Lesen: ', 'Step 1, read only: ')}</span>{e.schritte?.s1?.text || L('(leer)', '(empty)')}</p>
              {#if e.schritte?.s1}<p class="hilfe">{L('Begonnen:', 'Started:')} {uhrzeitVon(e.schritte.s1.beginn)}</p>{/if}
            {/if}
          </li>
          {#if schritt >= 2}
            <li>
              <h4 id="pr-schritt-2" tabindex="-1">{SCHRITT_TEXT.s2.name[sprache()]}</h4>
              {#if schritt === 2}
                <p class="hilfe" id="pr-s2-h">{SCHRITT_TEXT.s2.frage[sprache()]}</p>
                <div class="eingabe"><label for="pr-s2">{L('Situationen in zeitlicher Folge', 'Situations in time order')}</label>
                  <textarea id="pr-s2" rows="8" aria-describedby="pr-s2-h" value={e.schritte?.s2?.text ?? ''} oninput={(ev) => schritt2Tippen('text', ev.currentTarget.value)} onblur={speichere}></textarea></div>
                <div class="eingabe"><label for="pr-s2n">{L('Notizen aus dem Feld (Jottings)', 'Notes from the field (jottings)')}</label>
                  <textarea id="pr-s2n" rows="4" value={e.schritte?.s2?.notizen ?? ''} oninput={(ev) => schritt2Tippen('notizen', ev.currentTarget.value)} onblur={speichere}></textarea></div>
                <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => void weiter()}>{L('Weiter zu Schritt 3', 'On to step 3')}</button></div>
              {:else}
                <p class="lesen"><span class="nur-vorleser">{L('Schritt 2, nur zum Lesen: ', 'Step 2, read only: ')}</span>{e.schritte?.s2?.text || L('(leer)', '(empty)')}</p>
                {#if e.schritte?.s2?.notizen}<p class="lesen"><span class="nur-vorleser">{L('Notizen aus dem Feld, nur zum Lesen: ', 'Notes from the field, read only: ')}</span>{e.schritte.s2.notizen}</p>{/if}
              {/if}
            </li>
          {/if}
          {#if schritt === 3 && e.schritte?.s3}
            <li>
              <h4 id="pr-schritt-3" tabindex="-1">{SCHRITT_TEXT.s3.name[sprache()]}</h4>
              <p class="hilfe" id="pr-s3-h">{SCHRITT_TEXT.s3.frage[sprache()]}</p>
              {#each e.schritte.s3.abschnitte as a, i (i)}
                <fieldset class="kopf">
                  <legend>{L(`Abschnitt ${i + 1}`, `Section ${i + 1}`)}</legend>
                  <div class="eingabe"><label for="pr-ab-b-{i}">{BEOBACHTUNG_FELD_TEXT.beobachtung.name[sprache()]}</label>
                    <textarea id="pr-ab-b-{i}" rows="4" aria-describedby="pr-s3-h{deutungHinweis.an && stellenVon(a.beobachtung).length ? ` pr-dm-${i}` : ''}" value={a.beobachtung} oninput={(ev) => abschnittTippen(i, 'beobachtung', ev.currentTarget.value)} onblur={speichere}></textarea>
                    {@render marker(a.beobachtung, 'pr-dm-' + i)}</div>
                  <div class="eingabe"><label for="pr-ab-u-{i}">{BEOBACHTUNG_FELD_TEXT.ueberlegung.name[sprache()]}</label>
                    <textarea id="pr-ab-u-{i}" rows="3" value={a.ueberlegung} oninput={(ev) => abschnittTippen(i, 'ueberlegung', ev.currentTarget.value)} onblur={speichere}></textarea></div>
                  {#if e.schritte.s3.abschnitte.length > 1}
                    <div class="knopfzeile"><button class="k klein leise" type="button" aria-label={L(`Abschnitt ${i + 1} entfernen`, `Remove section ${i + 1}`)} onclick={() => abschnittWeg(i)}>{L('Abschnitt entfernen', 'Remove section')}</button></div>
                  {/if}
                </fieldset>
              {/each}
              <div class="knopfzeile"><button class="k" type="button" onclick={abschnittPlus}>{L('Abschnitt hinzufügen', 'Add section')}</button></div>
            </li>
          {/if}
        </ol>
      {/if}

      <div class="knopfzeile">
        <button class="k haupt" type="button" onclick={() => void wordAus(e)}>{L('Als Word-Datei speichern', 'Save as Word file')}</button>
        <button class="k leise" type="button" onclick={schliesse}>{L('Protokoll schließen', 'Close protocol')}</button>
      </div>
      <p class="hilfe">{L('Gespeichert wird automatisch im Projekt.', 'Saved automatically in the project.')}</p>
    </section>
  {/if}

  <h3 id="pr-notiz-t" tabindex="-1">{L('Feldnotizen (empirisch, methodisch, theoretisch)', 'Field notes (empirical, methodological, theoretical)')}</h3>
  <fieldset class="kopf">
    <legend>{L('Art der Feldnotiz', 'Type of field note')}</legend>
    {#each ['feldnotiz-empirisch', 'feldnotiz-methodisch', 'feldnotiz-theoretisch'] as a (a)}
      <label class="schalter"><input type="radio" name="pr-notiz-art" value={a} bind:group={notizArt}>{notizName(a as Memo['art'])}</label>
    {/each}
  </fieldset>
  <div class="eingabe"><label for="pr-notiz">{L('Feldnotiz', 'Field note')}</label>
    <textarea id="pr-notiz" rows="3" bind:value={notizText}></textarea></div>
  <div class="knopfzeile"><button class="k" type="button" onclick={notizSpeichern}>{L('Feldnotiz speichern', 'Save field note')}</button></div>
  {#if feldnotizen.length}
    <ul class="liste" aria-label={L('Ihre Feldnotizen', 'Your field notes')}>
      {#each feldnotizen as m (m.id)}
        <li><span class="name"><strong>{notizName(m.art)}:</strong> {m.text}</span>
          <button class="k klein leise" type="button" aria-label="{L('Entfernen', 'Remove')}: {m.text.slice(0, 40)}" onclick={() => notizWeg(m)}>{L('Entfernen', 'Remove')}</button></li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .pr { display: flex; flex-direction: column; gap: var(--a3); }
  .pr h3 { margin: var(--a3) 0 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .pr h4 { margin: 0 0 var(--a2); font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .liste li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2) var(--a3); }
  .liste .name { flex: 1 1 14rem; min-width: 0; overflow-wrap: anywhere; }
  .editor { display: flex; flex-direction: column; gap: var(--a3); border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a3); }
  .kopf { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); }
  .kopf legend { font-weight: 600; padding: 0 var(--a1); }
  .kopf .eingabe { min-width: 12rem; }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  .eingabe textarea { width: 100%; box-sizing: border-box; }
  .schritte { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a4); }
  .schritte li { display: flex; flex-direction: column; gap: var(--a2); }
  .lesen { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; padding: var(--a2) var(--a3); border-inline-start: 3px solid var(--linie); }
  .dm { border: 1px dashed var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); }
  .dm-t { margin: 0 0 var(--a1); font-weight: 600; }
  .dm ul { margin: 0; padding-inline-start: var(--a4); display: flex; flex-direction: column; gap: var(--a1); }
  .dm .frage { color: var(--tinte-2); }
  mark { background: var(--akzent-hell); color: inherit; padding: 0 2px; border-radius: 2px; font-weight: 600; }
</style>
