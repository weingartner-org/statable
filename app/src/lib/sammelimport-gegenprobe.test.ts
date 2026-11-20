/* Prüfer-Test 3E/3F - der Bauer ändert diese Datei nicht.
 *
 * Gegenprobe Sammelimport (Paket 3E): Antwortsätze werden mit dem ECHTEN age-Werkzeug 1.3.2 verschlüsselt (`age -r` binär, `age -a -r` Armor)
 * und von lib/sammelimport.ts eingelesen. Übersprungen (mit Meldung), wenn age.exe fehlt (Testhilfe age-werkzeug.testhilfe.ts).
 * Zusätzlich ein Fall mit 10 Einmal-Codes und gemischten Antworten; RR1 und RR2 dieses Falls stammen aus R (Paket outcomerate):
 *   Skript scripts/sammelimport-erwartet.R, Ausgabe scripts/sammelimport-erwartet.txt (Zuordnung zu AAPOR-Fällen steht im Kopf des Skripts).
 *   Grenze 0,8: I=3, P=2, NC=5 → RR1 0,300000, RR2 0,500000
 *   Grenze 0,6: I=4, P=1, NC=5 → RR1 0,400000, RR2 0,500000
 *   Grenze 1,0: I=2, P=3, NC=5 → RR1 0,200000, RR2 0,500000
 * Die Pipeline ist die der Oberfläche: zerlegeEingaben → entschluesseleAlle → pruefeEingaenge → kategorisiere (lib/ruecklauf.ts) → rr1/rr2.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Frage, FragebogenPlan, Lok, Seite } from './fragebogenplan';
import type { Antwortsatz } from './antwortsatz';
import { kategorisiere, rr1, rr2 } from './ruecklauf';
import { entschluesseleAlle, pruefeEingaenge, zerlegeEingaben } from './sammelimport';
import { ageLauf, ageVorhanden, keygenPaar } from './age-werkzeug.testhilfe';

const BEGIN = '-----BEGIN AGE ENCRYPTED FILE-----';
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const bytesVon = (s: string) => new TextEncoder().encode(s);

const lok = (t: string): Lok => ({ de: t });
const frage = (id: string): Frage => ({ art: 'frage', id, name: id, typ: 'zahl', text: lok(id), zahl: { ganz: true }, kodebuch: { niveau: 'skala' }, pflicht: { an: true } });
const seite = (id: string, elemente: Seite['elemente']): Seite => ({ art: 'seite', id, name: id, elemente });
/** Fünf Pflichtfragen q1..q5. */
const PLAN: FragebogenPlan = {
  format: 'statable-fragebogen', version: 1, id: 'p-1', revision: 1, titel: lok('T'), sprachen: ['de'],
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' }, antwortlisten: [], skalen: [],
  elemente: [seite('s1', ['q1', 'q2', 'q3', 'q4', 'q5'].map(frage))], geaendert: 1,
};
const code = (i: number) => `0000-${String(i).padStart(4, '0')}`;
const CODES = Array.from({ length: 10 }, (_, i) => ({ code: code(i + 1), ausgegeben: true }));
/** Satz mit `k` von 5 beantworteten Pflichtfragen. */
const satz = (n: number, k: number, extra: Partial<Antwortsatz> = {}): Antwortsatz => ({
  format: 'statable-antwort', version: 1, plan: { id: 'p-1', revision: 1 }, antwortId: uid(n),
  werte: Object.fromEntries(['q1', 'q2', 'q3', 'q4', 'q5'].slice(0, k).map(q => [q, 1])), ...extra,
});

let schluessel: { identitaet: string; empfaenger: string };
beforeAll(() => { if (ageVorhanden) schluessel = keygenPaar(); });

/** age -r (binär) bzw. age -a -r (Armor-Text). */
function mitAge(s: Antwortsatz, armor: boolean): Uint8Array | string {
  const r = ageLauf('age', armor ? ['-a', '-r', schluessel.empfaenger] : ['-r', schluessel.empfaenger], JSON.stringify(s));
  if (r.status !== 0) throw new Error(`age fehlgeschlagen: ${r.stderr}`);
  return armor ? r.stdout.toString('utf8') : new Uint8Array(r.stdout);
}
const alsText = (x: Uint8Array | string) => x as string;
const alsBytes = (x: Uint8Array | string) => x as Uint8Array;

describe.skipIf(!ageVorhanden)('Sammelimport gegen age 1.3.2 (CLI)', () => {
  it('age -r (binär): eine Datei wird als ein Stück gelesen und ergibt den Antwortsatz', async () => {
    const s = satz(1, 5, { code: code(1), start: '2026-11-08', ende: '2026-11-08', werte: { q1: 3, q2: 'ä€ Text', q3: [1, 2], q4: null } });
    const stuecke = zerlegeEingaben([{ name: 'a.age', bytes: alsBytes(mitAge(s, false)) }]);
    expect(stuecke).toHaveLength(1);
    const e = await entschluesseleAlle(stuecke, schluessel.identitaet);
    expect(e[0]!.fehler).toBeUndefined();
    expect(e[0]!.satz).toEqual(s);
  });

  it('age -a -r (Armor): drei Blöcke mit Fremdtext in einer Datei werden zu drei Sätzen', async () => {
    const saetze = [satz(1, 5), satz(2, 3), satz(3, 0)];
    const bloecke = saetze.map(s => alsText(mitAge(s, true)));
    expect(bloecke.every(b => b.startsWith(BEGIN))).toBe(true);
    const text = `Von: eva@example.org\nAntworten vom Infostand\n\n${bloecke[0]}\n(neue Zeile)\n${bloecke[1]}\n\n${bloecke[2]}\nEnde`;
    const stuecke = zerlegeEingaben([{ name: 'mail.txt', bytes: bytesVon(text) }]);
    expect(stuecke).toHaveLength(3);
    const e = await entschluesseleAlle(stuecke, schluessel.identitaet);
    expect(e.map(x => x.satz)).toEqual(saetze);
  });

  it('Windows-Zeilenenden (CRLF) im Text stören nicht', async () => {
    const saetze = [satz(1, 5), satz(2, 2)];
    const text = saetze.map(s => alsText(mitAge(s, true))).join('\n\n').replace(/\r?\n/g, '\r\n');
    const stuecke = zerlegeEingaben([{ name: 'windows.txt', bytes: bytesVon(text) }]);
    expect(stuecke).toHaveLength(2);
    const e = await entschluesseleAlle(stuecke, schluessel.identitaet);
    expect(e.map(x => x.satz)).toEqual(saetze);
  });

  it('eine andere Identität aus age-keygen kann nichts öffnen: nichtEntschluesselbar', async () => {
    const stuecke = zerlegeEingaben([{ name: 'a.age', bytes: alsBytes(mitAge(satz(1, 5), false)) }]);
    const andere = keygenPaar();
    const e = await entschluesseleAlle(stuecke, andere.identitaet);
    expect(e[0]!.fehler).toBe('falsche-identitaet');
    expect(zustaende(pruefeEingaenge(PLAN, e))).toEqual(['nichtEntschluesselbar']);
  });

  /* ---------- der Fall mit 10 Codes ---------- */
  async function fall() {
    const a1 = satz(1, 5, { code: code(1) });
    const a2 = satz(2, 5, { code: code(2) });
    const a2b = satz(3, 2, { code: code(2) });                  // dieselbe Person (Code), zweite, andere Antwort
    const a3 = satz(4, 4, { code: '00000003' });                // 4 von 5 = 0,8 genau auf der Grenze, Code ohne Bindestrich getippt
    const a4 = satz(5, 3, { code: code(4) });
    const a5 = satz(6, 1, { code: code(5) });
    const a6 = satz(7, 0, { code: code(6) });                   // leerer Bogen
    const ax = satz(8, 5);                                      // ohne Code
    const ay = satz(9, 5, { code: 'ZZZZ-ZZZZ' });               // Code nicht in der Liste
    const arm = (s: Antwortsatz) => alsText(mitAge(s, true));
    const stuecke = zerlegeEingaben(
      [
        { name: 'a1.age', bytes: alsBytes(mitAge(a1, false)) },
        { name: 'blockdatei.txt', bytes: bytesVon(`Fremdtext vorweg\n${arm(a2)}\n${arm(a2b)}\n${arm(a3)}\nund Gruß`) },
        { name: 'sicherung.txt', bytes: bytesVon(`${arm(a4)}\n\n${arm(a5)}\n\n${arm(a6)}\n`) },
        { name: 'a1-nochmal.age', bytes: alsBytes(mitAge(a1, false)) },   // dieselbe antwortId noch einmal
      ],
      `${arm(ax)}\n\n${arm(ay)}`,
    );
    expect(stuecke).toHaveLength(10);
    const eingaenge = await entschluesseleAlle(stuecke, schluessel.identitaet);
    expect(eingaenge.every(x => x.satz)).toBe(true);
    return pruefeEingaenge(PLAN, eingaenge, CODES);
  }

  it('Prüfung des Falls: Zustände und Zahlen', async () => {
    const p = await fall();
    expect(zustaende(p)).toEqual([
      'uebernommen',       // a1
      'uebernommen',       // a2
      'doppelterCode',     // a2b
      'uebernommen',       // a3 (Code normalisiert)
      'uebernommen', 'uebernommen', 'uebernommen',   // a4, a5, a6
      'doppelt',           // a1 noch einmal
      'ohneCode',          // ax
      'unbekannterCode',   // ay
    ]);
    expect(p.zahlen).toEqual({
      uebernommen: 6, doppelt: 1, andererPlan: 0, andereRevision: 0, unbekannterCode: 1, doppelterCode: 1, ohneCode: 1, nichtEntschluesselbar: 0, kaputt: 0, keinAge: 0,
    });
    expect(p.saetze.map(s => s.antwortId)).toEqual([uid(1), uid(2), uid(3), uid(4), uid(5), uid(6), uid(7), uid(8), uid(9)]);
  });

  it.each([
    // [Grenze, I, P, NC, RR1, RR2] - Sollwerte aus scripts/sammelimport-erwartet.txt (R, outcomerate)
    [0.8, 3, 2, 5, 0.3, 0.5],
    [0.6, 4, 1, 5, 0.4, 0.5],
    [1, 2, 3, 5, 0.2, 0.5],
  ])('Rücklauf des Falls bei Grenze %s: I=%s, P=%s, NC=%s → RR1 %s, RR2 %s (R-Sollwert)', async (grenze, i, pp, nc, r1, r2) => {
    const p = await fall();
    const k = kategorisiere(PLAN, p.saetze, CODES, grenze);
    expect(k.keineQuote).toBe(false);
    expect(k.zahlen).toMatchObject({ ausgegeben: 10, vollstaendig: i, teilweise: pp, nichtZurueck: nc });
    expect(rr1(k)).toBeCloseTo(r1, 6);
    expect(rr2(k)).toBeCloseTo(r2, 6);
  });

  it('Rücklauf des Falls (Grenze 0,8): doppelte Datei, Satz ohne Code, unbekannter Code zählen nicht; doppelter Code wird einmal gewertet', async () => {
    const p = await fall();
    const k = kategorisiere(PLAN, p.saetze, CODES, 0.8);
    expect(k.zahlen).toEqual({ ausgegeben: 10, vollstaendig: 3, teilweise: 2, nichtZurueck: 5, doppelt: 1, unbekannt: 1 });
    expect(k.ohneCode).toEqual([uid(8)]);
    expect(k.je.find(z => z.code === code(2))).toMatchObject({ zustand: 'doppelt', wertung: 'vollstaendig' });
    expect(k.anzahl).toBe(9);
  });
});

function zustaende(p: ReturnType<typeof pruefeEingaenge>) { return p.zeilen.map(z => z.zustand); }
