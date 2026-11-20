<script lang="ts">
  import { s, L, Lp, d, melde, aendereDaten } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName } from '../lib/skalabau';
  import { auffaelligeFaelle, type AuffErgebnis, type AuffGrund } from '../lib/auffaellig';
  import { spaltenOption } from '../lib/datenassistentsaetze';
  import { komma } from '../lib/ergebnis';
  import { gewichtStatus, HINWEIS_NICHT_VERWENDET } from '../lib/gewichte';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * „Auffällige Fälle“ (Später S-C, Fachblatt 4.6): NUR HINWEISE. Die Liste nennt Fall und Grund; „Kennzeichnungsspalten anlegen“ fügt je Regel eine Spalte mit 0 und 1 hinzu.
   * Es gibt hier keinen Knopf zum Löschen: Wer Fälle ausschließen will, tut es bewusst mit „Fälle auswählen“.
   */
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let z = $state<string[]>([]), d2 = $state<string[]>([]), gleich = $state<string[]>([]), umgepolt = $state<string[]>([]);
  let zeit = $state('');
  let ergebnis = $state<AuffErgebnis | null>(null);
  let stand = $state('');
  const lad = new Laedt();
  const gewaehlt = $derived(z.length + (d2.length >= 2 ? 1 : 0) + (gleich.length ? 1 : 0) + (zeit ? 1 : 0));
  const daten = () => ({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  async function pruefen() {
    await lad.mit(async () => {
      await new Promise(r => setTimeout(r, 0));   // die Lade-Animation darf erscheinen, bevor gerechnet wird
      ergebnis = auffaelligeFaelle(daten(), { z, mahalanobis: d2.length >= 2 ? d2 : undefined, gleichfoermig: gleich.length ? gleich : undefined, umgepolt, zeit: zeit || undefined });
      stand = JSON.stringify([z, d2, gleich, umgepolt, zeit]);
    });
  }
  const veraltet = $derived(!!ergebnis && stand !== JSON.stringify([z, d2, gleich, umgepolt, zeit]));
  const regelName = (g: AuffGrund) => g.regel === 'z' ? L(`z-Wert in ${g.spalte}: ${komma(g.z ?? 0)} (Wert ${g.wert})`, `z score in ${g.spalte}: ${komma(g.z ?? 0)} (value ${g.wert})`)
    : g.regel === 'D2' ? L(`ungewöhnliche Kombination der Spalten (Abstand D² = ${komma(g.d2 ?? 0)})`, `unusual combination of the columns (distance D² = ${komma(g.d2 ?? 0)})`)
    : g.regel === 'gleichfoermig' ? (g.staerke === 'deutlich' ? L('fast überall dieselbe Antwort, obwohl die Fragen gegenpolig sind', 'almost the same answer everywhere, although the questions are of opposite polarity') : L('fast überall dieselbe Antwort', 'almost the same answer everywhere'))
    : L(`sehr schnell ausgefüllt (${g.spalte}: ${g.wert})`, `filled in very quickly (${g.spalte}: ${g.wert})`);

  const kennNamen = $derived(ergebnis ? ergebnis.kennzeichen.map(k => k.name) : []);
  async function anlegen() {
    if (!ergebnis || !ergebnis.kennzeichen.length) return;
    const e = ergebnis, spalten = [...$state.snapshot(s.spalten)] as Spalte[], vergeben = spalten.map(x => x.name);
    const neu = e.kennzeichen.map(k => { const name = freierName(k.name, vergeben); vergeben.push(name); return { name, werte: k.werte }; });
    const sp: Spalte[] = neu.map(n => ({ name: n.name, bezeichnung: L('Auffällig (Hinweis, kein Ausschluss)', 'Conspicuous (a hint, not an exclusion)') + ` - ${n.name}`, art: 'zahl', niveau: 'nominal', format: 'F1.0', fehlend: [], fehlendText: '', werteLabels: { '0': L('nicht auffällig', 'not conspicuous'), '1': L('auffällig', 'conspicuous') } }));
    await lad.mit(async () => { await aendereDaten(L(`Kennzeichnungsspalten angelegt (${neu.map(n => n.name).join(', ')})`, `Flag columns created (${neu.map(n => n.name).join(', ')})`), [...spalten, ...sp], s.zeilen.map((zl, i) => [...zl, ...neu.map(n => n.werte[i]!)] as Wert[]), true, { art: 'auffaellig' }); melde(L('Kennzeichnungsspalten angelegt. Es wurde nichts gelöscht.', 'Flag columns created. Nothing was deleted.'), true); });
  }
</script>

<AssistentRahmen id="auffaellig" titel={L('Auffällige Fälle', 'Conspicuous cases')} befehlName={L('Auffällige Fälle', 'Conspicuous cases')}
  einleitung={d('Welche Fälle fallen auf? Ein Tippfehler (99 statt 9), eine Person, die überall dasselbe ankreuzt, eine ungewöhnliche Kombination von Werten. Statable zeigt nur Hinweise und löscht nichts; du entscheidest.', 'Welche Fälle fallen auf? Ein Tippfehler (99 statt 9), eine Person, die überall dasselbe ankreuzt, eine ungewöhnliche Kombination von Werten. Statable zeigt nur Hinweise und löscht nichts; Sie entscheiden.', 'Which cases stand out? A typing error (99 instead of 9), a person who ticks the same answer everywhere, an unusual combination of values. Statable only shows hints and deletes nothing; you decide.')}
  hinweise={[d('Auffällig heißt nicht falsch. Prüfe, ob der Wert ein Tippfehler ist und ob die Person zur Zielgruppe gehört, und halte fest, was du getan hast. Lege Regeln für den Ausschluss von Fällen vorher fest, nicht nach dem Blick auf die Ergebnisse.', 'Auffällig heißt nicht falsch. Prüfen Sie, ob der Wert ein Tippfehler ist und ob die Person zur Zielgruppe gehört, und halten Sie fest, was Sie getan haben. Legen Sie Regeln für den Ausschluss von Fällen vorher fest, nicht nach dem Blick auf die Ergebnisse.', 'Conspicuous does not mean wrong. Check whether the value is a typing error and whether the person belongs to the target group, and record what you did. Fix exclusion rules beforehand, not after looking at the results.'),
    ...(s.gewicht && gewichtStatus('assistent:auffaellig', s.gewicht.art) === 'hinweis' ? [HINWEIS_NICHT_VERWENDET()] : [])]}
  anwendenText={L('Kennzeichnungsspalten anlegen', 'Create flag columns')} anwenden={anlegen} kannAnwenden={!!ergebnis && ergebnis.kennzeichen.length > 0 && !veraltet} laeuft={lad.sichtbar}
  problem={ergebnis && !ergebnis.kennzeichen.length ? L('Es wurde keine Regel gewählt.', 'No rule was chosen.') : veraltet ? L('Die Auswahl hat sich geändert: erst neu prüfen.', 'The selection has changed: check again first.') : ''}>
  {#snippet haupt()}
    <fieldset class="as-gruppe"><legend>{L('1. Ungewöhnlich hohe oder niedrige Werte (z-Wert über 3,29)', '1. Unusually high or low values (z score above 3.29)')}</legend>
      <ul class="as-liste">{#each zahlen as c (c.name)}<li class:an={z.includes(c.name)}><label><input type="checkbox" value={c.name} bind:group={z}><span>{c.name}{#if c.bezeichnung}<small>{c.bezeichnung}</small>{/if}</span></label></li>{/each}</ul></fieldset>
    <fieldset class="as-gruppe"><legend>{L('2. Ungewöhnliche Kombination mehrerer Spalten (Abstand D², mindestens zwei Spalten)', '2. Unusual combination of several columns (distance D², at least two columns)')}</legend>
      <ul class="as-liste">{#each zahlen as c (c.name)}<li class:an={d2.includes(c.name)}><label><input type="checkbox" value={c.name} bind:group={d2}><span>{c.name}</span></label></li>{/each}</ul></fieldset>
    <details class="auf as-weitere"><summary>{L('3. Immer dieselbe Antwort und Antwortzeit', '3. Always the same answer, and answer time')}</summary><div class="as-weitere-in">
      <fieldset class="as-gruppe"><legend>{L('Fragenblock mit mindestens 5 Fragen', 'Block of at least 5 questions')}</legend>
        <ul class="as-liste">{#each zahlen as c (c.name)}<li class:an={gleich.includes(c.name)}><label><input type="checkbox" value={c.name} bind:group={gleich}><span>{c.name}</span></label></li>{/each}</ul></fieldset>
      {#if gleich.length}<fieldset class="as-gruppe"><legend>{L('Welche dieser Fragen sind umgepolt (gegenpolig formuliert)?', 'Which of these questions are reverse-keyed (worded the opposite way)?')}</legend>
        <ul class="as-liste">{#each gleich as n (n)}<li class:an={umgepolt.includes(n)}><label><input type="checkbox" value={n} bind:group={umgepolt}><span>{n}</span></label></li>{/each}</ul>
        <p class="as-hilfe">{L('Bei gleichgepolten Fragen kann dieselbe Antwort echt sein („schwach“); bei gemischter Polung ist sie ein Widerspruch („deutlich“).', 'With questions of the same polarity the same answer can be genuine ("weak"); with mixed polarity it is a contradiction ("clear").')}</p></fieldset>{/if}
      <div class="as-feld"><label for="au-zeit">{L('Spalte mit der Antwortzeit (Sekunden)', 'Column with the answer time (seconds)')}</label>
        <select id="au-zeit" bind:value={zeit}><option value="">{L('keine', 'none')}</option>{#each zahlen as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select>
        <span class="as-hilfe">{L('Als „sehr schnell“ gilt eine Zeit unter 40 % des Medians (Faustregel).', 'A time below 40 % of the median counts as "very quick" (rule of thumb).')}</span></div>
    </div></details>
    <div class="knopfzeile"><button class="k haupt" type="button" disabled={!gewaehlt || lad.aktiv} onclick={pruefen}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{L('Prüfen', 'Check')}</button></div>
  {/snippet}
  {#snippet vorschau()}
    {#if !ergebnis}<p class="as-hilfe">{L('Mindestens eine Regel wählen und „Prüfen“ drücken.', 'Choose at least one rule and press "Check".')}</p>
    {:else}
      {#each ergebnis.hinweise as h}<p class="as-warn">{h.satz}</p>{/each}
      {#if ergebnis.faelle.length}
        <p class="as-satz">{Lp(ergebnis.faelle.length, `${ergebnis.faelle.length} Fall fällt auf.`, `${ergebnis.faelle.length} Fälle fallen auf.`, `${ergebnis.faelle.length} case stands out.`, `${ergebnis.faelle.length} cases stand out.`)}</p>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Auffällige Fälle mit Grund', 'Conspicuous cases with reason')}>
          <table class="as-tab"><thead><tr><th scope="col" class="zahl">{L('Zeile', 'Row')}</th><th scope="col">{L('Grund', 'Reason')}</th></tr></thead>
            <tbody>{#each ergebnis.faelle.slice(0, 50) as f}<tr><td class="zahl">{f.zeile + 1}</td><td style="white-space:normal">{f.gruende.map(regelName).join('; ')}</td></tr>{/each}</tbody></table></div>
        {#if ergebnis.faelle.length > 50}<p class="as-hilfe">{L(`Die ersten 50 von ${ergebnis.faelle.length}; die Kennzeichnungsspalten enthalten alle.`, `The first 50 of ${ergebnis.faelle.length}; the flag columns contain all of them.`)}</p>{/if}
      {:else if !ergebnis.hinweise.length}<p class="as-satz">{L('Kein Fall fällt nach diesen Regeln auf.', 'No case stands out under these rules.')}</p>{/if}
      {#if kennNamen.length}<p class="as-hilfe">{L(`Neue Spalten: ${kennNamen.join(', ')} (1 = auffällig).`, `New columns: ${kennNamen.join(', ')} (1 = conspicuous).`)}</p>{/if}
    {/if}
  {/snippet}
</AssistentRahmen>
