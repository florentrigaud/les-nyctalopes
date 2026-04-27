import type { PersoData } from '@/lib/types';

export type SessionRow = {
  id: string;
  nom: string;
  max_size: number;
  character_ids: string[];
  started_at: string;
  ended_at: string | null;
};

export type FullPerso = {
  id: string;
  user_id: string;
  nom: string;
  race_id: string | null;
  classe_id: string | null;
  niveau: number | null;
  data_json: PersoData;
};

export type Lookup = Record<string, string>;
export type JoueurInfo = { email: string; pseudo: string | null };

export function parseDataJson(raw: unknown): PersoData {
  if (raw && typeof raw === 'object') return raw as PersoData;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as PersoData;
    } catch {
      return {} as PersoData;
    }
  }
  return {} as PersoData;
}
