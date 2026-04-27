'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LiveEvent } from './EventsPanel';
import type { FullPerso, JoueurInfo } from './types';

type ResponseRow = {
  id: number;
  event_id: string;
  user_id: string;
  perso_id: string | null;
  choice_index: number;
  responded_at: string;
};

export default function EventCard({
  event,
  partyPersos,
  joueurs,
  onClose,
  onReveal,
  onDelete,
}: {
  event: LiveEvent;
  partyPersos: FullPerso[];
  joueurs: Record<string, JoueurInfo>;
  onClose: () => void;
  onReveal: () => void;
  onDelete: () => void;
}) {
  const supabase = createClient();
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('live_event_responses')
        .select('*')
        .eq('event_id', event.id);
      if (!cancelled) {
        setResponses((data as ResponseRow[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event.id, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`ler:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_event_responses',
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setResponses((prev) => [...prev, payload.new as ResponseRow]);
          } else if (payload.eventType === 'UPDATE') {
            const u = payload.new as ResponseRow;
            setResponses((prev) => prev.map((r) => (r.id === u.id ? u : r)));
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: number })?.id;
            setResponses((prev) => prev.filter((r) => r.id !== oldId));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id, supabase]);

  // Map des cibles pour résoudre les noms
  const isBroadcast = !event.target_perso_ids || event.target_perso_ids.length === 0;
  const targetPersos = isBroadcast ? partyPersos : partyPersos.filter((p) => event.target_perso_ids.includes(p.id));
  const expectedUserIds = new Set(targetPersos.map((p) => p.user_id));

  const counts = event.options.map((_, i) => responses.filter((r) => r.choice_index === i).length);
  const totalResponses = responses.length;
  const expectedResponses = expectedUserIds.size;
  const respondedUserIds = new Set(responses.map((r) => r.user_id));
  const pendingPersos = targetPersos.filter((p) => !respondedUserIds.has(p.user_id));

  const closedAt = event.closes_at ? new Date(event.closes_at) : null;
  const isOpen = !closedAt;

  return (
    <div className={`event-card ${isOpen ? 'open' : 'closed'} ${event.revealed ? 'revealed' : ''}`}>
      <div className="event-card-header">
        <div>
          <div className="event-card-kind">
            {event.kind === 'qcm' ? '🧩 QCM' : '🗳 Vote'}
            {!isOpen && <span className="event-card-status closed-tag">Clôturé</span>}
            {isOpen && <span className="event-card-status open-tag">Ouvert</span>}
            {event.revealed && <span className="event-card-status revealed-tag">Révélé</span>}
          </div>
          <div className="event-card-prompt">{event.prompt}</div>
          <div className="event-card-meta">
            {isBroadcast ? 'Toute la party' : `${targetPersos.length} ciblé(s)`} · {totalResponses}/
            {expectedResponses} réponses
          </div>
        </div>
        <div className="event-card-actions">
          {isOpen && (
            <button className="btn-cancel" onClick={onClose} title="Clôturer (les joueurs ne peuvent plus répondre)">
              Clôturer
            </button>
          )}
          {event.kind === 'qcm' && !event.revealed && (
            <button className="btn-validate" onClick={onReveal} title="Révéler la bonne réponse aux joueurs">
              Révéler
            </button>
          )}
          {event.kind === 'vote' && !event.revealed && !isOpen && (
            <button className="btn-validate" onClick={onReveal} title="Afficher les résultats aux joueurs">
              Afficher résultats
            </button>
          )}
          <button className="btn-refuse" onClick={onDelete} title="Supprimer">
            Supprimer
          </button>
        </div>
      </div>

      <div className="event-card-options">
        {event.options.map((opt, i) => {
          const count = counts[i];
          const pct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
          const isCorrect = event.kind === 'qcm' && event.correct_index === i;
          return (
            <div
              key={i}
              className={`event-option-bar ${isCorrect ? 'correct' : ''}`}
              title={`${count} réponse${count > 1 ? 's' : ''}`}
            >
              <div className="event-option-fill" style={{ width: `${pct}%` }} />
              <div className="event-option-label">
                <span>
                  {isCorrect && '✓ '}
                  {opt}
                </span>
                <span className="event-option-count">
                  {count} ({Math.round(pct)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {pendingPersos.length > 0 && isOpen && (
        <div className="event-card-pending">
          <span style={{ color: 'var(--textdim)', fontSize: '0.7rem' }}>En attente : </span>
          {pendingPersos.map((p, i) => {
            const j = joueurs[p.user_id];
            return (
              <span key={p.id} className="event-pending-pill">
                {p.nom}
                {j ? ` · ${j.pseudo || j.email}` : ''}
                {i < pendingPersos.length - 1 ? ', ' : ''}
              </span>
            );
          })}
        </div>
      )}

      {loading && (
        <div style={{ fontSize: '0.7rem', color: 'var(--textdim)' }}>Chargement réponses…</div>
      )}
    </div>
  );
}
