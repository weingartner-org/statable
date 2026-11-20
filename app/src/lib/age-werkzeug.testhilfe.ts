// Testhilfe: das echte age-Werkzeug (1.3.2) von der Kommandozeile aus aufrufen.
// Pfad: Umgebungsvariable AGE_DIR, sonst die WinGet-Ablage von Johannes. Fehlt age.exe, werden die Gegenproben übersprungen.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

const STANDARD = join(homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages', 'FiloSottile.age_Microsoft.Winget.Source_8wekyb3d8bbwe', 'age');
export const AGE_DIR = process.env.AGE_DIR ?? STANDARD;
const exe = (n: string) => join(AGE_DIR, process.platform === 'win32' ? `${n}.exe` : n);
export const ageVorhanden = existsSync(exe('age')) && existsSync(exe('age-keygen'));
export const batchpassVorhanden = ageVorhanden && existsSync(exe('age-plugin-batchpass'));
if (!ageVorhanden) console.warn(`[age-Gegenproben übersprungen] age.exe nicht gefunden in ${AGE_DIR} (AGE_DIR setzen)`);
else if (!batchpassVorhanden) console.warn('[age-Gegenprobe Passwort übersprungen] age-plugin-batchpass fehlt');

export interface Lauf { status: number | null; stdout: Buffer; stderr: string }

/** Führt age (oder age-keygen) aus; der Ordner der Werkzeuge steht im PATH, damit age das Plugin batchpass findet. */
export function ageLauf(programm: 'age' | 'age-keygen', args: string[], eingabe?: Uint8Array | string, env: Record<string, string> = {}): Lauf {
  const r = spawnSync(exe(programm), args, {
    input: eingabe === undefined ? undefined : typeof eingabe === 'string' ? Buffer.from(eingabe, 'utf8') : Buffer.from(eingabe),
    env: { ...process.env, PATH: `${AGE_DIR}${delimiter}${process.env.PATH ?? ''}`, ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status, stdout: r.stdout ?? Buffer.alloc(0), stderr: String(r.stderr ?? '') };
}

/** Temporärer Ordner, wird mit aufraeumen() entfernt. */
export function tempOrdner(): { dir: string; datei: (n: string, inhalt?: Uint8Array | string) => string; lies: (n: string) => Buffer; aufraeumen: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'statable-age-'));
  return {
    dir,
    datei: (n, inhalt) => { const p = join(dir, n); if (inhalt !== undefined) writeFileSync(p, inhalt); return p; },
    lies: n => readFileSync(join(dir, n)),
    aufraeumen: () => rmSync(dir, { recursive: true, force: true }),
  };
}

/** Schlüsselpaar von age-keygen: privat (AGE-SECRET-KEY-1…) und öffentlich (age1…). */
export function keygenPaar(): { identitaet: string; empfaenger: string; dateiInhalt: string } {
  const r = ageLauf('age-keygen', []);
  if (r.status !== 0) throw new Error(`age-keygen fehlgeschlagen: ${r.stderr}`);
  const text = r.stdout.toString('utf8');
  const identitaet = /^(AGE-SECRET-KEY-1[A-Z0-9]+)$/m.exec(text)?.[1];
  const empfaenger = /public key: (age1[a-z0-9]+)/i.exec(text + '\n' + r.stderr)?.[1];
  if (!identitaet || !empfaenger) throw new Error('age-keygen-Ausgabe nicht lesbar');
  return { identitaet, empfaenger, dateiInhalt: text };
}
