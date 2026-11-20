<script lang="ts">
  /**
   * Kodier-Arbeitsplatz (Stufe 6b, Paket 6b1), Seite `#kodieren`. Nach docs/erheben/FACHBLATT-STUFE-6B.md: ein Dokument in zwei Ansichten („Text“ | „Sätze“),
   * eine Code-Leiste mit Schnellleiste, Belege je Code. Kodierungen liegen im Projekt (Autospeichern über `lib/kodieren.svelte.ts`), nichts mehr in einer Kopie.
   * Ansagen nur über `sage()`/`sageSpaeter()` (keine neuen Live-Regionen), kein modales Fenster. Codebaum, Memos, Fälle und Variablen (6b2) sowie „Dokument hinzufügen“ (6b3) hängen hier ein.
   */
  import { tick } from 'svelte';
  import { L, Lp, s } from '../lib/sitzung.svelte';
  import { NACH_FOKUS_MS, sage, sageSpaeter } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { ansichtSatz } from '../lib/kodieren-ansagen';
  import { ersetzeQualProjekt, uebernimmQdpx } from '../lib/interviews.svelte';
  import { leseQdpx } from '../lib/qdpx';
  
  import { absaetze, beruehrteSaetze, codePfad, einheitAn, kodiere, legeCodeAn, ordneZu, saetze, stellenAusSaetzen, type BelegMitCode, type Einheit } from '../lib/kodieren';
  import { cpTeil, neuesQualProjekt, type Dokument } from '../lib/qualprojekt';
  import {
    absatzNr, aendere, ansageBeimLesen, beschreibeStellen, ichName, kannRueckgaengig, kodierAnsicht, ko, merkeOffenesDokument, mitZuletzt, projekt, rueckgaengig, schnellIds,
    setzeAnsageBeimLesen, setzeIchName, setzeKodierAnsicht, sicherIch, sprache, type Stelle,
  } from '../lib/kodieren.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import KodierText from '../bausteine/KodierText.svelte';
  import KodierSaetze from '../bausteine/KodierSaetze.svelte';
  import CodeLeiste from '../bausteine/CodeLeiste.svelte';
  import CodeBaum from '../bausteine/CodeBaum.svelte';
  import Belege from '../bausteine/Belege.svelte';
  import Memos from '../bausteine/Memos.svelte';
  import FaelleVariablen from '../bausteine/FaelleVariablen.svelte';
  import Nachvollziehbarkeit from '../bausteine/Nachvollziehbarkeit.svelte';
  import Berichtshilfe from '../bausteine/Berichtshilfe.svelte';
  import DokumentHinzufuegen from '../bausteine/DokumentHinzufuegen.svelte';
  import DokumentUebersicht from '../bausteine/DokumentUebersicht.svelte';
  import FallKategorieMatrix from '../bausteine/FallKategorieMatrix.svelte';
  import FallCodeMatrix from '../bausteine/FallCodeMatrix.svelte';
  import CodeLandkarte from '../bausteine/CodeLandkarte.svelte';
  import TextAnalyse from '../bausteine/TextAnalyse.svelte';
  import AehnlicheStellen from '../bausteine/AehnlicheStellen.svelte';
  import EvaluativGefuehrt from '../bausteine/EvaluativGefuehrt.svelte';
  import TypenGefuehrt from '../bausteine/TypenGefuehrt.svelte';
  import ArbeitsweiseWahl from '../bausteine/ArbeitsweiseWahl.svelte';
  import Themen from '../bausteine/Themen.svelte';
  import Einzelfall from '../bausteine/Einzelfall.svelte';
  import Randnotizen from '../bausteine/Randnotizen.svelte';
  import ZweiStellen from '../bausteine/ZweiStellen.svelte';
  import MixedMethods from '../bausteine/MixedMethods.svelte';
  import { oeffneMixedBeispiel } from '../lib/mixed-beispiel';
  import type { FkBeleg } from '../lib/kodieren-ansichten';
  import type { Personen } from '../lib/qualauswertung';
  import { arbeitsweise, bereiche, KODIEREN_TEILE, teilSichtbar, VOREINSTELLUNGEN, type KodierBereich, type KodierTeil } from '../lib/arbeitsweise';
  import { modusAn, sichtbaresProjekt, verlasseEinzelfall } from '../lib/einzelfall-modus';
  import type { Arbeitsweise, QualProjekt } from '../lib/qualprojekt';

  const lade = new Laedt();
  let fehler = $state('');

  /** Das ganze Projekt (zum Schreiben und für die Wahl der Fälle) und die Sicht darauf: im Einzelfall-Modus ohne verdeckte Fälle (A-B8). */
  const qGanz = $derived(projekt());
  const q = $derived(qGanz ? sichtbaresProjekt(qGanz) : undefined);
  const aw = $derived(arbeitsweise(qGanz));
  const einzelAn = $derived(modusAn(qGanz));

  /* ---- Arbeitsweise (Stufe A3): Teile, die über Strg+K oder den Schalter sichtbar sind; Reihenfolge der Bereiche ---- */
  /** über Strg+K geöffnete Teile (nur in dieser Sitzung; der Schalter sperrt nichts) */
  let geoeffnet = $state<KodierTeil[]>([]);
  /** IPA gewählt: Einzelfall-Modus anbieten, bis die Person startet oder ablehnt */
  let einzelAngebot = $state(false);
  const offen = $derived(new Set(geoeffnet));
  const sicht = (t: KodierTeil): boolean => teilSichtbar(qGanz, t, offen);
  const bereichListe = $derived(bereiche(qGanz, offen));
  const SCHMAL: readonly KodierBereich[] = ['baum', 'themen', 'belege', 'memos', 'vergleich', 'randnotizen'];
  /** Die ersten drei schmalen Bereiche stehen neben dem Dokument (Plätze 1-3), alles andere in voller Breite darunter. */
  const platz = $derived.by(() => {
    const m = new Map<KodierBereich, string>();
    let n = 0;
    for (const b of bereichListe) m.set(b, SCHMAL.includes(b) && n < 3 ? `platz-${++n}` : 'voll');
    return m;
  });
  function gewechselt(a: Arbeitsweise) {
    const v = VOREINSTELLUNGEN[a];
    if (v.startAuswerten) ko.auswerten = v.startAuswerten;
    einzelAngebot = !!v.einzelfallAnbieten && !modusAn(projekt());
  }

  /** Strg+K: `#kodieren/<teil>` öffnet einen Teil bei jeder Arbeitsweise und springt hin. */
  const TEIL_ZIEL: Record<KodierTeil, string> = {
    themen: 'ko-themen-t', gruppenthemen: 'ko-themen-t', tagebuch: 'ko-memos-t', 'gt-memos': 'ko-memos-t', phase: 'ko-baum-t',
    vergleich: 'ko-vergleich-t', einzelfall: 'ko-einzelfall-t', randnotizen: 'ko-rand-t',
  };
  /** Stufe A5: die zwei Klappen im Bereich „Nachvollziehbarkeit“ (über Strg+K geöffnet) */
  let nachvAuf = $state(false), berichtAuf = $state(false);
  async function oeffneTeil(teil: string) {
    if (teil === 'arbeitsweise') { await tick(); document.getElementById('ko-arbeitsweise')?.focus(); return; }
    // U1 Teil 2: Knopf „Kodieren“ in der Transkript-Zeile (Seite „Interviews“) öffnet genau dieses Dokument und setzt den Fokus in den Text
    if (teil.startsWith('dokument/')) {
      const id = decodeURIComponent(teil.slice('dokument/'.length));
      history.replaceState(null, '', '#kodieren');
      if (!q?.dokumente.some(d => d.id === id)) { sage(L('Dieses Dokument ist hier nicht zu sehen (vielleicht ein verdeckter Fall im Einzelfall-Modus).', 'This document is not shown here (perhaps a hidden case in single-case mode).')); return; }
      if (id !== dokId) wechsleDok(id);
      await tick(); await tick();
      if (ansicht === 'text') textRef?.fokussiere(); else saetzeRef?.fokussiere();
      sageSpaeter(L(`Dokument „${docName(id)}“ geöffnet.`, `Document "${docName(id)}" opened.`), 600);
      return;
    }
    if (teil === 'berichtshilfe' || teil === 'nachvollziehbarkeit') {
      if (teil === 'berichtshilfe') berichtAuf = true; else nachvAuf = true;
      await tick(); await tick();
      const ziel = document.getElementById(teil === 'berichtshilfe' ? 'ko-bh-t' : 'nv-ki-t');
      const klappe = ziel?.closest('details'); if (klappe) klappe.open = true;
      // erst nach dem Bildaufbau fokussieren: im eben geöffneten <details> greift focus() sonst nicht
      for (let i = 0; i < 20 && ziel && !ziel.checkVisibility(); i++) await new Promise(r => setTimeout(r, 50));
      zu(teil === 'berichtshilfe' ? 'ko-bh-t' : 'nv-ki-t');
      return;
    }
    // Stufe A2: Mixed Methods (Ansicht im Bereich „Auswerten“) und das Beispiel mit Umfrage
    const MM: Record<string, typeof ko.mmTeil> = { mixed: 'verknuepfen', verknuepfen: 'verknuepfen', 'joint-display': 'displays', 'design-steckbrief': 'design', instrument: 'instrument', selbstpruefung: 'pruefung' };
    if (teil === 'beispiel-mm') {
      // Adresse sofort zurücksetzen: Das Beispiel öffnet ein neues Projekt, die Seite baut sich neu auf und läse sonst dieselbe Adresse wieder (Schleife)
      history.replaceState(null, '', '#kodieren');
      if (lade.aktiv) return;
      await lade.mit(async () => { try { const r = await oeffneMixedBeispiel(); ko.auswerten = 'mixed'; ko.mmTeil = 'verknuepfen'; await tick(); await tick(); zu('ko-mm-t'); sageSpaeter(L(`Beispiel geöffnet: neues Projekt mit ${r.zeilen} Antworten aus der Umfrage und ${r.dokumente} Interviews.`, `Example opened: new project with ${r.zeilen} survey responses and ${r.dokumente} interviews.`), 600); } catch { sage(L('Das Beispiel ließ sich nicht laden.', 'The example could not be loaded.'), 'dringend'); } });
      return;
    }
    if (teil === 'woerter' || teil === 'textanalyse') { ko.auswerten = 'woerter'; await tick(); await tick(); zu('ko-ta-t'); return; }
    if (MM[teil]) { ko.auswerten = 'mixed'; ko.mmTeil = MM[teil]!; await tick(); await tick(); zu('ko-mm-t'); return; }
    if (teil === 'einzelfall-verlassen') {
      if (modusAn(projekt())) { aendere(L('Einzelfall-Modus wieder an', 'Single-case mode on again'), q0 => verlasseEinzelfall(q0)); sage(L('Einzelfall-Modus verlassen. Sie sehen wieder alle Fälle.', 'Single-case mode left. You see all cases again.')); }
      else sage(L('Der Einzelfall-Modus ist nicht an.', 'Single-case mode is not on.'));
      return;
    }
    if (!(KODIEREN_TEILE as readonly string[]).includes(teil)) return;
    const t = teil as KodierTeil;
    if (!geoeffnet.includes(t)) geoeffnet = [...geoeffnet, t];
    if (t === 'einzelfall') einzelAngebot = !modusAn(projekt());
    await tick(); await tick();
    if (t === 'tagebuch') { void memosRef?.neuFuerArt('tagebuch'); return; }
    zu(TEIL_ZIEL[t]);
  }
  $effect(() => {
    const lies = () => { const h = location.hash.replace(/^#/, ''); if (h.startsWith('kodieren/')) void oeffneTeil(h.slice('kodieren/'.length)); };
    lies();
    window.addEventListener('hashchange', lies);
    return () => window.removeEventListener('hashchange', lies);
  });

  /** Sprunglinks je Bereich (Reihenfolge wie die Bereiche) */
  const SPRUNG: Record<KodierBereich, { ziel: string; de: string; en: string }> = {
    baum: { ziel: 'ko-baum-t', de: 'Zum Codebaum', en: 'To the code tree' },
    themen: { ziel: 'ko-themen-t', de: 'Zu den Themen', en: 'To the themes' },
    belege: { ziel: 'ko-belege-t', de: 'Zu den Belegen', en: 'To the passages' },
    memos: { ziel: 'ko-memos-t', de: 'Zu den Memos', en: 'To the memos' },
    vergleich: { ziel: 'ko-vergleich-t', de: 'Zum Vergleich', en: 'To the comparison' },
    randnotizen: { ziel: 'ko-rand-t', de: 'Zu den Randnotizen', en: 'To the exploratory notes' },
    auswerten: { ziel: 'ko-auswerten-t', de: 'Zum Auswerten', en: 'To the analysis' },
    nachv: { ziel: 'ko-nachv-t', de: 'Zur Nachvollziehbarkeit', en: 'To traceability' },
    faelle: { ziel: 'ko-faelle-t', de: 'Zu Fällen und Variablen', en: 'To cases and variables' },
  };

  /** Springt zu einem Segment (Themen, Randnotizen, Vergleich); verdeckte Fälle bleiben verdeckt. */
  function zeigeSegment(segId: string) {
    const sg = q?.segmente.find(x => x.id === segId);
    if (!sg) { sage(L('Diese Stelle gehört zu einem verdeckten Fall (Einzelfall-Modus).', 'This passage belongs to a hidden case (single-case mode).')); return; }
    void zeigeStelle(sg.dokument, sg.start, sg.ende, L(`Absatz ${absatzNr(q?.dokumente.find(x => x.id === sg.dokument)?.text ?? '', sg.start)} markiert.`, `Paragraph ${absatzNr(q?.dokumente.find(x => x.id === sg.dokument)?.text ?? '', sg.start)} marked.`));
  }
  let dokId = $state('');
  const dok = $derived(q?.dokumente.find(d => d.id === dokId));
  const spr = $derived(dok?.sprache ?? sprache());
  const sSaetze = $derived<Einheit[]>(dok ? saetze(dok.text, spr) : []);
  const sAbs = $derived<Einheit[]>(dok ? absaetze(dok.text) : []);
  const ansicht = $derived(kodierAnsicht());
  const ich = $derived(q?.ich);

  /* Das offene Dokument: gemerkt im Projekt, sonst das erste */
  $effect(() => {
    if (!q) { dokId = ''; return; }
    if (!q.dokumente.some(d => d.id === dokId)) {
      const m = q.arbeitsplatz?.offenesDokument;
      dokId = m && q.dokumente.some(d => d.id === m) ? m : q.dokumente[0]?.id ?? '';
    }
  });

  /* ---- Auswahl in beiden Ansichten ---- */
  let sel = $state<Stelle>({ start: 0, ende: 0 });
  let gewaehlt = $state<Set<number>>(new Set());
  let fokusNr = $state(1);
  /** Stelle, die über Enter/K in die Code-Leiste mitgenommen wurde (verfällt, sobald sich Auswahl, Dokument oder Ansicht ändern) */
  let gemerkt = $state<Stelle[] | null>(null);
  let ueberTaste = $state(false);
  let textRef = $state<ReturnType<typeof KodierText>>();
  let saetzeRef = $state<ReturnType<typeof KodierSaetze>>();
  let leisteRef = $state<ReturnType<typeof CodeLeiste>>();
  let memosRef = $state<ReturnType<typeof Memos>>();
  let faelleRef = $state<ReturnType<typeof FaelleVariablen>>();
  /** der aktive Code im Codebaum (für Memos und das Ankerbeispiel) */
  let aktCode = $state('');
  /** „Neuer Fall …“ im Kopf gewählt: der nächste angelegte Fall wird dem offenen Dokument zugeordnet */
  let zuordnenNeu = $state(false);

  $effect(() => { void sel.start; void sel.ende; void gewaehlt; void fokusNr; void dokId; void ansicht; gemerkt = null; });

  function aktStellen(): Stelle[] {
    if (gemerkt) return gemerkt;
    if (ansicht === 'text') return sel.start !== sel.ende ? [{ start: sel.start, ende: sel.ende }] : [];
    return gewaehlt.size ? stellenAusSaetzen(sSaetze, gewaehlt) : [];
  }
  const stelleName = $derived(beschreibeStellen(aktStellen(), sSaetze));

  function wechsleDok(id: string) {
    dokId = id;
    sel = { start: 0, ende: 0 }; gewaehlt = new Set(); fokusNr = 1; gemerkt = null;
    merkeOffenesDokument(id);
  }

  /** Öffnen aus der Liste „Dokumente“: danach in die Ansicht */
  async function oeffneDokument(id: string) {
    if (id === dokId) { sage(L('Dieses Dokument ist schon offen.', 'This document is already open.')); return; }
    wechsleDok(id);
    await tick(); await tick();
    if (ansicht === 'text') textRef?.fokussiere(); else saetzeRef?.fokussiere();
    sage(L(`Dokument „${docName(id)}“ geöffnet.`, `Document "${docName(id)}" opened.`));
  }

  /** Ein neues Dokument ins Projekt legen (legt bei Bedarf ein Projekt an) und öffnen */
  function dokumentNeu(d: Dokument) {
    // Einzelfall-Modus: ein neues Dokument gehört zum aktuellen Fall, sonst wäre es sofort verdeckt
    const akt = projekt()?.einzelfall;
    if (akt?.an && akt.aktuell && d.fall === undefined) d = { ...d, fall: akt.aktuell };
    if (!projekt()) ersetzeQualProjekt({ ...neuesQualProjekt(L('Interviews', 'Interviews')), dokumente: [d] });
    else aendere(L(`Dokument „${d.name}“ wieder entfernt`, `Document "${d.name}" removed again`), q0 => ({ ...q0, dokumente: [...q0.dokumente, d] }));
    dokId = d.id; sel = { start: 0, ende: 0 }; gewaehlt = new Set(); fokusNr = 1; gemerkt = null;
    merkeOffenesDokument(d.id);
    void tick().then(tick).then(() => { document.getElementById('ko-dokument-t')?.focus(); });
  }
  const kodZahl = $derived.by(() => {
    const m = new Map<string, number>();
    if (!q) return m;
    const dokVon = new Map(q.segmente.map(sg => [sg.id, sg.dokument]));
    for (const k of q.kodierungen) { const d = dokVon.get(k.segment); if (d) m.set(d, (m.get(d) ?? 0) + 1); }
    return m;
  });

  /* ---- Fall dieses Dokuments ---- */
  function fallWahl(e: Event & { currentTarget: HTMLSelectElement }) {
    if (!dok) return;
    const w = e.currentTarget.value;
    if (w === '__neu') {
      e.currentTarget.value = dok.fall ?? '';
      zuordnenNeu = true;
      document.getElementById('ko-faelle-t')?.scrollIntoView({ block: 'start' });
      faelleRef?.fokussiereFallName();
      sage(L('Geben Sie den Namen des neuen Falls ein. Er wird diesem Dokument zugeordnet.', 'Enter the name of the new case. It is assigned to this document.'));
      return;
    }
    const f = w === '' ? undefined : w;
    const name = f ? q?.faelle.find(x => x.id === f)?.name ?? '' : '';
    aendere(L('Zuordnung zum Fall zurückgenommen', 'Assignment to the case undone'), q0 => ordneZu(q0, dok.id, f));
    sage(f ? L(`Dokument gehört jetzt zum Fall „${name}“.`, `Document now belongs to case "${name}".`) : L('Dokument gehört zu keinem Fall.', 'Document belongs to no case.'));
  }
  function fallAngelegt(id: string) {
    if (!zuordnenNeu || !dok) return;
    zuordnenNeu = false;
    aendere(L('Zuordnung zum Fall zurückgenommen', 'Assignment to the case undone'), q0 => ordneZu(q0, dok.id, id));
  }

  /* ---- Memos ---- */
  function memoZuStellen(stellen: Stelle[]) {
    if (!stellen.length) { sage(L('Es ist nichts markiert. Markieren Sie mit Umschalt+Pfeil, S oder A.', 'Nothing is marked. Mark with Shift+arrow, S or A.')); return; }
    void memosRef?.neuFuerStellen(stellen, beschreibeStellen(stellen, sSaetze), true);
  }
  function memoZuBeleg(b: BelegMitCode, i: number) {
    const segId = q?.kodierungen.find(k => k.id === b.kodierung)?.segment;
    if (segId) void memosRef?.neuFuerSegment(segId, L(`Beleg ${i + 1}, Absatz ${b.absatz}`, `Passage ${i + 1}, paragraph ${b.absatz}`));
  }
  function ausDemMemo() {
    if (ansicht === 'text') textRef?.setzeAuswahl(sel.start, sel.ende); else saetzeRef?.fokussiere();
  }

  /* ---- Kodieren ---- */
  const erstEineStelle = () => sage(L('Erst eine Stelle markieren, dann den Code geben.', 'Mark a passage first, then assign the code.'));

  /** Zurück in die Ansicht, an dieselbe Stelle (nur, wenn der Fokus in der Code-Leiste war) */
  function zurueckInAnsicht(stellen: Stelle[]) {
    const a = document.activeElement;
    if (a?.id !== 'ko-cl-suche') return;
    if (ansicht === 'text') textRef?.setzeAuswahl(stellen[0]?.start ?? sel.start, stellen[stellen.length - 1]?.ende ?? sel.ende);
    else saetzeRef?.fokussiere();
  }

  function zumCode(stellen: Stelle[]) {
    gemerkt = stellen; ueberTaste = true;
    leisteRef?.fokussiere();
  }

  function gibCode(codeId: string, stellen: Stelle[] = aktStellen()) {
    if (!q || !dok) return;
    if (!stellen.length) { erstEineStelle(); return; }
    const c = q.codes.find(x => x.id === codeId);
    if (!c) return;
    const cn = codePfad(q.codes, codeId);
    const wo = beschreibeStellen(stellen, sSaetze);
    let angelegt = 0;
    aendere(L(`Code „${cn}“ bei ${wo} wieder entfernt`, `Code "${cn}" at ${wo} removed again`), q0 => {
      let neu = sicherIch(q0);
      const wer = neu.ich!;
      angelegt = 0;
      for (const st of stellen) {
        const v = neu.kodierungen.length;
        neu = kodiere(neu, dok.id, st.start, st.ende, codeId, wer);
        if (neu.kodierungen.length > v) angelegt++;
      }
      return angelegt ? mitZuletzt(neu, codeId) : q0;
    });
    belCode = codeId;
    const text = angelegt === 0
      ? L(`Diese Stelle hat den Code „${cn}“ schon.`, `This passage already has the code "${cn}".`)
      : L(`Code „${cn}“ gegeben: ${wo}.`, `Code "${cn}" assigned: ${wo}.`);
    zurueckInAnsicht(stellen);
    gemerkt = null; ueberTaste = false;
    sageSpaeter(text, NACH_FOKUS_MS);
  }

  function neuerCode(name: string, stellen: Stelle[] = aktStellen()) {
    if (!q || !dok) return;
    if (!stellen.length) { erstEineStelle(); return; }
    const n = name.trim();
    const wo = beschreibeStellen(stellen, sSaetze);
    let neueId = '';
    try {
      aendere(L(`Neuer Code „${n}“ bei ${wo} wieder entfernt`, `New code "${n}" at ${wo} removed again`), q0 => {
        let neu = sicherIch(q0);
        const r = legeCodeAn(neu, n);
        neueId = r.id; neu = r.q;
        for (const st of stellen) neu = kodiere(neu, dok.id, st.start, st.ende, r.id, neu.ich!);
        return mitZuletzt(neu, r.id);
      });
    } catch (e) {
      const k = e instanceof Error ? e.message : '';
      sage(k === 'name-vergeben' ? L('Diesen Code-Namen gibt es schon. Wählen Sie ihn aus der Liste.', 'This code name exists already. Choose it from the list.') : L('Bitte einen Namen eingeben.', 'Please enter a name.'));
      return;
    }
    belCode = neueId;
    zurueckInAnsicht(stellen);
    gemerkt = null; ueberTaste = false;
    sageSpaeter(L(`Neuer Code „${n}“ angelegt und gegeben: ${wo}.`, `New code "${n}" created and assigned: ${wo}.`), NACH_FOKUS_MS);
  }

  function codeZiffer(n: number, stellen: Stelle[]) {
    if (!q) return;
    const id = schnellIds(q)[n - 1];
    if (!id) { sage(L(`Auf Platz ${n} der Schnellleiste liegt kein Code.`, `Slot ${n} of the quick bar has no code.`)); return; }
    gibCode(id, stellen);
  }

  function ausDerLeiste() {
    ueberTaste = false;
    if (ansicht === 'text') textRef?.setzeAuswahl(sel.start, sel.ende);
    else saetzeRef?.fokussiere();
  }

  function rueckSchritt() {
    const t = rueckgaengig();
    sage(t === null ? L('Es gibt nichts zum Rückgängigmachen.', 'There is nothing to undo.') : L(`Rückgängig: ${t}.`, `Undone: ${t}.`));
  }

  /* ---- Ansicht wechseln: die Stelle bleibt ---- */
  /** Ansage nach dem Wechsel (VO2): erst nach dem Fokuswechsel, sonst verschluckt sie VoiceOver; ein neuer Wechsel nimmt die alte zurück. */
  let nimmAnsicht: (() => void) | undefined;
  async function wechsleAnsicht(neu: 'text' | 'saetze') {
    if (neu === ansicht) return;
    if (neu === 'saetze') {
      const nr = sel.start !== sel.ende ? beruehrteSaetze(sSaetze, sel.start, sel.ende) : [];
      gewaehlt = new Set(nr);
      fokusNr = nr[0] ?? einheitAn(sSaetze, sel.start)?.nr ?? 1;
    } else if (gewaehlt.size) {
      const nrn = [...gewaehlt].sort((x, y) => x - y);
      const a = sSaetze.find(e => e.nr === nrn[0]), b = sSaetze.find(e => e.nr === nrn[nrn.length - 1]);
      if (a && b) sel = { start: a.start, ende: b.ende };
    } else {
      const e = sSaetze.find(x => x.nr === fokusNr);
      if (e) sel = { start: e.start, ende: e.start };
    }
    gemerkt = null; ueberTaste = false;
    setzeKodierAnsicht(neu);
    await tick(); await tick();
    if (neu === 'saetze') { saetzeRef?.fokussiere(); nimmAnsicht?.(); nimmAnsicht = sageSpaeter(ansichtSatz('saetze', fokusNr, sSaetze.length), NACH_FOKUS_MS); }
    else { textRef?.setzeAuswahl(sel.start, sel.ende); nimmAnsicht?.(); nimmAnsicht = sageSpaeter(ansichtSatz('text'), NACH_FOKUS_MS); }
  }

  /* ---- Belege je Code ---- */
  let belCode = $state('');
  $effect(() => { if (q && (!belCode || !q.codes.some(c => c.id === belCode))) belCode = q.codes[0]?.id ?? ''; });
  const nurWer = $derived(ko.nurIch ? (q?.ich ?? '\u0000') : undefined);
  const docName = (id: string): string => q?.dokumente.find(d => d.id === id)?.name ?? '';
  async function zeigeBeleg(b: BelegMitCode, i: number) {
    if (!dok) return;
    if (b.dokument !== dokId) wechsleDok(b.dokument);
    await tick(); await tick();
    const d = q?.dokumente.find(x => x.id === b.dokument);
    if (!d) return;
    if (ansicht === 'text') { textRef?.setzeAuswahl(b.start, b.ende); sage(L(`Beleg ${i + 1}: Absatz ${b.absatz} markiert.`, `Passage ${i + 1}: paragraph ${b.absatz} marked.`)); }
    else {
      const nr = beruehrteSaetze(saetze(d.text, d.sprache ?? sprache()), b.start, b.ende);
      gewaehlt = new Set(nr); fokusNr = nr[0] ?? 1;
      await tick();
      saetzeRef?.fokussiere();
      sage(L(`Beleg ${i + 1}: Absatz ${b.absatz} gewählt.`, `Passage ${i + 1}: paragraph ${b.absatz} selected.`));
    }
  }

  /* ---- Auswerten (Stufe 6c) ---- */
  let auswPerson = $state('alle');
  const auswPersonen = $derived<Personen>(auswPerson === 'alle' || !q?.kodierende.some(k => k.id === auswPerson) ? 'alle' : [auswPerson]);
  const auswPersonName = $derived(auswPersonen === 'alle' ? L('Alle', 'All') : (q?.kodierende.find(k => k.id === auswPerson)?.name ?? ''));
  const auswAnsichten: { wert: typeof ko.auswerten; de: string; en: string }[] = [
    { wert: 'uebersicht', de: 'Was ist wo kodiert? (Dokument-Übersicht)', en: 'What is coded where? (document overview)' },
    { wert: 'fk', de: 'Was sagt jeder Fall zu jedem Thema? (Fall-Kategorie-Matrix)', en: 'What does each case say on each topic? (case-by-category matrix)' },
    { wert: 'matrix', de: 'Wie oft kommt welcher Code vor? (Code-Matrix)', en: 'How often does each code occur? (code matrix)' },
    { wert: 'landkarte', de: 'Welche Codes kommen zusammen vor? (Code-Landkarte)', en: 'Which codes occur together? (code map)' },
    { wert: 'woerter', de: 'Welche Wörter kommen vor? (Wörter zählen, Textanalyse)', en: 'Which words occur? (count words, text analysis)' },
    { wert: 'aehnlich', de: 'Wo steht noch etwas Ähnliches? (ähnliche Stellen)', en: 'Where is there something similar? (similar passages)' },
    { wert: 'evaluativ', de: 'Wie stark zeigt sich etwas je Fall? (evaluative Inhaltsanalyse)', en: 'How strongly does something show in each case? (evaluative content analysis)' },
    { wert: 'typen', de: 'Welche Typen von Fällen gibt es? (typenbildende Inhaltsanalyse)', en: 'What types of cases are there? (type-building content analysis)' },
    { wert: 'mixed', de: 'Zahlen und Texte verbinden (Mixed Methods, Joint Display)', en: 'Combine numbers and texts (mixed methods, joint display)' },
  ];

  /** Springt in die aktuelle Ansicht zu einer Stelle (Dokument-Übersicht, Matrix, ähnliche Stellen); `ansage` kommt erst nach dem Fokuswechsel. */
  async function zeigeStelle(dokument: string, start: number, ende: number, ansage: string, nurErster = false) {
    if (!dok) return;
    if (dokument !== dokId) wechsleDok(dokument);
    await tick(); await tick();
    const d = q?.dokumente.find(x => x.id === dokument);
    if (!d) return;
    if (ansicht === 'text') textRef?.setzeAuswahl(start, ende);
    else {
      const nr = beruehrteSaetze(saetze(d.text, d.sprache ?? sprache()), start, ende);
      const erste = nurErster ? nr.slice(0, 1) : nr;
      gewaehlt = new Set(erste); fokusNr = erste[0] ?? 1;
      await tick();
      saetzeRef?.fokussiere();
    }
    sageSpaeter(ansage, NACH_FOKUS_MS);
  }
  const zeigeAbsatz = (start: number, ende: number, nr: number) => void zeigeStelle(dokId, start, ende, L(`Absatz ${nr}.`, `Paragraph ${nr}.`), true);
  const zeigeFkBeleg = (b: FkBeleg) => void zeigeStelle(b.dokument, b.start, b.ende, L(`Absatz ${absatzNr(q?.dokumente.find(x => x.id === b.dokument)?.text ?? '', b.start)} markiert.`, `Paragraph ${absatzNr(q?.dokumente.find(x => x.id === b.dokument)?.text ?? '', b.start)} marked.`));
  const zeigeStufe = (dokument: string, start: number, ende: number) => void zeigeStelle(dokument, start, ende, L('Textstelle markiert.', 'Passage marked.'));
  const zeigeAehnlich = (dokument: string, start: number, ende: number) => void zeigeStelle(dokument, start, ende, L('Ähnliche Stelle markiert.', 'Similar passage marked.'));
  /** Ausgangsstelle für „Ähnliche Stellen“: die Auswahl, sonst der Satz an der Schreibmarke */
  function aehnlichAusgang(): { start: number; ende: number } | null {
    const a = aktStellen();
    if (a.length) return { start: a[0]!.start, ende: a[a.length - 1]!.ende };
    const e = ansicht === 'text' ? einheitAn(sSaetze, sel.start) : sSaetze.find(x => x.nr === fokusNr);
    return e ? { start: e.start, ende: e.ende } : null;
  }

  /* ---- Beispielprojekt ---- */
  async function beispielLaden() {
    fehler = '';
    await lade.mit(async () => {
      try {
        const dn = `beispiel-${sprache()}.qdpx`;
        const r = await fetch(new URL(`beispiel/qdpx/${dn}`, document.baseURI));
        if (!r.ok) throw new Error('nicht gefunden');
        const erg = leseQdpx(new Uint8Array(await r.arrayBuffer()), sprache());
        const hat = !!projekt();
        const a = uebernimmQdpx(erg, hat ? 'hinzufuegen' : 'ersetzen', sprache());
        const nd = a.projekt.dokumente.length, nc = a.projekt.codes.length;
        await tick(); await tick();
        document.getElementById('ko-dok')?.focus();
        sageSpaeter(L(`${Lp(nd, '1 Dokument', `${nd} Dokumente`, '', '')} und ${Lp(nc, '1 Code', `${nc} Codes`, '', '')} geladen.`, `${Lp(nd, '', '', '1 document', `${nd} documents`)} and ${Lp(nc, '', '', '1 code', `${nc} codes`)} loaded.`), 600);
      } catch {
        fehler = L('Das Beispielprojekt ließ sich nicht laden. Bitte prüfen Sie die Verbindung und versuchen Sie es noch einmal.', 'The example project could not be loaded. Please check the connection and try again.');
        sage(fehler, 'dringend');
      }
    });
  }

  function zu(id: string) { const e = document.getElementById(id); e?.scrollIntoView({ block: 'start' }); e?.focus(); }
  /** Verlässt der Fokus die Combobox, gilt „über Enter erreicht“ nicht mehr */
  function fokusWeg(e: FocusEvent) { if ((e.target as HTMLElement).id === 'ko-cl-suche') ueberTaste = false; }
</script>

<div class="tisch ohne-rand"><article class="blatt ko" aria-label={L('Kodier-Arbeitsplatz', 'Coding workplace')}>
  <SeitenKopf titel={L('Kodieren: Textstellen Codes geben (qualitative Inhaltsanalyse)', 'Coding: assign codes to passages (qualitative content analysis)')} titelId="ko-t" fokussierbar zurueck="interviews" />
  <p class="heft-text">{L('Kodieren heißt: Sie geben einer Textstelle einen Code (eine Kategorie), zum Beispiel „Belastung“. Alles wird im Projekt gespeichert.', 'Coding means: you give a passage of text a code (a category), for example "strain". Everything is saved in the project.')}</p>
  {#if !s.projekt}
    <p class="heft-text hinweis-ohne"><Icon n="hinweis" /><span>{L('Es ist kein Projekt geöffnet. Was Sie kodieren, bleibt nur in dieser Sitzung erhalten. Öffnen Sie ein Projekt, dann wird es mit gespeichert.', 'No project is open. What you code only stays for this session. Open a project and it is saved along with it.')}</span></p>
  {/if}

  {#if !qGanz || !q || (!dok && !einzelAn)}
    <p class="heft-text">{L('Es gibt noch keinen Text zum Kodieren. Lesen Sie Transkripte auf der Seite „Interviews“ ein, oder laden Sie das erfundene Beispielprojekt.', 'There is no text to code yet. Read in transcripts on the "Interviews" page, or load the invented example project.')}</p>
    <div class="knopfzeile">
      <button class="k haupt" id="ko-laden" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void beispielLaden(); }}>{L('Beispielprojekt laden (erfunden)', 'Load example project (invented)')}</button>
      <button class="k" type="button" onclick={() => (location.hash = 'interviews')}>{L('Zu den Transkripten (Seite „Interviews“)', 'To the transcripts ("Interviews" page)')}</button>
    </div>
    {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Projekt wird gelesen …', 'Reading the project …')} /></p>{/if}
    {#if fehler}<p class="fehl">{fehler}</p>{/if}
    <div class="teil"><DokumentHinzufuegen oncomplete={dokumentNeu} /></div>
  {:else}
    <div class="ko-kopf">
      <ArbeitsweiseWahl q={qGanz} {gewechselt} />
      {#if aw === 'sequenzanalyse'}
        <p class="heft-text hinweis-ohne"><Icon n="hinweis" /><span>{L('Feinstruktur und Sequenzanalyse haben einen eigenen Arbeitsplatz auf der Seite „Interviews“.', 'Fine structure and sequence analysis have their own workplace on the "Interviews" page.')}</span></p>
        <div class="knopfzeile"><button class="k" type="button" onclick={() => (location.hash = 'interviews/iv-fein-t')}>{L('Zum Sequenz-Arbeitsplatz (Seite „Interviews“, Feinstrukturanalyse)', 'To the sequence workplace ("Interviews" page, fine structure analysis)')}</button></div>
      {:else if aw === 'codebuch'}
        <div class="knopfzeile">
          <button class="k" type="button" onclick={() => (location.hash = 'interviews/iv-kodier-t')}>{L('Zum Kodierleitfaden (Seite „Interviews“)', 'To the coding guide ("Interviews" page)')}</button>
          <button class="k" type="button" onclick={() => (location.hash = 'interviews/iv-ueber-t')}>{L('Zur Übereinstimmung (Intercoder, Seite „Interviews“)', 'To agreement (intercoder, "Interviews" page)')}</button>
        </div>
      {/if}
      <div class="feld-zeile">
        <label for="ko-name">{L('Ihr Name beim Kodieren', 'Your name for coding')}</label>
        <input id="ko-name" type="text" autocomplete="off" value={ichName(qGanz)} placeholder={L('Ich', 'Me')} onchange={(e) => setzeIchName(e.currentTarget.value)}>
      </div>
      {#if dok}
        <div class="feld-zeile">
          <label for="ko-dok">{L('Dokument', 'Document')}</label>
          <select id="ko-dok" value={dokId} onchange={(e) => wechsleDok(e.currentTarget.value)}>
            {#each q.dokumente as d (d.id)}<option value={d.id}>{d.name}</option>{/each}
          </select>
          <label for="ko-fall">{L('Fall dieses Dokuments', 'Case of this document')}</label>
          <select id="ko-fall" value={dok.fall ?? ''} onchange={fallWahl}>
            <option value="">{L('– kein Fall –', '- no case -')}</option>
            {#each q.faelle as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
            <option value="__neu">{L('Neuer Fall …', 'New case …')}</option>
          </select>
        </div>
        <fieldset id="ko-ansicht" class="ansicht">
          <legend>{L('Ansicht', 'View')}</legend>
          <label class="radio"><input id="ko-ansicht-text" type="radio" name="ko-ansicht" value="text" checked={ansicht === 'text'} onchange={() => void wechsleAnsicht('text')}>{L('Text', 'Text')}</label>
          <label class="radio"><input id="ko-ansicht-saetze" type="radio" name="ko-ansicht" value="saetze" checked={ansicht === 'saetze'} onchange={() => void wechsleAnsicht('saetze')}>{L('Sätze', 'Sentences')}</label>
        </fieldset>
      {/if}
      <div class="feld-zeile">
        <button class="k" id="ko-rueck" type="button" aria-disabled={kannRueckgaengig() ? undefined : 'true'} onclick={() => { if (kannRueckgaengig()) rueckSchritt(); else sage(L('Es gibt nichts zum Rückgängigmachen.', 'There is nothing to undo.')); }}>{L('Rückgängig', 'Undo')}</button>
        <label class="radio"><input id="ko-nurich" type="checkbox" bind:checked={ko.nurIch}>{L('Nur meine Kodierungen zeigen', 'Show only my coding')}</label>
      </div>
    </div>

    {#if einzelAn || einzelAngebot || sicht('einzelfall') && aw === 'ipa'}
      <section class="teil einzelfall" aria-label={L('Bereich Einzelfall-Modus', 'Single-case mode area')}>
        <h2 id="ko-einzelfall-t" tabindex="-1">{L('Eine Person nach der anderen (Einzelfall-Modus, IPA)', 'One person at a time (single-case mode, IPA)')}</h2>
        <Einzelfall ganz={qGanz} angebot={einzelAngebot && !einzelAn} />
      </section>
    {/if}

    {#if dok}
    <nav class="sprung" aria-label={L('Sprunglinks', 'Jump links')}>
      <button class="k leise" type="button" onclick={() => zu('ko-arbeitsweise')}>{L('Zur Arbeitsweise', 'To the approach')}</button>
      {#if einzelAn || einzelAngebot || (sicht('einzelfall') && aw === 'ipa')}<button class="k leise" type="button" onclick={() => zu('ko-einzelfall-t')}>{L('Zum Einzelfall-Modus', 'To single-case mode')}</button>{/if}
      <button class="k leise" type="button" onclick={() => zu('ko-dokument-t')}>{L('Zum Dokument', 'To the document')}</button>
      <button class="k leise" type="button" onclick={() => zu('ko-code-t')}>{L('Zur Code-Leiste', 'To the code bar')}</button>
      {#each bereichListe as b (b)}
        <!-- U1 (A6a-Befund 1): der Sprung zur Nachvollziehbarkeit öffnet auch die Klappe, sonst sieht man nur die Überschrift -->
        <button class="k leise" type="button" onclick={() => { if (b === 'nachv') { const k = document.getElementById('ko-nachv-auf')?.closest('details'); if (k) k.open = true; } zu(SPRUNG[b].ziel); }}>{L(SPRUNG[b].de, SPRUNG[b].en)}</button>
      {/each}
      <button class="k leise" type="button" onclick={() => zu('ko-hilfe')}>{L('Zur Tastenhilfe', 'To the key help')}</button>
    </nav>

    <div class="raster">
      <section class="r-dokumente teil" aria-label={L('Bereich Dokumente', 'Documents area')}>
        <h2 id="ko-dokumente-t" tabindex="-1">{L('Dokumente', 'Documents')}</h2>
        <ul class="dokliste" id="ko-dokliste" data-nolink>
          {#each q.dokumente as d (d.id)}
            <li>
              <button class="k" type="button" aria-current={d.id === dokId ? 'true' : undefined} onclick={() => void oeffneDokument(d.id)}>{L(`Öffnen: ${d.name}`, `Open: ${d.name}`)}</button>
              <span class="klein">{Lp(kodZahl.get(d.id) ?? 0, '1 Kodierung', `${kodZahl.get(d.id) ?? 0} Kodierungen`, '1 coding', `${kodZahl.get(d.id) ?? 0} codings`)}</span>
            </li>
          {/each}
        </ul>
        <!-- Eingeklappt, damit Tab und Lesemodus schmal nicht erst durch das ganze Formular vor dem Dokument laufen (Abnahme Opus 09.11.) -->
        <details class="dh-auf">
          <summary id="ko-dok-neu">{L('Dokument hinzufügen (Text, Word, PDF)', 'Add a document (text, Word, PDF)')}</summary>
          <DokumentHinzufuegen oncomplete={dokumentNeu} />
        </details>
      </section>

      <section class="r-dokument teil" aria-label={L('Bereich Dokument', 'Document area')}>
        <h2 id="ko-dokument-t" tabindex="-1">{L('Dokument', 'Document')}</h2>
        {#key dok.id + ansicht}
          {#if ansicht === 'text'}
            <KodierText bind:this={textRef} {dok} {q} saetze={sSaetze} absaetze={sAbs} bind:sel nurIch={ko.nurIch} {ich} ansageLesen={ansageBeimLesen()} {zumCode} ziffer={codeZiffer} memo={memoZuStellen} rueck={rueckSchritt} />
          {:else}
            <KodierSaetze bind:this={saetzeRef} {dok} {q} saetze={sSaetze} bind:gewaehlt bind:fokusNr nurIch={ko.nurIch} {ich} {zumCode} ziffer={codeZiffer} memo={memoZuStellen} rueck={rueckSchritt} />
          {/if}
        {/key}
      </section>

      <section class="r-leiste teil" aria-label={L('Bereich Code-Leiste', 'Code bar area')} onfocusout={fokusWeg}>
        <h2 id="ko-code-t" tabindex="-1">{L('Code-Leiste', 'Code bar')}</h2>
        <CodeLeiste bind:this={leisteRef} codes={q.codes} stelle={stelleName} schnell={schnellIds(q)} {ueberTaste} gib={(id) => gibCode(id)} neu={(n) => neuerCode(n)} zurueck={ausDerLeiste} />
      </section>

      {#each bereichListe as b (b)}
        <div class="bereich {platz.get(b)}">
          {#if b === 'baum'}
            <section class="teil" aria-label={L('Bereich Codebaum', 'Code tree area')}>
              <h2 id="ko-baum-t" tabindex="-1">{L('Codebaum', 'Code tree')}</h2>
              <CodeBaum {q} schnell={schnellIds(q)} bind:aktiv={aktCode} mitPhase={sicht('phase')} ankerText={() => aktStellen().map(st => cpTeil(dok.text, st.start, st.ende)).join(' [ … ] ')} />
            </section>
          {:else if b === 'themen'}
            <section class="teil" aria-label={L('Bereich Themen', 'Themes area')}>
              <h2 id="ko-themen-t" tabindex="-1">{L('Themen (Muster über Stellen und Fälle bilden)', 'Themes (building patterns across passages and cases)')}</h2>
              <Themen {q} fall={dok.fall} ipa={aw === 'ipa' || sicht('gruppenthemen')} einzelfall={einzelAn} {zeigeSegment} />
            </section>
          {:else if b === 'belege'}
            <section class="teil" aria-label={L('Bereich Belege', 'Passages area')}>
              <h2 id="ko-belege-t" tabindex="-1">{L('Belege', 'Passages')}</h2>
              <Belege {q} bind:belCode {nurWer} zeige={(bb, i) => void zeigeBeleg(bb, i)} memo={memoZuBeleg} />
            </section>
          {:else if b === 'memos'}
            <section class="teil" aria-label={L('Bereich Memos', 'Memos area')}>
              <h2 id="ko-memos-t" tabindex="-1">{L('Memos', 'Memos')}</h2>
              <Memos bind:this={memosRef} {q} dokId={dok.id} fallId={dok.fall} codeId={aktCode} stellen={aktStellen()} {stelleName} zurueck={ausDemMemo} tagebuch={sicht('tagebuch')} gt={sicht('gt-memos')} />
            </section>
          {:else if b === 'vergleich'}
            <section class="teil" aria-label={L('Bereich Vergleich', 'Comparison area')}>
              <h2 id="ko-vergleich-t" tabindex="-1">{L('Zwei Stellen vergleichen (ständiger Vergleich)', 'Compare two passages (constant comparison)')}</h2>
              <ZweiStellen {q} dokId={dok.id} stellen={aktStellen()} {stelleName} {zeigeSegment} zeigeStelle={(d, s0, e0) => void zeigeStelle(d, s0, e0, L(`Textstelle markiert.`, `Passage marked.`))} />
            </section>
          {:else if b === 'randnotizen'}
            <section class="teil" aria-label={L('Bereich Randnotizen', 'Exploratory notes area')}>
              <h2 id="ko-rand-t" tabindex="-1">{L('Randnotizen in drei Schichten (IPA)', 'Exploratory notes in three layers (IPA)')}</h2>
              <Randnotizen {q} dokId={dok.id} stellen={aktStellen()} {stelleName} {zeigeSegment} />
            </section>
          {:else if b === 'auswerten'}
            {@render auswerten(q, dok)}
          {:else if b === 'nachv'}
            <section class="teil" aria-label={L('Bereich Nachvollziehbarkeit', 'Traceability area')}>
              <h2 id="ko-nachv-t" tabindex="-1">{L('Nachvollziehbarkeit (Dokumentation)', 'Traceability (documentation)')}</h2>
              <details class="dh-auf" open={VOREINSTELLUNGEN[aw].nachvOffen || nachvAuf ? true : undefined}>
                <summary id="ko-nachv-auf">{L('Änderungsprotokoll, KI-Angabe und Methodenanhang zeigen', 'Show change log, AI statement and methods appendix')}</summary>
                <Nachvollziehbarkeit {q} ganz={qGanz} />
              </details>
              <details class="dh-auf" open={berichtAuf ? true : undefined} ontoggle={(e) => (berichtAuf = e.currentTarget.open)}>
                <summary id="ko-bh-auf">{L('Berichtshilfe COREQ und SRQR zeigen (Was muss in meinen Methodenteil?)', 'Show reporting checklists COREQ and SRQR (What belongs in my methods section?)')}</summary>
                <Berichtshilfe q={qGanz} {einzelAn} />
              </details>
            </section>
          {:else if b === 'faelle'}
            <section class="teil" aria-label={L('Bereich Fälle und Variablen', 'Cases and variables area')}>
              <h2 id="ko-faelle-t" tabindex="-1">{L('Fälle und Variablen', 'Cases and variables')}</h2>
              <FaelleVariablen bind:this={faelleRef} {q} neuerFall={fallAngelegt} />
            </section>
          {/if}
        </div>
      {/each}

      <section class="r-hilfe teil voll" aria-label={L('Bereich Tastenhilfe', 'Key help area')}>
        <h2 id="ko-hilfe" tabindex="-1">{L('Tastenhilfe', 'Key help')}</h2>
        <div class="tabelle-rahmen">
          <table class="tab">
            <caption class="nur-vorleser">{L('Tasten in den Ansichten Text und Sätze', 'Keys in the views Text and Sentences')}</caption>
            <thead><tr><th scope="col">{L('Taste', 'Key')}</th><th scope="col">{L('Ansicht Text', 'View Text')}</th><th scope="col">{L('Ansicht Sätze', 'View Sentences')}</th></tr></thead>
            <tbody>
              <tr><th scope="row">S</th><td>{L('Satz markieren, noch einmal: nächsten Satz dazu', 'Mark sentence, again: add the next sentence')}</td><td>-</td></tr>
              <tr><th scope="row">A</th><td>{L('Absatz markieren, noch einmal: nächsten Absatz dazu', 'Mark paragraph, again: add the next paragraph')}</td><td>-</td></tr>
              <tr><th scope="row">Enter, K</th><td>{L('in die Code-Leiste', 'to the code bar')}</td><td>{L('in die Code-Leiste für die gewählten Sätze', 'to the code bar for the selected sentences')}</td></tr>
              <tr><th scope="row">1 - 9</th><td>{L('Code aus der Schnellleiste geben', 'Assign the code from the quick bar')}</td><td>{L('Code aus der Schnellleiste geben', 'Assign the code from the quick bar')}</td></tr>
              <tr><th scope="row">I</th><td>{L('Codes an dieser Stelle ansagen', 'Announce codes at this place')}</td><td>{L('Codes am Satz ansagen', 'Announce codes of the sentence')}</td></tr>
              <tr><th scope="row">M</th><td>{L('Memo zur markierten Stelle schreiben', 'Write a memo about the marked passage')}</td><td>{L('Memo zu den gewählten Sätzen schreiben', 'Write a memo about the selected sentences')}</td></tr>
              <tr><th scope="row">{L('Pfeil auf, ab', 'Arrow up, down')}</th><td>{L('Schreibmarke bewegen', 'Move the cursor')}</td><td>{L('Satz wechseln', 'Change sentence')}</td></tr>
              <tr><th scope="row">{L('Umschalt+Pfeil', 'Shift+arrow')}</th><td>{L('Markierung erweitern', 'Extend selection')}</td><td>{L('Bereich wählen', 'Select a range')}</td></tr>
              <tr><th scope="row">{L('Leertaste', 'Space')}</th><td>-</td><td>{L('Satz wählen oder abwählen', 'Select or deselect sentence')}</td></tr>
              <tr><th scope="row">{L('Pos1, Ende, Bild auf, Bild ab', 'Home, End, Page up, Page down')}</th><td>-</td><td>{L('erster, letzter Satz; 10 Sätze zurück, vor', 'first, last sentence; 10 sentences back, forward')}</td></tr>
              <tr><th scope="row">Strg+A</th><td>{L('alles markieren (Browser)', 'select all (browser)')}</td><td>{L('alle Sätze wählen', 'select all sentences')}</td></tr>
              <tr><th scope="row">{L('Pfeiltaste ohne Umschalt', 'Arrow key without Shift')}</th><td>{L('Markierung aufheben', 'Clear selection')}</td><td>-</td></tr>
              <tr><th scope="row">{L('Entf', 'Delete')}</th><td>-</td><td>{L('Auswahl aufheben', 'Clear selection')}</td></tr>
              <tr><th scope="row">Esc</th><td>{L('Markierung aufheben', 'Clear selection')}</td><td>{L('Auswahl aufheben', 'Clear selection')}</td></tr>
              <tr><th scope="row">{L('Strg+Z (Mac: Cmd+Z)', 'Ctrl+Z (Mac: Cmd+Z)')}</th><td>{L('Rückgängig', 'Undo')}</td><td>{L('Rückgängig', 'Undo')}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="tabelle-rahmen">
          <table class="tab">
            <caption class="nur-vorleser">{L('Tasten in der Code-Leiste', 'Keys in the code bar')}</caption>
            <thead><tr><th scope="col">{L('Taste', 'Key')}</th><th scope="col">{L('Wirkung', 'Effect')}</th></tr></thead>
            <tbody>
              <tr><th scope="row">{L('Tippen', 'Typing')}</th><td>{L('Codes suchen; steht der Name noch nicht da, erscheint „Neuer Code“', 'Search codes; if the name does not exist yet, "New code" appears')}</td></tr>
              <tr><th scope="row">{L('Pfeil ab, auf', 'Arrow down, up')}</th><td>{L('Code in der Liste wählen', 'Choose a code in the list')}</td></tr>
              <tr><th scope="row">Enter</th><td>{L('Code geben und zurück in die Ansicht', 'Assign the code and go back to the view')}</td></tr>
              <tr><th scope="row">{L('Umschalt+Tab', 'Shift+Tab')}</th><td>{L('zurück in die Ansicht ohne Code (nach Enter oder K in der Ansicht)', 'back to the view without a code (after Enter or K in the view)')}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="tabelle-rahmen">
          <table class="tab">
            <caption class="nur-vorleser">{L('Tasten im Codebaum', 'Keys in the code tree')}</caption>
            <thead><tr><th scope="col">{L('Taste', 'Key')}</th><th scope="col">{L('Wirkung', 'Effect')}</th></tr></thead>
            <tbody>
              <tr><th scope="row">{L('Pfeil auf, ab', 'Arrow up, down')}</th><td>{L('Code wählen', 'Choose a code')}</td></tr>
              <tr><th scope="row">{L('Pfeil rechts', 'Arrow right')}</th><td>{L('aufklappen, dann zum ersten Untercode', 'open, then go to the first subcode')}</td></tr>
              <tr><th scope="row">{L('Pfeil links', 'Arrow left')}</th><td>{L('zuklappen, dann zum übergeordneten Code', 'close, then go to the parent code')}</td></tr>
              <tr><th scope="row">{L('Pos1, Ende', 'Home, End')}</th><td>{L('erster, letzter sichtbarer Code', 'first, last visible code')}</td></tr>
              <tr><th scope="row">{L('Buchstabe', 'Letter')}</th><td>{L('zum nächsten Code mit diesem Anfang springen', 'jump to the next code starting with it')}</td></tr>
              <tr><th scope="row">{L('Enter, F2', 'Enter, F2')}</th><td>{L('Code bearbeiten (Name, Farbe, Definition …)', 'edit the code (name, colour, definition …)')}</td></tr>
              <tr><th scope="row">{L('Entf', 'Delete')}</th><td>{L('Code löschen, mit Rückfrage', 'delete the code, with a question first')}</td></tr>
              <tr><th scope="row">{L('Pfeil links, rechts in der Werkzeugleiste', 'Arrow left, right in the toolbar')}</th><td>{L('zwischen den Werkzeugen wechseln', 'move between the tools')}</td></tr>
            </tbody>
          </table>
        </div>
        <label class="radio"><input id="ko-ansage-lesen" type="checkbox" checked={ansageBeimLesen()} onchange={(e) => setzeAnsageBeimLesen(e.currentTarget.checked)} aria-describedby="ko-ansage-lesen-h">{L('Beim Lesen ansagen, was kodiert ist', 'Announce what is coded while reading')}</label>
        <p class="hilfe" id="ko-ansage-lesen-h">{L('Betreten Sie mit den Pfeiltasten im Text eine kodierte Stelle, sagt Statable die Codes an. Das kann bei jedem Pfeil zusätzlich zur Zeile laut werden; darum ist es aus, bis Sie es einschalten.', 'When you enter a coded passage with the arrow keys in the text, Statable announces the codes. This may be loud on every arrow press, on top of the line; so it is off until you switch it on.')}</p>
        <p class="hilfe">{L('Mit NVDA: Im Textfeld und in der Liste ist der Fokusmodus an (NVDA+Leertaste schaltet um). Mit VoiceOver am Mac: VO+Umschalt+Pfeil ab, um in das Feld hineinzugehen. Esc schaltet bei NVDA in den Lesemodus zurück. Darum hebt Entf die Auswahl auf.', 'With NVDA: in the text field and in the list, focus mode is on (NVDA+Space switches). With VoiceOver on the Mac: VO+Shift+Down arrow to go into the field. Esc switches NVDA back to browse mode. That is why Delete clears the selection.')}</p>
      </section>
    </div>
    {/if}
  {/if}
{#snippet auswerten(q: QualProjekt, dok: Dokument)}
      <section class="teil" aria-label={L('Bereich Auswerten', 'Analysis area')}>
        <h2 id="ko-auswerten-t" tabindex="-1">{L('Auswerten (Ansichten)', 'Analyse (views)')}</h2>
        <fieldset id="ko-auswerten-wahl" class="auswahl">
          <legend>{L('Ansicht', 'View')}</legend>
          {#each auswAnsichten as a (a.wert)}
            <label class="radio"><input type="radio" name="ko-auswerten" value={a.wert} checked={ko.auswerten === a.wert} onchange={() => (ko.auswerten = a.wert)}>{L(a.de, a.en)}</label>
          {/each}
        </fieldset>
        {#if ko.auswerten === 'uebersicht' || ko.auswerten === 'fk' || ko.auswerten === 'landkarte'}
          <div class="feld-zeile">
            <label for="ko-ausw-person">{L('Kodiert von', 'Coded by')}</label>
            <select id="ko-ausw-person" bind:value={auswPerson}>
              <option value="alle">{L('Alle', 'All')}</option>
              {#each q.kodierende as k (k.id)}<option value={k.id}>{k.name}</option>{/each}
            </select>
          </div>
        {/if}
        {#if ko.auswerten === 'uebersicht'}
          <DokumentUebersicht {q} dokId={dok.id} personen={auswPersonen} zeige={zeigeAbsatz} />
        {:else if ko.auswerten === 'fk'}
          <FallKategorieMatrix {q} personen={auswPersonen} personName={auswPersonName} zeige={zeigeFkBeleg} />
        {:else if ko.auswerten === 'matrix'}
          <FallCodeMatrix />
        {:else if ko.auswerten === 'landkarte'}
          <CodeLandkarte {q} personen={auswPersonen} />
        {:else if ko.auswerten === 'woerter'}
          <TextAnalyse {q} />
        {:else if ko.auswerten === 'evaluativ'}
          <EvaluativGefuehrt {q} zeige={zeigeStufe} />
        {:else if ko.auswerten === 'typen'}
          <TypenGefuehrt {q} />
        {:else if ko.auswerten === 'mixed'}
          <MixedMethods {q} {einzelAn} />
        {:else}
          <AehnlicheStellen {q} dokId={dok.id} ausgang={aehnlichAusgang} zeige={zeigeAehnlich} />
        {/if}
      </section>
{/snippet}
</article></div>

<style>
  .ko { display: flex; flex-direction: column; gap: var(--a3); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .hinweis-ohne { display: flex; gap: var(--a2); align-items: flex-start; margin: 0; }
  .ko-kopf { display: flex; flex-direction: column; gap: var(--a2); }
  .sprung { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .teil { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  .teil h2 { margin: 0; font: 650 var(--gr-h2)/1.25 var(--schrift-ui); }
  .feld-zeile { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .ansicht { border: 0; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center; gap: var(--a3); }
  .ansicht legend { float: inline-start; padding: 0; margin-inline-end: var(--a3); font-weight: 600; }
  .radio { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .radio input[type="checkbox"], .radio input[type="radio"], select { min-width: 24px; min-height: 24px; }
  /* Spalten über Grid-Bereiche, nie über eine andere DOM-Reihenfolge. Seit A3: Die Arbeitsweise bestimmt die Reihenfolge der Bereiche
     (DOM = Lesereihenfolge); die ersten drei schmalen Bereiche stehen auf den Plätzen neben dem Dokument, alles andere in voller Breite. */
  .raster { display: grid; gap: var(--a4); align-items: start; grid-template-columns: minmax(0, 1fr); grid-template-areas: "dokumente" "dokument" "leiste" "platz-1" "platz-2" "platz-3"; }
  .r-dokumente { grid-area: dokumente; }
  .r-dokument { grid-area: dokument; }
  .r-leiste { grid-area: leiste; }
  .bereich { min-width: 0; }
  .platz-1 { grid-area: platz-1; }
  .platz-2 { grid-area: platz-2; }
  .platz-3 { grid-area: platz-3; }
  .voll { grid-column: 1 / -1; }
  .auswahl { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .auswahl legend { padding: 0; margin-bottom: var(--a2); font-weight: 600; }
  :global(:root.weit-701) .raster { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); grid-template-areas: "dokumente dokumente" "dokument leiste" "dokument platz-1" "platz-2 platz-3"; }
  :global(:root.weit-1400) .raster { grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr); grid-template-areas: "dokumente dokument leiste" "platz-1 dokument platz-2" "platz-1 dokument platz-3"; }
  .dokliste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .dokliste li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2); }
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  .tabelle-rahmen { overflow-x: auto; }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: top; }
</style>
