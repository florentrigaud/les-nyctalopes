'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type JetRow = {
  id: number;
  user_id: string;
  perso_id: string | null;
  contexte: string | null;
  formule: string;
  resultat: number;
  detail: {
    count?: number;
    sides?: number;
    modifier?: number;
    rolls?: number[];
  } | null;
  created_at: string;
};

type PersoLite = { nom: string; user_id: string; groupe_id: string | null };
type JoueurLite = { email: string; pseudo: string | null };

type WindowKey = '5m' | '1h' | 'session' | 'all';

const WINDOWS: { key: WindowKey; label: string; ms: number | null }[] = [
  { key: '5m', label: '5 min', ms: 5 * 60_000 },
  { key: '1h', label: '1 h', ms: 60 * 60_000 },
  { key: 'session', label: 'Session active', ms: null },
  { key: 'all', label: 'Tout (200 derniers)', ms: null },
];

const MAX_FEED = 200;

export default function JetsTab() {
  const supabase = createClient();
  const [jets, setJets] = useState<JetRow[]>([]);
  const [persos, setPersos] = useState<Map<string, PersoLite>>(new Map());
  const [joueurs, setJoueurs] = useState<Map<string, JoueurLite>>(new Map());
  const [groupes, setGroupes] = useState<Map<string, string>>(new Map());
  const [activeSessionIds, setActiveSessionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [legacyMode, setLegacyMode] = useState(false);
  const [tick, setTick] = useState(0); // re-render tick pour l’auto-purge

  const [windowKey, setWindowKey] = useState<WindowKey>('1h');
  const [joueurFilter, setJoueurFilter] = useState<'all' | string>('all');
  const [persoFilter, setPersoFilter] = useState<'all' | string>('all');
  const [groupeFilter, setGroupeFilter] = useState<'all' | 'none' | string>('all');

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const jRes = await supabase
        .from('jets_des')
        .select('id, user_id, perso_id, contexte, formule, resultat, detail, created_at')
        .order('created_at', { ascending: false })
        .limit(MAX_FEED);

      if (jRes.error) {
        if (/relation .*jets_des.* does not exist/i.test(jRes.error.message)) {
          setLegacyMode(true);
        } else {
          setErr(jRes.error.message);
        }
        setLoading(false);
        return;
      }

      const [pRes, uRes, gRes, sRes] = await Promise.all([
        supabase.from('personnages').select('id, nom, user_id, groupe_id'),
        supabase.from('users').select('id, email, pseudo'),
        supabase.from('groupes').select('id, nom'),
        supabase
          .from('gm_sessions')
          .select('character_ids')
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      setJets((jRes.data as JetRow[]) || []);

      const persoMap = new Map<string, PersoLite>();
      for (const p of (pRes.data || []) as { id: string; nom: string; user_id: string; groupe_id: string | null }[]) {
        persoMap.set(p.id, { nom: p.nom, user_id: p.user_id, groupe_id: p.groupe_id });
      }
      setPersos(persoMap);

      const joueurMap = new Map<string, JoueurLite>();
      if (uRes.error && /pseudo/i.test(uRes.error.message)) {
        const fb = await supabase.from('users').select('id, email');
        for (const u of (fb.data || []) as { id: string; email: string }[]) {
          joueurMap.set(u.id, { email: u.email, pseudo: null });
        }
      } else {
        for (const u of (uRes.data || []) as { id: string; email: string; pseudo: string | null }[]) {
          joueurMap.set(u.id, { email: u.email, pseudo: u.pseudo });
        }
      }
      setJoueurs(joueurMap);

      const groupeMap = new Map<string, string>();
      for (const g of (gRes.data || []) as { id: string; nom: string }[]) {
        groupeMap.set(g.id, g.nom);
      }
      setGroupes(groupeMap);

      const sIds = new Set<string>();
      const sData = sRes.data as { character_ids: string[] } | null;
      if (sData?.character_ids) {
        for (const id of sData.character_ids) sIds.add(id);
      }
      setActiveSessionIds(sIds);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel('jets_des_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'jets_des' },
        (payload) => {
          const row = payload.new as JetRow;
          setJets((prev) => [row, ...prev].slice(0, MAX_FEED));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const persosList = useMemo(() => {
    return Array.from(persos.entries())
      .map(([id, p]) => ({ id, label: p.nom }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [persos]);

  const joueursList = useMemo(() => {
    return Array.from(joueurs.entries())
      .map(([id, j]) => ({ id, label: j.pseudo || j.email }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [joueurs]);

  const filtered = useMemo(() => {
    void tick; // dépendance pour relancer le filter sur tick d'auto-purge
    const now = Date.now();
    const win = WINDOWS.find((w) => w.key === windowKey);
    return jets.filter((j) => {
      // Fenêtre temporelle
      if (win?.ms != null) {
        if (now - new Date(j.created_at).getTime() > win.ms) return false;
      } else if (windowKey === 'session') {
        if (!j.perso_id || !activeSessionIds.has(j.perso_id)) return false;
      }
      // Filtres explicites
      if (joueurFilter !== 'all' && j.user_id !== joueurFilter) return false;
      if (persoFilter !== 'all' && j.perso_id !== persoFilter) return false;
      if (groupeFilter !== 'all') {
        const p = j.perso_id ? persos.get(j.perso_id) : undefined;
        const gid = p?.groupe_id || null;
        if (groupeFilter === 'none' && gid) return false;
        if (groupeFilter !== 'none' && gid !== groupeFilter) return false;
      }
      return true;
    });
  }, [jets, windowKey, joueurFilter, persoFilter, groupeFilter, activeSessionIds, persos, tick]);

  if (legacyMode) {
    return (
      <section className="panel-block">
        <div className="panel-title">Jets de dés — feed live</div>
        <p className="admin-tab-todo" style={{ color: 'var(--amber)' }}>
          ⚠ Migration <code>0001_admin_gm.sql</code> requise pour activer la table <code>jets_des</code>.
        </p>
      </section>
    );
  }

  return (
    <section className="panel-block">
      <div className="panel-title">Jets de dés — feed live</div>

      <div className="admin-toolbar">
        <select
          className="admin-select"
          value={windowKey}
          onChange={(e) => setWindowKey(e.target.value as WindowKey)}
          aria-label="Fenêtre temporelle"
        >
          {WINDOWS.map((w) => (
            <option key={w.key} value={w.key}>
              {w.label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={joueurFilter}
          onChange={(e) => setJoueurFilter(e.target.value)}
        >
          <option value="all">Tous joueurs</option>
          {joueursList.map((j) => (
            <option key={j.id} value={j.id}>
              {j.label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={persoFilter}
          onChange={(e) => setPersoFilter(e.target.value)}
        >
          <option value="all">Tous persos</option>
          {persosList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={groupeFilter}
          onChange={(e) => setGroupeFilter(e.target.value)}
        >
          <option value="all">Tous groupes</option>
          <option value="none">Sans groupe</option>
          {Array.from(groupes.entries()).map(([id, nom]) => (
            <option key={id} value={id}>
              {nom}
            </option>
          ))}
        </select>
        <span className="admin-count">{filtered.length}</span>
      </div>

      {err && (
        <p style={{ color: 'var(--red2)', fontFamily: 'var(--ffm)', fontSize: '0.75rem', marginBottom: '0.8rem' }}>
          ❌ {err}
        </p>
      )}

      {loading ? (
        <div style={{ color: 'var(--textdim)' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--textdim)', fontSize: '0.9rem' }}>
          Aucun jet ne correspond aux filtres dans cette fenêtre temporelle.
        </div>
      ) : (
        <div className="jets-feed">
          {filtered.map((j) => {
            const j2 = joueurs.get(j.user_id);
            const p2 = j.perso_id ? persos.get(j.perso_id) : undefined;
            const groupeLabel = p2?.groupe_id ? groupes.get(p2.groupe_id) : null;
            return (
              <div key={j.id} className="jets-row">
                <div className="jets-time">
                  {new Date(j.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
                <div className="jets-who">
                  <span className="jets-joueur">{j2 ? j2.pseudo || j2.email : '?'}</span>
                  {p2 && <span className="jets-perso"> · {p2.nom}</span>}
                  {groupeLabel && <span className="jets-groupe"> [{groupeLabel}]</span>}
                </div>
                <div className="jets-context">{j.contexte || '—'}</div>
                <div className="jets-formule">
                  <code>{j.formule}</code>
                  {j.detail?.rolls && (
                    <span className="jets-rolls">[{j.detail.rolls.join(', ')}]</span>
                  )}
                </div>
                <div className={`jets-total ${j.detail?.sides === 20 && j.detail?.rolls?.[0] === 20 ? 'crit' : ''} ${j.detail?.sides === 20 && j.detail?.rolls?.[0] === 1 ? 'fumble' : ''}`}>
                  {j.resultat}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
