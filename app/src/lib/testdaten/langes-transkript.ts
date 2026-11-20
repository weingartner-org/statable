/**
 * Erfundenes langes Interview-Transkript für die Leistungsprobe des Kodier-Arbeitsplatzes (Fachblatt 6b, Punkt 7).
 * Deterministisch (fester Startwert), keine echten Personen. Rund 100.000 Zeichen, rund 1.500 Sätze, Sprecher "I:" und "B:".
 */
function zufall(start: number): () => number {
  let z = start >>> 0;
  return () => { z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296; };
}

const FRAGEN = [
  'Wie sieht ein typischer Tag im Studium bei Ihnen aus?',
  'Was belastet Sie im Moment am meisten?',
  'Können Sie dazu ein Beispiel erzählen?',
  'Wie gehen Sie mit dem Zeitdruck vor den Prüfungen um?',
  'Was hilft Ihnen, wenn es schwierig wird?',
  'Wie erleben Sie den Kontakt zu anderen Studierenden?',
  'Gab es einen Moment, in dem Sie ans Aufhören gedacht haben?',
  'Wie vereinbaren Sie das Studium mit der Arbeit?',
];
const AUSSAGEN = [
  'Morgens fahre ich meistens eine Stunde mit dem Zug zur Uni',
  'Die Vorlesungen am Vormittag finde ich oft zu voll',
  'Nachmittags sitze ich in der Bibliothek und lerne für die nächste Klausur',
  'Ich merke, dass mir der Druck vor Prüfungen den Schlaf raubt',
  'Meine Lerngruppe hilft mir sehr, weil wir uns gegenseitig erklären, was wir nicht verstanden haben',
  'Manchmal fühle ich mich allein, obwohl so viele Menschen um mich herum sind',
  'Mein Nebenjob im Supermarkt kostet mich jede Woche zwölf Stunden',
  'Wenn ich Geldsorgen habe, kann ich mich nur schwer konzentrieren',
  'Die Betreuung durch die Dozentinnen und Dozenten war bisher sehr unterschiedlich',
  'Ich habe gelernt, mir kleine Ziele zu setzen und sie abends abzuhaken',
  'Am Wochenende versuche ich bewusst nichts für die Uni zu tun',
  'Meine Eltern unterstützen mich, aber sie verstehen den Alltag an der Uni nicht ganz',
  'Der Wechsel vom Seminar in die Online-Lehre hat mir anfangs viel Mühe gemacht',
  'Ich wünsche mir klarere Rückmeldungen zu meinen Hausarbeiten',
  'Es gibt Tage, an denen ich einfach nur durchhalten möchte',
  'Sport am Abend hilft mir, den Kopf frei zu bekommen',
  'Die Wohnungssuche in der Stadt war für mich eine der größten Hürden',
  'Ich arbeite lieber in kleinen Gruppen als in großen Seminaren',
  'Zu Beginn des Semesters habe ich mir einen Wochenplan gemacht, der aber nie ganz gehalten hat',
  'Die Prüfungsordnung ist für mich an manchen Stellen schwer zu verstehen',
];
const RAHMEN = ['Also', 'Ja, genau', 'Na ja', 'Ich würde sagen', 'Ehrlich gesagt', 'Das war so', 'Wissen Sie', 'Ich glaube'];
const ENDEN = ['.', '.', '.', '!', '?'];

/** Das Transkript als Text, Zeilenende `\n`. */
export function langesTranskript(zeichen = 100000, start = 20261109): string {
  const r = zufall(start);
  const wahl = <T,>(a: T[]): T => a[Math.floor(r() * a.length)]!;
  const zeilen: string[] = [];
  let laenge = 0;
  while (laenge < zeichen) {
    const f = `I: ${wahl(FRAGEN)}`;
    const n = 4 + Math.floor(r() * 6);
    const saetze: string[] = [];
    for (let i = 0; i < n; i++) {
      const a = wahl(AUSSAGEN);
      const mitRahmen = r() < 0.3 ? `${wahl(RAHMEN)}, ${a[0]!.toLowerCase()}${a.slice(1)}` : a;
      const ende = r() < 0.15 ? wahl(ENDEN) : '.';
      saetze.push(mitRahmen + ende);
    }
    const antwort = `B: ${saetze.join(' ')}`;
    zeilen.push(f, antwort, '');
    laenge += f.length + antwort.length + 3;
  }
  return zeilen.join('\n');
}
