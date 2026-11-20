/**
 * Exporte aus dem Fragebogen-Plan (Paket 2E): XLSForm, LimeSurvey (Text-Format), SurveyJS-JSON, PSPP-Syntax, Kodebuch Word, Fragebogen Word, Fragebogen HTML.
 * Festlegungen: Kopf von fragebogenexport-2e.test.ts; Belege: docs/erheben/EXPORTFORMATE-BELEGE.md.
 *
 * SICHERHEIT: Der Plan ist nur Daten. Plan-Texte gelangen nie als Code irgendwohin: in PSPP-Befehle nur über `zit` (Beschriftungen) und `pk` (Kommentarzeile), Namen nur nach
 * `planNameOk`; in HTML, LimeSurvey-Text und SurveyJS-`html` nur maskiert (& < > "); in XLSForm als Text-Zellen (nie als Formel). Fehler aus `planPruefen` sperren alle Exporte
 * (Error mit „planFehler“ am Anfang). Es gibt nie einen stillen Rückfall auf eine andere Sprache.
 */
import type { Antwortliste, Bedingung, Block, Element, Frage, FragebogenPlan, Lok, PlanVariable, Seite } from './fragebogenplan';
import { planNameOk, planPruefen, platzhalterStellen, variablenAusPlan } from './fragebogenplan';
import { pk, zit } from './befehlstext';

/* ------------------------------------------------------------------ Gemeinsames */
const flach = (plan: FragebogenPlan): Element[] => plan.elemente.flatMap(s => s.elemente);
const SPRACHCODE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;
/** Zeichen, die in XML 1.0 nicht vorkommen dürfen (würden xlsx und docx zerstören). */
// eslint-disable-next-line no-control-regex
const XML_UNGUELTIG = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g;
const sauber = (t: string): string => String(t ?? '').replace(XML_UNGUELTIG, '');
export const einzeilig = (t: string): string => sauber(t).replace(/[\t\r\n\u2028\u2029]+/g, ' ').trim();
export const text = (l: Lok | undefined, sprache: string): string => (l && typeof l[sprache] === 'string' ? l[sprache]! : '');
const zahlText = (n: number): string => { if (!Number.isFinite(n)) throw new Error('planFehler: Zahl ist nicht endlich.'); return String(n); };

/** Sperrt den Export bei Fehlern aus `planPruefen` und bei Angaben, die ein Zielformat nicht tragen kann. */
export function sperre(plan: FragebogenPlan): void {
  const probleme = planPruefen(plan).filter(b => b.art === 'fehler').map(b => b.text);
  for (const p of platzhalterStellen(plan)) probleme.push(`Vorlagentext noch nicht ersetzt: Der Text von „${p.name}“ enthält noch einen Platzhalter wie „(hier eintragen)“.`);
  if (!plan.sprachen.length) probleme.push('Der Plan hat keine Sprache.');
  for (const c of plan.sprachen) if (!SPRACHCODE.test(c)) probleme.push(`Der Sprachcode „${c}“ ist ungültig.`);
  const listen = new Map(plan.antwortlisten.map(l => [l.id, l]));
  for (const l of plan.antwortlisten) if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(l.name)) probleme.push(`Der Listenname „${l.name}“ darf nur Buchstaben, Ziffern, _, . und - enthalten.`);
  for (const e of flach(plan)) {
    const id = e.art === 'block' ? e.liste : e.art === 'frage' ? e.liste : undefined;
    const braucht = e.art === 'block' || (e.art === 'frage' && (e.typ === 'einfach' || e.typ === 'mehrfach' || e.typ === 'rangfolge'));
    if (braucht && (!id || !listen.has(id))) probleme.push(`„${e.name}“ verweist auf eine Antwortliste, die es nicht gibt.`);
  }
  const vars = new Set(variablenAusPlan(plan).map(v => v.name.toLowerCase()));
  for (const s of plan.skalen) {
    if (!planNameOk(s.name)) probleme.push(`Der Skalenname „${s.name}“ ist kein gültiger Variablenname.`);
    else if (vars.has(s.name.toLowerCase())) probleme.push(`Der Skalenname „${s.name}“ ist schon eine Variable.`);
    else vars.add(s.name.toLowerCase());
    if (!Number.isInteger(s.mindestens) || s.mindestens < 1) probleme.push(`Skala „${s.name}“: „mindestens“ muss eine ganze Zahl ab 1 sein.`);
  }
  if (probleme.length) throw new Error(`planFehler: ${probleme.slice(0, 5).join(' | ')}${probleme.length > 5 ? ` | … (${probleme.length} Fehler)` : ''}`);
}
export function sprachWahl(plan: FragebogenPlan, s?: string): string {
  const sp = s ?? plan.sprachen[0]!;
  if (!plan.sprachen.includes(sp)) throw new Error(`sprache: „${sp}“ gibt es im Plan nicht (Sprachen: ${plan.sprachen.join(', ')}).`);
  return sp;
}

export interface Ix {
  /** Frage oder Block nach id */ el: Map<string, Frage | Block>;
  /** laufende Nummer der Fragen und Blöcke (Hinweise zählen nicht) */ nr: Map<string, number>;
  liste: (id: string | undefined) => Antwortliste | undefined;
  name: (id: string) => string;
}
export function indexVon(plan: FragebogenPlan): Ix {
  const el = new Map<string, Frage | Block>(), nr = new Map<string, number>();
  let n = 0;
  for (const e of flach(plan)) if (e.art !== 'hinweis') { el.set(e.id, e); nr.set(e.id, ++n); }
  const listen = new Map(plan.antwortlisten.map(l => [l.id, l]));
  return { el, nr, liste: id => (id ? listen.get(id) : undefined), name: id => el.get(id)?.name ?? id };
}
const bildSicher = (datei: string): boolean => !/^[a-z][a-z0-9+.-]*:/i.test(datei) && !datei.startsWith('//') && !/(^|[\\/])\.\.([\\/]|$)/.test(datei) && !/[\u0000-\u001f"'<>\\]/.test(datei);

type Verknuepfer = { und: string; oder: string; nicht: (inner: string) => string };
/** Bedingungsbaum → Text; zusammengesetzte Teilbedingungen in Klammern, einfache (auch `nicht(...)`) ohne. */
function bedText(b: Bedingung, atom: (x: Exclude<Bedingung, { und: unknown } | { oder: unknown } | { nicht: unknown }>) => string, j: Verknuepfer, oben = true): string {
  if ('und' in b) { const s = b.und.map(x => bedText(x, atom, j, false)).join(j.und); return oben || b.und.length < 2 ? s : `(${s})`; }
  if ('oder' in b) { const s = b.oder.map(x => bedText(x, atom, j, false)).join(j.oder); return oben || b.oder.length < 2 ? s : `(${s})`; }
  if ('nicht' in b) return j.nicht(bedText(b.nicht, atom, j, true));
  return atom(b);
}
const mapIds = (b: Bedingung, f: (id: string) => string): Bedingung => {
  if ('und' in b) return { und: b.und.map(x => mapIds(x, f)) };
  if ('oder' in b) return { oder: b.oder.map(x => mapIds(x, f)) };
  if ('nicht' in b) return { nicht: mapIds(b.nicht, f) };
  return { ...b, frage: f(b.frage) };
};
const htmlMaske = (t: string): string => sauber(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const htmlAttr = (t: string): string => htmlMaske(t).replace(/'/g, '&#39;');

/** Skalen, in denen ein Element (Frage oder Block-Item) vorkommt. */
const skalenVon = (plan: FragebogenPlan, id: string): string[] => plan.skalen.filter(s => s.items.includes(id)).map(s => s.name);

/* ------------------------------------------------------------------ XLSForm */
const sprachName = (c: string): string => `${c === 'de' ? 'Deutsch' : c === 'en' ? 'English' : c} (${c})`;
type Z = Record<string, string>;

/** XLSForm als .xlsx (exceljs). Blätter: survey, choices, settings, statable_skalen. Einleitung, Abschluss und Einstellungen kann XLSForm nicht tragen. */
export async function alsXlsform(plan: FragebogenPlan): Promise<Uint8Array> {
  sperre(plan);
  const ix = indexVon(plan), sp = plan.sprachen;
  const lok = (z: Z, praefix: string, l: Lok | undefined) => { for (const c of sp) { const t = text(l, c); if (t !== '') z[`${praefix}::${sprachName(c)}`] = sauber(t); } };
  const bx = (b: Bedingung): string => bedText(mapIds(b, id => ix.name(id)), x => {
    const n = '${' + x.frage + '}';
    if ('gewaehlt' in x) return `selected(${n}, '${zahlText(x.gewaehlt)}')`;
    if ('beantwortet' in x) return x.beantwortet ? `${n} != ''` : `${n} = ''`;
    return `${n} ${x.ist === '≠' ? '!=' : x.ist === '≤' ? '<=' : x.ist === '≥' ? '>=' : x.ist} ${zahlText(x.wert)}`;
  }, { und: ' and ', oder: ' or ', nicht: s => `not(${s})` });
  const listeName = (id: string | undefined) => ix.liste(id)!.name;

  const survey: Z[] = [];
  const anders = new Map<string, Lok>();
  for (const s of plan.elemente) {
    const g: Z = { type: 'begin_group', name: s.name };
    lok(g, 'label', s.titel);
    if (s.wennGezeigt) g.relevant = bx(s.wennGezeigt);
    survey.push(g);
    for (const e of s.elemente) {
      if (e.art === 'hinweis') {
        const z: Z = { type: 'note', name: e.name }; lok(z, 'label', e.text);
        if (e.wennGezeigt) z.relevant = bx(e.wennGezeigt);
        if (e.bild) { for (const c of sp) { z[`image::${sprachName(c)}`] = sauber(e.bild.datei); } lok(z, 'statable_alt', e.bild.alt); }
        survey.push(z);
      } else if (e.art === 'block') {
        const g2: Z = { type: 'begin_group', name: e.name, appearance: 'field-list', statable_niveau: e.kodebuch.niveau };
        lok(g2, 'label', e.text); lok(g2, 'hint', e.hilfe);
        if (e.wennGezeigt) g2.relevant = bx(e.wennGezeigt);
        if (e.zufall) g2.statable_zufall = 'yes';
        survey.push(g2);
        const lst = listeName(e.liste);
        let kopf = `${e.name}_kopf`; while (e.items.some(i => `${e.name}_${i.name}` === kopf)) kopf += '_';
        const k: Z = { type: `select_one ${lst}`, name: kopf, appearance: 'label' }; lok(k, 'label', e.text); survey.push(k);
        for (const it of e.items) {
          const z: Z = { type: `select_one ${lst}`, name: `${e.name}_${it.name}`, appearance: 'list-nolabel' };
          lok(z, 'label', it.text); lok(z, 'statable_kurz', it.kurz);
          if (e.pflicht) { z.required = 'yes'; lok(z, 'required_message', e.pflicht.meldung); }
          if (it.umgepolt) z.statable_umgepolt = 'yes';
          const sk = skalenVon(plan, it.id); if (sk.length) z.statable_skala = sk.join(',');
          survey.push(z);
        }
        survey.push({ type: 'end_group' });
      } else {
        const z: Z = { name: e.name, type: '' };
        lok(z, 'label', e.text); lok(z, 'hint', e.hilfe);
        const bed: string[] = [];
        let param = '';
        switch (e.typ) {
          case 'einfach': z.type = `select_one ${listeName(e.liste)}`; break;
          case 'mehrfach': z.type = `select_multiple ${listeName(e.liste)}`; break;
          case 'rangfolge': z.type = `rank ${listeName(e.liste)}`; break;
          case 'zahl':
            z.type = e.zahl?.ganz ? 'integer' : 'decimal';
            if (typeof e.zahl?.min === 'number') bed.push(`. >= ${zahlText(e.zahl.min)}`);
            if (typeof e.zahl?.max === 'number') bed.push(`. <= ${zahlText(e.zahl.max)}`);
            break;
          case 'regler': {
            z.type = 'range';
            const p = [`start=${zahlText(e.zahl!.min!)}`, `end=${zahlText(e.zahl!.max!)}`];
            if (typeof e.zahl?.schritt === 'number') p.push(`step=${zahlText(e.zahl.schritt)}`);
            param = p.join(' '); break;
          }
          case 'text':
            z.type = 'text';
            if (e.text_?.mehrzeilig) z.appearance = 'multiline';
            if (typeof e.text_?.maxZeichen === 'number') { bed.push(`string-length(.) <= ${zahlText(e.text_.maxZeichen)}`); z.statable_maxzeichen = zahlText(e.text_.maxZeichen); }
            break;
          case 'datum': z.type = 'date'; break;
          case 'einwilligung': z.type = 'acknowledge'; break;
        }
        if (e.zufall && (e.typ === 'einfach' || e.typ === 'mehrfach' || e.typ === 'rangfolge')) param = [param, 'randomize=true'].filter(Boolean).join(' ');
        if (e.gueltig) {
          const g3 = bx(e.gueltig.regel);
          bed.push(bed.length ? `(${g3})` : g3);
          lok(z, 'constraint_message', e.gueltig.meldung);
          z.statable_gueltig = JSON.stringify({ regel: mapIds(e.gueltig.regel, id => ix.name(id)), meldung: e.gueltig.meldung });
        }
        if (bed.length) z.constraint = bed.join(' and ');
        if (param) z.parameters = param;
        if (e.pflicht) { z.required = 'yes'; lok(z, 'required_message', e.pflicht.meldung); }
        if (e.wennGezeigt) z.relevant = bx(e.wennGezeigt);
        z.statable_niveau = e.kodebuch.niveau;
        if (e.kodebuch.umgepolt) z.statable_umgepolt = 'yes';
        lok(z, 'statable_kurz', e.kurz);
        if (e.zahl?.einheit) lok(z, 'statable_einheit', e.zahl.einheit);
        const sk = skalenVon(plan, e.id); if (sk.length) z.statable_skala = sk.join(',');
        survey.push(z);
        if (e.anders?.an && (e.typ === 'einfach' || e.typ === 'mehrfach')) {
          const a: Z = { type: 'text', name: `${e.name}_anders`, relevant: `selected(\${${e.name}}, 'other')` };
          lok(a, 'label', e.anders.text); survey.push(a);
          if (e.liste && !anders.has(e.liste)) anders.set(e.liste, e.anders.text);
        }
      }
    }
    survey.push({ type: 'end_group' });
  }

  const choices: Z[] = [];
  for (const l of plan.antwortlisten) {
    for (const o of l.optionen) {
      const z: Z = { list_name: l.name, name: zahlText(o.wert) };
      lok(z, 'label', o.text);
      if (o.bild) { for (const c of sp) z[`image::${sprachName(c)}`] = sauber(o.bild.datei); lok(z, 'statable_alt', o.bild.alt); }
      if (o.fehlend) z.statable_fehlend = o.fehlend;
      if (o.ausschliessend) z.statable_ausschliessend = 'yes';
      if (l.geordnet) z.statable_geordnet = 'yes';
      choices.push(z);
    }
    const a = anders.get(l.id);
    if (a) { const z: Z = { list_name: l.name, name: 'other' }; lok(z, 'label', a); choices.push(z); }
  }
  const settings: Z = { form_title: sauber(text(plan.titel, sp[0]!)), form_id: `statable_${plan.id.replace(/[^A-Za-z0-9_-]/g, '')}`, version: zahlText(plan.revision), default_language: sprachName(sp[0]!), statable_plan_id: sauber(plan.id) };
  const skalen: Z[] = plan.skalen.map(s => ({ name: s.name, bildung: s.bildung, mindestens: zahlText(s.mindestens) }));

  const lang = (p: string) => sp.map(c => `${p}::${sprachName(c)}`);
  const blatt = (zeilen: Z[], reihe: string[], immer: string[]) => ({ kopf: reihe.filter(k => immer.includes(k) || zeilen.some(z => z[k] !== undefined)), zeilen });
  const bs = blatt(survey, ['type', 'name', ...lang('label'), ...lang('hint'), 'required', ...lang('required_message'), 'relevant', 'constraint', ...lang('constraint_message'), 'appearance', 'parameters', ...lang('image'), ...lang('statable_alt'), 'statable_niveau', 'statable_umgepolt', 'statable_skala', ...lang('statable_einheit'), ...lang('statable_kurz'), 'statable_maxzeichen', 'statable_zufall', 'statable_gueltig'], ['type', 'name', ...lang('label')]);
  const bc = blatt(choices, ['list_name', 'name', ...lang('label'), ...lang('image'), ...lang('statable_alt'), 'statable_fehlend', 'statable_ausschliessend', 'statable_geordnet'], ['list_name', 'name', ...lang('label')]);
  const bt = blatt([settings], ['form_title', 'form_id', 'version', 'default_language', 'statable_plan_id'], ['form_title', 'form_id', 'version', 'default_language', 'statable_plan_id']);
  const bk = blatt(skalen, ['name', 'bildung', 'mindestens'], ['name', 'bildung', 'mindestens']);

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Statable';
  wb.title = einzeilig(text(plan.titel, sp[0]!));
  // settings kennt nur einen Titel: die Titel aller Sprachen stehen zusätzlich in der Dokumenteigenschaft „Kommentare“ (der Rückweg liest sie dort)
  wb.description = JSON.stringify({ statable: 1, titel: Object.fromEntries(sp.map(c => [c, sauber(text(plan.titel, c))])) });
  for (const [n, b] of [['survey', bs], ['choices', bc], ['settings', bt], ['statable_skalen', bk]] as const) {
    const ws = wb.addWorksheet(n);
    ws.addRow(b.kopf);
    // Zellen sind immer Text (string), nie Formel: ein Text wie =HYPERLINK(…) bleibt Text
    for (const z of b.zeilen) ws.addRow(b.kopf.map(k => (z[k] === undefined ? null : z[k]!)));
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/* ------------------------------------------------------------------ LimeSurvey */
const LS_KOPF = ['id', 'related_id', 'class', 'type/scale', 'name', 'relevance', 'text', 'help', 'language', 'validation', 'mandatory', 'other', 'default', 'same_default', 'exclude_all_others', 'max_num_value_n', 'min_num_value_n', 'num_value_int_only', 'other_replace_text'];
const LS_RESERVIERT = ['id', 'lastpage', 'startlanguage', 'seed', 'token', 'submitdate', 'startdate', 'datestamp', 'ipaddr', 'refurl'];
/** Text für eine Tabellenzelle: Tabulator und Zeilenumbruch als Leerraum, HTML maskiert. */
const lsEin = (t: string) => htmlMaske(einzeilig(t));
/** Mehrzeiliger Text: HTML maskiert, Zeilenumbruch → `<br />`, Tabulator → Leerzeichen. */
const lsText = (t: string) => htmlMaske(sauber(t).replace(/\t/g, ' ')).replace(/\r\n|\r|\n|\u2028|\u2029/g, '<br />');
const lsZelle = (t: string) => (/["\t\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);

/** LimeSurvey „Text-Format für Umfragen“ (Tabulator, UTF-8 ohne BOM) und die Abbildung Element-id → Code im Zielwerkzeug. NICHT MIT LIMESURVEY GEPRÜFT (Gegenprobe am Mac). */
export function alsLimeSurvey(plan: FragebogenPlan): { text: string; namen: Record<string, string> } {
  sperre(plan);
  const ix = indexVon(plan), sp = plan.sprachen;
  const namen: Record<string, string> = {};
  const belegt = new Set(LS_RESERVIERT);
  const frageCode = (name: string): string => {
    let base = name.replace(/[^A-Za-z0-9]/g, ''); if (!/^[A-Za-z]/.test(base)) base = `q${base}`;
    base = base.slice(0, 20);
    let c = base, k = 2;
    while (belegt.has(c.toLowerCase())) { const s = String(k++); c = base.slice(0, 20 - s.length) + s; }
    belegt.add(c.toLowerCase()); return c;
  };
  const teilCode = (name: string, benutzt: Set<string>): string => {
    let base = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 5) || 'x';
    let c = base, k = 2;
    while (benutzt.has(c.toLowerCase())) { const s = String(k++); c = base.slice(0, 5 - s.length) + s; }
    benutzt.add(c.toLowerCase()); return c;
  };
  for (const e of flach(plan)) {
    namen[e.id] = frageCode(e.name);
    if (e.art === 'block') { const b = new Set<string>(); for (const it of e.items) namen[it.id] = teilCode(it.name, b); }
  }
  for (const l of plan.antwortlisten) {
    const b = new Set<string>(); let i = 0;
    for (const o of l.optionen) {
      i++;
      let c = o.wert >= 0 ? String(o.wert) : `M${-o.wert}`;
      if (!/^[A-Za-z0-9]{1,5}$/.test(c) || b.has(c.toLowerCase())) c = teilCode(`O${i}`, b); else b.add(c.toLowerCase());
      namen[o.id] = c;
    }
  }
  const optCode = (l: Antwortliste | undefined, wert: number): string => { const o = l?.optionen.find(x => x.wert === wert); return o ? namen[o.id]! : (wert >= 0 ? String(wert) : `M${-wert}`).replace(/[^A-Za-z0-9]/g, ''); };
  const rel = (b: Bedingung): string => bedText(b, x => {
    const f = ix.el.get(x.frage);
    if (!f) throw new Error('planFehler: Die Bedingung verweist auf eine unbekannte Frage.');
    const c = namen[f.id]!;
    const l = f.art === 'frage' ? ix.liste(f.liste) : undefined;
    const typ = f.art === 'frage' ? f.typ : 'block';
    const sq = (w: number) => `${c}_${typ === 'einwilligung' ? '1' : optCode(l, w)}`;
    if ('beantwortet' in x) {
      if (typ === 'mehrfach' && l) { const s = l.optionen.map(o => `${c}_${namen[o.id]}.NAOK == 'Y'`).join(' || '); return x.beantwortet ? `(${s})` : `!(${s})`; }
      return x.beantwortet ? `!is_empty(${c}.NAOK)` : `is_empty(${c}.NAOK)`;
    }
    if ('gewaehlt' in x) return typ === 'mehrfach' || typ === 'einwilligung' ? `${sq(x.gewaehlt)}.NAOK == 'Y'` : `${c}.NAOK == '${optCode(l, x.gewaehlt)}'`;
    const op = x.ist === '=' ? '==' : x.ist === '≠' ? '!=' : x.ist === '≤' ? '<=' : x.ist === '≥' ? '>=' : x.ist;
    if (typ === 'einwilligung') return `${c}_1.NAOK ${op === '!=' ? '!=' : '=='} 'Y'`;
    if (typ === 'zahl' || typ === 'regler' || (op !== '==' && op !== '!=')) return `${c}.NAOK ${op} ${zahlText(x.wert)}`;
    return `${c}.NAOK ${op} '${optCode(l, x.wert)}'`;
  }, { und: ' && ', oder: ' || ', nicht: s => `!(${s})` });

  const rows: Record<string, string>[] = [];
  const R = (z: Record<string, string>) => rows.push(z);
  R({ class: 'S', name: 'language', text: sp[0]! });
  if (sp.length > 1) R({ class: 'S', name: 'additional_languages', text: sp.slice(1).join(' ') });
  R({ class: 'S', name: 'format', text: 'G' });
  R({ class: 'S', name: 'showprogress', text: plan.einstellungen.fortschritt ? 'Y' : 'N' });
  R({ class: 'S', name: 'allowprev', text: plan.einstellungen.zurueck ? 'Y' : 'N' });
  for (const c of sp) {
    R({ class: 'SL', name: 'surveyls_title', text: lsEin(text(plan.titel, c)), language: c });
    if (text(plan.einleitung, c)) R({ class: 'SL', name: 'surveyls_welcometext', text: lsText(text(plan.einleitung, c)), language: c });
    if (text(plan.abschluss, c)) R({ class: 'SL', name: 'surveyls_endtext', text: lsText(text(plan.abschluss, c)), language: c });
  }
  for (const c of sp) {
    for (const s of plan.elemente) {
      R({ class: 'G', name: lsEin(text(s.titel, c) || s.name), relevance: s.wennGezeigt ? rel(s.wennGezeigt) : '', language: c });
      for (const e of s.elemente) {
        const q = (typ: string, extra: Record<string, string> = {}) => R({ class: 'Q', 'type/scale': typ, name: namen[e.id]!, relevance: e.wennGezeigt ? rel(e.wennGezeigt) : '', text: lsText(text(e.text, c)), help: '', language: c, ...extra });
        if (e.art === 'hinweis') {
          let t = lsText(text(e.text, c));
          if (e.bild && bildSicher(e.bild.datei)) t += `<br /><img src='${htmlAttr(e.bild.datei)}' alt='${htmlAttr(text(e.bild.alt, c))}' />`;
          R({ class: 'Q', 'type/scale': 'X', name: namen[e.id]!, relevance: e.wennGezeigt ? rel(e.wennGezeigt) : '', text: t, language: c });
        } else if (e.art === 'block') {
          q('F', { help: e.hilfe ? lsText(text(e.hilfe, c)) : '', mandatory: e.pflicht ? 'Y' : '', ...(e.zufall ? { random_order: '1' } : {}) });
          for (const it of e.items) R({ class: 'SQ', 'type/scale': '0', name: namen[it.id]!, text: lsText(text(it.text, c)), language: c });
          for (const o of ix.liste(e.liste)!.optionen) R({ class: 'A', 'type/scale': '0', name: namen[o.id]!, text: lsText(text(o.text, c)), language: c });
        } else {
          const extra: Record<string, string> = { mandatory: e.pflicht ? 'Y' : '' };
          let hilfe = e.hilfe ? lsText(text(e.hilfe, c)) : '';
          const einheit = e.zahl?.einheit ? lsText(text(e.zahl.einheit, c)) : '';
          if (einheit) hilfe = hilfe ? `${hilfe} (${einheit})` : `(${einheit})`;
          extra.help = hilfe;
          const l = ix.liste(e.liste);
          if (e.anders?.an && (e.typ === 'einfach' || e.typ === 'mehrfach')) { extra.other = 'Y'; extra.other_replace_text = lsEin(text(e.anders.text, c)); }
          if (e.zufall) extra.random_order = '1';
          if (e.gueltig) { extra.em_validation_q = rel(e.gueltig.regel); extra.em_validation_q_tip = lsText(text(e.gueltig.meldung, c)); }
          switch (e.typ) {
            case 'einfach':
              q('L', extra);
              for (const o of l!.optionen) R({ class: 'A', 'type/scale': '0', name: namen[o.id]!, text: lsText(text(o.text, c)), language: c });
              break;
            case 'mehrfach': {
              const aus = l!.optionen.find(o => o.ausschliessend);
              q('M', { ...extra, ...(aus ? { exclude_all_others: namen[aus.id]! } : {}) });
              for (const o of l!.optionen) R({ class: 'SQ', 'type/scale': '0', name: namen[o.id]!, text: lsText(text(o.text, c)), language: c });
              break;
            }
            case 'rangfolge':
              q('R', extra);
              for (const o of l!.optionen) R({ class: 'A', 'type/scale': '0', name: namen[o.id]!, text: lsText(text(o.text, c)), language: c });
              break;
            case 'zahl': case 'regler': {
              const z = e.zahl;
              q('N', { ...extra, ...(typeof z?.max === 'number' ? { max_num_value_n: zahlText(z.max) } : {}), ...(typeof z?.min === 'number' ? { min_num_value_n: zahlText(z.min) } : {}), ...(z?.ganz ? { num_value_int_only: '1' } : {}) });
              break;
            }
            case 'text': q(e.text_?.mehrzeilig ? 'T' : 'S', { ...extra, ...(typeof e.text_?.maxZeichen === 'number' ? { maximum_chars: zahlText(e.text_.maxZeichen) } : {}) }); break;
            case 'datum': q('D', extra); break;
            case 'einwilligung':
              q('M', extra);
              R({ class: 'SQ', 'type/scale': '0', name: '1', text: lsText(text(e.text, c)), language: c });
              break;
          }
        }
      }
    }
  }
  const extras = ['em_validation_q', 'em_validation_q_tip', 'maximum_chars', 'random_order'].filter(k => rows.some(r => r[k] !== undefined));
  const kopf = [...LS_KOPF, ...extras];
  return { text: [kopf, ...rows.map(r => kopf.map(k => lsZelle(r[k] ?? '')))].map(z => z.join('\t')).join('\n') + '\n', namen };
}

/* ------------------------------------------------------------------ SurveyJS */
/** SurveyJS-JSON (Umfrage-Beschreibung für survey-core). Regler als Zahlenfeld; `nicht` als `!( … )` (Doku: Operator `!`/`negate`). */
export function alsSurveyJs(plan: FragebogenPlan): object {
  sperre(plan);
  const ix = indexVon(plan), sp = plan.sprachen;
  const lokO = (l: Lok | undefined, f: (t: string) => string = t => sauber(t)): Record<string, string> => {
    // „default“ gehört in SurveyJS zur Standardsprache Englisch (surveyLocalization.defaultLocale = 'en'); mit Gegenprobe survey-core 3.2.4 belegt (Opus 08.11.)
    const o: Record<string, string> = { default: f(text(l, sp.includes('en') ? 'en' : sp[0]!)) };
    for (const c of sp) if (l && typeof l[c] === 'string') o[c] = f(l[c]!);
    return o;
  };
  const vis = (b: Bedingung): string => bedText(b, x => {
    const n = `{${ix.name(x.frage)}}`;
    const f = ix.el.get(x.frage);
    if ('gewaehlt' in x) return f && f.art === 'frage' && f.typ === 'mehrfach' ? `${n} contains ${zahlText(x.gewaehlt)}` : `${n} = ${zahlText(x.gewaehlt)}`;
    if ('beantwortet' in x) return `${n} ${x.beantwortet ? 'notempty' : 'empty'}`;
    return `${n} ${x.ist === '≠' ? '!=' : x.ist === '≤' ? '<=' : x.ist === '≥' ? '>=' : x.ist} ${zahlText(x.wert)}`;
  }, { und: ' and ', oder: ' or ', nicht: s => `!(${s})` });
  const wahlen = (l: Antwortliste | undefined, ohne?: Set<number>) => (l?.optionen ?? []).filter(o => !ohne?.has(o.wert)).map(o => ({ value: o.wert, text: lokO(o.text) }));

  const pages = plan.elemente.map((s: Seite) => ({
    name: s.name,
    ...(s.titel ? { title: lokO(s.titel) } : {}),
    ...(s.wennGezeigt ? { visibleIf: vis(s.wennGezeigt) } : {}),
    elements: s.elemente.map(e => {
      const gemeinsam: Record<string, unknown> = {};
      if (e.wennGezeigt) gemeinsam.visibleIf = vis(e.wennGezeigt);
      if (e.art === 'hinweis') {
        if (e.bild && bildSicher(e.bild.datei)) return { type: 'image', name: e.name, title: lokO(e.text), imageLink: e.bild.datei, altText: lokO(e.bild.alt), ...gemeinsam };
        return { type: 'html', name: e.name, html: lokO(e.text, htmlMaske), ...gemeinsam };
      }
      const hilfeEinheit = (h: Lok | undefined, einheit: Lok | undefined): Lok | undefined => {
        if (!einheit) return h;
        const o: Lok = {};
        for (const c of sp) { const a = text(h, c), u = text(einheit, c); if (a || u) o[c] = a && u ? `${a} (${u})` : a || `(${u})`; }
        return o;
      };
      const pflicht = e.pflicht ? { isRequired: true, ...(e.pflicht.meldung ? { requiredErrorText: lokO(e.pflicht.meldung) } : {}) } : {};
      if (e.art === 'block') {
        return {
          type: 'matrix', name: e.name, title: lokO(e.text), ...(e.hilfe ? { description: lokO(e.hilfe) } : {}),
          columns: wahlen(ix.liste(e.liste)), rows: e.items.map(it => ({ value: it.name, text: lokO(it.text) })),
          ...pflicht, ...(e.pflicht ? { eachRowRequired: true } : {}), ...(e.zufall ? { rowOrder: 'random' } : {}), ...gemeinsam
        };
      }
      const l = ix.liste(e.liste);
      const basis: Record<string, unknown> = { name: e.name, title: lokO(e.text) };
      const hilfe = hilfeEinheit(e.hilfe, e.zahl?.einheit);
      if (hilfe) basis.description = lokO(hilfe);
      const g = e.gueltig ? { validators: [{ type: 'expression', expression: vis(e.gueltig.regel), text: lokO(e.gueltig.meldung) }] } : {};
      const zuf = e.zufall ? { choicesOrder: 'random' } : {};
      const anders = e.anders?.an ? { showOtherItem: true, otherText: lokO(e.anders.text) } : {};
      switch (e.typ) {
        case 'einfach': return { type: 'radiogroup', ...basis, ...pflicht, choices: wahlen(l), ...anders, ...zuf, ...g, ...gemeinsam };
        case 'rangfolge': return { type: 'ranking', ...basis, ...pflicht, choices: wahlen(l), ...zuf, ...g, ...gemeinsam };
        case 'mehrfach': {
          const aus = l?.optionen.find(o => o.ausschliessend);
          return { type: 'checkbox', ...basis, ...pflicht, choices: wahlen(l, aus ? new Set([aus.wert]) : undefined), ...(aus ? { showNoneItem: true, noneText: lokO(aus.text) } : {}), ...anders, ...zuf, ...g, ...gemeinsam };
        }
        case 'einwilligung': return { type: 'checkbox', ...basis, ...pflicht, choices: [{ value: 1, text: lokO(e.text) }], ...g, ...gemeinsam };
        case 'zahl': case 'regler': {
          const z = e.zahl;
          const schritt = typeof z?.schritt === 'number' ? z.schritt : z?.ganz ? 1 : undefined;
          return { type: 'text', ...basis, ...pflicht, inputType: 'number', ...(typeof z?.min === 'number' ? { min: z.min } : {}), ...(typeof z?.max === 'number' ? { max: z.max } : {}), ...(schritt !== undefined ? { step: schritt } : {}), ...g, ...gemeinsam };
        }
        case 'datum': return { type: 'text', ...basis, ...pflicht, inputType: 'date', ...g, ...gemeinsam };
        case 'text': return { type: e.text_?.mehrzeilig ? 'comment' : 'text', ...basis, ...pflicht, ...(typeof e.text_?.maxZeichen === 'number' ? { maxLength: e.text_.maxZeichen } : {}), ...g, ...gemeinsam };
      }
    })
  }));
  return {
    title: lokO(plan.titel),
    ...(plan.einleitung ? { description: lokO(plan.einleitung) } : {}),
    ...(plan.abschluss ? { completedHtml: lokO(plan.abschluss, htmlMaske) } : {}),
    locale: sp[0]!,
    showProgressBar: plan.einstellungen.fortschritt ? 'top' : 'off',
    ...(plan.einstellungen.fortschritt ? { progressBarType: 'pages' } : {}),
    showPrevButton: plan.einstellungen.zurueck,
    pages
  };
}

/* ------------------------------------------------------------------ PSPP-Syntax */
interface Abgeleitet {
  umpol: { name: string; von: PlanVariable; label: string; min: number; max: number }[];
  skalen: { name: string; bildung: 'mittelwert' | 'summe'; mindestens: number; items: string[]; label: string; auslassen: string[] }[];
}
/** Umgepolte Kopien (`<name>_u`) und Skalenwerte; gemeinsam für PSPP-Syntax und Kodebuch. */
function abgeleitet(plan: FragebogenPlan, sprache: string): Abgeleitet {
  const d = /^de/i.test(sprache);
  const vars = variablenAusPlan(plan, sprache);
  const belegt = new Set(vars.map(v => v.name.toLowerCase()));
  for (const s of plan.skalen) belegt.add(s.name.toLowerCase());
  const umpol: Abgeleitet['umpol'] = [], skalen: Abgeleitet['skalen'] = [];
  const kopie = new Map<string, string>();
  const info = (id: string): { v: PlanVariable; umgepolt: boolean; bereich: [number, number] | null } | null => {
    for (const e of flach(plan)) {
      if (e.art === 'block') {
        const it = e.items.find(i => i.id === id);
        if (!it) continue;
        const v = vars.find(x => x.quelle.element === e.id && x.quelle.item === id);
        const w = (plan.antwortlisten.find(l => l.id === e.liste)?.optionen ?? []).filter(o => !o.fehlend).map(o => o.wert);
        return v ? { v, umgepolt: !!it.umgepolt, bereich: w.length ? [Math.min(...w), Math.max(...w)] : null } : null;
      }
      if (e.art === 'frage' && e.id === id) {
        const v = vars.find(x => x.quelle.element === id && !x.quelle.option && !x.quelle.teil && !x.quelle.item);
        let bereich: [number, number] | null = null;
        if (e.typ === 'einfach') { const w = (plan.antwortlisten.find(l => l.id === e.liste)?.optionen ?? []).filter(o => !o.fehlend).map(o => o.wert); if (w.length) bereich = [Math.min(...w), Math.max(...w)]; }
        else if ((e.typ === 'zahl' || e.typ === 'regler') && typeof e.zahl?.min === 'number' && typeof e.zahl.max === 'number') bereich = [e.zahl.min, e.zahl.max];
        return v ? { v, umgepolt: !!e.kodebuch.umgepolt, bereich } : null;
      }
    }
    return null;
  };
  for (const s of plan.skalen) {
    const namen: string[] = [], auslassen: string[] = [];
    for (const id of s.items) {
      const x = info(id);
      if (!x) { auslassen.push(id); continue; }
      let n = x.v.name;
      if (x.umgepolt) {
        if (!x.bereich) auslassen.push(`${n} (${d ? 'Umpolung nicht möglich: Wertebereich unbekannt' : 'reversal not possible: range unknown'})`);
        else {
          let u = kopie.get(n);
          if (!u) {
            u = `${n}_u`; let k = 2;
            while (belegt.has(u.toLowerCase())) u = `${n}_u${k++}`;
            belegt.add(u.toLowerCase()); kopie.set(n, u);
            umpol.push({ name: u, von: x.v, label: `${x.v.label ?? n} ${d ? '(umgepolt)' : '(reversed)'}`, min: x.bereich[0], max: x.bereich[1] });
          }
          n = u;
        }
      }
      namen.push(n);
    }
    skalen.push({ name: s.name, bildung: s.bildung, mindestens: s.mindestens, items: namen, auslassen, label: d ? `Skala ${s.name} (${s.bildung === 'summe' ? 'Summe' : 'Mittelwert'})` : `Scale ${s.name} (${s.bildung === 'summe' ? 'sum' : 'mean'})` });
  }
  return { umpol, skalen };
}

const NIVEAU_PSPP = { nominal: 'NOMINAL', ordinal: 'ORDINAL', skala: 'SCALE' } as const;
/**
 * PSPP-Syntax zum Plan (Sprache `plan.sprachen[0]`): setzt voraus, dass die Spalten aus `variablenAusPlan` schon da sind (Datum als ISO-Text mit SDATE10 gelesen).
 * Jeder Text läuft über `zit`, die Kommentarzeile über `pk`; Namen sind geprüft. Mit `mrsets: true` kommen die Mehrfachantworten-Sets (`MRSETS /MDGROUP`) dazu
 * (PSPP legt sie an, wertet sie aber noch in keinem Befehl aus; darum nur auf Wunsch).
 */
export function alsPsppSyntax(plan: FragebogenPlan, opt: { mrsets?: boolean } = {}): string {
  sperre(plan);
  const sprache = plan.sprachen[0]!;
  const d = /^de/i.test(sprache);
  const vars = variablenAusPlan(plan, sprache);
  const z: string[] = [];
  const rev = Number.isInteger(plan.revision) ? plan.revision : 0;
  z.push(d ? `* Statable: Syntax zum Fragebogen ${pk(text(plan.titel, sprache))} (Revision ${pk(String(rev), 12)}, Sprache ${pk(sprache, 12)}).` : `* Statable: syntax for the questionnaire ${pk(text(plan.titel, sprache))} (revision ${pk(String(rev), 12)}, language ${pk(sprache, 12)}).`);
  for (const v of vars) if (v.label) z.push(`VARIABLE LABELS ${v.name} ${zit(v.label, 250)}.`);
  for (const v of vars) {
    const w = Object.entries(v.werteLabels ?? {}).filter(([k, t]) => Number.isFinite(Number(k)) && t !== '').sort((a, b) => Number(a[0]) - Number(b[0]));
    if (w.length) z.push(`VALUE LABELS ${v.name} ${w.map(([k, t]) => `${String(Number(k))} ${zit(t, 120)}`).join(' ')}.`);
  }
  for (const v of vars) {
    const f = [...(v.fehlend ?? [])].filter((x): x is number => Number.isFinite(x)).sort((a, b) => a - b);
    if (f.length) z.push(`MISSING VALUES ${v.name} (${f.map(String).join(', ')}).`);
  }
  for (const v of vars) if (v.niveau) z.push(`VARIABLE LEVEL ${v.name} (${NIVEAU_PSPP[v.niveau]}).`);
  for (const v of vars) if (v.typ === 'datum') z.push(`FORMATS ${v.name} (DATE11).`);
  if (opt.mrsets) {
    for (const e of flach(plan)) {
      if (e.art !== 'frage' || e.typ !== 'mehrfach') continue;
      const m = vars.filter(v => v.quelle.element === e.id && v.quelle.option);
      if (m.length) z.push(`MRSETS /MDGROUP NAME=$${e.name} VARIABLES=${m.map(v => v.name).join(' ')} VALUE=1 LABEL=${zit(text(e.text, sprache), 120)}.`);
    }
  }
  const a = abgeleitet(plan, sprache);
  for (const u of a.umpol) {
    z.push(`COMPUTE ${u.name} = (${zahlText(u.min)} + ${zahlText(u.max)}) - ${u.von.name}.`);
    z.push(`VARIABLE LABELS ${u.name} ${zit(u.label, 250)}.`);
    if (u.von.niveau) z.push(`VARIABLE LEVEL ${u.name} (${NIVEAU_PSPP[u.von.niveau]}).`);
  }
  for (const s of a.skalen) {
    for (const x of s.auslassen) z.push(`* ${pk(d ? `Skala ${s.name}: ${x} bleibt außen vor.` : `Scale ${s.name}: ${x} is left out.`)}.`);
    if (!s.items.length) continue;
    z.push(`COMPUTE ${s.name} = ${s.bildung === 'summe' ? 'SUM' : 'MEAN'}.${s.mindestens}(${s.items.join(', ')}).`);
    z.push(`VARIABLE LABELS ${s.name} ${zit(s.label, 250)}.`);
    z.push(`VARIABLE LEVEL ${s.name} (SCALE).`);
  }
  z.push('EXECUTE.');
  return z.join('\n') + '\n';
}

/* ------------------------------------------------------------------ Modell für Word und HTML (lesbare Fassungen) */
export const worte = (sprache: string) => {
  const d = /^de/i.test(sprache);
  const q = (t: string) => (d ? `„${t}“` : `“${t}”`);
  return {
    d, q,
    kodebuch: d ? 'Kodebuch' : 'Codebook',
    stand: (rev: number, sp: string) => (d ? `Revision ${rev} · Sprache ${sp}` : `Revision ${rev} · language ${sp}`),
    atomIst: (nr: number, op: string, v: string) => (d ? `Frage ${nr} ${op} ${v}` : `question ${nr} ${op} ${v}`),
    atomGew: (nr: number, v: string) => (d ? `in Frage ${nr} ist ${q(v)} angekreuzt` : `${q(v)} is ticked in question ${nr}`),
    atomBea: (nr: number, ja: boolean) => (d ? `Frage ${nr} ist ${ja ? '' : 'nicht '}beantwortet` : `question ${nr} is ${ja ? '' : 'not '}answered`),
    ver: { und: d ? ' und ' : ' and ', oder: d ? ' oder ' : ' or ', nicht: (s: string) => (d ? `nicht (${s})` : `not (${s})`) },
    nurFrage: (s: string) => (d ? `Nur beantworten, wenn ${s}.` : `Answer only if ${s}.`),
    nurSeite: (s: string) => (d ? `Dieser Abschnitt ist nur auszufüllen, wenn ${s}.` : `Fill in this section only if ${s}.`),
    wenn: (s: string) => (d ? `wenn ${s}` : `if ${s}`),
    pflicht: d ? 'Pflichtfrage' : 'Required question',
    mehrere: d ? 'Mehrere Antworten möglich.' : 'Multiple answers possible.',
    rang: (n: number) => (d ? `Bitte die Rangplätze 1 bis ${n} eintragen.` : `Please enter the ranks 1 to ${n}.`),
    antwort: d ? 'Antwort:' : 'Answer:',
    datum: d ? 'Datum (TT.MM.JJJJ):' : 'Date (DD/MM/YYYY):',
    aussage: d ? 'Aussage' : 'Statement',
    zugestimmt: d ? 'Zugestimmt' : 'Agreed',
    bild: (datei: string, alt: string) => (d ? `Bild ${q(datei)}: ${alt}` : `Image ${q(datei)}: ${alt}`),
    anderes: d ? 'Anderes' : 'Other',
    zahl: (min: number | undefined, max: number | undefined, ganz: boolean, einheit: string) => {
      const b = typeof min === 'number' && typeof max === 'number' ? (d ? `Zahl von ${min} bis ${max}` : `Number from ${min} to ${max}`)
        : typeof min === 'number' ? (d ? `Zahl ab ${min}` : `Number from ${min}`) : typeof max === 'number' ? (d ? `Zahl bis ${max}` : `Number up to ${max}`) : (d ? 'Zahl' : 'Number');
      return `${b}${ganz ? (d ? ', ganze Zahl' : ', whole number') : ''}${einheit ? (d ? `, Einheit: ${einheit}` : `, unit: ${einheit}`) : ''}`;
    },
    niveau: { nominal: 'nominal', ordinal: 'ordinal', skala: d ? 'Skala' : 'scale' } as Record<string, string>,
    ende: d ? 'Ende des Fragebogens.' : 'End of the questionnaire.'
  };
};
type Worte = ReturnType<typeof worte>;

export type Antwort =
  | { art: 'optionen'; zeilen: string[]; hinweis?: string }
  | { art: 'tabelle'; kopf: string[]; zeilen: string[][] }
  | { art: 'linien'; zeilen: string[] };
export interface MFrage { art: 'frage'; nr: number; text: string; hilfe?: string; pflicht: boolean; filter?: string; antwort: Antwort }
export interface MHinweis { art: 'hinweis'; text: string; bild?: { datei: string; alt: string }; filter?: string }
export interface MSeite { titel?: string; filter?: string; inhalt: (MFrage | MHinweis)[] }
export interface Modell { titel: string; einleitung?: string; abschluss?: string; seiten: MSeite[]; sprache: string; w: Worte }

/** Der Filtersatz einer Bedingung („Frage 4 = „Ja““ …); `satz` bildet den ganzen Satz bzw. Teilsatz. */
export function filterTeil(plan: FragebogenPlan, ix: Ix, sprache: string, codes: boolean, b: Bedingung): string {
  const w = worte(sprache);
  return bedText(b, x => {
    const f = ix.el.get(x.frage);
    const nr = ix.nr.get(x.frage) ?? 0;
    const l = f && f.art === 'frage' ? ix.liste(f.liste) : undefined;
    const opt = (wert: number) => { const o = l?.optionen.find(y => y.wert === wert); return o ? `${text(o.text, sprache)}${codes ? ` (${wert})` : ''}` : null; };
    if ('beantwortet' in x) return w.atomBea(nr, x.beantwortet);
    if ('gewaehlt' in x) return w.atomGew(nr, opt(x.gewaehlt) ?? String(x.gewaehlt));
    const o = x.ist === '=' || x.ist === '≠' ? opt(x.wert) : null;
    return w.atomIst(nr, x.ist, o !== null ? w.q(o) : String(x.wert));
  }, w.ver);
}

export function modellVon(plan: FragebogenPlan, sprache: string, codes: boolean): Modell {
  const ix = indexVon(plan), w = worte(sprache);
  const opt = (o: { text: Lok; wert: number }) => `${text(o.text, sprache)}${codes ? ` (${o.wert})` : ''}`;
  const filter = (b: Bedingung | undefined, satz: (s: string) => string) => (b ? satz(filterTeil(plan, ix, sprache, codes, b)) : undefined);
  const seiten: MSeite[] = plan.elemente.map(s => ({
    ...(text(s.titel, sprache) ? { titel: text(s.titel, sprache) } : {}),
    ...(s.wennGezeigt ? { filter: filter(s.wennGezeigt, w.nurSeite)! } : {}),
    inhalt: s.elemente.map((e): MFrage | MHinweis => {
      const f = filter(e.wennGezeigt, w.nurFrage);
      if (e.art === 'hinweis') return { art: 'hinweis', text: text(e.text, sprache), ...(e.bild ? { bild: { datei: e.bild.datei, alt: text(e.bild.alt, sprache) } } : {}), ...(f ? { filter: f } : {}) };
      const nr = ix.nr.get(e.id)!;
      const kopf = { art: 'frage' as const, nr, text: text(e.text, sprache), pflicht: !!e.pflicht, ...(f ? { filter: f } : {}) };
      const h = text(e.hilfe, sprache) || undefined;
      if (e.art === 'block') {
        const l = ix.liste(e.liste)!;
        return { ...kopf, ...(h ? { hilfe: h } : {}), antwort: { art: 'tabelle', kopf: [w.aussage, ...l.optionen.map(opt)], zeilen: e.items.map(it => [text(it.text, sprache), ...l.optionen.map(() => '☐')]) } };
      }
      const l = ix.liste(e.liste);
      const anders = e.anders?.an ? [`☐ ${text(e.anders.text, sprache)} ______`] : [];
      switch (e.typ) {
        case 'einfach': return { ...kopf, ...(h ? { hilfe: h } : {}), antwort: { art: 'optionen', zeilen: [...l!.optionen.map(o => `☐ ${opt(o)}`), ...anders] } };
        case 'mehrfach': return { ...kopf, ...(h ? { hilfe: h } : {}), antwort: { art: 'optionen', hinweis: w.mehrere, zeilen: [...l!.optionen.map(o => `☐ ${opt(o)}`), ...anders] } };
        case 'rangfolge': return { ...kopf, ...(h ? { hilfe: h } : {}), antwort: { art: 'optionen', hinweis: w.rang(l!.optionen.length), zeilen: l!.optionen.map(o => `___ ${opt(o)}`) } };
        case 'einwilligung': return { ...kopf, ...(h ? { hilfe: h } : {}), antwort: { art: 'optionen', zeilen: [`☐ ${w.zugestimmt}${codes ? ' (1)' : ''}`] } };
        case 'zahl': case 'regler': return { ...kopf, ...(h ? { hilfe: h } : {}), antwort: { art: 'linien', zeilen: [`${w.antwort} ______ (${w.zahl(e.zahl?.min, e.zahl?.max, !!e.zahl?.ganz, text(e.zahl?.einheit, sprache))})`] } };
        case 'datum': return { ...kopf, ...(h ? { hilfe: h } : {}), antwort: { art: 'linien', zeilen: [`${w.datum} ______`] } };
        case 'text': return { ...kopf, ...(h ? { hilfe: h } : {}), antwort: { art: 'linien', zeilen: e.text_?.mehrzeilig ? [`${w.antwort}`, '______________________________', '______________________________', '______________________________'] : [`${w.antwort} ______________________________`] } };
      }
    })
  }));
  return { titel: text(plan.titel, sprache), ...(text(plan.einleitung, sprache) ? { einleitung: text(plan.einleitung, sprache) } : {}), ...(text(plan.abschluss, sprache) ? { abschluss: text(plan.abschluss, sprache) } : {}), seiten, sprache, w };
}

/* ------------------------------------------------------------------ Word */
type Docx = typeof import('docx');
async function wordBasis(D: Docx, sprache: string) {
  const { wordStile } = await import('./export');
  const s = wordStile(D);
  return { ...s, default: { ...s.default, document: { run: { ...s.default.document.run, language: { value: sprache } } } } };
}
/** `ohnePruefung` setzt `w:noProof`: Word prüft den Lauf nicht (Variablennamen, Codes und Antwortzeilen sind keine Fließtexte; sonst sagen Screenreader bei jeder Zeile „Rechtschreibfehler“). */
const lauf = (D: Docx, t: string, o: { bold?: boolean; italics?: boolean; size?: number; ohnePruefung?: boolean } = {}) => new D.TextRun({ text: einzeilig(t), font: 'Arial', size: o.size ?? 22, bold: o.bold, italics: o.italics, ...(o.ohnePruefung ? { noProof: true } : {}) });
const absatz = (D: Docx, t: string, o: { bold?: boolean; italics?: boolean; size?: number; links?: number; keepNext?: boolean; vor?: number; ohnePruefung?: boolean } = {}) =>
  new D.Paragraph({ keepNext: o.keepNext, indent: o.links ? { left: o.links } : undefined, spacing: { before: o.vor ?? 0, after: 80, line: 300 }, children: [lauf(D, t, o)] });
const ueberschrift = (D: Docx, t: string, ebene: 'TITLE' | 'HEADING_1' | 'HEADING_2', ohnePruefung = false) => new D.Paragraph({ heading: D.HeadingLevel[ebene], children: [lauf(D, t, { bold: true, size: ebene === 'TITLE' ? 32 : ebene === 'HEADING_1' ? 26 : 23, ohnePruefung })] });
/** Echte Tabelle: Kopfzeile als solche markiert, erste Spalte als Zeilenkopf. */
function tafel(D: Docx, kopf: string[], zeilen: string[][], groesse = 20, ohnePruefung: number[] = []) {
  const zelle = (t: string, fett: boolean, ohne = false) => new D.TableCell({ children: sauber(t).split(/\r?\n/).map(l => new D.Paragraph({ children: [new D.TextRun({ text: l, font: 'Arial', size: groesse, bold: fett, ...(ohne ? { noProof: true } : {}) })] })) });
  return new D.Table({
    width: { size: 100, type: D.WidthType.PERCENTAGE },
    tableLook: { firstRow: true, firstColumn: true, noHBand: true, noVBand: true },
    rows: [new D.TableRow({ tableHeader: true, cantSplit: true, children: kopf.map(k => zelle(k, true)) }), ...zeilen.map(z => new D.TableRow({ cantSplit: true, children: z.map((t, i) => zelle(t, i === 0, ohnePruefung.includes(i))) }))]
  });
}
const alsBytes = async (D: Docx, doc: InstanceType<Docx['Document']>) => new Uint8Array(await D.Packer.toArrayBuffer(doc));

/** Lesbare Fassung zum Ausdrucken und Weitergeben: Überschrift je Seite, Fragen nummeriert, Optionen mit „☐“ (und Code), Filter als Satz. */
export async function fragebogenWord(plan: FragebogenPlan, opts: { sprache?: string; codes?: boolean } = {}): Promise<Uint8Array> {
  sperre(plan);
  const sprache = sprachWahl(plan, opts.sprache), m = modellVon(plan, sprache, opts.codes !== false);
  const D = await import('docx');
  const k: (InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>)[] = [ueberschrift(D, m.titel, 'TITLE')];
  if (m.einleitung) for (const t of m.einleitung.split(/\r?\n+/).filter(x => x.trim())) k.push(absatz(D, t));
  for (const s of m.seiten) {
    if (s.titel) k.push(ueberschrift(D, s.titel, 'HEADING_1'));
    if (s.filter) k.push(absatz(D, s.filter, { italics: true, size: 20 }));
    for (const e of s.inhalt) {
      if (e.art === 'hinweis') {
        if (e.filter) k.push(absatz(D, e.filter, { italics: true, size: 20, keepNext: true }));
        if (e.text) k.push(absatz(D, e.text));
        if (e.bild) k.push(absatz(D, m.w.bild(e.bild.datei, e.bild.alt), { italics: true, size: 20 }));
        continue;
      }
      k.push(absatz(D, `${e.nr}. ${e.text}`, { bold: true, keepNext: true, vor: 200 }));
      if (e.filter) k.push(absatz(D, e.filter, { italics: true, size: 20, keepNext: true }));
      if (e.hilfe) k.push(absatz(D, e.hilfe, { italics: true, size: 20, keepNext: true }));
      if (e.pflicht) k.push(absatz(D, m.w.pflicht, { size: 20, keepNext: true }));
      const a = e.antwort;
      if (a.art === 'optionen') { if (a.hinweis) k.push(absatz(D, a.hinweis, { size: 20, keepNext: true })); for (const z of a.zeilen) k.push(absatz(D, z, { links: 360, ohnePruefung: true })); }
      else if (a.art === 'linien') for (const z of a.zeilen) k.push(absatz(D, z, { links: 360 }));
      else k.push(tafel(D, a.kopf, a.zeilen));
    }
  }
  k.push(absatz(D, m.abschluss ?? m.w.ende, { italics: true, vor: 200 }));
  const doc = new D.Document({ creator: 'Statable', title: einzeilig(m.titel), styles: await wordBasis(D, sprache), sections: [{ children: k }] });
  return alsBytes(D, doc);
}

/** Kodebuch: je Variable Name, Beschriftung, Fragetext, Werte, Fehlend, Messniveau und Filter; dazu die berechneten Variablen (Umpolung, Skalen). */
export async function kodebuchWord(plan: FragebogenPlan, sprache?: string): Promise<Uint8Array> {
  sperre(plan);
  const sp = sprachWahl(plan, sprache), w = worte(sp), ix = indexVon(plan);
  const vars = variablenAusPlan(plan, sp);
  const seiteVon = new Map<string, Seite>(); for (const s of plan.elemente) for (const e of s.elemente) seiteVon.set(e.id, s);
  const D = await import('docx');
  const zeilen = vars.map(v => {
    const e = ix.el.get(v.quelle.element);
    let frage = e ? text(e.text, sp) : '';
    if (e && e.art === 'block' && v.quelle.item) frage = `${frage} - ${text(e.items.find(i => i.id === v.quelle.item)?.text, sp)}`;
    const werte = Object.entries(v.werteLabels ?? {}).filter(([k]) => Number.isFinite(Number(k))).sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, t]) => `${Number(k)} = ${t}`);
    const art = werte.length ? werte.join('\n') : v.typ === 'text' ? (w.d ? 'Freitext' : 'free text') : v.typ === 'datum' ? (w.d ? 'Datum (JJJJ-MM-TT)' : 'date (YYYY-MM-DD)') : (w.d ? 'Zahl' : 'number');
    const teile: string[] = [];
    const sd = seiteVon.get(v.quelle.element);
    if (sd?.wennGezeigt) teile.push(filterTeil(plan, ix, sp, true, sd.wennGezeigt));
    if (e?.wennGezeigt) teile.push(filterTeil(plan, ix, sp, true, e.wennGezeigt));
    return [v.name, v.label && v.label.trim() !== frage.trim() ? v.label : (v.label ? (w.d ? '(wie Fragetext)' : '(same as question text)') : ''), frage, art, (v.fehlend ?? []).length ? (v.fehlend ?? []).join(', ') : '-', v.niveau ? w.niveau[v.niveau]! : '-', teile.length ? w.wenn(teile.join(w.ver.und)) : '-'];
  });
  const k: (InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>)[] = [
    ueberschrift(D, `${w.kodebuch} ${text(plan.titel, sp)}`, 'TITLE', true),
    absatz(D, w.stand(Number.isInteger(plan.revision) ? plan.revision : 0, sp), { italics: true, size: 20 }),
    ueberschrift(D, w.d ? 'Variablen' : 'Variables', 'HEADING_1'),
    tafel(D, w.d ? ['Variable', 'Beschriftung', 'Fragetext', 'Werte', 'Fehlend', 'Messniveau', 'Filter'] : ['Variable', 'Label', 'Question text', 'Values', 'Missing', 'Level', 'Filter'], zeilen, 18, [0, 3, 4])
  ];
  const a = abgeleitet(plan, sp);
  if (a.umpol.length || a.skalen.some(s => s.items.length)) {
    const rest: string[][] = [
      ...a.umpol.map(u => [u.name, u.label, w.d ? `(${u.min} + ${u.max}) - ${u.von.name}` : `(${u.min} + ${u.max}) - ${u.von.name}`]),
      ...a.skalen.filter(s => s.items.length).map(s => [s.name, s.label, w.d ? `${s.bildung === 'summe' ? 'Summe' : 'Mittelwert'} aus ${s.items.join(', ')} (mindestens ${s.mindestens} gültige Werte)` : `${s.bildung === 'summe' ? 'Sum' : 'Mean'} of ${s.items.join(', ')} (at least ${s.mindestens} valid values)`])
    ];
    k.push(ueberschrift(D, w.d ? 'Berechnete Variablen' : 'Computed variables', 'HEADING_1'), tafel(D, w.d ? ['Variable', 'Beschriftung', 'Berechnung'] : ['Variable', 'Label', 'Computation'], rest, 18, [0]));
  }
  k.push(absatz(D, w.d ? 'Ende des Kodebuchs.' : 'End of the codebook.', { italics: true, vor: 200 }));
  const doc = new D.Document({ creator: 'Statable', title: einzeilig(`${w.kodebuch} ${text(plan.titel, sp)}`), styles: await wordBasis(D, sp), sections: [{ properties: { page: { size: { orientation: D.PageOrientation.LANDSCAPE } } }, children: k }] });
  return alsBytes(D, doc);
}

/** Einmal-Codes (Paket 3D) als Word: eine Zeile je Code zum Ausschneiden, mit Spalte „Ausgegeben“. */
export async function codesWord(plan: FragebogenPlan, sprache?: string): Promise<Uint8Array> {
  const sp = sprachWahl(plan, sprache), d = sp === 'de';
  const codes = plan.codes ?? [];
  const D = await import('docx');
  const titel = `${d ? 'Einmal-Codes' : 'One-time codes'} ${text(plan.titel, sp)}`;
  const k: (InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>)[] = [
    ueberschrift(D, titel, 'TITLE', true),
    ueberschrift(D, d ? 'Teilnahme-Codes' : 'Participation codes', 'HEADING_1'),
    absatz(D, d ? 'Jede Person bekommt genau einen Code. Zeilen ausschneiden und verteilen. Ohne Server lässt sich doppeltes Ausfüllen nur erkennen, nicht verhindern.' : 'Every person gets exactly one code. Cut out the rows and hand them out. Without a server, filling in twice can only be detected, not prevented.'),
    codes.length
      ? tafel(D, d ? ['Nr.', 'Code', 'Ausgegeben'] : ['No.', 'Code', 'Issued'], codes.map((c, i) => [String(i + 1), c.code, c.ausgegeben ? '☑' : '☐']), 24, [1, 2])
      : absatz(D, d ? 'Es gibt noch keine Codes.' : 'There are no codes yet.', { italics: true })
  ];
  const doc = new D.Document({ creator: 'Statable', title: einzeilig(titel), styles: await wordBasis(D, sp), sections: [{ children: k }] });
  return alsBytes(D, doc);
}

/* ------------------------------------------------------------------ HTML */
/** Eine vollständige HTML-Datei zum Lesen (nicht zum Ausfüllen): lang, title, Überschriften, Listen, Tabellen; kein Skript, alle Texte maskiert. */
export function fragebogenHtml(plan: FragebogenPlan, sprache: string): string {
  sperre(plan);
  const sp = sprachWahl(plan, sprache), m = modellVon(plan, sp, true), e = htmlMaske;
  const absaetze = (t: string) => t.split(/\r?\n+/).filter(x => x.trim()).map(x => `<p>${e(x)}</p>`).join('\n');
  const o: string[] = [];
  o.push(`<h1>${e(m.titel)}</h1>`);
  if (m.einleitung) o.push(absaetze(m.einleitung));
  for (const s of m.seiten) {
    o.push('<section>');
    if (s.titel) o.push(`<h2>${e(s.titel)}</h2>`);
    if (s.filter) o.push(`<p class="filter">${e(s.filter)}</p>`);
    let offen = false;
    const schliesse = () => { if (offen) { o.push('</ol>'); offen = false; } };
    for (const x of s.inhalt) {
      if (x.art === 'hinweis') {
        schliesse();
        if (x.filter) o.push(`<p class="filter">${e(x.filter)}</p>`);
        if (x.text) o.push(`<p>${e(x.text)}</p>`);
        if (x.bild) o.push(bildSicher(x.bild.datei) ? `<p><img src="${e(x.bild.datei)}" alt="${e(x.bild.alt)}"></p>` : `<p class="hilfe">${e(m.w.bild(x.bild.datei, x.bild.alt))}</p>`);
        continue;
      }
      if (!offen) { o.push(`<ol start="${x.nr}">`); offen = true; }
      o.push('<li>', `<p class="frage">${e(x.text)}</p>`);
      if (x.filter) o.push(`<p class="filter">${e(x.filter)}</p>`);
      if (x.hilfe) o.push(`<p class="hilfe">${e(x.hilfe)}</p>`);
      if (x.pflicht) o.push(`<p class="hilfe">${e(m.w.pflicht)}</p>`);
      const a = x.antwort;
      if (a.art === 'optionen') { if (a.hinweis) o.push(`<p class="hilfe">${e(a.hinweis)}</p>`); o.push(`<ul class="optionen">${a.zeilen.map(z => `<li>${e(z)}</li>`).join('')}</ul>`); }
      else if (a.art === 'linien') o.push(a.zeilen.map(z => `<p class="linie">${e(z)}</p>`).join(''));
      else o.push(`<table><caption>${e(x.text)}</caption><thead><tr>${a.kopf.map(kk => `<th scope="col">${e(kk)}</th>`).join('')}</tr></thead><tbody>${a.zeilen.map(z => `<tr>${z.map((c, i) => (i === 0 ? `<th scope="row">${e(c)}</th>` : `<td>${e(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table>`);
      o.push('</li>');
    }
    schliesse();
    o.push('</section>');
  }
  o.push(m.abschluss ? absaetze(m.abschluss) : `<p>${e(m.w.ende)}</p>`);
  const css = 'body{font-family:Arial,Helvetica,sans-serif;color:#1d2530;background:#fff;line-height:1.5;margin:0}main{max-width:46rem;margin:0 auto;padding:1rem}h1{font-size:1.6rem}h2{font-size:1.25rem;margin-top:2rem}li{margin-bottom:1rem}.frage{font-weight:bold;margin:0 0 .25rem}.hilfe,.filter{font-style:italic;color:#3b4552;margin:.25rem 0}.optionen{list-style:none;padding-left:1rem;margin:.25rem 0}.optionen li{margin:.1rem 0}.linie{margin:.25rem 0 .25rem 1rem}table{border-collapse:collapse;margin-top:.5rem}caption{text-align:left;font-weight:normal;position:absolute;left:-10000px}th,td{border:1px solid #6b7480;padding:.35rem .6rem;text-align:left}img{max-width:100%;height:auto}@media print{main{max-width:none}}';
  return `<!doctype html>\n<html lang="${e(sp)}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${e(m.titel)}</title>\n<style>${css}</style>\n</head>\n<body>\n<main>\n${o.join('\n')}\n</main>\n</body>\n</html>\n`;
}
