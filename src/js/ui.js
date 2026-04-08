import { loadFiches } from './data.js';
import { getCurrentUser, signIn, signUp, signOut } from './auth.js';
import { openWiki } from './utils.js';

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
  if (user) {
    document.getElementById('auth-section').style.display = 'none';

    const fiches = await loadFiches(user.id);
    const container = document.getElementById('fiches-list');

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
      container.appendChild(div);
    });

    container.style.display = 'block';
  }
});
