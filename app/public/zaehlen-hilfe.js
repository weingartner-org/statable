// Besucherzählung auf den festen Hilfeseiten (/<sp>/hilfe/…) - Gegenstück zu src/lib/zaehlen.ts, gleiche Schlüssel im lokalen Speicher.
// Meldet nur Sprache und Herkunft (Name der Website), keine Zeit. Nur auf statable.eu; abgeschaltet (Datenschutzseite, Do Not Track,
// Global Privacy Control): nichts. Ohne Importe, weil die Hilfeseiten ohne die App laden.
(function () {
  try {
    if (location.hostname !== 'statable.eu') return;
    var n = navigator;
    if (n.globalPrivacyControl === true || n.doNotTrack === '1' || window.doNotTrack === '1') return;
    if (localStorage.getItem('statable-zaehlen-aus') === '1') return;
    var sp = (document.documentElement.lang || '').slice(0, 2);
    var her = '';
    try { if (document.referrer) { her = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, ''); if (her === location.hostname) her = ''; } } catch (e) { her = ''; }
    var text = JSON.stringify({ k: 'seite', sp: sp, her: her });
    if (!(n.sendBeacon && n.sendBeacon('/api/statable/zaehlen', new Blob([text], { type: 'application/json' }))))
      fetch('/api/statable/zaehlen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text, keepalive: true }).catch(function () {});
  } catch (e) { /* still */ }
})();
