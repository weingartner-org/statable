// Vorbereitung für die NVDA-Messung Stufe 3 (ohne NVDA, headless): erzeugt age-Schlüssel, Plan-Dateien, Link und Fragebogen-Datei (HTML) in %TEMP%\n3-daten.
// Aufruf in app/:  node e2e/probe/nvda-erheben3-vorbereiten.mjs   (gegen vite preview auf Port 4232)
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const BASIS = `http://localhost:${process.env.NVDA_PORT ?? 4232}`;
export const DIR = join(tmpdir(), 'n3-daten');
mkdirSync(DIR, { recursive: true });
const AGE_DIR = process.env.AGE_DIR ?? join(homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages', 'FiloSottile.age_Microsoft.Winget.Source_8wekyb3d8bbwe', 'age');
const exe = n => join(AGE_DIR, `${n}.exe`);
const key = spawnSync(exe('age-keygen'), [], { env: { ...process.env, PATH: `${AGE_DIR}${delimiter}${process.env.PATH}` } });
const keyText = key.stdout.toString('utf8') + '\n' + key.stderr.toString('utf8');
const pub = /public key: (age1[a-z0-9]+)/i.exec(keyText)[1];
writeFileSync(join(DIR, 'id.txt'), /(AGE-SECRET-KEY-1[A-Z0-9]+)/.exec(keyText)[1] + '\n');

const { testplan } = await import(pathToFileURL(join(process.cwd(), "src", "ausfuellen", "seite-testplan.ts")).href);
const plan = testplan(pub);
writeFileSync(join(DIR, 'testplan.statable-fragebogen.json'), JSON.stringify({ format: 'statable-fragebogen-datei', version: 1, plan, bilder: {} }));

// kleiner Plan für die Station (zwei Seiten, Pflicht)
const zw = (de, en) => ({ de, en });
const st = {
  format: 'statable-fragebogen', version: 1, id: 'station-nvda', revision: 1, titel: zw('Stationsumfrage', 'Station survey'), sprachen: ['de', 'en'],
  einleitung: zw('Danke, dass Sie mitmachen.', 'Thank you for taking part.'),
  einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
  antwortlisten: [{ id: 'farben', name: 'farben', geordnet: false, optionen: [
    { id: 'farben:1', wert: 1, text: zw('Rot', 'Red') }, { id: 'farben:2', wert: 2, text: zw('Grün', 'Green') }, { id: 'farben:3', wert: 3, text: zw('Blau', 'Blue') }] }],
  skalen: [],
  elemente: [
    { art: 'seite', id: 's1', name: 's1', titel: zw('Ihre Meinung', 'Your opinion'), elemente: [
      { art: 'frage', id: 'F1', name: 'F1', typ: 'einfach', text: zw('Welche Farbe mögen Sie?', 'Which colour do you like?'), liste: 'farben', pflicht: { an: true }, kodebuch: { niveau: 'nominal' } } ] },
    { art: 'seite', id: 's2', name: 's2', titel: zw('Noch etwas', 'One more thing'), elemente: [
      { art: 'frage', id: 'T', name: 'T', typ: 'text', text: zw('Was möchten Sie noch sagen?', 'Anything to add?'), text_: { mehrzeilig: false, maxZeichen: 80 }, kodebuch: { niveau: 'nominal' } } ] },
  ],
  empfaenger: { schluessel: pub, name: 'Dr. Muster' }, geaendert: 1,
};
writeFileSync(join(DIR, 'station.statable-fragebogen.json'), JSON.stringify({ format: 'statable-fragebogen-datei', version: 1, plan: st, bilder: {} }));

// Link und Datei über die App erzeugen
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'de-DE', viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
await page.goto(BASIS + '/#fragebogen'); await page.waitForSelector('h1');
await page.locator('input[type=file][accept*=json]').first().setInputFiles(join(DIR, 'testplan.statable-fragebogen.json'));
await page.waitForTimeout(1000);
await page.locator('#fb-ex-knopf').click();
await page.waitForSelector('#fb-ex-versand-t');
console.log('gesperrt?', await page.getByTestId('fb-versand-link').getAttribute('aria-disabled'));
await page.getByTestId('fb-versand-link').click();
await page.getByTestId('fb-link-feld').waitFor();
const link = (await page.inputValue('#fb-ex-link')).replace('https://statable.eu', BASIS);
writeFileSync(join(DIR, 'link.txt'), link);
const [d] = await Promise.all([page.waitForEvent('download'), page.getByTestId('fb-versand-datei').click()]);
await d.saveAs(join(DIR, 'Fragebogen-Datei.html'));
console.log('Link-Länge', link.length, '| Datei', d.suggestedFilename(), '| Ordner', DIR);
await b.close();
