<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { untrack } from 'svelte';
  import { L, melde, sichern } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { sperrSatz } from '../lib/gewichte';
  import { kopiereZufall } from '../lib/zufallswahl';
  import { zufallLauf, passtZu, pruefsumme, type ZufallErgebnis } from '../lib/zufallslauf';
  import { zufallQuelle } from '../lib/zufallsquelle';
  import { saetzeZufall, tabellenZufall, zufallGerechnet, zufallGrundText } from '../lib/zufallsaetze';
  import Ausgabe from './Ausgabe.svelte';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /** „Ohne Normalverteilung - mit Zufallsverfahren“ unter dem Ergebnis (Welle S-B, Teil 6, L5): Permutationstest und Bootstrap-Intervall. Die Wahl (B, Startwert, Art des Intervalls) kommt aus „Weitere Wege“ (`blatt.zus.zufall`).
   *  Der Lauf rechnet in Stücken (Lade-Animation, Fortschritt, Abbrechen) und legt nur das Ergebnis ohne die Ziehungen in `blatt.ergebnis.zufall` ab. Fehlt es oder passt es nicht mehr zu Wahl und Daten, wird neu gezogen.
   *  „Neu ziehen“ nimmt einen neuen Startwert (er steht danach sichtbar im Ergebnis). */
  let { blatt, name, neuerStartwert, mitTabellen = false }: { blatt: Blatt; name: (n: string) => string; neuerStartwert: (startwert: number) => void; /** die Tabellen hier zeigen (sonst stehen sie schon unter „Für deine Arbeit“ bzw. im Ergebnis) */ mitTabellen?: boolean } = $props();
  const kennung = $props.id();
  const wahl = $derived(blatt.zus?.zufall?.an ? kopiereZufall(blatt.zus.zufall) : null);
  const quelle = $derived(wahl ? zufallQuelle(blatt) : null);
  const gespeichert = $derived((blatt.ergebnis as { zufall?: ZufallErgebnis } | null)?.zufall);
  const aktuell = $derived(!!wahl && !!quelle && 'daten' in quelle && passtZu(gespeichert, quelle.daten, wahl));
  let laeuft = $state(false), anteil = $state(0), abgebrochen = $state(false);
  let nummer = 0, stopp = false;

  async function starte() {
    if (!wahl || !quelle || !('daten' in quelle)) return;
    const w = wahl, daten = quelle.daten, meine = ++nummer;
    stopp = false; laeuft = true; abgebrochen = false; anteil = 0;
    let res: ZufallErgebnis | undefined;
    try { res = await zufallLauf(daten, w, { fortschritt: a => { if (meine === nummer) anteil = a; }, weiter: () => meine === nummer && !stopp }); }
    catch (x) { if (import.meta.env.DEV) console.warn('Zufallsverfahren:', x); res = undefined; }
    if (meine !== nummer) return;   // ein neuerer Lauf hat übernommen
    laeuft = false;
    if (res) { blatt.ergebnis = { ...(blatt.ergebnis as object), zufall: res } as Blatt['ergebnis']; void sichern(); }
    else abgebrochen = true;
  }
  function brecheAb() { stopp = true; nummer++; laeuft = false; abgebrochen = true; melde(L('Abgebrochen. Das Zufallsverfahren ist nicht gerechnet.', 'Cancelled. The random procedure has not been calculated.')); }
  // Läuft von selbst, wenn das Ergebnis fehlt oder nicht mehr passt (neue Wahl, andere Daten, Blatt neu gerechnet) - außer nach „Abbrechen“ und nie zweimal für dieselbe Wahl und dieselben Daten.
  const schluessel = $derived(wahl && quelle && 'daten' in quelle ? JSON.stringify([wahl, blatt.id, pruefsumme(quelle.daten)]) : '');
  let letzter = '', gelaufen = '';
  $effect(() => {
    const k = schluessel, noetig = !!k && !aktuell;
    untrack(() => {
      if (k !== letzter) { letzter = k; abgebrochen = false; gelaufen = ''; }   // eine neue Wahl oder neue Daten heben den Abbruch auf
      if (noetig && !abgebrochen && k !== gelaufen) { gelaufen = k; void starte(); }
    });
  });
  function neuZiehen() {
    if (!wahl) return;
    const neu = (Math.floor(Math.random() * 0x7fffffff) % 1_000_000_000) + 1;
    abgebrochen = false; neuerStartwert(neu);
    melde(L(`Neu gezogen mit dem Startwert ${neu}.`, `Drawn again with the seed ${neu}.`));
  }
  const z = $derived(aktuell ? gespeichert! : null);
  const st = $derived(z ? saetzeZufall(z, name) : null);
  const tabellen = $derived(z && mitTabellen ? tabellenZufall(z, name) : []);
  const sperre = $derived.by(() => {
    if (!quelle || !('grund' in quelle)) return null;
    if (quelle.grund === 'umfrage' && blatt.gewicht) { const id = `${blatt.art === 'gruppen' ? 'gruppen' : blatt.art === 'zusammenhang' ? 'zusammenhang' : blatt.art === 'vorhersage' ? 'vorhersage' : 'verteilung'}:zufall`; return sperrSatz(id, blatt.gewicht, L('Das Zufallsverfahren', 'The random procedure')) ?? zufallGrundText('umfrage'); }
    return zufallGrundText(quelle.grund);
  });
</script>

{#if wahl}
  <section class="zufall-ergebnis" aria-labelledby="zufall-t-{kennung}" style="margin-top:var(--a4)">
    <h3 id="zufall-t-{kennung}" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Ohne Normalverteilung - mit Zufallsverfahren', 'No normal distribution - with random procedures')}</h3>
    {#if sperre}
      <p class="heft-text" use:ergebnisAnsage>{sperre}</p>
    {:else if laeuft}
      <p class="heft-text" role="status"><Rechnet text={L('Statable zieht neue Stichproben …', 'Statable is drawing new samples …')} /> <progress value={anteil} max="1" aria-label={L('Fortschritt', 'Progress')} style="vertical-align:middle;width:8rem"></progress> <button class="k" type="button" onclick={brecheAb}>{L('Abbrechen', 'Cancel')}</button></p>
    {:else if abgebrochen}
      <p class="heft-text" role="status">{L('Abgebrochen: Das Zufallsverfahren ist nicht gerechnet.', 'Cancelled: the random procedure has not been calculated.')} <button class="k" type="button" onclick={() => { abgebrochen = false; gelaufen = schluessel; void starte(); }}>{L('Noch einmal ziehen', 'Draw again')}</button></p>
    {:else if z && st}
      <p class="ergebnis-satz">{st.haupt}</p>
      <p class="heft-text" style="margin-top:var(--a2)">{st.zusatz}</p>
      {#each st.hinweise as h, i (i)}<p class="heft-text" style="margin-top:var(--a2);color:var(--tinte-2)">{h}</p>{/each}
      <p class="heft-text" style="margin-top:var(--a2);color:var(--tinte-2)">{st.vorsicht}</p>
      <p class="heft-text" style="margin-top:var(--a2)">{L('Gerechnet', 'Calculated')}: {zufallGerechnet(z)}.</p>
      {#if tabellen.length}<Ausgabe items={tabellen} nurTabellen />{/if}
      <div class="knopfzeile" style="margin-top:var(--a2)">
        <button class="k" type="button" onclick={neuZiehen}>{L('Neu ziehen', 'Draw again')}</button>
        <HilfeLink id="zufallsverfahren-permutation" text={L('Hilfe: Permutationstest und Bootstrap', 'Help: permutation test and bootstrap')} />
      </div>
      <p class="hilfe" id="zufall-neu-{kennung}">{L('„Neu ziehen“ nimmt einen neuen Startwert und zeigt, wie sehr die Zahlen vom Zufall abhängen. Der Startwert steht im Ergebnis; mit ihm lässt sich alles wiederholen.', '"Draw again" takes a new seed and shows how much the numbers depend on chance. The seed is shown in the result; with it everything can be repeated.')}</p>
    {:else}
      <p class="heft-text" role="status"><Rechnet text={L('Statable zieht neue Stichproben …', 'Statable is drawing new samples …')} /></p>
    {/if}
  </section>
{/if}
