<script lang="ts">
  import { tick } from 'svelte';
  import { s, L, melde, oeffneNeueDaten, setzeFragebogen, setzeFragebogenEingaben } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import { abgleich, einfachDatensatz, entscheide, fehlerJe1000, protokollText, pruefeFeld, type Abgleich, type Durchgang, type Entscheidung, type Protokoll, type Wert } from '../lib/doppeleingabe';
  import { datensatzTabelle, feldBeschriftungen } from '../lib/doppeleingabe-daten';
  import { anzeigeSprache } from '../lib/fragebogen-aktionen.svelte';
  import { bilder, entwurfInsProjekt } from '../lib/fragebogen-editor.svelte';
  import { durchgangVon, eingabenInsProjekt, eingabenVon } from '../lib/eingabemaske.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Abgleich der Doppeleingabe (Paket 2F): Tabelle der Abweichungen mit der Entscheidung je Zeile (A, B oder neuer Wert mit dem Papierbogen in der Hand),
   * Bögen nur in einem Durchgang (mit ausdrücklicher Wahl „nur einfach erfasst übernehmen“), Protokoll für den Methodenteil (Text und Word) und erst danach der Datensatz.
   * Rechnung: nur Zählen (Abweichungen je 1.000 verglichene Felder), siehe lib/doppeleingabe.ts.
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  const sprache = $derived(anzeigeSprache(plan));
  const A = $derived(durchgangVon(plan.id, 'A'));
  const B = $derived(durchgangVon(plan.id, 'B'));
  const E = $derived(durchgangVon(plan.id, 'einfach'));
  const nA = $derived(Object.keys(A).length), nB = $derived(Object.keys(B).length), nE = $derived(Object.keys(E).length);
  const ab = $derived<Abgleich>(abgleich(plan, A, B));
  const felder = $derived(feldBeschriftungen(plan, sprache));

  type Wahl = { wahl?: 'A' | 'B' | 'neu'; text: string };
  let wahl = $state<Record<string, Wahl>>({});
  let einfachWahl = $state<Record<string, boolean>>({});
  let arbeitet = $state('');
  const schl = (bogen: string, feld: string) => `${bogen}\u0000${feld}`;
  const waehle = (bogen: string, feld: string): Wahl => wahl[schl(bogen, feld)] ?? { text: '' };

  /** Anzeige eines Wertes: „3 = eher zufrieden“, Listen mit Strichen, leer als Wort. */
  function zeige(feld: string, w: Wert): string {
    if (w === undefined) return L('(leer)', '(empty)');
    const liste = felder[feld]?.liste ?? [];
    const eins = (x: number | string) => { const o = liste.find(l => l.wert === x); return o ? `${x} = ${o.text}` : x === -7 ? L('-7 = nicht gefragt (Filter)', '-7 = not asked (filter)') : String(x); };
    return Array.isArray(w) ? w.map(eins).join('; ') : eins(w);
  }
  /** Der neue Wert aus dem Textfeld: Zahlen für Zahl- und Auswahlfragen, Zahlenlisten (Komma) für Mehrfach und Rangfolge, sonst Text. */
  function neuerWert(feld: string, text: string): Wert {
    const f = felder[feld]?.frage, t = text.trim();
    if (f?.typ === 'mehrfach' || f?.typ === 'rangfolge') return t.split(/[,;\s]+/).filter(Boolean).map(x => (/^-?\d+$/.test(x) ? Number(x) : NaN));
    if (f?.typ === 'text' || f?.typ === 'datum') return t;
    return /^-?\d+([.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : (t as unknown as number);
  }
  function neuFehler(feld: string, text: string): string {
    const f = felder[feld]?.frage;
    if (!text.trim()) return L('Bitte einen Wert eingeben.', 'Please enter a value.');
    const w = neuerWert(feld, text);
    if (f) { const r = pruefeFeld(plan, f, w, sprache); return r.stufe === 'fehler' ? r.text : ''; }
    const codes = (felder[feld]?.liste ?? []).map(l => l.wert);
    return typeof w === 'number' && codes.includes(w) ? '' : L(`Der Code „${text.trim()}“ steht nicht in der Antwortliste.`, `The code "${text.trim()}" is not in the answer list.`);
  }
  const entscheidungen = $derived<Entscheidung[]>(ab.abweichungen.flatMap((x): Entscheidung[] => {
    const w = waehle(x.bogen, x.feld);
    if (w.wahl === 'A' || w.wahl === 'B') return [{ bogen: x.bogen, feld: x.feld, wahl: w.wahl }];
    if (w.wahl === 'neu' && !neuFehler(x.feld, w.text)) return [{ bogen: x.bogen, feld: x.feld, wahl: 'neu', wert: neuerWert(x.feld, w.text) }];
    return [];
  }));
  const offen = $derived(ab.abweichungen.length - entscheidungen.length);
  const nurEinfach = $derived([...ab.nurA, ...ab.nurB].filter(b => einfachWahl[b]));
  const ergebnis = $derived.by<{ datensatz: Durchgang; protokoll: Protokoll } | null>(() => {
    if (!nA || !nB || offen > 0) return null;
    try { return entscheide(plan, A, B, ab, entscheidungen, nurEinfach); } catch { return null; }
  });
  const nurWahlText = (b: string) => einfachWahl[b] ? L('wird als einfach erfasst übernommen', 'is included as single entry') : L('bleibt draußen', 'stays out');
  let vorigOffen = -1;
  // Die Schlussmeldung kommt erst nach dem Satz, den der Screenreader zur gewählten Auswahl spricht (sonst geht sie verloren).
  $effect(() => { const o = offen; if (ab.abweichungen.length && o === 0 && vorigOffen > 0) setTimeout(() => sage(L('Alle Abweichungen sind entschieden. Der Datensatz kann jetzt erzeugt werden.', 'All discrepancies are decided. The data set can be created now.')), 600); vorigOffen = o; });

  /* Neuer Wert: Der Fehler steht nicht nur als Beschreibung am Feld, er wird nach einer kurzen Tipppause angesagt (wie in der Eingabemaske). Ein leeres Feld gilt erst nach dem Verlassen als Fehler. */
  let beruehrt = $state<Record<string, boolean>>({});
  let fehlerTimer: ReturnType<typeof setTimeout> | undefined;
  function fehlerSpaeter(feld: string, text: string) {
    clearTimeout(fehlerTimer);
    fehlerTimer = setTimeout(() => { const f = text.trim() ? neuFehler(feld, text) : ''; if (f) sage(`${L('Fehler', 'Error')}: ${f}`, 'dringend'); }, 700);
  }
  function fehlerBeimVerlassen(k: string, feld: string, text: string) {
    beruehrt[k] = true; clearTimeout(fehlerTimer);
    const f = neuFehler(feld, text);
    if (f && !text.trim()) sage(`${L('Fehler', 'Error')}: ${f}`, 'dringend');
  }

  const sprachePlan = $derived<'de' | 'en'>(sprache === 'en' ? 'en' : 'de');
  const text = $derived(ergebnis ? protokollText(ergebnis.protokoll, sprachePlan) : '');
  const je1000 = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace('.', L(',', '.'));
  async function kopieren() {
    try { await navigator.clipboard.writeText(text); sage(L('Satzvorschlag kopiert.', 'Suggested sentence copied.')); }
    catch { melde(L('Kopieren ging nicht. Markieren Sie den Text und kopieren Sie ihn mit Strg+C.', 'Copying did not work. Select the text and copy it with Ctrl+C.')); }
  }
  async function alsWord() {
    if (!ergebnis) return;
    arbeitet = L('Word-Datei wird erstellt …', 'Creating the Word file …');
    try {
      const [{ protokollWord }, { herunterladen }] = await Promise.all([import('../lib/doppeleingabe-word'), import('../lib/export')]);
      const datum = new Date().toLocaleDateString(sprachePlan === 'de' ? 'de-DE' : 'en-GB');
      herunterladen(await protokollWord(plan, ergebnis.protokoll, sprachePlan, datum), 'protokoll-doppeleingabe.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      sage(L('Protokoll als Word-Datei gespeichert (Download).', 'Protocol saved as a Word file (download).'));
    } catch { melde(L('Die Word-Datei ließ sich nicht erstellen.', 'The Word file could not be created.')); }
    finally { arbeitet = ''; }
  }

  /** Neue Daten aus dem entschiedenen Datensatz; das Projekt bekommt den Plan und die Durchgänge mit, damit das Protokoll auch dort bleibt. */
  async function erzeuge(datensatz: Durchgang, name: string, quelle: string) {
    const hatteProjekt = !!s.projekt, planAlt = [...eingabenPlaene()], bildAlt = bilder(), eingAlt = { ...(hatteProjekt ? s.fragebogenEingaben : alleEntwurf()) };
    const t = datensatzTabelle(plan, datensatz, sprache);
    await oeffneNeueDaten(name, quelle, t.spalten, t.zeilen);
    if (hatteProjekt) { await setzeFragebogen(planAlt, bildAlt); await setzeFragebogenEingaben(eingAlt); }
    else { entwurfInsProjekt(); eingabenInsProjekt(); }
  }
  /** Nach „Datensatz erzeugen“ ist der Knopf weg: Der Fokus geht auf die Überschrift des Abschnitts, nicht ins Nichts. */
  function springeAufUeberschrift() { void tick().then(() => setTimeout(() => document.getElementById('fb-ab-t')?.focus(), 0)); }
  const eingabenPlaene = () => (s.projekt ? s.fragebogen : [plan]);
  const alleEntwurf = () => ({ [plan.id]: eingabenVon(plan.id) });
  const titel = $derived(plan.titel[sprache] || plan.titel[plan.sprachen[0] ?? ''] || plan.id);
  async function datensatzErzeugen() {
    if (!ergebnis) { sage(L(`Noch ${offen} Abweichung(en) ohne Entscheidung. Der Datensatz entsteht erst danach.`, `${offen} discrepancy(ies) still without a decision. The data set is created only afterwards.`), 'dringend'); return; }
    arbeitet = L('Datensatz wird erzeugt …', 'Creating the data set …');
    try {
      await erzeuge(ergebnis.datensatz, L(`Eingabe: ${titel}`, `Entry: ${titel}`), L(`doppelt eingegeben (${ergebnis.protokoll.boegen} Bögen, ${ergebnis.protokoll.abweichungen} Abweichungen entschieden)`, `entered twice (${ergebnis.protokoll.boegen} questionnaires, ${ergebnis.protokoll.abweichungen} discrepancies decided)`));
      melde(L(`Datensatz erzeugt: ${Object.keys(ergebnis.datensatz).length} Bögen. Das Protokoll finden Sie weiter unter „Abgleich und Protokoll“ im Fragebogen.`, `Data set created: ${Object.keys(ergebnis.datensatz).length} questionnaires. The protocol stays under "Comparison and protocol" in the questionnaire.`));
      springeAufUeberschrift();
    } catch (e) { melde(L(`Der Datensatz ließ sich nicht erzeugen: ${(e as Error).message}`, `The data set could not be created: ${(e as Error).message}`)); }
    finally { arbeitet = ''; }
  }
  async function einfachErzeugen() {
    arbeitet = L('Datensatz wird erzeugt …', 'Creating the data set …');
    try {
      await erzeuge(einfachDatensatz(plan, E), L(`Eingabe: ${titel}`, `Entry: ${titel}`), L(`einfach eingegeben (${nE} Bögen, nicht abgeglichen)`, `entered once (${nE} questionnaires, not compared)`));
      melde(L(`Datensatz erzeugt: ${nE} Bögen (einfach eingegeben, nicht abgeglichen).`, `Data set created: ${nE} questionnaires (single entry, not compared).`));
      springeAufUeberschrift();
    } catch (e) { melde(L(`Der Datensatz ließ sich nicht erzeugen: ${(e as Error).message}`, `The data set could not be created: ${(e as Error).message}`)); }
    finally { arbeitet = ''; }
  }
</script>

<section class="ab" aria-label={L('Abgleich der doppelten Eingabe', 'Comparison of the double entry')}>
  <div class="kopfzeile"><h2 id="fb-ab-t" tabindex="-1">{L('Abgleich und Protokoll', 'Comparison and protocol')}</h2><HilfeLink id="papierboegen-eingeben" text={L('Hilfe zum Abgleich der doppelten Dateneingabe', 'Help on comparing the double data entry')} /></div>
  <p class="heft-text">{L('Bei der doppelten Dateneingabe wird jeder Bogen zweimal und unabhängig eingegeben (Durchgang A und B). Der Abgleich zeigt alle Stellen, an denen die beiden Durchgänge nicht übereinstimmen. Sie entscheiden mit dem Papierbogen in der Hand, welcher Wert stimmt; erst danach entsteht der Datensatz.', 'In double data entry, every questionnaire is entered twice and independently (pass A and B). The comparison shows every place where the two passes disagree. You decide with the paper questionnaire in hand which value is right; only then is the data set created.')}</p>

  <dl class="stand">
    <div><dt>{L('Durchgang A', 'Pass A')}</dt><dd>{L(`${nA} Bögen`, `${nA} questionnaires`)}</dd></div>
    <div><dt>{L('Durchgang B', 'Pass B')}</dt><dd>{L(`${nB} Bögen`, `${nB} questionnaires`)}</dd></div>
    <div><dt>{L('Einfach eingegeben', 'Single entry')}</dt><dd>{L(`${nE} Bögen`, `${nE} questionnaires`)}</dd></div>
  </dl>

  {#if arbeitet}<p class="heft-text"><Rechnet text={arbeitet} /></p>{/if}

  {#if nE > 0}
    <section class="teil" aria-labelledby="fb-ab-einfach-t">
      <h3 id="fb-ab-einfach-t">{L('Einfach eingegebene Bögen', 'Single-entry questionnaires')}</h3>
      <p class="heft-text">{L('Diese Bögen wurden nur einmal eingegeben und werden nicht abgeglichen. Das Protokoll dazu sagt nur, dass nicht abgeglichen wurde.', 'These questionnaires were entered only once and are not compared. The protocol only says that no comparison was made.')}</p>
      <button class="k" type="button" onclick={() => void einfachErzeugen()} disabled={!!arbeitet}><Icon n="plus" />{L(`Datensatz aus ${nE} einfach eingegebenen Bögen erzeugen`, `Create data set from ${nE} single-entry questionnaires`)}</button>
    </section>
  {/if}

  {#if !nA || !nB}
    <p class="heft-text leer">{!nA && !nB ? L('Für den Abgleich fehlen beide Durchgänge. Geben Sie in der Eingabemaske zuerst Durchgang A und dann Durchgang B ein.', 'Both passes are missing for the comparison. In the input mask, enter pass A first and then pass B.') : !nA ? L('Durchgang A fehlt noch.', 'Pass A is still missing.') : L('Durchgang B fehlt noch.', 'Pass B is still missing.')}</p>
  {:else}
    <section class="teil" aria-labelledby="fb-ab-z-t">
      <h3 id="fb-ab-z-t">{L('Ergebnis des Abgleichs', 'Result of the comparison')}</h3>
      <dl class="stand">
        <div><dt>{L('Bögen in beiden Durchgängen', 'Questionnaires in both passes')}</dt><dd>{ab.beide.length}</dd></div>
        <div><dt>{L('Verglichene Felder', 'Fields compared')}</dt><dd>{ab.felder}</dd></div>
        <div><dt>{L('Abweichungen', 'Discrepancies')}</dt><dd>{ab.abweichungen.length}</dd></div>
        <div><dt>{L('Abweichungen je 1.000 Felder', 'Discrepancies per 1,000 fields')}</dt><dd>{je1000(fehlerJe1000(ab))}</dd></div>
      </dl>
    </section>

    {#if ab.abweichungen.length}
      <section class="teil" aria-labelledby="fb-ab-t2">
        <h3 id="fb-ab-t2">{L('Abweichungen entscheiden', 'Decide the discrepancies')}</h3>
        <p class="heft-text">{L('Schauen Sie in den Papierbogen und wählen Sie je Zeile den richtigen Wert: den aus Durchgang A, den aus Durchgang B oder einen neuen Wert.', 'Look at the paper questionnaire and choose the right value in each row: the one from pass A, the one from pass B or a new value.')}</p>
        <p class="stand-offen" id="fb-ab-offen">{offen > 0 ? L(`Noch offen: ${offen} von ${ab.abweichungen.length}`, `Still open: ${offen} of ${ab.abweichungen.length}`) : L('Alle Abweichungen sind entschieden.', 'All discrepancies are decided.')}</p>
        <div class="rolle" role="region" tabindex="0" aria-label={L('Tabelle der Abweichungen', 'Table of discrepancies')}>
          <table class="abw">
            <caption class="nur-vorleser">{L('Abweichungen zwischen Durchgang A und B', 'Discrepancies between pass A and B')}</caption>
            <thead><tr>
              <th scope="col">{L('Bogen', 'Questionnaire')}</th><th scope="col">{L('Frage', 'Question')}</th><th scope="col">{L('Wert A', 'Value A')}</th><th scope="col">{L('Wert B', 'Value B')}</th><th scope="col">{L('Entscheidung', 'Decision')}</th>
            </tr></thead>
            <tbody>
              {#each ab.abweichungen as x (schl(x.bogen, x.feld))}
                {@const k = schl(x.bogen, x.feld)}
                {@const w = waehle(x.bogen, x.feld)}
                {@const fehler = w.wahl === 'neu' && (w.text.trim() || beruehrt[k]) ? neuFehler(x.feld, w.text) : ''}
                <tr>
                  <th scope="row">{x.bogen}</th>
                  <td><strong>{felder[x.feld]?.name ?? x.feld}</strong><br><span class="hilfe">{felder[x.feld]?.text}</span></td>
                  <td>{zeige(x.feld, x.a)}</td><td>{zeige(x.feld, x.b)}</td>
                  <td>
                    <fieldset class="wahl">
                      <legend class="nur-vorleser">{L(`Entscheidung für Bogen ${x.bogen}, Frage ${felder[x.feld]?.name ?? x.feld}`, `Decision for questionnaire ${x.bogen}, question ${felder[x.feld]?.name ?? x.feld}`)}</legend>
                      <label class="opt"><input type="radio" name="fb-ab-{k}" checked={w.wahl === 'A'} onchange={() => { wahl[k] = { ...w, wahl: 'A' }; }}><span>A</span></label>
                      <label class="opt"><input type="radio" name="fb-ab-{k}" checked={w.wahl === 'B'} onchange={() => { wahl[k] = { ...w, wahl: 'B' }; }}><span>B</span></label>
                      <label class="opt"><input type="radio" name="fb-ab-{k}" checked={w.wahl === 'neu'} onchange={() => { wahl[k] = { ...w, wahl: 'neu' }; }}><span>{L('Neuer Wert', 'New value')}</span></label>
                      {#if w.wahl === 'neu'}
                        <label class="neu"><span class="nur-vorleser">{L(`Neuer Wert für Bogen ${x.bogen}, Frage ${felder[x.feld]?.name ?? x.feld}`, `New value for questionnaire ${x.bogen}, question ${felder[x.feld]?.name ?? x.feld}`)}</span>
                          <input type="text" value={w.text} autocomplete="off" aria-invalid={fehler ? 'true' : undefined} aria-describedby={fehler ? `fb-ab-nf-${k}` : undefined}
                            oninput={(e) => { wahl[k] = { ...w, wahl: 'neu', text: e.currentTarget.value }; fehlerSpaeter(x.feld, e.currentTarget.value); }} onblur={(e) => fehlerBeimVerlassen(k, x.feld, e.currentTarget.value)}></label>
                        {#if fehler}<p class="fehlertext" id="fb-ab-nf-{k}"><span>{L('Fehler', 'Error')}: </span>{fehler}</p>{/if}
                      {/if}
                    </fieldset>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}

    {#if ab.nurA.length || ab.nurB.length}
      <section class="teil" aria-labelledby="fb-ab-nur-t">
        <h3 id="fb-ab-nur-t">{L('Bögen nur in einem Durchgang', 'Questionnaires in only one pass')}</h3>
        <p class="heft-text">{L('Diese Bögen kommen nicht in den Datensatz, weil sie nicht abgeglichen werden konnten. Sie können einen Bogen ausdrücklich „nur einfach erfasst“ übernehmen; das Protokoll nennt dann ihre Zahl.', 'These questionnaires do not go into the data set because they could not be compared. You can explicitly include a questionnaire as "single entry only"; the protocol then states how many there are.')}</p>
        <div class="rolle" role="region" tabindex="0" aria-label={L('Tabelle der Bögen nur in einem Durchgang', 'Table of questionnaires in only one pass')}>
          <table class="abw">
            <caption class="nur-vorleser">{L('Bögen nur in Durchgang A oder nur in Durchgang B', 'Questionnaires only in pass A or only in pass B')}</caption>
            <thead><tr><th scope="col">{L('Bogen', 'Questionnaire')}</th><th scope="col">{L('Vorhanden in', 'Present in')}</th><th scope="col">{L('Entscheidung', 'Decision')}</th></tr></thead>
            <tbody>
              {#each [...ab.nurA.map(b => [b, 'A'] as const), ...ab.nurB.map(b => [b, 'B'] as const)] as [b, d] (d + b)}
                <tr>
                  <th scope="row">{b}</th><td>{L(`nur Durchgang ${d}`, `only pass ${d}`)}</td>
                  <td><label class="opt"><input type="checkbox" checked={!!einfachWahl[b]} onchange={(e) => { einfachWahl[b] = e.currentTarget.checked; }}><span>{L('Nur einfach erfasst übernehmen', 'Include as single entry only')}</span></label><span class="hilfe"> ({nurWahlText(b)})</span></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}

    <section class="teil" aria-labelledby="fb-ab-prot-t">
      <h3 id="fb-ab-prot-t">{L('Protokoll für den Methodenteil', 'Protocol for the methods section')}</h3>
      {#if !ergebnis}
        <p class="heft-text leer">{offen > 0 ? L('Das Protokoll steht, sobald alle Abweichungen entschieden sind.', 'The protocol is available as soon as all discrepancies are decided.') : L('Das Protokoll ließ sich nicht berechnen.', 'The protocol could not be calculated.')}</p>
      {:else}
        <p class="heft-text">{L('Satzvorschlag, den Sie in den Methodenteil übernehmen können (mit Ihren Worten anpassen):', 'Suggested sentence you can use in the methods section (adapt it in your own words):')}</p>
        <blockquote class="satz" lang={sprachePlan}>{text}</blockquote>
        <p class="hilfe">{L('Beleg: Paulsen, Overgaard & Lauritsen (2012), PLoS ONE 7(4), e35087: doppelte Eingabe gegen einfache Eingabe, 0,046 gegen 0,370 Fehler je 1.000 Felder.', 'Evidence: Paulsen, Overgaard & Lauritsen (2012), PLoS ONE 7(4), e35087: double entry against single entry, 0.046 against 0.370 errors per 1,000 fields.')}</p>
        <div class="knopfzeile">
          <button class="k" type="button" onclick={() => void kopieren()}><Icon n="kopieren" />{L('Text kopieren', 'Copy text')}</button>
          <button class="k" type="button" onclick={() => void alsWord()} disabled={!!arbeitet}><Icon n="download" />{L('Protokoll als Word-Datei', 'Protocol as Word file')}</button>
        </div>
      {/if}
    </section>

    <section class="teil" aria-labelledby="fb-ab-ds-t">
      <h3 id="fb-ab-ds-t">{L('Datensatz erzeugen', 'Create the data set')}</h3>
      <p class="heft-text">{L('Der Datensatz entsteht erst, wenn alle Abweichungen entschieden sind. Spalten, Namen, Beschriftungen und Fehlendcodes kommen aus dem Kodebuch des Plans. Übersprungene Filterfragen bekommen den Code -7. Die Daten öffnen sich als neues Projekt.', 'The data set is created only when all discrepancies are decided. Columns, names, labels and missing codes come from the plan\'s codebook. Skipped filter questions get the code -7. The data open as a new project.')}</p>
      <button class="k haupt" type="button" aria-disabled={ergebnis && !arbeitet ? undefined : 'true'} aria-describedby="fb-ab-offen" onclick={() => { if (!arbeitet) void datensatzErzeugen(); }}><Icon n="plus" />{L('Datensatz erzeugen', 'Create data set')}</button>
    </section>
  {/if}
</section>

<style>
  .ab { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  .kopfzeile { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: baseline; }
  .ab h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .ab h3 { font: 650 var(--gr-h3, 1.05rem)/1.3 var(--schrift-ui); margin: 0; }
  .teil { display: flex; flex-direction: column; gap: var(--a2); align-items: flex-start; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .leer { color: var(--tinte-2); }
  .stand { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a5); margin: 0; }
  .stand div { display: flex; flex-direction: column; }
  .stand dt { font-size: var(--gr-klein); color: var(--tinte-2); }
  .stand dd { margin: 0; font-weight: 650; }
  .stand-offen { margin: 0; font-weight: 650; }
  .rolle { position: relative; overflow-x: auto; max-width: 100%; }
  .rolle:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  table.abw { border-collapse: collapse; width: 100%; }
  table.abw th, table.abw td { padding: var(--a1) var(--a2); text-align: start; border-bottom: 1px solid var(--linie); vertical-align: top; }
  .wahl { border: 0; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: var(--a1) var(--a3); align-items: center; min-width: 14rem; }
  .opt { display: flex; gap: var(--a1); align-items: center; min-height: var(--ziel); }
  .neu input { font: inherit; min-height: var(--ziel); padding: var(--a1) var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt, #fff); color: inherit; width: 10rem; }
  .neu input[aria-invalid='true'] { outline: 2px solid var(--fehler, #a30000); outline-offset: 1px; }
  .fehlertext { margin: 0; padding: var(--a1) var(--a2); border-inline-start: 0.375rem solid var(--fehler, #a30000); font-weight: 650; flex-basis: 100%; }
  .satz { margin: 0; padding: var(--a2) var(--a3); border-inline-start: 0.25rem solid var(--linie-stark); max-width: 52rem; user-select: text; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .k[aria-disabled='true'] { opacity: 0.6; cursor: not-allowed; }
</style>
