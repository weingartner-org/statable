# Statable - R-Funktionen für die zweite Rechen-Engine (webR im Browser, Rscript am Mac: dieselbe Datei).
# Eingabe: data.frame mit Zahlenspalten (Namen v1, v2 ... - die Zuordnung zu den Fragen macht die Oberfläche).
# Ausgabe: einfache Listen aus Zahlen und Text (werden als JSON gelesen). Fehler kommen als list(fehler = "...").

# SICHERHEIT: Namen werden in Formeln und Modelltexte eingesetzt (reformulate, as.formula, lavaan). Darum lässt `sp_id` nur /^[A-Za-z][A-Za-z0-9_.]*$/ durch
# (dieselbe Weißliste wie `rId` in engine/rsicher.ts) und wirft sonst. Text und Daten (Labels, Stufen, Referenz) kommen nie als Code, nur als Objekte.
sp_id <- function(...) {
  x <- unlist(list(...), use.names = FALSE)
  if (!length(x)) return(invisible(TRUE))
  ok <- is.character(x) && !anyNA(x) && all(nchar(x, type = 'bytes') <= 64L) && all(grepl('^[A-Za-z][A-Za-z0-9_.]*\\z', x, perl = TRUE)) &&
    !any(x %in% c('if', 'else', 'repeat', 'while', 'function', 'for', 'next', 'break', 'TRUE', 'FALSE', 'NULL', 'Inf', 'NaN', 'NA', 'NA_integer_', 'NA_real_', 'NA_character_', 'NA_complex_', 'in'))
  if (!ok) stop('unsafe name rejected')
  invisible(TRUE)
}

sp_omega <- function(d, boot = 1000L, seed = 20261008L, fiml = FALSE, nf = 0L) {
  suppressMessages(library(lavaan))
  sp_id(names(d))
  d <- as.data.frame(lapply(d, as.numeric))
  n_alle <- nrow(d)
  if (!fiml) d <- d[stats::complete.cases(d), , drop = FALSE]
  k <- ncol(d); n <- nrow(d)
  mod <- paste0('f =~ ', paste0('l', seq_len(k), '*', names(d), collapse = ' + '))
  om_aus <- function(l, th) sum(l)^2 / (sum(l)^2 + sum(th))
  fit <- tryCatch(withCallingHandlers(
    cfa(mod, data = d, std.lv = TRUE, missing = if (fiml) 'fiml' else 'listwise'),
    warning = function(w) invokeRestart('muffleWarning')), error = function(e) e)
  if (inherits(fit, 'error')) return(list(fehler = conditionMessage(fit)))
  if (!lavInspect(fit, 'converged')) return(list(fehler = 'model did not converge'))
  pe <- parameterEstimates(fit)
  l <- pe$est[pe$op == '=~']; th <- pe$est[pe$op == '~~' & pe$lhs == pe$rhs & pe$lhs != 'f']
  om <- om_aus(l, th)
  lo <- NA_real_; hi <- NA_real_; art <- 'bootstrap'; nb <- 0L
  if (!fiml && boot > 0) {
    set.seed(seed)
    S0 <- NULL; vals <- numeric(0)
    mod0 <- paste0('f =~ ', paste0(names(d), collapse = ' + '))
    for (b in seq_len(boot)) {
      ib <- sample.int(n, n, replace = TRUE)
      S <- stats::cov(d[ib, , drop = FALSE])
      f <- tryCatch(suppressWarnings(cfa(mod0, sample.cov = S, sample.nobs = n, std.lv = TRUE, se = 'none', warn = FALSE, check.gradient = FALSE, check.post = FALSE, check.vcov = FALSE)), error = function(e) NULL)
      if (is.null(f) || !lavInspect(f, 'converged')) next
      p <- parameterEstimates(f, se = FALSE)
      vals <- c(vals, om_aus(p$est[p$op == '=~'], p$est[p$op == '~~' & p$lhs == p$rhs & p$lhs != 'f']))
    }
    nb <- length(vals)
    if (nb >= 50) { q <- stats::quantile(vals, c(0.025, 0.975), names = FALSE); lo <- q[1]; hi <- q[2] }
  } else {
    art <- 'delta'
    # Delta-Methode: lavaan rechnet den Standardfehler eines definierten Parameters
    ll <- paste0('l', seq_len(k)); tt <- paste0('t', seq_len(k))
    mod2 <- paste0('f =~ ', paste0(ll, '*', names(d), collapse = ' + '), '\n',
      paste0(names(d), ' ~~ ', tt, '*', names(d), collapse = '\n'), '\n',
      'om := (', paste(ll, collapse = '+'), ')^2 / ((', paste(ll, collapse = '+'), ')^2 + ', paste(tt, collapse = '+'), ')')
    f2 <- tryCatch(suppressWarnings(cfa(mod2, data = d, std.lv = TRUE, missing = if (fiml) 'fiml' else 'listwise')), error = function(e) NULL)
    if (!is.null(f2)) { p2 <- parameterEstimates(f2); r <- p2[p2$label == 'om', ]; if (nrow(r)) { lo <- r$ci.lower; hi <- r$ci.upper } }
  }
  # Standardisierte Ladungen und alpha zum Vergleich
  ss <- standardizedSolution(fit); lad <- ss$est.std[ss$op == '=~']
  out <- list(omega = om, lo = lo, hi = hi, art = art, ziehungen = nb, n = n, n_alle = n_alle, k = k,
    ladungen = lad, heywood = any(th < 0) || any(abs(lad) > 1))
  if (nf >= 2L && k >= 6L) {
    suppressMessages({ library(psych); library(GPArotation) })
    o <- tryCatch(suppressWarnings(psych::omega(d, nfactors = nf, plot = FALSE, fm = 'minres')), error = function(e) NULL)
    if (!is.null(o)) { out$omega_h <- o$omega_h; out$omega_t_psych <- o$omega.tot; out$nf <- nf }
  }
  out
}

# gruppen: Liste mit Elementen je Faktor (Zeichenvektor der Spaltennamen); ordinal: WLSMV; fiml: ML mit FIML bei fehlenden Werten
sp_cfa <- function(d, faktoren, ordinal = FALSE, fiml = FALSE) {
  suppressMessages(library(lavaan))
  sp_id(names(d), unlist(faktoren), names(faktoren))
  d <- as.data.frame(lapply(d, as.numeric))
  n_alle <- nrow(d)
  namen <- unique(unlist(faktoren))
  d <- d[, namen, drop = FALSE]
  if (!fiml) d <- d[stats::complete.cases(d), , drop = FALSE]
  fn <- names(faktoren)
  mod <- paste(vapply(seq_along(faktoren), function(i) paste0(fn[i], ' =~ ', paste(faktoren[[i]], collapse = ' + ')), ''), collapse = '\n')
  warn <- character(0)
  est <- if (ordinal) 'WLSMV' else 'ML'
  fit <- tryCatch(withCallingHandlers(
    cfa(mod, data = d, std.lv = FALSE, estimator = est, ordered = if (ordinal) namen else FALSE,
        missing = if (fiml && !ordinal) 'fiml' else 'listwise'),
    warning = function(w) { warn <<- c(warn, conditionMessage(w)); invokeRestart('muffleWarning') }),
    error = function(e) e)
  if (inherits(fit, 'error')) return(list(fehler = conditionMessage(fit)))
  if (!lavInspect(fit, 'converged')) return(list(fehler = 'model did not converge', warnungen = warn))
  sk <- if (ordinal) '.scaled' else ''
  nm <- c('chisq', 'df', 'pvalue', 'cfi', 'tli', 'rmsea', 'rmsea.ci.lower', 'rmsea.ci.upper')
  fm <- tryCatch(fitMeasures(fit, c(paste0(nm, sk), 'srmr')), error = function(e) NULL)
  if (is.null(fm)) return(list(fehler = 'Die Anpassung ließ sich nicht berechnen.', warnungen = warn))
  names(fm) <- c(nm, 'srmr')
  ss <- standardizedSolution(fit)
  la <- ss[ss$op == '=~', ]
  fk <- ss[ss$op == '~~' & ss$lhs != ss$rhs & ss$lhs %in% fn & ss$rhs %in% fn, ]
  th <- parameterEstimates(fit)
  vv <- th$est[th$op == '~~' & th$lhs == th$rhs & !(th$lhs %in% fn)]
  list(fit = as.list(fm), n = nrow(d), n_alle = n_alle, schaetzer = est,
    last_faktor = la$lhs, last_item = la$rhs, last_std = la$est.std, last_se = la$se, last_p = la$pvalue, last_lo = la$ci.lower, last_hi = la$ci.upper,
    kor_a = fk$lhs, kor_b = fk$rhs, kor_r = fk$est.std, kor_se = fk$se, kor_p = fk$pvalue,
    heywood = any(vv < 0) || any(abs(la$est.std) > 1), se_fehlt = any(is.na(la$se)), warnungen = warn)
}

# Messinvarianz (S-J, 23.10.): dieselben Faktoren in mehreren Gruppen (Spalte g, Text oder Zahl). Stufen: konfigural (gleiche Struktur), metrisch (Ladungen gleich), skalar (Ladungen und Achsenabschnitte gleich).
#   ML mit listwise-Ausschluss; Änderungen von CFI, RMSEA und SRMR zur vorigen Stufe, Chi-Quadrat-Differenztest (lavTestLRT). Faustregel nach Chen (2007): Nicht-Invarianz, wenn ΔCFI <= -0,010 UND ΔRMSEA >= 0,015 (bzw. ΔSRMR >= 0,030 metrisch, 0,010 skalar).
sp_invarianz <- function(d, faktoren, ordinal = FALSE, frei = character(0)) {
  suppressMessages(library(lavaan))
  sp_id(setdiff(names(d), 'g'), unlist(faktoren), names(faktoren))
  if (!('g' %in% names(d))) return(list(fehler = 'group column missing'))
  g <- factor(d$g)
  d$g <- g
  namen <- unique(unlist(faktoren))
  d <- d[stats::complete.cases(d[, c(namen, 'g'), drop = FALSE]), c(namen, 'g'), drop = FALSE]
  d$g <- droplevels(d$g)
  for (nm in namen) d[[nm]] <- as.numeric(d[[nm]])
  if (nlevels(d$g) < 2) return(list(fehler = 'fewer than two groups'))
  fn <- names(faktoren)
  mod <- paste(vapply(seq_along(faktoren), function(i) paste0(fn[i], ' =~ ', paste(faktoren[[i]], collapse = ' + ')), ''), collapse = '\n')
  warn <- character(0)
  anp <- function(ge, pa = character(0)) tryCatch(withCallingHandlers(
    if (ordinal) cfa(mod, data = d, group = 'g', group.equal = ge, group.partial = pa, ordered = namen, estimator = 'WLSMV', parameterization = 'theta')
    else cfa(mod, data = d, group = 'g', group.equal = ge, group.partial = pa, std.lv = FALSE, estimator = 'ML'),
    warning = function(w) { warn <<- c(warn, conditionMessage(w)); invokeRestart('muffleWarning') }),
    error = function(e) e)
  # ordinal (WLSMV): die Stufen heißen weiter konfigural / metrisch / skalar, bedeuten aber konfigural, gleiche Schwellen, gleiche Schwellen und Ladungen (Achsenabschnitte sind 0)
  fits <- if (ordinal) list(konfigural = anp(character(0)), metrisch = anp('thresholds'), skalar = anp(c('thresholds', 'loadings')))
          else list(konfigural = anp(character(0)), metrisch = anp('loadings'), skalar = anp(c('loadings', 'intercepts')))
  for (f in fits) if (inherits(f, 'error')) return(list(fehler = conditionMessage(f)))
  for (f in fits) if (!lavInspect(f, 'converged')) return(list(fehler = 'model did not converge', warnungen = warn))
  fmn <- if (ordinal) c('chisq.scaled', 'df.scaled', 'pvalue.scaled', 'cfi.scaled', 'tli.scaled', 'rmsea.scaled', 'srmr') else c('chisq', 'df', 'pvalue', 'cfi', 'tli', 'rmsea', 'srmr')
  mass <- t(vapply(fits, function(f) fitMeasures(f, fmn), numeric(7)))
  colnames(mass) <- c('chisq', 'df', 'pvalue', 'cfi', 'tli', 'rmsea', 'srmr')
  lrt <- function(a, b) { t <- tryCatch(suppressWarnings(lavTestLRT(a, b)), error = function(e) NULL); if (is.null(t)) c(NA, NA, NA) else as.numeric(t[2, c('Chisq diff', 'Df diff', 'Pr(>Chisq)')]) }
  l1 <- lrt(fits$konfigural, fits$metrisch); l2 <- lrt(fits$metrisch, fits$skalar)
  # Vorschlag für teilweise Invarianz: Score-Tests der Gleichheitsbedingungen (Ladungen und Achsenabschnitte) im skalaren Modell; je Frage der größte Wert
  vorschlag <- NULL
  sc <- if (ordinal) NULL else tryCatch(suppressWarnings(lavTestScore(fits$skalar)$uni), error = function(e) NULL)
  if (!is.null(sc) && nrow(sc) > 0) {
    pt <- parTable(fits$skalar); idx <- match(sc$lhs, pt$plabel); ok <- !is.na(idx) & pt$op[idx] %in% c('=~', '~1')
    if (any(ok)) {
      it <- ifelse(pt$op[idx] == '=~', pt$rhs[idx], pt$lhs[idx])[ok]; x2 <- sc$X2[ok]; pp <- sc$p.value[ok]
      o <- order(-x2); it <- it[o]; x2 <- x2[o]; pp <- pp[o]; k <- !duplicated(it) & it %in% namen
      vorschlag <- list(item = it[k], x2 = x2[k], p = pp[k])
    }
  }
  # Teilweise Invarianz: die genannten Fragen dürfen in den Gruppen verschiedene Ladungen (und Achsenabschnitte) haben
  teil <- NULL
  frei <- if (ordinal) character(0) else intersect(frei, namen)
  if (length(frei)) {
    fak_von <- function(it) fn[vapply(faktoren, function(x) it %in% x, TRUE)][1]
    pl <- vapply(frei, function(it) paste0(fak_von(it), ' =~ ', it), '')
    fm <- anp('loadings', unname(pl)); fs <- anp(c('loadings', 'intercepts'), c(unname(pl), paste0(frei, ' ~ 1')))
    if (!inherits(fm, 'error') && !inherits(fs, 'error') && lavInspect(fm, 'converged') && lavInspect(fs, 'converged')) {
      ma <- t(vapply(list(fm, fs), function(f) fitMeasures(f, c('chisq', 'df', 'pvalue', 'cfi', 'tli', 'rmsea', 'srmr')), numeric(7)))
      t1 <- lrt(fits$konfigural, fm); t2 <- lrt(fm, fs)
      teil <- list(frei = frei, chisq = ma[, 1], df = ma[, 2], p = ma[, 3], cfi = ma[, 4], tli = ma[, 5], rmsea = ma[, 6], srmr = ma[, 7], diff_chisq = c(t1[1], t2[1]), diff_df = c(t1[2], t2[2]), diff_p = c(t1[3], t2[3]))
    }
  }
  list(vorschlag = vorschlag, teil = teil, stufe = rownames(mass), chisq = unname(mass[, 'chisq']), df = unname(mass[, 'df']), p = unname(mass[, 'pvalue']), cfi = unname(mass[, 'cfi']), tli = unname(mass[, 'tli']), rmsea = unname(mass[, 'rmsea']), srmr = unname(mass[, 'srmr']),
    diff_chisq = c(l1[1], l2[1]), diff_df = c(l1[2], l2[2]), diff_p = c(l1[3], l2[3]),
    gruppen = levels(d$g), n_gruppe = as.integer(table(d$g)), ordinal = ordinal, warnungen = warn)
}

# Pfadmodell mit beobachteten Variablen (S-J S1, 23.10.): je Ziel-Variable eine Regression, alle zusammen mit lavaan (ML). pfade: benannte Liste Ziel = Vektor der Prädiktoren (Namen v1, v2 ...).
#   Indirekte Effekte: alle gerichteten Pfade aus 2 bis 3 Kanten (A -> B -> C), als Produkt der Koeffizienten definiert (Delta-Methode, `:=`); dazu der Gesamteffekt je Paar (direkt + indirekt).
#   Nur ML mit vollständigen Fällen (oder FIML). Zyklen, Selbstbezug und mehr als 12 Effekte werden abgelehnt.
sp_pfad <- function(d, pfade, fiml = FALSE, faktoren = list(), boot = 0L, nullpfade = list()) {
  suppressMessages(library(lavaan))
  sp_id(names(d), names(pfade), unlist(pfade), names(faktoren), unlist(faktoren))
  d <- as.data.frame(lapply(d, as.numeric))
  ziele <- names(pfade)
  vars <- unique(c(ziele, unlist(pfade)))
  if (any(names(faktoren) %in% names(d))) return(list(fehler = 'factor name clash'))
  d <- d[, unique(c(setdiff(vars, names(faktoren)), unlist(faktoren))), drop = FALSE]
  n_alle <- nrow(d)
  if (!fiml) d <- d[stats::complete.cases(d), , drop = FALSE]
  kanten <- do.call(rbind, lapply(ziele, function(t) data.frame(von = pfade[[t]], nach = t, stringsAsFactors = FALSE)))
  if (any(kanten$von == kanten$nach)) return(list(fehler = 'self loop'))
  nachf <- function(v) kanten$nach[kanten$von == v]
  # Zyklen: Tiefensuche
  zyklus <- FALSE
  besucht <- function(v, weg) { if (v %in% weg) { zyklus <<- TRUE; return(invisible()) }; for (w in nachf(v)) besucht(w, c(weg, v)) }
  for (v in vars) besucht(v, character(0))
  if (zyklus) return(list(fehler = 'cycle'))
  kanten$name <- paste0('p', seq_len(nrow(kanten)))
  lab <- function(a, b) kanten$name[kanten$von == a & kanten$nach == b]
  zeilen <- vapply(ziele, function(t) paste0(t, ' ~ ', paste(paste0(kanten$name[kanten$nach == t], '*', kanten$von[kanten$nach == t]), collapse = ' + ')), '')
  # indirekte Pfade der Länge 2 und 3
  pfadliste <- list()
  for (a in vars) for (b in nachf(a)) { for (c in nachf(b)) { pfadliste[[length(pfadliste) + 1]] <- c(a, b, c); for (e in nachf(c)) pfadliste[[length(pfadliste) + 1]] <- c(a, b, c, e) } }
  if (length(pfadliste) > 12) return(list(fehler = 'too many effects'))
  defs <- character(0); eff_art <- character(0); eff_pfad <- character(0); eff_name <- character(0)
  for (i in seq_along(pfadliste)) {
    p <- pfadliste[[i]]; nm <- paste0('ie', i)
    defs <- c(defs, paste0(nm, ' := ', paste(vapply(seq_len(length(p) - 1), function(j) lab(p[j], p[j + 1]), ''), collapse = ' * ')))
    eff_name <- c(eff_name, nm); eff_art <- c(eff_art, 'indirect'); eff_pfad <- c(eff_pfad, paste(p, collapse = '>'))
  }
  paare <- unique(t(vapply(pfadliste, function(p) c(p[1], p[length(p)]), c('', ''))))
  if (length(pfadliste)) for (i in seq_len(nrow(paare))) {
    a <- paare[i, 1]; z <- paare[i, 2]
    ie <- eff_name[vapply(pfadliste, function(p) p[1] == a && p[length(p)] == z, TRUE)]
    direkt <- lab(a, z)
    nm <- paste0('tot', i)
    defs <- c(defs, paste0(nm, ' := ', paste(c(if (length(direkt)) direkt, ie), collapse = ' + ')))
    eff_name <- c(eff_name, nm); eff_art <- c(eff_art, 'total'); eff_pfad <- c(eff_pfad, paste(a, z, sep = '>'))
  }
  mess <- vapply(names(faktoren), function(f) paste0(f, ' =~ ', paste(faktoren[[f]], collapse = ' + ')), '')
  mod <- paste(c(mess, zeilen, defs), collapse = '\n')
  warn <- character(0)
  fit <- tryCatch(withCallingHandlers(
    sem(mod, data = d, estimator = 'ML', fixed.x = TRUE, missing = if (fiml) 'fiml' else 'listwise'),
    warning = function(w) { warn <<- c(warn, conditionMessage(w)); invokeRestart('muffleWarning') }),
    error = function(e) e)
  if (inherits(fit, 'error')) return(list(fehler = conditionMessage(fit)))
  if (!lavInspect(fit, 'converged')) return(list(fehler = 'model did not converge', warnungen = warn))
  pe <- parameterEstimates(fit, standardized = TRUE, ci = TRUE)
  reg <- pe[pe$op == '~', ]
  lad <- pe[pe$op == '=~', ]
  df_m <- as.numeric(fitMeasures(fit, 'df'))
  fm <- tryCatch(fitMeasures(fit, c('chisq', 'df', 'pvalue', 'cfi', 'tli', 'rmsea', 'srmr')), error = function(e) NULL)
  ef <- pe[pe$op == ':=', ]
  # Bootstrap (Perzentilintervalle) für die indirekten Effekte und Gesamteffekte; feste Startzahl, damit dieselbe Rechnung dieselben Grenzen gibt
  boot_n <- 0L
  if (boot > 0 && nrow(ef) > 0) {
    set.seed(20261023L)
    fb <- tryCatch(suppressWarnings(sem(mod, data = d, estimator = 'ML', fixed.x = TRUE, missing = if (fiml) 'fiml' else 'listwise', se = 'bootstrap', bootstrap = as.integer(boot))), error = function(e) NULL)
    if (!is.null(fb)) {
      pb <- tryCatch(parameterEstimates(fb, boot.ci.type = 'perc', standardized = TRUE, ci = TRUE), error = function(e) NULL)
      if (!is.null(pb)) { ef <- pb[pb$op == ':=', ]; boot_n <- as.integer(boot) }
    }
  }
  # Modellvergleich (genestet): ausgewählte Pfade auf 0 setzen, Chi-Quadrat-Differenz zum vollen Modell
  vergl <- NULL
  if (length(nullpfade)) {
    ist0 <- paste(kanten$von, kanten$nach) %in% unlist(lapply(names(nullpfade), function(z) paste(nullpfade[[z]], z)))
    if (any(ist0)) {
      zeilen0 <- vapply(ziele, function(t) { k <- kanten[kanten$nach == t, ]; i0 <- paste(k$von, k$nach) %in% paste(kanten$von[ist0], kanten$nach[ist0]); paste0(t, ' ~ ', paste(paste0(ifelse(i0, '0', k$name), '*', k$von), collapse = ' + ')) }, '')
      f0 <- tryCatch(suppressWarnings(sem(paste(c(mess, zeilen0), collapse = '\n'), data = d, estimator = 'ML', fixed.x = TRUE, missing = if (fiml) 'fiml' else 'listwise')), error = function(e) NULL)
      if (!is.null(f0) && lavInspect(f0, 'converged')) {
        m0 <- fitMeasures(f0, c('chisq', 'df', 'aic', 'bic')); m1 <- fitMeasures(fit, c('chisq', 'df', 'aic', 'bic'))
        dc <- as.numeric(m0['chisq'] - m1['chisq']); dd <- as.numeric(m0['df'] - m1['df'])
        vergl <- list(k = sum(ist0), dchisq = dc, ddf = dd, p = if (dd > 0) pchisq(max(dc, 0), dd, lower.tail = FALSE) else NA_real_, chisq0 = as.numeric(m0['chisq']), df0 = as.numeric(m0['df']),
          aic = as.numeric(m1['aic']), aic0 = as.numeric(m0['aic']), bic = as.numeric(m1['bic']), bic0 = as.numeric(m0['bic']))
      }
    }
  }
  r2 <- lavInspect(fit, 'rsquare')
  list(n = nrow(d), n_alle = n_alle, vergleich = vergl,
    von = reg$rhs, nach = reg$lhs, est = reg$est, se = reg$se, z = reg$z, p = reg$pvalue, lo = reg$ci.lower, hi = reg$ci.upper, std = reg$std.all,
    eff_name = ef$lhs, eff_est = ef$est, eff_se = ef$se, eff_z = ef$z, eff_p = ef$pvalue, eff_lo = ef$ci.lower, eff_hi = ef$ci.upper, eff_std = ef$std.all,
    eff_art = eff_art[match(ef$lhs, eff_name)], eff_pfad = eff_pfad[match(ef$lhs, eff_name)],
    last_faktor = lad$lhs, last_item = lad$rhs, last_est = lad$est, last_std = lad$std.all, last_se = lad$se,
    r2_var = names(r2), r2 = as.numeric(r2), df = df_m, boot = boot_n,
    fit = if (is.null(fm)) NULL else as.list(setNames(as.numeric(fm), c('chisq', 'df', 'pvalue', 'cfi', 'tli', 'rmsea', 'srmr'))),
    warnungen = warn)
}

# Wachstumskurvenmodell (Latent Growth, B4 Teil 1, 14.11.2026): lineare Entwicklung über mehrere Messzeitpunkte (Spalten v1, v2 ... in zeitlicher Reihenfolge) mit lavaan (ML).
#   Achsenabschnitt-Faktor i (alle Ladungen 1), Steigungs-Faktor s (Ladungen = zeit, Vorgabe 0, 1, 2 ...); Achsenabschnitte der Messwerte auf 0, Mittelwerte von i und s frei (wie lavaan::growth).
#   gleich_rest = TRUE setzt die Restvarianz zu allen Zeitpunkten gleich (dann gleichwertig zum gemischten Modell mit zufälligem Achsenabschnitt und zufälliger Steigung, ML).
#   Der Achsenabschnitt ist der Wert beim Zeitwert 0 (Vorgabe: erster Zeitpunkt). Mindestens drei Zeitpunkte, mindestens 15 vollständige Fälle (oder FIML).
sp_wachstum <- function(d, zeit = NULL, gleich_rest = FALSE, fiml = FALSE) {
  suppressMessages(library(lavaan))
  sp_id(names(d))
  d <- as.data.frame(lapply(d, as.numeric))
  k <- ncol(d)
  if (k < 3L) return(list(fehler = 'at least three time points needed'))
  if (is.null(zeit)) zeit <- seq_len(k) - 1
  zeit <- as.numeric(zeit)
  if (length(zeit) != k || anyNA(zeit) || length(unique(zeit)) < 3L) return(list(fehler = 'time values must be numbers, at least three different'))
  n_alle <- nrow(d)
  if (!fiml) d <- d[stats::complete.cases(d), , drop = FALSE]
  if (nrow(d) < 15L) return(list(fehler = 'too few complete cases'))
  nm <- names(d)
  mod <- paste(c(
    paste0('i =~ ', paste0('1*', nm, collapse = ' + ')),
    paste0('s =~ ', paste0(format(zeit, digits = 15, trim = TRUE), '*', nm, collapse = ' + ')),
    if (gleich_rest) paste0(nm, ' ~~ r*', nm) else NULL), collapse = '\n')
  warn <- character(0)
  fit <- tryCatch(withCallingHandlers(
    growth(mod, data = d, estimator = 'ML', missing = if (fiml) 'fiml' else 'listwise'),
    warning = function(w) { warn <<- c(warn, conditionMessage(w)); invokeRestart('muffleWarning') }),
    error = function(e) e)
  if (inherits(fit, 'error')) return(list(fehler = conditionMessage(fit)))
  if (!lavInspect(fit, 'converged')) return(list(fehler = 'model did not converge', warnungen = warn))
  pe <- parameterEstimates(fit, standardized = TRUE, ci = TRUE)
  mw <- pe[pe$op == '~1' & pe$lhs %in% c('i', 's'), ]
  va <- pe[pe$op == '~~' & pe$lhs %in% c('i', 's') & pe$lhs == pe$rhs, ]
  ko <- pe[pe$op == '~~' & pe$lhs == 'i' & pe$rhs == 's', ]
  rv <- pe[pe$op == '~~' & pe$lhs %in% nm & pe$lhs == pe$rhs, ]
  fm <- tryCatch(fitMeasures(fit, c('chisq', 'df', 'pvalue', 'cfi', 'tli', 'rmsea', 'srmr', 'aic', 'bic')), error = function(e) NULL)
  impl <- tryCatch(as.numeric(fitted(fit)$mean), error = function(e) rep(NA_real_, k))
  g <- function(z, sp) as.numeric(z[[sp]])
  list(n = nrow(d), n_alle = n_alle, zeit = zeit, beob_mw = as.numeric(colMeans(d, na.rm = TRUE)), impl_mw = impl,
    mw_name = mw$lhs, mw_est = g(mw, 'est'), mw_se = g(mw, 'se'), mw_z = g(mw, 'z'), mw_p = g(mw, 'pvalue'), mw_lo = g(mw, 'ci.lower'), mw_hi = g(mw, 'ci.upper'),
    var_name = va$lhs, var_est = g(va, 'est'), var_se = g(va, 'se'), var_p = g(va, 'pvalue'),
    kov_est = g(ko, 'est'), kov_se = g(ko, 'se'), kov_p = g(ko, 'pvalue'), kov_std = g(ko, 'std.all'),
    rest_var = g(rv, 'est'), neg_var = any(c(g(va, 'est'), g(rv, 'est')) < 0),
    fit = if (is.null(fm)) NULL else as.list(setNames(as.numeric(fm), c('chisq', 'df', 'pvalue', 'cfi', 'tli', 'rmsea', 'srmr', 'aic', 'bic'))),
    warnungen = warn)
}

# ---------------------------------------------------------------------------------------------------------------
# Mehrebenen-Modell (gemischtes lineares Modell): lme4 / lmerTest. REML, Satterthwaite-Freiheitsgrade (lmerTest).
# d: Spalten y (Zahl), g (Gruppe, Text), dann die Prädiktoren p01, p02 ... (Zahl oder factor).
# praed: Namen der Prädiktoren in d. steigung: Name eines Prädiktors mit zufälliger Steigung ('' = nur zufälliger Achsenabschnitt).
# zentrieren: Zahlen-Prädiktoren am Gesamtmittel zentrieren (bei Faktoren ohne Wirkung).
# R² (Nakagawa & Schimizu 2013, Johnson 2014): marginal = Varianz der festen Effekte / Gesamtvarianz; konditional = (fest + zufällig) / Gesamtvarianz.
#   Die Varianz der zufälligen Effekte ist der Mittelwert über die Fälle von z' G z (bei nur zufälligem Achsenabschnitt gleich dem Wert der Varianzkomponente).
# ---------------------------------------------------------------------------------------------------------------
# Ja/Nein-Ergebnis (S-H, 22.10.): binaer = TRUE rechnet ein verallgemeinertes gemischtes Modell (glmer, Logit, Laplace-Näherung); der größere der zwei Werte ist das Ereignis.
#   Feste Effekte: Wald-z (Log-Odds, Odds Ratio exp(b) in der Oberfläche). Die Streuung innerhalb der Gruppen ist auf der Logit-Skala fest pi²/3 (latente Variable): ICC = tau/(tau + pi²/3);
#   R² nach Nakagawa et al. (2017) mit derselben Verteilungsvarianz. Keine zufällige Steigung, kein Designeffekt, keine Typ-III-Tests.
# Zweite Gruppierung (gekreuzte Zufallseffekte, 10.11.2026): hat d eine Spalte g2 (Text), kommt zu (1 | g) ein zweiter zufälliger Achsenabschnitt (1 | g2) hinzu
#   (y ~ ... + (1 | g) + (1 | g2)); Personen × Reize: jede Person sieht viele Reize, jeder Reiz wird von vielen Personen gesehen. Dann nur Messwerte (kein Ja/Nein), keine zufällige Steigung.
#   Anteil je Gruppierung = tau_g / (tau_1 + tau_2 + sigma²); R² wie sonst (Nakagawa), die Varianz der zufälligen Effekte ist die Summe beider Varianzen. Die Gruppen-Ergebnisse (Raupen) gelten für g.
sp_mehrebenen <- function(d, praed = character(0), steigung = '', zentrieren = FALSE, binaer = FALSE) {
  suppressMessages({ library(lme4); library(lmerTest) })
  sp_id(praed); if (nzchar(steigung)) sp_id(steigung)
  fl <- function(f) tryCatch(f, error = function(e) e)
  zwei <- 'g2' %in% names(d)
  d <- d[, c('y', 'g', praed, if (zwei) 'g2'), drop = FALSE]
  n_alle <- nrow(d)
  d <- d[stats::complete.cases(d), , drop = FALSE]
  d$y <- as.numeric(d$y); d$g <- factor(as.character(d$g))
  if (zwei) {
    if (binaer || nzchar(steigung)) return(list(fehler = 'two grouping factors: only a measured outcome and random intercepts'))
    d$g2 <- factor(as.character(d$g2))
  }
  if (zwei && length(unique(d$y)) == 2L) return(list(fehler = 'two grouping factors: only a measured outcome, not yes/no'))
  if (binaer) {
    yw <- sort(unique(d$y))
    if (length(yw) != 2L) return(list(fehler = 'binary outcome needs exactly two values'))
    d$y <- as.numeric(d$y == yw[2]); steigung <- ''
  }
  n <- nrow(d); ng <- nlevels(d$g)
  if (ng < 2L) return(list(fehler = 'one group only'))
  if (n <= ng) return(list(fehler = 'number of levels of each grouping factor must be < number of observations'))
  if (zwei) { ng2 <- nlevels(d$g2); if (ng2 < 2L) return(list(fehler = 'one group only')); if (n <= ng2) return(list(fehler = 'number of levels of each grouping factor must be < number of observations')) }
  gn <- as.integer(table(d$g))
  if (nzchar(steigung) && is.factor(d[[steigung]])) {
    if (nlevels(d[[steigung]]) != 2L) return(list(fehler = 'random slope needs a number or a variable with two values'))
    d[[steigung]] <- as.numeric(d[[steigung]] != levels(d[[steigung]])[1])   # 0/1: der Koeffizient heißt dann wie der Prädiktor
  }
  if (zentrieren) for (p in praed) if (is.numeric(d[[p]])) d[[p]] <- d[[p]] - mean(d[[p]])
  meld <- character(0); warn <- character(0)
  passe <- function(formel) withCallingHandlers(
    tryCatch(if (binaer) lme4::glmer(formel, data = d, family = stats::binomial) else lmerTest::lmer(formel, data = d, REML = TRUE), error = function(e) e),
    warning = function(w) { warn <<- c(warn, conditionMessage(w)); invokeRestart('muffleWarning') },
    message = function(m) { meld <<- c(meld, conditionMessage(m)); invokeRestart('muffleMessage') })
  f0 <- passe(if (zwei) y ~ 1 + (1 | g) + (1 | g2) else y ~ 1 + (1 | g))
  if (inherits(f0, 'error')) return(list(fehler = conditionMessage(f0)))
  vc0 <- as.data.frame(VarCorr(f0)); tau0 <- vc0$vcov[vc0$grp == 'g']; sig0 <- if (binaer) pi^2 / 3 else vc0$vcov[vc0$grp == 'Residual']
  tau0b <- if (zwei) vc0$vcov[vc0$grp == 'g2'] else 0
  icc <- tau0 / (tau0 + tau0b + sig0)
  out <- list(n = n, n_alle = n_alle, ng = ng, gn_min = min(gn), gn_med = stats::median(gn), gn_max = max(gn), gn_mittel = n / ng,
    y_mittel = mean(d$y), y_sd = stats::sd(d$y),
    null_tau = tau0, null_sigma = sig0, null_icc = icc, null_const = unname(lme4::fixef(f0)[1]),
    null_const_se = unname(summary(f0)$coefficients[1, 2]), null_const_df = if (binaer) NA_real_ else unname(summary(f0)$coefficients[1, 3]),
    deff = if (binaer || zwei) NA_real_ else 1 + (n / ng - 1) * icc, null_singular = lme4::isSingular(f0), binaer = binaer)
  if (zwei) out <- c(out, list(ng2 = nlevels(d$g2), gn2_min = min(table(d$g2)), gn2_max = max(table(d$g2)), null_tau2 = tau0b, null_icc2 = tau0b / (tau0 + tau0b + sig0)))
  fit <- f0
  if (length(praed)) {
    rhs <- paste(praed, collapse = ' + ')
    zuf <- if (nzchar(steigung)) paste0('(1 + ', steigung, ' | g)') else if (zwei) '(1 | g) + (1 | g2)' else '(1 | g)'
    warn <- character(0); meld <- character(0)
    fit <- passe(stats::as.formula(paste('y ~', rhs, '+', zuf)))
    if (inherits(fit, 'error')) return(c(out, list(fehler = conditionMessage(fit))))
  }
  sm <- summary(fit); co <- sm$coefficients
  qt <- if (binaer) rep(stats::qnorm(0.975), nrow(co)) else stats::qt(0.975, co[, 3])
  vc <- as.data.frame(VarCorr(fit))
  tau <- vc$vcov[vc$grp == 'g' & vc$var1 == '(Intercept)' & is.na(vc$var2)]
  sig <- if (binaer) pi^2 / 3 else vc$vcov[vc$grp == 'Residual']
  tau_b <- if (zwei) vc$vcov[vc$grp == 'g2' & vc$var1 == '(Intercept)' & is.na(vc$var2)] else 0
  mm <- stats::model.matrix(fit)
  vf <- stats::var(drop(mm %*% lme4::fixef(fit)))
  Lam <- lme4::getME(fit, 'Lambda'); ZL <- lme4::getME(fit, 'Z') %*% Lam
  vr <- if (binaer) tau else sig * sum(ZL@x^2) / n
  re <- lme4::ranef(fit, condVar = TRUE)$g
  pv <- attr(re, 'postVar')
  out <- c(out, list(
    fest_name = rownames(co), fest_term = attr(mm, 'assign'), fest_b = unname(co[, 1]), fest_se = unname(co[, 2]), fest_df = if (binaer) rep(NA_real_, nrow(co)) else unname(co[, 3]), fest_t = if (binaer) unname(co[, 3]) else unname(co[, 4]), fest_p = if (binaer) unname(co[, 4]) else unname(co[, 5]),
    fest_lo = unname(co[, 1] - qt * co[, 2]), fest_hi = unname(co[, 1] + qt * co[, 2]),
    tau = tau, sigma = sig, icc_voll = tau / (tau + tau_b + sig),
    r2_m = vf / (vf + vr + sig), r2_c = (vf + vr) / (vf + vr + sig), var_fest = vf, var_zuf = vr,
    gruppe = rownames(re), gruppe_n = as.integer(table(d$g)[rownames(re)]), gruppe_mittel = as.numeric(tapply(d$y, d$g, mean)[rownames(re)]),
    gruppe_abw = unname(re[, 1]), gruppe_se = sqrt(vapply(seq_len(dim(pv)[3]), function(i) pv[1, 1, i], 0)),
    singular = lme4::isSingular(fit), konv = any(grepl('converge|Hessian|unidentifiable|rescal', c(warn, meld), ignore.case = TRUE)),
    meldungen = unique(c(warn, meld)), mit_praed = length(praed) > 0))
  if (zwei) { out$tau2 <- tau_b; out$icc_voll2 <- tau_b / (tau + tau_b + sig) }
  if (nzchar(steigung)) {
    i <- which(vc$grp == 'g' & vc$var1 == steigung & is.na(vc$var2)); k <- which(vc$grp == 'g' & vc$var1 == '(Intercept)' & vc$var2 == steigung)
    out$tau_steigung <- vc$vcov[i]; out$kor_ach_steig <- vc$sdcor[k]
    out$gruppe_steigung <- unname(re[, 2])
  }
  if (length(praed) && !binaer) {
    out$aufgeklaert_1 <- (sig0 - sig) / sig0; out$aufgeklaert_2 <- (tau0 - tau) / tau0
    if (zwei && tau0b > 0) out$aufgeklaert_3 <- (tau0b - tau_b) / tau0b
    a <- stats::anova(fit)
    out$an_term <- rownames(a); out$an_f <- a[['F value']]; out$an_df1 <- a[['NumDF']]; out$an_df2 <- a[['DenDF']]; out$an_p <- a[['Pr(>F)']]
  }
  out
}

# ---------------------------------------------------------------------------------------------------------------
# Mehrebenen: Modellvergleich (Field-Stufe 2b, 05.11.2026). Alle Modelle mit ML (REML = FALSE), denn nur dann dürfen Modelle mit verschiedenen festen Effekten verglichen werden.
# d: Spalten y, g, p01 ... (wie sp_mehrebenen; die Oberfläche hat Zentrieren und Produkte schon in die Spalten gerechnet).
# feste: Namen der Haupteffekte, produkte: Namen der Produktspalten (Wechselwirkungen), steigung: Name einer Spalte mit zufälliger Steigung ('' = keine).
# Modelle: m0 Nullmodell (ICC), m1 feste Haupteffekte, m2 + Produkte, m3 + zufällige Steigung (Achsenabschnitt und Steigung dürfen korrelieren; Test mit 2 Freiheitsgraden: Varianz und Kovarianz).
# Likelihood-Quotienten-Test je Schritt: chi2 = 2 (logLik größer - logLik kleiner), df = Unterschied der Parameter, p = pchisq(oben). Der Test der zufälligen Steigung liegt am Rand
# des Parameterraums (Varianz >= 0): sein p-Wert ist eher zu groß (konservativ).
# ---------------------------------------------------------------------------------------------------------------
sp_meb_vergleich <- function(d, feste = character(0), produkte = character(0), steigung = '') {
  suppressMessages({ library(lme4) })
  sp_id(feste, produkte); if (nzchar(steigung)) sp_id(steigung)
  d <- d[, c('y', 'g', feste, produkte), drop = FALSE]
  d <- d[stats::complete.cases(d), , drop = FALSE]
  d$y <- as.numeric(d$y); d$g <- factor(as.character(d$g))
  if (length(unique(d$y)) == 2L) return(list(fehler = 'model comparison needs a measured outcome'))
  if (nlevels(d$g) < 2L || nrow(d) <= nlevels(d$g)) return(list(fehler = 'not enough groups'))
  if (nzchar(steigung) && !(steigung %in% c(feste, produkte))) return(list(fehler = 'random slope column is not in the model'))
  if (nzchar(steigung) && is.factor(d[[steigung]])) {
    if (nlevels(d[[steigung]]) != 2L) return(list(fehler = 'random slope needs a number or a variable with two values'))
    d[[steigung]] <- as.numeric(d[[steigung]] != levels(d[[steigung]])[1])
  }
  meld <- character(0)
  passe <- function(formel) withCallingHandlers(
    tryCatch(lme4::lmer(formel, data = d, REML = FALSE), error = function(e) e),
    warning = function(w) { meld <<- c(meld, conditionMessage(w)); invokeRestart('muffleWarning') },
    message = function(m) { meld <<- c(meld, conditionMessage(m)); invokeRestart('muffleMessage') })
  rhs1 <- if (length(feste)) paste(feste, collapse = ' + ') else NULL
  rhs2 <- if (length(c(feste, produkte))) paste(c(feste, produkte), collapse = ' + ') else NULL
  zi <- '(1 | g)'; zs <- if (nzchar(steigung)) paste0('(1 + ', steigung, ' | g)') else NULL
  mod <- list(m0 = stats::as.formula(paste('y ~ 1 +', zi)))
  if (length(feste)) mod$m1 <- stats::as.formula(paste('y ~', rhs1, '+', zi))
  if (length(produkte)) mod$m2 <- stats::as.formula(paste('y ~', rhs2, '+', zi))
  if (!is.null(zs)) mod$m3 <- stats::as.formula(paste('y ~', if (is.null(rhs2)) '1' else rhs2, '+', zs))
  fits <- list(); sing <- logical(0); konv <- logical(0); alle <- character(0)
  for (k in names(mod)) {
    meld <- character(0)
    f <- passe(mod[[k]])
    if (inherits(f, 'error')) return(list(fehler = conditionMessage(f)))
    alle <- c(alle, meld); fits[[k]] <- f; sing <- c(sing, lme4::isSingular(f)); konv <- c(konv, any(grepl('converge|Hessian|unidentifiable|rescal', meld, ignore.case = TRUE)))
  }
  ll <- vapply(fits, function(f) as.numeric(stats::logLik(f)), 0); np <- vapply(fits, function(f) attr(stats::logLik(f), 'df'), 0)
  v0 <- as.data.frame(VarCorr(fits$m0))
  nm <- names(fits); von <- character(0); nach <- character(0)
  for (i in seq_along(nm)[-1]) { von <- c(von, nm[i - 1L]); nach <- c(nach, nm[i]) }   # jedes Modell gegen das davor
  chi2 <- vapply(seq_along(nach), function(i) 2 * (ll[[nach[i]]] - ll[[von[i]]]), 0)
  dfv <- vapply(seq_along(nach), function(i) np[[nach[i]]] - np[[von[i]]], 0)
  letzt <- fits[[length(fits)]]; co <- summary(letzt)$coefficients
  list(modell = unname(nm), aic = unname(vapply(fits, stats::AIC, 0)), bic = unname(vapply(fits, stats::BIC, 0)), loglik = unname(ll), npar = unname(np), minus2ll = unname(-2 * ll),
    singular = sing, konv = konv, meldungen = unique(alle),
    vgl_von = von, vgl_nach = nach, vgl_chi2 = unname(chi2), vgl_df = unname(dfv), vgl_p = unname(stats::pchisq(chi2, dfv, lower.tail = FALSE)),
    icc = v0$vcov[v0$grp == 'g'] / sum(v0$vcov),
    fest_name = rownames(co), fest_b = unname(co[, 1]), fest_se = unname(co[, 2]))
}

# ---------------------------------------------------------------------------------------------------------------
# Meta-Analyse (metafor): Random-Effects-Modell, REML (wie JASP „Classical Meta-Analysis“, Standard von metafor::rma).
#   art = 'es'  : d$yi, d$sei                        (Effektstärke und Standardfehler, schon auf der Rechenskala)
#   art = 'smd' : d$m1i, d$sd1i, d$n1i, d$m2i, d$sd2i, d$n2i  -> escalc('SMD') = Hedges g
#   art = 'r'   : d$ri, d$ni                         -> escalc('ZCOR') = Fisher z (Rückrechnung nach r macht die Oberfläche)
#   kh = TRUE   : Knapp-Hartung (test = 'knha', Standard seit Abschlusstest F9): t-Test mit k-1 Freiheitsgraden, Prädiktionsintervall mit t (k-1) - so liefert es predict().
#   kh = FALSE  : z-Test (wie JASP-Voreinstellung); abschaltbar unter „Für Fachleute“.
#   pi_lb/pi_ub: predict(res) wie metafor und JASP (z, bei Knapp-Hartung t mit k-1); pit_lb/pit_ub: Variante nach IntHout et al. 2016 (t mit k-2).
# Egger: regtest(model = 'lm', predictor = 'sei') = klassischer Egger-Test (metafor-Hilfe zu regtest).
# ---------------------------------------------------------------------------------------------------------------
sp_meta <- function(d, art = 'es', kh = TRUE) {
  suppressMessages(library(metafor))
  art <- match.arg(art, c('es', 'smd', 'r'))
  if (art == 'smd') {
    es <- escalc(measure = 'SMD', m1i = d$m1i, sd1i = d$sd1i, n1i = d$n1i, m2i = d$m2i, sd2i = d$sd2i, n2i = d$n2i)
    yi <- as.numeric(es$yi); vi <- as.numeric(es$vi)
  } else if (art == 'r') {
    es <- escalc(measure = 'ZCOR', ri = d$ri, ni = d$ni)
    yi <- as.numeric(es$yi); vi <- as.numeric(es$vi)
  } else { yi <- as.numeric(d$yi); vi <- as.numeric(d$sei)^2 }
  ok <- is.finite(yi) & is.finite(vi) & vi > 0
  if (sum(ok) < 2L) return(list(fehler = 'fewer than two usable studies'))
  idx <- which(ok); yi <- yi[ok]; vi <- vi[ok]
  msgs <- character(0)
  res <- withCallingHandlers(
    rma(yi, vi, method = 'REML', test = if (isTRUE(kh)) 'knha' else 'z'),
    warning = function(w) { msgs <<- c(msgs, conditionMessage(w)); invokeRestart('muffleWarning') })
  ci <- tryCatch(suppressWarnings(confint(res)$random), error = function(e) NULL)
  cg <- function(zeile, sp) if (is.null(ci)) NA_real_ else unname(ci[zeile, sp])
  pr <- predict(res)
  # Prädiktionsintervall nach IntHout et al. (2016): Schätzung ± t(k - 2) · sqrt(tau² + SE²). metafor 5.2 rechnet predict() mit der Normalverteilung (Knapp-Hartung: t mit k - 1),
  # kennt diese Variante nicht; sie wird hier aus denselben Teilen gebildet. Bei k = 2 nicht definiert (df = 0).
  pit <- if (res$k > 2L) qt(0.975, res$k - 2L) * sqrt(res$tau2 + res$se^2) else NA_real_
  eg <- if (length(yi) >= 3L) tryCatch(suppressWarnings(regtest(res, model = 'lm', predictor = 'sei')), error = function(e) NULL) else NULL
  # Meta-Regression (S-H, 22.10.): Spalten d$mod1, d$mod2, … (Zahlen, je Studie; die Oberfläche hat Zeilen mit fehlenden Werten schon entfernt). Dasselbe Modell, REML, Test wie oben;
  # QM = Omnibus-Test aller Moderatoren (ohne Konstante), QE = Restheterogenität, R² = Anteil der Heterogenität, den die Moderatoren erklären (metafor: res$R2, in Prozent).
  mn <- grep('^mod[0-9]+$', names(d), value = TRUE)
  reg <- NULL
  if (length(mn) > 0L) {
    mods <- do.call(cbind, lapply(mn, function(n) as.numeric(d[[n]])[ok]))
    colnames(mods) <- mn
    rr <- withCallingHandlers(
      rma(yi, vi, mods = mods, method = 'REML', test = if (isTRUE(kh)) 'knha' else 'z'),
      warning = function(w) { msgs <<- c(msgs, conditionMessage(w)); invokeRestart('muffleWarning') })
    reg <- list(
      b = as.numeric(rr$beta), se = rr$se, stat = rr$zval, p = rr$pval, ci_lb = rr$ci.lb, ci_ub = rr$ci.ub,
      df = if (isTRUE(kh)) rr$ddf else NA_real_,
      qm = rr$QM, qm_df = rr$m, qm_p = rr$QMp, qm_stat = rr$QM,
      qe = rr$QE, qe_df = rr$k - rr$p, qe_p = rr$QEp,
      tau2 = rr$tau2, i2 = rr$I2, r2 = if (is.null(rr$R2)) NA_real_ else as.numeric(rr$R2), k = rr$k, p_koef = rr$p
    )
  }
  list(
    k = res$k, idx = idx,
    yi = yi, sei = sqrt(vi), gewicht = as.numeric(weights(res)),
    est = as.numeric(res$beta), se = res$se, ci_lb = res$ci.lb, ci_ub = res$ci.ub, stat = res$zval, p = res$pval,
    stat_df = if (isTRUE(kh)) res$ddf else NA_real_,
    pi_lb = as.numeric(pr$pi.lb), pi_ub = as.numeric(pr$pi.ub),
    pit_lb = as.numeric(res$beta) - pit, pit_ub = as.numeric(res$beta) + pit,
    tau2 = res$tau2, tau2_lo = cg(1, 2), tau2_hi = cg(1, 3), tau = sqrt(res$tau2), tau_lo = cg(2, 2), tau_hi = cg(2, 3),
    i2 = res$I2, i2_lo = cg(3, 2), i2_hi = cg(3, 3), h2 = res$H2,
    q = res$QE, q_df = res$k - 1, q_p = res$QEp,
    egger_stat = if (is.null(eg)) NA_real_ else as.numeric(eg$zval), egger_p = if (is.null(eg)) NA_real_ else as.numeric(eg$pval),
    egger_df = if (is.null(eg)) NA_real_ else as.numeric(eg$dfs),
    reg = reg,
    meldungen = msgs
  )
}

# ---------------------------------------------------------------------------------------------------------------
# Welle 3: ordinale, multinomiale und Zähldaten-Regression (Fachblatt docs/fachblaetter/WELLE3-REGRESSION-KATEGORIEN-ZAEHLDATEN.md, Nachtrag 16.10.)
# Gemeinsam (wie die logistische Regression in Statable): Wald-Konfidenzintervalle exp(B ± qnorm(,975)·SE), Wald-z und -p, Gruppen-Prädiktoren mit der ERSTEN Stufe als Vergleich
#   (die Oberfläche liefert die Stufen in der Reihenfolge von Statable, die R-Funktionen sortieren nichts um), Likelihood-Quotienten-Test je Prädiktor und gegen das Modell ohne Prädiktoren,
#   listenweise Auslassung (n = gültige Fälle, ausgelassen = die übrigen). Fehler kommen als list(fehler = '...') (englische Kurztexte, die Oberfläche übersetzt sie).
# ---------------------------------------------------------------------------------------------------------------
# Wald-Zeilen: effekt = 'or' (Odds-Verhältnis) oder 'irr' (Rate-Verhältnis); kategorie nur bei der multinomialen Regression.
kat_zeilen <- function(namen, b, se, effekt = 'or', kategorie = NULL) {
  namen <- unname(namen); b <- unname(b); se <- unname(se); q <- stats::qnorm(0.975)
  lapply(seq_along(b), function(i) {
    z <- b[i] / se[i]
    r <- list(name = namen[i])
    if (!is.null(kategorie)) r$kategorie <- kategorie
    r <- c(r, list(b = b[i], se = se[i], z = z, p = 2 * stats::pnorm(-abs(z))))
    r[[effekt]] <- exp(b[i]); r$ki_u <- exp(b[i] - q * se[i]); r$ki_o <- exp(b[i] + q * se[i])
    r
  })
}
# Likelihood-Quotienten-Test aus zwei logLik-Werten; geklemmt: negative χ² (Optimierer nicht am Ende) werden 0 mit p = 1.
kat_lr <- function(ll1, ll0, df, klemmen = FALSE) {
  chi2 <- 2 * (as.numeric(ll1) - as.numeric(ll0)); weg <- chi2 <= 0
  if (klemmen && weg) chi2 <- 0
  list(chi2 = chi2, df = df, p = if (klemmen && weg) 1 else stats::pchisq(chi2, df, lower.tail = FALSE))
}
# Cox-Snell- und Nagelkerke-R² aus logLik des Modells und des Modells ohne Prädiktoren (n = gültige Fälle).
kat_pseudo <- function(ll1, ll0, n) { cs <- 1 - exp(2 * (ll0 - ll1) / n); list(coxsnell = cs, nagelkerke = cs / (1 - exp(2 * ll0 / n))) }
# logLik des Modells ohne Prädiktoren aus den Häufigkeiten der Zielstufen (ordinal und multinomial gleich): Σ n_j · ln(n_j / n).
kat_ll_null <- function(y) { t <- as.numeric(table(y)); t <- t[t > 0]; sum(t * log(t / sum(t))) }
# Daten: Gruppen-Prädiktoren als Faktor (Stufen in der übergebenen Reihenfolge, nie umsortiert), listenweise Auslassung, leere Stufen entfallen.
kat_daten <- function(d, ziel, praed, faktoren, extra = character(0)) {
  if (!length(praed)) stop('no predictors')
  for (p in faktoren) if (p %in% praed && !is.factor(d[[p]])) d[[p]] <- factor(d[[p]])
  for (p in praed) if (is.factor(d[[p]])) d[[p]] <- factor(d[[p]], ordered = FALSE)
  spalten <- c(ziel, praed, extra)
  ok <- stats::complete.cases(d[, spalten, drop = FALSE])
  v <- d[ok, spalten, drop = FALSE]; rownames(v) <- NULL
  for (p in praed) if (is.factor(v[[p]])) { v[[p]] <- droplevels(v[[p]]); if (nlevels(v[[p]]) < 2L) stop('a group predictor has only one group left') }
  list(v = v, n = nrow(v), ausgelassen = nrow(d) - nrow(v))
}
# Zielspalte als Text in die Reihenfolge `stufen` (Statable-Ordnung; ohne Angabe: Reihenfolge des ersten Auftretens). Unbekannte Werte werden NA.
kat_ziel <- function(d, ziel, stufen, geordnet) {
  y <- as.character(d[[ziel]])
  if (is.null(stufen)) stufen <- unique(y[!is.na(y)])
  d[[ziel]] <- factor(y, levels = as.character(stufen), ordered = geordnet)
  d
}

# --- G18a Ordinale Regression (Proportional-Odds-Modell, MASS::polr) ---
# polr mit festen Einstellungen (sonst SE bis 3e-4 relativ ungenau: Abbruch bei reltol 1e-8, Hesse-Schritt 1e-3).
ord_fit <- function(f, v, ziel) {
  npar <- ncol(stats::model.matrix(f, v)) - 1L + nlevels(v[[ziel]]) - 1L
  tryCatch(MASS::polr(f, data = v, method = 'logistic', Hess = TRUE, control = list(reltol = 1e-14, maxit = 1000, ndeps = rep(1e-6, npar))),
    error = function(e) stop('polr failed: ', conditionMessage(e), call. = FALSE))
}
# Brant-Test (Brant 1990, Biometrics 46, 1171-1178): J-1 binäre Logit-Modelle für y <= j; Kovarianz der Steigungen
#   Cov(b_j, b_k) = (X'W_j X)^-1 X' diag(p_j (1 - p_k)) X (X'W_k X)^-1 (j <= k, unterer Block transponiert), W_j = diag(p_j (1 - p_j));
#   Wald-Test, dass benachbarte Steigungen gleich sind. Gesamt und je Prädiktor (df = (J - 2) · Zahl seiner Koeffizienten).
# Nicht prüfbar (brant_fehler): eine Teilung konvergiert nicht, eine Zelle Gruppenstufe × Teilung ist leer, oder die Kovarianz ist nicht brauchbar.
ord_brant <- function(f, v, ziel) {
  X <- stats::model.matrix(f, v); zuord <- attr(X, 'assign')[-1]; y <- as.integer(v[[ziel]]); J <- max(y); K <- ncol(X) - 1L
  teil <- seq_len(J - 1L)
  fit <- lapply(teil, function(j) suppressWarnings(stats::glm.fit(X, as.numeric(y <= j), family = stats::binomial())))
  if (!all(vapply(fit, function(g) isTRUE(g$converged), TRUE))) return(list(fehler = 'a binary split did not converge'))
  labels <- attr(stats::terms(f), 'term.labels')
  gruppen <- labels[vapply(labels, function(t) is.factor(v[[t]]), TRUE)]
  if (any(vapply(teil, function(j) any(vapply(gruppen, function(t) any(table(y <= j, v[[t]]) == 0), TRUE)), TRUE))) return(list(fehler = 'an empty cell in group x split'))
  b <- lapply(fit, function(g) g$coefficients[-1]); p <- lapply(fit, function(g) g$fitted.values)
  kov <- function(j, k) {
    Aj <- solve(crossprod(X, X * (p[[j]] * (1 - p[[j]])))); Ak <- solve(crossprod(X, X * (p[[k]] * (1 - p[[k]]))))
    (Aj %*% crossprod(X, X * (p[[j]] * (1 - p[[k]]))) %*% Ak)[-1, -1, drop = FALSE]
  }
  V <- matrix(0, (J - 1L) * K, (J - 1L) * K)
  for (j in teil) for (k in j:(J - 1L)) {
    B <- kov(j, k); V[(j - 1L) * K + 1:K, (k - 1L) * K + 1:K] <- B; V[(k - 1L) * K + 1:K, (j - 1L) * K + 1:K] <- t(B)
  }
  test <- function(idx) {
    q <- length(idx); pos <- unlist(lapply(0:(J - 2L), function(j) j * K + idx)); bs <- unlist(lapply(b, function(z) z[idx]))
    Dj <- cbind(diag(J - 2L), 0) - cbind(0, diag(J - 2L)); D <- kronecker(Dj, diag(q))
    chi2 <- drop(t(D %*% bs) %*% solve(D %*% V[pos, pos, drop = FALSE] %*% t(D)) %*% (D %*% bs)); df <- (J - 2L) * q
    list(chi2 = chi2, df = df, p = stats::pchisq(chi2, df, lower.tail = FALSE))
  }
  erg <- tryCatch({
    gesamt <- test(seq_len(K))
    je <- lapply(split(seq_len(K), zuord), test); names(je) <- labels[as.integer(names(je))]
    list(gesamt = gesamt, praed = unname(lapply(names(je), function(nm) c(list(name = nm), je[[nm]]))))
  }, error = function(e) NULL)
  if (is.null(erg) || !is.finite(erg$gesamt$chi2) || erg$gesamt$chi2 < 0 || any(!is.finite(vapply(erg$praed, function(z) z$chi2, 0)))) return(list(fehler = 'the covariance of the splits is not usable'))
  erg
}
# d: Spalten ziel (Text: Beschriftungen) und praed (Zahl oder Faktor, Faktoren mit der Vergleichsgruppe zuerst); faktoren: Namen der Gruppen-Prädiktoren;
# stufen: ALLE Zielstufen in der Ordnung von Statable (von niedrig nach hoch), auch solche ohne Fälle - sie fallen weg und stehen nicht in `stufen` der Antwort.
sp_ordreg <- function(d, ziel, praed, faktoren = character(0), stufen = NULL) {
  tryCatch({ sp_id(ziel, praed, faktoren); ord_reg(d, ziel, praed, faktoren, stufen) }, error = function(e) list(fehler = conditionMessage(e)))
}
ord_reg <- function(d, ziel, praed, faktoren, stufen) {
  d <- kat_ziel(d, ziel, stufen, TRUE)
  k <- kat_daten(d, ziel, praed, faktoren); v <- k$v; v[[ziel]] <- droplevels(v[[ziel]]); n <- k$n; J <- nlevels(v[[ziel]])
  if (J < 2L) stop('the outcome has only one level')
  if (J == 2L) stop('only two levels (two levels: this is a logistic regression)')
  f <- stats::reformulate(praed, ziel)
  warn <- character(0)
  m <- withCallingHandlers(ord_fit(f, v, ziel), warning = function(w) { warn <<- c(warn, conditionMessage(w)); invokeRestart('muffleWarning') })
  b <- stats::coef(m); se <- sqrt(diag(stats::vcov(m))); ll <- as.numeric(stats::logLik(m)); ll0 <- kat_ll_null(v[[ziel]])
  nz <- names(m$zeta)
  lr <- lapply(praed, function(p) {
    rest <- setdiff(praed, p)
    llr <- if (length(rest)) as.numeric(stats::logLik(ord_fit(stats::reformulate(rest, ziel), v, ziel))) else ll0
    ncr <- if (length(rest)) ncol(stats::model.matrix(stats::reformulate(rest, ziel), v)) - 1L else 0L
    c(list(name = p), kat_lr(ll, llr, length(b) - ncr))
  })
  out <- c(list(n = n, ausgelassen = k$ausgelassen, stufen = levels(v[[ziel]]), stufen_n = as.integer(table(v[[ziel]])),
    koef = kat_zeilen(names(b), b, se[names(b)], 'or'),
    schwellen = lapply(nz, function(s) list(name = s, theta = unname(m$zeta[s]), se = unname(se[s]))),
    lr_praed = lr, modelltest = kat_lr(ll, ll0, length(b)), loglik = ll, loglik0 = ll0, warnungen = unique(warn)),
    kat_pseudo(ll, ll0, n))
  br <- ord_brant(f, v, ziel)
  if (is.null(br$fehler)) out$brant <- br else out$brant_fehler <- br$fehler
  out$brant_pruefbar <- is.null(br$fehler)
  out
}

# --- G18b Multinomiale Regression (nnet::multinom, Vergleichskategorie `referenz`) ---
mult_fit <- function(f, v) nnet::multinom(f, data = v, Hess = TRUE, maxit = 1000, reltol = 1e-12, trace = FALSE)
# referenz: Beschriftung der Vergleichskategorie des Ziels; stufen (optional): Reihenfolge der Zielkategorien (Statable-Ordnung), sonst Reihenfolge des ersten Auftretens.
# Die Antwort nennt `kategorien` ohne die Vergleichskategorie in dieser Reihenfolge.
sp_multreg <- function(d, ziel, praed, faktoren = character(0), referenz, stufen = NULL) {
  tryCatch({ sp_id(ziel, praed, faktoren); mult_reg(d, ziel, praed, faktoren, referenz, stufen) }, error = function(e) list(fehler = conditionMessage(e)))
}
mult_reg <- function(d, ziel, praed, faktoren, referenz, stufen) {
  d <- kat_ziel(d, ziel, stufen, FALSE)
  k <- kat_daten(d, ziel, praed, faktoren); v <- k$v; v[[ziel]] <- droplevels(v[[ziel]]); n <- k$n; J <- nlevels(v[[ziel]])
  if (J < 2L) stop('the outcome has only one level')
  if (J == 2L) stop('only two levels (two levels: this is a logistic regression)')
  if (!(referenz %in% levels(v[[ziel]]))) stop('reference category not found among the outcome levels')
  v[[ziel]] <- stats::relevel(v[[ziel]], ref = referenz)
  kat <- levels(v[[ziel]])
  f <- stats::reformulate(praed, ziel)
  warn <- character(0)
  fange <- function(expr) withCallingHandlers(expr, warning = function(w) { warn <<- c(warn, conditionMessage(w)); invokeRestart('muffleWarning') })
  m <- fange(mult_fit(f, v)); konv <- m$convergence == 0
  S <- summary(m); B <- S$coefficients; SE <- S$standard.errors
  ll <- as.numeric(stats::logLik(m)); ll0 <- kat_ll_null(v[[ziel]]); ncoef <- ncol(B) - 1L
  koef <- unlist(lapply(kat[-1], function(kk) kat_zeilen(colnames(B), B[kk, ], SE[kk, ], 'or', kk)), recursive = FALSE)
  lr <- lapply(praed, function(p) {
    rest <- setdiff(praed, p); ok <- konv
    if (length(rest)) { fr <- stats::reformulate(rest, ziel); mr <- fange(mult_fit(fr, v)); llr <- as.numeric(stats::logLik(mr)); ncr <- ncol(stats::model.matrix(fr, v)) - 1L; ok <- ok && mr$convergence == 0 }
    else { llr <- ll0; ncr <- 0L }
    t <- kat_lr(ll, llr, (J - 1L) * (ncoef - ncr)); g <- kat_lr(ll, llr, (J - 1L) * (ncoef - ncr), klemmen = TRUE)
    c(list(name = p), g, list(unsicher = !ok || t$chi2 <= 0))
  })
  mt <- kat_lr(ll, ll0, (J - 1L) * ncoef, klemmen = TRUE); mt$unsicher <- !konv || 2 * (ll - ll0) <= 0
  c(list(n = n, ausgelassen = k$ausgelassen, referenz = kat[1], kategorien = kat[-1], stufen_n = as.integer(table(v[[ziel]])), konvergiert = konv, n_parameter = (J - 1L) * (ncoef + 1L),
    koef = koef, lr_praed = lr, modelltest = mt, loglik = ll, loglik0 = ll0, warnungen = unique(warn)),
    kat_pseudo(ll, ll0, n))
}

# --- S3 Zähldaten: Poisson und negativ-binomiale Regression (glm, Log-Link) ---
# Negativ-binomial robust über die Profil-Likelihood statt MASS::glm.nb (das bei Null-Überschuss ein riesiges θ als „konvergiert“ meldet):
#   θ̂ = argmax über log θ in [log 1e-3, log 1e4] von logLik(glm(f, negative.binomial(θ))); B und SE aus diesem glm (θ fest, dispersion = 1 - wie SPSS GENLIN);
#   SE(θ) aus der Fisher-Information bei θ̂ wie MASS::theta.ml. Liegt θ̂ am oberen Rand, ist keine Überdispersion erkennbar (rand_oben).
zaehl_nb <- function(f, v) {
  y <- stats::model.response(stats::model.frame(f, v))
  fit <- function(th) suppressWarnings(stats::glm(f, MASS::negative.binomial(th), v))
  o <- stats::optimize(function(lt) sum(stats::dnbinom(y, size = exp(lt), mu = stats::fitted(fit(exp(lt))), log = TRUE)), log(c(1e-3, 1e4)), maximum = TRUE, tol = 1e-10)
  th <- exp(o$maximum); m <- fit(th); mu <- stats::fitted(m)
  list(m = m, theta = th, se_theta = 1 / sqrt(sum(trigamma(th) - trigamma(th + y) - 1 / th + 2 / (mu + th) - (y + th) / (mu + th)^2)),
    loglik = o$objective, mu = mu, rand_oben = log(1e4) - o$maximum < 1e-4)
}
# modell: 'auto' | 'poisson' | 'negbin'; zeit: Name der Beobachtungszeit-Spalte (Offset log(zeit)) oder NULL.
# auto: Poisson gegen negativ-binomial per Likelihood-Quotienten-Test, p = ½·P(χ²₁ > LR) (Nullhypothese am Rand, Self & Liang 1987), bei LR <= 0 p = 1;
#   p < ,05 und θ̂ nicht am Rand: negativ-binomial, sonst Poisson. `grund` sagt, warum.
sp_zaehlreg <- function(d, ziel, praed, faktoren = character(0), modell = 'auto', zeit = NULL) {
  tryCatch({ sp_id(ziel, praed, faktoren, if (!is.null(zeit) && !is.na(zeit) && nzchar(zeit)) zeit); zaehl_reg(d, ziel, praed, faktoren, modell, zeit) }, error = function(e) list(fehler = conditionMessage(e)))
}
zaehl_reg <- function(d, ziel, praed, faktoren, modell, zeit) {
  if (is.null(zeit) || is.na(zeit) || !nzchar(zeit)) zeit <- NULL
  d[[ziel]] <- suppressWarnings(as.numeric(d[[ziel]]))
  k <- kat_daten(d, ziel, praed, faktoren, zeit); v <- k$v; n <- k$n; y <- v[[ziel]]
  if (any(y < 0)) stop('count outcome must not be negative')
  if (any(y != round(y))) stop('count outcome must be whole numbers')
  if (!is.null(zeit) && any(v[[zeit]] <= 0)) stop('observation time must be greater than 0')
  ot <- if (!is.null(zeit)) paste0('offset(log(', zeit, '))')
  f <- stats::reformulate(c(praed, ot), ziel); f0 <- stats::reformulate(c('1', ot), ziel)
  ohne <- function(p) { rest <- setdiff(praed, p); stats::reformulate(c(if (length(rest)) rest else '1', ot), ziel) }
  warn <- character(0)
  fange <- function(expr) withCallingHandlers(expr, warning = function(w) { warn <<- c(warn, conditionMessage(w)); invokeRestart('muffleWarning') })
  mp <- fange(stats::glm(f, stats::poisson, v)); llp <- as.numeric(stats::logLik(mp))
  pearson <- sum(stats::residuals(mp, 'pearson')^2) / mp$df.residual
  nb <- tryCatch(zaehl_nb(f, v), error = function(e) NULL)
  if (is.null(nb) && modell == 'negbin') stop('negative binomial model could not be estimated')
  lr <- if (is.null(nb)) NA_real_ else 2 * (nb$loglik - llp)
  p_ueber <- if (is.na(lr)) NA_real_ else if (lr <= 0) 1 else 0.5 * stats::pchisq(lr, 1, lower.tail = FALSE)
  wahl <- if (modell == 'poisson') list('poisson', 'gewaehlt') else if (modell == 'negbin') list('negbin', 'gewaehlt')
    else if (is.null(nb)) list('poisson', 'negbin_fehlt') else if (nb$rand_oben) list('poisson', 'theta_am_rand')
    else if (p_ueber < 0.05) list('negbin', 'ueberdispersion') else list('poisson', 'keine_ueberdispersion')
  neg <- wahl[[1]] == 'negbin'
  m <- if (neg) nb$m else mp; ll <- if (neg) nb$loglik else llp; mu <- stats::fitted(m)
  S <- stats::coef(summary(m, dispersion = 1)); b <- S[, 1]; se <- S[, 2]; ncoef <- length(b) - 1L
  if (neg) { nb0 <- zaehl_nb(f0, v); ll0 <- nb0$loglik } else ll0 <- as.numeric(stats::logLik(stats::glm(f0, stats::poisson, v)))
  lrp <- lapply(praed, function(p) {
    fr <- ohne(p)
    mr <- if (neg) zaehl_nb(fr, v) else fange(stats::glm(fr, stats::poisson, v))
    llr <- if (neg) mr$loglik else as.numeric(stats::logLik(mr))
    ncr <- length(stats::coef(if (neg) mr$m else mr))
    c(list(name = p), kat_lr(ll, llr, length(b) - ncr, klemmen = TRUE))
  })
  erw0 <- if (neg) mean(stats::dnbinom(0, size = nb$theta, mu = mu)) else mean(stats::dpois(0, mu)); beo0 <- mean(y == 0)
  list(n = n, ausgelassen = k$ausgelassen, modell = wahl[[1]], grund = wahl[[2]],
    theta = if (neg) nb$theta else NA_real_, theta_se = if (neg) nb$se_theta else NA_real_, theta_am_rand = if (is.null(nb)) NA else nb$rand_oben,
    pearson_df = pearson, lr_ueber = list(chi2 = if (is.na(lr)) NA_real_ else max(lr, 0), p = p_ueber),
    nullen = list(beobachtet = beo0, erwartet = erw0), nullen_hinweis = beo0 > 1.5 * erw0 && beo0 > 0.10,
    offset = if (is.null(zeit)) NA_character_ else zeit, mittelwert = mean(y), varianz = stats::var(y),
    koef = kat_zeilen(rownames(S), b, se, 'irr'), lr_praed = lrp, modelltest = kat_lr(ll, ll0, ncoef), loglik = ll, loglik0 = ll0,
    konvergiert = isTRUE(m$converged), warnungen = unique(warn))
}

# ---------------------------------------------------------------------------------------------------------------
# Welle 7, M1: Cox-Regression (survival::coxph; Fachblatt docs/fachblaetter/WELLE7-MEDIZIN-TESTS-PCA.md, Nachtrag 16.10.)
# d: Spalten `zeit` (Zahl >= 0), `ereignis` (0/1, 1 = Ereignis; die Oberfläche codiert vorher um), `praed` (Zahl oder Faktor, Faktoren mit der Vergleichsgruppe zuerst).
# ties = 'efron' (Voreinstellung von R und Statable) | 'breslow' (so rechnet SPSS COXREG; nur für Hilfe und Vergleich). Fehlende Werte listenweise.
# Antwort: n, ausgelassen, ereignisse, npar, epv (= Ereignisse je Koeffizient), epv_hinweis (< 10, Peduzzi et al. 1995), koef (B, SE, z, p, HR, Wald-KI), loglik, loglik0, modelltest (LR),
#   lr_praed (LR je Prädiktor, Gruppen zusammen), ph (cox.zph, Score-Test, gesamt und je Prädiktor; ph_fehler, wenn nicht berechenbar), konkordanz (Harrells C), trennung, warnungen.
# Fehler kommen als list(fehler = '...') (englische Kurztexte, die Oberfläche übersetzt sie).
# ---------------------------------------------------------------------------------------------------------------
sp_cox <- function(d, zeit, ereignis, praed, faktoren = character(0), ties = 'efron') {
  tryCatch({ sp_id(zeit, ereignis, praed, faktoren); cox_reg(d, zeit, ereignis, praed, faktoren, ties) }, error = function(e) list(fehler = conditionMessage(e)))
}
cox_formel <- function(zeit, ereignis, praed) {
  stats::as.formula(paste0('survival::Surv(`', zeit, '`, `', ereignis, '`) ~ ', paste0('`', praed, '`', collapse = ' + ')))
}
cox_reg <- function(d, zeit, ereignis, praed, faktoren, ties) {
  ties <- match.arg(ties, c('efron', 'breslow'))
  k <- kat_daten(d, zeit, praed, faktoren, extra = ereignis); v <- k$v
  if (!is.numeric(v[[zeit]]) || !is.numeric(v[[ereignis]])) stop('time and event must be numbers')
  if (any(v[[zeit]] < 0)) stop('negative times')
  if (!all(v[[ereignis]] %in% c(0, 1))) stop('the event must be coded 0 or 1')
  if (sum(v[[ereignis]] == 1) == 0) stop('no event among the valid cases')
  f <- cox_formel(zeit, ereignis, praed)
  warn <- character(0)
  fange <- function(expr) withCallingHandlers(expr, warning = function(w) { warn <<- c(warn, conditionMessage(w)); invokeRestart('muffleWarning') })
  # die Daten stehen im Aufruf (cox.zph wertet fit$call später selbst aus und fände ein lokales `v` sonst nicht)
  fit <- fange(eval(bquote(survival::coxph(.(f), data = .(v), ties = .(ties)))))
  b <- unname(stats::coef(fit)); nm <- names(stats::coef(fit)); se <- unname(sqrt(diag(stats::vcov(fit))))
  npar <- length(b); ll <- fit$loglik[2]; ll0 <- fit$loglik[1]; ev <- fit$nevent
  lr <- lapply(praed, function(p) {
    rest <- setdiff(praed, p)
    llr <- if (length(rest)) survival::coxph(cox_formel(zeit, ereignis, rest), data = v, ties = ties)$loglik[2] else ll0
    c(list(name = p), kat_lr(ll, llr, length(fit$assign[[p]])))
  })
  z <- tryCatch(suppressWarnings(survival::cox.zph(fit, transform = 'km', terms = TRUE)), error = function(e) e)
  out <- list(ties = ties, n = fit$n, ausgelassen = k$ausgelassen, ereignisse = ev, npar = npar, epv = ev / npar, epv_hinweis = ev / npar < 10,
    koef = kat_zeilen(nm, b, se, 'hr'), loglik = ll, loglik0 = ll0, modelltest = kat_lr(ll, ll0, npar), lr_praed = lr,
    konkordanz = list(c = unname(fit$concordance['concordance']), se = unname(fit$concordance['std'])),
    trennung = any(grepl('may be infinite|did not converge|ran out of iterations', warn, ignore.case = TRUE)), warnungen = unique(warn))
  if (inherits(z, 'error')) out$ph_fehler <- conditionMessage(z)
  else {
    tb <- z$table; g <- tb['GLOBAL', ]
    out$ph <- list(gesamt = list(chi2 = unname(g['chisq']), df = unname(g['df']), p = unname(g['p'])),
      praed = lapply(praed, function(p) list(name = p, chi2 = unname(tb[p, 'chisq']), df = unname(tb[p, 'df']), p = unname(tb[p, 'p']))))
  }
  out
}
