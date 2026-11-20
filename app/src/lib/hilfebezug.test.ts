import { describe, it, expect } from 'vitest';
import { hilfeBezug } from './hilfebezug';

describe('hilfeBezug', () => {
  it('liefert für die Frage-Artikel Zeilen, sonst null', () => {
    for (const id of ['frage-gruppen', 'frage-praepost', 'frage-zusammenhang', 'frage-vorhersage', 'frage-verteilung', 'frage-kreuz']) {
      const b = hilfeBezug(id);
      expect(b, id).not.toBeNull();
      expect(b!.spss.length, id).toBeGreaterThan(0);
      expect(b!.excel.length + b!.ti.length, id).toBeGreaterThan(0);
    }
    expect(hilfeBezug('erste-schritte')).toBeNull();
  });
});
