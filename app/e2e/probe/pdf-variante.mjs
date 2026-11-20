// Prüfhilfe Block C: druckt ein HTML (Datei) mit Chromium als getaggtes PDF. Aufruf: node e2e/probe/pdf-variante.mjs ein.html aus.pdf [bg]
import { chromium } from '@playwright/test'; import { readFileSync } from 'node:fs';
const [,, ein, aus, bg] = process.argv;
const b = await chromium.launch(); const q = await (await b.newContext({ locale: 'de-DE' })).newPage();
await q.setContent(readFileSync(ein, 'utf8'), { waitUntil: 'load' }); await q.waitForTimeout(800);
await q.pdf({ path: aus, format: 'A4', tagged: true, outline: true, printBackground: bg === 'bg' }); await b.close();
