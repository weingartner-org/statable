import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Wächter Barrierefreiheit Welle 1, Schritt 5 (Ansagen): Es gibt zwei feste Regionen (lib/ansage.ts), und es kommen keine neuen Live-Regionen dazu.
 *  Regel: Ansagen laufen über `sage()`. Ein neues `aria-live`, `role="status"` oder `role="alert"` in einer `.svelte`-Datei ist nur erlaubt, wenn die Datei
 *  hier in der Ausnahmeliste steht (Stand der Bestandsaufnahme docs/barrierefreiheit/ANSAGEN-LISTE.md) und ihre Zahl nicht steigt.
 *  Wer eine Stelle auf `sage()` umstellt, senkt die Zahl hier (der Test sagt es, wenn die Liste zu großzügig ist). */

const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function dateien(ordner: string, endung: string, aus: string[] = []): string[] {
  for (const n of readdirSync(ordner)) {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules') dateien(p, endung, aus); }
    else if (p.endsWith(endung)) aus.push(p);
  }
  return aus;
}

const MUSTER = /aria-live|role="status"|role="alert"/g;
/** Zählt Live-Stellen in einem Quelltext (Kommentare nicht herausgenommen: auch ein Kommentar mit dem Muster soll auffallen). */
export const zaehleLive = (quelltext: string): number => (quelltext.match(MUSTER) ?? []).length;

/** Ausnahmeliste: Datei (relativ zu app/src) -> höchste erlaubte Zahl. Nur senken, nie erhöhen. */
const AUSNAHMEN: Record<string, number> = {
  'App.svelte': 1,
  'bausteine/AmtlichBearbeiten.svelte': 2,
  'bausteine/AmtlichBlatt.svelte': 2,
  'bausteine/Anova3Block.svelte': 1,
  'bausteine/AssistentEigenschaften.svelte': 1,
  'bausteine/AssistentKlassifikation.svelte': 2,
  'bausteine/AssistentMikrodaten.svelte': 2,
  'bausteine/AssistentPlausibel.svelte': 2,
  'bausteine/AssistentRahmen.svelte': 2,
  'bausteine/AssistentVergleichen.svelte': 1,
  'bausteine/AssistentZeitreihe.svelte': 1,
  'bausteine/AssistentZusammen.svelte': 1,
  'bausteine/Ausgabe.svelte': 2,
  'bausteine/BalkenBlock.svelte': 1,
  'bausteine/BaumBlock.svelte': 3,
  'bausteine/BayesMehrBlock.svelte': 1,
  'bausteine/BlattAuffaelligeWerte.svelte': 2,
  'bausteine/BlattCluster.svelte': 3,
  'bausteine/BlattGranger.svelte': 2,
  'bausteine/BlattLoglinear.svelte': 1,
  'bausteine/BlattMassnahme.svelte': 4,
  'bausteine/BlattMehrere.svelte': 1,
  'bausteine/BlattMethodenvergleich.svelte': 3,
  'bausteine/BlattNeueDaten.svelte': 2,
  'bausteine/BlattPeriodogramm.svelte': 2,
  'bausteine/BlattPrognose.svelte': 3,
  'bausteine/BlattReferenz.svelte': 2,
  'bausteine/BlattRobust.svelte': 1,
  'bausteine/BlattSterbetafel.svelte': 2,
  'bausteine/BlattZufall.svelte': 3,
  'bausteine/DiagnoseBlock.svelte': 1,
  'bausteine/DifBlock.svelte': 2,
  'bausteine/EurostatDialog.svelte': 3,
  'bausteine/ExportMenue.svelte': 1,
  'bausteine/FaelleAuswahl.svelte': 2,
  'bausteine/FaelleTeilung.svelte': 1,
  'bausteine/Fallgewicht.svelte': 2,
  'bausteine/FallgewichtRaking.svelte': 7,
  'bausteine/FehlendLittle.svelte': 2,
  'bausteine/FragebogenDialog.svelte': 6,
  'bausteine/GrmBlock.svelte': 2,
  'bausteine/ImputationBlock.svelte': 3,
  'bausteine/InvarianzBlock.svelte': 3,
  'bausteine/Irt2plBlock.svelte': 3,
  'bausteine/IrtPersonenSpalte.svelte': 1,
  'bausteine/KalibrierBlock.svelte': 2,
  'bausteine/KategorienBlatt.svelte': 2,
  'bausteine/KategorienErgebnis.svelte': 1,
  'bausteine/KategorienLeitfaden.svelte': 3,
  'bausteine/KategorienThemen.svelte': 1,
  'bausteine/KategorienZuordnen.svelte': 1,
  'bausteine/KonfirmatorischeFa.svelte': 1,
  'bausteine/KontoFeld.svelte': 2,
  'bausteine/KontrasteBlock.svelte': 1,
  'bausteine/KorrespondenzBlock.svelte': 1,
  'bausteine/KreuzWege.svelte': 3,
  'bausteine/LernSuche.svelte': 2,
  'bausteine/LernlaborBaumrechner.svelte': 1,
  'bausteine/LernlaborBayes.svelte': 1,
  'bausteine/LernlaborStichprobe.svelte': 1,
  'bausteine/LernlaborUeberdeckung.svelte': 1,
  'bausteine/LernlaborVierfelder.svelte': 1,
  'bausteine/LernlaborZufall.svelte': 1,
  'bausteine/LogistikPruefen.svelte': 1,
  'bausteine/LoglinRueck.svelte': 1,
  'bausteine/ManovaFolge.svelte': 1,
  'bausteine/MatchingBlock.svelte': 2,
  'bausteine/MdsBlock.svelte': 1,
  'bausteine/MehrebenenModelle.svelte': 1,
  'bausteine/MehrebenenZusatz.svelte': 1,
  'bausteine/Mehrfachsets.svelte': 1,
  'bausteine/Melden.svelte': 3,
  'bausteine/MesssystemBlock.svelte': 1,
  'bausteine/MetaZusatz.svelte': 1,
  'bausteine/MwZweiBlock.svelte': 2,
  'bausteine/Normwerte.svelte': 1,
  'bausteine/OmegaZeile.svelte': 1,
  'bausteine/PfadBau.svelte': 3,
  'bausteine/PfadBlock.svelte': 3,
  'bausteine/PfadImport.svelte': 2,
  'bausteine/PlanenF2.svelte': 1,
  'bausteine/PlanenNeu.svelte': 3,
  'bausteine/QcaBlock.svelte': 2,
  'bausteine/QdaDialog.svelte': 3,
  'bausteine/RStart.svelte': 3,
  'bausteine/Rand.svelte': 1,
  'bausteine/RaschBlock.svelte': 2,
  'bausteine/RegelkarteBlock.svelte': 2,
  'bausteine/RobustBlock.svelte': 1,
  'bausteine/Skalen.svelte': 1,
  'bausteine/Sprachwahl.svelte': 1,
  'bausteine/TabelleAnzeige.svelte': 1,
  'bausteine/UmfrageWege.svelte': 1,
  'bausteine/VerstehenEffekt.svelte': 1,
  'bausteine/VerstehenUeben.svelte': 2,
  'bausteine/VerstehenVerdeckt.svelte': 4,
  'bausteine/VerstehenVergleich.svelte': 6,
  'bausteine/VerstehenZuteilung.svelte': 1,
  'bausteine/VorlageBereich.svelte': 5,
  'bausteine/ZaehlkartenBlock.svelte': 2,
  'seiten/Befehle.svelte': 1,
  'seiten/Bericht.svelte': 3,
  'seiten/Blatt.svelte': 7,
  'seiten/Einstellungen.svelte': 1,
  'seiten/Hilfe.svelte': 3,
  'seiten/Karte.svelte': 7,
  'seiten/Lernen.svelte': 4,
  'seiten/Rechtliches.svelte': 1,
  'seiten/Start.svelte': 3,
  'seiten/Umformen.svelte': 1,
};

const alle = dateien(SRC, '.svelte').map((p) => ({ rel: p.slice(SRC.length).replaceAll(String.fromCharCode(92), '/').replace(/^\//, ''), text: readFileSync(p, 'utf8') }));

/** Dateien, die die Zahl überschreiten oder gar nicht in der Liste stehen. */
export function ueberschreitungen(dateienListe: { rel: string; text: string }[], erlaubt: Record<string, number>): string[] {
  return dateienListe.flatMap(({ rel, text }) => { const n = zaehleLive(text), max = erlaubt[rel] ?? 0; return n > max ? [`${rel}: ${n} statt höchstens ${max}`] : []; });
}

describe('keine neuen Live-Regionen', () => {
  it('keine .svelte-Datei hat mehr aria-live / role=status / role=alert als in der Ausnahmeliste', () => {
    expect(ueberschreitungen(alle, AUSNAHMEN)).toEqual([]);
  });
  it('die Ausnahmeliste ist nicht großzügiger als nötig (Zahl gesunken: Liste nachziehen)', () => {
    const zuViel = Object.entries(AUSNAHMEN).flatMap(([rel, max]) => { const n = zaehleLive(alle.find((d) => d.rel === rel)?.text ?? ''); return n < max ? [`${rel}: ${n} statt ${max}`] : []; });
    expect(zuViel).toEqual([]);
  });
  it('Grundmenge: der Wächter hat die Dateien wirklich gesehen', () => {
    expect(alle.length).toBeGreaterThan(250);
    expect(alle.reduce((a, d) => a + zaehleLive(d.text), 0)).toBe(Object.values(AUSNAHMEN).reduce((a, b) => a + b, 0));
  });
  it('Gegenprobe des Messgeräts: eine zusätzliche Region in einer Datei ohne Ausnahme wird gefunden', () => {
    const mitFehler = [...alle, { rel: 'bausteine/Neu.svelte', text: '<p aria-live="polite">x</p>' }, { rel: 'App.svelte', text: alle.find((d) => d.rel === 'App.svelte')!.text + '<div role="alert"></div>' }].filter((d) => d.rel !== 'App.svelte' || d.text.includes('role="alert"></div>'));
    expect(ueberschreitungen(mitFehler, AUSNAHMEN).sort()).toEqual(['App.svelte: 2 statt höchstens 1', 'bausteine/Neu.svelte: 1 statt höchstens 0']);
  });
});

describe('die zwei Regionen', () => {
  const ansage = readFileSync(join(SRC, 'lib/ansage.ts'), 'utf8');
  it('entstehen genau einmal: eine Stelle legt sie an, keine .svelte-Datei oder index.html baut sie nach', () => {
    expect(ansage.match(/appendChild\(/g)?.length).toBe(1);
    expect(ansage.match(/createElement\(/g)?.length).toBe(1);
    const nachgebaut = alle.filter((d) => /ansage-hoeflich|ansage-dringend/.test(d.text)).map((d) => d.rel);
    expect(nachgebaut).toEqual([]);
    expect(readFileSync(join(SRC, '../index.html'), 'utf8')).not.toMatch(/ansage-hoeflich|ansage-dringend/);
  });
  it('die App legt sie beim Start an, bevor die erste Meldung kommt', () => {
    expect(alle.find((d) => d.rel === 'App.svelte')!.text).toMatch(/onMount\(starteAnsagen\)/);
  });
  it('Takt mit setTimeout, nie requestAnimationFrame', () => {
    expect(ansage).not.toMatch(/requestAnimationFrame\s*\(/);
    expect(ansage).toMatch(/setTimeout\(f, 0\)/);
  });
  it('der Meldungsort der App ist keine Live-Region (sonst jede Karte doppelt)', () => {
    const app = alle.find((d) => d.rel === 'App.svelte')!.text;
    expect(app).toMatch(/<div class="toast-ort">/);
    expect(app).not.toMatch(/role="alert"/);
  });
});

describe('die Liste ist vollständig', () => {
  it('keine Stelle steht mehr als „Spätere Welle“ in der Liste (F6: jede Stelle ist entschieden)', () => {
    const liste = readFileSync(join(SRC, '../../docs/barrierefreiheit/ANSAGEN-LISTE.md'), 'utf8');
    expect(liste).not.toMatch(/Spätere Welle|später prüfen/);
  });
  it('Gesamtzahl nach F6: höchstens 221 Treffer (nur senken)', () => {
    expect(alle.reduce((a, d) => a + zaehleLive(d.text), 0)).toBeLessThanOrEqual(221);
  });
  it('jede Datei mit einer Live-Stelle steht in docs/barrierefreiheit/ANSAGEN-LISTE.md', () => {
    const liste = readFileSync(join(SRC, '../../docs/barrierefreiheit/ANSAGEN-LISTE.md'), 'utf8');
    const fehlt = alle.filter((d) => zaehleLive(d.text) > 0 && !liste.includes(`## ${d.rel}\n`)).map((d) => d.rel);
    expect(fehlt).toEqual([]);
  });
});
