import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { umformen } from '../../i18n/auszug.mjs';

/** Abschlusstest C4: Die Anrede „Sie“ muss überall gelten. Ein fester Text mit „du“-Formen (du, dein, dich, dir, Befehlsformen wie
 *  „Wähle“, „Öffne“) gehört in `d(du, Sie, en)`, oder er wird ohne Anrede geschrieben (Infinitiv, Passiv, Hauptwort).
 *  Der Test liest den ganzen Quelltext in `src` mit demselben Auszug wie der Katalog: jeder Eintrag aus `L`, `T`, `Lx`, `Lp`, `P`
 *  mit „du“-Form ist ein Fehler, ebenso ein `d()`, dessen Sie-Text gleich dem du-Text ist. */
const PRONOMEN = 'du|Du|dir|Dir|dich|Dich|Dein|dein|deine|deinen|deiner|deinem|deines|euch|hast|bist|brauchst|wählst|klickst|kannst|musst|siehst|willst|möchtest|schaltest|darfst|solltest|wirst|findest';
const BEFEHL = 'Kopiere|Korrigiere|Lade|Ordne|Prüfe|Prüf|Schalte|Schließe|Trage|Wähle|Wähl|Ändere|Öffne|Klicke|Klick|Schau|Speichere|Gib|Füge|Füg|Lösche|Nimm|Sieh|Ergänze|Tippe|Entferne|Benenne|Ziehe|Starte|Versuche|Probiere|Erstelle|Lies|Bearbeite|Drücke|Bring|Geh|Beachte|Denk|Lass|Warte|Schreibe|Schreib|Nutze|Exportiere|Importiere|Aktiviere|Bestätige|Wiederhole|Entscheide|Merke|Kontrolliere|Sortiere|Filtere|Gruppiere|Hole|Wechsle|Erhöhe|Verkleinere|Setz|Setze|Zentriere|Rechne|Zeige|Suche|Füll|Fülle|Beginne|Vergleiche|Verwende|Achte|Stelle|Erkläre|Frag|Teste|Behalte|Wandle|Lege|Leg|Gehe|Kehre|Passe|Gestalte|Markiere|Zähle|Vergiss|Sende|Melde|Reiche|Berechne|Wiederhol|Spar|Beschreibe|Ersetze|Verschiebe|Schiebe|Runde|Nenne|Bleib|Bleibe|Rufe|Tausche|Lasse|Lad|Lern|Drück|Halte|Misch|Kürze|Verbinde|Teile';
// Mitten im Satz steht die Befehlsform klein, auch mit -e („frage, ob“, „prüfe, ob“): N4 (Abschlusstest) - „frage“ in der Meta-Analyse blieb unentdeckt, weil nur „Frag“ in der Liste stand.
// Groß geschrieben mit -e nur, was schon in der Liste steht („Frage“ ist ein Hauptwort); „siehe“ ist ein Verweis, keine Anrede.
const BEFEHL_BEIDE = BEFEHL.split('|').flatMap(v => [v, v[0]!.toLowerCase() + v.slice(1), ...(v.endsWith('e') || /^sieh$/i.test(v) ? [] : [v[0]!.toLowerCase() + v.slice(1) + 'e'])]).join('|');
const DU = new RegExp(`(?<![\\wäöüÄÖÜß])(?:${PRONOMEN})(?![\\wäöüÄÖÜß])|(?:^|[.!?:;,(„“\\u2014\\-]\\s*|\\s-\\s|\\b[Uu]nd\\s|\\b[Oo]der\\s|\\b[Dd]ann\\s|\\b[Ee]rst\\s|\\b[Bb]itte\\s)(?:${BEFEHL_BEIDE})(?![\\wäöüÄÖÜß])`);

/** Bewusste Ausnahmen: Teil des Textes → Grund. Jede Ausnahme muss im Quelltext vorkommen (sonst Fehler: Liste aufräumen). */
const AUSNAHMEN: Array<{ text: string; grund: string }> = [
  { text: 'Versuche im Lernlabor', grund: 'Hauptwort, kein Imperativ' },
  { text: 'Anrede: du oder Sie (nur deutsche Oberfläche).', grund: 'Hilfetext nennt die beiden Wahlmöglichkeiten selbst' },
  { text: 'Duşa, A. (2019). QCA with R.', grund: 'Literaturangabe: der Name „Duşa“, keine Anrede' },
  { text: 'und halte das Tempolimit ein', grund: 'Beispielitem in Anführungszeichen, 1. Person („ich halte“), keine Befehlsform' },
  { text: 'Anrede du Sie Rundgang', grund: 'Suchwörter der Hilfe: „du“ und „Sie“ sollen den Artikel finden' },
  { text: 'Ich plane die Woche und merke trotzdem', grund: 'erfundene Interviewstelle in Anführungszeichen, 1. Person („ich plane“), keine Befehlsform (Hilfe eh-kodieren, Stufe 6b)' },
];

function dateien(ordner: string): string[] {
  return readdirSync(ordner).flatMap(n => {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) return n === 'sprachen' || n === 'testdaten' ? [] : dateien(p);
    return /\.(ts|svelte)$/.test(n) && !/\.test\.ts$/.test(n) && !/\.d\.ts$/.test(n) ? [p] : [];
  });
}
const SRC = fileURLToPath(new URL('..', import.meta.url));
const ausnahme = (t: string) => AUSNAHMEN.some(a => t.includes(a.text));

describe('Anrede „Sie“ gilt überall', () => {
  const funde: string[] = [];
  const gesehen = new Set<string>();
  for (const f of dateien(SRC)) {
    if (f.split(sep).join('/').endsWith('i18n/laufzeit.ts')) continue;
    const { eintraege } = umformen(readFileSync(f, 'utf8')) as { eintraege: Array<{ de: string | string[]; sie?: string }> };
    for (const e of eintraege) {
      for (const t of Array.isArray(e.de) ? e.de : [e.de]) {
        if (!DU.test(t)) continue;
        gesehen.add(t);
        if (e.sie !== undefined && e.sie !== t) continue;                  // d(): zwei Fassungen vorhanden
        if (ausnahme(t)) continue;
        funde.push(`${relative(SRC, f)}: ${t}`);
      }
    }
  }
  it('kein fester Text mit „du“-Form ohne Sie-Fassung', () => {
    expect(funde).toEqual([]);
  });
  it('jede Ausnahme kommt im Quelltext noch vor', () => {
    const tot = AUSNAHMEN.filter(a => ![...gesehen].some(t => t.includes(a.text))).map(a => a.text);
    expect(tot).toEqual([]);
  });
});

describe('Meldungen und Erklärtexte (messages.de.json)', () => {
  const m = JSON.parse(readFileSync(new URL('./messages.de.json', import.meta.url), 'utf8')) as Record<string, unknown>;
  const einzel: string[] = [];
  const paare: string[] = [];
  const geh = (o: unknown, pfad: string) => {
    if (typeof o === 'string') { if (!pfad.startsWith('._info') && DU.test(o)) einzel.push(`${pfad}: ${o}`); return; }
    if (o && typeof o === 'object') {
      const r = o as Record<string, unknown>;
      if (typeof r.du === 'string' && typeof r.sie === 'string') { if (r.du === r.sie && DU.test(r.du)) paare.push(`${pfad}: ${r.du}`); return; }
      for (const [k, v] of Object.entries(r)) geh(v, `${pfad}.${k}`);
    }
  };
  geh(m, '');
  it('Texte ohne du/sie-Paar enthalten kein „du“', () => { expect(einzel).toEqual([]); });
  it('ein du/sie-Paar mit gleichem Text hat keine „du“-Form', () => { expect(paare).toEqual([]); });
});
