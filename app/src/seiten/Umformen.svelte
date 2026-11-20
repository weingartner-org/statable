<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { tick, untrack } from 'svelte';
  import { s, d, L, Lp, aendereDaten, oeffneNeueDaten, melde, meldeFehler, wenigBewegung } from '../lib/sitzung.svelte';
  import { breitZuLang, langZuBreit, leiteBeschriftungenAb, schlageGruppenVor, schlageLangVor, umgebauteProjekte, type Hinweis, type Umgebaut } from '../lib/umformen';
  import { zahlDe } from '../lib/format';
  import { zeitpunkteZuIntervallen, ereignisWerte, istNullEins } from '../lib/umformenintervalle';   // Später S-F: Zeitpunkte je Person → Intervalle
  import { umformSatz, unsterblichkeitSatz, regelSatz } from '../lib/coxzeitsaetze';
  import type { ZpRegel } from '../lib/coxzeit';
  import { kennung as istKennung } from '../lib/verfahren';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import HilfeLink from '../bausteine/HilfeLink.svelte';
  import Icon from '../bausteine/Icon.svelte';

  /* ---------- Ausgangslage ---------- */
  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  const gruppen = $derived(schlageGruppenVor(s.spalten));
  const langVorschlag = $derived(schlageLangVor(daten));

  type Ziel = 'lang' | 'breit' | 'intervalle';       // was entstehen soll
  let schritt = $state(1);
  let ziel = $state<Ziel>(untrack(() => (schlageGruppenVor(s.spalten).length === 0 && schlageLangVor({ spalten: s.spalten, zeilen: s.zeilen }) ? 'breit' : 'lang')));
  const namen = $derived(s.spalten.map(x => x.name));
  const sp = (n: string) => s.spalten.find(x => x.name === n);

  /* ---------- breit → lang ---------- */
  let gewaehlt = $state<string[]>(untrack(() => schlageGruppenVor(s.spalten)[0]?.spalten ?? []));
  const sortiert = $derived(namen.filter(n => gewaehlt.includes(n)));
  const auto = $derived(leiteBeschriftungenAb(sortiert));
  let eigeneLabels = $state<Record<string, string>>({});
  const label = (n: string) => eigeneLabels[n] ?? auto.labels[sortiert.indexOf(n)] ?? n;
  /** Ein gemeinsamer Namensstamm taugt als Name des Messwerts, wenn er ein Wort ist (wissen), nicht nur ein Buchstabe (t). */
  const gutStamm = (x?: string) => ((x ?? '').trim().length >= 3 ? x!.trim() : '');
  let wertEigen = $state<string | null>(null);
  const gruppeZurAuswahl = $derived(gruppen.find(g => g.spalten.length === sortiert.length && g.spalten.every((n, i) => n === sortiert[i])));
  const wertName = $derived(wertEigen ?? (gutStamm(gruppeZurAuswahl?.stamm) || gutStamm(auto.stamm) || L('wert', 'value')));
  let zeitName = $state(L('zeit', 'time'));
  let zeitAls = $state<'nummer' | 'text'>('nummer');
  /** Gibt es schon eine Kennungsspalte (id, nr, …) mit lauter verschiedenen Werten, ist sie vorbelegt; sonst '' = neue Spalte mit Zeilennummern. */
  let kennungWahl = $state(untrack(() => {
    const k = s.spalten.find((sp, j) => istKennung(sp) && !(schlageGruppenVor(s.spalten)[0]?.spalten ?? []).includes(sp.name) && new Set(s.zeilen.map(z => z[j])).size === s.zeilen.length && s.zeilen.every(z => z[j] !== null && z[j] !== undefined && z[j] !== ''));
    return k?.name ?? '';
  }));
  let kennungName = $state(L('person', 'person'));
  const kennung = $derived(kennungWahl && !gewaehlt.includes(kennungWahl) && namen.includes(kennungWahl) ? kennungWahl : '');

  function waehleGruppe(g: { spalten: string[] }) { gewaehlt = [...g.spalten]; eigeneLabels = {}; wertEigen = null; }
  function schalte(n: string, an: boolean) { gewaehlt = an ? [...gewaehlt, n] : gewaehlt.filter(x => x !== n); eigeneLabels = {}; wertEigen = null; }

  /* ---------- lang → breit ---------- */
  const vorschlagLang = untrack(() => schlageLangVor({ spalten: s.spalten, zeilen: s.zeilen }));
  let lKennung = $state(vorschlagLang?.kennung ?? '');
  let lZeit = $state(vorschlagLang?.zeit ?? '');
  let lWerte = $state<string[]>(vorschlagLang?.werte ?? []);
  let lNamen = $state<'namen' | 'nummern'>('namen');
  const lWerteOk = $derived(lWerte.filter(n => n !== lKennung && n !== lZeit && namen.includes(n)));

  /* ---------- Zeitpunkte je Person → Intervalle (Später S-F, Form A) ---------- */
  let iKennung = $state(untrack(() => s.spalten.find(c => istKennung(c))?.name ?? ''));   // '' = Zeilennummer
  let iEnde = $state(''), iEreignis = $state(''), iWechsel = $state('');
  let iFest = $state<string[]>([]);
  let iWertName = $state(L('wechsel', 'switch'));
  let iRegel = $state<ZpRegel>('streng');
  let iEreignisIdx = $state<number | null>(null);
  const iWerte = $derived(iEreignis ? ereignisWerte(daten, iEreignis) : []);
  const iNullEins = $derived(istNullEins(iWerte));
  const iIdx = $derived(Math.min(iEreignisIdx ?? Math.max(0, iWerte.length - 1), Math.max(0, iWerte.length - 1)));
  $effect(() => { iEreignis; untrack(() => (iEreignisIdx = null)); });
  const iFestOk = $derived(iFest.filter(n => namen.includes(n)));

  /* ---------- Prüfen und rechnen ---------- */
  const problem = $derived.by((): string => {
    if (ziel === 'lang') {
      if (gewaehlt.length < 2) return d('Wähle mindestens zwei Spalten, die dasselbe zu verschiedenen Zeitpunkten messen.', 'Wählen Sie mindestens zwei Spalten, die dasselbe zu verschiedenen Zeitpunkten messen.', 'Choose at least two columns that measure the same thing at different times.');
      if (!wertName.trim() || !zeitName.trim()) return L('Die neuen Spalten brauchen einen Namen.', 'The new columns need a name.');
      if (!kennung && !kennungName.trim()) return L('Die neue Kennung braucht einen Namen.', 'The new ID column needs a name.');
      return '';
    }
    if (ziel === 'intervalle') {
      if (!iEnde || !iEreignis || !iWechsel) return d('Wähle die Spalte mit dem Ende der Beobachtung, die Spalte mit dem Ereignis und die Spalte mit dem Zeitpunkt des Wechsels.', 'Wählen Sie die Spalte mit dem Ende der Beobachtung, die Spalte mit dem Ereignis und die Spalte mit dem Zeitpunkt des Wechsels.', 'Choose the column with the end of observation, the column with the event and the column with the time of the switch.');
      const alle = [iKennung, iEnde, iEreignis, iWechsel, ...iFestOk].filter(Boolean);
      if (new Set(alle).size < alle.length) return L('Eine Spalte steht mehrfach. Kennung, Ende, Ereignis, Wechsel und die mitlaufenden Spalten müssen verschieden sein.', 'A column is used more than once. ID, end, event, switch and the carried-along columns must all be different.');
      if (sp(iEnde)?.art !== 'zahl' || sp(iWechsel)?.art !== 'zahl') return L('Das Ende und der Zeitpunkt des Wechsels müssen Zahlen sein.', 'The end and the time of the switch must be numbers.');
      if (!iWertName.trim()) return L('Die neue Spalte braucht einen Namen.', 'The new column needs a name.');
      if (!iWerte.length) return L('Die Spalte mit dem Ereignis hat keine Werte.', 'The column with the event has no values.');
      return '';
    }
    if (!lKennung || !lZeit || lKennung === lZeit) return d('Wähle die Kennung der Person und die Spalte mit dem Zeitpunkt - zwei verschiedene Spalten.', 'Wählen Sie die Kennung der Person und die Spalte mit dem Zeitpunkt - zwei verschiedene Spalten.', 'Choose the person ID and the time column - two different columns.');
    if (!lWerteOk.length) return d('Wähle mindestens eine Spalte mit dem Messwert.', 'Wählen Sie mindestens eine Spalte mit dem Messwert.', 'Choose at least one column with the measured value.');
    return '';
  });
  let ergebnis = $state<Umgebaut | null>(null);
  let rechenFehler = $state(false);
  $effect(() => {
    if (schritt !== 3 || problem) { ergebnis = null; return; }
    try {
      rechenFehler = false;
      ergebnis = ziel === 'lang'
        ? breitZuLang(daten, { messspalten: sortiert, zeitLabels: sortiert.map(label), kennung: kennung || null, kennungName, zeitName, wertName, zeitAls })
        : ziel === 'intervalle'
          ? zeitpunkteZuIntervallen(daten, { kennung: iKennung || null, ende: iEnde, ereignis: iEreignis, ereignisWert: iNullEins ? null : iWerte[iIdx] ?? null, wechsel: iWechsel, fest: iFestOk, wertName: iWertName, regel: iRegel })
          : langZuBreit(daten, { kennung: lKennung, zeit: lZeit, werte: lWerteOk, zeitNamen: lNamen });
    } catch { ergebnis = null; rechenFehler = true; }
  });

  /* ---------- Schritte und Fokus ---------- */
  async function zu(n: number) { schritt = n; bestaetigen = false; await tick(); document.getElementById('um-schritt')?.focus(); scrollTo({ top: 0, behavior: wenigBewegung() ? 'auto' : 'smooth' }); }
  function weiter() { if (schritt === 2 && problem) { melde(problem); return; } zu(schritt + 1); }
  function wahlZiel(z: Ziel) { ziel = z; }

  /* ---------- Abschluss ---------- */
  let projektName = $state('');
  $effect(() => { if (schritt === 3) projektName = untrack(() => `${umgebauteProjekte.get(s.projekt?.name ?? '') ?? s.projekt?.name ?? ''} (${ziel === 'lang' ? L('lang', 'long') : ziel === 'intervalle' ? L('Intervalle', 'intervals') : L('breit', 'wide')})`); });
  let arbeitet = $state(false);
  let bestaetigen = $state(false);

  async function alsNeues() {
    if (!ergebnis || arbeitet) return;
    arbeitet = true;
    try {
      const basisName = umgebauteProjekte.get(s.projekt?.name ?? '') ?? s.projekt?.name ?? '';
      await oeffneNeueDaten(projektName, L(`umstrukturiert aus „${s.projekt?.name}“`, `reshaped from "${s.projekt?.name}"`), ergebnis.spalten, ergebnis.zeilen, 'umformen');
      umgebauteProjekte.set(s.projekt?.name ?? projektName.trim(), basisName);
      melde(d('Neues Projekt geöffnet. Die Daten stehen jetzt so, wie du sie eingestellt hast.', 'Neues Projekt geöffnet. Die Daten stehen jetzt so, wie Sie sie eingestellt haben.', 'New project opened. The data now look the way you set them up.'));
      location.hash = 'daten';
    } catch { meldeFehler(L('Das ließ sich nicht öffnen. Das bisherige Projekt ist unverändert.', "That couldn't be opened. Your current project is unchanged.")); }
    finally { arbeitet = false; }
  }
  async function ersetzen() {
    if (!ergebnis || arbeitet) return;
    arbeitet = true;
    try {
      const text = ziel === 'lang' ? L('Daten umstrukturiert (breit → lang)', 'Data reshaped (wide → long)') : ziel === 'intervalle' ? L('Daten umstrukturiert (Zeitpunkte je Person → Intervalle)', 'Data reshaped (time points per person → intervals)') : L('Daten umstrukturiert (lang → breit)', 'Data reshaped (long → wide)');
      if (await aendereDaten(text, ergebnis.spalten, ergebnis.zeilen, false, { art: 'umformen' })) location.hash = 'daten';
    } finally { arbeitet = false; bestaetigen = false; }
  }
  async function frageErsetzen() { bestaetigen = true; await tick(); document.getElementById('um-nein')?.focus(); }

  /* ---------- Anzeige ---------- */
  const zeigeWert = (c: Spalte, v: Wert) => {
    if (v === null || v === '') return '-';
    if (typeof v === 'number') { const l = c.werteLabels[String(v)]; return l ? `${zahlDe(v)} ${l}` : zahlDe(v); }
    return v;
  };
  const zeilenText = (n: number) => Lp(n, `${n} Zeile`, `${n} Zeilen`, `${n} row`, `${n} rows`);
  const spaltenText = (n: number) => Lp(n, `${n} Spalte`, `${n} Spalten`, `${n} column`, `${n} columns`);
  function hinweisText(h: Hinweis): string {
    switch (h.art) {
      case 'doppelt': return Lp(h.anzahl, `${h.anzahl} Zeile hat dieselbe Person und denselben Zeitpunkt wie eine frühere Zeile. Es zählt jeweils die erste.`, `${h.anzahl} Zeilen haben dieselbe Person und denselben Zeitpunkt wie eine frühere Zeile. Es zählt jeweils die erste.`, `${h.anzahl} row repeats a person and time point seen earlier. The first one counts.`, `${h.anzahl} rows repeat a person and time point seen earlier. The first one counts.`);
      case 'variiert': return d(`Diese Spalten ändern sich innerhalb einer Person und fallen weg: ${h.spalten.join(', ')}. Wähle sie als Messwert, wenn sie je Zeitpunkt eine Spalte werden sollen.`, `Diese Spalten ändern sich innerhalb einer Person und fallen weg: ${h.spalten.join(', ')}. Wählen Sie sie als Messwert, wenn sie je Zeitpunkt eine Spalte werden sollen.`, `These columns change within a person and are dropped: ${h.spalten.join(', ')}. Choose them as measured values if each time point should get its own column.`);
      case 'ohneKennung': return Lp(h.anzahl, `${h.anzahl} Zeile ohne Kennung fällt weg.`, `${h.anzahl} Zeilen ohne Kennung fallen weg.`, `${h.anzahl} row without an ID is dropped.`, `${h.anzahl} rows without an ID are dropped.`);
      case 'ohneZeit': return Lp(h.anzahl, `${h.anzahl} Zeile ohne Zeitpunkt fällt weg.`, `${h.anzahl} Zeilen ohne Zeitpunkt fallen weg.`, `${h.anzahl} row without a time point is dropped.`, `${h.anzahl} rows without a time point are dropped.`);
      case 'gemischt': return L('Die gewählten Spalten sind teils Zahlen, teils Text. Der Messwert wird als Text angelegt.', 'The chosen columns are partly numbers, partly text. The value is created as text.');
      case 'fehlendAngeglichen': return L('Die Spalten haben verschiedene Codes für „keine Angabe“. Diese Werte sind im Ergebnis leer.', 'The columns use different codes for "no answer". Those values are blank in the result.');
      case 'labelsVerschieden': return L('Die Wertelabels der Spalten unterscheiden sich. Der Messwert bekommt keine.', 'The value labels of the columns differ. The value gets none.');
      case 'intervalle': return umformSatz(h.hinweise, h.vorzug);
      case 'unsterblich': return unsterblichkeitSatz();
    }
  }
  const SCHRITTE = $derived([L('Richtung', 'Direction'), L('Spalten zuordnen', 'Assign columns'), L('Vorschau', 'Preview')]);
  const vorher = $derived(daten.zeilen.slice(0, 5));
  const nachher = $derived(ergebnis?.zeilen.slice(0, 5) ?? []);
</script>

<div class="tisch ohne-rand"><section class="blatt rund umf" aria-labelledby="um-t">
  <SeitenKopf titelId="um-t" titel={L('Daten umstrukturieren', 'Reshape data')} hilfe={{ id: 'umstrukturieren', text: L('Hilfe zum Umstrukturieren', 'Help on reshaping') }} zurueck="daten" >
    {#snippet untertitel()}<p>{d('Breit: eine Zeile je Person, eine Spalte je Zeitpunkt. Lang: eine Zeile je Person und Zeitpunkt. Für Messwiederholung und Daten aus Lernplattformen oder Experimenten brauchst du oft die andere Form.', 'Breit: eine Zeile je Person, eine Spalte je Zeitpunkt. Lang: eine Zeile je Person und Zeitpunkt. Für Messwiederholung und Daten aus Lernplattformen oder Experimenten brauchen Sie oft die andere Form.', 'Wide: one row per person, one column per time point. Long: one row per person and time point. Repeated measures and data from learning platforms or experiments often need the other form.')}</p>{/snippet}
  </SeitenKopf>

  <ol class="umf-schritte" aria-label={L('Schritte', 'Steps')}>
    {#each SCHRITTE as t, i}<li aria-current={schritt === i + 1 ? 'step' : undefined} class:fertig={schritt > i + 1}><span class="nr" aria-hidden="true">{schritt > i + 1 ? '✓' : i + 1}</span>{t}</li>{/each}
  </ol>

  {#if schritt === 1}
    <h2 id="um-schritt" tabindex="-1">{L('1  Was soll entstehen?', '1  What should result?')}</h2>
    <div class="umf-wahl" role="radiogroup" aria-label={L('Richtung', 'Direction')}>
      <label data-begriff="langformat" class:an={ziel === 'lang'}><input type="radio" name="um-ziel" value="lang" checked={ziel === 'lang'} onchange={() => wahlZiel('lang')}>
        <span><b>{L('Breit → lang', 'Wide → long')}</b><small>{L('Die Spalten für jeden Zeitpunkt werden zu Zeilen. Beispiel: wissen_t1, wissen_t2 → eine Spalte „wissen“ und eine Spalte „zeit“.', 'The columns for each time point become rows. Example: score_t1, score_t2 → one column "score" and one column "time".')}</small>
          <svg class="skizze" viewBox="0 0 260 82" aria-hidden="true" focusable="false">
            <g class="aus"><rect x="4" y="6" width="96" height="70" rx="4"/><path d="M4 22h96M36 6v70M68 6v70"/><path class="dick" d="M10 14h20M42 14h20M74 14h20"/><path d="M10 31h14M42 31h14M74 31h14M10 44h14M42 44h14M74 44h14M10 57h14M42 57h14M74 57h14"/></g>
            <path class="pfeil" d="M112 41h32M136 33l8 8-8 8"/>
            <g class="aus"><rect x="156" y="6" width="96" height="70" rx="4"/><path d="M156 22h96M188 6v70M220 6v70"/><path class="dick" d="M162 14h20M194 14h20M226 14h20"/><path d="M162 28h14M194 28h14M226 28h14M162 38h14M194 38h14M226 38h14M162 48h14M194 48h14M226 48h14M162 58h14M194 58h14M226 58h14M162 68h14M194 68h14M226 68h14"/></g>
          </svg></span></label>
      <label data-begriff="breitformat" class:an={ziel === 'breit'}><input type="radio" name="um-ziel" value="breit" checked={ziel === 'breit'} onchange={() => wahlZiel('breit')}>
        <span><b>{L('Lang → breit', 'Long → wide')}</b><small>{L('Die Zeilen je Zeitpunkt werden zu Spalten. Beispiel: eine Spalte „wissen“ mit „zeit“ → wissen_1, wissen_2.', 'The rows for each time point become columns. Example: one column "score" with "time" → score_1, score_2.')}</small>
          <svg class="skizze" viewBox="0 0 260 82" aria-hidden="true" focusable="false">
            <g class="aus"><rect x="4" y="6" width="96" height="70" rx="4"/><path d="M4 22h96M36 6v70M68 6v70"/><path class="dick" d="M10 14h20M42 14h20M74 14h20"/><path d="M10 28h14M42 28h14M74 28h14M10 38h14M42 38h14M74 38h14M10 48h14M42 48h14M74 48h14M10 58h14M42 58h14M74 58h14M10 68h14M42 68h14M74 68h14"/></g>
            <path class="pfeil" d="M112 41h32M136 33l8 8-8 8"/>
            <g class="aus"><rect x="156" y="6" width="96" height="70" rx="4"/><path d="M156 22h96M188 6v70M220 6v70"/><path class="dick" d="M162 14h20M194 14h20M226 14h20"/><path d="M162 31h14M194 31h14M226 31h14M162 44h14M194 44h14M226 44h14M162 57h14M194 57h14M226 57h14"/></g>
          </svg></span></label>
      <label class:an={ziel === 'intervalle'}><input type="radio" name="um-ziel" value="intervalle" checked={ziel === 'intervalle'} onchange={() => wahlZiel('intervalle')}>
        <span><b>{L('Zeitpunkte je Person → Intervalle', 'Time points per person → intervals')}</b><small>{L('Für die Cox-Regression mit einer Angabe, die sich im Lauf der Zeit ändert (zum Beispiel eine Transplantation). Aus einer Zeile je Person (Ende, Ereignis, Zeitpunkt des Wechsels) werden Zeilen je Abschnitt: Start, Ende, Ereignis und der Wert, der im Abschnitt galt.', 'For the Cox regression with a characteristic that changes over time (for example a transplant). A row per person (end, event, time of the switch) becomes rows per interval: start, end, event and the value that applied in the interval.')}</small></span></label>
    </div>
    <p class="umf-info" use:ergebnisAnsage>
      {#if ziel === 'intervalle'}<Icon n="info" />{d('Dafür braucht es je Person das Ende der Beobachtung, das Ereignis (ja/nein) und den Zeitpunkt des Wechsels (leer, wenn nie). Im nächsten Schritt wählst du die Spalten. Das Fallgewicht nimmt die neue Tabelle nicht mit.', 'Dafür braucht es je Person das Ende der Beobachtung, das Ereignis (ja/nein) und den Zeitpunkt des Wechsels (leer, wenn nie). Im nächsten Schritt wählen Sie die Spalten. Das Fallgewicht nimmt die neue Tabelle nicht mit.', 'This needs, for each person, the end of observation, the event (yes/no) and the time of the switch (empty if never). You choose the columns in the next step. The new table does not take the case weight along.')}
      {:else if ziel === 'lang' && gruppen.length}<Icon n="info" />{L('Statable hat Spalten gefunden, die zusammengehören: ', 'Statable found columns that belong together: ')}{gruppen.slice(0, 3).map(g => g.spalten.join(', ')).join(' · ')}.
      {:else if ziel === 'lang'}<Icon n="info" />{d('Statable hat keine Spalten mit gemeinsamem Stamm gefunden (wie t1_wissen, t2_wissen). Im nächsten Schritt wählst du sie selbst.', 'Statable hat keine Spalten mit gemeinsamem Stamm gefunden (wie t1_wissen, t2_wissen). Im nächsten Schritt wählen Sie sie selbst.', 'Statable found no columns with a common stem (like t1_score, t2_score). You choose them yourself in the next step.')}
      {:else if langVorschlag}<Icon n="info" />{L(`Die Daten sehen schon lang aus: Kennung „${langVorschlag.kennung}“, Zeitpunkt „${langVorschlag.zeit}“, Messwert ${langVorschlag.werte.map(w => `„${w}“`).join(', ')}.`, `The data already look long: ID "${langVorschlag.kennung}", time "${langVorschlag.zeit}", value ${langVorschlag.werte.map(w => `"${w}"`).join(', ')}.`)}
      {:else}<Icon n="info" />{d('Dafür braucht es eine Spalte mit der Kennung der Person und eine mit dem Zeitpunkt. Im nächsten Schritt wählst du sie.', 'Dafür braucht es eine Spalte mit der Kennung der Person und eine mit dem Zeitpunkt. Im nächsten Schritt wählen Sie sie.', 'This needs a column with the person ID and one with the time point. You choose them in the next step.')}{/if}
    </p>
    <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => zu(2)}>{L('Weiter', 'Next')}</button><a class="k leise" href="#daten">{L('Abbrechen', 'Cancel')}</a></div>

  {:else if schritt === 2 && ziel === 'lang'}
    <h2 id="um-schritt" tabindex="-1">{L('2  Welche Spalten sind derselbe Wert zu verschiedenen Zeitpunkten?', '2  Which columns are the same value at different times?')}</h2>
    {#if gruppen.length}
      <div class="umf-vorschlag"><span class="lbl" id="um-vs">{L('Vorschläge', 'Suggestions')}</span>
        <div role="group" aria-labelledby="um-vs" class="umf-chips">{#each gruppen.slice(0, 6) as g}
          <button class="k klein" type="button" aria-pressed={gruppeZurAuswahl === g} onclick={() => waehleGruppe(g)}>{g.spalten.join(', ')}</button>{/each}</div></div>
    {/if}
    <fieldset class="umf-gruppe"><legend>{L('Spalten, die zu Zeilen werden', 'Columns that become rows')}</legend>
      <p class="umf-hilfe" id="um-sp-h">{L('Die Reihenfolge ist die der Datentabelle. Je Spalte steht rechts die Beschriftung des Zeitpunkts.', 'The order is that of the data table. The label of the time point is on the right of each column.')}</p>
      <ul class="umf-liste" aria-describedby="um-sp-h">{#each s.spalten as c, i (c.name)}
        <li class:an={gewaehlt.includes(c.name)}><label class="umf-spalte"><input type="checkbox" checked={gewaehlt.includes(c.name)} onchange={(e) => schalte(c.name, e.currentTarget.checked)}><span><b>{c.name}</b>{#if c.bezeichnung}<small>{c.bezeichnung}</small>{/if}</span></label>
          {#if gewaehlt.includes(c.name)}<input class="umf-label" type="text" autocomplete="off" aria-label={L(`Beschriftung des Zeitpunkts für ${c.name}`, `Time label for ${c.name}`)} value={label(c.name)} oninput={(e) => (eigeneLabels[c.name] = e.currentTarget.value)}>{/if}</li>
      {/each}</ul>
    </fieldset>
    <fieldset class="umf-gruppe"><legend>{L('Neue Spalten', 'New columns')}</legend>
      <div class="umf-felder">
        <div class="eingabe"><label for="um-wert">{L('Messwert', 'Value')}</label><input id="um-wert" type="text" autocomplete="off" value={wertName} oninput={(e) => (wertEigen = e.currentTarget.value)}><span class="hilfe">{L('Name der Spalte mit den Zahlen', 'Name of the column holding the numbers')}</span></div>
        <div class="eingabe"><label for="um-zeit">{L('Zeitpunkt oder Bedingung', 'Time point or condition')}</label><input id="um-zeit" type="text" autocomplete="off" bind:value={zeitName}><span class="hilfe">{L('Name der Spalte mit der Beschriftung', 'Name of the column holding the label')}</span></div>
      </div>
      <div class="eingabe"><span class="lbl" id="um-za">{L('Zeitpunkt steht als', 'Time point is stored as')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="um-za">
          <label><input type="radio" name="um-za" value="nummer" bind:group={zeitAls}>{L('Nummer 1 … k mit Beschriftung', 'Number 1 … k with label')}</label>
          <label><input type="radio" name="um-za" value="text" bind:group={zeitAls}>{L('Text (die Beschriftung)', 'Text (the label)')}</label></div></div>
      <div class="umf-felder">
        <div class="eingabe"><label for="um-k">{L('Person erkennen an', 'Identify the person by')}</label>
          <select id="um-k" bind:value={kennungWahl}><option value="">{L('Neue Spalte mit der Zeilennummer', 'New column with the row number')}</option>
            {#each s.spalten.filter(c => !gewaehlt.includes(c.name)) as c}<option value={c.name}>{c.name}{c.bezeichnung ? ` - ${c.bezeichnung}` : ''}</option>{/each}</select></div>
        {#if !kennung}<div class="eingabe"><label for="um-kn">{L('Name der neuen Kennung', 'Name of the new ID')}</label><input id="um-kn" type="text" autocomplete="off" bind:value={kennungName}></div>{/if}
      </div>
    </fieldset>
    {#if problem}<p class="umf-problem" use:ergebnisAnsage>{problem}</p>{/if}
    <div class="knopfzeile"><button class="k haupt" type="button" aria-disabled={problem ? 'true' : undefined} onclick={weiter}>{L('Weiter zur Vorschau', 'Next: preview')}</button><button class="k" type="button" onclick={() => zu(1)}>{L('Vorheriger Schritt', 'Previous step')}</button></div>

  {:else if schritt === 2 && ziel === 'intervalle'}
    <h2 id="um-schritt" tabindex="-1">{L('2  Welche Spalten sagen, wer, wie lange und wann der Wechsel war?', '2  Which columns say who, how long and when the switch was?')}</h2>
    <fieldset class="umf-gruppe"><legend>{L('Person, Ende und Ereignis', 'Person, end and event')}</legend>
      <div class="umf-felder">
        <div class="eingabe"><label for="um-ik">{L('Kennung der Person', 'Person ID')}</label>
          <select id="um-ik" bind:value={iKennung}><option value="">{L('Neue Spalte mit der Zeilennummer', 'New column with the row number')}</option>{#each s.spalten.filter(c => ![iEnde, iEreignis, iWechsel, ...iFestOk].includes(c.name)) as c}<option value={c.name}>{c.name}{c.bezeichnung ? ` - ${c.bezeichnung}` : ''}</option>{/each}</select></div>
        <div class="eingabe"><label for="um-ie">{L('Ende der Beobachtung (Zeit)', 'End of observation (time)')}</label>
          <select id="um-ie" bind:value={iEnde}><option value="" disabled>{L('Spalte wählen', 'Choose a column')}</option>{#each s.spalten.filter(c => c.art === 'zahl' && ![iKennung, iEreignis, iWechsel, ...iFestOk].includes(c.name)) as c}<option value={c.name}>{c.name}{c.bezeichnung ? ` - ${c.bezeichnung}` : ''}</option>{/each}</select>
          <span class="hilfe">{L('Die Zeit bis zum Ereignis oder bis zum Ende der Beobachtung. Sie muss größer als 0 sein.', 'The time to the event or to the end of observation. It must be greater than 0.')}</span></div>
        <div class="eingabe"><label for="um-ie2">{L('Ereignis eingetreten?', 'Did the event occur?')}</label>
          <select id="um-ie2" bind:value={iEreignis}><option value="" disabled>{L('Spalte wählen', 'Choose a column')}</option>{#each s.spalten.filter(c => ![iKennung, iEnde, iWechsel, ...iFestOk].includes(c.name)) as c}<option value={c.name}>{c.name}{c.bezeichnung ? ` - ${c.bezeichnung}` : ''}</option>{/each}</select></div>
      </div>
      {#if iEreignis && iWerte.length && !iNullEins}
        <div class="eingabe"><span class="lbl" id="um-iw">{L('Welcher Wert ist das Ereignis?', 'Which value is the event?')}</span>
          <div class="segment" role="radiogroup" aria-labelledby="um-iw">{#each iWerte.slice(0, 12) as w, k}<label><input type="radio" name="um-iw" checked={iIdx === k} onchange={() => (iEreignisIdx = k)}>{sp(iEreignis)?.werteLabels[String(w)] ? `${w} ${sp(iEreignis)?.werteLabels[String(w)]}` : String(w)}</label>{/each}</div>
          <span class="hilfe">{L('Alle anderen Werte gelten als zensiert: Die Beobachtung endete, ohne dass das Ereignis eingetreten ist.', 'All other values count as censored: the observation ended without the event.')}</span></div>
      {/if}
    </fieldset>
    <fieldset class="umf-gruppe"><legend>{L('Der Wechsel', 'The switch')}</legend>
      <div class="umf-felder">
        <div class="eingabe"><label for="um-iwe">{L('Zeitpunkt des Wechsels', 'Time of the switch')}</label>
          <select id="um-iwe" bind:value={iWechsel}><option value="" disabled>{L('Spalte wählen', 'Choose a column')}</option>{#each s.spalten.filter(c => c.art === 'zahl' && ![iKennung, iEnde, iEreignis, ...iFestOk].includes(c.name)) as c}<option value={c.name}>{c.name}{c.bezeichnung ? ` - ${c.bezeichnung}` : ''}</option>{/each}</select>
          <span class="hilfe">{L('Die Zeit, zu der die Angabe wechselt (zum Beispiel die Zeit bis zur Transplantation). Leer heißt: nie.', 'The time at which the characteristic switches (for example the time to the transplant). Empty means: never.')}</span></div>
        <div class="eingabe"><label for="um-iwn">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="um-iwn" type="text" autocomplete="off" bind:value={iWertName}><span class="hilfe">{L('0 vor dem Wechsel, 1 ab dem Wechsel', '0 before the switch, 1 from the switch on')}</span></div>
      </div>
      <div class="eingabe"><span class="lbl" id="um-ir">{L('Wechsel am Tag des Ereignisses', 'Switch on the day of the event')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="um-ir">
          <label><input type="radio" name="um-ir" value="streng" bind:group={iRegel}>{L('Zählt nicht (streng, Voreinstellung)', 'Does not count (strict, default)')}</label>
          <label><input type="radio" name="um-ir" value="zaehlt" bind:group={iRegel}>{L('Zählt schon (wie die survival-Vignette)', 'Counts already (as the survival vignette)')}</label></div>
        <span class="hilfe">{regelSatz()}</span></div>
    </fieldset>
    <fieldset class="umf-gruppe"><legend>{L('Spalten, die mitlaufen', 'Columns carried along')}</legend>
      <p class="umf-hilfe" id="um-if-h">{L('Alter, Geschlecht und andere Angaben der Person: Sie stehen danach in jeder Zeile der Person.', 'Age, sex and other characteristics of the person: they appear in every row of the person afterwards.')}</p>
      <ul class="umf-liste" aria-describedby="um-if-h">{#each s.spalten.filter(c => ![iKennung, iEnde, iEreignis, iWechsel].includes(c.name)) as c (c.name)}
        <li class:an={iFest.includes(c.name)}><label class="umf-spalte"><input type="checkbox" checked={iFest.includes(c.name)} onchange={(e) => (iFest = e.currentTarget.checked ? [...iFest, c.name] : iFest.filter(x => x !== c.name))}><span><b>{c.name}</b>{#if c.bezeichnung}<small>{c.bezeichnung}</small>{/if}</span></label></li>
      {/each}</ul>
    </fieldset>
    {#if problem}<p class="umf-problem" use:ergebnisAnsage>{problem}</p>{/if}
    <p class="umf-hilfe"><HilfeLink id="cox-zeitabhaengig" text={L('Hilfe: Cox-Regression mit zeitabhängiger Größe', 'Help: Cox regression with a time-dependent covariate')} /></p>
    <div class="knopfzeile"><button class="k haupt" type="button" aria-disabled={problem ? 'true' : undefined} onclick={weiter}>{L('Weiter zur Vorschau', 'Next: preview')}</button><button class="k" type="button" onclick={() => zu(1)}>{L('Vorheriger Schritt', 'Previous step')}</button></div>

  {:else if schritt === 2}
    <h2 id="um-schritt" tabindex="-1">{L('2  Welche Spalten sagen, wer und wann?', '2  Which columns say who and when?')}</h2>
    <fieldset class="umf-gruppe"><legend>{L('Person und Zeitpunkt', 'Person and time')}</legend>
      <div class="umf-felder">
        <div class="eingabe"><label for="um-lk">{L('Kennung der Person', 'Person ID')}</label>
          <select id="um-lk" bind:value={lKennung}><option value="" disabled>{L('Spalte wählen', 'Choose a column')}</option>{#each s.spalten as c}<option value={c.name}>{c.name}{c.bezeichnung ? ` - ${c.bezeichnung}` : ''}</option>{/each}</select>
          <span class="hilfe">{L('Dieselbe Kennung in allen Zeilen einer Person', 'The same ID in all rows of one person')}</span></div>
        <div class="eingabe"><label for="um-lz">{L('Zeitpunkt oder Bedingung', 'Time point or condition')}</label>
          <select id="um-lz" bind:value={lZeit}><option value="" disabled>{L('Spalte wählen', 'Choose a column')}</option>{#each s.spalten.filter(c => c.name !== lKennung) as c}<option value={c.name}>{c.name}{c.bezeichnung ? ` - ${c.bezeichnung}` : ''}</option>{/each}</select>
          <span class="hilfe">{L('Jeder Wert wird eine Spalte', 'Each value becomes a column')}</span></div>
      </div>
    </fieldset>
    <fieldset class="umf-gruppe"><legend>{L('Messwerte', 'Values')}</legend>
      <p class="umf-hilfe" id="um-w-h">{L('Je Messwert entsteht für jeden Zeitpunkt eine Spalte. Alle anderen Spalten (z. B. Gruppe, Geschlecht) laufen mit, solange sie sich innerhalb einer Person nicht ändern.', 'For each value, one column per time point is created. All other columns (e.g. group, gender) are carried along as long as they do not change within a person.')}</p>
      <ul class="umf-liste" aria-describedby="um-w-h">{#each s.spalten.filter(c => c.name !== lKennung && c.name !== lZeit) as c (c.name)}
        <li class:an={lWerte.includes(c.name)}><label class="umf-spalte"><input type="checkbox" checked={lWerte.includes(c.name)} onchange={(e) => (lWerte = e.currentTarget.checked ? [...lWerte, c.name] : lWerte.filter(x => x !== c.name))}><span><b>{c.name}</b>{#if c.bezeichnung}<small>{c.bezeichnung}</small>{/if}</span></label></li>
      {/each}</ul>
    </fieldset>
    <div class="eingabe"><span class="lbl" id="um-ln">{L('Die neuen Spalten heißen nach', 'The new columns are named after')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="um-ln">
        <label><input type="radio" name="um-ln" value="namen" bind:group={lNamen}>{L('Beschriftung des Zeitpunkts (wissen_vorher)', 'Time label (score_before)')}</label>
        <label><input type="radio" name="um-ln" value="nummern" bind:group={lNamen}>{L('Wert des Zeitpunkts (wissen_1)', 'Time value (score_1)')}</label></div></div>
    {#if problem}<p class="umf-problem" use:ergebnisAnsage>{problem}</p>{/if}
    <div class="knopfzeile"><button class="k haupt" type="button" aria-disabled={problem ? 'true' : undefined} onclick={weiter}>{L('Weiter zur Vorschau', 'Next: preview')}</button><button class="k" type="button" onclick={() => zu(1)}>{L('Vorheriger Schritt', 'Previous step')}</button></div>

  {:else}
    <h2 id="um-schritt" tabindex="-1">{L('3  So sehen die Daten danach aus', '3  How the data look afterwards')}</h2>
    {#if !ergebnis}
      <p class="umf-problem" role="status">{rechenFehler ? d('Mit dieser Auswahl lassen sich die Daten nicht umstrukturieren. Geh zurück und prüfe die Spalten.', 'Mit dieser Auswahl lassen sich die Daten nicht umstrukturieren. Gehen Sie zurück und prüfen Sie die Spalten.', "The data can't be reshaped with this selection. Go back and check the columns.") : problem}</p>
      <div class="knopfzeile"><button class="k" type="button" onclick={() => zu(2)}>{L('Vorheriger Schritt', 'Previous step')}</button></div>
    {:else}
      <div class="umf-vergleich">
        <section aria-labelledby="um-v-h"><h3 id="um-v-h">{L('Vorher', 'Before')} <span>{zeilenText(daten.zeilen.length)} · {spaltenText(daten.spalten.length)}</span></h3>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
          <div class="umf-tab" role="region" tabindex="0" aria-label={L('Vorher, die ersten 5 Zeilen', 'Before, the first 5 rows')}>
            <table><thead><tr>{#each daten.spalten as c}<th scope="col" class:zahl={c.art === 'zahl'}>{c.name}</th>{/each}</tr></thead>
              <tbody>{#each vorher as z}<tr>{#each daten.spalten as c, i}<td class:zahl={typeof z[i] === 'number'}>{zeigeWert(c, z[i] ?? null)}</td>{/each}</tr>{/each}</tbody></table></div></section>
        <Icon n="runter" k="umf-pfeil" />
        <section aria-labelledby="um-n-h"><h3 id="um-n-h">{L('Nachher', 'After')} <span>{zeilenText(ergebnis.zeilen.length)} · {spaltenText(ergebnis.spalten.length)}</span></h3>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
          <div class="umf-tab" role="region" tabindex="0" aria-label={L('Nachher, die ersten 5 Zeilen', 'After, the first 5 rows')}>
            <table><thead><tr>{#each ergebnis.spalten as c}<th scope="col" class:zahl={c.art === 'zahl'}>{c.name}</th>{/each}</tr></thead>
              <tbody>{#each nachher as z}<tr>{#each ergebnis.spalten as c, i}<td class:zahl={typeof z[i] === 'number'}>{zeigeWert(c, z[i] ?? null)}</td>{/each}</tr>{/each}</tbody></table></div></section>
      </div>
      {#if ergebnis.hinweise.length}
        <ul class="umf-hinweise" aria-label={L('Hinweise', 'Notes')}>{#each ergebnis.hinweise as h}<li><Icon n="hinweis" k="hw" />{hinweisText(h)}</li>{/each}</ul>
      {/if}

      {#if bestaetigen}
        <div class="umf-frage" role="group" aria-labelledby="um-fr-t">
          <h3 id="um-fr-t"><Icon n="hinweis" k="hw" />{d('Die Daten in diesem Projekt werden ersetzt', 'Die Daten in diesem Projekt werden ersetzt', 'The data in this project will be replaced')}</h3>
          <p>{d(`Die bisherigen ${daten.spalten.length} Spalten werden durch die ${ergebnis.spalten.length} neuen ersetzt.`, `Die bisherigen ${daten.spalten.length} Spalten werden durch die ${ergebnis.spalten.length} neuen ersetzt.`, `The current ${daten.spalten.length} columns are replaced by the ${ergebnis.spalten.length} new ones.`)}{#if s.blaetter.length} {Lp(s.blaetter.length, 'Das Blatt im Heft bezieht sich auf die bisherigen Spalten und lässt sich danach womöglich nicht mehr berechnen.', `Die ${s.blaetter.length} Blätter im Heft beziehen sich auf die bisherigen Spalten und lassen sich danach womöglich nicht mehr berechnen.`, 'The page in the notebook refers to the current columns and may no longer calculate.', `The ${s.blaetter.length} pages in the notebook refer to the current columns and may no longer calculate.`)}{/if} {d('„Rückgängig“ in der Kopfzeile stellt den Stand davor wieder her. Wenn du die alten Daten sicher behalten willst, öffne das Ergebnis als neues Projekt.', '„Rückgängig“ in der Kopfzeile stellt den Stand davor wieder her. Wenn Sie die alten Daten sicher behalten wollen, öffnen Sie das Ergebnis als neues Projekt.', '"Undo" in the header restores the previous state. To keep the old data safe, open the result as a new project instead.')}</p>
          <div class="knopfzeile"><button class="k haupt" type="button" disabled={arbeitet} onclick={ersetzen}>{L('Ersetzen', 'Replace')}</button><button class="k" id="um-nein" type="button" onclick={() => (bestaetigen = false)}>{L('Abbrechen', 'Cancel')}</button></div>
        </div>
      {:else}
        <div class="umf-abschluss">
          <div class="eingabe"><label for="um-name">{L('Name des neuen Projekts', 'Name of the new project')}</label><input id="um-name" type="text" autocomplete="off" bind:value={projektName}></div>
          <div class="knopfzeile">
            <button class="k haupt" type="button" disabled={arbeitet} onclick={alsNeues}><Icon n="umformen" />{L('Als neues Projekt öffnen', 'Open as a new project')}</button>
            <button class="k" type="button" disabled={arbeitet} aria-expanded="false" onclick={frageErsetzen}>{L('Hier ersetzen', 'Replace here')}</button>
            <button class="k leise" type="button" onclick={() => zu(2)}>{L('Vorheriger Schritt', 'Previous step')}</button>
          </div>
          <p class="umf-hilfe">{L('Das neue Projekt enthält nur diese Daten. Das bisherige Projekt bleibt in der Liste auf der Startseite erhalten.', 'The new project contains only these data. The current project stays in the list on the start page.')}</p>
        </div>
      {/if}
    {/if}
  {/if}
</section></div>

<style>
  .umf { padding-bottom: var(--a6); }
  .umf h2 { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin: var(--a4) 0 var(--a3); }
  .umf h2:focus-visible { outline: 2px solid var(--fokus); outline-offset: 4px; border-radius: 4px; }
  .umf-schritte { list-style: none; display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); padding: 0; margin: 0 0 var(--a2); color: var(--tinte-2); }
  .umf-schritte li { display: inline-flex; align-items: center; gap: var(--a2); }
  .umf-schritte li[aria-current='step'] { color: var(--tinte); font-weight: 600; }
  .umf-schritte .nr { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--linie-stark); font-size: var(--gr-klein); }
  .umf-schritte li[aria-current='step'] .nr { background: var(--akzent); border-color: var(--akzent); color: var(--tinte-auf-akzent); }
  .umf-schritte li.fertig .nr { border-color: var(--akzent); color: var(--akzent-tinte); }
  .umf-wahl { display: grid; grid-template-columns: 1fr 1fr; gap: var(--a3); }
  .umf-wahl label { display: flex; align-items: flex-start; gap: var(--a2); padding: var(--a3) var(--a4); border: 1px solid var(--linie-stark); border-radius: var(--r); cursor: pointer; background: var(--blatt); }
  .umf-wahl label.an { border-color: var(--akzent); background: var(--akzent-hell); box-shadow: inset 0 0 0 1px var(--akzent); }
  .umf-wahl label:has(input:focus-visible) { box-shadow: var(--fokus-ring); }
  .umf-wahl input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 3px 0 0; flex: none; }
  .umf-wahl span { display: flex; flex-direction: column; gap: var(--a2); min-width: 0; }
  .umf-wahl small { color: var(--tinte-2); font-size: var(--gr-klein); }
  .skizze { width: 100%; max-width: 280px; height: auto; color: var(--tinte-2); }
  .skizze .aus rect { fill: var(--blatt); stroke: currentColor; stroke-width: 1.5; }
  .skizze path { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
  .skizze .aus path:not(.dick) { stroke: var(--linie-stark); stroke-width: 2.5; }
  .skizze .dick { stroke: var(--akzent-tinte); stroke-width: 3; }
  .skizze .pfeil { stroke: var(--akzent); stroke-width: 2.5; stroke-linejoin: round; }
  .umf-info { display: flex; gap: var(--a2); align-items: flex-start; margin: var(--a4) 0; color: var(--tinte-2); max-width: var(--breite-text); }
  .umf-info :global(.ico) { flex: none; margin-top: 3px; }
  .umf-gruppe { border: 0; padding: 0; margin: 0 0 var(--a4); min-width: 0; display: flex; flex-direction: column; gap: var(--a3); }
  .umf-gruppe > legend { font: 650 var(--gr-text)/1.3 var(--schrift-ui); padding: 0; margin-bottom: var(--a2); }
  .umf-hilfe { color: var(--tinte-2); font-size: var(--gr-klein); max-width: var(--breite-text); }
  .umf-vorschlag { display: flex; flex-direction: column; gap: var(--a2); margin-bottom: var(--a3); }
  .umf-vorschlag .lbl { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
  .umf-chips { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .umf-chips .k[aria-pressed='true'] { background: var(--akzent-hell); border-color: var(--akzent); color: var(--akzent-tinte); font-weight: 600; }
  .umf-liste { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: var(--a2); align-items: start; }
  .umf-liste li { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); background: var(--blatt); }
  .umf-liste li.an { border-color: var(--akzent); background: var(--akzent-hell); }
  .umf-liste li:has(:focus-visible) { box-shadow: var(--fokus-ring); }
  .umf-spalte { display: flex; gap: var(--a2); align-items: flex-start; min-height: var(--ziel); cursor: pointer; padding-block: var(--a1); }
  .umf-spalte input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 3px 0 0; flex: none; }
  .umf-spalte span { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
  .umf-spalte small { color: var(--tinte-2); font-size: var(--gr-klein); }
  .umf-label { font: inherit; background: var(--blatt); color: var(--tinte); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: 36px; padding: var(--a1) var(--a3); width: 100%; }
  .umf-label:focus-visible, .umf .eingabe input:focus-visible, .umf .eingabe select:focus-visible { border-color: var(--fokus); box-shadow: var(--fokus-ring); }
  .umf-felder { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: var(--a3) var(--a4); max-width: 640px; }
  .umf-problem { color: var(--verlust); margin: var(--a2) 0 var(--a3); }
  .umf .knopfzeile { margin-top: var(--a3); }
  .umf .k[aria-disabled='true'] { opacity: .55; }
  .umf-vergleich { display: flex; flex-direction: column; gap: var(--a2); align-items: stretch; }
  .umf-vergleich h3 { font: 650 var(--gr-text)/1.3 var(--schrift-ui); margin-bottom: var(--a2); }
  .umf-vergleich h3 span { color: var(--tinte-2); font-weight: 400; font-size: var(--gr-klein); margin-inline-start: var(--a2); }
  .umf-vergleich :global(.umf-pfeil) { align-self: center; color: var(--akzent); }
  .umf-tab { overflow: auto; border: 1px solid var(--linie); border-radius: var(--r-klein); background: var(--blatt); max-width: 100%; }
  .umf-tab:focus-visible { box-shadow: var(--fokus-ring); }
  .umf-tab table { border-collapse: collapse; width: max-content; min-width: 100%; font-variant-numeric: tabular-nums; }
  .umf-tab th, .umf-tab td { padding: var(--a1) var(--a3); text-align: start; border-bottom: 1px solid var(--linie); white-space: nowrap; height: 32px; }
  .umf-tab thead th { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; background: var(--blatt-2); }
  .umf-tab td.zahl, .umf-tab th.zahl { text-align: right; }
  .umf-tab tbody tr:last-child td { border-bottom: 0; }
  .umf-hinweise { list-style: none; padding: 0; margin: var(--a4) 0 0; display: flex; flex-direction: column; gap: var(--a2); max-width: var(--breite-text); }
  .umf-hinweise li { display: flex; gap: var(--a2); align-items: flex-start; }
  .umf-hinweise :global(.ico) { flex: none; margin-top: 3px; }
  .umf-abschluss { margin-top: var(--a4); display: flex; flex-direction: column; gap: var(--a3); max-width: 640px; }
  .umf-frage { margin-top: var(--a4); padding: var(--a4); background: var(--blatt-2); border-inline-start: 4px solid var(--warn, var(--akzent)); border-radius: var(--r); max-width: 640px; display: flex; flex-direction: column; gap: var(--a3); }
  .umf-frage h3 { display: flex; gap: var(--a2); align-items: center; font: 650 var(--gr-text)/1.3 var(--schrift-ui); }
  /* gefühlte Breite bis 760 px (lib/groesse.svelte.ts) */
  :global(:where(:root.eng-760)) .umf-wahl { grid-template-columns: minmax(0, 1fr); }
  :global(:where(:root.eng-760)) .umf-liste { grid-template-columns: minmax(0, 1fr); }
</style>
