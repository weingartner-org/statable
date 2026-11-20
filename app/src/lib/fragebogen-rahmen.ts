import type { FragebogenPlan, Lok } from './fragebogenplan';

/** Setzt den Text einer Sprache; sind danach alle Sprachen leer, kommt `undefined` zurück (Eigenschaft entfernen, kein leerer String im Plan). */
export function lokMitText(lok: Lok | undefined, sprache: string, text: string): Lok | undefined {
  const neu: Lok = { ...(lok ?? {}) };
  if (text.trim()) neu[sprache] = text; else delete neu[sprache];
  return Object.values(neu).some(v => v.trim()) ? neu : undefined;
}

export function mitEinleitung(p: FragebogenPlan, sprache: string, text: string): FragebogenPlan {
  const q = { ...p }; const l = lokMitText(p.einleitung, sprache, text);
  if (l) q.einleitung = l; else delete q.einleitung;
  return q;
}
export function mitAbschluss(p: FragebogenPlan, sprache: string, text: string): FragebogenPlan {
  const q = { ...p }; const l = lokMitText(p.abschluss, sprache, text);
  if (l) q.abschluss = l; else delete q.abschluss;
  return q;
}
/** Einwilligungstext einer Sprache setzen; ohne Text in allen Sprachen entfällt die Einwilligung ganz. */
export function mitEinwilligungText(p: FragebogenPlan, sprache: string, text: string): FragebogenPlan {
  const q = { ...p }; const l = lokMitText(p.einwilligung?.text, sprache, text);
  if (l) q.einwilligung = { text: l, pflicht: p.einwilligung?.pflicht ?? true }; else delete q.einwilligung;
  return q;
}
export function mitEinwilligungPflicht(p: FragebogenPlan, pflicht: boolean): FragebogenPlan {
  return p.einwilligung ? { ...p, einwilligung: { ...p.einwilligung, pflicht } } : p;
}
export function mitEinwilligungAn(p: FragebogenPlan, an: boolean): FragebogenPlan {
  const q = { ...p };
  if (!an) { delete q.einwilligung; return q; }
  if (!q.einwilligung) q.einwilligung = { text: {}, pflicht: true };
  return q;
}
