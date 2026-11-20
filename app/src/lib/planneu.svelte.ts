/**
 * Zustand und Rechnung der Seite „Studie planen“ für die drei neuen Fälle (Später, Welle S-D, M9): Anteile, Überleben (Log-Rank), AUC.
 * Die Formeln stehen in lib/power.ts (geprüft gegen R); hier stehen nur die Eingaben (als Text, wie getippt), ihre Prüfung und das Ergebnis.
 * Die Fisher-Aufzählung (bis n = 400) läuft in Häppchen mit Fortschritt und Abbruch; die Seite zeigt dann die Lade-Animation.
 * Der Zustand bleibt beim Wechsel zur Hilfe und zurück erhalten (ein Objekt auf Modulebene).
 */
import {
  f2AusR2, nR2Zuwachs, kleinstesF2R2Zuwachs, nPartiell, powerPartiell, nAnovaEffekt, nAnovaMehrere, kontrastF, nMessw, planPruefungF2, effektAuf,
  type MesswTyp,
  ausfallZuschlag, ereignisseLogRank, hrAusMedianen, hrAusUeberleben, leseZahl, nAuc, nEinAnteil, nZweiAnteile, nZweiAnteileFisherAsync, personenLogRank, planPruefung, powerEinAnteilExakt,
  type AnteilErg, type AnteilVerfahren, type NeuerTest
} from './power';

const zahlOderNaN = (t: string) => leseZahl(t);

export class PlanNeu {
  art = $state<NeuerTest>('anteile');
  /** Ist einer der drei neuen Fälle auf der Seite gewählt (statt der sechs klassischen Tests)? */
  aktiv = $state(false);
  /** Fishers exakten Test zum Vergleich dazurechnen, auch wenn ein anderer Test gewählt ist */
  fisherDazu = $state(false);
  /* ---- gemeinsam */
  alpha = $state(0.05);
  power = $state(0.8);
  seiten = $state<1 | 2>(2);
  ausfallText = $state('0');
  /* ---- Anteile */
  anzahl = $state<'zwei' | 'ein'>('zwei');
  verfahren2 = $state<AnteilVerfahren>('gepoolt');
  verfahren1 = $state<'normal' | 'exakt' | 'h'>('normal');
  p1Text = $state(',30');
  p2Text = $state(',50');
  p0Text = $state(',20');
  pEinText = $state(',35');
  kText = $state('1');
  /* ---- Überleben */
  lrArt = $state<'hr' | 'median' | 'anteile'>('hr');
  hrText = $state(',50');
  medianKText = $state('12');
  medianBText = $state('24');
  zeitText = $state('12');
  sKText = $state(',60');
  sBText = $state(',77');
  lrKText = $state('1');
  /* ---- AUC */
  auc1Text = $state(',80');
  auc0Text = $state(',50');
  aucWeg = $state<'R' | 'haeufigkeit'>('R');
  aucRText = $state('1');
  aucPraeText = $state(',20');
  aucVerfahren = $state<'hm' | 'obuchowski'>('hm');

  /* ---- abgeleitete Zahlen */
  ausfall = $derived.by(() => { const v = zahlOderNaN(this.ausfallText); return Number.isFinite(v) ? v / 100 : NaN; });
  ausfallOk = $derived(this.ausfall >= 0 && this.ausfall < 0.9);
  p1 = $derived(zahlOderNaN(this.p1Text));
  p2 = $derived(zahlOderNaN(this.p2Text));
  p0 = $derived(zahlOderNaN(this.p0Text));
  pEin = $derived(zahlOderNaN(this.pEinText));
  k = $derived(zahlOderNaN(this.kText));
  kOk = $derived(this.k >= 0.1 && this.k <= 10);

  /* ---- Anteile: Prüfung und Ergebnis */
  anteilPruefung = $derived(this.anzahl === 'zwei'
    ? planPruefung({ art: 'anteile', p1: this.p1, p2: this.p2, alpha: this.alpha, power: this.power })
    : planPruefung({ art: 'anteile', p1: this.p0, p2: this.pEin, alpha: this.alpha, power: this.power }));
  anteilGueltig = $derived(this.anteilPruefung.fehler === null && (this.anzahl === 'ein' || this.kOk) && (this.ausfallOk || this.ausfallText.trim() === ''));
  /** alles außer Fisher (Formel, sofort) */
  zweiSofort = $derived.by((): AnteilErg | null => (this.anzahl === 'zwei' && this.anteilGueltig && this.verfahren2 !== 'fisher'
    ? nZweiAnteile(this.p1, this.p2, { alpha: this.alpha, power: this.power, seiten: this.seiten, k: this.k, verfahren: this.verfahren2 }) : null));
  /** Alle Formeln nebeneinander (ohne Fisher), damit man sieht, wie der spätere Test die Zahl ändert */
  zweiAlle = $derived.by(() => (this.anzahl === 'zwei' && this.anteilGueltig
    ? (['gepoolt', 'korrigiert', 'ungepoolt', 'h'] as const).map(v => ({ v, r: nZweiAnteile(this.p1, this.p2, { alpha: this.alpha, power: this.power, seiten: this.seiten, k: this.k, verfahren: v }) })) : []));
  einErg = $derived.by(() => {
    if (this.anzahl !== 'ein' || !this.anteilGueltig) return null;
    try {
      const r = nEinAnteil(this.p0, this.pEin, { alpha: this.alpha, power: this.power, seiten: this.seiten, verfahren: this.verfahren1 });
      return { r, erreicht: this.verfahren1 === 'exakt' ? powerEinAnteilExakt(this.p0, this.pEin, r.n, this.alpha, this.seiten) : null, fehler: '' };
    } catch (e) { return { r: null, erreicht: null, fehler: (e as Error).message }; }
  });

  /* ---- Fisher (Aufzählung, in Häppchen) */
  fisher = $state<AnteilErg | null>(null);
  fisherLaeuft = $state(false);
  fisherFortschritt = $state(0);
  fisherFehler = $state('');
  /** Die Person hat die Rechnung abgebrochen (Knopf „Abbrechen“): keine neue Rechnung, bis sich eine Eingabe ändert oder sie „Erneut rechnen“ wählt */
  fisherAbgebrochen = $state(false);
  private fisherSchluessel = $state('');
  private fisherNummer = 0;
  /** Der Schlüssel der aktuellen Eingabe: Ein Fisher-Ergebnis gilt nur, solange er zu dem passt, womit gerechnet wurde. */
  schluessel = $derived([this.p1, this.p2, this.alpha, this.power, this.seiten, this.k].join('|'));
  /** Das Fisher-Ergebnis, wenn es zu den heutigen Eingaben gehört (sonst null: die Eingabe hat sich seither geändert). */
  fisherAktuell = $derived<AnteilErg | null>(this.fisher && this.fisherSchluessel === this.schluessel ? this.fisher : null);
  /** Startet die Fisher-Rechnung, wenn das Verfahren gewählt und die Eingabe gültig ist; frühere Läufe werden abgebrochen. Ein Lauf je Eingabe. */
  starteFisher(): void {
    const noetig = this.art === 'anteile' && this.anzahl === 'zwei' && (this.verfahren2 === 'fisher' || this.fisherDazu) && this.anteilGueltig;
    if (!noetig) { this.fisherNummer++; this.fisherLaeuft = false; this.fisher = null; this.fisherFehler = ''; this.fisherAbgebrochen = false; this.fisherSchluessel = ''; return; }
    const sl = this.schluessel;
    if (sl === this.fisherSchluessel && (this.fisher || this.fisherLaeuft || this.fisherFehler || this.fisherAbgebrochen)) return;
    this.fisherSchluessel = sl; const nr = ++this.fisherNummer;
    this.fisher = null; this.fisherFehler = ''; this.fisherAbgebrochen = false; this.fisherLaeuft = true; this.fisherFortschritt = 0;
    nZweiAnteileFisherAsync(this.p1, this.p2, { alpha: this.alpha, power: this.power, seiten: this.seiten, k: this.k }, a => { if (nr === this.fisherNummer) this.fisherFortschritt = a; }, () => nr !== this.fisherNummer)
      .then(r => { if (nr !== this.fisherNummer) return; this.fisher = r; this.fisherLaeuft = false; })
      .catch((e: Error) => { if (nr !== this.fisherNummer) return; this.fisherFehler = e.message; this.fisherLaeuft = false; });
  }
  /** Bricht eine laufende Fisher-Rechnung ab (Knopf „Abbrechen“). */
  bricheFisherAb(): void { this.fisherNummer++; this.fisherLaeuft = false; this.fisherAbgebrochen = true; }
  /** Nach einem Abbruch noch einmal rechnen. */
  erneutFisher(): void { this.fisherSchluessel = ''; this.fisherAbgebrochen = false; this.starteFisher(); }

  /** Das Ergebnis zwei Anteile (Formel oder Fisher), sonst null. */
  zwei = $derived<AnteilErg | null>(this.verfahren2 === 'fisher' ? this.fisherAktuell : this.zweiSofort);
  /** Gesamt mit Ausfall: Personen je Gruppe nach Ausfallzuschlag */
  zweiMitAusfall = $derived.by(() => {
    const z = this.zwei; if (!z || !(this.ausfall > 0) || !this.ausfallOk) return null;
    const n1 = ausfallZuschlag(z.n1, this.ausfall), n2 = ausfallZuschlag(z.n2, this.ausfall);
    return { n1, n2, gesamt: n1 + n2 };
  });

  /* ---- Überleben */
  hrWert = $derived.by(() => {
    if (this.lrArt === 'hr') return zahlOderNaN(this.hrText);
    if (this.lrArt === 'median') return hrAusMedianen(zahlOderNaN(this.medianKText), zahlOderNaN(this.medianBText));
    return hrAusUeberleben(zahlOderNaN(this.sKText), zahlOderNaN(this.sBText));
  });
  sKWert = $derived.by(() => {
    if (this.lrArt === 'median') { const m = zahlOderNaN(this.medianKText), t = zahlOderNaN(this.zeitText); return 0.5 ** (t / m); }   // exponentiell: S(t) = 0,5^(t / Median)
    return zahlOderNaN(this.sKText);
  });
  lrK = $derived(zahlOderNaN(this.lrKText));
  lrPruefung = $derived(planPruefung({ art: 'ueberleben', hr: this.hrWert, alpha: this.alpha, power: this.power }));
  lrSkOk = $derived(this.sKWert > 0 && this.sKWert < 1);
  lrAnteileOk = $derived(this.lrArt !== 'anteile' || (this.sKWert > 0 && this.sKWert < 1 && zahlOderNaN(this.sBText) > 0 && zahlOderNaN(this.sBText) < 1));
  lrMedianOk = $derived(this.lrArt !== 'median' || (zahlOderNaN(this.medianKText) > 0 && zahlOderNaN(this.medianBText) > 0 && zahlOderNaN(this.zeitText) > 0));
  lrKOk = $derived(this.lrK >= 0.1 && this.lrK <= 10);
  lrGueltig = $derived(this.lrPruefung.fehler === null && this.lrSkOk && this.lrAnteileOk && this.lrMedianOk && this.lrKOk && (this.ausfallOk || this.ausfallText.trim() === ''));
  lrErg = $derived.by(() => {
    if (!this.lrGueltig) return null;
    const o = { alpha: this.alpha, power: this.power, seiten: this.seiten, k: this.lrK };
    const s = ereignisseLogRank(this.hrWert, o), f = ereignisseLogRank(this.hrWert, { ...o, formel: 'freedman' });
    return { schoenfeld: s, freedman: f, personen: personenLogRank(s.d, this.sKWert, this.hrWert, this.lrK), personenFreedman: personenLogRank(f.d, this.sKWert, this.hrWert, this.lrK) };
  });

  /* ---- AUC */
  auc1 = $derived(zahlOderNaN(this.auc1Text));
  auc0 = $derived(zahlOderNaN(this.auc0Text));
  aucR = $derived.by(() => (this.aucWeg === 'R' ? zahlOderNaN(this.aucRText) : (1 - zahlOderNaN(this.aucPraeText)) / zahlOderNaN(this.aucPraeText)));
  aucPrae = $derived(zahlOderNaN(this.aucPraeText));
  aucROk = $derived(this.aucR >= 0.1 && this.aucR <= 100 && (this.aucWeg === 'R' || (this.aucPrae > 0 && this.aucPrae < 1)));
  aucPruefung = $derived(planPruefung({ art: 'auc', auc1: this.auc1, auc0: this.auc0, alpha: this.alpha, power: this.power }));
  aucGueltig = $derived(this.aucPruefung.fehler === null && this.aucROk && (this.ausfallOk || this.ausfallText.trim() === ''));
  aucErg = $derived.by(() => {
    if (!this.aucGueltig) return null;
    const o = { auc0: this.auc0, alpha: this.alpha, power: this.power, R: this.aucR };
    const hm = nAuc(this.auc1, o), ob = nAuc(this.auc1, { ...o, verfahren: 'obuchowski' });
    // Gesamtzahl = Summe der aufgerundeten Gruppen, damit sie zu den gezeigten Zahlen passt (nicht N = n_A / π)
    const gesamt = this.aucWeg === 'haeufigkeit' ? { hm: hm.nCases + hm.nControls, ob: ob.nCases + ob.nControls } : null;
    return { hm, ob, gesamt };
  });
  aucHinweise = $derived(this.aucGueltig && this.aucErg
    ? planPruefung({ art: 'auc', auc1: this.auc1, auc0: this.auc0, nCases: (this.aucVerfahren === 'hm' ? this.aucErg.hm : this.aucErg.ob).nCases, alpha: this.alpha, power: this.power }).hinweise : []);
}

/** Ein Objekt für die ganze Sitzung: die Eingaben bleiben beim Wechsel zur Hilfe und zurück erhalten. */
export const planNeu = new PlanNeu();


/* =====================================================================================================================================================
 * Später, Welle S-F2, Teil A: Eingaben und Rechnung für R²-Zuwachs, partielle Korrelation und die Karte „Gruppen mit mehreren Faktoren oder Messwiederholung“ (`anovaplus`).
 * Die Formeln stehen in lib/power.ts (geprüft gegen die Sollwerte aus R und die gedruckten Beispiele von G*Power); hier nur die Eingaben als Text, ihre Prüfung und das Ergebnis.
 * ===================================================================================================================================================== */
export type AnovaPlusArt = 'faktoren' | 'kovariate' | 'kontrast' | 'messw';
const liste = (t: string) => t.split(/[;\s]+/).map(x => x.trim()).filter(Boolean).map(leseZahl);

export class PlanF2 {
  alpha = $state(0.05);
  power = $state(0.8);
  seiten = $state<1 | 2>(2);
  ausfallText = $state('0');
  /* ---- R²-Zuwachs */
  r2Ziel = $state<'n' | 'effekt'>('n');
  r2Art = $state<'r2' | 'f2'>('r2');
  r2vollText = $state(',30');
  r2altText = $state(',25');
  r2alleText = $state('');
  f2Text = $state(',15');
  qText = $state('1');
  mText = $state('3');
  nText = $state('100');
  /* ---- partielle Korrelation */
  rpText = $state(',30');
  kText = $state('3');
  partWeg = $state<'exakt' | 'fest'>('exakt');
  /* ---- anovaplus */
  anovaArt = $state<AnovaPlusArt>('faktoren');
  aText = $state('3');
  bText = $state('3');
  cText = $state('1');
  effekt = $state('A×B');
  fText = $state(',25');
  gruppenText = $state('3');
  kovText = $state('1');
  /** Zähler-Freiheitsgrade des Effekts bei der Kovariate; leer = Gruppen − 1 (ein Faktor) */
  kovDfText = $state('');
  r2kovText = $state(',20');
  mittelText = $state('1,5; 2; 3; 4');
  gewichteText = $state('-3; -1; 1; 3');
  nJeText = $state('5');
  sigmaText = $state('2');
  /* ---- Messwiederholung */
  messTyp = $state<MesswTyp>('innerhalb');
  messKText = $state('1');
  messMText = $state('3');
  rhoText = $state(',50');
  epsText = $state('1');

  /* ---- gemeinsam */
  ausfall = $derived.by(() => { const v = leseZahl(this.ausfallText); return Number.isFinite(v) ? v / 100 : NaN; });
  ausfallOk = $derived(this.ausfall >= 0 && this.ausfall < 0.9);
  private static ganz = (t: string) => { const v = leseZahl(t); return Number.isInteger(v) ? v : NaN; };

  /* ---- R²-Zuwachs */
  q = $derived(PlanF2.ganz(this.qText));
  m = $derived(PlanF2.ganz(this.mText));
  nGegeben = $derived(PlanF2.ganz(this.nText));
  r2voll = $derived(leseZahl(this.r2vollText));
  r2alt = $derived(leseZahl(this.r2altText));
  r2alle = $derived(this.r2alleText.trim() === '' ? undefined : leseZahl(this.r2alleText));
  f2 = $derived.by(() => {
    if (this.r2Art === 'f2') return leseZahl(this.f2Text);
    const alle = this.r2alle;
    return alle !== undefined && !(alle >= this.r2voll && alle < 1) ? NaN : f2AusR2(this.r2voll, this.r2alt, alle);
  });
  r2Fehler = $derived.by((): string | null => {
    const nOk = this.r2Ziel === 'n' ? undefined : (Number.isInteger(this.nGegeben) ? this.nGegeben : 0);
    if (this.r2Art === 'r2') { const p = planPruefungF2({ art: 'r2zuwachs', r2voll: this.r2voll, r2alt: this.r2alt, q: this.q, m: this.m, ...(nOk === undefined ? {} : { N: nOk }) }); if (p.fehler) return p.fehler; if (!Number.isFinite(this.f2)) return 'r2alle'; return null; }
    if (!(this.f2 > 0 && Number.isFinite(this.f2))) return 'f2';
    return planPruefungF2({ art: 'r2zuwachs', r2voll: 0.5, r2alt: 0.25, q: this.q, m: this.m, ...(nOk === undefined ? {} : { N: nOk }) }).fehler;
  });
  r2Erg = $derived.by(() => (this.r2Ziel === 'n' && this.r2Fehler === null ? nR2Zuwachs(this.f2, this.q, this.m, this.power, this.alpha) : null));
  r2Sens = $derived.by(() => (this.r2Ziel === 'effekt' && this.r2Fehler === null ? kleinstesF2R2Zuwachs(this.nGegeben, this.q, this.m, this.power, this.alpha) : null));
  r2SensAuf = $derived(this.r2Sens ? effektAuf(this.r2Sens) : 0);
  r2Hinweise = $derived(this.r2Fehler === null ? planPruefungF2({ art: 'r2zuwachs', r2voll: 0.3, r2alt: 0.2, q: 1, m: 1 }).hinweise : []);

  /* ---- partielle Korrelation */
  rp = $derived(leseZahl(this.rpText));
  k = $derived(PlanF2.ganz(this.kText));
  partFehler = $derived(planPruefungF2({ art: 'partiell', rp: this.rp, k: this.k }).fehler);
  partErg = $derived.by(() => {
    if (this.partFehler) return null;
    const o = { alpha: this.alpha, seiten: this.seiten, ziel: this.power };
    const gew = nPartiell(this.rp, this.k, { ...o, weg: this.partWeg }), anders = nPartiell(this.rp, this.k, { ...o, weg: this.partWeg === 'exakt' ? 'fest' : 'exakt' });
    const exakt = this.partWeg === 'exakt' ? gew : anders, fest = this.partWeg === 'exakt' ? anders : gew;
    return { N: gew, exakt, fest, power: gew === null ? null : powerPartiell(this.rp, gew, this.k, { alpha: this.alpha, seiten: this.seiten, weg: this.partWeg }) };
  });

  /* ---- anovaplus: gemeinsame Zahlen */
  f = $derived(leseZahl(this.fText));
  fOk = $derived(this.f > 0 && this.f <= 3);
  a = $derived(PlanF2.ganz(this.aText));
  b = $derived(PlanF2.ganz(this.bText));
  c = $derived(PlanF2.ganz(this.cText));
  faktorenOk = $derived(this.a >= 2 && this.b >= 2 && this.c >= 1 && this.a * this.b * this.c <= 200);
  /** Alle Effekte des Plans mit ihren Zähler-Freiheitsgraden (Haupteffekte und Wechselwirkungen von zwei oder drei Faktoren) */
  effekte = $derived.by((): { name: string; df1: number }[] => {
    if (!this.faktorenOk) return [];
    const L_ = [['A', this.a], ['B', this.b], ['C', this.c]] as [string, number][], F = L_.filter(([, n], i) => i < 2 || n >= 2);
    const aus: { name: string; df1: number }[] = [];
    const rek = (von: number, namen: string[], df: number) => { if (namen.length) aus.push({ name: namen.join('×'), df1: df }); for (let i = von; i < F.length; i++) rek(i + 1, [...namen, F[i]![0]], df * (F[i]![1] - 1)); };
    rek(0, [], 1);
    return aus.sort((x, y) => x.name.split('×').length - y.name.split('×').length || x.name.localeCompare(y.name));
  });
  zellenFaktoren = $derived(this.a * this.b * (this.c >= 2 ? this.c : 1));
  gewaehlterEffekt = $derived(this.effekte.find(e => e.name === this.effekt) ?? this.effekte.at(-1) ?? null);
  faktorenFehler = $derived(!this.faktorenOk ? 'zellen' : !this.fOk ? 'f' : null);
  faktorenErg = $derived.by(() => {
    const e = this.gewaehlterEffekt; if (this.faktorenFehler || !e) return null;
    const r = nAnovaEffekt(this.f, e.df1, this.zellenFaktoren, { alpha: this.alpha, ziel: this.power });
    const mehrere = nAnovaMehrere(this.effekte.map(x => ({ name: x.name, f: this.f, df1: x.df1 })), this.zellenFaktoren, { alpha: this.alpha, ziel: this.power });
    return { r, mehrere };
  });
  /* ---- Kovariate */
  gruppen = $derived(PlanF2.ganz(this.gruppenText));
  kov = $derived(PlanF2.ganz(this.kovText));
  r2kov = $derived(leseZahl(this.r2kovText));
  kovDf = $derived(this.kovDfText.trim() === '' ? this.gruppen - 1 : PlanF2.ganz(this.kovDfText));
  kovFehler = $derived.by((): string | null => {
    if (!(this.gruppen >= 2 && this.gruppen <= 200)) return 'zellen';
    if (!this.fOk) return 'f';
    if (!(this.kov >= 1 && this.kov <= 20)) return 'kov';
    return planPruefungF2({ art: 'anovaplus', zellen: this.gruppen, df1: this.kovDf, kovariaten: this.kov, r2kov: this.r2kov }).fehler;
  });
  kovErg = $derived(this.kovFehler ? null : nAnovaEffekt(this.f, this.kovDf, this.gruppen, { alpha: this.alpha, ziel: this.power, kovariaten: this.kov, r2kov: this.r2kov }));
  kovOhne = $derived(this.kovFehler ? null : nAnovaEffekt(this.f, this.kovDf, this.gruppen, { alpha: this.alpha, ziel: this.power }));
  /* ---- Kontrast */
  mittel = $derived(liste(this.mittelText));
  gewichte = $derived(liste(this.gewichteText));
  nJe = $derived(PlanF2.ganz(this.nJeText));
  sigma = $derived(leseZahl(this.sigmaText));
  kontrastFehler = $derived.by((): string | null => {
    const mu = this.mittel, c = this.gewichte;
    if (mu.length < 2 || mu.length > 50 || mu.some(v => !Number.isFinite(v)) || c.some(v => !Number.isFinite(v)) || c.length !== mu.length) return 'liste';
    if (Math.abs(c.reduce((x, v) => x + v, 0)) > 1e-9) return 'summe';
    if (!(this.nJe >= 2) || !(this.sigma > 0)) return 'n';
    return kontrastF(c, mu, this.nJe, this.sigma) > 0 ? null : 'null';
  });
  kontrastWert = $derived(this.kontrastFehler ? NaN : kontrastF(this.gewichte, this.mittel, this.nJe, this.sigma));
  kontrastErg = $derived(this.kontrastFehler || !(this.kontrastWert <= 3) ? null : nAnovaEffekt(this.kontrastWert, 1, this.mittel.length, { alpha: this.alpha, ziel: this.power }));
  /* ---- Messwiederholung */
  messK = $derived(PlanF2.ganz(this.messKText));
  messM = $derived(PlanF2.ganz(this.messMText));
  rho = $derived(leseZahl(this.rhoText));
  eps = $derived(leseZahl(this.epsText));
  messFehler = $derived.by((): string | null => {
    if (!(this.messK >= 1 && this.messK <= 20)) return 'k';
    if (!this.fOk) return 'f';
    return planPruefungF2({ art: 'messw', m: this.messM, rho: this.rho, eps: this.eps, k: this.messK }).fehler;
  });
  messHinweise = $derived(this.messFehler ? [] : planPruefungF2({ art: 'messw', m: this.messM, rho: this.rho, eps: this.eps, k: this.messK }).hinweise);
  messErg = $derived(this.messFehler ? null : nMessw(this.f, this.messK, this.messM, this.rho, this.eps, this.messTyp, { alpha: this.alpha, ziel: this.power }));
  /** Alle drei Effekte nebeneinander (Zahl der Personen), damit man sieht, wie sehr das Ergebnis am Effekt hängt */
  messAlle = $derived.by(() => (this.messFehler ? [] : (['innerhalb', 'zwischen', 'wechsel'] as MesswTyp[]).map(typ => ({ typ, r: typ !== 'innerhalb' && this.messK < 2 ? null : nMessw(this.f, this.messK, this.messM, this.rho, this.eps, typ, { alpha: this.alpha, ziel: this.power }) }))));
  /** Die Nachbarn in der ρ-Falle: dieselbe Zahl f mit WebPower-Bedeutung (f enthält die Korrelation schon) */
  messWebPower = $derived.by(() => (this.messFehler || this.messTyp === 'zwischen' ? null : nMessw(this.f / Math.sqrt(this.messM / (1 - this.rho)), this.messK, this.messM, this.rho, this.eps, this.messTyp, { alpha: this.alpha, ziel: this.power })));
  /** Aktuelle Prüfcodes der Karte */
  anovaFehler = $derived(this.anovaArt === 'faktoren' ? this.faktorenFehler : this.anovaArt === 'kovariate' ? this.kovFehler : this.anovaArt === 'kontrast' ? this.kontrastFehler : this.messFehler);
}

/** Ein Objekt für die ganze Sitzung (die Eingaben bleiben beim Wechsel zur Hilfe und zurück erhalten). */
export const planF2 = new PlanF2();
