<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { s, L, aktuelleSprache, spracheWaehlen, einstSpeichern, THEMA_GEWAEHLT, type Thema } from '../lib/sitzung.svelte';
  import { FREIGEGEBEN, SPRACHNAMEN, type Sprache } from '../i18n/laufzeit';
  import { VERFAHREN } from '../lib/verfahren';
  import { artikelModul } from '../hilfe/artikel-laden';
  import { suche } from '../hilfe/suche';
  import type { Artikel } from '../hilfe/kern';
  import { stufe } from '../lib/groesse.svelte';
  import { sage } from '../lib/ansage';
  import { palette, schliessePalette } from '../lib/palette.svelte';
  import Icon from './Icon.svelte';
  import { oeffneBegriff } from '../lib/begriffsrand.svelte';
  import { fachbegriffeImBereich } from '../lib/begriffsverlinker';
  import { dialogFokus } from './dialogFokus';
  import { verzoegert } from '../lib/laedt.svelte';
  import Rechnet from './Rechnet.svelte';
  import { verlangeLesemodus } from '../lib/lesemodus.svelte';
  import {
    rangiere, anzeige, auswertungen, lerneinheiten, beispieleEintraege, rechner, qualitaetEintraege, seiten, hilfeArtikel, fachbegriffe, lesemodusEintrag, einstellungen, exporte, abschnittBegriffe, kuerzelEintraege, holeKuerzel,
    type Eintrag, type Quelle, type Aktion, setzeKuerzelQuelle,
  } from '../lib/palette-treffer';
  import { KUERZEL, AKTIONEN, zeige } from '../lib/kuerzel';
  import { qualitaetKarten } from '../lib/qualitaet';
  import { EINHEITEN } from '../lernen/lernplan';
  import { BEISPIELE, t as paar } from '../lib/beispiele';
  import { verstehenTitel } from '../lib/verstehen-titel';
  import { einstellungsTitel, einstellungsGruppen } from '../lib/einstellungs-titel';

  /** Die Kürzel kommen aus der einen Liste `lib/kuerzel.ts` (Auftrag A); die Auswahl sagt die Tasten an. */
  setzeKuerzelQuelle(() => KUERZEL.map(k => ({ id: k.id, text: k.text(), tasten: zeige(k.anzeige), wirkung: k.wirkung(), ausfuehren: k.id === 'meldungen' ? () => AKTIONEN.meldungen?.({ key: 'm', code: 'KeyM', altKey: true, ctrlKey: false, metaKey: false, shiftKey: false }) : undefined })));

  /** Befehlspalette (Strg+K): ein Fenster mit Suchfeld und Trefferliste für Auswertungen, Seiten, Hilfe, Einstellungen, Export, Fachbegriffe und Kürzel.
   *  Aufbau nach `seiten/Hilfe.svelte` (Combobox mit Listbox); die Logik der Treffer steht in `lib/palette-treffer.ts`. Geöffnet wird über `palette.offen`. */
  let dlg = $state<HTMLDialogElement>();
  let feld = $state<HTMLInputElement>();
  let frage = $state('');
  let aktiv = $state(0);
  let beschaeftigt = $state(false);

  /** Beim Öffnen gemerkt (bevor das Fenster die Seite abdeckt): Fachwörter des Hauptbereichs und die Export-Menüs der Seite. */
  let knoepfe = $state<{ id: string; text: string }[]>([]);
  let knopfElemente: HTMLButtonElement[] = [];
  let menueKnoepfe = $state<{ name: string }[]>([]);
  let menueElemente: HTMLButtonElement[] = [];

  /** Hilfe (rund 200 KB) erst laden, wenn die Palette zum ersten Mal in einer Sprache aufgeht. */
  let modul = $state<typeof import('../hilfe/artikel')>();
  let geladenFuer = $state<Sprache>();
  let ladefehler = $state(false);
  const animAn = verzoegert(() => palette.offen && !modul && !ladefehler);
  const laden = () => { ladefehler = false; const sp = aktuelleSprache(); artikelModul(sp).then(m => { modul = m; geladenFuer = sp; }, () => (ladefehler = true)); };

  function sammle() {
    const haupt = document.querySelector<HTMLElement>('main#inhalt') ?? document;
    knopfElemente = fachbegriffeImBereich(haupt);
    knoepfe = knopfElemente.map(b => ({ id: b.dataset.gl ?? '', text: b.textContent ?? '' }));
    menueElemente = [...document.querySelectorAll<HTMLButtonElement>('.em > button[aria-haspopup="menu"]')].filter(b => !b.closest('[hidden],[inert],[aria-hidden="true"]') && b.getClientRects().length > 0);
    menueKnoepfe = menueElemente.map(b => ({ name: b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '' }));
  }

  $effect(() => {
    void palette.mal;
    if (palette.offen) {
      untrack(() => {
        frage = ''; aktiv = 0; beschaeftigt = false;
        sammle();
        if (dlg && !dlg.open) dlg.showModal();
      });
    } else if (dlg?.open) dlg.close();
  });
  $effect(() => { if (palette.offen) { void aktuelleSprache(); untrack(() => { if (geladenFuer !== aktuelleSprache()) laden(); }); } });

  const THEMEN = $derived<[Thema, string][]>([
    ['hell', L('Hell', 'Light')], ['auto', L('Wie das Gerät', 'Same as device')], ['dunkel', L('Dunkel', 'Dark')],
    ['sw', L('Schwarz auf Weiß', 'Black on white')], ['ws', L('Weiß auf Schwarz', 'White on black')],
    ['sg', L('Schwarz auf Gelb', 'Black on yellow')], ['gs', L('Gelb auf Schwarz', 'Yellow on black')], ['gb', L('Gelb auf Blau', 'Yellow on blue')],
  ]);

  const seitenListe = $derived.by(() => {
    const p = !!s.projekt;
    const l: { hash: string; titel: string; zusatz?: string; stichwoerter?: string[] }[] = [{ hash: 'start', titel: L('Startseite', 'Start page') }];
    if (p) {
      l.push({ hash: 'daten', titel: L('Daten', 'Data') });
      for (const b of s.blaetter) l.push({ hash: `blatt/${b.id}`, titel: b.titel, stichwoerter: [L('Auswertung', 'Analysis')] });
      l.push({ hash: 'blatt/neu', titel: L('Neue Auswertung', 'New analysis') }, { hash: 'bericht', titel: L('Bericht', 'Report') }, { hash: 'befehle', titel: L('Befehle', 'Commands') }, { hash: 'protokoll', titel: L('Protokoll', 'Log') });
      // Diese Seiten gibt es nur mit offenen Daten (App.svelte: BRAUCHT_DATEN), wie „Daten“ und „Bericht“ oben.
      l.push(
        { hash: 'vorlage', titel: L('Vorlage speichern oder anwenden', 'Save or apply a template'), stichwoerter: [L('Protokoll', 'Log'), L('Vorlage', 'Template')] },
        { hash: 'spalten', titel: L('Spalten beschreiben', 'Describe columns'), zusatz: L('Variablenansicht', 'variable view'), stichwoerter: [L('Spalten', 'Columns'), L('Messniveau', 'Level of measurement'), L('Wertelabels', 'Value labels')] },
        { hash: 'bearbeiten', titel: L('Daten bearbeiten', 'Edit data'), zusatz: L('Assistenten', 'assistants'), stichwoerter: [L('Umkodieren', 'Recode'), L('Berechnen', 'Calculate'), L('Fälle auswählen', 'Select cases'), L('Sortieren', 'Sort'), L('Zusammenführen', 'Merge'), L('Aggregieren', 'Aggregate')] },
        { hash: 'umformen', titel: L('Daten umstrukturieren', 'Reshape data'), zusatz: L('breit/lang', 'wide/long'), stichwoerter: [L('Umstrukturieren', 'Restructure')] },
        { hash: 'tabelle', titel: L('Tabelle zusammenstellen', 'Assemble a table'), stichwoerter: [L('Tabelle', 'Table')] },
        { hash: 'amtlich', titel: L('Tabelle für die Veröffentlichung', 'Table for publication'), stichwoerter: [L('Tabelle', 'Table'), L('amtliche Statistik', 'official statistics')] },
        { hash: 'karte', titel: L('Karte', 'Map'), zusatz: L('Gebietskarte', 'area map'), stichwoerter: [L('Gebiete', 'Areas'), 'GeoJSON'] },
      );
    }
    l.push(
      { hash: 'lernen', titel: L('Lernen', 'Learning') }, { hash: 'hilfe', titel: L('Hilfe', 'Help') },
      { hash: 'einstellungen', titel: L('Einstellungen', 'Settings') },
      { hash: 'planen', titel: L('Studie planen', 'Plan a study'), zusatz: L('Poweranalyse', 'power analysis') },
      { hash: 'fragebogen', titel: L('Fragebogen planen', 'Plan a questionnaire'), zusatz: L('Fragebogenentwicklung', 'questionnaire development'), stichwoerter: [L('Umfrage', 'Survey'), L('Fragebogen', 'Questionnaire'), 'XLSForm'] },
      { hash: 'planung', titel: L('Studie planen: Datenmanagementplan und Präregistrierung', 'Plan a study: data management plan and preregistration'), zusatz: L('Planung im Projekt', 'planning in the project'), stichwoerter: [L('Datenmanagementplan', 'Data management plan'), L('DMP', 'DMP'), L('Präregistrierung', 'Preregistration'), L('Vorregistrierung', 'Pre-registration'), L('OSF', 'OSF'), L('Forschungsdatenmanagement', 'Research data management')] },
      { hash: 'interviews', titel: L('Interviews vorbereiten und auswerten', 'Prepare and analyse interviews'), zusatz: L('qualitative Daten, Leitfaden nach Helfferich', 'qualitative data, guide after Helfferich'), stichwoerter: [L('Interview', 'Interview'), L('Leitfaden', 'Guide'), L('Transkript', 'Transcript'), L('Kodierleitfaden', 'Coding guide'), L('qdpx', 'qdpx'), L('REFI-QDA', 'REFI-QDA'), L('Fall-Code-Matrix', 'Case-code matrix'), L('Intercoder', 'Intercoder'), L('Konsens', 'Consensus')] },
      { hash: 'kodieren', titel: L('Kodieren (Kodier-Arbeitsplatz)', 'Coding (coding workplace)'), zusatz: L('Textstellen markieren und Codes geben', 'mark passages and assign codes'), stichwoerter: [L('Kodieren', 'Coding'), L('Code', 'Code'), L('Markieren', 'Mark'), L('Beleg', 'Passage')] },
      // Stufe A3: jede Funktion der Arbeitsweisen bleibt bei jeder Wahl erreichbar (Fachblatt Arbeitsweisen 7, Regel 2 und 3)
      { hash: 'kodieren/arbeitsweise', titel: L('Meine Arbeitsweise wählen (Verfahren)', 'Choose my approach (method)'), zusatz: L('Kodier-Arbeitsplatz', 'coding workplace'), stichwoerter: [L('Arbeitsweise', 'Approach'), L('Verfahren', 'Method'), L('Thematische Analyse', 'Thematic analysis'), L('Grounded Theory', 'Grounded theory'), L('IPA', 'IPA'), L('Framework', 'Framework')] },
      { hash: 'kodieren/themen', titel: L('Themen bilden (reflexive thematische Analyse)', 'Build themes (reflexive thematic analysis)'), zusatz: L('Kodier-Arbeitsplatz', 'coding workplace'), stichwoerter: [L('Thema', 'Theme'), L('Themen', 'Themes'), L('zentrales Konzept', 'central organising concept'), L('Braun und Clarke', 'Braun and Clarke')] },
      { hash: 'kodieren/tagebuch', titel: L('Tagebuch-Eintrag schreiben (reflexives Tagebuch)', 'Write a journal entry (reflexive journal)'), zusatz: L('Kodier-Arbeitsplatz, Memos', 'coding workplace, memos'), stichwoerter: [L('Tagebuch', 'Journal'), L('Reflexivität', 'Reflexivity'), L('Memo', 'Memo')] },
      { hash: 'kodieren/gt-memos', titel: L('Memo-Arten der Grounded Theory (Code-Memo, theoretisches Memo, theoretische Auswahl)', 'Grounded theory memo types (code memo, theoretical memo, theoretical sampling)'), zusatz: L('Kodier-Arbeitsplatz, Memos', 'coding workplace, memos'), stichwoerter: [L('Memo', 'Memo'), L('Grounded Theory', 'Grounded theory'), L('Sättigung', 'Saturation'), L('theoretische Auswahl', 'theoretical sampling')] },
      { hash: 'kodieren/phase', titel: L('Kodierphase am Code setzen (offen, fokussiert, axial, theoretisch)', 'Set the coding phase of a code (open, focused, axial, theoretical)'), zusatz: L('Kodier-Arbeitsplatz, Codebaum', 'coding workplace, code tree'), stichwoerter: [L('Kodierphase', 'Coding phase'), L('offenes Kodieren', 'open coding'), L('fokussiertes Kodieren', 'focused coding'), L('axiales Kodieren', 'axial coding')] },
      { hash: 'kodieren/vergleich', titel: L('Zwei Stellen nebeneinander vergleichen (ständiger Vergleich)', 'Compare two passages side by side (constant comparison)'), zusatz: L('Kodier-Arbeitsplatz', 'coding workplace'), stichwoerter: [L('Vergleich', 'Comparison'), L('ständiger Vergleich', 'constant comparison'), L('Grounded Theory', 'Grounded theory')] },
      { hash: 'kodieren/einzelfall', titel: L('Einzelfall-Modus (IPA: eine Person nach der anderen)', 'Single-case mode (IPA: one person at a time)'), zusatz: L('Kodier-Arbeitsplatz', 'coding workplace'), stichwoerter: [L('Einzelfall', 'Single case'), L('IPA', 'IPA'), L('idiographisch', 'idiographic')] },
      { hash: 'kodieren/einzelfall-verlassen', titel: L('Einzelfall-Modus verlassen (alle Fälle zeigen)', 'Leave single-case mode (show all cases)'), zusatz: L('Kodier-Arbeitsplatz', 'coding workplace'), stichwoerter: [L('Einzelfall', 'Single case'), L('alle Fälle', 'all cases')] },
      { hash: 'kodieren/randnotizen', titel: L('Randnotizen in drei Schichten (IPA)', 'Exploratory notes in three layers (IPA)'), zusatz: L('Kodier-Arbeitsplatz', 'coding workplace'), stichwoerter: [L('Randnotiz', 'Exploratory note'), L('beschreibend', 'descriptive'), L('sprachlich', 'linguistic'), L('begrifflich', 'conceptual')] },
      // Stufe A2: Mixed Methods im Kodier-Arbeitsplatz (Bereich „Auswerten“)
      { hash: 'kodieren/joint-display', titel: L('Zahlen und Zitate zusammen zeigen (Joint Display, Mixed Methods)', 'Show numbers and quotes together (joint display, mixed methods)'), zusatz: L('Kodier-Arbeitsplatz, Auswerten', 'coding workplace, analysis'), stichwoerter: [L('Joint Display', 'Joint display'), L('Mixed Methods', 'Mixed methods'), L('Meta-Inferenz', 'Meta-inference'), L('Passung', 'Fit'), L('Typologie', 'Typology')] },
      { hash: 'kodieren/verknuepfen', titel: L('Interviews mit Umfragedaten verknüpfen (Fall-Variable, Mixed Methods)', 'Link interviews with survey data (case variable, mixed methods)'), zusatz: L('Kodier-Arbeitsplatz, Auswerten', 'coding workplace, analysis'), stichwoerter: [L('Verknüpfung', 'Linking'), L('Umfrage', 'Survey'), L('Fallvariable', 'Case variable')] },
      { hash: 'kodieren/design-steckbrief', titel: L('Design-Steckbrief (Mixed-Methods-Design, Notation)', 'Design profile (mixed methods design, notation)'), zusatz: L('Kodier-Arbeitsplatz, Auswerten', 'coding workplace, analysis'), stichwoerter: [L('Design', 'Design'), L('Vertiefungsdesign', 'Explanatory sequential'), L('Verallgemeinerungsdesign', 'Exploratory sequential'), L('Paralleldesign', 'Convergent design')] },
      { hash: 'kodieren/instrument', titel: L('Aus Interviews einen Fragebogen machen (Instrumentenentwicklung)', 'Turn interviews into a questionnaire (instrument development)'), zusatz: L('Kodier-Arbeitsplatz, Auswerten', 'coding workplace, analysis'), stichwoerter: [L('Item', 'Item'), L('Fragebogen', 'Questionnaire'), L('Trennschärfe', 'Item-total correlation'), L('Instrument', 'Instrument')] },
      { hash: 'kodieren/nachvollziehbarkeit', titel: L('Methodenanhang, Änderungsprotokoll und KI-Angabe (Nachvollziehbarkeit, Audit Trail)', 'Methods appendix, change log and AI statement (traceability, audit trail)'), zusatz: L('Kodier-Arbeitsplatz, Nachvollziehbarkeit', 'coding workplace, traceability'), stichwoerter: [L('Methodenanhang', 'Methods appendix'), L('Änderungsprotokoll', 'Change log'), L('KI-Nutzung', 'AI use'), 'Audit Trail', L('Codebuch-Protokoll', 'Codebook log')] },
      { hash: 'kodieren/textanalyse', titel: L('Wörter zählen (Textanalyse: Wortliste, Schlüsselwort im Kontext, Wörterbuch)', 'Count words (text analysis: word list, keyword in context, dictionary)'), zusatz: L('Kodier-Arbeitsplatz, Auswerten', 'coding workplace, analysis'), stichwoerter: [L('Wortliste', 'Word list'), 'KWIC', L('Wörterbuch', 'Dictionary'), L('typische Wörter', 'Keywords'), 'Text mining'] },
      { hash: 'kodieren/berichtshilfe', titel: L('Berichtshilfe COREQ und SRQR (Was muss in meinen Methodenteil?)', 'Reporting checklists COREQ and SRQR (What belongs in my methods section?)'), zusatz: L('Kodier-Arbeitsplatz, Nachvollziehbarkeit', 'coding workplace, traceability'), stichwoerter: ['COREQ', 'SRQR', L('Methodenteil', 'Methods section'), L('Berichtsliste', 'Reporting guideline'), 'Checklist'] },
      { hash: 'kodieren/selbstpruefung', titel: L('Selbstprüfung Mixed Methods (MMAT, GRAMMS)', 'Mixed methods self-check (MMAT, GRAMMS)'), zusatz: L('Kodier-Arbeitsplatz, Auswerten', 'coding workplace, analysis'), stichwoerter: ['MMAT', 'GRAMMS', L('Gütekriterien', 'Quality criteria'), L('Berichtsliste', 'Reporting guideline')] },
      { hash: 'kodieren/beispiel-mm', titel: L('Mixed-Methods-Beispiel öffnen: Um Hilfe bitten (Umfrage und Interviews, erfunden)', 'Open mixed methods example: asking for help (survey and interviews, invented)'), zusatz: L('neues Projekt', 'new project'), stichwoerter: [L('Beispiel', 'Example'), L('Mixed Methods', 'Mixed methods'), L('Umfrage', 'Survey')] },
      { hash: 'station', titel: L('Erhebungsstation', 'Survey station'), zusatz: L('ein Gerät für viele Befragte', 'one device for many respondents'), stichwoerter: [L('Station', 'Station'), L('Befragung', 'Survey')] },
      { hash: 'beispiele', titel: L('Beispiele', 'Examples') }, { hash: 'verstehen', titel: L('Rechner und Regler', 'Calculators and sliders') },
      { hash: 'impressum', titel: L('Impressum', 'Legal notice'), stichwoerter: [L('Quelltext', 'Source code')] },
      { hash: 'datenschutz', titel: L('Datenschutz', 'Privacy'), zusatz: L('Datenschutzerklärung', 'privacy statement') },
      { hash: 'barrierefreiheit', titel: L('Erklärung zur Barrierefreiheit', 'Accessibility statement'), stichwoerter: [L('Barrierefreiheit', 'Accessibility')] },
      { hash: 'behoerden', titel: L('Für Behörden und Rechenzentren', 'For public bodies and data centres') },
    );
    return l;
  });

  const einstellungsListe = $derived.by(() => {
    const farben = L('Farben und Kontrast', 'Colors and contrast');
    return [
      ...THEMEN.map(([t, name]) => ({ id: `thema-${t}`, titel: `${farben}: ${name}`, stichwoerter: [L('Kontrast', 'Contrast')], aktion: { art: 'thema', wert: t } as Aktion })),
      { id: 'kursmodus', titel: L('Kursmodus', 'Course mode'), zusatz: L('Welch oder klassisch', 'Welch or classical'), stichwoerter: [L('Einstellung', 'Setting'), 't-Test', 'ANOVA', L('Varianzanalyse', 'Analysis of variance'), 'Welch'], aktion: { art: 'einstellungsfeld', feld: 'ez-kurs' } as Aktion },
      { id: 'uebungsmodus', titel: L('Übungsmodus', 'Practice mode'), zusatz: L('Deutung ausblenden', 'hide the interpretation'), stichwoerter: [L('Einstellung', 'Setting'), L('Deutung', 'Interpretation'), L('Unterricht', 'Teaching')], aktion: { art: 'einstellungsfeld', feld: 'ez-deutung' } as Aktion },
      { id: 'groesser', titel: L('Alles größer', 'Everything larger'), stichwoerter: [L('Schrift', 'Text size'), 'zoom'], aktion: { art: 'groesse', schritt: 1 } as Aktion },
      { id: 'kleiner', titel: L('Alles kleiner', 'Everything smaller'), stichwoerter: [L('Schrift', 'Text size'), 'zoom'], aktion: { art: 'groesse', schritt: -1 } as Aktion },
      ...FREIGEGEBEN.map(sp => ({ id: `sprache-${sp}`, titel: SPRACHNAMEN[sp], zusatz: L('Sprache', 'Language'), aktion: { art: 'sprache', wert: sp } as Aktion })),
      // Stufe 9: die Gruppen des Kopf-Menüs „Ansicht“ als Ziel (öffnet das Menü und setzt den Fokus in die Gruppe).
      ...ansichtZiele,
      ...einstellungsZeilen,
    ];
  });

  /** Stufe 9: Menü „Ansicht“ - „Sprache“ getippt zeigt „Sprache wählen“ vor den einzelnen Sprachen. */
  const ansichtZiele = $derived.by(() => {
    const menue = L('Menü Ansicht', 'View menu');
    return [
      { id: 'ansicht-sprache', titel: L('Sprache wählen', 'Choose a language'), zusatz: menue, stichwoerter: ['Language', L('Sprache', 'Language')], aktion: { art: 'ansicht', gruppe: 'sprache' } as Aktion },
      { id: 'ansicht-farben', titel: L('Farben und Kontrast wählen', 'Choose colors and contrast'), zusatz: menue, stichwoerter: ['Kontrast', 'Contrast', 'Farbe', 'Color', 'Theme', 'dunkel', 'dark'], aktion: { art: 'ansicht', gruppe: 'farben' } as Aktion },
      { id: 'ansicht-groesse', titel: L('Schriftgröße', 'Text size'), zusatz: menue, stichwoerter: ['Schrift', 'Zoom', 'größer', 'kleiner', 'font size'], aktion: { art: 'ansicht', gruppe: 'groesse' } as Aktion },
    ];
  });

  /** Stufe 9: jede Einstellung der Seite „Einstellungen“ mit ihrem Titel (geteilt über `lib/einstellungs-titel.ts`), dazu je Gruppe ein Eintrag. Kurs- und Übungsmodus stehen oben schon. */
  const einstellungsZeilen = $derived.by(() => {
    const titel = einstellungsTitel(), aus: { id: string; titel: string; zusatz?: string; stichwoerter?: string[]; aktion: Aktion }[] = [];
    for (const g of einstellungsGruppen()) {
      aus.push({ id: `gruppe-${g.id}`, titel: L(`Einstellungen: ${g.name}`, `Settings: ${g.name}`), stichwoerter: [L('Einstellung', 'Setting'), g.name], aktion: { art: 'einstellungsfeld', feld: g.id } });
      for (const z of g.zeilen) {
        if (z.id === 'kurs' || z.id === 'deutung') continue;
        if (z.id === 'anrede' && s.einst.sprache !== 'de') continue;
        aus.push({ id: `zeile-${z.id}`, titel: titel[z.id], zusatz: g.name, stichwoerter: [L('Einstellung', 'Setting')], aktion: { art: 'einstellungsfeld', feld: z.feld ?? g.id } });
      }
    }
    return aus;
  });

  /** Stufe 9: Lerneinheiten, Beispiele und Rechner und Regler (Titel in der aktuellen Sprache). */
  const lernListe = $derived(EINHEITEN.map(e => ({ id: e.id, titel: paar(e.alltag), zusatz: paar(e.fach) })));
  const beispielListe = $derived(BEISPIELE.map(b => ({ id: b.id, titel: paar(b.titel), stichwoerter: [...new Set(b.schritte.map(x => paar(x.titel)))] })));
  const rechnerListe = $derived(Object.entries(verstehenTitel()).map(([id, titel]) => ({ id, titel })));

  const hilfeListe = $derived<Artikel[]>(modul && geladenFuer ? modul.artikelListe(geladenFuer) : []);
  const eintraege = $derived.by<Eintrag[]>(() => {
    if (!palette.offen) return [];
    const hilfe = hilfeListe.filter(a => a.bereich !== 'begriffe'), begriffe = hilfeListe.filter(a => a.bereich === 'begriffe');
    const volltext = new Set(frage.trim() && hilfeListe.length ? suche(hilfeListe, frage, geladenFuer).slice(0, 15).map(t => t.artikel.id) : []);
    return [
      ...abschnittBegriffe(knoepfe, [L('Fachbegriffe dieses Abschnitts', 'Technical terms in this section')]),
      ...seiten(seitenListe),
      ...(s.projekt ? [lesemodusEintrag(L('Datentabelle in Seiten lesen', 'Read the data table in pages'), L('Lesemodus', 'Reading mode'))] : []),
      ...(s.projekt ? [...auswertungen(VERFAHREN), ...qualitaetEintraege(qualitaetKarten())] : []),
      ...lerneinheiten(lernListe), ...beispieleEintraege(beispielListe), ...rechner(rechnerListe),
      ...einstellungen(einstellungsListe),
      ...exporte(menueKnoepfe),
      ...hilfeArtikel(hilfe, volltext),
      ...fachbegriffe(begriffe),
      ...kuerzelEintraege(holeKuerzel()),
    ];
  });
  const treffer = $derived(rangiere(frage, eintraege));
  $effect(() => { void frage; aktiv = 0; });

  const QUELLE = $derived<Record<Quelle, string>>({
    auswertung: L('Auswertung', 'Analysis'), seite: L('Seite', 'Page'), hilfe: L('Hilfe', 'Help'), einstellung: L('Einstellung', 'Setting'),
    export: L('Export', 'Export'), begriff: L('Fachbegriff', 'Technical term'), kuerzel: L('Kürzel', 'Shortcut'), abschnitt: L('Fachbegriff in diesem Abschnitt', 'Technical term in this section'),
    lerneinheit: L('Lerneinheit', 'Learning unit'), beispiel: L('Beispiel', 'Example'), rechner: L('Rechner und Regler', 'Calculators and sliders'),
  });

  /** Trefferzahl: erst, wenn die Person kurz aufhört zu tippen (nicht bei jedem Buchstaben), einmal über lib/ansage.ts. */
  $effect(() => {
    const n = treffer.length;
    if (!palette.offen || !frage.trim()) return;
    const t = setTimeout(() => sage(n ? L(`${n} Treffer`, `${n} results`) : L('Keine Treffer', 'No results')), 500);
    return () => clearTimeout(t);
  });

  const scrolleAktiv = () => tick().then(() => document.getElementById(`pal-opt-${aktiv}`)?.scrollIntoView({ block: 'nearest' }));
  function taste(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && treffer.length) { e.preventDefault(); aktiv = (aktiv + 1) % treffer.length; void scrolleAktiv(); }
    else if (e.key === 'ArrowUp' && treffer.length) { e.preventDefault(); aktiv = (aktiv - 1 + treffer.length) % treffer.length; void scrolleAktiv(); }
    else if (e.key === 'Enter' && treffer[aktiv]) { e.preventDefault(); void waehle(treffer[aktiv]!); }
  }

  /** Auswahl: das Fenster schließt (der Fokus geht an den Auslöser zurück), die Handlung folgt einen Takt später und setzt ihren eigenen Fokus. */
  async function waehle(t: Eintrag) {
    if (beschaeftigt) return;
    if (t.aktion.art === 'sprache') {
      beschaeftigt = true;   // Laden dauert: Animation im Fenster, geschlossen wird erst danach
      try { await spracheWaehlen(t.aktion.wert as Sprache); } finally { beschaeftigt = false; }
      schliessePalette(); return;
    }
    schliessePalette();
    setTimeout(() => tue(t), 60);
  }

  function tue(t: Eintrag) {
    const a = t.aktion;
    switch (a.art) {
      case 'hash': location.hash = a.hash; break;
      case 'hilfe': location.hash = `hilfe/${a.id}`; break;
      case 'begriff': oeffneBegriff(a.id); break;
      case 'abschnitt': {
        const b = knopfElemente[a.nr];
        if (b?.isConnected) oeffneBegriff(b.dataset.gl ?? '', b); else if (knoepfe[a.nr]?.id) oeffneBegriff(knoepfe[a.nr]!.id);
        break;
      }
      case 'thema': s.einst.thema = a.wert as Thema; einstSpeichern(); try { localStorage.setItem(THEMA_GEWAEHLT, '1'); } catch { /* privates Fenster */ } sage(t.titel); break;
      case 'groesse': stufe(a.schritt); sage(t.titel); break;
      case 'export': { const b = menueElemente[a.nr]; if (b?.isConnected) b.click(); break; }
      case 'kuerzel': {
        const k = holeKuerzel().find(x => x.id === a.id);
        if (k?.ausfuehren) k.ausfuehren(); else if (k) sage(`${k.text}: ${k.tasten}`);
        break;
      }
      case 'lesemodus':
        verlangeLesemodus();
        if (location.hash !== '#daten') location.hash = 'daten';
        sage(L('Datentabelle im Lesemodus: Seiten zu 50 Zeilen', 'Data table in reading mode: pages of 50 rows'));
        break;
      case 'karte': oeffneKarte(a.id, a.qualitaet); break;
      case 'einstellungsfeld': {
        if (location.hash !== '#einstellungen') location.hash = 'einstellungen';
        const f = a.feld;
        const fokus = (n: number) => { const el = document.getElementById(f); if (el) el.focus(); else if (n > 0) setTimeout(() => fokus(n - 1), 100); };
        setTimeout(() => fokus(10), 100);
        break;
      }
      case 'ansicht': dispatchEvent(new CustomEvent('statable:ansicht', { detail: a.gruppe })); break;
      case 'sprache': break;   // läuft vor dem Schließen (waehle)
    }
  }

  /** Eine Auswertungskarte wählen: zu „Neue Auswertung“, dort die Karte anklicken; ist sie für das Fachgebiet ausgeblendet, über die Kartensuche. */
  function oeffneKarte(id: string, qualitaet?: string) {
    const v = VERFAHREN.find(x => x.id === id); if (!v) return;
    const ziel = () => {
      const k = document.querySelector<HTMLButtonElement>(qualitaet ? `#inhalt button.kachel[data-qualitaet="${CSS.escape(qualitaet)}"]` : `#inhalt button.kachel[data-karte="${CSS.escape(id)}"]:not([data-qualitaet])`);
      if (k) { k.click(); return true; }
      const such = document.querySelector<HTMLInputElement>('#inhalt #karten-suche');
      if (such) {
        such.value = v.titel; such.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => {
          const kn = [...document.querySelectorAll<HTMLButtonElement>('#inhalt .karten-suche ~ div .kachel')].find(b => b.textContent?.includes(v.titel));
          kn?.click();
        }, 120);
        return true;
      }
      return false;
    };
    if (location.hash !== '#blatt/neu') location.hash = 'blatt/neu';
    let n = 0;
    const takt = setInterval(() => { if (ziel() || ++n > 60) clearInterval(takt); }, 50);
  }
</script>

<dialog bind:this={dlg} use:dialogFokus={{ erstes: '#pal-eingabe' }} class="palette" data-nolink aria-labelledby="pal-titel" onclose={() => { if (!dlg?.open) schliessePalette(); }}>
  <div class="dialog-innen">
    <h2 id="pal-titel" class="pal-titel">{L('Befehlspalette', 'Command palette')}</h2>
    {#if palette.offen}
      <label class="nur-vorleser" for="pal-eingabe">{L('Alles suchen: Auswertung, Seite, Lerneinheit, Beispiel, Hilfe, Einstellung oder Fachbegriff', 'Search everything: analysis, page, learning unit, example, help topic, setting or technical term')}</label>
      <input id="pal-eingabe" bind:this={feld} bind:value={frage} type="text" autocomplete="off" spellcheck="false" enterkeyhint="go"
        placeholder={L('Alles suchen, z. B. „Korrelation“, „Sprache“, „Bericht“', 'Search everything, e.g. "correlation", "language", "report"')}
        role="combobox" aria-expanded={treffer.length > 0} aria-controls="pal-liste" aria-autocomplete="list" aria-activedescendant={treffer.length ? `pal-opt-${aktiv}` : undefined}
        onkeydown={taste}>
      {#if !modul && !ladefehler && animAn.an}<p class="pal-leise"><Rechnet text={L('Hilfe wird geladen …', 'Loading help …')} /></p>{/if}
      {#if beschaeftigt}<p class="pal-leise"><Rechnet text={L('Wird geladen …', 'Loading …')} /></p>{/if}
      {#if treffer.length}
        <ul id="pal-liste" class="pal-liste" role="listbox" aria-label={L('Treffer', 'Results')}>
          {#each treffer as t, i (t.id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <li id="pal-opt-{i}" role="option" aria-selected={i === aktiv} class:aktiv={i === aktiv} onclick={() => waehle(t)} onmousemove={() => (aktiv = i)}>
              <span class="pal-text">{anzeige(t)}</span>
              <span class="pal-art">{QUELLE[t.quelle]}{#if t.hinweis}<kbd>{t.hinweis}</kbd>{/if}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <ul id="pal-liste" class="pal-liste" role="listbox" aria-label={L('Treffer', 'Results')}></ul>
        {#if frage.trim()}<p class="pal-leise">{L('Keine Treffer', 'No results')}</p>{/if}
      {/if}
      <p class="pal-leise">{L('Mit Screenreader: Esc zweimal drücken, wenn das Fenster beim ersten Mal nicht schließt.', 'With a screen reader: press Esc twice if the window does not close the first time.')}</p>
    {/if}
  </div>
  <!-- Schließen: im Code zuletzt (der Fokus startet im Suchfeld), sichtbar rechts oben -->
  <button class="k leise nur-symbol pal-zu" type="button" aria-label={L('Schließen', 'Close')} data-tipp={L('Schließen', 'Close')} onclick={() => schliessePalette()}><Icon n="x" /></button>
</dialog>

<style>
  .palette { width: min(42rem, calc(100vw - 2rem)); margin-top: 8vh; }
  .pal-titel { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin: 0; }
  .pal-zu { position: absolute; top: var(--a3); inset-inline-end: var(--a3); }
  .pal-titel { padding-inline-end: calc(var(--ziel, 32px) + var(--a2)); }
  #pal-eingabe { width: 100%; min-height: 44px; padding: 0 var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); font: 400 var(--gr-text)/1.2 var(--schrift-ui); }
  .pal-liste { list-style: none; margin: 0; padding: 0; max-height: min(55vh, 28rem); overflow: auto; display: grid; gap: 2px; }
  .pal-liste li { display: grid; gap: 2px; padding: var(--a2) var(--a3); border: 1px solid transparent; border-radius: var(--r-klein); cursor: pointer; }
  .pal-liste li.aktiv { background: var(--akzent-hell); border-color: var(--akzent); }
  .pal-text { font-weight: 650; }
  .pal-art { font-size: var(--gr-klein); color: var(--akzent-tinte); display: flex; gap: var(--a2); align-items: center; }
  .pal-art kbd { border: 1px solid var(--linie-stark); border-radius: 4px; padding: 0 6px; color: var(--tinte-2); font: 600 var(--gr-klein)/1.5 var(--schrift-ui); }
  .pal-leise { margin: 0; color: var(--tinte-2); }
</style>
