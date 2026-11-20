<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { s, L, Lp, d, melde, aendereDaten } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { wendeAn } from '../lib/datenassistentlauf';
  import { umwandeln, umwandlungAnwenden, dezimalstellenBefehl, angezeigteStellen, labelsUebertragen, type Zielart } from '../lib/spaltenbedienung';
  import { Laedt } from '../lib/laedt.svelte';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Werkzeuge der Seite „Spalten beschreiben“ (Field-Stufe 3, Daten-Bedienung): Spaltentyp umstellen (Zahl, Text, Datum) mit Vorschau,
   * Dezimalstellen der Anzeige, Wertelabels auf andere Spalten übertragen. Jede Änderung ist ein Rückgängig-Schritt mit Protokolleintrag.
   * Rechnung: lib/spaltenbedienung.ts.
   */
  const kennung = $props.id();
  const daten = $derived({ spalten: s.spalten as Spalte[], zeilen: s.zeilen as Wert[][] });
  const artName = (a: string) => (a === 'zahl' ? L('Zahl', 'Number') : a === 'text' ? L('Text', 'Text') : L('Datum', 'Date'));
  const ZIELE: Zielart[] = ['zahl', 'text', 'datum'];

  /* ---------- a) Spaltentyp ---------- */
  let typSpalte = $state(''), typZiel = $state<Zielart>('text');
  const typName = $derived(s.spalten.some(x => x.name === typSpalte) ? typSpalte : s.spalten[0]?.name ?? '');
  const typAlt = $derived(s.spalten.find(x => x.name === typName));
  const zielWahl = $derived(ZIELE.filter(z => z !== typAlt?.art));
  const zielAktiv = $derived(zielWahl.includes(typZiel) ? typZiel : zielWahl[0]!);
  const plan = $derived(typAlt ? umwandeln(daten, typName, zielAktiv) : null);
  const typLaedt = new Laedt();
  const zeigeFehler = $derived(plan ? plan.nichtUmwandelbar.slice(0, 5) : []);
  const typSatz = $derived.by(() => {
    if (!plan || !typAlt) return '';
    if (plan.grund === 'zeit') return L('Spalten mit Uhrzeit lassen sich hier nicht umstellen.', 'Columns with a time of day cannot be converted here.');
    if (plan.grund) return '';
    const n = plan.nichtUmwandelbar.length;
    return Lp(plan.umgewandelt, `${plan.umgewandelt} Wert wird umgewandelt`, `${plan.umgewandelt} Werte werden umgewandelt`, `${plan.umgewandelt} value will be converted`, `${plan.umgewandelt} values will be converted`)
      + (n ? Lp(n, `; ${n} Wert lässt sich nicht umwandeln und wird fehlend (leer).`, `; ${n} Werte lassen sich nicht umwandeln und werden fehlend (leer).`, `; ${n} value cannot be converted and becomes missing (empty).`, `; ${n} values cannot be converted and become missing (empty).`) : '.');
  });
  const typHinweise = $derived.by(() => {
    if (!plan || plan.grund || !typAlt) return [] as string[];
    const h: string[] = [];
    if (plan.verlorenLabels > 0) h.push(Lp(plan.verlorenLabels, `${plan.verlorenLabels} Wertelabel (Gruppenname) passt nicht zur neuen Art und fällt weg.`, `${plan.verlorenLabels} Wertelabels (Gruppennamen) passen nicht zur neuen Art und fallen weg.`, `${plan.verlorenLabels} value label (group name) does not fit the new type and is dropped.`, `${plan.verlorenLabels} value labels (group names) do not fit the new type and are dropped.`));
    if (plan.fehlendBleibt > 0) h.push(Lp(plan.fehlendBleibt, `${plan.fehlendBleibt} Wert war als „keine Angabe“ gekennzeichnet und bleibt fehlend.`, `${plan.fehlendBleibt} Werte waren als „keine Angabe“ gekennzeichnet und bleiben fehlend.`, `${plan.fehlendBleibt} value was marked as "no answer" and stays missing.`, `${plan.fehlendBleibt} values were marked as "no answer" and stay missing.`));
    if (typAlt.art === 'zahl' && zielAktiv === 'datum') h.push(L('Zahl zu Datum: gelesen wird JJJJMMTT, zum Beispiel 20260905 für den 5.9.2026.', 'Number to date: read as YYYYMMDD, for example 20260905 for 5 Sep 2026.'));
    if (typAlt.art === 'datum' && zielAktiv === 'zahl') h.push(L('Datum zu Zahl: das Datum wird zu JJJJMMTT, zum Beispiel 20260905.', 'Date to number: the date becomes YYYYMMDD, for example 20260905.'));
    if (typAlt.art === 'text' && zielAktiv === 'zahl') h.push(L('Text zu Zahl: Komma oder Punkt als Dezimaltrenner; Tausenderpunkte (1.234,5) sind mehrdeutig und werden nicht gelesen.', 'Text to number: comma or point as decimal separator; thousands separators (1.234,5) are ambiguous and are not read.'));
    return h;
  });
  async function umstellen() {
    if (!plan || plan.grund || !typAlt) return;
    const p = plan, alt = typAlt;
    const neu = umwandlungAnwenden({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] }, p);
    const text = L(`Spaltentyp von „${alt.name}“: ${artName(alt.art)} → ${artName(p.ziel)}`, `Column type of "${alt.name}": ${artName(alt.art)} → ${artName(p.ziel)}`) + (p.nichtUmwandelbar.length ? L(` (${p.nichtUmwandelbar.length} Werte fehlend)`, ` (${p.nichtUmwandelbar.length} values missing)`) : '');
    await typLaedt.mit(async () => {
      const ok = await aendereDaten(text, neu.spalten, neu.zeilen.map(z => [...z]) as Wert[][], true, { art: 'neuaufbau', nicht: 'aus-daten' });
      if (ok) melde(text + (p.nichtUmwandelbar.length ? L('. Warnung: Diese Werte sind jetzt fehlend.', '. Warning: these values are now missing.') : '.'), true);
    });
  }

  /* ---------- b) Dezimalstellen ---------- */
  const zahlSpalten = $derived(s.spalten.filter(x => x.art === 'zahl'));
  let dezWahl = $state<string[]>([]), dezZahl = $state(2);
  const dezGueltig = $derived(dezWahl.filter(n => zahlSpalten.some(x => x.name === n)));
  const dezPlan = $derived(dezimalstellenBefehl(daten, dezGueltig, Number.isFinite(dezZahl) ? dezZahl : 2));
  const dezLaedt = new Laedt();
  async function dezSetzen() {
    if (!dezPlan.syntax) return;
    const sx = dezPlan.syntax, n = dezPlan.spalten.length, st = Math.max(0, Math.min(16, Math.trunc(dezZahl)));
    await dezLaedt.mit(() => wendeAn(Lp(n, `Anzeige: ${st} Dezimalstellen bei ${n} Spalte`, `Anzeige: ${st} Dezimalstellen bei ${n} Spalten`, `Display: ${st} decimal places for ${n} column`, `Display: ${st} decimal places for ${n} columns`), sx));
  }
  const alleZahl = () => { dezWahl = dezWahl.length === zahlSpalten.length ? [] : zahlSpalten.map(x => x.name); };

  /* ---------- c) Wertelabels übertragen ---------- */
  const mitLabels = $derived(s.spalten.filter(x => Object.keys(x.werteLabels).length > 0));
  let labQuelle = $state(''), labZiele = $state<string[]>([]);
  const labQ = $derived(mitLabels.some(x => x.name === labQuelle) ? labQuelle : mitLabels[0]?.name ?? '');
  const labKandidaten = $derived(s.spalten.filter(x => x.name !== labQ));
  const labGueltig = $derived(labZiele.filter(n => labKandidaten.some(x => x.name === n)));
  const labPlan = $derived(labQ ? labelsUebertragen(daten, labQ, labGueltig) : null);
  const labLaedt = new Laedt();
  const nenne = (l: string[], max = 6) => (l.length > max ? `${l.slice(0, max).join(', ')} ${L(`und ${l.length - max} weitere`, `and ${l.length - max} more`)}` : l.join(', '));
  async function labUebertragen() {
    if (!labPlan?.syntax) return;
    const sx = labPlan.syntax, q = labQ, n = labPlan.ziele.length;
    await labLaedt.mit(() => wendeAn(Lp(n, `Wertelabels von „${q}“ auf ${n} Spalte übertragen`, `Wertelabels von „${q}“ auf ${n} Spalten übertragen`, `Value labels copied from "${q}" to ${n} column`, `Value labels copied from "${q}" to ${n} columns`), sx));
  }
</script>

<div class="sw">
  <h3 class="sw-t" id="{kennung}-t">{L('Spalten umbauen', 'Change columns')}</h3>
  <p class="hilfe"><HilfeLink id="spalten-seite" text={L('Hilfe: Spaltentyp, Dezimalstellen und Wertelabels', 'Help: column type, decimal places and value labels')} /></p>

  <details class="auf" id="{kennung}-typ">
    <summary>{L('Spaltentyp umstellen (Zahl, Text, Datum)', 'Change the column type (number, text, date)')}</summary>
    <p class="hilfe">{d('Wandle eine Spalte in eine andere Art um, zum Beispiel Zahlen, die als Text eingelesen wurden. Vorher siehst du, wie viele Werte sich nicht umwandeln lassen: Die werden fehlend.', 'Wandeln Sie eine Spalte in eine andere Art um, zum Beispiel Zahlen, die als Text eingelesen wurden. Vorher sehen Sie, wie viele Werte sich nicht umwandeln lassen: Die werden fehlend.', 'Convert a column to another type, for example numbers that were read as text. Beforehand you see how many values cannot be converted: they become missing.')}</p>
    <div class="sw-zeile">
      <div class="eingabe"><label for="{kennung}-ts">{L('Spalte', 'Column')}</label>
        <select id="{kennung}-ts" value={typName} onchange={(e) => (typSpalte = (e.currentTarget as HTMLSelectElement).value)}>{#each s.spalten as sp (sp.name)}<option value={sp.name}>{sp.name} ({artName(sp.art)})</option>{/each}</select></div>
      <div class="eingabe"><label for="{kennung}-tz">{L('Neue Art', 'New type')}</label>
        <select id="{kennung}-tz" value={zielAktiv} onchange={(e) => (typZiel = (e.currentTarget as HTMLSelectElement).value as Zielart)}>{#each zielWahl as z (z)}<option value={z}>{artName(z)}</option>{/each}</select></div>
    </div>
    <div class="sw-vorschau" use:ergebnisAnsage={{ satz: '.sw-satz, .sw-warn', anzahl: 2 }}>
      {#if typSatz}<p class="sw-satz">{typSatz}</p>{/if}
      {#each typHinweise as h}<p class="hilfe">{h}</p>{/each}
      {#if plan?.nichtUmwandelbar.length}
        <p class="sw-warn">{L('Warnung: Diese Werte werden fehlend.', 'Warning: these values become missing.')}</p>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="sw-tab" role="region" tabindex="0" aria-label={L('Werte, die sich nicht umwandeln lassen', 'Values that cannot be converted')}>
          <table class="as-tab"><thead><tr><th scope="col">{L('Zeile', 'Row')}</th><th scope="col">{L('Wert', 'Value')}</th></tr></thead>
            <tbody>{#each zeigeFehler as f (f.zeile)}<tr><th scope="row">{f.zeile + 1}</th><td>{f.wert}</td></tr>{/each}</tbody></table>
          {#if plan.nichtUmwandelbar.length > zeigeFehler.length}<p class="hilfe">{L(`und ${plan.nichtUmwandelbar.length - zeigeFehler.length} weitere`, `and ${plan.nichtUmwandelbar.length - zeigeFehler.length} more`)}</p>{/if}
        </div>
      {/if}
    </div>
    <div class="knopfzeile"><button class="k haupt" type="button" disabled={!plan || !!plan.grund || typLaedt.aktiv} onclick={umstellen}>{#if typLaedt.sichtbar}<Rechnet imKnopf />{/if}{L('Spalte umwandeln', 'Convert column')}</button></div>
  </details>

  <details class="auf" id="{kennung}-dez">
    <summary>{L('Dezimalstellen der Anzeige', 'Decimal places of the display')}</summary>
    <p class="hilfe">{L('Bestimmt nur, wie viele Stellen nach dem Komma angezeigt werden. Die Werte selbst bleiben unverändert, Rechnungen nutzen alle Stellen.', 'Only decides how many places after the decimal point are shown. The values themselves stay unchanged; calculations use all places.')}</p>
    {#if zahlSpalten.length}
      <fieldset class="sw-feld"><legend>{L('Spalten', 'Columns')}</legend>
        <div class="sw-chips">{#each zahlSpalten as sp (sp.name)}<label class="sw-chip"><input type="checkbox" value={sp.name} bind:group={dezWahl}>{sp.name} <small>({angezeigteStellen(sp)})</small></label>{/each}</div>
        <button class="k leise klein" type="button" onclick={alleZahl}>{dezWahl.length === zahlSpalten.length ? L('Keine wählen', 'Choose none') : L('Alle Zahlenspalten wählen', 'Choose all number columns')}</button>
      </fieldset>
      <div class="eingabe"><label for="{kennung}-dn">{L('Stellen nach dem Komma', 'Places after the decimal point')}</label><input id="{kennung}-dn" type="number" min="0" max="16" step="1" bind:value={dezZahl} style="width:6rem"></div>
      <div class="sw-vorschau" use:ergebnisAnsage={{ satz: '.sw-satz, .sw-warn', anzahl: 2 }}>
        {#if !dezGueltig.length}<p class="hilfe">{L('Zuerst Spalten wählen.', 'First choose columns.')}</p>
        {:else}<p class="sw-satz">{Lp(dezGueltig.length, `${dezGueltig.length} Spalte zeigt dann ${Math.max(0, Math.trunc(dezZahl) || 0)} Stellen: ${nenne(dezGueltig)}.`, `${dezGueltig.length} Spalten zeigen dann ${Math.max(0, Math.trunc(dezZahl) || 0)} Stellen: ${nenne(dezGueltig)}.`, `${dezGueltig.length} column will show ${Math.max(0, Math.trunc(dezZahl) || 0)} places: ${nenne(dezGueltig)}.`, `${dezGueltig.length} columns will show ${Math.max(0, Math.trunc(dezZahl) || 0)} places: ${nenne(dezGueltig)}.`)}</p>{/if}
      </div>
      <div class="knopfzeile"><button class="k haupt" type="button" disabled={!dezPlan.syntax || dezLaedt.aktiv} onclick={dezSetzen}>{#if dezLaedt.sichtbar}<Rechnet imKnopf />{/if}{L('Anzeige setzen', 'Set display')}</button></div>
    {:else}<p class="hilfe">{L('Es gibt keine Zahlenspalte.', 'There is no number column.')}</p>{/if}
  </details>

  <details class="auf" id="{kennung}-lab">
    <summary>{L('Wertelabels auf andere Spalten übertragen', 'Copy value labels to other columns')}</summary>
    <p class="hilfe">{L('Gleiche Antwortskala bei vielen Fragen: Die Gruppennamen (1 = stimme zu, 5 = stimme nicht zu) einer Spalte werden auf die gewählten Spalten gesetzt. Die Daten bleiben unverändert; bisherige Namen der Zielspalten werden ersetzt.', 'The same answer scale for many questions: the group names (1 = agree, 5 = disagree) of one column are set on the chosen columns. The data stay unchanged; existing names of the target columns are replaced.')}</p>
    {#if mitLabels.length}
      <div class="eingabe"><label for="{kennung}-lq">{L('Von dieser Spalte', 'From this column')}</label>
        <select id="{kennung}-lq" value={labQ} onchange={(e) => (labQuelle = (e.currentTarget as HTMLSelectElement).value)}>{#each mitLabels as sp (sp.name)}<option value={sp.name}>{sp.name} ({Object.keys(sp.werteLabels).length})</option>{/each}</select></div>
      <fieldset class="sw-feld"><legend>{L('Auf diese Spalten', 'To these columns')}</legend>
        <div class="sw-chips">{#each labKandidaten as sp (sp.name)}<label class="sw-chip"><input type="checkbox" value={sp.name} bind:group={labZiele}>{sp.name}</label>{/each}</div>
        <button class="k leise klein" type="button" onclick={() => { const gl = labKandidaten.filter(x => x.art === s.spalten.find(y => y.name === labQ)?.art).map(x => x.name); labZiele = labGueltig.length === gl.length ? [] : gl; }}>{L('Alle Spalten gleicher Art wählen', 'Choose all columns of the same type')}</button>
      </fieldset>
      <div class="sw-vorschau" use:ergebnisAnsage={{ satz: '.sw-satz, .sw-warn', anzahl: 2 }}>
        {#if !labGueltig.length}<p class="hilfe">{L('Zuerst Zielspalten wählen.', 'First choose target columns.')}</p>
        {:else if labPlan}
          {#if labPlan.ziele.length}<p class="sw-satz">{Lp(labPlan.ziele.length, `${labPlan.paare} Namen gehen auf ${labPlan.ziele.length} Spalte: ${nenne(labPlan.ziele)}.`, `${labPlan.paare} Namen gehen auf ${labPlan.ziele.length} Spalten: ${nenne(labPlan.ziele)}.`, `${labPlan.paare} names go to ${labPlan.ziele.length} column: ${nenne(labPlan.ziele)}.`, `${labPlan.paare} names go to ${labPlan.ziele.length} columns: ${nenne(labPlan.ziele)}.`)}</p>{/if}
          {#if labPlan.ersetzt.length}<p class="sw-warn">{L(`Diese Spalten hatten schon Namen, sie werden ersetzt: ${nenne(labPlan.ersetzt)}.`, `These columns already had names, they are replaced: ${nenne(labPlan.ersetzt)}.`)}</p>{/if}
          {#if labPlan.uebersprungen.some(x => x.grund === 'art')}<p class="hilfe">{L(`Andere Art (Zahl gegen Text), nicht übertragen: ${nenne(labPlan.uebersprungen.filter(x => x.grund === 'art').map(x => x.name))}.`, `Different type (number versus text), not copied: ${nenne(labPlan.uebersprungen.filter(x => x.grund === 'art').map(x => x.name))}.`)}</p>{/if}
        {/if}
      </div>
      <div class="knopfzeile"><button class="k haupt" type="button" disabled={!labPlan?.syntax || labLaedt.aktiv} onclick={labUebertragen}>{#if labLaedt.sichtbar}<Rechnet imKnopf />{/if}{L('Wertelabels übertragen', 'Copy value labels')}</button></div>
    {:else}<p class="hilfe">{d('Keine Spalte hat Wertelabels. Gruppen benennst du weiter unten bei der Spalte.', 'Keine Spalte hat Wertelabels. Gruppen benennen Sie weiter unten bei der Spalte.', 'No column has value labels. Name groups further down at the column.')}</p>{/if}
  </details>
</div>

<style>
  .sw { margin: var(--a3) 0; display: flex; flex-direction: column; gap: var(--a2); }
  .sw-t { font-size: var(--gr-gross, 1.15rem); margin: 0; }
  .sw-zeile { display: flex; flex-wrap: wrap; gap: var(--a3); }
  .sw-vorschau { margin: var(--a2) 0; display: flex; flex-direction: column; gap: var(--a1); min-height: 1.5em; }
  .sw-warn { color: var(--fehler-tinte, var(--fehler, #8a1c13)); font-weight: 600; margin: 0; }
  .sw-satz { margin: 0; }
  .sw-feld { border: 0; padding: 0; margin: var(--a2) 0; display: flex; flex-direction: column; gap: var(--a2); align-items: flex-start; }
  .sw-chips { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .sw-chip { display: inline-flex; align-items: center; gap: var(--a2); min-height: var(--ziel); padding: 0 var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); cursor: pointer; }
  .sw-chip input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 0; }
  .sw-chip:has(input:checked) { border-color: var(--akzent); background: var(--akzent-hell); color: var(--akzent-tinte); font-weight: 600; box-shadow: inset 0 0 0 1px var(--akzent); }
  .sw-chip:has(input:focus-visible) { box-shadow: var(--fokus-ring); }
  .sw-tab { overflow: auto; border: 1px solid var(--linie); border-radius: var(--r-klein); background: var(--blatt); max-width: 24rem; padding: var(--a2); }
  .sw-tab:focus-visible { box-shadow: var(--fokus-ring); }
</style>
