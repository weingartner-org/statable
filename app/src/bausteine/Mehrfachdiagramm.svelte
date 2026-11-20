<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import XTitel from './XTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import { optionenGeordnet, type Mehrfach } from '../lib/mehrfach';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { proz } from '../i18n/profil';
  /** Balkendiagramm zu Mehrfachantworten: Prozent der Fälle je Option, waagerechte Balken, nach Häufigkeit sortiert (m.sortiert) oder in der Reihenfolge der Spalten.
   *  Mit Gruppenspalte: ein Balken je Gruppe und Option (Spalten-Prozente). Die Werte stehen als Zahl am Balken; die Tabelle darunter hat dieselben Zahlen. */
  let { m }: { m: Mehrfach } = $props();
  const opt = $derived(optionenGeordnet(m));
  const stufen = $derived(m.gruppe?.stufen ?? []);
  const mitG = $derived(stufen.length >= 2);
  const FARBEN = ['var(--dg-a)', 'var(--dg-b)', 'var(--tinte)', 'var(--tinte-2)'];
  const farbe = (i: number) => FARBEN[i % 4]!;
  const j = (o: { spalte: string }) => m.optionen.findIndex(x => x.spalte === o.spalte);
  const wert = (o: { spalte: string; proFaelle: number }, g: number) => (mitG ? stufen[g]!.proFaelle[j(o)]! : o.proFaelle);
  const kurz = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  /** Breite des Rahmens: Auf dem Handy bekommt das Diagramm ein eigenes Layout (Name über dem Balken, Balken über die volle Breite), damit die Schrift lesbar bleibt (Abnahme 4, B5). */
  let bw = $state(0);
  const schmal = $derived(bw > 0 && bw < 520);
  const W = $derived(schmal ? Math.max(280, Math.round(bw)) : 720);
  const R = $derived(schmal ? 54 : 60);
  const B = 14, ABST = 10, NAMEN = 18;
  const reihen = $derived(mitG ? stufen.length : 1);
  /** Breite der Namensspalte links (breit) bzw. linker Rand (schmal: Namen stehen über den Balken) */
  const L = $derived(schmal ? 6 : Math.min(250, Math.max(110, Math.max(groesste(opt.map(o => o.name.length))) * 7.2 + 14)));
  /** Legende: nebeneinander, bei Platzmangel in die nächste Zeile (statt zwei feste Spalten). */
  const legende = $derived.by(() => {
    if (!mitG) return { pos: [] as { x: number; y: number; t: string }[], zeilen: 0 };
    const voll = W - R - L, pos: { x: number; y: number; t: string }[] = [];
    let x = 0, z = 0;
    for (const st of stufen) {
      const t = `${kurz(st.name, schmal ? 22 : 30)} (n = ${st.faelle})`, w = 20 + t.length * 6.6 + 18;
      if (x > 0 && x + w > voll) { x = 0; z++; }
      pos.push({ x: L + x, y: 18 + z * 18, t }); x += w;
    }
    return { pos, zeilen: z + 1 };
  });
  const KOPF = $derived(mitG ? legende.zeilen * 18 + 16 : 8);
  const zeile = $derived((schmal ? NAMEN : 0) + reihen * (B + 2) + ABST);
  const xTitel = $derived(mitG ? Lx(`Prozent der Fälle je Gruppe (${m.gruppe!.name})`, `Percent of cases per group (${m.gruppe!.name})`) : Lx('Prozent der Fälle', 'Percent of cases'));
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): die Höhe wächst mit. */
  const XZ = $derived(xZusatz(xTitel, W - L - R));
  const hoehe = $derived(KOPF + opt.length * zeile + 52 + XZ);
  const hoechst = $derived(Math.max(0.1, groesste(opt.flatMap(o => Array.from({ length: reihen }, (_, g) => wert(o, g))))));
  const schritt = $derived(hoechst > 0.5 ? 0.2 : hoechst > 0.25 ? 0.1 : 0.05);
  const ende = $derived(Math.min(1, Math.ceil(hoechst / schritt - 1e-9) * schritt));
  const x = (v: number) => L + (W - L - R) * (v / (ende || 1));
  const ticks = $derived(Array.from({ length: Math.round(ende / schritt) + 1 }, (_, i) => i * schritt));
  const prozent = (v: number) => proz(zahlDe(v * 100, 0));
  const kennung = $derived(m.set.replace(/[^A-Za-z0-9_]/g, ''));
  /** Fälle, auf die sich das Bild bezieht: mit Gruppen die Fälle in den Gruppen (ohne die ohne Gruppenangabe), sonst alle gültigen (Abnahme 4, B10). */
  const nBild = $derived(mitG ? stufen.reduce((a, st) => a + st.faelle, 0) : m.faelle);
  const beschreibung = $derived((mitG
    ? Lx(`Balkendiagramm: Prozent der Fälle je Option (${nBild} gültige Fälle mit Gruppenangabe, Mehrfachnennungen möglich). `, `Bar chart: percent of cases per option (${nBild} valid cases with a group, several answers possible). `)
    : Lx(`Balkendiagramm: Prozent der Fälle je Option (${nBild} gültige Fälle, Mehrfachnennungen möglich). `, `Bar chart: percent of cases per option (${nBild} valid cases, several answers possible). `)) + (mitG
      ? opt.map(o => `${o.name}: ${stufen.map(st => `${st.name} ${prozent(st.proFaelle[j(o)]!)}`).join(', ')}`).join('; ')
      : opt.map(o => `${o.name} ${prozent(o.proFaelle)}`).join('; ')));
  const bt = $derived.by(() => {
    const t = bildtext('saeulen', { art: 'balken', titel: m.label, kategorieName: Lx('Option', 'Option'), kategorien: opt.map(o => o.name), wertName: Lx('Prozent der Fälle', 'Percent of cases'), einheit: '%',
      reihen: mitG ? stufen.map(st => ({ name: `${st.name} (n = ${st.faelle})`, werte: opt.map(o => st.proFaelle[j(o)]! * 100) })) : [{ werte: opt.map(o => o.proFaelle * 100) }] });
    return { ...t, beschreibung: [...t.beschreibung, Lx(`${nBild} gültige Fälle, Mehrfachnennungen möglich.`, `${nBild} valid cases, several answers possible.`)] };
  });
</script>
<div bind:clientWidth={bw}><svg class="diagramm" viewBox="0 0 {W} {hoehe}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  {#if mitG}
    {#each stufen as st, i (i)}
      <g transform="translate({legende.pos[i]!.x} {legende.pos[i]!.y})">
        <rect x="0" y="-9" width="14" height="10" rx="2" fill={farbe(i)} /><text x="20" y="0" style="font-size:12px"><title>{st.name}</title>{legende.pos[i]!.t}</text>
      </g>
    {/each}
  {/if}
  {#each ticks as v}<line x1={x(v)} x2={x(v)} y1={KOPF} y2={KOPF + opt.length * zeile} stroke="var(--dg-gitter)" /><text x={x(v)} y={KOPF + opt.length * zeile + 18} text-anchor="middle" class="klein">{proz(zahlDe(v * 100, 0))}</text>{/each}
  <line x1={L} x2={L} y1={KOPF} y2={KOPF + opt.length * zeile} stroke="var(--dg-achse)" />
  {#each opt as o, k (o.spalte)}
    {@const y0 = KOPF + k * zeile + ABST / 2 + (schmal ? NAMEN : 0)}
    {#if schmal}<text x={L} y={y0 - 5} style="font-size:12px"><title>{o.name}</title>{kurz(o.name, Math.floor((W - 12) / 6.8))}</text>
    {:else}<text x={L - 8} y={y0 + (reihen * (B + 2)) / 2 + 4} text-anchor="end" style="font-size:12px"><title>{o.name}</title>{kurz(o.name, Math.floor((L - 14) / 7))}</text>{/if}
    {#each Array(reihen) as _, g}
      {@const v = wert(o, g)}
      <rect x={L} y={y0 + g * (B + 2)} width={Math.max(0, x(v) - L)} height={B} rx="2" fill={mitG ? farbe(g) : 'var(--dg-a)'} />
      <text x={x(v) + 6} y={y0 + g * (B + 2) + B - 3} style="font-size:11px">{prozent(v)}</text>
    {/each}
  {/each}
  <XTitel x={(L + W - R) / 2} y={KOPF + opt.length * zeile + 42} breite={W - L - R} text={xTitel} />
</svg></div>
<BildBeschreibung {...bt} />
