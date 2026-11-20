# Server (eigener PocketBase, nichts mit der Lernplattform gemeinsam)

Eigene Datenbank, eigene Konten, eigene Verwaltung. Port **8091** (nur lokal). Daten in `server/pb_data/` (nicht im Git).

```bash
./server/pocketbase serve --http 127.0.0.1:8091      # starten
node server/test-regeln.mjs                          # Zugriffsregeln prüfen (siehe „Regeltests“ unten)
```

- Verwaltung: http://127.0.0.1:8091/_/ - Zugang für die Entwicklung steht in `server/.dev-zugang` (nicht im Git).
- Datenmodell: `server/pb_migrations/1760000100_projekte_konto.js` (`projekte`) und `1760000200_konto_haerten.js` (siehe unten). Die frühere, nie benutzte Migration für `projects`/`project_files` gibt es nicht mehr.
- Das Binary ist nicht im Git. Neu bauen (Go nötig, geprüfter Download von go.dev):
  `GOBIN=$PWD/server go install github.com/pocketbase/pocketbase/examples/base@latest` und die Datei `base` in `pocketbase` umbenennen.
  (Stand 07.10.2026: GitHub-Downloads waren aus der Sandbox gesperrt, der Go-Modulserver nicht.)

## Melden aus der App (fertig, Server noch nicht eingerichtet)

Route `POST /api/statable/melden` (`pb_hooks/melden.pb.js`) und Sammlung `meldungen` (`pb_migrations/1760000300_meldungen.js`): legt die Meldung ab und mailt sie an service@statable.eu (SMTP in der Verwaltung eintragen). Test: `STATABLE_MELDEN_OHNE_MAIL=1 ./server/pocketbase serve --dir <Testordner> --migrationsDir server/pb_migrations --hooksDir server/pb_hooks --http 127.0.0.1:8091`, dann `node server/test-melden.mjs`; die Entwicklungsseite (`vite`) leitet `/api/statable` an Port 8091 um (`VITE_MELDEN_PORT` ändert ihn). Einrichten auf dem Rechner: `docs/MELDEN-SERVER-EINRICHTEN-2026-10-23.md`.

## Konto in der App (vorbereitet, nicht live)

- Sammlung `projekte` (Migration `1760000100_projekte_konto.js`): ein Datensatz je Projekt, Inhalt als geschützte Datei; list/view/update/delete nur Eigentümer, anlegen nur im eigenen Namen, `owner` und `cid` nach dem Anlegen fest. `node server/test-regeln.mjs` prüft das.
- Härtung (`1760000200_konto_haerten.js`): **Selbst-Registrierung aus** (`users.createRule = null`), Projektdatei höchstens 50 MB, Ratenbegrenzung an (`*:auth` 10 je Minute, `*:create` 30 je 10 s, `/api/` 300 je 10 s). Speicherlimit je Konto im Hook `server/pb_hooks/projekte_limit.pb.js`: 100 Projekte und 300 MB zusammen (Größe aus der hochgeladenen Datei).
- Lokal ausprobieren: PocketBase starten (oben), ein Testkonto in der Verwaltung anlegen (Registrierung ist aus), dann `cd app && VITE_KONTO=1 npx vite --port 5193`; Einstellungen → Konto. Ohne `VITE_KONTO` ist der Konto-Code gar nicht im Bau.
- Genaueres: `docs/KONTO-VORBEREITUNG-2026-10-08.md`.

### Regeltests (frischer Datenordner, Port 8092 wenn 8091 belegt)

```bash
# Registrierung nur für den Test offen, kleine Limits (gilt nur beim ERSTEN Start eines frischen Ordners, weil es eine Migration ist)
STATABLE_REGISTRIERUNG=1 STATABLE_MAX_PROJEKTE=3 STATABLE_MAX_MB=1 ./server/pocketbase serve --dir /tmp/pb-test --http 127.0.0.1:8092
STATABLE_MAX_PROJEKTE=3 STATABLE_MAX_MB=1 node server/test-regeln.mjs http://127.0.0.1:8092
# danach beenden, frischen Ordner OHNE Variable starten und prüfen, dass die Registrierung zu ist:
node server/test-regeln.mjs http://127.0.0.1:8092 --zu
```
`--dir` zeigt auf einen Ordner ohne eigene Migrationen; mit `--migrationsDir server/pb_migrations --hooksDir server/pb_hooks` die Dateien aus dem Repository nehmen. Der Test der Ratenbegrenzung löst absichtlich viele falsche Anmeldungen aus (kurz danach sind Anmeldungen von dieser Adresse gebremst).

### Später: Uni-Anmeldung eintragen und live schalten (nur Beschreibung - nichts davon wurde ausgeführt)

1. **Uni-Anmeldung eintragen.** Verwaltung → Sammlung `users` → Zahnrad → Optionen → OAuth2 → Anbieter „OpenID Connect“ (oder „OpenID Connect (2)“) → Eintragen: Anzeigename (z. B. „Uni-Login“), Client-ID, Client-Secret, Auth-URL, Token-URL, User-API-URL (alle aus der „.well-known/openid-configuration“ des Issuers), PKCE an. Die Uni muss als Rückleitungs-Adresse `https://<Server>/programme/statable/api/api/oauth2-redirect` freigeben. Danach erscheint in der App der Knopf „Anmelden mit …“ von selbst. Shibboleth/SAML: eine OIDC-Brücke davorsetzen (z. B. Keycloak) und die Brücke als OIDC-Anbieter eintragen.
2. **Registrierung ist schon zu** (Migration). Passwort-Anmeldung in `users` → Optionen ausschalten, wenn nur die Uni-Anmeldung gelten soll. SMTP eintragen. Ratenbegrenzung hinter Caddy: Einstellungen → „Trusted proxy headers“ auf `X-Forwarded-For` setzen, sonst zählt PocketBase alle Anfragen unter der Adresse des Proxys.
3. **Caddy** (Beispiel, unter dem Statable-Pfad; PocketBase lauscht nur lokal auf 8091):
   ```
   handle_path /programme/statable/api/* {
       reverse_proxy 127.0.0.1:8091
   }
   ```
   `handle_path` schneidet das Präfix ab; die App spricht `…/api/api/collections/…` an, PocketBase sieht `/api/collections/…`. Dienst per systemd (`pocketbase serve --http 127.0.0.1:8091`), `pb_data` täglich sichern.
4. **App bauen:** `VITE_KONTO=1 VITE_PB_URL=/programme/statable/api npm run build` (Adresse relativ, dann gleiche Herkunft, kein CORS). Der Service Worker lässt Pfade mit `/api/` aus dem Cache heraus.
5. **Vor dem Einschalten:** Datenschutz-Text einsetzen, Regeltests gegen den Server laufen lassen (`node server/test-regeln.mjs https://…` auf einer Kopie), Hilfe-Artikel schreiben.

## Noch offen (vor dem Einsatz an der Uni)

- (erledigt) Registrierung per E-Mail/Passwort ist aus; Konten nur über Uni-Anmeldung.
- E-Mail-Versand (SMTP), Bestätigung der Adresse, Passwort-Zurücksetzen.
- Sicherung (`pb_data` täglich), Verschlüsselung der Platte, Löschen/Export für DSGVO.
- (Speicherlimit je Person ist gebaut.) Rollen `lecturer`/`admin`, Lehrveranstaltungen, Teilen (siehe `docs/BAUPLAN.md`).
- Anmeldung der Uni (OIDC/SAML-Brücke) - wartet auf Johannes' Antwort.
