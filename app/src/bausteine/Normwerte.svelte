<script lang="ts">
  /**
   * Normwerte als neue Spalte (z, T, IQ, Stanine, Prozentrang) - klappt unter der Zahlenspalte auf der Seite „Spalten“ auf.
   * Rechnung und Befehle: lib/normwerte.ts. Die Spalte entsteht über aendere(), steht also im Verlauf und lässt sich rückgängig machen.
   */
  import { istFehlend } from '../lib/fehlend';
  import { tick } from 'svelte';
  import { s, L, d, istEn, aendere, rueckgaengig, melde } from '../lib/sitzung.svelte';
  import { lesbar, type Spalte } from '../lib/verzeichnis';
  import { zahlDe } from '../lib/format';
  import { NORM_ARTEN, normBefehl, normRechnen, type NormArt, type NormBezug, normName } from '../lib/normwerte';
  import HilfeLink from './HilfeLink.svelte';

  /** Die Zahlenspalten, für die es Normwerte geben kann; gewählt wird im aufgeklappten Feld. */
  let { spalten }: { spalten: Spalte[] } = $props();
  let wahlName = $state('');
  const sp = $derived(spalten.find(x => x.name === wahlName) ?? spalten[0]!);
  const pre = $derived(`nw-${sp.name}`);
  let offen = $state(false);
  let arten = $state<NormArt[]>(['z']);
  let bezug = $state<'stichprobe' | 'norm'>('stichprobe');
  let gruppe = $state('');
  let mwText = $state(''), sdText = $state('');
  let fehler = $state(''), fertig = $state<string[]>([]);
  let status = $state<HTMLElement | null>(null);

  const idx = $derived(s.spalten.findIndex(x => x.name === sp.name));
  const zahlAus = (t: string) => { const z = t.trim().replace(',', '.'); return z === '' || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(z) ? NaN : Number(z); };
  const werte = $derived(s.zeilen.map(z => { const v = z[idx]; return typeof v === 'number' && Number.isFinite(v) && !istFehlend(sp, v) ? v : null; }));
  const nWerte = $derived(werte.filter(v => v !== null).length);
  /** Spalten, nach denen man getrennt normieren kann: wenige Gruppen, jede mit mindestens zwei Personen. */
  const gruppenSpalten = $derived(s.spalten.flatMap((g, j) => {
    if (g.name === sp.name || g.art === 'datum') return [];
    const zaehl = new Map<string, number>();
    for (const z of s.zeilen) { const v = z[j]; if (v === null || v === undefined || v === '' || (typeof v === 'number' && istFehlend(g, v))) continue; zaehl.set(String(v), (zaehl.get(String(v)) ?? 0) + 1); }
    return zaehl.size >= 2 && zaehl.size <= 30 ? [g] : [];
  }));
  const gruppeSp = $derived(gruppenSpalten.find(g => g.name === gruppe));
  const gruppenWerte = $derived(gruppeSp ? s.zeilen.map(z => { const v = z[s.spalten.indexOf(gruppeSp)]; return v === undefined || v === '' || (typeof v === 'number' && istFehlend(gruppeSp, v)) ? null : v; }) : undefined);
  const mw = $derived(zahlAus(mwText)), sd = $derived(zahlAus(sdText));
  const bezugWert = $derived<NormBezug | null>(bezug === 'stichprobe' ? { typ: 'stichprobe', gruppe: gruppeSp?.name, gruppeText: gruppeSp?.art === 'text' } : Number.isFinite(mw) && Number.isFinite(sd) && sd > 0 ? { typ: 'norm', mw, sd } : null);
  const fehlt = $derived(bezug === 'norm' && !bezugWert ? (mwText.trim() === '' || sdText.trim() === '' ? '' : !Number.isFinite(mw) || !Number.isFinite(sd) ? L('Bitte nur Zahlen eingeben, z. B. 100 und 15.', 'Please enter numbers only, e.g. 100 and 15.') : L('Die Standardabweichung der Norm muss größer als 0 sein.', 'The standard deviation of the norm must be greater than 0.')) : '');
  /** Drei Personen: die ersten drei Zeilen, für die sich ein Wert berechnen lässt. */
  const vorschau = $derived.by(() => {
    if (!bezugWert) return [];
    const alle = normRechnen(werte, bezugWert, gruppenWerte);
    const aus: { zeile: number; wert: number; r: NonNullable<(typeof alle)[number]> }[] = [];
    alle.forEach((r, i) => { if (r && werte[i] !== null && aus.length < 3) aus.push({ zeile: i + 1, wert: werte[i]!, r }); });
    return aus;
  });
  const wahl = $derived(NORM_ARTEN.filter(a => arten.includes(a)));
  const stellen: Record<NormArt, number> = { z: 2, t: 1, iq: 1, stanine: 0, pr: 1 };
  /** Name der Normart in der gewählten Sprache (lib/normwerte.ts). */
  const kopf = normName;

  function schalte(a: NormArt, an: boolean) { arten = an ? [...arten, a] : arten.filter(x => x !== a); fehler = ''; }
  /** Aufklappen: Fokus auf die erste Auswahl (nur bei echtem Aufklappen, nicht beim ersten Zeichnen). */
  let schonOffen = false;
  $effect(() => { if (offen && !schonOffen) tick().then(() => requestAnimationFrame(() => document.getElementById(`${pre}-art-z`)?.focus())); schonOffen = offen; });
  async function anlegen(e: SubmitEvent) {
    e.preventDefault();
    if (s.arbeitet) return;
    fehler = !wahl.length ? L('Bitte mindestens eine Art wählen.', 'Please choose at least one type.')
      : bezug === 'norm' && !bezugWert ? (fehlt || L('Bitte Mittelwert und Standardabweichung der Norm eingeben.', 'Please enter the mean and standard deviation of the norm.'))
      : !vorschau.length ? L('Dafür reichen die Daten nicht: Es braucht mindestens zwei Personen mit Wert (je Gruppe) und eine Streuung größer als 0.', 'The data are not sufficient: at least two people with a value (per group) and a spread greater than 0 are needed.') : '';
    if (fehler) { await tick(); document.getElementById(`${pre}-fehler`)?.focus(); return; }
    const b = normBefehl(sp, wahl, bezugWert!, s.spalten.map(x => x.name), istEn());
    const bez = bezugWert!.typ === 'stichprobe' ? (gruppeSp ? L(`nach ${lesbar(gruppeSp, true)}`, `by ${lesbar(gruppeSp, true)}`) : L('eigene Stichprobe', 'own sample')) : L('Norm', 'norm');
    const r = await aendere(L(`Normwerte für ${sp.name} (${bez}) angelegt`, `Norm scores for ${sp.name} (${bez}) created`), b.syntax, undefined, { art: 'berechnen', ausDaten: bezugWert!.typ === 'stichprobe' });
    if (r.items.some(i => i.type === 'message' && i.severity === 'error')) { await rueckgaengig(); fehler = L('Das ging nicht. Es ist alles wie vorher.', "That didn't work. Everything is as it was before."); melde(fehler); return; }
    fertig = b.neu.map(n => n.name);
    melde(L(`Neue Spalten: ${fertig.join(', ')}.`, `New columns: ${fertig.join(', ')}.`), true);
    await tick(); status?.focus();
  }
</script>

<details class="auf gruppen-namen normwerte" bind:open={offen}>
  <summary>{L('Normwerte als neue Spalte', 'Norm scores as a new column')} <small>{L('z, T, IQ, Stanine, Prozentrang', 'z, T, IQ, stanine, percentile rank')}</small></summary>
  {#if offen}
  <form class="nw-form" onsubmit={anlegen} novalidate aria-label={L(`Normwerte für ${sp.name}`, `Norm scores for ${sp.name}`)}>
    <p class="hilfe">{d('Rechnet den Wert jeder Person in eine Norm-Skala um und legt je Art eine neue Spalte an. Die Spalte selbst bleibt, wie sie ist.', 'Rechnet den Wert jeder Person in eine Norm-Skala um und legt je Art eine neue Spalte an. Die Spalte selbst bleibt, wie sie ist.', 'Converts each person\'s value to a norm scale and adds one new column per type. The column itself stays as it is.')} <HilfeLink id="normwerte" text={L('Hilfe zu den Normwerten', 'Help on norm scores')} /></p>
    {#if spalten.length > 1}
      <div class="eingabe"><label for="{pre}-spalte">{L('Für welche Spalte?', 'For which column?')}</label>
        <select id="{pre}-spalte" value={sp.name} onchange={(e) => { wahlName = e.currentTarget.value; fehler = ''; fertig = []; }}>{#each spalten as x (x.name)}<option value={x.name}>{lesbar(x, true)}</option>{/each}</select></div>
    {/if}
    <fieldset><legend>{L('Welche Normwerte?', 'Which norm scores?')}</legend>
      <div class="kaesten">{#each NORM_ARTEN as a (a)}
        <label><input type="checkbox" checked={arten.includes(a)} id="{pre}-art-{a}" onchange={(e) => schalte(a, e.currentTarget.checked)}>
          {kopf(a)}<small>{a === 'z' ? ' (0 ± 1)' : a === 't' ? ' (50 ± 10)' : a === 'iq' ? ' (100 ± 15)' : a === 'stanine' ? ' (1-9)' : ' (0-100)'}</small></label>{/each}</div></fieldset>
    <fieldset><legend>{L('Woran gemessen?', 'Measured against what?')}</legend>
      <div class="kaesten">
        <label><input type="radio" name="{pre}-bezug" value="stichprobe" bind:group={bezug}>{L('Eigene Daten', 'Own data')}</label>
        <label><input type="radio" name="{pre}-bezug" value="norm" bind:group={bezug}>{L('Normwerte eingeben', 'Enter norm values')}</label></div></fieldset>
    {#if bezug === 'stichprobe'}
      <p class="hilfe">{d(`Mittelwert und Standardabweichung stammen aus diesen Daten (n = ${nWerte}). Das beschreibt die Lage in dieser Stichprobe und ersetzt keine Testnormen.`, `Mittelwert und Standardabweichung stammen aus diesen Daten (n = ${nWerte}). Das beschreibt die Lage in dieser Stichprobe und ersetzt keine Testnormen.`, `Mean and standard deviation come from these data (n = ${nWerte}). This describes the position within this sample and does not replace test norms.`)}</p>
      {#if gruppenSpalten.length}
        <div class="eingabe"><label for="{pre}-gruppe">{L('Getrennt nach (z. B. Klassenstufe)', 'Separately by (e.g. grade)')}</label>
          <select id="{pre}-gruppe" bind:value={gruppe}><option value="">{L('Nicht trennen', 'Do not split')}</option>{#each gruppenSpalten as g (g.name)}<option value={g.name}>{lesbar(g, true)}</option>{/each}</select></div>
      {/if}
    {:else}
      <div class="nw-felder">
        <div class="eingabe"><label for="{pre}-mw">{L('Mittelwert der Norm', 'Mean of the norm')}</label>
          <input id="{pre}-mw" type="text" inputmode="decimal" bind:value={mwText} autocomplete="off" spellcheck="false" placeholder={L('z. B. 24,5', 'e.g. 24.5')} aria-invalid={fehlt ? 'true' : undefined} aria-describedby={fehlt ? `${pre}-fehler` : undefined}></div>
        <div class="eingabe"><label for="{pre}-sd">{L('Standardabweichung der Norm', 'Standard deviation of the norm')}</label>
          <input id="{pre}-sd" type="text" inputmode="decimal" bind:value={sdText} autocomplete="off" spellcheck="false" placeholder={L('z. B. 5,2', 'e.g. 5.2')} aria-invalid={fehlt ? 'true' : undefined} aria-describedby={fehlt ? `${pre}-fehler` : undefined}></div>
      </div>
      <p class="hilfe">{d('Beides steht im Testhandbuch, passend zu Alter oder Klassenstufe. Der Prozentrang folgt dann aus der Normalverteilung.', 'Beides steht im Testhandbuch, passend zu Alter oder Klassenstufe. Der Prozentrang folgt dann aus der Normalverteilung.', 'Both are given in the test manual, matching age or grade. The percentile rank then follows from the normal distribution.')}</p>
    {/if}
    {#if fehlt || fehler}<p id="{pre}-fehler" class="hilfe nw-fehler" role="alert" tabindex="-1">{fehler || fehlt}</p>{/if}
    {#if vorschau.length && wahl.length}
      <table class="nw-vorschau"><caption>{L('Vorschau für drei Personen', 'Preview for three people')}</caption>
        <thead><tr><th scope="col">{L('Zeile', 'Row')}</th><th scope="col">{lesbar(sp, true)}</th>{#each wahl as a (a)}<th scope="col">{kopf(a)}</th>{/each}</tr></thead>
        <tbody>{#each vorschau as v (v.zeile)}<tr><th scope="row">{v.zeile}</th><td>{zahlDe(v.wert)}</td>{#each wahl as a (a)}<td>{zahlDe(v.r[a], stellen[a])}</td>{/each}</tr>{/each}</tbody></table>
    {/if}
    <div class="knopfzeile"><button class="k haupt" type="submit" aria-disabled={s.arbeitet ? 'true' : undefined}>{wahl.length > 1 ? L('Spalten anlegen', 'Create columns') : L('Spalte anlegen', 'Create column')}</button></div>
    {#if fertig.length}<p tabindex="-1" bind:this={status}>{L(`Angelegt: ${fertig.join(', ')}.`, `Created: ${fertig.join(', ')}.`)} {L('Die Befehle stehen im Verlauf; „Rückgängig“ nimmt sie zurück.', 'The commands are in the history; "Undo" takes them back.')} <a href="#daten">{L('Zu den Daten', 'To the data')}</a></p>{/if}
  </form>
  {/if}
</details>

<style>
  .nw-form { display: flex; flex-direction: column; gap: var(--a3); margin-top: var(--a2); max-width: 46rem; }
  .nw-form fieldset { border: 0; padding: 0; margin: 0; }
  .nw-form legend { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); padding: 0; margin-bottom: var(--a1); }
  .nw-form .kaesten { display: flex; flex-wrap: wrap; gap: 0 var(--a4); }
  .nw-form .kaesten label { display: flex; align-items: center; gap: var(--a2); min-height: var(--ziel); cursor: pointer; }
  .nw-form .kaesten input { width: 18px; height: 18px; accent-color: var(--akzent); margin: 0; }
  .nw-form .kaesten small { color: var(--tinte-2); }
  .nw-form .hilfe { display: block; margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .nw-felder { display: flex; flex-wrap: wrap; gap: var(--a3); }
  .nw-felder .eingabe { flex: 1 1 14rem; }
  .nw-fehler { color: var(--fehler, var(--tinte)); font-weight: 600; }
  .nw-vorschau { border-collapse: collapse; font-size: var(--gr-klein); }
  .nw-vorschau caption { text-align: start; font-weight: 600; color: var(--tinte-2); padding-bottom: var(--a1); }
  .nw-vorschau th, .nw-vorschau td { padding: var(--a1) var(--a3); text-align: right; border-bottom: 1px solid var(--linie); font-variant-numeric: tabular-nums; }
  .nw-vorschau thead th { font-weight: 600; }
  .nw-vorschau tbody th { font-weight: 400; color: var(--tinte-2); }
</style>
