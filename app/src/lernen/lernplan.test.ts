import { describe, it, expect } from 'vitest';
import { artikelModul } from '../hilfe/artikel-laden';
import { BEISPIELE } from '../lib/beispiele';
import { VERFAHREN } from '../lib/verfahren';
import { THEMEN, ladeThema, ladeAuswahl, type Frage } from './fragen';
import { VERSTEHEN_KACHELN, PROBIER_TEILE } from './probierziele';
import { LABOR_TEILE } from './lernsuche';
import { EINHEITEN, PFADE, BEREICHE_LERNEN, themaDerFrage, fragenThemen } from './lernplan';

const alleFragen = async (): Promise<Frage[]> => (await Promise.all(THEMEN.map(t => ladeThema(t.id)))).flatMap(m => m.FRAGEN);

describe('Lernplan: Aufbau', () => {
  it('Kennungen der Einheiten, Pfade und Bereiche sind eindeutig', () => {
    expect(new Set(EINHEITEN.map(e => e.id)).size).toBe(EINHEITEN.length);
    expect(new Set(PFADE.map(p => p.id)).size).toBe(PFADE.length);
    expect(new Set(BEREICHE_LERNEN.map(b => b.id)).size).toBe(BEREICHE_LERNEN.length);
  });
  it('jede Einheit hat einen Bereich', () => {
    const ids = new Set(BEREICHE_LERNEN.map(b => b.id));
    for (const e of EINHEITEN) expect(ids.has(e.bereich), e.id).toBe(true);
  });
  it('Alltagsfrage und Fachbegriff sind in Deutsch und Englisch da', () => {
    for (const e of EINHEITEN) for (const p of [e.alltag, e.fach]) { expect(p.de.length, e.id).toBeGreaterThan(3); expect(p.en.length, e.id).toBeGreaterThan(3); }
    for (const e of EINHEITEN) expect(e.alltag.en, e.id).not.toBe(e.alltag.de);
  });
});

describe('Lernplan: alle Kennungen gültig', () => {
  it('Hilfe-Artikel und Begriffe', async () => {
    const hilfeIds = new Set((await artikelModul('de')).artikelListe('de').map(a => a.id));
    for (const e of EINHEITEN) for (const h of e.hilfe) expect(hilfeIds.has(h), `${e.id}: ${h}`).toBe(true);
  });
  it('Beispiele und Schritte', () => {
    for (const e of EINHEITEN) for (const b of e.beispiele) {
      const bsp = BEISPIELE.find(x => x.id === b.id);
      expect(bsp, `${e.id}: ${b.id}`).toBeTruthy();
      expect(Number.isInteger(b.schritt) && b.schritt >= 0 && b.schritt < bsp!.schritte.length, `${e.id}: ${b.id} Schritt ${b.schritt}`).toBe(true);
    }
  });
  it('Regler führen zu einer vorhandenen Kachel', () => {
    const kacheln = new Set<string>(VERSTEHEN_KACHELN);
    const ok = (z: string) => {
      const [a, b] = z.split('/');
      return !b ? kacheln.has(a!) : a === 'lernlabor' ? LABOR_TEILE.some(t => t.id === b) : a === 'probieren' ? (PROBIER_TEILE as readonly string[]).includes(b) : false;
    };
    for (const e of EINHEITEN) for (const z of e.probieren) expect(ok(z), `${e.id}: ${z}`).toBe(true);
  });
  it('Rechenkarten', () => {
    for (const e of EINHEITEN) if (e.karte) expect(VERFAHREN.some(v => v.id === e.karte), `${e.id}: ${e.karte}`).toBe(true);
  });
});

describe('Lernplan: Fragen', () => {
  it('jede vorhandene Frage steht in genau einer Einheit (neue Fragen ohne Einheit machen den Test rot)', async () => {
    const zaehl = new Map<string, string[]>();
    for (const e of EINHEITEN) for (const f of e.fragen) zaehl.set(f, [...(zaehl.get(f) ?? []), e.id]);
    const imAbschluss = new Set(PFADE.flatMap(p => p.abschluss ?? []));
    for (const f of await alleFragen()) {
      if (imAbschluss.has(f.id)) { expect(zaehl.get(f.id), `Abschlussfrage ${f.id} steht auch in einer Einheit`).toBeUndefined(); continue; }
      expect(zaehl.get(f.id), `Frage ${f.id} ohne Einheit`).toHaveLength(1);
    }
  });
  it('jede Frage einer Einheit gibt es', async () => {
    const ids = new Set((await alleFragen()).map(f => f.id));
    for (const e of EINHEITEN) for (const f of e.fragen) expect(ids.has(f), `${e.id}: ${f}`).toBe(true);
  });
  it('das Themenmodul jeder Frage stimmt mit ihrer Kennung überein', async () => {
    for (const f of await alleFragen()) expect(themaDerFrage(f.id), f.id).toBe(f.thema);
  });
  it('Fallreihen bleiben in einer Einheit und beieinander', async () => {
    const fall = new Map((await alleFragen()).map(f => [f.id, f.fall]));
    const einheitDesFalls = new Map<string, string>();
    for (const e of EINHEITEN) {
      let letzter: string | undefined; const gesehen = new Set<string>();
      for (const id of e.fragen) {
        const f = fall.get(id);
        if (f) {
          expect(einheitDesFalls.get(f) ?? e.id, `Fallreihe ${f} verteilt`).toBe(e.id);
          einheitDesFalls.set(f, e.id);
          if (f !== letzter) { expect(gesehen.has(f), `Fallreihe ${f} in ${e.id} zerrissen`).toBe(false); gesehen.add(f); }
        }
        letzter = f;
      }
    }
  });
  it('die Auswahl einer Einheit kommt vollständig und in der Reihenfolge der Einheit', async () => {
    for (const e of EINHEITEN.filter(x => x.fragen.length)) {
      const m = await ladeAuswahl(fragenThemen(e), e.fragen);
      expect(m.FRAGEN.map(f => f.id), e.id).toEqual(e.fragen);
      for (const f of m.FRAGEN) if (f.fall) expect(m.FAELLE?.[f.fall], `${e.id}: ${f.fall}`).toBeTruthy();
    }
  });
});

describe('Lernplan: Pfade', () => {
  it('Pfade nennen nur vorhandene Einheiten, ohne Wiederholung', () => {
    const ids = new Set(EINHEITEN.map(e => e.id));
    for (const p of PFADE) { expect(new Set(p.einheiten).size, p.id).toBe(p.einheiten.length); for (const x of p.einheiten) expect(ids.has(x), `${p.id}: ${x}`).toBe(true); }
  });
  it('jede Einheit liegt in mindestens einem Pfad', () => {
    const drin = new Set(PFADE.flatMap(p => p.einheiten));
    for (const e of EINHEITEN) expect(drin.has(e.id), e.id).toBe(true);
  });
});
