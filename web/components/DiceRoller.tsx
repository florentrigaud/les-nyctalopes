'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { COMMON_SIDES, type DieSides, type RollResult, type RollSpec, formatSpec, performRoll } from '@/lib/dice';

type DiceCtx = {
  history: RollResult[];
  open: boolean;
  roll: (spec: RollSpec) => RollResult;
  clear: () => void;
  toggle: () => void;
  setOpen: (v: boolean) => void;
  /** Définit le perso actif pour rattacher les jets à venir (nullable hors fiche). */
  setActivePerso: (persoId: string | null) => void;
};

const DiceContext = createContext<DiceCtx | null>(null);

export function useDice(): DiceCtx {
  const ctx = useContext(DiceContext);
  if (!ctx) throw new Error('useDice must be used within DiceProvider');
  return ctx;
}

const HISTORY_KEY = 'nyctalopes.dice.history';
const MAX_HISTORY = 50;

export function DiceProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<RollResult[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const activePersoRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as RollResult[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
  }, [history, hydrated]);

  const persistRoll = useCallback(async (result: RollResult, persoId: string | null) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('jets_des').insert({
        user_id: user.id,
        perso_id: persoId,
        contexte: result.spec.label || null,
        formule: formatSpec(result.spec),
        resultat: result.total,
        detail: {
          count: result.spec.count,
          sides: result.spec.sides,
          modifier: result.spec.modifier,
          rolls: result.rolls,
        },
      });
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[DiceRoller] persistRoll failed', e);
      }
    }
  }, []);

  const roll = useCallback((spec: RollSpec) => {
    const result = performRoll(spec);
    setHistory((h) => [result, ...h].slice(0, MAX_HISTORY));
    setOpen(true);
    void persistRoll(result, activePersoRef.current);
    return result;
  }, [persistRoll]);

  const clear = useCallback(() => setHistory([]), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const setActivePerso = useCallback((id: string | null) => {
    activePersoRef.current = id;
  }, []);

  return (
    <DiceContext.Provider value={{ history, open, roll, clear, toggle, setOpen, setActivePerso }}>
      {children}
      <DicePanel />
    </DiceContext.Provider>
  );
}

export function DiceToggleButton() {
  const { toggle, history } = useDice();
  return (
    <button type="button" className="topbar-dice-btn" onClick={toggle} title="Rolleur de dés">
      🎲 {history.length > 0 && <span className="dice-badge">{history.length}</span>}
    </button>
  );
}

export function RollBtn({
  label,
  modifier = 0,
  sides = 20,
  count = 1,
  children,
  display,
}: {
  label: string;
  modifier?: number;
  sides?: DieSides;
  count?: number;
  children?: React.ReactNode;
  display?: string;
}) {
  const { roll } = useDice();
  return (
    <button
      type="button"
      className="roll-btn"
      onClick={(e) => {
        e.stopPropagation();
        roll({ count, sides, modifier, label });
      }}
      title={`Lancer ${count}d${sides}${modifier ? (modifier > 0 ? '+' : '') + modifier : ''}`}
    >
      {children ?? display}
    </button>
  );
}

function DicePanel() {
  const { history, open, roll, clear, setOpen } = useDice();
  const [count, setCount] = useState(1);
  const [sides, setSides] = useState<DieSides>(20);
  const [modifier, setModifier] = useState(0);
  const [label, setLabel] = useState('');

  if (!open) return null;

  const doRoll = () => {
    roll({
      count: Math.max(1, Math.min(20, count || 1)),
      sides,
      modifier: modifier || 0,
      label: label.trim() || undefined,
    });
  };

  return (
    <div className="dice-panel">
      <div className="dice-panel-header">
        <span className="dice-panel-title">🎲 Rolleur de dés</span>
        <button type="button" className="dice-close" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
      </div>

      <div className="dice-custom">
        <div className="dice-custom-row">
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            style={{ width: 55 }}
            aria-label="Nombre de dés"
          />
          <span className="dice-sep">d</span>
          <select
            value={sides}
            onChange={(e) => setSides(parseInt(e.target.value, 10) as DieSides)}
            aria-label="Faces"
          >
            {COMMON_SIDES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="dice-sep">+</span>
          <input
            type="number"
            value={modifier}
            onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
            style={{ width: 60 }}
            aria-label="Modificateur"
          />
        </div>

        <input
          type="text"
          className="dice-label-input"
          placeholder="Label (ex: Attaque épée, Vigueur…)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <div className="dice-quick">
          {COMMON_SIDES.map((s) => (
            <button
              key={s}
              type="button"
              className="dice-quick-btn"
              onClick={() => {
                setSides(s);
                roll({ count: 1, sides: s, modifier: 0, label: label.trim() || undefined });
              }}
            >d{s}</button>
          ))}
        </div>

        <button type="button" className="dice-roll-btn" onClick={doRoll}>🎲 Lancer</button>
      </div>

      <div className="dice-history">
        <div className="dice-history-header">
          <span>Historique · {history.length}</span>
          {history.length > 0 && (
            <button type="button" className="dice-clear" onClick={clear}>Effacer</button>
          )}
        </div>
        {history.length === 0 ? (
          <div className="dice-empty">Aucun jet. Cliquez sur un jet dans une fiche ou utilisez le formulaire.</div>
        ) : (
          history.map((r) => (
            <div key={r.id} className="dice-entry">
              <div className="dice-entry-top">
                <span className="dice-entry-label">{r.spec.label || 'Jet'}</span>
                <span className="dice-entry-spec">{formatSpec(r.spec)}</span>
                <span className="dice-entry-total">{r.total}</span>
              </div>
              <div className="dice-entry-detail">
                <span>[{r.rolls.join(', ')}]{r.spec.modifier ? ` ${r.spec.modifier > 0 ? '+' : ''}${r.spec.modifier}` : ''}</span>
                <span className="dice-entry-time">
                  {new Date(r.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
