import { EINHEITEN, PFADE, fragenThemen, einheitNach } from '../../src/lernen/lernplan';
import { ladeAuswahl, THEMEN } from '../../src/lernen/fragen';
import { AUFGABEN } from '../../src/lernen/rechenaufgaben';
import { writeFileSync } from 'node:fs';
const ORT = /\b(links|rechts|oben|unten|rot|rote[nrms]?|grün|grüne[nrms]?|blau|blaue[nrms]?)\b/i;
const out: any = { pfade: PFADE.map(p => ({ id: p.id, einheiten: p.einheiten, abschluss: p.abschluss })), einheiten: {}, ortFarbe: [], aufgaben: {} };
let fragenGes = 0;
for (const e of EINHEITEN) {
  if (e.abschlussVon) { out.einheiten[e.id] = { abschlussVon: e.abschlussVon, fragen: [] }; continue; }
  const m = await ladeAuswahl(fragenThemen(e), e.fragen);
  const fr = m.FRAGEN.map(f => {
    const fall = f.fall ? m.FAELLE?.[f.fall] : undefined;
    const alle = JSON.stringify([f.stamm.de, f.antworten.map(a => [a.text.de, a.warum.de])]);
    const ort = alle.match(ORT);
    const x = { id: f.id, mehrfach: !!f.mehrfach, tabelle: !!f.tabelle || !!fall?.tabellen?.length, diagramm: !!f.diagramm || !!fall?.diagramme?.length, ort: ort?.[0] ?? null, bildhinweis: ort ? alle.slice(Math.max(0, ort.index! - 40), ort.index! + 40) : null, fall: f.fall ?? null };
    if (ort) out.ortFarbe.push({ einheit: e.id, ...x });
    return x;
  });
  fragenGes += e.fragen.length;
  out.einheiten[e.id] = { fragenSoll: e.fragen.length, fragen: fr, rechnen: e.rechnen ?? [], hilfe: e.hilfe.length, beispiele: e.beispiele.length, probieren: e.probieren, abschnitte: undefined };
}
for (const a of AUFGABEN) out.aufgaben[a.id] = a.schritte.map(s => ({ soll: s.soll, stellen: s.stellen, einheit: s.einheit?.de ?? null, falsch: s.fehler[0]?.wert ?? s.soll + 7 }));
out.fragenGes = fragenGes;
writeFileSync(process.argv[2], JSON.stringify(out));
console.log('Einheiten', EINHEITEN.length, 'Fragen', fragenGes, 'Ort/Farbe', out.ortFarbe.length);
