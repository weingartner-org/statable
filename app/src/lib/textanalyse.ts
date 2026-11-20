/**
 * Textanalyse (B3 Teil 1a): Wörter zählen, Schlüsselwort im Kontext, Wörterbuch-Kodieren, typische Wörter je Gruppe.
 * Statable zählt nur Wörter. Es deutet nichts und bewertet keine Stimmung (kein Sentiment).
 * Zerlegung wie in `aehnlicheStellen`: Kleinbuchstaben, Folgen aus Buchstaben und Ziffern.
 */

export const wortteile = (t: string): string[] => t.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** Kleine, offene Stoppwortlisten (eigene Auswahl häufiger Funktionswörter; die Person kann sie ändern) */
export const STOPPWOERTER: Record<'de' | 'en', string[]> = {
  de: ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'und', 'oder', 'aber', 'nicht', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'ist', 'war', 'sind', 'waren', 'hat', 'haben', 'hatte', 'zu', 'von', 'mit', 'auf', 'in', 'im', 'an', 'am', 'für', 'bei', 'als', 'auch', 'so', 'wie', 'wenn', 'dass', 'da', 'dann', 'ja', 'nein', 'mal', 'noch', 'nur', 'schon', 'mir', 'mich', 'man', 'um', 'aus', 'nach', 'zum', 'zur', 'was', 'wo', 'ob', 'sich', 'sein', 'wird', 'werden', 'wurde'],
  en: ['the', 'a', 'an', 'and', 'or', 'but', 'not', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'as', 'by', 'from', 'that', 'this', 'so', 'if', 'then', 'there', 'my', 'me', 'your', 'his', 'her', 'its', 'our', 'their', 'do', 'did', 'does', 'what', 'which', 'who', 'about', 'just', 'very', 'can', 'would', 'will'],
};

export interface WortZeile { wort: string; anzahl: number; anteil: number; dokumente: number }

/** Wortliste: Häufigkeit, Anteil an allen gezählten Wörtern, in wie vielen Dokumenten; absteigend, bei Gleichstand alphabetisch */
export function wortliste(texte: string[], o: { stopp?: string[]; mindestLaenge?: number; mindestAnzahl?: number } = {}): { zeilen: WortZeile[]; gesamt: number; verschieden: number } {
  const stopp = new Set((o.stopp ?? []).map(s => s.toLowerCase()));
  const min = o.mindestLaenge ?? 1;
  const anz = new Map<string, number>(); const dok = new Map<string, number>();
  let gesamt = 0;
  for (const t of texte) {
    const dieser = new Set<string>();
    for (const w of wortteile(t)) {
      if (stopp.has(w) || [...w].length < min) continue;
      anz.set(w, (anz.get(w) ?? 0) + 1); dieser.add(w); gesamt++;
    }
    for (const w of dieser) dok.set(w, (dok.get(w) ?? 0) + 1);
  }
  const mindest = o.mindestAnzahl ?? 1;
  const zeilen = [...anz].filter(([, n]) => n >= mindest).map(([wort, anzahl]) => ({ wort, anzahl, anteil: gesamt ? anzahl / gesamt : 0, dokumente: dok.get(wort) ?? 0 }))
    .sort((a, b) => b.anzahl - a.anzahl || (a.wort < b.wort ? -1 : a.wort > b.wort ? 1 : 0));
  return { zeilen, gesamt, verschieden: anz.size };
}

export interface KwicZeile { text: number; links: string; treffer: string; rechts: string }

/** Schlüsselwort im Kontext: jedes Vorkommen mit je `breite` Wörtern links und rechts; das Wort wird als ganzes Wort gesucht (Groß/Klein egal) */
export function kwic(texte: string[], suchwort: string, breite = 5): KwicZeile[] {
  const ziel = wortteile(suchwort);
  if (ziel.length === 0) return [];
  const aus: KwicZeile[] = [];
  texte.forEach((t, i) => {
    const w = t.match(/[\p{L}\p{N}]+/gu) ?? [];
    const k = w.map(x => x.toLowerCase());
    for (let p = 0; p + ziel.length <= k.length; p++) {
      if (ziel.every((z, j) => k[p + j] === z)) {
        aus.push({ text: i, links: w.slice(Math.max(0, p - breite), p).join(' '), treffer: w.slice(p, p + ziel.length).join(' '), rechts: w.slice(p + ziel.length, p + ziel.length + breite).join(' ') });
      }
    }
  });
  return aus;
}

export interface WoerterbuchEintrag { name: string; woerter: string[] }
export interface WoerterbuchZeile { name: string; je: number[]; summe: number; anteil: number }

/** Wörterbuch-Kodieren: je Eintrag zählt es die Wörter der Liste, je Text. Ein Muster darf am Ende `*` tragen (Wortanfang). Es zählt Wörter, es deutet nichts. */
export function woerterbuchZaehlen(texte: string[], eintraege: WoerterbuchEintrag[]): { zeilen: WoerterbuchZeile[]; gesamt: number[] } {
  const gesamt = texte.map(t => wortteile(t).length);
  const alle = texte.map(t => wortteile(t));
  const gesamtSumme = gesamt.reduce((a, b) => a + b, 0);
  const zeilen = eintraege.map(e => {
    const fest = new Set<string>(); const anfang: string[] = [];
    for (const m of e.woerter) { const x = m.trim().toLowerCase(); if (!x) continue; if (x.endsWith('*')) { const a = x.slice(0, -1); if (a) anfang.push(a); } else fest.add(x); }
    const je = alle.map(ws => ws.filter(w => fest.has(w) || anfang.some(a => w.startsWith(a))).length);
    const summe = je.reduce((a, b) => a + b, 0);
    return { name: e.name, je, summe, anteil: gesamtSumme ? summe / gesamtSumme : 0 };
  });
  return { zeilen, gesamt };
}

export interface TypischZeile { wort: string; a: number; b: number; g2: number; richtung: 'a' | 'b'; p: number }

/** Typische Wörter einer Gruppe gegen alle anderen (Log-Likelihood G2 nach Dunning, wie `quanteda.textstats::textstat_keyness(measure = "lr")`); p aus der Chi-Quadrat-Verteilung mit 1 Freiheitsgrad, ohne Mehrfachtest-Korrektur */
export function typischeWoerter(gruppeA: string[], gruppeB: string[], o: { stopp?: string[]; mindestAnzahl?: number } = {}): TypischZeile[] {
  const za = wortliste(gruppeA, { stopp: o.stopp }); const zb = wortliste(gruppeB, { stopp: o.stopp });
  const ma = new Map(za.zeilen.map(z => [z.wort, z.anzahl])); const mb = new Map(zb.zeilen.map(z => [z.wort, z.anzahl]));
  const na = za.gesamt, nb = zb.gesamt, n = na + nb;
  const aus: TypischZeile[] = [];
  if (na === 0 || nb === 0) return aus;
  for (const w of new Set([...ma.keys(), ...mb.keys()])) {
    const a = ma.get(w) ?? 0, b = mb.get(w) ?? 0;
    if (a + b < (o.mindestAnzahl ?? 1)) continue;
    const ea = (na * (a + b)) / n, eb = (nb * (a + b)) / n;
    let g2 = 0;
    if (a > 0) g2 += a * Math.log(a / ea);
    if (b > 0) g2 += b * Math.log(b / eb);
    g2 *= 2;
    const richtung: 'a' | 'b' = a / na >= b / nb ? 'a' : 'b';
    aus.push({ wort: w, a, b, g2, richtung, p: chiq1Oben(g2) });
  }
  return aus.sort((x, y) => y.g2 - x.g2 || (x.wort < y.wort ? -1 : 1));
}

/** Obere Wahrscheinlichkeit der Chi-Quadrat-Verteilung mit 1 Freiheitsgrad: erfc(sqrt(x/2)) */
export function chiq1Oben(x: number): number {
  if (x <= 0) return 1;
  return erfc(Math.sqrt(x / 2));
}
function erfc(z: number): number {
  // Abramowitz-Stegun 7.1.26 reicht nicht für 1e-8; darum Kettenbruch (Lentz) für große z, Reihe für kleine
  if (z < 2.5) {
    let s = z, t = z; const z2 = z * z;
    for (let n = 1; n < 200; n++) { t *= -z2 / n; const d = t / (2 * n + 1); s += d; if (Math.abs(d) < 1e-17) break; }
    return 1 - (2 / Math.sqrt(Math.PI)) * s;
  }
  let f = 0;
  for (let k = 60; k >= 1; k--) f = k / 2 / (z + f);
  return Math.exp(-z * z) / (Math.sqrt(Math.PI) * (z + f));
}
