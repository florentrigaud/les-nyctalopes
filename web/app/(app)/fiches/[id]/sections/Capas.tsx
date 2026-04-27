'use client';

import { useState } from 'react';
import type { Classe, Personnage, Race } from '@/lib/types';

type CapaLike = { nom: string; desc?: string } | string;

function renderCapa(c: CapaLike, key: number, race = false) {
  const nom = typeof c === 'string' ? c : c.nom;
  const desc = typeof c === 'string' ? '' : c.desc || '';
  return (
    <div key={key} className={`capa-block ${race ? 'capa-race' : ''}`}>
      <div className="capa-name">{nom}</div>
      {desc && <div className="capa-desc">{desc}</div>}
    </div>
  );
}

export default function Capas({
  perso,
  race,
  classe,
  onSave,
}: {
  perso: Personnage;
  race: Race;
  classe: Classe;
  onSave: (p: Personnage) => Promise<boolean>;
}) {
  const [edit, setEdit] = useState(false);
  const [notes, setNotes] = useState(perso.notes_capacites || '');

  async function submit() {
    const ok = await onSave({ ...perso, notes_capacites: notes });
    if (ok) setEdit(false);
  }

  const capasClasse = classe.capacites || [];
  const capasRace = race.capacites || [];

  return (
    <>
      <div className="panel-block">
        <div className="panel-title">Capacités de Classe — {classe.nom}</div>
        {capasClasse.length
          ? capasClasse.map((c, i) => renderCapa(c, i))
          : <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Données non chargées depuis Supabase.</div>}
      </div>

      <div className="panel-block">
        <div className="panel-title">Capacités Raciales — {race.nom}</div>
        {capasRace.length
          ? capasRace.map((c, i) => renderCapa(c, i, true))
          : <div style={{ color: 'var(--textdim)', fontSize: '0.85rem' }}>Données non chargées depuis Supabase.</div>}
      </div>

      {(race.vision?.length || race.langues?.length) && (
        <div className="panel-block">
          <div className="panel-title">Vision &amp; Langues</div>
          {(race.vision || []).length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
              {race.vision!.map((v, i) => <span key={i} className="tag tag-div">👁 {v}</span>)}
            </div>
          )}
          {(race.langues || []).length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {race.langues!.map((l, i) => <span key={i} className="tag tag-align">{l}</span>)}
            </div>
          )}
        </div>
      )}

      <div className="panel-block">
        <div className="panel-header panel-title-wrap">
          <span className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            Notes libres &amp; Capacités personnalisées
          </span>
          <button className="btn-edit" onClick={() => setEdit((v) => !v)}>✎ Modifier</button>
        </div>

        {!edit ? (
          <div style={{ background: 'var(--bg3)', borderLeft: '3px solid var(--purple)', padding: '0.8rem 1rem', fontSize: '0.9rem', color: 'var(--textdim)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {perso.notes_capacites || 'Aucune note. Cliquez Modifier pour ajouter.'}
          </div>
        ) : (
          <>
            <textarea
              className="edit-input"
              rows={6}
              style={{ resize: 'vertical', fontFamily: 'var(--ffs)' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="edit-bar" style={{ marginTop: '0.5rem' }}>
              <button className="btn-save" onClick={submit}>Valider</button>
              <button className="btn-cancel" onClick={() => setEdit(false)}>Annuler</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
