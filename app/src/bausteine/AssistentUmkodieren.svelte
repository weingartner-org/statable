<script lang="ts">
  import { istFehlend, hatFehlend } from '../lib/fehlend';
  import { untrack, onDestroy } from 'svelte';
  import { s, d, L, Lp } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName, umpolBefehl, umpolSpanne } from '../lib/skalabau';
  import { AssistentFehler, umkodierBefehl, umkodierVorschau, umpolQuelle, type textVarianten, type UmkodierOpt, type UmkodierRegel } from '../lib/datenassistent';
  import { anzeigeWert, fehlerSatz, spaltenOption, varianteSatz } from '../lib/datenassistentsaetze';
  import { wendeAn } from '../lib/datenassistentlauf';
  import { Vorschau } from '../lib/assistentvorschau.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { klassenBefehl, klassenVorschau, K_GLEICHBREIT, K_QUANTIL, KLASSEN_MAX, type KlassenArt, type KlassenOpt } from '../lib/klassieren';
  import { dez } from '../i18n/profil';
  import HilfeLink from './HilfeLink.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import Rechnet from './Rechnet.svelte';

  /* ---------- Ausgangslage ---------- */
  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  const namen = $derived(s.spalten.map(x => x.name));
  const waehlbar = $derived(s.spalten.filter(c => c.art !== 'datum'));
  let spalteWahl = $state(untrack(() => s.spalten.find(c => c.art !== 'datum')?.name ?? ''));
  const spalte = $derived(waehlbar.find(c => c.name === spalteWahl) ?? waehlbar[0]);
  const istText = $derived(spalte?.art === 'text');
  let modus = $state<'regeln' | 'umpolen' | 'klassen'>('regeln');

  /* ---------- Regeln ---------- */
  type Art = 'wert' | 'bereich' | 'missing' | 'sysmis';
  interface Zeile { id: number; art: Art; wert: string; von: string; bis: string; nach: string }
  let zaehler = 0;
  const neueZeile = (): Zeile => ({ id: ++zaehler, art: 'wert', wert: '', von: '', bis: '', nach: '' });
  let regeln = $state<Zeile[]>([neueZeile()]);
  let uebrige = $state<'uebernehmen' | 'leer' | 'wert'>('uebernehmen');
  let uebrigeWert = $state('');
  let fehlend = $state<'leer' | 'behalten'>('leer');
  let zielArt = $state<'neu' | 'selbst'>('neu');
  let zielEigen = $state<string | null>(null);
  let labelsEigen = $state<Record<string, string>>({});

  const zielVorschlag = $derived(freierName(`${spalte?.name ?? 'x'}_neu`, namen));
  const ziel = $derived(zielArt === 'selbst' ? (spalte?.name ?? '') : (zielEigen ?? zielVorschlag));
  const hatCodes = $derived(!!spalte && (hatFehlend(spalte) || (istText && spalte.fehlendText !== '')));

  const alsZahl = (t: string): number | null => { const x = t.trim().replace(',', '.'); return x !== '' && /^-?\d+(\.\d+)?$/.test(x) ? Number(x) : null; };
  /** Neuer Wert aus dem Eingabefeld: eine Zahl, wenn es eine ist, sonst Text. */
  const neuerWert = (t: string): number | string => alsZahl(t) ?? t.trim();

  /** Die Regeln als Eingabe für den Rechenkern; null mit einem Satz, wenn etwas fehlt. */
  const eingabe = $derived.by((): { opt: UmkodierOpt } | { problem: string } => {
    if (!spalte) return { problem: L('Es gibt keine Spalte zum Umkodieren.', 'There is no column to recode.') };
    const liste: UmkodierRegel[] = [];
    for (const [i, r] of regeln.entries()) {
      const nr = i + 1;
      if (r.nach.trim() === '') return { problem: L(`In Regel ${nr} fehlt der neue Wert.`, `Rule ${nr} has no new value.`) };
      const nach = neuerWert(r.nach);
      if (r.art === 'missing' || r.art === 'sysmis') { liste.push({ von: { fehlend: r.art === 'missing' ? 'MISSING' : 'SYSMIS' }, nach }); continue; }
      if (r.art === 'wert') {
        const wert = istText ? r.wert : alsZahl(r.wert);
        if (wert === null || wert === '') return { problem: istText ? L(`In Regel ${nr} fehlt der alte Wert.`, `Rule ${nr} has no old value.`) : L(`In Regel ${nr} fehlt der alte Wert, oder er ist keine Zahl.`, `Rule ${nr} has no old value, or it is not a number.`) };
        liste.push({ von: { wert }, nach });
      } else {
        const von = r.von.trim() === '' ? null : alsZahl(r.von), bis = r.bis.trim() === '' ? null : alsZahl(r.bis);
        if ((r.von.trim() !== '' && von === null) || (r.bis.trim() !== '' && bis === null)) return { problem: L(`In Regel ${nr} ist eine Grenze keine Zahl.`, `A limit in rule ${nr} is not a number.`) };
        if (von === null && bis === null) return { problem: L(`In Regel ${nr} braucht der Bereich mindestens eine Grenze.`, `The range in rule ${nr} needs at least one limit.`) };
        if (von !== null && bis !== null && von > bis) return { problem: L(`In Regel ${nr} liegt „von“ über „bis“.`, `In rule ${nr} "from" is above "to".`) };
        liste.push({ von: { bereich: [von, bis] }, nach });
      }
    }
    // Beim Überschreiben bleibt die Art der Spalte: Zahl bleibt Zahl, Text bleibt Text, und neuer Text passt in die Breite
    if (zielArt === 'selbst') {
      const neueText = liste.some(r => typeof r.nach === 'string') || (uebrige === 'wert' && typeof neuerWert(uebrigeWert) === 'string');
      if (neueText !== istText) return { problem: istText ? L('Diese Spalte enthält Text; beim Überschreiben bleiben die neuen Werte Text. Für Zahlen eine neue Spalte wählen.', 'This column holds text; when overwriting, the new values stay text. For numbers choose a new column.') : L('Diese Spalte enthält Zahlen; beim Überschreiben bleiben die neuen Werte Zahlen. Für Text eine neue Spalte wählen.', 'This column holds numbers; when overwriting, the new values stay numbers. For text choose a new column.') };
      const breite = Number(/^A(\d+)$/.exec(spalte.format)?.[1] ?? 0);
      if (istText && liste.some(r => typeof r.nach === 'string' && r.nach.length > breite)) return { problem: L(`Ein neuer Text ist länger als die Spalte (${breite} Zeichen). Eine neue Spalte wählen, sie wird so breit wie nötig.`, `A new text is longer than the column (${breite} characters). Choose a new column; it is made as wide as needed.`) };
    }
    if (uebrige === 'wert' && uebrigeWert.trim() === '') return { problem: L('Für die übrigen Werte fehlt der neue Wert.', 'The new value for the remaining values is missing.') };
    const neuLabels = Object.fromEntries(Object.entries(labelsEigen).filter(([k, l]) => l.trim() !== '' && liste.some(r => String(r.nach) === k)).map(([k, l]) => [k, l.trim()]));
    return {
      opt: {
        spalte: spalte.name, ziel, regeln: liste,
        uebrige: uebrige === 'wert' ? { wert: neuerWert(uebrigeWert) } : uebrige,
        fehlend: hatCodes ? fehlend : 'leer',
        labels: neuLabels, ueberschreiben: zielArt === 'selbst' || undefined
      }
    };
  });
  const opt = $derived('opt' in eingabe ? eingabe.opt : null);
  const befehl = $derived.by((): { syntax: string; hinweise: ReturnType<typeof textVarianten>[] } | { problem: string } => {
    if (!opt) return { problem: 'problem' in eingabe ? eingabe.problem : '' };
    try { const b = umkodierBefehl(daten, opt); return { syntax: b.syntax, hinweise: b.hinweise.map(h => h.gruppen) }; }
    catch (f) { return { problem: fehlerSatz(f) }; }
  });
  const syntax = $derived('syntax' in befehl ? befehl.syntax : '');
  /** Werte der neuen Spalte, für die ein Wertelabel möglich ist (nur Zahlen). */
  const neueWerte = $derived(opt ? [...new Set(opt.regeln.map(r => r.nach).concat(typeof opt.uebrige === 'object' ? [opt.uebrige.wert] : []))].filter((w): w is number => typeof w === 'number') : []);

  /* ---------- Vorschau ---------- */
  const vs = new Vorschau<ReturnType<typeof umkodierVorschau>>();
  onDestroy(() => vs.verwerfe());
  const gross = $derived(s.zeilen.length > 100_000);
  $effect(() => { const o = opt; if (modus !== 'regeln' || !o) return; untrack(() => vs.plane(() => umkodierVorschau(daten, o), !gross)); });
  const rechneVorschau = () => { const o = opt; if (o) void vs.jetzt(() => umkodierVorschau(daten, o)); };
  const zeilenMax = 14;
  const zeigeNeu = (w: Wert) => { const l = typeof w === 'number' ? opt?.labels[String(w)] : undefined; return l ? `${anzeigeWert(undefined, w)} ${l}` : anzeigeWert(undefined, w); };
  /** Was mit den Lücken und den Werten ohne Regel geschieht - immer in Worten dabei. */
  const statusSaetze = $derived.by(() => {
    if (!opt || !spalte) return [];
    const aus: string[] = [];
    if (opt.uebrige === 'uebernehmen') aus.push(L('Werte, für die keine Regel gilt, werden unverändert übernommen.', 'Values that no rule matches are kept unchanged.'));
    else if (opt.uebrige === 'leer') aus.push(L('Werte, für die keine Regel gilt, bleiben leer.', 'Values that no rule matches stay blank.'));
    else aus.push(L(`Werte, für die keine Regel gilt, werden zu ${opt.uebrige.wert}.`, `Values that no rule matches become ${opt.uebrige.wert}.`));
    if (hatCodes) aus.push(opt.fehlend === 'leer'
      ? L('Werte, die als „keine Angabe“ gelten, und leere Zellen bleiben in der neuen Spalte leer.', 'Values marked as "no answer" and blank cells stay blank in the new column.')
      : L('Werte, die als „keine Angabe“ gelten, bleiben „keine Angabe“; leere Zellen bleiben leer.', 'Values marked as "no answer" stay "no answer"; blank cells stay blank.'));
    else aus.push(L('Leere Zellen bleiben leer.', 'Blank cells stay blank.'));
    return aus;
  });

  /** Eine Zeile je vorkommendem Wert der Spalte (höchstens 40) mit sich selbst als neuem Wert - zum Umschreiben. */
  function alleWerte() {
    if (!spalte) return;
    const i = s.spalten.findIndex(c => c.name === spalte.name);
    const gesehen = new Map<string, Wert>();
    for (const z of s.zeilen) { const v = z[i] ?? null; if (v !== null && v !== '' && !gesehen.has(String(v))) gesehen.set(String(v), v); if (gesehen.size > 40) break; }
    const werte = [...gesehen.values()].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
    regeln = werte.slice(0, 40).map(v => ({ ...neueZeile(), wert: String(v), nach: String(v) }));
  }
  const nochMehr = $derived(!!spalte && new Set(s.zeilen.slice(0, 5000).map(z => z[s.spalten.findIndex(c => c.name === spalte.name)])).size > 40);

  /* ---------- Umpolen ---------- */
  let umpolVon = $state(''), umpolBis = $state('');
  const umpolWerte = $derived(spalte && spalte.art === 'zahl' ? s.zeilen.map(z => z[s.spalten.findIndex(c => c.name === spalte.name)] ?? null) : []);
  const umpolVorschlag = $derived(spalte && spalte.art === 'zahl' ? umpolSpanne(spalte, umpolWerte) : { min: NaN, max: NaN });
  const umpolFest = $derived.by(() => {
    if (umpolVon.trim() === '' && umpolBis.trim() === '') return undefined;
    const von = umpolVon.trim() === '' ? umpolVorschlag.min : alsZahl(umpolVon), bis = umpolBis.trim() === '' ? umpolVorschlag.max : alsZahl(umpolBis);
    return von === null || bis === null ? null : { min: von, max: bis };
  });
  const umpolProblem = $derived.by(() => {
    if (modus !== 'umpolen') return '';
    if (!spalte || spalte.art !== 'zahl') return L('Umpolen geht nur bei einer Spalte mit Zahlen.', 'Reversing only works for a column with numbers.');
    if (umpolFest === null) return L('Die Grenzen der Skala müssen Zahlen sein.', 'The limits of the scale must be numbers.');
    const sp = umpolFest ?? umpolVorschlag;
    if (!Number.isFinite(sp.min) || !Number.isFinite(sp.max) || sp.min >= sp.max) return L('Diese Spalte hat keine Spanne zum Umpolen.', 'This column has no range to reverse.');
    return '';
  });
  const umpol = $derived(modus === 'umpolen' && spalte && !umpolProblem ? umpolBefehl(spalte, umpolWerte, namen, umpolFest ?? undefined) : null);
  const umpolSatz = $derived.by(() => {
    if (!umpol || !spalte) return '';
    const q = umpolQuelle(spalte, umpolWerte, umpolFest ?? undefined);
    const von = umpol.min, bis = umpol.max;
    if (q === 'labels') return L(`Die Antwortskala ${von} bis ${bis} stammt aus den Wertelabels der Spalte. Neuer Wert = ${von + bis} − alter Wert.`, `The answer scale ${von} to ${bis} comes from the value labels of the column. New value = ${von + bis} − old value.`);
    if (q === 'fest') return L(`Die Antwortskala ${von} bis ${bis} ist hier eingestellt. Neuer Wert = ${von + bis} − alter Wert.`, `The answer scale ${von} to ${bis} is set here. New value = ${von + bis} − old value.`);
    return L(`Die Antwortskala ${von} bis ${bis} ist der kleinste und der größte Wert, der in dieser Spalte vorkommt. Hat niemand die höchste oder niedrigste Antwort gewählt, stimmt die Skala nicht: dann unter „Weitere Wege“ die Grenzen eintragen. Neuer Wert = ${von + bis} − alter Wert.`, `The answer scale ${von} to ${bis} is the smallest and largest value occurring in this column. If nobody chose the highest or lowest answer, the scale is wrong: then enter the limits under "More options". New value = ${von + bis} − old value.`);
  });
  const umpolTabelle = $derived.by(() => {
    if (!umpol || !spalte) return [];
    const vorkommen = [...new Set(umpolWerte.filter((w): w is number => typeof w === 'number' && !istFehlend(spalte, w)))].sort((a, b) => a - b);
    return vorkommen.map(w => ({ alt: w, neu: umpol.min + umpol.max - w }));
  });

  /* ---------- Klassen bilden ---------- */
  let klArt = $state<KlassenArt>('gleichbreit');
  let klKText = $state('');
  let klGrenzenText = $state('');
  let klOffen = $state(true);
  let klZu = $state<'unten' | 'oben'>('unten');
  let klZielEigen = $state<string | null>(null);
  const klZielVorschlag = $derived(freierName(`${spalte?.name ?? 'x'}_klassen`, namen));
  const klZiel = $derived(klZielEigen ?? klZielVorschlag);
  const klKStandard = $derived(klArt === 'quantil' ? K_QUANTIL : K_GLEICHBREIT);
  /** Die Eingaben als Rechenkern-Eingabe; ein Satz, wenn etwas fehlt. */
  const klEingabe = $derived.by((): { opt: KlassenOpt } | { problem: string } => {
    if (!spalte || spalte.art !== 'zahl') return { problem: L('Klassen bilden geht nur bei einer Spalte mit Zahlen.', 'Forming classes only works for a column with numbers.') };
    const opt: KlassenOpt = { spalte: spalte.name, ziel: klZiel, art: klArt, grenzeZu: klZu };
    // Mit Fallgewicht zählt die Vorschau gewichtet und die Quantile sind gewichtet; die Gewichtsspalte selbst lässt sich nicht klassieren
    if (s.gewicht && s.gewicht.spalte.toLowerCase() !== spalte.name.toLowerCase()) opt.gewicht = { spalte: s.gewicht.spalte, art: s.gewicht.art };
    if (klArt === 'eigene') {
      const teile = klGrenzenText.split(/[;\s]+/).filter(t => t !== '');
      if (!teile.length) return { problem: L('Es fehlen die Grenzen, zum Beispiel 18 25.', 'The limits are missing, for example 18 25.') };
      const zahlen = teile.map(alsZahl);
      if (zahlen.some(z => z === null)) return { problem: L('Eine Grenze ist keine Zahl. Die Grenzen werden mit Leerzeichen oder Semikolon getrennt.', 'A limit is not a number. The limits are separated by spaces or semicolons.') };
      opt.grenzen = zahlen as number[]; opt.offen = klOffen;
    } else {
      const k = klKText.trim() === '' ? klKStandard : Number(klKText.trim());
      opt.k = k;
    }
    return { opt };
  });
  const klOpt = $derived('opt' in klEingabe ? klEingabe.opt : null);
  const klBefehl = $derived.by((): { syntax: string } | { problem: string } => {
    if (!klOpt) return { problem: 'problem' in klEingabe ? klEingabe.problem : '' };
    try { return { syntax: klassenBefehl(daten, klOpt).syntax }; } catch (f) { return { problem: klFehler(f) }; }
  });
  /** Fehlersätze des Klassierens (die gemeinsamen stehen in datenassistentsaetze.ts). */
  function klFehler(f: unknown): string {
    const c = f instanceof AssistentFehler ? f.code : '';
    switch (c) {
      case 'k': return L(`Die Zahl der Klassen muss eine ganze Zahl von 1 bis ${KLASSEN_MAX} sein.`, `The number of classes must be a whole number from 1 to ${KLASSEN_MAX}.`);
      case 'grenzen': return klArt === 'eigene' && !klOffen ? L('Die Grenzen müssen aufsteigend und verschieden sein; ohne offene Ränder braucht es mindestens zwei.', 'The limits must be ascending and different; without open ends at least two are needed.') : L('Die Grenzen müssen aufsteigend und verschieden sein.', 'The limits must be ascending and different.');
      case 'konstant': return L('In dieser Spalte kommt nur ein Wert vor. Daraus lassen sich keine Klassen bilden.', 'This column holds only one value. No classes can be formed from it.');
      case 'keine-werte': return L('In dieser Spalte gibt es keine gültigen Zahlen.', 'This column has no valid numbers.');
      default: return fehlerSatz(f);
    }
  }
  const vsK = new Vorschau<ReturnType<typeof klassenVorschau>>();
  onDestroy(() => vsK.verwerfe());
  $effect(() => { const o = klOpt; if (modus !== 'klassen' || !o) return; untrack(() => vsK.plane(() => klassenVorschau(daten, o), !gross)); });
  const rechneVorschauK = () => { const o = klOpt; if (o) void vsK.jetzt(() => klassenVorschau(daten, o)); };
  /** Grenze für die Tabelle: gerundet auf höchstens vier gültige Stellen. */
  const grenzText = (v: number | null) => (v === null ? '-' : dez(String(Number(v.toPrecision(5)))));
  const anteilText = (a: number) => dez((a * 100).toFixed(1)) + ' %';
  const klHinweise = $derived.by(() => {
    if (modus !== 'klassen') return [];
    const aus = [d('Klassen bilden wirft Information weg: Aus einer Messung wird eine grobe Einteilung, und Tests verlieren an Teststärke. Teile nur ein, wenn die Fragestellung die Klassen braucht (MacCallum u. a. 2002). Besonders ein Mediansplit ist selten zu rechtfertigen.', 'Klassen bilden wirft Information weg: Aus einer Messung wird eine grobe Einteilung, und Tests verlieren an Teststärke. Teilen Sie nur ein, wenn die Fragestellung die Klassen braucht (MacCallum u. a. 2002). Besonders ein Mediansplit ist selten zu rechtfertigen.', 'Forming classes throws information away: a measurement becomes a coarse grouping and tests lose power. Only group if the question needs the classes (MacCallum et al. 2002). A median split in particular is rarely justified.')];
    const v = vsK.wert;
    if (v?.zusammengefallen) aus.push(L(`Viele Werte sind gleich, darum fallen Grenzen zusammen. Statable bildet ${v.k} statt ${v.kGewuenscht} Klassen. Gleich breite Klassen oder eigene Grenzen vermeiden das.`, `Many values are equal, so limits coincide. Statable forms ${v.k} instead of ${v.kGewuenscht} classes. Equal-width classes or your own limits avoid this.`));
    return aus;
  });

  const problem = $derived(modus === 'regeln' ? ('problem' in befehl ? befehl.problem : '') : modus === 'klassen' ? ('problem' in klBefehl ? klBefehl.problem : '') : umpolProblem);

  /* ---------- Anwenden ---------- */
  const lad = new Laedt();
  async function anwenden() {
    if (modus === 'klassen') {
      if (!klOpt || !('syntax' in klBefehl)) return;
      await lad.mit(() => wendeAn(L(`${klOpt.spalte} in Klassen geteilt`, `${klOpt.spalte} divided into classes`), klBefehl.syntax));
    } else if (modus === 'umpolen') {
      if (!umpol || !spalte) return;
      await lad.mit(() => wendeAn(L(`${spalte.name} umgepolt`, `${spalte.name} reversed`), umpol.syntax));
    } else {
      if (!opt || !('syntax' in befehl)) return;
      await lad.mit(() => wendeAn(L(`${opt.spalte} umkodiert`, `${opt.spalte} recoded`), befehl.syntax));
    }
  }
</script>

<AssistentRahmen id="umkodieren" titel={L('Umkodieren', 'Recode')} befehlName={L('Umkodieren', 'Recode')}
  einleitung={L('Werte einer Spalte durch andere ersetzen, zum Beispiel Noten in Gruppen zusammenfassen oder eine Frage umpolen. Das Ergebnis kommt in eine neue Spalte, die alte bleibt unverändert.', 'Replace values of a column with others, for example merge grades into groups or reverse an item. The result goes into a new column; the old one stays unchanged.')}
  syntax={modus === 'umpolen' ? (umpol?.syntax ?? '') : modus === 'klassen' ? ('syntax' in klBefehl ? klBefehl.syntax : '') : syntax} {problem}
  hinweise={modus === 'regeln' && 'hinweise' in befehl ? befehl.hinweise.map(g => varianteSatz(g)) : klHinweise}
  anwendenText={L('Umkodieren', 'Recode')} anwenden={anwenden} kannAnwenden={modus === 'umpolen' ? !!umpol : modus === 'klassen' ? !!klOpt && 'syntax' in klBefehl : !!opt && 'syntax' in befehl} laeuft={lad.sichtbar} ueberschreibt={modus === 'regeln' && zielArt === 'selbst' ? (spalte?.name ?? '') : ''}>
  {#snippet haupt()}
    <div class="as-feld"><label for="uk-spalte">{L('Welche Spalte?', 'Which column?')}</label>
      <select id="uk-spalte" bind:value={spalteWahl}>{#each waehlbar as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
    <div class="as-feld"><span class="lbl" id="uk-modus">{L('Was soll geschehen?', 'What should happen?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="uk-modus">
        <label data-begriff="rekodierung"><input type="radio" name="uk-modus" value="regeln" bind:group={modus}>{L('Werte umschreiben', 'Rewrite values')}</label>
        <label data-begriff="umpolen"><input type="radio" name="uk-modus" value="umpolen" bind:group={modus}>{L('Frage umpolen (1-5 wird 5-1)', 'Reverse an item (1-5 becomes 5-1)')}</label>
        <label data-begriff="klassierung"><input type="radio" name="uk-modus" value="klassen" bind:group={modus}>{L('Klassen bilden (Zahlen in Gruppen teilen)', 'Form classes (divide numbers into groups)')}</label></div></div>

    {#if modus === 'regeln'}
      <fieldset class="as-gruppe"><legend>{L('Regeln: alter Wert → neuer Wert', 'Rules: old value → new value')}</legend>
        <ol class="as-regeln">{#each regeln as r, i (r.id)}
          <li><span class="as-nr">{i + 1}</span>
            <select aria-label={L(`Regel ${i + 1}: Art des alten Werts`, `Rule ${i + 1}: kind of old value`)} bind:value={r.art}>
              <option value="wert">{L('Wert', 'Value')}</option>
              {#if !istText}<option value="bereich">{L('Bereich', 'Range')}</option>{/if}
              <option data-begriff="fehlendcode" value="missing">{L('„keine Angabe“ (jede Art)', '"no answer" (any kind)')}</option>
              <option value="sysmis">{L('leer', 'blank')}</option></select>
            {#if r.art === 'wert'}<input type="text" autocomplete="off" aria-label={L(`Regel ${i + 1}: alter Wert`, `Rule ${i + 1}: old value`)} placeholder={L('alter Wert', 'old value')} bind:value={r.wert}>
            {:else if r.art === 'bereich'}<span class="as-bereich"><input type="text" inputmode="decimal" autocomplete="off" aria-label={L(`Regel ${i + 1}: von`, `Rule ${i + 1}: from`)} placeholder={L('von (leer = kleinster)', 'from (blank = lowest)')} bind:value={r.von}><span class="as-leer" aria-hidden="true">{L('bis', 'to')}</span><input type="text" inputmode="decimal" autocomplete="off" aria-label={L(`Regel ${i + 1}: bis`, `Rule ${i + 1}: to`)} placeholder={L('bis (leer = größter)', 'to (blank = highest)')} bind:value={r.bis}></span>
            {:else}<span class="as-leer">{r.art === 'missing' ? L('Werte, die als „keine Angabe“ gelten, und leere Zellen', 'values marked "no answer" and blank cells') : L('leere Zellen', 'blank cells')}</span>{/if}
            <span class="as-pfeil" aria-hidden="true">→</span>
            <input type="text" autocomplete="off" aria-label={L(`Regel ${i + 1}: neuer Wert`, `Rule ${i + 1}: new value`)} placeholder={L('neuer Wert', 'new value')} bind:value={r.nach}>
            <button class="k leise klein" type="button" aria-label={L(`Regel ${i + 1} entfernen`, `Remove rule ${i + 1}`)} disabled={regeln.length < 2} onclick={() => (regeln = regeln.filter(x => x.id !== r.id))}>{L('Entfernen', 'Remove')}</button></li>
        {/each}</ol>
        <div class="knopfzeile"><button class="k" type="button" onclick={() => (regeln = [...regeln, neueZeile()])}>{L('Regel hinzufügen', 'Add a rule')}</button>
          <button class="k leise" type="button" onclick={alleWerte}>{L('Alle vorkommenden Werte eintragen', 'Fill in all values that occur')}</button></div>
        {#if nochMehr}<p class="as-hilfe">{L('Die Spalte hat mehr als 40 verschiedene Werte; eingetragen werden die ersten 40.', 'The column has more than 40 different values; the first 40 are filled in.')}</p>{/if}
        <p class="as-hilfe">{L('Gilt eine Regel für einen Wert, zählt die erste passende. Zahlen als neuer Wert ergeben eine Zahlenspalte, alles andere eine Textspalte.', 'If several rules fit a value, the first one counts. Numbers as new values give a number column, anything else a text column.')}</p>
      </fieldset>
    {:else if modus === 'klassen'}
      <div class="as-feld"><span class="lbl" id="kl-art">{L('Wie sollen die Klassen entstehen?', 'How should the classes be formed?')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="kl-art">
          <label data-begriff="klassenbreite"><input type="radio" name="kl-art" value="gleichbreit" bind:group={klArt}>{L('Gleich breit', 'Equal width')}</label>
          <label data-begriff="quantil"><input type="radio" name="kl-art" value="quantil" bind:group={klArt}>{L('Gleich viele Personen', 'Equal numbers of people')}</label>
          <label><input type="radio" name="kl-art" value="eigene" bind:group={klArt}>{L('Eigene Grenzen', 'My own limits')}</label></div>
        <span class="as-hilfe">{klArt === 'gleichbreit' ? L('Jede Klasse ist gleich breit: Die Spanne vom kleinsten bis zum größten Wert wird in gleiche Stücke geteilt.', 'Every class is equally wide: the range from the smallest to the largest value is cut into equal pieces.')
          : klArt === 'quantil' ? L('In jede Klasse fällt etwa gleich viele Fälle (bei 4 Klassen: Quartile). Die Grenzen sind Quantile Typ 6, wie in der Verteilungskarte und in SPSS.', 'About the same number of cases falls into every class (with 4 classes: quartiles). The limits are type 6 quantiles, as in the distribution card and in SPSS.')
          : L('Die Grenzen werden selbst festgelegt, zum Beispiel 18 und 25.', 'The limits are set by hand, for example 18 and 25.')}</span></div>
      {#if klArt === 'eigene'}
        <div class="as-feld"><label for="kl-grenzen">{L('Grenzen (von klein nach groß)', 'Limits (small to large)')}</label>
          <input id="kl-grenzen" type="text" inputmode="decimal" autocomplete="off" placeholder={L('z. B. 18 25', 'e.g. 18 25')} bind:value={klGrenzenText}>
          <span class="as-hilfe">{L('Getrennt durch Leerzeichen oder Semikolon. Zwei Grenzen ergeben drei Klassen, wenn die Ränder offen sind.', 'Separated by spaces or semicolons. Two limits give three classes when the ends are open.')}</span></div>
      {:else}
        <div class="as-feld"><label for="kl-k">{L('Zahl der Klassen', 'Number of classes')}</label>
          <select id="kl-k" value={klKText === '' ? String(klKStandard) : klKText} onchange={(e) => (klKText = e.currentTarget.value)}>{#each Array.from({ length: KLASSEN_MAX }, (_, i) => i + 1) as n}<option value={String(n)}>{n}</option>{/each}</select></div>
      {/if}
      <p class="as-hilfe"><HilfeLink id="klassen-bilden" text={L('Hilfe: Klassen bilden', 'Help: forming classes')} /></p>
    {:else}
      <div class="as-feld">
        {#if umpolProblem}<p class="as-hilfe">{umpolProblem}</p>
        {:else if umpol}<p class="as-satz">{umpolSatz}</p>{/if}
      </div>
    {/if}
  {/snippet}

  {#snippet weitere()}
    {#if modus === 'regeln'}
      <div class="as-feld"><span class="lbl" id="uk-ziel">{L('Wohin kommt das Ergebnis?', 'Where does the result go?')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="uk-ziel">
          <label><input type="radio" name="uk-ziel" value="neu" bind:group={zielArt}>{L('In eine neue Spalte', 'Into a new column')}</label>
          <label><input type="radio" name="uk-ziel" value="selbst" bind:group={zielArt}>{L('Die Spalte überschreiben', 'Overwrite the column')}</label></div></div>
      {#if zielArt === 'neu'}
        <div class="as-feld"><label for="uk-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="uk-name" type="text" autocomplete="off" value={ziel} oninput={(e) => (zielEigen = e.currentTarget.value)}></div>
      {:else}
        <p class="as-warn">{L(`Die Spalte „${spalte?.name}“ wird mit den neuen Werten überschrieben. „Rückgängig“ in der Kopfzeile stellt sie wieder her.`, `The column "${spalte?.name}" is overwritten with the new values. "Undo" in the header restores it.`)}</p>
      {/if}
      <div class="as-feld"><span class="lbl" id="uk-uebrige">{L('Werte, die keine Regel trifft', 'Values that no rule matches')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="uk-uebrige">
          <label><input type="radio" name="uk-uebrige" value="uebernehmen" bind:group={uebrige}>{L('übernehmen', 'keep')}</label>
          <label><input type="radio" name="uk-uebrige" value="leer" bind:group={uebrige}>{L('leer lassen', 'leave blank')}</label>
          <label><input type="radio" name="uk-uebrige" value="wert" bind:group={uebrige}>{L('auf einen Wert setzen', 'set to a value')}</label></div>
        {#if uebrige === 'wert'}<input type="text" autocomplete="off" aria-label={L('Wert für die übrigen', 'Value for the remaining')} bind:value={uebrigeWert}>{/if}</div>
      {#if hatCodes}
        <div class="as-feld"><span class="lbl" id="uk-fehl">{L('Werte, die als „keine Angabe“ gelten', 'Values marked as "no answer"')}</span>
          <div class="segment" role="radiogroup" aria-labelledby="uk-fehl">
            <label><input type="radio" name="uk-fehl" value="leer" bind:group={fehlend}>{L('in der neuen Spalte leer', 'blank in the new column')}</label>
            <label data-begriff="fehlendcode"><input type="radio" name="uk-fehl" value="behalten" bind:group={fehlend}>{L('als „keine Angabe“ behalten', 'keep as "no answer"')}</label></div>
          <span class="as-hilfe">{L('Ausdrückliche Regeln für „keine Angabe“ gehen vor. Ohne diese Wahl könnte ein Bereich wie „4 bis höchster“ eine 9 für „keine Angabe“ mit einfangen und zu einem gültigen Wert machen; Statable verhindert das.', 'Explicit rules for "no answer" come first. Without this choice a range like "4 to highest" could catch a 9 meaning "no answer" and turn it into a valid value; Statable prevents that.')}</span></div>
      {:else}
        <p class="as-hilfe">{L('Leere Zellen bleiben in der neuen Spalte leer, sofern keine Regel „leer“ ausdrücklich nennt.', 'Blank cells stay blank in the new column unless a rule explicitly names "blank".')}</p>
      {/if}
      {#if neueWerte.length && !istText}
        <fieldset class="as-gruppe"><legend>{L('Beschriftung der neuen Werte (freiwillig)', 'Labels for the new values (optional)')}</legend>
          <div class="as-felder">{#each neueWerte as w}<div class="as-feld"><label for="uk-l-{w}">{w}</label><input id="uk-l-{w}" type="text" autocomplete="off" value={labelsEigen[String(w)] ?? ''} oninput={(e) => (labelsEigen[String(w)] = e.currentTarget.value)}></div>{/each}</div></fieldset>
      {/if}
    {:else if modus === 'klassen'}
      <div class="as-feld"><span class="lbl" id="kl-zu">{L('Ein Wert genau auf der Grenze gehört …', 'A value exactly on a limit belongs …')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="kl-zu">
          <label><input type="radio" name="kl-zu" value="unten" bind:group={klZu}>{L('zur unteren Klasse („bis 18“, Standard)', 'to the lower class ("up to 18", default)')}</label>
          <label><input type="radio" name="kl-zu" value="oben" bind:group={klZu}>{L('zur oberen Klasse („von 18 bis unter 25“)', 'to the upper class ("18 to under 25")')}</label></div>
        <span class="as-hilfe">{L('Die Regel steht in jeder Beschriftung. Bei ganzen Zahlen wie dem Alter in Jahren gilt: „über 18 bis 25“ heißt 19 bis 25.', 'The rule is part of every label. With whole numbers such as age in years, "over 18 to 25" means 19 to 25.')}</span></div>
      {#if klArt === 'eigene'}
        <div class="as-feld"><label class="schalter"><input type="checkbox" bind:checked={klOffen}>{L('Ränder offen lassen („bis 18“ und „über 25“)', 'Leave the ends open ("up to 18" and "over 25")')}</label>
          <span class="as-hilfe">{L('Aus: Werte außerhalb der ersten und letzten Grenze bleiben leer.', 'Off: values outside the first and last limit stay blank.')}</span></div>
      {/if}
      <div class="as-feld"><label for="kl-name">{L('Name der neuen Spalte', 'Name of the new column')}</label><input id="kl-name" type="text" autocomplete="off" value={klZiel} oninput={(e) => (klZielEigen = e.currentTarget.value)}>
        <span class="as-hilfe">{L('Die neue Spalte ist geordnet (ordinal) und trägt die Klassen als Wertebeschriftung. Die alte Spalte bleibt unverändert; leere Werte und Codes für „keine Angabe“ bleiben leer.', 'The new column is ordinal and carries the classes as value labels. The old column stays unchanged; blank values and "no answer" codes stay blank.')}</span></div>
    {:else if spalte?.art === 'zahl'}
      <div class="as-felder">
        <div class="as-feld"><label for="up-von">{L('Niedrigste Antwort der Skala', 'Lowest answer of the scale')}</label><input id="up-von" type="text" inputmode="decimal" autocomplete="off" placeholder={String(umpolVorschlag.min)} bind:value={umpolVon}></div>
        <div class="as-feld"><label for="up-bis">{L('Höchste Antwort der Skala', 'Highest answer of the scale')}</label><input id="up-bis" type="text" inputmode="decimal" autocomplete="off" placeholder={String(umpolVorschlag.max)} bind:value={umpolBis}></div>
      </div>
      <p class="as-hilfe">{L('Leer = der Vorschlag oben. Die neue Spalte heißt wie die alte mit einem R dahinter; die alte bleibt. Dieselbe Regel gilt im Skalenbau bei der Reliabilität.', 'Blank = the suggestion above. The new column is named like the old one with an R added; the old one stays. The same rule is used in scale building after reliability.')}</p>
    {/if}
  {/snippet}

  {#snippet vorschau()}
    {#if modus === 'umpolen'}
      {#if umpolTabelle.length}
        <table class="as-tab"><caption class="nur-vorleser">{L('Alter und neuer Wert', 'Old and new value')}</caption><thead><tr><th scope="col">{L('Alter Wert', 'Old value')}</th><th scope="col">{L('Neuer Wert', 'New value')}</th></tr></thead>
          <tbody>{#each umpolTabelle.slice(0, zeilenMax) as e}<tr><td>{anzeigeWert(spalte, e.alt)}</td><td>{anzeigeWert(undefined, e.neu)}</td></tr>{/each}</tbody></table>
        <p class="as-hilfe">{L('Werte, die als „keine Angabe“ gelten, und leere Zellen bleiben leer.', 'Values marked as "no answer" and blank cells stay blank.')}</p>
      {:else}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald die Skala feststeht.', 'The preview appears as soon as the scale is set.')}</p>{/if}
    {:else if modus === 'klassen'}
      {#if !klOpt || 'problem' in klBefehl}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald die Eingaben vollständig sind.', 'The preview appears as soon as the entries are complete.')}</p>
      {:else if vsK.wert}
        {@const v = vsK.wert}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich muss per Tastatur erreichbar sein, WCAG 2.1.1) -->
        <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau der Klassen', 'Preview of the classes')}>
        <table class="as-tab"><caption class="nur-vorleser">{L('Klassen mit Grenzen, Zahl der Fälle und Anteil', 'Classes with limits, number of cases and share')}</caption>
          <thead><tr><th scope="col">{L('Klasse', 'Class')}</th><th scope="col">{L('Von', 'From')}</th><th scope="col">{L('Bis', 'To')}</th><th scope="col" class="zahl">{v.gewichtet ? L('Fälle (gewichtet)', 'Cases (weighted)') : L('Fälle', 'Cases')}</th><th scope="col" class="zahl">{L('Anteil', 'Share')}</th></tr></thead>
          <tbody>{#each v.klassen as c (c.nr)}<tr><td>{c.nr} · {c.beschriftung}</td><td>{c.von === null ? '-' : `${c.vonEin ? '≥' : '>'} ${grenzText(c.von)}`}</td><td>{c.bis === null ? '-' : `${c.bisEin ? '≤' : '<'} ${grenzText(c.bis)}`}</td><td class="zahl">{dez(String(Number(c.anzahl.toFixed(2))))}</td><td class="zahl">{anteilText(c.anteil)}</td></tr>{/each}</tbody></table></div>
        <p class="as-hilfe">{v.aufGrenze > 0
          ? Lp(v.aufGrenze, `Genau auf einer Grenze liegt ${dez(String(Number(v.aufGrenze.toFixed(2))))} Fall.`, `Genau auf einer Grenze liegen ${dez(String(Number(v.aufGrenze.toFixed(2))))} Fälle.`, `Exactly on a limit lies ${dez(String(Number(v.aufGrenze.toFixed(2))))} case.`, `Exactly on a limit lie ${dez(String(Number(v.aufGrenze.toFixed(2))))} cases.`)
          : L('Kein Wert liegt genau auf einer Grenze.', 'No value lies exactly on a limit.')}
          {klZu === 'unten' ? L('Ein Wert genau auf der Grenze gehört zur unteren Klasse.', 'A value exactly on a limit belongs to the lower class.') : L('Ein Wert genau auf der Grenze gehört zur oberen Klasse.', 'A value exactly on a limit belongs to the upper class.')}</p>
        {#if v.gewichtet}<p class="as-hilfe">{L(`Gezählt mit dem Fallgewicht ${s.gewicht?.spalte ?? ''}; bei gleich vielen Personen sind auch die Grenzen gewichtet.`, `Counted with the case weight ${s.gewicht?.spalte ?? ''}; with equal numbers of people the limits are weighted too.`)}</p>{/if}
      {:else if vsK.laeuft}<p><Rechnet text={L('Die Vorschau wird gerechnet …', 'The preview is being calculated …')} /></p>
      {:else}<button class="k" type="button" onclick={rechneVorschauK}>{L('Vorschau berechnen', 'Calculate preview')}</button>{/if}
    {:else if !opt}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald die Regeln vollständig sind.', 'The preview appears as soon as the rules are complete.')}</p>
    {:else if vs.wert}
      <table class="as-tab"><caption class="nur-vorleser">{L('Alter und neuer Wert mit Zahl der Fälle', 'Old and new value with number of cases')}</caption><thead><tr><th scope="col">{L('Alter Wert', 'Old value')}</th><th scope="col">{L('Neuer Wert', 'New value')}</th><th scope="col" class="zahl">{L('Fälle', 'Cases')}</th></tr></thead>
        <tbody>{#each vs.wert.slice(0, zeilenMax) as e}<tr><td>{anzeigeWert(spalte, e.alt)}</td><td>{zeigeNeu(e.neu)}</td><td class="zahl">{e.anzahl}</td></tr>{/each}</tbody></table>
      {#if vs.wert.length > zeilenMax}<p class="as-hilfe">{Lp(vs.wert.length - zeilenMax, `Dazu kommt ${vs.wert.length - zeilenMax} weitere Kombination.`, `Dazu kommen ${vs.wert.length - zeilenMax} weitere Kombinationen.`, `${vs.wert.length - zeilenMax} more combination.`, `${vs.wert.length - zeilenMax} more combinations.`)}</p>{/if}
    {:else if vs.laeuft}<p><Rechnet text={L('Die Vorschau wird gerechnet …', 'The preview is being calculated …')} /></p>
    {:else}<button class="k" type="button" onclick={rechneVorschau}>{L('Vorschau berechnen', 'Calculate preview')}</button>{/if}
    {#if modus === 'regeln'}{#each statusSaetze as t}<p class="as-hilfe">{t}</p>{/each}{/if}
  {/snippet}
</AssistentRahmen>
