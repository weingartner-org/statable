/**
 * Stufe 3C: Plan im Link (hin und zurück), Fragebogen-Datei (Plan escapt, Größe, nichts Fremdes darin) und Link-Länge.
 * Läuft in Node; das Skript der Ausfüllseite kommt über das virtuelle Modul aus vite.config.ts (verschachtelter Bau, einige Sekunden).
 * Das Ausfüllen im Browser prüft src/ausfuellen/seite.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { deflateSync, strToU8 } from 'fflate';
import { dekodierePlan, kodierePlan, MAX_PLAN_BYTES } from '../ausfuellen/planlink';
import { GEFAEHRLICH, testplan } from '../ausfuellen/seite-testplan';
import { LINK_BASIS, LINK_MAX_ZEICHEN, fragebogenDatei, fragebogenDateiname, fragebogenLink, fragebogenLinkInfo, planFuerAusfuellen } from './fragebogendatei';

const SCHLUESSEL = 'age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p';

describe('Plan im Link', () => {
  it('Plan hin und zurück ergibt denselben Plan (mit Umlauten, Sonderzeichen, Emoji)', () => {
    const p = testplan(SCHLUESSEL, { einleitung: { de: 'Grüße „Zitat“ ß € 😀 <b>&</b>', en: 'x' } });
    const zurueck = dekodierePlan(kodierePlan(p));
    expect(zurueck).toEqual(JSON.parse(JSON.stringify(p)));
  });
  it('Der Link beginnt mit der Ausfüllseite, hat nur base64url hinter dem # und enthält keinen Klartext des Plans', () => {
    const link = fragebogenLink(testplan(SCHLUESSEL));
    expect(link.startsWith(`${LINK_BASIS}#`)).toBe(true);
    expect(LINK_BASIS).toBe('https://statable.eu/ausfuellen/');
    expect(link.slice(LINK_BASIS.length + 1)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(link).not.toContain('Beispielumfrage');
    expect(dekodierePlan(new URL(link).hash)).toEqual(JSON.parse(JSON.stringify(planFuerAusfuellen(testplan(SCHLUESSEL)))));
  });
  it('Kaputtes, Leeres und Zip-Bomben werden abgelehnt, nicht ausgeführt', () => {
    expect(() => dekodierePlan('')).toThrow();
    expect(() => dekodierePlan('#')).toThrow();
    expect(() => dekodierePlan('###')).toThrow();
    expect(() => dekodierePlan('AAAA')).toThrow();
    expect(() => dekodierePlan(kodierePlan('x').slice(0, 5))).toThrow();
    const bombe = Buffer.from(deflateSync(strToU8('0'.repeat(MAX_PLAN_BYTES + 1000)), { level: 9 })).toString('base64url');
    expect(bombe.length).toBeLessThan(5000);
    expect(() => dekodierePlan(bombe)).toThrow(/zu groß/);
  });
  it('Über 8.000 Zeichen: zuLang gesetzt (Hinweis „Datei statt Link“), darunter nicht', () => {
    expect(LINK_MAX_ZEICHEN).toBe(8000);
    const klein = fragebogenLinkInfo(testplan(SCHLUESSEL));
    expect(klein.zuLang).toBe(false);
    console.log(`Link des Testplans: ${klein.laenge} Zeichen`);
    // viele schwer zu komprimierende Fragen
    let s = 12345;
    const zufall = (n: number) => Array.from({ length: n }, () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return String.fromCharCode(33 + ((s >>> 16) % 90)); }).join('');
    const p = testplan(SCHLUESSEL);
    for (let i = 0; i < 40; i++) p.elemente[0]!.elemente.push({ art: 'hinweis', id: `H${i}`, name: `H${i}`, text: { de: zufall(300 + i), en: zufall(200 + i) } });
    const gross = fragebogenLinkInfo(p);
    expect(gross.laenge).toBeGreaterThan(8000);
    expect(gross.zuLang).toBe(true);
  });
  it('Nur erlaubte Felder: keine Code-Liste, keine Herkunft, kein Pretest-Schalter; codeVerlangt bleibt ja/nein', () => {
    const p = testplan(SCHLUESSEL, { codes: [{ code: 'ABCD-EFGH' }], herkunft: { art: 'neu', zeit: 1, codes: { x: { a: 1 } } }, geprueft: { F1: ['x'] }, exportNamen: { limesurvey: { F1: 'q' } } });
    p.einstellungen.pretest = true;
    const aus = planFuerAusfuellen(p);
    expect(Object.keys(aus)).not.toEqual(expect.arrayContaining(['codes']));
    for (const k of ['codes', 'herkunft', 'geprueft', 'exportNamen', 'geaendert']) expect(aus).not.toHaveProperty(k);
    expect(aus.codeVerlangt).toBe(true);
    expect((aus.einstellungen as { pretest: boolean }).pretest).toBe(false);
    expect(JSON.stringify(aus)).not.toContain('ABCD-EFGH');
    expect(fragebogenLink(p)).not.toContain('ABCD');
  });
});

describe('Fragebogen-Datei', () => {
  it('eine einzelne HTML-Datei: lang und title aus dem Plan, Plan als JSON escapt, `</script>` im Fragetext bricht nichts, Größe unter 300 KB', async () => {
    const p = testplan(SCHLUESSEL, { titel: { de: `Titel & <Tag> "x" ${GEFAEHRLICH}`, en: 'Title' }, codes: [{ code: 'GEHEIM-0001' }] });
    const text = await fragebogenDatei(p);
    const bytes = Buffer.byteLength(text, 'utf8');
    console.log(`Fragebogen-Datei: ${bytes} Byte (${(bytes / 1024).toFixed(1)} KB)`);
    expect(bytes).toBeLessThan(300 * 1024);
    expect(text.startsWith('<!doctype html>')).toBe(true);
    expect(text).toMatch(/<html lang="de">/);
    expect(text).toContain('<title>Titel &amp; &lt;Tag&gt; &quot;x&quot; &lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;</title>');
    // genau die Skript-Anfangs- und -Endmarken, die wir selbst gesetzt haben: zwei Skripte (Plan, Programm), ein noscript
    expect((text.match(/<script/gi) ?? []).length).toBe(2);
    expect((text.match(/<\/script/gi) ?? []).length).toBe(2);
    const json = /<script type="application\/json" id="statable-plan">([\s\S]*?)<\/script>/.exec(text)![1]!;
    expect(json).not.toContain('<');
    const zurueck = JSON.parse(json);
    expect(zurueck.titel.de).toContain(GEFAEHRLICH);
    expect(zurueck.elemente[0].elemente[0].text.de).toContain(GEFAEHRLICH);
    expect(zurueck.empfaenger.schluessel).toBe(SCHLUESSEL);
    for (const k of ['codes', 'herkunft', 'geaendert']) expect(zurueck).not.toHaveProperty(k);
    expect(text).not.toContain('GEHEIM-0001');
    expect(text).toContain('<noscript>');
    expect(text).toContain('Diese Datei bitte direkt im Browser öffnen');
    // läuft ohne Netz: keine fremde Adresse als Quelle, Netzzugriff per Content-Security-Policy gesperrt
    expect(text).toMatch(/Content-Security-Policy" content="default-src 'none'/);
    expect(text).not.toMatch(/<(script|link|img|iframe)[^>]+(src|href)="https?:/i);
    // Verschlüsseln ja, scrypt-Rechnung nein (Platzhalter), Entschlüsseln nicht gebündelt
    expect(text).not.toContain('no identity matched');
  }, 120_000);

  it('Dateiname wie bei den anderen Exporten', () => {
    expect(fragebogenDateiname(testplan(SCHLUESSEL))).toBe('Beispielumfrage - Fragebogen-Datei.html');
    expect(fragebogenDateiname(testplan(SCHLUESSEL, { titel: { de: 'A/B: "Test"?' } }))).toBe('AB Test - Fragebogen-Datei.html');
  });
});
