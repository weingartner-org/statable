import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-b-erwartet.json';
import { gewichtIds, gewichtStatus, schwersterStatus, sperrSatz, type Gewicht } from './gewichte';
import { s } from './sitzung.svelte';

/* ===== Welle S-B: Fallgewicht bei den neuen Stellen (Sperrtabelle `TABELLE` in lib/gewichte.ts; Fachblatt S-B „Für alle“, 1.5, 2.5, 3, 4.2, 5.3, 6.6 und „Entscheidungen Opus“) =====
 * Soll: scripts/spaeter-b-erwartet.R → testdaten/spaeter-b-erwartet.json (gewichte.neue_schluessel). Der Bauer trägt die neun Schlüssel in `TABELLE` ein (und die Teile in gewichtkarten.ts); die S-A-Tests bleiben unverändert grün.
 *   kreuz:masse            rechnen | sperren       Kreuztabelle-Maße: Häufigkeitsgewicht über die gewichtete Tabelle, Umfragegewicht sperrt den ganzen Abschnitt
 *   kreuz:schicht          rechnen | sperren       Mantel-Haenszel
 *   gruppen:rang-weitere   sperren | sperren       Vorzeichen-, Median-, Jonckheere-Terpstra-, K-S-Test (Opus: bei allen vier gesperrt)
 *   praepost:vorzeichen    sperren | sperren       Vorzeichentest (Vorher-Nachher)
 *   verteilung:vielfalt    rechnen | beschreibend  Diversität: Umfragegewicht nur beschreibend (die unverzerrte Form ist null, siehe diversitaet.test.ts)
 *   gruppen:zufall · zusammenhang:zufall · vorhersage:zufall · verteilung:zufall      rechnen | sperren    Permutation/Bootstrap: Häufigkeitsgewicht über die erweiterte Menge (bis Σw = 100 000, siehe permutation.test.ts), Umfragegewicht gesperrt
 * Das 5 %-getrimmte Mittel gehört zu `verteilung:kennwerte` (rechnen | beschreibend, S-A) und bleibt dort.
 */

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const G = (erwartet as any).gewichte, T = G.neue_schluessel as { id: string; h: string; u: string; was: string }[];
const gH: Gewicht = { spalte: 'w', art: 'haeufigkeit' }, gU: Gewicht = { spalte: 'wu', art: 'umfrage' };
const nurFallgewicht = (t: string) => expect(t.match(/(?<!Fall|Häufigkeits|Umfrage)[Gg]ewicht(?!et)/g), t).toBeNull();

describe('Die neun neuen Schlüssel der Sperrtabelle', () => {
  it('es sind genau neun, mit den Sollzuständen aus den Entscheidungen', () => {
    expect(T.map(t => t.id).sort()).toEqual(['gruppen:rang-weitere', 'gruppen:zufall', 'kreuz:masse', 'kreuz:schicht', 'praepost:vorzeichen', 'verteilung:vielfalt', 'verteilung:zufall', 'vorhersage:zufall', 'zusammenhang:zufall']);
  });
  for (const t of (erwartet as any).gewichte.neue_schluessel as { id: string; h: string; u: string }[]) it(`${t.id}: Häufigkeit ${t.h}, Umfrage ${t.u}`, () => {
    expect(gewichtIds(), `${t.id} fehlt in TABELLE`).toContain(t.id);
    expect(gewichtStatus(t.id, 'haeufigkeit')).toBe(t.h); expect(gewichtStatus(t.id, 'umfrage')).toBe(t.u);
  });
  it('jeder Teil der Karten kreuz, gruppen, praepost, verteilung, zusammenhang, vorhersage ist bekannt', () => {
    const teile = G.karten_teile as Record<string, string | string[]>;
    for (const [karte, ids] of Object.entries(teile)) for (const id of ([] as string[]).concat(ids)) expect(gewichtIds(), `${karte}: ${id}`).toContain(id);
  });
  it('Umfragegewicht: kein neues Verfahren mit p-Wert, KI oder Test rechnet (nur Diversität beschreibend)', () => {
    for (const t of T) expect(['sperren', 'beschreibend'], t.id).toContain(gewichtStatus(t.id, 'umfrage'));
    expect(T.filter(t => gewichtStatus(t.id, 'umfrage') === 'beschreibend').map(t => t.id)).toEqual(['verteilung:vielfalt']);
  });
  it('Rangtests und Vorzeichentest bleiben bei Häufigkeitsgewicht gesperrt (wie gruppen:rang und praepost:wilcoxon)', () => {
    for (const id of ['gruppen:rang-weitere', 'praepost:vorzeichen']) { expect(gewichtStatus(id, 'haeufigkeit')).toBe('sperren'); expect(gewichtStatus(id, 'haeufigkeit')).toBe(gewichtStatus(id === 'praepost:vorzeichen' ? 'praepost:wilcoxon' : 'gruppen:rang', 'haeufigkeit')); }
  });
  it('S-A-Stellen unverändert: Kennwerte rechnen/beschreibend (dort liegt das getrimmte Mittel), Kreuztabelle-Test rechnen/sperren', () => {
    expect([gewichtStatus('verteilung:kennwerte', 'haeufigkeit'), gewichtStatus('verteilung:kennwerte', 'umfrage')]).toEqual(['rechnen', 'beschreibend']);
    expect([gewichtStatus('kreuz:test', 'haeufigkeit'), gewichtStatus('kreuz:test', 'umfrage')]).toEqual(['rechnen', 'sperren']);
  });
  it('schwerster Status einer Karte mit den neuen Teilen', () => {
    expect(schwersterStatus(['kreuz:test', 'kreuz:masse', 'kreuz:schicht'], 'umfrage')).toBe('sperren'); expect(schwersterStatus(['kreuz:test', 'kreuz:masse', 'kreuz:schicht'], 'haeufigkeit')).toBe('rechnen');
    expect(schwersterStatus(['verteilung:kennwerte', 'verteilung:vielfalt'], 'umfrage')).toBe('beschreibend'); expect(schwersterStatus(['verteilung:kennwerte', 'verteilung:vielfalt', 'verteilung:zufall'], 'umfrage')).toBe('sperren');
    expect(schwersterStatus(['gruppen:mittelwerte', 'gruppen:rang-weitere'], 'haeufigkeit')).toBe('sperren');
  });
});

describe('Sperrsätze der neuen Stellen (Wort „Fallgewicht“ überall)', () => {
  it('Kreuztabelle-Maße und Mantel-Haenszel mit Umfragegewicht: Stichprobenplan, Standardfehler, was geht (Mittelwerte, Anteile, Prozente); mit Häufigkeitsgewicht kein Satz', () => {
    for (const id of ['kreuz:masse', 'kreuz:schicht']) {
      const t = sperrSatz(id, gU, 'Stärke des Zusammenhangs')!; expect(t, id).toContain('wu'); expect(t).toContain('Stichprobenplan'); expect(t).toContain('Standardfehler'); expect(t).toContain('Stärke des Zusammenhangs'); nurFallgewicht(t);
      expect(sperrSatz(id, gH, 'x')).toBeNull();
    }
  });
  it('Vorzeichentest und weitere Rangtests mit Häufigkeitsgewicht: „jede Zeile einmal“, Fallgewicht, ein Ausweg', () => {
    for (const [id, titel] of [['praepost:vorzeichen', 'Vorzeichentest'], ['gruppen:rang-weitere', 'Mediantest']] as const) { const t = sperrSatz(id, gH, titel)!; expect(t).toContain(titel); expect(t).toContain('jede Zeile einmal'); expect(t).toContain('Fallgewicht'); expect(t).toMatch(/aus|anderes Verfahren/); nurFallgewicht(t); expect(sperrSatz(id, gU, titel)).toContain('Stichprobenplan'); }
  });
  it('Zufallsverfahren: Umfragegewicht gesperrt (kein Stichprobenplan), Häufigkeitsgewicht rechnet; Diversität: beides ohne Sperrsatz', () => {
    for (const id of ['gruppen:zufall', 'zusammenhang:zufall', 'vorhersage:zufall', 'verteilung:zufall']) { expect(sperrSatz(id, gU, 'Permutationstest')).toContain('Stichprobenplan'); expect(sperrSatz(id, gH, 'Permutationstest')).toBeNull(); }
    expect(sperrSatz('verteilung:vielfalt', gH, 'Vielfalt')).toBeNull(); expect(sperrSatz('verteilung:vielfalt', gU, 'Vielfalt')).toBeNull();
  });
});
