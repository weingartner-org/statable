// Stufe 4, Punkte 1, 2 und 5: axe in allen Zuständen (de/en, 1280 und 320 px), waagrechter Überlauf, Zielgrößen 24 px.
// Aufruf aus app/:  node e2e/probe/erheben4-axe.mjs
import { starteBrowser, runFlow, sichern } from './erheben4-lib.mjs';

const b = await starteBrowser();
const laeufe = [];
try {
  for (const sprache of ['de', 'en']) {
    for (const breite of [1280, 320]) {
      console.log(`--- Lauf: ${sprache}, ${breite} px`);
      const r = await runFlow(b, { sprache, breite });
      laeufe.push(r);
      for (const z of r.zustaende) {
        if (!z.verstoesse) { console.log(`   ${z.name}: ${JSON.stringify(z.text ?? z.dialog ?? '')}`); continue; }
        const ziele = z.ziele.filter((x) => !x.ausnahme);
        console.log(`   ${z.name}: axe ${z.verstoesse.length} Verstöße, ${z.unklar} unklar | Überlauf ${z.seite.scroll > z.seite.breite + 1 ? 'JA ' + z.seite.scroll : 'nein'} | abgeschnitten ${z.seite.abgeschnitten} | Ziele unter 24 px: ${ziele.length} (Ausnahmen ${z.ziele.length - ziele.length})`);
        for (const v of z.verstoesse) console.log(`      VERSTOSS ${v.id} (${v.impact}): ${v.knoten.map((k) => k.ziel).join(' ; ').slice(0, 200)}`);
        if (ziele.length) console.log(`      kleine Ziele: ${ziele.slice(0, 6).map((x) => `${x.name} ${x.w}x${x.h}`).join(' | ')}`);
        if (z.seite.abgeschnitten) console.log(`      über den Rand: ${z.seite.beispiele.join(' | ')}`);
      }
      if (r.fehler.length) console.log('   Fehler:', r.fehler.join(' || '));
    }
  }
} finally {
  await b.close();
  sichern('erheben4-axe.json', laeufe);
}
const gesamt = laeufe.flatMap((r) => r.zustaende.filter((z) => z.verstoesse)).reduce((s, z) => s + z.verstoesse.length, 0);
console.log(`Verstöße gesamt: ${gesamt}`);
