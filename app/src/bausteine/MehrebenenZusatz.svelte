<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { L, melde, sichern, s, spalteNach, type Blatt } from '../lib/sitzung.svelte';
  import { lesbar } from '../lib/verzeichnis';
  import { komma } from '../lib/ergebnis';
  import { mehrebenenRechnen } from '../lib/rverfahren.svelte';
  import { steigungMoeglich, mebRCode, mebDaten, erkenneWachstum, R_PAKETE_MEB, type Mehrebenen, type MebZentrierung, type MebTeil } from '../lib/mehrebenen';
  import { praedName } from '../lib/mehrebenensaetze';
  import RStart from './RStart.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /** Zusatz im Blatt des Mehrebenen-Modells: „Für Fachleute“ (zufällige Steigung, Zentrieren am Gesamt- oder Gruppenmittel, Wechselwirkungen auch über die Ebenen, R-Aufruf), Hinweis auf das Wachstumsmodell und die R-Meldungen. */
  let { blatt, e }: { blatt: Blatt; e: Mehrebenen } = $props();
  const name = (n: string) => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; };
  const komma0 = (v: number) => komma(v, 1);
  const orig = $derived(e.praedOrig ?? e.praed.map(p => p.name));
  let steigung = $state(untrack(() => e.steigung)), laeuft = $state(false), fehler = $state(''), fehlt = $state(false), offen = $state(false);
  let art = $state<MebZentrierung>(untrack(() => e.zentrierArt ?? (e.zentriert ? 'gesamt' : 'keine')));
  let wechsel = $state<[MebTeil, MebTeil][]>(untrack(() => (e.wechsel ?? []).map(([a, b]) => [{ ...a }, { ...b }] as [MebTeil, MebTeil])));
  const zahlSpalten = $derived(orig.filter(n => s.spalten.find(c => c.name === n)?.art === 'zahl' && e.praed.some(p => (p.name === n && p.art === 'zahl') || p.teile?.some(t => t.quelle === n))));
  let zentrierSpalten = $state<string[] | null>(untrack(() => (e.zentrierSpalten ? [...e.zentrierSpalten] : null)));
  const gewaehlteZentrierung = $derived(zentrierSpalten ?? zahlSpalten);
  /** Die Größen, die das Modell nach diesen Einstellungen hat (nur Namen, aus denselben Daten wie die Rechnung): Auswahl für Steigung und Wechselwirkungen. */
  const plan = $derived(offen ? mebDaten(e.y, e.gruppe, orig, s.zeilen, s.spalten, { zentrieren: art, zentrierSpalten: gewaehlteZentrierung, wechsel: [] }).praed : e.praed.filter(p => !(p.teile?.length === 2)));
  const moegliche = $derived(plan.filter(steigungMoeglich));
  const teilVon = (p: (typeof plan)[number]): MebTeil => (p.teile?.[0] ?? { quelle: p.name });
  const teilText = (t: MebTeil) => praedName({ name: '', art: 'zahl', stufen: [], teile: [t] }, name);
  const gleich = (a: MebTeil, b: MebTeil) => a.quelle === b.quelle && (a.rolle ?? '') === (b.rolle ?? '');
  let wa = $state(''), wb = $state('');
  const mitZweiStufen = (p: (typeof plan)[number]) => p.art === 'zahl' || p.stufen.length === 2;
  const operanden = $derived(plan.filter(mitZweiStufen));
  const geaendert = $derived(steigung !== e.steigung || art !== (e.zentrierArt ?? (e.zentriert ? 'gesamt' : 'keine')) || JSON.stringify(wechsel) !== JSON.stringify(e.wechsel ?? []) || JSON.stringify(zentrierSpalten) !== JSON.stringify(e.zentrierSpalten ?? null));
  const wachstum = $derived(e.steigung || e.gruppe2 ? null : erkenneWachstum(s.spalten, s.zeilen, e.gruppe, orig));

  function hinzu() {
    const ia = Number(wa), ib = Number(wb);
    if (wa === '' || wb === '' || ia === ib) return;
    const ta = teilVon(operanden[ia]!), tb = teilVon(operanden[ib]!);
    if (wechsel.some(([x, y]) => (gleich(x, ta) && gleich(y, tb)) || (gleich(x, tb) && gleich(y, ta)))) return;
    wechsel = [...wechsel, [ta, tb]]; wa = ''; wb = '';
    melde(L('Wechselwirkung hinzugefügt. Zum Rechnen „Neu rechnen“ drücken.', 'Interaction added. Press "Recalculate" to calculate.'));
  }
  async function rechnen(ueberSteigung = steigung, ueberArt = art) {
    if (laeuft) return;
    laeuft = true; fehler = '';
    try {
      const neu = await mehrebenenRechnen(e.y, e.gruppe, orig, { steigung: ueberSteigung, zentrieren: ueberArt, wechsel, ...(e.gruppe2 ? { gruppe2: e.gruppe2 } : {}), ...(zentrierSpalten ? { zentrierSpalten } : {}) });
      blatt.ergebnis = { typ: 'mehrebenen', e: neu };
      sichern();
      melde(neu.steigung ? L('Mit zufälliger Steigung neu gerechnet.', 'Recalculated with a random slope.') : L('Neu gerechnet.', 'Recalculated.'));
    } catch (x) { fehler = (x as Error).message; await tick(); document.getElementById('meb-zusatz-fehler')?.focus(); }
    finally { laeuft = false; }
  }
  /** Wachstumsmodell: Zeit als Vorhersagegröße mit zufälliger Steigung je Person (nur Führung, die Rechnung ist die des Mehrebenenmodells). */
  async function wachstumRechnen() { if (!wachstum) return; steigung = wachstum.zeit; await rechnen(wachstum.zeit, art); }
</script>

<details class="auf" style="margin-top:var(--a4)" ontoggle={(ev) => { if ((ev.currentTarget as HTMLDetailsElement).open) offen = true; }}><summary>{L('Für Fachleute', 'For specialists')}</summary>
  <p class="heft-text">{L('Das Modell hat einen zufälligen Achsenabschnitt je Gruppe: Jede Gruppe darf ein eigenes Niveau haben. Eine zufällige Steigung erlaubt zusätzlich, dass der Zusammenhang eines Merkmals mit dem Ergebnis in jeder Gruppe anders ausfällt. Sie braucht deutlich mehr Gruppen (Faustregel: mindestens 30) und mehr Fälle je Gruppe; ob sie sich lohnt, zeigt der Modellvergleich weiter unten.', 'The model has a random intercept per group: each group may have its own level. A random slope additionally allows the relationship of a characteristic with the outcome to differ in each group. It needs clearly more groups (rule of thumb: at least 30) and more cases per group; whether it pays off is shown by the model comparison further below.')} <HilfeLink id="mehrebenen" text={L('Hilfe: Mehrebenenmodell', 'Help: multilevel model')} /></p>
  {#if wachstum}
    <div class="korr-wahl" style="margin:var(--a2) 0">
      <h3 style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Verläufe über die Zeit? (Wachstumsmodell)', 'Change over time? (growth model)')}</h3>
      <p class="heft-text" data-begriff="wachstumsmodell">{L(`Die Daten sehen nach Person mal Zeitpunkt aus: ${name(wachstum.gruppe)} hat im Mittel ${komma0(wachstum.messungenJeGruppe)} Messungen, ${name(wachstum.zeit)} ändert sich innerhalb der Personen. Dann passt ein Wachstumsmodell: Die Zeit ist die Vorhersagegröße, und jede Person bekommt einen eigenen Startwert (Achsenabschnitt) und einen eigenen Verlauf (zufällige Steigung der Zeit). Der Wert der Konstante ist dann der Startwert, wenn die Zeit 0 ist; eine Zeit, die beim ersten Messzeitpunkt 0 ist, erleichtert das Lesen. Das ist ein Vorschlag, keine Pflicht.`, `The data look like person by time point: ${name(wachstum.gruppe)} has on average ${komma0(wachstum.messungenJeGruppe)} measurements, ${name(wachstum.zeit)} changes within persons. A growth model then fits: time is the predictor, and each person gets an own starting value (intercept) and an own trajectory (random slope of time). The value of the constant is then the starting value when time is 0; time coded 0 at the first occasion makes this easier to read. This is a suggestion, not a duty.`)}</p>
      <RStart knopf={L(`Zeit (${name(wachstum.zeit)}) mit zufälliger Steigung je Person rechnen`, `Calculate time (${name(wachstum.zeit)}) with a random slope per person`)} los={wachstumRechnen} {laeuft} haupt={false} pakete={R_PAKETE_MEB} bind:fehlt />
    </div>
  {/if}
  <div class="eingabe" style="max-width:380px;margin:var(--a2) 0"><label for="meb-steigung">{L('Zufällige Steigung für', 'Random slope for')}</label>
    <select data-begriff="zufaellige-steigung" id="meb-steigung" bind:value={steigung} disabled={!moegliche.length || e.binaer || !!e.gruppe2}>
      <option value="">{L('keine (nur zufälliger Achsenabschnitt)', 'none (random intercept only)')}</option>
      {#each moegliche as p (p.name)}<option value={p.name}>{praedName(p, name)}</option>{/each}
    </select>
    {#if e.gruppe2}<p class="hilfe">{L('Mit zwei Gruppierungen rechnet Statable nur zufällige Achsenabschnitte, ohne zufällige Steigung.', 'With two groupings Statable only fits random intercepts, without a random slope.')}</p>{:else if e.binaer}<p class="hilfe">{L('Bei einem Ja/Nein-Ergebnis rechnet Statable nur mit zufälligem Achsenabschnitt.', 'With a yes/no outcome Statable uses a random intercept only.')}</p>{:else if !moegliche.length}<p class="hilfe">{L('Dafür braucht das Modell eine Erklärungsspalte (eine Zahl oder eine Spalte mit zwei Werten).', 'For this the model needs an explanatory column (a number or a column with two values).')}</p>{/if}</div>

  <fieldset class="korr-wahl" style="border:0;padding:0;margin:var(--a3) 0">
    <legend class="heft-text"><b>{L('Zentrieren der Zahlen', 'Centring the numbers')}</b></legend>
    <div class="segment">{#each [['keine', L('Nicht zentrieren', 'No centring'), undefined], ['gesamt', L('Am Gesamtmittel', 'At the grand mean'), 'gesamtmittelwertzentrierung'], ['gruppe', L('Am Gruppenmittel', 'At the group mean'), 'gruppenmittelwertzentrierung']] as [w, tx, b]}<label data-begriff={b}><input type="radio" name="meb-zentrieren" value={w} checked={art === w} disabled={!zahlSpalten.length || (w === 'gruppe' && !!e.gruppe2)} onchange={() => { art = w as MebZentrierung; steigung = ''; wechsel = []; }}>{tx}</label>{/each}</div>
    <p class="hilfe">{art === 'gesamt' ? L('Vom Wert jeder gewählten Zahl wird das Mittel aller Fälle abgezogen: Die Konstante ist der Wert bei durchschnittlichem Merkmal.', 'The mean of all cases is subtracted from each chosen number: the intercept is the value at an average characteristic.') : art === 'gruppe' ? L('Jede gewählte Zahl wird in zwei Größen geteilt: die Abweichung vom Gruppenmittel (Effekt innerhalb der Gruppen) und das Gruppenmittel selbst (Effekt zwischen den Gruppen). Eine Spalte, die in jeder Gruppe gleich ist (zum Beispiel die Schulart), bleibt unverändert, denn sie hat keinen Unterschied innerhalb. Die Wirkung innerhalb und zwischen kann verschieden sein, das zeigt erst diese Teilung.', 'Each chosen number is split into two variables: the deviation from the group mean (within-group effect) and the group mean itself (between-group effect). A column that is the same in every group (for example the school type) stays unchanged, because it has no variation within. The effect within and between can differ; only this split shows it.') : L('Die Zahlen gehen so ins Modell, wie sie in den Daten stehen (die Konstante gilt dann bei 0).', 'The numbers enter the model as they are in the data (the intercept then holds at 0).')}</p>
    {#if e.gruppe2}<p class="hilfe">{L('Mit zwei Gruppierungen ist das Zentrieren am Gruppenmittel nicht möglich (es gibt dann zwei Gruppenmittel je Fall); am Gesamtmittel geht es.', 'With two groupings centring at the group mean is not possible (there would be two group means per case); centring at the grand mean works.')}</p>{/if}
    {#if art !== 'keine' && zahlSpalten.length > 1}<div class="segment" style="margin-top:var(--a2)">{#each zahlSpalten as n (n)}<label><input type="checkbox" checked={gewaehlteZentrierung.includes(n)} onchange={(ev) => { const jetzt = gewaehlteZentrierung.filter(x => x !== n); zentrierSpalten = ev.currentTarget.checked ? [...jetzt, n] : jetzt; steigung = ''; wechsel = []; }}>{name(n)}</label>{/each}</div>{/if}
  </fieldset>

  <fieldset class="korr-wahl" style="border:0;padding:0;margin:var(--a3) 0">
    <legend class="heft-text"><b>{L('Wechselwirkungen (Produkt aus zwei Größen)', 'Interactions (product of two variables)')}</b></legend>
    <p class="hilfe" data-begriff="interaktion">{L('Eine Wechselwirkung fragt, ob die Wirkung einer Größe von einer anderen abhängt. Mit Gruppenmittel-Zentrierung lässt sich auch eine Wechselwirkung über die Ebenen prüfen: ein Merkmal der Gruppe (zum Beispiel die Schulart) mal ein Merkmal innerhalb der Gruppe (die Abweichung vom Gruppenmittel). Das ist die Ebenen-übergreifende Wechselwirkung (Cross-Level-Interaktion). Gruppen mit mehr als zwei Stufen gehen nicht in ein Produkt.', 'An interaction asks whether the effect of one variable depends on another. With group mean centring a cross-level interaction can be tested too: a characteristic of the group (for example the school type) times a characteristic within the group (the deviation from the group mean). This is the cross-level interaction. Groups with more than two levels cannot enter a product.')}</p>
    {#if wechsel.length}<ul class="liste">{#each wechsel as [ta, tb], i (i)}<li>{teilText(ta)} × {teilText(tb)} <button type="button" class="k leise" onclick={() => { wechsel = wechsel.filter((_, j) => j !== i); melde(L('Wechselwirkung entfernt.', 'Interaction removed.')); }} aria-label={L(`Wechselwirkung ${teilText(ta)} mal ${teilText(tb)} entfernen`, `Remove interaction ${teilText(ta)} times ${teilText(tb)}`)}>{L('Entfernen', 'Remove')}</button></li>{/each}</ul>{/if}
    {#if operanden.length >= 2}
      <div class="eingabe" style="max-width:380px;margin:var(--a2) 0"><label for="meb-wa">{L('Erste Größe', 'First variable')}</label>
        <select id="meb-wa" bind:value={wa}><option value="">{L('wählen …', 'choose …')}</option>{#each operanden as p, i (p.name)}<option value={String(i)}>{praedName(p, name)}</option>{/each}</select></div>
      <div class="eingabe" style="max-width:380px;margin:var(--a2) 0"><label for="meb-wb">{L('Zweite Größe', 'Second variable')}</label>
        <select id="meb-wb" bind:value={wb}><option value="">{L('wählen …', 'choose …')}</option>{#each operanden as p, i (p.name)}<option value={String(i)}>{praedName(p, name)}</option>{/each}</select></div>
      <button type="button" class="k leise" onclick={hinzu} disabled={wa === '' || wb === '' || wa === wb}>{L('Wechselwirkung hinzufügen', 'Add interaction')}</button>
    {:else}<p class="hilfe">{L('Dafür braucht das Modell mindestens zwei Erklärungsspalten (Zahlen oder Spalten mit zwei Werten).', 'For this the model needs at least two explanatory columns (numbers or columns with two values).')}</p>{/if}
  </fieldset>
  {#if fehler}<p id="meb-zusatz-fehler" class="heft-text" role="alert" tabindex="-1" style="color:var(--fehler, #b3261e)">{fehler}</p>{/if}
  <RStart knopf={L('Neu rechnen mit diesen Einstellungen', 'Recalculate with these settings')} los={() => rechnen()} {laeuft} haupt={geaendert} pakete={R_PAKETE_MEB} bind:fehlt />
  {#if e.meldungen.length}<p class="heft-text" style="color:var(--tinte-2)">{L('Meldungen von R', 'Messages from R')}: {e.meldungen.slice(0, 3).join(' · ')}</p>{/if}
  <pre class="befehl">{mebRCode(e, L)}</pre>
</details>
