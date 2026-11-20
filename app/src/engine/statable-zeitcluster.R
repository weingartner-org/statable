# Statable - R-Funktionen für die Clusteranalyse (Später, Welle S-E, Bauer B; Fachblatt docs/fachblaetter/SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER.md, Abschnitt 4 und „Entscheidungen Opus (18.10.)“ 7).
# Eigene Datei (nicht statable.R), damit die beiden Bauer der Welle nicht in dieselben Zeilen schreiben. Sie wird beim ersten Cluster-Lauf mit statable.R geladen
# (lib/rverfahren.svelte.ts, `?raw`). Am Mac läuft dieselbe Datei mit Rscript (source()). Nur R-Basis (stats), kein weiteres Paket.
#
# Vertrag (getestet in engine/spaeter-e.webr.test.ts gegen scripts/spaeter-e-erwartet.R):
#   sp_cluster_ward(d, merkmale, standardisieren, ks)
#       vollständige Fälle über die Merkmale; z = scale(X) bzw. roh; hclust(dist(Z), 'ward.D2') (euklidisch; Höhe = sqrt(2 * Zuwachs der Streuung)); cutree für jedes k in ks
#       -> list(n, ausgelassen, zeilen, merge_a, merge_b, hoehe, order, ks, zuordnung = list(ein cutree-Vektor je k))
#   sp_cluster_kmeans(d, merkmale, standardisieren, k, nstart, startwert, start_zeilen)
#       start_zeilen NULL: je Start die Startzeilen u[sample.int(length(u), k)] mit u = which(!duplicated(Z)) nach RNGkind(Mersenne-Twister, Inversion, Rejection) und set.seed(startwert);
#       sonst genau diese Zeilen (ein Start). Jeder Start: kmeans(Z, Z[zeilen, ], iter.max = 100, algorithm = 'Hartigan-Wong'); bricht er ab (Fehler oder Warnung), Rückfall auf 'Lloyd'.
#       Bester Start = kleinste tot.withinss.
#       -> list(n, ausgelassen, zeilen, k, zuordnung, zentren, groesse, wss_je, wss, totss, zwischen_anteil, algorithmus, rueckfall, beste_x, starts, wss_starts)
# Beide werfen nie: ein Fehler kommt als list(fehler = Text). Sie lesen nur Daten und Zahlen; die Namen der Merkmale sind eigene Namen (v1, v2 ...) und laufen durch sp_id.
# SICHERHEIT (Fremde Dateien): Namen aus Dateien kommen nie in den Code. `merkmale` sind die eigenen Namen der Tabelle d; sp_id lehnt jeden Namen ab, der nicht /^[A-Za-z][A-Za-z0-9_.]*$/ ist.
if (!exists('sp_id', mode = 'function')) sp_id <- function(...) {
  x <- unlist(list(...), use.names = FALSE)
  if (!length(x)) return(invisible(TRUE))
  ok <- is.character(x) && !anyNA(x) && all(nchar(x, type = 'bytes') <= 64L) && all(grepl('^[A-Za-z][A-Za-z0-9_.]*\\z', x, perl = TRUE)) &&
    !any(x %in% c('if', 'else', 'repeat', 'while', 'function', 'for', 'next', 'break', 'TRUE', 'FALSE', 'NULL', 'Inf', 'NaN', 'NA', 'NA_integer_', 'NA_real_', 'NA_character_', 'NA_complex_', 'in'))
  if (!ok) stop('unsafe name rejected')
  invisible(TRUE)
}

# Die gerechnete Matrix: vollständige Fälle über die Merkmale, auf Wunsch z-standardisiert (sd mit n - 1, wie scale()). Konstante Spalten bleiben 0 (nie NaN).
cl_matrix <- function(d, merkmale, standardisieren) {
  sp_id(merkmale)
  if (!is.data.frame(d)) stop('data frame expected')
  X <- as.matrix(d[, merkmale, drop = FALSE]); storage.mode(X) <- 'double'
  ok <- rowSums(!is.finite(X)) == 0L
  X <- X[ok, , drop = FALSE]
  if (nrow(X) < 2L) stop('too few complete cases')
  Z <- X
  if (isTRUE(standardisieren)) {
    s <- apply(X, 2, sd)
    if (all(is.finite(s) & s > 0)) Z <- scale(X)
    else { Z <- sweep(X, 2, colMeans(X)); keep <- is.finite(s) & s > 0; Z[, keep] <- sweep(Z[, keep, drop = FALSE], 2, s[keep], '/'); Z[, !keep] <- 0 }
  }
  attr(Z, 'scaled:center') <- NULL; attr(Z, 'scaled:scale') <- NULL
  list(Z = Z, zeilen = which(ok), n = nrow(X), ausgelassen = nrow(d) - nrow(X))
}

sp_cluster_ward <- function(d, merkmale, standardisieren, ks) {
  tryCatch({
    m <- cl_matrix(d, merkmale, standardisieren)
    ks <- as.integer(ks); ks <- ks[!is.na(ks) & ks >= 1L & ks <= m$n]
    hc <- hclust(dist(m$Z), method = 'ward.D2')
    list(n = m$n, ausgelassen = m$ausgelassen, zeilen = m$zeilen, merge_a = hc$merge[, 1], merge_b = hc$merge[, 2], hoehe = hc$height, order = hc$order,
         ks = ks, zuordnung = lapply(ks, function(k) as.integer(cutree(hc, k))))
  }, error = function(e) list(fehler = conditionMessage(e)))
}

# Ein Start von Hartigan-Wong; bei Abbruch (Fehler oder Warnung wie "did not converge", "Quick-TRANSfer ...") ein Lauf mit Lloyd.
cl_ein_start <- function(Z, zeilen) {
  start <- Z[zeilen, , drop = FALSE]
  hw <- tryCatch(kmeans(Z, start, iter.max = 100L, algorithm = 'Hartigan-Wong'), warning = function(w) NULL, error = function(e) NULL)
  if (!is.null(hw)) return(list(fit = hw, algorithmus = 'Hartigan-Wong'))
  ll <- suppressWarnings(kmeans(Z, start, iter.max = 100L, algorithm = 'Lloyd'))
  list(fit = ll, algorithmus = 'Lloyd')
}

sp_cluster_kmeans <- function(d, merkmale, standardisieren, k, nstart, startwert, start_zeilen) {
  tryCatch({
    m <- cl_matrix(d, merkmale, standardisieren); Z <- m$Z
    k <- as.integer(k)[1]; nstart <- as.integer(nstart)[1]
    u <- which(!duplicated(Z))
    if (length(u) < k) stop('more cluster centers than distinct data points.')
    starts <- if (!is.null(start_zeilen)) list(as.integer(start_zeilen)) else {
      RNGkind('Mersenne-Twister', 'Inversion', 'Rejection'); set.seed(as.integer(startwert)[1])
      lapply(seq_len(nstart), function(i) u[sample.int(length(u), k)])
    }
    laeufe <- lapply(starts, function(ix) cl_ein_start(Z, ix))
    w <- vapply(laeufe, function(l) l$fit$tot.withinss, numeric(1)); b <- which.min(w); f <- laeufe[[b]]$fit
    list(n = m$n, ausgelassen = m$ausgelassen, zeilen = m$zeilen, k = k, zuordnung = as.integer(f$cluster), zentren = lapply(seq_len(k), function(j) as.numeric(f$centers[j, ])),
         groesse = as.integer(f$size), wss_je = as.numeric(f$withinss), wss = f$tot.withinss, totss = f$totss, zwischen_anteil = f$betweenss / f$totss,
         algorithmus = laeufe[[b]]$algorithmus, rueckfall = any(vapply(laeufe, function(l) l$algorithmus != 'Hartigan-Wong', logical(1))),
         beste_x = sum(abs(w - min(w)) <= 1e-9 * min(w)), starts = length(starts), wss_starts = as.numeric(w))
  }, error = function(e) list(fehler = conditionMessage(e)))
}
