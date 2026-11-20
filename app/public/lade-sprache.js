// Ladebildschirm in der Sprache der Person, bevor die App läuft (Prüfung D: stand immer deutsch).
// Eigene Datei, weil die Sicherheitsregel (CSP) kein Skript im HTML erlaubt. Gleiche Regel wie sitzung.svelte.ts (browserSprache):
// ?sprache=xx, sonst die selbst gewählte, sonst das System, wenn Statable die Sprache kann, sonst Englisch.
// FREI = FREIGEGEBEN in i18n/laufzeit.ts (ein Test hält beide gleich).
(function () {
  var T = {
    en: ['Statable is loading', 'Statistics for study and research'],
    fr: ['Statable se charge', 'Statistiques pour les études et la recherche'],
    es: ['Statable se está cargando', 'Estadística para los estudios y la investigación'],
    it: ['Statable si sta caricando', 'Statistica per lo studio e la ricerca'],
    pt: ['O Statable está a carregar', 'Estatística para o estudo e a investigação'],
    nl: ['Statable wordt geladen', 'Statistiek voor studie en onderzoek'],
    el: ['Το Statable φορτώνει', 'Στατιστική για σπουδές και έρευνα'],
    hu: ['A Statable betöltődik', 'Statisztika a tanulmányokhoz és a kutatáshoz'],
    sv: ['Statable laddas', 'Statistik för studier och forskning'],
    pl: ['Statable się wczytuje', 'Statystyka do studiów i badań naukowych'],
    uk: ['Statable завантажується', 'Статистика для навчання та досліджень'],
    ro: ['Statable se încarcă', 'Statistică pentru studii și cercetare'],
    cs: ['Statable se načítá', 'Statistika pro studium a výzkum'],
    bg: ['Statable се зарежда', 'Статистика за следване и научни изследвания'],
    xx: ['[Stätáblë ïs löádïñg]', '[Stätïstïçs för stüdÿ äñd rësëärçh]'],
    // Sprachen von rechts nach links (Welle R, noch nicht freigegeben: nur über ?sprache=ar, ?sprache=fa, ?sprache=xr; Texte vorläufig)
    ar: ['جارٍ تحميل Statable', 'الإحصاء للدراسة والبحث العلمي'],
    fa: ['Statable در حال بارگذاری است', 'آمار برای تحصیل و پژوهش'],
    xr: ['[ابت Statable is loading تبا]', '[ابت Statistics for study and research تبا]']
  };
  var RTL = ['ar', 'fa', 'xr'];   // = RTL_SPRACHEN in i18n/laufzeit.ts (ein Test hält beide gleich)
  var FREI = ['de', 'en', 'fr', 'es', 'it', 'pt', 'nl', 'el', 'hu', 'sv', 'pl', 'uk', 'cs', 'ro', 'bg'];
  var sp = 'de';
  try {
    var q = new URLSearchParams(location.search).get('sprache');
    var e = JSON.parse(localStorage.getItem('statable-einst') || '{}');
    var sys = (navigator.languages && navigator.languages[0] || navigator.language || 'de').slice(0, 2).toLowerCase();
    sp = q && (T[q] || q === 'de') ? q : localStorage.getItem('statable-sprache-gewaehlt') && e.sprache ? e.sprache : FREI.indexOf(sys) >= 0 ? sys : 'en';
  } catch (f) { sp = /^de\b/i.test(navigator.language || 'de') ? 'de' : 'en'; }
  if (!T[sp]) return;
  document.documentElement.lang = sp === 'xx' ? 'en' : sp === 'xr' ? 'ar' : sp;
  document.documentElement.dir = RTL.indexOf(sp) >= 0 ? 'rtl' : 'ltr';
  var l = document.getElementById('lade'); if (!l) return;
  l.setAttribute('aria-label', T[sp][0]);
  var p = l.querySelector('.start-karte > p'); if (p) p.textContent = T[sp][1];
})();
