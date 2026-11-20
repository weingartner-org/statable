import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { s, L, einstSpeichern, seiteSprache } from '../lib/sitzung.svelte';
import { einsetzen, istRtl, ladeSprache, FREIGEGEBEN, RTL_SPRACHEN, SPRACHNAMEN } from './laufzeit';
import { PROFILE, richtung, iv, ki, dfKlammer, pfeil, formel } from './profil';
import { FSI, PDI, isoliere, isoliereFormeln, ohneIsolierung } from './bidi';
import { komma } from '../lib/ergebnis';
import { kopiereKursiv, kursivHtml } from '../lib/kursiv';

/** Schrift von rechts nach links (Welle R): Richtung im Profil, `dir` der Seite, Isolierung von Zahlen und Formeln - und in LTR bleibt alles gleich. */
describe('RTL: Richtung', () => {
  afterEach(() => { s.einst.sprache = 'de'; });

  it('Arabisch, Persisch und die Prüfsprache xr laufen von rechts nach links, alle anderen nicht', () => {
    expect([...RTL_SPRACHEN].sort()).toEqual(['ar', 'fa', 'xr']);
    expect(FREIGEGEBEN).not.toContain('xr');   // wie xx: nur über ?sprache=xr
    expect(FREIGEGEBEN).not.toContain('ar'); expect(FREIGEGEBEN).not.toContain('fa');
    for (const sp of Object.keys(SPRACHNAMEN) as (keyof typeof SPRACHNAMEN)[]) {
      expect(istRtl(sp), sp).toBe(RTL_SPRACHEN.includes(sp));
      expect(PROFILE[sp].richtung === 'rtl', `Profil ${sp}`).toBe(RTL_SPRACHEN.includes(sp));
      s.einst.sprache = sp;
      expect(richtung(), sp).toBe(RTL_SPRACHEN.includes(sp) ? 'rtl' : 'ltr');
    }
  });

  it('der Ladebildschirm kennt dieselben RTL-Sprachen und setzt dir', () => {
    const lade = readFileSync(new URL('../../public/lade-sprache.js', import.meta.url), 'utf8');
    const liste = /var RTL = (\[[^\]]*\])/.exec(lade)?.[1];
    expect(liste).toBeTruthy();
    expect(JSON.parse(liste!.replace(/'/g, '"')).sort()).toEqual([...RTL_SPRACHEN].sort());
    const lauf = (suche: string, system = 'de-AT') => {
      const html = { lang: 'de', dir: '' };
      runInNewContext(lade, { URLSearchParams, JSON, location: { search: suche }, localStorage: { getItem: () => null }, navigator: { languages: [system], language: system },
        document: { documentElement: html, getElementById: () => ({ setAttribute: () => {}, querySelector: () => ({ textContent: '' }) }) } });
      return html;
    };
    expect(lauf('?sprache=ar')).toMatchObject({ lang: 'ar', dir: 'rtl' });
    expect(lauf('?sprache=fa')).toMatchObject({ lang: 'fa', dir: 'rtl' });
    expect(lauf('?sprache=xr')).toMatchObject({ dir: 'rtl' });
    expect(lauf('').dir).not.toBe('rtl');   // Deutsch: die Seite bleibt, wie sie ist (links nach rechts)
    expect(lauf('?sprache=en')).toMatchObject({ lang: 'en', dir: 'ltr' });
    // ohne ?sprache=: ein arabischer Rechner bekommt die App nicht von rechts nach links (ar ist nicht freigegeben)
    expect(lauf('', 'ar-EG').dir).not.toBe('rtl');
  });

  it('die Seite bekommt dir="rtl" nur in RTL-Sprachen (seiteSprache und einstSpeichern)', () => {
    const h = { lang: '', dir: '' };
    seiteSprache(h, 'ar'); expect(h).toEqual({ lang: 'ar', dir: 'rtl' });
    seiteSprache(h, 'fa'); expect(h.dir).toBe('rtl');
    seiteSprache(h, 'xr'); expect(h.dir).toBe('rtl');
    seiteSprache(h, 'de'); expect(h).toEqual({ lang: 'de', dir: 'ltr' });
    seiteSprache(h, 'en'); expect(h.dir).toBe('ltr');
    // einstSpeichern setzt es am echten Element
    const html = { lang: '', dir: '', dataset: {} as Record<string, string>, style: { setProperty: () => {} } };
    const alt = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = { documentElement: html };
    try {
      s.einst.sprache = 'xr'; einstSpeichern(); expect(html.dir).toBe('rtl');
      s.einst.sprache = 'en'; einstSpeichern(); expect(html.dir).toBe('ltr');
    } finally { (globalThis as { document?: unknown }).document = alt; }
  });
});

describe('RTL: Isolierung eingesetzter Werte (einsetzen)', () => {
  afterEach(() => { s.einst.sprache = 'de'; });

  it('in RTL steht jeder eingesetzte Wert zwischen U+2068 und U+2069', () => {
    expect(einsetzen('الفرق {0} و {1}', ['0.57', 'Alter'], 'ar')).toBe(`الفرق ${FSI}0.57${PDI} و ${FSI}Alter${PDI}`);
    expect(einsetzen('{0}', ['x'], 'fa')).toBe(`${FSI}x${PDI}`);
    expect(einsetzen('{0}', ['x'], 'xr')).toBe(`${FSI}x${PDI}`);
  });

  it('Formeln der Vorlage werden einzeln isoliert, auch mit Platzhalter', () => {
    const t = einsetzen('النتيجة: t(97) = {0}, p = {1}', ['2.31', ',024'], 'ar');
    expect(t).toBe(`النتيجة: ${FSI}t(97) = ${FSI}2.31${PDI}${PDI}, ${FSI}p = ${FSI},024${PDI}${PDI}`);
    expect(ohneIsolierung(t)).toBe('النتيجة: t(97) = 2.31, p = ,024');
  });

  it('in Sprachen von links nach rechts bleibt alles unverändert', () => {
    for (const sp of ['de', 'en', 'fr', 'pl', 'uk', 'xx', 'pt-BR', 'bg']) {
      expect(einsetzen('t(97) = {0}, d = {1}, {2}', ['2.31', '0.57', 'Alter'], sp), sp).not.toMatch(/[⁨⁩]/);
    }
    expect(einsetzen('d = {0}, {1}', ['0.57', 'Alter'], 'en')).toBe('d = 0.57, Alter');
    expect(einsetzen('d = {0}, {1}', ['0.57', 'Alter'], 'fr')).toBe('d = 0,57, Alter');   // Dezimalkomma wie bisher
    expect(einsetzen('nur Text', undefined, 'en')).toBe('nur Text');
  });

  it('L und Lp setzen in xr isoliert ein, in xx und en nicht', async () => {
    await ladeSprache('xr'); await ladeSprache('xx');
    const n = 3;
    s.einst.sprache = 'xr';
    const t = L(`${n} Personen`, `${n} people`);   // fester Text aus BaumBlock.svelte
    expect(t).toBe(`[ابت ${FSI}3${PDI} people تبا]`);
    expect(L('Abbrechen', 'Cancel')).toBe('[ابت Cancel تبا]');
    s.einst.sprache = 'xx';
    expect(L(`${n} Personen`, `${n} people`)).not.toMatch(/[⁨⁩]/);
    s.einst.sprache = 'en';
    expect(L(`${n} Personen`, `${n} people`)).toBe('3 people');
  });
});

describe('RTL: Formeln und Statistikzeilen', () => {
  afterEach(() => { s.einst.sprache = 'de'; });

  it('isoliereFormeln: jede Angabe für sich, Rest bleibt', () => {
    expect(isoliereFormeln('t(97) = 2,31; p = ,024')).toBe(`${FSI}t(97) = 2,31${PDI}; ${FSI}p = ,024${PDI}`);
    expect(isoliereFormeln('95% CI [0,19; 0,95]')).toBe(`${FSI}95% CI [0,19; 0,95]${PDI}`);
    expect(isoliereFormeln('d = 0,57 [0,19; 0,95]')).toBe(`${FSI}d = 0,57 [0,19; 0,95]${PDI}`);
    expect(isoliereFormeln('F(2, 57) = 3,10, p < ,001')).toBe(`${FSI}F(2, 57) = 3,10${PDI}, ${FSI}p < ,001${PDI}`);
    expect(isoliereFormeln('χ²(1) = 4,5')).toBe(`${FSI}χ²(1) = 4,5${PDI}`);
    expect(isoliereFormeln('nichts zu tun')).toBe('nichts zu tun');
    expect(isoliereFormeln('')).toBe('');
    expect(isoliere('')).toBe('');
  });

  it('iv, ki und dfKlammer: in RTL isoliert, in LTR unverändert', () => {
    s.einst.sprache = 'de';
    expect(iv('0,19', '0,95')).toBe('[0,19; 0,95]');
    expect(dfKlammer('2', '57')).toBe('(2, 57)');
    expect(ki('0,19', '0,95')).toBe('95 %-KI [0,19; 0,95]');
    s.einst.sprache = 'en';
    expect(iv('0.19', '0.95')).toBe('[0.19, 0.95]');
    expect(ki('0.19', '0.95')).toBe('95% CI [0.19, 0.95]');
    expect(pfeil()).toBe('→');
    expect(formel('d = 0,57')).toBe('d = 0,57');
    s.einst.sprache = 'xr';
    expect(iv('0,19', '0,95')).toBe(`${FSI}[0,19; 0,95]${PDI}`);   // xr hat wie Deutsch das Dezimalkomma
    expect(dfKlammer('2', '57')).toBe(`${FSI}(2, 57)${PDI}`);
    expect(ki('0.19', '0.95')).toContain(`${FSI}[`);
    expect(pfeil()).toBe('←');
    expect(formel('d = 0,57')).toBe(`${FSI}d = 0,57${PDI}`);
  });

  it('der Pfeil zeigt in RTL nach links', () => {
    for (const sp of ['de', 'en', 'fr', 'xx'] as const) { s.einst.sprache = sp; expect(pfeil(), sp).toBe('→'); }
    for (const sp of ['ar', 'fa', 'xr'] as const) { s.einst.sprache = sp; expect(pfeil(), sp).toBe('←'); }
  });

  it('Zahlen aus komma() bleiben Ziffern des Gebietsschemas: keine Isolierzeichen in der Zahl selbst', () => {
    s.einst.sprache = 'xr';
    expect(komma(2.3141, 2)).toBe('2,31');
  });

  it('kopiereKursiv: in RTL mit Isolierung, in LTR wie bisher', async () => {
    const zeile = 't(97) = 2,31, p = ,024';
    expect(kursivHtml(zeile)).toBe('<i>t</i>(97) = 2,31, <i>p</i> = ,024');
    expect(kursivHtml(isoliereFormeln(zeile))).toContain(`${FSI}<i>t</i>(97) = 2,31${PDI}`);
    await expect(kopiereKursiv(zeile, true)).resolves.toBe(false);   // ohne Zwischenablage (Node): kein Absturz
  });
});
