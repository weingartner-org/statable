/// <reference path="../pb_data/types.d.ts" />
// Härtung vor dem Livegang (Abnahme 3, S3 und S6):
//  1. Registrierung per E-Mail/Passwort ist AUS (users.createRule = null: nur Superuser legen Konten an).
//     Konten entstehen über die Uni-Anmeldung (OAuth2/OIDC legt das Konto beim ersten Anmelden an; diese Anmeldung braucht keine createRule).
//     Nur zum lokalen Testen: Umgebungsvariable STATABLE_REGISTRIERUNG=1 beim ERSTEN Start eines frischen Datenordners.
//  2. Eine Projektdatei höchstens 50 MB (Obergrenze je Datei; die Summe je Konto begrenzt pb_hooks/projekte_limit.pb.js).
//  3. Ratenbegrenzung (PocketBase-Einstellungen rateLimits) eingeschaltet.
//  4. Die frühere, nie benutzte Sammlungen projects / project_files (nie live, von keinem Code gelesen) werden entfernt, falls es sie in einem lokalen Datenordner noch gibt.
migrate((app) => {
  // 1. Registrierung
  const users = app.findCollectionByNameOrId("users");
  users.createRule = $os.getenv("STATABLE_REGISTRIERUNG") === "1" ? "" : null;
  app.save(users);

  // 2. Dateigröße
  const projekte = app.findCollectionByNameOrId("projekte");
  projekte.fields.getByName("inhalt").maxSize = 52428800;
  app.save(projekte);

  // 3. Ratenbegrenzung. Hinter Caddy muss zusätzlich "trustedProxy" gesetzt werden (siehe server/README.md), sonst zählt PocketBase nur die Adresse des Proxys.
  const s = app.settings();
  s.rateLimits.enabled = true;
  s.rateLimits.rules = [
    { label: "*:auth", audience: "", maxRequests: 10, duration: 60 },      // Anmeldeversuche
    { label: "*:create", audience: "", maxRequests: 30, duration: 10 },    // Anlegen
    { label: "/api/", audience: "", maxRequests: 300, duration: 10 },      // alles andere
  ];
  app.save(s);

  // 4. Altlast
  for (const name of ["project_files", "projects"]) {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* gab es nicht */ }
  }
}, (app) => {
  // Zurück: nur Registrierung, Ratenbegrenzung und Dateigröße wie vorher; die alten Sammlungen kommen nicht wieder.
  const users = app.findCollectionByNameOrId("users");
  users.createRule = "";
  app.save(users);
  const projekte = app.findCollectionByNameOrId("projekte");
  projekte.fields.getByName("inhalt").maxSize = 209715200;
  app.save(projekte);
  const s = app.settings(); s.rateLimits.enabled = false; app.save(s);
});
