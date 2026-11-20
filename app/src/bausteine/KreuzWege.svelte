<script lang="ts">
  import { L, Lp, d } from '../lib/sitzung.svelte';
  import { masseVorschlag, type MassArt, type SpaltenArt } from '../lib/zusammenhangsmasse';
  import { MH_MAX_SCHICHTEN } from '../lib/mantelhaenszel';
  import { prozentBasen, type ZusatzWahl } from '../lib/aequirci';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * „Weitere Wege“ der Kreuztabelle (Später, Welle S-B): „Stärke des Zusammenhangs“ (M5) und „Nach dritter Spalte aufteilen“ (M3, Mantel-Haenszel).
   * Reine Wahl; gerechnet wird beim Rechnen des Blatts (Blatt.svelte, berechneBlatt), die Anzeige steht im Ergebnis (KreuzZusatz.svelte).
   * `art`/`stufen` sind das Messniveau und die Zahl der Stufen der beiden Spalten; `zeile` ist die Gruppen-Spalte (Zeilen der Tabelle), `spalte` die gezählte Spalte.
   */
  let { zus = $bindable(), zeile, spalte, textcodes, schichtSpalten, umfrage = false }: {
    zus: ZusatzWahl;
    zeile: { name: string; art: SpaltenArt; stufen: number };
    spalte: { name: string; art: SpaltenArt; stufen: number };
    /** Eine der Spalten ist eine Textspalte, die als ordinal gilt (Buchstabenfolge statt Reihenfolge der Stufen) */ textcodes: boolean;
    /** Spalten mit 2 bis 20 Stufen, die als Schicht infrage kommen: Name, Anzeigename, Zahl der Stufen */ schichtSpalten: { name: string; label: string; stufen: number }[];
    umfrage?: boolean;
  } = $props();

  const vorschlag = $derived(masseVorschlag({ zeile: zeile.art, spalte: spalte.art, zeilen: zeile.stufen, spalten: spalte.stufen, textcodesAlphabetisch: textcodes }));
  /** Die Maße, die diese Tabelle anbietet, in fester Reihenfolge: erst die vorgeschlagenen, dann die zuschaltbaren. */
  const angebot = $derived<MassArt[]>([...vorschlag.vorgeschlagen, ...vorschlag.zuschaltbar]);
  const masse = $derived(zus.masse ?? { an: false, arten: [] as MassArt[] });
  const NAMEN: Record<MassArt, () => string> = {
    tauB: () => 'Kendalls τb', tauC: () => 'Kendalls τc', gamma: () => 'Gamma (γ)', somersD: () => "Somers' d", lambda: () => 'Lambda (λ)', uc: () => L('Unsicherheitskoeffizient (UC)', 'Uncertainty coefficient (UC)')
  };
  const HILFE: Record<MassArt, () => string> = {
    tauB: () => L('τb zählt Bindungen mit und kann nur in quadratischen Tabellen ±1 erreichen. Es passt für zwei geordnete Variablen mit gleich vielen Stufen.', 'τb includes ties and can reach ±1 only in square tables. It fits two ordered variables with the same number of levels.'),
    tauC: () => L('τc ist für Tabellen mit ungleich vielen Zeilen und Spalten gebaut.', 'τc is built for tables with unequal numbers of rows and columns.'),
    somersD: () => L('d fragt: Wie viel mehr gleichgerichtete als gegenläufige Paare gibt es, wenn eine Variable die abhängige ist? Es hat zwei Richtungen; Statable zeigt beide.', 'd asks: how many more concordant than discordant pairs are there when one variable is the dependent one? It has two directions; Statable shows both.'),
    gamma: () => L('Gamma ignoriert Paare mit gleichem Wert und fällt darum meist höher aus als τb. In einer Tabelle mit zwei mal zwei Feldern ist Gamma dasselbe wie Yules Q.', 'Gamma ignores pairs with the same value and so usually comes out higher than τb. In a table with two by two cells, gamma is the same as Yule\'s Q.'),
    lambda: () => L('Lambda zeigt, wie viele Fehler beim Vorhersagen der häufigsten Antwort wegfallen, wenn man die Gruppe kennt. Es ist kein Stärkemaß und kann 0 sein, obwohl es einen Zusammenhang gibt.', 'Lambda shows how many errors in predicting the most frequent answer disappear when the group is known. It is not a measure of strength and can be 0 although there is an association.'),
    uc: () => L('Der Unsicherheitskoeffizient (Theil) zeigt, welchen Anteil der Unsicherheit (Entropie) über die eine Variable die andere aufklärt.', 'The uncertainty coefficient (Theil) shows what share of the uncertainty (entropy) about one variable the other one clears up.')
  };
  /** Welche Prozente die Tabelle zeigt (in der Reihenfolge Zeile, Spalte, Gesamt); Voreinstellung nur Zeile. */
  function prozentWahl(k: 'zeile' | 'spalte' | 'gesamt', an: boolean) {
    const jetzt = prozentBasen(zus), neu = (['zeile', 'spalte', 'gesamt'] as const).filter(x => (x === k ? an : jetzt.includes(x)));
    zus.prozent = neu;
  }
  function schalten(an: boolean) {
    const v = masseVorschlag({ zeile: zeile.art, spalte: spalte.art, zeilen: zeile.stufen, spalten: spalte.stufen, textcodesAlphabetisch: textcodes });
    zus.masse = { an, arten: an ? [...v.vorgeschlagen] : [] };
  }
  function art(a: MassArt, an: boolean) {
    const neu = an ? [...masse.arten.filter(x => x !== a), a] : masse.arten.filter(x => x !== a);
    zus.masse = { an: masse.an, arten: neu };
  }
</script>

<div class="zusatz-wahl" style="margin-top:var(--a3)">
  {#if !umfrage}
  <fieldset class="zusatz-gruppe"><legend>{L('Prozente in der Tabelle', 'Percentages in the table')}</legend>
    <p class="hilfe">{L('Voreingestellt steht in jeder Zeile, wie sich die Personen mit dieser Gruppe auf die Antworten verteilen (Zeilenprozent). Wie die Gruppen antworten, zeigt das Spaltenprozent.', 'By default each row shows how the people of this group are spread over the answers (row percent). How the groups answer is shown by the column percent.')}</p>
    {#each [['zeile', L('Prozent in der Zeile', 'Percent within the row')], ['spalte', L('Prozent in der Spalte', 'Percent within the column')], ['gesamt', L('Prozent von allen (Gesamt)', 'Percent of all (total)')]] as [k, text]}
      <div class="eingabe"><label class="schalter"><input type="checkbox" checked={prozentBasen(zus).includes(k as 'zeile')} onchange={(ev) => prozentWahl(k as 'zeile' | 'spalte' | 'gesamt', ev.currentTarget.checked)}>{text}</label></div>
    {/each}
  </fieldset>
  {/if}
  <fieldset class="zusatz-gruppe"><legend>{L('Stärke des Zusammenhangs', 'Strength of the association')}</legend>
    <label data-begriff="zusammenhangsmasse" class="schalter"><input type="checkbox" checked={masse.an} onchange={(ev) => schalten(ev.currentTarget.checked)} disabled={vorschlag.hinweis === 'korrelation'}>{L('Stärke des Zusammenhangs berechnen (Gamma, Tau, Somers\' d, Lambda, Unsicherheitskoeffizient)', 'Calculate the strength of the association (gamma, tau, Somers\' d, lambda, uncertainty coefficient)')}</label>
    {#if umfrage && masse.an}<p class="hilfe" role="alert">{L('Mit einem Umfragegewicht ist dieser Abschnitt gesperrt: Standardfehler und Tests brauchen den Stichprobenplan.', 'With a survey weight this section is blocked: standard errors and tests need the sampling design.')}</p>{/if}
    {#if vorschlag.hinweis === 'korrelation'}
      <p class="hilfe">{d('Eine Spalte hat zu viele verschiedene Zahlen für eine Kreuztabelle. Für Zahlen passt die Korrelation (Frage „Hängen zwei Dinge zusammen?“).', 'Eine Spalte hat zu viele verschiedene Zahlen für eine Kreuztabelle. Für Zahlen passt die Korrelation (Frage „Hängen zwei Dinge zusammen?“).', 'One column has too many different numbers for a crosstab. For numbers, correlation is the better fit (question "Are two things related?").')}</p>
    {:else if masse.an}
      {#if vorschlag.hinweis === 'rang-gruppen'}<p class="hilfe">{d('Zwei Gruppen und eine geordnete Antwort: Dafür passt ein Rangtest besser (Frage „Unterscheiden sich Gruppen?“, Mann-Whitney) mit dem Effektmaß d = 2 · AUC − 1. Hier gibt es dazu nur die Maße für Kategorien.', 'Zwei Gruppen und eine geordnete Antwort: Dafür passt ein Rangtest besser (Frage „Unterscheiden sich Gruppen?“, Mann-Whitney) mit dem Effektmaß d = 2 · AUC − 1. Hier gibt es dazu nur die Maße für Kategorien.', 'Two groups and an ordered answer: a rank test fits better (question "Do groups differ?", Mann-Whitney) with the effect size d = 2 · AUC − 1. Here there are only the measures for categories.')}</p>{/if}
      {#if vorschlag.hinweis === 'ordinal-reihenfolge'}<p class="hilfe" role="alert">{d('Eine Spalte besteht aus Text. Statable ordnet Text nach dem Alphabet, nicht nach dem Sinn („hoch“, „mittel“, „niedrig“ wären durcheinander). Ordinale Maße hängen von der Reihenfolge ab: Gib den Stufen Zahlen mit Beschriftung (Spalten beschreiben), bevor du sie liest.', 'Eine Spalte besteht aus Text. Statable ordnet Text nach dem Alphabet, nicht nach dem Sinn („hoch“, „mittel“, „niedrig“ wären durcheinander). Ordinale Maße hängen von der Reihenfolge ab: Geben Sie den Stufen Zahlen mit Beschriftung (Spalten beschreiben), bevor Sie sie lesen.', 'A column consists of text. Statable orders text alphabetically, not by meaning ("high", "medium", "low" would be mixed up). Ordinal measures depend on the order: give the levels numbers with labels (describe columns) before you read them.')}</p>{/if}
      <p class="hilfe">{!angebot.length ? L('Für diese Spalten gibt es hier kein passendes Maß.', 'There is no suitable measure here for these columns.') : vorschlag.vorgeschlagen.length
        ? d('Das vorgeschlagene Maß ist angekreuzt; die anderen kannst du zuschalten. Statable wählt nach dem Niveau der beiden Spalten.', 'Das vorgeschlagene Maß ist angekreuzt; die anderen können Sie zuschalten. Statable wählt nach dem Niveau der beiden Spalten.', 'The suggested measure is ticked; you can switch on the others. Statable chooses according to the level of the two columns.')
        : d('Bei Gruppen ohne Reihenfolge schlägt Statable kein Maß vor (Cramérs V steht schon im Ergebnis). Kreuze an, was du zusätzlich sehen willst.', 'Bei Gruppen ohne Reihenfolge schlägt Statable kein Maß vor (Cramérs V steht schon im Ergebnis). Kreuzen Sie an, was Sie zusätzlich sehen möchten.', 'For groups without an order Statable suggests no measure (Cramér\'s V is already in the result). Tick what you also want to see.')}</p>
      {#each angebot as a (a)}
        <div class="eingabe"><label class="schalter"><input type="checkbox" checked={masse.arten.includes(a)} onchange={(ev) => art(a, ev.currentTarget.checked)} aria-describedby="masse-h-{a}">{NAMEN[a]()}{#if vorschlag.vorgeschlagen.includes(a)} ({L('vorgeschlagen', 'suggested')}){/if}</label>
          <p id="masse-h-{a}" class="hilfe">{HILFE[a]()}</p></div>
      {/each}
      {#if !masse.arten.length && angebot.length}<p class="hilfe">{L('Kreuze mindestens ein Maß an, sonst gibt es nichts zu berechnen.', 'Tick at least one measure, otherwise there is nothing to calculate.')}</p>{/if}
      <p class="hilfe">{L('Das Intervall nutzt den Standardfehler bei der gefundenen Stärke, der Test den Standardfehler unter „kein Zusammenhang“. Darum passen Intervall und p-Wert nicht immer genau zusammen.', 'The interval uses the standard error at the strength found; the test uses the standard error under "no association". So interval and p value do not always match exactly.')}</p>
    {/if}
    <p class="hilfe"><HilfeLink id="zusammenhangsmasse" text={L('Hilfe: Stärke des Zusammenhangs', 'Help: strength of the association')} /></p>
  </fieldset>
</div>
<div class="zusatz-wahl" style="margin-top:var(--a3)">
  <fieldset class="zusatz-gruppe"><legend>{L('Nach dritter Spalte aufteilen (Schicht)', 'Split by a third column (stratum)')}</legend>
    {#if schichtSpalten.length}
      <div class="eingabe" style="max-width:380px"><label for="kreuz-schicht">{L('Schichtspalte', 'Stratum column')}</label>
        <select id="kreuz-schicht" aria-describedby="kreuz-schicht-h" onchange={(ev) => (zus.schicht = ev.currentTarget.value)}>
          <option value="" selected={!zus.schicht}>{L('keine (nicht aufteilen)', 'none (do not split)')}</option>
          {#each schichtSpalten as sp (sp.name)}<option value={sp.name} selected={zus.schicht === sp.name}>{sp.label} ({Lp(sp.stufen, `${sp.stufen} Stufe`, `${sp.stufen} Stufen`, `${sp.stufen} level`, `${sp.stufen} levels`)})</option>{/each}
        </select>
      </div>
      <p id="kreuz-schicht-h" class="hilfe">{zus.schicht
        ? d('Statable prüft mit dem Mantel-Haenszel-Test, ob der Zusammenhang bleibt, wenn du die dritte Größe festhältst. Bei zwei mal zwei Feldern gibt es dazu ein gemeinsames Odds Ratio, die Tabellen je Schicht und ein Bild der Odds Ratios der Schichten; bei größeren Tabellen den verallgemeinerten Test.', 'Statable prüft mit dem Mantel-Haenszel-Test, ob der Zusammenhang bleibt, wenn Sie die dritte Größe festhalten. Bei zwei mal zwei Feldern gibt es dazu ein gemeinsames Odds Ratio, die Tabellen je Schicht und ein Bild der Odds Ratios der Schichten; bei größeren Tabellen den verallgemeinerten Test.', 'Statable uses the Mantel-Haenszel test to check whether the association remains when you hold the third variable constant. With two by two cells you also get a common odds ratio, the tables per stratum and a picture of the odds ratios of the strata; with larger tables the generalized test.')
        : d(`Wähle eine dritte Spalte mit 2 bis ${MH_MAX_SCHICHTEN} Stufen (zum Beispiel Fach, Schule, Alter in Gruppen), um zu sehen, ob ein Zusammenhang durch sie entstanden ist (Simpson-Paradox).`, `Wählen Sie eine dritte Spalte mit 2 bis ${MH_MAX_SCHICHTEN} Stufen (zum Beispiel Fach, Schule, Alter in Gruppen), um zu sehen, ob ein Zusammenhang durch sie entstanden ist (Simpson-Paradox).`, `Choose a third column with 2 to ${MH_MAX_SCHICHTEN} levels (for example subject, school, age in groups) to see whether an association was created by it (Simpson's paradox).`)}</p>
      {#if umfrage && zus.schicht}<p class="hilfe" role="alert">{L('Mit einem Umfragegewicht ist der Mantel-Haenszel-Test gesperrt: Test und Intervall brauchen den Stichprobenplan.', 'With a survey weight the Mantel-Haenszel test is blocked: test and interval need the sampling design.')}</p>{/if}
    {:else}
      <p class="hilfe">{L(`Keine weitere Spalte mit 2 bis ${MH_MAX_SCHICHTEN} Stufen gefunden, die als Schicht infrage kommt.`, `No further column with 2 to ${MH_MAX_SCHICHTEN} levels found that could serve as a stratum.`)}</p>
    {/if}
    <p class="hilfe"><HilfeLink id="mantel-haenszel" text={L('Hilfe: Mantel-Haenszel', 'Help: Mantel-Haenszel')} /></p>
  </fieldset>
</div>
