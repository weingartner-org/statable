export function umformen(src: string, versatz?: number, eintraege?: unknown[]): { code: string; eintraege: Array<{ k: string; de: string; en?: string; sie?: string; ort: number }> };
export function offeneAufrufe(src: string): Array<{ ort: number; text: string }>;
export function schluessel(de: string, en?: string): string;
