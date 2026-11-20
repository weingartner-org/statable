<script lang="ts">
  /**
   * Mehrfachantworten-Sets definieren (Fragebogen „Mehreres ankreuzen“): mehrere 0/1-Spalten zu einem Set mit Namen und Beschriftung.
   * Klappt auf der Seite „Spalten“ auf. Die Sets stehen im Projekt (sitzung.svelte.ts: s.sets) und erscheinen danach in den Fragen
   * „Wie verteilt sich etwas?“ und „Kommt etwas in Gruppen unterschiedlich oft vor?“. Rechnung: lib/mehrfach.ts.
   */
  import { istFehlend } from '../lib/fehlend';
  import { tick } from 'svelte';
  import { s, L, Lp, d, melde, setzeSets } from '../lib/sitzung.svelte';
  import { dez } from '../i18n/profil';
  import { lesbar } from '../lib/verzeichnis';
  import { schlageSetsVor, setNameFehler, zaehlwertVorschlag, type MehrfachSet, type SetVorschlag } from '../lib/mehrfach';
  import HilfeLink from './HilfeLink.svelte';

  let offen = $state(false);
  /** Name des Sets, das bearbeitet wird; '' = neues Set; null = Formular zu */
  let bearbeite = $state<string | null>(null);
  let name = $state(''), label = $state(''), gewaehlt = $state<string[]>([]), zaehl = $state('');
  let fehler = $state(''), status = $state('');
  let statusEl = $state<HTMLElement | null>(null);

  const sets = $derived(s.sets);
  const vorschlaege = $derived(schlageSetsVor(s.spalten, s.zeilen, s.sets));
  const nichtDatum = $derived(s.spalten.filter(sp => sp.art !== 'datum'));
  const spalte = (n: string) => s.spalten.find(x => x.name === n);
  const wertText = (w: string | number) => dez(String(w));
  /** Die Werte, die in den gewählten Spalten vorkommen (ohne „keine Angabe“): davon einer bedeutet „angekreuzt“. */
  const werte = $derived.by(() => {
    const m = new Map<string, string | number>();
    for (const n of gewaehlt) {
      const j = s.spalten.findIndex(x => x.name === n), sp = s.spalten[j]; if (!sp) continue;
      for (const z of s.zeilen) { const v = z[j]; if (v === null || v === undefined || v === '' || (typeof v === 'number' && istFehlend(sp, v))) continue; m.set(String(v), v); }
    }
    return [...m.values()].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de'))).slice(0, 30);
  });
  const wertName = (w: string | number) => { const l = spalte(gewaehlt[0] ?? '')?.werteLabels[String(w)]; return l ? `${wertText(w)} = ${l}` : wertText(w); };

  function neu(v?: SetVorschlag, set?: MehrfachSet) {
    bearbeite = set ? set.name : ''; fehler = ''; status = '';
    name = set?.name ?? v?.name ?? ''; label = set?.label ?? v?.label ?? ''; gewaehlt = [...(set?.spalten ?? v?.spalten ?? [])];
    zaehl = String(set?.zaehlwert ?? v?.zaehlwert ?? '');
    if (!zaehl && gewaehlt.length) zaehl = String(zaehlwertVorschlag(werte.filter((w): w is number => typeof w === 'number'), w => spalte(gewaehlt[0]!)?.werteLabels[String(w)] ?? ''));
    tick().then(() => requestAnimationFrame(() => document.getElementById('ms-name')?.focus()));
  }
  function waehle(n: string, an: boolean) {
    gewaehlt = an ? s.spalten.map(x => x.name).filter(x => x === n || gewaehlt.includes(x)) : gewaehlt.filter(x => x !== n);
    if (!werte.some(w => String(w) === zaehl)) zaehl = werte.length ? String(zaehlwertVorschlag(werte.filter((w): w is number => typeof w === 'number'), w => spalte(gewaehlt[0]!)?.werteLabels[String(w)] ?? '')) : '';
  }
  async function speichern(e: SubmitEvent) {
    e.preventDefault();
    const n = name.trim();
    const f = setNameFehler(n, sets, s.spalten, bearbeite || undefined);
    const wert = werte.find(w => String(w) === zaehl);
    fehler = f === 'form' ? L('Der Name muss mit einem Buchstaben beginnen und darf nur Buchstaben, Ziffern und Unterstriche enthalten.', 'The name must start with a letter and may only contain letters, digits and underscores.')
      : f === 'vergeben' ? L(`„${n}“ gibt es schon als Set oder Spalte.`, `"${n}" already exists as a set or column.`)
      : gewaehlt.length < 2 ? L('Bitte mindestens zwei Spalten wählen.', 'Please choose at least two columns.')
      : wert === undefined ? L('Bitte sagen, welcher Wert „angekreuzt“ bedeutet.', 'Please say which value means "checked".') : '';
    if (fehler) { await tick(); document.getElementById('ms-fehler')?.focus(); return; }
    const neuesSet: MehrfachSet = { name: n, label: label.trim() || n, spalten: [...gewaehlt], zaehlwert: wert! };
    const aus = bearbeite ? sets.map(x => (x.name === bearbeite ? neuesSet : x)) : [...sets, neuesSet];
    await setzeSets(aus);
    status = d(`Set „${neuesSet.label}“ gespeichert (${gewaehlt.length} Spalten). Du findest es als „${neuesSet.label}“ in den Fragen nach Verteilung und Gruppen.`, `Set „${neuesSet.label}“ gespeichert (${gewaehlt.length} Spalten). Sie finden es als „${neuesSet.label}“ in den Fragen nach Verteilung und Gruppen.`, `Set "${neuesSet.label}" saved (${gewaehlt.length} columns). You will find it in the questions on distribution and groups.`);
    melde(L(`Set „${neuesSet.label}“ gespeichert.`, `Set "${neuesSet.label}" saved.`), true);
    bearbeite = null;
    await tick(); statusEl?.focus();
  }
  async function loesche(set: MehrfachSet) {
    await setzeSets(sets.filter(x => x.name !== set.name));
    status = L(`Set „${set.label}“ gelöscht. Die Spalten bleiben, wie sie sind.`, `Set "${set.label}" deleted. The columns stay as they are.`);
    melde(status, true);
    await tick(); statusEl?.focus();
  }
  const luecke = (set: MehrfachSet) => set.spalten.filter(n => !spalte(n));
</script>

<details class="auf gruppen-namen mehrfachsets" bind:open={offen}>
  <summary>{L('Mehrfachantworten-Set definieren', 'Define a multiple response set')} <small>{sets.length ? Lp(sets.length, `${sets.length} Set`, `${sets.length} Sets`, `${sets.length} set`, `${sets.length} sets`) : L('Fragen mit „Mehreres ankreuzen“', 'questions with "check all that apply"')}{vorschlaege.length && !offen ? ' · ' + L('Vorschlag vorhanden', 'suggestion available') : ''}</small></summary>
  {#if offen}
  <div class="ms-inhalt">
    <p class="hilfe">{d('Bei „Welche Medien nutzt du? Mehreres ankreuzen“ steht jede Option in einer eigenen Spalte (angekreuzt = 1, sonst 0). Ein Set fasst diese Spalten zu einer Frage zusammen. Dann zählt Statable, wie viele Personen jede Option genannt haben.', 'Bei „Welche Medien nutzen Sie? Mehreres ankreuzen“ steht jede Option in einer eigenen Spalte (angekreuzt = 1, sonst 0). Ein Set fasst diese Spalten zu einer Frage zusammen. Dann zählt Statable, wie viele Personen jede Option genannt haben.', 'In a question like "Which media do you use? Check all that apply", each option sits in its own column (checked = 1, otherwise 0). A set combines these columns into one question. Statable then counts how many people named each option.')} <HilfeLink id="frage-mehrfachantworten" text={L('Hilfe: Mehrfachantworten', 'Help: multiple responses')} /></p>
    {#if sets.length}
      <ul class="ms-liste" aria-label={L('Vorhandene Sets', 'Existing sets')}>{#each sets as set (set.name)}
        <li><span><b>{set.label}</b> <small>${set.name} · {set.spalten.length} {L('Spalten', 'columns')}: {set.spalten.slice(0, 3).join(', ')}{set.spalten.length > 3 ? ' …' : ''} · {L('angekreuzt =', 'checked =')} {wertText(set.zaehlwert)}</small>
          {#if luecke(set).length}<br><small class="ms-warn">{L(`Es fehlen Spalten: ${luecke(set).join(', ')}. Das Set steht in den Fragen nicht zur Wahl, bis ihr es korrigiert.`, `Columns are missing: ${luecke(set).join(', ')}. The set is not offered in the questions until it is corrected.`)}</small>{/if}</span>
          <span class="ms-knoepfe"><button class="k leise klein" type="button" onclick={() => neu(undefined, set)}><span class="nur-vorleser">{set.label}: </span>{L('Bearbeiten', 'Edit')}</button>
            <button class="k leise klein" type="button" onclick={() => loesche(set)}><span class="nur-vorleser">{set.label}: </span>{L('Löschen', 'Delete')}</button></span></li>{/each}</ul>
    {/if}
    {#if bearbeite === null && vorschlaege.length}
      <div class="ms-vorschlag" role="group" aria-label={L('Vorschläge', 'Suggestions')}>
        <p class="hilfe">{d('Statable hat in deinen Daten Spalten gefunden, die zusammengehören:', 'Statable hat in Ihren Daten Spalten gefunden, die zusammengehören:', 'Statable found columns in your data that belong together:')}</p>
        {#each vorschlaege as v (v.name)}<button class="k" type="button" onclick={() => neu(v)}>{L(`Set „${v.name}“ aus ${v.spalten.length} Spalten`, `Set "${v.name}" from ${v.spalten.length} columns`)} <small>({v.spalten[0]} … {v.spalten[v.spalten.length - 1]})</small></button>{/each}
      </div>
    {/if}
    {#if bearbeite === null}
      <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => neu()}>{L('Neues Set', 'New set')}</button></div>
    {:else}
    <form class="ms-form" onsubmit={speichern} novalidate aria-label={bearbeite ? L('Set bearbeiten', 'Edit set') : L('Neues Set', 'New set')}>
      <div class="ms-felder">
        <div class="eingabe"><label for="ms-name">{L('Name des Sets (kurz, ohne Leerzeichen)', 'Name of the set (short, no spaces)')}</label>
          <input id="ms-name" type="text" bind:value={name} autocomplete="off" spellcheck="false" aria-invalid={fehler ? 'true' : undefined} aria-describedby={fehler ? 'ms-fehler' : undefined}></div>
        <div class="eingabe"><label for="ms-label">{L('Beschriftung (steht in Tabellen und Diagrammen)', 'Label (appears in tables and charts)')}</label>
          <input id="ms-label" type="text" bind:value={label} autocomplete="off" placeholder={L('z. B. Genutzte Medien', 'e.g. Media used')}></div>
      </div>
      <fieldset><legend>{L('Welche Spalten gehören dazu? (jede ist eine Option)', 'Which columns belong to it? (each is one option)')}</legend>
        <div class="ms-spalten">{#each nichtDatum as sp (sp.name)}
          <label><input type="checkbox" checked={gewaehlt.includes(sp.name)} onchange={(e) => waehle(sp.name, e.currentTarget.checked)}>{lesbar(sp, true)}{#if sp.bezeichnung}<small> ({sp.name})</small>{/if}</label>{/each}</div></fieldset>
      <div class="eingabe"><label for="ms-zaehl">{L('Welcher Wert bedeutet „angekreuzt“?', 'Which value means "checked"?')}</label>
        <select id="ms-zaehl" bind:value={zaehl} disabled={!werte.length}>{#if !werte.length}<option value="">{L('erst Spalten wählen', 'choose columns first')}</option>{/if}{#each werte as w (String(w))}<option value={String(w)}>{wertName(w)}</option>{/each}</select>
        <span class="hilfe">{L('Bei 0 und 1 ist es die 1. Alle anderen Werte gelten als „nicht angekreuzt“.', 'With 0 and 1 it is the 1. All other values count as "not checked".')}</span></div>
      {#if fehler}<p id="ms-fehler" class="hilfe ms-fehler" role="alert" tabindex="-1">{fehler}</p>{/if}
      <div class="knopfzeile"><button class="k haupt" type="submit">{L('Set speichern', 'Save set')}</button><button class="k leise" type="button" onclick={() => { bearbeite = null; fehler = ''; }}>{L('Abbrechen', 'Cancel')}</button></div>
    </form>
    {/if}
    {#if status}<p tabindex="-1" bind:this={statusEl}>{status} <a href="#blatt/neu">{L('Neue Auswertung starten', 'Start a new analysis')}</a></p>{/if}
  </div>
  {/if}
</details>

<style>
  .ms-inhalt, .ms-form { display: flex; flex-direction: column; gap: var(--a3); margin-top: var(--a2); max-width: 46rem; }
  .ms-inhalt .hilfe, .ms-form .hilfe { display: block; margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .ms-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .ms-liste li { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a3); justify-content: space-between; align-items: center; border-bottom: 1px solid var(--linie); padding-bottom: var(--a2); }
  .ms-liste small { color: var(--tinte-2); }
  .ms-warn { color: var(--fehler, var(--tinte)); }
  .ms-knoepfe { display: flex; gap: var(--a2); }
  .ms-vorschlag { display: flex; flex-direction: column; align-items: flex-start; gap: var(--a2); }
  .ms-felder { display: flex; flex-wrap: wrap; gap: var(--a3); }
  .ms-felder .eingabe { flex: 1 1 16rem; }
  .ms-form fieldset { border: 0; padding: 0; margin: 0; }
  .ms-form legend { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); padding: 0; margin-bottom: var(--a1); }
  .ms-spalten { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 0 var(--a4); max-height: 16rem; overflow-y: auto; }
  .ms-spalten label { display: flex; align-items: center; gap: var(--a2); min-height: var(--ziel); cursor: pointer; }
  .ms-spalten input { width: 18px; height: 18px; accent-color: var(--akzent); margin: 0; }
  .ms-spalten small { color: var(--tinte-2); }
  .ms-fehler { color: var(--fehler, var(--tinte)); font-weight: 600; }
</style>
