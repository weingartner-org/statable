// Erheben 2, Prüfung 2.1 (Dateien B): die erzeugte HTML-Datei als file:// mit axe (1280 und 320 px), lang, title, Überschriften.
// Aufruf: node e2e/probe/erheben2-html.mjs <pfad-zur-html>
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { axe, breite, rec } from './erheben1-lib.mjs';
const b = await chromium.launch();
const p = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 } })).newPage();
await p.goto(pathToFileURL(process.argv[2]).href);
rec({ typ: 'html-kopf', lang: await p.evaluate(() => document.documentElement.lang), titel: await p.title(), ueberschriften: await p.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4')].map(h => h.tagName + ':' + h.innerText.trim().slice(0, 50))) });
await axe(p, 'HTML-Datei (file://)', '1280 px');
await breite(p, 'HTML-Datei 1280 px');
await p.setViewportSize({ width: 320, height: 800 }); await p.waitForTimeout(300);
await axe(p, 'HTML-Datei (file://)', '320 px');
await breite(p, 'HTML-Datei 320 px');
await b.close();
