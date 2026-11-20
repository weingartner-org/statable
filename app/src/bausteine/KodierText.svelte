<script lang="ts">
  /**
   * Kodier-Arbeitsplatz, Ansicht „Text“ (Stufe 6b, Fachblatt 3.1): gesperrtes Feld (`contenteditable` mit `role="textbox"`), Markieren mit Umschalt+Pfeil, S, A;
   * Enter/K führt in die Code-Leiste, 1 bis 9 geben Codes der Schnellleiste, I nennt die Codes an der Stelle. Positionen sind Codepoints (Architekturblatt).
   * Ansagen nur über `sage()`/`sageSpaeter()`; keine eigene Live-Region.
   */
  import { onMount } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { cpZuUtf16, positionsKarte, type Dokument, type QualProjekt } from '../lib/qualprojekt';
  import { auswahlZuCp, codeBeschriftungen, cpZuAuswahl, einheitAn, memosAnStelle, type Einheit } from '../lib/kodieren';
  import { absatzNr, beschreibeStellen, type Stelle } from '../lib/kodieren.svelte';

  interface Props {
    dok: Dokument;
    q: QualProjekt;
    saetze: Einheit[];
    absaetze: Einheit[];
    /** Auswahl in Codepoints; die Seite liest sie für die Code-Leiste */
    sel: Stelle;
    nurIch: boolean;
    ich: string | undefined;
    ansageLesen: boolean;
    zumCode: (stellen: Stelle[]) => void;
    ziffer: (n: number, stellen: Stelle[]) => void;
    /** Memo zur markierten Stelle (Taste M, Knopf) */
    memo: (stellen: Stelle[]) => void;
    rueck: () => void;
  }
  let { dok, q, saetze, absaetze, sel = $bindable(), nurIch, ich, ansageLesen, zumCode, ziffer, memo, rueck }: Props = $props();

  let wurzel = $state<HTMLElement>();
  const orig = $derived(dok.text);
  const karte = $derived(positionsKarte(orig));
  /* Anzeigetext: Zeilenumbrüche vereinheitlicht; Umrechnung von und nach UTF-16 des Originals (Falle 1 im Fachblatt) */
  const norm = $derived(orig.replace(/\r\n?/g, '\n'));
  const crs = $derived.by(() => { const a: number[] = []; for (let i = 0; i < orig.length; i++) if (orig[i] === '\r' && orig[i + 1] === '\n') a.push(i); return a; });
  const origZuNorm = (o: number): number => { let n = 0; for (const i of crs) { if (i < o) n++; else break; } return o - n; };
  const normZuOrig = (n: number): number => { let o = n; crs.forEach((i, k) => { if (i - k < n) o++; }); return o; };
  const normVonCp = (cp: number): number => origZuNorm(cpZuAuswahl(orig, cp, cp).start);
  const von = (): string => L('von', 'by');

  function leseAuswahl(): Stelle | null {
    const s = window.getSelection();
    if (!s || s.rangeCount === 0 || !wurzel) return null;
    const r = s.getRangeAt(0);
    if (!wurzel.contains(r.startContainer) || !wurzel.contains(r.endContainer)) return null;
    const off = (n: Node, o: number) => (n === wurzel ? (o === 0 ? 0 : norm.length) : o);
    return auswahlZuCp(orig, normZuOrig(off(r.startContainer, r.startOffset)), normZuOrig(off(r.endContainer, r.endOffset)));
  }
  function merkeAuswahl() {
    const a = leseAuswahl();
    if (a && (a.start !== sel.start || a.ende !== sel.ende)) sel = a;
  }

  /** Setzt die Auswahl (Codepoints) und, wenn `fokus`, den Fokus ins Feld. */
  export function setzeAuswahl(start: number, ende: number, fokus = true) {
    sel = { start, ende };
    const t = wurzel?.firstChild;
    if (fokus) wurzel?.focus();
    if (!t) return;
    const a = Math.min(normVonCp(start), norm.length), b = Math.min(normVonCp(ende), norm.length);
    const s = window.getSelection();
    if (!s) return;
    const r = document.createRange();
    r.setStart(t, a); r.setEnd(t, b);
    s.removeAllRanges(); s.addRange(r);
  }
  export function fokussiere() { wurzel?.focus(); }

  function markiereEinheit(einheiten: Einheit[], wort: 'satz' | 'absatz') {
    merkeAuswahl();
    if (!einheiten.length) { sage(L('Es gibt keinen Text.', 'There is no text.')); return; }
    let a: Einheit | undefined, b: Einheit | undefined;
    if (sel.start !== sel.ende) {
      const i = einheiten.findIndex(e => e.start === sel.start), j = einheiten.findIndex(e => e.ende === sel.ende);
      if (i >= 0 && j >= i) { a = einheiten[i]; b = einheiten[Math.min(j + 1, einheiten.length - 1)]; }
    }
    if (!a) { a = b = einheitAn(einheiten, sel.start); }
    if (!a || !b) return;
    setzeAuswahl(a.start, b.ende);
    // Ohne Text: NVDA liest die Auswahl selbst (Befund B1 der NVDA-Messung 6a)
    const eins = a.nr === b.nr;
    sage(wort === 'satz'
      ? (eins ? L(`Satz ${a.nr} markiert.`, `Sentence ${a.nr} marked.`) : L(`Sätze ${a.nr} bis ${b.nr} markiert.`, `Sentences ${a.nr} to ${b.nr} marked.`))
      : (eins ? L(`Absatz ${a.nr} markiert.`, `Paragraph ${a.nr} marked.`) : L(`Absätze ${a.nr} bis ${b.nr} markiert.`, `Paragraphs ${a.nr} to ${b.nr} marked.`)));
  }
  const markiereSatz = () => markiereEinheit(saetze, 'satz');
  const markiereAbsatz = () => markiereEinheit(absaetze, 'absatz');

  const nichtsMarkiert = () => sage(L('Es ist nichts markiert. Markieren Sie mit Umschalt+Pfeil, S oder A.', 'Nothing is marked. Mark with Shift+arrow, S or A.'));
  function codeGeben() {
    merkeAuswahl();
    if (sel.start === sel.ende) { nichtsMarkiert(); return; }
    zumCode([{ start: sel.start, ende: sel.ende }]);
  }
  function codeZiffer(n: number) {
    merkeAuswahl();
    if (sel.start === sel.ende) { nichtsMarkiert(); return; }
    ziffer(n, [{ start: sel.start, ende: sel.ende }]);
  }
  function memoGeben() {
    merkeAuswahl();
    if (sel.start === sel.ende) { nichtsMarkiert(); return; }
    memo([{ start: sel.start, ende: sel.ende }]);
  }
  function zeigeInfo() {
    merkeAuswahl();
    const c = codeBeschriftungen(q, dok.id, sel.start, sel.ende, ich, nurIch, von());
    const m = memosAnStelle(q, dok.id, sel.start, sel.ende);
    const memo = m ? ' ' + Lp(m, '1 Memo.', `${m} Memos.`, '1 memo.', `${m} memos.`) : '';
    sage((c.length ? L(`Hier kodiert: ${c.join(', ')}.`, `Coded here: ${c.join(', ')}.`) : L('Hier ist nichts kodiert.', 'Nothing is coded here.')) + memo);
  }
  function hebeAuf() {
    merkeAuswahl();
    if (sel.start === sel.ende) return;
    setzeAuswahl(sel.start, sel.start);
    sage(L('Markierung aufgehoben.', 'Selection cleared.'));
  }

  function taste(e: KeyboardEvent) {
    const k = e.key;
    const kl = k.length === 1 ? k.toLowerCase() : k;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && kl === 'z') { e.preventDefault(); rueck(); return; }
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (kl === 's') { e.preventDefault(); markiereSatz(); }
    else if (kl === 'a') { e.preventDefault(); markiereAbsatz(); }
    else if (k === 'Enter' || kl === 'k') { e.preventDefault(); codeGeben(); }
    else if (/^[1-9]$/.test(k) && !e.shiftKey) { e.preventDefault(); codeZiffer(Number(k)); }
    else if (kl === 'i') { e.preventDefault(); zeigeInfo(); }
    else if (kl === 'm') { e.preventDefault(); memoGeben(); }
    else if (k === 'Escape') { e.preventDefault(); hebeAuf(); }
    else if (k.startsWith('Arrow') && !e.shiftKey && sel.start !== sel.ende) { sel = { start: sel.ende, ende: sel.ende }; }
    else if (k.length === 1 || k === 'Backspace' || k === 'Delete') { e.preventDefault(); }
  }
  const blocke = (e: Event) => e.preventDefault();

  /* Kommt der Fokus per Tastatur (Tab, Umschalt+Tab) zurück ins Feld, kehrt die zuletzt gemerkte Markierung wieder; ein Mausklick setzt neu */
  let maus = false;
  function beimFokus() {
    if (maus) { maus = false; return; }
    const merk = { ...sel };
    if (merk.start === merk.ende) return;
    const stelle = () => { const a = leseAuswahl(); return !a || (a.start === a.ende); };
    if (stelle()) setzeAuswahl(merk.start, merk.ende, false);
    setTimeout(() => { if (document.activeElement === wurzel && stelle()) setzeAuswahl(merk.start, merk.ende, false); }, 0);
  }

  /* ---- Ansage beim Lesen (Einstellung, Voreinstellung aus; Fachblatt Falle 6) ---- */
  let letzteCodes = '';
  let nimmZurueck: (() => void) | null = null;
  function beimLesen() {
    merkeAuswahl();
    if (!ansageLesen || sel.start !== sel.ende || !orig) return;
    const c = codeBeschriftungen(q, dok.id, sel.start, sel.ende, ich, nurIch, von()).join(', ');
    if (c === letzteCodes) return;
    const vorher = letzteCodes;
    letzteCodes = c;
    nimmZurueck?.();
    const t = c ? L(`Kodiert: ${c}.`, `Coded: ${c}.`) : vorher ? L('Ende der Kodierung.', 'End of coding.') : '';
    if (t) nimmZurueck = sageSpaeter(t, 600);
  }
  onMount(() => {
    document.addEventListener('selectionchange', beimLesen);
    return () => { document.removeEventListener('selectionchange', beimLesen); nimmZurueck?.(); };
  });

  /* ---- kodierte Stellen sichtbar (CSS Custom Highlight API): ko-kodiert, bei zwei oder mehr Codes zusätzlich ko-ueberlapp ---- */
  const kannMarkieren = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
  const hl = (): Map<string, unknown> => (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
  const loescheHl = () => { hl().delete('ko-kodiert'); hl().delete('ko-ueberlapp'); };
  $effect(() => {
    if (!kannMarkieren) return;
    const qq = q, d = dok, w = wurzel, nur = nurIch, wer = ich;
    void norm;
    const text = w?.firstChild;
    if (!w || !text) { loescheHl(); return; }
    const len = (text.nodeValue ?? '').length;
    // Segmente dieses Dokuments mit den Codes der sichtbaren Kodierungen
    const segs: { a: number; b: number; codes: Set<string> }[] = [];
    for (const s of qq.segmente) {
      if (s.dokument !== d.id || s.ende <= s.start) continue;
      const codes = new Set<string>();
      for (const k of qq.kodierungen) if (k.segment === s.id && (!nur || k.kodierende === wer)) codes.add(k.code);
      if (codes.size) segs.push({ a: s.start, b: s.ende, codes });
    }
    const punkte = [...new Set(segs.flatMap(s => [s.a, s.b]))].sort((x, y) => x - y);
    const u = new Map<number, number>();
    for (const p of punkte) u.set(p, origZuNorm(cpZuUtf16(karte, p)));
    const eins: Range[] = [], mehr: Range[] = [];
    for (let i = 0; i + 1 < punkte.length; i++) {
      const p = punkte[i]!, p2 = punkte[i + 1]!;
      const codes = new Set<string>();
      for (const s of segs) if (s.a <= p && s.b >= p2) for (const c of s.codes) codes.add(c);
      if (!codes.size) continue;
      const u0 = u.get(p)!, u1 = u.get(p2)!;
      if (u0 > len || u1 > len || u1 <= u0) continue;
      const r = document.createRange(); r.setStart(text, u0); r.setEnd(text, u1);
      eins.push(r);
      if (codes.size > 1) { const r2 = document.createRange(); r2.setStart(text, u0); r2.setEnd(text, u1); mehr.push(r2); }
    }
    const H = Highlight as unknown as new (...r: Range[]) => { priority: number };
    hl().set('ko-kodiert', new H(...eins));
    const h2 = new H(...mehr); h2.priority = 1;
    hl().set('ko-ueberlapp', h2);
    return () => { loescheHl(); };
  });

  /* ---- Beschreibung der Stelle (sichtbar, keine Live-Region) ---- */
  const stelleText = $derived.by(() => {
    const c = codeBeschriftungen(q, dok.id, sel.start, sel.ende, ich, nurIch, von());
    if (sel.start !== sel.ende) {
      const codes = c.length ? L(`Codes hier: ${c.join(', ')}.`, `Codes here: ${c.join(', ')}.`) : L('Keine Codes hier.', 'No codes here.');
      const ai = absaetze.findIndex(x => x.start === sel.start), aj = absaetze.findIndex(x => x.ende === sel.ende);
      const wo = ai >= 0 && aj >= ai
        ? (ai === aj ? L(`Absatz ${absaetze[ai]!.nr}`, `Paragraph ${absaetze[ai]!.nr}`) : L(`Absätze ${absaetze[ai]!.nr} bis ${absaetze[aj]!.nr}`, `Paragraphs ${absaetze[ai]!.nr} to ${absaetze[aj]!.nr}`))
        : beschreibeStellen([sel], saetze);
      const frei = /^(Zeichen|Characters) /.test(wo);
      return frei ? L(`Markiert: ${wo}. ${codes}`, `Marked: ${wo}. ${codes}`) : L(`Markiert: ${wo}, Zeichen ${sel.start + 1} bis ${sel.ende}. ${codes}`, `Marked: ${wo}, characters ${sel.start + 1} to ${sel.ende}. ${codes}`);
    }
    const a = absatzNr(orig, sel.start);
    return L(`Nichts markiert. Schreibmarke in Absatz ${a}.`, `Nothing marked. Cursor in paragraph ${a}.`);
  });
</script>

<div id="ko-text" class="ko-text" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="false" tabindex="0"
  aria-label={L(`Interviewtext: ${dok.name}`, `Interview text: ${dok.name}`)} aria-describedby="ko-text-kurz" bind:this={wurzel}
  onkeydown={taste} onfocus={beimFokus} onmousedown={() => { maus = true; }} onbeforeinput={blocke} onpaste={blocke} ondrop={blocke} oncut={blocke} onkeyup={merkeAuswahl} onmouseup={merkeAuswahl}>{norm}</div>
<p class="hilfe" id="ko-text-kurz" data-nolink>{L('Pfeiltasten lesen. Umschalt+Pfeil markiert. S: Satz, A: Absatz, Enter: Code geben, 1 bis 9: Code aus der Schnellleiste, I: Codes an dieser Stelle, M: Memo. Lieber Satz für Satz? Ansicht „Sätze“ oben.', 'Arrow keys read. Shift+arrow marks. S: sentence, A: paragraph, Enter: assign code, 1 to 9: code from the quick bar, I: codes at this place, M: memo. Prefer sentence by sentence? View "Sentences" above.')}</p>
<div class="knopfzeile">
  <button class="k" id="ko-satz" type="button" onpointerdown={merkeAuswahl} onclick={markiereSatz}>{L('Satz markieren', 'Mark sentence')}</button>
  <button class="k" id="ko-absatz" type="button" onpointerdown={merkeAuswahl} onclick={markiereAbsatz}>{L('Absatz markieren', 'Mark paragraph')}</button>
  <button class="k haupt" id="ko-code" type="button" onpointerdown={merkeAuswahl} onclick={codeGeben}>{L('Code geben …', 'Assign code …')}</button>
  <button class="k" id="ko-info" type="button" onpointerdown={merkeAuswahl} onclick={zeigeInfo}>{L('Was ist hier kodiert?', 'What is coded here?')}</button>
  <button class="k leise" id="ko-aufheben" type="button" onclick={hebeAuf}>{L('Markierung aufheben', 'Clear selection')}</button>
  <button class="k" id="ko-memo" type="button" onpointerdown={merkeAuswahl} onclick={memoGeben}>{L('Memo schreiben …', 'Write memo …')}</button>
</div>
<p id="ko-stelle" data-nolink class="stelle">{stelleText}</p>
{#if !kannMarkieren}<p class="hilfe">{L('Dieser Browser zeigt kodierte Stellen nicht farbig. Taste I oder die Belege zeigen sie.', 'This browser does not show coded passages in colour. The key I or the passages list shows them.')}</p>{/if}

<style>
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .ko-text { display: block; width: 100%; box-sizing: border-box; max-height: 24rem; overflow: auto; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a2) var(--a3); background: var(--blatt); color: var(--tinte); font: var(--gr-text)/1.5 var(--schrift-ui); white-space: pre-wrap; overflow-wrap: anywhere; caret-color: var(--tinte); }
  .ko-text:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
  .stelle { margin: 0; font-size: var(--gr-klein); }
  :global(::highlight(ko-kodiert)) { background-color: var(--akzent-hell); text-decoration: underline; text-decoration-thickness: 2px; }
  :global(::highlight(ko-ueberlapp)) { text-decoration: underline double; text-decoration-thickness: 3px; }
  @media (forced-colors: active) {
    :global(::highlight(ko-kodiert)) { background-color: Mark; color: MarkText; }
    :global(::highlight(ko-ueberlapp)) { background-color: Highlight; color: HighlightText; }
  }
</style>
