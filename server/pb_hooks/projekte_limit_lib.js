// Gemeinsamer Teil für projekte_limit.pb.js (PocketBase-Handler sehen Werte außerhalb ihrer selbst nicht, darum wird er per require geholt).
module.exports = {
  pruefe(e, neu) {
  // Voreinstellung 100 Projekte / 300 MB; die Umgebungsvariablen gibt es nur für die Regeltests.
  const MAX_ANZAHL = Number($os.getenv("STATABLE_MAX_PROJEKTE")) || 100;
  const MAX_MB = Number($os.getenv("STATABLE_MAX_MB")) || 300, MAX_BYTES = MAX_MB * 1024 * 1024;
  const owner = e.record.get("owner");
  const id = e.record.id;
  const datei = e.record.get("inhalt");
  // Beim Ändern ohne neue Datei bleibt die alte Größe
  let groesse = 0;
  if (datei && typeof datei === "object" && datei.size !== undefined) {
    groesse = Number(datei.size);
    e.record.set("groesse", groesse);
  } else {
    groesse = Number(e.record.get("groesse")) || 0;
  }
  const r = new DynamicModel({ n: 0, g: 0 });
  $app.db()
    .newQuery("SELECT COUNT(*) AS n, COALESCE(SUM(groesse), 0) AS g FROM projekte WHERE owner = {:o} AND id != {:i}")
    .bind({ o: owner, i: id })
    .one(r);
  if (neu && r.n + 1 > MAX_ANZAHL) throw new BadRequestError("Zu viele Projekte im Konto (höchstens " + MAX_ANZAHL + ").");
  if (r.g + groesse > MAX_BYTES) throw new BadRequestError("Der Speicher des Kontos ist voll (höchstens " + MAX_MB + " MB).");
  }
};
