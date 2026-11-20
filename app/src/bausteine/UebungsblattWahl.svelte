<script lang="ts">
  /**
   * Übungsblatt zusammenstellen (V3, Lehrende) im Teilen-Bereich eines eigenen Lernpfads (Hauptort laut Bauplan, keine eigene Seite):
   * einzelne Fragen aus den Einheiten des Pfads wählen, Reihenfolge mischen, Zeit als Hinweis, drucken mit und ohne Lösungen.
   * Jede Änderung gilt sofort (gespeichert im Pfad, `setzeBlatt`); der Link im Teilen-Bereich trägt das Blatt dann mit.
   * Ohne gewählte Fragen bleibt alles wie vorher: der Abschlusstest wird zufällig aus den Einheiten zusammengestellt.
   */
  import { untrack } from 'svelte';
  import { L, Lp, d, waehle } from '../lib/sitzung.svelte';
  import { einheitNach, themaDerFrage, type Einheit } from '../lernen/lernplan';
  import { ladeAuswahl, mische, type Frage } from '../lernen/fragen';
  import { MAX_FRAGEN, MAX_MINUTEN, type EigenerPfad } from '../lernen/eigenepfade';
  import { setzeBlatt } from '../lib/eigenepfade.svelte';
  import { KURZLINK_SERVER } from '../lib/pfadlink';
  import { druckeUebungsblatt } from '../lib/uebungsblatt';
  import { zufall } from '../lib/zufall';
  import { verzoegert } from '../lib/laedt.svelte';
  import { sage } from '../lib/ansage';
  import Rechnet from './Rechnet.svelte';
  import { MAX_BYTES, MAX_DATEIEN, uebersicht, type Uebersicht } from '../lernen/uebungsergebnis';
  import { proz } from '../i18n/profil';

  let { pfad }: { pfad: EigenerPfad } = $props();

  const einheiten = $derived(pfad.einheiten.map(i => einheitNach(i)).filter((e): e is Einheit => !!e && e.fragen.length > 0));
  const blatt = $derived(pfad.blatt);
  const gewaehlt = $derived(new Set(blatt?.fragen ?? []));

  // ---- Fragen erst laden, wenn der Bereich offen ist ----
  let offen = $state(untrack(() => !!pfad.blatt));
  let fragen = $state<Map<string, Frage>>(new Map());
  let geladenFuer = $state('');
  let laedt = $state(false);
  let fehler = $state(false);
  const anim = verzoegert(() => laedt);
  $effect(() => {
    if (!offen) return;
    const ids = einheiten.flatMap(e => e.fragen), k = ids.join(',');
    // `geladenFuer` nur lesen, nicht beobachten: sonst bräche das Setzen nach dem Laden den eigenen Lauf ab und „lädt“ bliebe stehen.
    if (k === untrack(() => geladenFuer)) return;
    let aus = false; laedt = true; fehler = false;
    const themen = [...new Set(ids.map(themaDerFrage).filter((t): t is string => !!t))];
    ladeAuswahl(themen, ids).then(m => { if (aus) return; fragen = new Map(m.FRAGEN.map(f => [f.id, f])); laedt = false; geladenFuer = k; })
      .catch(() => { if (!aus) { fehler = true; laedt = false; sage(L('Die Fragen ließen sich nicht laden. Bitte die Seite neu laden.', 'The questions could not be loaded. Please reload the page.'), 'dringend'); } });
    return () => { aus = true; };
  });

  /** Sichtbare Rückmeldung; vorgelesen über die zentrale Ansage (`sage`), keine eigene Live-Region. */
  let status = $state('');
  const melde = (t: string, kanal: 'hoeflich' | 'dringend' = 'hoeflich') => { status = t; sage(t, kanal); };
  const zahlText = (n: number) => Lp(n, `${n} Frage auf dem Übungsblatt`, `${n} Fragen auf dem Übungsblatt`, `${n} question on the practice sheet`, `${n} questions on the practice sheet`);

  /** Neue Auswahl speichern, in der Reihenfolge des Pfads (Einheit für Einheit, darin wie in der Fragedatei). */
  function speichere(ids: Set<string>, meldung?: string) {
    const geordnet = einheiten.flatMap(e => e.fragen).filter((i, k, a) => ids.has(i) && a.indexOf(i) === k);
    if (geordnet.length > MAX_FRAGEN) { melde(L(`Mehr als ${MAX_FRAGEN} Fragen passen nicht auf ein Übungsblatt.`, `No more than ${MAX_FRAGEN} questions fit on one practice sheet.`)); return; }
    setzeBlatt(pfad.id, geordnet.length ? { fragen: geordnet, ...(blatt?.mischen ? { mischen: true as const } : {}), ...(blatt?.minuten ? { minuten: blatt.minuten } : {}) } : undefined);
    melde(`${meldung ? meldung + ' ' : ''}${zahlText(geordnet.length)}.`);
  }
  function schalte(id: string) {
    const s = new Set(gewaehlt);
    if (s.has(id)) s.delete(id); else s.add(id);
    speichere(s, s.has(id) ? L('Frage gewählt.', 'Question chosen.') : L('Frage abgewählt.', 'Question removed.'));
  }
  const alleIn = (e: Einheit) => e.fragen.every(i => gewaehlt.has(i));
  function schalteEinheit(e: Einheit) {
    const s = new Set(gewaehlt), alle = alleIn(e);
    for (const i of e.fragen) { if (alle) s.delete(i); else s.add(i); }
    speichere(s, alle ? L(`Alle Fragen von „${waehle(e.fach)}“ abgewählt.`, `All questions of "${waehle(e.fach)}" removed.`) : L(`Alle Fragen von „${waehle(e.fach)}“ gewählt.`, `All questions of "${waehle(e.fach)}" chosen.`));
  }
  /** Schneller Anfang: aus jeder Einheit eine zufällige Frage; danach von Hand anpassen. */
  function vorschlagen() {
    const rnd = zufall((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);
    speichere(new Set(einheiten.slice(0, MAX_FRAGEN).map(e => mische(e.fragen, rnd)[0]!)), L('Aus jeder Einheit eine Frage gewählt.', 'One question chosen from each unit.'));
  }
  function leeren() { speichere(new Set(), L('Auswahl geleert. Der Abschlusstest wird wieder zufällig zusammengestellt.', 'Selection cleared. The final test is put together at random again.')); }

  function setzeMischen(an: boolean) {
    if (!blatt) return;
    setzeBlatt(pfad.id, { fragen: blatt.fragen, ...(an ? { mischen: true as const } : {}), ...(blatt.minuten ? { minuten: blatt.minuten } : {}) });
  }
  function setzeMinuten(roh: string) {
    if (!blatt) return;
    const n = Math.round(Number(roh));
    const min = roh.trim() && Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_MINUTEN) : undefined;
    setzeBlatt(pfad.id, { fragen: blatt.fragen, ...(blatt.mischen ? { mischen: true as const } : {}), ...(min ? { minuten: min } : {}) });
  }

  let druckt = $state(false);
  const druckAnim = verzoegert(() => druckt);
  async function drucke(art: 'blatt' | 'loesung') {
    if (!blatt || druckt) return;
    druckt = true;
    try { await druckeUebungsblatt(pfad.name, blatt, art); }
    catch { melde(L('Die Druckansicht ließ sich nicht öffnen.', 'The print view could not be opened.'), 'dringend'); }
    finally { druckt = false; }
  }

  // ---- Ergebnisse der Studierenden einlesen (V3 Teil 2): nur auf dieser Seite, nichts wird gespeichert oder gesendet ----
  let dateiFeld = $state<HTMLInputElement>();
  let texte = $state<string[]>([]);
  const ueb = $derived<Uebersicht | undefined>(blatt && texte.length ? uebersicht(blatt.fragen, texte) : undefined);
  async function liesDateien(ev: Event) {
    const el = ev.currentTarget as HTMLInputElement;
    const liste = [...(el.files ?? [])].slice(0, MAX_DATEIEN);
    el.value = '';
    if (!liste.length || !blatt) return;
    const neu = await Promise.all(liste.map(f => (f.size > MAX_BYTES ? Promise.resolve('') : f.text().catch(() => ''))));
    texte = [...texte, ...neu].slice(0, MAX_DATEIEN);
    const u = uebersicht(blatt.fragen, texte);
    const teile = [Lp(u.gezaehlt, `${u.gezaehlt} Ergebnis gezählt.`, `${u.gezaehlt} Ergebnisse gezählt.`, `${u.gezaehlt} result counted.`, `${u.gezaehlt} results counted.`)];
    if (u.unlesbar) teile.push(Lp(u.unlesbar, `${u.unlesbar} Datei ist keine Ergebnisdatei von Statable.`, `${u.unlesbar} Dateien sind keine Ergebnisdateien von Statable.`, `${u.unlesbar} file is not a Statable result file.`, `${u.unlesbar} files are not Statable result files.`));
    if (u.fremd) teile.push(Lp(u.fremd, `${u.fremd} Datei gehört zu einem anderen Übungsblatt.`, `${u.fremd} Dateien gehören zu einem anderen Übungsblatt.`, `${u.fremd} file belongs to another practice sheet.`, `${u.fremd} files belong to another practice sheet.`));
    if (u.doppelt) teile.push(Lp(u.doppelt, `${u.doppelt} Datei war doppelt und zählt einmal.`, `${u.doppelt} Dateien waren doppelt und zählen einmal.`, `${u.doppelt} file was a duplicate and counts once.`, `${u.doppelt} files were duplicates and count once.`));
    melde(teile.join(' '));
  }
  function vergiss() { texte = []; melde(L('Eingelesene Ergebnisse entfernt.', 'Results removed from the page.')); }
  const anteil = (k: number, n: number) => (n ? proz(String(Math.round((100 * k) / n))) : '–');

  /** Kurzer Stamm für die Liste: erste Zeile, höchstens 160 Zeichen. */
  const kurz = (f: Frage, max = 160) => { const t = waehle(f.stamm).split('\n')[0]!.trim(); return t.length > max ? t.slice(0, max - 3).trimEnd() + ' …' : t; };
</script>

<details class="auf ub" bind:open={offen}>
  <summary>{L('Übungsblatt zusammenstellen (Fragen wählen, drucken)', 'Put together a practice sheet (choose questions, print)')}{#if blatt}<span class="ln-klein"> · {zahlText(blatt.fragen.length)}</span>{/if}</summary>
  <div class="ub-innen">
    <p class="ln-klein">{d('Wähle einzelne Fragen aus den Einheiten dieses Pfads. Sie stehen dann statt des zufälligen Abschlusstests am Ende des Pfads, auch für alle, die den Link öffnen. Ohne Auswahl bleibt der Test zufällig.', 'Wählen Sie einzelne Fragen aus den Einheiten dieses Pfads. Sie stehen dann statt des zufälligen Abschlusstests am Ende des Pfads, auch für alle, die den Link öffnen. Ohne Auswahl bleibt der Test zufällig.', 'Choose single questions from the units of this path. They then replace the random final test at the end of the path, also for everyone who opens the link. Without a selection, the test stays random.')}</p>
    {#if !einheiten.length}
      <p>{L('Die Einheiten dieses Pfads haben keine Übungsfragen.', 'The units of this path have no practice questions.')}</p>
    {:else}
      <div class="pb-reihe">
        <button type="button" class="k" onclick={vorschlagen}>{L('Aus jeder Einheit eine Frage', 'One question from each unit')}</button>
        {#if blatt}<button type="button" class="k leise" onclick={leeren}>{L('Auswahl leeren', 'Clear selection')}</button>{/if}
      </div>
      {#if status}<p class="ln-klein">{status}</p>{/if}

      {#if blatt}
        <div class="ub-optionen">
          <label class="ub-haken"><input type="checkbox" checked={!!blatt.mischen} onchange={(ev) => setzeMischen(ev.currentTarget.checked)} /> {L('Reihenfolge der Fragen mischen (jede Person bekommt ihre eigene)', 'Shuffle the order of the questions (each person gets their own)')}</label>
          <div class="ub-zeit">
            <label for="ub-minuten">{L('Vorgesehene Zeit in Minuten (freiwillig, nur ein Hinweis)', 'Suggested time in minutes (optional, only a guide)')}</label>
            <input id="ub-minuten" type="number" inputmode="numeric" min="1" max={MAX_MINUTEN} step="1" value={blatt.minuten ?? ''} onchange={(ev) => setzeMinuten(ev.currentTarget.value)} />
          </div>
        </div>
        <div class="pb-reihe">
          <button type="button" class="k" disabled={druckt} onclick={() => drucke('blatt')}>{#if druckAnim.an}<Rechnet imKnopf text={L('Druckansicht wird vorbereitet …', 'Preparing the print view …')} />{:else}{L('Übungsblatt drucken', 'Print practice sheet')}{/if}</button>
          <button type="button" class="k" disabled={druckt} onclick={() => drucke('loesung')}>{L('Lösungen drucken', 'Print answers')}</button>
        </div>
        <div class="ub-ergebnisse">
          <h3>{L('Welche Fragen waren schwer? (Ergebnisse einlesen)', 'Which questions were hard? (read in results)')}</h3>
          <p class="ln-klein">{L('Studierende speichern am Ende des Übungsblatts eine Ergebnisdatei und schicken sie Ihnen. Hier mehrere davon auf einmal wählen: Sie sehen je Frage, wie viele sie beim ersten Versuch richtig hatten. Ohne Namen, ohne Rangliste; die Dateien bleiben in diesem Browser und verschwinden beim Schließen der Seite.', 'Students save a result file at the end of the practice sheet and send it to you. Choose several of them here at once: you see for each question how many got it right at the first try. Without names, without a ranking; the files stay in this browser and disappear when you close the page.')}</p>
          <div class="pb-reihe">
            <button type="button" class="k" onclick={() => dateiFeld?.click()}>{L('Ergebnisdateien wählen', 'Choose result files')}</button>
            <input bind:this={dateiFeld} type="file" accept=".json,application/json" multiple hidden onchange={liesDateien} />
            {#if texte.length}<button type="button" class="k leise" onclick={vergiss}>{L('Ergebnisse entfernen', 'Remove results')}</button>{/if}
          </div>
          {#if ueb && ueb.gezaehlt}
            <div class="tabelle-rahmen" role="region" aria-label={L('Ergebnisse je Frage', 'Results per question')} tabindex="0">
              <table class="ub-tab">
                <caption>{Lp(ueb.gezaehlt, `Richtig beim ersten Versuch, aus ${ueb.gezaehlt} Ergebnis`, `Richtig beim ersten Versuch, aus ${ueb.gezaehlt} Ergebnissen`, `Right at the first try, from ${ueb.gezaehlt} result`, `Right at the first try, from ${ueb.gezaehlt} results`)}</caption>
                <thead><tr><th scope="col">{L('Frage', 'Question')}</th><th scope="col" class="z">{L('richtig', 'right')}</th><th scope="col" class="z">{L('beantwortet', 'answered')}</th><th scope="col" class="z">{L('Anteil richtig', 'Share right')}</th></tr></thead>
                <tbody>
                  {#each ueb.fragen as q, i (q.id)}
                    {@const f = fragen.get(q.id)}
                    <tr><th scope="row">{i + 1}. {f ? kurz(f, 90) : q.id}</th><td class="z">{q.richtig}</td><td class="z">{q.beantwortet}</td><td class="z">{anteil(q.richtig, q.beantwortet)}</td></tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
        <p class="ln-klein">{L('Keine Noten und keine Punkte: Das Blatt ist zum Üben.', 'No grades and no points: the sheet is for practice.')}{#if KURZLINK_SERVER}{' '}{L('Mit Übungsblatt ist der Link länger, weil er die Fragen selbst trägt.', 'With a practice sheet the link is longer, because it carries the questions itself.')}{/if}</p>
      {/if}

      {#if laedt}
        {#if anim.an}<Rechnet text={L('Fragen werden geladen …', 'Loading questions …')} />{/if}
      {:else if fehler}
        <p class="ln-hinweis">{L('Die Fragen ließen sich nicht laden. Bitte die Seite neu laden.', 'The questions could not be loaded. Please reload the page.')}</p>
      {:else}
        <div class="ub-liste">
          {#each einheiten as e (e.id)}
            {@const k = e.fragen.filter(i => gewaehlt.has(i)).length}
            <fieldset class="ub-einheit">
              <legend>{waehle(e.fach)} <span class="ln-klein">({L(`${k} von ${e.fragen.length}`, `${k} of ${e.fragen.length}`)})</span></legend>
              <button type="button" class="k leise ub-alle" onclick={() => schalteEinheit(e)}>{alleIn(e) ? L('Keine', 'None') : L('Alle', 'All')}<span class="nur-vorleser"> {L(`Fragen von „${waehle(e.fach)}“`, `questions of "${waehle(e.fach)}"`)}</span></button>
              <ul>
                {#each e.fragen as id (id)}
                  {@const f = fragen.get(id)}
                  {#if f}<li><label><input type="checkbox" checked={gewaehlt.has(id)} onchange={() => schalte(id)} /> <span>{kurz(f)}{#if f.mehrfach}<span class="ln-klein"> ({L('mehrere möglich', 'several possible')})</span>{/if}</span></label></li>{/if}
                {/each}
              </ul>
            </fieldset>
          {/each}
        </div>
      {/if}

    {/if}
  </div>
</details>

<style>
  .ub { margin-top: var(--a2); }
  .ub-innen { display: grid; gap: var(--a2); padding-block-start: var(--a2); }
  .ub-innen p { margin: 0; }
  .ub-liste { display: grid; gap: var(--a2); max-block-size: 28rem; overflow-y: auto; padding-inline-end: var(--a1); }
  .ub-einheit { border: 1px solid var(--linie); border-radius: var(--r); padding: var(--a1) var(--a2) var(--a2); margin: 0; position: relative; }
  .ub-einheit legend { font-weight: 650; padding: 0 var(--a1); }
  .ub-einheit ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--a1); }
  .ub-einheit label { display: flex; gap: var(--a2); align-items: flex-start; cursor: pointer; }
  .ub-alle { margin-block-end: var(--a1); }
  .ub input[type="checkbox"] { inline-size: 1.25rem; block-size: 1.25rem; min-height: 0; margin-block-start: .15rem; flex: 0 0 auto; }
  .ub-optionen { display: grid; gap: var(--a2); }
  .ub-haken { display: flex; gap: var(--a2); align-items: flex-start; }
  .ub-zeit { display: grid; gap: var(--a1); max-inline-size: 22rem; }
  .ub .ub-zeit input { inline-size: 8rem; }
  .ub-ergebnisse { display: grid; gap: var(--a2); border-block-start: 1px solid var(--linie); padding-block-start: var(--a2); }
  .ub-ergebnisse h3 { margin: 0; font-size: 1rem; }
  .ub-tab { border-collapse: collapse; inline-size: 100%; }
  .ub-tab caption { text-align: start; font-weight: 650; padding-block-end: var(--a1); }
  .ub-tab th, .ub-tab td { border-block-end: 1px solid var(--linie); padding: var(--a1); text-align: start; vertical-align: top; }
  .ub-tab th[scope="row"] { font-weight: 400; }
  .ub-tab .z { text-align: end; white-space: nowrap; }
</style>
