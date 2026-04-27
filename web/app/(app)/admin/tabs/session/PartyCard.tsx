'use client';

import { useEffect, useRef, useState } from 'react';
import { pvColor } from '@/lib/pathfinder';
import type { PersoData } from '@/lib/types';
import type { FullPerso, JoueurInfo, Lookup } from './types';

type Props = {
  perso: FullPerso;
  joueur: JoueurInfo | undefined;
  raceLabel: string;
  classeLabel: string;
  onMutate: (mutator: (d: PersoData) => PersoData) => Promise<{ ok: boolean; error?: string }>;
  onRemove: () => Promise<void>;
};

export default function PartyCard({
  perso,
  joueur,
  raceLabel,
  classeLabel,
  onMutate,
  onRemove,
}: Props) {
  const d = perso.data_json || ({} as PersoData);
  const combats = d.combats || ({ pv_max: 1, pv_actuel: 1 } as PersoData['combats']);
  const pvMax = combats.pv_max || 1;
  const pvActuel = Math.max(0, Math.min(pvMax, combats.pv_actuel ?? pvMax));
  const pvPct = (pvActuel / pvMax) * 100;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [pvSlider, setPvSlider] = useState(pvActuel);
  useEffect(() => setPvSlider(pvActuel), [pvActuel]);
  const pvSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [xpDelta, setXpDelta] = useState(0);
  const [showItem, setShowItem] = useState(false);
  const [showDon, setShowDon] = useState(false);

  const [notes, setNotes] = useState(d.notes_capacites || '');
  useEffect(() => setNotes(d.notes_capacites || ''), [d.notes_capacites]);
  const notesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function run(mutator: (d: PersoData) => PersoData) {
    setBusy(true);
    setErr(null);
    const r = await onMutate(mutator);
    setBusy(false);
    if (!r.ok) setErr(r.error || 'Erreur');
    return r.ok;
  }

  function adjustPv(delta: number) {
    const next = Math.max(0, Math.min(pvMax, pvActuel + delta));
    void run((d) => ({
      ...d,
      combats: { ...(d.combats || ({} as PersoData['combats'])), pv_actuel: next },
    }));
  }

  function handleSliderChange(value: number) {
    setPvSlider(value);
    if (pvSaveTimer.current) clearTimeout(pvSaveTimer.current);
    pvSaveTimer.current = setTimeout(() => {
      void run((d) => ({
        ...d,
        combats: { ...(d.combats || ({} as PersoData['combats'])), pv_actuel: value },
      }));
    }, 350);
  }

  function applyXpDelta() {
    if (!xpDelta) return;
    void run((d) => ({ ...d, xp_actuel: Math.max(0, (d.xp_actuel || 0) + xpDelta) }));
    setXpDelta(0);
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
    notesSaveTimer.current = setTimeout(() => {
      void run((d) => ({ ...d, notes_capacites: value }));
    }, 600);
  }

  return (
    <div className="party-card">
      <div className="party-card-header">
        <div>
          <div className="party-card-name">{perso.nom}</div>
          <div className="party-card-meta">
            {raceLabel} · {classeLabel} · niv {perso.niveau ?? '?'}
            {joueur && (
              <span className="party-card-joueur"> · {joueur.pseudo || joueur.email}</span>
            )}
          </div>
        </div>
        <button
          className="btn-cancel"
          disabled={busy}
          onClick={onRemove}
          title="Retirer ce perso de la session"
        >
          Retirer
        </button>
      </div>

      {err && (
        <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.7rem', margin: '0.4rem 0' }}>
          ❌ {err}
        </p>
      )}

      <div className="party-card-section">
        <div className="party-card-section-title">Points de vie</div>
        <div className="pv-bar-wrap">
          <div className="pv-bar-track">
            <div className="pv-bar-fill" style={{ width: `${pvPct}%`, background: pvColor(pvPct) }} />
          </div>
          <div className="pv-bar-label">
            <span>{pvActuel}</span>
            <span style={{ color: 'var(--textdim)' }}>/{pvMax}</span>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={pvMax}
          value={pvSlider}
          onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
          className="pv-slider"
          disabled={busy}
        />
        <div className="party-card-actions">
          <button className="btn-pv-minus" onClick={() => adjustPv(-10)} disabled={busy}>−10</button>
          <button className="btn-pv-minus" onClick={() => adjustPv(-5)} disabled={busy}>−5</button>
          <button className="btn-pv-minus" onClick={() => adjustPv(-1)} disabled={busy}>−1</button>
          <button className="btn-pv-plus" onClick={() => adjustPv(+1)} disabled={busy}>+1</button>
          <button className="btn-pv-plus" onClick={() => adjustPv(+5)} disabled={busy}>+5</button>
          <button className="btn-pv-plus" onClick={() => adjustPv(+10)} disabled={busy}>+10</button>
        </div>
      </div>

      <div className="party-card-section">
        <div className="party-card-section-title">Expérience</div>
        <div className="party-card-row">
          <span className="party-card-stat">{d.xp_actuel ?? 0} xp</span>
          <input
            type="number"
            className="dice-label-input party-card-input"
            value={xpDelta || ''}
            onChange={(e) => setXpDelta(parseInt(e.target.value, 10) || 0)}
            placeholder="± delta"
          />
          <button className="btn-validate" disabled={busy || !xpDelta} onClick={applyXpDelta}>
            Appliquer
          </button>
        </div>
      </div>

      <div className="party-card-section">
        <div className="party-card-section-title">Inventaire ({d.inventaire?.length ?? 0})</div>
        <ul className="party-card-list">
          {(d.inventaire || []).slice(-4).map((it, i) => (
            <li key={i}>
              {it.nom} <span style={{ color: 'var(--textdim)' }}>· {it.poids} kg</span>
            </li>
          ))}
        </ul>
        <button className="btn-edit" onClick={() => setShowItem(true)} disabled={busy}>
          + Donner un objet
        </button>
      </div>

      <div className="party-card-section">
        <div className="party-card-section-title">Dons / capacités ({d.dons?.length ?? 0})</div>
        <ul className="party-card-list">
          {(d.dons || []).slice(-4).map((don, i) => (
            <li key={i}>{don}</li>
          ))}
        </ul>
        <button className="btn-edit" onClick={() => setShowDon(true)} disabled={busy}>
          + Donner un don
        </button>
      </div>

      <div className="party-card-section">
        <div className="party-card-section-title">Notes capacités (live)</div>
        <textarea
          className="dice-label-input"
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={3}
          placeholder="Effets temporaires, états en cours, rappels…"
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>

      {showItem && (
        <ItemModal
          onClose={() => setShowItem(false)}
          onSubmit={async (item) => {
            const ok = await run((d) => ({
              ...d,
              inventaire: [...(d.inventaire || []), item],
            }));
            if (ok) setShowItem(false);
          }}
        />
      )}

      {showDon && (
        <SimpleTextModal
          title="Donner un don / capacité"
          label="Nom du don ou de la capacité"
          placeholder="Ex : Réflexes surhumains, Bénédiction d'Iomedae…"
          onClose={() => setShowDon(false)}
          onSubmit={async (text) => {
            const ok = await run((d) => ({
              ...d,
              dons: [...(d.dons || []), text],
            }));
            if (ok) setShowDon(false);
          }}
        />
      )}
    </div>
  );
}

function ItemModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (item: { nom: string; poids: number }) => void | Promise<void>;
}) {
  const [nom, setNom] = useState('');
  const [poids, setPoids] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Donner un objet</span>
          <button className="dice-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label className="auth-label">Nom de l’objet</label>
          <input
            className="dice-label-input"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Potion de soin léger"
            autoFocus
          />
          <label className="auth-label">Poids (kg)</label>
          <input
            className="dice-label-input"
            type="number"
            step="0.1"
            value={poids}
            onChange={(e) => setPoids(parseFloat(e.target.value) || 0)}
          />
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Annuler</button>
            <button
              className="btn-validate"
              disabled={!nom.trim() || submitting}
              onClick={async () => {
                setSubmitting(true);
                await onSubmit({ nom: nom.trim(), poids });
                setSubmitting(false);
              }}
            >
              {submitting ? '…' : 'Donner'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleTextModal({
  title,
  label,
  placeholder,
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  placeholder?: string;
  onClose: () => void;
  onSubmit: (text: string) => void | Promise<void>;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button className="dice-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label className="auth-label">{label}</label>
          <input
            className="dice-label-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            autoFocus
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && text.trim()) {
                setSubmitting(true);
                await onSubmit(text.trim());
                setSubmitting(false);
              }
            }}
          />
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>Annuler</button>
            <button
              className="btn-validate"
              disabled={!text.trim() || submitting}
              onClick={async () => {
                setSubmitting(true);
                await onSubmit(text.trim());
                setSubmitting(false);
              }}
            >
              {submitting ? '…' : 'Donner'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
