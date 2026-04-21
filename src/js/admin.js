import { supabase, getCurrentUser } from './auth.js';
import { hasSupabaseConfig } from './config.js';

let currentAdminId = null;

function denyAccess(message) {
  alert(message);
  window.location.href = '/index.html';
}

async function checkAdminAccess(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('is_admin, is_validated')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Erreur verification admin:', error.message);
    return false;
  }

  return Boolean(data?.is_admin === true && data?.is_validated !== false);
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!hasSupabaseConfig()) {
    denyAccess('Configuration Supabase manquante.');
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    denyAccess('Acces refuse : vous devez etre connecte.');
    return;
  }

  const isAdmin = await checkAdminAccess(user.id);
  if (!isAdmin) {
    denyAccess('Acces refuse : droits administrateur requis.');
    return;
  }

  currentAdminId = user.id;
  await loadPendingUsers();
});

async function loadPendingUsers() {
  if (!currentAdminId || !(await checkAdminAccess(currentAdminId))) {
    denyAccess('Session admin invalide.');
    return;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('is_validated', false);

  if (error) {
    console.error(error);
    alert('Erreur lors du chargement des utilisateurs.');
    return;
  }

  const tbody = document.getElementById('users-list');
  tbody.innerHTML = '';

  (data || []).forEach((user) => {
    const tr = document.createElement('tr');
    const tdEmail = document.createElement('td');
    tdEmail.textContent = user.email;

    const tdAction = document.createElement('td');
    const btn = document.createElement('button');
    btn.textContent = 'Valider';
    btn.addEventListener('click', async () => {
      try {
        await validateUser(user.id);
      } catch (err) {
        alert(err.message);
      }
    });

    tdAction.appendChild(btn);
    tr.appendChild(tdEmail);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });
}

export async function validateUser(userId) {
  if (!currentAdminId || !(await checkAdminAccess(currentAdminId))) {
    denyAccess('Session admin invalide.');
    return;
  }

  if (userId === currentAdminId) {
    throw new Error('Action interdite : auto-validation admin.');
  }

  const { error } = await supabase
    .from('users')
    .update({ is_validated: true })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  await loadPendingUsers();
}
