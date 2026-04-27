export const metadata = { title: 'Les Nyctalopes — Aide' };

export default function AidePage() {
  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontFamily: 'var(--ffd)', fontSize: '1.7rem', color: 'var(--textgold)', marginBottom: '0.3rem' }}>
        Aide — Règles de base
      </h1>
      <p style={{ color: 'var(--textdim)', marginBottom: '1.8rem', fontFamily: 'var(--ffm)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        Généralités Pathfinder · PF1 &amp; PF2
      </p>

      <div className="panel-block">
        <div className="panel-title">Qu&apos;est-ce que Pathfinder ?</div>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>
          <strong>Pathfinder</strong> est un jeu de rôle papier médiéval-fantastique publié par Paizo, héritier de Donjons &amp; Dragons 3.5.
          Vous incarnez un aventurier (humain, elfe, nain…) d&apos;une classe (guerrier, magicien, roublard…) qui explore, combat et progresse
          dans le monde de <strong>Golarion</strong>. Deux éditions coexistent : <strong>PF1</strong> (2009, règles techniques héritées de D&amp;D 3.5)
          et <strong>PF2</strong> (2019, plus fluide, basé sur 3 actions par tour).
        </p>
      </div>

      <div className="panel-block">
        <div className="panel-title">Le système d20</div>
        <p style={{ fontSize: '0.95rem', marginBottom: '0.8rem' }}>
          Toute action incertaine se résout en lançant un <strong>d20</strong> auquel on ajoute un modificateur.
          Si le total atteint ou dépasse le <em>degré de difficulté</em> (DD), c&apos;est un succès.
        </p>
        <div style={{ fontFamily: 'var(--ffm)', fontSize: '0.85rem', color: 'var(--textdim)', background: 'var(--bg3)', padding: '0.8rem 1rem', borderLeft: '3px solid var(--gold)' }}>
          1d20 + modificateur ≥ DD → succès
        </div>
        <ul style={{ marginTop: '0.8rem', paddingLeft: '1.2rem', lineHeight: 1.8 }}>
          <li><strong>Attaque</strong> : 1d20 + BBA + mod FOR ou DEX vs <strong>CA</strong> de la cible</li>
          <li><strong>Compétence</strong> : 1d20 + rangs + mod carac (+3 si classe) + autres bonus</li>
          <li><strong>Sauvegarde</strong> : 1d20 + bonus du save (Vigueur / Réflexes / Volonté)</li>
          <li><strong>Initiative</strong> : 1d20 + mod DEX (au début du combat)</li>
        </ul>
        <p style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: 'var(--textdim)' }}>
          Naturel <strong style={{ color: 'var(--gold2)' }}>20</strong> = critique sur attaque · Naturel <strong style={{ color: 'var(--red2)' }}>1</strong> = échec critique sur save et attaque.
        </p>
      </div>

      <div className="panel-block">
        <div className="panel-title">Les 6 caractéristiques</div>
        <div className="two-col">
          <div>
            <p style={{ marginBottom: '0.4rem' }}><strong style={{ color: 'var(--textgold)' }}>FOR</strong> — Force : dégâts de mêlée, port de charge, Athlétisme.</p>
            <p style={{ marginBottom: '0.4rem' }}><strong style={{ color: 'var(--textgold)' }}>DEX</strong> — Dextérité : CA, Réflexes, attaques à distance, Acrobaties, Discrétion.</p>
            <p style={{ marginBottom: '0.4rem' }}><strong style={{ color: 'var(--textgold)' }}>CON</strong> — Constitution : PV, Vigueur, résistance aux poisons.</p>
          </div>
          <div>
            <p style={{ marginBottom: '0.4rem' }}><strong style={{ color: 'var(--textgold)' }}>INT</strong> — Intelligence : points de compétence, sorts du magicien, Connaissances.</p>
            <p style={{ marginBottom: '0.4rem' }}><strong style={{ color: 'var(--textgold)' }}>SAG</strong> — Sagesse : Volonté, Perception, sorts du clerc/druide/rôdeur.</p>
            <p style={{ marginBottom: '0.4rem' }}><strong style={{ color: 'var(--textgold)' }}>CHA</strong> — Charisme : Diplomatie, Bluff, sorts du barde/ensorceleur/paladin.</p>
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--textdim)', marginTop: '0.8rem', background: 'var(--bg3)', padding: '0.7rem 1rem', borderLeft: '3px solid var(--blue2)' }}>
          <strong style={{ color: 'var(--blue2)' }}>Modificateur</strong> : <code>(caractéristique − 10) ÷ 2</code>, arrondi à l&apos;inférieur.
          Ex : 10–11 → +0, 12–13 → +1, 14–15 → +2, 8–9 → –1.
        </p>
      </div>

      <div className="panel-block">
        <div className="panel-title">Alignement</div>
        <p style={{ fontSize: '0.95rem', marginBottom: '0.6rem' }}>
          Neuf combinaisons entre deux axes : <em>Loyal / Neutre / Chaotique</em> × <em>Bon / Neutre / Mauvais</em>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.3rem', fontFamily: 'var(--ffm)', fontSize: '0.75rem', textAlign: 'center' }}>
          {['LB — Loyal Bon', 'NB — Neutre Bon', 'CB — Chaotique Bon',
            'LN — Loyal Neutre', 'N — Neutre strict', 'CN — Chaotique Neutre',
            'LM — Loyal Mauvais', 'NM — Neutre Mauvais', 'CM — Chaotique Mauvais'].map(a => (
              <div key={a} style={{ padding: '0.45rem', background: 'var(--bg3)', border: '1px solid var(--border)' }}>{a}</div>
            ))}
        </div>
      </div>

      <div className="panel-block">
        <div className="panel-title">Progression de niveau</div>
        <p style={{ fontSize: '0.95rem', marginBottom: '0.6rem' }}>
          Quand votre XP atteint le seuil du niveau suivant, vous gagnez :
        </p>
        <ul style={{ paddingLeft: '1.2rem', lineHeight: 1.8 }}>
          <li><strong>Points de vie</strong> : +1 dé de vie de la classe + mod CON</li>
          <li><strong>Bonus de base à l&apos;attaque (BBA)</strong> : +1 la plupart du temps</li>
          <li><strong>Jets de sauvegarde</strong> : +1 aux jets forts à intervalle régulier</li>
          <li><strong>Points de compétence</strong> : à dépenser dans les skills</li>
          <li><strong>Dons</strong> : un nouveau don tous les 2 niveaux (niveaux impairs)</li>
          <li><strong>Sorts</strong> : nouveaux emplacements ou nouveaux niveaux de sorts, selon la classe</li>
          <li>Tous les 4 niveaux : <strong>+1 à une caractéristique</strong> au choix</li>
        </ul>
        <p style={{ fontSize: '0.85rem', color: 'var(--textdim)', marginTop: '0.6rem' }}>
          💡 Dans l&apos;app, cliquez sur <strong>⬆ Niveau suivant</strong> dans l&apos;en-tête de la fiche quand vous avez assez d&apos;XP — PV et BBA sont appliqués automatiquement, les saves restent à ajuster manuellement.
        </p>
      </div>

      <div className="panel-block">
        <div className="panel-title">Lire votre fiche dans l&apos;app</div>
        <ul style={{ paddingLeft: '1.2rem', lineHeight: 1.9, fontSize: '0.92rem' }}>
          <li><strong>Slider PV</strong> : ajuste les points de vie en direct, auto-sauvegardé.</li>
          <li><strong>Valeurs soulignées en pointillés or</strong> (saves, initiative, BBA, total compétence, toucher/dégâts d&apos;arme) : cliquer lance automatiquement le dé correspondant dans le rolleur 🎲.</li>
          <li><strong>Rolleur 🎲</strong> (bouton topbar) : panneau flottant pour lancer n&apos;importe quel dé personnalisé (d4, d6, d8, d10, d12, d20, d100) avec modificateur et label. Historique persistant des 50 derniers jets.</li>
          <li><strong>Actions fiche</strong> : ⎘ Dupliquer crée une copie, 🗑 Supprimer retire définitivement (avec confirmation).</li>
        </ul>
      </div>

      <div className="panel-block">
        <div className="panel-title">Aller plus loin</div>
        <p style={{ fontSize: '0.95rem', marginBottom: '0.6rem' }}>
          Cette aide couvre les bases. Pour les règles détaillées, races, classes, sorts, équipement :
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
          <a href="https://www.pathfinder-fr.org/Wiki/Pathfinder-RPG.MainPage.ashx" target="_blank" rel="noopener" className="wiki-sidebar-link">
            📖 Pathfinder-FR — Wiki PF1 (français)
          </a>
          <a href="https://www.pathfinder-fr.org/Wiki/Pathfinder2.MainPage.ashx" target="_blank" rel="noopener" className="wiki-sidebar-link">
            📖 Pathfinder-FR — Wiki PF2 (français)
          </a>
          <a href="https://www.pathfinder-fr.org/Wiki/Golarion.MainPage.ashx" target="_blank" rel="noopener" className="wiki-sidebar-link">
            🌍 Golarion — Lore et cartes
          </a>
          <a href="https://aonprd.com" target="_blank" rel="noopener" className="wiki-sidebar-link">
            🔗 Archives of Nethys — SRD officiel (anglais)
          </a>
        </div>
      </div>
    </div>
  );
}
