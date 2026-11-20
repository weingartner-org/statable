/// <reference path="../pb_data/types.d.ts" />
// KURZLINKS FÜR GETEILTE LERNPFADE (Johannes 13.11.2026). Die App (lib/pfadlink.ts) fragt beim „Teilen“ nach einem Kurzlink;
// Caddy leitet statable.eu/l/<kurz> auf statable.eu/#lernen/l/<kurz> um, die App holt dort den Pfad.
//
//   POST /api/statable/pfadlink        { n: Name, e: [Einheiten], p?: 0 }  → 200 { kurz }  | 400 | 503
//   GET  /api/statable/pfadlink/{kurz}                                      → 200 { n, e, p } | 404
//
// Der Kurzname kommt aus dem Namen des Pfads (Umlaute ausgeschrieben, Kleinbuchstaben, Bindestriche). Gleicher Inhalt → gleicher Link.
// Gleicher Name, anderer Inhalt → Zähler dahinter (-2, -3 …). Ein Link wird nie geändert, auch nicht, wenn der Pfad später bearbeitet wird:
// dann entsteht ein neuer. Keine Personendaten, keine IP; Ratenbegrenzung in der Migration, Deckel je Tag und insgesamt.
// ⚠️ JSVM: Handler sehen nichts aus dem Datei-Kopf - alle Helfer stehen innerhalb.

routerAdd("POST", "/api/statable/pfadlink", (e) => {
  const MAX_NAME = 60, MAX_EINHEITEN = 300, MAX_JE_TAG = 5000, MAX_GESAMT = 500000;
  const KENNUNG = /^[a-z0-9][a-z0-9-]{0,79}$/;
  let b = {};
  try { b = e.requestInfo().body || {}; } catch (_) { b = {}; }
  const n = String(b.n || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  const roh = Array.isArray(b.e) ? b.e : [];
  const ein = [];
  for (let i = 0; i < roh.length && ein.length < MAX_EINHEITEN; i++) {
    const k = String(roh[i] || "");
    if (KENNUNG.test(k) && ein.indexOf(k) < 0) ein.push(k);
  }
  if (!n || !ein.length) return e.json(400, { error: "inhalt" });
  const p = (b.p === 0 || b.p === false) ? 0 : 1;
  const inhalt = JSON.stringify(p ? { n: n, e: ein } : { n: n, e: ein, p: 0 });
  const pruef = String($security.sha256(inhalt));

  try {
    const da = e.app.findFirstRecordByFilter("pfadlinks", "pruef = {:p}", { p: pruef });
    return e.json(200, { kurz: da.getString("kurz") });
  } catch (_) { /* neu */ }

  const tag = Math.floor((Date.now() + 3600000) / 86400000);
  try {
    if (e.app.countRecords("pfadlinks", $dbx.hashExp({ tag: tag })) >= MAX_JE_TAG) return e.json(503, { error: "voll" });
    if (e.app.countRecords("pfadlinks") >= MAX_GESAMT) return e.json(503, { error: "voll" });
  } catch (_) { /* weiter */ }

  // Name → Adresse: Umlaute ausschreiben, Akzente weg, alles andere zu Bindestrichen; höchstens 60 Zeichen, an einem Bindestrich gekürzt.
  const ERSATZ = { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "æ": "ae", "œ": "oe", "ø": "o", "å": "a", "ł": "l", "đ": "d", "ð": "d", "þ": "th", "ı": "i" };
  let s = n.toLowerCase();
  s = s.replace(/[äöüßæœøåłđðþı]/g, (z) => ERSATZ[z] || z);
  try { s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (_) { /* ohne normalize bleiben Akzentbuchstaben draußen */ }
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (s.length > 60) { s = s.slice(0, 60); const b2 = s.lastIndexOf("-"); if (b2 > 20) s = s.slice(0, b2); s = s.replace(/-+$/g, ""); }
  if (!s) s = "lernpfad";

  const sammlung = e.app.findCollectionByNameOrId("pfadlinks");
  for (let z = 1; z <= 500; z++) {
    const kurz = z === 1 ? s : s + "-" + z;
    let belegt = true;
    try { e.app.findFirstRecordByFilter("pfadlinks", "kurz = {:k}", { k: kurz }); } catch (_) { belegt = false; }
    if (belegt) continue;
    const r = new Record(sammlung);
    r.set("kurz", kurz); r.set("inhalt", inhalt); r.set("pruef", pruef); r.set("tag", tag);
    try { e.app.save(r); return e.json(200, { kurz: kurz }); } catch (err) {
      // Wettlauf: derselbe Inhalt kam gleichzeitig an → dessen Link; sonst war der Name eben vergeben → nächste Nummer.
      try { const da = e.app.findFirstRecordByFilter("pfadlinks", "pruef = {:p}", { p: pruef }); return e.json(200, { kurz: da.getString("kurz") }); } catch (_) { /* weiter */ }
    }
  }
  return e.json(503, { error: "voll" });
});

routerAdd("GET", "/api/statable/pfadlink/{kurz}", (e) => {
  const kurz = String(e.request.pathValue("kurz") || "").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(kurz)) return e.json(404, { error: "unbekannt" });
  try {
    const r = e.app.findFirstRecordByFilter("pfadlinks", "kurz = {:k}", { k: kurz });
    const o = JSON.parse(r.getString("inhalt"));
    return e.json(200, { n: o.n, e: o.e, p: o.p === 0 ? 0 : 1 });
  } catch (_) { return e.json(404, { error: "unbekannt" }); }
});
