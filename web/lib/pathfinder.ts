import type { CaracKey, Classe, Personnage, Race } from './types';

export function mod(n: number): number {
  return Math.floor((n - 10) / 2);
}

export function ms(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

export function pvColor(pct: number): string {
  if (pct > 66) return 'linear-gradient(90deg,var(--green),var(--green2))';
  if (pct > 33) return 'linear-gradient(90deg,var(--amber),var(--gold2))';
  return 'linear-gradient(90deg,var(--red),var(--red2))';
}

export function parseRaces(rows: Record<string, unknown>[]): Record<string, Race> {
  const out: Record<string, Race> = {};
  for (const r of rows) {
    const raw = r.bonus_modificateurs;
    const modifs =
      (typeof raw === 'string' ? (JSON.parse(raw) as Partial<Record<CaracKey, number>>) : (raw as Partial<Record<CaracKey, number>>)) || {};
    const id = String(r.id);
    out[id] = {
      id,
      nom: (r.nom as string) || id,
      edition: (r.edition as string) || 'PF1',
      modifs,
      desc: (r.description as string) || '',
      vitesse: (r.vitesse as number) || 6,
      vision: (r.vision as string[]) || [],
      langues: (r.langues as string[]) || [],
      bonus_raciaux: (r.bonus_raciaux as Race['bonus_raciaux']) || [],
      capacites: (r.capacites as Race['capacites']) || [],
    };
  }
  return out;
}

export function parseClasses(rows: Record<string, unknown>[]): Record<string, Classe> {
  const out: Record<string, Classe> = {};
  for (const c of rows) {
    const raw = c.bonus_par_niveau;
    const bonus =
      (typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>)) || {};
    const id = String(c.id);
    out[id] = {
      id,
      nom: (c.nom as string) || id,
      edition: (c.edition as string) || (bonus.edition as string) || 'PF1',
      pv_niv: (c.pv_par_niveau as number) || 8,
      pts_comp: (c.pts_comp as number) || (bonus.pts_comp as number) || 2,
      cle: ((c.cle as CaracKey) || (bonus.cle as CaracKey) || 'FOR'),
      desc: (c.description as string) || '',
      jets_forts: (c.jets_forts as string[]) || (bonus.jets_forts as string[]) || [],
      jets_faibles: (c.jets_faibles as string[]) || (bonus.jets_faibles as string[]) || [],
      competences: (c.competences as string[]) || (bonus.competences as string[]) || [],
      armes: (c.armes as string) || (bonus.armes as string) || '',
      armures: (c.armures as string) || (bonus.armures as string) || '',
      capacites: (c.capacites as Classe['capacites']) || (bonus.capacites as Classe['capacites']) || [],
    };
  }
  return out;
}

export function hydratePersonnage(row: {
  id: string;
  user_id: string;
  nom: string;
  race_id: string;
  classe_id: string;
  data_json: unknown;
}): Personnage {
  const d =
    typeof row.data_json === 'string'
      ? (JSON.parse(row.data_json) as Personnage)
      : ((row.data_json as Personnage) || ({} as Personnage));
  return {
    ...(d as Personnage),
    _db_id: row.id,
    user_id: row.user_id,
    nom: row.nom,
    race_id: row.race_id,
    classe_id: row.classe_id,
  };
}
