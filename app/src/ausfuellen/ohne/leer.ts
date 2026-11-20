/**
 * Platzhalter für Teile von typage, die die Ausfüllseite nie benutzt (Stufe 3C, nur im Bau der Ausfüllseite eingesetzt: scripts/ausfuellseite-bau.mjs):
 * scrypt (Passwort - gibt es nur bei der forschenden Person), die Post-Quanten-Empfänger und P-256. Verschlüsselt wird an einen X25519-Empfänger (`age1…`).
 * Jeder Aufruf wirft; so bleibt die Datei klein und enthält keinen scrypt-Code.
 */
const nie = (): never => { throw new Error('In der Ausfüllseite nicht vorhanden'); };
const leer = new Proxy({}, { get: () => nie });
export const scrypt = nie;
export const MLKEM768P256 = leer, MLKEM768X25519 = leer;
export const p256 = leer;
