'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import EventComposer from './EventComposer';
import EventCard from './EventCard';
import type { FullPerso, JoueurInfo } from './types';

export type LiveEvent = {
  id: string;
  gm_session_id: string;
  gm_id: string | null;
  kind: 'qcm' | 'vote';
  prompt: string;
  options: string[];
  correct_index: number | null;
  target_perso_ids: string[];
  opens_at: string;
  closes_at: string | null;
  revealed: boolean;
  created_at: string;
};

export default function EventsPanel({
  sessionId,
  partyPersos,
  joueurs,
}: {
  sessionId: string;
  partyPersos: FullPerso[];
  joueurs: Record<string, JoueurInfo>;
}) {
  const supabase = createClient();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [composer, setComposer] = useState<null | 'qcm' | 'vote'>(null);

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('live_events')
      .select('*')
      .eq('gm_session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }
    setEvents((data as LiveEvent[]) || []);
    setLoading(false);
  }, [sessionId, supabase]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const channel = supabase
      .channel(`live_events_gm:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_events', filter: `gm_session_id=eq.${sessionId}` },
        (payload) => {
          setEvents((prev) => [payload.new as LiveEvent, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_events', filter: `gm_session_id=eq.${sessionId}` },
        (payload) => {
          const updated = payload.new as LiveEvent;
          setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'live_events', filter: `gm_session_id=eq.${sessionId}` },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id;
          if (oldId) setEvents((prev) => prev.filter((e) => e.id !== oldId));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  async function deleteEvent(id: string) {
    if (!confirm('Supprimer définitivement cet événement et toutes ses réponses ?')) return;
    const { error } = await supabase.from('live_events').delete().eq('id', id);
    if (error) setErr(error.message);
  }

  async function closeEvent(id: string) {
    const { error } = await supabase
      .from('live_events')
      .update({ closes_at: new Date().toISOString() })
      .eq('id', id);
    if (error) setErr(error.message);
  }

  async function revealEvent(id: string) {
    const { error } = await supabase.from('live_events').update({ revealed: true }).eq('id', id);
    if (error) setErr(error.message);
  }

  return (
    <div className="events-panel">
      <div className="events-panel-header">
        <div>
          <div className="events-panel-title">Événements live</div>
          <div className="events-panel-sub">QCM scénario · votes en groupe — push direct vers les joueurs.</div>
        </div>
        <div className="events-panel-actions">
          <button className="btn-edit" onClick={() => setComposer('qcm')}>
            + QCM
          </button>
          <button className="btn-edit" onClick={() => setComposer('vote')}>
            + Vote
          </button>
        </div>
      </div>

      {err && (
        <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem', margin: '0.6rem 0' }}>
          ❌ {err}
        </p>
      )}

      {loading ? (
        <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Chargement…</div>
      ) : events.length === 0 ? (
        <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>
          Aucun événement encore. Lance un QCM ou un vote pour stimuler la table.
        </div>
      ) : (
        <div className="events-list">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              partyPersos={partyPersos}
              joueurs={joueurs}
              onClose={() => closeEvent(ev.id)}
              onReveal={() => revealEvent(ev.id)}
              onDelete={() => deleteEvent(ev.id)}
            />
          ))}
        </div>
      )}

      {composer && (
        <EventComposer
          kind={composer}
          sessionId={sessionId}
          partyPersos={partyPersos}
          onClose={() => setComposer(null)}
          onCreated={() => setComposer(null)}
        />
      )}
    </div>
  );
}
