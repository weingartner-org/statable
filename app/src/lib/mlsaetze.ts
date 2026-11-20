/** Texte des Lernlabor-Reiters „Vorhersagen (k-nächste Nachbarn)“ (V5). Rechnung: lib/ml.ts. Statable beschreibt, was das Modell auf diesen Daten tut, und deutet nichts. */
import { L, Lp } from './sitzung.svelte';
import { zahlDe } from './format';
import { prozent } from './lernlaborsaetze';
import type { MlErgebnis, MlMerkmal, MlZiel } from './ml';

export const merkmalName = (m: MlMerkmal) => ({
  schnabel_laenge: L('Schnabellänge (mm)', 'Bill length (mm)'),
  schnabel_tiefe: L('Schnabeltiefe (mm)', 'Bill depth (mm)'),
  flosse: L('Flossenlänge (mm)', 'Flipper length (mm)'),
  masse: L('Körpermasse (g)', 'Body mass (g)')
})[m];
export const zielName = (z: MlZiel) => (z === 'art' ? L('Pinguinart (3 Arten)', 'Penguin species (3 species)') : L('Geschlecht', 'Sex'));
export const klassenNamen = (z: MlZiel): string[] => (z === 'art'
  ? [L('Adeliepinguin', 'Adelie'), L('Zügelpinguin', 'Chinstrap'), L('Eselspinguin', 'Gentoo')]
  : [L('weiblich', 'female'), L('männlich', 'male')]);

const pz = (p: number) => prozent(p, 1);

export interface MlSatzDaten {
  n: number; nTraining: number; nTest: number; startwert: number; k: number; K: number; standardisieren: boolean;
  erg: MlErgebnis; j: number;
}

/** Ergebnissätze in fester Reihenfolge: Aufteilung, Treffer, Abstand Training/Test, Kreuzvalidierung, Gleichstände. */
export function mlSaetze(s: MlSatzDaten): string[] {
  const fTe = s.erg.fehlerTest[s.j]!, fTr = s.erg.fehlerTraining[s.j]!;
  const richtig = Math.round((1 - fTe) * s.nTest);
  const b = s.erg.ks.indexOf(s.erg.bestesK), fCv = s.erg.fehlerCV[b]!;
  const abstand = (fTe - fTr) * 100;
  const r: string[] = [
    L(`Von ${zahlDe(s.n)} Pinguinen mit vollständigen Werten lernt das Modell an ${zahlDe(s.nTraining)} (Trainingsdaten) und wird an den übrigen ${zahlDe(s.nTest)} geprüft, die es nicht kennt (Testdaten); Startwert ${s.startwert}.`,
      `Of ${zahlDe(s.n)} penguins with complete values, the model learns from ${zahlDe(s.nTraining)} (training data) and is checked on the other ${zahlDe(s.nTest)}, which it has not seen (test data); seed ${s.startwert}.`),
    Lp(s.k, `Mit k = ${s.k} Nachbarn sagt es ${zahlDe(richtig)} von ${zahlDe(s.nTest)} Testpinguinen richtig voraus: Trefferquote ${pz(1 - fTe)}, Fehlerrate ${pz(fTe)}. Auf den Trainingsdaten liegt die Fehlerrate bei ${pz(fTr)}.`, `Mit k = ${s.k} Nachbarn sagt es ${zahlDe(richtig)} von ${zahlDe(s.nTest)} Testpinguinen richtig voraus: Trefferquote ${pz(1 - fTe)}, Fehlerrate ${pz(fTe)}. Auf den Trainingsdaten liegt die Fehlerrate bei ${pz(fTr)}.`,
      `With k = ${s.k} neighbour it predicts ${zahlDe(richtig)} of ${zahlDe(s.nTest)} test penguins correctly: accuracy ${pz(1 - fTe)}, error rate ${pz(fTe)}. On the training data the error rate is ${pz(fTr)}.`, `With k = ${s.k} neighbours it predicts ${zahlDe(richtig)} of ${zahlDe(s.nTest)} test penguins correctly: accuracy ${pz(1 - fTe)}, error rate ${pz(fTe)}. On the training data the error rate is ${pz(fTr)}.`),
    abstand >= 5
      ? L(`Auf neuen Fällen ist der Fehler um ${zahlDe(abstand, 1)} Prozentpunkte größer als auf den Trainingsdaten. Ein großer Abstand ist ein Zeichen von Überanpassung (overfitting): Das Modell hat sich Einzelheiten der Trainingsdaten gemerkt.`,
        `On new cases the error is ${zahlDe(abstand, 1)} percentage points larger than on the training data. A large gap is a sign of overfitting: the model has memorised details of the training data.`)
      : L(`Trainings- und Testfehler liegen nahe beieinander (Abstand ${zahlDe(abstand, 1)} Prozentpunkte); bei wenigen Testfällen schwankt das von Aufteilung zu Aufteilung.`,
        `Training and test error are close together (gap ${zahlDe(abstand, 1)} percentage points); with few test cases this varies from split to split.`),
    L(`In der ${s.K}-fachen Kreuzvalidierung (cross-validation, nur mit den Trainingsdaten) ist die Fehlerrate bei k = ${s.erg.bestesK} am kleinsten (${pz(fCv)}). So wählt man k, ohne die Testdaten anzusehen.`,
      `In ${s.K}-fold cross-validation (using the training data only) the error rate is smallest at k = ${s.erg.bestesK} (${pz(fCv)}). This is how k is chosen without looking at the test data.`)
  ];
  const g = s.erg.gleichstandTest[s.j]!;
  if (g > 0) r.push(Lp(g, `Bei ${g} Testpinguin standen die Stimmen der Nachbarn gleich; dann zählt die Klasse des nächsten Nachbarn.`, `Bei ${g} Testpinguinen standen die Stimmen der Nachbarn gleich; dann zählt die Klasse des nächsten Nachbarn.`,
    `For ${g} test penguin the neighbours' votes were tied; then the class of the nearest neighbour counts.`, `For ${g} test penguins the neighbours' votes were tied; then the class of the nearest neighbour counts.`));
  if (!s.standardisieren) r.push(L('Die Maße sind nicht standardisiert: Das Maß mit den größeren Zahlen (zum Beispiel Gramm statt Millimeter) bestimmt den Abstand fast allein.',
    'The measurements are not standardised: the measurement with the larger numbers (for example grams rather than millimetres) almost alone determines the distance.'));
  return r;
}

export const lehreVorhersagen = () => L('k-nächste Nachbarn (k-nearest neighbours, kNN) sagt einen neuen Fall so voraus wie die Mehrheit der k ähnlichsten Fälle aus den Trainingsdaten. Kleines k folgt jedem Einzelfall (Überanpassung), großes k glättet stark. Ob ein Modell taugt, zeigen nur Fälle, die es beim Lernen nicht gesehen hat. Statable rechnet und beschreibt; was die Vorhersage bedeutet, entscheiden Sie.',
  'k-nearest neighbours (kNN) predicts a new case the way the majority of the k most similar cases in the training data turned out. A small k follows every single case (overfitting), a large k smooths strongly. Only cases the model did not see while learning show whether it is any good. Statable calculates and describes; what the prediction means is for you to decide.');
