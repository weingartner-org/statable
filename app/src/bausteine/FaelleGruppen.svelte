<script lang="ts">
  import { tick } from 'svelte';
  import { L, Lp, d } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { proz } from '../i18n/profil';
  import { benenne, kennwerte, runde2, loescheGruppe, neueGruppe, notiere, zitateDerGruppe, setzePassung, setzeMetaInferenz, PASSUNGEN, type Faelle, type Gruppe, type Kenn, type Passung } from '../lib/faelle';
  import { passungName, passungZaehlung } from '../lib/faellesaetze';
  import Icon from './Icon.svelte';

  /**
   * Die Gruppen: Name (änderbar), Fälle, Kennwerte (live, bei jeder Verschiebung neu), markierte Zitate und die Notiz mit der Deutung.
   * Zahlen: n, M, SD (n − 1; bei einem Fall „-“), Median, kleinster bis größter Wert. Gruppen: Häufigkeiten mit Prozent der Fälle mit Angabe.
   */
  let { e, gruppen, farbe, tue }: { e: Faelle; gruppen: Gruppe[]; farbe: (id: string) => number; tue: (text: string, fn: (x: Faelle) => void) => void } = $props();

  const z2 = (v: number | null) => (v === null ? '-' : zahlDe(v, 2));
  const zk = (v: number | null) => (v === null ? '-' : zahlDe(runde2(v)));
  const kenn = (g: Gruppe): Kenn[] => kennwerte(e, g.mitglieder);
  const stufenText = (k: Kenn) => (k.art === 'gruppe' ? (k.n ? k.stufen.filter(x => x.n > 0).map(x => `${x.name}: ${x.n} (${proz(zahlDe(x.prozent!, 0))})`).join(', ') : '-') : '');
  const kennungen = (g: Gruppe) => g.mitglieder.map(i => e.faelle[i]!.kennung).join(', ');

  function umbenennen(g: Gruppe, wert: string) {
    const v = wert.trim();
    if (v === g.name) return;
    tue(v === '' || v === g.grundname ? L(`Gruppe „${g.grundname}“: Name zurückgesetzt.`, `Group "${g.grundname}": name reset.`) : L(`Gruppe umbenannt in „${v}“.`, `Group renamed to "${v}".`), x => benenne(x, g.id, v === g.grundname ? '' : v));
  }
  function notizSpeichern(g: Gruppe, wert: string) {
    if (wert === g.notiz) return;
    tue(L(`Notiz der Gruppe „${g.name}“ gespeichert.`, `Note of the group "${g.name}" saved.`), x => notiere(x, g.id, wert));
  }
  function passungWaehlen(g: Gruppe, p: Passung) {
    if (p === g.passung) return;
    tue(L(`Passung der Gruppe „${g.name}“: ${passungName(p)}.`, `Fit of the group "${g.name}": ${passungName(p)}.`), x => setzePassung(x, g.id, p));
  }
  function metaSpeichern(g: Gruppe, wert: string) {
    if (wert === g.metaInferenz) return;
    tue(L(`Meta-Inferenz der Gruppe „${g.name}“ gespeichert.`, `Meta-inference of the group "${g.name}" saved.`), x => setzeMetaInferenz(x, g.id, wert));
  }
  const zaehlung = $derived(passungZaehlung(gruppen));
  async function neu() {
    let id = '';
    tue(L('Neue Gruppe angelegt.', 'New group created.'), x => { id = neueGruppe(x); });
    await tick();
    document.querySelector<HTMLInputElement>(`[data-gruppe="${id}"] input.g-name`)?.focus();
  }
  function loeschen(g: Gruppe) {
    tue(L(`Gruppe „${g.name}“ gelöscht.`, `Group "${g.name}" deleted.`), x => loescheGruppe(x, g.id));
  }
</script>

<div class="gruppen-bereich">
  <div class="gruppen-kopf">
    <h4 id="gruppen-t">{L(`Die Gruppen (${gruppen.length})`, `The groups (${gruppen.length})`)}</h4>
    <button type="button" class="k" onclick={neu}><Icon n="plus" />{L('Neue Gruppe', 'New group')}</button>
  </div>
  <p class="klein zaehlung"><b>{L('Passung, gezählt', 'Fit, counted')}:</b> {zaehlung}. {d('Statable zählt nur; ob Zahlen und Aussagen zusammenpassen, entscheidest du.', 'Statable zählt nur; ob Zahlen und Aussagen zusammenpassen, entscheiden Sie.', 'Statable only counts; whether numbers and statements fit together is up to you.')}</p>
  <div class="karten" role="list" aria-labelledby="gruppen-t">
    {#each gruppen as g (g.id)}
      {@const ks = kenn(g)}
      {@const zit = zitateDerGruppe(e, g)}
      <section class="gruppe" role="listitem" data-gruppe={g.id} style="--gf:var(--gruppe-{farbe(g.id)})" aria-label={g.name}>
        <div class="g-kopf">
          <span class="g-punkt" aria-hidden="true"></span>
          <div class="eingabe g-feld">
            <label for="gn-{g.id}">{L('Name der Gruppe', 'Name of the group')}</label>
            <input id="gn-{g.id}" class="g-name" type="text" value={g.name} autocomplete="off" onchange={(ev) => umbenennen(g, ev.currentTarget.value)}>
          </div>
        </div>
        <p class="n"><b>{Lp(g.mitglieder.length, `${g.mitglieder.length} Fall`, `${g.mitglieder.length} Fälle`, `${g.mitglieder.length} case`, `${g.mitglieder.length} cases`)}</b>{#if g.mitglieder.length}: {kennungen(g)}{/if}{#if g.vorschlag && g.eigenerName} <span class="vorschlag">{L(`(Vorschlag: ${g.grundname})`, `(suggestion: ${g.grundname})`)}</span>{/if}</p>
        {#if g.mitglieder.length}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div class="kenn-rahmen" role="region" tabindex="0" aria-label={L(`Kennwerte der Gruppe ${g.name} (waagrecht verschiebbar)`, `Summary figures of the group ${g.name} (scrollable sideways)`)}>
          <table class="kenn">
            <caption class="nur-vorleser">{L(`Kennwerte der Gruppe ${g.name}`, `Summary figures of the group ${g.name}`)}</caption>
            <thead><tr><th scope="col">{L('Spalte', 'Column')}</th><th scope="col">n</th><th scope="col">M</th><th scope="col">SD</th><th scope="col">Mdn</th><th scope="col">{L('Min-Max', 'Min-Max')}</th></tr></thead>
            <tbody>
              {#each ks as k (k.spalte)}
                {@const sp = e.q.find(x => x.name === k.spalte)!}
                <tr>
                  <th scope="row">{sp.bezeichnung}</th>
                  <td class="z">{k.n}{#if k.fehlend}<small> (+{k.fehlend} {L('ohne Angabe', 'no answer')})</small>{/if}</td>
                  {#if k.art === 'zahl'}
                    <td class="z">{z2(k.mean)}</td><td class="z">{z2(k.sd)}</td><td class="z">{zk(k.median)}</td><td class="z">{k.n ? `${zk(k.min)} - ${zk(k.max)}` : '-'}</td>
                  {:else}
                    <td colspan="4">{stufenText(k)}</td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
          </div>
        {/if}
        {#if zit.length}
          <div class="zitate">
            <h5>{L('Markierte Zitate', 'Marked quotes')}</h5>
            <ul>{#each zit as z (z.fall + z.spalte + z.text)}<li><q>{z.text}</q> <span class="quelle">- {z.kennung}{#if e.t.length > 1} ({z.bezeichnung}){/if}</span></li>{/each}</ul>
          </div>
        {/if}
        <div class="eingabe g-notiz">
          <label for="gz-{g.id}">{d('Deine Deutung (Notiz)', 'Ihre Deutung (Notiz)', 'Your interpretation (note)')}<span class="nur-vorleser"> - {L(`Gruppe ${g.name}`, `group ${g.name}`)}</span></label>
          <textarea id="gz-{g.id}" rows="3" value={g.notiz} onchange={(ev) => notizSpeichern(g, ev.currentTarget.value)}></textarea>
        </div>
        <fieldset class="passung">
          <legend>{L('Passung', 'Fit')}<span class="nur-vorleser"> {L(`für Gruppe ${g.name}`, `for group ${g.name}`)}</span></legend>
          {#each PASSUNGEN as p (p)}
            <label class="schalter"><input type="radio" name="passung-{g.id}" value={p} checked={g.passung === p} onchange={() => passungWaehlen(g, p)}><span>{passungName(p)}</span></label>
          {/each}
        </fieldset>
        <div class="eingabe g-notiz">
          <label for="gm-{g.id}">{L('Was lerne ich aus beiden zusammen? (Meta-Inferenz)', 'What do I learn from both together? (meta-inference)')}<span class="nur-vorleser"> - {L(`Gruppe ${g.name}`, `group ${g.name}`)}</span></label>
          <textarea id="gm-{g.id}" rows="3" value={g.metaInferenz} onchange={(ev) => metaSpeichern(g, ev.currentTarget.value)}></textarea>
        </div>
        {#if !g.vorschlag}
          <div class="g-aktion"><button type="button" class="k leise" onclick={() => loeschen(g)}>{L('Gruppe löschen', 'Delete group')}<span class="nur-vorleser"> ({g.name})</span></button>
            {#if g.mitglieder.length}<span class="klein">{L('Die Fälle gehen zurück in ihre vorgeschlagenen Gruppen.', 'The cases go back to their suggested groups.')}</span>{/if}</div>
        {/if}
      </section>
    {:else}
      <p class="heft-text">{L('Keine Gruppen.', 'No groups.')}</p>
    {/each}
  </div>
</div>

<style>
  .gruppen-bereich { margin-top: var(--a5); }
  .gruppen-kopf { display: flex; align-items: center; justify-content: space-between; gap: var(--a3); flex-wrap: wrap; margin-bottom: var(--a3); }
  h4 { margin: 0; font-size: var(--gr-h2); }
  h5 { margin: 0 0 var(--a1); font-size: var(--gr-klein); color: var(--tinte-2); }
  .karten { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 24rem), 1fr)); gap: var(--a4); align-items: start; }
  .gruppe { border: 1px solid var(--linie); border-inline-start: 6px solid var(--gf); border-radius: var(--r-klein); padding: var(--a3) var(--a4); background: var(--blatt); display: grid; gap: var(--a3); min-width: 0; }
  .g-kopf { display: flex; gap: var(--a2); align-items: flex-end; }
  .g-punkt { flex: none; width: .8rem; height: .8rem; margin-bottom: .7rem; border-radius: 50%; background: var(--gf); }
  .g-feld { flex: 1; min-width: 0; }
  .g-feld input { width: 100%; }
  .n { margin: 0; overflow-wrap: anywhere; }
  .vorschlag { color: var(--tinte-2); font-size: var(--gr-klein); }
  .kenn-rahmen { overflow-x: auto; max-width: 100%; }
  .kenn { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); font-variant-numeric: tabular-nums; }
  .kenn th, .kenn td { text-align: start; padding: var(--a1) var(--a2); border-bottom: 1px solid var(--linie); vertical-align: top; }
  .kenn thead th { color: var(--tinte-2); font-weight: 600; }
  .kenn td.z { text-align: right; white-space: nowrap; }
  .kenn small { color: var(--tinte-2); }
  .zitate ul { margin: 0; padding-inline-start: var(--a4); display: grid; gap: var(--a1); }
  .zitate q { quotes: "„" "“"; }
  .quelle { color: var(--tinte-2); font-size: var(--gr-klein); }
  .g-notiz textarea { min-height: 5rem; }
  .g-aktion { display: flex; gap: var(--a3); align-items: center; flex-wrap: wrap; }
  .passung { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; gap: var(--a1); }
  .passung legend { font-weight: 600; padding: 0; margin-bottom: var(--a1); }
  /* Auswahlkreise statt Schalter (Radios sind keine Ein/Aus-Schalter) mit Zielgröße 24 x 24 px (WCAG 2.5.8; axe target-size, Messung 08.11.2026): gleiche Maße wie .option und .segment in app.css. */
  .passung .schalter input[type="radio"] { appearance: auto; width: 24px; height: 24px; min-width: 24px; min-height: 24px; margin: 0; flex: none; background: transparent; border: 0; border-radius: 50%; accent-color: var(--akzent); }
  .passung .schalter input[type="radio"]::after { content: none; }
  .passung .schalter input[type="radio"]:checked { background: transparent; }
  .zaehlung { margin: 0 0 var(--a3); }
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); }
</style>
