<script lang="ts">
  import { s, L, Lp, d, melde } from '../lib/sitzung.svelte';
  import { fokusNachVerschieben } from '../lib/ordnen';
  import { kennzahlenSatz } from '../lib/anonym';
  import { zahlDe } from '../lib/format';
  import { schutzStart, schutzKennzahlen, schutzRechnen, schutzProtokoll, schutzAnwenden, schutzGrenzeSatz, schutzHatGewicht, SCHUTZ_K, SCHUTZ_MAX_FAELLE, type SchutzErgebnis, type Kappung } from '../lib/mikroschutz.svelte';
  import { leseZahl } from '../lib/power';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  /**
   * „Mikrodaten schützen“ (M5b): Schlüsselmerkmale wählen (Reihenfolge = Wichtigkeit), k wählen, Kennzahlen sofort; Schritte: Kappen, lokal unterdrücken, Spalten entfernen.
   * Ergebnis = neue Fassung der Daten (ein Schritt zum Rückgängigmachen); das Protokoll steht als Text zum Kopieren da. Die Zahlen kommen aus lib/anonym.ts.
   */
  let p = $state(schutzStart());
  let neu = $state<{ spalte: string; seite: 'oben' | 'unten'; modus: 'perzentil' | 'grenze'; wert: string }>({ spalte: '', seite: 'oben', modus: 'perzentil', wert: '99' });
  let ergebnis = $state<{ stand: string; e: SchutzErgebnis | null; satz: string } | null>(null);
  let angewendet = $state(false);
  const lad = new Laedt(), wirkt = new Laedt();

  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl' && !p.entfernen.includes(c.name)));
  const kandidaten = $derived(s.spalten.filter(c => !p.entfernen.includes(c.name)));
  const kennungen = $derived(s.spalten.filter(c => !p.schluessel.includes(c.name) && !p.kappen.some(k => k.spalte === c.name)));
  const vorher = $derived(schutzKennzahlen(p));
  const stand = $derived(JSON.stringify([$state.snapshot(p), s.zeilen.length, s.spalten.length]));
  const aktuell = $derived(ergebnis && ergebnis.stand === stand ? ergebnis : null);
  const ok = $derived(aktuell?.e ?? null);
  const protokoll = $derived(ok ? schutzProtokoll(p, ok) : '');

  function schluesselWahl(name: string, an: boolean) { p.schluessel = an ? [...p.schluessel, name] : p.schluessel.filter(x => x !== name); }
  function schiebe(i: number, r: -1 | 1) { const a = [...p.schluessel], j = i + r; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j]!, a[i]!]; p.schluessel = a; void fokusNachVerschieben('mk:' + a[j], r, L(`${a[j]} steht jetzt auf Platz ${j + 1} von ${a.length}.`, `${a[j]} is now in position ${j + 1} of ${a.length}.`)); }
  function kennungWahl(name: string, an: boolean) {
    p.entfernen = an ? [...p.entfernen, name] : p.entfernen.filter(x => x !== name);
    if (an) { p.schluessel = p.schluessel.filter(x => x !== name); p.kappen = p.kappen.filter(k => k.spalte !== name); }
  }
  const wertOk = $derived(Number.isFinite(leseZahl(neu.wert)) && (neu.modus === 'grenze' || (leseZahl(neu.wert) > 0 && leseZahl(neu.wert) < 100)));
  function kappungDazu() {
    if (!neu.spalte || !wertOk) return;
    const k: Kappung = { spalte: neu.spalte, seite: neu.seite, modus: neu.modus, wert: leseZahl(neu.wert) };
    p.kappen = [...p.kappen, k];
  }
  function modus(m: 'perzentil' | 'grenze') { neu.modus = m; neu.wert = m === 'perzentil' ? (neu.seite === 'oben' ? '99' : '1') : ''; }
  function seite(sd: 'oben' | 'unten') { neu.seite = sd; if (neu.modus === 'perzentil') neu.wert = sd === 'oben' ? '99' : '1'; }
  const kappText = (k: Kappung) => (k.seite === 'oben' ? L('oben', 'top') : L('unten', 'bottom')) + ' ' + (k.modus === 'perzentil' ? L(`${zahlDe(k.wert, 0)}-%-Perzentil`, `percentile ${zahlDe(k.wert, 0)}`) : L(`Grenze ${zahlDe(k.wert, 2)}`, `limit ${zahlDe(k.wert, 2)}`));

  async function pruefen() {
    angewendet = false;
    await lad.mit(async () => {
      await new Promise(r => setTimeout(r, 0));   // die Lade-Animation darf erscheinen, bevor gerechnet wird
      const r = schutzRechnen(p);
      ergebnis = { stand, e: r.ok ? r : null, satz: r.ok ? '' : r.satz };
    });
  }
  async function anwenden() {
    if (!ok || angewendet) return;
    await wirkt.mit(async () => {
      const f = await schutzAnwenden(p, ok);
      if (f) melde(f); else { angewendet = true; melde(L('Die Daten sind geschützt. „Rückgängig“ in der Kopfzeile bringt das Original zurück.', 'The data are protected. "Undo" in the header brings back the original.'), true); }
    });
  }
  async function kopieren() {
    try { await navigator.clipboard.writeText(protokoll); melde(L('Protokoll kopiert.', 'Log copied.'), true); } catch { melde(L('Das Kopieren ging nicht. Der Text lässt sich markieren und von Hand kopieren.', 'Copying did not work. The text can be selected and copied by hand.')); }
  }
</script>

<AssistentRahmen id="mikrodaten" titel={L('Mikrodaten schützen', 'Protect microdata')}
  einleitung={d('Bevor du Einzeldaten weitergibst: Wie leicht ist eine Person an ihrer Kombination von Merkmalen zu erkennen? Statable zählt, kappt Ausreißer und entfernt Angaben, bis jede Kombination mindestens k-mal vorkommt.', 'Bevor Sie Einzeldaten weitergeben: Wie leicht ist eine Person an ihrer Kombination von Merkmalen zu erkennen? Statable zählt, kappt Ausreißer und entfernt Angaben, bis jede Kombination mindestens k-mal vorkommt.', 'Before you pass on individual data: how easily can a person be recognised by their combination of characteristics? Statable counts, caps outliers and removes entries until every combination occurs at least k times.')}
  hinweise={[schutzGrenzeSatz(), ...(s.zeilen.length > SCHUTZ_MAX_FAELLE ? [L('Zu viele Fälle für diese Rechnung im Browser.', 'Too many cases for this calculation in the browser.')] : [])]}
  anwendenText={L('Geschützte Fassung anlegen', 'Create the protected version')} anwenden={anwenden} kannAnwenden={!!ok && !angewendet} laeuft={wirkt.sichtbar}
  problem={!aktuell && ergebnis ? L('Die Auswahl hat sich geändert: erst neu prüfen.', 'The selection has changed: check again first.') : aktuell && !ok ? aktuell.satz : angewendet ? L('Schon angewendet. Mit einer geänderten Auswahl entsteht eine neue Fassung.', 'Already applied. A changed selection gives a new version.') : !ergebnis ? L('Zuerst Schlüsselmerkmale wählen, dann „Prüfen“.', 'First choose key variables, then "Check".') : ''}>
  {#snippet haupt()}
    <fieldset class="as-gruppe"><legend>{L('1. Schlüsselmerkmale (Angaben, an denen man jemanden erkennen könnte)', '1. Key variables (details by which someone could be recognised)')}</legend>
      <ul class="as-liste">{#each kandidaten as c (c.name)}<li class:an={p.schluessel.includes(c.name)}><label><input type="checkbox" checked={p.schluessel.includes(c.name)} onchange={(e) => schluesselWahl(c.name, (e.currentTarget as HTMLInputElement).checked)}><span>{c.name}{#if c.bezeichnung}<small>{c.bezeichnung}</small>{/if}</span></label></li>{/each}</ul>
      {#if p.schluessel.length > 1}
        <p class="as-hilfe">{L('Die Reihenfolge ist die Wichtigkeit: Was oben steht, bleibt beim Unterdrücken am längsten erhalten.', 'The order is the importance: what is at the top is kept longest when suppressing.')}</p>
        <ol class="mk-reihe" aria-label={L('Schlüsselmerkmale nach Wichtigkeit', 'Key variables by importance')}>{#each p.schluessel as n, i (n)}
          <li><span class="as-nr">{i + 1}</span><span class="mk-name">{n}</span>
            <button class="k klein" type="button" data-ord="hoch" data-ord-key="mk:{n}" disabled={i === 0} aria-label={L(`${n} nach oben`, `Move ${n} up`)} onclick={() => schiebe(i, -1)}><Icon n="hoch" /></button>
            <button class="k klein" type="button" data-ord="runter" data-ord-key="mk:{n}" disabled={i === p.schluessel.length - 1} aria-label={L(`${n} nach unten`, `Move ${n} down`)} onclick={() => schiebe(i, 1)}><Icon n="runter" /></button></li>{/each}</ol>
      {/if}</fieldset>
    <fieldset class="as-gruppe"><legend>{L('2. Wie viele gleiche Fälle mindestens (k)?', '2. At least how many identical cases (k)?')}</legend>
      <div class="as-chips" role="radiogroup" aria-label="k">{#each SCHUTZ_K as k}<label data-begriff="mikrodaten-schuetzen" class="as-chip"><input type="radio" name="mk-k" value={k} checked={p.k === k} onchange={() => (p.k = k)}>{k}{k === 3 ? L(' (Standard)', ' (default)') : ''}</label>{/each}</div>
      {#if schutzHatGewicht()}<label data-begriff="gewichtung" class="as-eins"><input type="checkbox" bind:checked={p.mitGewicht}><span>{L(`Gewicht des Projekts (${s.gewicht?.spalte}) in den Kennzahlen mitrechnen`, `Include the project weight (${s.gewicht?.spalte}) in the figures`)}</span></label>{/if}</fieldset>
    <fieldset class="as-gruppe"><legend>{L('3. Schritte (alle nur auf Wunsch)', '3. Steps (all optional)')}</legend>
      <div class="as-feld"><span class="lbl">{L('Direkte Kennungen entfernen (Name, Adresse, Kennnummer)', 'Remove direct identifiers (name, address, ID)')}</span>
        <ul class="as-liste">{#each kennungen as c (c.name)}<li class:an={p.entfernen.includes(c.name)}><label><input type="checkbox" checked={p.entfernen.includes(c.name)} onchange={(e) => kennungWahl(c.name, (e.currentTarget as HTMLInputElement).checked)}><span>{c.name}</span></label></li>{/each}</ul></div>
      <div class="as-feld"><span class="lbl">{L('Ausreißer kappen (Werte oben oder unten auf eine Grenze setzen)', 'Cap outliers (set values at the top or bottom to a limit)')}</span>
        {#if p.kappen.length}<ul class="mk-reihe">{#each p.kappen as k, i}<li><span class="mk-name">{k.spalte}: {kappText(k)}</span><button class="k klein" type="button" aria-label={L(`Regel für ${k.spalte} entfernen`, `Remove the rule for ${k.spalte}`)} onclick={() => (p.kappen = p.kappen.filter((_, j) => j !== i))}><Icon n="x" /></button></li>{/each}</ul>{/if}
        <div class="as-bausteine">
          <select id="mk-spalte" aria-label={L('Spalte', 'Column')} bind:value={neu.spalte}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlen as c}<option value={c.name}>{c.name}</option>{/each}</select>
          <select id="mk-seite" aria-label={L('Seite', 'Side')} value={neu.seite} onchange={(e) => seite((e.currentTarget as HTMLSelectElement).value as 'oben' | 'unten')}><option value="oben">{L('oben kappen', 'cap at the top')}</option><option value="unten">{L('unten kappen', 'cap at the bottom')}</option></select>
          <select id="mk-modus" aria-label={L('Art der Grenze', 'Kind of limit')} value={neu.modus} onchange={(e) => modus((e.currentTarget as HTMLSelectElement).value as 'perzentil' | 'grenze')}><option value="perzentil">{L('Perzentil (%)', 'Percentile (%)')}</option><option value="grenze">{L('feste Grenze', 'fixed limit')}</option></select>
          <input id="mk-wert" class="as-schmal" type="text" inputmode="decimal" autocomplete="off" aria-label={L('Wert', 'Value')} bind:value={neu.wert}>
          <button id="mk-kappen-dazu" class="k" type="button" disabled={!neu.spalte || !wertOk} onclick={kappungDazu}><Icon n="plus" />{L('Regel hinzufügen', 'Add rule')}</button></div></div>
      <label data-begriff="mikrodaten-schuetzen" class="as-eins"><input id="mk-lokal" type="checkbox" bind:checked={p.lokal}><span>{L(`Lokal unterdrücken: Bei Fällen mit weniger als ${p.k} gleichen Fällen wird die am wenigsten wichtige Angabe geleert, bis es reicht.`, `Local suppression: for cases with fewer than ${p.k} identical cases, the least important entry is cleared until it is enough.`)}</span></label></fieldset>
    <div class="knopfzeile"><button id="mk-pruefen" class="k haupt" type="button" disabled={!p.schluessel.length || lad.aktiv} onclick={pruefen}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{L('Prüfen', 'Check')}</button></div>
  {/snippet}
  {#snippet vorschau()}
    {#if !vorher}<p class="as-hilfe">{L('Sobald ein Schlüsselmerkmal gewählt ist, stehen hier die Kennzahlen.', 'As soon as a key variable is chosen, the figures appear here.')}</p>
    {:else}
      <p class="as-satz" id="mk-vorher"><b>{L('Vorher: ', 'Before: ')}</b>{kennzahlenSatz(vorher)}</p>
      {#if lad.sichtbar}<p role="status"><Rechnet text={L('Die Schritte werden gerechnet …', 'The steps are being calculated …')} /></p>{/if}
      {#if ok}
        <p class="as-satz" id="mk-nachher"><b>{L('Nachher: ', 'After: ')}</b>{kennzahlenSatz(ok.nachher)}</p>
        <h4>{L('Protokoll', 'Log')}</h4>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <pre id="mk-protokoll" class="mk-prot" tabindex="0" aria-label={L('Protokoll zum Kopieren', 'Log to copy')}>{protokoll}</pre>
        <div class="knopfzeile"><button id="mk-kopieren" class="k" type="button" onclick={kopieren}><Icon n="kopieren" />{L('Protokoll kopieren', 'Copy log')}</button></div>
      {:else if aktuell && !ok}<p class="as-warn" role="alert">{aktuell.satz}</p>{/if}
    {/if}
  {/snippet}
</AssistentRahmen>

<style>
  .mk-reihe { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a1); max-width: 420px; }
  .mk-reihe li { display: flex; align-items: center; gap: var(--a2); }
  .mk-name { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .mk-prot { margin: 0; padding: var(--a3); overflow: auto; background: var(--blatt-2); font: .85rem/1.5 var(--schrift-ui); white-space: pre-wrap; max-width: var(--breite-text); border-radius: var(--r-klein); }
  .mk-prot:focus-visible { box-shadow: var(--fokus-ring); }
</style>
