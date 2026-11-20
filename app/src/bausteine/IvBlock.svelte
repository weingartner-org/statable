<script lang="ts">
  /**
   * B2 Teil 2b: „Ist die Ursache selbst vom Ergebnis beeinflusst? (Instrumentvariablen, 2SLS)“ unter der Regression („Lässt sich etwas vorhersagen?“, Gruppe „Anders rechnen“).
   * Eigene Daten: Ziel, eine endogene Größe (die verdächtige Ursache), übrige Merkmale und Instrumente (Zahlen-Spalten). Rechnet im Browser (lib/ivblock.ts, Kern lib/iv.ts), erst auf Klick.
   * Die erste-Stufe-F steht immer neben dem Ergebnis; Sargan nur bei überzähligen Instrumenten; Wu-Hausman als Vergleich mit der gewöhnlichen Regression. Beschreibend, ohne Deutung.
   * Fachblatt docs/ausbau/FACHBLATT-B2-OEKONOMETRIE.md, Abschnitt Teil 2b.
   */
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';
  import { s, L, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { komma, ohneNull } from '../lib/ergebnis';
  import { herunterladen, heute } from '../lib/export';
  import { rSkriptZip } from '../lib/rskript';
  import { IV_MAX, IV_SCHWACH_F, baueIvSkript, ivBlockRechne, ivDaten, type IvBlockFehler } from '../lib/ivblock';
  import type { IvErgebnis } from '../lib/iv';

  const kennung = $props.id();
  const nm = (c: { name: string; bezeichnung: string }) => c.bezeichnung.trim() || c.name;
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let ziel = $state(''), endo = $state(''), exo = $state<string[]>([]), inst = $state<string[]>([]), laeuft = $state(false);
  let res = $state<{ e: IvErgebnis; ziel: string; endo: string; exo: string[]; inst: string[]; weg: number } | IvBlockFehler | null>(null);
  $effect(() => { void ziel; void endo; void exo.join('|'); void inst.join('|'); res = null; });
  const frei = (nicht: string[]) => zahlen.filter(c => !nicht.includes(c.name));
  const exoKandidaten = $derived(frei([ziel, endo, ...inst]));
  const instKandidaten = $derived(frei([ziel, endo, ...exo]));
  $effect(() => {
    const e2 = exo.filter(n => n !== ziel && n !== endo && !inst.includes(n) && zahlen.some(c => c.name === n)); if (e2.length !== exo.length) exo = e2;
    const i2 = inst.filter(n => n !== ziel && n !== endo && !exo.includes(n) && zahlen.some(c => c.name === n)); if (i2.length !== inst.length) inst = i2;
  });
  const umschaltenExo = (n: string, an: boolean) => { exo = an ? [...exo, n] : exo.filter(x => x !== n); };
  const umschaltenInst = (n: string, an: boolean) => { inst = an ? [...inst, n] : inst.filter(x => x !== n); };
  const wort = (n: string) => { const c = s.spalten.find(x => x.name === n); return c ? nm(c) : n; };

  async function rechnen() {
    if (laeuft || !ziel || !endo || !inst.length) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    const d = ivDaten(s.spalten, s.zeilen, ziel, [endo], exo, inst);
    if ('fehler' in d) res = d;
    else { const e = ivBlockRechne(d); res = 'fehler' in e ? e : { e, ziel, endo, exo: [...exo], inst: [...inst], weg: d.weg }; }
    laeuft = false;
    sage(res && 'fehler' in res ? fehlerText(res) : L('Instrumentvariablen gerechnet.', 'Instrumental variables calculated.'), res && 'fehler' in res ? 'dringend' : undefined);
  }
  const fehlerText = (f: IvBlockFehler) => f.fehler === 'keine-auswahl' ? L('Bitte Ziel, die verdächtige Ursache und mindestens ein Instrument wählen (alles Zahlen-Spalten).', 'Please choose the outcome, the suspect cause and at least one instrument (all number columns).')
    : f.fehler === 'doppelt' ? L('Eine Spalte darf nur an einer Stelle stehen.', 'A column may appear in one place only.')
    : f.fehler === 'zu-viele-faelle' ? L(`Mehr als ${komma(IV_MAX, 0)} Fälle mit allen Angaben: Das rechnet der Browser zu lange. Bitte vorher Fälle auswählen (Daten → Fälle auswählen).`, `More than ${komma(IV_MAX, 0)} cases with all answers: that takes the browser too long. Please select cases first (Data → Select cases).`)
    : f.fehler === 'zu-wenig-faelle' ? L('Zu wenige Fälle für so viele Spalten.', 'Too few cases for so many columns.')
    : f.fehler === 'zu-wenig-instrumente' ? L('Es braucht mindestens so viele Instrumente wie verdächtige Ursachen.', 'There must be at least as many instruments as suspect causes.')
    : f.fehler === 'schwach' ? L('Die Instrumente sind für die Rechnung zu schwach.', 'The instruments are too weak for the calculation.')
    : L('Die Spalten hängen so eng zusammen (oder sind so gleichförmig), dass sich das Modell nicht rechnen lässt. Eine der Spalten weglassen.', 'The columns are so closely related (or so uniform) that the model cannot be calculated. Leave one of the columns out.');

  const ok = $derived(res && !('fehler' in res) ? res : null);
  const z = (v: number, n = 3) => (Number.isFinite(v) ? komma(v, n) : '-');
  const pw = (v: number) => (!Number.isFinite(v) ? '-' : v < 0.001 ? L('< ,001', '< .001') : ohneNull(v, 3));
  const pGleich = (v: number) => (pw(v).startsWith('<') ? pw(v) : '= ' + pw(v));
  const saetze = $derived.by(() => {
    if (!ok) return [] as string[];
    const e = ok.e, st = e.ersteStufen[0]!;
    const aus = [
      L(`${e.n} Fälle gehen ein${ok.weg ? ` (${ok.weg} mit Lücken bleiben außen vor)` : ''}; ${ok.inst.length} Instrument${ok.inst.length === 1 ? '' : 'e'} für „${wort(ok.endo)}“.`, `${e.n} cases are included${ok.weg ? ` (${ok.weg} with gaps are left out)` : ''}; ${ok.inst.length} instrument${ok.inst.length === 1 ? '' : 's'} for “${wort(ok.endo)}”.`),
      L(`Erste Stufe (wie gut sagen die Instrumente „${wort(ok.endo)}“ voraus?): F(${st.df1}; ${st.df2}) = ${z(st.F, 2)}, p ${pGleich(st.p)}, R² = ${z(st.r2, 2)}.`, `First stage (how well do the instruments predict “${wort(ok.endo)}”?): F(${st.df1}, ${st.df2}) = ${z(st.F, 2)}, p ${pGleich(st.p)}, R² = ${z(st.r2, 2)}.`)
    ];
    if (st.F < IV_SCHWACH_F) aus.push(L(`Achtung: Die erste-Stufe-F liegt unter ${IV_SCHWACH_F}. Die Instrumente gelten dann als schwach: Der Schätzwert kann stark verzerrt sein und die Standardfehler stimmen nicht mehr. Dem Ergebnis nicht trauen.`, `Warning: the first-stage F is below ${IV_SCHWACH_F}. The instruments are then regarded as weak: the estimate can be strongly biased and the standard errors are no longer right. Do not trust the result.`));
    aus.push(L(`Wu-Hausman-Test (Unterscheiden sich IV und gewöhnliche Regression?): F(${e.wuHausman.df1}; ${e.wuHausman.df2}) = ${z(e.wuHausman.F, 2)}, p ${pGleich(e.wuHausman.p)}.`, `Wu-Hausman test (do IV and ordinary regression differ?): F(${e.wuHausman.df1}, ${e.wuHausman.df2}) = ${z(e.wuHausman.F, 2)}, p ${pGleich(e.wuHausman.p)}.`));
    if (e.sargan) aus.push(L(`Sargan-Test (passen die überzähligen Instrumente zusammen?): χ²(${e.sargan.df}) = ${z(e.sargan.chi2, 2)}, p ${pGleich(e.sargan.p)}. Er prüft nur relativ: Mindestens ein Instrument muss gültig sein.`, `Sargan test (do the surplus instruments fit together?): χ²(${e.sargan.df}) = ${z(e.sargan.chi2, 2)}, p ${pGleich(e.sargan.p)}. It only tests relatively: at least one instrument must be valid.`));
    else aus.push(L('Mit genau so vielen Instrumenten wie verdächtigen Ursachen gibt es keinen Sargan-Test; ob das Instrument gültig ist, lässt sich nicht aus den Daten prüfen, sondern nur begründen.', 'With exactly as many instruments as suspect causes there is no Sargan test; whether the instrument is valid cannot be checked from the data, it can only be argued.'));
    return aus;
  });

  function rSkript() {
    if (!ok) return;
    try {
      const sk = baueIvSkript({ spalten: s.spalten, zeilen: s.zeilen, ziel: ok.ziel, endo: [ok.endo], exo: ok.exo, inst: ok.inst, r: ok.e, titel: L('Instrumentvariablen', 'Instrumental variables'), datum: heute() });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if zahlen.length >= 3}
  <details class="auf iv" style="margin-top:var(--a4)"><summary>{L('Ist die Ursache selbst vom Ergebnis beeinflusst? (Instrumentvariablen, 2SLS)', 'Is the cause itself influenced by the outcome? (instrumental variables, 2SLS)')}</summary>
    <p class="heft-text">{L('Manchmal wirkt das Ergebnis auf die vermutete Ursache zurück, oder etwas Ungemessenes beeinflusst beide (endogene Größe). Dann ist die gewöhnliche Regression verzerrt. Ein Instrument ist eine Größe von außen: Sie verschiebt die Ursache, hat aber keinen eigenen Weg zum Ergebnis. Die zweistufige Rechnung (2SLS) nutzt nur den Teil der Ursache, den das Instrument erklärt. Das Ergebnis ist nur so gut wie das Instrument: Es muss die Ursache deutlich bewegen (relevant) und darf nur darüber wirken (exogen). Die zweite Bedingung lässt sich aus den Daten nicht beweisen.', 'Sometimes the outcome acts back on the suspected cause, or something unmeasured influences both (endogenous variable). Then ordinary regression is biased. An instrument is a variable from outside: it shifts the cause but has no path of its own to the outcome. The two-stage calculation (2SLS) uses only the part of the cause that the instrument explains. The result is only as good as the instrument: it must move the cause clearly (relevant) and may act only through it (exogenous). The second condition cannot be proved from the data.')}</p>
    <p class="hilfe"><HilfeLink id="instrumentvariablen" text={L('Hilfe: Instrumentvariablen', 'Help: instrumental variables')} /></p>
    <div class="iv-zeile">
      <div class="eingabe"><label for="iv-z-{kennung}">{L('Was soll erklärt werden? (Zahl)', 'What should be explained? (number)')}</label>
        <select id="iv-z-{kennung}" bind:value={ziel}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen as c (c.name)}<option value={c.name}>{nm(c)}</option>{/each}</select></div>
      <div class="eingabe"><label for="iv-e-{kennung}">{L('Welche Ursache ist verdächtig? (endogene Größe)', 'Which cause is suspect? (endogenous variable)')}</label>
        <select id="iv-e-{kennung}" bind:value={endo}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen.filter(c => c.name !== ziel) as c (c.name)}<option value={c.name}>{nm(c)}</option>{/each}</select></div>
    </div>
    {#if ziel && endo}
      <fieldset style="border:0;padding:0;margin:var(--a2) 0"><legend style="font-weight:600">{L('Welche Größe von außen verschiebt die Ursache? (Instrumente)', 'Which variable from outside shifts the cause? (instruments)')}</legend>
        {#each instKandidaten as c (c.name)}<label class="schalter" style="display:inline-flex;margin-inline-end:var(--a4)"><input type="checkbox" checked={inst.includes(c.name)} onchange={(ev) => umschaltenInst(c.name, ev.currentTarget.checked)} />{nm(c)}</label>{/each}
      </fieldset>
      <fieldset style="border:0;padding:0;margin:var(--a2) 0"><legend style="font-weight:600">{L('Was soll sonst noch im Modell stehen? (übrige Merkmale, freiwillig)', 'What else should be in the model? (other features, optional)')}</legend>
        {#each exoKandidaten as c (c.name)}<label class="schalter" style="display:inline-flex;margin-inline-end:var(--a4)"><input type="checkbox" checked={exo.includes(c.name)} onchange={(ev) => umschaltenExo(c.name, ev.currentTarget.checked)} />{nm(c)}</label>{/each}
      </fieldset>
      <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft || !inst.length}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{ok ? L('Instrumentvariablen neu rechnen', 'Recalculate instrumental variables') : L('Instrumentvariablen rechnen', 'Calculate instrumental variables')}{/if}</button></div>
    {/if}
    {#if res && 'fehler' in res}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if ok}
      <div class="iv-saetze">{#each saetze as t (t)}<p class="heft-text">{t}</p>{/each}</div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Wirkung auf „${wort(ok.ziel)}“: Instrumentvariablen und gewöhnliche Regression`, `Effect on “${wort(ok.ziel)}”: instrumental variables and ordinary regression`)}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Merkmal', 'Feature')}</th><th scope="col">b (IV)</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">p</th><th scope="col">{L('Standardfehler (robust)', 'Standard error (robust)')}</th><th scope="col">{L('p (robust)', 'p (robust)')}</th><th scope="col">{L('b (gewöhnlich, OLS)', 'b (ordinary, OLS)')}</th></tr></thead>
        <tbody>{#each ok.e.koef as c, i (c.name)}<tr><th scope="row" style="text-align: start">{i === 0 ? L('(Konstante)', '(Constant)') : wort(c.name)}</th><td style="text-align:end">{z(c.b, 4)}</td><td style="text-align:end">{z(c.se, 4)}</td><td style="text-align:end">{pw(c.p)}</td><td style="text-align:end">{z(c.seRobust, 4)}</td><td style="text-align:end">{pw(c.pR)}</td><td style="text-align:end">{z(ok.e.ols[i]!.b, 4)}</td></tr>{/each}</tbody>
      </table></div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Erste Stufe: Wie gut erklären die Instrumente die Ursache?', 'First stage: how well do the instruments explain the cause?')}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Ursache', 'Cause')}</th><th scope="col">F</th><th scope="col">{L('Freiheitsgrade', 'Degrees of freedom')}</th><th scope="col">p</th><th scope="col">R²</th></tr></thead>
        <tbody>{#each ok.e.ersteStufen as st (st.name)}<tr><th scope="row" style="text-align: start">{wort(st.name)}</th><td style="text-align:end">{z(st.F, 2)}</td><td style="text-align:end">{st.df1}; {st.df2}</td><td style="text-align:end">{pw(st.p)}</td><td style="text-align:end">{z(st.r2, 3)}</td></tr>{/each}</tbody>
      </table></div>
      <div class="knopfzeile"><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Ein Instrument lässt sich nicht aus den Daten als gültig beweisen: Dass es nur über die Ursache wirkt, ist eine Annahme, die man mit Sachwissen begründen muss. Mit schwachen Instrumenten wird das Ergebnis unzuverlässig, deshalb steht die erste-Stufe-F immer dabei. Der Wu-Hausman-Test vergleicht IV und gewöhnliche Regression; ein deutlicher Unterschied spricht dafür, dass die Ursache wirklich endogen ist, ist aber kein Beweis. Die Standardfehler gelten für größere Stichproben; bei wenigen Fällen sind sie unsicher.', 'An instrument cannot be proved valid from the data: that it acts only through the cause is an assumption that must be argued from subject knowledge. With weak instruments the result becomes unreliable, which is why the first-stage F is always shown. The Wu-Hausman test compares IV and ordinary regression; a clear difference suggests that the cause really is endogenous but is no proof. The standard errors hold for larger samples; with few cases they are uncertain.')}</p>
    {/if}
  </details>
{/if}

<style>
  .iv-zeile { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); align-items: end; margin-block: var(--a2); }
  .iv-zeile .eingabe { max-width: 340px; margin: 0; }
</style>
