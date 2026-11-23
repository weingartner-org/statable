<script lang="ts">
  import Rechnet from './bausteine/Rechnet.svelte';
  import BegriffsDialog from './bausteine/BegriffsDialog.svelte';
  import { starteBegriffe, ladeBegriffsIndex } from './lib/begriffsstart.svelte';
  import { starteFokuswache } from './lib/fokus';
  import { sage, starteAnsagen } from './lib/ansage';
  import { behandle, reiterKuerzel, kuerzelText, kuerzelAttribut, istMac, popupOffen } from './lib/kuerzel';
  import { oeffnePalette } from './lib/palette.svelte';
  import Kuerzelliste from './bausteine/Kuerzelliste.svelte';
  import Meldungsverlauf from './bausteine/Meldungsverlauf.svelte';
  import { aktuelleSprache } from './lib/sitzung.svelte';
  import { onMount, tick, untrack } from 'svelte';
  import { s, d, L, einstSpeichern, rueckgaengig, wiederholen, melde, schliesseMeldung, haltMeldung, ladeListe, weiterarbeiten, sichern, projektSpeichern, meldeGespeichert, konfliktNeuLaden, konfliktHierWeiter } from './lib/sitzung.svelte';
  import { titelNachziehen } from './lib/blatttitel';
  import Icon from './bausteine/Icon.svelte';
  import Logo from './bausteine/Logo.svelte';
  import Start from './seiten/Start.svelte';
  import Daten from './seiten/Daten.svelte';
  import Spalten from './seiten/Spalten.svelte';
  import BlattSeite from './seiten/Blatt.svelte';
  import Befehle from './seiten/Befehle.svelte';
  import Protokoll from './seiten/Protokoll.svelte';
  import Vorlage from './seiten/Vorlage.svelte';
  import Bericht from './seiten/Bericht.svelte';
  import Einstellungen from './seiten/Einstellungen.svelte';
  import Hilfe from './seiten/Hilfe.svelte';
  import Unterstuetzen from './seiten/Unterstuetzen.svelte';
  import { spendenHinweis, schliesseSpendenHinweis } from './lib/spendenerinnerung.svelte';
  import Planen from './seiten/Planen.svelte';
  import FragebogenPlanen from './seiten/Fragebogen.svelte';
  import InterviewsSeite from './seiten/Interviews.svelte';
  import PlanungSeite from './seiten/Planung.svelte';
  import KodierenSeite from './seiten/Kodieren.svelte';
  import StationSeite from './seiten/Station.svelte';
  import Verstehen from './seiten/Verstehen.svelte';
  import Lernen from './seiten/Lernen.svelte';
  import Beispiele from './seiten/Beispiele.svelte';
  import BeispielBegleiter from './bausteine/BeispielBegleiter.svelte';
  import RProbe from './seiten/RProbe.svelte';
  import Umformen from './seiten/Umformen.svelte';
  import Bearbeiten from './seiten/Bearbeiten.svelte';
  import TabellePage from './seiten/Tabelle.svelte';
  import AmtlichPage from './seiten/Amtlich.svelte';
  import KartePage from './seiten/Karte.svelte';
  import Rundgang from './bausteine/Rundgang.svelte';
  import { rundgangSichtbar } from './lib/rundgang';
  import AnsichtMenue from './bausteine/AnsichtMenue.svelte';
  import { hereingleiten } from './lib/wechsel';
  import ProjektPasswort from './bausteine/ProjektPasswort.svelte';
  import Melden from './bausteine/Melden.svelte';
  import RLauft from './bausteine/RLauft.svelte';
  import Rechtliches from './seiten/Rechtliches.svelte';
  import OfflineHinweis from './bausteine/OfflineHinweis.svelte';
  import Ersetzen from './bausteine/Ersetzen.svelte';
  import BlattWahl from './bausteine/BlattWahl.svelte';
  import ReiterSchliessen from './bausteine/ReiterSchliessen.svelte';
  import { schliessen } from './lib/blattentfernen.svelte';
  import LinkOeffnen from './bausteine/LinkOeffnen.svelte';
  import { hinweis, pruefeErinnerung, starteErinnerung, hinweisSpeichern, nichtMehrErinnern, schliesseHinweis } from './lib/dateierinnerung.svelte';
  import { nimmLinkAusAdresse, pruefeLink } from './lib/linkoeffnen.svelte';
  import Tipp from './bausteine/Tipp.svelte';
  import Befehlspalette from './bausteine/Befehlspalette.svelte';
  import Projektmenue from './bausteine/Projektmenue.svelte';
  import GewichtChip from './bausteine/GewichtChip.svelte';
  import Fallgewicht from './bausteine/Fallgewicht.svelte';
  import { merkeSeite, zurueck } from './lib/navi';
  import { diagrammSchrift } from './lib/dgschrift';
  import { apiDa } from './lib/dateiziel';

  /** Link mit ?projekt= oder #oeffne=: aus der Adresszeile nehmen, bevor die Seitenführung sie als Seite liest; gefragt wird nach dem Start. */
  const linkAdresse = nimmLinkAusAdresse();
  let hash = $state(location.hash.slice(1) || 'start');
  const seite = $derived(hash.split('/')[0] || 'start');
  const teil = $derived(hash.split('/').slice(1).join('/'));
  /** Reiter und untere Leiste nur, wenn Daten offen sind - ohne Daten führten Daten, Neue Auswertung und Bericht nur zur Startseite. */
  const einfach = $derived(seite === 'start' || !s.projekt);

  /** Nach dem Neuladen: steht in der Adresse ein Blatt, die Daten oder der Bericht, die gespeicherte Arbeit gleich wieder öffnen
   *  (bisher landete man auf Start). */
  let oeffnet = $state(false);
  /** Daten da? Nach dem Neuladen steht das Projekt schon, die Zeilen kommen erst (Abschlusstest A6): bis dahin Lade-Animation statt „0 Zeilen · 0 Spalten“. */
  const datenDa = $derived(!!s.projekt && !(s.datenLaedt && !s.spalten.length));
  const BRAUCHT_DATEN = ['daten', 'spalten', 'umformen', 'bearbeiten', 'protokoll', 'vorlage', 'tabelle', 'amtlich', 'karte', 'blatt', 'bericht', 'fragebogen', 'interviews', 'planung', 'station' /* braucht keine Daten, aber das gespeicherte Projekt mit den Fragebögen */];

  /** Zweiter Tab (Prüfung G4): beide schreiben in denselben Browser-Speicher und überschrieben sich still. Jeder Tab meldet sich; wer einen anderen hört, warnt. */
  let zweiterTab = $state(false);
  onMount(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const kanal = new BroadcastChannel('statable-tabs');
    kanal.onmessage = (e) => { if (e.data === 'da') kanal.postMessage('auch-da'); if (e.data === 'da' || e.data === 'auch-da') zweiterTab = true; };
    kanal.postMessage('da');
    return () => kanal.close();
  });
  onMount(starteBegriffe);
  onMount(starteFokuswache);
  onMount(starteAnsagen);
  /** Texte der Karten, die nicht über `melde` laufen: einmal als Funktion, damit Karte und Ansage dasselbe sagen. */
  const textZweiterTab = () => d('Statable ist noch in einem anderen Tab offen. Arbeite nur in einem davon - sonst überschreiben sich die Änderungen gegenseitig.', 'Statable ist noch in einem anderen Tab offen. Arbeiten Sie nur in einem davon - sonst überschreiben sich die Änderungen gegenseitig.', 'Statable is also open in another tab. Work in only one of them - otherwise the changes overwrite each other.');
  const textKonflikt = () => L('In einem anderen Tab wurde dieses Projekt geändert.', 'This project was changed in another tab.');
  const textDateiHinweis = () => d('Du arbeitest seit einer Weile, ohne das Projekt in eine Datei zu speichern. Die Daten liegen nur in diesem Browser.', 'Sie arbeiten seit einer Weile, ohne das Projekt in eine Datei zu speichern. Die Daten liegen nur in diesem Browser.', 'You have been working for a while without saving the project to a file. The data is only in this browser.');
  /** Karten ohne Live-Region: Ansage genau einmal beim Erscheinen. Wechsel auf einen anderen Tab mit Konflikt oder Datenverlust-Gefahr ist dringend. */
  $effect(() => { if (zweiterTab) sage(textZweiterTab(), 'dringend'); });
  $effect(() => { if (s.konflikt) sage(textKonflikt(), 'dringend'); });
  $effect(() => { if (spendenHinweis.offen) sage(d(`Du hast Statable jetzt rund ${spendenHinweis.stunden} Stunden benutzt. Eine kleine Spende ist willkommen; der Hinweis steht unten im Bild.`, `Sie haben Statable jetzt rund ${spendenHinweis.stunden} Stunden benutzt. Eine kleine Spende ist willkommen; der Hinweis steht unten im Bild.`, `You have now used Statable for about ${spendenHinweis.stunden} hours. A small donation is welcome; the notice is at the bottom of the screen.`), 'hoeflich'); });
  $effect(() => { if (hinweis.offen) sage(textDateiHinweis()); });
  $effect(() => ladeBegriffsIndex(aktuelleSprache()));
  onMount(() => {
    einstSpeichern();
    diagrammSchrift();
    ladeListe();
    const ende = starteErinnerung();
    if (linkAdresse !== null) void pruefeLink(linkAdresse);
    if (import.meta.env.VITE_KONTO === '1') void import('./lib/konto/konto.svelte').then(m => m.starteImHintergrund());
    merkeSeite(hash);
    if (BRAUCHT_DATEN.includes(seite) && !s.projekt) { oeffnet = true; weiterarbeiten().catch(() => {}).finally(() => { oeffnet = false; }); }
    const weiter = async () => {
      const neu = location.hash.slice(1) || 'start';
      const alteSeite = hash.split('/')[0];
      const alterBlatt = alteSeite === 'blatt' ? hash.split('/')[1] : undefined;
      hash = neu;
      merkeSeite(neu);
      // Reiterwechsel: Fokus auf die Überschrift, auch von Auswertung zu Auswertung (gleiche Seite, anderes Blatt).
      if (neu.split('/')[0] !== alteSeite || (alteSeite === 'blatt' && neu.split('/')[1] !== alterBlatt)) {
        await tick();
        // Befehle: gleich ins Befehlsfeld (es hat einen Namen; Seitentitel wird angesagt).
        const feld = neu.split('/')[0] === 'befehle' ? document.getElementById('syntax') : null;
        const h = document.querySelector<HTMLElement>('#inhalt h1');
        if (feld) { feld.focus({ preventScroll: true }); if (h?.textContent) sage(h.textContent.trim()); }
        else if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
        scrollTo(0, 0);
      }
    };
    /** Strg+S / ⌘S: das Projekt als Datei speichern (statt die Webseite). Strg+Umschalt+S: Speichern unter. */
    const taste = async (e: KeyboardEvent) => {
      if (behandle(e)) return;   // Kürzel der Liste (lib/kuerzel.ts): Strg+K, Alt+T/W/Z/J/H/L/O/K/N/B, Alt+1..9, Alt+Bild auf/ab
      // Esc schließt die jüngste Meldung - aber nur, wenn kein Menü oder Dialog offen ist (die schließen zuerst).
      if (e.key === 'Escape' && !e.defaultPrevented && s.meldungen.length && !popupOffen()) { schliesseMeldung(s.meldungen.at(-1)!.id); return; }
      // Rückgängig / Wiederholen: Strg/Cmd+Z, Strg/Cmd+Umschalt+Z, Strg+Y. In einem Textfeld gilt das Zurücknehmen des Textes selbst;
      // eine Datenzelle, in der noch nichts getippt wurde, zählt nicht als Textfeld (dort gäbe es nichts zurückzunehmen).
      if ((e.ctrlKey || e.metaKey) && !e.altKey && s.projekt && (e.key.toLowerCase() === 'z' || (e.key.toLowerCase() === 'y' && !e.metaKey))) {
        const z = e.target as HTMLElement | null;
        const imFeld = !!z && (z.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(z.tagName)) && !(z instanceof HTMLInputElement && z.classList.contains('zelle-ein') && z.value === (z.dataset.stand ?? z.value));
        if (!imFeld && !document.querySelector('dialog[open]')) {
          e.preventDefault();
          if (e.key.toLowerCase() === 'y' || e.shiftKey) { if (s.wieder.length) void wiederholen(); else melde(L('Nichts zum Wiederholen.', 'Nothing to redo.')); }
          else if (s.verlauf.length) void rueckgaengig(); else melde(L('Noch nichts zum Rückgängigmachen.', 'Nothing to undo yet.'));
          return;
        }
      }
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== 's' || !s.projekt) return;
      if (e.shiftKey && !apiDa()) return;   // Strg+Umschalt+S = Speichern unter, nur wo der Browser einen Ort wählen lässt
      e.preventDefault();
      const name = await projektSpeichern(undefined, { unter: e.shiftKey });
      if (name) meldeGespeichert(name);
    };
    /** Eine Datei, die auf eine andere Seite als die Startseite fällt, würde vom Browser geöffnet (Statable wäre weg). Statt dessen: Hinweis. Die Startseite nimmt Dateien selbst. */
    const dateiDa = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
    const dragUeber = (e: DragEvent) => { if (dateiDa(e) && seite !== 'start') e.preventDefault(); };
    const ablegen = (e: DragEvent) => { if (!dateiDa(e) || seite === 'start') return; e.preventDefault(); melde(L('Zum Öffnen einer Datei: auf der Startseite ablegen.', 'To open a file, drop it on the start page.')); };
    addEventListener('hashchange', weiter); addEventListener('keydown', taste); addEventListener('dragover', dragUeber); addEventListener('drop', ablegen);
    return () => { removeEventListener('hashchange', weiter); removeEventListener('keydown', taste); removeEventListener('dragover', dragUeber); removeEventListener('drop', ablegen); ende(); };
  });
  // Startseite: der Titel aus index.html bleibt (ihn zeigt die Suche); sonst „<Überschrift> - statable“.
  const startTitel = document.title;
  $effect(() => { const h = document.querySelector('#inhalt h1'); document.title = seite === 'start' ? startTitel : (h?.textContent ? h.textContent + ' - ' : '') + 'statable'; void hash; void s.einst.sprache; void s.projekt; void oeffnet; void s.blaetter.map(b => b.titel).join(); });

  /** Der Hinweis „Ein Speichern in eine Datei lohnt sich“ prüft auch gleich, wenn sich der Stand ändert. */
  $effect(() => { void s.ungesichert; void s.ungesichertSeit; untrack(() => pruefeErinnerung()); });

  /** Das offene Blatt in der Reiterleiste ins Bild holen. */
  $effect(() => { void hash; void s.blaetter.length; tick().then(() => document.querySelector('.reiter-blaetter [aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })); });
  /** Von Statable vorgeschlagene Blatt-Titel folgen der Sprache, auch bei gespeicherter Arbeit. */
  $effect(() => { void s.einst.sprache; void s.blaetter.length; untrack(() => { if (titelNachziehen(s.blaetter)) sichern(); }); });

  /** Höhe des Kopfs für alles, was darunter mitwandert (Rand, Papier im Bericht): zwei Zeilen, mit der Größe wachsend. */
  let kopfH = $state(0);
  /** Slogan im Kopf (Johannes 24.10.): nur zeigen, wenn er ganz neben die anderen Teile passt - sonst verschwindet er als Erstes und lässt keine Lücke.
   *  Gemessen wird der Platz, den die anderen Teile in voller Breite brauchen (der Projektname mit seiner ganzen Länge). */
  let kopfOben = $state<HTMLElement>();
  let sloganDa = $state(true);
  $effect(() => {
    const k = kopfOben; if (!k) return;
    const pruefe = () => {
      const box = k.querySelector<HTMLElement>('.kopf-slogan'), text = box?.firstElementChild as HTMLElement | null;
      if (!box || !text) return;
      const breite = text.scrollWidth;   // auch ausgeblendet messbar (.weg ist unsichtbar, aber nicht display:none)
      if (!breite) return;
      const gap = parseFloat(getComputedStyle(k).columnGap) || 0, rand = parseFloat(getComputedStyle(box).marginInlineStart) || 0;
      let andere = 0, zahl = 0;
      for (const c of Array.from(k.children) as HTMLElement[]) {
        if (c === box || getComputedStyle(c).position === 'absolute') continue;
        andere += c.classList.contains('pm') ? Math.max(c.scrollWidth, c.getBoundingClientRect().width) : c.getBoundingClientRect().width; zahl++;
      }
      sloganDa = k.clientWidth - andere - gap * zahl - rand >= breite;
    };
    const ro = new ResizeObserver(pruefe);
    ro.observe(k); for (const c of Array.from(k.children)) ro.observe(c);
    const mo = new MutationObserver(() => { ro.disconnect(); ro.observe(k); for (const c of Array.from(k.children)) ro.observe(c); pruefe(); });
    mo.observe(k, { childList: true });
    addEventListener('resize', pruefe);   // dazu: Fenstergröße (der ResizeObserver meldet sich erst beim nächsten gezeichneten Bild)
    pruefe();
    return () => { ro.disconnect(); mo.disconnect(); removeEventListener('resize', pruefe); };
  });
  $effect(() => { if (kopfH) document.documentElement.style.setProperty('--kopf-h', `${kopfH}px`); });
  /** Jede andere Seite (Daten, Bericht, Befehle, Einstellungen, Hilfe …) gleitet herein wie ein Reiterwechsel (10.10.). Das Blatt macht das selbst. */
  let hauptOrt = $state<HTMLElement>();
  $effect(() => { void seite; void teil; if (seite === 'blatt') return; untrack(() => { void tick().then(() => hereingleiten(hauptOrt?.firstElementChild)); }); });
  /** Hilfe und Einstellungen: derselbe Knopf öffnet und schließt (zurück zur letzten Arbeitsseite). */
  const umschalten = (e: MouseEvent, p: string) => { if (seite === p) { e.preventDefault(); zurueck(!!s.projekt); } };
  /** `aria-keyshortcuts` der Reiter: Alt+Nummer in der Reihenfolge des Kopfs (lib/kuerzel.ts), dazu das eigene Kürzel. */
  const ks = (h: string, eigenes?: string) => reiterKuerzel(s.blaetter.map(b => b.id), h, eigenes);
  const akt = (p: string) => (hash === p || (p === 'daten' && (seite === 'spalten' || seite === 'umformen' || seite === 'bearbeiten')) ? 'page' : undefined);
</script>

<a class="nur-vorleser skip" href="#inhalt" onclick={(e) => { e.preventDefault(); document.getElementById('inhalt')?.focus(); }}>{L('Zum Inhalt springen', 'Skip to content')}</a>
<!-- Kopf in zwei Zeilen (10.10., Vorschlag A): oben das Programm und das Projekt, unten nur die Seiten des Hefts.
     Vorher standen 15 gleich laute Dinge in einer Zeile - Reiter, Handlungen und Einstellungen waren nicht zu unterscheiden (Johannes). -->
<OfflineHinweis />
<header class="kopf" bind:clientHeight={kopfH}>
  <div class="kopf-oben" bind:this={kopfOben}>
    <a class="marke" href="#start" data-tipp={L('Zur Startseite', 'To the start page')}><Logo /><span class="wort"><span class="w-stat">stat</span><span class="w-able">able</span></span></a>
    <!-- Slogan rechts neben dem Logo (Johannes 24.10.): wird es eng, verschwindet er als Erstes - ganz, nie abgeschnitten (stil/app.css .kopf-slogan). -->
    <span class="kopf-slogan" class:weg={!sloganDa} aria-hidden="true"><span lang="en">turn numbers into insight</span></span>
    {#if s.projekt}<span class="kopf-trenner" aria-hidden="true"></span><Projektmenue /><GewichtChip />{/if}
    <div class="kopf-rechts">
      <!-- Stufe 9 „Eine Suche“: das Suchfeld der Kopfzeile ist ein Knopf, der aussieht wie ein Suchfeld und die Befehlspalette (Strg+K) öffnet; sie findet Auswertungen, Seiten, Lernen, Beispiele, Einstellungen und Hilfe.
           Die Klasse `kopf-suche` ist Vertrag mit den Mess-Skripten (app/e2e/probe). Der Satz im `data-tipp` ersetzt den früheren einmaligen Hinweis (StrgKHinweis). -->
      <button class="k kopf-suche" type="button" aria-haspopup="dialog" aria-keyshortcuts={istMac() ? 'Meta+K' : kuerzelAttribut('strg', 'KeyK')}
        aria-label={L(`Suchen … ${kuerzelText('palette')}`, `Search … ${kuerzelText('palette')}`)} {...{ 'aria-description': L('Suchen: Auswertungen, Hilfe, Lernen, Beispiele, Einstellungen', 'Search: analyses, help, learning, examples, settings') }}
        data-tipp={L(`Alles suchen und ausführen: Auswertungen, Seiten, Einstellungen und Hilfe (${kuerzelText('palette')})`, `Search and run anything: analyses, pages, settings and help (${kuerzelText('palette')})`)}
        onclick={() => oeffnePalette()}><Icon n="suche" /><span class="nur-breit" aria-hidden="true">{L('Suchen …', 'Search …')}</span><kbd class="nur-breit" aria-hidden="true">{kuerzelText('palette')}</kbd></button>
      {#if s.projekt}
        <button class="k leise nur-symbol" id="rueck" type="button" aria-label={L('Rückgängig', 'Undo')} data-tipp={s.verlauf.length ? L(`Rückgängig: ${s.verlauf.at(-1)!.text}`, `Undo: ${s.verlauf.at(-1)!.text}`) : L('Noch nichts zum Rückgängigmachen - nur Änderungen an den Daten lassen sich zurücknehmen.', 'Nothing to undo yet - only changes to the data can be undone.')} aria-disabled={s.verlauf.length ? undefined : 'true'}
          onclick={() => (s.verlauf.length ? rueckgaengig() : melde(L('Noch nichts zum Rückgängigmachen.', 'Nothing to undo yet.')))}><Icon n="rueck" /></button>
        <button class="k leise nur-symbol" id="wieder" type="button" aria-label={L('Wiederholen', 'Redo')} data-tipp={s.wieder.length ? L(`Wiederholen: ${s.wieder.at(-1)!.text}`, `Redo: ${s.wieder.at(-1)!.text}`) : d('Nichts zum Wiederholen - hier käme zurück, was du gerade rückgängig gemacht hast.', 'Nichts zum Wiederholen - hier käme zurück, was Sie gerade rückgängig gemacht haben.', 'Nothing to redo - this would bring back what you just undid.')} aria-disabled={s.wieder.length ? undefined : 'true'}
          onclick={() => (s.wieder.length ? wiederholen() : melde(L('Nichts zum Wiederholen.', 'Nothing to redo.')))}><Icon n="wieder" /></button>
        <span class="kopf-trenner" aria-hidden="true"></span>
      {/if}
      <!-- Von rechts nach links (Johannes 10.10.): Einstellungen ganz rechts, Kontrast, Größe − / +, Hilfe. Beispiele nur auf der Startseite. -->
      <!-- „Lernen“: Einheiten mit Erklärung, Beispiel, Regler und Fragen, ohne Projekt - darum hier oben, immer sichtbar (vorher „Verstehen“, das jetzt „Rechner und Regler“ heißt und von Lernen aus erreichbar ist). Ein Klick auf der Startseite schließt wieder. -->
      <a class="k leise" href="#lernen" aria-current={seite === 'lernen' ? 'page' : undefined} onclick={(e) => { if (hash === 'lernen') { e.preventDefault(); zurueck(!!s.projekt); } }}
        aria-label={L('Lernen', 'Learning')} aria-keyshortcuts="Alt+L" data-tipp={hash === 'lernen' ? L(`Lernen schließen (${kuerzelText('lernen')})`, `Close Learning (${kuerzelText('lernen')})`) : L(`Lernen: kleine Einheiten mit Erklärung, Beispiel, Regler und Fragen (${kuerzelText('lernen')})`, `Learning: small units with explanation, example, slider and questions (${kuerzelText('lernen')})`)}><Icon n="gluehbirne" /><span class="nur-breit" aria-hidden="true">{L('Lernen', 'Learning')}</span></a>
      <a class="k leise" href="#hilfe" aria-current={seite === 'hilfe' ? 'page' : undefined} onclick={(e) => umschalten(e, 'hilfe')}
        aria-label={L('Hilfe', 'Help')} aria-keyshortcuts="Alt+H" data-tipp={seite === 'hilfe' ? L(`Hilfe schließen (${kuerzelText('hilfe')})`, `Close help (${kuerzelText('hilfe')})`) : L(`Hilfe und Begriffe (${kuerzelText('hilfe')})`, `Help and terms (${kuerzelText('hilfe')})`)}><Icon n="hilfe" /><span class="nur-breit" aria-hidden="true">{L('Hilfe', 'Help')}</span></a>
      <Melden />
      <AnsichtMenue />
      <a class="k leise nur-symbol" href="#einstellungen" aria-current={seite === 'einstellungen' ? 'page' : undefined} onclick={(e) => umschalten(e, 'einstellungen')}
        aria-label={L('Einstellungen', 'Settings')} aria-keyshortcuts="Alt+O" data-tipp={seite === 'einstellungen' ? L(`Einstellungen schließen (${kuerzelText('einstellungen')})`, `Close settings (${kuerzelText('einstellungen')})`) : L(`Einstellungen (${kuerzelText('einstellungen')})`, `Settings (${kuerzelText('einstellungen')})`)}><Icon n="zahnrad" /></a>
    </div>
  </div>
  {#if !einfach}
    <nav class="reiter" aria-label={L('Heft', 'Notebook')}>
      <a href="#daten" aria-current={akt('daten')} aria-keyshortcuts={ks('daten')}><Icon n="tabelle" />{L('Daten', 'Data')}</a>
      <!-- Nur die Blätter scrollen; Daten, das Plus, Bericht und Befehle bleiben immer sichtbar (Test 07.10.: lange Titel schoben sie aus dem Bild). -->
      <div class="reiter-blaetter">{#each s.blaetter as b (b.id)}
        <div class="reiter-blatt" class:aktiv={!!akt('blatt/' + b.id)}><a href="#blatt/{b.id}" aria-current={akt('blatt/' + b.id)} aria-keyshortcuts={ks('blatt/' + b.id)} data-tipp={b.titel}><span>{b.titel}</span></a><button class="reiter-zu" type="button" aria-label={L(`Auswertung „${b.titel}“ schließen`, `Close analysis "${b.titel}"`)} data-tipp={L('Schließen', 'Close')} onclick={() => (schliessen.offen = { id: b.id, titel: b.titel })}><Icon n="zu" /></button></div>
      {/each}</div>
      <!-- Neue Auswertung: eine Handlung, keine Seite - darum als ruhiger Knopf mit Wort am Ende der Reiter (nur ein Plus fand man nicht, Johannes 10.10.). -->
      <a href="#blatt/neu" class="neu" aria-current={akt('blatt/neu')} aria-keyshortcuts={ks('blatt/neu', 'Alt+N')} data-tipp={L(`Neue Auswertung (${kuerzelText('neu')})`, `New analysis (${kuerzelText('neu')})`)}><Icon n="plus" />{L('Neue Auswertung', 'New analysis')}</a>
      <span class="reiter-luecke"></span>
      <a href="#bericht" aria-current={akt('bericht')} aria-keyshortcuts={ks('bericht', 'Alt+B')} data-tipp={L(`Bericht (${kuerzelText('bericht')})`, `Report (${kuerzelText('bericht')})`)}><Icon n="bericht" />{L('Bericht', 'Report')}</a>
      <a href="#befehle" aria-current={akt('befehle')} aria-keyshortcuts={ks('befehle')}><Icon n="befehl" />{L('Befehle', 'Commands')}</a>
      <a href="#protokoll" aria-current={akt('protokoll')} aria-keyshortcuts={ks('protokoll')}><Icon n="streifen" />{L('Protokoll', 'Log')}</a>
    </nav>
  {/if}
</header>

<main id="inhalt" tabindex="-1" bind:this={hauptOrt}>
  {#if seite === 'daten' && datenDa}<Daten />
  {:else if seite === 'spalten' && datenDa}<Spalten />
  {:else if seite === 'umformen' && datenDa}<Umformen />
  {:else if seite === 'bearbeiten' && datenDa}<Bearbeiten id={teil} />
  {:else if seite === 'tabelle' && datenDa}<TabellePage id={teil} />
  {:else if seite === 'amtlich' && datenDa}<AmtlichPage id={teil} />
  {:else if seite === 'karte' && datenDa}<KartePage />
  {:else if seite === 'blatt' && datenDa}{#key teil}<BlattSeite id={teil || 'neu'} />{/key}   <!-- neu aufbauen je Reiter: das Hereinrutschen kommt auch von Auswertung zu Auswertung (Johannes 10.10.) -->
  {:else if seite === 'protokoll' && datenDa}<Protokoll />
  {:else if seite === 'vorlage' && datenDa}<Vorlage />
  {:else if seite === 'befehle'}<Befehle />
  {:else if seite === 'bericht' && datenDa && !oeffnet}<Bericht />   <!-- erst nach dem Laden: sonst hielt er alle Blätter für veraltet (Prüfung G11) -->
  {:else if seite === 'einstellungen'}<Einstellungen />
  {:else if seite === 'hilfe'}<Hilfe id={teil} />
  {:else if seite === 'unterstuetzen'}<Unterstuetzen />
  {:else if seite === 'planen'}<Planen />
  {:else if seite === 'fragebogen'}<FragebogenPlanen />
  {:else if seite === 'interviews'}<InterviewsSeite />
  {:else if seite === 'planung'}<PlanungSeite />
  {:else if seite === 'kodieren'}<KodierenSeite />
  {:else if seite === 'station'}<StationSeite />
  {:else if seite === 'verstehen'}<Verstehen {teil} />
  {:else if seite === 'lernen'}<Lernen {teil} />
  {:else if seite === 'beispiele'}<Beispiele {teil} />
  {:else if seite === 'r-probe'}<RProbe />
  {:else if seite === 'impressum' || seite === 'datenschutz' || seite === 'behoerden' || seite === 'barrierefreiheit'}<Rechtliches art={seite} />
  {:else if oeffnet || (s.projekt && !datenDa)}<p class="heft-text" role="status" style="padding:var(--a6) var(--a4)"><Rechnet text={L('Statable öffnet die gespeicherte Arbeit …', 'Statable is opening your saved work …')} /></p>
  {:else}<Start />{/if}
</main>

{#if !einfach}
  <nav class="unten-leiste" aria-label={L('Bereiche', 'Sections')}>
    <a href="#daten" aria-current={akt('daten')}><Icon n="tabelle" />{L('Daten', 'Data')}</a>
    <a href={s.blaetter.length ? '#blatt/' + s.blaetter.at(-1)!.id : '#blatt/neu'} aria-current={seite === 'blatt' ? 'page' : undefined}><Icon n="blatt" />{L('Auswertung', 'Analysis')}</a>
    <a href="#befehle" aria-current={akt('befehle')}><Icon n="befehl" />{L('Befehle', 'Commands')}</a>
    <a href="#bericht" aria-current={akt('bericht')}><Icon n="bericht" />{L('Bericht', 'Report')}</a>
  </nav>
{/if}

{#if seite === 'daten' && s.projekt && rundgangSichtbar(s.einst, s.rundgangOffen)}<Rundgang />{/if}
<BeispielBegleiter {seite} />
<Ersetzen />
<BegriffsDialog />
<BlattWahl />
<ReiterSchliessen />
<Fallgewicht />
<LinkOeffnen />
<Tipp />
<Kuerzelliste />
<Meldungsverlauf />
<ProjektPasswort />
<Befehlspalette />

<!-- Keine Live-Region mehr: Ansagen laufen über lib/ansage.ts (zwei feste Regionen), sonst wird jede Karte doppelt gelesen. -->
<div class="toast-ort">
  <RLauft />
  <!-- Stufe 9: der einmalige Hinweis auf Strg+K erscheint nicht mehr von selbst - das Suchfeld im Kopf trägt das Kürzel und den Satz im Tipp. Der Baustein bleibt für alte Einstellungen (`strgKGesehen`). -->
  {#if hinweis.offen}
    <div class="toast hinweis-datei" style="flex-wrap:wrap"><span>{textDateiHinweis()}</span>
      <button class="k" type="button" onclick={hinweisSpeichern}>{L('Jetzt speichern', 'Save now')}</button>
      <button class="k" type="button" onclick={nichtMehrErinnern}>{L('Nicht mehr erinnern', "Don't remind me")}</button>
      <button class="k nur-symbol" type="button" aria-label={L('Hinweis schließen', 'Dismiss')} onclick={schliesseHinweis}><Icon n="x" /></button></div>
  {/if}
  {#if spendenHinweis.offen}
    <div class="toast" role="group" aria-label={L('Unterstützen', 'Support')} style="flex-wrap:wrap"><span style="flex-basis:18em">{d(`Du hast Statable jetzt rund ${spendenHinweis.stunden} Stunden benutzt. Statable ist und bleibt kostenlos und werbefrei. Wenn es dir nützt, ist eine kleine Spende willkommen.`, `Sie haben Statable jetzt rund ${spendenHinweis.stunden} Stunden benutzt. Statable ist und bleibt kostenlos und werbefrei. Wenn es Ihnen nützt, ist eine kleine Spende willkommen.`, `You have now used Statable for about ${spendenHinweis.stunden} hours. Statable is and stays free and without adverts. If it is useful to you, a small donation is welcome.`)}</span>
      <a class="k" href="#unterstuetzen" onclick={schliesseSpendenHinweis}>{L('Unterstützen', 'Support')}</a>
      <button class="k" type="button" onclick={schliesseSpendenHinweis}>{L('Nicht jetzt', 'Not now')}</button>
      <button class="k nur-symbol" type="button" aria-label={L('Hinweis schließen', 'Dismiss')} onclick={schliesseSpendenHinweis}><Icon n="x" /></button></div>
  {/if}
  {#if zweiterTab}
    <div class="toast"><span>{textZweiterTab()}</span><button class="k nur-symbol" type="button" aria-label={L('Hinweis schließen', 'Dismiss')} onclick={() => (zweiterTab = false)}><Icon n="x" /></button></div>
  {/if}
  {#if s.konflikt}
    <div class="toast" style="flex-wrap:wrap"><span style="flex-basis:14em">{textKonflikt()}</span>
      <button class="k" type="button" data-tipp={L('Lädt den gespeicherten Stand. Was in diesem Tab noch nicht gespeichert ist, geht verloren.', 'Loads the saved version. Anything in this tab that is not saved yet is lost.')} onclick={() => void konfliktNeuLaden()}>{L('Neu laden', 'Reload')}</button>
      <button class="k" type="button" data-tipp={L('Behält den Stand dieses Tabs und überschreibt den aus dem anderen Tab.', 'Keeps this tab and overwrites the version from the other tab.')} onclick={konfliktHierWeiter}>{L('Hier weiterarbeiten (überschreibt)', 'Keep working here (overwrites)')}</button></div>
  {/if}
  {#each s.meldungen as m (m.id)}
    <div class="toast" role="group" aria-label={L('Meldung', 'Message')} onmouseenter={() => haltMeldung(m.id, true)} onmouseleave={() => haltMeldung(m.id, false)} onfocusin={() => haltMeldung(m.id, true)} onfocusout={() => haltMeldung(m.id, false)}><span>{m.text}{#if m.hinweis} <span class="nur-vorleser">{m.hinweis}</span>{/if}</span>{#if m.rueck}<button class="k" type="button" onclick={() => { schliesseMeldung(m.id); rueckgaengig(); }}>{L('Rückgängig', 'Undo')}</button>{/if}<button class="k nur-symbol" type="button" aria-label={L('Meldung schließen', 'Dismiss message')} onclick={() => schliesseMeldung(m.id)}><Icon n="x" /></button></div>
  {/each}
</div>
