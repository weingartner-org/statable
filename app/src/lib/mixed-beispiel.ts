/**
 * Mixed-Methods-Beispiel „Asking for help in the first year“ (Stufe A2, erfunden): öffnet die Umfrage (n = 60) als NEUES Projekt und legt das
 * qualitative Projekt (5 Interviews, Muster-Codebuch, 3 Beispiel-Themen) dazu. Erzeugt von `scripts/beispiel-mixed/erzeugen.mjs`.
 * Die Kodierungen sind Beispielarbeit von Hand; Statable bietet sie nie als Vorschlag an. Die Verknüpfung (survey_id) setzt die Person selbst.
 * Werte gehen als Daten an die Engine (`oeffneNeueDaten`, nie als Befehlstext).
 */
import { L, oeffneNeueDaten, setzeQual } from './sitzung.svelte';
import { pruefeQualProjekt, type QualProjekt } from './qualprojekt';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';

const ZUSTIMMUNG: Record<string, string> = { '1': 'strongly disagree', '2': 'disagree', '3': 'neither', '4': 'agree', '5': 'strongly agree' };
const BEZ: Record<string, string> = {
  survey_id: 'Number in the survey', field: 'Field of study', first_generation: 'First in the family at university', study_mode: 'Full-time or part-time',
  hs1: 'Asking makes me look less capable', hs2: 'Embarrassed to ask lecturers or tutors', hs3: 'Easy to ask for help (reversed)', hs4: 'Rather struggle alone',
  hs5: 'Know where to get help (reversed)', hs6: 'Do not want to take up others\' time', used_tutoring: 'Used tutoring', gpa_first_term: 'Grade point average, first term (higher = better)',
  belonging: 'Sense of belonging (1 to 7)',
};

/** Spalten und Zeilen aus `umfrage.csv` (Komma, Kopfzeile, leere Zelle = fehlend). */
export function umfrageDaten(csv: string): { spalten: Spalte[]; zeilen: Wert[][] } {
  const z = csv.replace(/\r\n/g, '\n').trim().split('\n').map(l => l.split(','));
  const kopf = z[0]!;
  const zahl = (n: string) => /^hs\d$|^gpa_first_term$|^belonging$/.test(n);
  const spalten: Spalte[] = kopf.map(n => (zahl(n)
    ? { name: n, bezeichnung: BEZ[n] ?? n, art: 'zahl', niveau: n === 'gpa_first_term' ? 'metrisch' : 'ordinal', format: n === 'gpa_first_term' ? 'F4.1' : 'F1.0', fehlend: [], fehlendText: '', werteLabels: /^hs\d$/.test(n) ? { ...ZUSTIMMUNG } : {} }
    : { name: n, bezeichnung: BEZ[n] ?? n, art: 'text', niveau: 'nominal', format: 'A20', fehlend: [], fehlendText: '', werteLabels: {} }));
  const zeilen: Wert[][] = z.slice(1).map(r => kopf.map((n, i) => {
    const v = (r[i] ?? '').trim();
    if (v === '') return null;
    return zahl(n) ? Number(v) : v;
  }));
  return { spalten, zeilen };
}

/** Lädt beide Dateien und öffnet sie als neues Projekt. Gibt Zahlen für die Ansage zurück. */
export async function oeffneMixedBeispiel(): Promise<{ dokumente: number; zeilen: number }> {
  const basis = new URL('beispiel/mixed/', document.baseURI);
  const [rp, rc] = await Promise.all([fetch(new URL('hilfe-projekt.json', basis)), fetch(new URL('umfrage.csv', basis))]);
  if (!rp.ok || !rc.ok) throw new Error('nicht gefunden');
  const q: QualProjekt = pruefeQualProjekt(await rp.json());
  const d = umfrageDaten(await rc.text());
  await oeffneNeueDaten(L('Um Hilfe bitten (Beispiel, erfunden)', 'Asking for help (example, invented)'), L('Erfundenes Beispiel: Umfrage mit 60 Studierenden und 5 Interviews (Mixed Methods)', 'Invented example: survey of 60 students and 5 interviews (mixed methods)'), d.spalten, d.zeilen);
  await setzeQual(q);
  return { dokumente: q.dokumente.length, zeilen: d.zeilen.length };
}
