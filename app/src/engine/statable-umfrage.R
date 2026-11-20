# Statable - R-Funktionen für Umfragegewichte mit dem R-Paket survey (Später S-D2; Fachblatt docs/fachblaetter/SPAETER-D2-UMFRAGEGEWICHTE.md, Abschnitt 0 und „Entscheidungen Opus“).
# Eigene Datei (nicht statable.R), damit die Bauer der Karten (A2 Verteilung/Kreuztabelle, B Gruppen/Regression) nicht in dieselben Zeilen schreiben. Sie wird mit statable.R geladen,
# sobald ein Verfahren das Paket survey verlangt (lib/rverfahren.svelte.ts: R_PAKETE_UMFRAGE). Am Mac läuft dieselbe Datei mit Rscript (source()).
#
# TEIL 1 (Bauer A1, Fundament): gemeinsame Bausteine `um_*` und `sp_umfrage_grund`. TEIL 2 (A2/B): `sp_umfrage_mittel`, `sp_umfrage_anteil`, `sp_umfrage_kreuz`, `sp_umfrage_gruppen`,
# `sp_umfrage_regression` - Vertrag im Kopf von app/src/lib/umfrage.test.ts.
#
# Eigenschaften, die alle Karten gleich brauchen:
#   - Design: svydesign(ids = ~1, weights = ~.sp_w) auf den Zeilen mit Gewicht > 0 (Gewicht 0 und fehlend zählen nicht und werden VOR svydesign gelöscht; negativ = Fehler).
#   - Jede Frage rechnet auf subset(Design, ok) mit ok = gültige Werte der Frage UND Auswahl - nie Zeilen löschen (Teilpopulation). Ein Design je Aufruf, nichts bleibt in R stehen.
#   - Freiheitsgrade (Entscheidung Opus 5): Fälle der Teilpopulation - 1 - (Zahl der Parameter - 1); also n - 1 beim Mittelwert und beim Anteil, n - p bei einer Regression mit p Koeffizienten.
#   - Fehler: wirft nie nach außen; die Antwort ist list(fehler_code = '…', n = …, [weitere Felder]) (Codes: siehe UmfrageFehlerCode in lib/umfrage.ts; die Oberfläche macht Sätze daraus).
#     survey schweigt in einigen Fällen (negative Gewichte, leere Gruppe, Rangmangel, Trennung): hier werden sie VOR oder aus den Warnungen der Rechnung zu Fehlern.
# SICHERHEIT (Fremde Dateien): Namen, die in eine Formel kommen, laufen durch `sp_id` (engine/statable.R; lässt nur /^[A-Za-z][A-Za-z0-9_.]*$/ durch). Statable selbst schickt nur eigene Namen (w, y, m1, a1, z, s, p01 ...);
# der Rückfall unten hat dieselbe Regel für den Lauf ohne statable.R (Test am Mac, webR-Test dieser Datei).
if (!exists('sp_id', mode = 'function')) sp_id <- function(...) {
  x <- unlist(list(...), use.names = FALSE)
  if (!length(x)) return(invisible(TRUE))
  ok <- is.character(x) && !anyNA(x) && all(nchar(x, type = 'bytes') <= 64L) && all(grepl('^[A-Za-z][A-Za-z0-9_.]*\\z', x, perl = TRUE)) &&
    !any(x %in% c('if', 'else', 'repeat', 'while', 'function', 'for', 'next', 'break', 'TRUE', 'FALSE', 'NULL', 'Inf', 'NaN', 'NA', 'NA_integer_', 'NA_real_', 'NA_character_', 'NA_complex_', 'in'))
  if (!ok) stop('unsafe name rejected')
  invisible(TRUE)
}
UM_ZEILEN_MAX <- 200000L   # Entscheidung 7: mehr Zeilen rechnet die Umfragerechnung im Browser nicht
UM_ZELLEN_MAX <- 400L      # Kreuztabelle: Zeilen x Spalten
UM_SCHWELLE_NEFF <- 0.5; UM_SCHWELLE_MAXMIN <- 10; UM_SCHWELLE_KLEIN <- 30L   # Entscheidung 6 (Faustregeln ohne Quelle)

um_lade <- function() suppressMessages(library(survey))

# Fehler mit Code und Zahlen: wird von um_ruf zur Antwort list(fehler_code = code, ...). `n`: Fälle der Frage (wenn bekannt).
um_stop <- function(code, ...) stop(structure(class = c('sp_umfrage_fehler', 'error', 'condition'), list(message = code, call = NULL, felder = c(list(fehler_code = code), list(...)))))
# Eine Rechnung mit Fehlerabfang: eigene Fehler -> list(fehler_code, ...); fremde Fehler (survey, R) -> list(fehler_code = 'unbekannt', meldung = Text). Für die Karten-Funktionen `sp_umfrage_*`.
#   Die Option survey.lonely.psu (Schicht mit einem Klumpen) wird nur für den Aufruf gesetzt (um_design) und hier am Ende immer zurückgesetzt, auch bei einem Fehler.
um_ruf <- function(expr) {
  alt <- getOption('survey.lonely.psu'); on.exit(options(survey.lonely.psu = alt), add = TRUE)
  tryCatch(expr, sp_umfrage_fehler = function(e) e$felder, error = function(e) um_fremd(e))
}
# Ein fremder Fehler (survey, R). Die Meldung von survey zu einer Schicht mit einem Klumpen (bei einer Teilpopulation erst nach dem Design) wird zum eigenen Code.
um_fremd <- function(e) {
  m <- conditionMessage(e)
  if (grepl('has only one PSU', m, fixed = TRUE)) list(fehler_code = 'einsamer-klumpen', n = 0, schichten = numeric(0))
  else list(fehler_code = 'unbekannt', meldung = m)
}

# Der Stichprobenplan der Person (Teil A des Fachblatts Umfrage-Entwurf): EINE Stelle baut das Design, alle Karten gehen über um_design. Ohne Angabe bleibt es svydesign(ids = ~1, weights = ~.sp_w) - alle alten Zahlen.
# Aufruf: entwurf = list(k = TRUE/FALSE (Klumpen), k2 = (2. Stufe), s = (Schicht), f = (Grundgesamtheit), f2 = (Grundgesamtheit 2. Stufe), einsam = NULL | 'adjust' | 'average' | 'remove' | 'certainty').
# Die Angaben stehen als Zahlen-Spalten mit festen Namen in `d`: dz_k1, dz_k2 (Klumpen, Codes), dz_s (Schicht, Codes), dz_f1, dz_f2 (Anzahlen der Grundgesamtheit); Namen und Texte aus der Datei kommen nie in den Code.
UM_EINSAME <- c('adjust', 'average', 'remove', 'certainty')
um_entwurf_lesen <- function(entwurf) {
  if (is.null(entwurf)) return(NULL)
  fl <- function(n) isTRUE(entwurf[[n]])
  e <- list(k = fl('k'), k2 = fl('k2'), s = fl('s'), f = fl('f'), f2 = fl('f2'), einsam = entwurf$einsam)
  if (!is.null(e$einsam) && !(length(e$einsam) == 1L && e$einsam %in% UM_EINSAME)) um_stop('entwurf-ungueltig')
  if ((e$k2 && !(e$k && e$f && e$f2)) || (e$f2 && !e$k2)) um_stop('entwurf-ungueltig')   # 2. Stufe nur mit 1. Stufe und beiden fpc
  if (!(e$k || e$s || e$f)) return(NULL)
  e
}
# Prüft den Plan an den Zeilen mit Gewicht (dd) und baut das Design. Fehler mit Code und Zahl; keine Zeile fällt still weg.
um_entwurf_design <- function(dd, e) {
  zahl <- function(v) suppressWarnings(as.numeric(dd[[v]]))
  noetig <- c(if (e$k) 'dz_k1', if (e$k2) 'dz_k2', if (e$s) 'dz_s', if (e$f) 'dz_f1', if (e$f2) 'dz_f2')
  bereich <- c(dz_k1 = 'klumpen', dz_k2 = 'klumpen2', dz_s = 'schicht', dz_f1 = 'fpc', dz_f2 = 'fpc2')
  for (v in noetig) {
    if (!(v %in% names(dd))) um_stop('entwurf-ungueltig')
    fehlt <- is.na(zahl(v)) | !is.finite(zahl(v))
    if (any(fehlt)) um_stop('entwurf-luecken', n = sum(fehlt), bereich = unname(bereich[v]))
  }
  n <- nrow(dd); gr <- if (e$s) zahl('dz_s') else rep(1, n); k1 <- if (e$k) zahl('dz_k1') else seq_len(n)
  paar <- unique(data.frame(g = gr, k = k1)); n_kl <- nrow(paar)
  if (e$k && n_kl < 2L) um_stop('entwurf-zu-wenig-klumpen', n = n_kl)
  je_gr <- tapply(paar$k, paar$g, length)                   # Klumpen (ohne Klumpen: Zeilen) je Schicht
  einsam <- names(je_gr)[je_gr == 1L]
  if (e$s && length(einsam) && is.null(e$einsam)) um_stop('einsamer-klumpen', n = length(einsam), schichten = utils::head(as.numeric(einsam), 20L))
  if (e$f) {                                                # Grundgesamtheit: je Schicht (ohne Schichten: für alle) ein fester Wert, nicht kleiner als die Stichprobe
    f1 <- zahl('dz_f1'); ab <- tapply(f1, gr, function(x) length(unique(x)))
    if (any(ab > 1L)) um_stop('entwurf-fpc-uneinheitlich', n = sum(ab > 1L), bereich = 'fpc')
    kleiner <- vapply(names(je_gr), function(g) f1[gr == as.numeric(g)][1] < je_gr[[g]], TRUE)
    if (any(kleiner)) um_stop('entwurf-fpc-klein', n = sum(kleiner), bereich = 'fpc')
  }
  if (e$f2) {                                               # zweite Stufe: je Klumpen ein fester Wert, nicht kleiner als die Zahl der Einheiten der 2. Stufe im Klumpen
    f2 <- zahl('dz_f2'); k2 <- zahl('dz_k2'); schluessel <- paste(gr, k1)
    ab <- tapply(f2, schluessel, function(x) length(unique(x)))
    if (any(ab > 1L)) um_stop('entwurf-fpc-uneinheitlich', n = sum(ab > 1L), bereich = 'fpc2')
    zahl2 <- tapply(k2, schluessel, function(x) length(unique(x))); f2k <- tapply(f2, schluessel, function(x) x[1])
    if (any(f2k < zahl2)) um_stop('entwurf-fpc-klein', n = sum(f2k < zahl2), bereich = 'fpc2')
  }
  options(survey.lonely.psu = if (is.null(e$einsam)) 'fail' else e$einsam)   # nur für diesen Aufruf (um_ruf stellt die Option wieder her)
  ids <- if (e$k2) ~dz_k1 + dz_k2 else if (e$k) ~dz_k1 else ~1
  fpc <- if (e$f2) ~dz_f1 + dz_f2 else if (e$f) ~dz_f1 else NULL
  args <- list(ids = ids, weights = ~.sp_w, data = dd)
  if (e$s) args$strata <- ~dz_s
  if (!is.null(fpc)) args$fpc <- fpc
  if (e$s && e$k) args$nest <- TRUE                         # eine Klumpennummer gilt nur in ihrer Schicht
  des <- do.call(survey::svydesign, args)
  list(des = des, info = list(klumpen = e$k, klumpen2 = e$k2, schicht = e$s, fpc = e$f, fpc2 = e$f2, einsam = e$einsam, n_klumpen = if (e$k) n_kl else NULL,
    n_schichten = if (e$s) length(je_gr) else NULL, n_einsam = length(einsam), df = as.numeric(survey::degf(des))))
}
um_entwurf_feld <- function(D, deff = NULL) {
  if (is.null(D$entwurf)) return(list())
  e <- D$entwurf; if (!is.null(deff) && length(deff) == 1L && is.finite(deff)) e$deff <- as.numeric(deff)
  list(entwurf = e)
}

# Gewichte prüfen und das Design bauen. `d`: data.frame mit der Gewichtsspalte `w` (Name). Rückgabe: Design und die Zeilennummern, die es trägt.
# `entwurf`: der Stichprobenplan (siehe oben); mit Replikationsgewichten (`rep`) gilt der Plan der Replikate und `entwurf` bleibt ohne Wirkung.
um_design <- function(d, w = 'w', rep = NULL, entwurf = NULL) {
  um_lade()
  if (!is.data.frame(d) || !(w %in% names(d))) um_stop('gewicht-fehlt')
  if (nrow(d) > UM_ZEILEN_MAX) um_stop('zu-viele-zeilen', n = nrow(d))
  gw <- suppressWarnings(as.numeric(d[[w]]))
  if (any(!is.na(gw) & is.finite(gw) & gw < 0)) um_stop('gewicht-negativ', n = sum(!is.na(gw) & is.finite(gw) & gw < 0))
  gw[is.na(gw) | !is.finite(gw)] <- 0                       # fehlend zählt nicht (wie pruefeGewicht in Statable)
  keep <- which(gw > 0)
  if (length(keep) < 2L) um_stop('zu-wenig', n = length(keep))
  dd <- d[keep, , drop = FALSE]; dd$.sp_w <- gw[keep]
  if (is.null(rep)) {
    ent <- um_entwurf_lesen(entwurf)
    if (is.null(ent)) return(list(des = survey::svydesign(ids = ~1, weights = ~.sp_w, data = dd), keep = keep, w = gw[keep], n_zeilen = nrow(d), rep = NULL, entwurf = NULL))
    r <- um_entwurf_design(dd, ent)
    return(list(des = r$des, keep = keep, w = gw[keep], n_zeilen = nrow(d), rep = NULL, entwurf = r$info))
  }
  r <- um_repdesign(d, dd, keep, rep)                       # Teil 3: Replikationsgewichte
  list(des = r$des, keep = keep, w = gw[keep], n_zeilen = nrow(d), rep = r$info, entwurf = NULL)
}
# Gültig = alle `vars` vorhanden (Zahl endlich, Text/Faktor nicht NA) und, wenn gegeben, die Auswahl wahr. Länge nrow(d), alle Zeilen (auch die ohne Gewicht).
# `auswahl`: Name einer 0/1-Spalte oder ein Vektor der Länge nrow(d).
um_gueltig <- function(d, vars, auswahl = NULL) {
  ok <- rep(TRUE, nrow(d))
  for (v in vars) { x <- d[[v]]; ok <- ok & !is.na(x) & (if (is.numeric(x)) is.finite(x) else TRUE) }
  if (!is.null(auswahl) && !(length(auswahl) == 1L && is.na(auswahl))) { a <- if (is.character(auswahl) && length(auswahl) == 1L) d[[auswahl]] else auswahl; ok <- ok & !is.na(a) & as.logical(a) }
  ok
}
# Teilpopulation: subset des Designs auf die Fälle mit ok (Länge nrow(d)). Mindestens 2 Fälle, sonst Fehler (survey gäbe Mittel 0 und SE 0).
um_teil <- function(D, ok) {
  if (length(ok) != D$n_zeilen) um_stop('auswahl-passt-nicht')
  o <- ok[D$keep]
  if (sum(o) < 2L) um_stop('zu-wenig', n = sum(o))
  ds <- subset(stats::update(D$des, .sp_ok = o), .sp_ok)
  list(ds = ds, n = sum(o), w = D$w[o], zeilen = D$keep[o])
}
# Designeffekt des Mittels einer Spalte der Teilpopulation (nur mit Stichprobenplan; sonst NULL): Varianz des Plans durch die Varianz bei einfacher Zufallsauswahl.
um_deff_ziel <- function(D, T, v) if (is.null(D$entwurf)) NULL else tryCatch(as.numeric(survey::deff(survey::svymean(stats::as.formula(paste0('~', v)), T$ds, deff = TRUE))), error = function(e) NULL)
um_df <- function(T, npar = 1L) as.numeric(survey::degf(T$ds)) - (npar - 1L)
# Kish: effektive Stichprobengröße (Σw)² / Σw² und Designeffekt der Gewichte n / n_eff - auf den Fällen der Frage.
um_kish <- function(w) { w <- w[w > 0]; neff <- sum(w)^2 / sum(w^2); list(n = length(w), neff = neff, deff = length(w) / neff, w_min = min(w), w_max = max(w), verhaeltnis = max(w) / min(w)) }
# Das Feld `gewicht` der Antworten: Kish und Gewichte der Fälle der Frage (Vertrag in lib/umfrage.test.ts).
um_gewicht <- function(w) { k <- um_kish(w); list(n = k$n, kish_neff = k$neff, deff_w = k$deff, w_min = k$w_min, w_max = k$w_max) }
um_hinweise <- function(k) c(if (k$neff / k$n < UM_SCHWELLE_NEFF || k$verhaeltnis > UM_SCHWELLE_MAXMIN) 'ungleiche-gewichte', if (k$n < UM_SCHWELLE_KLEIN) 'kleine-stichprobe')
# Warnungen einsammeln. Trennung/Nichtkonvergenz (survey meldet nur eine Warnung) wird mit um_trennung_pruefen zum Fehler; die binomial-Warnung zu Nicht-Ganzzahligem kommt mit
# quasibinomial nicht vor und wird ignoriert.
um_fange <- function(expr) {
  warn <- character(0); trennung <- FALSE
  wert <- withCallingHandlers(expr, warning = function(w) {
    m <- conditionMessage(w)
    if (grepl('non-integer #successes', m, fixed = TRUE)) invokeRestart('muffleWarning')
    if (grepl('did not converge|konvergierte nicht|fitted probabilities numerically 0 or 1|numerisch 0 oder 1|ran out of iterations', m)) trennung <<- TRUE   # auch die deutschen Texte (Rscript am Mac), webR meldet englisch
    warn <<- c(warn, m); invokeRestart('muffleWarning')
  })
  list(wert = wert, trennung = trennung, warnungen = unique(warn))
}
# Trennung oder Nichtkonvergenz einer mit um_fange gerechneten Regression -> Fehler (die Koeffizienten wären Unsinn, z. B. Konstante -3394).
um_trennung_pruefen <- function(r, n = NA) {
  if (isTRUE(r$trennung) || isFALSE(r$wert$converged)) um_stop('trennung', n = n)
  invisible(TRUE)
}
# Rangmangel: survey lässt eine exakt abhängige Spalte still weg. Prüfung am Modell der gültigen Fälle `ok` (Länge nrow(d)); der Fehler nennt die (erste) Spalte.
um_rang <- function(f, d, ok) {
  mm <- stats::model.matrix(f, stats::model.frame(f, d[ok, , drop = FALSE], na.action = stats::na.pass))
  q <- qr(mm)
  if (q$rank < ncol(mm)) um_stop('rangmangel', n = sum(ok), spalte = colnames(mm)[q$pivot[-seq_len(q$rank)]][1])
  invisible(TRUE)
}
# Gruppen: `gruppen` = die gewählten Codes (in der Reihenfolge von Statable). Jede braucht mindestens `min` Fälle unter den gültigen (`ok`); eine Gruppe ohne Fall -> 'gruppe-leer',
# mit weniger als min -> 'gruppe-klein'. Rückgabe: Fälle je Gruppe.
um_gruppen <- function(g, ok, gruppen = sort(unique(g[ok])), min = 2L) {
  n <- sum(ok); k <- vapply(gruppen, function(x) sum(ok & !is.na(g) & g == x), 0L)
  if (length(gruppen) < 2L) um_stop('zu-wenig-gruppen', n = n)
  i <- which(k == 0L)[1]; if (!is.na(i)) um_stop('gruppe-leer', n = n, gruppe = gruppen[i])
  i <- which(k < min)[1]; if (!is.na(i)) um_stop('gruppe-klein', n = n, gruppe = gruppen[i], n_gruppe = k[i])
  stats::setNames(k, gruppen)
}
# Anteil 0 oder 1: das Intervall ist nicht berechenbar (survey liefert beim Logit-Intervall etwa [2,6e-12; 3,0e-12] statt eines Fehlers). TRUE = Grenzfall: Satz statt Intervall.
um_anteil_grenze <- function(p) !is.finite(p) || p <= 0 || p >= 1

# ===== TEIL 2a (Bauer A2): Verteilung (Mittelwert, Anteil) und Kreuztabelle =====================================================================================================
# Formel für eine Spalte (Backticks: der Name kann Sonderzeichen enthalten).
um_f <- function(v) { sp_id(v); stats::as.formula(paste0('~', v)) }
# Einen Fehler einer einzelnen Frage (eine Variable von mehreren) mit dem Namen versehen: sp_umfrage_mittel rechnet jede Variable für sich, ein Fehler der einen stoppt die anderen nicht.
um_je <- function(name, expr) tryCatch(expr, sp_umfrage_fehler = function(e) c(list(name = name), e$felder), error = function(e) c(list(name = name), um_fremd(e)))

# Mittelwert mit t-Intervall (df = Fälle - 1, nie z) und Test gegen mu0 (t mit n - 1, nicht n - 2 wie svyttest). Alle Variablen `ys` auf EINEM Design.
um_mittel_eine <- function(d, D, y, auswahl, mu0) {
  T <- um_teil(D, um_gueltig(d, y, auswahl)); n <- T$n; yy <- as.numeric(d[[y]][T$zeilen]); df <- um_df(T); g <- um_gewicht(T$w)
  if (length(unique(yy)) == 1L)                                   # alle Werte gleich: Streuung exakt 0 (survey liefert Rundungsrauschen), kein Intervall
    return(list(name = y, n = n, df = df, mittel = yy[1], se = 0, konstant = TRUE, ki_u = NULL, ki_o = NULL, deff_survey = NULL, gewicht = g, test = NULL, cv = um_cv(yy[1], 0), n_ungew = n))
  m <- survey::svymean(um_f(y), T$ds, deff = if (is.null(D$entwurf)) 'replace' else TRUE)   # einzeln gezogen: deff = "replace" (skalenfrei, deff = TRUE hinge von der Größe der Gewichte ab); mit Stichprobenplan: deff = TRUE (Sollwerte, Gewichte sind dort Auswahlgewichte)
  mi <- as.numeric(coef(m)); se <- as.numeric(survey::SE(m)); tq <- stats::qt(0.975, df)
  e <- list(name = y, n = n, df = df, mittel = mi, se = se, konstant = FALSE, ki_u = mi - tq * se, ki_o = mi + tq * se, deff_survey = as.numeric(survey::deff(m)), gewicht = g, test = NULL, cv = um_cv(mi, se), n_ungew = n)
  if (!is.null(mu0) && length(mu0) == 1L && is.finite(mu0)) { tt <- (mi - mu0) / se; e$test <- list(mu0 = as.numeric(mu0), diff = mi - mu0, t = tt, df = df, p = 2 * stats::pt(-abs(tt), df)) }
  e
}
sp_umfrage_mittel <- function(d, ys, w = 'w', auswahl = NULL, mu0 = NULL, rep = NULL, entwurf = NULL) {
  um_ruf({
    D <- um_design(d, w, rep, entwurf); erg <- lapply(as.character(ys), function(y) um_je(y, um_mittel_eine(d, D, y, auswahl, mu0)))
    dz <- Filter(function(r) !is.null(r$deff_survey), erg); c(list(ergebnisse = erg), um_rep_feld(D), um_entwurf_feld(D, if (length(dz)) dz[[1]]$deff_survey else NULL))
  })
}

# Anteil je Kategorie: Logit-Intervall (svyciprop "logit", Voreinstellung) und Korn-Graubard ("beta"); nie Wald. Anteil 0 oder 1 (alle oder keiner der Fälle): `grenze`, kein Intervall (Satz in der Oberfläche).
sp_umfrage_anteil <- function(d, y, w = 'w', auswahl = NULL, kategorien = NULL, rep = NULL, entwurf = NULL) {
  um_ruf({
    D <- um_design(d, w, rep, entwurf); T <- um_teil(D, um_gueltig(d, y, auswahl)); n <- T$n; yy <- as.numeric(d[[y]][T$zeilen]); df <- um_df(T)
    kat <- if (is.null(kategorien)) sort(unique(yy)) else as.numeric(kategorien)
    zeilen <- lapply(kat, function(k) {
      treffer <- sum(yy == k); grenze <- treffer == 0L || treffer == n
      z <- list(wert = k, treffer = treffer, p = as.numeric(treffer == n), se = 0, df = df, grenze = grenze, wenige_faelle = FALSE, logit = NULL, beta = NULL, cv = NULL, n_ungew = n)
      if (grenze) return(z)
      sp_id(y); f <- stats::as.formula(sprintf('~as.numeric(%s == %.15g)', y, k))
      mm <- survey::svymean(f, T$ds, deff = !is.null(D$entwurf)); lg <- suppressWarnings(survey::svyciprop(f, T$ds, method = 'logit')); bt <- survey::svyciprop(f, T$ds, method = 'beta')
      cl <- as.numeric(attr(lg, 'ci')); cb <- as.numeric(attr(bt, 'ci'))
      z$p <- as.numeric(coef(mm)); z$se <- as.numeric(survey::SE(mm)); if (!is.null(D$entwurf)) z$deff <- as.numeric(survey::deff(mm)); z$wenige_faelle <- min(treffer, n - treffer) < 10L
      z$logit <- list(u = cl[1], o = cl[2]); z$beta <- list(u = cb[1], o = cb[2]); cv <- um_cv(z$p, z$se); if (!is.null(cv)) z$cv <- cv; z
    })
    k0 <- Find(function(z) !isTRUE(z$grenze), zeilen)
    dz <- if (!is.null(D$entwurf) && !is.null(k0)) k0$deff else NULL
    c(list(n = n, df = df, kategorien = zeilen, gewicht = um_gewicht(T$w), n_ungew = n), um_rep_feld(D), um_entwurf_feld(D, dz))
  })
}

# Kreuztabelle: Rao-Scott. F zweiter Ordnung (svychisq "F", Thomas-Rao-Nenner) ist der Test; chi2 erster Ordnung = F * k (survey druckt bei "Chisq" die unkorrigierte Pearson-Zahl - die wird NIE genommen).
# x2 (Pearson auf n skaliert, n = Fälle der Frage) und der mittlere Designeffekt x2 / chi2_rs1 sind nur Erläuterung. `anteile`: Zellanteile (gewichtet, Zeilen schnell) für die Selbstprüfung gegen die JS-Zählung.
sp_umfrage_kreuz <- function(d, a, b, w = 'w', auswahl = NULL, rep = NULL, entwurf = NULL) {
  um_ruf({
    D <- um_design(d, w, rep, entwurf); ok <- um_gueltig(d, c(a, b), auswahl); T <- um_teil(D, ok); n <- T$n
    za <- as.numeric(d[[a]][T$zeilen]); zb <- as.numeric(d[[b]][T$zeilen]); ra <- sort(unique(za)); cb <- sort(unique(zb))
    if (length(ra) < 2L || length(cb) < 2L) um_stop('eine-stufe', n = n, zeilenstufen = length(ra), spaltenstufen = length(cb))
    if (length(ra) * length(cb) > UM_ZELLEN_MAX) um_stop('zu-viele-zellen', n = n, zellen = length(ra) * length(cb))
    # Stufen nur aus den Fällen der Frage (eine Stufe, die in der Teilpopulation fehlt, gäbe eine leere Zeile): als Faktoren ins Design, dann Teilpopulation
    fa <- factor(as.numeric(d[[a]])[D$keep], levels = ra); fb <- factor(as.numeric(d[[b]])[D$keep], levels = cb); o <- ok[D$keep]
    ds <- subset(stats::update(D$des, .sp_a = fa, .sp_b = fb, .sp_ok = o), .sp_ok); f <- ~.sp_a + .sp_b
    rf <- survey::svychisq(f, ds, statistic = 'F'); rc <- survey::svychisq(f, ds, statistic = 'Chisq')
    k <- (length(ra) - 1L) * (length(cb) - 1L); fw <- as.numeric(rf$statistic); chi2 <- fw * k
    ws <- tapply(T$w, list(factor(za, levels = ra), factor(zb, levels = cb)), sum); ws[is.na(ws)] <- 0
    pm <- ws / sum(ws); E <- outer(rowSums(pm), colSums(pm)); x2 <- n * sum((pm - E)^2 / E)
    zn <- as.numeric(table(factor(za, levels = ra), factor(zb, levels = cb)))   # ungewichtete Fälle je Zelle (Zeilen schnell, wie `anteile`)
    cz <- um_zellen_se(ds, length(pm), n)
    c(list(n = n, k = k, df = um_df(T), x2 = x2, delta_mittel = if (chi2 > 0) x2 / chi2 else NA_real_, f = fw, ndf = as.numeric(rf$parameter[1]), ddf = as.numeric(rf$parameter[2]), p_f = as.numeric(rf$p.value),
      chi2_rs1 = chi2, df_chi2 = k, p_chi2 = as.numeric(rc$p.value),
      zellen = list(zeilen = length(ra), spalten = length(cb), n_zellen = length(pm), leer = sum(pm == 0), duenn_anteil = mean(n * E < 5)), gewicht = um_gewicht(T$w), anteile = as.numeric(pm),
      n_ungew = n, faelle_zellen = zn, se_zellen = cz$se, cv_zellen = if (is.null(cz$se)) NULL else um_cvs(as.numeric(pm), cz$se)), um_rep_feld(D), um_entwurf_feld(D, if (chi2 > 0) x2 / chi2 else NULL))
  })
}

# Zustand des Designs für die Fußzeile und die Warnungen: Fälle der Frage (`vars`, `auswahl`), Kish, Hinweise, Freiheitsgrade (Mittelwert/Anteil: n - 1), survey-Version.
# Fehler (mehr als 200 000 Zeilen, negative Gewichte, weniger als 2 gültige Fälle): list(fehler_code = '…', n = …).
sp_umfrage_grund <- function(d, w = 'w', vars = character(0), auswahl = NULL, entwurf = NULL) {
  um_ruf({
    D <- um_design(d, w, NULL, entwurf); T <- um_teil(D, um_gueltig(d, vars, auswahl)); k <- um_kish(T$w)
    c(list(n_zeilen = D$n_zeilen, n_gewicht = length(D$keep), n = T$n, neff = k$neff, deff_gewichte = k$deff, w_min = k$w_min, w_max = k$w_max, verhaeltnis = k$verhaeltnis,
      df = um_df(T), hinweise = as.list(um_hinweise(k)), survey = as.character(utils::packageVersion('survey'))), um_entwurf_feld(D))
  })
}

# ======================================================================================================================================================================================
# TEIL 2b (Bauer B): Gruppenvergleich und Regression. Aufrufe und Antworten: Vertrag im Kopf von app/src/lib/umfrage.test.ts. Alle Zahlen der Antwort sind unbenannte Vektoren (as.numeric).
# ======================================================================================================================================================================================
UM_PRAED_MAX <- 20L        # Regression: mehr Prädiktoren rechnet die Umfragerechnung nicht
UM_GRUPPEN_MAX <- 12L      # Gruppenvergleich: mehr Stufen werden nicht angeboten (Oberfläche); hier nur als Schutz
um_t <- function(est, se, df, p = 0.975) { tq <- stats::qt(p, df); c(est - tq * se, est + tq * se) }   # t-Intervall (nie z)
um_bq <- function(x) { sp_id(x); x }                                                               # Spaltennamen in Formeln: nur sichere Namen (sp_id wirft sonst)

# Gruppenvergleich. `gruppen` = die gewählten Codes in der Reihenfolge von Statable (Gruppe 1 zuerst). Zwei Gruppen: designbasierter t-Test, Differenz ERSTE minus ZWEITE Gruppe (survey rechnet
# zweite minus erste); ab drei Gruppen nur der Wald-F-Test auf alle Unterschiede (regTermTest), keine Paarvergleiche. Student/Welch/Levene gibt es hier nicht.
sp_umfrage_gruppen <- function(d, y, g, gruppen, w, auswahl = NULL, entwurf = NULL) {
  um_ruf({
    gruppen <- as.numeric(gruppen); K <- length(gruppen)
    d$.y <- as.numeric(d[[y]]); d$.gc <- as.numeric(d[[g]]); d$.g <- factor(d$.gc, levels = gruppen)
    D <- um_design(d, w, NULL, entwurf)
    ok <- um_gueltig(d, c(y, g), auswahl) & !is.na(d$.g)
    T <- um_teil(D, ok); n <- T$n
    okk <- ok[D$keep]; dk <- d[D$keep, , drop = FALSE]
    um_gruppen(dk$.gc, okk, gruppen, 2L)
    if (stats::var(dk$.y[okk]) == 0) um_stop('konstant', n = n)
    gm <- lapply(seq_len(K), function(i) {
      Ti <- um_teil(D, ok & d$.gc == gruppen[i])
      m <- survey::svymean(~.y, Ti$ds); mi <- as.numeric(stats::coef(m)); se <- as.numeric(survey::SE(m)); df <- um_df(Ti); ci <- um_t(mi, se, df)
      list(code = gruppen[i], n = Ti$n, mittel = mi, se = se, df = df, ki_u = ci[1], ki_o = ci[2])
    })
    m <- survey::svyglm(.y ~ .g, T$ds)
    if (K == 2L) {
      b <- as.numeric(stats::coef(m))[2]; se <- as.numeric(sqrt(diag(stats::vcov(m))))[2]; df <- um_df(T, 2L)
      diff <- -b; t <- diff / se; ci <- um_t(diff, se, df)                                   # Gruppe 1 - Gruppe 2 (survey: zweite - erste)
      test <- list(art = 't', gruppe1 = gruppen[1], gruppe2 = gruppen[2], diff = diff, se = se, t = t, df = df, p = 2 * stats::pt(-abs(t), df), ki_u = ci[1], ki_o = ci[2])
    } else {
      rt <- survey::regTermTest(m, ~.g)
      test <- list(art = 'wald-f', f = as.numeric(rt$Ftest), ndf = as.numeric(rt$df), ddf = as.numeric(rt$ddf), p = as.numeric(rt$p))
    }
    c(list(n = n, k = K, gruppen = gm, test = test, gewicht = um_gewicht(T$w)), um_entwurf_feld(D, um_deff_ziel(D, T, '.y')))
  })
}

# Lineare und logistische Regression (svyglm; logistisch quasibinomial). `praed` = Spaltennamen (Zahlen; Gruppen-Spalten sind vorher in 0/1-Hilfsspalten zerlegt), `logistik`: y ist 0/1.
# Koeffizientennamen: "(Intercept)" und die Namen der Prädiktoren. Rangmangel und Trennung werden zu Fehlern (survey schweigt oder warnt nur); gewichtetes R² nur beschreibend.
sp_umfrage_regression <- function(d, y, praed, logistik, w, auswahl = NULL, entwurf = NULL) {
  um_ruf({
    pr <- as.character(praed); p <- length(pr) + 1L; lg <- isTRUE(logistik)
    d$.y <- as.numeric(d[[y]])
    D <- um_design(d, w, NULL, entwurf)
    dk <- d[D$keep, , drop = FALSE]; ok <- um_gueltig(d, c(y, pr), auswahl); okk <- ok[D$keep]; n <- sum(okk)
    if (length(pr) > UM_PRAED_MAX) um_stop('zu-viele-praediktoren', n = n, praediktoren = length(pr))
    if (n - p < 1L) um_stop('zu-wenig', n = n)
    yk <- as.numeric(dk[[y]])
    if (lg && length(unique(yk[okk])) != 2L) um_stop('eine-kategorie', n = n)
    if (!lg && stats::var(yk[okk]) == 0) um_stop('konstant', n = n)
    frm <- stats::as.formula(paste('.y ~', paste(um_bq(pr), collapse = ' + ')))
    um_rang(frm, dk, okk)
    T <- um_teil(D, ok); ds <- T$ds
    # do.call: svyglm wertet seinen Aufruf in der eigenen Umgebung aus; Formel, Familie und Schwelle müssen als Werte im Aufruf stehen (nicht als Namen).
    # Logistisch zwei Läufe: der erste mit der Voreinstellung zeigt Trennung als Warnung (mit enger Schwelle würde auch die Trennung "konvergieren"); der zweite mit enger Abbruchschwelle
    # gibt die Zahlen, die nicht von der Konvergenztoleranz abhängen.
    if (lg) um_trennung_pruefen(um_fange(do.call(survey::svyglm, list(frm, ds, family = stats::quasibinomial()))), n)
    r <- um_fange(if (lg) do.call(survey::svyglm, list(frm, ds, family = stats::quasibinomial(), control = stats::glm.control(epsilon = 1e-10, maxit = 200L))) else do.call(survey::svyglm, list(frm, ds)))
    if (lg) um_trennung_pruefen(r, n)
    m <- r$wert
    b <- as.numeric(stats::coef(m)); se <- as.numeric(sqrt(diag(stats::vcov(m)))); df <- um_df(T, p); tq <- stats::qt(.975, df)
    nm <- c('(Intercept)', pr)
    if (any(!is.finite(c(b, se)))) um_stop(if (lg) 'trennung' else 'rangmangel', n = n, spalte = pr[1])
    koef <- lapply(seq_len(p), function(i) {
      z <- list(name = nm[i], b = b[i], se = se[i], t = b[i] / se[i], p = 2 * stats::pt(-abs(b[i] / se[i]), df), ki_u = b[i] - tq * se[i], ki_o = b[i] + tq * se[i])
      if (lg) c(z, list(or = exp(b[i]), or_u = exp(b[i] - tq * se[i]), or_o = exp(b[i] + tq * se[i]))) else z
    })
    rt <- survey::regTermTest(m, stats::as.formula(paste('~', paste(um_bq(pr), collapse = ' + '))))
    ges <- list(f = as.numeric(rt$Ftest), ndf = as.numeric(rt$df), ddf = as.numeric(rt$ddf), p = as.numeric(rt$p))
    aus <- list(n = n, df = df, koef = koef, gesamt = ges)
    if (lg) aus$ereignisse <- sum(yk[okk] == 1)
    else {
      wo <- D$w[okk]; X <- cbind(1, as.matrix(dk[okk, pr, drop = FALSE])); e <- yk[okk] - as.vector(X %*% b)
      aus$r2_gewichtet <- 1 - sum(wo * e^2) / sum(wo * (yk[okk] - sum(wo * yk[okk]) / sum(wo))^2)
    }
    c(aus, list(npar = p, gewicht = um_gewicht(T$w), warnungen = I(as.character(r$warnungen))), um_entwurf_feld(D, um_deff_ziel(D, T, '.y')))
  })
}

# ======================================================================================================================================================================================
# TEIL 3 (Paket M4, Genauigkeit gewichteter Ergebnisse): Hochrechnung (svytotal), Variationskoeffizient (CV) und ungewichtetes n, Replikationsgewichte, Kalibrieren (GREG).
# Fachblatt docs/fachblaetter/MIKRODATEN-2026-10-24.md, Abschnitt M4. Aufrufe und Antworten: lib/genauigkeit.ts und engine/genauigkeit.webr.test.ts. Zahlen der Antwort sind unbenannte Vektoren.
#   CV = SE / |Schätzwert| (NULL, wenn der Schätzwert 0 ist); `n_ungew` = ungewichtete Fälle der Frage (bei Kategorien je Kategorie `n_ungew` = Treffer).
#   Replikationsgewichte: `rep = list(anfang = 'rw', typ = 'bootstrap', fay = NULL, scale = NULL, rscales = NULL)`; die Spalten heißen anfang + Zahl (rw1 ... rw250, Reihenfolge nach der Zahl).
#   Das Design heißt dann svrepdesign(..., mse = TRUE); ohne `scale` gilt die survey-Voreinstellung des Typs (bootstrap 1/(R - 1), JK1 (R - 1)/R, BRR 1/R, Fay 1/(R (1 - rho)^2)).
#   Freiheitsgrade: survey::degf des Designs (Rang der Replikationsgewichte - 1), wie in Teil 1 mit der Teilpopulation.
# ======================================================================================================================================================================================
UM_REP_TYPEN <- c('bootstrap', 'JK1', 'BRR', 'Fay')
UM_REP_MAX <- 1000L          # mehr Replikationsspalten rechnet Statable nicht
UM_REP_ZAHLEN_MAX <- 1e7     # Zeilen x Replikationsspalten (Speicher im Browser)
UM_KAL_MERKMALE_MAX <- 3L
UM_KAL_STUFEN_MAX <- 100L
UM_KAL_TOL <- 1e-6           # erreichte Sollsumme: relative Abweichung, bezogen auf die Gesamtzahl

um_cv <- function(est, se) if (length(est) == 1L && is.finite(est) && is.finite(se) && est != 0) as.numeric(se / abs(est)) else NULL
um_cvs <- function(est, se) ifelse(is.finite(est) & is.finite(se) & est != 0, se / abs(est), NA_real_)
um_rep_feld <- function(D) if (is.null(D$rep)) list() else list(rep = D$rep)
# Zellanteile der Kreuztabelle mit SE (ds hat .sp_a, .sp_b; Zellen x Fälle zu groß: keine SE, NULL)
um_zellen_se <- function(ds, zellen, n) {
  if (zellen * n > 5e6) return(list(se = NULL))
  m <- survey::svymean(~interaction(.sp_a, .sp_b), ds); list(se = as.numeric(survey::SE(m)))
}

# Replikationsspalten: Namen = anfang + Ziffern, nach der Zahl geordnet.
um_rep_spalten <- function(d, anfang) {
  sp_id(anfang)
  nm <- names(d); ok <- startsWith(nm, anfang) & grepl('^[0-9]+$', substring(nm, nchar(anfang) + 1L))
  nm <- nm[ok]; nm[order(as.numeric(substring(nm, nchar(anfang) + 1L)))]
}
um_zahl_opt <- function(x, code) { if (is.null(x)) return(NULL); x <- suppressWarnings(as.numeric(x)); if (!length(x) || any(!is.finite(x)) || any(x <= 0)) um_stop(code); x }
# Das Replikationsdesign der Zeilen `keep` (dd: die Zeilen mit Gewicht > 0 samt .sp_w).
um_repdesign <- function(d, dd, keep, rep) {
  typ <- as.character(rep$typ)
  if (length(typ) != 1L || !(typ %in% UM_REP_TYPEN)) um_stop('rep-typ')
  cols <- um_rep_spalten(d, as.character(rep$anfang))
  if (length(cols) < 2L) um_stop('rep-fehlt', n = length(cols))
  if (length(cols) > UM_REP_MAX || length(keep) * length(cols) > UM_REP_ZAHLEN_MAX) um_stop('rep-zu-gross', n = length(cols), zeilen = length(keep))
  rw <- vapply(cols, function(cn) suppressWarnings(as.numeric(dd[[cn]])), numeric(nrow(dd)))
  if (!is.matrix(rw)) rw <- matrix(rw, nrow = nrow(dd))
  if (any(!is.finite(rw)) || any(rw < 0)) um_stop('rep-ungueltig', n = length(cols))
  args <- list(variables = dd, repweights = rw, weights = dd$.sp_w, type = typ, mse = TRUE)
  if (typ == 'Fay') { f <- suppressWarnings(as.numeric(rep$fay)); if (length(f) != 1L || !is.finite(f) || f < 0 || f >= 1) um_stop('rep-fay'); args$rho <- f }
  sc <- um_zahl_opt(rep$scale, 'rep-scale'); if (!is.null(sc)) { if (length(sc) != 1L) um_stop('rep-scale'); args$scale <- sc }
  rs <- um_zahl_opt(rep$rscales, 'rep-scale'); if (!is.null(rs)) { if (length(rs) != length(cols)) um_stop('rep-scale'); args$rscales <- rs }
  des <- suppressWarnings(do.call(survey::svrepdesign, args))   # survey rät bei JK1 ohne scale (Warnung); der Typ bestimmt die Voreinstellung
  list(des = des, info = list(typ = typ, n_rep = length(cols), scale = as.numeric(des$scale), mse = TRUE))
}

# Eine Zeile einer Hochrechnung: Schätzwert, SE, KI (t, df), CV, ungewichtete Fälle. Nullfall (kein Treffer): Wert 0, kein Intervall.
um_total_zeile <- function(f, ds, df, treffer) {
  if (treffer == 0L) return(list(total = 0, se = 0, ki_u = 0, ki_o = 0, cv = NULL, n_ungew = 0L, grenze = TRUE))
  m <- survey::svytotal(f, ds); est <- as.numeric(coef(m)); se <- as.numeric(survey::SE(m)); ci <- um_t(est, se, df)
  list(total = est, se = se, ki_u = ci[1], ki_o = ci[2], cv = um_cv(est, se), n_ungew = as.integer(treffer), grenze = FALSE)
}
# Hochrechnung. art 'kategorien': Anzahl in der Grundgesamtheit je Kategorie der Spalte y (Codes; `kategorien` = die gewünschten, sonst alle) und `gesamt` (alle gültigen Fälle);
# art 'summe': Summe der Zahlenspalte y. Auswahl = Teilpopulation wie überall; Fälle der Frage = gültig in y und Auswahl.
sp_umfrage_total <- function(d, y, w = 'w', auswahl = NULL, art = 'kategorien', kategorien = NULL, rep = NULL, entwurf = NULL) {
  um_ruf({
    art <- as.character(art)
    if (length(art) != 1L || !(art %in% c('kategorien', 'summe'))) um_stop('art-unbekannt')
    D <- um_design(d, w, rep, entwurf); T <- um_teil(D, um_gueltig(d, y, auswahl)); n <- T$n; yy <- as.numeric(d[[y]][T$zeilen]); df <- um_df(T)
    aus <- list(art = art, n = n, n_ungew = n, df = df, gewicht = um_gewicht(T$w))
    if (art == 'summe') {
      aus$summe <- um_total_zeile(um_f(y), T$ds, df, n)
      if (length(unique(yy)) == 1L && yy[1] == 0) aus$summe$grenze <- TRUE
    } else {
      kat <- if (is.null(kategorien)) sort(unique(yy)) else as.numeric(kategorien)
      sp_id(y)
      aus$kategorien <- lapply(kat, function(k) c(list(wert = k), um_total_zeile(stats::as.formula(sprintf('~as.numeric(%s == %.15g)', y, k)), T$ds, df, sum(yy == k))))
      aus$gesamt <- um_total_zeile(~.sp_eins, update(T$ds, .sp_eins = 1), df, n)
    }
    c(aus, um_rep_feld(D), um_entwurf_feld(D))
  })
}

# Kalibrieren (GREG, linear): calibrate(design, ~ f1 + f2 + f3, population = Sollsummen, calfun = 'linear', bounds). `merkmale`: Namen von 1-3 Spalten mit Codes 1, 2, 3 ...;
# `population`: Liste, je Merkmal ein Vektor der Sollsummen der Codes 1 ... K (Zahlen, keine Anteile); `gesamt`: Gesamtzahl der Grundgesamtheit (NULL = Summe des ersten Rands; alle Ränder müssen
# diese Summe haben); `bounds`: NULL (keine Grenzen) oder c(unten, oben) für den Faktor neues / altes Gewicht (survey: Grenzen von g, unten < 1 < oben).
# Zeilen ohne Gewicht (0, fehlend) oder mit ungültigem Code bekommen kein neues Gewicht (NA). Negative Gewichte nach der linearen Kalibrierung: kein Fehler, Hinweis 'negative-gewichte'
# (mit 'begrenzt-kalibrieren', wenn noch keine Grenzen gesetzt waren). Die Sollsummen werden NACH der Rechnung nachgemessen (`max_abweichung`); weicht eine ab, ist es ein Fehler.
sp_umfrage_kalibrieren <- function(d, w = 'w', merkmale = character(0), population = list(), gesamt = NULL, bounds = NULL) {
  um_ruf({
    um_lade()
    if (!is.data.frame(d) || !(w %in% names(d))) um_stop('gewicht-fehlt')
    if (nrow(d) > UM_ZEILEN_MAX) um_stop('zu-viele-zeilen', n = nrow(d))
    mm <- as.character(merkmale); J <- length(mm)
    if (J < 1L || J > UM_KAL_MERKMALE_MAX || length(population) != J) um_stop('merkmale', n = J)
    for (m in mm) { sp_id(m); if (!(m %in% names(d))) um_stop('merkmale', n = J) }
    gw <- suppressWarnings(as.numeric(d[[w]]))
    if (any(!is.na(gw) & is.finite(gw) & gw < 0)) um_stop('gewicht-negativ', n = sum(!is.na(gw) & is.finite(gw) & gw < 0))
    gw[is.na(gw) | !is.finite(gw)] <- 0
    pop <- lapply(population, function(p) suppressWarnings(as.numeric(p)))
    for (j in seq_len(J)) { p <- pop[[j]]; if (length(p) < 2L || length(p) > UM_KAL_STUFEN_MAX || any(!is.finite(p)) || any(p < 0)) um_stop('rand-ungueltig', merkmal = j) }
    N <- if (is.null(gesamt)) sum(pop[[1]]) else suppressWarnings(as.numeric(gesamt))
    if (length(N) != 1L || !is.finite(N) || N <= 0) um_stop('rand-ungueltig', merkmal = 0L)
    for (j in seq_len(J)) if (abs(sum(pop[[j]]) - N) > UM_KAL_TOL * N) um_stop('raender-summen', merkmal = j, summe = sum(pop[[j]]), gesamt = N)
    code <- lapply(seq_len(J), function(j) { x <- suppressWarnings(as.numeric(d[[mm[j]]])); x[!is.finite(x) | x != round(x) | x < 1 | x > length(pop[[j]])] <- NA_real_; x })
    gueltig <- gw > 0; for (j in seq_len(J)) gueltig <- gueltig & !is.na(code[[j]])
    zeilen <- which(gueltig)
    if (length(zeilen) < 2L) um_stop('zu-wenig', n = length(zeilen))
    # Stufen ohne Fall: Sollsumme > 0 -> Fehler; Sollsumme 0 -> Stufe entfällt
    fak <- list(); sollen <- list()
    for (j in seq_len(J)) {
      z <- code[[j]][zeilen]; K <- length(pop[[j]]); treffer <- vapply(seq_len(K), function(k) sum(z == k), 0L)
      i <- which(treffer == 0L & pop[[j]] > 0)[1]; if (!is.na(i)) um_stop('kategorie-ohne-stichprobe', n = length(zeilen), merkmal = j, kategorie = i)
      bleib <- which(treffer > 0L)
      if (length(bleib) < 2L) um_stop('merkmale', n = j)           # ein Merkmal mit nur einer besetzten Stufe wäre schon durch die Gesamtzahl bestimmt
      fak[[j]] <- factor(z, levels = bleib); sollen[[j]] <- pop[[j]][bleib]
    }
    dd <- data.frame(.sp_w = gw[zeilen]); for (j in seq_len(J)) dd[[paste0('.sp_f', j)]] <- fak[[j]]
    frm <- stats::as.formula(paste('~', paste(paste0('.sp_f', seq_len(J)), collapse = ' + ')))
    X <- stats::model.matrix(frm, dd)
    if (qr(X)$rank < ncol(X)) um_stop('rangmangel', n = length(zeilen), spalte = colnames(X)[qr(X)$pivot[-seq_len(qr(X)$rank)]][1])
    soll <- c(N, unlist(lapply(sollen, function(s) s[-1]), use.names = FALSE)); names(soll) <- colnames(X)
    des <- survey::svydesign(ids = ~1, weights = ~.sp_w, data = dd)
    args <- list(des, frm, population = soll, calfun = 'linear')
    if (!is.null(bounds)) {
      b <- suppressWarnings(as.numeric(bounds))
      if (length(b) != 2L || any(!is.finite(b)) || !(b[1] < 1 && b[2] > 1) || b[1] < 0) um_stop('bounds-ungueltig')
      args$bounds <- b
      if (!requireNamespace('MASS', quietly = TRUE)) um_stop('paket-fehlt', paket = 'MASS')   # survey::calibrate mit bounds ruft MASS auf
    }
    r <- um_fange(tryCatch(do.call(survey::calibrate, args), error = function(e) um_stop('kalibrieren-unmoeglich', n = length(zeilen), meldung = conditionMessage(e))))
    neu <- as.numeric(stats::weights(r$wert))
    if (length(neu) != length(zeilen) || any(!is.finite(neu))) um_stop('kalibrieren-unmoeglich', n = length(zeilen))
    erreicht <- as.numeric(crossprod(X, neu)); ab <- max(abs(erreicht - soll)) / N
    if (!is.finite(ab) || ab > UM_KAL_TOL) um_stop('nicht-erreicht', n = length(zeilen), max_abweichung = ab)
    out <- rep(NA_real_, nrow(d)); out[zeilen] <- neu
    negativ <- sum(neu < 0); alt <- gw[zeilen]; g <- neu / alt
    neff <- sum(neu)^2 / sum(neu^2); neff0 <- sum(alt)^2 / sum(alt^2)
    list(n = length(zeilen), n_zeilen = nrow(d), gewichte = out, ohne_gewicht = as.numeric(which(!gueltig)), summe = sum(neu), negativ = negativ,
      w_min = min(neu), w_max = max(neu), g_min = min(g), g_max = max(g), kish_neff = neff, kish_neff_vorher = neff0, deff_w = length(neu) / neff, deff_w_vorher = length(alt) / neff0,
      max_abweichung = ab, grenzen = if (is.null(bounds)) NULL else as.numeric(bounds), warnungen = I(as.character(r$warnungen)),
      hinweise = as.list(c(if (negativ > 0L) 'negative-gewichte', if (negativ > 0L && is.null(bounds)) 'begrenzt-kalibrieren')))
  })
}
