# Statable - Statistik im Browser, barrierefrei

Statable ist eine Web-Oberfläche für die Statistik-Engine
[GNU PSPP](https://www.gnu.org/software/pspp/). Die Engine läuft als
WebAssembly direkt im Browser - die Daten verlassen das Gerät nicht.
Bedienbar mit Tastatur, Screenreader und Braillezeile.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `app/` | Oberfläche (Svelte 5, Vite, TypeScript) |
| `wasm/` | Bau der PSPP-Engine als WebAssembly |
| `patches/` | Änderungen an PSPP 2.1.3 (klein, siehe `patches/README.md`) |
| `server/` | optionaler PocketBase-Server für Konten und gespeicherte Projekte |
| `offline/` | Startskripte für den Betrieb ohne Internet |

## Ausprobieren

```bash
cd app
npm ci
npm run dev
```

Die fertige Engine liegt in `app/public/wasm/`. Neu bauen: `wasm/build-wasm.sh`
(braucht Emscripten und den Quellcode von PSPP 2.1.3).

## Lizenz

**GNU General Public License, Version 3 oder später** ([LICENSE](LICENSE)) -
wie PSPP selbst. Namen und Logo sind nicht freigegeben:
[NAMEN-UND-MARKEN.md](NAMEN-UND-MARKEN.md).

---

## English

Statable is an accessible web interface for the GNU PSPP statistics engine,
compiled to WebAssembly and running entirely in the browser. Licence: GPL-3.0-or-later.
