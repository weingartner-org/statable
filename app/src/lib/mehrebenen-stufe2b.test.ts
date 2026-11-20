import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { s } from './sitzung.svelte';
import type { Spalte } from './verzeichnis';
import { mebLesen, mebRCode, erkenneWachstum, type Mehrebenen, type MebPraed } from './mehrebenen';
import { saetzeMehrebenen, praedName, tabellenMehrebenen } from './mehrebenensaetze';

/* Sätze und R-Aufruf zu Gruppenmittel-Zentrierung und Wechselwirkungen über die Ebenen (Field-Stufe 2b). Die Rechnung gegen R steht in engine/mehrebenen-vergleich.webr.test.ts.
 * Hier: die Rohantwort von sp_mehrebenen (testdaten/mehrebenen-r.json, Klassen-Ausschnitt) mit anderen Namen der zwei Größen. */
const roh = JSON.parse(readFileSync(join(import.meta.dirname, 'testdaten/mehrebenen-r.json'), 'utf8')) as Record<string, Record<string, unknown>>;
const sp = (name: string, extra: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...extra });
const innen: MebPraed = { name: 'SES⁣innerhalb', art: 'zahl', stufen: [], teile: [{ quelle: 'SES', rolle: 'innerhalb' }] };
const zwischen: MebPraed = { name: 'SES⁣zwischen', art: 'zahl', stufen: [], teile: [{ quelle: 'SES', rolle: 'zwischen' }] };
const gruppe = (): Mehrebenen => mebLesen(roh.klassen!, { y: 'Mathe', gruppe: 'Klasse', praed: [innen, zwischen], steigung: '', zentriert: true, zentrierArt: 'gruppe', praedOrig: ['SES'] });
const alle = (e: Mehrebenen) => { const x = saetzeMehrebenen(e); return [x.haupt, x.zusatz, x.vorsicht].join(' '); };
beforeEach(() => { s.einst.sprache = 'de'; s.spalten = [sp('Mathe', { bezeichnung: 'Mathematik-Leistung' }), sp('Klasse', { art: 'text', niveau: 'nominal' }), sp('SES', { bezeichnung: 'Sozialer Status' }), sp('kath')]; });

describe('Gruppenmittel-Zentrierung: Namen und Sätze', () => {
  it('Namen: Abweichung vom Gruppenmittel heißt „innerhalb der Gruppe“, das Gruppenmittel „Gruppenmittel“', () => {
    expect(praedName(innen, n => n)).toBe('SES (innerhalb der Gruppe)');
    expect(praedName(zwischen, n => n)).toBe('SES (Gruppenmittel)');
    s.einst.sprache = 'en';
    expect(praedName(innen, n => n)).toBe('SES (within the group)');
  });
  it('Satz deutet Effekt innerhalb gegen zwischen und nennt den Kontexteffekt, mit den Zahlen', () => {
    const e = gruppe(), txt = alle(e);
    const a = e.fest.find(f => f.pIdx === 0)!, b = e.fest.find(f => f.pIdx === 1)!;
    expect(txt).toContain('Gruppenmittel-Zentrierung bei');
    expect(txt).toContain('Effekt innerhalb, b = ' + a.b.toFixed(2).replace('.', ',').replace('-', '−'));
    expect(txt).toContain('Effekt zwischen');
    expect(txt).toContain('Kontexteffekt');
    expect(txt).toContain(((b.b - a.b)).toFixed(2).replace('.', ',').replace('-', '−'));
    expect(txt).toContain('keine Ursachen');
  });
  it('Englisch: within and between', () => {
    s.einst.sprache = 'en';
    const txt = alle(gruppe());
    expect(txt).toContain('within effect'); expect(txt).toContain('between effect'); expect(txt).toContain('contextual effect');
  });
  it('Tabelle der festen Effekte trägt die neuen Namen', () => {
    const t = tabellenMehrebenen(gruppe());
    expect(JSON.stringify(t)).toContain('innerhalb der Gruppe'); expect(JSON.stringify(t)).toContain('Gruppenmittel');
  });
  it('R-Aufruf zeigt, wie die zwei Größen entstehen', () => {
    const code = mebRCode(gruppe(), (de) => de);
    expect(code).toContain('ave(daten$SES, daten$Klasse)'); expect(code).toContain('SES_innerhalb'); expect(code).toContain('SES_zwischen');
  });
});

describe('Wechselwirkung über die Ebenen', () => {
  const kath: MebPraed = { name: 'kath', art: 'zahl', stufen: [], gruppenEbene: true };
  const prod: MebPraed = { name: 'SES⁣innerhalb⁢kath', art: 'zahl', stufen: [], teile: [{ quelle: 'SES', rolle: 'innerhalb' }, { quelle: 'kath' }] };
  const e = (): Mehrebenen => mebLesen(roh.klassen!, { y: 'Mathe', gruppe: 'Klasse', praed: [kath, prod], steigung: '', zentriert: true, zentrierArt: 'gruppe', praedOrig: ['SES', 'kath'], wechsel: [[{ quelle: 'SES', rolle: 'innerhalb' }, { quelle: 'kath' }]] });
  it('Name „A (innerhalb der Gruppe) × B“, Satz „über die Ebenen“, R-Formel mit Doppelpunkt', () => {
    expect(praedName(prod, n => n)).toBe('SES (innerhalb der Gruppe) × kath');
    const txt = alle(e());
    expect(txt).toContain('Wechselwirkung über die Ebenen'); expect(txt).toContain('Ein Merkmal der Gruppe verändert');
    expect(mebRCode(e(), (de) => de)).toContain('SES_innerhalb:kath');
  });
  it('zwei Größen derselben Ebene: einfache Wechselwirkung', () => {
    const a: MebPraed = { name: 'x', art: 'zahl', stufen: [] }, p2: MebPraed = { name: 'x⁢SES⁣innerhalb', art: 'zahl', stufen: [], teile: [{ quelle: 'x' }, { quelle: 'SES', rolle: 'innerhalb' }] };
    const m = mebLesen(roh.klassen!, { y: 'Mathe', gruppe: 'Klasse', praed: [innen, p2], steigung: '', zentriert: false });
    void a;
    const txt = alle(m);
    expect(txt).toContain('Wechselwirkung'); expect(txt).not.toContain('über die Ebenen');
  });
});

describe('Wachstumsmodell erkennen (Hinweis)', () => {
  const spalten = [sp('person', { art: 'text', niveau: 'nominal' }), sp('zeit'), sp('wert')];
  const lang = (k: number, je: number) => Array.from({ length: k * je }, (_, i) => [`P${Math.floor(i / je)}`, i % je, i * 0.5]) as (string | number | null)[][];
  it('Person mal Zeitpunkt in langer Form: Zeitspalte, Messungen je Person im Mittel', () => {
    const v = erkenneWachstum(spalten, lang(12, 4), 'person', ['zeit']);
    expect(v).toMatchObject({ gruppe: 'person', zeit: 'zeit', messungenJeGruppe: 4 });
  });
  it('kein Hinweis: zu wenige Messungen, Spalte ändert sich nicht innerhalb, Name sagt nichts', () => {
    expect(erkenneWachstum(spalten, lang(12, 2), 'person', ['zeit'])).toBeNull();
    expect(erkenneWachstum(spalten, lang(12, 4).map(z => [z[0]!, 1, z[2]!]), 'person', ['zeit'])).toBeNull();
    expect(erkenneWachstum([...spalten.slice(0, 2), sp('wert')], lang(12, 4), 'person', ['wert'])).toBeNull();
    expect(erkenneWachstum(spalten, lang(3, 4), 'person', ['zeit'])).toBeNull();
  });
});
