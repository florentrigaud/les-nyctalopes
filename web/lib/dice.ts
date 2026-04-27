export type DieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;
export const COMMON_SIDES: DieSides[] = [4, 6, 8, 10, 12, 20, 100];

export type RollSpec = {
  count: number;
  sides: DieSides;
  modifier: number;
  label?: string;
};

export type RollResult = {
  id: string;
  spec: RollSpec;
  rolls: number[];
  total: number;
  timestamp: number;
};

export function rollDice(count: number, sides: DieSides): number[] {
  const out: number[] = [];
  const n = Math.max(1, Math.min(100, count));
  for (let i = 0; i < n; i++) out.push(1 + Math.floor(Math.random() * sides));
  return out;
}

export function performRoll(spec: RollSpec): RollResult {
  const rolls = rollDice(spec.count, spec.sides);
  const sum = rolls.reduce((a, b) => a + b, 0);
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()),
    spec,
    rolls,
    total: sum + spec.modifier,
    timestamp: Date.now(),
  };
}

export function formatSpec(spec: RollSpec): string {
  const base = `${spec.count}d${spec.sides}`;
  if (!spec.modifier) return base;
  return `${base}${spec.modifier > 0 ? '+' : ''}${spec.modifier}`;
}

/** Parse "1d8+2", "2d6", "d20-1" → RollSpec. Returns null si format invalide. */
export function parseDiceSpec(s: string, label?: string): RollSpec | null {
  const m = String(s).trim().match(/^(\d+)?d(\d+)\s*([+-]\s*\d+)?$/i);
  if (!m) return null;
  const count = parseInt(m[1] || '1', 10);
  const sides = parseInt(m[2], 10);
  const modifier = m[3] ? parseInt(m[3].replace(/\s+/g, ''), 10) : 0;
  if (!COMMON_SIDES.includes(sides as DieSides)) return null;
  return { count, sides: sides as DieSides, modifier, label };
}
