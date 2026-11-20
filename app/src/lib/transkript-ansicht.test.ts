import { describe, expect, it } from 'vitest';
import type { Dokument } from './qualprojekt';
import {
  Drossel, TEMPOS, abspielName, abspielTaste, anzeigeZeit, beitragTitel, beitragBezeichnung, kopfAbschnitte, kopfTitel, hinweisAnzeige, laufenderBeitrag, leseSprungZeit, mediumSatz, positionsText, pruefeSprung,
  redeanteileDatensatz, GedrosselteAnsage, sprechzeitMinSek, beispielZuordnung, beispielDateien, fehlerText, ruecksprungSekunden, seitenBereich, seitenText, seitenZahl, seiteVon, springe, startNachAnhalten, tempoSchritt, teileAnSchreibmarke, vergleicheMedium, zeitmarkenForm,
} from './transkript-ansicht';
import { pruefeTranskript, inhaltVon } from './transkript-pruefen';

const cp = (s: string) => Array.from(s).length;
function struktur(bs: { k: string; t: string; zeitMs?: number; bisMs?: number }[]): Dokument {
  let text = '', pos = 0;
  const abschnitte: NonNullable<Dokument['transkript']>['abschnitte'] = [];
  bs.forEach((b, i) => {
    if (i > 0) { text += '\n\n'; pos += 2; }
    const roh = `${b.k}: ${b.t}`, n = cp(roh);
    abschnitte.push({ start: pos, ende: pos + n, sprecher: b.k, ...(b.zeitMs !== undefined ? { zeitMs: b.zeitMs } : {}), ...(b.bisMs !== undefined ? { bisMs: b.bisMs } : {}) });
    text += roh; pos += n;
  });
  const ks = [...new Set(bs.map((b) => b.k))];
  return { id: 'd', name: 'T', art: 'audio', text, erstellt: 0, geaendert: 0, transkript: { sprecher: ks.map((k) => ({ id: k, name: k })), abschnitte, quelle: 'vtt' } } as Dokument;
}
const taste = (code: string, o: Partial<{ shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean }> = {}) => ({ key: code, code, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...o });

describe('Zeit', () => {
  it('Anzeige 1:23, 12:40, 1:02:03', () => { expect(anzeigeZeit(83_000)).toBe('1:23'); expect(anzeigeZeit(760_000)).toBe('12:40'); expect(anzeigeZeit(3_723_000)).toBe('1:02:03'); expect(anzeigeZeit(0)).toBe('0:00'); expect(anzeigeZeit(NaN)).toBe('0:00'); });
  it('Position „1:23 von 12:40“', () => { expect(positionsText(83_000, 760_000, 'de')).toBe('1:23 von 12:40'); expect(positionsText(83_000, 760_000, 'en')).toBe('1:23 of 12:40'); });
  it('Zeitfeld: 1:23 und 00:01:23 gelten, Unsinn nicht', () => {
    expect(leseSprungZeit('1:23')).toBe(83_000); expect(leseSprungZeit(' 00:01:23 ')).toBe(83_000); expect(leseSprungZeit('1:02:03')).toBe(3_723_000); expect(leseSprungZeit('0:00')).toBe(0);
    for (const x of ['', 'abc', '1:75', '83', '1:2', '-1:23', '1:23:', '1,5']) expect(leseSprungZeit(x), x).toBeNull();
  });
  it('Zeitfeld prüft die Dauer', () => {
    expect(pruefeSprung('1:23', 760_000)).toEqual({ ms: 83_000 });
    expect(pruefeSprung('13:00', 760_000)).toEqual({ fehler: 'zu-spaet' });
    expect(pruefeSprung('x', 760_000)).toEqual({ fehler: 'format' });
    expect(pruefeSprung('99:00', NaN)).toEqual({ ms: 5_940_000 });
  });
});

describe('Abspielen', () => {
  it('Rücksprung 0 bis 5, sonst 2', () => { expect(ruecksprungSekunden(0)).toBe(0); expect(ruecksprungSekunden('5')).toBe(5); expect(ruecksprungSekunden(6)).toBe(2); expect(ruecksprungSekunden(-1)).toBe(2); expect(ruecksprungSekunden(1.5)).toBe(2); expect(ruecksprungSekunden('')).toBe(2); expect(ruecksprungSekunden(undefined)).toBe(2); });
  it('Start nach Anhalten: früher, nie vor 0', () => { expect(startNachAnhalten(10_000, 2)).toBe(8000); expect(startNachAnhalten(1000, 2)).toBe(0); expect(startNachAnhalten(10_000, 0)).toBe(10_000); expect(startNachAnhalten(10_000, 9)).toBe(8000); });
  it('Springen bleibt in 0 bis Dauer', () => { expect(springe(10_000, -5, 60_000)).toBe(5000); expect(springe(3000, -5, 60_000)).toBe(0); expect(springe(58_000, 5, 60_000)).toBe(60_000); expect(springe(58_000, 5, NaN)).toBe(63_000); expect(springe(1000, -5, NaN)).toBe(0); });
  it('Tempo: Schritte, am Rand Halt', () => {
    expect(TEMPOS).toEqual([0.5, 0.75, 1, 1.25, 1.5]);
    expect(tempoSchritt(1, -1)).toBe(0.75); expect(tempoSchritt(1, 1)).toBe(1.25); expect(tempoSchritt(0.5, -1)).toBe(0.5); expect(tempoSchritt(1.5, 1)).toBe(1.5); expect(tempoSchritt(0.9, 1)).toBe(1.25);
  });
  it('laufender Beitrag', () => {
    const a = [{ zeitMs: 0, bisMs: 3000 }, { zeitMs: 3000, bisMs: 9000 }, { zeitMs: 9000, bisMs: 12_000 }];
    expect(laufenderBeitrag(a, 0)).toBe(0); expect(laufenderBeitrag(a, 2999)).toBe(0); expect(laufenderBeitrag(a, 3000)).toBe(1); expect(laufenderBeitrag(a, 11_000)).toBe(2); expect(laufenderBeitrag(a, 12_000)).toBe(-1);
    expect(laufenderBeitrag([{ zeitMs: 5000 }], 1000)).toBe(-1); expect(laufenderBeitrag([{}, {}], 5000)).toBe(-1);
  });
});

describe('Tasten', () => {
  it('F4, F8, F9 und mit Umschalt', () => {
    expect(abspielTaste(taste('F4'))).toBe('umschalten'); expect(abspielTaste(taste('F8'))).toBe('zurueck'); expect(abspielTaste(taste('F9'))).toBe('vor');
    expect(abspielTaste(taste('F8', { shiftKey: true }))).toBe('langsamer'); expect(abspielTaste(taste('F9', { shiftKey: true }))).toBe('schneller'); expect(abspielTaste(taste('F4', { shiftKey: true }))).toBe('zeitmarke');
  });
  it('mit Strg, Alt oder Cmd nichts; andere Tasten nichts', () => {
    for (const m of ['ctrlKey', 'altKey', 'metaKey'] as const) expect(abspielTaste(taste('F4', { [m]: true }))).toBeUndefined();
    for (const c of ['F3', 'F5', 'F7', 'F10', 'KeyA', 'Space']) expect(abspielTaste(taste(c)), c).toBeUndefined();
  });
  it('Drossel: höchstens eine je 700 ms', () => { const d = new Drossel(700); expect(d.erlaubt(1000)).toBe(true); expect(d.erlaubt(1500)).toBe(false); expect(d.erlaubt(1700)).toBe(true); expect(d.erlaubt(2399)).toBe(false); });
});

describe('Aufnahme', () => {
  const h = 'a'.repeat(64), h2 = 'b'.repeat(64);
  it('Vergleich', () => {
    expect(vergleicheMedium(undefined, { groesse: 1, sha256: h })).toBe('neu');
    expect(vergleicheMedium({ groesse: 1, sha256: h }, { groesse: 1, sha256: h })).toBe('gleich');
    expect(vergleicheMedium({ groesse: 1, sha256: h }, { groesse: 2, sha256: h })).toBe('andere-groesse');
    expect(vergleicheMedium({ groesse: 1, sha256: h }, { groesse: 1, sha256: h2 })).toBe('andere-pruefsumme');
    expect(vergleicheMedium({ groesse: 1, sha256: 'ausgelassen' }, { groesse: 1, sha256: h2 })).toBe('gleich');
  });
  it('jede Art hat einen Satz in beiden Sprachen', () => { for (const v of ['neu', 'gleich', 'andere-groesse', 'andere-pruefsumme'] as const) for (const s of ['de', 'en'] as const) expect(mediumSatz(v, s).length).toBeGreaterThan(10); });
  it('Zeitmarken-Form folgt dem Text', () => {
    expect(zeitmarkenForm({ text: 'A: x #00:00:03-0#' } as Dokument)).toBe('f4'); expect(zeitmarkenForm({ text: 'A: x [00:00:03]' } as Dokument)).toBe('klammer'); expect(zeitmarkenForm({ text: 'A: x' } as Dokument)).toBe('f4');
  });
});

describe('Seiten', () => {
  it('bis 200 Beiträge eine Seite', () => { expect(seitenZahl(200)).toBe(1); expect(seitenBereich(200, 0)).toEqual({ von: 0, bis: 200 }); expect(seitenBereich(0, 0)).toEqual({ von: 0, bis: 0 }); });
  it('über 200: je 100', () => {
    expect(seitenZahl(201)).toBe(3); expect(seitenZahl(312)).toBe(4);
    expect(seitenBereich(312, 0)).toEqual({ von: 0, bis: 100 }); expect(seitenBereich(312, 3)).toEqual({ von: 300, bis: 312 }); expect(seitenBereich(312, 9)).toEqual({ von: 300, bis: 312 }); expect(seitenBereich(312, -2)).toEqual({ von: 0, bis: 100 });
  });
  it('Seite zu einem Beitrag', () => { expect(seiteVon(312, 0)).toBe(0); expect(seiteVon(312, 99)).toBe(0); expect(seiteVon(312, 100)).toBe(1); expect(seiteVon(312, 311)).toBe(3); expect(seiteVon(50, 40)).toBe(0); });
  it('Text „Beiträge 101 bis 200 von 312“', () => { expect(seitenText(312, 1, 'de')).toBe('Beiträge 101 bis 200 von 312'); expect(seitenText(312, 1, 'en')).toBe('Contributions 101 to 200 of 312'); });
});

describe('Beiträge', () => {
  it('Überschriften', () => {
    expect(beitragTitel(0, 'Anna', 83_000, 'de')).toBe('Anna, 00:01:23'); expect(beitragTitel(11, 'Anna', undefined, 'de')).toBe('Beitrag 12: Anna');
    expect(beitragTitel(11, undefined, undefined, 'de')).toBe('Beitrag 12'); expect(beitragTitel(11, undefined, 5000, 'de')).toBe('Beitrag 12, 00:00:05'); expect(beitragTitel(1, 'Ann', undefined, 'en')).toBe('Contribution 2: Ann');
  });
  it('Name des Abspiel-Knopfes', () => { expect(abspielName(83_000, 'de')).toBe('Ab hier abspielen (1 Minute 23)'); expect(abspielName(83_000, 'en')).toBe('Play from here (1 minute 23)'); });
});

describe('Kopf (Kodierschema)', () => {
  const ohne: { sprecher?: string; zeitMs?: number } = {};
  it('zählt führende Abschnitte ohne Sprecher und Zeit als Kopf', () => {
    expect(kopfAbschnitte([ohne, { sprecher: 'I' }, { sprecher: 'B' }])).toBe(1);
    expect(kopfAbschnitte([ohne, ohne, { zeitMs: 0 }])).toBe(2);
    expect(kopfAbschnitte([{ sprecher: 'I' }, ohne])).toBe(0);
  });
  it('einfacher Text ohne Sprecher und Zeit ist kein Kopf', () => {
    expect(kopfAbschnitte([ohne, ohne])).toBe(0); expect(kopfAbschnitte([])).toBe(0);
  });
  it('Titel verschieben die Nummerierung', () => {
    expect(beitragTitel(0, undefined, undefined, 'de', 1)).toBe('Kopf (Kodierschema)');
    expect(beitragTitel(1, undefined, undefined, 'de', 1)).toBe('Beitrag 1');
    expect(beitragTitel(2, 'Anna', undefined, 'en', 1)).toBe('Contribution 2: Anna');
    expect(kopfTitel(1, 'de')).toBe('Kopf, Teil 2'); expect(kopfTitel(0, 'en')).toBe('Header (transcription key)');
    expect(beitragBezeichnung(3, 2, 'en')).toBe('contribution 2'); expect(beitragBezeichnung(0, 1, 'de')).toBe('Kopf');
  });
});

describe('Teilen an der Schreibmarke', () => {
  const D = () => struktur([{ k: 'I', t: 'Wie war das?', zeitMs: 0, bisMs: 3000 }, { k: 'B', t: 'Gut 😀 und dann kam der Zug.', zeitMs: 3000, bisMs: 9000 }]);
  it('teilt nach dem Emoji (UTF-16 nach Codepoints)', () => {
    const d = D(), text = 'Gut 😀 und dann kam der Zug.', stelle = text.indexOf(' und');
    const n = teileAnSchreibmarke(d, 1, text, undefined, stelle);
    expect(n.transkript!.abschnitte.length).toBe(3);
    expect(inhaltVon(n, 1)).toBe('Gut 😀'); expect(inhaltVon(n, 2)).toBe('und dann kam der Zug.');
    expect(n.transkript!.abschnitte[1]!.zeitMs).toBe(3000); expect(n.transkript!.abschnitte[2]!.bisMs).toBe(9000);
  });
  it('übernimmt zuerst den geänderten Text', () => {
    const n = teileAnSchreibmarke(D(), 1, 'Sehr gut. Und weiter.', undefined, 'Sehr gut.'.length);
    expect(inhaltVon(n, 1)).toBe('Sehr gut.'); expect(inhaltVon(n, 2)).toBe('Und weiter.');
  });
  it('am Rand wirft es', () => {
    expect(() => teileAnSchreibmarke(D(), 1, 'Gut', undefined, 0)).toThrow();
    expect(() => teileAnSchreibmarke(D(), 1, 'Gut', undefined, 3)).toThrow();
  });
  it('gesperrter Text wirft', () => { expect(() => teileAnSchreibmarke(D(), 1, 'Gut und mehr', undefined, 4, { segmenteVorhanden: true })).toThrow(); });
});

describe('Hinweis-Zeile', () => {
  it('Stelle, Original und Vorschlag', () => {
    const d = struktur([{ k: 'I', t: 'Mhm, ja.', zeitMs: 0, bisMs: 1000 }, { k: 'B', t: 'Das war äm gut.', zeitMs: 1000, bisMs: 4000 }]);
    d.transkript!.sprecher = [{ id: 'I', name: 'Interviewerin' }, { id: 'B', name: 'Befragte' }];
    const hs = pruefeTranskript(d, 'einfach', 'de').filter(h => h.vorschlag !== undefined);
    expect(hs.length).toBeGreaterThan(0);
    const z = hinweisAnzeige(d, hs[0]!);
    expect(z.nr).toBe(hs[0]!.abschnitt + 1); expect(z.original.length).toBeGreaterThan(0); expect(z.vorschlag).toBeDefined();
  });
});

describe('Redeanteile als Datensatz', () => {
  const d = struktur([{ k: 'I', t: 'Eins zwei drei.', zeitMs: 0, bisMs: 3000 }, { k: 'B', t: 'Vier fünf sechs sieben acht neun.', zeitMs: 3000, bisMs: 9000 }]);
  d.name = 'Interview 1'; d.transkript!.sprecher = [{ id: 'I', name: 'Anna', rolle: 'interview' }, { id: 'B', name: 'Ben', rolle: 'befragt', fall: 'f1' }];
  it('eine Zeile je Dokument und Person, nur Text und Zahlen', () => {
    const r = redeanteileDatensatz([d, d], [{ id: 'f1', name: 'Fall Ben' }], 'de');
    expect(r.spalten.map(s => s.name)).toEqual(['dokument', 'person', 'rolle', 'fall', 'beitraege', 'woerter', 'anteil_woerter', 'sprechzeit_s', 'anteil_zeit']);
    expect(r.zeilen.length).toBe(4);
    const ben = r.zeilen.find(z => z[1] === 'Ben')!;
    expect(ben[0]).toBe('Interview 1'); expect(ben[2]).toBe('Befragte Person'); expect(ben[3]).toBe('Fall Ben'); expect(ben[4]).toBe(1); expect(ben[5]).toBe(6); expect(ben[7]).toBe(6);
    for (const z of r.zeilen) for (const w of z) expect(w === null || typeof w === 'string' || typeof w === 'number').toBe(true);
    expect(r.zeilen.every(z => z.length === r.spalten.length)).toBe(true);
  });
  it('ohne Zeiten bleibt die Sprechzeit leer', () => {
    const e = struktur([{ k: 'I', t: 'Eins.' }]);
    expect(redeanteileDatensatz([e], [], 'de').zeilen[0]![7]).toBeNull();
  });
  it('Dokumente ohne Transkript werden übersprungen', () => { expect(redeanteileDatensatz([{ id: 'x', name: 'x', text: '', art: 'text', erstellt: 0, geaendert: 0 } as Dokument], [], 'de').zeilen).toEqual([]); });
});

describe('Beispielinterview', () => {
  const roh = (ks: string[]) => ({ beitraege: ks.map(k => ({ sprecher: k })) }) as never;
  it('Interviewerin/Interviewer = interview, Studentin/Student = befragt, ein Dokument ein Fall', () => {
    for (const [i, b] of [['Interviewerin', 'Studentin'], ['Interviewer', 'Student']] as const) {
      const z = beispielZuordnung(roh([i, b, i]));
      expect(z.faelle).toBe('dokument');
      expect(z.personen).toEqual([{ kennung: i, name: i, rolle: 'interview' }, { kennung: b, name: b, rolle: 'befragt' }]);
    }
  });
  it('Dateinamen je Sprache', () => { expect(beispielDateien('de')).toEqual({ vtt: 'beispiel/interview/semesterplanung-de-teams.vtt', audio: 'beispiel/interview/semesterplanung-de.m4a' }); expect(beispielDateien('en').vtt).toContain('-en-'); });
  it('Fehlertexte in beiden Sprachen', () => {
    expect(fehlerText(new Error('Diesen Beitrag gibt es nicht.'), 'de')).toBe('Diesen Beitrag gibt es nicht.');
    expect(fehlerText(new Error('Diesen Beitrag gibt es nicht.'), 'en')).toBe('This contribution does not exist.');
    expect(fehlerText(new Error('Unbekannt'), 'en')).toBe('The change was not possible.');
  });
});

describe('Gedrosselte Ansage', () => {
  function umgebung() {
    let jetzt = 0; const plan: { f: () => void; zeit: number; aktiv: boolean }[] = [];
    const uhr = { jetzt: () => jetzt, nach: (f: () => void, ms: number) => { const p = { f, zeit: jetzt + ms, aktiv: true }; plan.push(p); return () => { p.aktiv = false; }; } };
    const lauf = (bis: number) => { for (;;) { const p = plan.filter(x => x.aktiv && x.zeit <= bis).sort((a, b) => a.zeit - b.zeit)[0]; if (!p) break; p.aktiv = false; jetzt = p.zeit; p.f(); } jetzt = bis; };
    return { uhr, lauf, setze: (z: number) => { jetzt = z; } };
  }
  it('die erste geht sofort, die zweite innerhalb von 700 ms wird nachgeholt', () => {
    const u = umgebung(), aus: string[] = [], g = new GedrosselteAnsage(t => aus.push(t), 700, u.uhr);
    g.sag('Angehalten bei 1 Minute 23'); expect(aus).toEqual(['Angehalten bei 1 Minute 23']);
    u.setze(300); g.sag('1 Minute 18'); expect(aus.length).toBe(1);
    u.lauf(699); expect(aus.length).toBe(1);
    u.lauf(700); expect(aus).toEqual(['Angehalten bei 1 Minute 23', '1 Minute 18']);
  });
  it('von mehreren wartenden bleibt die letzte', () => {
    const u = umgebung(), aus: string[] = [], g = new GedrosselteAnsage(t => aus.push(t), 700, u.uhr);
    g.sag('a'); u.setze(100); g.sag('b'); u.setze(200); g.sag('c'); u.lauf(1000);
    expect(aus).toEqual(['a', 'c']);
  });
  it('nach Ablauf geht die nächste wieder sofort; nach der nachgeholten wieder 700 ms Pause', () => {
    const u = umgebung(), aus: string[] = [], g = new GedrosselteAnsage(t => aus.push(t), 700, u.uhr);
    g.sag('a'); u.setze(100); g.sag('b'); u.lauf(700); u.setze(900); g.sag('c'); expect(aus).toEqual(['a', 'b']); u.lauf(1400); expect(aus).toEqual(['a', 'b', 'c']);
    u.setze(3000); g.sag('d'); expect(aus.at(-1)).toBe('d');
  });
  it('abbrechen verwirft das Wartende', () => {
    const u = umgebung(), aus: string[] = [], g = new GedrosselteAnsage(t => aus.push(t), 700, u.uhr);
    g.sag('a'); u.setze(100); g.sag('b'); g.abbrechen(); u.lauf(2000); expect(aus).toEqual(['a']);
  });
});
describe('Sprechzeit als Minuten:Sekunden', () => {
  it('0:55, 1:02:03', () => { expect(sprechzeitMinSek(55_364)).toBe('0:55'); expect(sprechzeitMinSek(3_723_000)).toBe('1:02:03'); expect(sprechzeitMinSek(59_600)).toBe('1:00'); expect(sprechzeitMinSek(0)).toBe('0:00'); });
  it('Datensatz: Sekunden mit einer Nachkommastelle', () => {
    const d = struktur([{ k: 'I', t: 'Eins.', zeitMs: 0, bisMs: 55_364 }, { k: 'B', t: 'Zwei.', zeitMs: 55_364, bisMs: 60_000 }]);
    expect(redeanteileDatensatz([d], [], 'de').zeilen.map(z => z[7])).toEqual([55.4, 4.6]);
  });
});
