<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz, yMarkenZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { balkenAchseFuer, balkenAltText, type GruppeKz } from '../lib/balken';

  /**
   * Mittelwert nach Gruppe als Bild für 2 bis 12 Gruppen, auch ohne Test (Später S-F2, E). Punkte (jede Person) mit Mittelwert und 95-%-Konfidenzintervall sind der Vorschlag;
   * Säulen beginnen immer bei 0. Striche: 95-%-KI je Gruppe (t-Verteilung), ± 1 SD oder keine. Unter jeder Gruppe steht n. Der Satz zum Bild steht im Aufrufer (BalkenBlock.svelte).
   */
  let { gruppen, punkte, o, xText = '', einheit = '' }: { gruppen: GruppeKz[]; punkte: Record<string, number[]>; o: { art: 'punkte' | 'saeulen'; fehler: 'ki' | 'se' | 'sd' | 'keine'; einzel: boolean; sw: boolean; titel: string; y: string }; xText?: string; einheit?: string } = $props();
  const k = $derived(gruppen.length);
  const W = $derived(Math.max(480, Math.min(900, 120 + 78 * k))), H0 = 380, L0 = 64, R = 24, U0 = 64;
  const T = $derived(o.titel ? 68 : 24);
  const L = $derived.by(() => L0 + yZusatz(o.y, H0 - T - U0, 13, false) + yMarkenZusatz(ticks.map(v => zahlDe(v))));
  const XZ = $derived(xZusatz(xText, W - L - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const alle = $derived(Object.values(punkte).flat());
  const achse = $derived(balkenAchseFuer(gruppen, { art: o.art, ...(o.einzel && o.art === 'punkte' ? { punkte: alle } : {}), fehler: o.fehler }));
  const y = (v: number) => T + (H - T - U) * (1 - (v - achse.unten) / (achse.oben - achse.unten || 1));
  const ticks = $derived(Array.from({ length: Math.round((achse.oben - achse.unten) / achse.schritt) + 1 }, (_, i) => achse.unten + i * achse.schritt));
  const tinte = 'var(--tinte)', grau = 'color-mix(in srgb,var(--tinte) 35%,transparent)';
  const f = $derived(o.sw ? tinte : 'var(--dg-a)'), p = $derived(o.sw ? grau : 'var(--dg-punkt-a)');
  const breite = $derived((W - L - R) / k);
  const xm = (i: number) => L + breite * (i + 0.5);
  const halb = $derived(Math.max(8, Math.min(44, breite * 0.36)));
  const kurzName = (t: string) => (breite < 90 && t.length > 11 ? t.slice(0, 10) + '…' : t.length > 18 ? t.slice(0, 17) + '…' : t);
  const strich = (g: GruppeKz): [number, number] | null => (o.fehler === 'ki' && g.kiU !== null && g.kiO !== null ? [g.kiU, g.kiO] : o.fehler === 'se' && (g.se ?? (g.sd !== null && g.n > 0 ? g.sd / Math.sqrt(g.n) : null)) !== null ? [g.mittel - (g.se ?? g.sd! / Math.sqrt(g.n)), g.mittel + (g.se ?? g.sd! / Math.sqrt(g.n))] : o.fehler === 'sd' && g.sd !== null ? [g.mittel - g.sd, g.mittel + g.sd] : null);
  const unterzeile = $derived([o.art === 'saeulen' ? Lx('Säule: Mittelwert', 'Bar: mean') : Lx('Dicker Strich: Mittelwert', 'Thick line: mean'), o.fehler === 'ki' ? Lx('Striche: 95 %-KI', 'Whiskers: 95% CI') : o.fehler === 'se' ? Lx('Striche: ± 1 SE', 'Whiskers: ± 1 SE') : o.fehler === 'sd' ? Lx('Striche: ± 1 SD', 'Whiskers: ± 1 SD') : '', o.einzel && o.art === 'punkte' ? Lx('Punkte: einzelne Personen', 'Dots: single people') : ''].filter(Boolean).join(' · '));
  const beschreibung = $derived(balkenAltText(gruppen, einheit ? { einheit } : {}));
  const uid = $props.id();
  const bt = $derived.by(() => {
    const t = bildtext('mittelwerte', { ...(o.titel ? { titel: o.titel } : {}), name: o.y || Lx('Wert', 'Value'), ...(einheit ? { einheit } : {}), ...(xText ? { gruppenName: xText } : {}), fehler: o.fehler === 'ki' ? 'ki95' as const : o.fehler === 'se' ? 'se' as const : o.fehler === 'sd' ? 'sd' as const : 'keine' as const,
      gruppen: gruppen.map(g => { const st = strich(g); return { name: g.gruppe, n: g.n, mittel: g.mittel, unten: st?.[0] ?? null, oben: st?.[1] ?? null }; }) });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  {#if o.titel}<text x="24" y="26" style="font-size:17px" font-weight="650">{o.titel}</text><text x="24" y="46" class="klein">{unterzeile}</text>{/if}
  {#each ticks as v}<line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={o.y} px={13} klasse="klein" />
  {#each gruppen as g, i (g.gruppe)}
    {@const x = xm(i)}
    {#if o.art === 'saeulen'}<rect x={x - halb} y={y(Math.max(g.mittel, 0))} width={halb * 2} height={Math.max(0, Math.abs(y(g.mittel) - y(0)))} fill={p} stroke={f} stroke-width="1.5" rx="2" />{/if}
    {#if o.art === 'punkte' && o.einzel}{#each punkte[g.gruppe] ?? [] as v, j}<circle cx={x + (((j * 37) % 23) - 11) * Math.min(3.2, halb / 11)} cy={y(v)} r="3.5" fill={p} />{/each}{/if}
    {@const st = strich(g)}
    {#if st}<line x1={x} x2={x} y1={y(st[1])} y2={y(st[0])} stroke={f} stroke-width="2.5" />
      <line x1={x - 9} x2={x + 9} y1={y(st[1])} y2={y(st[1])} stroke={f} stroke-width="2.5" /><line x1={x - 9} x2={x + 9} y1={y(st[0])} y2={y(st[0])} stroke={f} stroke-width="2.5" />{/if}
    {#if o.art === 'punkte'}<line x1={x - halb * 0.8} x2={x + halb * 0.8} y1={y(g.mittel)} y2={y(g.mittel)} stroke={f} stroke-width="4" stroke-linecap="round" />{/if}
    <text x={x + halb + 4} y={y(g.mittel) + 5} font-weight="650" style="font-size:13px">{zahlDe(g.mittel, 1)}</text>
    <text x={x} y={H - U + 26} text-anchor="middle" font-weight="600" style="font-size:14px">{kurzName(g.gruppe)}<title>{g.gruppe}</title></text>
    <text x={x} y={H - U + 45} text-anchor="middle" class="klein">n = {zahlDe(g.n, 0)}</text>
  {/each}
  {#if xText}<XTitel x={(L + W - R) / 2} y={H0 - 4} breite={W - L - R} text={xText} klasse="klein" />{/if}
</svg>
<BildBeschreibung {...bt} />
