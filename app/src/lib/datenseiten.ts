/** Seiten des Lesemodus der Datentabelle (Barrierefreiheit Welle 3): feste Seiten zu 50 Zeilen, als echte Tabelle (nicht virtuell). Reine Rechnung, ohne Oberfläche. */
export const SEITE = 50;

export const seitenZahl = (zeilen: number) => Math.max(1, Math.ceil(zeilen / SEITE));
/** Seite (ab 0), auf der die Zeile `r` (ab 0) steht. */
export const seiteVonZeile = (r: number) => Math.max(0, Math.floor(r / SEITE));
/** Hält die Seitennummer (ab 0) im erlaubten Bereich. */
export const klemmeSeite = (seite: number, zeilen: number) => Math.min(Math.max(0, Math.trunc(seite) || 0), seitenZahl(zeilen) - 1);
/** Erste und letzte Zeile der Seite, als Nummern für Menschen (ab 1); bei 0 Zeilen `{ von: 0, bis: 0 }`. */
export function zeilenBereich(seite: number, zeilen: number): { von: number; bis: number } {
  if (zeilen <= 0) return { von: 0, bis: 0 };
  const s = klemmeSeite(seite, zeilen);
  return { von: s * SEITE + 1, bis: Math.min(zeilen, (s + 1) * SEITE) };
}
/** Liest „Gehe zu Zeile“: eine ganze Zahl von 1 bis `zeilen`; sonst `null`. Liefert die Zeile ab 0. */
export function leseZeilenNummer(eingabe: string | number | null | undefined, zeilen: number): number | null {
  const t = String(eingabe ?? '').trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= zeilen ? n - 1 : null;
}
