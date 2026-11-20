/**
 * Seitenleiste der Psychologie-Fragen `psy2-` (Stufe 6.3 „nutzen“): Frage-id → Hilfe-Artikel. Eigene kleine Datei, damit die Fragen selbst erst bei Bedarf laden;
 * `fragen-seite.ts` fügt sie ein. Der Test fragen.test.ts prüft: Jede Frage hat einen Eintrag, jedes Ziel existiert.
 */
export const SEITE_PSY2: Record<string, string> = {
  'psy2-fe-lesen': 'f-test', 'psy2-fe-posthoc': 'post-hoc', 'psy2-fe-welch': 'welch-anova',
  'psy2-fe-eta': 'eta-quadrat', 'psy2-fe-kruskal': 'rangtest', 'psy2-fe-klein': 'signifikanz',
  'psy2-an-gepaart': 'gepaarte-messung', 'psy2-an-kontrolle': 'p-wert', 'psy2-an-ancova': 'kovarianzanalyse',
  'psy2-an-steigung': 'kovarianzanalyse', 'psy2-an-signifikant': 'signifikanz', 'psy2-an-mitte': 'regression-zur-mitte',
  'psy2-sa-korr': 'korrelation', 'psy2-sa-beta': 'beta', 'psy2-sa-r2': 'r-quadrat',
  'psy2-sa-anova': 'eta-quadrat', 'psy2-sa-fehlend': 'fehlende-werte-little-imputation', 'psy2-ko-alpha': 'reliabilitaet',
  'psy2-ko-schwach': 'trennschaerfe', 'psy2-ko-ohne': 'trennschaerfe', 'psy2-ko-null': 'antwortstufen',
  'psy2-ko-itemzahl': 'inter-item-korrelation', 'psy2-ko-gueltig': 'validitaet', 'psy2-mod-gruppen': 'p-wert',
  'psy2-mod-wechsel': 'moderation', 'psy2-mod-verdeckt': 'moderation',
  'psy2-med-pfade': 'mediation', 'psy2-med-direkt': 'mediation', 'psy2-med-bootstrap': 'mediation',
  'psy2-med-kausal': 'mediation', 'psy2-fr-prozent': 'chi-quadrat-unabhaengigkeit', 'psy2-fr-v': 'cramers-v',
  'psy2-fr-or': 'odds-ratio', 'psy2-fr-neuro': 'odds-ratio', 'psy2-fr-extra5': 'odds-ratio',
  'psy2-fr-ursache': 'zusammenhang-ursache', 'psy2-bf-kmo': 'explorative-faktorenanalyse', 'psy2-bf-umpolen': 'umpolen',
  'psy2-bf-negativ': 'umpolen', 'psy2-bf-omega': 'omega', 'psy2-bf-fehlend': 'fehlende-werte-little-imputation',
  'psy2-bf-trenn': 'trennschaerfe', 'psy2-wo-icc': 'icc-mehrebenen', 'psy2-wo-aufgabe': 'mehrebenen',
  'psy2-wo-wort': 'mehrebenen', 'psy2-wo-haeufig': 'p-wert', 'psy2-wo-streuung': 'mehrebenen',
  'psy2-wo-unabhaengig': 'pseudoreplikation', 'psy2-wo-gekreuzt-art': 'frage-mehrebenen', 'psy2-wo-gekreuzt-se': 'frage-mehrebenen', 'psy2-wo-gekreuzt-anteil': 'icc-mehrebenen', 'psy2-be-t-abh': 'gepaarte-messung', 'psy2-be-t-d': 'cohens-d',
  'psy2-be-t-welch': 'welch-test', 'psy2-be-a-post': 'post-hoc', 'psy2-be-a-mehrfach': 'post-hoc',
  'psy2-be-k-power': 'teststaerke', 'psy2-be-k-replik': 'p-wert', 'psy2-be-k-basis': 'falsch-positive-befunde',
  'psy2-be-m-skalen': 'mehrfaches-testen', 'psy2-be-m-stopp': 'falsch-positive-befunde', 'psy2-be-m-vorreg': 'falsch-positive-befunde',
  'psy2-be-r-rci': 'reliable-change-index', 'psy2-be-r-mitte': 'regression-zur-mitte', 'psy2-be-r-reliab': 'reliable-change-index',
  'psy2-be-r-klinisch': 'reliable-change-index', 'psy2-be-b-apa': 'ergebnissatz', 'psy2-be-w-sphaer': 'anova-messwiederholung',
  'psy2-be-w-vorteil': 'anova-messwiederholung', 'psy2-be-mo-simple': 'moderation', 'psy2-be-mo-int': 'wechselwirkung',
  'psy2-be-me-zeit': 'mediation', 'psy2-be-l-p': 'p-wert', 'psy2-be-l-sig': 'effektstaerke',
  'psy2-be-l-ki': 'konfidenzintervall', 'psy2-be-ki-null': 'konfidenzintervall', 'psy2-be-rt-wahl': 'rangtest',
  'psy2-oa-kategorien': 'frage-kategorien', 'psy2-oa-leitfaden': 'frage-kategorien', 'psy2-oa-kappa': 'kappa',
  'psy2-oa-mehrfach': 'frage-mehrfachantworten'
};
