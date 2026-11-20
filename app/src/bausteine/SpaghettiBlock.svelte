<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { bildtext } from '../lib/bildtext';
  import XTitel from './XTitel.svelte';
  import YTitel from './YTitel.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { lesbar } from '../lib/verzeichnis';
  import { gruppenSpalten, STREU_GRUPPEN_MAX } from '../lib/streugruppen';
  import { spaghetti, spaghettiText, SPAGHETTI_MAX } from '../lib/spaghetti';
  import { form, farbe, markenPfad, STRICHE } from '../lib/fragediagramm';
  import { achsenBereich, achsenMarken } from '../lib/diagrammdaten';
  import { yZusatz, yMarkenZusatz, xZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  /**
   * Linie je Person (Spaghetti-Diagramm) für Daten in langer Form: eine Zeile je Messung mit Person, Zeit und Wert. Jede Person ist eine Linie, dazu der Mittelwert je Zeitpunkt.
   * Mit einer Gruppenspalte bekommt jede Gruppe Farbe, Strichart und Punktform. Steht zugeklappt beim Mehrebenenmodell und in der Datenansicht; die Spalten sind vorbelegt, aber wählbar.
   */
  let { zeit = '', wert = '', person = '', gruppe = '', offen = false, name }: { zeit?: string; wert?: string; person?: string; gruppe?: string; offen?: boolean; name?: (n: string) => string } = $props();
  const kennung = $props.id();
  const nm = (n: string) => (name ? name(n) : lesbar(s.spalten.find(c => c.name === n)));
  let auf = $state(false), z = $state(''), w = $state(''), p = $state(''), g = $state('');
  $effect(() => { z = zeit; w = wert; p = person; g = gruppe; });
  $effect(() => { if (offen) auf = true; });
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  const sz = $derived(s.spalten.find(c => c.name === z)), sw = $derived(s.spalten.find(c => c.name === w)), spp = $derived(s.spalten.find(c => c.name === p)), sg = $derived(s.spalten.find(c => c.name === g));
  const gruppenWahl = $derived(auf ? gruppenSpalten(s.spalten, s.zeilen, [z, w, p]) : []);
  const d = $derived(auf && sz && sw && spp && z !== w ? spaghetti(sz, sw, spp, gruppenWahl.some(c => c.name === g) ? sg ?? null : null, s.zeilen, s.spalten) : null);
  const zeigeGruppen = $derived(!!d && d.gruppen.length > 0);
  const W = 560, H0 = 340, L0 = 56, R = 24, U0 = 54, IX = 12, IY = 10;
  const T = $derived(14 + (zeigeGruppen || d?.mittel.length ? 26 : 0));
  const punkteAlle = $derived(d ? d.linien.flatMap(l => l.punkte) : []);
  const xb = $derived(punkteAlle.length ? achsenBereich(Math.min(...punkteAlle.map(q => q[0])), Math.max(...punkteAlle.map(q => q[0]))) : [0, 1] as [number, number]);
  const yb = $derived(punkteAlle.length ? achsenBereich(Math.min(...punkteAlle.map(q => q[1])), Math.max(...punkteAlle.map(q => q[1]))) : [0, 1] as [number, number]);
  const xm = $derived(achsenMarken(xb[0], xb[1])), ym = $derived(achsenMarken(yb[0], yb[1]));
  const links = $derived(L0 + yZusatz(nm(w), H0 - T - U0, 13, false) + yMarkenZusatz(ym.map(v => zahlDe(v))));
  const XZ = $derived(xZusatz(nm(z), W - links - R));
  const H = $derived(H0 + (T - 14) + XZ), U = $derived(U0 + XZ);
  const X = (v: number) => links + IX + (W - links - R - 2 * IX) * ((v - xb[0]) / (xb[1] - xb[0] || 1));
  const Y = (v: number) => T + IY + (H - T - U - 2 * IY) * (1 - (v - yb[0]) / (yb[1] - yb[0] || 1));
  const text = $derived(d ? spaghettiText(d, nm(z), nm(w), nm(p)) : null);
  const ein = (i: number) => (zeigeGruppen ? `var(--dg-${farbe(i)})` : 'var(--tinte-2)');
  const titel = $derived(`${nm(w)} ${L('über', 'over')} ${nm(z)} - ${L('Linie je', 'line per')} ${nm(p)}`);
  /** Kurztext wie bisher aus den ersten beiden Sätzen; unten die Tabelle „Eine Zeile je Linie“ (Steigung je Person gibt es nur dort). */
  const bt = $derived.by(() => {
    if (!d || !text) return null;
    const b = bildtext('sonstiges', { artName: L('Linie je Person (Spaghetti-Diagramm)', 'Line per person (spaghetti plot)'), titel, xAchse: { name: nm(z) }, yAchse: { name: nm(w) }, saetze: text.saetze, tabelle: { kopf: text.kopf, zeilen: text.zeilen } });
    return { ...b, kurz: `${text.saetze[0] ?? ''} ${text.saetze[1] ?? ''}`.trim(), tabelle: { ...b.tabelle, titel: L('Eine Zeile je Linie', 'One row per line') } };
  });
  const legX = $derived.by(() => { let x = 24; return (d?.gruppen ?? []).map(t => { const a = x; x += 60 + t.length * 7.4; return a; }); });
</script>
<details class="sp" ontoggle={(ev) => (auf = (ev.currentTarget as HTMLDetailsElement).open)} open={offen}>
  <summary>{L('Linie je Person (Spaghetti-Diagramm)', 'Line per person (spaghetti plot)')}</summary>
  {#if auf}
    <div class="sp-innen">
      <p class="hilfe">{L('Für Daten in langer Form: eine Zeile je Messung, mit einer Spalte für die Person, einer für die Zeit und einer für den Wert. Jede Person ist eine Linie. So sieht man, ob alle ähnlich verlaufen oder ob sich Personen stark unterscheiden.', 'For data in long form: one row per measurement, with a column for the person, one for the time and one for the value. Each person is one line. You can see whether everyone follows a similar course or whether people differ a lot.')}</p>
      <div class="sp-wahl">
        <div class="eingabe"><label for="{kennung}-p">{L('Person (Kennung)', 'Person (identifier)')}</label><select id="{kennung}-p" bind:value={p}><option value="">{L('Wählen', 'Choose')}</option>{#each s.spalten.filter(c => c.art !== 'datum') as c (c.name)}<option value={c.name}>{lesbar(c)}</option>{/each}</select></div>
        <div class="eingabe"><label for="{kennung}-z">{L('Zeit (Zahl)', 'Time (number)')}</label><select id="{kennung}-z" bind:value={z}><option value="">{L('Wählen', 'Choose')}</option>{#each zahlen as c (c.name)}<option value={c.name}>{lesbar(c)}</option>{/each}</select></div>
        <div class="eingabe"><label for="{kennung}-w">{L('Wert (Zahl)', 'Value (number)')}</label><select id="{kennung}-w" bind:value={w}><option value="">{L('Wählen', 'Choose')}</option>{#each zahlen.filter(c => c.name !== z) as c (c.name)}<option value={c.name}>{lesbar(c)}</option>{/each}</select></div>
        <div class="eingabe"><label for="{kennung}-g">{L(`Gruppe (zwei bis ${STREU_GRUPPEN_MAX}, optional)`, `Group (two to ${STREU_GRUPPEN_MAX}, optional)`)}</label><select id="{kennung}-g" bind:value={g}><option value="">{L('Keine', 'None')}</option>{#each gruppenWahl as c (c.name)}<option value={c.name}>{lesbar(c)}</option>{/each}</select></div>
      </div>
      {#if d && text && bt}
        <DiagrammExport {titel}>
          <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
            {#each d.gruppen as t, i}
              {@const f = form(i)}
              <g aria-hidden="true">
                {#if f === 'kreis'}<circle cx={legX[i]! + 8} cy="18" r="4.5" fill="var(--dg-punkt-{farbe(i)})" stroke="var(--dg-{farbe(i)})" stroke-width="1.6" />{:else}<path d={markenPfad(f, legX[i]! + 8, 18, 4.5)} fill="var(--dg-punkt-{farbe(i)})" stroke="var(--dg-{farbe(i)})" stroke-width="1.6" />{/if}
                <line x1={legX[i]! + 18} x2={legX[i]! + 40} y1="18" y2="18" stroke="var(--dg-{farbe(i)})" stroke-width="2" stroke-dasharray={STRICHE[i % STRICHE.length] || undefined} stroke-linecap="round" />
              </g>
              <text x={legX[i]! + 46} y="22" class="klein">{t}</text>
            {/each}
            {#if d.mittel.length}<g aria-hidden="true"><line x1={zeigeGruppen ? W - 170 : 24} x2={zeigeGruppen ? W - 140 : 54} y1="18" y2="18" stroke="var(--tinte)" stroke-width="4.5" stroke-linecap="round" /></g><text x={zeigeGruppen ? W - 134 : 60} y="22" class="klein">{L('Mittelwert', 'Mean')}</text>{/if}
            {#each ym as v}<line x1={links} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={links - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
            {#each xm as v}<line x1={X(v)} x2={X(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
            <line x1={links} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" /><line x1={links} x2={links} y1={T} y2={H - U} stroke="var(--dg-achse)" />
            {#each d.linien as l}
              {#if l.punkte.length > 1}<polyline points={l.punkte.map(q => `${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join(' ')} fill="none" stroke={ein(l.gruppe)} stroke-width="1.6" stroke-opacity={d.linien.length > 12 ? 0.55 : 0.85} stroke-linecap="round" stroke-dasharray={zeigeGruppen ? STRICHE[l.gruppe % STRICHE.length] || undefined : undefined} />{/if}
              {#if d.linien.length <= 30 || l.punkte.length < 2}{#each l.punkte as q}
                {@const f = zeigeGruppen ? form(l.gruppe) : 'kreis'}
                {#if f === 'kreis'}<circle cx={X(q[0])} cy={Y(q[1])} r="3" fill="var(--dg-punkt-{zeigeGruppen ? farbe(l.gruppe) : 'a'})" stroke={ein(l.gruppe)} stroke-width="1.2" />{:else}<path d={markenPfad(f, X(q[0]), Y(q[1]), 3)} fill="var(--dg-punkt-{farbe(l.gruppe)})" stroke={ein(l.gruppe)} stroke-width="1.2" />{/if}
              {/each}{/if}
            {/each}
            {#if d.mittel.length}<polyline points={d.mittel.map(q => `${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join(' ')} fill="none" stroke="var(--tinte)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />{/if}
            <XTitel x={(links + W - R) / 2} y={H - U + 46} breite={W - links - R} text={nm(z)} klasse="klein" />
            <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={nm(w)} px={13} klasse="klein" />
          </svg>
        </DiagrammExport>
        {#if d.gekuerzt}<p class="hilfe">{L(`Gezeichnet sind ${d.linien.length} von ${d.personen} Linien (eine feste Auswahl, höchstens ${SPAGHETTI_MAX}); der Mittelwert rechnet mit allen.`, `${d.linien.length} of ${d.personen} lines are drawn (a fixed selection, at most ${SPAGHETTI_MAX}); the mean uses all of them.`)}</p>{/if}
        <BildBeschreibung {...bt} />
      {:else if p && z && w}<p class="hilfe" use:ergebnisAnsage>{L('Aus diesen Spalten lässt sich keine Linie je Person zeichnen (Zeit und Wert müssen verschieden sein, höchstens vier Gruppen).', 'These columns cannot give a line per person (time and value must differ, at most four groups).')}</p>{/if}
    </div>
  {/if}
</details>

<style>
  .sp { margin-top: var(--a4); }
  .sp summary { cursor: pointer; font-weight: 600; min-height: 44px; padding-block: var(--a3); box-sizing: border-box; }
  .sp summary:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; border-radius: 4px; }
  .sp-innen { display: grid; gap: var(--a3); padding-top: var(--a2); }
  .sp-wahl { display: flex; flex-wrap: wrap; gap: var(--a3) var(--a4); align-items: flex-end; }
  .sp-wahl .eingabe { flex: 1 1 12rem; min-width: 0; }
  .sp-wahl select { width: 100%; }
</style>
