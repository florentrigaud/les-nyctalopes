'use client';

import { useEffect, useState } from 'react';
import InscriptionsTab from './tabs/InscriptionsTab';
import PersonnagesTab from './tabs/PersonnagesTab';
import SessionTab from './tabs/SessionTab';
import JetsTab from './tabs/JetsTab';

type TabKey = 'inscriptions' | 'personnages' | 'session' | 'jets';

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: 'inscriptions', label: 'Inscriptions', hint: 'Valider / refuser les comptes' },
  { key: 'personnages', label: 'Personnages', hint: 'Vue globale + groupes' },
  { key: 'session', label: 'Session live', hint: 'Party active + actions GM' },
  { key: 'jets', label: 'Jets de dés', hint: 'Feed temps réel' },
];

const VALID_KEYS = TABS.map((t) => t.key);

function readHashTab(): TabKey {
  if (typeof window === 'undefined') return 'inscriptions';
  const h = window.location.hash.replace(/^#/, '') as TabKey;
  return VALID_KEYS.includes(h) ? h : 'inscriptions';
}

export default function AdminTabs({ currentAdminId }: { currentAdminId: string }) {
  const [active, setActive] = useState<TabKey>('inscriptions');

  // Hydrate from hash once mounted; sync on hashchange too.
  useEffect(() => {
    setActive(readHashTab());
    const onHash = () => setActive(readHashTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function selectTab(k: TabKey) {
    setActive(k);
    if (typeof window !== 'undefined' && window.location.hash !== `#${k}`) {
      history.replaceState(null, '', `#${k}`);
    }
  }

  return (
    <div className="admin-tabs-shell">
      <nav className="admin-tab-bar" role="tablist" aria-label="Sections d'administration">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={`admin-tab ${active === t.key ? 'active' : ''}`}
            onClick={() => selectTab(t.key)}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="admin-tab-panel" role="tabpanel">
        {active === 'inscriptions' && <InscriptionsTab currentAdminId={currentAdminId} />}
        {active === 'personnages' && <PersonnagesTab />}
        {active === 'session' && <SessionTab currentAdminId={currentAdminId} />}
        {active === 'jets' && <JetsTab />}
      </div>
    </div>
  );
}
