import { nvda } from '@guidepup/guidepup';
try {
  console.log('capabilities', JSON.stringify(await nvda.detect?.()));
  await nvda.start();
  await nvda.next(); await nvda.next();
  console.log('log', JSON.stringify(await nvda.spokenPhraseLog()));
  await nvda.stop();
} catch (e) { console.log('FEHLER', e.message); try { await nvda.stop(); } catch {} }
