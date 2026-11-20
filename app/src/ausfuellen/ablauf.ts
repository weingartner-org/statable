/**
 * Ablauf der Ausfüllseite (Stufe 3C, geteilt mit der Erhebungsstation 3F): reines TypeScript, KEINE Oberflächen-Abhängigkeit und KEIN scrypt.
 * `starteAusfuellen(wurzel, plan, optionen)` zeichnet den ganzen Ablauf in `wurzel`:
 *   Einleitung → Einwilligung (wenn im Plan) → Code (wenn `plan.codeVerlangt`) → Seiten (Bibliothek) → Abschlussseite mit den Rückwegen.
 * Eigenständig (`seite.ts`, Fragebogen-Datei und feste Seite): Zwischenstand im localStorage, Rückwege Datei/Teilen/Text/QR.
 * Station (`optionen.station`): KEIN Zwischenstand im Gerät, keine Rückwege; nach dem Absenden wird die Antwort verschlüsselt an `station.ablegen` gegeben,
 *   dann „Danke“ und nach einigen Sekunden (oder „Nächste Person“) alles geleert und zurück zur Einleitung.
 * Antwort: `Antwortsatz` (Stufe 3B, Datum ohne Uhrzeit), im Gerät mit age an `plan.empfaenger.schluessel` verschlüsselt.
 * Sicherheit: Texte aus Plan und Antworten gelangen nur über `textContent` und Textknoten ins DOM, nie über `innerHTML`.
 */
import { zeichneSeite, fokussiereSeitentitel } from './zeichnen';
import { t } from './texte';
import { lok } from './pruefen';
import { STIL } from './stil';
import { zeigen, type Antworten } from '../lib/fragebogenplan-bedingung';
import type { FragebogenPlan } from '../lib/fragebogenplan';
import type { verschluesseleAntwort as VerschluesseleFn, Antwortsatz, Antwortwert } from '../lib/antwortsatz';
import { armor } from 'age-encryption';
import { qrModule, qrSvg } from './qr/qr';

export type Plan = FragebogenPlan & { codeVerlangt?: boolean };
type Schritt = 'einleitung' | 'einwilligung' | 'code' | 'seiten' | 'abschluss';
interface Stand {
  v: 1; revision: number; schritt: Schritt; aktuell: number; sprache: string; antworten: Antworten;
  code?: string; einwilligung?: boolean; start: string; antwortId: string; zufall: number;
}

export const SEITENSTIL = `
.af.kopf{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:center;justify-content:space-between;padding-bottom:0}
.af.kopf h1{font-size:1.75rem;line-height:1.2;margin:0}
.af .sprachen{display:flex;gap:.5rem}
.af .sprachen button[aria-pressed=true]{background:var(--af-akzent);color:var(--af-akzent-text);border-color:var(--af-akzent)}
.af .pre{white-space:pre-line}
.af .feld{margin:0 0 1.5rem}
.af .hinweis{margin:0 0 var(--af-abstand);padding:.5rem .75rem;border-inline-start:.375rem solid var(--af-akzent);background:#eef4fc}
.af .hinweis button{margin-top:.5rem}
.af .wege{list-style:none;margin:var(--af-abstand) 0;padding:0;display:flex;flex-direction:column;gap:1.25rem}
.af .wege .was{color:var(--af-leise);margin:.25rem 0 0}
.af textarea[data-antworttext]{min-height:8rem;margin-top:.5rem;font:.8rem/1.3 ui-monospace,Consolas,monospace;overflow-wrap:anywhere}
.af svg.qr{display:block;width:min(100%,22rem);height:auto;margin:.5rem 0;forced-color-adjust:none;border:1px solid var(--af-rand)}
.af .rueckmeldung{margin:1rem 0;font-weight:600}
.af .fussnote{color:var(--af-leise);font-size:.875rem}
.af .rueck{margin-top:1.5rem}
.sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
`;

const SPRACHNAME: Record<string, string> = { de: 'Deutsch', en: 'English' };
export const h = <K extends keyof HTMLElementTagNameMap>(tag: K, a: Record<string, string | undefined> = {}, ...kids: (Node | string | null | false | undefined)[]): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a)) if (v !== undefined) e.setAttribute(k, v);
  for (const c of kids) if (c) e.append(c);
  return e;
};
const heute = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const sprachVonGeraet = (): string => (navigator.languages?.[0] ?? navigator.language ?? 'de').toLowerCase();

export function istPlan(x: unknown): x is Plan {
  const p = x as Partial<Plan> | null;
  return !!p && typeof p === 'object' && p.format === 'statable-fragebogen' && p.version === 1 && typeof p.id === 'string' && p.id !== '' && Number.isInteger(p.revision)
    && !!p.titel && typeof p.titel === 'object' && Array.isArray(p.sprachen) && p.sprachen.length > 0 && p.sprachen.every(s => typeof s === 'string')
    && !!p.einstellungen && typeof p.einstellungen === 'object' && Array.isArray(p.antwortlisten) && Array.isArray(p.elemente);
}

/* ------------------------------------------------------------------ Zwischenstand */
const speicherSchluessel = (id: string) => `statable-ausfuellen:${id}`;
function lesen(plan: Plan): Stand | null {
  try {
    const roh = localStorage.getItem(speicherSchluessel(plan.id));
    if (!roh) return null;
    const s = JSON.parse(roh) as Stand;
    return s && s.v === 1 && s.revision === plan.revision && typeof s.antwortId === 'string' && s.antworten && typeof s.antworten === 'object' ? s : null;
  } catch { return null; }
}

/* ------------------------------------------------------------------ Start */
export interface StationOptionen {
  /** Legt die verschlüsselte Antwort (age-Armor) im Gerät ab; wirft bei Fehler. */
  ablegen(armor: string, antwortId: string): Promise<void>;
  /** Sekunden bis zur nächsten Person (Voreinstellung 20). */
  wartezeit?: number;
  /** Nach jeder abgelegten Antwort (für den Zähler der Betreuung). */
  beiAbgelegt?(): void;
}
/** `verschluessele` kommt vom Aufrufer (seite.ts oder Station): die Bibliothek ausfuellen/ importiert zur Laufzeit nichts aus lib/ außer der Filterlogik. */
export interface AusfuellOptionen { verschluessele: typeof VerschluesseleFn; station?: StationOptionen; eigenesDokument?: boolean }
export const FEHLERTEXT = (sprache: string, schluessel: 'keinPlan' | 'unsicher' | 'ohneSchluessel') => t(sprache, schluessel);

export function starteAusfuellen(wurzel: HTMLElement, plan: Plan, opt: AusfuellOptionen): { ende(): void } {
  const station = opt.station;
  const eigen = opt.eigenesDokument !== false;
  if (!document.getElementById('statable-af-stil')) document.head.append(h('style', { id: 'statable-af-stil' }, STIL + SEITENSTIL));
  const fehlerseite = (sprache: string, titel: string, schluessel: 'keinPlan' | 'unsicher' | 'ohneSchluessel') => {
    if (eigen) { document.documentElement.lang = sprache.startsWith('en') ? 'en' : 'de'; document.title = titel; }
    wurzel.replaceChildren(
      h('header', { class: 'af kopf' }, h('h1', {}, titel)),
      h('main', { class: 'af', id: 'haupt' }, h('p', { 'data-fehler-seite': schluessel }, t(sprache, schluessel))),
    );
  };
  const aus = { ende() { /* nichts aufzuräumen */ } };
  const erste = plan.sprachen[0]!;
  const planTitel = (sp: string) => lok(plan.titel, sp, plan) || t(sp, 'fragebogen');
  if (!window.isSecureContext || !globalThis.crypto?.subtle) { fehlerseite(erste, planTitel(erste), 'unsicher'); return aus; }
  if (!/^age1[a-z0-9]+$/.test(plan.empfaenger?.schluessel ?? '')) { fehlerseite(erste, planTitel(erste), 'ohneSchluessel'); return aus; }
  const schluessel = plan.empfaenger!.schluessel;

  /* --- Stand */
  const wiederhergestellt = station ? null : lesen(plan);
  const gewuenscht = sprachVonGeraet();
  const stand: Stand = wiederhergestellt ?? {
    v: 1, revision: plan.revision, schritt: 'einleitung', aktuell: 0, antworten: {}, start: heute(), antwortId: crypto.randomUUID(), zufall: Math.floor(Math.random() * 2147483647),
    sprache: plan.sprachen.find(s => gewuenscht === s || gewuenscht.startsWith(`${s}-`)) ?? erste,
  };
  if (!plan.sprachen.includes(stand.sprache)) stand.sprache = erste;
  let abgegeben = false, hinweisWieder = !!wiederhergestellt && stand.schritt !== 'einleitung';
  const sichern = () => {
    if (abgegeben || station) return;
    try { localStorage.setItem(speicherSchluessel(plan.id), JSON.stringify(stand)); } catch { /* Speicher gesperrt oder voll: ohne Zwischenstand weiter */ }
  };
  const loeschen = (): boolean => { if (station) return true; try { localStorage.removeItem(speicherSchluessel(plan.id)); return true; } catch { return false; } };

  const tx = (k: Parameters<typeof t>[1], w?: Record<string, string | number>) => t(stand.sprache, k, w);
  const L = (l: Record<string, string> | undefined) => lok(l, stand.sprache, plan);
  const folge: Schritt[] = ['einleitung', ...(plan.einwilligung ? ['einwilligung' as const] : []), ...(plan.codeVerlangt ? ['code' as const] : []), 'seiten', 'abschluss'];

  /* --- Gerüst: Kopf, Hauptbereich, Ansage-Region, Fußzeile */
  const kopf = h('header', { class: 'af kopf' });
  const haupt = h('main', { id: 'haupt' });
  const region = h('div', { role: 'status', 'aria-live': 'polite', class: 'sr' });
  const fuss = h('footer', { class: 'af' }, h('p', { class: 'fussnote' }), region);
  wurzel.replaceChildren(kopf, haupt, fuss);
  const sag = (text: string) => { region.textContent = region.textContent === text ? `${text} ` : text; };

  const zeichneKopf = () => {
    if (eigen) { document.documentElement.lang = stand.sprache; document.title = planTitel(stand.sprache); }
    kopf.replaceChildren(h('h1', {}, planTitel(stand.sprache)));
    if (plan.sprachen.length > 1) {
      const gruppe = h('div', { class: 'sprachen', role: 'group', 'aria-label': tx('sprache') });
      for (const sp of plan.sprachen) {
        const b = h('button', { type: 'button', lang: sp, 'data-sprache': sp, 'aria-pressed': String(sp === stand.sprache) }, SPRACHNAME[sp] ?? sp);
        b.addEventListener('click', () => {
          if (sp === stand.sprache) return;
          stand.sprache = sp; sichern(); zeichneKopf(); zeige(false);
          kopf.querySelector<HTMLElement>(`[data-sprache="${sp}"]`)?.focus();
          sag(`${t(sp, 'sprache')}: ${SPRACHNAME[sp] ?? sp}`);
        });
        gruppe.append(b);
      }
      kopf.append(gruppe);
    }
    fuss.querySelector('p')!.textContent = tx('fussnote');
  };

  /** Hinweis „Zwischenstand wiederhergestellt“ mit „Von vorn beginnen“: einmal, auf dem ersten Bild nach dem Laden. */
  const wiederHinweis = (): HTMLElement | null => {
    if (!hinweisWieder) return null;
    hinweisWieder = false;
    const nb = h('button', { type: 'button' }, tx('neuBeginnen'));
    nb.addEventListener('click', () => {
      loeschen(); abgegeben = false; ergebnis = null;
      Object.assign(stand, { schritt: 'einleitung', aktuell: 0, antworten: {}, code: undefined, einwilligung: undefined, antwortId: crypto.randomUUID(), start: heute() });
      zeige(true); sag(tx('neuBegonnen'));
    });
    return h('div', { class: 'hinweis' }, h('p', {}, tx('wiederHergestellt')), nb);
  };
  const box = (titelSchluessel: string, ...kinder: (Node | string | null | false)[]) => {
    const s = h('section', { class: 'af', lang: stand.sprache, 'data-schritt': stand.schritt });
    s.append(h('h2', { tabindex: '-1' }, tx(titelSchluessel)));
    const w = wiederHinweis(); if (w) s.append(w);
    for (const k of kinder) if (k) s.append(k);
    return s;
  };
  const knopf = (text: string, art: 'haupt' | '', beiKlick: () => void, extra: Record<string, string> = {}) => {
    const b = h('button', { type: 'button', class: art || undefined, ...extra }, text);
    b.addEventListener('click', beiKlick);
    return b;
  };
  const geheZu = (s: Schritt) => { stand.schritt = s; if (s === 'seiten') stand.aktuell = ersteSeite(0, 1); sichern(); zeige(true); };
  const naechster = () => folge[folge.indexOf(stand.schritt) + 1]!;
  const voriger = () => folge[folge.indexOf(stand.schritt) - 1]!;
  const fehlerAn = (feldEl: HTMLElement, platz: HTMLElement, text: string, id: string) => {
    platz.replaceChildren(h('p', { id, class: 'fehlertext' }, h('span', {}, `${tx('fehler')}: `), text));
    feldEl.setAttribute('aria-invalid', 'true'); feldEl.setAttribute('aria-describedby', [feldEl.getAttribute('aria-describedby'), id].filter(Boolean).join(' '));
    feldEl.focus();
  };

  /* --- Schritte */
  const zeigeEinleitung = () => {
    const text = L(plan.einleitung);
    return box('einleitungTitel',
      text ? h('p', { class: 'pre' }, text) : null,
      h('p', {}, tx('schutzSatz')),
      h('p', {}, tx(station ? 'stationZwischen' : 'zwischenHinweis')),
      h('div', { class: 'knoepfe' }, knopf(naechster() === 'seiten' ? tx('beginnen') : tx('weiter'), 'haupt', () => geheZu(naechster()), { 'data-weiter': '' })),
    );
  };
  const zeigeEinwilligung = () => {
    const cb = h('input', { type: 'checkbox', id: 'einw', 'aria-describedby': 'einw-text', ...(stand.einwilligung ? { checked: '' } : {}) });
    cb.checked = !!stand.einwilligung;
    cb.addEventListener('change', () => { stand.einwilligung = cb.checked; sichern(); platz.replaceChildren(); cb.removeAttribute('aria-invalid'); cb.setAttribute('aria-describedby', 'einw-text'); });
    const platz = h('div', {});
    const pflicht = !!plan.einwilligung?.pflicht;
    return box('einwilligungTitel',
      h('p', { class: 'pre', id: 'einw-text' }, L(plan.einwilligung?.text)),
      h('div', { class: 'feld' }, h('label', { class: 'opt', for: 'einw' }, cb, tx('ichStimmeZu'), pflicht ? h('span', { class: 'pflicht' }, ` (${tx('pflicht')})`) : null), platz),
      h('div', { class: 'knoepfe' },
        knopf(tx('zurueck'), '', () => geheZu(voriger())),
        knopf(tx('weiter'), 'haupt', () => {
          if (pflicht && !cb.checked) { fehlerAn(cb, platz, tx('einwilligungFehler'), 'einw-fehler'); return; }
          geheZu(naechster());
        }, { 'data-weiter': '' })),
    );
  };
  const zeigeCode = () => {
    const eingabe = h('input', { type: 'text', id: 'code', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-describedby': 'code-hilfe', 'aria-required': 'true', value: stand.code ?? '' });
    eingabe.value = stand.code ?? '';
    const platz = h('div', {});
    eingabe.addEventListener('input', () => { platz.replaceChildren(); eingabe.removeAttribute('aria-invalid'); eingabe.setAttribute('aria-describedby', 'code-hilfe'); });
    return box('codeTitel',
      h('div', { class: 'feld' },
        h('label', { class: 'frage', for: 'code' }, tx('codeLabel'), h('span', { class: 'pflicht' }, ` (${tx('pflicht')})`)),
        h('p', { id: 'code-hilfe', class: 'hilfe' }, tx('codeHilfe')), eingabe, platz),
      h('div', { class: 'knoepfe' },
        knopf(tx('zurueck'), '', () => { stand.code = eingabe.value.trim().toUpperCase() || undefined; geheZu(voriger()); }),
        knopf(tx('weiter'), 'haupt', () => {
          const c = eingabe.value.trim().toUpperCase().slice(0, 64);
          if (!c) { fehlerAn(eingabe, platz, tx('codeLeer'), 'code-fehler'); return; }
          stand.code = c; geheZu(naechster());
        }, { 'data-weiter': '' })),
    );
  };

  /* --- Seiten */
  const ersteSeite = (ab: number, richtung: 1 | -1): number => {
    for (let i = ab; i >= 0 && i < plan.elemente.length; i += richtung) if (zeigen(plan.elemente[i]!, stand.antworten, plan)) return i;
    return -1;
  };
  const mq = typeof matchMedia === 'function' ? matchMedia('(max-width: 600px)') : null;
  const mqBei = () => { if (stand.schritt === 'seiten') zeige(false); };
  mq?.addEventListener('change', mqBei);
  const zeigeSeiten = (fokus: boolean): HTMLElement | null => {
    const jetzt = plan.elemente[stand.aktuell];
    if (!jetzt || !zeigen(jetzt, stand.antworten, plan)) stand.aktuell = ersteSeite(0, 1);
    if (stand.aktuell < 0) { geheZu('abschluss'); return null; }
    const w = zeichneSeite(plan, plan.elemente[stand.aktuell]!, stand.antworten, {
      sprache: stand.sprache, eng: !!mq?.matches, modus: 'ausfuellen', zufallStart: stand.zufall,
      beiAenderung: an => { stand.antworten = an; sichern(); },
      beiWeiter: an => {
        stand.antworten = an;
        const n = ersteSeite(stand.aktuell + 1, 1);
        if (n < 0) { geheZu('abschluss'); return; }
        stand.aktuell = n; sichern(); zeige(true);
      },
      beiZurueck: () => { const n = ersteSeite(stand.aktuell - 1, -1); if (n >= 0) { stand.aktuell = n; sichern(); zeige(true); } },
      ansage: sag,
    });
    const wh = wiederHinweis();
    haupt.replaceChildren(...(wh ? [wh, w] : [w]));
    if (fokus) fokussiereSeitentitel(w);
    return w;
  };

  /* --- Abschluss */
  const baueSatz = (): Antwortsatz => {
    const werte: Record<string, Antwortwert> = {};
    const nimm = (k: string) => {
      const v = stand.antworten[k];
      if (v === undefined || v === null) return;
      werte[k] = typeof v === 'string' ? v.slice(0, 10000) : v;
    };
    for (const s of plan.elemente) for (const el of s.elemente) {
      if (!zeigen(el, stand.antworten, plan)) continue;   // verborgene Fragen (Filter) liefern keine alten Werte mit
      nimm(el.id); nimm(`${el.id}:anders`); nimm(`${el.id}:kommentar`);
      if (el.art === 'block') el.items.forEach(i => nimm(i.id));
    }
    if (stand.einwilligung) werte[':einwilligung'] = 1;
    const satz: Antwortsatz = { format: 'statable-antwort', version: 1, plan: { id: plan.id, revision: plan.revision }, antwortId: stand.antwortId, start: stand.start, ende: heute(), werte };
    if (stand.code) satz.code = stand.code;
    return satz;
  };
  let ergebnis: { bytes: Uint8Array; text: string; name: string } | null = null;
  /* --- Station: verschlüsselt ablegen, danken, nach einigen Sekunden zur nächsten Person */
  let uhr: ReturnType<typeof setTimeout> | undefined;
  let laeuft = false;
  const naechstePerson = () => {
    if (uhr) { clearTimeout(uhr); uhr = undefined; }
    laeuft = false; ergebnis = null; abgegeben = false;
    const sp = plan.sprachen.find(x => gewuenscht === x || gewuenscht.startsWith(`${x}-`)) ?? erste;
    Object.assign(stand, { schritt: 'einleitung', aktuell: 0, antworten: {}, code: undefined, einwilligung: undefined, antwortId: crypto.randomUUID(), start: heute(),
      zufall: Math.floor(Math.random() * 2147483647), sprache: sp });
    zeichneKopf(); zeige(true);
    // Ansage verzögert: erst die Fokusansage der Überschrift, dann der Hinweis für die nächste Person (nicht verdrängt).
    setTimeout(() => sag(tx('stationNaechsteAnsage', { titel: planTitel(stand.sprache) })), 900);
  };
  const zeigeStationAbschluss = async () => {
    if (laeuft) return;
    laeuft = true;
    const meldung = h('p', { 'data-status': '' }, tx('verschluesselt'));
    haupt.replaceChildren(box('stationDanke', meldung));
    haupt.querySelector<HTMLElement>('h2')!.focus();
    try {
      const satz = baueSatz();
      const text = await opt.verschluessele(satz, schluessel, 'text');
      await station!.ablegen(text, satz.antwortId);
      station!.beiAbgelegt?.();
    } catch {
      laeuft = false;
      meldung.textContent = tx('stationFehler');
      meldung.setAttribute('role', 'alert');
      meldung.after(knopf(tx('stationNochmal'), 'haupt', () => void zeigeStationAbschluss(), { 'data-nochmal': '' }));
      return;
    }
    // Eingaben der Person sofort leeren: die Antwort liegt verschlüsselt im Gerät, im Speicher bleibt nichts Lesbares.
    stand.antworten = {};
    const sek = station!.wartezeit ?? 20;
    meldung.textContent = tx('stationGespeichert');
    meldung.after(
      h('p', { 'data-auto': '' }, tx('stationAuto', { n: sek })),
      h('div', { class: 'knoepfe' }, knopf(tx('stationNaechste'), 'haupt', naechstePerson, { 'data-naechste': '' })),
    );
    sag(tx('stationGespeichert'));
    uhr = setTimeout(naechstePerson, sek * 1000);
  };
  const zeigeAbschluss = async () => {
    if (station) { await zeigeStationAbschluss(); return; }
    abgegeben = false;
    const meldung = h('p', { 'data-status': '' }, tx('verschluesselt'));
    const s = box('abschlussTitel', meldung);
    haupt.replaceChildren(s);
    s.querySelector<HTMLElement>('h2')!.focus();
    if (!ergebnis) {
      try {
        const satz = baueSatz();
        const bytes = await opt.verschluessele(satz, schluessel, 'binaer');
        ergebnis = { bytes, text: armor.encode(bytes), name: `statable-antwort-${satz.antwortId.slice(0, 8)}.age` };
      } catch {
        meldung.textContent = tx('verschluesselnFehler');
        meldung.setAttribute('role', 'alert');
        return;
      }
    }
    const e = ergebnis;
    const rueckmeldung = h('p', { class: 'rueckmeldung', 'data-rueckmeldung': '' });
    const melde = (text: string, erledigt: boolean) => {
      let satz = text;
      if (erledigt) { abgegeben = true; if (loeschen()) satz += ` ${tx('zwischenGeloescht')}`; }
      rueckmeldung.textContent = satz; sag(satz);
    };
    const weg = (id: string, name: string, was: string, tue: () => void | Promise<void>, danach?: HTMLElement) =>
      h('li', {}, knopf(name, '', () => void tue(), { 'aria-describedby': `${id}-was`, 'data-weg': id }), h('p', { class: 'was', id: `${id}-was` }, was), danach);

    const feld = h('textarea', { readonly: '', rows: '8', 'data-antworttext': '', id: 'antworttext', spellcheck: 'false' });
    feld.value = e.text;
    const feldBlock = h('div', {}, h('label', { for: 'antworttext' }, tx('textFeld')), feld);
    const datei = new File([e.bytes as BlobPart], e.name, { type: 'application/octet-stream' });
    const kannTeilen = typeof navigator.canShare === 'function' && typeof navigator.share === 'function' && (() => { try { return navigator.canShare({ files: [datei] }); } catch { return false; } })();

    const liste = h('ul', { class: 'wege' });
    liste.append(weg('datei', tx('datei'), tx('dateiWas'), () => {
      try {
        const url = URL.createObjectURL(new Blob([e.bytes as BlobPart], { type: 'application/octet-stream' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: e.name });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
        melde(tx('dateiOk', { name: e.name }), true);
      } catch { melde(tx('dateiFehler'), false); }
    }));
    if (kannTeilen) liste.append(weg('teilen', tx('teilen'), tx('teilenWas'), async () => {
      sag(tx('teilenOffen'));
      try { await navigator.share({ files: [datei], title: planTitel(stand.sprache) }); melde(tx('teilenOk'), true); }
      catch (x) { melde(x instanceof DOMException && x.name === 'AbortError' ? tx('teilenAbbruch') : tx('teilenFehler'), false); }
    }));
    liste.append(weg('text', tx('text'), tx('textWas'), async () => {
      try { await navigator.clipboard.writeText(e.text); melde(tx('textOk', { n: e.text.length }), true); }
      catch { melde(tx('textFehler'), false); feld.focus(); feld.select(); }
    }, feldBlock));

    const module = qrModule(e.text);
    const qr = h('section', { 'aria-labelledby': 'qr-titel' }, h('h3', { id: 'qr-titel' }, tx('qrTitel')));
    if (module) qr.append(h('p', {}, tx('qrHinweis')), qrSvg(module, tx('qrBeschreibung')));
    else qr.append(h('p', { 'data-qr-zu-gross': '' }, tx('qrZuGross')));

    const wohin = L(plan.abschluss);
    s.append(h('p', {}, tx('abschlussEinleitung')));
    if (plan.empfaenger?.name) s.append(h('p', {}, tx('empfaengerZeile', { name: plan.empfaenger.name })));
    if (wohin) s.append(h('p', { class: 'pre', 'data-rueckgabe': '' }, wohin));
    s.append(
      h('h3', {}, tx('wegeTitel')), liste, rueckmeldung,
      h('p', {}, tx('abschlussBleiben')),
      qr,
      h('div', { class: 'rueck' }, knopf(tx('zurueckZumFragebogen'), '', () => { ergebnis = null; stand.schritt = 'seiten'; stand.aktuell = Math.max(0, ersteSeite(plan.elemente.length - 1, -1)); sichern(); zeige(true); })),
    );
    meldung.textContent = tx('verschluesseltFertig');
    sag(tx('verschluesseltFertig'));
  };

  /* --- Anzeige */
  const zeige = (fokus: boolean) => {
    if (stand.schritt === 'seiten') { zeigeSeiten(fokus); return; }
    if (stand.schritt === 'abschluss') { void zeigeAbschluss(); return; }
    const s = stand.schritt === 'einwilligung' ? zeigeEinwilligung() : stand.schritt === 'code' ? zeigeCode() : zeigeEinleitung();
    haupt.replaceChildren(s);
    if (fokus) s.querySelector<HTMLElement>('h2')!.focus();
  };
  if (!folge.includes(stand.schritt) || stand.schritt === 'abschluss') stand.schritt = stand.schritt === 'abschluss' ? 'seiten' : 'einleitung';
  zeichneKopf();
  zeige(false);
  return { ende() { if (uhr) clearTimeout(uhr); mq?.removeEventListener('change', mqBei); } };
}
