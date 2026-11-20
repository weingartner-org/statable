/**
 * Das Blatt „Tabelle für die Veröffentlichung“ (M5a): rechnen aus der Wahl, Blatt anlegen, Sätze und Tabellen für Bericht und Export.
 * Das Blatt speichert die WAHL und, wenn R rechnet (Stichprobenplan oder Replikationsgewichte), die Rohwerte von R mit einem Schlüssel für Wahl und Datenstand.
 * Ändern sich die Daten oder die Wahl der Rechnung, passt der Schlüssel nicht mehr: das Blatt zeigt dann „neu rechnen“ und gibt NICHTS aus (nie alte Zahlen veröffentlichen).
 * Geheimhaltung, Kennzeichnung, Texte und Quelle entstehen bei jedem Aufruf neu aus der Wahl und den Rohwerten (folgen so der Sprache und den Einstellungen).
 * Ohne R (ungewichtet, Häufigkeitsgewicht, Umfragegewicht ohne Stichprobenplan) rechnet alles in JavaScript.
 */
import type { TableItem } from '../engine/types';
import { L, s, spalteNach, type Blatt } from './sitzung.svelte';
import { lesbar } from './verzeichnis';
import { gewichtLage } from './fallgewicht.svelte';
import { spaltenStand } from './live';
import type { Quelle } from './gewichtbeschreibend';
import { entwurfPlan } from './umfrageentwurf';
import { repSpalten, repPruefen, planRep, istRepPlan, genauigkeitFehlerSatz, type RepEinstellung } from './genauigkeit';
import { amtlichWahlAus, amtlichVollstaendig, amtlichGrund, amtlichJs, amtlichPlan, amtlichBaue, amtlichItem, amtlichSatz, amtlichTitel, amtlichWeg, brauchtWert,
  type AmtlichWahl, type AmtlichGrund, type AmtlichTabelle, type AmtlichWeg, type RohMatrix, type AmtlichFehler } from './amtlich';
import { amtlichRechnen } from './amtlichrechnen';
import { entwurfWirksam, type GewichtAbdruck } from './gewichte';
import type { Saetze } from './ergebnis';

export interface AmtlichGespeichert { schluessel: string; roh: RohMatrix; nRep?: number; scale?: number | null; typ?: AmtlichWahl['rep']['typ'] }
export type AmtlichBerechnet =
  | { art: 'ok'; t: AmtlichTabelle; item: TableItem; titel: string; w: AmtlichWahl; weg: AmtlichWeg; roh: RohMatrix }
  | { art: 'leer' }
  | { art: 'rechnen'; weg: Exclude<AmtlichWeg, 'js'>; schluessel: string }
  | { art: 'fehler'; text: string };

const name = (n: string) => (n ? lesbar(spalteNach(n), true) || n : '');
const stufeName = (spalte: string, wert: string | number): string => { const l = spalteNach(spalte)?.werteLabels; return l?.[String(wert)] ?? String(wert); };

function fehlerText(f: AmtlichFehler, w: AmtlichWahl): string {
  switch (f) {
    case 'leer': return L('Es gibt keine Fälle mit Gewicht und Angaben in allen gewählten Spalten.', 'There are no cases with a weight and values in all chosen columns.');
    case 'zu-viele-zeilen': return L(`Das Zeilenmerkmal hat mehr als 30 Stufen. So viele lassen sich in einer Tabelle nicht lesen: Stufen zusammenfassen (Umkodieren) oder eine andere Spalte wählen.`, 'The row variable has more than 30 levels. That many cannot be read in one table: combine levels (recode) or choose another column.');
    case 'zu-viele-spalten': return L('Das Spaltenmerkmal hat mehr als 30 Stufen. So viele lassen sich in einer Tabelle nicht lesen: Stufen zusammenfassen (Umkodieren) oder eine andere Spalte wählen.', 'The column variable has more than 30 levels. That many cannot be read in one table: combine levels (recode) or choose another column.');
    case 'zu-viele-zellen': return brauchtWert(w) ? L('Zu viele Zellen für Mittelwert oder Summe (mehr als 150 mit Rändern). Weniger Stufen wählen.', 'Too many cells for a mean or sum (more than 150 including totals). Choose fewer levels.') : L('Zu viele Zellen.', 'Too many cells.');
    default: return L('Zu viele Daten für die Rechnung im Browser (Zeilen mal Spalten). Weniger Replikationsgewichte oder Stufen wählen.', 'Too much data for the calculation in the browser (rows times columns). Choose fewer replicate weights or levels.');
  }
}

/** Gewicht und Daten, mit denen gerechnet wird; sonst ein Satz, warum nicht. */
function eingabe(): { q: Quelle; gw: GewichtAbdruck | undefined; haeufig: boolean } | { text: string } {
  const l = gewichtLage();
  if (l.art === 'frage') return { text: L('Das Fallgewicht ist noch nicht festgelegt: Erst die Art des Gewichts wählen (Kopfzeile), dann rechnet die Tabelle.', 'The case weight is not set yet: first choose the kind of weight (header), then the table is calculated.') };
  if (l.art === 'fehler') return { text: L('Die Spalte des Fallgewichts ist unbrauchbar geworden. Das Fallgewicht in der Kopfzeile prüfen.', 'The column of the case weight has become unusable. Check the case weight in the header.') };
  const w = l.art === 'gilt' ? l.pruefung.w : s.zeilen.map(() => 1);
  return { q: { spalten: s.spalten, zeilen: s.zeilen, w }, gw: l.art === 'gilt' ? l.gewicht : undefined, haeufig: l.art === 'gilt' && l.gewicht.art === 'haeufigkeit' };
}

let grundMerk: { z: unknown; sp: unknown; key: string; g: AmtlichGrund | { fehler: AmtlichFehler } } | null = null;
function grundVon(w: AmtlichWahl, q: Quelle, gw: GewichtAbdruck | undefined, haeufig: boolean) {
  const key = JSON.stringify([w.zeile, w.spalte, w.inhalt, w.wert, w.geheim === 'sperren' && (w.dominanz || w.prozentRegel), gw ? [gw.spalte, gw.art] : null]);
  if (grundMerk && grundMerk.z === s.zeilen && grundMerk.sp === s.spalten && grundMerk.key === key) return grundMerk.g;
  const g = amtlichGrund(w, q, haeufig);
  grundMerk = { z: s.zeilen, sp: s.spalten, key, g };
  return g;
}
let standMerk: { z: unknown; sp: unknown; key: string; v: string } | null = null;
/** Stand der Daten, die die Rechnung in R braucht: Spalten und Gewicht. */
function datenStand(w: AmtlichWahl, gw: GewichtAbdruck | undefined): string {
  const namen = [w.zeile, w.spalte, w.wert, gw?.spalte ?? '', ...(['klumpen', 'klumpen2', 'schicht', 'fpc', 'fpc2'] as const).map(k => entwurfWirksam(gw?.entwurf)?.[k] ?? ''), ...(w.rep.an ? repSpalten(s.spalten.map(x => x.name), w.rep.anfang) : [])].filter(Boolean);
  const key = JSON.stringify(namen);
  if (standMerk && standMerk.z === s.zeilen && standMerk.sp === s.spalten && standMerk.key === key) return standMerk.v;
  const v = spaltenStand(namen, s.spalten, s.zeilen);
  standMerk = { z: s.zeilen, sp: s.spalten, key, v };
  return v;
}
/** Schlüssel der Rechnung in R: alles, was die Schätzwerte ändert (nicht Geheimhaltung, Kennzeichnung, Texte). */
export function amtlichSchluessel(w: AmtlichWahl, gw: GewichtAbdruck | undefined): string {
  return JSON.stringify([w.zeile, w.spalte, w.inhalt, w.wert, w.rep, gw ? [gw.spalte, gw.art, gw.klumpenfrei ?? null, ...(entwurfWirksam(gw.entwurf) ? [entwurfWirksam(gw.entwurf)] : [])] : null, datenStand(w, gw)]);
}

/** Rechnet die Tabelle zur Wahl; `gespeichert`: die Rohwerte von R, wenn schon gerechnet. */
export function amtlichBerechne(wahl: Partial<AmtlichWahl> | null | undefined, gespeichert?: AmtlichGespeichert | null): AmtlichBerechnet {
  const w = amtlichWahlAus(wahl);
  if (!amtlichVollstaendig(w)) return { art: 'leer' };
  const ein = eingabe();
  if ('text' in ein) return { art: 'fehler', text: ein.text };
  const g = grundVon(w, ein.q, ein.gw, ein.haeufig);
  if ('fehler' in g) return { art: 'fehler', text: fehlerText(g.fehler, w) };
  const weg = amtlichWeg(w, ein.gw);
  let roh: RohMatrix, kontext: { nRep?: number; scaleRep?: number | null; typRep?: AmtlichWahl['rep']['typ'] } = {};
  if (weg === 'js') roh = amtlichJs(w, g);
  else {
    if (weg === 'rep') {
      const p = repPruefen({ anfang: w.rep.anfang, typ: w.rep.typ, fay: w.rep.fay, scale: w.rep.scale }, repSpalten(s.spalten.map(x => x.name), w.rep.anfang).length, g.idx.length);
      if (p) return { art: 'fehler', text: genauigkeitFehlerSatz({ fehlerCode: p, n: repSpalten(s.spalten.map(x => x.name), w.rep.anfang).length }) };
    }
    const schluessel = amtlichSchluessel(w, ein.gw);
    if (!gespeichert || gespeichert.schluessel !== schluessel) return { art: 'rechnen', weg, schluessel };
    roh = gespeichert.roh; kontext = { nRep: gespeichert.nRep, scaleRep: gespeichert.scale, typRep: gespeichert.typ };
  }
  const t = amtlichBaue(w, g, roh, { gw: ein.gw, weg, nameZeile: name(w.zeile), nameSpalte: name(w.spalte), nameWert: name(w.wert), nameGewicht: ein.gw?.spalte ?? '', stufe: stufeName, ...kontext });
  const titel = amtlichTitel(w, { nameZeile: name(w.zeile), nameSpalte: name(w.spalte), nameWert: name(w.wert) }, !!ein.gw);
  return { art: 'ok', t, item: amtlichItem(t, w, titel, name(w.zeile), name(w.spalte)), titel, w, weg, roh };
}

/** Läuft R für diese Wahl (Aufrufer zeigt die Lade-Animation). Wirft `Fertig` mit einem fertigen Satz. */
export async function amtlichRechneNeu(wahl: Partial<AmtlichWahl>): Promise<AmtlichGespeichert> {
  const w = amtlichWahlAus(wahl), ein = eingabe();
  if ('text' in ein) throw new Error(ein.text);
  const g = grundVon(w, ein.q, ein.gw, ein.haeufig);
  if ('fehler' in g) throw new Error(fehlerText(g.fehler, w));
  const weg = amtlichWeg(w, ein.gw);
  if (weg === 'js') throw new Error('kein R nötig');
  let rep, nRep: number | undefined, scale: number | null | undefined;
  if (weg === 'rep') {
    const e: RepEinstellung = { anfang: w.rep.anfang, typ: w.rep.typ, fay: w.rep.fay, scale: w.rep.scale };
    const p = planRep(ein.q, e);
    if (!istRepPlan(p)) throw new Error(genauigkeitFehlerSatz({ fehlerCode: p.problem, n: p.spalten }));
    rep = p; nRep = p.anzahl; scale = w.rep.scale;
  }
  const plan = amtlichPlan(w, g, rep, weg === 'design' ? entwurfPlan(ein.q, ein.gw?.entwurf, g.idx) : null);
  if ('fehler' in plan) throw new Error(fehlerText(plan.fehler, w));
  const roh = await amtlichRechnen(plan, g.zeilen.length, g.spalten.length);
  return { schluessel: amtlichSchluessel(w, ein.gw), roh, nRep, scale, typ: weg === 'rep' ? w.rep.typ : undefined };
}

/* ------------------------------------------------------------------------------------------------------------------------------------ Blatt */
export const amtlichWahlVon = (b: Blatt): AmtlichWahl => amtlichWahlAus((b.ergebnis as { wahl?: Partial<AmtlichWahl> } | null)?.wahl);
export const amtlichGespeichertVon = (b: Blatt): AmtlichGespeichert | null => (b.ergebnis as { r?: AmtlichGespeichert | null } | null)?.r ?? null;
export const amtlichBerechnetVon = (b: Blatt): AmtlichBerechnet => amtlichBerechne(amtlichWahlVon(b), amtlichGespeichertVon(b));
export const amtlichSpaltenDerWahl = (w: AmtlichWahl): string[] => [w.zeile, w.spalte, ...(brauchtWert(w) ? [w.wert] : []), ...(w.rep.an ? repSpalten(s.spalten.map(x => x.name), w.rep.anfang) : [])].filter(Boolean);

export function neuesAmtlichBlatt(wahl: Partial<AmtlichWahl>, r: AmtlichGespeichert | null, vorhandeneId?: string): Blatt {
  const w = amtlichWahlAus(JSON.parse(JSON.stringify(wahl)) as Partial<AmtlichWahl>), l = gewichtLage();
  const titel = amtlichTitel(w, { nameZeile: name(w.zeile), nameSpalte: name(w.spalte), nameWert: name(w.wert) }, l.art === 'gilt');
  return {
    id: vorhandeneId ?? Math.random().toString(36).slice(2, 8), titel: L(`Veröffentlichung: ${titel}`, `Publication: ${titel}`), art: 'amtlich', l1: w.zeile, l2: w.spalte || null, l3: amtlichSpaltenDerWahl(w),
    syntax: L('* Tabelle für die Veröffentlichung: Statable rechnet Hochrechnung, Anteil und Mittelwert mit dem Fallgewicht, mit R (survey) für Standardfehler, und wendet Geheimhaltung und Kennzeichnung an (kein PSPP-Befehl).', '* Table for publication: Statable calculates estimated totals, shares and means with the case weight, with R (survey) for standard errors, and applies confidentiality and marking (no PSPP command).'),
    items: [], ergebnis: { typ: 'amtlich', wahl: w, r }, imBericht: true, notiz: '', zeit: Date.now(), ...(l.art === 'gilt' ? { gewicht: { ...l.gewicht } } : {})
  };
}

/** Der Satz im Bericht: was die Tabelle zeigt (ohne Zahlen und ohne Fallzahlen). */
export function saetzeAmtlich(b: Blatt): Saetze | null {
  const r = amtlichBerechnetVon(b);
  if (r.art === 'rechnen') return { haupt: L('Diese Tabelle ist nicht aktuell: Die Daten oder die Wahl haben sich geändert. Sie muss auf dem Blatt neu gerechnet werden; bis dahin steht hier keine Zahl.', 'This table is not up to date: the data or the choice have changed. It must be recalculated on its page; until then no number is shown.'), zusatz: '', vorsicht: '', apa: '', marken: [] };
  return r.art === 'ok' ? { haupt: amtlichSatz(r.t), zusatz: '', vorsicht: '', apa: '', marken: [] } : null;
}
/** Nur die veröffentlichbare Fassung - und nur, wenn sie zu den heutigen Daten passt. */
export const tabellenAmtlich = (b: Blatt): TableItem[] => { const r = amtlichBerechnetVon(b); return r.art === 'ok' ? [r.item] : []; };
