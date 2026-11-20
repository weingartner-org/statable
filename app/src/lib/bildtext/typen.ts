/**
 * Datenform je Diagrammart für `bildtext(art, daten)` (Welle 4). Die Formen sind so gewählt, dass die Bausteine sie ohnehin haben
 * (Histogramm/BoxStat/QQ aus lib/diagrammdaten.ts, Kaplan, Meta, Zeitreihe …) und nur umbenennen müssen. Alle Zahlen sind die echten Zahlen, nichts wird abgelesen.
 * Namen und Achsentexte kommen schon in der Sprache der Oberfläche; `bildtext` setzt sie nur in feste Sätze ein.
 */

/** Ergebnis: Kurztext (für `aria-label`), Beschreibung (Absätze), Liste (ein Element je Zeile; leer bei mehr als 20 Elementen), echte Tabelle. */
export interface BildText {
  kurz: string;
  beschreibung: string[];
  liste: string[];
  tabelle: { titel: string; kopf: string[]; zeilen: (string | number)[][]; zeilenKopf: boolean };
}

/** Achse. `von`/`bis` fehlen: aus den Daten. `schritt` fehlt: wird nicht genannt. */
export interface Achse { name: string; von?: number; bis?: number; schritt?: number; einheit?: string }
export interface Basis { /** Titel des Bildes (wie sichtbar) */ titel?: string }

export interface HistogrammDaten extends Basis {
  /** Name der Variablen (waagrechte Achse) */ name: string;
  /** Klassengrenzen (k + 1 Werte) und Anzahl je Klasse (k Werte), wie `Histogramm` aus lib/diagrammdaten.ts */ grenzen: number[]; anzahl: number[];
  n?: number; /** Was die senkrechte Achse zeigt (Vorgabe: Anzahl) */ art?: 'anzahl' | 'prozent' | 'dichte';
  mittel?: number; median?: number; xAchse?: Achse; yAchse?: Achse;
}
export interface SaeulenDaten extends Basis {
  /** 'saeulen' (senkrecht, Vorgabe) oder 'balken' (waagrecht) */ art?: 'saeulen' | 'balken';
  /** Name der Kategorien (zum Beispiel „Gruppe“) */ kategorieName?: string; kategorien: string[];
  /** Was die Höhe zeigt (zum Beispiel „Anzahl“, „Mittelwert von Alter“) */ wertName: string; einheit?: string;
  /** Eine Reihe je Gruppe in der Legende; eine einzige Reihe ohne Namen = einfaches Diagramm */ reihen: { name?: string; werte: (number | null)[] }[];
  stapel?: boolean; yAchse?: Achse;
}
export interface KreisDaten extends Basis { name: string; teile: { name: string; wert: number }[] }
export interface LinieDaten extends Basis {
  xAchse: Achse; yAchse: Achse;
  /** Beschriftung je Stelle der waagrechten Achse (Zeitpunkte, Zahlen); alle Linien teilen sie */ x: (string | number)[];
  reihen: { name?: string; werte: (number | null)[] }[];
  /** Zusätzliche waagrechte Hilfslinien (zum Beispiel Ziel, Grenze) */ hilfslinien?: { name: string; y: number }[];
}
export interface Gerade { a: number; b: number; r2?: number }
export interface StreuDaten extends Basis {
  xAchse: Achse; yAchse: Achse;
  /** Einfach: alle Punkte. Mit Gruppen: `gruppen` statt `punkte` */ punkte?: [number, number][]; gerade?: Gerade;
  gruppen?: { name: string; punkte: [number, number][]; gerade?: Gerade }[];
}
export interface BoxGruppe { name?: string; n?: number; unten: number; q1: number; median: number; q3: number; oben: number; ausreisser?: number[] }
export interface BoxplotDaten extends Basis { name: string; einheit?: string; gruppenName?: string; gruppen: BoxGruppe[]; achse?: Achse }
export interface MittelwerteDaten extends Basis {
  name: string; einheit?: string; gruppenName?: string;
  /** Was die Fehlerbalken zeigen */ fehler: 'ki95' | 'sd' | 'se' | 'keine';
  gruppen: { name: string; n?: number; mittel: number; unten?: number | null; oben?: number | null }[]; yAchse?: Achse;
}
/** Wie `QQ` aus lib/diagrammdaten.ts (Punkte: theoretisches Quantil, beobachteter Wert; Gerade durch die Quartile). */
export interface QqDaten extends Basis { name: string; punkte: [number, number][]; steigung: number; achsenabschnitt: number }
export interface KaplanDaten extends Basis {
  zeitName: string; ereignisName: string; einheit?: string; tMax?: number;
  kurven: { name?: string; n: number; ereignisse: number; zensiert?: number; median: number | null; punkte: { t: number; s: number }[] }[];
  logrank?: { chi2: number; df: number; p: number } | null; /** Zeitpunkte für die Tabelle; sonst 6 gleichmäßige */ zeiten?: number[];
}
export interface ForestDaten extends Basis {
  /** Name des Effektmaßes (zum Beispiel „Odds Ratio“, „Hedges g“) */ mass: string; nullwert: number;
  studien: { name: string; eff: number; unten: number; oben: number; gewicht?: number }[];
  gesamt?: { eff: number; unten: number; oben: number }; praed?: { unten: number; oben: number };
}
export interface ScreeDaten extends Basis { eigen: number[]; extrahiert?: number; gesamt?: number }
export interface PfadDaten extends Basis {
  knoten: { id: string; name: string; latent?: boolean }[];
  pfade: { von: string; nach: string; wert: number; p?: number | null; korrelation?: boolean }[];
  r2?: { id: string; wert: number }[];
}
export interface StreumatrixDaten extends Basis { variablen: string[]; /** Korrelationsmatrix, wenn vorhanden */ r?: (number | null)[][]; n?: number }
export interface KarteDaten extends Basis {
  gebiete: { name: string; wert?: number | null; klasse?: string }[]; wertName?: string; legende?: string[]; vermerk?: string | null;
}
export interface BaumKnoten { text: string; /** Beschriftung des Astes, der zu diesem Knoten führt */ ast?: string; kinder?: BaumKnoten[] }
export interface BaumDaten extends Basis { wurzel: BaumKnoten }
export interface VerteilungDaten extends Basis {
  xAchse: Achse; yAchse: Achse; kurven: { name?: string; punkte: [number, number][] }[];
  marken?: { name: string; x: number }[]; flaeche?: { name: string; von: number; bis: number }[];
}
export interface HeatmapDaten extends Basis {
  zeilenName?: string; spaltenName?: string; zeilen: string[]; spalten: string[]; werte: (number | null)[][]; wertName: string;
}
export interface SonstigesDaten extends Basis {
  /** Name der Art, zum Beispiel „Dendrogramm“, „ROC-Kurve“ */ artName?: string; xAchse?: Achse; yAchse?: Achse;
  /** Fertige Sätze des Bausteins (schon in der Sprache der Oberfläche) */ saetze?: string[];
  kennwerte?: { name: string; wert: string }[]; tabelle?: { kopf: string[]; zeilen: (string | number)[][] };
}

export interface ArtDaten {
  histogramm: HistogrammDaten; saeulen: SaeulenDaten; kreis: KreisDaten; linie: LinieDaten; streu: StreuDaten; boxplot: BoxplotDaten;
  mittelwerte: MittelwerteDaten; qq: QqDaten; kaplan: KaplanDaten; forest: ForestDaten; scree: ScreeDaten; pfad: PfadDaten;
  streumatrix: StreumatrixDaten; karte: KarteDaten; baum: BaumDaten; verteilung: VerteilungDaten; heatmap: HeatmapDaten; sonstiges: SonstigesDaten;
}
export type Art = keyof ArtDaten;
