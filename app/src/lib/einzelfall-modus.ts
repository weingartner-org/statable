/**
 * Einzelfall-Modus der IPA (Stufe A3, Fachblatt Arbeitsweisen 5, Prüfplan A-B8).
 *
 * Im Modus sieht die Person **nur den aktuellen Fall**: Dokumente, Belege, Matrix, Suche und Memos zeigen nichts aus anderen Fällen.
 * „Nicht sehen“ heißt wie „nicht vorauslesen“ (F3): Der Text eines verdeckten Falls kommt nicht ins DOM. Dafür bekommt die Oberfläche eine
 * **Sicht** auf das Projekt (`sichtbaresProjekt`), aus der alles Verdeckte entfernt ist. Geschrieben wird immer in das ganze Projekt.
 * Verlassen geht immer; nichts ist gesperrt.
 */
import type { Memo, QualProjekt } from './qualprojekt';

export const modusAn = (q: Pick<QualProjekt, 'einzelfall'> | undefined): boolean => !!q?.einzelfall?.an;

/** Startet den Modus mit Fall `fall` (oder wechselt den Fall). `fertig` bleibt. */
export function starteEinzelfall(q: QualProjekt, fall: string): QualProjekt {
  if (!q.faelle.some(f => f.id === fall)) throw new Error('unbekannt');
  return { ...q, einzelfall: { an: true, aktuell: fall, fertig: q.einzelfall?.fertig ?? [] } };
}

/** Markiert den aktuellen Fall als fertig; danach ist kein Fall offen (die Person wählt den nächsten oder verlässt den Modus). */
export function fallFertig(q: QualProjekt): QualProjekt {
  const e = q.einzelfall;
  if (!e?.aktuell) return q;
  const x = { an: e.an, fertig: e.fertig.includes(e.aktuell) ? e.fertig : [...e.fertig, e.aktuell] };
  return { ...q, einzelfall: x };
}

/** Nimmt „fertig“ zurück (wenn die Person einen Fall noch einmal bearbeiten will). */
export function fallNichtFertig(q: QualProjekt, fall: string): QualProjekt {
  const e = q.einzelfall;
  if (!e || !e.fertig.includes(fall)) return q;
  return { ...q, einzelfall: { ...e, fertig: e.fertig.filter(f => f !== fall) } };
}

/** Verlässt den Modus; die Liste der fertigen Fälle bleibt für später. */
export function verlasseEinzelfall(q: QualProjekt): QualProjekt {
  const e = q.einzelfall;
  if (!e?.an) return q;
  const x = { an: false, fertig: e.fertig };
  return { ...q, einzelfall: x };
}

/** Fälle, die noch nicht fertig sind, in der Reihenfolge des Projekts. */
export const offeneFaelle = (q: QualProjekt): string[] => q.faelle.map(f => f.id).filter(f => !(q.einzelfall?.fertig ?? []).includes(f));

/**
 * Die Sicht im Modus: nur Dokumente des aktuellen Falls (ohne aktuellen Fall: keine), deren Segmente und Kodierungen; Memos nur, wenn kein
 * Bezug auf Verdecktes zeigt; Themen nur die persönlichen des aktuellen Falls (Gruppenthemen fassen Fälle zusammen und sind verdeckt);
 * Fälle nur der aktuelle; Zusammenfassungen nur der aktuelle Fall; Sequenzanalysen und Protokolle
 * nur zu sichtbaren Dokumenten. Codes, Variablen und Personen bleiben (sie enthalten keinen Text anderer Fälle).
 * Ohne Modus: dasselbe Objekt.
 */
export function sichtbaresProjekt(q: QualProjekt): QualProjekt {
  const e = q.einzelfall;
  if (!e?.an) return q;
  const fall = e.aktuell;
  const doks = q.dokumente.filter(d => fall !== undefined && d.fall === fall);
  const dokIds = new Set(doks.map(d => d.id));
  const segmente = q.segmente.filter(s => dokIds.has(s.dokument));
  const segIds = new Set(segmente.map(s => s.id));
  const themen = (q.themen ?? []).filter(t => t.fall !== undefined && t.fall === fall);
  const themaIds = new Set(themen.map(t => t.id));
  const sichtbar = (b: Memo['bezug'][number]): boolean => {
    switch (b.art) {
      case 'dokument': return !!b.id && dokIds.has(b.id);
      case 'segment': return !!b.id && segIds.has(b.id);
      case 'fall': return b.id === fall;
      case 'thema': return !!b.id && themaIds.has(b.id);
      case 'protokoll': return !!b.id && (q.protokolle ?? []).some(p => p.id === b.id && (p.fall === fall || (p.dokument !== undefined && dokIds.has(p.dokument))));
      case 'sequenzanalyse': return !!b.id && (q.sequenzanalysen ?? []).some(a => a.id === b.id && a.dokument !== undefined && dokIds.has(a.dokument));
      default: return true;   // projekt, code
    }
  };
  const r: QualProjekt = {
    ...q,
    dokumente: doks, segmente, kodierungen: q.kodierungen.filter(k => segIds.has(k.segment)),
    memos: q.memos.filter(m => m.bezug.every(sichtbar)),
    faelle: q.faelle.filter(f => f.id === fall),
    themen,
    // Protokoll: nur Einträge des Codebuchs und Themen-Verweise sichtbarer Themen (andere Einträge nennen Dokumente oder Fälle)
    protokoll: q.protokoll.filter(a => {
      if (a.was.startsWith('thema.')) { const n = a.nachher as { thema?: unknown } | undefined; return typeof n?.thema === 'string' && themaIds.has(n.thema); }
      return a.was.startsWith('code.');
    }),
  };
  delete r._unbekannt;
  if (q.zusammenfassungen) r.zusammenfassungen = q.zusammenfassungen.filter(z => z.zeile === fall || (z.zeile.startsWith('dok:') && dokIds.has(z.zeile.slice(4))));
  if (q.sequenzanalysen) r.sequenzanalysen = q.sequenzanalysen.filter(a => a.dokument !== undefined && dokIds.has(a.dokument));
  if (q.protokolle) r.protokolle = q.protokolle.filter(p => p.fall === fall || (p.dokument !== undefined && dokIds.has(p.dokument)));
  // Einwilligungen gehören zu einem Fall (Notizen, Zugriffskreis): nur die des aktuellen Falls
  if (q.einwilligungen) r.einwilligungen = q.einwilligungen.filter(e => e.fall === fall);
  // Ankerbeispiele der Codes sind Zitate aus Dokumenten: nur die mit sichtbarem Segment (ohne Segment ist die Herkunft unbekannt, also verdeckt)
  r.codes = q.codes.map(c => (c.anker ? { ...c, anker: c.anker.filter(an => an.segment !== undefined && segIds.has(an.segment)) } : c));
  if (q.typen) r.typen = [];
  // Mixed Methods (A2) fasst Fälle zusammen: im Modus ganz verdeckt (auch Meta-Inferenzen, Item-Texte, Notizen können andere Fälle nennen)
  if (q.jointDisplays) r.jointDisplays = [];
  if (q.instrument) r.instrument = [];
  if (q.selbstpruefung) r.selbstpruefung = [];
  // Berichtshilfe (A5) fasst die ganze Studie zusammen (Notizen können Fälle nennen): im Modus verdeckt
  if (q.berichtshilfe) r.berichtshilfe = [];
  delete r.mmDesign;
  if (q.mengen) r.mengen = q.mengen.map(m => (m.art === 'dokumente' ? { ...m, mitglieder: m.mitglieder.filter(i => dokIds.has(i)) } : m));
  if (q.arbeitsplatz?.offenesDokument !== undefined && !dokIds.has(q.arbeitsplatz.offenesDokument)) {
    const ap = { ...q.arbeitsplatz };
    delete ap.offenesDokument;
    r.arbeitsplatz = ap;
  }
  return r;
}
