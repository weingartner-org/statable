// Erheben 2 (Hilfslauf): Steuerelemente der Filter-Bedingung nach „Filter hinzufügen“ auflisten (nur Messung).
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await (await b.newContext({ locale: 'de-DE', viewport: { width: 1280, height: 900 } })).newPage();
await p.goto(`http://127.0.0.1:${process.env.PORT || 4221}/#fragebogen`); await p.waitForSelector('h1');
await p.getByRole('button', { name: 'Neuen Fragebogen anlegen' }).click();
await p.getByText('Vorlage einfügen').first().click();
await p.selectOption('#fb-vorlage', 'zustimmung5');
for (let i = 0; i < 3; i++) await p.locator('details.vorlagen').getByRole('button', { name: 'Vorlage einfügen' }).click();
await p.getByRole('button', { name: 'Filter hinzufügen' }).click();
await p.waitForTimeout(300);
console.log(await p.evaluate(() => {
  const r = document.querySelector('[data-testid=fb-bedingungssatz]');
  const box = r?.closest('fieldset,section,div.filter,div') ;
  const bereich = (r?.closest('.fo') ?? r?.parentElement?.parentElement ?? document.body);
  return 'Satz: ' + (r?.innerText ?? '-') + '\n' + [...bereich.querySelectorAll('select,input,button')].filter(e => e.offsetParent).map(e => `${e.tagName} id=${e.id} name=${e.name} aria=${e.getAttribute('aria-label') ?? ''} labels=${(e.labels?.[0]?.innerText ?? '').slice(0, 60)} val=${e.value?.slice(0, 40)} txt=${(e.innerText || '').slice(0, 40)}`).join('\n');
}));
await b.close();
