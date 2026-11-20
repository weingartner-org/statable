<script lang="ts" module>
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /** Der zuletzt angesehene Pfad: Eine Einheit, die in mehreren Pfaden liegt, gehört zu dem, aus dem man kam. */
  let letzterPfad = '';
</script>

<script lang="ts">
  import { dialogFokus } from '../bausteine/dialogFokus';
  import '../stil/verstehen.css';
  import '../stil/lernen.css';
  import { tick, untrack } from 'svelte';
  import { zaehleEinmal } from '../lib/zaehlen';
  import { L, d, Lp, waehle, meldeFehler, aktuelleSprache } from '../lib/sitzung.svelte';
  import { EINHEITEN, PFADE, BEREICHE_LERNEN, einheitNach, pfadNach, fragenThemen, type Einheit, type Pfad } from '../lernen/lernplan';
  import { eigenePfade, allePfade, pfadFinden, eigenerPfad, loescheEigenen, teilLink } from '../lib/eigenepfade.svelte';
  import PfadBau from '../bausteine/PfadBau.svelte';
  import PfadImport from '../bausteine/PfadImport.svelte';
  import UebungsblattWahl from '../bausteine/UebungsblattWahl.svelte';
  import { alsPfad } from '../lernen/eigenepfade';
  import { sage } from '../lib/ansage';
  import { KURZLINK_SERVER, holeKurzlink } from '../lib/pfadlink';
  import {
    abschnitte, abschnittsFarben, einheitsFarben, fragenStand, istFertig, ersterOffener, ringStuecke, zaehleFarben, type Abschnitt
  } from '../lernen/lernstand';
  import { lernstand, lernBesuche, lernFertig, lernRichtig, lernZuruecksetzen, einheitStandText } from '../lib/lernzustand.svelte';
  import { oeffneBeispielVonLernen } from '../lib/beispieloeffnen';
  import { beispielNach, t } from '../lib/beispiele';
  import { VERFAHREN } from '../lib/verfahren';
  import { reglerTitel } from '../lernen/lernsuche';
  import { artikelModul } from '../hilfe/artikel-laden';
  import type { Artikel, Block } from '../hilfe/kern';
  import { abschnitte as artikelAbschnitte, istUeberschrift } from '../hilfe/aufklappen';
  import { pfadGruppen } from '../lernen/pfadgruppen';
  import type { Sprache } from '../i18n/laufzeit';
  import { verzoegert } from '../lib/laedt.svelte';
  import { randWahl } from '../lib/randwahl.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import Rand, { type RandKontext } from '../bausteine/Rand.svelte';
  import LernBalken, { type Punkt } from '../bausteine/LernBalken.svelte';
  import LernRing from '../bausteine/LernRing.svelte';
  import LernZeichen from '../bausteine/LernZeichen.svelte';
  import LernSuche from '../bausteine/LernSuche.svelte';
  import RechenAufgabe from '../bausteine/RechenAufgabe.svelte';
  import { aufgabeNach } from '../lernen/rechenaufgaben';
  import LernRegler from '../bausteine/LernRegler.svelte';
  import ArtikelBloecke from '../bausteine/ArtikelBloecke.svelte';
  import VerstehenUeben from '../bausteine/VerstehenUeben.svelte';
  import PfadAbschluss from '../bausteine/PfadAbschluss.svelte';

  /** Bereich „Lernen“: `#lernen` (Start), `#lernen/thema/<id>`, `#lernen/pfad/<id>`, `#lernen/<einheit>` und `#lernen/<einheit>/<abschnittNr>`. Alles ist frei anklickbar, nichts gesperrt.
   *  Der Stand liegt nur in diesem Browser (`lib/lernzustand.svelte.ts`). */
  let { teil = '' }: { teil?: string } = $props();

  /** Die Überschrift „Lernen“ steht in zwei einander ausschließenden Zweigen (unbekannte Seite, Übersicht): eine Konstante statt zweimal derselben statischen id. */
  const KOPF_ID = 'ln-t';
  const teile = $derived(teil.split('/'));
  const ansicht = $derived<'start' | 'thema' | 'pfad' | 'pruefung' | 'bau' | 'import' | 'einheit'>(!teil ? 'start' : teile[0] === 'thema' ? 'thema' : teile[0] === 'pfad' ? 'pfad' : teile[0] === 'pfadbau' ? 'bau' : teile[0] === 'import' || teile[0] === 'l' ? 'import' : teile[0] === 'pruefung' ? 'pruefung' : 'einheit');
  const pfad = $derived(ansicht === 'pfad' ? pfadFinden(teile[1] ?? '') : undefined);
  const pruefPfad = $derived(ansicht === 'pruefung' ? pfadFinden(teile[1] ?? '') : undefined);
  const einheit = $derived(ansicht === 'einheit' ? einheitNach(teile[0]!) : undefined);
  const unbekannt = $derived((ansicht === 'thema' && !BEREICHE_LERNEN.some(b => b.id === teile[1])) || (ansicht === 'pfad' && !pfad) || (ansicht === 'pruefung' && !pruefPfad) || (ansicht === 'einheit' && !einheit));
  const st = $derived(lernstand.st);
  const sp = $derived(aktuelleSprache());

  const titelVon = (e: Einheit) => `${waehle(e.alltag)} (${waehle(e.fach)})`;
  const pfadeVon = (id: string) => allePfade().filter(p => p.einheiten.includes(id));
  const kontextPfad = $derived(einheit ? (pfadeVon(einheit.id).find(p => p.id === letzterPfad) ?? pfadeVon(einheit.id)[0]) : undefined);
  $effect(() => { if (pfad) letzterPfad = pfad.id; });
  // Zählung ohne Personenbezug (lib/zaehlen.ts): geöffnete Einheit und geöffneter fester Pfad, je Sitzung einmal
  $effect(() => { const id = einheit?.id; if (id) untrack(() => zaehleEinmal('lernen', id)); });
  $effect(() => { const id = pfad?.id; if (id && PFADE.some(p => p.id === id)) untrack(() => zaehleEinmal('pfad', id)); });
  const listeVon = (ids: string[]) => ids.map(i => einheitNach(i)).filter((e): e is Einheit => !!e);

  // ---- Abschnitte der Einheit ----
  const abs = $derived(einheit ? abschnitte(einheit) : []);
  const nrUrl = $derived(Number(teile[1]));
  /** Ohne Nummer in der Adresse: der erste Abschnitt, der nicht grün ist. Gelesen wird nur beim Wechsel der Einheit, nicht bei jeder Änderung des Stands. */
  const startNr = $derived(einheit ? untrack(() => ersterOffener(lernstand.st, einheit)) : 0);
  const nr = $derived(abs.length ? (Number.isInteger(nrUrl) && nrUrl >= 1 ? Math.min(nrUrl, abs.length) - 1 : startNr) : 0);
  const akt = $derived<Abschnitt | undefined>(abs[nr]);
  $effect(() => { if (einheit && abs.length) { const e = einheit, i = nr; untrack(() => lernBesuche(e, i)); } });

  const abschnittsName = (a: Abschnitt) => {
    const gleich = abs.filter(x => x.art === a.art), k = gleich.indexOf(a) + 1, mehr = gleich.length > 1 ? ` ${k}` : '';
    return a.art === 'erklaerung' ? L('Erklärung', 'Explanation') : a.art === 'rechnen' ? L('Selbst rechnen', 'Work it out yourself') + mehr : a.art === 'beispiel' ? L('Beispiel', 'Example') + mehr : a.art === 'regler' ? L('Regler', 'Slider') + mehr : L('Fragen', 'Questions');
  };
  const farben = $derived(einheit ? abschnittsFarben(st, einheit) : []);
  const fragenZahl = $derived(einheit ? fragenStand(st, einheit) : { richtig: 0, gesamt: 0 });
  const punkte = $derived<Punkt[]>(einheit ? abs.map((a, i) => ({
    href: `#lernen/${einheit.id}/${i + 1}`, name: abschnittsName(a), farbe: farben[i]!,
    zusatz: a.art === 'fragen' ? L(`${fragenZahl.richtig} von ${fragenZahl.gesamt} richtig`, `${fragenZahl.richtig} of ${fragenZahl.gesamt} correct`) : undefined
  })) : []);
  const ueberschrift = $derived.by(() => {
    if (!akt) return '';
    const n = abschnittsName(akt);
    if (akt.art === 'beispiel') { const b = beispielNach(akt.beispiel!); return b ? `${n}: ${t(b.titel)}` : n; }
    if (akt.art === 'regler') return `${n}: ${waehle(reglerTitel(akt.ziel!))}`;
    return n;
  });
  const gehe = (i: number) => { if (einheit) location.hash = `lernen/${einheit.id}/${i + 1}`; };
  const hrefNr = (i: number) => `#lernen/${einheit?.id}/${i + 1}`;
  function fertigUndWeiter() {
    if (!einheit || !akt) return;
    lernFertig(einheit, akt.schluessel);
    if (nr < abs.length - 1) gehe(nr + 1);
  }
  const istFertigJetzt = $derived(einheit && akt ? istFertig(st, einheit, akt) : false);

  // ---- Fokus nach einem Sprung ----
  let h1El = $state<HTMLElement>();
  let absEl = $state<HTMLElement>();
  let zuletztSicht = '';
  // Nachttest NVDA 11.11.: Aus der Übersicht („Hier anfangen“, Link einer Einheit) in eine Einheit fiel der Fokus auf body, NVDA schwieg.
  // Darum gilt auch die Übersicht als vorherige Sicht ('liste'); nur beim ersten Aufruf der Seite bleibt der Fokus, wo er ist.
  $effect(() => {
    if (ansicht !== 'einheit' || !einheit) { zuletztSicht = 'liste'; return; }
    const schluessel = `${einheit.id}/${nr}`, id = einheit.id;
    if (zuletztSicht && schluessel !== zuletztSicht) {
      const andere = !zuletztSicht.startsWith(`${id}/`);
      if (andere) scrollTo(0, 0);
      tick().then(() => (andere ? h1El : absEl)?.focus({ preventScroll: andere }));
    }
    zuletztSicht = schluessel;
  });

  // ---- Erklärung: Artikel aus der Hilfe, erst bei Bedarf ----
  let artikel = $state<Artikel[]>([]);
  let artikelFuer = $state<Sprache | ''>('');
  let artikelLaedt = $state(false);
  /** Die Überschriften „Kurz“ und „So geht es in Statable“ eines Artikels in der gewählten Sprache (`hilfe/artikel.ts`). */
  let gliederung = $state<((id: string, sp: Sprache) => { kurz: string[]; statable: string[] }) | undefined>();
  let artikelFehler = $state(false);
  const animAn = verzoegert(() => artikelLaedt);
  function ladeArtikel() {
    const wunsch = sp;
    artikelLaedt = true; artikelFehler = false;
    artikelModul(wunsch).then(m => { artikel = m.artikelListe(wunsch); gliederung = m.artikelGliederung; artikelFuer = wunsch; }).catch(() => (artikelFehler = true)).finally(() => (artikelLaedt = false));
  }
  $effect(() => { if (akt?.art === 'erklaerung' && artikelFuer !== sp && !artikelLaedt && !artikelFehler) untrack(ladeArtikel); });
  const hilfeArtikel = $derived(einheit ? einheit.hilfe.map(i => artikel.find(a => a.id === i)).filter((a): a is Artikel => !!a) : []);
  /** Erst der Begriff, dann die Bedienung (Usability Stufe 6): „Kurz“ → „Was ist das?“ → „Mehr zu …“ (zu) → „So geht es in Statable“ (zu). Nur umgeordnet, nichts neu geschrieben. */
  const erkl = $derived.by(() => {
    const haupt = hilfeArtikel[0];
    if (!haupt || !gliederung) return undefined;
    const istBegriff = haupt.bereich === 'begriffe', gl = istBegriff ? { kurz: [], statable: [] } : gliederung(haupt.id, sp);
    const kurz: Block[] = [], statable: Block[] = [], mehr: Block[] = [];
    if (!istBegriff) artikelAbschnitte(haupt.inhalt).forEach((g, i) => {
      const k = g[0], h = k !== undefined && istUeberschrift(k) ? k.h : undefined;
      if (h === undefined) (i === 0 && !(typeof k === 'object' && 'mitnehmen' in k) ? kurz : mehr).push(...g);
      else if (gl.kurz.includes(h)) kurz.push(...g.slice(1));
      else if (gl.statable.includes(h)) statable.push(...g.slice(1));
      else mehr.push(...g);
    });
    return { haupt, kurz, statable, mehr, begriffe: hilfeArtikel.filter(a => a.bereich === 'begriffe'), uebrige: hilfeArtikel.filter(a => a !== haupt && a.bereich !== 'begriffe') };
  });
  const karteName = $derived(einheit?.karte ? VERFAHREN.find(v => v.id === einheit.karte)?.titel : undefined);

  // ---- Beispiel öffnen ----
  let oeffnet = $state(false);
  async function oeffneBeispiel() {
    const b = akt?.beispiel ? beispielNach(akt.beispiel) : undefined;
    if (!b || !einheit || !akt) return;
    oeffnet = true;
    try { await oeffneBeispielVonLernen(b, { einheit: einheit.id, schluessel: akt.schluessel, nr: nr + 1, schritt: akt.schritt! }); }
    catch (e) {
      meldeFehler(L('Das Beispiel ließ sich nicht öffnen. Bitte noch einmal versuchen.', 'The example could not be opened. Please try again.'));
      if (import.meta.env.DEV) console.warn(e);
    } finally { oeffnet = false; }
  }
  const aufgabe = $derived(akt?.art === 'rechnen' ? aufgabeNach(akt.ziel!) : undefined);
  const bsp = $derived(akt?.art === 'beispiel' ? beispielNach(akt.beispiel!) : undefined);
  const bspSchritt = $derived(bsp && akt ? bsp.schritte[akt.schritt!] : undefined);
  /** Abschnitte, die erst mit dem Hauptknopf „Weiter“ als erledigt zählen: der Knopf ersetzt dann den Weiter-Link. */
  const hatHauptknopf = $derived(!!akt && !istFertigJetzt && (akt.art === 'erklaerung' || akt.art === 'regler' || (akt.art === 'beispiel' && bspSchritt?.art === 'planen')));

  // ---- Fragen ----
  let uebenSeite = $state<{ id: string; titel: string }>();
  const auswahl = $derived(einheit?.fragen.length ? { id: einheit.id, titel: waehle(einheit.fach), themen: fragenThemen(einheit), ids: einheit.fragen } : undefined);

  // ---- Rand (Seitenleiste) ----
  const eigener = $derived(pfad ? eigenerPfad(pfad.id) : undefined);
  /** Die Seitenleiste gibt es in Einheiten und bei den eigenen Pfaden (Erstellen, Import, eigene Pfadseite). */
  const mitRand = $derived(!unbekannt && (ansicht === 'einheit' || ansicht === 'pruefung' || ansicht === 'bau' || ansicht === 'import' || (ansicht === 'pfad' && !!eigener)));
  /** Seitenleiste der Einheit (Usability Stufe 6): Dein Stand und „Als Nächstes“ statt des Kurztextes, den die Seite schon zeigt. */
  const randEinheit = $derived.by<RandKontext | null>(() => {
    if (!einheit || !akt) return null;
    const ok = zaehleFarben(farben).gruen, m = abs.length;
    const stand = [
      L(`Abschnitt ${nr + 1} von ${m}: ${abschnittsName(akt)}.`, `Section ${nr + 1} of ${m}: ${abschnittsName(akt)}.`),
      L(`${ok} von ${m} Abschnitten durchgemacht.`, `${ok} of ${m} sections completed.`),
      ...(fragenZahl.gesamt ? [L(`Fragen: ${fragenZahl.richtig} von ${fragenZahl.gesamt} richtig.`, `Questions: ${fragenZahl.richtig} of ${fragenZahl.gesamt} correct.`)] : []),
      ...(kontextPfad && naechste ? [L(`Im Pfad „${waehle(kontextPfad.name)}“: Einheit ${naechste.i + 1} von ${naechste.gesamt}, ${fertigIn(listeVon(kontextPfad.einheiten))} durchgemacht.`, `In the path "${waehle(kontextPfad.name)}": unit ${naechste.i + 1} of ${naechste.gesamt}, ${fertigIn(listeVon(kontextPfad.einheiten))} completed.`)] : [])
    ].join(' ');
    const weiter = nr < m - 1 ? { href: hrefNr(nr + 1), text: abschnittsName(abs[nr + 1]!) }
      : naechste?.einheit ? { href: `#lernen/${naechste.einheit.id}`, text: titelVon(naechste.einheit) }
      : kontextPfad ? { href: `#lernen/pfad/${kontextPfad.id}`, text: L('Zum Pfad', 'To the path') }
      : { href: '#lernen', text: L('Alle Pfade und Einheiten', 'All paths and units') };
    return { titel: waehle(einheit.fach), mehr: einheit.hilfe[0], absaetze: [{ titel: d('Dein Stand', 'Ihr Stand', 'Your progress'), text: stand }], linksTitel: L('Als Nächstes', 'Next'), links: [weiter] };
  });
  const randKontext = $derived<RandKontext | null>(randWahl.k ?? ((akt?.art === 'fragen' || ansicht === 'pruefung' || !!einheit?.abschlussVon) && uebenSeite
    ? { titel: uebenSeite.titel, artikel: uebenSeite.id, teile: ['kurz'] }
    : einheit?.hilfe[0] ? randEinheit
    : ansicht === 'bau' ? { titel: L('Eigenen Pfad erstellen', 'Create your own path'), mehr: 'eigene-lernpfade', absaetze: [
        { titel: L('So geht es', 'How it works'), text: d('Gib dem Pfad einen Namen, hake links Einheiten an und ordne sie rechts mit ↑ und ↓. Danach „Speichern“.', 'Geben Sie dem Pfad einen Namen, haken Sie links Einheiten an und ordnen Sie sie rechts mit ↑ und ↓. Danach „Speichern“.', 'Give the path a name, tick units on the left and put them in order on the right with ↑ and ↓. Then "Save".') },
        { titel: L('Viele Einheiten', 'Many units'), text: d('Das Suchfeld findet eine Einheit nach Fachbegriff oder Alltagsfrage. „Alle hinzufügen“ nimmt einen ganzen Bereich, „Ganzen Pfad übernehmen“ einen fertigen Pfad. Streichen kannst du danach.', 'Das Suchfeld findet eine Einheit nach Fachbegriff oder Alltagsfrage. „Alle hinzufügen“ nimmt einen ganzen Bereich, „Ganzen Pfad übernehmen“ einen fertigen Pfad. Streichen können Sie danach.', 'The search box finds a unit by technical term or everyday question. "Add all" takes a whole area, "Take over a whole path" a ready-made one. You can remove units afterwards.') },
        { titel: L('Wo liegt der Pfad?', 'Where is the path kept?'), text: d('Nur in diesem Browser, wie dein Lernstand. Es geht nichts an einen Server.', 'Nur in diesem Browser, wie Ihr Lernstand. Es geht nichts an einen Server.', 'Only in this browser, like your progress. Nothing goes to a server.') }
      ] }
    : ansicht === 'import' ? { titel: L('Geteilter Lernpfad', 'Shared learning path'), mehr: 'eigene-lernpfade', absaetze: [
        { titel: L('Was ist das?', 'What is this?'), text: d('Jemand hat dir einen Lernpfad geschickt: eine Liste von Einheiten in einer Reihenfolge. Hier siehst du sie, bevor etwas gespeichert wird.', 'Jemand hat Ihnen einen Lernpfad geschickt: eine Liste von Einheiten in einer Reihenfolge. Hier sehen Sie sie, bevor etwas gespeichert wird.', 'Someone sent you a learning path: a list of units in an order. Here you see it before anything is saved.') },
        { titel: L('Speichern', 'Saving'), text: d('„In meine Pfade speichern“ legt eine Kopie in diesem Browser an. Du kannst sie ändern. Dein Lernstand bleibt bei den Einheiten.', '„In meine Pfade speichern“ legt eine Kopie in diesem Browser an. Sie können sie ändern. Ihr Lernstand bleibt bei den Einheiten.', '"Save to my paths" creates a copy in this browser. You can change it. Your progress stays with the units.') }
      ] }
    : eigener ? { titel: d('Dein eigener Pfad', 'Ihr eigener Pfad', 'Your own path'), mehr: 'eigene-lernpfade', absaetze: [
        { titel: L('Teilen', 'Sharing'), text: d('„Teilen oder Übungsblatt“ zeigt einen Link. Wer ihn öffnet, kann den Pfad in seine Pfade speichern, zum Beispiel deine Studierenden. Dort lassen sich auch einzelne Fragen als Übungsblatt wählen und drucken.', '„Teilen oder Übungsblatt“ zeigt einen Link. Wer ihn öffnet, kann den Pfad in seine Pfade speichern, zum Beispiel Ihre Studierenden. Dort lassen sich auch einzelne Fragen als Übungsblatt wählen und drucken.', '"Share or practice sheet" shows a link. Whoever opens it can save the path to their paths, for example your students. There you can also choose single questions as a practice sheet and print them.') },
        { titel: L('Ändern', 'Changing'), text: d('„Bearbeiten“ öffnet die Auswahl. Wer den alten Link schon hat, behält die alte Fassung; schick dann einen neuen Link.', '„Bearbeiten“ öffnet die Auswahl. Wer den alten Link schon hat, behält die alte Fassung; schicken Sie dann einen neuen Link.', '"Edit" opens the selection. Whoever already has the old link keeps the old version; send a new link then.') }
      ] }
    : null));

  // ---- Pfad ----
  const naechste = $derived.by(() => {
    if (!einheit || !kontextPfad) return undefined;
    const i = kontextPfad.einheiten.indexOf(einheit.id);
    return { i, gesamt: kontextPfad.einheiten.length, einheit: einheitNach(kontextPfad.einheiten[i + 1] ?? '') };
  });
  const ersteOffene = (p: Pfad) => { const l = listeVon(p.einheiten); const f = einheitsFarben(st, l); return l[f.findIndex(x => x !== 'gruen')] ?? l[0]; };

  // ---- Startseite ----
  let suchFrage = $state('');
  const zuletzt = $derived.by(() => {
    const z = st.zuletzt, e = z ? einheitNach(z.einheit) : undefined;
    if (!z || !e) return undefined;
    const a = abschnitte(e), i = Math.max(0, a.findIndex(x => x.schluessel === z.schluessel));
    return { e, i, name: a[i] ? (a[i].art === 'erklaerung' ? L('Erklärung', 'Explanation') : a[i].art === 'rechnen' ? L('Selbst rechnen', 'Work it out yourself') : a[i].art === 'beispiel' ? L('Beispiel', 'Example') : a[i].art === 'regler' ? L('Regler', 'Slider') : L('Fragen', 'Questions')) : '' };
  });
  let dlg = $state<HTMLDialogElement>();
  let frageReset = $state(false);
  $effect(() => { if (frageReset && dlg && !dlg.open) { dlg.showModal(); tick().then(() => document.getElementById('ln-reset-nein')?.focus()); } else if (!frageReset && dlg?.open) dlg.close(); });
  function zuruecksetzen(ja: boolean) { frageReset = false; if (ja) lernZuruecksetzen(); }
  const gruppen = $derived(BEREICHE_LERNEN.map(b => ({ b, liste: EINHEITEN.filter(e => e.bereich === b.id) })).filter(g => g.liste.length));

  // ---- Übersicht: links Themen oder Lernpfade, rechts die Einheiten ----
  /** Ohne Wahl in der Adresse: das Thema, an dem zuletzt gelernt wurde, sonst das erste. */
  const themaId = $derived(ansicht === 'thema' ? teile[1]! : untrack(() => zuletzt?.e.bereich) ?? gruppen[0]!.b.id);
  const gruppe = $derived(gruppen.find(g => g.b.id === themaId));
  /** Erstbesuch und Rückkehr (Usability Stufe 6): `#lernen` zeigt den Pfad „Statistik von Anfang an 1“ - oder den Pfad der zuletzt gelernten Einheit. Nur eine Anzeige: die Adresse bleibt `#lernen`, `pfad` bleibt wie es war. */
  const ohneStand = $derived(!st.zuletzt && !Object.values(st.fertig).some(a => a.length) && !st.richtig.length);
  const startPfad = $derived.by(() => {
    if (ansicht !== 'start') return undefined;
    const alle = allePfade(), grund = alle.find(p => p.id === 'grundlagen');
    if (ohneStand || !zuletzt) return grund;
    const mit = alle.filter(p => p.einheiten.includes(zuletzt.e.id));
    return mit.find(p => p.id.startsWith('grundlagen')) ?? mit[0];
  });
  /** Der Pfad, den Menü und rechte Liste zeigen: der in der Adresse, sonst der der Startwahl. */
  const zp = $derived(pfad ?? startPfad);
  const zeigtPfade = $derived(ansicht === 'pfad' || !!startPfad);
  const hierAnfangen = $derived(ansicht === 'start' && ohneStand);
  const pfadGr = $derived(pfadGruppen(allePfade(), id => !!eigenerPfad(id)));
  const zpListe = $derived(zp ? listeVon(zp.einheiten) : []);
  const rechtsListe = $derived(zp ? zpListe : gruppe?.liste ?? []);
  const rechtsFarben = $derived(einheitsFarben(st, rechtsListe));
  const fertigIn = (l: Einheit[]) => zaehleFarben(einheitsFarben(st, l)).gruen;
  const zaehler = (l: Einheit[]) => { const f = fertigIn(l); return f ? `${f}/${l.length}` : `${l.length}`; };
  const standVon = (l: Einheit[]) => {
    const z = zaehleFarben(einheitsFarben(st, l));
    return z.rot ? L(`${z.gruen} von ${l.length} Einheiten durchgemacht, ${z.rot} übersprungen`, `${z.gruen} of ${l.length} units completed, ${z.rot} skipped`) : L(`${z.gruen} von ${l.length} Einheiten durchgemacht`, `${z.gruen} of ${l.length} units completed`);
  };
  const ringName = (e: Einheit) => { const rot = zaehleFarben(abschnittsFarben(st, e)).rot; return rot ? `${einheitStandText(e)}, ${L(`${rot} übersprungen`, `${rot} skipped`)}` : einheitStandText(e); };
  /** „Einheit 4 von 16: durchgemacht“ - der Stand einer Einheit in der Liste als Text, nie nur im Ring (der Ring ist dort für Vorlesegeräte versteckt). */
  const zeilenStand = (e: Einheit, i: number, n: number) => `${L(`Einheit ${i + 1} von ${n}`, `Unit ${i + 1} of ${n}`)}: ${ringName(e)}.`;
  const menueStand = (l: Einheit[]) => L(`${fertigIn(l)} von ${l.length} durchgemacht`, `${fertigIn(l)} of ${l.length} completed`);
  const abschnittZahl = (e: Einheit) => { if (e.abschlussVon) return L('Test', 'Test'); const f = abschnittsFarben(st, e), ok = zaehleFarben(f).gruen; return L(`${ok} von ${f.length}`, `${ok} of ${f.length}`); };
  // ---- Eigene Pfade: teilen, löschen ----
  let teilen = $state(false);
  let loeschFrage = $state(false);
  let kopiert = $state('');
  // Nur beim Wechsel des Pfads zuklappen, nicht wenn sich der Pfad selbst ändert (Übungsblatt wählen erzeugt ein neues Pfad-Objekt).
  const pfadId = $derived(pfad?.id);
  $effect(() => { void pfadId; teilen = false; loeschFrage = false; kopiert = ''; });
  // Kurzlink vom Server (statable.eu/l/<name>); ohne Server oder bei Fehler der lange Link, der alles selbst trägt.
  let kurzLink = $state(''), kurzLaeuft = $state(false);
  const kurzAnim = verzoegert(() => kurzLaeuft);
  $effect(() => {
    const p = teilen ? eigener : undefined;
    kurzLink = ''; kurzLaeuft = false;
    if (!p || !KURZLINK_SERVER) return;
    // Mit Übungsblatt kein Kurzlink: der Server legt nur Name und Einheiten ab, der lange Link trägt die Fragen selbst.
    if (p.blatt) { kurzLink = teilLink(p); return; }
    let aus = false; kurzLaeuft = true;
    void holeKurzlink(p.name, p.einheiten, p.pruefung !== false).then(l => { if (aus) return; kurzLink = l ?? teilLink(p); kurzLaeuft = false; });
    return () => { aus = true; };
  });
  const linkText = $derived(eigener && teilen ? (KURZLINK_SERVER ? kurzLink : teilLink(eigener)) : '');
  async function kopiereLink() {
    try { await navigator.clipboard.writeText(linkText); kopiert = L('Link kopiert.', 'Link copied.'); }
    catch { kopiert = d('Kopieren ging nicht. Markiere den Link und kopiere ihn selbst.', 'Kopieren ging nicht. Markieren Sie den Link und kopieren Sie ihn selbst.', 'Copying did not work. Select the link and copy it yourself.'); document.getElementById('ln-teil-link')?.focus(); }
  }
  // ---- V4: Pfad als SCORM-Paket für Moodle (lib/scorm.ts). Immer der lange Link, der alles selbst trägt (Kurzlinks kennen kein Übungsblatt).
  let scormStatus = $state('');
  /** Nur mit Abschlusstest oder Übungsblatt: daran misst das Paket „abgeschlossen“. */
  const scormGeht = $derived(!!eigener && alsPfad(eigener).einheiten.length > eigener.einheiten.length);
  $effect(() => { void pfadId; scormStatus = ''; });
  async function speichereScorm() {
    if (!eigener) return;
    try {
      const [{ baueScormPaket, scormLink, dateinameScorm }, { herunterladen }] = await Promise.all([import('../lib/scorm'), import('../lib/export')]);
      const link = scormLink(teilLink(eigener));
      const bytes = baueScormPaket({ titel: eigener.name, link, kennung: eigener.id }, {
        sprache: aktuelleSprache(),
        einleitung: d('Diese Übung läuft in Statable, einer freien Statistik-Software im Browser. Mit dem Knopf öffnet sich Statable in einem eigenen Fenster. Speichere dort den Pfad, geh die Einheiten durch und beantworte am Ende alle Fragen. Dann gilt die Übung hier als abgeschlossen. Es gibt keine Punkte.', 'Diese Übung läuft in Statable, einer freien Statistik-Software im Browser. Mit dem Knopf öffnet sich Statable in einem eigenen Fenster. Speichern Sie dort den Pfad, gehen Sie die Einheiten durch und beantworten Sie am Ende alle Fragen. Dann gilt die Übung hier als abgeschlossen. Es gibt keine Punkte.', 'This exercise runs in Statable, free statistics software in the browser. The button opens Statable in a window of its own. Save the path there, work through the units and answer all questions at the end. The exercise then counts as completed here. There are no points.'),
        knopf: L('Statable öffnen', 'Open Statable'),
        hinweisFenster: d('Lass diese Seite offen, solange du übst: Sie meldet den Abschluss an die Lernplattform. Deine Antworten bleiben in deinem Browser.', 'Lassen Sie diese Seite offen, solange Sie üben: Sie meldet den Abschluss an die Lernplattform. Ihre Antworten bleiben in Ihrem Browser.', 'Keep this page open while you practise: it reports the completion to the learning platform. Your answers stay in your browser.'),
        ohneLms: L('Keine Lernplattform gefunden. Statable lässt sich trotzdem öffnen; ein Abschluss wird dann nicht gemeldet.', 'No learning platform found. Statable can still be opened; a completion will not be reported then.'),
        verbunden: L('Mit der Lernplattform verbunden. Stand: begonnen.', 'Connected to the learning platform. Status: started.'),
        fertig: L('Abgeschlossen. Die Lernplattform hat den Abschluss gespeichert.', 'Completed. The learning platform has saved the completion.'),
        schonFertig: L('Diese Übung ist schon abgeschlossen. Statable lässt sich zum Wiederholen öffnen.', 'This exercise is already completed. Statable can be opened to repeat it.'),
        blockiert: d('Das Fenster wurde blockiert. Erlaube Pop-up-Fenster für diese Seite und klicke noch einmal.', 'Das Fenster wurde blockiert. Erlauben Sie Pop-up-Fenster für diese Seite und klicken Sie noch einmal.', 'The window was blocked. Allow pop-up windows for this page and click again.'),
        linkText: L('Ohne Meldung an die Lernplattform geht auch dieser Link:', 'Without reporting to the learning platform, this link also works:')
      });
      herunterladen(bytes, dateinameScorm(eigener.name), 'application/zip');
      scormStatus = L('Das Paket ist gespeichert (meist im Ordner „Downloads“). In Moodle: Aktivität „Lernpaket“ (SCORM) anlegen und die ZIP-Datei hochladen.', 'The package is saved (usually in the "Downloads" folder). In Moodle: add the activity "SCORM package" and upload the ZIP file.');
    } catch { scormStatus = L('Das Paket ließ sich nicht speichern.', 'The package could not be saved.'); }
    sage(scormStatus);
  }
  function loesche() { if (!eigener) return; const id = eigener.id; loescheEigenen(id); location.hash = 'lernen/pfad/' + (allePfade()[0]?.id ?? ''); }
  let listeEl = $state<HTMLElement>();
  let zuletztListe = '';
  $effect(() => {
    if (ansicht === 'einheit') { zuletztListe = ''; return; }
    const k = `${ansicht}/${teil}`;
    if (zuletztListe && k !== zuletztListe) tick().then(() => listeEl?.focus());
    zuletztListe = k;
  });
</script>

<div class="tisch" class:ohne-rand={!mitRand}><section class="blatt rund vst ln" class:ln-mit-band={ansicht === 'einheit' && !unbekannt && !einheit?.abschlussVon} aria-label={L('Lernen', 'Learning')}>
  {#if unbekannt}
    <SeitenKopf titelId={KOPF_ID} titel={L('Lernen', 'Learning')} />
    <p role="status">{L('Diese Seite gibt es nicht (mehr).', 'This page does not exist (any more).')} <a href="#lernen">{L('Zur Übersicht von Lernen', 'To the Learning overview')}</a></p>

  {:else if ansicht === 'einheit' && einheit?.abschlussVon}
    {#key einheit.id}<PfadAbschluss pfad={pfadFinden(einheit.abschlussVon) ?? PFADE[0]!} bind:seite={uebenSeite} />{/key}

  {:else if ansicht === 'einheit' && einheit && akt}
    <div class="ln-band">
      <SeitenKopf titelId="ln-t" fokussierbar bind:h1El titel={waehle(einheit.fach)} zurueck={kontextPfad ? `lernen/pfad/${kontextPfad.id}` : `lernen/thema/${einheit.bereich}`}>
        {#snippet untertitel()}<p>{waehle(einheit.alltag)}</p>{/snippet}
      </SeitenKopf>
      <p class="ln-pfad">
        {#if kontextPfad && naechste}{L('Pfad: ', 'Path: ')}<a href="#lernen/pfad/{kontextPfad.id}">{waehle(kontextPfad.name)}</a>{' '}({L(`Einheit ${naechste.i + 1} von ${naechste.gesamt}`, `unit ${naechste.i + 1} of ${naechste.gesamt}`)}){/if}
        {#each pfadeVon(einheit.id).filter(p => p.id !== kontextPfad?.id) as p, k}{k === 0 ? (kontextPfad ? ' · ' + L('Auch in: ', 'Also in: ') : L('In den Pfaden: ', 'In the paths: ')) : ', '}<a href="#lernen/pfad/{p.id}">{waehle(p.name)}</a>{/each}
      </p>
      <LernBalken {punkte} aktuell={nr} beschriftung={L('Fortschritt in dieser Einheit', 'Progress in this unit')} />
    </div>

    <div class="ln-koerper">
    <section class="ln-abschnitt" aria-label={L('Abschnitt', 'Section')}>
      <h2 id="ln-abs-t" tabindex="-1" bind:this={absEl}>{ueberschrift}</h2>

      {#if akt.art === 'erklaerung'}
        {#if artikelFehler}
          <p role="alert">{L('Die Erklärung konnte nicht geladen werden (kein Netz?).', 'The explanation could not be loaded (no connection?).')} <button type="button" class="k leise" onclick={() => { artikelFehler = false; }}>{L('Nochmal versuchen', 'Try again')}</button></p>
        {:else if !hilfeArtikel.length}
          <p role="status">{#if animAn.an}<Rechnet text={L('Erklärung wird geladen …', 'Loading the explanation …')} />{/if}</p>
        {:else}
          {#if erkl}
            {@const neben = !!(erkl.mehr.length || erkl.uebrige.length || erkl.statable.length || karteName || einheit?.ausprobieren?.length)}
            <div class="ln-spalten" class:mit-neben={neben}><div class="ln-spalten-haupt">
            {#if erkl.kurz.length}
              <div class="ln-artikel"><h3>{erkl.haupt.titel}</h3><ArtikelBloecke bloecke={erkl.kurz} /></div>
            {/if}
            {#if erkl.begriffe.length}
              <h3>{L('Was ist das?', 'What is this?')}</h3>
              {#each erkl.begriffe as a, k (a.id)}
                {#if k === 0}
                  <div class="ln-artikel"><h4>{a.titel}</h4><ArtikelBloecke bloecke={a.inhalt} offen={a.offen ?? []} />{#if a !== erkl.haupt}<p><a href="#hilfe/{a.id}">{L('In der Hilfe lesen', 'Read in the help')}</a></p>{/if}</div>
                {:else}
                  <details class="auf ln-mehr"><summary>{a.titel}</summary>
                    <ArtikelBloecke bloecke={a.inhalt} offen={a.offen ?? []} />
                    <p><a href="#hilfe/{a.id}">{L('In der Hilfe lesen', 'Read in the help')}</a></p>
                  </details>
                {/if}
              {/each}
            {/if}
            </div><div class="ln-spalten-neben">
            {#if erkl.mehr.length || erkl.uebrige.length}
              <h3>{L(`Mehr zu „${erkl.haupt.titel}“`, `More on "${erkl.haupt.titel}"`)}</h3>
              {#if erkl.mehr.length}<ArtikelBloecke bloecke={erkl.mehr} offen={[]} />{/if}
              {#each erkl.uebrige as a (a.id)}
                <details class="auf ln-mehr"><summary>{a.titel}</summary>
                  <ArtikelBloecke bloecke={a.inhalt} offen={a.offen ?? []} />
                  <p><a href="#hilfe/{a.id}">{L('In der Hilfe lesen', 'Read in the help')}</a></p>
                </details>
              {/each}
            {/if}
            {#if erkl.statable.length || karteName || einheit?.ausprobieren?.length}
              <details class="auf ln-mehr"><summary>{L('So geht es in Statable', 'How it works in Statable')}</summary>
                {#if erkl.statable.length}<ArtikelBloecke bloecke={erkl.statable} />{/if}
                {#if karteName}<p><a href="#blatt/neu">{L('Rechenkarte in Statable: ', 'Calculation card in Statable: ')}{karteName}</a></p>{/if}
                {#if einheit?.ausprobieren?.length}<p>{L('In Statable ausprobieren: ', 'Try it in Statable: ')}{#each einheit.ausprobieren as z, k}{k ? ' · ' : ''}<a href={z.adresse}>{waehle(z.titel)}</a>{/each}</p>{/if}
              </details>
            {/if}
            <p><a href="#hilfe/{erkl.haupt.id}">{L('Ganzen Artikel in der Hilfe lesen', 'Read the full article in the help')}</a></p>
            </div></div>
          {/if}
        {/if}
        {#if !istFertigJetzt}<div class="ln-knoepfe"><button type="button" class="k haupt" onclick={fertigUndWeiter}>{nr < abs.length - 1 ? L('Weiter', 'Next') : L('Fertig', 'Done')}</button></div>
        {:else}<p class="ln-stand">{L('Gelesen.', 'Read.')}</p>{/if}

      {:else if akt.art === 'rechnen' && aufgabe}
        {#key akt.schluessel}<RechenAufgabe {aufgabe} fertig={istFertigJetzt} beiFertig={() => { if (einheit && akt) lernFertig(einheit, akt.schluessel); }} />{/key}
        {#if istFertigJetzt}<p class="ln-stand">{L('Durchgemacht.', 'Completed.')}</p>{/if}

      {:else if akt.art === 'beispiel' && bsp && bspSchritt}
        <div class="ln-spalten mit-neben"><div class="ln-spalten-haupt">
        <p>{t(bsp.kurz)}</p>
        <h3>{L('Die Geschichte', 'The story')}</h3>
        <p>{t(bsp.geschichte)}</p>
        </div><div class="ln-spalten-neben">
        <h3>{L(`Schritt ${akt.schritt! + 1} von ${bsp.schritte.length}: `, `Step ${akt.schritt! + 1} of ${bsp.schritte.length}: `)}{t(bspSchritt.titel)}</h3>
        <p>{t(bspSchritt.text)}</p>
        <div class="ln-knoepfe">
          <button type="button" class="k haupt" disabled={oeffnet} onclick={oeffneBeispiel}>{#if oeffnet}<Rechnet imKnopf text={L('Wird geöffnet …', 'Opening …')} />{:else}{L('Beispiel öffnen', 'Open the example')}{/if}</button>
        </div>
        {#if istFertigJetzt}<p class="ln-stand">{L('Durchgemacht.', 'Completed.')}</p>
        {:else if bspSchritt.art === 'planen'}<div class="ln-knoepfe"><button type="button" class="k haupt" onclick={fertigUndWeiter}>{nr < abs.length - 1 ? L('Weiter', 'Next') : L('Fertig', 'Done')}</button></div>
        {:else}<p class="ln-hinweis">{L('Es öffnen sich nur die Spalten dieses Schritts; ein kleines Fenster begleitet durch den Schritt. Sobald dort die Frage geöffnet und gerechnet ist, zählt dieser Abschnitt als durchgemacht.', 'Only the columns of this step open; a small window guides you through the step. As soon as the question has been opened and calculated there, this section counts as completed.')}</p>{/if}
        </div></div>

      {:else if akt.art === 'regler'}
        {#key akt.schluessel}<LernRegler ziel={akt.ziel!} />{/key}
        <p><a href="#verstehen/{akt.ziel}">{L('Als eigene Seite öffnen', 'Open as a page of its own')}</a></p>
        {#if !istFertigJetzt}<div class="ln-knoepfe"><button type="button" class="k haupt" onclick={fertigUndWeiter}>{nr < abs.length - 1 ? L('Weiter', 'Next') : L('Fertig', 'Done')}</button></div>
        {:else}<p class="ln-stand">{L('Ausprobiert.', 'Tried.')}</p>{/if}

      {:else if akt.art === 'fragen'}
        <p class="ln-stand" use:ergebnisAnsage>{L(`${fragenZahl.richtig} von ${fragenZahl.gesamt} richtig`, `${fragenZahl.richtig} of ${fragenZahl.gesamt} correct`)}</p>
        {#if auswahl}<VerstehenUeben {auswahl} beiAntwort={(f, ok) => { if (ok) lernRichtig(f.id); }} bind:seite={uebenSeite} />{/if}
      {/if}

      <div class="ln-weiter">
        {#if nr > 0}<a class="k leise" href={hrefNr(nr - 1)}><Icon n="links" />{L('Zurück', 'Back')}</a>{/if}
        {#if nr < abs.length - 1 && !hatHauptknopf}<a class="k haupt" href={hrefNr(nr + 1)}>{L('Weiter', 'Next')}</a>{/if}
      </div>
    </section>

    {#if nr >= abs.length - 1}
    <section class="ln-naechste" aria-labelledby="ln-nae-t">
      <h2 id="ln-nae-t">{L('Nächste Einheit im Pfad', 'Next unit in the path')}</h2>
      {#if naechste?.einheit}
        <p><a class="k" href="#lernen/{naechste.einheit.id}">{titelVon(naechste.einheit)}</a></p>
      {:else if kontextPfad}
        <p>{L('Das war die letzte Einheit dieses Pfads.', 'This was the last unit of this path.')} <a href="#lernen/pfad/{kontextPfad.id}">{L('Zum Pfad', 'To the path')}</a></p>
      {/if}
      <p><a href="#lernen">{L('Alle Pfade und Einheiten', 'All paths and units')}</a></p>
    </section>
    {/if}
    </div>

  {:else if ansicht === 'pruefung' && pruefPfad}
    {#key pruefPfad.id}<PfadAbschluss pfad={pruefPfad} bind:seite={uebenSeite} />{/key}

  {:else if ansicht === 'bau'}
    {#key teile[1]}<PfadBau id={teile[1] || undefined} />{/key}

  {:else if ansicht === 'import'}
    {#key teile.join('/')}<PfadImport code={teile[0] === 'import' ? (teile[1] ?? '') : ''} kurz={teile[0] === 'l' ? (teile[1] ?? '') : undefined} />{/key}

  {:else}
    <SeitenKopf titelId={KOPF_ID} titel={L('Lernen', 'Learning')} />
    <div class="ln-oben">
      <div class="ln-suche" class:sucht={!!suchFrage.trim()}><LernSuche bind:frage={suchFrage} /></div>
      {#if zuletzt && !suchFrage.trim()}<a class="k haupt ln-weiterlernen" href="#lernen/{zuletzt.e.id}/{zuletzt.i + 1}">{L('Weiter mit', 'Continue with')}: {waehle(zuletzt.e.fach)}</a>{/if}
    </div>
    {#if !suchFrage.trim()}
      <div class="ln-zwei">
        <nav class="ln-seite" aria-label={L('Themen und Lernpfade', 'Topics and learning paths')}>
          <div class="ln-wahl">
            <a href="#lernen/thema/{themaId}" aria-current={zeigtPfade ? undefined : 'true'}>{L('Themen', 'Topics')}</a>
            <a href="#lernen/pfad/{zp?.id ?? PFADE[0]!.id}" aria-current={zeigtPfade ? 'true' : undefined}>{L('Lernpfade', 'Learning paths')}</a>
          </div>
          <ul class="ln-menue">
            {#if zeigtPfade}
              {#each pfadGr as g (g.id)}
                <li class="ln-gruppe"><details class="auf" open={g.id === 'eigene' || g.id === 'grundlagen' || g.pfade.some(p => p.id === zp?.id)}>
                  <summary>{g.id === 'fach' ? d('Für dein Fach', 'Für Ihr Fach', 'For your subject') : waehle(g.name)}<span class="ln-gruppe-zahl" aria-hidden="true"> ({g.pfade.length})</span><span class="nur-vorleser">, {Lp(g.pfade.length, '1 Lernpfad', `${g.pfade.length} Lernpfade`, '1 learning path', `${g.pfade.length} learning paths`)}</span></summary>
                  <ul class="ln-menue">
                    {#each g.pfade as p (p.id)}
                      {@const l = listeVon(p.einheiten)}
                      <li><a href="#lernen/pfad/{p.id}" aria-current={p.id === zp?.id ? 'true' : undefined}><LernZeichen id={p.id} /><span class="ln-menue-name">{waehle(p.name)}{#if hierAnfangen && p.id === 'grundlagen'}<span class="ln-marke">{L('Hier anfangen', 'Start here')}</span>{/if}</span><span class="ln-menue-zahl" aria-hidden="true">{zaehler(l)}</span><span class="nur-vorleser">{menueStand(l)}</span></a></li>
                    {/each}
                  </ul>
                </details></li>
              {/each}
              <li><a class="ln-neu" href="#lernen/pfadbau"><span class="ln-neu-plus" aria-hidden="true">+</span><span class="ln-menue-name">{L('Eigenen Pfad erstellen', 'Create your own path')}</span></a></li>
            {:else}
              {#each gruppen as g (g.b.id)}
                <li><a href="#lernen/thema/{g.b.id}" aria-current={g.b.id === themaId ? 'true' : undefined}><LernZeichen id={g.b.id} /><span class="ln-menue-name">{waehle(g.b.name)}</span><span class="ln-menue-zahl" aria-hidden="true">{zaehler(g.liste)}</span><span class="nur-vorleser">{menueStand(g.liste)}</span></a></li>
              {/each}
            {/if}
          </ul>
        </nav>

        <section class="ln-inhalt" aria-label={L('Einheiten', 'Units')}>
          <div class="ln-inhalt-kopf">
            <div>
              <h2 id="ln-liste-t" tabindex="-1" bind:this={listeEl}>{zp ? waehle(zp.name) : gruppe ? waehle(gruppe.b.name) : ''}</h2>
              <p class="ln-klein">{standVon(rechtsListe)}{#if zp}. {L('Alle sind frei anklickbar, die Reihenfolge ist ein Vorschlag.', 'All can be opened freely; the order is a suggestion.')}{/if}</p>
            </div>
            {#if zp && zpListe.length}<a class="k haupt" href="#lernen/{ersteOffene(zp)?.id}">{hierAnfangen ? L('Hier anfangen', 'Start here') : rechtsFarben.some(f => f === 'gruen') ? L('Weiterlernen', 'Continue') : L('Anfangen', 'Start')}</a>{/if}
          </div>
          {#if eigener}
            <div class="ln-eigen-knoepfe">
              <button type="button" class="k" aria-expanded={teilen} onclick={() => (teilen = !teilen)}>{L('Teilen oder Übungsblatt', 'Share or practice sheet')}</button>
              <a class="k" href="#lernen/pfadbau/{eigener.id}">{L('Bearbeiten', 'Edit')}</a>
              {#if !loeschFrage}<button type="button" class="k leise" onclick={() => (loeschFrage = true)}>{L('Löschen', 'Delete')}</button>
              {:else}<span class="ln-loesch" role="group" aria-label={L('Pfad löschen?', 'Delete the path?')}>{L('Pfad wirklich löschen?', 'Really delete the path?')} <button type="button" class="k haupt" onclick={loesche}>{L('Ja, löschen', 'Yes, delete')}</button> <button type="button" class="k leise" onclick={() => (loeschFrage = false)}>{L('Nein', 'No')}</button></span>{/if}
            </div>
            {#if teilen}
              <div class="ln-teilen">
                <label for="ln-teil-link">{d('Diesen Link schickst du an andere. Wer ihn öffnet, kann den Pfad in seine Pfade speichern.', 'Diesen Link schicken Sie an andere. Wer ihn öffnet, kann den Pfad in seine Pfade speichern.', 'Send this link to others. Anyone who opens it can save the path to their paths.')}</label>
                <div class="pb-reihe"><input id="ln-teil-link" type="text" readonly value={linkText} aria-busy={kurzLaeuft ? 'true' : undefined} onfocus={(e) => e.currentTarget.select()} /><button type="button" class="k haupt" disabled={!linkText} onclick={kopiereLink}>{#if kurzAnim.an}<Rechnet imKnopf text={L('Link wird erstellt …', 'Creating the link …')} />{:else}{L('Link kopieren', 'Copy link')}{/if}</button></div>
                <p class="ln-klein" role="status">{kopiert}</p>
                <p class="ln-klein">{d('Der Link enthält nur den Namen, die Liste der Einheiten und die Fragen des Übungsblatts. Änderst du den Pfad später, schick einen neuen Link.', 'Der Link enthält nur den Namen, die Liste der Einheiten und die Fragen des Übungsblatts. Ändern Sie den Pfad später, schicken Sie einen neuen Link.', 'The link contains only the name, the list of units and the questions of the practice sheet. If you change the path later, send a new link.')}{#if KURZLINK_SERVER && kurzLink.includes('/l/')}{' '}{L('Name und Einheiten liegen dafür auf dem Server von Statable, ohne Angaben zu Personen.', 'For this, the name and units are stored on the Statable server, without any personal data.')}{/if}</p>
                <div class="ln-scorm">
                  {#if scormGeht}
                    <button type="button" class="k" onclick={speichereScorm}>{L('Für Moodle speichern (SCORM-Paket)', 'Save for Moodle (SCORM package)')}</button>
                    <span class="ln-klein">{L('Als Lernpaket in Moodle und anderen Lernplattformen; „abgeschlossen“, sobald alle Fragen am Ende beantwortet sind.', 'As a learning package in Moodle and other learning platforms; "completed" once all questions at the end are answered.')}</span>
                  {:else}
                    <span class="ln-klein">{L('Für ein Moodle-Paket (SCORM) braucht der Pfad eine Abschlussprüfung oder ein Übungsblatt.', 'For a Moodle package (SCORM) the path needs a final test or a practice sheet.')}</span>
                  {/if}
                </div>
                {#if scormStatus}<p class="ln-klein">{scormStatus}</p>{/if}
                <UebungsblattWahl pfad={eigener} />
              </div>
            {/if}
          {/if}
          <ol class="ln-zeilen">
            {#each rechtsListe as e, i (e.id)}
              <li><a href="#lernen/{e.id}">
                <LernRing stuecke={ringStuecke(st, e)} name="" />
                <span class="ln-zeile-text"><strong>{#if zp}{i + 1}.{' '}{/if}{waehle(e.fach)}</strong><span class="ln-klein">{waehle(e.alltag)}</span><span class="nur-vorleser">{zeilenStand(e, i, rechtsListe.length)}</span></span>
                <span class="ln-klein ln-zeile-zahl" aria-hidden="true">{abschnittZahl(e)}</span>
              </a></li>
            {/each}
          </ol>
          {#if zp?.weiter && pfadNach(zp.weiter)}<p class="ln-teilweiter"><a class="k" href="#lernen/pfad/{zp.weiter}">{L('Weiter mit ', 'Continue with ')}{waehle(pfadNach(zp.weiter)!.name)}</a></p>{/if}
        </section>
      </div>

      <p class="ln-links"><a class="k" href="#beispiele">{L('Alle Beispiele', 'All examples')}</a> <a class="k" href="#verstehen">{L('Rechner und Regler', 'Calculators and sliders')}</a> {#if zeigtPfade}<a class="k" href="#hilfe/eigene-lernpfade">{L('Hilfe: eigene Lernpfade', 'Help: your own learning paths')}</a>{/if} <button type="button" class="k leise" onclick={() => (frageReset = true)}>{L('Stand zurücksetzen', 'Reset progress')}</button></p>
      <p class="ln-datenschutz ln-klein">{d('Dein Stand bleibt nur in diesem Browser.', 'Ihr Stand bleibt nur in diesem Browser.', 'Your progress stays in this browser only.')}</p>
    {/if}
  {/if}
</section>{#if randKontext && mitRand}<Rand kontext={randKontext} mitVerlauf={false} />{/if}</div>

<dialog bind:this={dlg} use:dialogFokus aria-labelledby="ln-reset-t" aria-describedby="ln-reset-text" oncancel={(e) => { e.preventDefault(); zuruecksetzen(false); }}>
  {#if frageReset}
    <div class="dialog-innen">
      <div class="dialog-kopf"><Icon n="hinweis" k="hw" /><h2 id="ln-reset-t">{L('Lernstand zurücksetzen?', 'Reset your progress?')}</h2></div>
      <p id="ln-reset-text">{L('Alle Haken, übersprungenen Abschnitte und beantworteten Fragen in diesem Browser sind dann weg. Die Einheiten selbst bleiben.', 'All checks, skipped sections and answered questions in this browser will be gone. The units themselves stay.')}</p>
      <div class="knopfzeile">
        <button class="k haupt" type="button" onclick={() => zuruecksetzen(true)}>{L('Zurücksetzen', 'Reset')}</button>
        <button class="k leise" id="ln-reset-nein" type="button" onclick={() => zuruecksetzen(false)}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </div>
  {/if}
</dialog>
