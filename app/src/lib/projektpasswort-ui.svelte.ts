/**
 * Zustand der Passwort-Dialoge (Stufe 5, Paket 5E2): beim Speichern fragen, Passwort setzen, beim Öffnen Passwort eingeben.
 * Die Dialoge selbst zeichnet `bausteine/ProjektPasswort.svelte` (einmal in App.svelte). Das Passwort wird nie gespeichert und nie protokolliert:
 * es geht nur als Rückgabewert an den Aufrufer, der es sofort braucht.
 * Dieses Modul importiert nichts aus der Sitzung (sonst entstünde ein Kreis mit dem Speichern).
 */
import { entschluesseleProjekt, PasswortFalsch } from './projektpasswort';
import { nurPasswortEmpfaenger } from './passwortfrage';

export type PwDialog =
  | { art: 'frage'; fertig: (a: 'passwort' | 'ohne' | null) => void }
  | { art: 'setzen'; fertig: (pw: string | null) => void }
  | { art: 'oeffnen'; name: string; versuch: (pw: string) => Promise<boolean>; fertig: (ok: boolean) => void }
  | { art: 'schluessel'; name: string; fertig: () => void };

export const pwUi = $state<{ dlg: PwDialog | null; arbeitet: boolean }>({ dlg: null, arbeitet: false });

/** „Mit Passwort verschlüsseln?“ - `null`: abgebrochen (nichts speichern). */
export const frageSpeicherart = (): Promise<'passwort' | 'ohne' | null> => new Promise(r => { pwUi.dlg = { art: 'frage', fertig: r }; });
/** Neues Passwort (zweimal) - `null`: abgebrochen. */
export const frageNeuesPasswort = (): Promise<string | null> => new Promise(r => { pwUi.dlg = { art: 'setzen', fertig: r }; });

/**
 * Entschlüsselt eine Projektdatei mit Passwort-Dialog (beliebig viele Versuche). `null`: abgebrochen oder Datei mit Schlüssel statt Passwort
 * (dann sagt der Dialog erst den Satz dazu). Andere Fehler (beschädigte Datei) gehen weiter.
 */
export async function entschluesselMitDialog(bytes: Uint8Array, name: string): Promise<Uint8Array | null> {
  if (!nurPasswortEmpfaenger(bytes)) { await new Promise<void>(r => { pwUi.dlg = { art: 'schluessel', name, fertig: r }; }); return null; }
  let erg: Uint8Array | null = null;
  const ok = await new Promise<boolean>(r => {
    pwUi.dlg = {
      art: 'oeffnen', name, fertig: r,
      versuch: async (pw) => {
        try { erg = await entschluesseleProjekt(bytes, pw); return true; }
        catch (e) { if (e instanceof PasswortFalsch) return false; throw e; }
      },
    };
  });
  return ok ? erg : null;
}
