/**
 * Gestaltung der Bibliothek: eine kleine CSS als Zeichenkette, von `zeichneSeite` in die Wurzel gelegt.
 * - Farben und Maße als CSS-Variablen (`--af-…`), die der Aufrufer auf der Wurzel oder darüber überschreiben kann.
 * - Zielgröße 44 × 44 (2,75 rem) für Auswahlzeilen, Eingabefelder und Knöpfe; Fokus 3 px mit Abstand.
 * - Keine Information nur über Farbe: Fehler tragen das Wort „Fehler“ und einen dicken Rand, Pflicht das Wort „Pflicht“.
 * - Keine Media-Queries zur Breite (die Breite kommt über die Option `eng`); nur `forced-colors` (Kontrastmodus).
 * - Schriftgrößen in rem.
 */
export const STIL = `
.af{--af-text:#1a1a1a;--af-grund:#fff;--af-feld:#fff;--af-rand:#595959;--af-akzent:#0a4fa8;--af-akzent-text:#fff;--af-fehler:#a30000;--af-fehler-grund:#fff0f0;--af-fokus:#0a4fa8;--af-leise:#444;--af-abstand:1rem;--af-ziel:max(44px,2.75rem);
box-sizing:border-box;max-width:48rem;margin:0 auto;padding:var(--af-abstand);background:var(--af-grund);color:var(--af-text);font:1rem/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;overflow-wrap:anywhere}
.af *,.af *::before,.af *::after{box-sizing:border-box}
.af h2{font-size:1.5rem;line-height:1.25;margin:0 0 .5rem}
.af h3{font-size:1.2rem;line-height:1.3;margin:0 0 .5rem}
.af p{margin:.25rem 0}
.af .fortschritt{color:var(--af-leise);margin:0 0 var(--af-abstand)}
.af [data-frage],.af [data-hinweis]{margin:0 0 1.5rem}
.af fieldset{border:0;margin:0;padding:0;min-width:0}
.af legend,.af label.frage,.af caption{font-weight:600;padding:0;margin:0 0 .25rem}
.af legend{float:left;width:100%}
.af legend+*{clear:both}
.af .pflicht{font-weight:400;color:var(--af-leise)}
.af .hilfe{color:var(--af-leise)}
.af .optionen{display:flex;flex-direction:column;gap:.125rem;margin-top:.25rem}
.af label.opt{display:flex;align-items:center;gap:.75rem;min-height:var(--af-ziel);padding:.25rem .5rem;border-radius:.375rem;cursor:pointer}
.af label.opt:hover{background:rgba(127,127,127,.15)}
.af input[type=radio],.af input[type=checkbox]{flex:none;width:1.5rem;height:1.5rem;margin:0;accent-color:var(--af-akzent)}
.af input[type=text],.af input[type=number],.af input[type=date],.af textarea{display:block;width:100%;max-width:100%;min-height:var(--af-ziel);padding:.5rem .75rem;font:inherit;color:var(--af-text);background:var(--af-feld);border:2px solid var(--af-rand);border-radius:.375rem}
.af input[type=number]{max-width:12rem}
.af textarea{min-height:6rem}
.af .eingabe{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.af .andersfeld{margin:.25rem 0 .25rem 2.75rem}
.af .andersfeld[hidden]{display:none}
.af .regler{margin:.5rem 0}
.af input[type=range]{display:block;width:100%;height:var(--af-ziel);margin:0;accent-color:var(--af-akzent)}
.af .enden{display:flex;justify-content:space-between;gap:1rem;color:var(--af-leise);font-size:.875rem}
.af .zahlfeld{margin-top:.5rem}
.af .zahlfeld label{display:block;margin-bottom:.125rem}
.af ol.rang{margin:.5rem 0;padding:0 0 0 2.25rem}
.af ol.rang li{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem;padding:.25rem 0;border-bottom:1px solid var(--af-rand)}
.af ol.rang li::marker{font-weight:600}
.af button{min-width:var(--af-ziel);min-height:var(--af-ziel);padding:.5rem 1rem;font:inherit;color:var(--af-text);background:var(--af-feld);border:2px solid var(--af-rand);border-radius:.375rem;cursor:pointer}
.af button[aria-disabled=true]{color:var(--af-leise);border-style:dashed;cursor:not-allowed}
.af button.haupt{color:var(--af-akzent-text);background:var(--af-akzent);border-color:var(--af-akzent)}
.af .rangknoepfe{display:flex;gap:.5rem}
.af .rangstatus{margin:.25rem 0}
.af .tabellenrahmen{overflow-x:auto;margin-top:.25rem}
.af table{border-collapse:collapse;width:100%}
.af th,.af td{border:1px solid var(--af-rand);padding:.25rem .5rem;text-align:center;vertical-align:middle}
.af th[scope=row]{text-align:start;font-weight:400;min-width:8rem}
.af thead th{font-weight:600}
.af caption{text-align:start}
.af label.zelle{display:flex;align-items:center;justify-content:center;min-width:var(--af-ziel);min-height:var(--af-ziel);cursor:pointer}
.af .fehlertext{margin:.25rem 0;padding:.25rem .5rem;border-inline-start:.375rem solid var(--af-fehler);color:var(--af-fehler);background:var(--af-fehler-grund);font-weight:600}
.af [aria-invalid=true]{outline:2px solid var(--af-fehler);outline-offset:1px}
.af [data-fehlerliste]{margin:0 0 var(--af-abstand);padding:.75rem 1rem;border:3px solid var(--af-fehler);border-radius:.375rem;background:var(--af-fehler-grund);color:var(--af-text)}
.af [data-fehlerliste] p{font-weight:600;color:var(--af-fehler)}
.af [data-fehlerliste] ul{margin:.5rem 0 0;padding-inline-start:1.25rem}
.af [data-fehlerliste] a{display:inline-block;min-height:1.5rem;padding:.125rem 0;color:var(--af-akzent)}
.af .kommentar{margin-top:.75rem}
.af .kommentar label{display:block;font-size:.875rem;color:var(--af-leise)}
.af img{max-width:100%;height:auto}
.af[data-modus=eingabe] [data-frage],.af[data-modus=eingabe] [data-hinweis]{margin:0 0 .75rem}
.af[data-modus=eingabe] .optionen{flex-direction:row;flex-wrap:wrap;gap:.125rem .5rem}
.af .wertelabel{margin:.125rem 0 0;font-size:.875rem;color:var(--af-leise);min-height:1.25rem}
.af .knoepfe{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:var(--af-abstand)}
.af [data-ansage],.af .nur-vorleser{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.af :focus-visible,.af h2:focus,.af [data-fehlerliste]:focus{outline:3px solid var(--af-fokus);outline-offset:2px}
.af h2:focus:not(:focus-visible){outline:none}
@media (forced-colors:active){
.af :focus-visible,.af h2:focus,.af [data-fehlerliste]:focus{outline-color:Highlight}
.af [aria-invalid=true]{outline-color:Mark}
.af button,.af input,.af textarea{border-color:ButtonText}
.af button[aria-disabled=true]{color:GrayText;border-color:GrayText}
.af .fehlertext{border-inline-start-color:CanvasText;color:CanvasText;background:Canvas}
.af [data-fehlerliste]{border-color:CanvasText}
.af [data-fehlerliste] p,.af [data-fehlerliste] a{color:LinkText}
}
`;
