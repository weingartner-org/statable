<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /**
   * Skalen festlegen: welche Fragen zusammen ein Merkmal messen (z. B. „Organisation“ im LIST). Klappt auf der Seite „Spalten“ auf.
   * Steht im Handbuch des Fragebogens, nicht in den Daten - Statable rät nichts, es zeigt nur Hinweise (lib/skalen.ts).
   * Danach: Spaltenauswahl nach Skalen gegliedert (Blatt.svelte), Export als SPSS-Variablenset (lib/variablensets.ts).
   */
  import { tick } from 'svelte';
  import { s, L, d, melde, setzeSkalen } from '../lib/sitzung.svelte';
  import { skalaNameFehler, belegteFragen, skalaHinweise, type Skala } from '../lib/skalen';
  import { spaltenGruppen, gruppenSpanne } from '../lib/spaltengruppen';
  import { frageVorschlag } from '../lib/beispielvorschlag.svelte';
  import HilfeLink from './HilfeLink.svelte';

  let { offen = $bindable(false) }: { offen?: boolean } = $props();
  /** Name der Skala, die bearbeitet wird; '' = neue Skala; null = Formular zu */
  let bearbeite = $state<string | null>(null);
  let name = $state(''), gewaehlt = $state<string[]>([]), suche = $state('');
  let fehler = $state(''), status = $state(''), zuletzt = $state<Skala | null>(null);
  let statusEl = $state<HTMLElement | null>(null);

  const skalen = $derived(s.skalen);
  /** Nur Zahlenspalten: aus Text oder Datum lässt sich kein Skalenwert bilden. */
  const zahlSpalten = $derived(s.spalten.filter(sp => sp.art === 'zahl'));
  const belegt = $derived(belegteFragen(skalen, bearbeite || undefined));
  const gefiltert = $derived.by(() => {
    const q = suche.trim().toLowerCase();
    return q ? zahlSpalten.filter(sp => sp.name.toLowerCase().includes(q) || sp.bezeichnung.toLowerCase().includes(q)) : zahlSpalten;
  });
  const gruppen = $derived(spaltenGruppen(gefiltert) ?? [{ stamm: null, spalten: gefiltert }]);
  const hinweise = $derived(skalaHinweise(gewaehlt, s.spalten, s.zeilen));
  const fehlend = (sk: Skala) => sk.fragen.filter(n => !s.spalten.some(sp => sp.name === n));
  const spanneText = (v: number, b: number) => `${v}-${b}`;

  function neu(sk?: Skala) {
    bearbeite = sk ? sk.name : ''; fehler = ''; status = ''; suche = '';
    name = sk?.name ?? ''; gewaehlt = [...(sk?.fragen ?? [])];
    tick().then(() => requestAnimationFrame(() => document.getElementById('sk-name')?.focus()));
  }
  /** Reihenfolge wie in den Daten. */
  function waehle(n: string, an: boolean) {
    gewaehlt = an ? s.spalten.map(x => x.name).filter(x => x === n || gewaehlt.includes(x)) : gewaehlt.filter(x => x !== n);
  }
  async function speichern(e: SubmitEvent) {
    e.preventDefault();
    const n = name.trim();
    const f = skalaNameFehler(n, skalen, bearbeite || undefined);
    fehler = f === 'leer' ? d('Bitte gib der Skala einen Namen, z. B. „Organisation“.', 'Bitte geben Sie der Skala einen Namen, z. B. „Organisation“.', 'Please give the scale a name, e.g. "Organization".')
      : f === 'zeichen' ? L('Der Name darf kein „=“ enthalten und höchstens 64 Zeichen lang sein.', 'The name must not contain "=" and may be at most 64 characters long.')
      : f === 'vergeben' ? L(`Eine Skala „${n}“ gibt es schon.`, `A scale "${n}" already exists.`)
      : gewaehlt.length < 2 ? L('Eine Skala braucht mindestens zwei Fragen.', 'A scale needs at least two questions.') : '';
    if (fehler) { await tick(); document.getElementById('sk-fehler')?.focus(); return; }
    const sk: Skala = { name: n, fragen: [...gewaehlt] };
    await setzeSkalen(bearbeite ? skalen.map(x => (x.name === bearbeite ? sk : x)) : [...skalen, sk]);
    zuletzt = sk;
    status = L(`Skala „${n}“ gespeichert (${sk.fragen.length} Fragen). In „Neue Auswertung“ stehen die Fragen jetzt unter diesem Namen beisammen.`, `Scale "${n}" saved (${sk.fragen.length} questions). In "New analysis" the questions are now grouped under this name.`);
    melde(L(`Skala „${n}“ gespeichert.`, `Scale "${n}" saved.`), true);
    bearbeite = null;
    await tick(); statusEl?.focus();
  }
  async function loesche(sk: Skala) {
    await setzeSkalen(skalen.filter(x => x.name !== sk.name));
    zuletzt = null;
    status = L(`Skala „${sk.name}“ gelöscht. Die Spalten bleiben, wie sie sind.`, `Scale "${sk.name}" deleted. The columns stay as they are.`);
    melde(status, true);
    await tick(); statusEl?.focus();
  }
  /** Gleich prüfen, ob die Fragen zuverlässig zusammen messen (Cronbachs Alpha) - der nächste Schritt nach dem Festlegen. */
  function pruefen(sk: Skala) {
    frageVorschlag.v = { art: 'skala', w: { l1: [...sk.fragen], l2: [], l3: [], l4: [] } };
    location.hash = 'blatt/neu';
  }
</script>

<details class="auf gruppen-namen skalen" bind:open={offen} id="skalen">
  <summary>{L('Skalen festlegen', 'Define scales')} <small>{skalen.length ? skalen.map(x => x.name).join(', ') : L('welche Fragen zusammen ein Merkmal messen', 'which questions measure one trait together')}</small></summary>
  {#if offen}
  <div class="sk-inhalt">
    <p class="hilfe">{d('Eine Skala sind mehrere Fragen, die zusammen ein Merkmal messen - z. B. „Organisation“ im Lernstrategie-Fragebogen LIST. Welche Fragen dazugehören, steht im Handbuch des Fragebogens, nicht in den Daten. Statable rät das darum nicht: Du legst es hier fest.', 'Eine Skala sind mehrere Fragen, die zusammen ein Merkmal messen - z. B. „Organisation“ im Lernstrategie-Fragebogen LIST. Welche Fragen dazugehören, steht im Handbuch des Fragebogens, nicht in den Daten. Statable rät das darum nicht: Sie legen es hier fest.', 'A scale is several questions that together measure one trait - e.g. "Organization" in the LIST learning strategies questionnaire. Which questions belong to it is stated in the questionnaire manual, not in the data. That is why Statable does not guess: you define it here.')} <HilfeLink id="frage-skala" text={L('Hilfe: Zuverlässigkeit einer Skala', 'Help: reliability of a scale')} /></p>
    {#if skalen.length}
      <ul class="sk-liste" aria-label={L('Festgelegte Skalen', 'Defined scales')}>{#each skalen as sk (sk.name)}
        <li><span><b>{sk.name}</b> <small>{sk.fragen.length} {L('Fragen', 'questions')}: {sk.fragen.join(', ')}</small>
          {#if fehlend(sk).length}<br><small class="sk-warn">{L(`Es fehlen Spalten: ${fehlend(sk).join(', ')}. Die Skala gliedert nichts und geht nicht in den Export, bis ihr sie korrigiert.`, `Columns are missing: ${fehlend(sk).join(', ')}. The scale does not group anything and is not exported until it is corrected.`)}</small>{/if}</span>
          <span class="sk-knoepfe">{#if !fehlend(sk).length}<button class="k leise klein" type="button" onclick={() => pruefen(sk)}><span class="nur-vorleser">{sk.name}: </span>{L('Zuverlässigkeit prüfen', 'Check reliability')}</button>{/if}
            <button class="k leise klein" type="button" onclick={() => neu(sk)}><span class="nur-vorleser">{sk.name}: </span>{L('Bearbeiten', 'Edit')}</button>
            <button class="k leise klein" type="button" onclick={() => loesche(sk)}><span class="nur-vorleser">{sk.name}: </span>{L('Löschen', 'Delete')}</button></span></li>{/each}</ul>
    {/if}
    {#if bearbeite === null}
      <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => neu()}>{L('Neue Skala', 'New scale')}</button></div>
    {:else}
    <form class="sk-form" onsubmit={speichern} novalidate aria-label={bearbeite ? L('Skala bearbeiten', 'Edit scale') : L('Neue Skala', 'New scale')}>
      <div class="eingabe sk-name"><label for="sk-name">{L('Name der Skala (wie im Handbuch)', 'Name of the scale (as in the manual)')}</label>
        <input id="sk-name" type="text" bind:value={name} autocomplete="off" placeholder={L('z. B. Organisation', 'e.g. Organization')} aria-invalid={fehler ? 'true' : undefined} aria-describedby={fehler ? 'sk-fehler' : undefined}></div>
      <fieldset><legend>{L('Welche Fragen gehören dazu?', 'Which questions belong to it?')} <small>{L(`${gewaehlt.length} gewählt`, `${gewaehlt.length} selected`)}{gewaehlt.length ? `: ${gewaehlt.join(', ')}` : ''}</small></legend>
        <div class="eingabe sk-suche"><label for="sk-suche">{L('Fragen suchen (Name oder Text)', 'Search questions (name or text)')}</label><input id="sk-suche" type="text" enterkeyhint="search" bind:value={suche} autocomplete="off" placeholder={L('z. B. FG1 oder Notizen', 'e.g. FG1 or notes')}></div>
        <div class="sk-spalten">
          {#each gruppen as g, gi (g.stamm ?? '-')}
            {#if gruppen.length > 1}<p class="sk-block">{g.stamm ? gruppenSpanne(g, L('bis', 'to')) : L('Weitere Spalten', 'Other columns')}</p>{/if}
            {#each g.spalten as sp (sp.name)}
              {@const in_ = belegt.get(sp.name)}
              <label class:belegt={!!in_}><input type="checkbox" checked={gewaehlt.includes(sp.name)} disabled={!!in_} onchange={(e) => waehle(sp.name, e.currentTarget.checked)}><span><b>{sp.name}</b>{#if sp.bezeichnung} <small>{sp.bezeichnung}</small>{/if}{#if in_} <small class="sk-in">({L(`schon in „${in_}“`, `already in "${in_}"`)})</small>{/if}</span></label>
            {/each}
          {:else}<p class="hilfe">{L('Keine Zahlenspalte passt zur Suche.', 'No number column matches the search.')}</p>{/each}
        </div></fieldset>
      {#each hinweise as h, hi (hi)}
        {#if h.art === 'zwei'}<p class="hilfe sk-hinweis">{L('Mit nur zwei Fragen sagt die Zuverlässigkeit (Cronbachs Alpha) wenig. Steht die Skala so im Handbuch, ist es in Ordnung.', 'With only two questions, reliability (Cronbach\'s alpha) says little. If the manual defines the scale like this, that is fine.')}</p>
        {:else if h.art === 'spanne'}<p class="hilfe sk-hinweis" use:ergebnisAnsage><b>{L('Achtung:', 'Note:')}</b> {L(`Die Fragen haben verschiedene Antwortskalen: ${h.spannen.map(x => `${spanneText(x.von, x.bis)} (${x.fragen.join(', ')})`).join('; ')}. Ein Mittelwert über verschiedene Antwortskalen verzerrt den Skalenwert.`, `The questions have different answer scales: ${h.spannen.map(x => `${spanneText(x.von, x.bis)} (${x.fragen.join(', ')})`).join('; ')}. A mean across different answer scales distorts the scale score.`)} {h.ausDaten ? d('Die Spannen kommen aus den Antworten - vielleicht hat bei einer Frage nur niemand die höchste Antwort gewählt. Prüfe es im Fragebogen.', 'Die Spannen kommen aus den Antworten - vielleicht hat bei einer Frage nur niemand die höchste Antwort gewählt. Prüfen Sie es im Fragebogen.', 'The ranges come from the answers - perhaps nobody chose the highest answer for one question. Check the questionnaire.') : d('Prüfe im Fragebogen, ob die Fragen wirklich zusammengehören.', 'Prüfen Sie im Fragebogen, ob die Fragen wirklich zusammengehören.', 'Check in the questionnaire whether the questions really belong together.')}</p>{/if}
      {/each}
      <p class="hilfe">{d('Negativ formulierte Fragen (z. B. „Ich lerne ungern …“) müssen für den Skalenwert umgepolt werden. Welche das sind, zeigt die Prüfung der Zuverlässigkeit - dort kannst du sie auch umpolen.', 'Negativ formulierte Fragen (z. B. „Ich lerne ungern …“) müssen für den Skalenwert umgepolt werden. Welche das sind, zeigt die Prüfung der Zuverlässigkeit - dort können Sie sie auch umpolen.', 'Negatively worded questions (e.g. "I dislike studying …") must be reverse-coded for the scale score. The reliability check shows which ones - you can reverse-code them there as well.')}</p>
      {#if fehler}<p id="sk-fehler" class="hilfe sk-fehler" role="alert" tabindex="-1">{fehler}</p>{/if}
      <div class="knopfzeile"><button class="k haupt" type="submit">{L('Skala speichern', 'Save scale')}</button><button class="k leise" type="button" onclick={() => { bearbeite = null; fehler = ''; }}>{L('Abbrechen', 'Cancel')}</button></div>
    </form>
    {/if}
    {#if status}<p tabindex="-1" bind:this={statusEl}>{status}{#if zuletzt && skalen.some(x => x.name === zuletzt!.name)} {d('Als Nächstes: prüfen, ob die Fragen zuverlässig zusammen messen.', 'Als Nächstes: prüfen, ob die Fragen zuverlässig zusammen messen.', 'Next: check whether the questions measure reliably together.')} <button class="k klein" type="button" onclick={() => pruefen(zuletzt!)}>{L('Zuverlässigkeit prüfen', 'Check reliability')}</button>{/if}</p>{/if}
  </div>
  {/if}
</details>

<style>
  .sk-inhalt, .sk-form { display: flex; flex-direction: column; gap: var(--a3); margin-top: var(--a2); }
  .sk-inhalt > .hilfe, .sk-form .hilfe { display: block; margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); max-width: 68ch; }
  .sk-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .sk-liste li { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a3); justify-content: space-between; align-items: center; border-bottom: 1px solid var(--linie); padding-bottom: var(--a2); }
  .sk-liste small { color: var(--tinte-2); }
  .sk-warn { color: var(--fehler, var(--tinte)); }
  .sk-knoepfe { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .sk-name, .sk-suche { max-width: 28rem; }
  .sk-form fieldset { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .sk-form legend { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); padding: 0; margin-bottom: var(--a1); }
  .sk-form legend small { font-weight: 400; }
  .sk-spalten { display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: 0 var(--a4); max-height: 22rem; overflow-y: auto; border: 1px solid var(--linie); border-radius: var(--radius, 8px); padding: var(--a2) var(--a3); }
  .sk-block { grid-column: 1 / -1; margin: var(--a2) 0 0; font: 650 var(--gr-klein)/1.3 var(--schrift-ui); color: var(--tinte-2); }
  .sk-spalten label { display: flex; align-items: flex-start; gap: var(--a2); min-height: var(--ziel); padding-block: var(--a1); cursor: pointer; }
  .sk-spalten label span { min-width: 0; overflow-wrap: anywhere; }
  .sk-spalten label.belegt { cursor: default; color: var(--tinte-2); }
  .sk-spalten input { width: 18px; height: 18px; accent-color: var(--akzent); margin: 2px 0 0; flex: none; }
  .sk-spalten small { color: var(--tinte-2); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .sk-spalten small.sk-in { display: inline; }
  .sk-hinweis b { color: var(--tinte); }
  .sk-fehler { color: var(--fehler, var(--tinte)); font-weight: 600; }
</style>
