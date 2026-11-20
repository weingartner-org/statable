/**
 * Design-Steckbrief (Stufe A2): Statable fragt und benennt, es empfiehlt keine Schablone.
 * Quellen: Schoonenboom & Johnson (2017), How to construct a mixed methods research design, KZfSS 69 (Suppl. 2), 107-131 (Fragen nach Zeitfolge,
 * Gewicht, Zweck, Integrationspunkt); Morse (1991), Nursing Research 40(2) (Schreibweise QUAN → qual); Creswell & Plano Clark (2018), Designing and
 * Conducting Mixed Methods Research, 3. Aufl. (Namen convergent, explanatory sequential, exploratory sequential, complex); Kuckartz (2014), Mixed Methods
 * (deutsche Namen Parallel-, Vertiefungs-, Verallgemeinerungsdesign); Greene, Caracelli & Graham (1989), EEPA 11(3) (Zwecke); Fetters, Curry & Creswell
 * (2013), Health Services Research 48(6) (Integration: verbinden, aufbauen, zusammenführen, einbetten).
 */
import { L } from './sitzung.svelte';
import { MM_GEWICHTE, MM_INTEGRATION, MM_REIHENFOLGEN, MM_ZWECKE, type MmDesign, type QualProjekt } from './qualprojekt';

export type Reihenfolge = typeof MM_REIHENFOLGEN[number];
export type Gewicht = typeof MM_GEWICHTE[number];
export type Zweck = typeof MM_ZWECKE[number];
export type Integrationsart = typeof MM_INTEGRATION[number];

export const reihenfolgeText = (r: Reihenfolge): string => ({
  'gleichzeitig': L('Zahlen und Texte werden zur selben Zeit erhoben (gleichzeitig, concurrent)', 'Numbers and texts are collected at the same time (concurrent)'),
  'quan-zuerst': L('Erst die Zahlen, danach die Texte (nacheinander, sequential)', 'First the numbers, then the texts (sequential)'),
  'qual-zuerst': L('Erst die Texte, danach die Zahlen (nacheinander, sequential)', 'First the texts, then the numbers (sequential)'),
  'mehrphasig': L('In mehreren Phasen oder in einem größeren Rahmen (mehrphasig, complex)', 'In several phases or within a larger frame (multiphase, complex)'),
})[r];
export const gewichtText = (g: Gewicht): string => ({
  'gleich': L('Beide Teile sind gleich wichtig (gleiches Gewicht, equal priority)', 'Both parts are equally important (equal priority)'),
  'quan': L('Die Zahlen sind der Hauptteil (Gewicht auf quantitativ)', 'The numbers are the main part (priority on quantitative)'),
  'qual': L('Die Texte sind der Hauptteil (Gewicht auf qualitativ)', 'The texts are the main part (priority on qualitative)'),
})[g];
export const zweckText = (z: Zweck): string => ({
  'triangulation': L('Bestätigung suchen: Kommen beide Wege zum selben Ergebnis? (Triangulation)', 'Seek confirmation: do both ways reach the same result? (triangulation)'),
  'ergaenzung': L('Ergänzen: verschiedene Seiten derselben Sache zeigen (Komplementarität, complementarity)', 'Complement: show different sides of the same thing (complementarity)'),
  'entwicklung': L('Entwickeln: Ein Teil baut den anderen, zum Beispiel einen Fragebogen aus Interviews (Entwicklung, development)', 'Develop: one part builds the other, for example a questionnaire from interviews (development)'),
  'initiation': L('Widersprüche und neue Fragen suchen (Initiierung, initiation)', 'Look for contradictions and new questions (initiation)'),
  'erweiterung': L('Mehr Breite: verschiedene Teilfragen mit verschiedenen Methoden (Erweiterung, expansion)', 'More breadth: different sub-questions with different methods (expansion)'),
})[z];
export const integrationText = (i: Integrationsart): string => ({
  'verbinden': L('Verbinden: Ein Teil wählt die Fälle für den anderen, zum Beispiel Interviewte aus der Umfrage (connecting)', 'Connecting: one part selects the cases for the other, for example interviewees from the survey (connecting)'),
  'aufbauen': L('Aufbauen: Ergebnisse eines Teils formen die Erhebung des anderen, zum Beispiel Items aus Kategorien (building)', 'Building: results of one part shape the data collection of the other, for example items from categories (building)'),
  'zusammenfuehren': L('Zusammenführen: Ergebnisse beider Teile nebeneinander vergleichen, zum Beispiel im Joint Display (merging)', 'Merging: compare the results of both parts side by side, for example in a joint display (merging)'),
  'einbetten': L('Einbetten: Ein Teil steckt in einem größeren Rahmen des anderen, an mehreren Stellen verbunden (embedding)', 'Embedding: one part sits inside a larger frame of the other, linked at several points (embedding)'),
})[i];

/** Schreibweise nach Morse (1991): Großbuchstaben = Hauptteil, „+“ = gleichzeitig, „→“ = nacheinander. Ohne Gewicht: Kleinbuchstaben. Mehrphasig: keine. */
export function notation(d: Pick<MmDesign, 'reihenfolge' | 'gewicht'>): string | null {
  if (!d.reihenfolge || d.reihenfolge === 'mehrphasig') return null;
  const quan = d.gewicht === 'quan' || d.gewicht === 'gleich' ? 'QUAN' : 'quan';
  const qual = d.gewicht === 'qual' || d.gewicht === 'gleich' ? 'QUAL' : 'qual';
  if (d.reihenfolge === 'gleichzeitig') return d.gewicht === 'qual' ? `${qual} + ${quan}` : `${quan} + ${qual}`;
  return d.reihenfolge === 'quan-zuerst' ? `${quan} → ${qual}` : `${qual} → ${quan}`;
}

/** Name des Grunddesigns, englisch (Creswell & Plano Clark 2018) und deutsch (Kuckartz 2014); mehrphasig: kein Standardname. */
export function designName(d: Pick<MmDesign, 'reihenfolge'>): { en: string; de: string } | null {
  switch (d.reihenfolge) {
    case 'gleichzeitig': return { en: 'convergent design', de: 'Paralleldesign' };
    case 'quan-zuerst': return { en: 'explanatory sequential design', de: 'Vertiefungsdesign' };
    case 'qual-zuerst': return { en: 'exploratory sequential design', de: 'Verallgemeinerungsdesign' };
    default: return null;
  }
}

/** Ablauf als Schritte (für das Bild und seine Textfassung): je Schritt eine oder zwei Kästen nebeneinander. */
export function ablauf(d: Pick<MmDesign, 'reihenfolge' | 'gewicht'>): string[][] {
  const quan = d.gewicht === 'quan' || d.gewicht === 'gleich' ? L('Zahlen erheben und auswerten (QUAN)', 'Collect and analyse numbers (QUAN)') : L('Zahlen erheben und auswerten (quan)', 'Collect and analyse numbers (quan)');
  const qual = d.gewicht === 'qual' || d.gewicht === 'gleich' ? L('Texte erheben und auswerten (QUAL)', 'Collect and analyse texts (QUAL)') : L('Texte erheben und auswerten (qual)', 'Collect and analyse texts (qual)');
  const deuten = L('Gemeinsam deuten (Meta-Inferenz)', 'Interpret together (meta-inference)');
  switch (d.reihenfolge) {
    case 'gleichzeitig': return [[quan, qual], [L('Ergebnisse zusammenführen (Joint Display)', 'Merge the results (joint display)')], [deuten]];
    case 'quan-zuerst': return [[quan], [L('Fälle oder Fragen für die Interviews wählen (verbinden)', 'Choose cases or questions for the interviews (connecting)')], [qual], [deuten]];
    case 'qual-zuerst': return [[qual], [L('Kategorien in Items oder Hypothesen umsetzen (aufbauen)', 'Turn categories into items or hypotheses (building)')], [quan], [deuten]];
    default: return [];
  }
}
/** Textfassung des Ablaufbilds (für Screenreader und Word). */
export const ablaufText = (schritte: string[][]): string =>
  schritte.map((s, i) => `${L('Schritt', 'Step')} ${i + 1}: ${s.join(L(' und gleichzeitig ', ' and at the same time '))}`).join('. ') + (schritte.length ? '.' : '');

/**
 * Fragen an die Person (keine Empfehlung): nur, wenn Angaben nicht zueinander zu passen scheinen. Kennungen für Tests.
 * - `folge-ohne-aufbau`: nacheinander, aber weder „verbinden“ noch „aufbauen“ gewählt.
 * - `gleich-ohne-zusammen`: gleichzeitig, aber nicht „zusammenführen“.
 * - `entwicklung-gleichzeitig`: Zweck „entwickeln“ bei gleichzeitiger Erhebung.
 * - `mehrphasig-ohne-text`: mehrphasig ohne eigene Beschreibung.
 */
export function designFragen(d: MmDesign): { kennung: string; text: string }[] {
  const r: { kennung: string; text: string }[] = [];
  const seq = d.reihenfolge === 'quan-zuerst' || d.reihenfolge === 'qual-zuerst';
  if (seq && !d.integration.includes('verbinden') && !d.integration.includes('aufbauen'))
    r.push({ kennung: 'folge-ohne-aufbau', text: L('Bei Teilen nacheinander nimmt der zweite meist etwas aus dem ersten mit (verbinden oder aufbauen). Wie ist das bei Ihnen?', 'With parts one after the other, the second usually takes something from the first (connecting or building). How is that in your study?') });
  if (d.reihenfolge === 'gleichzeitig' && !d.integration.includes('zusammenfuehren'))
    r.push({ kennung: 'gleich-ohne-zusammen', text: L('Bei gleichzeitiger Erhebung kommen die Ergebnisse meist beim Zusammenführen zusammen. Wo verbinden Sie sie?', 'With concurrent data collection the results usually come together when merging. Where do you link them?') });
  if (d.reihenfolge === 'gleichzeitig' && d.zwecke.includes('entwicklung'))
    r.push({ kennung: 'entwicklung-gleichzeitig', text: L('„Entwickeln“ heißt: Ein Teil baut den anderen. Das braucht meist eine Reihenfolge. Passt „gleichzeitig“ dazu?', '"Develop" means: one part builds the other. That usually needs an order. Does "concurrent" fit with that?') });
  if (d.reihenfolge === 'mehrphasig' && !d.beschreibung?.trim())
    r.push({ kennung: 'mehrphasig-ohne-text', text: L('Für mehrphasige Designs gibt es keinen Standardnamen. Beschreiben Sie Ihr Design bitte in eigenen Worten.', 'There is no standard name for multiphase designs. Please describe your design in your own words.') });
  return r;
}

export function setzeDesign(q: QualProjekt, f: (d: MmDesign) => MmDesign, jetzt = Date.now()): QualProjekt {
  const alt: MmDesign = q.mmDesign ?? { zwecke: [], integration: [], geaendert: jetzt };
  return { ...q, mmDesign: { ...f(alt), geaendert: jetzt, ...(q.ich ? { kodierende: q.ich } : {}) } };
}
