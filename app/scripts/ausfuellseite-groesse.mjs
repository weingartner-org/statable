// Misst das gebündelte Skript der Ausfüllseite (Stufe 3C) wie vite.config.ts es baut. Aufruf in app/:  node scripts/ausfuellseite-groesse.mjs [Zieldatei.js]
// Gibt Größe, Gegenprobe „kein scrypt“ und die größten Module aus.
import { writeFileSync } from 'node:fs';
import { baueAusfuellseite } from './ausfuellseite-bau.mjs';

const wurzel = process.cwd();
const { code, module } = await baueAusfuellseite(wurzel);
console.log(`Skript: ${Buffer.byteLength(code)} Byte; scrypt im Text: ${/scrypt/i.test(code)}; Entschlüsseln (typage Decrypter) im Text: ${/no identity matched/.test(code)}`);
for (const [m, v] of Object.entries(module).map(([m, v]) => [m.replace(wurzel, ''), v.renderedLength]).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(String(v).padStart(8), m);
if (process.argv[2]) writeFileSync(process.argv[2], code);
