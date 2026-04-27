'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PersoData } from '@/lib/types';
import AddCharacterPicker from './session/AddCharacterPicker';
import EventsPanel from './session/EventsPanel';
import PartyCard from './session/PartyCard';
import {
  parseDataJson,
  type FullPerso,
  type JoueurInfo,
  type Lookup,
  type SessionRow,
} from './session/types';

export default function SessionTab({ currentAdminId }: { currentAdminId: string }) {
  const supabase = createClient();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [persos, setPersos] = useState<Map<string, FullPerso>>(new Map());
  const [races, setRaces] = useState<Lookup>({});
  const [classes, setClasses] = useState<Lookup>({});
  const [joueurs, setJoueurs] = useState<Record<string, JoueurInfo>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [legacyMode, setLegacyMode] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSize, setNewSize] = useState(6);

  const [showPicker, setShowPicker] = useState(false);

  const loadActiveSession = useCallback(async () => {
    setErr(null);
    const { data, error } = await supabase
      .from('gm_sessions')
      .select('*')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (/relation .*gm_sessions.* does not exist/i.test(error.message)) {
        setLegacyMode(true);
        setLoading(false);
        return null;
      }
      setErr(error.message);
      setLoading(false);
      return null;
    }
    return (data as SessionRow | null) || null;
  }, [supabase]);

  const loadPersosForSession = useCallback(
    async (s: SessionRow | null) => {
      if (!s || s.character_ids.length === 0) {
        setPersos(new Map());
        return;
      }
      const { data, error } = await supabase
        .from('personnages')
        .select('id, user_id, nom, race_id, classe_id, niveau, data_json')
        .in('id', s.character_ids);
      if (error) {
        setErr(error.message);
        return;
      }
      const map = new Map<string, FullPerso>();
      for (const row of (data as { id: string; user_id: string; nom: string; race_id: string | null; classe_id: string | null; niveau: number | null; data_json: unknown }[]) || []) {
        map.set(row.id, {
          id: row.id,
          user_id: row.user_id,
          nom: row.nom,
          race_id: row.race_id,
          classe_id: row.classe_id,
          niveau: row.niveau,
          data_json: parseDataJson(row.data_json),
        });
      }
      setPersos(map);
    },
    [supabase]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const s = await loadActiveSession();
    setSession(s);
    if (s) await loadPersosForSession(s);

    // Lookups
    const [rRes, cRes, uRes] = await Promise.all([
      supabase.from('races').select('id, nom'),
      supabase.from('classes').select('id, nom'),
      supabase.from('users').select('id, email, pseudo'),
    ]);
    setRaces(Object.fromEntries(((rRes.data || []) as { id: string; nom: string }[]).map((r) => [r.id, r.nom])));
    setClasses(Object.fromEntries(((cRes.data || []) as { id: string; nom: string }[]).map((c) => [c.id, c.nom])));
    const jm: Record<string, JoueurInfo> = {};
    if (uRes.error && /pseudo/i.test(uRes.error.message)) {
      const fb = await supabase.from('users').select('id, email');
      for (const u of (fb.data || []) as { id: string; email: string }[]) jm[u.id] = { email: u.email, pseudo: null };
    } else {
      for (const u of (uRes.data || []) as { id: string; email: string; pseudo: string | null }[]) {
        jm[u.id] = { email: u.email, pseudo: u.pseudo };
      }
    }
    setJoueurs(jm);
    setLoading(false);
  }, [loadActiveSession, loadPersosForSession, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createSession() {
    setErr(null);
    const nom = newName.trim() || `Session ${new Date().toLocaleString('fr-FR')}`;
    const size = Math.max(1, Math.min(12, newSize || 6));
    const { data, error } = await supabase
      .from('gm_sessions')
      .insert({ nom, max_size: size, character_ids: [], created_by: currentAdminId })
      .select()
      .maybeSingle();
    if (error) {
      setErr(error.message);
      return;
    }
    setSession(data as SessionRow);
    setShowCreate(false);
    setNewName('');
    setNewSize(6);
  }

  async function endSession() {
    if (!session) return;
    if (!confirm(`Clôturer la session « ${session.nom} » ?`)) return;
    setErr(null);
    const { error } = await supabase
      .from('gm_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', session.id);
    if (error) {
      setErr(error.message);
      return;
    }
    setSession(null);
    setPersos(new Map());
  }

  async function addCharacter(persoId: string): Promise<boolean> {
    if (!session) return false;
    if (session.character_ids.length >= session.max_size) return false;
    const next = [...session.character_ids, persoId];
    const { error } = await supabase
      .from('gm_sessions')
      .update({ character_ids: next })
      .eq('id', session.id);
    if (error) {
      setErr(error.message);
      return false;
    }
    const nextSession = { ...session, character_ids: next };
    setSession(nextSession);
    await loadPersosForSession(nextSession);
    return true;
  }

  async function removeCharacter(persoId: string) {
    if (!session) return;
    const next = session.character_ids.filter((id) => id !== persoId);
    const { error } = await supabase
      .from('gm_sessions')
      .update({ character_ids: next })
      .eq('id', session.id);
    if (error) {
      setErr(error.message);
      return;
    }
    setSession({ ...session, character_ids: next });
    setPersos((m) => {
      const nm = new Map(m);
      nm.delete(persoId);
      return nm;
    });
  }

  async function mutatePerso(
    persoId: string,
    mutator: (d: PersoData) => PersoData
  ): Promise<{ ok: boolean; error?: string }> {
    const previous = persos.get(persoId);
    if (!previous) return { ok: false, error: 'Perso introuvable en session' };
    const next = mutator(previous.data_json);
    setPersos((m) => new Map(m).set(persoId, { ...previous, data_json: next }));
    const { error } = await supabase
      .from('personnages')
      .update({ data_json: next })
      .eq('id', persoId);
    if (error) {
      setPersos((m) => new Map(m).set(persoId, previous));
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  if (loading) {
    return (
      <section className="panel-block">
        <div className="panel-title">Session live</div>
        <div style={{ color: 'var(--textdim)' }}>Chargement…</div>
      </section>
    );
  }

  if (legacyMode) {
    return (
      <section className="panel-block">
        <div className="panel-title">Session live</div>
        <p className="admin-tab-todo" style={{ color: 'var(--amber)' }}>
          ⚠ Migration <code>0001_admin_gm.sql</code> requise pour activer les sessions GM.
        </p>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="panel-block">
        <div className="panel-title">Session live</div>
        {err && (
          <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem' }}>❌ {err}</p>
        )}
        <div className="empty-session">
          <div className="empty-session-glyph">⚔</div>
          <div className="empty-session-title">Aucune session active</div>
          <p className="empty-session-sub">
            Crée une session pour démarrer la partie : tu pourras ajouter des personnages à la volée et leur
            envoyer XP, PV, objets et dons en direct.
          </p>
          <button className="btn-validate" onClick={() => setShowCreate(true)}>
            Démarrer une session
          </button>
        </div>

        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <span>Nouvelle session</span>
                <button className="dice-close" onClick={() => setShowCreate(false)}>×</button>
              </div>
              <div className="modal-body">
                <label className="auth-label">Nom de la session</label>
                <input
                  className="dice-label-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex : Le tombeau d'Ymeri — séance 4"
                  autoFocus
                />
                <label className="auth-label">Taille max de la party (1-12)</label>
                <input
                  className="dice-label-input"
                  type="number"
                  min={1}
                  max={12}
                  value={newSize}
                  onChange={(e) => setNewSize(parseInt(e.target.value, 10) || 6)}
                />
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowCreate(false)}>Annuler</button>
                  <button className="btn-validate" onClick={createSession}>Démarrer</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  const remaining = session.max_size - session.character_ids.length;

  return (
    <section className="panel-block">
      <div className="session-header">
        <div>
          <div className="session-name">{session.nom}</div>
          <div className="session-meta">
            Démarrée {new Date(session.started_at).toLocaleString('fr-FR')} · {session.character_ids.length} /{' '}
            {session.max_size} persos
          </div>
        </div>
        <div className="session-header-actions">
          <button
            className="btn-edit"
            onClick={() => setShowPicker(true)}
            disabled={remaining <= 0}
            title={remaining <= 0 ? 'Party complète' : 'Ajouter un perso'}
          >
            + Ajouter ({remaining})
          </button>
          <button className="btn-refuse" onClick={endSession}>
            Clôturer
          </button>
        </div>
      </div>

      {err && (
        <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem', margin: '0.6rem 0' }}>
          ❌ {err}
        </p>
      )}

      {persos.size === 0 ? (
        <div className="empty-session" style={{ padding: '1.5rem 0' }}>
          <div className="empty-session-glyph">🎲</div>
          <div className="empty-session-title">Party vide</div>
          <p className="empty-session-sub">Ajoute des personnages pour commencer à interagir avec eux.</p>
          <button className="btn-validate" onClick={() => setShowPicker(true)}>
            Ajouter un perso
          </button>
        </div>
      ) : (
        <div className="party-grid">
          {session.character_ids.map((id) => {
            const p = persos.get(id);
            if (!p) return null;
            return (
              <PartyCard
                key={id}
                perso={p}
                joueur={joueurs[p.user_id]}
                raceLabel={p.race_id ? races[p.race_id] || p.race_id : '—'}
                classeLabel={p.classe_id ? classes[p.classe_id] || p.classe_id : '—'}
                onMutate={(mutator) => mutatePerso(id, mutator)}
                onRemove={() => removeCharacter(id)}
              />
            );
          })}
        </div>
      )}

      {showPicker && session && (
        <AddCharacterPicker
          excludedIds={session.character_ids}
          remainingSlots={remaining}
          onPick={async (id) => {
            const ok = await addCharacter(id);
            if (ok) setShowPicker(false);
            return ok;
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      <EventsPanel
        sessionId={session.id}
        partyPersos={session.character_ids
          .map((id) => persos.get(id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))}
        joueurs={joueurs}
      />
    </section>
  );
}
