'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FullPerso } from './types';

export default function EventComposer({
  kind,
  sessionId,
  partyPersos,
  onClose,
  onCreated,
}: {
  kind: 'qcm' | 'vote';
  sessionId: string;
  partyPersos: FullPerso[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [targetIds, setTargetIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function addOption() {
    setOptions((prev) => [...prev, '']);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
    if (correctIndex >= options.length - 1) setCorrectIndex(0);
  }

  function setOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function toggleTarget(persoId: string) {
    setTargetIds((prev) => {
      const next = new Set(prev);
      if (next.has(persoId)) next.delete(persoId);
      else next.add(persoId);
      return next;
    });
  }

  function selectAll() {
    setTargetIds(new Set());
  }

  async function submit() {
    setErr(null);
    const cleanPrompt = prompt.trim();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!cleanPrompt) {
      setErr('La question est obligatoire.');
      return;
    }
    if (cleanOptions.length < 2) {
      setErr('Au moins 2 options.');
      return;
    }
    if (kind === 'qcm' && (correctIndex < 0 || correctIndex >= cleanOptions.length)) {
      setErr('Sélectionne la bonne réponse.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('live_events').insert({
      gm_session_id: sessionId,
      kind,
      prompt: cleanPrompt,
      options: cleanOptions,
      correct_index: kind === 'qcm' ? correctIndex : null,
      // targetIds vide = broadcast à toute la party. Sinon = sous-set explicite.
      target_perso_ids: Array.from(targetIds),
    });
    setSubmitting(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onCreated();
  }

  const isBroadcast = targetIds.size === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel modal-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{kind === 'qcm' ? 'Lancer un QCM' : 'Lancer un vote'}</span>
          <button className="dice-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="modal-body">
          {err && (
            <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem' }}>❌ {err}</p>
          )}

          <label className="auth-label">Question / prompt</label>
          <textarea
            className="dice-label-input"
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              kind === 'qcm'
                ? 'Quel est le vrai nom du seigneur Vasel ?'
                : 'Quelle direction prenons-nous au croisement ?'
            }
            autoFocus
          />

          <label className="auth-label">Options</label>
          <div className="event-options">
            {options.map((opt, i) => (
              <div key={i} className="event-option-row">
                {kind === 'qcm' && (
                  <input
                    type="radio"
                    name="correct"
                    checked={correctIndex === i}
                    onChange={() => setCorrectIndex(i)}
                    title="Bonne réponse"
                  />
                )}
                <input
                  className="dice-label-input"
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => removeOption(i)}
                  disabled={options.length <= 2}
                  title="Retirer cette option"
                >
                  −
                </button>
              </div>
            ))}
            <button type="button" className="btn-edit" onClick={addOption} style={{ alignSelf: 'flex-start' }}>
              + Ajouter une option
            </button>
            {kind === 'qcm' && (
              <p style={{ color: 'var(--textdim)', fontSize: '0.7rem', fontFamily: 'var(--ffm)' }}>
                Coche la bonne réponse — elle restera cachée jusqu'à ce que tu cliques « Révéler ».
              </p>
            )}
          </div>

          <label className="auth-label">Cible</label>
          <div className="event-targets">
            <button
              type="button"
              className={`admin-filter-chip ${isBroadcast ? 'active' : ''}`}
              onClick={selectAll}
            >
              Toute la party ({partyPersos.length})
            </button>
            <div className="event-targets-list">
              {partyPersos.map((p) => (
                <label key={p.id} className="event-target-checkbox">
                  <input
                    type="checkbox"
                    checked={targetIds.has(p.id)}
                    onChange={() => toggleTarget(p.id)}
                  />
                  {p.nom}
                </label>
              ))}
            </div>
            {!isBroadcast && (
              <p style={{ color: 'var(--textdim)', fontSize: '0.7rem' }}>
                {targetIds.size} perso{targetIds.size > 1 ? 's' : ''} ciblé{targetIds.size > 1 ? 's' : ''}.
              </p>
            )}
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button className="btn-validate" onClick={submit} disabled={submitting}>
              {submitting ? '…' : 'Lancer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
