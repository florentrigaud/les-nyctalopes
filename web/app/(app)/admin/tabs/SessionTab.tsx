'use client';

export default function SessionTab({ currentAdminId: _ }: { currentAdminId: string }) {
  return (
    <section className="panel-block">
      <div className="panel-title">Session live — cockpit GM</div>
      <div className="admin-tab-placeholder">
        <div className="admin-tab-placeholder-glyph">⚔</div>
        <div className="admin-tab-placeholder-title">À venir — T6 / T7 / T8</div>
        <ul className="admin-tab-placeholder-list">
          <li>Création d'une session GM (nom, taille max configurable, défaut 6).</li>
          <li>Sélection à la volée de personnages issus de n'importe quel groupe.</li>
          <li>
            Actions live par perso : ± XP, ± PV, donner objet, donner don / capacité,
            note libre.
          </li>
          <li>
            Push temps réel vers la fiche du joueur (Supabase Realtime sur{' '}
            <code>personnages</code>).
          </li>
        </ul>
      </div>
    </section>
  );
}
