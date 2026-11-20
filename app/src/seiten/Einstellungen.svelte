<script lang="ts">
  import Rechnet from '../bausteine/Rechnet.svelte';
  import { s, d, L, istEn, einstSpeichern, melde, ZAHL_GEWAEHLT } from '../lib/sitzung.svelte';
  import { PROFILE } from '../i18n/profil';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import TabellenVorschau from '../bausteine/TabellenVorschau.svelte';
  import Rand, { type RandKontext } from '../bausteine/Rand.svelte';
  import { ANSICHTEN, ansichtName, STANDARD_ANSICHT, type Ansicht } from '../lib/tabellenfarben';
  import { FAECHER, fachName } from '../lib/fach';
  import { fachAusSpeicher } from '../lib/fachid';
  import { OFFLINE, OFFLINE_PAKET, offlineStandText, offlinePaketStand } from '../lib/offline';
  import { ganzZahl } from '../i18n/profil';
  import { zaehle } from '../lib/zaehlen';
  import { einstellungsTitel } from '../lib/einstellungs-titel';

  /**
   * Einstellungen als Liste in Gruppen (Johannes 10.10., Entwurf A; Reihenfolge Johannes 18.10.: Anrede, Fach; die Sprache steht seit 31.10. im Kopf - dann Darstellung, Ergebnisse, Einstieg): je Einstellung eine Zeile - links Name und ein kurzer Satz,
   * rechts das Bedienelement. Regel: ab drei Möglichkeiten ein Pull-down, bei zwei ein Umschalter, Ein/Aus als Schalter.
   */
  /** Offline-Paket auf dem Server (entsteht beim Ausliefern, scripts/offline-paket.sh): Stand und Größe aus offline/stand.json; fehlt die Datei, kein Knopf. */
  let paket = $state<{ stand: string; bytes: number } | null>(null);
  void offlinePaketStand().then(j => { paket = j; });
  function zahlWaehlen(w: 'sprache' | 'komma' | 'punkt') {
    try { if (w === 'sprache') localStorage.removeItem(ZAHL_GEWAEHLT); else localStorage.setItem(ZAHL_GEWAEHLT, '1'); } catch { /* privates Fenster */ }
    s.einst.zahl = w; einstSpeichern();
  }
  /** „0,5“ oder „0.5“ - zeigt im Pull-down, was die Sprache vorgibt. */
  const beispielZahl = $derived(`0${PROFILE[s.einst.sprache].dezimal}5`);
  /** Dezimalzeichen, das gerade gilt - für das Beispiel bei „Null vor dem Komma“. */
  const dzeichen = $derived(s.einst.zahl === 'punkt' ? '.' : s.einst.zahl === 'komma' ? ',' : PROFILE[s.einst.sprache].dezimal);
  function setze<K extends 'kiT' | 'kurs' | 'tabAnsicht' | 'anrede' | 'fach'>(k: K, w: string) { (s.einst as unknown as Record<string, unknown>)[k] = w; einstSpeichern(); }
  const tabelle = $derived<Ansicht>(s.einst.tabAnsicht ?? STANDARD_ANSICHT);

  /** Seitenleiste wie auf den anderen Seiten (Johannes 10.10.): zeigt die Maus oder der Fokus auf eine Einstellung, steht dort ausführlich, was sie bewirkt. */
  type Id = 'zahl' | 'null' | 'fach' | 'anrede' | 'tabellen' | 'kit' | 'kurs' | 'deutung' | 'bezuege' | 'sofort' | 'bayes' | 'profi' | 'rundgang' | 'kurzekoepfe' | 'wordbild';
  let zeigt = $state<Id | null>(null);
  /** Stufe 9: die Titel kommen aus `lib/einstellungs-titel.ts` (auch die Befehlspalette liest sie dort). */
  const ET = $derived(einstellungsTitel());
  const ERKL = $derived<Record<Id, RandKontext>>({
    zahl: { titel: ET.zahl, text: L('Welches Dezimalzeichen in den Sätzen für die Arbeit, in Tabellen, im Export und beim Eingeben gilt. Vorgabe ist das Zeichen der Sprache. Nach APA (englisch) steht der Punkt. Welches Zeichen gilt, steht in der Vorgabe der Hochschule, Zeitschrift oder Einrichtung. Im Intervall trennt bei Komma ein Semikolon: [0,19; 0,95].', 'Which decimal mark is used in the sentences for your paper, in tables, in exports and when entering data. The default is the mark of the language. APA (English) uses the point. Which mark applies is set by the guidelines of the university, journal or organisation. With a decimal comma, a semicolon separates the limits of an interval: [0,19; 0,95].') },
    null: { titel: ET.null, text: L('Ob Werte, die nicht über 1 gehen können (p, r, α, R², β), eine Null vor dem Komma bekommen. Vorgabe ist APA, wie im Deutschen üblich: „p = ,034“. In manchen Ländern schreibt man „p = 0,034“. Was gilt, steht in der Vorgabe der Hochschule, Zeitschrift oder Einrichtung. Wirkt auf Sätze, Tabellen und Export. Werte, die über 1 gehen können (M, SD, B, d), haben immer eine Null.', 'Whether values that cannot exceed 1 (p, r, α, R², β) get a zero before the decimal mark. The default is APA: "p = .034". In some countries "p = 0.034" is usual. What applies is set by the guidelines of the university, journal or organisation. Applies to sentences, tables and exports. Values that can exceed 1 (M, SD, B, d) always have a zero.') },
    fach: { titel: ET.fach, text: d('Bestimmt nur, welche Karten du auf der Seite „Neue Auswertung“ siehst. Rechnen und Ergebnisse bleiben gleich. Die Hilfe-Suche und die Suche über den Karten finden alle Verfahren, auch die ausgeblendeten. Bereits angelegte Blätter bleiben sichtbar.', 'Bestimmt nur, welche Karten Sie auf der Seite „Neue Auswertung“ sehen. Rechnen und Ergebnisse bleiben gleich. Die Hilfe-Suche und die Suche über den Karten finden alle Verfahren, auch die ausgeblendeten. Bereits angelegte Blätter bleiben sichtbar.', 'Only decides which cards you see on the page "New analysis". Calculations and results stay the same. The help search and the search above the cards find all methods, including the hidden ones. Pages you already made stay visible.') },
    anrede: { titel: ET.anrede, text: 'Ob Statable dich mit „du“ oder Sie mit „Sie“ anspricht - in Knöpfen, Hinweisen und Erklärungen. Die Sätze für die Arbeit sind unpersönlich und bleiben gleich.' },
    tabellen: { titel: ET.tabellen, text: d('Wie Ergebnistabellen aussehen, solange du an einer Tabelle nichts anderes wählst (Knopf „Ansicht“ über der Tabelle). Die Farben fassen zusammen, was zusammengehört. Der Export nach Word, Excel und PDF übernimmt die Ansicht. Für eine Arbeit nach APA: ohne Farbe.', 'Wie Ergebnistabellen aussehen, solange Sie an einer Tabelle nichts anderes wählen (Knopf „Ansicht“ über der Tabelle). Die Farben fassen zusammen, was zusammengehört. Der Export nach Word, Excel und PDF übernimmt die Ansicht. Für eine Arbeit nach APA: ohne Farbe.', 'How result tables look unless you choose otherwise on a table (the "View" button above it). The colors group what belongs together. Exports to Word, Excel and PDF use the same view. For an APA paper: no color.') },
    kit: { titel: ET.kit, text: d('Welcher 95 %-Bereich in der Zeile für deine Arbeit steht: für d (die Größe des Unterschieds) oder für den Unterschied in Punkten - oder beide.', 'Welcher 95 %-Bereich in der Zeile für Ihre Arbeit steht: für d (die Größe des Unterschieds) oder für den Unterschied in Punkten - oder beide.', 'Which 95% interval goes into the line for your paper: for d (the size of the difference), for the difference in points - or both.') },
    kurs: { titel: ET.kurs, text: d('Welche Rechnung das Hauptergebnis ist: der t-Test und die Varianzanalyse nach Welch (brauchen keine gleiche Streuung, Standard) oder die klassischen (nehmen gleiche Streuung an, wie in vielen Lehrbüchern, in Excel und auf dem TI-84). Bei „klassisch“ ist auch Tukey der Standard-Paarvergleich. Die andere Rechnung steht jeweils in den Tabellen daneben.', 'Welche Rechnung das Hauptergebnis ist: der t-Test und die Varianzanalyse nach Welch (brauchen keine gleiche Streuung, Standard) oder die klassischen (nehmen gleiche Streuung an, wie in vielen Lehrbüchern, in Excel und auf dem TI-84). Bei „klassisch“ ist auch Tukey der Standard-Paarvergleich. Die andere Rechnung steht jeweils in den Tabellen daneben.', 'Which calculation is the main result: the t test and analysis of variance after Welch (they do not need equal spread, default) or the classical ones (they assume equal spread, as in many textbooks, in Excel and on the TI-84). With "classical", Tukey is also the default pairwise comparison. The other calculation is shown next to it in the tables.') },
    kurzekoepfe: { titel: ET.kurzekoepfe, text: L('In Ergebnistabellen steht im Spaltenkopf die Kurzform (zum Beispiel SD, SE, p, M). Eine Sprachausgabe liest dann die Kurzform vor, die lange Form steht in einer Liste „Abkürzungen“ direkt unter der Tabelle. Vorgabe ist aus: Die Köpfe stehen ausgeschrieben da. Kurzformen gibt es für Deutsch und Englisch; in den anderen Sprachen bleiben die Köpfe lang.', 'In result tables, the column header shows the short form (for example SD, SE, p, M). A screen reader then reads the short form aloud, and the long form is listed under "Abbreviations" right below the table. The default is off: headers are written out in full. Short forms exist for German and English; in other languages the headers stay long.') },
    wordbild: { titel: ET.wordbild, text: L('Word-Bericht: Unter jedem Diagramm stehen sichtbar eine Beschreibung in Worten und die Daten als Tabelle. Aus: Das Diagramm behält seinen Alternativtext für Screenreader (das ist der Text, der ein Bild für blinde Menschen beschreibt), nur die sichtbare Beschreibung und die Tabelle entfallen.', 'Word report: below every chart, a description in words and the data as a table appear in the text. Off: the chart keeps its alt text for screen readers (the text that describes an image to blind people); only the visible description and the table are left out.') },
    deutung: { titel: ET.deutung, text: d('Blendet bei Ergebnissen die Sätze zur Deutung aus, die Kennzahlen bleiben sichtbar. Gedacht für den Unterricht: Studierende formulieren das Ergebnis selbst und drücken dann „Deutung zeigen“. Gilt nur für diese Sitzung der Seite, nicht für den Bericht.', 'Blendet bei Ergebnissen die Sätze zur Deutung aus, die Kennzahlen bleiben sichtbar. Gedacht für den Unterricht: Studierende formulieren das Ergebnis selbst und drücken dann „Deutung zeigen“. Gilt nur für diese Sitzung der Seite, nicht für den Bericht.', 'Hides the sentences that interpret a result; the key figures stay visible. Meant for teaching: students put the result into words themselves and then press "Show interpretation". It applies only to this session of the page, not to the report.') },
    bezuege: { titel: ET.bezuege, text: d('Wer sonst mit Excel, dem Taschenrechner TI-84, SPSS, R, jamovi, Stata oder GeoGebra arbeitet, findet bei Ergebnissen die passenden Schritte und Menüs, mit den Zahlen aus dem Ergebnis, damit sich alles nachrechnen lässt. „Rechnung zum Mitlesen“ zeigt Formeln mit eingesetzten Zahlen. Standardmäßig ist alles aus, damit Ergebnis und Hilfe übersichtlich bleiben.', 'Wer sonst mit Excel, dem Taschenrechner TI-84, SPSS, R, jamovi, Stata oder GeoGebra arbeitet, findet bei Ergebnissen die passenden Schritte und Menüs, mit den Zahlen aus dem Ergebnis, damit sich alles nachrechnen lässt. „Rechnung zum Mitlesen“ zeigt Formeln mit eingesetzten Zahlen. Standardmäßig ist alles aus, damit Ergebnis und Hilfe übersichtlich bleiben.', 'If you otherwise work with Excel, the TI-84 calculator, SPSS, R, jamovi, Stata or GeoGebra, results show the matching steps and menus with the numbers from the result, so that everything can be checked. "Calculation to follow along" shows formulas with the numbers inserted. Everything is off by default so that results and help stay uncluttered.') },
    sofort: { titel: ET.sofort, text: d('Ergebnisse rechnen sich bei jeder Änderung von Spalten oder Optionen von selbst neu, wie in jamovi und JASP. Das alte Ergebnis bleibt stehen, bis das neue fertig ist. Verfahren mit R (Mehrebenenmodell, Meta-Analyse) rechnen nur von selbst, wenn R schon geladen ist. Aus: Du rechnest mit dem Knopf „Rechnen“.', 'Ergebnisse rechnen sich bei jeder Änderung von Spalten oder Optionen von selbst neu, wie in jamovi und JASP. Das alte Ergebnis bleibt stehen, bis das neue fertig ist. Verfahren mit R (Mehrebenenmodell, Meta-Analyse) rechnen nur von selbst, wenn R schon geladen ist. Aus: Sie rechnen mit dem Knopf „Rechnen“.', 'Results recalculate by themselves whenever columns or options change, as in jamovi and JASP. The old result stays until the new one is ready. Methods that use R (multilevel model, meta-analysis) only recalculate by themselves once R is loaded. Off: you calculate with the "Calculate" button.') },
    bayes: { titel: ET.bayes, text: L('Beim t-Test, bei der Prä-Post-Messung, bei der Pearson-Korrelation, bei der einfaktoriellen Varianzanalyse und bei der linearen Regression (nur mit Zahlen als Prädiktoren) steht unter dem Ergebnis eine zugeklappte Zeile mit dem Bayes-Faktor BF₁₀ (JZS-Prior wie in JASP); in der Zeile für die Arbeit wird er angehängt.', 'For the t test, the before/after comparison, the Pearson correlation, one-way analysis of variance and linear regression (only with numbers as predictors), a collapsed line with the Bayes factor BF₁₀ (JZS prior as in JASP) appears below the result; it is appended to the line for your paper.') },
    profi: { titel: ET.profi, text: L('Befehle und alle Zahlen sind sofort offen. Die Seitenleiste startet eingeklappt. Der Rundgang wird nicht mehr von selbst angeboten. Die Erklärungen am Rand bleiben.', 'Commands and all numbers are open right away. The side panel starts collapsed. The tour is no longer offered on its own. The explanations in the margin stay.') },
    rundgang: { titel: ET.rundgang, text: d('Beim nächsten Öffnen der Daten: zuerst die Frage, wie du arbeiten möchtest, und nach deinem Fachgebiet, dann kurze Hinweise - deine Daten, der Daten-Check, wo eine neue Auswertung beginnt und wo der Bericht entsteht.', 'Beim nächsten Öffnen der Daten: zuerst die Frage, wie Sie arbeiten möchten, und nach Ihrem Fachgebiet, dann kurze Hinweise - Ihre Daten, der Daten-Check, wo eine neue Auswertung beginnt und wo der Bericht entsteht.', 'The next time you open the data: first the question how you want to work and the one about your field of study, then short tips - your data, the data check, where a new analysis starts and where the report comes together.') }
  });
  const randKontext = $derived<RandKontext>(zeigt ? ERKL[zeigt] : { titel: L('Einstellungen', 'Settings'), text: d('Zeige auf eine Einstellung - hier steht dann ausführlich, was sie bewirkt.', 'Zeigen Sie auf eine Einstellung - hier steht dann ausführlich, was sie bewirkt.', 'Point at a setting - this is where you will find what it does.') });
  /** Zeigen mit Maus oder Fokus; beim Verlassen bleibt die letzte Erklärung stehen (kein Flackern). */
  /** Sprungleiste (Johannes 10.11.): alles bleibt offen, die Leiste springt zur Gruppe und setzt den Fokus auf deren Überschrift - ohne die Adresse zu ändern (Hash-Router). Zahlen = Einstellungen je Gruppe (Wächter `beispiele-stufe8.test.ts`). */
  const GRUPPEN = $derived([
    { id: 'ez-allg', name: L('Allgemein', 'General'), n: s.einst.sprache === 'de' ? 2 : 1 },
    { id: 'ez-darst', name: L('Darstellung', 'Display'), n: 3 },
    { id: 'ez-erg', name: L('Ergebnisse', 'Results'), n: 9 },
    { id: 'ez-ein', name: L('Einstieg', 'Getting started'), n: 2 },
    { id: 'ez-offline', name: L('Ohne Netz', 'Without internet'), n: 1 },
  ]);
  function springe(e: Event, id: string) {
    e.preventDefault();
    const h = document.getElementById(id);
    h?.scrollIntoView({ block: 'start' }); h?.focus({ preventScroll: true });
  }
  const zeig = (id: Id) => ({ onpointerenter: () => (zeigt = id), onfocusin: () => (zeigt = id) });
</script>

<div class="tisch"><section class="blatt ez" aria-labelledby="ei-t">
  <SeitenKopf titelId="ei-t" titel={L('Einstellungen', 'Settings')} hilfe={{ id: 'einstellungen-seite', text: L('Hilfe zu den Einstellungen', 'Help on settings') }}>
    {#snippet untertitel()}<p>{L('Wirkt sofort und gilt auf diesem Gerät.', 'Takes effect immediately and applies on this device.')}</p>{/snippet}
  </SeitenKopf>

  <div class="ez-raster">
  <nav class="ez-sprung" aria-label={L('Zu einer Gruppe springen', 'Jump to a group')}>
    <ul>{#each GRUPPEN as g (g.id)}<li><a href="#{g.id}" onclick={(e) => springe(e, g.id)}>{g.name} <span class="ez-n">{g.n}</span></a></li>{/each}</ul>
  </nav>
  <div class="ez-gruppen">
  <section class="ez-gruppe">
    <h2 id="ez-allg" tabindex="-1">{L('Allgemein', 'General')}</h2>
    <div class="ez-karte">
      <!-- Sprache: du/Sie gibt es nur im Deutschen; jede andere Sprache hat eine Anrede (Bauplan Sprachen) -->
      {#if s.einst.sprache === 'de'}
        <div class="ez-zeile" {...zeig('anrede')}>
          <div class="ez-text"><span id="ez-anrede" class="ez-name">Anrede</span><span>Wie Statable dich oder Sie anspricht.</span></div>
          <div class="ez-umschalter" role="radiogroup" aria-labelledby="ez-anrede">{#each [['du', 'du'], ['sie', 'Sie']] as const as [w, t] (w)}<label><input type="radio" name="ez-anrede" value={w} checked={s.einst.anrede === w} onchange={() => setze('anrede', w)}>{t}</label>{/each}</div>
        </div>
      {/if}
      <div class="ez-zeile" {...zeig('fach')}>
        <div class="ez-text"><label for="ez-fach">{L('Mein Fachgebiet', 'My field of study')}</label><span>{d('Welche Karten du bei „Neue Auswertung“ siehst. Rechnen bleibt gleich.', 'Welche Karten Sie bei „Neue Auswertung“ sehen. Rechnen bleibt gleich.', 'Which cards you see under "New analysis". Calculation stays the same.')}</span></div>
        <span class="ez-wahl"><select id="ez-fach" value={s.einst.fach} onchange={(e) => setze('fach', fachAusSpeicher((e.currentTarget as HTMLSelectElement).value))}>
          {#each FAECHER as f (f.id)}<option value={f.id}>{fachName(f.id)}</option>{/each}
        </select></span>
      </div>
    </div>
  </section>

  <section class="ez-gruppe">
    <h2 id="ez-darst" tabindex="-1">{L('Darstellung', 'Display')}</h2>
    <div class="ez-karte">
      <div class="ez-zeile" {...zeig('zahl')}>
        <div class="ez-text"><label for="ez-zahl">{L('Zahlen', 'Numbers')}</label><span>{L('Dezimalzeichen in Sätzen, Tabellen und Export.', 'Decimal mark in sentences, tables and exports.')}</span></div>
        <span class="ez-wahl"><select id="ez-zahl" value={s.einst.zahl} onchange={(e) => zahlWaehlen((e.currentTarget as HTMLSelectElement).value as 'sprache' | 'komma' | 'punkt')}>
          <option value="sprache">{L(`Wie die Sprache (${beispielZahl})`, `Same as language (${beispielZahl})`)}</option><option value="komma">{L('Komma (0,5)', 'Comma (0,5)')}</option><option value="punkt">{L('Punkt (0.5)', 'Point (0.5)')}</option>
        </select></span>
      </div>
      <div class="ez-zeile" {...zeig('null')}>
        <div class="ez-text"><label for="ez-null">{L('Null vor dem Komma', 'Leading zero')}</label><span>{L('Bei p, r, α und anderen Werten bis 1.', 'For p, r, α and other values up to 1.')}</span></div>
        <span class="ez-wahl"><select id="ez-null" value={s.einst.nullVorKomma ? 'mit' : 'ohne'} onchange={(e) => { s.einst.nullVorKomma = (e.currentTarget as HTMLSelectElement).value === 'mit'; einstSpeichern(); }}>
          <option value="ohne">{L(`Weglassen, APA (p = ${dzeichen}034)`, `Omit, APA (p = ${dzeichen}034)`)}</option><option value="mit">{L(`Schreiben (p = 0${dzeichen}034)`, `Write it (p = 0${dzeichen}034)`)}</option>
        </select></span>
      </div>
      <div class="ez-zeile ez-mit-vorschau" {...zeig('tabellen')}>
        <div class="ez-text"><label for="ez-tabellen">{L('Tabellen', 'Tables')}</label><span>{d('Wie Ergebnistabellen aussehen. Für eine Arbeit nach APA: ohne Farbe.', 'Wie Ergebnistabellen aussehen. Für eine Arbeit nach APA: ohne Farbe.', 'How result tables look. For an APA paper: no color.')}</span></div>
        <span class="ez-wahl"><select id="ez-tabellen" value={tabelle} onchange={(e) => setze('tabAnsicht', (e.currentTarget as HTMLSelectElement).value)}>
          {#each ANSICHTEN as a (a)}<option value={a}>{ansichtName(a, istEn())}</option>{/each}
        </select></span>
      </div>
      <div class="ez-vorschau"><span>{L('Vorschau', 'Preview')}</span><TabellenVorschau ansicht={tabelle} /></div>
    </div>
  </section>

  <section class="ez-gruppe">
    <h2 id="ez-erg" tabindex="-1">{L('Ergebnisse', 'Results')}</h2>
    <div class="ez-karte">
      <label class="ez-zeile ez-klick" {...zeig('sofort')}>
        <span class="ez-text"><span class="ez-name">{L('Sofort rechnen', 'Calculate instantly')}</span><span>{L('Bei jeder Änderung von selbst neu. Mehrebenenmodell und Meta-Analyse erst, wenn R geladen ist.', 'Recalculates with every change. Multilevel model and meta-analysis only once R is loaded.')}</span></span>
        <span class="schalter"><input type="checkbox" role="switch" checked={s.einst.sofort} onchange={(e) => { s.einst.sofort = (e.currentTarget as HTMLInputElement).checked; einstSpeichern(); }}></span>
      </label>
      <div class="ez-zeile" {...zeig('kit')}>
        <div class="ez-text"><label for="ez-kit">{L('Bereich beim t-Test', 'Interval in the t test')}</label><span>{d('Welcher 95 %-Bereich in der Zeile für deine Arbeit steht.', 'Welcher 95 %-Bereich in der Zeile für Ihre Arbeit steht.', 'Which 95% interval goes into the line for your paper.')}</span></div>
        <span class="ez-wahl"><select id="ez-kit" value={s.einst.kiT} onchange={(e) => setze('kiT', (e.currentTarget as HTMLSelectElement).value)}>
          <option data-begriff="cohens-d" value="d">{L('Für d', 'For d')}</option><option value="punkte">{L('In Punkten', 'In points')}</option><option value="beide">{L('Beide', 'Both')}</option>
        </select></span>
      </div>
      <div class="ez-zeile" {...zeig('kurs')}>
        <div class="ez-text"><label for="ez-kurs">{L('Kursmodus', 'Course mode')}</label><span>{L('t-Test und Varianzanalyse: Welch (Standard) oder klassisch mit gleicher Streuung.', 't test and analysis of variance: Welch (default) or classical with equal spread.')}</span></div>
        <span class="ez-wahl"><select id="ez-kurs" value={s.einst.kurs ?? 'welch'} onchange={(e) => setze('kurs', (e.currentTarget as HTMLSelectElement).value)}>
          <option data-begriff="welch-test" value="welch">{L('Welch (Standard)', 'Welch (default)')}</option><option data-begriff="gepoolter-t-test" value="klassisch">{L('Klassisch (gleiche Streuung)', 'Classical (equal spread)')}</option>
        </select></span>
      </div>
      <label class="ez-zeile ez-klick" {...zeig('kurzekoepfe')}>
        <span class="ez-text"><span class="ez-name">{L('Kurze Spaltenköpfe', 'Short column headers')}</span><span>{L('In Tabellen SD, SE, p statt Standardabweichung, Standardfehler, Signifikanz. Die Sprachausgabe liest dann die Kurzform, die lange Form steht unter der Tabelle.', 'In tables SD, SE, p instead of standard deviation, standard error, significance. A screen reader then reads the short form; the long form is listed below the table.')}</span></span>
        <span class="schalter"><input type="checkbox" role="switch" checked={!!s.einst.kurzeKoepfe} onchange={(e) => { s.einst.kurzeKoepfe = (e.currentTarget as HTMLInputElement).checked; einstSpeichern(); }}></span>
      </label>
      <label class="ez-zeile ez-klick" {...zeig('wordbild')}>
        <span class="ez-text"><span class="ez-name">{L('Bildbeschreibungen im Text', 'Image descriptions in the text')}</span><span>{L('Word-Bericht: Beschreibung und Datentabelle stehen nach jedem Diagramm im Text. Der Alternativtext am Bild bleibt immer.', 'Word report: description and data table follow every chart in the text. The alt text on the image always stays.')}</span></span>
        <span class="schalter"><input type="checkbox" checked={s.einst.wordBildbeschreibungen !== false} onchange={(e) => { s.einst.wordBildbeschreibungen = (e.currentTarget as HTMLInputElement).checked; einstSpeichern(); }}></span>
      </label>
      <label class="ez-zeile ez-klick">
        <span class="ez-text"><span class="ez-name">{L('Statable-Logo klein unten in Diagrammen', 'Small Statable logo at the bottom of charts')}</span><span>{L('Für Abschlussarbeiten und Zeitschriften lassen sich Abbildungen ohne Logo speichern.', 'For theses and journals you can save figures without the logo.')}</span></span>
        <span class="schalter"><input type="checkbox" checked={s.einst.bildLogo !== false} onchange={(e) => { s.einst.bildLogo = (e.currentTarget as HTMLInputElement).checked; einstSpeichern(); }}></span>
      </label>
      <label class="ez-zeile ez-klick" {...zeig('deutung')}>
        <span class="ez-text"><span class="ez-name">{L('Übungsmodus', 'Practice mode')}</span><span>{L('Deutung der Ergebnisse ausblenden, zum Selbstformulieren.', 'Hide the interpretation of results, for putting it into words yourself.')}</span></span>
        <span class="schalter"><input id="ez-deutung" type="checkbox" role="switch" checked={!!s.einst.ohneDeutung} onchange={(e) => { s.einst.ohneDeutung = (e.currentTarget as HTMLInputElement).checked; einstSpeichern(); }}></span>
      </label>
      <fieldset class="ez-zeile" {...zeig('bezuege')} style="display:block"><legend class="ez-name">{L('Vergleich mit anderen Programmen', 'Comparison with other programs')}</legend>
        {#each [['excel', L('Excel (Google Tabellen)', 'Excel (Google Sheets)')], ['ti84', 'TI-84'], ['spss', 'SPSS'], ['r', 'R'], ['jamovi', 'jamovi'], ['stata', 'Stata'], ['geogebra', 'GeoGebra'], ['rechnung', L('Rechnung zum Mitlesen', 'Calculation to follow along')]] as [k, t] (k)}
          <label class="ez-klick" style="display:flex;gap:var(--a2);align-items:center;margin:var(--a1) 0"><input type="checkbox" role="switch" checked={!!(s.einst.bezuege as Record<string, boolean> | undefined)?.[k as string]} onchange={(e) => { s.einst.bezuege = { ...(s.einst.bezuege ?? {}), [k as string]: (e.currentTarget as HTMLInputElement).checked }; einstSpeichern(); }}>{t}</label>
        {/each}
      </fieldset>
      <label data-begriff="bayes-faktor" class="ez-zeile ez-klick" {...zeig('bayes')}>
        <span class="ez-text"><span class="ez-name">{L('Bayes-Faktoren zeigen', 'Show Bayes factors')}</span><span>{L('t-Test, Prä-Post, Pearson, einfaktorielle Varianzanalyse und lineare Regression mit BF₁₀ (wie in JASP).', 't test, before/after, Pearson, one-way analysis of variance and linear regression with BF₁₀ (as in JASP).')}</span></span>
        <span class="schalter"><input type="checkbox" role="switch" checked={s.einst.bayes} onchange={(e) => { s.einst.bayes = (e.currentTarget as HTMLInputElement).checked; einstSpeichern(); }}></span>
      </label>
    </div>
  </section>

  <section class="ez-gruppe">
    <h2 id="ez-ein" tabindex="-1">{L('Einstieg', 'Getting started')}</h2>
    <div class="ez-karte">
      <label class="ez-zeile ez-klick" {...zeig('profi')}>
        <span class="ez-text"><span class="ez-name">{L('Ich kenne mich aus', 'I know my way around')}</span><span>{L('Befehle und alle Zahlen sofort offen, Seitenleiste startet eingeklappt.', 'Commands and all numbers open right away, side panel starts collapsed.')}</span></span>
        <span class="schalter"><input type="checkbox" role="switch" bind:checked={s.einst.profi} onchange={einstSpeichern}></span>
      </label>
      <div class="ez-zeile" {...zeig('rundgang')}>
        <div class="ez-text"><span class="ez-name">{L('Rundgang', 'Tour')}</span><span>{L('Die Fragen nach der Arbeitsweise und dem Fach und kurze Hinweise beim nächsten Öffnen der Daten.', 'The questions about how you work and your field and short tips the next time you open the data.')}</span></div>
        <button class="k" type="button" aria-disabled={s.einst.rundgang && (!s.einst.profi || s.einst.rundgangErneut) ? 'true' : undefined} onclick={() => { s.einst.rundgang = true; s.einst.rundgangErneut = true; einstSpeichern(); melde(s.projekt ? L('Der Rundgang kommt auf der Daten-Seite.', 'The tour will appear on the Data page.') : L('Der Rundgang kommt, sobald Daten offen sind.', 'The tour will appear once data is open.')); }}>{L('Wieder zeigen', 'Show again')}</button>
      </div>
    </div>
  </section>
  <section class="ez-gruppe">
    <h2 id="ez-offline" tabindex="-1">{L('Ohne Netz', 'Without internet')}</h2>
    <div class="ez-karte">
      <div class="ez-zeile">
        {#if OFFLINE}
          <div class="ez-text"><span class="ez-name">{L(`Offline-Fassung vom ${offlineStandText()}`, `Offline version from ${offlineStandText()}`)}</span><span>{L('Diese Fassung wird nicht aktualisiert. Auf Dauer bitte statable.eu verwenden.', 'This version is not updated. For regular use, please use statable.eu.')}</span></div>
        {:else}
          <div class="ez-text"><span class="ez-name">{L('Offline-Fassung herunterladen', 'Download the offline version')}</span><span>{L('Für Prüfungen und Orte ohne Netz: das ganze Programm als ZIP, läuft am Rechner ohne Internet (Windows, Mac, Linux). Auf Dauer nicht empfohlen - sie wird nicht aktualisiert.', 'For exams and places without internet: the whole program as a ZIP that runs on the computer without internet (Windows, Mac, Linux). Not recommended for regular use - it is not updated.')}</span></div>
          {#if paket}<a class="k" href={OFFLINE_PAKET} download onclick={() => zaehle('offline', 'zip')}>{L(`ZIP herunterladen (${ganzZahl(Math.round(paket.bytes / 1e6))} MB)`, `Download ZIP (${ganzZahl(Math.round(paket.bytes / 1e6))} MB)`)}</a>{/if}
        {/if}
      </div>
    </div>
  </section>
  </div>
  </div>
  {#if import.meta.env.VITE_KONTO === '1'}{#await import('../bausteine/KontoFeld.svelte')}<p role="status"><Rechnet text={L('Wird geladen …', 'Loading …')} /></p>{:then m}<m.default />{/await}{/if}
</section><Rand kontext={randKontext} mitVerlauf={false} /></div>

<style>
  /* Im Blatt wie die anderen Seiten; die Erklärung steht im Rand (Rand.svelte). */
  .ez { display: flex; flex-direction: column; gap: var(--a5); }
  .ez-kopf { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--a3); flex-wrap: wrap; }
  .ez-kopf h1 { font: 600 var(--gr-h1)/1.2 var(--schrift-ui); }
  .ez-kopf p { color: var(--tinte-2); margin-top: var(--a1); }
  .ez-kopf-rechts { display: flex; align-items: center; gap: var(--a2); }
  .ez-raster { display: grid; grid-template-columns: 12rem minmax(0, 1fr); gap: var(--a5); align-items: start; }
  .ez-gruppen { display: flex; flex-direction: column; gap: var(--a5); min-width: 0; }
  .ez-sprung { position: sticky; top: var(--a4); }
  .ez-sprung ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a1); }
  .ez-sprung a { display: block; padding: var(--a2) var(--a3); border-radius: var(--r-klein); color: var(--akzent-tinte); font-weight: 600; }
  .ez-sprung a { text-decoration: none; }
  .ez-sprung a:hover { background: var(--akzent-hell); text-decoration: underline; }
  .ez-n { color: var(--tinte-2); font-weight: 400; margin-inline-start: var(--a1); }
  :global(:where(:root.eng-860)) .ez-raster { grid-template-columns: minmax(0, 1fr); gap: var(--a3); }
  :global(:where(:root.eng-860)) .ez-sprung { position: static; }
  :global(:where(:root.eng-860)) .ez-sprung ul { flex-direction: row; flex-wrap: wrap; gap: var(--a2); }
  .ez-gruppe { display: flex; flex-direction: column; gap: var(--a2); }
  .ez-gruppe h2 { font: 700 var(--gr-klein)/1.3 var(--schrift-ui); letter-spacing: .04em; text-transform: uppercase; color: var(--tinte-2); margin: 0 var(--a1); }
  .ez-karte { border: 1px solid var(--linie); border-radius: var(--r-gross); overflow: hidden; }
  .ez-zeile { transition: background-color var(--dauer-wechsel) var(--kurve); }
  .ez-zeile:hover, .ez-zeile:focus-within { background: var(--blatt-2); }
  .ez-zeile { display: flex; align-items: center; justify-content: space-between; gap: var(--a3) var(--a5); padding: var(--a3) var(--a4); flex-wrap: wrap; }
  .ez-zeile + .ez-zeile, .ez-vorschau + .ez-zeile { border-top: 1px solid var(--linie); }
  .ez-mit-vorschau { padding-bottom: var(--a2); }
  .ez-klick { cursor: pointer; flex-wrap: nowrap; }
  .ez-text { display: flex; flex-direction: column; gap: 2px; flex: 1 1 16rem; min-width: 0; }
  .ez-text > label, .ez-name { font-weight: 650; }
  .ez-text > span:not(.ez-name) { font-size: var(--gr-klein); color: var(--tinte-2); line-height: 1.4; }
  /* Pull-down: eigener Pfeil in Schriftfarbe (wirkt in jedem Farbmodus) */
  .ez-wahl { position: relative; display: inline-flex; flex: 0 0 auto; }
  .ez-wahl::after { content: ""; position: absolute; inset-inline-end: 14px; top: 50%; width: 7px; height: 7px; border-right: 2px solid var(--tinte-2); border-bottom: 2px solid var(--tinte-2); transform: translateY(-70%) rotate(45deg); pointer-events: none; }
  .ez-wahl select { appearance: none; -webkit-appearance: none; font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding-block: 0; padding-inline: var(--a3) 2.5rem; min-width: 15rem; cursor: pointer; transition: border-color var(--dauer-wechsel) var(--kurve), background-color var(--dauer-wechsel) var(--kurve); }
  .ez-wahl select:hover { background: var(--blatt-2); }
  .ez-wahl select:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
  /* Umschalter für genau zwei Möglichkeiten (du | Sie) - die Wahl gleitet über */
  .ez-umschalter { display: inline-flex; padding: 3px; gap: 2px; background: var(--grund); border-radius: calc(var(--r-klein) + 3px); }
  .ez-umschalter label { position: relative; display: inline-flex; align-items: center; justify-content: center; min-height: calc(var(--ziel) - 6px); min-width: 4.5rem; padding: 0 var(--a3); border-radius: var(--r-klein); font-weight: 650; color: var(--tinte-2); cursor: pointer; transition: background-color var(--dauer-wechsel) var(--kurve), color var(--dauer-wechsel) var(--kurve), box-shadow var(--dauer-wechsel) var(--kurve); }
  .ez-umschalter label:has(input:checked) { background: var(--blatt); color: var(--tinte); box-shadow: 0 1px 2px rgba(29, 37, 48, .14); }
  .ez-umschalter label:has(input:focus-visible) { box-shadow: var(--fokus-ring); }
  .ez-umschalter input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .ez-vorschau { margin: 0 var(--a4) var(--a3); padding: var(--a3); background: var(--blatt-2); border-radius: var(--r); display: flex; gap: var(--a3); align-items: center; flex-wrap: wrap; }
  .ez-vorschau > span { font-size: var(--gr-klein); font-weight: 650; color: var(--tinte-2); }
  /* Breiten-Schwellen hängen an der gefühlten Breite (Fensterbreite / Größe, Klassen am <html>, lib/groesse.svelte.ts) */
  :global(:where(:root.eng-700)) .ez-wahl, :global(:where(:root.eng-700)) .ez-wahl select { width: 100%; min-width: 0; }
  :global(:where(:root.eng-700)) .ez-zeile { padding: var(--a3); }
  :global(:where(:root.eng-700)) .ez-vorschau { margin-inline: var(--a3); }
</style>
