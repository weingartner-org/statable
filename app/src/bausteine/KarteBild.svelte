<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { umbrechen, KEIN_WERT_FARBE, type KarteModell } from '../lib/karte';

  /**
   * Das Kartenbild als SVG, ohne Bibliothek. Alles in einem SVG: Titel, Karte, Legende, Fuß und - bei Grenzen von Eurostat - der Pflichtvermerk, damit auch der Export (SVG, PNG) ihn trägt.
   * Texte aus der Datei (Namen der Gebiete) kommen nur als Textknoten hinein; die Pfade bestehen nur aus Zahlen und Befehlsbuchstaben; die Farben sind feste Werte aus karte.ts.
   */
  let { modell, svg = $bindable() }: { modell: KarteModell; svg?: SVGSVGElement } = $props();
  const ZEILE_L = 18, ZEILE_F = 15;
  const fussZeilen = $derived([...modell.fuss.flatMap(t => umbrechen(t)), ...(modell.vermerk ? umbrechen(modell.vermerk) : [])]);
  const legendeHoehe = $derived(modell.legende.length * ZEILE_L + 10);
  const gesamtHoehe = $derived(Math.ceil(modell.hoehe + 30 + legendeHoehe + fussZeilen.length * ZEILE_F + 14));
  const bt = $derived.by(() => {
    const t = bildtext('karte', { titel: modell.titel, gebiete: modell.gebiete.map(g => ({ name: g.titel })), legende: modell.legende.map(l => l.text), vermerk: modell.vermerk });
    return { ...t, beschreibung: [...t.beschreibung, modell.beschreibung] };
  });
</script>

<svg bind:this={svg} viewBox="0 0 {modell.breite} {gesamtHoehe}" role="img" aria-label={bt.kurz} xmlns="http://www.w3.org/2000/svg">
  <defs><pattern id="karte-schraffur" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill={KEIN_WERT_FARBE}/><line x1="0" y1="0" x2="0" y2="6" stroke="#6b6b6b" stroke-width="2"/></pattern></defs>
  <rect width={modell.breite} height={gesamtHoehe} fill="#ffffff"/>
  <text x="8" y="16" font-size="14" font-weight="700" fill="#1c2127">{modell.titel}</text>
  <g transform="translate(0 22)" stroke-linejoin="round">
    {#each modell.gebiete as g}<path d={g.d} fill={g.kein ? 'url(#karte-schraffur)' : g.fuell} stroke="#3a3f45" stroke-width="0.5"><title>{g.titel}</title></path>{/each}
  </g>
  <g transform="translate(8 {modell.hoehe + 36})">
    {#each modell.legende as l, i}
      <rect x="0" y={i * ZEILE_L} width="22" height="12" fill={l.kein ? 'url(#karte-schraffur)' : l.farbe} stroke="#3a3f45" stroke-width="0.5"/>
      <text x="30" y={i * ZEILE_L + 10.5} font-size="12" fill="#1c2127">{l.text}</text>
    {/each}
  </g>
  <g transform="translate(8 {modell.hoehe + 36 + legendeHoehe})">
    {#each fussZeilen as t, i}<text x="0" y={i * ZEILE_F + 11} font-size="10.5" fill="#4c5661">{t}</text>{/each}
  </g>
</svg>
<BildBeschreibung {...bt} />

<style>
  svg { width: 100%; height: auto; max-width: 720px; display: block; border: 1px solid var(--linie); border-radius: var(--r-klein); background: #fff; }
</style>
