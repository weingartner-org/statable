<script module lang="ts">
  /** Die Eingaben bleiben beim Wechsel zur Hilfe und zurück erhalten (Zustand nur im Modul, nie im Projekt). */
  const z = $state({ b1: -0.5, a1: 1, b2: 1, a2: 2, theta: 0 });
</script>
<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { komma } from '../lib/ergebnis';
  import { proz } from '../i18n/profil';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';

  const p = (a: number, b: number, t: number) => 1 / (1 + Math.exp(-a * (t - b)));
  const pz = (v: number) => proz(komma(v * 100, 0));
  const W = 600, H = 280, X0 = 44, XR = 20, T0 = 16, U0 = 42;
  const px = (t: number) => X0 + (W - X0 - XR) * ((t + 4) / 8), py = (v: number) => T0 + (H - T0 - U0) * (1 - v);
  const kurve = (a: number, b: number) => Array.from({ length: 81 }, (_, i) => { const t = -4 + i * 0.1; return `${i ? 'L' : 'M'}${px(t).toFixed(1)},${py(p(a, b, t)).toFixed(1)}`; }).join(' ');
  const kennlinie = (a: number, b: number): [number, number][] => Array.from({ length: 41 }, (_, i) => { const t = -4 + i * 0.2; return [t, p(a, b, t)]; });
  const wahl = $derived([{ n: 1, a: z.a1, b: z.b1, f: 'var(--dg-a)' }, { n: 2, a: z.a2, b: z.b2, f: 'var(--dg-b, var(--akzent))' }]);
  const bt = $derived(bildtext('verteilung', {
    titel: L('Kennlinien zweier Aufgaben', 'Characteristic curves of two tasks'),
    xAchse: { name: L('Fähigkeit (Logit)', 'Ability (logit)'), von: -4, bis: 4 }, yAchse: { name: L('Wahrscheinlichkeit einer richtigen Antwort', 'Probability of a right answer'), von: 0, bis: 1 },
    kurven: wahl.map(w => ({ name: L(`Aufgabe ${w.n}`, `Task ${w.n}`), punkte: kennlinie(w.a, w.b) })),
    marken: [{ name: L('Fähigkeit der Person', 'Ability of the person'), x: z.theta }]
  }));
</script>

<div class="vst-raster">
  <div class="vst-links">
    {#each [1, 2] as n (n)}
      <fieldset class="vst-gruppe"><legend>{n === 1 ? L('Aufgabe 1', 'Task 1') : L('Aufgabe 2', 'Task 2')}</legend>
        <label class="eingabe"><span>{L('Schwierigkeit b (bei dieser Fähigkeit löst eine Person die Aufgabe zu 50 %)', 'Difficulty b (at this ability a person solves the task with 50%)')}: <b>{komma(n === 1 ? z.b1 : z.b2, 1)}</b></span>
          <input type="range" min="-3" max="3" step="0.1" aria-label={L(`Schwierigkeit b, Aufgabe ${n}`, `Difficulty b, task ${n}`)} aria-valuetext={L(`Schwierigkeit ${komma(n === 1 ? z.b1 : z.b2, 1)}`, `Difficulty ${komma(n === 1 ? z.b1 : z.b2, 1)}`)} value={n === 1 ? z.b1 : z.b2} oninput={(e) => { const v = Number((e.currentTarget as HTMLInputElement).value); if (n === 1) z.b1 = v; else z.b2 = v; }} /></label>
        <label class="eingabe"><span>{L('Trennschärfe a (wie steil die Kurve ist)', 'Discrimination a (how steep the curve is)')}: <b>{komma(n === 1 ? z.a1 : z.a2, 1)}</b></span>
          <input type="range" min="0.2" max="4" step="0.1" aria-label={L(`Trennschärfe a, Aufgabe ${n}`, `Discrimination a, task ${n}`)} aria-valuetext={L(`Trennschärfe ${komma(n === 1 ? z.a1 : z.a2, 1)}`, `Discrimination ${komma(n === 1 ? z.a1 : z.a2, 1)}`)} value={n === 1 ? z.a1 : z.a2} oninput={(e) => { const v = Number((e.currentTarget as HTMLInputElement).value); if (n === 1) z.a1 = v; else z.a2 = v; }} /></label>
      </fieldset>
    {/each}
    <fieldset class="vst-gruppe"><legend>{L('Eine Person', 'One person')}</legend>
      <label class="eingabe"><span>{L('Fähigkeit der Person', 'Ability of the person')}: <b>{komma(z.theta, 1)}</b></span>
        <input type="range" min="-4" max="4" step="0.1" aria-label={L('Fähigkeit der Person', 'Ability of the person')} aria-valuetext={L(`Fähigkeit ${komma(z.theta, 1)}`, `Ability ${komma(z.theta, 1)}`)} value={z.theta} oninput={(e) => { z.theta = Number((e.currentTarget as HTMLInputElement).value); }} /></label>
    </fieldset>
    <p class="heft-text" style="color:var(--tinte-2)">{L('Fähigkeit und Schwierigkeit liegen auf derselben Skala (Logit, Mittelwert der Personen 0). Das ist das 2PL-Modell der Testtheorie; mit gleicher Trennschärfe für alle Aufgaben wird daraus das Rasch-Modell.', 'Ability and difficulty lie on the same scale (logit, mean of the people 0). This is the 2PL model of test theory; with the same discrimination for all tasks it becomes the Rasch model.')}</p>
  </div>
  <div class="vst-rechts">
    <section class="vst-ergebnis" aria-labelledby="vk-erg"><h2 id="vk-erg">{L('Wie wahrscheinlich ist eine richtige Antwort?', 'How likely is a right answer?')}</h2>
      <ul class="heft-text">
        <li>{L(`Aufgabe 1: ${pz(p(z.a1, z.b1, z.theta))}`, `Task 1: ${pz(p(z.a1, z.b1, z.theta))}`)}</li>
        <li>{L(`Aufgabe 2: ${pz(p(z.a2, z.b2, z.theta))}`, `Task 2: ${pz(p(z.a2, z.b2, z.theta))}`)}</li>
      </ul>
      <p class="heft-text">{z.a1 < 0.7 || z.a2 < 0.7 ? L('Eine flache Kurve trennt schlecht: Personen mit sehr verschiedener Fähigkeit lösen die Aufgabe fast gleich oft.', 'A flat curve separates poorly: people with very different ability solve the task almost equally often.') : L('Eine steile Kurve trennt gut, aber nur rund um ihre Schwierigkeit: dort ändert sich die Wahrscheinlichkeit rasch.', 'A steep curve separates well, but only around its difficulty: there the probability changes quickly.')}</p>
    </section>
    <section class="vst-bild" aria-labelledby="vk-bild"><h2 id="vk-bild" class="nur-vorleser">{L('Bild', 'Picture')}</h2>
      <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz}>
        {#each [0, 0.5, 1] as v (v)}<line x1={X0} x2={W - XR} y1={py(v)} y2={py(v)} stroke="var(--dg-gitter)" /><text x={X0 - 6} y={py(v) + 4} text-anchor="end" class="klein">{komma(v, 1)}</text>{/each}
        {#each [-4, -2, 0, 2, 4] as t (t)}<text x={px(t)} y={H - U0 + 16} text-anchor="middle" class="klein">{t}</text>{/each}
        {#each wahl as w (w.n)}<path d={kurve(w.a, w.b)} fill="none" stroke={w.f} stroke-width="2.5" /><circle cx={px(w.b)} cy={py(0.5)} r="4" fill={w.f} />{/each}
        <line x1={px(z.theta)} x2={px(z.theta)} y1={T0} y2={H - U0} stroke="var(--tinte-2, #666)" stroke-dasharray="4 3" />
        {#each wahl as w (w.n)}<circle cx={px(z.theta)} cy={py(p(w.a, w.b, z.theta))} r="5" fill={w.f} stroke="var(--blatt)" stroke-width="1.5" />{/each}
        <text x={(X0 + W - XR) / 2} y={H - 6} text-anchor="middle" class="klein">{L('Fähigkeit (Logit)', 'Ability (logit)')}</text>
      </svg>
      <BildBeschreibung {...bt} />
    </section>
  </div>
</div>
