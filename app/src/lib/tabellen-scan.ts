/**
 * Liest die `<table>`- und `<th>`-Stellen aus dem Quelltext einer .svelte-Datei (Barrierefreiheit Welle 3, Auftrag B).
 * Nur für den Wächter `tabelle-struktur-svelte.test.ts` und die Liste `docs/barrierefreiheit/TABELLEN-LISTE.md`; läuft ohne Browser.
 */

export interface KopfStelle { zeile: number; tag: string; scope: boolean; id: boolean }
export interface TabellenStelle {
  zeile: number;
  tag: string;
  /** `<caption>` innerhalb der Tabelle. */
  caption: boolean;
  /** `aria-label` oder `aria-labelledby` am `<table>`. */
  name: boolean;
  /** `role="presentation"` oder `role="none"`. */
  layout: boolean;
  koepfe: KopfStelle[];
  /** Mindestens ein `<th scope="row">` (oder `rowgroup`) oder `th` in einer Zeile, deren erste Zelle es ist. */
  zeilenKoepfe: boolean;
}

/** Liest ein Tag ab `von` (zeigt auf `<`) bis zum schließenden `>`, ohne `>` in Anführungszeichen oder geschweiften Klammern mitzuzählen. */
function liesTag(q: string, von: number): string {
  let i = von, klammer = 0, anf = '';
  for (; i < q.length; i++) {
    const c = q[i]!;
    if (anf) { if (c === anf && klammer === 0) anf = ''; continue; }
    if (c === '{') klammer++;
    else if (c === '}') klammer = Math.max(0, klammer - 1);
    else if ((c === '"' || c === "'") && klammer === 0) anf = c;
    else if (c === '>' && klammer === 0) return q.slice(von, i + 1);
  }
  return q.slice(von);
}

/** Entfernt `<script>` und `<style>` samt Inhalt, behält die Zeilenumbrüche (Zeilennummern bleiben richtig). */
function ohneSkriptUndStil(q: string): string {
  return q.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, m => m.replace(/[^\n]/g, ' '));
}

export function scanneTabellen(quelltext: string): TabellenStelle[] {
  const q = ohneSkriptUndStil(quelltext);
  const zeileVon = (pos: number) => q.slice(0, pos).split('\n').length;
  const stellen: TabellenStelle[] = [];
  const re = /<table\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q))) {
    const tag = liesTag(q, m.index);
    const ende = q.indexOf('</table>', m.index);
    const koerper = q.slice(m.index + tag.length, ende < 0 ? q.length : ende);
    const koepfe: KopfStelle[] = [];
    const rh = /<th\b/g;
    let k: RegExpExecArray | null;
    while ((k = rh.exec(koerper))) {
      const t = liesTag(koerper, k.index);
      koepfe.push({ zeile: zeileVon(m.index + tag.length + k.index), tag: t, scope: /\bscope\s*=/.test(t), id: /\bid\s*=/.test(t) });
    }
    stellen.push({
      zeile: zeileVon(m.index),
      tag,
      caption: /<caption\b/.test(koerper),
      name: /\baria-label(ledby)?\s*=/.test(tag),
      layout: /\brole\s*=\s*["'](presentation|none)["']/.test(tag),
      koepfe,
      zeilenKoepfe: koepfe.some(h => /scope\s*=\s*["']?(row|rowgroup)/.test(h.tag)),
    });
  }
  return stellen;
}

/** Eine Tabelle hat einen Namen, wenn sie `caption` oder `aria-label(ledby)` trägt oder ausdrücklich Layout (`role="presentation"`) ist. */
export const hatName = (t: TabellenStelle) => t.caption || t.name || t.layout;
