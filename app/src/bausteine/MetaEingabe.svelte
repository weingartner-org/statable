<script lang="ts">
  import { tick } from 'svelte';
  import { L, d, s, melde } from '../lib/sitzung.svelte';
  import { dez } from '../i18n/profil';
  import { lesbar } from '../lib/verzeichnis';
  import { META_SPALTEN, metaEinfuegen, metaSpaltenZahl, type MetaArt } from '../lib/metaanalyse';
  import { entwurf, leereZeilen, metaBeispiel, metaUmstellen, metaZeilenSetzen, modDazu, modWeg } from '../lib/metaentwurf.svelte';
  import Icon from './Icon.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /** Eingabe der Studien: Daten sind hier Studien, nicht Personen. Zeile = Studie. Drei Formen (Effekt + SE oder Intervall, zwei Gruppen, Korrelation). */
  const arten: { id: MetaArt; titel: () => string; hilfe: () => string }[] = [
    { id: 'es', titel: () => L('Effektstärke mit Standardfehler oder Intervall', 'Effect size with standard error or interval'), hilfe: () => L('Jede Studie nennt schon einen Effekt (zum Beispiel d, g, ein Log-Odds-Ratio) und seine Genauigkeit.', 'Each study already reports an effect (for example d, g, a log odds ratio) and its precision.') },
    { id: 'smd', titel: () => L('Zwei Gruppen: Mittelwert, SD und n', 'Two groups: mean, SD and n'), hilfe: () => L('Statable berechnet daraus je Studie Hedges g.', 'Statable calculates Hedges g from these for each study.') },
    { id: 'r', titel: () => L('Korrelation r mit n', 'Correlation r with n'), hilfe: () => L('Statable rechnet über Fisher z und zeigt das Ergebnis wieder als r.', 'Statable calculates via Fisher z and shows the result as r again.') }
  ];
  const kopf = $derived(META_SPALTEN(entwurf.art, entwurf.modus, L));
  const nSp = $derived(metaSpaltenZahl(entwurf.art, entwurf.modus));
  const nMod = $derived(entwurf.modNamen?.length ?? 0);
  let einfuegeText = $state(''), zuordnung = $state<string[]>([]), nameSp = $state('');
  const zahlSpalten = $derived(s.spalten.filter(sp => sp.art !== 'text' && sp.art !== 'datum'));

  async function zeileDazu() { entwurf.zeilen.push({ name: '', w: Array.from({ length: nSp }, () => ''), ...(nMod ? { m: Array.from({ length: nMod }, () => '') } : {}) }); await tick(); document.getElementById(`ms-${entwurf.zeilen.length - 1}-n`)?.focus(); }
  function zeileWeg(i: number) { entwurf.zeilen.splice(i, 1); if (!entwurf.zeilen.length) entwurf.zeilen = leereZeilen(entwurf.art, entwurf.modus, 1, nMod); }
  function uebernehmen(text: string, ab = 0) {
    const neu = metaEinfuegen(text, nSp, nMod);
    if (!neu.length) { melde(L('Nichts zum Einfügen gefunden.', 'Nothing to paste found.')); return; }
    const alt = entwurf.zeilen.slice(0, ab).filter(z => z.name || z.w.some(w => w));
    metaZeilenSetzen([...alt, ...neu]);
    melde(L(`${neu.length} Zeilen eingefügt.`, `${neu.length} rows pasted.`));
  }
  function einfuegen(ev: ClipboardEvent, i: number) {
    const t = ev.clipboardData?.getData('text') ?? '';
    if (!/[\t\n;]/.test(t.trim())) return;
    ev.preventDefault(); uebernehmen(t, i);
  }
  function ausProjekt() {
    const sp = (n: string) => s.spalten.findIndex(x => x.name === n);
    const idx = zuordnung.map(sp);
    if (idx.length < nSp || idx.some(i => i < 0)) return;
    const iname = nameSp ? sp(nameSp) : -1;
    const zeilen = s.zeilen.map((z, r) => ({
      name: iname >= 0 ? (s.spalten[iname]!.werteLabels[String(z[iname])] ?? String(z[iname] ?? '')) : L(`Zeile ${r + 1}`, `Row ${r + 1}`),
      w: idx.map(i => (typeof z[i] === 'number' ? dez(String(z[i])) : ''))
    }));
    metaZeilenSetzen(zeilen); melde(L(`${zeilen.length} Studien aus den Spalten übernommen.`, `${zeilen.length} studies taken from the columns.`));
  }
  $effect(() => { if (zuordnung.length !== nSp) zuordnung = Array.from({ length: nSp }, (_, j) => zuordnung[j] ?? ''); });
</script>

<fieldset class="wahl-meta" style="border:0;padding:0;margin:0">
  <legend class="heft-text" style="margin-bottom:var(--a2)"><b>{d('Welche Angaben hast du aus den Studien?', 'Welche Angaben haben Sie aus den Studien?', 'What information do you have from the studies?')}</b></legend>
  <div class="optionen">
    {#each arten as a (a.id)}
      <label class="option"><input type="radio" name="meta-art" value={a.id} checked={entwurf.art === a.id} onchange={() => metaUmstellen(a.id)}><span>{a.titel()}<small>{a.hilfe()}</small></span></label>
    {/each}
  </div>
</fieldset>

{#if entwurf.art === 'es'}
  <div class="segment" role="radiogroup" aria-label={L('Genauigkeit angegeben als', 'Precision given as')} style="margin-top:var(--a3)">
    <label><input type="radio" name="meta-modus" checked={entwurf.modus === 'se'} onchange={() => metaUmstellen('es', 'se')}>{L('Standardfehler (SE)', 'Standard error (SE)')}</label>
    <label><input type="radio" name="meta-modus" checked={entwurf.modus === 'ki'} onchange={() => metaUmstellen('es', 'ki')}>{L('95 %-Intervall (untere und obere Grenze)', '95% interval (lower and upper limit)')}</label>
  </div>
  {#if entwurf.modus === 'ki'}<p class="heft-text" style="color:var(--tinte-2)">{L('Statable macht daraus den Standardfehler: SE = (obere − untere Grenze) / (2 · 1,96).', 'Statable turns this into the standard error: SE = (upper − lower limit) / (2 · 1.96).')}</p>{/if}
  <label class="schalter" style="margin-top:var(--a3)"><input type="checkbox" bind:checked={entwurf.verhaeltnis}>{L('Die Werte sind Logarithmen eines Verhältnisses (Odds Ratio, Risikoverhältnis, Hazard Ratio): Ergebnis und Diagramme zurückrechnen', 'The values are logarithms of a ratio (odds ratio, risk ratio, hazard ratio): show results and plots back-transformed')}</label>
  <div class="eingabe" style="max-width:420px;margin-top:var(--a2)"><label for="meta-mass">{entwurf.verhaeltnis ? L('Name des Maßes nach dem Zurückrechnen (optional)', 'Name of the measure after back-transforming (optional)') : L('Name des Maßes (optional)', 'Name of the measure (optional)')}</label><input id="meta-mass" type="text" bind:value={entwurf.massName} placeholder={entwurf.verhaeltnis ? L('OR, RR oder HR', 'OR, RR or HR') : L('zum Beispiel Cohens d', 'for example Cohen’s d')}></div>
{/if}

<div class="tabellen-rahmen" style="overflow-x:auto;margin-top:var(--a4)">
  <table class="meta-eingabe">
    <caption class="heft-text" style="text-align: start;margin-bottom:var(--a2)">{L('Eine Zeile je Studie. Zahlen mit Komma oder Punkt; aus einer Tabellenkalkulation lässt sich einfügen.', 'One row per study. Numbers with comma or point; you can paste from a spreadsheet.')}</caption>
    <thead><tr><th scope="col">{L('Studie', 'Study')}</th>{#each kopf as k}<th scope="col">{k}</th>{/each}{#each entwurf.modNamen ?? [] as _, j}<th scope="col" class="meta-mod"><input type="text" bind:value={entwurf.modNamen![j]} aria-label={L(`Name von Moderator ${j + 1}`, `Name of moderator ${j + 1}`)} placeholder={L(`Moderator ${j + 1}`, `Moderator ${j + 1}`)} autocomplete="off"><button class="k leise" type="button" onclick={() => modWeg(j)} aria-label={L(`Moderator ${j + 1} entfernen`, `Remove moderator ${j + 1}`)}>×</button></th>{/each}<th scope="col"><span class="nur-vorleser">{L('Zeile entfernen', 'Remove row')}</span></th></tr></thead>
    <tbody>
      {#each entwurf.zeilen as z, i (i)}
        <tr>
          <td data-label={L('Studie', 'Study')}><input id="ms-{i}-n" type="text" bind:value={z.name} aria-label={L(`Name der Studie ${i + 1}`, `Name of study ${i + 1}`)} placeholder={L(`Studie ${i + 1}`, `Study ${i + 1}`)} onpaste={ev => einfuegen(ev, i)} autocomplete="off"></td>
          {#each z.w as _, j}<td data-label={kopf[j]}><input type="text" inputmode="decimal" bind:value={z.w[j]} aria-label="{L(`Studie ${i + 1}`, `Study ${i + 1}`)}: {kopf[j]}" onpaste={ev => einfuegen(ev, i)} autocomplete="off"></td>{/each}
          {#each entwurf.modNamen ?? [] as _, j}<td data-label={entwurf.modNamen![j] || L(`Moderator ${j + 1}`, `Moderator ${j + 1}`)}><input type="text" inputmode="decimal" bind:value={z.m![j]} aria-label="{L(`Studie ${i + 1}`, `Study ${i + 1}`)}: {entwurf.modNamen![j] || L(`Moderator ${j + 1}`, `Moderator ${j + 1}`)}" onpaste={ev => einfuegen(ev, i)} autocomplete="off"></td>{/each}
          <td><button class="k leise" type="button" onclick={() => zeileWeg(i)} aria-label={L(`Studie ${i + 1} entfernen`, `Remove study ${i + 1}`)}>×</button></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
<div class="knopfzeile" style="margin-top:var(--a3)">
  <button class="k" type="button" onclick={zeileDazu}><Icon n="plus" />{L('Studie hinzufügen', 'Add study')}</button>
  <button class="k" type="button" onclick={modDazu} disabled={nMod >= 3}>{L('Moderator hinzufügen (Meta-Regression)', 'Add moderator (meta-regression)')}</button>
  <button class="k leise" type="button" onclick={() => metaBeispiel()}>{L('Beispiel laden (BCG-Impfung, 13 Studien)', 'Load example (BCG vaccine, 13 studies)')}</button>
  <button class="k leise" type="button" onclick={() => metaBeispiel(true)}>{L('Beispiel mit Moderator laden (BCG-Impfung, Breitengrad)', 'Load example with moderator (BCG vaccine, latitude)')}</button>
  <button class="k leise" type="button" onclick={() => (entwurf.zeilen = leereZeilen(entwurf.art, entwurf.modus, 4, nMod))}>{L('Tabelle leeren', 'Clear table')}</button>
</div>

<p class="heft-text" style="color:var(--tinte-2)">{L('Ein Moderator ist eine Zahl je Studie (zum Beispiel Jahr, Dauer, Alter der Kinder), die erklären könnte, warum sich die Effekte unterscheiden. Mit Moderatoren rechnet Statable zusätzlich eine Meta-Regression.', 'A moderator is a number per study (for example year, duration, age of the children) that might explain why the effects differ. With moderators Statable also calculates a meta-regression.')}</p>
<details class="auf" style="margin-top:var(--a3)"><summary>{L('Aus einer Tabellenkalkulation einfügen', 'Paste from a spreadsheet')}</summary>
  <p class="heft-text">{d(`Kopiere die Zellen (Name der Studie, dann ${nSp} Zahlen: ${kopf.join(', ')}) und füge sie hier ein. Eine Kopfzeile wird übersprungen.`, `Kopieren Sie die Zellen (Name der Studie, dann ${nSp} Zahlen: ${kopf.join(', ')}) und fügen Sie sie hier ein. Eine Kopfzeile wird übersprungen.`, `Copy the cells (study name, then ${nSp} numbers: ${kopf.join(', ')}) and paste them here. A header row is skipped.`)}</p>
  <div class="eingabe"><label for="meta-einf">{L('Eingefügter Text', 'Pasted text')}</label><textarea id="meta-einf" rows="5" bind:value={einfuegeText}></textarea></div>
  <div class="knopfzeile" style="margin-top:var(--a2)"><button class="k" type="button" onclick={() => { uebernehmen(einfuegeText); einfuegeText = ''; }}>{L('In die Tabelle übernehmen', 'Add to the table')}</button></div>
</details>

{#if zahlSpalten.length >= nSp}
  <details class="auf" open={zahlSpalten.length >= 2 && s.zeilen.length >= 2}><summary>{L('Die Studien stehen schon in den Daten dieses Projekts', 'The studies are already in the data of this project')}</summary>
    <p class="heft-text">{d('Wenn jede Zeile deiner Daten eine Studie ist (wie bei JASP), ordne die Spalten zu.', 'Wenn jede Zeile Ihrer Daten eine Studie ist (wie bei JASP), ordnen Sie die Spalten zu.', 'If each row of your data is a study (as in JASP), assign the columns.')}</p>
    <div class="eingabe" style="max-width:420px"><label for="meta-sp-n">{L('Name der Studie (optional)', 'Study name (optional)')}</label>
      <select id="meta-sp-n" bind:value={nameSp}><option value="">{L('keine (Zeile 1, 2, …)', 'none (row 1, 2, …)')}</option>{#each s.spalten as sp (sp.name)}<option value={sp.name}>{lesbar(sp, true)}</option>{/each}</select></div>
    {#each kopf as k, j}
      <div class="eingabe" style="max-width:420px"><label for="meta-sp-{j}">{k}</label>
        <select id="meta-sp-{j}" bind:value={zuordnung[j]}><option value="">{L('bitte wählen', 'please choose')}</option>{#each zahlSpalten as sp (sp.name)}<option value={sp.name}>{lesbar(sp, true)}</option>{/each}</select></div>
    {/each}
    <div class="knopfzeile" style="margin-top:var(--a2)"><button class="k" type="button" aria-disabled={zuordnung.some(x => !x) ? 'true' : undefined} onclick={() => !zuordnung.some(x => !x) && ausProjekt()}>{L('Spalten übernehmen', 'Use these columns')}</button></div>
  </details>
{/if}

<details class="auf" style="margin-top:var(--a3)"><summary>{L('Für Fachleute', 'For specialists')}</summary>
  <label class="schalter"><input type="checkbox" bind:checked={entwurf.kh}>{L('Anpassung nach Knapp und Hartung (t-Test mit k − 1 Freiheitsgraden statt z-Test; Standard)', 'Knapp-Hartung adjustment (t test with k − 1 degrees of freedom instead of z test; default)')}</label>
  <p class="heft-text" style="color:var(--tinte-2)">{L('Statable rechnet ein Random-Effects-Modell mit REML-Schätzung der Streuung zwischen den Studien (τ²) und mit der Anpassung nach Knapp und Hartung: Bei wenigen Studien sind z-Intervalle zu schmal, die Anpassung hält das 95 %-Niveau besser ein (IntHout et al., 2014; Cochrane Handbook). Ohne Haken rechnet Statable wie die Voreinstellung von JASP mit dem z-Test.', 'Statable fits a random-effects model with REML estimation of the between-study variance (τ²) and with the Knapp-Hartung adjustment: with few studies, z intervals are too narrow; the adjustment keeps the 95% level better (IntHout et al., 2014; Cochrane Handbook). Unticked, Statable calculates like the JASP default with the z test.')}</p>
</details>
<HilfeLink id="frage-meta" text={L('Hilfe: Studien zusammenfassen', 'Help: combining studies')} />
