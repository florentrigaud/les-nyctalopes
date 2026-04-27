'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type StatusEffect = {
  id: string;
  perso_id: string;
  name: string;
  description: string | null;
  applied_by: string | null;
  applied_at: string;
  expires_at: string | null;
  cleared_at: string | null;
};

const PRESETS: { name: string; description: string }[] = [
  { name: 'Étourdi', description: 'Ne peut pas agir, perd Dex en CA, attaqué avec +2.' },
  { name: 'Paralysé', description: 'Aucune action physique. Considéré sans défense.' },
  { name: 'Ralenti', description: 'Une action par tour, ½ vitesse de déplacement.' },
  { name: 'Empoisonné', description: 'Dégâts récurrents, malus aux jets liés au poison.' },
  { name: 'Saignement', description: 'Perd N PV par round jusqu\'à soin ou stabilisation.' },
  { name: 'Brûlure', description: 'Dégâts de feu récurrents.' },
  { name: 'Aveuglé', description: 'Échec auto sur jets de Perception visuels, malus en combat.' },
  { name: 'Effrayé', description: 'Doit fuir. Malus aux jets d\'attaque, sauvegardes, tests.' },
  { name: 'Charmé', description: 'Considère le lanceur comme un ami proche.' },
  { name: 'Confus', description: 'Action déterminée aléatoirement chaque round.' },
];

const DURATIONS: { label: string; ms: number | null }[] = [
  { label: '1 round (6 s)', ms: 6_000 },
  { label: '1 minute', ms: 60_000 },
  { label: '10 minutes', ms: 600_000 },
  { label: '1 heure', ms: 3_600_000 },
  { label: '1 jour', ms: 86_400_000 },
  { label: 'Permanent', ms: null },
];

export default function StatusEffectsBar({
  persoId,
  mode,
}: {
  persoId: string;
  mode: 'view' | 'edit';
}) {
  const supabase = createClient();
  const [effects, setEffects] = useState<StatusEffect[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [tick, setTick] = useState(0);

  // Tick every 5s for countdown rendering
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5_000);
    return () => clearInterval(t);
  }, []);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('status_effects')
      .select('*')
      .eq('perso_id', persoId)
      .is('cleared_at', null)
      .order('applied_at', { ascending: false });
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }
    setEffects((data as StatusEffect[]) || []);
    setLoading(false);
  }, [persoId, supabase]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`status_effects:${persoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'status_effects',
          filter: `perso_id=eq.${persoId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const e = payload.new as StatusEffect;
            if (!e.cleared_at) setEffects((prev) => [e, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const e = payload.new as StatusEffect;
            if (e.cleared_at) {
              setEffects((prev) => prev.filter((x) => x.id !== e.id));
            } else {
              setEffects((prev) => prev.map((x) => (x.id === e.id ? e : x)));
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) setEffects((prev) => prev.filter((x) => x.id !== oldId));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [persoId, supabase]);

  // T11 — auto-clear : toutes les 15s, marque cleared_at sur ceux dont expires_at est dépassé.
  // Best-effort depuis n'importe quel client GM ouvert.
  useEffect(() => {
    if (mode !== 'edit') return;
    const t = setInterval(async () => {
      const now = new Date().toISOString();
      // On cible directement par perso pour ne pas pousser une requête trop large.
      await supabase
        .from('status_effects')
        .update({ cleared_at: now })
        .eq('perso_id', persoId)
        .is('cleared_at', null)
        .not('expires_at', 'is', null)
        .lt('expires_at', now);
    }, 15_000);
    return () => clearInterval(t);
  }, [persoId, mode, supabase]);

  const visibleEffects = useMemo(() => {
    void tick;
    const now = Date.now();
    return effects.filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now);
  }, [effects, tick]);

  async function clearEffect(id: string) {
    setErr(null);
    const { error } = await supabase
      .from('status_effects')
      .update({ cleared_at: new Date().toISOString() })
      .eq('id', id);
    if (error) setErr(error.message);
  }

  async function applyEffect(name: string, description: string, expiresAt: string | null) {
    setErr(null);
    const { error } = await supabase.from('status_effects').insert({
      perso_id: persoId,
      name,
      description: description || null,
      expires_at: expiresAt,
    });
    if (error) {
      setErr(error.message);
      return false;
    }
    return true;
  }

  if (loading) {
    return (
      <div className="status-effects-bar">
        <span style={{ color: 'var(--textdim)', fontSize: '0.75rem' }}>…</span>
      </div>
    );
  }

  return (
    <div className="status-effects-bar">
      {err && (
        <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.7rem' }}>❌ {err}</p>
      )}

      {visibleEffects.length === 0 && mode === 'view' && (
        <span style={{ color: 'var(--textdim)', fontSize: '0.78rem', fontStyle: 'italic' }}>
          Aucun état en cours.
        </span>
      )}

      <div className="status-effects-list">
        {visibleEffects.map((e) => (
          <StatusEffectChip
            key={e.id}
            effect={e}
            tick={tick}
            canClear={mode === 'edit'}
            onClear={() => clearEffect(e.id)}
          />
        ))}
        {mode === 'edit' && (
          <button className="status-effect-add" onClick={() => setShowApply(true)} title="Appliquer un effet">
            + Effet
          </button>
        )}
      </div>

      {showApply && (
        <ApplyEffectModal
          onClose={() => setShowApply(false)}
          onSubmit={async (name, desc, expiresAt) => {
            const ok = await applyEffect(name, desc, expiresAt);
            if (ok) setShowApply(false);
          }}
        />
      )}
    </div>
  );
}

function StatusEffectChip({
  effect,
  tick,
  canClear,
  onClear,
}: {
  effect: StatusEffect;
  tick: number;
  canClear: boolean;
  onClear: () => void;
}) {
  const remaining = useMemo(() => {
    void tick;
    if (!effect.expires_at) return null;
    const ms = new Date(effect.expires_at).getTime() - Date.now();
    if (ms <= 0) return 'expiré';
    if (ms < 60_000) return `${Math.ceil(ms / 1000)} s`;
    if (ms < 3_600_000) return `${Math.ceil(ms / 60_000)} min`;
    if (ms < 86_400_000) return `${Math.ceil(ms / 3_600_000)} h`;
    return `${Math.ceil(ms / 86_400_000)} j`;
  }, [effect.expires_at, tick]);

  return (
    <div className="status-effect-chip" title={effect.description || effect.name}>
      <span className="status-effect-name">{effect.name}</span>
      {remaining && <span className="status-effect-time">{remaining}</span>}
      {!effect.expires_at && <span className="status-effect-time perm">∞</span>}
      {canClear && (
        <button
          type="button"
          className="status-effect-clear"
          onClick={onClear}
          aria-label="Retirer l'effet"
          title="Retirer"
        >
          ×
        </button>
      )}
    </div>
  );
}

function ApplyEffectModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (name: string, description: string, expiresAt: string | null) => void | Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationIdx, setDurationIdx] = useState(2); // 10 minutes par défaut
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setName(preset.name);
    setDescription(preset.description);
  }

  async function submit() {
    if (!name.trim()) return;
    const ms = DURATIONS[durationIdx].ms;
    const expiresAt = ms == null ? null : new Date(Date.now() + ms).toISOString();
    setSubmitting(true);
    await onSubmit(name.trim(), description.trim(), expiresAt);
    setSubmitting(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Appliquer un effet d&rsquo;état</span>
          <button className="dice-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label className="auth-label">Préréglages courants</label>
          <div className="status-presets">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className={`admin-filter-chip ${name === p.name ? 'active' : ''}`}
                onClick={() => applyPreset(p)}
              >
                {p.name}
              </button>
            ))}
          </div>

          <label className="auth-label">Nom</label>
          <input
            className="dice-label-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Étourdi"
            autoFocus
          />

          <label className="auth-label">Description (optionnelle)</label>
          <textarea
            className="dice-label-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <label className="auth-label">Durée</label>
          <select
            className="admin-select"
            value={durationIdx}
            onChange={(e) => setDurationIdx(parseInt(e.target.value, 10))}
          >
            {DURATIONS.map((d, i) => (
              <option key={i} value={i}>
                {d.label}
              </option>
            ))}
          </select>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button className="btn-validate" disabled={!name.trim() || submitting} onClick={submit}>
              {submitting ? '…' : 'Appliquer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
