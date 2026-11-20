<script lang="ts">
  import { untrack, onDestroy } from 'svelte';
  import { s, L, Lp, melde, oeffneNeueDaten } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName } from '../lib/skalabau';
  import { aggregierenBefehl, gruppenFehlende, gruppenUebersicht, kennwertName, type Kennwert } from '../lib/datenassistent';
  import { anzeigeWert, fehlerSatz, gruppenFehlendSaetze } from '../lib/datenassistentsaetze';
  import { probelauf, wendeAn } from '../lib/datenassistentlauf';
  import { AUTO_ZELLEN, Vorschau } from '../lib/assistentvorschau.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import Rechnet from './Rechnet.svelte';

  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  const namen = $derived(s.spalten.map(x => x.name));
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let gruppen = $state<string[]>([]);
  let modus = $state<'spalten' | 'neu'>('spalten');
  let faelle = $state(true);                       // „Fälle je Gruppe“ (mit Fallgewicht: gewichtet)
  let zeilen = $state(false);                      // „Zeilen je Gruppe“, ungewichtet - nur mit Fallgewicht zur Wahl
  type Fn = 'GUELTIG' | 'MEAN' | 'SD' | 'MEDIAN' | 'MIN' | 'MAX' | 'SUM';
  const FN: { fn: Fn; name: () => string }[] = [
    { fn: 'MEAN', name: () => L('Mittelwert', 'Mean') }, { fn: 'SD', name: () => L('Standardabweichung', 'Standard deviation') },
    { fn: 'MEDIAN', name: () => L('Median', 'Median') }, { fn: 'MIN', name: () => L('Minimum', 'Minimum') },
    { fn: 'MAX', name: () => L('Maximum', 'Maximum') }, { fn: 'SUM', name: () => L('Summe', 'Sum') },
    { fn: 'GUELTIG', name: () => (s.gewicht ? L('gültige Werte (gewichtet)', 'valid values (weighted)') : L('gültige Werte (Anzahl)', 'valid values (count)')) }
  ];
  let fns = $state<Fn[]>(['MEAN']);
  let werteSpalten = $state<string[]>([]);
  let namenEigen = $state<Record<string, string>>({});
  let projektName = $state('');

  const gruppeOrdnung = $derived(namen.filter(n => gruppen.includes(n)));
  const werteOrdnung = $derived(namen.filter(n => werteSpalten.includes(n) && !gruppen.includes(n)));
  const uebersicht = $derived(gruppeOrdnung.length ? gruppenUebersicht(daten, gruppeOrdnung) : null);
  const fehlendSaetze = $derived(gruppeOrdnung.length ? gruppenFehlendSaetze(gruppenFehlende(daten, gruppeOrdnung)) : []);

  /** Die Kennwerte mit ihren Namen; ein eigener Name aus „Weitere Wege“ geht vor, sonst `<spalte>_<kennwert>`. */
  const kennwerte = $derived.by((): Kennwert[] => {
    const vergeben = [...(modus === 'spalten' ? namen : gruppeOrdnung)];
    const aus: Kennwert[] = [];
    const nimm = (schluessel: string, wunsch: string, kw: Omit<Kennwert, 'name'>) => {
      const name = namenEigen[schluessel]?.trim() || freierName(wunsch, vergeben);
      vergeben.push(name); aus.push({ ...kw, name });
    };
    if (faelle) nimm('N|', 'n_faelle', { fn: 'N' });   // Spaltennamen werden nicht übersetzt
    if (s.gewicht && zeilen) nimm('NU|', 'n_zeilen', { fn: 'NU' });   // ungewichtet: die Zeilen der Gruppe
    for (const sp of werteOrdnung) for (const f of FN.filter(x => fns.includes(x.fn))) {
      nimm(`${f.fn}|${sp}`, kennwertName(sp, f.fn === 'GUELTIG' ? 'N' : f.fn, []), { fn: f.fn === 'GUELTIG' ? 'N' : f.fn, spalte: sp });
    }
    return aus;
  });
  const ziel = $derived('/zz_gruppen.sav');
  const ergebnis = $derived.by((): { syntax: string } | { problem: string } => {
    if (!gruppeOrdnung.length) return { problem: L('Mindestens eine Spalte wählen, die die Gruppen bildet.', 'Choose at least one column that forms the groups.') };
    if (!kennwerte.length) return { problem: L('Mindestens einen Kennwert wählen.', 'Choose at least one statistic.') };
    try { return { syntax: aggregierenBefehl(daten, { gruppen: gruppeOrdnung, kennwerte, modus, datei: modus === 'neu' ? ziel : undefined }).syntax }; }
    catch (f) { return { problem: fehlerSatz(f) }; }
  });
  const syntax = $derived('syntax' in ergebnis ? ergebnis.syntax : '');
  /** Für die Vorschau und das neue Projekt: bei „neu“ wird das Ergebnis aus der Datei gelesen. */
  const probeSyntax = $derived(syntax && modus === 'neu' ? `${syntax}\nGET FILE='${ziel}'.` : syntax);

  /* ---------- Vorschau ---------- */
  interface Probe { spalten: Spalte[]; zeilen: Wert[][]; anzahl: number; fehler: string[] }
  const vs = new Vorschau<Probe>();
  onDestroy(() => vs.verwerfe());
  const gross = $derived(s.zeilen.length * s.spalten.length > AUTO_ZELLEN);
  async function probe(sx: string, neu: string[]): Promise<Probe> {
    const r = await probelauf(sx);
    if (!r.daten) return { spalten: [], zeilen: [], anzahl: 0, fehler: r.fehler };
    // Neue Spalten: die Gruppen, dann die Kennwerte; bei „Spalten“ stehen sie am Ende der Daten
    const zeigen = [...gruppeOrdnung, ...neu].map(n => r.daten!.spalten.find(c => c.name === n)).filter((c): c is Spalte => !!c);
    const idx = zeigen.map(c => r.daten!.spalten.indexOf(c));
    return { spalten: zeigen, zeilen: r.daten.zeilen.slice(0, 8).map(z => idx.map(i => z[i] ?? null)), anzahl: r.daten.zeilen.length, fehler: [] };
  }
  $effect(() => { const sx = probeSyntax, neu = kennwerte.map(k => k.name); if (!sx) return; untrack(() => vs.plane(() => probe(sx, neu), !gross)); });
  const rechneVorschau = () => { if (probeSyntax) void vs.jetzt(() => probe(probeSyntax, kennwerte.map(k => k.name))); };

  /* ---------- Anwenden ---------- */
  const lad = new Laedt();
  $effect(() => { if (modus === 'neu') projektName = untrack(() => projektName || `${s.projekt?.name ?? ''} (${L('Gruppen', 'groups')})`); });
  async function anwenden() {
    if (!syntax) return;
    if (modus === 'spalten') { await lad.mit(() => wendeAn(L(`Kennwerte je Gruppe von ${gruppeOrdnung.join(', ')} berechnet`, `Statistics per group of ${gruppeOrdnung.join(', ')} calculated`), syntax)); return; }
    await lad.mit(async () => {
      try {
        const r = await probelauf(probeSyntax);
        if (!r.daten) { melde(L('Das ging nicht. Es ist alles wie vorher.', "That didn't work. Everything is as it was before.")); return; }
        await oeffneNeueDaten(projektName.trim() || L('Gruppen', 'Groups'), L(`Kennwerte je Gruppe aus „${s.projekt?.name}“`, `Statistics per group from "${s.projekt?.name}"`), r.daten.spalten, r.daten.zeilen, 'aggregieren');
        melde(L('Neues Projekt mit einer Zeile je Gruppe geöffnet. Das bisherige Projekt ist unverändert.', 'New project with one row per group opened. Your previous project is unchanged.'));
        location.hash = 'daten';
      } catch { melde(L('Das ließ sich nicht öffnen. Das bisherige Projekt ist unverändert.', "That couldn't be opened. Your current project is unchanged.")); }
    });
  }
</script>

<AssistentRahmen id="aggregieren" titel={L('Aggregieren', 'Aggregate')} befehlName={L('Aggregieren', 'Aggregate')}
  einleitung={L('Kennwerte je Gruppe berechnen, zum Beispiel den Mittelwert je Klasse. Entweder als neue Spalten an den Daten (jede Person bekommt den Wert ihrer Gruppe) oder als neues Projekt mit einer Zeile je Gruppe.', 'Calculate statistics per group, for example the mean per class. Either as new columns on the data (each person gets the value of their group) or as a new project with one row per group.')}
  {syntax} problem={'problem' in ergebnis ? ergebnis.problem : ''}
  hinweise={vs.wert?.fehler.length ? [L(`PSPP meldet: ${vs.wert.fehler[0]}`, `PSPP reports: ${vs.wert.fehler[0]}`)] : []}
  anwendenText={modus === 'neu' ? L('Als neues Projekt öffnen', 'Open as a new project') : L('Als neue Spalten anlegen', 'Add as new columns')} anwenden={anwenden} kannAnwenden={!!syntax && !vs.wert?.fehler.length} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <fieldset class="as-gruppe"><legend>{L('Gruppen bilden nach', 'Form groups by')}</legend>
      <ul class="as-liste">{#each s.spalten as c (c.name)}
        <li class:an={gruppen.includes(c.name)}><label><input type="checkbox" checked={gruppen.includes(c.name)} onchange={(e) => (gruppen = e.currentTarget.checked ? [...gruppen, c.name] : gruppen.filter(x => x !== c.name))}><span><b>{c.name}</b>{#if c.bezeichnung}<small>{c.bezeichnung}</small>{/if}</span></label></li>
      {/each}</ul></fieldset>
    {#if uebersicht}
      <p class="as-satz">{Lp(uebersicht.gruppen, `Das ergibt ${uebersicht.gruppen} Gruppe.`, `Das ergibt ${uebersicht.gruppen} Gruppen.`, `This gives ${uebersicht.gruppen} group.`, `This gives ${uebersicht.gruppen} groups.`)}
        {#each fehlendSaetze as satz}{satz}{' '}{/each}</p>
    {/if}
    <fieldset class="as-gruppe"><legend>{L('Kennwerte', 'Statistics')}</legend>
      <label class="as-eins"><input type="checkbox" bind:checked={faelle}><span>{s.gewicht ? L('Fälle (gewichtet) - die Summe der Fallgewichte je Gruppe', 'Cases (weighted) - the sum of the case weights per group') : L('Fälle je Gruppe zählen (alle Fälle, auch mit fehlenden Werten)', 'Count the cases per group (all cases, including those with missing values)')}</span></label>
      {#if s.gewicht}
        <label class="as-eins"><input type="checkbox" bind:checked={zeilen}><span>{L('Zeilen (ungewichtet) - die Zeilen der Daten je Gruppe, auch die mit Fallgewicht 0', 'Rows (unweighted) - the rows of the data per group, including those with case weight 0')}</span></label>
        <p class="as-hilfe">{L(`Das Fallgewicht ${s.gewicht.spalte} gilt hier: „Fälle“ zählt die Summe der Gewichte, „Zeilen“ die Zeilen. Mittelwert, Summe, Standardabweichung und Median sind gewichtet. Das neue Projekt mit einer Zeile je Gruppe behält das Fallgewicht nicht.`, `The case weight ${s.gewicht.spalte} applies here: "Cases" counts the sum of the weights, "Rows" counts the rows. Mean, sum, standard deviation and median are weighted. The new project with one row per group does not keep the case weight.`)}</p>
      {/if}
      <div class="as-feld"><span class="lbl" id="ag-fn">{L('Für Zahlenspalten', 'For number columns')}</span>
        <div class="as-chips" role="group" aria-labelledby="ag-fn">{#each FN as f}<label class="as-chip"><input type="checkbox" checked={fns.includes(f.fn)} onchange={(e) => (fns = e.currentTarget.checked ? [...fns, f.fn] : fns.filter(x => x !== f.fn))}><span>{f.name()}</span></label>{/each}</div></div>
      <ul class="as-liste" aria-label={L('Von welchen Spalten?', 'Of which columns?')}>{#each zahlen.filter(c => !gruppen.includes(c.name)) as c (c.name)}
        <li class:an={werteSpalten.includes(c.name)}><label><input type="checkbox" checked={werteSpalten.includes(c.name)} onchange={(e) => (werteSpalten = e.currentTarget.checked ? [...werteSpalten, c.name] : werteSpalten.filter(x => x !== c.name))}><span><b>{c.name}</b>{#if c.bezeichnung}<small>{c.bezeichnung}</small>{/if}</span></label></li>
      {/each}</ul>
      <p class="as-hilfe">{L('Fälle mit fehlendem Wert gehen in Mittelwert, Standardabweichung, Median, Minimum, Maximum und Summe nicht ein; „gültige Werte“ zählt nur die vorhandenen. Ein Median ohne gültigen Wert bleibt leer.', 'Cases with a missing value are left out of mean, standard deviation, median, minimum, maximum and sum; "valid values" counts only those present. A median without any valid value stays empty.')}</p>
    </fieldset>
    <div class="as-feld"><span class="lbl" id="ag-modus">{L('Wohin kommt das Ergebnis?', 'Where does the result go?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="ag-modus">
        <label><input type="radio" name="ag-modus" value="spalten" bind:group={modus}>{L('Als neue Spalten an den Daten', 'As new columns on the data')}</label>
        <label><input type="radio" name="ag-modus" value="neu" bind:group={modus}>{L('Als neues Projekt (eine Zeile je Gruppe)', 'As a new project (one row per group)')}</label></div>
      <span class="as-hilfe">{modus === 'spalten' ? L('Die Zeilen bleiben, wie sie sind; hinten kommen die neuen Spalten.', 'The rows stay as they are; the new columns are added at the end.') : L('Das bisherige Projekt bleibt unverändert in der Liste auf der Startseite.', 'Your current project stays unchanged in the list on the start page.')}</span></div>
  {/snippet}

  {#snippet weitere()}
    {#if kennwerte.length}
      <fieldset class="as-gruppe"><legend>{L('Namen der neuen Spalten', 'Names of the new columns')}</legend>
        <div class="as-felder">{#each kennwerte as k, i}
          {@const schluessel = k.spalte ? `${k.fn === 'N' ? 'GUELTIG' : k.fn}|${k.spalte}` : k.fn === 'NU' ? 'NU|' : 'N|'}
          <div class="as-feld"><label for="ag-n-{i}">{k.spalte ? `${k.spalte} - ${k.fn === 'N' ? L('gültige Werte', 'valid values') : (FN.find(f => f.fn === k.fn)?.name() ?? k.fn)}` : k.fn === 'NU' ? L('Zeilen je Gruppe', 'Rows per group') : L('Fälle je Gruppe', 'Cases per group')}</label>
            <input id="ag-n-{i}" type="text" autocomplete="off" value={k.name} oninput={(e) => (namenEigen[schluessel] = e.currentTarget.value)}></div>
        {/each}</div></fieldset>
    {/if}
    {#if modus === 'neu'}
      <div class="as-feld"><label for="ag-proj">{L('Name des neuen Projekts', 'Name of the new project')}</label><input id="ag-proj" type="text" autocomplete="off" bind:value={projektName}></div>
    {/if}
  {/snippet}

  {#snippet vorschau()}
    {#if !syntax}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald Gruppen und Kennwerte gewählt sind.', 'The preview appears as soon as groups and statistics are chosen.')}</p>
    {:else if vs.wert && !vs.wert.fehler.length}
      <p class="as-satz">{modus === 'neu'
        ? Lp(vs.wert.anzahl, `Das neue Projekt hat ${vs.wert.anzahl} Zeile (eine je Gruppe).`, `Das neue Projekt hat ${vs.wert.anzahl} Zeilen (eine je Gruppe).`, `The new project has ${vs.wert.anzahl} row (one per group).`, `The new project has ${vs.wert.anzahl} rows (one per group).`)
        : Lp(kennwerte.length, `Es kommt ${kennwerte.length} neue Spalte dazu.`, `Es kommen ${kennwerte.length} neue Spalten dazu.`, `${kennwerte.length} new column is added.`, `${kennwerte.length} new columns are added.`)}</p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau, die ersten Zeilen', 'Preview, the first rows')}>
        <table class="as-tab"><thead><tr>{#each vs.wert.spalten as c}<th scope="col" class:zahl={c.art === 'zahl'}>{c.name}</th>{/each}</tr></thead>
          <tbody>{#each vs.wert.zeilen as z}<tr>{#each vs.wert.spalten as c, i}<td class:zahl={typeof z[i] === 'number'}>{anzeigeWert(c, z[i] ?? null)}</td>{/each}</tr>{/each}</tbody></table></div>
    {:else if vs.laeuft}<p><Rechnet text={L('Die Vorschau wird gerechnet …', 'The preview is being calculated …')} /></p>
    {:else if vs.wert?.fehler.length}<p class="as-hilfe">{L('So kommt keine Vorschau zustande.', 'No preview can be made like this.')}</p>
    {:else}<button class="k" type="button" onclick={rechneVorschau}>{L('Vorschau berechnen', 'Calculate preview')}</button>{/if}
  {/snippet}
</AssistentRahmen>
