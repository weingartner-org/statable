<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import XTitel from './XTitel.svelte';
  import YTitel from './YTitel.svelte';
  import { s, L, Lp } from '../lib/sitzung.svelte';
  import { lesbar } from '../lib/verzeichnis';
  import { gruppenSpalten } from '../lib/streugruppen';
  import { stufe } from '../lib/datendiagramm';
  import { istFehlend } from '../lib/fehlend';
  import { klassenJeGruppe, klassenVorschlag, klassenHinweis, klassenAusserhalb, gipfel, KLASSEN_MAX } from '../lib/histogrammklassen';
  import { achsenBereich, achsenMarken } from '../lib/diagrammdaten';
  import { xZusatz, yMarkenZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  /**
   * Histogramm mit freier Klassenwahl (Breite, Anfang) und auf Wunsch je Gruppe in kleinen Feldern mit gleicher Achse und gleicher Höhe, untereinander oder nebeneinander.
   * Der Hinweis darunter sagt, wie die Klassen den Eindruck ändern, und zählt die Gipfel der jetzigen Wahl. Zugeklappt unter dem gewöhnlichen Histogramm.
   */
  let { spalte, name }: { spalte: string; name?: (n: string) => string } = $props();
  const kennung = $props.id();
  const nm = (n: string) => (name ? name(n) : lesbar(s.spalten.find(c => c.name === n)));
  let auf = $state(false), g = $state(''), breiteTxt = $state(''), anfangTxt = $state(''), lage = $state<'unter' | 'neben'>('unter');
  const sp = $derived(s.spalten.find(c => c.name === spalte));
  const kandidaten = $derived(auf ? gruppenSpalten(s.spalten, s.zeilen, [spalte], 6) : []);
  const gSp = $derived(kandidaten.find(c => c.name === g) ?? null);
  const zahl = (t: string) => { const v = Number(t.replace(',', '.')); return t.trim() !== '' && Number.isFinite(v) ? v : null; };
  /** Werte je Gruppe (ohne Gruppenspalte: eine Gruppe mit dem Namen der Spalte). */
  const je = $derived.by((): Record<string, number[]> => {
    if (!auf || !sp) return {};
    const iw = s.spalten.indexOf(sp), ig = gSp ? s.spalten.indexOf(gSp) : -1, aus: Record<string, number[]> = {};
    const stufen = gSp ? [...new Set(s.zeilen.map(z => z[ig]).filter(v => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && istFehlend(gSp, v))))].sort((p, q) => (typeof p === 'number' && typeof q === 'number' ? p - q : String(p).localeCompare(String(q), undefined, { numeric: true }))) as (string | number)[] : [];
    if (gSp) for (const t of stufen) aus[stufe(gSp, t)] = [];
    else aus[nm(spalte)] = [];
    for (const z of s.zeilen) {
      const v = z[iw];
      if (typeof v !== 'number' || !Number.isFinite(v) || istFehlend(sp, v)) continue;
      if (gSp) { const t = z[ig]; if (t === null || t === undefined || t === '' || (typeof t === 'number' && istFehlend(gSp, t))) continue; aus[stufe(gSp, t as string | number)]!.push(v); } else aus[nm(spalte)]!.push(v);
    }
    return aus;
  });
  const alle = $derived(Object.values(je).flat());
  const vorschlag = $derived(alle.length >= 2 ? klassenVorschlag(alle) : null);
  const breite = $derived(zahl(breiteTxt) ?? vorschlag?.breite ?? 1), anfang = $derived(zahl(anfangTxt) ?? vorschlag?.anfang ?? 0);
  const k = $derived(Object.keys(je).length && alle.length ? klassenJeGruppe(Object.fromEntries(Object.entries(je).filter(([, w]) => w.length)), breite, anfang) : null);
  const gesamt = $derived(k ? k.namen.length : 0);
  const spalten = $derived(lage === 'neben' ? Math.min(3, Math.max(1, gesamt)) : 1);
  const W = 560, R = 24, PH = 150, LX = 52, TK = 20, UX = 34;
  const yb = $derived(achsenBereich(0, k?.hoechste ?? 1)), ym = $derived(achsenMarken(yb[0], yb[1]));
  const lx = $derived(LX + yMarkenZusatz(ym.map(v => zahlDe(v))));
  const PW = $derived((W - lx - R - (spalten - 1) * 20) / spalten);
  const zeilen = $derived(Math.ceil(gesamt / spalten));
  const XZ = $derived(xZusatz(nm(spalte), W - LX - R));
  const H = $derived(zeilen * (PH + TK + UX) + 28 + XZ);
  const xMarken = $derived(k ? (k.grenzen.length > 8 ? k.grenzen.filter((_, i) => i % Math.ceil(k.grenzen.length / 6) === 0) : k.grenzen) : []);
  const Xv = (v: number, p0: number) => p0 + (PW - 0) * ((v - (k?.grenzen[0] ?? 0)) / (((k?.grenzen.at(-1) ?? 1) - (k?.grenzen[0] ?? 0)) || 1));
  const Yv = (v: number, y0: number) => y0 + PH * (1 - v / (yb[1] || 1));
  const hinweis = $derived(k ? klassenHinweis(k.klassen[k.namen[0]!]!) : '');
  const ausserhalb = $derived(k ? klassenAusserhalb(k.namen.reduce((a, n) => a + k.klassen[n]!.darunter, 0)) : '');
  const zuViele = $derived(!!alle.length && !k);
  const titel = $derived(`${nm(spalte)} - ${gSp ? L('Histogramm je Gruppe', 'Histogram by group') : L('Histogramm mit eigenen Klassen', 'Histogram with your own classes')}`);
  const text = $derived.by(() => {
    if (!k) return null;
    const ersterName = k.namen[0]!;
    const kopf = gSp ? L(`Histogramm von ${nm(spalte)} je ${lesbar(gSp)}:`, `Histogram of ${nm(spalte)} by ${lesbar(gSp)}:`) : L(`Histogramm von ${nm(spalte)}:`, `Histogram of ${nm(spalte)}:`);
    const rest = Lp(gesamt, `${k.klassen[ersterName]!.anzahl.length} Klassen der Breite ${zahlDe(breite)} ab ${zahlDe(anfang)}, ${gesamt} Feld mit gleicher Achse und gleicher Höhe.`,
      `${k.klassen[ersterName]!.anzahl.length} Klassen der Breite ${zahlDe(breite)} ab ${zahlDe(anfang)}, ${gesamt} Felder mit gleicher Achse und gleicher Höhe.`,
      `${k.klassen[ersterName]!.anzahl.length} classes of width ${zahlDe(breite)} from ${zahlDe(anfang)}, ${gesamt} panel with the same axis and the same height.`,
      `${k.klassen[ersterName]!.anzahl.length} classes of width ${zahlDe(breite)} from ${zahlDe(anfang)}, ${gesamt} panels with the same axis and the same height.`);
    const saetze = [`${kopf} ${rest}`,
      ...k.namen.map(n => { const g = gipfel(k.klassen[n]!.anzahl); return Lp(g, `${n}: ${k.klassen[n]!.n} Werte, ${g} Gipfel.`, `${n}: ${k.klassen[n]!.n} Werte, ${g} Gipfel.`, `${n}: ${k.klassen[n]!.n} values, ${g} peak.`, `${n}: ${k.klassen[n]!.n} values, ${g} peaks.`); }), hinweis];
    return { saetze, tabelle: { titel: L('Anzahl je Klasse', 'Count per class'), kopf: [L('Klasse (von bis unter)', 'Class (from to below)'), ...k.namen], zeilen: k.klassen[ersterName]!.anzahl.map((_, i) => [`${zahlDe(k.grenzen[i]!)} - ${zahlDe(k.grenzen[i + 1]!)}`, ...k.namen.map(n => String(k.klassen[n]!.anzahl[i]))]) } };
  });
  const bt = $derived.by(() => {
    if (!k || !text) return null;
    if (k.namen.length === 1) {
      const kl = k.klassen[k.namen[0]!]!;
      const t = bildtext('histogramm', { titel, name: nm(spalte), grenzen: k.grenzen, anzahl: kl.anzahl, n: kl.n });
      return { ...t, beschreibung: [...t.beschreibung, ...text.saetze.slice(1)] };
    }
    return bildtext('sonstiges', { artName: L('Histogramm je Gruppe', 'Histogram by group'), titel, xAchse: { name: nm(spalte) }, yAchse: { name: L('Anzahl', 'Count') }, saetze: text.saetze, tabelle: { kopf: text.tabelle.kopf, zeilen: text.tabelle.zeilen } });
  });
</script>
<details class="he" ontoggle={(ev) => (auf = (ev.currentTarget as HTMLDetailsElement).open)}>
  <summary>{L('Histogramm mit eigenen Klassen und je Gruppe', 'Histogram with your own classes and by group')}</summary>
  {#if auf}
    <div class="he-innen">
      <div class="he-wahl">
        <div class="eingabe"><label for="{kennung}-b">{L('Klassenbreite', 'Class width')}</label><input id="{kennung}-b" type="text" inputmode="decimal" bind:value={breiteTxt} placeholder={vorschlag ? zahlDe(vorschlag.breite) : ''} data-begriff="klassenbreite" /></div>
        <div class="eingabe"><label for="{kennung}-a">{L('Anfang der ersten Klasse', 'Start of the first class')}</label><input id="{kennung}-a" type="text" inputmode="decimal" bind:value={anfangTxt} placeholder={vorschlag ? zahlDe(vorschlag.anfang) : ''} /></div>
        <button class="k leise" type="button" disabled={!breiteTxt && !anfangTxt} onclick={() => { breiteTxt = ''; anfangTxt = ''; }}>{L('Wie das gewöhnliche Histogramm', 'Like the usual histogram')}</button>
      </div>
      <div class="he-wahl">
        <div class="eingabe"><label for="{kennung}-g">{L('Je Gruppe (Spalte)', 'By group (column)')}</label>
          <select id="{kennung}-g" bind:value={g}><option value="">{L('Keine', 'None')}</option>{#each kandidaten as c (c.name)}<option value={c.name}>{lesbar(c)}</option>{/each}</select></div>
        {#if gSp}<div class="segment" role="radiogroup" aria-label={L('Anordnung der Felder', 'Arrangement of the panels')}>
          <label><input type="radio" name="{kennung}-l" value="unter" checked={lage === 'unter'} onchange={() => (lage = 'unter')}>{L('Untereinander', 'Stacked')}</label>
          <label><input type="radio" name="{kennung}-l" value="neben" checked={lage === 'neben'} onchange={() => (lage = 'neben')}>{L('Nebeneinander', 'Side by side')}</label></div>{/if}
      </div>
      {#if !kandidaten.length}<p class="hilfe">{L('Keine Spalte mit zwei bis sechs Gruppen gefunden.', 'No column with two to six groups found.')}</p>{/if}
      {#if zuViele}<p class="hilfe" use:ergebnisAnsage>{L(`Mit dieser Breite wären es mehr als ${KLASSEN_MAX} Klassen. Eine größere Breite passt besser.`, `This width would give more than ${KLASSEN_MAX} classes. Choose a wider class.`)}</p>{/if}
      {#if k && text}
        <DiagrammExport {titel}>
          <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz} style="max-width:{W}px" stroke-linejoin="round">
            {#each k.namen as n, idx}
              {@const sx = idx % spalten}
              {@const sy = Math.floor(idx / spalten)}
              {@const p0 = lx + sx * (PW + 20)}
              {@const y0 = 10 + sy * (PH + TK + UX) + TK}
              {@const kl = k.klassen[n]!}
              <text x={p0} y={y0 - 6} font-weight="650" style="font-size:14px">{n}</text><text x={p0 + PW} y={y0 - 6} text-anchor="end" class="klein">n = {kl.n}</text>
              {#each ym as v}<line x1={p0} x2={p0 + PW} y1={Yv(v, y0)} y2={Yv(v, y0)} stroke="var(--dg-gitter)" />{#if sx === 0}<text x={p0 - 8} y={Yv(v, y0) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/if}{/each}
              <line x1={p0} x2={p0 + PW} y1={y0 + PH} y2={y0 + PH} stroke="var(--dg-achse)" />
              {#each kl.anzahl as a, i}{#if a > 0}<rect x={Xv(k.grenzen[i]!, p0)} y={Yv(a, y0)} width={Math.max(1, Xv(k.grenzen[i + 1]!, p0) - Xv(k.grenzen[i]!, p0))} height={y0 + PH - Yv(a, y0)} fill="var(--dg-a)" stroke="var(--blatt)" stroke-width="1.5"><title>{zahlDe(k.grenzen[i]!)} - {zahlDe(k.grenzen[i + 1]!)}: {a}</title></rect>{/if}{/each}
              {#each xMarken as v}<line x1={Xv(v, p0)} x2={Xv(v, p0)} y1={y0 + PH} y2={y0 + PH + 4} stroke="var(--dg-achse)" /><text x={Xv(v, p0)} y={y0 + PH + 17} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
            {/each}
            <XTitel x={(lx + W - R) / 2} y={H - 10 - XZ} breite={W - LX - R} text={nm(spalte)} klasse="klein" />
            <YTitel x={14} y={H / 2 - 10} laenge={Math.min(H - 60, 160)} text={L('Anzahl', 'Count')} px={13} klasse="klein" />
          </svg>
        </DiagrammExport>
        <p class="hilfe" use:ergebnisAnsage>{hinweis}{ausserhalb ? ' ' + ausserhalb : ''}</p>
        {#if bt}<BildBeschreibung {...bt} />{/if}
      {/if}
    </div>
  {/if}
</details>

<style>
  .he { margin-top: var(--a4); }
  .he summary { cursor: pointer; font-weight: 600; min-height: 44px; padding-block: var(--a3); box-sizing: border-box; }
  .he summary:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; border-radius: 4px; }
  .he-innen { display: grid; gap: var(--a3); padding-top: var(--a2); }
  .he-wahl { display: flex; flex-wrap: wrap; gap: var(--a3) var(--a4); align-items: flex-end; }
  .he-wahl .eingabe { flex: 1 1 11rem; min-width: 0; }
  .he-wahl select, .he-wahl input { width: 100%; }
</style>
