// Prüft die Meldestelle (POST /api/statable/melden) gegen einen laufenden PocketBase:
//   STATABLE_MELDEN_OHNE_MAIL=1 ./server/pocketbase serve --dir /pfad/zum/testordner --migrationsDir server/pb_migrations --hooksDir server/pb_hooks --http 127.0.0.1:8093
//   node server/test-melden.mjs http://127.0.0.1:8093
// (ohne STATABLE_MELDEN_OHNE_MAIL würde der Test echte Mails an service@statable.eu auslösen)
const basis = process.argv[2] ?? 'http://127.0.0.1:8091';
let fehler = 0;
const prüfe = (name, ok, info = '') => { console.log(`${ok ? 'ok  ' : 'FEHLER'} ${name}${info ? ' - ' + info : ''}`); if (!ok) fehler++; };
const post = async (f) => { const r = await fetch(`${basis}/api/statable/melden`, { method: 'POST', body: f }); return { status: r.status, text: await r.text() }; };
const form = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

let r = await post(form({ art: 'fehler', text: 'Probe', seite: 'daten' }));
prüfe('Meldung mit Text kommt an', r.status === 200, `${r.status}`);
r = await post(form({ art: 'fehler' }));
prüfe('leere Meldung wird abgewiesen', r.status === 400 && r.text.includes('leer'), `${r.status}`);
r = await post(form({ art: 'wunsch', text: 'x'.repeat(20000) }));
prüfe('sehr langer Text wird gekürzt, nicht abgelehnt', r.status === 200, `${r.status}`);
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64'));
r = await post(form({ art: 'fehler', text: 'mit Bild', bild: new File([png], 'fenster.png', { type: 'image/png' }) }));
prüfe('Meldung mit PNG-Bild kommt an', r.status === 200, `${r.status}`);
r = await post(form({ art: 'fehler', text: 'falsches Bild', bild: new File([new TextEncoder().encode('kein Bild')], 'fenster.png', { type: 'image/png' }) }));
prüfe('Datei, die kein PNG ist, verhindert die Meldung nicht', r.status === 200, `${r.status}`);
const lesen = await fetch(`${basis}/api/collections/meldungen/records`);
prüfe('die Sammlung ist ohne Anmeldung nicht lesbar', lesen.status === 403 || lesen.status === 404, `${lesen.status}`);
const g = await fetch(`${basis}/api/collections/meldungen/records`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"art":"fehler","text":"direkt"}' });
prüfe('die Sammlung lässt sich nicht direkt beschreiben', g.status === 403 || g.status === 404 || g.status === 400, `${g.status}`);
console.log(fehler ? `${fehler} Fehler` : 'alles ok');
process.exit(fehler ? 1 : 0);
