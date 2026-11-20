<script lang="ts">
  import { tick } from 'svelte';
  import { s, d, L, einstSpeichern } from '../lib/sitzung.svelte';
  import { stationen, pruefAnzahl, type StationId } from '../lib/rundgang';
  import { fundSchluessel } from '../lib/datencheck';
  import { sage } from '../lib/ansage';
  import { FAECHER, fachName, fachFrageMerken } from '../lib/fach';
  import { fachAusSpeicher } from '../lib/fachid';
  import { merkeAusloeser, gibZurueck, verwirf } from '../lib/fokus';

  /**
   * Stationen beim ersten Mal auf der Daten-Seite (Reihenfolge je Weg: lib/rundgang.ts). Ziel: das erste sichtbare Element zum Selektor; leer = Blase in der Mitte.
   * Zuerst die Frage, wie gearbeitet werden soll (Stufe 3, 10.11.): „Schritt für Schritt“ oder „Ich kenne mich aus“ - die Wahl gilt sofort und steht in den Einstellungen.
   * Dann die Frage nach dem Fachgebiet (Johannes 18.10.): Wer hier „Weiter“ drückt oder wählt, hat sie beantwortet;
   * wer den Rundgang vorher beendet, bekommt die Frage danach auf der Daten-Seite (FachFrage.svelte).
   */
  const ST = $derived(stationen(s.einst.profi));
  const anzahl = $derived(pruefAnzahl(s.funde, s.entscheid, s.lesehinweise.length, fundSchluessel));
  const TEXTE = $derived<Record<StationId, [string, string, string]>>({
    weise: ['', d('Wie möchtest du arbeiten?', 'Wie möchten Sie arbeiten?', 'How do you want to work?'), d('Du kannst das jederzeit in den Einstellungen unter „Einstieg“ ändern.', 'Sie können das jederzeit in den Einstellungen unter „Einstieg“ ändern.', 'You can change this at any time in the settings under "Getting started".')],
    fach: ['', d('Für welches Fach brauchst du Statable?', 'Für welches Fach brauchen Sie Statable?', 'Which field do you need Statable for?'), d('Statable zeigt bei „Neue Auswertung“ zuerst die Verfahren, die in deinem Fach üblich sind. Gerechnet wird überall gleich, und die Suche findet alles. Du kannst es später in den Einstellungen ändern.', 'Statable zeigt bei „Neue Auswertung“ zuerst die Verfahren, die in Ihrem Fach üblich sind. Gerechnet wird überall gleich, und die Suche findet alles. Sie können es später in den Einstellungen ändern.', 'Under "New analysis", Statable first shows the methods that are usual in your field. Calculation is the same everywhere, and the search finds everything. You can change this later in the settings.')],
    daten: ['.raster-huelle', d('Deine Daten', 'Ihre Daten', 'Your data'), L('Das sind die Daten aus der Datei. „Rückgängig“ oben nimmt jeden Schritt zurück.', 'This is the data from the file. “Undo” at the top takes back every step.')],
    check: ['.check-leiste, aside.rand.check', L('Daten-Check', 'Data check'), checkText()],
    neu: ['.reiter .neu, .unten-leiste a[href^="#blatt"]', L('Neue Auswertung', 'New analysis'), d('Hier beginnt eine neue Auswertung. Du sagst in einem Satz, was du wissen willst; Statable schlägt das Verfahren vor und nennt den Fachbegriff.', 'Hier beginnt eine neue Auswertung. Sie sagen in einem Satz, was Sie wissen möchten; Statable schlägt das Verfahren vor und nennt den Fachbegriff.', 'A new analysis starts here. You say in one sentence what you want to know; Statable suggests the method and gives its technical name.')],
    bericht: ['.reiter a[href="#bericht"], .unten-leiste a[href="#bericht"]', L('Reiter und Bericht', 'Tabs and report'), d('Jede Auswertung bekommt oben einen Reiter. Aus den Auswertungen, die du auswählst, entsteht dein Bericht - mit Tabellen im APA-Stil.', 'Jede Auswertung bekommt oben einen Reiter. Aus den Auswertungen, die Sie auswählen, entsteht Ihr Bericht - mit Tabellen im APA-Stil.', 'Every analysis gets a tab at the top. The analyses you choose become your report - with tables in APA style.')]
  });
  /** Daten-Check: mit der echten Zahl der Hinweise (bei 0: was der Daten-Check sonst tut). */
  function checkText(): string {
    if (!anzahl) return L('Hier meldet Statable Auffälliges in den Daten, zum Beispiel Tippfehler oder Codes wie 99. Gerade ist alles in Ordnung.', 'Statable reports anything unusual in the data here, for example typos or codes like 99. Everything is fine right now.');
    if (anzahl === 1) return d('Statable hat 1 Stelle gefunden, die du prüfen solltest. Hier kannst du sie zusammenfassen, zeigen oder so lassen.', 'Statable hat 1 Stelle gefunden, die Sie prüfen sollten. Hier können Sie sie zusammenfassen, zeigen oder so lassen.', 'Statable found 1 place you should check. Here you can merge it, show it or leave it as it is.');
    return d(`Statable hat ${anzahl} Stellen gefunden, die du prüfen solltest. Hier kannst du sie zusammenfassen, zeigen oder so lassen.`, `Statable hat ${anzahl} Stellen gefunden, die Sie prüfen sollten. Hier können Sie sie zusammenfassen, zeigen oder so lassen.`, `Statable found ${anzahl} places you should check. Here you can merge them, show them or leave them as they are.`);
  }
  /** Solange der Rundgang offen ist, bleibt er sichtbar, auch wenn hier „Ich kenne mich aus“ gewählt wird (App.svelte, lib/rundgang.ts). */
  $effect(() => { s.rundgangOffen = true; return () => { s.rundgangOffen = false; }; });
  let i = $state(0);
  let blase = $state<HTMLElement | null>(null);
  let schleier = $state<HTMLElement | null>(null);
  /** Modaler Dialog: Solange der Rundgang offen ist, ist der Rest der Seite inert (kein Tab, kein Klick darunter; WCAG 2.4.11). */
  $effect(() => {
    const eltern = schleier?.parentElement;
    if (!eltern || !blase) return;
    const gesetzt: Element[] = [];
    for (const k of Array.from(eltern.children)) {
      if (k === schleier || k === blase || ['SCRIPT', 'STYLE'].includes(k.tagName) || k.hasAttribute('inert')) continue;
      k.setAttribute('inert', ''); gesetzt.push(k);
    }
    return () => { for (const k of gesetzt) k.removeAttribute('inert'); };
  });
  let pos = $state({ top: 16, left: 16 });
  let ziel: HTMLElement | null = null;
  /** Der Rundgang öffnet von selbst: meist gibt es keinen Auslöser (Fokus auf body), dann geht der Fokus beim Ende an die Überschrift der Daten. */
  merkeAusloeser();
  let fokusZurueck = false;

  /** Sichtbar: hat eine Fläche und ist nicht verborgen (das Blatt „Daten-Check“ am schmalen Rand ist `visibility:hidden`; feste Elemente haben kein `offsetParent`). */
  const sichtbar = (e: HTMLElement) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  function ende() {
    s.einst.rundgang = false; s.einst.rundgangErneut = false;
    if (s.einst.profi) s.randEng = true;   // „Ich kenne mich aus“: die Seitenleiste startet eingeklappt, der Rand zeigt dann die Zahl der Hinweise
    einstSpeichern(); fokusZurueck = true; gibZurueck('#daten-t');
  }
  async function zeige(n: number) {
    ziel?.classList.remove('rundgang-ziel');
    if (n < 0 || n >= ST.length) { ende(); return; }
    if (ST[i] === 'fach' && n > i) fachFrageMerken();
    const neueStation = n !== i;
    i = n;
    const id = ST[n]!;
    // Der Daten-Check steht in der Seitenleiste: für diese Station ausklappen (die Leiste klappt mit dem Ende des Rundgangs wieder ein, wenn „Ich kenne mich aus“ gilt).
    if (id === 'check' && s.randEng) { s.randEng = false; await tick(); await new Promise(r => setTimeout(r, 750)); }
    const sel = TEXTE[id][0];
    ziel = sel ? [...document.querySelectorAll<HTMLElement>(sel)].find(sichtbar) ?? null : null;
    ziel?.classList.add('rundgang-ziel');
    await tick();
    if (blase && ziel) {
      const r = ziel.getBoundingClientRect(), h = blase.offsetHeight, w = blase.offsetWidth;
      const groß = r.height > innerHeight / 3;
      const top = groß ? r.top + 80 : r.bottom + 16 + h < innerHeight ? r.bottom + 16 : r.top - h - 16;
      // Hohes, schmales Ziel am rechten Rand (Seitenleiste Daten-Check): Blase links daneben, auf Höhe des Kopfs - sonst deckt sie die Überschrift zu.
      const daneben = groß && r.left - w - 16 >= 16;
      pos = daneben ? { top: Math.max(16, Math.min(innerHeight - h - 16, r.top + 16)), left: r.left - w - 16 }
        : { top: Math.max(16, Math.min(innerHeight - h - 16, top)), left: Math.max(16, Math.min(innerWidth - w - 16, groß ? r.left + 80 : r.left)) };
    } else if (blase) pos = { top: Math.max(16, (innerHeight - blase.offsetHeight) / 3), left: Math.max(16, (innerWidth - blase.offsetWidth) / 2) };
    // Bei der Frage nach der Arbeitsweise geht der Fokus auf die gewählte Wahl (Pfeiltasten wählen sofort), sonst auf „Weiter“.
    (id === 'weise' ? blase?.querySelector<HTMLElement>('input[type=radio]:checked') : blase?.querySelector<HTMLElement>('.haupt'))?.focus();
    // Nachttest NVDA 11.11.: Der Fokus bleibt nach „Weiter“/„Zurück“ auf demselben Knopf, darum sagte der Leser nichts. Die neue Station wird angesagt (nicht beim Neuausrichten).
    if (neueStation) { const t = TEXTE[id][1]; sage(`${n + 1} ${L('von', 'of')} ${ST.length}: ${t}${/[.?!]$/.test(t) ? '' : '.'} ${TEXTE[id][2]}`); }
  }
  function waehle(profi: boolean) {
    if (s.einst.profi === profi) return;
    s.einst.profi = profi; einstSpeichern();
    sage(profi ? L('Ich kenne mich aus. Der Rundgang hat noch 3 Stationen.', 'I know my way around. The tour has 3 stations left.') : L('Schritt für Schritt. Der Rundgang hat 6 Stationen.', 'Step by step. The tour has 6 stations.'));
  }
  $effect(() => {
    const t = setTimeout(() => zeige(0), 250);
    // Beim Drehen oder Verkleinern des Fensters neu ausrichten - sonst ragt die Blase über den Rand.
    const neu = () => { if (blase) zeige(i); };
    addEventListener('resize', neu);
    return () => { clearTimeout(t); removeEventListener('resize', neu); ziel?.classList.remove('rundgang-ziel'); if (!fokusZurueck) { fokusZurueck = true; verwirf(1); } };
  });

  function tasten(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); zeige(-1); }
    if (e.key === 'Tab' && blase) {
      const f = [...blase.querySelectorAll<HTMLElement>('select, button, input[type=radio]:checked')];
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1)!.focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0]!.focus(); }
    }
  }
  const aktId = $derived(ST[i]!);
  const st = $derived(TEXTE[aktId]);
</script>

<div class="rundgang-schleier" bind:this={schleier}></div>
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="rundgang-blase" bind:this={blase} role="dialog" aria-modal="true" aria-labelledby="rg-t" aria-describedby="rg-x" tabindex="-1" style="top:{pos.top}px;left:{pos.left}px" onkeydown={tasten}>
  <p class="zaehler">{i + 1} {L('von', 'of')} {ST.length}</p>
  <h2 id="rg-t">{st[1]}</h2>
  <p id="rg-x">{st[2]}</p>
  {#if aktId === 'weise'}
    <fieldset class="rg-weise"><legend class="nur-vorleser">{st[1]}</legend>
      <label class="option"><input type="radio" name="rg-weise" checked={!s.einst.profi} onchange={() => waehle(false)}><span><strong>{L('Schritt für Schritt', 'Step by step')}</strong><br>{d('Statable zeigt dir jeden Schritt und erklärt am Rand.', 'Statable zeigt Ihnen jeden Schritt und erklärt am Rand.', 'Statable shows you every step and explains in the margin.')}</span></label>
      <label class="option"><input type="radio" name="rg-weise" checked={s.einst.profi} onchange={() => waehle(true)}><span><strong>{L('Ich kenne mich aus', 'I know my way around')}</strong><br>{L('Befehle und alle Zahlen sind gleich offen, die Seitenleiste startet eingeklappt. Gerechnet wird gleich.', 'Commands and all numbers are open right away, the side panel starts collapsed. Calculation starts right away.')}</span></label>
    </fieldset>
  {:else if aktId === 'fach'}
    <div class="eingabe rg-fach"><label for="rg-fach">{L('Mein Fachgebiet', 'My field of study')}</label>
      <select id="rg-fach" value={s.einst.fach} onchange={(e) => { s.einst.fach = fachAusSpeicher((e.currentTarget as HTMLSelectElement).value); einstSpeichern(); fachFrageMerken(); }}>
        {#each FAECHER as f (f.id)}<option value={f.id}>{fachName(f.id)}</option>{/each}
      </select></div>
  {/if}
  <div class="knopfzeile"><button class="k leise" type="button" onclick={() => zeige(-1)}>{L('Rundgang beenden', 'End tour')}</button>
    <span>{#if i}<button class="k" type="button" onclick={() => zeige(i - 1)}>{L('Zurück', 'Back')}</button> {/if}<button class="k haupt" type="button" onclick={() => zeige(i + 1)}>{i === ST.length - 1 ? L('Los geht’s', "Let's go") : L('Weiter', 'Next')}</button></span></div>
</div>
