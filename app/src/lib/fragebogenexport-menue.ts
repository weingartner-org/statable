/**
 * Export-Menü von „Fragebogen planen“ (Paket 2G, Menü zu 2E): zehn Einträge mit Fachbegriff, Dateiname aus dem Titel, Erzeugung und Sperre.
 * Reine Daten und Erzeugung (kein Svelte); die Oberfläche steht in bausteine/FragebogenExport.svelte. Die Texte folgen der Oberflächensprache.
 */
import { L } from './sitzung.svelte';
import { dateiname } from './dateiname';
import type { FragebogenPlan } from './fragebogenplan';
import { planPruefen, platzhalterStellen } from './fragebogenplan';
import { sperre } from './fragebogenexport';

export type ExportId = 'xlsform' | 'limesurvey' | 'surveyjs' | 'pspp' | 'kodebuch' | 'word' | 'html' | 'papier-standard' | 'papier-gross' | 'text';

export interface ExportEintrag {
  id: ExportId;
  /** Name mit Fachbegriff in der Oberflächensprache */
  name: string;
  /** ein Satz: wozu */
  was: string;
  /** Warnhinweis (LimeSurvey), sonst leer */
  warnung?: string;
}

export const exportEintraege = (): ExportEintrag[] => [
  { id: 'xlsform', name: L('XLSForm (Excel-Format für KoboToolbox und ODK)', 'XLSForm (Excel format for KoboToolbox and ODK)'), was: L('Zum Befragen am Handy mit KoboToolbox oder ODK; lässt sich in Statable wieder öffnen.', 'For surveying on a phone with KoboToolbox or ODK; can be opened in Statable again.') },
  { id: 'limesurvey', name: L('LimeSurvey (Text-Format für Umfragen)', 'LimeSurvey (survey text format)'), was: L('Zum Import in LimeSurvey.', 'For import into LimeSurvey.'), warnung: L('Nicht mit LimeSurvey geprüft.', 'Not tested with LimeSurvey.') },
  { id: 'surveyjs', name: L('SurveyJS (JSON-Beschreibung einer Umfrage)', 'SurveyJS (JSON description of a survey)'), was: L('Zum Einbauen in eigene Webseiten mit SurveyJS.', 'For embedding in your own web pages with SurveyJS.') },
  { id: 'pspp', name: L('PSPP-Syntax (Befehlsdatei für Statable und PSPP)', 'PSPP syntax (command file for Statable and PSPP)'), was: L('Beschriftungen, Wertelabels, fehlende Werte und Messniveaus für die Daten dieses Fragebogens.', 'Labels, value labels, missing values and measurement levels for the data of this questionnaire.') },
  { id: 'kodebuch', name: L('Kodebuch (Word)', 'Codebook (Word)'), was: L('Je Variable Name, Fragetext, Werte, Fehlendcodes und Messniveau als Tabelle.', 'Name, question text, values, missing codes and measurement level of each variable as a table.') },
  { id: 'word', name: L('Fragebogen (Word)', 'Questionnaire (Word)'), was: L('Lesbare Fassung zum Ausdrucken und Weitergeben.', 'Readable version for printing and passing on.') },
  { id: 'html', name: L('Fragebogen (HTML, barrierefrei zum Lesen)', 'Questionnaire (HTML, accessible, for reading)'), was: L('Eine Datei mit Überschriften und Listen, zum Lesen, nicht zum Ausfüllen.', 'One file with headings and lists, for reading, not for filling in.') },
  { id: 'papier-standard', name: L('Papierbogen, Standard (Word)', 'Paper form, standard (Word)'), was: L('Bogen-Nummer oben, Kästchen, Filter als „Weiter mit Frage …“.', 'Questionnaire number on top, tick boxes, filters as "Go to question …".') },
  { id: 'papier-gross', name: L('Papierbogen, Großdruck (Word)', 'Paper form, large print (Word)'), was: L('Schrift 18 Punkt, Zeilenabstand 1,5, eine Spalte, keine Tabellen.', 'Font 18 point, line spacing 1.5, one column, no tables.') },
  { id: 'text', name: L('Braille-taugliche Textfassung (Text, UTF-8)', 'Braille-ready text version (plain text, UTF-8)'), was: L('Reiner Text ohne Tabellen und Kästchen, Antworten als „1 = …“. Für Braille-Übertragung und zum Vorlesen.', 'Plain text without tables and boxes, answers as "1 = …". For braille transcription and reading aloud.') }
];

/**
 * Fehler, die alle Exporte sperren: zuerst die aus `planPruefen` (mit Element für den Sprunglink), sonst die zusätzlichen Gründe der Exporte selbst
 * (`sperre`, zum Beispiel eine Frage ohne Antwortliste); so steht der Grund da, bevor jemand auf einen Eintrag drückt.
 */
export function sperrFehler(plan: FragebogenPlan): { text: string; element?: string }[] {
  const aus: { text: string; element?: string }[] = planPruefen(plan).filter(b => b.art === 'fehler').map(b => ({ text: b.text, element: b.element }));
  for (const p of platzhalterStellen(plan)) aus.push({ text: L(`Vorlagentext noch nicht ersetzt in „${p.name}“: Die Klammer wie „(hier eintragen)“ gehört ersetzt.`, `Template text not replaced in "${p.name}": replace the bracket like "(enter here)".`), element: p.element });
  if (aus.length) return aus;
  try { sperre(plan); } catch (e) { for (const t of (e instanceof Error ? e.message : '').replace(/^planFehler:?\s*/, '').split(' | ')) if (t.trim()) aus.push({ text: t.trim() }); }
  return aus;
}

const titelVon = (plan: FragebogenPlan, sprache: string): string => plan.titel[sprache] || plan.titel[plan.sprachen[0] ?? 'de'] || plan.id;
const utf8 = (t: string): Uint8Array => new TextEncoder().encode(t);

export interface ErzeugteDatei { bytes: Uint8Array; name: string; typ: string }
const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Erzeugt die Datei zum Eintrag. Wirft bei Fehlern im Plan („planFehler …“); Sprache = Sprache der Texte in der Datei. */
export async function erzeugeExport(id: ExportId, plan: FragebogenPlan, sprache: string, opt: { textAuchWord?: boolean } = {}): Promise<ErzeugteDatei[]> {
  const basis = dateiname(titelVon(plan, sprache));
  const d = (art: string, endung: string) => `${basis} - ${art}.${endung}`;
  const ex = () => import('./fragebogenexport');
  const pa = () => import('./papier');
  switch (id) {
    case 'xlsform': return [{ bytes: await (await ex()).alsXlsform(plan), name: d('XLSForm', 'xlsx'), typ: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }];
    case 'limesurvey': return [{ bytes: utf8((await ex()).alsLimeSurvey(plan).text), name: d('LimeSurvey', 'txt'), typ: 'text/plain;charset=utf-8' }];
    case 'surveyjs': return [{ bytes: utf8(JSON.stringify((await ex()).alsSurveyJs(plan), null, 2)), name: d('SurveyJS', 'json'), typ: 'application/json' }];
    case 'pspp': return [{ bytes: utf8((await ex()).alsPsppSyntax(plan)), name: d(L('PSPP-Syntax', 'PSPP syntax'), 'sps'), typ: 'text/plain;charset=utf-8' }];
    case 'kodebuch': return [{ bytes: await (await ex()).kodebuchWord(plan, sprache), name: d(L('Kodebuch', 'Codebook'), 'docx'), typ: WORD }];
    case 'word': return [{ bytes: await (await ex()).fragebogenWord(plan, { sprache }), name: d(L('Fragebogen', 'Questionnaire'), 'docx'), typ: WORD }];
    case 'html': return [{ bytes: utf8((await ex()).fragebogenHtml(plan, sprache)), name: d(L('Fragebogen', 'Questionnaire'), 'html'), typ: 'text/html;charset=utf-8' }];
    case 'papier-standard': return [{ bytes: await (await pa()).papierStandard(plan, sprache), name: d(L('Papierbogen', 'Paper form'), 'docx'), typ: WORD }];
    case 'papier-gross': return [{ bytes: await (await pa()).papierGrossdruck(plan, sprache), name: d(L('Großdruck', 'Large print'), 'docx'), typ: WORD }];
    case 'text': {
      const m = await pa();
      const aus: ErzeugteDatei[] = [{ bytes: utf8(m.papierTextfassung(plan, sprache)), name: d(L('Textfassung', 'Text version'), 'txt'), typ: 'text/plain;charset=utf-8' }];
      if (opt.textAuchWord) aus.push({ bytes: await m.papierTextfassungWord(plan, sprache), name: d(L('Textfassung', 'Text version'), 'docx'), typ: WORD });
      return aus;
    }
  }
}
