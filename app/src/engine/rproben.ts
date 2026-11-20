/**
 * Die sieben Probe-Rechnungen für die zweite Engine (webR). Jede liefert einen benannten Zahlenvektor.
 * Dieselben Texte laufen im Browser (webR) und am Mac (`Rscript`, scripts/webr-messen.mjs) - so lassen sich die Zahlen vergleichen.
 */
// Sprache: Entwicklerseite (seiten/RProbe.svelte, Adresse #r-probe), nicht für Studierende - bleibt bei de/en.
export interface RProbe { id: string; titel: { de: string; en: string }; pakete: string[]; code: string }

/** Läuft einmal nach dem Start von R. detectCores() liefert in WebAssembly NA - lavaan bricht dann bei der Option ncpus ab. */
export const R_START = `local({ ns <- asNamespace('parallel'); unlockBinding('detectCores', ns); assign('detectCores', function(all.tests = FALSE, logical = TRUE) 2L, ns); lockBinding('detectCores', ns) })`;

export const R_PROBEN: RProbe[] = [
  {
    id: 'lmer',
    titel: { de: 'Gemischtes Modell (lme4::lmer, Zufallsachsenabschnitt)', en: 'Mixed model (lme4::lmer, random intercept)' },
    pakete: ['lme4'],
    code: `suppressMessages(library(lme4))
m <- lmer(Reaction ~ Days + (1 | Subject), data = sleepstudy, REML = TRUE)
co <- coef(summary(m)); vc <- as.data.frame(VarCorr(m))
c(b_Intercept = co[1, 1], b_Days = co[2, 1], se_Intercept = co[1, 2], se_Days = co[2, 2], t_Days = co[2, 3],
  var_Subject = vc$vcov[1], var_Residual = vc$vcov[2], REML = as.numeric(REMLcrit(m)),
  ICC = vc$vcov[1] / sum(vc$vcov))`
  },
  {
    id: 'cfa',
    titel: { de: 'Konfirmatorische Faktorenanalyse (lavaan::cfa, 3 Faktoren)', en: 'Confirmatory factor analysis (lavaan::cfa, 3 factors)' },
    pakete: ['lavaan'],
    code: `suppressMessages(library(lavaan))
mod <- 'visual =~ x1 + x2 + x3
        textual =~ x4 + x5 + x6
        speed   =~ x7 + x8 + x9'
fit <- cfa(mod, data = HolzingerSwineford1939)
fm <- fitMeasures(fit, c('chisq', 'df', 'pvalue', 'cfi', 'tli', 'rmsea', 'srmr'))
sl <- standardizedSolution(fit); sl <- sl[sl$op == '=~', ]
c(fm, setNames(sl$est.std, paste0('lambda_', sl$rhs)))`
  },
  {
    id: 'omega',
    titel: { de: 'McDonalds Omega (psych::omega)', en: "McDonald's omega (psych::omega)" },
    pakete: ['psych', 'GPArotation', 'lavaan'],
    code: `suppressMessages({ library(psych); library(lavaan) })
d <- HolzingerSwineford1939[, paste0('x', 1:9)]
o <- suppressWarnings(omega(d, nfactors = 3, plot = FALSE))
c(omega_h = o$omega_h, omega_total = o$omega.tot, alpha = o$alpha, G6 = o$G6)`
  },
  {
    id: 'rma',
    titel: { de: 'Meta-Analyse (metafor::rma, BCG-Impfung)', en: 'Meta-analysis (metafor::rma, BCG vaccine)' },
    pakete: ['metafor'],
    code: `suppressMessages(library(metafor))
dat <- escalc(measure = 'RR', ai = tpos, bi = tneg, ci = cpos, di = cneg, data = dat.bcg)
r <- rma(yi, vi, data = dat, method = 'REML')
c(b = as.numeric(r$b), se = r$se, ci_lb = r$ci.lb, ci_ub = r$ci.ub, tau2 = r$tau2, I2 = r$I2, H2 = r$H2, QE = r$QE, QEp = r$QEp, k = r$k)`
  },
  {
    id: 'survey',
    titel: { de: 'Umfragegewichte (survey::svydesign, nur Gewichte)', en: 'Survey weights (survey::svydesign, weights only)' },
    pakete: ['survey'],
    code: `suppressMessages(library(survey))
data(api)
des <- svydesign(ids = ~1, weights = ~pw, data = apistrat)
m <- svymean(~api00, des); h <- svychisq(~stype + awards, des, statistic = 'F')
g <- svyglm(api00 ~ ell + meals, des); q <- svyglm(I(awards == 'Yes') ~ ell, des, family = quasibinomial())
p <- svyciprop(~I(api00 > 800), des, method = 'logit'); ci <- confint(m, df = degf(des))
c(mittel = as.numeric(coef(m)), se = as.numeric(SE(m)), ci_u = ci[1, 1], ci_o = ci[1, 2], df = as.numeric(degf(des)),
  F = as.numeric(h$statistic), ndf = as.numeric(h$parameter[1]), ddf = as.numeric(h$parameter[2]), p_F = as.numeric(h$p.value),
  b_ell = as.numeric(coef(g)[2]), se_ell = as.numeric(SE(g)[2]), b_meals = as.numeric(coef(g)[3]), se_meals = as.numeric(SE(g)[3]),
  logit_b = as.numeric(coef(q)[2]), logit_se = as.numeric(SE(q)[2]), anteil = as.numeric(p), anteil_se = as.numeric(SE(p)))`
  },
  {
    id: 'quantreg',
    titel: { de: 'Quantilregression (quantreg::rq, Engel-Daten, Median und 1. Quartil)', en: 'Quantile regression (quantreg::rq, Engel data, median and 1st quartile)' },
    pakete: ['quantreg'],
    code: `suppressMessages(library(quantreg))
data(engel)
f5 <- rq(foodexp ~ income, tau = 0.5, data = engel); f25 <- rq(foodexp ~ income, tau = 0.25, data = engel)
s5 <- summary(f5, se = 'rank'); set.seed(1); b5 <- summary(f5, se = 'boot', R = 200, bsmethod = 'xy')
c(b0 = as.numeric(coef(f5)[1]), b1 = as.numeric(coef(f5)[2]), q25_b0 = as.numeric(coef(f25)[1]), q25_b1 = as.numeric(coef(f25)[2]),
  rank_u1 = as.numeric(s5$coefficients[2, 2]), rank_o1 = as.numeric(s5$coefficients[2, 3]), rank_u0 = as.numeric(s5$coefficients[1, 2]), rank_o0 = as.numeric(s5$coefficients[1, 3]),
  boot_se0 = as.numeric(b5$coefficients[1, 2]), boot_se1 = as.numeric(b5$coefficients[2, 2]), n = nrow(engel))`
  },
  {
    id: 'glmnet',
    titel: { de: 'Strafregression (glmnet::glmnet und cv.glmnet, feste Falten)', en: 'Penalised regression (glmnet::glmnet and cv.glmnet, fixed folds)' },
    pakete: ['glmnet'],
    code: `suppressMessages(library(glmnet))
data(QuickStartExample)
x <- QuickStartExample$x; y <- QuickStartExample$y
foldid <- rep(1:10, length.out = nrow(x))
lasso <- cv.glmnet(x, y, foldid = foldid, alpha = 1); ridge <- cv.glmnet(x, y, foldid = foldid, alpha = 0)
cl <- as.numeric(coef(lasso, s = 'lambda.min')); en <- glmnet(x, y, alpha = 0.5, lambda = 0.1)
c(lam_min = lasso$lambda.min, lam_1se = lasso$lambda.1se, cvm_min = min(lasso$cvm), b_V1 = cl[2], b_V2 = cl[3], b_int = cl[1],
  n_nichtnull = sum(cl[-1] != 0), ridge_lam = ridge$lambda.min, ridge_cvm = min(ridge$cvm), en_V1 = as.numeric(coef(en)[2]), en_df = en$df)`
  }
];
