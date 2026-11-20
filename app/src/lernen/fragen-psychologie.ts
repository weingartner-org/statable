/**
 * Üben: Wirkt etwas anders bei verschiedenen Personen, läuft es über einen Zwischenschritt, ist ein Befund verlässlich?
 * (Moderation und Mediation, Teststärke, falsch positive Befunde, kleine Stichproben).
 * Eigene Wortlaute; alle Zahlen und Tabellen aus app/src/lib/testdaten/ueben-erwartet.json (scripts/ueben-erwartet.R,
 * Daten: lavaan::HolzingerSwineford1939; Teststärke, Vorhersagewert und Simulation sind Rechenbeispiele und als solche beschriftet).
 * Mein Fachgebiet: Bildung und Psychologie (Karten Moderation und Mediation), nur vermerkt.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';
import { tab, W, zd, ze, zn, zp, zpr } from './fragen-bau';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const MOD = ['frage-moderation', 'moderation'];
const MED = ['frage-mediation', 'mediation'];
const gesamt = String(Number(W.pv_wahr) + Number(W.pv_falsch));
const tp20 = String(Math.round(Number(W.pv_wahr) * Number(W.pv_w20)));
const fp0 = String(Math.round(Number(W.pp_alpha) * Number(W.pv_falsch)));

const QUELLE_HS = P(
  `Daten: lavaan::HolzingerSwineford1939 (Holzinger und Swineford 1939; Paket lavaan, Lizenz GPL), ${zn('pm_n')} Schulkinder, Leistungstests. Regressionen, berechnet mit R.`,
  `Data: lavaan::HolzingerSwineford1939 (Holzinger and Swineford 1939; package lavaan, licence GPL), ${zn('pm_n')} schoolchildren, ability tests. Regressions, computed with R.`);
const QUELLE_POWER = P(
  `Rechenbeispiel, keine Daten: Teststärke des zweiseitigen t-Tests für zwei gleich große Gruppen, wahrer Unterschied d = ${zd('pp_d', 1)}, Niveau ${zd('pp_alpha', 2)}. Berechnet mit R.`,
  `Worked example, no data: power of the two-sided t test for two groups of equal size, true difference d = ${ze('pp_d', 1)}, level ${ze('pp_alpha', 2)}. Computed with R.`);
const QUELLE_PPV = P(
  `Rechenbeispiel, keine Daten: ${zn('pv_wahr')} wahre und ${zn('pv_falsch')} falsche Hypothesen, Niveau ${zd('pp_alpha', 2)}. Berechnet mit R.`,
  `Worked example, no data: ${zn('pv_wahr')} true and ${zn('pv_falsch')} false hypotheses, level ${ze('pp_alpha', 2)}. Computed with R.`);
const QUELLE_STOPP = P(
  `Simulation, keine Daten: ${zn('ps_runs')} Wiederholungen zweier Gruppen ohne wahren Unterschied, Zufallszahlen mit festem Startwert. Berechnet mit R.`,
  `Simulation, no data: ${zn('ps_runs')} repeats of two groups without a true difference, random numbers with a fixed seed. Computed with R.`);

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  'psy-mod': {
    titel: P(`${zn('pm_n')} Schulkinder: Ergebnis ist der Mittelwert dreier Tempo-Tests (x7 bis x9), Einflussgröße der Mittelwert dreier Tests zur visuellen Wahrnehmung (x1 bis x3, vis). Das Geschlecht (girl: 1 = Mädchen, 0 = Jungen) soll den Zusammenhang möglicherweise verändern`,
      `${zn('pm_n')} schoolchildren: the outcome is the mean of three speed tests (x7 to x9), the predictor the mean of three tests of visual perception (x1 to x3, vis). Sex (girl: 1 = girls, 0 = boys) may change the relationship`),
    tabellen: [
      tab('psy-mod.0', [P('Term', 'Term'), P('B', 'B'), P('Standardfehler', 'Standard error'), P('Sig.', 'Sig.')], QUELLE_HS, P('Regression mit Produktterm vis mal girl', 'Regression with the product term vis times girl')),
      tab('psy-mod.1', [P('Gruppe', 'Group'), P('Zahl der Kinder', 'Number of children'), P('Korrelation r', 'Correlation r'), P('Steigung B (unstandardisiert)', 'Slope B (unstandardised)')], QUELLE_HS, P('Der Zusammenhang getrennt nach Geschlecht', 'The relationship separately by sex'))
    ]
  },
  'psy-med': {
    titel: P(`${zn('pm_n')} Schulkinder: Kann der Zusammenhang zwischen visueller Wahrnehmung und Tempo statistisch über das Textverständnis laufen (Mittelwert dreier Tests, x4 bis x6)? Pfad a: Wahrnehmung auf Textverständnis; c: Wahrnehmung auf Tempo; c': dasselbe bei Kontrolle des Textverständnisses; b: Textverständnis auf Tempo bei Kontrolle der Wahrnehmung`,
      `${zn('pm_n')} schoolchildren: can the relationship between visual perception and speed statistically run through text comprehension (mean of three tests, x4 to x6)? Path a: perception on comprehension; c: perception on speed; c': the same with comprehension controlled; b: comprehension on speed with perception controlled`),
    tabellen: [
      tab('psy-med.0', [P('Pfad', 'Path'), P('B', 'B'), P('Sig.', 'Sig.')], QUELLE_HS, P('Die drei Regressionen nach Baron und Kenny', 'The three regressions after Baron and Kenny'))
    ]
  },
  'psy-power': {
    titel: P(`Vergleich zweier gleich großer Gruppen; angenommen ist ein wahrer Unterschied von d = ${zd('pp_d', 1)} bei Niveau ${zd('pp_alpha', 2)}`,
      `Comparison of two groups of equal size; a true difference of d = ${ze('pp_d', 1)} at level ${ze('pp_alpha', 2)} is assumed`),
    tabellen: [
      tab('psy-power.0', [P('Personen je Gruppe', 'People per group'), P('Teststärke', 'Power')], QUELLE_POWER, P('Rechenbeispiel: Teststärke nach Gruppengröße', 'Worked example: power by group size'))
    ]
  },
  'psy-ppv': {
    titel: P(`Ein Fachgebiet prüft ${gesamt} Hypothesen, von denen ${zn('pv_wahr')} wahr und ${zn('pv_falsch')} falsch sind; Niveau ${zd('pp_alpha', 2)}. Die Tabelle zeigt, was bei verschiedener Teststärke unter den signifikanten Befunden herauskommt`,
      `A field tests ${zn('pv_wahr') === '200' ? '1200' : ''} hypotheses, of which ${zn('pv_wahr')} are true and ${zn('pv_falsch')} are false; level ${ze('pp_alpha', 2)}. The table shows what comes out among the significant findings at different power`),
    tabellen: [
      tab('psy-ppv.0', [P('Teststärke', 'Power'), P('Wahre Effekte entdeckt', 'True effects found'), P('Falsch positive Befunde', 'False positive findings'), P('Anteil wahrer Effekte unter den signifikanten Befunden', 'Share of true effects among the significant findings')], QUELLE_PPV, P('Rechenbeispiel: Vorhersagewert eines signifikanten Befunds', 'Worked example: predictive value of a significant finding'))
    ]
  },
  'psy-stopp': {
    titel: P(`Zwei Gruppen ohne wahren Unterschied. Vorgehen A: feste Zahl von ${zn('ps_max')} Personen je Gruppe, ein Test am Ende. Vorgehen B: Test ab ${zn('ps_start')} Personen je Gruppe nach jeder weiteren Person, Abbruch bei Sig. höchstens ${zd('pp_alpha', 2)}, spätestens bei ${zn('ps_max')}`,
      `Two groups without a true difference. Approach A: a fixed number of ${zn('ps_max')} people per group, one test at the end. Approach B: test from ${zn('ps_start')} people per group after every further person, stop at Sig. of at most ${ze('pp_alpha', 2)}, at the latest at ${zn('ps_max')}`),
    tabellen: [
      tab('psy-stopp.0', [P('Vorgehen', 'Approach'), P('Anteil fälschlich signifikanter Ergebnisse', 'Share of falsely significant results')], QUELLE_STOPP, P('Simulation: Fixed = A, Stopping = B', 'Simulation: Fixed = A, Stopping = B'))
    ]
  }
};

export const FRAGEN: Frage[] = [
  {
    id: 'psy-mod-def', thema: 'psychologie',
    stamm: P('Der Zusammenhang zwischen Alter und Reaktionszeit ist bei Frauen stärker als bei Männern. Welche Rolle hat das Geschlecht in dieser Aussage?', 'The relationship between age and reaction time is stronger in women than in men. What role does sex play in this statement?'),
    antworten: [
      a(P('Moderator: Die Beziehung ist je nach Geschlecht verschieden stark, es sagt, für wen sie gilt', 'Moderator: the relationship differs in strength by sex, it says for whom it holds'),
        P('Ein Moderator beantwortet, wann oder für wen ein Effekt gilt. Ein Mediator dagegen erklärt, wie oder warum er zustande kommt.', 'A moderator answers when or for whom an effect holds. A mediator, by contrast, explains how or why it comes about.'), true),
      a(P('Mediator: Es erklärt, wie und warum Alter und Reaktionszeit zusammenhängen, den Mechanismus dahinter', 'Mediator: it explains how and why age and reaction time are related, the mechanism behind it'),
        P('Ein Mediator soll den Mechanismus zwischen den beiden Größen erklären. Das Geschlecht zeigt hier nur, bei wem die Beziehung stärker ist.', 'A mediator is meant to explain the mechanism between the two variables. Sex here only shows for whom the relationship is stronger.')),
      a(P('Moderator und Mediator zugleich, denn beide Begriffe bedeuten im Grunde dasselbe', 'Moderator and mediator at once, since both terms mean basically the same thing'),
        P('Die Begriffe dürfen nicht gleichgesetzt werden. Sie beantworten verschiedene Fragen.', 'The terms must not be equated. They answer different questions.'))
    ],
    hilfe: [...MOD, 'frage-mediation'], karte: 'moderation', belege: ['wissen:baron86-moderator-mediator', 'Baron und Kenny 1986']
  },
  {
    id: 'psy-mod-test', thema: 'psychologie', fall: 'psy-mod',
    stamm: P('Angenommen, ein Ergebnis mit Sig. unter 0,05 gilt als signifikant. Welche Zeile der ersten Tabelle entscheidet, ob der Zusammenhang zwischen visueller Wahrnehmung und Tempo bei Mädchen und Jungen verschieden stark ist, und was ergibt sie?', 'Suppose a result with Sig. below 0.05 counts as significant. Which row of the first table decides whether the relationship between visual perception and speed differs in strength between girls and boys, and what does it show?'),
    antworten: [
      a(P(`Der Produktterm vis mal girl: B = ${zd('pm_b_int', 3)}, Sig. ${zd('pm_p_int', 3)}; Moderation ist nicht belegt`, `The product term vis times girl: B = ${ze('pm_b_int', 3)}, Sig. ${ze('pm_p_int', 3)}; moderation is not shown`),
        P('Moderation zeigt sich als Wechselwirkung. Die Haupteffekte sind für die Moderationshypothese nicht maßgeblich.', 'Moderation shows up as an interaction. The main effects are not decisive for the moderation hypothesis.'), true),
      a(P(`Die Zeile vis: B = ${zd('pm_b_vis', 3)}, Sig. ${zd('pm_p_vis', 3)}; sie ist signifikant, also liegt Moderation vor`, `The row vis: B = ${ze('pm_b_vis', 3)}, Sig. ${ze('pm_p_vis', 3)}; it is significant, so there is evidently moderation`),
        P('Ein signifikanter Haupteffekt zeigt nur, dass die Wahrnehmung mit dem Tempo zusammenhängt, bei Jungen als Bezugsgruppe. Moderation prüft der Produktterm.', 'A significant main effect shows only that perception is related to speed, for boys as the reference group. The product term tests moderation.')),
      a(P('Die Zeile girl: B ist negativ, also schwächt das Geschlecht den Zusammenhang deutlich', 'The row girl: B is negative, so sex clearly weakens the relationship'),
        P('Die Zeile girl beschreibt einen Unterschied im Niveau des Tempos. Wie sich die Steigung ändert, steht im Produktterm.', 'The row girl describes a difference in the level of speed. How the slope changes is in the product term.'))
    ],
    hilfe: MOD, karte: 'moderation', belege: ['wissen:baron86-moderation-test', 'Baron und Kenny 1986']
  },
  {
    id: 'psy-mod-korr', thema: 'psychologie', fall: 'psy-mod',
    stamm: P(`Die Korrelation von visueller Wahrnehmung und Tempo ist bei Jungen ${zd('pm_r_m', 3)}, bei Mädchen ${zd('pm_r_f', 3)}. Wie vergleicht man die beiden Gruppen am besten?`,
      `The correlation of visual perception and speed is ${ze('pm_r_m', 3)} in boys and ${ze('pm_r_f', 3)} in girls. What is the best way to compare the two groups?`),
    antworten: [
      a(P('Über die unstandardisierten Steigungen oder über den Produktterm, nicht über r', 'Through the unstandardised slopes or through the product term of the regression, not r'),
        P(`Die Steigungen sind ${zd('pm_b_m', 3)} und ${zd('pm_b_f', 3)}. Korrelationen hängen auch von der Streuung der Einflussgröße und vom Messfehler ab.`, `The slopes are ${ze('pm_b_m', 3)} and ${ze('pm_b_f', 3)}. Correlations also depend on the spread of the predictor and on measurement error.`), true),
      a(P('Über die Korrelationen, denn sie sind standardisiert und darum in beiden Gruppen vergleichbar', 'Through the correlations, since they are standardised and therefore comparable in both groups'),
        P('Gerade die Standardisierung bindet r an die Streuung der Gruppe. Unterschiedliche Streuung kann einen Unterschied vortäuschen.', 'Standardisation is exactly what ties r to the spread of the group. Different spread can feign a difference.')),
      a(P('Über die standardisierten Koeffizienten, weil sie den Unterschied der Streuung ausgleichen', 'Through the standardised coefficients, because they even out the difference in spread'),
        P('Auch standardisierte Koeffizienten hängen an der Streuung der Gruppe. Empfohlen werden die unstandardisierten.', 'Standardised coefficients also depend on the spread of the group. The unstandardised ones are recommended.'))
    ],
    hilfe: [...MOD, 'korrelation'], karte: 'moderation', belege: ['wissen:baron86-moderator-korrelation', 'Baron und Kenny 1986']
  },
  {
    id: 'psy-med-gleich', thema: 'psychologie', fall: 'psy-med',
    stamm: P(`Angenommen, nach Baron und Kenny spricht ein c', das kleiner als c ist, bei bedeutsamen Pfaden a, b und c für Mediation. Der direkte Pfad c' (${zd('pd_cs', 3)}) ist kleiner als der Gesamtpfad c (${zd('pd_c', 3)}), aber weiter von null verschieden. Wie ist das zu lesen?`,
      `Suppose that, following Baron and Kenny, a c' smaller than c speaks for mediation when paths a, b and c are meaningful. The direct path c' (${ze('pd_cs', 3)}) is smaller than the total path c (${ze('pd_c', 3)}), but still differs from zero. How is that to be read?`),
    antworten: [
      a(P('Teilweise Mediation: Ein Teil des Zusammenhangs läuft statistisch über das Textverständnis', 'Partial mediation: part of the relationship runs statistically through comprehension'),
        P(`Der Teil über den Mediator ist a mal b, hier ${zd('pd_ab', 3)}, und gleich c minus c'. Ein Mechanismus ist damit nicht gezeigt; die Richtung Wahrnehmung, Textverständnis, Tempo wird angenommen, die Daten zeigen sie nicht.`, `The part through the mediator is a times b, here ${ze('pd_ab', 3)}, which equals c minus c'. A mechanism is not shown by this; the direction perception, comprehension, speed is assumed, the data do not show it.`), true),
      a(P(`Vollständige Mediation, denn c' ist kleiner als c und der Pfad über den Mediator ist signifikant`, `Full mediation, since c' is smaller than c and the path through the mediator is significant`),
        P(`Vollständig wäre sie, wenn c' bei Kontrolle des Mediators auf etwa null fiele. Hier bleibt c' mit ${zd('pd_cs', 3)} deutlich von null verschieden.`, `It would be full if c' fell to about zero with the mediator controlled. Here c' stays clearly different from zero at ${ze('pd_cs', 3)}.`)),
      a(P(`Keine Mediation, denn c' bleibt signifikant und der Mediator ändert damit nichts am Zusammenhang`, `No mediation, since c' stays significant and the mediator therefore changes nothing`),
        P('Mediation verlangt nicht, dass der direkte Pfad verschwindet. Es genügt ein verkleinerter Pfad, zusammen mit Pfad a und b.', 'Mediation does not require the direct path to vanish. A reduced path suffices, together with paths a and b.'))
    ],
    hilfe: MED, karte: 'mediation', belege: ['wissen:baron86-mediation-drei-gleichungen', 'wissen:baron86-mediation-grade', 'Baron und Kenny 1986']
  },
  {
    id: 'psy-med-fehler', thema: 'psychologie', fall: 'psy-med',
    stamm: P('Das Textverständnis (der Mediator) ist mit Messfehler behaftet. Wie wirkt sich das auf die Regressionsanalyse der Mediation aus?', 'Text comprehension (the mediator) is measured with error. How does that affect the regression analysis of mediation?'),
    antworten: [
      a(P('Der Mediatoreffekt wird unterschätzt und der direkte Effekt überschätzt', 'The mediator effect is underestimated and the direct effect overestimated'),
        P('Messfehler im Mediator lassen einen Teil des Einflusses am Mediator vorbeilaufen und dem direkten Pfad zufallen.', 'Measurement error in the mediator lets part of the influence pass the mediator and fall to the direct path.'), true),
      a(P('Beide Effekte werden unterschätzt, weil Messfehler Zusammenhänge allgemein abschwächen', 'Both effects are underestimated, because measurement error weakens relationships'),
        P('Die Verzerrung geht in zwei Richtungen: Der Mediatoreffekt sinkt, der direkte Effekt steigt.', 'The bias goes in two directions: the mediator effect falls, the direct effect rises.')),
      a(P('Der direkte Effekt wird unterschätzt und der Mediatoreffekt überschätzt', 'The direct effect is underestimated and the mediator effect overestimated'),
        P('Das ist umgekehrt. Ein fehlerbehafteter Mediator erklärt weniger, als er tatsächlich trägt.', 'That is the other way round. A mediator measured with error explains less than it actually carries.'))
    ],
    hilfe: MED, karte: 'mediation', belege: ['wissen:baron86-mediation-voraussetzungen', 'Baron und Kenny 1986']
  },
  {
    id: 'psy-power-klein', thema: 'psychologie', fall: 'psy-power',
    stamm: P(`Eine Studie mit ${zn('pp_n20')} Personen je Gruppe findet keinen signifikanten Unterschied. Ein Unterschied von d = ${zd('pp_d', 1)} wäre fachlich wichtig. Was folgt?`,
      `A study with ${zn('pp_n20')} people per group finds no significant difference. A difference of d = ${ze('pp_d', 1)} would be important in substance. What follows?`),
    antworten: [
      a(P(`Das Ergebnis sagt wenig: Ein solcher Unterschied wäre selten signifikant geworden (${zd('pp_w20', 3)})`, `The result says little: such a difference would rarely have become significant (${ze('pp_w20', 3)})`),
        P('Bei zu geringer Teststärke lässt sich ein nicht signifikantes Ergebnis nicht deuten. Es ist kein Beleg, dass es den Unterschied nicht gibt.', 'With too little power a non-significant result cannot be interpreted. It is no evidence that the difference does not exist.'), true),
      a(P('Der Unterschied ist fachlich bedeutungslos, denn die Studie hätte ihn sehr wahrscheinlich gefunden', 'The difference is of no importance in substance, since the study would very likely have found it'),
        P(`Die Studie hätte ihn nur in etwa ${zp('pp_w20')} von 100 Fällen gefunden. Erst mit rund ${zn('pp_n64')} Personen je Gruppe wäre die Teststärke bei ${zd('pp_w64', 2)}.`, `The study would have found it in only about ${zp('pp_w20')} in 100 cases. Only with about ${zn('pp_n64')} people per group would the power be ${ze('pp_w64', 2)}.`)),
      a(P(`Die Teststärke beträgt ${zd('pp_alpha', 2)}, denn Niveau und Teststärke sind im Kern dasselbe Maß`, `The power is ${ze('pp_alpha', 2)}, since level and power are basically the same measure of a study`),
        P('Das Niveau begrenzt die Rate falsch positiver Ergebnisse. Die Teststärke ist die Chance, einen vorhandenen Unterschied zu finden.', 'The level limits the rate of false positive results. Power is the chance of finding an existing difference.'))
    ],
    hilfe: ['teststaerke', 'power'], belege: ['wissen:geringe-power-nicht-interpretierbar', 'wissen:power-vier-groessen', 'Altman und Bland 1995']
  },
  {
    id: 'psy-winners', thema: 'psychologie', fall: 'psy-power',
    stamm: P(`Angenommen, der wahre Unterschied beträgt d = ${zd('pp_d', 1)}. Von vielen Studien mit ${zn('pp_n20')} Personen je Gruppe werden nur die signifikanten veröffentlicht. Wo liegt der mittlere gemeldete Effekt?`,
      `Assume the true difference is d = ${ze('pp_d', 1)}. Of many studies with ${zn('pp_n20')} people per group only the significant ones are published. Where does the mean reported effect lie?`),
    antworten: [
      a(P(`Über d = ${zd('pp_d', 1)}, weil nur zufällig große Schätzungen signifikant werden`, `Above d = ${ze('pp_d', 1)}, because only chance-large estimates become significant`),
        P('Das ist der Fluch des Gewinners: Entdeckte Effekte sind nach oben verzerrt, am stärksten bei kleinen Studien. Wiederholungen finden dann kleinere Effekte.', 'This is the winner\'s curse: discovered effects are biased upwards, most strongly in small studies. Replications then find smaller effects.'), true),
      a(P(`Bei d = ${zd('pp_d', 1)}, denn Schätzungen sind im Mittel richtig, auch bei kleinen Gruppen`, `At d = ${ze('pp_d', 1)}, since estimates are correct on average, even for small groups`),
        P('Über alle Studien stimmt das. Wählt man nur die signifikanten aus, bleiben die zufällig großen Schätzungen übrig.', 'Over all studies that holds. If only the significant ones are selected, the chance large estimates remain.')),
      a(P(`Unter d = ${zd('pp_d', 1)}, weil kleine Studien den Effekt abschwächen und verwischen`, `Below d = ${ze('pp_d', 1)}, because small studies weaken and blur the effect`),
        P('Kleine Studien streuen stärker, schwächen den wahren Effekt aber im Mittel nicht ab. Die Auswahl der signifikanten wirkt nach oben.', 'Small studies vary more but do not weaken the true effect on average. The selection of the significant ones works upwards.'))
    ],
    hilfe: ['teststaerke', 'effektstaerke'], belege: ['wissen:button13-winners-curse', 'wissen:button13-drei-probleme', 'Button u. a. 2013']
  },
  {
    id: 'psy-ppv', thema: 'psychologie', fall: 'psy-ppv',
    stamm: P(`Bei einer Teststärke von ${zd('pv_w20', 1)} und dem Niveau ${zd('pp_alpha', 2)}: Wie viele der signifikanten Befunde sind echte Effekte?`,
      `With a power of ${ze('pv_w20', 1)} and the level ${ze('pp_alpha', 2)}: how many of the significant findings are real effects?`),
    antworten: [
      a(P(`Rund ${zp('pv_ppv20')} Prozent, denn neben ${tp20} wahren stehen ${fp0} falsch positive Befunde`, `About ${zp('pv_ppv20')} percent, since beside ${tp20} true there are ${fp0} false positives`),
        P(`Bei Teststärke ${zd('pv_w80', 1)} steigt der Anteil auf ${zd('pv_ppv80', 3)}. Geringe Teststärke macht auch ein signifikantes Ergebnis seltener zu einem echten Effekt.`, `With power ${ze('pv_w80', 1)} the share rises to ${ze('pv_ppv80', 3)}. Low power also makes a significant result less often a real effect.`), true),
      a(P(`Rund ${zpr('pp_alpha')} Prozent, denn das Niveau ${zd('pp_alpha', 2)} begrenzt den Anteil falscher Befunde`, `About ${zpr('pp_alpha')} percent, since the level ${ze('pp_alpha', 2)} limits the share of false findings`),
        P('Das Niveau begrenzt die falsch positiven unter den falschen Hypothesen, nicht den Anteil falscher unter allen signifikanten Befunden.', 'The level limits the false positives among the false hypotheses, not the share of false ones among all significant findings.')),
      a(P(`Rund ${zp('pv_w20')} Prozent, denn so groß ist die Teststärke in diesem Beispiel`, `About ${zp('pv_w20')} percent, since that is the size of the power in this example`),
        P('Die Teststärke ist die Chance, einen wahren Effekt zu finden. Sie sagt nicht, wie viele signifikante Befunde echt sind.', 'Power is the chance of finding a true effect. It does not say how many significant findings are real.'))
    ],
    hilfe: ['teststaerke', 'p-wert'], belege: ['wissen:button13-ppv-formel', 'wissen:button13-drei-probleme', 'Button u. a. 2013']
  },
  {
    id: 'psy-stopp', thema: 'psychologie', fall: 'psy-stopp',
    stamm: P(`Eine Studie prüft nach jeder neuen Person je Gruppe und hört auf, sobald Sig. höchstens ${zd('pp_alpha', 2)} ist, obwohl in Wahrheit kein Unterschied besteht. Wie oft wird sie fälschlich signifikant?`,
      `A study tests after every new person per group and stops as soon as Sig. is at most ${ze('pp_alpha', 2)}, although in truth there is no difference. How often does it become falsely significant?`),
    antworten: [
      a(P(`In rund ${zp('ps_stopp')} von 100 Fällen, weit mehr als bei einem festen Stichprobenumfang`, `In about ${zp('ps_stopp')} in 100 cases, far more than with a fixed number of people`),
        P(`Die Simulation zeigt ${zp('ps_fest')} von 100 bei fester Zahl und ${zp('ps_stopp')} von 100 beim Prüfen nach jeder Person. Wiederholtes Prüfen mit Abbruch bei Erfolg erhöht den Fehler 1. Art.`, `The simulation shows ${zp('ps_fest')} in 100 with a fixed number and ${zp('ps_stopp')} in 100 when testing after every person. Repeated testing with a stop on success raises the type I error.`), true),
      a(P(`In ${zp('ps_fest')} von 100 Fällen, denn jeder einzelne Test der Folge hat das Niveau ${zd('pp_alpha', 2)}`, `In ${zp('ps_fest')} in 100 cases, since each single test of the series has the level ${ze('pp_alpha', 2)}`),
        P('Das Niveau gilt für einen Test mit festgelegtem Plan. Wer nach jeder Person prüft, bekommt viele Gelegenheiten für ein zufälliges Ergebnis.', 'The level holds for one test with a fixed plan. Whoever tests after every person gets many opportunities for a chance result.')),
      a(P(`In weniger als ${zp('ps_fest')} von 100 Fällen, denn öfter zu prüfen macht das Verfahren strenger`, `In fewer than ${zp('ps_fest')} in 100 cases, since testing more often makes the procedure stricter`),
        P('Häufigeres Prüfen macht ein Verfahren nicht strenger, sondern lässt mehr Zufallstreffer durch. Ein bei kleinem n signifikanter Effekt bleibt bei größerem n nicht immer signifikant.', 'Testing more often does not make a procedure stricter but lets more chance hits through. An effect significant at small n does not stay significant at larger n.'))
    ],
    hilfe: ['p-wert', 'signifikanz'], belege: ['wissen:simmons11-optionales-stoppen', 'Simmons u. a. 2011']
  },
  {
    id: 'psy-freiheit', thema: 'psychologie', fall: 'psy-stopp',
    stamm: P('Ein Team misst drei Ergebnisvariablen, wirft Personen mit auffälligen Werten heraus und berichtet, was signifikant wurde. Wie wirkt sich das auf die Wahrscheinlichkeit aus, mindestens einen falsch positiven Befund zu erhalten?', 'A team measures three outcome variables, removes people with conspicuous values and reports what became significant. How does that affect the probability of getting at least one false positive finding?'),
    antworten: [
      a(P(`Sie liegt über den nominellen ${zp('pp_alpha')} Prozent, auch ohne jede Täuschungsabsicht der Forschenden`, `It lies above the nominal ${zp('pp_alpha')} percent, even without intent to deceive by the researchers`),
        P('Forscherfreiheitsgrade, also viele Entscheidungen bei Erhebung und Analyse, erhöhen die Rate falsch positiver Befunde. Die Ursache sind Mehrdeutigkeit und der Wunsch nach Signifikanz.', 'Researcher degrees of freedom, that is many decisions in collection and analysis, raise the rate of false positive findings. The cause is ambiguity and the wish for significance.'), true),
      a(P(`Sie bleibt bei ${zp('pp_alpha')} Prozent, solange jeder Test für sich mit dem Niveau ${zd('pp_alpha', 2)} gerechnet wird`, `It stays at ${zp('pp_alpha')} percent as long as each test is run on its own at the level ${ze('pp_alpha', 2)}`),
        P('Wer aus mehreren Wegen den erfolgreichen berichtet, hat die Fehlerrate nicht mehr im Griff. Das Niveau gilt für den vorab gewählten Weg.', 'Whoever reports the successful one of several paths no longer controls the error rate. The level holds for the path chosen in advance.')),
      a(P(`Sie sinkt unter ${zp('pp_alpha')} Prozent, weil auffällige Werte entfernt wurden und die Daten sauberer sind`, `It falls below ${zp('pp_alpha')} percent, because conspicuous values were removed and the data are cleaner`),
        P('Das Entfernen nach dem Ergebnis ist selbst eine Entscheidung, die die Fehlerrate steigert. Saubere Daten ersetzen keinen vorab festgelegten Plan.', 'Removing after seeing the result is itself a decision that raises the error rate. Clean data do not replace a plan fixed in advance.'))
    ],
    hilfe: ['p-wert', 'signifikanz'], belege: ['wissen:simmons11-freiheitsgrade', 'wissen:wasserstein16-selektives-berichten', 'Simmons u. a. 2011; Wasserstein und Lazar 2016']
  }
];
