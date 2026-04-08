import { loadFiches } from './data.js';
import { getCurrentUser, signOut } from './auth.js';
import { openWiki } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();

  // Bouton déconnexion (chargé dynamiquement dans le header)
  document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'signOutBtn') {
      await signOut();
      location.reload();
    }
  });

  if (user) {
    document.getElementById('auth-section').style.display = 'none';

    const fiches = await loadFiches(user.id);
    const container = document.getElementById('fiches-list');

    fiches.forEach(fiche => {
      const div = document.createElement('div');
      div.className = 'fiche-card';

      const h3 = document.createElement('h3');
      h3.textContent = fiche.nom; // textContent pour éviter les XSS

      const pRace = document.createElement('p');
      pRace.textContent = `Race : ${fiche.race_id}`;

      const pClasse = document.createElement('p');
      pClasse.textContent = `Classe : ${fiche.classe_id}`;

      const btn = document.createElement('button');
      btn.textContent = '📖 Wiki';
      btn.addEventListener('click', () => openWiki(fiche.classe_id)); // addEventListener au lieu de onclick inline

      div.appendChild(h3);
      div.appendChild(pRace);
      div.appendChild(pClasse);
      div.appendChild(btn);
      container.appendChild(div);
    });

    container.style.display = 'block';
  }
});
