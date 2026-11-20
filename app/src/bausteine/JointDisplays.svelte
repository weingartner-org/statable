<script lang="ts">
  /**
   * Joint Displays (Stufe A2): Zahlen und Zitate in einer Tabelle zeigen. Statable zählt und rechnet nur (alle Rechnungen in `lib/mixed.ts`).
   * Belegstellen wählt die Person (nie automatisch), Passung und Meta-Inferenz schreibt die Person. Keine KI-Deutung.
   * Speichern über `aendere()` (Rückgängig), Ansagen über `sage()`, kein modales Fenster, Löschen mit Bestätigung im Text.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { herunterladen } from '../lib/export';
  import { Laedt } from '../lib/laedt.svelte';
  import { ganzZahl } from '../i18n/profil';
  import { baumReihenfolge } from '../lib/kodieren';
  import { aendere, ko, sprache } from '../lib/kodieren.svelte';
  import { themenReihenfolge } from '../lib/themen';
  import { passungName } from '../lib/faellesaetze';
  import { jointDisplayHtml, jointDisplayWord } from '../lib/jointdisplay-word';
  import { aendereJd, belegText, entferneJd, jdAufbau, kleineFallzahlSatz, legeJdAn, setzeBeleg, setzeJdMeta, setzeJdPassung, setzeJdZahlen, spaltenErgebnis, zeilenSchluessel, type DatenSicht, type JdAufbauZeile, type JdZellAnzeige } from '../lib/mixed';
  import { JD_PASSUNGEN, type JdArt, type JdGruppierung, type JdPassung, type JdZeile, type JointDisplay, type QualProjekt } from '../lib/qualprojekt';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';

  interface Props { q: QualProjekt; daten: DatenSicht }
  let { q, daten }: Props = $props();

  const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const lade = new Laedt();

  const ARTEN: { wert: JdArt; de: string; en: string }[] = [
    { wert: 'qual-nach-gruppen', de: 'Themen oder Codes nach Gruppen (z. B. nach einer Fallvariable)', en: 'Themes or codes by groups (e.g. by a case variable)' },
    { wert: 'zahlen-nach-qual', de: 'Zahlen nach qualitativen Gruppen (Typologietabelle)', en: 'Numbers by qualitative groups (typology table)' },
    { wert: 'seite-an-seite', de: 'Seite an Seite (Ergebnis aus Zahlen neben Ergebnis aus Interviews)', en: 'Side by side (result from the numbers next to result from the interviews)' },
  ];
  const artName = (a: JdArt): string => { const x = ARTEN.find(e => e.wert === a)!; return L(x.de, x.en); };

  const displays = $derived(q.jointDisplays ?? []);
  let auswahl = $state('');
  const jd = $derived<JointDisplay | undefined>(displays.find(j => j.id === auswahl) ?? displays[0]);
  const aufbau = $derived(jd ? jdAufbau(q, jd, { daten }) : undefined);

  let neuArt = $state<JdArt>('qual-nach-gruppen');
  let neuName = $state('');
  let neuFehler = $state('');
  let umName = $state<Record<string, string>>({});
  let loeschen = $state<string | null>(null);
  /** U1 Teil 2 (H4): das Namensfeld zum Umbenennen erscheint erst nach „Umbenennen“, sonst stehen zwei Felder „Name“ untereinander */
  let umAuf = $state<string | null>(null);
  async function oeffneUmbenennen(j: JointDisplay) { umAuf = j.id; await tick(); document.getElementById('ko-mm-jd-name')?.focus(); }
  async function schliesseUmbenennen(j: JointDisplay) { delete umName[j.id]; umAuf = null; await tick(); document.getElementById('ko-mm-jd-um-btn')?.focus(); }
  let spaltenWahl = $state<Record<string, string>>({});

  const baum = $derived(baumReihenfolge(q.codes));
  const themenListe = $derived(themenReihenfolge(q).filter(e => e.thema.stand !== 'verworfen'));
  const codeName = (id: string): string => q.codes.find(c => c.id === id)?.name ?? '';
  const themaName = (id: string): string => (q.themen ?? []).find(t => t.id === id)?.name ?? '';
  const spaltenLabel = (n: string): string => { const sp = daten.spalten.find(x => x.name === n); return sp && sp.bezeichnung && sp.bezeichnung !== sp.name ? `${sp.bezeichnung} (${sp.name})` : n; };

  /* ---- Gruppierung als Text-Schlüssel ---- */
  const gSchl = (g: JdGruppierung | undefined): string => (!g ? '' : g.quelle === 'typen' ? 'typen' : g.quelle === 'spalte' ? `spalte:${g.name}` : `${g.quelle}:${g.id}`);
  function gLesen(t: string): JdGruppierung | undefined {
    if (t === 'typen') return { quelle: 'typen' };
    const i = t.indexOf(':'); if (i < 0) return undefined;
    const k = t.slice(0, i), r = t.slice(i + 1);
    if (k === 'spalte') return { quelle: 'spalte', name: r };
    if (k === 'variable' || k === 'code' || k === 'thema') return { quelle: k, id: r } as JdGruppierung;
    return undefined;
  }
  const gName = (g: JdGruppierung | undefined): string => (!g ? '' : g.quelle === 'typen' ? L('Typen', 'Types') : g.quelle === 'spalte' ? spaltenLabel(g.name) : g.quelle === 'variable' ? (q.variablen.find(v => v.id === g.id)?.name ?? '') : g.quelle === 'code' ? codeName(g.id) : themaName(g.id));

  const ZEILEN_KOPF: Record<JdArt, [string, string]> = {
    'qual-nach-gruppen': ['Thema oder Code', 'Theme or code'],
    'zahlen-nach-qual': ['Gruppe', 'Group'],
    'seite-an-seite': ['Thema oder Code', 'Theme or code'],
  };
  const zeilenKopf = (a: JdArt): string => L(ZEILEN_KOPF[a][0], ZEILEN_KOPF[a][1]);

  /* ---- Anlegen, Umbenennen, Löschen ---- */
  async function anlegen() {
    neuFehler = '';
    const name = neuName.trim();
    if (!name) { neuFehler = L('Bitte geben Sie dem Joint Display einen Namen.', 'Please give the joint display a name.'); sage(neuFehler, 'dringend'); document.getElementById('ko-mm-jd-neu-name')?.focus(); return; }
    let id = '';
    aendere(L(`Joint Display „${name}“ wieder entfernt`, `Joint display "${name}" removed again`), q0 => { const r = legeJdAn(q0, neuArt, name); id = r.id; return r.q; });
    auswahl = id; neuName = '';
    sage(L(`Joint Display „${name}“ angelegt. Wählen Sie unten die Einstellungen.`, `Joint display "${name}" created. Choose the settings below.`));
    await tick(); await tick();
    document.getElementById('ko-mm-jd-name-t')?.focus();
  }
  function umbenennen(j: JointDisplay) {
    const n = (umName[j.id] ?? j.name).trim();
    if (!n) { sage(L('Der Name darf nicht leer sein.', 'The name must not be empty.'), 'dringend'); document.getElementById('ko-mm-jd-name')?.focus(); return; }
    if (n === j.name) { sage(L('Der Name ist unverändert.', 'The name is unchanged.')); return; }
    aendere(L(`Name „${j.name}“ wieder hergestellt`, `Name "${j.name}" restored`), q0 => aendereJd(q0, j.id, x => ({ ...x, name: n })));
    delete umName[j.id]; umAuf = null;
    sage(L(`Umbenannt in „${n}“.`, `Renamed to "${n}".`));
    void tick().then(() => document.getElementById('ko-mm-jd-name-t')?.focus());
  }
  async function frageLoeschen(j: JointDisplay) {
    loeschen = j.id;
    sage(L('Wirklich löschen? Auch die gewählten Belegstellen, Passung und Meta-Inferenz dieses Displays gehen verloren, über „Rückgängig“ holen Sie es zurück.', 'Really delete? The chosen passages, fit and meta-inferences of this display are lost too; "Undo" brings it back.'));
    await tick();
    document.getElementById(`ko-mm-jd-ja-${j.id}`)?.focus();
  }
  async function loesche(j: JointDisplay) {
    aendere(L(`Joint Display „${j.name}“ wieder angelegt`, `Joint display "${j.name}" restored`), q0 => entferneJd(q0, j.id));
    loeschen = null; auswahl = '';
    sage(L(`Joint Display „${j.name}“ gelöscht.`, `Joint display "${j.name}" deleted.`));
    await tick();
    document.getElementById('ko-mm-jd-t')?.focus();
  }

  /* ---- Einstellungen ---- */
  const aendereMit = (text: string, id: string, f: (j: JointDisplay) => JointDisplay) => aendere(text, q0 => aendereJd(q0, id, f));

  function setzeGruppierung(j: JointDisplay, t: string) {
    const g = gLesen(t);
    aendereMit(L('Gruppierung wieder zurückgenommen', 'Grouping undone'), j.id, x => { const y = { ...x }; if (g) y.gruppierung = g; else delete y.gruppierung; return y; });
    sage(g ? L(`Gruppen nach: ${gName(g)}.`, `Groups by: ${gName(g)}.`) : L('Keine Gruppierung gewählt.', 'No grouping chosen.'));
  }
  function schalteZeile(j: JointDisplay, z: JdZeile, an: boolean, name: string) {
    aendereMit(an ? L(`Zeile „${name}“ wieder herausgenommen`, `Row "${name}" removed again`) : L(`Zeile „${name}“ wieder aufgenommen`, `Row "${name}" added again`), j.id, x => ({ ...x, zeilen: an ? [...x.zeilen.filter(w => !(w.art === z.art && w.id === z.id)), z] : x.zeilen.filter(w => !(w.art === z.art && w.id === z.id)) }));
    sage(an ? L(`Zeile „${name}“ aufgenommen.`, `Row "${name}" added.`) : L(`Zeile „${name}“ herausgenommen.`, `Row "${name}" removed.`));
  }
  function schalteSpalte(j: JointDisplay, n: string, an: boolean) {
    aendereMit(an ? L(`Spalte „${n}“ wieder herausgenommen`, `Column "${n}" removed again`) : L(`Spalte „${n}“ wieder aufgenommen`, `Column "${n}" added again`), j.id, x => ({ ...x, spalten: an ? [...x.spalten.filter(w => w !== n), n] : x.spalten.filter(w => w !== n) }));
    sage(an ? L(`Spalte „${spaltenLabel(n)}“ aufgenommen.`, `Column "${spaltenLabel(n)}" added.`) : L(`Spalte „${spaltenLabel(n)}“ herausgenommen.`, `Column "${spaltenLabel(n)}" removed.`));
  }
  const hatZeile = (j: JointDisplay, art: 'code' | 'thema', id: string): boolean => j.zeilen.some(z => z.art === art && z.id === id);

  async function zurVerknuepfung() {
    ko.mmTeil = 'verknuepfen';
    await tick(); await tick();
    document.getElementById('ko-mm-vk-t')?.focus();
  }
  const fehltText = (f: string): string => ({
    gruppierung: L('Wählen Sie, wonach die Gruppen gebildet werden.', 'Choose by what the groups are formed.'),
    zeilen: L('Wählen Sie mindestens einen Code oder ein Thema für die Zeilen.', 'Choose at least one code or theme for the rows.'),
    spalten: L('Wählen Sie mindestens eine Spalte des Datensatzes.', 'Choose at least one column of the data set.'),
    verknuepfung: L('Die Fälle sind noch nicht mit dem Datensatz verknüpft.', 'The cases are not yet linked to the data set.'),
    daten: L('Es sind keine Daten geöffnet. Öffnen Sie zuerst die Umfrage in Statable.', 'No data is open. Open the survey in Statable first.'),
    faelle: L('Es gibt noch keine Fälle.', 'There are no cases yet.'),
  } as Record<string, string>)[f] ?? '';

  /* ---- Zellen ---- */
  const kurz = (t: string, n = 60): string => { const x = t.replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x; };
  function waehleBeleg(j: JointDisplay, z: JdAufbauZeile, c: JdZellAnzeige, kopf: string, segment: string) {
    aendere(segment ? L('Belegstelle wieder entfernt', 'Passage removed again') : L('Belegstelle wieder gewählt', 'Passage chosen again'), q0 => setzeBeleg(q0, j.id, z.schluessel, c.gruppe!, segment || null));
    sage(segment ? L(`Belegstelle gewählt für ${z.name}, ${kopf}.`, `Passage chosen for ${z.name}, ${kopf}.`) : L(`Belegstelle entfernt für ${z.name}, ${kopf}.`, `Passage removed for ${z.name}, ${kopf}.`));
  }
  function speicherePassung(j: JointDisplay, z: JdAufbauZeile, p: JdPassung) {
    aendere(L('Passung wieder zurückgenommen', 'Fit undone'), q0 => setzeJdPassung(q0, j.id, z.schluessel, p));
    sage(L(`Passung für ${z.name}: ${passungName(p)}.`, `Fit for ${z.name}: ${passungName(p)}.`));
  }
  function speichereMeta(j: JointDisplay, z: JdAufbauZeile, t: string) {
    if (t === z.meta) return;
    aendere(L('Meta-Inferenz wieder zurückgenommen', 'Meta-inference undone'), q0 => setzeJdMeta(q0, j.id, z.schluessel, t));
    sage(L(`Meta-Inferenz für ${z.name} gespeichert.`, `Meta-inference for ${z.name} saved.`));
  }
  function speichereZahlen(j: JointDisplay, z: JdAufbauZeile, t: string) {
    if (t === (z.zahlen ?? '')) return;
    aendere(L('Ergebnis aus den Zahlen wieder zurückgenommen', 'Result from the numbers undone'), q0 => setzeJdZahlen(q0, j.id, z.schluessel, t));
    sage(L(`Ergebnis aus den Zahlen für ${z.name} gespeichert.`, `Result from the numbers for ${z.name} saved.`));
  }
  function uebernimmSpalte(j: JointDisplay, z: JdAufbauZeile) {
    const n = spaltenWahl[z.schluessel] ?? daten.spalten[0]?.name ?? '';
    const t = n ? spaltenErgebnis(daten, n) : null;
    if (t === null) { sage(L('Bitte wählen Sie zuerst eine Spalte.', 'Please choose a column first.'), 'dringend'); return; }
    aendere(L('Ergebnis aus den Zahlen wieder zurückgenommen', 'Result from the numbers undone'), q0 => setzeJdZahlen(q0, j.id, z.schluessel, t));
    sage(L(`Ergebnis aus Spalte „${spaltenLabel(n)}“ für ${z.name} übernommen. Sie können den Text ändern.`, `Result from column "${spaltenLabel(n)}" taken for ${z.name}. You can edit the text.`));
  }

  /* ---- Export ---- */
  const dateiStamm = (j: JointDisplay): string => `Joint-Display-${j.name.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'Tabelle'}`;
  const exportOpt = (j: JointDisplay) => ({ titel: j.name, art: artName(j.art), hinweis: kleineFallzahlSatz(), sprache: sprache(), zeilenKopf: zeilenKopf(j.art) });
  async function alsWord(j: JointDisplay) {
    if (!aufbau) return;
    await lade.mit(async () => {
      try {
        const bytes = await jointDisplayWord(aufbau, exportOpt(j));
        const datei = `${dateiStamm(j)}.docx`;
        herunterladen(bytes, datei, MIME_DOCX);
        sage(L(`${datei} wird heruntergeladen.`, `${datei} is being downloaded.`));
      } catch { sage(L('Die Word-Datei konnte nicht erstellt werden.', 'The Word file could not be created.'), 'dringend'); }
    });
  }
  function alsHtml(j: JointDisplay) {
    if (!aufbau) return;
    try {
      const datei = `${dateiStamm(j)}.html`;
      herunterladen(new TextEncoder().encode(jointDisplayHtml(aufbau, exportOpt(j))), datei, 'text/html;charset=utf-8');
      sage(L(`${datei} wird heruntergeladen.`, `${datei} is being downloaded.`));
    } catch { sage(L('Die HTML-Datei konnte nicht erstellt werden.', 'The HTML file could not be created.'), 'dringend'); }
  }

  const nFaelle = (n: number): string => Lp(n, '1 Fall', `${ganzZahl(n)} Fälle`, '1 case', `${ganzZahl(n)} cases`);
  const istQualZelle = (c: JdZellAnzeige): boolean => c.gruppe !== undefined && c.kandidaten !== undefined;
</script>

<div class="mm-teil">
  <h4 id="ko-mm-jd-t" tabindex="-1">{L('Zahlen und Zitate zusammen zeigen (Joint Display)', 'Show numbers and quotes together (joint display)')}</h4>
  <p class="hilfe">{L('Ein Joint Display ist eine Tabelle, in der Zahlen aus der Umfrage und Aussagen aus den Interviews nebeneinander stehen. Statable zählt und rechnet; welche Zitate Sie zeigen, ob Zahlen und Aussagen zusammenpassen und was Sie daraus schließen, entscheiden Sie.', 'A joint display is a table in which numbers from the survey and statements from the interviews stand side by side. Statable counts and calculates; which quotes you show, whether numbers and statements fit together and what you conclude is for you to decide.')}</p>

  <fieldset class="gruppe">
    <legend>{L('Neues Joint Display', 'New joint display')}</legend>
    <fieldset class="arten">
      <legend>{L('Art', 'Kind')}</legend>
      {#each ARTEN as a (a.wert)}
        <label class="radio"><input type="radio" name="ko-mm-jd-art" value={a.wert} checked={neuArt === a.wert} onchange={() => (neuArt = a.wert)}>{L(a.de, a.en)}</label>
      {/each}
    </fieldset>
    <div class="feld">
      <label for="ko-mm-jd-neu-name">{L('Name', 'Name')}</label>
      <input id="ko-mm-jd-neu-name" type="text" bind:value={neuName} aria-describedby={neuFehler ? 'ko-mm-jd-neu-fehler' : undefined} aria-invalid={neuFehler ? 'true' : undefined}>
    </div>
    {#if neuFehler}<p class="fehl" id="ko-mm-jd-neu-fehler">{neuFehler}</p>{/if}
    <div class="knopfzeile"><button class="k" id="ko-mm-jd-neu-btn" type="button" onclick={() => void anlegen()}>{L('Joint Display anlegen', 'Create joint display')}</button></div>
  </fieldset>

  {#if !displays.length}
    <p>{L('Es gibt noch kein Joint Display.', 'There is no joint display yet.')}</p>
  {:else if jd && aufbau}
    {#if displays.length > 1}
      <div class="feld">
        <label for="ko-mm-jd-wahl">{L('Joint Display', 'Joint display')}</label>
        <select id="ko-mm-jd-wahl" value={jd.id} onchange={e => { auswahl = e.currentTarget.value; loeschen = null; }}>
          {#each displays as j (j.id)}<option value={j.id}>{j.name} ({artName(j.art)})</option>{/each}
        </select>
      </div>
    {/if}

    <h5 id="ko-mm-jd-name-t" tabindex="-1" data-nolink>{jd.name}</h5>
    <p class="klein" data-nolink>{artName(jd.art)}</p>
    {#if umAuf === jd.id}
      <div class="feld">
        <label for="ko-mm-jd-name">{L('Neuer Name des Joint Displays', 'New name of the joint display')}</label>
        <input id="ko-mm-jd-name" type="text" value={umName[jd.id] ?? jd.name} oninput={e => (umName[jd.id] = e.currentTarget.value)} onkeydown={e => { if (e.key === 'Enter') { e.preventDefault(); umbenennen(jd); } }}>
      </div>
      <div class="knopfzeile">
        <button class="k" type="button" onclick={() => umbenennen(jd)}>{L('Namen übernehmen', 'Apply name')}</button>
        <button class="k leise" type="button" onclick={() => void schliesseUmbenennen(jd)}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    {/if}
    <div class="knopfzeile">
      {#if umAuf !== jd.id}<button class="k" id="ko-mm-jd-um-btn" type="button" onclick={() => void oeffneUmbenennen(jd)}>{L('Umbenennen', 'Rename')}</button>{/if}
      <button class="k" type="button" onclick={() => void frageLoeschen(jd)}>{L(`Joint Display „${jd.name}“ löschen`, `Delete joint display "${jd.name}"`)}</button>
    </div>
    {#if loeschen === jd.id}
      <div class="bestaetigung" role="group" aria-label={L('Löschen bestätigen', 'Confirm deleting')}>
        <p>{L(`Joint Display „${jd.name}“ wirklich löschen? Belegstellen, Passung und Meta-Inferenz gehen mit. Über „Rückgängig“ holen Sie es zurück.`, `Really delete joint display "${jd.name}"? Passages, fit and meta-inferences go with it. "Undo" brings it back.`)}</p>
        <div class="knopfzeile">
          <button class="k haupt" id="ko-mm-jd-ja-{jd.id}" type="button" onclick={() => void loesche(jd)}>{L('Ja, löschen', 'Yes, delete')}</button>
          <button class="k" type="button" onclick={() => { loeschen = null; sage(L('Nicht gelöscht.', 'Not deleted.')); document.getElementById('ko-mm-jd-name-t')?.focus(); }}>{L('Abbrechen', 'Cancel')}</button>
        </div>
      </div>
    {/if}

    <h5 id="ko-mm-jd-einst-t">{L('Einstellungen', 'Settings')}</h5>
    {#if jd.art !== 'seite-an-seite'}
      <div class="feld">
        <label for="ko-mm-jd-gruppe">{jd.art === 'zahlen-nach-qual' ? L('Zeilen bilden nach (Gruppierung)', 'Form rows by (grouping)') : L('Spalten bilden nach (Gruppierung)', 'Form columns by (grouping)')}</label>
        <select id="ko-mm-jd-gruppe" value={gSchl(jd.gruppierung)} onchange={e => setzeGruppierung(jd, e.currentTarget.value)}>
          <option value="">{L('bitte wählen', 'please choose')}</option>
          {#if q.variablen.length}
            <optgroup label={L('Fallvariablen der Interviews', 'Case variables of the interviews')}>
              {#each q.variablen as v (v.id)}<option value={`variable:${v.id}`}>{v.name}</option>{/each}
            </optgroup>
          {/if}
          {#if q.typen?.length}<option value="typen">{L('Typen (von Ihnen gebildet)', 'Types (formed by you)')}</option>{/if}
          {#if jd.art === 'qual-nach-gruppen' && q.verknuepfung && daten.spalten.length}
            <optgroup label={L('Spalten des Datensatzes (über die Verknüpfung)', 'Columns of the data set (via the link)')}>
              {#each daten.spalten as sp (sp.name)}<option value={`spalte:${sp.name}`}>{spaltenLabel(sp.name)}</option>{/each}
            </optgroup>
          {/if}
          {#if jd.art === 'zahlen-nach-qual'}
            <optgroup label={L('mit oder ohne einen Code', 'with or without a code')}>
              {#each baum as e (e.code.id)}<option value={`code:${e.code.id}`}>{L(`mit / ohne „${e.code.name}“`, `with / without "${e.code.name}"`)}</option>{/each}
            </optgroup>
            {#if themenListe.length}
              <optgroup label={L('mit oder ohne ein Thema', 'with or without a theme')}>
                {#each themenListe as e (e.thema.id)}<option value={`thema:${e.thema.id}`}>{L(`mit / ohne „${e.thema.name}“`, `with / without "${e.thema.name}"`)}</option>{/each}
              </optgroup>
            {/if}
          {/if}
        </select>
      </div>
    {/if}

    {#if jd.art !== 'zahlen-nach-qual'}
      <fieldset class="gruppe">
        <legend>{L('Zeilen: Codes und Themen', 'Rows: codes and themes')}</legend>
        {#if !baum.length && !themenListe.length}<p class="klein">{L('Es gibt noch keine Codes und keine Themen.', 'There are no codes and no themes yet.')}</p>{/if}
        {#each baum as e (e.code.id)}
          <label class="schalter" style="padding-inline-start: {(e.ebene - 1) * 1.25}rem"><input type="checkbox" checked={hatZeile(jd, 'code', e.code.id)} onchange={ev => schalteZeile(jd, { art: 'code', id: e.code.id }, ev.currentTarget.checked, e.code.name)}><span data-nolink>{L('Code', 'Code')}: {e.code.name}</span></label>
        {/each}
        {#each themenListe as e (e.thema.id)}
          <label class="schalter" style="padding-inline-start: {e.ebene * 1.25}rem"><input type="checkbox" checked={hatZeile(jd, 'thema', e.thema.id)} onchange={ev => schalteZeile(jd, { art: 'thema', id: e.thema.id }, ev.currentTarget.checked, e.thema.name)}><span data-nolink>{L('Thema', 'Theme')}: {e.thema.name}</span></label>
        {/each}
      </fieldset>
    {:else if daten.spalten.length}
      <fieldset class="gruppe">
        <legend>{L('Spalten des Datensatzes (Kennwerte je Gruppe)', 'Columns of the data set (statistics per group)')}</legend>
        {#each daten.spalten as sp (sp.name)}
          <label class="schalter"><input type="checkbox" checked={jd.spalten.includes(sp.name)} onchange={ev => schalteSpalte(jd, sp.name, ev.currentTarget.checked)}><span data-nolink>{spaltenLabel(sp.name)}</span></label>
        {/each}
      </fieldset>
    {/if}

    {#if aufbau.fehlt.length}
      <div class="fehlt" role="group" aria-label={L('Was noch fehlt', 'What is still missing')}>
        <h5>{L('Was noch fehlt', 'What is still missing')}</h5>
        <ul class="liste">
          {#each aufbau.fehlt as f (f)}
            <li>{fehltText(f)}
              {#if f === 'verknuepfung'} <button class="k" type="button" onclick={() => void zurVerknuepfung()}>{L('Zur Verknüpfung', 'Go to linking')}</button>{/if}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <h5 id="ko-mm-jd-tab-t">{L('Tabelle', 'Table')}</h5>
    {#if aufbau.zeilen.length && aufbau.kopf.length}
      <div class="rahmen" role="region" tabindex="0" aria-label={L(`Joint Display ${jd.name}, seitlich scrollbar`, `Joint display ${jd.name}, scrollable sideways`)}>
        <table class="tab">
          <caption class="nur-vorleser">{jd.name} ({artName(jd.art)}). {L('Je Zeile die Zahl, falls gewählt das Zitat, die Passung und Ihre Meta-Inferenz.', 'For each row the number, the quote if chosen, the fit and your meta-inference.')}</caption>
          <thead>
            <tr>
              <th scope="col">{zeilenKopf(jd.art)}</th>
              {#each aufbau.kopf as k (k.schluessel)}<th scope="col" data-nolink>{k.name}{k.n !== undefined ? ` (n = ${ganzZahl(k.n)})` : ''}</th>{/each}
              <th scope="col">{L('Passung', 'Fit')}</th>
              <th scope="col">{L('Meta-Inferenz', 'Meta-inference')}</th>
            </tr>
          </thead>
          <tbody>
            {#each aufbau.zeilen as z (z.schluessel)}
              <tr>
                <th scope="row" data-nolink>{z.name}{z.n !== undefined ? ` (n = ${ganzZahl(z.n)})` : ''}</th>
                {#each z.zellen as c, ci (ci)}
                  {@const kopf = aufbau.kopf[ci]?.name ?? ''}
                  <td>
                    {#if jd.art === 'seite-an-seite' && ci === 0}
                      <label class="klein" for="ko-mm-jd-z-{jd.id}-{z.schluessel}">{L(`Ergebnis aus den Zahlen für ${z.name}`, `Result from the numbers for ${z.name}`)}</label>
                      <textarea id="ko-mm-jd-z-{jd.id}-{z.schluessel}" rows="4" value={z.zahlen ?? ''} onchange={e => speichereZahlen(jd, z, e.currentTarget.value)}></textarea>
                      {#if daten.spalten.length}
                        <label class="klein" for="ko-mm-jd-sp-{jd.id}-{z.schluessel}">{L(`Spalte für ${z.name}`, `Column for ${z.name}`)}</label>
                        <select id="ko-mm-jd-sp-{jd.id}-{z.schluessel}" value={spaltenWahl[z.schluessel] ?? daten.spalten[0]?.name ?? ''} onchange={e => (spaltenWahl[z.schluessel] = e.currentTarget.value)}>
                          {#each daten.spalten as sp (sp.name)}<option value={sp.name}>{spaltenLabel(sp.name)}</option>{/each}
                        </select>
                        <button class="k" type="button" aria-label={L(`Aus einer Spalte übernehmen, Zeile ${z.name}`, `Take from a column, row ${z.name}`)} onclick={() => uebernimmSpalte(jd, z)}>{L('Aus einer Spalte übernehmen', 'Take from a column')}</button>
                      {/if}
                    {:else}
                      <p class="zahl" data-nolink>{c.text}</p>
                      {#if c.beleg}
                        <blockquote data-nolink><p>{L(`„${c.beleg.text}“`, `"${c.beleg.text}"`)}</p><footer>{c.beleg.quelle}</footer></blockquote>
                      {:else if c.belegVeraltet}
                        <p class="klein">{L('Die gewählte Stelle passt nicht mehr zu dieser Zelle (Code, Gruppe oder Kodierung wurden geändert). Wählen Sie neu oder wählen Sie „keine“.', 'The chosen passage no longer fits this cell (code, group or coding was changed). Choose again or choose "none".')}</p>
                      {/if}
                      {#if istQualZelle(c)}
                        {@const wahl = c.beleg?.segment ?? ''}
                        <label class="klein" for="ko-mm-jd-b-{jd.id}-{z.schluessel}-{c.gruppe}">{L('Belegstelle wählen', 'Choose passage')}</label>
                        <select id="ko-mm-jd-b-{jd.id}-{z.schluessel}-{c.gruppe}" value={wahl} aria-label={L(`Belegstelle wählen für ${z.name}, ${kopf} (${c.text})`, `Choose passage for ${z.name}, ${kopf} (${c.text})`)} onchange={e => waehleBeleg(jd, z, c, kopf, e.currentTarget.value)}>
                          <option value="">{L('keine', 'none')}</option>
                          {#each c.kandidaten ?? [] as seg (seg)}
                            {@const bt = belegText(q, seg)}
                            {#if bt}<option value={seg}>{kurz(bt.text)} ({bt.quelle})</option>{/if}
                          {/each}
                        </select>
                      {/if}
                    {/if}
                  </td>
                {/each}
                <td>
                  <select value={z.passung} aria-label={L(`Passung für ${z.name}`, `Fit for ${z.name}`)} onchange={e => speicherePassung(jd, z, e.currentTarget.value as JdPassung)}>
                    {#each JD_PASSUNGEN as p (p)}<option value={p}>{passungName(p)}</option>{/each}
                  </select>
                </td>
                <td>
                  <textarea rows="3" value={z.meta} aria-label={L(`Meta-Inferenz für ${z.name}`, `Meta-inference for ${z.name}`)} onchange={e => speichereMeta(jd, z, e.currentTarget.value)}></textarea>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="klein">{L('Die Tabelle erscheint, sobald oben alles gewählt ist.', 'The table appears as soon as everything above is chosen.')}</p>
    {/if}

    {#if aufbau.ausgelassen > 0}
      <p class="klein">{jd.art === 'zahlen-nach-qual'
        ? L(`${nFaelle(aufbau.ausgelassen)} nicht gezählt, weil nicht mit dem Datensatz verknüpft.`, `${nFaelle(aufbau.ausgelassen)} not counted because not linked to the data set.`)
        : L(`${nFaelle(aufbau.ausgelassen)} nicht gezählt, weil ohne Interview.`, `${nFaelle(aufbau.ausgelassen)} not counted because without an interview.`)}</p>
    {/if}
    <p class="klein">{kleineFallzahlSatz()}</p>
    <p class="klein">{L('Statable zählt nur; ob Zahlen und Aussagen zusammenpassen, entscheiden Sie.', 'Statable only counts; whether numbers and statements fit together is for you to decide.')}</p>

    <div class="knopfzeile">
      <button class="k" id="ko-mm-jd-word" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void alsWord(jd); }}>{#if lade.sichtbar}<Rechnet imKnopf />{:else}<Icon n="download" />{/if}{L('Als Word speichern', 'Save as Word')}</button>
      <button class="k" id="ko-mm-jd-html" type="button" onclick={() => alsHtml(jd)}><Icon n="download" />{L('Als HTML speichern', 'Save as HTML')}</button>
    </div>
    {#if lade.sichtbar}<p class="klein"><Rechnet text={L('Datei wird erstellt …', 'Creating the file …')} /></p>{/if}
  {/if}
</div>

<style>
  .mm-teil { display: flex; flex-direction: column; gap: var(--a2); min-width: 0; }
  h4 { margin: 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  h5 { margin: var(--a2) 0 0; font: 650 var(--gr-klein, 0.9rem)/1.3 var(--schrift-ui); overflow-wrap: anywhere; }
  p { margin: 0; }
  .hilfe, .klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { font-weight: 600; }
  .gruppe { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-direction: column; gap: var(--a2); min-width: 0; }
  .gruppe legend { font-weight: 600; padding: 0 var(--a1); }
  .arten { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a1); }
  .arten legend { font-weight: 600; padding: 0; margin-bottom: var(--a1); }
  .radio { display: flex; gap: var(--a2); align-items: flex-start; }
  .schalter { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .schalter input[type="checkbox"] { min-width: 24px; min-height: 24px; }
  .feld { display: flex; flex-direction: column; gap: var(--a1); max-width: 40rem; }
  .feld input, textarea { width: 100%; box-sizing: border-box; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .bestaetigung { border: 2px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a2) var(--a3); display: flex; flex-direction: column; gap: var(--a2); }
  .fehlt { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a2) var(--a3); display: flex; flex-direction: column; gap: var(--a1); }
  .fehlt h5 { margin: 0; }
  .liste { margin: 0; padding-inline-start: var(--a4, 1.5rem); }
  .rahmen { overflow-x: auto; }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: top; min-width: 9rem; }
  .tab thead th { font-weight: 650; }
  .tab tbody th { font-weight: 600; }
  .tab td { display: table-cell; }
  .tab td select, .tab td textarea { max-width: 100%; margin-top: var(--a1); }
  .zahl { font-weight: 600; }
  blockquote { margin: var(--a1) 0; padding-inline-start: var(--a2); border-inline-start: 3px solid var(--linie-stark); font-style: italic; }
  blockquote p { margin: 0; }
  blockquote footer { font-style: normal; font-size: var(--gr-klein); color: var(--tinte-2); }
</style>
