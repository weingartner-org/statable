import { mount } from 'svelte';
import './stil/tokens.css';
import './stil/app.css';
import './stil/rtl.css';
import App from './App.svelte';
import { melde, L, s } from './lib/sitzung.svelte';
import { ladeSprache } from './i18n/laufzeit';
import { ladeTexte } from './lib/texte';
import { OFFLINE } from './lib/offline';
import { zaehleStart } from './lib/zaehlen';
import { starteSpendenzaehler } from './lib/spendenerinnerung.svelte';

// Eine Sprache außer Deutsch und Englisch steht in einer eigenen Datei: vor dem Start laden (der Ladebildschirm steht schon). Geht das nicht, Englisch.
try { await Promise.all([ladeSprache(s.einst.sprache), ladeTexte(s.einst.sprache)]); } catch { s.einst.sprache = 'en'; }
mount(App, { target: document.getElementById('app')! });
// Besucherzählung (nur statable.eu, abschaltbar auf der Datenschutzseite; lib/zaehlen.ts)
zaehleStart(() => s.einst.sprache);
// Zeit für die Spendenerinnerung (nur am Gerät, lib/spende.ts)
starteSpendenzaehler();

// Ladebildschirm aus index.html: bleibt, bis die Ladeanimation fertig ist (korallener Punkt bei 1,6 s ihres 3,2-s-Takts),
// und dann noch 0,5 s. Gemessen an der Uhr der Animation selbst, nicht ab dem Seitenaufruf - sie startet erst, wenn das Bild steht.
// Ist die App erst später bereit, als ein Bild schon fertig stand, geht der Schirm sofort. Ohne Animation (Bewegung reduziert): 2,1 s.
const lade = document.getElementById('lade');
if (lade) {
  const weg = () => { lade.classList.add('weg'); setTimeout(() => lade.remove(), 400); };
  const ANIM_FERTIG = 1600 + 500, TAKT = 3200;
  const anim = document.getAnimations?.().find((a) => (a as CSSAnimation).animationName === 'start-auf4');
  const t = anim ? Number(anim.currentTime ?? 0) : performance.now();
  const imTakt = anim ? t % TAKT : t;
  setTimeout(weg, imTakt < ANIM_FERTIG ? ANIM_FERTIG - imTakt : 0);
}

// Zweiter Start sofort und ohne Netz (nur im gebauten Paket; sw.js entsteht beim Bau). Nicht in der Offline-Fassung: dort liefert der Server im Paket alles vom eigenen Rechner (lib/offline.ts).
if (import.meta.env.PROD && !OFFLINE && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // Eine offene Seite fragt der Browser nicht von selbst nach einem neuen Stand (Statable wechselt nur den #-Teil):
      // alle 30 Minuten und bei jeder Rückkehr in den Tab nachsehen (Johannes 10.10.: wer Statable offen hat, soll die neue Fassung bekommen).
      const pruefe = () => { reg.update().catch(() => { /* offline */ }); };
      setInterval(pruefe, 30 * 60 * 1000);
      addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pruefe(); });
    }).catch(() => { /* ohne Cache geht es auch */ });
  });
  // Neuer Stand übernimmt (sw.js ruft skipWaiting + claim): kurz nach dem Öffnen gleich neu laden - sonst sähe man nach
  // einem Deploy erst beim übernächsten Aufruf die neue Fassung. Mitten in der Arbeit nur ein Hinweis; das Projekt ist gespeichert.
  const offenSeit = Date.now();
  const hatteStand = !!navigator.serviceWorker.controller;
  // Später (mitten in der Arbeit) nicht sofort neu laden, sondern sobald der Tab im Hintergrund ist oder man zurückkommt -
  // und nur, wenn das Projekt gespeichert ist (Autospeichern) und kein Konflikt mit einem anderen Tab offen ist.
  let neuDa = false;
  const ruhig = () => s.speicherStand === 'gespeichert' && !s.konflikt;
  const vielleichtNeu = () => { if (neuDa && ruhig()) location.reload(); };
  addEventListener('visibilitychange', vielleichtNeu);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hatteStand) return;
    if (Date.now() - offenSeit < 20000) { location.reload(); return; }
    neuDa = true;
    if (document.visibilityState === 'hidden') vielleichtNeu();
    else melde(L('Eine neue Fassung von Statable ist da. Sie gilt nach dem nächsten Neuladen.', 'A new version of Statable is ready. It applies after the next reload.'));
  });
  // Bedarfsteile (Excel, PDF, Word, Hilfe) lädt der Service Worker erst beim ersten Gebrauch. Ist eine alte Seite noch offen,
  // wenn ein neuer Stand ausgeliefert wurde, gibt es den alten Teil auf dem Server nicht mehr: dann neu laden lassen.
  addEventListener('vite:preloadError', () => {
    melde(L('Statable wurde inzwischen erneuert. Dieser Teil geht erst nach dem Neuladen der Seite.', 'Statable has been updated in the meantime. This part works after you reload the page.'));
  });
}
