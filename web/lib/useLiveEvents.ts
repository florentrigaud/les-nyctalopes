'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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

export type LiveEventResponse = {
  id: number;
  event_id: string;
  user_id: string;
  perso_id: string | null;
  choice_index: number;
  responded_at: string;
};

/**
 * Souscrit aux événements live visibles par l'utilisateur courant.
 * RLS filtre automatiquement (live_events_select_target).
 *
 * Renvoie :
 *   - events : liste des events accessibles (ouverts ou non, révélés ou non)
 *   - myResponses : map event_id → réponse (choice_index) du user
 *   - loading : true tant que le premier fetch n'est pas revenu
 *
 * Auto-cleanup au démontage.
 */
export function useLiveEvents() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [myResponses, setMyResponses] = useState<Map<string, LiveEventResponse>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const [eRes, rRes] = await Promise.all([
        supabase
          .from('live_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('live_event_responses').select('*'),
      ]);
      if (cancelled) return;
      setEvents((eRes.data as LiveEvent[]) || []);
      const map = new Map<string, LiveEventResponse>();
      for (const r of (rRes.data as LiveEventResponse[]) || []) {
        map.set(r.event_id, r);
      }
      setMyResponses(map);
      setLoading(false);
    })();

    const channel = supabase
      .channel('live_events_player')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_events' },
        (payload) => {
          setEvents((prev) => [payload.new as LiveEvent, ...prev].slice(0, 50));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_events' },
        (payload) => {
          const u = payload.new as LiveEvent;
          setEvents((prev) => prev.map((e) => (e.id === u.id ? u : e)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'live_events' },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id;
          if (oldId) setEvents((prev) => prev.filter((e) => e.id !== oldId));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_event_responses' },
        (payload) => {
          const r = payload.new as LiveEventResponse;
          setMyResponses((prev) => new Map(prev).set(r.event_id, r));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_event_responses' },
        (payload) => {
          const r = payload.new as LiveEventResponse;
          setMyResponses((prev) => new Map(prev).set(r.event_id, r));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { events, myResponses, loading };
}
