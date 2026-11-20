/**
 * M5a: der Aufruf von R für „Tabelle für die Veröffentlichung“. Der Auftrag entsteht rein in lib/amtlich.ts (`amtlichPlan`); hier läuft er über den einen R-Motor
 * (lib/rverfahren.svelte.ts: Pakete laden, Daten binden, nacheinander rechnen). Ein Fehler, der die ganze Tabelle betrifft (Replikationsgewichte unbrauchbar, zu viele Zeilen …),
 * kommt als fertiger Satz (`Fertig`); „zu wenige Fälle in dieser Zeile“ lässt nur die Zellen leer („.“).
 */
import { umfrageRechnenListe, Fertig } from './rverfahren.svelte';
import { umfrageGrenze } from './umfrage';
import { genauigkeitFehlerSatz } from './genauigkeit';
import { AmtlichRFehler, leereRoh, type AmtlichPlan, type RohMatrix } from './amtlich';

export async function amtlichRechnen(plan: AmtlichPlan, zeilen: number, spalten: number): Promise<RohMatrix> {
  const grenze = umfrageGrenze(plan.zeilen);
  if (grenze) throw new Fertig(genauigkeitFehlerSatz({ fehlerCode: grenze, n: plan.zeilen }));
  const aus = await umfrageRechnenListe(plan.spalten, plan.auftraege.map(a => ({ art: a.art, aufruf: a.aufruf })));
  const roh = leereRoh(zeilen, spalten);
  try { plan.auftraege.forEach((a, i) => a.lies(aus[i]!, roh)); }
  catch (e) { if (e instanceof AmtlichRFehler) throw new Fertig(genauigkeitFehlerSatz(e.e)); throw e; }
  return roh;
}
