/// <reference path="../pb_data/types.d.ts" />
// Sammlung "projekte" für den Abgleich der Browser-Projekte mit dem Konto.
// Ein Datensatz = ein Projekt; der Inhalt liegt als geschützte Datei (.statable, JSON) daneben.
// Regeln: Nur die Eigentümerin / der Eigentümer sieht, ändert, löscht. Anlegen nur im eigenen Namen.
// Wichtig: PocketBase gibt die Antwort auf ein Schreiben auch ohne viewRule zurück. Darum darf niemand
// einen fremden Datensatz anlegen (createRule prüft owner) oder ändern (updateRule prüft owner, owner und cid bleiben fest).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const c = new Collection({
    type: "base",
    name: "projekte",
    listRule: "owner = @request.auth.id",
    viewRule: "owner = @request.auth.id",
    createRule: "@request.auth.id != '' && @request.body.owner = @request.auth.id",
    updateRule: "owner = @request.auth.id && @request.body.owner:isset = false && @request.body.cid:isset = false",
    deleteRule: "owner = @request.auth.id",
    fields: [
      { type: "relation", name: "owner", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
      // cid = die Projekt-id aus dem Browser (UUID); je Konto einmalig
      { type: "text", name: "cid", required: true, min: 6, max: 64, pattern: "^[A-Za-z0-9-]+$" },
      { type: "text", name: "name", required: true, min: 1, max: 200 },
      // zeit = "zuletzt geändert" laut Browser (Millisekunden); Grundlage für den Konflikt-Vergleich
      { type: "number", name: "zeit", required: true, min: 0 },
      { type: "number", name: "groesse", min: 0 },
      { type: "number", name: "spalten", min: 0 },
      { type: "number", name: "faelle", min: 0 },
      { type: "number", name: "blaetter", min: 0 },
      { type: "file", name: "inhalt", required: true, maxSelect: 1, maxSize: 209715200, protected: true },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_projekte_owner_cid ON projekte (owner, cid)",
    ],
  });
  app.save(c);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("projekte"));
});
