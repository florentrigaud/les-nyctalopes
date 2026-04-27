'use client';

export default function PersonnagesTab() {
  return (
    <section className="panel-block">
      <div className="panel-title">Personnages — vue globale</div>
      <div className="admin-tab-placeholder">
        <div className="admin-tab-placeholder-glyph">🗂</div>
        <div className="admin-tab-placeholder-title">À venir — T4 / T5</div>
        <ul className="admin-tab-placeholder-list">
          <li>Table de tous les personnages (joueur, perso, race, classe, niveau, groupe).</li>
          <li>Filtres : par groupe, par joueur, recherche texte.</li>
          <li>CRUD des groupes (créer / renommer / supprimer).</li>
          <li>Assignation d'un perso à un groupe.</li>
        </ul>
      </div>
    </section>
  );
}
