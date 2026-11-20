/** Farbe und Strichart der Gruppen in den Bildern der Clusteranalyse (Palette der Bilder, kein Ocker): vier Farben, ab der fünften Gruppe andere Strichart; 0 = oberhalb des Schnitts (grau). */
const FARBEN = ['var(--dg-a)', 'var(--dg-b)', 'var(--tinte)', 'var(--tinte-2)'];
const STRICH = ['', '7 4', '2 4', '10 4 2 4'];
export const clusterFarbe = (g: number): string => (g <= 0 ? 'var(--dg-achse)' : FARBEN[(g - 1) % 4]!);
export const clusterStrich = (g: number): string | undefined => (g <= 0 ? '3 3' : Math.floor((g - 1) / 4) === 0 ? undefined : STRICH[1 + ((Math.floor((g - 1) / 4) - 1) % 3)]);
