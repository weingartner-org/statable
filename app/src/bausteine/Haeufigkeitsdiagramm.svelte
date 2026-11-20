<script lang="ts" module>
  import { kleinste, groesste } from '../lib/menge';
  import type { Haeufigkeit as Hf } from '../lib/ergebnis';
  /** Waagrechte Balken bei vielen oder langen Stufen, sonst senkrechte Säulen (im Deutschen: Balken liegen, Säulen stehen). */
  export const liegt = (h: Hf) => h.werte.length > 8 || Math.max(groesste(h.werte.map(w => w.name.length))) > 12 || h.werte.length * 70 > 480;
</script>

<script lang="ts">
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZeilen, xZusatz, yZeilenHoehe } from '../lib/ytitel';
  import type { Haeufigkeit } from '../lib/ergebnis';
  import { achsenBereich, achsenMarken, balkenPfad } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { proz } from '../i18n/profil';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  /** Balkendiagramm einer Kategorienspalte (nominal, ordinal oder wenige Stufen): Anzahl oder Prozent der gültigen Angaben. Nie ein Kreisdiagramm.
   *  Wenige kurze Stufen stehen als Säulen, sonst als waagerechte Balken (lange Beschriftungen bleiben lesbar). */
  let { h, prozent = false }: { h: Haeufigkeit; prozent?: boolean } = $props();
  const kennung = $props.id();
  const kurz = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  const waagrecht = $derived(liegt(h));
  const wert = (w: { anzahl: number; anteil: number }) => (prozent ? w.anteil * 100 : w.anzahl);
  const text = (v: number) => (prozent ? proz(zahlDe(v, 0)) : zahlDe(v));
  const bereich = $derived(achsenBereich(0, Math.max(groesste(h.werte.map(wert)), prozent ? 1 : 1)));
  const marken = $derived(achsenMarken(bereich[0], bereich[1]));
  const W = 560;

  /* Säulen */
  const R1 = 24, T1 = 76, U10 = 64, H10 = 360;
  const L1 = $derived(prozent ? 84 : 64);
  /** Stufennamen unter den Säulen brechen um statt abzuschneiden (Regel lib/ytitel.ts); der untere Rand wächst mit. */
  const XZ = $derived(Math.max(0, ...h.werte.map(w => xZusatz(w.name, (W - L1 - R1) / h.werte.length * 0.94))));
  const U1 = $derived(U10 + XZ), H1 = $derived(H10 + XZ);
  const Y = (v: number) => T1 + (H1 - T1 - U1) * (1 - v / (bereich[1] || 1));
  const platz = $derived((W - L1 - R1) / h.werte.length);
  /* Balken */
  const L2 = $derived(Math.min(230, Math.max(90, Math.max(groesste(h.werte.map(w => Math.min(w.name.length, 32)))) * 6.8 + 16))), R2 = 56, T2 = 76, U2 = 52;
  /** Zeilenhöhe der Balken: wächst, wenn ein Stufenname drei Zeilen braucht (Regel lib/ytitel.ts). */
  const Z = $derived(Math.max(30, Math.max(...h.werte.map(w => yZeilen(w.name, L2 - 14, 13, false).length)) * yZeilenHoehe(13) + 10));
  const H2 = $derived(T2 + h.werte.length * Z + U2);
  const X = (v: number) => L2 + (W - L2 - R2) * (v / (bereich[1] || 1));
  const H = $derived(waagrecht ? H2 : H1);

  const kopf = $derived(waagrecht
    ? (prozent ? Lx(`Balkendiagramm von ${h.name}: Prozent der gültigen Angaben, ${h.n} gültige Angaben`, `Bar chart of ${h.name}: percent of valid answers, ${h.n} valid answers`) : Lx(`Balkendiagramm von ${h.name}: Anzahl, ${h.n} gültige Angaben`, `Bar chart of ${h.name}: count, ${h.n} valid answers`))
    : (prozent ? Lx(`Säulendiagramm von ${h.name}: Prozent der gültigen Angaben, ${h.n} gültige Angaben`, `Bar chart of ${h.name}: percent of valid answers, ${h.n} valid answers`) : Lx(`Säulendiagramm von ${h.name}: Anzahl, ${h.n} gültige Angaben`, `Bar chart of ${h.name}: count, ${h.n} valid answers`)));
  const bt = $derived.by(() => {
    const t = bildtext('saeulen', { titel: h.name, art: waagrecht ? 'balken' : 'saeulen', kategorieName: h.name, kategorien: h.werte.map(w => w.name),
      wertName: prozent ? Lx('Prozent der gültigen Angaben', 'Percent of valid answers') : Lx('Anzahl', 'Count'), reihen: [{ werte: h.werte.map(wert) }] });
    return { ...t,
      beschreibung: [...t.beschreibung, Lx(`${h.n} gültige Angaben${h.fehlend ? `, ${h.fehlend} fehlend` : ''}.`, `${h.n} valid answers${h.fehlend ? `, ${h.fehlend} missing` : ''}.`)],
      tabelle: { ...t.tabelle, kopf: [h.name, Lx('Anzahl', 'Count'), Lx('Anteil', 'Share')], zeilen: h.werte.map(w => [w.name, zahlDe(w.anzahl), proz(zahlDe(w.anteil * 100, 1))]) } };
  });
  const beschreibung = $derived(kopf + (h.fehlend ? Lx(`, ${h.fehlend} fehlend`, `, ${h.fehlend} missing`) : '') + '. ' + h.werte.map(w => `${w.name} ${zahlDe(w.anzahl)} (${proz(zahlDe(w.anteil * 100, 0))})`).join('; ') + '.');
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <text x="24" y="26" style="font-size:16px" font-weight="650">{kurz(h.name, 56)}</text>
  <text x="24" y="50" class="klein">{prozent ? Lx('Prozent der gültigen Angaben', 'Percent of valid answers') : Lx('Anzahl', 'Count')} (n = {h.n})</text>
  {#if !waagrecht}
    {#each marken as v}<line x1={L1} x2={W - R1} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L1 - 10} y={Y(v) + 4} text-anchor="end" class="klein">{text(v)}</text>{/each}
    <line x1={L1} x2={W - R1} y1={H1 - U1} y2={H1 - U1} stroke="var(--dg-achse)" />
    {#each h.werte as w, i}
      {@const x = L1 + platz * i + platz * 0.15}
      {@const bw = platz * 0.7}
      {@const v = wert(w)}
      <path d={balkenPfad(x, Y(v), bw, Math.max(0, Y(0) - Y(v)), 4)} fill="var(--dg-a)"><title>{w.name}: {zahlDe(w.anzahl)} ({proz(zahlDe(w.anteil * 100, 0))})</title></path>
      <text x={x + bw / 2} y={Y(v) - 6} text-anchor="middle" font-weight="650" style="font-size:13px">{text(v)}</text>
      <g><title>{w.name}</title><XTitel x={x + bw / 2} y={H10 - U10 + 22} breite={platz * 0.94} text={w.name} /></g>
    {/each}
    {#if !prozent}<YTitel x={18} y={(T1 + H1 - U1) / 2} laenge={H1 - T1 - U1} text={Lx('Anzahl', 'Count')} px={13} klasse="klein" />{/if}
  {:else}
    {#each marken as v}<line x1={X(v)} x2={X(v)} y1={T2} y2={T2 + h.werte.length * Z} stroke="var(--dg-gitter)" /><text x={X(v)} y={T2 + h.werte.length * Z + 20} text-anchor="middle" class="klein">{text(v)}</text>{/each}
    <line x1={L2} x2={L2} y1={T2} y2={T2 + h.werte.length * Z} stroke="var(--dg-achse)" />
    {#each h.werte as w, i}
      {@const y = T2 + i * Z + 4}
      {@const v = wert(w)}
      {@const nz = yZeilen(w.name, L2 - 14, 13, false)}
      <text x={L2 - 8} y={y + (Z - 8) / 2 + 4 - (nz.length - 1) * yZeilenHoehe(13) / 2} text-anchor="end" style="font-size:13px"><title>{w.name}</title>{#each nz as z, k}<tspan x={L2 - 8} dy={k ? '1.25em' : 0}>{z}</tspan>{/each}</text>
      <path d={balkenPfad(L2, y, Math.max(0, X(v) - L2), Z - 8, 4, 'rechts')} fill="var(--dg-a)"><title>{w.name}: {zahlDe(w.anzahl)} ({proz(zahlDe(w.anteil * 100, 0))})</title></path>
      <text x={X(v) + 6} y={y + (Z - 8) / 2 + 4} font-weight="650" style="font-size:13px">{text(v)}</text>
    {/each}
    <text x={(L2 + W - R2) / 2} y={H2 - 8} text-anchor="middle" class="klein">{prozent ? Lx('Prozent', 'Percent') : Lx('Anzahl', 'Count')}</text>
  {/if}
</svg>
<BildBeschreibung {...bt} />
