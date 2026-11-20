/** Content-Security-Policy für das Blatt „Für Behörden“ (seiten/Rechtliches.svelte, art 'behoerden').
 *  Der Wortlaut wird beim Bau aus DEPLOY.md gelesen (vite.config.ts, define __CSP__, scripts/csp-lesen.mjs) und nie von Hand kopiert.
 *  Fehlt er (Bau ohne DEPLOY.md, Test ohne define), ist CSP_TEXT leer und das Blatt sagt „unbekannt“. */
declare const __CSP__: string;
export const CSP_TEXT: string = typeof __CSP__ === 'string' ? __CSP__ : '';

/** Die Direktiven der Policy: [Name, Quellen]. */
export function cspDirektiven(csp: string): Array<[string, string[]]> {
  return csp.split(';').map(t => t.trim().split(/\s+/).filter(Boolean)).filter(t => t.length > 0).map(t => [t[0]!, t.slice(1)]);
}

/** Alle Quellen, die auf eine fremde Adresse oder auf alle Adressen zeigen. Nicht dazu zählen: Schlüsselwörter in Hochkommas ('self', 'none', 'unsafe-inline' …)
 *  und die Schemata data: und blob: (sie bleiben im Browser). `https:`, `http:`, `wss:`, `*` und jeder Host- oder Adresseintrag zählen als extern. */
export function externeQuellen(csp: string): string[] {
  const aus = new Set<string>();
  for (const [, quellen] of cspDirektiven(csp)) for (const q of quellen) {
    if (q.startsWith("'")) continue;
    if (q === 'data:' || q === 'blob:') continue;
    aus.add(q);
  }
  return [...aus];
}
