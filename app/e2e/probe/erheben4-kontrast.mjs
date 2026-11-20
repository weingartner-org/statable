// Stufe 4, Punkt 3: Kontrastmodus (forcedColors: active) in allen Zuständen, de und en, 1280 px.
// Prüft: jedes Bedienelement hat Rand oder sichtbaren Text; der laufende Beitrag ist als Text („läuft“) sichtbar.
// Aufruf aus app/:  node e2e/probe/erheben4-kontrast.mjs
import { starteBrowser, runFlow, sichern } from './erheben4-lib.mjs';

const b = await starteBrowser();
const laeufe = [];
try {
  for (const sprache of ['de', 'en']) {
    console.log(`--- Kontrastmodus, ${sprache}, 1280 px`);
    const r = await runFlow(b, { sprache, breite: 1280, forced: true });
    laeufe.push(r);
    for (const z of r.zustaende) {
      if (!z.verstoesse) { console.log(`   ${z.name}: ${z.text ?? JSON.stringify(z.dialog ?? '')}`); continue; }
      const k = z.kontrast;
      console.log(`   ${z.name}: axe ${z.verstoesse.length} Verstöße, ${z.unklar} unklar | ohne Rand/Text: ${k.ohne.length} | Kästchen vom System: ${k.systemKaestchen} | „läuft“ sichtbar: ${k.laeuft}`);
      for (const o of k.ohne) console.log(`      OHNE RAND/TEXT: ${o.tag}${o.typ ? '[' + o.typ + ']' : ''} „${o.name}“`);
      for (const v of z.verstoesse) console.log(`      VERSTOSS ${v.id}: ${v.knoten.map((x) => x.ziel).join(' ; ').slice(0, 200)}`);
    }
    for (const z of r.zustaende.filter((x) => x.dialog)) console.log('   Tastenprobe:', JSON.stringify(z.dialog));
    if (r.fehler.length) console.log('   Fehler:', r.fehler.join(' || '));
  }
} finally {
  await b.close();
  sichern('erheben4-kontrast.json', laeufe);
}
