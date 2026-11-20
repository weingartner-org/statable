<script lang="ts">
  /**
   * Kodierleitfaden-Editor (Paket 4E): Codes eines qualitativen Projekts als Baum mit Definition, Ankerbeispielen und Kodierregel (Mayring);
   * Export als Word und als REFI-QDA-Codebuch (.qdc), Einlesen eines .qdc. Der Baustein kennt den Speicher nicht: Er bekommt die Codes und
   * meldet jede Änderung über `aendern(neueListe)`. Bedienung ohne Ziehen: alles über Knöpfe, jede Verschiebung wird angesagt (`sage()`).
   * Aufbau für Screenreader: verschachtelte Listen (die Ebene sagt der Screenreader selbst an, dazu steht sie als Text im Eintrag).
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { herunterladen } from '../lib/export';
  import type { Code } from '../lib/qualprojekt';
  import { aendereCode, baumListe, eineEbeneHoeher, eineEbeneTiefer, entferne, findeKonflikte, fuegeEin, geschwister, kodierleitfadenWord, luecken, nachOben, nachUnten, neuerCode, unterkategorien, vollstaendigkeit, type Wahl } from '../lib/kodierleitfaden';
  import { QDC_MAX_BYTES, QdcFehler, leseQdc, schreibeQdc, type QdcMeldung } from '../lib/qdc';
  import { dialogFokus, DIALOG_SPAET_MS } from './dialogFokus';

  let { codes, aendern, sprache }: { codes: Code[]; aendern: (codes: Code[]) => void; sprache: 'de' | 'en' } = $props();

  interface Entwurf { id: string | null; eltern?: string; name: string; definition: string; anker: string[]; regel: string; farbeAn: boolean; farbe: string; kodierbar: boolean }
  let entwurf = $state<Entwurf | null>(null);
  let nameFehler = $state('');
  let loeschId = $state<string | null>(null);
  let loeschDlg = $state<HTMLDialogElement>();
  let importDlg = $state<HTMLDialogElement>();
  let dateiFeld = $state<HTMLInputElement>();
  let eingelesen = $state<{ codes: Code[]; konflikte: { neu: Code; bestehend: Code }[]; meldungen: QdcMeldung[] } | null>(null);
  let wahl = $state<Wahl>('beide');
  let importFehler = $state('');
  let info = $state<{ satz: string; meldungen: QdcMeldung[] } | null>(null);

  const stand = $derived(vollstaendigkeit(codes));
  const liste = $derived(baumListe(codes));
  const wurzeln = $derived(geschwister(codes, undefined));
  const loeschCode = $derived(codes.find(k => k.id === loeschId));
  const loeschUnter = $derived(loeschId ? unterkategorien(codes, loeschId).filter(k => k.elternId === loeschId).length : 0);
  const name = (id: string) => codes.find(k => k.id === id)?.name ?? '';

  /** Wo steht der Code jetzt? Für die Ansage nach jeder Änderung. */
  function stelle(neu: Code[], id: string): string {
    const e = baumListe(neu).find(x => x.code.id === id);
    if (!e) return '';
    const unter = e.eltern ? L(`, Unterkategorie von ${e.eltern.name}`, `, subcategory of ${e.eltern.name}`) : L(', Hauptkategorie', ', main category');
    return L(`${e.code.name}: Ebene ${e.ebene + 1}, Position ${e.stelle} von ${e.geschwisterZahl}${unter}.`, `${e.code.name}: level ${e.ebene + 1}, position ${e.stelle} of ${e.geschwisterZahl}${unter}.`);
  }
  async function fokus(id: string, aktion: string) {
    await tick();
    const ziel = document.querySelector<HTMLElement>(`[data-code="${CSS.escape(id)}"][data-akt="${aktion}"]:not(:disabled)`) ?? document.querySelector<HTMLElement>(`[data-code="${CSS.escape(id)}"][data-akt="bearbeiten"]`);
    ziel?.focus();
  }
  function bewege(aktion: 'oben' | 'unten' | 'hoeher' | 'tiefer', id: string) {
    const f = { oben: nachOben, unten: nachUnten, hoeher: eineEbeneHoeher, tiefer: eineEbeneTiefer }[aktion];
    const neu = f(codes, id);
    if (neu === codes) return;
    aendern(neu);
    sage(stelle(neu, id));
    fokus(id, aktion);
  }

  /* ---------- Bearbeiten und Anlegen */
  function oeffneNeu(eltern?: string) {
    entwurf = { id: null, eltern, name: '', definition: '', anker: [], regel: '', farbeAn: false, farbe: '#2b6f8a', kodierbar: true };
    nameFehler = '';
    tick().then(() => document.getElementById('kodl-name')?.focus());
  }
  function oeffneBearbeiten(id: string) {
    const k = codes.find(x => x.id === id);
    if (!k) return;
    entwurf = { id, name: k.name, definition: k.definition ?? '', anker: (k.anker ?? []).map(a => a.text), regel: k.regel ?? '', farbeAn: !!k.farbe, farbe: k.farbe ?? '#2b6f8a', kodierbar: k.kodierbar !== false };
    nameFehler = '';
    tick().then(() => document.getElementById('kodl-name')?.focus());
  }
  async function schliesse(id: string | null) {
    entwurf = null; nameFehler = '';
    await tick();
    (id ? document.querySelector<HTMLElement>(`[data-code="${CSS.escape(id)}"][data-akt="bearbeiten"]`) : document.getElementById('kodl-neu-haupt'))?.focus();
  }
  function speichere(e: SubmitEvent) {
    e.preventDefault();
    const d = entwurf;
    if (!d) return;
    if (!d.name.trim()) {
      nameFehler = L('Bitte einen Namen eingeben, z. B. „Zeitplanung“.', 'Please enter a name, e.g. "Time planning".');
      sage(nameFehler, 'dringend');
      document.getElementById('kodl-name')?.focus();
      return;
    }
    const felder = { name: d.name.trim(), definition: d.definition, anker: d.anker.map(t => ({ text: t })), regel: d.regel, farbe: d.farbeAn ? d.farbe : '', kodierbar: d.kodierbar };
    let neu: Code[], id: string;
    if (d.id) { id = d.id; neu = aendereCode(codes, id, felder); }
    else { const r = neuerCode(codes, d.name, d.eltern); id = r.id; neu = aendereCode(r.codes, id, felder); }
    aendern(neu);
    sage(d.id ? L(`„${felder.name}“ gespeichert.`, `"${felder.name}" saved.`) : L(`„${felder.name}“ angelegt. ${stelle(neu, id)}`, `"${felder.name}" created. ${stelle(neu, id)}`));
    schliesse(id);
  }

  /* ---------- Entfernen */
  function frageEntfernen(id: string) {
    loeschId = id;
    loeschDlg?.showModal();
  }
  function entfernen() {
    const id = loeschId;
    if (!id) return;
    const n = name(id), u = loeschUnter;
    aendern(entferne(codes, id));
    loeschId = null;
    loeschDlg?.close();
    sageSpaeter(u ? Lp(u, `„${n}“ entfernt. Die Unterkategorie ist eine Ebene hochgerückt.`, `„${n}“ entfernt. Die ${u} Unterkategorien sind eine Ebene hochgerückt.`, `"${n}" removed. The subcategory moved up one level.`, `"${n}" removed. The ${u} subcategories moved up one level.`) : L(`„${n}“ entfernt.`, `"${n}" removed.`), 600);
  }

  /* ---------- Export */
  const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  async function alsWord() {
    herunterladen(await kodierleitfadenWord(codes, sprache), 'Kodierleitfaden.docx', MIME_DOCX);
    sage(L('Kodierleitfaden.docx wird heruntergeladen.', 'Kodierleitfaden.docx is being downloaded.'));
  }
  function alsQdc() {
    herunterladen(new TextEncoder().encode(schreibeQdc(codes, sprache)), 'Kodierleitfaden.qdc', 'application/xml');
    sage(L('Kodierleitfaden.qdc wird heruntergeladen.', 'Kodierleitfaden.qdc is being downloaded.'));
  }

  /* ---------- Einlesen */
  function fehlerSatz(f: unknown): string {
    if (f instanceof QdcFehler) {
      const t = { doctype: L('Diese Datei enthält eine DOCTYPE-Angabe. Aus Sicherheitsgründen liest Statable sie nicht.', 'This file contains a DOCTYPE declaration. For security reasons Statable does not read it.'),
        zugross: L('Die Datei ist größer als 5 MB. Statable liest Codebücher bis 5 MB.', 'The file is larger than 5 MB. Statable reads codebooks up to 5 MB.'),
        kaputt: L('Die Datei ist kein lesbares XML. Ist es wirklich ein Codebuch (.qdc)?', 'The file is not readable XML. Is it really a codebook (.qdc)?'),
        wurzel: L('Das ist kein Codebuch. Gesucht ist eine .qdc-Datei, nicht ein ganzes Projekt (.qdpx).', 'This is not a codebook. Please choose a .qdc file, not a whole project (.qdpx).'),
        leer: L('Die Datei ist leer.', 'The file is empty.') }[f.code];
      return t;
    }
    return L('Die Datei konnte nicht gelesen werden.', 'The file could not be read.');
  }
  async function dateiGewaehlt(e: Event) {
    const feld = e.currentTarget as HTMLInputElement;
    const datei = feld.files?.[0];
    feld.value = '';
    if (!datei) return;
    importFehler = ''; info = null;
    try {
      if (datei.size > QDC_MAX_BYTES) throw new QdcFehler('zugross', sprache);
      const r = leseQdc(await datei.text(), sprache);
      const konflikte = findeKonflikte(codes, r.codes);
      if (konflikte.length) {
        eingelesen = { codes: r.codes, konflikte, meldungen: r.meldungen };
        wahl = 'beide';
        importDlg?.showModal();
      } else {
        uebernimm(r.codes, r.meldungen, {});
      }
    } catch (f) {
      importFehler = fehlerSatz(f);
      sage(importFehler, 'dringend');
    }
  }
  function uebernimm(neu: Code[], meldungen: QdcMeldung[], w: Record<string, Wahl>) {
    const r = fuegeEin(codes, neu, w);
    aendern(r.codes);
    const teile = [Lp(r.neu, `${r.neu} Code eingelesen`, `${r.neu} Codes eingelesen`, `${r.neu} code imported`, `${r.neu} codes imported`)];
    if (r.ersetzt) teile.push(Lp(r.ersetzt, `${r.ersetzt} ersetzt`, `${r.ersetzt} ersetzt`, `${r.ersetzt} replaced`, `${r.ersetzt} replaced`));
    if (r.uebersprungen) teile.push(Lp(r.uebersprungen, `${r.uebersprungen} übersprungen`, `${r.uebersprungen} übersprungen`, `${r.uebersprungen} skipped`, `${r.uebersprungen} skipped`));
    const satz = teile.join(', ') + '.';
    info = { satz, meldungen };
    sageSpaeter(satz + (meldungen.length ? ' ' + Lp(meldungen.length, `${meldungen.length} Hinweis, siehe unten.`, `${meldungen.length} Hinweise, siehe unten.`, `${meldungen.length} note, see below.`, `${meldungen.length} notes, see below.`) : ''), 600);
  }
  function einlesenBestaetigt() {
    const e = eingelesen;
    if (!e) return;
    const w: Record<string, Wahl> = {};
    for (const k of e.konflikte) w[k.neu.id] = wahl;
    importDlg?.close();
    eingelesen = null;
    uebernimm(e.codes, e.meldungen, w);
  }
  function einlesenAbbrechen() { importDlg?.close(); eingelesen = null; sageSpaeter(L('Einlesen abgebrochen. Es wurde nichts geändert.', 'Import cancelled. Nothing was changed.'), 600); }

  const hinweisText = (k: Code): string => {
    const l = luecken(k);
    return [l.ohneDefinition ? L('ohne Definition', 'no definition') : '', l.ohneAnker ? L('ohne Ankerbeispiel', 'no anchor example') : ''].filter(Boolean).join(', ');
  };
  const ueberschrift = $derived.by(() => {
    const n = stand.gesamt, od = stand.ohneDefinition;
    if (!n) return L('Kodierleitfaden (noch keine Kategorien)', 'Coding guide (no categories yet)');
    return L(`Kodierleitfaden (${n} ${n === 1 ? 'Kategorie' : 'Kategorien'}${od ? `, ${od} ohne Definition` : ''})`,
      `Coding guide (${n} ${n === 1 ? 'category' : 'categories'}${od ? `, ${od} without definition` : ''})`);
  });
</script>

{#snippet formular()}
  {#if entwurf}
    <form class="kodl-form" onsubmit={speichere} novalidate aria-labelledby="kodl-form-t">
      <h4 id="kodl-form-t">{entwurf.id ? L(`Kategorie bearbeiten: ${name(entwurf.id)}`, `Edit category: ${name(entwurf.id)}`) : entwurf.eltern ? L(`Unterkategorie von „${name(entwurf.eltern)}“ anlegen`, `Add a subcategory of "${name(entwurf.eltern)}"`) : L('Hauptkategorie anlegen', 'Add a main category')}</h4>
      <div class="eingabe"><label for="kodl-name">{L('Name (Pflicht)', 'Name (required)')}</label>
        <input id="kodl-name" type="text" bind:value={entwurf.name} maxlength="120" autocomplete="off" spellcheck="false" aria-required="true" aria-invalid={nameFehler ? 'true' : undefined} aria-describedby={nameFehler ? 'kodl-name-fehler' : undefined}></div>
      {#if nameFehler}<p id="kodl-name-fehler" class="hilfe kodl-fehler">{nameFehler}</p>{/if}
      <div class="eingabe"><label for="kodl-def">{L('Definition: Was gehört in diese Kategorie?', 'Definition: what belongs in this category?')}</label>
        <textarea id="kodl-def" rows="3" bind:value={entwurf.definition}></textarea></div>
      <fieldset class="kodl-anker">
        <legend>{L('Ankerbeispiele: typische Textstellen', 'Anchor examples: typical passages')}</legend>
        {#each entwurf.anker as _, i (i)}
          <div class="kodl-anker-zeile">
            <div class="eingabe"><label for="kodl-a-{i}">{L(`Ankerbeispiel ${i + 1}`, `Anchor example ${i + 1}`)}</label>
              <textarea id="kodl-a-{i}" rows="2" bind:value={entwurf.anker[i]}></textarea></div>
            <button class="k klein leise" type="button" onclick={() => { entwurf!.anker.splice(i, 1); sage(L(`Ankerbeispiel ${i + 1} entfernt.`, `Anchor example ${i + 1} removed.`)); tick().then(() => document.getElementById('kodl-anker-neu')?.focus()); }}>{L('Entfernen', 'Remove')}<span class="nur-vorleser"> {L(`Ankerbeispiel ${i + 1}`, `anchor example ${i + 1}`)}</span></button>
          </div>
        {/each}
        <button id="kodl-anker-neu" class="k klein" type="button" onclick={() => { entwurf!.anker.push(''); const n = entwurf!.anker.length; sage(L(`Ankerbeispiel ${n} hinzugefügt.`, `Anchor example ${n} added.`)); tick().then(() => document.getElementById(`kodl-a-${n - 1}`)?.focus()); }}>{L('Ankerbeispiel hinzufügen', 'Add anchor example')}</button>
      </fieldset>
      <div class="eingabe"><label for="kodl-regel">{L('Kodierregel: Wann gilt sie, wo grenzt sie ab?', 'Coding rule: when does it apply, where is the boundary?')}</label>
        <textarea id="kodl-regel" rows="2" bind:value={entwurf.regel}></textarea></div>
      <div class="kodl-farbe">
        <label class="schalter"><input type="checkbox" bind:checked={entwurf.farbeAn}>{L('Farbe festlegen (freiwillig)', 'Set a colour (optional)')}</label>
        {#if entwurf.farbeAn}<label class="kodl-farbwahl">{L('Farbe', 'Colour')} <input type="color" bind:value={entwurf.farbe}> <span>{entwurf.farbe}</span></label>{/if}
      </div>
      <label class="schalter"><input type="checkbox" checked={!entwurf.kodierbar} onchange={(e) => { entwurf!.kodierbar = !e.currentTarget.checked; }}>{L('Nur ordnen (dieser Code wird nicht zum Kodieren benutzt)', 'For grouping only (this code is not used for coding)')}</label>
      <div class="knopfzeile">
        <button class="k haupt" type="submit">{L('Speichern', 'Save')}</button>
        <button class="k leise" type="button" onclick={() => schliesse(entwurf?.id ?? null)}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </form>
  {/if}
{/snippet}

{#snippet ebene(vater: string | undefined, tiefe: number)}
  {@const gruppe = geschwister(codes, vater)}
  <ul class="kodl-baum">
    {#each gruppe as k, i (k.id)}
      {@const hinweis = hinweisText(k)}
      {@const eltern = vater ? name(vater) : ''}
      <li class="kodl-eintrag">
        <div class="kodl-kopf">
          <span class="kodl-name"><span class="nur-vorleser">{L(`Ebene ${tiefe + 1}${eltern ? `, Unterkategorie von ${eltern}` : ', Hauptkategorie'}: `, `Level ${tiefe + 1}${eltern ? `, subcategory of ${eltern}` : ', main category'}: `)}</span>{#if k.farbe}<span class="kodl-punkt" style="background:{k.farbe}" aria-hidden="true"></span>{/if}<strong>{k.name}</strong></span>
          {#if k.farbe}<span class="kodl-klein">{L('Farbe', 'Colour')} {k.farbe}</span>{/if}
          {#if k.kodierbar === false}<span class="kodl-klein">{L('nur ordnen', 'grouping only')}</span>{/if}
          {#if hinweis}<span class="kodl-klein kodl-hinweis">{L('Hinweis', 'Note')}: {hinweis}</span>{/if}
        </div>
        {#if k.definition}<p class="kodl-text">{k.definition}</p>{/if}
        <div class="kodl-akt" role="group" aria-label={L(`Aktionen für ${k.name}`, `Actions for ${k.name}`)}>
          <button class="k klein" type="button" data-code={k.id} data-akt="bearbeiten" aria-label="{L('Bearbeiten', 'Edit')}: {k.name}" onclick={() => oeffneBearbeiten(k.id)}>{L('Bearbeiten', 'Edit')}</button>
          <button class="k klein" type="button" data-code={k.id} data-akt="unter" aria-label="{L('Unterkategorie anlegen', 'Add subcategory')}: {k.name}" onclick={() => oeffneNeu(k.id)}>{L('Unterkategorie anlegen', 'Add subcategory')}</button>
          <button class="k klein" type="button" data-code={k.id} data-akt="hoeher" disabled={!vater} aria-label="{L('Eine Ebene höher', 'One level up')}: {k.name}" onclick={() => bewege('hoeher', k.id)}>{L('Eine Ebene höher', 'One level up')}</button>
          <button class="k klein" type="button" data-code={k.id} data-akt="tiefer" disabled={i === 0} aria-label="{L('Eine Ebene tiefer', 'One level down')}: {k.name}" onclick={() => bewege('tiefer', k.id)}>{L('Eine Ebene tiefer', 'One level down')}</button>
          <button class="k klein" type="button" data-code={k.id} data-akt="oben" disabled={i === 0} aria-label="{L('Nach oben', 'Move up')}: {k.name}" onclick={() => bewege('oben', k.id)}>{L('Nach oben', 'Move up')}</button>
          <button class="k klein" type="button" data-code={k.id} data-akt="unten" disabled={i === gruppe.length - 1} aria-label="{L('Nach unten', 'Move down')}: {k.name}" onclick={() => bewege('unten', k.id)}>{L('Nach unten', 'Move down')}</button>
          <button class="k klein leise" type="button" data-code={k.id} data-akt="entfernen" aria-label="{L('Entfernen', 'Remove')}: {k.name}" onclick={() => frageEntfernen(k.id)}>{L('Entfernen', 'Remove')}</button>
        </div>
        {#if entwurf && ((entwurf.id === k.id) || (!entwurf.id && entwurf.eltern === k.id))}{@render formular()}{/if}
        {#if geschwister(codes, k.id).length}{@render ebene(k.id, tiefe + 1)}{/if}
      </li>
    {/each}
  </ul>
{/snippet}

<section class="kodl">
  <h3 id="kodl-h" tabindex="-1">{ueberschrift}</h3>
  <p class="hilfe">{L('Der Kodierleitfaden hält fest, was in eine Kategorie gehört: mit Definition, Ankerbeispielen und Kodierregel (nach Mayring). So können zwei Personen gleich kodieren.', 'The coding guide records what belongs in a category: with a definition, anchor examples and a coding rule (after Mayring). It lets two people code in the same way.')}</p>

  <div class="knopfzeile">
    <button id="kodl-neu-haupt" class="k haupt" type="button" onclick={() => oeffneNeu()}>{L('Hauptkategorie anlegen', 'Add a main category')}</button>
    <button class="k" type="button" disabled={!codes.length} aria-describedby={codes.length ? undefined : 'kodl-leer'} onclick={alsWord}>{L('Als Word', 'As Word')}</button>
    <button class="k" type="button" disabled={!codes.length} aria-describedby={codes.length ? undefined : 'kodl-leer'} onclick={alsQdc}>{L('Als REFI-QDA-Codebuch (.qdc)', 'As REFI-QDA codebook (.qdc)')}</button>
    <input class="nur-vorleser" type="file" tabindex="-1" aria-hidden="true" accept=".qdc,.xml,application/xml,text/xml" bind:this={dateiFeld} onchange={dateiGewaehlt}>
    <button class="k" type="button" aria-describedby="kodl-einlesen-hilfe" onclick={() => dateiFeld?.click()}>{L('Codebuch einlesen (.qdc)', 'Import codebook (.qdc)')}</button>
  </div>
  <p id="kodl-einlesen-hilfe" class="hilfe">{L('Ein .qdc-Codebuch kommt aus MAXQDA, ATLAS.ti, NVivo, QualCoder und anderen Programmen. Eingelesene Codes werden angehängt; bei gleichen Namen auf derselben Ebene fragt Statable nach.', 'A .qdc codebook comes from MAXQDA, ATLAS.ti, NVivo, QualCoder and other programs. Imported codes are appended; for equal names on the same level Statable asks first.')}</p>
  {#if !codes.length}<p id="kodl-leer" class="hilfe">{L('Word und .qdc gibt es, sobald es mindestens eine Kategorie gibt.', 'Word and .qdc are available once there is at least one category.')}</p>{/if}
  {#if importFehler}<p class="hilfe kodl-fehler" id="kodl-import-fehler">{importFehler}</p>{/if}
  {#if info}
    <div class="kodl-info" id="kodl-info"><p>{info.satz}</p>
      {#if info.meldungen.length}<ul>{#each info.meldungen as m (m.art + m.satz)}<li>{m.satz}</li>{/each}</ul>{/if}</div>
  {/if}

  {#if entwurf && !entwurf.id && !entwurf.eltern}{@render formular()}{/if}

  {#if codes.length}
    <p class="hilfe" id="kodl-zaehlung">{Lp(stand.ohneAnker, `${stand.ohneAnker} Kategorie ohne Ankerbeispiel`, `${stand.ohneAnker} Kategorien ohne Ankerbeispiel`, `${stand.ohneAnker} category without an anchor example`, `${stand.ohneAnker} categories without an anchor example`)}. {L('Das ist ein Hinweis, kein Urteil: Nicht jede Kategorie braucht sofort ein Beispiel.', 'This is a note, not a verdict: not every category needs an example right away.')}</p>
    {@render ebene(undefined, 0)}
  {:else if !entwurf}
    <p class="hilfe">{L('Noch keine Kategorien. Eine Hauptkategorie anlegen oder ein Codebuch einlesen.', 'No categories yet. Add a main category or import a codebook.')}</p>
  {/if}
</section>

<dialog bind:this={loeschDlg} use:dialogFokus={{ ersatz: '#kodl-h', spaet: DIALOG_SPAET_MS }} aria-labelledby="kodl-loe-t" aria-describedby="kodl-loe-x" oncancel={() => { loeschId = null; }} onclose={() => { loeschId = null; }}>
  <div class="dialog-innen">
    <h2 id="kodl-loe-t">{L(`Kategorie „${loeschCode?.name ?? ''}“ entfernen?`, `Remove category "${loeschCode?.name ?? ''}"?`)}</h2>
    <p id="kodl-loe-x">{loeschUnter
      ? Lp(loeschUnter, 'Die Unterkategorie rückt eine Ebene hoch und bleibt erhalten.', `Die ${loeschUnter} Unterkategorien rücken eine Ebene hoch und bleiben erhalten.`, 'The subcategory moves up one level and is kept.', `The ${loeschUnter} subcategories move up one level and are kept.`)
      : L('Die Kategorie hat keine Unterkategorien.', 'The category has no subcategories.')}</p>
    <div class="knopfzeile">
      <button class="k leise" type="button" onclick={() => { loeschDlg?.close(); }}>{L('Abbrechen', 'Cancel')}</button>
      <button class="k haupt" type="button" onclick={entfernen}>{L('Entfernen', 'Remove')}</button>
    </div>
  </div>
</dialog>

<dialog bind:this={importDlg} use:dialogFokus={{ spaet: DIALOG_SPAET_MS }} aria-labelledby="kodl-imp-t" oncancel={(e) => { e.preventDefault(); einlesenAbbrechen(); }}>
  <div class="dialog-innen">
    <h2 id="kodl-imp-t">{L('Gleiche Namen gefunden', 'Equal names found')}</h2>
    {#if eingelesen}
      <p>{Lp(eingelesen.konflikte.length, 'Dieser eingelesene Code hat denselben Namen wie ein vorhandener Code auf derselben Ebene:', `Diese ${eingelesen.konflikte.length} eingelesenen Codes haben denselben Namen wie vorhandene Codes auf derselben Ebene:`, 'This imported code has the same name as an existing code on the same level:', `These ${eingelesen.konflikte.length} imported codes have the same names as existing codes on the same level:`)}</p>
      <ul>{#each eingelesen.konflikte as x (x.neu.id)}<li>{x.neu.name}</li>{/each}</ul>
      <fieldset>
        <legend>{L('Was soll geschehen?', 'What should happen?')}</legend>
        <label class="schalter"><input type="radio" name="kodl-wahl" value="beide" bind:group={wahl}>{L('Beide behalten (die eingelesenen werden zusätzlich angelegt)', 'Keep both (the imported ones are added)')}</label>
        <label class="schalter"><input type="radio" name="kodl-wahl" value="ersetzen" bind:group={wahl}>{L('Ersetzen (Definition, Ankerbeispiele, Regel und Farbe kommen aus der Datei)', 'Replace (definition, anchor examples, rule and colour come from the file)')}</label>
        <label class="schalter"><input type="radio" name="kodl-wahl" value="ueberspringen" bind:group={wahl}>{L('Überspringen (die eingelesenen mit gleichem Namen entfallen)', 'Skip (the imported ones with the same name are left out)')}</label>
      </fieldset>
    {/if}
    <div class="knopfzeile">
      <button class="k haupt" type="button" onclick={einlesenBestaetigt}>{L('Einlesen', 'Import')}</button>
      <button class="k leise" type="button" onclick={einlesenAbbrechen}>{L('Abbrechen', 'Cancel')}</button>
    </div>
  </div>
</dialog>

<style>
  .kodl { display: flex; flex-direction: column; gap: var(--a3); max-width: 60rem; }
  .kodl h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .kodl .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .kodl-fehler { color: var(--fehler, var(--tinte)); font-weight: 600; }
  .kodl-info { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); font-size: var(--gr-klein); }
  .kodl-info p { margin: 0; }
  .kodl-info ul { margin: var(--a2) 0 0; padding-inline-start: var(--a4); }
  .kodl-baum { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .kodl-baum .kodl-baum { margin-top: var(--a2); padding-inline-start: var(--a4); border-inline-start: 2px solid var(--linie); }
  .kodl-eintrag { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); background: var(--blatt); display: flex; flex-direction: column; gap: var(--a2); }
  .kodl-kopf { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a3); align-items: baseline; }
  .kodl-name { display: inline-flex; align-items: center; gap: var(--a2); }
  .kodl-punkt { width: 0.9em; height: 0.9em; border-radius: 50%; border: 1px solid var(--tinte-2); display: inline-block; }
  .kodl-klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  .kodl-hinweis { font-style: italic; }
  .kodl-text { margin: 0; }
  .kodl-akt { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .kodl-form { display: flex; flex-direction: column; gap: var(--a3); border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a3); }
  .kodl-form h4 { margin: 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .kodl-form textarea, .kodl-form input[type='text'] { width: 100%; max-width: 44rem; }
  .kodl-anker { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .kodl-anker legend { font-weight: 600; padding: 0; margin-bottom: var(--a2); }
  .kodl-anker-zeile { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: flex-end; }
  .kodl-anker-zeile .eingabe { flex: 1 1 18rem; }
  .kodl-farbe { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: center; }
  .kodl-farbwahl { display: inline-flex; gap: var(--a2); align-items: center; }
  dialog fieldset { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  dialog legend { font-weight: 600; padding: 0; margin-bottom: var(--a2); }
</style>
