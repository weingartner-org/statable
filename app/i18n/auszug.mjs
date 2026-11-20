/**
 * Sprachkatalog ohne Umschreiben des Quelltexts (Bauplan Sprachen, Phase 0.1).
 *
 * Im Code stehen die Texte weiter als Paare: L(de, en), T(de, en), Lx(de, en), d(du, sie, en).
 * Dieses Werkzeug findet jeden Aufruf, dessen Argumente feste Texte sind (Zeichenketten oder Vorlagen mit `${…}`),
 * und hängt zwei Argumente an: den Schlüssel und die eingesetzten Werte.
 *
 *   L(`${n} Personen`, `${n} people`)   →   L(`${n} Personen`, `${n} people`, 'k3f9a…', [n])
 *
 * Deutsch und Englisch laufen damit unverändert; jede andere Sprache schlägt den Schlüssel in ihrer Datei nach
 * und setzt die Werte für {0}, {1} … ein. Der Schlüssel ist ein Prüfwert aus deutschem und englischem Text:
 * ändert sich einer, gilt die Übersetzung als veraltet und fehlt (Rückfall Englisch), bis sie nachgezogen ist.
 *
 * Benutzt vom Vite-Plugin (vite.config.ts) und von i18n/katalog.mjs (schreibt src/i18n/katalog.json).
 */
import { createHash } from 'node:crypto';

/** Name → erlaubte Zahl fester Argumente. d(du, sie) ohne Englisch bekommt `undefined` an dritter Stelle. */
const NAMEN = { L: [2], T: [2], Lx: [2], d: [2, 3], Lp: [5], P: [2] };
const KOPF = /(?<![\w$.#])(Lp|L|T|Lx|d|P)\(/g;

const ws = /\s/;
function leer(src, i) {
  for (;;) {
    while (i < src.length && ws.test(src[i])) i++;
    if (src.startsWith('//', i)) { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e + 1; continue; }
    if (src.startsWith('/*', i)) { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
    return i;
  }
}
/** Ende einer Zeichenkette ab dem Anführungszeichen bei i (Index nach dem schließenden Zeichen). */
function zeichenkette(src, i) {
  const q = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') { j++; continue; }
    if (src[j] === q) return j + 1;
    if (src[j] === '\n') return -1;
  }
  return -1;
}
/** Vorlage ab dem Backtick bei i: Textteile (roh) und Ausdrücke (Positionen). */
function vorlage(src, i) {
  const teile = [], ausdruecke = [];
  let j = i + 1, start = j;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '`') { teile.push(src.slice(start, j)); return { ende: j + 1, teile, ausdruecke }; }
    if (c === '$' && src[j + 1] === '{') {
      teile.push(src.slice(start, j));
      const a = j + 2, e = ausdruck(src, a, '}');
      if (e < 0) return null;
      ausdruecke.push({ start: a, ende: e });
      j = e + 1; start = j; continue;
    }
    j++;
  }
  return null;
}
/** Ausdruck bis zum ersten Zeichen aus `stopp` auf oberster Ebene; gibt dessen Index zurück. */
function ausdruck(src, i, stopp) {
  const stapel = [];
  while (i < src.length) {
    i = leer(src, i);
    const c = src[i];
    if (c === undefined) return -1;
    if (!stapel.length && stopp.includes(c)) return i;
    if (c === '"' || c === "'") { i = zeichenkette(src, i); if (i < 0) return -1; continue; }
    if (c === '`') { const v = vorlage(src, i); if (!v) return -1; i = v.ende; continue; }
    if (c === '(' || c === '[' || c === '{') { stapel.push(c); i++; continue; }
    if (c === ')' || c === ']' || c === '}') {
      const o = stapel.pop();
      if (!o || '([{'.indexOf(o) !== ')]}'.indexOf(c)) return -1;
      i++; continue;
    }
    i++;
  }
  return -1;
}

const gekocht = roh => Function(`"use strict"; return \`${roh}\`;`)();
const normal = a => a.replace(/\s+/g, '');

/** Argumente ab `(`; nur wenn alle fest sind. */
function argumente(src, auf, zahlZuerst = false) {
  const args = [];
  let i = auf + 1;
  if (zahlZuerst) {
    const e = ausdruck(src, i, ',)');
    if (e < 0 || src[e] !== ',') return null;
    args.push({ art: 'zahl', start: i, ende: e, roh: src.slice(i, e) });
    i = e + 1;
  }
  for (;;) {
    i = leer(src, i);
    if (src[i] === ')') return { args, ende: i };
    const c = src[i];
    if (c === "'" || c === '"') {
      const e = zeichenkette(src, i); if (e < 0) return null;
      args.push({ art: 'text', roh: src.slice(i, e), text: Function(`"use strict"; return ${src.slice(i, e)};`)() });
      i = e;
    } else if (c === '`') {
      const v = vorlage(src, i); if (!v) return null;
      args.push({ art: 'vorlage', start: i, ...v });
      i = v.ende;
    } else return null;
    i = leer(src, i);
    if (src[i] === ',') { i++; continue; }
    if (src[i] === ')') return { args, ende: i };
    return null;
  }
}

/** Text einer festen Vorlage mit {0}, {1} … für ihre Ausdrücke; `platz` vergibt die Nummern. */
function vorlagenText(src, a, platz) {
  if (a.art === 'text') return a.text;
  let t = '';
  a.teile.forEach((teil, i) => { t += gekocht(teil); if (i < a.ausdruecke.length) t += `{${platz(src.slice(a.ausdruecke[i].start, a.ausdruecke[i].ende))}}`; });
  return t;
}
function neuGeschrieben(src, a, versatz, eintraege) {
  if (a.art === 'text' || a.art === 'zahl') return a.roh;
  let t = '`';
  a.teile.forEach((teil, i) => { t += teil; if (i < a.ausdruecke.length) { const x = a.ausdruecke[i]; t += '${' + umformen(src.slice(x.start, x.ende), versatz + x.start, eintraege).code + '}'; } });
  return t + '`';
}
/** Lp(n, de1, deN, en1, enN): Mehrzahl. Ein Schlüssel für alle vier Texte; die Sprachdatei hat je Form (one, few, many, other) einen Text. */
function umformenLp(src, m, p, versatz, eintraege) {
  const plaetze = [];
  const platz = a => { const n = normal(a); let i = plaetze.findIndex(x => x.n === n); if (i < 0) { plaetze.push({ n, a }); i = plaetze.length - 1; } return i; };
  const [, de1, deN, en1, enN] = p.args;
  const texte = [en1, enN, de1, deN].map(a => vorlagenText(src, a, platz));
  const [e1, eN, d1, dN] = texte;
  const k = schluessel(`${d1}\u241e${dN}`, `${e1}\u241e${eN}`);
  eintraege.push({ k, de: [d1, dN], en: [e1, eN], ort: versatz + m.index, mehrzahl: true });
  const teile = p.args.map(a => neuGeschrieben(src, a, versatz, eintraege));
  const werte = plaetze.map(x => umformen(x.a, 0, []).code);
  return `Lp(${teile.join(', ')}, '${k}'${werte.length ? `, [${werte.join(', ')}]` : ''})`;
}

export const schluessel = (de, en) => 'k' + createHash('sha1').update(`${de}␟${en ?? ''}`).digest('hex').slice(0, 8);

/**
 * Formt Quelltext um und sammelt die Einträge.
 * @returns {{ code: string, eintraege: Array<{ k: string, de: string, en?: string, sie?: string, ort: number }> }}
 */
export function umformen(src, versatz = 0, eintraege = []) {
  let aus = '', zuletzt = 0;
  KOPF.lastIndex = 0;
  for (let m; (m = KOPF.exec(src)); ) {
    const name = m[1], auf = m.index + m[0].length - 1;
    const p = argumente(src, auf, name === 'Lp');
    if (!p || !NAMEN[name].includes(p.args.length)) continue;
    if (name === 'Lp') { const z = umformenLp(src, m, p, versatz, eintraege); aus += src.slice(zuletzt, m.index) + z; zuletzt = p.ende + 1; KOPF.lastIndex = zuletzt; continue; }
    // Platzhalter: Ausdrücke des englischen Textes zuerst (Englisch ist die Vorlage), dann die nur deutschen.
    const plaetze = [];
    const platz = a => { const n = normal(a); let i = plaetze.findIndex(x => x.n === n); if (i < 0) { plaetze.push({ n, a }); i = plaetze.length - 1; } return i; };
    const fest = name === 'd' ? [p.args[0], p.args[2]] : [p.args[0], p.args[1]];
    const reihe = [fest[1], fest[0], name === 'd' ? p.args[1] : undefined].filter(Boolean);
    const texte = new Map();
    for (const a of reihe) {
      if (a.art === 'text') { texte.set(a, a.text); continue; }
      let t = '';
      a.teile.forEach((teil, i) => { t += gekocht(teil); if (i < a.ausdruecke.length) t += `{${platz(src.slice(a.ausdruecke[i].start, a.ausdruecke[i].ende))}}`; });
      texte.set(a, t);
    }
    const de = texte.get(fest[0]), en = fest[1] ? texte.get(fest[1]) : undefined;
    const k = schluessel(de, en);
    const e = { k, de, ort: versatz + m.index };
    if (en !== undefined) e.en = en;
    if (name === 'd') e.sie = texte.get(p.args[1]);
    eintraege.push(e);
    // Neu schreiben: Ausdrücke in Vorlagen selbst umformen (verschachtelte L-Aufrufe), dann Schlüssel und Werte anhängen.
    const argText = a => {
      if (a.art === 'text') return a.roh;
      let t = '`';
      a.teile.forEach((teil, i) => { t += teil; if (i < a.ausdruecke.length) { const x = a.ausdruecke[i]; t += '${' + umformen(src.slice(x.start, x.ende), versatz + x.start, eintraege).code + '}'; } });
      return t + '`';
    };
    const teile = p.args.map(argText);
    if (name === 'd' && p.args.length === 2) teile.push('undefined');
    const werte = plaetze.map(x => umformen(x.a, 0, []).code);
    aus += src.slice(zuletzt, m.index) + `${name}(${teile.join(', ')}, '${k}'${werte.length ? `, [${werte.join(', ')}]` : ''})`;
    zuletzt = p.ende + 1;
    KOPF.lastIndex = zuletzt;
  }
  return { code: aus + src.slice(zuletzt), eintraege };
}

/** Aufrufe, die der Auszug nicht fassen kann (ein Argument ist kein fester Text): Stellen, die von Hand umgebaut werden müssen. */
export function offeneAufrufe(src) {
  const aus = [];
  const kopf = new RegExp(KOPF.source, 'g');
  for (let m; (m = kopf.exec(src)); ) {
    const auf = m.index + m[0].length - 1;
    const p = argumente(src, auf, m[1] === 'Lp');
    if (p && NAMEN[m[1]].includes(p.args.length)) continue;
    const ende = ausdruck(src, auf + 1, ')');
    if (ende === auf + 1) continue;   // L() ohne Argumente
    aus.push({ ort: m.index, text: src.slice(m.index, ende < 0 ? m.index + 120 : ende + 1) });
  }
  return aus;
}
