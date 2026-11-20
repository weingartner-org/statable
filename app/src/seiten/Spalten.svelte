<script lang="ts">
  import { istFehlend, fehlendSchluessel, fehlendSyntax } from '../lib/fehlend';
  import { einmal } from '../lib/einmal';
  import { s, d, L, aendere, melde, meldeFehler } from '../lib/sitzung.svelte';
import { entferneSpalte } from '../lib/datenschritte.svelte';
  import { dez } from '../i18n/profil';
  import { leseFehlendCodes, type Wert } from '../lib/eingabe';
  import { leseFehlendEingabe, fehlendAlsText } from '../lib/fehlendeingabe';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Normwerte from '../bausteine/Normwerte.svelte';
  import Mehrfachsets from '../bausteine/Mehrfachsets.svelte';
  import Skalen from '../bausteine/Skalen.svelte';
  import SpaltenWerkzeuge from '../bausteine/SpaltenWerkzeuge.svelte';
  import Reihenfolge from '../bausteine/Reihenfolge.svelte';
  import { ordnenMoeglich } from '../lib/reihenfolge';
  import { herkunftSeite } from '../lib/navi';
  import { lesbar, istSondercode, type Spalte } from '../lib/verzeichnis';
  import { kennung } from '../lib/verfahren';
  import { zit, zitWert } from '../lib/befehlstext';
  /** Normwerte gibt es für Zahlenspalten mit Messwerten - nicht für Gruppen und nicht für Kennungen (id, nr). */
  const normSpalten = $derived(s.spalten.filter(sp => sp.art === 'zahl' && sp.niveau !== 'nominal' && !kennung(sp)));
  // Beschriftungen: zit (einzeilig, gekürzt); Werte aus den Daten: zitWert (Inhalt bleibt, Steuerzeichen als Hex) - nie selbst Apostrophe verdoppeln (lib/befehlstext.ts)
  async function bezeichnung(sp: Spalte, t: string) {
    if (t === sp.bezeichnung) return;
    await aendere(L(`Bezeichnung von ${sp.name}`, `Label of ${sp.name}`), `VARIABLE LABELS ${sp.name} ${zit(t.slice(0, 250))}.`); melde(L(`Gespeichert: ${t || sp.name}`, `Saved: ${t || sp.name}`), true);
  }
  async function niveau(sp: Spalte, n: string) {
    await aendere(L(`Art von ${sp.name}`, `Type of ${sp.name}`), `VARIABLE LEVEL ${sp.name} (${n}).`); melde(L('Gespeichert.', 'Saved.'), true);
  }
  async function fehlend(sp: Spalte, t: string) {
    let liste: string;
    if (sp.art === 'zahl') {
      // Wie in SPSS: bis zu drei Einzelwerte ODER ein Bereich (von - bis) und höchstens ein Einzelwert (lib/fehlendeingabe.ts).
      const r = leseFehlendEingabe(t);
      if ('fehler' in r) { meldeFehler(r.fehler); return; }
      liste = fehlendSyntax(r);
    } else {
      // Text: die leere Zelle bleibt fehlend (Prüfung A1) - außer in einer .sav, in der sie gültig ist (`leerGueltig`) -, dazu bis zu zwei eigene Codes.
      const werte = leseFehlendCodes(t);
      liste = [...(sp.leerGueltig ? [] : ['']), ...werte.slice(0, sp.leerGueltig ? 3 : 2)].map(zit).join(', ');
    }
    await aendere(L(`„Keine Angabe“ bei ${sp.name}`, `"No answer" in ${sp.name}`), `MISSING VALUES ${sp.name} (${liste}).`); melde(L('Gespeichert.', 'Saved.'), true);
  }
  /** Zahlen-Codes einer Spalte, die man benennen kann (1 = ja). Text steht schon als Wort da;
   *  „Zahlen zum Rechnen" nur bei höchstens 5 Stufen, sonst ist es keine Gruppe (Alter, Punkte). */
  function stufen(sp: Spalte): (string | number)[] {
    if (sp.art !== 'zahl') return [];
    const grenze = sp.niveau === 'metrisch' ? 5 : 12;
    const i = s.spalten.indexOf(sp);
    // Die Durchsicht aller Zeilen einmal je Datenstand (lib/einmal.ts) - nicht bei jedem Zeichnen der Seite (Abschlusstest A2).
    const gefunden = einmal(s.zeilen, `stufen|${i}|${grenze}|${fehlendSchluessel(sp)}`, () => {
      const g = new Set<string | number>();
      for (const z of s.zeilen) { const v = z[i]; if (v === null || v === undefined || v === '' || istFehlend(sp, v as number)) continue; g.add(v); if (g.size > grenze) return null; }
      return g;
    });
    if (!gefunden) return Object.keys(sp.werteLabels).length ? [...new Set(Object.keys(sp.werteLabels).filter(w => !istSondercode(sp, Number(w))).map(Number))] : [];
    const m = new Set(gefunden);
    for (const w of Object.keys(sp.werteLabels)) if (!istSondercode(sp, Number(w))) m.add(sp.art === 'zahl' ? Number(w) : w);
    return [...m].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')));
  }
  /** Die Engine zeigt Zahlen im Format der Spalte (1.00) - darum über den Zahlenwert vergleichen. */
  /** „1 = ja“; Stata-Fehlende ohne Zahl: „weiß nicht (fehlend)“. */
  const wl = (sp: Spalte, w: string, l: string) => (istSondercode(sp, Number(w)) ? `${l} (${L('fehlend', 'missing')})` : `${w} = ${l}`);
  const schluessel = (sp: Spalte, w: string | number) => (sp.art === 'zahl' ? String(Number(w)) : String(w));
  const labels = (sp: Spalte) => Object.fromEntries(Object.entries(sp.werteLabels).map(([w, l]) => [schluessel(sp, w), l]));
  async function gruppenName(sp: Spalte, wert: string | number, t: string) {
    const neu = labels(sp); const k = schluessel(sp, wert);
    if (t.trim()) neu[k] = t.trim().slice(0, 120); else delete neu[k];
    if ((labels(sp)[k] ?? '') === (neu[k] ?? '')) return;
    const paare = Object.entries(neu).map(([w, l]) => `${sp.art === 'zahl' ? w : zitWert(w)} ${zit(l)}`).join(' ');
    await aendere(L(`Gruppen bei ${sp.name}`, `Groups in ${sp.name}`), paare ? `VALUE LABELS ${sp.name} ${paare}.` : `VALUE LABELS ${sp.name}.`);
    melde(t.trim() ? L(`${k} heißt jetzt „${t.trim()}“.`, `${k} is now called "${t.trim()}".`) : L(`${k} hat keinen Namen mehr.`, `${k} has no name now.`), true);
  }
  /** Sprung zu den Werkzeugen: Hash bleibt (die App routet darüber), Fokus auf die Überschrift. */
  function zuWerkzeugen(e: Event) {
    e.preventDefault();
    const h = document.getElementById('sp-werkzeuge-t');
    h?.scrollIntoView({ block: 'start' }); h?.focus({ preventScroll: true });
  }
  /** Der eine Ausgang der Seite: dahin, woher man kam (sonst die Daten). */
  const fertig = () => { location.hash = herkunftSeite('spalten'); };
  async function entfernen(sp: Spalte) { await entferneSpalte(sp.name); }
  const NIVEAU = $derived([['SCALE', L('Zahlen zum Rechnen', 'Numbers to calculate with'), 'metrisch'], ['NOMINAL', L('Gruppen ohne Reihenfolge', 'Groups with no order'), 'nominal'], ['ORDINAL', L('Gruppen mit Reihenfolge', 'Groups with an order'), 'ordinal']]);
</script>

<div class="tisch ohne-rand"><section class="blatt rund" aria-labelledby="sp-t">
  <SeitenKopf titelId="sp-t" titel={L('Spalten beschreiben', 'Describe columns')} hilfe={{ id: 'spalten-seite', text: L('Hilfe zu den Spalten', 'Help on columns') }}>
    {#snippet aktionen()}<button class="k haupt" type="button" onclick={fertig}>{L('Fertig', 'Done')}</button>{/snippet}
    {#snippet untertitel()}<p>{d('Hier sagst du Statable, was in jeder Spalte steht. Dann schlägt es passende Rechnungen vor.', 'Hier sagen Sie Statable, was in jeder Spalte steht. Dann schlägt es passende Rechnungen vor.', 'Tell Statable here what each column contains. It then suggests fitting calculations.')}</p>{/snippet}
  </SeitenKopf>
  {#if s.spalten.length}<p class="hilfe sp-sprung"><a href="#sp-werkzeuge" onclick={zuWerkzeugen}>{L('Werkzeuge für Spalten: Skalen, Mehrfachantworten, Spaltentyp, Dezimalstellen, Wertelabels, Normwerte', 'Column tools: scales, multiple response, column type, decimals, value labels, norm scores')}</a></p>{/if}
  <div class="spalten">
    {#each s.spalten as sp, i (sp.name)}
      <div class="spalte">
        <div class="name">{sp.name}<small>{L('Spalte', 'Column')} {i + 1} · {sp.art === 'text' ? L('Text', 'Text') : sp.art === 'datum' ? L('Datum', 'Date') : L('Zahlen', 'Numbers')}</small>
          {#if s.spalten.length > 1}<button class="k leise klein" type="button" style="margin-top:var(--a2)" onclick={() => entfernen(sp)}><span class="nur-vorleser">{sp.name}: </span>{L('Spalte entfernen', 'Remove column')}</button>{/if}</div>
        <div class="eingabe"><label for="b-{sp.name}"><span class="nur-vorleser">{sp.name}: </span>{L('Bezeichnung (steht in Tabellen und Diagrammen)', 'Label (appears in tables and charts)')}</label><input type="text" id="b-{sp.name}" value={sp.bezeichnung} onchange={(e) => bezeichnung(sp, (e.currentTarget as HTMLInputElement).value)}></div>
        <div class="eingabe"><label for="a-{sp.name}"><span class="nur-vorleser">{sp.name}: </span>{L('Was steht drin?', 'What does it contain?')}</label>
          <select id="a-{sp.name}" data-tipp={L('Bestimmt, wie Statable die Spalte rechnet: als Zahl, als Gruppe oder als Gruppe mit Reihenfolge', 'Decides how Statable treats the column: as a number, a group or an ordered group')} onchange={(e) => niveau(sp, (e.currentTarget as HTMLSelectElement).value)}>
            {#each NIVEAU as [w, t, n]}<option data-begriff={n === 'metrisch' ? 'metrisch' : n === 'nominal' ? 'nominalskala' : 'ordinalskala'} value={w} selected={sp.niveau === n}>{t}</option>{/each}</select>
          {#if ordnenMoeglich(sp, i, s.zeilen)}<Reihenfolge {sp} {i} />{/if}
          {#if stufen(sp).length}<details class="auf gruppen-namen"><summary><span class="nur-vorleser">{sp.name}: </span>{L('Gruppen benennen', 'Name the groups')} ({Object.keys(sp.werteLabels).length ? Object.entries(sp.werteLabels).slice(0, 3).map(([w, l]) => wl(sp, w, l)).join(', ') + (Object.keys(sp.werteLabels).length > 3 ? ' …' : '') : L('noch ohne Namen', 'no names yet')})</summary>
            <p class="hilfe">{d('Gib jeder Zahl einen Namen, z. B. 1 = ja. Die Namen stehen dann in Tabellen und Diagrammen.', 'Geben Sie jeder Zahl einen Namen, z. B. 1 = ja. Die Namen stehen dann in Tabellen und Diagrammen.', 'Give each number a name, e.g. 1 = yes. The names then appear in tables and charts.')}</p>
            {#each stufen(sp) as w (w)}<div class="gruppe-zeile"><label for="g-{sp.name}-{w}"><span class="nur-vorleser">{sp.name}, {L('Wert', 'value')} </span>{dez(String(w))}</label><input type="text" id="g-{sp.name}-{w}" value={labels(sp)[schluessel(sp, w)] ?? ''} placeholder={L('Name', 'Name')} onchange={(e) => gruppenName(sp, w, (e.currentTarget as HTMLInputElement).value)}></div>{/each}
          </details>{:else if Object.keys(sp.werteLabels).length}<span class="hilfe">{L('Gruppen', 'Groups')}:</span><span class="gruppen-liste">{#each Object.entries(sp.werteLabels).slice(0, 8) as [w, l]}<span>{wl(sp, w, l)}</span>{/each}</span>{/if}</div>
        <div class="eingabe"><label for="k-{sp.name}"><span class="nur-vorleser">{sp.name}: </span>{L('„Keine Angabe“ steht für', '"No answer" is coded as')}</label><input type="text" id="k-{sp.name}" value={sp.art === 'zahl' ? fehlendAlsText(sp) : sp.fehlendText} placeholder={sp.art === 'zahl' ? L('z. B. 99', 'e.g. 99') : L('z. B. k.A.', 'e.g. n/a')} onchange={(e) => fehlend(sp, (e.currentTarget as HTMLInputElement).value)}>
          <span class="hilfe">{sp.art === 'zahl' ? L('Bis zu drei Werte, oder ein Bereich und ein Wert (wie in SPSS).', 'Up to three values, or one range and one value (as in SPSS).') : L('Höchstens drei Werte.', 'At most three values.')}</span></div>
      </div>
    {/each}
  </div>
  {#if s.spalten.length}
    <div class="sp-werkzeuge" id="sp-werkzeuge" role="group" aria-label={L('Spaltenwerkzeuge', 'Column tools')}>
      <h2 id="sp-werkzeuge-t" class="sp-werkzeuge-t" tabindex="-1">{L('Werkzeuge für Spalten', 'Column tools')}</h2>
      {#if s.spalten.some(sp => sp.art === 'zahl')}<div class="normwerte-oben"><Skalen /></div>{/if}
      {#if s.spalten.length > 1}<div class="normwerte-oben"><Mehrfachsets /></div>{/if}
      <div class="normwerte-oben"><SpaltenWerkzeuge /></div>
      {#if normSpalten.length}<div class="normwerte-oben"><Normwerte spalten={normSpalten} /></div>{/if}
    </div>
  {/if}
</section></div>

<style>
  .sp-sprung { margin: var(--a2) 0 var(--a3); font-size: var(--gr-klein); }
  .sp-werkzeuge { margin-top: var(--a5, 2rem); }
  .sp-werkzeuge-t { font-size: var(--gr-h2); margin: 0 0 var(--a2); }
  .sp-werkzeuge-t:focus-visible { box-shadow: var(--fokus-ring); }
</style>
