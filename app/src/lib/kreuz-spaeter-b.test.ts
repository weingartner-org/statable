import { beforeAll, describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-b-erwartet.json';
import { nodeEngine } from './testengine';
import { kreuz, saetzeKreuz, type Kreuz } from './ergebnis';
import { masseBefehl, rechneMasse, type MassArt } from './zusammenhangsmasse';
import { mitMasse, tabellenMasse, masseSaetze, gewaehlteMasse } from './massesaetze';
import { schichtVon, schichtSaetze, mitSchicht, tabellenSchicht, schichtForest, schichtWahlFuer, zaehleSchichten, type SchichtDaten } from './schichtsaetze';
import { gewichtStellenIds, gewichtStellen } from './gewichtkarten';
import { sperrSatz } from './gewichte';
import { berichtTabellen } from './berichtsatz';
import { s } from './sitzung.svelte';
import { risikoVon, mitRisiko } from './risikosaetze';

/* ===== Später, Welle S-B: Kreuztabelle-Maße und Mantel-Haenszel im Zusammenspiel (Engine → Ergebnis → Sätze, Tabellen, Bild, Sperren) ===== */
const K = (erwartet as any).kreuz.faelle, M = (erwartet as any).mantelhaenszel.faelle;
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
const csv = (z: number[][]) => new TextEncoder().encode(z.map(r => r.join(',')).join('\n') + '\n');
const zeilenAus = (zellen: number[][]) => zellen.flatMap((r, i) => r.map((n, j) => (n > 0 ? [i + 1, j + 1, n] : null)).filter((x): x is number[] => !!x));
/** Läuft die Kreuztabelle wie das Blatt (Zeilenvariable `grp`, gezählt `ant`) und die Maße; liefert das Kreuz-Ergebnis mit `masse`. */
function blatt(zellen: number[][], arten: MassArt[], extra: Partial<Kreuz> = {}): Kreuz {
  const d = { '/d.csv': csv(zeilenAus(zellen)) };
  const kopf = `DATA LIST FILE='/d.csv' LIST (',') /grp ant w (F8.0).\nWEIGHT BY w.\n`;
  const k = kreuz(e.run(kopf + 'CROSSTABS /TABLES=grp BY ant\n  /STATISTICS=CHISQ\n  /CELLS=COUNT ROW EXPECTED.', d));
  const mi = e.run(kopf + masseBefehl('grp', 'ant'), d);
  return { ...k, masse: { ergebnis: rechneMasse(mi, k.zaehlung!.tab, { zeile: 'grp', spalte: 'ant', zeileLabel: k.gruppen, spalteLabel: k.gezaehlt }), arten }, ...extra };
}
const kreuzOhne = (zellen: number[][]): Kreuz => {
  const d = { '/d.csv': csv(zeilenAus(zellen)) };
  return kreuz(e.run(`DATA LIST FILE='/d.csv' LIST (',') /grp ant w (F8.0).\nWEIGHT BY w.\nCROSSTABS /TABLES=grp BY ant\n  /STATISTICS=CHISQ\n  /CELLS=COUNT ROW EXPECTED.`, d));
};
const keinNaN = (t: string) => expect(t).not.toMatch(/NaN|undefined|Infinity/);
const zellenText = (t: ReturnType<typeof tabellenMasse>[number]) => [...t.cells.map(c => c.t), ...t.footnotes.map(c => c.t)];

describe('Stärke des Zusammenhangs: Sätze und Tabelle (Sprache de/du)', () => {
  it('3 × 3 ordinal: Tau-b mit Richtungssatz, KI und p aus dem einen Test; APA-Zeile; Marken', () => {
    s.einst.sprache = 'de'; s.einst.anrede = 'du';
    const k = blatt(K.drei_mal_drei.zellen, ['tauB']);
    const st = mitMasse(saetzeKreuz(k), k);
    expect(st.zusatz).toContain('Stärke des Zusammenhangs:');
    expect(st.zusatz).toMatch(/Je höher die Stufe von .*, desto höher meist die Stufe von/);
    expect(st.zusatz).toContain('Kendalls τb = ,41');
    expect(st.zusatz).toContain('95 %-KI [,27; ,56]');
    expect(st.zusatz).toContain('p < ,001');
    expect(st.apa).toContain('τb = ,41, 95 %-KI [,27; ,56], p < ,001');
    expect(st.apa).toContain('N = 112');
    expect(st.marken.some(m => m.text.startsWith('Kendalls τb = ,41'))).toBe(true);
    keinNaN(st.zusatz + st.apa);
  });
  it('Tabelle: eine Zeile „Test (ordinale Maße)“, Maße ohne eigenes T; Fußzeilen nennen KI und Test; kein NaN', () => {
    const k = blatt(K.drei_mal_drei.zellen, ['tauB', 'gamma', 'somersD']);
    const [t] = tabellenMasse(k)!;
    const text = zellenText(t!);
    expect(text.filter(x => x === 'Test (ordinale Maße)')).toHaveLength(1);
    expect(t!.rows).toBe(1 + 1 + 1 + 3 + 1);   // Kopf, Tau-b, Gamma, d (symmetrisch, zeile, spalte), Test
    expect(text.some(x => /Standardfehler bei der gefundenen Stärke/.test(x))).toBe(true) ;
    expect(text.some(x => /Karte Rangkorrelation/.test(x))).toBe(true);
    expect(text.some(x => /symmetrische Somers/.test(x))).toBe(true);
    keinNaN(text.join(' '));
  });
  it('UC: p aus G², Fußzeile sagt es; Lambda-Tabelle ohne NaN auch bei Lambda = 0', () => {
    const k = blatt(K.lambda_null.zellen, ['lambda', 'uc']);
    const [t] = tabellenMasse(k)!; const text = zellenText(t!);
    expect(text.some(x => /Likelihood-Quotienten-Test/.test(x))).toBe(true);
    keinNaN(text.join(' '));
    const st = mitMasse(saetzeKreuz(k), k);
    expect(st.zusatz).toContain('nicht, dass es keinen Zusammenhang gibt');
    expect(st.zusatz).toMatch(/V = ,35/);
    expect(st.zusatz).toMatch(/OR = 6,00/);
    expect(st.zusatz).toMatch(/Kennt man .*, verringern sich die Fehler beim Vorhersagen der häufigsten Antwort von .* um 30\s%/);
    keinNaN(st.zusatz);
  });
  it('perfekter Zusammenhang: Hinweis „keine Streuung“; weniger als zwei Zeilen: nur der Satz, keine Tabelle mit Zahlen', () => {
    const p = blatt(K.perfekt.zellen, ['tauB', 'gamma']);
    expect(mitMasse(saetzeKreuz(p), p).zusatz).toContain('nicht aussagekräftig');
    const z: Kreuz = { ...kreuzOhne(K.drei_mal_drei.zellen), masse: { ergebnis: rechneMasse([], K.eine_zeile.zellen, { zeile: 'grp', spalte: 'ant' }), arten: ['tauB'] } };
    const m = masseSaetze(z)!;
    expect(m.zusatz).toBe('Für ein Maß braucht es mindestens zwei Zeilen und zwei Spalten mit Fällen.');
    const [t] = tabellenMasse(z); expect(zellenText(t!).join(' ')).toContain('mindestens zwei Zeilen');
  });
  it('N = 20: Hinweis kleines n im Satz und in der Fußzeile; ohne gewählte Maße bleibt alles wie es war', () => {
    const k = blatt(K.n_zwanzig.zellen, ['gamma']);
    expect(mitMasse(saetzeKreuz(k), k).zusatz).toContain('Näherung für große Stichproben');
    const ohne = kreuzOhne(K.drei_mal_drei.zellen), st = saetzeKreuz(ohne);
    expect(mitMasse(st, ohne)).toEqual(st); expect(tabellenMasse(ohne)).toEqual([]);
    expect(gewaehlteMasse({ ...ohne, masse: { ergebnis: blatt(K.drei_mal_drei.zellen, []).masse!.ergebnis, arten: [] } })).toEqual([]);
  });
  it('Englisch: Sätze und Tabellenköpfe', () => {
    s.einst.sprache = 'en';
    try {
      const k = blatt(K.drei_mal_drei.zellen, ['tauB', 'lambda']);
      const st = mitMasse(saetzeKreuz(k), k);
      expect(st.zusatz).toContain('Strength of the association:');
      expect(st.zusatz).toMatch(/The higher the level of/);
      expect(st.zusatz).toContain('95% CI [.27, .56]');
      const [t] = tabellenMasse(k); expect(zellenText(t!)).toContain('Measure');
    } finally { s.einst.sprache = 'de'; }
  });
  it('Bericht: die Tabelle der Maße steht bei den Tabellen des Blatts, Risikomaße (2 × 2) bleiben daneben', () => {
    const k = blatt(K.zwei_mal_zwei.zellen, ['gamma'], { risiko: { gruppe: 'zeilen', gruppePos: 0, ereignisPos: 0, erwuenscht: true } });
    const b = { id: 'x', titel: 't', art: 'kreuz', l1: 'ant', l2: 'grp', l3: [], syntax: '', items: [], ergebnis: { typ: 'kreuz', e: k }, imBericht: true, notiz: '', zeit: 0 } as never;
    const labels = berichtTabellen(b).map(t => t.label);
    expect(labels).toContain('Association Measures'); expect(labels).toContain('Risk Measures');
    expect(risikoVon(k)).not.toBeNull(); expect(mitRisiko(saetzeKreuz(k), k).zusatz).toContain('Risikodifferenz');
  });
});

describe('Mantel-Haenszel im Blatt: Zählen, Sätze, Rollen, Tabellen, Bild', () => {
  const berkeley = M.berkeley.schichten as number[][][];
  /** Berkeley als Kreuztabelle „Geschlecht (Zeile) × Zulassung (Spalte)“ über alle Fächer, dazu die Schichten wie das Blatt sie zählt. */
  function berkeleyBlatt(korrektur = true): Kreuz {
    // berkeley[k] = [[Männer zugelassen, Männer abgelehnt], [Frauen zugelassen, Frauen abgelehnt]]
    const gesamt = [[0, 0], [0, 0]]; berkeley.forEach(t => t.forEach((r, i) => r.forEach((v, j) => { gesamt[i]![j]! += v; })));
    const k = kreuzOhne(gesamt);
    const zeilen: { z: string; s: string; k: string; w: number }[] = [];
    berkeley.forEach((t, f) => t.forEach((r, i) => r.forEach((v, j) => zeilen.push({ z: String(i + 1), s: String(j + 1), k: String(f), w: v }))));
    const stufen = zaehleSchichten(zeilen, ['1', '2'], ['1', '2'], berkeley.map((_, f) => String(f))).map((st, f) => ({ ...st, name: 'ABCDEF'[f]! }));
    const sd: SchichtDaten = { spalte: 'Fach', stufen, korrektur, wahl: { gruppe: 'zeilen', gruppePos: 0, ereignisPos: 0 } };   // Männer gegen Frauen, Ereignis = zugelassen (die Standardwahl der Risikomaße rät hier anders: sie kennt die Namen nicht)
    return { ...k, schicht: sd };
  }
  it('zaehleSchichten ordnet nach Zeilen, Spalten und Stufen und lässt Fälle ohne Gewicht weg', () => {
    const r = zaehleSchichten([{ z: 'a', s: 'x', k: '1', w: 2 }, { z: 'a', s: 'y', k: '2', w: 3 }, { z: 'b', s: 'x', k: '2', w: 0 }, { z: '?', s: 'x', k: '1', w: 5 }], ['a', 'b'], ['x', 'y'], ['1', '2']);
    expect(r.map(x => x.tab)).toEqual([[[2, 0], [0, 0]], [[0, 3], [0, 0]]]);
  });
  it('Berkeley: bereinigt OR 0,90 [0,77; 1,06], CMH 1,43 (p = ,232), Breslow-Day (Tarone) 18,83 mit Warnung; Zählung wie die Sollwerte', () => {
    s.einst.sprache = 'de'; s.einst.anrede = 'du';
    const k = berkeleyBlatt();
    const a = schichtVon(k)!;
    expect(a.zwei).toBe(true); expect(a.mh!.k).toBe(6); expect(a.mh!.n).toBe(4526);
    expect(a.tafeln).toEqual(berkeley);   // Standardrollen: Zeile 1 = erste Gruppe (Männer), Spalte 1 = erste Antwort (zugelassen)
    expect(Math.abs(a.mh!.orMH!.or - M.berkeley.or_mh.or)).toBeLessThan(1e-9);
    const st = mitSchicht(saetzeKreuz(k), k);
    expect(st.zusatz).toContain('Nach Aufteilung nach „Fach“'.replace(/„|“/g, m => (m === '„' ? '„' : '“')));
    expect(st.zusatz).toContain('Mantel-Haenszel χ²(1) = 1,43, p = ,232');
    expect(st.zusatz).toContain('gemeinsames OR = 0,90, 95 %-KI [0,77; 1,06]');
    expect(st.zusatz).toContain('mit Stetigkeitskorrektur');
    expect(st.zusatz).toContain('ergäbe sich ein Odds Ratio von 1,84');
    expect(st.zusatz).toContain('Breslow-Day-Test mit Tarone-Korrektur χ²(5) = 18,83, p = ,002');
    expect(st.zusatz).toContain('Schau dir die Schichten im Bild einzeln an');
    expect(st.apa).toContain('Mantel-Haenszel χ²(1) = 1,43, p = ,232; gemeinsames OR = 0,90, 95 %-KI [0,77; 1,06]; Breslow-Day-Test (Tarone) χ²(5) = 18,83, p = ,002');
    keinNaN(st.zusatz + st.apa);
    s.einst.anrede = 'sie'; try { expect(mitSchicht(saetzeKreuz(k), k).zusatz).toContain('Sehen Sie sich die Schichten im Bild einzeln an'); } finally { s.einst.anrede = 'du'; }
  });
  it('ohne Korrektur: 1,52 (p = ,217); Satz nennt die Korrektur nicht', () => {
    const k = berkeleyBlatt(false), st = schichtSaetze(k)!;
    expect(st.zusatz).toContain('Mantel-Haenszel χ²(1) = 1,52, p = ,217'); expect(st.zusatz).not.toContain('mit Stetigkeitskorrektur');
  });
  it('Rollen vertauscht (Frauen oben): OR_MH = 1/0,9047, Test gleich; Standardwahl kommt aus den Risikomaßen', () => {
    const k = berkeleyBlatt(), w = schichtWahlFuer(k, 'zeilen');
    const a = schichtVon({ ...k, schicht: { ...k.schicht!, wahl: { ...w, gruppePos: (1 - w.gruppePos) as 0 | 1 } } })!, b = schichtVon({ ...k, schicht: { ...k.schicht!, wahl: w } })!;
    expect(Math.abs(a.mh!.orMH!.or * b.mh!.orMH!.or - 1)).toBeLessThan(1e-9); expect(Math.abs(a.mh!.cmh.chi2! - b.mh!.cmh.chi2!)).toBeLessThan(1e-9);
  });
  it('Tabellen: je Schicht ein OR, unbereinigt und gemeinsam; Tests (CMH, Breslow-Day, Tarone); Nullzelle „nicht schätzbar“; Fußnote zur Korrektur', () => {
    const k = berkeleyBlatt(), [t1, t2] = tabellenSchicht(k)!;
    expect(t1!.rows).toBe(1 + 6 + 2); expect(t2!.rows).toBe(1 + 3);
    const text = [...t1!.cells, ...t1!.footnotes, ...t2!.cells, ...t2!.footnotes].map(c => c.t);
    expect(text).toContain('Gemeinsames OR (Mantel-Haenszel, bereinigt)'); expect(text).toContain('Breslow-Day mit Tarone-Korrektur'); expect(text.some(x => /SPSS zieht sie immer ab/.test(x))).toBe(true);
    keinNaN(text.join(' '));
    const nz = { ...kreuzOhne([[8, 2], [3, 7]]), schicht: { spalte: 'S', korrektur: true, stufen: M.nullzelle.schichten.map((tafel: number[][], i: number) => ({ name: 'S' + (i + 1), tab: tafel })) } as SchichtDaten };
    const [n1] = tabellenSchicht(nz); expect(n1!.cells.map(c => c.t)).toContain('nicht schätzbar');
  });
  it('Fußsatz B3 (SPSS-Vergleich): SPSS-„Cochran“ ist eine eigene Formel, nicht der Wert ohne Korrektur - in Deutsch und Englisch', () => {
    const k = berkeleyBlatt();
    const fuss = (sp: 'de' | 'en') => { s.einst.sprache = sp; return tabellenSchicht(k)[1]!.footnotes.map(c => c.t).join(' '); };
    try {
      expect(fuss('de')).toContain('SPSS zeigt als „Mantel-Haenszel“ den Wert mit Stetigkeitskorrektur (wie hier voreingestellt) und daneben einen Wert „Cochran“. „Cochran“ ist eine eigene Formel (teilt je Schicht durch n statt durch n - 1)');
      expect(fuss('en')).toContain('As "Mantel-Haenszel", SPSS shows the value with continuity correction (the default here) and also a value "Cochran". "Cochran" is a separate formula (it divides by n instead of n - 1 in each stratum)');
    } finally { s.einst.sprache = 'de'; }
  });
  it('Bild: sechs Schichten, gemeinsames und unbereinigtes OR; ohne Schicht kein Bild', () => {
    const k = berkeleyBlatt(), f = schichtForest(k)!;
    expect(f.reihen).toHaveLength(6); expect(Math.abs(f.gemeinsam!.or - 0.9047)).toBeLessThan(1e-3); expect(Math.abs(f.unbereinigt!.or - 1.841)).toBeLessThan(1e-3);
    expect(schichtForest(kreuzOhne(K.drei_mal_drei.zellen))).toBeNull();
  });
  it('größer als 2 × 2: nur der verallgemeinerte Test (kein gemeinsames OR); Sätze und Tabelle ohne NaN', () => {
    const a3 = (erwartet as any).mantelhaenszel.allgemein;
    const k: Kreuz = { ...kreuzOhne(K.drei_mal_drei.zellen), schicht: { spalte: 'S', korrektur: true, stufen: a3.schichten.map((tab: number[][], i: number) => ({ name: 'S' + (i + 1), tab })) } };
    const a = schichtVon(k)!; expect(a.zwei).toBe(false); expect(a.mh).toBeNull(); expect(Math.abs(a.allgemein!.chi2 - a3.chi2)).toBeLessThan(1e-9);
    const st = schichtSaetze(k)!; expect(st.zusatz).toContain('verallgemeinerter Mantel-Haenszel-Test χ²(4)'); expect(st.zusatz).toContain('gemeinsames Odds Ratio gibt es nur bei Tabellen mit zwei mal zwei Feldern'); keinNaN(st.zusatz);
    const [t] = tabellenSchicht(k); expect([...t!.cells, ...t!.footnotes].map(c => c.t).join(' ')).toContain('Landis, Heyman'); expect(schichtForest(k)).toBeNull();
  });
  it('Σ b·c = 0 und Schicht mit einem Fall: Sätze nennen es', () => {
    const k: Kreuz = { ...kreuzOhne([[8, 2], [3, 7]]), schicht: { spalte: 'S', korrektur: true, stufen: M.summe_bc_null.schichten.map((tab: number[][], i: number) => ({ name: 'S' + (i + 1), tab })) } };
    expect(schichtSaetze(k)!.zusatz).toContain('kein gemeinsames Odds Ratio schätzbar');
    const e1: Kreuz = { ...kreuzOhne([[8, 2], [3, 7]]), schicht: { spalte: 'S', korrektur: true, stufen: M.schicht_ein_fall.schichten.map((tab: number[][], i: number) => ({ name: 'S' + (i + 1), tab })) } };
    expect(schichtSaetze(e1)!.zusatz).toContain('Schicht ‹S2› hat nur einen Fall und geht nicht ein.');
  });
});

describe('Fallgewicht: Sperren der neuen Teile', () => {
  it('Häufigkeitsgewicht rechnet, Umfragegewicht sperrt Maße und Mantel-Haenszel (nur wenn gewählt)', () => {
    for (const art of ['haeufigkeit', 'umfrage'] as const) {
      const ohne = gewichtStellenIds({ verfahren: 'kreuz', art }), mit = gewichtStellenIds({ verfahren: 'kreuz', art, masse: true, schicht: true });
      expect(ohne).not.toContain('kreuz:masse'); expect(ohne).not.toContain('kreuz:schicht');
      expect(mit).toEqual(expect.arrayContaining(['kreuz:masse', 'kreuz:schicht']));
    }
    const h = gewichtStellen({ verfahren: 'kreuz', art: 'haeufigkeit', masse: true, schicht: true }), u = gewichtStellen({ verfahren: 'kreuz', art: 'umfrage', masse: true, schicht: true });
    expect(h.filter(x => x.status === 'sperren')).toEqual([]);
    expect(u.filter(x => x.status === 'sperren').map(x => x.id)).toEqual(expect.arrayContaining(['kreuz:masse', 'kreuz:schicht']));
    s.einst.sprache = 'de'; s.einst.anrede = 'du';
    expect(sperrSatz('kreuz:masse', { spalte: 'wu', art: 'umfrage' }, u.find(x => x.id === 'kreuz:masse')!.titel)).toContain('Die Stärke des Zusammenhangs ist mit einem Umfragegewicht gesperrt');
    expect(sperrSatz('kreuz:schicht', { spalte: 'wu', art: 'umfrage' }, u.find(x => x.id === 'kreuz:schicht')!.titel)).toContain('Der Mantel-Haenszel-Test ist mit einem Umfragegewicht gesperrt');
  });
});
