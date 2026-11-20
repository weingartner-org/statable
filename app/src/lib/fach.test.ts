import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-a-erwartet.json';
import { ausgeblendet, FACH_MATRIX, FAECHER, fachAusSpeicher, fachName, KARTEN_ALLE, KARTEN_HEUTE, KERN_KARTEN, kartenSuche, sichtbar, sichtbareKarten, type FachId } from './fach';
import { VERFAHREN } from './verfahren';
import { korrMatrix } from './korrmatrix';
import { beschreibe } from './gewichte';
import { klassenVorschau } from './klassieren';
import { zeitTrend, zeitAcf, zerlegung } from './zeitreihe';
import { zStandardisieren, clusterSilhouette, clusterNachGroesse } from './cluster';
import { s } from './sitzung.svelte';

/* ===== Welle S-A, Teil 4: Fach-Schalter „Mein Fachgebiet“ (Fachblatt Abschnitt 4 und „Entscheidungen Opus“) =====
 * Sollwerte: die Sichtbarkeitsmatrix des Fachblatts 4.4 als Daten (scripts/spaeter-a-erwartet.R → testdaten/spaeter-a-erwartet.json, Abschnitt fach), Zählungen im Skript gegengerechnet.
 * Der Schalter entscheidet NUR, welche Karten in der Kartenliste stehen; er ändert nie Rechenwege, Voreinstellungen oder Sätze. Der Bauer ändert Test und JSON nicht.
 * Das Modul `lib/fach.ts` hat diese API - sie ist hier festgelegt:
 *
 *   type FachId = 'bildung' | 'medizin' | 'bio' | 'wirtschaft' | 'technik' | 'informatik' | 'alle'      (Standard 'bildung'; 'alle' = „Alle Verfahren zeigen“)
 *   type Sichtbar = 'ja' | 'weitere' | 'nein'      ja = an Ort und Stelle, weitere = in der eingeklappten Gruppe „Weitere Verfahren“, nein = nur über die Suche
 *   FAECHER: { id: FachId }[]    in der Reihenfolge bildung, medizin, bio, wirtschaft, technik, informatik, alle
 *   fachName(id): string         Name in der aktuellen Sprache (de: „Bildung und Psychologie“ …, „Alle Verfahren zeigen“)
 *   KERN_KARTEN: string[]        die neun Karten, die in jedem Fach 'ja' sind
 *   KARTEN_HEUTE: string[]       die 19 Karten, die es jetzt gibt (ids wie in lib/verfahren.ts VERFAHREN)     KARTEN_ALLE: string[]   dazu die 7 geplanten (qca, zeitreihen, cluster, kurven, regelkarten, gaugerr, kalibrier)
 *   FACH_MATRIX: Record<kartenId, Record<FachId, Sichtbar>>      über KARTEN_ALLE
 *   sichtbar(kartenId, fach): Sichtbar                           unbekannte Id (Karte ohne Eintrag) = 'ja' (Kern: nichts verschwindet durch ein Versehen)
 *   sichtbareKarten(fach, ids = KARTEN_HEUTE): string[]          alle mit 'ja' oder 'weitere' in der Reihenfolge von ids
 *   ausgeblendet(fach, ids = KARTEN_HEUTE): string[]             alle mit 'nein' (für die Zeile „‹n› Verfahren sind ausgeblendet. [Alle anzeigen] [Fachgebiet ändern]“ nur wenn n > 0)
 *   fachAusSpeicher(x: unknown): FachId                          gültige Id bleibt; undefined, null, Unsinn → 'bildung' (alte Speicherstände ohne Feld)
 *   kartenSuche(text, fach): { id: string; zustand: Sichtbar }[]  Karten, deren Titel (aktuelle Sprache, ohne Beachtung von Groß/klein) den Text enthält - AUCH ausgeblendete, mit ihrem Zustand
 *   Einstellungen (lib/sitzung.svelte.ts): neues Feld `fach: FachId`, Standard 'bildung' (s.einst.fach).
 */

const F = (erwartet as any).fach;
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const SECHS: FachId[] = ['bildung', 'medizin', 'bio', 'wirtschaft', 'technik', 'informatik'];
const ALLE: FachId[] = [...SECHS, 'alle'];
/** Die drei Karten des Kurs-Pakets (Fachblatt KURSPAKET): in jedem Fach eingeklappt unter „Weitere Verfahren“. */
const NEU = ['diskriminanz', 'loglinear', 'manova', 'armut'];   // Armut (Abschnitt 3) steht wie das Kurs-Paket in jedem Fach eingeklappt

describe('Fächerliste und Namen', () => {
  it('sieben Einträge in dieser Reihenfolge, „Alle Verfahren zeigen“ zuletzt', () => { expect(FAECHER.map(f => f.id)).toEqual(ALLE); });
  it('Namen (Deutsch)', () => { expect(FAECHER.map(f => fachName(f.id))).toEqual(F.namen_de); expect(fachName('alle')).toBe('Alle Verfahren zeigen'); });
  it('Standard ist Bildung und Psychologie - auch ohne Feld im Speicherstand', () => {
    expect(F.standard).toBe('bildung'); expect((s.einst as { fach?: string }).fach, 'Einstellungen: fach fehlt (STANDARD in lib/sitzung.svelte.ts)').toBe('bildung');
    expect(fachAusSpeicher(undefined)).toBe('bildung'); expect(fachAusSpeicher(null)).toBe('bildung'); expect(fachAusSpeicher('quatsch')).toBe('bildung'); expect(fachAusSpeicher(3)).toBe('bildung');
    for (const f of ALLE) expect(fachAusSpeicher(f)).toBe(f);
  });
});

describe('Kartenlisten', () => {
  // S-E (Opus 18.10., Entscheidung 9): zeitreihen und cluster sind jetzt da, also 21 Verfahren; die 5 übrigen geplanten bleiben (qca, kurven, regelkarten, gaugerr, kalibrier)
  const GEPLANT_NOCH = (F.neu_ids as string[]).filter(i => i !== 'zeitreihen' && i !== 'cluster');
  it('KARTEN_HEUTE sind genau die 25 Verfahren des Programms', () => { expect([...KARTEN_HEUTE].sort()).toEqual(VERFAHREN.map(v => v.id).sort()); expect(KARTEN_HEUTE.length).toBe(25); });
  it('KARTEN_ALLE = die 25 und die 5 noch geplanten', () => { expect(GEPLANT_NOCH.length).toBe(5); expect([...KARTEN_ALLE].sort()).toEqual([...KARTEN_HEUTE, ...GEPLANT_NOCH].sort()); expect(KARTEN_ALLE.length).toBe(30); });
  it('Kern sind neun Karten: Gruppen, Prä-Post, Zusammenhang, Korrelationsmatrix, Vorhersage, Verteilung, Kreuztabelle, Skala, Übereinstimmung', () => {
    expect([...KERN_KARTEN].sort()).toEqual(['gruppen', 'korrmatrix', 'kreuz', 'praepost', 'skala', 'uebereinstimmung', 'verteilung', 'vorhersage', 'zusammenhang']);
    expect([...KERN_KARTEN].sort()).toEqual([...F.kern].sort());
  });
});

describe('Matrix (Fachblatt 4.4) gegen die Daten', () => {
  for (const id of F.alle_ids as string[]) it(`${id}: ${SECHS.map(f => F.matrix[id][f]).join(' / ')}`, () => {
    /* Johannes 01.11.: Zeitreihen und Cluster sind nie ganz ausgeblendet, wo das Fachblatt „nein“ sagt, stehen sie eingeklappt */
    const soll = (v: string) => ((id === 'zeitreihen' || id === 'cluster') && v === 'nein' ? 'weitere' : v);
    for (const f of SECHS) expect(sichtbar(id, f), `${id} im Fach ${f}`).toBe(soll(F.matrix[id][f]));
    expect(sichtbar(id, 'alle'), `${id} bei „Alle Verfahren zeigen“`).toBe(id === 'zeitreihen' || id === 'cluster' ? (sichtbar(id, 'bildung') === 'weitere' ? 'weitere' : 'ja') : F.alle[id]);
    expect(FACH_MATRIX[id]).toBeTruthy();
  });
  it('„Alle Verfahren zeigen“: nichts ist ausgeblendet; die eingeklappte Gruppe bleibt eingeklappt, wo sie es bei Bildung/Psychologie ist', () => {
    for (const id of KARTEN_ALLE) { expect(sichtbar(id, 'alle')).not.toBe('nein'); expect(sichtbar(id, 'alle')).toBe(sichtbar(id, 'bildung') === 'weitere' ? 'weitere' : 'ja'); }
    expect(ausgeblendet('alle', KARTEN_ALLE)).toEqual([]);
  });
  it('unbekannte Karte: ja', () => { for (const f of ALLE) expect(sichtbar('gibtsnicht', f)).toBe('ja'); });
});

describe('Regeln (Pflicht laut Fachblatt)', () => {
  it('höchstens 20 sichtbare Karten je Fach (außer „Alle“) - ohne die drei Karten des Kurs-Pakets und die Karte Armut, die in jedem Fach eingeklappt unter „Weitere Verfahren“ stehen (dann höchstens 24)', () => {
    const ohneKurs = (ids: string[]) => ids.filter(i => !NEU.includes(i) && i !== 'zeitreihen' && i !== 'cluster');
    for (const f of SECHS) { expect(sichtbareKarten(f, ohneKurs(KARTEN_HEUTE)).length, f).toBeLessThanOrEqual(20); expect(sichtbareKarten(f, ohneKurs(KARTEN_ALLE)).length, f).toBeLessThanOrEqual(20); expect(sichtbareKarten(f, KARTEN_ALLE).length, f).toBeLessThanOrEqual(26); }
    expect(sichtbareKarten('alle', KARTEN_ALLE).length).toBe(30);
  });
  it('Zählung wie im Fachblatt: vor S-E 19 / 16 / 13 / 14 / 9 / 10, mit den zwei Karten von S-E 19 / 16 / 15 / 16 / 10 / 12, nach S-H, S-I 20 / 16 / 16 / 16 / 14 / 12 (im Test gezählt, nicht von Hand)', () => {
    expect(SECHS.map(f => sichtbareKarten(f, KARTEN_HEUTE).length)).toEqual([25, 22, 19, 20, 15, 16]);   // dazu die drei Karten des Kurs-Pakets und Armut, überall eingeklappt
    expect(SECHS.map(f => sichtbareKarten(f, KARTEN_ALLE).length)).toEqual([26, 22, 20, 20, 19, 16]);
    const vorSE = KARTEN_HEUTE.filter(i => i !== 'zeitreihen' && i !== 'cluster' && !NEU.includes(i));
    expect(SECHS.map(f => sichtbareKarten(f, vorSE).length)).toEqual(SECHS.map(f => F.zaehlung.heute[f]));
    /* seit 01.11. zählen Zeitreihen und Cluster überall mit (eingeklappt, wo das Fachblatt „nein“ sagte): Bildung +2, Medizin +2, Technik +1 */
    expect(SECHS.map(f => sichtbareKarten(f, KARTEN_ALLE.filter(i => !NEU.includes(i))).length)).toEqual(SECHS.map(f => F.zaehlung.nach_se_sh_si[f] + ({ bildung: 2, medizin: 2, technik: 1 } as Record<string, number>)[f]!  || F.zaehlung.nach_se_sh_si[f]));
  });
  it('jede Karte steht in mindestens einem Fach (sichtbar oder eingeklappt)', () => {
    for (const id of KARTEN_ALLE) expect(ALLE.some(f => sichtbar(id, f) !== 'nein'), id).toBe(true);
  });
  it('Kern fehlt nirgends und ist überall „ja“ (sichtbar(‘gruppen’, f) === ‘ja’ für alle Fächer)', () => {
    for (const f of ALLE) { expect(sichtbar('gruppen', f)).toBe('ja'); for (const id of KERN_KARTEN) expect(sichtbar(id, f), `${id} in ${f}`).toBe('ja'); }
  });
  it('Bildung/Psychologie ist der Ist-Zustand: alle 19 bisherigen sichtbar, 14 an Ort und Stelle und 5 eingeklappt (Mediation, Moderation, Mehrebenen, Meta-Analyse, Kaplan-Meier), dazu die drei Karten des Kurs-Pakets eingeklappt; die Fach-Karten Zeitreihen und Cluster sind nur über die Suche da', () => {
    expect(ausgeblendet('bildung')).toEqual([]);
    expect(KARTEN_HEUTE.filter(i => sichtbar(i, 'bildung') === 'ja').length).toBe(14);
    expect(KARTEN_HEUTE.filter(i => sichtbar(i, 'bildung') === 'weitere').sort()).toEqual(['armut', 'cluster', 'diskriminanz', 'kaplanmeier', 'loglinear', 'manova', 'mediation', 'mehrebenen', 'meta', 'moderation', 'zeitreihen']);
  });
  it('Zeile „‹n› Verfahren sind ausgeblendet“: n je Fach heute (nur wenn n > 0 gezeigt)', () => {
    expect(SECHS.map(f => ausgeblendet(f).length)).toEqual([0, 3, 6, 5, 10, 9]);
    const vorSE = KARTEN_HEUTE.filter(i => i !== 'zeitreihen' && i !== 'cluster' && !NEU.includes(i));
    expect(SECHS.map(f => ausgeblendet(f, vorSE).length)).toEqual(SECHS.map(f => F.ausgeblendet_heute[f]));
    expect(ausgeblendet('medizin').sort()).toEqual(['einzelfall', 'faelle', 'kategorien']);
    expect(ausgeblendet('technik').length + sichtbareKarten('technik').length).toBe(25);
  });
  it('Reihenfolge von ids bleibt (die Gruppierung KARTENGRUPPEN ändert sich durch das Fach nicht)', () => {
    const ids = ['kreuz', 'mediation', 'gruppen', 'einzelfall']; expect(sichtbareKarten('medizin', ids)).toEqual(['kreuz', 'mediation', 'gruppen']);
  });
});

describe('Suche findet auch ausgeblendete Karten (Ausgeblendet ≠ „gibt es nicht“)', () => {
  const titel = (id: string) => VERFAHREN.find(v => v.id === id)!.titel;
  it('Einzelfall im Fach Medizin: gefunden, Zustand „nein“; bei Bildung: „ja“', () => {
    const t = titel('einzelfall');
    expect(kartenSuche(t, 'medizin').find(k => k.id === 'einzelfall')).toEqual({ id: 'einzelfall', zustand: 'nein' });
    expect(kartenSuche(t, 'bildung').find(k => k.id === 'einzelfall')).toEqual({ id: 'einzelfall', zustand: 'ja' });
  });
  it('ohne Beachtung von Groß/klein; ein Verfahren in der eingeklappten Gruppe hat Zustand „weitere“', () => {
    expect(kartenSuche(titel('meta').toUpperCase(), 'bildung').find(k => k.id === 'meta')?.zustand).toBe('weitere');
  });
  it('Text ohne Treffer: leere Liste', () => { expect(kartenSuche('xyzxyzxyz', 'bildung')).toEqual([]); });
});

describe('Das Fach ändert NIE etwas am Rechnen (Falle 1)', () => {
  const alt = (s.einst as { fach?: string }).fach;
  const rechnen = () => {
    const spalten = ['a', 'b', 'c'], zeilen = [[1, 2, 5], [2, 4, 4], [3, 5, 6], [4, 4, 2], [5, 9, 3], [6, 7, 9], [7, 8, 1]];
    const reihe = Array.from({ length: 36 }, (_, i) => 10 + 0.3 * i + [2, -1, 0, 3, -2, 1][i % 6]!), gruppe = [[1, 2, 1.5, 8, 9, 8.5, 1.2, 8.8], [2, 1, 1.8, 9, 8, 9.5, 1.1, 9.2]], zz = zStandardisieren(gruppe).z;   // S-E: die Karten Zeitreihen und Cluster
    return JSON.stringify({ zr: [zeitTrend(reihe), zeitAcf(reihe, 6), zerlegung(reihe, 6, 'additiv')], cl: [clusterSilhouette(zz, [1, 1, 1, 2, 2, 2, 1, 2]), clusterNachGroesse([3, 3, 1, 1, 1, 2])], km: korrMatrix(spalten, zeilen, { methode: 'pearson', holm: true }), b: beschreibe([3, 5, 4, 6, 2, 7, 5, 4], [1, 2, 3, 1, 2, 1, 3, 2], 'haeufigkeit'),
      kl: klassenVorschau({ spalten: [{ name: 'x', bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} }], zeilen: [[1], [2], [2], [3], [4], [4], [4], [5], [6], [7], [8], [9], [10], [10], [12]] },
        { spalte: 'x', ziel: 'xk', art: 'quantil', k: 4 }) });
  };
  it('gleiche Eingaben, jedes Fach: gleiche Ausgabe (Kennzahlen, Korrelationsmatrix, Klassen, Zeitreihe, Cluster)', () => {
    (s.einst as { fach?: string }).fach = 'bildung'; const soll = rechnen();
    for (const f of ALLE) { (s.einst as { fach?: string }).fach = f; expect(rechnen(), `Fach ${f}`).toBe(soll); }
    (s.einst as { fach?: string }).fach = alt;
  });
  it('kein Rechenmodul liest das Fach: `einst.fach` kommt nur in fach.ts, sitzung.svelte.ts, Seiten, Hilfe und App vor - nie in lib/ (sonst), engine/, i18n/', () => {
    const wurzel = fileURLToPath(new URL('..', import.meta.url));
    const dateien = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap(f => f.isDirectory() ? dateien(join(d, f.name)) : /\.(ts|svelte)$/.test(f.name) && !/\.test\.ts$/.test(f.name) ? [join(d, f.name)] : []);
    // Pfade mit / vergleichen (unter Windows kommt \ vor)
    const rel = (p: string) => relative(wurzel, p).split(sep).join('/');
    const erlaubt = (p: string) => /^(lib\/fach\.ts|lib\/sitzung\.svelte\.ts|seiten\/|hilfe\/|dialogs\/|App\.svelte$|bausteine\/)/.test(rel(p));
    const treffer = dateien(wurzel).filter(p => !erlaubt(p) && /\b(einst|s\.einst)\.fach\b|\.fach\b\s*[=!]==?/.test(readFileSync(p, 'utf8'))).map(rel);
    expect(treffer, 'diese Dateien lesen das Fach, ohne dass es nur um die Kartenliste geht').toEqual([]);
  });
  it('Rechenwege, Voreinstellungen, Sätze hängen nicht an `faecher` in lib/verfahren.ts: die Syntax der Karten kommt ohne Fach aus', () => {
    const quelle = readFileSync(new URL('./verfahren.ts', import.meta.url), 'utf8');
    expect(/einst\.fach/.test(quelle), 'verfahren.ts liest einst.fach').toBe(false);
  });
});
