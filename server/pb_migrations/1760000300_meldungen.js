/// <reference path="../pb_data/types.d.ts" />
// Sammlung "meldungen": Fehler und Wünsche aus dem Knopf „Melden“ in der App (Route POST /api/statable/melden, pb_hooks/melden.pb.js).
// Alle Regeln null: Nur die Verwaltung (Superuser) liest die Sammlung; die Route legt Datensätze selbst an.
// Das Bild ist eine geschützte Datei (nur PNG, höchstens 8 MB). Gespeichert wird: Text, Art, Seite (nur der erste Teil der Adresse), technische Angaben, optional Bild und Antwortadresse.
// Zusätzlich: eigene Ratenbegrenzung der Route (je Adresse höchstens 8 Meldungen in 10 Minuten), vor der weiten Regel "/api/".
migrate((app) => {
  const c = new Collection({
    type: "base",
    name: "meldungen",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "text", name: "art", required: true, max: 20 },
      { type: "text", name: "text", max: 6000 },
      { type: "text", name: "seite", max: 300 },
      { type: "text", name: "technik", max: 6000 },
      { type: "text", name: "antwort", max: 200 },
      { type: "file", name: "bild", maxSelect: 1, maxSize: 8388608, mimeTypes: ["image/png"], protected: true },
      { type: "text", name: "sprache", max: 8 },
      { type: "bool", name: "gemailt" },
      // Bearbeitung durch Claude und Johannes: stand = leer (neu) | behoben | rueckfrage | wunsch | kein-fehler | offen; notiz = was geschah; beantwortet = Antwort ist raus
      { type: "text", name: "stand", max: 20 },
      { type: "text", name: "notiz", max: 2000 },
      { type: "bool", name: "beantwortet" },
      { type: "autodate", name: "created", onCreate: true },
    ],
  });
  app.save(c);

  const s = app.settings();
  const regeln = (s.rateLimits.rules || []).filter((r) => r.label !== "/api/statable/melden");
  regeln.unshift({ label: "/api/statable/melden", audience: "", maxRequests: 8, duration: 600 });
  s.rateLimits.rules = regeln;
  s.rateLimits.enabled = true;
  // Keine IP-Adressen und keine Konto-Kennungen in den Protokollen des Servers (Datenschutz-Text: keine Zugriffsprotokolle); Protokolle nach 3 Tagen löschen.
  s.logs.logIP = false;
  s.logs.logAuthId = false;
  s.logs.maxDays = 3;
  app.save(s);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("meldungen"));
  const s = app.settings();
  s.rateLimits.rules = (s.rateLimits.rules || []).filter((r) => r.label !== "/api/statable/melden");
  app.save(s);
});
