<script lang="ts">
  import { s, L, d } from '../lib/sitzung.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import { pfeil } from '../i18n/profil';
  import { dateiname } from '../lib/dateiname';
  import { artText, nichtGrundText, andereArtText, zeitText, quelleText, vermerkText, protokollCsv, quellenZeilen } from '../lib/protokollsaetze';

  /**
   * Protokoll jeder Datenänderung (Abschnitt 6, Teil B). Die Vorlage steht seit Stufe 7 auf der Seite „Vorlage“ (Projektmenü). Das Protokoll gilt für jede Änderung im Projekt, nicht nur für Vorlagen; es wird nie gelöscht.
   */
  function herunter(inhalt: string, name: string, typ: string) {
    const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function csv() { herunter(protokollCsv(s.protokoll, s.datei), `${dateiname(s.projekt?.name ?? '')} - ${L('Protokoll', 'Log')}.csv`, 'text/csv;charset=utf-8'); }
</script>

<div class="tisch ohne-rand"><section class="blatt rund prot" aria-labelledby="prot-t">
  <SeitenKopf titelId="prot-t" titel={L('Protokoll der Datenänderungen', 'Log of data changes')} hilfe={{ id: 'vorlage-protokoll', text: L('Hilfe zum Protokoll', 'Help on the log') }} />
  <p class="heft-text">{L('Hier steht jede Änderung an den Daten mit Zeitpunkt und Zahl der betroffenen Zeilen. Rückgängig gemachte Schritte bleiben mit dem Vermerk „zurückgenommen“ stehen; das Protokoll wird nie gelöscht. Es enthält keine Werte aus den Daten.', 'Every change to the data is listed here with the time and the number of rows affected. Undone steps stay listed with the note "undone"; the log is never deleted. It contains no values from the data.')}</p>
  {#if s.protokollLuecke}<p class="prot-hinweis" role="note">{L('Das Protokoll beginnt mit dieser Fassung von Statable. Änderungen davor stehen nicht darin.', 'The log starts with this version of Statable. Changes before that are not in it.')}</p>{/if}
  {#if s.datei?.eurostat}
    <div class="prot-datei" role="note">{#each quellenZeilen(s.datei) as z}<p>{z}</p>{/each}
      {#if s.datei.sha256}<p>{L('Prüfsumme der Antwort (SHA-256):', 'Checksum of the answer (SHA-256):')} <code>{s.datei.sha256}</code></p>{:else}<p>{L('Die Prüfsumme ließ sich in diesem Browser nicht bilden.', 'This browser could not form the checksum.')}</p>{/if}</div>
  {:else if s.datei}<p class="prot-datei">{L(`Daten aus der Datei ${s.datei.name}.`, `Data from the file ${s.datei.name}.`)} {#if s.datei.sha256}<span>{L('Prüfsumme (SHA-256):', 'Checksum (SHA-256):')} <code>{s.datei.sha256}</code></span>{:else}<span>{L('Die Prüfsumme ließ sich in diesem Browser nicht bilden.', 'This browser could not form the checksum.')}</span>{/if}</p>
  {:else}<p class="prot-datei">{L('Für diese Daten gibt es keine Prüfsumme einer Datei (Beispiel, Eingabe oder umstrukturiert).', 'There is no file checksum for these data (example, typed in or reshaped).')}</p>{/if}

  {#if s.protokoll.length}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich: mit der Tastatur erreichbar) -->
    <div class="prot-huelle" role="region" tabindex="0" aria-label={L('Protokoll', 'Log')}>
      <table class="prot-tabelle">
        <thead><tr><th scope="col">{L('Nr.', 'No.')}</th><th scope="col">{L('Art', 'Type')}</th><th scope="col">{L('Spalten', 'Columns')}</th><th scope="col">{L('Zeilen betroffen', 'Rows affected')}</th><th scope="col">{L('Zeilen vorher und nachher', 'Rows before and after')}</th><th scope="col">{L('Zeitpunkt', 'Time')}</th><th scope="col">{L('Quelle', 'Source')}</th><th scope="col">{L('Vermerk', 'Note')}</th></tr></thead>
        <tbody>
          {#each s.protokoll as e (e.nr)}
            <tr class:zurueck={!!e.zurueck}>
              <td>{e.nr}</td><td>{artText(e.art)}</td><td>{e.spalten.join(', ')}</td><td>{e.betroffen ?? ''}</td><td>{e.art === 'vorlage' ? '' : `${e.vorher} ${pfeil()} ${e.nachher}`}</td><td>{zeitText(e.zeit)}</td><td>{quelleText(e.quelle)}</td><td>{vermerkText(e)}</td>
            </tr>
            {#if e.vorlage}
              <tr class="prot-detail"><td></td><td colspan="7"><span>{L('Vorlage:', 'Template:')} {e.vorlage.datei}</span> <span>{L('Schritt', 'Step')} {e.vorlage.schritt}</span>
                {#if e.vorlage.pruefsummeVorlage}<span>{L('Prüfsumme der Vorlage:', 'Template checksum:')} <code>{e.vorlage.pruefsummeVorlage}</code></span>{/if}
                {#if e.vorlage.pruefsummeDaten}<span>{L('Prüfsumme der neuen Datei:', 'Checksum of the new file:')} <code>{e.vorlage.pruefsummeDaten}</code></span>{/if}</td></tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {:else}<p class="heft-text prot-leer">{L('Noch keine Änderung an den Daten.', 'No change to the data yet.')}</p>{/if}
  <div class="knopfzeile prot-knoepfe"><button class="k" type="button" disabled={!s.protokoll.length} onclick={csv}>{L('Als CSV speichern', 'Save as CSV')}</button></div>


  <p class="heft-text prot-vorlagehinweis">{d('Mit einer Vorlage wiederholst du alle Schritte auf einer neuen Datei:', 'Mit einer Vorlage wiederholen Sie alle Schritte auf einer neuen Datei:', 'A template repeats all steps on a new file:')} <a href="#vorlage">{L('Projektmenü → „Vorlage speichern oder anwenden …“', 'Project menu → "Save or apply a template …"')}</a>.</p>
</section></div>

<style>
  .prot { padding-bottom: var(--a6); }
  .prot-hinweis { margin: var(--a3) 0; padding: var(--a2) var(--a3); border-radius: var(--r-klein); }
  .prot-hinweis { border-inline-start: 3px solid var(--hinweis-linie); background: var(--hinweis-hell); color: var(--hinweis); }
  .prot-datei { color: var(--tinte-2); overflow-wrap: anywhere; }
  .prot-datei code, .prot-detail code { overflow-wrap: anywhere; word-break: break-all; }
  .prot-huelle { overflow-x: auto; max-width: 100%; border: 1px solid var(--linie); border-radius: var(--r-klein); margin: var(--a3) 0; }
  .prot-huelle:focus-visible { box-shadow: var(--fokus-ring); }
  .prot-tabelle { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .prot-tabelle th, .prot-tabelle td { text-align: start; vertical-align: top; padding: var(--a1) var(--a2); border-bottom: 1px solid var(--linie); }
  .prot-tabelle th { white-space: nowrap; background: var(--blatt-gehoben); }
  .prot-tabelle tr.zurueck td { color: var(--tinte-2); text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--tinte-2) 50%, transparent); }
  .prot-tabelle tr.zurueck td:last-child { text-decoration: none; }
  .prot-detail td { color: var(--tinte-2); border-bottom: 1px solid var(--linie); }
  .prot-detail span { display: inline-block; margin-inline-end: var(--a3); }
  .prot-knoepfe { margin-bottom: var(--a3); }
  .prot-vorlagehinweis { margin-top: var(--a4); }
</style>
