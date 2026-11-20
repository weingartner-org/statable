/**
 * Seitenleiste der Prüfschritt-Fragen `pm-` (Usability Stufe 6a): Frage-id → Hilfe-Artikel oder Begriff. Eigene kleine Datei, damit die Fragen selbst erst bei Bedarf laden;
 * `fragen-seite.ts` fügt sie ein. Der Test fragen.test.ts prüft: Jede Frage hat einen Eintrag, jedes Ziel existiert.
 */
export const SEITE_PM: Record<string, string> = {
  'pm-in-zuordnen': 'inhaltsvaliditaet', 'pm-in-gegenlaeufig': 'konstrukt', 'pm-in-beide': 'konstrukt', 'pm-in-weder': 'inhaltsvaliditaet', 'pm-in-warum': 'inhaltsvaliditaet', 'pm-in-mehrfach': 'konstrukt',
  'pm-fa-grenze': 'ladung', 'pm-fa-negativ': 'ladung', 'pm-fa-zuordnen': 'faktorenanalyse', 'pm-fa-doppel': 'ladung', 'pm-fa-ohne-konstrukt': 'faktorenanalyse', 'pm-fa-ohne-ladung': 'ladung', 'pm-fa-mehrfach': 'ladung',
  'pm-rel-vorbereiten': 'umpolen', 'pm-rel-roh': 'umpolen', 'pm-rel-ohne': 'cronbach-alpha', 'pm-rel-grenze': 'cronbach-alpha', 'pm-rel-gereizt': 'cronbach-alpha', 'pm-rel-mehrfach': 'cronbach-alpha',
  'pm-ges-a1': 'ladung', 'pm-ges-e2': 'ladung', 'pm-ges-c2': 'cronbach-alpha', 'pm-ges-n4': 'cronbach-alpha', 'pm-ges-wert': 'skalenwert', 'pm-ges-mehrfach': 'skalenwert'
};
