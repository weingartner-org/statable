/**
 * Zustand des Kontos für die Oberfläche. Nur benutzen, wenn `KONTO_AKTIV` an ist; bei „aus“ passiert hier nichts
 * (`starte` kehrt sofort zurück, `pb.ts` wird nie geladen).
 * Der Abgleich läuft - nur wenn angemeldet - beim App-Start (`starteImHintergrund`, unabhängig von den Einstellungen), nach jedem Speichern
 * (5 s entprellt), wenn das Gerät wieder online ist, alle 2 Minuten, beim Verlassen der Seite (best effort) und auf Knopfdruck.
 */
import { KONTO_AKTIV } from './config';
import { gleicheAb, holeNurFern, loeseKonflikt, loescheImKonto, standImBrowser, type Aktion, type Entscheidung, type FernEintrag, type Gegenstelle, type Ergebnis } from './sync';
import { ladeListe, entferneProjekt, s as sitzung, melde, L } from '../sitzung.svelte';
import { nachSpeichern, listeProjekte } from '../ablage';

type Konflikt = Extract<Aktion, { art: 'konflikt' }>;
export const konto = $state({
  /** aus = Schalter aus / noch nicht gestartet */
  phase: 'aus' as 'aus' | 'start' | 'abgemeldet' | 'angemeldet',
  name: '',
  passwort: false,
  anbieter: [] as { name: string; anzeige: string }[],
  /** Server nicht erreicht (Methoden konnten nicht gelesen werden) */
  serverFehler: false,
  status: 'bereit' as 'bereit' | 'gleicht' | 'offline' | 'fehler',
  zuletzt: 0,
  konflikte: [] as Konflikt[],
  nurFern: [] as FernEintrag[],
  uebersprungen: 0,
  meldung: ''
});

type Modul = typeof import('./pb');
let pbModul: Promise<Modul> | undefined;
const laden = () => (pbModul ??= import('./pb'));
let speicherName = '';
const speicher = () => standImBrowser('statable-konto-stand-' + speicherName);
const offen = (id: string) => sitzung.projekt?.id === id;
let timer: ReturnType<typeof setInterval> | undefined, gestartet = false;

const istNetz = (e: unknown) => !(e && typeof e === 'object' && typeof (e as { status?: number }).status === 'number' && (e as { status: number }).status > 0);

async function lies(m: Modul) {
  const p = m.person();
  konto.phase = p ? 'angemeldet' : 'abgemeldet'; konto.name = p?.name ?? ''; speicherName = p?.id ?? '';
  if (p) return;   // angemeldet: die Anmeldewege werden nicht gebraucht, also keine Anfrage
  try { const me = await m.methoden(); konto.passwort = me.passwort; konto.anbieter = me.anbieter; konto.serverFehler = false; }
  catch { konto.serverFehler = true; }
}

export async function starte() {
  if (!KONTO_AKTIV || gestartet) return;
  gestartet = true; konto.phase = 'start';
  const m = await laden();
  m.beiAenderung(() => { void lies(m); });
  await lies(m);
  if ((konto.phase as string) === 'angemeldet') {
    try { if (!(await m.erneuere())) await lies(m); } catch { konto.status = 'offline'; }
  }
  addEventListener('online', () => { void gleiche(); });
  // Verlassen: best effort - der Browser kann den Lauf abbrechen; was dann fehlt, holt der nächste Start nach.
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void gleiche(); });
  addEventListener('pagehide', () => { void gleiche(); });
  let warte: ReturnType<typeof setTimeout> | undefined;
  nachSpeichern.f = () => { if (konto.phase !== 'angemeldet') return; clearTimeout(warte); warte = setTimeout(() => { void gleiche(); }, 5000); };
  timer = setInterval(() => { if (document.visibilityState === 'visible') void gleiche(); }, 120_000);
  void gleiche();
}
/**
 * Beim App-Start: nur wenn auf diesem Gerät eine Anmeldung gespeichert ist (PocketBase legt sie unter `pocketbase_auth` ab).
 * Sonst wird weder der Konto-Code geladen noch eine Anfrage gestellt.
 */
export function starteImHintergrund() {
  if (!KONTO_AKTIV) return;
  let da = false; try { da = !!localStorage.getItem('pocketbase_auth'); } catch { /* ohne Speicher: kein Abgleich im Hintergrund */ }
  if (da) void starte();
}
export function beende() { clearInterval(timer); timer = undefined; gestartet = false; }

function uebernimm(r: Ergebnis) {
  konto.konflikte = r.konflikte; konto.nurFern = r.nurFern; konto.uebersprungen = r.uebersprungen.length; konto.zuletzt = Date.now();
  konto.status = r.fehler.length ? (r.fehler.every(istNetz) ? 'offline' : 'fehler') : 'bereit';
}
const gegen = async (): Promise<Gegenstelle> => (await laden()).gegenstelle;

export async function gleiche() {
  if (!KONTO_AKTIV || konto.phase !== 'angemeldet' || konto.status === 'gleicht') return;
  konto.status = 'gleicht';
  try {
    const r = await gleicheAb(await gegen(), speicher(), { istOffen: offen });
    uebernimm(r);
    if (r.runter) await ladeListe();
  } catch (e) {
    if ((e as { status?: number }).status === 401) { const m = await laden(); m.meldeAb(); }
    konto.status = istNetz(e) ? 'offline' : 'fehler';
  }
}

export async function anmelden(email: string, passwort: string): Promise<boolean> {
  const m = await laden();
  try { await m.meldeAn(email.trim(), passwort); } catch (e) { konto.meldung = (e as { status?: number }).status === 400 ? L('E-Mail oder Passwort stimmt nicht.', 'E-mail or password is wrong.') : L('Der Server antwortet nicht.', 'The server is not responding.'); return false; }
  konto.meldung = ''; await lies(m); void gleiche(); return true;
}
export async function anmeldenMit(anbieter: string): Promise<boolean> {
  const m = await laden();
  try { await m.meldeAnMitAnbieter(anbieter); } catch { konto.meldung = L('Die Anmeldung wurde nicht abgeschlossen.', 'Sign-in was not completed.'); return false; }
  konto.meldung = ''; await lies(m); void gleiche(); return true;
}
/**
 * Meldet ab. Mit `lokalLoeschen` werden vorher die Projekte auf diesem Gerät entfernt (Seminarraum-Rechner) - aber nur die,
 * die im Konto liegen (letzter Abgleich: Stand gleich). Was nicht abgeglichen ist, bleibt, damit nichts verloren geht;
 * die Zahl steht danach in `konto.meldung`.
 */
export async function abmelden(lokalLoeschen = false) {
  const m = await laden();
  let rest = 0;
  if (lokalLoeschen && konto.phase === 'angemeldet') {
    await gleiche();
    const stand = speicher().lies();
    for (const e of await listeProjekte()) {
      if (stand[e.id] === e.zeit && !konto.konflikte.some(k => k.cid === e.id)) await entferneProjekt(e.id); else rest++;
    }
    try { localStorage.removeItem('statable-konto-stand-' + speicherName); } catch { /* egal */ }
  }
  m.meldeAb(); Object.assign(konto, { konflikte: [], nurFern: [], uebersprungen: 0, status: 'bereit', zuletzt: 0 });
  await lies(m);
  konto.meldung = rest ? L(`${rest} Projekt(e) waren nicht im Konto abgeglichen und bleiben auf diesem Gerät.`, `${rest} project(s) were not synced to the account and stay on this device.`) : '';
}
export async function entscheide(k: Konflikt, wahl: Entscheidung) {
  try {
    await loeseKonflikt(await gegen(), speicher(), k, wahl, n => n + L(' (Konto)', ' (account)'));
    await ladeListe(); konto.konflikte = konto.konflikte.filter(x => x.cid !== k.cid);
  } catch { melde(L('Das ging nicht - der Server ist nicht erreichbar.', 'That did not work - the server cannot be reached.')); }
}
export async function holeAusKonto(e: FernEintrag) {
  try { await holeNurFern(await gegen(), speicher(), e); await ladeListe(); konto.nurFern = konto.nurFern.filter(x => x.cid !== e.cid); }
  catch { melde(L('Das ging nicht - der Server ist nicht erreichbar.', 'That did not work - the server cannot be reached.')); }
}
export async function entferneAusKonto(e: FernEintrag) {
  try { await loescheImKonto(await gegen(), speicher(), e); konto.nurFern = konto.nurFern.filter(x => x.cid !== e.cid); }
  catch { melde(L('Das ging nicht - der Server ist nicht erreichbar.', 'That did not work - the server cannot be reached.')); }
}
/** Löscht das Konto samt allen Projekten im Konto. Die Projekte im Browser bleiben. */
export async function kontoLoeschen(): Promise<boolean> {
  try { const m = await laden(); await m.loescheKonto(); try { localStorage.removeItem('statable-konto-stand-' + speicherName); } catch { /* egal */ } await lies(m); return true; }
  catch { melde(L('Das Konto konnte nicht gelöscht werden - der Server ist nicht erreichbar.', 'The account could not be deleted - the server cannot be reached.')); return false; }
}
