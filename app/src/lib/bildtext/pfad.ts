/** Pfaddiagramm (Schablone 5.13): „nach“ statt Pfeilzeichen; gerichtete Pfade und Doppelpfeile (Korrelationen) getrennt. */
import { L, Lp } from '../sitzung.svelte';
import { z, sauber, pText } from './zahlen';
import { titelOder, keineDaten, mitVariablen, mitPfaden } from './hilfen';
import type { BildText, PfadDaten } from './typen';

export function pfad(d: PfadDaten): BildText {
  const titel = titelOder(d.titel, L('Pfade des Modells', 'Paths of the model'));
  const nm = new Map(d.knoten.map(k => [k.id, sauber(k.name)]));
  const name = (id: string) => nm.get(id) ?? sauber(id);
  const v = d.knoten.length;
  if (v === 0) return keineDaten(titel, L('Pfaddiagramm: keine Variablen.', 'Path diagram: no variables.'));
  const ger = d.pfade.filter(p => !p.korrelation), kor = d.pfade.filter(p => p.korrelation);
  let top = -1;
  ger.forEach((p, i) => { if (Number.isFinite(p.wert) && (top < 0 || Math.abs(p.wert) > Math.abs(ger[top]!.wert))) top = i; });
  const latent = d.knoten.filter(k => k.latent).length;
  const kurz = top >= 0
    ? L(`Pfaddiagramm mit ${mitVariablen(v)} und ${mitPfaden(d.pfade.length)}; stärkster Pfad von ${name(ger[top]!.von)} nach ${name(ger[top]!.nach)} mit ${z(ger[top]!.wert, 2)}.`, `Path diagram with ${mitVariablen(v)} and ${mitPfaden(d.pfade.length)}; strongest path from ${name(ger[top]!.von)} to ${name(ger[top]!.nach)} with ${z(ger[top]!.wert, 2)}.`)
    : L(`Pfaddiagramm mit ${mitVariablen(v)} und ${mitPfaden(d.pfade.length)}.`, `Path diagram with ${mitVariablen(v)} and ${mitPfaden(d.pfade.length)}.`);
  const beschreibung = [
    L('Pfaddiagramm.', 'Path diagram.'),
    L(`Variablen: ${d.knoten.map(k => name(k.id)).join(', ')}.`, `Variables: ${d.knoten.map(k => name(k.id)).join(', ')}.`),
    ...(latent ? [Lp(latent, `${latent} davon ist ein nicht direkt gemessenes Merkmal (latent).`, `${latent} davon sind nicht direkt gemessene Merkmale (latent).`, `${latent} of them is not measured directly (latent).`, `${latent} of them are not measured directly (latent).`)] : []),
    Lp(ger.length, `${ger.length} gerichteter Pfad (Pfeil von einer Variablen zur anderen), Koeffizient dahinter.`, `${ger.length} gerichtete Pfade (Pfeil von einer Variablen zur anderen), Koeffizient dahinter.`, `${ger.length} directed path (arrow from one variable to another), coefficient after it.`, `${ger.length} directed paths (arrow from one variable to another), coefficient after it.`),
    ...(kor.length ? [Lp(kor.length, `${kor.length} Doppelpfeil (Korrelation).`, `${kor.length} Doppelpfeile (Korrelationen).`, `${kor.length} double-headed arrow (correlation).`, `${kor.length} double-headed arrows (correlations).`)] : [])
  ];
  const pt = (p: PfadDaten['pfade'][number]) => (p.p === null || p.p === undefined ? '' : L(`, p-Wert ${p.p < 0.001 ? '' : '= '}${pText(p.p)}`, `, p-value ${p.p < 0.001 ? '' : '= '}${pText(p.p)}`));
  const liste = [
    ...ger.map(p => L(`${name(p.von)} nach ${name(p.nach)}: ${z(p.wert, 2)}${pt(p)}.`, `${name(p.von)} to ${name(p.nach)}: ${z(p.wert, 2)}${pt(p)}.`)),
    ...kor.map(p => L(`${name(p.von)} mit ${name(p.nach)} (Korrelation): ${z(p.wert, 2)}${pt(p)}.`, `${name(p.von)} with ${name(p.nach)} (correlation): ${z(p.wert, 2)}${pt(p)}.`)),
    ...(d.r2 ?? []).map(r => L(`Erklärte Varianz von ${name(r.id)}: ${z(r.wert, 2)}.`, `Explained variance of ${name(r.id)}: ${z(r.wert, 2)}.`))
  ];
  const zeilen = d.pfade.map(p => [name(p.von), name(p.nach), p.korrelation ? L('Korrelation', 'correlation') : L('gerichtet', 'directed'), z(p.wert, 2), p.p === null || p.p === undefined ? '' : pText(p.p)]);
  return { kurz, beschreibung, liste, tabelle: { titel, kopf: [L('von', 'from'), L('nach', 'to'), L('Art', 'Type'), L('Koeffizient', 'Coefficient'), L('p-Wert', 'p-value')], zeilen, zeilenKopf: false } };
}
