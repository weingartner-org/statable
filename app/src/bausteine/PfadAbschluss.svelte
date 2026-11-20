<script lang="ts">
  /**
   * Abschlusstest eines Lernpfads (`#lernen/pruefung/<pfad>`): Fragen mit Tabellen wie in der Praxis, am Ende jeder Frage der Sprung zur Einheit zum Üben.
   * Hat der Pfad eigene Abschlussfragen (`Pfad.abschluss`), sind es die; sonst stellt die Seite aus den Einheitsfragen des Pfads einen Test zusammen (höchstens eine Frage je Einheit, bis 15).
   * Welche Einheiten noch zu üben sind, steht in der Liste unter dem Test; sie wächst mit jeder Frage, die nicht gelang.
   */
  import { untrack } from 'svelte';
  import { L, Lp, d, waehle } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { alsText, baueErgebnis, dateinameErgebnis } from '../lernen/uebungsergebnis';
  import { lmsModus, meldeAbschluss } from '../lib/lms';
  import VerstehenUeben from './VerstehenUeben.svelte';
  import Zurueck from './Zurueck.svelte';
  import { stelleZusammen } from '../lernen/abschlusstest';
  import { mische } from '../lernen/fragen';
  import { zufall } from '../lib/zufall';
  import { EINHEITEN, einheitNach, pfadNach, themaDerFrage, type Pfad } from '../lernen/lernplan';

  let { pfad, seite = $bindable() }: { pfad: Pfad; seite?: { id: string; titel: string } } = $props();

  /** Der zusammengestellte Test bleibt für die Dauer der Sitzung derselbe, auch wenn man zwischendurch eine Einheit übt. */
  const MERKER = new Map<string, string[]>();

  const einheitDer = (frageId: string) => EINHEITEN.find(e => e.fragen.includes(frageId));
  const zusammenstellen = (p: Pfad): string[] => stelleZusammen(p, zufall((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0));
  /** Übungsblatt (V3): die gewählten Fragen, mit „mischen“ einmal je Sitzung gemischt (jede Person bekommt ihre eigene Reihenfolge). */
  const ids = $derived.by(() => {
    if (pfad.abschluss?.length && pfad.uebung?.mischen) {
      const schluessel = `${pfad.id}:${pfad.abschluss.join(',')}`;
      let m = MERKER.get(schluessel);
      if (!m) { m = mische(pfad.abschluss, zufall((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0)); MERKER.set(schluessel, m); }
      return m;
    }
    if (pfad.abschluss?.length) return pfad.abschluss;
    let m = MERKER.get(pfad.id);
    if (!m) { m = zusammenstellen(pfad); MERKER.set(pfad.id, m); }
    return m;
  });
  const eigene = $derived(!!pfad.abschluss?.length);
  const blatt = $derived(pfad.uebung);
  const testName = $derived(blatt ? L('Übungsblatt', 'Practice sheet') : L('Abschlusstest', 'Final test'));
  const blattText = $derived.by(() => {
    if (!blatt) return '';
    const n = ids.length, min = blatt.minuten;
    return [
      Lp(n, `${n} Frage, ausgewählt für diesen Pfad.`, `${n} Fragen, ausgewählt für diesen Pfad.`, `${n} question, chosen for this path.`, `${n} questions, chosen for this path.`),
      min ? L(`Vorgesehen sind etwa ${min} Minuten; das ist nur ein Hinweis, es läuft keine Uhr.`, `About ${min} minutes are planned; this is only a guide, no clock is running.`) : '',
      L('Was nicht gelingt, erscheint unten mit dem Sprung zur Übung.', 'What does not work shows up below with the jump to the exercise.')
    ].filter(Boolean).join(' ');
  });
  const auswahl = $derived(ids.length
    ? { id: `abschluss-${pfad.id}-${ids.length}-${ids[0]}`, titel: `${testName}: ${waehle(pfad.name)}`, themen: [...new Set(ids.map(i => themaDerFrage(i)).filter((t): t is string => !!t))], ids }
    : undefined);

  /** Der nächste Teil, wenn der Pfad in Teile geteilt ist (`Pfad.weiter`). */
  const naechsterTeil = $derived(pfad.weiter ? pfadNach(pfad.weiter) : undefined);

  /** Einheit → Zahl der Fragen, die nicht gelangen. */
  let zuUeben = $state<Record<string, number>>({});
  const liste = $derived(Object.entries(zuUeben).map(([id, n]) => ({ e: einheitNach(id), n })).filter((x): x is { e: NonNullable<typeof x.e>; n: number } => !!x.e));
  /** Übungsblatt (V3 Teil 2): erster Versuch je Frage, für die Ergebnisdatei. Nur auf der Seite, nie gespeichert oder gesendet. */
  let erste = $state<Record<string, boolean>>({});
  let personName = $state('');
  let ergebnisStatus = $state('');
  const beantwortet = $derived(ids.filter(i => Object.hasOwn(erste, i)).length);
  const richtig = $derived(ids.filter(i => erste[i] === true).length);
  const standText = $derived(Lp(ids.length,
    `${beantwortet} von ${ids.length} Frage beantwortet, davon ${richtig} beim ersten Versuch richtig.`,
    `${beantwortet} von ${ids.length} Fragen beantwortet, davon ${richtig} beim ersten Versuch richtig.`,
    `${beantwortet} of ${ids.length} question answered, ${richtig} of them right at the first try.`,
    `${beantwortet} of ${ids.length} questions answered, ${richtig} of them right at the first try.`));
  async function speichereErgebnis() {
    if (!blatt || !pfad.abschluss) return;
    const e = baueErgebnis(waehle(pfad.name), pfad.abschluss, erste, new Date(), personName);
    try {
      const { herunterladen } = await import('../lib/export');
      herunterladen(new TextEncoder().encode(alsText(e)), dateinameErgebnis(e, L('Übungsergebnis', 'Practice result')), 'application/json');
      ergebnisStatus = d('Die Datei ist gespeichert (meist im Ordner „Downloads“). Schick sie selbst an die Lehrperson, zum Beispiel per Mail.', 'Die Datei ist gespeichert (meist im Ordner „Downloads“). Schicken Sie sie selbst an die Lehrperson, zum Beispiel per Mail.', 'The file is saved (usually in the "Downloads" folder). Send it yourself to your teacher, for example by email.');
      sage(ergebnisStatus);
    } catch {
      ergebnisStatus = L('Die Datei ließ sich nicht speichern.', 'The file could not be saved.');
      sage(ergebnisStatus, 'dringend');
    }
  }
  /** V4: aus einem SCORM-Paket geöffnet? Dann meldet Statable dem Paket einmal „abgeschlossen“, sobald alle Fragen beantwortet sind (richtig oder nicht). */
  const lms = lmsModus();
  /** undefined: noch nicht gemeldet; true/false: geschickt oder nicht erreichbar. */
  let lmsErgebnis = $state<boolean | undefined>(undefined);
  $effect(() => {
    if (!lms || lmsErgebnis !== undefined || !ids.length || beantwortet < ids.length) return;
    const ok = meldeAbschluss(beantwortet, ids.length);
    lmsErgebnis = ok;
    sage(ok ? L('Alle Fragen beantwortet. Die Lernplattform ist benachrichtigt; dieses Fenster kann zu.', 'All questions answered. The learning platform has been notified; you can close this window.') : d('Alle Fragen beantwortet. Die Lernplattform war nicht erreichbar; öffne Statable noch einmal über die Lernplattform.', 'Alle Fragen beantwortet. Die Lernplattform war nicht erreichbar; öffnen Sie Statable noch einmal über die Lernplattform.', 'All questions answered. The learning platform could not be reached; open Statable again from the learning platform.'));
  });
  function beiAntwort(f: { id: string; zurueck?: string }, ok: boolean) {
    if (!Object.hasOwn(erste, f.id)) untrack(() => { erste = { ...erste, [f.id]: ok }; });
    if (ok) return;
    const id = f.zurueck ?? einheitDer(f.id)?.id;
    if (!id) return;
    untrack(() => { zuUeben = { ...zuUeben, [id]: (zuUeben[id] ?? 0) + 1 }; });
  }
</script>

<div class="blatt-kopf"><h1 id="ln-t">{testName}: {waehle(pfad.name)}</h1><Zurueck ziel="lernen/pfad/{pfad.id}" /></div>

{#if auswahl}
  <p class="ln-klein">{blatt
    ? blattText
    : eigene
    ? L('Tabellen wie aus einer echten Auswertung, dazu Fragen zum Lesen und Deuten. Bei jeder Frage hilft die Seitenleiste; was nicht gelingt, erscheint unten mit dem Sprung zur Übung.', 'Tables as from a real analysis, with questions on reading and interpreting them. The side panel helps with every question; what does not work shows up below with the jump to the exercise.')
    : L(`Eine Frage aus ${ids.length} Einheiten dieses Pfads, bunt gemischt. Was nicht gelingt, erscheint unten mit dem Sprung zur Übung.`, `One question from each of ${ids.length} units of this path, mixed. What does not work shows up below with the jump to the exercise.`)}</p>
  {#key auswahl.id}<VerstehenUeben {auswahl} {beiAntwort} bind:seite />{/key}
{:else}
  <p>{L('Zu diesem Pfad gibt es noch keine Fragen.', 'There are no questions for this path yet.')}</p>
{/if}

{#if lms && auswahl}
  <p class="ln-klein pa-lms">{lmsErgebnis === true ? L('Fertig: Die Lernplattform ist benachrichtigt. Dieses Fenster kann zu.', 'Done: the learning platform has been notified. You can close this window.') : lmsErgebnis === false ? d('Die Lernplattform war nicht erreichbar. Öffne Statable noch einmal über die Lernplattform.', 'Die Lernplattform war nicht erreichbar. Öffnen Sie Statable noch einmal über die Lernplattform.', 'The learning platform could not be reached. Open Statable again from the learning platform.') : L(`Für die Lernplattform: Sobald alle ${ids.length} Fragen beantwortet sind, gilt der Pfad dort als abgeschlossen. Es gibt keine Punkte.`, `For the learning platform: as soon as all ${ids.length} questions are answered, the path counts as completed there. There are no points.`)}</p>
{/if}

{#if blatt && auswahl}
  <section class="pa-ergebnis" aria-labelledby="pa-erg-t">
    <h2 id="pa-erg-t">{L('Ergebnis für die Lehrperson (als Datei)', 'Result for your teacher (as a file)')}</h2>
    <p class="ln-klein">{standText} {d('Keine Note: Die Datei zeigt nur, welche Fragen beim ersten Versuch gelangen. Sie bleibt auf diesem Gerät, bis du sie selbst schickst.', 'Keine Note: Die Datei zeigt nur, welche Fragen beim ersten Versuch gelangen. Sie bleibt auf diesem Gerät, bis Sie sie selbst schicken.', 'No grade: the file only shows which questions worked at the first try. It stays on this device until you send it yourself.')}</p>
    <div class="pa-erg-reihe">
      <div class="pa-erg-name">
        <label for="pa-erg-name">{L('Name (freiwillig)', 'Name (optional)')}</label>
        <input id="pa-erg-name" type="text" autocomplete="name" maxlength="80" bind:value={personName} />
      </div>
      <button type="button" class="k" onclick={speichereErgebnis}>{L('Ergebnis als Datei speichern', 'Save result as a file')}</button>
    </div>
    {#if ergebnisStatus}<p class="ln-klein pa-erg-status">{ergebnisStatus}</p>{/if}
  </section>
{/if}

<section class="pa-ueben" aria-labelledby="pa-ueben-t">
  <h2 id="pa-ueben-t">{L('Noch einmal üben', 'Practise again')}</h2>
  {#if liste.length}
    <ul>
      {#each liste as x (x.e.id)}
        <li><a class="k" href="#lernen/{x.e.id}">{waehle(x.e.alltag)} ({waehle(x.e.fach)})</a> <span class="ln-klein">{L(x.n === 1 ? '1 Frage nicht gelungen' : `${x.n} Fragen nicht gelungen`, x.n === 1 ? '1 question missed' : `${x.n} questions missed`)}</span></li>
      {/each}
    </ul>
    <p><button type="button" class="k leise" onclick={() => (zuUeben = {})}>{L('Liste leeren', 'Clear the list')}</button></p>
  {:else}
    <p class="ln-klein">{L('Noch keine Einheit zu üben. Sobald eine Frage nicht gelingt, steht hier die Einheit dazu.', 'No unit to practise yet. As soon as a question does not work, its unit appears here.')}</p>
  {/if}
</section>

{#if naechsterTeil}
  <p class="pa-weiter"><a class="k haupt" href="#lernen/pfad/{naechsterTeil.id}">{L('Weiter mit ', 'Continue with ')}{waehle(naechsterTeil.name)}</a></p>
{/if}

<style>
  .pa-weiter { margin-top: var(--a4, 1.5rem); }
  .pa-ueben { margin-top: var(--a4, 1.5rem); }
  .pa-ergebnis { margin-top: var(--a4, 1.5rem); }
  .pa-ergebnis p { margin: 0 0 var(--a2, .5rem); }
  .pa-erg-reihe { display: flex; flex-wrap: wrap; gap: var(--a2, .5rem); align-items: end; }
  .pa-erg-name { display: grid; gap: var(--a1, .25rem); }
  .pa-erg-name input { inline-size: min(18rem, 100%); min-block-size: 2.5rem; box-sizing: border-box; }
  .pa-erg-status { margin-block-start: var(--a2, .5rem); }
  .pa-ueben ul { display: grid; gap: var(--a2, .5rem); padding: 0; list-style: none; margin: 0 0 var(--a2, .5rem); }
</style>
