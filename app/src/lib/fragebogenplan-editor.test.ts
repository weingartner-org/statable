/**
 * Paket 2C: Logik des Editors „Fragebogen planen“ (reine Funktionen, eigene Tests des Bauers).
 * Geprüft werden Regeln (Elemente hinzufügen, verschieben, löschen, Listen wiederverwenden, Vorlagen, Bedingung als Satz, Kodebuch-Änderung, Dateien), keine Rechen-Sollwerte.
 */
import { describe, expect, it } from 'vitest';
import { planPruefen, variablenAusPlan, zeigen, type Frage, type FragebogenPlan, type Block } from './fragebogenplan';
import {
  aendere, alleElemente, alleFragen, benenneVariable, beschrifteVariable, bedingungAusForm, bedingungSatz, befundZiel, editorBefunde, finde, formAusBedingung, hinzufuegen,
  idsInnerhalb, itemHinzu, itemVerschieben, listeBenutzung, listeKopieren, listeLoeschen, loeschen, moeglicheFragen, neueListe, neuerPlan, operatorenFuer, optionHinzu, optionLoeschen,
  optionVerschieben, setzeBedingung, setzeFehlend, setzeName, setzeSprachen, setzeText, setzeTyp, verschieben, verweiseAuf, waehleListe, FEHLEND_CODE, naechsterCode
} from './fragebogenplan-editor';
import { VORLAGEN, vorlageEinfuegen, vorlageKannBlock, type VorlageId } from './fragebogenplan-vorlagen';
import { planAlsDatei, planAusDatei, planUebernehmen, PlanDateiFehler, bildNameOk, bildNameAus } from './fragebogenplan-datei';
import { projektAlsDatei, leseProjektdatei } from './projektdatei';
import type { Projekt } from './ablage';

const de = (p: FragebogenPlan, id: string) => { const x = alleElemente(p).find(e => e.id === id); return x ? x.text['de'] : undefined; };

/** Ein Plan mit zwei Seiten, drei Fragen (Rauchen, Wie viel, Medien), alles in de und en befüllt. */
function beispiel(): { plan: FragebogenPlan; ids: { s1: string; s2: string; q1: string; q2: string; q3: string; l: string } } {
  let plan = neuerPlan({ de: 'Test', en: 'Test' });
  plan = hinzufuegen(plan, 'seite', null).plan;
  const s1 = plan.elemente[0]!.id;
  const a = hinzufuegen(plan, 'frage', s1); plan = a.plan;
  const b = hinzufuegen(plan, 'frage', a.id); plan = b.plan;
  plan = hinzufuegen(plan, 'seite', s1).plan;
  const s2 = plan.elemente[1]!.id;
  const c = hinzufuegen(plan, 'frage', s2); plan = c.plan;
  const l = vorlageEinfuegen(plan, 'jaNein', null); // landet auf der letzten Seite
  plan = l.plan;
  // jaNein-Frage wieder entfernen, die Liste bleibt
  plan = loeschen(plan, l.id).plan;
  const listeId = plan.antwortlisten[0]!.id;
  plan = setzeText(plan, a.id, 'de', 'Rauchen Sie?'); plan = setzeText(plan, a.id, 'en', 'Do you smoke?');
  plan = waehleListe(plan, a.id, listeId);
  plan = setzeText(plan, b.id, 'de', 'Wie viele Zigaretten am Tag?'); plan = setzeText(plan, b.id, 'en', 'How many cigarettes per day?');
  plan = setzeTyp(plan, b.id, 'zahl');
  plan = setzeText(plan, c.id, 'de', 'Medien'); plan = setzeText(plan, c.id, 'en', 'Media');
  return { plan, ids: { s1, s2, q1: a.id, q2: b.id, q3: c.id, l: listeId } };
}

describe('Hinzufügen', () => {
  it('Seite zuerst, dann Fragen hinter die Auswahl; Fokus-id kommt zurück', () => {
    const { plan, ids } = beispiel();
    expect(plan.elemente.map(s => s.id)).toEqual([ids.s1, ids.s2]);
    expect(plan.elemente[0]!.elemente.map(e => e.id)).toEqual([ids.q1, ids.q2]);
    expect(plan.elemente[1]!.elemente.map(e => e.id)).toEqual([ids.q3]);
  });
  it('ohne Seite entsteht eine; Block hat drei Items, Hinweis und Block bekommen eindeutige Namen', () => {
    let p = neuerPlan();
    const b = hinzufuegen(p, 'block', null); p = b.plan;
    expect(p.elemente).toHaveLength(1);
    const blk = alleElemente(p)[0] as Block;
    expect(blk.items).toHaveLength(3);
    const h = hinzufuegen(p, 'hinweis', b.id); p = h.plan;
    const b2 = hinzufuegen(p, 'block', b.id); p = b2.plan;
    const namen = alleElemente(p).map(e => e.name.toLowerCase());
    expect(new Set(namen).size).toBe(namen.length);
  });
  it('ändert den alten Plan nie (reine Funktion)', () => {
    const { plan } = beispiel();
    const vorher = JSON.stringify(plan);
    hinzufuegen(plan, 'frage', plan.elemente[0]!.id); verschieben(plan, plan.elemente[0]!.elemente[0]!.id, 1); loeschen(plan, plan.elemente[0]!.id);
    expect(JSON.stringify(plan)).toBe(vorher);
  });
  it('neue Namen sind gültig und eindeutig (planPruefen findet keinen Namensfehler)', () => {
    let p = neuerPlan(); let wahl: string | null = null;
    for (let i = 0; i < 6; i++) { const r = hinzufuegen(p, i % 3 === 0 ? 'frage' : i % 3 === 1 ? 'block' : 'hinweis', wahl); p = r.plan; wahl = r.id; }
    expect(planPruefen(p).filter(b => b.regel.startsWith('name'))).toEqual([]);
  });
});

describe('Verschieben', () => {
  it('innerhalb der Seite, an der Kante auf die andere Seite, am Ende des Plans geht es nicht weiter', () => {
    const { plan, ids } = beispiel();
    const r = verschieben(plan, ids.q2, -1);
    expect(r.ok).toBe(true);
    expect(r.plan.elemente[0]!.elemente.map(e => e.id)).toEqual([ids.q2, ids.q1]);
    expect(r.wohin).toMatchObject({ stelle: 1, von: 2, seite: 1, seiteGewechselt: false });
    const quer = verschieben(plan, ids.q2, 1);
    expect(quer.ok).toBe(true);
    expect(quer.plan.elemente[1]!.elemente.map(e => e.id)).toEqual([ids.q2, ids.q3]);
    expect(quer.wohin).toMatchObject({ seite: 2, seiteGewechselt: true });
    const hoch = verschieben(plan, ids.q1, -1);
    expect(hoch.ok).toBe(false); expect(hoch.plan).toBe(plan);
    expect(verschieben(plan, ids.q3, 1).ok).toBe(false);
  });
  it('Seiten tauschen die Stelle; unbekannte id: nichts', () => {
    const { plan, ids } = beispiel();
    const r = verschieben(plan, ids.s2, -1);
    expect(r.plan.elemente.map(s => s.id)).toEqual([ids.s2, ids.s1]);
    expect(verschieben(plan, 'gibt-es-nicht', 1).ok).toBe(false);
  });
  it('Verschieben vor die verwiesene Frage macht planPruefen zum Fehler (nichts wird still umgebaut)', () => {
    const { plan, ids } = beispiel();
    const mit = setzeBedingung(plan, ids.q2, { frage: ids.q1, ist: '=', wert: 1 });
    expect(planPruefen(mit).some(b => b.regel === 'verweis-vorn')).toBe(false);
    const dann = verschieben(mit, ids.q2, -1).plan;
    expect(planPruefen(dann).some(b => b.regel === 'verweis-vorn' && b.element === ids.q2)).toBe(true);
  });
  it('Items und Optionen lassen sich verschieben', () => {
    let { plan } = beispiel();
    const blk = hinzufuegen(plan, 'block', null); plan = blk.plan;
    const ersterItem = (alleElemente(plan).find(e => e.id === blk.id) as Block).items[0]!.id;
    const r = itemVerschieben(plan, blk.id, ersterItem, 1);
    expect(r.ok).toBe(true); expect(r.stelle).toBe(2);
    expect(itemVerschieben(plan, blk.id, ersterItem, -1).ok).toBe(false);
    const l = plan.antwortlisten[0]!;
    const o = optionVerschieben(plan, l.id, l.optionen[0]!.id, 1);
    expect(o.ok).toBe(true);
    expect(o.plan.antwortlisten[0]!.optionen[1]!.id).toBe(l.optionen[0]!.id);
  });
});

describe('Löschen', () => {
  it('zählt Elemente und Bedingungen, die darauf verweisen; Seite nimmt ihre Elemente mit', () => {
    const { plan, ids } = beispiel();
    const mit = setzeBedingung(plan, ids.q2, { frage: ids.q1, ist: '=', wert: 1 });
    expect(verweiseAuf(mit, ids.q1)).toEqual([ids.q2]);
    const r = loeschen(mit, ids.q1);
    expect(r.entfernt).toBe(1); expect(r.verwaist).toBe(1);
    expect(planPruefen(r.plan).some(b => b.regel === 'verweis-unbekannt' && b.element === ids.q2)).toBe(true);
    const seite = loeschen(mit, ids.s1);
    expect(seite.entfernt).toBe(3); expect(seite.nachher).toBe(ids.s2);
    expect(idsInnerhalb(mit, ids.s1)).toEqual([ids.s1, ids.q1, ids.q2]);
    // Verweise innerhalb der gelöschten Seite zählen nicht als verwaist
    expect(seite.verwaist).toBe(0);
  });
  it('wählt danach das Nachbarelement', () => {
    const { plan, ids } = beispiel();
    expect(loeschen(plan, ids.q1).nachher).toBe(ids.q2);
    expect(loeschen(plan, ids.q2).nachher).toBe(ids.q1);
    expect(loeschen(plan, 'x').nachher).toBe(null);
  });
});

describe('Namen und Text', () => {
  it('der Name folgt dem Fragetext, bis er von Hand geändert wird', () => {
    let p = neuerPlan(); const r = hinzufuegen(p, 'frage', null); p = r.plan;
    p = setzeText(p, r.id, 'de', 'Rauchen Sie?');
    const e = () => alleFragen(p)[0]!;
    expect(e().name).toBe('rauchen_sie');
    p = setzeText(p, r.id, 'de', 'Trinken Sie Alkohol?');
    expect(e().name).toBe('trinken_sie');
    p = setzeName(p, r.id, 'alk');
    p = setzeText(p, r.id, 'de', 'Wie oft trinken Sie?');
    expect(e().name).toBe('alk');
  });
  it('die zweite Sprache ändert den Namen nicht; Vorschlag ist eindeutig', () => {
    let p = neuerPlan(); const a = hinzufuegen(p, 'frage', null); p = a.plan; const b = hinzufuegen(p, 'frage', a.id); p = b.plan;
    p = setzeText(p, a.id, 'de', 'Alter in Jahren'); p = setzeText(p, b.id, 'de', 'Alter in Monaten');
    expect(alleFragen(p).map(f => f.name)).toEqual(['alter_in', 'alter_in2']);
    const vorher = alleFragen(p)[0]!.name; p = setzeText(p, a.id, 'en', 'Age in years');
    expect(alleFragen(p)[0]!.name).toBe(vorher);
  });
  it('Typwechsel räumt Unpassendes auf', () => {
    let { plan, ids } = beispiel();
    plan = setzeTyp(plan, ids.q2, 'text');
    const f = alleFragen(plan).find(x => x.id === ids.q2)!;
    expect(f.zahl).toBeUndefined(); expect(f.text_).toBeDefined();
    plan = setzeTyp(plan, ids.q2, 'regler');
    expect(alleFragen(plan).find(x => x.id === ids.q2)!.zahl).toMatchObject({ min: 1, max: 5 });
    plan = setzeTyp(plan, ids.q1, 'zahl');
    expect(alleFragen(plan).find(x => x.id === ids.q1)!.liste).toBeUndefined();
  });
});

describe('Antwortlisten', () => {
  it('Wiederverwendung: Benutzung wird gezählt, benutzte Liste lässt sich nicht löschen', () => {
    let { plan, ids } = beispiel();
    expect(listeBenutzung(plan, ids.l)).toBe(1);
    plan = waehleListe(plan, ids.q3, ids.l);
    expect(listeBenutzung(plan, ids.l)).toBe(2);
    expect(listeLoeschen(plan, ids.l)).toBeNull();
    plan = waehleListe(plan, ids.q1, undefined); plan = waehleListe(plan, ids.q3, undefined);
    expect(listeBenutzung(plan, ids.l)).toBe(0);
    expect(listeLoeschen(plan, ids.l)!.antwortlisten.find(l => l.id === ids.l)).toBeUndefined();
  });
  it('Kopie: eigene Liste für eine Frage, die andere behält die alte', () => {
    let { plan, ids } = beispiel();
    plan = waehleListe(plan, ids.q3, ids.l);
    const k = listeKopieren(plan, ids.q3)!;
    expect(k.plan.antwortlisten).toHaveLength(2);
    expect(listeBenutzung(k.plan, ids.l)).toBe(1); expect(listeBenutzung(k.plan, k.listeId)).toBe(1);
    const optIds = k.plan.antwortlisten.flatMap(l => l.optionen.map(o => o.id));
    expect(new Set(optIds).size).toBe(optIds.length);
  });
  it('Optionen: nächster Code, Fehlendcodes -8/-9/-7, Fehlend zählt nicht als Stufe, Wechsel setzt den Code passend', () => {
    let p = neuerPlan(); const n = neueListe(p, 'zust'); p = n.plan;
    p = optionHinzu(p, n.id).plan; p = optionHinzu(p, n.id).plan;
    p = optionHinzu(p, n.id, 'weissNicht').plan; p = optionHinzu(p, n.id, 'keineAngabe').plan; p = optionHinzu(p, n.id, 'trifftNichtZu').plan;
    const l = p.antwortlisten[0]!;
    expect(l.optionen.map(o => o.wert)).toEqual([1, 2, FEHLEND_CODE.weissNicht, FEHLEND_CODE.keineAngabe, FEHLEND_CODE.trifftNichtZu]);
    expect(FEHLEND_CODE).toEqual({ weissNicht: -8, keineAngabe: -9, trifftNichtZu: -7 });
    expect(naechsterCode(l)).toBe(3);
    expect(l.optionen[2]!.text['de']).toBe('weiß nicht'); expect(l.optionen[2]!.text['en']).toBe("don't know");
    const o2 = l.optionen[1]!.id;
    p = setzeFehlend(p, n.id, o2, 'keineAngabe');
    expect(p.antwortlisten[0]!.optionen[1]).toMatchObject({ fehlend: 'keineAngabe', wert: -9 });
    p = setzeFehlend(p, n.id, o2, undefined);
    expect(p.antwortlisten[0]!.optionen[1]!.fehlend).toBeUndefined();
    expect(p.antwortlisten[0]!.optionen[1]!.wert).toBeGreaterThanOrEqual(0);
    p = optionLoeschen(p, n.id, o2);
    expect(p.antwortlisten[0]!.optionen.find(o => o.id === o2)).toBeUndefined();
    const ids = p.antwortlisten[0]!.optionen.map(o => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('Listennamen sind eindeutig', () => {
    let p = neuerPlan(); p = neueListe(p, 'liste').plan; p = neueListe(p, 'liste').plan;
    expect(new Set(p.antwortlisten.map(l => l.name)).size).toBe(2);
  });
});

describe('Vorlagen', () => {
  for (const v of VORLAGEN) {
    it(`${v}: jede Stufe hat Text in de und en, der Plan hat keinen Fehler außer fehlenden Texten des Platzhalters`, () => {
      const r = vorlageEinfuegen(neuerPlan({ de: 'T', en: 'T' }), v, null, { fehlend: true });
      const befunde = planPruefen(r.plan).filter(b => b.art === 'fehler' && !['sprache-fehlt'].includes(b.regel));
      expect(befunde).toEqual([]);
      for (const l of r.plan.antwortlisten) for (const o of l.optionen) { expect(o.text['de']?.trim()).toBeTruthy(); expect(o.text['en']?.trim()).toBeTruthy(); }
      const el = alleElemente(r.plan).find(e => e.id === r.id)!;
      expect(el.text['de']).toBeTruthy(); expect(el.text['en']).toBeTruthy();
    });
  }
  it('Likert: 5 Stufen geordnet, Fehlendcodes -8/-9 abwählbar', () => {
    const mit = vorlageEinfuegen(neuerPlan(), 'zustimmung5', null, { fehlend: true }).plan.antwortlisten[0]!;
    expect(mit.geordnet).toBe(true);
    expect(mit.optionen.filter(o => !o.fehlend).map(o => o.wert)).toEqual([1, 2, 3, 4, 5]);
    expect(mit.optionen.filter(o => o.fehlend).map(o => o.wert)).toEqual([-8, -9]);
    const ohne = vorlageEinfuegen(neuerPlan(), 'zustimmung5', null, { fehlend: false }).plan.antwortlisten[0]!;
    expect(ohne.optionen.some(o => o.fehlend)).toBe(false);
  });
  it('Geschlecht hat offene Angabe und Hinweis; Abschluss hat Hinweis aufs Land; Alter ist Zahl', () => {
    const g = vorlageEinfuegen(neuerPlan(), 'geschlecht', null);
    const f = alleFragen(g.plan)[0]!;
    expect(f.anders?.an).toBe(true); expect(g.hinweis).toMatch(/offen/i);
    expect(vorlageEinfuegen(neuerPlan(), 'abschluss', null).hinweis).toMatch(/Land/);
    const a = alleFragen(vorlageEinfuegen(neuerPlan(), 'alter', null).plan)[0]!;
    expect(a).toMatchObject({ typ: 'zahl' }); expect(a.zahl?.ganz).toBe(true);
    const e = alleFragen(vorlageEinfuegen(neuerPlan(), 'einwilligung', null).plan)[0]!;
    expect(e.typ).toBe('einwilligung'); expect(e.pflicht?.an).toBe(true);
  });
  it('Wiederverwendung: zweimal Zustimmung legt die Liste nur einmal an; als Block möglich', () => {
    let r = vorlageEinfuegen(neuerPlan(), 'zustimmung5', null);
    expect(r.listeWiederverwendet).toBe(false);
    r = vorlageEinfuegen(r.plan, 'zustimmung5', r.id, { block: true });
    expect(r.listeWiederverwendet).toBe(true);
    expect(r.plan.antwortlisten).toHaveLength(1);
    expect(listeBenutzung(r.plan, r.plan.antwortlisten[0]!.id)).toBe(2);
    expect(alleElemente(r.plan).filter(e => e.art === 'block')).toHaveLength(1);
    expect(vorlageKannBlock('alter')).toBe(false);
    const namen = alleElemente(r.plan).map(e => e.name.toLowerCase());
    expect(new Set(namen).size).toBe(namen.length);
  });
  it('kommt hinter die Auswahl', () => {
    const { plan, ids } = beispiel();
    const r = vorlageEinfuegen(plan, 'alter' as VorlageId, ids.q1);
    expect(r.plan.elemente[0]!.elemente.map(e => e.id)).toEqual([ids.q1, r.id, ids.q2]);
  });
});

describe('Bedingung', () => {
  it('als Satz, mit Optionstext statt Code', () => {
    const { plan, ids } = beispiel();
    const satz = bedingungSatz(plan, { frage: ids.q1, ist: '=', wert: 1 }, 'de');
    expect(satz).toBe('Nur zeigen, wenn ‚Rauchen Sie?‘ = ‚Ja‘');
    expect(bedingungSatz(plan, { und: [{ frage: ids.q1, ist: '=', wert: 1 }, { frage: ids.q2, ist: '>', wert: 5 }] }, 'de')).toBe('Nur zeigen, wenn ‚Rauchen Sie?‘ = ‚Ja‘ und ‚Wie viele Zigaretten am Tag?‘ > ‚5‘');
    expect(bedingungSatz(plan, { oder: [{ frage: ids.q1, beantwortet: true }, { frage: ids.q2, beantwortet: false }] }, 'de')).toContain(' oder ');
    expect(bedingungSatz(plan, undefined, 'de')).toBe('Wird immer gezeigt.');
    expect(bedingungSatz(plan, { frage: 'weg', beantwortet: true }, 'de')).toContain('Frage fehlt');
  });
  it('Auswahlfelder: Formular und Baum gehen hin und zurück, alle Operatoren', () => {
    const { ids } = beispiel();
    const alle: ReturnType<typeof bedingungAusForm>[] = [
      { frage: ids.q1, ist: '=', wert: 1 }, { frage: ids.q1, ist: '≠', wert: 1 }, { frage: ids.q2, ist: '<', wert: 3 }, { frage: ids.q2, ist: '≤', wert: 3 }, { frage: ids.q2, ist: '>', wert: 3 }, { frage: ids.q2, ist: '≥', wert: 3 },
      { frage: ids.q3, gewaehlt: 2 }, { nicht: { frage: ids.q3, gewaehlt: 2 } }, { frage: ids.q3, beantwortet: true }, { frage: ids.q3, beantwortet: false },
      { und: [{ frage: ids.q1, ist: '=', wert: 1 }, { frage: ids.q2, beantwortet: true }] }, { oder: [{ frage: ids.q1, ist: '=', wert: 1 }, { nicht: { frage: ids.q3, gewaehlt: 1 } }] }
    ];
    for (const b of alle) { const f = formAusBedingung(b); expect(f).not.toBeNull(); expect(f).not.toBe('komplex'); expect(bedingungAusForm(f as never)).toEqual(b); }
    expect(formAusBedingung(undefined)).toBeNull();
    expect(formAusBedingung({ und: [{ oder: [{ frage: ids.q1, beantwortet: true }, { frage: ids.q2, beantwortet: true }] }, { frage: ids.q3, beantwortet: true }] })).toBe('komplex');
    expect(bedingungAusForm({ verknuepfung: 'und', teile: [] })).toBeUndefined();
  });
  it('Operatoren nach Typ; Fragen zur Auswahl nur davor', () => {
    const { plan, ids } = beispiel();
    expect(operatorenFuer(undefined)).toEqual(['beantwortet', 'unbeantwortet']);
    expect(operatorenFuer(alleFragen(plan).find(f => f.id === ids.q3))).toContain('beantwortet');
    expect(operatorenFuer({ typ: 'mehrfach' } as Frage)).toContain('gewaehlt');
    expect(operatorenFuer({ typ: 'text' } as Frage)).not.toContain('=');
    expect(moeglicheFragen(plan, ids.q1)).toEqual([]);
    expect(moeglicheFragen(plan, ids.q2).map(f => f.id)).toEqual([ids.q1]);
    expect(moeglicheFragen(plan, ids.q3).map(f => f.id)).toEqual([ids.q1, ids.q2]);
    expect(moeglicheFragen(plan, ids.s2).map(f => f.id)).toEqual([ids.q1, ids.q2]);
  });
  it('gesetzte Bedingung wirkt in zeigen (Filter in der Vorschau)', () => {
    const { plan, ids } = beispiel();
    const mit = setzeBedingung(plan, ids.q2, { frage: ids.q1, ist: '=', wert: 1 });
    const q2 = alleFragen(mit).find(f => f.id === ids.q2)!;
    expect(zeigen(q2, { [ids.q1]: 1 }, mit)).toBe(true);
    expect(zeigen(q2, { [ids.q1]: 0 }, mit)).toBe(false);
    expect(alleFragen(setzeBedingung(mit, ids.q2, undefined)).find(f => f.id === ids.q2)!.wennGezeigt).toBeUndefined();
  });
});

describe('Kodebuch', () => {
  it('Namen und Labels ändern wirkt auf den Plan; abgeleitete Variablen folgen der Frage', () => {
    let { plan, ids } = beispiel();
    plan = setzeTyp(plan, ids.q3, 'mehrfach'); plan = waehleListe(plan, ids.q3, ids.l);
    const v = () => variablenAusPlan(plan, 'de');
    const medien = v().find(x => x.quelle.element === ids.q3 && x.quelle.option)!;
    expect(medien.name).toMatch(/_/);
    const ersteFrage = v().find(x => x.quelle.element === ids.q1)!;
    plan = benenneVariable(plan, ersteFrage, 'raucher');
    expect(v().some(x => x.name === 'raucher')).toBe(true);
    plan = beschrifteVariable(plan, v().find(x => x.name === 'raucher')!, 'de', 'Raucher/in');
    expect(v().find(x => x.name === 'raucher')!.label).toBe('Raucher/in');
    expect(benenneVariable(plan, medien, 'egal')).toBe(plan);
    expect(beschrifteVariable(plan, medien, 'de', 'x')).toBe(plan);
    plan = benenneVariable(plan, v().find(x => x.quelle.element === ids.q3 && x.quelle.option)!, 'x');
    const doppelt = benenneVariable(plan, v().find(x => x.name === 'raucher')!, v().find(x => x.quelle.element === ids.q2)!.name);
    expect(planPruefen(doppelt).some(b => b.regel === 'name-doppelt')).toBe(true);
  });
  it('Block-Item: Name ohne Blockpräfix', () => {
    let p = neuerPlan(); const b = hinzufuegen(p, 'block', null); p = b.plan;
    const item = variablenAusPlan(p, 'de').find(x => x.quelle.item)!;
    p = benenneVariable(p, item, `${(alleElemente(p)[0] as Block).name}_stolz`);
    expect((alleElemente(p)[0] as Block).items[0]!.name).toBe('stolz');
    const i2 = itemHinzu(p, b.id); expect((alleElemente(i2.plan)[0] as Block).items).toHaveLength(4);
  });
});

describe('Befunde', () => {
  it('Frage ohne Liste ist ein Editor-Fehler; planPruefen-Befunde bleiben erhalten; Sprunglink-Ziel', () => {
    let p = neuerPlan(); const r = hinzufuegen(p, 'frage', null); p = r.plan;
    const b = editorBefunde(p);
    expect(b.some(x => x.regel === 'liste-fehlt' && x.element === r.id && x.quelle === 'editor')).toBe(true);
    expect(b.some(x => x.regel === 'sprache-fehlt' && x.quelle === 'plan')).toBe(true);
    expect(befundZiel(p, r.id)).toEqual({ auswahl: r.id });
    const n = neueListe(p, 'l', [{ id: 'o1', wert: 1, text: { de: '', en: '' } }]); p = waehleListe(n.plan, r.id, n.id);
    expect(befundZiel(p, 'o1')).toEqual({ liste: n.id });
    expect(befundZiel(p, undefined)).toEqual({});
    p = setzeTyp(p, r.id, 'zahl');
    expect(editorBefunde(p).some(x => x.regel === 'liste-fehlt')).toBe(false);
  });
  it('Block-Item-Befund führt zum Block', () => {
    let p = neuerPlan(); const b = hinzufuegen(p, 'block', null); p = b.plan;
    const it = (alleElemente(p)[0] as Block).items[0]!.id;
    expect(befundZiel(p, it)).toEqual({ auswahl: b.id });
  });
  it('doppelter Code in einer Liste ist ein Fehler; unterschiedliche Codes nicht', () => {
    let p = neuerPlan(); const n = neueListe(p, 'l'); p = optionHinzu(n.plan, n.id).plan; p = optionHinzu(p, n.id).plan;
    expect(editorBefunde(p).some(x => x.regel === 'code-doppelt')).toBe(false);
    const o2 = p.antwortlisten[0]!.optionen[1]!.id;
    const doppelt = structuredClone(p); doppelt.antwortlisten[0]!.optionen[1]!.wert = 1;
    const b = editorBefunde(doppelt).find(x => x.regel === 'code-doppelt');
    expect(b?.element).toBe(o2);
    expect(befundZiel(doppelt, o2)).toEqual({ liste: n.id });
  });
});

describe('Sprachen und Bild', () => {
  it('neue Sprache bekommt leere Texte (planPruefen meldet sie), entfernte verschwindet', () => {
    const { plan } = beispiel();
    const drei = setzeSprachen(plan, ['de', 'en', 'fr']);
    expect(planPruefen(drei).some(b => b.regel === 'sprache-fehlt' && /fr/.test(b.text))).toBe(true);
    const eine = setzeSprachen(plan, ['de']);
    expect(Object.keys(eine.titel)).toEqual(['de']);
    expect(setzeSprachen(plan, []).sprachen).toEqual(plan.sprachen);
  });
  it('Bild ohne Alternativtext in einer Sprache ist ein Fehler (bild-alt)', () => {
    let { plan, ids } = beispiel();
    plan = aendere<Frage>(plan, ids.q1, f => { f.bild = { datei: 'k.png', alt: { de: 'Karte', en: '' } }; });
    expect(planPruefen(plan).some(b => b.regel === 'bild-alt' && b.element === ids.q1)).toBe(true);
    plan = aendere<Frage>(plan, ids.q1, f => { f.bild = { datei: 'k.png', alt: { de: 'Karte', en: 'Map' } }; });
    expect(planPruefen(plan).some(b => b.regel === 'bild-alt')).toBe(false);
  });
});

describe('Datei .statable-fragebogen.json', () => {
  const bild = Uint8Array.from({ length: 300 }, (_, i) => (i * 11 + 5) & 255);
  it('Rundreise mit Bildern, Umlauten und Emoji', () => {
    let { plan, ids } = beispiel();
    plan = setzeText(plan, ids.q1, 'de', 'Äpfel ✓ 😀 „zitiert“?');
    const text = planAlsDatei(plan, { [`${plan.id}/k.png`]: bild, ['anderer/x.png']: bild });
    const r = planAusDatei(text);
    expect(r.plan).toEqual(plan);
    expect(Object.keys(r.bilder)).toEqual(['k.png']);
    expect([...r.bilder['k.png']!]).toEqual([...bild]);
    expect(planAusDatei(JSON.stringify(plan)).plan).toEqual(plan);   // reiner Plan ohne Hülle
  });
  it('Fehler: kein JSON, falsches Format, neuere Fassung, kaputte Form, Pfad im Bildnamen', () => {
    const { plan } = beispiel();
    const grund = (t: string) => { try { planAusDatei(t); } catch (e) { return (e as PlanDateiFehler).art; } return 'ok'; };
    expect(grund('{kaputt')).toBe('unlesbar');
    expect(grund('[]')).toBe('unlesbar');
    expect(grund(JSON.stringify({ format: 'anderes' }))).toBe('unlesbar');
    expect(grund(JSON.stringify({ format: 'statable-fragebogen-datei', version: 2, plan }))).toBe('neuer');
    expect(grund(JSON.stringify({ format: 'statable-fragebogen-datei', version: 1, plan: { ...plan, elemente: [{ art: 'seite' }] } }))).toBe('unlesbar');
    expect(grund(JSON.stringify({ format: 'statable-fragebogen-datei', version: 1, plan: { ...plan, id: '../x' } }))).toBe('unlesbar');
    expect(grund(JSON.stringify({ format: 'statable-fragebogen-datei', version: 1, plan, bilder: { '../x.png': 'AAAA' } }))).toBe('unlesbar');
    expect(grund(JSON.stringify({ format: 'statable-fragebogen-datei', version: 1, plan: { ...plan, elemente: [{ art: 'seite', id: 's', name: 's', elemente: [{ art: 'frage', id: 'q', name: 'q', typ: 'gibtsnicht', text: {}, kodebuch: {} }] }] } }))).toBe('unlesbar');
    expect(grund(JSON.stringify({ format: 'statable-fragebogen-datei', version: 1, plan: { ...plan, elemente: [{ art: 'seite', id: 's', name: 's', wennGezeigt: { frage: 'a', ist: 'DROP', wert: 1 }, elemente: [] }] } }))).toBe('unlesbar');
    expect(grund(planAlsDatei(plan))).toBe('ok');
  });
  it('Bildnamen: nur Namen, nie Pfade', () => {
    expect(bildNameOk('k.png')).toBe(true);
    for (const n of ['../k.png', 'a/b.png', 'a\\b.png', '..', '', ' x']) expect(bildNameOk(n)).toBe(false);
    expect(bildNameAus('C:\\Users\\x\\Karte (1).PNG')).toBe('Karte _1_.PNG');
    expect(bildNameAus('..')).toBe('bild');
  });
  it('Übernehmen: vergebene id bekommt eine neue, Bilder wandern mit', () => {
    const { plan } = beispiel();
    const gleich = planUebernehmen(plan, { 'k.png': bild }, [plan.id]);
    expect(gleich.plan.id).not.toBe(plan.id);
    expect(Object.keys(gleich.bilder)).toEqual([`${gleich.plan.id}/k.png`]);
    expect(planUebernehmen(plan, {}, []).plan.id).toBe(plan.id);
  });
});

describe('Projektdatei-Rundreise mit Plan aus dem Editor', () => {
  it('Plan, Vorlagen, Bedingung und Bild kommen unverändert zurück (ZIP, Fassung 2)', () => {
    let { plan, ids } = beispiel();
    plan = vorlageEinfuegen(plan, 'zufriedenheit5', ids.q3, { block: true }).plan;
    plan = setzeBedingung(plan, ids.q2, { frage: ids.q1, ist: '=', wert: 1 });
    plan = aendere<Frage>(plan, ids.q1, f => { f.bild = { datei: 'logo.png', alt: { de: 'Das Logo', en: 'The logo' } }; });
    const bildBytes = Uint8Array.from({ length: 500 }, (_, i) => (i * 7 + 3) & 255);
    const p: Projekt = { name: 'Fb', quelle: 'x.csv', sav: Uint8Array.from({ length: 2000 }, (_, i) => (i * 37) & 255), blaetter: [], entscheid: {}, zeit: 1, fragebogen: [plan], fragebogenBilder: { [`${plan.id}/logo.png`]: bildBytes } };
    const roh = projektAlsDatei(p);
    expect(roh[0]).toBe(0x50); expect(roh[1]).toBe(0x4b);   // PK = Fassung 2
    const z = leseProjektdatei(roh);
    expect(z.fragebogen).toEqual([plan]);
    expect([...z.fragebogenBilder![`${plan.id}/logo.png`]!]).toEqual([...bildBytes]);
    expect(planPruefen(z.fragebogen![0]!)).toEqual(planPruefen(plan));
    expect(alleFragen(z.fragebogen![0]!).length).toBeGreaterThan(2);
  });
});

describe('Reinheit', () => {
  it('finde und de-Hilfe', () => {
    const { plan, ids } = beispiel();
    expect(finde(plan, ids.q3)).toMatchObject({ seiteIndex: 1, index: 0 });
    expect(finde(plan, ids.s2)!.element).toBeUndefined();
    expect(de(plan, ids.q1)).toBe('Rauchen Sie?');
  });
});
