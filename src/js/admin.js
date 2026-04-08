import { supabase, getCurrentUser } from './auth.js';

// Vérification que l'utilisateur est connecté et admin
document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (!user) {
    alert('Accès refusé : vous devez être connecté.');
    window.location.href = '/index.html';
    return;
  }

  // Optionnel : vérifier un rôle admin dans ta table users
  // const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
  // if (!data?.is_admin) { window.location.href = '/index.html'; return; }

  loadPendingUsers();
});

async function loadPendingUsers() {
  const { data, error } = await supabase.from('users').select('id, email').eq('is_validated', false);
  if (error) { console.error(error); return; }

  const tbody = document.getElementById('users-list');
  tbody.innerHTML = '';
  data.forEach(user => {
    const tr = document.createElement('tr');
    const tdEmail = document.createElement('td');
    tdEmail.textContent = user.email;
    const tdAction = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = 'Valider';
    btn.addEventListener('click', () => validateUser(user.id));
    tdAction.appendChild(btn);
    tr.appendChild(tdEmail);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });
}

export async function validateUser(userId) {
  const { error } = await supabase.from('users').update({ is_validated: true }).eq('id', userId);
  if (error) throw new Error(error.message);
  loadPendingUsers(); // Rafraîchir la liste
}
