import { loadFiches, getCurrentUser } from './data.js';
import { openWiki } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (user) {
    document.getElementById('auth-section').style.display = 'none';
    const fiches = await loadFiches(user.id);
    const container = document.getElementById('fiches-list');
    fiches.forEach(fiche => {
      const div = document.createElement('div');
      div.className = 'fiche-card';
      div.innerHTML = `
        <h3>${fiche.nom}</h3>
        <p>Race: ${fiche.race_id}</p>
        <p>Classe: ${fiche.classe_id}</p>
        <button onclick="openWiki('${fiche.classe_id}')">📖 Wiki</button>
      `;
      container.appendChild(div);
    });
    container.style.display = 'block';
  }
});
