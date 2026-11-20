import { describe, expect, it } from 'vitest';
import { lokMitText, mitAbschluss, mitEinleitung, mitEinwilligungAn, mitEinwilligungText } from './fragebogen-rahmen';
import type { FragebogenPlan } from './fragebogenplan';

const p = { sprachen: ['de', 'en'] } as unknown as FragebogenPlan;
describe('Rahmentexte', () => {
  it('leer entfernt die Eigenschaft', () => {
    const a = mitEinleitung(p, 'de', 'Hallo');
    expect(a.einleitung).toEqual({ de: 'Hallo' });
    expect('einleitung' in mitEinleitung(a, 'de', '  ')).toBe(false);
  });
  it('andere Sprache bleibt', () => {
    expect(lokMitText({ de: 'a', en: 'b' }, 'de', '')).toEqual({ en: 'b' });
  });
  it('Einwilligung behält Pflicht', () => {
    const a = mitEinwilligungText({ ...p, einwilligung: { text: { de: 'x' }, pflicht: false } }, 'en', 'y');
    expect(a.einwilligung).toEqual({ text: { de: 'x', en: 'y' }, pflicht: false });
    expect('abschluss' in mitAbschluss(p, 'de', '')).toBe(false);
  });
  it('Einwilligung an und aus', () => {
    const a = mitEinwilligungAn(p, true);
    expect(a.einwilligung).toEqual({ text: {}, pflicht: true });
    expect('einwilligung' in mitEinwilligungAn(a, false)).toBe(false);
  });
});
