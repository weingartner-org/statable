import { describe, expect, it } from 'vitest';
import { neuesQualProjekt } from './qualprojekt';
import type { Einwilligung, EinwilligungsPunkt, EinwilligungsStand, QualProjekt } from './qualprojekt';
import {
  WIDERRUF_SATZ, aktuelleEinwilligung, bestaetigeGeloescht, erledigeWiedervorlage, exportWarnungen, faelleVonDokumenten, neueEinwilligung,
  oeffnenHinweise, setzePunkt, standVon, widerrufe
} from './einwilligung';
import type { ExportWeg } from './einwilligung';

/* Sollwerte F2B: FACHBLATT-EINWILLIGUNG.md Abschnitte 4 und 7, SCHNITTSTELLEN-F2.md 2.1. Festlegungen ohne Vorgabe im Blatt: SOLLWERTE-F2.md. */

const WEGE: ExportWeg[] = ['belegstellen', 'fall-kategorie-matrix', 'zwischenfazit', 'feinstruktur-word', 'joint-display', 'qdpx', 'projektdatei', 'fall-code-matrix-zitate', 'archiv'];
const OHNE_ARCHIV = WEGE.filter((w) => w !== 'archiv');
const PUNKTE: EinwilligungsPunkt[] = ['teilnahme', 'aufnahme', 'transkript', 'zitate', 'archivierung', 'weitergabe'];
const HEUTE = '2027-03-17';

type Staende = Partial<Record<EinwilligungsPunkt, [EinwilligungsStand, string?]>>;
/** Eine Einwilligung, in der alle sechs Punkte `erteilt` sind, außer den angegebenen. */
function ew(id: string, fall: string, staende: Staende = {}, erstellt = 1, extra: Partial<Einwilligung> = {}): Einwilligung {
  return {
    id, fall, fassung: 'Info-Blatt 2027-03', form: 'schriftlich', erstellt, geaendert: erstellt,
    punkte: PUNKTE.map((punkt) => { const s = staende[punkt]; return s ? { punkt, stand: s[0], ...(s[1] ? { datum: s[1] } : {}) } : { punkt, stand: 'erteilt' as const }; }),
    ...extra
  };
}
function projekt(...e: Einwilligung[]): QualProjekt {
  const q = neuesQualProjekt('E');
  q.faelle.push({ id: 'f1', name: 'B1', werte: {} }, { id: 'f2', name: 'B2', werte: {} }, { id: 'f3', name: 'B3', werte: {} });
  q.einwilligungen = e;
  return q;
}
const warn = (q: QualProjekt, weg: ExportWeg, faelle = ['f3'], sp: 'de' | 'en' = 'de') => exportWarnungen(q, weg, faelle, sp);

describe('aktuelleEinwilligung und standVon', () => {
  it('keine Einwilligung: undefined; eine: diese', () => {
    expect(aktuelleEinwilligung(projekt(), 'f3')).toBeUndefined();
    const e = ew('e1', 'f3');
    expect(aktuelleEinwilligung(projekt(e), 'f3')).toBe(e);
    expect(aktuelleEinwilligung(projekt(e), 'f1')).toBeUndefined();
  });
  it('bei mehreren zählt die mit dem größten erstellt, in jeder Reihenfolge der Liste', () => {
    const alt = ew('alt', 'f3', {}, 1), neu = ew('neu', 'f3', {}, 2);
    expect(aktuelleEinwilligung(projekt(alt, neu), 'f3')!.id).toBe('neu');
    expect(aktuelleEinwilligung(projekt(neu, alt), 'f3')!.id).toBe('neu');
  });
  it('standVon: Stand des Punktes, „fehlt“ ohne Einwilligung oder ohne den Punkt', () => {
    const e = ew('e1', 'f3', { zitate: ['widerrufen', '2027-03-12'] });
    expect(standVon(e, 'zitate')).toBe('widerrufen');
    expect(standVon(e, 'teilnahme')).toBe('erteilt');
    expect(standVon(undefined, 'zitate')).toBe('fehlt');
    expect(standVon({ ...e, punkte: [] }, 'zitate')).toBe('fehlt');
  });
});

describe('exportWarnungen: Zitate, je Stand und je Exportweg', () => {
  it.each(OHNE_ARCHIV)('%s: Zitate erteilt gibt keine Warnung', (weg) => {
    expect(warn(projekt(ew('e1', 'f3')), weg)).toEqual([]);
  });
  for (const stand of ['abgelehnt', 'widerrufen', 'offen'] as const) {
    it.each(OHNE_ARCHIV)(`%s: Zitate ${stand} gibt genau eine Warnung „zitate“`, (weg) => {
      const r = warn(projekt(ew('e1', 'f3', { zitate: [stand, '2027-03-12'] })), weg);
      expect(r).toHaveLength(1);
      expect(r[0]).toMatchObject({ art: 'zitate', fall: 'f3', punkt: 'zitate', stand, datum: '2027-03-12' });
      expect(r[0]!.satz).toContain('B3');
      expect(r[0]!.satz).toContain('Zitate');
      expect(r[0]!.satz).toContain(`Stand: ${stand} am 12.03.2027`);
    });
    it(`archiv: Zitate ${stand} gibt keine Warnung (Archivierung erteilt)`, () => {
      expect(warn(projekt(ew('e1', 'f3', { zitate: [stand] })), 'archiv')).toEqual([]);
    });
  }
  it('Satz mit Datum folgt dem Muster des Fachblatts, ohne Datum steht kein „am“', () => {
    const mit = warn(projekt(ew('e1', 'f3', { zitate: ['widerrufen', '2027-03-12'] })), 'belegstellen')[0]!;
    expect(mit.satz).toBe('Der Export enthält Text von Fall B3. Für Zitate liegt keine Zustimmung vor (Stand: widerrufen am 12.03.2027).');
    const ohne = warn(projekt(ew('e1', 'f3', { zitate: ['offen'] })), 'belegstellen')[0]!;
    expect(ohne.datum).toBeUndefined();
    expect(ohne.satz).toContain('Stand: offen');
    expect(ohne.satz).not.toMatch(/Stand: offen am/);
    expect(ohne.satz).toContain('Fall B3');
  });
  it('Englisch: Datum als JJJJ-MM-TT, nie als 12.03.2027; Satz nennt den Fall', () => {
    const r = warn(projekt(ew('e1', 'f3', { zitate: ['widerrufen', '2027-03-12'] })), 'belegstellen', ['f3'], 'en')[0]!;
    expect(r.satz).toContain('B3');
    expect(r.satz).toContain('2027-03-12');
    expect(r.satz).not.toContain('12.03.2027');
    expect(r.satz).not.toContain('Zustimmung');
    expect(r.datum).toBe('2027-03-12');
  });
  it('Deutsch: das Datum steht nie als 2027-03-12 im Satz', () => {
    const r = warn(projekt(ew('e1', 'f3', { zitate: ['widerrufen', '2027-03-12'] })), 'belegstellen')[0]!;
    expect(r.satz).not.toContain('2027-03-12');
  });
});

describe('exportWarnungen: Teilnahme', () => {
  for (const stand of ['widerrufen', 'abgelehnt'] as const) {
    it.each(WEGE)(`%s: Teilnahme ${stand} gibt eine Warnung „teilnahme“ (auch beim Archiv)`, (weg) => {
      const r = warn(projekt(ew('e1', 'f3', { teilnahme: [stand, '2027-03-02'] })), weg);
      expect(r).toHaveLength(1);
      expect(r[0]).toMatchObject({ art: 'teilnahme', fall: 'f3', punkt: 'teilnahme', stand, datum: '2027-03-02' });
      expect(r[0]!.satz).toContain('B3');
      expect(r[0]!.satz).toContain(stand);
      expect(r[0]!.satz).toContain('02.03.2027');
    });
  }
  it.each(WEGE)('%s: Teilnahme offen gibt keine Warnung (nur widerrufen und abgelehnt zählen)', (weg) => {
    expect(warn(projekt(ew('e1', 'f3', { teilnahme: ['offen'] })), weg)).toEqual([]);
  });
  it.each(OHNE_ARCHIV)('%s: Teilnahme widerrufen und Zitate widerrufen: zwei Warnungen, Teilnahme zuerst', (weg) => {
    const r = warn(projekt(ew('e1', 'f3', { teilnahme: ['widerrufen'], zitate: ['widerrufen'] })), weg);
    expect(r.map((w) => w.art)).toEqual(['teilnahme', 'zitate']);
  });
});

describe('exportWarnungen: Archivierung (nur Weg „archiv“)', () => {
  it('Archivierung erteilt: keine Warnung', () => {
    expect(warn(projekt(ew('e1', 'f3')), 'archiv')).toEqual([]);
  });
  for (const stand of ['offen', 'abgelehnt', 'widerrufen'] as const) {
    it(`Archivierung ${stand}: eine Warnung „archivierung“`, () => {
      const r = warn(projekt(ew('e1', 'f3', { archivierung: [stand, '2027-03-05'] })), 'archiv');
      expect(r).toHaveLength(1);
      expect(r[0]).toMatchObject({ art: 'archivierung', fall: 'f3', punkt: 'archivierung', stand, datum: '2027-03-05' });
      expect(r[0]!.satz).toContain('B3');
      expect(r[0]!.satz).toContain('Archivierung');
      expect(r[0]!.satz).toContain('05.03.2027');
    });
    it.each(OHNE_ARCHIV)(`%s: Archivierung ${stand} gibt bei anderen Wegen keine Warnung`, (weg) => {
      expect(warn(projekt(ew('e1', 'f3', { archivierung: [stand] })), weg)).toEqual([]);
    });
  }
  it('Teilnahme widerrufen und Archivierung offen: zuerst Teilnahme, dann Archivierung; Zitate werden beim Archiv ignoriert', () => {
    const r = warn(projekt(ew('e1', 'f3', { teilnahme: ['widerrufen'], zitate: ['widerrufen'], archivierung: ['offen'] })), 'archiv');
    expect(r.map((w) => w.art)).toEqual(['teilnahme', 'archivierung']);
  });
});

describe('exportWarnungen: keine Einwilligung eingetragen', () => {
  it.each(WEGE)('%s: genau eine Warnung „keine-einwilligung“ mit Stand „fehlt“', (weg) => {
    const r = warn(projekt(), weg);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ art: 'keine-einwilligung', fall: 'f3', stand: 'fehlt' });
    expect(r[0]!.punkt).toBeUndefined();
    expect(r[0]!.satz).toBe('Für Fall B3 ist keine Einwilligung eingetragen. Trotzdem exportieren?');
  });
  it('Einwilligung eines anderen Falls zählt nicht', () => {
    const r = warn(projekt(ew('e1', 'f1')), 'belegstellen');
    expect(r.map((w) => w.art)).toEqual(['keine-einwilligung']);
  });
  it('Englisch: Satz nennt den Fall', () => {
    expect(warn(projekt(), 'belegstellen', ['f3'], 'en')[0]!.satz).toContain('B3');
  });
});

describe('exportWarnungen: Randfälle', () => {
  it('Punkt fehlt in der Liste: Zitate zählen wie nicht erteilt (Stand „fehlt“), Teilnahme gibt keine Warnung', () => {
    const e = { ...ew('e1', 'f3'), punkte: [] };
    const r = warn(projekt(e), 'belegstellen');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ art: 'zitate', punkt: 'zitate', stand: 'fehlt' });
    expect(warn(projekt(e), 'archiv')[0]).toMatchObject({ art: 'archivierung', punkt: 'archivierung', stand: 'fehlt' });
  });
  it('Reihenfolge der Warnungen folgt q.faelle, nicht der übergebenen Liste', () => {
    const q = projekt(ew('e1', 'f1', { zitate: ['offen'] }), ew('e3', 'f3', { zitate: ['offen'] }));
    expect(warn(q, 'belegstellen', ['f3', 'f1']).map((w) => w.fall)).toEqual(['f1', 'f3']);
  });
  it('mehrere Fälle: Fälle ohne Warnung fallen weg, Fall ohne Einwilligung kommt dazu', () => {
    const q = projekt(ew('e1', 'f1'), ew('e3', 'f3', { zitate: ['abgelehnt'] }));
    expect(warn(q, 'belegstellen', ['f1', 'f2', 'f3']).map((w) => [w.fall, w.art])).toEqual([['f2', 'keine-einwilligung'], ['f3', 'zitate']]);
  });
  it('doppelte Kennungen ergeben nur eine Warnung', () => {
    expect(warn(projekt(), 'belegstellen', ['f3', 'f3'])).toHaveLength(1);
  });
  it('unbekannte Fall-ids werden still übergangen; leere Liste gibt []', () => {
    expect(warn(projekt(), 'belegstellen', ['gibtsnicht'])).toEqual([]);
    expect(warn(projekt(), 'belegstellen', ['gibtsnicht', 'f3']).map((w) => w.fall)).toEqual(['f3']);
    expect(warn(projekt(), 'belegstellen', [])).toEqual([]);
  });
  it('bei mehreren Einwilligungen je Fall zählt die neueste (alt: Zitate erteilt, neu: widerrufen und umgekehrt)', () => {
    const altGut = ew('alt', 'f3', {}, 1), neuSchlecht = ew('neu', 'f3', { zitate: ['widerrufen', '2027-03-12'] }, 2);
    expect(warn(projekt(altGut, neuSchlecht), 'belegstellen').map((w) => w.art)).toEqual(['zitate']);
    expect(warn(projekt(neuSchlecht, altGut), 'belegstellen').map((w) => w.art)).toEqual(['zitate']);
    const altSchlecht = ew('alt', 'f3', { zitate: ['widerrufen'] }, 1), neuGut = ew('neu', 'f3', {}, 2);
    expect(warn(projekt(altSchlecht, neuGut), 'belegstellen')).toEqual([]);
    expect(warn(projekt(neuGut, altSchlecht), 'belegstellen')).toEqual([]);
  });
  it('die Funktion sperrt nie und ändert das Projekt nicht', () => {
    const q = projekt(ew('e1', 'f3', { zitate: ['widerrufen'] }));
    const vorher = JSON.stringify(q);
    warn(q, 'belegstellen');
    expect(JSON.stringify(q)).toBe(vorher);
  });
});

describe('faelleVonDokumenten', () => {
  function mitDokumenten(): QualProjekt {
    const q = projekt();
    q.faelle.push({ id: 'f4', name: 'B4', werte: {} });
    const dok = (id: string, extra: object) => ({ id, name: id, art: 'text' as const, text: 'x', erstellt: 1, geaendert: 1, ...extra });
    q.dokumente.push(
      dok('d1', { fall: 'f1' }),
      dok('d2', { transkript: { sprecher: [{ id: 'a', name: 'I', rolle: 'interview' }, { id: 'b', name: 'B', rolle: 'befragt', fall: 'f2' }], abschnitte: [] } }),
      dok('d3', { transkript: { sprecher: [{ id: 'a', name: 'I', rolle: 'interview', fall: 'f3' }], abschnitte: [] } }),
      dok('d4', { transkript: { sprecher: [{ id: 'a', name: 'X', fall: 'f4' }], abschnitte: [] } }),
      dok('d5', {})
    );
    return q;
  }
  it('Dokument.fall und Sprecher mit Rolle „befragt“ oder ohne Rolle', () => {
    expect(faelleVonDokumenten(mitDokumenten(), ['d1', 'd2', 'd4'])).toEqual(['f1', 'f2', 'f4']);
  });
  it('Sprecher mit Rolle „interview“ zählt nicht, auch wenn er einen Fall hat', () => {
    expect(faelleVonDokumenten(mitDokumenten(), ['d3'])).toEqual([]);
  });
  it('ohne Doppelte; Reihenfolge wie q.faelle, nicht wie die übergebene Liste', () => {
    expect(faelleVonDokumenten(mitDokumenten(), ['d4', 'd2', 'd1', 'd1'])).toEqual(['f1', 'f2', 'f4']);
  });
  it('unbekannte Dokumente, Dokumente ohne Fall und leere Liste: []', () => {
    expect(faelleVonDokumenten(mitDokumenten(), ['d5', 'gibtsnicht'])).toEqual([]);
    expect(faelleVonDokumenten(mitDokumenten(), [])).toEqual([]);
  });
});

describe('oeffnenHinweise: Löschdatum', () => {
  const loe = (bis: string, extra: object = {}, was: 'aufnahme' | 'kontaktdaten' = 'aufnahme') => projekt(ew('e1', 'f3', {}, 1, { loeschen: [{ was, bis, ...extra }] }));
  it('in 15 Tagen: kein Hinweis', () => expect(oeffnenHinweise(loe('2027-04-01'), HEUTE, 'de')).toEqual([]));
  it('in 14 Tagen: Hinweis „loeschen-bald“ mit dem Satz des Fachblatts', () => {
    const r = oeffnenHinweise(loe('2027-03-31'), HEUTE, 'de');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ art: 'loeschen-bald', fall: 'f3', einwilligung: 'e1', datum: '2027-03-31' });
    expect(r[0]!.satz).toBe('Für Fall B3 ist das Löschen der Aufnahme bis 31.03.2027 vorgesehen.');
  });
  it('heute: Hinweis „loeschen-bald“', () => expect(oeffnenHinweise(loe(HEUTE), HEUTE, 'de').map((h) => h.art)).toEqual(['loeschen-bald']));
  it('gestern: Hinweis „loeschen-ueberfaellig“, der Satz sagt „überfällig“ und nennt Fall und Datum', () => {
    const r = oeffnenHinweise(loe('2027-03-16'), HEUTE, 'de');
    expect(r.map((h) => h.art)).toEqual(['loeschen-ueberfaellig']);
    expect(r[0]!.satz).toContain('B3');
    expect(r[0]!.satz).toContain('16.03.2027');
    expect(r[0]!.satz).toMatch(/überfällig/);
    expect(r[0]!.datum).toBe('2027-03-16');
  });
  it('lange überfällig bleibt überfällig', () => expect(oeffnenHinweise(loe('2026-01-01'), HEUTE, 'de').map((h) => h.art)).toEqual(['loeschen-ueberfaellig']));
  it('erledigt: kein Hinweis (bald und überfällig)', () => {
    expect(oeffnenHinweise(loe('2027-03-31', { erledigt: '2027-03-15' }), HEUTE, 'de')).toEqual([]);
    expect(oeffnenHinweise(loe('2027-03-01', { erledigt: '2027-03-15' }), HEUTE, 'de')).toEqual([]);
  });
  it('Kontaktdaten: der Satz nennt die Kontaktdaten', () => {
    expect(oeffnenHinweise(loe('2027-03-31', {}, 'kontaktdaten'), HEUTE, 'de')[0]!.satz).toContain('Kontaktdaten');
  });
  it('Englisch: Datum als JJJJ-MM-TT', () => {
    const r = oeffnenHinweise(loe('2027-03-31'), HEUTE, 'en');
    expect(r[0]!.satz).toContain('B3');
    expect(r[0]!.satz).toContain('2027-03-31');
    expect(r[0]!.satz).not.toContain('31.03.2027');
  });
  it('Monatsgrenze (Februar 2027 hat 28 Tage): 14 Tage Hinweis, 15 Tage keiner', () => {
    expect(oeffnenHinweise(loe('2027-03-06'), '2027-02-20', 'de').map((h) => h.art)).toEqual(['loeschen-bald']);
    expect(oeffnenHinweise(loe('2027-03-07'), '2027-02-20', 'de')).toEqual([]);
  });
  it('Schaltjahr 2028: vom 15.02. bis 29.02. sind es 14 Tage, bis 01.03. sind es 15', () => {
    expect(oeffnenHinweise(loe('2028-02-29'), '2028-02-15', 'de').map((h) => h.art)).toEqual(['loeschen-bald']);
    expect(oeffnenHinweise(loe('2028-03-01'), '2028-02-15', 'de')).toEqual([]);
  });
  it('Jahresgrenze: 25.12. bis 08.01. sind 14 Tage, bis 09.01. sind es 15', () => {
    expect(oeffnenHinweise(loe('2028-01-08'), '2027-12-25', 'de').map((h) => h.art)).toEqual(['loeschen-bald']);
    expect(oeffnenHinweise(loe('2028-01-09'), '2027-12-25', 'de')).toEqual([]);
  });
  it('Zeitumstellung stört nicht: 26.03. bis 09.04.2027 sind 14 Tage', () => {
    expect(oeffnenHinweise(loe('2027-04-09'), '2027-03-26', 'de').map((h) => h.art)).toEqual(['loeschen-bald']);
    expect(oeffnenHinweise(loe('2027-04-10'), '2027-03-26', 'de')).toEqual([]);
  });
});

describe('oeffnenHinweise: Wiedervorlage', () => {
  const wv = (datum: string, extra: object = {}) => projekt(ew('e1', 'f3', {}, 1, { wiedervorlage: [{ datum, anlass: 'vor der Veröffentlichung noch einmal fragen', ...extra }] }));
  it('heute: Hinweis mit dem Satz des Fachblatts', () => {
    const r = oeffnenHinweise(wv(HEUTE), HEUTE, 'de');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ art: 'wiedervorlage', fall: 'f3', einwilligung: 'e1' });
    expect(r[0]!.satz).toBe('Für Fall B3 ist eine Wiedervorlage fällig: vor der Veröffentlichung noch einmal fragen.');
  });
  it('früher fällig und nicht erledigt: Hinweis', () => expect(oeffnenHinweise(wv('2027-03-10'), HEUTE, 'de').map((h) => h.art)).toEqual(['wiedervorlage']));
  it('morgen: kein Hinweis', () => expect(oeffnenHinweise(wv('2027-03-18'), HEUTE, 'de')).toEqual([]));
  it('erledigt: kein Hinweis', () => expect(oeffnenHinweise(wv(HEUTE, { erledigt: '2027-03-16' }), HEUTE, 'de')).toEqual([]));
  it('Englisch: Satz nennt den Anlass und den Fall', () => {
    const r = oeffnenHinweise(wv(HEUTE), HEUTE, 'en');
    expect(r[0]!.satz).toContain('B3');
    expect(r[0]!.satz).toContain('vor der Veröffentlichung noch einmal fragen');
  });
});

describe('oeffnenHinweise: Aufnahme widerrufen', () => {
  const aw = (loeschen?: Einwilligung['loeschen']) => projekt(ew('e1', 'f3', { aufnahme: ['widerrufen', '2027-03-12'] }, 1, loeschen ? { loeschen } : {}));
  it('ohne Löscheintrag: Hinweis „aufnahme-widerrufen“ mit dem Satz des Fachblatts', () => {
    const r = oeffnenHinweise(aw(), HEUTE, 'de');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ art: 'aufnahme-widerrufen', fall: 'f3', einwilligung: 'e1' });
    expect(r[0]!.satz).toBe('Fall B3 hat die Zustimmung zur Aufnahme widerrufen. Ist die Aufnahme gelöscht?');
  });
  it('mit bestätigtem Löschen der Aufnahme: kein Hinweis', () => {
    expect(oeffnenHinweise(aw([{ was: 'aufnahme', bis: '2027-03-20', erledigt: '2027-03-14' }]), HEUTE, 'de')).toEqual([]);
  });
  it('geplantes, aber noch nicht erledigtes Löschen der Aufnahme: Hinweis bleibt', () => {
    expect(oeffnenHinweise(aw([{ was: 'aufnahme', bis: '2028-01-01' }]), HEUTE, 'de').map((h) => h.art)).toEqual(['aufnahme-widerrufen']);
  });
  it('erledigtes Löschen der Kontaktdaten genügt nicht', () => {
    expect(oeffnenHinweise(aw([{ was: 'kontaktdaten', bis: '2027-03-20', erledigt: '2027-03-14' }]), HEUTE, 'de').map((h) => h.art)).toEqual(['aufnahme-widerrufen']);
  });
  it('Aufnahme nur abgelehnt oder offen: kein Hinweis', () => {
    expect(oeffnenHinweise(projekt(ew('e1', 'f3', { aufnahme: ['abgelehnt'] })), HEUTE, 'de')).toEqual([]);
    expect(oeffnenHinweise(projekt(ew('e1', 'f3', { aufnahme: ['offen'] })), HEUTE, 'de')).toEqual([]);
  });
});

describe('oeffnenHinweise: Reihenfolge, aktuelle Einwilligung, nichts zu melden', () => {
  it('im Fall: Aufnahme widerrufen, dann Löschen, dann Wiedervorlage', () => {
    const e = ew('e1', 'f3', { aufnahme: ['widerrufen'] }, 1, { loeschen: [{ was: 'kontaktdaten', bis: '2027-03-20' }], wiedervorlage: [{ datum: HEUTE, anlass: 'fragen' }] });
    expect(oeffnenHinweise(projekt(e), HEUTE, 'de').map((h) => h.art)).toEqual(['aufnahme-widerrufen', 'loeschen-bald', 'wiedervorlage']);
  });
  it('Fälle wie in q.faelle, nicht wie in der Liste der Einwilligungen', () => {
    const e3 = ew('e3', 'f3', {}, 1, { wiedervorlage: [{ datum: HEUTE, anlass: 'a' }] });
    const e1 = ew('e1', 'f1', {}, 1, { wiedervorlage: [{ datum: HEUTE, anlass: 'b' }] });
    expect(oeffnenHinweise(projekt(e3, e1), HEUTE, 'de').map((h) => h.fall)).toEqual(['f1', 'f3']);
  });
  it('nur die aktuelle Einwilligung je Fall zählt', () => {
    const alt = ew('alt', 'f3', {}, 1, { wiedervorlage: [{ datum: HEUTE, anlass: 'a' }] });
    const neu = ew('neu', 'f3', {}, 2);
    expect(oeffnenHinweise(projekt(alt, neu), HEUTE, 'de')).toEqual([]);
    expect(oeffnenHinweise(projekt(neu, alt), HEUTE, 'de')).toEqual([]);
  });
  it('ohne Einwilligungen oder ohne Fristen: []', () => {
    expect(oeffnenHinweise(projekt(), HEUTE, 'de')).toEqual([]);
    expect(oeffnenHinweise(projekt(ew('e1', 'f3')), HEUTE, 'de')).toEqual([]);
    const q = neuesQualProjekt('leer');
    expect(oeffnenHinweise(q, HEUTE, 'de')).toEqual([]);
  });
});

describe('neueEinwilligung', () => {
  it('alle sechs Punkte „offen“, Kennung, Zeit', () => {
    const e = neueEinwilligung('f3', 'Info-Blatt 2027-03', 'muendlich-aufnahme', 1234);
    expect(e).toMatchObject({ fall: 'f3', fassung: 'Info-Blatt 2027-03', form: 'muendlich-aufnahme', erstellt: 1234, geaendert: 1234 });
    expect(e.punkte.map((p) => p.punkt)).toEqual(PUNKTE);
    expect(e.punkte.every((p) => p.stand === 'offen')).toBe(true);
    expect(typeof e.id).toBe('string');
    expect(e.id.length).toBeGreaterThan(5);
    expect(neueEinwilligung('f3', 'x', 'digital').id).not.toBe(neueEinwilligung('f3', 'x', 'digital').id);
  });
});

describe('Änderungen: setzePunkt, widerrufe, bestaetigeGeloescht, erledigeWiedervorlage', () => {
  it('setzePunkt: neues Projekt, Original bleibt, Stand und Datum gesetzt, ein Eintrag im Protokoll', () => {
    const e = ew('e1', 'f3', { zitate: ['offen'] });
    const q = projekt(e);
    const r = setzePunkt(q, 'e1', 'zitate', 'erteilt', '2027-03-15', 'k1');
    expect(r).not.toBe(q);
    expect(standVon(q.einwilligungen![0], 'zitate')).toBe('offen');
    const neu = r.einwilligungen![0]!;
    expect(neu.punkte.find((p) => p.punkt === 'zitate')).toMatchObject({ stand: 'erteilt', datum: '2027-03-15' });
    expect(neu.punkte.filter((p) => p.punkt !== 'zitate')).toEqual(q.einwilligungen![0]!.punkte.filter((p) => p.punkt !== 'zitate'));
    expect(neu.geaendert).toBeGreaterThan(e.geaendert);
    expect(r.protokoll).toHaveLength(q.protokoll.length + 1);
    const p = r.protokoll[r.protokoll.length - 1]!;
    expect(p.was).toContain('B3');
    expect(p.was).toMatch(/Zitate/);
    expect(p.vorher).toBe('offen');
    expect(p.nachher).toBe('erteilt');
    expect(p.kodierende).toBe('k1');
  });
  it('setzePunkt: fehlt der Punkt in der Liste, wird er angehängt; unbekannte Einwilligung ändert nichts', () => {
    const q = projekt({ ...ew('e1', 'f3'), punkte: [] });
    expect(setzePunkt(q, 'e1', 'zitate', 'erteilt', '2027-03-15').einwilligungen![0]!.punkte).toEqual([{ punkt: 'zitate', stand: 'erteilt', datum: '2027-03-15' }]);
    expect(setzePunkt(q, 'gibtsnicht', 'zitate', 'erteilt', '2027-03-15')).toEqual(q);
  });
  it('widerrufe: Stand „widerrufen“ mit Datum, Eintrag in widerrufe, andere Punkte unberührt, Original bleibt', () => {
    const q = projekt(ew('e1', 'f3'));
    const r = widerrufe(q, 'e1', ['zitate', 'weitergabe'], '2027-03-12', 'per Mail', 'k1');
    expect(r).not.toBe(q);
    expect(q.einwilligungen![0]!.widerrufe).toBeUndefined();
    const e = r.einwilligungen![0]!;
    expect(standVon(e, 'zitate')).toBe('widerrufen');
    expect(standVon(e, 'weitergabe')).toBe('widerrufen');
    expect(standVon(e, 'teilnahme')).toBe('erteilt');
    expect(standVon(e, 'archivierung')).toBe('erteilt');
    expect(e.punkte.find((p) => p.punkt === 'zitate')!.datum).toBe('2027-03-12');
    expect(e.widerrufe).toEqual([{ datum: '2027-03-12', punkte: ['zitate', 'weitergabe'], notiz: 'per Mail' }]);
    expect(r.protokoll).toHaveLength(1);
    expect(r.protokoll[0]!.kodierende).toBe('k1');
    expect(r.protokoll[0]!.was).toContain('B3');
  });
  it('widerrufe hängt an: ein zweiter Widerruf überschreibt den ersten nicht; alte Protokolleinträge bleiben lesbar', () => {
    const r1 = widerrufe(projekt(ew('e1', 'f3')), 'e1', ['zitate'], '2027-03-12');
    const r2 = widerrufe(r1, 'e1', ['aufnahme'], '2027-03-14', 'mündlich');
    const e = r2.einwilligungen![0]!;
    expect(e.widerrufe).toHaveLength(2);
    expect(e.widerrufe![0]).toMatchObject({ datum: '2027-03-12', punkte: ['zitate'] });
    expect(e.widerrufe![1]).toMatchObject({ datum: '2027-03-14', punkte: ['aufnahme'], notiz: 'mündlich' });
    expect(r2.protokoll).toHaveLength(2);
    expect(r2.protokoll[0]).toEqual(r1.protokoll[0]);
    expect(standVon(e, 'zitate')).toBe('widerrufen');
    expect(standVon(e, 'aufnahme')).toBe('widerrufen');
  });
  it('widerrufe mit Aufnahme führt zum Hinweis beim Öffnen', () => {
    const r = widerrufe(projekt(ew('e1', 'f3')), 'e1', ['aufnahme'], '2027-03-12');
    expect(oeffnenHinweise(r, HEUTE, 'de').map((h) => h.art)).toEqual(['aufnahme-widerrufen']);
  });
  it('bestaetigeGeloescht ohne Löscheintrag: legt einen erledigten Eintrag an, der Hinweis verschwindet', () => {
    const q = projekt(ew('e1', 'f3', { aufnahme: ['widerrufen'] }));
    expect(oeffnenHinweise(q, HEUTE, 'de')).toHaveLength(1);
    const r = bestaetigeGeloescht(q, 'e1', 'aufnahme', HEUTE, 'k1');
    expect(r).not.toBe(q);
    expect(q.einwilligungen![0]!.loeschen).toBeUndefined();
    expect(r.einwilligungen![0]!.loeschen).toEqual([{ was: 'aufnahme', bis: HEUTE, erledigt: HEUTE }]);
    expect(oeffnenHinweise(r, HEUTE, 'de')).toEqual([]);
    expect(r.protokoll).toHaveLength(1);
    expect(r.protokoll[0]!.kodierende).toBe('k1');
  });
  it('bestaetigeGeloescht mit geplantem Eintrag: dieser wird erledigt, es kommt kein zweiter dazu', () => {
    const q = projekt(ew('e1', 'f3', {}, 1, { loeschen: [{ was: 'aufnahme', bis: '2027-03-25' }, { was: 'kontaktdaten', bis: '2027-09-01' }] }));
    const r = bestaetigeGeloescht(q, 'e1', 'aufnahme', HEUTE);
    expect(r.einwilligungen![0]!.loeschen).toEqual([{ was: 'aufnahme', bis: '2027-03-25', erledigt: HEUTE }, { was: 'kontaktdaten', bis: '2027-09-01' }]);
    expect(r.protokoll).toHaveLength(1);
  });
  it('erledigeWiedervorlage: nur der gewählte Eintrag, mit Datum, ein Protokolleintrag, Original bleibt', () => {
    const q = projekt(ew('e1', 'f3', {}, 1, { wiedervorlage: [{ datum: '2027-03-01', anlass: 'a' }, { datum: HEUTE, anlass: 'b' }] }));
    const r = erledigeWiedervorlage(q, 'e1', 1, HEUTE, 'k1');
    expect(r).not.toBe(q);
    expect(q.einwilligungen![0]!.wiedervorlage![1]!.erledigt).toBeUndefined();
    expect(r.einwilligungen![0]!.wiedervorlage).toEqual([{ datum: '2027-03-01', anlass: 'a' }, { datum: HEUTE, anlass: 'b', erledigt: HEUTE }]);
    expect(r.protokoll).toHaveLength(1);
    expect(oeffnenHinweise(r, HEUTE, 'de').map((h) => h.satz)).toEqual([expect.stringContaining('Wiedervorlage')]);   // Eintrag 0 ist noch fällig
  });
  it('erledigeWiedervorlage mit ungültigem Index oder unbekannter Einwilligung ändert nichts', () => {
    const q = projekt(ew('e1', 'f3', {}, 1, { wiedervorlage: [{ datum: HEUTE, anlass: 'b' }] }));
    expect(erledigeWiedervorlage(q, 'e1', 5, HEUTE)).toEqual(q);
    expect(erledigeWiedervorlage(q, 'gibtsnicht', 0, HEUTE)).toEqual(q);
  });
});

describe('WIDERRUF_SATZ', () => {
  it('Deutsch wörtlich nach dem Fachblatt', () => {
    expect(WIDERRUF_SATZ.de).toBe('Ein Widerruf gilt für die Zukunft. Was schon veröffentlicht ist, lässt sich meist nicht zurückholen. Klären Sie mit der Person und Ihrer Hochschule, was zu tun ist.');
  });
  it('Englisch vorhanden und sagt „future“', () => {
    expect(WIDERRUF_SATZ.en).toMatch(/future/i);
    expect(WIDERRUF_SATZ.en).not.toBe(WIDERRUF_SATZ.de);
  });
});
