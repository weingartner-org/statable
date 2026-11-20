# Statable - R-Funktionen für die Optionen der Frage "Lässt sich etwas vorhersagen?" (Später S-E; Fachblatt docs/fachblaetter/SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER.md,
# Abschnitte 1 und 2 und "Entscheidungen Opus (18.10.)"):
#   sp_quantil  Quantilregression (R-Paket quantreg 6.1): Koeffizienten je tau, Fall-Bootstrap (Perzentil rechnet JS), nid oder Rang-Umkehr, gewöhnliche Regression zum Vergleich
#   sp_glmnet   Ridge, Lasso, Elastic Net (R-Paket glmnet 5.1): lambda-Folge, Kreuzvalidierung mit Faltungen aus JS, lambda.1se / lambda.min, Pfad
# Eigene Datei (nicht statable.R); sie wird mit statable.R geladen, sobald ein Verfahren quantreg oder glmnet verlangt (lib/rverfahren.svelte.ts). Am Mac läuft dieselbe Datei mit Rscript (source()).
# Vertrag der Antworten: Kopf von app/src/engine/spaeter-e.webr.test.ts. Keine Funktion wirft nach außen: Fehler = list(fehler = Text). Alle Zahlen und Texte der Antwort sind UNBENANNT.
# SICHERHEIT (Fremde Dateien): Namen aus den Daten kommen nie als Text in R-Code. Statable schickt nur eigene Namen (y, p01, p02 ...); `sp_id` lässt nur /^[A-Za-z][A-Za-z0-9_.]*$/ durch.
# Zufall: vor jedem Zufallsaufruf RNGkind('Mersenne-Twister', 'Inversion', 'Rejection') und set.seed(startwert), damit webR und R am Mac dieselben Zahlen ziehen.
if (!exists('sp_id', mode = 'function')) sp_id <- function(...) {
  x <- unlist(list(...), use.names = FALSE)
  if (!length(x)) return(invisible(TRUE))
  ok <- is.character(x) && !anyNA(x) && all(nchar(x, type = 'bytes') <= 64L) && all(grepl('^[A-Za-z][A-Za-z0-9_.]*\\z', x, perl = TRUE)) &&
    !any(x %in% c('if', 'else', 'repeat', 'while', 'function', 'for', 'next', 'break', 'TRUE', 'FALSE', 'NULL', 'Inf', 'NaN', 'NA', 'NA_integer_', 'NA_real_', 'NA_character_', 'NA_complex_', 'in'))
  if (!ok) stop('unsafe name rejected')
  invisible(TRUE)
}

ve_un <- function(x) unname(as.numeric(x))
ve_zahl <- function(x) { x <- unlist(x, use.names = FALSE); if (is.null(x)) numeric(0) else x }
# Meldungen und Warnungen einer Rechnung sammeln (eindeutig); die Rechnung läuft weiter
ve_warn <- function(ausdruck) {
  w <- character(0)
  wert <- withCallingHandlers(ausdruck, warning = function(x) { w <<- c(w, conditionMessage(x)); invokeRestart('muffleWarning') })
  list(wert = wert, w = unique(w))
}
ve_rng <- function(startwert) { RNGkind('Mersenne-Twister', 'Inversion', 'Rejection'); set.seed(startwert) }
# Listenweise Auslassung über Ziel und Vorhersagegrößen; Gruppen-Spalten als Faktor (Stufen in der übergebenen Reihenfolge, nie umsortiert), leere Stufen entfallen.
ve_daten <- function(d, ziel, praed, faktoren) {
  if (!length(praed)) stop('no predictors')
  for (p in faktoren) if (p %in% praed && !is.factor(d[[p]])) d[[p]] <- factor(d[[p]])
  for (p in praed) if (is.factor(d[[p]])) d[[p]] <- factor(d[[p]], ordered = FALSE)
  ok <- stats::complete.cases(d[, c(ziel, praed), drop = FALSE])
  v <- d[ok, c(ziel, praed), drop = FALSE]; rownames(v) <- NULL
  for (p in praed) if (is.factor(v[[p]])) { v[[p]] <- droplevels(v[[p]]); if (nlevels(v[[p]]) < 2L) stop('a group predictor has only one group left') }
  list(v = v, n = nrow(v), ausgelassen = nrow(d) - nrow(v))
}

# ------------------------------------------------------------------------------------------------------------------------------------ Quantilregression
# tau: Zahlen (0 < tau < 1); ki: 'boot' (Fall-Bootstrap, JS rechnet das Perzentil-Intervall aus den B Ziehungen), 'nid' (Hendricks-Koenker) oder 'rang' (Rang-Umkehr, 95 %, ungleiche Streuung);
# B, startwert: ganze Zahlen. Niveau 95 % setzt Statable selbst; die Voreinstellung von summary.rq (90 %, gleiche Streuung) wird nie übernommen.
sp_quantil <- function(d, ziel, praed, faktoren = character(0), tau, ki, B, startwert) {
  tryCatch({ sp_id(ziel, praed, faktoren); ve_quantil(d, ziel, praed, faktoren, ve_zahl(tau), as.character(ki)[1L], as.integer(B)[1L], as.integer(startwert)[1L]) },
    error = function(e) list(fehler = conditionMessage(e)))
}
rho_tau <- function(u, tau) u * (tau - (u < 0))
ve_quantil <- function(d, ziel, praed, faktoren, tau, ki, B, startwert) {
  suppressMessages(library(quantreg))
  if (!length(tau) || anyNA(tau) || any(tau <= 0 | tau >= 1)) stop('tau must lie between 0 and 1')
  if (!(ki %in% c('boot', 'nid', 'rang'))) stop('unknown interval method')
  if (ki == 'boot' && (is.na(B) || B < 20L || B > 20000L)) stop('number of bootstrap draws out of range')
  v <- ve_daten(d, ziel, praed, faktoren); dd <- v$v; n <- v$n
  X <- stats::model.matrix(stats::reformulate(praed), data = dd); y <- dd[[ziel]]; p <- ncol(X)
  erg <- list()
  for (t in tau) {
    wf <- character(0)
    f <- ve_warn(quantreg::rq.fit.br(X, y, tau = t)); wf <- c(wf, f$w); fit <- f$wert
    b <- ve_un(fit$coefficients)
    e <- list(tau = t, b = b, verlust = sum(rho_tau(y - drop(X %*% b), t)))
    if (ki == 'boot') {
      ve_rng(startwert)
      Bm <- suppressWarnings(quantreg::boot.rq(X, y, tau = t, R = B, bsmethod = 'xy')$B)
      e$boot <- list(B = as.integer(B), se = ve_un(apply(Bm, 2, stats::sd)), spalten = lapply(seq_len(p), function(j) ve_un(Bm[, j])))
    } else if (ki == 'nid') {
      s <- ve_warn(summary(quantreg::rq(y ~ X - 1, tau = t), se = 'nid')); wf <- c(wf, s$w); cf <- s$wert$coefficients
      e$nid <- list(se = ve_un(cf[, 2]), t = ve_un(cf[, 3]), p = ve_un(cf[, 4]), df = as.integer(n - p))
    } else {
      s <- ve_warn(tryCatch(summary(quantreg::rq(y ~ X - 1, tau = t), se = 'rank', alpha = 0.05, iid = FALSE)$coefficients, error = function(e) conditionMessage(e))); wf <- c(wf, s$w); s <- s$wert
      if (is.character(s)) e$rang_fehler <- s[1L] else e$rang <- list(unten = ve_un(s[, 2]), oben = ve_un(s[, 3]))
    }
    e$warnungen <- unique(wf)
    erg[[length(erg) + 1L]] <- e
  }
  ol <- stats::lm(stats::reformulate(praed, response = ziel), data = dd); ci <- stats::confint(ol, level = 0.95); co <- summary(ol)$coefficients
  list(n = as.integer(n), ausgelassen = as.integer(v$ausgelassen), tau = ve_un(tau), namen = unname(colnames(X)), ki_art = ki, ergebnisse = erg,
       ols = list(b = ve_un(co[, 1]), se = ve_un(co[, 2]), unten = ve_un(ci[, 1]), oben = ve_un(ci[, 2]), r2 = unname(summary(ol)$r.squared), df = as.integer(ol$df.residual)))
}

# ------------------------------------------------------------------------------------------------------------------------------------ Ridge, Lasso, Elastic Net
# alpha: 0 (Ridge) bis 1 (Lasso); foldids: Liste ganzer Vektoren (eine Faltung je Wiederholung, aus JS, eine Nummer je vollständigem Fall); regel: 'se1' | 'min'; standardisieren: TRUE/FALSE.
GL_THRESH <- 1e-14
sp_glmnet <- function(d, ziel, praed, faktoren = character(0), alpha, foldids, regel, standardisieren) {
  tryCatch({ sp_id(ziel, praed, faktoren); ve_glmnet(d, ziel, praed, faktoren, as.numeric(alpha)[1L], lapply(foldids, as.integer), as.character(regel)[1L], isTRUE(as.logical(standardisieren)[1L])) },
    error = function(e) list(fehler = conditionMessage(e)))
}
# lambda.min = größtes lambda mit kleinstem cvm; lambda.1se = größtes lambda mit cvm <= (cvm + cvsd) an der Stelle von lambda.min (getOptcv.glmnet)
gl_wahl <- function(lambda, cvm, cvsd, regel) {
  lmin <- max(lambda[cvm <= min(cvm)]); i <- match(lmin, lambda); l1 <- max(lambda[cvm <= (cvm + cvsd)[i]])
  list(min = lmin, se1 = l1, gew = if (regel == 'min') lmin else l1)
}
ve_glmnet <- function(d, ziel, praed, faktoren, alpha, foldids, regel, standardisieren) {
  suppressMessages(library(glmnet))
  if (is.na(alpha) || alpha < 0 || alpha > 1) stop('alpha must lie between 0 and 1')
  if (!(regel %in% c('se1', 'min'))) stop('unknown lambda rule')
  if (!length(foldids)) stop('no folds')
  v <- ve_daten(d, ziel, praed, faktoren); dd <- v$v; n <- v$n
  X <- stats::model.matrix(stats::reformulate(praed), data = dd)[, -1, drop = FALSE]; y <- dd[[ziel]]
  konst <- apply(X, 2, function(z) length(unique(z)) == 1L); kon_namen <- colnames(X)[konst]; X <- X[, !konst, drop = FALSE]; p <- ncol(X)
  if (p < 2L) stop('too few predictors for a penalty')
  for (f in foldids) if (length(f) != n || anyNA(f) || min(f) < 1L) stop('the folds do not match the cases')
  wf <- character(0)
  g <- ve_warn(glmnet::glmnet(X, y, alpha = alpha, standardize = standardisieren, control = list(thresh = GL_THRESH))); wf <- c(wf, g$w); full <- g$wert; lam <- full$lambda
  reps <- lapply(foldids, function(f) {
    r <- ve_warn(glmnet::cv.glmnet(X, y, alpha = alpha, foldid = f, lambda = lam, standardize = standardisieren, control = list(thresh = GL_THRESH))); wf <<- c(wf, r$w); r$wert })
  cvm <- Reduce(`+`, lapply(reps, function(r) r$cvm)) / length(reps); cvsd <- Reduce(`+`, lapply(reps, function(r) r$cvsd)) / length(reps)
  w <- gl_wahl(lam, cvm, cvsd, regel); ig <- match(w$gew, lam); imin <- match(w$min, lam); i1 <- match(w$se1, lam)
  Bm <- as.matrix(full$beta); b <- ve_un(Bm[, ig]); a0 <- ve_un(full$a0[ig]); sx <- ve_un(apply(X, 2, function(z) sqrt(mean((z - mean(z))^2))))
  pred <- drop(a0 + X %*% b)
  ols <- if (p + 1L < n) { m <- stats::lm(y ~ X); if (anyNA(stats::coef(m))) NULL else mean(stats::residuals(m)^2) } else NULL
  wd <- lapply(reps, function(r) { wr <- gl_wahl(r$lambda, r$cvm, r$cvsd, regel); idx <- match(wr$gew, lam)
    list(lambda_min = wr$min, lambda_1se = wr$se1, lambda = wr$gew, gewaehlt = unname(colnames(X)[Bm[, idx] != 0])) })
  list(n = as.integer(n), ausgelassen = as.integer(v$ausgelassen), alpha = alpha, regel = regel, standardisieren = standardisieren, namen = unname(colnames(X)), konstant = unname(kon_namen),
       lambda = ve_un(lam), nzero = as.integer(full$df), cvm = ve_un(cvm), cvsd = ve_un(cvsd), lambda_min = w$min, lambda_1se = w$se1, lambda_gewaehlt = w$gew,
       cvm_min = cvm[imin], cvsd_min = cvsd[imin], cvm_1se = cvm[i1], cvsd_1se = cvsd[i1], cv_fehler = cvm[ig], cv_se = cvsd[ig],
       konstante = a0, koef = b, sx = sx, std_koef = ve_un(b * sx), df = as.integer(sum(b != 0)),
       nullfehler = mean((y - mean(y))^2), train_pen = mean((y - pred)^2), train_ols = ols,
       wiederholungen = unname(wd), pfad_std = lapply(seq_len(p), function(j) ve_un(Bm[j, ] * sx[j])), warnungen = unique(wf))
}
