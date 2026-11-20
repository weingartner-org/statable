// Stufe 4, Punkt 4: Tastatur-Durchlauf in allen Zuständen (de und en, 1280 px): jedes sichtbare Bedienelement mit Tab erreichbar,
// Fokus sichtbar, keine Falle; Dialoge: Fokus hinein, Tab bleibt im Dialog, Esc schließt, Fokus zurück.
// Aufruf aus app/:  node e2e/probe/erheben4-tab.mjs
import { starteBrowser, runFlow, sichern } from './erheben4-lib.mjs';

const b = await starteBrowser();
const laeufe = [];
try {
  for (const sprache of ['de', 'en']) {
    console.log(`--- Tab-Durchlauf, ${sprache}, 1280 px`);
    const r = await runFlow(b, { sprache, breite: 1280, walk: true, dialogTests: true });
    laeufe.push(r);
    for (const z of r.zustaende) {
      if (z.dialog) { console.log(`   ${z.name}: hinein ${z.dialog.fokusHinein}, bleibt ${z.dialog.fokusBleibtImDialog}, Esc schließt ${z.dialog.escSchliesst}, Fokus zurück ${z.dialog.fokusZurueck} (vorher „${z.dialog.fokusVorher}“, nachher „${z.dialog.fokusNachher}“)`); continue; }
      if (!z.tab) { console.log(`   ${z.name}: ${z.text ?? ''}`); continue; }
      const t = z.tab;
      console.log(`   ${z.name}: ${t.erreicht} von ${t.bedienelemente} erreicht, Schritte ${t.schritte}, Falle ${t.falle ?? 'nein'}, ohne sichtbaren Fokus ${t.ohneSichtbarenFokus.length}`);
      if (t.nichtErreicht.length) console.log(`      nicht erreicht: ${t.nichtErreicht.slice(0, 12).join(' | ')}`);
      if (t.ohneSichtbarenFokus.length) console.log(`      ohne sichtbaren Fokus: ${t.ohneSichtbarenFokus.slice(0, 10).join(' | ')}`);
    }
    if (r.fehler.length) console.log('   Fehler:', r.fehler.join(' || '));
  }
} finally {
  await b.close();
  sichern('erheben4-tab.json', laeufe);
}
