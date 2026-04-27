'use client';

export default function JetsTab() {
  return (
    <section className="panel-block">
      <div className="panel-title">Jets de dés — feed live</div>
      <div className="admin-tab-placeholder">
        <div className="admin-tab-placeholder-glyph">🎲</div>
        <div className="admin-tab-placeholder-title">À venir — T9 / T10</div>
        <ul className="admin-tab-placeholder-list">
          <li>
            Capture de chaque jet du <code>DiceRoller</code> dans la table{' '}
            <code>jets_des</code>.
          </li>
          <li>Feed trié desc, abonnement Realtime (apparition &lt; 2 s).</li>
          <li>Filtres : joueur, perso, groupe, fenêtre (5 min / 1 h / session active).</li>
          <li>Auto-purge visuelle au-delà de la fenêtre choisie.</li>
        </ul>
      </div>
    </section>
  );
}
