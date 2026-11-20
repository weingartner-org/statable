import { describe, expect, it } from 'vitest';
import { artAusSyntax, bezeichnerIn, csvZelle, leseProtokoll, pruefeSyntax, pruefsumme, standVon, vergleiche } from './protokoll';
import { baueVorlage, leseRecode, leseVorlage, pruefeVorlage, recodeKennt, vorlageAlsText, type Vorlage } from './vorlage';
import { psppNameOk } from './befehlstext';
import { gewichtAus } from './projektdatei';

/* Teil B (Vorlage und Protokoll): reine Logik. Der Lauf gegen die echte Engine: lib/vorlage-lauf.test.ts. */

describe('pruefeSyntax: erlaubte Befehle', () => {
  it('lässt die Befehle der Assistenten durch und macht jeden zu einer Zeile mit Punkt', () => {
    const r = pruefeSyntax("RECODE geschl ('m'=1) ('w'=2) (ELSE=SYSMIS) INTO g2.\nEXECUTE.\nVARIABLE LABELS g2 'Geschlecht (Zahl)'.\nVALUE LABELS g2 1 'männlich' 2 'weiblich'.\nCOMPUTE s = MEAN(a, b,\n  c).\nIF (x >= 5 & y ~= 3) z = 1.");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.befehle).toEqual([
      "RECODE geschl ('m'=1) ('w'=2) (ELSE=SYSMIS) INTO g2.", 'EXECUTE.', "VARIABLE LABELS g2 'Geschlecht (Zahl)'.", "VALUE LABELS g2 1 'männlich' 2 'weiblich'.", 'COMPUTE s = MEAN(a, b, c).', 'IF (x >= 5 & y ~= 3) z = 1.'
    ]);
    expect(r.hatWerte).toBe(true);   // 'm' und 'w' im RECODE: Text-Werte als Regel
  });
  it('Beschriftungen allein sind keine Werte; Zahlen als Regel auch nicht', () => {
    const a = pruefeSyntax("VARIABLE LABELS a 'Alter in Jahren' /b 'Größe'.\nVALUE LABELS c 1 'ja' 2 'nein'.\nMISSING VALUES a (-99).\nRECODE a (LO THRU 17=1) (18 THRU HI=2) INTO ak.\nAGGREGATE /OUTFILE=* MODE=ADDVARIABLES /BREAK=g /m = MEAN(x).");
    expect(a.ok && a.hatWerte).toBe(false);
  });
  it('Kommentarzeilen werden weggelassen und gezählt', () => {
    const r = pruefeSyntax("* Hallo 'Welt.\nCOMPUTE a = 1.\nCOMMENT noch einer.\nEXECUTE.");
    expect(r).toMatchObject({ ok: true, kommentare: 2, befehle: ['COMPUTE a = 1.', 'EXECUTE.'] });
  });
  it('Zeichenketten: Verdopplung des Apostrophs und X-Zeichenketten sind erlaubt', () => {
    const r = pruefeSyntax("RECODE t ('O''Brien'='X') ('a' + X'0A' + 'b'='Y') INTO u.");
    expect(r.ok).toBe(true);
  });
});

describe('pruefeSyntax: fremde Eingabe wird abgelehnt', () => {
  const nein = (t: string, grund?: string) => { const r = pruefeSyntax(t); expect(r.ok, JSON.stringify(t)).toBe(false); if (grund && !r.ok) expect(r.grund, JSON.stringify(t)).toBe(grund); };
  it('Befehle, die Dateien lesen oder schreiben oder Fremdes tun', () => {
    for (const b of ["SAVE OUTFILE='/pwned.sav'.", "GET FILE='/x.sav'.", "HOST COMMAND=('ls').", "INCLUDE '/x.sps'.", "INSERT FILE='x'.", 'DATA LIST FREE /a.', 'BEGIN DATA.', "MATCH FILES /FILE=* /FILE='/zz.sav'.", "ADD FILES /FILE=*.", 'NEW FILE.', "EXPORT OUTFILE='x'.", 'DEFINE !m ().', 'FREQUENCIES a.', 'DELETE VARIABLES a. SAVE OUTFILE=\'x\'.']) nein(b);
  });
  it('Abkürzungen verbotener Befehle', () => { for (const b of ['SAV OUTFILE=\'x\'.', 'HOS COMMAND=(\'x\').', 'INC \'x\'.', 'GET FIL=\'x\'.']) nein(b, 'befehl'); });
  it('Dateibezug in einem erlaubten Befehl', () => {
    nein("AGGREGATE /OUTFILE='/x.sav' /BREAK=g /m=MEAN(x).", 'datei');
    nein("AGGREGATE /OUTFILE=* /FILE='/x.sav' /BREAK=g /m=MEAN(x).", 'datei');
    nein("COMPUTE a = 1 /FILE='x'.", 'datei');
    nein("SORT CASES BY a /INFILE=*.", 'datei');
  });
  it('Zeichenketten, die ausbrechen wollen', () => {
    nein("VARIABLE LABELS a 'x\n.\nCOMPUTE inj = 99.\n'.", 'zeichenkette');
    nein("VARIABLE LABELS a 'x\r\n.\r\nSAVE OUTFILE=\"/p.sav\".'.", 'zeichenkette');
    nein("VARIABLE LABELS a 'x\u2028.\u2028COMPUTE inj=1.'.", 'zeichenkette');
    nein("VARIABLE LABELS a 'x\u0085.\u0085COMPUTE inj=1.'.", 'zeichenkette');
    nein("VARIABLE LABELS a 'offen.", 'zeichenkette');
    nein("RECODE a (X'0G'=1) INTO b.", 'zeichenkette');
    nein("RECODE a (X'0'=1) INTO b.", 'zeichenkette');
  });
  it('Zeichen, die in Befehlen nichts verloren haben', () => {
    for (const b of ['COMPUTE a = 1; SAVE OUTFILE=\'x\'.', 'COMPUTE a = !x.', 'COMPUTE a = `x`.', 'COMPUTE a = 1 /* weg\n.', 'COMPUTE a = {1}.', 'COMPUTE a = b\\c.', 'COMPUTE a = 1', 'COMPUTE a = (1.', 'COMPUTE a = 1).', 'COMPUTE a = [1].', 'COMPUTE a = b % c.']) nein(b);
  });
  it('mehrere Befehle in einer Zeile werden getrennt und einzeln geprüft', () => {
    nein("COMPUTE a = 1. SAVE OUTFILE='x'.");
    const r = pruefeSyntax('COMPUTE a = 1. COMPUTE b = 2.');
    expect(r).toMatchObject({ ok: true, befehle: ['COMPUTE a = 1.', 'COMPUTE b = 2.'] });
  });
  it('Zeilennummern im Befehl: nicht wiederholbar', () => { nein('COMPUTE x = $SYSMIS.\nIF (ANY($CASENUM, 3, 9)) x = 1.', 'zeilen'); });
  it('zu lang', () => { nein('COMPUTE a = 1.\n'.repeat(30000), 'zu-lang'); });
  it('Hilfsspalte mit $CASENUM (Sortieren, Zusammenführen) ist erlaubt', () => { expect(pruefeSyntax('COMPUTE reihe = $CASENUM.\nSORT CASES BY g.').ok).toBe(true); });
  it('Nicht-Text und leere Eingabe', () => { for (const t of [null, undefined, 5, {}, '', '   ', '* nur Kommentar.']) { const r = pruefeSyntax(t as never); expect(r.ok).toBe(false); } });
});

describe('Art, Namen, Vergleich', () => {
  it('artAusSyntax nimmt den ersten Befehl, der etwas tut', () => {
    expect(artAusSyntax('* x.\nRECODE a (1=2).\nEXECUTE.')).toBe('umkodieren');
    expect(artAusSyntax('COMPUTE a = 1.')).toBe('berechnen');
    expect(artAusSyntax('MISSING VALUES a (9).')).toBe('fehlend');
    expect(artAusSyntax('MATCH FILES /FILE=*.')).toBe('zusammen');
    expect(artAusSyntax('FREQUENCIES a.')).toBe('befehl');
  });
  it('bezeichnerIn ignoriert Zeichenketten', () => { expect(bezeichnerIn(["RECODE alter ('alter'=1) INTO neu.", 'COMPUTE x = y + 1.']).sort()).toEqual(['COMPUTE', 'INTO', 'RECODE', 'alter', 'neu', 'x', 'y'].sort()); });
  it('vergleiche: neue und geänderte Spalten, betroffene Zeilen', () => {
    const sp = (n: string, art: 'zahl' | 'text' = 'zahl') => ({ name: n, art });
    const vor = standVon([sp('a'), sp('b', 'text')], [[1, 'x'], [2, 'y'], [3, 'z']]);
    const nach = standVon([sp('a'), sp('b', 'text'), sp('c')], [[1, 'x', 5], [2, 'q', null], [3, 'z', null]]);
    expect(vergleiche(vor, nach)).toEqual({ spalten: ['c', 'b'], betroffen: 2, erzeugt: ['c'] });
    const weg = standVon([sp('a')], [[1], [3]]);
    expect(vergleiche(vor, weg)).toMatchObject({ spalten: ['b', 'a'], betroffen: 2 });   // eine Zeile weniger (1) + Zeile 2 steht jetzt anders (1)
  });
  it('csvZelle schützt vor Formeln', () => { expect(csvZelle('=1+1')).toBe("'=1+1"); expect(csvZelle('a;b')).toBe('"a;b"'); expect(csvZelle(-5)).toBe('-5'); expect(csvZelle(null)).toBe(''); });
});

describe('Prüfsumme SHA-256 über die Bytes', () => {
  it('bekannter Wert', async () => {
    expect(await pruefsumme(new TextEncoder().encode('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const teil = new TextEncoder().encode('xxabcxx').subarray(2, 5);   // Ausschnitt eines größeren Puffers: nur die Bytes des Ausschnitts zählen
    expect(await pruefsumme(teil)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('RECODE lesen', () => {
  it('Klauseln, Bereiche, ELSE', () => {
    const l = leseRecode("RECODE a (1 THRU 3=1) ('x', 'y'=2) (LO THRU 0=9) (ELSE=SYSMIS) INTO b.")!;
    expect(l.vars).toEqual(['a']); expect(l.sonst).toBe(true); expect(l.into).toBe(true);
    expect(l.klauseln[0]!.bereiche).toEqual([[1, 3]]); expect(l.klauseln[1]!.einzel).toEqual(['x', 'y']); expect(l.klauseln[2]!.bereiche).toEqual([[-Infinity, 0]]);
  });
  it('recodeKennt', () => {
    const l = leseRecode("RECODE g ('Ja'=1) ('Nein'=0).")!;
    expect(recodeKennt(l, 'Ja')).toBe(true); expect(recodeKennt(l, 'Ja  ')).toBe(true); expect(recodeKennt(l, 'Vielleicht')).toBe(false);
    const z = leseRecode('RECODE a (1 THRU 3=1) (5=2).')!;
    expect(recodeKennt(z, 2)).toBe(true); expect(recodeKennt(z, 4)).toBe(false); expect(recodeKennt(z, 5)).toBe(true);
  });
  it('unlesbare Fälle ergeben null (keine Prüfung statt falscher Prüfung)', () => { expect(leseRecode("RECODE a ('a' + X'0A'=1).")).toBeNull(); expect(leseRecode('COMPUTE a = 1.')).toBeNull(); });
});

describe('Vorlagendatei von außen', () => {
  const gut: Vorlage = {
    format: 'statable-vorlage', version: 1, name: 'V', zeit: 1, ursprung: [{ name: 'a', art: 'zahl' }], eingang: { a: 'zahl' }, ausgelassen: 0, luecke: false, sets: [], skalen: [], blaetter: [],
    schritte: [{ nr: 1, art: 'berechnen', spalten: ['b'], wiederhol: { typ: 'syntax', befehle: ['COMPUTE b = a * 2.'] }, liest: { a: 'zahl' }, erzeugt: ['b'] }]
  };
  it('eine gute Vorlage geht durch den Text und zurück', () => {
    const r = leseVorlage(vorlageAlsText(gut));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.vorlage.schritte[0]!.wiederhol).toEqual({ typ: 'syntax', befehle: ['COMPUTE b = a * 2.'] });
  });
  it('kaputt oder fremd ergibt einen Grund, keinen Absturz', () => {
    for (const t of ['', 'nix', '{', '[]', 'null', '5', '{"format":"anders"}', '{"format":"statable-vorlage"}', '{"format":"statable-vorlage","version":"1","schritte":[],"blaetter":[],"eingang":{}}', '{"format":"statable-vorlage","version":1,"schritte":5,"blaetter":[],"eingang":{}}', '{"format":"statable-vorlage","version":1,"schritte":[null],"blaetter":[],"eingang":{}}', '{"format":"statable-vorlage","version":1,"schritte":[],"blaetter":[],"eingang":{"a b":"zahl"}}', '\u0000\u0001']) {
      const r = leseVorlage(t); expect(r.ok, t).toBe(false);
    }
    expect(leseVorlage('{"format":"statable-vorlage","version":2,"schritte":[],"blaetter":[],"eingang":{}}')).toEqual({ ok: false, grund: 'neuer' });
  });
  it('ein Schritt mit unerlaubter Syntax bleibt als nicht wiederholbar stehen - nie still weggelassen, nie ausgeführt', () => {
    const boese = { ...gut, schritte: [gut.schritte[0]!, { nr: 2, art: 'befehl', spalten: [], wiederhol: { typ: 'syntax', befehle: ["COMPUTE a = 1.", "SAVE OUTFILE='/pwned.sav'."] } }, { nr: 3, art: 'befehl', spalten: [], wiederhol: { typ: 'syntax', befehle: ["VARIABLE LABELS a 'x\n.\nCOMPUTE inj = 1.\n'."] } }, { nr: 4, art: 'sortieren', spalten: [], wiederhol: { typ: 'sortieren', schluessel: [{ spalte: "a'; DROP", richtung: 'auf', natuerlich: false }], altName: null } }, { nr: 5, art: 'spalteWeg', spalten: [], wiederhol: { typ: 'spalteWeg', name: 'a b' } }] };
    const r = leseVorlage(JSON.stringify(boese));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.vorlage.schritte).toHaveLength(5);
    expect(r.vorlage.schritte[0]!.wiederhol).toBeDefined();
    for (const s of r.vorlage.schritte.slice(1)) { expect(s.wiederhol, `Schritt ${s.nr}`).toBeUndefined(); expect(s.nicht, `Schritt ${s.nr}`).toBe('befehl'); }
    const p = pruefeVorlage(r.vorlage, { spalten: [{ name: 'a', art: 'zahl' }], zeilen: [[1]] });
    expect(p.sperren).toBeGreaterThanOrEqual(4);
  });
  it('ein Fallgewicht-Schritt: Spalte und Art werden geprüft', () => {
    const mit = (g: unknown) => leseVorlage(JSON.stringify({ ...gut, schritte: [{ nr: 1, art: 'gewicht', spalten: [], wiederhol: { typ: 'syntax', befehle: ['WEIGHT BY w.'], gewicht: g } }] }));
    const ok = mit({ spalte: 'w', art: 'haeufigkeit' }); expect(ok.ok && ok.vorlage.schritte[0]!.wiederhol).toEqual({ typ: 'syntax', befehle: ['WEIGHT BY w.'], gewicht: { spalte: 'w', art: 'haeufigkeit' } });
    const aus = leseVorlage(JSON.stringify({ ...gut, schritte: [{ nr: 1, art: 'gewicht', spalten: [], wiederhol: { typ: 'syntax', befehle: ['WEIGHT OFF.'], gewicht: null } }] })); expect(aus.ok && aus.vorlage.schritte[0]!.wiederhol).toMatchObject({ gewicht: null });
    for (const g of [{ spalte: 'w', art: 'boese' }, { spalte: 'a b', art: 'umfrage' }, 'w', 5]) { const r = mit(g); expect(r.ok && r.vorlage.schritte[0]!.nicht, JSON.stringify(g)).toBe('befehl'); }
  });
  it('Auswertungen: Namen werden geprüft, Ergebnisse und Befehlsblätter kommen nie hinein', () => {
    const o = { ...gut, blaetter: [
      { titel: 'T', art: 'ttest', l1: "a'; x", l2: 'b', l3: ['c', "d'e"], imBericht: true, notiz: 'Notiz', items: [{ type: 'text' }], ergebnis: { geheim: 1 }, syntax: 'SAVE OUTFILE="x".' },
      { titel: 'B', art: 'befehle', syntax: "SAVE OUTFILE='x'." }, { titel: 'K', art: 'kategorien' }, { titel: 'X', art: 'a b' }] };
    const r = leseVorlage(JSON.stringify(o));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.vorlage.blaetter).toHaveLength(1);
    const b = r.vorlage.blaetter[0]! as unknown as Record<string, unknown>;
    expect(b.l1).toBeNull(); expect(b.l2).toBe('b'); expect(b.l3).toEqual(['c', '']);
    expect(b).not.toHaveProperty('items'); expect(b).not.toHaveProperty('ergebnis'); expect(b).not.toHaveProperty('syntax');
    expect(b.notiz).toBe('Notiz');
  });
  it('das Protokoll aus der Projektdatei: Unsinn fällt weg, Gutes bleibt', () => {
    const r = leseProtokoll([null, 5, { art: 'ungueltig' }, { art: 'umkodieren', spalten: ['a', 5], betroffen: 3, vorher: 10, nachher: 10, zeit: 1, quelle: 'hand', ergebnis: 'ok', wiederhol: { typ: 'syntax', befehle: ["SAVE OUTFILE='x'."] }, vorlage: { datei: 5, pruefsummeDaten: 'kurz' } }], psppNameOk, gewichtAus);
    expect(r).toHaveLength(1);
    expect(r[0]!.spalten).toEqual(['a']); expect(r[0]!.wiederhol).toBeUndefined(); expect(r[0]!.vorlage!.pruefsummeDaten).toBeNull();
    expect(leseProtokoll('kein Feld', psppNameOk, gewichtAus)).toEqual([]);
  });
});

describe('Vorlage bauen: keine Daten darin', () => {
  it('Werte aus den Daten stehen weder in den Schritten noch in den Auswertungen (erkennbare Werte)', () => {
    const GEHEIM = ['GEHEIMWERT_Q7Z', 'Mueller-Lüdenscheid', 4711.4711, 'Nachbar-Anna-X'];
    const eintraege = [
      { nr: 1, art: 'umkodieren' as const, spalten: ['gruppe_neu'], betroffen: 3, vorher: 3, nachher: 3, zeit: 1, quelle: 'hand' as const, ergebnis: 'ok' as const, werte: true, liest: { gruppe: 'text' as const }, erzeugt: ['gruppe_neu'], wiederhol: { typ: 'syntax' as const, befehle: ["RECODE gruppe ('A'=1) ('B'=2) INTO gruppe_neu."] } },
      { nr: 2, art: 'datencheck' as const, spalten: ['name'], betroffen: 1, vorher: 3, nachher: 3, zeit: 2, quelle: 'hand' as const, ergebnis: 'ok' as const, nicht: 'aus-daten' as const },
      { nr: 3, art: 'zelle' as const, spalten: ['name'], betroffen: 1, vorher: 3, nachher: 3, zeit: 3, quelle: 'hand' as const, ergebnis: 'ok' as const, nicht: 'zeilen' as const }
    ];
    const blatt = { id: 'x', titel: 'Vergleich', art: 'gruppen', l1: 'punkte', l2: 'gruppe_neu', syntax: `T-TEST /VARIABLES=${GEHEIM[0]}`, items: [{ type: 'text', text: `${GEHEIM[1]}` }], ergebnis: { m: GEHEIM[2], name: GEHEIM[3] }, imBericht: true, notiz: 'meine Notiz', zeit: 1, stand: 'abc', kat: { x: GEHEIM[1] }, gewicht: { spalte: 'w', art: 'umfrage', summe: GEHEIM[2], zeilen: 3 } };
    const { vorlage, hinweise } = baueVorlage(eintraege, { spalten: [{ name: 'gruppe', art: 'text' }, { name: 'punkte', art: 'zahl' }, { name: 'gruppe_neu', art: 'zahl' }, { name: 'name', art: 'text' }] }, [{ ...blatt, kat: undefined } as never, blatt as never, { ...(blatt as object), id: 'y', kat: undefined, art: 'kategorien' } as never], [], [], 'Projekt', false, 5);
    const text = vorlageAlsText(vorlage);
    for (const g of GEHEIM) expect(text, String(g)).not.toContain(String(g));
    expect(text).not.toContain('"items"'); expect(text).not.toContain('"ergebnis"');
    expect(vorlage.blaetter).toHaveLength(1);
    expect(hinweise.nichtWiederholbar.map(x => x.nr)).toEqual([2, 3]);
    expect(hinweise.mitWerten).toBe(1); expect(hinweise.ausgelassen).toBe(2);
    expect(vorlage.eingang).toEqual({ gruppe: 'text', punkte: 'zahl' });
    expect(vorlage.ursprung.map(x => x.name).sort()).toEqual(['gruppe', 'name', 'punkte']);
  });
  it('zurückgenommene, abgebrochene und Vermerk-Einträge gehören nicht hinein', () => {
    const e = (nr: number, extra: object) => ({ nr, art: 'berechnen' as const, spalten: [], betroffen: 0, vorher: 1, nachher: 1, zeit: 1, quelle: 'hand' as const, ergebnis: 'ok' as const, wiederhol: { typ: 'syntax' as const, befehle: ['COMPUTE a = 1.'] }, ...extra });
    const { vorlage } = baueVorlage([e(1, { zurueck: { zeit: 2, grund: 'rueckgaengig' } }), e(2, {}), e(3, { ergebnis: 'abgebrochen' }), e(4, { art: 'vorlage' }), e(5, { ohneVorlage: true })], { spalten: [] }, [], [], [], '', false, 1);
    expect(vorlage.schritte).toHaveLength(1);
  });
});

describe('Prüfung vor dem Anwenden', () => {
  const v: Vorlage = {
    format: 'statable-vorlage', version: 1, name: 'V', zeit: 1, ursprung: [{ name: 'gruppe', art: 'text' }, { name: 'alter', art: 'zahl' }], eingang: { gruppe: 'text', alter: 'zahl' }, ausgelassen: 0, luecke: false, sets: [], skalen: [], blaetter: [],
    schritte: [{ nr: 1, art: 'umkodieren', spalten: ['g2'], wiederhol: { typ: 'syntax', befehle: ["RECODE gruppe ('A'=1) ('B'=2) ('C'=3) INTO g2."] }, liest: { gruppe: 'text' }, erzeugt: ['g2'] }]
  };
  const daten = (sp: { name: string; art: 'zahl' | 'text' | 'datum' }[], zeilen: (string | number | null)[][]) => ({ spalten: sp, zeilen });
  it('alles passt', () => {
    const p = pruefeVorlage(v, daten([{ name: 'gruppe', art: 'text' }, { name: 'alter', art: 'zahl' }], [['A', 20], ['B', 30], ['C', 40]]));
    expect(p).toMatchObject({ sperren: 0, warnungen: 0, hinweise: 0 });
  });
  it('Spalte fehlt: Sperre mit Name; Zuordnung hebt sie auf', () => {
    const d = daten([{ name: 'gruppe', art: 'text' }, { name: 'age', art: 'zahl' }], [['A', 1]]);
    const p = pruefeVorlage(v, d);
    expect(p.sperren).toBe(1); expect(p.punkte.find(x => x.art === 'fehlt')).toMatchObject({ spalte: 'alter', stufe: 'sperre' });
    expect(pruefeVorlage(v, d, { alter: 'age' }).sperren).toBe(0);
    expect(pruefeVorlage(v, daten([{ name: 'gruppe', art: 'text' }, { name: 'age', art: 'zahl' }, { name: 'alter2', art: 'zahl' }], [['A', 1, 2]]), { alter: 'age', gruppe: 'age' }).punkte.some(x => x.art === 'zuordnung-kollision')).toBe(true);
  });
  it('andere Art: Sperre', () => {
    const p = pruefeVorlage(v, daten([{ name: 'gruppe', art: 'zahl' }, { name: 'alter', art: 'zahl' }], [[1, 1]]));
    expect(p.punkte.find(x => x.art === 'andere-art')).toMatchObject({ spalte: 'gruppe', erwartet: 'text', ist: 'zahl', stufe: 'sperre' });
  });
  it('neue Spalte: Hinweis ohne Halt', () => {
    const p = pruefeVorlage(v, daten([{ name: 'gruppe', art: 'text' }, { name: 'alter', art: 'zahl' }, { name: 'neu', art: 'zahl' }], [['A', 1, 1]]));
    expect(p).toMatchObject({ sperren: 0, warnungen: 0, neueSpalten: ['neu'] }); expect(p.punkte.filter(x => x.art === 'neue-spalte')).toHaveLength(1);
  });
  it('neue Kategorie: Warnung mit Zahl der Zeilen; fehlende Kategorie: Hinweis', () => {
    const p = pruefeVorlage(v, daten([{ name: 'gruppe', art: 'text' }, { name: 'alter', art: 'zahl' }], [['A', 1], ['A', 2], ['D', 3], ['E', 4], ['D', 5], [null, 6]]));
    expect(p.sperren).toBe(0); expect(p.warnungen).toBe(1); expect(p.zeilenNeueKategorien).toBe(3);
    expect(p.punkte.find(x => x.art === 'neue-kategorie')).toMatchObject({ spalte: 'gruppe', anzahl: 3, schritt: 1 });
    expect(p.punkte.find(x => x.art === 'kategorie-fehlt')).toMatchObject({ anzahl: 2 });
  });
  it('Schritt, der nicht wiederholbar ist: Sperre mit Nummer', () => {
    const w = { ...v, schritte: [...v.schritte, { nr: 2, art: 'zelle' as const, spalten: ['x'], nicht: 'zeilen' as const }] };
    const p = pruefeVorlage(w, daten([{ name: 'gruppe', art: 'text' }, { name: 'alter', art: 'zahl' }], [['A', 1]]));
    expect(p.punkte.find(x => x.art === 'nicht-wiederholbar')).toMatchObject({ schritt: 2, schrittArt: 'zelle', nicht: 'zeilen' });
  });
  it('Lesart braucht die Kopfzeile der Tabelle', () => {
    const w = { ...v, schritte: [{ nr: 1, art: 'lesart' as const, spalten: [], wiederhol: { typ: 'lesart' as const, modus: 'zahl' as const, kopf: 'Preis in €' } }, ...v.schritte] };
    const d = daten([{ name: 'gruppe', art: 'text' }, { name: 'alter', art: 'zahl' }], [['A', 1]]);
    expect(pruefeVorlage(w, d, {}, null).punkte.some(x => x.art === 'lesart')).toBe(true);
    expect(pruefeVorlage(w, d, {}, ['gruppe', 'Preis in €']).punkte.some(x => x.art === 'lesart')).toBe(false);
  });
  it('Kategorien einer Spalte, die ein früherer Schritt verändert hat, werden nicht geprüft', () => {
    const w: Vorlage = { ...v, schritte: [{ nr: 1, art: 'umkodieren', spalten: ['gruppe'], wiederhol: { typ: 'syntax', befehle: ["RECODE gruppe ('a'='A')."] }, liest: { gruppe: 'text' } }, { nr: 2, art: 'umkodieren', spalten: ['g2'], wiederhol: v.schritte[0]!.wiederhol!, liest: { gruppe: 'text' }, erzeugt: ['g2'] }] };
    const p = pruefeVorlage(w, daten([{ name: 'gruppe', art: 'text' }, { name: 'alter', art: 'zahl' }], [['a', 1], ['Z', 2]]));
    expect(p.punkte.filter(x => x.art === 'neue-kategorie').map(x => x.schritt)).toEqual([1]);
  });
});
