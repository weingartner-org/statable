/**
 * Personenwerte der IRT-Modelle (2PL und Stufenmodell): „Erwartungswert der Fähigkeit nach den Antworten“ (EAP, expected a posteriori).
 *   θ̂ = ∫ θ · L(θ) · φ(θ) dθ / ∫ L(θ) · φ(θ) dθ mit der Standardnormalverteilung φ als Vorwissen und den Gauß-Hermite-Stützstellen (21, wie `ltm::factor.scores(…, method = "EAP")`).
 *   Der Standardfehler ist die Streuung der Fähigkeit nach den Antworten (Wurzel der Posterior-Varianz).
 * Die Aufgabenwerte gelten als bekannt (aus dem Modell derselben Daten); ihre Unsicherheit steckt im Standardfehler nicht.
 * Sollwerte: R `ltm::factor.scores(fit, method = "EAP", resp.patterns = …)`, siehe irtpersonen.test.ts.
 * ⚠ Von der Fachperson abzunehmen: Aussagekraft bei Personen mit lauter gleichen Antworten (der Wert wird zur Mitte gezogen), Standardfehler ohne Parameterunsicherheit.
 */
import { gaussHermiteNormal } from './irt2pl';
import { zeilenListe } from './clusterblatt';
import { gueltigerName } from './skalabau';
import { zit } from './befehlstext';

export interface Person { theta: number; se: number }

const logi = (t: number) => (t >= 0 ? 1 / (1 + Math.exp(-t)) : Math.exp(t) / (1 + Math.exp(t)));
const { x: KN, w: KW } = gaussHermiteNormal(21);

function eap(logLik: (q: number) => number): Person {
  const lw = KN.map((q, i) => Math.log(KW[i]!) + logLik(q)), mx = Math.max(...lw);
  const w = lw.map(v => Math.exp(v - mx)), s = w.reduce((a, v) => a + v, 0);
  const m = w.reduce((a, v, i) => a + v * KN[i]!, 0) / s;
  const v = w.reduce((a, x, i) => a + x * (KN[i]! - m) ** 2, 0) / s;
  return { theta: m, se: Math.sqrt(v) };
}

/** 2PL: `items` mit Trennschärfe a und Schwierigkeit b; `y` die Antworten (0/1) einer Person in der Reihenfolge der Aufgaben. */
export function eap2pl(items: { a: number; b: number }[], y: number[]): Person {
  return eap(q => items.reduce((s, it, j) => { const p = logi(it.a * (q - it.b)); return s + Math.log(y[j] === 1 ? Math.max(p, 1e-300) : Math.max(1 - p, 1e-300)); }, 0));
}

/** Stufenmodell: `schwellen` aufsteigend (eine weniger als `stufen`), `stufen` die vorkommenden Antwortwerte aufsteigend; `y` die Antwortwerte einer Person. */
export function eapStufen(items: { a: number; schwellen: number[]; stufen: number[] }[], y: number[]): Person {
  return eap(q => items.reduce((s, it, j) => {
    const c = it.stufen.indexOf(y[j]!);
    if (c < 0) return s;
    const ob = c === 0 ? 1 : logi(it.a * (q - it.schwellen[c - 1]!)), un = c >= it.schwellen.length ? 0 : logi(it.a * (q - it.schwellen[c]!));
    return s + Math.log(Math.max(ob - un, 1e-300));
  }, 0));
}

/**
 * PSPP-Befehl für die neuen Spalten (Fähigkeit und, wenn gewünscht, Standardfehler): `COMPUTE name = $SYSMIS.`, je verschiedenem Wert `IF (ANY($CASENUM, …)) name = Wert.`
 * (die Werte hängen an der Zeilennummer; Personen ohne alle Antworten bleiben fehlend). Werte auf 4 Stellen gerundet. Die Beschriftung läuft durch `zit`; Namen müssen gültig sein.
 */
export function personenSpaltenBefehl(spalten: { name: string; werte: (number | null)[]; beschriftung: string }[]): string {
  const t: string[] = [];
  for (const sp of spalten) {
    if (!gueltigerName(sp.name)) throw new Error('Kein gültiger Spaltenname');
    const nach = new Map<string, number[]>();
    sp.werte.forEach((w, i) => { if (w !== null && Number.isFinite(w)) { const k = (Math.round(w * 1e4) / 1e4).toFixed(4); (nach.get(k) ?? nach.set(k, []).get(k)!).push(i + 1); } });
    t.push(`COMPUTE ${sp.name} = $SYSMIS.`);
    for (const [w, nr] of [...nach].sort((x, y) => Number(x[0]) - Number(y[0]))) t.push(`IF (ANY($CASENUM${zeilenListe(nr)})) ${sp.name} = ${w}.`);
    t.push('EXECUTE.', `FORMATS ${sp.name} (F8.3).`, `VARIABLE LABELS ${sp.name} ${zit(sp.beschriftung)}.`, `VARIABLE LEVEL ${sp.name} (SCALE).`, 'EXECUTE.');
  }
  return t.join('\n');
}
