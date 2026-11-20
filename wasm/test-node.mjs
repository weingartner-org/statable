// Node-Test des WASM-Moduls: Syntax, SAV-Rundlauf im virtuellen Dateisystem, Umlaute.
// Aufruf: node wasm/test-node.mjs   (nach build-wasm.sh und Kopie nach app/public/wasm/)
import createPspp from '../app/public/wasm/pspp.mjs';

const m = await createPspp();
m.cwrap('pspp_web_init', 'number', [])();
const run = m.cwrap('pspp_web_run', 'number', ['string']);
let off = 0;
const take = () => {
  const t = m.FS.readFile('/out.ndjson', { encoding: 'utf8' });
  const s = t.slice(off); off = t.length;
  return s.split('\n').filter(Boolean).map(l => JSON.parse(l));
};

run(`DATA LIST LIST /a (F3) b (F5.1) s (A8).
BEGIN DATA
1 2.5 eins
2 3.5 zwei
3 7.0 drei
END DATA.
VARIABLE LABELS a 'Merkmal A'.
SAVE OUTFILE='/t.sav'.`);
take();
const size = m.FS.stat('/t.sav').size;
const bytes = m.FS.readFile('/t.sav');   // im Browser: Download oder OPFS
m.FS.unlink('/t.sav');
m.FS.writeFile('/neu.sav', bytes);       // im Browser: Upload oder OPFS
run(`NEW FILE.
GET FILE='/neu.sav'.
DISPLAY DICTIONARY.
LIST.`);
const items = take();
console.log('SAV-Datei:', size, 'Bytes; Elemente:', items.map(i => i.type).join(','));
console.log('Variablenlabel nach Rundlauf vorhanden:', JSON.stringify(items).includes('Merkmal A'));

run(`NEW FILE.
DATA LIST LIST /ort (A12).
BEGIN DATA
Graz
Wien-Süd
Köln
END DATA.
LIST.`);
console.log('Umlaute:', take().filter(i => i.type === 'table').map(t => t.cells.map(c => c.t).join(',')).join(' / '));
