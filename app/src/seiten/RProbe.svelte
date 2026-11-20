<script lang="ts">
  /* Versteckte Probeseite #r-probe (nicht im Menü): lädt R (webR) erst auf Knopfdruck und rechnet sieben Beispiele mit eingebauten Daten. */
  import { d, L, aktuelleSprache } from '../lib/sitzung.svelte';
  import { text } from '../i18n/laufzeit';
  import { ort, dez } from '../i18n/profil';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import { rMotor, type RFortschritt, type RSpalte } from '../engine/webr';
  import { R_PROBEN } from '../engine/rproben';

  type Zeile = { id: string; titel: string; werte?: Record<string, number>; ms?: number; pakMs?: number; fehler?: string; laeuft?: boolean };
  const motor = rMotor();
  let fort = $state<RFortschritt | undefined>();
  motor.onFortschritt = f => { fort = f; };

  let kosten = $state<{ basis: number; pakete: Record<string, number> } | undefined>();
  let zeilen = $state<Zeile[]>([]);
  let laeuft = $state(false);
  let startMs = $state<number | undefined>();
  let fehler = $state('');

  const mb = (b: number) => (b / 1e6).toLocaleString(ort(), { maximumFractionDigits: 1 });
  const sek = (ms: number) => (ms / 1000).toLocaleString(ort(), { maximumFractionDigits: 2 });
  const zahl = (v: number) => (v !== 0 && Math.abs(v) < 0.001 ? dez(v.toExponential(3)) : v.toLocaleString(ort(), { maximumFractionDigits: Math.abs(v) >= 100 ? 2 : 4 }));

  async function kostenLesen() {
    try {
      const k = await motor.kosten();
      const probe: Record<string, number> = {};
      for (const p of R_PROBEN) probe[p.id] = (await motor.kosten(p.pakete)).paketBytes;
      kosten = { basis: k.basisBytes, pakete: probe };
    } catch (e) { fehler = fehlerText(e); }
  }
  kostenLesen();

  /** Statable-Spalten → data.frame: Zahlen mit fehlendem Wert, Faktor mit Wertelabels. */
  const BEISPIELSPALTEN: RSpalte[] = [
    { name: 'punkte', art: 'zahl', werte: [12, 15, null, 9, 20, 17] },
    { name: 'gruppe', art: 'faktor', werte: [1, 2, 1, 2, 1, null], labels: [{ wert: 1, label: 'Kontrolle' }, { wert: 2, label: 'Förderung' }] },
    { name: 'name', art: 'text', werte: ['a', 'b', 'c', 'd', 'e', 'f'] }
  ];

  const fehlerText = (e: unknown) => (e as Error)?.message || String((e as { name?: string })?.name ?? '') || JSON.stringify(e) || L('Unbekannter Fehler', 'Unknown error');
  async function einzeln(id: string) {
    if (laeuft) return;   // aria-disabled statt disabled: der Knopf behält den Fokus
    laeuft = true; fehler = '';
    const z: Zeile = { id, titel: '', laeuft: true };
    const i = zeilen.findIndex(x => x.id === id);
    try {
      const t0 = performance.now();
      if (!motor_bereit()) { await motor.bereit(); startMs = Math.round(performance.now() - t0); }
      const t1 = performance.now();
      let werte: Record<string, number>;
      if (id === 'daten') {
        z.titel = L('Übergabe: Zahlen, Faktor mit Labels, fehlende Werte', 'Hand-over: numbers, factor with labels, missing values');
        await motor.daten('d', BEISPIELSPALTEN);
        werte = await motor.rechne<Record<string, number>>(`c(zeilen = nrow(d), mittel = mean(d$punkte, na.rm = TRUE), fehlend_punkte = sum(is.na(d$punkte)), stufen = nlevels(d$gruppe), kontrolle = sum(d$gruppe == 'Kontrolle', na.rm = TRUE), ist_faktor = is.factor(d$gruppe), fehlend_gruppe = sum(is.na(d$gruppe)))`);
      } else {
        const p = R_PROBEN.find(x => x.id === id)!;
        z.titel = text(aktuelleSprache(), p.titel.de, p.titel.en);   // Titel stehen als Paar in engine/rproben.ts; Entwickler-Probeseite, fremde Sprachen: Englisch
        await motor.pakete(p.pakete);
        z.pakMs = Math.round(performance.now() - t1);
        werte = await motor.rechne<Record<string, number>>(`{${p.code}}`);
      }
      z.werte = werte; z.ms = Math.round(performance.now() - t1 - (z.pakMs ?? 0));
    } catch (e) { z.fehler = fehlerText(e); }
    z.laeuft = false;
    if (i >= 0) zeilen[i] = z; else zeilen.push(z);
    laeuft = false;
  }
  const motor_bereit = () => fort?.phase === 'bereit' || fort?.phase === 'rechnen' || fort?.phase === 'pakete';
  async function alle() { if (laeuft) return; for (const id of ['daten', ...R_PROBEN.map(p => p.id)]) await einzeln(id); }
</script>

<div class="tisch ohne-rand"><section class="blatt rund rprobe" aria-labelledby="rp-t">
  <SeitenKopf titelId="rp-t" titel={L('R-Probe', 'R trial')} zurueck >
    {#snippet untertitel()}<p>{d('Versuch für eine zweite Rechen-Engine: R läuft als WebAssembly in diesem Browser. Nichts verlässt das Gerät; R und die Pakete kommen von diesem Server und werden erst geladen, wenn du auf „Rechnen“ klickst.', 'Versuch für eine zweite Rechen-Engine: R läuft als WebAssembly in diesem Browser. Nichts verlässt das Gerät; R und die Pakete kommen von diesem Server und werden erst geladen, wenn Sie auf „Rechnen“ klicken.', 'Trial for a second calculation engine: R runs as WebAssembly in this browser. Nothing leaves the device; R and its packages come from this server and are only loaded when you click “Calculate”.')}</p>{/snippet}
  </SeitenKopf>

  {#if kosten}
    <p class="hinweis-zeile">{L(`Kosten beim ersten Mal: R selbst ${mb(kosten.basis)} MB, dazu je Verfahren`, `Cost the first time: R itself ${mb(kosten.basis)} MB, plus per method`)}
      {R_PROBEN.map(p => `${p.id} ${mb(kosten!.pakete[p.id]!)} MB`).join(', ')}. {L('Danach liegt alles im Zwischenspeicher des Browsers.', 'After that everything is kept in the browser cache.')}</p>
  {/if}

  <div class="aktionen">
    <button class="k primaer" type="button" aria-disabled={laeuft ? 'true' : undefined} onclick={alle}>{#if laeuft}<Rechnet imKnopf text={L('R rechnet …', 'R is calculating …')} />{:else}{L('Alle sechs Rechnungen starten', 'Run all six calculations')}{/if}</button>
    {#each ['daten', ...R_PROBEN.map(p => p.id)] as id}<button class="k" type="button" aria-disabled={laeuft ? 'true' : undefined} onclick={() => einzeln(id)}>{id}</button>{/each}
  </div>

  <div class="status">
    {#if laeuft}
      <p><Rechnet text={fort && fort.phase !== 'bereit' && fort.text ? fort.text : L('R rechnet …', 'R is calculating …')} /></p>
      {#if fort && fort.phase !== 'bereit' && fort.gesamt}<progress max={fort.gesamt} value={fort.geladen} aria-label={fort.text}></progress>{/if}
    {:else if fort && fort.phase !== 'bereit'}
      <p>{fort.text}</p>
      {#if fort.gesamt}<progress max={fort.gesamt} value={fort.geladen} aria-label={fort.text}></progress>{/if}
    {:else if fort?.phase === 'bereit'}<p>{startMs != null ? L(`R ist bereit. Start: ${sek(startMs)} s.`, `R is ready. Start: ${sek(startMs)} s.`) : L('R ist bereit.', 'R is ready.')}</p>{/if}
    {#if fehler}<p class="fehler">{fehler}</p>{/if}
  </div>

  {#each zeilen as z (z.id)}
    <section class="probe-erg" aria-labelledby="rp-{z.id}">
      <h2 id="rp-{z.id}">{z.titel}{#if z.ms != null} <small>· {z.pakMs != null ? L(`Pakete ${sek(z.pakMs)} s, Rechnung ${sek(z.ms)} s`, `packages ${sek(z.pakMs)} s, calculation ${sek(z.ms)} s`) : `${sek(z.ms)} s`}</small>{/if}</h2>
      {#if z.fehler}<p class="fehler">{z.fehler}</p>
      {:else if z.werte}
        <table class="tab"><thead><tr><th scope="col">{L('Kennwert', 'Statistic')}</th><th scope="col" class="zahl-sp">{L('Wert', 'Value')}</th></tr></thead>
          <tbody>{#each Object.entries(z.werte) as [k, v] (k)}<tr><th scope="row">{k}</th><td class="zahl-sp">{zahl(Number(v))}</td></tr>{/each}</tbody></table>
      {/if}
    </section>
  {/each}
</section></div>

<style>
  .rprobe { padding-bottom: var(--a6); }
  .hinweis-zeile { color: var(--tinte-2); font-size: var(--gr-klein); max-width: var(--breite-text); margin-bottom: var(--a3); }
  .aktionen { display: flex; flex-wrap: wrap; gap: var(--a2); margin: var(--a3) 0 var(--a4); }
  .status { min-height: 3.2em; margin-bottom: var(--a4); }
  progress { width: 100%; max-width: 420px; height: 10px; accent-color: var(--akzent); display: block; margin-top: var(--a2); }
  .fehler { color: var(--verlust); }
  .probe-erg { margin: var(--a5) 0; }
  .probe-erg h2 { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin-bottom: var(--a2); }
  .probe-erg h2 small { font-weight: 400; color: var(--tinte-2); }
  .tab { border-collapse: collapse; width: 100%; max-width: 420px; }
  .tab th, .tab td { text-align: start; padding: var(--a1) var(--a3); border-bottom: 1px solid var(--linie); font-weight: 400; }
  .tab thead th { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; }
  .tab tbody th { font-weight: 600; }
  .tab .zahl-sp { text-align: right; font-variant-numeric: tabular-nums; }
</style>
