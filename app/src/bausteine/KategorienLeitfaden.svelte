<script lang="ts">
  /**
   * Kategorien und Kodierleitfaden (Welle 4, G7): anlegen, umbenennen, ordnen, zusammenführen, löschen; je Kategorie Kurzbeschreibung und Ankerbeispiel
   * (Kuckartz & Rädiker 2022, Kap. 3 und 4; Mayring 2022). Unter „Weitere Wege“: mehrere Kategorien je Antwort.
   * Alle Änderungen laufen über `tue` (Rückgängig im Blatt); Löschen und Zusammenführen gelten für beide Kodierungen.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { zitat } from '../i18n/profil';
  import { benenneKategorie, fuehreZusammen, loescheKategorie, neueKategorie, setzeModus, verschiebeKategorie, type KatHaeufigkeit } from '../lib/kategorisieren';
  import { aendereStruktur, type KatBlatt } from '../lib/kategorienblatt';
  import Icon from './Icon.svelte';
  import { herunterladen } from '../lib/export';
  import { schreibeQdc } from '../lib/qdc';
  import type { Code } from '../lib/qualprojekt';

  let { kb, h, tue, ansagen }: { kb: KatBlatt; h: KatHaeufigkeit; tue: (f: () => void) => void; ansagen: (text: string) => void } = $props();

  let modusFrage = $state(false), neuName = $state(''), fehler = $state(''), loeschFrage = $state<string | null>(null), mergeZiel = $state<Record<string, string>>({});
  const kats = $derived(kb.z.kategorien);
  const zahl = (id: string) => h.kategorien.find(x => x.id === id)?.n ?? 0;
  const gibtEs = (name: string, ausser?: string) => kats.some(k => k.id !== ausser && k.name.trim().toLowerCase() === name.trim().toLowerCase());
  /** Antworten, die beim Wechsel zu „eine Kategorie je Antwort“ mehrere Kategorien verlieren würden */
  const mehrere = $derived(Object.values(kb.z.zuordnung).filter(l => l.length > 1).length);

  /** Kategorien als REFI-QDA-Codebuch: Kurzbeschreibung wird Definition, Ankerbeispiel wird Anker (flach, eine Ebene). */
  function alsQdc() {
    const codes: Code[] = kats.map((k, i) => ({ id: k.id, name: k.name, kodierbar: true, reihenfolge: i, ...(k.beschreibung.trim() ? { definition: k.beschreibung.trim() } : {}), ...(k.beispiel.trim() ? { anker: [{ text: k.beispiel.trim() }] } : {}) }));
    herunterladen(new TextEncoder().encode(schreibeQdc(codes, L('de', 'en') === 'de' ? 'de' : 'en')), 'Kategorien.qdc', 'application/xml');
    ansagen(L('Kategorien.qdc wird heruntergeladen.', 'Kategorien.qdc is being downloaded.'));
  }

  async function anlegen(e: SubmitEvent) {
    e.preventDefault();
    const n = neuName.trim();
    fehler = !n ? L('Bitte einen Namen eingeben, z. B. „Praxisbezug“.', 'Please enter a name, e.g. "Practice".') : gibtEs(n) ? L(`Eine Kategorie „${n}“ gibt es schon.`, `A category "${n}" already exists.`) : '';
    if (fehler) { await tick(); document.getElementById('kl-name')?.focus(); return; }
    tue(() => { neueKategorie(kb.z, n); });
    ansagen(L(`Kategorie ${kats.length} „${n}“ angelegt.`, `Category ${kats.length} "${n}" created.`));
    neuName = '';
    await tick(); document.getElementById('kl-name')?.focus();
  }
  function umbenennen(id: string, feld: HTMLInputElement) {
    const n = feld.value.trim(), alt = kats.find(k => k.id === id)?.name ?? '';
    if (!n || gibtEs(n, id)) { feld.value = alt; ansagen(!n ? L('Der Name darf nicht leer sein.', 'The name must not be empty.') : L(`Eine Kategorie „${n}“ gibt es schon.`, `A category "${n}" already exists.`)); return; }
    if (n !== alt) tue(() => benenneKategorie(kb.z, id, n));
  }
  function text(id: string, feld: 'beschreibung' | 'beispiel', wert: string) {
    const k = kats.find(x => x.id === id);
    if (k && k[feld] !== wert) tue(() => { k[feld] = wert; });
  }
  async function verschiebe(id: string, richtung: -1 | 1) {
    const j = kats.findIndex(k => k.id === id), name = kats[j]?.name ?? '';
    tue(() => aendereStruktur(kb, z => verschiebeKategorie(z, id, richtung)));
    ansagen(L(`${name} ist jetzt Kategorie ${j + richtung + 1} von ${kats.length}.`, `${name} is now category ${j + richtung + 1} of ${kats.length}.`));
    await tick();
    document.querySelector<HTMLElement>(`[data-kat="${id}"] button[data-r="${richtung < 0 ? (j + richtung === 0 ? 'runter' : 'hoch') : (j + richtung === kats.length - 1 ? 'hoch' : 'runter')}"]`)?.focus();
  }
  function loesche(id: string) {
    const name = kats.find(k => k.id === id)?.name ?? '';
    tue(() => aendereStruktur(kb, z => loescheKategorie(z, id)));
    loeschFrage = null;
    ansagen(L(`Kategorie „${name}“ gelöscht.`, `Category "${name}" deleted.`));
  }
  function fuehre(id: string) {
    const ziel = mergeZiel[id], von = kats.find(k => k.id === id)?.name ?? '', nach = kats.find(k => k.id === ziel)?.name ?? '';
    if (!ziel) return;
    tue(() => aendereStruktur(kb, z => fuehreZusammen(z, id, ziel)));
    ansagen(L(`„${von}“ in „${nach}“ zusammengeführt.`, `"${von}" merged into "${nach}".`));
  }
  /** Von „mehrere“ zu „eine“ mit Zusatzzuordnungen: erst fragen, mit der Zahl der betroffenen Antworten. */
  function modusWunsch(mehrfach: boolean, feld: HTMLInputElement) {
    if (!mehrfach && mehrere > 0) { feld.checked = true; modusFrage = true; return; }
    modus(mehrfach);
  }
  function modus(mehrfach: boolean) {
    modusFrage = false;
    const verlust = !mehrfach ? mehrere : 0;
    tue(() => aendereStruktur(kb, z => setzeModus(z, mehrfach)));
    ansagen(mehrfach ? L('Jetzt können mehrere Kategorien je Antwort gewählt werden.', 'Now several categories can be chosen per answer.')
      : verlust ? Lp(verlust, `Eine Kategorie je Antwort. Bei ${verlust} Antwort blieb nur die Kategorie mit dem kleinsten Code; „Rückgängig“ holt sie zurück.`, `Eine Kategorie je Antwort. Bei ${verlust} Antworten blieb nur die Kategorie mit dem kleinsten Code; „Rückgängig“ holt sie zurück.`, `One category per answer. For ${verlust} answer only the category with the smallest code was kept; "Undo" brings it back.`, `One category per answer. For ${verlust} answers only the category with the smallest code was kept; "Undo" brings it back.`)
      : L('Eine Kategorie je Antwort.', 'One category per answer.'));
  }
</script>

<div class="kl">
  <form class="kl-neu" onsubmit={anlegen} novalidate>
    <div class="eingabe"><label for="kl-name">{L('Neue Kategorie', 'New category')}</label>
      <input id="kl-name" type="text" bind:value={neuName} maxlength="60" autocomplete="off" spellcheck="false" placeholder={L('z. B. Praxisbezug', 'e.g. Practice')} aria-invalid={fehler ? 'true' : undefined} aria-describedby={fehler ? 'kl-fehler' : undefined}></div>
    <button class="k haupt" type="submit"><Icon n="plus" />{L('Kategorie anlegen', 'Add category')}</button>
  </form>
  {#if fehler}<p id="kl-fehler" class="hilfe" role="alert">{fehler}</p>{/if}

  {#if kats.length}
    <ol class="kl-liste" aria-label={L('Kategorien', 'Categories')}>
      {#each kats as k, j (k.id)}
        <li data-kat={k.id}>
          <div class="kl-zeile">
            <span class="kl-code" aria-hidden="true">{j + 1}</span>
            <input class="kl-name" type="text" value={k.name} maxlength="60" autocomplete="off" spellcheck="false" aria-label={L(`Name der Kategorie ${j + 1}`, `Name of category ${j + 1}`)} onchange={(e) => umbenennen(k.id, e.currentTarget)}>
            <span class="kl-n">{Lp(zahl(k.id), `${zahl(k.id)} Antwort`, `${zahl(k.id)} Antworten`, `${zahl(k.id)} answer`, `${zahl(k.id)} answers`)}</span>
            <button class="k klein" type="button" data-r="hoch" disabled={j === 0} aria-label="{k.name}: {L('nach oben', 'move up')}" onclick={() => verschiebe(k.id, -1)}><Icon n="hoch" /></button>
            <button class="k klein" type="button" data-r="runter" disabled={j === kats.length - 1} aria-label="{k.name}: {L('nach unten', 'move down')}" onclick={() => verschiebe(k.id, 1)}><Icon n="runter" /></button>
            <button class="k klein leise" type="button" aria-label="{k.name}: {L('löschen', 'delete')}" onclick={() => (zahl(k.id) ? (loeschFrage = k.id) : loesche(k.id))}><Icon n="x" /></button>
          </div>
          {#if loeschFrage === k.id}
            <p class="kl-frage" role="alert">{Lp(zahl(k.id), `Die Zuordnung dieser einen Antwort zu ${zitat(k.name)} entfällt; die Antwort ist danach wieder offen.`, `Die ${zahl(k.id)} Zuordnungen zu ${zitat(k.name)} entfallen; die Antworten sind danach wieder offen.`, `The assignment of this one answer to ${zitat(k.name)} is removed; the answer is open again afterwards.`, `The ${zahl(k.id)} assignments to ${zitat(k.name)} are removed; the answers are open again afterwards.`)}
              <button class="k klein haupt" type="button" onclick={() => loesche(k.id)}>{L('Löschen', 'Delete')}</button> <button class="k klein leise" type="button" onclick={() => (loeschFrage = null)}>{L('Abbrechen', 'Cancel')}</button></p>
          {/if}
          <details class="auf kl-mehr">
            <summary>{L('Beschreibung, Ankerbeispiel, zusammenführen', 'Description, anchor example, merge')}{#if k.beschreibung || k.beispiel} <small>({L('ausgefüllt', 'filled in')})</small>{/if}</summary>
            <div class="eingabe"><label for="kl-b-{k.id}">{L('Kurzbeschreibung: Was gehört in diese Kategorie?', 'Short description: what belongs in this category?')}</label>
              <textarea id="kl-b-{k.id}" rows="2" maxlength="300" value={k.beschreibung} onchange={(e) => text(k.id, 'beschreibung', e.currentTarget.value.trim())}></textarea></div>
            <div class="eingabe"><label for="kl-a-{k.id}">{L('Ankerbeispiel: eine typische Antwort', 'Anchor example: a typical answer')}</label>
              <textarea id="kl-a-{k.id}" rows="2" maxlength="300" value={k.beispiel} onchange={(e) => text(k.id, 'beispiel', e.currentTarget.value.trim())}></textarea></div>
            {#if kats.length > 1}
              <div class="kl-merge"><div class="eingabe"><label for="kl-m-{k.id}">{L('Zusammenführen mit', 'Merge into')}</label>
                <select id="kl-m-{k.id}" value={mergeZiel[k.id] ?? ''} onchange={(e) => (mergeZiel[k.id] = e.currentTarget.value)}>
                  <option value="">{L('Kategorie wählen …', 'Choose a category …')}</option>
                  {#each kats.filter(x => x.id !== k.id) as x (x.id)}<option value={x.id}>{x.name}</option>{/each}
                </select></div>
                <button class="k" type="button" disabled={!mergeZiel[k.id]} onclick={() => fuehre(k.id)}>{L('Zusammenführen', 'Merge')}</button></div>
              <p class="hilfe">{L('Die Zuordnungen wandern zur gewählten Kategorie, diese hier entfällt.', 'The assignments move to the chosen category; this one is removed.')}</p>
            {/if}
          </details>
        </li>
      {/each}
    </ol>
    <div class="knopfzeile"><button class="k" type="button" onclick={alsQdc}>{L('Kategorien als REFI-QDA-Codebuch (.qdc)', 'Categories as REFI-QDA codebook (.qdc)')}</button></div>
    <p class="hilfe">{L('Beschreibung und Ankerbeispiel bilden den Kodierleitfaden: Er hält fest, was in eine Kategorie gehört, und hilft einer zweiten Person, genauso zuzuordnen.', 'Description and anchor example form the coding guide: it records what belongs in a category and helps a second person to assign in the same way.')}</p>
  {:else}
    <p class="hilfe">{L('Noch keine Kategorie. Tipp: erst eine Auswahl von Antworten lesen, dann die Kategorien festlegen. Wer „passt nirgends“ braucht, legt eine Kategorie „Sonstiges“ an.', 'No category yet. Tip: read a sample of the answers first, then define the categories. If you need "fits nowhere", create a category "Other".')}</p>
  {/if}

  <details class="auf" open={kb.z.mehrfach}>
    <summary>{L('Weitere Wege', 'More options')}</summary>
    <label class="schalter"><input type="checkbox" checked={kb.z.mehrfach} onchange={(e) => modusWunsch(e.currentTarget.checked, e.currentTarget)}>{L('Mehrere Kategorien je Antwort', 'Several categories per answer')}</label>
    {#if modusFrage}<p class="kl-frage" role="alert">{Lp(mehrere, `Bei ${mehrere} Antwort bleibt nur die erste Kategorie.`, `Bei ${mehrere} Antworten bleibt nur die erste Kategorie.`, `For ${mehrere} answer only the first category stays.`, `For ${mehrere} answers only the first category stays.`)} {L('„Rückgängig“ holt die Zuordnungen zurück.', '"Undo" brings the assignments back.')}
      <button class="k klein haupt" type="button" onclick={() => modus(false)}>{L('Trotzdem wechseln', 'Switch anyway')}</button> <button class="k klein leise" type="button" onclick={() => (modusFrage = false)}>{L('Abbrechen', 'Cancel')}</button></p>{/if}
    <p class="hilfe">{kb.z.mehrfach
      ? L('Eine Antwort kann mehreren Kategorien angehören. Die Ergebnisspalten sind dann je Kategorie eine 0/1-Spalte (als Mehrfachantworten-Set); die Prozente der Personen ergeben zusammen mehr als 100 %.', 'An answer can belong to several categories. The result columns are then one 0/1 column per category (as a multiple response set); the percentages of people add up to more than 100%.')
      : L('Voreinstellung: eine Kategorie je Antwort. Die Ergebnisspalte ist eine Gruppenspalte mit den Codes 1 bis k.', 'Default: one category per answer. The result column is a group column with the codes 1 to k.')}</p>
    {#if kb.z.mehrfach && mehrere}<p class="hilfe">{Lp(mehrere, `Beim Zurückwechseln zu „eine Kategorie je Antwort“ behält ${mehrere} Antwort nur die Kategorie mit dem kleinsten Code.`, `Beim Zurückwechseln zu „eine Kategorie je Antwort“ behalten ${mehrere} Antworten nur die Kategorie mit dem kleinsten Code.`, `When switching back to "one category per answer", ${mehrere} answer keeps only the category with the smallest code.`, `When switching back to "one category per answer", ${mehrere} answers keep only the category with the smallest code.`)}</p>{/if}
  </details>
</div>

<style>
  .kl { display: flex; flex-direction: column; gap: var(--a3); max-width: 52rem; }
  .kl-neu { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: flex-end; }
  .kl-neu .eingabe { flex: 1 1 16rem; }
  .kl .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .kl-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .kl-liste > li { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2); background: var(--blatt); display: flex; flex-direction: column; gap: var(--a2); }
  .kl-zeile { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; }
  .kl-code { font: 650 var(--gr-klein) var(--schrift-ui); color: var(--tinte-2); min-width: 1.6em; text-align: right; }
  .kl-name { flex: 1 1 12rem; min-width: 0; }
  .kl-n { color: var(--tinte-2); font-size: var(--gr-klein); white-space: nowrap; }
  .kl-frage { margin: 0; font-size: var(--gr-klein); }
  .kl-mehr { border: 0; }
  .kl-mehr :global(.eingabe) { margin: var(--a2) 0; }
  .kl-mehr textarea { width: 100%; max-width: 40rem; }
  .kl-merge { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: flex-end; }
  .kl :global(.ico) { width: 1em; height: 1em; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
</style>
