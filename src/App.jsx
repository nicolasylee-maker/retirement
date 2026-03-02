import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createDefaultScenario, createDefaultUser } from './constants/defaults';
import { projectScenario } from './engines/projectionEngine';
import { openPrintReport } from './utils/openPrintReport';
import { downloadAudit } from './utils/downloadAudit';
import defaultData from './data/defaultData.json';
import WelcomeScreen from './views/WelcomeScreen';
import NewPersonScreen from './views/NewPersonScreen';
import WizardShell from './views/wizard/WizardShell';
import Dashboard from './views/dashboard/Dashboard';
import CompareView from './views/compare/CompareView';
import EstateView from './views/estate/EstateView';
import DebtView from './views/debt/DebtView';
import WhatIfPanel from './views/WhatIfPanel';
import AccountMenu from './components/AccountMenu';
import SubscriptionBadge from './components/SubscriptionBadge';

const NAV_TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'debt', label: 'Debt' },
  { key: 'compare', label: 'Compare' },
  { key: 'estate', label: 'Estate' },
];

const STORAGE_KEY = 'retirement-planner-data';
const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);

function migrateScenario(s) {
  // v1→v2: default includeRealEstateInEstate to true if user has real estate
  if (s.realEstateValue > 0 && s.includeRealEstateInEstate === false) {
    s.includeRealEstateInEstate = true;
  }
  // v2→v3: add rrspMeltdownStartAge for existing meltdown plans
  if (s.rrspMeltdownEnabled && s.rrspMeltdownStartAge == null) {
    s.rrspMeltdownStartAge = s.currentAge; // preserve existing behavior
    s._meltdownStartAgeMigrated = true;
  }
  return s;
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.users?.length > 0) {
      // Run migrations on all scenarios
      data.users.forEach(u => u.scenarios?.forEach(s => migrateScenario(s)));
      return data;
    }
  } catch { /* ignore corrupt data */ }
  return null;
}

export default function App() {
  const [users, setUsers] = useState(() => {
    const saved = loadSaved();
    if (saved) return saved.users;
    // Load bundled default data (mother's data)
    if (defaultData?.users?.length > 0) {
      defaultData.users.forEach(u => u.scenarios?.forEach(s => migrateScenario(s)));
      return defaultData.users;
    }
    return [createDefaultUser('Individual 1')];
  });
  const [currentUserId, setCurrentUserId] = useState(() => {
    const saved = loadSaved();
    return saved?.currentUserId || users[0]?.id;
  });
  const [currentScenarioId, setCurrentScenarioId] = useState(() => {
    const saved = loadSaved();
    if (saved?.currentScenarioId) return saved.currentScenarioId;
    const user = users.find((u) => u.id === currentUserId) || users[0];
    return user?.scenarios[0]?.id || null;
  });
  const [view, setView] = useState(() => {
    const saved = loadSaved();
    if (saved?.view && saved.view !== 'wizard' && saved.view !== 'new-person') return saved.view;
    // Show welcome if no scenarios exist yet
    const user = users.find((u) => u.id === currentUserId) || users[0];
    return user?.scenarios.length > 0 ? 'dashboard' : 'welcome';
  });
  const [wizardStep, setWizardStep] = useState(0);
  const [whatIfOverrides, setWhatIfOverrides] = useState({});
  const [whatIfExpanded, setWhatIfExpanded] = useState(true);
  const importInputRef = useRef(null);

  // Auto-save to localStorage
  useEffect(() => {
    const data = { users, currentUserId, currentScenarioId, view: (view === 'wizard' || view === 'new-person') ? 'dashboard' : view };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [users, currentUserId, currentScenarioId, view]);

  // Derived state
  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || users[0],
    [users, currentUserId],
  );
  const scenarios = currentUser.scenarios;
  const currentScenario = useMemo(
    () => (currentScenarioId && scenarios.find((s) => s.id === currentScenarioId)) || scenarios[0] || null,
    [scenarios, currentScenarioId],
  );
  const projectionData = useMemo(
    () => (currentScenario ? projectScenario(currentScenario, whatIfOverrides) : []),
    [currentScenario, whatIfOverrides],
  );
  // Scenario with what-if overrides merged in — used for display/calculations that
  // should reflect slider changes (Key Assumptions, Safe Spend, etc.)
  const effectiveScenario = useMemo(
    () => (currentScenario ? { ...currentScenario, ...whatIfOverrides } : null),
    [currentScenario, whatIfOverrides],
  );

  // Helper: update scenarios for current user
  const updateScenarios = useCallback(
    (updater) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === currentUserId ? { ...u, scenarios: updater(u.scenarios) } : u)),
      );
    },
    [currentUserId],
  );

  // --- User management ---
  const handleAddUser = useCallback(() => setView('new-person'), []);

  const handleNewPersonStart = useCallback((name) => {
    const newUser = createDefaultUser(name.trim());
    const newScenario = createDefaultScenario(`${name.trim()}'s Plan`);
    newUser.scenarios = [newScenario];
    setUsers((prev) => [...prev, newUser]);
    setCurrentUserId(newUser.id);
    setCurrentScenarioId(newScenario.id);
    setWhatIfOverrides({});
    setWizardStep(0);
    setView('wizard');
  }, []);

  const handleNewPersonLoad = useCallback((jsonData) => {
    let incoming = [];
    if (jsonData?.version === 2 && Array.isArray(jsonData.users)) {
      incoming = jsonData.users
        .filter((u) => u?.name && Array.isArray(u.scenarios) && u.scenarios.length > 0)
        .map((u) => ({
          ...u,
          id: u.id || uid(),
          scenarios: u.scenarios.map((s) => ({ ...createDefaultScenario(), ...s, id: s.id || uid() })),
        }));
    } else {
      const arr = Array.isArray(jsonData) ? jsonData : [jsonData];
      const valid = arr.filter((s) => s?.currentAge != null && s?.retirementAge != null);
      if (valid.length === 0) { alert('Invalid file.'); return; }
      const user = createDefaultUser(valid[0].name || 'Imported');
      user.scenarios = valid.map((s) => ({ ...createDefaultScenario(), ...s, id: s.id || uid() }));
      incoming = [user];
    }
    if (incoming.length === 0) { alert('No valid data found.'); return; }
    setUsers((prev) => {
      const existingIds = new Set(prev.map((u) => u.id));
      const toAdd = incoming.map((u) => existingIds.has(u.id) ? { ...u, id: uid() } : u);
      return [...prev, ...toAdd];
    });
    setCurrentUserId(incoming[0].id);
    setCurrentScenarioId(incoming[0].scenarios[0].id);
    setWhatIfOverrides({});
    setView('dashboard');
  }, []);

  const handleSwitchUser = useCallback(
    (userId) => {
      if (userId === '__add__') { handleAddUser(); return; }
      setCurrentUserId(userId);
      const user = users.find((u) => u.id === userId);
      if (user?.scenarios.length > 0) {
        setCurrentScenarioId(user.scenarios[0].id);
        setView('dashboard');
      } else {
        setCurrentScenarioId(null);
        setView('welcome');
      }
      setWhatIfOverrides({});
    },
    [users, handleAddUser],
  );

  const handleRenameUser = useCallback((newName) => {
    // If called with a string directly (from wizard), use it; otherwise prompt
    let name = typeof newName === 'string' ? newName : null;
    if (!name) {
      name = prompt('Rename individual:', currentUser.name);
    }
    if (!name?.trim() || name.trim() === currentUser.name) return;
    setUsers((prev) => prev.map((u) => (u.id === currentUserId ? { ...u, name: name.trim() } : u)));
  }, [currentUser.name, currentUserId]);

  const handleDeleteUser = useCallback(() => {
    if (users.length <= 1) return;
    if (!confirm(`Delete "${currentUser.name}" and all their scenarios?`)) return;
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== currentUserId);
      setCurrentUserId(next[0].id);
      setCurrentScenarioId(next[0].scenarios[0]?.id || null);
      setWhatIfOverrides({});
      return next;
    });
    setView('dashboard');
  }, [users.length, currentUser.name, currentUserId]);

  // --- Scenario management ---
  const handleScenarioChange = useCallback(
    (updates) => {
      updateScenarios((prev) =>
        prev.map((s) => (s.id === currentScenarioId ? { ...s, ...updates } : s)),
      );
    },
    [currentScenarioId, updateScenarios],
  );

  const handleRenameScenario = useCallback(
    (newName) => {
      let name = typeof newName === 'string' ? newName : null;
      if (!name) {
        name = prompt('Rename scenario:', currentScenario?.name || '');
      }
      if (!name?.trim() || name.trim() === currentScenario?.name) return;
      updateScenarios((prev) =>
        prev.map((s) => (s.id === currentScenarioId ? { ...s, name: name.trim() } : s)),
      );
    },
    [currentScenario, currentScenarioId, updateScenarios],
  );

  const handleStartNew = useCallback(() => {
    const newScenario = createDefaultScenario(`${currentUser.name}'s Plan`);
    updateScenarios((prev) => [...prev, newScenario]);
    setCurrentScenarioId(newScenario.id);
    setWizardStep(0);
    setWhatIfOverrides({});
    setView('wizard');
  }, [currentUser.name, updateScenarios]);

  const handleLoadScenario = useCallback(
    (jsonData) => {
      // Support new format { version: 2, users: [...] } or legacy array of scenarios
      if (jsonData?.version === 2 && Array.isArray(jsonData.users)) {
        const validUsers = jsonData.users.filter(
          (u) => u?.name && Array.isArray(u.scenarios) && u.scenarios.length > 0,
        );
        if (validUsers.length === 0) { alert('No valid data found.'); return; }
        const hydrated = validUsers.map((u) => ({
          ...u, id: u.id || uid(),
          scenarios: u.scenarios.map((s) => ({ ...createDefaultScenario(), ...s, id: s.id || uid() })),
        }));
        setUsers(hydrated);
        setCurrentUserId(hydrated[0].id);
        setCurrentScenarioId(hydrated[0].scenarios[0].id);
        setWhatIfOverrides({});
        setView('dashboard');
        return;
      }
      // Legacy: plain array of scenarios
      const loaded = Array.isArray(jsonData) ? jsonData : [jsonData];
      const validated = loaded.filter(
        (s) => s && typeof s === 'object' && s.currentAge != null && s.retirementAge != null,
      );
      if (validated.length === 0) { alert('Invalid scenario file.'); return; }
      const withIds = validated.map((s) => ({ ...createDefaultScenario(), ...s, id: s.id || uid() }));
      updateScenarios(() => withIds);
      setCurrentScenarioId(withIds[0].id);
      setWhatIfOverrides({});
      setView('dashboard');
    },
    [updateScenarios],
  );

  const handleWizardComplete = useCallback(() => setView('dashboard'), []);

  const handleExport = useCallback(() => {
    const payload = { version: 2, users, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), {
      href: url, download: `retirement-plan-${new Date().toISOString().slice(0, 10)}.json`,
    });
    link.click();
    URL.revokeObjectURL(url);
  }, [users]);

  const handleImport = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try { handleLoadScenario(JSON.parse(e.target.result)); }
        catch { alert('Invalid file. Please select a valid JSON file.'); }
      };
      reader.readAsText(file);
      event.target.value = '';
    },
    [handleLoadScenario],
  );

  const handleSwitchScenario = useCallback((id) => {
    setCurrentScenarioId(id);
    setWhatIfOverrides({});
  }, []);

  const handleDuplicateScenario = useCallback(() => {
    const copy = { ...currentScenario, id: uid(), name: `${currentScenario.name} (copy)`, createdAt: new Date().toISOString() };
    updateScenarios((prev) => [...prev, copy]);
    setCurrentScenarioId(copy.id);
    setWhatIfOverrides({});
  }, [currentScenario, updateScenarios]);

  const handleDeleteScenario = useCallback(
    (id) => {
      updateScenarios((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((s) => s.id !== id);
        if (id === currentScenarioId) {
          setCurrentScenarioId(next[0].id);
          setWhatIfOverrides({});
        }
        return next;
      });
    },
    [currentScenarioId, updateScenarios],
  );

  const handleOverrideChange = useCallback((key, value) => {
    setWhatIfOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleResetOverrides = useCallback(() => setWhatIfOverrides({}), []);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const menuAction = (fn) => () => { setMenuOpen(false); fn(); };

  if (view === 'new-person') {
    return (
      <NewPersonScreen
        onStartNew={handleNewPersonStart}
        onLoadFile={handleNewPersonLoad}
        onCancel={() => setView('dashboard')}
      />
    );
  }

  if (view === 'welcome') {
    return <WelcomeScreen onStartNew={handleStartNew} onLoadScenario={handleLoadScenario} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {view !== 'wizard' && (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-3">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight shrink-0">
            Ontario Retirement Planner
          </h1>

          <div className="flex items-center gap-2 min-w-0">
            {/* Individual selector */}
            <select
              value={currentUserId}
              onChange={(e) => handleSwitchUser(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5
                         focus:outline-none focus:ring-2 focus:ring-purple-400 max-w-[150px]
                         font-medium text-purple-700 bg-purple-50"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
              <option value="__add__">+ Add Person</option>
            </select>

            {/* Scenario selector */}
            {scenarios.length > 0 && (
              <select
                value={currentScenarioId || ''}
                onChange={(e) => handleSwitchScenario(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-sunset-400 max-w-[180px]"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            {/* Actions menu */}
            <div className="relative" ref={menuRef}>
              <button type="button" onClick={() => setMenuOpen(v => !v)}
                className={`p-1.5 rounded-lg transition-colors ${
                  menuOpen ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
                aria-label="Actions menu"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl
                                border border-gray-200 py-1.5 z-50">
                  <button onClick={menuAction(() => { setWizardStep(0); setView('wizard'); })} className="menu-item">
                    Edit Plan
                  </button>
                  <button onClick={menuAction(handleStartNew)} className="menu-item">
                    New Plan
                  </button>
                  <button onClick={menuAction(() => handleRenameScenario())} className="menu-item">
                    Rename Plan
                  </button>
                  <button onClick={menuAction(handleDuplicateScenario)} className="menu-item">
                    Duplicate Plan
                  </button>
                  {currentScenario && (
                    <button onClick={menuAction(() => openPrintReport(effectiveScenario, projectionData, currentUser.name))}
                      className="menu-item">
                      PDF Report
                    </button>
                  )}
                  {currentScenario && (
                    <button onClick={menuAction(() => downloadAudit(effectiveScenario, projectionData))}
                      className="menu-item">
                      Calculation Audit
                    </button>
                  )}

                  <div className="border-t border-gray-100 my-1.5 mx-3" />

                  <button onClick={menuAction(handleExport)} className="menu-item">
                    Export
                  </button>
                  <button onClick={menuAction(() => importInputRef.current?.click())} className="menu-item">
                    Import
                  </button>

                  {(scenarios.length > 1 || users.length > 1) && (
                    <>
                      <div className="border-t border-gray-100 my-1.5 mx-3" />
                      {scenarios.length > 1 && (
                        <button onClick={menuAction(() => { if (confirm(`Delete "${currentScenario?.name}"?`)) handleDeleteScenario(currentScenarioId); })}
                          className="menu-item text-red-600 hover:!bg-red-50">
                          Delete Plan
                        </button>
                      )}
                      {users.length > 1 && (
                        <button onClick={menuAction(handleDeleteUser)}
                          className="menu-item text-red-600 hover:!bg-red-50">
                          Delete Person
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <input ref={importInputRef} type="file" accept=".json,application/json"
              onChange={handleImport} className="hidden" aria-label="Import scenario file" />

            <SubscriptionBadge />
            <AccountMenu />
          </div>
        </div>

        <nav className="px-4 sm:px-6 lg:px-10 pb-2 flex gap-1">
          {NAV_TABS.map((tab) => (
            <button key={tab.key} type="button" onClick={() => setView(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                view === tab.key
                  ? 'bg-sunset-50 text-sunset-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      )}

      <main className="flex-1">
        <div className="view-enter" key={view}>
          {view === 'wizard' && currentScenario && (
            <WizardShell scenario={currentScenario} onChange={handleScenarioChange}
              onComplete={handleWizardComplete} currentStep={wizardStep} onStepChange={setWizardStep}
              userName={currentUser.name} onUserNameChange={handleRenameUser} />
          )}

          {view === 'dashboard' && currentScenario && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              <WhatIfPanel scenario={currentScenario} overrides={whatIfOverrides}
                onOverrideChange={handleOverrideChange} onReset={handleResetOverrides}
                expanded={whatIfExpanded} onToggle={() => setWhatIfExpanded(v => !v)} />
              <Dashboard scenario={effectiveScenario} projectionData={projectionData} onScenarioChange={handleScenarioChange} />
            </div>
          )}

          {view === 'debt' && currentScenario && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              <DebtView scenario={currentScenario} projectionData={projectionData}
                onNavigate={(v) => setView(v)} />
            </div>
          )}

          {view === 'compare' && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              <CompareView scenarios={scenarios} onNavigate={(v) => setView(v)} />
            </div>
          )}

          {view === 'estate' && currentScenario && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              <EstateView scenario={currentScenario} projectionData={projectionData}
                onNavigate={(v) => setView(v)}
                lifeExpectancyOverride={whatIfOverrides.lifeExpectancy}
                onLifeExpectancyChange={(v) => handleOverrideChange('lifeExpectancy', v)} />
            </div>
          )}
        </div>
      </main>

      <footer className="py-4 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Ontario Retirement Planner &middot; Not financial advice
        </p>
      </footer>
    </div>
  );
}
