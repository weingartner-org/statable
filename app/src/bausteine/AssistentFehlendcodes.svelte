<script lang="ts">
  import { s, L, Lp, d } from '../lib/sitzung.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { leseFehlendCodes } from '../lib/eingabe';
  import { fehlendcodesBefehl } from '../lib/datenassistentc';
  import { fehlerSatz } from '../lib/datenassistentsaetze';
  import { wendeAn } from '../lib/datenassistentlauf';
  import { komma } from '../lib/ergebnis';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';

  /**
   * „Fehlendcodes setzen“ (Später S-C, Fachblatt 4.2): Codes wie -9 oder -99 als „keine Angabe“ markieren. Nur die Bedeutung ändert sich, nie ein Wert; umkehrbar.
   * Fehlende Werte ERSETZEN (Spaltenmittel, Schätzung) gibt es hier absichtlich nicht.
   */
  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let aufheben = $state(false);
  let gewaehlt = $state<string[]>([]);
  let codesText = $state('');
  const namen = $derived(s.spalten.map(x => x.name));
  const ordnung = $derived(namen.filter(n => gewaehlt.includes(n)));
  const codes = $derived.by((): number[] | null => {
    if (aufheben) return [];
    const t = leseFehlendCodes(codesText).map(x => (x.trim() !== '' && Number.isFinite(Number(x)) ? Number(x) : NaN));
    return t.length && !t.some(Number.isNaN) ? t : null;
  });
  const ergebnis = $derived.by((): { syntax: string; vorschau: ReturnType<typeof fehlendcodesBefehl>['vorschau']; meldungen: ReturnType<typeof fehlendcodesBefehl>['meldungen'] } | { problem: string } => {
    if (!ordnung.length) return { problem: L('Mindestens eine Spalte wählen.', 'Choose at least one column.') };
    if (!codes) return { problem: L('Welche Zahlen als „keine Angabe“ gelten sollen, ist noch nicht eingetragen (zum Beispiel -9, -99).', 'The numbers that stand for "no answer" are not entered yet (for example -9, -99).') };
    try { const b = fehlendcodesBefehl(daten, { spalten: ordnung, codes }); return b.syntax ? b : { problem: L('Für diese Spalten lässt sich nichts markieren.', 'Nothing can be marked for these columns.') }; }
    catch (f) { return { problem: fehlerSatz(f) }; }
  });
  const syntax = $derived('syntax' in ergebnis ? ergebnis.syntax : '');
  const lad = new Laedt();
  async function anwenden() { if (syntax) await lad.mit(() => wendeAn(aufheben ? L('Markierung „keine Angabe“ aufgehoben', 'Marking "no answer" removed') : L(`Fehlendcodes gesetzt (${codesText.trim()})`, `Missing codes set (${codesText.trim()})`), syntax)); }
  const jetzt = (c: Spalte) => (c.fehlendText ? c.fehlendText.replace(/\s*;\s*/g, ', ') : '-');
  const mw = (v: number | null) => (v === null ? '-' : komma(v));
</script>

<AssistentRahmen id="fehlendcodes" titel={L('Fehlendcodes setzen', 'Set missing codes')} befehlName={L('Fehlendcodes setzen', 'Set missing codes')}
  einleitung={d('Manche Umfrage-Werkzeuge schreiben Zahlen wie -9 oder -99 für „keine Antwort“. Rechnet man damit, verfälschen sie jeden Mittelwert. Hier markierst du solche Zahlen als „keine Angabe“. Kein Wert wird geändert, nur seine Bedeutung; „Rückgängig“ stellt alles wieder her.', 'Manche Umfrage-Werkzeuge schreiben Zahlen wie -9 oder -99 für „keine Antwort“. Rechnet man damit, verfälschen sie jeden Mittelwert. Hier markieren Sie solche Zahlen als „keine Angabe“. Kein Wert wird geändert, nur seine Bedeutung; „Rückgängig“ stellt alles wieder her.', 'Some survey tools write numbers like -9 or -99 for "no answer". Calculating with them distorts every mean. Here you mark such numbers as "no answer". No value is changed, only its meaning; "Undo" restores everything.')}
  {syntax} problem={'problem' in ergebnis ? ergebnis.problem : ''}
  hinweise={[L('Statable schätzt keine fehlenden Antworten. Wo eine Antwort fehlt, bleibt sie leer; Mittelwerte und Tests nehmen die vorhandenen Antworten.', 'Statable does not estimate missing answers. Where an answer is missing it stays empty; means and tests use the answers that are there.'),
    ...('meldungen' in ergebnis ? ergebnis.meldungen.map(m => L(`In ${m.spalte} kommt zwischen den Codes ein gültiger Wert vor. Die Spalte bleibt unmarkiert; die Codes lassen sich einzeln eintippen (höchstens drei).`, `In ${m.spalte} a valid value lies between the codes. The column stays unmarked; the codes can be entered one by one (three at most).`)) : [])]}
  anwendenText={aufheben ? L('Markierung aufheben', 'Remove marking') : L('Als „keine Angabe“ markieren', 'Mark as "no answer"')} anwenden={anwenden} kannAnwenden={!!syntax} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <div class="as-feld"><span class="lbl" id="fc-modus">{L('Was soll geschehen?', 'What should happen?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="fc-modus">
        <label data-begriff="fehlendcode"><input type="radio" name="fc-modus" value={false} bind:group={aufheben}>{L('Codes als „keine Angabe“ markieren', 'Mark codes as "no answer"')}</label>
        <label data-begriff="fehlendcode"><input type="radio" name="fc-modus" value={true} bind:group={aufheben}>{L('Markierung aufheben', 'Remove the marking')}</label></div></div>
    <fieldset class="as-gruppe"><legend>{L('Welche Spalten?', 'Which columns?')}</legend>
      <ul class="as-liste">{#each zahlen as c (c.name)}<li class:an={gewaehlt.includes(c.name)}><label><input type="checkbox" value={c.name} bind:group={gewaehlt}><span>{c.name}{#if c.bezeichnung}<small>{c.bezeichnung}</small>{/if}<small>{L('jetzt: ', 'now: ')}{jetzt(c)}</small></span></label></li>{/each}</ul>
      <div class="knopfzeile"><button class="k leise" type="button" onclick={() => (gewaehlt = zahlen.map(c => c.name))}>{L('Alle Zahlenspalten', 'All number columns')}</button><button class="k leise" type="button" onclick={() => (gewaehlt = [])}>{L('Keine', 'None')}</button></div>
    </fieldset>
    {#if !aufheben}
      <div class="as-feld"><label for="fc-codes">{L('Diese Zahlen bedeuten „keine Angabe“', 'These numbers mean "no answer"')}</label>
        <input id="fc-codes" type="text" autocomplete="off" placeholder={L('z. B. -9, -1  oder  -99', 'e.g. -9, -1  or  -99')} bind:value={codesText}>
        <span class="as-hilfe">{L('Bei mehr als drei Codes (zum Beispiel -1, -2, -3, -8, -9) legt Statable einen Bereich an („-9 bis -1“), aber nur, wenn darin keine gültige Antwort liegt.', 'With more than three codes (for example -1, -2, -3, -8, -9) Statable sets a range ("-9 to -1"), but only if no valid answer lies within it.')}</span></div>
    {/if}
  {/snippet}
  {#snippet vorschau()}
    {#if 'vorschau' in ergebnis && !aufheben && ergebnis.vorschau.length}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Wirkung der Markierung', 'Effect of the marking')}>
        <table class="as-tab"><thead><tr><th scope="col">{L('Spalte', 'Column')}</th><th scope="col" class="zahl">{L('Betroffene Fälle', 'Affected cases')}</th><th scope="col" class="zahl">{L('Mittelwert vorher', 'Mean before')}</th><th scope="col" class="zahl">{L('Mittelwert nachher', 'Mean after')}</th><th scope="col" class="zahl">{L('Gültige Werte danach', 'Valid values after')}</th></tr></thead>
          <tbody>{#each ergebnis.vorschau as z}<tr><td>{z.spalte}</td><td class="zahl">{z.betroffen}</td><td class="zahl">{mw(z.mittelVorher)}</td><td class="zahl">{mw(z.mittelNachher)}</td><td class="zahl">{z.n}</td></tr>{/each}</tbody></table></div>
      <p class="as-hilfe">{Lp(ergebnis.vorschau.length, 'Der Mittelwert ändert sich so.', 'Die Mittelwerte ändern sich so.', 'The mean changes like this.', 'The means change like this.')}</p>
    {:else}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald Spalten und Codes gewählt sind.', 'The preview appears as soon as columns and codes are chosen.')}</p>{/if}
  {/snippet}
</AssistentRahmen>
