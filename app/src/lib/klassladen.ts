/**
 * Holt die Klassifikationsdateien von diesem Server (nie von einem fremden): `klass/<id>.json` neben der App, erst beim Gebrauch.
 * Getrennt von klassifikation.ts, damit die Rechenlogik und die Quellenangabe keinen Abruf enthalten.
 */
import { klassLaden, KLASS_MAX_BYTES, type KlassId, type Klassifikation } from './klassifikation';

export async function klassHolen(adresse: string): Promise<string> {
  if (!/^klass\/[a-z0-9]+\.json$/.test(adresse)) throw new Error('adresse');
  const r = await fetch(new URL(adresse, document.baseURI), { credentials: 'omit' });
  if (!r.ok) throw new Error(String(r.status));
  const laenge = Number(r.headers.get('content-length'));
  if (Number.isFinite(laenge) && laenge > KLASS_MAX_BYTES) throw new Error('zu gross');
  return r.text();
}
/** Die Klassifikation laden, mit dem Abruf von diesem Server. */
export const klassVonServer = (id: KlassId): Promise<Klassifikation> => klassLaden(id, klassHolen);
