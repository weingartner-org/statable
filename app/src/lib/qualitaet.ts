/**
 * „Qualität und Prozess“ (Johannes 01.11.): Einstieg für Technik und Qualitätssicherung.
 * Die Verfahren stecken als Blöcke unter anderen Karten; diese Einträge öffnen die Karte und springen zum Block (wie „Wie im Kurs“).
 * Eine Liste für die Kacheln in `seiten/Blatt.svelte` und für die Befehlspalette (`bausteine/Befehlspalette.svelte`).
 * Die Texte entstehen bei jedem Aufruf neu (`L`), damit die Sprache stimmt: in `$derived` oder beim Öffnen der Palette aufrufen.
 */
import { L, type KursZiel } from './sitzung.svelte';

export interface QualitaetKarte { id: string; titel: string; zusatz: string; beispiel: string; karte: string; ziel: KursZiel; wort: string }

export function qualitaetKarten(): QualitaetKarte[] {
  return [
    { id: 'regelkarte', titel: L('Läuft mein Prozess stabil?', 'Is my process stable?'), zusatz: L('Regelkarte, Prozessfähigkeit (Cp, Cpk)', 'Control chart, process capability (Cp, Cpk)'), beispiel: L('z. B. Bleibt der Durchmesser der Teile in den Grenzen?', 'e.g. Does the diameter of the parts stay within the limits?'), karte: 'verteilung', ziel: 'regelkarte', wort: 'regelkarte shewhart prozessfähigkeit cp cpk spc qualitätskontrolle control chart' },
    { id: 'zaehlkarte', titel: L('Wie viele Teile sind fehlerhaft?', 'How many parts are defective?'), zusatz: L('Zählkarten (p-, np-, c-, u-Karte)', 'Count charts (p, np, c, u chart)'), beispiel: L('z. B. Anteil fehlerhafter Stücke je Los', 'e.g. share of defective items per lot'), karte: 'verteilung', ziel: 'zaehlkarte', wort: 'zählkarte p-karte np-karte c-karte u-karte fehlerhafte stücke ausschuss attribute control chart' },
    { id: 'messsystem', titel: L('Misst mein Messgerät zuverlässig?', 'Does my gauge measure reliably?'), zusatz: L('Messsystemanalyse (Gauge R&R)', 'Measurement system analysis (gauge R&R)'), beispiel: L('z. B. Messen zwei Prüfer dasselbe Teil gleich?', 'e.g. Do two inspectors measure the same part alike?'), karte: 'gruppen', ziel: 'messsystem', wort: 'gauge rr r&r messsystemanalyse msa wiederholbarkeit vergleichbarkeit prüfer messgerät' },
    { id: 'kalibrier', titel: L('Wie genau kann ich messen?', 'How precisely can I measure?'), zusatz: L('Kalibriergerade, Nachweisgrenze', 'Calibration line, limit of detection'), beispiel: L('z. B. Ab welcher Konzentration sieht das Gerät etwas?', 'e.g. From which concentration does the device see anything?'), karte: 'zusammenhang', ziel: 'kalibrier', wort: 'kalibriergerade kalibrierung nachweisgrenze bestimmungsgrenze loq lod analytik' },
    { id: 'kurven', titel: L('Passt eine Kurve besser als eine Gerade?', 'Does a curve fit better than a line?'), zusatz: L('Kurvenanpassung', 'Curve fitting'), beispiel: L('z. B. Sättigung, Wachstum, Abklingen', 'e.g. saturation, growth, decay'), karte: 'zusammenhang', ziel: 'kurven', wort: 'kurvenanpassung kurve polynom exponentiell sättigung nichtlinear curve fitting' }
  ];
}
