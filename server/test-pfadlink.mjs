#!/usr/bin/env node
// Prüft die Kurzlink-Routen (pb_hooks/pfadlinks.pb.js) gegen einen laufenden Server mit FRISCHEM Datenordner:
//   ./server/pocketbase serve --dir /tmp/pb-kurz --migrationsDir server/pb_migrations --hooksDir server/pb_hooks --http 127.0.0.1:8093
//   node server/test-pfadlink.mjs http://127.0.0.1:8093
const BASIS = (process.argv[2] || 'http://127.0.0.1:8093') + '/api/statable/pfadlink';
let fehler = 0;
const pruefe = (ok, was) => { console.log(`${ok ? 'ok  ' : 'FEHL'} ${was}`); if (!ok) fehler++; };
const post = async (b) => { const r = await fetch(BASIS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const get = async (k) => { const r = await fetch(`${BASIS}/${k}`); return { s: r.status, j: await r.json().catch(() => ({})) }; };

const name = 'Prüfung 1: Faktoren- und Reliabilitätsanalyse';
const a = await post({ n: name, e: ['pruefschritt-inhalt', 'pruefschritt-faktorenanalyse'] });
pruefe(a.s === 200 && a.j.kurz === 'pruefung-1-faktoren-und-reliabilitaetsanalyse', 'Name wird zur lesbaren Adresse (Umlaute ausgeschrieben)');
const b = await post({ n: name, e: ['pruefschritt-inhalt', 'pruefschritt-faktorenanalyse'] });
pruefe(b.j.kurz === a.j.kurz, 'gleicher Inhalt, gleicher Link');
const c = await post({ n: name, e: ['pruefschritt-inhalt'] });
pruefe(c.j.kurz === a.j.kurz + '-2', 'gleicher Name, anderer Inhalt: Zähler -2');
const g = await get(a.j.kurz);
pruefe(g.s === 200 && g.j.n === name && g.j.e.length === 2 && g.j.p === 1, 'Lesen gibt Name, Einheiten und Abschlusstest zurück');
const ohne = await post({ n: 'Ohne Test', e: ['x'], p: 0 });
pruefe((await get(ohne.j.kurz)).j.p === 0, 'Abschlusstest abgewählt bleibt abgewählt');
pruefe((await post({ n: 'Ελληνικά', e: ['x'] })).j.kurz === 'lernpfad', 'Name ohne lateinische Buchstaben: „lernpfad“');
const lang = await post({ n: 'Ein sehr langer Name für einen Lernpfad, der über sechzig Zeichen hinausgeht', e: ['x'] });
pruefe(lang.j.kurz.length <= 60 && !lang.j.kurz.endsWith('-'), 'lange Namen gekürzt, an einem Bindestrich');
pruefe((await post({ n: '', e: ['x'] })).s === 400, 'ohne Namen: 400');
pruefe((await post({ n: 'x', e: ['A B', '<script>'] })).s === 400, 'ungültige Einheiten-Kennungen: 400');
pruefe((await get('gibt-es-nicht')).s === 404, 'unbekannter Link: 404');
pruefe((await get('..%2F_')).s === 404, 'ungültiger Kurzname: 404');
console.log(fehler ? `${fehler} Fehler` : 'alles grün');
process.exit(fehler ? 1 : 0);
