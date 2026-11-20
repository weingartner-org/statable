/**
 * Paket 2F: aus dem Datensatz der Eingabe (Bogen-Nummer → Antworten) die Spalten und Zeilen für „neue Daten“ machen.
 * Spalten, Namen, Beschriftungen, Wertelabels und Fehlendcodes kommen aus `variablenAusPlan` (das Kodebuch des Plans); Werte sind nur Zahlen oder Text,
 * nie Befehlstext. Mehrfachfragen werden zu 0/1-Spalten, Rangfolgen zum Platz je Option; ein übersprungenes Feld trägt den Filter-Code -7 (als fehlend erklärt).
 */
import { variablenAusPlan, type FragebogenPlan, type Frage, type PlanVariable } from './fragebogenplan';
import type { Spalte } from './verzeichnis';
import { FILTER_CODE, type Durchgang, type Wert as AntwortWert } from './doppeleingabe';

export type Zelle = string | number | null;

const TXT = { de: { filter: 'nicht gefragt (Filter)', bogen: 'Bogen-Nummer' }, en: { filter: 'not asked (filter)', bogen: 'Questionnaire number' } };

const alsZahl = (v: AntwortWert | null | undefined): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.trim()))) return Number(v.trim());
  return null;
};
/** ISO-Datum (JJJJ-MM-TT) → TT.MM.JJJJ, wie die Tabelle Daten anzeigt und einliest. */
const datumDe = (t: string): string | null => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t.trim()); return m ? `${m[3]}.${m[2]}.${m[1]}` : null; };

const lokal = (l: Record<string, string> | undefined, sprache: string, plan: FragebogenPlan): string => (l ? l[sprache] || l[plan.sprachen[0] ?? ''] || Object.values(l).find(x => x) || '' : '');

/** Name (Variablenname) und Text jedes Feldes, für Tabellen von Abgleich und Protokoll; Block-Items heißen `<Block>_<Item>`. */
export function feldBeschriftungen(plan: FragebogenPlan, sprache: string = plan.sprachen[0] ?? 'de'): Record<string, { name: string; text: string; frage?: Frage; liste?: { wert: number; text: string }[] }> {
  const aus: Record<string, { name: string; text: string; frage?: Frage; liste?: { wert: number; text: string }[] }> = {};
  const optionen = (id: string | undefined) => (plan.antwortlisten.find(l => l.id === id)?.optionen ?? []).map(o => ({ wert: o.wert, text: lokal(o.text, sprache, plan) }));
  for (const s of plan.elemente) for (const el of s.elemente) {
    if (el.art === 'frage') aus[el.id] = { name: el.name, text: lokal(el.kurz ?? el.text, sprache, plan), frage: el, liste: optionen(el.liste) };
    else if (el.art === 'block') for (const it of el.items) aus[it.id] = { name: `${el.name}_${it.name}`, text: `${lokal(el.text, sprache, plan)} - ${lokal(it.kurz ?? it.text, sprache, plan)}`, liste: optionen(el.liste) };
  }
  return aus;
}

export function datensatzTabelle(plan: FragebogenPlan, datensatz: Durchgang, sprache: string = plan.sprachen[0] ?? 'de'): { spalten: Spalte[]; zeilen: Zelle[][]; variablen: PlanVariable[] } {
  const variablen = variablenAusPlan(plan, sprache), T = sprache === 'en' ? TXT.en : TXT.de;
  const fragen = new Map<string, Frage>();
  for (const s of plan.elemente) for (const el of s.elemente) if (el.art === 'frage') fragen.set(el.id, el);
  const bogen = [...Object.keys(datensatz)];
  const vergeben = new Set(variablen.map(v => v.name.toLowerCase()));
  let bn = 'bogen', k = 2;
  while (vergeben.has(bn)) bn = `bogen_${k++}`;

  const wertVon = (v: PlanVariable, a: Record<string, AntwortWert | null>): Zelle => {
    const q = v.quelle;
    if (q.teil) { const x = a[`${q.element}:${q.teil}`]; return typeof x === 'string' && x.trim() ? x.trim() : null; }
    if (q.option) {
      const roh = a[q.element], f = fragen.get(q.element), l = plan.antwortlisten.find(x => x.id === f?.liste), opt = l?.optionen.find(o => o.id === q.option);
      if (roh === FILTER_CODE) return FILTER_CODE;
      if (!opt || !Array.isArray(roh)) return null;
      if (f?.typ === 'rangfolge') { const i = roh.indexOf(opt.wert); return i < 0 ? null : i + 1; }
      return roh.includes(opt.wert) ? 1 : 0;
    }
    const roh = a[q.item ?? q.element];
    if (v.typ === 'zahl') return alsZahl(roh);
    if (roh === FILTER_CODE || typeof roh !== 'string' || !roh.trim()) return null;
    return v.typ === 'datum' ? datumDe(roh) : roh.trim();
  };

  const zeilen: Zelle[][] = bogen.map(b => [b, ...variablen.map(v => wertVon(v, datensatz[b]!))]);
  const spalten: Spalte[] = [{ name: bn, bezeichnung: T.bogen, art: 'text', niveau: 'nominal', format: 'A1', fehlend: [], fehlendText: '', werteLabels: {} }];
  variablen.forEach((v, i) => {
    const zahl = v.typ === 'zahl', datum = v.typ === 'datum';
    const mitFilter = zahl && zeilen.some(z => z[i + 1] === FILTER_CODE);
    const fehlend = [...(mitFilter ? [FILTER_CODE] : []), ...(v.fehlend ?? []).filter((x): x is number => typeof x === 'number' && x !== FILTER_CODE)].slice(0, 3);
    spalten.push({
      name: v.name, bezeichnung: v.label ?? '', art: v.typ,
      niveau: datum || v.niveau === 'skala' ? 'metrisch' : v.niveau === 'ordinal' ? 'ordinal' : 'nominal',
      format: zahl ? 'F8.0' : datum ? 'EDATE10' : 'A1', fehlend: zahl ? fehlend : [], fehlendText: '',
      werteLabels: { ...(mitFilter ? { [String(FILTER_CODE)]: T.filter } : {}), ...(v.werteLabels ?? {}) }
    });
  });
  return { spalten, zeilen, variablen };
}
