import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-c-erwartet.json';
import { gewichtIds, gewichtStatus, schwersterStatus, sperrSatz, type Gewicht } from './gewichte';
import { gewichtStellenIds } from './gewichtkarten';
import { s } from './sitzung.svelte';

/* ===== Welle S-C: Fallgewicht bei den neuen Stellen (Sperrtabelle `TABELLE` in lib/gewichte.ts; Fachblatt S-C „Für alle“ und Abschnitt 1.5, Entscheidung Opus 1 und 5) =====
 * Soll: scripts/spaeter-c-erwartet.R → testdaten/spaeter-c-erwartet.json (gewichte.neue_schluessel). Der Bauer A trägt `tabelle:zusammenstellen` und `tabelle:mehrfach`, der Bauer B die fünf `assistent:*`-Schlüssel ein
 * (jeder nur seine Zeilen am Ende der Tabelle, Opus führt zusammen); die S-A- und S-B-Tests bleiben unverändert grün.
 *   tabelle:zusammenstellen   rechnen | beschreibend   n, Prozent, M, SD, Median; Häufigkeitsgewicht über die erweiterte Menge (n = Σw, nie gerundet), Umfragegewicht nur beschreibend, KEINE Tests in der Tabelle
 *   tabelle:mehrfach          rechnen | beschreibend   Mehrfachantwort-Set in der Tabelle; Gewichte gelten für Fälle, nicht für Antworten (IBM)
 *   assistent:zaehlen · assistent:rang · assistent:datum · assistent:sortieren · assistent:fehlendcodes     unberuehrt | unberuehrt   Zeilenrechnungen; der Rang-Assistent setzt WEIGHT OFF (rangbildung.test.ts), Ränge sind ungewichtet
 *   kreuz:haeufigkeit-prozent bleibt rechnen | beschreibend (Spalten- und Gesamtprozent kommen dazu, tabellenmodell.test.ts); datencheck:alle bleibt hinweis | hinweis (auffällige Fälle ignorieren das Gewicht, auffaellig.test.ts)
 * (tabellenStellen(spec) aus lib/tabellenmodell.ts, das die Stellen einer Tabelle nennt, wird in tabellenmodell.test.ts geprüft - dieser Test hängt nur an lib/gewichte.ts.)
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const G = (erwartet as any).gewichte, T = G.neue_schluessel as { id: string; h: string; u: string; was: string }[];
const gH: Gewicht = { spalte: 'w', art: 'haeufigkeit' }, gU: Gewicht = { spalte: 'wu', art: 'umfrage' };

describe('Die sieben neuen Schlüssel der Sperrtabelle', () => {
  it('es sind genau sieben, mit den Sollzuständen aus den Entscheidungen', () => {
    expect(T.map(t => t.id).sort()).toEqual(['assistent:datum', 'assistent:fehlendcodes', 'assistent:rang', 'assistent:sortieren', 'assistent:zaehlen', 'tabelle:mehrfach', 'tabelle:zusammenstellen']);
  });
  for (const t of T) it(`${t.id}: Häufigkeit ${t.h}, Umfrage ${t.u}`, () => {
    expect(gewichtIds(), `${t.id} fehlt in TABELLE`).toContain(t.id);
    expect(gewichtStatus(t.id, 'haeufigkeit')).toBe(t.h); expect(gewichtStatus(t.id, 'umfrage')).toBe(t.u);
  });
  it('Umfragegewicht: nur beschreibend oder unberührt - nie „rechnen“ mit p-Wert, KI oder Test (Entscheidung Opus 2: keine Signifikanztests in der Tabelle)', () => {
    for (const t of T) expect(['beschreibend', 'unberuehrt'], t.id).toContain(gewichtStatus(t.id, 'umfrage'));
    expect(T.filter(t => gewichtStatus(t.id, 'umfrage') === 'beschreibend').map(t => t.id).sort()).toEqual(['tabelle:mehrfach', 'tabelle:zusammenstellen']);
  });
  it('die fünf Assistenten sind unberührt - das Fallgewicht verändert ihr Ergebnis nicht (der Rang-Assistent stellt es nur sicher: WEIGHT OFF davor)', () => {
    for (const id of ['assistent:zaehlen', 'assistent:rang', 'assistent:datum', 'assistent:sortieren', 'assistent:fehlendcodes']) for (const art of ['haeufigkeit', 'umfrage'] as const) expect(gewichtStatus(id, art), `${id} ${art}`).toBe('unberuehrt');
  });
  it('alte Stellen unverändert: kreuz:haeufigkeit-prozent rechnen/beschreibend, datencheck:alle hinweis/hinweis, assistent:umkodieren unberührt', () => {
    expect([gewichtStatus('kreuz:haeufigkeit-prozent', 'haeufigkeit'), gewichtStatus('kreuz:haeufigkeit-prozent', 'umfrage')]).toEqual(['rechnen', 'beschreibend']);
    expect([gewichtStatus('datencheck:alle', 'haeufigkeit'), gewichtStatus('datencheck:alle', 'umfrage')]).toEqual(['hinweis', 'hinweis']);
    expect([gewichtStatus('assistent:umkodieren', 'haeufigkeit'), gewichtStatus('assistent:aggregieren', 'umfrage')]).toEqual(['unberuehrt', 'unberuehrt']);
    expect(gewichtStellenIds({ verfahren: 'kreuz', art: 'umfrage' })).toContain('kreuz:haeufigkeit-prozent');   // die Kreuztabelle-Karte (S-A) bleibt
  });
});

describe('Sperrsätze: für die neuen Stellen gibt es keinen (rechnen, beschreibend, unberührt), bei Fallgewicht bleibt alles wie in S-A und S-B', () => {
  it('kein Sperrsatz für Tabelle und Assistenten, mit Häufigkeits- wie mit Umfragegewicht', () => {
    for (const t of T) for (const g of [gH, gU]) expect(sperrSatz(t.id, g, 'Die Tabelle'), `${t.id} ${g.art}`).toBeNull();
  });
  it('schwerster Status einer Tabelle mit Mehrfachset und Umfragegewicht: beschreibend; mit Häufigkeitsgewicht: rechnen', () => {
    expect(schwersterStatus(['tabelle:zusammenstellen', 'tabelle:mehrfach'], 'umfrage')).toBe('beschreibend'); expect(schwersterStatus(['tabelle:zusammenstellen', 'tabelle:mehrfach'], 'haeufigkeit')).toBe('rechnen');
  });
});
