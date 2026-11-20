<script lang="ts">
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import { befundZiel, elementVon, type EditorBefund } from '../lib/fragebogenplan-editor';
  import { ed, tue } from '../lib/fragebogen-editor.svelte';
  import { pruefeQualitaet } from '../lib/qualitaetspruefung';
  import { aktuelleSprache } from '../lib/sitzung.svelte';
  import { anzeigeTitel, springeZu } from '../lib/fragebogen-aktionen.svelte';
  import Icon from './Icon.svelte';

  /**
   * Befunde (Fragebogen planen, 2C): die Prüfung der Regeln (`planPruefen` plus Editor) als Liste mit Sprunglink zum Element.
   * PLATZ FÜR MEHR LISTEN: Jede Liste hat dieselbe Form `{ regel, element, text }` (und optional `art`); mit `haken: true` bekommt jeder Befund ein Kästchen „geprüft“.
   * Die Qualitätsprüfung (Paket 2D) ist eingehängt: Sie läuft OHNE die gespeicherten Haken (sonst verschwände ein abgehakter Hinweis samt Kästchen); der Haken steht dauerhaft in `plan.geprueft` (mit Rückgängig über `tue`).
   */
  let { plan, befunde }: { plan: FragebogenPlan; befunde: EditorBefund[] } = $props();

  interface Eintrag { regel: string; element?: string; text: string; art?: 'fehler' | 'hinweis'; quelle?: string }
  interface BefundListe { id: string; titel: string; erklaerung: string; befunde: Eintrag[]; haken: boolean }

  const weitere = $derived<BefundListe[]>([{ id: 'qualitaet', haken: true, titel: L('Qualität der Fragen (Fragebogenprüfung)', 'Quality of the questions (questionnaire check)'),
    erklaerung: L('Hinweise nach festen Regeln mit Quelle, keine Urteile und keine Lesbarkeitsformel. Was passt, haken Sie als geprüft ab.', 'Notes by fixed rules with a source, no verdicts and no readability formula. Tick what fits as checked.'),
    befunde: pruefeQualitaet({ ...plan, geprueft: undefined }, aktuelleSprache()).map(h => ({ regel: h.regel, element: h.element, text: h.text, quelle: h.quelle, art: 'hinweis' as const })) }]);
  const listen = $derived<BefundListe[]>([
    { id: 'regeln', titel: L('Prüfung der Regeln', 'Check of the rules'), haken: false,
      erklaerung: L('Fehler sperren später die Exporte. Hinweise sind Vorschläge: Was passt, entscheiden Sie.', 'Errors will block the exports later. Notes are suggestions: you decide what fits.'), befunde },
    ...weitere
  ]);
  const schluessel = (l: BefundListe, b: Eintrag) => `${l.id}|${b.regel}|${b.element ?? ''}`;
  const artWort = (a: Eintrag['art']) => (a === 'fehler' ? L('Fehler', 'Error') : a === 'hinweis' ? L('Hinweis', 'Note') : L('Hinweis', 'Note'));
  const kannSpringen = (b: Eintrag) => { const z = befundZiel(plan, b.element); return !!(z.auswahl || z.liste); };
  const istGeprueft = (l: BefundListe, b: Eintrag): boolean => (l.id === 'qualitaet' ? !!(b.element && plan.geprueft?.[b.element]?.includes(b.regel)) : !!ed.geprueft[schluessel(l, b)]);
  function haken(l: BefundListe, b: Eintrag, an: boolean) {
    if (l.id === 'qualitaet' && b.element) {
      const el = b.element;
      tue(an ? L('Als geprüft markiert.', 'Marked as checked.') : L('Nicht mehr als geprüft markiert.', 'No longer marked as checked.'), p => {
        const g = { ...(p.geprueft ?? {}) }; const alt = g[el] ?? [];
        const neu = an ? [...new Set([...alt, b.regel])] : alt.filter(r => r !== b.regel);
        if (neu.length) g[el] = neu; else delete g[el];
        return { ...p, geprueft: Object.keys(g).length ? g : undefined };
      }, { leise: false });
      return;
    }
    ed.geprueft = { ...ed.geprueft, [schluessel(l, b)]: an }; sage(an ? L('Als geprüft markiert.', 'Marked as checked.') : L('Nicht mehr als geprüft markiert.', 'No longer marked as checked.')); }
  /** Regelkennung in Klartext (für Namen von Knöpfen und Kästchen); unbekannte Kennungen bleiben wie sie sind. */
  const REGELNAMEN = $derived<Record<string, string>>({
    doppelfrage: L('Doppelfrage', 'Double-barrelled question'), 'doppelte-verneinung': L('Doppelte Verneinung', 'Double negation'), lang: L('Langer Fragetext', 'Long question text'),
    suggestiv: L('Suggestive Formulierung', 'Leading wording'), 'skala-unausgewogen': L('Unausgewogene Skala', 'Unbalanced scale'), mitte: L('Keine Mitte', 'No middle option'),
    'matrix-gross': L('Große Matrix', 'Large matrix'), namen: L('Variablenname', 'Variable name'), wertelabels: L('Wertelabels', 'Value labels'), unerreichbar: L('Nicht erreichbare Frage', 'Unreachable question'),
    'barriere-bild': L('Bild ohne Alternativtext', 'Image without alt text'), 'barriere-farbe': L('Farbe als Information', 'Colour as information'), 'barriere-skala': L('Skala nur mit Zahlen', 'Scale with numbers only'),
    platzhalter: L('Vorlagentext nicht ersetzt', 'Template text not replaced')
  });
  const regelName = (r: string) => REGELNAMEN[r] ?? r;
  /** Kurzer Name des Elements, auf das ein Befund zeigt (Fragetext, auf 60 Zeichen gekürzt); leer, wenn der Befund zum ganzen Fragebogen gehört. */
  const elementName = (b: Eintrag): string => { const x = b.element ? elementVon(plan, b.element) : null; return x ? anzeigeTitel(plan, x) : ''; };
  const nFehler = (l: BefundListe) => l.befunde.filter(b => b.art === 'fehler').length;
</script>

<section class="bf" aria-label={L('Prüfergebnisse', 'Check results')}>
  <h2 id="fb-befunde-t" tabindex="-1">{L('Befunde', 'Findings')}</h2>
  {#each listen as l (l.id)}
    <div class="liste">
      <h3>{l.titel}: {Lp(l.befunde.length, '1 Befund', `${l.befunde.length} Befunde`, '1 finding', `${l.befunde.length} findings`)}{nFehler(l) ? L(` (davon ${nFehler(l)} Fehler)`, ` (${nFehler(l)} of them errors)`) : ''}</h3>
      <p class="hilfe">{l.erklaerung}</p>
      {#if l.befunde.length === 0}
        <p class="heft-text"><Icon n="haken" /> {L('Nichts gefunden.', 'Nothing found.')}</p>
      {:else}
        <ul>
          {#each l.befunde as b, i (l.id + i)}
            <li>
              <p><strong>{artWort(b.art)}</strong> <span class="regel">({b.regel})</span>: {b.text}{#if b.quelle && l.id === 'qualitaet'} <span class="regel">{L('Quelle', 'Source')}: {b.quelle}</span>{/if}</p>
              <div class="zeile">
                {#if kannSpringen(b)}<button class="k leise" type="button" aria-label={elementName(b) ? L(`Zum Element springen: ${elementName(b)}`, `Jump to the element: ${elementName(b)}`) : undefined} onclick={() => springeZu(b.element)}>{L('Zum Element springen', 'Jump to the element')}</button>{/if}
                {#if l.haken}<label class="schalter"><input type="checkbox" checked={istGeprueft(l, b)} onchange={(e) => haken(l, b, e.currentTarget.checked)}><span aria-hidden="true">{L('Geprüft', 'Checked')}</span><span class="nur-vorleser">{elementName(b) ? L(`Geprüft: ${regelName(b.regel)} bei ${elementName(b)}`, `Checked: ${regelName(b.regel)} at ${elementName(b)}`) : L(`Geprüft: ${regelName(b.regel)}`, `Checked: ${regelName(b.regel)}`)}</span></label>{/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
</section>

<style>
  .bf { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  .bf h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .bf h3 { font: 650 var(--gr-text)/1.3 var(--schrift-ui); margin: 0; }
  .liste { display: flex; flex-direction: column; gap: var(--a2); }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  li { border-inline-start: 3px solid var(--linie-stark); padding-inline-start: var(--a3); }
  li p { margin: 0; overflow-wrap: anywhere; }
  .regel { color: var(--tinte-2); font-size: var(--gr-klein); }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .zeile { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; }
  .schalter { display: flex; gap: var(--a2); align-items: center; }
</style>
