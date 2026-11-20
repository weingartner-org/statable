/** Zeichnet das Diagramm eines Blatts unsichtbar und gibt es als PNG zurück - für Bericht (PDF, Word). */
import { istFehlend } from './fehlend';
import { mount, unmount, flushSync } from 'svelte';
import Gruppendiagramm from '../bausteine/Gruppendiagramm.svelte';
import type { Blatt } from './sitzung.svelte';
import type { ZweiGruppen } from './ergebnis';
import { dgGrund, dvMit } from './diagramm';
import Verteilungsdiagramm from '../bausteine/Verteilungsdiagramm.svelte';
import Qqdiagramm from '../bausteine/Qqdiagramm.svelte';
import Haeufigkeitsdiagramm from '../bausteine/Haeufigkeitsdiagramm.svelte';
import Kreuzdiagramm from '../bausteine/Kreuzdiagramm.svelte';
import Residuendiagramm from '../bausteine/Residuendiagramm.svelte';
import Screeplot from '../bausteine/Screeplot.svelte';
import { antwortSkala, restDaten, screeDaten, verteilungsDaten } from './diagrammquellen';
import type { Faktoren, Kreuz, Verteilung, Vorhersage, Zusammenhang } from './ergebnis';
import Streudiagramm from '../bausteine/Streudiagramm.svelte';
import { partialPunkte } from './partialkorrelation';
import { zahlenZeilenMitLuecken } from './diagrammquellen';
import { alsPng } from './bild';
import type { BildText } from './bildtext/typen';
import { waehleGestalt, wendeAn, haeufigGeordnet, kreuzGeordnet } from './gestalt';
import Zeitdiagramm from '../bausteine/Zeitdiagramm.svelte';
import type { Messwiederholung } from './messwiederholung';
import { mwNamen } from './mwsaetze';
import Mediationsdiagramm from '../bausteine/Mediationsdiagramm.svelte';
import Moderationsdiagramm from '../bausteine/Moderationsdiagramm.svelte';
import Interaktionsdiagramm from '../bausteine/Interaktionsdiagramm.svelte';
import type { Anova2E } from './anova2saetze';
import Raupendiagramm from '../bausteine/Raupendiagramm.svelte';
import type { Mehrebenen } from './mehrebenen';
import Forestplot from '../bausteine/Forestplot.svelte';
import Trichterdiagramm from '../bausteine/Trichterdiagramm.svelte';
import type { Meta } from './metaanalyse';
import type { Mediation } from './mediation';
import type { Moderation } from './moderation';
import Einzelfalldiagramm from '../bausteine/Einzelfalldiagramm.svelte';
import type { Einzelfall } from './einzelfall';
import Kaplandiagramm from '../bausteine/Kaplandiagramm.svelte';
import Sterbetafeldiagramm from '../bausteine/Sterbetafeldiagramm.svelte';
import Mehrfachdiagramm from '../bausteine/Mehrfachdiagramm.svelte';
import type { Mehrfach } from './mehrfach';
import type { Kaplan } from './ueberleben';
import Praepostdiagramm from '../bausteine/Praepostdiagramm.svelte';
import Quantildiagramm from '../bausteine/Quantildiagramm.svelte';   // Später S-E: Quantilregression und Strafregression im Bericht
import Kreuzvalidierungsdiagramm from '../bausteine/Kreuzvalidierungsdiagramm.svelte';
import Strafpfaddiagramm from '../bausteine/Strafpfaddiagramm.svelte';
import { katDaten } from './kategreg';
import { quantilDesign, type QuantilErgebnis } from './quantil';
import { pfadAuswahl, type StrafErgebnis } from './strafreg';
import { strafPfadName } from './strafregsaetze';
import Iccdiagramm from '../bausteine/Iccdiagramm.svelte';
import Blandaltmandiagramm from '../bausteine/Blandaltmandiagramm.svelte';
import { baPunkte } from './blandaltman';
import Rocdiagramm from '../bausteine/Rocdiagramm.svelte';
import { rocKurve } from './roc';
import { s, spalteNach, L } from './sitzung.svelte';
import Zeitreihendiagramm from '../bausteine/Zeitreihendiagramm.svelte';   // Später S-E: Zeitreihen und Clusteranalyse
import Korrelogramm from '../bausteine/Korrelogramm.svelte';
import Periodogrammdiagramm from '../bausteine/Periodogrammdiagramm.svelte';
import Zerlegungsdiagramm from '../bausteine/Zerlegungsdiagramm.svelte';
import Ellbogenbild from '../bausteine/Ellbogenbild.svelte';
import Dendrogramm from '../bausteine/Dendrogramm.svelte';
import Clusterprofil from '../bausteine/Clusterprofil.svelte';
import { zeitreiheAuswertung, type ZeitreiheE } from './zeitreiheblatt';
import { clusterGewaehlt, type ClusterE } from './clusterblatt';
import type { PraePost, IccErgebnis } from './ergebnis';

/** Ein gezeichnetes Diagramm: PNG und, wenn der Baustein es mitliefert (`BildBeschreibung`), sein Bildtext für Alternativtext und Beschreibung im Export. */
export type Png = Awaited<ReturnType<typeof alsPng>> & { text?: BildText };

/** Der Bildtext, den `BildBeschreibung` am Behälter trägt (JSON in `data-bildtext`); fehlt er, wenigstens der Kurztext am Bild (`aria-label`). */
export function bildTextVon(ort: Element, svg: Element): { text?: BildText } {
  try {
    const roh = ort.querySelector('[data-bildtext]')?.getAttribute('data-bildtext');
    if (roh) { const t = JSON.parse(roh) as BildText; if (t?.tabelle) return { text: { ...t, kurz: t.kurz || svg.getAttribute('aria-label') || '' } }; }
  } catch { /* kein lesbarer Bildtext: dann der Kurztext */ }
  const kurz = svg.getAttribute('aria-label');
  return kurz ? { text: { kurz, beschreibung: [], liste: [], tabelle: { titel: '', kopf: [], zeilen: [], zeilenKopf: false } } } : {};
}

/** Zeichnet einen Baustein unsichtbar und gibt sein SVG als PNG zurück. */
async function zeichneMit(gest: Blatt['gestalt'], komp: unknown, props: Record<string, unknown>): Promise<Png | null> {
  const ort = Object.assign(document.createElement('div'), { style: 'position:fixed;left:-10000px;top:0;width:800px' });
  document.body.append(ort);
  const k = mount(komp as never, { target: ort, props } as never);
  try {
    flushSync(); const svg = ort.querySelector('svg');
    // Diagramm gestalten (S-G): die am Blatt gespeicherte Wahl, die zu diesem Diagramm passt, kommt auch in den Bericht.
    if (svg && gest) { const g = waehleGestalt(gest, svg); if (g) wendeAn(svg, g); }
    if (!svg) return null;
    const png = await alsPng(svg, 2, false); // Bericht: das Logo steht im Seitenfuß, nicht in jedem Bild
    return { ...png, ...bildTextVon(ort, svg) };
  }
  finally { unmount(k); ort.remove(); }
}

/** Die vollständigen Fälle der genannten Zahlenspalten (ohne Lücken und „keine Angabe“-Werte). */
function zahlenZeilen(namen: string[]): number[][] {
  const ix = namen.map(n => s.spalten.findIndex(x => x.name === n)), sps = namen.map(n => spalteNach(n));
  return s.zeilen.flatMap(z => (ix.every((i, k) => typeof z[i] === 'number' && !istFehlend(sps[k], z[i] as number)) ? [ix.map(i => z[i] as number)] : []));
}

/** Alle Abbildungen eines Blatts (meist eine; Übereinstimmung mit zwei Zahlenspalten: ICC-Linien und Bland-Altman). */
export async function diagrammBilder(b: Blatt, name: (n: string) => string): Promise<Png[]> {
  const zeichne = (komp: unknown, props: Record<string, unknown>) => zeichneMit(b.gestalt, komp, props);
  const erg = b.ergebnis as { typ?: string; e?: unknown; werte?: Record<string, number[]> } | null;
  // Mit Fallgewicht zeichnen Diagramme aus den einzelnen Zeilen jede Zeile einmal: sie sind gesperrt (Fachblatt S-A, 1.5, Falle 11). Aus den gewichteten Tabellen gezeichnete (Häufigkeiten, Kreuztabelle, Scree) bleiben.
  const gew = !!b.gewicht;
  const eins = (p: Png | null) => (p ? [p] : []);
  switch (erg?.typ) {
    case 'messwiederholung': { const e = erg.e as Messwiederholung, nm = mwNamen(e); return eins(await zeichne(Zeitdiagramm, { e, zeitTexte: e.zeitpunkte.map((_, i) => nm.zn(i)), gruppenTexte: e.gruppen.map((_, q) => nm.gruppen(q)) })); }
    case 'mehrfach': return eins(await zeichne(Mehrfachdiagramm, { m: erg.e as Mehrfach }));
    case 'verteilung': {
      // Wie im Blatt: erst die Zahlenspalten (Histogramm oder Boxplot), dann die Kategorienspalten (Balken), dann Mehrfachantworten.
      const o = dvMit(b.dv), v = verteilungsDaten(b, erg.e as Verteilung, name), aus: Png[] = [];
      for (const z of gew ? [] : v.zahlen) aus.push(...eins(await (o.verteilung === 'qq' ? zeichne(Qqdiagramm, { werte: z.werte, titel: z.titel }) : zeichne(Verteilungsdiagramm, { werte: z.werte, titel: z.titel, art: o.verteilung, normal: o.normal }))));
      for (const h of v.haeufig) aus.push(...eins(await zeichne(Haeufigkeitsdiagramm, { h: haeufigGeordnet(h, b.gestalt), prozent: o.haeufig === 'prozent' })));
      const mf = (erg.e as { mehrfach?: Mehrfach[] } | undefined)?.mehrfach ?? [];
      for (const m of mf) aus.push(...eins(await zeichne(Mehrfachdiagramm, { m })));
      return aus;
    }
    case 'kreuz': { const o = dvMit(b.dv), e = erg.e as Kreuz; return e.zaehlung?.tab.length ? eins(await zeichne(Kreuzdiagramm, { e: kreuzGeordnet(e, b.gestalt), art: o.kreuz, wert: o.kreuzWert, skala: antwortSkala(b, e) })) : []; }
    case 'vorhersage': { const o = dvMit(b.dv), e = erg.e as Vorhersage, r = gew ? null : restDaten(b, e); return r ? eins(await zeichne(Residuendiagramm, { r, art: o.rest, zielText: name(e.ziel) })) : []; }
    case 'quantil': {
      const e = erg.e as QuantilErgebnis;
      if (gew || !e.kreuzen.einZahl) return [];
      const d = quantilDesign(katDaten('zaehlreg', e.ziel, e.praed.map(p => p.name), s.zeilen, s.spalten), e.koef);
      return eins(await zeichne(Quantildiagramm, { punkte: d.y.map((y, i) => [d.x[1]![i]!, y] as [number, number]), linien: e.erg.map(t => ({ tau: t.tau, a: t.b[0]!, b: t.b[1]! })), xText: name(e.praed[0]!.name), yText: name(e.ziel) }));
    }
    case 'penal': {
      const e = erg.e as StrafErgebnis;
      return [...eins(await zeichne(Kreuzvalidierungsdiagramm, { lambda: e.lambda, cvm: e.cvm, cvsd: e.cvsd, nzero: e.nzero, lambdaMin: e.lambdaMin, lambda1se: e.lambda1se, gewaehlt: e.lambdaGewaehlt })),
        ...(e.koef.length > 1 ? eins(await zeichne(Strafpfaddiagramm, { lambda: e.lambda, pfad: e.pfadStd, namen: e.koef.map(k => strafPfadName(e, k, name)), auswahl: pfadAuswahl(e.koef.map(k => k.std), 20), gewaehlt: e.lambdaGewaehlt })) : [])];
    }
    case 'faktor': { const sd = screeDaten(erg.e as Faktoren); return sd ? eins(await zeichne(Screeplot, { eigen: sd.eigen, extrahiert: sd.extrahiert })) : []; }
    case 'kaplanmeier': {
      const e = erg.e as Kaplan;
      if (e.sterbe) return [...eins(await zeichne(Sterbetafeldiagramm, { e: e.sterbe, art: 'anteil', zeitName: name(e.zeit) })), ...eins(await zeichne(Sterbetafeldiagramm, { e: e.sterbe, art: 'hazard', zeitName: name(e.zeit) }))];   // Später S-F: Sterbetafel statt Kaplan-Meier-Kurve
      return eins(await zeichne(Kaplandiagramm, { e, zeitName: name(e.zeit) }));
    }
    case 'zeitreihen': {
      const e = erg.e as ZeitreiheE, a = zeitreiheAuswertung(e), wertText = name(e.wert), aus: Png[] = [];
      aus.push(...eins(await zeichne(Zeitreihendiagramm, { e, a, wertText, zeitText: e.datum ? name(e.datum) : L('Reihenfolge der Zeilen', 'Row order'), gleitend: e.fenster > 0, trend: !!a.trend })));
      const r = e.acfQuelle === 'reihe' ? a.acfReihe : a.acfResid;
      if (r && a.grenze !== null) aus.push(...eins(await zeichne(Korrelogramm, { r: r.slice(0, a.lagMax), grenze: a.grenze, periode: e.periode, n: a.n, titel: e.acfQuelle === 'reihe' ? L(`Autokorrelation von ${wertText}`, `Autocorrelation of ${wertText}`) : L(`Autokorrelation der Residuen des Trends von ${wertText}`, `Autocorrelation of the residuals of the trend of ${wertText}`) })));
      const pr = e.acfQuelle === 'reihe' ? a.pacfReihe : a.pacfResid;
      if (pr && a.grenze !== null) aus.push(...eins(await zeichne(Korrelogramm, { r: pr, grenze: a.grenze, periode: e.periode, n: a.n, partiell: true, titel: e.acfQuelle === 'reihe' ? L(`Partielle Autokorrelation von ${wertText}`, `Partial autocorrelation of ${wertText}`) : L(`Partielle Autokorrelation der Residuen des Trends von ${wertText}`, `Partial autocorrelation of the residuals of the trend of ${wertText}`) })));
      if (a.zer) aus.push(...eins(await zeichne(Zerlegungsdiagramm, { e, a, wertText })));
      if (e.periodogramm) aus.push(...eins(await zeichne(Periodogrammdiagramm, { p: e.periodogramm, wertText })));
      return aus;
    }
    case 'cluster': {
      const e = erg.e as ClusterE, r = clusterGewaehlt(e), namen = e.gerechnet.map(name), aus: Png[] = [];
      if (!r) return [];
      aus.push(...eins(await zeichne(Ellbogenbild, { ks: e.ks, tss: e.tss, k: e.k, vorschlag: e.vorschlag })));
      if (e.verfahren === 'ward' && e.ward) aus.push(...eins(await zeichne(Dendrogramm, { mergeA: e.ward.mergeA, mergeB: e.ward.mergeB, hoehe: e.ward.hoehe, n: e.n, k: e.k, beschriftung: (f: number) => String(e.zeilen[f] ?? f + 1) })));
      aus.push(...eins(await zeichne(Clusterprofil, { p: e.profil, merkmale: namen })));
      return aus;
    }
    case 'einzelfall': { const e = erg.e as Einzelfall; return eins(await zeichne(Einzelfalldiagramm, { e, yText: name(e.mess), zeitText: e.zeit ? name(e.zeit) : '' })); }
    case 'mediation': { const e = erg.e as Mediation; return eins(await zeichne(Mediationsdiagramm, { e, xText: name(e.x), mText: name(e.m), yText: name(e.y) })); }
    case 'meta': { const e = erg.e as Meta; return [...eins(await zeichne(Forestplot, { e })), ...eins(await zeichne(Trichterdiagramm, { e }))]; }
    case 'mehrebenen': { const e = erg.e as Mehrebenen; return eins(await zeichne(Raupendiagramm, { e, yText: name(e.y), gText: name(e.gruppe) })); }
    case 'anova2': { const e = erg.e as Anova2E; return eins(await zeichne(Interaktionsdiagramm, { e, aText: name(e.aCol), bText: name(e.bCol), yText: name(e.yCol) })); }
    case 'moderation': { const e = erg.e as Moderation; return eins(await zeichne(Moderationsdiagramm, { e, xText: name(e.x), yText: name(e.y), wText: name(e.w) })); }
    case 'prae-post': {
      if (gew) return [];
      const e = erg.e as PraePost, paare = zahlenZeilen([e.vorher, e.nachher]) as [number, number][];
      return paare.length ? eins(await zeichne(Praepostdiagramm, { e, paare, vorherText: name(e.vorher), nachherText: name(e.nachher) })) : [];
    }
    case 'zusammenhang': {
      // Wie am Blatt (N3): die Punkte aller Personen mit beiden Angaben - mit Kontrollspalten die Reste (Added-Variable-Plot); der Baustein zieht die feste Stichprobe selbst.
      if (gew) return [];
      const e = erg.e as Zusammenhang, partial = !!e.kontroll?.length;
      const punkte = partial ? partialPunkte(zahlenZeilenMitLuecken([e.x, e.y, ...e.kontroll!]), e.methode === 'spearman' ? 'spearman' : 'pearson') : zahlenZeilen([e.x, e.y]) as [number, number][];
      if (!punkte.length) return [];
      const mit = (n: string) => (partial ? L(`${name(n)} (bereinigt)`, `${name(n)} (adjusted)`) : name(n));
      return eins(await zeichne(Streudiagramm, { punkte, rang: (e.methode ?? 'pearson') !== 'pearson', xText: mit(e.x), yText: mit(e.y) }));
    }
    case 'icc': {
      const e = erg.e as IccErgebnis, daten = zahlenZeilen(e.spalten);
      if (!daten.length) return [];
      const aus = eins(await zeichne(Iccdiagramm, { e, daten, namen: e.spalten.map(name) }));
      if (e.ba) aus.push(...eins(await zeichne(Blandaltmandiagramm, { ba: e.ba, punkte: baPunkte(daten.map(z => [z[0]!, z[1]!] as [number, number])), aText: name(e.spalten[0]!), bText: name(e.spalten[1]!) })));
      return aus;
    }
    case 'zwei-gruppen': {
      const g = erg as { e: ZweiGruppen; werte?: Record<string, number[]> };
      if (gew || !g.e || !g.werte) return [];
      const aus = eins(await zeichne(Gruppendiagramm, { e: g.e, werte: g.werte, o: b.dg ?? dgGrund(b.titel, name(g.e.abhaengig)), xText: name(g.e.gruppenSpalte) }));
      // ROC-Kurve wie am Blatt: positiv ist die Gruppe mit dem höheren Mittelwert; nur, wenn sie am Blatt für den Bericht gewählt ist.
      if (b.roc) {
        const hoch = g.e.a.m >= g.e.b.m ? g.e.a : g.e.b, tief = hoch === g.e.a ? g.e.b : g.e.a;
        const k = g.werte[hoch.name] && g.werte[tief.name] ? rocKurve(g.werte[hoch.name]!, g.werte[tief.name]!) : null;
        if (k) aus.push(...eins(await zeichne(Rocdiagramm, { k, titel: name(g.e.abhaengig), positiv: hoch.name })));
      }
      return aus;
    }
    default: return [];
  }
}

export async function diagrammBild(b: Blatt, name: (n: string) => string) { return (await diagrammBilder(b, name))[0] ?? null; }
