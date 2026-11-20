import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { s } from './sitzung.svelte';
import { setzeAnsageUmgebung, type AnsageUmgebung, type Kanal } from './ansage';

/** Barrierefreiheit Stufe 1 (Erheben): Befunde aus der NVDA- und axe-Messung vom 08.11.2026. */

// Die Engine ersetzen: `wendeAn` meldet wie das Original nur dann einzeln, wenn nicht gesammelt wird.
const zustand = vi.hoisted(() => ({ sammelt: false, einzeln: 0, aufrufe: [] as string[] }));
vi.mock('./datenassistentlauf', () => ({
  sammleMeldungen: (an: boolean) => { zustand.sammelt = an; },
  wendeAn: async (text: string) => { zustand.aufrufe.push(text); if (!zustand.sammelt) zustand.einzeln++; return true; },
}));

import { FragebogenImport } from './fragebogenimport.svelte';
import type { Erkennung } from './fragebogen';

const gesagt: { kanal: Kanal; text: string }[] = [];
const umg: AnsageUmgebung = { schreibe: (kanal, text) => { if (text) gesagt.push({ kanal, text }); }, spaeter: f => f(), nach: f => { f(); return () => {}; }, jetzt: () => Date.now() };

const quelle = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf-8');

describe('NVDA B3: „Übernehmen“ sagt eine Sammelmeldung', () => {
  beforeEach(() => { gesagt.length = 0; zustand.einzeln = 0; zustand.aufrufe = []; setzeAnsageUmgebung(umg); s.meldungsverlauf = []; s.meldungen = []; s.einst.sprache = 'de'; });
  it('mehrere Schritte (Beschriftungen, Metadaten, doppelte Antworten) ergeben eine Meldung mit allen Teilen', async () => {
    s.spalten = [{ name: 'ID' }, { name: 'meta' }, { name: 'F1' }] as never;
    const fb = new FragebogenImport();
    fb.name = 'x.csv';
    fb.erk = {
      beschriftungen: { F1: 'Wie war das Essen?' }, hersteller: 'nextcloud', spalten: [], kopfzeilen: 1, meldungen: [], tabelle: { kopf: [], zeilen: [] },
      vorschlaege: [
        { id: 'metadaten', art: 'metadaten', spalten: ['meta'] },
        { id: 'doppelte', art: 'doppelte', gruppen: [[0, 1]], grund: 'kennung' },
      ],
    } as unknown as Erkennung;
    fb.wahl.haken = { metadaten: true, doppelte: true };
    await fb.uebernehmeNachOeffnen();
    expect(zustand.aufrufe.length).toBe(3);   // drei Schritte im Protokoll
    expect(zustand.einzeln).toBe(0);          // aber keine Einzelmeldung
    expect(s.meldungsverlauf.length).toBe(1);
    expect(s.meldungsverlauf[0]!.text).toBe('Übernommen: Beschriftungen gesetzt, Metadaten markiert, 1 doppelte Antwort markiert.');
    expect(gesagt.filter(g => g.kanal === 'hoeflich').length).toBe(1);
    expect(zustand.sammelt).toBe(false);      // nach dem Lauf wird wieder einzeln gemeldet
  });
});

describe('Quelltext-Prüfungen (kein DOM in dieser Testumgebung)', () => {
  it('B1: Dialog-Überschrift ist fokussierbar und bekommt beim Erscheinen den Fokus', () => {
    const q = quelle('../bausteine/FragebogenDialog.svelte');
    expect(q).toMatch(/<h1 id="fb-t" tabindex="-1">/);
    expect(q).toMatch(/onMount\([^]*getElementById\('fb-t'\)[^]*focus\(/);
  });
  it('B2: der Ergebnissatz der XLSForm steht im Bereich am Dateiknopf und wird angesagt', () => {
    const q = quelle('../bausteine/FragebogenDialog.svelte');
    const bereich = /<div id="fb-xls-meld">([^]*?)<\/div>/.exec(q)![1]!;
    expect(bereich).toContain('fb.xlsSatz');
    expect(bereich).toContain('fb.xlsFehler');
    const k = quelle('./fragebogenimport.svelte.ts');
    expect(k).toMatch(/sage\(this\.xlsSatz\)/);
    expect(k).toMatch(/sage\(this\.xlsFehler, 'dringend'\)/);
  });
  it('B8: Regel- und Spaltenwahl in „Fälle für Interviews“ sagen den Vorschlag an', () => {
    const q = quelle('../bausteine/FaelleAuswahl.svelte');
    expect(q).toMatch(/function wechsle\([^]*sageVorschlag/);
    expect(q).toMatch(/Fälle? vorgeschlagen:/);
    expect(q).toMatch(/sage\(fehlerSatz\(a\.fehler\)\)/);
  });
  it('B9: beide Notizfelder je Gruppe tragen den Gruppennamen im Namen', () => {
    const q = quelle('../bausteine/FaelleGruppen.svelte');
    expect(q).toMatch(/for="gz-\{g\.id\}">[^]*?nur-vorleser"> - \{L\(`Gruppe \$\{g\.name\}`/);
  });
  it('axe B1: Passung-Auswahlkreise sind mindestens 24 x 24 px', () => {
    const q = quelle('../bausteine/FaelleGruppen.svelte');
    expect(q).toMatch(/\.passung \.schalter input\[type="radio"\] \{[^}]*width: 24px; height: 24px; min-width: 24px; min-height: 24px/);
  });
  it('B10: Speichern der Integrationsfelder wird angesagt', () => {
    const q = quelle('../seiten/Bericht.svelte');
    expect(q).toMatch(/setzeIntegration\(f, ev\.currentTarget\.value\); sage\(/);
  });
});
