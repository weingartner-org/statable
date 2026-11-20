/**
 * Whitelist-Leser für SPSS-Syntax (SoSci-`.sps`, Später S-C, D4; Fachblatt 2.4 und Entscheidung Opus 3).
 * Eine fremde `.sps` enthält Befehle wie HOST, INSERT, ERASE oder SAVE - die ganze Syntax auszuführen ist verboten.
 * Dieser Leser ist REIN: kein Zugriff auf Engine, Dateien oder Netz. Er erkennt nur VARIABLE LABELS, VALUE LABELS, MISSING VALUES, VARIABLE LEVEL, FORMATS
 * (und DATA LIST LIST mit BEGIN DATA … END DATA für Daten in derselben Datei). Alles andere wird übersprungen und mit Befehlsname und Zeile gemeldet.
 * Die Zeilen zwischen BEGIN DATA und END DATA sind Daten, nie Befehle. Ein Punkt in einer Zeichenkette beendet keinen Befehl.
 */

export type SpssFehlend = number | { von: number; bis: number };
export type SpssNiveau = 'nominal' | 'ordinal' | 'skala';
export interface SpssSyntaxErgebnis {
  variablenlabels: Record<string, string>;
  wertelabels: Record<string, Record<string, string>>;
  fehlend: Record<string, SpssFehlend[]>;
  niveau: Record<string, SpssNiveau>;
  formate: Record<string, string>;
  /** Alles außerhalb der Whitelist: Befehlsname in Großbuchstaben, 1-basierte Zeile des Befehlsanfangs */
  ignoriert: { befehl: string; zeile: number }[];
  daten?: { namen: string[]; zeilen: (string | number | null)[][] };
}

type Zeichen = { t: 'str' | 'wort' | 'punkt'; v: string };

/** Befehle aus zwei Wörtern, die zusammen gemeldet werden. */
const ZWEI_WOERTER = ['GET DATA', 'GET TRANSLATE', 'GET CAPTURE', 'GET STATA', 'SAVE TRANSLATE', 'SAVE DATA', 'DATA LIST', 'BEGIN DATA', 'END DATA', 'SORT CASES', 'SELECT IF', 'SPLIT FILE', 'MATCH FILES', 'ADD FILES', 'DISPLAY DICTIONARY', 'NEW FILE', 'DELETE VARIABLES', 'WEIGHT BY'];

/** Teilt einen Befehl an einem Punkt außerhalb von Zeichenketten, hinter dem in derselben Zeile noch etwas steht. Bei Kommentaren nur, wenn danach ein Befehlsname in Großbuchstaben folgt („z. B. …“ im Kommentar ist kein Befehl). */
function teileInnen(text: string, kommentar: boolean): { text: string; zeilen: number }[] {
  const aus: { text: string; zeilen: number }[] = [];
  let anf = '', von = 0, zeilen = 0, vorher = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '\n') zeilen++;
    if (!kommentar) { if (anf) { if (c === anf) anf = ''; continue; } if (c === "'" || c === '"') { anf = c; continue; } }
    if (c !== '.' || !/^[ \t]+\S/.test(text.slice(i + 1))) continue;
    const rest = text.slice(i + 1).replace(/^[ \t]+/, '');
    if (kommentar && !/^[A-Z]{3,}/.test(rest)) continue;
    aus.push({ text: text.slice(von, i + 1).trim(), zeilen: vorher });
    von = i + 1 + (text.slice(i + 1).length - rest.length); vorher = zeilen; i = von - 1;
  }
  aus.push({ text: text.slice(von).trim(), zeilen: vorher });
  return aus.filter(t => t.text !== '');
}

/** Teilt den Text in Befehle. Ein Befehl endet mit einem Punkt am Zeilenende (außerhalb von Zeichenketten) oder an einer Leerzeile. */
function zerlege(text: string): { text: string; zeile: number; kommentar: boolean }[] {
  const aus: { text: string; zeile: number; kommentar: boolean }[] = [];
  const zeilen = text.replace(/\r\n?/g, '\n').split('\n');
  let aktuell = '', start = 0, anf = '', kommentar = false;
  const schliesse = () => {
    if (aktuell.trim() !== '') {
      // Ein zweiter Befehl in derselben Zeile (`… 'x'. DELETE VARIABLES ALL.`) ist ein eigener Befehl und wird als solcher gelesen und gemeldet, nicht verschluckt.
      const teile = teileInnen(aktuell.trim(), kommentar);
      teile.forEach((t, i) => aus.push({ text: t.text, zeile: start + t.zeilen, kommentar: i === 0 ? kommentar : /^(\*|COMMENT\b)/i.test(t.text) }));
    }
    aktuell = ''; anf = ''; kommentar = false;
  };
  zeilen.forEach((z, i) => {
    if (!anf && z.trim() === '') { schliesse(); return; }   // Leerzeile beendet einen Befehl
    if (aktuell === '' && !anf) {
      start = i + 1;
      const t = z.trimStart();
      kommentar = t.startsWith('*') || /^COMMENT\b/i.test(t);
    }
    // Zeichenkette verfolgen, Punkt am Zeilenende suchen
    let zeileOhneBlockKommentar = z;
    if (!kommentar && !anf) zeileOhneBlockKommentar = z.replace(/\/\*.*?\*\//g, ' ');
    for (const c of zeileOhneBlockKommentar) { if (kommentar) break; if (anf) { if (c === anf) anf = ''; } else if (c === "'" || c === '"') anf = c; }
    aktuell += (aktuell === '' ? '' : '\n') + z;
    const ende = /\.\s*$/.test(z);
    if (ende && !anf) schliesse();
  });
  schliesse();
  return aus;
}

function zeichen(befehl: string): Zeichen[] {
  const aus: Zeichen[] = [];
  let i = 0;
  const n = befehl.length;
  while (i < n) {
    const c = befehl[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1, v = '';
      for (;;) {
        if (j >= n) break;
        if (befehl[j] === c) { if (befehl[j + 1] === c) { v += c; j += 2; continue; } break; }
        v += befehl[j]; j++;
      }
      aus.push({ t: 'str', v }); i = j + 1; continue;
    }
    if ('/(),='.includes(c)) { aus.push({ t: 'punkt', v: c }); i++; continue; }
    let j = i;
    while (j < n && !/[\s/(),='"]/.test(befehl[j]!)) j++;
    aus.push({ t: 'wort', v: befehl.slice(i, j) }); i = j;
  }
  return aus;
}

const istZahl = (w: string) => /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(w);
const ohnePunktEnde = (w: string) => w.replace(/\.$/, '');

/** `A001 TO A003` → A001, A002, A003, wenn Vorsatz und Stellenzahl gleich sind; sonst bleiben beide Namen stehen. */
function mitTo(namen: string[]): string[] {
  const aus: string[] = [];
  for (let i = 0; i < namen.length; i++) {
    if (namen[i + 1]?.toUpperCase() === 'TO' && namen[i + 2] !== undefined) {
      const a = /^(.*?)(\d+)$/.exec(namen[i]!), b = /^(.*?)(\d+)$/.exec(namen[i + 2]!);
      if (a && b && a[1] === b[1] && a[2]!.length === b[2]!.length && Number(b[2]) >= Number(a[2]) && Number(b[2]) - Number(a[2]) < 2000) {
        for (let k = Number(a[2]); k <= Number(b[2]); k++) aus.push(a[1]! + String(k).padStart(a[2]!.length, '0'));
        i += 2; continue;
      }
    }
    aus.push(namen[i]!);
  }
  return aus.filter(n => n.toUpperCase() !== 'TO');
}

/** Der Befehlsname: bis zu zwei Wörter; Abkürzungen (VAR LAB, VAL LAB, MISS VAL, VAR LEV) gelten wie in SPSS ab drei Buchstaben. */
function befehlsName(erster: string[]): { name: string; art: 'varlabels' | 'vallabels' | 'missing' | 'level' | 'formats' | 'datalist' | 'begindata' | 'enddata' | 'andere'; verbraucht: number } {
  const w = erster.map(x => x.toUpperCase());
  const praefix = (wort: string | undefined, voll: string) => !!wort && wort.length >= 3 && voll.startsWith(wort);
  if (praefix(w[0], 'VARIABLE') && praefix(w[1], 'LABELS')) return { name: 'VARIABLE LABELS', art: 'varlabels', verbraucht: 2 };
  if (praefix(w[0], 'VALUE') && praefix(w[1], 'LABELS')) return { name: 'VALUE LABELS', art: 'vallabels', verbraucht: 2 };
  if (praefix(w[0], 'MISSING') && praefix(w[1], 'VALUES')) return { name: 'MISSING VALUES', art: 'missing', verbraucht: 2 };
  if (praefix(w[0], 'VARIABLE') && praefix(w[1], 'LEVEL')) return { name: 'VARIABLE LEVEL', art: 'level', verbraucht: 2 };
  if (w[0] === 'FORMATS') return { name: 'FORMATS', art: 'formats', verbraucht: 1 };
  if (w[0] === 'DATA' && w[1] === 'LIST') return { name: 'DATA LIST', art: 'datalist', verbraucht: 2 };
  if (w[0] === 'BEGIN' && w[1] === 'DATA') return { name: 'BEGIN DATA', art: 'begindata', verbraucht: 2 };
  if (w[0] === 'END' && w[1] === 'DATA') return { name: 'END DATA', art: 'enddata', verbraucht: 2 };
  const kopf = /^[A-ZÄÖÜ]+/.exec(w[0] ?? '')?.[0] ?? (w[0] ?? '');
  const zwei = w[1] !== undefined ? `${kopf} ${/^[A-ZÄÖÜ]+/.exec(w[1])?.[0] ?? ''}` : '';
  if (zwei && ZWEI_WOERTER.includes(zwei)) return { name: zwei, art: 'andere', verbraucht: 2 };
  return { name: kopf || (w[0] ?? ''), art: 'andere', verbraucht: 1 };
}

/** Das Leerzeichen-getrennte erste, zweite Wort des Befehls (für den Namen). */
const ersteWoerter = (b: string) => b.replace(/^\s+/, '').split(/[\s=(/]+/).filter(Boolean).slice(0, 2);

function wertSchluessel(z: Zeichen): string { return z.t === 'str' ? z.v : istZahl(z.v) ? String(Number(z.v)) : z.v; }

export function liesSpssSyntax(text: string): SpssSyntaxErgebnis {
  const r: SpssSyntaxErgebnis = { variablenlabels: {}, wertelabels: {}, fehlend: {}, niveau: {}, formate: {}, ignoriert: [] };
  let dataList: { namen: string[]; text: boolean[]; trenner: string | null } | null = null;
  let begin: { zeile: number } | null = null;
  const daten: string[][] = [];
  try {
    const zeilenRoh = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
    // BEGIN DATA … END DATA zuerst herausnehmen: die Zeilen dazwischen sind Daten, nie Befehle.
    const ohneDaten: string[] = [];
    for (let i = 0; i < zeilenRoh.length; i++) {
      const z = zeilenRoh[i]!;
      ohneDaten.push(z);
      if (/^\s*BEGIN\s+DATA\s*\.?\s*$/i.test(z)) {
        let ende = -1;
        for (let k = i + 1; k < zeilenRoh.length; k++) if (/^\s*END\s+DATA\s*\.?\s*$/i.test(zeilenRoh[k]!)) { ende = k; break; }
        const bis = ende < 0 ? zeilenRoh.length : ende;
        for (let k = i + 1; k < bis; k++) { if (zeilenRoh[k]!.trim() !== '') daten.push([zeilenRoh[k]!]); ohneDaten.push(''); }
        if (ende < 0) r.ignoriert.push({ befehl: 'BEGIN DATA (ohne END DATA)', zeile: i + 1 });
        begin = { zeile: i + 1 };
        i = bis - 1;   // END DATA selbst bleibt als Zeile stehen und wird unten als Befehl erkannt
      }
    }
    for (const b of zerlege(ohneDaten.join('\n'))) {
      if (b.kommentar) continue;
      const rest = ohnePunktEnde(b.text.replace(/\s+$/, ''));
      const name = befehlsName(ersteWoerter(rest));
      // Tokens ab dem ersten Wort nach dem Befehlsnamen
      const alle = zeichen(rest);
      let ab = 0, gezaehlt = 0;
      while (ab < alle.length && gezaehlt < name.verbraucht) { if (alle[ab]!.t === 'wort') gezaehlt++; ab++; }
      const t = alle.slice(ab);
      if (name.art === 'andere') { r.ignoriert.push({ befehl: name.name, zeile: b.zeile }); continue; }
      if (name.art === 'begindata' || name.art === 'enddata') continue;
      if (name.art === 'varlabels') {
        for (let i = 0; i < t.length; i++) {
          if (t[i]!.t === 'punkt') continue;
          if (t[i]!.t === 'wort' && t[i + 1]?.t === 'str') { r.variablenlabels[t[i]!.v] = t[i + 1]!.v; i++; }
        }
      } else if (name.art === 'vallabels') {
        // Abschnitte durch `/`: Namen, dann Paare Wert + Beschriftung
        let abschnitt: Zeichen[] = [];
        const abschnitte: Zeichen[][] = [];
        for (const z of t) { if (z.t === 'punkt' && z.v === '/') { abschnitte.push(abschnitt); abschnitt = []; } else abschnitt.push(z); }
        abschnitte.push(abschnitt);
        for (const a of abschnitte) {
          let i = 0; const namen: string[] = [];
          while (i < a.length && a[i]!.t === 'wort' && !istZahl(a[i]!.v)) { namen.push(a[i]!.v); i++; }
          const paare: [string, string][] = [];
          while (i + 1 < a.length) {
            const wert = a[i]!, label = a[i + 1]!;
            if ((wert.t === 'str' || wert.t === 'wort') && label.t === 'str') { paare.push([wertSchluessel(wert), label.v]); i += 2; } else i++;
          }
          for (const n of mitTo(namen)) r.wertelabels[n] = { ...(r.wertelabels[n] ?? {}), ...Object.fromEntries(paare) };
        }
      } else if (name.art === 'missing') {
        let i = 0;
        while (i < t.length) {
          const namen: string[] = [];
          while (i < t.length && t[i]!.t === 'wort') { namen.push(t[i]!.v); i++; }
          if (t[i]?.t === 'punkt' && t[i]!.v === '(') {
            i++;
            const inhalt: Zeichen[] = [];
            while (i < t.length && !(t[i]!.t === 'punkt' && t[i]!.v === ')')) { inhalt.push(t[i]!); i++; }
            i++;
            const liste: SpssFehlend[] = [];
            const grenze = (w: string) => { const u = w.toUpperCase(); return u === 'LO' || u === 'LOWEST' ? -Infinity : u === 'HI' || u === 'HIGHEST' ? Infinity : istZahl(w) ? Number(w) : NaN; };
            const w = inhalt.filter(x => !(x.t === 'punkt' && x.v === ',')).filter(x => x.t === 'wort' || x.t === 'str');
            for (let k = 0; k < w.length; k++) {
              if (w[k]!.t === 'str') continue;   // Text-Codes kennt der Leser nicht (nur Zahlen)
              if (w[k + 1]?.v.toUpperCase() === 'THRU' && w[k + 2]) { const von = grenze(w[k]!.v), bis = grenze(w[k + 2]!.v); if (!Number.isNaN(von) && !Number.isNaN(bis)) liste.push({ von, bis }); k += 2; }
              else { const g = grenze(w[k]!.v); if (!Number.isNaN(g)) liste.push(g); }
            }
            for (const n of mitTo(namen)) r.fehlend[n] = liste;
          }
          if (t[i]?.t === 'punkt' && t[i]!.v === '/') i++;
          else if (i < t.length && !(t[i]!.t === 'wort')) i++;
        }
      } else if (name.art === 'level' || name.art === 'formats') {
        let i = 0;
        while (i < t.length) {
          const namen: string[] = [];
          while (i < t.length && t[i]!.t === 'wort') { namen.push(t[i]!.v); i++; }
          if (t[i]?.t === 'punkt' && t[i]!.v === '(') {
            const wert = t[i + 1]?.v ?? '';
            i += 3;
            for (const n of mitTo(namen)) {
              if (name.art === 'formats') r.formate[n] = wert.toUpperCase();
              else { const u = wert.toUpperCase(); r.niveau[n] = u === 'SCALE' || u === 'SCAL' ? 'skala' : u === 'ORDINAL' ? 'ordinal' : 'nominal'; }
            }
          }
          if (i < t.length && t[i]!.t === 'punkt' && t[i]!.v === '/') i++;
          else if (i < t.length && t[i]!.t !== 'wort') i++;
        }
      } else if (name.art === 'datalist') {
        // DATA LIST LIST (';') / A001 (F2.0) A003 (A30)   - andere Formen (FIXED, FILE=) sind keine Daten, die dieser Leser liest
        const liste = /^\s*LIST\b/i.test(rest.replace(/^\s*DATA\s+LIST\s*/i, ''));
        const hat = t.some(x => x.t === 'wort' && x.v.toUpperCase() === 'FILE');
        if (!liste || hat) { r.ignoriert.push({ befehl: 'DATA LIST', zeile: b.zeile }); continue; }
        let trenner: string | null = null;
        const si = t.findIndex(x => x.t === 'punkt' && x.v === '/');
        const vorn = si < 0 ? t : t.slice(0, si);
        const kl = vorn.findIndex(x => x.t === 'punkt' && x.v === '(');
        if (kl >= 0 && vorn[kl + 1]?.t === 'str') trenner = vorn[kl + 1]!.v;
        const namen: string[] = [], istText: boolean[] = [];
        const hinten = si < 0 ? [] : t.slice(si + 1);
        for (let i = 0; i < hinten.length; i++) {
          if (hinten[i]!.t === 'wort') {
            namen.push(hinten[i]!.v);
            let fmt = '';
            if (hinten[i + 1]?.t === 'punkt' && hinten[i + 1]!.v === '(') { fmt = hinten[i + 2]?.v ?? ''; i += 3; }
            istText.push(/^A/i.test(fmt));
          }
        }
        dataList = { namen, text: istText, trenner };
      }
    }
    if (dataList && begin) {
      const dl = dataList as { namen: string[]; text: boolean[]; trenner: string | null };
      const trenner = dl.trenner;
      const zeilen = daten.map(([z]) => {
        const felder = trenner ? teileFelder(z!, trenner) : z!.trim().split(/[\s,]+/);
        return dl.namen.map((_, i) => {
          const f = (felder[i] ?? '').trim();
          if (f === '') return null;
          if (dl.text[i]) return f;
          const zahl = istZahl(f) ? Number(f) : NaN;
          return Number.isNaN(zahl) ? f : zahl;
        });
      });
      r.daten = { namen: dl.namen, zeilen };
    }
  } catch { /* wirft nie */ }
  return r;
}

/** Felder einer Datenzeile; ein Trennzeichen in Anführungszeichen trennt nicht. */
function teileFelder(z: string, trenner: string): string[] {
  const aus: string[] = []; let f = '', anf = false;
  for (let i = 0; i < z.length; i++) {
    const c = z[i]!;
    if (c === '"') { if (anf && z[i + 1] === '"') { f += '"'; i++; } else anf = !anf; }
    else if (!anf && c === trenner) { aus.push(f); f = ''; }
    else f += c;
  }
  aus.push(f);
  return aus;
}
