'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLiveEvents, type LiveEvent } from '@/lib/useLiveEvents';

export default function LiveEventPopup() {
  const supabase = createClient();
  const { events, myResponses, loading } = useLiveEvents();
  const [minimized, setMinimized] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Liste des events à afficher : ouverts non répondus, ou révélés non encore vus.
  // Pour V1 : on focus sur les ouverts non répondus en priorité.
  const actionable = useMemo(() => {
    return events
      .filter((e) => !e.closes_at && !myResponses.has(e.id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [events, myResponses]);

  const revealed = useMemo(() => {
    // Events révélés où le user a répondu mais n'a pas encore vu le résultat.
    // V1 : tous les revealed dont le user a une réponse.
    return events.filter((e) => e.revealed && myResponses.has(e.id));
  }, [events, myResponses]);

  const queue = [...actionable, ...revealed];

  // Auto-sélection : on ouvre le premier de la file
  useEffect(() => {
    if (!queue.length) {
      setActiveId(null);
      setMinimized(false);
      return;
    }
    if (!activeId || !queue.find((e) => e.id === activeId)) {
      setActiveId(queue[0].id);
    }
  }, [queue, activeId]);

  const event = useMemo(() => queue.find((e) => e.id === activeId) || null, [queue, activeId]);

  if (loading || !event) return null;

  const myResponse = myResponses.get(event.id);
  const isAwaitingAnswer = !event.closes_at && !myResponse;

  async function submitAnswer(choiceIdx: number) {
    if (!event) return;
    setErr(null);
    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErr('Session expirée');
      setSubmitting(false);
      return;
    }
    // Cherche le perso qui rend l'event visible (premier match)
    const { data: persosData } = await supabase
      .from('personnages')
      .select('id')
      .eq('user_id', user.id);
    const targetIds = event.target_perso_ids || [];
    const matchingPerso =
      ((persosData as { id: string }[] | null) || []).find((p) =>
        targetIds.length === 0 ? true : targetIds.includes(p.id)
      )?.id ?? null;

    const { error } = await supabase.from('live_event_responses').upsert(
      {
        event_id: event.id,
        user_id: user.id,
        perso_id: matchingPerso,
        choice_index: choiceIdx,
      },
      { onConflict: 'event_id,user_id' }
    );
    setSubmitting(false);
    if (error) {
      setErr(error.message);
    }
  }

  function dismiss() {
    // Pour les revealed, on permet de fermer la popup en marquant minimisé.
    // V1 : on ne stocke pas la dismissal — recharge → la popup réapparaît.
    setMinimized(true);
  }

  if (minimized) {
    return (
      <button
        type="button"
        className="live-event-fab"
        onClick={() => setMinimized(false)}
        title="Reprendre l’événement"
      >
        🛡 Événement {queue.length > 1 ? `(${queue.length})` : ''}
      </button>
    );
  }

  return (
    <div className="live-event-overlay">
      <div className="live-event-panel">
        <div className="live-event-header">
          <span>
            {event.kind === 'qcm' ? '🧩 Question MJ' : '🗳 Vote MJ'}
            {queue.length > 1 && (
              <span className="live-event-queue">
                {' '}
                · {queue.findIndex((e) => e.id === event.id) + 1}/{queue.length}
              </span>
            )}
          </span>
          <button
            className="dice-close"
            onClick={dismiss}
            aria-label="Réduire"
            title="Réduire (revient en bas à droite)"
          >
            _
          </button>
        </div>

        <div className="live-event-prompt">{event.prompt}</div>

        {err && (
          <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem' }}>❌ {err}</p>
        )}

        {isAwaitingAnswer ? (
          <div className="live-event-options">
            {event.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                className="live-event-option-btn"
                onClick={() => submitAnswer(i)}
                disabled={submitting}
              >
                <span className="live-event-option-letter">{String.fromCharCode(65 + i)}</span>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <ResultView event={event} myChoice={myResponse?.choice_index ?? null} />
        )}

        {queue.length > 1 && (
          <div className="live-event-nav">
            {queue.map((e) => (
              <button
                key={e.id}
                type="button"
                className={`live-event-dot ${e.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(e.id)}
                aria-label={`Aller à l’événement ${e.prompt}`}
                title={e.prompt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultView({ event, myChoice }: { event: LiveEvent; myChoice: number | null }) {
  if (event.kind === 'qcm' && event.revealed) {
    const ok = myChoice !== null && myChoice === event.correct_index;
    return (
      <div className="live-event-result">
        <div className={`live-event-verdict ${ok ? 'ok' : 'ko'}`}>
          {ok ? '✓ Bonne réponse' : '✗ Mauvaise réponse'}
        </div>
        <div className="live-event-options">
          {event.options.map((opt, i) => (
            <div
              key={i}
              className={`live-event-option-result ${i === event.correct_index ? 'correct' : ''} ${
                i === myChoice ? 'mine' : ''
              }`}
            >
              <span className="live-event-option-letter">{String.fromCharCode(65 + i)}</span>
              {opt}
              {i === event.correct_index && ' ✓'}
              {i === myChoice && i !== event.correct_index && ' (votre choix)'}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (event.kind === 'qcm' && !event.revealed) {
    return (
      <div className="live-event-result">
        <p style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>
          Réponse enregistrée. Le MJ révélera bientôt la bonne réponse.
        </p>
        {myChoice !== null && (
          <div className="live-event-option-result mine">
            <span className="live-event-option-letter">{String.fromCharCode(65 + myChoice)}</span>
            {event.options[myChoice]} (votre choix)
          </div>
        )}
      </div>
    );
  }

  // Vote
  if (event.revealed) {
    return (
      <div className="live-event-result">
        <p style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Résultats du vote (révélés par le MJ).</p>
        <div className="live-event-options">
          {event.options.map((opt, i) => (
            <div key={i} className={`live-event-option-result ${i === myChoice ? 'mine' : ''}`}>
              <span className="live-event-option-letter">{String.fromCharCode(65 + i)}</span>
              {opt}
              {i === myChoice && ' (votre vote)'}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="live-event-result">
      <p style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>
        Vote enregistré. Le MJ affichera les résultats à la fin.
      </p>
      {myChoice !== null && (
        <div className="live-event-option-result mine">
          <span className="live-event-option-letter">{String.fromCharCode(65 + myChoice)}</span>
          {event.options[myChoice]} (votre vote)
        </div>
      )}
    </div>
  );
}
