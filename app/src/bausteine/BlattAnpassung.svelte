<script lang="ts">
  import { L, d, sichern } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { ohneNull, pWert, type Verteilung } from '../lib/ergebnis';
  import { anpassungFuer, anpassungSatz, lillieSatz } from '../lib/anpassungsaetze';
  import { sperrSatz } from '../lib/gewichte';
  import { stellenTitel } from '../lib/gewichtkarten';
  import HilfeLink from './HilfeLink.svelte';

  /** Anpassungstests im Blatt „Wie verteilt sich etwas?“ (Welle 7, T1): Normalverteilung (Shapiro-Wilk, Lilliefors) und χ²-Anpassungstest der Kategorien gegen Gleichverteilung
   *  oder eigene Anteile. Die eigenen Anteile gehören zum Ergebnis (`e.anteile`, je Häufigkeitstabelle ein Text je Kategorie); gerechnet wird erst mit dem Knopf „Anteile festlegen und rechnen“,
   *  nie bei jedem Tastendruck - sonst lädt das Feld zum Ausprobieren ein, bis das p passt. Werden festgelegte Anteile nach einem Ergebnis geändert, steht das im Satz (`e.anteileGeaendert`). */
  let { blatt, e, melde }: { blatt: Blatt; e: Verteilung; melde: (t: string) => void } = $props();
  const kennung = $props.id();
  const zahlen = $derived(e.zahlen.filter(z => z.sw || z.lil));
  const tafeln = $derived(e.gruppen.filter(h => h.werte.length >= 2 && h.kategorie !== false));
  /** Höchstens so viele Kategorien lassen sich mit eigenen Anteilen belegen (mehr sind kaum von Hand einzugeben). */
  const MAX = 12;
  /** Entwürfe der Eingabe je Häufigkeitstabelle (noch nicht gerechnet) und welche Eingabefelder offen sind. */
  let entwurf = $state<Record<string, string[]>>({});
  let offen = $state<Record<string, boolean>>({});
  const felder = (name: string, n: number) => entwurf[name] ?? e.anteile?.[name] ?? Array.from({ length: n }, () => '');
  const istOffen = (name: string) => offen[name] ?? !!e.anteile?.[name];
  function festlegen(name: string, n: number) {
    const neu = felder(name, n).map(x => x.trim()), alt = e.anteile?.[name];
    const anteile = { ...(e.anteile ?? {}), [name]: neu };
    // war schon ein Ergebnis mit eigenen Anteilen da und ändern sie sich, gilt das p nicht mehr als Test einer vorab festgelegten Annahme (bleibt, bis auf Gleichverteilung zurückgestellt wird)
    const geaendert = { ...(e.anteileGeaendert ?? {}) };
    if (alt && alt.some(x => x.trim() !== '') && alt.join('|') !== neu.join('|')) geaendert[name] = true;
    blatt.ergebnis = { typ: 'verteilung', e: { ...e, anteile, anteileGeaendert: geaendert } } as Blatt['ergebnis'];
    delete entwurf[name]; void sichern();
    melde(L('Die Anteile sind festgelegt, der Test ist gerechnet.', 'The proportions are fixed, the test is calculated.'));
  }
  function zurueck(name: string) {
    const anteile = { ...(e.anteile ?? {}) }, geaendert = { ...(e.anteileGeaendert ?? {}) };
    delete anteile[name]; delete geaendert[name]; delete entwurf[name]; offen[name] = false;
    blatt.ergebnis = { typ: 'verteilung', e: { ...e, anteile, anteileGeaendert: geaendert } } as Blatt['ergebnis'];
    void sichern(); melde(L('Gleichverteilung gilt wieder.', 'A uniform distribution applies again.'));
  }
</script>

{#if blatt.gewicht && e.zahlen.some(z => !z.stufen)}
  <p class="heft-text" style="margin-top:var(--a4)">{sperrSatz('verteilung:normalitaet', blatt.gewicht, stellenTitel('verteilung:normalitaet'))}</p>
{/if}
{#if zahlen.length || tafeln.length}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Passt die Verteilung zu einer Erwartung? (Normalverteilung, Gleichverteilung)', 'Does the distribution fit an expectation? (normal distribution, uniform distribution)')}</summary>
    {#if zahlen.length}
      <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a3) 0 var(--a2)">{L('Normalverteilung', 'Normal distribution')}</h3>
      {#each zahlen as z (z.name)}
        <p class="heft-text" style="margin:var(--a2) 0">{#if zahlen.length > 1}<b>{z.name}</b> · {/if}{#if z.sw}<b>Shapiro-Wilk:</b> W = {ohneNull(z.sw.w, 3)}, p {pWert(z.sw.p)}.{/if} {#if z.lil}{lillieSatz(z)}{/if}</p>
      {/each}
      <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Beide Tests fragen, ob die Daten von einer Normalverteilung abweichen. „Nicht signifikant“ heißt nur: Die Daten sprechen nicht dagegen, nicht: Sie sind normalverteilt.', 'Both tests ask whether the data depart from a normal distribution. "Not significant" only means that the data do not speak against it, not that they are normally distributed.')}</p>
    {/if}
    {#each tafeln as h (h.name)}
      {@const eigen = e.anteile?.[h.name]}
      {@const a = anpassungFuer(h, eigen, !!e.anteileGeaendert?.[h.name])}
      <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a4) 0 var(--a2)">{L('Kategorien', 'Categories')}: {h.name}</h3>
      {#if a}<p class="heft-text" style="margin:var(--a2) 0">{anpassungSatz(a).join(' ')}</p>{:else}<p class="heft-text">{L('Der Test ließ sich hier nicht rechnen.', 'The test could not be calculated here.')}</p>{/if}
      {#if h.werte.length <= MAX}
        <label data-begriff="chi-quadrat-anpassung" class="schalter"><input type="checkbox" checked={istOffen(h.name)} onchange={(ev) => { if (!ev.currentTarget.checked && eigen) zurueck(h.name); else offen[h.name] = ev.currentTarget.checked; }}>{L('Eigene Anteile statt Gleichverteilung erwarten', 'Expect own proportions instead of a uniform distribution')}</label>
        {#if istOffen(h.name)}
          <p class="heft-text" style="margin:var(--a3) 0 var(--a2)"><b>{L('Die Anteile müssen vor der Auswertung feststehen (aus der Theorie oder einer Vorstudie), nicht aus diesen Daten stammen.', 'The proportions must be fixed before the analysis (from theory or a previous study), not taken from these data.')}</b> {d('Gib für jede Kategorie den erwarteten Anteil ein (zum Beispiel 25 oder 25 %) oder ein Gewicht (zum Beispiel 2, 1, 1); Statable bringt die Zahlen auf die Summe 1.', 'Geben Sie für jede Kategorie den erwarteten Anteil ein (zum Beispiel 25 oder 25 %) oder ein Gewicht (zum Beispiel 2, 1, 1); Statable bringt die Zahlen auf die Summe 1.', 'Enter the expected proportion for each category (for example 25 or 25%) or a weight (for example 2, 1, 1); Statable scales the numbers to a sum of 1.')}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:var(--a2) var(--a3);margin-top:var(--a2)">
            {#each h.werte as w, i (w.name)}
              <div class="eingabe"><label for="an-{kennung}-{h.name}-{i}">{w.name}</label>
                <input id="an-{kennung}-{h.name}-{i}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value={felder(h.name, h.werte.length)[i] ?? ''} placeholder={L('z. B. 25', 'e.g. 25')} style="max-width:10ch" oninput={(ev) => { const je = [...felder(h.name, h.werte.length)]; je[i] = ev.currentTarget.value; entwurf[h.name] = je; }}></div>
            {/each}
          </div>
          <div class="knopfzeile" style="margin-top:var(--a3)"><button class="k haupt" type="button" onclick={() => festlegen(h.name, h.werte.length)}>{L('Anteile festlegen und rechnen', 'Fix the proportions and calculate')}</button></div>
        {/if}
      {/if}
    {/each}
    <p class="hilfe"><HilfeLink id="anpassungstests" text={L('Hilfe: Anpassungstests', 'Help: goodness-of-fit tests')} /></p>
  </details>
{/if}
