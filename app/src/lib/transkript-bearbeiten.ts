/**
 * Änderungen am Transkript (Fachblatt Stufe 4, „Ändern des Textes“): Beitrag ändern, teilen, zusammenlegen, einfügen.
 * Eine Funktion-Familie für beide Arten von Quellen:
 *  - strukturierte Quellen (VTT, SRT, noScribe, aTrain, Word): Der Text ist aus den Beiträgen gebaut (`Name: Inhalt`, Leerzeile dazwischen);
 *    er wird nach der Änderung neu gebaut und `abschnitte` mit ihm.
 *  - Text-Quellen (f4, reiner Text): Der Text bleibt wie er ist; nur die Stelle ändert sich, alle folgenden Positionen rücken nach.
 * Positionen zählen in Codepoints. Mit Segmenten ist der Text gesperrt (Parameter `segmenteVorhanden`); dann wirft jede Funktion.
 * Alle Funktionen geben ein neues Dokument zurück; das übergebene bleibt unverändert.
 */
import type { Dokument, TranskriptAbschnitt } from './qualprojekt';
import { beitragTeile, codepoints } from './transkript-text';

export interface BearbeitenOpt { segmenteVorhanden?: boolean }

const SEP = '\n\n';

function pruefe(dok: Dokument, opt: BearbeitenOpt | undefined): NonNullable<Dokument['transkript']> {
  if (opt?.segmenteVorhanden) throw new Error('Dieses Dokument hat schon Textstellen mit Codes. Der Text ist gesperrt und kann nicht mehr geändert werden.');
  if (!dok.transkript) throw new Error('Dieses Dokument hat kein Transkript.');
  return dok.transkript;
}
const beitragNr = (t: NonNullable<Dokument['transkript']>, i: number) => { if (!Number.isInteger(i) || i < 0 || i >= t.abschnitte.length) throw new Error('Diesen Beitrag gibt es nicht.'); };
const nameVon = (dok: Dokument, id: string): string => {
  const sp = dok.transkript!.sprecher.find((s) => s.id === id);
  if (!sp) throw new Error('Diese Person gibt es in diesem Transkript nicht.');
  return sp.name;
};
/** Absätze im Inhalt würden die Beitragsgrenzen zerstören: Leerzeilen werden zu einem Zeilenumbruch. */
const inhaltSauber = (s: string): string => String(s ?? '').replace(/\r\n?/g, '\n').replace(/\n(?:[ \t]*\n)+/g, '\n');

interface Roh { sprecher?: string; inhalt: string; zeitMs?: number; bisMs?: number }

function beitraegeAus(dok: Dokument): Roh[] {
  const t = dok.transkript!, cps = codepoints(dok.text);
  return t.abschnitte.map((a, i) => { const p = beitragTeile(cps, dok, i); return { sprecher: a.sprecher, inhalt: cps.slice(p.inhalt.start, p.inhalt.ende).join(''), zeitMs: a.zeitMs, bisMs: a.bisMs }; });
}
function baueNeu(dok: Dokument, bs: Roh[]): { text: string; abschnitte: TranskriptAbschnitt[] } {
  let text = '', pos = 0;
  const abschnitte: TranskriptAbschnitt[] = [];
  bs.forEach((b, i) => {
    if (i > 0) { text += SEP; pos += 2; }
    const roh = (b.sprecher ? `${nameVon(dok, b.sprecher)}: ` : '') + b.inhalt;
    const n = Array.from(roh).length;
    const a: TranskriptAbschnitt = { start: pos, ende: pos + n };
    if (b.sprecher) a.sprecher = b.sprecher;
    if (b.zeitMs !== undefined) a.zeitMs = b.zeitMs;
    if (b.bisMs !== undefined) a.bisMs = b.bisMs;
    abschnitte.push(a);
    text += roh; pos += n;
  });
  return { text, abschnitte };
}
/** Strukturiert: Der Text ist genau das, was `baueNeu` aus den Beiträgen macht, und die Quelle ist keine Text-Quelle. */
function strukturiert(dok: Dokument): boolean {
  const q = dok.transkript?.quelle;
  if (q === 'f4' || q === 'text') return false;
  try { return baueNeu(dok, beitraegeAus(dok)).text === dok.text; } catch { return false; }
}
function mit(dok: Dokument, text: string, abschnitte: TranskriptAbschnitt[]): Dokument {
  return { ...dok, text, geaendert: Date.now(), transkript: { ...dok.transkript!, abschnitte } };
}
function mitBeitraegen(dok: Dokument, bs: Roh[]): Dokument { const n = baueNeu(dok, bs); return mit(dok, n.text, n.abschnitte); }
const schiebe = (a: TranskriptAbschnitt, d: number): TranskriptAbschnitt => ({ ...a, start: a.start + d, ende: a.ende + d });
const ohne = <T extends object>(o: T, ...ks: (keyof T)[]): T => { const c = { ...o }; for (const k of ks) delete c[k]; return c; };

/** Inhalt und/oder Sprecher eines Beitrags ändern. */
export function aendereBeitrag(dok: Dokument, i: number, neuerInhalt: string, neuerSprecher?: string, opt?: BearbeitenOpt): Dokument {
  const t = pruefe(dok, opt); beitragNr(t, i);
  const inhalt = inhaltSauber(neuerInhalt);
  const wechsel = neuerSprecher !== undefined && neuerSprecher !== t.abschnitte[i]!.sprecher;
  if (wechsel) nameVon(dok, neuerSprecher!);
  if (strukturiert(dok)) {
    const bs = beitraegeAus(dok);
    bs[i] = { ...bs[i]!, inhalt, ...(wechsel ? { sprecher: neuerSprecher } : {}) };
    return mitBeitraegen(dok, bs);
  }
  const cps = codepoints(dok.text), p = beitragTeile(cps, dok, i), a = t.abschnitte[i]!;
  const neuCps = codepoints(inhalt);
  let praefix: string[] | null = null;
  if (wechsel) {
    const kand = p.kennung.art === 'id' ? neuerSprecher! : nameVon(dok, neuerSprecher!);
    praefix = codepoints(`${kand}: `);
  }
  const k0 = p.kennung.start, k1 = p.kennung.ende;
  const kopf = praefix ? [...cps.slice(0, k0), ...praefix, ...cps.slice(k1, p.inhalt.start)] : cps.slice(0, p.inhalt.start);
  const text = [...kopf, ...neuCps, ...cps.slice(p.inhalt.ende)].join('');
  const delta = kopf.length - p.inhalt.start + neuCps.length - (p.inhalt.ende - p.inhalt.start);
  const abschnitte = t.abschnitte.map((x, j) => (j < i ? { ...x } : j === i ? { ...x, ende: a.ende + delta, ...(wechsel ? { sprecher: neuerSprecher } : {}) } : schiebe(x, delta)));
  return mit(dok, text, abschnitte);
}

/** Einen Beitrag an der Stelle `stelle` (Codepoint-Position im Text, innerhalb des Inhalts) in zwei Beiträge derselben Person teilen. Der erste behält den Beginn, der zweite das Ende der Zeit. */
export function teileBeitrag(dok: Dokument, i: number, stelle: number, opt?: BearbeitenOpt): Dokument {
  const t = pruefe(dok, opt); beitragNr(t, i);
  const cps = codepoints(dok.text), p = beitragTeile(cps, dok, i), a = t.abschnitte[i]!;
  if (!(stelle > p.inhalt.start && stelle < p.inhalt.ende)) throw new Error('Die Stelle zum Teilen muss mitten im Beitrag liegen.');
  const leer = (c: string) => /\s/u.test(c);
  let l = stelle; while (l > p.inhalt.start && leer(cps[l - 1]!)) l--;
  let r = stelle; while (r < p.inhalt.ende && leer(cps[r]!)) r++;
  if (l <= p.inhalt.start || r >= p.inhalt.ende) throw new Error('Beide Teile brauchen Text. Bitte eine Stelle mitten im Text wählen.');
  if (strukturiert(dok)) {
    const bs = beitraegeAus(dok);
    const b = bs[i]!;
    const links: Roh = { sprecher: b.sprecher, inhalt: cps.slice(p.inhalt.start, l).join(''), zeitMs: b.zeitMs };
    const rechts: Roh = { sprecher: b.sprecher, inhalt: cps.slice(r, p.inhalt.ende).join(''), bisMs: b.bisMs };
    if (links.zeitMs === undefined) delete links.zeitMs;
    if (rechts.bisMs === undefined) delete rechts.bisMs;
    bs.splice(i, 1, links, rechts);
    return mitBeitraegen(dok, bs);
  }
  const kennung = cps.slice(p.kennung.start, p.kennung.ende);
  const text = [...cps.slice(0, l), ...codepoints(SEP), ...kennung, ...cps.slice(r)].join('');
  const delta = 2 + kennung.length - (r - l);
  const links = ohne({ ...a, ende: l }, 'bisMs');
  const rechts = ohne({ ...a, start: l + 2, ende: a.ende + delta }, 'zeitMs');
  const abschnitte = [...t.abschnitte.slice(0, i).map((x) => ({ ...x })), links, rechts, ...t.abschnitte.slice(i + 1).map((x) => schiebe(x, delta))];
  return mit(dok, text, abschnitte);
}

/** Beitrag `i` mit dem nächsten Beitrag derselben Person zu einem Beitrag zusammenlegen. */
export function legeZusammen(dok: Dokument, i: number, opt?: BearbeitenOpt): Dokument {
  const t = pruefe(dok, opt); beitragNr(t, i);
  if (i + 1 >= t.abschnitte.length) throw new Error('Nach diesem Beitrag kommt kein weiterer.');
  const a = t.abschnitte[i]!, b = t.abschnitte[i + 1]!;
  if (a.sprecher !== b.sprecher) throw new Error('Nur Beiträge derselben Person lassen sich zusammenlegen.');
  const bis = b.bisMs;
  if (strukturiert(dok)) {
    const bs = beitraegeAus(dok);
    const x = bs[i]!, y = bs[i + 1]!;
    const zus: Roh = { sprecher: x.sprecher, inhalt: x.inhalt && y.inhalt ? `${x.inhalt} ${y.inhalt}` : x.inhalt || y.inhalt, zeitMs: x.zeitMs, bisMs: y.bisMs };
    if (zus.zeitMs === undefined) delete zus.zeitMs;
    if (zus.bisMs === undefined) delete zus.bisMs;
    bs.splice(i, 2, zus);
    return mitBeitraegen(dok, bs);
  }
  const cps = codepoints(dok.text), p = beitragTeile(cps, dok, i), q = beitragTeile(cps, dok, i + 1);
  const sep = p.inhalt.ende > p.inhalt.start && q.inhalt.ende > q.inhalt.start ? ' ' : '';
  const text = [...cps.slice(0, p.inhalt.ende), ...sep, ...cps.slice(q.inhalt.start)].join('');
  const delta = sep.length - (q.inhalt.start - p.inhalt.ende);
  const zus = { ...a, ende: b.ende + delta, ...(bis !== undefined ? { bisMs: bis } : {}) } as TranskriptAbschnitt;
  if (bis === undefined) delete zus.bisMs;
  const abschnitte = [...t.abschnitte.slice(0, i).map((x) => ({ ...x })), zus, ...t.abschnitte.slice(i + 2).map((x) => schiebe(x, delta))];
  return mit(dok, text, abschnitte);
}

/** Einen leeren Beitrag der Person `sprecher` (Kennung der Person) nach Beitrag `nach` einfügen (`-1` = ganz an den Anfang). */
export function fuegeBeitragEin(dok: Dokument, nach: number, sprecher?: string, opt?: BearbeitenOpt): Dokument {
  const t = pruefe(dok, opt);
  if (!Number.isInteger(nach) || nach < -1 || nach >= t.abschnitte.length) throw new Error('Hier lässt sich kein Beitrag einfügen.');
  if (sprecher !== undefined) nameVon(dok, sprecher);
  const neu: Roh = { ...(sprecher ? { sprecher } : {}), inhalt: '' };
  if (strukturiert(dok) || t.abschnitte.length === 0) {
    const bs = beitraegeAus(dok);
    bs.splice(nach + 1, 0, neu);
    return mitBeitraegen(dok, bs);
  }
  const cps = codepoints(dok.text);
  // gleiche Schreibweise der Kennung wie im übrigen Text: Name oder Kennung aus der Datei
  const erste = t.abschnitte.findIndex((a, j) => a.sprecher && beitragTeile(cps, dok, j).kennung.art);
  const stilId = erste >= 0 && beitragTeile(cps, dok, erste).kennung.art === 'id';
  const kopf = codepoints(sprecher ? `${stilId ? sprecher : nameVon(dok, sprecher)}: ` : '');
  const pos = nach >= 0 ? t.abschnitte[nach]!.ende : 0;
  const ein = nach >= 0 ? [...codepoints(SEP), ...kopf] : [...kopf, ...codepoints(SEP)];
  const text = [...cps.slice(0, pos), ...ein, ...cps.slice(pos)].join('');
  const start = nach >= 0 ? pos + 2 : 0;
  const nA: TranskriptAbschnitt = { start, ende: start + kopf.length, ...(sprecher ? { sprecher } : {}) };
  const abschnitte = [...t.abschnitte.slice(0, nach + 1).map((x) => ({ ...x })), nA, ...t.abschnitte.slice(nach + 1).map((x) => schiebe(x, ein.length))];
  return mit(dok, text, abschnitte);
}
