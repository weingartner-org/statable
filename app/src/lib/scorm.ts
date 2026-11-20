/**
 * V4 (14.11.2026): Lernpfad als SCORM-1.2-Paket für Moodle und andere Lernplattformen.
 *
 * Das Paket enthält keine Lerninhalte, sondern eine kleine Startseite (`index.html`) und das Manifest (`imsmanifest.xml`).
 * Die Startseite meldet sich bei der Lernplattform an (SCORM-API `API`), öffnet Statable mit dem Teilen-Link des Pfads
 * in einem eigenen Fenster und setzt „abgeschlossen“ (`cmi.core.lesson_status = completed`), sobald Statable meldet,
 * dass alle Fragen des Abschlusstests oder Übungsblatts beantwortet sind (`postMessage` aus `lib/lms.ts`).
 * Ein eigenes Fenster statt eines eingebetteten Rahmens, weil statable.eu `frame-ancestors 'self'` sendet.
 * Keine Punkte, keine Note (Plan V3/V4): gemeldet wird nur der Stand und die Zeit.
 * Fremder Text (Pfadname) kommt nur maskiert ins XML/HTML und als JSON-Wert mit maskiertem `<` ins Skript.
 */
import { strToU8, zipSync } from 'fflate';

/** Feste Kennung der Meldung von Statable an die Startseite. */
export const LMS_ART = 'statable-lms';
export const LMS_FASSUNG = 1;

export interface ScormTexte {
  /** `lang`-Attribut der Startseite (`de`, `en`, …). */
  sprache: string;
  einleitung: string;
  knopf: string;
  hinweisFenster: string;
  ohneLms: string;
  verbunden: string;
  fertig: string;
  schonFertig: string;
  blockiert: string;
  linkText: string;
}

export interface ScormEingabe {
  /** Name des Pfads (fremder Text, wird maskiert). */
  titel: string;
  /** Teilen-Link mit `?lms=scorm` (aus `scormLink`). */
  link: string;
  /** Kennung für das Manifest, nur Buchstaben, Ziffern, Bindestrich. */
  kennung: string;
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const html = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** JSON-Wert, der in einem `<script>` stehen darf (kein `</script>`, keine Zeilentrenner U+2028/2029). */
export const jsWert = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/** Steuerzeichen und Richtungszeichen weg, höchstens 200 Zeichen (Moodle zeigt den Titel als Namen der Aktivität). */
export const saubererTitel = (s: string) => s.replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) || 'Statable';

export const saubereKennung = (s: string) => (s.replace(/[^A-Za-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'pfad');

/** Hängt `lms=scorm` an die Abfrage vor dem `#` an (andere Angaben wie `sprache` bleiben). */
export function scormLink(link: string): string {
  const u = new URL(link);
  u.searchParams.set('lms', 'scorm');
  return u.toString();
}

export function manifest(e: ScormEingabe): string {
  const id = saubereKennung(e.kennung), t = xml(saubererTitel(e.titel));
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="statable-${id}" version="1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org-${id}">
    <organization identifier="org-${id}">
      <title>${t}</title>
      <item identifier="item-${id}" identifierref="res-${id}" isvisible="true">
        <title>${t}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res-${id}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
`;
}

/** Die Startseite: eigenständig, ohne fremde Dateien, Skript nur inline. */
export function startseite(e: ScormEingabe, t: ScormTexte): string {
  const titel = saubererTitel(e.titel);
  const ursprung = new URL(e.link).origin;
  const daten = { link: e.link, ursprung, art: LMS_ART, fassung: LMS_FASSUNG, t: { ohneLms: t.ohneLms, verbunden: t.verbunden, fertig: t.fertig, schonFertig: t.schonFertig, blockiert: t.blockiert } };
  return `<!doctype html>
<html lang="${html(t.sprache)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${html(titel)}</title>
<style>
:root { color-scheme: light dark; --text: #1d2a2c; --grund: #ffffff; --haupt: #0b5f66; --leise: #4a5a5c; }
@media (prefers-color-scheme: dark) { :root { --text: #e8efef; --grund: #142022; --haupt: #7fd0d6; --leise: #b5c4c5; } }
body { font-family: "Atkinson Hyperlegible", system-ui, sans-serif; color: var(--text); background: var(--grund); margin: 0; padding: 1.5rem 1rem; line-height: 1.5; }
main { max-width: 40rem; margin-inline: auto; }
h1 { font-size: 1.5rem; margin-block: 0 0.75rem; }
button { font: inherit; font-weight: 600; padding: 0.6rem 1.1rem; border-radius: 0.4rem; border: 2px solid var(--haupt); background: var(--haupt); color: var(--grund); cursor: pointer; }
button:focus-visible, a:focus-visible { outline: 3px solid var(--haupt); outline-offset: 3px; }
.leise { color: var(--leise); font-size: 0.95rem; }
#stand { font-weight: 600; min-height: 1.5em; }
a { color: var(--haupt); overflow-wrap: anywhere; }
</style>
</head>
<body>
<main>
<h1>${html(titel)}</h1>
<p>${html(t.einleitung)}</p>
<p><button type="button" id="oeffnen">${html(t.knopf)}</button></p>
<p id="stand" role="status" aria-live="polite"></p>
<p class="leise">${html(t.hinweisFenster)}</p>
<p class="leise">${html(t.linkText)} <a id="link" href="${html(e.link)}" rel="noreferrer">${html(e.link)}</a></p>
</main>
<script>
(function () {
  var D = ${jsWert(daten)};
  var stand = document.getElementById('stand');
  var api = null, fenster = null, beginn = Date.now(), fertig = false, beendet = false;
  function sage(s) { stand.textContent = s; }
  function suche(w) {
    for (var i = 0; w && i < 12; i++) {
      try { if (w.API) return w.API; } catch (e) { return null; }
      if (!w.parent || w.parent === w) break;
      w = w.parent;
    }
    return null;
  }
  try { api = suche(window) || (window.opener ? suche(window.opener) : null); } catch (e) { api = null; }
  function zeit() {
    var s = Math.max(0, Math.round((Date.now() - beginn) / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return z(h) + ':' + z(m) + ':' + z(r);
  }
  if (api && String(api.LMSInitialize('')) === 'true') {
    var st = String(api.LMSGetValue('cmi.core.lesson_status') || '');
    if (st === 'completed' || st === 'passed') { fertig = true; sage(D.t.schonFertig); }
    else { api.LMSSetValue('cmi.core.lesson_status', 'incomplete'); api.LMSCommit(''); sage(D.t.verbunden); }
  } else { api = null; sage(D.t.ohneLms); }
  document.getElementById('oeffnen').addEventListener('click', function () {
    fenster = window.open(D.link, 'statable');
    if (!fenster) sage(D.t.blockiert);
  });
  window.addEventListener('message', function (ev) {
    if (ev.origin !== D.ursprung || !fenster || ev.source !== fenster) return;
    var m = ev.data;
    if (!m || typeof m !== 'object' || m.art !== D.art || m.fassung !== D.fassung || m.status !== 'completed') return;
    if (fertig) return;
    fertig = true;
    if (api) { api.LMSSetValue('cmi.core.lesson_status', 'completed'); api.LMSCommit(''); }
    sage(D.t.fertig);
  });
  function ende() {
    if (!api || beendet) return;
    beendet = true;
    api.LMSSetValue('cmi.core.session_time', zeit());
    api.LMSCommit('');
    api.LMSFinish('');
  }
  window.addEventListener('pagehide', ende);
  window.addEventListener('beforeunload', ende);
})();
</script>
</body>
</html>
`;
}

/** Das ZIP: `imsmanifest.xml` und `index.html` im Wurzelordner (so verlangt es Moodle). */
export function baueScormPaket(e: ScormEingabe, t: ScormTexte): Uint8Array {
  return zipSync({ 'imsmanifest.xml': strToU8(manifest(e)), 'index.html': strToU8(startseite(e, t)) }, { level: 6 });
}

export const dateinameScorm = (titel: string) => `${saubererTitel(titel).replace(/[\\/:*?"<>|]/g, '-').slice(0, 80)} - SCORM.zip`;
