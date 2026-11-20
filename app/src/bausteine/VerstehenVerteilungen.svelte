<script module lang="ts">
  export type Art = 'normal' | 't' | 'chi2' | 'f' | 'binom' | 'poisson' | 'hyper' | 'eigen';
  export type Modus = 'links' | 'linksStreng' | 'rechts' | 'rechtsStreng' | 'zwischen' | 'quantil';
  const STANDARD: Record<Art, { x: string; a: string; b: string; q: string }> = {
    normal: { x: '115', a: '85', b: '115', q: '0,975' }, t: { x: '2', a: '-2', b: '2', q: '0,975' }, chi2: { x: '11,07', a: '3', b: '11', q: '0,95' }, f: { x: '3,49', a: '1', b: '3', q: '0,95' },
    binom: { x: '5', a: '3', b: '8', q: '0,95' }, poisson: { x: '3', a: '2', b: '6', q: '0,95' }, hyper: { x: '1', a: '1', b: '3', q: '0,95' }, eigen: { x: '3', a: '2', b: '4', q: '0,5' }
  };
  let lokal = false;
  /** Die Eingaben bleiben beim Wechsel zur Hilfe und zurück erhalten (Zustand nur im Modul, nie im Projekt). */
  const z = $state({
    art: 'normal' as Art, modus: 'links' as Modus,
    mu: '100', sigma: '15', df: '10', d1: '3', d2: '12', n: '20', p: '0,3', lambda: '4,5', N: '49', K: '6', nz: '6',
    x: STANDARD.normal.x, a: STANDARD.normal.a, b: STANDARD.normal.b, q: STANDARD.normal.q, zText: '1,96',
    zeilen: [1, 2, 3, 4, 5, 6].map(i => ({ x: String(i), p: '1/6' })), summeBestaetigt: false,
    naeherung: false, korrektur: true, na: '', nb: ''
  });
</script>
<script lang="ts">
  import { L, d, s } from '../lib/sitzung.svelte';
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { verteilungBezug } from '../lib/verteilungbezug';
  import { zahlDe } from '../lib/format';
  import { dez, ganzZahl } from '../i18n/profil';
  import { dichte, eigeneKennzahlen, ereignisImTraeger, istDiskret, links, linksStreng, liesZahl, momente, normalnaeherung, pruefeVerteilung, quantil, rechts, rechtsStreng, sigmaTabelle, vonZ, zuZ, zwischen, type Verteilung } from '../lib/verteilungen';
  import { lokalisiere, ortsZahl, prozent, wahrscheinlichkeit, zahlKurz } from '../lib/verstehenformat';
  import { randWahl } from '../lib/randwahl.svelte';
  import { artName, verteilungAbsaetze } from '../lib/verteilungrand';
  import VerstehenBild, { type Saeule } from './VerstehenBild.svelte';
  import Icon from './Icon.svelte';

  if (!lokal) { lokal = true; lokalisiere(z, ['x', 'a', 'b', 'q', 'p', 'lambda', 'zText']); }
  const num = (t: string) => liesZahl(t);
  const k = zahlKurz;

  /** Die Seitenleiste antwortet auf jede Wahl (Meldung 31.10.): vorige Verteilung für den Zusammenhang, zuletzt Geändertes zuoberst. */
  let vorher = $state<Art | null>(null), zuletzt = $state<'art' | 'modus'>('art');
  function waehleArt(a: Art) {
    if (z.art === a) return;
    vorher = z.art; zuletzt = 'art';
    z.art = a; z.x = ortsZahl(STANDARD[a].x); z.a = ortsZahl(STANDARD[a].a); z.b = ortsZahl(STANDARD[a].b); z.q = ortsZahl(STANDARD[a].q); z.na = ''; z.nb = '';
    if (a !== 'binom') z.naeherung = false;
  }
  const standardnormal = () => { z.mu = '0'; z.sigma = '1'; z.x = ortsZahl('1,96'); z.a = ortsZahl('-1,96'); z.b = ortsZahl('1,96'); z.q = ortsZahl('0,975'); };

  /* ---------- Verteilung aus den Feldern ---------- */
  const verteilung = $derived.by((): Verteilung | null => {
    switch (z.art) {
      case 'normal': return { art: 'normal', mu: num(z.mu), sigma: num(z.sigma) };
      case 't': return { art: 't', df: num(z.df) };
      case 'chi2': return { art: 'chi2', df: num(z.df) };
      case 'f': return { art: 'f', d1: num(z.d1), d2: num(z.d2) };
      case 'binom': return { art: 'binom', n: num(z.n), p: num(z.p) };
      case 'poisson': return { art: 'poisson', lambda: num(z.lambda) };
      case 'hyper': return { art: 'hyper', N: num(z.N), K: num(z.K), n: num(z.nz) };
      case 'eigen': return { art: 'eigen', x: z.zeilen.map(r => num(r.x)), p: z.zeilen.map(r => num(r.p)) };
    }
  });
  const felderOk = $derived.by(() => {
    const v = verteilung;
    if (!v) return false;
    return Object.entries(v).every(([key, w]) => key === 'art' || (Array.isArray(w) ? true : Number.isFinite(w as number)));
  });
  const fehlerVerteilung = $derived(!verteilung ? '' : !felderOk ? L('Bitte alle Felder mit Zahlen füllen (Komma oder Punkt als Dezimalzeichen).', 'Please fill all fields with numbers (comma or point as the decimal mark).') : (pruefeVerteilung(verteilung) ?? ''));
  const v = $derived(fehlerVerteilung ? null : verteilung);

  /* ---------- Ereignis ---------- */
  const x = $derived(num(z.x)), a = $derived(num(z.a)), b = $derived(num(z.b)), q = $derived(num(z.q));
  const fehlerEreignis = $derived.by(() => {
    if (z.modus === 'quantil') return !(q >= 0 && q <= 1) ? L('Die Wahrscheinlichkeit p muss zwischen 0 und 1 liegen (zum Beispiel 0,975).', 'The probability p must lie between 0 and 1 (for example 0.975).') : '';
    if (z.modus === 'zwischen') return !Number.isFinite(a) || !Number.isFinite(b) ? L('Bitte a und b als Zahlen eingeben.', 'Please enter a and b as numbers.') : a > b ? L('a darf nicht größer sein als b.', 'a must not be greater than b.') : '';
    return !Number.isFinite(x) ? L('Bitte x als Zahl eingeben.', 'Please enter x as a number.') : '';
  });
  const diskret = $derived(v ? istDiskret(v) : false);
  const ganzNoetig = $derived(!!v && diskret && v.art !== 'eigen');
  const nichtGanz = $derived(ganzNoetig && !fehlerEreignis && (z.modus === 'zwischen' ? !(Number.isInteger(a) && Number.isInteger(b)) : z.modus === 'quantil' ? false : !Number.isInteger(x)));

  const woerter = $derived<Record<Modus, string>>({
    links: L('höchstens', 'at most'), linksStreng: L('weniger als', 'less than'), rechts: L('mindestens', 'at least'), rechtsStreng: L('mehr als', 'more than'), zwischen: L('zwischen', 'between'), quantil: L('Quantil zu p', 'Quantile for p')
  });
  const formel = $derived.by(() => {
    switch (z.modus) {
      case 'links': return `P(X ≤ ${k(x)})`;
      case 'linksStreng': return `P(X < ${k(x)})`;
      case 'rechts': return `P(X ≥ ${k(x)})`;
      case 'rechtsStreng': return `P(X > ${k(x)})`;
      case 'zwischen': return `P(${k(a)} ≤ X ≤ ${k(b)})`;
      case 'quantil': return '';
    }
  });

  /* ---------- Ergebnis ---------- */
  const erg = $derived.by(() => {
    if (!v || fehlerEreignis) return null;
    if (z.modus === 'quantil') { const r = quantil(v, q); return { p: q, quantil: r, unterlauf: false, rest: undefined }; }
    const p = z.modus === 'links' ? links(v, x) : z.modus === 'linksStreng' ? linksStreng(v, x) : z.modus === 'rechts' ? rechts(v, x) : z.modus === 'rechtsStreng' ? rechtsStreng(v, x) : zwischen(v, a, b);
    // Gegenschwanz direkt gerechnet (für „1 − …“ nahe 1): P(X ≤ x) → P(X > x), P(X < x) → P(X ≥ x) usw.; zwischen: beide Ränder.
    const rest = z.modus === 'links' ? rechtsStreng(v, x) : z.modus === 'linksStreng' ? rechts(v, x) : z.modus === 'rechts' ? linksStreng(v, x) : z.modus === 'rechtsStreng' ? links(v, x) : linksStreng(v, a) + rechtsStreng(v, b);
    return { p, quantil: null, unterlauf: p === 0 && ereignisImTraeger(v, z.modus, x, a, b), rest };
  });
  const ps = $derived(erg && !erg.quantil ? wahrscheinlichkeit(erg.p, erg.unterlauf, erg.rest) : ''), pz = $derived(erg && !erg.quantil ? prozent(erg.p, erg.unterlauf) : '');
  const vier = $derived(v && !fehlerEreignis && z.modus !== 'zwischen' && z.modus !== 'quantil' ? [
    { w: L('höchstens', 'at most'), zeichen: `P(X ≤ ${k(x)})`, p: links(v, x), rest: rechtsStreng(v, x), m: 'links' as const, an: z.modus === 'links' },
    { w: L('weniger als', 'less than'), zeichen: `P(X < ${k(x)})`, p: linksStreng(v, x), rest: rechts(v, x), m: 'linksStreng' as const, an: z.modus === 'linksStreng' },
    { w: L('mindestens', 'at least'), zeichen: `P(X ≥ ${k(x)})`, p: rechts(v, x), rest: linksStreng(v, x), m: 'rechts' as const, an: z.modus === 'rechts' },
    { w: L('mehr als', 'more than'), zeichen: `P(X > ${k(x)})`, p: rechtsStreng(v, x), rest: links(v, x), m: 'rechtsStreng' as const, an: z.modus === 'rechtsStreng' }
  ] : []);

  const satz = $derived.by(() => {
    if (!erg) return '';
    if (erg.quantil) {
      const r = erg.quantil, p = zahlKurz(q);
      if (q === 0) return diskret ? L(`Für p = 0 ist das Quantil der kleinste mögliche Wert: ${k(r.x)}.`, `For p = 0 the quantile is the smallest possible value: ${k(r.x)}.`) : L(`Für p = 0 liegt das Quantil am unteren Rand: ${k(r.x)}.`, `For p = 0 the quantile is at the lower end: ${k(r.x)}.`);
      if (q === 1) return Number.isFinite(r.x) ? L(`Für p = 1 ist das Quantil der größte mögliche Wert: ${k(r.x)}.`, `For p = 1 the quantile is the largest possible value: ${k(r.x)}.`) : L('Für p = 1 gibt es keinen größten Wert: das Quantil ist unendlich.', 'For p = 1 there is no largest value: the quantile is infinite.');
      if (diskret && Math.abs((r.erreicht ?? q) - q) <= 1e-9 * Math.max(q, 1e-300)) return L(`Das kleinste x, für das P(X ≤ x) mindestens ${p} erreicht, ist ${k(r.x)}. Erreicht wird P(X ≤ ${k(r.x)}) = ${wahrscheinlichkeit(r.erreicht ?? q)} (${prozent(r.erreicht ?? q)}) - genau die geforderte Wahrscheinlichkeit.`,
        `The smallest x for which P(X ≤ x) reaches at least ${p} is ${k(r.x)}. The probability actually reached is P(X ≤ ${k(r.x)}) = ${wahrscheinlichkeit(r.erreicht ?? q)} (${prozent(r.erreicht ?? q)}) - exactly the required probability.`);
      if (diskret) return L(`Das kleinste x, für das P(X ≤ x) mindestens ${p} erreicht, ist ${k(r.x)}. Erreicht wird P(X ≤ ${k(r.x)}) = ${wahrscheinlichkeit(r.erreicht ?? q)} (${prozent(r.erreicht ?? q)}) - das ist etwas mehr als gefordert, weil es nur ganze Werte gibt.`,
        `The smallest x for which P(X ≤ x) reaches at least ${p} is ${k(r.x)}. The probability actually reached is P(X ≤ ${k(r.x)}) = ${wahrscheinlichkeit(r.erreicht ?? q)} (${prozent(r.erreicht ?? q)}) - slightly more than required, because only whole values exist.`);
      return L(`Der Wert x, links von dem die Wahrscheinlichkeit ${p} liegt, ist ${k(r.x)}. Es gilt P(X ≤ ${k(r.x)}) = ${wahrscheinlichkeit(r.erreicht ?? q)}.`, `The value x with probability ${p} to its left is ${k(r.x)}. It holds that P(X ≤ ${k(r.x)}) = ${wahrscheinlichkeit(r.erreicht ?? q)}.`);
    }
    switch (z.modus) {
      case 'links': return L(`Die Wahrscheinlichkeit, dass X höchstens ${k(x)} beträgt, ist ${ps} (${pz}).`, `The probability that X is at most ${k(x)} is ${ps} (${pz}).`);
      case 'linksStreng': return L(`Die Wahrscheinlichkeit, dass X kleiner als ${k(x)} ist, beträgt ${ps} (${pz}).`, `The probability that X is less than ${k(x)} is ${ps} (${pz}).`);
      case 'rechts': return L(`Die Wahrscheinlichkeit, dass X mindestens ${k(x)} beträgt, ist ${ps} (${pz}).`, `The probability that X is at least ${k(x)} is ${ps} (${pz}).`);
      case 'rechtsStreng': return L(`Die Wahrscheinlichkeit, dass X größer als ${k(x)} ist, beträgt ${ps} (${pz}).`, `The probability that X is greater than ${k(x)} is ${ps} (${pz}).`);
      default: return L(`Die Wahrscheinlichkeit, dass X zwischen ${k(a)} und ${k(b)} liegt (beide Grenzen eingeschlossen), beträgt ${ps} (${pz}).`, `The probability that X lies between ${k(a)} and ${k(b)} (both limits included) is ${ps} (${pz}).`);
    }
  });

  /* ---------- Namen ---------- */
  const titel = $derived.by(() => {
    if (!v) return '';
    switch (v.art) {
      case 'normal': return L(`Normalverteilung N(${k(v.mu)}; ${k(v.sigma)})`, `Normal distribution N(${k(v.mu)}; ${k(v.sigma)})`);
      case 't': return L(`t-Verteilung mit ${k(v.df)} Freiheitsgraden`, `t distribution with ${k(v.df)} degrees of freedom`);
      case 'chi2': return L(`χ²-Verteilung mit ${k(v.df)} Freiheitsgraden`, `χ² distribution with ${k(v.df)} degrees of freedom`);
      case 'f': return L(`F-Verteilung mit ${k(v.d1)} und ${k(v.d2)} Freiheitsgraden`, `F distribution with ${k(v.d1)} and ${k(v.d2)} degrees of freedom`);
      case 'binom': return L(`Binomialverteilung B(${k(v.n)}; ${k(v.p)})`, `Binomial distribution B(${k(v.n)}; ${k(v.p)})`);
      case 'poisson': return L(`Poisson-Verteilung mit λ = ${k(v.lambda)}`, `Poisson distribution with λ = ${k(v.lambda)}`);
      case 'hyper': return L(`Hypergeometrische Verteilung (N = ${k(v.N)}, K = ${k(v.K)}, n = ${k(v.n)})`, `Hypergeometric distribution (N = ${k(v.N)}, K = ${k(v.K)}, n = ${k(v.n)})`);
      case 'eigen': return L('Eigene diskrete Verteilung', 'Custom discrete distribution');
    }
  });
  const mo = $derived(v ? momente(v) : null);

  $effect(() => {
    randWahl.k = { titel: artName(z.art), zeile: titel || undefined, absaetze: verteilungAbsaetze(z.art, z.modus, vorher, zuletzt), mehr: 'verstehen-verteilungen' };
    return () => { randWahl.k = null; };
  });

  /* ---------- Bild ---------- */
  const ereignisGrenzen = $derived.by((): number[] => {
    if (!erg || fehlerEreignis) return [];
    const g = z.modus === 'zwischen' ? [a, b] : z.modus === 'quantil' ? [erg.quantil!.x] : [x];
    return g.filter(Number.isFinite);
  });
  const bildStetig = $derived.by(() => {
    if (!v || diskret || fehlerEreignis) return null;
    let lo: number, hi: number;
    switch (v.art) {
      case 'normal': lo = v.mu - 4 * v.sigma; hi = v.mu + 4 * v.sigma; break;
      case 't': { const e = Math.min(10, Math.max(4, -quantil(v, 0.001).x)); lo = -e; hi = e; break; }
      case 'chi2': lo = 0; hi = Math.max(3, Math.min(quantil(v, 0.995).x, 300)); break;
      default: lo = 0; hi = Math.max(3, Math.min(quantil(v, 0.95).x, 50));
    }
    const span = hi - lo;
    for (const gr of ereignisGrenzen) { if (gr < lo) lo = gr - 0.1 * span; if (gr > hi) hi = gr + 0.1 * span; }
    if (v.art !== 'normal' && v.art !== 't') lo = Math.max(0, lo);
    const f = (t: number) => dichte(v, t);
    const pr = Array.from({ length: 200 }, (_, i) => lo + ((hi - lo) * i) / 199).filter(t => t >= lo + 0.03 * (hi - lo) || v.art === 'normal' || v.art === 't').map(f).filter(Number.isFinite);
    const yMax = Math.max(...pr, 1e-12) * 1.08;
    let schatten: [number, number][];
    switch (z.modus) {
      case 'links': case 'linksStreng': schatten = [[-Infinity, x]]; break;
      case 'rechts': case 'rechtsStreng': schatten = [[x, Infinity]]; break;
      case 'zwischen': schatten = [[a, b]]; break;
      default: schatten = [[-Infinity, erg?.quantil?.x ?? -Infinity]];
    }
    return { f, lo, hi, schatten, yMax };
  });
  const trefferTest = (kk: number) => z.modus === 'links' ? kk <= x : z.modus === 'linksStreng' ? kk < x : z.modus === 'rechts' ? kk >= x : z.modus === 'rechtsStreng' ? kk > x : z.modus === 'zwischen' ? kk >= a && kk <= b : kk <= (erg?.quantil?.x ?? -Infinity);
  const bildDiskret = $derived.by(() => {
    if (!v || !diskret || fehlerEreignis || !mo) return null;
    const eigen = v.art === 'eigen';
    const sig = mo.sigma ?? 1, mu = mo.mittel ?? 0;
    let klo: number, khi: number, breite = 1;
    if (v.art === 'eigen') {
      const xs = [...v.x].sort((p, r) => p - r), luecke = xs.slice(1).map((w, i) => w - xs[i]!), minL = Math.min(...luecke.filter(g => g > 0), Infinity);
      breite = Number.isFinite(minL) ? minL : 1;
      klo = xs[0]!; khi = xs.at(-1)!;
      const punkte: Saeule[] = xs.map(w => ({ x: w, p: dichte(v, w), treffer: trefferTest(w) }));
      return { punkte, lo: klo - breite * 0.6, hi: khi + breite * 0.6, breite: breite * 0.9, ausserhalb: null as null | number, bereich: null as null | [number, number] };
    }
    let sMin = 0, sMax = Infinity;
    if (v.art === 'binom') sMax = v.n;
    if (v.art === 'hyper') { sMin = Math.max(0, v.n - (v.N - v.K)); sMax = Math.min(v.n, v.K); }
    klo = Math.max(sMin, Math.floor(mu - 4 * sig)); khi = Math.min(sMax, Math.ceil(mu + 4 * sig));
    if (khi - klo < 6) { khi = Math.min(sMax, klo + 6); klo = Math.max(sMin, khi - 6); }
    for (const gr of ereignisGrenzen) {
      const g = Math.min(sMax, Math.max(sMin, Math.round(gr)));
      const nlo = Math.min(klo, g - 1), nhi = Math.max(khi, g + 1);
      if (nhi - nlo <= 3000) { klo = Math.max(sMin, nlo); khi = Math.min(sMax, nhi); }
    }
    const punkte: Saeule[] = [];
    for (let kk = klo; kk <= khi; kk++) punkte.push({ x: kk, p: dichte(v, kk), treffer: trefferTest(kk) });
    const aussen = (klo > sMin ? links(v, klo - 1) : 0) + (khi < sMax ? rechts(v, khi + 1) : 0);
    return { punkte, lo: klo - 0.5, hi: khi + 0.5, breite, ausserhalb: aussen > 0 ? aussen : null, bereich: [klo, khi] as [number, number] };
  });

  /* ---------- Normalnäherung ---------- */
  const nae = $derived.by(() => {
    if (!z.naeherung || !v || v.art !== 'binom' || !mo) return null;
    const mu = v.n * v.p, sig = Math.sqrt(v.n * v.p * (1 - v.p));
    const na = z.na.trim() === '' ? Math.max(0, Math.round(mu - sig)) : num(z.na), nb = z.nb.trim() === '' ? Math.min(v.n, Math.round(mu + sig)) : num(z.nb);
    if (!Number.isFinite(na) || !Number.isFinite(nb)) return { fehler: L('Bitte a und b als Zahlen eingeben.', 'Please enter a and b as numbers.') };
    if (na > nb) return { fehler: L('a darf nicht größer sein als b.', 'a must not be greater than b.') };
    return { fehler: '', na, nb, r: normalnaeherung(v.n, v.p, na, nb), sigma: sigmaTabelle(v.n, v.p) };
  });
  const naeherungKurve = $derived.by(() => {
    if (!z.naeherung || !v || v.art !== 'binom') return undefined;
    const mu = v.n * v.p, sig = Math.sqrt(v.n * v.p * (1 - v.p));
    return (t: number) => (sig > 0 ? Math.exp(-((t - mu) ** 2) / (2 * sig * sig)) / (sig * Math.sqrt(2 * Math.PI)) : 0);
  });
  const naeherungSatz = $derived.by(() => {
    if (!nae || nae.fehler || !nae.r) return '';
    const r = nae.r, mit = z.korrektur;
    const nah = mit ? r.mitKorrektur : r.ohneKorrektur;
    return mit
      ? L(`P(${nae.na} ≤ X ≤ ${nae.nb}): exakt ${wahrscheinlichkeit(r.exakt)}, Normalnäherung mit Stetigkeitskorrektur ${wahrscheinlichkeit(nah)} (ohne: ${wahrscheinlichkeit(r.ohneKorrektur)}).`, `P(${nae.na} ≤ X ≤ ${nae.nb}): exact ${wahrscheinlichkeit(r.exakt)}, normal approximation with continuity correction ${wahrscheinlichkeit(nah)} (without: ${wahrscheinlichkeit(r.ohneKorrektur)}).`)
      : L(`P(${nae.na} ≤ X ≤ ${nae.nb}): exakt ${wahrscheinlichkeit(r.exakt)}, Normalnäherung ohne Stetigkeitskorrektur ${wahrscheinlichkeit(nah)} (mit: ${wahrscheinlichkeit(r.mitKorrektur)}).`, `P(${nae.na} ≤ X ≤ ${nae.nb}): exact ${wahrscheinlichkeit(r.exakt)}, normal approximation without continuity correction ${wahrscheinlichkeit(nah)} (with: ${wahrscheinlichkeit(r.mitKorrektur)}).`);
  });

  /* ---------- Eigene Verteilung ---------- */
  const eigen = $derived(v?.art === 'eigen' ? eigeneKennzahlen(v.x, v.p) : null);
  function zeileMehr() { const xs = z.zeilen.map(r => num(r.x)).filter(Number.isFinite); z.zeilen.push({ x: String((xs.length ? Math.max(...xs) : 0) + 1), p: '' }); z.summeBestaetigt = false; }
  function zeileWeg(i: number) { if (z.zeilen.length > 2) z.zeilen.splice(i, 1); z.summeBestaetigt = false; }
  function aufEinsSetzen() {
    if (!eigen || !(eigen.summe > 0)) return;
    const summe = eigen.summe;   // vorher merken: `eigen` rechnet sich bei jeder Änderung einer Zeile neu
    z.zeilen.forEach(r => { const w = num(r.p); if (Number.isFinite(w)) r.p = dez(String(Number((w / summe).toPrecision(12)))); });
    z.summeBestaetigt = false;
  }
  const dichteTitel = $derived(diskret ? L('Wahrscheinlichkeit', 'Probability') : L('Dichte', 'Density'));

  const bildBeschreibung = $derived.by(() => {
    if (!v || !erg) return '';
    const ereignis = erg.quantil ? L(`Quantil zu p = ${k(q)}: x = ${k(erg.quantil.x)}.`, `Quantile for p = ${k(q)}: x = ${k(erg.quantil.x)}.`) : `${formel} = ${ps}.`;
    const art = diskret ? L('Säulen zeigen P(X = k); schraffierte Säulen gehören zum Ereignis.', 'Bars show P(X = k); hatched bars belong to the event.') : L('Die Kurve zeigt die Dichte; die schraffierte Fläche gehört zum Ereignis.', 'The curve shows the density; the hatched area belongs to the event.');
    return `${titel}. ${art} ${ereignis}`;
  });
  const markeBild = $derived(erg && !fehlerEreignis && (z.modus === 'quantil' ? erg.quantil && Number.isFinite(erg.quantil.x) : z.modus !== 'zwischen') ? { x: z.modus === 'quantil' ? erg.quantil!.x : x, text: `x = ${k(z.modus === 'quantil' ? erg.quantil!.x : x)}` } : null);

  const zWert = $derived(num(z.zText));
  /** Befehle in Excel, TI-84, SPSS, R (nur mit den Schaltern „Vergleich mit anderen Programmen“) */
  const bz = $derived(s.einst.bezuege ?? {});
  const bezug = $derived(v && !fehlerEreignis && (bz.excel || bz.ti84 || bz.spss || bz.r || bz.geogebra) ? verteilungBezug(v, z.modus, x, a, b, q, s.einst.sprache === 'de') : null);
  const bezugNamen = $derived([bz.excel ? 'Excel' : '', bz.ti84 ? 'TI-84' : '', bz.spss ? 'SPSS' : '', bz.r ? 'R' : '', bz.geogebra ? 'GeoGebra' : ''].filter(Boolean).join(', '));
</script>

<div class="vst-raster">
  <div class="vst-links">
    <fieldset class="vst-gruppe"><legend>{L('1  Welche Verteilung?', '1  Which distribution?')}</legend>
      <div class="segment" role="radiogroup" aria-label={L('Verteilung', 'Distribution')}>
        <label><input type="radio" name="vv-art" checked={z.art === 'normal'} onchange={() => waehleArt('normal')}>{L('Normal', 'Normal')}</label>
        <label><input type="radio" name="vv-art" checked={z.art === 't'} onchange={() => waehleArt('t')}>t</label>
        <label><input type="radio" name="vv-art" checked={z.art === 'chi2'} onchange={() => waehleArt('chi2')}>χ²</label>
        <label><input type="radio" name="vv-art" checked={z.art === 'f'} onchange={() => waehleArt('f')}>F</label>
        <label><input type="radio" name="vv-art" checked={z.art === 'binom'} onchange={() => waehleArt('binom')}>{L('Binomial', 'Binomial')}</label>
        <label><input type="radio" name="vv-art" checked={z.art === 'poisson'} onchange={() => waehleArt('poisson')}>Poisson</label>
        <label><input type="radio" name="vv-art" checked={z.art === 'hyper'} onchange={() => waehleArt('hyper')}>{L('Hypergeometrisch', 'Hypergeometric')}</label>
        <label><input type="radio" name="vv-art" checked={z.art === 'eigen'} onchange={() => waehleArt('eigen')}>{L('Eigene Tabelle', 'Own table')}</label>
      </div>
      {#if z.art === 'normal'}
        <div class="vst-paar">
          <div class="eingabe"><label for="vv-mu">{L('Mittelwert μ', 'Mean μ')}</label><input id="vv-mu" type="text" inputmode="decimal" autocomplete="off" bind:value={z.mu}></div>
          <div class="eingabe"><label for="vv-sigma">{L('Standardabweichung σ', 'Standard deviation σ')}</label><input id="vv-sigma" type="text" inputmode="decimal" autocomplete="off" bind:value={z.sigma}></div>
        </div>
        <div><button class="k klein" type="button" onclick={standardnormal}>{L('Standardnormalverteilung (z)', 'Standard normal distribution (z)')}</button></div>
      {:else if z.art === 't' || z.art === 'chi2'}
        <div class="eingabe"><label for="vv-df">{L('Freiheitsgrade (df)', 'Degrees of freedom (df)')}</label><input id="vv-df" type="text" inputmode="decimal" autocomplete="off" bind:value={z.df} style="max-width:10ch"></div>
      {:else if z.art === 'f'}
        <div class="vst-paar">
          <div class="eingabe"><label for="vv-d1">{L('Zähler-Freiheitsgrade (df₁)', 'Numerator degrees of freedom (df₁)')}</label><input id="vv-d1" type="text" inputmode="decimal" autocomplete="off" bind:value={z.d1}></div>
          <div class="eingabe"><label for="vv-d2">{L('Nenner-Freiheitsgrade (df₂)', 'Denominator degrees of freedom (df₂)')}</label><input id="vv-d2" type="text" inputmode="decimal" autocomplete="off" bind:value={z.d2}></div>
        </div>
      {:else if z.art === 'binom'}
        <div class="vst-paar">
          <div class="eingabe"><label for="vv-n">{L('Anzahl der Versuche n', 'Number of trials n')}</label><input id="vv-n" type="text" inputmode="numeric" autocomplete="off" bind:value={z.n}></div>
          <div class="eingabe"><label for="vv-p">{L('Trefferwahrscheinlichkeit p', 'Probability of a hit p')}</label><input id="vv-p" type="text" inputmode="decimal" autocomplete="off" bind:value={z.p}></div>
        </div>
        <span class="hilfe">{L('X zählt die Treffer in n Versuchen, die voneinander unabhängig sind und jedes Mal dieselbe Trefferwahrscheinlichkeit p haben.', 'X counts the hits in n trials that are independent of each other and each have the same probability p of a hit.')}</span>
      {:else if z.art === 'poisson'}
        <div class="eingabe"><label for="vv-l">{L('Erwartungswert λ', 'Mean λ')}</label><input id="vv-l" type="text" inputmode="decimal" autocomplete="off" bind:value={z.lambda} style="max-width:12ch"></div>
        <span class="hilfe">{L('X zählt seltene Ereignisse in einem festen Zeitraum oder Raum; im Mittel λ. X kann jede ganze Zahl ab 0 sein, auch sehr große mit sehr kleiner Wahrscheinlichkeit.', 'X counts rare events in a fixed period or area; on average λ. X can be any whole number from 0, even very large ones with very small probability.')}</span>
      {:else if z.art === 'hyper'}
        <div class="vst-paar">
          <div class="eingabe"><label for="vv-hn">{L('N - Elemente insgesamt', 'N - elements in total')}</label><input id="vv-hn" type="text" inputmode="numeric" autocomplete="off" bind:value={z.N}></div>
          <div class="eingabe"><label for="vv-hk">{L('K - davon „Treffer“', 'K - of them “hits”')}</label><input id="vv-hk" type="text" inputmode="numeric" autocomplete="off" bind:value={z.K}></div>
          <div class="eingabe"><label for="vv-hz">{L('n - gezogen (ohne Zurücklegen)', 'n - drawn (without replacement)')}</label><input id="vv-hz" type="text" inputmode="numeric" autocomplete="off" bind:value={z.nz}></div>
        </div>
        <span class="hilfe">{L('X zählt die Treffer unter den n gezogenen Elementen. Beispiel Lotto „6 aus 49“: N = 49, K = 6, n = 6.', 'X counts the hits among the n drawn elements. Example lottery “6 of 49”: N = 49, K = 6, n = 6.')}</span>
      {:else}
        <div class="vst-rollt"><table class="vst-tabelle"><caption class="nur-vorleser">{L('Eigene Verteilung: Werte x und ihre Wahrscheinlichkeiten P(x)', 'Custom distribution: values x and their probabilities P(x)')}</caption>
          <thead><tr><th scope="col">x</th><th scope="col">P(x)</th><th scope="col"><span class="nur-vorleser">{L('Zeile entfernen', 'Remove row')}</span></th></tr></thead>
          <tbody>{#each z.zeilen as r, i}
            <tr><td><input type="text" inputmode="decimal" autocomplete="off" aria-label={L(`Wert x in Zeile ${i + 1}`, `Value x in row ${i + 1}`)} bind:value={r.x} oninput={() => (z.summeBestaetigt = false)}></td>
              <td><input type="text" inputmode="decimal" autocomplete="off" aria-label={L(`Wahrscheinlichkeit in Zeile ${i + 1}`, `Probability in row ${i + 1}`)} bind:value={r.p} oninput={() => (z.summeBestaetigt = false)}></td>
              <td>{#if z.zeilen.length > 2}<button class="k leise nur-symbol" type="button" aria-label={L(`Zeile ${i + 1} entfernen`, `Remove row ${i + 1}`)} onclick={() => zeileWeg(i)}><Icon n="x" /></button>{/if}</td></tr>
          {/each}</tbody></table></div>
        <div><button class="k leise" type="button" onclick={zeileMehr}><Icon n="plus" />{L('Weitere Zeile', 'Another row')}</button></div>
        <span class="hilfe">{L('Dezimalzahl oder Bruch eingeben, zum Beispiel 0,25 oder 1/6.', 'Enter a decimal number or a fraction, for example 0.25 or 1/6.')}</span>
      {/if}
    </fieldset>

    <fieldset class="vst-gruppe"><legend>{d('2  Was willst du wissen?', '2  Was wollen Sie wissen?', '2  What do you want to know?')}</legend>
      <div class="vst-wahl" role="radiogroup" aria-label={L('Art der Frage', 'Type of question')}>
        <label><input type="radio" name="vv-modus" value="links" bind:group={z.modus} onchange={() => (zuletzt = 'modus')}><span>{woerter.links} <span class="zeichen">(≤)</span></span></label>
        <label><input type="radio" name="vv-modus" value="linksStreng" bind:group={z.modus} onchange={() => (zuletzt = 'modus')}><span>{woerter.linksStreng} <span class="zeichen">(&lt;)</span></span></label>
        <label><input type="radio" name="vv-modus" value="rechts" bind:group={z.modus} onchange={() => (zuletzt = 'modus')}><span>{woerter.rechts} <span class="zeichen">(≥)</span></span></label>
        <label><input type="radio" name="vv-modus" value="rechtsStreng" bind:group={z.modus} onchange={() => (zuletzt = 'modus')}><span>{woerter.rechtsStreng} <span class="zeichen">(&gt;)</span></span></label>
        <label><input type="radio" name="vv-modus" value="zwischen" bind:group={z.modus} onchange={() => (zuletzt = 'modus')}><span>{woerter.zwischen} <span class="zeichen">(a ≤ X ≤ b)</span></span></label>
        <label><input type="radio" name="vv-modus" value="quantil" bind:group={z.modus} onchange={() => (zuletzt = 'modus')}><span>{L('Wert zu einer Wahrscheinlichkeit', 'Value for a probability')} <span class="zeichen">({L('Quantil', 'quantile')})</span></span></label>
      </div>
      {#if z.modus === 'quantil'}
        <div class="eingabe"><label for="vv-q">{L('Wahrscheinlichkeit p (zwischen 0 und 1)', 'Probability p (between 0 and 1)')}</label><input id="vv-q" type="text" inputmode="decimal" autocomplete="off" bind:value={z.q} aria-invalid={fehlerEreignis ? 'true' : undefined} aria-describedby={(fehlerEreignis) ? 'vv-fehler' : undefined} style="max-width:12ch"></div>
      {:else if z.modus === 'zwischen'}
        <div class="vst-paar">
          <div class="eingabe"><label for="vv-a">{L('von a (eingeschlossen)', 'from a (included)')}</label><input id="vv-a" type="text" inputmode="decimal" autocomplete="off" bind:value={z.a} aria-invalid={fehlerEreignis ? 'true' : undefined} aria-describedby={(fehlerEreignis) ? 'vv-fehler' : undefined}></div>
          <div class="eingabe"><label for="vv-b">{L('bis b (eingeschlossen)', 'to b (included)')}</label><input id="vv-b" type="text" inputmode="decimal" autocomplete="off" bind:value={z.b} aria-invalid={fehlerEreignis ? 'true' : undefined} aria-describedby={(fehlerEreignis) ? 'vv-fehler' : undefined}></div>
        </div>
      {:else}
        <div class="eingabe"><label for="vv-x">{L('Grenze x', 'Limit x')}</label><input id="vv-x" type="text" inputmode="decimal" autocomplete="off" bind:value={z.x} aria-invalid={fehlerEreignis ? 'true' : undefined} aria-describedby={(fehlerEreignis) ? 'vv-fehler' : undefined} style="max-width:12ch"></div>
      {/if}
      {#if v && !fehlerEreignis}
        <span class="hilfe">{diskret
          ? L('Hier ist die Wahrscheinlichkeit für „höchstens“ nicht dieselbe wie für „weniger als“: der Wert x selbst hat eine eigene Wahrscheinlichkeit. Das ist der häufigste Schulfehler.', 'Here the probability of “at most” is not the same as for “less than”: the value x itself has its own probability. This is the most common school mistake.')
          : L('Bei dieser stetigen Verteilung haben einzelne Werte die Wahrscheinlichkeit 0: „höchstens“ und „weniger als“ sind gleich, „mindestens“ und „mehr als“ ebenso.', 'For this continuous distribution single values have probability 0: “at most” and “less than” are the same, and so are “at least” and “more than”.')}</span>
      {/if}
      {#if nichtGanz}<span class="hilfe">{L('X zählt ganze Zahlen. Ein Wert mit Nachkommastellen wird so gelesen: „höchstens 5,5“ heißt „höchstens 5“, „mindestens 5,5“ heißt „mindestens 6“.', 'X counts whole numbers. A value with decimals is read like this: “at most 5.5” means “at most 5”, “at least 5.5” means “at least 6”.')}</span>{/if}
    </fieldset>

    {#if v && v.art === 'normal'}
      <fieldset class="vst-gruppe"><legend>{L('z-Wert und Wert x', 'z-score and value x')}</legend>
        <p class="hilfe">{L(`z sagt, wie viele Standardabweichungen ein Wert vom Mittelwert entfernt ist: z = (x − μ) / σ.`, `z says how many standard deviations a value is from the mean: z = (x − μ) / σ.`)}</p>
        {#if z.modus !== 'zwischen' && z.modus !== 'quantil' && Number.isFinite(x)}<p>{L(`x = ${k(x)} entspricht z = ${k(zuZ(x, v.mu, v.sigma))}.`, `x = ${k(x)} corresponds to z = ${k(zuZ(x, v.mu, v.sigma))}.`)}</p>{/if}
        {#if z.modus === 'zwischen' && Number.isFinite(a) && Number.isFinite(b)}<p>{L(`a = ${k(a)} entspricht z = ${k(zuZ(a, v.mu, v.sigma))}, b = ${k(b)} entspricht z = ${k(zuZ(b, v.mu, v.sigma))}.`, `a = ${k(a)} corresponds to z = ${k(zuZ(a, v.mu, v.sigma))}, b = ${k(b)} corresponds to z = ${k(zuZ(b, v.mu, v.sigma))}.`)}</p>{/if}
        <div class="eingabe"><label for="vv-z">{L('Umrechnen: z-Wert eingeben', 'Convert: enter a z-score')}</label><input id="vv-z" type="text" inputmode="decimal" autocomplete="off" bind:value={z.zText} style="max-width:12ch"></div>
        {#if Number.isFinite(zWert)}<p>{L(`z = ${k(zWert)} entspricht x = ${k(vonZ(zWert, v.mu, v.sigma))}.`, `z = ${k(zWert)} corresponds to x = ${k(vonZ(zWert, v.mu, v.sigma))}.`)}</p>{/if}
      </fieldset>
    {/if}

    {#if v && v.art === 'binom'}
      <fieldset class="vst-gruppe"><legend>{L('Normalnäherung der Binomialverteilung', 'Normal approximation of the binomial distribution')}</legend>
        <label data-begriff="normalnaeherung" class="vst-schalter"><input type="checkbox" bind:checked={z.naeherung}><span>{L('Normalverteilung darüberlegen und P(a ≤ X ≤ b) vergleichen', 'Overlay the normal distribution and compare P(a ≤ X ≤ b)')}</span></label>
        {#if z.naeherung}
          <div class="vst-paar">
            <div class="eingabe"><label for="vv-na">{L('von a', 'from a')}</label><input id="vv-na" type="text" inputmode="numeric" autocomplete="off" bind:value={z.na} placeholder={nae && !nae.fehler ? String(nae.na) : ''}></div>
            <div class="eingabe"><label for="vv-nb">{L('bis b', 'to b')}</label><input id="vv-nb" type="text" inputmode="numeric" autocomplete="off" bind:value={z.nb} placeholder={nae && !nae.fehler ? String(nae.nb) : ''}></div>
          </div>
          <div class="segment" role="radiogroup" aria-label={L('Stetigkeitskorrektur', 'Continuity correction')}>
            <label data-begriff="stetigkeitskorrektur"><input type="radio" name="vv-korr" checked={z.korrektur} onchange={() => (z.korrektur = true)}>{L('mit Stetigkeitskorrektur (±½)', 'with continuity correction (±½)')}</label>
            <label data-begriff="stetigkeitskorrektur"><input type="radio" name="vv-korr" checked={!z.korrektur} onchange={() => (z.korrektur = false)}>{L('ohne Stetigkeitskorrektur', 'without continuity correction')}</label>
          </div>
          <span class="hilfe">{L('Die Stetigkeitskorrektur rechnet bei der stetigen Kurve mit der ganzen Säule, also von a − ½ bis b + ½. Sie ist genauer; manche Schulen rechnen ohne.', 'The continuity correction uses the whole bar under the continuous curve, so from a − ½ to b + ½. It is more accurate; some schools calculate without it.')}</span>
        {/if}
      </fieldset>
    {/if}
  </div>

  <div class="vst-rechts">
    {#if fehlerVerteilung || fehlerEreignis}
      <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="vv-fehler">{fehlerVerteilung || fehlerEreignis}</p></div>
    {:else if v && erg && mo}
      <section class="vst-ergebnis" aria-labelledby="vv-erg-t"><h2 id="vv-erg-t">{titel}</h2>
        {#if erg.quantil}
          <p class="vst-gross" use:ergebnisAnsage><span class="zahl">x = {k(erg.quantil.x)}</span></p>
          <p class="vst-zeile">{satz}</p>
        {:else}
          <p class="vst-gross" use:ergebnisAnsage><span class="zahl">{formel} = {ps}</span> <span class="einheit">= {pz}</span></p>
          <p class="vst-zeile">{satz}</p>
        {/if}
      </section>

      {#if bezug}
        <details class="auf"><summary>{L('So geht es in', 'How to do it in')} {bezugNamen}</summary>
          {#if bz.excel && bezug.excel.length}<h4>Excel</h4><ul class="heft-text">{#each bezug.excel as zl, i (i)}<li><code>{zl}</code></li>{/each}</ul>{/if}
          {#if bz.ti84}<h4>TI-84</h4>{#if bezug.ti.length}<ul class="heft-text">{#each bezug.ti as zl, i (i)}<li><code>{zl}</code></li>{/each}</ul>{/if}
            {#if bezug.hinweise.includes('ti-kein-quantil')}<p class="heft-text">{L('Für diese Verteilung hat der TI-84 keine Umkehrfunktion; der Wert lässt sich nur in einer Tabelle nachschlagen oder mit Probieren finden.', 'For this distribution the TI-84 has no inverse function; the value can only be looked up in a table or found by trial.')}</p>{/if}
            {#if bezug.hinweise.includes('ti-keine-verteilung')}<p class="heft-text">{L('Für diese Verteilung hat der TI-84 keinen eigenen Befehl.', 'For this distribution the TI-84 has no command of its own.')}</p>{/if}{/if}
          {#if bz.spss && bezug.spss.length}<h4>SPSS</h4><ul class="heft-text">{#each bezug.spss as zl, i (i)}<li><code>{zl}</code></li>{/each}</ul>{/if}
          {#if bz.r && bezug.r.length}<h4>R</h4><ul class="heft-text">{#each bezug.r as zl, i (i)}<li><code>{zl}</code></li>{/each}</ul>{/if}
          {#if bz.geogebra && bezug.geogebra.length}<h4>GeoGebra</h4><ul class="heft-text">{#each bezug.geogebra as zl, i (i)}<li><code>{zl}</code></li>{/each}</ul>{/if}
          <p class="heft-text" style="color:var(--tinte-2)">{L('Namen und Menüs hängen von der Version und der Sprache des Programms ab; hier stehen sie passend zur Sprache von Statable. Kleine Abweichungen in der letzten Stelle kommen vom Runden.', 'Names and menus depend on the version and the language of the program; here they match the language of Statable. Small differences in the last digit come from rounding.')}</p>
        </details>
      {/if}

      <section class="vst-bild" aria-labelledby="vv-bild-t"><h2 id="vv-bild-t" class="nur-vorleser">{L('Bild', 'Picture')}</h2>
        {#if bildStetig}
          <VerstehenBild titel={titel} unterzeile={L('Kurve: Dichte. Schraffiert: das Ereignis.', 'Curve: density. Hatched: the event.')} beschreibung={bildBeschreibung} xText="X" yText={dichteTitel} stetig={bildStetig} marke={markeBild} />
        {:else if bildDiskret}
          <VerstehenBild titel={titel} unterzeile={naeherungKurve ? L('Säulen: P(X = k). Schraffiert: das Ereignis. Linie: Normalkurve.', 'Bars: P(X = k). Hatched: the event. Line: normal curve.') : L('Säulen: P(X = k). Schraffiert: das Ereignis.', 'Bars: P(X = k). Hatched: the event.')} beschreibung={bildBeschreibung} xText="X" yText={dichteTitel}
            saeulen={{ punkte: bildDiskret.punkte, lo: bildDiskret.lo, hi: bildDiskret.hi }} breite={bildDiskret.breite} marke={markeBild} ueberlagerung={naeherungKurve} />
        {/if}
        <div class="vst-legende"><span><i></i>{L('gehört zum Ereignis', 'belongs to the event')}</span>{#if bildDiskret}<span><i class="grau"></i>{L('übrige Werte', 'other values')}</span>{/if}</div>
        {#if bildDiskret?.ausserhalb && bildDiskret.bereich}
          <p class="vst-zeile klein">{L(`Das Bild zeigt nur X von ${ganzZahl(bildDiskret.bereich[0])} bis ${ganzZahl(bildDiskret.bereich[1])} (Mittelwert ± 4 Standardabweichungen). Außerhalb liegen zusammen ${wahrscheinlichkeit(bildDiskret.ausserhalb)} der Wahrscheinlichkeit - die Zahlen oben rechnen mit allen Werten.`, `The picture shows only X from ${ganzZahl(bildDiskret.bereich[0])} to ${ganzZahl(bildDiskret.bereich[1])} (mean ± 4 standard deviations). Outside lie ${wahrscheinlichkeit(bildDiskret.ausserhalb)} of the probability together - the numbers above use all values.`)}</p>
        {/if}
      </section>

      {#if vier.length}
        <section class="vst-block" aria-labelledby="vv-vier-t"><h2 id="vv-vier-t">{L(`Alle vier auf einen Blick (x = ${k(x)})`, `All four at a glance (x = ${k(x)})`)}</h2>
          <table class="vst-tabelle"><thead><tr><th scope="col">{L('Frage', 'Question')}</th><th scope="col">{L('Zeichen', 'Symbol')}</th><th scope="col" class="zahl-sp">{L('Wahrscheinlichkeit', 'Probability')}</th></tr></thead>
            <tbody>{#each vier as r}<tr class:an={r.an}><th scope="row">{r.w}</th><td>{r.zeichen}</td><td class="zahl-sp">{wahrscheinlichkeit(r.p, r.p === 0 && ereignisImTraeger(v!, r.m, x), r.rest)} · {prozent(r.p, r.p === 0 && ereignisImTraeger(v!, r.m, x))}</td></tr>{/each}</tbody></table>
        </section>
      {/if}

      <section class="vst-block" aria-labelledby="vv-mom-t"><h2 id="vv-mom-t">{L('Erwartungswert und Streuung', 'Mean and spread')}</h2>
        <ul style="padding-inline-start:1.2em">
          <li>{mo.mittel === null
            ? (v.art === 't' ? L('Erwartungswert μ: existiert nicht (bei df ≤ 1 gibt es keinen).', 'Mean μ: does not exist (there is none for df ≤ 1).') : L('Erwartungswert μ: existiert nicht (bei df₂ ≤ 2 gibt es keinen).', 'Mean μ: does not exist (there is none for df₂ ≤ 2).'))
            : L(`Erwartungswert μ = ${k(mo.mittel)}`, `Mean μ = ${k(mo.mittel)}`)}</li>
          <li>{mo.varianz === null
            ? (v.art === 't' ? L('Varianz σ² und Standardabweichung σ: existieren nicht (bei df ≤ 2 ist die Varianz unendlich).', 'Variance σ² and standard deviation σ: do not exist (for df ≤ 2 the variance is infinite).') : L('Varianz σ² und Standardabweichung σ: existieren nicht (bei df₂ ≤ 4 ist die Varianz unendlich).', 'Variance σ² and standard deviation σ: do not exist (for df₂ ≤ 4 the variance is infinite).'))
            : L(`Varianz σ² = ${k(mo.varianz)}, Standardabweichung σ = ${k(mo.sigma!)}`, `Variance σ² = ${k(mo.varianz)}, standard deviation σ = ${k(mo.sigma!)}`)}</li>
        </ul>
        {#if eigen}<p class="vst-zeile klein">{L('Der Erwartungswert E(X) = Σ x · P(x) ist der Mittelwert auf lange Sicht - nicht der häufigste Wert und oft gar kein möglicher Wert (beim Würfel 3,5).', 'The expected value E(X) = Σ x · P(x) is the long-run mean - not the most frequent value and often not even a possible value (3.5 for a die).')}</p>{/if}
      </section>

      {#if eigen && !eigen.summeOk && !z.summeBestaetigt}
        <div class="banner" use:ergebnisAnsage={{ satz: 'p' }}><Icon n="hinweis" />
          <div><p>{d(`Die Summe der Wahrscheinlichkeiten ist ${k(eigen.summe)}, nicht 1. Rechnest du mit gerundeten Werten? Statable rechnet mit den eingegebenen Zahlen weiter und ändert nichts von selbst.`, `Die Summe der Wahrscheinlichkeiten ist ${k(eigen.summe)}, nicht 1. Rechnen Sie mit gerundeten Werten? Statable rechnet mit den eingegebenen Zahlen weiter und ändert nichts von selbst.`, `The probabilities add up to ${k(eigen.summe)}, not 1. Are you using rounded values? Statable keeps calculating with the numbers you entered and changes nothing by itself.`)}</p>
            <p style="display:flex;gap:var(--a2);flex-wrap:wrap;margin-top:var(--a2)"><button class="k" type="button" onclick={aufEinsSetzen}>{L('Auf 1 setzen', 'Scale to 1')}</button><button class="k" type="button" onclick={() => (z.summeBestaetigt = true)}>{L('So lassen', 'Keep as is')}</button></p></div></div>
      {/if}

      {#if nae}
        <section class="vst-block" aria-labelledby="vv-nae-t"><h2 id="vv-nae-t">{L('Normalnäherung', 'Normal approximation')}</h2>
          {#if nae.fehler}<p>{nae.fehler}</p>
          {:else if nae.r}
            <p class="vst-ampel" class:gut={nae.r.laplace} class:grob={!nae.r.laplace}><b aria-hidden="true">{nae.r.laplace ? '✓' : '!'}</b><span>{nae.r.laplace
              ? L(`Laplace-Bedingung erfüllt: σ = ${k(nae.r.sigma)} ist größer als 3, die Normalnäherung ist brauchbar.`, `Laplace condition met: σ = ${k(nae.r.sigma)} is greater than 3, the normal approximation is usable.`)
              : L(`Laplace-Bedingung nicht erfüllt: σ = ${k(nae.r.sigma)} ist nicht größer als 3, die Näherung ist grob.`, `Laplace condition not met: σ = ${k(nae.r.sigma)} is not greater than 3, the approximation is rough.`)}</span></p>
            <table class="vst-tabelle"><caption class="nur-vorleser">{L(`P(${nae.na} ≤ X ≤ ${nae.nb}) exakt und genähert`, `P(${nae.na} ≤ X ≤ ${nae.nb}) exact and approximated`)}</caption>
              <thead><tr><th scope="col">P({nae.na} ≤ X ≤ {nae.nb})</th><th scope="col" class="zahl-sp">{L('Wert', 'Value')}</th></tr></thead>
              <tbody>
                <tr><th scope="row">{L('exakt (Binomialverteilung)', 'exact (binomial distribution)')}</th><td class="zahl-sp">{wahrscheinlichkeit(nae.r.exakt)}</td></tr>
                <tr class:an={!z.korrektur}><th scope="row">{L('Näherung ohne Stetigkeitskorrektur', 'approximation without continuity correction')}</th><td class="zahl-sp">{wahrscheinlichkeit(nae.r.ohneKorrektur)}</td></tr>
                <tr class:an={z.korrektur}><th scope="row">{L('Näherung mit Stetigkeitskorrektur', 'approximation with continuity correction')}</th><td class="zahl-sp">{wahrscheinlichkeit(nae.r.mitKorrektur)}</td></tr>
              </tbody></table>
            <p class="vst-zeile">{naeherungSatz}</p>
            <h3 style="font:650 var(--gr-h3, 1rem)/1.3 var(--schrift-ui);margin-top:var(--a3)">{L('Sigma-Regeln', 'Sigma rules')}</h3>
            <div class="vst-rollt"><table class="vst-tabelle"><caption class="nur-vorleser">{L('Sigma-Regeln: Näherung mit der Normalverteilung neben der exakten Binomialwahrscheinlichkeit', 'Sigma rules: normal approximation next to the exact binomial probability')}</caption>
              <thead><tr><th scope="col">{L('Umgebung von μ', 'Neighbourhood of μ')}</th><th scope="col">{L('ganze Zahlen', 'whole numbers')}</th><th scope="col" class="zahl-sp">{L('Näherung', 'Approx.')}</th><th scope="col" class="zahl-sp">{L('exakt', 'exact')}</th></tr></thead>
              <tbody>{#each nae.sigma ?? [] as r}
                <tr><th scope="row">{zahlDe(r.k, 2)}σ{r.kExakt !== null ? ` (${L('exakt', 'exact')} ${zahlDe(r.kExakt, 4)})` : ''}</th><td>{r.von} … {r.bis}</td><td class="zahl-sp">{prozent(r.naeherung)}</td><td class="zahl-sp">{prozent(r.exakt)}</td></tr>
              {/each}</tbody></table></div>
            <p class="vst-zeile klein">{L('Die Schulwerte 1,64 / 1,96 / 2,58 sind gerundet. Genau sind es 1,6449 / 1,9600 / 2,5758. Die Spalte „Näherung“ rechnet mit den Schulwerten, daher steht dort „90 %“ nur ungefähr (89,90 %); „≈ 90 %“ bleibt die Schulbezeichnung. „Exakt“ ist die Binomialwahrscheinlichkeit der ganzzahligen Randwerte.', 'The school values 1.64 / 1.96 / 2.58 are rounded. The exact values are 1.6449 / 1.9600 / 2.5758. The “Approx.” column uses the school values, so “90 %” is only approximate (89.90 %); “≈ 90 %” remains the school name. “Exact” is the binomial probability of the whole-number limits.')}</p>
          {/if}
        </section>
      {/if}
    {/if}
  </div>
</div>
