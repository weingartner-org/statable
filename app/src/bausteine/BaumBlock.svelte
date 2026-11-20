<script lang="ts">
  /** Entscheidungsbaum (CART) unter „Lässt sich etwas vorhersagen?“: sagt eine Gruppenzugehörigkeit (2 bis 8 Gruppen) aus anderen Spalten voraus, mit Lern- und Prüfdaten. Rechnet im Browser (lib/baum.ts), erst auf Klick. */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { pfeil } from '../i18n/profil';
  import { istFehlend } from '../lib/fehlend';
  import { komma } from '../lib/ergebnis';
  import { baum, vorhersage, regressionsbaum, regVorhersage, wichtigkeit, type BaumErgebnis, type BaumFehler, type BaumKnoten, type RegBaumErgebnis, type RegKnoten, type Merkmal } from '../lib/baum';
  import Rechnet from './Rechnet.svelte';
  import Baumgrafik, { type GrafikKnoten } from './Baumgrafik.svelte';

  const kennung = $props.id();
  const lab = (c: (typeof s.spalten)[number], v: unknown) => (typeof v === 'number' ? (c.werteLabels[String(v)] ?? String(v)) : String(v ?? ''));
  const stufen = (c: (typeof s.spalten)[number]) => {
    const i = s.spalten.indexOf(c), w = new Set<string>();
    for (const z of s.zeilen) { const v = z[i]; if (v === null || v === undefined || v === '' || (typeof v === 'number' && istFehlend(c, v))) continue; w.add(lab(c, v)); if (w.size > 12) break; }
    return w.size;
  };
  const name = (c: { name: string; bezeichnung: string }) => c.bezeichnung.trim() || c.name;
  const zielKandidaten = $derived(s.spalten.filter(c => c.art !== 'datum' && (() => { const n = stufen(c); return n >= 2 && (n <= 8 || c.art === 'zahl'); })()));
  /** Zahl mit vielen Werten als Ziel: Regressionsbaum, sonst Klassifikation */
  const regModus = $derived.by(() => { const c = s.spalten.find(x => x.name === ziel); return !!c && c.art === 'zahl' && stufen(c) > 8; });
  let regRes = $state<{ b: RegBaumErgebnis; m: Merkmal[]; lern: number[]; pruef: number[]; y: number[]; weg: number } | null>(null);
  let ziel = $state(''), merkmale = $state<string[]>([]), laeuft = $state(false), res = $state<{ b: BaumErgebnis; m: Merkmal[]; lern: number[]; pruef: number[]; y: string[]; weg: number } | BaumFehler | null>(null);
  const merkmalKandidaten = $derived(s.spalten.filter(c => c.name !== ziel && (c.art === 'zahl' || (c.art === 'text' && stufen(c) <= 10))));
  $effect(() => { void ziel; void merkmale.join('|'); res = null; regRes = null; });
  /** Merkmale, die es nicht (mehr) gibt oder die jetzt das Ziel sind, fallen heraus */
  $effect(() => { const gut = merkmale.filter(n => n !== ziel && s.spalten.some(c => c.name === n)); if (gut.length !== merkmale.length) merkmale = gut; });
  const umschalten = (n: string, an: boolean) => { merkmale = an ? [...merkmale, n] : merkmale.filter(x => x !== n); };

  /** feste Zufallsfolge (mulberry32), damit dieselben Daten dieselbe Aufteilung geben */
  function zufall(seed: number) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  async function rechnen() {
    const cz = s.spalten.find(c => c.name === ziel); if (laeuft || !cz || !merkmale.length) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    if (regModus) { await rechneReg(cz); return; }
    const iz = s.spalten.indexOf(cz), cm = merkmale.map(n => s.spalten.find(c => c.name === n)!), im = cm.map(c => s.spalten.indexOf(c));
    const y: string[] = [], werte: (number | string)[][] = cm.map(() => []); let weg = 0;
    for (const z of s.zeilen) {
      const v = z[iz], ok = v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && istFehlend(cz, v)) && cm.every((c, k) => { const w = z[im[k]!]; return w !== null && w !== undefined && w !== '' && !(typeof w === 'number' && istFehlend(c, w)); });
      if (!ok) { weg++; continue; }
      y.push(lab(cz, v)); cm.forEach((c, k) => werte[k]!.push(c.art === 'zahl' ? (z[im[k]!] as number) : String(z[im[k]!])));
    }
    const m: Merkmal[] = cm.map((c, k) => ({ name: name(c), art: c.art === 'zahl' ? 'zahl' : 'kategorie', werte: werte[k]! }));
    // 70 % Lerndaten, 30 % Prüfdaten, feste Aufteilung
    const rnd = zufall(20261023), idx = y.map((_, i) => i).sort(() => rnd() - 0.5), nL = Math.round(y.length * 0.7), lern = idx.slice(0, nL).sort((a, b) => a - b), pruef = idx.slice(nL).sort((a, b) => a - b);
    const sub = (ix: number[]): Merkmal[] => m.map(q => ({ ...q, werte: ix.map(i => q.werte[i]!) }));
    const b = baum(ix2(y, lern), sub(lern));
    res = 'fehler' in b ? b : { b, m, lern, pruef, y, weg };
    laeuft = false;
  }
  const ix2 = (y: string[], ix: number[]) => ix.map(i => y[i]!);
  async function rechneReg(cz: (typeof s.spalten)[number]) {
    const iz = s.spalten.indexOf(cz), cm = merkmale.map(n => s.spalten.find(c => c.name === n)!), im = cm.map(c => s.spalten.indexOf(c));
    const y: number[] = [], werte: (number | string)[][] = cm.map(() => []); let weg = 0;
    for (const z of s.zeilen) {
      const v = z[iz], ok2 = typeof v === 'number' && !istFehlend(cz, v) && cm.every((c, k) => { const w = z[im[k]!]; return w !== null && w !== undefined && w !== '' && !(typeof w === 'number' && istFehlend(c, w)); });
      if (!ok2) { weg++; continue; }
      y.push(v as number); cm.forEach((c, k) => werte[k]!.push(c.art === 'zahl' ? (z[im[k]!] as number) : String(z[im[k]!])));
    }
    const m: Merkmal[] = cm.map((c, k) => ({ name: name(c), art: c.art === 'zahl' ? 'zahl' : 'kategorie', werte: werte[k]! }));
    const rnd = zufall(20261023), idx = y.map((_, i) => i).sort(() => rnd() - 0.5), nL = Math.round(y.length * 0.7), lern = idx.slice(0, nL).sort((a, b) => a - b), pruef = idx.slice(nL).sort((a, b) => a - b);
    const b = regressionsbaum(lern.map(i => y[i]!), m.map(q => ({ ...q, werte: lern.map(i => q.werte[i]!) })));
    if ('fehler' in b) res = b; else regRes = { b, m, lern, pruef, y, weg };
    laeuft = false;
  }
  /** Vorhersagegüte eines Regressionsbaums: R² und mittlerer Fehler (Wurzel) auf einer Teilmenge, Vergleich: immer der Mittelwert der Lerndaten */
  function bewerteReg(ix: number[]) {
    if (!regRes || !ix.length) return null;
    const { b, m, y, lern } = regRes, mu = lern.reduce((a, i) => a + y[i]!, 0) / lern.length;
    let sse = 0, sst = 0, sseB = 0;
    for (const i of ix) { const p = regVorhersage(b, m, i).wert; sse += (y[i]! - p) ** 2; sseB += (y[i]! - mu) ** 2; }
    const my = ix.reduce((a, i) => a + y[i]!, 0) / ix.length; for (const i of ix) sst += (y[i]! - my) ** 2;
    return { n: ix.length, r2: sst > 0 ? 1 - sse / sst : NaN, rmse: Math.sqrt(sse / ix.length), rmseBasis: Math.sqrt(sseB / ix.length) };
  }
  const regLern = $derived(regRes ? bewerteReg(regRes.lern) : null), regPruef = $derived(regRes ? bewerteReg(regRes.pruef) : null);
  const regBedingung = (b: RegBaumErgebnis, k: RegKnoten, links: boolean) => bedingung({ merkmale: b.merkmale } as BaumErgebnis, k as unknown as BaumKnoten, links);
  const ok = $derived(res && !('fehler' in res) ? res : null);
  /** Treffer, Basisrate und Wahrheitsmatrix für eine Teilmenge der Fälle */
  function bewerte(ix: number[]) {
    if (!ok) return null;
    const { b, m, y } = ok, K = b.klassen.length, mat = Array.from({ length: K }, () => new Array<number>(K).fill(0));
    let treffer = 0;
    for (const i of ix) { const w = b.klassen.indexOf(y[i]!), p = vorhersage(b, m, i).klasse; if (w < 0) continue; mat[w]![p]!++; if (w === p) treffer++; }
    return { n: ix.length, anteil: ix.length ? treffer / ix.length : NaN, mat };
  }
  const lernB = $derived(ok ? bewerte(ok.lern) : null), pruefB = $derived(ok ? bewerte(ok.pruef) : null);
  const basis = $derived.by(() => { if (!ok) return NaN; const z = new Array<number>(ok.b.klassen.length).fill(0); for (const i of ok.pruef) { const q = ok.b.klassen.indexOf(ok.y[i]!); if (q >= 0) z[q]!++; } return Math.max(...z) / Math.max(ok.pruef.length, 1); });
  const pr = (v: number) => (Number.isFinite(v) ? `${komma(v * 100, 0)} %` : '-');
  const z2 = (v: number) => komma(v, 2);
  const fehlerText = (f: BaumFehler) => f.fehler === 'eine-klasse' ? L('Das Ergebnis hat nur eine Gruppe; es braucht mindestens zwei.', 'The outcome has only one group; at least two are needed.')
    : f.fehler === 'zu-viele-klassen' ? L('Das Ergebnis hat mehr als acht Gruppen.', 'The outcome has more than eight groups.')
    : f.fehler === 'zu-wenig-faelle' ? L('Zu wenige Fälle für einen Baum (mindestens etwa 50 mit allen Angaben).', 'Too few cases for a tree (at least about 50 with all answers).')
    : L('Die gewählten Spalten lassen sich nicht auswerten.', 'The chosen columns cannot be analysed.');
  const bedingung = (b: BaumErgebnis, k: BaumKnoten, links: boolean) => {
    const t = k.teilung!, n = b.merkmale[t.merkmal]!;
    return t.schwelle !== undefined ? (links ? L(`${n} kleiner als ${zz(t.schwelle)}`, `${n} less than ${zz(t.schwelle)}`) : L(`${n} mindestens ${zz(t.schwelle)}`, `${n} at least ${zz(t.schwelle)}`))
      : (links ? L(`${n} ist ${t.links!.join(` ${L('oder', 'or')} `)}`, `${n} is ${t.links!.join(` ${L('oder', 'or')} `)}`) : L(`${n} ist etwas anderes`, `${n} is something else`));
  };
  /** kurze Beschriftung eines Astes: „< 5,97“, „≥ 5,97“, „∈ {x, y}“, „∉ {x, y}“ */
  const ast = (k: RegKnoten | BaumKnoten, links: boolean) => { const t = k.teilung!; return t.schwelle !== undefined ? `${links ? '<' : '≥'} ${zz(t.schwelle)}` : `${links ? '∈' : '∉'} {${t.links!.join(', ')}}`; };
  const grafikKlass = (b: BaumErgebnis, k: BaumKnoten): GrafikKnoten => k.links && k.rechts
    ? { blatt: false, text: [b.merkmale[k.teilung!.merkmal]!, `n = ${k.n}`], astLinks: ast(k as unknown as RegKnoten, true), astRechts: ast(k as unknown as RegKnoten, false), links: grafikKlass(b, k.links), rechts: grafikKlass(b, k.rechts) }
    : { blatt: true, text: [b.klassen[k.klasse]!, `n = ${k.n}`, `${k.n - k.fehler} ${L('richtig', 'right')}`] };
  const grafikReg = (b: RegBaumErgebnis, k: RegKnoten): GrafikKnoten => k.links && k.rechts
    ? { blatt: false, text: [b.merkmale[k.teilung!.merkmal]!, `n = ${k.n}`], astLinks: ast(k, true), astRechts: ast(k, false), links: grafikReg(b, k.links), rechts: grafikReg(b, k.rechts) }
    : { blatt: true, text: [komma(k.mittel, 2), `n = ${k.n}`] };
  const zz = (v: number) => komma(v, Math.abs(v) >= 100 ? 0 : 2);
</script>

{#snippet knotenAnsicht(b: BaumErgebnis, k: BaumKnoten)}
  {#if k.links && k.rechts}
    <ul class="heft-text" style="margin-block: var(--a1); margin-inline: var(--a3) 0">
      <li>{L('Wenn', 'If')} <b>{bedingung(b, k, true)}</b>: {@render zweig(b, k.links)}</li>
      <li>{L('Wenn', 'If')} <b>{bedingung(b, k, false)}</b>: {@render zweig(b, k.rechts)}</li>
    </ul>
  {/if}
{/snippet}
{#snippet zweig(b: BaumErgebnis, k: BaumKnoten)}
  {#if k.links && k.rechts}{@render knotenAnsicht(b, k)}
  {:else}{pfeil()} <b>{b.klassen[k.klasse]}</b> ({L(`${k.n} Personen, davon ${k.n - k.fehler} richtig zugeordnet`, `${k.n} people, of whom ${k.n - k.fehler} correctly assigned`)}){/if}
{/snippet}

{#snippet regAnsicht(b: RegBaumErgebnis, k: RegKnoten)}
  {#if k.links && k.rechts}
    <ul class="heft-text" style="margin-block: var(--a1); margin-inline: var(--a3) 0">
      <li>{L('Wenn', 'If')} <b>{regBedingung(b, k, true)}</b>: {@render regZweig(b, k.links)}</li>
      <li>{L('Wenn', 'If')} <b>{regBedingung(b, k, false)}</b>: {@render regZweig(b, k.rechts)}</li>
    </ul>
  {/if}
{/snippet}
{#snippet regZweig(b: RegBaumErgebnis, k: RegKnoten)}
  {#if k.links && k.rechts}{@render regAnsicht(b, k)}
  {:else}{pfeil()} <b>{komma(k.mittel, 2)}</b> ({L(`${k.n} Personen`, `${k.n} people`)}){/if}
{/snippet}

{#snippet wichtigkeitTabelle(namen: string[], w: number[])}
  {#if w.some(v => v > 0)}
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Wichtigkeit der Spalten in diesem Baum', 'Importance of the columns in this tree')}</b></caption>
      <thead><tr><th scope="col">{L('Spalte', 'Column')}</th><th scope="col">{L('Anteil an den Teilungen', 'Share of the splits')}</th></tr></thead>
      <tbody>{#each namen.map((n, i) => ({ n, v: w[i]! })).sort((a, b) => b.v - a.v) as e (e.n)}<tr><th scope="row" style="text-align: start">{e.n}</th><td style="text-align:right">{pr(e.v)}</td></tr>{/each}</tbody>
    </table></div>
    <p class="heft-text" style="color:var(--tinte-2)">{L('Der Anteil sagt, wie viel von der Trennung in den Gruppen die Teilungen mit dieser Spalte bringen. Er gilt nur für diesen einen Baum: Ähnliche Spalten können sich gegenseitig verdrängen, und ein anderer Baum gewichtet anders. Spalten ohne Teilung zeigt die Tabelle mit 0 %.', 'The share tells how much of the separation between the groups the splits on this column bring. It applies only to this one tree: similar columns can push each other out, and another tree weights differently. Columns without a split show 0%.')}</p>
  {/if}
{/snippet}

{#if zielKandidaten.length && s.spalten.length >= 2}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Entscheidungsbaum: Wer gehört zu welcher Gruppe?', 'Decision tree: who belongs to which group?')}</summary>
    <p class="heft-text">{L('Ein Entscheidungsbaum teilt die Personen Schritt für Schritt nach Ja/Nein-Fragen (zum Beispiel „Alter kleiner als 12,5?“) in immer einheitlichere Gruppen. Er sagt voraus, zu welcher Gruppe eine Person gehört. Statable lernt den Baum an 70 % der Personen und prüft ihn an den übrigen 30 %: Nur die Prüfdaten zeigen, ob er auch bei neuen Personen taugt.', 'A decision tree splits the people step by step with yes/no questions (for example "age less than 12.5?") into ever more uniform groups. It predicts which group a person belongs to. Statable learns the tree on 70 % of the people and tests it on the other 30 %: only the test data show whether it also works for new people.')}</p>
    <p class="hilfe"><HilfeLink id="entscheidungsbaum" text={L('Hilfe: Entscheidungsbaum', 'Help: decision tree')} /></p>
    {#if regModus}<p class="heft-text">{L('Ist das Ziel eine Zahl mit vielen Werten (zum Beispiel eine Punktzahl), sagt der Baum den Mittelwert in jedem Blatt voraus (Regressionsbaum).', 'If the target is a number with many values (for example a score), the tree predicts the mean in each leaf (regression tree).')}</p>{/if}
    <div class="eingabe" style="max-width:340px"><label for="bm-z-{kennung}">{regModus ? L('Welche Zahl soll vorhergesagt werden?', 'Which number should be predicted?') : L('Welche Gruppe soll vorhergesagt werden?', 'Which group should be predicted?')}</label>
      <select id="bm-z-{kennung}" bind:value={ziel}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zielKandidaten as c (c.name)}<option value={c.name}>{name(c)}</option>{/each}</select></div>
    {#if ziel}
      <fieldset style="border:0;padding:0;margin:var(--a2) 0"><legend style="font-weight:600">{L('Aus welchen Spalten?', 'From which columns?')}</legend>
        {#each merkmalKandidaten as c (c.name)}<label class="schalter" style="display:inline-flex;margin-inline-end:var(--a4)"><input type="checkbox" checked={merkmale.includes(c.name)} onchange={(ev) => umschalten(c.name, ev.currentTarget.checked)} />{name(c)}</label>{/each}
      </fieldset>
      <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft || !merkmale.length}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{L('Baum wachsen lassen', 'Grow the tree')}{/if}</button></div>
    {/if}
    {#if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if regRes && regLern && regPruef}
      <p class="heft-text" role="status">{L(`${regRes.y.length} Personen gehen ein (${regRes.lern.length} zum Lernen, ${regRes.pruef.length} zum Prüfen).`, `${regRes.y.length} people are included (${regRes.lern.length} for learning, ${regRes.pruef.length} for testing).`)}{#if regRes.weg} {L(`${regRes.weg} Personen mit Lücken bleiben außen vor.`, `${regRes.weg} people with gaps are left out.`)}{/if} {L(`Der Baum hat ${regRes.b.blaetter} Blätter und ${regRes.b.tiefe} Ebenen.`, `The tree has ${regRes.b.blaetter} leaves and ${regRes.b.tiefe} levels.`)}</p>
      {#if regRes.b.blaetter === 1}<p class="heft-text">{L('Der Baum teilt nirgends: Mit diesen Spalten lässt sich die Zahl nicht besser vorhersagen als mit dem Mittelwert aller.', 'The tree does not split anywhere: with these columns the number cannot be predicted better than with the mean of everyone.')}</p>
      {:else}{@render regAnsicht(regRes.b, regRes.b.wurzel)}<Baumgrafik wurzel={grafikReg(regRes.b, regRes.b.wurzel)} titel={L('Entscheidungsbaum', 'Decision tree')} />{/if}
      {@render wichtigkeitTabelle(regRes.b.merkmale, wichtigkeit(regRes.b.wurzel, regRes.b.merkmale.length))}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Wie gut stimmt die Vorhersage?', 'How well does the prediction fit?')}</b></caption>
        <thead><tr><th scope="col">{L('Daten', 'Data')}</th><th scope="col">{L('Personen', 'People')}</th><th scope="col">R²</th><th scope="col">{L('Mittlerer Fehler', 'Typical error')}</th><th scope="col">{L('Mittlerer Fehler beim Raten des Mittelwerts', 'Typical error when guessing the mean')}</th></tr></thead>
        <tbody>
          <tr><th scope="row" style="text-align: start">{L('Lerndaten', 'Learning data')}</th><td style="text-align:right">{regLern.n}</td><td style="text-align:right">{z2(regLern.r2)}</td><td style="text-align:right">{z2(regLern.rmse)}</td><td style="text-align:right">{z2(regLern.rmseBasis)}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Prüfdaten', 'Test data')}</th><td style="text-align:right">{regPruef.n}</td><td style="text-align:right">{z2(regPruef.r2)}</td><td style="text-align:right">{z2(regPruef.rmse)}</td><td style="text-align:right">{z2(regPruef.rmseBasis)}</td></tr>
        </tbody>
      </table></div>
      <p class="heft-text" style="color:var(--tinte-2)">{regPruef.rmse >= regPruef.rmseBasis ? L('Auf den Prüfdaten ist der Baum nicht besser als der Mittelwert: Er hat vermutlich nur Zufälligkeiten der Lerndaten gelernt.', 'On the test data the tree is not better than the mean: it has probably learned only chance features of the learning data.') : L('Auf den Prüfdaten ist der Fehler des Baums kleiner als beim Raten des Mittelwerts.', 'On the test data the error of the tree is smaller than when guessing the mean.')}</p>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Bäume sind instabil: Mit anderen Personen sieht der Baum oft ganz anders aus. Er beschreibt, was zu diesen Daten passt, keine Ursachen. Rechnen wie R rpart (Voreinstellungen: mindestens 20 Personen zum Teilen, 7 je Blatt, Komplexität 0,01).', 'Trees are unstable: with other people the tree often looks completely different. It describes what fits these data, not causes. Calculated like R rpart (defaults: at least 20 people to split, 7 per leaf, complexity 0.01).')}</p>
    {:else if ok && lernB && pruefB}
      <p class="heft-text" role="status">{L(`${ok.y.length} Personen gehen ein (${ok.lern.length} zum Lernen, ${ok.pruef.length} zum Prüfen).`, `${ok.y.length} people are included (${ok.lern.length} for learning, ${ok.pruef.length} for testing).`)}{#if ok.weg} {L(`${ok.weg} Personen mit Lücken bleiben außen vor.`, `${ok.weg} people with gaps are left out.`)}{/if} {L(`Der Baum hat ${ok.b.blaetter} Blätter und ${ok.b.tiefe} Ebenen.`, `The tree has ${ok.b.blaetter} leaves and ${ok.b.tiefe} levels.`)}</p>
      {#if ok.b.blaetter === 1}<p class="heft-text">{L('Der Baum teilt nirgends: Mit diesen Spalten lässt sich die Gruppe nicht besser vorhersagen als durch Raten der häufigsten Gruppe.', 'The tree does not split anywhere: with these columns the group cannot be predicted better than by guessing the most frequent group.')}</p>
      {:else}{@render knotenAnsicht(ok.b, ok.b.wurzel)}<Baumgrafik wurzel={grafikKlass(ok.b, ok.b.wurzel)} titel={L('Entscheidungsbaum', 'Decision tree')} />{/if}
      {@render wichtigkeitTabelle(ok.b.merkmale, wichtigkeit(ok.b.wurzel, ok.b.merkmale.length))}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Wie oft stimmt die Vorhersage?', 'How often is the prediction right?')}</b></caption>
        <thead><tr><th scope="col">{L('Daten', 'Data')}</th><th scope="col">{L('Personen', 'People')}</th><th scope="col">{L('Richtig', 'Right')}</th></tr></thead>
        <tbody>
          <tr><th scope="row" style="text-align: start">{L('Lerndaten', 'Learning data')}</th><td style="text-align:right">{lernB.n}</td><td style="text-align:right">{pr(lernB.anteil)}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Prüfdaten', 'Test data')}</th><td style="text-align:right">{pruefB.n}</td><td style="text-align:right">{pr(pruefB.anteil)}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Zum Vergleich: immer die häufigste Gruppe raten (Prüfdaten)', 'For comparison: always guess the most frequent group (test data)')}</th><td style="text-align:right">{pruefB.n}</td><td style="text-align:right">{pr(basis)}</td></tr>
        </tbody>
      </table></div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Prüfdaten: wirkliche Gruppe (Zeilen) und vorhergesagte Gruppe (Spalten)', 'Test data: actual group (rows) and predicted group (columns)')}</b></caption>
        <thead><tr><th scope="col"></th>{#each ok.b.klassen as k (k)}<th scope="col">{k}</th>{/each}</tr></thead>
        <tbody>{#each pruefB.mat as zeile, i (i)}<tr><th scope="row" style="text-align: start">{ok.b.klassen[i]}</th>{#each zeile as v, j (j)}<td style="text-align:right">{v}</td>{/each}</tr>{/each}</tbody>
      </table></div>
      <p class="heft-text" style="color:var(--tinte-2)">{pruefB.anteil <= basis + 0.02 ? L('Auf den Prüfdaten ist der Baum nicht besser als Raten: Er hat vermutlich nur Zufälligkeiten der Lerndaten gelernt.', 'On the test data the tree is not better than guessing: it has probably learned only chance features of the learning data.') : L(`Auf den Prüfdaten ist der Baum um ${z2((pruefB.anteil - basis) * 100)} Prozentpunkte besser als Raten.`, `On the test data the tree is ${z2((pruefB.anteil - basis) * 100)} percentage points better than guessing.`)}</p>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Bäume sind instabil: Mit anderen Personen sieht der Baum oft ganz anders aus. Er beschreibt, was zu diesen Daten passt, keine Ursachen. Rechnen wie R rpart (Voreinstellungen: mindestens 20 Personen zum Teilen, 7 je Blatt, Komplexität 0,01).', 'Trees are unstable: with other people the tree often looks completely different. It describes what fits these data, not causes. Calculated like R rpart (defaults: at least 20 people to split, 7 per leaf, complexity 0.01).')}</p>
    {/if}
  </details>
{/if}
