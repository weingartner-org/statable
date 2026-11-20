<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { L, Lp, melde } from '../lib/sitzung.svelte';
  import type { Block, Frage, FragebogenPlan, Hinweis, Seite } from '../lib/fragebogenplan';
  import {
    aendere, elementVon, FRAGE_TYPEN, itemHinzu, itemLoeschen, itemVerschieben, leerLok, LISTEN_TYPEN, listeBenutzung, listeKopieren, neueListe, setzeName, setzeTyp, vorschlagFuer, waehleListe,
    type EditorBefund
  } from '../lib/fragebogenplan-editor';
  import { bildNameAus } from '../lib/fragebogenplan-datei';
  import { aendereText, anzeigeSprache, anzeigeTitel, artWort, loescheMitRueckfrage } from '../lib/fragebogen-aktionen.svelte';
  import { bildTypOk, bildUrl, ed, setzeBildDatei, tue } from '../lib/fragebogen-editor.svelte';
  import FragebogenLok from './FragebogenLok.svelte';
  import FragebogenBedingung from './FragebogenBedingung.svelte';
  import FragebogenKommentare from './FragebogenKommentare.svelte';
  import Icon from './Icon.svelte';

  /** Formular für das gewählte Element (Frage, Block, Hinweis) oder die gewählte Seite (Fragebogen planen, 2C). Übernommen wird beim Verlassen eines Feldes. */
  let { plan, befunde }: { plan: FragebogenPlan; befunde: EditorBefund[] } = $props();

  const x = $derived(ed.auswahl ? elementVon(plan, ed.auswahl) : null);
  const sprachen = $derived(plan.sprachen);
  const meine = $derived(x ? befunde.filter(b => b.element === x.id) : []);
  const nameBefunde = $derived(meine.filter(b => b.regel.startsWith('name')));
  const fehltIn = (regel: string, l: Record<string, string> | undefined) => meine.some(b => b.regel === regel) ? sprachen.filter(s => !l?.[s]?.trim()) : [];

  $effect(() => {
    const n = ed.fokusFormular;
    if (!n) return;
    untrack(() => { void tick().then(() => document.getElementById('fb-form')?.querySelector<HTMLElement>('input:not([type=hidden]),textarea,select')?.focus()); });
  });

  const NIVEAU = () => ({ nominal: L('nominal (Kategorien ohne Reihenfolge)', 'nominal (categories without order)'), ordinal: L('ordinal (Reihenfolge, Abstände unklar)', 'ordinal (order, distances unclear)'), skala: L('Skala (gleiche Abstände)', 'scale (equal distances)') });
  const TYP = (t: Frage['typ']) => ({
    einfach: L('Eine Antwort wählen', 'Choose one answer'), mehrfach: L('Mehrere Antworten wählen', 'Choose several answers'), zahl: L('Zahl', 'Number'), text: L('Text', 'Text'), datum: L('Datum', 'Date'),
    regler: L('Regler (mit Zahlenfeld)', 'Slider (with number field)'), rangfolge: L('Rangfolge', 'Ranking'), einwilligung: L('Einwilligung (Zustimmen)', 'Consent (agree)')
  }[t]);

  function aend<T extends Seite | Frage | Block | Hinweis>(text: string, fn: (e: T) => void) { const id = x!.id; tue(text, p => aendere<T>(p, id, fn)); }
  const zahlOderNichts = (v: string): number | undefined => (v.trim() !== '' && Number.isFinite(Number(v.replace(',', '.'))) ? Number(v.replace(',', '.')) : undefined);

  function benenne(v: string) {
    const id = x!.id, n = v.trim();
    tue(L(`Name geändert: ${n}.`, `Name changed: ${n}.`), p => setzeName(p, id, n));
  }
  function vorschlagen() { const id = x!.id; tue(L('Name aus dem Text vorgeschlagen.', 'Name suggested from the text.'), p => setzeName(p, id, vorschlagFuer(p, id))); }
  function typWechsel(t: Frage['typ']) { const id = x!.id; tue(L(`Typ geändert: ${TYP(t)}.`, `Type changed: ${TYP(t)}.`), p => setzeTyp(p, id, t)); }
  function listeWaehlen(lid: string) {
    const id = x!.id;
    tue(lid ? L('Antwortliste gewählt.', 'Answer list chosen.') : L('Antwortliste abgewählt.', 'Answer list removed.'), p => waehleListe(p, id, lid || undefined));
  }
  function neueListeAnlegen() {
    const id = x!.id, n = neueListe(plan, 'liste'), neu = waehleListe(n.plan, id, n.id);
    tue(L('Neue Antwortliste angelegt und gewählt. Hier tragen Sie die Antworten ein.', 'New answer list created and chosen. Enter the answers here.'), () => neu);
    ed.ansicht = 'listen'; ed.liste = n.id; ed.fokusAuf = 'liste:' + n.id;
  }
  function kopieren() {
    const id = x!.id, r = listeKopieren(plan, id);
    if (!r) return;
    tue(L('Eigene Kopie der Antwortliste angelegt; die anderen Fragen behalten die alte Liste.', 'Own copy of the answer list created; the other questions keep the old list.'), () => r.plan);
  }
  function listeBearbeiten(lid: string) { ed.ansicht = 'listen'; ed.liste = lid; ed.fokusAuf = 'liste:' + lid; }

  async function bildWaehlen(e: Event & { currentTarget: HTMLInputElement }) {
    const f = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!f || !x) return;
    if (!bildTypOk(f.name)) { melde(L('Dieses Bild geht nicht: erlaubt sind PNG, JPG, GIF, WebP und SVG.', 'This image does not work: PNG, JPG, GIF, WebP and SVG are allowed.')); return; }
    if (f.size > 5 * 1024 * 1024) { melde(L('Das Bild ist größer als 5 MB.', 'The image is larger than 5 MB.')); return; }
    const name = bildNameAus(f.name), bytes = new Uint8Array(await f.arrayBuffer());
    setzeBildDatei(plan.id, name, bytes);
    aend<Frage | Hinweis>(L(`Bild „${name}“ hinzugefügt. Der Alternativtext ist Pflicht, in jeder Sprache.`, `Image "${name}" added. The alternative text is required, in every language.`), el => { el.bild = { datei: name, alt: leerLok(plan) }; });
    void tick().then(() => document.getElementById('fb-bild-alt-' + sprachen[0])?.focus());
  }

  const fragePlus = $derived(x && x.art === 'frage' ? x : null);
  const blockPlus = $derived(x && x.art === 'block' ? x : null);
  const mitListe = $derived(fragePlus ? LISTEN_TYPEN.includes(fragePlus.typ) : !!blockPlus);
  const listeId = $derived(fragePlus ? fragePlus.liste ?? '' : blockPlus?.liste ?? '');
  const benutzt = $derived(listeId ? listeBenutzung(plan, listeId) : 0);
  const zeigeBild = $derived(x && (x.art === 'frage' || x.art === 'hinweis') ? x.bild : undefined);
</script>

<section class="fo" id="fb-form" aria-label={L('Bearbeiten', 'Edit')}>
  {#if !x}
    <h2>{L('Bearbeiten', 'Edit')}</h2>
    <p class="heft-text leer">{L('Wählen Sie links eine Seite, Frage, einen Block oder Hinweis. Dann lässt er sich hier bearbeiten.', 'Choose a page, question, block or note on the left. Then you can edit it here.')}</p>
  {:else}
    <h2 id="fb-form-t">{L(`Bearbeiten: ${artWort(x.art)}`, `Edit: ${artWort(x.art)}`)} <span class="sub">{anzeigeTitel(plan, x)}</span></h2>

    {#if x.art === 'seite'}
      <FragebogenLok {sprachen} label={L('Titel der Seite', 'Page title')} idBasis="fb-seitentitel" werte={x.titel} fehlt={fehltIn('sprache-fehlt', x.titel)}
        beiAenderung={(sp, t) => aend<Seite>(L(`Seitentitel (${sp}) geändert.`, `Page title (${sp}) changed.`), s => { s.titel = { ...(s.titel ?? leerLok(plan)), [sp]: t }; if (Object.values(s.titel).every(v => !v.trim())) delete s.titel; })} />
      <p class="hilfe">{L('Ohne Titel zeigt die Seite den Titel des Fragebogens. Tragen Sie einen Titel in einer Sprache ein, braucht jede Sprache einen.', 'Without a title the page shows the title of the questionnaire. If you enter a title in one language, every language needs one.')}</p>
    {:else if x.art === 'frage'}
      <FragebogenLok {sprachen} label={L('Fragetext', 'Question text')} idBasis="fb-fragetext" werte={x.text} mehrzeilig fehlt={fehltIn('sprache-fehlt', x.text)}
        beiAenderung={(sp, t) => aendereText(x.id, sp, t, L('Fragetext', 'Question text'))} />
      <FragebogenLok {sprachen} label={L('Hilfetext (optional)', 'Help text (optional)')} idBasis="fb-hilfe" werte={x.hilfe} mehrzeilig
        beiAenderung={(sp, t) => aend<Frage>(L(`Hilfetext (${sp}) geändert.`, `Help text (${sp}) changed.`), f => { f.hilfe = { ...(f.hilfe ?? leerLok(plan)), [sp]: t }; if (Object.values(f.hilfe).every(v => !v.trim())) delete f.hilfe; })} />
      <FragebogenLok {sprachen} label={L('Kurzlabel (optional)', 'Short label (optional)')} idBasis="fb-kurz" werte={x.kurz} hinweis={L('Das Kurzlabel dient als Beschriftung der Variable im Kodebuch und in der Gliederung.', 'The short label is used as the variable label in the codebook and in the outline.')}
        beiAenderung={(sp, t) => aend<Frage>(L(`Kurzlabel (${sp}) geändert.`, `Short label (${sp}) changed.`), f => { f.kurz = { ...(f.kurz ?? leerLok(plan)), [sp]: t }; if (Object.values(f.kurz).every(v => !v.trim())) delete f.kurz; })} />
    {:else if x.art === 'block'}
      <FragebogenLok {sprachen} label={L('Text des Blocks', 'Block text')} idBasis="fb-blocktext" werte={x.text} mehrzeilig fehlt={fehltIn('sprache-fehlt', x.text)}
        beiAenderung={(sp, t) => aendereText(x.id, sp, t, L('Blocktext', 'Block text'))} />
      <FragebogenLok {sprachen} label={L('Hilfetext (optional)', 'Help text (optional)')} idBasis="fb-hilfe" werte={x.hilfe} mehrzeilig
        beiAenderung={(sp, t) => aend<Block>(L(`Hilfetext (${sp}) geändert.`, `Help text (${sp}) changed.`), f => { f.hilfe = { ...(f.hilfe ?? leerLok(plan)), [sp]: t }; if (Object.values(f.hilfe).every(v => !v.trim())) delete f.hilfe; })} />
    {:else}
      <FragebogenLok {sprachen} label={L('Text des Hinweises', 'Note text')} idBasis="fb-hinweistext" werte={x.text} mehrzeilig fehlt={fehltIn('sprache-fehlt', x.text)}
        beiAenderung={(sp, t) => aend<Hinweis>(L(`Hinweistext (${sp}) geändert.`, `Note text (${sp}) changed.`), f => { f.text = { ...f.text, [sp]: t }; })} />
    {/if}

    <div class="eingabe">
      <label for="fb-name">{x.art === 'seite' ? L('Name der Seite', 'Page name') : L('Name (wird zum Variablennamen)', 'Name (becomes the variable name)')}</label>
      <div class="zeile">
        <input type="text" id="fb-name" value={x.name} aria-invalid={nameBefunde.length ? 'true' : undefined} aria-describedby={nameBefunde.length ? 'fb-name-h' : 'fb-name-r'} onchange={(e) => benenne(e.currentTarget.value)}>
        {#if x.art !== 'seite' && x.art !== 'hinweis'}<button class="k leise" type="button" onclick={vorschlagen}>{L('Aus dem Text vorschlagen', 'Suggest from the text')}</button>{/if}
      </div>
      {#if nameBefunde.length}<p class="hilfe fehler" id="fb-name-h">{nameBefunde.map(b => b.text).join(' ')}</p>
      {:else}<p class="hilfe" id="fb-name-r">{L('Buchstabe am Anfang, dann Buchstaben, Ziffern und _; keine Umlaute; höchstens 32 Zeichen.', 'Letter first, then letters, digits and _; no umlauts; at most 32 characters.')}</p>{/if}
    </div>

    {#if x.art === 'frage'}
      <div class="eingabe">
        <label for="fb-typ">{L('Art der Frage', 'Kind of question')}</label>
        <select id="fb-typ" value={x.typ} onchange={(e) => typWechsel(e.currentTarget.value as Frage['typ'])}>{#each FRAGE_TYPEN as t (t)}<option value={t}>{TYP(t)}</option>{/each}</select>
      </div>
    {/if}

    {#if x.art === 'frage' || x.art === 'block'}
      <label class="schalter"><input type="checkbox" checked={!!x.pflicht?.an} onchange={(e) => aend<Frage | Block>(e.currentTarget.checked ? L('Pflichtfrage: ja.', 'Required: yes.') : L('Pflichtfrage: nein.', 'Required: no.'), f => { if (e.currentTarget.checked) f.pflicht = { an: true }; else delete f.pflicht; })}>{L('Pflichtfrage (muss beantwortet werden)', 'Required (must be answered)')}</label>
    {/if}

    {#if mitListe}
      <fieldset class="gruppe">
        <legend>{L('Antwortliste', 'Answer list')}</legend>
        <div class="eingabe">
          <label for="fb-liste">{L('Liste dieser Frage', 'List for this question')}</label>
          <select id="fb-liste" value={listeId} onchange={(e) => listeWaehlen(e.currentTarget.value)}>
            <option value="">{L('(keine gewählt)', '(none chosen)')}</option>
            {#each plan.antwortlisten as l (l.id)}<option value={l.id}>{l.name} - {Lp(listeBenutzung(plan, l.id), 'in 1 Frage benutzt', `in ${listeBenutzung(plan, l.id)} Fragen benutzt`, 'used in 1 question', `used in ${listeBenutzung(plan, l.id)} questions`)}</option>{/each}
          </select>
        </div>
        {#if listeId}<p class="hilfe" data-testid="fb-listennutzung">{Lp(benutzt, 'Diese Liste wird in 1 Frage benutzt.', `Diese Liste wird in ${benutzt} Fragen benutzt.`, 'This list is used in 1 question.', `This list is used in ${benutzt} questions.`)}{benutzt > 1 ? ' ' + L('Eine Änderung der Liste gilt für alle diese Fragen.', 'A change to the list applies to all these questions.') : ''}</p>{/if}
        <div class="zeile">
          {#if listeId}<button class="k" type="button" onclick={() => listeBearbeiten(listeId)}>{L('Liste bearbeiten', 'Edit list')}</button>{/if}
          {#if listeId && benutzt > 1}<button class="k" type="button" onclick={kopieren}>{L('Eigene Kopie für diese Frage', 'Own copy for this question')}</button>{/if}
          <button class="k" type="button" onclick={neueListeAnlegen}><Icon n="plus" />{L('Neue Liste anlegen', 'Create new list')}</button>
        </div>
      </fieldset>
    {/if}

    {#if fragePlus && (fragePlus.typ === 'zahl' || fragePlus.typ === 'regler')}
      <fieldset class="gruppe">
        <legend>{L('Zahl-Grenzen', 'Number limits')}</legend>
        <div class="raster">
          <div class="eingabe"><label for="fb-min">{L('Kleinster Wert', 'Smallest value')}</label><input type="number" id="fb-min" value={fragePlus.zahl?.min ?? ''} onchange={(e) => aend<Frage>(L('Kleinster Wert geändert.', 'Smallest value changed.'), f => { const v = zahlOderNichts(e.currentTarget.value); f.zahl = { ganz: false, ...f.zahl }; if (v === undefined) delete f.zahl.min; else f.zahl.min = v; })}></div>
          <div class="eingabe"><label for="fb-max">{L('Größter Wert', 'Largest value')}</label><input type="number" id="fb-max" value={fragePlus.zahl?.max ?? ''} onchange={(e) => aend<Frage>(L('Größter Wert geändert.', 'Largest value changed.'), f => { const v = zahlOderNichts(e.currentTarget.value); f.zahl = { ganz: false, ...f.zahl }; if (v === undefined) delete f.zahl.max; else f.zahl.max = v; })}></div>
          {#if fragePlus.typ === 'regler'}<div class="eingabe"><label for="fb-schritt">{L('Schrittweite', 'Step')}</label><input type="number" id="fb-schritt" value={fragePlus.zahl?.schritt ?? ''} onchange={(e) => aend<Frage>(L('Schrittweite geändert.', 'Step changed.'), f => { const v = zahlOderNichts(e.currentTarget.value); f.zahl = { ganz: false, ...f.zahl }; if (v === undefined) delete f.zahl.schritt; else f.zahl.schritt = v; })}></div>{/if}
        </div>
        <label class="schalter"><input type="checkbox" checked={!!fragePlus.zahl?.ganz} onchange={(e) => aend<Frage>(e.currentTarget.checked ? L('Nur ganze Zahlen.', 'Whole numbers only.') : L('Auch Dezimalzahlen.', 'Decimal numbers allowed.'), f => { f.zahl = { ...f.zahl, ganz: e.currentTarget.checked }; })}>{L('Nur ganze Zahlen', 'Whole numbers only')}</label>
        {#if fragePlus.typ === 'zahl'}
          <FragebogenLok {sprachen} label={L('Einheit (optional)', 'Unit (optional)')} idBasis="fb-einheit" werte={fragePlus.zahl?.einheit}
            beiAenderung={(sp, t) => aend<Frage>(L(`Einheit (${sp}) geändert.`, `Unit (${sp}) changed.`), f => { f.zahl = { ganz: false, ...f.zahl }; f.zahl.einheit = { ...(f.zahl.einheit ?? leerLok(plan)), [sp]: t }; if (Object.values(f.zahl.einheit).every(v => !v.trim())) delete f.zahl.einheit; })} />
        {/if}
      </fieldset>
    {/if}

    {#if fragePlus && fragePlus.typ === 'text'}
      <fieldset class="gruppe">
        <legend>{L('Texteingabe', 'Text input')}</legend>
        <label class="schalter"><input type="checkbox" checked={!!fragePlus.text_?.mehrzeilig} onchange={(e) => aend<Frage>(e.currentTarget.checked ? L('Textfeld mehrzeilig.', 'Text field multi-line.') : L('Textfeld einzeilig.', 'Text field single-line.'), f => { f.text_ = { ...f.text_, mehrzeilig: e.currentTarget.checked }; })}>{L('Mehrzeiliges Textfeld', 'Multi-line text field')}</label>
        <div class="eingabe"><label for="fb-maxz">{L('Höchstens so viele Zeichen (leer = unbegrenzt)', 'At most this many characters (empty = unlimited)')}</label><input type="number" id="fb-maxz" min="1" value={fragePlus.text_?.maxZeichen ?? ''} onchange={(e) => aend<Frage>(L('Zeichenhöchstzahl geändert.', 'Character limit changed.'), f => { const v = zahlOderNichts(e.currentTarget.value); f.text_ = { mehrzeilig: false, ...f.text_ }; if (v === undefined || v < 1) delete f.text_.maxZeichen; else f.text_.maxZeichen = Math.floor(v); })}></div>
      </fieldset>
    {/if}

    {#if fragePlus && (fragePlus.typ === 'einfach' || fragePlus.typ === 'mehrfach')}
      <label class="schalter"><input type="checkbox" checked={!!fragePlus.anders?.an} onchange={(e) => aend<Frage>(e.currentTarget.checked ? L('Antwort „Anderes, und zwar“ eingeschaltet.', 'Answer "Other, namely" switched on.') : L('Antwort „Anderes, und zwar“ ausgeschaltet.', 'Answer "Other, namely" switched off.'), f => { if (e.currentTarget.checked) f.anders = { an: true, text: f.anders?.text ?? { ...leerLok(plan), ...Object.fromEntries(plan.sprachen.map(s => [s, s === 'de' ? 'Anderes, und zwar:' : s === 'en' ? 'Other, namely:' : ''])) } }; else delete f.anders; })}>{L('Antwort „Anderes, und zwar“ mit Textfeld', 'Answer "Other, namely" with a text field')}</label>
      {#if fragePlus.anders?.an}
        <FragebogenLok {sprachen} label={L('Text bei „Anderes“', 'Text for "Other"')} idBasis="fb-anders" werte={fragePlus.anders.text}
          beiAenderung={(sp, t) => aend<Frage>(L(`Text bei Anderes (${sp}) geändert.`, `Text for Other (${sp}) changed.`), f => { if (f.anders) f.anders = { an: true, text: { ...f.anders.text, [sp]: t } }; })} />
      {/if}
    {/if}

    {#if (fragePlus && (fragePlus.typ === 'einfach' || fragePlus.typ === 'mehrfach' || fragePlus.typ === 'rangfolge')) || blockPlus}
      <label class="schalter"><input type="checkbox" checked={!!(fragePlus ?? blockPlus)?.zufall} onchange={(e) => aend<Frage | Block>(e.currentTarget.checked ? L('Zufällige Reihenfolge der Antworten: ja.', 'Random order of the answers: yes.') : L('Zufällige Reihenfolge der Antworten: nein.', 'Random order of the answers: no.'), f => { if (e.currentTarget.checked) f.zufall = true; else delete f.zufall; })}>{L('Antworten in zufälliger Reihenfolge zeigen (die Codes bleiben gleich)', 'Show the answers in random order (the codes stay the same)')}</label>
    {/if}

    {#if fragePlus || blockPlus}
      <div class="eingabe">
        <label for="fb-niveau">{L('Messniveau', 'Level of measurement')}</label>
        <select id="fb-niveau" value={(fragePlus ?? blockPlus)!.kodebuch.niveau} onchange={(e) => aend<Frage | Block>(L(`Messniveau geändert: ${e.currentTarget.value}.`, `Level of measurement changed: ${e.currentTarget.value}.`), f => { f.kodebuch = { ...f.kodebuch, niveau: e.currentTarget.value as 'nominal' | 'ordinal' | 'skala' }; })}>
          {#each Object.entries(NIVEAU()).filter(([k]) => !blockPlus || k !== 'nominal') as [k, t] (k)}<option value={k}>{t}</option>{/each}
        </select>
        <p class="hilfe">{L('Das Messniveau geht ins Kodebuch und in die Auswertung: Mittelwerte brauchen mindestens Skalenniveau, Häufigkeiten gehen immer.', 'The level of measurement goes into the codebook and the analysis: means need at least the scale level, frequencies always work.')}</p>
      </div>
    {/if}

    {#if blockPlus}
      <fieldset class="gruppe">
        <legend>{L('Aussagen (Items) des Blocks', 'Statements (items) of the block')}</legend>
        <div class="rolle" role="region" tabindex="0" aria-label={L('Tabelle der Aussagen', 'Table of statements')}>
          <table class="items">
            <caption class="nur-vorleser">{L('Aussagen des Blocks, je eine Zeile', 'Statements of the block, one row each')}</caption>
            <thead><tr><th scope="col">{L('Nr.', 'No.')}</th>{#each sprachen as sp (sp)}<th scope="col">{L('Text', 'Text')} {sp}</th>{/each}<th scope="col">{L('Name', 'Name')}</th><th scope="col">{L('Umpolen', 'Reverse')}</th><th scope="col">{L('Ordnen', 'Arrange')}</th></tr></thead>
            <tbody>
              {#each blockPlus.items as it, i (it.id)}
                <tr>
                  <th scope="row">{i + 1}</th>
                  {#each sprachen as sp (sp)}
                    <td><input type="text" lang={sp} aria-label={L(`Text ${sp}, Aussage ${i + 1}`, `Text ${sp}, statement ${i + 1}`)} value={it.text[sp] ?? ''} onchange={(e) => aend<Block>(L(`Aussage ${i + 1} (${sp}) geändert.`, `Statement ${i + 1} (${sp}) changed.`), b => { const t = b.items.find(z => z.id === it.id); if (t) t.text = { ...t.text, [sp]: e.currentTarget.value }; })}></td>
                  {/each}
                  <td><input type="text" aria-label={L(`Name der Aussage ${i + 1}`, `Name of statement ${i + 1}`)} value={it.name} onchange={(e) => aend<Block>(L(`Name der Aussage ${i + 1} geändert.`, `Name of statement ${i + 1} changed.`), b => { const t = b.items.find(z => z.id === it.id); if (t) t.name = e.currentTarget.value.trim(); })}></td>
                  <td><label class="schalter"><input type="checkbox" checked={!!it.umgepolt} onchange={(e) => aend<Block>(e.currentTarget.checked ? L(`Aussage ${i + 1} wird umgepolt.`, `Statement ${i + 1} is reverse-coded.`) : L(`Aussage ${i + 1} wird nicht umgepolt.`, `Statement ${i + 1} is not reverse-coded.`), b => { const t = b.items.find(z => z.id === it.id); if (t) { if (e.currentTarget.checked) t.umgepolt = true; else delete t.umgepolt; } })}><span class="nur-vorleser">{L(`Aussage ${i + 1} umpolen`, `Reverse statement ${i + 1}`)}</span><span aria-hidden="true">{L('umpolen', 'reverse')}</span></label></td>
                  <td class="aktion">
                    <button class="k leise nur-symbol" type="button" aria-label={L(`Aussage ${i + 1} nach oben`, `Move statement ${i + 1} up`)} onclick={() => { const r = itemVerschieben(plan, blockPlus.id, it.id, -1); if (r.ok) tue(L(`Aussage ${i + 1} verschoben: Position ${r.stelle} von ${r.von}.`, `Statement ${i + 1} moved: position ${r.stelle} of ${r.von}.`), () => r.plan); }}><Icon n="hoch" /></button>
                    <button class="k leise nur-symbol" type="button" aria-label={L(`Aussage ${i + 1} nach unten`, `Move statement ${i + 1} down`)} onclick={() => { const r = itemVerschieben(plan, blockPlus.id, it.id, 1); if (r.ok) tue(L(`Aussage ${i + 1} verschoben: Position ${r.stelle} von ${r.von}.`, `Statement ${i + 1} moved: position ${r.stelle} of ${r.von}.`), () => r.plan); }}><Icon n="runter" /></button>
                    <button class="k leise nur-symbol" type="button" aria-label={L(`Aussage ${i + 1} löschen`, `Delete statement ${i + 1}`)} onclick={() => tue(L(`Aussage ${i + 1} gelöscht.`, `Statement ${i + 1} deleted.`), p => itemLoeschen(p, blockPlus.id, it.id))}><Icon n="zu" /></button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <button class="k" type="button" onclick={() => { const r = itemHinzu(plan, blockPlus.id); tue(L(`Aussage ${blockPlus.items.length + 1} hinzugefügt.`, `Statement ${blockPlus.items.length + 1} added.`), () => r.plan); void tick().then(() => { const z = document.querySelectorAll<HTMLInputElement>('table.items tbody tr:last-child input[type=text]'); z[0]?.focus(); }); }}><Icon n="plus" />{L('Aussage hinzufügen', 'Add statement')}</button>
      </fieldset>
    {/if}

    {#if zeigeBild !== undefined || (x.art === 'frage' || x.art === 'hinweis')}
      <fieldset class="gruppe">
        <legend>{L('Bild (optional)', 'Image (optional)')}</legend>
        {#if zeigeBild}
          {@const url = bildUrl(plan.id, zeigeBild.datei)}
          <p class="hilfe">{L(`Bild: ${zeigeBild.datei}`, `Image: ${zeigeBild.datei}`)}</p>
          {#if url}<img class="vorschaubild" src={url} alt={zeigeBild.alt[anzeigeSprache(plan)] ?? ''}>{/if}
          <FragebogenLok {sprachen} label={L('Alternativtext des Bildes (Pflicht, je Sprache)', 'Alternative text of the image (required, per language)')} idBasis="fb-bild-alt" werte={zeigeBild.alt} fehlt={fehltIn('bild-alt', zeigeBild.alt)}
            hinweis={L('Beschreiben Sie, was das Bild zeigt und wozu es da ist. Ohne diesen Text hören Menschen mit Screenreader nichts.', 'Describe what the image shows and what it is for. Without this text people with a screen reader hear nothing.')}
            beiAenderung={(sp, t) => aend<Frage | Hinweis>(L(`Alternativtext (${sp}) geändert.`, `Alternative text (${sp}) changed.`), f => { if (f.bild) f.bild = { ...f.bild, alt: { ...f.bild.alt, [sp]: t } }; })} />
          <button class="k leise" type="button" onclick={() => aend<Frage | Hinweis>(L('Bild entfernt.', 'Image removed.'), f => { delete f.bild; })}><Icon n="zu" />{L('Bild entfernen', 'Remove image')}</button>
        {:else}
          <label class="k">{L('Bild wählen', 'Choose image')}<input type="file" class="nur-vorleser" accept=".png,.jpg,.jpeg,.gif,.webp,.svg,image/*" onchange={bildWaehlen}></label>
          <p class="hilfe">{L('Höchstens 5 MB. Das Bild liegt im Projekt und in der Fragebogen-Datei.', 'At most 5 MB. The image is stored in the project and in the questionnaire file.')}</p>
        {/if}
      </fieldset>
    {/if}

    <FragebogenBedingung {plan} id={x.id} />

    {#if x.art === 'frage' || x.art === 'block'}<FragebogenKommentare {plan} id={x.id} />{/if}

    <div class="zeile">
      <button class="k" type="button" onclick={() => loescheMitRueckfrage(x.id)}><Icon n="zu" />{L(`${artWort(x.art)} löschen`, `Delete ${artWort(x.art).toLowerCase()}`)}</button>
    </div>
  {/if}
</section>

<style>
  .fo { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  .fo h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; overflow-wrap: anywhere; }
  .sub { display: block; font-size: var(--gr-text); font-weight: 400; color: var(--tinte-2); }
  .eingabe .zeile { display: flex; gap: var(--a2); flex-wrap: wrap; align-items: center; }
  .zeile { display: flex; gap: var(--a2); flex-wrap: wrap; align-items: center; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .hilfe.fehler { color: var(--tinte); font-weight: 600; }
  .gruppe { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a3); margin: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--a2); align-items: flex-start; }
  .gruppe > :global(.eingabe) { width: 100%; }
  .gruppe legend { font-size: var(--gr-klein); font-weight: 650; padding: 0 var(--a1); }
  .raster { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: var(--a2); width: 100%; }
  .schalter { display: flex; gap: var(--a2); align-items: center; }
  .leer { color: var(--tinte-2); }
  .rolle { position: relative; overflow-x: auto; max-width: 100%; width: 100%; }
  .rolle:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  table.items { border-collapse: collapse; width: 100%; }
  table.items th, table.items td { padding: var(--a1) var(--a2); text-align: start; border-bottom: 1px solid var(--linie); vertical-align: middle; }
  table.items input[type='text'] { width: 100%; min-width: 9rem; font: inherit; min-height: var(--ziel); padding: var(--a1) var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); }
  .aktion { white-space: nowrap; }
  .vorschaubild { max-width: 100%; max-height: 10rem; border: 1px solid var(--linie); }
</style>
