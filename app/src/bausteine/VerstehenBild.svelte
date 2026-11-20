<script module lang="ts">
  export interface Saeule { x: number; p: number; treffer: boolean }
</script>
<script lang="ts">
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { achsenMarken, achsenBereich } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { xZusatz } from '../lib/ytitel';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';

  /** Ein Bild für den Reiter „Verstehen“: stetige Dichte mit gefärbter UND schraffierter Fläche, oder Säulen mit hervorgehobenen Treffern (Farbe UND Muster, nie nur Farbe).
   *  Der Text für Vorleser (`beschreibung`) nennt dieselben Zahlen wie das Bild. */
  let { titel, unterzeile = '', beschreibung, xText, yText, stetig, saeulen, breite = 1, marke, ueberlagerung, farbe = 'a' }: {
    titel: string; unterzeile?: string; beschreibung: string; xText: string; yText: string;
    stetig?: { f: (x: number) => number; lo: number; hi: number; schatten: [number, number][]; yMax?: number };
    saeulen?: { punkte: Saeule[]; lo: number; hi: number };
    /** Breite einer Säule in x-Einheiten (bei ganzzahligen Werten 1). */
    breite?: number;
    marke?: { x: number; text: string } | null;
    /** Kurve über den Säulen (Normalnäherung). */
    ueberlagerung?: (x: number) => number;
    farbe?: 'a' | 'b';
  } = $props();
  const kennung = $props.id();
  const W = 640, L = 64, R = 24, T = 94;
  const XZ = $derived(xZusatz(xText, W - L - R));
  const H = $derived(380 + XZ), U = $derived(62 + XZ);
  const lo = $derived(stetig ? stetig.lo : saeulen?.lo ?? 0), hi = $derived(stetig ? stetig.hi : saeulen?.hi ?? 1);
  const X = (v: number) => L + (W - L - R) * ((v - lo) / (hi - lo || 1));

  /** Kurvenpunkte der stetigen Dichte (bzw. der Überlagerung). */
  const SCHRITTE = 240;
  const kurve = $derived.by(() => {
    const f = stetig ? stetig.f : ueberlagerung;
    if (!f) return [] as [number, number][];
    return Array.from({ length: SCHRITTE + 1 }, (_, i) => { const x = lo + ((hi - lo) * i) / SCHRITTE; return [x, f(x)] as [number, number]; });
  });
  const yMax = $derived.by(() => {
    if (stetig?.yMax !== undefined) return stetig.yMax;
    const a = saeulen ? Math.max(0, ...saeulen.punkte.map(p => p.p)) : 0;
    const b = kurve.length ? Math.max(0, ...kurve.map(p => (Number.isFinite(p[1]) ? p[1] : 0))) : 0;
    return Math.max(a, b, 1e-12);
  });
  const yBereich = $derived(achsenBereich(0, yMax));
  const yMarken = $derived(achsenMarken(0, yBereich[1], 4));
  const Y = (v: number) => T + (H - T - U) * (1 - Math.min(v, yBereich[1]) / (yBereich[1] || 1));
  const xMarken = $derived((() => { const m = achsenMarken(lo, hi, 7); return saeulen && breite >= 1 ? m.filter(v => Number.isInteger(v)) : m; })());
  const grundlinie = $derived(H - U);

  const pfadKurve = $derived(kurve.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' '));
  /** Gefärbte Fläche unter der Kurve zwischen a und b. */
  const flaeche = (a: number, b: number) => {
    const von = Math.max(lo, a), bis = Math.min(hi, b);
    if (!stetig || !(bis > von)) return '';
    const n = Math.max(2, Math.ceil(SCHRITTE * (bis - von) / (hi - lo)));
    const pts = Array.from({ length: n + 1 }, (_, i) => { const x = von + ((bis - von) * i) / n; return `${X(x).toFixed(1)},${Y(stetig.f(x)).toFixed(1)}`; });
    return `M${X(von).toFixed(1)},${Y(0).toFixed(1)} L${pts.join(' L')} L${X(bis).toFixed(1)},${Y(0).toFixed(1)} Z`;
  };

  /** Säulen: bis 150 einzeln, darüber als Stufenfläche (Pfade), damit das Bild bei n = 1 000 000 nicht tausende Elemente braucht. */
  const einzeln = $derived((saeulen?.punkte.length ?? 0) <= 150);
  const stufen = (pts: Saeule[]) => {
    if (!pts.length) return '';
    const w = breite / 2;
    return `M${X(pts[0]!.x - w).toFixed(1)},${Y(0).toFixed(1)} ` + pts.map(p => `L${X(p.x - w).toFixed(1)},${Y(p.p).toFixed(1)} L${X(p.x + w).toFixed(1)},${Y(p.p).toFixed(1)}`).join(' ') + ` L${X(pts.at(-1)!.x + w).toFixed(1)},${Y(0).toFixed(1)} Z`;
  };
  const gesamtPfad = $derived(saeulen && !einzeln ? stufen(saeulen.punkte) : '');
  /** Zusammenhängende Treffer als Läufe. */
  const treffPfade = $derived.by(() => {
    if (!saeulen || einzeln) return [] as string[];
    const laeufe: Saeule[][] = [];
    let akt: Saeule[] = [];
    for (const p of saeulen.punkte) { if (p.treffer) akt.push(p); else if (akt.length) { laeufe.push(akt); akt = []; } }
    if (akt.length) laeufe.push(akt);
    return laeufe.map(l => stufen(l));
  });
  const musterId = `muster-${kennung}`;
  /** Bildtext: stetig = Kurve (Fläche und Marke genannt), Säulen bis 150 = Säulendiagramm, sonst allgemein. */
  const bt = $derived.by(() => {
    const xAchse = { name: xText, von: lo, bis: hi }, yAchse = { name: yText };
    const treffer = saeulen ? saeulen.punkte.filter(p => p.treffer).map(p => zahlDe(p.x)) : [];
    const markeText = marke ? [Lx(`Senkrechte Marke bei ${zahlDe(marke.x)}: ${marke.text}.`, `Vertical marker at ${zahlDe(marke.x)}: ${marke.text}.`)] : [];
    const trefferText = saeulen ? [treffer.length && treffer.length <= 20 ? Lx(`Hervorgehobene Säulen (Treffer) bei: ${treffer.join(', ')}.`, `Highlighted columns (hits) at: ${treffer.join(', ')}.`) : treffer.length ? Lx('Treffer sind schraffiert hervorgehoben.', 'Hits are highlighted with hatching.') : ''].filter(Boolean) : [];
    const t = stetig
      ? bildtext('verteilung', { titel, xAchse, yAchse, kurven: [{ punkte: kurve.filter(p => Number.isFinite(p[1])) }], flaeche: stetig.schatten.map((s, i) => ({ name: Lx(`Fläche ${i + 1}`, `Area ${i + 1}`), von: s[0], bis: s[1] })), marken: marke ? [{ name: marke.text, x: marke.x }] : [] })
      : saeulen && einzeln
        ? bildtext('saeulen', { titel, kategorieName: xText, kategorien: saeulen.punkte.map(p => zahlDe(p.x)), wertName: yText, reihen: [{ werte: saeulen.punkte.map(p => p.p) }] })
        : bildtext('sonstiges', { titel, artName: Lx('Säulendiagramm', 'Column chart'), xAchse, yAchse, saetze: [] });
    return { ...t, beschreibung: [beschreibung, ...t.beschreibung, ...(stetig ? [] : trefferText), ...(stetig ? [] : markeText)].filter(Boolean) };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <defs>
    <pattern id={musterId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="8" height="8" fill="var(--dg-punkt-{farbe})" /><line x1="0" y1="0" x2="0" y2="8" stroke="var(--dg-{farbe})" stroke-width="3" />
    </pattern>
    <clipPath id="vb-k-{kennung}"><rect x={L} y={T - 4} width={W - L - R} height={H - T - U + 4} /></clipPath>
  </defs>
  <text x="24" y="26" style="font-size:16px" font-weight="650">{titel}</text>
  <text x="24" y="50" class="klein">{unterzeile}</text>
  {#each yMarken as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={W - R} y1={grundlinie} y2={grundlinie} stroke="var(--dg-achse)" />

  {#if stetig}
    {#each stetig.schatten as s}<path d={flaeche(s[0], s[1])} fill="url(#{musterId})" stroke="var(--dg-{farbe})" stroke-width="1" clip-path="url(#vb-k-{kennung})" />{/each}
    <polyline points={pfadKurve} fill="none" stroke="var(--dg-achse)" stroke-width="2.5" stroke-linecap="round" clip-path="url(#vb-k-{kennung})" />
  {:else if saeulen}
    {#if einzeln}
      {#each saeulen.punkte as p}
        {@const x0 = X(p.x - breite / 2)}
        {@const x1 = X(p.x + breite / 2)}
        {#if p.p > 0}<rect x={x0 + (x1 - x0) * 0.06} y={Y(p.p)} width={Math.max(1, (x1 - x0) * 0.88)} height={Math.max(0, Y(0) - Y(p.p))}
          fill={p.treffer ? `url(#${musterId})` : 'var(--dg-gitter)'} stroke={p.treffer ? `var(--dg-${farbe})` : 'var(--dg-achse)'} stroke-width={p.treffer ? 1.5 : 1}><title>{zahlDe(p.x)}: {zahlDe(p.p, 6)}</title></rect>{/if}
      {/each}
    {:else}
      <path d={gesamtPfad} fill="var(--dg-gitter)" stroke="var(--dg-achse)" stroke-width="1" />
      {#each treffPfade as d}<path {d} fill="url(#{musterId})" stroke="var(--dg-{farbe})" stroke-width="1.5" />{/each}
    {/if}
    {#if ueberlagerung}<polyline points={pfadKurve} fill="none" stroke="var(--dg-b)" stroke-width="3" stroke-dasharray="1 0" stroke-linecap="round" clip-path="url(#vb-k-{kennung})" />{/if}
  {/if}

  {#each xMarken as v}<line x1={X(v)} x2={X(v)} y1={grundlinie} y2={grundlinie + 5} stroke="var(--dg-achse)" /><text x={X(v)} y={grundlinie + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  {#if marke && marke.x >= lo && marke.x <= hi}
    <line x1={X(marke.x)} x2={X(marke.x)} y1={T - 6} y2={grundlinie} stroke="var(--tinte)" stroke-width="2" stroke-dasharray="6 4" />
    <path d="M{X(marke.x) - 6},{T - 14} L{X(marke.x) + 6},{T - 14} L{X(marke.x)},{T - 5} Z" fill="var(--tinte)" />
    <text x={Math.min(Math.max(X(marke.x), L + 30), W - R - 30)} y={T - 20} text-anchor="middle" font-weight="650" style="font-size:13px">{marke.text}</text>
  {/if}
  <XTitel x={(L + W - R) / 2} y={H - XZ - 14} breite={W - L - R} text={xText} klasse="klein" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
