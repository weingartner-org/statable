<script module lang="ts">
  let zaehler = 0;
</script>
<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import XTitel from './XTitel.svelte';
  import YTitel from './YTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import { skala, logSkala, zehnerMarken, achsenZahl } from '../lib/lernlaborsaetze';
  import { zahlDe } from '../lib/format';
  /** Verlauf der relativen Häufigkeit gegen die Wahrscheinlichkeit P (Gesetz der großen Zahlen); die Wiederholungen stehen logarithmisch, damit der unruhige Anfang sichtbar bleibt. */
  let { verlauf, p, pText, xText, yText, titel, beschreibung }: { verlauf: number[]; p: number; pText: string; xText: string; yText: string; titel: string; beschreibung: string } = $props();
  const id = `lv${++zaehler}`;
  const W = 640, H0 = 300, Lr = 62, R = 18, T = 18, U0 = 52;
  const XZ = $derived(xZusatz(xText, W - Lr - R)), H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const N = $derived(verlauf.length);
  const x = $derived(logSkala(1, Math.max(10, N), Lr, W - R)), y = $derived(skala(0, 1, H - U, T));
  /** Höchstens etwa 1500 Punkte: die ersten 300 einzeln, danach gleichmäßig auf der Log-Achse. */
  const idx = $derived.by(() => {
    const r: number[] = []; const k = Math.min(N, 300); for (let i = 1; i <= k; i++) r.push(i);
    if (N > k) { const bis = Math.log10(N), von = Math.log10(k); for (let j = 1; j <= 1200; j++) { const i = Math.round(10 ** (von + ((bis - von) * j) / 1200)); if (i > r[r.length - 1]!) r.push(i); } }
    return r;
  });
  const pfad = $derived(idx.map((i, j) => `${j ? 'L' : 'M'}${x(i).toFixed(1)} ${y(verlauf[i - 1]!).toFixed(1)}`).join(' '));
  const xm = $derived(zehnerMarken(N)), ym = [0, 0.25, 0.5, 0.75, 1];
  const bt = $derived.by(() => {
    const sel = idx.filter((_, j) => j % Math.ceil(idx.length / 60) === 0 || j === idx.length - 1);
    const t = bildtext('linie', { titel, xAchse: { name: xText }, yAchse: { name: yText, von: 0, bis: 1 }, x: sel, reihen: [{ name: yText, werte: sel.map(i => verlauf[i - 1]!) }], hilfslinien: [{ name: pText, y: p }] });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each ym as v}<line x1={Lr} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={Lr - 8} y={y(v) + 4} text-anchor="end" class="klein">{achsenZahl(v)}</text>{/each}
  <line x1={Lr} x2={Lr} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={Lr} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each xm as v}<line x1={x(v)} x2={x(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={x(v)} y={H - U + 20} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  <XTitel x={(Lr + W - R) / 2} y={H0 - 8} breite={W - Lr - R} text={xText} klasse="klein" />
  <YTitel x={14} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />
  <line x1={Lr} x2={W - R} y1={y(p)} y2={y(p)} stroke="var(--dg-b)" stroke-width="2" stroke-dasharray="7 4" />
  <text x={W - R - 4} y={y(p) - 6} text-anchor="end" class="klein">{pText}</text>
  <path d={pfad} fill="none" stroke="var(--dg-a)" stroke-width="2" stroke-linejoin="round" />
</svg>
<BildBeschreibung {...bt} />
