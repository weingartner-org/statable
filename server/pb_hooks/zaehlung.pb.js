/// <reference path="../pb_data/types.d.ts" />
// BESUCHERZÄHLUNG (Johannes 25.10.2026): „wieviele starten die Seite, wieviele laden Pakete nach, welche Sprachen werden geladen,
// wie oft starten die gleichen Leute, wie lange arbeiten sie damit“ - gewählt: Geräte-Merker wie auf der Lernplattform, mit Widerspruchs-Schalter.
//
//   POST /api/statable/zaehlen     anmeldefrei, von der App (app/src/lib/zaehlen.ts) und den Hilfeseiten (app/public/zaehlen-hilfe.js)
//        { k: "start" | "ende" | "ereignis" | "seite", g?, sp?, ge?, art?, her?, ms?, was?, wert? }   → 200 { ok } | 400
//   GET  /api/statable/statistik?tage=90   nur mit Kopfzeile X-Statable-Schluessel = $STATABLE_STATISTIK_SCHLUESSEL → die Zahlen (Seite statistik/)
//
// ── Zwei Kennungen, jede mit ihrer Frage (gleiche Begründung wie reichweite.pb.js der Lernplattform) ──
//   p  Prüfsumme aus IP + Browser + Monatssalz. Entsteht bei jedem Start. Beantwortet „wie viele verschiedene Menschen HEUTE“.
//      Über Wochen nicht: die IP wechselt nachts, im Uni-WLAN teilen sich viele eine. Die IP selbst wird NIE gespeichert.
//   g  Zufallsnummer, die der Browser würfelt und behält (Geräte-Merker). Fehlt, wenn die Zählung abgeschaltet ist.
//      Beantwortet „kommen sie wieder, wie oft, wie lange“ - über Monate.
// Wer die Zählung abschaltet, schickt GAR NICHTS mehr (anders als die Plattform, wo die Prüfsumme bleibt).
//
// ── Absicherung (Schreibweg ohne Anmeldung) ──
//   Sammlungen ohne Client-Regeln; strenge Nutzlast (feste Listen, Muster), Ratenbegrenzung in der Migration,
//   Deckel für neue Zeilen je Tag. Kein Text aus der Auswertung der Person geht je mit - nur feste Kennwörter.
//
// ⚠️ JSVM: Handler sehen nichts aus dem Datei-Kopf - alle Helfer stehen innerhalb.
// ⚠️ Tagesnummer: Tage seit 1970 in Wiener Winterzeit (UTC+1), damit ein Tag ungefähr um Mitternacht in Österreich beginnt.

routerAdd("POST", "/api/statable/zaehlen", (e) => {
  const MAX_MS = 7200000, MAX_NEUE_ZEILEN_JE_TAG = 3000, MAX_BESUCHER = 500000;
  const SPRACHEN = ["de", "en", "fr", "es", "it", "pt", "nl", "el", "hu", "sv", "pl", "uk", "ro", "cs", "bg"];
  const GERAETE = ["handy", "tablet", "rechner"];
  const ARTEN = ["browser", "app"];
  const EREIGNISSE = ["r", "rpaket", "verfahren", "offline", "datei", "beispiel", "export", "hilfe", "lernen", "lernfertig", "pfad"];
  const WORT = /^[a-z0-9][a-z0-9._-]{0,39}$/;
  const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

  let b = {};
  try { b = e.requestInfo().body || {}; } catch (_) { b = {}; }
  const k = String(b.k || "");
  if (["start", "ende", "ereignis", "seite"].indexOf(k) < 0) return e.json(400, { error: "art" });
  const gRoh = String(b.g || "");
  const g = /^[0-9a-f]{32}$/.test(gRoh) ? gRoh : "";
  const sp = SPRACHEN.indexOf(String(b.sp || "")) >= 0 ? String(b.sp) : "";
  const ge = GERAETE.indexOf(String(b.ge || "")) >= 0 ? String(b.ge) : "";
  const art = ARTEN.indexOf(String(b.art || "")) >= 0 ? String(b.art) : "";
  let her = String(b.her || "").toLowerCase().replace(/^www\./, "").slice(0, 80);
  if (her && (!HOST.test(her) || her === "statable.eu")) her = "";
  let ms = Math.round(Number(b.ms || 0));
  if (!(ms > 0)) ms = 0;
  if (ms > MAX_MS) ms = MAX_MS;
  const was = String(b.was || ""), wert = String(b.wert || "").toLowerCase();
  if (k === "ereignis" && (EREIGNISSE.indexOf(was) < 0 || (wert && !WORT.test(wert)))) return e.json(400, { error: "ereignis" });
  if (k === "ende" && !ms) return e.json(200, { ok: true });

  const jetzt = Date.now();
  const tag = Math.floor((jetzt + 3600000) / 86400000);

  // ── Tageszeile fortschreiben (legt sie bei Bedarf an; über dem Tagesdeckel keine neuen Zeilen) ──
  const tagZeile = (dim, w, f) => {
    const schluessel = tag + "|" + dim + "|" + w;
    let r = null;
    try { r = e.app.findFirstRecordByFilter("zaehl_tage", "schluessel = {:s}", { s: schluessel }); } catch (_) { r = null; }
    if (!r) {
      try { if (e.app.countRecords("zaehl_tage", $dbx.hashExp({ tag: tag })) >= MAX_NEUE_ZEILEN_JE_TAG) return; } catch (_) { /* weiter */ }
      r = new Record(e.app.findCollectionByNameOrId("zaehl_tage"));
      r.set("schluessel", schluessel); r.set("tag", tag); r.set("dim", dim); r.set("wert", w);
    }
    f(r);
    try { e.app.save(r); } catch (err) {
      // Wettlauf beim Anlegen (eindeutiger Index): die andere Zeile lesen und dort zählen.
      try { const r2 = e.app.findFirstRecordByFilter("zaehl_tage", "schluessel = {:s}", { s: schluessel }); f(r2); e.app.save(r2); } catch (_) { e.app.logger().warn("[zaehlen] Tageszeile", "error", String(err)); }
    }
  };
  const plus = (r, feld, n) => r.set(feld, Number(r.getInt(feld) || 0) + n);

  // ── Besucher-Zeile (p oder g) fortschreiben: gibt zurück, ob sie neu ist und ob sie heute zum ersten Mal kam ──
  const besucher = (kennung, a, start, dauer) => {
    let r = null;
    try { r = e.app.findFirstRecordByFilter("zaehl_besucher", "kennung = {:k}", { k: kennung }); } catch (_) { r = null; }
    const neu = !r;
    if (neu) {
      try { if (e.app.countRecords("zaehl_besucher") >= MAX_BESUCHER) return { neu: false, heuteNeu: false }; } catch (_) { /* weiter */ }
      r = new Record(e.app.findCollectionByNameOrId("zaehl_besucher"));
      r.set("kennung", kennung); r.set("art", a); r.set("ersterTag", tag); r.set("letzterTag", 0); r.set("tage", 0); r.set("starts", 0); r.set("dauerMs", 0);
    }
    const heuteNeu = Number(r.getInt("letzterTag") || 0) !== tag;
    if (heuteNeu) { plus(r, "tage", 1); r.set("letzterTag", tag); }
    if (start) plus(r, "starts", 1);
    if (dauer) plus(r, "dauerMs", dauer);
    try { e.app.save(r); } catch (err) { e.app.logger().warn("[zaehlen] Besucher", "error", String(err)); return { neu: false, heuteNeu: false }; }
    return { neu: neu, heuteNeu: heuteNeu };
  };

  // ── Prüfsumme (nur beim Start und auf Hilfeseiten; die IP endet hier) ──
  const pruefsumme = () => {
    const d = new Date(jetzt);
    const periode = d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2);
    let salz = "";
    try { salz = String(e.app.findFirstRecordByFilter("zaehl_salz", "periode = {:p}", { p: periode }).getString("wert") || ""); } catch (_) { salz = ""; }
    if (!salz) {
      try {
        const r = new Record(e.app.findCollectionByNameOrId("zaehl_salz"));
        salz = $security.randomString(48);
        r.set("periode", periode); r.set("wert", salz);
        e.app.save(r);
      } catch (_) {
        try { salz = String(e.app.findFirstRecordByFilter("zaehl_salz", "periode = {:p}", { p: periode }).getString("wert") || ""); } catch (_2) { salz = ""; }
      }
    }
    if (!salz) return "";
    let ip = "", ua = "";
    try { ip = String(e.realIP() || ""); } catch (_) { ip = ""; }
    try { ua = String(e.request.header.get("User-Agent") || "").slice(0, 120); } catch (_) { ua = ""; }
    return String($security.sha256(salz + "|" + ip + "|" + ua)).slice(0, 32);
  };

  if (k === "start") {
    const p = pruefsumme();
    const bp = p ? besucher("p:" + p, "p", true, 0) : { neu: false, heuteNeu: false };
    const bg = g ? besucher("g:" + g, "g", true, 0) : null;
    const neuP = bp.heuteNeu ? 1 : 0, neuG = bg && bg.heuteNeu ? 1 : 0;
    tagZeile("start", "", (r) => { plus(r, "n", 1); plus(r, "besucherP", neuP); plus(r, "besucherG", neuG); });
    const dims = [["sprache", sp], ["geraet", ge], ["art", art], ["herkunft", her]];
    for (let i = 0; i < dims.length; i++) {
      if (!dims[i][1]) continue;
      tagZeile(dims[i][0], dims[i][1], (r) => { plus(r, "n", 1); plus(r, "besucherP", neuP); plus(r, "besucherG", neuG); });
    }
    // Wiederkehr: je Gerät einmal am Tag - zum ersten Mal überhaupt, wiedergekommen, oder ohne Merker (Zählung abgeschaltet geht hier gar nicht ein)
    if (bg && bg.heuteNeu) tagZeile("wiederkehr", bg.neu ? "neu" : "wieder", (r) => plus(r, "n", 1));
    else if (!bg && neuP) tagZeile("wiederkehr", "ohne", (r) => plus(r, "n", 1));
  } else if (k === "ende") {
    if (g) besucher("g:" + g, "g", false, ms);
    tagZeile("start", "", (r) => plus(r, "dauerMs", ms));
    if (sp) tagZeile("sprache", sp, (r) => plus(r, "dauerMs", ms));
    if (ge) tagZeile("geraet", ge, (r) => plus(r, "dauerMs", ms));
  } else if (k === "ereignis") {
    tagZeile(was, wert, (r) => plus(r, "n", 1));
  } else {
    // Hilfeseite (feste Seite für Suchmaschinen): Sprache und Herkunft, keine Zeit
    const p = pruefsumme();
    const bp = p ? besucher("p:" + p, "p", false, 0) : { heuteNeu: false };
    tagZeile("hilfeseite", sp, (r) => { plus(r, "n", 1); plus(r, "besucherP", bp.heuteNeu ? 1 : 0); });
    if (her) tagZeile("hilfe-herkunft", her, (r) => plus(r, "n", 1));
  }
  return e.json(200, { ok: true });
});

routerAdd("GET", "/api/statable/statistik", (e) => {
  const soll = String($os.getenv("STATABLE_STATISTIK_SCHLUESSEL") || "");
  let ist = "";
  try { ist = String(e.request.header.get("X-Statable-Schluessel") || ""); } catch (_) { ist = ""; }
  if (soll.length < 32 || !$security.equal(ist, soll)) return e.json(403, { error: "schluessel" });

  let tage = 90;
  try { tage = parseInt(String(e.request.url.query().get("tage") || "90"), 10); } catch (_) { tage = 90; }
  if (!(tage >= 1)) tage = 90;
  if (tage > 800) tage = 800;
  const heute = Math.floor((Date.now() + 3600000) / 86400000);
  const von = heute - tage + 1;
  const db = e.app.db();
  const liste = (sql, felder, params) => {
    const m = {};
    for (let i = 0; i < felder.length; i++) m[felder[i][0]] = felder[i][1];
    const zeilen = arrayOf(new DynamicModel(m));
    db.newQuery(sql).bind(params || {}).all(zeilen);
    return zeilen.map((z) => { const o = {}; for (let i = 0; i < felder.length; i++) o[felder[i][0]] = z[felder[i][0]]; return o; });
  };

  const reihen = liste("SELECT tag, dim, wert, n, besucherP, besucherG, dauerMs FROM zaehl_tage WHERE tag >= {:von} ORDER BY tag",
    [["tag", 0], ["dim", ""], ["wert", ""], ["n", 0], ["besucherP", 0], ["besucherG", 0], ["dauerMs", 0]], { von: von });

  // Geräte (art g): wie oft kommen sie, wie lange - nur Geräte, die im Zeitraum da waren
  const geraete = liste("SELECT ersterTag, letzterTag, tage, starts, dauerMs FROM zaehl_besucher WHERE art = 'g' AND letzterTag >= {:von}",
    [["ersterTag", 0], ["letzterTag", 0], ["tage", 0], ["starts", 0], ["dauerMs", 0]], { von: von });

  return e.json(200, { heute: heute, von: von, reihen: reihen, geraete: geraete, erzeugt: new Date().toISOString() });
});

// Aufräumen jede Nacht: Salz älter als der Vormonat weg (die alten Prüfsummen sind dann endgültig anonym) und ihre Zeilen;
// Geräte, die 25 Monate nicht da waren; Tageszahlen älter als 25 Monate.
cronAdd("statable_zaehlung_aufraeumen", "17 3 * * *", () => {
  const heute = Math.floor((Date.now() + 3600000) / 86400000);
  const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1);
  const vormonat = d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2);
  const db = $app.db();
  try {
    db.newQuery("DELETE FROM zaehl_salz WHERE periode < {:p}").bind({ p: vormonat }).execute();
    db.newQuery("DELETE FROM zaehl_besucher WHERE art = 'p' AND letzterTag < {:t}").bind({ t: heute - 62 }).execute();
    db.newQuery("DELETE FROM zaehl_besucher WHERE art = 'g' AND letzterTag < {:t}").bind({ t: heute - 761 }).execute();
    db.newQuery("DELETE FROM zaehl_tage WHERE tag < {:t}").bind({ t: heute - 761 }).execute();
  } catch (err) { $app.logger().warn("[zaehlen] Aufräumen", "error", String(err)); }
});
