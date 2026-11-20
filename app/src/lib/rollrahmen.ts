/**
 * Rahmen mit waagerechter Rollleiste (Tabellen am Handy): Läuft der Inhalt über den Rand, wird der Rahmen mit der Tastatur erreichbar
 * (`tabindex="0"`, Rolle „region“, Beschriftung) und bekommt die Klasse `rollt` (Schatten am Rand, siehe app.css). Passt alles hinein, bleibt er unauffällig.
 * Abnahme 3, K2/M3/M4: Ohne Hinweis sah man nur die ersten Spalten.
 */
export function rollrahmen(el: HTMLElement, beschriftung: string) {
  let text = beschriftung;
  const pruefe = () => {
    const rollt = el.scrollWidth > el.clientWidth + 1;
    el.classList.toggle('rollt', rollt);
    if (rollt) { el.tabIndex = 0; el.setAttribute('role', 'region'); el.setAttribute('aria-label', text); }
    else { el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label'); }
  };
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(pruefe);
  ro?.observe(el); for (const k of Array.from(el.children)) ro?.observe(k);
  pruefe();
  return { update(neu: string) { text = neu; pruefe(); }, destroy() { ro?.disconnect(); } };
}
