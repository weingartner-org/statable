# ---------------------------------------------------------------------------------------------------------------
# Später S-F: Cox-Regression mit zeitabhängiger Größe (Zählprozess-Form, survival::coxph mit Surv(start, stop, ereignis)).
# Wird NACH statable.R geladen (sp_id und die kat_*-Helfer werden benutzt); statable.R bleibt unverändert.
# Fachblatt docs/fachblaetter/SPAETER-F-UEBERLEBEN-MEDIZIN.md Abschnitt 2 und „Entscheidungen Opus (18.10.)“ 3; Tests engine/spaeter-f.webr.test.ts.
#
# d: Spalten `start`, `stopp` (Zahlen; Abschnitte (Start, Stopp], links offen), `ereignis` (0/1, 1 nur in der letzten Zeile der Person), `id` (Ganzzahl-Kennung der Person, nur zum Zählen der Personen,
#    KEIN cluster(id): für EINE zeitabhängige Größe sind mehrere Zeilen je Person in Ordnung), `praed` (Zahl oder Faktor; die zeitabhängige Größe darf an jeder Stelle stehen), faktoren = Gruppen-Prädiktoren
#    (Faktor mit Codes 1 … k und Wertelabels, erste Stufe = Vergleichsgruppe; nichts wird umsortiert).
# ties = 'efron' (Voreinstellung) | 'breslow'. Fehlende Werte listenweise. Namen gehen durch sp_id (zweite Sperre); sie kommen nie als Text in den Code, sondern als Spalten der Daten.
# Antwort wie sp_cox, aber ohne Konkordanz (bei Zählprozess-Daten nicht aussagekräftig): ties, n (ZEILEN im Modell), personen, ausgelassen, ereignisse, npar, epv, epv_hinweis, koef, loglik, loglik0,
#   modelltest, lr_praed, ph (cox.zph, auch mit Zählprozess-Daten), trennung, warnungen. Fehler kommen als list(fehler = '...') (englische Kurztexte).
# ---------------------------------------------------------------------------------------------------------------
sp_cox_zp <- function(d, start, stopp, ereignis, id, praed, faktoren = character(0), ties = 'efron') {
  tryCatch({ sp_id(start, stopp, ereignis, id, praed, faktoren); cox_zp_reg(d, start, stopp, ereignis, id, praed, faktoren, ties) }, error = function(e) list(fehler = conditionMessage(e)))
}
cox_zp_formel <- function(start, stopp, ereignis, praed) {
  stats::as.formula(paste0('survival::Surv(`', start, '`, `', stopp, '`, `', ereignis, '`) ~ ', paste0('`', praed, '`', collapse = ' + ')))
}
cox_zp_reg <- function(d, start, stopp, ereignis, id, praed, faktoren, ties) {
  ties <- match.arg(ties, c('efron', 'breslow'))
  k <- kat_daten(d, start, praed, faktoren, extra = c(stopp, ereignis, id)); v <- k$v
  if (!is.numeric(v[[start]]) || !is.numeric(v[[stopp]]) || !is.numeric(v[[ereignis]])) stop('start, stop and event must be numbers')
  if (!all(v[[ereignis]] %in% c(0, 1))) stop('the event must be coded 0 or 1')
  if (any(v[[stopp]] <= v[[start]])) stop('stop time must be greater than start time')
  if (sum(v[[ereignis]] == 1) == 0) stop('no event among the valid cases')
  f <- cox_zp_formel(start, stopp, ereignis, praed)
  warn <- character(0)
  fange <- function(expr) withCallingHandlers(expr, warning = function(w) { warn <<- c(warn, conditionMessage(w)); invokeRestart('muffleWarning') })
  # die Daten stehen im Aufruf (cox.zph wertet fit$call später selbst aus und fände ein lokales `v` sonst nicht)
  fit <- fange(eval(bquote(survival::coxph(.(f), data = .(v), ties = .(ties)))))
  b <- unname(stats::coef(fit)); nm <- names(stats::coef(fit)); se <- unname(sqrt(diag(stats::vcov(fit))))
  npar <- length(b); ll <- fit$loglik[2]; ll0 <- fit$loglik[1]; ev <- fit$nevent
  lr <- lapply(praed, function(p) {
    rest <- setdiff(praed, p)
    llr <- if (length(rest)) survival::coxph(cox_zp_formel(start, stopp, ereignis, rest), data = v, ties = ties)$loglik[2] else ll0
    c(list(name = p), kat_lr(ll, llr, length(fit$assign[[p]])))
  })
  z <- tryCatch(suppressWarnings(survival::cox.zph(fit, transform = 'km', terms = TRUE)), error = function(e) e)
  out <- list(ties = ties, n = fit$n, personen = length(unique(v[[id]])), ausgelassen = k$ausgelassen, ereignisse = ev, npar = npar, epv = ev / npar, epv_hinweis = ev / npar < 10,
    koef = kat_zeilen(nm, b, se, 'hr'), loglik = ll, loglik0 = ll0, modelltest = kat_lr(ll, ll0, npar), lr_praed = lr,
    trennung = any(grepl('may be infinite|did not converge|ran out of iterations', warn, ignore.case = TRUE)), warnungen = unique(warn))
  if (inherits(z, 'error')) out$ph_fehler <- conditionMessage(z)
  else {
    tb <- z$table; g <- tb['GLOBAL', ]
    out$ph <- list(gesamt = list(chi2 = unname(g['chisq']), df = unname(g['df']), p = unname(g['p'])),
      praed = lapply(praed, function(p) list(name = p, chi2 = unname(tb[p, 'chisq']), df = unname(tb[p, 'df']), p = unname(tb[p, 'p']))))
  }
  out
}

# ---------------------------------------------------------------------------------------------------------------
# Später S-F2 (Teil D): AFT-Modell (Zeitverhältnis, survival::survreg) und Cox mit Kennung (cluster() oder Frailty, survival::coxph).
# Fachblatt docs/fachblaetter/SPAETER-F2-ERGAENZUNGEN.md Abschnitt D und „Entscheidungen Opus (19.10.)“ 9 und 10; Tests engine/spaeter-f2.webr.test.ts.
# Namen (Zeit, Ereignis, Kennung, Prädiktoren) gehen durch sp_id (zweite Sperre) und stehen als Spalten der Daten, nie als Text im Code; Verteilung, Art und Bindung nur als feste Wörter.
# Alle Skalare kommen OHNE Namen an (unname). Fehler als list(fehler = '...') (englische Kurztexte), nie ein Absturz.
#
# sp_aft(d, zeit, ereignis, praed, faktoren = character(0), dist = 'weibull'): dist 'weibull' | 'exponential' | 'lognormal' | 'loglogistic'; praed darf leer sein (nur Achsenabschnitt).
#   Antwort: dist, n (Zeilen im Modell), ausgelassen, ereignisse, npar (Koeffizienten ohne Skala), koef [{name, b, se, z, p, zeitverhaeltnis, ki_u, ki_o}] (erste Zeile 'achsenabschnitt'),
#   skala (σ; bei 'exponential' 1), loglik, loglik0, aic, hr_weibull (nur Weibull: HR = exp(-b/σ), Intervall mit σ fest - Näherung), trennung, warnungen.
# sp_aft_aic(...): { vergleich: [{dist, aic, loglik}] } in der Reihenfolge weibull, exponential, lognormal, loglogistic.
# sp_frailty(d, zeit, ereignis, kennung, praed, faktoren = character(0), art = 'cluster', ties = 'efron'): art 'cluster' (robuste Standardfehler) | 'gamma' (Gamma-Frailty, EM-Verfahren).
#   `kennung` ist ein Ganzzahl-Code 1 … G der Person oder Gruppe (nie Text). Antwort: art, ties, n, ausgelassen, ereignisse, gruppen, npar, wenige_gruppen (< 20 Gruppen), koef [{name, b, se, z, p, hr, ki_u, ki_o}];
#   cluster: se = robust, zusätzlich se_naiv; gamma: se = se(coef), zusätzlich varianz, c_loglik, loglik0 (θ = 0), lr_chi2, p_halbiert (Rand des Parameterraums), rand (Varianz < 1e-4), warnungen.
# ---------------------------------------------------------------------------------------------------------------
aft_verteilungen <- c('weibull', 'exponential', 'lognormal', 'loglogistic')
aft_pruefe_wort <- function(x, erlaubt, was) if (!(is.character(x) && length(x) == 1L && !is.na(x) && x %in% erlaubt)) stop(paste('unknown', was))
sp_laedt_survival <- function() if (!('package:survival' %in% search())) suppressMessages(library(survival))
# Daten wie kat_daten, aber ohne Prädiktoren erlaubt (nur Achsenabschnitt)
sp_surv_daten <- function(d, zeit, ereignis, praed, faktoren, extra = character(0)) {
  if (length(praed)) return(kat_daten(d, zeit, praed, faktoren, extra = c(ereignis, extra)))
  spalten <- c(zeit, ereignis, extra)
  ok <- stats::complete.cases(d[, spalten, drop = FALSE])
  v <- d[ok, spalten, drop = FALSE]; rownames(v) <- NULL
  list(v = v, n = nrow(v), ausgelassen = nrow(d) - nrow(v))
}
sp_surv_formel <- function(zeit, ereignis, rechts) {
  stats::as.formula(paste0('survival::Surv(`', zeit, '`, `', ereignis, '`) ~ ', rechts))
}
sp_fange <- function(expr, warn) withCallingHandlers(expr, warning = function(w) { warn$w <- c(warn$w, conditionMessage(w)); invokeRestart('muffleWarning') })
# Gruppe (Faktorstufe oder Wert einer Zahl mit höchstens zwei Werten) ohne Ereignis: dann geht der Koeffizient gegen unendlich, survreg meldet nichts
aft_trennung_vorab <- function(v, ereignis, praed) {
  any(vapply(praed, function(p) {
    x <- v[[p]]
    if (is.factor(x) || length(unique(x)) <= 2L) any(tapply(v[[ereignis]], x, sum) == 0) else FALSE
  }, logical(1)))
}
aft_anpassen <- function(v, zeit, ereignis, praed, dist) {
  rechts <- if (length(praed)) paste0('`', praed, '`', collapse = ' + ') else '1'
  f <- sp_surv_formel(zeit, ereignis, rechts)
  warn <- new.env(); warn$w <- character(0)
  fit <- sp_fange(eval(bquote(survival::survreg(.(f), data = .(v), dist = .(dist)))), warn)
  list(fit = fit, warn = unique(warn$w))
}
sp_aft <- function(d, zeit, ereignis, praed, faktoren = character(0), dist = 'weibull') {
  tryCatch({ sp_id(zeit, ereignis, praed, faktoren); aft_pruefe_wort(dist, aft_verteilungen, 'distribution'); sp_laedt_survival(); aft_modell(d, zeit, ereignis, praed, faktoren, dist) }, error = function(e) list(fehler = conditionMessage(e)))
}
aft_pruefen <- function(v, zeit, ereignis) {
  if (!is.numeric(v[[zeit]]) || !is.numeric(v[[ereignis]])) stop('time and event must be numbers')
  if (!all(v[[ereignis]] %in% c(0, 1))) stop('the event must be coded 0 or 1')
  if (sum(v[[ereignis]] == 1) == 0) stop('no event among the valid cases')
}
aft_modell <- function(d, zeit, ereignis, praed, faktoren, dist) {
  k <- sp_surv_daten(d, zeit, ereignis, praed, faktoren); v <- k$v
  aft_pruefen(v, zeit, ereignis)
  if (any(v[[zeit]] <= 0)) stop('survival times must be greater than zero')
  a <- aft_anpassen(v, zeit, ereignis, praed, dist); fit <- a$fit
  b <- unname(stats::coef(fit)); nm <- names(stats::coef(fit)); nm[nm == '(Intercept)'] <- 'achsenabschnitt'
  se <- unname(sqrt(diag(stats::vcov(fit))))[seq_along(b)]
  sigma <- as.numeric(fit$scale); if (dist == 'exponential') sigma <- 1
  npar <- length(b); ll <- as.numeric(fit$loglik[2]); ll0 <- as.numeric(fit$loglik[1])
  out <- list(dist = dist, n = nrow(v), ausgelassen = k$ausgelassen, ereignisse = sum(v[[ereignis]] == 1), npar = npar,
    koef = kat_zeilen(nm, b, se, 'zeitverhaeltnis'), skala = sigma, loglik = ll, loglik0 = ll0, aic = -2 * ll + 2 * (npar + (dist != 'exponential')),
    trennung = any(grepl('may be infinite|did not converge|ran out of iterations|Iteration limit', a$warn, ignore.case = TRUE)) || aft_trennung_vorab(v, ereignis, praed), warnungen = a$warn)
  if (dist == 'weibull' && npar > 1L) {
    q <- stats::qnorm(0.975); i <- 2:npar
    out$hr_weibull <- lapply(i, function(j) list(name = nm[j], hr = exp(-b[j] / sigma), ki_u = exp(-(b[j] + q * se[j]) / sigma), ki_o = exp(-(b[j] - q * se[j]) / sigma)))
  }
  out
}
sp_aft_aic <- function(d, zeit, ereignis, praed, faktoren = character(0)) {
  tryCatch({
    sp_id(zeit, ereignis, praed, faktoren); sp_laedt_survival()
    k <- sp_surv_daten(d, zeit, ereignis, praed, faktoren); v <- k$v
    aft_pruefen(v, zeit, ereignis)
    if (any(v[[zeit]] <= 0)) stop('survival times must be greater than zero')
    list(vergleich = lapply(aft_verteilungen, function(dist) tryCatch({
      fit <- aft_anpassen(v, zeit, ereignis, praed, dist)$fit; npar <- length(stats::coef(fit)); ll <- as.numeric(fit$loglik[2])
      list(dist = dist, aic = -2 * ll + 2 * (npar + (dist != 'exponential')), loglik = ll)
    }, error = function(e) list(dist = dist, aic = NA_real_, loglik = NA_real_, fehler = conditionMessage(e)))))
  }, error = function(e) list(fehler = conditionMessage(e)))
}

sp_frailty <- function(d, zeit, ereignis, kennung, praed, faktoren = character(0), art = 'cluster', ties = 'efron') {
  tryCatch({ sp_id(zeit, ereignis, kennung, praed, faktoren); aft_pruefe_wort(art, c('cluster', 'gamma'), 'method'); aft_pruefe_wort(ties, c('efron', 'breslow'), 'tie method'); sp_laedt_survival()
    frailty_modell(d, zeit, ereignis, kennung, praed, faktoren, art, ties) }, error = function(e) list(fehler = conditionMessage(e)))
}
frailty_modell <- function(d, zeit, ereignis, kennung, praed, faktoren, art, ties) {
  k <- kat_daten(d, zeit, praed, faktoren, extra = c(ereignis, kennung)); v <- k$v
  if (!is.numeric(v[[zeit]]) || !is.numeric(v[[ereignis]])) stop('time and event must be numbers')
  if (any(v[[zeit]] < 0)) stop('negative times')
  if (!all(v[[ereignis]] %in% c(0, 1))) stop('the event must be coded 0 or 1')
  if (sum(v[[ereignis]] == 1) == 0) stop('no event among the valid cases')
  tab <- table(v[[kennung]])
  if (sum(tab >= 2L) < 2L) stop('at least two groups with two rows are needed')
  praed_text <- paste0('`', praed, '`', collapse = ' + ')
  rechts <- if (art == 'cluster') paste0(praed_text, ' + cluster(`', kennung, '`)') else paste0(praed_text, " + frailty(`", kennung, "`, distribution = 'gamma')")
  f <- sp_surv_formel(zeit, ereignis, rechts)
  warn <- new.env(); warn$w <- character(0)
  fit <- sp_fange(eval(bquote(survival::coxph(.(f), data = .(v), ties = .(ties)))), warn)
  b <- unname(stats::coef(fit)); nm <- names(stats::coef(fit)); npar <- length(b)
  se <- unname(sqrt(diag(fit$var)))[seq_len(npar)]
  out <- list(art = art, ties = ties, n = nrow(v), ausgelassen = k$ausgelassen, ereignisse = sum(v[[ereignis]] == 1), gruppen = length(tab), npar = npar, wenige_gruppen = length(tab) < 20L,
    koef = kat_zeilen(nm, b, se, 'hr'), warnungen = unique(warn$w))
  if (art == 'cluster') {
    se_naiv <- unname(sqrt(diag(fit$naive.var)))[seq_len(npar)]
    for (i in seq_len(npar)) out$koef[[i]]$se_naiv <- se_naiv[i]
  } else {
    h <- fit$history[[1]]; th <- as.numeric(h$theta); cl <- as.numeric(h$c.loglik); cl0 <- as.numeric(h$history[1, 'c.loglik'])
    lr <- kat_lr(cl, cl0, 1L, klemmen = TRUE)
    out$varianz <- th; out$c_loglik <- cl; out$loglik0 <- cl0; out$lr_chi2 <- lr$chi2; out$p_halbiert <- 0.5 * lr$p; out$rand <- th < 1e-4
  }
  out
}
