'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Tab = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg({ text: 'Connexion…', ok: true });
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setMsg({ text: '❌ ' + error.message, ok: false });
      return;
    }
    router.replace('/fiches');
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg({ text: '❌ Les mots de passe ne correspondent pas.', ok: false });
      return;
    }
    setBusy(true);
    setMsg({ text: 'Création du compte…', ok: true });
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setMsg({ text: '❌ ' + error.message, ok: false });
      return;
    }
    setMsg({ text: '✅ Compte créé ! Connectez-vous.', ok: true });
    setTab('login');
  }

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <div className="auth-title">Les Nyctalopes</div>
        <div className="auth-sub">Plateforme Pathfinder · PF1 &amp; PF2</div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setMsg(null); }}
          >Se connecter</button>
          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setMsg(null); }}
          >Créer un compte</button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="auth-group">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="aventurier@golarion.fr" required />
            </div>
            <div className="auth-group">
              <label className="auth-label">Mot de passe</label>
              <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="auth-btn" type="submit" disabled={busy}>⚔ Entrer dans les Forges</button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="auth-group">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="auth-group">
              <label className="auth-label">Mot de passe</label>
              <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="auth-group">
              <label className="auth-label">Confirmer le mot de passe</label>
              <input className="auth-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button className="auth-btn" type="submit" disabled={busy}>✦ Forger mon compte</button>
          </form>
        )}

        <p className="auth-msg" style={{ color: msg?.ok ? 'var(--green2)' : 'var(--red2)' }}>
          {msg?.text || ''}
        </p>
      </div>
    </div>
  );
}
