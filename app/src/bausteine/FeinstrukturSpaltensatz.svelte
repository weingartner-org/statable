<script lang="ts">
  /**
   * Stufe A4: Spaltensatz wählen, „Folgetext verdecken“ schalten, eigene Spaltensätze anlegen und bearbeiten. Zwei Arten der Nutzung:
   *  - mit `sa` (Phase Einteilen): Wahl und Schalter ändern die Analyse sofort (`aendereSequenzanalyse`, `setzeSpaltensatz`, `setzeFolgetextVerdeckt`).
   *  - ohne `sa` (Ausschnitt wählen, vor dem Anlegen): `wahl` und `verdecken` sind gebunden ($bindable), die Seite legt damit an.
   * Eigene Sätze stehen im Projekt (`eigeneSpaltensaetze`, `aendereSpaltensaetze` aus lib/interviews.svelte).
   * Statable deutet nichts und schlägt keine Spaltennamen vor. Ansagen nur über lib/ansage, kein modales Fenster.
   */
  import { tick } from 'svelte';
  import { L, s } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendereSequenzanalyse, aendereSpaltensaetze, eigeneSpaltensaetze, sequenzanalysen } from '../lib/interviews.svelte';
  import type { Sequenzanalyse } from '../lib/qualprojekt';
  import {
    EINGEBAUT, HOECHSTENS_SPALTEN, SPALTENSAETZE, aendereEigeneSpalte, eigeneSpalte, eintraegeAn, leitfragenText, neuerEigenerSatz,
    pruefeEigenenSatz, spaltenText, type Spalte, type Spaltensatz,
  } from '../lib/feinstruktur-spalten';
  import { folgetextVerdeckt, setzeFolgetextVerdeckt, setzeSpaltensatz } from '../lib/feinstruktur-analyse';

  let { sa, wahl = $bindable('feinstruktur'), verdecken = $bindable(true) }: {
    /** gesetzt = Analyse direkt ändern; fehlt = nur `wahl`/`verdecken` setzen */
    sa?: Sequenzanalyse;
    /** Kennung des gewählten Spaltensatzes (nur ohne `sa`) */
    wahl?: string;
    /** Folgetext verdecken = nicht vorauslesen (nur ohne `sa`) */
    verdecken?: boolean;
  } = $props();

  const pid = $props.id();
  const uid = $derived(`fe-ss-${pid}${sa ? '-' + sa.id : ''}`);
  const sprache = (): 'de' | 'en' => (s.einst.sprache === 'de' ? 'de' : 'en');
  const sp = () => s.einst.sprache;
  const alle = $derived<Spaltensatz[]>([...SPALTENSAETZE, ...eigeneSpaltensaetze()]);
  const aktuell = $derived(sa ? (sa.spaltensatz ?? 'feinstruktur') : wahl);
  const verdeckt = $derived(sa ? folgetextVerdeckt(sa) : verdecken);

  const satzName = (x: Spaltensatz): string => spaltenText(x.name, sp()) + (x.eigen && !EINGEBAUT.has(x.kennung) ? L(' (eigener Satz)', ' (own set)') : '');
  const spaltenListe = (x: Spaltensatz): string => L('Spalten: ', 'Columns: ') + x.spalten.map(c => spaltenText(c.name, sp())).join(', ');

  /* ---------------- Auswahl des Spaltensatzes ---------------- */
  let wechselHinweis = $state('');
  function waehle(e: Event & { currentTarget: HTMLInputElement }, x: Spaltensatz) {
    wechselHinweis = '';
    if (!sa) { wahl = x.kennung; return; }
    const r = setzeSpaltensatz(sa, x, eigeneSpaltensaetze(), Date.now(), sp());
    if (r.art === 'nicht-moeglich') {
      const t = L(`Wechsel nicht möglich: In den Spalten ${r.spalten.join(', ')} stehen Einträge, die der neue Satz nicht zeigt. Es wird nichts gelöscht.`,
        `Change not possible: the columns ${r.spalten.join(', ')} hold entries that the new set does not show. Nothing is deleted.`);
      wechselHinweis = t; sage(t, 'dringend');
      e.currentTarget.checked = false;
      const alt = document.getElementById(`${uid}-r-${aktuell}`) as HTMLInputElement | null; if (alt) alt.checked = true;
      return;
    }
    aendereSequenzanalyse(sa.id, () => r.analyse);
    sage(L(`Spaltensatz gewechselt: ${spaltenText(x.name, sp())}. ${spaltenListe(x)}`, `Column set changed: ${spaltenText(x.name, sp())}. ${spaltenListe(x)}`));
  }

  function schalteFolgetext(an: boolean) {
    if (sa) aendereSequenzanalyse(sa.id, x => setzeFolgetextVerdeckt(x, an, Date.now())); else verdecken = an;
    sage(an
      ? L('Folgetext verdecken an. Beim Deuten sehen Sie nur den Text bis zur aktuellen Sinneinheit.', 'Hiding the following text is on. While interpreting you see only the text up to the current unit.')
      : L('Folgetext verdecken aus. Beim Deuten ist der ganze Ausschnitt sichtbar.', 'Hiding the following text is off. While interpreting the whole excerpt is visible.'));
  }

  /* ---------------- Eigenen Spaltensatz anlegen oder bearbeiten ---------------- */
  type Zeile = { i: number; k?: string; name: string; leit: string; les: boolean };
  let zaehler = 0;
  const neueZeile = (): Zeile => ({ i: ++zaehler, name: '', leit: '', les: false });
  let bearbeite = $state('neu');
  let ename = $state('');
  let everfahren = $state('');
  let zeilen = $state<Zeile[]>([neueZeile()]);
  let meldung = $state('');
  let probleme = $state<string[]>([]);
  let fragLoeschen = $state(false);
  let nurNein: HTMLElement | undefined = $state();

  const gespeichert = (): Spaltensatz | undefined => (bearbeite === 'neu' ? undefined : eigeneSpaltensaetze().find(x => x.kennung === bearbeite));
  /** Analysen, die diesen Satz nutzen */
  const nutzer = (k: string): Sequenzanalyse[] => sequenzanalysen().filter(a => (a.spaltensatz ?? 'feinstruktur') === k);
  /** Name der ersten Analyse mit Einträgen an dieser Spalte (leer = keine) */
  function analyseMitEintraegen(satzKennung: string, spalte: Spalte): string | undefined {
    return nutzer(satzKennung).find(a => a.einheiten.some(e => eintraegeAn(e, spalte).length > 0))?.name;
  }
  const lesartGesperrt = (z: Zeile): boolean => {
    const g = gespeichert(); const alt = g?.spalten.find(c => c.kennung === z.k);
    return !!g && !!alt && analyseMitEintraegen(g.kennung, alt) !== undefined;
  };

  function lade(kennung: string) {
    bearbeite = kennung; meldung = ''; probleme = []; fragLoeschen = false;
    const g = eigeneSpaltensaetze().find(x => x.kennung === kennung);
    if (!g) { ename = ''; everfahren = ''; zeilen = [neueZeile()]; return; }
    ename = spaltenText(g.name, sp()); everfahren = spaltenText(g.verfahren, sp());
    zeilen = g.spalten.map(c => ({ i: ++zaehler, k: c.kennung, name: spaltenText(c.name, sp()), leit: leitfragenText(c, sp()), les: c.feld === 'lesarten' }));
  }

  const fokusAuf = (id: string) => void tick().then(() => document.getElementById(id)?.focus());
  const nameId = (z: Zeile) => `${uid}-sn-${z.i}`;

  function hinzu() {
    meldung = '';
    if (zeilen.length >= HOECHSTENS_SPALTEN) {
      const t = L(`Höchstens ${HOECHSTENS_SPALTEN} Spalten.`, `At most ${HOECHSTENS_SPALTEN} columns.`); meldung = t; sage(t, 'dringend'); return;
    }
    const z = neueZeile(); zeilen = [...zeilen, z];
    sage(L(`Spalte ${zeilen.length} hinzugefügt.`, `Column ${zeilen.length} added.`)); fokusAuf(nameId(z));
  }
  function verschiebe(idx: number, richtung: -1 | 1) {
    const j = idx + richtung; if (j < 0 || j >= zeilen.length) return;
    const l = [...zeilen]; [l[idx], l[j]] = [l[j]!, l[idx]!]; zeilen = l; meldung = '';
    sage(L(`Spalte ${idx + 1} steht jetzt an Stelle ${j + 1} von ${zeilen.length}.`, `Column ${idx + 1} is now at position ${j + 1} of ${zeilen.length}.`));
    fokusAuf(nameId(l[j]!));
  }
  function entferne(idx: number) {
    const z = zeilen[idx]!; const g = gespeichert();
    if (g && z.k) {
      const alt = g.spalten.find(c => c.kennung === z.k);
      const a = alt ? analyseMitEintraegen(g.kennung, alt) : undefined;
      if (a !== undefined) {
        const t = L(`Spalte ${z.name || idx + 1} hat Einträge in der Analyse „${a}“. Sie bleibt.`, `Column ${z.name || idx + 1} has entries in the analysis “${a}”. It stays.`);
        meldung = t; sage(t, 'dringend'); return;
      }
    }
    meldung = '';
    zeilen = zeilen.filter((_, n) => n !== idx);
    sage(L(`Spalte ${idx + 1} entfernt. Es sind ${zeilen.length} Spalten.`, `Column ${idx + 1} removed. ${zeilen.length} columns left.`));
    const nachbar = zeilen[Math.min(idx, zeilen.length - 1)];
    fokusAuf(nachbar ? nameId(nachbar) : `${uid}-hinzu`);
  }

  function baueSatz(): Spaltensatz {
    const g = gespeichert();
    const spalten: Spalte[] = zeilen.map(z => {
      const alt = g?.spalten.find(c => c.kennung === z.k);
      if (!alt) return eigeneSpalte(z.name, z.leit, z.les);
      const r = aendereEigeneSpalte(alt, { name: z.name.trim(), leitfragen: z.leit });
      if (!lesartGesperrt(z) && z.les !== (alt.feld === 'lesarten')) {
        if (z.les) { r.feld = 'lesarten'; r.mitPruefung = true; } else { r.feld = 'weitere'; delete r.mitPruefung; }
      }
      return r;
    });
    const gl = (t: string) => ({ de: t, en: t });
    if (g) return { ...g, name: gl(ename.trim()), verfahren: gl(everfahren.trim() || ename.trim()), spalten };
    const erste = spalten[0] ?? eigeneSpalte('');
    const neu = neuerEigenerSatz(ename, everfahren, erste);
    return { ...neu, spalten: spalten.length ? spalten : [] };
  }
  function speichere() {
    meldung = '';
    const satz = baueSatz();
    const p = pruefeEigenenSatz(satz, sprache());
    probleme = p;
    if (p.length) {
      sage(L('Der Spaltensatz ist noch nicht in Ordnung. ', 'The column set is not valid yet. ') + p.join(' '), 'dringend');
      if (!ename.trim()) fokusAuf(`${uid}-name`);
      else { const z = zeilen.find(x => !x.name.trim()); if (z) fokusAuf(nameId(z)); }
      return;
    }
    aendereSpaltensaetze(l => (l.some(x => x.kennung === satz.kennung) ? l.map(x => (x.kennung === satz.kennung ? satz : x)) : [...l, satz]));
    bearbeite = satz.kennung;
    zeilen = satz.spalten.map(c => ({ i: ++zaehler, k: c.kennung, name: spaltenText(c.name, sp()), leit: leitfragenText(c, sp()), les: c.feld === 'lesarten' }));
    if (!sa) wahl = satz.kennung;
    sage(L(`Spaltensatz „${ename.trim()}“ gespeichert. ${spaltenListe(satz)}`, `Column set “${ename.trim()}” saved. ${spaltenListe(satz)}`));
  }

  function frageLoeschenAn() {
    const g = gespeichert(); if (!g) return;
    const n = nutzer(g.kennung);
    if (n.length) {
      const t = L(`Der Spaltensatz wird noch benutzt, in: ${n.map(a => `„${a.name}“`).join(', ')}. Er bleibt.`, `The column set is still in use, in: ${n.map(a => `“${a.name}”`).join(', ')}. It stays.`);
      meldung = t; sage(t, 'dringend'); return;
    }
    fragLoeschen = true; meldung = '';
    sage(L('Spaltensatz wirklich löschen? Das lässt sich nicht rückgängig machen.', 'Really delete the column set? This cannot be undone.'));
    void tick().then(() => nurNein?.focus());
  }
  function loesche() {
    const g = gespeichert(); if (!g) return;
    aendereSpaltensaetze(l => l.filter(x => x.kennung !== g.kennung));
    if (!sa && wahl === g.kennung) wahl = 'feinstruktur';
    sage(L(`Spaltensatz „${spaltenText(g.name, sp())}“ gelöscht.`, `Column set “${spaltenText(g.name, sp())}” deleted.`));
    lade('neu'); fokusAuf(`${uid}-wahl`);
  }
  function nichtLoeschen() {
    fragLoeschen = false; sage(L('Nicht gelöscht.', 'Not deleted.')); fokusAuf(`${uid}-loeschen`);
  }
</script>

<div class="fe-satz">
  <fieldset class="satz">
    <legend>{L('Spalten der Deutung (Spaltensatz)', 'Columns of the interpretation (column set)')}</legend>
    <p class="leise">{L('Statable gibt für andere Sequenzverfahren keine Regeln vor; die Spalten sind nur Ordnung für Ihre eigenen Einträge.', 'Statable does not set rules for other sequential methods; the columns only give order to your own entries.')}</p>
    {#each alle as x (x.kennung)}
      <div class="option">
        <label><input type="radio" id="{uid}-r-{x.kennung}" name="{uid}-satz" value={x.kennung} checked={aktuell === x.kennung}
          aria-describedby="{uid}-b-{x.kennung}" onchange={(e) => waehle(e, x)} /> {satzName(x)}</label>
        <p class="leise klein-text" id="{uid}-b-{x.kennung}">{spaltenListe(x)}</p>
      </div>
    {/each}
    {#if wechselHinweis}<p class="warn" id="{uid}-wechsel">{wechselHinweis}</p>{/if}
  </fieldset>

  <div class="folge">
    <label><input type="checkbox" id="{uid}-verdecken" checked={verdeckt} aria-describedby="{uid}-vb {uid}-vp" onchange={(e) => schalteFolgetext(e.currentTarget.checked)} />
      {L('Folgetext verdecken (nicht vorauslesen)', 'Hide the following text (do not read ahead)')}</label>
    <p class="leise klein-text" id="{uid}-vb">{verdeckt
      ? L('Beim Deuten sehen Sie nur den Text bis zur aktuellen Sinneinheit; der Rest ist nicht auf der Seite.', 'While interpreting you see only the text up to the current unit; the rest is not on the page.')
      : L('Beim Deuten ist der ganze Ausschnitt sichtbar.', 'While interpreting the whole excerpt is visible.')}</p>
    <p class="leise klein-text" id="{uid}-vp">{L('Passt zur Feinstrukturanalyse und zu anderen Sequenzverfahren (Objektive Hermeneutik, Dokumentarische Methode, Gesprächsanalyse).', 'Fits fine structure analysis and other sequential methods (objective hermeneutics, documentary method, conversation analysis).')}</p>
  </div>

  <details class="editor">
    <summary>{L('Eigenen Spaltensatz anlegen oder bearbeiten', 'Create or edit your own column set')}</summary>
    <div class="innen">
      <label class="feldname" for="{uid}-wahl">{L('Welcher Spaltensatz?', 'Which column set?')}</label>
      <select id="{uid}-wahl" value={bearbeite} onchange={(e) => lade(e.currentTarget.value)}>
        <option value="neu">{L('Neuer Spaltensatz', 'New column set')}</option>
        {#each eigeneSpaltensaetze() as x (x.kennung)}<option value={x.kennung}>{spaltenText(x.name, sp())}</option>{/each}
      </select>

      <label class="feldname" for="{uid}-name">{L('Name des Spaltensatzes', 'Name of the column set')}</label>
      <input type="text" id="{uid}-name" bind:value={ename} autocomplete="off" />
      <label class="feldname" for="{uid}-verf">{L('Name des Verfahrens im Bericht (zum Beispiel Objektive Hermeneutik)', 'Name of the method in the report (for example objective hermeneutics)')}</label>
      <input type="text" id="{uid}-verf" bind:value={everfahren} autocomplete="off" />

      {#each zeilen as z, idx (z.i)}
        <!-- aria-label zusätzlich zur Legende: Safari/VoiceOver behält nach dem Verschieben sonst den alten Gruppennamen (Mac-Befund M2, 14.11.); eine geänderte Eigenschaft zwingt die Neuberechnung. -->
        <fieldset class="spalte" aria-label={L(`Spalte ${idx + 1}`, `Column ${idx + 1}`)}>
          <legend>{L(`Spalte ${idx + 1}`, `Column ${idx + 1}`)}</legend>
          <label class="feldname" for={nameId(z)}>{L('Name der Spalte', 'Name of the column')}</label>
          <input type="text" id={nameId(z)} bind:value={z.name} autocomplete="off" />
          <label class="feldname" for="{uid}-sl-{z.i}">{L('Leitfragen (eine je Zeile, freiwillig)', 'Guiding questions (one per line, optional)')}</label>
          <textarea id="{uid}-sl-{z.i}" rows="3" bind:value={z.leit}></textarea>
          <label><input type="checkbox" bind:checked={z.les} disabled={lesartGesperrt(z)} aria-describedby={lesartGesperrt(z) ? `${uid}-lg-${z.i}` : undefined} />
            {L('Einträge sind Lesarten mit Prüfkriterium', 'Entries are readings with a test criterion')}</label>
          {#if lesartGesperrt(z)}<p class="leise klein-text" id="{uid}-lg-{z.i}">{L('Nicht änderbar: In dieser Spalte stehen schon Einträge.', 'Cannot be changed: this column already has entries.')}</p>{/if}
          <div class="zeile">
            {#if idx > 0}<button type="button" class="k klein" onclick={() => verschiebe(idx, -1)}>{L(`Spalte ${idx + 1} nach oben`, `Move column ${idx + 1} up`)}</button>{/if}
            {#if idx < zeilen.length - 1}<button type="button" class="k klein" onclick={() => verschiebe(idx, 1)}>{L(`Spalte ${idx + 1} nach unten`, `Move column ${idx + 1} down`)}</button>{/if}
            <button type="button" class="k klein leise" onclick={() => entferne(idx)}>{L(`Spalte ${idx + 1} entfernen`, `Remove column ${idx + 1}`)}</button>
          </div>
        </fieldset>
      {/each}

      <div class="zeile">
        <button type="button" class="k" id="{uid}-hinzu" onclick={hinzu}>{L('Spalte hinzufügen', 'Add column')}</button>
        <button type="button" class="k haupt" onclick={speichere}>{L('Spaltensatz speichern', 'Save column set')}</button>
        {#if gespeichert() && !fragLoeschen}<button type="button" class="k leise" id="{uid}-loeschen" onclick={frageLoeschenAn}>{L('Spaltensatz löschen', 'Delete column set')}</button>{/if}
      </div>
      {#if zeilen.length >= HOECHSTENS_SPALTEN}<p class="leise klein-text">{L(`Mehr als ${HOECHSTENS_SPALTEN} Spalten sind nicht möglich.`, `More than ${HOECHSTENS_SPALTEN} columns are not possible.`)}</p>{/if}
      {#if meldung}<p class="warn">{meldung}</p>{/if}
      {#if probleme.length}<ul class="probleme">{#each probleme as p, n (n)}<li>{p}</li>{/each}</ul>{/if}
      {#if fragLoeschen}
        <div class="rueck" role="group" aria-label={L('Rückfrage zum Löschen', 'Question about deleting')}>
          <p id="{uid}-lf">{L('Spaltensatz wirklich löschen? Das lässt sich nicht rückgängig machen.', 'Really delete the column set? This cannot be undone.')}</p>
          <div class="zeile">
            <button type="button" class="k" aria-describedby="{uid}-lf" onclick={loesche}>{L('Löschen', 'Delete')}</button>
            <button type="button" class="k" aria-describedby="{uid}-lf" bind:this={nurNein} onclick={nichtLoeschen}>{L('Nicht löschen', 'Do not delete')}</button>
          </div>
        </div>
      {/if}
      <p class="leise klein-text">{L('Der Spaltensatz wird im Projekt gespeichert. Er geht in der Projektdatei und in der Gruppen-Datei mit.', 'The column set is saved in the project. It goes along in the project file and in the group file.')}</p>
    </div>
  </details>
</div>

<style>
  .fe-satz { display: flex; flex-direction: column; gap: .75rem; }
  fieldset { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: .5rem .75rem; min-width: 0; margin: 0; }
  .leise { color: var(--tinte-2); }
  p { margin: .25rem 0; }
  .klein-text { font-size: .9rem; margin: 0 0 .25rem 1.6rem; }
  .option { margin: .25rem 0; }
  .feldname { display: block; font-weight: 600; margin-top: .5rem; }
  input[type='text'], textarea, select { width: 100%; max-width: 100%; box-sizing: border-box; font: inherit; padding: .4rem; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); }
  input:focus-visible, textarea:focus-visible, select:focus-visible, summary:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
  summary { cursor: pointer; font-weight: 600; padding: .25rem 0; }
  .innen { display: flex; flex-direction: column; gap: .25rem; padding-top: .5rem; }
  .spalte { margin-top: .5rem; }
  .zeile { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .5rem; }
  .warn { background: var(--blatt-2); padding: .5rem; border-radius: var(--r-klein); }
  .probleme { margin: .25rem 0; padding-inline-start: 1.25rem; color: var(--fehler, #b00020); }
  .rueck { border: 1px solid var(--akzent); border-radius: var(--r-klein); padding: .5rem; }
</style>
