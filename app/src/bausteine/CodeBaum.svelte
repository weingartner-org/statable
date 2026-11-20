<script lang="ts">
  /**
   * Codebaum (Stufe 6b2, Fachblatt 3.4): `tree` mit Roving Tabindex, Werkzeugleiste (`toolbar`), Bearbeiten-Bereich und Löschen mit Rückfragezeile - alles ohne Dialog.
   * Jede Änderung geht über `aendere()` aus `lib/kodieren.svelte.ts` (so erfasst „Rückgängig“ sie). Ansagen nur über `sage()`.
   * Die Definitionen sind dieselben wie im Kodierleitfaden (Seite „Interviews“): beide ändern `q.codes`.
   * Abweichung vom Fachblatt: Die Rückfragezeile zum Löschen steht unter dem Baum (nicht zwischen den Einträgen), weil in einem `tree` nur Einträge stehen dürfen.
   */
  import { tick, untrack } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { NACH_FOKUS_MS, sage, sageSpaeter } from '../lib/ansage';
  import { codeBearbeitenSatz } from '../lib/kodieren-ansagen';
  import { aendereCode, baumReihenfolge, codeNameFrei, entferneCode, legeCodeAn, verschiebeCode } from '../lib/kodieren';
  import { aendere, setzeFest, sprache } from '../lib/kodieren.svelte';
  import { FARBEN, farbName } from '../lib/kodieren-farben';
  import { KODIER_PHASEN, type Code, type KodierPhase, type QualProjekt } from '../lib/qualprojekt';

  interface Props {
    q: QualProjekt;
    /** Ziffern der Schnellleiste (ids in Reihenfolge) */
    schnell: string[];
    /** der aktive Code im Baum (die Seite liest ihn für Memos) */
    aktiv: string;
    /** Text der markierten Stelle (für „Ankerbeispiel übernehmen“); leer = nichts markiert */
    ankerText: () => string;
    /** Kodierphase (Grounded Theory) zeigen und bearbeiten (Stufe A3) */
    mitPhase?: boolean;
  }
  let { q, schnell, aktiv = $bindable(), ankerText, mitPhase = false }: Props = $props();

  /** Phase als Wort (steht im Namen des Baumeintrags und sichtbar in der Zeile, nie nur als Symbol) */
  const phaseWort = (p: KodierPhase): string => ({
    offen: L('offen', 'open'), fokussiert: L('fokussiert', 'focused'), axial: L('axial', 'axial'), theoretisch: L('theoretisch', 'theoretical'),
  })[p];
  /** Phase mit Fachbegriff für die Auswahl */
  const phaseName = (p: KodierPhase): string => ({
    offen: L('offen (open coding)', 'open (open coding)'),
    fokussiert: L('fokussiert (focused coding)', 'focused (focused coding)'),
    axial: L('axial (axial coding, nur bei Corbin und Strauss)', 'axial (axial coding, only with Corbin and Strauss)'),
    theoretisch: L('theoretisch (theoretical coding)', 'theoretical (theoretical coding)'),
  })[p];

  const nStellen = (n: number): string => Lp(n, '1 Stelle', `${n} Stellen`, '1 passage', `${n} passages`);

  /* ---- Struktur ---- */
  const reihe = $derived(baumReihenfolge(q.codes));
  const elternVon = $derived.by(() => {
    const ids = new Set(q.codes.map(c => c.id));
    const m = new Map<string, string | undefined>();
    for (const c of q.codes) m.set(c.id, c.elternId !== undefined && c.elternId !== c.id && ids.has(c.elternId) ? c.elternId : undefined);
    return m;
  });
  const kinderVon = $derived.by(() => {
    const m = new Map<string | undefined, Code[]>();
    for (const e of reihe) { const p = elternVon.get(e.code.id); const l = m.get(p) ?? []; l.push(e.code); m.set(p, l); }
    return m;
  });
  const geschwisterVon = (id: string): Code[] => kinderVon.get(elternVon.get(id)) ?? [];
  let zu = $state<Set<string>>(new Set());
  const sichtbar = $derived.by(() => {
    const aus: { code: Code; ebene: number }[] = [];
    for (const e of reihe) {
      let p = elternVon.get(e.code.id), weg = false, n = 0;
      while (p !== undefined && n++ < 60) { if (zu.has(p)) { weg = true; break; } p = elternVon.get(p); }
      if (!weg) aus.push(e);
    }
    return aus;
  });
  /** Verschachtelt für den Baum (VO5): jedes treeitem mit Kindern trägt ein `role="group"`. Aus `sichtbar` (Vorordnung mit Ebene) gebaut, so stimmt es auch bei Kreisen. */
  type Knoten = { code: Code; ebene: number; kinder: Knoten[] };
  const wurzeln = $derived.by(() => {
    const aus: Knoten[] = [];
    const stapel: Knoten[] = [];
    for (const e of sichtbar) {
      const k: Knoten = { code: e.code, ebene: e.ebene, kinder: [] };
      while (stapel.length && stapel[stapel.length - 1]!.ebene >= e.ebene) stapel.pop();
      (stapel.length ? stapel[stapel.length - 1]!.kinder : aus).push(k);
      stapel.push(k);
    }
    return aus;
  });
  const codeNr = $derived.by(() => {
    const m = new Map<string, number>();
    const je = new Map<string, Set<string>>();
    for (const k of q.kodierungen) { const s = je.get(k.code) ?? new Set<string>(); s.add(k.segment); je.set(k.code, s); }
    for (const [c, s] of je) m.set(c, s.size);
    return m;
  });
  const aktCode = $derived(q.codes.find(c => c.id === aktiv));
  const festIds = $derived(q.arbeitsplatz?.fest ?? []);

  $effect(() => {
    if (!sichtbar.length) { if (aktiv) aktiv = ''; return; }
    if (!sichtbar.some(e => e.code.id === aktiv)) aktiv = sichtbar[0]!.code.id;
  });

  const beschreibung = (c: Code): string => {
    const n = codeNr.get(c.id) ?? 0;
    const z = schnell.indexOf(c.id) + 1;
    return [nStellen(n) + '.', c.kodierbar ? '' : L('Nicht kodierbar.', 'Not codable.'), z ? L(`Ziffer ${z}.`, `Digit ${z}.`) : '', c.farbe ? L(`Farbe: ${farbName(c.farbe, 'de')}.`, `Colour: ${farbName(c.farbe, 'en')}.`) : ''].filter(Boolean).join(' ');
  };

  async function fokus(id: string) {
    aktiv = id;
    await tick();
    document.getElementById(`ko-b-${id}`)?.focus();
  }

  /* ---- Tasten im Baum ---- */
  let tippen = '';
  let tippenZeit = 0;
  function taste(e: KeyboardEvent) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key;
    const i = sichtbar.findIndex(x => x.code.id === aktiv);
    const cur = sichtbar[i];
    if (!cur) return;
    const gehe = (j: number) => { const z = sichtbar[Math.max(0, Math.min(sichtbar.length - 1, j))]; if (z) void fokus(z.code.id); };
    const kinder = kinderVon.get(cur.code.id) ?? [];
    if (k === 'ArrowDown') { e.preventDefault(); gehe(i + 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); gehe(i - 1); }
    else if (k === 'Home') { e.preventDefault(); gehe(0); }
    else if (k === 'End') { e.preventDefault(); gehe(sichtbar.length - 1); }
    else if (k === 'ArrowRight') {
      e.preventDefault();
      if (!kinder.length) return;
      if (zu.has(cur.code.id)) { const n = new Set(zu); n.delete(cur.code.id); zu = n; } else void fokus(kinder[0]!.id);
    } else if (k === 'ArrowLeft') {
      e.preventDefault();
      if (kinder.length && !zu.has(cur.code.id)) { zu = new Set(zu).add(cur.code.id); return; }
      const p = elternVon.get(cur.code.id);
      if (p !== undefined) void fokus(p);
    } else if (k === 'Enter' || k === 'F2') { e.preventDefault(); void oeffneBearbeiten(); }
    else if (k === 'Delete') { e.preventDefault(); void frageLoeschen(); }
    else if (k.length === 1 && /\S/.test(k)) {
      const jetzt = Date.now();
      tippen = jetzt - tippenZeit < 700 ? tippen + k.toLowerCase() : k.toLowerCase();
      tippenZeit = jetzt;
      const ab = tippen.length === 1 ? i + 1 : i;
      for (let n = 0; n < sichtbar.length; n++) {
        const z = sichtbar[(ab + n) % sichtbar.length]!;
        if (z.code.name.toLowerCase().startsWith(tippen)) { e.preventDefault(); void fokus(z.code.id); return; }
      }
    }
  }

  /* ---- Werkzeugleiste ---- */
  let werkzeugAktiv = $state(0);
  let leiste = $state<HTMLElement>();
  function werkzeugTaste(e: KeyboardEvent) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const b = [...(leiste?.querySelectorAll<HTMLElement>('button') ?? [])];
    const i = b.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    let z = -1;
    if (e.key === 'ArrowRight') z = (i + 1) % b.length;
    else if (e.key === 'ArrowLeft') z = (i - 1 + b.length) % b.length;
    else if (e.key === 'Home') z = 0;
    else if (e.key === 'End') z = b.length - 1;
    if (z < 0) return;
    e.preventDefault();
    werkzeugAktiv = z; b[z]!.focus();
  }

  const platzSatz = (codes: Code[], id: string): string => {
    const c = codes.find(x => x.id === id);
    if (!c) return '';
    const g = codes.filter(x => x.elternId === c.elternId).sort((a, b) => a.reihenfolge - b.reihenfolge);
    const platz = g.findIndex(x => x.id === id) + 1;
    const p = c.elternId !== undefined ? codes.find(x => x.id === c.elternId) : undefined;
    return p
      ? L(`${c.name}: jetzt unter „${p.name}“, Platz ${platz} von ${g.length}.`, `${c.name}: now under "${p.name}", place ${platz} of ${g.length}.`)
      : L(`${c.name}: jetzt auf oberster Ebene, Platz ${platz} von ${g.length}.`, `${c.name}: now at the top level, place ${platz} of ${g.length}.`);
  };

  async function verschiebe(art: 'hoch' | 'runter' | 'ebeneHoch' | 'ebeneTief') {
    const c = aktCode;
    if (!c) { sage(L('Wählen Sie zuerst einen Code im Baum.', 'Choose a code in the tree first.')); return; }
    const sib = geschwisterVon(c.id);
    const i = sib.findIndex(x => x.id === c.id);
    const p = elternVon.get(c.id);
    let ziel: { elternId?: string; vor?: string } | null = null;
    let nein = '';
    if (art === 'hoch') { if (i > 0) ziel = { ...(p !== undefined ? { elternId: p } : {}), vor: sib[i - 1]!.id }; else nein = L(`${c.name} steht schon ganz oben.`, `${c.name} is already at the top.`); }
    else if (art === 'runter') { if (i < sib.length - 1) ziel = { ...(p !== undefined ? { elternId: p } : {}), ...(i + 2 < sib.length ? { vor: sib[i + 2]!.id } : {}) }; else nein = L(`${c.name} steht schon ganz unten.`, `${c.name} is already at the bottom.`); }
    else if (art === 'ebeneHoch') {
      if (p === undefined) nein = L(`${c.name} ist schon auf oberster Ebene.`, `${c.name} is already at the top level.`);
      else { const opa = elternVon.get(p); const ps = geschwisterVon(p); const pi = ps.findIndex(x => x.id === p); ziel = { ...(opa !== undefined ? { elternId: opa } : {}), ...(pi + 1 < ps.length ? { vor: ps[pi + 1]!.id } : {}) }; }
    } else {
      if (i > 0) ziel = { elternId: sib[i - 1]!.id }; else nein = L(`${c.name} hat kein Geschwister davor, unter das es rücken könnte.`, `${c.name} has no sibling before it to move under.`);
    }
    if (!ziel) { sage(nein); void fokus(c.id); return; }
    let neu: QualProjekt | null = null;
    const z = ziel;
    aendere(L(`Verschieben von Code „${c.name}“ zurückgenommen`, `Moving code "${c.name}" undone`), q0 => { neu = verschiebeCode(q0, c.id, z); return neu; });
    if (art === 'ebeneTief' && z.elternId) { const n = new Set(zu); n.delete(z.elternId); zu = n; }
    await fokus(c.id);
    if (neu) sage(platzSatz((neu as QualProjekt).codes, c.id));
  }

  function festUmschalten() {
    const c = aktCode;
    if (!c) { sage(L('Wählen Sie zuerst einen Code im Baum.', 'Choose a code in the tree first.')); return; }
    const drin = festIds.includes(c.id);
    if (!drin && !c.kodierbar) { sage(L(`„${c.name}“ ist nicht kodierbar und kann nicht in die Schnellleiste.`, `"${c.name}" is not codable and cannot go to the quick bar.`)); return; }
    setzeFest(c.id, !drin);
    sage(drin ? L(`„${c.name}“ ist nicht mehr fest in der Schnellleiste.`, `"${c.name}" is no longer fixed in the quick bar.`) : L(`„${c.name}“ liegt jetzt fest in der Schnellleiste.`, `"${c.name}" is now fixed in the quick bar.`));
  }

  /* ---- Bearbeiten-Bereich und „Neu“ ---- */
  type Modus = 'aus' | 'bearbeiten' | 'neu';
  let modus = $state<Modus>('aus');
  let neuEltern = $state<string | undefined>(undefined);
  let eName = $state('');
  let eDef = $state('');
  let eRegel = $state('');
  let nameFehler = $state('');

  $effect(() => {
    const m = modus, id = aktiv;
    untrack(() => {
      const c = q.codes.find(x => x.id === id);
      nameFehler = '';
      if (m === 'bearbeiten' && c) { eName = c.name; eDef = c.definition ?? ''; eRegel = c.regel ?? ''; }
      else if (m === 'neu') eName = '';
    });
  });

  let nimmBearbeiten: (() => void) | undefined;
  async function oeffneBearbeiten() {
    if (!aktCode) { sage(L('Es gibt noch keinen Code zum Bearbeiten. Legen Sie mit „Neuer Code“ einen an.', 'There is no code to edit yet. Create one with "New code".')); return; }
    loesche = null;
    modus = 'bearbeiten';
    await tick(); await tick();
    document.getElementById('ko-baum-name')?.focus();
    nimmBearbeiten?.();
    nimmBearbeiten = sageSpaeter(codeBearbeitenSatz(aktCode?.name ?? ''), NACH_FOKUS_MS);   // VO3: VoiceOver sagt beim Fokus ins Feld nichts
  }
  async function oeffneNeu(untercode: boolean) {
    if (untercode && !aktCode) { sage(L('Wählen Sie zuerst den Code, unter dem der neue liegen soll.', 'Choose the code the new one should go under first.')); return; }
    loesche = null;
    neuEltern = untercode ? aktCode!.id : undefined;
    modus = 'neu';
    await tick(); await tick();
    document.getElementById('ko-baum-name')?.focus();
  }
  async function fertig() {
    nimmBearbeiten?.(); nimmBearbeiten = undefined;
    const id = aktiv;
    modus = 'aus';
    await tick();
    if (id) void fokus(id);
  }

  async function legeAn() {
    const n = eName.trim();
    let id = '';
    try {
      aendere(L(`Neuer Code „${n}“ wieder entfernt`, `New code "${n}" removed again`), q0 => { const r = legeCodeAn(q0, n, neuEltern); id = r.id; return r.q; });
    } catch (e) {
      const k = e instanceof Error ? e.message : '';
      nameFehler = k === 'name-vergeben' ? L('Diesen Namen gibt es an dieser Stelle schon. Wählen Sie einen anderen.', 'This name exists here already. Choose another one.') : L('Bitte einen Namen eingeben.', 'Please enter a name.');
      document.getElementById('ko-baum-name')?.focus();
      return;
    }
    if (neuEltern) { const z = new Set(zu); z.delete(neuEltern); zu = z; }
    modus = 'aus';
    await tick();
    await fokus(id);
    sage(neuEltern ? L(`Neuer Untercode „${n}“ angelegt.`, `New subcode "${n}" created.`) : L(`Neuer Code „${n}“ angelegt.`, `New code "${n}" created.`));
  }

  function speichereName() {
    const c = aktCode;
    if (!c || modus !== 'bearbeiten') return;
    const n = eName.trim();
    if (!n) { nameFehler = L('Bitte einen Namen eingeben.', 'Please enter a name.'); return; }
    if (!codeNameFrei(q, n, c.elternId, c.id)) { nameFehler = L('Diesen Namen gibt es an dieser Stelle schon. Wählen Sie einen anderen.', 'This name exists here already. Choose another one.'); return; }
    nameFehler = '';
    if (n === c.name) return;
    aendere(L(`Umbenennen von „${c.name}“ zurückgenommen`, `Renaming "${c.name}" undone`), q0 => aendereCode(q0, c.id, { name: n }));
    sageSpaeter(L(`Umbenannt in „${n}“.`, `Renamed to "${n}".`), 400);
  }
  function speichereFarbe(wert: string) {
    const c = aktCode; if (!c) return;
    aendere(L(`Farbe von „${c.name}“ zurückgenommen`, `Colour of "${c.name}" undone`), q0 => aendereCode(q0, c.id, { farbe: wert || undefined }));
    sage(wert ? L(`Farbe: ${farbName(wert, 'de')}.`, `Colour: ${farbName(wert, 'en')}.`) : L('Keine Farbe.', 'No colour.'));
  }
  function speichereKodierbar(an: boolean) {
    const c = aktCode; if (!c) return;
    aendere(L(`Kodierbar bei „${c.name}“ zurückgenommen`, `Codable for "${c.name}" undone`), q0 => aendereCode(q0, c.id, { kodierbar: an }));
    sage(an ? L(`„${c.name}“ ist kodierbar.`, `"${c.name}" is codable.`) : L(`„${c.name}“ ist nicht kodierbar, nur zum Ordnen.`, `"${c.name}" is not codable, for grouping only.`));
  }
  function speicherePhase(wert: string) {
    const c = aktCode; if (!c) return;
    const p = (KODIER_PHASEN as readonly string[]).includes(wert) ? (wert as KodierPhase) : undefined;
    if (c.phase === p) return;
    aendere(L(`Kodierphase von „${c.name}“ zurückgenommen`, `Coding phase of "${c.name}" undone`), q0 => aendereCode(q0, c.id, { phase: p }));
    sage(p ? L(`Kodierphase von „${c.name}“: ${phaseWort(p)}.`, `Coding phase of "${c.name}": ${phaseWort(p)}.`) : L(`„${c.name}“ hat keine Kodierphase mehr.`, `"${c.name}" has no coding phase any more.`));
  }
  function speichereText(feld: 'definition' | 'regel', wert: string) {
    const c = aktCode; if (!c) return;
    if ((c[feld] ?? '') === wert) return;
    aendere(feld === 'definition' ? L(`Definition von „${c.name}“ zurückgenommen`, `Definition of "${c.name}" undone`) : L(`Kodierregel von „${c.name}“ zurückgenommen`, `Coding rule of "${c.name}" undone`), q0 => aendereCode(q0, c.id, { [feld]: wert.trim() ? wert : undefined }));
    sage(feld === 'definition' ? L('Definition gespeichert.', 'Definition saved.') : L('Kodierregel gespeichert.', 'Coding rule saved.'));
  }
  function ankerUebernehmen() {
    const c = aktCode; if (!c) return;
    const t = ankerText().trim();
    if (!t) { sage(L('Es ist nichts markiert. Markieren Sie zuerst eine Stelle im Dokument.', 'Nothing is marked. Mark a passage in the document first.')); return; }
    aendere(L(`Ankerbeispiel bei „${c.name}“ zurückgenommen`, `Anchor example for "${c.name}" undone`), q0 => aendereCode(q0, c.id, { anker: [...(q0.codes.find(x => x.id === c.id)?.anker ?? []), { text: t }] }));
    sage(L('Ankerbeispiel übernommen.', 'Anchor example added.'));
  }
  function ankerWeg(i: number) {
    const c = aktCode; if (!c) return;
    aendere(L(`Entfernen eines Ankerbeispiels bei „${c.name}“ zurückgenommen`, `Removing an anchor example from "${c.name}" undone`), q0 => aendereCode(q0, c.id, { anker: (q0.codes.find(x => x.id === c.id)?.anker ?? []).filter((_, j) => j !== i) }));
    sage(L(`Ankerbeispiel ${i + 1} entfernt.`, `Anchor example ${i + 1} removed.`));
    void tick().then(() => (document.getElementById('ko-baum-anker-neu') as HTMLElement | null)?.focus());
  }

  /* ---- Löschen mit Rückfragezeile ---- */
  let loesche = $state<string | null>(null);
  const loeschCode = $derived(q.codes.find(c => c.id === loesche));
  async function frageLoeschen() {
    if (!aktCode) { sage(L('Es gibt keinen Code zum Löschen.', 'There is no code to delete.')); return; }
    modus = 'aus';
    loesche = aktCode.id;
    await tick(); await tick();
    document.getElementById('ko-baum-behalten')?.focus();
  }
  async function loescheJetzt() {
    const c = loeschCode; if (!c) return;
    const i = sichtbar.findIndex(x => x.code.id === c.id);
    const rest = sichtbar.filter(x => x.code.id !== c.id);
    const naechster = rest[Math.min(i, rest.length - 1)]?.code.id ?? '';
    aendere(L(`Löschen von Code „${c.name}“ zurückgenommen`, `Deleting code "${c.name}" undone`), q0 => entferneCode(q0, c.id));
    loesche = null;
    await tick();
    if (naechster) { await fokus(naechster); } else document.getElementById('ko-baum-werkzeuge')?.querySelector('button')?.focus();
    sage(L(`Code „${c.name}“ gelöscht.`, `Code "${c.name}" deleted.`));
  }
  async function behalten() {
    const id = loesche; loesche = null;
    await tick();
    if (id) { await fokus(id); sage(L('Code behalten.', 'Code kept.')); }
  }
  const loeschTaste = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); void behalten(); } };
  const loeschFrage = $derived.by(() => {
    const c = loeschCode; if (!c) return '';
    const n = codeNr.get(c.id) ?? 0;
    const unter = (kinderVon.get(c.id) ?? []).length > 0;
    const a = n > 0 ? L(`${nStellen(n)} verlieren diesen Code.`, `${nStellen(n)} lose this code.`) : L('Keine Stelle hat diesen Code.', 'No passage has this code.');
    return L(`„${c.name}“ löschen? ${a}${unter ? ' Untercodes rücken eine Ebene hoch.' : ''}`, `Delete "${c.name}"? ${a}${unter ? ' Subcodes move up one level.' : ''}`);
  });

  const sp = $derived(sprache());
  const eigeneFarbe = $derived(aktCode?.farbe && !FARBEN.some(f => f.wert.toLowerCase() === aktCode!.farbe!.toLowerCase()) ? aktCode.farbe : '');
</script>

<div class="baum-teil">
  {#if q.codes.length}
    {#snippet ast(knoten: Knoten[])}
      {#each knoten as k, i (k.code.id)}
        {@const c = k.code}
        {@const offen = k.kinder.length > 0 && !zu.has(c.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events (Tasten laufen über den Baum) -->
        <li id="ko-b-{c.id}" class="eintrag" class:aktiv={c.id === aktiv} role="treeitem" aria-label={`${c.name}${c.phase ? `, ${L('Phase', 'phase')} ${phaseWort(c.phase)}` : ''}. ${beschreibung(c)}`} aria-level={k.ebene} aria-setsize={knoten.length} aria-posinset={i + 1}
          aria-expanded={(kinderVon.get(c.id) ?? []).length ? (zu.has(c.id) ? 'false' : 'true') : undefined} aria-selected={c.id === aktiv ? 'true' : 'false'}
          tabindex={c.id === aktiv ? 0 : -1} onclick={(ev) => { ev.stopPropagation(); void fokus(c.id); }}>
          <div class="zeile" style="padding-inline-start: calc(var(--a3) + {(k.ebene - 1) * 1.25}rem)">
            <span class="pfeil" aria-hidden="true" onclick={(ev) => { if ((kinderVon.get(c.id) ?? []).length) { ev.stopPropagation(); const n = new Set(zu); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); zu = n; void fokus(c.id); } }}>{(kinderVon.get(c.id) ?? []).length ? (zu.has(c.id) ? '▸' : '▾') : ''}</span>
            {#if c.farbe}<span class="punkt" style="background:{c.farbe}" aria-hidden="true"></span>{/if}
            <span class="name" aria-hidden="true" data-nolink>{c.name}</span>
            {#if c.phase}<span class="phase" aria-hidden="true">{L('Phase', 'Phase')}: {phaseWort(c.phase)}</span>{/if}
            <span class="zahl" aria-hidden="true">{codeNr.get(c.id) ?? 0}{c.kodierbar ? '' : L(' · nur Ordnung', ' · grouping only')}</span>
          </div>
          {#if offen}<ul class="gruppe" role="group">{@render ast(k.kinder)}</ul>{/if}
        </li>
      {/each}
    {/snippet}
    <ul id="ko-baum" class="baum" role="tree" aria-label={L('Codes im Codebaum', 'Codes in the code tree')} onkeydown={taste}>
      {@render ast(wurzeln)}
    </ul>
  {:else}
    <p class="hilfe">{L('Es gibt noch keine Codes. Legen Sie mit „Neuer Code“ den ersten an, oder geben Sie einer Textstelle einen neuen Code in der Code-Leiste.', 'There are no codes yet. Create the first one with "New code", or give a passage a new code in the code bar.')}</p>
  {/if}

  <!-- svelte-ignore a11y_interactive_supports_focus (Roving Tabindex: der Fokus liegt auf den Knöpfen) -->
  <div id="ko-baum-werkzeuge" class="werkzeuge" role="toolbar" aria-label={L('Werkzeuge für den gewählten Code', 'Tools for the chosen code')} bind:this={leiste} onkeydown={werkzeugTaste}>
    <button class="k" type="button" tabindex={werkzeugAktiv === 0 ? 0 : -1} onfocus={() => (werkzeugAktiv = 0)} onclick={() => void oeffneNeu(false)}>{L('Neuer Code', 'New code')}</button>
    <button class="k" type="button" tabindex={werkzeugAktiv === 1 ? 0 : -1} onfocus={() => (werkzeugAktiv = 1)} onclick={() => void oeffneNeu(true)}>{L('Neuer Untercode', 'New subcode')}</button>
    <button class="k" type="button" tabindex={werkzeugAktiv === 2 ? 0 : -1} onfocus={() => (werkzeugAktiv = 2)} onclick={() => void verschiebe('hoch')}>{L('Nach oben', 'Move up')}</button>
    <button class="k" type="button" tabindex={werkzeugAktiv === 3 ? 0 : -1} onfocus={() => (werkzeugAktiv = 3)} onclick={() => void verschiebe('runter')}>{L('Nach unten', 'Move down')}</button>
    <button class="k" type="button" tabindex={werkzeugAktiv === 4 ? 0 : -1} onfocus={() => (werkzeugAktiv = 4)} onclick={() => void verschiebe('ebeneHoch')}>{L('Eine Ebene höher', 'One level up')}</button>
    <button class="k" type="button" tabindex={werkzeugAktiv === 5 ? 0 : -1} onfocus={() => (werkzeugAktiv = 5)} onclick={() => void verschiebe('ebeneTief')}>{L('Eine Ebene tiefer', 'One level down')}</button>
    <button class="k" type="button" tabindex={werkzeugAktiv === 6 ? 0 : -1} onfocus={() => (werkzeugAktiv = 6)} onclick={festUmschalten}>{aktCode && festIds.includes(aktCode.id) ? L('Aus der Schnellleiste', 'Remove from quick bar') : L('In die Schnellleiste', 'To the quick bar')}</button>
    <button class="k leise" type="button" tabindex={werkzeugAktiv === 7 ? 0 : -1} onfocus={() => (werkzeugAktiv = 7)} onclick={() => void frageLoeschen()}>{L('Löschen', 'Delete')}</button>
  </div>
  <p class="hilfe">{L('Pfeil auf und ab wählt, rechts und links klappt auf und zu, Enter oder F2 bearbeitet, Entf löscht (mit Rückfrage). Tippen springt zum Code mit diesem Anfang.', 'Arrow up and down choose, right and left open and close, Enter or F2 edits, Delete deletes (with a question first). Typing jumps to the code with that beginning.')}</p>

  {#if loeschCode}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Esc ist nur eine zusätzliche Abkürzung für „Behalten“) -->
    <div id="ko-baum-loeschen" class="rueckfrage" role="group" aria-labelledby="ko-baum-loeschen-t" onkeydown={loeschTaste}>
      <p id="ko-baum-loeschen-t" data-nolink>{loeschFrage}</p>
      <div class="knopfzeile">
        <button class="k" id="ko-baum-loeschen-ja" type="button" onclick={() => void loescheJetzt()}>{L('Löschen', 'Delete')}</button>
        <button class="k haupt" id="ko-baum-behalten" type="button" onclick={() => void behalten()}>{L('Behalten', 'Keep')}</button>
      </div>
    </div>
  {/if}

  {#if modus !== 'aus'}
    <div id="ko-baum-detail" class="detail" role="group" aria-labelledby="ko-baum-detail-t">
      <h3 id="ko-baum-detail-t">{modus === 'neu' ? (neuEltern ? L(`Neuer Untercode unter „${q.codes.find(c => c.id === neuEltern)?.name ?? ''}“`, `New subcode under "${q.codes.find(c => c.id === neuEltern)?.name ?? ''}"`) : L('Neuer Code (oberste Ebene)', 'New code (top level)')) : L(`Code bearbeiten: ${aktCode?.name ?? ''}`, `Edit code: ${aktCode?.name ?? ''}`)}</h3>
      <div class="feld">
        <label for="ko-baum-name">{L('Name des Codes', 'Code name')}</label>
        <input id="ko-baum-name" type="text" autocomplete="off" bind:value={eName} aria-invalid={nameFehler ? 'true' : undefined} aria-describedby={nameFehler ? 'ko-baum-name-f' : undefined}
          onchange={() => { if (modus === 'bearbeiten') speichereName(); }} onkeydown={(ev) => { if (ev.key === 'Enter' && modus === 'neu') { ev.preventDefault(); void legeAn(); } }}>
        {#if nameFehler}<p class="fehl" id="ko-baum-name-f">{nameFehler}</p>{/if}
      </div>
      {#if modus === 'neu'}
        <div class="knopfzeile">
          <button class="k haupt" type="button" onclick={() => void legeAn()}>{L('Anlegen', 'Create')}</button>
          <button class="k" type="button" onclick={() => void fertig()}>{L('Abbrechen', 'Cancel')}</button>
        </div>
      {:else if aktCode}
        <div class="feld">
          <label for="ko-baum-farbe">{L('Farbe', 'Colour')}</label>
          <select id="ko-baum-farbe" value={aktCode.farbe ?? ''} onchange={(ev) => speichereFarbe(ev.currentTarget.value)}>
            <option value="">{L('keine', 'none')}</option>
            {#each FARBEN as f (f.wert)}<option value={f.wert}>{sp === 'de' ? f.de : f.en}</option>{/each}
            {#if eigeneFarbe}<option value={eigeneFarbe}>{farbName(eigeneFarbe, sp)}</option>{/if}
          </select>
        </div>
        <label class="radio"><input id="ko-baum-kodierbar" type="checkbox" checked={aktCode.kodierbar} onchange={(ev) => speichereKodierbar(ev.currentTarget.checked)}>{L('Kodierbar (Stellen dürfen diesen Code bekommen)', 'Codable (passages may get this code)')}</label>
        {#if mitPhase || aktCode.phase}
          <div class="feld">
            <label for="ko-baum-phase">{L('Kodierphase (Grounded Theory)', 'Coding phase (grounded theory)')}</label>
            <select id="ko-baum-phase" aria-describedby="ko-baum-phase-h" value={aktCode.phase ?? ''} onchange={(ev) => speicherePhase(ev.currentTarget.value)}>
              <option value="">{L('keine', 'none')}</option>
              {#each KODIER_PHASEN as p (p)}<option value={p}>{phaseName(p)}</option>{/each}
            </select>
            <p class="hilfe" id="ko-baum-phase-h">{L('Die Phase setzen Sie selbst; Statable schlägt sie nicht vor. Sie steht im Änderungsprotokoll.', 'You set the phase yourself; Statable does not suggest it. It is recorded in the change log.')}</p>
          </div>
        {/if}
        <div class="feld">
          <label for="ko-baum-def">{L('Definition', 'Definition')}</label>
          <textarea id="ko-baum-def" rows="3" bind:value={eDef} onchange={() => speichereText('definition', eDef)}></textarea>
        </div>
        <div class="feld">
          <label for="ko-baum-regel">{L('Kodierregel', 'Coding rule')}</label>
          <textarea id="ko-baum-regel" rows="3" bind:value={eRegel} onchange={() => speichereText('regel', eRegel)}></textarea>
        </div>
        <div class="feld">
          <p class="stark" id="ko-baum-anker-t">{L('Ankerbeispiele', 'Anchor examples')}</p>
          {#if aktCode.anker?.length}
            <ul class="anker" aria-labelledby="ko-baum-anker-t">
              {#each aktCode.anker as a, i (i)}
                <li data-nolink><span>{a.text}</span> <button class="k leise" type="button" aria-label={L(`Entfernen: Ankerbeispiel ${i + 1}`, `Remove: anchor example ${i + 1}`)} onclick={() => ankerWeg(i)}>{L('Entfernen', 'Remove')}</button></li>
              {/each}
            </ul>
          {:else}<p class="hilfe">{L('Noch keine Ankerbeispiele.', 'No anchor examples yet.')}</p>{/if}
          <div class="knopfzeile"><button class="k" id="ko-baum-anker-neu" type="button" onclick={ankerUebernehmen}>{L('Ankerbeispiel aus der markierten Stelle übernehmen', 'Take an anchor example from the marked passage')}</button></div>
        </div>
        <p class="hilfe">{L('Diese Angaben stehen auch im Kodierleitfaden (Seite „Interviews“). Änderungen werden sofort gespeichert.', 'These details are also in the coding guide ("Interviews" page). Changes are saved at once.')}</p>
        <div class="knopfzeile"><button class="k haupt" id="ko-baum-fertig" type="button" onclick={() => void fertig()}>{L('Fertig', 'Done')}</button></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .baum-teil { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .stark { margin: 0; font-weight: 600; }
  .baum { list-style: none; margin: 0; padding: 0; max-height: 20rem; overflow: auto; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); }
  .eintrag { display: block; cursor: pointer; }
  .eintrag:focus { outline: none; }
  .zeile { display: flex; align-items: center; gap: var(--a2); padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); }
  .gruppe { list-style: none; margin: 0; padding: 0; }
  .eintrag.aktiv > .zeile { background: var(--akzent-hell); box-shadow: inset 4px 0 0 var(--akzent); }
  .eintrag:focus-visible > .zeile { outline: 3px solid var(--fokus); outline-offset: -3px; }
  .pfeil { display: inline-block; min-width: 1.2ch; color: var(--tinte-2); }
  .punkt { display: inline-block; width: 0.9rem; height: 0.9rem; border-radius: 50%; border: 2px solid var(--tinte); flex: none; }
  .name { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
  .phase { font-size: var(--gr-klein); color: var(--tinte-2); white-space: nowrap; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: 0 var(--a1); }
  .zahl { font-size: var(--gr-klein); color: var(--tinte-2); white-space: nowrap; }
  .werkzeuge { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .rueckfrage, .detail { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); }
  .rueckfrage p { margin: 0; }
  .detail h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); overflow-wrap: anywhere; }
  .feld { display: flex; flex-direction: column; gap: var(--a1); }
  select, input[type="checkbox"] { min-height: 24px; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .radio { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .anker { margin: 0; padding-inline-start: var(--a4); display: flex; flex-direction: column; gap: var(--a2); }
  @media (forced-colors: active) {
    .eintrag.aktiv > .zeile { outline: 3px solid Highlight; outline-offset: -3px; }
    .punkt { border-color: CanvasText; }   /* Farbe im Kontrastmodus nicht erzwingen (Wächter forced-colors); der Name trägt die Information */
  }
</style>
