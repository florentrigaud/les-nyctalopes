import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  import.meta.env?.SUPABASE_URL || '',
  import.meta.env?.SUPABASE_KEY || ''
);

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return user;
}
// Toggle entre connexion et inscription
document.getElementById('btnLogin').addEventListener('click', () => {
  document.getElementById('login-form').style.display = 'flex';
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('auth-title').textContent = 'Connexion';
  document.getElementById('btnLogin').classList.add('active');
  document.getElementById('btnRegister').classList.remove('active');
});

document.getElementById('btnRegister').addEventListener('click', () => {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'flex';
  document.getElementById('auth-title').textContent = 'Créer un compte';
  document.getElementById('btnRegister').classList.add('active');
  document.getElementById('btnLogin').classList.remove('active');
});

// Inscription avec Supabase
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const username = document.getElementById('reg-username').value;
  const message = document.getElementById('auth-message');

  // Vérification mots de passe
  if (password !== confirm) {
    message.textContent = '❌ Les mots de passe ne correspondent pas.';
    message.style.color = 'red';
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username } // stocké dans user_metadata
    }
  });

  if (error) {
    message.textContent = '❌ ' + error.message;
    message.style.color = 'red';
  } else {
    message.textContent = '✅ Compte créé ! Vérifiez votre email pour confirmer.';
    message.style.color = 'green';
  }
});
