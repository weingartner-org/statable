// Häppchen-Rechner (Versuch, Große Daten 31.10.): liest CSV-Bytes in beliebig großen Stücken, hält KEINE Zeilen im Speicher.
// Ein Durchlauf: Anzahl, Mittelwerte, Varianzen, Häufigkeiten der Gruppenspalte, Korrelationsmatrix, lineare Regression.
// Stabil: je Stapel von Zeilen wird zentriert gerechnet und mit Chan et al. zusammengeführt (keine Summen großer Quadrate).
// Grenzen des Versuchs: Trenner Komma, keine Anführungszeichen, Dezimalpunkt, Zeilenende \n oder \r\n, UTF-8.
const POT = Array.from({ length: 23 }, (_, i) => 10 ** i);
const DEC = new TextDecoder('utf-8');

export class Rechner {
  /** opt: { gruppe: 'g', y: 'y', aus: ['id'], stapel: 2048 } */
  constructor(opt = {}) {
    this.opt = { gruppe: 'g', y: 'y', aus: ['id'], stapel: 2048, ...opt };
    this.kopf = null; this.rest = new Uint8Array(0); this.byteZahl = 0;
    this.zeilen = 0; this.ungueltig = 0; this.zeilenGesamt = 0; this.langsam = 0;
    this.gruppen = new Map(); this.gruppenNamen = new Map();
  }
  _planen(zeile) {
    const namen = DEC.decode(zeile).replace(/\r$/, '').split(',');
    this.kopf = namen;
    const o = this.opt, xs = [];
    this.rolle = new Int32Array(namen.length);          // -1 überspringen, -2 Gruppe, sonst Spalte im Vektor
    namen.forEach((n, i) => { this.rolle[i] = -1; if (n === o.gruppe) this.rolle[i] = -2; else if (o.aus.includes(n) || n === o.y) { /* weg */ } else xs.push(i); });
    xs.forEach((i, j) => { this.rolle[i] = j; });
    const yi = namen.indexOf(o.y);
    if (yi < 0) throw new Error('Zielspalte fehlt: ' + o.y);
    this.rolle[yi] = xs.length;
    this.xNamen = xs.map(i => namen[i]); this.k = xs.length + 1;
    this.alle = [...this.xNamen, o.y];
    this.puffer = new Float64Array(o.stapel * this.k); this.pn = 0;
    this.n = 0; this.mw = new Float64Array(this.k); this.M = new Float64Array(this.k * this.k);
    this.vec = new Float64Array(this.k); this.cb = new Float64Array(this.k * this.k); this.mb = new Float64Array(this.k);
    this.grpCode = 0;
  }
  /** Ein Stück Bytes. Ein Stück darf mitten in einer Zeile enden. Das Stück wird NICHT behalten. */
  schiebe(u8) {
    this.byteZahl += u8.length;
    let start = 0;
    if (this.rest.length) {   // angefangene Zeile mit dem Anfang des neuen Stücks zu Ende bringen
      let nl = u8.indexOf(10);
      if (nl < 0) { const neu = new Uint8Array(this.rest.length + u8.length); neu.set(this.rest); neu.set(u8, this.rest.length); this.rest = neu; return; }
      const z = new Uint8Array(this.rest.length + nl + 1); z.set(this.rest); z.set(u8.subarray(0, nl + 1), this.rest.length);
      this.rest = new Uint8Array(0); start = nl + 1;
      this._bytes(z, 0, z.length);
    }
    let ende = u8.length;                                     // bis zum letzten Zeilenende
    while (ende > start && u8[ende - 1] !== 10) ende--;
    if (ende > start) this._bytes(u8, start, ende);
    if (ende < u8.length) this.rest = new Uint8Array(u8.subarray(ende));           // Rest kopieren (klein), damit das große Stück frei wird
  }
  _bytes(b, von, bis) {
    let i = von;
    if (!this.kopf) { const nl = b.indexOf(10, i); this._planen(b.subarray(i, nl)); i = nl + 1; }
    const rolle = this.rolle, vec = this.vec, k = this.k, nf = rolle.length, y = k - 1;
    while (i < bis) {
      let f = 0, ok = true, m = 0, d = 0, neg = false, punkt = false, ziffern = 0, fs = i, spez = false, code = 0;
      this.zeilenGesamt++;
      for (; ; i++) {
        const c = b[i];
        if (c === 44 || c === 10) {                            // Feldende
          const r = f < nf ? rolle[f] : -1;
          if (r >= 0) {
            if (spez) { const s = DEC.decode(b.subarray(fs, i)).replace(/\r$/, ''); const v = s === '' ? NaN : Number(s); if (Number.isNaN(v)) ok = false; else vec[r] = v; this.langsam++; }
            else if (ziffern === 0) ok = false;
            else vec[r] = (neg ? -m : m) / (d < 23 ? POT[d] : 10 ** d);
          } else if (r === -2) { /* code schon gesammelt */ if (code === 0) ok = false; this.grpCode = code; }
          if (c === 10) { i++; break; }
          f++; m = 0; d = 0; neg = false; punkt = false; ziffern = 0; fs = i + 1; spez = false; code = 0;
        } else if (c >= 48 && c <= 57) {
          if (ziffern < 15) { m = m * 10 + (c - 48); ziffern++; if (punkt) d++; } else spez = true;
          code = code * 256 + c;
        } else if (c === 46 && !punkt) punkt = true;
        else if (c === 45 && ziffern === 0 && !neg) neg = true;
        else if (c === 13) { /* \r vor \n */ }
        else { spez = true; code = (code * 256 + c) % 9007199254740881; }
      }
      if (f + 1 !== nf) ok = false;                            // falsche Feldzahl
      if (!ok) { this.ungueltig++; continue; }
      this.zeilen++;
      const gc = this.grpCode, g = this.gruppen.get(gc);
      if (g === undefined) { this.gruppen.set(gc, { n: 1, sy: vec[y] }); if (this.gruppen.size <= 10000) this._gruppenName(b, gc); }
      else { g.n++; g.sy += vec[y]; }
      this.puffer.set(vec, this.pn * k); this.pn++;
      if (this.pn === this.opt.stapel) this._leeren();
    }
  }
  _gruppenName(b, code) { /* Name aus dem Code zurückrechnen (nur Ziffern/Bytes bis 6 Zeichen sicher) */
    let s = '', c = code; while (c > 0) { s = String.fromCharCode(c % 256) + s; c = Math.floor(c / 256); } this.gruppenNamen.set(code, s);
  }
  _leeren() {
    const nb = this.pn; if (!nb) return;
    const k = this.k, P = this.puffer, mb = this.mb, cb = this.cb;
    mb.fill(0);
    for (let r = 0; r < nb; r++) { const o = r * k; for (let j = 0; j < k; j++) mb[j] += P[o + j]; }
    for (let j = 0; j < k; j++) mb[j] /= nb;
    cb.fill(0);
    for (let r = 0; r < nb; r++) {
      const o = r * k;
      for (let i = 0; i < k; i++) { const di = P[o + i] - mb[i], z = i * k; for (let j = i; j < k; j++) cb[z + j] += di * (P[o + j] - mb[j]); }
    }
    const n = this.n, M = this.M, mw = this.mw, t = n + nb, f = (n * nb) / t;
    for (let i = 0; i < k; i++) { const di = mb[i] - mw[i]; for (let j = i; j < k; j++) M[i * k + j] += cb[i * k + j] + f * di * (mb[j] - mw[j]); }
    for (let i = 0; i < k; i++) mw[i] += (mb[i] - mw[i]) * nb / t;
    this.n = t; this.pn = 0;
  }
  ende() {
    if (this.rest.length) { const z = new Uint8Array(this.rest.length + 1); z.set(this.rest); z[this.rest.length] = 10; this.rest = new Uint8Array(0); this._bytes(z, 0, z.length); }
    this._leeren();
    return this.ergebnis();
  }
  /** Zustand nach dem Lesen eines Bereichs (für mehrere Worker): alles, was zum Zusammenführen nötig ist. */
  zustand() {
    if (this.rest.length) { const z = new Uint8Array(this.rest.length + 1); z.set(this.rest); z[this.rest.length] = 10; this.rest = new Uint8Array(0); this._bytes(z, 0, z.length); }
    if (!this.kopf) return { leer: true, byteZahl: this.byteZahl };
    this._leeren();
    return { kopf: this.kopf, alle: this.alle, k: this.k, n: this.n, mw: Array.from(this.mw), M: Array.from(this.M), zeilen: this.zeilen, ungueltig: this.ungueltig, zeilenGesamt: this.zeilenGesamt, langsam: this.langsam, byteZahl: this.byteZahl, gruppen: [...this.gruppen.entries()], gruppenNamen: [...this.gruppenNamen.entries()] };
  }
  /** Zustände mehrerer Bereiche in Dateireihenfolge zu einem Ergebnis zusammenführen (Chan et al.: Mittel und zentrierte Streumatrix). */
  static zusammen(zustaende, opt = {}) {
    const zs = zustaende.filter(z => !z.leer);
    const r = new Rechner(opt);
    if (!zs.length) return { fehler: 'leer' };
    const k = zs[0].k;
    r.kopf = zs[0].kopf; r.alle = zs[0].alle; r.k = k; r.n = 0; r.mw = new Float64Array(k); r.M = new Float64Array(k * k);
    for (const z of zs) {
      const nb = z.n; if (nb === 0) continue;
      const n = r.n, t = n + nb, f = (n * nb) / t;
      if (n === 0) { r.mw.set(z.mw); r.M.set(z.M); }
      else {
        for (let i = 0; i < k; i++) { const di = z.mw[i] - r.mw[i]; for (let j = i; j < k; j++) r.M[i * k + j] += z.M[i * k + j] + f * di * (z.mw[j] - r.mw[j]); }
        for (let i = 0; i < k; i++) r.mw[i] += (z.mw[i] - r.mw[i]) * nb / t;
      }
      r.n = t;
      r.zeilen += z.zeilen; r.ungueltig += z.ungueltig; r.zeilenGesamt += z.zeilenGesamt; r.langsam += z.langsam; r.byteZahl += z.byteZahl;
      for (const [c, g] of z.gruppen) { const h = r.gruppen.get(c); if (h) { h.n += g.n; h.sy += g.sy; } else r.gruppen.set(c, { n: g.n, sy: g.sy }); }
      for (const [c, nm] of z.gruppenNamen) if (!r.gruppenNamen.has(c)) r.gruppenNamen.set(c, nm);
    }
    return r.ergebnis();
  }
  ergebnis() {
    if (!this.kopf) return { fehler: 'leer' };
    const k = this.k, n = this.n, M = this.M, S = (i, j) => (i <= j ? M[i * k + j] : M[j * k + i]);
    const out = { zeilen: this.zeilen, ungueltig: this.ungueltig, bytes: this.byteZahl, spalten: this.alle, langsamePfade: this.langsam };
    if (n < 2) return { ...out, fehler: 'zu wenig Zeilen' };
    out.mittel = Array.from(this.mw);
    out.varianz = Array.from({ length: k }, (_, i) => S(i, i) / (n - 1));
    out.sd = out.varianz.map(Math.sqrt);
    out.korr = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => S(i, j) / Math.sqrt(S(i, i) * S(j, j))));
    out.gruppen = [...this.gruppen.entries()].map(([c, g]) => ({ name: this.gruppenNamen.get(c) ?? String(c), n: g.n, mittelY: g.sy / g.n })).sort((a, b) => (a.name < b.name ? -1 : 1));
    out.regression = regression(S, k, n, this.alle);
    return out;
  }
}

/** Regression von y (letzte Spalte) auf die übrigen aus der zentrierten Streumatrix. Cholesky der Korrelationsmatrix (skaliert); VIF aus ihrer Inversen. */
export function regression(S, k, n, namen) {
  const p = k - 1, y = k - 1;
  const sd = Array.from({ length: k }, (_, i) => Math.sqrt(S(i, i)));
  const R = Array.from({ length: p }, (_, i) => Float64Array.from({ length: p }, (_, j) => S(i, j) / (sd[i] * sd[j])));
  const ry = Float64Array.from({ length: p }, (_, i) => S(i, y) / (sd[i] * sd[y]));
  const L = chol(R, p);
  const warn = [];
  if (!L.ok) return { fehler: 'Die Spalten sind linear abhängig (Cholesky bricht ab bei Spalte ' + namen[L.bei] + ').', warnung: ['Singulär: keine eindeutige Lösung.'] };
  const Rinv = invAusChol(L.L, p);
  const vif = Array.from({ length: p }, (_, i) => Rinv[i][i]);
  vif.forEach((v, i) => { if (v > 1000) warn.push(`Starke Kollinearität: ${namen[i]} (VIF ${v.toExponential(2)})`); else if (v > 10) warn.push(`Kollinearität: ${namen[i]} (VIF ${v.toFixed(1)})`); });
  const bz = solveChol(L.L, ry, p);                              // standardisierte Koeffizienten
  const b = bz.map((v, i) => v * sd[y] / sd[i]);
  let r2 = 0; for (let i = 0; i < p; i++) r2 += bz[i] * ry[i];
  const sse = S(y, y) * (1 - r2), df = n - p - 1, s2 = sse / df;
  const se = b.map((_, i) => Math.sqrt(s2 * Rinv[i][i] / S(i, i)));
  return { namen: namen.slice(0, p), koeff: b, se, t: b.map((v, i) => v / se[i]), r2, sigma: Math.sqrt(s2), df, vif, warnung: warn };
}
function chol(A, p) {
  const L = Array.from({ length: p }, () => new Float64Array(p));
  for (let i = 0; i < p; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j]; for (let t = 0; t < j; t++) s -= L[i][t] * L[j][t];
    if (i === j) { if (!(s > 1e-12)) return { ok: false, bei: i }; L[i][i] = Math.sqrt(s); } else L[i][j] = s / L[j][j];
  }
  return { ok: true, L };
}
function solveChol(L, b, p) {
  const z = new Float64Array(p); for (let i = 0; i < p; i++) { let s = b[i]; for (let t = 0; t < i; t++) s -= L[i][t] * z[t]; z[i] = s / L[i][i]; }
  const x = new Float64Array(p); for (let i = p - 1; i >= 0; i--) { let s = z[i]; for (let t = i + 1; t < p; t++) s -= L[t][i] * x[t]; x[i] = s / L[i][i]; }
  return Array.from(x);
}
function invAusChol(L, p) {
  const inv = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let c = 0; c < p; c++) { const e = new Float64Array(p); e[c] = 1; const x = solveChol(L, e, p); for (let r = 0; r < p; r++) inv[r][c] = x[r]; }
  return inv;
}
