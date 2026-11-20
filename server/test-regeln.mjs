// Zugriffsregeln prüfen: Person B darf nichts von Person A sehen oder ändern.
// Aufruf: node server/test-regeln.mjs [http://127.0.0.1:8091] [--zu]   (PocketBase muss laufen)
//   ohne --zu: Regeln der Sammlung "projekte", Speicherlimit, Ratenbegrenzung. Braucht einen FRISCHEN Datenordner, in dem die Registrierung
//              für den Test offen ist und die Limits klein sind:
//              STATABLE_REGISTRIERUNG=1 STATABLE_MAX_PROJEKTE=3 STATABLE_MAX_MB=1 ./server/pocketbase serve --dir /tmp/pb-test --http 127.0.0.1:8092
//   --zu:      prüft nur, dass sich ohne Umgebungsvariable niemand selbst ein Konto anlegen kann (frischer Datenordner OHNE STATABLE_REGISTRIERUNG)
const BASE = process.argv.find((a, i) => i > 1 && a.startsWith('http')) ?? 'http://127.0.0.1:8091';
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'ok  ' : 'FEHLER'}  ${name}${extra ? ' - ' + extra : ''}`); if (!ok) failed++; };

async function api(path, { method = 'GET', token, json, form } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(token ? { Authorization: token } : {}), ...(json ? { 'Content-Type': 'application/json' } : {}) },
    body: json ? JSON.stringify(json) : form,
  });
  let body = null; try { body = await res.json(); } catch { /* keine JSON-Antwort */ }
  return { status: res.status, body };
}
if (process.argv.includes('--zu')) {
  const r = await api('/api/collections/users/records', { method: 'POST', json: { email: `zu-${Date.now()}@test.invalid`, password: 'Pw-12345678', passwordConfirm: 'Pw-12345678' } });
  check('Selbst-Registrierung ist aus', r.status === 403 || r.status === 400, `HTTP ${r.status}`);
  process.exit(failed ? 1 : 0);
}
async function makeUser(tag) {
  const email = `${tag}-${Date.now()}@test.invalid`, password = `Pw-${crypto.randomUUID()}`;
  const c = await api('/api/collections/users/records', { method: 'POST', json: { email, password, passwordConfirm: password, name: tag } });
  const a = await api('/api/collections/users/auth-with-password', { method: 'POST', json: { identity: email, password } });
  return { id: a.body.record.id, token: a.body.token, createStatus: c.status };
}

const A = await makeUser('a'), B = await makeUser('b');
check('zwei Testkonten angelegt', A.token && B.token, A.token ? '' : 'Registrierung zu? Frischer Ordner mit STATABLE_REGISTRIERUNG=1 starten (siehe Kopf der Datei)');
if (!(A.token && B.token)) process.exit(1);

const tokA = await api('/api/files/token', { method: 'POST', token: A.token });
const tokB = await api('/api/files/token', { method: 'POST', token: B.token });

// ---- Sammlung "projekte" (Abgleich mit dem Konto) ----
const mkP = (cid, extra = {}) => { const f = new FormData(); f.set('owner', extra.owner ?? A.id); f.set('cid', cid); f.set('name', 'Projekt'); f.set('zeit', '1000'); f.set('inhalt', new Blob(['{"geheim":1}'], { type: 'application/json' }), 'projekt.statable'); return f; };
const cid = 'test-' + crypto.randomUUID();
const q = await api('/api/collections/projekte/records', { method: 'POST', token: A.token, form: mkP(cid) });
check('A legt eigenes Konto-Projekt an', q.status === 200, `HTTP ${q.status}`);
const qid = q.body?.id;
check('B kann kein Konto-Projekt im Namen von A anlegen', (await api('/api/collections/projekte/records', { method: 'POST', token: B.token, form: mkP('test-' + crypto.randomUUID()) })).status === 400);
check('ohne Anmeldung kein Konto-Projekt anlegen', (await api('/api/collections/projekte/records', { method: 'POST', form: mkP('test-' + crypto.randomUUID()) })).status === 400);
check('dieselbe cid im selben Konto nicht doppelt', (await api('/api/collections/projekte/records', { method: 'POST', token: A.token, form: mkP(cid) })).status === 400);
check('B sieht kein Konto-Projekt von A (Liste leer)', (await api('/api/collections/projekte/records', { token: B.token })).body?.items?.length === 0);
check('B kann es nicht ansehen', (await api(`/api/collections/projekte/records/${qid}`, { token: B.token })).status === 404);
const bf = new FormData(); bf.set('name', 'gehackt');
check('B kann es nicht ändern', (await api(`/api/collections/projekte/records/${qid}`, { method: 'PATCH', token: B.token, form: bf })).status === 404);
check('B kann es nicht löschen', (await api(`/api/collections/projekte/records/${qid}`, { method: 'DELETE', token: B.token })).status === 404);
check('ohne Anmeldung ist die Liste leer', (await api('/api/collections/projekte/records')).body?.items?.length === 0);
const w1 = await api(`/api/collections/projekte/records/${qid}`, { method: 'PATCH', token: A.token, json: { owner: B.id } });
check('A kann den Besitzer nicht umschreiben', w1.status !== 200 && (await api(`/api/collections/projekte/records/${qid}`, { token: A.token })).body?.owner === A.id, `HTTP ${w1.status}`);
const w2 = await api(`/api/collections/projekte/records/${qid}`, { method: 'PATCH', token: A.token, json: { cid: 'andere-id-123' } });
check('A kann die cid nicht ändern', w2.status !== 200, `HTTP ${w2.status}`);
const w3 = await api(`/api/collections/projekte/records/${qid}`, { method: 'PATCH', token: A.token, json: { name: 'neu', zeit: 2000 } });
check('A kann Name und Zeit ändern', w3.status === 200 && w3.body?.zeit === 2000, `HTTP ${w3.status}`);
const qd = await fetch(`${BASE}/api/files/projekte/${qid}/${q.body?.inhalt}`);
check('Inhalt ohne Token nicht abrufbar', qd.status !== 200, `HTTP ${qd.status}`);
const qa = await fetch(`${BASE}/api/files/projekte/${qid}/${q.body?.inhalt}?token=${tokA.body.token}`);
check('A kann den Inhalt mit Token abrufen', qa.status === 200 && (await qa.text()).includes('geheim'));
const qb = await fetch(`${BASE}/api/files/projekte/${qid}/${q.body?.inhalt}?token=${tokB.body.token}`);
check('B kann den Inhalt auch mit eigenem Token nicht abrufen', qb.status !== 200, `HTTP ${qb.status}`);
// ---- Speicherlimit (Testwerte: 3 Projekte, 1 MB) ----
const MAXP = Number(process.env.STATABLE_MAX_PROJEKTE ?? 100), MAXMB = Number(process.env.STATABLE_MAX_MB ?? 300);
if (MAXP <= 5 && MAXMB <= 5) {
  const mkG = (cid, bytes) => { const f = mkP(cid); f.set('inhalt', new Blob(['x'.repeat(bytes)], { type: 'application/json' }), 'projekt.statable'); f.set('groesse', '1'); return f; };
  const gross = await api('/api/collections/projekte/records', { method: 'POST', token: A.token, form: mkG('gross-' + crypto.randomUUID(), MAXMB * 1024 * 1024 + 10) });
  check('A kann kein Projekt über dem Speicherlimit anlegen (Größe aus der Datei, nicht aus dem Feld groesse)', gross.status === 400, `HTTP ${gross.status}`);
  let ok = 1;   // ein Projekt (qid) gibt es schon
  for (let i = 0; i < MAXP - 1; i++) { const r = await api('/api/collections/projekte/records', { method: 'POST', token: A.token, form: mkP('anz-' + i + '-' + crypto.randomUUID()) }); if (r.status === 200) ok++; }
  check(`A kommt bis ${MAXP} Projekte`, ok === MAXP, `${ok}`);
  const ueber = await api('/api/collections/projekte/records', { method: 'POST', token: A.token, form: mkP('anz-ueber-' + crypto.randomUUID()) });
  check(`das ${MAXP + 1}. Projekt wird abgewiesen`, ueber.status === 400, `HTTP ${ueber.status}`);
  const bz = await api('/api/collections/projekte/records', { method: 'POST', token: B.token, form: (() => { const f = mkP('b-' + crypto.randomUUID(), { owner: B.id }); return f; })() });
  check('das Limit gilt je Konto (B kann weiter anlegen)', bz.status === 200, `HTTP ${bz.status}`);
} else console.log('übersprungen  Speicherlimit (Testwerte nicht gesetzt: STATABLE_MAX_PROJEKTE<=5, STATABLE_MAX_MB<=5)');

check('B kann das Konto von A nicht löschen', (await api(`/api/collections/users/records/${A.id}`, { method: 'DELETE', token: B.token })).status !== 204);
// Konto löschen löscht die Projekte mit (cascade)
await api(`/api/collections/users/records/${B.id}`, { method: 'DELETE', token: B.token });
const del = await api(`/api/collections/users/records/${A.id}`, { method: 'DELETE', token: A.token });
check('A kann das eigene Konto löschen (Projekte hängen per cascade daran)', del.status === 204, `HTTP ${del.status}`);

// ---- Ratenbegrenzung: viele falsche Anmeldungen hintereinander werden gebremst (429) ----
let gebremst = 0; for (let i = 0; i < 25; i++) { const r = await api('/api/collections/users/auth-with-password', { method: 'POST', json: { identity: 'nobody@test.invalid', password: 'falsch-falsch' } }); if (r.status === 429) gebremst++; }
check('viele falsche Anmeldungen werden mit 429 gebremst', gebremst > 0, `${gebremst} von 25`);

// Aufräumen (A ist schon gelöscht - die alten Projekte hängen am Konto und sind mit weg)
console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen` : '\nalle Prüfungen bestanden');
process.exit(failed ? 1 : 0);
