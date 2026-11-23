#!/usr/bin/env node
/**
 * Prüfskript für eine Sprache (Bauplan Sprachen, Phase 2). Muss grün sein, bevor eine Sprache zur Fachperson geht.
 *
 *   node i18n/pruefen.mjs fr            Fehler und Warnungen, Ausgang 1 bei Fehlern
 *   node i18n/pruefen.mjs fr --alle     zusätzlich jede Warnung einzeln
 *
 * Fehler (hart):  Platzhalter {0} … fehlen oder sind zu viel · HTML-Tags anders als im Englischen · Wort aus der Sperrliste ·
 *                 rumänisch ş/ţ mit Cedille · Wort aus zwei Schriften (kyrillisch/griechisch mit lateinischen Doppelgängern) ·
 *                 Schlüssel, den es im Katalog nicht gibt.
 * Warnungen:      fehlende Texte (Abdeckung) · Formelzeichen aus dem Englischen (M =, SD =, p <) fehlen · Glossarbegriff im
 *                 Englischen, aber nicht in Glossarform im Ziel (Wortstamm genügt) · kurzer Text (Knopf, Reiter) über 1,6 × Englisch.
 * Glossar: docs/sprachen/glossar-<code>.csv; zählt hart, sobald die Spalte `freigabe` = ja ist (nach der Fachperson).
 * Sperrliste: docs/sprachen/sperrliste-<code>.txt (ein Wort oder eine Wendung je Zeile, # Kommentar).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('..', import.meta.url));
const DOCS = join(APP, '..', 'docs', 'sprachen');
const [code, schalter] = process.argv.slice(2);
if (!code) { console.error('Aufruf: node i18n/pruefen.mjs <code> [--alle]'); process.exit(2); }

const json = f => JSON.parse(readFileSync(f, 'utf8'));
const katalog = json(join(APP, 'src/i18n/katalog.json'));
const ziel = {};
for (const f of [`${code}.json`, `${code}.hilfe.json`]) { const p = join(APP, 'src/i18n/sprachen', f); if (existsSync(p)) Object.assign(ziel, json(p)); }

/** CSV mit ; und "…" (wie die Glossare). */
function csv(text) {
  const zeilen = []; let z = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; continue; }
    if (c === '"') q = true; else if (c === ';') { z.push(f); f = ''; } else if (c === '\n') { z.push(f); zeilen.push(z); z = []; f = ''; } else if (c !== '\r') f += c;
  }
  if (f || z.length) { z.push(f); zeilen.push(z); }
  const [kopf, ...rest] = zeilen;
  return rest.filter(r => r.length > 1).map(r => Object.fromEntries(kopf.map((k, i) => [k, r[i] ?? ''])));
}

const fehler = [], warnungen = [];
const F = (k, t) => fehler.push(`${k}: ${t}`), W = (art, k, t) => warnungen.push({ art, t: `${k}: ${t}` });

// Glossar: englischer Begriff (begriffe.csv) → Zielbegriff
const begriffe = existsSync(join(DOCS, 'begriffe.csv')) ? csv(readFileSync(join(DOCS, 'begriffe.csv'), 'utf8')) : [];
const glossarDatei = join(DOCS, `glossar-${code}.csv`);
const glossar = existsSync(glossarDatei) ? csv(readFileSync(glossarDatei, 'utf8')) : [];
const englisch = Object.fromEntries(begriffe.map(b => [b.id, b.englisch]));
const regeln = glossar.filter(g => englisch[g.id] && g.begriff && englisch[g.id].length > 3).map(g => ({
  en: new RegExp(`\\b${englisch[g.id].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
  stamm: g.begriff.toLocaleLowerCase(code).split(/[ /]/)[0].slice(0, Math.max(4, Math.ceil(g.begriff.split(/[ /]/)[0].length * 0.6))),
  begriff: g.begriff, hart: /^ja$/i.test(g.freigabe ?? '')
}));
const sperrDatei = join(DOCS, `sperrliste-${code}.txt`);
const sperre = existsSync(sperrDatei) ? readFileSync(sperrDatei, 'utf8').split('\n').map(z => z.replace(/#.*/, '').trim()).filter(Boolean) : [];

const platz = t => [...t.matchAll(/\{(\d+)\}/g)].map(m => m[1]).sort().join(',');
// Nur echte HTML-Tags: Transkript-Klammern wie „<School A>“ oder „<name>“ sind Text und dürfen übersetzt werden.
const HTML_TAGS = new Set(['a', 'b', 'br', 'code', 'em', 'i', 'kbd', 'li', 'ol', 'p', 'small', 'span', 'strong', 'sub', 'sup', 'ul']);
const tags = t => [...t.matchAll(/<\/?([a-z][a-z0-9]*)\b/gi)].filter(m => HTML_TAGS.has(m[1].toLowerCase())).map(m => m[0].toLowerCase()).sort().join(' ');
const ZEICHEN = /(?<![\p{L}\d])(?:SD|SE|Mdn|df|M|p|N|n|F|R²|t|r|d)(?=\s*[(=<>≤≥])/gu;
const zeichen = t => [...new Set(t.match(ZEICHEN) ?? [])];
const kyrill = /\p{Script=Cyrillic}/u, griech = /\p{Script=Greek}/u, latein = /[A-Za-z]/;

let vorhanden = 0, gesamt = 0;
for (const [k, e] of Object.entries(katalog)) {
  gesamt++;
  const t = ziel[k];
  if (t === undefined) continue;
  vorhanden++;
  const vorlagen = e.mehrzahl ? e.en : [e.en ?? e.de];
  const formen = typeof t === 'string' ? [t] : Object.values(t);
  if (!!e.mehrzahl !== (typeof t !== 'string')) F(k, 'Mehrzahl im Katalog und in der Sprachdatei passen nicht zusammen');
  const quelle = vorlagen.at(-1);
  for (const form of formen) {
    if (typeof t === 'string' ? platz(form) !== platz(quelle) : platz(form).split(',').some(x => x && !platz(quelle).includes(x))) F(k, `Platzhalter ${platz(form) || '-'} statt ${platz(quelle) || '-'}`);
    if (tags(form) !== tags(quelle)) F(k, `HTML-Tags anders als im Englischen (${tags(quelle) || '-'} → ${tags(form) || '-'})`);
    for (const s of sperre) if (form.toLocaleLowerCase(code).includes(s.toLocaleLowerCase(code))) F(k, `Sperrliste: „${s}“`);
    if (code === 'ro' && /[şţŞŢ]/.test(form)) F(k, 'ş/ţ mit Cedille statt ș/ț mit Komma');
    for (const w of form.split(/[\s.,;:!?()«»„“”"'’/<>=_-]+/)) { // < > =: Tags („Австрія<br>“) sind keine Mischschrift; _: Spaltennamen („παλμός_ρολόι_b“, Einheit oder Endung lateinisch)
      const wort = w.replace(/^[\[\]]+|[\[\]]+$/g, '');
      // Formelzeichen (ηp², ΔR², ωh) mischen mit Absicht: erlaubt, wenn sie genauso im Englischen stehen
      if ((kyrill.test(wort) || griech.test(wort)) && latein.test(wort) && !quelle.includes(wort)) F(k, `Wort aus zwei Schriften: „${wort}“`);
    }
    for (const z of zeichen(quelle)) if (!form.includes(z)) W('zeichen', k, `Formelzeichen „${z}“ fehlt`);
    for (const g of regeln) if (g.en.test(quelle) && !form.toLocaleLowerCase(code).includes(g.stamm)) (g.hart ? F : (kk, tt) => W('glossar', kk, tt))(k, `Glossar: „${g.begriff}“ erwartet`);
    if (quelle.length <= 25 && form.length > quelle.length * 1.6 + 4) W('laenge', k, `${form.length} Zeichen statt ${quelle.length} (Knopf/Reiter?)`);
  }
}
for (const k of Object.keys(ziel)) if (!katalog[k]) F(k, 'steht nicht im Katalog (veraltet? node i18n/katalog.mjs)');

const nachArt = warnungen.reduce((m, w) => ((m[w.art] = (m[w.art] ?? 0) + 1), m), {});
console.log(`${code}: ${vorhanden} von ${gesamt} Texten (${Math.round((100 * vorhanden) / gesamt)} %) · ${fehler.length} Fehler · Warnungen ${JSON.stringify(nachArt)}${glossar.length ? '' : ' · kein Glossar'}`);
for (const f of fehler.slice(0, 200)) console.log('  ✗ ' + f);
if (schalter === '--alle') for (const w of warnungen) console.log(`  ⚠ [${w.art}] ${w.t}`);
process.exit(fehler.length ? 1 : 0);
