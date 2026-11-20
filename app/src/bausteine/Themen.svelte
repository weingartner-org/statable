<script lang="ts">
  /**
   * Themen (Stufe A3, Prüfplan A-B6 und A-B7): Sie bilden Themen (themes) aus Codes und Stellen. Statable schlägt nie ein Thema vor,
   * wählt nie einen Beleg aus und bewertet nichts; gezählt wird nur (Codes, Stellen, Fälle) und auf die Form hingewiesen (kein Code, kein Konzept).
   * Aufbau: Formular „Neues Thema“, Liste (ul, verschachtelt für Unterthemen; Stand immer als Wort), verworfene Themen aufklappbar, darunter die
   * Einzelheiten des gewählten Themas (kein modales Fenster, kein Ziehen und Ablegen). Alle Änderungen über `aendere()` (Rückgängig) mit den
   * Funktionen aus `lib/themen.ts`; danach eine kurze Ansage über `sage()`. `q` ist die Sicht (im Einzelfall-Modus ohne verdeckte Fälle);
   * geschrieben wird mit der `q0` aus `aendere`.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { codePfad } from '../lib/kodieren';
  import { absatzNr, aendere } from '../lib/kodieren.svelte';
  import { cpTeil, THEMA_STAENDE, type QualProjekt, type Thema, type ThemaSchritt, type ThemaStand } from '../lib/qualprojekt';
  import {
    benenneThemaUm, formhinweise, legeThemaAn, legeThemenZusammen, ordneBelegZu, ordneCodeZu, setzeKonzept, setzeThemaAus, setzeThemaBeschreibung,
    setzeThemaEltern, setzeThemaStand, teileThema, themaFaelle, themaNameFrei, themaSegmente, themenReihenfolge, verschiebeThema,
  } from '../lib/themen';

  interface Props {
    /** Sicht auf das Projekt (im Einzelfall-Modus ohne verdeckte Fälle) */
    q: QualProjekt;
    /** Fall des offenen Dokuments (für persönliche Themen der IPA) */
    fall: string | undefined;
    /** IPA: persönliche Themen je Fall und Gruppenthemen zeigen */
    ipa: boolean;
    /** Einzelfall-Modus an (dann keine Gruppenthemen anlegen) */
    einzelfall: boolean;
    /** springt zu einem Segment in der Ansicht */
    zeigeSegment: (segId: string) => void;
  }
  let { q, fall, ipa, einzelfall, zeigeSegment }: Props = $props();
  export function fokussiere() { document.getElementById('ko-themen-t')?.focus(); }

  type Knoten = { thema: Thema; kinder: Knoten[] };
  const alle = $derived(themenReihenfolge(q));
  const themenListe = $derived(q.themen ?? []);
  const nFaelle = $derived(q.faelle.length);

  /* ---- Wörter ---- */
  const standWort = (s: ThemaStand): string => s === 'kandidat' ? L('Kandidat', 'Candidate') : s === 'aktiv' ? L('aktiv', 'active') : L('verworfen', 'discarded');
  const standLang = (s: ThemaStand): string => s === 'kandidat' ? L('Kandidat (candidate theme): noch in Arbeit', 'Candidate (candidate theme): still in progress')
    : s === 'aktiv' ? L('aktiv: Sie arbeiten damit', 'active: you are working with it') : L('verworfen: bleibt sichtbar, zählt nicht mehr mit', 'discarded: stays visible, no longer counted');
  const schrittWort = (w: ThemaSchritt['was']): string => {
    switch (w) {
      case 'angelegt': return L('Angelegt', 'Created');
      case 'umbenannt': return L('Umbenannt', 'Renamed');
      case 'konzept': return L('Zentrales Konzept geändert', 'Central concept changed');
      case 'beschreibung': return L('Beschreibung geändert', 'Description changed');
      case 'codes': return L('Codes geändert', 'Codes changed');
      case 'belege': return L('Belege geändert', 'Passages changed');
      case 'zusammengelegt': return L('Zusammengelegt', 'Merged');
      case 'geteilt': return L('Geteilt', 'Split');
      case 'verworfen': return L('Verworfen', 'Discarded');
      case 'wieder-aufgenommen': return L('Wieder aufgenommen', 'Taken up again');
      case 'stand': return L('Stand geändert', 'Status changed');
      case 'eltern': return L('Einordnung geändert', 'Placement changed');
      case 'fall': return L('Fall geändert', 'Case changed');
      default: return w;
    }
  };
  const zeitText = (ms: number): string => new Date(ms).toLocaleString(L('de', 'en') === 'en' ? 'en-GB' : 'de-AT', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const standWertText = (v: string | undefined): string => (v && (THEMA_STAENDE as readonly string[]).includes(v) ? standWort(v as ThemaStand) : (v ?? ''));
  const fehlerSatz = (e: unknown): string => {
    switch (e instanceof Error ? e.message : '') {
      case 'name-leer': return L('Bitte geben Sie dem Thema einen Namen.', 'Please give the theme a name.');
      case 'name-vergeben': return L('Dieser Name ist schon vergeben (auch ein verworfenes Thema zählt). Wählen Sie einen anderen Namen oder nehmen Sie das verworfene Thema wieder auf.', 'This name is already taken (a discarded theme counts too). Choose another name or take the discarded theme up again.');
      case 'eine-ebene': return L('Es gibt nur eine Ebene von Unterthemen. Ein Unterthema kann kein eigenes Unterthema haben.', 'There is only one level of sub-themes. A sub-theme cannot have sub-themes of its own.');
      default: return L('Das ging nicht: Das Thema oder die Auswahl gibt es nicht mehr.', 'That did not work: the theme or the choice no longer exists.');
    }
  };
  const nCodes = (n: number): string => Lp(n, '1 Code', `${n} Codes`, '1 code', `${n} codes`);
  const nStellen = (n: number): string => Lp(n, '1 Stelle', `${n} Stellen`, '1 passage', `${n} passages`);
  const nm = (t: Thema): string => `„${t.name}“`;
  const fallName = (id: string | undefined): string => q.faelle.find(f => f.id === id)?.name ?? '';
  const kurzText = (t: string, n = 90): string => { const x = t.replace(/\s+/g, ' ').trim(); return x.length > n ? x.slice(0, n).trimEnd() + '…' : x; };

  /* ---- Gruppen und Baum ---- */
  function baue(f: (t: Thema) => boolean): Knoten[] {
    const da = alle.filter(e => f(e.thema)).map(e => e.thema);
    const ids = new Set(da.map(t => t.id));
    return da.filter(t => t.elternId === undefined || !ids.has(t.elternId)).map(t => ({ thema: t, kinder: da.filter(k => k.elternId === t.id) .map(k => ({ thema: k, kinder: [] })) }));
  }
  const offen = (t: Thema): boolean => t.stand !== 'verworfen';
  const petDieser = $derived(baue(t => offen(t) && t.fall !== undefined && t.fall === fall));
  const petAndere = $derived(baue(t => offen(t) && t.fall !== undefined && t.fall !== fall));
  const gruppenThemen = $derived(baue(t => offen(t) && t.fall === undefined));
  const alleOffen = $derived(baue(offen));
  const verworfene = $derived(baue(t => !offen(t)));
  const nVerworfen = $derived(themenListe.filter(t => !offen(t)).length);
  const nOffen = $derived(themenListe.length - nVerworfen);

  const gewaehltThema = $derived(themenListe.find(t => t.id === gewaehlt));

  /* ---- Zustand ---- */
  let gewaehlt = $state<string>('');
  let fehlerNeu = $state('');
  let neuName = $state(''), neuKonzept = $state(''), neuArt = $state<'pet' | 'get'>('pet');
  let nameEntwurf = $state(''), konzeptEntwurf = $state(''), beschrEntwurf = $state('');
  let standEntwurf = $state<ThemaStand>('kandidat'), standNotiz = $state('');
  let fehlerDetail = $state('');
  let codePicker = $state(false), codeSuche = $state('');
  let belegeN = $state(30);
  let zielId = $state(''), zusammenAndere = $state<string[]>([]), zusammenNotiz = $state('');
  let teilName = $state(''), teilCodes = $state<string[]>([]);
  let elternWahl = $state('');
  const kannPet = $derived(fall !== undefined);
  const art = $derived<'pet' | 'get'>(!ipa ? 'get' : einzelfall ? 'pet' : neuArt);

  async function waehle(id: string, fokus = true) {
    const t = themenListe.find(x => x.id === id);
    if (!t) return;
    gewaehlt = id;
    nameEntwurf = t.name; konzeptEntwurf = t.konzept ?? ''; beschrEntwurf = t.beschreibung ?? '';
    standEntwurf = t.stand; standNotiz = ''; fehlerDetail = ''; codePicker = false; codeSuche = ''; belegeN = 30;
    zielId = t.id; zusammenAndere = []; zusammenNotiz = ''; teilName = ''; teilCodes = []; elternWahl = t.elternId ?? '';
    if (fokus) { await tick(); await tick(); const h = document.getElementById('th-detail-t'); h?.scrollIntoView({ block: 'nearest' }); h?.focus(); }
  }

  /** Schreibt über `aendere`; Fehler der Themen-Funktionen werden zu einem Satz (sichtbar und angesagt). */
  function tu(text: string, f: (q0: QualProjekt) => QualProjekt, ansage: string): boolean {
    fehlerDetail = '';
    try {
      const ok = aendere(text, f);
      if (ok) sage(ansage);
      return ok;
    } catch (e) {
      fehlerDetail = fehlerSatz(e);
      sage(fehlerDetail, 'dringend');
      return false;
    }
  }

  /* ---- Neues Thema ---- */
  async function lege() {
    fehlerNeu = '';
    const name = neuName.trim();
    if (art === 'pet' && !kannPet) { fehlerNeu = L('Öffnen Sie zuerst ein Dokument, das einem Fall zugeordnet ist.', 'First open a document that is assigned to a case.'); sage(fehlerNeu, 'dringend'); return; }
    let neueId = '';
    try {
      const konzept = neuKonzept;
      const ok = aendere(L(`Thema „${name}“ anlegen wieder entfernt`, `Creating theme "${name}" undone`), q0 => {
        const r = legeThemaAn(q0, name, { ...(konzept.trim() ? { konzept } : {}), ...(art === 'pet' && fall !== undefined ? { fall } : {}) });
        neueId = r.id; return r.q;
      });
      if (!ok) return;
    } catch (e) {
      fehlerNeu = fehlerSatz(e); sage(fehlerNeu, 'dringend'); return;
    }
    sage(L(`Thema „${name}“ angelegt, Stand Kandidat.`, `Theme "${name}" created, status candidate.`));
    neuName = ''; neuKonzept = '';
    await waehle(neueId);
  }

  /* ---- Einzelheiten ---- */
  function benenne() {
    const t = gewaehltThema; if (!t) return;
    const alt = t.name, id = t.id, n = nameEntwurf;
    tu(L(`Umbenennen von „${alt}“ zurückgenommen`, `Renaming of "${alt}" undone`), q0 => benenneThemaUm(q0, id, n), L(`Thema umbenannt in „${n.trim()}“.`, `Theme renamed to "${n.trim()}".`));
  }
  function speichereTexte() {
    const t = gewaehltThema; if (!t) return;
    const id = t.id, k = konzeptEntwurf, b = beschrEntwurf;
    const ok = tu(L(`Texte zu ${nm(t)} zurückgenommen`, `Texts of ${nm(t)} undone`), q0 => setzeThemaBeschreibung(setzeKonzept(q0, id, k), id, b), L(`Texte zu ${nm(t)} gespeichert.`, `Texts of ${nm(t)} saved.`));
    if (!ok && !fehlerDetail) sage(L('Nichts geändert.', 'Nothing changed.'));
  }
  function uebernimmStand() {
    const t = gewaehltThema; if (!t) return;
    const id = t.id, s = standEntwurf, n = standNotiz;
    if (s === t.stand) { sage(L(`Der Stand ist schon ${standWort(s)}.`, `The status is already ${standWort(s)}.`)); return; }
    const was = s === 'verworfen' ? L('verworfen', 'discarded') : t.stand === 'verworfen' ? L('wieder aufgenommen', 'taken up again') : L(`auf ${standWort(s)} gesetzt`, `set to ${standWort(s)}`);
    const ok = tu(L(`Stand von ${nm(t)} zurückgenommen`, `Status of ${nm(t)} undone`), q0 => setzeThemaStand(q0, id, s, n), L(`Thema ${nm(t)} ${was}.`, `Theme ${nm(t)} ${was}.`));
    if (ok) standNotiz = '';
  }
  function codeAn(codeId: string, an: boolean) {
    const t = gewaehltThema; if (!t) return;
    const id = t.id, c = q.codes.find(x => x.id === codeId)?.name ?? '';
    tu(an ? L(`Zuordnung von Code „${c}“ zurückgenommen`, `Assignment of code "${c}" undone`) : L(`Entfernen von Code „${c}“ zurückgenommen`, `Removal of code "${c}" undone`), q0 => ordneCodeZu(q0, id, codeId, an),
      an ? L(`Code „${c}“ dem Thema ${nm(t)} zugeordnet.`, `Code "${c}" assigned to theme ${nm(t)}.`) : L(`Code „${c}“ aus ${nm(t)} entfernt.`, `Code "${c}" removed from ${nm(t)}.`));
  }
  async function oeffnePicker() {
    codePicker = true; codeSuche = '';
    await tick(); await tick();
    document.getElementById('th-code-suche')?.focus();
  }
  async function schliessePicker() {
    codePicker = false;
    await tick();
    document.getElementById('th-code-zuordnen')?.focus();
  }
  function pickerTaste(e: KeyboardEvent) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); void schliessePicker(); } }
  function belegAn(segId: string, an: boolean) {
    const t = gewaehltThema; if (!t) return;
    const id = t.id;
    tu(L(`Beleg für ${nm(t)} zurückgenommen`, `Passage for ${nm(t)} undone`), q0 => ordneBelegZu(q0, id, segId, an),
      an ? L(`Textstelle als Beleg für ${nm(t)} gewählt.`, `Passage chosen as evidence for ${nm(t)}.`) : L(`Textstelle nicht mehr Beleg für ${nm(t)}.`, `Passage no longer evidence for ${nm(t)}.`));
  }
  async function zusammenlegen() {
    const ziel = themenListe.find(x => x.id === zielId); if (!ziel) return;
    if (!zusammenAndere.length) { fehlerDetail = L('Wählen Sie mindestens ein Thema, das ins Ziel soll.', 'Choose at least one theme to merge into the target.'); sage(fehlerDetail, 'dringend'); return; }
    const andere = [...zusammenAndere], n = zusammenNotiz;
    const ok = tu(L(`Zusammenlegen in ${nm(ziel)} zurückgenommen`, `Merge into ${nm(ziel)} undone`), q0 => legeThemenZusammen(q0, ziel.id, andere, n),
      L(`${andere.length} Themen in ${nm(ziel)} zusammengelegt. Die anderen sind verworfen und bleiben sichtbar.`, `${andere.length} themes merged into ${nm(ziel)}. The others are discarded and stay visible.`));
    if (ok) { await waehle(ziel.id, false); await tick(); document.getElementById('th-zusammen-knopf')?.focus(); }
  }
  async function teilen() {
    const t = gewaehltThema; if (!t) return;
    const name = teilName, codes = [...teilCodes], id = t.id;
    let neueId = '';
    const ok = tu(L(`Teilen von ${nm(t)} zurückgenommen`, `Split of ${nm(t)} undone`), q0 => { const r = teileThema(q0, id, name, codes); neueId = r.id; return r.q; },
      L(`Thema ${nm(t)} geteilt, neues Thema „${name.trim()}“ mit ${nCodes(codes.length)}.`, `Theme ${nm(t)} split, new theme "${name.trim()}" with ${nCodes(codes.length)}.`));
    if (ok && neueId) await waehle(neueId);
  }
  function ordneEin() {
    const t = gewaehltThema; if (!t) return;
    const id = t.id, e = elternWahl || undefined;
    const ep = e ? themenListe.find(x => x.id === e) : undefined;
    tu(L(`Einordnung von ${nm(t)} zurückgenommen`, `Placement of ${nm(t)} undone`), q0 => setzeThemaEltern(q0, id, e),
      ep ? L(`${nm(t)} ist jetzt Unterthema von ${nm(ep)}.`, `${nm(t)} is now a sub-theme of ${nm(ep)}.`) : L(`${nm(t)} steht jetzt auf oberster Ebene.`, `${nm(t)} is now at top level.`));
  }
  function schiebe(r: -1 | 1) {
    const t = gewaehltThema; if (!t) return;
    const id = t.id;
    const ok = aendere(L(`Verschieben von ${nm(t)} zurückgenommen`, `Moving ${nm(t)} undone`), q0 => verschiebeThema(q0, id, r));
    sage(ok ? (r < 0 ? L(`${nm(t)} nach oben verschoben.`, `${nm(t)} moved up.`) : L(`${nm(t)} nach unten verschoben.`, `${nm(t)} moved down.`))
      : (r < 0 ? L(`${nm(t)} steht schon ganz oben.`, `${nm(t)} is already at the top.`) : L(`${nm(t)} steht schon ganz unten.`, `${nm(t)} is already at the bottom.`)));
  }
  function setzeAus(persId: string, an: boolean) {
    const t = gewaehltThema; if (!t) return;
    const id = t.id, alt = t.aus ?? [];
    const neu = an ? [...alt, persId] : alt.filter(x => x !== persId);
    tu(L(`Herkunft von ${nm(t)} zurückgenommen`, `Origin of ${nm(t)} undone`), q0 => setzeThemaAus(q0, id, neu),
      an ? L(`Gruppenthema ${nm(t)} kommt jetzt auch aus „${themenListe.find(x => x.id === persId)?.name ?? ''}“.`, `Group theme ${nm(t)} now also comes from "${themenListe.find(x => x.id === persId)?.name ?? ''}".`)
        : L(`„${themenListe.find(x => x.id === persId)?.name ?? ''}“ ist nicht mehr Herkunft von ${nm(t)}.`, `"${themenListe.find(x => x.id === persId)?.name ?? ''}" is no longer an origin of ${nm(t)}.`));
  }

  /* ---- abgeleitet für die Einzelheiten ---- */
  const dokName = (id: string): string => q.dokumente.find(d => d.id === id)?.name ?? '';
  const codeListe = $derived(q.codes.map(c => ({ id: c.id, pfad: codePfad(q.codes, c.id) })).sort((a, b) => a.pfad.localeCompare(b.pfad)));
  const gefilterteCodes = $derived(codeListe.filter(c => !codeSuche.trim() || c.pfad.toLocaleLowerCase().includes(codeSuche.trim().toLocaleLowerCase())));
  const belegIds = $derived.by(() => {
    const t = gewaehltThema; if (!t) return [] as string[];
    const gez = themaSegmente(q, t);
    const gew = t.belege ?? [];
    const dokPos = new Map(q.dokumente.map((d, i) => [d.id, i]));
    const segs = new Map(q.segmente.map(s => [s.id, s]));
    return [...new Set([...gew, ...gez])].filter(i => segs.has(i)).sort((a, b) => {
      const x = segs.get(a)!, y = segs.get(b)!;
      return (dokPos.get(x.dokument)! - dokPos.get(y.dokument)!) || x.start - y.start || x.ende - y.ende;
    });
  });
  const belegInfo = (segId: string): { dok: string; absatz: number; text: string } => {
    const s = q.segmente.find(x => x.id === segId)!;
    const d = q.dokumente.find(x => x.id === s.dokument);
    return { dok: d?.name ?? '', absatz: absatzNr(d?.text ?? '', s.start), text: kurzText(cpTeil(d?.text ?? '', s.start, s.ende)) };
  };
  const waehlbareThemen = $derived(themenListe.filter(offen));
  const elternOptionen = $derived(themenListe.filter(x => x.elternId === undefined && x.id !== gewaehlt));
  const hatKinder = $derived(themenListe.some(x => x.elternId === gewaehlt));
  const persoenliche = $derived(themenListe.filter(x => x.fall !== undefined && offen(x)));
  const istGruppenthema = $derived(ipa && gewaehltThema !== undefined && gewaehltThema.fall === undefined);
  const hinweisText = (h: 'keine-codes' | 'kein-konzept'): string => h === 'keine-codes' ? L('Dieses Thema hat noch keine Codes.', 'This theme has no codes yet.') : L('Dieses Thema hat noch kein zentrales Konzept.', 'This theme has no central concept yet.');
</script>

{#snippet zeile(t: Thema)}
  {@const nS = themaSegmente(q, t).length}
  {@const nF = themaFaelle(q, t).length}
  {@const hin = formhinweise(t)}
  {@const herkunft = t.aus?.length ? t.aus.length : 0}
  {@const herkunftFaelle = new Set((t.aus ?? []).map(a => themenListe.find(x => x.id === a)?.fall).filter(f => f !== undefined)).size}
  <button class="k th-name" id="th-z-{t.id}" type="button" aria-current={gewaehlt === t.id ? 'true' : undefined} aria-describedby="th-i-{t.id}" onclick={() => void waehle(t.id)} data-nolink>{t.name}</button>
  <span class="th-info" id="th-i-{t.id}">
    <span class="stand stand-{t.stand}">{L('Stand', 'Status')}: {standWort(t.stand)}.</span>
    {nCodes(t.codes.length)}. {nStellen(nS)}.
    {#if herkunft}{L(`Kommt aus ${Lp(herkunft, '1 persönlichen Thema', `${herkunft} persönlichen Themen`, '1 personal theme', `${herkunft} personal themes`)}, in ${herkunftFaelle} von ${nFaelle} Fällen.`, `Comes from ${Lp(herkunft, '1 personal theme', `${herkunft} personal themes`, '1 personal theme', `${herkunft} personal themes`)}, in ${herkunftFaelle} of ${nFaelle} cases.`)}{:else}{L(`In ${nF} von ${nFaelle} Fällen.`, `In ${nF} of ${nFaelle} cases.`)}{/if}
    {#if t.fall !== undefined && !ipa}<span data-nolink>{L('Fall', 'Case')}: {fallName(t.fall)}.</span>{/if}
    {#each hin as h (h)}<span class="th-hinweis"> {hinweisText(h)}</span>{/each}
  </span>
{/snippet}

{#snippet baumListe(knoten: Knoten[])}
  <ul class="th-liste">
    {#each knoten as k (k.thema.id)}
      <li>
        {@render zeile(k.thema)}
        {#if k.kinder.length}
          <ul class="th-liste th-kinder" aria-label={L(`Unterthemen von ${k.thema.name}`, `Sub-themes of ${k.thema.name}`)}>
            {#each k.kinder as u (u.thema.id)}<li>{@render zeile(u.thema)}</li>{/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

<div class="th">
  <p class="hilfe">{L('Ein Thema (theme) ist ein Muster mit gemeinsamer Bedeutung über viele Stellen und Fälle. Sie bilden die Themen selbst, aus Ihren Codes und Stellen; Statable schlägt keine vor und wählt keine Belege aus. Verworfene Themen bleiben mit ihrem Verlauf sichtbar.', 'A theme is a pattern with a shared meaning across many passages and cases. You build the themes yourself, from your codes and passages; Statable suggests none and chooses no evidence. Discarded themes stay visible with their history.')}</p>

  <form class="neu" aria-labelledby="th-neu-t" onsubmit={(e) => { e.preventDefault(); void lege(); }}>
    <h3 id="th-neu-t">{L('Neues Thema', 'New theme')}</h3>
    {#if ipa}
      <fieldset class="optionen">
        <legend>{L('Art des Themas', 'Kind of theme')}</legend>
        <label class="schalter"><input type="radio" name="th-art" value="pet" checked={art === 'pet'} disabled={einzelfall} onchange={() => (neuArt = 'pet')}>{L('Persönliches Erfahrungsthema (PET, personal experiential theme) dieses Falls', 'Personal experiential theme (PET) of this case')}</label>
        {#if einzelfall}
          <p class="hilfe">{L('Im Einzelfall-Modus legen Sie nur persönliche Themen an. Gruppenthemen kommen danach, wenn Sie den Einzelfall-Modus verlassen.', 'In single-case mode you only create personal themes. Group themes come afterwards, when you leave the mode.')}</p>
        {:else}
          <label class="schalter"><input type="radio" name="th-art" value="get" checked={art === 'get'} onchange={() => (neuArt = 'get')}>{L('Gruppen-Erfahrungsthema (GET, group experiential theme) über mehrere Fälle', 'Group experiential theme (GET) across several cases')}</label>
        {/if}
      </fieldset>
    {/if}
    <div class="feld">
      <label for="th-neu-name">{L('Name des Themas', 'Name of the theme')}</label>
      <input id="th-neu-name" type="text" autocomplete="off" bind:value={neuName} aria-invalid={fehlerNeu ? 'true' : undefined} aria-describedby={fehlerNeu ? 'th-neu-fehler' : undefined}>
    </div>
    <div class="feld">
      <label for="th-neu-konzept">{L('Was hält das Thema zusammen? (zentrales Konzept, central organising concept; freiwillig)', 'What holds the theme together? (central organising concept; optional)')}</label>
      <textarea id="th-neu-konzept" rows="2" bind:value={neuKonzept}></textarea>
    </div>
    {#if fehlerNeu}<p class="fehl" id="th-neu-fehler">{fehlerNeu}</p>{/if}
    <div class="knopfzeile"><button class="k haupt" id="th-neu-knopf" type="submit">{L('Thema anlegen', 'Create theme')}</button></div>
    <p class="hilfe">{L('Ein neues Thema hat den Stand „Kandidat“ (candidate theme): Sie prüfen es noch.', 'A new theme has the status "candidate" (candidate theme): you are still checking it.')}</p>
  </form>

  <section aria-labelledby="th-liste-t" class="th-teil">
    <h3 id="th-liste-t">{L(`Ihre Themen (${nOffen})`, `Your themes (${nOffen})`)}</h3>
    {#if !themenListe.length}
      <p class="hilfe">{L('Noch keine Themen. Legen Sie das erste Thema oben an.', 'No themes yet. Create the first theme above.')}</p>
    {:else}
      {#if ipa}
        <h4 id="th-pet-t">{L('Persönliche Erfahrungsthemen (PET) dieses Falls', 'Personal experiential themes (PET) of this case')}</h4>
        {#if !kannPet}<p class="hilfe">{L('Das offene Dokument gehört zu keinem Fall.', 'The open document is not assigned to a case.')}</p>{/if}
        {#if petDieser.length}{@render baumListe(petDieser)}{:else}<p class="hilfe">{L('Keine.', 'None.')}</p>{/if}
        {#if !einzelfall}
          <h4 id="th-get-t">{L('Gruppen-Erfahrungsthemen (GET)', 'Group experiential themes (GET)')}</h4>
          {#if gruppenThemen.length}{@render baumListe(gruppenThemen)}{:else}<p class="hilfe">{L('Keine.', 'None.')}</p>{/if}
          {#if petAndere.length}
            <h4 id="th-pet2-t">{L('Persönliche Erfahrungsthemen anderer Fälle', 'Personal experiential themes of other cases')}</h4>
            {@render baumListe(petAndere)}
          {/if}
        {:else}
          <p class="hilfe">{L('Gruppenthemen bilden Sie nach dem Einzelfall-Modus, wenn Sie ihn verlassen.', 'You build group themes after single-case mode, when you leave it.')}</p>
        {/if}
      {:else if alleOffen.length}
        {@render baumListe(alleOffen)}
      {:else}
        <p class="hilfe">{L('Alle Themen sind verworfen (siehe unten).', 'All themes are discarded (see below).')}</p>
      {/if}
    {/if}
    {#if nVerworfen}
      <details class="verworfen">
        <summary>{L(`Verworfene Themen (${nVerworfen})`, `Discarded themes (${nVerworfen})`)}</summary>
        {@render baumListe(verworfene)}
      </details>
    {/if}
  </section>

  {#if gewaehltThema}
    {@const t = gewaehltThema}
    <div class="th-detail" role="group" aria-label={L("Einzelheiten des Themas", "Theme details")}>
      <h3 id="th-detail-t" tabindex="-1" data-nolink>{L(`Thema „${t.name}“ (${standWort(t.stand)})`, `Theme "${t.name}" (${standWort(t.stand)})`)}</h3>
      {#if fehlerDetail}<p class="fehl" id="th-fehler">{fehlerDetail}</p>{/if}

      <div class="feld">
        <label for="th-name">{L('Name', 'Name')}</label>
        <div class="knopfzeile"><input id="th-name" type="text" autocomplete="off" bind:value={nameEntwurf}><button class="k" type="button" onclick={benenne}>{L('Name ändern', 'Change name')}</button></div>
      </div>

      <div class="feld">
        <label for="th-konzept">{L('Was hält das Thema zusammen? (zentrales Konzept, central organising concept)', 'What holds the theme together? (central organising concept)')}</label>
        <textarea id="th-konzept" rows="3" bind:value={konzeptEntwurf}></textarea>
      </div>
      <div class="feld">
        <label for="th-beschr">{L('Beschreibung (freiwillig)', 'Description (optional)')}</label>
        <textarea id="th-beschr" rows="3" bind:value={beschrEntwurf}></textarea>
      </div>
      <div class="knopfzeile"><button class="k" id="th-texte-speichern" type="button" onclick={speichereTexte}>{L('Konzept und Beschreibung speichern', 'Save concept and description')}</button></div>

      <fieldset class="optionen">
        <legend>{L('Stand', 'Status')}</legend>
        {#each THEMA_STAENDE as s (s)}
          <label class="schalter"><input type="radio" name="th-stand" value={s} checked={standEntwurf === s} onchange={() => (standEntwurf = s)}>{standLang(s)}</label>
        {/each}
        <div class="feld">
          <label for="th-stand-notiz">{L('Warum? (Notiz, freiwillig)', 'Why? (note, optional)')}</label>
          <input id="th-stand-notiz" type="text" autocomplete="off" bind:value={standNotiz}>
        </div>
        <div class="knopfzeile"><button class="k" id="th-stand-knopf" type="button" onclick={uebernimmStand}>{L('Stand übernehmen', 'Apply status')}</button></div>
      </fieldset>

      <h4 id="th-codes-t">{L(`Codes dieses Themas (${t.codes.length})`, `Codes of this theme (${t.codes.length})`)}</h4>
      {#if t.codes.length}
        <ul class="plain">
          {#each t.codes as cid (cid)}
            {@const cn = codePfad(q.codes, cid)}
            <li><span data-nolink>{cn}</span> <button class="k leise" type="button" onclick={() => codeAn(cid, false)}>{L(`entfernen: ${cn}`, `remove: ${cn}`)}</button></li>
          {/each}
        </ul>
      {:else}<p class="hilfe">{L('Noch keine Codes.', 'No codes yet.')}</p>{/if}
      <div class="knopfzeile"><button class="k" id="th-code-zuordnen" type="button" aria-expanded={codePicker ? 'true' : 'false'} aria-controls="th-code-picker" onclick={() => (codePicker ? void schliessePicker() : void oeffnePicker())}>{L('Code zuordnen', 'Assign code')}</button></div>
      {#if codePicker}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Esc schließt den nicht modalen Auswahlbereich) -->
        <div id="th-code-picker" class="picker" role="group" aria-labelledby="th-code-picker-t" tabindex="-1" onkeydown={pickerTaste}>
          <h5 id="th-code-picker-t">{L(`Codes für ${nm(t)} wählen`, `Choose codes for ${nm(t)}`)}</h5>
          <div class="feld"><label for="th-code-suche">{L('Codes suchen', 'Search codes')}</label><input id="th-code-suche" type="search" autocomplete="off" bind:value={codeSuche}></div>
          {#if gefilterteCodes.length}
            <ul class="plain">
              {#each gefilterteCodes as c (c.id)}
                <li><label class="schalter"><input type="checkbox" checked={t.codes.includes(c.id)} onchange={(e) => codeAn(c.id, e.currentTarget.checked)}><span data-nolink>{c.pfad}</span></label></li>
              {/each}
            </ul>
          {:else}<p class="hilfe">{L('Kein Code passt zur Suche.', 'No code matches the search.')}</p>{/if}
          <div class="knopfzeile"><button class="k haupt" type="button" onclick={() => void schliessePicker()}>{L('Fertig', 'Done')}</button></div>
          <p class="hilfe">{L('Mit Esc kommen Sie zurück zum Knopf „Code zuordnen“.', 'Esc takes you back to the button "Assign code".')}</p>
        </div>
      {/if}

      <h4 id="th-belege-t">{L('Belege wählen (Stellen, die das Thema zeigen)', 'Choose evidence (passages that show the theme)')}</h4>
      <p class="hilfe">{L('Hier stehen die Stellen mit Codes dieses Themas. Welche davon ein Beleg ist, entscheiden Sie; Statable bestimmt keine Stelle als „typisch“.', 'These are the passages coded with a code of this theme. You decide which are evidence; Statable chooses no "typical" passage.')}</p>
      {#if belegIds.length}
        <ul class="plain belege">
          {#each belegIds.slice(0, belegeN) as sid (sid)}
            {@const b = belegInfo(sid)}
            <li>
              <label class="schalter"><input type="checkbox" checked={(t.belege ?? []).includes(sid)} onchange={(e) => belegAn(sid, e.currentTarget.checked)}><span data-nolink>{L(`Als Beleg gewählt: ${b.dok}, Absatz ${b.absatz}`, `Chosen as evidence: ${b.dok}, paragraph ${b.absatz}`)}</span></label>
              <q class="zitat" data-nolink>{b.text}</q>
              <button class="k" type="button" onclick={() => zeigeSegment(sid)}>{L(`Zeigen: ${b.dok}, Absatz ${b.absatz}`, `Show: ${b.dok}, paragraph ${b.absatz}`)}</button>
            </li>
          {/each}
        </ul>
        {#if belegIds.length > belegeN}<div class="knopfzeile"><button class="k" type="button" onclick={() => { belegeN += 30; sage(L(`${Math.min(belegeN, belegIds.length)} Stellen werden gezeigt.`, `${Math.min(belegeN, belegIds.length)} passages are shown.`)); }}>{L(`Weitere Stellen zeigen (${belegIds.length - belegeN} übrig)`, `Show more passages (${belegIds.length - belegeN} left)`)}</button></div>{/if}
      {:else}<p class="hilfe">{L('Noch keine Stellen: Ordnen Sie dem Thema Codes zu, die schon vergeben sind.', 'No passages yet: assign codes that are already used to the theme.')}</p>{/if}

      {#if istGruppenthema}
        <fieldset class="optionen">
          <legend>{L('Dieses Gruppenthema kommt aus diesen persönlichen Themen', 'This group theme comes from these personal themes')}</legend>
          {#if persoenliche.length}
            {#each persoenliche as p (p.id)}
              <label class="schalter"><input type="checkbox" checked={(t.aus ?? []).includes(p.id)} onchange={(e) => setzeAus(p.id, e.currentTarget.checked)}><span data-nolink>{p.name} ({fallName(p.fall)})</span></label>
            {/each}
          {:else}<p class="hilfe">{L('Es gibt noch keine persönlichen Themen.', 'There are no personal themes yet.')}</p>{/if}
        </fieldset>
      {/if}

      <h4 id="th-ordnung-t">{L('Einordnen und Reihenfolge', 'Placement and order')}</h4>
      <div class="feld">
        <label for="th-eltern">{L('Unterthema von (nur eine Ebene)', 'Sub-theme of (one level only)')}</label>
        <div class="knopfzeile">
          <select id="th-eltern" bind:value={elternWahl} disabled={hatKinder}>
            <option value="">{L('keinem Thema (oberste Ebene)', 'no theme (top level)')}</option>
            {#each elternOptionen as e (e.id)}<option value={e.id}>{e.name}</option>{/each}
          </select>
          <button class="k" type="button" onclick={ordneEin}>{L('Einordnen', 'Place')}</button>
        </div>
        {#if hatKinder}<p class="hilfe">{L('Dieses Thema hat Unterthemen und bleibt deshalb auf oberster Ebene.', 'This theme has sub-themes and therefore stays at top level.')}</p>{/if}
      </div>
      <div class="knopfzeile">
        <button class="k" type="button" onclick={() => schiebe(-1)}>{L('Nach oben', 'Move up')}</button>
        <button class="k" type="button" onclick={() => schiebe(1)}>{L('Nach unten', 'Move down')}</button>
      </div>

      <details class="werkzeug">
        <summary>{L('Themen zusammenlegen (merge)', 'Merge themes')}</summary>
        <div class="feld">
          <label for="th-ziel">{L('Ziel: dieses Thema bleibt', 'Target: this theme stays')}</label>
          <select id="th-ziel" bind:value={zielId} onchange={() => (zusammenAndere = zusammenAndere.filter(x => x !== zielId))}>
            {#each waehlbareThemen as w (w.id)}<option value={w.id}>{w.name}</option>{/each}
          </select>
        </div>
        <fieldset class="optionen">
          <legend>{L('Diese Themen kommen ins Ziel (sie werden verworfen und bleiben sichtbar)', 'These themes go into the target (they are discarded and stay visible)')}</legend>
          {#each waehlbareThemen.filter(w => w.id !== zielId) as w (w.id)}
            <label class="schalter"><input type="checkbox" value={w.id} bind:group={zusammenAndere}><span data-nolink>{w.name}</span></label>
          {/each}
        </fieldset>
        <div class="feld"><label for="th-zusammen-notiz">{L('Warum? (Notiz, freiwillig)', 'Why? (note, optional)')}</label><input id="th-zusammen-notiz" type="text" autocomplete="off" bind:value={zusammenNotiz}></div>
        <div class="knopfzeile"><button class="k" id="th-zusammen-knopf" type="button" onclick={() => void zusammenlegen()}>{L('Zusammenlegen', 'Merge')}</button></div>
      </details>

      <details class="werkzeug">
        <summary>{L('Thema teilen (split)', 'Split theme')}</summary>
        <div class="feld"><label for="th-teil-name">{L('Name des neuen Themas', 'Name of the new theme')}</label><input id="th-teil-name" type="text" autocomplete="off" bind:value={teilName}></div>
        <fieldset class="optionen">
          <legend>{L('Diese Codes gehen ins neue Thema', 'These codes go into the new theme')}</legend>
          {#each t.codes as cid (cid)}
            <label class="schalter"><input type="checkbox" value={cid} bind:group={teilCodes}><span data-nolink>{codePfad(q.codes, cid)}</span></label>
          {:else}<p class="hilfe">{L('Dieses Thema hat keine Codes; das neue Thema bleibt dann leer.', 'This theme has no codes; the new theme will be empty.')}</p>{/each}
        </fieldset>
        <div class="knopfzeile"><button class="k" id="th-teilen-knopf" type="button" onclick={() => void teilen()}>{L('Teilen', 'Split')}</button></div>
      </details>

      <h4 id="th-verlauf-t">{L(`Verlauf (${t.verlauf.length})`, `History (${t.verlauf.length})`)}</h4>
      <ul class="plain verlauf" aria-labelledby="th-verlauf-t">
        {#each [...t.verlauf].reverse() as v, i (v.zeit + v.was + i)}
          <li>
            <time datetime={new Date(v.zeit).toISOString()}>{zeitText(v.zeit)}</time>:
            <strong>{schrittWort(v.was)}</strong>{#if v.kodierende}{@const p = q.kodierende.find(k => k.id === v.kodierende)}{#if p} ({L('von', 'by')} <span data-nolink>{p.name}</span>){/if}{/if}
            {#if v.vorher || v.nachher}<span data-nolink>{#if v.vorher}{standWertText(v.vorher)}{/if}{#if v.vorher && v.nachher} → {/if}{#if v.nachher}{standWertText(v.nachher)}{/if}</span>{/if}
            {#if v.notiz}<span class="notiz" data-nolink>{L('Notiz', 'Note')}: {v.notiz}</span>{/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .th { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); overflow-wrap: anywhere; }
  h4 { margin: var(--a2) 0 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  h5 { margin: 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; }
  .feld { display: flex; flex-direction: column; gap: var(--a1); min-width: 0; }
  .feld input[type="text"], .feld input[type="search"], textarea, select { max-width: 100%; box-sizing: border-box; }
  textarea { width: 100%; }
  .neu, .th-detail, .picker, .optionen, .werkzeug, .verworfen { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); margin: 0; min-width: 0; }
  .neu, .th-detail, .picker, .optionen, .werkzeug { display: flex; flex-direction: column; gap: var(--a2); }
  .optionen { border-color: var(--linie); }
  .optionen legend { font-weight: 600; padding: 0 var(--a1); }
  .th-teil { display: flex; flex-direction: column; gap: var(--a2); }
  .th-liste { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--a3); }
  .th-liste li { display: flex; flex-direction: column; gap: var(--a1); align-items: flex-start; min-width: 0; }
  .th-kinder { margin-inline-start: var(--a5); padding-inline-start: var(--a3); border-inline-start: 2px solid var(--linie); }
  .th-name { text-align: start; overflow-wrap: anywhere; max-width: 100%; }
  .th-name[aria-current="true"] { border-width: 2px; font-weight: 700; }
  .th-info { font-size: var(--gr-klein); color: var(--tinte-2); overflow-wrap: anywhere; }
  .stand { font-weight: 650; color: var(--tinte); }
  .th-hinweis { font-style: italic; }
  .schalter { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .schalter input[type="checkbox"], .schalter input[type="radio"] { min-width: 24px; min-height: 24px; flex: none; }
  .plain { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--a2); }
  .belege li { display: flex; flex-direction: column; gap: var(--a1); align-items: flex-start; }
  .zitat { white-space: pre-wrap; overflow-wrap: anywhere; }
  .verlauf li { overflow-wrap: anywhere; }
  .notiz { display: block; font-size: var(--gr-klein); color: var(--tinte-2); }
  summary { cursor: pointer; font-weight: 600; min-height: 24px; }
  select, input[type="checkbox"] { min-height: 24px; }
</style>
