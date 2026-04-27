'use client';

import { useEffect, useRef } from 'react';
import type { RealtimePostgresUpdatePayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export type PersonnageDbRow = {
  id: string;
  user_id: string;
  nom: string;
  race_id: string | null;
  classe_id: string | null;
  niveau: number | null;
  edition: string | null;
  data_json: unknown;
};

/**
 * Souscrit aux UPDATE temps réel sur la ligne `personnages` correspondante.
 * Le handler reçoit la nouvelle row complète. Idempotent et auto-cleanup
 * sur unmount ou changement de persoId.
 *
 * Pré-requis : la table `personnages` doit être incluse dans la publication
 * `supabase_realtime` (cf. migration 0001).
 */
export function usePersonnageRealtime(
  persoId: string | null | undefined,
  onUpdate: (row: PersonnageDbRow) => void
) {
  const handlerRef = useRef(onUpdate);
  useEffect(() => {
    handlerRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!persoId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`personnage:${persoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'personnages',
          filter: `id=eq.${persoId}`,
        },
        (payload: RealtimePostgresUpdatePayload<PersonnageDbRow>) => {
          if (payload.new) handlerRef.current(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [persoId]);
}
