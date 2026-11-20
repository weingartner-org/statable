<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { untrack } from 'svelte';
  import { s, L, Lp, d, setzeZusatz, aktuelleSprache } from '../lib/sitzung.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import KarteBild from '../bausteine/KarteBild.svelte';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { Laedt } from '../lib/laedt.svelte';
  import { OFFLINE } from '../lib/offline';
  import { dateiname } from '../lib/dateiname';
  import { speichereSvg, speicherePng } from '../lib/bild';
  import { spaltenOption } from '../lib/datenassistentsaetze';
  import {
    geoLesen, giscoLaden, karteZuordnen, grenzenQuelleText, karteGrenzenHinweise, landNamenSatz, eigenschaftVorschlag, klassenBilden, projiziere, karteModell, karteTabelle, karteCsv, zahlText, keinWertText, karteWarnungen, zuordnungSaetze, klassenSatz, keineWerteSatz, geoFehlerSatz, geoGeladenSatz,
    giscoBedingungSatz, giscoBestaetigungText, giscoDatenschutzSatz, giscoSpeicherSatz, KARTE_MAX_BYTES, KARTE_MAX_TABELLE, KLASSEN_MIN, KLASSEN_MAX, KLASSEN_STANDARD,
    type GeoDaten, type Gebiet, type KarteQuelle, type KlassenArt
  } from '../lib/karte';
  import { KARTE_SPEICHER_MAX, type KarteStand } from '../lib/zusatz';
  import { staatenZuordnen, staatenSpalteVorschlag, staatAnzeige, regionName, staatenSchluessel, type KartenEintrag, type KartenIndex } from '../lib/weltkarte';
  import { kartenIndex, weltLaden, landLaden, type GrenzenGeladen } from '../lib/kartenladen';
  import { atLaden, atGrenzenText, atKennzahlSaetze, atStandSatz, type AtIndex, type AtStufe } from '../lib/atgrenzen';

  /**
   * Die Seite „Karte“ (#karte): eine Flächenkarte der Staaten der Welt oder eines Landes (Grenzen vom eigenen Server), aus GeoJSON, das die Person öffnet, oder aus Grenzen, die sie von Eurostat laden lässt (nur auf Klick, nach Bestätigung der Bedingungen).
   * Grenzen von Eurostat liefert Statable nicht mit. Neben der Karte steht immer die Tabelle mit denselben Werten. Alle Texte aus der Datei kommen nur als Textknoten in die Anzeige.
   */
  const codeSp = $derived(s.spalten.filter(c => c.art !== 'datum'));
  const zahlSp = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let geo = $state.raw<GeoDaten | null>(null), quelle = $state<KarteQuelle | null>(null), geoText = $state.raw<string | null>(null);
  /** Verzeichniseintrag der Grenzen von diesem Server (Welt, Land): Quelle, Lizenz, Stand */
  let eintrag = $state.raw<KartenEintrag | null>(null), kIndex = $state.raw<KartenIndex | null>(null);
  let landWahl = $state(''), landSuche = $state('');
  /** Bezirke und Gemeinden Österreichs (BEV): Verzeichnis der geladenen Datei */
  let atInfo = $state.raw<AtIndex | null>(null);
  let gebietSpalte = $state(''), wertSpalte = $state(''), eigenschaft = $state(''), beschriftung = $state('');
  let klassenArt = $state<KlassenArt>('quantil'), klassenZahl = $state(KLASSEN_STANDARD);
  let bestaetigt = $state(false), ebene = $state(2), land = $state('AT');
  let fehler = $state(''), meldung = $state(''), nichtGespeichert = $state(false);
  let dateiEingabe = $state<HTMLInputElement>();
  let svgEl = $state<SVGSVGElement>();
  const lad = new Laedt(), laden = new Laedt(), liste = new Laedt(), eigen = new Laedt();
  let abbruch: AbortController | null = null;

  const sprachen = $derived([...new Set(['de', 'en', aktuelleSprache() as string])]);
  const istWelt = $derived(quelle?.art === 'welt');

  /* ---- zuletzt gespeicherte Karte wieder öffnen (einmal); ohne gespeicherte Karte öffnet sich die Welt ---- */
  let wiederhergestellt = false;
  $effect(() => {
    if (wiederhergestellt) return;
    wiederhergestellt = true;
    void indexHolen();
    const k = untrack(() => s.zusatz.karte);
    if (!k) { void weltOeffnen(); return; }
    untrack(() => {
      quelle = { ...k.quelle };
      if (k.quelle.art === 'welt' || k.quelle.art === 'land') { /* die Grenzen liegen auf dem eigenen Server und werden wieder geholt */ }
      else if (k.geo) { const r = geoLesen(k.geo); if (r.ok) { geo = r.daten; geoText = k.geo; } }
      else nichtGespeichert = true;
      if (s.spalten.some(c => c.name === k.gebietSpalte)) gebietSpalte = k.gebietSpalte;
      if (s.spalten.some(c => c.name === k.wertSpalte)) wertSpalte = k.wertSpalte;
      eigenschaft = k.eigenschaft; beschriftung = k.beschriftung; klassenArt = k.klassenArt; klassenZahl = k.klassen;
    });
    if (k.quelle.art === 'welt') void weltOeffnen(true);
    else if (k.quelle.art === 'land' && k.quelle.iso3) { landWahl = k.quelle.iso3; void landOeffnen(k.quelle.iso3, true); }
    else if (k.quelle.art === 'at' && k.quelle.stufe) void atOeffnen(k.quelle.stufe, true);
  });
  function sichern() {
    if (!quelle) return;
    const q = $state.snapshot(quelle) as KarteQuelle;
    const eigeneDatei = q.art === 'datei' || q.art === 'gisco';
    // Am Projekt hängt bei Welt und Land nur die Art und der ISO3-Code, nie die Umrisse
    const stand: KarteStand = { quelle: q, geo: eigeneDatei && geoText !== null && geoText.length <= KARTE_SPEICHER_MAX ? geoText : null, gebietSpalte, wertSpalte, eigenschaft, beschriftung, klassenArt, klassen: klassenZahl };
    void setzeZusatz({ karte: stand });
  }
  function vorschlagen() {
    if (!geo) return;
    if (quelle?.art === 'welt') {
      eigenschaft = 'iso3'; beschriftung = 'anzeige';
      if (!gebietSpalte) {
        const v = staatenSpalteVorschlag(geo.gebiete, codeSp.map(c => { const i = s.spalten.indexOf(c); return { name: c.name, werte: s.zeilen.map(z => z[i] ?? null) }; }), sprachen);
        if (v) gebietSpalte = v;
      }
      return;
    }
    const i = s.spalten.findIndex(c => c.name === gebietSpalte);
    const v = i >= 0 ? eigenschaftVorschlag(geo.gebiete, geo.eigenschaften, s.zeilen.map(z => z[i] ?? null)) : null;
    if (v) eigenschaft = v; else if (!geo.eigenschaften.includes(eigenschaft)) eigenschaft = geo.eigenschaften[0] ?? '';
    if (!geo.eigenschaften.includes(beschriftung)) beschriftung = geo.eigenschaften.find(e => /name/i.test(e)) ?? eigenschaft;
  }
  function uebernehmen(daten: GeoDaten, q: KarteQuelle, text: string | null) {
    geo = daten; quelle = q; geoText = text; nichtGespeichert = text === null; eintrag = null;
    if (!geo.eigenschaften.includes(eigenschaft)) eigenschaft = '';
    vorschlagen(); sichern();
    meldung = geoGeladenSatz(daten.gebiete.length, daten.ohneFlaeche);
  }

  /* ---- Grenzen vom eigenen Server: Welt und Land ---- */
  async function indexHolen() {
    await liste.mit(async () => {
      const r = await kartenIndex();
      if (r.ok) kIndex = r.wert; else fehler = geoFehlerSatz(r.fehler);
    });
  }
  function serverGrenzen(g: GrenzenGeladen, q: KarteQuelle, wieder: boolean) {
    geo = g.daten; eintrag = g.eintrag; quelle = q; geoText = null; nichtGespeichert = false;
    if (wieder) { if (q.art === 'land' && !geo.eigenschaften.includes(eigenschaft)) vorschlagen(); return; }
    eigenschaft = q.art === 'welt' ? 'iso3' : geo.eigenschaften.includes(eigenschaft) ? eigenschaft : '';
    vorschlagen(); sichern();
    meldung = geoGeladenSatz(g.daten.gebiete.length, g.daten.ohneFlaeche);
  }
  async function weltOeffnen(wieder = false) {
    if (!wieder) { fehler = ''; meldung = ''; }
    await eigen.mit(async () => {
      const r = await weltLaden();
      if (!r.ok) { fehler = geoFehlerSatz(r.fehler); return; }
      serverGrenzen(r.wert, { art: 'welt', name: 'Natural Earth' }, wieder);
    });
  }
  async function landOeffnen(iso3: string, wieder = false) {
    if (!wieder) { fehler = ''; meldung = ''; }
    await eigen.mit(async () => {
      const r = await landLaden(iso3);
      if (!r.ok) { fehler = geoFehlerSatz(r.fehler); return; }
      serverGrenzen(r.wert, { art: 'land', name: landName(r.wert.eintrag), iso3 }, wieder);
    });
  }
  async function atOeffnen(stufe: AtStufe, wieder = false) {
    if (!wieder) { fehler = ''; meldung = ''; }
    await eigen.mit(async () => {
      const r = await atLaden(stufe);
      if (!r.ok) { fehler = geoFehlerSatz(r.fehler); return; }
      const name = stufe === 'bezirke' ? L('Bezirke Österreichs', 'Districts of Austria') : L('Gemeinden Österreichs', 'Municipalities of Austria');
      geo = r.wert.daten; atInfo = r.wert.index; eintrag = null; quelle = { art: 'at', name, stufe }; geoText = null; nichtGespeichert = false;
      if (wieder) { if (!geo.eigenschaften.includes(eigenschaft)) vorschlagen(); return; }
      eigenschaft = geo.eigenschaften.includes(eigenschaft) ? eigenschaft : '';
      vorschlagen(); sichern();
      meldung = geoGeladenSatz(geo.gebiete.length, geo.ohneFlaeche);
    });
  }
  const landName = (e: KartenEintrag): string => regionName(e.iso2 ?? '', aktuelleSprache()) || e.name || e.iso3;
  const kb = (b: number) => `${zahlText(Math.max(1, Math.round(b / 1024)))} KB`;
  const laender = $derived.by(() => {
    const koll = new Intl.Collator(aktuelleSprache());
    return kIndex ? Object.values(kIndex.laender).map(e => ({ e, name: landName(e) })).sort((a, b) => koll.compare(a.name, b.name)) : [];
  });
  const gefundeneLaender = $derived.by(() => {
    const q = staatenSchluessel(landSuche);
    return q ? laender.filter(l => staatenSchluessel(l.name).includes(q) || staatenSchluessel(l.e.name ?? '').includes(q) || l.e.iso3.toLowerCase() === q) : laender;
  });
  const landGewaehlt = $derived(gefundeneLaender.find(l => l.e.iso3 === landWahl) ?? null);

  /* ---- Grenzen öffnen ---- */
  async function dateiWaehlen(ev: Event) {
    const el = ev.currentTarget as HTMLInputElement, f = el.files?.[0]; el.value = '';
    if (!f) return;
    fehler = ''; meldung = '';
    if (f.size > KARTE_MAX_BYTES) { fehler = geoFehlerSatz('zu-gross'); return; }
    await lad.mit(async () => {
      const text = await f.text();
      const r = geoLesen(text);
      if (!r.ok) { fehler = geoFehlerSatz(r.fehler); return; }
      uebernehmen(r.daten, { art: 'datei', name: f.name.slice(0, 120) }, text.length <= KARTE_SPEICHER_MAX ? text : null);
    });
  }
  async function giscoHolen() {
    if (!bestaetigt || OFFLINE) return;
    fehler = ''; meldung = '';
    abbruch = new AbortController();
    await laden.mit(async () => {
      const r = await giscoLaden(ebene, land.trim(), { signal: abbruch!.signal });
      if (!r.ok) { fehler = geoFehlerSatz(r.fehler); return; }
      uebernehmen(r.daten, { art: 'gisco', name: `NUTS_RG_60M_2024_4326_LEVL_${ebene}`, ebene, land: land.trim() }, r.text);
    });
  }

  /* ---- Rechnen ---- */
  const gi = $derived(s.spalten.findIndex(c => c.name === gebietSpalte)), wi = $derived(s.spalten.findIndex(c => c.name === wertSpalte));
  const codes = $derived(gi >= 0 ? s.zeilen.map(z => z[gi] ?? null) : null);
  const werte = $derived.by((): (number | null)[] | null => {
    if (wi < 0) return null;
    const c = s.spalten[wi]!;
    return s.zeilen.map(z => { const v = z[wi]; return typeof v === 'number' && Number.isFinite(v) && !istFehlend(c, v) ? v : null; });
  });
  /** Bei der Welt: Name in der Sprache der App (Intl, sonst Natural Earth) als Eigenschaft „anzeige“ */
  const gebiete = $derived<Gebiet[]>(geo ? (istWelt ? geo.gebiete.map(g => ({ eig: new Map([...g.eig, ['anzeige', staatAnzeige(g, aktuelleSprache())]]), flaechen: g.flaechen })) : geo.gebiete) : []);
  const rahmen = $derived(geo ? projiziere(geo.gebiete, 560, 520, 8, istWelt ? 0 : undefined) : null);
  const zuo = $derived(geo && codes && werte && eigenschaft ? (istWelt ? staatenZuordnen(gebiete, codes, werte, sprachen) : karteZuordnen(gebiete, eigenschaft, codes, werte, beschriftung)) : null);
  const klassen = $derived(zuo ? klassenBilden(zuo.werte.filter((v): v is number => v !== null), klassenArt, klassenZahl) : null);
  const modell = $derived(geo && rahmen && zuo && quelle ? karteModell({ gebiete, rahmen, zuordnung: zuo, klassen, wertName: wertSpalte, gebietName: eigenschaft, beschriftung, quelle, grenzenText: eintrag && (quelle.art === 'welt' || quelle.art === 'land') ? grenzenQuelleText(eintrag) : quelle.art === 'at' && atInfo && quelle.stufe ? atGrenzenText(atInfo, quelle.stufe) : undefined }) : null);
  const tabelle = $derived(geo && zuo ? karteTabelle(gebiete, zuo, klassen, beschriftung, eigenschaft) : []);
  /** Weltkarte: zuerst die Staaten mit Wert (nach Namen), die ohne Wert nur als Zahl mit aufklappbarer Liste */
  const tabMit = $derived(istWelt ? tabelle.filter(r => r.wert !== null).sort((a, b) => a.name.localeCompare(b.name, aktuelleSprache())) : tabelle);
  const tabOhne = $derived(istWelt ? tabelle.filter(r => r.wert === null) : []);
  const saetze = $derived(zuo && geo ? [...zuordnungSaetze(zuo, gebiete.length, istWelt), ...(quelle?.art === 'land' ? [landNamenSatz()] : []), ...(quelle?.art === 'at' && atInfo && quelle.stufe ? [...atKennzahlSaetze(quelle.stufe, atInfo), atStandSatz()] : []), ...(klassen ? [klassenSatz(klassen)].filter(Boolean) : []), ...(zuo.zugeordnet === 0 ? [keineWerteSatz()] : [])] : []);

  const bildTitel = $derived(modell?.titel ?? L('Karte', 'Map'));
  const bildSpeichern = (fn: typeof speichereSvg) => { if (svgEl) void fn(svgEl, `${s.projekt?.name ?? ''} ${bildTitel}`.trim()); };

  function csvSpeichern() {
    if (!modell || !geo) return;
    const url = URL.createObjectURL(new Blob([karteCsv(tabelle, modell.vermerk)], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${dateiname(s.projekt?.name ?? '')} - ${L('Kartenwerte', 'Map values')}.csv` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const statusText = (st: string) => (st === 'wert' ? '' : st === 'kein-wert' ? L('Code da, Wert fehlt', 'code present, value missing') : st === 'mehrfach' ? L('Code mehrfach in den Daten', 'code occurs several times in the data') : L('kein Code in den Daten', 'no code in the data'));
  const klassenOptionen = Array.from({ length: KLASSEN_MAX - KLASSEN_MIN + 1 }, (_, i) => KLASSEN_MIN + i);
</script>

<div class="tisch breit"><section class="blatt rund karte-seite" aria-labelledby="karte-t">
  <SeitenKopf titelId="karte-t" titel={L('Karte', 'Map')} hilfe={{ id: 'karte', text: L('Hilfe zur Karte', 'Help on the map') }} zurueck="daten" >
    {#snippet untertitel()}<p>{d('Eine Zahl je Gebiet auf einer Karte zeigen, zum Beispiel eine Rate je Land oder Region. Die Grenzen aller Staaten und der obersten Gliederung der meisten Länder bringt Statable mit. Für Europa nach NUTS lädst du die Grenzen von Eurostat, oder du öffnest eine eigene GeoJSON-Datei. Neben der Karte steht immer die Tabelle mit denselben Werten.', 'Eine Zahl je Gebiet auf einer Karte zeigen, zum Beispiel eine Rate je Land oder Region. Die Grenzen aller Staaten und der obersten Gliederung der meisten Länder bringt Statable mit. Für Europa nach NUTS laden Sie die Grenzen von Eurostat, oder Sie öffnen eine eigene GeoJSON-Datei. Neben der Karte steht immer die Tabelle mit denselben Werten.', 'Show one number per area on a map, for example a rate per country or region. Statable includes the boundaries of all countries and of the top-level division of most countries. For Europe by NUTS you load the boundaries from Eurostat, or you open your own GeoJSON file. Next to the map there is always the table with the same values.')}</p>{/snippet}
  </SeitenKopf>

  <h2>{L('1. Grenzen', '1. Boundaries')}</h2>
  <div class="karte-grenzen">
    <div class="karte-box">
      <h3>{L('Die ganze Welt (Staaten)', 'The whole world (countries)')}</h3>
      <p class="hilfe">{L('Eine Karte aller Staaten. Die Spalte der Daten enthält Länderkürzel (zum Beispiel AT oder AUT) oder Ländernamen.', 'A map of all countries. The column of the data contains country codes (for example AT or AUT) or country names.')}</p>
      <div class="knopfzeile"><button class="k" type="button" onclick={() => weltOeffnen()} disabled={eigen.aktiv}><Icon n="ordner" />{L('Weltkarte öffnen', 'Open world map')}</button></div>
      {#if eigen.sichtbar}<p role="status"><Rechnet text={L('Statable lädt die Grenzen …', 'Statable is loading the boundaries …')} /></p>{/if}
    </div>
    <div class="karte-box">
      <h3>{L('Ein Land (Provinzen)', 'One country (provinces)')}</h3>
      <p class="hilfe">{L('Die oberste Gliederung eines Landes, zum Beispiel Provinzen oder Bundesländer. Geladen wird nur das gewählte Land; hinter dem Namen stehen die Zahl der Gebiete und die Größe der Datei.', 'The top-level division of one country, for example provinces or states. Only the chosen country is loaded; the number of areas and the size of the file follow the name.')}</p>
      {#if liste.sichtbar}<p role="status"><Rechnet text={L('Statable lädt die Liste der Länder …', 'Statable is loading the list of countries …')} /></p>{/if}
      {#if kIndex}
        <div class="karte-feld"><label for="k-lsuche">{L('Land suchen', 'Search for a country')}</label><input id="k-lsuche" type="search" autocomplete="off" bind:value={landSuche}></div>
        <p class="hilfe" use:ergebnisAnsage>{Lp(gefundeneLaender.length, `${gefundeneLaender.length} Land gefunden.`, `${gefundeneLaender.length} Länder gefunden.`, `${gefundeneLaender.length} country found.`, `${gefundeneLaender.length} countries found.`)}</p>
        <div class="karte-feld"><label for="k-land-liste">{L('Land', 'Country')}</label>
          <select id="k-land-liste" size="6" bind:value={landWahl} ondblclick={() => landGewaehlt && landOeffnen(landGewaehlt.e.iso3)}>{#each gefundeneLaender as l (l.e.iso3)}<option value={l.e.iso3}>{l.name} - {Lp(l.e.gebiete, `${l.e.gebiete} Gebiet`, `${l.e.gebiete} Gebiete`, `${l.e.gebiete} area`, `${l.e.gebiete} areas`)}, {kb(l.e.bytes)}</option>{/each}</select></div>
        <div class="knopfzeile"><button class="k" type="button" onclick={() => landGewaehlt && landOeffnen(landGewaehlt.e.iso3)} disabled={!landGewaehlt || eigen.aktiv}><Icon n="ordner" />{L('Land öffnen', 'Open country')}</button></div>
      {/if}
    </div>
    <div class="karte-box">
      <h3>{L('Österreich: Bezirke und Gemeinden', 'Austria: districts and municipalities')}</h3>
      <p class="hilfe">{d('Die 94 politischen Bezirke oder die 2.092 Gemeinden Österreichs (Stichtag 01.04.2026, Bundesamt für Eich- und Vermessungswesen, CC BY 4.0). Die Daten brauchen die Bezirkskennzahl (zum Beispiel 101) oder die Gemeindekennzahl (zum Beispiel 10101). Geladen wird nur, was du wählst.', 'Die 94 politischen Bezirke oder die 2.092 Gemeinden Österreichs (Stichtag 01.04.2026, Bundesamt für Eich- und Vermessungswesen, CC BY 4.0). Die Daten brauchen die Bezirkskennzahl (zum Beispiel 101) oder die Gemeindekennzahl (zum Beispiel 10101). Geladen wird nur, was Sie wählen.', 'The 94 political districts or the 2,092 municipalities of Austria (as of 1 April 2026, Federal Office of Metrology and Surveying, CC BY 4.0). The data need the district code (for example 101) or the municipality code (for example 10101). Only what you choose is loaded.')}</p>
      <div class="knopfzeile"><button class="k" type="button" onclick={() => atOeffnen('bezirke')} disabled={eigen.aktiv}><Icon n="ordner" />{L('Bezirke öffnen (94)', 'Open districts (94)')}</button>
        <button class="k" type="button" onclick={() => atOeffnen('gemeinden')} disabled={eigen.aktiv}><Icon n="ordner" />{L('Gemeinden öffnen (2.092)', 'Open municipalities (2,092)')}</button></div>
    </div>
    <div class="karte-box">
      <h3>{L('Eigene GeoJSON-Datei', 'Your own GeoJSON file')}</h3>
      <p class="hilfe">{L('Flächen als Polygon oder MultiPolygon in Längen- und Breitengraden (WGS 84), höchstens 20 MB. Texte aus der Datei werden nur als Text angezeigt.', 'Areas as Polygon or MultiPolygon in degrees of longitude and latitude (WGS 84), at most 20 MB. Texts from the file are shown only as text.')}</p>
      <div class="knopfzeile"><button class="k" type="button" onclick={() => dateiEingabe?.click()} disabled={lad.aktiv}><Icon n="ordner" />{L('GeoJSON-Datei öffnen', 'Open GeoJSON file')}</button>
        <input bind:this={dateiEingabe} type="file" accept=".geojson,.json,application/geo+json,application/json" hidden onchange={dateiWaehlen}></div>
      {#if lad.sichtbar}<p role="status"><Rechnet text={L('Statable liest die Datei …', 'Statable is reading the file …')} /></p>{/if}
    </div>
    {#if !OFFLINE}
      <div class="karte-box">
        <h3>{L('Grenzen von Eurostat laden', 'Load boundaries from Eurostat')}</h3>
        <p>{giscoBedingungSatz()}</p>
        <p class="hilfe">{giscoDatenschutzSatz()} {giscoSpeicherSatz()}</p>
        <div class="as-felder">
          <div class="karte-feld"><label for="k-ebene">{L('NUTS-Ebene', 'NUTS level')}</label>
            <select id="k-ebene" bind:value={ebene}><option value={0}>{L('0: Staaten', '0: countries')}</option><option value={1}>{L('1: Gruppen von Bundesländern', '1: groups of states')}</option><option value={2}>{L('2: Bundesländer', '2: states')}</option><option value={3}>{L('3: kleinere Regionen', '3: smaller regions')}</option></select></div>
          <div class="karte-feld"><label for="k-land">{L('Land (zwei Großbuchstaben)', 'Country (two capital letters)')}</label><input id="k-land" class="karte-schmal" type="text" maxlength="2" autocomplete="off" bind:value={land}></div>
        </div>
        <label class="karte-bestaetigung"><input type="checkbox" bind:checked={bestaetigt}><span>{giscoBestaetigungText()}</span></label>
        <div class="knopfzeile"><button class="k" type="button" onclick={giscoHolen} disabled={!bestaetigt || laden.aktiv}><Icon n="download" />{L('Grenzen von Eurostat laden', 'Load boundaries from Eurostat')}</button>
          {#if laden.aktiv}<button class="k" type="button" onclick={() => abbruch?.abort()}>{L('Abbrechen', 'Cancel')}</button>{/if}</div>
        {#if laden.sichtbar}<p role="status"><Rechnet text={L('Statable lädt die Grenzen …', 'Statable is loading the boundaries …')} /></p>{/if}
      </div>
    {/if}
  </div>
  {#if fehler}<p class="karte-fehler" role="alert">{fehler}</p>{/if}
  {#if meldung && geo}<p role="status">{meldung}</p>{/if}
  {#if nichtGespeichert && quelle}<p class="karte-hinweis" role="status">{L('Die Grenzen sind zu groß, um im Projekt gespeichert zu werden. Nach dem Schließen muss die Datei neu geöffnet werden.', 'The boundaries are too large to be stored in the project. After closing, the file has to be opened again.')}</p>{/if}

  {#if geo && quelle}
    <h2>{L('2. Werte zuordnen', '2. Assign values')}</h2>
    <div class="as-felder karte-wahl">
      <div class="karte-feld"><label for="k-gsp">{istWelt ? L('Spalte mit dem Land (Kürzel oder Name)', 'Column with the country (code or name)') : L('Spalte mit dem Gebietscode', 'Column with the area code')}</label>
        <select id="k-gsp" bind:value={gebietSpalte} onchange={() => { vorschlagen(); sichern(); }}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each codeSp as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      <div class="karte-feld"><label for="k-wsp">{L('Spalte mit dem Wert', 'Column with the value')}</label>
        <select id="k-wsp" bind:value={wertSpalte} onchange={sichern}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each zahlSp as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select></div>
      {#if !istWelt}<div class="karte-feld"><label for="k-eig">{L('Eigenschaft der Grenzen mit dem Code', 'Property of the boundaries with the code')}</label>
        <select id="k-eig" bind:value={eigenschaft} onchange={sichern}>{#each geo.eigenschaften as e}<option value={e}>{e}</option>{/each}</select></div>
      <div class="karte-feld"><label for="k-bes">{L('Eigenschaft für die Namen', 'Property for the names')}</label>
        <select id="k-bes" bind:value={beschriftung} onchange={sichern}>{#each geo.eigenschaften as e}<option value={e}>{e}</option>{/each}</select></div>{/if}
      <div class="karte-feld"><label for="k-art">{L('Einteilung in Klassen', 'Division into classes')}</label>
        <select id="k-art" bind:value={klassenArt} onchange={sichern}><option data-begriff="quantil" value="quantil">{L('Quantile (gleich viele Gebiete je Klasse)', 'Quantiles (equal number of areas per class)')}</option><option value="gleich">{L('gleich breite Klassen', 'classes of equal width')}</option></select></div>
      <div class="karte-feld"><label for="k-zahl">{L('Zahl der Klassen', 'Number of classes')}</label>
        <select id="k-zahl" bind:value={klassenZahl} onchange={sichern}>{#each klassenOptionen as n}<option value={n}>{n}</option>{/each}</select></div>
    </div>
  {/if}

  {#if modell && zuo && geo}
    <h2>{L('3. Karte und Tabelle', '3. Map and table')}</h2>
    <ul class="karte-saetze" aria-label={L('Zuordnung', 'Assignment')}>{#each saetze as t}<li><Icon n="hinweis" k="hw" /><span>{t}</span></li>{/each}</ul>
    <div class="karte-raster">
      <figure class="karte-bild">
        <KarteBild {modell} bind:svg={svgEl} />
        <figcaption class="karte-knoepfe">
          <button class="k" type="button" onclick={() => bildSpeichern(speichereSvg)}><Icon n="download" />{L('Bild (SVG)', 'Image (SVG)')}</button>
          <button class="k" type="button" onclick={() => bildSpeichern(speicherePng)}><Icon n="download" />{L('Bild (PNG)', 'Image (PNG)')}</button>
          <button class="k" type="button" onclick={csvSpeichern}><Icon n="download" />{L('Tabelle (CSV)', 'Table (CSV)')}</button>
        </figcaption>
      </figure>
      <div class="karte-tabelle">
        {#if tabMit.length > KARTE_MAX_TABELLE}<p class="hilfe">{Lp(KARTE_MAX_TABELLE, `Die Tabelle zeigt die ersten ${KARTE_MAX_TABELLE} Gebiet; die CSV-Datei enthält alle.`, `Die Tabelle zeigt die ersten ${KARTE_MAX_TABELLE} Gebiete; die CSV-Datei enthält alle.`, `The table shows the first ${KARTE_MAX_TABELLE} area; the CSV file contains all.`, `The table shows the first ${KARTE_MAX_TABELLE} areas; the CSV file contains all.`)}</p>{/if}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="karte-tabhuelle" role="region" tabindex="0" aria-label={L(`Tabelle zur Karte: ${wertSpalte}`, `Table for the map: ${wertSpalte}`)}>
          <table class="karte-tab"><caption>{L('Dieselben Werte wie auf der Karte. „kein Wert“ heißt: keine Zahl vorhanden, nicht 0.', 'The same values as on the map. "no value" means: no number available, not 0.')}</caption>
            <thead><tr><th scope="col">{L('Gebiet', 'Area')}</th><th scope="col">{L('Code', 'Code')}</th><th scope="col" class="zahl">{L('Wert', 'Value')}</th><th scope="col">{L('Klasse', 'Class')}</th><th scope="col">{L('Anmerkung', 'Note')}</th></tr></thead>
            <tbody>{#each tabMit.slice(0, KARTE_MAX_TABELLE) as r}<tr><th scope="row">{r.name}</th><td>{r.code}</td><td class="zahl">{r.wert === null ? keinWertText() : zahlText(r.wert)}</td><td>{r.klasse}</td><td>{statusText(r.status)}</td></tr>{/each}
              {#if tabOhne.length}<tr><td colspan="5"><details class="karte-ohne"><summary>{Lp(tabOhne.length, `${tabOhne.length} Gebiet ohne Wert`, `${tabOhne.length} Gebiete ohne Wert`, `${tabOhne.length} area without a value`, `${tabOhne.length} areas without a value`)}</summary>
                <ul>{#each tabOhne as r}<li>{r.name}{statusText(r.status) ? ` (${statusText(r.status)})` : ''}</li>{/each}</ul></details></td></tr>{/if}</tbody></table>
        </div>
      </div>
    </div>
    <h2>{L('Beim Lesen der Karte', 'When reading the map')}</h2>
    <ul class="karte-warnungen">{#each [...karteWarnungen(), ...karteGrenzenHinweise()] as w}<li><Icon n="hinweis" k="hw" /><span>{w}</span></li>{/each}</ul>
  {/if}
</section></div>

<style>
  .karte-seite { padding-bottom: var(--a6); }
  .karte-seite h2 { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin: var(--a5) 0 var(--a2); }
  .karte-seite h3 { font: 650 var(--gr-text)/1.3 var(--schrift-ui); margin: 0 0 var(--a2); }
  .karte-grenzen { display: grid; grid-template-columns: 1fr; gap: var(--a4); }
  :global(:root.weit-701) .karte-grenzen { grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr)); align-items: start; }
  .karte-box { border: 1px solid var(--linie); border-radius: var(--r); padding: var(--a3) var(--a4); background: var(--blatt); display: flex; flex-direction: column; gap: var(--a2); min-width: 0; }
  .karte-box p { max-width: var(--breite-text); }
  .karte-feld { display: flex; flex-direction: column; gap: var(--a1); min-width: 0; }
  .karte-feld label { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
  .karte-feld select, .karte-feld input[type='text'] { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: 0 var(--a2); }
  .karte-feld select:focus-visible, .karte-feld input:focus-visible { border-color: var(--fokus); box-shadow: var(--fokus-ring); }
  .karte-schmal { max-width: 6rem; text-transform: uppercase; }
  .karte-bestaetigung { display: flex; gap: var(--a2); align-items: flex-start; cursor: pointer; }
  .karte-bestaetigung input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 3px 0 0; flex: none; }
  .as-felder { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: var(--a3) var(--a4); }
  .karte-fehler { color: var(--verlust); max-width: var(--breite-text); }
  .karte-hinweis { max-width: var(--breite-text); }
  .karte-saetze, .karte-warnungen { list-style: none; padding: 0; margin: 0 0 var(--a3); display: flex; flex-direction: column; gap: var(--a2); max-width: var(--breite-text); }
  .karte-saetze li, .karte-warnungen li { display: flex; gap: var(--a2); align-items: flex-start; }
  .karte-saetze :global(.ico), .karte-warnungen :global(.ico) { flex: none; margin-top: 3px; }
  .karte-raster { display: grid; grid-template-columns: 1fr; gap: var(--a4); align-items: start; }
  :global(:root.weit-1400) .karte-raster { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .karte-bild { margin: 0; min-width: 0; }
  .karte-knoepfe { display: flex; flex-wrap: wrap; gap: var(--a2); margin-top: var(--a2); }
  .karte-tabelle { min-width: 0; }
  .karte-tabhuelle { overflow: auto; max-height: 36rem; border: 1px solid var(--linie); border-radius: var(--r-klein); background: var(--blatt); }
  .karte-tabhuelle:focus-visible { box-shadow: var(--fokus-ring); }
  .karte-tab { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  .karte-tab caption { text-align: start; padding: var(--a2) var(--a3); color: var(--tinte-2); font-size: var(--gr-klein); }
  .karte-tab th, .karte-tab td { padding: var(--a1) var(--a3); text-align: start; border-bottom: 1px solid var(--linie); }
  .karte-tab thead th { position: sticky; top: 0; background: var(--blatt-2); font-size: var(--gr-klein); color: var(--tinte-2); }
  .karte-tab tbody th { font-weight: 500; }
  .karte-tab .zahl { text-align: right; }
  .karte-ohne summary { cursor: pointer; min-height: var(--ziel); display: flex; align-items: center; }
  .karte-ohne summary:focus-visible { box-shadow: var(--fokus-ring); }
  .karte-ohne ul { margin: 0 0 var(--a2); padding-inline-start: var(--a5); }
  .karte-feld input[type='search'] { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: 0 var(--a2); }
  .karte-feld input[type='search']:focus-visible, .karte-feld select:focus-visible { border-color: var(--fokus); box-shadow: var(--fokus-ring); }
</style>
