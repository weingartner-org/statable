/**
 * Mehrfachauswahl in EINER Zelle aufteilen (Paket 1B; Google „, “, Microsoft „;“, Nextcloud „; “, Kobo „ “). Festes Verfahren nach docs/erheben/FACHBLATT-STUFE-1.md (Paket 1B, Schritte 1 bis 5)
 * und den Festlegungen im Kopf von dienste-1b.test.ts. NACH DOKUMENTATION BZW. QUELLCODE ERKANNT, NICHT AN ECHTEN EXPORTEN GEPRÜFT.
 *
 * Rein und ohne Seiteneffekte: die Eingabe wird nie verändert, das Ergebnis ist nur ein Vorschlag (die Person entscheidet im Dialog).
 *  Schritt 1  Kandidat: mindestens 20 % der nicht leeren Zellen enthalten den Trenner.
 *  Schritt 2  Optionen: Teile (nach Trenner geteilt, getrimmt, leere fallen weg), die in mindestens zwei Zellen vorkommen (je Zelle einmal gezählt); mindestens zwei Optionen, sonst Freitext.
 *  Schritt 3  Je Zelle bekannte Optionen längste zuerst als GANZE Segmente abziehen; was bleibt, ist der Rest („Anderes“).
 *  Schritt 4  Unklar: der Rest enthält den Trenner oder eine bekannte Option als Zeichenfolge.
 * Optionen, die selbst den Trenner enthalten („Yes, any way“), findet Schritt 2 nicht; die Person führt die Teile im Dialog zusammen, dann wird mit `optionen` neu aufgeteilt.
 */

export interface ZellTeilung {
  /** Indizes in `optionen` der in dieser Zelle gefundenen Optionen */
  gewaehlt: number[];
  /** Was nach dem Abziehen der Optionen übrig bleibt (leer: nichts) */
  rest: string;
  unklar: boolean;
}
export interface MehrfachZelleErgebnis {
  optionen: string[];
  anders: boolean;
  /** 0-basierte Datenzeilen, die die Person entscheiden muss */
  unklar: number[];
  /** je Datenzeile; null = leere Zelle */
  zeilen: (ZellTeilung | null)[];
}

const leer = (z: unknown) => z === null || z === undefined || (typeof z === 'string' && z.trim() === '');
/** Die Zelle als Text (getrimmt) oder '' für leer; Zahlen und Datumswerte gelten nicht als Mehrfachauswahl-Zelle (null). */
export function zellText(z: unknown): string | null {
  if (leer(z)) return '';
  return typeof z === 'string' ? z.trim() : null;
}

/** Teile einer Zelle: am Trenner geteilt, getrimmt, leere Teile (Microsoft: „A;B;“) fallen weg. */
export function teile(zelle: string, trenner: string): string[] {
  return zelle.split(trenner).map(x => x.trim()).filter(x => x !== '');
}

/** Schritt 1: Ist die Spalte ein Kandidat (mindestens 20 % der nicht leeren Zellen enthalten den Trenner)? */
export function istKandidat(zellen: string[], trenner: string): boolean {
  const voll = zellen.filter(z => z !== '');
  if (!voll.length) return false;
  const mit = voll.filter(z => z.includes(trenner)).length;
  return mit * 5 >= voll.length;
}

/** Schritt 2: die Optionen in der Reihenfolge des ersten Vorkommens; weniger als zwei Optionen: null (Freitext). */
export function findeOptionen(zellen: string[], trenner: string): string[] | null {
  const zaehler = new Map<string, number>();
  for (const z of zellen) { if (z === '') continue; for (const t of new Set(teile(z, trenner))) zaehler.set(t, (zaehler.get(t) ?? 0) + 1); }
  const optionen = [...zaehler].filter(([, n]) => n >= 2).map(([t]) => t);
  return optionen.length >= 2 ? optionen : null;
}

/** Schritte 3 und 4 mit einer gegebenen Optionsliste (gefundene oder von der Person bearbeitete). */
export function teileZellen(zellen: string[], trenner: string, optionen: string[]): MehrfachZelleErgebnis {
  // Längste zuerst: „Iced Tea“ vor „Tea“; eine Option, die selbst den Trenner enthält, besteht aus mehreren Segmenten nacheinander
  const reihe = optionen.map((o, i) => ({ i, segmente: teile(o, trenner) })).filter(x => x.segmente.length).sort((a, b) => optionen[b.i]!.length - optionen[a.i]!.length);
  let anders = false;
  const unklar: number[] = [];
  const zeilen = zellen.map((z, zi): ZellTeilung | null => {
    if (z === '') return null;
    let seg = teile(z, trenner);
    const gewaehlt: number[] = [];
    for (const o of reihe) {
      for (let p = 0; p + o.segmente.length <= seg.length;) {
        if (o.segmente.every((s, k) => seg[p + k] === s)) { seg = [...seg.slice(0, p), ...seg.slice(p + o.segmente.length)]; if (!gewaehlt.includes(o.i)) gewaehlt.push(o.i); }
        else p++;
      }
    }
    gewaehlt.sort((a, b) => a - b);
    const rest = seg.join(trenner);
    const uk = rest !== '' && (seg.length >= 2 || optionen.some(o => o !== '' && rest.includes(o)));
    if (rest !== '') anders = true;
    if (uk) unklar.push(zi);
    return { gewaehlt, rest, unklar: uk };
  });
  return { optionen: [...optionen], anders, unklar, zeilen };
}

/** Die ganze Erkennung: Kandidat prüfen, Optionen finden (oder die gegebenen nehmen), aufteilen. `null`: kein Vorschlag. */
export function pruefeMehrfachZelle(zellen: unknown[], trenner: string, optionen?: string[]): MehrfachZelleErgebnis | null {
  const text: string[] = [];
  for (const z of zellen) { const t = zellText(z); if (t === null) return null; text.push(t); }
  if (optionen) return optionen.some(o => o.trim() !== '') ? teileZellen(text, trenner, optionen.map(o => o.trim()).filter(o => o !== '')) : null;
  if (!istKandidat(text, trenner)) return null;
  const o = findeOptionen(text, trenner);
  return o ? teileZellen(text, trenner, o) : null;
}

/** Entscheidung der Person für eine unklare Zeile: welche Optionen angekreuzt sind und ob der Rest als „Anderes“ gilt. */
export interface ZeilenEntscheid { optionen: boolean[]; anders: boolean }

/** Voreinstellung für unklare Zeilen: die gefundenen Optionen angekreuzt, der Rest als „Anderes“ (nichts geht verloren). */
export function vorbelegung(erg: MehrfachZelleErgebnis): Record<number, ZeilenEntscheid> {
  const aus: Record<number, ZeilenEntscheid> = {};
  for (const zi of erg.unklar) { const z = erg.zeilen[zi]!; aus[zi] = { optionen: erg.optionen.map((_, k) => z.gewaehlt.includes(k)), anders: z.rest !== '' }; }
  return aus;
}

/**
 * Das Endergebnis je Datenzeile: 0/1 je Option (leere Zelle: überall 0) und der Text für `<name>_anders` (null: keiner).
 * Unklare Zeilen folgen der Entscheidung der Person; `praefix` (Nextcloud „system-other-answer:“) wird am Anfang des Rests entfernt.
 */
export function endergebnis(erg: MehrfachZelleErgebnis, entscheid: Record<number, ZeilenEntscheid> = {}, praefix?: RegExp): { werte: number[][]; anders: (string | null)[] } {
  const werte: number[][] = [], anders: (string | null)[] = [];
  erg.zeilen.forEach((z, zi) => {
    if (!z) { werte.push(erg.optionen.map(() => 0)); anders.push(null); return; }
    const e = z.unklar ? entscheid[zi] ?? { optionen: erg.optionen.map((_, k) => z.gewaehlt.includes(k)), anders: z.rest !== '' } : null;
    werte.push(erg.optionen.map((_, k) => ((e ? e.optionen[k] : z.gewaehlt.includes(k)) ? 1 : 0)));
    const rest = (praefix ? z.rest.replace(praefix, '') : z.rest).trim();
    anders.push(rest !== '' && (e ? e.anders : true) ? rest : null);
  });
  return { werte, anders };
}
