# Prognose für Zeitreihen (Karte „zeitreihen“): die Rechnung in R, nur stats (kein Zusatzpaket). Fachblatt: docs/fachblaetter/PROGNOSE-ARIMA.md
# Bezieht sich auf: arima, predict, HoltWinters, stl, Box.test. Die Modellwahl folgt Hyndman & Khandakar (2008) wie forecast::auto.arima mit stepwise = FALSE:
# Differenzen nach KPSS und Saisonstärke, dann alle Modelle bis zur Grenze nach AICc. Gegenprobe: scripts/prognose-erwartet.R.
# Die Funktionen werfen nie: Fehler kommen als list(fehler = '<code>').

# KPSS-Prüfgröße (Niveau), Bartlett, Lags trunc(3 sqrt(n) / 13) wie urca::ur.kpss in forecast::ndiffs. Kritischer Wert 5 %: 0,463.
sp_prog_kpss <- function(x) {
  n <- length(x); e <- x - mean(x); l <- trunc(3 * sqrt(n) / 13); s2 <- sum(e^2) / n
  if (l > 0) for (k in seq_len(l)) s2 <- s2 + 2 * (1 - k / (l + 1)) * sum(e[(k + 1):n] * e[1:(n - k)]) / n
  sum(cumsum(e)^2) / (n^2 * s2)
}
sp_prog_konstant <- function(x) { all(abs(x - x[1]) < 1e-12 * max(1, abs(x[1]))) }
# Zahl der gewöhnlichen Differenzen (0 bis 2).
sp_prog_d <- function(x) {
  d <- 0
  while (d < 2 && !sp_prog_konstant(x) && sp_prog_kpss(x) > 0.463) { d <- d + 1; x <- diff(x) }
  d
}
# Saisonstärke nach Wang, Smith & Hyndman (2006): 1 - Var(Rest) / Var(Saison + Rest), STL wie forecast::mstl.
sp_prog_saisonstaerke <- function(x, m) {
  f <- stl(ts(x, frequency = m), s.window = 11, robust = TRUE)$time.series
  max(0, min(1, 1 - var(f[, 'remainder']) / var(f[, 'remainder'] + f[, 'seasonal'])))
}

# Ein Modell. konst: Mittelwert (d + D = 0) oder Drift (d + D = 1); bei d + D >= 2 nie. Gibt NULL, wenn es nicht rechnet.
sp_prog_passen <- function(y, o, S, m, konst) {
  dd <- o[2] + S[2]
  xr <- if (konst && dd == 1) cbind(drift = seq_along(y)) else NULL
  fit <- tryCatch(suppressWarnings(arima(ts(y, frequency = m), order = o, seasonal = list(order = S, period = m), include.mean = konst && dd == 0, xreg = xr)), error = function(e) NULL)
  if (is.null(fit)) return(NULL)
  fit$call$xreg <- xr   # predict.Arima wertet den Aufruf neu aus: der Wert muss drinstehen, nicht der Name
  fit$sp_drift <- !is.null(xr)
  np <- length(fit$coef[fit$mask]) + 1; nstar <- fit$nobs
  fit$sp_np <- np
  fit$sp_aicc <- if (nstar - np - 1 > 0) fit$aic + 2 * np * (np + 1) / (nstar - np - 1) else Inf
  fit
}
# Wurzeln nahe am Einheitskreis, fehlende Standardfehler: das Modell zählt bei der Wahl nicht (wie forecast:::myarima).
sp_prog_tauglich <- function(fit) {
  if (is.null(fit) || !is.finite(fit$sp_aicc)) return(FALSE)
  wurzel <- function(v) { k <- which(abs(v) > 1e-8); if (!length(k)) return(2); min(abs(polyroot(c(1, v[seq_len(max(k))])))) }
  m <- min(wurzel(-fit$model$phi), wurzel(fit$model$theta))
  if (m < 1.01) return(FALSE)
  if (length(fit$coef[fit$mask]) && any(is.nan(suppressWarnings(sqrt(diag(fit$var.coef)))))) return(FALSE)
  TRUE
}
# Automatische Wahl: alle Modelle bis zur Grenze, nach AICc geordnet. Saison nur bei m in 2 bis 24 und mindestens 3 vollen Perioden.
sp_prog_wahl <- function(y, m) {
  n <- length(y); saison <- m >= 2 && m <= 24 && n >= 3 * m
  stark <- if (saison) sp_prog_saisonstaerke(y, m) else NA_real_
  D <- if (saison && stark > 0.64) 1 else 0
  yd <- if (D == 1) diff(y, lag = m) else y
  kp <- sp_prog_kpss(yd); d <- sp_prog_d(yd)
  pmax <- if (saison) 2 else 3
  liste <- list()
  for (p in 0:pmax) for (q in 0:pmax) for (P in if (saison) 0:1 else 0) for (Q in if (saison) 0:1 else 0) {
    if (p + q + P + Q > 5) next
    for (k in if (d + D <= 1) c(TRUE, FALSE) else FALSE) {
      fit <- sp_prog_passen(y, c(p, d, q), c(P, D, Q), if (saison) m else 1, k)
      if (sp_prog_tauglich(fit)) liste[[length(liste) + 1]] <- list(p = p, q = q, P = P, Q = Q, konst = k, aicc = fit$sp_aicc)
    }
  }
  if (!length(liste)) return(list(fehler = 'kein-modell'))
  liste <- liste[order(vapply(liste, function(z) z$aicc, 0))]
  list(d = d, D = D, kpss = kp, staerke = stark, saison = saison, geprueft = length(liste), liste = liste)
}

# Vorhersage eines ARIMA-Modells auf der gerechneten Skala: Mittel und Standardfehler.
sp_prog_vor_arima <- function(fit, n, h) {
  nx <- if (fit$sp_drift) cbind(drift = (n + 1):(n + h)) else NULL
  p <- if (is.null(nx)) predict(fit, n.ahead = h) else predict(fit, n.ahead = h, newxreg = nx)
  list(mittel = as.numeric(p$pred), se = as.numeric(p$se))
}
# Die Fehlermaße im Prüfzeitraum: das Modell gegen die einfache Regel (bei einer Periode über 1 der Wert vor einer Periode, sonst der letzte Wert).
# Regel und Ljung-Box nehmen immer die Periode der Reihe, auch bei einem Modell ohne Saisonteil: Sonst bliebe übersehene Saison unbemerkt.
sp_prog_naiv <- function(x, m, h) { n <- length(x); if (m > 1) x[n - m + ((seq_len(h) - 1) %% m) + 1] else rep(x[n], h) }
sp_prog_fehlermasse <- function(ist, soll, naiv) {
  c(rmse = sqrt(mean((ist - soll)^2)), mae = mean(abs(ist - soll)), rmse_naiv = sqrt(mean((ist - naiv)^2)), mae_naiv = mean(abs(ist - naiv)))
}
sp_prog_acf <- function(r, lag) as.numeric(acf(r, lag.max = lag, plot = FALSE, na.action = na.pass)$acf)[-1]
sp_prog_ljung <- function(r, m, fitdf) {
  T <- sum(!is.na(r)); H <- if (m > 1) min(2 * m, floor(T / 5)) else min(10, floor(T / 5))
  H <- max(H, fitdf + 1)
  if (T - 1 < H) return(c(q = NA_real_, h = H, p = NA_real_, fitdf = fitdf))
  b <- Box.test(r, lag = H, type = 'Ljung-Box', fitdf = fitdf)
  c(q = as.numeric(b$statistic), h = H, p = as.numeric(b$p.value), fitdf = fitdf)
}

# ARIMA: wahl = 'auto' oder die Ordnung; log = TRUE rechnet auf der Log-Skala (Prognose und Grenzen werden zurückgerechnet: Median, nicht Mittel).
# y: Zahlen, bei „ARIMA selbst wählen“ dürfen NA darin stehen (Lücken: der Kalman-Filter rechnet darüber hinweg, nichts wird aufgefüllt); m: Periode; h: Horizont; pr: Länge des Prüfzeitraums (0 = keiner).
sp_prognose_arima <- function(y, m, h, log_an, auto, p = 0, d = 0, q = 0, P = 0, D = 0, Q = 0, konst = TRUE, pr = 0) {
  tryCatch({
    n <- length(y)
    if (log_an && any(y <= 0, na.rm = TRUE)) return(list(fehler = 'log-nicht-positiv'))
    if (auto && anyNA(y)) return(list(fehler = 'luecken-nur-selbst'))   # KPSS, STL und HoltWinters vertragen keine Lücken
    z <- if (log_an) log(y) else y
    rueck <- if (log_an) exp else identity
    w <- NULL
    if (auto) {
      w <- sp_prog_wahl(z, m)
      if (!is.null(w$fehler)) return(w)
      b <- w$liste[[1]]; p <- b$p; q <- b$q; P <- b$P; Q <- b$Q; d <- w$d; D <- w$D; konst <- b$konst
    }
    mm <- if (P + D + Q > 0 || (auto && w$saison)) m else 1
    fit <- sp_prog_passen(z, c(p, d, q), c(P, D, Q), mm, konst)
    if (is.null(fit)) return(list(fehler = 'nicht-konvergiert'))
    v <- sp_prog_vor_arima(fit, n, h)
    res <- as.numeric(residuals(fit)); ang <- rueck(z - res)
    pruef <- NULL
    if (pr > 0 && n - pr >= max(2 * mm, 12)) {
      ist <- y[(n - pr + 1):n]; nv <- sp_prog_naiv(y[1:(n - pr)], m, pr)
      f2 <- if (anyNA(ist) || anyNA(nv)) NULL else sp_prog_passen(z[1:(n - pr)], c(p, d, q), c(P, D, Q), mm, konst)   # fehlt ein Wert im Prüfzeitraum oder in den Vergleichswerten, entfällt der Prüfzeitraum
      if (!is.null(f2)) {
        v2 <- sp_prog_vor_arima(f2, n - pr, pr)
        pruef <- sp_prog_fehlermasse(ist, rueck(v2$mittel), nv)
      }
    }
    se <- if (length(fit$coef)) suppressWarnings(sqrt(diag(fit$var.coef))) else numeric(0)
    list(
      art = 'arima', p = p, d = d, q = q, P = P, D = D, Q = Q, periode = mm, konst = konst, drift = fit$sp_drift, log = log_an,
      namen = names(fit$coef), b = as.numeric(fit$coef), se = as.numeric(se),
      sigma2 = fit$sigma2, loglik = fit$loglik, aic = fit$aic, aicc = fit$sp_aicc, bic = fit$aic + (log(fit$nobs) - 2) * fit$sp_np, nobs = fit$nobs,
      tauglich = sp_prog_tauglich(fit),
      mittel = rueck(v$mittel), u80 = rueck(v$mittel - qnorm(0.9) * v$se), o80 = rueck(v$mittel + qnorm(0.9) * v$se), u95 = rueck(v$mittel - qnorm(0.975) * v$se), o95 = rueck(v$mittel + qnorm(0.975) * v$se),
      angepasst = ang, rmse = sqrt(mean((y - ang)^2, na.rm = TRUE)), mae = mean(abs(y - ang), na.rm = TRUE), mape = if (all(y > 0, na.rm = TRUE)) 100 * mean(abs((y - ang) / y), na.rm = TRUE) else NA_real_,
      ljung = sp_prog_ljung(res, m, p + q + P + Q), acf_res = sp_prog_acf(res, min(n - 1, max(2 * m, 12))),
      pruef = if (is.null(pruef)) numeric(0) else pruef, pr = if (is.null(pruef)) 0 else pr,
      wahl = if (auto) list(d = w$d, D = w$D, kpss = w$kpss, staerke = if (is.na(w$staerke)) -1 else w$staerke, geprueft = w$geprueft,
        lp = vapply(w$liste, function(z) z$p, 0), lq = vapply(w$liste, function(z) z$q, 0), lP = vapply(w$liste, function(z) z$P, 0), lQ = vapply(w$liste, function(z) z$Q, 0),
        lk = vapply(w$liste, function(z) z$konst, TRUE), la = vapply(w$liste, function(z) z$aicc, 0)) else NULL
    )
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}

# Exponentielle Glättung: art = 'einfach' (nur Niveau), 'holt' (Trend), 'add' oder 'mult' (Trend und Saison).
sp_prog_hw <- function(y, m, art) {
  yt <- ts(y, frequency = if (art %in% c('add', 'mult')) m else 1)
  suppressWarnings(switch(art,
    einfach = HoltWinters(yt, beta = FALSE, gamma = FALSE),
    holt = HoltWinters(yt, gamma = FALSE),
    add = HoltWinters(yt, seasonal = 'additive'),
    mult = HoltWinters(yt, seasonal = 'multiplicative')))
}
sp_prognose_glaettung <- function(y, m, h, art, pr = 0) {
  tryCatch({
    n <- length(y)
    if (anyNA(y)) return(list(fehler = 'luecken-nur-selbst'))
    if (art == 'mult' && any(y <= 0)) return(list(fehler = 'mult-nicht-positiv'))
    if (art %in% c('add', 'mult') && n < 2 * m + 1) return(list(fehler = 'zu-kurz-saison'))
    fit <- sp_prog_hw(y, m, art)
    p80 <- predict(fit, n.ahead = h, prediction.interval = TRUE, level = 0.8); p95 <- predict(fit, n.ahead = h, prediction.interval = TRUE, level = 0.95)
    res <- as.numeric(residuals(fit)); ang <- as.numeric(fitted(fit)[, 'xhat']); ist <- y[(n - length(res) + 1):n]
    mm <- if (art %in% c('add', 'mult')) m else 1
    pruef <- NULL
    if (pr > 0 && n - pr >= max(2 * mm + 1, 12)) {
      f2 <- tryCatch(sp_prog_hw(y[1:(n - pr)], m, art), error = function(e) NULL)
      if (!is.null(f2)) pruef <- sp_prog_fehlermasse(y[(n - pr + 1):n], as.numeric(predict(f2, n.ahead = pr)), sp_prog_naiv(y[1:(n - pr)], m, pr))
    }
    list(
      art = 'glaettung', glaettung = art, periode = mm, alpha = as.numeric(fit$alpha), beta = if (identical(fit$beta, FALSE)) NA_real_ else as.numeric(fit$beta), gamma = if (identical(fit$gamma, FALSE)) NA_real_ else as.numeric(fit$gamma),
      sse = fit$SSE, start = n - length(res) + 1,
      mittel = as.numeric(p80[, 'fit']), u80 = as.numeric(p80[, 'lwr']), o80 = as.numeric(p80[, 'upr']), u95 = as.numeric(p95[, 'lwr']), o95 = as.numeric(p95[, 'upr']),
      angepasst = ang, rmse = sqrt(mean(res^2)), mae = mean(abs(res)), mape = if (all(y > 0)) 100 * mean(abs(res / ist)) else NA_real_,
      ljung = sp_prog_ljung(res, m, 0), acf_res = sp_prog_acf(res, min(length(res) - 1, max(2 * m, 12))),
      pruef = if (is.null(pruef)) numeric(0) else pruef, pr = if (is.null(pruef)) 0 else pr
    )
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}

# Differenzen prüfen bei „ARIMA selbst wählen“ (Fachblatt ZEITREIHEN-ABRUNDEN, Abschnitt 2). Gibt Kennzahlen für d = 0, 1, 2 beim gewählten D (erst saisonal, dann gewöhnlich)
# und ACF und PACF der Reihe beim gewählten d und D. Wählt nichts aus. Bei Lücken: KPSS und Saisonstärke NA, ACF und PACF mit na.pass. Mit log_an auf der Log-Skala.
sp_prog_differenzen <- function(y, m, log_an, d, D) {
  tryCatch({
    if (log_an && any(y <= 0, na.rm = TRUE)) return(list(fehler = 'log-nicht-positiv'))
    z <- if (log_an) log(y) else y
    luecken <- anyNA(z)
    diffs <- function(k) { v <- if (D > 0) diff(z, lag = m, differences = D) else z; if (k > 0) v <- diff(v, differences = k); v }
    kennzahl <- function(v) {
      n <- sum(!is.na(v)); ok <- n >= 5 && !luecken && !sp_prog_konstant(v)
      c(kpss = if (ok) sp_prog_kpss(v) else NA_real_, sd = if (n >= 2) sd(v, na.rm = TRUE) else NA_real_,
        r1 = if (n >= 3) suppressWarnings(sp_prog_acf(v, 1)) else NA_real_, n = n)
    }
    k0 <- kennzahl(diffs(0)); k1 <- kennzahl(diffs(1)); k2 <- kennzahl(diffs(2))
    v <- diffs(d); n <- sum(!is.na(v)); lags <- min(n - 1, max(2 * m, 12))
    a <- if (lags >= 1) suppressWarnings(sp_prog_acf(v, lags)) else numeric(0)
    pa <- if (lags >= 1) tryCatch(as.numeric(pacf(v, lag.max = lags, plot = FALSE, na.action = na.pass)$acf), error = function(e) rep(NA_real_, lags)) else numeric(0)
    st <- if (!luecken && m >= 2 && m <= 24 && length(z) >= 3 * m) tryCatch(sp_prog_saisonstaerke(z, m), error = function(e) NA_real_) else NA_real_
    list(d = c(0, 1, 2), kpss = c(k0[['kpss']], k1[['kpss']], k2[['kpss']]), sd = c(k0[['sd']], k1[['sd']], k2[['sd']]), r1 = c(k0[['r1']], k1[['r1']], k2[['r1']]), n_zeile = c(k0[['n']], k1[['n']], k2[['n']]),
      n = n, lags = lags, grenze = 1.96 / sqrt(n), acf = a, pacf = pa, staerke = st)
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}

# Periodogramm (Fachblatt ZEITREIHEN-ABRUNDEN, Abschnitt 3): spec.pgram ohne Taper, mit linearem Trend herausgerechnet, fast = FALSE (sonst passen die Frequenzen nicht zu j/n).
# Immer ts(y) mit Frequenz 1: Die Periode ist in Zeitpunkten. Spitzen: lokale Maxima mit Periode von 2 bis n/2, die drei größten. Keine Lücken, mindestens 20 Werte.
sp_periodogramm <- function(y) {
  tryCatch({
    if (anyNA(y)) return(list(fehler = 'luecken'))
    n <- length(y)
    if (n < 20) return(list(fehler = 'zu-kurz'))
    s <- spec.pgram(ts(y), taper = 0, detrend = TRUE, fast = FALSE, plot = FALSE)
    sp <- s$spec; K <- length(sp)
    lokal <- which(sp >= c(-Inf, sp[-K]) & sp >= c(sp[-1], -Inf))
    lokal <- lokal[1 / s$freq[lokal] <= n / 2 & 1 / s$freq[lokal] >= 2]
    lokal <- lokal[order(-sp[lokal])][seq_len(min(3, length(lokal)))]
    list(n = n, freq = as.numeric(s$freq), spec = as.numeric(sp), spitzen_periode = 1 / s$freq[lokal], spitzen_anteil = sp[lokal] / sum(sp), spitzen_index = lokal)
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}

# „Hat die Maßnahme gewirkt?“ (Fachblatt MASSNAHME, Abschnitt 1): ARIMA mit Stufe (0 davor, 1 ab t0) und/oder Impuls (1 nur in t0) als xreg, nur stats.
# art: 'stufe', 'beides' oder 'impuls'. Die Konstante gibt es nur bei d + D = 0 und nur, wenn die Person sie wählt (konst). Vorhersage: die Stufe bleibt 1, der Impuls 0.
# Wichtig: fit$call$xreg muss den Wert tragen (predict wertet den Aufruf neu aus), newxreg braucht dieselben Spaltennamen wie xreg.
sp_massnahme <- function(y, m, t0, art, log_an, p, d, q, P, D, Q, konst, h) {
  tryCatch({
    n <- length(y)
    if (!(art %in% c('stufe', 'beides', 'impuls'))) return(list(fehler = 'r-fehler'))
    if (t0 < 2 || t0 > n) return(list(fehler = 'rand'))
    if (log_an && any(y <= 0, na.rm = TRUE)) return(list(fehler = 'log-nicht-positiv'))
    z <- if (log_an) log(y) else y
    rueck <- if (log_an) exp else identity
    st <- art %in% c('stufe', 'beides'); im <- art %in% c('impuls', 'beides')
    X <- cbind(stufe = as.numeric(seq_len(n) >= t0), impuls = as.numeric(seq_len(n) == t0))[, c(st, im), drop = FALSE]
    Xn <- cbind(stufe = rep(1, h), impuls = rep(0, h))[, c(st, im), drop = FALSE]
    mm <- if (P + D + Q > 0) m else 1
    fit <- tryCatch(suppressWarnings(arima(ts(z, frequency = mm), order = c(p, d, q), seasonal = list(order = c(P, D, Q), period = mm), xreg = X, include.mean = konst && d + D == 0)), error = function(e) NULL)
    if (is.null(fit)) return(list(fehler = 'nicht-konvergiert'))
    fit$call$xreg <- X
    np <- sum(fit$mask) + 1
    fit$sp_aicc <- if (fit$nobs - np - 1 > 0) fit$aic + 2 * np * (np + 1) / (fit$nobs - np - 1) else Inf
    b <- fit$coef; se <- suppressWarnings(sqrt(diag(fit$var.coef))); zw <- b / se; pw <- 2 * pnorm(abs(zw), lower.tail = FALSE)
    vor <- predict(fit, n.ahead = h, newxreg = Xn)
    pr <- as.numeric(vor$pred); ps <- as.numeric(vor$se)
    list(art = art, t0 = t0, p = p, d = d, q = q, P = P, D = D, Q = Q, periode = mm, konst = konst && d + D == 0, log = log_an,
      namen = names(b), b = as.numeric(b), se = as.numeric(se), z = as.numeric(zw), pw = as.numeric(pw), kiu = as.numeric(b - qnorm(0.975) * se), kio = as.numeric(b + qnorm(0.975) * se),
      sigma2 = fit$sigma2, loglik = fit$loglik, aic = fit$aic, aicc = fit$sp_aicc, nobs = fit$nobs, tauglich = sp_prog_tauglich(fit),
      mittel = rueck(pr), u95 = rueck(pr - qnorm(0.975) * ps), o95 = rueck(pr + qnorm(0.975) * ps),
      ljung = sp_prog_ljung(as.numeric(residuals(fit)), m, p + q + P + Q))
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}
# Modellvorschlag NUR aus den Werten vor der Maßnahme (damit der Effekt die Wahl nicht beeinflusst): sp_prog_wahl auf z[1:(t0 - 1)]. Wählt nichts aus; die Person übernimmt oder nicht.
sp_massnahme_vorschlag <- function(y, m, t0, log_an) {
  tryCatch({
    n <- length(y)
    if (anyNA(y)) return(list(fehler = 'luecken-nur-selbst'))
    if (t0 < 2 || t0 > n) return(list(fehler = 'rand'))
    if (log_an && any(y <= 0)) return(list(fehler = 'log-nicht-positiv'))
    v <- if (log_an) log(y[seq_len(t0 - 1)]) else y[seq_len(t0 - 1)]
    if (length(v) < 10) return(list(fehler = 'zu-kurz'))
    if (sp_prog_konstant(v)) return(list(fehler = 'alle-gleich'))
    w <- sp_prog_wahl(v, m)
    if (!is.null(w$fehler)) return(w)
    k <- w$liste[seq_len(min(5, length(w$liste)))]
    list(n = length(v), d = w$d, D = w$D, kpss = w$kpss, staerke = if (is.na(w$staerke)) -1 else w$staerke, saison = w$saison, geprueft = w$geprueft,
      lp = vapply(k, function(z) z$p, 0), lq = vapply(k, function(z) z$q, 0), lP = vapply(k, function(z) z$P, 0), lQ = vapply(k, function(z) z$Q, 0),
      lk = vapply(k, function(z) z$konst, TRUE), la = vapply(k, function(z) z$aicc, 0))
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}

# Auffällige Werte in einer Zeitreihe (Sollwerte scripts/ausreisser-zeitreihe-erwartet.R): ein einfaches Residuen-Verfahren, KEINE Typenerkennung nach Chen und Liu (AO, LS, TC) und nicht tsoutliers.
# 1. Muster abziehen: mit Saison (2 <= m <= 24 und mindestens 3 Perioden) stats::stl(s.window = 'periodic', robust = TRUE), Rest = remainder; sonst das ARIMA-Modell der Automatik (sp_prog_wahl, bestes nach AICc),
#    Rest = Residuen von arima; die ersten d Residuen entfallen (die Differenzen haben dort noch kein Vorgängerglied). 2. Rest robust standardisieren: z = (Rest - Median) / mad (mad = 1,4826 * Median der Abweichungen vom Median).
# 3. auffällig ist |z| > schwelle. Lücken: nicht erlaubt (stl und die Automatik vertragen sie nicht). log_an rechnet alles auf der Log-Skala.
sp_ausreisser <- function(y, m, log_an, schwelle) {
  tryCatch({
    n <- length(y)
    if (anyNA(y)) return(list(fehler = 'luecken-nur-selbst'))
    if (log_an && any(y <= 0)) return(list(fehler = 'log-nicht-positiv'))
    if (sp_prog_konstant(y)) return(list(fehler = 'alle-gleich'))
    z <- if (log_an) log(y) else y
    rueck <- if (log_an) exp else identity
    saison <- m >= 2 && m <= 24 && n >= 3 * m
    p <- 0; d <- 0; q <- 0; konst <- FALSE
    if (saison) {
      s <- stl(ts(z, frequency = m), s.window = 'periodic', robust = TRUE)
      res <- as.numeric(s$time.series[, 'remainder']); von <- 1L; modell <- 'stl'
    } else {
      w <- sp_prog_wahl(z, m)
      if (!is.null(w$fehler)) return(w)
      b <- w$liste[[1]]; p <- b$p; q <- b$q; d <- w$d; konst <- b$konst
      fit <- sp_prog_passen(z, c(p, d, q), c(0, 0, 0), 1, konst)
      if (is.null(fit)) return(list(fehler = 'nicht-konvergiert'))
      res <- as.numeric(residuals(fit)); von <- as.integer(d + 1); modell <- 'arima'
    }
    r <- res[von:n]; med <- median(r); sk <- mad(r)
    if (!is.finite(sk) || sk <= 1e-10 * max(abs(z))) return(list(fehler = 'streuung-null'))
    zw <- (r - med) / sk
    list(modell = modell, n = n, von = von, p = p, d = d, q = q, konst = konst, periode = if (saison) m else 1, log = log_an, schwelle = schwelle,
      median = med, skala = sk, rest = r, z = zw, erwartet = rueck(z - res), auff = as.integer(which(abs(zw) > schwelle) + von - 1L))
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}

# Granger-Test (Fachblatt MASSNAHME, Abschnitt 2): Helfen die Lags 1 bis k von x, y vorherzusagen, über die Lags von y hinaus? F-Test zweier lm (Fälle t = k + 1 bis n), immer beide Richtungen.
sp_granger_richtung <- function(x, y, k) {
  n <- length(y); idx <- (k + 1):n
  Ly <- do.call(cbind, lapply(seq_len(k), function(j) y[idx - j])); Lx <- do.call(cbind, lapply(seq_len(k), function(j) x[idx - j])); Y <- y[idx]
  m1 <- lm(Y ~ Ly + Lx); m0 <- lm(Y ~ Ly)
  if (m1$rank < 2 * k + 1) return(NULL)
  a <- anova(m0, m1)
  if (!is.finite(a[2, 'F'])) return(NULL)
  list(F = a[2, 'F'], df1 = k, df2 = a[2, 'Res.Df'], p = a[2, 'Pr(>F)'])
}
sp_granger <- function(x, y, k) {
  tryCatch({
    n <- length(y)
    if (length(x) != n) return(list(fehler = 'laenge'))
    if (anyNA(x) || anyNA(y)) return(list(fehler = 'luecken'))
    if (n < 30) return(list(fehler = 'zu-kurz'))
    if (sp_prog_konstant(x) || sp_prog_konstant(y)) return(list(fehler = 'konstant'))
    k <- as.integer(k)
    if (is.na(k) || k < 1 || k > floor(n / 4)) return(list(fehler = 'k-ungueltig'))
    xy <- sp_granger_richtung(x, y, k); yx <- sp_granger_richtung(y, x, k)
    if (is.null(xy) || is.null(yx)) return(list(fehler = 'nicht-eindeutig'))
    list(k = k, n = n - k, xy = xy, yx = yx, kpss_x = sp_prog_kpss(x), kpss_y = sp_prog_kpss(y))
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}
