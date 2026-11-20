// Führt die Etappen von `lernpfade-durchlauf.mjs` (eine Datei je Einheit) zur Befundtabelle zusammen.
// Aufruf: node e2e/probe/lernpfade-zusammen.mjs <meta.json> <etappenordner> <ausgabe.md>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [metaPfad, ordner, ausgabe] = process.argv.slice(2);
const meta = JSON.parse(readFileSync(metaPfad, 'utf8'));
const einheiten = readdirSync(ordner).filter(f => f.startsWith('einheit-')).map(f => JSON.parse(readFileSync(join(ordner, f), 'utf8')));
const nachId = new Map(einheiten.map(e => [e.einheit, e]));
const kurz = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ');
const pfade = (e) => { const p = e.pfade; return p.length <= 2 ? p.join(', ') : `${p.slice(0, 2).join(', ')} (+${p.length - 2})`; };
const BILDWORT = /(Tabelle|Abbildung|Bild\b|Diagramm|Grafik|Boxplot|Histogramm|Streudiagramm|Kurve|Punktwolke)/i;

const zeilen = [], nichtBeantwortbar = [], tastaturNein = [], sonst = [], abschnittsBefunde = [];
let zaehlEinheit = 0, zaehlAbschluss = 0, zaehlRechen = 0, fragenGeprueft = 0, fragenRichtigErreicht = 0, fragenFalschErreicht = 0, bildFragen = 0, bildOk = 0;

function bildUrteil(b, ziel) {
  const braucht = [];
  if (ziel?.tabelle || b.tabellen.length) braucht.push('tab');
  if (ziel?.diagramm || b.bilder.length) braucht.push('bild');
  const stammNennt = false; // Stichwortsuche im Stamm ergab nur Begriffe (Venn-Diagramm, Kreuztabelle ...), keinen Bildbezug: abgeschaltet
  if (!braucht.length) return { text: stammNennt ? 'nein: Stamm nennt ein Bild/eine Tabelle, im DOM ist keins' : '-', braucht: false, ok: true, bes: stammNennt ? 'Stamm nennt Bild/Tabelle, nichts im DOM' : '' };
  const probleme = [];
  if (ziel?.tabelle || b.tabellen.length) {
    if (!b.tabellen.length) probleme.push('Tabelle fehlt im DOM');
    for (const t of b.tabellen) { if (!t.kopf) probleme.push('Tabelle ohne Spaltenköpfe'); if (!t.zeilen) probleme.push('Tabelle ohne Zeilen'); if (t.zeilenkoepfe < t.zeilen) probleme.push('Zeilenköpfe fehlen'); if (!t.name) probleme.push('Tabelle ohne Namen'); }
  }
  if (ziel?.diagramm || b.bilder.length) {
    if (!b.bilder.length) probleme.push('Diagramm fehlt im DOM');
    for (const d of b.bilder) { if (!d.name) probleme.push('Bild ohne Namen'); if (d.role !== 'img') probleme.push('Bild ohne role=img'); if (!d.beschreibung) probleme.push('keine Beschreibung'); if (!d.datentabelle) probleme.push('keine Datentabelle'); }
  }
  const art = braucht.join('+');
  return { text: probleme.length ? `${art === 'tab' ? 'teilweise' : 'teilweise'}: ${[...new Set(probleme)].join(', ')}` : `ja (${art === 'tab' ? 'Tabelle' : art === 'bild' ? 'Bild: Name, Beschreibung, Datentabelle' : 'Tabelle und Bild'})`, braucht: true, ok: !probleme.length, bes: '' };
}

function frageZeile(e, ab, f) {
  const a = f.erst, z = f.zweit;
  fragenGeprueft++; if (e.einheit.startsWith('abschluss-')) zaehlAbschluss++; else zaehlEinheit++;
  const typ = a.mehrfach ? 'Mehrfachwahl' : 'Einzelwahl';
  const bild = bildUrteil(a, a.ziel);
  if (bild.braucht) { bildFragen++; if (bild.ok) bildOk++; }
  const fokusA = a.fokusAufRueckmeldung && (!z || z.fokusAufRueckmeldung) ? 'Rückmeldung (h3 „Richtig.“/„Falsch.“)' : `${a.fokusNachAntwort}${z ? ' / ' + z.fokusNachAntwort : ''}`;
  const erklaerung = a.erklaerungImLesefluss && (!z || z.erklaerungImLesefluss) ? 'ja (nächster Absatz im Lesefluss; per Tab nur Links und Weiter)' : `nein (${a.erklaerungNaechstes})`;
  const tastatur = a.weg && (!z || z.weg) && a.fokusNeueFrageOk && (!z || z.fokusNeueFrageOk);
  const bes = [...a.notiz, ...(z?.notiz ?? []), bild.bes];
  if (!a.fokusNeueFrageOk) bes.push(`Fokus nach Nächste Frage: ${a.fokusNachWeiter}`);
  if (z && !z.fokusNeueFrageOk) bes.push(`Fokus nach Nächste Frage (2. Lauf): ${z.fokusNachWeiter}`);
  if (a.richtig) fragenRichtigErreicht++; else fragenFalschErreicht++;
  if (z) { if (z.richtig) fragenRichtigErreicht++; else fragenFalschErreicht++; }
  if (z && a.richtig === z.richtig) bes.push(`beide Läufe gleich ausgegangen (${a.richtig ? 'richtig' : 'falsch'})`);
  if (!z) bes.push('2. Lauf fehlt');
  if (!a.rueck) { nichtBeantwortbar.push(`${e.einheit} / ${a.id}: keine Rückmeldung`); }
  if (!tastatur) tastaturNein.push(`${e.einheit} / ${a.id}: ${[...a.notiz, ...(z?.notiz ?? [])].join('; ') || 'Fokus nach Weiter ' + a.fokusNachWeiter}`);
  const b = bes.filter(Boolean).join('; ');
  if (b && !/^beide Läufe gleich/.test(b)) sonst.push(`${e.einheit} / ${a.id}: ${b}`);
  zeilen.push(`| ${pfade(e)} | ${e.einheit} | ${a.id} | ${typ} | ${kurz(fokusA)} | ${kurz(erklaerung)} | ${kurz(bild.text)} | ${tastatur ? 'ja' : 'nein'} | ${kurz(b)} |`);
}

for (const id of Object.keys(meta.einheiten)) {
  const e = nachId.get(id);
  if (!e) { nichtBeantwortbar.push(`${id}: nicht durchlaufen`); continue; }
  if (e.fehler) nichtBeantwortbar.push(`${id}: Lauf abgebrochen: ${e.fehler}`);
  for (const k of e.konsole ?? []) sonst.push(`${id}: ${k}`);
  for (const ab of e.abschnitte) {
    if (ab.fragen || ab.art === 'abschlusstest') {
      const gesoll = ab.zaehlt?.erwartet;
      if (gesoll != null && (ab.zaehlt.erst !== gesoll || ab.zaehlt.zweit !== gesoll)) nichtBeantwortbar.push(`${id}: nur ${ab.zaehlt.erst}/${ab.zaehlt.zweit} von ${gesoll} Fragen erreicht`);
      if (!ab.neuStartMitTastatur) tastaturNein.push(`${id}: „Alle noch einmal“ per Tab nicht erreichbar`);
      else if (ab.tabsNeuStart > 20) sonst.push(`${id}: „Alle noch einmal“ erst nach ${ab.tabsNeuStart} Tabs (lange Liste „Das war falsch“ mit Links davor; kein Sprung zu den Knöpfen)`);
      for (const n of ab.notizen ?? []) sonst.push(`${id}: ${n}`);
      for (const f of ab.fragen) frageZeile(e, ab, f);
    } else if (ab.aufgabe) {
      for (const s of ab.aufgabe.schritte ?? []) {
        const name = s.name?.labelledby ?? '';
        const probleme = [];
        if (s.fehler) { probleme.push('Fehler: ' + s.fehler); nichtBeantwortbar.push(`${id} / ${ab.aufgabe.aufgabe} Schritt ${s.schritt}: ${s.fehler}`); }
        if (s.falsch && s.falsch.invalid !== 'true') probleme.push('aria-invalid fehlt bei falscher Zahl');
        if (s.falsch && !s.falsch.grund) probleme.push('kein Grund im Beschreibungstext');
        if (s.falsch && !s.falsch.ansage) probleme.push('keine Ansage');
        if (s.einheit && !name.includes(s.einheit)) probleme.push(`Einheit „${s.einheit}“ nicht im Namen des Felds`);
        if (s.fokusNachRichtig && !/^(input#ra-|div "Geschafft)/.test(s.fokusNachRichtig)) probleme.push(`Fokus nach richtig: ${s.fokusNachRichtig}`);
        if (s.fokusNachFalsch && !s.fokusNachFalsch.startsWith('input#ra-')) probleme.push(`Fokus nach falsch: ${s.fokusNachFalsch}`);
        if (s.falsch?.grund) { /* gut */ }
        const b = probleme.join('; ');
        if (b) sonst.push(`${id} / ${ab.aufgabe.aufgabe} Schritt ${s.schritt}: ${b}`);
        zeilen.push(`| ${pfade(e)} | ${e.einheit} | ${ab.aufgabe.aufgabe}#${s.schritt} | Rechenaufgabe | falsch: ${kurz(s.fokusNachFalsch ?? '')}; richtig: ${kurz(s.fokusNachRichtig ?? '')} | ja (Tipp im Absatz unter dem Feld, aria-describedby; Ansage: ${kurz((s.falsch?.ansage ?? '').slice(0, 50))}) | Tabelle mit Zeilen-/Spaltenköpfen (Aufgabentabelle) | ja (Feld, Eingabe) | ${kurz(b)} |`);
      }
    }
    if (ab.art === 'regler' || ab.art === 'erklaerung' || ab.art === 'beispiel' || ab.art === 'rechnen') {
      const p = [];
      if (ab.bilderOhneName) p.push(`${ab.bilderOhneName} Bild(er) ohne Namen`);
      if (ab.tabellenOhneKopf) p.push(`${ab.tabellenOhneKopf} Tabelle(n) ohne Kopfzellen`);
      if (ab.reglerOhneWorte) p.push(`${ab.reglerOhneWorte} von ${ab.regler} Regler ohne aria-valuetext`);
      if (ab.reglerOhneName) p.push(`${ab.reglerOhneName} Regler ohne Namen`);
      if (p.length) abschnittsBefunde.push(`${id} (${ab.art}, Abschnitt ${ab.nr}): ${p.join(', ')}`);
    }
  }
}

const ort = (meta.ortFarbe ?? []).map(o => `| ${o.einheit} | ${o.id} | „${kurz(o.ort)}“ | …${kurz(o.bildhinweis)}… | ${o.diagramm ? 'Diagramm' : o.tabelle ? 'Tabelle' : 'kein Bild'} |`);
const soll = Object.values(meta.einheiten).reduce((s, e) => s + (e.fragenSoll ?? 0), 0);
const md = `# Lernpfade durchgespielt (Befunde) - Welle 6, Auftrag A

Gemessen am ${new Date().toISOString().slice(0, 10)} mit Playwright (Chromium, de-DE, 1400x900) gegen \`dist-e2e\`; Werkzeug \`app/e2e/probe/lernpfade-durchlauf.mjs\` (Fragenliste: \`lernpfade-meta-bauen.mjs\`, Zusammenführung: \`lernpfade-zusammen.mjs\`). Kein NVDA: gemessen wird der DOM und der Tastaturweg (Tab, Leertaste, Eingabe), nicht die Sprachausgabe.

## Zählung
- Einheiten im Lernplan: ${Object.keys(meta.einheiten).length} (davon Abschlusstests: ${Object.values(meta.einheiten).filter(e => e.abschlussVon).length}); durchlaufen: ${einheiten.length}.
- Fragen laut Lernplan (Einheiten ohne Abschlusstests): ${soll}; im Lauf beantwortet (Einheitsfragen): ${zaehlEinheit}; dazu Fragen in den Abschlusstests: ${zaehlAbschluss}.
- Einzelantworten insgesamt (beide Läufe): ${fragenRichtigErreicht} richtig, ${fragenFalschErreicht} falsch ausgegangen.
- Rechenaufgaben-Schritte: ${zeilen.filter(z => z.includes('| Rechenaufgabe |')).length}.
- Fragen mit Bild oder Tabelle: ${bildFragen}, davon Information vollständig als Text im DOM: ${bildOk}.

## Verfahren je Frage
Lauf 1: Einzelwahl die erste Antwort, Mehrfachwahl nichts angehakt. Lauf 2 („Alle noch einmal“ per Tab): Einzelwahl das Gegenteil von Lauf 1 (richtig, wenn Lauf 1 falsch war, sonst falsch), Mehrfachwahl alles Richtige angehakt. So ist jede Frage einmal richtig und einmal falsch beantwortet, soweit die Fragenart es zulässt (Mehrfachwahl ohne Haken ist immer falsch). Bedienung nur mit Tab, Leertaste und Eingabe; Klick nur als Rückfall (dann „Tastaturweg nein“).

## Zeilen, die nicht beantwortbar waren oder bei denen der Tastaturweg fehlt
Nicht beantwortbar / nicht erreicht:
${nichtBeantwortbar.length ? nichtBeantwortbar.map(x => '- ' + x).join('\n') : '- keine'}

Tastaturweg „nein“:
${tastaturNein.length ? tastaturNein.map(x => '- ' + x).join('\n') : '- keine'}

## Weitere Besonderheiten (Fragen, Rechenaufgaben, Konsole)
${sonst.length ? sonst.map(x => '- ' + x).join('\n') : '- keine'}

## Abschnitte ohne Fragen (Erklärung, Beispiel, Regler, Rechenaufgabe): Bilder, Tabellen, Regler
${abschnittsBefunde.length ? abschnittsBefunde.map(x => '- ' + x).join('\n') : '- keine Auffälligkeiten'}

## Ortsangaben und Farbhinweise in Fragetexten (WCAG 1.3.3)
Treffer der Wörter links, rechts, oben, unten, rot, grün, blau in Stamm, Antworten oder Erklärungen (Quelle: Fragedateien der Einheiten). Nicht jeder Treffer bezieht sich auf ein Bild; die Spalte „Bild“ sagt, ob die Frage ein Diagramm oder eine Tabelle trägt.
| Einheit | Frage | Wort | Kontext | Bild |
|---|---|---|---|---|
${ort.join('\n')}

## Tabelle je Frage
| Pfad | Einheit | Frage-Id | Typ | Fokus nach Antwort | Erklärung erreichbar | Bild/Tabelle: Information als Text im DOM | Tastaturweg | Besonderes |
|---|---|---|---|---|---|---|---|---|
${zeilen.join('\n')}
`;
writeFileSync(ausgabe, md);
console.log('geschrieben', ausgabe, 'Zeilen', zeilen.length, 'nichtBeantwortbar', nichtBeantwortbar.length, 'tastaturNein', tastaturNein.length);
