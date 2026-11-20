export interface VorlageEintrag { en: string; de: string }
/** Die englischen PSPP-Texte, die in abgelegten Ausgaben in Tabellen vorkommen, mit der deutschen Übersetzung. */
export function sammle(): VorlageEintrag[];
/** Der Inhalt von src/i18n/pspp-vorlage.json. */
export function aufbau(liste: VorlageEintrag[]): string;
