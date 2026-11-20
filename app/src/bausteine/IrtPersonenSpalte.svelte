<script lang="ts">
  /** „Personenwerte als neue Spalte“ unter 2PL und Stufenmodell: Fähigkeit (EAP) je Person und auf Wunsch ihr Standardfehler (lib/irtpersonen.ts). Nur auf Klick; die Spalten entstehen über wendeAn und stehen im Verlauf. */
  import { s, L, melde } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { gueltigerName } from '../lib/skalabau';
  import { wendeAn } from '../lib/datenassistentlauf';
  import { Laedt } from '../lib/laedt.svelte';
  import { personenSpaltenBefehl, type Person } from '../lib/irtpersonen';
  import Rechnet from './Rechnet.svelte';

  /** `rechne`: die Antworten einer Person (in der Reihenfolge von `fragen`) → Fähigkeit und Standardfehler */
  let { fragen, rechne }: { fragen: string[]; rechne: (y: number[]) => Person } = $props();
  const kennung = $props.id();
  let name = $state('Faehigkeit'), mitSe = $state(true), fertig = $state('');
  $effect(() => { void fragen.join('|'); fertig = ''; });
  const vorhanden = $derived(s.spalten.map(x => x.name.toUpperCase()));
  const seName = $derived(`${name}_se`);
  const nameSchlecht = $derived(!gueltigerName(name) ? L('Der Name ist kein gültiger Spaltenname (Buchstaben, Ziffern, Punkt, Unterstrich; kein Leerzeichen).', 'The name is not a valid column name (letters, digits, dot, underscore; no space).')
    : vorhanden.includes(name.toUpperCase()) || (mitSe && (vorhanden.includes(seName.toUpperCase()) || !gueltigerName(seName))) ? L('Diesen Namen gibt es schon (oder der Name mit „_se“ ist ungültig). Statable überschreibt nie.', 'This name already exists (or the name with "_se" is invalid). Statable never overwrites.') : '');
  const lad = new Laedt();
  async function speichern() {
    if (nameSchlecht || lad.sichtbar) return;
    const ix = fragen.map(n => s.spalten.findIndex(c => c.name === n));
    if (ix.some(i => i < 0)) return;
    const cs = ix.map(i => s.spalten[i]!), theta: (number | null)[] = [], se: (number | null)[] = [];
    for (const z of s.zeilen) {
      const r = ix.map(i => z[i]);
      if (r.some((v, k) => typeof v !== 'number' || istFehlend(cs[k]!, v as number))) { theta.push(null); se.push(null); continue; }
      const p = rechne(r as number[]); theta.push(p.theta); se.push(p.se);
    }
    const spalten = [{ name, werte: theta, beschriftung: 'Fähigkeit (EAP)' }];
    if (mitSe) spalten.push({ name: seName, werte: se, beschriftung: 'Standardfehler der Fähigkeit' });
    const ok = await lad.mit(() => wendeAn(L(`${name} gespeichert (Fähigkeit je Person)`, `${name} saved (ability per person)`), personenSpaltenBefehl(spalten)));
    if (ok) { fertig = name; melde(L('Spalte gespeichert.', 'Column saved.')); }
  }
</script>

<h3 style="font-size:var(--s-klein,.9rem);margin:var(--a4) 0 var(--a2)">{L('Fähigkeit jeder Person als neue Spalte', 'Ability of each person as a new column')}</h3>
<p class="heft-text">{L('Schätzt für jede Person mit allen Antworten ihre Fähigkeit aus dem Antwortmuster (Erwartungswert nach den Antworten, EAP) und legt sie als Spalte an. Der Standardfehler sagt, wie unsicher der Wert ist. Personen mit lauter gleichen Antworten werden zur Mitte gezogen; Personen mit fehlenden Antworten bekommen keinen Wert.', 'Estimates the ability of every person with all answers from the answer pattern (expected value after the answers, EAP) and adds it as a column. The standard error tells how uncertain the value is. People with all answers the same are pulled towards the middle; people with missing answers get no value.')}</p>
<div class="eingabe" style="max-width:300px"><label for="ip-n-{kennung}">{L('Name der neuen Spalte', 'Name of the new column')}</label>
  <input id="ip-n-{kennung}" bind:value={name} spellcheck="false" aria-invalid={!!nameSchlecht} aria-describedby="ip-h-{kennung}">
  <p id="ip-h-{kennung}" class="hilfe" role={nameSchlecht ? 'alert' : undefined}>{nameSchlecht}</p></div>
<label class="schalter" style="display:inline-flex"><input type="checkbox" bind:checked={mitSe}> {L('Standardfehler als zweite Spalte (mit „_se“)', 'Standard error as a second column (with "_se")')}</label>
<div class="knopfzeile"><button class="k" type="button" onclick={speichern} disabled={!!nameSchlecht || lad.sichtbar}>{#if lad.sichtbar}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{L('Als neue Spalte speichern', 'Save as new column')}{/if}</button></div>
{#if fertig}<p class="heft-text" role="status">{L(`Die Spalte ${fertig} steht jetzt in der Tabelle; „Rückgängig“ nimmt sie zurück.`, `The column ${fertig} is now in the table; "Undo" takes it back.`)}</p>{/if}
