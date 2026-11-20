<script lang="ts">
  import { s, L, Lp, melde, aendereDaten, aktuelleSprache } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName, gueltigerName } from '../lib/skalabau';
  import { anzeigeWert, spaltenOption } from '../lib/datenassistentsaetze';
  import { untrack } from 'svelte';
  import { Laedt, verzoegert } from '../lib/laedt.svelte';
  import {
    KLASSIFIKATIONEN, klassIndex, klassZuordnen, eintraegeJeEbene, klassErgebnisSaetze, klassTrefferSatz, klassQuelleSatz, klassSpracheSatz, klassSchreibweiseSatz, klassOenaceWarnung, klassNutsWarnung, klassNutsSpracheSatz, ebenenNummer, klassNullenWarnung, klassNichtWiederholbarSatz,
    type KlassId, type Klassifikation, type KlassIndex
  } from '../lib/klassifikation';
  import { klassVonServer } from '../lib/klassladen';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * „Klassifikation zuordnen“ (Abschnitt 3): Codes wie ÖNACE oder ISCO bekommen den Titel oder den Code einer gewählten Ebene, in einer neuen Spalte.
   * Die Klassifikation (Statistik Austria, CC BY 4.0) wird erst beim Gebrauch von diesem Server geladen. Was nicht gefunden wird, bleibt leer und wird gezählt; es gibt keine Näherungssuche.
   */
  const namen = $derived(s.spalten.map(c => c.name));
  const codeSp = $derived(s.spalten.filter(c => c.art !== 'datum'));
  let spalte = $state(''), kid = $state<KlassId>('oenace2008');
  let ebene = $state(0), ziel = $state<'titel' | 'code'>('titel'), zielEigen = $state<string | null>(null);
  let klass = $state.raw<Klassifikation | null>(null), index = $state.raw<KlassIndex | null>(null);
  let ladefehler = $state('');
  const schreibt = new Laedt();
  const info = $derived(KLASSIFIKATIONEN.find(k => k.id === kid)!);
  const appDe = $derived(aktuelleSprache() === 'de');
  const sprache = $derived<'de' | 'en'>(appDe ? 'de' : 'en');

  /** Die gewählte Klassifikation laden (nur auf Wahl, nur einmal je Datei). Wechselt die Wahl währenddessen, gilt nur die letzte. */
  let laedt = $state(false);
  const zeigeLaden = verzoegert(() => laedt);
  $effect(() => {
    const id = kid;
    klass = null; index = null; ladefehler = ''; laedt = true;
    let aktuell = true;
    klassVonServer(id).then(k => { if (!aktuell) return; klass = k; index = klassIndex(k); laedt = false; if (untrack(() => ebene) > k.ebenen) ebene = 0; })
      .catch(f => { if (!aktuell) return; ladefehler = f instanceof Error ? f.message : String(f); laedt = false; });
    return () => { aktuell = false; };
  });

  const sp = $derived(s.spalten.find(c => c.name === spalte));
  const spIdx = $derived(s.spalten.findIndex(c => c.name === spalte));
  const codes = $derived(spIdx >= 0 ? s.zeilen.map(z => z[spIdx] ?? null) : null);
  const lauf = $derived.by(() => (klass && index && codes && ebene >= 0 ? klassZuordnen(klass, index, codes, { ebene, ziel, sprache, zahlenSpalte: sp?.art === 'zahl' }) : null));
  const zielVorschlag = $derived(freierName(`${spalte || 'Code'}_${ziel === 'titel' ? L('Titel', 'title') : L('Code', 'code')}${ebene ? (info.schreibweise === 'nuts' ? '_NUTS' : '_E') + ebenenNummer(info, ebene) : ''}`.slice(0, 60), namen));
  const neuerName = $derived(zielEigen ?? zielVorschlag);
  const nameProblem = $derived(!neuerName.trim() ? L('Die neue Spalte braucht einen Namen.', 'The new column needs a name.') : !gueltigerName(neuerName) ? L('Der Name der neuen Spalte ist nicht erlaubt: Er beginnt mit einem Buchstaben und hat keine Leerzeichen.', 'The name of the new column is not allowed: it starts with a letter and has no spaces.') : namen.some(n => n.toUpperCase() === neuerName.toUpperCase()) ? L('Eine Spalte mit diesem Namen gibt es schon. Bitte einen neuen Namen wählen.', 'A column with this name already exists. Please choose a new name.') : '');
  const problem = $derived(ladefehler || (!spalte ? L('Die Spalte mit den Codes ist noch nicht gewählt.', 'The column with the codes has not been chosen yet.') : !klass ? '' : !lauf ? '' : lauf.gefunden === 0 ? L('Kein Code wurde gefunden. Es entsteht keine Spalte.', 'No code was found. No column is created.') : nameProblem));
  const hinweise = $derived.by((): string[] => {
    const h: string[] = [];
    if (kid.startsWith('oenace')) h.push(klassOenaceWarnung());
    if (info.schreibweise === 'nuts') h.push(klassNutsWarnung());
    if (sp?.art === 'zahl') h.push(klassNullenWarnung());
    if (klass && lauf) h.push(...klassErgebnisSaetze(lauf, s.zeilen.length), klassTrefferSatz(lauf.getroffen, klass.eintraege.length));
    if (klass) h.push(klassSchreibweiseSatz(info.schreibweise), info.schreibweise === 'nuts' ? klassNutsSpracheSatz() : klassSpracheSatz(sprache, appDe), klassQuelleSatz(klass), klassNichtWiederholbarSatz());
    return h;
  });
  const ebenenZahl = $derived(klass ? eintraegeJeEbene(klass) : []);
  /** Name einer Ebene wie in der Quelle: bei NUTS „NUTS-Ebene 0“ (die Ebene 1 der Datei), sonst „Ebene 1“ */
  const ebeneText = (e: number, en = false) => (info.schreibweise === 'nuts' ? (en ? `NUTS level ${ebenenNummer(info, e)}` : `NUTS-Ebene ${ebenenNummer(info, e)}`) : en ? `level ${e}` : `Ebene ${e}`);

  async function anwenden() {
    if (!lauf || !klass || problem) return;
    const werte = lauf.werte;
    const titel = ziel === 'titel'
      ? (ebene ? L(`${info.name}: Titel, ${ebeneText(ebene)}`, `${info.name}: title, ${ebeneText(ebene, true)}`) : L(`${info.name}: Titel`, `${info.name}: title`))
      : (ebene ? L(`${info.name}: Code, ${ebeneText(ebene)}`, `${info.name}: code, ${ebeneText(ebene, true)}`) : L(`${info.name}: Code`, `${info.name}: code`));
    await schreibt.mit(async () => {
      try {
        const nSp: Spalte = { name: neuerName, bezeichnung: titel, art: 'text', niveau: 'nominal', format: 'A1', fehlend: [], fehlendText: '', werteLabels: {} };
        const spalten = [...($state.snapshot(s.spalten) as Spalte[]), nSp], zeilen = s.zeilen.map((z, i): Wert[] => [...z, werte[i] ?? null]);
        const ok = await aendereDaten(L(`${neuerName} angelegt (${info.name})`, `${neuerName} created (${info.name})`), spalten, zeilen, true, { art: 'klassifikation', nicht: 'art' });
        if (ok) {
          const n = lauf.nichtGefunden;
          const nachsatz = n ? ' ' + Lp(n, `${n} nicht gefundener Code bleibt leer.`, `${n} nicht gefundene Codes bleiben leer.`, `${n} code that was not found stays empty.`, `${n} codes that were not found stay empty.`) : '';
          melde(L(`Die Spalte ${neuerName} ist angelegt (${info.name}).`, `The column ${neuerName} has been created (${info.name}).`) + nachsatz, true);
        }
      } catch (f) { melde(L('Das ließ sich nicht rechnen. Es ist alles wie vorher.', 'This could not be calculated. Everything is as it was before.')); console.error(f); }
    });
  }
</script>

<AssistentRahmen id="klassifikation" titel={L('Klassifikation zuordnen', 'Assign a classification')} befehlName={L('Klassifikation zuordnen', 'Assign a classification')}
  einleitung={L('Codes wie ÖNACE oder ISCO bekommen in einer neuen Spalte den Titel oder den Code einer Ebene der Klassifikation. Die Klassifikation wird erst beim Gebrauch geladen. Ein Code, der nicht gefunden wird, bleibt leer und wird gezählt; Statable sucht nicht nach ähnlichen Codes.', 'Codes such as ÖNACE or ISCO get the title or the code of a level of the classification in a new column. The classification is loaded only when it is used. A code that is not found stays empty and is counted; Statable does not search for similar codes.')}
  {hinweise} {problem} syntax=""
  anwendenText={L('Neue Spalte anlegen', 'Create new column')} anwenden={anwenden} kannAnwenden={!!lauf && !problem && lauf.gefunden > 0} laeuft={schreibt.sichtbar}>
  {#snippet haupt()}
    <div class="as-felder">
      <div class="as-feld"><label for="kl-sp">{L('Spalte mit den Codes', 'Column with the codes')}</label>
        <select id="kl-sp" bind:value={spalte}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each codeSp as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      <div class="as-feld"><label for="kl-id">{L('Klassifikation', 'Classification')}</label>
        <select id="kl-id" bind:value={kid}>{#each KLASSIFIKATIONEN as k}<option value={k.id}>{k.name}</option>{/each}</select></div>
      <div class="as-feld"><label for="kl-eb">{L('Ebene', 'Level')}</label>
        <select id="kl-eb" bind:value={ebene} disabled={!klass}><option value={0}>{L('die Ebene des Codes selbst', 'the level of the code itself')}</option>{#each ebenenZahl as n, i}<option value={i + 1}>{L(`${ebeneText(i + 1)} (${n} Einträge)`, `${ebeneText(i + 1, true).replace(/^l/, 'L')} (${n} entries)`)}</option>{/each}</select></div>
      <div class="as-feld"><span id="kl-ziel">{L('Was soll in die neue Spalte?', 'What should go into the new column?')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="kl-ziel"><label><input type="radio" name="kl-z" value="titel" bind:group={ziel} onchange={() => (zielEigen = null)}>{L('der Titel', 'the title')}</label>
          <label><input type="radio" name="kl-z" value="code" bind:group={ziel} onchange={() => (zielEigen = null)}>{L('der Code', 'the code')}</label></div></div>
      <div class="as-feld"><label for="kl-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="kl-name" type="text" autocomplete="off" value={neuerName} oninput={(e) => (zielEigen = e.currentTarget.value)}></div>
    </div>
    {#if zeigeLaden.an}<p role="status"><Rechnet text={L('Statable lädt die Klassifikation …', 'Statable is loading the classification …')} /></p>{/if}
    {#if ladefehler}<p class="as-problem" role="alert">{ladefehler}</p>{/if}
    <p class="as-hilfe"><HilfeLink id="klassifikation" text={L('Hilfe: Klassifikation zuordnen', 'Help: assign a classification')} /></p>
  {/snippet}
  {#snippet vorschau()}
    {#if lauf && spIdx >= 0}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau, die ersten 12 Zeilen', 'Preview, the first 12 rows')}>
        <table class="as-tab"><thead><tr><th scope="col">{spalte}</th><th scope="col">{neuerName}</th></tr></thead>
          <tbody>{#each s.zeilen.slice(0, 12) as z, i}<tr><td class:zahl={typeof z[spIdx] === 'number'}>{anzeigeWert(sp, (z[spIdx] ?? null) as Wert)}</td><td>{lauf.werte[i] ?? ''}</td></tr>{/each}</tbody></table>
      </div>
    {:else}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald die Spalte gewählt und die Klassifikation geladen ist.', 'The preview appears as soon as the column is chosen and the classification is loaded.')}</p>{/if}
  {/snippet}
</AssistentRahmen>
