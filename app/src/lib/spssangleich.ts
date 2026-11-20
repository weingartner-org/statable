/**
 * SPSS-Syntax für PSPP angleichen (Nachttest 24.10.2026). Was SPSS 27-29 beim „Einfügen“ aus den Dialogen schreibt, versteht PSPP 2.1.1 an einigen Stellen nicht:
 * jeder T-TEST bekommt `/ES DISPLAY(TRUE)`, ONEWAY `/ES=OVERALL` und `/CRITERIA=CILEVEL(0.95)`, REGRESSION `/MISSING LISTWISE` und `STATISTICS … OUTS`,
 * die logistische Regression heißt `LOGISTIC REGRESSION VARIABLES y /METHOD=ENTER x` statt `… y WITH x`, UNIANOVA heißt in PSPP GLM.
 * Ohne Angleichen bricht fast jede eingefügte Kurs-Syntax mit „Dieses Wort passt hier nicht“ ab (geprüft mit pruefdaten/nacht/spss-paste/einfuegen.sps: 11 von 21 Befehlen).
 *
 * Regeln: Nur Teile, die die Zahlen der übrigen Ausgabe NICHT ändern, werden weggelassen oder umgeschrieben (z. B. `/MISSING LISTWISE` ist in PSPP ohnehin so,
 * `/CONTRAST (g)=Indicator` ohne Angabe ist PSPPs Voreinstellung). Alles, was Zahlen ändern würde (Indicator(1), PAIRWISE, schrittweise Verfahren), bleibt stehen -
 * dann meldet PSPP den Fehler und die freundliche Meldung erklärt ihn. Jede Änderung wird mit Zeile und Grund gemeldet; nichts geschieht still.
 * REIN: kein Zugriff auf Engine, Daten oder Netz.
 */
import { teileBefehle } from './befehlsteile';
import { L } from './sitzung.svelte';
import { vorlauf } from './spssbefehle';

export type AngleichGrund = 'es' | 'welch' | 'cilevel' | 'stemleaf' | 'full' | 'regmissing' | 'regcriteria' | 'regstat' | 'regplots' | 'logvariables' | 'logcontrast' | 'logkrit' | 'loggoodfit' | 'unianova' | 'glmzusatz';
export interface Angleich { /** Zeile im ganzen Text (0-basiert, wie `zeilen` des Laufs) */ zeile: number; befehl: string; grund: AngleichGrund; /** weggelassener oder umgeschriebener Text, wie er dastand */ was: string; }
export interface Angeglichen { syntax: string; zeilen: number[]; aenderungen: Angleich[]; /** Meldungen von Statable (lib/spssbefehle.ts): `vorher` über, `nachher` unter der Ausgabe */ meldungen: { vorher: string[]; nachher: string[] } }

/** Ein Stück Text mit der Zeile, aus der jedes Zeichen stammt. */
interface Stueck { text: string; zeile: number[] }
const stueck = (text: string, ab: number): Stueck => { const zeile: number[] = []; let z = ab; for (const c of text) { zeile.push(z); if (c === '\n') z++; } return { text, zeile }; };
const teil = (s: Stueck, von: number, bis = s.text.length): Stueck => ({ text: s.text.slice(von, bis), zeile: s.zeile.slice(von, bis) });
const verbinde = (...l: Stueck[]): Stueck => ({ text: l.map(x => x.text).join(''), zeile: l.flatMap(x => x.zeile) });

/** Unterbefehle: an jedem „/“ außerhalb von Anführungszeichen und Klammern. Das erste Stück ist der Kopf (Befehlsname und Variablen). */
function unterbefehle(s: Stueck): Stueck[] {
  const aus: Stueck[] = []; let tiefe = 0, anf = '', von = 0;
  for (let i = 0; i < s.text.length; i++) {
    const c = s.text[i]!;
    if (anf) { if (c === anf) anf = ''; continue; }
    if (c === "'" || c === '"') { anf = c; continue; }
    if (c === '(') tiefe++; else if (c === ')') tiefe = Math.max(0, tiefe - 1);
    else if (c === '/' && tiefe === 0) {
      // Leerraum vor dem „/“ (Zeilenumbruch und Einrückung) gehört zum folgenden Unterbefehl - so fällt er mit ihm weg
      let k = i; while (k > von && /\s/.test(s.text[k - 1]!)) k--;
      aus.push(teil(s, von, k)); von = k;
    }
  }
  aus.push(teil(s, von));
  return aus;
}
/** Name eines Unterbefehls („/STATISTICS=…“ → STATISTICS). */
const name = (u: Stueck) => (/^\s*\/\s*([A-Za-z][\w-]*)/.exec(u.text)?.[1] ?? '').toUpperCase();
const erstes = (u: Stueck) => u.zeile[u.text.search(/\S/)] ?? u.zeile[0] ?? 0;
/** Wörter aus einem Unterbefehl entfernen (Wortgrenzen, Klammerzusatz mit), Zeilenumbrüche bleiben. */
function ohneWoerter(u: Stueck, woerter: string[]): { u: Stueck; weg: string[] } {
  const weg: string[] = [];
  const re = new RegExp(`(\\s*)\\b(${woerter.join('|')})\\b(\\s*\\([^)]*\\))?`, 'gi');
  const behalten: boolean[] = Array.from(u.text, () => true);
  for (const m of u.text.matchAll(re)) {
    // das Leerzeichen davor nur entfernen, wenn es kein Zeilenumbruch ist (Zeilen bleiben, wie sie sind)
    const vor = m[1]!.includes('\n') ? 0 : m[1]!.length;
    for (let i = m.index! + m[1]!.length - vor; i < m.index! + m[0].length; i++) behalten[i] = false;
    weg.push((m[2]! + (m[3] ?? '')).replace(/\s+/g, ''));
  }
  if (!weg.length) return { u, weg };
  return { u: { text: Array.from(u.text).filter((_, i) => behalten[i]).join(''), zeile: u.zeile.filter((_, i) => behalten[i]) }, weg };
}

const REG_STAT_PSPP = ['ALL', 'DEFAULTS', 'R', 'COEFF', 'ANOVA', 'BCOV', 'TOL', 'CI'];
const REG_STAT_SPSS = ['OUTS', 'CHANGE', 'COLLIN', 'ZPP', 'SELECTION', 'LINE', 'HISTORY', 'END', 'F', 'CHA', 'COND', 'XTX', 'LABEL', 'SES'];

/** Einen Befehl angleichen. `kopf` ist der Befehlsname in Großbuchstaben. */
function befehl(s: Stueck, aend: Angleich[]): Stueck {
  const roh = s.text.trimStart().replace(/\s+/g, ' ').toUpperCase();
  const k = /^(T-TEST|ONEWAY|EXAMINE|CORRELATIONS|REGRESSION|LOGISTIC REGRESSION|UNIANOVA|GLM)\b/.exec(roh)?.[1];
  if (!k || s.text.includes('/*')) return s;
  let u = unterbefehle(s);
  const merke = (x: Stueck, grund: AngleichGrund, was = x.text.trim().replace(/\s+/g, ' ')) => aend.push({ zeile: erstes(x), befehl: k, grund, was });
  const weg = (pruef: (n: string, x: Stueck) => AngleichGrund | null) => { u = [u[0]!, ...u.slice(1).filter(x => { const g = pruef(name(x), x); if (g) merke(x, g); return !g; })]; };

  if (k === 'T-TEST') weg(n => (n === 'ES' ? 'es' : null));
  if (k === 'ONEWAY') {
    weg((n, x) => (n === 'ES' ? 'es' : n === 'CRITERIA' && /^\s*\/\s*CRITERIA\s*=?\s*CILEVEL\s*\(\s*0?\.95\d*\s*\)\s*$/i.test(x.text) ? 'cilevel' : null));
    u = u.map((x, i) => {
      if (i === 0 || name(x) !== 'STATISTICS') return x;
      const r = ohneWoerter(x, ['WELCH', 'BROWNFORSYTHE', 'EFFECTS']);
      if (r.weg.length) aend.push({ zeile: erstes(x), befehl: k, grund: 'welch', was: r.weg.join(' ') });
      return r.u;
    }).filter((x, i) => i === 0 || !/^\s*\/\s*STATISTICS\s*=?\s*$/i.test(x.text));
  }
  if (k === 'EXAMINE') u = u.map((x, i) => {
    if (i === 0 || name(x) !== 'PLOT') return x;
    const r = ohneWoerter(x, ['STEMLEAF']);
    if (r.weg.length) aend.push({ zeile: erstes(x), befehl: k, grund: 'stemleaf', was: 'STEMLEAF' });
    return /^\s*\/\s*PLOT\s*=?\s*$/i.test(r.u.text) ? verbinde(r.u, stueck(' NONE', r.u.zeile.at(-1) ?? 0)) : r.u;
  });
  if (k === 'CORRELATIONS') u = u.map((x, i) => {
    if (i === 0 || name(x) !== 'PRINT') return x;
    const r = ohneWoerter(x, ['FULL', 'LOWER']);
    if (r.weg.length) aend.push({ zeile: erstes(x), befehl: k, grund: 'full', was: r.weg.join(' ') });
    return r.u;
  });
  if (k === 'REGRESSION') {
    const schrittweise = u.some(x => name(x) === 'METHOD' && /\b(STEPWISE|FORWARD|BACKWARD|REMOVE)\b/i.test(x.text));
    weg((n, x) => (n === 'MISSING' && /^\s*\/\s*MISSING\s*=?\s*LISTWISE\s*$/i.test(x.text) ? 'regmissing'
      : n === 'CRITERIA' && !schrittweise ? 'regcriteria'
      : n === 'RESIDUALS' || n === 'CASEWISE' || n === 'SCATTERPLOT' || n === 'PARTIALPLOT' || n === 'DESCRIPTIVES' ? 'regplots' : null));
    u = u.map((x, i) => {
      if (i === 0 || name(x) !== 'STATISTICS') return x;
      const r = ohneWoerter(x, REG_STAT_SPSS);
      if (r.weg.length) aend.push({ zeile: erstes(x), befehl: k, grund: 'regstat', was: r.weg.join(' ') });
      return r.u;
    });
  }
  if (k === 'LOGISTIC REGRESSION') {
    const m = /^(\s*LOGISTIC\s+REGRESSION\s+)VARIABLES\s*=?\s*([A-Za-z@#$][\w.@#$]*)\s*$/i.exec(u[0]!.text);
    const methoden = u.filter(x => name(x) === 'METHOD');
    const enter = methoden.length === 1 ? /^\s*\/\s*METHOD\s*=\s*ENTER\s+([\s\S]+?)\s*$/i.exec(methoden[0]!.text) : null;
    if (m && enter) {
      const neuKopf = `${m[1]}${m[2]} WITH ${enter[1]!.replace(/\s+/g, ' ')}`;
      merke(u[0]!, 'logvariables', `${u[0]!.text.trim()} ${methoden[0]!.text.trim()}`.replace(/\s+/g, ' '));
      u = [stueck(neuKopf, u[0]!.zeile[0] ?? 0), ...u.slice(1).filter(x => x !== methoden[0])];
    }
    weg((n, x) => (n === 'CONTRAST' && /^\s*\/\s*CONTRAST\s*\(\s*[\w.@#$]+\s*\)\s*=\s*INDICATOR\s*$/i.test(x.text) ? 'logcontrast' : null));
    u = u.map((x, i) => {
      if (i === 0) return x;
      if (name(x) === 'CRITERIA') { const r = ohneWoerter(x, ['PIN', 'POUT']); if (r.weg.length) aend.push({ zeile: erstes(x), befehl: k, grund: 'logkrit', was: r.weg.join(' ') }); return r.u; }
      if (name(x) === 'PRINT') { const r = ohneWoerter(x, ['GOODFIT', 'ITER', 'CORR']); if (r.weg.length) aend.push({ zeile: erstes(x), befehl: k, grund: 'loggoodfit', was: r.weg.join(' ') }); return r.u; }
      return x;
    }).filter((x, i) => i === 0 || !/^\s*\/\s*(CRITERIA|PRINT)\s*=?\s*$/i.test(x.text));
  }
  if (k === 'UNIANOVA' || k === 'GLM') {
    if (k === 'UNIANOVA') {
      const kopf = u[0]!, pos = kopf.text.search(/UNIANOVA/i);
      merke(kopf, 'unianova', 'UNIANOVA');
      u[0] = verbinde(teil(kopf, 0, pos), stueck('GLM', kopf.zeile[pos] ?? 0), teil(kopf, pos + 'UNIANOVA'.length));
    }
    weg(n => (['PRINT', 'PLOT', 'EMMEANS', 'POSTHOC', 'SAVE', 'LMATRIX', 'KMATRIX', 'CONTRAST', 'OUTFILE', 'ROBUST'].includes(n) ? 'glmzusatz' : null));
  }
  return verbinde(...u);
}

/** Text eines Laufs angleichen. `zeilen[k]`: Zeile im ganzen Text, aus der Zeile k des Laufs stammt (wie `ausfuehren` in Befehle.svelte). */
export function spssAngleichen(text: string, zeilen: number[] = text.split('\n').map((_, k) => k), datenOffen = true): Angeglichen {
  // Übersprungenes und mehrzeilige Kommentare zuerst (Zeilen bleiben Zeilen)
  const v = vorlauf(text, datenOffen);
  const t = v.text, alle = t.split('\n'), aend: Angleich[] = [];
  const teile = teileBefehle(t);
  const aus: Stueck[] = [];
  let z = 0;
  const zeilenStueck = (von: number, bis: number) => stueck(alle.slice(von, bis + 1).join('\n') + (bis < alle.length - 1 ? '\n' : ''), von);
  for (const p of teile) {
    if (p.von > z) aus.push(zeilenStueck(z, p.von - 1));
    // Kommentarzeilen vor dem Befehl bleiben unverändert; angeglichen wird ab der Zeile des Befehlsnamens
    const kopfZeile = alle.findIndex((l, i) => i >= p.von && i <= p.bis && l.trim() === p.kopf);
    const ab = kopfZeile < 0 ? p.von : kopfZeile;
    if (ab > p.von) aus.push(zeilenStueck(p.von, ab - 1));
    const s = zeilenStueck(ab, p.bis);
    const ende = s.text.endsWith('\n') ? 1 : 0, kern = teil(s, 0, s.text.length - ende);
    const punkt = /\.\s*$/.test(kern.text) ? kern.text.length - kern.text.replace(/\.\s*$/, '').length : 0;
    const innen = teil(kern, 0, kern.text.length - punkt);
    const neu = befehl(innen, aend);
    aus.push(neu === innen ? s : verbinde(neu, teil(kern, kern.text.length - punkt), teil(s, s.text.length - ende)));
    z = p.bis + 1;
  }
  if (z < alle.length) aus.push(zeilenStueck(z, alle.length - 1));
  const ganz = verbinde(...aus);
  // Zeile im Ergebnis → Zeile im Lauf → Zeile im ganzen Text
  const neueZeilen: number[] = [0];
  for (let i = 0; i < ganz.text.length; i++) if (ganz.text[i] === '\n') neueZeilen.push(ganz.zeile[i + 1] ?? ganz.zeile[i]!);
  neueZeilen[0] = ganz.zeile[0] ?? 0;
  return { syntax: ganz.text, zeilen: neueZeilen.map(k => zeilen[k] ?? k), meldungen: { vorher: v.vorher, nachher: v.nachher }, aenderungen: aend.map(a => ({ ...a, zeile: zeilen[a.zeile] ?? a.zeile })).sort((x, y) => x.zeile - y.zeile) };
}

/** Der Grund einer Änderung als Satz für die Seite „Befehle“. */
export function angleichText(g: AngleichGrund): string {
  switch (g) {
    case 'es': return L('Effektstärken (/ES) gibt es erst ab SPSS 27; PSPP kennt sie nicht. Cohens d zeigen die Auswertungen „Unterscheiden sich Gruppen?“ und „Hat sich etwas verändert?“.', `Effect sizes (/ES) only exist from SPSS 27 on; PSPP does not know them. Cohen's d is shown by the analyses "Do groups differ?" and "Has something changed?".`);
    case 'welch': return L('Welch und Brown-Forsythe rechnet PSPP nicht. Die Varianzanalyse nach Welch zeigt die Auswertung „Unterscheiden sich Gruppen?“.', 'PSPP does not calculate Welch and Brown-Forsythe. The Welch analysis of variance is shown by the analysis "Do groups differ?".');
    case 'cilevel': return L('CILEVEL kennt PSPP hier nicht; es gilt ohnehin 95 %.', 'PSPP does not know CILEVEL here; 95% applies anyway.');
    case 'stemleaf': return L('Stamm-Blatt-Diagramme kennt PSPP nicht.', 'PSPP does not know stem-and-leaf plots.');
    case 'full': return L('Diese Angabe zur Form der Matrix kennt PSPP nicht; die Tabelle ist trotzdem vollständig.', 'PSPP does not know this setting for the shape of the matrix; the table is complete anyway.');
    case 'regmissing': return L('Listenweiser Ausschluss ist in PSPP ohnehin die Regel.', 'Listwise deletion is the rule in PSPP anyway.');
    case 'regcriteria': return L('PIN, POUT und TOLERANCE gelten nur für schrittweise Verfahren; mit ENTER ändern sie nichts.', 'PIN, POUT and TOLERANCE only apply to stepwise methods; with ENTER they change nothing.');
    case 'regstat': return L('Diese Angaben unter /STATISTICS kennt PSPP nicht (zum Beispiel ausgeschlossene Variablen, R²-Änderung, Kollinearitätsdiagnose). Die R²-Änderung zeigt „Lässt sich etwas vorhersagen?“ mit Blöcken; TOL ergibt Toleranz und VIF.', 'PSPP does not know these settings under /STATISTICS (for example excluded variables, R² change, collinearity diagnostics). The R² change is shown by "Can something be predicted?" with blocks; TOL gives tolerance and VIF.');
    case 'regplots': return L('Residuen-Statistiken (Durbin-Watson), fallweise Diagnose und Diagramme kennt PSPP in REGRESSION nicht.', 'PSPP does not know residual statistics (Durbin-Watson), casewise diagnostics and plots in REGRESSION.');
    case 'logvariables': return L('SPSS schreibt LOGISTIC REGRESSION VARIABLES y /METHOD=ENTER x; PSPP versteht dasselbe als LOGISTIC REGRESSION y WITH x.', 'SPSS writes LOGISTIC REGRESSION VARIABLES y /METHOD=ENTER x; PSPP understands the same as LOGISTIC REGRESSION y WITH x.');
    case 'logcontrast': return L('Indikator-Kodierung mit der letzten Kategorie als Vergleich ist in PSPP die Voreinstellung.', 'Indicator coding with the last category as reference is the default in PSPP.');
    case 'logkrit': return L('PIN und POUT gelten nur für schrittweise Verfahren.', 'PIN and POUT only apply to stepwise methods.');
    case 'loggoodfit': return L('Diese Ausgaben (zum Beispiel den Hosmer-Lemeshow-Test) kennt PSPP nicht.', 'PSPP does not know these outputs (for example the Hosmer-Lemeshow test).');
    case 'unianova': return L('UNIANOVA heißt in PSPP GLM.', 'UNIANOVA is called GLM in PSPP.');
    case 'glmzusatz': return L('Diese Unterbefehle kennt PSPP bei GLM nicht. η², Mittelwerte und Paarvergleiche zeigt die Auswertung „Unterscheiden sich Gruppen?“ (mit zweiter Gruppierung).', 'PSPP does not know these subcommands in GLM. η², means and pairwise comparisons are shown by the analysis "Do groups differ?" (with a second grouping).');
  }
}
