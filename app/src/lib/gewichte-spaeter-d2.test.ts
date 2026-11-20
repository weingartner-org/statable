import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-d2-erwartet.json';
import VORHER from './testdaten/spaeter-d2-gewichtstellen-vorher.json';
import { gewichtIds, gewichtStatus, schwersterStatus, sperrSatz, gewichtSatz, gewichtFuss, gewichtBerichtSatz, abdruckMitRechenweg, klumpenFrage, klumpenSperrSatz, type Gewicht, type GewichtAbdruck } from './gewichte';
import { gewichtStellenIds, gewichtStellen, stellenTitel, umfrageRechenweg, umfrageEntfaellt, verwendetGewicht, BESCHREIBEND } from './gewichtkarten';
import { s } from './sitzung.svelte';

/* ===== Welle S-D2: Fallgewicht bei Umfragegewicht mit der Pflichtangabe „einzeln gezogen“ (Fachblatt Abschnitt 0.5, 0.6, 8 und „Entscheidungen Opus (17.10.)“ 1, 3, 4, 9) =====
 * ROTE TESTS des Sollwert-Prüfers (Bauer A1: Status und Pflichtangabe; A2/B: die Stellen ihrer Karten). Soll: scripts/spaeter-d2-erwartet.R → testdaten/spaeter-d2-erwartet.json (gewichte);
 * Regressionsbasis „heutige Karten unverändert“: testdaten/spaeter-d2-gewichtstellen-vorher.json (Momentaufnahme der Stellenlisten VOR dieser Welle; nicht ändern).
 *
 * SCHNITTSTELLE (lib/gewichte.ts und lib/gewichtkarten.ts; jede Änderung nur additiv, alles Bisherige bleibt):
 *   interface Gewicht { …; klumpenfrei?: boolean }          Antwort auf die Pflichtfrage „Wurden die Personen einzeln gezogen …?“ (Ja = true). undefined (alte Projekte) und false zählen als „Nein“.
 *   type GewichtStatus + 'design'                            Reihenfolge in schwersterStatus: unberuehrt < rechnen < beschreibend < design < hinweis < sperren
 *   gewichtStatus(id, art, klumpenfrei?)  /  schwersterStatus(ids, art, klumpenfrei?)       Dritte Angabe nur bei art 'umfrage' wirksam; ohne sie gilt „Nein“ (= heutiges Verhalten)
 *   KartenWahl + klumpenfrei?: boolean · mittelTest?: boolean („Test gegen einen Wert“ angeschaltet; erzeugt die bisher verwaiste Stelle 'verteilung:mittel-ki-test' bei BEIDEN Arten) · bloecke?: boolean (hierarchische Regression mit Blöcken)
 *   gewichtStellenIds / gewichtStellen(k) berücksichtigen k.klumpenfrei (nur bei art 'umfrage')
 *   umfrageEntfaellt(k) → Stellen, die bei Umfragegewicht mit Pflichtangabe nicht gerechnet werden, aber das Blatt NICHT sperren (nur 'vorhersage:logistik-roc': ROC und AUC entfallen mit Satz)
 *   umfrageRechenweg(k) → 'survey' | 'beschreibend' | null     survey: art umfrage + klumpenfrei und mindestens eine Stelle 'design', beschreibend: art umfrage sonst mit beschreibender Stelle, sonst null
 *   abdruckMitRechenweg(abdruck, status) → GewichtAbdruck + rechenweg/surveyVersion        'design' → rechenweg 'survey', surveyVersion '4.5'; 'beschreibend' → rechenweg 'beschreibend'; sonst unverändert (Häufigkeit: keine neuen Felder)
 *   klumpenFrage() → { frage, ja, nein }                    der Wortlaut der Pflichtfrage (Entscheidung Opus 1)
 *   klumpenSperrSatz() → Satz „Wer mit Klumpen oder Schichten gezogen hat, gibt den Stichprobenplan an …“
 *   sperrSatz(id, g, titel): Umfrage ohne Haken bei einer Stelle, die mit Haken 'design' wäre → klumpenSperrSatz; Umfrage MIT Haken bei einer Stelle, die gesperrt bleibt → neuer Sperrsatz (0.6) statt „Tests und Intervalle brauchen den Stichprobenplan“
 *   gewichtSatz / gewichtFuss: bei art 'umfrage' mit klumpenfrei der Zusatz „Personen einzeln gezogen“;  gewichtBerichtSatz: Abdruck mit rechenweg 'survey' → kein Satz „Tests und Intervalle fehlen“
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const G = (ERW as unknown as Z).gewichte as { neue_schluessel: Z[]; geaendert: Z[]; unveraendert: Z[] };
const ALLE = [...G.neue_schluessel, ...G.geaendert, ...G.unveraendert];
const gH: Gewicht = { spalte: 'w', art: 'haeufigkeit' }, gUnklar: Gewicht = { spalte: 'pw', art: 'umfrage' };
const gNein = { spalte: 'pw', art: 'umfrage', klumpenfrei: false } as Gewicht, gJa = { spalte: 'pw', art: 'umfrage', klumpenfrei: true } as Gewicht;
const DESIGN_STELLEN = ['verteilung:kennwerte', 'verteilung:mittel-ki-test', 'verteilung:anteil-ki', 'kreuz:test', 'gruppen:mittelwerte', 'gruppen:test', 'vorhersage:linear', 'vorhersage:logistik'];
const st = (id: string, art: 'haeufigkeit' | 'umfrage', k?: boolean) => (gewichtStatus as (a: string, b: string, c?: boolean) => string)(id, art, k);
const sw = (ids: string[], art: 'haeufigkeit' | 'umfrage', k?: boolean) => (schwersterStatus as (a: string[], b: string, c?: boolean) => string)(ids, art, k);
const ids = (o: Z) => gewichtStellenIds(o as any);

describe('Sperrtabelle: Status je Stelle mit und ohne Pflichtangabe (Fachblatt 0.5)', () => {
  for (const z of ALLE) it(`${z.id}: Häufigkeit ${z.h} · Umfrage ohne Haken ${z.u_nein} · mit Haken ${z.u_ja}`, () => {
    expect(gewichtIds(), `${z.id} fehlt in TABELLE`).toContain(z.id);
    expect(st(z.id, 'haeufigkeit')).toBe(z.h); expect(st(z.id, 'haeufigkeit', true), 'Häufigkeitsgewicht kennt die Pflichtangabe nicht').toBe(z.h);
    expect(st(z.id, 'umfrage')).toBe(z.u_nein); expect(st(z.id, 'umfrage', false)).toBe(z.u_nein); expect(st(z.id, 'umfrage', true)).toBe(z.u_ja);
  });
  // Später S-F2 (E): die Balken „Mittelwert nach Gruppe“ (diagramm:mittelgruppen) sind eine neunte Stelle mit „design“, gleich gruppen:mittelwerte (lib/balken.test.ts, gewichte-spaeter-f2.test.ts)
  const SPAETER_F2_DESIGN = ['diagramm:mittelgruppen'];
  it('genau diese acht Stellen sind mit Haken „design“ (sechs geänderte, zwei neue: verteilung:anteil-ki, vorhersage:logistik) - dazu seit S-F2 diagramm:mittelgruppen', () => {
    const mitDesign = gewichtIds().filter(i => st(i, 'umfrage', true) === 'design').sort();
    expect(mitDesign).toEqual([...DESIGN_STELLEN, ...SPAETER_F2_DESIGN].sort());
  });
  it('nichts anderes ändert sich durch den Haken (alle übrigen Stellen: mit = ohne)', () => {
    const genannt = new Set([...ALLE.map(z => z.id as string), ...SPAETER_F2_DESIGN]);
    for (const i of gewichtIds()) if (!genannt.has(i)) expect(st(i, 'umfrage', true), i).toBe(st(i, 'umfrage', false));
  });
  it('mit Haken gibt es keine beschreibende Stelle mehr bei den vier Karten mit Rechenweg - aber vielfalt und Prozente bleiben beschreibend', () => {
    expect(st('verteilung:vielfalt', 'umfrage', true)).toBe('beschreibend'); expect(st('kreuz:haeufigkeit-prozent', 'umfrage', true)).toBe('beschreibend');
    expect(st('tabelle:zusammenstellen', 'umfrage', true)).toBe('beschreibend');   // Entscheidung Opus 10: keine SE in der Tabelle
  });
  it('Reihenfolge: design steht zwischen beschreibend und hinweis', () => {
    expect(sw(['verteilung:vielfalt'], 'umfrage', true)).toBe('beschreibend');
    expect(sw(['verteilung:vielfalt', 'verteilung:kennwerte'], 'umfrage', true)).toBe('design');
    expect(sw(['verteilung:kennwerte', 'ausreisser:alle'], 'umfrage', true)).toBe('hinweis');
    expect(sw(['verteilung:kennwerte', 'kreuz:exakt'], 'umfrage', true)).toBe('sperren');
    expect(sw(['kreuz:test', 'kreuz:haeufigkeit-prozent'], 'umfrage', true)).toBe('design');
    expect(sw(['kreuz:haeufigkeit-prozent'], 'haeufigkeit', true)).toBe('rechnen');
  });
  it('ohne Haken verhalten sich dieselben Stellen wie heute (P31): beschreibend bzw. gesperrt', () => {
    expect(sw(['verteilung:kennwerte', 'verteilung:vielfalt'], 'umfrage')).toBe('beschreibend'); expect(sw(['verteilung:kennwerte', 'verteilung:vielfalt'], 'umfrage', false)).toBe('beschreibend');
    expect(sw(['kreuz:test'], 'umfrage')).toBe('sperren'); expect(sw(['gruppen:test'], 'umfrage', false)).toBe('sperren'); expect(sw(['vorhersage:linear'], 'umfrage')).toBe('sperren'); expect(sw(['vorhersage:logistik'], 'umfrage')).toBe('sperren');
  });
});

describe('Karten nennen ihre Stellen (mit Haken)', () => {
  it('Verteilung: Kennwerte, Anteil mit Intervall, Vielfalt; „Test gegen einen Wert“ nur, wenn angeschaltet', () => {
    const b = ids({ verfahren: 'verteilung', art: 'umfrage', klumpenfrei: true });
    expect(b).toContain('verteilung:kennwerte'); expect(b).toContain('verteilung:anteil-ki'); expect(b).toContain('verteilung:vielfalt'); expect(b).not.toContain('verteilung:mittel-ki-test');
    expect(ids({ verfahren: 'verteilung', art: 'umfrage', klumpenfrei: true, mittelTest: true })).toContain('verteilung:mittel-ki-test');
    expect(sw(b, 'umfrage', true)).toBe('design'); expect(sw(ids({ verfahren: 'verteilung', art: 'umfrage', klumpenfrei: true, referenz: true }), 'umfrage', true)).toBe('sperren');
  });
  it('„Test gegen einen Wert“ erzeugt die bisher verwaiste Stelle auch bei Häufigkeit (rechnen) und ohne Haken (sperren)', () => {
    expect(ids({ verfahren: 'verteilung', art: 'haeufigkeit', mittelTest: true })).toContain('verteilung:mittel-ki-test');
    expect(sw(ids({ verfahren: 'verteilung', art: 'haeufigkeit', mittelTest: true }), 'haeufigkeit')).toBe('rechnen');
    expect(ids({ verfahren: 'verteilung', art: 'umfrage', mittelTest: true })).toContain('verteilung:mittel-ki-test');
    expect(sw(ids({ verfahren: 'verteilung', art: 'umfrage', mittelTest: true }), 'umfrage')).toBe('sperren');
  });
  it('Kreuztabelle: der Test kommt dazu, Maße/Fisher/Risiko/Schichtung bleiben gesperrt', () => {
    const b = ids({ verfahren: 'kreuz', art: 'umfrage', klumpenfrei: true }); expect(b).toContain('kreuz:test'); expect(b).toContain('kreuz:haeufigkeit-prozent'); expect(sw(b, 'umfrage', true)).toBe('design');
    expect(sw(ids({ verfahren: 'kreuz', art: 'umfrage', klumpenfrei: true, masse: true }), 'umfrage', true)).toBe('sperren'); expect(sw(ids({ verfahren: 'kreuz', art: 'umfrage', klumpenfrei: true, schicht: true }), 'umfrage', true)).toBe('sperren');
  });
  it('Gruppenvergleich: Mittelwerte und Test; Äquivalenz, Rangtests, Zufallsverfahren bleiben gesperrt; Post-hoc gibt es nicht', () => {
    const b = ids({ verfahren: 'gruppen', art: 'umfrage', klumpenfrei: true }); expect(b).toEqual(expect.arrayContaining(['gruppen:mittelwerte', 'gruppen:test'])); expect(b).not.toContain('gruppen:posthoc-effekt'); expect(sw(b, 'umfrage', true)).toBe('design');
    for (const o of [{ aequi: true }, { rangWeitere: true }, { zufall: true }]) expect(sw(ids({ verfahren: 'gruppen', art: 'umfrage', klumpenfrei: true, ...o }), 'umfrage', true), JSON.stringify(o)).toBe('sperren');
  });
  it('Regression: einfaches Modell wird design; Blöcke/Kovarianzanalyse/zweifaktorielle Varianzanalyse bleiben gesperrt (eigene Stelle)', () => {
    expect(ids({ verfahren: 'vorhersage', art: 'umfrage', klumpenfrei: true })).toEqual(['vorhersage:linear']);
    expect(ids({ verfahren: 'vorhersage', art: 'umfrage', klumpenfrei: true, bloecke: true })).toEqual(['vorhersage:linear-block']);
    expect(ids({ verfahren: 'gruppen', art: 'umfrage', klumpenfrei: true, gruppen2: true })).toEqual(['vorhersage:linear-block']);
    expect(sw(ids({ verfahren: 'vorhersage', art: 'umfrage', klumpenfrei: true, bloecke: true }), 'umfrage', true)).toBe('sperren');
    expect(sw(ids({ verfahren: 'vorhersage', art: 'umfrage', klumpenfrei: true, zufall: true }), 'umfrage', true)).toBe('sperren');
    expect(sw(ids({ verfahren: 'vorhersage', art: 'umfrage', klumpenfrei: true, katModell: true }), 'umfrage', true)).toBe('sperren');
  });
  it('Logistische Regression: design, ROC/AUC entfallen mit Satz und sperren das Blatt nicht', () => {
    const k = { verfahren: 'vorhersage', art: 'umfrage', klumpenfrei: true, logistik: true };
    expect(ids(k)).toEqual(['vorhersage:logistik']); expect(sw(ids(k), 'umfrage', true)).toBe('design'); expect(umfrageEntfaellt(k as any)).toEqual(['vorhersage:logistik-roc']);
    expect(st('vorhersage:logistik-roc', 'umfrage', true)).toBe('sperren');
  });
  it('Häufigkeitsgewicht und Umfrage ohne Haken: logistische Regression bleibt wie heute (ROC-Stelle, gesperrt)', () => {
    for (const k of [{ art: 'haeufigkeit' }, { art: 'umfrage' }, { art: 'umfrage', klumpenfrei: false }]) { const w = { verfahren: 'vorhersage', logistik: true, ...k }; expect(ids(w)).toEqual(['vorhersage:logistik-roc']); expect(umfrageEntfaellt(w as any)).toEqual([]); }
  });
  it('gewichtStellen trägt den Status mit Haken', () => {
    const l = gewichtStellen({ verfahren: 'kreuz', art: 'umfrage', klumpenfrei: true } as any), t = l.find(x => x.id === 'kreuz:test')!; expect(t.status).toBe('design');
    expect(gewichtStellen({ verfahren: 'kreuz', art: 'umfrage' }).some(x => x.status === 'design')).toBe(false);
  });
  it('Rechenweg der Karte: survey / beschreibend / nichts', () => {
    expect(umfrageRechenweg({ verfahren: 'verteilung', art: 'umfrage', klumpenfrei: true } as any)).toBe('survey');
    expect(umfrageRechenweg({ verfahren: 'kreuz', art: 'umfrage', klumpenfrei: true } as any)).toBe('survey'); expect(umfrageRechenweg({ verfahren: 'gruppen', art: 'umfrage', klumpenfrei: true } as any)).toBe('survey');
    expect(umfrageRechenweg({ verfahren: 'vorhersage', art: 'umfrage', klumpenfrei: true } as any)).toBe('survey');
    expect(umfrageRechenweg({ verfahren: 'zusammenhang', art: 'umfrage', klumpenfrei: true } as any)).toBe('beschreibend');
    expect(umfrageRechenweg({ verfahren: 'verteilung', art: 'umfrage' })).toBe('beschreibend'); expect(umfrageRechenweg({ verfahren: 'verteilung', art: 'umfrage', klumpenfrei: false } as any)).toBe('beschreibend');
    expect(umfrageRechenweg({ verfahren: 'verteilung', art: 'haeufigkeit' })).toBeNull(); expect(umfrageRechenweg({ verfahren: 'meta', art: 'umfrage', klumpenfrei: true } as any)).toBeNull();
  });
  it('Titel der neuen Stellen sind eigene Namen (nicht „Dieses Verfahren“)', () => {
    for (const i of ['verteilung:anteil-ki', 'verteilung:mittel-ki-test', 'vorhersage:linear-block', 'vorhersage:logistik']) expect(stellenTitel(i), i).not.toBe('Dieses Verfahren');
    expect(stellenTitel('vorhersage:logistik-roc')).toBeTruthy();
  });
});

describe('Heutige Karten bleiben unverändert (P32, P33: Regressionstest gegen die Momentaufnahme)', () => {
  const V = VORHER as unknown as { faelle: { v: string; art: 'haeufigkeit' | 'umfrage'; opt: string; ids: string[]; status: string[] }[]; optionen: Record<string, object> };
  const erwartet = (z: { v: string; ids: string[] }) => z.ids.map(i => (z.v === 'gruppen' && i === 'vorhersage:linear' ? 'vorhersage:linear-block' : i));   // einzige gewollte Änderung: gruppen2 → eigene Stelle
  it('die Momentaufnahme ist groß genug', () => { expect(V.faelle.length).toBeGreaterThan(500); });
  for (const art of ['haeufigkeit', 'umfrage'] as const) for (const v of [...new Set(V.faelle.map(f => f.v))]) {
    it(`${art} · ${v}: Stellen und Status wie vorher, in allen ${Object.keys(V.optionen).length} Optionsstufen (Umfrage ohne Haken: undefined und false)`, () => {
      for (const z of V.faelle.filter(f => f.art === art && f.v === v)) {
        const o = V.optionen[z.opt]!;
        for (const k of art === 'umfrage' ? [undefined, false] : [undefined]) {
          const jetzt = ids({ verfahren: z.v, art, ...o, ...(k === undefined ? {} : { klumpenfrei: k }) });
          expect(jetzt, `${z.opt}`).toEqual(erwartet(z)); expect(jetzt.map(i => st(i, art, k)), `${z.opt}`).toEqual(z.status);
        }
      }
    });
  }
  it('Häufigkeitsgewicht ignoriert den Haken auch dann, wenn er gesetzt ist', () => {
    for (const z of V.faelle.filter(f => f.art === 'haeufigkeit').slice(0, 80)) expect(ids({ verfahren: z.v, art: 'haeufigkeit', ...V.optionen[z.opt]!, klumpenfrei: true })).toEqual(erwartet(z));
  });
  it('BESCHREIBEND und verwendetGewicht bleiben', () => { expect([...BESCHREIBEND]).toEqual(['verteilung', 'kreuz', 'gruppen', 'zusammenhang']); expect(verwendetGewicht('meta', 'umfrage')).toBe(false); expect(verwendetGewicht('verteilung', 'umfrage')).toBe(true); });
});

describe('Sperrsätze (Fachblatt 0.6 und 8, Entscheidung Opus 1)', () => {
  const nurFallgewicht = (t: string) => expect(t.match(/(?<!Fall|Häufigkeits|Umfrage)[Gg]ewicht(?!et)/g), t).toBeNull();
  it('Pflichtangabe nicht gesetzt oder „Nein“ (P31): bei den Stellen, die mit Haken design wären, steht der Klumpensatz', () => {
    for (const i of DESIGN_STELLEN.filter(x => st(x, 'umfrage') === 'sperren')) for (const g of [gUnklar, gNein]) {
      const t = sperrSatz(i, g, 'Der Test')!; expect(t, `${i} ${g.klumpenfrei}`).toBeTruthy(); expect(t).toContain('Klumpen oder Schichten'); expect(t).toContain('Stichprobenplan'); expect(t).toMatch(/Standardfehler/); expect(t).toMatch(/zu klein/); nurFallgewicht(t);
    }
    expect(klumpenSperrSatz()).toBe('Wer mit Klumpen oder Schichten gezogen hat, gibt den Stichprobenplan an. Ohne ihn wären die Standardfehler zu klein.');
  });
  it('mit Haken: die design-Stellen sperren nicht (kein Satz)', () => { for (const i of DESIGN_STELLEN) expect(sperrSatz(i, gJa, 'Der Test'), i).toBeNull(); });
  it('mit Haken bleibt gesperrt (P37): neuer Wortlaut, keine alte Begründung', () => {
    for (const i of ['kreuz:exakt', 'gruppen:rang', 'gruppen:aequivalenz', 'vorhersage:linear-block', 'vorhersage:logistik-roc', 'korrmatrix:alle']) {
      const t = sperrSatz(i, gJa, 'Der Rangtest')!; expect(t, i).toContain('Der Rangtest'); expect(t).toContain('pw'); expect(t).toMatch(/designbasierte Rechnung/); expect(t).toMatch(/Rao-Scott/); expect(t).toMatch(/t-Test/); expect(t).toMatch(/lineare und logistische Regression/);
      expect(t).not.toContain('Tests und Intervalle brauchen dafür den Stichprobenplan'); nurFallgewicht(t);
    }
  });
  it('ohne Haken bleibt bei den Stellen, die auch mit Haken gesperrt sind, der bisherige Wortlaut', () => {
    for (const g of [gUnklar, gNein]) { const t = sperrSatz('kreuz:exakt', g, 'Der exakte Test')!; expect(t).toContain('Tests und Intervalle brauchen dafür den Stichprobenplan'); expect(t).toContain('Gewichtet zeigen kann Statable'); }
  });
  it('Häufigkeitsgewicht: Sätze wie bisher', () => {
    const t = sperrSatz('gruppen:rang', gH, 'Der Rangtest')!; expect(t).toContain('kann mit Fallgewichten noch nicht rechnen'); expect(sperrSatz('gruppen:test', gH, 'x')).toBeNull();
  });
  it('Du/Sie und Englisch', () => {
    s.einst.anrede = 'sie'; try { expect(sperrSatz('kreuz:exakt', gUnklar, 'Der Test')).toContain('Ihr Fallgewicht'); } finally { s.einst.anrede = 'du'; }
    s.einst.sprache = 'en'; try { const t = sperrSatz('kreuz:exakt', gJa, 'The exact test')!; expect(t).toContain('The exact test'); expect(t).toMatch(/design-based/); expect(t).not.toMatch(/Klumpen|Rechnung/); expect(klumpenSperrSatz()).toMatch(/cluster|strat/i); } finally { s.einst.sprache = 'de'; }
  });
  it('Pflichtfrage: Wortlaut mit Ja / „Nein oder weiß nicht“ (Entscheidung Opus 1)', () => {
    const f = klumpenFrage(); expect(f.frage).toContain('einzeln gezogen'); expect(f.frage).toMatch(/Klassen/); expect(f.frage).toMatch(/Haushalte/); expect(f.frage).toMatch(/Schichten/); expect(f.ja).toBe('Ja'); expect(f.nein).toBe('Nein oder weiß nicht');
    s.einst.sprache = 'en'; try { const e = klumpenFrage(); expect(e.frage).not.toContain('gezogen'); expect(e.ja).toBe('Yes'); expect(e.nein).toMatch(/No or/); } finally { s.einst.sprache = 'de'; }
  });
});

describe('Sätze mit Gewicht: die Antwort steht in jedem Satz („Gewicht w, Personen einzeln gezogen“)', () => {
  it('gewichtSatz und Fußzeile (Umfrage mit Haken) nennen „einzeln gezogen“; ohne Haken nicht', () => {
    expect(gewichtSatz(gJa, 9.1, 8)).toContain('einzeln gezogen'); expect(gewichtSatz(gNein, 9.1, 8)).not.toContain('einzeln gezogen'); expect(gewichtSatz(gUnklar, 9.1, 8)).not.toContain('einzeln gezogen');
    expect(gewichtFuss({ ...gJa, summe: 9.1, zeilen: 8 } as GewichtAbdruck)).toContain('einzeln gezogen'); expect(gewichtSatz(gJa, 9.1, 8)).toContain('pw');
  });
  it('Häufigkeit unverändert: gewichtet mit w als Häufigkeit (N = 15 aus 8 Zeilen)', () => { expect(gewichtSatz(gH, 15, 8)).toBe('gewichtet mit w als Häufigkeit (N = 15 aus 8 Zeilen)'); });
  it('Abdruck mit Rechenweg (P34): design → survey 4.5; beschreibend → beschreibend; Häufigkeit unberührt', () => {
    const a = { ...gJa, summe: 6194, zeilen: 200 } as GewichtAbdruck;
    const d = abdruckMitRechenweg(a, 'design') as Z; expect(d.rechenweg).toBe('survey'); expect(d.surveyVersion).toBe('4.5'); expect(d.spalte).toBe('pw'); expect(d.zeilen).toBe(200);
    const b = abdruckMitRechenweg({ ...gNein, summe: 6194, zeilen: 200 } as GewichtAbdruck, 'beschreibend') as Z; expect(b.rechenweg).toBe('beschreibend'); expect(b.surveyVersion).toBeUndefined();
    const h = abdruckMitRechenweg({ ...gH, summe: 15, zeilen: 8 } as GewichtAbdruck, 'rechnen') as Z; expect(h.rechenweg).toBeUndefined(); expect(h.surveyVersion).toBeUndefined();
    expect(JSON.parse(JSON.stringify(d)).rechenweg).toBe('survey');   // übersteht Speichern im Blatt
  });
  it('Berichtssatz: Blätter mit Rechenweg survey sagen nicht mehr „Tests und Intervalle fehlen“; alte Blätter (beschreibend) sagen es weiter', () => {
    const neu = gewichtBerichtSatz([{ art: 'gruppen', gewicht: abdruckMitRechenweg({ ...gJa, summe: 6194, zeilen: 200 } as GewichtAbdruck, 'design') }]);
    expect(neu).not.toMatch(/Tests und Intervalle fehlen/); expect(neu).toContain('pw'); expect(neu).toMatch(/einzeln gezogen/);
    const alt = gewichtBerichtSatz([{ art: 'gruppen', gewicht: abdruckMitRechenweg({ ...gNein, summe: 6194, zeilen: 200 } as GewichtAbdruck, 'beschreibend') }]); expect(alt).toMatch(/Tests und Intervalle fehlen/);
    const ohne = gewichtBerichtSatz([{ art: 'gruppen', gewicht: { ...gUnklar, summe: 6194, zeilen: 200 } as GewichtAbdruck }]); expect(ohne).toMatch(/Tests und Intervalle fehlen/);   // Blatt aus älterer Version: kein rechenweg
  });
});
