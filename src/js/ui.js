import { loadFiches } from './data.js';
import { getCurrentUser, signIn, signUp, signOut } from './auth.js';
import { openWiki } from './utils.js';
import { loadFiches, createFiche } from './data.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();

  // --- Bouton déconnexion dans le header (chargé dynamiquement) ---
  document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'signOutBtn') {
      await signOut();
      location.reload();
    }
  });

  // --- Bascule Connexion / Inscription ---
  const btnShowLogin    = document.getElementById('btn-show-login');
  const btnShowRegister = document.getElementById('btn-show-register');
  const loginForm       = document.getElementById('login-form');
  const registerForm    = document.getElementById('register-form');
  const authMessage     = document.getElementById('auth-message');

  function showLogin() {
    loginForm.style.display    = 'block';
    registerForm.style.display = 'none';
    btnShowLogin.classList.add('active');
    btnShowRegister.classList.remove('active');
    authMessage.textContent = '';
  }

  function showRegister() {
    loginForm.style.display    = 'none';
    registerForm.style.display = 'block';
    btnShowRegister.classList.add('active');
    btnShowLogin.classList.remove('active');
    authMessage.textContent = '';
  }

  btnShowLogin.addEventListener('click', showLogin);
  btnShowRegister.addEventListener('click', showRegister);

  // --- Connexion ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMessage.textContent = '';
    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
      await signIn(email, password);
      location.reload();
    } catch (err) {
      authMessage.textContent = '❌ ' + err.message;
      authMessage.style.color = '#e74c3c';
    }
  });

  // --- Inscription ---
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMessage.textContent = '';
    const email    = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm  = document.getElementById('register-confirm').value;

    if (password !== confirm) {
      authMessage.textContent = '❌ Les mots de passe ne correspondent pas.';
      authMessage.style.color = '#e74c3c';
      return;
    }

    try {
      await signUp(email, password);
      authMessage.textContent = '✅ Compte créé ! Vérifie ton email pour confirmer ton inscription.';
      authMessage.style.color = '#2ecc71';
      showLogin();
    } catch (err) {
      authMessage.textContent = '❌ ' + err.message;
      authMessage.style.color = '#e74c3c';
    }
  });

  // --- Affichage des fiches si connecté ---
// --- Affichage des fiches si connecté ---
  if (user) {
    document.getElementById('auth-section').style.display = 'none';

    const container = document.getElementById('fiches-list');
    container.style.display = 'block';

    // Bouton créer une fiche
    const btnCreer = document.createElement('button');
    btnCreer.textContent = '+ Créer une fiche';
    btnCreer.id = 'btn-creer-fiche';
    container.appendChild(btnCreer);

    // Formulaire de création (caché par défaut)
    const formCreer = document.createElement('div');
    formCreer.id = 'form-creer-fiche';
    formCreer.style.display = 'none';
    formCreer.innerHTML = `
      <h3>Nouvelle fiche</h3>
      <input type="text" id="fiche-nom" placeholder="Nom du personnage" required />
      <input type="text" id="fiche-race" placeholder="Race" />
      <input type="text" id="fiche-classe" placeholder="Classe" />
      <button id="btn-submit-fiche">Créer</button>
      <button id="btn-annuler-fiche">Annuler</button>
      <p id="fiche-message"></p>
    `;
    container.appendChild(formCreer);

    // Afficher/cacher le formulaire
    btnCreer.addEventListener('click', () => {
      formCreer.style.display = 'block';
      btnCreer.style.display = 'none';
    });

    document.addEventListener('click', async (e) => {
      if (e.target.id === 'btn-annuler-fiche') {
        formCreer.style.display = 'none';
        btnCreer.style.display = 'block';
      }

      if (e.target.id === 'btn-submit-fiche') {
        const nom = document.getElementById('fiche-nom').value.trim();
        const race = document.getElementById('fiche-race').value.trim();
        const classe = document.getElementById('fiche-classe').value.trim();
        const msg = document.getElementById('fiche-message');

        if (!nom) {
          msg.textContent = '❌ Le nom est obligatoire.';
          msg.style.color = '#e74c3c';
          return;
        }

        try {
          await createFiche({ user_id: user.id, nom, race_id: race, classe_id: classe });
          msg.textContent = '✅ Fiche créée !';
          msg.style.color = '#2ecc71';
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          msg.textContent = '❌ ' + err.message;
          msg.style.color = '#e74c3c';
        }
      }
    });

    // Charger et afficher les fiches existantes
    const fiches = await loadFiches(user.id);
    container.style.display = 'block';  // ← déplace cette ligne ici
    
    fiches.forEach(fiche => {
      const div = document.createElement('div');
      div.className = 'fiche-card';

      const h3 = document.createElement('h3');
      h3.textContent = fiche.nom;

      const pRace = document.createElement('p');
      pRace.textContent = `Race : ${fiche.race_id}`;

      const pClasse = document.createElement('p');
      pClasse.textContent = `Classe : ${fiche.classe_id}`;

      const btn = document.createElement('button');
      btn.textContent = '📖 Wiki';
      btn.addEventListener('click', () => openWiki(fiche.classe_id));

      div.appendChild(h3);
      div.appendChild(pRace);
      div.appendChild(pClasse);
      div.appendChild(btn);
      container.insertBefore(div, btnCreer);
    });
  }  // ← fermeture du if (user)
});  // ← fermeture du DOMContentLoaded
