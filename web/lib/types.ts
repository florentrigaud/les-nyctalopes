export type Carac = { base: number; mod: number };
export type CaracKey = 'FOR' | 'DEX' | 'CON' | 'INT' | 'SAG' | 'CHA';

export type Competence = {
  nom: string;
  rang: number;
  mod_carac: number;
  classe: boolean;
  autre: number;
  total: number;
};

export type Arme = {
  nom: string;
  type?: string;
  toucher?: number | string;
  degats?: string;
  crit?: string;
};

export type InventaireItem = { nom: string; poids: number };

export type Richesses = { pp: number; po: number; pa: number; pc: number };

export type Combats = {
  pv_max: number;
  pv_actuel: number;
  initiative: number;
  bba: number;
  bmo: number;
  ca: number;
  ca_contact: number;
  ca_surprise: number;
  saves: { vigueur: number; reflexes: number; volonte: number };
  rm?: number;
};

export type PersoDescription = {
  age?: number;
  taille?: number;
  poids?: number;
  cheveux?: string;
  yeux?: string;
  peau?: string;
};

export type PersoData = {
  edition: string;
  joueur?: string;
  date_creation?: string;
  niveau: number;
  xp_actuel: number;
  xp_niveau_suivant: number;
  alignement: string;
  divinite: string;
  background?: string;
  carac: Record<CaracKey, Carac>;
  combats: Combats;
  competences: Competence[];
  dons: string[];
  armes: Arme[];
  inventaire: InventaireItem[];
  charge_actuelle: number;
  charge_max: number;
  richesses: Richesses;
  description: PersoDescription;
  notes_capacites?: string;
};

export type PersonnageRow = {
  id: string;
  user_id: string;
  nom: string;
  race_id: string;
  classe_id: string;
  niveau?: number | null;
  edition?: string | null;
  data_json: PersoData | string;
};

export type Personnage = PersoData & {
  _db_id: string;
  user_id: string;
  nom: string;
  race_id: string;
  classe_id: string;
};

export type Race = {
  id: string;
  nom: string;
  edition?: string;
  modifs: Partial<Record<CaracKey, number>>;
  desc: string;
  vitesse?: number;
  vision?: string[];
  langues?: string[];
  bonus_raciaux?: { label: string; val: string | number }[];
  capacites?: ({ nom: string; desc?: string } | string)[];
};

export type Classe = {
  id: string;
  nom: string;
  edition?: string;
  pv_niv: number;
  pts_comp: number;
  cle: CaracKey;
  desc: string;
  jets_forts: string[];
  jets_faibles: string[];
  competences: string[];
  armes?: string;
  armures?: string;
  capacites?: ({ nom: string; desc?: string } | string)[];
};
