// V4: SCORM-1.2-Paket (lib/scorm.ts) und Meldung von Statable (lib/lms.ts).
// XSD-Prüfung nur mit SCORM_XSD_DIR (die ADL/IMS-Schemata liegen nicht im Git): scripts/scorm-pruefen.py.
import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strFromU8, unzipSync } from 'fflate';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import { baueScormPaket, dateinameScorm, jsWert, manifest, saubereKennung, saubererTitel, scormLink, startseite, LMS_ART, LMS_FASSUNG, type ScormTexte } from './scorm';
import { baueMeldung, lmsModus, meldeAbschluss } from './lms';

const T: ScormTexte = { sprache: 'en', einleitung: 'Intro', knopf: 'Open Statable', hinweisFenster: 'Keep open', ohneLms: 'No LMS', verbunden: 'Connected', fertig: 'Completed', schonFertig: 'Already', blockiert: 'Blocked', linkText: 'Link:' };
const LINK = 'https://statable.eu/?lms=scorm#lernen/import/abc_DEF-123';
const BOESE = 'Pfad </title><script>alert(1)</script> & "x" \'y\' \u202e</script>';

describe('Link', () => {
  it('hängt lms=scorm vor dem # an und lässt andere Angaben stehen', () => {
    expect(scormLink('https://statable.eu/#lernen/import/abc')).toBe('https://statable.eu/?lms=scorm#lernen/import/abc');
    expect(scormLink('https://statable.eu/?sprache=en#lernen/import/abc')).toBe('https://statable.eu/?sprache=en&lms=scorm#lernen/import/abc');
    expect(scormLink('http://127.0.0.1:5199/app/#lernen/import/x')).toBe('http://127.0.0.1:5199/app/?lms=scorm#lernen/import/x');
  });
  it('erkennt den Modus nur an lms=scorm', () => {
    expect(lmsModus('?lms=scorm')).toBe(true);
    expect(lmsModus('?sprache=de&lms=scorm')).toBe(true);
    expect(lmsModus('')).toBe(false);
    expect(lmsModus('?lms=moodle')).toBe(false);
  });
});

describe('Paket', () => {
  const zip = unzipSync(baueScormPaket({ titel: 'Regression lesen', link: LINK, kennung: 'mein-abc' }, T));
  it('enthält genau imsmanifest.xml und index.html im Wurzelordner', () => {
    expect(Object.keys(zip).sort()).toEqual(['imsmanifest.xml', 'index.html']);
  });
  it('Manifest ist SCORM 1.2 mit einem SCO, das auf index.html zeigt', () => {
    const doc = new XmlDomParser().parseFromString(strFromU8(zip['imsmanifest.xml']!), 'text/xml');
    const m = doc.documentElement!;
    expect(m.localName).toBe('manifest');
    expect(m.getAttribute('xmlns')).toBe('http://www.imsproject.org/xsd/imscp_rootv1p1p2');
    expect(doc.getElementsByTagName('schemaversion')[0]!.textContent).toBe('1.2');
    const org = doc.getElementsByTagName('organizations')[0]!;
    const orgEl = doc.getElementsByTagName('organization')[0]!;
    expect(org.getAttribute('default')).toBe(orgEl.getAttribute('identifier'));
    const item = doc.getElementsByTagName('item')[0]!;
    const res = doc.getElementsByTagName('resource')[0]!;
    expect(item.getAttribute('identifierref')).toBe(res.getAttribute('identifier'));
    expect(res.getAttributeNS('http://www.adlnet.org/xsd/adlcp_rootv1p2', 'scormtype')).toBe('sco');
    expect(res.getAttribute('href')).toBe('index.html');
    expect(doc.getElementsByTagName('title')[0]!.textContent).toBe('Regression lesen');
  });
  it('Startseite trägt Link, Ursprung und Meldungsart als Daten', () => {
    const h = strFromU8(zip['index.html']!);
    expect(h).toContain('<html lang="en">');
    expect(h).toContain(jsWert(LINK));
    expect(h).toContain('"ursprung":"https://statable.eu"');
    expect(h).toContain(`"art":"${LMS_ART}"`);
    expect(h).toContain('LMSInitialize');
    expect(h).toContain("'cmi.core.lesson_status', 'completed'");
    expect(h).toContain('ev.source !== fenster');
    // keine fremden Dateien, keine Punkte
    expect(h).not.toMatch(/<script[^>]+src=/);
    expect(h).not.toMatch(/<link[^>]+href=/);
    expect(h).not.toContain('score');
  });
  it('Dateiname ohne verbotene Zeichen', () => {
    expect(dateinameScorm('A/B: C?')).toBe('A-B- C- - SCORM.zip');
  });
});

describe('Sicherheit mit bösem Pfadnamen', () => {
  const e = { titel: BOESE, link: 'https://statable.eu/?lms=scorm#lernen/import/x', kennung: 'a b<c>' };
  it('Manifest bleibt gültiges XML, Titel kommt als Text an', () => {
    const fehler: string[] = [];
    const doc = new XmlDomParser({ onError: (_l: string, m: string) => { fehler.push(m); } }).parseFromString(manifest(e), 'text/xml');
    expect(fehler).toEqual([]);
    expect(doc.getElementsByTagName('title')[0]!.textContent).toBe(saubererTitel(BOESE));
    expect(doc.documentElement!.getAttribute('identifier')).toBe('statable-a-b-c');
  });
  it('Startseite: kein zweites <script>, kein Richtungszeichen im Titel', () => {
    const h = startseite(e, { ...T, einleitung: '<img src=x onerror=alert(1)>' });
    expect(h.match(/<script>/g)!.length).toBe(1);
    expect(h.match(/<\/script>/g)!.length).toBe(1);
    expect(h).not.toContain('<img');
    expect(h).not.toContain('\u202e');
  });
  it('jsWert maskiert alles, was ein Skript beenden könnte', () => {
    const w = jsWert({ a: '</script><!-- \u2028 & >' });
    expect(w).not.toMatch(/[<>&\u2028]/);
    expect(JSON.parse(w)).toEqual({ a: '</script><!-- \u2028 & >' });
  });
  it('Kennung und Titel haben Ersatzwerte', () => {
    expect(saubereKennung('***')).toBe('pfad');
    expect(saubererTitel('  \u0000 ')).toBe('Statable');
    expect(saubererTitel('x'.repeat(300)).length).toBe(200);
  });
});

describe('Meldung von Statable', () => {
  const fenster = (suche: string, opener: unknown) => ({ location: { search: suche }, opener } as unknown as Window);
  it('schickt nur im SCORM-Modus, nur wenn alles beantwortet ist, nur an ein öffnendes Fenster', () => {
    const post: unknown[] = [];
    const op = { postMessage: (m: unknown, z: string) => post.push([m, z]) };
    expect(meldeAbschluss(3, 3, fenster('', op))).toBe(false);
    expect(meldeAbschluss(2, 3, fenster('?lms=scorm', op))).toBe(false);
    expect(meldeAbschluss(0, 0, fenster('?lms=scorm', op))).toBe(false);
    expect(meldeAbschluss(3, 3, fenster('?lms=scorm', null))).toBe(false);
    expect(post).toEqual([]);
    expect(meldeAbschluss(3, 3, fenster('?lms=scorm', op))).toBe(true);
    expect(post).toEqual([[{ art: LMS_ART, fassung: LMS_FASSUNG, status: 'completed', beantwortet: 3, gesamt: 3 }, '*']]);
  });
  it('die Meldung enthält nichts außer Stand und Zahlen', () => {
    expect(Object.keys(baueMeldung(1, 1)).sort()).toEqual(['art', 'beantwortet', 'fassung', 'gesamt', 'status']);
  });
  it('ein Fehler beim Schicken bricht nichts', () => {
    expect(meldeAbschluss(1, 1, fenster('?lms=scorm', { postMessage: () => { throw new Error('weg'); } }))).toBe(false);
  });
});

/* ------------------------------------------------------------------ Prüfung gegen die ADL-Schemata */
describe.skipIf(!process.env.SCORM_XSD_DIR)('Manifest gegen imscp_rootv1p1p2.xsd und adlcp_rootv1p2.xsd (scripts/scorm-pruefen.py)', () => {
  it('ist gültig, auch mit bösem Namen', () => {
    const skript = fileURLToPath(new URL('../../../scripts/scorm-pruefen.py', import.meta.url));
    const ordner = mkdtempSync(join(tmpdir(), 'scorm-'));
    try {
      const a = join(ordner, 'gut.xml'), b = join(ordner, 'boese.xml');
      writeFileSync(a, manifest({ titel: 'Regression lesen', link: LINK, kennung: 'mein-abc' }));
      writeFileSync(b, manifest({ titel: BOESE, link: LINK, kennung: 'a b<c>' }));
      let r: ReturnType<typeof spawnSync> | undefined;
      for (const exe of ['py', 'python3', 'python']) {
        r = spawnSync(exe, [skript, process.env.SCORM_XSD_DIR!, a, b], { encoding: 'utf8' });
        if (!r.error) break;
      }
      expect(String(r!.stderr) + String(r!.stdout)).toContain('GUELTIG 2');
      expect(r!.status).toBe(0);
    } finally { rmSync(ordner, { recursive: true, force: true }); }
  });
});
