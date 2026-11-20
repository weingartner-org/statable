/**
 * Volltextsuche über die Hilfe-Artikel. Ohne Bibliothek, ohne HTML: der Ausschnitt kommt als Teile-Array,
 * die Seite setzt daraus <mark>-Elemente (so lässt sich nichts einschleusen).
 *
 * Regeln: Groß/klein egal; ä=ae=a, ö=oe=o, ü=ue=u, ß=ss; Wortanfänge zählen; bei Suchwörtern ab 5 Buchstaben
 * ist ein Tippfehler (Abstand 1, auch gegenüber dem Wortanfang) erlaubt; Gewicht Titel > Stichwort > Text.
 * Ganze Fragen (30.10.2026): Füllwörter fallen weg (nur Deutsch und Englisch); Alltagswörter je Artikel (`alltagswoerter.ts`) zählen
 * zwischen Titel und Stichwort. Treffer mit allen Suchwörtern stehen zuerst, danach (erst ab drei Suchwörtern, wenn mindestens
 * die Hälfte trifft) die mit den meisten; bei einem oder zwei Suchwörtern gilt weiter UND. Passte nur ein Alltagswort, nennt der Treffer den Fachbegriff.
 */
import { type Artikel, artikelText } from './kern';
import { ort } from '../i18n/profil';
import { paarText, type Sprache } from '../i18n/laufzeit';
import { ALLTAG, FUELLWOERTER } from './alltagswoerter';

export interface Teil { text: string; treffer: boolean }
export interface Treffer { artikel: Artikel; punkte: number; titel: Teil[]; ausschnitt: Teil[]; /** Fachbegriff, wenn nur ein Alltagswort getroffen hat */ fach?: string }

/** Drei Einstiege, wenn nichts gefunden wurde. */
export const VORSCHLAEGE = ['frage-gruppen', 'frage-zusammenhang', 'frage-vorhersage'];

/** Vergleichsform: klein, Umlaute und ß vereinheitlicht, Akzente entfernt. */
export function glatt(s: string): string {
  return s.toLocaleLowerCase(ort()).replace(/ß/g, 'ss').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
}

const WORT = /[\p{L}\p{N}]+/gu;
interface Wort { roh: string; glatt: string; ab: number }
const woerter = (s: string): Wort[] => [...s.matchAll(WORT)].map(m => ({ roh: m[0], glatt: glatt(m[0]), ab: m.index! }));

/** Bearbeitungsabstand (Levenshtein). */
export function abstand(a: string, b: string): number {
  if (a === b) return 0;
  let vor = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const neu = [i];
    for (let j = 1; j <= b.length; j++) neu[j] = Math.min(vor[j]! + 1, neu[j - 1]! + 1, vor[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    vor = neu;
  }
  return vor[b.length]!;
}

/** Wie gut passt das Suchwort q auf das Textwort t? 0 = gar nicht. */
export function passt(q: string, t: string): number {
  if (t === q) return 1;
  if (t.startsWith(q)) return 0.8;
  // Tippfehler: ab 5 Buchstaben einer, ab 12 zwei („faktoranalyse“ statt „faktorenanalyse“; Abnahme 31.10. F10)
  const frei = q.length >= 12 ? 2 : 1;
  if (q.length >= 5 && (abstand(q, t) <= frei || abstand(q, t.slice(0, q.length)) <= frei)) return 0.5;
  if (q.length >= 4 && t.includes(q)) return 0.3;
  return 0;
}

interface Eintrag { titel: Wort[]; sw: Wort[]; text: string; textWoerter: Wort[]; alltag: Wort[]; fach?: string }
const cache = new WeakMap<Artikel[], { sp?: Sprache; e: Eintrag[] }>();
const mitAlltag = (sp?: Sprache) => sp === 'de' || sp === 'en';
function index(liste: Artikel[], sp?: Sprache): Eintrag[] {
  const c = cache.get(liste);
  if (c && c.sp === sp) return c.e;
  const alltag = new Map(mitAlltag(sp) ? ALLTAG.map(x => [x.id, x] as const) : []);
  const e = liste.map(a => {
    const text = artikelText(a), x = alltag.get(a.id);
    return { titel: woerter(a.titel), sw: woerter(a.stichwoerter.join(' ')), text, textWoerter: woerter(text), alltag: x ? woerter(paarText(sp!, x.woerter) + (x.mehr ? ' ' + paarText(sp!, x.mehr) : '')) : [], fach: x ? paarText(sp!, x.fach) : undefined };
  });
  cache.set(liste, { sp, e });
  return e;
}

const beste = (q: string, ws: Wort[]) => ws.reduce((m, w) => Math.max(m, passt(q, w.glatt)), 0);

/** Text in Teile zerlegen; Wörter, die auf ein Suchwort passen, sind Treffer. */
export function teile(text: string, qs: string[]): Teil[] {
  const aus: Teil[] = []; let pos = 0;
  for (const w of woerter(text)) {
    if (!qs.some(q => passt(q, w.glatt) > 0)) continue;
    if (w.ab > pos) aus.push({ text: text.slice(pos, w.ab), treffer: false });
    aus.push({ text: w.roh, treffer: true }); pos = w.ab + w.roh.length;
  }
  if (pos < text.length) aus.push({ text: text.slice(pos), treffer: false });
  return aus.length ? aus : [{ text, treffer: false }];
}

function ausschnittVon(e: Eintrag, qs: string[]): Teil[] {
  const breit = 70;
  const w = e.textWoerter.find(x => qs.some(q => passt(q, x.glatt) > 0));
  let von = 0, bis = Math.min(e.text.length, breit * 2);
  if (w) { von = Math.max(0, w.ab - breit); bis = Math.min(e.text.length, w.ab + w.roh.length + breit); }
  // an Wortgrenzen schneiden
  if (von > 0) { const l = e.text.indexOf(' ', von); if (l >= 0 && l < w!.ab) von = l + 1; }
  if (bis < e.text.length) { const l = e.text.lastIndexOf(' ', bis); if (l > (w ? w.ab + w.roh.length : 0)) bis = l; }
  const t = e.text.slice(von, bis);
  const a = teile(t, qs);
  if (von > 0) a.unshift({ text: '… ', treffer: false });
  if (bis < e.text.length) a.push({ text: ' …', treffer: false });
  return a;
}

/** Suchwörter aus der Anfrage; Füllwörter entfallen (nur de/en), wenn noch etwas übrig bleibt. */
export function suchwoerter(anfrage: string, sp?: Sprache): string[] {
  const qs = woerter(anfrage).map(w => w.glatt);
  if (sp !== 'de' && sp !== 'en') return qs;
  const rest = qs.filter(q => !FUELLWOERTER[sp].has(q));
  return rest.length ? rest : qs;
}

export function suche(liste: Artikel[], anfrage: string, sp?: Sprache): Treffer[] {
  const qs = suchwoerter(anfrage, sp);
  if (!qs.length) return [];
  const ganz = qs.join(' ');
  const ix = index(liste, sp), aus: (Treffer & { n: number })[] = [];
  liste.forEach((artikel, i) => {
    const e = ix[i]!;
    let punkte = 0, n = 0, fest = false, imTitel = false, ueberAlltag = false;
    for (const q of qs) {
      const t = beste(q, e.titel), s = beste(q, e.sw), a = beste(q, e.alltag), x = beste(q, e.textWoerter);
      const p = Math.max(10 * t, 8 * a, 6 * s, x);
      if (p === 0) continue;
      n++; punkte += p;
      if (t > 0) imTitel = true;
      if (a > 0 && 8 * a >= 10 * t && 8 * a >= 6 * s) ueberAlltag = true;
      if (t > 0 || s > 0 || a > 0) fest = true;
    }
    // Teiltreffer (es fehlt ein Suchwort) nur bei längeren Fragen: mindestens zwei Wörter und mindestens die Hälfte treffen, nicht allein im Fließtext.
    // Bei einem oder zwei Suchwörtern gilt weiter UND (z. B. „Mittelwert Zebrafisch“ findet nichts).
    if (n === 0 || (n < qs.length && (n < 2 || n * 2 < qs.length || !fest))) return;
    if (glatt(artikel.titel).startsWith(ganz)) punkte += 5;
    aus.push({ artikel, punkte, n, titel: teile(artikel.titel, qs), ausschnitt: ausschnittVon(e, qs), fach: ueberAlltag && !imTitel ? e.fach : undefined });
  });
  return aus.sort((a, b) => b.n - a.n || b.punkte - a.punkte || a.artikel.titel.localeCompare(b.artikel.titel, ort()));
}
