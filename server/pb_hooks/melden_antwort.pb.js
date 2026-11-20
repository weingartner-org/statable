/// <reference path="../pb_data/types.d.ts" />
// Antwort auf eine Meldung: nur für die Verwaltung (Superuser-Anmeldung nötig, die Route ist über Caddy NICHT öffentlich).
// Body (JSON): { id, betreff, text }. Geht an die Antwortadresse, die die Person selbst eingetragen hat; ohne Adresse gibt es keine Antwort.
// Der Aufruf kommt aus scripts/meldungen.mjs (antworte).
routerAdd("POST", "/api/statable/melden-antwort", (e) => {
  const sauber = (w, n) => String(w == null ? "" : w).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, n);
  const b = e.requestInfo().body || {};
  const id = sauber(b.id, 40), betreff = sauber(b.betreff, 200), text = String(b.text || "").replace(/\u0000/g, "").trim().slice(0, 8000);
  if (!id || !betreff || !text) return e.json(400, { error: "angaben" });
  let rec;
  try { rec = e.app.findRecordById("meldungen", id); } catch (_) { return e.json(404, { error: "unbekannt" }); }
  const an = String(rec.get("antwort") || "");
  if (!/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/.test(an)) return e.json(400, { error: "keine-adresse" });
  if ($os.getenv("STATABLE_MELDEN_OHNE_MAIL") === "1") return e.json(200, { ok: true, gesendet: false });
  e.app.newMailClient().send(new MailerMessage({
    from: { address: "service@statable.eu", name: "Statable" },
    to: [{ address: an }],
    headers: { "Reply-To": "service@statable.eu" },
    subject: betreff,
    text: text,
  }));
  rec.set("beantwortet", true);
  e.app.saveNoValidate(rec);
  return e.json(200, { ok: true, gesendet: true });
}, $apis.requireSuperuserAuth());
