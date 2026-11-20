import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/** Der Service Worker liefert die App-Seite nur für die App selbst - nicht für Dateien wie das Plakat-PDF (Johannes 19.10.2026). */
function baueSw(scope: string) {
  const text = readFileSync(new URL('../../sw-vorlage.js', import.meta.url), 'utf8')
    .replace('__VERSION__', 'test').replace('__DATEIEN__', '[]').replace('__BEDARF__', '[]');
  const handler: Record<string, (e: unknown) => void> = {};
  const abgerufen: string[] = [];
  const cache = { match: async (r: unknown) => ((typeof r === 'string' ? r : (r as Request).url) === scope ? new Response('SCHALE') : undefined), keys: async () => [], put: async () => {} };
  const selbst = { registration: { scope }, addEventListener: (n: string, f: (e: unknown) => void) => { handler[n] = f; }, clients: { claim: async () => {} }, skipWaiting: async () => {} };
  const holen = async (r: Request | string) => { abgerufen.push(typeof r === 'string' ? r : r.url); return new Response('NETZ'); };
  new Function('self', 'caches', 'fetch', 'location', text)(selbst, { open: async () => cache, match: async (r: unknown) => cache.match(r), keys: async () => [] }, holen, { origin: new URL(scope).origin });
  const frage = async (url: string, mode: string) => {
    let antwort: Promise<Response> | undefined;
    handler.fetch!({ request: { method: 'GET', url, mode }, respondWith: (p: Promise<Response>) => { antwort = p; } });
    return { text: antwort ? await (await antwort).text() : null, abgerufen };
  };
  return frage;
}

describe('Service Worker: Navigation', () => {
  for (const scope of ['https://statable.eu/', 'https://weingartner.org/programme/statable/']) {
    describe(scope, () => {
      it('die App (Wurzel, mit Suche und Anker, index.html) kommt aus dem Cache', async () => {
        const f = baueSw(scope);
        for (const u of [scope, scope + '?sprache=de#hilfe', scope + 'index.html']) expect((await f(u, 'navigate')).text).toBe('SCHALE');
      });
      it('das Plakat-PDF und das Quelltext-Archiv kommen vom Server, nicht als App-Seite', async () => {
        const f = baueSw(scope);
        for (const u of [scope + 'plakat/statable-plakat-de.pdf', scope + 'statable-quelltext.tar.gz']) {
          const a = await f(u, 'navigate');
          expect(a.text).toBe('NETZ');
          expect(a.abgerufen).toContain(u);
        }
      });
    });
  }
});
