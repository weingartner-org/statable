/* Beschriftungen und Leitfragen der Protokolle (Feinstruktur F2A), gemeinsam für Oberfläche und Word.
 * Eigene Worte nach Fachblatt Prüfer und Vorlagen, Abschnitte 5 bis 7. */
import type { Protokoll } from './qualprojekt';

export interface Zweisprachig { de: string; en: string }

export const PROTOKOLL_ART: Record<Protokoll['art'], Zweisprachig> = {
  interview: { de: 'Interviewprotokoll', en: 'Interview protocol' },
  gedaechtnis: { de: 'Gedächtnisprotokoll', en: 'Memory protocol' },
  beobachtung: { de: 'Beobachtungsprotokoll', en: 'Observation protocol' }
};

export const INTERVIEW_FELD_TEXT: Record<string, { name: Zweisprachig; frage: Zweisprachig }> = {
  zustandekommen: { name: { de: 'Zustandekommen', en: 'How the contact came about' }, frage: { de: 'Wie kam der Kontakt zustande? Wer hat vermittelt?', en: 'How did the contact come about? Who arranged it?' } },
  raum: { name: { de: 'Raum und Rahmen', en: 'Place and setting' }, frage: { de: 'Wo fand es statt? Wer war noch da? Gab es Störungen?', en: 'Where did it take place? Who else was there? Were there interruptions?' } },
  atmosphaere: { name: { de: 'Beziehung und Atmosphäre', en: 'Relationship and atmosphere' }, frage: { de: 'Wie war die Stimmung? Wie war die Beziehung zwischen uns?', en: 'What was the mood? What was the relationship between us like?' } },
  verlauf: { name: { de: 'Verlauf und Dynamik', en: 'Course and dynamics' }, frage: { de: 'Wie lief das Gespräch? Wo stockte es, wo wurde es lebhaft?', en: 'How did the conversation go? Where did it stall, where did it become lively?' } },
  wirkung: { name: { de: 'Wirkung der Situation', en: 'Effect of the situation' }, frage: { de: 'Was an der Situation könnte beeinflusst haben, was gesagt wurde?', en: 'What about the situation may have influenced what was said?' } },
  vorNach: { name: { de: 'Vor und nach der Aufnahme', en: 'Before and after the recording' }, frage: { de: 'Was wurde ohne Aufnahme gesagt?', en: 'What was said without the recording running?' } },
  thesen: { name: { de: 'Erste Thesen', en: 'First hypotheses' }, frage: { de: 'Was fällt mir zur Forschungsfrage auf?', en: 'What do I notice about the research question?' } }
};

export const BEOBACHTUNG_FELD_TEXT: Record<'beobachtung' | 'ueberlegung', { name: Zweisprachig; frage: Zweisprachig }> = {
  beobachtung: { name: { de: 'Beobachtung', en: 'Observation' }, frage: { de: 'Was war zu sehen und zu hören? Nur festhalten, was wahrgenommen wurde.', en: 'What could be seen and heard? Write only what you perceived.' } },
  ueberlegung: { name: { de: 'Überlegung', en: 'Reflection' }, frage: { de: 'Was bedeutet das? Hier darf gedeutet werden.', en: 'What does it mean? Interpretation is welcome here.' } }
};

export const KOPF_TEXT = {
  fall: { de: 'Fall', en: 'Case' }, datum: { de: 'Datum', en: 'Date' }, uhrzeit: { de: 'Uhrzeit', en: 'Time' }, ort: { de: 'Ort (allgemein)', en: 'Place (general)' },
  dauer: { de: 'Dauer (Minuten)', en: 'Duration (minutes)' }, kontaktweg: { de: 'Kontaktweg', en: 'How contact was made' }
};

export const SCHRITT_TEXT = {
  s1: { name: { de: 'Schritt 1: Schnell niederschreiben', en: 'Step 1: Write it down quickly' }, frage: { de: 'Alles aufschreiben, was einfällt, ohne auf Form zu achten.', en: 'Write down everything that comes to mind, without caring about form.' } },
  s2: { name: { de: 'Schritt 2: Systematisch erinnern', en: 'Step 2: Recall systematically' }, frage: { de: 'Ordne die Situationen in zeitlicher Folge. Notizen aus dem Feld (Jottings) kommen daneben.', en: 'Put the situations in time order. Notes from the field (jottings) go next to it.' } },
  s3: { name: { de: 'Schritt 3: Bericht schreiben', en: 'Step 3: Write the report' }, frage: { de: 'In zeitlicher Folge schreiben, mit Ort und Zeit. Beobachtung und Überlegung kommen in getrennte Felder.', en: 'Write in time order, with place and time. Observation and reflection go in separate fields.' } }
};

/** Datum JJJJ-MM-TT in der Anzeige der Sprache (de: TT.MM.JJJJ). */
export function datumAnzeige(d: string, sprache: 'de' | 'en'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m && sprache === 'de' ? `${m[3]}.${m[2]}.${m[1]}` : d;
}
