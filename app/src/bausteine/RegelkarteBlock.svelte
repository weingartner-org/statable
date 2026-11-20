<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import { kursSprung } from '../lib/kursziel';
  /** Regelkarte (Einzelwerte, I-MR) und Prozessfähigkeit unter dem Ergebnis von „Wie verteilt sich etwas?“ (S-I). Die Werte stehen in der Reihenfolge der Zeilen. Rechnet im Browser (lib/regelkarte.ts). */
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import { s, L, type Blatt } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { lesbar } from '../lib/verzeichnis';
  import { komma, type Verteilung } from '../lib/ergebnis';
  import { parseZahl } from '../lib/metaanalyse';
  import { regelkarte, regelkarteUG, faehigWort, type Regel, type RegelUG } from '../lib/regelkarte';
  import { achsenMarken } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { kleinste, groesste } from '../lib/menge';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';

  let { blatt, e, ziel = false }: { blatt: Blatt; e: Verteilung; /** Von „Qualität und Prozess“ gewählt: klappt auf und springt hin */ ziel?: boolean } = $props();
  const kennung = $props.id();
  const sp = $derived(e.zahlen.map(z => s.spalten.find(c => c.name === z.name || c.bezeichnung === z.name || lesbar(c, true) === z.name)).filter((c): c is NonNullable<typeof c> => !!c && c.art === 'zahl'));
  let offen = $state(false);
  let gewaehlt = $state(''), ugw = $state(''), ogw = $state(''), gross = $state('1'), streuArt = $state<'r' | 's'>('r');
  const spalte = $derived(sp.find(c => c.name === gewaehlt) ?? sp[0]);
  const werte = $derived.by(() => { if (!spalte) return []; const j = s.spalten.findIndex(c => c.name === spalte.name); return s.zeilen.map(z => z[j]).filter((v): v is number => typeof v === 'number' && !istFehlend(spalte, v)); });
  const u = $derived(parseZahl(ugw)), o = $derived(parseZahl(ogw));
  const grenzenFalsch = $derived((ugw.trim() !== '' && u === null) || (ogw.trim() !== '' && o === null));
  const k = $derived(Math.min(10, Math.max(1, Math.round(Number(gross.replace(',', '.')) || 1))));
  const res = $derived(werte.length >= 5 && !grenzenFalsch ? (k === 1 ? regelkarte(werte, { ugw: u, ogw: o }) : regelkarteUG(werte, k, { ugw: u, ogw: o }, streuArt)) : null);
  const ug = $derived(res && !('fehler' in res) && k > 1 ? (res as RegelUG) : null);
  const r = $derived(res && !('fehler' in res) && k === 1 ? (res as Regel) : null);
  /** gemeinsame Sicht auf beide Karten: obere Karte (Einzelwerte oder Untergruppenmittel), untere (gleitende Spannweite oder Spannweite) */
  const kart = $derived.by(() => {
    if (r) return { pkt: werte, mitte: r.mittel, ucl: r.ucl, lcl: r.lcl as number | null, sig: new Set([...r.aus, ...r.serie]), p2: r.mr, off2: 1, mitte2: r.mrMittel, ucl2: r.mrUcl, lcl2: 0, sig2: new Set(r.mrAus), faehig: r.faehig, n: r.n, sigmaIn: r.sigmaIn, mittelAnz: r.mittel };
    if (ug) return { pkt: ug.xb, mitte: ug.mittel, ucl: ug.ucl, lcl: ug.lcl as number | null, sig: new Set([...ug.aus, ...ug.serie]), p2: ug.r, off2: 0, mitte2: ug.rMittel, ucl2: ug.rUcl, lcl2: ug.rLcl, sig2: new Set(ug.rAus), faehig: ug.faehig, n: ug.gruppen * ug.k, sigmaIn: ug.sigmaIn, mittelAnz: ug.mittel };
    return null;
  });
  const name = $derived(spalte ? (spalte.bezeichnung.trim() || spalte.name) : '');
  const W = 560, H = 280, L0 = 64, R0 = 24, T0 = 20, U0 = 50;
  const diagramm = $derived.by(() => {
    if (!kart) return null;
    const x = kart.pkt, mr = kart.p2, n = x.length;
    const y0 = Math.min(kleinste([...x, kart.lcl ?? kart.mitte])), y1 = Math.max(groesste([...x, kart.ucl]));
    const pad = (y1 - y0 || 1) * 0.08, Y = (v: number) => T0 + (H - T0 - U0) * (1 - (v - (y0 - pad)) / ((y1 - y0 || 1) + 2 * pad));
    const X = (i: number) => L0 + (W - L0 - R0) * (n === 1 ? 0.5 : i / (n - 1));
    const m1 = Math.max(groesste(mr), kart.ucl2) * 1.08, YM = (v: number) => T0 + (H - T0 - U0) * (1 - v / m1);
    return { y0: y0 - pad, y1: y1 + pad, Y, X, m1, YM, linie: x.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' '), mrLinie: mr.map((v, i) => `${i ? 'L' : 'M'}${X(i + kart.off2).toFixed(1)} ${YM(v).toFixed(1)}`).join(' ') };
  });
  const nrName = $derived(k === 1 ? L('Nummer der Messung', 'Measurement number') : L('Nummer der Untergruppe', 'Subgroup number'));
  const bt1 = $derived(kart ? bildtext('linie', {
    titel: `${name} - ${k === 1 ? L('Regelkarte', 'Control chart') : L('Regelkarte der Mittelwerte', 'Control chart of the means')}`,
    xAchse: { name: nrName }, yAchse: { name }, x: kart.pkt.map((_, i) => i + 1), reihen: [{ name, werte: kart.pkt }],
    hilfslinien: [{ name: L('Mittellinie', 'centre line'), y: kart.mitte }, { name: L('obere Grenze', 'upper limit'), y: kart.ucl }, ...(kart.lcl !== null ? [{ name: L('untere Grenze', 'lower limit'), y: kart.lcl }] : [])]
  }) : null);
  const name2 = $derived(k === 1 ? L('Spannweite zweier Werte', 'Range of two values') : streuArt === 's' ? L('Standardabweichung der Untergruppe', 'Standard deviation of the subgroup') : L('Spannweite der Untergruppe', 'Range of the subgroup'));
  const bt2 = $derived(kart ? bildtext('linie', {
    titel: `${name} - ${k === 1 ? L('Gleitende Spannweite', 'Moving range') : streuArt === 's' ? L('Standardabweichung der Untergruppen', 'Standard deviation of the subgroups') : L('Spannweite der Untergruppen', 'Range of the subgroups')}`,
    xAchse: { name: nrName }, yAchse: { name: name2 }, x: kart.p2.map((_, i) => i + 1 + kart.off2), reihen: [{ name: name2, werte: kart.p2 }],
    hilfslinien: [{ name: L('Mittellinie', 'centre line'), y: kart.mitte2 }, { name: L('obere Grenze', 'upper limit'), y: kart.ucl2 }, ...(kart.lcl2 > 0 ? [{ name: L('untere Grenze', 'lower limit'), y: kart.lcl2 }] : [])]
  }) : null);
    const wort = (cpk: number) => { const w = faehigWort(cpk); return w === 'faehig' ? L('fähig', 'capable') : w === 'bedingt' ? L('bedingt fähig', 'marginally capable') : L('nicht fähig', 'not capable'); };
</script>

{#if sp.length >= 1}
  <!-- Die Karte hat je Messwert einen Punkt mit Beschriftung (bei 100.000 Zeilen 400.000 Knoten, rund 2 s Stillstand): sie wird erst gebaut, wenn der Abschnitt geöffnet ist. Die Eingaben bleiben beim Zuklappen erhalten. -->
  <details class="auf" style="margin-top:var(--a4)" open={ziel} use:kursSprung={ziel} data-kurs="regelkarte" ontoggle={ev => { offen = (ev.currentTarget as HTMLDetailsElement).open; }}><summary>{L('Regelkarte und Prozessfähigkeit (Verlauf der Werte)', 'Control chart and process capability (course of the values)')}</summary>
    <p class="hilfe"><HilfeLink id="regelkarten" text={L('Hilfe: Regelkarten', 'Help: control charts')} /></p>
    {#if offen}
    <p class="heft-text">{L('Die Regelkarte zeigt die Werte in der Reihenfolge der Zeilen und die Grenzen, in denen sie bei einem stabilen Prozess liegen (Mittelwert ± 3 Standardabweichungen, geschätzt aus den Sprüngen von Wert zu Wert; bei Untergruppen aus der Spannweite innerhalb jeder Gruppe aufeinanderfolgender Zeilen). Mit Toleranzgrenzen berechnet Statable auch Cp und Cpk.', 'The control chart shows the values in the order of the rows and the limits within which they lie in a stable process (mean ± 3 standard deviations, estimated from the jumps from value to value; with subgroups, from the range within each subgroup of consecutive rows). With specification limits Statable also calculates Cp and Cpk.')}</p>
    {#if sp.length > 1}
      <div class="eingabe" style="max-width:340px"><label for="rk-sp-{kennung}">{L('Welche Spalte?', 'Which column?')}</label>
        <select id="rk-sp-{kennung}" bind:value={gewaehlt}>{#each sp as c (c.name)}<option value={c.name} selected={spalte?.name === c.name}>{c.bezeichnung.trim() || c.name}</option>{/each}</select></div>
    {/if}
    <div class="zeile" style="display:flex;flex-wrap:wrap;gap:var(--a3);margin:var(--a2) 0">
      <div class="eingabe" style="max-width:240px"><label for="rk-k-{kennung}">{L('Werte je Untergruppe (1 = Einzelwerte, bis 10)', 'Values per subgroup (1 = individual values, up to 10)')}</label><input id="rk-k-{kennung}" type="text" inputmode="numeric" bind:value={gross} autocomplete="off" /></div>
      {#if k > 1}<fieldset class="segment" style="margin:var(--a2) 0"><legend>{L('Streuung der Untergruppe messen mit', 'Measure the spread of the subgroup with')}</legend>
        <label><input type="radio" name="rk-s-{kennung}" checked={streuArt === 'r'} onchange={() => (streuArt = 'r')} />{L('Spannweite (X̄-R, für kleine Gruppen)', 'range (X̄-R, for small groups)')}</label>
        <label><input type="radio" name="rk-s-{kennung}" checked={streuArt === 's'} onchange={() => (streuArt = 's')} />{L('Standardabweichung (X̄-S, ab etwa 10 Werten je Gruppe)', 'standard deviation (X̄-S, from about 10 values per group)')}</label></fieldset>{/if}
      <div class="eingabe" style="max-width:200px"><label for="rk-u-{kennung}">{L('Untere Toleranzgrenze (optional)', 'Lower specification limit (optional)')}</label><input id="rk-u-{kennung}" type="text" inputmode="decimal" bind:value={ugw} autocomplete="off" /></div>
      <div class="eingabe" style="max-width:200px"><label for="rk-o-{kennung}">{L('Obere Toleranzgrenze (optional)', 'Upper specification limit (optional)')}</label><input id="rk-o-{kennung}" type="text" inputmode="decimal" bind:value={ogw} autocomplete="off" /></div>
    </div>
    {#if grenzenFalsch}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{L('Eine Toleranzgrenze ist keine Zahl.', 'A specification limit is not a number.')}</p>
    {:else if werte.length < 5}<p class="heft-text" style="color:var(--tinte-2)">{L('Für die Regelkarte braucht es mindestens fünf Werte (besser 20 bis 25).', 'The control chart needs at least five values (better 20 to 25).')}</p>
    {:else if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{res.fehler === 'keine-streuung' ? L('Alle Werte sind gleich oder springen nie: ohne Streuung gibt es keine Grenzen.', 'All values are equal or never jump: without variation there are no limits.') : res.fehler === 'grenzen' ? L('Die untere Toleranzgrenze muss unter der oberen liegen.', 'The lower specification limit must be below the upper one.') : L('Zu wenige Werte.', 'Too few values.')}</p>{/if}
    {#if kart && diagramm}
      <p class="heft-text" use:ergebnisAnsage>{k === 1 ? L(`Mittelwert ${komma(kart.mittelAnz, 3)}, Standardabweichung innerhalb ${komma(kart.sigmaIn, 3)}, Grenzen ${komma(kart.lcl ?? 0, 3)} bis ${komma(kart.ucl, 3)} (${kart.n} Werte).`, `Mean ${komma(kart.mittelAnz, 3)}, within standard deviation ${komma(kart.sigmaIn, 3)}, limits ${komma(kart.lcl ?? 0, 3)} to ${komma(kart.ucl, 3)} (${kart.n} values).`) : L(`${ug?.gruppen} Untergruppen zu je ${k} Werten (${kart.n} Werte). Gesamtmittel ${komma(kart.mittelAnz, 3)}, Standardabweichung innerhalb ${komma(kart.sigmaIn, 3)}, Grenzen der Mittelwerte ${komma(kart.lcl ?? 0, 3)} bis ${komma(kart.ucl, 3)}.`, `${ug?.gruppen} subgroups of ${k} values each (${kart.n} values). Grand mean ${komma(kart.mittelAnz, 3)}, within standard deviation ${komma(kart.sigmaIn, 3)}, limits of the means ${komma(kart.lcl ?? 0, 3)} to ${komma(kart.ucl, 3)}.`)} {kart.sig.size ? L(`Signale (Punkte außerhalb der Grenzen oder in einer langen Folge auf einer Seite: ${kart.sig.size}). Der Prozess ist nicht sicher stabil: Ursachen suchen, bevor die Fähigkeit gedeutet wird.`, `Signals (points outside the limits or in a long run on one side: ${kart.sig.size}). The process is not reliably stable: look for causes before interpreting the capability.`) : L('Kein Signal: Die Werte liegen innerhalb der Grenzen, ohne lange Folge auf einer Seite.', 'No signal: the values lie within the limits, with no long run on one side.')}</p>
      <DiagrammExport titel={`${name} - ${k === 1 ? L('Regelkarte', 'Control chart') : L('Regelkarte der Mittelwerte', 'Control chart of the means')}`}>
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt1?.kurz} style="max-width:{W}px">
          {#each achsenMarken(diagramm.y0, diagramm.y1) as v}<text x={L0 - 10} y={diagramm.Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
          <line x1={L0} x2={W - R0} y1={diagramm.Y(kart.mitte)} y2={diagramm.Y(kart.mitte)} stroke="var(--dg-a)" stroke-width="1.5" />
          <line x1={L0} x2={W - R0} y1={diagramm.Y(kart.ucl)} y2={diagramm.Y(kart.ucl)} stroke="var(--tinte-2, #666)" stroke-dasharray="6 5" /><text x={W - R0} y={diagramm.Y(kart.ucl) - 4} text-anchor="end" class="klein">{L('obere Grenze', 'upper limit')}</text>
          {#if kart.lcl !== null}<line x1={L0} x2={W - R0} y1={diagramm.Y(kart.lcl)} y2={diagramm.Y(kart.lcl)} stroke="var(--tinte-2, #666)" stroke-dasharray="6 5" /><text x={W - R0} y={diagramm.Y(kart.lcl) + 14} text-anchor="end" class="klein">{L('untere Grenze', 'lower limit')}</text>{/if}
          <path d={diagramm.linie} fill="none" stroke="var(--dg-a)" stroke-width="2" stroke-linejoin="round" />
          {#each kart.pkt as v, i}<circle cx={diagramm.X(i)} cy={diagramm.Y(v)} r={kart.sig.has(i) ? 5.5 : 3.5} fill={kart.sig.has(i) ? 'var(--fehler, #b3261e)' : 'var(--dg-a)'}><title>{i + 1}: {zahlDe(v)}</title></circle>{/each}
          <XTitel x={(L0 + W - R0) / 2} y={H - 8} breite={W - L0 - R0} text={k === 1 ? L('Nummer der Messung', 'Measurement number') : L('Nummer der Untergruppe', 'Subgroup number')} klasse="klein" />
          <YTitel x={18} y={(T0 + H - U0) / 2} laenge={H - T0 - U0} text={name} px={13} klasse="klein" />
        </svg>
      </DiagrammExport>
      {#if bt1}<BildBeschreibung {...bt1} />{/if}
      <DiagrammExport titel={`${name} - ${k === 1 ? L('Gleitende Spannweite', 'Moving range') : streuArt === 's' ? L('Standardabweichung der Untergruppen', 'Standard deviation of the subgroups') : L('Spannweite der Untergruppen', 'Range of the subgroups')}`}>
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt2?.kurz} style="max-width:{W}px">
          {#each achsenMarken(0, diagramm.m1) as v}<text x={L0 - 10} y={diagramm.YM(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
          <line x1={L0} x2={W - R0} y1={diagramm.YM(kart.mitte2)} y2={diagramm.YM(kart.mitte2)} stroke="var(--dg-a)" stroke-width="1.5" />
          <line x1={L0} x2={W - R0} y1={diagramm.YM(kart.ucl2)} y2={diagramm.YM(kart.ucl2)} stroke="var(--tinte-2, #666)" stroke-dasharray="6 5" /><text x={W - R0} y={diagramm.YM(kart.ucl2) - 4} text-anchor="end" class="klein">{L('obere Grenze', 'upper limit')}</text>
          {#if kart.lcl2 > 0}<line x1={L0} x2={W - R0} y1={diagramm.YM(kart.lcl2)} y2={diagramm.YM(kart.lcl2)} stroke="var(--tinte-2, #666)" stroke-dasharray="6 5" /><text x={W - R0} y={diagramm.YM(kart.lcl2) + 14} text-anchor="end" class="klein">{L('untere Grenze', 'lower limit')}</text>{/if}
          <path d={diagramm.mrLinie} fill="none" stroke="var(--dg-a)" stroke-width="2" stroke-linejoin="round" />
          {#each kart.p2 as v, i}<circle cx={diagramm.X(i + kart.off2)} cy={diagramm.YM(v)} r={kart.sig2.has(i + (kart.off2 ? 1 : 0)) ? 5.5 : 3.5} fill={kart.sig2.has(i + (kart.off2 ? 1 : 0)) ? 'var(--fehler, #b3261e)' : 'var(--dg-a)'}><title>{i + 1 + kart.off2}: {zahlDe(v)}</title></circle>{/each}
          <XTitel x={(L0 + W - R0) / 2} y={H - 8} breite={W - L0 - R0} text={k === 1 ? L('Nummer der Messung', 'Measurement number') : L('Nummer der Untergruppe', 'Subgroup number')} klasse="klein" />
          <YTitel x={18} y={(T0 + H - U0) / 2} laenge={H - T0 - U0} text={k === 1 ? L('Spannweite zweier Werte', 'Range of two values') : streuArt === 's' ? L('Standardabweichung der Untergruppe', 'Standard deviation of the subgroup') : L('Spannweite der Untergruppe', 'Range of the subgroup')} px={13} klasse="klein" />
        </svg>
      </DiagrammExport>
      {#if bt2}<BildBeschreibung {...bt2} />{/if}
      {#if kart.faehig}
        {@const f = kart.faehig}
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L('Prozessfähigkeit', 'Process capability')}</b></caption>
          <thead><tr><th scope="col">{L('Kennwert', 'Index')}</th><th scope="col">{L('Wert', 'Value')}</th><th scope="col">{L('Bedeutung', 'Meaning')}</th></tr></thead>
          <tbody>
            {#if f.cp !== null}<tr><th scope="row" style="text-align: start">Cp</th><td style="text-align:right">{komma(f.cp, 2)}</td><td>{L('Toleranzbreite durch 6 Standardabweichungen (innerhalb)', 'tolerance width divided by 6 standard deviations (within)')}</td></tr>{/if}
            <tr><th scope="row" style="text-align: start">Cpk</th><td style="text-align:right">{komma(f.cpk, 2)}</td><td>{wort(f.cpk)} {L('(Faustregel: ab 1,33 fähig)', '(rule of thumb: capable from 1.33)')}</td></tr>
            {#if f.pp !== null}<tr><th scope="row" style="text-align: start">Pp</th><td style="text-align:right">{komma(f.pp, 2)}</td><td>{L('wie Cp, mit der Gesamt-Standardabweichung', 'like Cp, with the overall standard deviation')}</td></tr>{/if}
            <tr><th scope="row" style="text-align: start">Ppk</th><td style="text-align:right">{komma(f.ppk, 2)}</td><td>{L('wie Cpk, mit der Gesamt-Standardabweichung', 'like Cpk, with the overall standard deviation')}</td></tr>
          </tbody>
        </table></div>
        <p class="heft-text">{L(`${f.ausserhalb} von ${kart.n} Werten liegen außerhalb der Toleranzgrenzen.`, `${f.ausserhalb} of ${kart.n} values lie outside the specification limits.`)}</p>
      {/if}
      <p class="heft-text" style="color:var(--tinte-2)">{L('Cp und Cpk setzen einen stabilen Prozess (ohne Signale) und annähernd normalverteilte Werte voraus; mit weniger als 20 Werten sind sie unsicher. Eine Regelkarte zeigt, ob der Prozess stabil ist - nicht, ob er gut ist.', 'Cp and Cpk assume a stable process (without signals) and roughly normal values; with fewer than 20 values they are uncertain. A control chart shows whether the process is stable - not whether it is good.')}</p>
    {/if}
    {/if}
  </details>
{/if}
