/**
 * Sätze für den Leitfaden-Assistenten (Paket 4D): die Hinweise beim Prüfen und die Prüffragen (BELEGE-LEITFADEN.md, Abschnitt 4, in eigenen Worten).
 * Alles ist ein Hinweis, nie ein Fehler.
 */
import { L } from './sitzung.svelte';
import type { HinweisArt } from './leitfaden';

export const hinweisText = (art: HinweisArt): string => {
  switch (art) {
    case 'geschlossen': return L('Darauf kann man mit Ja oder Nein antworten. Offener wirkt: „Wie …“ oder „Erzählen Sie …“.', 'This can be answered with yes or no. More open: "How …" or "Tell me …".');
    case 'suggestiv': return L('Die Frage legt eine Antwort nahe.', 'The question suggests an answer.');
    case 'doppelt': return L('Hier stecken zwei Fragen in einer.', 'There are two questions in one here.');
    case 'alternativ': return L('Die Frage gibt nur zwei Antworten vor.', 'The question only offers two answers.');
    case 'warum': return L('Warum-Fragen verlangen eine Begründung und können wie ein Vorwurf klingen. Oft hilft „Wie kam es dazu?“. Die Quellen raten hier verschieden: Manche raten ab, andere nutzen „Warum?“ als Nachfrage.', 'Why-questions ask for a justification and can sound like a reproach. "How did it come about?" often helps. Sources differ here: some advise against it, others use "Why?" as a follow-up.');
    case 'fakt': return L('Das ist eine Faktenfrage. Sie passt oft besser in einen kurzen Fragebogen.', 'This is a question of fact. It often fits better in a short questionnaire.');
    case 'lang': return L('Die Frage ist lang. Kürzer ist im Gespräch leichter zu verstehen.', 'The question is long. Shorter is easier to understand in conversation.');
  }
};
/** Kurzname der Art für die Anzeige („Geschlossene Frage“). */
export const hinweisName = (art: HinweisArt): string => {
  switch (art) {
    case 'geschlossen': return L('Geschlossene Frage', 'Closed question');
    case 'suggestiv': return L('Suggestivfrage', 'Leading question');
    case 'doppelt': return L('Doppelte Frage', 'Double-barrelled question');
    case 'alternativ': return L('Alternativfrage', 'Either-or question');
    case 'warum': return L('Warum-Frage', 'Why-question');
    case 'fakt': return L('Faktenfrage', 'Question of fact');
    case 'lang': return L('Lange Frage', 'Long question');
  }
};
export const pruefFragen = (): string[] => [
  L('Lässt sich die Frage mit „ja“, „nein“ oder einer Zahl beantworten? Wenn ja: Ist das genau, was ich brauche, oder will ich erzählen lassen?', 'Can the question be answered with "yes", "no" or a number? If so, is that exactly what I need, or do I want people to tell their story?'),
  L('Würde ich die Antwort wirklich nicht kennen, oder bestätigt sie nur, was ich schon vermute?', 'Do I truly not know the answer, or would it only confirm what I already assume?'),
  L('Kann die befragte Person das aus eigener Erfahrung wissen? (Nicht: was andere denken, nicht: theoretische Zusammenhänge.)', 'Can this person know this from their own experience? (Not what others think, not theoretical connections.)'),
  L('Steckt in der Frage nur eine Frage? Müsste ich sie in zwei Sätzen stellen?', 'Is there only one question in it, or would I have to ask it in two sentences?'),
  L('Verlangt die Frage eine Rechtfertigung („Warum haben Sie …?“)? Geht es auch als „Wie kam es dazu …?“?', 'Does it ask the person to justify themselves ("Why did you …?")? Would "How did it come about …?" work?'),
  L('Wie lange dauert es, die Frage laut zu lesen? Versteht man sie beim ersten Hören?', 'How long does it take to read the question aloud? Is it clear on first hearing?')
];
