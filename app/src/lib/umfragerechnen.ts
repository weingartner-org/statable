/**
 * Später S-D2, Bauer A2: Umfragegewicht mit „Personen einzeln gezogen: Ja“ - Standardfehler, Intervalle und Tests der Karten Verteilung und Kreuztabelle mit dem R-Paket survey (webR).
 * Der Auftrag entsteht rein in lib/umfragedaten.ts; hier läuft er über den einen R-Motor (lib/rverfahren.svelte.ts: Pakete laden, Daten binden, nacheinander rechnen, Fehler als fertigen Satz).
 * Vor R: die Grenzen (200 000 Zeilen, 400 Zellen) - dann kommt der Satz, ohne dass R geladen wird. Nach R: die Selbstprüfung (Punktschätzer aus Statable gegen die aus R).
 */
import { L } from './sitzung.svelte';
import { umfrageRechnen, umfrageRechnenListe, Fertig, rFehlerText } from './rverfahren.svelte';
import { umfrageGrenze, type UmfrageErgebnis } from './umfrage';
import type { GewichtetE, Quelle } from './gewichtbeschreibend';
import { planVerteilung, verteilungLesen, pruefeVerteilung, planKreuz, kreuzLesen, pruefeKreuz, type DesignKreuzE, type DesignVerteilungE, type RPlan } from './umfragedaten';
import { komma } from './ergebnis';

/** Die Grenzen vor R: dann steht der Satz statt der Intervalle und R wird nicht geladen; die beschreibenden Zahlen bleiben (Fachblatt 0.8). */
function grenze(plan: RPlan): UmfrageErgebnis | null {
  const g = umfrageGrenze(plan.zeilen, plan.zellen || undefined);
  return g ? { fehlerCode: g, n: plan.zeilen, zellen: plan.zellen } : null;
}
/** Ein Fehler von R selbst (nicht von der Rechnung): als fertiger Satz, das Blatt wird nicht gerechnet. */
function fehlerStopp(f: string): never { throw new Fertig(rFehlerText(f)); }
function pruefStopp(a: { was: string; js: number; r: number }): never {
  throw new Fertig(L(`Die Zahlen von Statable und von R stimmen nicht überein (${a.was}: ${komma(a.js, 6)} gegen ${komma(a.r, 6)}). Es wurde nichts gerechnet. Das ist ein interner Fehler.`,
    `The numbers from Statable and from R do not agree (${a.was}: ${komma(a.js, 6)} versus ${komma(a.r, 6)}). Nothing was calculated. This is an internal error.`));
}

/** Karte Verteilung: Mittelwerte mit Intervall (und Test gegen `mu0`) und Anteile mit Logit- und Korn-Graubard-Intervall. `e`: das beschreibende Ergebnis, `q`: die Daten mit den bereinigten Gewichten. */
export async function umfrageVerteilungRechnen(e: GewichtetE, q: Quelle, mu0: number | null, anteilKi: 'logit' | 'beta'): Promise<DesignVerteilungE> {
  const plan = planVerteilung(e, q, mu0), g = grenze(plan);
  if (g || !plan.auftraege.length) return { art: 'verteilung', mu0, mittel: null, anteile: [], anteilKi, survey: '4.5', ...(g ? { fehler: g } : {}) };
  const aus = await umfrageRechnenListe(plan.spalten, plan.auftraege.map(a => ({ art: a.art, aufruf: a.aufruf })));
  const antwort: Record<string, unknown> = { mittel: null, anteile: {} };
  plan.auftraege.forEach((a, i) => { if (a.schluessel === 'mittel') antwort.mittel = aus[i]; else (antwort.anteile as Record<string, unknown>)[a.schluessel] = aus[i]; });
  const l = verteilungLesen(plan, antwort, mu0, anteilKi);
  if ('fehler' in l) fehlerStopp(l.fehler);
  const a = pruefeVerteilung(e, l.ok); if (a) pruefStopp(a);
  return l.ok;
}
/** Karte Kreuztabelle: Rao-Scott-Test (F zweiter Ordnung, χ² erster Ordnung). */
export async function umfrageKreuzRechnen(e: GewichtetE, q: Quelle): Promise<DesignKreuzE> {
  const plan = planKreuz(e, q), g = grenze(plan);
  if (g) return { art: 'kreuz', zeile: plan.zeile, spalte: plan.spalte, e: g, survey: '4.5' };
  const l = kreuzLesen(plan, await umfrageRechnen('kreuz', plan.spalten, plan.aufruf));
  if ('fehler' in l) fehlerStopp(l.fehler);
  const a = pruefeKreuz(e, l.ok); if (a) pruefStopp(a);
  return l.ok;
}
