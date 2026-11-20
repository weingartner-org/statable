<script lang="ts">
  /** Das Bedienfeld „Diagramm gestalten“ (S-G): Beschriftungen, Farben, Größen. Die Zahlen des Diagramms ändert es nie (lib/gestalt.ts). */
  import { L } from '../lib/sitzung.svelte';
  import { fokusNachVerschieben } from '../lib/ordnen';
  import { proz } from '../i18n/profil';
  import { PALETTE, graustufen, istGrund, ordneNach, type Gestalt, type Gefunden } from '../lib/gestalt';

  let { g, gefunden, aendere, schliesse, kategorien = [] }: { g: Gestalt; gefunden: Gefunden; aendere: (n: Gestalt) => void; schliesse: () => void; /** Kategorien, deren Reihenfolge sich ändern lässt (nur wo das Diagramm sie aus den Daten zeichnet) */ kategorien?: { label: string; namen: string[]; feld: 'reihe' | 'reiheB' }[] } = $props();
  const kennung = $props.id();
  const farbName = (id: (typeof PALETTE)[number]['id']) => ({
    petrol: L('Petrol', 'Teal'), koralle: L('Koralle', 'Coral'), blau: L('Blau', 'Blue'), orange: L('Orange', 'Orange'), gruen: L('Grün', 'Green'),
    gelb: L('Gelb', 'Yellow'), violett: L('Violett', 'Purple'), rot: L('Rot', 'Red'), grau: L('Grau', 'Gray'), schwarz: L('Schwarz', 'Black')
  })[id];
  const text = (orig: string, neu: string) => { const t = { ...g.texte }; if (neu.trim() === '' || neu === orig) delete t[orig]; else t[orig] = neu; aendere({ ...g, texte: t }); };
  const farbe = (orig: string, neu: string | null) => { const f = { ...g.farben }; if (!neu || neu === orig) delete f[orig]; else f[orig] = neu; aendere({ ...g, farben: f }); };
  const bewege = (k: { namen: string[]; feld: 'reihe' | 'reiheB' }, pos: number, d: -1 | 1) => {
    const f = [...ordneNach(k.namen, g[k.feld])], z = pos + d; if (z < 0 || z >= f.length) return;
    [f[pos], f[z]] = [f[z]!, f[pos]!]; aendere({ ...g, [k.feld]: f });
    void fokusNachVerschieben(k.feld + ':' + f[z], d, L(`${f[z]} steht jetzt auf Platz ${z + 1} von ${f.length}.`, `${f[z]} is now in position ${z + 1} of ${f.length}.`));
  };
  const alleGrau = () => { const t = graustufen(gefunden.farben.length); aendere({ ...g, farben: Object.fromEntries(gefunden.farben.map((f, i) => [f.hex, t[i]!])) }); };
</script>

<section class="gest" aria-labelledby="gest-t-{kennung}">
  <div class="gest-kopf">
    <h3 id="gest-t-{kennung}">{L('Diagramm gestalten', 'Style the chart')}</h3>
    <button type="button" class="k leise" onclick={schliesse}>{L('Schließen', 'Close')}</button>
  </div>
  <p class="hilfe">{L('Die Zahlen im Diagramm lassen sich nicht ändern. Beschriftungen, Farben und Größen schon.', 'The numbers in the chart cannot be changed. Labels, colors and sizes can.')}</p>

  <div class="gest-block">
    <h4>{L('Beschriftungen', 'Labels')}</h4>
    {#if gefunden.texte.length}
      {#each gefunden.texte as orig, i (orig)}
        <div class="gest-zeile"><label for="gest-x-{kennung}-{i}">{L(`Statt „${orig}“`, `Instead of "${orig}"`)}</label><input id="gest-x-{kennung}-{i}" type="text" value={g.texte[orig] ?? ''} placeholder={orig} oninput={(ev) => text(orig, ev.currentTarget.value)} /></div>
      {/each}
    {:else}<p class="hilfe">{L('Dieses Diagramm hat keine Beschriftungen zum Ändern.', 'This chart has no labels to change.')}</p>{/if}
  </div>

  <div class="gest-block">
    <h4>{L('Farben', 'Colors')}</h4>
    {#if gefunden.farben.length}
      {#each gefunden.farben as f, i (f.hex)}
        {@const jetzt = g.farben[f.hex] ?? f.hex}
        <fieldset class="gest-farbe">
          <legend>{L(`Farbe ${i + 1}`, `Color ${i + 1}`)}</legend>
          <span class="gest-jetzt" style:background={jetzt} aria-hidden="true"></span>
          {#each PALETTE as p (p.hex)}<button type="button" class="gest-punkt" class:an={jetzt.toLowerCase() === p.hex} style:background={p.hex} aria-label={farbName(p.id)} aria-pressed={jetzt.toLowerCase() === p.hex} data-tipp={farbName(p.id)} onclick={() => farbe(f.hex, p.hex)}></button>{/each}
          <label class="gest-eigen"><span>{L('Eigene Farbe', 'Custom color')}</span><input type="color" value={jetzt} oninput={(ev) => farbe(f.hex, ev.currentTarget.value)} /></label>
          {#if g.farben[f.hex]}<button type="button" class="k leise" onclick={() => farbe(f.hex, null)}>{L('Wie berechnet', 'As calculated')}</button>{/if}
        </fieldset>
      {/each}
      <div class="knopfzeile"><button type="button" class="k" onclick={alleGrau}>{L('Alle in Graustufen (Schwarz-Weiß-Druck)', 'All in grayscale (black-and-white print)')}</button></div>
    {:else}<p class="hilfe">{L('Dieses Diagramm hat keine Farben zum Ändern.', 'This chart has no colors to change.')}</p>{/if}
  </div>

  {#each kategorien as k (k.feld)}
    <div class="gest-block">
      <h4>{k.label}</h4>
      {#each ordneNach(k.namen, g[k.feld]) as n, pos (n)}
        <div class="gest-reihe"><span>{n}</span>
          <button type="button" class="k leise" data-ord="hoch" data-ord-key="{k.feld}:{n}" disabled={pos === 0} aria-label={L(`${n} nach oben`, `Move ${n} up`)} onclick={() => bewege(k, pos, -1)}>↑</button>
          <button type="button" class="k leise" data-ord="runter" data-ord-key="{k.feld}:{n}" disabled={pos === k.namen.length - 1} aria-label={L(`${n} nach unten`, `Move ${n} down`)} onclick={() => bewege(k, pos, 1)}>↓</button>
        </div>
      {/each}
    </div>
  {/each}

  <div class="gest-block">
    <h4>{L('Größen', 'Sizes')}</h4>
    <div class="gest-zeile"><label for="gest-s-{kennung}">{L('Schrift', 'Text')} <output>{g.schrift} %</output></label><input id="gest-s-{kennung}" type="range" min="70" max="160" step="5" aria-label={L('Schrift', 'Text')} aria-valuetext={L(`Schrift ${proz(String(g.schrift))}`, `Text ${proz(String(g.schrift))}`)} value={g.schrift} oninput={(ev) => aendere({ ...g, schrift: +ev.currentTarget.value })} /></div>
    <div class="gest-zeile"><label for="gest-z-{kennung}">{L('Punkte und Linien', 'Points and lines')} <output>{g.zeichen} %</output></label><input id="gest-z-{kennung}" type="range" min="50" max="250" step="10" aria-label={L('Punkte und Linien', 'Points and lines')} aria-valuetext={L(`Punkte und Linien ${proz(String(g.zeichen))}`, `Points and lines ${proz(String(g.zeichen))}`)} value={g.zeichen} oninput={(ev) => aendere({ ...g, zeichen: +ev.currentTarget.value })} /></div>
  </div>

  <div class="knopfzeile"><button type="button" class="k leise" disabled={istGrund(g)} onclick={() => aendere({ texte: {}, farben: {}, schrift: 100, zeichen: 100 })}>{L('Alles zurücksetzen', 'Reset everything')}</button></div>
</section>

<style>
  .gest { border: 1px solid var(--linie, #ccc); border-radius: var(--r2, 8px); padding: var(--a3); margin: var(--a2) 0; background: var(--blatt); display: grid; gap: var(--a3); }
  .gest-kopf { display: flex; justify-content: space-between; align-items: center; gap: var(--a2); }
  .gest h3 { margin: 0; font-size: var(--s-klein, 1rem); }
  .gest h4 { margin: 0 0 var(--a2); font-size: var(--s-klein, .9rem); }
  .gest-zeile { display: grid; grid-template-columns: minmax(8rem, 14rem) 1fr; gap: var(--a2); align-items: center; margin-bottom: var(--a2); }
  .gest-farbe { border: 0; padding: 0; margin: 0 0 var(--a2); display: flex; flex-wrap: wrap; gap: var(--a1); align-items: center; }
  .gest-farbe legend { float: inline-start; margin-inline-end: var(--a2); font-weight: 600; }
  .gest-jetzt { width: 1.6rem; height: 1.6rem; border-radius: 4px; border: 2px solid var(--tinte, #222); display: inline-block; }
  .gest-punkt { width: 1.5rem; height: 1.5rem; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; outline-offset: 2px; box-shadow: 0 0 0 1px rgba(0,0,0,.25); }
  .gest-punkt.an { border-color: var(--tinte, #222); box-shadow: 0 0 0 2px var(--blatt), 0 0 0 4px var(--tinte, #222); }
  .gest-reihe { display: flex; align-items: center; gap: var(--a1); margin-bottom: var(--a1); }
  .gest-reihe span { flex: 1; }
  .gest-eigen { display: inline-flex; gap: var(--a1); align-items: center; font-size: var(--s-klein, .85rem); }
  .gest input[type='text'] { width: 100%; }
</style>
