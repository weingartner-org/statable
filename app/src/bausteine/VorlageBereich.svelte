<script lang="ts">
  import { s, L, Lp, d } from '../lib/sitzung.svelte';
  import Rechnet from './Rechnet.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { artText, nichtGrundText, andereArtText, vorlageFehlerText } from '../lib/protokollsaetze';
  import { speichereVorlage, leseVorlageDatei, pruefeAufDaten, wendeVorlageAn, type LaufErgebnis } from '../lib/vorlage.svelte';
  import { VORLAGE_ENDUNG, type Vorlage, type SpeicherHinweise } from '../lib/vorlage';
  import type { SpaltenArt } from '../lib/protokoll';

  /** Vorlage speichern und anwenden (aus der Protokoll-Seite hierher verschoben, Stufe 7; Logik unverändert). Die Vorlage wiederholt die Schritte auf einer neuen Datei mit denselben Funktionen wie von Hand (lib/vorlage.svelte.ts). */
  let gespeichert = $state<{ hinweise: SpeicherHinweise; dateiname: string } | null>(null);
  let geladen = $state<{ vorlage: Vorlage; dateiname: string; pruefsumme: string | null } | null>(null);
  let fehler = $state('');
  let zuordnung = $state<Record<string, string>>({});
  let bestaetigt = $state(false);
  let ergebnis = $state<LaufErgebnis | null>(null);
  let fortschritt = $state<{ nr: number; von: number } | null>(null);
  let eingabe = $state<HTMLInputElement>();
  const lesen = new Laedt(), lauf = new Laedt();

  const pruefung = $derived(geladen ? pruefeAufDaten(geladen.vorlage, zuordnung) : null);
  const sperren = $derived(pruefung?.punkte.filter(p => p.stufe === 'sperre') ?? []);
  const warnungen = $derived(pruefung?.punkte.filter(p => p.stufe === 'warnung') ?? []);
  const hinweise = $derived(pruefung?.punkte.filter(p => p.stufe === 'hinweis') ?? []);
  const kannAnwenden = $derived(!!pruefung && !pruefung.sperren && (!pruefung.warnungen || bestaetigt));

  function speichern() { gespeichert = speichereVorlage(); }
  async function waehle(ev: Event) {
    const el = ev.currentTarget as HTMLInputElement, f = el.files?.[0]; el.value = '';
    if (!f) return;
    fehler = ''; ergebnis = null; zuordnung = {}; bestaetigt = false;
    const r = await lesen.mit(() => leseVorlageDatei(f));
    if (!r) return;
    if (!r.ok) { geladen = null; fehler = vorlageFehlerText(r.grund); return; }
    geladen = { vorlage: r.vorlage, dateiname: r.dateiname, pruefsumme: r.pruefsumme };
  }
  function ordne(name: string, wert: string) { const z = { ...zuordnung }; if (wert) z[name] = wert; else delete z[name]; zuordnung = z; ergebnis = null; }
  /** Spalten der Daten, die für eine fehlende Spalte der Vorlage in Frage kommen: gleiche Art, nicht schon selbst von der Vorlage gebraucht, nicht schon anderswo zugeordnet. */
  function kandidaten(name: string, art: SpaltenArt) {
    const gebraucht = new Set(Object.keys(geladen?.vorlage.eingang ?? {}).map(x => x.toLowerCase()));
    const vergeben = new Set(Object.entries(zuordnung).filter(([k]) => k !== name).map(([, v]) => v.toLowerCase()));
    return s.spalten.filter(sp => sp.art === art && !gebraucht.has(sp.name.toLowerCase()) && !vergeben.has(sp.name.toLowerCase()));
  }
  async function anwenden() {
    if (!geladen || !kannAnwenden) return;
    ergebnis = null;
    const g = geladen;
    await lauf.mit(async () => { ergebnis = await wendeVorlageAn(g.vorlage, { dateiname: g.dateiname, pruefsummeVorlage: g.pruefsumme, zuordnung: { ...zuordnung }, bestaetigt, fortschritt: (nr, von) => { fortschritt = { nr, von }; } }); });
    fortschritt = null;
    if ((ergebnis as { ok: boolean } | null)?.ok) { geladen = null; zuordnung = {}; bestaetigt = false; }
  }
</script>

<div class="prot">
  <p class="heft-text">{L('Eine Vorlage hält alle Schritte dieses Projekts und seine Auswertungen fest - ohne Daten. Auf einer neuen Datei mit denselben Spalten läuft dann alles der Reihe nach noch einmal.', 'A template keeps all steps of this project and its analyses - without data. On a new file with the same columns, everything then runs again in order.')}</p>

  <h2>{L('Vorlage speichern', 'Save template')}</h2>
  <div class="knopfzeile"><button class="k haupt" type="button" onclick={speichern}>{L('Vorlage speichern', 'Save template')}</button></div>
  {#if gespeichert}{@const h = gespeichert.hinweise}
    <div class="prot-status" role="status">
      <p>{L(`Die Vorlage ${gespeichert.dateiname} wurde heruntergeladen. Sie enthält keine Daten.`, `The template ${gespeichert.dateiname} was downloaded. It contains no data.`)}</p>
      <p>{Lp(h.schritte, `Die Vorlage hat ${h.schritte} Schritt.`, `Die Vorlage hat ${h.schritte} Schritte.`, `The template has ${h.schritte} step.`, `The template has ${h.schritte} steps.`)} {Lp(h.blaetter, `Die Vorlage hat ${h.blaetter} Auswertung.`, `Die Vorlage hat ${h.blaetter} Auswertungen.`, `The template has ${h.blaetter} analysis.`, `The template has ${h.blaetter} analyses.`)}</p>
      {#if h.mitWerten}<p>{Lp(h.mitWerten, `${h.mitWerten} Schritt enthält Werte, die als Regel gelten (zum Beispiel beim Umkodieren von Texten). Sie stehen in der Vorlage.`, `${h.mitWerten} Schritte enthalten Werte, die als Regel gelten (zum Beispiel beim Umkodieren von Texten). Sie stehen in der Vorlage.`, `${h.mitWerten} step contains values that were entered as a rule (for example when recoding text). They are in the template.`, `${h.mitWerten} steps contain values that were entered as a rule (for example when recoding text). They are in the template.`)}</p>{/if}
      {#if h.nichtWiederholbar.length}
        <p>{L('Diese Schritte lassen sich nicht wiederholen. Die Vorlage trägt sie als „nicht wiederholbar“, und sie lässt sich darum nicht anwenden:', 'These steps cannot be repeated. The template marks them as "not repeatable", so it cannot be applied:')}</p>
        <ul>{#each h.nichtWiederholbar as n (n.nr)}<li><b>{L('Schritt', 'Step')} {n.nr}</b>: {artText(n.art)}. {nichtGrundText(n.nicht)}</li>{/each}</ul>
      {/if}
      {#if h.ausgelassen}<p>{Lp(h.ausgelassen, `${h.ausgelassen} Auswertung fehlt in der Vorlage, weil sie Texte oder Eingaben aus den Daten trägt (zum Beispiel offene Antworten oder eigene Befehle).`, `${h.ausgelassen} Auswertungen fehlen in der Vorlage, weil sie Texte oder Eingaben aus den Daten tragen (zum Beispiel offene Antworten oder eigene Befehle).`, `${h.ausgelassen} analysis is missing from the template because it carries text or input from the data (for example open answers or own commands).`, `${h.ausgelassen} analyses are missing from the template because they carry text or input from the data (for example open answers or own commands).`)}</p>{/if}
      {#if h.luecke}<p>{L('Das Protokoll dieses Projekts begann erst mit dieser Fassung von Statable. Änderungen davor kennt die Vorlage nicht.', 'The log of this project only began with this version of Statable. The template does not know changes made before.')}</p>{/if}
    </div>
  {/if}

  <h2>{L('Vorlage anwenden', 'Apply template')}</h2>
  <p class="heft-text">{d('Öffne zuerst die neue Datei, dann wähle hier die Vorlage. Vor jeder Änderung wird geprüft, ob die Spalten passen.', 'Öffnen Sie zuerst die neue Datei, dann wählen Sie hier die Vorlage. Vor jeder Änderung wird geprüft, ob die Spalten passen.', 'Open the new file first, then choose the template here. Before any change, Statable checks whether the columns fit.')}</p>
  <div class="prot-warn" role="note">
    <p>{L('Die Vorlage wiederholt die Schritte. Sie prüft nicht, ob sie zu den neuen Daten passen.', 'The template repeats the steps. It does not check whether they suit the new data.')}</p>
    <p>{L('Hat sich die Bedeutung einer Spalte geändert, bemerkt Statable das nicht.', 'If the meaning of a column has changed, Statable does not notice.')}</p>
    <p>{L('Sätze in den Auswertungen beziehen sich auf die neuen Zahlen. Eigene Notizen aus der alten Fassung bleiben unverändert stehen und sind zu prüfen.', 'Sentences in the analyses refer to the new numbers. Your own notes from the old version stay unchanged and need to be checked.')}</p>
  </div>
  <div class="knopfzeile">
    <button class="k" type="button" aria-disabled={lesen.aktiv || lauf.aktiv ? 'true' : undefined} onclick={() => { if (!lesen.aktiv && !lauf.aktiv) eingabe?.click(); }}>{L('Vorlage wählen', 'Choose template')}</button>
    <input bind:this={eingabe} type="file" hidden accept="{VORLAGE_ENDUNG},.json,application/json" onchange={waehle}>
    {#if lesen.sichtbar}<Rechnet text={L('Vorlage wird gelesen …', 'Reading the template …')} />{/if}
  </div>
  {#if fehler}<p class="prot-fehler" role="alert">{fehler}</p>{/if}

  {#if geladen && pruefung}
    <div class="prot-panel">
      <p><b>{geladen.vorlage.name}</b>. {Lp(geladen.vorlage.schritte.length, `Die Vorlage hat ${geladen.vorlage.schritte.length} Schritt.`, `Die Vorlage hat ${geladen.vorlage.schritte.length} Schritte.`, `The template has ${geladen.vorlage.schritte.length} step.`, `The template has ${geladen.vorlage.schritte.length} steps.`)} {Lp(geladen.vorlage.blaetter.length, `Die Vorlage hat ${geladen.vorlage.blaetter.length} Auswertung.`, `Die Vorlage hat ${geladen.vorlage.blaetter.length} Auswertungen.`, `The template has ${geladen.vorlage.blaetter.length} analysis.`, `The template has ${geladen.vorlage.blaetter.length} analyses.`)}</p>
      <h4>{L('Prüfung vor der ersten Änderung', 'Check before the first change')}</h4>
      {#if !pruefung.punkte.length}<p>{L('Alles passt: Die Spalten sind da und haben dieselbe Art.', 'Everything fits: the columns are there and have the same type.')}</p>{/if}

      {#if sperren.length}
        <div class="prot-gruppe sperre" role="alert">
          <p><b>{L('Gesperrt', 'Blocked')}</b></p>
          {#if sperren.some(p => p.art === 'nicht-wiederholbar')}<p>{L('Diese Vorlage enthält Schritte, die sich nicht wiederholen lassen. Sie lässt sich darum nicht anwenden.', 'This template contains steps that cannot be repeated. It cannot be applied.')}</p>{/if}
          <ul>
            {#each sperren as p, i (i)}
              <li>
                {#if p.art === 'fehlt'}
                  {L(`Die Spalte „${p.spalte}“ fehlt in den neuen Daten.`, `The column "${p.spalte}" is missing in the new data.`)}
                  {@const kand = kandidaten(p.spalte!, p.erwartet!)}
                  {#if kand.length || zuordnung[p.spalte!]}
                    <label class="prot-ordne">{L(`Eine vorhandene Spalte für „${p.spalte}“ zuordnen`, `Match an existing column to "${p.spalte}"`)}
                      <select value={zuordnung[p.spalte!] ?? ''} onchange={(ev) => ordne(p.spalte!, ev.currentTarget.value)}>
                        <option value="">{L('Nicht zuordnen', 'Do not match')}</option>
                        {#each kand as sp (sp.name)}<option value={sp.name}>{sp.name}</option>{/each}
                      </select></label>
                  {/if}
                {:else if p.art === 'andere-art'}{andereArtText(p.spalte!, p.erwartet!, p.ist!)}
                {:else if p.art === 'nicht-wiederholbar'}<b>{L('Schritt', 'Step')} {p.schritt}</b>: {artText(p.schrittArt!)}. {nichtGrundText(p.nicht!)}
                {:else if p.art === 'lesart'}{L(`Der Schritt „Lesart ändern“ braucht die Kopfzeile „${p.spalte}“, die in dieser Datei fehlt.`, `The step "change reading" needs the header "${p.spalte}", which is missing in this file.`)}
                {:else if p.art === 'zuordnung-kollision'}{L(`Die Zuordnung für „${p.spalte}“ passt nicht: Die Spalte ist schon einer anderen Spalte der Vorlage zugeordnet oder heißt wie eine andere.`, `The match for "${p.spalte}" does not work: the column is already matched to another template column or has the name of another.`)}{/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if warnungen.length}
        <div class="prot-gruppe warnung" role="alert">
          <p><b>{L('Warnung', 'Warning')}</b></p>
          <ul>{#each warnungen as p, i (i)}<li>{Lp(p.anzahl ?? 0, `In „${p.spalte}“ (Schritt ${p.schritt}) kommt ein Wert vor, den das Umkodieren nicht kennt: ${p.anzahl} Zeile. Er bleibt, wie es der Schritt vorsieht.`, `In „${p.spalte}“ (Schritt ${p.schritt}) kommen Werte vor, die das Umkodieren nicht kennt: ${p.anzahl} Zeilen. Sie bleiben, wie es der Schritt vorsieht.`, `In "${p.spalte}" (step ${p.schritt}) a value occurs that the recode does not know: ${p.anzahl} row. It stays as the step provides.`, `In "${p.spalte}" (step ${p.schritt}) values occur that the recode does not know: ${p.anzahl} rows. They stay as the step provides.`)}
            {#if p.beispiele?.length}<span class="prot-bsp">{L('Zum Beispiel:', 'For example:')} {p.beispiele.map(b => `„${b}“`).join(', ')}</span>{/if}</li>{/each}</ul>
          <label class="schalter prot-ok"><input type="checkbox" bind:checked={bestaetigt}><span>{L('Ich habe das gelesen. Diese Werte bleiben, und das steht im Protokoll.', 'I have read this. These values stay, and this is recorded in the log.')}</span></label>
        </div>
      {/if}

      {#if hinweise.length}
        <div class="prot-gruppe hinweis" role="note">
          <p><b>{L('Hinweis', 'Note')}</b></p>
          <ul>{#each hinweise as p, i (i)}<li>
            {#if p.art === 'neue-spalte'}{Lp(p.anzahl ?? 0, `${p.anzahl} Spalte der neuen Daten kommt in der Vorlage nicht vor: ${pruefung.neueSpalten.slice(0, 8).join(', ')}. Sie bleibt unverändert.`, `${p.anzahl} Spalten der neuen Daten kommen in der Vorlage nicht vor: ${pruefung.neueSpalten.slice(0, 8).join(', ')}. Sie bleiben unverändert.`, `${p.anzahl} column of the new data does not occur in the template: ${pruefung.neueSpalten.slice(0, 8).join(', ')}. It stays unchanged.`, `${p.anzahl} columns of the new data do not occur in the template: ${pruefung.neueSpalten.slice(0, 8).join(', ')}. They stay unchanged.`)}
            {:else if p.art === 'kategorie-fehlt'}{Lp(p.anzahl ?? 0, `In „${p.spalte}“ fehlt ${p.anzahl} Kategorie, die Schritt ${p.schritt} kennt, in den neuen Daten.`, `In „${p.spalte}“ fehlen ${p.anzahl} Kategorien, die Schritt ${p.schritt} kennt, in den neuen Daten.`, `In "${p.spalte}" ${p.anzahl} category that step ${p.schritt} knows is missing in the new data.`, `In "${p.spalte}" ${p.anzahl} categories that step ${p.schritt} knows are missing in the new data.`)}{/if}
          </li>{/each}</ul>
        </div>
      {/if}

      <div class="knopfzeile">
        <button class="k haupt" type="button" disabled={!kannAnwenden} aria-disabled={lauf.aktiv ? 'true' : undefined} onclick={anwenden}>{L('Vorlage anwenden', 'Apply template')}</button>
        {#if lauf.sichtbar}<Rechnet text={fortschritt ? L(`Schritt ${fortschritt.nr} von ${fortschritt.von} …`, `Step ${fortschritt.nr} of ${fortschritt.von} …`) : L('Die Vorlage läuft …', 'The template is running …')} />{/if}
      </div>
    </div>
  {/if}

  <div class="prot-ergebnis" role="status">
    {#if ergebnis?.ok}
      <p>{Lp(ergebnis.schritte, `Die Vorlage wurde angewendet: ${ergebnis.schritte} Schritt wurde ausgeführt.`, `Die Vorlage wurde angewendet: ${ergebnis.schritte} Schritte wurden ausgeführt.`, `The template was applied: ${ergebnis.schritte} step was run.`, `The template was applied: ${ergebnis.schritte} steps were run.`)}</p>
      {#if ergebnis.blaetter}<p>{d('Die Auswertungen aus der Vorlage stehen oben als Reiter. Sie rechnen, sobald du sie öffnest, oder alle zugleich im Bericht.', 'Die Auswertungen aus der Vorlage stehen oben als Reiter. Sie rechnen, sobald Sie sie öffnen, oder alle zugleich im Bericht.', 'The analyses from the template are open as tabs. They calculate when you open them, or all at once in the report.')} <a href="#bericht">{L('Zum Bericht', 'To the report')}</a></p>{/if}
      {#if ergebnis.ausgelassen}<p>{Lp(ergebnis.ausgelassen, `${ergebnis.ausgelassen} Auswertung fehlt in der Vorlage, weil sie beim Speichern nicht aufgenommen werden konnte.`, `${ergebnis.ausgelassen} Auswertungen fehlen in der Vorlage, weil sie beim Speichern nicht aufgenommen werden konnten.`, `${ergebnis.ausgelassen} analysis is missing from the template because it could not be included when saving.`, `${ergebnis.ausgelassen} analyses are missing from the template because they could not be included when saving.`)}</p>{/if}
    {:else if ergebnis && ergebnis.art === 'abbruch'}
      <p class="prot-fehler">{L(`Die Vorlage wurde bei Schritt ${ergebnis.schritt} abgebrochen. Die Daten sind wie vorher, und der Grund steht im Protokoll.`, `The template was stopped at step ${ergebnis.schritt}. The data are as before, and the reason is in the log.`)}
        {artText(ergebnis.schrittArt)}.
        {#if ergebnis.grund === 'pspp'}{L('PSPP hat den Befehl abgelehnt.', 'PSPP rejected the command.')}{#if ergebnis.text} <span class="prot-bsp">{ergebnis.text}</span>{/if}
        {:else if ergebnis.grund === 'person'}{L('Der Lauf wurde abgebrochen.', 'The run was stopped.')}
        {:else}{L('Der Schritt ließ sich nicht ausführen.', 'The step could not be run.')}{/if}</p>
    {:else if ergebnis && ergebnis.art === 'sperre'}
      <p class="prot-fehler">{L('Die Vorlage ist gesperrt. Es wurde nichts geändert.', 'The template is blocked. Nothing was changed.')}</p>
    {:else if ergebnis && ergebnis.art === 'bestaetigung'}
      <p class="prot-fehler">{L('Die Warnungen sind noch nicht bestätigt. Es wurde nichts geändert.', 'The warnings are not confirmed yet. Nothing was changed.')}</p>
    {/if}
  </div>
</div>

<style>
  .prot h2 { margin-top: var(--a5); }
  .prot-warn, .prot-status, .prot-panel, .prot-gruppe { margin: var(--a3) 0; padding: var(--a2) var(--a3); border-radius: var(--r-klein); }
  .prot-warn { border-inline-start: 3px solid var(--hinweis-linie); background: var(--hinweis-hell); color: var(--hinweis); }
  .prot-warn p { margin: var(--a1) 0; }
  .prot-status, .prot-panel { border: 1px solid var(--linie); background: var(--blatt); }
  .prot-status p, .prot-gruppe p { margin: var(--a1) 0; }
  .prot-gruppe.sperre { border-inline-start: 3px solid var(--hinweis); background: var(--hinweis-hell); }
  .prot-gruppe.warnung { border-inline-start: 3px solid var(--hinweis-linie); background: var(--hinweis-hell); }
  .prot-gruppe.hinweis { border-inline-start: 3px solid var(--linie-stark); }
  .prot-gruppe ul, .prot-status ul { margin: var(--a1) 0; padding-inline-start: var(--a5); }
  .prot-ordne { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; margin-top: var(--a1); }
  .prot-bsp { color: var(--tinte-2); }
  .prot-ok { display: flex; gap: var(--a2); align-items: flex-start; margin-top: var(--a2); }
  .prot-fehler { color: var(--hinweis); }
  .prot-ergebnis:empty { display: none; }
</style>
