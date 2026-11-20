import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { pruefeDocx } from '../../../scripts/docx-pruefen.mjs';
import type { FragebogenPlan } from './fragebogenplan';
import { baueTeilnahmeWord, einwilligungText, EINORDNUNG, KEINE_RECHTSBERATUNG, mitDatenschutzTexten, offenePlatzhalter, teilnahmeInformation, teilnahmeInformationAbschnitte } from './datenschutzvorlage';

/* Paket 3G: Vorlagen für Teilnahme-Information und Einwilligung (Fachblatt 3G). */
const plan = (extra: Partial<FragebogenPlan> = {}): FragebogenPlan => ({
  format: 'statable-fragebogen', version: 1, id: 'p-1', revision: 1, titel: { de: 'Mensa-Befragung', en: 'Canteen survey' }, sprachen: ['de', 'en'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' }, antwortlisten: [], skalen: [], elemente: [], geaendert: 1, ...extra
});
const VOLL = { zweck: 'Wir wollen wissen, wie zufrieden Studierende mit der Mensa sind', dauerMinuten: 10, loeschfrist: 'zwei Jahre nach Abschluss der Arbeit', kontakt: 'Max Muster, max@example.org', verantwortlich: 'Max Muster, Beispiel-Hochschule' };
const WER = (sp: 'de' | 'en') => (sp === 'de' ? 'Wer Ihre Antwort sehen kann' : 'Who can see your answer');

describe('Teilnahme-Information', () => {
  for (const sp of ['de', 'en'] as const) {
    it(`${sp}: enthält Zweck, Dauer, freiwillig, Löschung, Kontakt, Einordnung und keine IP/Uhrzeit`, () => {
      const t = teilnahmeInformation(plan(), sp, VOLL);
      for (const s of [sp === 'de' ? 'Mensa' : 'Canteen', '10', 'max@example.org', VOLL.loeschfrist, EINORDNUNG[sp]]) expect(t).toContain(s);
      expect(t).toMatch(sp === 'de' ? /freiwillig/ : /voluntary/);
      expect(t).toMatch(sp === 'de' ? /keine IP-Adresse.*keine Uhrzeit/ : /no IP address.*no time of day/);
      expect(offenePlatzhalter(t)).toEqual([]);
    });
    it(`${sp}: ohne Angaben stehen fünf Platzhalter, auch der für den Kontakt`, () => {
      const t = teilnahmeInformation(plan(), sp);
      expect(offenePlatzhalter(t).length).toBe(5);
      expect(t).toContain(sp === 'de' ? '[Kontakt eintragen]' : '[Enter contact]');
    });
  }
  it('je Rückweg ein Satz, wer was sieht; nur die gewählten Wege erscheinen', () => {
    const a = teilnahmeInformationAbschnitte(plan(), 'de', { wege: ['datei', 'qr', 'station'] }).find(x => x.ueberschrift === WER('de'))!;
    expect(a.punkte).toHaveLength(3);
    expect(a.punkte!.join(' ')).toContain('anonym ist die Teilnahme auf diesem Weg deshalb nicht');
    expect(a.punkte!.join(' ')).not.toContain('Teilen-Menü');
    expect(teilnahmeInformationAbschnitte(plan(), 'de').find(x => x.ueberschrift === WER('de'))!.punkte).toHaveLength(2);
  });
  it('Einmal-Code und Link ergänzen je einen Satz', () => {
    const ohne = teilnahmeInformation(plan(), 'de', VOLL), mit = teilnahmeInformation(plan({ codeVerlangt: true }), 'de', { ...VOLL, link: true });
    expect(ohne).not.toContain('Einmal-Code'); expect(mit).toContain('pseudonymisiert, nicht anonym'); expect(mit).toContain('Internetadresse');
  });
  it('der Text für die Befragten enthält den Hinweis „keine Rechtsberatung“ nicht und keine Wörter wie immer/nie/stets', () => {
    expect(teilnahmeInformation(plan(), 'de', VOLL)).not.toMatch(/Rechtsberatung/);
    expect(teilnahmeInformation(plan(), 'de', VOLL)).not.toMatch(/\b(immer|nie|stets)\b/i);
  });
  it('offenePlatzhalter zählt gleiche Klammern einmal', () => {
    expect(offenePlatzhalter('Text [a] und [Kontakt eintragen] und [Kontakt eintragen]')).toEqual(['[Kontakt eintragen]']);
  });
});

describe('Einwilligung und Übernahme', () => {
  it('vier Aussagen, Widerruf genannt, Titel eingesetzt', () => {
    for (const sp of ['de', 'en'] as const) { const t = einwilligungText(plan(), sp); expect(t.split('\n')).toHaveLength(4); expect(t).toMatch(sp === 'de' ? /widerrufen/ : /withdraw/); }
    expect(einwilligungText(plan(), 'de')).toContain('Mensa-Befragung');
  });
  it('mitDatenschutzTexten setzt einleitung und einwilligung nur für die Sprache, lässt anderes stehen', () => {
    const p = mitDatenschutzTexten(plan({ einleitung: { en: 'Hello' } }), 'de', VOLL);
    expect(p.einleitung!.en).toBe('Hello'); expect(p.einleitung!.de).toContain('Mensa'); expect(p.einwilligung!.pflicht).toBe(true); expect(p.einwilligung!.text.de).toContain('freiwillig');
    expect(mitDatenschutzTexten(plan({ einwilligung: { text: {}, pflicht: false } }), 'en').einwilligung!.pflicht).toBe(false);
  });
});

describe('Word', () => {
  it('docx-pruefen ohne Befund, enthält Hinweis, Kontakt und Einwilligung (de und en)', async () => {
    const D = await import('docx');
    for (const sp of ['de', 'en'] as const) {
      const bytes = new Uint8Array(await D.Packer.toArrayBuffer(baueTeilnahmeWord(D, plan({ codeVerlangt: true }), sp, { ...VOLL, wege: ['datei', 'text', 'qr', 'teilen', 'station'] })));
      expect(pruefeDocx(bytes)).toEqual([]);
      const doc = strFromU8(unzipSync(bytes)['word/document.xml']!);
      expect(doc).toContain(KEINE_RECHTSBERATUNG[sp].slice(0, 30)); expect(doc).toContain('max@example.org'); expect(doc).toContain(sp === 'de' ? 'Einwilligung' : 'Consent');
    }
  });
});
