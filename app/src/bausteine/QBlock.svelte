<script lang="ts">
  /**
   * B3 Teil 3b: „Welche Sichtweisen gibt es? (Q-Methode)“ unter der Skalen-Auswertung.
   * Zeilen = Personen (je Zeile ein Q-Sort), Spalten = Aussagen. Faktorenanalyse über Personen, Zahl der Faktoren legt die Person fest.
   * Rechnet sofort im Browser (lib/qmethode.ts, Kern; lib/qblock.ts, Daten und R-Skript). Beschreibend, ohne Deutung.
   * Fachblatt docs/ausbau/FACHBLATT-B3-TEXTANALYSE.md, Teil 3.
   */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { komma } from '../lib/ergebnis';
  import { csvZelle } from '../lib/protokoll';
  import { herunterladen, heute } from '../lib/export';
  import { rSkriptZip } from '../lib/rskript';
  import { qRechne, type QErgebnis } from '../lib/qmethode';
  import { baueQSkript, qDaten, Q_MAX_SPALTEN, Q_MIN_PERSONEN, Q_MIN_SPALTEN, type QDatenFehler } from '../lib/qblock';

  let { spalten }: { spalten: string[] } = $props();
  const kennung = $props.id();
  const nm = (n: string) => s.spalten.find(c => c.name === n)?.bezeichnung.trim() || n;
  const passt = $derived(spalten.length >= Q_MIN_SPALTEN && spalten.length <= Q_MAX_SPALTEN && spalten.every(n => s.spalten.some(c => c.name === n && c.art === 'zahl')));

  let faktoren = $state<number | null>(2);
  const d = $derived(passt ? qDaten(s.spalten, s.zeilen, spalten) : null);
  const fehlerD = $derived(d && 'fehler' in d ? d.fehler : null);
  const ok = $derived(d && !('fehler' in d) ? d : null);
  const nfOk = $derived(typeof faktoren === 'number' && Number.isInteger(faktoren) && faktoren >= 1 && ok ? faktoren < ok.sorts.length && faktoren <= 7 : false);
  const erg = $derived(ok && nfOk ? qRechne(ok.sorts, faktoren!) : null);
  const e = $derived(erg && !('fehler' in erg) ? (erg as QErgebnis) : null);
  const fehlerR = $derived(erg && 'fehler' in erg ? erg.fehler : null);
  const z = (v: number, n = 2) => (Number.isFinite(v) ? komma(v, n) : '-');
  const fk = (j: number) => L(`Faktor ${j + 1}`, `Factor ${j + 1}`);

  const fehlerText = (f: QDatenFehler['fehler']) => f === 'zu-wenig-personen' ? L(`Es braucht mindestens ${Q_MIN_PERSONEN} Personen (Zeilen) mit vollständigem Q-Sort.`, `At least ${Q_MIN_PERSONEN} people (rows) with a complete Q sort are needed.`)
    : L(`Wählen Sie ${Q_MIN_SPALTEN} bis ${Q_MAX_SPALTEN} Aussagen (Spalten).`, `Choose ${Q_MIN_SPALTEN} to ${Q_MAX_SPALTEN} statements (columns).`);

  function csv() {
    if (!e) return;
    const kopf = [L('Aussage', 'Statement'), ...e.z[0]!.flatMap((_, j) => [`${fk(j)} z`, ...(e.sort ? [`${fk(j)} ${L('Q-Sort', 'Q sort')}`] : [])])];
    const t = '﻿' + [kopf, ...e.z.map((r, a) => [nm(spalten[a]!), ...r.flatMap((v, j) => [v, ...(e.sort ? [e.sort[a]![j]!] : [])])])]
      .map(r => r.map(csvZelle).join(';')).join('\r\n') + '\r\n';
    herunterladen(new TextEncoder().encode(t), 'q-methode-faktoren.csv', 'text/csv;charset=utf-8');
    melde(L('Tabelle als CSV gespeichert.', 'Table saved as CSV.'));
  }
  function rSkript() {
    if (!e) return;
    try {
      const sk = baueQSkript({ spalten: s.spalten, zeilen: s.zeilen, benutzt: [...spalten], faktoren: e.faktoren, titel: L('Q-Methode', 'Q methodology'), datum: heute() });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if passt}
  <details class="auf qmeth" style="margin-top:var(--a4)"><summary>{L('Welche Sichtweisen gibt es? (Q-Methode, Faktorenanalyse über Personen)', 'Which viewpoints are there? (Q methodology, factor analysis across people)')}</summary>
    <p class="heft-text">{L('Bei der Q-Methode ordnet jede Person die Aussagen in ein Raster, zum Beispiel von -4 bis +4. Jede Zeile ist ein solcher Q-Sort, jede Spalte eine Aussage. Statable fasst Personen mit ähnlichem Sortieren zu Faktoren zusammen (Hauptkomponenten, Varimax) und zeigt, wie die Aussagen für jeden Faktor stehen. Wie viele Faktoren Sie betrachten, legen Sie selbst fest. Was ein Faktor inhaltlich bedeutet, deuten Sie, nicht Statable.', 'In Q methodology each person puts the statements into a grid, for example from -4 to +4. Each row is one such Q sort, each column a statement. Statable groups people who sort similarly into factors (principal components, varimax) and shows how the statements stand for each factor. How many factors you look at is for you to decide. What a factor means is for you to interpret, not Statable.')}</p>
    <p class="hilfe"><HilfeLink id="q-methode" text={L('Hilfe: Q-Methode', 'Help: Q methodology')} /></p>
    <div class="eingabe" style="max-width:220px"><label for="q-nf-{kennung}">{L('Zahl der Faktoren (1 bis 7)', 'Number of factors (1 to 7)')}</label><input id="q-nf-{kennung}" type="number" min="1" max="7" step="1" inputmode="numeric" bind:value={faktoren} /></div>
    {#if fehlerD}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerText(fehlerD)}</p>
    {:else if ok && !nfOk}<p class="heft-text" style="color:var(--fehler, #b3261e)">{L('Die Zahl der Faktoren muss eine ganze Zahl von 1 bis 7 sein und kleiner als die Zahl der Personen.', 'The number of factors must be a whole number from 1 to 7 and smaller than the number of people.')}</p>
    {:else if fehlerR}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerR === 'zu-wenig-aussagen' ? L(`Es braucht mindestens ${Q_MIN_SPALTEN} Aussagen.`, `At least ${Q_MIN_SPALTEN} statements are needed.`) : fehlerR === 'konstant' ? L('Mindestens ein Q-Sort hat überall denselben Wert; das lässt sich nicht korrelieren.', 'At least one Q sort has the same value everywhere; it cannot be correlated.') : L('Die Daten sind unvollständig.', 'The data are incomplete.')}</p>
    {:else if e && ok}
      <p class="heft-text">{L(`${e.personen} Personen, ${e.aussagen} Aussagen, ${e.faktoren} Faktoren${ok.weg ? ` (${ok.weg} Zeilen mit Lücken bleiben außen vor)` : ''}. ${e.erzwungen ? 'Alle Q-Sorts haben dieselbe Verteilung; der Faktor-Q-Sort ist deshalb möglich.' : 'Die Q-Sorts haben nicht alle dieselbe Verteilung; ein Faktor-Q-Sort wird deshalb nicht gebildet.'} Markiert wird automatisch: Eine Person gehört zu einem Faktor, wenn ihre Ladung bedeutsam ist und mehr Varianz erklärt als alle anderen Ladungen zusammen.`, `${e.personen} people, ${e.aussagen} statements, ${e.faktoren} factors${ok.weg ? ` (${ok.weg} rows with gaps are left out)` : ''}. ${e.erzwungen ? 'All Q sorts have the same distribution, so the factor Q sort can be formed.' : 'The Q sorts do not all share the same distribution, so no factor Q sort is formed.'} Flagging is automatic: a person belongs to a factor if the loading is significant and explains more variance than all other loadings together.`)}</p>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Ladungen der Personen (markiert = zum Faktor gehörig)', 'Loadings of the people (flagged = belongs to the factor)')}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Person (Zeile)', 'Person (row)')}</th>{#each e.ladungen[0]! as _, j (j)}<th scope="col">{fk(j)}</th>{/each}</tr></thead>
        <tbody>{#each e.ladungen as r, i (i)}<tr><th scope="row" style="text-align: start">{i + 1}</th>{#each r as v, j (j)}<td style="text-align:end">{z(v)}{e.markiert[i]![j] ? L(' (markiert)', ' (flagged)') : ''}</td>{/each}</tr>{/each}</tbody>
        <tfoot><tr><th scope="row" style="text-align: start">{L('Erklärte Varianz in Prozent', 'Variance explained in percent')}</th>{#each e.erklaert as v, j (j)}<td style="text-align:end">{z(v, 1)}</td>{/each}</tr></tfoot>
      </table></div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{e.sort ? L('Aussagen je Faktor (z-Wert und Platz im Faktor-Q-Sort)', 'Statements per factor (z score and place in the factor Q sort)') : L('Aussagen je Faktor (z-Wert)', 'Statements per factor (z score)')}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Aussage', 'Statement')}</th>{#each e.z[0]! as _, j (j)}<th scope="col">{fk(j)} z</th>{#if e.sort}<th scope="col">{fk(j)} {L('Q-Sort', 'Q sort')}</th>{/if}{/each}</tr></thead>
        <tbody>{#each e.z as r, a (a)}<tr><th scope="row" style="text-align: start">{nm(spalten[a]!)}</th>{#each r as v, j (j)}<td style="text-align:end">{z(v)}</td>{#if e.sort}<td style="text-align:end">{e.sort[a]![j]}</td>{/if}{/each}</tr>{/each}</tbody>
      </table></div>
      {#if e.faktoren > 1}<p class="heft-text">{L('Korrelation der Faktoren: ', 'Correlation of the factors: ')}{#each e.faktorKorrelation as r, i (i)}{#each r as v, j (j)}{#if j > i}{fk(i)} / {fk(j)} = {z(v)}{'; '}{/if}{/each}{/each}</p>{/if}
      <div class="knopfzeile"><button class="k" type="button" onclick={csv}>{L('Als CSV speichern', 'Save as CSV')}</button><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Statable zeigt Zahlen, es deutet nichts. Ein Faktor ist eine Gruppe ähnlich sortierender Personen, kein Persönlichkeitstyp, und ein Q-Sort zeigt Sichtweisen, keine Häufigkeiten in einer Bevölkerung.', 'Statable shows numbers; it interprets nothing. A factor is a group of people who sort similarly, not a personality type, and a Q sort shows viewpoints, not frequencies in a population.')}</p>
    {/if}
  </details>
{/if}
