/**
 * SPSS-Variablensets in einer .sav-Datei: Satz 7, Untertyp 5 („variable sets“). Text, je Set eine Zeile
 * „Name= Spalte1 Spalte2“ mit Zeilenumbruch. SPSS zeigt sie unter „Variablensets verwenden“, PSPP liest sie mit.
 * PSPP 2.1.1 hat keinen Befehl, um Sets anzulegen - darum schreibt Statable den Satz beim Export selbst in die Datei
 * (vor den Abschluss-Satz 999) und liest ihn beim Öffnen wieder aus. Aufbau der Datei: PSPP-Handbuch „System File Format“.
 */
export interface Variablenset { name: string; spalten: string[] }

interface Leser { dv: DataView; klein: boolean }
const i32 = (l: Leser, o: number) => l.dv.getInt32(o, l.klein);

/** Geht die Sätze des Kopfteils durch und gibt Anfang und Ende jedes Satzes zurück; null, wenn es keine lesbare .sav ist. */
function saetze(b: Uint8Array): { l: Leser; liste: { typ: number; unter: number; von: number; bis: number }[] } | null {
  if (b.length < 180) return null;
  const kennung = String.fromCharCode(...b.subarray(0, 4));
  if (kennung !== '$FL2' && kennung !== '$FL3') return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const l: Leser = { dv, klein: true };
  const art = i32(l, 64);
  if (art !== 2 && art !== 3) { l.klein = false; const g = i32(l, 64); if (g !== 2 && g !== 3) return null; }
  const liste: { typ: number; unter: number; von: number; bis: number }[] = [];
  let o = 176;
  try {
    for (;;) {
      const typ = i32(l, o), von = o;
      if (typ === 2) {
        const hatLabel = i32(l, o + 8), fehl = Math.abs(i32(l, o + 12));
        o += 32;
        if (hatLabel) { const n = i32(l, o); o += 4 + Math.ceil(n / 4) * 4; }
        o += fehl * 8;
      } else if (typ === 3) {
        const n = i32(l, o + 4); o += 8;
        for (let k = 0; k < n; k++) { o += 8; const len = b[o]!; o += Math.ceil((len + 1) / 8) * 8; }
        // Satz 4 folgt immer: die Spalten, für die die Wertelabels gelten
        if (i32(l, o) !== 4) return null;
        o += 8 + i32(l, o + 4) * 4;
      } else if (typ === 6) {
        o += 8 + i32(l, o + 4) * 80;
      } else if (typ === 7) {
        const unter = i32(l, o + 4), groesse = i32(l, o + 8), zahl = i32(l, o + 12);
        o += 16 + groesse * zahl;
        liste.push({ typ, unter, von, bis: o }); continue;
      } else if (typ === 999) {
        liste.push({ typ, unter: 0, von, bis: o + 8 }); return { l, liste };
      } else return null;
      if (o > b.length) return null;
      liste.push({ typ, unter: 0, von, bis: o });
    }
  } catch { return null; }
}

/** Text des Satzes. Namen mit „=“, Zeilenumbruch oder über 64 Zeichen gehen nicht; Spaltennamen mit Leerzeichen gibt es nicht. */
export function variablensetText(sets: Variablenset[]): string {
  return sets.filter(x => x.spalten.length).map(x => `${x.name.replace(/[=\r\n]/g, ' ').trim().slice(0, 64)}= ${x.spalten.join(' ')}\n`).join('');
}

/** Liest den Text in Sets; Zeilen ohne „=“ fallen weg. */
export function leseVariablensetText(t: string): Variablenset[] {
  return t.split(/\r?\n/).flatMap(z => {
    const k = z.indexOf('='); if (k < 1) return [];
    const name = z.slice(0, k).trim(), spalten = z.slice(k + 1).trim().split(/\s+/).filter(Boolean);
    return name && spalten.length ? [{ name, spalten }] : [];
  });
}

/** Die .sav mit diesen Variablensets (ersetzt vorhandene). Ohne Sets oder bei unlesbarer Datei: unverändert. */
export function mitVariablensets(b: Uint8Array, sets: Variablenset[]): Uint8Array {
  const r = saetze(b); if (!r) return b;
  const text = new TextEncoder().encode(variablensetText(sets));
  const alt = r.liste.filter(x => x.typ === 7 && x.unter === 5);
  if (!text.length && !alt.length) return b;
  const ende = r.liste.find(x => x.typ === 999)!;
  const satz = new Uint8Array(text.length ? 16 + text.length : 0);
  if (text.length) {
    const dv = new DataView(satz.buffer);
    dv.setInt32(0, 7, r.l.klein); dv.setInt32(4, 5, r.l.klein); dv.setInt32(8, 1, r.l.klein); dv.setInt32(12, text.length, r.l.klein);
    satz.set(text, 16);
  }
  // Kopfteil ohne alte Sets, neuer Satz direkt vor 999, danach der Rest (Daten) unverändert
  const teile: Uint8Array[] = [];
  let o = 0;
  for (const a of alt) { teile.push(b.subarray(o, a.von)); o = a.bis; }
  teile.push(b.subarray(o, ende.von), satz, b.subarray(ende.von));
  const aus = new Uint8Array(teile.reduce((n, t) => n + t.length, 0));
  let p = 0; for (const t of teile) { aus.set(t, p); p += t.length; }
  return aus;
}

/** Die Variablensets einer .sav-Datei; keine oder unlesbar: []. Der Text ist UTF-8 (Dateien aus SPSS ab Version 16 und aus PSPP). */
export function leseVariablensets(b: Uint8Array): Variablenset[] {
  const r = saetze(b); if (!r) return [];
  return r.liste.filter(x => x.typ === 7 && x.unter === 5).flatMap(x => leseVariablensetText(new TextDecoder().decode(b.subarray(x.von + 16, x.bis))));
}
