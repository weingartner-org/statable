<script lang="ts">
  /**
   * Wörter zählen (Textanalyse, B3 Teil 1b): Wortliste, Schlüsselwort im Kontext, Wörterbuch, typische Wörter je Gruppe.
   * Rechnet sofort im Browser (nur Zählen, keine Deutung, kein Sentiment). Kern: lib/textanalyse.ts. Einstellungen bleiben nur in dieser Ansicht.
   */
  import { L, istEn } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { komma } from '../lib/ergebnis';
  import { csvZelle } from '../lib/protokoll';
  import { herunterladen } from '../lib/export';
  import { STOPPWOERTER, wortliste, kwic, woerterbuchZaehlen, typischeWoerter, type WoerterbuchEintrag } from '../lib/textanalyse';
  import type { QualProjekt } from '../lib/qualprojekt';

  let { q }: { q: QualProjekt } = $props();

  type Teil = 'liste' | 'kwic' | 'buch' | 'typisch';
  let teil = $state<Teil>('liste');
  const teile: { wert: Teil; de: string; en: string }[] = [
    { wert: 'liste', de: 'Welche Wörter kommen oft vor? (Wortliste)', en: 'Which words occur often? (word list)' },
    { wert: 'kwic', de: 'Wie wird ein Wort benutzt? (Schlüsselwort im Kontext)', en: 'How is a word used? (keyword in context)' },
    { wert: 'buch', de: 'Wie oft kommen Wörter meiner Liste vor? (Wörterbuch)', en: 'How often do the words of my list occur? (dictionary)' },
    { wert: 'typisch', de: 'Welche Wörter sind für eine Gruppe typisch? (typische Wörter)', en: 'Which words are typical of a group? (keywords by group)' },
  ];

  /* Welche Dokumente zählen (Vorgabe: alle) */
  let abgewaehlt = $state<string[]>([]);
  const dabei = $derived(q.dokumente.filter(d => !abgewaehlt.includes(d.id)));
  const texte = $derived(dabei.map(d => d.text));
  const umschalten = (id: string) => { abgewaehlt = abgewaehlt.includes(id) ? abgewaehlt.filter(x => x !== id) : [...abgewaehlt, id]; };

  /* Stoppwörter: sichtbar und änderbar */
  let stoppSprache = $state<'de' | 'en' | 'keine'>(istEn() ? 'en' : 'de');
  let stoppText = $state(STOPPWOERTER[istEn() ? 'en' : 'de'].join(' '));
  const stopp = $derived(stoppText.split(/[\s,;]+/).filter(Boolean));
  function stoppWaehlen(s: 'de' | 'en' | 'keine') { stoppSprache = s; stoppText = s === 'keine' ? '' : STOPPWOERTER[s].join(' '); }
  let mindestLaenge = $state(3);
  let mindestAnzahl = $state(2);
  let zeilenMax = $state(50);

  const pr = (v: number) => `${komma(v * 100, 1)} %`;
  const liste = $derived(wortliste(texte, { stopp, mindestLaenge, mindestAnzahl }));
  const listeZeigen = $derived(liste.zeilen.slice(0, Math.max(1, zeilenMax)));

  /* Schlüsselwort im Kontext */
  let suchwort = $state('');
  let breite = $state(5);
  const kwicZeilen = $derived(suchwort.trim() ? kwic(texte, suchwort, Math.max(1, breite)) : []);
  const kwicMax = 200;

  /* Wörterbuch: je Zeile „Name: Wort, Wort*, Wort“ */
  let buchText = $state('');
  const eintraege = $derived<WoerterbuchEintrag[]>(buchText.split('\n').map(z => z.trim()).filter(z => z.includes(':')).map(z => {
    const i = z.indexOf(':'); return { name: z.slice(0, i).trim(), woerter: z.slice(i + 1).split(/[,;]+/).map(w => w.trim()).filter(Boolean) };
  }).filter(e => e.name && e.woerter.length));
  const buch = $derived(eintraege.length && texte.length ? woerterbuchZaehlen(texte, eintraege) : null);

  /* Typische Wörter: jedes Dokument Gruppe A, Gruppe B oder nicht dabei */
  let gruppe = $state<Record<string, 'a' | 'b' | 'n'>>({});
  const gr = (id: string) => gruppe[id] ?? 'n';
  const textA = $derived(dabei.filter(d => gr(d.id) === 'a').map(d => d.text));
  const textB = $derived(dabei.filter(d => gr(d.id) === 'b').map(d => d.text));
  let mindestTypisch = $state(3);
  const typisch = $derived(textA.length && textB.length ? typischeWoerter(textA, textB, { stopp, mindestAnzahl: mindestTypisch }) : null);
  const pText = (p: number) => (p < 0.001 ? '< 0,001' : komma(p, 3));

  function csv(kopf: string[], zeilen: (string | number)[][], name: string) {
    const t = '﻿' + [kopf, ...zeilen].map(z => z.map(csvZelle).join(';')).join('\r\n') + '\r\n';
    herunterladen(new TextEncoder().encode(t), name, 'text/csv;charset=utf-8');
    sage(L('Tabelle als CSV gespeichert.', 'Table saved as CSV.'));
  }
  const dz = (x: number) => komma(x, 6);
</script>

<div class="ta" role="group" aria-label={L('Wörter zählen (Textanalyse)', 'Count words (text analysis)')}>
  <h3 id="ko-ta-t">{L('Wörter zählen (Textanalyse)', 'Count words (text analysis)')}</h3>
  <p class="hilfe">{L('Statable zählt hier nur Wörter. Es deutet nichts und bewertet keine Stimmung. Was die Zahlen bedeuten, entscheiden Sie beim Lesen der Texte.', 'Statable only counts words here. It interprets nothing and does not rate sentiment. What the numbers mean is for you to decide when you read the texts.')}</p>

  {#if !q.dokumente.length}
    <p class="hilfe">{L('Es gibt noch keine Dokumente. Legen Sie zuerst ein Dokument an.', 'There are no documents yet. Add a document first.')}</p>
  {:else}
    <fieldset class="auswahl">
      <legend>{L('Welche Dokumente zählen?', 'Which documents count?')}</legend>
      {#each q.dokumente as d (d.id)}
        <label class="kaestchen"><input type="checkbox" checked={!abgewaehlt.includes(d.id)} onchange={() => umschalten(d.id)}>{d.name}</label>
      {/each}
    </fieldset>

    <fieldset class="auswahl">
      <legend>{L('Ansicht', 'View')}</legend>
      {#each teile as t (t.wert)}
        <label class="radio"><input type="radio" name="ko-ta-teil" value={t.wert} checked={teil === t.wert} onchange={() => (teil = t.wert)}>{L(t.de, t.en)}</label>
      {/each}
    </fieldset>

    {#if teil === 'liste' || teil === 'typisch'}
      <details class="stopp">
        <summary>{L(`Stoppwörter (${stopp.length}) und Mindestlänge`, `Stop words (${stopp.length}) and minimum length`)}</summary>
        <p class="hilfe">{L('Stoppwörter sind häufige Funktionswörter („und“, „der“), die nicht mitgezählt werden. Die Liste ist eine kleine Auswahl; ändern Sie sie nach Bedarf.', 'Stop words are frequent function words (“and”, “the”) that are not counted. The list is a small selection; change it as needed.')}</p>
        <div class="wahlzeile">
          <div class="feld"><label for="ko-ta-sprache">{L('Vorlage', 'Template')}</label>
            <select id="ko-ta-sprache" value={stoppSprache} onchange={(e) => stoppWaehlen(e.currentTarget.value as 'de' | 'en' | 'keine')}>
              <option value="de">{L('Deutsch', 'German')}</option><option value="en">{L('Englisch', 'English')}</option><option value="keine">{L('Keine', 'None')}</option>
            </select></div>
          <div class="feld"><label for="ko-ta-minlen">{L('Mindestlänge (Buchstaben)', 'Minimum length (letters)')}</label><input id="ko-ta-minlen" type="number" min="1" max="20" bind:value={mindestLaenge}></div>
        </div>
        <label for="ko-ta-stopp">{L('Stoppwörter, durch Leerzeichen getrennt', 'Stop words, separated by spaces')}</label>
        <textarea id="ko-ta-stopp" rows="4" bind:value={stoppText}></textarea>
      </details>
    {/if}

    {#if teil === 'liste'}
      <div class="wahlzeile">
        <div class="feld"><label for="ko-ta-minanz">{L('Mindestens so oft', 'At least this often')}</label><input id="ko-ta-minanz" type="number" min="1" bind:value={mindestAnzahl}></div>
        <div class="feld"><label for="ko-ta-max">{L('Höchstens so viele Zeilen', 'At most this many rows')}</label><input id="ko-ta-max" type="number" min="1" max="1000" bind:value={zeilenMax}></div>
      </div>
      <p class="hilfe">{L(`${komma(liste.gesamt, 0)} Wörter gezählt, ${komma(liste.verschieden, 0)} verschiedene, in ${dabei.length} Dokumenten.`, `${komma(liste.gesamt, 0)} words counted, ${komma(liste.verschieden, 0)} different, in ${dabei.length} documents.`)}</p>
      {#if listeZeigen.length}
        <div class="rahmen" role="region" tabindex="0" aria-label={L('Wortliste, seitlich scrollbar', 'Word list, scrollable sideways')}>
          <table class="tab" id="ko-ta-liste">
            <caption>{L(`Die häufigsten ${listeZeigen.length} Wörter`, `The ${listeZeigen.length} most frequent words`)}</caption>
            <thead><tr><th scope="col">{L('Wort', 'Word')}</th><th scope="col">{L('Anzahl', 'Count')}</th><th scope="col">{L('Anteil', 'Share')}</th><th scope="col">{L('In Dokumenten', 'In documents')}</th></tr></thead>
            <tbody>{#each listeZeigen as z (z.wort)}<tr><th scope="row">{z.wort}</th><td>{komma(z.anzahl, 0)}</td><td>{pr(z.anteil)}</td><td>{z.dokumente}</td></tr>{/each}</tbody>
          </table>
        </div>
        <div class="knopfzeile"><button class="k" type="button" onclick={() => csv([L('Wort', 'Word'), L('Anzahl', 'Count'), L('Anteil', 'Share'), L('In Dokumenten', 'In documents')], liste.zeilen.map(z => [z.wort, z.anzahl, dz(z.anteil), z.dokumente]), 'wortliste.csv')}>{L('Ganze Wortliste als CSV', 'Whole word list as CSV')}</button></div>
      {:else}<p class="hilfe">{L('Mit diesen Einstellungen bleibt kein Wort übrig. Senken Sie die Mindestzahl oder die Mindestlänge.', 'No word is left with these settings. Lower the minimum count or length.')}</p>{/if}
    {:else if teil === 'kwic'}
      <div class="wahlzeile">
        <div class="feld"><label for="ko-ta-such">{L('Wort oder Wortfolge', 'Word or phrase')}</label><input id="ko-ta-such" type="text" bind:value={suchwort}></div>
        <div class="feld"><label for="ko-ta-breite">{L('Wörter links und rechts', 'Words left and right')}</label><input id="ko-ta-breite" type="number" min="1" max="30" bind:value={breite}></div>
      </div>
      {#if !suchwort.trim()}<p class="hilfe">{L('Geben Sie ein Wort ein. Statable zeigt jede Stelle, an der es vorkommt, mit dem Text davor und danach.', 'Enter a word. Statable shows every place where it occurs, with the text before and after.')}</p>
      {:else}
        <p class="hilfe">{L(`${kwicZeilen.length} Stellen gefunden.`, `${kwicZeilen.length} places found.`)}{kwicZeilen.length > kwicMax ? L(` Gezeigt werden die ersten ${kwicMax}.`, ` The first ${kwicMax} are shown.`) : ''}</p>
        {#if kwicZeilen.length}
          <div class="rahmen" role="region" tabindex="0" aria-label={L('Stellen, seitlich scrollbar', 'Places, scrollable sideways')}>
            <table class="tab" id="ko-ta-kwic">
              <caption>{L('Stellen mit dem Wort', 'Places with the word')}</caption>
              <thead><tr><th scope="col">{L('Dokument', 'Document')}</th><th scope="col">{L('Davor', 'Before')}</th><th scope="col">{L('Wort', 'Word')}</th><th scope="col">{L('Danach', 'After')}</th></tr></thead>
              <tbody>{#each kwicZeilen.slice(0, kwicMax) as z, i (i)}<tr><th scope="row">{dabei[z.text]?.name ?? ''}</th><td class="links">{z.links}</td><td><strong>{z.treffer}</strong></td><td>{z.rechts}</td></tr>{/each}</tbody>
            </table>
          </div>
          <div class="knopfzeile"><button class="k" type="button" onclick={() => csv([L('Dokument', 'Document'), L('Davor', 'Before'), L('Wort', 'Word'), L('Danach', 'After')], kwicZeilen.map(z => [dabei[z.text]?.name ?? '', z.links, z.treffer, z.rechts]), 'wort-im-kontext.csv')}>{L('Als CSV speichern', 'Save as CSV')}</button></div>
        {/if}
      {/if}
    {:else if teil === 'buch'}
      <p class="hilfe">{L('Schreiben Sie je Zeile einen Namen, einen Doppelpunkt und die Wörter, durch Komma getrennt. Ein Stern am Ende gilt für den Wortanfang: „freund*“ zählt „Freund“, „Freunde“ und „freundlich“. Beispiel: Familie: Mutter, Vater, Eltern, Geschwister', 'Write one line per entry: a name, a colon and the words, separated by commas. A star at the end covers the start of a word: “friend*” counts “friend”, “friends” and “friendly”. Example: Family: mother, father, parents, siblings')}</p>
      <label for="ko-ta-buch">{L('Wörterbuch', 'Dictionary')}</label>
      <textarea id="ko-ta-buch" rows="5" bind:value={buchText}></textarea>
      {#if buch}
        <div class="rahmen" role="region" tabindex="0" aria-label={L('Wörterbuch-Ergebnis, seitlich scrollbar', 'Dictionary result, scrollable sideways')}>
          <table class="tab" id="ko-ta-buch-tab">
            <caption>{L('Treffer je Dokument', 'Hits per document')}</caption>
            <thead><tr><th scope="col">{L('Eintrag', 'Entry')}</th>{#each dabei as d (d.id)}<th scope="col">{d.name}</th>{/each}<th scope="col">{L('Summe', 'Total')}</th><th scope="col">{L('Anteil an allen Wörtern', 'Share of all words')}</th></tr></thead>
            <tbody>
              {#each buch.zeilen as z (z.name)}<tr><th scope="row">{z.name}</th>{#each z.je as n, i (i)}<td>{n}</td>{/each}<td>{z.summe}</td><td>{pr(z.anteil)}</td></tr>{/each}
              <tr><th scope="row">{L('Wörter im Dokument', 'Words in the document')}</th>{#each buch.gesamt as n, i (i)}<td>{n}</td>{/each}<td>{buch.gesamt.reduce((a, b) => a + b, 0)}</td><td></td></tr>
            </tbody>
          </table>
        </div>
        <p class="hilfe">{L('Gezählt werden nur die Wörter aus Ihrer Liste. Ob ein Wort in seinem Satz wirklich das Thema meint, sehen nur Sie beim Lesen.', 'Only the words from your list are counted. Whether a word really refers to the topic in its sentence, only you can see when reading.')}</p>
        <div class="knopfzeile"><button class="k" type="button" onclick={() => csv([L('Eintrag', 'Entry'), ...dabei.map(d => d.name), L('Summe', 'Total'), L('Anteil', 'Share')], buch.zeilen.map(z => [z.name, ...z.je, z.summe, dz(z.anteil)]), 'woerterbuch.csv')}>{L('Als CSV speichern', 'Save as CSV')}</button></div>
      {:else}<p class="hilfe">{L('Noch kein Eintrag. Jede Zeile braucht einen Namen, einen Doppelpunkt und mindestens ein Wort.', 'No entry yet. Every line needs a name, a colon and at least one word.')}</p>{/if}
    {:else}
      <p class="hilfe">{L('Ordnen Sie jedes Dokument der Gruppe A oder B zu. Statable zeigt Wörter, die in einer Gruppe auffallend häufiger vorkommen als in der anderen (Log-Likelihood-Maß G2).', 'Assign each document to group A or B. Statable shows words that occur markedly more often in one group than in the other (log-likelihood measure G2).')}</p>
      <div class="rahmen" role="region" tabindex="0" aria-label={L('Gruppen der Dokumente, seitlich scrollbar', 'Groups of the documents, scrollable sideways')}>
        <table class="tab">
          <caption>{L('Gruppen der Dokumente', 'Groups of the documents')}</caption>
          <thead><tr><th scope="col">{L('Dokument', 'Document')}</th><th scope="col">{L('Gruppe', 'Group')}</th></tr></thead>
          <tbody>{#each dabei as d (d.id)}<tr><th scope="row"><label for={`ko-ta-g-${d.id}`}>{d.name}</label></th><td>
            <select id={`ko-ta-g-${d.id}`} value={gr(d.id)} onchange={(e) => (gruppe = { ...gruppe, [d.id]: e.currentTarget.value as 'a' | 'b' | 'n' })}>
              <option value="n">{L('nicht dabei', 'not included')}</option><option value="a">{L('Gruppe A', 'Group A')}</option><option value="b">{L('Gruppe B', 'Group B')}</option>
            </select></td></tr>{/each}</tbody>
        </table>
      </div>
      <div class="wahlzeile"><div class="feld"><label for="ko-ta-mintyp">{L('Wort mindestens so oft (beide Gruppen zusammen)', 'Word at least this often (both groups together)')}</label><input id="ko-ta-mintyp" type="number" min="1" bind:value={mindestTypisch}></div></div>
      {#if !typisch}<p class="hilfe">{L('Es braucht mindestens ein Dokument in Gruppe A und eins in Gruppe B.', 'At least one document in group A and one in group B is needed.')}</p>
      {:else if !typisch.length}<p class="hilfe">{L('Mit diesen Einstellungen bleibt kein Wort übrig.', 'No word is left with these settings.')}</p>
      {:else}
        <div class="rahmen" role="region" tabindex="0" aria-label={L('Typische Wörter, seitlich scrollbar', 'Keywords, scrollable sideways')}>
          <table class="tab" id="ko-ta-typisch">
            <caption>{L(`Die ${Math.min(30, typisch.length)} auffälligsten Wörter`, `The ${Math.min(30, typisch.length)} most distinctive words`)}</caption>
            <thead><tr><th scope="col">{L('Wort', 'Word')}</th><th scope="col">{L('Typisch für', 'Typical of')}</th><th scope="col">{L('Anzahl in A', 'Count in A')}</th><th scope="col">{L('Anzahl in B', 'Count in B')}</th><th scope="col">G2</th><th scope="col">p</th></tr></thead>
            <tbody>{#each typisch.slice(0, 30) as z (z.wort)}<tr><th scope="row">{z.wort}</th><td>{z.richtung === 'a' ? L('Gruppe A', 'Group A') : L('Gruppe B', 'Group B')}</td><td>{z.a}</td><td>{z.b}</td><td>{komma(z.g2, 2)}</td><td>{pText(z.p)}</td></tr>{/each}</tbody>
          </table>
        </div>
        <p class="hilfe">{L('Es werden viele Wörter zugleich geprüft. Die p-Werte sind nicht für mehrere Tests berichtigt; lesen Sie sie als Hinweis, welche Wörter Sie sich ansehen sollten, nicht als Beweis.', 'Many words are tested at once. The p-values are not corrected for multiple tests; read them as a hint which words to look at, not as proof.')}</p>
        <div class="knopfzeile"><button class="k" type="button" onclick={() => csv([L('Wort', 'Word'), L('Typisch für', 'Typical of'), 'A', 'B', 'G2', 'p'], typisch.map(z => [z.wort, z.richtung === 'a' ? 'A' : 'B', z.a, z.b, dz(z.g2), dz(z.p)]), 'typische-woerter.csv')}>{L('Ganze Liste als CSV', 'Whole list as CSV')}</button></div>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .ta { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .wahlzeile { display: flex; flex-wrap: wrap; gap: var(--a3); }
  .feld { display: flex; flex-direction: column; gap: var(--a1); min-width: 0; }
  .feld input, .feld select { font: inherit; max-width: 100%; }
  textarea { font: inherit; width: 100%; max-width: 100%; box-sizing: border-box; }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .auswahl { display: flex; flex-direction: column; gap: var(--a1); border: 1px solid var(--linie); padding: var(--a2) var(--a3); min-width: 0; }
  .kaestchen, .radio { display: flex; gap: var(--a2); align-items: flex-start; }
  .stopp summary { cursor: pointer; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .rahmen { overflow-x: auto; }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab caption { text-align: start; font-weight: 600; padding-bottom: var(--a1); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: middle; }
  .tab thead th { font-weight: 650; }
  .tab td.links { text-align: end; }
</style>
