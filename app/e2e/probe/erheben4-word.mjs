// Stufe 4, Punkt 6: Word- und Codebuch-Dateien über die Oberfläche erzeugen (Downloads werden abgefangen) und prüfen:
// Leitfaden (beide Fassungen), Kodierleitfaden (Word und .qdc), Transkript (drei Zeitformen), Redeanteile (Word).
// Prüfung: node scripts/docx-pruefen.mjs <datei> (Ausgang 0) und py scripts/qdc-pruefen.py <datei> mit REFI_XSD_DIR.
// Aufruf aus app/:  node e2e/probe/erheben4-word.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { starteBrowser, oeffne, T, ERG, sichern } from './erheben4-lib.mjs';

const REPO = 'C:\\Entwicklung\\pspp-web';
const XSD = 'C:\\Users\\johan\\AppData\\Local\\Temp\\refi-xsd';
const b = await starteBrowser();
const ergebnis = [];
const pruefe = (datei) => {
  const werkzeug = datei.endsWith('.qdc') ? ['py', ['scripts/qdc-pruefen.py', datei], { env: { ...process.env, REFI_XSD_DIR: XSD } }] : ['node', ['scripts/docx-pruefen.mjs', datei], {}];
  try {
    const out = execFileSync(werkzeug[0], werkzeug[1], { cwd: REPO, env: werkzeug[2].env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out: out.trim().slice(0, 300) };
  } catch (e) {
    return { code: e.status, out: ((e.stdout || '') + (e.stderr || '')).trim().slice(0, 400) };
  }
};

try {
  for (const sprache of ['de', 'en']) {
    const t = T[sprache];
    const ordner = `${ERG}\\word\\${sprache}`;
    mkdirSync(ordner, { recursive: true });
    const { ctx, page, fehler } = await oeffne(b, { sprache, breite: 1280 });
    const w = (ms = 400) => page.waitForTimeout(ms);
    let nr = 0;
    const laden = async (locator, name) => {
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), locator.click()]);
      nr++;
      const datei = `${ordner}\\${String(nr).padStart(2, '0')}-${dl.suggestedFilename()}`;
      await dl.saveAs(datei);
      const pr = pruefe(datei);
      const hash = createHash('sha256').update(readFileSync(datei)).digest('hex').slice(0, 12);
      ergebnis.push({ sprache, art: name, datei: dl.suggestedFilename(), sha256: hash, exit: pr.code, ausgabe: pr.out });
      console.log(`${sprache} | ${name} | ${dl.suggestedFilename()} | ${hash} | Ausgang ${pr.code}`);
    };
    try {
      // Leitfaden mit Fragen, Block und Erzählaufforderung
      await page.getByRole('button', { name: t.neu, exact: true }).click(); await w();
      await page.locator('#lf-sam-text').fill(t.fragen.join('\n'));
      await page.getByRole('button', { name: t.fragenHinzu, exact: true }).click(); await w();
      await page.getByRole('button', { name: `2. ${t.schritt[1]}`, exact: true }).click(); await w();
      const radios = page.getByRole('radio', { name: t.behalten, exact: true });
      for (let i = 0; i < await radios.count(); i++) await radios.nth(i).check();
      await page.getByRole('button', { name: `3. ${t.schritt[2]}`, exact: true }).click(); await w();
      await page.locator('#lf-so-neu').fill(t.block);
      await page.getByRole('button', { name: t.blockNeu, exact: true }).click(); await w();
      const sel = page.locator('section.schritt select');
      for (let i = 0; i < await sel.count(); i++) await sel.nth(i).selectOption({ index: 1 });
      await page.getByRole('button', { name: `4. ${t.schritt[3]}`, exact: true }).click(); await w();
      await page.getByRole('textbox', { name: t.erzaehl }).first().fill(t.erzaehlText);
      await laden(page.getByRole('button', { name: t.word, exact: true }), 'Leitfaden (Word)');
      await laden(page.getByRole('button', { name: t.mitnehmen, exact: true }), 'Leitfaden zum Mitnehmen (große Schrift)');

      // Kodierleitfaden mit zwei Codes, Word und .qdc
      for (const c of t.codes.slice(0, 2)) {
        if ((await page.locator('#kodl-name').count()) === 0) await page.locator('#kodl-neu-haupt').click();
        await page.locator('#kodl-name').fill(c);
        await page.locator('section.kodl').locator('button[type=submit]').click(); await w(400);
      }
      await laden(page.locator('section.kodl').getByRole('button', { name: sprache === 'de' ? 'Als Word' : 'As Word', exact: true }), 'Kodierleitfaden (Word)');
      await laden(page.locator('section.kodl').getByRole('button', { name: sprache === 'de' ? 'Als REFI-QDA-Codebuch (.qdc)' : 'As REFI-QDA codebook (.qdc)', exact: true }), 'Kodierleitfaden (.qdc)');

      // Transkript: drei Zeitformen über das Export-Menü, dann Redeanteile als Word
      await page.locator('#iv-beispiel').click();
      await page.waitForSelector('#iv-offen-t', { timeout: 60000 }); await w(800);
      const exportMenue = page.locator('section.offen').getByRole('button', { name: t.export }).first();
      const zeitformen = sprache === 'de'
        ? ['Word, ohne Zeitangaben', 'Word, Zeit am Anfang jedes Beitrags', 'Word, Zeitmarke am Ende (f4-Form)']
        : ['Word, without times', 'Word, time at the start of each contribution', 'Word, time mark at the end (f4 form)'];
      for (const z of zeitformen) {
        await exportMenue.click(); await w(300);
        await laden(page.locator('.em-menue button').filter({ hasText: z }).first(), `Transkript: ${z}`);
        await w(300);
      }
      await laden(page.locator('section.offen').getByRole('button', { name: sprache === 'de' ? 'Als Word' : 'As Word', exact: true }), 'Redeanteile (Word)');
      if (fehler.length) console.log(`${sprache} Fehler:`, fehler.join(' || '));
    } catch (e) {
      ergebnis.push({ sprache, art: 'Ablauf abgebrochen', fehler: e.message.split('\n')[0].slice(0, 300) });
      console.log(`${sprache} Ablauf abgebrochen: ${e.message.split('\n')[0].slice(0, 300)}`);
    } finally {
      await ctx.close();
    }
  }
} finally {
  await b.close();
  sichern('erheben4-word.json', ergebnis);
}
const fehlgeschlagen = ergebnis.filter((x) => x.exit !== 0);
console.log(`Dateien: ${ergebnis.filter((x) => x.exit !== undefined).length}, nicht bestanden: ${fehlgeschlagen.length}`);
