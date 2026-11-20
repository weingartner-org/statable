/**
 * Kleine reine Hilfen zur Passwort-Frage beim Speichern und Öffnen (Stufe 5, Paket 5E2). Kein Zustand, keine Oberfläche.
 */

/** Muss beim Speichern gefragt werden, ob mit Passwort verschlüsselt wird? Einmal je Sitzung, wenn persönliche Daten drin sind; immer, wenn die Datei verschlüsselt geöffnet oder gespeichert wurde. */
export function speichernFrageNoetig(o: { gefragt: boolean; persoenlich: boolean; verschluesselt: boolean }): boolean {
  if (o.verschluesselt) return true;
  return o.persoenlich && !o.gefragt;
}

/**
 * Ist die age-Datei mit genau einem Passwort-Eintrag (scrypt) verschlüsselt? Nur der Kopf wird gelesen, es wird nichts entschlüsselt.
 * Gegenstück zur Prüfung in `entschluesseleProjekt`, damit die Oberfläche vor dem Passwort fragen kann, ob es überhaupt eines braucht.
 */
export function nurPasswortEmpfaenger(bytes: Uint8Array): boolean {
  const dec = new TextDecoder();
  const arten: string[] = [];
  let pos = 0, erste = true;
  while (pos < bytes.length) {
    let ende = bytes.indexOf(0x0a, pos);
    if (ende < 0) ende = bytes.length;
    const zeile = dec.decode(bytes.subarray(pos, ende));
    pos = ende + 1;
    if (erste) { erste = false; continue; }
    if (zeile.startsWith('---')) break;
    if (zeile.startsWith('-> ')) arten.push(zeile.slice(3).split(' ')[0] ?? '');
  }
  return arten.length === 1 && arten[0] === 'scrypt';
}

/** Haken „wurde gespeichert“: wer wissen will, wann das Projekt gespeichert wurde (etwa Rückgängig beim Pseudonymisieren), trägt sich ein. */
const hoerer = new Set<() => void>();
export function beiGespeichert(f: () => void): () => void { hoerer.add(f); return () => { hoerer.delete(f); }; }
export function meldeGespeichertHaken(): void { for (const f of [...hoerer]) f(); }
