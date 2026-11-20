/**
 * Größe der ganzen Oberfläche (Knöpfe − / + im Kopf, 09.10.). Ein Knopf kann den Zoom des Browsers (Strg +/−) nicht auslösen;
 * Statable vergrößert deshalb die Grundschrift - fast alles ist in rem gebaut und wächst mit. Die Zeilenhöhe der Datentabelle
 * (px, wegen des Blätterns in Daten.svelte) wächst über `--zeile` mit. Gilt für dieses Gerät (localStorage), nicht fürs Projekt.
 *
 * Gefühlte Breite (iPad-Fehler 11.10.): `@media (max-width: …px)` misst Bildschirm-px und merkt nichts von der größeren Schrift -
 * bei 200 % blieb die volle Kopfleiste stehen und lief über. Deshalb hängen alle Breiten-Umschaltungen der Oberfläche an Klassen am
 * <html>: `eng-N` heißt „gefühlte Breite (Fensterbreite / Größe) höchstens N px“, `weit-N` „mindestens N px“. Gemessen wird mit
 * matchMedia (dieselbe Breite wie in einer echten Media Query, also auch richtig bei Strg + und beim Drehen des Geräts).
 * Neue Schwelle im CSS: hier in ENG oder WEIT eintragen und `:where(:root.eng-N) .x {…}` schreiben (in Svelte mit `:global(…)`).
 */
export const STUFEN = [75, 90, 100, 110, 125, 150, 175, 200] as const;
const SCHLUESSEL = 'statable-groesse';
const GRUND = 90;   // html{font:90%} in app.css: 100 % hier = diese Grundschrift
const ZEILE = 26;
export const ENG = [339, 480, 520, 600, 640, 700, 759, 760, 860, 1000, 1100] as const;
export const WEIT = [701, 1400, 1700, 2400] as const;
/** Schmaler als diese gefühlte Breite wird es nicht: darunter bricht die Handy-Form (Handy ab 360 px: bis 150 %; iPad und größer: bis 200 %). */
const MIN_BREITE = 240;

function laden(): number {
  try { const p = Number(localStorage.getItem(SCHLUESSEL)); return (STUFEN as readonly number[]).includes(p) ? p : 100; } catch { return 100; }
}
const fensterBreite = () => (typeof document !== 'undefined' && document.documentElement.clientWidth) || (typeof innerWidth === 'number' ? innerWidth : 1600);
/** `gewaehlt` ist, was die Person eingestellt hat; `prozent` gilt gerade - nur kleiner, wenn das Fenster (gedreht, schmaler gezogen) dafür zu schmal ist. */
export const groesse = $state({ gewaehlt: laden(), prozent: 100, breite: fensterBreite() });
export const zeilenHoehe = () => Math.round(ZEILE * groesse.prozent / 100);
export const hoechste = () => STUFEN.filter(p => p <= 100 || groesse.breite * 100 / p >= MIN_BREITE).at(-1)!;
/** Gefühlte Breite höchstens n px (n aus ENG) - für Entscheidungen im Skript, gleich wie das CSS. */
export const eng = (n: typeof ENG[number]) => typeof document !== 'undefined' && document.documentElement.classList.contains(`eng-${n}`);

function schwellen() {
  if (typeof document === 'undefined' || typeof matchMedia !== 'function') return;
  const c = document.documentElement.classList, f = groesse.prozent / 100;
  for (const n of ENG) c.toggle(`eng-${n}`, matchMedia(`(max-width: ${n * f}px)`).matches);
  for (const n of WEIT) c.toggle(`weit-${n}`, matchMedia(`(min-width: ${n * f}px)`).matches);
}
export function wende() {
  groesse.prozent = Math.min(groesse.gewaehlt, hoechste());
  if (typeof document === 'undefined') return;
  const r = document.documentElement.style;
  if (groesse.prozent === 100) { r.removeProperty('font-size'); r.removeProperty('--zeile'); }
  else { r.setProperty('font-size', `${GRUND * groesse.prozent / 100}%`); r.setProperty('--zeile', `${zeilenHoehe()}px`); }
  schwellen();
  try { if (groesse.gewaehlt === 100) localStorage.removeItem(SCHLUESSEL); else localStorage.setItem(SCHLUESSEL, String(groesse.gewaehlt)); } catch { /* privates Fenster */ }
}
export function stufe(richtung: 1 | -1 | 0) {
  const i = STUFEN.indexOf(groesse.prozent as typeof STUFEN[number]);
  groesse.gewaehlt = richtung === 0 ? 100 : Math.min(hoechste(), STUFEN[Math.max(0, Math.min(STUFEN.length - 1, (i < 0 ? 2 : i) + richtung))]!);
  wende();
}
/** Fenster schmaler gezogen oder Gerät gedreht: gilt nur, solange es passt - die gewählte Größe kommt wieder, wenn es breiter wird. */
function neueBreite() { groesse.breite = fensterBreite(); wende(); }

if (typeof window !== 'undefined') addEventListener('resize', neueBreite);
wende();
