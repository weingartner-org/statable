/**
 * Einwilligung als Prozess (Stufe F2B). Schnittstelle: docs/feinstruktur/SCHNITTSTELLEN-F2.md Abschnitt 2.1, fachlich: FACHBLATT-EINWILLIGUNG.md.
 * Statable merkt sich den Stand je Fall und Punkt, warnt beim Exportieren und erinnert an Fristen. Es sperrt nie, löscht nie und urteilt nie rechtlich.
 * Alle Funktionen geben neue Projekte zurück (das Original bleibt); jede Änderung schreibt genau einen Eintrag in `q.protokoll`.
 */
import type { Aenderung, Einwilligung, EinwilligungsPunkt, EinwilligungsStand, QualProjekt } from './qualprojekt';
import { EINWILLIGUNGS_PUNKTE } from './qualprojekt';

type Sp = 'de' | 'en';
export type ExportWeg = 'belegstellen' | 'fall-kategorie-matrix' | 'zwischenfazit' | 'feinstruktur-word' | 'joint-display' | 'qdpx' | 'projektdatei' | 'fall-code-matrix-zitate' | 'archiv';
export interface ExportWarnung {
  art: 'zitate' | 'teilnahme' | 'archivierung' | 'keine-einwilligung';
  fall: string;
  punkt?: EinwilligungsPunkt;
  stand?: EinwilligungsStand | 'fehlt';
  datum?: string;
  satz: string;
}
export interface OeffnenHinweis {
  art: 'aufnahme-widerrufen' | 'loeschen-bald' | 'loeschen-ueberfaellig' | 'wiedervorlage';
  fall: string; einwilligung: string; datum?: string; satz: string;
}

/** Fachblatt 4, wörtlich. */
export const WIDERRUF_SATZ: { de: string; en: string } = {
  de: 'Ein Widerruf gilt für die Zukunft. Was schon veröffentlicht ist, lässt sich meist nicht zurückholen. Klären Sie mit der Person und Ihrer Hochschule, was zu tun ist.',
  en: 'A withdrawal applies to the future. What has already been published usually cannot be taken back. Clarify with the person and your university what to do.'
};

/** Heutiges Datum als JJJJ-MM-TT (Ortszeit). */
export function heuteIso(jetzt: Date = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${jetzt.getFullYear()}-${z(jetzt.getMonth() + 1)}-${z(jetzt.getDate())}`;
}
/** Datum für die Anzeige: TT.MM.JJJJ (de) bzw. JJJJ-MM-TT (en). */
export function datumAnzeige(iso: string, sp: Sp): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m && sp === 'de' ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}
/** Kalendertage von `von` bis `bis` (beide JJJJ-MM-TT), ohne Zeitzone gerechnet. */
function tageZwischen(von: string, bis: string): number {
  const t = (s: string) => { const [j, m, d] = s.split('-').map(Number); return Date.UTC(j!, m! - 1, d!); };
  return Math.round((t(bis) - t(von)) / 86400000);
}

const STAND_WORT: Record<Sp, Record<EinwilligungsStand | 'fehlt', string>> = {
  de: { erteilt: 'erteilt', abgelehnt: 'abgelehnt', offen: 'offen', widerrufen: 'widerrufen', fehlt: 'nicht eingetragen' },
  en: { erteilt: 'granted', abgelehnt: 'declined', offen: 'open', widerrufen: 'withdrawn', fehlt: 'not entered' }
};
export const PUNKT_WORT: Record<Sp, Record<EinwilligungsPunkt, string>> = {
  de: { teilnahme: 'Teilnahme', aufnahme: 'Aufnahme', transkript: 'Transkript', zitate: 'Zitate', archivierung: 'Archivierung', weitergabe: 'Weitergabe' },
  en: { teilnahme: 'participation', aufnahme: 'recording', transkript: 'transcript', zitate: 'quotations', archivierung: 'archiving', weitergabe: 'sharing' }
};
export const standWort = (stand: EinwilligungsStand | 'fehlt', sp: Sp): string => STAND_WORT[sp][stand];

const fallName = (q: QualProjekt, id: string): string => q.faelle.find(f => f.id === id)?.name ?? id;

/** Die neueste Einwilligung eines Falls (größtes `erstellt`). */
export function aktuelleEinwilligung(q: QualProjekt, fall: string): Einwilligung | undefined {
  let best: Einwilligung | undefined;
  for (const e of q.einwilligungen ?? []) if (e.fall === fall && (!best || e.erstellt > best.erstellt)) best = e;
  return best;
}
export function standVon(e: Einwilligung | undefined, punkt: EinwilligungsPunkt): EinwilligungsStand | 'fehlt' {
  return e?.punkte.find(p => p.punkt === punkt)?.stand ?? 'fehlt';
}
const datumVon = (e: Einwilligung | undefined, punkt: EinwilligungsPunkt): string | undefined => e?.punkte.find(p => p.punkt === punkt)?.datum;

/** Warnungen vor einem Export, je Fall in `faelle` (Reihenfolge wie `q.faelle`). Sperrt nie. */
export function exportWarnungen(q: QualProjekt, weg: ExportWeg, faelle: string[], sprache: Sp): ExportWarnung[] {
  const de = sprache === 'de';
  const aus: ExportWarnung[] = [];
  const gewaehlt = new Set(faelle);
  const fallWort = (n: string, w: string) => (new RegExp('^' + w + '\b', 'i').test(n.trim()) ? n : `${w} ${n}`);
  for (const f of q.faelle) {
    if (!gewaehlt.has(f.id)) continue;
    const e = aktuelleEinwilligung(q, f.id);
    if (!e) {
      aus.push({
        art: 'keine-einwilligung', fall: f.id, stand: 'fehlt',
        satz: de ? `Für ${fallWort(f.name, 'Fall')} ist keine Einwilligung eingetragen. Trotzdem exportieren?` : `No consent is entered for ${fallWort(f.name, 'case')}. Export anyway?`
      });
      continue;
    }
    const mach = (art: ExportWarnung['art'], punkt: EinwilligungsPunkt, stand: EinwilligungsStand | 'fehlt', kern: string): ExportWarnung => {
      const datum = datumVon(e, punkt);
      const st = standWort(stand, sprache);
      const stTeil = de ? `Stand: ${st}${datum ? ` am ${datumAnzeige(datum, 'de')}` : ''}` : `status: ${st}${datum ? ` on ${datum}` : ''}`;
      return { art, fall: f.id, punkt, stand, ...(datum ? { datum } : {}), satz: `${kern} (${stTeil}).` };
    };
    const tn = standVon(e, 'teilnahme');
    if (tn === 'widerrufen' || tn === 'abgelehnt') {
      aus.push(mach('teilnahme', 'teilnahme', tn, de ? `Der Export enthält Text von ${fallWort(f.name, 'Fall')}. Die Teilnahme ist nicht mehr zugestimmt` : `The export contains text from ${fallWort(f.name, 'case')}. Participation is no longer agreed`));
    }
    if (weg === 'archiv') {
      const ar = standVon(e, 'archivierung');
      if (ar !== 'erteilt') aus.push(mach('archivierung', 'archivierung', ar, de ? `Der Export für ein Archiv enthält Text von Fall ${f.name}. Für die Archivierung liegt keine Zustimmung vor` : `The export for an archive contains text from case ${f.name}. There is no consent for archiving`));
    } else {
      const zi = standVon(e, 'zitate');
      if (zi !== 'erteilt') aus.push(mach('zitate', 'zitate', zi, de ? `Der Export enthält Text von Fall ${f.name}. Für Zitate liegt keine Zustimmung vor` : `The export contains text from case ${f.name}. There is no consent for quotations`));
    }
  }
  return aus;
}

/** Die Fälle der Dokumente: `Dokument.fall` und befragte Sprecher (Rolle „befragt“ oder ohne Rolle), in der Reihenfolge von `q.faelle`. */
export function faelleVonDokumenten(q: QualProjekt, dokumente: string[]): string[] {
  const ids = new Set<string>();
  const gewaehlt = new Set(dokumente);
  for (const d of q.dokumente) {
    if (!gewaehlt.has(d.id)) continue;
    if (d.fall) ids.add(d.fall);
    for (const s of d.transkript?.sprecher ?? []) if (s.fall && (s.rolle === 'befragt' || s.rolle === undefined)) ids.add(s.fall);
  }
  return q.faelle.filter(f => ids.has(f.id)).map(f => f.id);
}

/** Hinweise beim Öffnen: nur die aktuelle Einwilligung je Fall. `heute` als JJJJ-MM-TT. */
export function oeffnenHinweise(q: QualProjekt, heute: string, sprache: Sp): OeffnenHinweis[] {
  const de = sprache === 'de';
  const aus: OeffnenHinweis[] = [];
  for (const f of q.faelle) {
    const e = aktuelleEinwilligung(q, f.id);
    if (!e) continue;
    const basis = { fall: f.id, einwilligung: e.id };
    if (standVon(e, 'aufnahme') === 'widerrufen' && !(e.loeschen ?? []).some(l => l.was === 'aufnahme' && l.erledigt)) {
      aus.push({ ...basis, art: 'aufnahme-widerrufen', satz: de ? `Fall ${f.name} hat die Zustimmung zur Aufnahme widerrufen. Ist die Aufnahme gelöscht?` : `Case ${f.name} has withdrawn consent to the recording. Has the recording been deleted?` });
    }
    for (const l of e.loeschen ?? []) {
      if (l.erledigt) continue;
      const tage = tageZwischen(heute, l.bis);
      const was = de ? { aufnahme: 'der Aufnahme', kontaktdaten: 'der Kontaktdaten', andere: 'anderer Daten' }[l.was] : { aufnahme: 'the recording', kontaktdaten: 'the contact data', andere: 'other data' }[l.was];
      const d = datumAnzeige(l.bis, sprache);
      if (tage < 0) aus.push({ ...basis, art: 'loeschen-ueberfaellig', datum: l.bis, satz: de ? `Für Fall ${f.name} ist das Löschen ${was} überfällig (vorgesehen bis ${d}).` : `For case ${f.name}, deleting ${was} is overdue (planned by ${d}).` });
      else if (tage <= 14) aus.push({ ...basis, art: 'loeschen-bald', datum: l.bis, satz: de ? `Für Fall ${f.name} ist das Löschen ${was} bis ${d} vorgesehen.` : `For case ${f.name}, deleting ${was} is planned by ${d}.` });
    }
    for (const w of e.wiedervorlage ?? []) {
      if (w.erledigt || tageZwischen(heute, w.datum) > 0) continue;
      const anlass = /[.!?]$/.test(w.anlass.trim()) ? w.anlass.trim() : `${w.anlass.trim()}.`;
      aus.push({ ...basis, art: 'wiedervorlage', datum: w.datum, satz: de ? `Für Fall ${f.name} ist eine Wiedervorlage fällig: ${anlass}` : `For case ${f.name}, a follow-up is due: ${anlass}` });
    }
  }
  return aus;
}

const neueId = (): string => globalThis.crypto.randomUUID();

export function neueEinwilligung(fall: string, fassung: string, form: Einwilligung['form'], jetzt: number = Date.now()): Einwilligung {
  return { id: neueId(), fall, fassung, form, punkte: EINWILLIGUNGS_PUNKTE.map(punkt => ({ punkt, stand: 'offen' as const })), erstellt: jetzt, geaendert: jetzt };
}

function aendere(q: QualProjekt, id: string, f: (e: Einwilligung) => Einwilligung, eintrag: (alt: Einwilligung) => Omit<Aenderung, 'zeit' | 'kodierende'>, wer?: string): QualProjekt {
  const i = (q.einwilligungen ?? []).findIndex(e => e.id === id);
  if (i < 0) return q;
  const alt = q.einwilligungen![i]!;
  const jetzt = Math.max(Date.now(), alt.geaendert + 1);
  const neu = { ...f(alt), geaendert: jetzt };
  const liste = q.einwilligungen!.map((e, k) => (k === i ? neu : e));
  return { ...q, einwilligungen: liste, protokoll: [...q.protokoll, { zeit: jetzt, ...(wer ? { kodierende: wer } : {}), ...eintrag(alt) }] };
}

const setzeStaende = (punkte: Einwilligung['punkte'], welche: EinwilligungsPunkt[], stand: EinwilligungsStand, datum: string): Einwilligung['punkte'] => {
  const neu = punkte.map(p => (welche.includes(p.punkt) ? { ...p, stand, datum } : p));
  for (const w of welche) if (!neu.some(p => p.punkt === w)) neu.push({ punkt: w, stand, datum });
  return neu;
};

export function setzePunkt(q: QualProjekt, einwilligung: string, punkt: EinwilligungsPunkt, stand: EinwilligungsStand, datum: string, wer?: string): QualProjekt {
  return aendere(q, einwilligung,
    e => ({ ...e, punkte: setzeStaende(e.punkte, [punkt], stand, datum) }),
    alt => ({ was: `Einwilligung ${fallName(q, alt.fall)}: ${PUNKT_WORT.de[punkt]} ${standWort(stand, 'de')}`, vorher: standVon(alt, punkt), nachher: stand }), wer);
}

export function widerrufe(q: QualProjekt, einwilligung: string, punkte: EinwilligungsPunkt[], datum: string, notiz?: string, wer?: string): QualProjekt {
  const n = notiz?.trim();
  return aendere(q, einwilligung,
    e => ({ ...e, punkte: setzeStaende(e.punkte, punkte, 'widerrufen', datum), widerrufe: [...(e.widerrufe ?? []), { datum, punkte: [...punkte], ...(n ? { notiz: n } : {}) }] }),
    alt => ({ was: `Einwilligung ${fallName(q, alt.fall)}: ${punkte.map(p => PUNKT_WORT.de[p]).join(', ')} widerrufen`, vorher: punkte.map(p => `${p}: ${standVon(alt, p)}`).join('; '), nachher: 'widerrufen' }), wer);
}

export function bestaetigeGeloescht(q: QualProjekt, einwilligung: string, was: 'aufnahme' | 'kontaktdaten' | 'andere', heute: string, wer?: string): QualProjekt {
  return aendere(q, einwilligung,
    e => {
      const liste = [...(e.loeschen ?? [])];
      const i = liste.findIndex(l => l.was === was && !l.erledigt);
      if (i >= 0) liste[i] = { ...liste[i]!, erledigt: heute };
      else liste.push({ was, bis: heute, erledigt: heute });
      return { ...e, loeschen: liste };
    },
    alt => ({ was: `Einwilligung ${fallName(q, alt.fall)}: Löschen bestätigt (${{ aufnahme: 'Aufnahme', kontaktdaten: 'Kontaktdaten', andere: 'andere Daten' }[was]})`, nachher: heute }), wer);
}

export function erledigeWiedervorlage(q: QualProjekt, einwilligung: string, index: number, heute: string, wer?: string): QualProjekt {
  const e0 = (q.einwilligungen ?? []).find(e => e.id === einwilligung);
  if (!e0 || !e0.wiedervorlage?.[index]) return q;
  return aendere(q, einwilligung,
    e => ({ ...e, wiedervorlage: e.wiedervorlage!.map((w, i) => (i === index ? { ...w, erledigt: heute } : w)) }),
    alt => ({ was: `Einwilligung ${fallName(q, alt.fall)}: Wiedervorlage erledigt (${alt.wiedervorlage![index]!.anlass})`, nachher: heute }), wer);
}

/** Felder, die die Oberfläche ändert, ohne dass es eine eigene Funktion braucht (Fassung, Form, Zugriffskreis, Löschdaten, Wiedervorlagen). Ein Protokolleintrag je Aufruf. */
export type EinwilligungsFelder = Partial<Pick<Einwilligung, 'fassung' | 'form' | 'zugriffskreis' | 'loeschen' | 'wiedervorlage'>>;
export function bearbeiteEinwilligung(q: QualProjekt, einwilligung: string, felder: EinwilligungsFelder, was: string, wer?: string): QualProjekt {
  return aendere(q, einwilligung, e => ({ ...e, ...felder }), alt => ({ was: `Einwilligung ${fallName(q, alt.fall)}: ${was}` }), wer);
}
