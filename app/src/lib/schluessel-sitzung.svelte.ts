/**
 * Stufe 3A: der private age-Schlüssel dieser Sitzung. Er liegt NUR hier im Arbeitsspeicher: nie im Projekt, nie in localStorage/IndexedDB,
 * nie im Plan, nie in einer Meldung oder einem Protokoll. Neu laden der Seite löscht ihn; er wird dann aus der Schlüsseldatei neu geöffnet.
 * Das Objekt wird absichtlich nirgends serialisiert (kein JSON.stringify, kein Speichern) und die Felder tauchen in keinem Text auf.
 */
export const schluesselSitzung = $state<{ identitaet: string; empfaenger: string; name: string }>({ identitaet: '', empfaenger: '', name: '' });

export const schluesselGeladen = (): boolean => schluesselSitzung.identitaet !== '';

export function schluesselMerken(identitaet: string, empfaenger: string, name: string): void {
  schluesselSitzung.identitaet = identitaet; schluesselSitzung.empfaenger = empfaenger; schluesselSitzung.name = name;
}

export function schluesselVergessen(): void {
  schluesselSitzung.identitaet = ''; schluesselSitzung.empfaenger = ''; schluesselSitzung.name = '';
}
