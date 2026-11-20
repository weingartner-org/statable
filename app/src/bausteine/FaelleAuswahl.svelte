<script lang="ts">
  import { tick } from 'svelte';
  import { L, Lp, d } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { zitat } from '../i18n/profil';
  import { zahlDe } from '../lib/format';
  import { stufenName, stufenVon, runde2, type Faelle } from '../lib/faelle';
  import { K_MAX, K_VORGABE, fallauswahl, kennungWarnung, uebernehmeVorschlag, type FallRegel, type Vorschlag } from '../lib/fallauswahl';
  import {
    begrenztSatz, begruendung, einwilligungSatz, fehlerSatz, fussSatz, gleichstandSatz, hinweisSaetze, kopfSatz, methodenSatz, regelFrage, regelHinweis, regelTitel, regelWahl, rechenwertSpalte, kennzahlText, festeRegelnSatz, stichprobeSatz, tabelleAuswahl, wiedererkennungSatz, klarnameSatz, type Zeile
  } from '../lib/fallauswahlsaetze';
  import Ausgabe from './Ausgabe.svelte';
  import Icon from './Icon.svelte';

  /**
   * „Fälle für Interviews vorschlagen“ (Später, Welle S-D, G11) in der Karte „Fälle vergleichen“: Studierende, die aus einer Befragung einige Personen für Vertiefungsinterviews auswählen
   * (erklärendes Mixed-Methods-Design), bekommen Vorschläge nach einer benannten Regel (extrem, typisch, abweichend, maximale Variation) und sehen, warum jeder Fall vorgeschlagen wird.
   * Nichts ist vorangekreuzt; die Person hakt an und übernimmt die Fälle als eigene Gruppe (rückgängig mit „Rückgängig“ des Blatts). Statable schreibt nie in die Daten und zeigt nie von selbst Klarnamen.
   */
  let { e, tue }: { e: Faelle; tue: (text: string, fn: (x: Faelle) => void) => void } = $props();
  const kennung = $props.id();

  const zahlSpalten = $derived(e.q.flatMap((sp, qi) => (sp.art === 'zahl' ? [{ sp, qi }] : [])));
  /** Für „divers“: die Spalten mit Kategorien (Gruppenspalten: Text, zwei Werte oder beschriftete nominale Zahlen). */
  const gruppenSpalten = $derived(e.q.flatMap((sp, qi) => (sp.art === 'gruppe' ? [{ sp, qi }] : [])));
  let regel = $state<FallRegel>('extrem');
  let ziel = $state('');                  // Hauptspalte (bei „abweichend“: Zielspalte Y)
  let mehrere = $state<string[]>([]);     // weitere Spalten für typisch, maximale Variation und die X von „abweichend“
  let k = $state(K_VORGABE);
  let angehakt = $state<string[]>([]);    // nichts ist vorangekreuzt
  let zusatz = $state<string[]>([]);      // weitere Spalten, die die Person ausdrücklich zeigen lässt
  let name = $state('');

  /** Bei „divers“ ein bis drei Kategorienspalten, sonst Zahlenspalten. */
  const hauptListe = $derived(regel === 'divers' ? gruppenSpalten : zahlSpalten);
  const MAX_KAT = 3;
  const zielEff = $derived(hauptListe.some(z => z.sp.name === ziel) ? ziel : hauptListe[0]?.sp.name ?? '');
  /** Die Spalten der Rechnung in der Reihenfolge der Regel: erst die Hauptspalte, dann die weiteren (die Hauptspalte steht nie zweimal darin). */
  const rechenNamen = $derived.by((): string[] => {
    if (!zielEff) return [];
    const rest = mehrere.filter(n => n !== zielEff && hauptListe.some(z => z.sp.name === n));
    return regel === 'extrem' ? [zielEff] : regel === 'divers' ? [zielEff, ...rest.slice(0, MAX_KAT - 1)] : [zielEff, ...rest];
  });
  const werte = (n: string): (number | null)[] => { const qi = e.q.findIndex(x => x.name === n); return e.faelle.map(f => (typeof f.q[qi] === 'number' ? (f.q[qi] as number) : null)); };
  /** Kategorien als Zahlen-Codes: Zahlen bleiben, Text bekommt die Stelle in der Reihenfolge der Ausprägungen (1, 2, 3 …); null = fehlend. */
  const stufenListe = (qi: number) => stufenVon(e, qi);
  const codes = (n: string): (number | null)[] => {
    const qi = e.q.findIndex(x => x.name === n), st = stufenListe(qi);
    return e.faelle.map(f => { const v = f.q[qi] ?? null; return v === null ? null : typeof v === 'number' ? v : st.indexOf(v) + 1; });
  };
  /** Name eines Codes einer Spalte (für die Sätze zu leeren Kombinationen): Wertelabel, sonst der Wert. */
  const codeName = (spalte: number, code: number): string => {
    const qi = e.q.findIndex(x => x.name === rechenNamen[spalte]);
    if (qi < 0) return String(code);
    const st = stufenListe(qi), v = st.every(x => typeof x === 'number') ? code : st[code - 1];
    return v === undefined ? String(code) : stufenName(e, qi, v);
  };
  const rechne = (kk: number) => fallauswahl(regel, rechenNamen.map(regel === 'divers' ? codes : werte), { k: kk, zeilen: e.faelle.map(f => f.zeile) });
  const moeglich = $derived(rechenNamen.length > 0 && !((regel === 'abweichend' || regel === 'einflussreich') && rechenNamen.length < 2));
  const a0 = $derived(moeglich ? rechne(k) : null);
  /** Bei zwei Listen (hoch und tief, besser und schlechter) darf derselbe Fall nicht in beiden stehen: Gibt es weniger als 2·k Fälle, wird k auf die Hälfte begrenzt. */
  const kEff = $derived(a0 && !a0.fehler && (regel === 'extrem' || regel === 'abweichend') && a0.n < 2 * k ? Math.max(1, Math.floor(a0.n / 2)) : k);
  const a = $derived(a0 && kEff !== k ? rechne(kEff) : a0);
  const anzeigeNamen = $derived(rechenNamen.map(n => e.q.find(x => x.name === n)?.bezeichnung ?? n));
  const kennungKritisch = $derived(!!e.kennung && kennungWarnung(e.kennungName ?? e.kennung, e.faelle.map(f => f.kennung)));
  /** Weitere Spalten zeigen: alle Zahlen- und Gruppenspalten, die nicht in der Rechnung stehen und nicht nach Namen oder Kontaktdaten aussehen. */
  const zusatzOptionen = $derived(e.q.filter(sp => !rechenNamen.includes(sp.name) && !kennungWarnung(sp.bezeichnung) && !kennungWarnung(sp.name)));
  const zusatzEff = $derived(zusatz.filter(n => zusatzOptionen.some(sp => sp.name === n)));

  const fallVon = (v: Vorschlag) => e.faelle.find(f => f.zeile === v.zeile)!;
  const zeigeKennung = (v: Vorschlag): string => (kennungKritisch || !e.kennung ? L(`Zeile ${v.zeile}`, `Row ${v.zeile}`) : fallVon(v).kennung);
  const zelle = (v: Vorschlag, n: string): string => {
    const qi = e.q.findIndex(x => x.name === n), w = fallVon(v).q[qi] ?? null;
    return w === null ? '-' : e.q[qi]!.art === 'zahl' ? zahlDe(runde2(w as number)) : stufenName(e, qi, w);
  };
  const kombiVon = (v: Vorschlag): string => rechenNamen.map(n => zelle(v, n)).join(' / ');
  const zeilen = $derived<Zeile[]>(a ? a.vorschlaege.map(v => ({ v, kennung: zeigeKennung(v), weitere: zusatzEff.map(n => zelle(v, n)), ...(regel === 'divers' ? { kombi: kombiVon(v) } : {}) })) : []);
  const tabelle = $derived(a && !a.fehler ? tabelleAuswahl(a, zeilen, zusatzEff.map(n => e.q.find(x => x.name === n)!.bezeichnung)) : null);
  const schluesselVon = (v: Vorschlag) => fallVon(v).schluessel;
  const listenKopf = (v: Vorschlag): string => (v.richtung === 'hoch' ? L('höchste', 'highest') : v.richtung === 'tief' ? L('niedrigste', 'lowest') : v.richtung === 'besser' ? L('besser', 'better') : v.richtung === 'schlechter' ? L('schlechter', 'worse') : '');

  /** Jede Änderung der Regel oder der Spalten nimmt die Haken weg: Es bleibt nichts angekreuzt, was zu einer anderen Liste gehörte. */
  function wechsle(f: () => void) { f(); angehakt = []; void tick().then(sageVorschlag); }
  /** Nach Regel- oder Spaltenwahl entsteht der Vorschlag unter dem Schalter, der Fokus bleibt dort: kurz ansagen, was vorgeschlagen wurde (entprellt in sage()). */
  function sageVorschlag() {
    if (!hauptListe.length) return;
    if (!moeglich) { sage(L('Es fehlt noch eine Spalte, aus der vorhergesagt wird.', 'A column to predict from is still missing.')); return; }
    if (!a) return;
    if (a.fehler) { sage(fehlerSatz(a.fehler)); return; }
    const n = a.vorschlaege.length, liste = a.vorschlaege.slice(0, 6).map(zeigeKennung).join(', ') + (n > 6 ? ' …' : '');
    sage(Lp(n, `${n} Fall vorgeschlagen: ${liste}. Die Tabelle steht darunter.`, `${n} Fälle vorgeschlagen: ${liste}. Die Tabelle steht darunter.`, `${n} case suggested: ${liste}. The table is below.`, `${n} cases suggested: ${liste}. The table is below.`));
  }
  const toggle = (liste: string[], n: string, an: boolean) => (an ? [...liste.filter(x => x !== n), n] : liste.filter(x => x !== n));
  function haken(v: Vorschlag, an: boolean) { const s = schluesselVon(v); angehakt = an ? [...new Set([...angehakt, s])] : angehakt.filter(x => x !== s); }
  function uebernimm() {
    const schluessel = [...angehakt], n = schluessel.length, eigen = name.trim();
    if (!n) return;
    const text = eigen
      ? Lp(n, `1 Fall als Gruppe ${zitat(eigen)} übernommen. Die Daten bleiben unverändert.`, `${n} Fälle als Gruppe ${zitat(eigen)} übernommen. Die Daten bleiben unverändert.`, `1 case adopted as the group ${zitat(eigen)}. The data stay unchanged.`, `${n} cases adopted as the group ${zitat(eigen)}. The data stay unchanged.`)
      : Lp(n, '1 Fall als Gruppe „Interview-Vorschlag“ übernommen. Die Daten bleiben unverändert.', `${n} Fälle als Gruppe „Interview-Vorschlag“ übernommen. Die Daten bleiben unverändert.`, '1 case adopted as the group "Interview suggestion". The data stay unchanged.', `${n} cases adopted as the group "Interview suggestion". The data stay unchanged.`);
    tue(text, x => { uebernehmeVorschlag(x, schluessel, eigen || undefined); });
    angehakt = [];
  }
  const methode = $derived(a && !a.fehler ? methodenSatz(a, anzeigeNamen) : '');
</script>

<details class="auf auswahl" style="margin-top:var(--a4)"><summary>{L('Fälle für Interviews vorschlagen', 'Suggest cases for interviews')}</summary>
  <p class="klein">{d('Hier bekommst du Vorschläge, welche Fälle sich für ein Vertiefungsinterview eignen könnten. Statable rechnet nach einer Regel, die du wählst, und zeigt dir, warum jeder Fall vorgeschlagen wird. Es wählt nichts von selbst aus und ändert nichts an den Daten.',
    'Hier bekommen Sie Vorschläge, welche Fälle sich für ein Vertiefungsinterview eignen könnten. Statable rechnet nach einer Regel, die Sie wählen, und zeigt Ihnen, warum jeder Fall vorgeschlagen wird. Es wählt nichts von selbst aus und ändert nichts an den Daten.',
    'Here you get suggestions for which cases might suit an in-depth interview. Statable calculates by a rule you choose and shows you why each case is suggested. It picks nothing by itself and changes nothing in the data.')}</p>
  {#if !zahlSpalten.length && !gruppenSpalten.length}
    <p class="klein" role="note">{L('Dafür braucht es mindestens eine Spalte mit Zahlen unter den Zahlen und Gruppen dieser Tabelle.', 'This needs at least one column with numbers among the numbers and groups of this table.')}</p>
  {:else}
    <fieldset class="regeln"><legend>{L('Welche Regel?', 'Which rule?')}</legend>
      <div class="segment" role="radiogroup" aria-label={L('Regel', 'Rule')}>
        {#each ['extrem', 'typisch', 'abweichend', 'variation', 'einflussreich', 'divers'] as r (r)}<label><input type="radio" name="fa-regel-{kennung}" value={r} checked={regel === r} onchange={() => wechsle(() => (regel = r as FallRegel))}>{regelWahl(r as FallRegel)}</label>{/each}
      </div>
      <p class="klein" style="margin-top:var(--a2)">{regelFrage(regel)}</p>
    </fieldset>

    {#if !hauptListe.length}
      <p class="klein" role="note">{regel === 'divers' ? L('Für diese Regel braucht es mindestens eine Spalte mit Kategorien (Gruppen) in dieser Tabelle.', 'This rule needs at least one column with categories (groups) in this table.') : L('Für diese Regel braucht es mindestens eine Spalte mit Zahlen unter den Zahlen und Gruppen dieser Tabelle.', 'This rule needs at least one column with numbers among the numbers and groups of this table.')}</p>
    {:else}
    <div class="felder">
      <div class="eingabe"><label for="fa-ziel-{kennung}">{regel === 'abweichend' || regel === 'einflussreich' ? L('Zielspalte (was vorhergesagt wird)', 'Target column (what is predicted)') : regel === 'divers' ? L('Welche Kategorienspalte?', 'Which category column?') : L('Welche Spalte?', 'Which column?')}</label>
        <select id="fa-ziel-{kennung}" value={zielEff} onchange={(ev) => wechsle(() => (ziel = ev.currentTarget.value))}>{#each hauptListe as z (z.sp.name)}<option value={z.sp.name}>{z.sp.bezeichnung}</option>{/each}</select></div>
      <div class="eingabe"><label for="fa-k-{kennung}">{regel === 'variation' || regel === 'einflussreich' || regel === 'divers' ? L('Wie viele Fälle?', 'How many cases?') : L('Wie viele je Seite?', 'How many on each side?')}</label>
        <select id="fa-k-{kennung}" value={k} onchange={(ev) => wechsle(() => (k = Number(ev.currentTarget.value)))}>{#each Array.from({ length: K_MAX }, (_, i) => i + 1) as q (q)}<option value={q}>{q}</option>{/each}</select></div>
    </div>
    {#if regel !== 'extrem' && hauptListe.length > 1}
      <fieldset class="regeln"><legend>{regel === 'abweichend' || regel === 'einflussreich' ? L('Woraus vorhergesagt wird (mindestens eine Spalte)', 'What is predicted from (at least one column)') : regel === 'divers' ? L('Weitere Kategorienspalten (freiwillig, insgesamt höchstens 3)', 'Further category columns (optional, 3 in total at most)') : L('Weitere Spalten (freiwillig)', 'Further columns (optional)')}</legend>
        <div class="liste">{#each hauptListe.filter(z => z.sp.name !== zielEff) as z (z.sp.name)}
          <label class="schalter"><input type="checkbox" checked={rechenNamen.includes(z.sp.name)} disabled={regel === 'divers' && rechenNamen.length >= MAX_KAT && !rechenNamen.includes(z.sp.name)} onchange={(ev) => wechsle(() => (mehrere = toggle(mehrere, z.sp.name, ev.currentTarget.checked)))}>{z.sp.bezeichnung}</label>
        {/each}</div></fieldset>
    {/if}
    {#if (regel === 'abweichend' || regel === 'einflussreich') && rechenNamen.length < 2}
      <p class="klein" role="note">{d('Wähle mindestens eine Spalte, aus der vorhergesagt wird.', 'Wählen Sie mindestens eine Spalte, aus der vorhergesagt wird.', 'Choose at least one column to predict from.')}</p>
    {/if}
    {#if kennungKritisch}<p class="klein warn" role="alert"><Icon n="hinweis" k="hw" /><span>{klarnameSatz(e.kennungName ?? e.kennung)}</span></p>{/if}

    {#if a}
      <p class="ergebnis-satz" style="margin-top:var(--a4)">{kopfSatz(a, anzeigeNamen)}</p>
      {#if a.fehler}
        <p class="klein" role="alert">{fehlerSatz(a.fehler)}</p>
      {:else}
        {#if a0 && kEff !== k}<p class="klein" role="note">{begrenztSatz(a0.n, kEff, k)}</p>{/if}
        <p class="klein">{regelHinweis(regel)}</p>
        {#each hinweisSaetze(a, codeName) as h (h)}<p class="klein" role="note">{h}</p>{/each}
        {#if regel === 'einflussreich' || regel === 'divers'}<p class="klein" role="note">{festeRegelnSatz()}</p>{/if}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="scroll" role="region" aria-label={L('Vorgeschlagene Fälle', 'Suggested cases')} tabindex="0">
          <table>
            <caption class="nur-vorleser">{regelTitel(regel)}</caption>
            <thead><tr>
              <th scope="col">{L('Wählen', 'Select')}</th><th scope="col">{L('Liste', 'List')}</th><th scope="col">{L('Rang', 'Rank')}</th><th scope="col">{e.kennung && !kennungKritisch ? (e.kennungName ?? e.kennung) : L('Zeile', 'Row')}</th>
              {#if regel === 'divers'}<th scope="col">{L('Kombination', 'Combination')}</th>{/if}
              <th scope="col">{rechenwertSpalte(regel)}</th><th scope="col">{L('Weitere', 'Others')}</th>
              {#each zusatzEff as n (n)}<th scope="col">{e.q.find(x => x.name === n)?.bezeichnung ?? n}</th>{/each}
              <th scope="col">{L('Begründung', 'Reason')}</th>
            </tr></thead>
            <tbody>
              {#each a.vorschlaege as v, i (`${v.richtung}|${v.rang}|${v.zeile}`)}
                <tr>
                  <td><input type="checkbox" checked={angehakt.includes(schluesselVon(v))} aria-label={L(`Fall ${zeigeKennung(v)} für die Übernahme wählen`, `Choose case ${zeigeKennung(v)} for adoption`)} onchange={(ev) => haken(v, ev.currentTarget.checked)}></td>
                  <td>{listenKopf(v)}</td><td class="zahl">{v.rang}</td><th scope="row">{zeigeKennung(v)}</th>
                  {#if regel === 'divers'}<td>{zeilen[i]?.kombi ?? ''}</td>{/if}
                  <td class="zahl">{kennzahlText(a, v)}</td><td class="zahl">{v.weitere}</td>
                  {#each zusatzEff as n (n)}<td>{zeilen[i]?.weitere[zusatzEff.indexOf(n)] ?? ''}</td>{/each}
                  <td>{begruendung(a, v)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if a.hinweise.includes('gleichstaende')}<p class="klein">{gleichstandSatz()}</p>{/if}
        <p class="klein"><b>{fussSatz()}</b> {einwilligungSatz()}</p>
        <p class="klein">{stichprobeSatz()}</p>

        <div class="felder" style="margin-top:var(--a3)">
          <div class="eingabe"><label for="fa-name-{kennung}">{L('Name der Gruppe', 'Name of the group')}</label>
            <input id="fa-name-{kennung}" type="text" autocomplete="off" placeholder={L('Interview-Vorschlag', 'Interview suggestion')} bind:value={name}></div>
        </div>
        <div class="knopfzeile" style="margin-top:var(--a2)">
          <button type="button" class="k haupt" aria-disabled={angehakt.length ? undefined : 'true'} onclick={uebernimm}>{angehakt.length ? L(`Angehakte Fälle als Gruppe übernehmen (${angehakt.length})`, `Adopt the ticked cases as a group (${angehakt.length})`) : L('Zuerst Fälle ankreuzen', 'Tick cases first')}</button>
        </div>
        <p class="klein">{L('Die Gruppe steht nur in dieser Tabelle. „Rückgängig“ nimmt die Übernahme zurück; die Daten ändern sich nie.', 'The group exists only in this table. "Undo" takes the adoption back; the data never change.')}</p>

        {#if zusatzOptionen.length}
          <details class="auf" style="margin-top:var(--a3)"><summary>{L('Weitere Spalten zeigen (freiwillig)', 'Show further columns (optional)')}</summary>
            <div class="liste" style="margin-top:var(--a2)">{#each zusatzOptionen as sp (sp.name)}
              <label class="schalter"><input type="checkbox" checked={zusatz.includes(sp.name)} onchange={(ev) => (zusatz = toggle(zusatz, sp.name, ev.currentTarget.checked))}>{sp.bezeichnung}</label>
            {/each}</div>
            <p class="klein" role="note">{wiedererkennungSatz()}</p>
          </details>
        {/if}
        {#if tabelle}
          <details class="auf" style="margin-top:var(--a2)"><summary>{L('Als Tabelle für Excel und Word (nur Kennung und Rechenwerte)', 'As a table for Excel and Word (only ID and calculated values)')}</summary>
            <div class="joint"><Ausgabe items={[tabelle]} nurTabellen /></div>
            <p class="klein">{methode}</p>
          </details>
        {/if}
      {/if}
    {/if}
    {/if}
  {/if}
</details>

<style>
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); margin: var(--a2) 0 0; max-width: var(--breite-text); }
  .warn { display: flex; gap: var(--a2); align-items: flex-start; padding: var(--a2) var(--a3); background: var(--hinweis-hell); border-inline-start: 3px solid var(--hinweis); border-radius: var(--r-klein); color: var(--tinte); }
  .regeln { border: 0; padding: 0; margin: var(--a3) 0 0; }
  .regeln legend { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); padding: 0; margin-bottom: var(--a1); }
  .felder { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: var(--a3); margin-top: var(--a3); }
  .liste { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); }
  .scroll { overflow: auto; max-height: min(60vh, 40rem); border: 1px solid var(--linie); border-radius: var(--r-klein); max-width: 100%; margin-top: var(--a3); }
  .scroll:focus-visible { outline: var(--fokus-outline); outline-offset: -3px; }
  table { border-collapse: collapse; width: 100%; font: 400 var(--gr-text)/1.45 var(--schrift-heft); }
  th, td { text-align: start; vertical-align: top; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); }
  thead th { position: sticky; top: 0; background: var(--blatt-2); font-weight: 600; }
  tbody th { font-weight: 600; white-space: nowrap; }
  td.zahl { text-align: right; font-variant-numeric: tabular-nums; }
  .joint { overflow-x: auto; max-width: 100%; }
</style>
