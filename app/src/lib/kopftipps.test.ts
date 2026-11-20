import { describe, expect, it } from 'vitest';
import { kopfTipp } from './kopftipps';
import { erklaerungen } from './texte';

describe('Tipps an Tabellenköpfen', () => {
  it('bekannte Köpfe bekommen Titel und einen Satz, unabhängig von Groß-/Kleinschreibung', () => {
    const t = kopfTipp('df');
    expect(t?.id).toBe('freiheitsgrade');
    expect(t?.text.length).toBeGreaterThan(20);
    expect(kopfTipp('Sig. (2-tailed)')?.id).toBe('p-wert');
  });
  it('mehrdeutige Köpfe haben keinen Tipp', () => {
    for (const k of ['F', 't', 'Lower', 'Total', 'N']) expect(kopfTipp(k)).toBeNull();
  });
  it('jede Id gibt es im Wortverzeichnis', () => {
    const ids = Object.keys(erklaerungen());
    for (const k of ['df', 'sig.', 'std. error', 'std. deviation', 'mean', 'variance', 'beta', 'b', 'exp(b)', 'r square', 'eigenvalue', "cronbach's alpha", 'pearson chi-square', 'mean rank', '95% confidence interval', "cohen's d", 'eta squared']) {
      const t = kopfTipp(k); expect(t, k).not.toBeNull(); expect(ids).toContain(t!.id);
    }
  });
});
