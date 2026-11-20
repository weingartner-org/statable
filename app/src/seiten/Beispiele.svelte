<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { rutsch } from '../lib/rutsch';
  import { s, d, L, Lp, waehle, oeffneBeispielNr, neueStudie, melde, meldeFehler, einstSpeichern } from '../lib/sitzung.svelte';
  import { BEISPIELE, FAECHER, STUFEN, META_FEEDBACK, type Beispiel, type Fach } from '../lib/beispiele';
  import { VERFAHREN } from '../lib/verfahren';
  import { beispielReihenfolge } from '../lib/fach';
  import { entwurf, metaUmstellen, metaDirekt } from '../lib/metaentwurf.svelte';
  import { starteLauf } from '../lib/beispielvorschlag.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import Logo from '../bausteine/Logo.svelte';
  import { zahlDe } from '../lib/format';
  import { dez } from '../i18n/profil';
  import { tick } from 'svelte';

  /** `teil`: ein Beispiel aus der Adresse (#beispiele/<id>): Filter auf „Alle“ (ohne die gespeicherte Wahl zu ändern), „Mehr dazu“ offen, Fokus auf den Titel. */
  let { teil = '' }: { teil?: string } = $props();

  let fach = $state<Fach | null>(null);
  /** Schwierigkeit: die gespeicherte Wahl der Person; beim Erstbesuch „Einstieg“, für Profis „Alle“. Nichts wird heimlich umgestellt. */
  let sprung = $state(false);
  const stufe = $derived(sprung ? 0 : (s.einst.beispielStufe ?? (s.einst.profi ? 0 : 1)));
  function stufeWaehlen(n: number) { sprung = false; s.einst.beispielStufe = n; einstSpeichern(); }
  let offen = $state<string | null>(null);
  let laeuft = $state<string | null>(null);

  let suche = $state('');
  /* Suche (Meldung 01.11.): alle Wörter müssen irgendwo vorkommen - im Titel, in der Geschichte, bei den Fragen oder in den Namen der Verfahren („Faktor Analyse“ findet „Faktorenanalyse“). */
  const glatt = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^\p{L}\p{N}]+/gu, ' ');
  const heu = (b: Beispiel) => glatt([waehle(b.titel), waehle(b.kurz), waehle(b.geschichte), ...b.lernen.map(p => waehle(p)), fachName(b.fach), ...b.schritte.map(x => `${waehle(x.titel)} ${chip(x.art)}`), ...arten(b).map(chip)].join(' '));
  const heuAlle = $derived(new Map(BEISPIELE.map(b => [b.id, heu(b)] as const)));
  const treffer = (b: Beispiel) => { const w = glatt(suche).split(' ').filter(Boolean); if (!w.length) return true; const h = heuAlle.get(b.id)!, hk = h.replace(/ /g, ''); return w.every(x => h.includes(x) || hk.includes(x)); };
  const geordnet = $derived(beispielReihenfolge(BEISPIELE, s.einst.fach));
  const liste = $derived(geordnet.filter(b => (!fach || b.fach === fach) && (!stufe || b.stufe === stufe) && treffer(b)));
  /** Treffer der Suche, die Fach oder Schwierigkeit gerade verstecken (nichts wird unerreichbar). */
  const versteckt = $derived(suche.trim() ? geordnet.filter(b => treffer(b)).length - liste.length : 0);
  function alleZeigen() { fach = null; stufeWaehlen(0); }
  /** Ohne gewähltes Fach: je Fach eine Gruppe (Reihenfolge wie FAECHER, darin wie `beispielReihenfolge`). */
  const gruppen = $derived(fach ? [] : FAECHER.map(f => ({ f, items: liste.filter(b => b.fach === f.id) })).filter(g => g.items.length));
  $effect(() => {
    const id = teil;
    if (!id || !BEISPIELE.some(b => b.id === id)) { sprung = false; return; }
    sprung = true; fach = null; suche = ''; offen = id;
    tick().then(() => { const el = document.getElementById('t-' + id); el?.scrollIntoView({ block: 'center' }); el?.focus(); });
  });
  const zaehl = (f: Fach) => BEISPIELE.filter(b => b.fach === f).length;
  const fachName = (f: Fach) => waehle(FAECHER.find(x => x.id === f)!.name);
  const chip = (id: string) => (id === 'planen' ? L('Studie planen', 'Plan a study') : (() => { const v = VERFAHREN.find(x => x.id === id); return v ? (v.zusatz ?? v.titel) : id; })());
  const arten = (b: Beispiel) => [...new Set(b.schritte.map(x => x.art))];

  function metaFuellen() {
    metaUmstellen('es', 'se');
    entwurf.verhaeltnis = false; entwurf.kh = true; entwurf.massName = L('Hedges g', 'Hedges g');
    entwurf.zeilen = META_FEEDBACK.map(([name, y, se]) => ({ name: waehle(name), w: [dez(String(y)), dez(String(se))] }));
  }
  async function oeffne(b: Beispiel) {
    laeuft = b.id;
    try {
      if (!b.datei) {
        metaDirekt.an = true;
        await neueStudie(waehle(b.titel), [{ bezeichnung: L('Nummer', 'ID'), art: 'zahl', gruppen: '' }]);
        metaFuellen();
        starteLauf(b.id, s.projekt!.id);
        location.hash = 'blatt/neu';
      } else {
        const namen = await oeffneBeispielNr(b);
        starteLauf(b.id, s.projekt!.id, namen);
        location.hash = 'daten';
      }
    } catch (e) {
      meldeFehler(L('Das Beispiel ließ sich nicht öffnen. Bitte noch einmal versuchen.', 'The example could not be opened. Please try again.'));
      if (import.meta.env.DEV) console.warn(e);
    } finally { laeuft = null; }
  }
</script>

{#snippet karte(b: Beispiel, mitFach: boolean)}
  <li>
    <article class="b-karte" aria-labelledby="t-{b.id}">
      <header>
        {#if mitFach}<span class="b-fach">{fachName(b.fach)}</span>{/if}
        <span class="b-stufe" data-stufe={b.stufe}>{waehle(STUFEN[b.stufe - 1]!)}</span>
        {#if b.echt}<span class="b-echt"><Icon n="haken" k="ok" />{L('Echte Daten', 'Real data')}</span>{/if}
      </header>
      <h3 id="t-{b.id}" tabindex="-1">{waehle(b.titel)}</h3>
      <p>{waehle(b.kurz)}</p>
      <p class="fakten"><span><Icon n="gruppen" />{#if b.datei}{b.echt ? Lp(b.fälle, `${zahlDe(b.fälle, 0)} Fall`, `${zahlDe(b.fälle, 0)} Fälle`, `${zahlDe(b.fälle, 0)} case`, `${zahlDe(b.fälle, 0)} cases`) : Lp(b.fälle, `${zahlDe(b.fälle, 0)} Fall (erfunden)`, `${zahlDe(b.fälle, 0)} Fälle (erfunden)`, `${zahlDe(b.fälle, 0)} case (made up)`, `${zahlDe(b.fälle, 0)} cases (made up)`)}{:else}{Lp(b.fälle, `${b.fälle} Studie (erfunden)`, `${b.fälle} Studien (erfunden)`, `${b.fälle} study (made up)`, `${b.fälle} studies (made up)`)}{/if}</span><span><Icon n="uhr" />{Lp(b.minuten, `etwa ${b.minuten} Minute`, `etwa ${b.minuten} Minuten`, `about ${b.minuten} minute`, `about ${b.minuten} minutes`)}</span></p>
      <p class="arten" role="group" aria-label={L('Verfahren', 'Methods')}>{#each arten(b) as a}<span>{chip(a)}</span>{/each}</p>
      <div class="knopfzeile">
        <button class="k haupt" type="button" aria-describedby="t-{b.id}" disabled={laeuft !== null} onclick={() => oeffne(b)}>{#if laeuft === b.id}<Rechnet imKnopf text={L('Wird geöffnet …', 'Opening …')} />{:else}{L('Öffnen', 'Open')}{/if}</button>
        <button class="k leise" type="button" aria-expanded={offen === b.id} aria-controls="d-{b.id}" onclick={() => (offen = offen === b.id ? null : b.id)}>{offen === b.id ? L('Weniger', 'Less') : L('Mehr dazu', 'More')}</button>
      </div>
      {#if offen === b.id}
        <div class="b-mehr klappt" transition:rutsch id="d-{b.id}">
          <h4>{L('Die Geschichte', 'The story')}</h4>
          <p>{waehle(b.geschichte)}</p>
          <h4>{L('Was man lernt', 'What you learn')}</h4>
          <ul>{#each b.lernen as p}<li>{waehle(p)}</li>{/each}</ul>
          <h4>{L('Die Fragen', 'The questions')}</h4>
          <ol>{#each b.schritte as st}<li><strong>{waehle(st.titel)}</strong> <span class="art">({chip(st.art)})</span></li>{/each}</ol>
          {#if b.quelle}<p class="quelle">{waehle(b.quelle)}</p>{/if}
        </div>
      {/if}
    </article>
  </li>
{/snippet}

<div class="beispiele">
  <SeitenKopf titel={L('Beispiele zum Üben', 'Examples to practice with')} zurueck />
  <p class="unter">{L('Echte Fragen aus verschiedenen Fächern, jede mit Daten, einer kleinen Geschichte und Fragen zum Ausprobieren.', 'Real questions from different subjects, each with data, a short story and questions to try out.')}</p>

  <div class="eingabe bsp-suche"><label class="nur-vorleser" for="bsp-suche">{L('In den Beispielen suchen', 'Search in the examples')}</label>
    <div class="suchfeld"><Icon n="suche" /><input id="bsp-suche" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder={L('In den Beispielen suchen, z. B. „t-Test“', 'Search in the examples, e.g. "t-test"')} bind:value={suche}></div></div>

  <div class="filter" role="group" aria-label={L('Fach', 'Subject')}>
    <button class="k" type="button" aria-pressed={fach === null} onclick={() => { sprung = false; fach = null; }}>{L('Alle', 'All')} <span class="zahl">{BEISPIELE.length}</span></button>
    {#each FAECHER as f}
      <button class="k" type="button" aria-pressed={fach === f.id} onclick={() => { sprung = false; fach = fach === f.id ? null : f.id; }}>{waehle(f.name)} <span class="zahl">{zaehl(f.id)}</span></button>
    {/each}
  </div>
  <div class="eingabe stufe-wahl"><label for="bsp-stufe">{L('Schwierigkeit', 'Level')}</label>
    <select id="bsp-stufe" value={stufe} onchange={(e) => stufeWaehlen(Number(e.currentTarget.value))}>
      <option value={0}>{L('Alle', 'All')}</option>
      {#each STUFEN as p, i}<option value={i + 1}>{waehle(p)}</option>{/each}
    </select></div>

  <p class="zahl-zeile" use:ergebnisAnsage>{Lp(liste.length, `${liste.length} Beispiel`, `${liste.length} Beispiele`, `${liste.length} example`, `${liste.length} examples`)}</p>
  {#if versteckt > 0}<p class="heft-text">{Lp(versteckt, `${versteckt} weiterer Treffer in anderen Fächern oder Schwierigkeiten`, `${versteckt} weitere Treffer in anderen Fächern oder Schwierigkeiten`, `${versteckt} more match in other subjects or levels`, `${versteckt} more matches in other subjects or levels`)} - <button class="k leise" type="button" onclick={alleZeigen}>{L('alle zeigen', 'show all')}</button></p>{/if}

  {#if !liste.length}<p class="heft-text">{L('Dazu gibt es kein Beispiel. Anderes Wort versuchen oder Fach und Schwierigkeit auf „Alle“ stellen.', 'There is no example for that. Try another word or set subject and level to “All”.')}</p>{/if}

  {#if fach}
    <ul class="karten">{#each liste as b (b.id)}{@render karte(b, false)}{/each}</ul>
  {:else}
    {#each gruppen as g (g.f.id)}
      <section class="gruppe" aria-labelledby="g-{g.f.id}">
        <h2 id="g-{g.f.id}">{waehle(g.f.name)} · {g.items.length}</h2>
        <ul class="karten">{#each g.items as b (b.id)}{@render karte(b, false)}{/each}</ul>
      </section>
    {/each}
  {/if}

  <div class="banner ruhig" style="margin-top:var(--a5)"><Icon n="info" />
    <p>{d('Beispiele mit dem Zeichen „Echte Daten“ stammen aus veröffentlichten Quellen; die Quelle steht unter „Mehr dazu“. Die übrigen Daten sind erfunden. Nach dem Öffnen begleitet dich ein kleines Fenster mit den Fragen des Beispiels. Es öffnet jede Frage schon ausgefüllt und erklärt, worauf man beim Ergebnis achtet.', 'Beispiele mit dem Zeichen „Echte Daten“ stammen aus veröffentlichten Quellen; die Quelle steht unter „Mehr dazu“. Die übrigen Daten sind erfunden. Nach dem Öffnen begleitet Sie ein kleines Fenster mit den Fragen des Beispiels. Es öffnet jede Frage schon ausgefüllt und erklärt, worauf man beim Ergebnis achtet.', 'Examples marked "Real data" come from published sources; the source is under "More". The other data are made up. After opening, a small window with the example\'s questions guides you. It opens each question already filled in and explains what to look for in the result.')}</p></div>
</div>

<style>
  .beispiele{max-width:none;margin:0 auto;padding:var(--a5) var(--seitenrand) var(--a7)}
  .unter{font-size:var(--gr-h2);color:var(--tinte-2);max-width:62ch;margin-bottom:var(--a4)}
  .bsp-suche{max-width:32rem;margin-bottom:var(--a3)}
  .filter{display:flex;flex-wrap:wrap;gap:var(--a2);margin-bottom:var(--a3)}
  .filter .k[aria-pressed=true]{background:var(--akzent);color:var(--tinte-auf-akzent);border-color:var(--akzent)}
  .filter .k[aria-pressed=true] .zahl{opacity:1}
  .zahl{opacity:.8;font-size:.85em;margin-inline-start:2px}
  .stufe-wahl{display:flex;flex-direction:row;align-items:center;justify-content:flex-start;gap:var(--a2);margin-bottom:var(--a4)}   /* nebeneinander und links - die allgemeine Regel .eingabe stellt untereinander, mit align-items:center stand beides in der Mitte */
  .stufe-wahl select{width:auto}
  .karten{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr));gap:var(--a4)}
  .b-karte{background:var(--blatt);border-radius:var(--r-gross);box-shadow:var(--schatten-blatt);padding:var(--a4);height:100%;display:flex;flex-direction:column;gap:var(--a2)}
  .b-karte header{display:flex;flex-wrap:wrap;gap:var(--a2);align-items:center;font-size:var(--gr-klein,.85rem)}
  .b-fach{font-weight:650;color:var(--akzent)}
  .b-stufe{border:1px solid var(--linie-stark);border-radius:99px;padding:0 var(--a2);color:var(--tinte-2)}
  .b-echt{display:inline-flex;align-items:center;gap:4px;background:var(--akzent-hell);border-radius:99px;padding:0 var(--a2);font-weight:600}
  .gruppe{margin-bottom:var(--a5)}
  .gruppe h2{font:650 var(--gr-h2)/1.3 var(--schrift-ui);margin:var(--a4) 0 var(--a3)}
  .zahl-zeile{color:var(--tinte-2);margin-bottom:var(--a2)}
  h3{font:650 var(--gr-h2)/1.3 var(--schrift-ui)}
  .fakten{display:flex;flex-wrap:wrap;gap:var(--a2) var(--a4);color:var(--tinte-2)}
  .fakten span{display:inline-flex;align-items:center;gap:6px}
  .arten{display:flex;flex-wrap:wrap;gap:6px;color:var(--tinte-2);font-size:.85em}
  .arten span{background:var(--blatt-2);border-radius:6px;padding:2px 8px}
  .knopfzeile{margin-top:auto;padding-top:var(--a2)}
  .b-mehr h4{font:650 var(--gr-text)/1.3 var(--schrift-ui);margin:var(--a3) 0 var(--a1,4px)}
  .b-mehr ul,.b-mehr ol{padding-inline-start:1.3em}
  .b-mehr .art{color:var(--tinte-2)}
  .quelle{margin-top:var(--a3);font-size:.9em;color:var(--tinte-2)}
</style>
