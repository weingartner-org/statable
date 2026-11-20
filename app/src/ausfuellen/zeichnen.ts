/**
 * Fragetypen-Bibliothek, Zeichnen und Lesen (Paket 2B). Reines TypeScript und DOM.
 * Sicherheit: Text aus dem Plan gelangt nur über Textknoten (`append(string)`, `textContent`) ins DOM, nie über `innerHTML`.
 * Muster: docs/erheben/PRUEFPLAN-BARRIEREFREIHEIT-ERHEBEN.md Abschnitt 4 (native Elemente, fieldset/legend, echte Tabelle am Rechner, Gruppenfolge bei `eng`).
 *
 * Schlüssel der Antworten (zusätzlich zu den Festlegungen im Kopf von ausfuellen.test.ts, Element-id als Schlüssel):
 *   `<frageId>:anders`     Text der Option „Anderes, und zwar“ (nur wenn diese Option gewählt ist; ihr Code ist höchster Code der Liste + 1)
 *   `<frageId>:kommentar`  Pretest-Kommentar (nur im Modus „vorschau“ mit plan.einstellungen.pretest; bei Blöcken einer je Block)
 * Zufall: `optionen.zufallStart` (ganze Zahl) macht die Reihenfolge wiederholbar; ohne ihn wird bei jedem Zeichnen neu gewürfelt.
 * Der Aufrufer sollte den Startwert je Befragtem festhalten, damit die Reihenfolge beim Zurückgehen gleich bleibt.
 */
import { zeigen, type Antworten } from '../lib/fragebogenplan-bedingung';
import type { Antwortliste, Bild, Block, Element as PlanElement, Frage, FragebogenPlan, Option, Seite } from '../lib/fragebogenplan';
import { t } from './texte';
import { STIL } from './stil';
import { andersCode, lok, pruefeSeite, type Modus, type SeitenFehler } from './pruefen';

export interface Optionen {
  sprache: string; eng: boolean; modus: Modus;
  beiAenderung?(antworten: Antworten, frageId: string): void;
  beiWeiter?(antworten: Antworten): void;
  beiZurueck?(): void;
  ansage?(text: string): void;
  bildUrl?(datei: string): string;
  zufallStart?: number;
  /** Modus `eingabe`: Beschriftung des Hauptknopfs (Vorgabe „Weiter“). */
  weiterText?: string;
  /** Modus `eingabe`: Prüfung eines Feldes beim Tippen; liefert den Fehlertext (leer = in Ordnung). `wert` ist die Antwort oder der roh getippte Code. */
  pruefeEingabe?(frageId: string, wert: unknown): string;
}

/* ------------------------------------------------------------------ kleine Hilfen */
type Kind = Node | string | null | undefined | false;
type Attr = Record<string, string | undefined>;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, a: Attr = {}, ...kids: Kind[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a)) if (v !== undefined) e.setAttribute(k, v);
  for (const c of kids) if (c) e.append(c);
  return e;
}
const zahlVon = (s: string): number | null => (s.trim() !== '' && Number.isFinite(Number(s)) ? Number(s) : null);
const hash = (s: string): number => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
function mischen<T>(liste: T[], start: number): T[] {
  let a = start >>> 0;
  const zufall = () => { a = (a + 0x6d2b79f5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const r = [...liste];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(zufall() * (i + 1)); [r[i], r[j]] = [r[j]!, r[i]!]; }
  return r;
}

interface Ctx {
  plan: FragebogenPlan; o: Optionen; sprache: string; start: number;
  tx(k: string, w?: Record<string, string | number>): string;
  lok(l: Record<string, string> | undefined): string;
  id(): string;
  sag(text: string): void;
  /** Wie `sag`, aber erst nach 0,9 s: die Ansage der Auswahl (Option, Zustand) kommt zuerst und wird nicht verdrängt. Eine neuere verspätete Meldung ersetzt die ältere. */
  sagSpaeter(text: string): void;
  geaendert(id: string): void;
  pflicht(el: Frage | Block): boolean;
  /** Modus `eingabe`: ein getippter Code, den es nicht gibt, wird an der Frage gemeldet. */
  codeFehler(id: string, code: string): void;
}
type Vor = Antworten;
const LEERE_LISTE: Antwortliste = { id: '', name: '', geordnet: false, optionen: [] };
const listeVon = (ctx: Ctx, id: string | undefined): Antwortliste => ctx.plan.antwortlisten.find(l => l.id === id) ?? LEERE_LISTE;
/** Optionen in Anzeigefolge: bei `zufall` (nicht bei geordneten Listen) gemischt, „ausschließende“ Optionen bleiben am Ende. */
function ordnung(ctx: Ctx, el: Frage | Block, l: Antwortliste): Option[] {
  if (!el.zufall || l.geordnet) return l.optionen;
  const frei = l.optionen.filter(o => !o.ausschliessend), fest = l.optionen.filter(o => o.ausschliessend);
  return [...mischen(frei, ctx.start + hash(el.id)), ...fest];
}

function bildEl(ctx: Ctx, bild: Bild | undefined): HTMLElement | null {
  if (!bild) return null;
  return h('img', { src: ctx.o.bildUrl ? ctx.o.bildUrl(bild.datei) : bild.datei, alt: ctx.lok(bild.alt) });
}
const pflichtWort = (ctx: Ctx, el: Frage | Block): HTMLElement | null => (ctx.pflicht(el) ? h('span', { class: 'pflicht' }, ` (${ctx.tx('pflicht')})`) : null);
const hilfeEl = (ctx: Ctx, el: Frage | Block): HTMLElement | null => { const x = ctx.lok(el.hilfe); return x ? h('p', { id: ctx.id(), class: 'hilfe' }, x) : null; };
const fehlerPlatz = () => h('div', { 'data-fehlerplatz': '' });

function behaelter(ctx: Ctx, el: Frage | Block, typ: string): HTMLElement {
  return h('div', { 'data-frage': el.id, 'data-typ': typ, id: ctx.id() });
}
/** Pretest: Kommentarfeld je Frage/Block (nur Vorschau mit plan.einstellungen.pretest). */
function kommentarFeld(ctx: Ctx, el: Frage | Block, vor: Vor): HTMLElement | null {
  if (ctx.o.modus !== 'vorschau' || !ctx.plan.einstellungen.pretest) return null;
  const id = ctx.id();
  const ta = h('textarea', { id, rows: '2', 'data-kommentar': '' });
  const v = vor[`${el.id}:kommentar`];
  if (typeof v === 'string') ta.value = v;
  ta.addEventListener('input', () => ctx.geaendert(el.id));
  return h('div', { class: 'kommentar' }, h('label', { for: id }, ctx.tx('kommentar')), ta);
}
/** Frage mit fieldset/legend (einfach, mehrfach, regler, rangfolge, einwilligung). */
function gruppe(ctx: Ctx, el: Frage, vor: Vor, inhalt: Kind[]): { c: HTMLElement; fs: HTMLFieldSetElement; legende: HTMLElement } {
  const c = behaelter(ctx, el, el.typ);
  const hp = hilfeEl(ctx, el);
  const legende = h('legend', { id: ctx.id() }, ctx.lok(el.text), pflichtWort(ctx, el));
  const fs = h('fieldset', { 'aria-describedby': hp?.id }, legende, hp, bildEl(ctx, el.bild), fehlerPlatz(), ...inhalt);
  c.append(fs);
  const k = kommentarFeld(ctx, el, vor); if (k) c.append(k);
  return { c, fs, legende };
}
/**
 * Modus `eingabe` (Papier eingeben): Der Code steht vor der Beschriftung („3 = eher zufrieden“), und das Tippen des Codes wählt die Option
 * (Zifferntasten und „-“ für Fehlendcodes wie -9; mehrstellige Codes mit kurzer Wartezeit, Enter schließt ab). Ein Code, den es nicht gibt, ist ein Fehler an der Frage.
 */
function ziffernEingabe(ctx: Ctx, c: HTMLElement, frageId: string) {
  if (ctx.o.modus !== 'eingabe') return;
  let puffer = '', timer: ReturnType<typeof setTimeout> | undefined, ziel: HTMLInputElement | null = null;
  const gruppe = (z: HTMLInputElement) => Array.from(c.querySelectorAll<HTMLInputElement>(`input[type=${z.type}]`)).filter(i => i.name === z.name);
  const anwenden = () => {
    clearTimeout(timer);
    const text = puffer, z = ziel; puffer = ''; ziel = null;
    if (!z || text === '') return;
    const treffer = /^-?\d+$/.test(text) ? gruppe(z).find(i => i.value === String(Number(text))) : undefined;
    if (!treffer) { ctx.codeFehler(frageId, text); return; }
    if (treffer.type === 'radio') treffer.checked = true; else treffer.checked = !treffer.checked;
    treffer.focus();
    treffer.dispatchEvent(new Event('change', { bubbles: true }));
  };
  c.addEventListener('keydown', e => {
    const z = e.target as HTMLInputElement;
    if (!(z instanceof HTMLInputElement) || (z.type !== 'radio' && z.type !== 'checkbox') || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter') { anwenden(); return; }
    if (!/^[0-9]$/.test(e.key) && e.key !== '-') return;
    e.preventDefault();
    if (ziel && ziel.name !== z.name) anwenden();
    ziel = z; puffer += e.key; clearTimeout(timer);
    const werte = gruppe(z).map(i => i.value);
    const genau = werte.includes(String(Number(puffer))) && /^-?\d+$/.test(puffer);
    const laenger = werte.some(w => w.startsWith(puffer) && w.length > puffer.length);
    if (genau && !laenger) anwenden();
    else if (!laenger && !genau) anwenden();   // kein Code beginnt so: sofort melden
    else timer = setTimeout(anwenden, 700);
  });
}
/** Zeile unter der Frage: der gewählte Code mit seiner Beschriftung („3 = eher zufrieden“); sichtbar und am Feld über aria-describedby, die Ansage ist entprellt (0,6 s). */
function wertelabelZeile(ctx: Ctx, c: HTMLElement, fs: HTMLElement | null): ((text: string) => void) | null {
  if (ctx.o.modus !== 'eingabe' || !fs) return null;
  const p = h('p', { id: ctx.id(), class: 'wertelabel' });
  fs.append(p);
  fs.setAttribute('aria-describedby', [...(fs.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean), p.id].join(' '));
  let timer: ReturnType<typeof setTimeout> | undefined;
  return text => {
    p.textContent = text ? ctx.tx('wertelabel', { text }) : '';
    clearTimeout(timer);
    if (text) timer = setTimeout(() => ctx.sag(ctx.tx('wertelabel', { text })), 600);
  };
}
const wahlText = (c: HTMLElement): string => Array.from(c.querySelectorAll<HTMLInputElement>('input[type=radio]:checked, input[type=checkbox]:checked')).map(i => i.closest('label')?.querySelector('span')?.textContent ?? '').filter(Boolean).join('; ');

function optZeile(ctx: Ctx, art: 'radio' | 'checkbox', name: string, wert: number, text0: string, pos: number, bild: Bild | undefined, an: boolean, extra: Attr = {}) {
  const text = ctx.o.modus === 'eingabe' ? `${wert} = ${text0}` : text0;
  const input = h('input', { type: art, name, value: String(wert), 'data-pos': String(pos), ...extra });
  input.checked = an;
  let label: HTMLLabelElement;
  if (bild) {   // Name aus dem Text allein, das Bild trägt seinen eigenen Alternativtext
    const tid = ctx.id();
    input.setAttribute('aria-labelledby', tid);
    label = h('label', { class: 'opt' }, input, h('span', { id: tid }, text), bildEl(ctx, bild));
  } else label = h('label', { class: 'opt' }, input, h('span', {}, text));
  return { label, input };
}
/** Option „Anderes, und zwar“ mit Textfeld, das nur bei Wahl sichtbar ist. */
function andersZeile(ctx: Ctx, f: Frage, art: 'radio' | 'checkbox', name: string, vor: Vor, an: boolean, pos: number) {
  const text = ctx.lok(f.anders?.text);
  const z = optZeile(ctx, art, name, andersCode(ctx.plan, f), text, pos, undefined, an, { 'data-anders-wahl': '1' });
  const tid = ctx.id();
  const feld = h('input', { type: 'text', id: tid, 'data-anders': '' });
  const v = vor[`${f.id}:anders`]; if (typeof v === 'string') feld.value = v;
  feld.addEventListener('input', () => ctx.geaendert(f.id));
  const kasten = h('div', { class: 'andersfeld' }, h('label', { for: tid }, ctx.tx('andersFeld', { option: text })), feld);
  kasten.hidden = !an;
  // NVDA-Nachmessung Stufe 3 (N1): eine Live-Meldung beim Einblenden verdrängte die Ansage der Option. Darum steht der Hinweis als feste Beschreibung an der Option
  // und wird mit ihr gelesen, schon bevor man sie wählt; keine Live-Meldung mehr.
  const hinweis = h('span', { id: ctx.id(), class: 'nur-vorleser' }, ctx.tx('andersHinweis'));
  kasten.appendChild(hinweis);   // nicht im <label>, sonst gehört der Satz zum Namen der Option; aria-describedby liest auch versteckte Elemente
  z.input.setAttribute('aria-describedby', [z.input.getAttribute('aria-describedby'), hinweis.id].filter(Boolean).join(' '));
  const abgleich = () => { kasten.hidden = !z.input.checked; };
  return { ...z, kasten, abgleich };
}

/* ------------------------------------------------------------------ Fragetypen */
function baueEinfach(ctx: Ctx, f: Frage, vor: Vor): HTMLElement {
  const l = listeVon(ctx, f.liste), name = ctx.id(), v = vor[f.id];
  const zeilen: Node[] = ordnung(ctx, f, l).map((op, i) => {
    const z = optZeile(ctx, 'radio', name, op.wert, ctx.lok(op.text), i, op.bild, v === op.wert);
    if (i === 0 && ctx.pflicht(f)) z.input.setAttribute('aria-required', 'true');   // nur einmal je Gruppe; natives `required` meldet „ungültiger Eintrag“ schon vor der Prüfung
    return z.label;
  });
  let anders: ReturnType<typeof andersZeile> | null = null;
  if (f.anders?.an) {
    anders = andersZeile(ctx, f, 'radio', name, vor, v === andersCode(ctx.plan, f), zeilen.length);
    zeilen.push(anders.label, anders.kasten);
  }
  const { c, fs } = gruppe(ctx, f, vor, [h('div', { class: 'optionen' }, ...zeilen)]);
  const wl = wertelabelZeile(ctx, c, fs);
  ziffernEingabe(ctx, c, f.id);
  fs.addEventListener('change', e => { if ((e.target as HTMLInputElement).type === 'text') return; anders?.abgleich(); wl?.(wahlText(c)); ctx.geaendert(f.id); });
  return c;
}

function baueMehrfach(ctx: Ctx, f: Frage, vor: Vor): HTMLElement {
  const l = listeVon(ctx, f.liste), name = ctx.id(), v = Array.isArray(vor[f.id]) ? (vor[f.id] as number[]) : [];
  const boxen: HTMLInputElement[] = [];
  const zeilen: Node[] = ordnung(ctx, f, l).map((op, i) => {
    const z = optZeile(ctx, 'checkbox', name, op.wert, ctx.lok(op.text), l.optionen.indexOf(op), op.bild, v.includes(op.wert), op.ausschliessend ? { 'data-ausschliessend': '1' } : {});
    if (i === 0 && ctx.pflicht(f)) z.input.setAttribute('aria-required', 'true');
    boxen.push(z.input);
    return z.label;
  });
  let anders: ReturnType<typeof andersZeile> | null = null;
  if (f.anders?.an) {
    anders = andersZeile(ctx, f, 'checkbox', name, vor, v.includes(andersCode(ctx.plan, f)), 9999);
    boxen.push(anders.input);
    zeilen.push(anders.label, anders.kasten);
  }
  const { c, fs } = gruppe(ctx, f, vor, [h('div', { class: 'optionen' }, ...zeilen)]);
  const wl = wertelabelZeile(ctx, c, fs);
  ziffernEingabe(ctx, c, f.id);
  fs.addEventListener('change', e => {
    const x = e.target as HTMLInputElement;
    if (x.type !== 'checkbox') return;
    if (x.checked) {
      const aus = x.dataset.ausschliessend === '1';
      let aufgehoben = false, abgewaehlt = '';
      for (const k of boxen) if (k !== x && k.checked && (aus || k.dataset.ausschliessend === '1')) {
        k.checked = false;
        if (aus) aufgehoben = true; else abgewaehlt = k.closest('label')?.querySelector('span')?.textContent ?? '';
      }
      if (aufgehoben) ctx.sag(ctx.tx('andereAufgehoben'));
      else if (abgewaehlt) ctx.sag(ctx.tx('ausschliessendAbgewaehlt', { option: abgewaehlt }));
    }
    anders?.abgleich();
    wl?.(wahlText(c));
    ctx.geaendert(f.id);
  });
  return c;
}

/** Zahl, Text, Datum: ein Eingabefeld mit label. */
function baueEinzel(ctx: Ctx, f: Frage, vor: Vor): HTMLElement {
  const c = behaelter(ctx, f, f.typ);
  const iid = ctx.id(), lid = ctx.id(), hp = hilfeEl(ctx, f), v = vor[f.id];
  const label = h('label', { for: iid, id: lid, class: 'frage' }, ctx.lok(f.text), pflichtWort(ctx, f));
  let feld: HTMLInputElement | HTMLTextAreaElement;
  if (f.typ === 'zahl') {
    const z = f.zahl;
    const i = h('input', { type: 'number', id: iid, 'data-feld': '', inputmode: z?.ganz ? 'numeric' : 'decimal', step: z?.ganz ? '1' : z?.schritt ? String(z.schritt) : 'any',
      min: typeof z?.min === 'number' ? String(z.min) : undefined, max: typeof z?.max === 'number' ? String(z.max) : undefined });
    if (typeof v === 'number') i.value = String(v);
    feld = i;
  } else if (f.typ === 'datum') {
    const i = h('input', { type: 'date', id: iid, 'data-feld': '' });
    if (typeof v === 'string') i.value = v;
    feld = i;
  } else if (f.text_?.mehrzeilig) {
    const i = h('textarea', { id: iid, rows: '4', 'data-feld': '', maxlength: f.text_.maxZeichen ? String(f.text_.maxZeichen) : undefined });
    if (typeof v === 'string') i.value = v;
    feld = i;
  } else {
    const i = h('input', { type: 'text', id: iid, 'data-feld': '', maxlength: f.text_?.maxZeichen ? String(f.text_.maxZeichen) : undefined });
    if (typeof v === 'string') i.value = v;
    feld = i;
  }
  if (hp) feld.setAttribute('aria-describedby', hp.id);
  if (ctx.pflicht(f)) feld.required = true;
  const einheit = f.typ === 'zahl' && f.zahl?.einheit ? ctx.lok(f.zahl.einheit) : '';
  let ee: HTMLElement | null = null;
  if (einheit) { ee = h('span', { id: ctx.id(), class: 'einheit' }, einheit); feld.setAttribute('aria-labelledby', `${lid} ${ee.id}`); }
  feld.addEventListener('input', () => ctx.geaendert(f.id));
  c.append(label, bildEl(ctx, f.bild) ?? '', hp ?? '', fehlerPlatz(), h('div', { class: 'eingabe' }, feld, ee));
  const k = kommentarFeld(ctx, f, vor); if (k) c.append(k);
  return c;
}

function baueRegler(ctx: Ctx, f: Frage, vor: Vor): HTMLElement {
  const z = f.zahl ?? { ganz: true }, min = z.min ?? 0, max = z.max ?? 10, l = f.liste ? listeVon(ctx, f.liste) : null;
  const zid = ctx.id();
  const { c, legende } = gruppe(ctx, f, vor, []);
  const fs = c.querySelector('fieldset')!;
  const schritt = z.schritt ? String(z.schritt) : z.ganz ? '1' : 'any';
  const range = h('input', { type: 'range', min: String(min), max: String(max), step: schritt, 'aria-labelledby': legende.id });
  const zlid = ctx.id();
  const zahl = h('input', { type: 'number', id: zid, min: String(min), max: String(max), step: schritt, inputmode: z.ganz ? 'numeric' : 'decimal', 'data-feld': '', 'aria-labelledby': `${legende.id} ${zlid}` });
  if (ctx.pflicht(f)) zahl.required = true;
  const text = (s: string) => {
    const n = zahlVon(s);
    if (n === null) { range.setAttribute('aria-valuetext', ctx.tx('reglerLeer')); return; }
    const opt = l?.optionen.find(o => o.wert === n);
    range.setAttribute('aria-valuetext', ctx.tx('reglerWert', { wert: n, max }) + (opt ? `, ${ctx.lok(opt.text)}` : ''));
  };
  const v = vor[f.id];
  if (typeof v === 'number') { zahl.value = String(v); range.value = String(v); }
  const stufe = z.schritt ? z.schritt : 1;
  if (zahl.value === '') {   // unbeantwortet: Daumen sichtbar in der Mitte, aber keine Antwort (Zahlenfeld leer, Wertetext „noch keine Antwort“)
    range.value = String(min + Math.floor((max - min) / 2 / stufe) * stufe);
  }
  text(zahl.value);
  const setze = (w: number) => {   // erste Bedienung: Antwort sofort setzen und ansagen
    w = Math.min(max, Math.max(min, w));
    range.value = String(w); zahl.value = range.value; text(zahl.value);
    ctx.sag(range.getAttribute('aria-valuetext') ?? '');
    ctx.geaendert(f.id);
  };
  range.addEventListener('keydown', e => {
    if (zahl.value !== '' || e.altKey || e.ctrlKey || e.metaKey) return;
    const cur = Number(range.value), gross = Math.max(stufe, Math.round((max - min) / 10 / stufe) * stufe);
    const ziel: Record<string, number> = { ArrowRight: cur + stufe, ArrowUp: cur + stufe, ArrowLeft: cur - stufe, ArrowDown: cur - stufe, Home: min, End: max, PageUp: cur + gross, PageDown: cur - gross };
    if (!(e.key in ziel)) return;
    e.preventDefault();
    setze(ziel[e.key]!);
  });
  range.addEventListener('click', () => { if (zahl.value === '') setze(Number(range.value)); });
  range.addEventListener('input', () => { zahl.value = range.value; text(zahl.value); ctx.geaendert(f.id); });
  zahl.addEventListener('input', () => { if (zahl.value !== '') range.value = zahl.value; text(zahl.value); ctx.geaendert(f.id); });
  const ende = (w: number) => { const o = l?.optionen.find(x => x.wert === w); return o ? `${w} (${ctx.lok(o.text)})` : String(w); };
  fs.append(
    h('div', { class: 'regler' }, range, h('div', { class: 'enden', 'aria-hidden': 'true' }, h('span', {}, ende(min)), h('span', {}, ende(max)))),
    h('div', { class: 'zahlfeld' }, h('label', { for: zid, id: zlid }, ctx.tx('zahlfeld')), zahl));
  return c;
}

function baueRang(ctx: Ctx, f: Frage, vor: Vor): HTMLElement {
  const l = listeVon(ctx, f.liste), start = Array.isArray(vor[f.id]) ? (vor[f.id] as number[]) : null;
  let ops = ordnung(ctx, f, l);
  if (start) ops = [...start.map(w => l.optionen.find(o => o.wert === w)).filter((o): o is Option => !!o), ...ops.filter(o => !start.includes(o.wert))];
  const ol = h('ol', { class: 'rang' });
  const status = h('p', { class: 'rangstatus' }, ctx.tx(start ? 'rangFertig' : 'rangOffen'));
  const { c } = gruppe(ctx, f, vor, [ol, status]);
  if (start) c.dataset.beruehrt = '1';
  const beruehrt = () => { c.dataset.beruehrt = '1'; status.textContent = ctx.tx('rangFertig'); };
  const enden = () => {
    const lis = Array.from(ol.children) as HTMLElement[];
    lis.forEach((li, i) => {
      const setze = (b: Element | null, aus: boolean) => { if (aus) b?.setAttribute('aria-disabled', 'true'); else b?.removeAttribute('aria-disabled'); };
      setze(li.querySelector('[data-r=oben]'), i === 0);
      setze(li.querySelector('[data-r=unten]'), i === lis.length - 1);
    });
  };
  for (const op of ops) {
    const text = ctx.lok(op.text);
    const knopf = (r: 'oben' | 'unten') => h('button', { type: 'button', 'data-r': r, 'aria-label': ctx.tx(r === 'oben' ? 'nachOben' : 'nachUnten', { option: text }) }, ctx.tx(r === 'oben' ? 'obenKurz' : 'untenKurz'));
    const auf = knopf('oben'), ab = knopf('unten');
    const li = h('li', { 'data-wert': String(op.wert) }, h('span', {}, text), h('div', { class: 'rangknoepfe' }, auf, ab));
    const bewege = (btn: HTMLElement, richtung: -1 | 1) => {
      if (btn.getAttribute('aria-disabled') === 'true') return;
      const lis = Array.from(ol.children), i = lis.indexOf(li), j = i + richtung;
      if (j < 0 || j >= lis.length) return;
      if (richtung < 0) ol.insertBefore(li, lis[j]!); else ol.insertBefore(lis[j]!, li);
      beruehrt(); enden();
      btn.focus();
      ctx.sag(ctx.tx('platz', { option: text, platz: j + 1, gesamt: lis.length }));
      ctx.geaendert(f.id);
    };
    auf.addEventListener('click', () => bewege(auf, -1));
    ab.addEventListener('click', () => bewege(ab, 1));
    ol.append(li);
  }
  enden();
  const ok = h('button', { type: 'button' }, ctx.tx('uebernehmen'));
  ok.addEventListener('click', () => { beruehrt(); ctx.sag(ctx.tx('reihenfolgeUebernommen')); ctx.geaendert(f.id); });
  status.after(ok);
  return c;
}

function baueEinwilligung(ctx: Ctx, f: Frage, vor: Vor): HTMLElement {
  const z = optZeile(ctx, 'checkbox', ctx.id(), 1, ctx.tx('ichStimmeZu'), 0, undefined, vor[f.id] === 1);
  if (ctx.pflicht(f)) z.input.setAttribute('aria-required', 'true');
  const { c, fs } = gruppe(ctx, f, vor, [h('div', { class: 'optionen' }, z.label)]);
  ziffernEingabe(ctx, c, f.id);
  fs.addEventListener('change', () => ctx.geaendert(f.id));
  return c;
}

function baueBlock(ctx: Ctx, b: Block, vor: Vor): HTMLElement {
  const l = listeVon(ctx, b.liste), ops = ordnung(ctx, b, l);
  const items = b.zufall ? mischen(b.items, ctx.start + hash(b.id)) : b.items;
  const c = behaelter(ctx, b, 'block');
  const hp = hilfeEl(ctx, b);
  const pf = ctx.pflicht(b);
  const ot = (op: Option) => (ctx.o.modus === 'eingabe' ? `${op.wert} = ${ctx.lok(op.text)}` : ctx.lok(op.text));
  const radio = (item: Block['items'][number], op: Option, name: string, extra: Attr = {}) => {
    if (pf && op === ops[0]) extra = { ...extra, 'aria-required': 'true' };   // nur einmal je Zeile/Gruppe
    const i = h('input', { type: 'radio', name, value: String(op.wert), 'data-item': item.id, 'data-pos': String(l.optionen.indexOf(op)), ...extra });
    i.checked = vor[item.id] === op.wert;
    return i;
  };
  let kopf: Kind[];
  let inhalt: HTMLElement;
  if (ctx.o.eng) {
    kopf = [h('h3', { id: ctx.id() }, ctx.lok(b.text), pflichtWort(ctx, b)), hp];
    inhalt = h('div', {}, ...items.map(item => {
      const name = ctx.id();
      const zeilen = ops.map(op => { const i = radio(item, op, name); const label = h('label', { class: 'opt' }, i, h('span', {}, ot(op))); return label; });
      return h('fieldset', {}, h('legend', {}, ctx.lok(item.text)), h('div', { class: 'optionen' }, ...zeilen));
    }));
  } else {
    const spalten = ops.map(() => ctx.id());
    const kopfZeile = h('tr', {}, h('td', {}), ...ops.map((op, j) => h('th', { scope: 'col', id: spalten[j] }, ot(op))));
    const zeilen = items.map(item => {
      const rid = ctx.id(), name = ctx.id();
      return h('tr', {}, h('th', { scope: 'row', id: rid }, ctx.lok(item.text)),
        ...ops.map((op, j) => h('td', {}, h('label', { class: 'zelle' }, radio(item, op, name, { 'aria-labelledby': `${rid} ${spalten[j]}` })))));
    });
    const tabelle = h('table', { 'aria-describedby': hp?.id }, h('caption', {}, ctx.lok(b.text), pflichtWort(ctx, b)), h('thead', {}, kopfZeile), h('tbody', {}, ...zeilen));
    kopf = [hp];
    inhalt = h('div', { class: 'tabellenrahmen' }, tabelle);
  }
  c.append(...kopf.filter((x): x is Node => !!x), fehlerPlatz(), inhalt);
  const k = kommentarFeld(ctx, b, vor); if (k) c.append(k);
  ziffernEingabe(ctx, c, b.id);
  c.addEventListener('change', e => { if ((e.target as HTMLInputElement).type === 'radio') ctx.geaendert(b.id); });
  return c;
}

function baueHinweis(ctx: Ctx, el: Extract<PlanElement, { art: 'hinweis' }>): HTMLElement {
  return h('div', { 'data-hinweis': el.id }, h('p', {}, ctx.lok(el.text)), bildEl(ctx, el.bild));
}

/* ------------------------------------------------------------------ Antworten lesen */
/** Liest die Antworten aus dem DOM der Wurzel; nicht gezeigte Fragen fehlen, Leeres ergibt keinen Schlüssel. */
export function liesAntworten(wurzel: HTMLElement): Antworten {
  const aus: Antworten = {};
  wurzel.querySelectorAll<HTMLElement>('[data-frage]').forEach(c => {
    const id = c.dataset.frage!, typ = c.dataset.typ;
    const alle = <T extends Element>(s: string) => Array.from(c.querySelectorAll<T>(s));
    if (typ === 'einfach') {
      const r = alle<HTMLInputElement>('input[type=radio]').find(x => x.checked);
      if (r) { aus[id] = Number(r.value); if (r.hasAttribute('data-anders-wahl')) { const s = c.querySelector<HTMLInputElement>('[data-anders]')?.value.trim(); if (s) aus[`${id}:anders`] = s; } }
    } else if (typ === 'mehrfach') {
      const an = alle<HTMLInputElement>('input[type=checkbox]:checked').sort((a, b) => Number(a.dataset.pos) - Number(b.dataset.pos));
      if (an.length) aus[id] = an.map(x => Number(x.value));
      if (an.some(x => x.hasAttribute('data-anders-wahl'))) { const s = c.querySelector<HTMLInputElement>('[data-anders]')?.value.trim(); if (s) aus[`${id}:anders`] = s; }
    } else if (typ === 'zahl' || typ === 'regler') {
      const n = zahlVon(c.querySelector<HTMLInputElement>('input[type=number]')?.value ?? ''); if (n !== null) aus[id] = n;
    } else if (typ === 'text' || typ === 'datum') {
      const s = c.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-feld]')?.value ?? ''; if (s.trim() !== '') aus[id] = s;
    } else if (typ === 'block') {
      for (const r of alle<HTMLInputElement>('input[data-item]:checked')) aus[r.dataset.item!] = Number(r.value);
    } else if (typ === 'rangfolge') {
      if (c.dataset.beruehrt === '1') aus[id] = alle<HTMLElement>('ol > li').map(li => Number(li.dataset.wert));
    } else if (typ === 'einwilligung') {
      if (c.querySelector<HTMLInputElement>('input[type=checkbox]')?.checked) aus[id] = 1;
    }
    const k = c.querySelector<HTMLTextAreaElement>('textarea[data-kommentar]')?.value.trim(); if (k) aus[`${id}:kommentar`] = k;
  });
  return aus;
}

/** Fokus auf die Seitenüberschrift (der Aufrufer ruft das nach einem Seitenwechsel). */
export function fokussiereSeitentitel(wurzel: HTMLElement): void {
  wurzel.querySelector<HTMLElement>('h2')?.focus();
  const fort = wurzel.querySelector('.fortschritt')?.textContent, region = wurzel.querySelector('[data-ansage]');
  if (fort && region) region.textContent = fort;   // „Seite 2 von 5“ wird mitgesagt (der Absatz allein ist nur im Lesemodus hörbar)
}

/* ------------------------------------------------------------------ Seite */
let zaehler = 0;

export function zeichneSeite(plan: FragebogenPlan, seite: Seite, antworten: Antworten, optionen: Optionen): HTMLElement {
  const o = optionen, sprache = o.sprache || 'de', uid = `af${++zaehler}`;
  let n = 0;
  const region = h('div', { 'data-ansage': '', role: 'status', 'aria-live': 'polite' });
  let spaeterUhr: ReturnType<typeof setTimeout> | undefined;
  const ctx: Ctx = {
    plan, o, sprache, start: o.zufallStart ?? Math.floor(Math.random() * 2147483647),
    tx: (k, w) => t(sprache, k, w), lok: l => lok(l, sprache, plan), id: () => `${uid}-${++n}`,
    sag: text => {
      if (spaeterUhr) { clearTimeout(spaeterUhr); spaeterUhr = undefined; region.setAttribute('aria-live', 'polite'); }   // eine neuere Meldung hebt die Stummschaltung auf
      region.textContent = region.textContent === text ? text + ' ' : text; o.ansage?.(text);
    },
    /**
     * Meldung, die die Ansage der Auswahl (Option, Zustand) nicht verdrängen darf. Der Text steht sofort in der Region (für Tests und Lesemodus),
     * die Region ist aber 0,9 s lang stumm (aria-live off): erst danach wird sie höflich geschaltet und der Text neu geschrieben, dann liest ihn der Screenreader.
     */
    sagSpaeter: text => {
      if (spaeterUhr) clearTimeout(spaeterUhr);
      region.setAttribute('aria-live', 'off');
      region.textContent = region.textContent === text ? `${text} ` : text;
      o.ansage?.(text);
      spaeterUhr = setTimeout(() => {
        spaeterUhr = undefined;
        region.setAttribute('aria-live', 'polite');
        region.textContent = '';
        setTimeout(() => { if (!spaeterUhr && region.textContent === '') region.textContent = text; }, 60);
      }, 900);
    },
    geaendert: id => geaendert(id),
    pflicht: el => !!el.pflicht?.an && o.modus !== 'eingabe',
    codeFehler: () => {},
  };
  const root = h('section', { class: 'af', lang: sprache, 'data-modus': o.modus, 'data-seite': seite.id });
  const titel = h('h2', { tabindex: '-1', id: ctx.id() }, ctx.lok(seite.titel) || ctx.lok(plan.titel));
  const fort = plan.einstellungen.fortschritt ? h('p', { class: 'fortschritt', id: ctx.id() }) : null;
  if (fort) titel.setAttribute('aria-describedby', fort.id);   // „Seite 2 von 4“ wird mit der Überschrift beim Seitenwechsel gesprochen
  const flaeche = h('div', { 'data-elemente': '' });

  const eigene = new Set<string>();
  for (const el of seite.elemente) {
    eigene.add(el.id); eigene.add(`${el.id}:anders`); eigene.add(`${el.id}:kommentar`);
    if (el.art === 'block') el.items.forEach(i => eigene.add(i.id));
  }
  const stand = (): Antworten => {
    const s: Antworten = {};
    for (const [k, v] of Object.entries(antworten)) if (!eigene.has(k)) s[k] = v;
    return Object.assign(s, liesAntworten(root));
  };
  const position = (an: Antworten) => {
    const sicht = plan.elemente.filter(s => s.id === seite.id || zeigen(s, an, plan));
    return { n: Math.max(1, sicht.findIndex(s => s.id === seite.id) + 1), gesamt: sicht.length };
  };

  /* --- Elemente zeigen und verbergen (Filter) */
  const knoten = new Map<string, HTMLElement>();
  const baue = (el: PlanElement, vor: Vor): HTMLElement =>
    el.art === 'hinweis' ? baueHinweis(ctx, el)
    : el.art === 'block' ? baueBlock(ctx, el, vor)
    : el.typ === 'einfach' ? baueEinfach(ctx, el, vor)
    : el.typ === 'mehrfach' ? baueMehrfach(ctx, el, vor)
    : el.typ === 'regler' ? baueRegler(ctx, el, vor)
    : el.typ === 'rangfolge' ? baueRang(ctx, el, vor)
    : el.typ === 'einwilligung' ? baueEinwilligung(ctx, el, vor)
    : baueEinzel(ctx, el, vor);
  seite.elemente.forEach(el => { if (zeigen(el, antworten, plan)) { const k = baue(el, antworten); knoten.set(el.id, k); flaeche.append(k); } });
  /** Zeigt/verbirgt nach dem aktuellen Stand (wiederholt, bis nichts mehr wechselt); wahr, wenn eine Frage dazukam. */
  const aktualisiere = (): boolean => {
    let neue = false;
    for (let runde = 0; runde <= seite.elemente.length; runde++) {
      const an = stand();
      let geaendertFlag = false;
      seite.elemente.forEach((el, i) => {
        const soll = zeigen(el, an, plan), da = knoten.get(el.id);
        if (soll && !da) {
          const k = baue(el, {}); knoten.set(el.id, k);
          let danach: HTMLElement | null = null;
          for (let j = i + 1; j < seite.elemente.length && !danach; j++) danach = knoten.get(seite.elemente[j]!.id) ?? null;
          flaeche.insertBefore(k, danach);
          neue = true; geaendertFlag = true;
        } else if (!soll && da) { da.remove(); knoten.delete(el.id); geaendertFlag = true; }
      });
      if (!geaendertFlag) break;
    }
    return neue;
  };

  /* --- Fehler */
  let liste: HTMLElement | null = null, fehlerAktiv = false;
  const markiert = new Set<string>();
  const containerVon = (id: string) => flaeche.querySelector<HTMLElement>(`[data-frage="${CSS.escape(id)}"]`);
  const fokussiereErste = (c: HTMLElement) => {
    const ziel = Array.from(c.querySelectorAll<HTMLElement>('input, textarea, button')).find(x => !x.closest('[hidden]') && x.getAttribute('aria-disabled') !== 'true') ?? c.querySelector<HTMLElement>('input, textarea, button');
    ziel?.focus();
  };
  const loeschen = (c: HTMLElement) => {
    const eid = `${c.id}-fehler`;
    c.querySelector('[data-fehlerplatz]')?.replaceChildren();
    c.querySelectorAll<HTMLElement>('[aria-invalid]').forEach(x => {
      x.removeAttribute('aria-invalid');
      const rest = (x.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(s => s && s !== eid);
      if (rest.length) x.setAttribute('aria-describedby', rest.join(' ')); else x.removeAttribute('aria-describedby');
    });
  };
  const markieren = (f: SeitenFehler) => {
    const c = containerVon(f.id); if (!c) return;
    const eid = `${c.id}-fehler`;
    c.querySelector('[data-fehlerplatz]')?.replaceChildren(h('p', { id: eid, class: 'fehlertext' }, h('span', {}, `${ctx.tx('fehler')}: `), f.text));
    const felder = c.dataset.typ === 'rangfolge' ? [c.querySelector<HTMLElement>('fieldset')!]
      : Array.from(c.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')).filter(i => !i.hasAttribute('data-kommentar') && !(i.type === 'radio' && c.querySelectorAll<HTMLInputElement>('input[type=radio]').length && Array.from(c.querySelectorAll<HTMLInputElement>('input[type=radio]')).some(r => r.name === i.name && r.checked)));
    for (const x of felder) {
      x.setAttribute('aria-invalid', 'true');
      x.setAttribute('aria-describedby', [...(x.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean), eid].join(' '));
    }
    markiert.add(f.id);
  };
  const zeigeListe = (fehler: SeitenFehler[], alarm: boolean) => {
    liste?.remove(); liste = null;
    if (!fehler.length) return;
    const ul = h('ul', {});
    for (const f of fehler) {
      const c = containerVon(f.id); if (!c) continue;
      const el = seite.elemente.find(x => x.id === f.id);
      const a = h('a', { href: `#${c.id}` }, `${el && el.art !== 'hinweis' ? ctx.lok(el.text) : ''} (${f.text})`);
      a.addEventListener('click', e => { e.preventDefault(); fokussiereErste(c); });
      ul.append(h('li', {}, a));
    }
    liste = h('div', { 'data-fehlerliste': '', tabindex: '-1', role: alarm ? 'alert' : undefined }, h('p', {}, ctx.tx('fehlerZusammenfassung', { n: fehler.length })), ul);
    root.insertBefore(liste, flaeche);
  };
  const aufraeumen = () => { for (const id of markiert) { const c = containerVon(id); if (c) loeschen(c); } markiert.clear(); liste?.remove(); liste = null; fehlerAktiv = false; };
  /** Nach einer Änderung: behobene Fehler verschwinden (neue Fehler erscheinen erst bei „Weiter“). */
  const pruefeNach = () => {
    const fehler = pruefeSeite(plan, seite, stand(), sprache, o.modus), noch = new Set(fehler.map(f => f.id));
    for (const id of [...markiert]) if (!noch.has(id)) { const c = containerVon(id); if (c) loeschen(c); markiert.delete(id); }
    const rest = fehler.filter(f => markiert.has(f.id));
    zeigeListe(rest, false);
    if (!rest.length) fehlerAktiv = false;
  };

  /** Modus `eingabe`: Prüfung beim Tippen. Der Fehler steht an der Frage und wird einmal angesagt; eine behobene Eingabe löscht ihn. */
  const feldPruefung = (id: string) => {
    const c = containerVon(id); if (!c) return;
    const an = stand();
    const text = o.pruefeEingabe?.(id, an[id]) || pruefeSeite(plan, seite, an, sprache, 'eingabe').find(x => x.id === id)?.text || '';
    loeschen(c); markiert.delete(id);
    if (text) { markieren({ id, text }); ctx.sag(`${ctx.tx('fehler')}: ${text}`); }
  };
  ctx.codeFehler = (id, code) => {
    const c = containerVon(id); if (!c) return;
    const text = o.pruefeEingabe?.(id, code) || ctx.tx('codeUnbekannt', { code });
    loeschen(c); markiert.delete(id);
    markieren({ id, text }); ctx.sag(`${ctx.tx('fehler')}: ${text}`);
  };

  let gesamtBisher = position(antworten).gesamt;
  const zeigeFortschritt = () => { const p = position(stand()); if (fort) fort.textContent = ctx.tx('seiteVon', p); return p.gesamt; };
  const geaendert = (id: string) => {
    const neu = aktualisiere();
    if (fehlerAktiv) pruefeNach();
    if (o.modus === 'eingabe') feldPruefung(id);
    const gesamt = zeigeFortschritt();
    // Neue Seitenzahl wird nicht live angesagt (NVDA-Nachmessung Stufe 3, N1: die Meldung verdrängte die Ansage der gewählten Option);
    // sie steht im Fortschritt und wird mit der Überschrift der nächsten Seite gelesen (aria-describedby).
    gesamtBisher = gesamt;
    if (neu) ctx.sagSpaeter(ctx.tx('neueFrage'));
    o.beiAenderung?.(stand(), id);
  };

  /* --- Knöpfe */
  const knoepfe = h('div', { class: 'knoepfe' });
  const pos = position(antworten);
  if (plan.einstellungen.zurueck && pos.n > 1) {
    const z = h('button', { type: 'button' }, ctx.tx('zurueck'));
    z.addEventListener('click', () => o.beiZurueck?.());
    knoepfe.append(z);
  }
  const weiter = h('button', { type: 'button', class: 'haupt', 'data-weiter': '' }, o.weiterText ?? ctx.tx('weiter'));
  weiter.addEventListener('click', () => {
    const an = stand(), fehler = pruefeSeite(plan, seite, an, sprache, o.modus);
    if (fehler.length) {
      aufraeumen(); fehlerAktiv = true;
      fehler.forEach(markieren);
      zeigeListe(fehler.filter(f => markiert.has(f.id)), true);
      liste?.focus();
      return;
    }
    aufraeumen();
    o.beiWeiter?.(an);
  });
  knoepfe.append(weiter);

  root.append(h('style', {}, STIL), titel, fort ?? '', flaeche, region, knoepfe);
  zeigeFortschritt();
  return root;
}
