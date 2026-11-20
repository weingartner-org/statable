/**
 * „Mein Fachgebiet“: Der Schalter entscheidet NUR, welche Karten in der Kartenliste der Seite „Neue Auswertung“ stehen. Er ändert nie Rechenwege, Voreinstellungen oder Sätze
 * (Test: fach.test.ts) und kommt weder aus der Browsersprache noch aus einem Konto; er bleibt auf dem Gerät (Einstellungen).
 * ja = an Ort und Stelle · weitere = in der eingeklappten Gruppe „Weitere Verfahren“ · nein = nur über die Suche. Der Kern (neun Karten) ist in jedem Fach „ja“.
 * Bildung und Psychologie ist der Ist-Zustand (alle Karten außer den Fach-Karten Zeitreihen und Cluster, 14 an Ort und Stelle, 5 eingeklappt); „Alle Verfahren zeigen“ blendet nichts aus und lässt die eingeklappte Gruppe eingeklappt.
 * Optionen in Karten (zum Beispiel Ridge und Lasso) hängen nie am Fach: sie bleiben für alle unter „Weitere Wege“.
 * Quelle der Matrix: docs/fachblaetter/SPAETER-A-GRUNDLAGEN.md Abschnitt 4.4 (Entscheidung Opus 17.10.: wie vorgeschlagen).
 */
import { L, aktuelleSprache } from './sitzung.svelte';
import { suchwoerter, passt } from '../hilfe/suche';
import { VERFAHREN } from './verfahren';
import { FACH_IDS, fachAusSpeicher, type FachId } from './fachid';

export { fachAusSpeicher, type FachId };
export type Sichtbar = 'ja' | 'weitere' | 'nein';

export const FAECHER: { id: FachId }[] = FACH_IDS.map(id => ({ id }));

/** Name des Fachgebiets in der aktuellen Sprache. */
export function fachName(id: FachId): string {
  switch (id) {
    case 'bildung': return L('Bildung und Psychologie', 'Education and psychology');
    case 'medizin': return L('Medizin und Gesundheit', 'Medicine and health');
    case 'bio': return L('Biologie und Naturwissenschaften', 'Biology and natural sciences');
    case 'wirtschaft': return L('Wirtschaft und Sozialwissenschaften', 'Economics and social sciences');
    case 'technik': return L('Technik und Qualität', 'Engineering and quality');
    case 'informatik': return L('Informatik und Data Science', 'Computer science and data science');
    case 'alle': return L('Alle Verfahren zeigen', 'Show all methods');
  }
}

export const KERN_KARTEN = ['gruppen', 'praepost', 'zusammenhang', 'korrmatrix', 'vorhersage', 'verteilung', 'kreuz', 'skala', 'uebereinstimmung'];
/** Die Karten, die es heute gibt (Kennungen wie in lib/verfahren.ts). */
export const KARTEN_HEUTE = [...KERN_KARTEN, 'messwiederholung', 'faktor', 'mediation', 'moderation', 'mehrebenen', 'meta', 'kaplanmeier', 'einzelfall', 'faelle', 'kategorien', 'zeitreihen', 'cluster', 'diskriminanz', 'loglinear', 'manova', 'armut'];   // Kurs-Paket (Fachblatt KURSPAKET): in jedem Fach in der eingeklappten Gruppe „Weitere Verfahren“
/** Dazu die geplanten (Fachblatt Später: S-H, S-I): die Matrix kennt sie schon, damit die Zählung der Fächer stimmt, bevor sie da sind. `zeitreihen` und `cluster` (S-E) sind seit Welle S-E da. */
export const KARTEN_ALLE = [...KARTEN_HEUTE, 'qca', 'kurven', 'regelkarten', 'gaugerr', 'kalibrier'];

/** Je Karte sechs Zeichen für Bildung, Medizin, Bio, Wirtschaft, Technik, Informatik: j = ja, w = weitere, n = nein. */
const SECHS: FachId[] = ['bildung', 'medizin', 'bio', 'wirtschaft', 'technik', 'informatik'];
const ZEILEN: Record<string, string> = {
  messwiederholung: 'jjjnnn', faktor: 'jjnjnj', mediation: 'wwnjnn', moderation: 'wwnjnn', mehrebenen: 'wwwjnn', meta: 'wjwnnn', kaplanmeier: 'wjwwnn',
  einzelfall: 'jnnnnn', faelle: 'jnnnnn', kategorien: 'jnnnnn', qca: 'wnnnnn',
  diskriminanz: 'wwwwww', loglinear: 'wwwwww', manova: 'wwwwww', armut: 'wwwwww',
  zeitreihen: 'wwjjjj', cluster: 'wwjjwj',   /* Johannes 01.11.: Zeitreihen und Cluster nie ganz ausgeblendet, sondern eingeklappt unter „Weitere Verfahren“ */
   kurven: 'nnjnjn', regelkarten: 'nnnnjn', gaugerr: 'nnnnjn', kalibrier: 'nnnnjn'
};
const zeichen = (c: string): Sichtbar => (c === 'j' ? 'ja' : c === 'w' ? 'weitere' : 'nein');

export const FACH_MATRIX: Record<string, Record<FachId, Sichtbar>> = Object.fromEntries(KARTEN_ALLE.map(id => {
  const z = KERN_KARTEN.includes(id) ? 'jjjjjj' : ZEILEN[id]!;
  const je = Object.fromEntries(SECHS.map((f, i) => [f, zeichen(z[i]!)])) as Record<FachId, Sichtbar>;
  je.alle = je.bildung === 'weitere' ? 'weitere' : 'ja';   // „Alle zeigen“: nichts ausgeblendet; die eingeklappte Gruppe bleibt, wo sie bei Bildung/Psychologie eingeklappt ist
  return [id, je];
}));

/** Zustand einer Karte im Fach. Eine unbekannte Karte ist „ja“: durch ein Versehen verschwindet nichts. */
export function sichtbar(kartenId: string, fach: FachId): Sichtbar {
  return FACH_MATRIX[kartenId]?.[fach] ?? 'ja';
}
/** Karten, die in der Liste stehen (an Ort und Stelle oder eingeklappt), in der Reihenfolge von `ids`. */
export function sichtbareKarten(fach: FachId, ids: string[] = KARTEN_HEUTE): string[] { return ids.filter(i => sichtbar(i, fach) !== 'nein'); }
/** Karten, die nur über die Suche zu finden sind. */
export function ausgeblendet(fach: FachId, ids: string[] = KARTEN_HEUTE): string[] { return ids.filter(i => sichtbar(i, fach) === 'nein'); }

/* ---------- Suche ---------- */
const glatt = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
/** Ohne Leerzeichen, Bindestriche und Apostrophe: „t-test“, „ttest“ und „t test“ sind dieselbe Suche (Nachttest 24.10., englische Oberfläche). */
const dicht = (t: string) => t.replace(/[\s\-‐‑_'’.]/g, '');

/** Hilfe-Artikel, deren Verfahren in einer Karte steckt (Nachttest 24.10.: „partiell“ fand die Partialkorrelation nicht, die unter „Hängen zwei Dinge zusammen?“ sitzt). */
export const ARTIKEL_ZU_KARTE: Record<string, string> = {
  'wachstumskurvenmodell': 'messwiederholung', 'netzwerkanalyse': 'korrmatrix', 'latente-profile': 'cluster', 'latente-klassen': 'skala', 'paneldaten': 'vorhersage', 'cluster-robust': 'vorhersage', 'hausman-test': 'vorhersage', 'instrumentvariablen': 'vorhersage', 'differenz-in-differenzen': 'vorhersage', 'regressions-diskontinuitaet': 'vorhersage',
  'frage-partialkorrelation': 'zusammenhang', 'zweifaktorielle-varianzanalyse': 'gruppen', 'kovarianzanalyse': 'gruppen', 'frage-posthoc': 'gruppen', 'aequivalenztest-tost': 'gruppen',
  'rangtests-weitere': 'gruppen', 'roc-kurve': 'gruppen', 'friedman-test': 'messwiederholung', 'mcnemar-test-cochran-q': 'praepost', 'reliable-change-index': 'praepost',
  'hierarchische-regression': 'vorhersage', 'quantilregression': 'vorhersage', 'strafregression': 'vorhersage', 'ordinale-regression': 'vorhersage', 'multinomiale-regression': 'vorhersage',
  'zaehldaten-regression': 'vorhersage', 'normalverteilung-pruefen': 'verteilung', 'anpassungstests': 'verteilung', 'vielfalt-diversitaet': 'verteilung', 'risikomasse': 'kreuz',
  'zusammenhangsmasse': 'kreuz', 'mantel-haenszel': 'kreuz', 'intercoder': 'uebereinstimmung', 'messgenauigkeit-typical-error': 'uebereinstimmung',
  /* Prüfung 01.11.: Zusatzblöcke, deren Fachbegriff die Kartensuche nicht fand */
  'cox-regression': 'kaplanmeier', 'sterbetafel': 'kaplanmeier', 'aft-modell': 'kaplanmeier', 'cox-zeitabhaengig': 'kaplanmeier', 'cox-frailty': 'kaplanmeier',
  'zeitreihe-prognose': 'zeitreihen', 'zeitreihe-granger': 'zeitreihen', 'zeitreihe-massnahme': 'zeitreihen', 'zeitreihe-kreuzkorrelation': 'zeitreihen',
  'probit-regression': 'vorhersage', 'gewichtete-regression': 'vorhersage', 'nichtlineare-regression': 'vorhersage', 'methodenvergleich': 'uebereinstimmung',
  'zufallsverfahren-permutation': 'gruppen', 'auffaellige-werte-zeitreihe': 'zeitreihen', 'bayes-faktor': 'gruppen', 'frage-mehrfachantworten': 'verteilung',
  /* Artikel zu den Zusatzbausteinen (artikel-zusatz.ts) */
  'testhalbierung': 'skala', 'retest-reliabilitaet': 'uebereinstimmung', 'rasch-modell': 'skala', 'zwei-pl-modell': 'skala', 'stufenmodell-grm': 'skala', 'faire-aufgaben-dif': 'skala', 'karte-der-fragen-mds': 'skala', 'messinvarianz': 'skala',
  'konfirmatorische-faktorenanalyse-omega': 'skala', 'pfadmodell-sem': 'vorhersage', 'qca-konfigurationen': 'faelle', 'regelkarten': 'verteilung', 'messsystemanalyse-gauge-rr': 'gruppen',
  'kalibriergerade-nachweisgrenze': 'zusammenhang', 'kurvenanpassung': 'zusammenhang', 'matching-propensity-score': 'gruppen', 'robuste-standardfehler': 'vorhersage', 'entscheidungsbaum': 'vorhersage', 'ml-knn': 'vorhersage',
  'korrespondenzanalyse': 'kreuz', 'bevoelkerungspyramide': 'kreuz', 'fehlende-werte-little-imputation': 'verteilung', 'referenzbereich': 'verteilung', 'ausreisser-tests': 'verteilung'
};
/** Die Stichwörter und Titel der Hilfe-Artikel je Karte (`frage-<karte>` und ARTIKEL_ZU_KARTE), für die Suche über den Karten. Die Artikel kommen in der aktuellen Sprache. */
export function kartenStichwoerter(artikel: { id: string; titel: string; stichwoerter: string[] }[]): Record<string, string> {
  const aus: Record<string, string> = {}, ids = new Set(VERFAHREN.map(v => v.id));
  for (const a of artikel) {
    const k = a.id.startsWith('frage-') && ids.has(a.id.slice(6)) ? a.id.slice(6) : ARTIKEL_ZU_KARTE[a.id];
    if (k) aus[k] = `${aus[k] ?? ''} ${a.titel} ${a.stichwoerter.join(' ')}`;
  }
  return aus;
}
/** Karten, deren Titel, Zusatz oder Beispiel den Text enthalten (Sprache und Schreibweise egal), auch ausgeblendete, mit ihrem Zustand im Fach. `zusatz`: Stichwörter aus der Hilfe (kartenStichwoerter), sobald geladen. */
export function kartenSuche(text: string, fach: FachId, zusatz: Record<string, string> = {}): { id: string; zustand: Sichtbar }[] {
  const q = glatt(text.trim());
  if (!q) return [];
  const qd = dicht(q);
  const feld = (v: (typeof VERFAHREN)[number]) => ({ kopf: glatt(`${v.titel} ${v.zusatz ?? ''}`), beispiel: glatt(v.beispiel), hilfe: glatt(zusatz[v.id] ?? '') });
  const trifft = (t: string) => t.includes(q) || (qd.length > 2 && dicht(t).includes(qd));
  // Treffer im Titel oder in der Beschreibung der Karte stehen vor Treffern im Beispiel und vor denen, die nur über die Stichwörter der Hilfe kommen
  const rang = (v: (typeof VERFAHREN)[number]) => { const f = feld(v); return trifft(f.kopf) ? 3 : trifft(f.beispiel) ? 2 : trifft(f.hilfe) ? 1 : 0; };
  const genau = VERFAHREN.map((v, i) => ({ v, i, r: rang(v) })).filter(x => x.r > 0).sort((a, b) => b.r - a.r || a.i - b.i).map(x => x.v);
  if (genau.length) return genau.map(v => ({ id: v.id, zustand: sichtbar(v.id, fach) }));
  // Nichts gefunden: Wort für Wort mit Tippfehler-Toleranz (wie in der Hilfe), bei ganzen Fragen reicht die Hälfte der Wörter
  const qs = suchwoerter(text, aktuelleSprache()).filter(w => w.length >= 3);
  if (!qs.length) return [];
  const aus = VERFAHREN.map((v, i) => {
    const f = feld(v), ws = `${f.kopf} ${f.beispiel} ${f.hilfe}`.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const n = qs.filter(w => ws.some(x => passt(w, x) > 0)).length;
    return { v, i, n };
  }).filter(x => x.n === qs.length || (qs.length >= 3 && x.n >= 2 && x.n * 2 >= qs.length));
  return aus.sort((a, b) => b.n - a.n || a.i - b.i).map(x => ({ id: x.v.id, zustand: sichtbar(x.v.id, fach) }));
}

/* ---------- Kartenliste ---------- */
/** Die Heimat der Karten, die bei Bildung/Psychologie in „Weitere Verfahren“ stehen, wenn ein Fach sie an Ort und Stelle zeigt. */
export const HEIMAT: Record<string, string> = { mediation: 'zusammenhang', moderation: 'zusammenhang', mehrebenen: 'zusammenhang', meta: 'unterschied', kaplanmeier: 'unterschied' };

export interface KartenGruppe { id: string; titel: string; ids: string[]; zu?: boolean }
/**
 * Die feste Gruppierung nach dem Fach: ausgeblendete Karten fallen weg, eingeklappte stehen in „Weitere Verfahren“, an Ort und Stelle gezeigte Karten wandern aus „Weitere Verfahren“ in ihre Heimatgruppe.
 * Die Gruppen selbst und die Reihenfolge bleiben; eine leere Gruppe entfällt.
 */
export function kartenGruppen(gruppen: KartenGruppe[], fach: FachId): KartenGruppe[] {
  const weitere = gruppen.find(g => g.zu), alle = gruppen.flatMap(g => g.ids);
  const zustand = (id: string) => sichtbar(id, fach);
  const aus = gruppen.map(g => {
    if (g.zu) return { ...g, ids: [] as string[] };
    const eigene = g.ids.filter(i => zustand(i) === 'ja');
    const zugezogen = alle.filter(i => weitere?.ids.includes(i) && HEIMAT[i] === g.id && zustand(i) === 'ja');
    return { ...g, ids: [...eigene, ...zugezogen] };
  });
  const rest = alle.filter(i => zustand(i) === 'weitere');
  const fertig = aus.map(g => (g.zu ? { ...g, ids: rest } : g)).filter(g => g.ids.length > 0);
  return fach === 'bildung' ? psychologieVorne(fertig) : fertig;
}

/* ---------- Psychologie vorne (Fachblatt Stufe 5, 5.3) ---------- */
/** Karten, in denen die Psychologie-Funktionen stecken: Reliabilität, Faktorenanalyse, CFA und Omega, Rasch/IRT, Messinvarianz (skala, faktor) · Messwiederholung · Mediation und Moderation · Mehrebenen · Reliable Change Index (praepost) · Äquivalenztest (gruppen). */
export const PSYCHOLOGIE_KARTEN = ['skala', 'faktor', 'messwiederholung', 'mediation', 'moderation', 'mehrebenen', 'praepost', 'gruppen'];
/** Beispiele, die bei Bildung und Psychologie zuerst stehen. */
export const PSYCHOLOGIE_BEISPIELE = ['anker-effekt', 'aggression', 'woerter-erkennen', 'schlafentzug'];
const rangVon = (liste: string[], id: string) => { const i = liste.indexOf(id); return i < 0 ? liste.length : i; };
/** Nur Reihenfolge: innerhalb jeder Gruppe stehen die Psychologie-Karten vorn, Gruppen mit ihnen vor den anderen; „Weitere Verfahren“ bleibt die letzte Gruppe. Nichts kommt hinzu oder fällt weg. */
function psychologieVorne(gruppen: KartenGruppe[]): KartenGruppe[] {
  const r = (i: string) => rangVon(PSYCHOLOGIE_KARTEN, i);
  const geordnet = gruppen.map(g => ({ ...g, ids: [...g.ids].sort((a, b) => r(a) - r(b)) }));   // Array.sort ist stabil: der Rest behält seine Reihenfolge
  const best = (g: KartenGruppe) => Math.min(...g.ids.map(r));
  const feste = geordnet.filter(g => !g.zu), zu = geordnet.filter(g => g.zu);
  return [...feste.map((g, i) => ({ g, i })).sort((a, b) => best(a.g) - best(b.g) || a.i - b.i).map(x => x.g), ...zu];
}
/** Die Beispiele in der Reihenfolge des Fachs: bei Bildung und Psychologie die vier Psychologie-Beispiele zuerst, sonst unverändert. */
export function beispielReihenfolge<T extends { id: string }>(liste: T[], fach: FachId): T[] {
  if (fach !== 'bildung') return liste;
  return liste.map((b, i) => ({ b, i })).sort((x, y) => rangVon(PSYCHOLOGIE_BEISPIELE, x.b.id) - rangVon(PSYCHOLOGIE_BEISPIELE, y.b.id) || x.i - y.i).map(x => x.b);
}

/* ---------- Die einmalige Frage ---------- */
const SCHLUESSEL = 'statable-fachfrage';
/** Wurde die Frage „Studierst du etwas anderes?“ schon beantwortet oder weggeklickt? Nicht blockierend, einmal. */
export function fachFrageErledigt(): boolean { try { return localStorage.getItem(SCHLUESSEL) === '1'; } catch { return true; } }
export function fachFrageMerken(): void { try { localStorage.setItem(SCHLUESSEL, '1'); } catch { /* ohne Speicher fragt Statable bei jedem Besuch; das ist hinnehmbar */ } }
