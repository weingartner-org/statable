# Armut und Ungleichheit: gewichteter Median, Armutsschwelle, Armutsquote, S80/S20, Gini mit Standardfehler. Fachblatt: docs/fachblaetter/INDEX-ARMUT.md, Teil 2.
# Nur survey (kein laeken, kein convey). Verlangt statable.R (sp_id). Gegenprobe: scripts/index-armut-erwartet.R.
# Die Funktion wirft nie: ein Fehler kommt als list(fehler = '<Code oder englische Kurzmeldung>'), die Oberfläche macht daraus einen Satz.
# Daten nur als Objekt `d` mit den festen Statable-Namen e (Einkommen), w (Gewicht), optional k (Klumpen, Text) und s (Schicht, Text);
# Text aus den Daten kommt nie als Code. Zeilen mit Lücken und Gewicht 0 sortiert die Oberfläche vorher aus (und zählt sie), negatives Gewicht sperrt sie.

# Gewichtetes Quantil: kleinster Wert mit kumuliertem Gewichtsanteil >= p; liegt der Anteil genau bei p, das Mittel der beiden Nachbarn (wie laeken).
ar_quantil <- function(x, w, p) {
  o <- order(x); x <- x[o]; w <- w[o]
  cw <- cumsum(w) / sum(w)
  k <- which(cw >= p - 1e-12)[1]
  if (is.na(k)) k <- length(x)
  if (abs(cw[k] - p) < 1e-12 && k < length(x)) (x[k] + x[k + 1L]) / 2 else x[k]
}
# Gini = 2 * Summe(w y C) / (N T) - 1 mit C = kumuliertes Gewicht - w/2, nach y sortiert; N = Summe w, T = Summe w y (Prozent).
ar_gini <- function(y, w) {
  o <- order(y); y <- y[o]; w <- w[o]
  C <- cumsum(w) - w / 2
  100 * (2 * sum(w * y * C) / (sum(w) * sum(w * y)) - 1)
}
# Linearisierung des Gini (Prozent): u_k = 2/(N T) * (y_k C_k + Summe_{l>k} w_l y_l) - 2A/(N T) * (1/N + y_k/T), A = Summe w y C.
ar_linear <- function(y, w) {
  o <- order(y); ys <- y[o]; ws <- w[o]
  N <- sum(ws); Tt <- sum(ws * ys); C <- cumsum(ws) - ws / 2; A <- sum(ws * ys * C)
  rest <- rev(cumsum(rev(ws * ys))) - ws * ys
  u <- 2 / (N * Tt) * (ys * C + rest) - 2 * A / (N * Tt) * (1 / N + ys / Tt)
  r <- numeric(length(y)); r[o] <- u
  100 * r
}

# klumpen / schicht: Wahrheitswerte (gibt es die Spalten k und s?). anteile: Anteile des Medians für die Schwelle (Vorgabe 0.6).
sp_armut <- function(d, klumpen = FALSE, schicht = FALSE, anteile = c(0.4, 0.5, 0.6, 0.7)) {
  tryCatch({ sp_id(names(d)); armut_rechnen(d, isTRUE(klumpen), isTRUE(schicht), as.numeric(anteile)) },
    error = function(e) list(fehler = conditionMessage(e)))
}
armut_rechnen <- function(d, klumpen, schicht, anteile) {
  suppressMessages(library(survey))
  e <- data.frame(e = as.numeric(d$e), w = as.numeric(d$w))
  if (nrow(e) < 2L || anyNA(e$e) || anyNA(e$w) || any(!is.finite(e$e)) || any(!is.finite(e$w))) stop('zu-wenig')
  if (any(e$w < 0)) stop('negatives-gewicht')
  if (any(e$w == 0)) stop('gewicht-null')
  if (klumpen) e$k <- as.character(d$k)
  if (schicht) e$s <- as.character(d$s)
  if (klumpen && (anyNA(e$k) || any(!nzchar(e$k)))) stop('klumpen-luecke')
  if (schicht && (anyNA(e$s) || any(!nzchar(e$s)))) stop('schicht-luecke')
  y <- e$e; w <- e$w
  # Negative Einkommen sperren Gini und S80/S20 (nicht definiert); Nullen sind erlaubt (die Lorenzkurve bleibt definiert) und werden gemeldet.
  ohne_negativ <- all(y >= 0)
  med <- ar_quantil(y, w, 0.5)
  # Entwurf: Klumpen und Schicht, sonst einzeln gezogen (nest = TRUE wie bei den Umfragegewichten von Haushalten in Schichten)
  des_von <- function(dat) {
    if (klumpen && schicht) survey::svydesign(ids = ~k, strata = ~s, weights = ~w, data = dat, nest = TRUE)
    else if (klumpen) survey::svydesign(ids = ~k, weights = ~w, data = dat)
    else if (schicht) survey::svydesign(ids = ~1, strata = ~s, weights = ~w, data = dat)
    else survey::svydesign(ids = ~1, weights = ~w, data = dat)
  }
  # survey meldet eine Schicht mit nur einem Klumpen als Fehler; das geben wir weiter, ohne die Option umzustellen
  quoten <- lapply(anteile, function(a) {
    thr <- a * med
    dat <- e; dat$arm <- 100 * as.numeric(dat$e < thr)
    se <- as.numeric(survey::SE(survey::svymean(~arm, des_von(dat))))
    list(anteil = a, schwelle = thr, quote = 100 * sum(w * (y < thr)) / sum(w), se = se)
  })
  q20 <- ar_quantil(y, w, 0.2); q80 <- ar_quantil(y, w, 0.8)
  s8020 <- NA_real_; gini <- NA_real_; gini_se <- NA_real_
  if (ohne_negativ && sum(w * y) > 0) {
    nenner <- sum(w * y * (y <= q20))
    if (nenner > 0) s8020 <- sum(w * y * (y > q80)) / nenner
    gini <- ar_gini(y, w)
    dat <- e; dat$u <- ar_linear(y, w)
    gini_se <- as.numeric(survey::SE(survey::svytotal(~u, des_von(dat))))
  }
  list(n = nrow(e), summe_w = sum(w), median = med, q20 = q20, q80 = q80, quoten = quoten,
    s80s20 = if (is.na(s8020)) NULL else s8020, gini = if (is.na(gini)) NULL else gini, gini_se = if (is.na(gini_se)) NULL else gini_se,
    nullen = sum(y == 0), negativ = sum(y < 0), klumpen_n = if (klumpen) length(unique(e$k)) else NULL, schicht_n = if (schicht) length(unique(e$s)) else NULL)
}
