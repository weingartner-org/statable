/** Kaplan-Meier-Kurve (Schablone 5.10): Treppenkurven; Tabelle des Anteils ohne Ereignis zu festen Zeitpunkten. */
import { L, Lp } from '../sitzung.svelte';
import { z, sauber, pText } from './zahlen';
import { achsenSatz, titelOder, keineDaten, nFreiheitsgrade, nPersonen, nEreignisse } from './hilfen';
import type { BildText, KaplanDaten } from './typen';

/** Anteil ohne Ereignis zur Zeit t: Wert des letzten Schritts bis t (davor 1). */
export function anteilBei(punkte: { t: number; s: number }[], t: number): number {
  let s = 1;
  for (const p of punkte) { if (p.t <= t) s = p.s; else break; }
  return s;
}

export function kaplan(d: KaplanDaten): BildText {
  const zeit = sauber(d.zeitName), ereignis = sauber(d.ereignisName);
  const titel = titelOder(d.titel, L(`Anteil ohne ${ereignis} über ${zeit}`, `Share without ${ereignis} over ${zeit}`));
  const m = d.kurven.length;
  if (m === 0) return keineDaten(titel, L(`Kaplan-Meier-Kurve (Überlebenskurve): keine Daten.`, `Kaplan-Meier curve (survival curve): no data.`));
  const kurven = d.kurven.map((k, i) => ({ ...k, name: sauber(k.name ?? '') || (m > 1 ? L(`Gruppe ${i + 1}`, `Group ${i + 1}`) : '') }));
  const tMax = d.tMax ?? Math.max(0, ...kurven.flatMap(k => k.punkte.map(p => p.t)));
  const zeiten = d.zeiten && d.zeiten.length ? d.zeiten : tMax > 0 ? Array.from({ length: 6 }, (_, i) => (tMax * i) / 5) : [0];
  const med = (k: (typeof kurven)[number]) => (k.median === null || !Number.isFinite(k.median) ? L('nicht erreicht', 'not reached') : z(k.median));
  const einheit = d.einheit ? ` ${sauber(d.einheit)}` : '';
  const kurz = m === 1
    ? L(`Kaplan-Meier-Kurve (Überlebenskurve): Anteil ohne ${ereignis} über ${zeit}; mediane Überlebenszeit ${med(kurven[0]!)}${einheit}.`, `Kaplan-Meier curve (survival curve): share without ${ereignis} over ${zeit}; median survival time ${med(kurven[0]!)}${einheit}.`)
    : L(`Kaplan-Meier-Kurve (Überlebenskurve): Anteil ohne ${ereignis} über ${zeit} für ${m} Gruppen; mediane Überlebenszeit ${kurven.map(k => `${k.name} ${med(k)}`).join(', ')}.`, `Kaplan-Meier curve (survival curve): share without ${ereignis} over ${zeit} for ${m} groups; median survival time ${kurven.map(k => `${k.name} ${med(k)}`).join(', ')}.`);
  const beschreibung = [
    L(`Kaplan-Meier-Kurve (Überlebenskurve): Anteil ohne ${ereignis} über ${zeit}.`, `Kaplan-Meier curve (survival curve): share without ${ereignis} over ${zeit}.`),
    achsenSatz(true, { name: zeit, von: 0, bis: tMax, einheit: d.einheit }),
    achsenSatz(false, { name: L(`Anteil ohne ${ereignis}`, `Share without ${ereignis}`), von: 0, bis: 1 }),
    Lp(m, `Das Diagramm zeigt ${m} Kurve; sie fällt treppenförmig.`, `Das Diagramm zeigt ${m} Kurven; sie fallen treppenförmig.`, `The chart shows ${m} curve; it falls in steps.`, `The chart shows ${m} curves; they fall in steps.`),
    ...(d.logrank ? [L(`Log-Rank-Test: Chi-Quadrat ${z(d.logrank.chi2, 2)}, ${nFreiheitsgrade(d.logrank.df)}, p-Wert ${d.logrank.p < 0.001 ? '' : '= '}${pText(d.logrank.p)}.`, `Log-rank test: chi-square ${z(d.logrank.chi2, 2)}, ${nFreiheitsgrade(d.logrank.df)}, p-value ${d.logrank.p < 0.001 ? '' : '= '}${pText(d.logrank.p)}.`)] : [])
  ];
  const liste = kurven.map(k => {
    const ende = k.punkte.length ? k.punkte.at(-1)!.s : 1;
    const vorn = k.name ? `${k.name}: ` : '';
    const zens = k.zensiert !== undefined ? L(`, ${k.zensiert} zensierte Fälle`, `, ${k.zensiert} censored cases`) : '';
    return L(`${vorn}${nPersonen(k.n)}, ${nEreignisse(k.ereignisse)}${zens}, mediane Überlebenszeit ${med(k)}, am Ende noch ${z(ende, 2)} ohne Ereignis.`, `${vorn}${nPersonen(k.n)}, ${nEreignisse(k.ereignisse)}${zens}, median survival time ${med(k)}, at the end ${z(ende, 2)} without event.`);
  });
  const kopf = [zeit, ...kurven.map((k, i) => k.name || String(i + 1))];
  const zeilen = zeiten.map(t => [z(t), ...kurven.map(k => z(anteilBei(k.punkte, t), 2))]);
  return { kurz, beschreibung, liste, tabelle: { titel, kopf, zeilen, zeilenKopf: true } };
}
