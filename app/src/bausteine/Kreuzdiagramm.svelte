<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { xZusatz, yZeilen, yZeilenHoehe } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import type { Kreuz } from '../lib/ergebnis';
  import { stufenFarben, type SkalenArt } from '../lib/stufenfarben';
  import { zeilenAnteile, achsenBereich, achsenMarken, balkenPfad } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { proz as prozText } from '../i18n/profil';
  /** Kreuztabelle als Säulendiagramm: je Gruppe (Zeile der Tabelle) ein Bündel Säulen, eine Säule je Antwort.
   *  `gruppiert`: Zeilenprozent (Anteil innerhalb der Gruppe) oder Anzahl; `gestapelt`: eine Säule je Gruppe auf 100 %. */
  let { e, art = 'gruppiert', wert = 'prozent', skala = 'keine' }: { e: Kreuz; art?: 'gruppiert' | 'gestapelt'; wert?: 'prozent' | 'anzahl'; skala?: SkalenArt } = $props();
  const kennung = $props.id();
  const z = $derived(e.zaehlung);
  const gruppen = $derived(z?.zeilen ?? []), antworten = $derived(z?.spalten ?? []);
  const anteile = $derived(z ? zeilenAnteile(z.tab) : []);
  const proz = $derived(art === 'gestapelt' || wert === 'prozent');
  const v = (g: number, a: number) => (proz ? anteile[g]![a]! * 100 : z!.tab[g]![a]!);
  const FARBEN = ['var(--dg-a)', 'var(--dg-b)', 'var(--tinte-2)', 'color-mix(in srgb,var(--dg-a) 45%,var(--blatt))', 'color-mix(in srgb,var(--dg-b) 45%,var(--blatt))', 'color-mix(in srgb,var(--tinte-2) 45%,var(--blatt))'];
  /** Geordnete Antwortskala: Abstufung eines Tons (lib/stufenfarben.ts), sonst die Kategorienpalette. */
  const stufen = $derived(stufenFarben(antworten, skala));
  const farbe = (i: number) => stufen[i]?.fuell ?? FARBEN[i % FARBEN.length]!;
  const rand = (i: number) => stufen[i]?.rand;
  const kurz = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  const W = 560, R = 24, U0 = 60, H0 = 380;
  const L = $derived(proz ? 84 : 64);
  /** Legende: nebeneinander, bei Platzmangel in die nächste Zeile. */
  const legende = $derived.by(() => {
    const voll = W - L - R, pos: { x: number; y: number; t: string[] }[] = [];
    let x = 0, y = 78, hoch = 0;
    for (const a of antworten) {
      // lange Namen brechen um (höchstens zwei Zeilen, dann „…“) statt nach 26 Zeichen abzuschneiden
      const t = yZeilen(a, 190, 13, false, 2), w = 20 + Math.max(...t.map(s => s.length)) * 7 + 18;
      if (x > 0 && x + w > voll) { x = 0; y += 20 + hoch; hoch = 0; }
      pos.push({ x: L + x, y, t }); x += w; hoch = Math.max(hoch, (t.length - 1) * yZeilenHoehe(13));
    }
    return { pos, ende: y + hoch };
  });
  const T = $derived(legende.ende + 30);
  /** Gruppennamen unter den Säulen brechen um (Regel lib/ytitel.ts); Höhe und unterer Rand wachsen mit. */
  const XZ = $derived(Math.max(0, ...gruppen.map(g => xZusatz(g, platz * 0.94, 13, true))));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const hoechst = $derived(proz ? 100 : Math.max(1, groesste((z?.tab.flat() ?? [1]))));
  const bereich = $derived(proz && art === 'gestapelt' ? [0, 100] as [number, number] : achsenBereich(0, hoechst));
  const marken = $derived(achsenMarken(bereich[0], bereich[1]));
  const Y = (w: number) => T + (H - T - U) * (1 - w / (bereich[1] || 1));
  const platz = $derived((W - L - R) / Math.max(1, gruppen.length));
  const zeigeWerte = $derived(art === 'gruppiert' && (platz * 0.8) / Math.max(1, antworten.length) >= 30);
  const text = (w: number) => (proz ? prozText(zahlDe(w, 0)) : zahlDe(w));
  /** Zahl am Balken ohne Prozentzeichen (die Achse nennt die Einheit) - sonst stoßen die Beschriftungen auf dem Handy aneinander. */
  const kurzText = (w: number) => (proz ? zahlDe(w, 0) : zahlDe(w));
  const einheit = $derived(proz ? Lx('Prozent innerhalb der Gruppe', 'Percent within the group') : Lx('Anzahl', 'Count'));
  const beschreibung = $derived((art === 'gestapelt'
    ? Lx(`Gestapeltes Säulendiagramm auf 100 %: ${e.gezaehlt} nach ${e.gruppen}, ${einheit}, ${e.n} Personen. `, `Stacked bar chart to 100%: ${e.gezaehlt} by ${e.gruppen}, ${einheit}, ${e.n} people. `)
    : Lx(`Gruppiertes Säulendiagramm: ${e.gezaehlt} nach ${e.gruppen}, ${einheit}, ${e.n} Personen. `, `Grouped bar chart: ${e.gezaehlt} by ${e.gruppen}, ${einheit}, ${e.n} people. `)) +
    gruppen.map((g, gi) => `${g}: ${antworten.map((a, ai) => `${a} ${proz ? prozText(zahlDe(anteile[gi]![ai]! * 100, 0)) : z!.tab[gi]![ai]}`).join(', ')}`).join('; ') + '.');
  const titel = $derived(`${e.gezaehlt} ${Lx('nach', 'by')} ${e.gruppen}`);
  const bt = $derived.by(() => {
    if (!z || !gruppen.length || !antworten.length) return null;
    const t = bildtext('saeulen', { titel, kategorieName: e.gruppen, kategorien: gruppen, wertName: einheit, stapel: art === 'gestapelt',
      reihen: antworten.map((a, ai) => ({ name: a, werte: gruppen.map((_, gi) => v(gi, ai)) })) });
    return { ...t, beschreibung: [...t.beschreibung, Lx(`${e.n} Personen.`, `${e.n} people.`)] };
  });
</script>
{#if z && gruppen.length && antworten.length}
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <text x="24" y="26" style="font-size:16px" font-weight="650">{kurz(titel, 62)}</text>
  <text x="24" y="50" class="klein">{art === 'gestapelt' ? Lx('Anteil der Antworten, zusammen 100 %', 'Share of answers, adding up to 100%') : proz ? Lx('Prozent innerhalb jeder Gruppe', 'Percent within each group') : Lx('Anzahl Personen', 'Number of people')}</text>
  {#each antworten as a, i (i)}
    <g transform="translate({legende.pos[i]!.x} {legende.pos[i]!.y})"><rect x="0" y="-10" width="14" height="12" rx="2" fill={farbe(i)} stroke={rand(i)} stroke-width="1" /><text x="20" y="0" style="font-size:13px"><title>{a}</title>{#each legende.pos[i]!.t as zl, k}<tspan x="20" dy={k ? '1.25em' : 0}>{zl}</tspan>{/each}</text></g>
  {/each}
  {#each marken as m}<line x1={L} x2={W - R} y1={Y(m)} y2={Y(m)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(m) + 4} text-anchor="end" class="klein">{text(m)}</text>{/each}
  <line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each gruppen as g, gi}
    {@const x0 = L + platz * gi + platz * 0.1}
    {@const breit = platz * 0.8}
    {#if art === 'gestapelt'}
      {@const spalte = antworten.map((_, ai) => v(gi, ai))}
      {#each antworten as _, ai}
        {@const unten = spalte.slice(0, ai).reduce((p, q) => p + q, 0)}
        {@const oben = unten + spalte[ai]!}
        {#if spalte[ai]! > 0}
          <rect x={x0 + breit * 0.1} y={Y(oben)} width={breit * 0.8} height={Math.max(0, Y(unten) - Y(oben))} fill={farbe(ai)} stroke={rand(ai) ?? 'var(--blatt)'} stroke-width={rand(ai) ? 1 : 1.5}><title>{g} / {antworten[ai]}: {z.tab[gi]![ai]} ({zahlDe(anteile[gi]![ai]! * 100, 0)} %)</title></rect>
          {#if Y(unten) - Y(oben) >= 17}
            {#if stufen.length}{@const sw = kurzText(spalte[ai]!).length * 8 + 12}<rect x={x0 + breit / 2 - sw / 2} y={(Y(unten) + Y(oben)) / 2 - 9} width={sw} height="18" rx="9" fill="var(--blatt)" opacity=".9" />{/if}
            <text x={x0 + breit / 2} y={(Y(unten) + Y(oben)) / 2 + 5} text-anchor="middle" font-weight="650" style="font-size:13px;fill:{stufen.length ? 'var(--tinte)' : ai % 6 < 3 ? 'var(--blatt)' : 'var(--tinte)'}">{kurzText(spalte[ai]!)}</text>{/if}
        {/if}
      {/each}
    {:else}
      {@const bw = breit / antworten.length}
      {#each antworten as _, ai}
        <path d={balkenPfad(x0 + bw * ai + 1, Y(v(gi, ai)), Math.max(1, bw - 2), Math.max(0, Y(0) - Y(v(gi, ai))), 4)} fill={farbe(ai)} stroke={rand(ai)} stroke-width="1"><title>{g} / {antworten[ai]}: {z.tab[gi]![ai]} ({zahlDe(anteile[gi]![ai]! * 100, 0)} %)</title></path>
        {#if zeigeWerte}<text x={x0 + bw * ai + bw / 2} y={Y(v(gi, ai)) - 5} text-anchor="middle" font-weight="650" style="font-size:12px">{kurzText(v(gi, ai))}</text>{/if}
      {/each}
    {/if}
    <g><title>{g}</title><XTitel x={x0 + breit / 2} y={H - U + 22} breite={platz * 0.94} text={g} fett /></g>
    <text x={x0 + breit / 2} y={H - U + 40 + XZ} text-anchor="middle" class="klein">n = {z.tab[gi]!.reduce((p, q) => p + q, 0)}</text>
  {/each}
  {#if !proz}<YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={einheit} px={13} klasse="klein" />{/if}
</svg>
{#if bt}<BildBeschreibung {...bt} />{/if}
{/if}
