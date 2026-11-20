import { describe, expect, it } from 'vitest';
import { eap2pl, eapStufen } from './irtpersonen';
import D2 from './irt2pl-daten.csv?raw';
import DG from './irtgrm-daten.csv?raw';

/* Sollwerte: R `ltm::factor.scores(fit, method = "EAP", resp.patterns = daten[1:6, ])` (ltm 1.2-0) mit den ltm-Schätzwerten der beiden Testdateien. */
const zeilen = (t: string) => t.trim().split('\n').slice(1).map(z => z.split(',').map(Number));
describe('Personenwerte (EAP) gegen ltm::factor.scores', () => {
  it('2PL', () => {
    const b = [-1.19607142342, -0.65811897242, -0.0955907589, 0.0426455584, 0.29887741272, 0.90613680688, 1.06967981389, 0.03759377892];
    const a = [0.6765592259, 1.2045263942, 1.472871511, 0.9266796896, 0.9287871113, 1.7036823684, 0.7898323373, 2.5077767688];
    const soll = [[-1.5076719797, 0.6759460492], [0.1478772745, 0.4971522848], [-1.1206456728, 0.6177596911], [-0.5026833555, 0.5351863663], [1.0059708216, 0.5614523205], [-0.6232091384, 0.5490647778]];
    zeilen(D2).slice(0, 6).forEach((y, i) => { const p = eap2pl(a.map((v, j) => ({ a: v, b: b[j]! })), y); expect(p.theta).toBeCloseTo(soll[i]![0]!, 6); expect(p.se).toBeCloseTo(soll[i]![1]!, 6); });
  });
  it('Stufenmodell', () => {
    const beta = [[-1.670594009, -0.5125355245, 0.2505932452, 1.332868604], [-1.631846032, -0.4843993017, 0.6277292779, 1.651737451], [-1.737544027, -0.6891219082, 0.1416497446, 1.217905115], [-2.27797072, -0.4212980889, 1.1660873393, 2.232199175], [-1.772015422, -0.8310728912, 0.3810979813, 1.381216251]];
    const a = [1.1117795581, 1.4423759371, 0.8994842399, 1.9574264687, 1.2066834163];
    const items = a.map((v, j) => ({ a: v, schwellen: beta[j]!.map(x => x / v), stufen: [1, 2, 3, 4, 5] }));
    const soll = [[0.7471326505, 0.4871564216], [0.2004948765, 0.4825914006], [0.5694546986, 0.4857877829], [-1.0727989131, 0.5299736318], [1.2334694448, 0.5224240904], [0.7189101083, 0.5145502729]];
    zeilen(DG).slice(0, 6).forEach((y, i) => { const p = eapStufen(items, y); expect(p.theta).toBeCloseTo(soll[i]![0]!, 6); expect(p.se).toBeCloseTo(soll[i]![1]!, 6); });
  });
});

import { beforeAll } from 'vitest';
import { nodeEngine } from './testengine';
import { personenSpaltenBefehl } from './irtpersonen';
describe('Befehl für die neuen Spalten läuft in der PSPP-Engine', () => {
  let e: Awaited<ReturnType<typeof nodeEngine>>;
  beforeAll(async () => { e = await nodeEngine(); });
  it('legt Werte an die richtigen Zeilen, Lücken bleiben fehlend', () => {
    e.run('NEW FILE.\nDATA LIST FREE /a (F2).\nBEGIN DATA\n1\n2\n3\n4\nEND DATA.');
    const b = personenSpaltenBefehl([{ name: 'Faehigkeit', werte: [-0.5, 1.23456, null, -0.5], beschriftung: "Fähigkeit' (EAP)\n." }, { name: 'Faehigkeit_se', werte: [0.5, 0.6, null, 0.5], beschriftung: 'SE' }]);
    e.run(b);
    const t = e.run('LIST.').find((i: any) => i.type === 'table') as any;
    const nums = (t.cells as { c: number; r: number; n?: number; t: string }[]).filter(c => c.c === 1 && c.r > 0);
    expect(nums.map(c => c.n)).toEqual([-0.5, 1.2346, expect.any(Number), -0.5]);
    expect(nums[2]!.t.trim()).toBe('.');
    const d = e.run('DISPLAY DICTIONARY.');
    expect(JSON.stringify(d)).toContain('Faehigkeit_se');
  });
});
