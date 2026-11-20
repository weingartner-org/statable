# Exponentielle Glättung nach dem ETS-Zustandsraummodell (Hyndman et al. 2008) und Modell auf neue Daten (Abschnitt 5, Fachblatt docs/fachblaetter/GLAETTUNG-SERIEN.md), nur Basis-R (stats, optim); kein Zusatzpaket.
# Der Nachbau ist die Rechnung aus scripts/glaettung-erwartet.R, in der Rechnung unverändert (nur die Namen haben den Vorsatz sp_): optim ist pfadabhängig, darum muss das Verfahren genau gleich bleiben, sonst passen die Sollwerte nicht.
# Braucht die Funktionen aus statable-prognose.R (sp_prog_ljung, sp_prog_acf, sp_prog_naiv, sp_prog_fehlermasse, sp_prog_vor_arima). Die Funktionen werfen nie: Fehler kommen als list(fehler = '<code>').

sp_e_modell <- function(model) list(err = substr(model, 1, 1), trend = if (grepl('Ad', model)) 'Ad' else substr(model, 2, 2), seas = substr(model, nchar(model), nchar(model)))
sp_e_pos <- function(mo, m) { i <- 1; pos <- list(alpha = i); i <- i + 1; if (mo$trend != 'N') { pos$beta <- i; i <- i + 1 }; if (mo$trend == 'Ad') { pos$phi <- i; i <- i + 1 }; if (mo$seas != 'N') { pos$gamma <- i; i <- i + 1 }; pos$l <- i; i <- i + 1; if (mo$trend != 'N') { pos$b <- i; i <- i + 1 }; if (mo$seas != 'N') { pos$s <- i:(i + m - 2); i <- i + m - 1 }; pos$n <- i - 1; pos }
sp_e_lauf <- function(par, y, m, mo, pos, h = 0) {
  n <- length(y); al <- par[pos$alpha]; be <- if (mo$trend != 'N') par[pos$beta] else 0; ph <- if (mo$trend == 'Ad') par[pos$phi] else 1; ga <- if (mo$seas != 'N') par[pos$gamma] else 0
  l <- par[pos$l]; b <- if (mo$trend != 'N') par[pos$b] else 0; s <- if (mo$seas != 'N') { s0 <- par[pos$s]; c(s0, if (mo$seas == 'M') m - sum(s0) else -sum(s0)) } else NULL
  ma <- mo$seas == 'M'; me <- mo$err == 'M'; e <- numeric(n); lg <- 0; fv <- numeric(n)
  for (t in seq_len(n)) {
    mu <- l + ph * b; yh <- if (is.null(s)) mu else if (ma) mu * s[1] else mu + s[1]
    if (!is.finite(yh) || (me && yh <= 0)) return(NULL)
    ea <- y[t] - yh; er <- if (me) ea / yh else ea; e[t] <- er; fv[t] <- yh; if (me) lg <- lg + log(abs(yh))
    if (me) { l2 <- mu * (1 + al * er); b2 <- ph * b + be * mu * er } else { l2 <- mu + al * ea / (if (ma) s[1] else 1); b2 <- ph * b + be * ea / (if (ma) s[1] else 1) }
    if (!is.null(s)) { sn <- if (me) s[1] * (1 + ga * er) else if (ma) s[1] + ga * ea / mu else s[1] + ga * ea; s <- c(s[-1], sn) }
    l <- l2; b <- b2
  }
  out <- list(e = e, lg = lg, fv = fv, l = l, b = b, s = s, ph = ph)
  if (h > 0) out$fc <- vapply(seq_len(h), function(k) { mu <- l + (if (ph == 1) k else sum(ph^(seq_len(k)))) * b; if (is.null(s)) mu else { sk <- s[((k - 1) %% m) + 1]; if (ma) mu * sk else mu + sk } }, 0)
  out
}
sp_e_lik <- function(par, y, m, mo, pos) {
  al <- par[pos$alpha]; be <- if (mo$trend != 'N') par[pos$beta] else 0; ph <- if (mo$trend == 'Ad') par[pos$phi] else .9; ga <- if (mo$seas != 'N') par[pos$gamma] else 0
  if (al < 1e-4 || al > .9999 || be < 0 || be > al || ph < .8 || ph > .98 || ga < 0 || ga > 1 - al || (mo$trend != 'N' && be < 1e-4)) return(1e300)
  r <- sp_e_lauf(par, y, m, mo, pos); if (is.null(r)) return(1e300)
  length(y) * log(sum(r$e^2)) + 2 * r$lg
}
# Startwerte der Saison aus höchstens drei Perioden (gleitender Mittelwert), Niveau und Trend aus einer Geraden über die ersten zwei Perioden.
sp_e_start_s <- function(y, m, seas) { n <- min(length(y), 3 * m); x <- y[1:n]; tr <- as.numeric(stats::filter(x, c(.5, rep(1, m - 1), .5) / m, sides = 2)); d <- if (seas == 'M') x / tr else x - tr; s <- vapply(1:m, function(i) mean(d[seq(i, n, by = m)], na.rm = TRUE), 0); if (seas == 'M') s * m / sum(s) else s - mean(s) }
# Ohne Saison: zwei Startwerte, je vier Durchläufe. Mit Saison zwei Stufen: erst nur die Glättungsparameter (Anfangszustand fest), dann alles, zwei Durchläufe.
# Gedämpfte Saisonmodelle starten zusätzlich vom Ergebnis des ungedämpften Modells (vor), falls das besser ist.
sp_e_passen <- function(y, m, model, vor = NULL) {
  mo <- sp_e_modell(model); if (mo$seas == 'N') m <- 1
  pos <- sp_e_pos(mo, m); n <- length(y); saison <- mo$seas != 'N'
  if (!saison) {
    l0 <- y[1]; b0 <- mean(diff(y[1:min(n, 10)])); best <- NULL
    for (a0 in c(0.2, 0.6)) {
      st <- numeric(pos$n); st[pos$alpha] <- a0
      if (!is.null(pos$beta)) st[pos$beta] <- a0 / 10
      if (!is.null(pos$phi)) st[pos$phi] <- .9
      st[pos$l] <- l0; if (!is.null(pos$b)) st[pos$b] <- b0
      o <- optim(st, sp_e_lik, y = y, m = m, mo = mo, pos = pos, control = list(maxit = 20000, reltol = 1e-12))
      for (k in 1:3) o <- optim(o$par, sp_e_lik, y = y, m = m, mo = mo, pos = pos, control = list(maxit = 20000, reltol = 1e-12))
      if (is.null(best) || o$value < best$value) best <- o
    }
  } else {
    s0 <- sp_e_start_s(y, m, mo$seas); ds <- if (mo$seas == 'M') y[1:(2 * m)] / rep(s0, 2) else y[1:(2 * m)] - rep(s0, 2); k <- lm(ds ~ seq_along(ds))
    kp <- pos$l - 1; st <- numeric(pos$n); st[pos$l] <- unname(coef(k)[1]); if (!is.null(pos$b)) st[pos$b] <- unname(coef(k)[2]); st[pos$s] <- s0[1:(m - 1)]; b1 <- NULL
    for (a0 in c(.2, .6)) {
      g0 <- a0; if (!is.null(pos$beta)) g0 <- c(g0, a0 / 10); if (!is.null(pos$phi)) g0 <- c(g0, .9); g0 <- c(g0, min(.2, 1 - a0 - .01))
      fn <- function(g) { p <- st; p[1:kp] <- g; sp_e_lik(p, y, m, mo, pos) }
      o1 <- optim(g0, fn, control = list(maxit = 400, reltol = 1e-6)); if (is.null(b1) || o1$value < b1$value) b1 <- o1
    }
    p <- st; p[1:kp] <- b1$par; v <- b1$value
    if (!is.null(vor) && !is.null(pos$phi)) { q <- numeric(pos$n); vp <- vor$par; w <- vor$pos; q[pos$alpha] <- vp[w$alpha]; q[pos$beta] <- vp[w$beta]; q[pos$phi] <- .975; q[pos$gamma] <- vp[w$gamma]; q[pos$l] <- vp[w$l]; q[pos$b] <- vp[w$b]; q[pos$s] <- vp[w$s]; vq <- sp_e_lik(q, y, m, mo, pos); if (vq < v) { p <- q; v <- vq } }
    o <- optim(p, sp_e_lik, y = y, m = m, mo = mo, pos = pos, control = list(maxit = 6000, reltol = 1e-9)); best <- optim(o$par, sp_e_lik, y = y, m = m, mo = mo, pos = pos, control = list(maxit = 3000, reltol = 1e-9))
  }
  np <- pos$n + 1; ll <- -.5 * best$value
  list(par = best$par, pos = pos, mo = mo, m = m, loglik = ll, aicc = -2 * ll + 2 * np + 2 * np * (np + 1) / (n - np - 1), np = np, wert = best$value)
}

# Die neun Modelle der Automatik und der Wahl; sonst nichts.
sp_ets_modelle <- c('ANN', 'AAN', 'AAdN', 'ANA', 'AAA', 'AAdA', 'MNM', 'MAM', 'MAdM')
# Die Antwort zu einer Anpassung f (von sp_e_passen): Prognose, Intervall (nur Fehlerart A), Gütemaße, Ljung-Box, Prüfzeitraum.
# Intervall: Var(h) = s2 (1 + Summe_{j<h} c_j^2), c_j = alpha + beta Summe_{i<=j} phi^i (+ gamma, wenn j durch die Periode teilbar ist), s2 = SSE / (n - np + 1). Bei Fehlerart M gibt es keine geschlossene Formel: kein Intervall.
sp_ets_antwort <- function(y, m, h, f, modell, pr = 0, art = 'ets') {
  n <- length(y); p <- f$pos; mm <- f$m; mo <- f$mo
  r <- sp_e_lauf(f$par, y, mm, mo, p, h); if (is.null(r)) return(list(fehler = 'nicht-konvergiert'))
  al <- f$par[p$alpha]; be <- if (!is.null(p$beta)) f$par[p$beta] else NA_real_; ph <- if (!is.null(p$phi)) f$par[p$phi] else NA_real_; ga <- if (!is.null(p$gamma)) f$par[p$gamma] else NA_real_
  u80 <- o80 <- u95 <- o95 <- numeric(0)
  if (mo$err == 'A') {
    b1 <- if (is.na(be)) 0 else be; d1 <- if (is.na(ph)) 1 else ph; g1 <- if (is.na(ga)) 0 else ga
    cj <- vapply(seq_len(h - 1), function(j) al + b1 * (if (d1 == 1) j else sum(d1^seq_len(j))) + (if (g1 != 0 && j %% mm == 0) g1 else 0), 0)
    vf <- 1 + c(0, cumsum(cj^2)); s2 <- sum(r$e^2) / (n - f$np + 1); sd <- sqrt(s2 * vf)
    u80 <- r$fc - qnorm(0.9) * sd; o80 <- r$fc + qnorm(0.9) * sd; u95 <- r$fc - qnorm(0.975) * sd; o95 <- r$fc + qnorm(0.975) * sd
  }
  pruef <- NULL
  if (pr > 0 && n - pr >= max(2 * mm + 1, 12)) {
    f2 <- tryCatch(sp_e_passen(y[1:(n - pr)], m, modell), error = function(e) NULL)
    if (!is.null(f2) && f2$wert < 1e299) {
      r2 <- sp_e_lauf(f2$par, y[1:(n - pr)], f2$m, f2$mo, f2$pos, pr)
      if (!is.null(r2)) pruef <- sp_prog_fehlermasse(y[(n - pr + 1):n], r2$fc, sp_prog_naiv(y[1:(n - pr)], m, pr))
    }
  }
  fv <- r$fv
  list(
    art = 'glaettung', glaettung = art, ets = modell, periode = mm, alpha = al, beta = be, gamma = ga, phi = ph, loglik = f$loglik, aicc = f$aicc, aic = -2 * f$loglik + 2 * f$np, start = 1,
    mittel = r$fc, u80 = u80, o80 = o80, u95 = u95, o95 = o95, intervall = mo$err == 'A',
    angepasst = fv, rmse = sqrt(mean((y - fv)^2)), mae = mean(abs(y - fv)), mape = if (all(y > 0)) 100 * mean(abs((y - fv) / y)) else NA_real_,
    ljung = sp_prog_ljung(r$e, m, 0), acf_res = sp_prog_acf(r$e, min(n - 1, max(2 * m, 12))),
    pruef = if (is.null(pruef)) numeric(0) else pruef, pr = if (is.null(pruef)) 0 else pr
  )
}
# Ein gewähltes Modell (derzeit: AAdN, gedämpfter Trend).
sp_prognose_ets <- function(y, m, h, modell, pr = 0) {
  tryCatch({
    n <- length(y)
    if (!(modell %in% sp_ets_modelle)) return(list(fehler = 'r-fehler'))
    if (anyNA(y)) return(list(fehler = 'luecken-nur-selbst'))
    mo <- sp_e_modell(modell)
    if (mo$err == 'M' && any(y <= 0)) return(list(fehler = 'mult-nicht-positiv'))
    if (mo$seas != 'N' && (m < 2 || n < 2 * m + 1)) return(list(fehler = 'zu-kurz-saison'))
    f <- sp_e_passen(y, m, modell)
    if (f$wert >= 1e299 || !is.finite(f$aicc)) return(list(fehler = 'nicht-konvergiert'))
    sp_ets_antwort(y, m, h, f, modell, pr, if (modell == 'AAdN') 'gedaempft' else 'ets')
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}
# Automatik: kleinster AICc. Nicht saisonal immer ANN, AAN, AAdN; bei 2 <= m <= 24 und n >= 3 m dazu ANA, AAA, AAdA und, wenn alle Werte über 0 liegen, MNM, MAM, MAdM. Die Reihenfolge ist Teil der Rechnung (AAdA und MAdM starten vom Ergebnis von AAA und MAM).
# In drei Schritten, damit die Oberfläche nach jedem Modell den Fortschritt zeigen kann (sp_ets_start, sp_ets_kandidat je Modell, sp_ets_ende); sp_prognose_ets_auto ruft sie hintereinander auf. Die Anpassungen liegen dazwischen in .sp_ets_speicher.
.sp_ets_speicher <- new.env()
sp_ets_start <- function(y, m) {
  tryCatch({
    n <- length(y)
    if (anyNA(y)) return(list(fehler = 'luecken-nur-selbst'))
    k <- c('ANN', 'AAN', 'AAdN')
    if (m > 1 && m <= 24 && n >= 3 * m) k <- c(k, 'ANA', 'AAA', 'AAdA', if (all(y > 0)) c('MNM', 'MAM', 'MAdM'))
    .sp_ets_speicher$k <- k; .sp_ets_speicher$fits <- list()
    list(k = k)
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}
sp_ets_kandidat <- function(y, m, a) {
  tryCatch({
    if (!(a %in% sp_ets_modelle)) return(list(fehler = 'r-fehler'))
    fits <- .sp_ets_speicher$fits
    vor <- if (a == 'AAdA') fits[['AAA']] else if (a == 'MAdM') fits[['MAM']] else NULL
    z <- tryCatch(sp_e_passen(y, m, a, vor), error = function(e) NULL)
    if (!is.null(z) && (z$wert >= 1e299 || !is.finite(z$aicc))) z <- NULL
    .sp_ets_speicher$fits[[a]] <- z
    list(modell = a, aicc = if (is.null(z)) NA_real_ else z$aicc)
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}
sp_ets_ende <- function(y, m, h, pr = 0) {
  tryCatch({
    k <- .sp_ets_speicher$k; fits <- .sp_ets_speicher$fits
    if (is.null(k)) return(list(fehler = 'kein-modell'))
    a <- vapply(k, function(x) if (is.null(fits[[x]])) NA_real_ else fits[[x]]$aicc, 0, USE.NAMES = FALSE); gut <- which(is.finite(a))   # ohne Namen: sonst käme ein benannter Vektor zurück
    if (!length(gut)) return(list(fehler = 'kein-modell'))
    o <- gut[order(a[gut])]; b <- fits[[k[o[1]]]]
    erg <- sp_ets_antwort(y, m, h, b, k[o[1]], pr, 'ets')
    if (!is.null(erg$fehler)) return(erg)
    top <- o[seq_len(min(5, length(o)))]
    erg$wahl_ets <- list(modell = k[top], aicc = a[top], geprueft = length(o))
    erg
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}
sp_prognose_ets_auto <- function(y, m, h, pr = 0) {
  tryCatch({
    st <- sp_ets_start(y, m); if (!is.null(st$fehler)) return(st)
    for (a in st$k) sp_ets_kandidat(y, m, a)
    sp_ets_ende(y, m, h, pr)
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}

# Ein gerechnetes ARIMA-Modell auf andere Daten anwenden (Fachblatt GLAETTUNG-SERIEN, Abschnitt 5). Nichts wird neu geschätzt: die Koeffizienten b (in der Reihenfolge von arima) sind fest (fixed, transform.pars = FALSE).
# stats::arima hat kein model =. Bei Drift steht xreg wie in sp_prog_passen im Aufruf (predict wertet ihn neu aus). m: Periode der Reihe. sigma2, Ljung-Box und Prognose kommen von den neuen Daten; Standardfehler der Koeffizienten und AICc gibt es hier nicht.
sp_prognose_neu <- function(y, m, h, log_an, p, d, q, P, D, Q, konst, b) {
  tryCatch({
    n <- length(y)
    if (log_an && any(y <= 0, na.rm = TRUE)) return(list(fehler = 'log-nicht-positiv'))
    mm <- if (P + D + Q > 0) m else 1
    if (n <= d + mm * D + p + mm * P + 1) return(list(fehler = 'zu-kurz'))
    z <- if (log_an) log(y) else y
    rueck <- if (log_an) exp else identity
    dd <- d + D
    xr <- if (konst && dd == 1) cbind(drift = seq_along(z)) else NULL
    mean_an <- konst && dd == 0
    if (length(b) != p + q + P + Q + as.integer(mean_an) + as.integer(!is.null(xr))) return(list(fehler = 'modell-passt-nicht'))
    fit <- tryCatch(suppressWarnings(arima(ts(z, frequency = mm), order = c(p, d, q), seasonal = list(order = c(P, D, Q), period = mm), include.mean = mean_an, xreg = xr, fixed = b, transform.pars = FALSE)), error = function(e) NULL)
    if (is.null(fit)) return(list(fehler = 'modell-passt-nicht'))
    fit$call$xreg <- xr
    fit$sp_drift <- !is.null(xr)
    v <- sp_prog_vor_arima(fit, n, h)
    if (any(!is.finite(v$mittel)) || any(!is.finite(v$se))) return(list(fehler = 'modell-passt-nicht'))
    res <- as.numeric(residuals(fit)); ang <- rueck(z - res)
    list(
      art = 'arima', neu = TRUE, p = p, d = d, q = q, P = P, D = D, Q = Q, periode = mm, konst = konst && dd <= 1, drift = !is.null(xr), log = log_an,
      namen = names(fit$coef), b = as.numeric(fit$coef), se = numeric(0), sigma2 = fit$sigma2, loglik = fit$loglik, nobs = fit$nobs,
      mittel = rueck(v$mittel), u80 = rueck(v$mittel - qnorm(0.9) * v$se), o80 = rueck(v$mittel + qnorm(0.9) * v$se), u95 = rueck(v$mittel - qnorm(0.975) * v$se), o95 = rueck(v$mittel + qnorm(0.975) * v$se),
      angepasst = ang, rmse = sqrt(mean((y - ang)^2, na.rm = TRUE)), mae = mean(abs(y - ang), na.rm = TRUE), mape = if (all(y > 0, na.rm = TRUE)) 100 * mean(abs((y - ang) / y), na.rm = TRUE) else NA_real_,
      ljung = sp_prog_ljung(res, m, 0), acf_res = sp_prog_acf(res, min(n - 1, max(2 * m, 12))),
      pruef = numeric(0), pr = 0
    )
  }, error = function(e) list(fehler = 'r-fehler', meldung = conditionMessage(e)))
}
