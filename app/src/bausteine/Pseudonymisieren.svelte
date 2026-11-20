<script lang="ts">
  /**
   * Personen unkenntlich machen (Pseudonymisieren), Stufe 5, Paket 5E2, Fachblatt 5D und 5E Punkt 5.
   * Rechenkern: `lib/pseudonym.ts` (nicht verändert). Zustand: `lib/pseudonymisieren.svelte.ts`. Reine Hilfen: `lib/pseudonym-ui.ts`.
   * Ansagen nur über `sage()`/`sageSpaeter()`; Rückfrage als Dialog mit `dialogFokus`; Text aus Dateien wird nur als Text angezeigt.
   * Die Zuordnungsliste geht nur in eine eigene CSV-Datei, nie in die Projektdatei.
   */
  import { tick } from 'svelte';
  import { L, Lp, s, setzeQual } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { iv, qualProjekt } from '../lib/interviews.svelte';
  import { ersetze, findeTreffer, VORAUSWAHL, zuordnungAlsCsv, type NamensArt, type RegelArt, type Treffer, type TrefferArt } from '../lib/pseudonym';
  import { beitragNr, gewaehlteSprecher, gruppiere, sprecherNamen, kontextAusschnitt, NAMENS_ARTEN, platzhalterListe, pruefeErsatzName, setzeArt, wendeErsatzAn, zaehleAn } from '../lib/pseudonym-ui';
  import { neuerName, ps } from '../lib/pseudonymisieren.svelte';
  import { herunterladen } from '../lib/export';
  import type { QualProjekt } from '../lib/qualprojekt';
  import Rechnet from './Rechnet.svelte';
  import { dialogFokus, fokusNachDialog, DIALOG_SPAET_MS } from './dialogFokus';

  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
  const lade = new Laedt();

  const ARTEN_REGEL: RegelArt[] = ['email', 'telefon', 'datum', 'plz', 'adresse', 'url', 'iban'];
  const artName = (a: TrefferArt): string => ({
    person: L('Person', 'Person'), ort: L('Ort', 'Place'), organisation: L('Organisation', 'Organisation'), sonstiges: L('Sonstiges', 'Other'),
    email: L('E-Mail', 'Email'), telefon: L('Telefon', 'Phone'), datum: L('Datum', 'Date'), plz: L('Postleitzahl', 'Postcode'),
    adresse: L('Adresse', 'Address'), url: L('Internetadresse', 'Web address'), iban: 'IBAN',
  } as Record<TrefferArt, string>)[a];

  let neuText = $state('');
  let neuArt = $state<NamensArt>('person');
  let fehler = $state('');
  let umFehler = $state('');
  let dlg = $state<HTMLDialogElement>();
  let rueck = $state<{ stellen: number; dokumente: number } | null>(null);

  const dokumente = $derived(qualProjekt()?.dokumente ?? []);
  const dokName = (id: string): string => dokumente.find(d => d.id === id)?.name ?? '';
  const gruppen = $derived(gruppiere(ps.treffer));
  const anzahl = $derived(zaehleAn(ps.treffer));
  const platzhalter = $derived(platzhalterListe(ps.treffer));
  const sprecher = $derived(sprecherNamen(qualProjekt()));
  const hatQual = $derived(dokumente.length > 0);
  /** Zahl mit Hauptwort, Einzahl und Mehrzahl richtig (Dativ bei Dokumenten, Treffern). */
  const nNamen = (n: number) => Lp(n, `${n} Name`, `${n} Namen`, `${n} name`, `${n} names`);
  const nDok = (n: number) => Lp(n, `${n} Dokument`, `${n} Dokumenten`, `${n} document`, `${n} documents`);
  const nTrefferDat = (n: number) => Lp(n, `${n} Treffer`, `${n} Treffern`, `${n} match`, `${n} matches`);
  const nTreffer = (n: number) => Lp(n, `${n} Treffer`, `${n} Treffer`, `${n} match`, `${n} matches`);

  /** Eine Beschreibung, die Screenreader vollständig lesen: Name, Art, Dokument, Beitrag, Text darum, Platzhalter. */
  function trefferTeile(t: Treffer) {
    const d = dokumente.find(x => x.id === t.dokument);
    const k = d ? kontextAusschnitt(d.text, t.start, t.ende, 40) : null;
    const nr = d ? beitragNr(d, t.start) : undefined;
    return { k, nr, dok: d?.name ?? '' };
  }

  /* ---------- Namensliste */
  async function nameHinzu() {
    fehler = '';
    const n = neuerName(neuText, neuArt);
    if (!n.text) { fehler = L('Bitte einen Namen eingeben.', 'Please enter a name.'); sage(fehler, 'dringend'); document.getElementById('pn-name')?.focus(); return; }
    if (ps.namen.some(x => x.text.toLowerCase() === n.text.toLowerCase() && x.art === n.art)) {
      fehler = L(`„${n.text}“ steht schon in der Liste.`, `"${n.text}" is already in the list.`); sage(fehler, 'dringend'); document.getElementById('pn-name')?.focus(); return;
    }
    ps.namen = [...ps.namen, n];
    neuText = '';
    sage(L(`„${n.text}“ hinzugefügt (${artName(n.art)}). ${nNamen(ps.namen.length)} in der Liste.`, `"${n.text}" added (${artName(n.art)}). ${nNamen(ps.namen.length)} in the list.`));
    document.getElementById('pn-name')?.focus();
  }
  async function nameWeg(i: number) {
    const n = ps.namen[i];
    if (!n) return;
    ps.namen = ps.namen.filter((_, k) => k !== i);
    sage(L(`„${n.text}“ entfernt. ${nNamen(ps.namen.length)} in der Liste.`, `"${n.text}" removed. ${nNamen(ps.namen.length)} in the list.`));
    await tick();
    (document.getElementById(ps.namen.length ? 'pn-namen-liste' : 'pn-name'))?.focus();
  }

  /* ---------- Treffer suchen */
  async function suchen() {
    const q = qualProjekt();
    if (!q || !q.dokumente.length) { sage(L('Es gibt noch kein Dokument. Lesen Sie zuerst ein Transkript ein.', 'There is no document yet. Read in a transcript first.'), 'dringend'); return; }
    await lade.mit(async () => {
      await new Promise(r => setTimeout(r, 30));
      const plain = $state.snapshot(q) as QualProjekt;
      const regeln = ARTEN_REGEL.filter(r => ps.regeln[r]);
      ps.treffer = findeTreffer(plain, { namen: [...($state.snapshot(ps.namen) as typeof ps.namen), ...(ps.sprecherAlsPersonen ? gewaehlteSprecher(sprecher, $state.snapshot(ps.sprecherAb)) : [])], regeln, sprecherAlsPersonen: false }, sprache());
      ps.gesucht = true; ps.umbenannt = {}; umFehler = '';
    });
    const n = ps.treffer.length, an = zaehleAn(ps.treffer);
    sageSpaeter(n === 0
      ? L('Keine Treffer gefunden. Prüfen Sie die Namensliste.', 'No matches found. Check the name list.')
      : L(`${nTreffer(n)} gefunden, ${an.stellen} davon vorausgewählt.`, `${nTreffer(n)} found, ${an.stellen} of them preselected.`), 300);
    await tick();
    document.getElementById('pn-treffer-t')?.focus();
  }
  function artAnnehmen(art: TrefferArt) {
    ps.treffer = setzeArt(ps.treffer, art, true);
    const n = ps.treffer.filter(t => t.art === art).length;
    sage(L(n === 1 ? `Der Treffer der Art ${artName(art)} ist angenommen.` : `Alle ${n} Treffer der Art ${artName(art)} angenommen.`, n === 1 ? `The match of type ${artName(art)} is accepted.` : `All ${n} matches of type ${artName(art)} accepted.`));
  }
  function vorauswahl() { ps.treffer = ps.treffer.map(t => ({ ...t, an: VORAUSWAHL[t.art] })); sage(L('Auswahl zurückgesetzt.', 'Selection reset.')); }

  /* ---------- Platzhalter umbenennen */
  function benenneUm(alt: string, wert: string) {
    umFehler = '';
    const alle = platzhalterListe(ps.treffer).map(p => ps.umbenannt[p.ersatz] ?? p.ersatz);
    const aktuell = ps.umbenannt[alt] ?? alt;
    const r = pruefeErsatzName(wert, aktuell, alle);
    if (r !== 'ok') {
      umFehler = r === 'leer' ? L('Der Platzhalter darf nicht leer sein.', 'The placeholder must not be empty.') : L('Diesen Platzhalter gibt es schon. Zwei Personen würden sonst zu einer.', 'This placeholder already exists. Two people would become one.');
      sage(umFehler, 'dringend');
      return;
    }
    ps.umbenannt = { ...ps.umbenannt, [alt]: wert.trim() };
    sage(L(`Platzhalter ist jetzt ${wert.trim()}.`, `Placeholder is now ${wert.trim()}.`));
  }
  const ersatzVon = (t: Treffer): string => ps.umbenannt[t.ersatz] ?? t.ersatz;

  /* ---------- Ersetzen, Rückgängig, Zuordnungsliste */
  function frageErsetzen() {
    if (!anzahl.stellen) { sage(L('Es ist kein Treffer angekreuzt. Es gibt nichts zu ersetzen.', 'No match is ticked. There is nothing to replace.'), 'dringend'); return; }
    rueck = anzahl;
    dlg?.showModal();
  }
  function ablegen(q: QualProjekt) { if (s.projekt) void setzeQual(q); else iv.qualEntwurf = q; }
  async function ersetzen() {
    const wahl = rueck;
    dlg?.close(); rueck = null;
    const q = qualProjekt();
    if (!q || !wahl) return;
    const vorher = $state.snapshot(q) as QualProjekt;
    const erg = ersetze(vorher, wendeErsatzAn($state.snapshot(ps.treffer) as Treffer[], $state.snapshot(ps.umbenannt)), Date.now());
    ablegen(erg.projekt);
    ps.vorher = vorher;
    ps.nachherJson = JSON.stringify($state.snapshot(qualProjekt()));
    ps.zuordnung = erg.zuordnung;
    ps.csvGespeichert = false;
    ps.zuletzt = wahl;
    ps.treffer = []; ps.gesucht = false; ps.umbenannt = {};
    sageSpaeter(Lp(wahl.stellen, `1 Stelle in ${nDok(wahl.dokumente)} ersetzt.`, `${wahl.stellen} Stellen in ${nDok(wahl.dokumente)} ersetzt.`, `1 place in ${nDok(wahl.dokumente)} replaced.`, `${wahl.stellen} places in ${nDok(wahl.dokumente)} replaced.`) + ' ' + L('Speichern Sie jetzt die Zuordnungsliste.', 'Now save the key list.'), 500);
    await tick();
    fokusNachDialog('pn-erg-t');
  }
  function rueckgaengig() {
    const v = ps.vorher;
    if (!v) return;
    if (JSON.stringify($state.snapshot(qualProjekt())) !== ps.nachherJson) {
      ps.vorher = null; ps.nachherJson = '';
      sage(L('Seit dem Ersetzen wurde im Projekt noch etwas geändert. Rückgängig ist deshalb nicht mehr möglich.', 'Something else was changed in the project since the replacement. Undo is therefore no longer possible.'), 'dringend');
      return;
    }
    ablegen(v);
    ps.vorher = null; ps.nachherJson = ''; ps.zuordnung = []; ps.zuletzt = null;
    sage(L('Das Ersetzen ist rückgängig gemacht. Die Namen stehen wieder im Text.', 'The replacement is undone. The names are back in the text.'));
  }
  function csvSpeichern() {
    const csv = zuordnungAlsCsv(ps.zuordnung, sprache());
    herunterladen(new TextEncoder().encode('﻿' + csv), L('Zuordnungsliste.csv', 'Key-list.csv'), 'text/csv;charset=utf-8');
    ps.csvGespeichert = true;
    sage(L('Zuordnungsliste als Datei gespeichert (Ordner „Downloads“). Bewahren Sie sie getrennt von den Daten auf.', 'Key list saved as a file (your "Downloads" folder). Keep it apart from the data.'));
  }
</script>

<div class="pn" role="group" aria-label={L('Personen unkenntlich machen (Pseudonymisieren)', 'Make people unrecognisable (pseudonymising)')}>
  <p class="hilfe">{L('Statable findet Namen nur, wenn Sie sie in die Liste schreiben. Lesen Sie das Transkript trotzdem einmal ganz durch.', 'Statable only finds names if you write them in the list. Please still read the transcript through once.')}</p>
  {#if !hatQual}
    <p class="hilfe">{L('Noch kein Dokument im Projekt. Lesen Sie zuerst ein Transkript ein.', 'No document in the project yet. Read in a transcript first.')}</p>
  {/if}

  <h3 id="pn-namen-t">{L('Namen, die ersetzt werden sollen', 'Names to be replaced')}</h3>
  <form class="zeile" onsubmit={(e) => { e.preventDefault(); void nameHinzu(); }}>
    <div class="eingabe"><label for="pn-name">{L('Name', 'Name')}</label>
      <input id="pn-name" type="text" autocomplete="off" maxlength="120" bind:value={neuText} aria-invalid={fehler ? 'true' : undefined} aria-describedby={fehler ? 'pn-fehler' : undefined}></div>
    <div class="eingabe"><label for="pn-art">{L('Art', 'Type')}</label>
      <select id="pn-art" bind:value={neuArt}>{#each NAMENS_ARTEN as a (a)}<option value={a}>{artName(a)}</option>{/each}</select></div>
    <button class="k" type="submit">{L('Hinzufügen', 'Add')}</button>
  </form>
  {#if fehler}<p class="fehl" id="pn-fehler">{fehler}</p>{/if}
  {#if ps.namen.length}
    <ul class="namen" id="pn-namen-liste" tabindex="-1" aria-label={L(`Namensliste, ${nNamen(ps.namen.length)}`, `Name list, ${nNamen(ps.namen.length)}`)}>
      {#each ps.namen as n, i (n.art + ':' + n.text)}
        <li><span>{n.text} ({artName(n.art)})</span>
          <button class="k klein leise" type="button" aria-label="{L('Entfernen', 'Remove')}: {n.text}" onclick={() => void nameWeg(i)}>{L('Entfernen', 'Remove')}</button></li>
      {/each}
    </ul>
  {:else}
    <p class="hilfe">{L('Die Namensliste ist noch leer.', 'The name list is still empty.')}</p>
  {/if}

  <fieldset class="regeln">
    <legend>{L('Was soll Statable suchen?', 'What should Statable look for?')}</legend>
    <label class="schalter"><input type="checkbox" bind:checked={ps.sprecherAlsPersonen}>{L('Sprechernamen als Personen', 'Speaker names as people')}</label>
    {#if ps.sprecherAlsPersonen && sprecher.length}
      <div class="sprecher" role="group" aria-label={L('Sprechernamen', 'Speaker names')}>
        {#each sprecher as n (n)}
          <label class="schalter"><input type="checkbox" checked={!ps.sprecherAb.includes(n)} onchange={(e) => { ps.sprecherAb = e.currentTarget.checked ? ps.sprecherAb.filter(x => x !== n) : [...ps.sprecherAb, n]; }}>{L(`Sprechername „${n}“ ersetzen`, `Replace speaker name "${n}"`)}</label>
        {/each}
        <p class="hilfe">{L('Ist ein Sprechername nur eine Rolle (zum Beispiel „Studentin“), nehmen Sie das Häkchen weg.', 'If a speaker name is only a role (for example "Student"), untick it.')}</p>
      </div>
    {/if}
    {#each ARTEN_REGEL as r (r)}
      <label class="schalter"><input type="checkbox" bind:checked={ps.regeln[r]}>{artName(r)}</label>
    {/each}
  </fieldset>

  <div class="knopfzeile">
    <button class="k haupt" type="button" id="pn-suchen" aria-disabled={lade.aktiv || !hatQual ? 'true' : undefined} onclick={() => { if (!lade.aktiv && hatQual) void suchen(); }}>{L('Treffer suchen', 'Find matches')}</button>
    {#if lade.sichtbar}<Rechnet text={L('Treffer werden gesucht …', 'Looking for matches …')} />{/if}
  </div>

  {#if ps.gesucht}
    <h3 id="pn-treffer-t" tabindex="-1">{L(`Treffer (${ps.treffer.length})`, `Matches (${ps.treffer.length})`)}</h3>
    {#if !ps.treffer.length}
      <p class="hilfe">{L('Keine Treffer. Prüfen Sie die Namensliste und die Kästchen oben.', 'No matches. Check the name list and the boxes above.')}</p>
    {:else}
      <p class="hilfe">{L(`${anzahl.stellen} von ${nTrefferDat(ps.treffer.length)} ${anzahl.stellen === 1 ? 'ist' : 'sind'} angekreuzt. Datum, Postleitzahl und Adresse sind aus, weil diese Regeln öfter falsch treffen.`, `${anzahl.stellen} of ${nTreffer(ps.treffer.length)} ${anzahl.stellen === 1 ? 'is' : 'are'} ticked. Date, postcode and address are off because these rules are wrong more often.`)}</p>
      {#each gruppen as g (g.art)}
        <section class="gruppe" aria-labelledby="pn-g-{g.art}">
          <h4 id="pn-g-{g.art}">{artName(g.art)} ({g.treffer.length})</h4>
          <div class="knopfzeile"><button class="k klein" type="button" aria-label="{L('Alle Treffer dieser Art annehmen', 'Accept all matches of this type')}: {artName(g.art)}" onclick={() => artAnnehmen(g.art)}>{L('Alle Treffer dieser Art annehmen', 'Accept all matches of this type')}</button></div>
          <ul class="treffer">
            {#each g.treffer as t (t.id)}
              {@const x = trefferTeile(t)}
              <li><label class="schalter"><input type="checkbox" bind:checked={t.an}>
                <span><strong>{t.text}</strong> ({artName(t.art)}) {L('in', 'in')} „{x.dok}“{#if x.nr !== undefined}, {L('Beitrag', 'contribution')} {x.nr}{/if}: {#if x.k}{x.k.davorGekuerzt ? '… ' : ''}{x.k.davor}<mark>{x.k.treffer}</mark>{x.k.danach}{x.k.danachGekuerzt ? ' …' : ''}{/if}; {L('wird zu', 'becomes')} {ersatzVon(t)}</span></label></li>
            {/each}
          </ul>
        </section>
      {/each}

      {#if platzhalter.length}
        <fieldset class="platz">
          <legend>{L('Platzhalter umbenennen (zum Beispiel „[Person 1]“ in „[Studentin A]“)', 'Rename placeholders (for example "[Person 1]" to "[Student A]")')}</legend>
          {#each platzhalter as p (p.ersatz)}
            <div class="eingabe"><label for="pn-p-{p.ersatz}">{L(`Platzhalter für „${p.klartext}“ (${artName(p.art)})`, `Placeholder for "${p.klartext}" (${artName(p.art)})`)}</label>
              <input id="pn-p-{p.ersatz}" type="text" autocomplete="off" maxlength="60" value={ps.umbenannt[p.ersatz] ?? p.ersatz} aria-describedby={umFehler ? 'pn-um-fehler' : undefined} onchange={(e) => { benenneUm(p.ersatz, e.currentTarget.value); e.currentTarget.value = ps.umbenannt[p.ersatz] ?? p.ersatz; }}></div>
          {/each}
          {#if umFehler}<p class="fehl" id="pn-um-fehler">{umFehler}</p>{/if}
        </fieldset>
      {/if}

      <div class="knopfzeile">
        <button class="k haupt" type="button" id="pn-ersetzen" onclick={frageErsetzen}>{L('Ersetzen', 'Replace')}</button>
        <button class="k leise" type="button" onclick={vorauswahl}>{L('Auswahl zurücksetzen', 'Reset selection')}</button>
      </div>
    {/if}
  {/if}

  {#if ps.zuletzt}
    <h3 id="pn-erg-t" tabindex="-1">{L('Ersetzt', 'Replaced')}</h3>
    <p>{Lp(ps.zuletzt.stellen, `1 Stelle in ${nDok(ps.zuletzt.dokumente)} ersetzt.`, `${ps.zuletzt.stellen} Stellen in ${nDok(ps.zuletzt.dokumente)} ersetzt.`, `1 place in ${nDok(ps.zuletzt.dokumente)} replaced.`, `${ps.zuletzt.stellen} places in ${nDok(ps.zuletzt.dokumente)} replaced.`)}</p>
    <div class="knopfzeile">
      <button class="k haupt" type="button" id="pn-csv" onclick={csvSpeichern}>{L('Zuordnungsliste speichern (CSV)', 'Save key list (CSV)')}</button>
      {#if ps.vorher}<button class="k" type="button" id="pn-rueck" onclick={rueckgaengig}>{L('Rückgängig', 'Undo')}</button>{/if}
    </div>
    <p class="hilfe">{L('Bewahren Sie die Zuordnungsliste getrennt von den Daten auf, am besten verschlüsselt. Wer beide hat, kann die Personen wieder erkennen.', 'Keep the key list apart from the data, ideally encrypted. Whoever has both can recognise the people again.')}
      {#if !ps.csvGespeichert} {L('Ohne Liste lässt sich die Zuordnung nicht wiederherstellen.', 'Without the list the assignment cannot be restored.')}{/if}
      {#if ps.vorher} {L('Rückgängig gilt bis zum Speichern des Projekts.', 'Undo works until the project is saved.')}{/if}</p>
  {/if}
</div>

<dialog bind:this={dlg} use:dialogFokus={{ spaet: DIALOG_SPAET_MS }} aria-labelledby="pn-dlg-t" oncancel={() => { rueck = null; }}>
  {#if rueck}
    <div class="dialog-innen pnd">
      <h2 id="pn-dlg-t" tabindex="-1">{L('Namen ersetzen?', 'Replace names?')}</h2>
      <p>{Lp(rueck.stellen, `1 Stelle in ${nDok(rueck.dokumente)} wird ersetzt. Das lässt sich nach dem Speichern nicht rückgängig machen.`, `${rueck.stellen} Stellen in ${nDok(rueck.dokumente)} werden ersetzt. Das lässt sich nach dem Speichern nicht rückgängig machen.`, `1 place in ${nDok(rueck.dokumente)} will be replaced. This cannot be undone after saving.`, `${rueck.stellen} places in ${nDok(rueck.dokumente)} will be replaced. This cannot be undone after saving.`)}</p>
      <div class="knopfzeile">
        <button class="k haupt" type="button" onclick={() => void ersetzen()}>{L('Ersetzen', 'Replace')}</button>
        <button class="k leise" type="button" onclick={() => { dlg?.close(); rueck = null; }}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </div>
  {/if}
</dialog>

<style>
  .pn { display: flex; flex-direction: column; gap: var(--a3); }
  .pn h3 { margin: var(--a3) 0 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .pn h4 { margin: 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .zeile { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: flex-end; }
  .namen { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a1); }
  .namen li { display: flex; align-items: center; gap: var(--a3); min-height: 1.75rem; }
  .regeln, .platz { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); }
  .regeln legend, .platz legend { font-weight: 600; padding: 0 var(--a1); }
  .platz { flex-direction: column; }
  .sprecher { flex-basis: 100%; display: flex; flex-direction: column; gap: var(--a1); padding-inline-start: var(--a4); }
  .gruppe { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); }
  .treffer { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a1); }
  .treffer :global(label.schalter) { align-items: flex-start; min-height: 1.75rem; overflow-wrap: anywhere; }
  mark { background: var(--akzent-hell); color: inherit; padding: 0 2px; border-radius: 2px; font-weight: 600; }
  .pnd { max-width: 32rem; }
  .pnd h2 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .pnd p { margin: 0; }
</style>
