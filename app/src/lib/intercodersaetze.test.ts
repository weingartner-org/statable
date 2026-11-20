import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { alphaSkala, alphaStufe, interRechnen, mitInter, saetzeInter, tabellenInter, zaehleEinheiten } from './intercodersaetze';
import { saetzeKappa, kappa } from './ergebnis';
import { berichtSatz, berichtTabellen, excelTabellen, gerechneteN } from './berichtsatz';
import { s, type Blatt } from './sitzung.svelte';

/* Sätze, Skala, Tabellen zu Fachblatt G2. Die Rechenwerte prüft intercoder.test.ts gegen R; hier: Anzeige. Daten aus testdaten/intercoder-erwartet.json. */
type Wert = string | number | null;
const J = JSON.parse(readFileSync(new URL('./testdaten/intercoder-erwartet.json', import.meta.url), 'utf8')) as { faelle: { name: string; daten: Wert[][]; n_kodierende: number }[] };
const sp = (n: string): Wert[][] => { const f = J.faelle.find(x => x.name === n)!; return Array.from({ length: f.n_kodierende }, (_, j) => f.daten.map(z => z[j]!)); };
const namen = (k: number) => Array.from({ length: k }, (_, i) => `k${i + 1}`);

describe('Skala für Alpha aus dem Messniveau', () => {
  it('nominal, ordinal, metrisch -> nominal, ordinal, Intervall; gemischt: das niedrigste; Text nominal', () => {
    const z = (niveau: 'nominal' | 'ordinal' | 'metrisch', text = false) => ({ niveau, text });
    expect(alphaSkala([z('nominal'), z('nominal')])).toBe('nominal');
    expect(alphaSkala([z('ordinal'), z('ordinal')])).toBe('ordinal');
    expect(alphaSkala([z('metrisch'), z('metrisch')])).toBe('interval');
    expect(alphaSkala([z('metrisch'), z('ordinal'), z('metrisch')])).toBe('ordinal');
    expect(alphaSkala([z('metrisch'), z('nominal')])).toBe('nominal');
    expect(alphaSkala([z('metrisch', true), z('metrisch', true)])).toBe('nominal');
  });
});

describe('Einordnung nach Krippendorff (2004)', () => {
  it('>= ,800 verlässlich; ,667 bis ,800 vorläufig; darunter nicht verlässlich - am angezeigten Wert (drei Stellen)', () => {
    expect([0.85, 0.8, 0.7999, 0.7, 0.667, 0.6666, 0.5, -0.1].map(alphaStufe)).toEqual(['verlaesslich', 'verlaesslich', 'verlaesslich', 'vorlaeufig', 'vorlaeufig', 'vorlaeufig', 'nicht', 'nicht']);
    expect(alphaStufe(0.6664)).toBe('nicht');
  });
});

describe('Sätze bei drei und mehr Kodierenden', () => {
  it('Ergebnis (Text-Kategorien, 3 Kodierende): Fleiss mit KI, Landis-&-Koch-Wort, Alpha mit Einordnung', () => {
    const e = interRechnen(namen(3), sp('H_text_ja_nein'), 'nominal');
    const s = saetzeInter(e);
    expect(s.haupt).toMatch(/^Die Übereinstimmung der 3 Kodierenden ist (beachtlich|fast vollkommen|mäßig), Fleiss' κ = ,\d\d, 95 %-KI \[,\d\d; ,\d\d\]\. Krippendorffs α = ,\d\d\d \(nominal\) /);
    expect(s.apa).toMatch(/^Fleiss' κ = ,\d\d, 95 %-KI \[,\d\d; ,\d\d\]; α \(nominal\) = ,\d\d\d, 95 %-KI \[[^\]]+\]; 20 Einheiten, 3 Kodierende$/);
    expect(s.zusatz).toContain('Konvention');
    expect(s.marken.some(m => /^Krippendorffs α = ,590/.test(m.text))).toBe(true);
    console.log(s.haupt, '\n', s.zusatz, '\n', s.vorsicht, '\n', s.apa);
  });
  it('Alpha-Satz nach Stufe', () => {
    const a = interRechnen(namen(4), sp('A_krippendorff_beispiel'), 'nominal');
    expect(saetzeInter(a).haupt).toContain('erlaubt nur vorläufige Schlüsse (zwischen ,667 und ,800)');   // ,743
    const b = interRechnen(namen(6), sp('B_diagnoses'), 'nominal');
    expect(saetzeInter(b).haupt).toContain('reicht nicht für verlässliche Schlüsse (Grenze ,667)');
    expect(saetzeInter(b).haupt).toContain("Fleiss' κ = ,43");
  });
  it('Kappa-Paradox: Satz mit seltener Kategorie und Brennan-Prediger', () => {
    const e = interRechnen(namen(3), sp('C_seltene_kategorie'), 'nominal');
    expect(e.paradox).toBe(true); expect(e.seltene).toBe(2);
    const s = saetzeInter(e, w => (w === 2 ? 'ja' : 'nein'));
    expect(s.zusatz).toContain('Von den Paaren von Kodierungen je Einheit stimmen 93 % überein, κ ist trotzdem niedrig. Das liegt an der seltenen Kategorie „ja“. Brennan-Prediger (κ = ,87) hängt nicht von der Häufigkeit der Kategorien ab.');
    expect(s.marken.some(m => m.hinweis && /Paradox/.test(m.text))).toBe(true);
  });
  it('Alles gleich: Satz, keine APA-Zeile, kein Absturz', () => {
    const e = interRechnen(namen(3), sp('F_alles_gleich'), 'nominal');
    const s = saetzeInter(e);
    expect(s.haupt).toBe('Alle Kodierungen sind gleich. Die Kennwerte lassen sich nicht berechnen; die Übereinstimmung beträgt 100 %.');
    expect(s.apa).toBe(''); expect(s.marken).toEqual([]);
    const t = tabellenInter(e);
    expect(t).toHaveLength(2);
  });
  it('Einheiten mit nur einer Kodierung werden genannt', () => {
    const e = interRechnen(namen(4), sp('G_einheit_mit_einer_kodierung'), 'nominal');
    expect(e.nNurEine).toBe(2);
    expect(saetzeInter(e).zusatz).toContain('2 Einheiten haben nur eine Kodierung: Krippendorffs α übergeht sie');
    expect(zaehleEinheiten(sp('G_einheit_mit_einer_kodierung'))).toEqual({ mind2: 11, eine: 2, kategorien: 5 });
  });
});

describe('Zwei Kodierende: Cohens Kappa unverändert, Alpha kommt dazu', () => {
  const D = sp('D_zwei_kodierende'), paare = D[0]!.map((a, i) => [a, D[1]![i]!] as [number, number]);
  const k = kappa([], 'k1', 'k2', paare, false);
  const e = interRechnen(['k1', 'k2'], D, 'nominal');
  it('Haupt, APA-Anfang und Marken von saetzeKappa bleiben; Alpha steht dahinter', () => {
    const vor = saetzeKappa(k, n => n), mit = mitInter(vor, e);
    expect(mit.haupt).toBe(vor.haupt);
    expect(mit.apa.startsWith(vor.apa + '; α (nominal) = ,')).toBe(true);
    expect(mit.marken.slice(0, vor.marken.length)).toEqual(vor.marken);
    expect(mit.marken.length).toBe(vor.marken.length + 1);
    expect(mit.zusatz.startsWith(vor.zusatz)).toBe(true);
    expect(e.hauptwert).toBe('cohen'); expect(e.fleiss).toBeNull();
  });
  it('ohne inter: kein Unterschied', () => {
    const vor = saetzeKappa(k, n => n);
    expect(mitInter(vor, undefined)).toBe(vor);
  });
  it('Tabellen: nur Alpha in der Haupttabelle (Cohen steht in der PSPP-Tabelle), Weitere Kennwerte mit Prozent, BP und Zählungen', () => {
    const [haupt, weitere] = tabellenInter(e);
    expect(haupt!.rows).toBe(2);   // Kopf + Alpha
    expect(weitere!.rows).toBe(5); // Kopf + 4 Zeilen
    expect(weitere!.cells.filter(c => c.c === 0).map(c => c.t)).toEqual(['Kennwert', 'Prozentuale Übereinstimmung (%)', 'Brennan-Prediger-Koeffizient', 'Einheiten (mit mindestens zwei Kodierungen)', 'Einheiten mit nur einer Kodierung']);
  });
});

describe('κ und α liegen weit auseinander (Skala ordinal/metrisch)', () => {
  const stufen = [[1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 3, 3], [2, 3, 4, 5, 4, 2, 3, 4, 5, 4, 2, 4], [1, 3, 3, 4, 5, 2, 2, 3, 5, 5, 3, 3]];
  it('ordinal: Satz zu κ gegen α und Hinweis, wo die Skala steht', () => {
    const e = interRechnen(namen(3), stufen, 'ordinal'), s = saetzeInter(e);
    expect(Math.abs(e.alpha.wert! - e.fleiss!.wert!)).toBeGreaterThanOrEqual(0.2);
    expect(s.zusatz).toContain('κ zählt nur genau gleiche Stufen, α (ordinal/metrisch) berücksichtigt auch, wie weit die Stufen auseinanderliegen.');
    expect(s.zusatz).toContain('Die Skala folgt dem Messniveau der Spalten (änderbar unter „Spalten beschreiben“).');
  });
  it('nominal: kein κ-gegen-α-Satz, aber der Hinweis zur Skala', () => {
    const s = saetzeInter(interRechnen(namen(3), stufen, 'nominal'));
    expect(s.zusatz).not.toContain('κ zählt nur genau gleiche Stufen');
    expect(s.zusatz).toContain('Die Skala folgt dem Messniveau');
  });
});

describe('Tabellen bei drei und mehr Kodierenden', () => {
  it('Haupttabelle: Fleiss und Alpha mit KI und Einordnung', () => {
    const e = interRechnen(namen(6), sp('B_diagnoses'), 'nominal');
    const [haupt] = tabellenInter(e);
    expect(haupt!.rows).toBe(3);
    const txt = haupt!.cells.map(c => c.t);
    expect(txt).toContain("Fleiss' κ"); expect(txt).toContain('mäßig (Konvention)'); expect(txt).toContain('nicht verlässlich');
  });
});

describe('Blatt: Bericht, Word, PDF und Excel', () => {
  const blatt = (ergebnis: unknown): Blatt => ({ id: 'x', titel: 't', art: 'uebereinstimmung', l1: null, l2: null, syntax: '', items: [], ergebnis, imBericht: true, notiz: '', zeit: 0 });
  it('drei Kodierende: Satz mit Statistik-Zeile, zwei Tabellen, Excel gleich, n = Einheiten', () => {
    s.einst.sprache = 'de'; s.einst.bayes = false;
    const e = interRechnen(namen(3), sp('H_text_ja_nein'), 'nominal'), b = blatt({ typ: 'inter', e });
    expect(berichtSatz(b)).toMatch(/Krippendorffs α = ,590 \(nominal\) reicht nicht für verlässliche Schlüsse \(Grenze ,667\)\. Statistik: Fleiss' κ = ,58, 95 %-KI \[,28; ,89\]; α \(nominal\) = ,590/);
    expect(berichtTabellen(b).map(x => x.label)).toEqual(['Intercoder Agreement', 'Intercoder Further Coefficients']);
    expect((excelTabellen(b) as { label: string }[]).map(x => x.label)).toEqual(['Intercoder Agreement', 'Intercoder Further Coefficients']);
    expect(gerechneteN(b)).toEqual({ n: 20, art: 'faelle' });
  });
  it('alles gleich: Satz ohne Statistik-Zeile', () => {
    const e = interRechnen(namen(3), sp('F_alles_gleich'), 'nominal');
    expect(berichtSatz(blatt({ typ: 'inter', e }))).toBe('Alle Kodierungen sind gleich. Die Kennwerte lassen sich nicht berechnen; die Übereinstimmung beträgt 100 %.');
  });
  it('zwei Kodierende: Cohens Satz bleibt vorn, Alpha steht dahinter; Tabellen kommen zu den PSPP-Tabellen dazu', () => {
    const D = sp('D_zwei_kodierende'), paare = D[0]!.map((a, i) => [a, D[1]![i]!] as [number, number]);
    const k = kappa([], 'k1', 'k2', paare, false), e = interRechnen(['k1', 'k2'], D, 'nominal');
    s.einst.sprache = 'de';
    const ohne = berichtSatz(blatt({ typ: 'kappa', e: k })), mit = berichtSatz(blatt({ typ: 'kappa', e: { ...k, inter: e } }));
    expect(ohne).toMatch(/Statistik: κ = ,62, p < ,001, 95 %-KI \[,33; ,91\], n = 20\.$/);
    expect(mit).toMatch(/Statistik: κ = ,62, p < ,001, 95 %-KI \[,33; ,91\], n = 20; α \(nominal\) = ,629/);
    expect(berichtTabellen(blatt({ typ: 'kappa', e: { ...k, inter: e } })).map(x => x.label)).toEqual(['Intercoder Agreement', 'Intercoder Further Coefficients']);
    expect(berichtTabellen(blatt({ typ: 'kappa', e: k }))).toEqual([]);
  });
});
