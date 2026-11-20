# Kurs-Paket: Diskriminanzanalyse, loglineare Modelle, MANOVA, Probit, gewichtete Regression. Fachblatt: docs/fachblaetter/KURSPAKET.md
# Nur stats und MASS (kein neues Paket). Verlangt statable.R (sp_id, kat_daten). Gegenprobe: scripts/kurspaket-erwartet.R.
# Die Funktionen werfen nie: ein Fehler kommt als list(fehler = '<code oder englische Kurzmeldung>'), die Oberfläche macht daraus einen Satz.
# Daten nur als Objekt `d`, Bezeichner (Spalten) nur geprüft über sp_id; Text aus den Daten (Gruppennamen) kommt als Argument, nie als Code.

kp_zeilen <- function(M) lapply(seq_len(nrow(M)), function(i) as.numeric(M[i, ]))
kp_fange <- function(expr, warn) withCallingHandlers(expr, warning = function(w) { warn$w <- c(warn$w, conditionMessage(w)); invokeRestart('muffleWarning') })

# ---------------------------------------------------------------------------------------------------------------
# 1. Diskriminanzanalyse. d: Spalte g (Gruppe, Text), Zahlenspalten x. stufen = Reihenfolge der Gruppen (Statable).
# lda(X, g) MIT DEM STANDARD (Funktionen, Eigenwerte, Wilks hängen nicht an den Vorwahrscheinlichkeiten, wie SPSS). Die Vorwahrscheinlichkeiten
# wirken nur auf die Einteilung: gleich (1/k) oder nach Gruppengröße; beide kommen zurück. Vorzeichen: erster Koeffizient je Funktion positiv.
# ---------------------------------------------------------------------------------------------------------------
sp_diskr <- function(d, g, x, stufen = NULL) {
  tryCatch({ sp_id(g, x); diskr_rechnen(d, g, x, stufen) }, error = function(e) list(fehler = conditionMessage(e)))
}
diskr_rechnen <- function(d, g, x, stufen) {
  gg <- as.character(d[[g]])
  if (is.null(stufen)) stufen <- unique(gg[!is.na(gg)])
  X <- as.matrix(as.data.frame(lapply(d[x], as.numeric), optional = TRUE)); colnames(X) <- x
  ok <- !is.na(gg) & gg %in% as.character(stufen) & stats::complete.cases(X)
  nAlle <- nrow(d); X <- X[ok, , drop = FALSE]; gf <- droplevels(factor(gg[ok], levels = as.character(stufen)))
  n <- nrow(X); p <- ncol(X); k <- nlevels(gf)
  if (k < 2L || n <= k) return(list(fehler = 'zu-wenig'))
  W <- Reduce(`+`, lapply(levels(gf), function(l) { z <- X[gf == l, , drop = FALSE]; crossprod(scale(z, scale = FALSE)) })) / (n - k)
  sdW <- sqrt(diag(W))
  if (any(!is.finite(sdW)) || any(sdW <= 0) || qr(W / outer(sdW, sdW), tol = 1e-8)$rank < p) return(list(fehler = 'kollinear'))
  f <- tryCatch(MASS::lda(X, gf), error = function(e) NULL)
  if (is.null(f)) return(list(fehler = 'kollinear'))
  m <- min(p, k - 1L)
  Lm <- f$scaling[, seq_len(m), drop = FALSE]; vz <- sign(Lm[1, ]); vz[vz == 0] <- 1; Lm <- sweep(Lm, 2, vz, '*')
  ew <- f$svd[seq_len(m)]^2 * (k - 1) / (n - k)
  wilks <- vapply(seq_len(m), function(j) prod(1 / (1 + ew[j:m])), 0)
  chi <- -(n - 1 - (p + k) / 2) * log(wilks); df <- vapply(seq_len(m), function(j) (p - j + 1) * (k - j), 0)
  std <- sweep(Lm, 1, sdW, '*')
  Z <- sweep(X, 2, colMeans(X)) %*% Lm
  zen <- do.call(rbind, lapply(levels(gf), function(l) colMeans(Z[gf == l, , drop = FALSE])))
  einteilung <- function(pr) {
    gehoert <- factor(as.character(stats::predict(f, X, prior = pr)$class), levels = levels(gf))
    cv <- factor(as.character(MASS::lda(X, gf, prior = pr, CV = TRUE)$class), levels = levels(gf))
    list(tabelle = kp_zeilen(matrix(as.integer(table(gf, gehoert)), k, k)), tabelle_loo = kp_zeilen(matrix(as.integer(table(gf, cv)), k, k)),
      treffer = mean(gehoert == gf), treffer_loo = mean(cv == gf))
  }
  list(n = n, n_alle = nAlle, ausgelassen = nAlle - n, p = p, k = k, gruppen = levels(gf), gruppen_n = as.integer(table(gf)),
    eigen = ew, anteil = ew / sum(ew), kanon = sqrt(ew / (1 + ew)), wilks = wilks, chi = chi, df = df, pw = stats::pchisq(chi, df, lower.tail = FALSE),
    standard = lapply(seq_len(m), function(j) as.numeric(std[, j])), zentroide = kp_zeilen(zen),
    gleich = einteilung(rep(1 / k, k)), groesse = einteilung(as.numeric(table(gf)) / n))
}

# ---------------------------------------------------------------------------------------------------------------
# 2. Loglineare Modelle. d: Faktor-Spalten `faktoren` (Statable-Faktoren), optional Häufigkeitsspalte `haeuf`.
# modelle = Liste von Modellen, ein Modell = Liste von Termen, ein Term = Vektor von Faktor-Bezeichnern (hierarchisch: die Oberfläche nimmt die Haupteffekte mit hinein).
# Gezählt wird je Zelle der vollen Tabelle, AUCH die leeren (sonst stimmt df nicht): glm(Freq ~ Terme, poisson).
# ---------------------------------------------------------------------------------------------------------------
sp_loglin <- function(d, faktoren, haeuf = NULL, modelle) {
  tryCatch({ sp_id(faktoren, haeuf, unlist(modelle)); loglin_rechnen(d, faktoren, haeuf, modelle) }, error = function(e) list(fehler = conditionMessage(e)))
}
loglin_rechnen <- function(d, faktoren, haeuf, modelle) {
  if (!is.null(haeuf) && (is.na(haeuf) || !nzchar(haeuf))) haeuf <- NULL
  spalten <- c(faktoren, haeuf)
  ok <- stats::complete.cases(d[, spalten, drop = FALSE]); nAlle <- nrow(d)
  v <- d[ok, spalten, drop = FALSE]
  for (f in faktoren) v[[f]] <- droplevels(factor(v[[f]]))
  cnt <- if (is.null(haeuf)) rep(1, nrow(v)) else as.numeric(v[[haeuf]])
  if (any(cnt < 0)) stop('negative frequency')
  if (!is.null(haeuf) && any(cnt != round(cnt))) stop('frequency must be whole numbers')
  if (prod(vapply(faktoren, function(f) nlevels(v[[f]]), 0)) > 20000) stop('too many cells')
  tab <- stats::xtabs(cnt ~ ., data = v[, faktoren, drop = FALSE])
  zellen <- as.data.frame(tab, responseName = 'Freq', stringsAsFactors = TRUE)
  warn <- new.env(); warn$w <- character(0)
  einzel <- function(terme) {
    tl <- vapply(terme, function(t) paste(t, collapse = ':'), '')
    g <- kp_fange(stats::glm(stats::reformulate(tl, 'Freq'), family = stats::poisson, data = zellen), warn)
    mu <- stats::fitted(g)
    g2 <- stats::deviance(g); df <- stats::df.residual(g); x2 <- sum(stats::residuals(g, 'pearson')^2)
    list(g2 = g2, df = df, p = if (df > 0) stats::pchisq(g2, df, lower.tail = FALSE) else NA_real_, x2 = x2, p_x2 = if (df > 0) stats::pchisq(x2, df, lower.tail = FALSE) else NA_real_,
      aic = stats::AIC(g), erwartet_min = min(mu), kleiner5 = mean(mu < 5), konvergiert = isTRUE(g$converged))
  }
  list(n = sum(zellen$Freq), n_alle = nAlle, ausgelassen = nAlle - nrow(v), zellen = nrow(zellen), leer = sum(zellen$Freq == 0), stufen = as.integer(vapply(faktoren, function(f) nlevels(v[[f]]), 0)),
    modelle = lapply(modelle, einzel))
}

# ---------------------------------------------------------------------------------------------------------------
# 3. MANOVA. d: Zahlenspalten y (Zielgrößen), Gruppenspalte g (Text). Vier Prüfgrößen aus summary.manova, dann je Zielgröße eine einfaktorielle Varianzanalyse.
# ---------------------------------------------------------------------------------------------------------------
sp_manova <- function(d, y, g, stufen = NULL) {
  tryCatch({ sp_id(y, g); manova_rechnen(d, y, g, stufen) }, error = function(e) list(fehler = conditionMessage(e)))
}
manova_rechnen <- function(d, y, g, stufen) {
  gg <- as.character(d[[g]])
  if (is.null(stufen)) stufen <- unique(gg[!is.na(gg)])
  Y <- as.matrix(as.data.frame(lapply(d[y], as.numeric), optional = TRUE)); colnames(Y) <- y
  ok <- !is.na(gg) & gg %in% as.character(stufen) & stats::complete.cases(Y)
  nAlle <- nrow(d); Y <- Y[ok, , drop = FALSE]; gf <- droplevels(factor(gg[ok], levels = as.character(stufen)))
  n <- nrow(Y); q <- ncol(Y); k <- nlevels(gf)
  if (k < 2L || n <= q + k) return(list(fehler = 'zu-wenig'))
  E <- Reduce(`+`, lapply(levels(gf), function(l) crossprod(scale(Y[gf == l, , drop = FALSE], scale = FALSE))))
  sdE <- sqrt(diag(E))
  if (any(!is.finite(sdE)) || any(sdE <= 0) || qr(E / outer(sdE, sdE), tol = 1e-8)$rank < q) return(list(fehler = 'kollinear'))
  f <- stats::manova(Y ~ gf)
  z <- function(t) { v <- summary(f, test = t)$stats[1, ]; list(wert = unname(v[2]), F = unname(v[3]), df1 = unname(v[4]), df2 = unname(v[5]), p = unname(v[6])) }
  einzeln <- lapply(seq_len(q), function(j) { a <- stats::anova(stats::lm(Y[, j] ~ gf)); list(F = a[1, 'F value'], df1 = a[1, 'Df'], df2 = a[2, 'Df'], p = a[1, 'Pr(>F)']) })
  C <- stats::cor(Y); rmax <- if (q > 1L) max(abs(C[upper.tri(C)])) else 0
  list(n = n, n_alle = nAlle, ausgelassen = nAlle - n, q = q, k = k, gruppen = levels(gf), gruppen_n = as.integer(table(gf)),
    pillai = z('Pillai'), wilks = z('Wilks'), hotelling = z('Hotelling-Lawley'), roy = z('Roy'), einzeln = einzeln, rmax = rmax)
}

# ---------------------------------------------------------------------------------------------------------------
# 4. Probit. d: ziel (0/1), praed (Zahl oder Faktor, Vergleichsgruppe zuerst). Genauigkeit Pflicht: glm.control(epsilon = 1e-12, maxit = 100).
# Standardfehler aus der Fisher-Information (R), SPSS GENLIN nimmt die Hesse-Matrix. Warnungen von R werden nicht verschluckt: Flag `warnung`.
# ---------------------------------------------------------------------------------------------------------------
sp_probit <- function(d, ziel, praed, faktoren = character(0)) {
  tryCatch({ sp_id(ziel, praed, faktoren); probit_rechnen(d, ziel, praed, faktoren) }, error = function(e) list(fehler = conditionMessage(e)))
}
probit_rechnen <- function(d, ziel, praed, faktoren) {
  d[[ziel]] <- suppressWarnings(as.numeric(d[[ziel]]))
  k <- kat_daten(d, ziel, praed, faktoren); v <- k$v; y <- v[[ziel]]
  if (!all(y %in% c(0, 1)) || length(unique(y)) < 2L) stop('outcome must have both values 0 and 1')
  warn <- new.env(); warn$w <- character(0)
  m <- kp_fange(stats::glm(stats::reformulate(praed, ziel), family = stats::binomial('probit'), data = v, control = stats::glm.control(epsilon = 1e-12, maxit = 100)), warn)
  cs <- stats::coef(summary(m)); q <- stats::qnorm(0.975); mu <- stats::fitted(m)
  koef <- lapply(seq_len(nrow(cs)), function(i) list(name = rownames(cs)[i], b = cs[i, 1], se = cs[i, 2], z = cs[i, 3], p = cs[i, 4], ki_u = cs[i, 1] - q * cs[i, 2], ki_o = cs[i, 1] + q * cs[i, 2]))
  lr <- m$null.deviance - m$deviance; dfm <- m$df.null - m$df.residual
  list(n = k$n, ausgelassen = k$ausgelassen, ereignisse = sum(y == 1), koef = koef, aic = stats::AIC(m), devianz = m$deviance, null = m$null.deviance, df_res = m$df.residual, df_null = m$df.null,
    modelltest = list(chi2 = lr, df = dfm, p = stats::pchisq(lr, dfm, lower.tail = FALSE)),
    konvergiert = isTRUE(m$converged), fast_trennbar = any(mu < 1e-8 | mu > 1 - 1e-8), warnung = length(warn$w) > 0L)
}

# ---------------------------------------------------------------------------------------------------------------
# 5. Gewichtete Regression mit Präzisionsgewichten: lm(y ~ x, weights = w). w = 0 fällt heraus (gezählt), w < 0 sperrt die Oberfläche vorher.
# d: ziel, praed (Zahl oder Faktor), gewicht (Zahl). Nicht das Fallgewicht: n bleibt die Zahl der Zeilen mit w > 0.
# ---------------------------------------------------------------------------------------------------------------
sp_wls <- function(d, ziel, praed, faktoren = character(0), gewicht) {
  tryCatch({ sp_id(ziel, praed, faktoren, gewicht); wls_rechnen(d, ziel, praed, faktoren, gewicht) }, error = function(e) list(fehler = conditionMessage(e)))
}
wls_rechnen <- function(d, ziel, praed, faktoren, gewicht) {
  d[[ziel]] <- suppressWarnings(as.numeric(d[[ziel]])); d[[gewicht]] <- suppressWarnings(as.numeric(d[[gewicht]]))
  k <- kat_daten(d, ziel, praed, faktoren, gewicht); v <- k$v
  if (any(v[[gewicht]] < 0)) stop('negative weight')
  nNull <- sum(v[[gewicht]] == 0); v <- v[v[[gewicht]] > 0, , drop = FALSE]
  for (p in praed) if (is.factor(v[[p]])) { v[[p]] <- droplevels(v[[p]]); if (nlevels(v[[p]]) < 2L) stop('a group predictor has only one group left') }
  v$.gw <- v[[gewicht]]
  if (nrow(v) <= length(praed) + 1L) stop('too few cases')
  m <- stats::lm(stats::reformulate(praed, ziel), data = v, weights = .gw); s <- summary(m)
  cs <- s$coefficients; dfr <- m$df.residual; q <- stats::qt(0.975, dfr)
  koef <- lapply(seq_len(nrow(cs)), function(i) list(name = rownames(cs)[i], b = cs[i, 1], se = cs[i, 2], t = cs[i, 3], p = cs[i, 4], ki_u = cs[i, 1] - q * cs[i, 2], ki_o = cs[i, 1] + q * cs[i, 2]))
  fs <- s$fstatistic
  list(n = nrow(v), ausgelassen = k$ausgelassen, nullen = nNull, koef = koef, r2 = s$r.squared, r2_korr = s$adj.r.squared, sigma = s$sigma, df = dfr,
    f = if (is.null(fs)) NA_real_ else unname(fs[1]), f_df1 = if (is.null(fs)) NA_real_ else unname(fs[2]), f_df2 = if (is.null(fs)) NA_real_ else unname(fs[3]),
    f_p = if (is.null(fs)) NA_real_ else unname(stats::pf(fs[1], fs[2], fs[3], lower.tail = FALSE)), gewicht_min = min(v$.gw), gewicht_max = max(v$.gw))
}

# ---------------------------------------------------------------------------------------------------------------
# 6. Nichtlineare Regression mit FESTER Formelauswahl (keine freie Formel): Michaelis-Menten a x/(b+x), exponentiell a exp(b x), logistisch a/(1+exp((c-x)/b)), Potenz a x^b.
# d: Zahlenspalten x (Vorhersage) und y (Ziel). art: eines der vier festen Wörter. Startwerte aus linearen Hilfsregressionen, GENAU wie scripts/abschluss-erwartet.R (start()).
# nls(formel, start = s, control = nls.control(maxiter = 200, tol = 1e-7, minFactor = 1/4096)). Scheitert nls: Fehler 'nicht-konvergiert' (nie eine Zahl). Nur stats.
# ---------------------------------------------------------------------------------------------------------------
sp_nls_form <- list(michaelis = y ~ a * x / (b + x), exponentiell = y ~ a * exp(b * x), logistisch = y ~ a / (1 + exp((c - x) / b)), potenz = y ~ a * x^b)
sp_nls_start <- function(art, x, y) switch(art,
  michaelis = { k <- stats::coef(stats::lm(I(1 / y) ~ I(1 / x))); list(a = unname(1 / k[1]), b = unname(k[2] / k[1])) },
  exponentiell = { k <- stats::coef(stats::lm(log(y) ~ x)); list(a = unname(exp(k[1])), b = unname(k[2])) },
  logistisch = { a <- 1.05 * max(y); k <- stats::coef(stats::lm(log(y / (a - y)) ~ x)); list(a = a, b = unname(1 / k[2]), c = unname(-k[1] / k[2])) },
  potenz = { k <- stats::coef(stats::lm(log(y) ~ log(x))); list(a = unname(exp(k[1])), b = unname(k[2])) })
sp_nls <- function(d, art, x, y) {
  tryCatch({ sp_id(x, y); nls_rechnen(d, art, x, y) }, error = function(e) list(fehler = conditionMessage(e)))
}
nls_rechnen <- function(d, art, x, y) {
  if (!is.character(art) || length(art) != 1L || !art %in% names(sp_nls_form)) stop('unknown formula')
  vx <- suppressWarnings(as.numeric(d[[x]])); vy <- suppressWarnings(as.numeric(d[[y]]))
  ok <- is.finite(vx) & is.finite(vy); aus <- sum(!ok); vx <- vx[ok]; vy <- vy[ok]
  if (art == 'michaelis' && (any(vx <= 0) || any(vy <= 0))) stop('x and y must be positive')
  if (art == 'exponentiell' && any(vy <= 0)) stop('y must be positive')
  if (art == 'logistisch' && any(vy <= 0)) stop('y must be positive')
  if (art == 'potenz' && (any(vx <= 0) || any(vy <= 0))) stop('x and y must be positive')
  s <- sp_nls_start(art, vx, vy)
  if (length(vx) <= length(s) || length(unique(vx)) <= length(s)) stop('too few cases')
  if (any(!is.finite(unlist(s)))) stop('nicht-konvergiert')
  v <- data.frame(x = vx, y = vy); warn <- new.env(); warn$w <- character(0)
  f <- tryCatch(kp_fange(stats::nls(sp_nls_form[[art]], data = v, start = s, control = stats::nls.control(maxiter = 200, tol = 1e-7, minFactor = 1 / 4096)), warn), error = function(e) NULL)
  if (is.null(f)) stop('nicht-konvergiert')
  cs <- stats::coef(summary(f)); df <- stats::df.residual(f); q <- stats::qt(0.975, df)
  ki <- tryCatch(suppressMessages(stats::confint(f)), error = function(e) NULL, warning = function(w) NULL)
  if (!is.null(ki) && (!is.matrix(ki) || nrow(ki) != nrow(cs) || any(!is.finite(ki)))) ki <- NULL
  koef <- lapply(seq_len(nrow(cs)), function(i) list(name = rownames(cs)[i], b = cs[i, 1], se = cs[i, 2], t = cs[i, 3], p = cs[i, 4], wald_u = cs[i, 1] - q * cs[i, 2], wald_o = cs[i, 1] + q * cs[i, 2],
    profil_u = if (is.null(ki)) NA_real_ else ki[i, 1], profil_o = if (is.null(ki)) NA_real_ else ki[i, 2]))
  list(art = art, start = unname(unlist(s)), n = length(vx), ausgelassen = aus, koef = koef, rss = stats::deviance(f), sigma = summary(f)$sigma, df = df, aic = stats::AIC(f), profil = !is.null(ki),
    x = vx, y = vy, angepasst = unname(stats::fitted(f)), rest = unname(stats::residuals(f)), warnung = length(warn$w) > 0L)
}
