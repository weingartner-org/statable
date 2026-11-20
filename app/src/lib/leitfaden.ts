/**
 * Interview-Leitfaden nach Helfferich (Paket 4D, docs/erheben/FACHBLATT-STUFE-4.md): Modell, Hinweise beim Prüfen, Hilfen für Sammeln und Sortieren,
 * Übernahme der Blöcke als Hauptkategorien, geprüftes Lesen aus der Projektdatei. Reine Funktionen, keine Oberfläche.
 * Die Hinweise sind eine einfache Heuristik: Sie sagen „schau hin“, nie „falsch“.
 */
import { neueId } from './ablage';

export type LeitfadenSprache = 'de' | 'en';
export type FrageStatus = 'offen' | 'behalten' | 'gestrichen' | 'kurzfragebogen';
export const STATUS: readonly FrageStatus[] = ['offen', 'behalten', 'gestrichen', 'kurzfragebogen'];

export interface GesammelteFrage { id: string; text: string; status: FrageStatus; grund?: string; block?: string }
export interface LeitfadenBlock {
  id: string;
  /** Thema des Blocks (wird Hauptkategorie) */
  titel: string;
  /** offene Leitfrage */
  erzaehlaufforderung: string;
  /** inhaltliche Aspekte / Merkposten für Nachfragen */
  aspekte: string[];
  /** „Und dann?“, „Können Sie das genauer erzählen?“ */
  aufrechterhaltung: string[];
  /** konkrete Fragen in fester Formulierung */
  konkret: string[];
  reihenfolge: number;
}
export interface Leitfaden {
  id: string; titel: string; forschungsfrage?: string; sprache: LeitfadenSprache;
  gesammelt: GesammelteFrage[];
  bloecke: LeitfadenBlock[];
  erstellt: number; geaendert: number;
}

export type HinweisArt = 'geschlossen' | 'suggestiv' | 'doppelt' | 'alternativ' | 'warum' | 'fakt' | 'lang';
/** Reihenfolge der Ausgabe (wie in der Tabelle des Fachblatts). */
const REIHENFOLGE: readonly HinweisArt[] = ['geschlossen', 'suggestiv', 'doppelt', 'alternativ', 'warum', 'fakt', 'lang'];

/* ---------- Hinweise beim Prüfen */

const GESCHLOSSEN = {
  de: new Set(['ist', 'sind', 'hast', 'haben', 'hatten', 'kann', 'können', 'könnten', 'würden', 'waren', 'war', 'wird', 'möchten', 'sollte',
    'hat', 'hatte', 'habe', 'bin', 'bist', 'warst', 'wart', 'kannst', 'könntest', 'hattest', 'würdest', 'findest', 'glaubst', 'möchtest', 'wirst', 'willst', 'sollst']),
  en: new Set(['do', 'does', 'did', 'is', 'are', 'was', 'were', 'have', 'has', 'can', 'could', 'would', 'will', 'should', 'had', 'am'])
};
/** Bitten um Erzählen sind nie geschlossen (Entscheid 1). */
const BITTE_ANFANG = { de: new Set(['kann', 'können', 'könnten', 'würden', 'kannst', 'könntest', 'würdest']), en: new Set(['can', 'could', 'would']) };
const ERZAEHLVERB = {
  de: /(^|[^\p{L}])(erzähl\p{L}*|beschreib\p{L}*|erklär\p{L}*|schilder\p{L}*|nenn\p{L}*|sag\p{L}*|beispiel)(?![\p{L}])/iu,
  en: /\b(tell|describe|explain|say more|give an? example)\b/i
};
const SUGGESTIV = {
  de: /(^|[^\p{L}])(nicht auch|doch sicher|finden sie nicht|sicherlich|bestimmt auch|sie sind doch|du bist doch)(?![\p{L}])/iu,
  en: /(^|[^\p{L}])(don't you think|wouldn't you agree|surely|isn't it true)(?![\p{L}])/iu
};
const FRAGEWORT = {
  de: '(?:wie|was|warum|wieso|weshalb|wann|wo|wer|welche[rsmn]?|wozu|womit|woher|wohin)',
  en: '(?:how|what|why|when|where|who|which)'
};
const UND_ODER = { de: '(?:und|oder)', en: '(?:and|or)' };
const ODER = { de: 'oder', en: 'or' };
const WARUM = { de: /^(warum|wieso|weshalb)(?![\p{L}])/iu, en: /^why(?![\p{L}])/iu };
const FAKT = {
  de: /^(wie alt|wann genau|wie viele|wie viel|wie lange|welchen abschluss)(?![\p{L}])/iu,
  en: /^(how old|how many|how much|how long|when exactly)(?![\p{L}])/iu
};
/** Wörter, ab denen eine Frage „lang“ ist (mehr als diese Zahl). */
export const LANG_AB = 30;

const normApostroph = (t: string) => t.replace(/[’‘`´]/g, "'");

/** Führende Anführungszeichen, Klammern, Gedankenstriche und Leerraum abschneiden (Entscheid 6); eine führende Klammer samt Inhalt. */
function ohneKopfzeichen(t: string): string {
  let r = t.trim();
  for (let i = 0; i < 20; i++) {
    const v = r;
    r = r.replace(/^\([^)]*\)\s*/, '').replace(/^\[[^\]]*\]\s*/, '').replace(/^[\s„“”"'‚‘’»«›‹(\[–—-…]+/u, '');
    if (r === v) break;
  }
  return r;
}
/** Text ohne das, was in Anführungszeichen steht (zählt für „doppelt“ und „alternativ“ nicht). */
function ohneZitate(t: string): string {
  return t.replace(/„[^„“”"]*[“”"]/g, ' ').replace(/“[^“”]*”/g, ' ').replace(/"[^"]*"/g, ' ').replace(/»[^«»]*[«]/g, ' ').replace(/«[^«»]*»/g, ' ');
}
const woerter = (t: string) => t.split(/\s+/).filter(Boolean);

/**
 * Welche Hinweise gelten für diese Frage? Leere Liste = kein Hinweis. Die Reihenfolge ist fest (geschlossen, suggestiv, doppelt, alternativ, warum, fakt, lang).
 */
export function hinweiseZuFrage(text: string, sprache: LeitfadenSprache): HinweisArt[] {
  const roh = normApostroph(text ?? '').trim();
  if (!roh) return [];
  const sp: LeitfadenSprache = sprache === 'en' ? 'en' : 'de';
  const kopf = ohneKopfzeichen(roh);
  const ohneZ = ohneZitate(roh);
  const ersteros = /^[\p{L}']+/u.exec(kopf)?.[0].toLocaleLowerCase(sp === 'de' ? 'de' : 'en') ?? '';
  const zweites = (/^[\p{L}']+\s+([\p{L}']+)/u.exec(kopf)?.[1] ?? '').toLocaleLowerCase('de');
  const treffer = new Set<HinweisArt>();

  // geschlossen
  if (GESCHLOSSEN[sp].has(ersteros)) {
    const bitte = BITTE_ANFANG[sp].has(ersteros) && ERZAEHLVERB[sp].test(kopf);
    const gibtEs = ersteros === 'gibt' && zweites !== 'es' && sp === 'de';
    if (!bitte && !gibtEs) treffer.add('geschlossen');
  } else if (sp === 'de' && ((ersteros === 'gibt' && zweites === 'es') || ((ersteros === 'finden' || ersteros === 'glauben') && zweites === 'sie'))) treffer.add('geschlossen');

  // suggestiv
  if (SUGGESTIV[sp].test(roh)) treffer.add('suggestiv');

  // doppelt: mehr als ein Fragezeichen (ohne Zitate) oder ein Fragewort und später „und/oder“ + Fragewort
  const fragezeichen = (ohneZ.match(/\?/g) ?? []).length;
  const doppeltWort = new RegExp(`(?:^|[^\\p{L}])${FRAGEWORT[sp]}(?![\\p{L}])[^?]*?(?:^|[^\\p{L}])${UND_ODER[sp]}\\s+${FRAGEWORT[sp]}(?![\\p{L}])`, 'iu');
  const doppelt = fragezeichen > 1 || doppeltWort.test(ohneKopfzeichen(ohneZ));
  if (doppelt) treffer.add('doppelt');

  // alternativ: der letzte Satzteil enthält „A oder B“ und die Frage endet mit ?
  const gekuerzt = ohneZ.trim();
  if (/\?\s*$/.test(gekuerzt)) {
    const satz = gekuerzt.replace(/\?\s*$/, '');
    const letzter = satz.slice(Math.max(satz.lastIndexOf('.'), satz.lastIndexOf('?'), satz.lastIndexOf('!')) + 1);
    const teil = letzter.slice(letzter.lastIndexOf(',') + 1);
    const m = new RegExp(`^(.*?\\S)\\s+${ODER[sp]}\\s+(\\S.*)$`, 'iu').exec(teil.trim());
    if (m && !new RegExp(`^${FRAGEWORT[sp]}(?![\\p{L}])`, 'iu').test(m[2]!)) treffer.add('alternativ');
  }

  // warum, fakt (nur am Anfang)
  if (WARUM[sp].test(kopf)) treffer.add('warum');
  if (FAKT[sp].test(kopf)) treffer.add('fakt');

  // lang
  if (woerter(roh).length > LANG_AB) treffer.add('lang');

  return REIHENFOLGE.filter(a => treffer.has(a));
}

/* ---------- Anlegen und Sammeln */

export function neuerLeitfaden(titel: string, sprache: LeitfadenSprache): Leitfaden {
  const jetzt = Date.now();
  return { id: neueId(), titel, sprache, gesammelt: [], bloecke: [], erstellt: jetzt, geaendert: jetzt };
}

/** Fügt Fragen aus einem Textfeld an: eine je nicht-leerer Zeile, getrimmt, Status „offen“. Das Original bleibt unverändert. */
export function sammleFragen(lf: Leitfaden, text: string): Leitfaden {
  const neu = (text ?? '').split(/\r\n|\r|\n/).map(z => z.trim()).filter(Boolean).map(t => ({ id: neueId(), text: t, status: 'offen' as FrageStatus }));
  if (!neu.length) return lf;
  return { ...lf, gesammelt: [...lf.gesammelt, ...neu], geaendert: Date.now() };
}

/* ---------- Blöcke als Hauptkategorien */

const schluessel = (n: string) => n.trim().toLocaleLowerCase('de');

/**
 * Welche Blöcke werden zu neuen Codes? `vorhanden` sind die Namen schon bestehender Codes. Gleiche Namen (Leerraum am Rand und Groß-/Kleinschreibung zählen nicht)
 * werden nicht doppelt angelegt; die übersprungenen Blocktitel stehen in `uebersprungen`. Reihenfolge: wie die Blöcke im Leitfaden. Blöcke ohne Titel zählen nicht.
 */
export function bloeckeAlsCodes(lf: Leitfaden, vorhanden: string[]): { neu: { name: string; kodierbar: true }[]; uebersprungen: string[] } {
  const gesehen = new Set(vorhanden.map(schluessel));
  const neu: { name: string; kodierbar: true }[] = [], uebersprungen: string[] = [];
  for (const b of [...lf.bloecke].sort((a, c) => a.reihenfolge - c.reihenfolge)) {
    const name = b.titel.trim();
    if (!name) continue;
    if (gesehen.has(schluessel(name))) { uebersprungen.push(name); continue; }
    gesehen.add(schluessel(name));
    neu.push({ name, kodierbar: true });
  }
  return { neu, uebersprungen };
}

/* ---------- Lesen aus der Projektdatei (kommt von woanders: jedes Feld geprüft) */

const MAX_TEXT = 20000;
export class LeitfadenFehler extends Error { constructor(wo: string) { super(`Leitfaden: ${wo}`); this.name = 'LeitfadenFehler'; } }
const text = (x: unknown, wo: string): string => { if (typeof x !== 'string') throw new LeitfadenFehler(wo); return x.slice(0, MAX_TEXT); };
const zahl = (x: unknown, wo: string): number => { if (typeof x !== 'number' || !Number.isFinite(x)) throw new LeitfadenFehler(wo); return x; };
const textListe = (x: unknown, wo: string): string[] => { if (!Array.isArray(x) || !x.every(e => typeof e === 'string')) throw new LeitfadenFehler(wo); return x.map(e => (e as string).slice(0, MAX_TEXT)); };

function leseEinen(x: unknown): Leitfaden {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new LeitfadenFehler('Eintrag');
  const o = x as Record<string, unknown>;
  if (o.sprache !== 'de' && o.sprache !== 'en') throw new LeitfadenFehler('sprache');
  if (!Array.isArray(o.gesammelt)) throw new LeitfadenFehler('gesammelt');
  if (!Array.isArray(o.bloecke)) throw new LeitfadenFehler('bloecke');
  const gesammelt: GesammelteFrage[] = o.gesammelt.map(g => {
    if (!g || typeof g !== 'object') throw new LeitfadenFehler('gesammelt');
    const q = g as Record<string, unknown>;
    if (!STATUS.includes(q.status as FrageStatus)) throw new LeitfadenFehler('status');
    return { id: text(q.id, 'gesammelt.id'), text: text(q.text, 'gesammelt.text'), status: q.status as FrageStatus,
      ...(typeof q.grund === 'string' ? { grund: q.grund.slice(0, MAX_TEXT) } : {}), ...(typeof q.block === 'string' ? { block: q.block } : {}) };
  });
  const bloecke: LeitfadenBlock[] = o.bloecke.map(b => {
    if (!b || typeof b !== 'object') throw new LeitfadenFehler('block');
    const q = b as Record<string, unknown>;
    return { id: text(q.id, 'block.id'), titel: text(q.titel, 'block.titel'), erzaehlaufforderung: text(q.erzaehlaufforderung, 'block.erzaehlaufforderung'),
      aspekte: textListe(q.aspekte, 'block.aspekte'), aufrechterhaltung: textListe(q.aufrechterhaltung, 'block.aufrechterhaltung'), konkret: textListe(q.konkret, 'block.konkret'),
      reihenfolge: zahl(q.reihenfolge, 'block.reihenfolge') };
  });
  return { id: text(o.id, 'id'), titel: text(o.titel, 'titel'), ...(typeof o.forschungsfrage === 'string' ? { forschungsfrage: o.forschungsfrage.slice(0, MAX_TEXT) } : {}),
    sprache: o.sprache, gesammelt, bloecke, erstellt: zahl(o.erstellt, 'erstellt'), geaendert: zahl(o.geaendert, 'geaendert') };
}

/** Liest die Leitfäden aus dem gelesenen JSON (`qualitativ/leitfaeden.json`). Wirft `LeitfadenFehler`, wenn etwas nicht stimmt; Zusatzfelder werden ignoriert. */
export function leseLeitfaeden(x: unknown): Leitfaden[] {
  if (!Array.isArray(x)) throw new LeitfadenFehler('Liste');
  return x.map(leseEinen);
}

/* ---------- Kleine Änderungen (für die Oberfläche, getestet über die Funktionen oben und unten) */

const jetzt = (lf: Leitfaden, teil: Partial<Leitfaden>): Leitfaden => ({ ...lf, ...teil, geaendert: Date.now() });

export function setzeStatus(lf: Leitfaden, id: string, status: FrageStatus, grund?: string): Leitfaden {
  return jetzt(lf, { gesammelt: lf.gesammelt.map(g => {
    if (g.id !== id) return g;
    const { block, ...rest } = g;
    return { ...rest, status, ...(grund !== undefined ? { grund } : {}), ...(status === 'behalten' && block ? { block } : {}) };
  }) });
}
export function setzeGrund(lf: Leitfaden, id: string, grund: string): Leitfaden {
  return jetzt(lf, { gesammelt: lf.gesammelt.map(g => (g.id === id ? { ...g, grund } : g)) });
}
export function entferneFrage(lf: Leitfaden, id: string): Leitfaden { return jetzt(lf, { gesammelt: lf.gesammelt.filter(g => g.id !== id) }); }

/** Die Blöcke in ihrer Reihenfolge (aufsteigend). */
export const bloeckeGeordnet = (lf: Leitfaden): LeitfadenBlock[] => [...lf.bloecke].sort((a, b) => a.reihenfolge - b.reihenfolge);
const neuNummeriert = (bl: LeitfadenBlock[]): LeitfadenBlock[] => bl.map((b, i) => ({ ...b, reihenfolge: i + 1 }));

export function neuerBlock(lf: Leitfaden, titel: string): { leitfaden: Leitfaden; id: string } {
  const id = neueId();
  const bl = neuNummeriert([...bloeckeGeordnet(lf), { id, titel, erzaehlaufforderung: '', aspekte: [], aufrechterhaltung: [], konkret: [], reihenfolge: 0 }]);
  return { leitfaden: jetzt(lf, { bloecke: bl }), id };
}
export function aendereBlock(lf: Leitfaden, id: string, teil: Partial<Omit<LeitfadenBlock, 'id' | 'reihenfolge'>>): Leitfaden {
  return jetzt(lf, { bloecke: lf.bloecke.map(b => (b.id === id ? { ...b, ...teil } : b)) });
}
/** Entfernt einen Block; seine Fragen werden wieder „behalten ohne Block“. */
export function entferneBlock(lf: Leitfaden, id: string): Leitfaden {
  return jetzt(lf, { bloecke: neuNummeriert(bloeckeGeordnet(lf).filter(b => b.id !== id)), gesammelt: lf.gesammelt.map(g => { if (g.block !== id) return g; const { block: _b, ...rest } = g; return rest; }) });
}
/** Verschiebt einen Block um `schritt` Stellen (-1 nach oben, +1 nach unten); gibt die neue Stelle (1-basiert) zurück, bei Grenze unverändert. */
export function verschiebeBlock(lf: Leitfaden, id: string, schritt: number): { leitfaden: Leitfaden; stelle: number } {
  const bl = bloeckeGeordnet(lf), i = bl.findIndex(b => b.id === id);
  if (i < 0) return { leitfaden: lf, stelle: 0 };
  const j = Math.min(bl.length - 1, Math.max(0, i + schritt));
  if (j === i) return { leitfaden: lf, stelle: i + 1 };
  const [b] = bl.splice(i, 1); bl.splice(j, 0, b!);
  return { leitfaden: jetzt(lf, { bloecke: neuNummeriert(bl) }), stelle: j + 1 };
}
/** Ordnet eine behaltene Frage einem Block zu (`null` = keinem). */
export function ordneZu(lf: Leitfaden, frageId: string, blockId: string | null): Leitfaden {
  return jetzt(lf, { gesammelt: lf.gesammelt.map(g => { if (g.id !== frageId) return g; const { block: _b, ...rest } = g; return blockId ? { ...rest, block: blockId } : rest; }) });
}
/** Die Voreinstellung für Schritt 4: Fragen des Blocks werden Aspekte (nur solche, die noch nicht dort stehen). */
export function fragenAlsAspekte(lf: Leitfaden, blockId: string): Leitfaden {
  const fragen = lf.gesammelt.filter(g => g.status === 'behalten' && g.block === blockId).map(g => g.text);
  return jetzt(lf, { bloecke: lf.bloecke.map(b => (b.id === blockId ? { ...b, aspekte: [...b.aspekte, ...fragen.filter(f => !b.aspekte.includes(f))] } : b)) });
}
