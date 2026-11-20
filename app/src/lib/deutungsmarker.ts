/* Deutungsmarker (Feinstruktur F2A): findet Stellen, an denen ein Beobachtungstext schon deutet.
 * Die Funktion urteilt nie; die Oberfläche fragt nur „Ist das beobachtet oder gedeutet?“.
 * Regeln: docs/feinstruktur/SCHNITTSTELLEN-F2.md 1.1 und SOLLWERTE-F2.md. */

export type MarkerGruppe = 'absicht' | 'gewissheit' | 'vermutung' | 'begruendung' | 'wertung';
export interface DeutungsStelle {
  start: number;
  ende: number;
  treffer: string;
  gruppe: MarkerGruppe;
  satz: string;
}

interface Tok { w: string; s: number; e: number; satz: number; erstes: boolean; zitat: boolean }

/** Bereiche in wörtlicher Rede (Anführungszeichen-Paare). */
function zitatBereiche(text: string): Array<[number, number]> {
  const paare: Record<string, string[]> = { '„': ['“', '”'], '"': ['"'], '“': ['”'], '»': ['«'], '«': ['»'] };
  const r: Array<[number, number]> = [];
  let i = 0;
  while (i < text.length) {
    const schliesser = paare[text[i]!];
    if (schliesser) {
      let j = -1;
      for (let k = i + 1; k < text.length; k++) {
        if (schliesser.includes(text[k]!)) { j = k; break; }
      }
      if (j > i) { r.push([i, j + 1]); i = j + 1; continue; }
    }
    i++;
  }
  return r;
}

/** Satzbereiche [start, ende) ohne Rand-Leerzeichen. */
function saetze(text: string): Array<[number, number]> {
  const r: Array<[number, number]> = [];
  let s = 0;
  const schliesse = (e: number): void => {
    let a = s; let b = e;
    while (a < b && /\s/.test(text[a]!)) a++;
    while (b > a && /\s/.test(text[b - 1]!)) b--;
    if (b > a) r.push([a, b]);
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '\n') { schliesse(i); s = i + 1; }
    else if (/[.!?]/.test(c)) {
      let j = i;
      while (j + 1 < text.length && /[.!?]/.test(text[j + 1]!)) j++;
      if (j + 1 >= text.length || /\s/.test(text[j + 1]!)) { schliesse(j + 1); s = j + 1; }
      i = j;
    }
  }
  schliesse(text.length);
  return r;
}

function tokenisiere(text: string, sa: Array<[number, number]>, zb: Array<[number, number]>): Tok[] {
  const r: Tok[] = [];
  const re = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu;
  let m: RegExpExecArray | null;
  let letzterSatz = -1;
  while ((m = re.exec(text))) {
    const s = m.index; const e = s + m[0].length;
    const satz = sa.findIndex(([a, b]) => s >= a && s < b);
    if (satz < 0) continue;
    r.push({ w: m[0].toLowerCase(), s, e, satz, erstes: satz !== letzterSatz, zitat: zb.some(([a, b]) => s >= a && s < b) });
    letzterSatz = satz;
  }
  return r;
}

const nurLeer = (t: string): boolean => /^[ \t]+$/.test(t);

export function findeDeutungsmarker(text: string, sprache: 'de' | 'en'): DeutungsStelle[] {
  if (!text.trim()) return [];
  const sa = saetze(text);
  const zb = zitatBereiche(text);
  const tk = tokenisiere(text, sa, zb);
  const treffer: Array<{ s: number; e: number; gruppe: MarkerGruppe; satz: number }> = [];

  const vorKomma = (t: Tok): boolean => /^[ \t]*,/.test(text.slice(t.e));
  const nachKomma = (t: Tok): boolean => /,[ \t]*$/.test(text.slice(0, t.s));
  /** Folge von Wörtern direkt nacheinander (nur Leerzeichen dazwischen), ab Wort i. */
  const folge = (i: number, ws: string[]): Tok[] | null => {
    const r: Tok[] = [];
    for (let k = 0; k < ws.length; k++) {
      const t = tk[i + k];
      if (!t || t.zitat || t.w !== ws[k]) return null;
      if (k > 0 && (t.satz !== tk[i + k - 1]!.satz || !nurLeer(text.slice(tk[i + k - 1]!.e, t.s)))) return null;
      r.push(t);
    }
    return r;
  };
  const add = (ts: Tok[], gruppe: MarkerGruppe): void => {
    treffer.push({ s: ts[0]!.s, e: ts[ts.length - 1]!.e, gruppe, satz: ts[0]!.satz });
  };
  const spaeterWort = (i: number, w: string): boolean => {
    for (let k = i + 1; k < tk.length && tk[k]!.satz === tk[i]!.satz; k++) if (!tk[k]!.zitat && tk[k]!.w === w) return true;
    return false;
  };
  /** um … zu: Abstand höchstens 6 Wörter, ohne Satzzeichen dazwischen. */
  const umZu = (i: number): boolean => {
    for (let n = 0; n <= 6; n++) {
      const a = tk[i + n]; const b = tk[i + n + 1];
      if (!a || !b || a.satz !== b.satz || b.zitat || !nurLeer(text.slice(a.e, b.s))) return false;
      if (b.w === 'zu') return true;
    }
    return false;
  };
  const gewiss = (i: number, laenge: number): boolean => tk[i]!.erstes || vorKomma(tk[i + laenge - 1]!);
  const mitAdj = (i: number, vorne: string, adj: string[], zwischen: string): Tok[] | undefined =>
    adj.map((a) => folge(i, [vorne, a]) ?? folge(i, [vorne, zwischen, a])).find((x) => x) ?? undefined;

  for (let i = 0; i < tk.length; i++) {
    const t = tk[i]!;
    if (t.zitat) continue;
    const w = t.w;
    if (sprache === 'de') {
      if (['wollte', 'will', 'wollten', 'dachte'].includes(w)) add([t], 'absicht');
      else if (w === 'fühlte' || w === 'freute' || w === 'ärgerte') { const f = folge(i, [w, 'sich']); if (f) add(f, 'absicht'); }
      else if (w === 'fand') { const f = folge(i, ['fand', 'es']); if (f) add(f, 'absicht'); }
      else if (w === 'hatte') {
        const f = folge(i, ['hatte', 'vor']);
        if (f) {
          const n = tk[i + 2];
          const ok = !n || n.satz !== f[1]!.satz || (n.w === 'zu' && nurLeer(text.slice(f[1]!.e, n.s))) || /^[ \t]*[,;:.!?]/.test(text.slice(f[1]!.e));
          if (ok) add(f, 'absicht');
        }
      }
      else if (w === 'versuchte') { if (spaeterWort(i, 'zu')) add([t], 'absicht'); }
      else if (w === 'war') {
        const f = mitAdj(i, 'war', ['froh', 'traurig', 'nervös', 'wütend', 'unsicher', 'genervt', 'gelangweilt'], 'sichtlich');
        if (f) add(f, 'absicht');
      }
      else if (/^(offensichtlich|eindeutig)(e|en|em|er|es)?$/.test(w) || w === 'offenbar') add([t], 'gewissheit');
      else if (['natürlich', 'sicher', 'klar'].includes(w)) { if (gewiss(i, 1)) add([t], 'gewissheit'); }
      else if (w === 'wohl' && !t.erstes && text[t.s] === 'W') { /* „Zum Wohl“: Hauptwort, keine Vermutung (Abnahme F2) */ }
      else if (['wahrscheinlich', 'vermutlich', 'wohl', 'anscheinend', 'scheinbar', 'vielleicht'].includes(w)) add([t], 'vermutung');
      else if (['weil', 'deshalb', 'darum'].includes(w)) add([t], 'begruendung');
      else if (w === 'da') { if (nachKomma(t)) add([t], 'begruendung'); }
      else if (w === 'um') { if (umZu(i)) add([t], 'begruendung'); }
      else if (w === 'zu') { const f = folge(i, ['zu', 'laut']) ?? folge(i, ['zu', 'leise']); if (f) add(f, 'wertung'); }
      else if (/^(unhöflich|typisch|komisch|seltsam)(e|en|em|er|es)?$/.test(w)) add([t], 'wertung');
    } else {
      if (['wanted', 'wants', 'intended', 'thought', 'felt', 'enjoyed'].includes(w)) add([t], 'absicht');
      else if (w === 'tried') { if (spaeterWort(i, 'to')) add([t], 'absicht'); }
      else if (w === 'was') {
        const f = mitAdj(i, 'was', ['happy', 'sad', 'nervous', 'angry', 'unsure', 'annoyed', 'bored'], 'visibly');
        if (f) add(f, 'absicht');
      }
      else if (['obviously', 'clearly', 'evidently'].includes(w)) add([t], 'gewissheit');
      else if (w === 'certainly') { if (gewiss(i, 1)) add([t], 'gewissheit'); }
      else if (w === 'of') { const f = folge(i, ['of', 'course']); if (f && gewiss(i, 2)) add(f, 'gewissheit'); }
      else if (['probably', 'presumably', 'apparently', 'seemingly', 'seemed', 'perhaps', 'maybe'].includes(w)) add([t], 'vermutung');
      else if (['because', 'therefore'].includes(w)) add([t], 'begruendung');
      else if (w === 'since') { if (nachKomma(t)) add([t], 'begruendung'); }
      else if (w === 'in') { const f = folge(i, ['in', 'order', 'to']); if (f) add(f, 'begruendung'); }
      else if (w === 'so') { const f = folge(i, ['so', 'that']); if (f) add(f, 'begruendung'); }
      else if (w === 'too') { const f = folge(i, ['too', 'loud']) ?? folge(i, ['too', 'quiet']); if (f) add(f, 'wertung'); }
      else if (['rude', 'typical', 'strange', 'weird', 'odd'].includes(w)) add([t], 'wertung');
    }
  }

  treffer.sort((a, b) => a.s - b.s);
  const r: DeutungsStelle[] = [];
  let ende = -1;
  for (const h of treffer) {
    if (h.s < ende) continue;
    const [a, b] = sa[h.satz]!;
    r.push({ start: h.s, ende: h.e, treffer: text.slice(h.s, h.e), gruppe: h.gruppe, satz: text.slice(a, b) });
    ende = h.e;
  }
  return r;
}
