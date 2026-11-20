<script lang="ts">
  /** „Tabelle umbauen“ (S-G): Zeilen und Spalten tauschen, ausblenden, umordnen. Die Zahlen bleiben, wie berechnet (lib/pivot.ts). */
  import { L } from '../lib/sitzung.svelte';
  import { fokusNachVerschieben } from '../lib/ordnen';
  import { pivotIstGrund, pivotGrund, reihenfolge, type Pivot } from '../lib/pivot';
  import type { TabelleDe } from '../lib/export';

  let { ur, p, aendere, schliesse }: { ur: TabelleDe; p: Pivot; aendere: (n: Pivot) => void; schliesse: () => void } = $props();
  const kennung = $props.id();
  const nSp = $derived(ur.zeilen[0]!.length - 1), nZe = $derived(ur.zeilen.length - 1);
  const spFolge = $derived(reihenfolge(nSp, [], p.spaltenFolge)), zeFolge = $derived(reihenfolge(nZe, [], p.zeilenFolge));
  const spName = (j: number) => ur.zeilen[0]![j + 1]!.t.trim() || L('(ohne Name)', '(no name)');
  const zeName = (i: number) => ur.zeilen[i + 1]![0]!.t.trim() || L('(ohne Name)', '(no name)');
  const bewege = (folge: number[], pos: number, d: -1 | 1, key = '', name = '') => { const f = [...folge], z = pos + d; if (z < 0 || z >= f.length) return f; [f[pos], f[z]] = [f[z]!, f[pos]!]; void fokusNachVerschieben(key, d, L(`${name} steht jetzt auf Platz ${z + 1} von ${f.length}.`, `${name} is now in position ${z + 1} of ${f.length}.`)); return f; };
  const umschalten = (aus: number[], i: number) => (aus.includes(i) ? aus.filter(x => x !== i) : [...aus, i]);
  const nurEine = (n: number, aus: number[], i: number) => n - aus.filter(x => x !== i).length <= 1 && !aus.includes(i);   // die letzte sichtbare bleibt
</script>

<section class="umb" aria-labelledby="umb-t-{kennung}">
  <div class="umb-kopf"><h3 id="umb-t-{kennung}">{L('Tabelle umbauen', 'Rearrange the table')}</h3><button type="button" class="k leise" onclick={schliesse}>{L('Schließen', 'Close')}</button></div>
  <p class="hilfe">{L('Die Zahlen bleiben, wie berechnet. Nur ihre Anordnung ändert sich.', 'The numbers stay as calculated. Only their arrangement changes.')}</p>
  <label class="schalter"><input type="checkbox" checked={p.tausch} onchange={(ev) => aendere({ ...p, tausch: ev.currentTarget.checked })} />{L('Zeilen und Spalten tauschen', 'Swap rows and columns')}</label>
  <div class="umb-listen">
    {#each [{ t: L('Spalten', 'Columns'), folge: spFolge, aus: p.spaltenAus, name: spName, key: 'sp' }, { t: L('Zeilen', 'Rows'), folge: zeFolge, aus: p.zeilenAus, name: zeName, key: 'ze' }] as liste (liste.key)}
      <fieldset>
        <legend>{liste.t}</legend>
        {#each liste.folge as i, pos (i)}
          {@const an = !liste.aus.includes(i)}
          <div class="umb-zeile">
            <label><input type="checkbox" checked={an} disabled={an && nurEine(liste.folge.length, liste.aus, i)} onchange={() => aendere(liste.key === 'sp' ? { ...p, spaltenAus: umschalten(p.spaltenAus, i) } : { ...p, zeilenAus: umschalten(p.zeilenAus, i) })} /><span class="sr-nur">{L(`${liste.name(i)} zeigen`, `Show ${liste.name(i)}`)}</span><span aria-hidden="true">{liste.name(i)}</span></label>
            <button type="button" class="k leise" data-ord="hoch" data-ord-key="{liste.key}:{i}" disabled={pos === 0} aria-label={L(`${liste.name(i)} nach oben`, `Move ${liste.name(i)} up`)} onclick={() => aendere(liste.key === 'sp' ? { ...p, spaltenFolge: bewege(liste.folge, pos, -1, liste.key + ':' + i, liste.name(i)) } : { ...p, zeilenFolge: bewege(liste.folge, pos, -1, liste.key + ':' + i, liste.name(i)) })}>↑</button>
            <button type="button" class="k leise" data-ord="runter" data-ord-key="{liste.key}:{i}" disabled={pos === liste.folge.length - 1} aria-label={L(`${liste.name(i)} nach unten`, `Move ${liste.name(i)} down`)} onclick={() => aendere(liste.key === 'sp' ? { ...p, spaltenFolge: bewege(liste.folge, pos, 1, liste.key + ':' + i, liste.name(i)) } : { ...p, zeilenFolge: bewege(liste.folge, pos, 1, liste.key + ':' + i, liste.name(i)) })}>↓</button>
          </div>
        {/each}
      </fieldset>
    {/each}
  </div>
  <div class="knopfzeile"><button type="button" class="k leise" disabled={pivotIstGrund(p)} onclick={() => aendere(pivotGrund())}>{L('Alles zurücksetzen', 'Reset everything')}</button></div>
</section>

<style>
  .umb { border: 1px solid var(--linie, #ccc); border-radius: var(--r2, 8px); padding: var(--a3); margin: var(--a2) 0 var(--a3); background: var(--blatt); display: grid; gap: var(--a2); max-width: 36rem; }
  .umb-kopf { display: flex; justify-content: space-between; align-items: center; gap: var(--a2); }
  .umb h3 { margin: 0; font-size: var(--s-klein, 1rem); }
  .umb-listen { display: flex; flex-wrap: wrap; gap: var(--a4); }
  .umb fieldset { border: 0; padding: 0; margin: 0; min-width: 12rem; }
  .umb legend { font-weight: 600; margin-bottom: var(--a1); }
  .umb-zeile { display: flex; align-items: center; gap: var(--a1); }
  .umb-zeile label { flex: 1; display: flex; gap: var(--a2); align-items: center; }
  .sr-nur { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
