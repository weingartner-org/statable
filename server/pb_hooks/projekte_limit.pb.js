/// <reference path="../pb_data/types.d.ts" />
// Speicherlimit je Konto: höchstens 100 Projekte und 300 MB Projektdateien zusammen (Werte in projekte_limit_lib.js).
// Die Größe wird aus der hochgeladenen Datei genommen, nicht aus dem Feld "groesse" des Browsers.
// Handler sehen Werte außerhalb ihrer selbst nicht, darum holt jeder die Prüfung per require.

onRecordCreateRequest((e) => {
  require(`${__hooks}/projekte_limit_lib.js`).pruefe(e, true);
  e.next();
}, "projekte");

onRecordUpdateRequest((e) => {
  require(`${__hooks}/projekte_limit_lib.js`).pruefe(e, false);
  e.next();
}, "projekte");
