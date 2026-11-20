<script lang="ts">
  /**
   * B4 Teil 3b: „Gibt es Gruppen mit ähnlichen Antworten? (latente Klassen, Latent Class Analysis)“ unter der Skalen-Auswertung (Fragen mit wenigen Antwortstufen).
   * Jede Person gehört unbekannt zu einer von K Klassen (lib/klassen.ts, EM-Algorithmus); Vergleich der Klassenzahlen mit BIC, AIC und Entropie, Antwortwahrscheinlichkeiten der gewählten Klassenzahl.
   * Rechnet im Browser (kein R), erst auf Klick. Bild als Liniendiagramm (Form und Strichart, nicht nur Farbe), die gleichen Zahlen stehen in den Tabellen. Beschreibend, ohne Deutung.
   * Fachblatt docs/ausbau/FACHBLATT-B4-PSYCHOLOGIE.md, Abschnitt Teil 3b.
   */
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { bildtext } from '../lib/bildtext';
  import { untrack } from 'svelte';
  import { s, L, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { komma } from '../lib/ergebnis';
  import { herunterladen, heute } from '../lib/export';
  import { rSkriptZip } from '../lib/rskript';
  import { baueKlassenSkript, klassenDaten, klassenRechne, KLASSEN_MAX_FAELLE, KLASSEN_MAX_K, KLASSEN_MAX_SPALTEN, KLASSEN_MAX_STUFEN, KLASSEN_MIN_FAELLE, KLASSEN_MIN_SPALTEN, type KlassenDaten, type KlassenErgebnis, type KlassenFehler } from '../lib/klassen';

  let { spalten }: { spalten: string[] } = $props();
  const kennung = $props.id();
  const nm = (n: string) => s.spalten.find(c => c.name === n)?.bezeichnung.trim() || n;
  const passt = $derived(spalten.length >= KLASSEN_MIN_SPALTEN && spalten.length <= KLASSEN_MAX_SPALTEN && spalten.every(n => s.spalten.some(c => c.name === n)));
  let kMax = $state(4), startwert = $state(1), laeuft = $state(false), wahlK = $state(0);
  let res = $state<{ e: KlassenErgebnis; d: KlassenDaten; benutzt: string[] } | KlassenFehler | null>(null);
  $effect(() => { void spalten.join('|'); void kMax; void startwert; untrack(() => { res = null; }); });

  async function rechnen() {
    if (laeuft) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    const sw = Number.isInteger(startwert) && startwert >= 0 ? startwert : 1;
    const d = klassenDaten(s.spalten, s.zeilen, spalten);
    if ('fehler' in d) res = d;
    else {
      const e = klassenRechne(d.X, d.stufen.map(l => l.length), kMax, sw);
      if ('fehler' in e) res = e; else { res = { e, d, benutzt: [...spalten] }; wahlK = e.bestK ?? 2; }
    }
    laeuft = false;
    sage(res && 'fehler' in res ? fehlerText(res) : L('Klassen gerechnet.', 'Classes calculated.'), res && 'fehler' in res ? 'dringend' : undefined);
  }
  const fehlerText = (f: KlassenFehler) => f.fehler === 'zu-wenig-spalten' ? L(`Latente Klassen brauchen mindestens ${KLASSEN_MIN_SPALTEN} Spalten.`, `Latent classes need at least ${KLASSEN_MIN_SPALTEN} columns.`)
    : f.fehler === 'zu-viele-spalten' ? L(`Mehr als ${KLASSEN_MAX_SPALTEN} Spalten sind zu viele für lesbare Klassen.`, `More than ${KLASSEN_MAX_SPALTEN} columns are too many for readable classes.`)
    : f.fehler === 'zu-wenig-faelle' ? L(`Zu wenige Personen mit allen Angaben (mindestens ${KLASSEN_MIN_FAELLE}).`, `Too few people with all answers (at least ${KLASSEN_MIN_FAELLE}).`)
    : f.fehler === 'zu-viele-faelle' ? L(`Mehr als ${KLASSEN_MAX_FAELLE} Personen rechnet Statable hier nicht (die Rechnung läuft im Browser).`, `Statable does not calculate more than ${KLASSEN_MAX_FAELLE} people here (the calculation runs in the browser).`)
    : f.fehler === 'keine-streuung' ? L('Eine Spalte hat nur einen Wert, also keine Streuung.', 'A column has only one value, so no variation.')
    : f.fehler === 'zu-viele-stufen' ? L(`Eine Spalte hat mehr als ${KLASSEN_MAX_STUFEN} verschiedene Werte. Latente Klassen sind für Ja/Nein und Antwortstufen gedacht; bei Zahlen-Messwerten passen eher die latenten Profile unter der Clusteranalyse.`, `A column has more than ${KLASSEN_MAX_STUFEN} different values. Latent classes are meant for yes/no and answer steps; for measured numbers the latent profiles under cluster analysis fit better.`)
    : f.fehler === 'k-zu-gross' ? L('Zu wenige Personen für mindestens zwei Klassen (etwa zehn Personen je Klasse).', 'Too few people for at least two classes (about ten people per class).')
    : L('Keine brauchbare Lösung gefunden: Es entstanden nur entartete Klassen (weniger als 2 Personen). Weniger Klassen versuchen.', 'No usable solution found: only degenerate classes arose (fewer than 2 people). Try fewer classes.');

  const ok = $derived(res && !('fehler' in res) ? res : null);
  const z = (v: number, n = 2) => (Number.isFinite(v) ? komma(v, n) : '-');
  const pw = (a: number) => komma(a * 100, 0) + ' %';
  const loes = $derived(ok ? ok.e.loesungen.filter((l): l is NonNullable<typeof l> => !!l) : []);
  const gew = $derived(ok ? loes.find(l => l.K === wahlK) ?? loes[0] ?? null : null);
  const stufe = (j: number, c: number) => String(ok!.d.stufen[j]![c]);
  /** Bild: je Spalte die Wahrscheinlichkeit der höchsten Stufe (bei Ja/Nein: „Ja“) */
  const hoch = (g: number, j: number) => { const w = gew!.wahrsch[g]![j]!; return w[w.length - 1]!; };

  const saetze = $derived.by(() => {
    if (!ok || !gew) return [] as string[];
    const e = ok.e, best = loes.find(l => l.K === e.bestK);
    const aus = [L(`${e.n} Personen gehen ein${ok.d.weg ? ` (${ok.d.weg} mit Lücken bleiben außen vor)` : ''}, ${e.p} Spalten.`, `${e.n} people are included${ok.d.weg ? ` (${ok.d.weg} with gaps are left out)` : ''}, ${e.p} columns.`)];
    if (best) aus.push(L(`Den kleinsten BIC hat die Lösung mit ${best.K} ${best.K === 1 ? 'Klasse' : 'Klassen'} (BIC ${z(best.bic, 1)}).${best.K === e.kMax ? ' Der BIC sinkt bis zur größten gerechneten Klassenzahl; mit einer größeren Höchstzahl könnte er weiter sinken.' : ''}`, `The solution with ${best.K} ${best.K === 1 ? 'class' : 'classes'} has the smallest BIC (BIC ${z(best.bic, 1)}).${best.K === e.kMax ? ' The BIC falls up to the largest number of classes calculated; with a higher maximum it might fall further.' : ''}`));
    aus.push(L(`Gezeigt wird die Lösung mit ${gew.K} ${gew.K === 1 ? 'Klasse' : 'Klassen'}: ${gew.zahl.map((v, g) => `Klasse ${g + 1} ${v}`).join(', ')} Personen${gew.K > 1 ? `; Entropie ${z(gew.entropie, 2)} (1 = jede Person eindeutig zugeordnet)` : ''}.`, `The solution with ${gew.K} ${gew.K === 1 ? 'class' : 'classes'} is shown: ${gew.zahl.map((v, g) => `class ${g + 1} ${v}`).join(', ')} people${gew.K > 1 ? `; entropy ${z(gew.entropie, 2)} (1 = every person clearly assigned)` : ''}.`));
    if (gew.K > 1 && gew.gleichBest < gew.brauchbar / 4) aus.push(L(`Das beste Ergebnis kam nur in ${gew.gleichBest} von ${gew.brauchbar} Läufen vor: die Lösung ist wenig stabil. Anderen Startwert versuchen und vergleichen.`, `The best result came up in only ${gew.gleichBest} of ${gew.brauchbar} runs: the solution is not very stable. Try another seed and compare.`));
    const klein = gew.K > 1 ? Math.min(...gew.zahl) : gew.n;
    if (klein < 0.05 * gew.n) aus.push(L(`Die kleinste Klasse hat nur ${klein} Personen (unter 5 %). So kleine Klassen sind oft Zufall, nicht ein eigenes Antwortmuster.`, `The smallest class has only ${klein} people (under 5%). Such small classes are often chance rather than an answer pattern of their own.`));
    return aus;
  });

  const FORM = ['kreis', 'quadrat', 'dreieck', 'raute'];
  const STRICH = [undefined, '7 4', '2 4', '10 3 2 3', '4 4', '1 5'];
  const W = 520, H = 300, ML = 44, MR = 28, MT = 16, MB = 34;
  const xp = (j: number, p: number) => ML + (p === 1 ? 0 : (j * (W - ML - MR)) / (p - 1));
  const yp = (v: number) => MT + (1 - v) * (H - MT - MB);

  const bt = $derived(ok && gew ? bildtext('sonstiges', {
    artName: L('Antwortmuster der Klassen', 'Answer patterns of the classes'),
    saetze: [L(`Liniendiagramm: waagerecht die ${ok.e.p} Spalten (nummeriert), senkrecht die Wahrscheinlichkeit der höchsten Antwortstufe in der Klasse (0 bis 1). ${gew.K} Klassen, jede mit eigener Form und Strichart.`, `Line chart: the ${ok.e.p} columns (numbered) along the bottom, the probability of the highest answer step in the class (0 to 1) up the side. ${gew.K} classes, each with its own shape and line style.`)],
    tabelle: { kopf: [L('Klasse', 'Class'), ...ok.benutzt.map((_, j) => String(j + 1))], zeilen: gew.wahrsch.map((_, g) => [String(g + 1), ...ok!.benutzt.map((__, j) => z(hoch(g, j)))]) }
  }) : null);

  function rSkript() {
    if (!ok || !gew) return;
    try {
      const sk = baueKlassenSkript({ spalten: s.spalten, zeilen: s.zeilen, benutzt: ok.benutzt, r: ok.e, k: gew.K, titel: L('Latente Klassen', 'Latent classes'), datum: heute() });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if passt}
  <details class="auf klassen" style="margin-top:var(--a4)"><summary>{L('Gibt es Gruppen mit ähnlichen Antworten? (latente Klassen, Latent Class Analysis)', 'Are there groups with similar answers? (latent classes, latent class analysis)')}</summary>
    <p class="heft-text">{L('Bei latenten Klassen nimmt Statable an, dass jede Person unbekannt zu einer von K Klassen gehört und dass sich die Klassen darin unterscheiden, wie wahrscheinlich welche Antwort ist. Es rechnet die Lösungen für 1 bis K Klassen und zeigt für jede den BIC (kleiner ist besser), den AIC und die Entropie (wie eindeutig die Personen den Klassen zugeordnet sind). Die Klassenzahl muss ein Mensch wählen: Der BIC hilft, entscheidet aber nicht, und die Klassen müssen inhaltlich sinnvoll sein. Gedacht für Ja/Nein-Fragen und Antwortstufen (je Spalte 2 bis 8 verschiedene Werte).', 'In latent class analysis Statable assumes that each person belongs, unknown, to one of K classes and that the classes differ in how likely each answer is. It calculates the solutions for 1 to K classes and shows for each the BIC (smaller is better), the AIC and the entropy (how clearly the people are assigned to the classes). A person has to choose the number of classes: the BIC helps but does not decide, and the classes have to make sense in terms of content. Meant for yes/no questions and answer steps (2 to 8 different values per column).')}</p>
    <p class="hilfe"><HilfeLink id="latente-klassen" text={L('Hilfe: Latente Klassen', 'Help: latent classes')} /> <a href="#lernen/pfad/psychologie">{L('Mehr dazu: Lernpfad Psychologie', 'More: learning path psychology')}</a></p>
    <div class="klassen-zeile">
      <div class="eingabe klassen-k"><label for="klassen-k-{kennung}">{L('Höchste Klassenzahl', 'Highest number of classes')}</label><select id="klassen-k-{kennung}" bind:value={kMax}>{#each Array.from({ length: KLASSEN_MAX_K - 1 }, (_, i) => i + 2) as k (k)}<option value={k}>{k}</option>{/each}</select></div>
      <div class="eingabe klassen-start"><label for="klassen-s-{kennung}">{L('Startwert', 'Seed')}</label><input id="klassen-s-{kennung}" type="number" min="0" step="1" inputmode="numeric" bind:value={startwert} /></div>
    </div>
    <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{ok ? L('Klassen neu rechnen', 'Recalculate classes') : L('Klassen rechnen', 'Calculate classes')}{/if}</button></div>
    {#if res && 'fehler' in res}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if ok && gew}
      <div class="klassen-saetze">{#each saetze as t (t)}<p class="heft-text">{t}</p>{/each}</div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Vergleich der Klassenzahlen', 'Comparison of the numbers of classes')}</b></caption>
        <thead><tr><th scope="col">{L('Klassen', 'Classes')}</th><th scope="col">{L('Parameter', 'Parameters')}</th><th scope="col">log-Likelihood</th><th scope="col">BIC</th><th scope="col">AIC</th><th scope="col">{L('Entropie', 'Entropy')}</th><th scope="col">{L('Kleinste Klasse', 'Smallest class')}</th></tr></thead>
        <tbody>{#each loes as l (l.K)}<tr><th scope="row" style="text-align:end">{l.K}{#if l.K === ok.e.bestK} <span class="nur-vorleser">({L('kleinster BIC', 'smallest BIC')})</span><span aria-hidden="true">*</span>{/if}</th><td style="text-align:end">{l.npar}</td><td style="text-align:end">{z(l.ll, 1)}</td><td style="text-align:end">{z(l.bic, 1)}</td><td style="text-align:end">{z(l.aic, 1)}</td><td style="text-align:end">{l.K === 1 ? '-' : z(l.entropie, 3)}</td><td style="text-align:end">{Math.min(...l.zahl)}</td></tr>{/each}</tbody>
      </table></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('* kleinster BIC. Entropie: 1 = jede Person eindeutig zugeordnet, nahe 0 = die Klassen überlappen stark.', '* smallest BIC. Entropy: 1 = every person clearly assigned, near 0 = the classes overlap strongly.')}</p>
      <div class="eingabe klassen-wahl" style="max-width:260px"><label for="klassen-w-{kennung}">{L('Klassenzahl zum Ansehen', 'Number of classes to look at')}</label><select id="klassen-w-{kennung}" bind:value={wahlK}>{#each loes as l (l.K)}<option value={l.K}>{l.K}{l.K === ok.e.bestK ? L(' (kleinster BIC)', ' (smallest BIC)') : ''}</option>{/each}</select></div>
      <figure class="ll-bild">
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz} style="max-width:{W}px">
          {#each [0, 0.5, 1] as t (t)}<line x1={ML} x2={W - MR} y1={yp(t)} y2={yp(t)} stroke="var(--dg-gitter)" stroke-width="1" stroke-dasharray={t === 0.5 ? '2 4' : undefined} /><text x={ML - 6} y={yp(t) + 4} text-anchor="end" class="klein" fill="var(--tinte-2)">{komma(t, t === 0.5 ? 1 : 0)}</text>{/each}
          {#each ok.benutzt as _, j (j)}<text x={xp(j, ok.e.p)} y={H - 12} text-anchor="middle" class="klein" fill="var(--tinte)">{j + 1}</text>{/each}
          {#each gew.wahrsch as __, g (g)}
            <polyline fill="none" stroke={g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width="2.2" stroke-dasharray={STRICH[g % STRICH.length]} points={ok.benutzt.map((___, j) => `${xp(j, ok.e.p)},${yp(hoch(g, j))}`).join(' ')} />
            {#each ok.benutzt as ___, j (j)}{@const x = xp(j, ok.e.p)}{@const y = yp(hoch(g, j))}{@const f = FORM[g % FORM.length]}
              {#if f === 'kreis'}<circle cx={x} cy={y} r="4.5" fill="var(--papier, #fff)" stroke={g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width="2" />
              {:else if f === 'quadrat'}<rect x={x - 4} y={y - 4} width="8" height="8" fill="var(--papier, #fff)" stroke={g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width="2" />
              {:else if f === 'dreieck'}<polygon points="{x},{y - 5.5} {x + 5},{y + 4} {x - 5},{y + 4}" fill="var(--papier, #fff)" stroke={g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width="2" />
              {:else}<polygon points="{x},{y - 5.5} {x + 5.5},{y} {x},{y + 5.5} {x - 5.5},{y}" fill="var(--papier, #fff)" stroke={g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width="2" />{/if}
            {/each}
            <text x={xp(ok.e.p - 1, ok.e.p) + 8} y={yp(hoch(g, ok.e.p - 1)) + 4} class="klein" style="font-weight:700" fill="var(--tinte)">{g + 1}</text>
          {/each}
        </svg>
        <figcaption>
          {L('Jede Linie ist eine Klasse (die Zahl am rechten Ende ist die Klassennummer, Form und Strichart unterscheiden die Klassen). Senkrecht: Wahrscheinlichkeit der höchsten Antwortstufe der Spalte (bei Ja/Nein meist „Ja“) in der Klasse. Waagerecht: die Spalten, nummeriert wie in der Tabelle. Alle Stufen stehen in der Tabelle darunter.', 'Each line is a class (the number at the right end is the class number; shape and line style tell the classes apart). Up the side: probability of the highest answer step of the column (for yes/no usually "yes") in the class. Along the bottom: the columns, numbered as in the table. All steps are in the table below.')}
        </figcaption>
      </figure>
      {#if bt}<BildBeschreibung {...bt} />{/if}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Klassen bei ${gew.K} ${gew.K === 1 ? 'Klasse' : 'Klassen'}: Größe`, `Classes with ${gew.K} ${gew.K === 1 ? 'class' : 'classes'}: size`)}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Klasse', 'Class')}</th><th scope="col">{L('Personen', 'People')}</th><th scope="col">{L('Anteil', 'Share')}</th>{#if gew.K > 1}<th scope="col">{L('Mittlere Zuordnungs-Wahrscheinlichkeit', 'Mean assignment probability')}</th>{/if}</tr></thead>
        <tbody>{#each gew.zahl as n, g (g)}<tr><th scope="row" style="text-align: start">{g + 1}</th><td style="text-align:end">{n}</td><td style="text-align:end">{pw(gew.anteil[g]!)}</td>{#if gew.K > 1}<td style="text-align:end">{z(gew.zuordnungsWs[g]!, 2)}</td>{/if}</tr>{/each}</tbody>
      </table></div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Antwortwahrscheinlichkeiten je Klasse', 'Answer probabilities per class')}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Spalte', 'Column')}</th><th scope="col" style="text-align: start">{L('Antwort', 'Answer')}</th>{#each gew.zahl as _, g (g)}<th scope="col">{L('Klasse', 'Class')} {g + 1}</th>{/each}</tr></thead>
        <tbody>{#each ok.benutzt as n, j (n)}{#each ok.d.stufen[j]! as _, c (c)}<tr>{#if c === 0}<th scope="row" rowspan={ok.d.stufen[j]!.length} style="text-align: start">{j + 1}: {nm(n)}</th>{/if}<td>{stufe(j, c)}</td>{#each gew.wahrsch as kl, g (g)}<td style="text-align:end">{z(kl[j]![c]!, 2)}</td>{/each}</tr>{/each}{/each}</tbody>
      </table></div>
      <div class="knopfzeile"><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Die Klassen sind Gruppen von Antwortmustern, keine Typen von Menschen: Statable zeigt, welche Muster in den Antworten stecken, nicht, was sie bedeuten. Die Klassennummern sind nur Etiketten (nach Größe geordnet) und können sich bei einem anderen Startwert vertauschen. Innerhalb einer Klasse sind die Spalten als unabhängig angenommen; das ist eine Vereinfachung. Das Skript rechnet mit anderen Zufalls-Startwerten, das beste Ergebnis ist gleich.', 'The classes are groups of answer patterns, not types of people: Statable shows which patterns are in the answers, not what they mean. The class numbers are only labels (ordered by size) and can swap with another seed. Within a class the columns are assumed independent; this is a simplification. The script calculates with other random start values; the best result is the same.')}</p>
    {/if}
  </details>
{/if}

<style>
  .klassen-zeile { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); align-items: end; margin-block: var(--a2); }
  .klassen-k, .klassen-start { max-width: 200px; margin: 0; }
  .klassen :global(.ll-bild) { margin: var(--a2) 0; min-width: 0; }
  .klassen :global(.ll-bild figcaption) { font-size: var(--gr-klein); color: var(--tinte-2); max-width: var(--breite-text); margin-top: var(--a1); }
</style>
