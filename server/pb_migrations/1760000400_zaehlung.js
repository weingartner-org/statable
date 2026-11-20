/// <reference path="../pb_data/types.d.ts" />
// Besucherzählung (Johannes 25.10.2026, Variante „wie die Lernplattform“: Geräte-Merker mit Widerspruchs-Schalter).
// Drei Sammlungen, alle Regeln null: Nur die Route POST /api/statable/zaehlen schreibt, nur GET /api/statable/statistik (mit Schlüssel) liest
// (pb_hooks/zaehlung.pb.js). Die IP wird nirgends gespeichert; die Prüfsumme entsteht aus IP + Browser + Monatssalz.
//   zaehl_salz      ein geheimer Zufallswert je Monat (nach 3 Monaten gelöscht - dann sind die Prüfsummen nicht mehr zurückzurechnen)
//   zaehl_besucher  eine Zeile je Prüfsumme (art p) bzw. je Geräte-Merker (art g): erster/letzter Tag, Zahl der Tage, Starts, aktive Zeit
//   zaehl_tage      Tageszähler: schluessel = "<tag>|<dim>|<wert>", z. B. "20386|sprache|de" - n Ereignisse, Besucher (Prüfsummen/Merker neu an dem Tag), Zeit
migrate((app) => {
  const regelnNull = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };
  app.save(new Collection({
    type: "base", name: "zaehl_salz", ...regelnNull,
    fields: [
      { type: "text", name: "periode", required: true, max: 7 },
      { type: "text", name: "wert", required: true, max: 80 },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_zaehl_salz_periode ON zaehl_salz (periode)"],
  }));
  app.save(new Collection({
    type: "base", name: "zaehl_besucher", ...regelnNull,
    fields: [
      { type: "text", name: "kennung", required: true, max: 40 },
      { type: "text", name: "art", required: true, max: 1 },
      { type: "number", name: "ersterTag", onlyInt: true },
      { type: "number", name: "letzterTag", onlyInt: true },
      { type: "number", name: "tage", onlyInt: true },
      { type: "number", name: "starts", onlyInt: true },
      { type: "number", name: "dauerMs", onlyInt: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_zaehl_besucher_kennung ON zaehl_besucher (kennung)",
      "CREATE INDEX idx_zaehl_besucher_art_letzter ON zaehl_besucher (art, letzterTag)",
    ],
  }));
  app.save(new Collection({
    type: "base", name: "zaehl_tage", ...regelnNull,
    fields: [
      { type: "text", name: "schluessel", required: true, max: 120 },
      { type: "number", name: "tag", onlyInt: true },
      { type: "text", name: "dim", required: true, max: 20 },
      { type: "text", name: "wert", max: 80 },
      { type: "number", name: "n", onlyInt: true },
      { type: "number", name: "besucherP", onlyInt: true },
      { type: "number", name: "besucherG", onlyInt: true },
      { type: "number", name: "dauerMs", onlyInt: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_zaehl_tage_schluessel ON zaehl_tage (schluessel)",
      "CREATE INDEX idx_zaehl_tage_tag ON zaehl_tage (tag)",
    ],
  }));

  // Ratenbegrenzung je Adresse: ein Start, ein paar Teilzeiten, Ereignisse - 120 in 10 Minuten reichen für fleißiges Arbeiten.
  // Die Auswertung: 20 Abrufe in 10 Minuten (bremst das Raten des Schlüssels).
  const s = app.settings();
  const regeln = (s.rateLimits.rules || []).filter((r) => r.label !== "/api/statable/zaehlen" && r.label !== "/api/statable/statistik");
  regeln.unshift({ label: "/api/statable/zaehlen", audience: "", maxRequests: 120, duration: 600 });
  regeln.unshift({ label: "/api/statable/statistik", audience: "", maxRequests: 20, duration: 600 });
  s.rateLimits.rules = regeln;
  s.rateLimits.enabled = true;
  // Hinter Caddy: die Adresse der Person steht in X-Forwarded-For (Caddy setzt sie selbst und überschreibt, was der Browser schickt).
  // Ohne diese Einstellung sähe der Server nur 127.0.0.1 - alle Menschen fielen in der Prüfsumme zu wenigen zusammen.
  s.trustedProxy.headers = ["X-Forwarded-For"];
  s.trustedProxy.useLeftmostIP = false;
  app.save(s);
}, (app) => {
  for (const n of ["zaehl_tage", "zaehl_besucher", "zaehl_salz"]) {
    try { app.delete(app.findCollectionByNameOrId(n)); } catch (_) { /* fehlt schon */ }
  }
  const s = app.settings();
  s.rateLimits.rules = (s.rateLimits.rules || []).filter((r) => r.label !== "/api/statable/zaehlen" && r.label !== "/api/statable/statistik");
  app.save(s);
});
