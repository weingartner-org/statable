/**
 * Vorlage speichern und auf neue Daten anwenden (Abschnitt 6, Teil B). Die Läufe benutzen dieselben Funktionen wie die Oberfläche von Hand
 * (`aendere`, `sortiereDauerhaftAn`, `entferneSpalte`, `liesAlsTausender`/`liesAlsZahl`): es gibt keinen zweiten Rechenweg. Die reine Logik steht in lib/vorlage.ts und lib/protokoll.ts.
 */
import { s, L, melde, aendere, rueckgaengig, lauf, vermerkeImProtokoll, kopfzeileDerTabelle, sichern, liesAlsTausender, liesAlsZahl, abbruchStand, setzeSets, setzeSkalen, setzeZusatz } from './sitzung.svelte';
import { entferneSpalte, sortiereDauerhaftAn } from './datenschritte.svelte';
import { baueVorlage, blattAusVorlage, leseVorlage, pruefeVorlage, vorlageAlsText, vorlageDateiname, VORLAGE_MAX_BYTES, type Pruefung, type SpeicherHinweise, type Vorlage } from './vorlage';
import { pruefsumme, type Art, type Wiederhol } from './protokoll';
import { neueId } from './ablage';
import { fehlerTexte } from './datenassistentlauf';
import { artText } from './protokollsaetze';
import { psppNameOk } from './befehlstext';
import { EngineAbgebrochen } from '../engine/wasm-engine';
import type { SpaltenArt } from './protokoll';
import { leseRegeln, type Regel } from './plausibel';

/* ------------------------------------------------------------------------------------------------------------------------------- Speichern */
/** Die Vorlage aus dem offenen Projekt (ohne Datei zu schreiben). */
export function vorlageAusProjekt(): { vorlage: Vorlage; hinweise: SpeicherHinweise } {
  return baueVorlage(s.protokoll, { spalten: s.spalten.map(sp => ({ name: sp.name, art: sp.art as SpaltenArt })) }, s.blaetter, s.sets, s.skalen, s.projekt?.name ?? '', s.protokollLuecke, Date.now(), s.zusatz.plausi ?? []);
}

/** Speichert die Vorlage als Datei `.statable-vorlage` (Download). Gibt die Hinweise zum Speichern und den Dateinamen zurück. */
export function speichereVorlage(): { hinweise: SpeicherHinweise; dateiname: string } {
  const { vorlage, hinweise } = vorlageAusProjekt();
  const dateiname = vorlageDateiname(vorlage.name);
  const url = URL.createObjectURL(new Blob([vorlageAlsText(vorlage)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: dateiname });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { hinweise, dateiname };
}

/* ------------------------------------------------------------------------------------------------------------------------------- Lesen und Prüfen */
export type VorlageDatei = { ok: true; vorlage: Vorlage; dateiname: string; pruefsumme: string | null } | { ok: false; grund: 'unlesbar' | 'neuer' | 'zu-gross' };
/** Liest eine Vorlagendatei. Eine kaputte oder fremde Datei ergibt `ok: false`, nie einen Absturz. */
export async function leseVorlageDatei(datei: File): Promise<VorlageDatei> {
  try {
    if (datei.size > VORLAGE_MAX_BYTES) return { ok: false, grund: 'zu-gross' };
    const bytes = new Uint8Array(await datei.arrayBuffer());
    const r = leseVorlage(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
    if (!r.ok) return r;
    return { ok: true, vorlage: r.vorlage, dateiname: datei.name.slice(0, 200), pruefsumme: await pruefsumme(bytes) };
  } catch { return { ok: false, grund: 'unlesbar' }; }
}

/** Die Prüfung vor jeder Änderung, gegen die Daten, die jetzt offen sind. */
export function pruefeAufDaten(v: Vorlage, zuordnung: Record<string, string> = {}): Pruefung {
  return pruefeVorlage(v, { spalten: s.spalten.map(sp => ({ name: sp.name, art: sp.art as SpaltenArt })), zeilen: s.zeilen }, zuordnung, kopfzeileDerTabelle());
}

/* ------------------------------------------------------------------------------------------------------------------------------- Anwenden */
export type LaufErgebnis =
  | { ok: true; schritte: number; blaetter: number; ausgelassen: number }
  | { ok: false; art: 'sperre' | 'bestaetigung' }
  | { ok: false; art: 'abbruch'; schritt: number; schrittArt: Art; grund: 'pspp' | 'person' | 'sonst'; text?: string };

/**
 * Wendet die Vorlage auf die offenen Daten an. Zuerst die Prüfung (bei einer Sperre oder unbestätigter Warnung ändert sich nichts), dann die Schritte der Reihe nach.
 * Bricht ein Schritt ab, wird alles rückgängig gemacht (die Daten sind wie vor dem Lauf), die Einträge stehen als „zurückgenommen“ im Protokoll, und der abgebrochene Schritt trägt seinen Grund.
 */
export async function wendeVorlageAn(v: Vorlage, o: { dateiname: string; pruefsummeVorlage: string | null; zuordnung?: Record<string, string>; bestaetigt?: boolean; fortschritt?: (nr: number, von: number) => void }): Promise<LaufErgebnis> {
  const zuordnung = o.zuordnung ?? {};
  const p = pruefeAufDaten(v, zuordnung);
  if (p.sperren) return { ok: false, art: 'sperre' };
  if (p.warnungen && !o.bestaetigt) return { ok: false, art: 'bestaetigung' };
  const start = s.verlauf.length, wiederAlt = s.wieder;
  const abbrueche = abbruchStand();
  const info = { datei: o.dateiname.slice(0, 200), pruefsummeVorlage: o.pruefsummeVorlage, pruefsummeDaten: s.datei?.sha256 ?? null, datenName: s.datei?.name ?? null };
  lauf.vorlage = { datei: info.datei, pruefsummeVorlage: info.pruefsummeVorlage, schritt: 0 };
  vermerkeImProtokoll({ art: 'vorlage', ergebnis: 'ok', vorlage: { ...info, schritt: 0 }, pruefung: { sperren: p.sperren, warnungen: p.warnungen, hinweise: p.hinweise, bestaetigt: !!o.bestaetigt, zeilenNeueKategorien: p.zeilenNeueKategorien } });
  const fehl = (schritt: number, schrittArt: Art, grund: 'pspp' | 'person' | 'sonst', text?: string): LaufErgebnis => ({ ok: false, art: 'abbruch', schritt, schrittArt, grund, text });
  try {
    // Zuordnung fehlender Spalten: die vorhandene Spalte bekommt den Namen aus der Vorlage (steht im Protokoll)
    for (const [nach, von] of Object.entries(zuordnung)) {
      if (von.toLowerCase() === nach.toLowerCase()) continue;
      if (!psppNameOk(von) || !psppNameOk(nach)) return await abbrechen(start, wiederAlt, fehl(0, 'umbenennen', 'sonst'));
      const r = await aendere(L(`Spalte ${von} heißt jetzt ${nach} (Zuordnung zur Vorlage)`, `Column ${von} is now called ${nach} (matched to the template)`), `RENAME VARIABLES (${von} = ${nach}).`, undefined, { art: 'umbenennen', zuordnung: { von, nach } });
      if (fehlerTexte(r.items).length) return await abbrechen(start, wiederAlt, fehl(0, 'umbenennen', 'pspp', fehlerTexte(r.items)[0]));
    }
    let nr = 0;
    for (const st of v.schritte) {
      nr++; lauf.vorlage = { datei: info.datei, pruefsummeVorlage: info.pruefsummeVorlage, schritt: nr };
      o.fortschritt?.(nr, v.schritte.length);
      const vorher = s.protokoll.length;
      const w: Wiederhol | undefined = st.wiederhol;
      let ok = true, grund: 'pspp' | 'sonst' = 'sonst', text: string | undefined;
      try {
        if (!w) { ok = false; }
        else if (w.typ === 'syntax') {
          const r = await aendere(artText(st.art), w.befehle.join('\n'), w.gewicht, { art: st.art });
          const f = fehlerTexte(r.items); if (f.length) { ok = false; grund = 'pspp'; text = f[0]; }
        } else if (w.typ === 'sortieren') { await sortiereDauerhaftAn(w.schluessel, w.altName); }
        else if (w.typ === 'spalteWeg') { ok = await entferneSpalte(w.name); }
        else if (w.typ === 'lesart') {
          if (!kopfzeileDerTabelle()) ok = false;
          else if (w.modus === 'tausender') await liesAlsTausender(w.kopf); else await liesAlsZahl(w.kopf);
        }
      } catch (err) {
        if (err instanceof EngineAbgebrochen || abbruchStand() !== abbrueche) return await abbrechen(start, wiederAlt, fehl(nr, st.art, 'person'), st.art, vorher, info, nr);
        ok = false; text = err instanceof Error ? err.message : undefined;
      }
      if (!ok) return await abbrechen(start, wiederAlt, fehl(nr, st.art, grund, text), st.art, vorher, info, nr);
    }
    // Auswertungen, Mehrfachantworten-Sets und Skalen aus der Vorlage
    const jetzt = Date.now();
    const neueBlaetter = v.blaetter.map(b => blattAusVorlage(b, neueId(), jetzt));
    s.blaetter = [...s.blaetter, ...neueBlaetter];
    const setNamen = new Set(s.sets.map(x => x.name)), skalaNamen = new Set(s.skalen.map(x => x.name));
    if (v.sets.some(x => !setNamen.has(x.name))) await setzeSets([...s.sets, ...v.sets.filter(x => !setNamen.has(x.name))]);
    if (v.skalen.some(x => !skalaNamen.has(x.name))) await setzeSkalen([...s.skalen, ...v.skalen.filter(x => !skalaNamen.has(x.name))]);
    if (v.plausi?.length) {
      const art = (r: Regel) => JSON.stringify({ ...r, id: '' });
      const da = new Set((s.zusatz.plausi ?? []).map(art));
      const neu = v.plausi.filter(r => !da.has(art(r)));
      if (neu.length) await setzeZusatz({ plausi: leseRegeln([...(s.zusatz.plausi ?? []), ...neu].map((r, i) => ({ ...r, id: `r${i + 1}` }))) });
    }
    await sichern();
    return { ok: true, schritte: v.schritte.length, blaetter: neueBlaetter.length, ausgelassen: v.ausgelassen };
  } finally {
    lauf.vorlage = null;
  }
}

/** Ein Schritt ist gescheitert: alle Schritte dieses Laufs zurücknehmen (die Daten sind wie vor dem Lauf), die Einträge als „zurückgenommen (Lauf abgebrochen)“ vermerken, den Grund festhalten. */
async function abbrechen(start: number, wiederAlt: typeof s.wieder, erg: LaufErgebnis, schrittArt?: Art, vorherLaenge?: number, info?: { datei: string; pruefsummeVorlage: string | null; pruefsummeDaten: string | null; datenName: string | null }, nr?: number): Promise<LaufErgebnis> {
  const nrn: number[] = [];
  while (s.verlauf.length > start) { const p = s.verlauf.at(-1)?.pnr; if (p) nrn.push(p); await rueckgaengig(true); }
  s.wieder = wiederAlt;
  // Rückgängig vermerkt „zurückgenommen“; hier war es ein Abbruch
  s.protokoll = s.protokoll.map(e => (nrn.includes(e.nr) && e.zurueck ? { ...e, zurueck: { ...e.zurueck, grund: 'abbruch' as const } } : e));
  if (erg.ok === false && erg.art === 'abbruch' && info && nr !== undefined && schrittArt) {
    const hatEintrag = vorherLaenge !== undefined && s.protokoll.length > vorherLaenge;   // ein PSPP-Fehler hat seinen Eintrag schon (Ergebnis „Fehler“)
    if (!hatEintrag) vermerkeImProtokoll({ art: schrittArt, ergebnis: 'abgebrochen', grund: erg.grund, vorlage: { ...info, schritt: nr } });
  }
  melde(L('Die Vorlage wurde nicht angewendet. Die Daten sind wie vorher.', 'The template was not applied. The data are as they were.'));
  return erg;
}
