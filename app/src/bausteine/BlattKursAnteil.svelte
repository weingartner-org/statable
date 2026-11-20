<script lang="ts">
  import { L, sichern } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { komma, pWert, type Verteilung } from '../lib/ergebnis';
  import { anteilTest, anteilSchritte } from '../lib/kurstests';
  import { zahlAusText } from '../lib/aequirci';
  import { proz } from '../i18n/profil';
  import KursSchritte from './KursSchritte.svelte';
  import { kursSprung, kursZielFrisch } from '../lib/kursziel';

  /** Anteil einer Kategorie mit einem festen Wert vergleichen (Kurs-Ordnung 25.10.2026, „eine Stichprobe, Anteil“): exakter Binomialtest, dazu der z-Test wie am TI-84.
   *  Kategorie und Vergleichswert gehören zum Ergebnis (`e.anteilTests`); gerechnet wird erst mit dem Knopf, nie bei jedem Tastendruck. */
  let { blatt, e, melde }: { blatt: Blatt; e: Verteilung; melde: (t: string) => void } = $props();
  const kennung = $props.id();
  const gewaehlt = kursZielFrisch(blatt, 'anteil');
  const tafeln = $derived(e.gruppen.filter(h => h.werte.length >= 2 && h.n >= 1));
  let entwurf = $state<Record<string, { kategorie?: string; text?: string }>>({});
  const kat = (name: string) => entwurf[name]?.kategorie ?? e.anteilTests?.[name]?.kategorie ?? tafeln.find(h => h.name === name)?.werte[0]?.name ?? '';
  const feld = (name: string) => entwurf[name]?.text ?? (e.anteilTests?.[name] ? komma(e.anteilTests[name]!.p0, 2).replace(/0+$/, '').replace(/[,.]$/, '') : '');
  /** „0,5“, „0.5“ oder „50 %“; ohne Prozentzeichen muss der Wert zwischen 0 und 1 liegen. */
  function anteilAus(t: string): number | null {
    const mitProzent = /%\s*$/.test(t), w = zahlAusText(t.replace(/%\s*$/, '').trim());
    if (w === null) return null;
    const p = mitProzent ? w / 100 : w;
    return p > 0 && p < 1 ? p : null;
  }
  function setzen(name: string) {
    const p0 = anteilAus(feld(name).trim());
    if (p0 === null) { melde(L('Bitte einen Anteil zwischen 0 und 1 eintragen, zum Beispiel 0,5 oder 50 %.', 'Please enter a proportion between 0 and 1, for example 0.5 or 50%.')); return; }
    blatt.ergebnis = { typ: 'verteilung', e: { ...e, anteilTests: { ...(e.anteilTests ?? {}), [name]: { kategorie: kat(name), p0 } } } } as Blatt['ergebnis'];
    delete entwurf[name]; void sichern();
    melde(L('Der Vergleichswert ist festgelegt, der Test ist gerechnet.', 'The comparison value is set, the test is calculated.'));
  }
  function entfernen(name: string) {
    const at = { ...(e.anteilTests ?? {}) }; delete at[name]; delete entwurf[name];
    blatt.ergebnis = { typ: 'verteilung', e: { ...e, anteilTests: at } } as Blatt['ergebnis'];
    void sichern(); melde(L('Der Test ist entfernt.', 'The test is removed.'));
  }
  const pz = (p: number) => proz(komma(100 * p, 1));
  /** Der Vergleichswert ohne überflüssige Stelle: 40 % statt 40,0 % (wie im Satz). */
  const pw = (p: number) => proz(komma(100 * p, Number.isInteger(Math.round(p * 1e6) / 1e4) ? 0 : 1));
</script>

{#if tafeln.length && !blatt.gewicht}
  <details class="auf" style="margin-top:var(--a4)" open={gewaehlt || !!Object.keys(e.anteilTests ?? {}).length} use:kursSprung={gewaehlt} data-kurs="anteil"><summary>{L('Anteil mit einem festen Wert vergleichen (Binomialtest)', 'Compare a proportion with a fixed value (binomial test)')}</summary>
    <p class="heft-text" style="margin:var(--a2) 0">{L('Weicht der Anteil einer Kategorie von einem Wert ab, der vor der Auswertung feststeht, zum Beispiel 50 % oder einem Anteil aus einer früheren Erhebung? Den Wert nicht erst nach dem Blick auf die Daten wählen.', 'Does the proportion of a category differ from a value that is fixed before the analysis, for example 50% or a proportion from an earlier survey? Do not choose the value only after looking at the data.')}</p>
    {#each tafeln as h, i (h.name)}
      {@const fest = e.anteilTests?.[h.name]}
      {@const w = fest ? h.werte.find(x => x.name === fest.kategorie) : undefined}
      {@const r = fest && w ? anteilTest(w.anzahl, h.n, fest.p0) : null}
      <div class="eingabe" style="margin-top:var(--a3);max-width:560px">
        <label for="{kennung}-k{i}">{L(`Kategorie in „${h.name}“`, `Category in "${h.name}"`)}</label>
        <select id="{kennung}-k{i}" value={kat(h.name)} onchange={(ev) => (entwurf[h.name] = { ...(entwurf[h.name] ?? {}), kategorie: (ev.currentTarget as HTMLSelectElement).value })} style="max-width:20rem">
          {#each h.werte as x (x.name)}<option value={x.name}>{x.name} ({x.anzahl})</option>{/each}
        </select>
        <label for="{kennung}-p{i}" style="margin-top:var(--a2)">{L('Vergleichswert (Anteil, z. B. 0,5 oder 50 %)', 'Comparison value (proportion, e.g. 0.5 or 50%)')}</label>
        <div class="knopfzeile"><input id="{kennung}-p{i}" type="text" inputmode="decimal" value={feld(h.name)} oninput={(ev) => (entwurf[h.name] = { ...(entwurf[h.name] ?? {}), text: (ev.currentTarget as HTMLInputElement).value })} onkeydown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); setzen(h.name); } }} style="max-width:10rem">
          <button class="k" type="button" onclick={() => setzen(h.name)}>{L('Festlegen und rechnen', 'Set and calculate')}</button>
          {#if fest}<button class="k leise" type="button" onclick={() => entfernen(h.name)}>{L('Test entfernen', 'Remove test')}</button>{/if}</div>
      </div>
      {#if r && fest}
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L(`Binomialtest: ${fest.kategorie} in ${h.name} (Vergleichswert ${pw(r.p0)})`, `Binomial test: ${fest.kategorie} in ${h.name} (comparison value ${pw(r.p0)})`)}</b></caption>
          <thead><tr><th scope="col">{L('Anzahl', 'Count')}</th><th scope="col">N</th><th scope="col">{L('Anteil', 'Proportion')}</th><th scope="col">{L('95 %-KI (Clopper-Pearson)', '95% CI (Clopper-Pearson)')}</th><th scope="col">{L('p exakt', 'p exact')}</th><th scope="col">z</th><th scope="col">{L('p (z-Test)', 'p (z test)')}</th></tr></thead>
          <tbody><tr><td style="text-align:right">{r.x}</td><td style="text-align:right">{r.n}</td><td style="text-align:right">{pz(r.anteil)}</td><td style="text-align:right">[{pz(r.lo)}; {pz(r.hi)}]</td><td style="text-align:right">{pWert(r.pExakt).replace(/^= /, '')}</td><td style="text-align:right">{komma(r.z, 2)}</td><td style="text-align:right">{pWert(r.pZ).replace(/^= /, '')}</td></tr></tbody>
        </table></div>
        {#if !r.naeherungOk}<p class="heft-text">{L(`Für den z-Test sind die Zahlen klein (n · p₀ oder n · (1 − p₀) unter 10). Hier gilt der exakte Wert.`, `The numbers are small for the z test (n · p₀ or n · (1 − p₀) below 10). The exact value applies here.`)}</p>{/if}
        <KursSchritte k={anteilSchritte(r)} />
      {/if}
    {/each}
    <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Zweiseitig. Der exakte Binomialtest zählt alle Ausgänge, die höchstens so wahrscheinlich sind wie der beobachtete (wie R und SPSS bei 50 %). Der z-Test ist die Näherung über die Normalverteilung, wie 1-PropZTest am TI-84. Satz und Zeile für die Arbeit stehen oben im Ergebnis.', 'Two-sided. The exact binomial test counts all outcomes that are at most as likely as the observed one (as in R, and SPSS at 50%). The z test is the normal approximation, like 1-PropZTest on the TI-84. The sentence and the line for the paper are in the result above.')}</p>
  </details>
{/if}
