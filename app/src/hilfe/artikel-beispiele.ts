/**
 * „Ausprobieren mit dem Beispiel …“ in der Hilfe: welcher Artikel zu welchen Beispielen (Kennungen aus `lib/beispiele*.ts`) gehört.
 * Nur Verfahren, die ein Beispiel wirklich zeigt. Die Hilfe-Seite macht daraus je Beispiel einen Knopf, der es öffnet
 * (`oeffneBeispielDirekt` in `lib/beispieloeffnen.ts`). Der Test `artikel-beispiele.test.ts` prüft, dass es alle Kennungen gibt.
 */
export const ARTIKEL_BEISPIELE: Record<string, string[]> = {
  'frage-kaplanmeier': ['herzinsuffizienz'],
  'cox-regression': ['herzinsuffizienz'],
  'roc-kurve': ['brustkrebs-diagnostik'],
  'frage-diskriminanz': ['pinguine', 'brustkrebs-diagnostik'],
  'frage-manova': ['pinguine'],
  'frage-cluster': ['pinguine', 'bildung-ungleichheit'],
  'frage-loglinear': ['titanic', 'berkeley-zulassung'],
  'frage-uebereinstimmung': ['diagnosen-uebereinstimmung'],
  'frage-mehrebenen': ['schlafentzug', 'galton-koerpergroesse'],
  'frage-zeitreihen': ['co2'],
  'kalibriergerade-nachweisgrenze': ['kalibrierung'],
  'aequivalenztest-tost': ['woerter-erkennen'],
  'frage-armut': ['arbeit-einkommen-puf'],
  'frage-messwiederholung': ['schule-portugal']
};

export const beispieleFuerHilfe = (artikelId: string): string[] => ARTIKEL_BEISPIELE[artikelId] ?? [];
