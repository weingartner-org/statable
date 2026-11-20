/**
 * Kurze Spaltenköpfe (Welle 3, Barrierefreiheit). Die Messung mit NVDA (docs/barrierefreiheit/KOPF-MESSUNG.md) zeigt: Es gibt keine Auszeichnung,
 * die gesprochen die lange und auf der Braillezeile die kurze Form bringt. Darum schaltet die Person selbst um (Einstellungen „Kurze Spaltenköpfe“,
 * Vorgabe aus): dann steht im Kopf die Kurzform, und unter der Tabelle erklärt eine Liste jede Kurzform.
 *
 * Der Schlüssel ist der Text, so wie er in der Tabelle steht (Deutsch: das übersetzte PSPP-Wort aus output/de-dict.json; Englisch: das PSPP-Original).
 * Kurzformen gibt es nur, wo es sie fachlich gibt (APA: M, SD, SE, p, df). Alle 13 Sprachen (und die Prüfsprache xx) haben Kurzformen; zwei Köpfe mit derselben Kurzform bleiben in der Tabelle lang (lib/tabellenstruktur.ts).
 */
const DE: Record<string, string> = {
  'Mittelwert': 'M', 'Std. Abweichung': 'SD', 'Standardfehler des Mittelwertes': 'SE', 'Standardfehler': 'SE',
  'Sig.': 'p', 'Sig. (2-seitig)': 'p (2-s.)',
  'Mittlere Differenz': 'M-Diff.', 'Stdfehler der Differenz': 'SE-Diff.',
  'R-Quadrat': 'R²', 'Korrigiertes R-Quadrat': 'korr. R²',
  'Quadratsumme': 'QS', 'Mittel der Quadrate': 'MQ',
  'Prozent': '%', 'Gültige Prozente': 'Gült. %', 'Kumulierte Prozente': 'Kum. %',
  'Varianz': 'Var.'
};
const EN: Record<string, string> = {
  'Mean': 'M', 'Std. Deviation': 'SD', 'S.E. Mean': 'SE', 'Std. Error': 'SE',
  'Sig.': 'p', 'Sig. (2-tailed)': 'p (2-t.)',
  'Mean Difference': 'M diff.', 'Std. Error Difference': 'SE diff.',
  'R Square': 'R²', 'Adjusted R Square': 'adj. R²',
  'Sum of Squares': 'SS', 'Mean Square': 'MS',
  'Percent': '%', 'Valid Percent': 'Valid %', 'Cumulative Percent': 'Cum. %',
  'Variance': 'Var.'
};
// Weitere Sprachen: Schlüssel = Wörterbuchwert (output/<sp>-dict.json), Kurzform nach der Fachkonvention der Sprache oder international (M, SD, SE, p, SS, MS, ΔM).
// Ausgelassen (keine allgemein übliche Kurzform): Varianz in el, pl, cs. Erzeugt aus den Wörterbüchern, geprüft in kurzkoepfe.test.ts.
const FR: Record<string, string> = {
  'Moyenne': 'M',
  'Écart type': 'ET',
  'Erreur standard de la moyenne': 'ES',
  'Erreur standard': 'ES',
  'Sig.': 'p',
  'Sig. (bilatérale)': 'p (bilat.)',
  'Différence moyenne': 'ΔM',
  'Erreur standard de la différence': 'ES(ΔM)',
  'R² ajusté': 'R² aj.',
  'Somme des carrés': 'SC',
  'Carré moyen': 'CM',
  'Pourcentage': '%',
  'Pourcentage valide': '% valide',
  'Pourcentage cumulé': '% cumulé',
  'Variance': 'Var.'
};
const ES: Record<string, string> = {
  'Media': 'M',
  'Desviación típica': 'DT',
  'Error típico de la media': 'ET',
  'Error típico': 'ET',
  'Sig.': 'p',
  'Sig. (bilateral)': 'p (bilat.)',
  'Diferencia de medias': 'ΔM',
  'Error típico de la diferencia': 'ET(ΔM)',
  'R cuadrado': 'R²',
  'R cuadrado corregida': 'R² corr.',
  'Suma de cuadrados': 'SC',
  'Media cuadrática': 'MC',
  'Porcentaje': '%',
  'Porcentaje válido': '% válido',
  'Porcentaje acumulado': '% acumulado',
  'Varianza': 'Var.'
};
const IT: Record<string, string> = {
  'Media': 'M',
  'Deviazione std.': 'DS',
  'Errore std. della media': 'ES',
  'Errore std.': 'ES',
  'Sig.': 'p',
  'Sig. (a due code)': 'p (2 code)',
  'Differenza media': 'ΔM',
  'Errore std. della differenza': 'ES(ΔM)',
  'R² corretto': 'R² corr.',
  'Somma dei quadrati': 'SS',
  'Media dei quadrati': 'MS',
  'Percentuale': '%',
  'Percentuale valida': '% valida',
  'Percentuale cumulata': '% cumulata',
  'Varianza': 'Var.'
};
const PT: Record<string, string> = {
  'Média': 'M',
  'Desvio-padrão': 'DP',
  'Erro-padrão da média': 'EP',
  'Erro-padrão': 'EP',
  'Sig.': 'p',
  'Sig. (bilateral)': 'p (bilat.)',
  'Diferença média': 'ΔM',
  'Erro-padrão da diferença': 'EP(ΔM)',
  'R² ajustado': 'R² aj.',
  'Soma dos quadrados': 'SQ',
  'Quadrado médio': 'QM',
  'Percentagem': '%',
  'Percentagem válida': '% válida',
  'Percentagem acumulada': '% acumulada',
  'Variância': 'Var.'
};
const NL: Record<string, string> = {
  'Gemiddelde': 'M',
  'Standaarddeviatie': 'SD',
  'Standaardfout van het gemiddelde': 'SE',
  'Standaardfout': 'SE',
  'Significantie': 'p',
  'Significantie (tweezijdig)': 'p (2-zijdig)',
  'Gemiddeld verschil': 'ΔM',
  'Standaardfout van het verschil': 'SE(ΔM)',
  'Gecorrigeerde R²': 'gecorr. R²',
  'Som van kwadraten': 'SS',
  'Gemiddelde kwadraatsom': 'MS',
  'Percentage': '%',
  'Percentage geldig': '% geldig',
  'Cumulatief percentage': 'Cumulatief %',
  'Variantie': 'Var.'
};
const EL: Record<string, string> = {
  'Μέσος όρος': 'M',
  'Τυπική απόκλιση': 'SD',
  'Τυπικό σφάλμα του μέσου όρου': 'SE',
  'Τυπικό σφάλμα': 'SE',
  'Τιμή p': 'p',
  'Τιμή p (αμφίπλευρη)': 'p (αμφ.)',
  'Διαφορά μέσων όρων': 'ΔM',
  'Τυπικό σφάλμα της διαφοράς': 'SE(ΔM)',
  'Προσαρμοσμένο R²': 'προσαρμ. R²',
  'Άθροισμα τετραγώνων': 'SS',
  'Μέσο τετράγωνο': 'MS',
  'Ποσοστό': '%',
  'Έγκυρο ποσοστό': 'Έγκυρο %',
  'Αθροιστικό ποσοστό': 'Αθροιστικό %'
};
const HU: Record<string, string> = {
  'Átlag': 'M',
  'Szórás': 'SD',
  'Az átlag standard hibája': 'SE',
  'Standard hiba': 'SE',
  'p-érték': 'p',
  'p-érték (kétoldalas)': 'p (2-old.)',
  'Átlagkülönbség': 'ΔM',
  'A különbség standard hibája': 'SE(ΔM)',
  'R-négyzet': 'R²',
  'Korrigált R-négyzet': 'korr. R²',
  'Négyzetösszeg': 'SS',
  'Átlagos négyzetösszeg': 'MS',
  'Százalék': '%',
  'Érvényes százalék': 'Érvényes %',
  'Kumulatív százalék': 'Kumulatív %',
  'Variancia': 'Var.'
};
const SV: Record<string, string> = {
  'Medelvärde': 'M',
  'Standardavvikelse': 'SD',
  'Standardfel för medelvärdet': 'SE',
  'Standardfel': 'SE',
  'Sig.': 'p',
  'Sig. (tvåsidig)': 'p (2-sid.)',
  'Medelvärdesdifferens': 'ΔM',
  'Standardfel för differensen': 'SE(ΔM)',
  'Justerad R²': 'just. R²',
  'Kvadratsumma': 'SS',
  'Medelkvadrat': 'MS',
  'Procent': '%',
  'Giltig procent': 'Giltig %',
  'Kumulativ procent': 'Kumulativ %',
  'Varians': 'Var.'
};
const PL: Record<string, string> = {
  'Średnia': 'M',
  'Odchylenie standardowe': 'SD',
  'Błąd standardowy średniej': 'SE',
  'Błąd standardowy': 'SE',
  'Istotność': 'p',
  'Istotność (dwustronna)': 'p (2-str.)',
  'Różnica średnich': 'ΔM',
  'Błąd standardowy różnicy': 'SE(ΔM)',
  'R kwadrat': 'R²',
  'Skorygowane R kwadrat': 'skor. R²',
  'Suma kwadratów': 'SS',
  'Średni kwadrat': 'MS',
  'Procent': '%',
  'Procent ważnych': '% ważnych',
  'Procent skumulowany': '% skumulowany'
};
const UK: Record<string, string> = {
  'Середнє': 'M',
  'Станд. відхилення': 'SD',
  'Стандартна похибка середнього': 'SE',
  'Стандартна похибка': 'SE',
  'Знач.': 'p',
  'Знач. (двостороння)': 'p (2-стор.)',
  'Різниця середніх': 'ΔM',
  'Стандартна похибка різниці': 'SE(ΔM)',
  'Скоригований R²': 'скор. R²',
  'Сума квадратів': 'SS',
  'Середній квадрат': 'MS',
  'Відсоток': '%',
  'Дійсний відсоток': 'Дійсний %',
  'Накопичений відсоток': 'Накопичений %',
  'Дисперсія': 'Дисп.'
};
const RO: Record<string, string> = {
  'Medie': 'M',
  'Abatere standard': 'SD',
  'Eroarea standard a mediei': 'SE',
  'Eroare standard': 'SE',
  'Sig.': 'p',
  'Sig. (bilaterală)': 'p (bilat.)',
  'Diferența mediilor': 'ΔM',
  'Eroarea standard a diferenței': 'SE(ΔM)',
  'R² ajustat': 'R² aj.',
  'Suma pătratelor': 'SS',
  'Media pătratelor': 'MS',
  'Procent': '%',
  'Procent valid': '% valid',
  'Procent cumulat': '% cumulat',
  'Varianță': 'Var.'
};
const CS: Record<string, string> = {
  'Průměr': 'M',
  'Směrodatná odchylka': 'SD',
  'Standardní chyba průměru': 'SE',
  'Standardní chyba': 'SE',
  'Významnost': 'p',
  'Významnost (oboustranná)': 'p (2-st.)',
  'Rozdíl průměrů': 'ΔM',
  'Standardní chyba rozdílu': 'SE(ΔM)',
  'Upravené R²': 'upr. R²',
  'Součet čtverců': 'SS',
  'Průměrný čtverec': 'MS',
  'Procento': '%',
  'Platné procento': 'Platné %',
  'Kumulativní procento': 'Kumulativní %'
};
const BG: Record<string, string> = {
  'Средна стойност': 'M',
  'Стандартно отклонение': 'SD',
  'Стандартна грешка на средната': 'SE',
  'Стандартна грешка': 'SE',
  'Знач.': 'p',
  'Знач. (двустранна)': 'p (2-стр.)',
  'Разлика на средните': 'ΔM',
  'Стандартна грешка на разликата': 'SE(ΔM)',
  'Коригиран R²': 'кор. R²',
  'Сума на квадратите': 'SS',
  'Среден квадрат': 'MS',
  'Процент': '%',
  'Валиден процент': 'Валиден %',
  'Кумулативен процент': 'Кумулативен %',
  'Дисперсия': 'Дисп.'
};
const XX: Record<string, string> = {
  '[Mëáñ]': '[M]',
  '[Std. Dëvïátïöñ ······]': '[SD]',
  '[S.É. Mëáñ ····]': '[SE]',
  '[Std. Érrör ····]': '[SE]',
  '[Sïg.]': '[p]',
  '[Sïg. (2-táïlëd) ······]': '[p (2-t.)]',
  '[Mëáñ Dïffërëñçë ······]': '[M diff.]',
  '[Std. Érrör Dïffërëñçë ·········]': '[SE diff.]',
  '[R Sqüárë ····]': '[R²]',
  '[Ådjüstëd R Sqüárë ·······]': '[adj. R²]',
  '[Süm öf Sqüárës ······]': '[SS]',
  '[Mëáñ Sqüárë ·····]': '[MS]',
  '[Përçëñt ···]': '[%]',
  '[Válïd Përçëñt ······]': '[Valid %]',
  '[Cümülátïvë Përçëñt ········]': '[Cum. %]',
  '[Várïáñçë ····]': '[Var.]'
};
/** Prüfsprache xr (RTL): wie das Wörterbuch output/xr-dict.json, englische Köpfe mit arabischen Buchstaben davor und dahinter. */
const XR: Record<string, string> = Object.fromEntries(Object.entries(EN).map(([k, v]) => [`[ابت ${k} تبا]`, `[ابت ${v} تبا]`]));
export const KURZFORMEN: Record<string, Record<string, string>> = {
  de: DE, en: EN, fr: FR, es: ES, it: IT, pt: PT, nl: NL, el: EL, hu: HU, sv: SV, pl: PL, uk: UK, ro: RO, cs: CS, bg: BG, xx: XX, xr: XR
};

/** Die Kurzform eines Tabellenkopfs in dieser Sprache, oder null (es gibt keine, dann bleibt der Kopf, wie er ist). */
export function kurzform(text: string, sprache: string): string | null {
  const k = KURZFORMEN[sprache]?.[text.trim()];
  return k && k !== text.trim() ? k : null;
}
