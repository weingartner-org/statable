<script lang="ts">
  /**
   * B4 Teil 3: „Gibt es Gruppen mit ähnlichem Muster? (latente Profile, Mischung von Normalverteilungen)“ unter der Clusteranalyse.
   * Jede Person gehört unbekannt zu einer von K Gruppen (lib/latent.ts, EM-Algorithmus); Vergleich der Gruppenzahlen mit BIC, AIC und Entropie, Profil der gewählten Gruppenzahl.
   * Rechnet im Browser (kein R), erst auf Klick. Bild als Profil-Liniendiagramm (Form und Strichart, nicht nur Farbe), die gleichen Zahlen stehen in den Tabellen. Beschreibend, ohne Deutung.
   * Fachblatt docs/ausbau/FACHBLATT-B4-PSYCHOLOGIE.md, Abschnitt Teil 3.
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
  import { baueProfilSkript, profilDaten, profilRechne, PROFIL_MAX_FAELLE, PROFIL_MAX_K, PROFIL_MAX_SPALTEN, PROFIL_MIN_FAELLE, PROFIL_MIN_SPALTEN, type LatentModell, type ProfilErgebnis, type ProfilFehler } from '../lib/latent';

  let { spalten }: { spalten: string[] } = $props();
  const kennung = $props.id();
  const nm = (n: string) => s.spalten.find(c => c.name === n)?.bezeichnung.trim() || n;
  const passt = $derived(spalten.length >= PROFIL_MIN_SPALTEN && spalten.length <= PROFIL_MAX_SPALTEN && spalten.every(n => s.spalten.some(c => c.name === n && c.art === 'zahl')));
  let modell = $state<LatentModell>('gleich'), kMax = $state(5), startwert = $state(1), laeuft = $state(false), wahlK = $state(0);
  let res = $state<{ e: ProfilErgebnis; X: number[][]; benutzt: string[]; weg: number } | ProfilFehler | null>(null);
  $effect(() => { void spalten.join('|'); void modell; void kMax; void startwert; untrack(() => { res = null; }); });

  async function rechnen() {
    if (laeuft) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    const sw = Number.isInteger(startwert) && startwert >= 0 ? startwert : 1;
    const d = profilDaten(s.spalten, s.zeilen, spalten);
    if ('fehler' in d) res = d;
    else {
      const e = profilRechne(d.X, modell, kMax, sw);
      if ('fehler' in e) res = e; else { res = { e, X: d.X, benutzt: [...spalten], weg: d.weg }; wahlK = e.bestK ?? 2; }
    }
    laeuft = false;
    sage(res && 'fehler' in res ? fehlerText(res) : L('Profile gerechnet.', 'Profiles calculated.'), res && 'fehler' in res ? 'dringend' : undefined);
  }
  const fehlerText = (f: ProfilFehler) => f.fehler === 'zu-wenig-spalten' ? L(`Profile brauchen mindestens ${PROFIL_MIN_SPALTEN} Zahlen-Spalten.`, `Profiles need at least ${PROFIL_MIN_SPALTEN} number columns.`)
    : f.fehler === 'zu-viele-spalten' ? L(`Mehr als ${PROFIL_MAX_SPALTEN} Spalten sind zu viele für lesbare Profile.`, `More than ${PROFIL_MAX_SPALTEN} columns are too many for readable profiles.`)
    : f.fehler === 'zu-wenig-faelle' ? L(`Zu wenige Personen mit allen Angaben (mindestens ${PROFIL_MIN_FAELLE}).`, `Too few people with all answers (at least ${PROFIL_MIN_FAELLE}).`)
    : f.fehler === 'zu-viele-faelle' ? L(`Mehr als ${PROFIL_MAX_FAELLE} Personen rechnet Statable hier nicht (die Rechnung läuft im Browser).`, `Statable does not calculate more than ${PROFIL_MAX_FAELLE} people here (the calculation runs in the browser).`)
    : f.fehler === 'keine-streuung' ? L('Eine Spalte hat keine Streuung.', 'A column has no variation.')
    : f.fehler === 'k-zu-gross' ? L('Zu wenige Personen für mindestens zwei Gruppen (etwa zehn Personen je Gruppe).', 'Too few people for at least two groups (about ten people per group).')
    : L('Keine brauchbare Lösung gefunden: Es entstanden nur entartete Gruppen (fast keine Streuung oder weniger als 2 Personen). Weniger Gruppen oder „gleich“ bei den Streuungen versuchen.', 'No usable solution found: only degenerate groups arose (almost no variation or fewer than 2 people). Try fewer groups or “equal” variances.');

  const ok = $derived(res && !('fehler' in res) ? res : null);
  const z = (v: number, n = 2) => (Number.isFinite(v) ? komma(v, n) : '-');
  const loes = $derived(ok ? ok.e.loesungen.filter((l): l is NonNullable<typeof l> => !!l) : []);
  const gew = $derived(ok ? loes.find(l => l.K === wahlK) ?? loes[0] ?? null : null);
  /** Gesamtmittel und Streuung je Spalte (für die Bildachse: Abweichung in Standardabweichungen) */
  const gesamt = $derived.by(() => {
    if (!ok) return [] as { m: number; sd: number }[];
    const n = ok.X.length;
    return ok.benutzt.map((_, j) => { let m = 0; for (const r of ok.X) m += r[j]!; m /= n; let q = 0; for (const r of ok.X) q += (r[j]! - m) ** 2; return { m, sd: Math.sqrt(q / n) }; });
  });
  const zw = (g: number, j: number) => (gew ? (gew.mittel[g]![j]! - gesamt[j]!.m) / gesamt[j]!.sd : 0);
  const pw = (a: number) => komma(a * 100, 0) + ' %';

  const saetze = $derived.by(() => {
    if (!ok || !gew) return [] as string[];
    const e = ok.e, best = loes.find(l => l.K === e.bestK);
    const aus = [
      L(`${e.n} Personen gehen ein${ok.weg ? ` (${ok.weg} mit Lücken bleiben außen vor)` : ''}, ${e.p} Spalten, Streuungen ${e.modell === 'frei' ? 'frei (je Gruppe und Spalte)' : 'gleich (je Spalte für alle Gruppen)'}.`, `${e.n} people are included${ok.weg ? ` (${ok.weg} with gaps are left out)` : ''}, ${e.p} columns, variances ${e.modell === 'frei' ? 'free (per group and column)' : 'equal (per column for all groups)'}.`)
    ];
    if (best) aus.push(L(`Den kleinsten BIC hat die Lösung mit ${best.K} ${best.K === 1 ? 'Gruppe' : 'Gruppen'} (BIC ${z(best.bic, 1)}).${best.K === e.kMax ? ' Der BIC sinkt bis zur größten gerechneten Gruppenzahl; mit einer größeren Höchstzahl könnte er weiter sinken.' : ''}`, `The solution with ${best.K} ${best.K === 1 ? 'group' : 'groups'} has the smallest BIC (BIC ${z(best.bic, 1)}).${best.K === e.kMax ? ' The BIC falls up to the largest number of groups calculated; with a higher maximum it might fall further.' : ''}`));
    aus.push(L(`Gezeigt wird die Lösung mit ${gew.K} ${gew.K === 1 ? 'Gruppe' : 'Gruppen'}: ${gew.zahl.map((v, g) => `Gruppe ${g + 1} ${v}`).join(', ')} Personen${gew.K > 1 ? `; Entropie ${z(gew.entropie, 2)} (1 = jede Person eindeutig zugeordnet)` : ''}.`, `The solution with ${gew.K} ${gew.K === 1 ? 'group' : 'groups'} is shown: ${gew.zahl.map((v, g) => `group ${g + 1} ${v}`).join(', ')} people${gew.K > 1 ? `; entropy ${z(gew.entropie, 2)} (1 = every person clearly assigned)` : ''}.`));
    if (gew.K > 1 && gew.gleichBest < gew.brauchbar / 4) aus.push(L(`Das beste Ergebnis kam nur in ${gew.gleichBest} von ${gew.brauchbar} Läufen vor: die Lösung ist wenig stabil. Anderen Startwert versuchen und vergleichen.`, `The best result came up in only ${gew.gleichBest} of ${gew.brauchbar} runs: the solution is not very stable. Try another seed and compare.`));
    const klein = gew.K > 1 ? Math.min(...gew.zahl) : gew.n;
    if (klein < 0.05 * gew.n) aus.push(L(`Die kleinste Gruppe hat nur ${klein} Personen (unter 5 %). So kleine Gruppen sind oft Ausreißer oder Zufall, nicht ein eigenes Profil.`, `The smallest group has only ${klein} people (under 5%). Such small groups are often outliers or chance rather than a profile of their own.`));
    return aus;
  });

  const FORM = ['kreis', 'quadrat', 'dreieck', 'raute', 'plus', 'kreuz', 'sechseck', 'stern'];
  const STRICH = [undefined, '7 4', '2 4', '10 3 2 3', '4 4', '1 5', '12 4', '6 2 2 2'];
  const W = 520, H = 300, ML = 44, MR = 28, MT = 16, MB = 34;
  const yMax = $derived(Math.max(1, ...(gew ? gew.mittel.flatMap((_, g) => ok!.benutzt.map((__, j) => Math.abs(zw(g, j)))) : [1])) * 1.1);
  const xp = (j: number, p: number) => ML + (p === 1 ? 0 : (j * (W - ML - MR)) / (p - 1));
  const yp = (v: number) => MT + ((yMax - v) / (2 * yMax)) * (H - MT - MB);

  const bt = $derived(ok && gew ? bildtext('sonstiges', {
    artName: L('Profile der Gruppen', 'Profiles of the groups'),
    saetze: [L(`Liniendiagramm: waagerecht die ${ok.e.p} Spalten (nummeriert), senkrecht der Mittelwert der Gruppe als Abweichung vom Gesamtmittel in Standardabweichungen. ${gew.K} Gruppen, jede mit eigener Form und Strichart.`, `Line chart: the ${ok.e.p} columns (numbered) along the bottom, the group mean as deviation from the overall mean in standard deviations up the side. ${gew.K} groups, each with its own shape and line style.`)],
    tabelle: { kopf: [L('Gruppe', 'Group'), ...ok.benutzt.map((_, j) => String(j + 1))], zeilen: gew.mittel.map((_, g) => [String(g + 1), ...ok!.benutzt.map((__, j) => z(zw(g, j)))]) }
  }) : null);

  function rSkript() {
    if (!ok || !gew) return;
    try {
      const sk = baueProfilSkript({ spalten: s.spalten, zeilen: s.zeilen, benutzt: ok.benutzt, r: ok.e, k: gew.K, titel: L('Latente Profile', 'Latent profiles'), datum: heute() });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if passt}
  <details class="auf profil" style="margin-top:var(--a4)"><summary>{L('Gibt es Gruppen mit ähnlichem Muster? (latente Profile, Mischung von Normalverteilungen)', 'Are there groups with a similar pattern? (latent profiles, mixture of normal distributions)')}</summary>
    <p class="heft-text">{L('Bei latenten Profilen nimmt Statable an, dass jede Person unbekannt zu einer von K Gruppen gehört und dass sich die Gruppen in den Mittelwerten der gewählten Spalten unterscheiden. Es rechnet die Lösungen für 1 bis K Gruppen und zeigt für jede den BIC (kleiner ist besser), den AIC und die Entropie (wie eindeutig die Personen den Gruppen zugeordnet sind). Die Gruppenzahl muss ein Mensch wählen: Der BIC hilft, entscheidet aber nicht, und die Gruppen müssen inhaltlich sinnvoll sein.', 'In latent profile analysis Statable assumes that each person belongs, unknown, to one of K groups and that the groups differ in the means of the chosen columns. It calculates the solutions for 1 to K groups and shows for each the BIC (smaller is better), the AIC and the entropy (how clearly the people are assigned to the groups). A person has to choose the number of groups: the BIC helps but does not decide, and the groups have to make sense in terms of content.')}</p>
    <p class="hilfe"><HilfeLink id="latente-profile" text={L('Hilfe: Latente Profile', 'Help: latent profiles')} /> <a href="#lernen/pfad/psychologie">{L('Mehr dazu: Lernpfad Psychologie', 'More: learning path psychology')}</a></p>
    <div class="profil-zeile">
      <fieldset class="profil-art"><legend>{L('Streuungen', 'Variances')}</legend>
        <div class="segment">{#each [['gleich', L('gleich (je Spalte)', 'equal (per column)')], ['frei', L('frei (je Gruppe)', 'free (per group)')]] as [w, t] (w)}<label><input type="radio" name="profil-m-{kennung}" value={w} checked={modell === w} onchange={() => { modell = w as LatentModell; }}>{t}</label>{/each}</div>
      </fieldset>
      <div class="eingabe profil-k"><label for="profil-k-{kennung}">{L('Höchste Gruppenzahl', 'Highest number of groups')}</label><select id="profil-k-{kennung}" bind:value={kMax}>{#each Array.from({ length: PROFIL_MAX_K - 1 }, (_, i) => i + 2) as k (k)}<option value={k}>{k}</option>{/each}</select></div>
      <div class="eingabe profil-start"><label for="profil-s-{kennung}">{L('Startwert', 'Seed')}</label><input id="profil-s-{kennung}" type="number" min="0" step="1" inputmode="numeric" bind:value={startwert} /></div>
    </div>
    <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{ok ? L('Profile neu rechnen', 'Recalculate profiles') : L('Profile rechnen', 'Calculate profiles')}{/if}</button></div>
    {#if res && 'fehler' in res}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if ok && gew}
      <div class="profil-saetze">{#each saetze as t (t)}<p class="heft-text">{t}</p>{/each}</div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Vergleich der Gruppenzahlen', 'Comparison of the numbers of groups')}</b></caption>
        <thead><tr><th scope="col">{L('Gruppen', 'Groups')}</th><th scope="col">{L('Parameter', 'Parameters')}</th><th scope="col">log-Likelihood</th><th scope="col">BIC</th><th scope="col">AIC</th><th scope="col">{L('Entropie', 'Entropy')}</th><th scope="col">{L('Kleinste Gruppe', 'Smallest group')}</th></tr></thead>
        <tbody>{#each loes as l (l.K)}<tr><th scope="row" style="text-align:end">{l.K}{#if l.K === ok.e.bestK} <span class="nur-vorleser">({L('kleinster BIC', 'smallest BIC')})</span><span aria-hidden="true">*</span>{/if}</th><td style="text-align:end">{l.npar}</td><td style="text-align:end">{z(l.ll, 1)}</td><td style="text-align:end">{z(l.bic, 1)}</td><td style="text-align:end">{z(l.aic, 1)}</td><td style="text-align:end">{l.K === 1 ? '-' : z(l.entropie, 3)}</td><td style="text-align:end">{Math.min(...l.zahl)}</td></tr>{/each}</tbody>
      </table></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('* kleinster BIC. Entropie: 1 = jede Person eindeutig zugeordnet, nahe 0 = die Gruppen überlappen stark.', '* smallest BIC. Entropy: 1 = every person clearly assigned, near 0 = the groups overlap strongly.')}</p>
      <div class="eingabe profil-wahl" style="max-width:260px"><label for="profil-w-{kennung}">{L('Gruppenzahl zum Ansehen', 'Number of groups to look at')}</label><select id="profil-w-{kennung}" bind:value={wahlK}>{#each loes as l (l.K)}<option value={l.K}>{l.K}{l.K === ok.e.bestK ? L(' (kleinster BIC)', ' (smallest BIC)') : ''}</option>{/each}</select></div>
      <figure class="ll-bild">
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz} style="max-width:{W}px">
          <line x1={ML} x2={W - MR} y1={yp(0)} y2={yp(0)} stroke="var(--dg-gitter)" stroke-width="1" />
          {#each [-1, 1] as t (t)}{#if Math.abs(t) < yMax}<line x1={ML} x2={W - MR} y1={yp(t)} y2={yp(t)} stroke="var(--dg-gitter)" stroke-width="1" stroke-dasharray="2 4" /><text x={ML - 6} y={yp(t) + 4} text-anchor="end" class="klein" fill="var(--tinte-2)">{t > 0 ? '+1' : '−1'}</text>{/if}{/each}
          <text x={ML - 6} y={yp(0) + 4} text-anchor="end" class="klein" fill="var(--tinte-2)">0</text>
          {#each ok.benutzt as _, j (j)}<text x={xp(j, ok.e.p)} y={H - 12} text-anchor="middle" class="klein" fill="var(--tinte)">{j + 1}</text>{/each}
          {#each gew.mittel as __, g (g)}
            <polyline fill="none" stroke={g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width="2.2" stroke-dasharray={STRICH[g % STRICH.length]} points={ok.benutzt.map((___, j) => `${xp(j, ok.e.p)},${yp(zw(g, j))}`).join(' ')} />
            {#each ok.benutzt as ___, j (j)}{@const x = xp(j, ok.e.p)}{@const y = yp(zw(g, j))}{@const f = FORM[g % FORM.length]}
              {#if f === 'kreis'}<circle cx={x} cy={y} r="4.5" fill="var(--papier, #fff)" stroke={g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width="2" />
              {:else if f === 'quadrat'}<rect x={x - 4} y={y - 4} width="8" height="8" fill="var(--papier, #fff)" stroke={g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width="2" />
              {:else if f === 'dreieck'}<polygon points="{x},{y - 5.5} {x + 5},{y + 4} {x - 5},{y + 4}" fill="var(--papier, #fff)" stroke={g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width="2" />
              {:else if f === 'raute'}<polygon points="{x},{y - 5.5} {x + 5.5},{y} {x},{y + 5.5} {x - 5.5},{y}" fill="var(--papier, #fff)" stroke={g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width="2" />
              {:else}<circle cx={x} cy={y} r="3" fill={g % 2 === 0 ? 'var(--dg-a)' : 'var(--dg-b)'} />{/if}
            {/each}
            <text x={xp(ok.e.p - 1, ok.e.p) + 8} y={yp(zw(g, ok.e.p - 1)) + 4} class="klein" style="font-weight:700" fill="var(--tinte)">{g + 1}</text>
          {/each}
        </svg>
        <figcaption>
          {L('Jede Linie ist eine Gruppe (die Zahl am rechten Ende ist die Gruppennummer, Form und Strichart unterscheiden die Gruppen). Senkrecht: Mittelwert der Gruppe als Abweichung vom Gesamtmittel in Standardabweichungen. Waagerecht: die Spalten, nummeriert wie in der Tabelle.', 'Each line is a group (the number at the right end is the group number; shape and line style tell the groups apart). Up the side: the group mean as deviation from the overall mean in standard deviations. Along the bottom: the columns, numbered as in the table.')}
        </figcaption>
      </figure>
      {#if bt}<BildBeschreibung {...bt} />{/if}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Gruppen bei ${gew.K} ${gew.K === 1 ? 'Gruppe' : 'Gruppen'}: Mittelwerte (Streuung in Klammern)`, `Groups with ${gew.K} ${gew.K === 1 ? 'group' : 'groups'}: means (standard deviation in brackets)`)}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Gruppe', 'Group')}</th><th scope="col">{L('Personen', 'People')}</th><th scope="col">{L('Anteil', 'Share')}</th>{#if gew.K > 1}<th scope="col">{L('Mittlere Zuordnungs-Wahrscheinlichkeit', 'Mean assignment probability')}</th>{/if}{#each ok.benutzt as n, j (n)}<th scope="col">{j + 1}: {nm(n)}</th>{/each}</tr></thead>
        <tbody>{#each gew.mittel as m, g (g)}<tr><th scope="row" style="text-align: start">{g + 1}</th><td style="text-align:end">{gew.zahl[g]}</td><td style="text-align:end">{pw(gew.anteil[g]!)}</td>{#if gew.K > 1}<td style="text-align:end">{z(gew.zuordnungsWs[g]!, 2)}</td>{/if}{#each m as v, j (j)}<td style="text-align:end">{z(v, 2)} ({z(gew.sd[g]![j]!, 2)})</td>{/each}</tr>{/each}</tbody>
      </table></div>
      <div class="knopfzeile"><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L(`Die Gruppen sind Gruppen von Messwerten, keine Typen von Menschen: Statable zeigt, welche Muster in den Zahlen stecken, nicht, was sie bedeuten. Die Gruppennummern sind nur Etiketten (nach Größe geordnet) und können sich bei einem anderen Startwert vertauschen. Innerhalb einer Gruppe sind die Spalten als unabhängig angenommen; das ist eine Vereinfachung. Das Skript rechnet mit anderen Zufalls-Startpersonen, das beste Ergebnis ist gleich.`, `The groups are groups of measurements, not types of people: Statable shows which patterns are in the numbers, not what they mean. The group numbers are only labels (ordered by size) and can swap with another seed. Within a group the columns are assumed independent; this is a simplification. The script calculates with other random starting people; the best result is the same.`)}</p>
    {/if}
  </details>
{/if}

<style>
  .profil-zeile { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); align-items: end; margin-block: var(--a2); }
  .profil-art { border: 0; padding: 0; margin: 0; }
  .profil-art legend { font-weight: 600; margin-bottom: var(--a1); }
  .profil-k, .profil-start { max-width: 200px; margin: 0; }
  .profil :global(.ll-bild) { margin: var(--a2) 0; min-width: 0; }
  .profil :global(.ll-bild figcaption) { font-size: var(--gr-klein); color: var(--tinte-2); max-width: var(--breite-text); margin-top: var(--a1); }
</style>
