<script lang="ts">
  import { L, d, melde, sichern } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { proz, zitat } from '../i18n/profil';
  import { uebernahmeStand } from '../lib/kategorienblatt';
  import type { Antwort, AntwortZustand, KatZustand } from '../lib/kategorisieren';
  import { themenzahlen, zitateDesThemas } from '../lib/themenzahlen';
  import { ZITATE_MAX, frageArt, frageSpalten, frageWerte, leereThemen, themenEingabe, zitatSchluessel, type FrageArt } from '../lib/themenblatt';
  import {
    basisSatz, deutungSatz, exportHinweis, genanntSatz, genauerPruefenSatz, hinweisSaetze, keineTestsSatz, kleinSatz, tabelleAntworten, tabelleThemen, vorlaeufigSatz, zitatGrenzeSatz, zitatWahlHinweis, zitateHinweis
  } from '../lib/themenzahlensaetze';
  import { frageVorschlag } from '../lib/beispielvorschlag.svelte';
  import Ausgabe from './Ausgabe.svelte';

  /**
   * „Zahlen nach Themen“ (Später, Welle S-D, G12): zu jedem Thema aus den offenen Antworten die Zahlen der Personen, die es nennen (n, Prozent, bei einer Zahlenfrage M, SD, Median, bei Kategorien die Verteilung),
   * mit ausgewählten Zitaten (nur von der Person gewählt, höchstens 3). Basis sind Personen mit mindestens einem Thema; die Überlappung steht mit Zahlen daneben. Es gibt keine Tests; „Dieses Thema genauer prüfen“
   * führt zur Karte „Gruppen vergleichen“ bzw. zur Kreuztabelle. Die Wahl gehört zum Blatt (`blatt.kat.themen`).
   */
  let { blatt, z, antw, zs }: { blatt: Blatt; z: KatZustand; antw: Antwort[]; zs: AntwortZustand[] } = $props();
  const kennung = $props.id();
  const kb = $derived(blatt.kat!);
  const wahl = $derived({ ...leereThemen(), ...(kb.themen ?? {}) });
  function setze(neu: Partial<typeof wahl>, satz?: string) {
    kb.themen = { ...wahl, ...neu };
    void sichern();
    if (satz) melde(satz);
  }

  const eingabe = $derived(themenEingabe(z, antw, zs));
  const spalten = $derived(frageSpalten(kb));
  const art = $derived<FrageArt | null>(frageArt(kb, wahl));
  const frage = $derived(art ? frageWerte(wahl.frage, art) : null);
  const frageName = $derived(spalten.find(x => x.name === wahl.frage)?.label ?? wahl.frage);
  const viele = $derived(!!art && art === 'kategorie' && !frage);
  const t = $derived(themenzahlen(eingabe.themen, eingabe.zustand, { frage: frage ?? undefined, ohne: wahl.ohne }));
  const kennungen = $derived(antw.map(a => a.schluessel));
  const texte = $derived(antw.map(a => a.text));
  /** Die Zitate je Thema: nur die Antworten, die die Person gewählt hat (ganze Antwort), in der Reihenfolge der Personen. */
  const zitateJe = $derived.by(() => {
    const aus: Record<string, { kennung: string; text: string }[]> = {};
    eingabe.themen.forEach((th, j) => {
      const gewaehlt = new Set(zitatSchluessel(wahl, eingabe.ids[j]!, th, antw));
      const marken = antw.map((a, i) => (gewaehlt.has(a.schluessel) && a.text ? [{ von: 0, bis: a.text.length, text: a.text.trim() }] : undefined));
      aus[th.name] = zitateDesThemas(th.werte, kennungen, marken, ZITATE_MAX);
    });
    return aus;
  });
  const alleZitate = $derived(Object.values(zitateJe).reduce((a, l) => a + l.length, 0));
  const tabelle = $derived(t.basis ? tabelleThemen(t, frage ? { name: frageName, art: frage.art } : null, zitateJe) : null);
  const antwortenTabelle = $derived(t.basis ? tabelleAntworten(eingabe.themen, kennungen, texte, frage ? { name: frageName, werte: frage.werte } : null) : null);
  const sicht = (text: string | null) => { const x = (text ?? '').trim().replace(/\s+/g, ' '); return x.length > 140 ? `${x.slice(0, 140)} …` : x; };
  const wert = (i: number): string => { const w = frage?.werte[i]; return w === null || w === undefined ? '-' : typeof w === 'number' ? zahlDe(w) : String(w); };

  function waehleZitat(id: string, schluessel: string, an: boolean) {
    const jetzt = wahl.zitate[id] ?? [];
    const neu = an ? [...new Set([...jetzt, schluessel])].slice(0, ZITATE_MAX) : jetzt.filter(x => x !== schluessel);
    setze({ zitate: { ...wahl.zitate, [id]: neu } });
  }
  const eingetragen = $derived(uebernahmeStand(kb, 1) === 'aktuell' ? kb.uebernommen[0] : null);
  /** „Dieses Thema genauer prüfen“: die Karte „Gruppen vergleichen“ (Zahl) bzw. die Kreuztabelle (Kategorien) mit der Spalte des Themas als Gruppe - nur, wenn die Spalten schon in den Daten stehen. */
  function pruefen(j: number) {
    const u = eingetragen; if (!u || !art || !wahl.frage) return;
    const spalte = z.mehrfach ? u.namen[j] : u.namen[0];
    if (!spalte) return;
    frageVorschlag.v = art === 'zahl' ? { art: 'gruppen', w: { l1: [wahl.frage], l2: [spalte], l3: [], l4: [] } } : { art: 'kreuz', w: { l1: [wahl.frage], l2: [spalte], l3: [], l4: [] } };
    melde(vorlaeufigSatz());
    location.hash = 'blatt/neu';
  }
</script>

<details class="auf themen" style="margin-top:var(--a4)"><summary>{L('Zahlen nach Themen (Joint Display)', 'Numbers by topic (joint display)')}</summary>
  <p class="klein">{d('Hier siehst du zu jedem Thema, wie viele Personen es nennen und was sie bei einer Frage aus dem Fragebogen angegeben haben, daneben ausgewählte Zitate. Die Tabelle beschreibt nur diese Personen und prüft nichts.',
    'Hier sehen Sie zu jedem Thema, wie viele Personen es nennen und was sie bei einer Frage aus dem Fragebogen angegeben haben, daneben ausgewählte Zitate. Die Tabelle beschreibt nur diese Personen und prüft nichts.',
    'Here you see, for each topic, how many people name it and what they answered on a question from the questionnaire, with selected quotes beside it. The table only describes these people and tests nothing.')}</p>
  {#if !z.kategorien.length}
    <p class="klein" role="note">{L('Zuerst Kategorien anlegen und Antworten zuordnen.', 'First create categories and assign answers.')}</p>
  {:else}
    <p class="klein"><b>{basisSatz(t)}</b></p>
    {#if t.basis}
      {#each hinweisSaetze(t, z.kategorien.length) as h (h)}<p class="klein" role="note">{h}</p>{/each}
      <div class="felder">
        <div class="eingabe"><label for="th-frage-{kennung}">{L('Welche Frage soll neben den Themen stehen? (freiwillig)', 'Which question should stand beside the topics? (optional)')}</label>
          <select id="th-frage-{kennung}" value={wahl.frage} onchange={(ev) => setze({ frage: ev.currentTarget.value, art: 'auto' })}><option value="">{L('keine (nur Zahl der Personen)', 'none (only the number of people)')}</option>{#each spalten as sp (sp.name)}<option value={sp.name}>{sp.label}</option>{/each}</select></div>
      </div>
      {#if wahl.frage && spalten.some(x => x.name === wahl.frage)}
        <div class="segment" role="radiogroup" aria-label={L('Art der Frage', 'Type of question')} style="margin-top:var(--a2)">
          <label><input type="radio" name="th-art-{kennung}" value="zahl" checked={art === 'zahl'} onchange={() => setze({ art: 'zahl' })}>{L('Zahlen (Mittelwert, Streuung)', 'Numbers (mean, spread)')}</label>
          <label><input type="radio" name="th-art-{kennung}" value="kategorie" checked={art === 'kategorie'} onchange={() => setze({ art: 'kategorie' })}>{L('Kategorien (Verteilung)', 'Categories (distribution)')}</label>
        </div>
        {#if viele}<p class="klein" role="alert">{L('Diese Spalte hat zu viele verschiedene Werte, um sie als Kategorien zu zeigen.', 'This column has too many different values to show it as categories.')}</p>{/if}
      {/if}
      <label class="schalter" style="margin-top:var(--a2)"><input type="checkbox" checked={wahl.ohne} onchange={(ev) => setze({ ohne: ev.currentTarget.checked })}>{L('Auch Zeilen „ohne dieses Thema“ zeigen', 'Also show rows "without this topic"')}</label>
      <label class="schalter"><input type="checkbox" checked={wahl.matrix} onchange={(ev) => setze({ matrix: ev.currentTarget.checked })}>{L('Überschneidungen der Themen zeigen', 'Show overlaps between topics')}</label>

      {#if tabelle}<div class="joint" style="margin-top:var(--a3)"><Ausgabe items={[tabelle]} nurTabellen /></div>{/if}
      <p class="klein">{keineTestsSatz()} {genanntSatz()}</p>
      {#if [t.gesamt, ...t.zeilen].some(r => r.klein && r.n > 0) && frage?.art === 'zahl'}<p class="klein">{kleinSatz()}</p>{/if}
      <p class="klein">{deutungSatz()}</p>

      {#if wahl.matrix}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="scroll" role="region" aria-label={L('Überschneidungen der Themen', 'Overlaps between topics')} tabindex="0">
          <table>
            <caption>{L('Personen, die beide Themen nennen', 'People who name both topics')}</caption>
            <thead><tr><td></td>{#each eingabe.themen as th (th.name)}<th scope="col">{th.name}</th>{/each}</tr></thead>
            <tbody>{#each eingabe.themen as th, a (th.name)}<tr><th scope="row">{th.name}</th>{#each eingabe.themen as _x, b (b)}<td class="zahl" class:diag={a === b}>{t.ueberschneidung[a]![b]}</td>{/each}</tr>{/each}</tbody>
          </table>
        </div>
        <p class="klein">{L(`Themen je Person: ${t.themenJePerson.map((n, j) => `${j + 1}: ${n}`).join('; ')}. Die Diagonale zeigt, wie viele Personen das Thema nennen.`, `Topics per person: ${t.themenJePerson.map((n, j) => `${j + 1}: ${n}`).join('; ')}. The diagonal shows how many people name the topic.`)}</p>
      {/if}

      <h4 class="zwischen">{L('Zitate und genauer prüfen', 'Quotes and examining more closely')}</h4>
      <p class="klein">{zitatWahlHinweis(ZITATE_MAX)} {zitatGrenzeSatz(ZITATE_MAX)}</p>
      {#each eingabe.themen as th, j (th.name)}
        {@const id = eingabe.ids[j]!}
        {@const gewaehlt = zitatSchluessel(wahl, id, th, antw)}
        <details class="auf" style="margin-top:var(--a2)"><summary>{L(`${zitat(th.name)}: ${gewaehlt.length} von ${ZITATE_MAX} Zitaten gewählt`, `${zitat(th.name)}: ${gewaehlt.length} of ${ZITATE_MAX} quotes chosen`)}</summary>
          <div class="antworten">
            {#each antw as a, i (a.schluessel)}{#if th.werte[i] === 1 && a.text}
              <label class="schalter zeile"><input type="checkbox" checked={gewaehlt.includes(a.schluessel)} disabled={!gewaehlt.includes(a.schluessel) && gewaehlt.length >= ZITATE_MAX} onchange={(ev) => waehleZitat(id, a.schluessel, ev.currentTarget.checked)}>
                <span><b>{a.schluessel}</b>: {sicht(a.text)}{#if frage} <span class="wert">({frageName}: {wert(i)})</span>{/if}</span></label>
            {/if}{/each}
          </div>
          <div class="knopfzeile" style="margin-top:var(--a2)">
            <button type="button" class="k leise" aria-disabled={eingetragen && art && wahl.frage ? undefined : 'true'} onclick={() => pruefen(j)}>{genauerPruefenSatz()}</button>
          </div>
          {#if !(eingetragen && art && wahl.frage)}<p class="klein">{wahl.frage
            ? L('Dafür müssen die Themen als Spalten in den Daten stehen („In die Daten übernehmen“ im Ergebnis).', 'For this the topics must be columns in the data ("Write to the data" in the result).')
            : L('Dafür braucht es eine Frage neben den Themen.', 'For this a question beside the topics is needed.')}</p>{/if}
        </details>
      {/each}
      {#if alleZitate}<p class="klein warn" role="note">{zitateHinweis()}</p>{/if}
      {#if eingabe.themen.length > 1 && t.themenJePerson.slice(1).some(n => n > 0)}<p class="klein">{L(`Summe der Prozent: ${proz(zahlDe(t.summeProzent, 1))}. Eine Person kann mehrere Themen nennen; darum liegt sie über 100 %.`, `Sum of the percent: ${proz(zahlDe(t.summeProzent, 1))}. A person can name several topics, so it is above 100%.`)}</p>{/if}

      {#if antwortenTabelle}
        <details class="auf" style="margin-top:var(--a3)"><summary>{L('Alle zugeordneten Antworten je Thema (für Excel)', 'All assigned answers per topic (for Excel)')}</summary>
          <p class="klein">{exportHinweis()}</p>
          <div class="joint"><Ausgabe items={[antwortenTabelle]} nurTabellen /></div>
        </details>
      {/if}
    {/if}
  {/if}
</details>

<style>
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); margin: var(--a2) 0 0; max-width: var(--breite-text); }
  .warn { padding: var(--a2) var(--a3); background: var(--hinweis-hell); border-inline-start: 3px solid var(--hinweis); border-radius: var(--r-klein); color: var(--tinte); }
  .felder { display: grid; grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr)); gap: var(--a3); margin-top: var(--a3); }
  .joint { overflow-x: auto; max-width: 100%; }
  .joint :global(td), .joint :global(th) { vertical-align: top; max-width: 38ch; overflow-wrap: anywhere; }
  .zwischen { margin: var(--a4) 0 var(--a1); font-size: var(--gr-text); }
  .antworten { display: grid; gap: var(--a1); max-height: 22rem; overflow: auto; margin-top: var(--a2); padding-inline-end: var(--a2); }
  .zeile { align-items: flex-start; }
  .wert { color: var(--tinte-2); }
  .scroll { overflow: auto; max-width: 100%; margin-top: var(--a3); border: 1px solid var(--linie); border-radius: var(--r-klein); }
  .scroll:focus-visible { outline: var(--fokus-outline); outline-offset: -3px; }
  table { border-collapse: collapse; font: 400 var(--gr-text)/1.45 var(--schrift-heft); }
  caption { text-align: start; padding: var(--a2) var(--a3); font-weight: 600; }
  th, td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); }
  td.zahl { text-align: right; font-variant-numeric: tabular-nums; }
  td.diag { background: var(--blatt-2); font-weight: 600; }
</style>
