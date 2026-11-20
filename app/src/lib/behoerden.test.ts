// Blatt „Für Behörden“ (Fachblatt BEHOERDEN, Abschnitt 7): Liste der Bestandteile, Prüfbericht, Content-Security-Policy, Texte.
// Prüft die reinen Teile der Skripte (kein Netz, kein Lauf der Suite). Der Lauf selbst: node scripts/sbom.mjs <Ordner>, node scripts/pruef-bericht.mjs <Ordner>.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CSP_TEXT, cspDirektiven, externeQuellen } from './csp';
import { cspAusDeploy, cspAusText } from '../../../scripts/csp-lesen.mjs';
import { setzeEin } from '../../../scripts/csp-einsetzen.mjs';
import { createHash } from 'node:crypto';
import { atGrenzenKomponenten, engineKomponenten, klassifikationKomponenten, pruefeListe, rPaketKomponenten, schriftKomponenten, schriftNamen, svelteKomponente, type Liste } from '../../../scripts/sbom.mjs';
import { baueBericht, bauHtml, sollwertTabelle, ueberspringGrund } from '../../../scripts/pruef-bericht.mjs';

const wurzel = fileURLToPath(new URL('../../../', import.meta.url));
const lies = (...p: string[]) => readFileSync(wurzel + p.join('/'), 'utf8');

describe('Content-Security-Policy aus DEPLOY.md', () => {
  it('liest den Codeblock unter „Empfohlene Sicherheits-Header“', () => {
    const csp = cspAusDeploy();
    expect(csp).toMatch(/^default-src 'self';/);
    expect(csp).toContain("connect-src 'self'");
    expect(csp.includes('\n')).toBe(false);
  });
  it('liefert einen leeren Text, wenn nichts zu finden ist (kein erfundener Wortlaut)', () => {
    expect(cspAusText('Nichts davon')).toBe('');
    expect(cspAusDeploy(wurzel + 'gibt-es-nicht.md')).toBe('');
  });
  it('das Blatt docs/STATABLE-FUER-BEHOERDEN.md enthält genau diesen Wortlaut (node scripts/csp-einsetzen.mjs, wenn nicht)', () => {
    const blatt = lies('docs', 'STATABLE-FUER-BEHOERDEN.md');
    const m = /<!-- csp:start -->\r?\n```\r?\n([^\n]+)\r?\n```\r?\n<!-- csp:ende -->/.exec(blatt);
    expect(m?.[1]).toBe(cspAusDeploy());
    expect(setzeEin(blatt, cspAusDeploy())).toBe(blatt);
  });
  it('die App bekommt den Wortlaut beim Bau (define __CSP__) - hier im Test aus derselben Quelle', () => {
    expect(CSP_TEXT).toBe(cspAusDeploy());
  });
  it('externe Adressen: genau zwei in der Empfehlung (Eurostat und Eurostat-Grenzen, nur in connect-src); Hosts, https: und * zählen; self, none, data:, blob: nicht', () => {
    expect(externeQuellen(cspAusDeploy())).toEqual(['https://ec.europa.eu', 'https://gisco-services.ec.europa.eu']);
    const connect = cspDirektiven(cspAusDeploy()).find(d => d[0] === 'connect-src');
    expect(connect?.[1]).toEqual(["'self'", 'https://ec.europa.eu', 'https://gisco-services.ec.europa.eu']);
    for (const [name, quellen] of cspDirektiven(cspAusDeploy())) if (name !== 'connect-src') expect(quellen.filter(q => /^https?:|[*]/.test(q)), name).toEqual([]);
    expect(externeQuellen("default-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://api.beispiel.org https: *")).toEqual(['https://api.beispiel.org', 'https:', '*']);
    expect(cspDirektiven("a 'self' x; b y").map(d => d[0])).toEqual(['a', 'b']);
  });
});

describe('Liste der Bestandteile (scripts/sbom.mjs)', () => {
  const r = rPaketKomponenten();
  it('alle 43 R-Pakete mit Prüfsumme, ohne Abweichung zwischen rpakete.json, webr-pakete.sha256 und den Dateien', () => {
    expect(r.probleme).toEqual([]);
    expect(r.komponenten).toHaveLength(43);
    expect(r.anzahlListe).toBe(43);
    expect(r.anzahlSummen).toBe(43);
    for (const k of r.komponenten) {
      expect(k.purl).toMatch(/^pkg:cran\/[^@]+@.+$/);
      expect(k.hashes?.[0]?.alg).toBe('SHA-256');
      expect(k.hashes?.[0]?.content).toMatch(/^[0-9a-f]{64}$/);
    }
  });
  it('lmerTest ist als eigene Fassung gekennzeichnet', () => {
    const l = r.komponenten.find(k => k.name === 'lmerTest');
    expect(l?.properties?.some(p => p.name === 'statable:eigene-fassung')).toBe(true);
  });
  it('webR, R und PSPP mit Version aus den Bauskripten; gnulib ohne erfundene Version', () => {
    const e = engineKomponenten();
    expect(e.probleme).toEqual([]);
    const v = (n: string) => e.komponenten.find(k => k.name === n)?.version;
    expect(v('webr')).toBe('0.6.0');
    expect(v('R')).toBe('4.6.0');
    expect(v('GNU PSPP')).toBe('2.1.3');
    const gnulib = e.komponenten.find(k => k.name === 'gnulib');
    expect(gnulib?.version).toBeUndefined();
    expect(gnulib?.licenses).toBeUndefined();
    expect(e.komponenten.find(k => k.name === 'webr')?.hashes?.[0]?.content).toMatch(/^[0-9a-f]{64}$/);
    expect(e.komponenten.filter(k => k.type === 'file').length).toBeGreaterThan(0);
  });
  it('Svelte kommt trotz Entwicklungspaket in die Liste', () => {
    const s = svelteKomponente();
    expect(s.name).toBe('svelte');
    expect(s.licenses?.[0]?.license.id).toBeTruthy();
  });
  it('Schriften: Lizenz nur aus der Schriftdatei', () => {
    const ks = schriftKomponenten();
    const next = ks.find(k => k.name === 'Atkinson Hyperlegible Next');
    expect(next?.licenses?.[0]?.license.name).toMatch(/SIL Open Font License/);
    const alt = ks.find(k => k.name === 'Atkinson Hyperlegible');
    expect(alt?.licenses?.[0]?.license.name).toMatch(/without derivatives or alteration/);
    const n = schriftNamen(wurzel + 'app/public/fonts/atkinson-next-400.woff2');
    expect(n.familie).toBe('Atkinson Hyperlegible Next');
    expect(n.version).toContain('2.001');
  });
  it('pruefeListe: erkennt Zahl der R-Pakete, doppelte Kennungen, Entwicklungswerkzeuge und ungültige Prüfsummen', () => {
    const gut = (): Liste => ({ bomFormat: 'CycloneDX', specVersion: '1.6', serialNumber: 'urn:uuid:12345678-1234-1234-1234-123456789012', components: [
      { type: 'library', name: 'svelte', 'bom-ref': 's', purl: 'pkg:npm/svelte@5' }, { type: 'application', name: 'webr', 'bom-ref': 'w' },
      { type: 'application', name: 'GNU PSPP', 'bom-ref': 'p' }, { type: 'application', name: 'R', 'bom-ref': 'r' },
      { type: 'library', name: 'MASS', 'bom-ref': 'm', purl: 'pkg:cran/MASS@1', hashes: [{ alg: 'SHA-256', content: 'a'.repeat(64) }] },
    ] });
    expect(pruefeListe(gut(), { erwarteteRPakete: 1, entwicklungswerkzeuge: ['vite', 'svelte'] })).toEqual([]);
    expect(pruefeListe(gut(), { erwarteteRPakete: 43, entwicklungswerkzeuge: [] }).join()).toMatch(/43 erwartet/);
    const dev = gut(); dev.components!.push({ type: 'library', name: 'vite', 'bom-ref': 'v', purl: 'pkg:npm/vite@8' });
    expect(pruefeListe(dev, { erwarteteRPakete: 1, entwicklungswerkzeuge: ['vite'] }).join()).toMatch(/Entwicklungswerkzeug in der Liste: vite/);
    const dop = gut(); dop.components!.push({ type: 'library', name: 'x', 'bom-ref': 's' });
    expect(pruefeListe(dop, { erwarteteRPakete: 1, entwicklungswerkzeuge: [] }).join()).toMatch(/doppelt/);
    const kaputt = gut(); kaputt.components![4]!.hashes = [{ alg: 'SHA-256', content: 'xyz' }];
    expect(pruefeListe(kaputt, { erwarteteRPakete: 1, entwicklungswerkzeuge: [] }).join()).toMatch(/ungültig/);
  });
});

describe('Prüfbericht (scripts/pruef-bericht.mjs)', () => {
  const ctx = { zeit: '2026-10-31T00:00:00Z', git: { kurz: 'abc', zweig: 'x', geaendert: 0, datum: '' }, umgebung: { node: 'v', rechner: 'r' }, sollwerte: [], sollwerteR: { versionen: [], gesamt: 0, ohneAngabe: 0 } };
  const roh = { numTotalTests: 4, testResults: [
    { name: wurzel + 'app/src/lib/a.test.ts', status: 'passed', assertionResults: [{ status: 'passed', title: 'eins', fullName: 'eins' }, { status: 'pending', title: 'zwei', fullName: 'zwei', ancestorTitles: [] }] },
    { name: wurzel + 'app/src/lib/b.test.ts', status: 'failed', assertionResults: [{ status: 'failed', title: 'drei', fullName: 'drei', failureMessages: ['\u001b[31mAssertionError\u001b[0m: <b>falsch</b>'] }, { status: 'todo', title: 'vier', fullName: 'vier' }] },
  ] };
  it('zählt bestanden, gescheitert und übersprungen und nennt die gescheiterten', () => {
    const b = baueBericht(roh, ctx);
    expect(b.summe).toMatchObject({ dateien: 2, dateienGescheitert: 1, tests: 4, bestanden: 1, gescheitert: 1, uebersprungen: 2 });
    expect(b.gescheitert[0]?.name).toBe('drei');
    expect(b.gescheitert[0]?.meldung).not.toContain('\u001b');
    expect(b.uebersprungen.map(u => u.name)).toEqual(['zwei', 'vier']);
  });
  it('eine Datei, die sich nicht ausführen ließ, zählt als gescheitert', () => {
    const b = baueBericht({ testResults: [{ name: wurzel + 'app/src/lib/c.test.ts', status: 'failed', message: 'Syntaxfehler', assertionResults: [] }] }, ctx);
    expect(b.summe.gescheitert).toBe(1);
    expect(b.gescheitert[0]?.name).toMatch(/nicht ausführen/);
  });
  it('HTML: Klartext oben bei Fehlern, der Pflichtsatz, maskierte Zeichen, keine Note', () => {
    const html = bauHtml(baueBericht(roh, ctx));
    expect(html).toMatch(/<strong>Achtung: 1 Test ist gescheitert\./);
    expect(html).toContain('Sie beweisen nicht, dass jede Rechnung auf allen Daten richtig ist.');
    expect(html).toContain('keine Zertifizierung');
    expect(html).not.toContain('<b>falsch</b>');
    const gruen = bauHtml(baueBericht({ testResults: [{ name: wurzel + 'app/src/lib/a.test.ts', status: 'passed', assertionResults: [{ status: 'passed', title: 'x', fullName: 'x' }] }] }, ctx));
    expect(gruen).toContain('Alle 1 Tests, die liefen, wurden bestanden.');
    expect(gruen).not.toContain('Achtung');
  });
  it('Grund für übersprungene Tests: Bedingung und Kommentar aus dem Quelltext, sonst „nicht festgehalten“', () => {
    const q = "// Braucht webR (bash scripts/webr-holen.sh)\ndescribe.skipIf(!WEBR_DA)('R-Teil', () => {\n  it('rechnet', () => {});\n});\n";
    expect(ueberspringGrund(q, 'rechnet', ['R-Teil'])).toMatch(/skipIf\(!WEBR_DA\).*Braucht webR/);
    expect(ueberspringGrund("it('x', () => {});", 'x', [])).toBe('Grund im Test nicht festgehalten');
  });
  it('Sollwert-Dateien: Prüfsumme (SHA-256) für jede Datei *erwartet*.json, Quelle nur wenn festgehalten', () => {
    const t = sollwertTabelle();
    expect(t.length).toBeGreaterThan(20);
    for (const w of t) { expect(w.sha256).toMatch(/^[0-9a-f]{64}$/); expect(w.datei).toMatch(/erwartet.*\.json$/); expect(Array.isArray(w.tests)).toBe(true); }
    const w5 = t.find(w => w.datei.endsWith('welle5-erwartet.json'));
    expect(w5?.skript).toBe('scripts/welle5-erwartet.R');
    expect(w5?.rVersion).toMatch(/^R version/);
    expect(t.some(w => w.rVersion === null)).toBe(true);   // nicht überall festgehalten: bleibt „unbekannt“, wird nicht ergänzt
  });
});

describe('Eurostat (Fachblatt SAISON-EUROSTAT, Abschnitt 2): Datenschutz, Behörden und CSP sagen dasselbe', () => {
  const app = lies('app', 'src', 'seiten', 'Rechtliches.svelte'), md = lies('docs', 'STATABLE-FUER-BEHOERDEN.md'), deploy = lies('DEPLOY.md');
  it('DEPLOY.md, Behördenblatt und die Policy der App nennen dieselbe Adresse', () => {
    for (const q of [deploy, md, CSP_TEXT]) expect(q).toContain("connect-src 'self' https://ec.europa.eu https://gisco-services.ec.europa.eu;");
    expect(deploy).toMatch(/Der Server muss diese Zeile in seiner Kopfzeile ändern/);   // Übergabe an den Mac: die Policy auf dem Server
  });
  it('Datenschutzseite und Behörden-Seite nennen: Klick, Europäische Kommission, IP-Adresse und Abfrage, sonst nichts', () => {
    for (const quelle of [app, md]) {
      expect(quelle).toContain('ec.europa.eu'); expect(quelle).toContain('Europäische Kommission'); expect(quelle).toContain('Von Eurostat laden');
      expect(quelle).toMatch(/IP-Adresse und die Abfrage/); expect(quelle).toMatch(/Daten aus Statable werden nicht gesendet/);
    }
    for (const en of ['European Commission', 'IP address and the query', 'no data from Statable is sent', 'Load from Eurostat']) expect(app).toContain(en);
  });
  it('der Satz „Keine fremden Dienste“ steht nur noch für die Offline-Fassung; sonst wird die Anfrage an die Kommission genannt', () => {
    const a = app.indexOf('{#snippet fremdeDienste()}'), b = app.indexOf('{/snippet}', a);
    expect(a).toBeGreaterThan(-1); expect(b).toBeGreaterThan(a);
    const rest = app.slice(0, a) + app.slice(b);
    expect(rest).not.toContain('Keine fremden Dienste'); expect(rest).not.toContain('No third-party services');
    const snippet = app.slice(a, b);
    expect(snippet).toContain('{#if OFFLINE}'); expect(snippet).toContain('Keine fremden Dienste'); expect(snippet).toContain('Von Eurostat laden');
    expect(app.split('{@render fremdeDienste()}').length - 1).toBe(2);   // in beiden Aufzählungen der Datenschutzseite
  });
  it('die Offline-Fassung zeigt die Eurostat-Sätze nicht', () => {
    expect(app.split('{#if !OFFLINE}').length - 1).toBeGreaterThanOrEqual(3);
    expect(app).toContain('Die Offline-Fassung bietet beides nicht an'); expect(app).toContain('The offline version offers neither'); expect(md).toContain('Die Offline-Fassung bietet beides nicht an');
  });
  it('Verzeichnis der Verarbeitungstätigkeiten: Empfänger nennt die Kommission beim Klick', () => {
    expect(md).toContain('| Empfänger | Durch Statable keine, außer beim Klick auf „Von Eurostat laden“');
    expect(app).toContain('Empfänger: durch Statable keine, außer beim Klick auf „Von Eurostat laden“');
  });
});

describe('Texte: nichts behaupten, was nicht belegt ist', () => {
  const dateien = ['docs/STATABLE-FUER-BEHOERDEN.md', 'docs/ERKLAERUNG-BARRIEREFREIHEIT-ENTWURF.md', 'app/src/seiten/Rechtliches.svelte', 'scripts/sbom.mjs', 'scripts/pruef-bericht.mjs'];
  it('keine Prüfung durch Fachpersonen, keine Zugangsdaten und Zugangslinks', () => {
    for (const d of dateien) {
      const t = lies(...d.split('/'));
      expect(t, d).not.toMatch(/Fachperson/i);
      expect(t, d).not.toMatch(/statistik-zugang/i);
      expect(t, d).not.toMatch(/ssh sensorik/i);
    }
  });
  it('die offenen Punkte stehen als „offen“ im Blatt und in der App', () => {
    const md = lies('docs', 'STATABLE-FUER-BEHOERDEN.md'), app = lies('app', 'src', 'seiten', 'Rechtliches.svelte');
    for (const p of ['Hostingvertrag', 'Reaktionszeit bei Sicherheitsmeldungen', 'Updatepolitik', 'Löschfristen der Meldungen', 'Ansprechstelle']) { expect(md).toContain(p); expect(app).toContain(p); }
    expect(md).toContain('keine Rechtsberatung');
    expect(app).toContain('This is not legal advice.');
  });
});

describe('Karte und Klassifikationen (Fachblatt KLASSIFIKATION-KARTEN, Abschnitt 1 bis 3): Datenschutz, Behörden, CSP und Liste der Bestandteile sagen dasselbe', () => {
  const app = lies('app', 'src', 'seiten', 'Rechtliches.svelte'), md = lies('docs', 'STATABLE-FUER-BEHOERDEN.md'), deploy = lies('DEPLOY.md');
  it('DEPLOY.md, Behördenblatt und die Policy der App nennen die Adresse der Grenzen; sie steht nur in connect-src', () => {
    for (const q of [deploy, md]) expect(q).toContain('https://gisco-services.ec.europa.eu');
    expect(CSP_TEXT).toContain('https://gisco-services.ec.europa.eu');
    for (const [name, quellen] of cspDirektiven(cspAusDeploy())) if (name !== 'connect-src') expect(quellen.join(' ')).not.toContain('gisco');
    expect(deploy).toMatch(/erst nach einem Klick auf „Grenzen von Eurostat laden“ und der Bestätigung der Bedingungen/);
    expect(deploy).toMatch(/Der Server muss diese Zeile in seiner Kopfzeile ändern/);
  });
  it('Datenschutzseite und Behörden-Seite nennen: Klick, Europäische Kommission, IP-Adresse und Adresse der Datei, sonst nichts', () => {
    for (const quelle of [app, md]) {
      expect(quelle).toContain('gisco-services.ec.europa.eu'); expect(quelle).toContain('Grenzen von Eurostat laden');
      expect(quelle).toMatch(/IP-Adresse und (die )?Adresse der Datei/); expect(quelle).toMatch(/Daten aus Statable werden nicht gesendet/);
    }
    for (const en of ['Load boundaries from Eurostat', 'IP address and the address of the file', 'no data from Statable is sent']) expect(app).toContain(en);
  });
  it('der Datenschutz-Abschnitt zu den Grenzen steht nur ohne Offline-Fassung und nennt EuroGeographics und die nicht-kommerzielle Nutzung', () => {
    const a = app.indexOf('Wenn Grenzen von Eurostat für die Karte geladen werden');
    expect(a).toBeGreaterThan(-1);
    expect(app.lastIndexOf('{#if !OFFLINE}', a)).toBeGreaterThan(app.lastIndexOf('{/if}', a));   // unmittelbar im Block ohne Offline-Fassung
    const abschnitt = app.slice(a, app.indexOf('Wenn Daten von Eurostat geladen werden', a));
    expect(abschnitt).toContain('EuroGeographics'); expect(abschnitt).toContain('nicht-kommerziell'); expect(abschnitt).toContain('Die Offline-Fassung bietet das Laden nicht an');
  });
  it('Empfänger und Drittland im Verzeichnis nennen auch die Grenzen', () => {
    expect(md).toContain('Dasselbe gilt beim Klick auf „Grenzen von Eurostat laden“'); expect(app).toContain('Dasselbe gilt beim Klick auf „Grenzen von Eurostat laden“');
  });
  it('Klassifikationen: Quelle und Lizenz mit Wortlaut im Impressum, im Behördenblatt und in der Liste der Bestandteile', () => {
    for (const [name, text] of [['Impressum', app], ['Behördenblatt', md], ['sbom.mjs', lies('scripts', 'sbom.mjs')]] as const) {
      expect(text, name).toContain('Statistik Austria'); expect(text, name).toContain('CC BY 4.0');
    }
    for (const text of [app, md]) { expect(text).toContain('Creative Commons Namensnennung 4.0 International (CC BY 4.0)'); expect(text).toContain('Datenquelle: Statistik Austria - data.statistik.gv.at'); }
    expect(app).toContain('Creative Commons Attribution 4.0 International (CC BY 4.0)');
  });
  it('Liste der Bestandteile: fünf Klassifikationen (drei Statistik Austria, zwei Eurostat) mit Lizenz, Quelle und Prüfsumme der Datei', () => {
    const k = klassifikationKomponenten();
    expect(k.probleme).toEqual([]);
    expect(k.komponenten.map(c => c.name).sort()).toEqual(['ISCO-08', 'NUTS 2021', 'NUTS 2024', 'ÖNACE 2008', 'ÖNACE 2025']);
    for (const c of k.komponenten) {
      const nuts = c.name.startsWith('NUTS');
      expect(c.type).toBe('data');
      if (nuts) { expect(c.licenses?.[0]?.license?.name).toContain('2011/833/EU'); expect(c.description).toContain('Datenquelle: Eurostat - NUTS'); }
      else { expect(c.licenses?.[0]?.license?.id).toBe('CC-BY-4.0'); expect(c.description).toContain('Datenquelle: Statistik Austria - data.statistik.gv.at'); }
      const datei = readFileSync(wurzel + String(c.properties?.find(p => p.name === 'statable:datei')?.value));
      expect(c.hashes?.[0]?.content).toBe(createHash('sha256').update(datei).digest('hex'));
      expect(c.properties?.find(p => p.name === 'statable:quelle-sha256')?.value).toMatch(nuts ? /^https:\/\/ec\.europa\.eu\/eurostat\/documents\/\S+\.xlsx [0-9a-f]{64}$/ : /^https:\/\/data\.statistik\.gv\.at\/data\/OGDEXT_KLASSDB_\w+_1\.zip [0-9a-f]{64}$/);
      expect(c.externalReferences?.some(e => e.type === 'distribution')).toBe(true);
    }
    expect(pruefeListe({ bomFormat: 'CycloneDX', specVersion: '1.6', serialNumber: 'urn:uuid:' + '0'.repeat(8) + '-0000-0000-0000-' + '0'.repeat(12), components: k.komponenten } as never, { erwarteteRPakete: 0, entwicklungswerkzeuge: [] }).filter(x => /Prüfsumme|bom-ref/.test(x))).toEqual([]);
  });
  it('NUTS und BEV-Grenzen: Quelle und Lizenz im Impressum und im Behördenblatt; Bezirke und Gemeinden in der Liste der Bestandteile', () => {
    for (const [name, text] of [['Impressum', app], ['Behördenblatt', md]] as const) {
      expect(text, name).toContain('Eurostat'); expect(text, name).toContain('2011/833/EU');
      expect(text, name).toContain('Bundesamt für Eich- und Vermessungswesen'); expect(text, name).toContain('CC BY 4.0');
    }
    const a = atGrenzenKomponenten();
    expect(a.probleme).toEqual([]);
    expect(a.komponenten).toHaveLength(1);
    const c = a.komponenten[0]!;
    expect(c.licenses?.[0]?.license?.id).toBe('CC-BY-4.0');
    expect(c.hashes?.[0]?.content).toBe(createHash('sha256').update(readFileSync(wurzel + 'app/public/karten/at/index.json')).digest('hex'));
    expect(c.properties?.find(p => p.name === 'statable:quelle-sha256')?.value).toMatch(/^https:\/\/data\.bev\.gv\.at\/download\/\S+\.zip [0-9a-f]{64}$/);
  });
  it('Texte: Quelle und Lizenz im Wortlaut der Quelle, keine Prüfung durch Fachpersonen behauptet', () => {
    expect(lies('scripts', 'klass-holen.mjs')).toContain('Creative Commons Namensnennung 4.0 International (CC BY 4.0)');
    for (const text of [app, md]) expect(text).not.toMatch(/Fachperson/i);
  });
});
