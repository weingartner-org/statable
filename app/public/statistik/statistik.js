// Auswertung der Besucherzählung (Johannes 25.10.2026). Liest GET /api/statable/statistik (server/pb_hooks/zaehlung.pb.js) mit dem Schlüssel
// aus dem Teil der Adresse nach „#“ (geht nie an den Server, nur als Kopfzeile an die eine Route). Jede Zahl trägt ihre Herkunft:
//   Prüfsumme  = verschiedene Menschen an EINEM Tag (über Tage nicht addierbar zu Personen - die IP wechselt, im Uni-WLAN teilen sich viele eine)
//   Gerät      = Zufallsnummer im Browser: Wiederkehr über Monate; fehlt bei abgeschalteter Zählung, Do Not Track, gesperrtem Speicher
// Ohne Bibliotheken, ohne Inline-Skript (CSP der Seite: script-src 'self').
(function () {
  'use strict';
  var SPEICHER = 'statable-statistik-schluessel';
  var inhalt = document.getElementById('inhalt');
  var stand = document.getElementById('stand');
  var zeitraum = 30;
  var daten = null;

  var esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var zahl = function (n) { return Math.round(n).toLocaleString('de-AT'); };
  var prozent = function (a, b) { return b ? Math.round(100 * a / b) + ' %' : '-'; };
  var dauer = function (ms) {
    if (!ms) return '-';
    var s = Math.round(ms / 1000);
    if (s < 60) return s + ' s';
    var m = Math.round(s / 60);
    if (m < 60) return m + ' min';
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  };
  var datum = function (tag, lang) {
    var d = new Date(tag * 86400000);
    return d.toLocaleDateString('de-AT', lang ? { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
  };

  var NAMEN = {
    sprache: { de: 'Deutsch', en: 'Englisch', fr: 'Französisch', es: 'Spanisch', it: 'Italienisch', pt: 'Portugiesisch', nl: 'Niederländisch', el: 'Griechisch', hu: 'Ungarisch', sv: 'Schwedisch', pl: 'Polnisch', uk: 'Ukrainisch', ro: 'Rumänisch', cs: 'Tschechisch', bg: 'Bulgarisch' },
    geraet: { handy: 'Handy', tablet: 'Tablet', rechner: 'Rechner' },
    art: { browser: 'im Browser', app: 'als installierte App' }
  };
  // Namen aus namen.js (erzeugt von scripts/statistik-namen.mjs): Verfahren, Lerneinheiten, Lernpfade; sonst die Kennung selbst
  var GEN = window.STATISTIK_NAMEN || {};
  var name = function (dim, w) { return (NAMEN[dim] && NAMEN[dim][w]) || (GEN[dim] && GEN[dim][w]) || w || '(ohne Angabe)'; };

  function schluessel() {
    var h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (h) { try { sessionStorage.setItem(SPEICHER, h); } catch (e) { /* egal */ } return h; }
    try { return sessionStorage.getItem(SPEICHER) || ''; } catch (e) { return ''; }
  }

  function frageSchluessel(meldung) {
    stand.textContent = 'Für diese Seite braucht es den Schlüssel.';
    inhalt.innerHTML = '<form class="schluessel"><label for="s"><strong>Schlüssel</strong></label>' +
      (meldung ? '<p class="fehler">' + esc(meldung) + '</p>' : '') +
      '<input id="s" type="password" autocomplete="off" spellcheck="false"><button type="submit">Öffnen</button></form>';
    inhalt.querySelector('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var w = inhalt.querySelector('input').value.trim();
      try { sessionStorage.setItem(SPEICHER, w); } catch (e) { /* egal */ }
      lade();
    });
    inhalt.querySelector('input').focus();
  }

  function lade() {
    var k = schluessel();
    if (!k) { frageSchluessel(''); return; }
    stand.textContent = 'Wird geladen …';
    fetch('/api/statable/statistik?tage=' + zeitraum, { headers: { 'X-Statable-Schluessel': k }, cache: 'no-store' })
      .then(function (r) {
        if (r.status === 403) { try { sessionStorage.removeItem(SPEICHER); } catch (e) { /* egal */ } frageSchluessel('Der Schlüssel stimmt nicht.'); return null; }
        if (r.status === 429) { stand.textContent = 'Zu viele Abrufe - bitte in ein paar Minuten wieder.'; return null; }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) { if (j) { daten = j; zeige(); } })
      .catch(function (e) { stand.textContent = 'Laden ging nicht: ' + e.message; });
  }

  // ── Zusammenfassen ──
  function summen(dim) {
    var m = {};
    daten.reihen.forEach(function (r) {
      if (r.dim !== dim) return;
      var x = m[r.wert] || (m[r.wert] = { wert: r.wert, n: 0, p: 0, g: 0, ms: 0 });
      x.n += r.n; x.p += r.besucherP; x.g += r.besucherG; x.ms += r.dauerMs;
    });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.n - a.n; });
  }
  function jeTag(dim, wert) {
    var m = {};
    daten.reihen.forEach(function (r) { if (r.dim === dim && (wert === undefined || r.wert === wert)) m[r.tag] = r; });
    var aus = [];
    for (var t = daten.von; t <= daten.heute; t++) aus.push(m[t] || { tag: t, n: 0, besucherP: 0, besucherG: 0, dauerMs: 0 });
    return aus;
  }

  // ── Bausteine ──
  function kachel(was, wert, herkunft) {
    return '<div class="kachel"><div class="was">' + esc(was) + '</div><div class="zahl">' + wert + '</div>' + (herkunft ? '<p class="herkunft">' + esc(herkunft) + '</p>' : '') + '</div>';
  }
  function karte(titel, herkunft, koerper, breit) {
    return '<section class="karte' + (breit ? ' breit' : '') + '"><h2>' + esc(titel) + '</h2>' + (herkunft ? '<p class="herkunft">' + esc(herkunft) + '</p>' : '') + koerper + '</section>';
  }
  // Tabelle: spalten = [{ t: Kopf, f: zeile → Zahl, z?: Zahl → Text, balken?: true }], erste Spalte Text
  var tabNr = 0;
  function tabelle(zeilen, erste, spalten) {
    if (!zeilen.length) return '<p class="leer">Noch nichts gezählt.</p>';
    var id = 'tab' + (++tabNr);
    var max = {};
    spalten.forEach(function (s, i) { if (s.balken) max[i] = Math.max.apply(null, zeilen.map(s.f)) || 1; });
    var kopf = '<tr><th data-i="-1">' + esc(erste.t) + '</th>' + spalten.map(function (s, i) { return '<th data-i="' + i + '">' + esc(s.t) + '</th>'; }).join('') + '</tr>';
    var koerper = zeilen.map(function (z) {
      return '<tr><td data-w="' + esc(erste.f(z)) + '">' + esc(erste.f(z)) + '</td>' + spalten.map(function (s, i) {
        var v = s.f(z);
        return '<td data-w="' + v + '">' + (s.z ? s.z(v) : zahl(v)) + (s.balken ? '<span class="balken" style="width:' + Math.round(60 * v / max[i]) + 'px"></span>' : '') + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="tabwrap"><table id="' + id + '"><thead>' + kopf + '</thead><tbody>' + koerper + '</tbody></table></div>';
  }
  function sortierbar() {
    Array.prototype.forEach.call(inhalt.querySelectorAll('table'), function (t) {
      Array.prototype.forEach.call(t.querySelectorAll('th'), function (th, sp) {
        th.addEventListener('click', function () {
          var ab = th.getAttribute('aria-sort') !== 'descending';
          Array.prototype.forEach.call(t.querySelectorAll('th'), function (x) { x.removeAttribute('aria-sort'); });
          th.setAttribute('aria-sort', ab ? 'descending' : 'ascending');
          var tb = t.tBodies[0];
          var rows = Array.prototype.slice.call(tb.rows);
          rows.sort(function (a, b) {
            var x = a.cells[sp].getAttribute('data-w'), y = b.cells[sp].getAttribute('data-w');
            var nx = parseFloat(x), ny = parseFloat(y);
            var c = isNaN(nx) || isNaN(ny) ? String(x).localeCompare(String(y), 'de') : nx - ny;
            return ab ? -c : c;
          });
          rows.forEach(function (r) { tb.appendChild(r); });
        });
      });
    });
  }

  // Verlauf: Säulen (Starts) und Linien (Menschen/Geräte) je Tag
  function verlauf(tage, reihen) {
    var B = 900, H = 240, L = 40, R = 10, O = 10, U = 28;
    var max = 1;
    reihen.forEach(function (r) { tage.forEach(function (t) { max = Math.max(max, r.f(t)); }); });
    // glatte Teilung: Schritt 1, 2 oder 5 mal Zehnerpotenz, vier Schritte bis oben
    var roh = max / 4, zehner = Math.pow(10, Math.floor(Math.log10(roh)));
    var schritt = [1, 2, 5, 10].map(function (f) { return f * zehner; }).filter(function (x) { return x >= roh; })[0];
    if (schritt < 1) schritt = 1;
    var oben = schritt * 4;
    var w = (B - L - R) / tage.length;
    var y = function (v) { return O + (H - O - U) * (1 - v / oben); };
    var s = '<svg viewBox="0 0 ' + B + ' ' + H + '" role="img" aria-label="Verlauf je Tag">';
    for (var i = 0; i <= 4; i++) {
      var v = oben * i / 4, yy = y(v);
      s += '<line x1="' + L + '" x2="' + (B - R) + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--linie)"/><text x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="var(--leise)">' + zahl(v) + '</text>';
    }
    var jeder = Math.max(1, Math.ceil(tage.length / 10));
    tage.forEach(function (t, i) { if (i % jeder === 0) s += '<text x="' + (L + w * (i + .5)) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="var(--leise)">' + datum(t.tag) + '</text>'; });
    reihen.forEach(function (r) {
      if (r.art === 'saeule') tage.forEach(function (t, i) { var v = r.f(t); if (v) s += '<rect x="' + (L + w * i + w * .15) + '" width="' + (w * .7) + '" y="' + y(v) + '" height="' + (y(0) - y(v)) + '" rx="2" fill="' + r.farbe + '" opacity=".35"><title>' + datum(t.tag, true) + ': ' + zahl(v) + ' ' + esc(r.name) + '</title></rect>'; });
      else s += '<polyline fill="none" stroke="' + r.farbe + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" points="' + tage.map(function (t, i) { return (L + w * (i + .5)) + ',' + y(r.f(t)); }).join(' ') + '"/>';
    });
    s += '</svg><p class="legende">' + reihen.map(function (r) { return '<span><i style="background:' + r.farbe + (r.art === 'saeule' ? ';opacity:.35' : '') + '"></i>' + esc(r.name) + '</span>'; }).join('') + '</p>';
    return s;
  }

  function zeige() {
    var tage = jeTag('start', '');
    var starts = tage.reduce(function (a, t) { return a + t.n; }, 0);
    var zeit = tage.reduce(function (a, t) { return a + t.dauerMs; }, 0);
    var g = daten.geraete;
    var gWieder = g.filter(function (x) { return x.tage >= 2; }).length;
    var gNeu = g.filter(function (x) { return x.ersterTag >= daten.von; }).length;
    var rSitzungen = summen('r').reduce(function (a, x) { return a + x.n; }, 0);
    var hilfe = summen('hilfeseite').reduce(function (a, x) { return a + x.n; }, 0);
    var summe = function (dim) { return summen(dim).reduce(function (a, x) { return a + x.n; }, 0); };
    var lernOffen = summe('lernen'), lernFertig = summe('lernfertig'), artikelGelesen = summe('hilfe'), verfahrenGesamt = summe('verfahren');

    stand.textContent = 'Letzte ' + zeitraum + ' Tage (' + datum(daten.von) + ' bis ' + datum(daten.heute) + ') · abgerufen ' + new Date(daten.erzeugt).toLocaleString('de-AT');
    var h = '<div class="leiste" role="group" aria-label="Zeitraum">' + [7, 30, 90, 365, 760].map(function (z) {
      return '<button type="button" data-z="' + z + '" aria-pressed="' + (z === zeitraum) + '">' + (z === 760 ? 'alles' : z + ' Tage') + '</button>';
    }).join('') + '</div>';

    h += '<div class="kacheln">' +
      kachel('Starts der App', zahl(starts), 'jedes Öffnen von statable.eu') +
      kachel('Verschiedene Geräte', zahl(g.length), 'je Zufallsnummer im Browser') +
      kachel('Davon wiedergekommen', prozent(gWieder, g.length), zahl(gWieder) + ' Geräte an 2 oder mehr Tagen') +
      kachel('Neue Geräte', zahl(gNeu), 'zum ersten Mal im Zeitraum') +
      kachel('Aktive Zeit je Start', dauer(starts ? zeit / starts : 0), 'Tab sichtbar, Eingabe in den letzten 10 min') +
      kachel('Aktive Zeit gesamt', dauer(zeit), '') +
      kachel('Sitzungen mit R', zahl(rSitzungen), 'R wurde nachgeladen') +
      kachel('Aufrufe Hilfeseiten', zahl(hilfe), 'feste Seiten für Google') +
      kachel('Auswertungen gerechnet', zahl(verfahrenGesamt), 'neue Blätter im Heft, ohne Daten') +
      kachel('Lerneinheiten geöffnet', zahl(lernOffen), 'je Sitzung höchstens einmal je Einheit') +
      kachel('Lerneinheiten abgeschlossen', zahl(lernFertig), prozent(lernFertig, lernOffen) + ' der geöffneten') +
      kachel('Hilfeartikel gelesen', zahl(artikelGelesen), 'in der App, je Sitzung einmal je Artikel') +
      '</div>';

    h += '<div class="raster">';
    h += karte('Verlauf je Tag', 'Menschen = verschiedene Prüfsummen an diesem Tag (gilt nur für den einen Tag). Geräte = verschiedene Zufallsnummern an diesem Tag.',
      verlauf(tage, [
        { name: 'Starts', art: 'saeule', farbe: 'var(--akzent)', f: function (t) { return t.n; } },
        { name: 'Menschen (Prüfsumme)', farbe: 'var(--zweit)', f: function (t) { return t.besucherP; } },
        { name: 'Geräte', farbe: 'var(--dritt)', f: function (t) { return t.besucherG; } }
      ]), true);

    var neuTage = jeTag('wiederkehr', 'neu'), wiederTage = jeTag('wiederkehr', 'wieder');
    h += karte('Neu oder wiedergekommen, je Tag', 'Je Gerät einmal am Tag: zum ersten Mal da, oder schon an einem früheren Tag da gewesen.',
      verlauf(tage.map(function (t, i) { return { tag: t.tag, neu: neuTage[i].n, wieder: wiederTage[i].n }; }), [
        { name: 'wiedergekommen', art: 'saeule', farbe: 'var(--akzent)', f: function (t) { return t.wieder; } },
        { name: 'zum ersten Mal', farbe: 'var(--zweit)', f: function (t) { return t.neu; } }
      ]), true);

    // Wie oft kommen die Geräte?
    var stufen = [['an 1 Tag', 1, 1], ['an 2 Tagen', 2, 2], ['an 3-5 Tagen', 3, 5], ['an 6-10 Tagen', 6, 10], ['an 11-30 Tagen', 11, 30], ['an mehr als 30 Tagen', 31, 1e9]];
    var verteilung = stufen.map(function (s) {
      var d = g.filter(function (x) { return x.tage >= s[1] && x.tage <= s[2]; });
      return { wert: s[0], n: d.length, starts: d.reduce(function (a, x) { return a + x.starts; }, 0), ms: d.reduce(function (a, x) { return a + x.dauerMs; }, 0), ord: s[1] };
    });
    h += karte('Wie oft kommen dieselben Geräte?', 'Geräte, die im Zeitraum da waren; Tage, Starts und Zeit seit ihrem ersten Besuch.',
      tabelle(verteilung, { t: 'Gerät war da', f: function (z) { return z.wert; } }, [
        { t: 'Geräte', f: function (z) { return z.n; }, balken: true },
        { t: 'Anteil', f: function (z) { return g.length ? 100 * z.n / g.length : 0; }, z: function (v) { return Math.round(v) + ' %'; } },
        { t: 'Starts je Gerät', f: function (z) { return z.n ? z.starts / z.n : 0; }, z: function (v) { return v.toLocaleString('de-AT', { maximumFractionDigits: 1 }); } },
        { t: 'Zeit je Gerät', f: function (z) { return z.n ? z.ms / z.n : 0; }, z: dauer }
      ]));

    // Kohorten: neue Geräte je Woche - wie viele kamen an einem anderen Tag wieder?
    var wochen = {};
    g.forEach(function (x) {
      if (x.ersterTag < daten.von) return;
      var w = x.ersterTag - ((x.ersterTag + 3) % 7);   // Montag der Woche (Tag 0 = Donnerstag 1.1.1970)
      var k = wochen[w] || (wochen[w] = { tag: w, n: 0, wieder: 0 });
      k.n++; if (x.tage >= 2) k.wieder++;
    });
    var kohorten = Object.keys(wochen).map(function (k) { return wochen[k]; }).sort(function (a, b) { return b.tag - a.tag; });
    h += karte('Neue Geräte je Woche - kamen sie wieder?', 'Woche des ersten Besuchs; „wiedergekommen“ = an mindestens einem weiteren Tag da.',
      tabelle(kohorten, { t: 'Woche ab', f: function (z) { return datum(z.tag, true); } }, [
        { t: 'neu', f: function (z) { return z.n; }, balken: true },
        { t: 'wiedergekommen', f: function (z) { return z.wieder; } },
        { t: 'Anteil', f: function (z) { return z.n ? 100 * z.wieder / z.n : 0; }, z: function (v) { return Math.round(v) + ' %'; } }
      ]));

    var dimTabelle = function (dim, titel, herkunft, erste) {
      var z = summen(dim);
      return karte(titel, herkunft, tabelle(z, { t: erste, f: function (x) { return name(dim, x.wert); } }, [
        { t: 'Starts', f: function (x) { return x.n; }, balken: true },
        { t: 'Anteil', f: function (x) { return starts ? 100 * x.n / starts : 0; }, z: function (v) { return Math.round(v) + ' %'; } },
        { t: 'Geräte/Tag', f: function (x) { return x.g; } },
        { t: 'Zeit je Start', f: function (x) { return x.n ? x.ms / x.n : 0; }, z: dauer }
      ]));
    };
    h += dimTabelle('sprache', 'Sprachen', 'Die beim Start eingestellte Sprache. Geräte/Tag = Summe der Geräte je Tag.', 'Sprache');
    h += dimTabelle('geraet', 'Geräte-Art', 'Handy und Tablet nach Bildschirm und Touch.', 'Gerät');
    h += dimTabelle('art', 'Browser oder installiert', 'Installiert = als App auf dem Gerät (PWA).', 'Art');
    h += karte('Woher sie kommen', 'Name der Website, von der der Start kam (ohne Adresse dahinter). Direkt aufgerufen oder Lesezeichen: nicht gezählt.',
      tabelle(summen('herkunft'), { t: 'Website', f: function (x) { return x.wert; } }, [{ t: 'Starts', f: function (x) { return x.n; }, balken: true }]));

    var einfach = function (dim, titel, herkunft, erste) {
      return karte(titel, herkunft, tabelle(summen(dim), { t: erste, f: function (x) { return x.wert || '(ohne)'; } }, [{ t: 'Anzahl', f: function (x) { return x.n; }, balken: true }]));
    };
    var einfachMit = function (dim, titel, herkunft, erste, breit) {
      return karte(titel, herkunft, tabelle(summen(dim), { t: erste, f: function (x) { return name(dim, x.wert); } }, [{ t: 'Anzahl', f: function (x) { return x.n; }, balken: true }]), breit);
    };
    h += einfach('rpaket', 'R-Pakete nachgeladen', 'Je Sitzung höchstens einmal je Paket. R selbst: siehe Kachel „Sitzungen mit R“.', 'Paket');
    h += karte('Gerechnete Auswertungen', 'Wie oft jedes Verfahren gerechnet wurde (jedes neue Blatt im Heft), nur der Name - nie Daten, Spalten oder Dateien. „befehle“ = über die Befehle-Seite.',
      tabelle(summen('verfahren'), { t: 'Verfahren', f: function (x) { return name('verfahren', x.wert); } }, [
        { t: 'Anzahl', f: function (x) { return x.n; }, balken: true },
        { t: 'Anteil', f: function (x) { return verfahrenGesamt ? 100 * x.n / verfahrenGesamt : 0; }, z: function (v) { return Math.round(v) + ' %'; } }]), true);

    // Lerneinheiten: geöffnet und abgeschlossen je Einheit (eine Zeile je Einheit, beide Zählwerke zusammen)
    var lm = {};
    summen('lernen').forEach(function (x) { lm[x.wert] = { wert: x.wert, offen: x.n, fertig: 0 }; });
    summen('lernfertig').forEach(function (x) { (lm[x.wert] || (lm[x.wert] = { wert: x.wert, offen: 0, fertig: 0 })).fertig = x.n; });
    var lernZeilen = Object.keys(lm).map(function (k) { return lm[k]; }).sort(function (a, b) { return b.offen - a.offen || b.fertig - a.fertig; });
    h += karte('Lerneinheiten', 'Je Einheit: wie oft geöffnet (je Sitzung einmal) und wie oft ganz durchgemacht. Beides sind reine Summen - nicht mit einer Person oder einem Gerät verknüpft. Abgeschlossen kann auch ohne Öffnen im selben Zeitraum vorkommen (Einheit vor dem Zeitraum begonnen).',
      tabelle(lernZeilen, { t: 'Einheit', f: function (x) { return name('lernen', x.wert); } }, [
        { t: 'geöffnet', f: function (x) { return x.offen; }, balken: true },
        { t: 'abgeschlossen', f: function (x) { return x.fertig; } },
        { t: 'Anteil', f: function (x) { return x.offen ? 100 * x.fertig / x.offen : 0; }, z: function (v) { return Math.round(v) + ' %'; } }]), true);
    h += einfachMit('pfad', 'Lernpfade', 'Wie oft ein fester Lernpfad geöffnet wurde (je Sitzung einmal).', 'Pfad');
    h += einfachMit('hilfe', 'Hilfeartikel in der App', 'Gelesene Artikel der Hilfe (je Sitzung einmal je Artikel). Die Kennung ist der Name des Artikels.', 'Artikel', true);
    h += einfach('export', 'Exporte', 'Gewählter Eintrag im Export-Menü.', 'Export');
    h += einfach('datei', 'Geöffnete Dateien', 'Nur die Dateiendung.', 'Endung');
    h += einfach('beispiel', 'Geöffnete Beispiele', '', 'Beispiel');
    h += einfach('offline', 'Offline-Fassung', 'Klicks auf „ZIP herunterladen“.', 'Datei');
    h += karte('Hilfeseiten (Google)', 'Aufrufe der festen Hilfeseiten /<sprache>/hilfe/…; Menschen = Prüfsummen je Tag, summiert.',
      tabelle(summen('hilfeseite'), { t: 'Sprache', f: function (x) { return name('sprache', x.wert); } }, [
        { t: 'Aufrufe', f: function (x) { return x.n; }, balken: true }, { t: 'Menschen/Tag', f: function (x) { return x.p; } }]));
    h += einfach('hilfe-herkunft', 'Hilfeseiten: woher', 'Website vor dem Aufruf einer Hilfeseite.', 'Website');
    h += '</div>';
    h += '<p class="herkunft">Nicht gezählt werden Browser mit abgeschalteter Zählung, „Do Not Track“ oder „Global Privacy Control“ und die Offline-Fassung. Gespeichert sind nur diese Zählwerte - keine IP-Adressen, keine Daten der Auswertung.</p>';

    inhalt.innerHTML = h;
    sortierbar();
    Array.prototype.forEach.call(inhalt.querySelectorAll('.leiste button'), function (b) {
      b.addEventListener('click', function () { zeitraum = Number(b.getAttribute('data-z')); lade(); });
    });
  }

  lade();
})();
