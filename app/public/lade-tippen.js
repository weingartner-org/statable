// Ladebildschirm: der Slogan tippt sich, während die Punkte aufsteigen (Johannes 18.10.2026, „wie bei Tastenflow“).
// Jeder Buchstabe springt kurz in Petrol und etwas größer auf und setzt sich dann grau - wie die Buchstaben im Tastenflow-Start.
// Takt wie die Punkte im HTML (3,2 s, immer wieder): getippt wird von 6 % bis 50 %, ab 84 % blendet alles mit den Punkten aus.
// Eigene Datei, weil die Sicherheitsregel (CSP) kein Skript im HTML erlaubt. Ohne Skript oder mit „weniger Bewegung“ steht der Slogan einfach da.
(function () {
  var s = document.querySelector('#lade .start-slogan');
  if (!s || !s.animate) return;
  try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (f) { /* alter Browser: animieren */ }
  var text = s.textContent || '';
  var AKZENT = '#17756A', TINTE = '#4C5661', DAUER = 3200, VON = 0.06, BIS = 0.5;
  var schritt = (BIS - 0.06 - VON) / Math.max(1, text.length - 1);
  // Mit der Trendlinie gleichziehen, damit Punkte und Buchstaben im selben Takt laufen.
  var linie = document.querySelector('#lade .start-linie');
  var bezug = linie && linie.getAnimations ? linie.getAnimations()[0] : null;
  s.textContent = '';
  for (var i = 0; i < text.length; i++) {
    var c = text.charAt(i);
    if (c === ' ') { s.appendChild(document.createTextNode(' ')); continue; }
    var z = document.createElement('span');
    z.className = 'start-z';
    z.textContent = c;
    s.appendChild(z);
    var t = VON + i * schritt;
    var a = z.animate([
      { offset: 0, opacity: 0, transform: 'translateY(.35em) scale(.9)', color: AKZENT },
      { offset: t, opacity: 0, transform: 'translateY(.35em) scale(.9)', color: AKZENT, easing: 'ease-out' },
      { offset: t + 0.025, opacity: 1, transform: 'translateY(0) scale(1.12)', color: AKZENT, easing: 'ease-out' },
      { offset: t + 0.06, opacity: 1, transform: 'none', color: TINTE },
      { offset: 0.84, opacity: 1, transform: 'none', color: TINTE },
      { offset: 0.96, opacity: 0, transform: 'none', color: TINTE },
      { offset: 1, opacity: 0, transform: 'none', color: TINTE }
    ], { duration: DAUER, iterations: Infinity });
    if (bezug && bezug.currentTime != null) a.currentTime = bezug.currentTime;
  }
})();
