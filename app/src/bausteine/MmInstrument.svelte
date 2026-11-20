<script lang="ts">
  /**
   * Instrumentenentwicklung (Stufe A2, Mixed Methods „aufbauen“): Items zu Kategorien schreiben (die Person formuliert, Statable schlägt nie Wortlaut vor),
   * in einen Fragebogen-Plan übernehmen, nach der Erhebung Trennschärfe und Alpha ohne Item als Joint Display zeigen. Speichern über `aendere()` (Rückgängig).
   */
  import { L, Lp, s, setzeFragebogen } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { zahlDe } from '../lib/format';
  import { baumReihenfolge } from '../lib/kodieren';
  import { aendere, sprache } from '../lib/kodieren.svelte';
  import { aendereItem, entferneItem, itemAnalyse, itemsInPlan, kategorieName, legeItemAn, type ItemAnalyse } from '../lib/instrument';
  import { belegText, gueltig, zeilenSegmente, type DatenSicht } from '../lib/mixed';
  import type { ItemEntwurf, QualProjekt } from '../lib/qualprojekt';

  interface Props { q: QualProjekt; daten: DatenSicht }
  let { q, daten }: Props = $props();

  const baum = $derived(baumReihenfolge(q.codes));
  const themen = $derived((q.themen ?? []).filter(t => t.stand !== 'verworfen'));
  const items = $derived(q.instrument ?? []);
  const schl = (h: ItemEntwurf['herkunft']): string => (h ? `${h.art}:${h.id}` : '');
  const katName = (h: ItemEntwurf['herkunft']): string => (h ? kategorieName(q, schl(h)) : '') || L('(Kategorie gelöscht)', '(category deleted)');
  const kutz = (t: string, n = 90): string => { const a = Array.from(t); return a.length > n ? a.slice(0, n).join('') + ' …' : t; };

  /* ---- Schritt 1 ---- */
  let kat = $state('');
  let text = $state('');
  let umgepolt = $state(false);
  let beleg = $state('');
  let bearb = $state<string | null>(null);
  let fehler = $state('');

  const katObj = $derived<ItemEntwurf['herkunft']>(kat ? { art: kat.startsWith('thema:') ? 'thema' : 'code', id: kat.slice(kat.indexOf(':') + 1) } : undefined);
  const belege = $derived.by(() => {
    if (!katObj) return [];
    const r: { id: string; label: string }[] = [];
    for (const id of zeilenSegmente(q, katObj)) {
      const b = belegText(q, id); if (!b) continue;
      r.push({ id, label: `„${kutz(b.text)}“ (${b.quelle})` });
      if (r.length >= 200) break;
    }
    return r;
  });

  function zuruecksetzen() { text = ''; umgepolt = false; beleg = ''; bearb = null; }
  function anlegen() {
    fehler = '';
    if (!katObj) { fehler = L('Bitte wählen Sie zuerst eine Kategorie.', 'Please choose a category first.'); sage(fehler, 'dringend'); document.getElementById('ko-mm-in-kat')?.focus(); return; }
    const t = text.trim();
    if (!t) { fehler = L('Bitte schreiben Sie den Item-Text.', 'Please write the item text.'); sage(fehler, 'dringend'); document.getElementById('ko-mm-in-text')?.focus(); return; }
    const h = katObj;
    if (bearb) {
      const id = bearb;
      aendere(L('Änderung am Item zurückgenommen', 'Change to the item undone'), q0 => aendereItem(q0, id, it => {
        const { herkunft: _h, beleg: _b, umgepolt: _u, ...rest } = it;
        return { ...rest, text: t, herkunft: h, ...(beleg ? { beleg } : {}), ...(umgepolt ? { umgepolt: true } : {}) };
      }));
      sage(L('Item geändert.', 'Item changed.'));
    } else {
      aendere(L('Item wieder entfernt', 'Item removed again'), q0 => legeItemAn(q0, t, h, { beleg: beleg || undefined, umgepolt }).q);
      sage(L(`Item angelegt. ${items.length + 1} Items im Projekt.`, `Item created. ${items.length + 1} items in the project.`));
    }
    zuruecksetzen();
    document.getElementById('ko-mm-in-text')?.focus();
  }
  function aendern(it: ItemEntwurf) {
    bearb = it.id; kat = schl(it.herkunft); text = it.text; umgepolt = !!it.umgepolt; beleg = it.beleg ?? '';
    sage(L('Item zum Ändern geladen. Ändern Sie das Formular und speichern Sie.', 'Item loaded for editing. Change the form and save.'));
    document.getElementById('ko-mm-in-text')?.focus();
  }
  function loeschen(it: ItemEntwurf) {
    aendere(L('Item wieder angelegt', 'Item restored'), q0 => entferneItem(q0, it.id));
    if (bearb === it.id) zuruecksetzen();
    sage(L('Item gelöscht.', 'Item deleted.'));
  }

  /* ---- Schritt 2 ---- */
  let ziel = $state('neu');
  let planMeldung = $state('');
  const offene = $derived(items.filter(it => !it.plan && it.text.trim()).length);
  const planTitel = (id: string): string => { const p = s.fragebogen.find(x => x.id === id); return p ? (p.titel[sprache()] || Object.values(p.titel).find(Boolean) || id) : ''; };
  function uebernehmen() {
    const vorhanden = ziel === 'neu' ? undefined : s.fragebogen.find(p => p.id === ziel);
    const r = itemsInPlan(q, vorhanden, sprache(), { de: 'Fragebogen aus Interviews', en: 'Questionnaire from interviews' });
    if (!r.anzahl) { planMeldung = L('Es gibt keine neuen Items zum Übernehmen.', 'There are no new items to transfer.'); sage(planMeldung, 'dringend'); return; }
    void setzeFragebogen(vorhanden ? s.fragebogen.map(p => (p.id === r.plan.id ? r.plan : p)) : [...s.fragebogen, r.plan]);
    aendere(L('Zuordnung zum Fragebogen-Plan zurückgenommen', 'Assignment to the questionnaire plan undone'), q0 => {
      let n = q0;
      for (const [id, z] of Object.entries(r.zuordnung)) n = aendereItem(n, id, it => ({ ...it, plan: z }));
      return n;
    });
    const titel = r.plan.titel[sprache()] || Object.values(r.plan.titel).find(Boolean) || '';
    planMeldung = L(`${r.anzahl} Items in den Plan „${titel}“ übernommen.`, `${r.anzahl} items transferred to the plan "${titel}".`);
    sage(planMeldung);
    ziel = r.plan.id;
  }

  /* ---- Schritt 3 ---- */
  const zahlSpalten = $derived(daten.spalten.filter(sp => sp.art === 'zahl'));
  function setzeSpalte(it: ItemEntwurf, name: string) {
    aendere(L('Spalte beim Item zurückgenommen', 'Column at the item undone'), q0 => aendereItem(q0, it.id, i => { const { spalte: _s, ...rest } = i; return name ? { ...rest, spalte: name } : rest; }));
    sage(name ? L(`Item der Spalte ${name} zugeordnet.`, `Item assigned to column ${name}.`) : L('Zuordnung zur Spalte entfernt.', 'Assignment to the column removed.'));
  }
  const spaltenWerte = (name: string): (number | null)[] | null => {
    const i = daten.spalten.findIndex(x => x.name === name); if (i < 0) return null;
    const sp = daten.spalten[i]!;
    return daten.zeilen.map(z => { const v = gueltig(sp, z[i]); return typeof v === 'number' ? v : null; });
  };
  interface Gruppe { schluessel: string; name: string; items: ItemEntwurf[]; analyse: ItemAnalyse }
  const gruppen = $derived.by((): Gruppe[] => {
    const je = new Map<string, ItemEntwurf[]>();
    for (const it of items) { if (!it.spalte || !spaltenWerte(it.spalte)) continue; const k = schl(it.herkunft); const l = je.get(k); if (l) l.push(it); else je.set(k, [it]); }
    const r: Gruppe[] = [];
    for (const [k, l] of je) {
      if (l.length < 2) continue;
      r.push({ schluessel: k, name: katName(l[0]!.herkunft), items: l, analyse: itemAnalyse(l.map(it => spaltenWerte(it.spalte!)!), l.map(it => !!it.umgepolt)) });
    }
    return r;
  });
  const zeig = (x: number | null | undefined): string => (x === null || x === undefined ? '-' : zahlDe(x, 2));
  const gesetzt = $derived(items.filter(it => it.spalte).length);
</script>

<div class="mm-teil">
  <h4 id="ko-mm-in-t" tabindex="-1">{L('Fragebogen aus Interviews (Instrumentenentwicklung)', 'Questionnaire from interviews (instrument development)')}</h4>
  <p class="hilfe">{L('Aus den Kategorien Ihrer Interviews entstehen Items für einen Fragebogen. Die Items schreiben Sie selbst; Statable schlägt keinen Wortlaut vor. Nach der Erhebung zeigt es, wie gut die Items einer Kategorie zusammenpassen.', 'Categories from your interviews become items for a questionnaire. You write the items yourself; Statable suggests no wording. After the survey it shows how well the items of a category fit together.')}</p>

  <h5 id="ko-mm-in-s1-t">{L('Schritt 1: Items schreiben', 'Step 1: Write items')}</h5>
  {#if !baum.length && !themen.length}
    <p class="hilfe">{L('Es gibt noch keine Codes oder Themen. Legen Sie zuerst Kategorien an.', 'There are no codes or themes yet. Create categories first.')}</p>
  {:else}
    <div class="feld">
      <label for="ko-mm-in-kat">{L('Kategorie (Code oder Thema)', 'Category (code or theme)')}</label>
      <select id="ko-mm-in-kat" bind:value={kat} onchange={() => { beleg = ''; }}>
        <option value="">{L('Bitte wählen', 'Please choose')}</option>
        <optgroup label={L('Codes', 'Codes')}>{#each baum as e (e.code.id)}<option value="code:{e.code.id}">{'– '.repeat(e.ebene)}{e.code.name}</option>{/each}</optgroup>
        {#if themen.length}<optgroup label={L('Themen', 'Themes')}>{#each themen as t (t.id)}<option value="thema:{t.id}">{t.name}</option>{/each}</optgroup>{/if}
      </select>
    </div>
    <div class="feld">
      <label for="ko-mm-in-text">{L('Item-Text (Ihre eigene Formulierung)', 'Item text (your own wording)')}</label>
      <textarea id="ko-mm-in-text" rows="2" bind:value={text} aria-describedby={fehler ? 'ko-mm-in-fehler' : undefined}></textarea>
    </div>
    <label class="eigen-wahl"><input type="checkbox" id="ko-mm-in-umgepolt" bind:checked={umgepolt}>{L('umgepolt formuliert (Zustimmung heißt das Gegenteil der Kategorie)', 'reverse-worded (agreement means the opposite of the category)')}</label>
    <div class="feld">
      <label for="ko-mm-in-beleg">{L('Belegstelle, aus der das Item entstand (freiwillig)', 'Passage the item came from (optional)')}</label>
      <select id="ko-mm-in-beleg" bind:value={beleg} disabled={!katObj}>
        <option value="">{katObj ? (belege.length ? L('Keine Belegstelle', 'No passage') : L('Diese Kategorie hat keine Textstellen', 'This category has no passages')) : L('Wählen Sie zuerst eine Kategorie', 'Choose a category first')}</option>
        {#each belege as b (b.id)}<option value={b.id}>{b.label}</option>{/each}
      </select>
    </div>
    {#if fehler}<p class="fehler" id="ko-mm-in-fehler">{fehler}</p>{/if}
    <div class="knopfzeile">
      <button class="k haupt" type="button" id="ko-mm-in-anlegen" onclick={anlegen}>{bearb ? L('Änderung speichern', 'Save change') : L('Item anlegen', 'Create item')}</button>
      {#if bearb}<button class="k" type="button" onclick={() => { zuruecksetzen(); sage(L('Änderung abgebrochen.', 'Change cancelled.')); }}>{L('Abbrechen', 'Cancel')}</button>{/if}
    </div>
  {/if}

  {#if items.length}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
    <div class="rahmen" role="region" tabindex="0" aria-label={L('Item-Entwürfe, seitlich scrollbar', 'Item drafts, scrollable sideways')}>
      <table class="tab" id="ko-mm-in-liste">
        <caption>{L('Item-Entwürfe nach Kategorie', 'Item drafts by category')}</caption>
        <thead><tr>
          <th scope="col">{L('Kategorie', 'Category')}</th><th scope="col">{L('Item', 'Item')}</th><th scope="col">{L('Herkunft (Beleg)', 'Origin (passage)')}</th><th scope="col">{L('umgepolt', 'reverse-worded')}</th><th scope="col">{L('im Fragebogen', 'in questionnaire')}</th><th scope="col">{L('Aktionen', 'Actions')}</th>
        </tr></thead>
        <tbody>
          {#each [...items].sort((a, b) => katName(a.herkunft).localeCompare(katName(b.herkunft))) as it (it.id)}
            {@const b = it.beleg ? belegText(q, it.beleg) : null}
            <tr>
              <th scope="row" data-nolink>{katName(it.herkunft)}</th>
              <td>{it.text}</td>
              <td>{b ? `„${kutz(b.text, 120)}“ (${b.quelle})` : '-'}</td>
              <td>{it.umgepolt ? L('ja', 'yes') : L('nein', 'no')}</td>
              <td>{it.plan ? L(`ja (${planTitel(it.plan.plan) || 'Plan'})`, `yes (${planTitel(it.plan.plan) || 'plan'})`) : L('nein', 'no')}</td>
              <td class="aktion">
                <button class="k" type="button" onclick={() => aendern(it)} aria-label={L(`Item ändern: ${kutz(it.text, 40)}`, `Edit item: ${kutz(it.text, 40)}`)}>{L('Ändern', 'Edit')}</button>
                <button class="k" type="button" onclick={() => loeschen(it)} aria-label={L(`Item löschen: ${kutz(it.text, 40)}`, `Delete item: ${kutz(it.text, 40)}`)}>{L('Löschen', 'Delete')}</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="hilfe">{L('Noch keine Items.', 'No items yet.')}</p>
  {/if}

  <h5 id="ko-mm-in-s2-t">{L('Schritt 2: In einen Fragebogen-Plan übernehmen', 'Step 2: Transfer into a questionnaire plan')}</h5>
  <p class="hilfe">{L('Die Items kommen mit einer Antwortliste „Zustimmung, 5 Stufen“ in den Plan, ein Block je Kategorie. Umgepolte Items werden vermerkt. Den Plan bearbeiten Sie danach auf der Seite „Fragebogen planen“.', 'The items go into the plan with a response list "agreement, 5 levels", one block per category. Reverse-worded items are marked. You then edit the plan on the page "Plan a questionnaire".')}</p>
  <div class="feld">
    <label for="ko-mm-in-ziel">{L('Ziel', 'Target')}</label>
    <select id="ko-mm-in-ziel" bind:value={ziel}>
      <option value="neu">{L('Neuer Fragebogen-Plan', 'New questionnaire plan')}</option>
      {#each s.fragebogen as p (p.id)}<option value={p.id}>{planTitel(p.id)}</option>{/each}
    </select>
  </div>
  <div class="knopfzeile">
    <button class="k haupt" type="button" id="ko-mm-in-uebernehmen" disabled={!offene} onclick={uebernehmen}>{Lp(offene, '1 Item in den Plan übernehmen', `${offene} Items in den Plan übernehmen`, 'Transfer 1 item to the plan', `Transfer ${offene} items to the plan`)}</button>
    <button class="k" type="button" id="ko-mm-in-zum-plan" onclick={() => { location.hash = 'fragebogen'; }}>{L('Zum Fragebogen-Plan', 'To the questionnaire plan')}</button>
  </div>
  {#if planMeldung}<p id="ko-mm-in-plan-meldung">{planMeldung}</p>{/if}

  <h5 id="ko-mm-in-s3-t">{L('Schritt 3: Nach der Erhebung: Trennschärfe prüfen', 'Step 3: After the survey: check item-total correlation')}</h5>
  {#if !items.length}
    <p class="hilfe">{L('Dieser Schritt braucht Items aus Schritt 1.', 'This step needs items from step 1.')}</p>
  {:else if !zahlSpalten.length}
    <p class="hilfe">{L('Dazu brauchen Sie einen Datensatz mit den Antworten der Erhebung. Öffnen Sie ihn in Statable, dann ordnen Sie hier jedem Item seine Spalte zu.', 'For this you need a data set with the survey answers. Open it in Statable, then assign each item its column here.')}</p>
  {:else}
    <p class="hilfe">{L('Ordnen Sie jedem Item die Spalte seiner Antworten zu.', 'Assign each item the column holding its answers.')}</p>
    <ul class="spaltenliste">
      {#each items as it (it.id)}
        <li>
          <label for="ko-mm-in-sp-{it.id}">{L('Spalte im Datensatz für', 'Column in the data set for')} „{kutz(it.text, 60)}“ ({katName(it.herkunft)})</label>
          <select id="ko-mm-in-sp-{it.id}" value={it.spalte ?? ''} onchange={e => setzeSpalte(it, e.currentTarget.value)}>
            <option value="">{L('Keine Spalte', 'No column')}</option>
            {#each zahlSpalten as sp (sp.name)}<option value={sp.name}>{sp.bezeichnung && sp.bezeichnung !== sp.name ? `${sp.bezeichnung} (${sp.name})` : sp.name}</option>{/each}
          </select>
        </li>
      {/each}
    </ul>
    {#if gesetzt && !gruppen.length}<p class="hilfe">{L('Für die Auswertung braucht eine Kategorie mindestens zwei Items mit Spalte.', 'For the analysis a category needs at least two items with a column.')}</p>{/if}
    {#each gruppen as g (g.schluessel)}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="rahmen" role="region" tabindex="0" aria-label={L(`Joint Display ${g.name}, seitlich scrollbar`, `Joint display ${g.name}, scrollable sideways`)}>
        <table class="tab">
          <caption>{L(`Joint Display: Kategorie „${g.name}“, Items mit Herkunft und Trennschärfe`, `Joint display: category "${g.name}", items with origin and item-total correlation`)}</caption>
          <thead><tr>
            <th scope="col">{L('Kategorie', 'Category')}</th><th scope="col">{L('Item', 'Item')}</th><th scope="col">{L('Herkunft (Zitat mit Quelle)', 'Origin (quote with source)')}</th><th scope="col">{L('Trennschärfe', 'Item-total correlation')}</th><th scope="col">{L('Alpha ohne Item', 'Alpha without item')}</th>
          </tr></thead>
          <tbody>
            {#each g.items as it, i (it.id)}
              {@const b = it.beleg ? belegText(q, it.beleg) : null}
              <tr>
                <th scope="row" data-nolink>{g.name}</th>
                <td>{it.text}{it.umgepolt ? ` (${L('umgepolt', 'reversed')})` : ''}</td>
                <td>{b ? `„${kutz(b.text, 120)}“ (${b.quelle})` : '-'}</td>
                <td>{zeig(g.analyse.items[i]?.trennschaerfe)}</td>
                <td>{zeig(g.analyse.items[i]?.alphaOhne)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p>{L(`Cronbachs Alpha der Kategorie „${g.name}“: ${zeig(g.analyse.alpha)}; n = ${g.analyse.n} Antworten mit Werten in allen Items (listenweise).`, `Cronbach's alpha of the category "${g.name}": ${zeig(g.analyse.alpha)}; n = ${g.analyse.n} responses with values in all items (listwise).`)}</p>
      {#if g.analyse.n < 30}<p class="hilfe">{L('Mit weniger als 30 Antworten sind diese Werte unsicher. Lesen Sie sie nur als grobe Richtung.', 'With fewer than 30 responses these values are unstable. Read them only as a rough direction.')}</p>{/if}
      {#if g.items.length < 3}<p class="hilfe">{L('„Alpha ohne Item“ gibt es erst ab drei Items in einer Kategorie.', '"Alpha without item" needs at least three items in a category.')}</p>{/if}
    {/each}
    {#if gruppen.length}
      <p class="hilfe">{L('Trennschärfe: Zusammenhang eines Items mit den übrigen Items seiner Kategorie (korrigierte Item-Skala-Korrelation). Umgepolte Items werden vor dem Rechnen gedreht. Alpha ohne Item: Cronbachs Alpha der Kategorie, wenn dieses Item fehlte.', 'Item-total correlation: relation of an item with the other items of its category (corrected). Reverse-worded items are flipped before calculating. Alpha without item: Cronbach\'s alpha of the category if this item were missing.')}</p>
    {/if}
    <p class="hilfe">{L('Ob die Items wirklich eine Dimension bilden, prüft die Faktorenanalyse (Ladungen).', 'Whether the items really form one dimension is checked by factor analysis (loadings).')}</p>
    <div class="knopfzeile"><button class="k" type="button" id="ko-mm-in-faktor" onclick={() => { location.hash = 'blatt/neu'; }}>{L('Faktorenanalyse in Statable', 'Factor analysis in Statable')}</button></div>
  {/if}
</div>

<style>
  .mm-teil { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h4 { margin: 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  h5 { margin: var(--a2) 0 0; font: 650 var(--gr-klein)/1.3 var(--schrift-ui); }
  p { margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehler { color: var(--fehler, #b00020); }
  .feld { display: flex; flex-direction: column; gap: var(--a1); }
  .feld textarea, .feld select { width: 100%; box-sizing: border-box; font: inherit; }
  .eigen-wahl { display: flex; gap: var(--a2); align-items: flex-start; }
  .knopfzeile, .aktion { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .rahmen { overflow-x: auto; }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab caption { text-align: start; font-weight: 600; padding-bottom: var(--a1); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: top; }
  .tab thead th { font-weight: 650; }
  .spaltenliste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a3); }
  .spaltenliste li { display: flex; flex-direction: column; gap: var(--a1); }
  .spaltenliste select { max-width: 100%; font: inherit; }
</style>
