/**
 * Die Hilfe-Artikel als feste Webseiten für Suchmaschinen (24.10.2026): je Sprache und Artikel eine Seite `<sp>/hilfe/<id>/`,
 * je Sprache eine Übersicht `<sp>/hilfe/`, dazu `sitemap.xml`. Der Bau ruft `hilfeSeiten` auf (vite.config.ts, Plugin `statable-hilfeseiten`).
 * Die Seiten brauchen kein Skript (die CSP verbietet Skripte im HTML ohnehin); der Knopf führt in die App zum selben Artikel (`#hilfe/<id>`).
 * Alles hier ist reine Umwandlung: Artikel rein, HTML-Text raus. Texte aus den Artikeln werden immer maskiert.
 */
import { BEREICHE, type Artikel, type Block } from './kern';
import { P, paarText, SPRACHNAMEN, istRtl, type Sprache } from '../i18n/laufzeit';

export const ADRESSE = 'https://statable.eu/';
/** Lizenz der Hilfe-Texte (Johannes 24.10.2026): CC BY 4.0. Das Programm selbst steht unter der GPL. */
export const LIZENZ = 'https://creativecommons.org/licenses/by/4.0/';
const AUTOR = 'Johannes Weingartner';

/** Wörter der Seiten. Fast alle gibt es schon in der App (gleicher Text = gleiche Übersetzung). */
const W = {
  hilfe: P('Hilfe', 'Help'),
  inhalt: P('Inhalt der Hilfe', 'Help contents'),
  alle: P('Alle Hilfe-Themen', 'All help topics'),
  verwandt: P('Verwandt', 'Related'),
  sprache: P('Sprache', 'Language'),
  impressum: P('Impressum', 'Legal notice'),
  datenschutz: P('Datenschutz', 'Privacy')
};
/** „In Statable öffnen“ - neu für diese Seiten, darum hier je Sprache. */
const OEFFNEN: Record<string, string> = {
  de: 'In Statable öffnen', en: 'Open in Statable', fr: 'Ouvrir dans Statable', es: 'Abrir en Statable', it: 'Apri in Statable',
  pt: 'Abrir no Statable', nl: 'Openen in Statable', el: 'Άνοιγμα στο Statable', hu: 'Megnyitás a Statable-ben', sv: 'Öppna i Statable',
  pl: 'Otwórz w Statable', uk: 'Відкрити в Statable', ro: 'Deschide în Statable', cs: 'Otevřít ve Statable', bg: 'Отваряне в Statable'
};

export interface Eingabe {
  /** Freigegebene Sprachen in der Reihenfolge der Auswahl; die erste nach Deutsch und Englisch ist egal, `x-default` ist Englisch. */
  sprachen: Sprache[];
  artikel: Partial<Record<Sprache, Artikel[]>>;
  /** Unterzeile je Sprache („Statistik für Studium und Forschung“, wie der Ladebildschirm). */
  unterzeile: Partial<Record<Sprache, string>>;
  /** Pfade der Schriften im Bau (relativ zur Wurzel), Normal und Fett. */
  schrift: { normal: string; fett: string };
}
export interface Datei { pfad: string; inhalt: string }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');
/** Nur Zeichen, die in einem Pfad ohne Umschreiben gehen (die Ids sind heute schon so; ein Test hält das fest). */
export const istPfadId = (id: string) => /^[a-z0-9][a-z0-9-]*$/.test(id);
const artikelPfad = (sp: string, id: string) => `${sp}/hilfe/${id}/`;
const uebersichtPfad = (sp: string) => `${sp}/hilfe/`;

/** Erster Absatz als Beschreibung für die Trefferliste: höchstens rund 155 Zeichen, an einer Wortgrenze gekürzt. */
export function beschreibung(a: Artikel): string {
  const ersterText = a.inhalt.find((b): b is string => typeof b === 'string') ?? a.titel;
  const t = ersterText.replace(/\s+/g, ' ').trim();
  if (t.length <= 155) return t;
  const kurz = t.slice(0, 154);
  return kurz.slice(0, Math.max(kurz.lastIndexOf(' '), 100)).replace(/[\s,;:.-]+$/, '') + ' …';
}

/** `titel`: Überschrift vor dem Block (zuletzt gesehenes h2, sonst der Artikeltitel); sie wird zur Beschriftung (caption) der Tabelle. */
const block = (b: Block, titel: string): string =>
  typeof b === 'string' ? `<p>${esc(b)}</p>`
  : 'h' in b ? `<h2>${esc(b.h)}</h2>`
  : 'ul' in b ? `<ul>${b.ul.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
  : 'ol' in b ? `<ol>${b.ol.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`
  : 'code' in b ? `<pre><code>${esc(b.code)}</code></pre>`
  : 'apa' in b ? `<p class="apa">${esc(b.apa)}</p>`
  : 'falsch' in b ? `<aside class="falsch" aria-label="${esc(b.falsch.kopf)}"><p><strong>${esc(b.falsch.nein)}:</strong> ${esc(b.falsch.mythos)}</p><p><strong>${esc(b.falsch.ja)}:</strong> ${esc(b.falsch.richtig)}</p></aside>`
  : 'mitnehmen' in b ? `<section class="mitnehmen" aria-label="${esc(b.mitnehmen.kopf)}"><p><strong>${esc(b.mitnehmen.kopf)}</strong></p><ul>${b.mitnehmen.punkte.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>`
  : `<table><caption>${esc(titel)}</caption><thead><tr>${b.tabelle.kopf.map(x => `<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${b.tabelle.zeilen.map(z => `<tr>${z.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

/** Alle Blöcke eines Artikels; Tabellen bekommen die Überschrift davor (oder den Artikeltitel) als caption. */
function blockeHtml(a: Artikel): string {
  let titel = a.titel;
  return a.inhalt.map(b => { if (typeof b === 'object' && 'h' in b) titel = b.h; return block(b, titel); }).join('\n');
}

const MARKE = '<svg class="zeichen" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#E2F0EC"/><line x1="12" y1="50" x2="52" y2="14" stroke="#17756A" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/><circle cx="15" cy="45" r="4.5" fill="#2E8F82"/><circle cx="26" cy="40" r="5.5" fill="#22857A"/><circle cx="36" cy="28" r="6.5" fill="#17756A"/><circle cx="48" cy="19" r="8" fill="#C4502F"/></svg>';

interface Rahmen { sp: Sprache; tiefe: number; pfad: string; titel: string; beschreibung: string; h1: string; haupt: string; appZiel: string; alternativ: (sp: Sprache) => string; daten: unknown[]; /** Sprachen, die diese Seite haben (Glossar: noch nicht in allen). Fehlt: alle. */ sprachen?: Sprache[] }

function seite(e: Eingabe, r: Rahmen): string {
  const zur = '../'.repeat(r.tiefe), w = (p: typeof W.hilfe) => esc(paarText(r.sp, p));
  const app = `${zur}?sprache=${r.sp}`;
  const sprachen = r.sprachen ?? e.sprachen;
  const alternativen = sprachen.map(s => `<link rel="alternate" hreflang="${s}" href="${ADRESSE}${r.alternativ(s)}">`).join('\n')
    + `\n<link rel="alternate" hreflang="x-default" href="${ADRESSE}${r.alternativ('en')}">`;
  const sprachwahl = sprachen.map(s => s === r.sp
    ? `<li><span aria-current="true" lang="${s}">${esc(SPRACHNAMEN[s])}</span></li>`
    : `<li><a href="${zur}${r.alternativ(s)}" hreflang="${s}" lang="${s}">${esc(SPRACHNAMEN[s])}</a></li>`).join('');
  return `<!doctype html>
<html lang="${r.sp}"${istRtl(r.sp) ? " dir=\"rtl\"" : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(r.titel)}</title>
<meta name="description" content="${esc(r.beschreibung)}">
<link rel="canonical" href="${ADRESSE}${r.pfad}">
${alternativen}
<link rel="icon" href="${zur}favicon.svg?v=2" type="image/svg+xml">
<link rel="icon" href="${zur}favicon.ico" sizes="16x16 32x32 48x48">
<link rel="apple-touch-icon" href="${zur}apple-touch-icon.png?v=2">
<link rel="license" href="${LIZENZ}">
<link rel="stylesheet" href="${zur}hilfe.css">
<script src="${zur}zaehlen-hilfe.js" defer></script>
<meta name="theme-color" content="#EFEDE8">
<meta name="theme-color" content="#14181D" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Statable">
<meta property="og:title" content="${esc(r.h1)}">
<meta property="og:description" content="${esc(r.beschreibung)}">
<meta property="og:url" content="${ADRESSE}${r.pfad}">
<meta property="og:image" content="${ADRESSE}vorschau.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${json(r.daten.length === 1 ? r.daten[0] : r.daten)}</script>
</head>
<body>
<header class="kopf">
  <a class="marke" href="${app}">${MARKE}<span class="wort">stat<b>able</b></span></a>
  <span class="unter">${esc(e.unterzeile[r.sp] ?? '')}</span>
</header>
<main class="blatt">
${r.haupt}
<p class="los"><a class="knopf" href="${zur}${r.appZiel}">${esc(OEFFNEN[r.sp] ?? OEFFNEN.en!)}</a></p>
</main>
<footer class="fuss">
  <details><summary>${w(W.sprache)}: ${esc(SPRACHNAMEN[r.sp])}</summary><ul class="sprachen">${sprachwahl}</ul></details>
  <nav aria-label="${w(W.alle)}"><a href="${zur}${uebersichtPfad(r.sp)}">${w(W.alle)}</a> · <a href="${app}#impressum">${w(W.impressum)}</a> · <a href="${app}#datenschutz">${w(W.datenschutz)}</a></nav>
  <p class="lizenz">© ${AUTOR} · <a href="${LIZENZ}" rel="license">CC BY 4.0</a></p>
</footer>
</body>
</html>
`;
}

/** Beschreibung als freies Lehrmaterial nach dem Profil AMB (Allgemeines Metadatenprofil für Bildungsressourcen) - so liest OERSI die Seiten
 *  (eingebettetes JSON-LD plus Sitemap). Fach: Statistik (Hochschulfächersystematik n312); Art: Webseite, Textdokument (HCRT). */
const lehrmaterial = (sp: Sprache, pfad: string, name: string, description: string) => ({
  '@context': ['https://w3id.org/kim/amb/context.jsonld', 'https://schema.org', { '@language': sp }],
  id: ADRESSE + pfad, type: ['LearningResource', 'TechArticle'], name, description,
  creator: [{ type: 'Person', name: AUTOR }], inLanguage: [sp], isAccessibleForFree: true, license: { id: LIZENZ },
  about: [{ id: 'https://w3id.org/kim/hochschulfaechersystematik/n312', type: 'Concept', prefLabel: { de: 'Statistik', en: 'Statistics' } }],
  learningResourceType: [
    { id: 'https://w3id.org/kim/hcrt/web_page', type: 'Concept', prefLabel: { de: 'Webseite', en: 'Web Page' } },
    { id: 'https://w3id.org/kim/hcrt/text', type: 'Concept', prefLabel: { de: 'Textdokument', en: 'Text' } }
  ],
  publisher: [{ type: 'Organization', name: 'Statable', id: ADRESSE }]
});

const krumen = (sp: Sprache, punkte: { name: string; pfad: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: punkte.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, item: ADRESSE + p.pfad }))
});

/** Alle Dateien: Artikel- und Übersichtsseiten jeder Sprache, `hilfe.css`, `sitemap.xml`. */
export function hilfeSeiten(e: Eingabe): Datei[] {
  const aus: Datei[] = [];
  const karte: { pfad: string; alternativ: (s: Sprache) => string; sprachen?: Sprache[] }[] = [{ pfad: '', alternativ: () => '' }];
  const hat = new Map(e.sprachen.map(s => [s, new Set((e.artikel[s] ?? []).map(a => a.id))]));
  const mit = (id: string) => e.sprachen.filter(s => hat.get(s)!.has(id));
  for (const sp of e.sprachen) {
    const liste = e.artikel[sp] ?? [];
    const ids = new Set(liste.map(a => a.id));
    const hilfeName = paarText(sp, W.hilfe);
    for (const a of liste) {
      if (!istPfadId(a.id)) throw new Error(`Hilfe-Artikel „${a.id}“: Id passt nicht in einen Pfad`);
      const bereich = BEREICHE.find(b => b.id === a.bereich)!;
      const bereichName = paarText(sp, bereich.name);
      const verwandt = a.verwandt.map(v => liste.find(x => x.id === v)).filter((x): x is Artikel => !!x && ids.has(x.id));
      const pfad = artikelPfad(sp, a.id);
      const haupt = `<nav class="krumen" aria-label="${esc(hilfeName)}"><a href="../">${esc(hilfeName)}</a> › <a href="../#${a.bereich}">${esc(bereichName)}</a></nav>
<article>
<h1>${esc(a.titel)}</h1>
${blockeHtml(a)}
</article>${verwandt.length ? `
<section class="verwandt"><h2>${esc(paarText(sp, W.verwandt))}</h2><ul>${verwandt.map(v => `<li><a href="../${v.id}/">${esc(v.titel)}</a></li>`).join('')}</ul></section>` : ''}`;
      const besch = beschreibung(a);
      aus.push({ pfad: pfad + 'index.html', inhalt: seite(e, {
        sp, tiefe: 3, pfad, titel: `${a.titel} - Statable`, beschreibung: besch, h1: a.titel, haupt,
        appZiel: `?sprache=${sp}#hilfe/${a.id}`, alternativ: s => artikelPfad(s, a.id), sprachen: mit(a.id),
        daten: [
          { '@context': 'https://schema.org', '@type': 'TechArticle', headline: a.titel, description: besch, inLanguage: sp, url: ADRESSE + pfad,
            license: LIZENZ, author: { '@type': 'Person', name: AUTOR }, isPartOf: { '@type': 'WebSite', name: 'Statable', url: ADRESSE },
            about: { '@type': 'SoftwareApplication', name: 'Statable', url: ADRESSE, applicationCategory: 'EducationalApplication', operatingSystem: 'Web browser' } },
          krumen(sp, [{ name: hilfeName, pfad: uebersichtPfad(sp) }, { name: a.titel, pfad }]),
          lehrmaterial(sp, pfad, a.titel, besch)
        ]
      }) });
      if (sp === e.sprachen[0]) karte.push({ pfad: '', alternativ: s => artikelPfad(s, a.id), sprachen: mit(a.id) });
    }
    // Übersicht: Bereiche in der Reihenfolge der App, darunter die Artikel
    const abschnitte = BEREICHE.map(b => {
      const drin = liste.filter(a => a.bereich === b.id);
      if (!drin.length) return '';
      return `<section id="${b.id}"><h2>${esc(paarText(sp, b.name))}</h2><p class="kurz">${esc(paarText(sp, b.kurz))}</p>
<ul${b.id === 'begriffe' ? ' class="spalten"' : ''}>${drin.map(a => `<li><a href="${a.id}/">${esc(a.titel)}</a></li>`).join('')}</ul></section>`;
    }).join('\n');
    const pfad = uebersichtPfad(sp), inhaltName = paarText(sp, W.inhalt);
    const besch = `${inhaltName}: ${BEREICHE.map(b => paarText(sp, b.name)).join(', ')}.`;
    aus.push({ pfad: pfad + 'index.html', inhalt: seite(e, {
      sp, tiefe: 2, pfad, titel: `${hilfeName} - Statable`, beschreibung: besch, h1: hilfeName,
      haupt: `<h1>${esc(hilfeName)}</h1>\n<nav aria-label="${esc(inhaltName)}">\n${abschnitte}\n</nav>`,
      appZiel: `?sprache=${sp}#hilfe`, alternativ: s => uebersichtPfad(s),
      daten: [krumen(sp, [{ name: hilfeName, pfad }])]
    }) });
    if (sp === e.sprachen[0]) karte.push({ pfad: '', alternativ: s => uebersichtPfad(s) });
  }
  aus.push({ pfad: 'hilfe.css', inhalt: css(e.schrift) });
  aus.push({ pfad: 'sitemap.xml', inhalt: sitemap(e.sprachen, karte) });
  return aus;
}

/** Eine Zeile je Seite und Sprache. Die Sprachfassungen stehen schon im Kopf jeder Seite (`hreflang`); hier doppelt wären es 4,5 MB statt 0,2 MB. */
function sitemap(sprachen: Sprache[], karte: { alternativ: (s: Sprache) => string; sprachen?: Sprache[] }[]): string {
  const zeilen: string[] = [`  <url><loc>${ADRESSE}</loc></url>`];
  for (const k of karte.slice(1)) for (const s of k.sprachen ?? sprachen) zeilen.push(`  <url><loc>${ADRESSE}${k.alternativ(s)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${zeilen.join('\n')}
</urlset>
`;
}

/** Aussehen wie die App (Farben aus stil/tokens.css, hell und dunkel nach Systemeinstellung), aber ohne die App. */
const css = (s: { normal: string; fett: string }) => `@font-face{font-family:'Atkinson Hyperlegible';src:url(./${s.normal}) format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:'Atkinson Hyperlegible';src:url(./${s.fett}) format('woff2');font-weight:700;font-display:swap}
:root{color-scheme:light dark;--grund:#EFEDE8;--blatt:#FFFEFB;--tinte:#1D2530;--tinte-2:#4C5661;--linie:#DDD8CF;--akzent:#17756A;--akzent-druck:#105E55;--akzent-tinte:#0E5A51;--auf-akzent:#FFFFFF;--code:#F7F5F0;--fokus:#1B5FC1}
@media (prefers-color-scheme:dark){:root{--grund:#14181D;--blatt:#1D232A;--tinte:#E8ECEF;--tinte-2:#AAB4BE;--linie:#323B45;--akzent:#5CC2B2;--akzent-druck:#7FD3C5;--akzent-tinte:#7FD3C5;--auf-akzent:#08201D;--code:#242B33;--fokus:#8DB8FF}}
*{box-sizing:border-box}
body{margin:0;background:var(--grund);color:var(--tinte);font:1rem/1.5 'Atkinson Hyperlegible',system-ui,-apple-system,'Segoe UI',sans-serif;padding:0 16px}
a{color:var(--akzent-tinte)}
a:focus-visible,summary:focus-visible{outline:3px solid var(--fokus);outline-offset:2px;border-radius:4px}
.kopf,.blatt,.fuss{max-width:760px;margin:0 auto}
.kopf{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;padding:20px 0 16px}
.marke{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--tinte)}
.zeichen{width:36px;height:36px}
.wort{font-size:1.6rem;font-weight:400;letter-spacing:-.02em;line-height:1}
.wort b{color:var(--akzent);font-weight:700}
.unter{color:var(--tinte-2);font-size:.9rem}
.blatt{background:var(--blatt);border:1px solid var(--linie);border-radius:16px;padding:clamp(20px,4vw,40px)}
h1{font-size:1.6rem;line-height:1.25;margin:.2em 0 .6em}
h2{font-size:1.15rem;line-height:1.3;margin:1.6em 0 .4em}
p,li{max-width:68ch}
li{margin:.25em 0}
pre{background:var(--code);border:1px solid var(--linie);border-radius:8px;padding:12px;overflow-x:auto;font:.9rem/1.45 ui-monospace,'SF Mono',Menlo,Consolas,monospace}
.apa{border-inline-start:3px solid var(--akzent);padding-inline-start:12px}
.falsch,.mitnehmen{border:1px solid var(--linie,#c9c5bc);border-inline-start:4px solid var(--akzent);border-radius:8px;padding:4px 14px;margin:16px 0}
.falsch p{margin:8px 0}
table{border-collapse:collapse;width:100%}th,td{text-align: start;padding:6px 8px;border-bottom:1px solid #d5dbe0;vertical-align:top}
.krumen{font-size:.9rem;color:var(--tinte-2)}
.kurz{color:var(--tinte-2);margin-top:0}
.spalten{columns:2 16rem}
.verwandt{border-top:1px solid var(--linie);margin-top:2em}
.los{margin:2em 0 0}
.knopf{display:inline-block;background:var(--akzent);color:var(--auf-akzent);text-decoration:none;font-weight:700;padding:10px 20px;border-radius:999px}
.knopf:hover{background:var(--akzent-druck)}
.fuss{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;padding:20px 0 32px;color:var(--tinte-2);font-size:.9rem}
.fuss a{color:var(--tinte-2)}
summary{cursor:pointer}
.lizenz{flex-basis:100%;margin:0}
.sprachen{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-wrap:wrap;gap:4px 14px}
`;
