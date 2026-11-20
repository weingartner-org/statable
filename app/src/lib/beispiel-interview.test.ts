/**
 * Prüft die Beispieldateien des erfundenen Interviews (app/public/beispiel/interview/, Paket 4F-a): Die drei Fassungen je Sprache
 * (aTrain-artige TXT, f4-Text, Teams-VTT) müssen dieselben Beiträge in derselben Sprecherfolge enthalten, die Zeiten müssen aufsteigen,
 * und die Aufnahme muss klein genug sein. Einfache eigene Prüfung der Dateien; der Leser transkript-lesen.ts wird hier bewusst nicht benutzt.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ordner = fileURLToPath(new URL('../../public/beispiel/interview/', import.meta.url));
const lies = (n: string) => readFileSync(ordner + n, 'utf8');

interface Beitrag { s: 'I' | 'B'; text: string; zeit: number }
const sek = (h: string, m: string, s: string) => (+h * 3600 + +m * 60 + +s) * 1000;

function leseAtrain(t: string): Beitrag[] {
  const aus: Beitrag[] = [];
  let sprecher: 'I' | 'B' | null = null;
  for (const z of t.split('\n').slice(1)) {
    const k = /^SPEAKER_0([01])$/.exec(z);
    if (k) { sprecher = k[1] === '0' ? 'I' : 'B'; continue; }
    const m = /^\[(\d\d):(\d\d):(\d\d)\] - (.+)$/.exec(z);
    if (m && sprecher) aus.push({ s: sprecher, text: m[4]!, zeit: sek(m[1]!, m[2]!, m[3]!) });
  }
  return aus;
}
function leseF4(t: string): Beitrag[] {
  return t.trim().split(/\n\s*\n/).map((a) => {
    const m = /^([IB]): ([\s\S]*) #(\d\d):(\d\d):(\d\d)-(\d)#$/.exec(a.trim());
    if (!m) throw new Error('f4-Absatz ohne Kürzel oder Zeitmarke: ' + a.slice(0, 40));
    return { s: m[1]! as 'I' | 'B', text: m[2]!, zeit: sek(m[3]!, m[4]!, m[5]!) + +m[6]! * 100 };
  });
}
function leseVtt(t: string, ichName: string): { b: Beitrag; ende: number }[] {
  return t.split(/\n\s*\n/).slice(1).filter((x) => x.trim()).map((c) => {
    const m = /(\d\d):(\d\d):(\d\d)\.(\d{3}) --> (\d\d):(\d\d):(\d\d)\.(\d{3})\n<v ([^>]+)>([\s\S]*)<\/v>/.exec(c);
    if (!m) throw new Error('VTT-Cue nicht lesbar: ' + c.slice(0, 60));
    return { b: { s: m[9]! === ichName ? 'I' : 'B', text: m[10]!, zeit: sek(m[1]!, m[2]!, m[3]!) + +m[4]! }, ende: sek(m[5]!, m[6]!, m[7]!) + +m[8]! } as { b: Beitrag; ende: number };
  });
}

for (const [l, ich, merkmale] of [
  ['de', 'Interviewerin', { fuell: 'ähm', lachen: '(lacht)', unv: '(unv.)', abbruch: 'glei-' }],
  ['en', 'Interviewer', { fuell: 'um', lachen: '(laughs)', unv: '(inaudible)', abbruch: 'sa-' }]
] as const) {
  describe(`Beispielinterview ${l}`, () => {
    const atrain = leseAtrain(lies(`semesterplanung-${l}-atrain.txt`));
    const f4 = leseF4(lies(`semesterplanung-${l}-f4.txt`));
    const vtt = leseVtt(lies(`semesterplanung-${l}-teams.vtt`), ich);

    it('alle drei Fassungen haben gleich viele Beiträge in gleicher Sprecherfolge', () => {
      expect(atrain.length).toBeGreaterThanOrEqual(15);
      expect(f4.length).toBe(atrain.length);
      expect(vtt.length).toBe(atrain.length);
      const folge = (x: Beitrag[]) => x.map((b) => b.s).join('');
      expect(folge(f4)).toBe(folge(atrain));
      expect(folge(vtt.map((v) => v.b))).toBe(folge(atrain));
    });

    it('der Wortlaut der Beiträge ist in allen Fassungen gleich', () => {
      expect(f4.map((b) => b.text)).toEqual(atrain.map((b) => b.text));
      expect(vtt.map((v) => v.b.text)).toEqual(atrain.map((b) => b.text));
    });

    it('die Zeiten steigen', () => {
      for (let i = 1; i < atrain.length; i++) expect(atrain[i]!.zeit).toBeGreaterThanOrEqual(atrain[i - 1]!.zeit);
      for (let i = 1; i < f4.length; i++) expect(f4[i]!.zeit).toBeGreaterThan(f4[i - 1]!.zeit);
      for (let i = 0; i < vtt.length; i++) {
        expect(vtt[i]!.ende).toBeGreaterThan(vtt[i]!.b.zeit);
        if (i > 0) expect(vtt[i]!.b.zeit).toBeGreaterThanOrEqual(vtt[i - 1]!.ende);
      }
    });

    it('die Fassungen passen zueinander: f4-Ende liegt nahe am VTT-Ende (Zehntel abgerundet), aTrain-Anfang am VTT-Anfang (Sekunde abgerundet)', () => {
      vtt.forEach((v, i) => {
        expect(f4[i]!.zeit).toBeLessThanOrEqual(v.ende);
        expect(v.ende - f4[i]!.zeit).toBeLessThan(100);
        expect(atrain[i]!.zeit).toBeLessThanOrEqual(v.b.zeit);
        expect(v.b.zeit - atrain[i]!.zeit).toBeLessThan(1000);
      });
    });

    it('enthält die Merkmale für den Transkript-Prüfer', () => {
      const alle = atrain.map((b) => b.text).join('\n');
      expect(alle).toContain(merkmale.fuell);
      expect(alle).toContain('(...)');
      expect(alle).toContain(merkmale.lachen);
      expect(alle).toContain(merkmale.unv);
      expect(alle).toContain(merkmale.abbruch);
      // Hörersignal der interviewenden Person zwischen zwei Beiträgen derselben befragten Person
      const i = atrain.findIndex((b, k) => b.s === 'I' && /^Mhm\.$/.test(b.text) && atrain[k - 1]?.s === 'B' && atrain[k + 1]?.s === 'B');
      expect(i).toBeGreaterThan(0);
      // ein deutlich längerer Beitrag, aber unter der Grenze von 400 Wörtern
      const wortzahlen = atrain.filter((b) => b.s === 'B').map((b) => b.text.split(/\s+/).length);
      expect(Math.max(...wortzahlen)).toBeGreaterThan(100);
      expect(Math.max(...wortzahlen)).toBeLessThan(400);
    });

    it('die Aufnahme ist da und klein (unter 6 MB)', () => {
      const datei = ordner + `semesterplanung-${l}.m4a`;
      expect(existsSync(datei)).toBe(true);
      expect(statSync(datei).size).toBeLessThan(6 * 1024 * 1024);
    });
  });
}
