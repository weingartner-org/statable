/// <reference path="../pb_data/types.d.ts" />
// „Melden“ aus der App: nimmt einen Fehler oder Wunsch (mit Bild vom Fenster, wenn die Person es will) entgegen,
// legt ihn ZUERST in der Sammlung "meldungen" ab und mailt ihn DANN an service@statable.eu. Fällt der Versand aus, bleibt die Meldung trotzdem da
// (für die Person ist sie angekommen). Lesen: Verwaltung → Sammlung "meldungen".
// Der Versand braucht SMTP-Einstellungen in der Verwaltung (Einstellungen → Mail): Absender service@statable.eu.
// ⚠️ Ein Handler sieht nichts aus dem Datei-Kopf; darum steht alles innerhalb von routerAdd.
// ⚠️ Alles, was die Person schreibt, ist fremder Text: in der Mail nur maskiert (HTML), in Kopfzeilen ohne Steuerzeichen.
routerAdd("POST", "/api/statable/melden", (e) => {
  const MAX_TEXT = 5000, MAX_TECHNIK = 4000, MAX_BILD = 8 * 1024 * 1024, STUNDE = 3600000, MAX_MAILS_JE_STUNDE = 60;
  const ADRESSE = "service@statable.eu";

  const sauber = (w, n) => String(w == null ? "" : w).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, n);
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let art = "", text = "", seite = "", technik = "", antwort = "";
  try {
    const body = e.requestInfo().body;
    const feld = (k) => { const v = body ? body[k] : ""; return Array.isArray(v) ? v[0] : v; };
    const artWert = String(feld("art") || "");
    art = artWert === "wunsch" ? "wunsch" : artWert === "barriere" ? "barriere" : "fehler";
    text = String(feld("text") || "").trim();
    seite = sauber(feld("seite"), 300);
    technik = String(feld("technik") || "").replace(/\u0000/g, "").slice(0, MAX_TECHNIK);
    antwort = sauber(feld("antwort"), 200);
    if (antwort && !/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/.test(antwort)) antwort = "";
  } catch (_) { text = ""; }
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT) + " …";

  let bild = null;
  try {
    const d = e.findUploadedFiles("bild");
    if (d && d.length > 0 && d[0]) bild = d[0];
  } catch (_) { bild = null; }
  if (bild && bild.size > MAX_BILD) return e.json(400, { error: "bild-zu-gross" });
  if (!text && !bild) return e.json(400, { error: "leer" });

  // Ventil gegen das Fluten des Postfachs: darüber wird weiter abgelegt, aber nicht mehr gemailt.
  let nichtMailen = $os.getenv("STATABLE_MELDEN_OHNE_MAIL") === "1";   // nur für Tests ohne Mailversand
  try {
    const bisher = e.app.findRecordsByFilter("meldungen", "created > {:seit}", "", 0, 0, { seit: new Date(Date.now() - STUNDE).toISOString().replace("T", " ") }).length;
    if (bisher >= MAX_MAILS_JE_STUNDE) nichtMailen = true;
  } catch (_) { /* weiter */ }

  // Ablegen. Passt das Bild nicht (kein echtes PNG), wird die Meldung ohne Bild abgelegt und gemailt.
  let abgelegt = false, recId = "";
  for (let versuch = 0; versuch < 2 && !abgelegt; versuch++) {
    try {
      const rec = new Record(e.app.findCollectionByNameOrId("meldungen"));
      rec.set("art", art); rec.set("text", text); rec.set("seite", seite); rec.set("technik", technik); rec.set("antwort", antwort);
      const sp = /Sprache: ([a-z]{2,3})\b/.exec(technik); rec.set("sprache", sp ? sp[1] : "");
      if (bild) rec.set("bild", bild);
      e.app.save(rec);
      abgelegt = true; recId = rec.id;
    } catch (err) {
      e.app.logger().warn("[melden] Ablegen fehlgeschlagen", "error", String(err));
      if (bild) bild = null; else break;
    }
  }

  let gemailt = false;
  if (!nichtMailen) {
    try {
      const zeilen = [];
      try { const t = JSON.parse(technik); for (const k in t) zeilen.push(esc(k) + ": " + esc(Array.isArray(t[k]) ? t[k].join(" | ") : t[k])); } catch (_) { if (technik) zeilen.push(esc(technik).replace(/\n/g, "<br>")); }
      const betreff = (art === "wunsch" ? "Statable: Ein Wunsch" : art === "barriere" ? "Statable: Barriere gefunden" : "Statable: Etwas funktioniert nicht") + (seite ? " (" + sauber(seite.split("/")[0], 40) + ")" : "");
      const anhaenge = {};
      if (bild) anhaenge["fenster.png"] = bild.reader.open();
      const m = new MailerMessage({
        from: { address: ADRESSE, name: "Statable" },
        to: [{ address: ADRESSE }],
        headers: antwort ? { "Reply-To": antwort } : {},
        subject: betreff,
        html: "<p><strong>" + (art === "wunsch" ? "Wunsch" : art === "barriere" ? "Barriere" : "Fehler") + "</strong> aus Statable</p>"
          + '<blockquote style="border-left:3px solid #ccc;margin:0;padding:0 0 0 12px;color:#333">' + (text ? esc(text).replace(/\n/g, "<br>") : "<em>(kein Text - nur das Bild im Anhang)</em>") + "</blockquote>"
          + (bild ? "<p>Bild vom Fenster im Anhang.</p>" : "")
          + '<p style="color:#666;font-size:12px">' + (antwort ? "Antwortadresse: " + esc(antwort) : "keine Antwortadresse angegeben") + (seite ? "<br>Seite: " + esc(seite) : "") + "</p>"
          + (zeilen.length ? '<p style="color:#666;font-size:11px;font-family:monospace">' + zeilen.join("<br>") + "</p>" : ""),
        attachments: anhaenge,
      });
      e.app.newMailClient().send(m);
      gemailt = true;
      if (abgelegt) { try { const r = e.app.findRecordById("meldungen", recId); r.set("gemailt", true); e.app.saveNoValidate(r); } catch (_) { /* Vermerk fehlt, Meldung ist da */ } }
    } catch (err) {
      e.app.logger().warn("[melden] Versand fehlgeschlagen", "error", String(err));
    }
  }

  // Teamraum: dieselbe Meldung zusätzlich in die Lernplattform legen (Sammlung tt_meldungen, Herkunft „Statable“), damit sie dort
  // wie die Meldungen der anderen Apps erscheint (Johannes 23.11.2026). Beide Server laufen auf demselben Rechner; die Route ist die
  // öffentliche Melde-Route der Lernplattform (nimmt Text, Bild und Technik). Fällt das aus, bleibt die Meldung hier und in der Mail.
  // ⚠️ Das Bild kommt aus dem gespeicherten Datensatz (Dateiname), nicht aus dem Upload - der ist hier nicht noch einmal lesbar.
  let imTeamraum = false;
  const teamUrl = $os.getenv("STATABLE_TEAM_URL") || (nichtMailen && $os.getenv("STATABLE_MELDEN_OHNE_MAIL") === "1" ? "" : "http://127.0.0.1:8090");
  if (abgelegt && teamUrl) {
    try {
      const rec = e.app.findRecordById("meldungen", recId);
      const form = new FormData();
      form.append("text", (art === "barriere" ? "[Barriere] " : "") + text);
      form.append("art", art === "wunsch" ? "wunsch" : "fehler");
      form.append("seite", seite);
      form.append("herkunft", "Statable");
      form.append("technik", technik);
      if (antwort) form.append("adresse", antwort);
      const datei = rec.getString("bild");
      if (datei) {
        const bytes = $os.readFile(e.app.dataDir() + "/storage/" + rec.baseFilesPath() + "/" + datei);
        form.append("bild", $filesystem.fileFromBytes(bytes, datei));
      }
      const r = $http.send({ url: teamUrl + "/api/sensorik/rueckmeldung", method: "POST", body: form, timeout: 20 });
      imTeamraum = r.statusCode >= 200 && r.statusCode < 300;
      if (!imTeamraum) e.app.logger().warn("[melden] Teamraum lehnt ab", "status", String(r.statusCode));
    } catch (err) {
      e.app.logger().warn("[melden] Teamraum nicht erreichbar", "error", String(err));
    }
  }

  if (!abgelegt && !gemailt) return e.json(500, { error: "nicht-angekommen" });
  return e.json(200, { ok: true });
});
