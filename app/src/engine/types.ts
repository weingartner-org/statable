/** Eine Tabellenzelle, wie sie der JSON-Ausgabetreiber (patches/json.c) liefert. */
export interface Cell {
  r: number; c: number;          // Zeile, Spalte
  rs: number; cs: number;        // Zeilen-/Spaltenspanne
  h: boolean;                    // Kopfzelle
  a: 'l' | 'r' | 'c';            // Ausrichtung
  t: string;                     // angezeigter Text
  n?: number;                    // Zahlenwert, falls numerisch
  g?: boolean;                   // große Zahl (Quadratsumme): die Anzeige schreibt sie aus `n` mit Tausendertrenner (output/format-de.ts)
  x?: boolean;                   // von PSPP erzeugter Text (übersetzbar); sonst Nutzerdaten
  b?: boolean; i?: boolean;
  fn?: string[];                 // Fußnotenmarken
}

export interface TableItem {
  type: 'table';
  label: string;
  layer: string[];
  title: Cell | null;
  rows: number; cols: number;
  headRows: [number, number];
  headCols: [number, number];
  cells: Cell[];
  /** Farbige Ansicht, die jemand für diese Tabelle gewählt hat (lib/tabellenfarben.ts); fehlt = Standard. */
  ansicht?: import('../lib/tabellenfarben').Ansicht;
  caption: Cell | null;
  footnotes: Cell[];
  /** Mit welchem Fallgewicht die Tabelle gerechnet wurde (Spalte, Art, Summe der Gewichte, Zeilen): unter der Tabelle steht dann eine Fußzeile (lib/export.ts, `tabelleDe`). Fehlt = ungewichtet. */
  gewicht?: { spalte: string; art: 'haeufigkeit' | 'umfrage'; summe: number; zeilen: number };
}
export interface TitleItem { type: 'title'; level: number; text: string }
export interface SyntaxItem { type: 'syntax'; text: string }
export interface LogItem { type: 'log'; text: string }
export interface MessageItem { type: 'message'; severity: 'error' | 'warning' | 'note'; text: string }
export interface ChartItem { type: 'chart'; title: string }
export interface ImageItem { type: 'image' }
export type OutputItem = TableItem | TitleItem | SyntaxItem | LogItem | MessageItem | ChartItem | ImageItem;

export interface RunResult { items: OutputItem[]; ms: number }
export interface DataResult { csv: string; items: OutputItem[] }
export interface SavResult { bytes: Uint8Array; items: OutputItem[] }

/** Alles, was die Oberfläche von der Rechenmaschine braucht. Austauschbar (WASM im Browser, später evtl. Server). */
export interface Engine {
  /** Führt Syntax aus; `files` werden vorher ins Dateisystem der Engine geschrieben (z. B. eine CSV zum Einlesen). */
  run(syntax: string, files?: Record<string, Uint8Array>, schenken?: boolean): Promise<RunResult>;
  data(): Promise<DataResult>;
  /** Die aktive Datendatei als SPSS-Datei (.sav). */
  exportSav(): Promise<SavResult>;
  /** Lädt eine SPSS-Datei (.sav) als aktive Datendatei. */
  importSav(bytes: Uint8Array): Promise<RunResult>;
  reset(): Promise<void>;
}
