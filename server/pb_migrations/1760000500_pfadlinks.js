/// <reference path="../pb_data/types.d.ts" />
// Kurzlinks für geteilte Lernpfade (Johannes 13.11.2026: „ganz automatisch für alle über den Server, Links, die zum Namen des Lernpfads passen“).
// Eine Zeile je geteiltem Pfad: kurz = Name als Adresse (statable.eu/l/<kurz>), inhalt = { n, e, p } als JSON, pruef = sha256(inhalt) für „gleicher Pfad, gleicher Link“.
// Keine Personendaten, keine IP. Regeln null: nur die Routen in pb_hooks/pfadlinks.pb.js lesen und schreiben.
migrate((app) => {
  app.save(new Collection({
    type: "base", name: "pfadlinks",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "text", name: "kurz", required: true, max: 80 },
      { type: "text", name: "inhalt", required: true, max: 30000 },
      { type: "text", name: "pruef", required: true, max: 64 },
      { type: "number", name: "tag", onlyInt: true },
      { type: "autodate", name: "created", onCreate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_pfadlinks_kurz ON pfadlinks (kurz)",
      "CREATE UNIQUE INDEX idx_pfadlinks_pruef ON pfadlinks (pruef)",
      "CREATE INDEX idx_pfadlinks_tag ON pfadlinks (tag)",
    ],
  }));
  const s = app.settings();
  const regeln = (s.rateLimits.rules || []).filter((r) => r.label !== "POST /api/statable/pfadlink");
  regeln.unshift({ label: "POST /api/statable/pfadlink", audience: "", maxRequests: 30, duration: 600 });
  s.rateLimits.rules = regeln;
  s.rateLimits.enabled = true;
  app.save(s);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("pfadlinks"));
  const s = app.settings();
  s.rateLimits.rules = (s.rateLimits.rules || []).filter((r) => r.label !== "POST /api/statable/pfadlink");
  app.save(s);
});
