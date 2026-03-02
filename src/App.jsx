import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createDefaultScenario } from './constants/defaults';
import { projectScenario } from './engines/projectionEngine';
import { openPrintReport } from './utils/openPrintReport';
import { downloadAudit } from './utils/downloadAudit';
import { openBillingPortal } from './services/stripeService';
import WizardShell from './views/wizard/WizardShell';
import Dashboard from './views/dashboard/Dashboard';
import CompareView from './views/compare/CompareView';
import EstateView from './views/estate/EstateView';
import DebtView from './views/debt/DebtView';
import WhatIfPanel from './views/WhatIfPanel';
import SaveNudgeScreen from './views/SaveNudgeScreen';
import { LandingPage } from './views/LandingPage';
import MyPlansView from './views/MyPlansView';
import AdminView from './views/admin/AdminView';
import AccountMenu from './components/AccountMenu';
import SubscriptionBadge from './components/SubscriptionBadge';
import UpgradePrompt from './components/UpgradePrompt';
import { GatedButton } from './components/GatedButton';
import { EnvironmentBadge } from './components/EnvironmentBadge';
import { useSubscription } from './contexts/SubscriptionContext';
import { useAuth } from './contexts/AuthContext';
import { useCloudSync } from './hooks/useCloudSync';
import { deleteScenario as deleteScenarioFromCloud } from './services/scenarioService';

const WIZARD_CHECKPOINT_KEY = 'rp-wizard-step';
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const NAV_TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'debt', label: 'Debt' },
  { key: 'compare', label: 'Compare' },
  { key: 'estate', label: 'Estate' },
];

const STORAGE_KEY = 'retirement-planner-data';
const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);

function migrateScenario(s) {
  if (s.realEstateValue > 0 && s.includeRealEstateInEstate === false) {
    s.includeRealEstateInEstate = true;
  }
  if (s.rrspMeltdownEnabled && s.rrspMeltdownStartAge == null) {
    s.rrspMeltdownStartAge = s.currentAge;
    s._meltdownStartAgeMigrated = true;
  }
  return s;
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Array.isArray(data?.scenarios) && data.scenarios.length > 0) {
      data.scenarios.forEach(migrateScenario);
      return { scenarios: data.scenarios, currentScenarioId: data.currentScenarioId, view: data.view };
    }
    if (Array.isArray(data?.users) && data.users.length > 0) {
      const allScenarios = data.users.flatMap(u => (u.scenarios || []).map(migrateScenario));
      if (allScenarios.length === 0) return null;
      return { scenarios: allScenarios, currentScenarioId: data.currentScenarioId, view: data.view };
    }
  } catch { /* ignore corrupt data */ }
  return null;
}

export default function App() {
  const { isPaid, isPastDue } = useSubscription();
  const { user: authUser } = useAuth();

  const [scenarios, setScenarios] = useState(() => {
    const saved = loadSaved();
    if (saved?.scenarios?.length > 0) return saved.scenarios;
    return [];
  });
  const [currentScenarioId, setCurrentScenarioId] = useState(() => {
    const saved = loadSaved();
    return saved?.currentScenarioId || saved?.scenarios?.[0]?.id || null;
  });
  const [view, setView] = useState(() => {
    const saved = loadSaved();
    if (saved?.scenarios?.length > 0) return 'dashboard';
    return 'landing';
  });
  const [wizardStep, setWizardStep] = useState(() => {
    const saved = loadSaved();
    if (saved?.scenarios?.length > 0) return 0;
    try {
      const checkpoint = parseInt(localStorage.getItem(WIZARD_CHECKPOINT_KEY), 10);
      if (!isNaN(checkpoint) && checkpoint >= 0 && checkpoint <= 8) return checkpoint;
    } catch { /* ignore */ }
    return 0;
  });
  const [whatIfOverrides, setWhatIfOverrides] = useState({});
  const [whatIfExpanded, setWhatIfExpanded] = useState(true);
  const importInputRef = useRef(null);

  useEffect(() => {
    const data = { scenarios, currentScenarioId, view: view === 'wizard' ? 'dashboard' : view };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [scenarios, currentScenarioId, view]);

  // After sign-in on landing page, move to wizard
  useEffect(() => {
    if (view === 'landing' && authUser) {
      if (scenarios.length === 0) {
        const newScenario = createDefaultScenario('My Plan');
        setScenarios([newScenario]);
        setCurrentScenarioId(newScenario.id);
      }
      setView('wizard');
    }
  }, [authUser, view]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (view !== 'dashboard' && view !== 'wizard' && view !== 'save-nudge') return;
    const hasValidCurrent = scenarios.some((s) => s.id === currentScenarioId);
    if (scenarios.length >= 2 && !hasValidCurrent) setView('my-plans');
  }, [scenarios, currentScenarioId, view]);

  const currentScenario = useMemo(
    () => scenarios.find((s) => s.id === currentScenarioId) || scenarios[0] || null,
    [scenarios, currentScenarioId],
  );
  const projectionData = useMemo(
    () => (currentScenario ? projectScenario(currentScenario, whatIfOverrides) : []),
    [currentScenario, whatIfOverrides],
  );
  const effectiveScenario = useMemo(
    () => (currentScenario ? { ...currentScenario, ...whatIfOverrides } : null),
    [currentScenario, whatIfOverrides],
  );
  const isAdmin = authUser?.email === ADMIN_EMAIL;

  const handleSignIn = useCallback((cloudScenarios) => {
    if (cloudScenarios.length === 0) return;
    setScenarios(cloudScenarios);
    setCurrentScenarioId(cloudScenarios[0].id);
    setWhatIfOverrides({});
  }, []);

  const { saveStatus, checkCanCreate } = useCloudSync({
    user: authUser,
    currentScenario,
    onSignIn: handleSignIn,
  });

  const handleScenarioChange = useCallback((updates) => {
    setScenarios((prev) => prev.map((s) => (s.id === currentScenarioId ? { ...s, ...updates } : s)));
  }, [currentScenarioId]);

  const handleRenameScenario = useCallback((newName) => {
    let name = typeof newName === 'string' ? newName : null;
    if (!name) name = prompt('Rename scenario:', currentScenario?.name || '');
    if (!name?.trim() || name.trim() === currentScenario?.name) return;
    setScenarios((prev) => prev.map((s) => (s.id === currentScenarioId ? { ...s, name: name.trim() } : s)));
  }, [currentScenario, currentScenarioId]);

  const handleStartNew = useCallback(async () => {
    const allowed = await checkCanCreate();
    if (!allowed) return;
    const newScenario = createDefaultScenario('My Plan');
    setScenarios((prev) => [...prev, newScenario]);
    setCurrentScenarioId(newScenario.id);
    setWizardStep(0);
    localStorage.removeItem(WIZARD_CHECKPOINT_KEY);
    setWhatIfOverrides({});
    setView('wizard');
  }, [checkCanCreate]);

  const handleLoadScenario = useCallback((jsonData) => {
    let loaded = [];
    if (jsonData?.version === 3 && Array.isArray(jsonData.scenarios)) {
      loaded = jsonData.scenarios;
    } else if (jsonData?.version === 2 && Array.isArray(jsonData.users)) {
      loaded = jsonData.users.flatMap(u => u.scenarios || []);
    } else {
      loaded = Array.isArray(jsonData) ? jsonData : [jsonData];
    }
    const valid = loaded
      .filter(s => s?.currentAge != null && s?.retirementAge != null)
      .map(s => ({ ...createDefaultScenario(), ...migrateScenario(s), id: s.id || uid() }));
    if (valid.length === 0) { alert('No valid scenarios found in this file.'); return; }
    setScenarios((prev) => {
      const existingIds = new Set(prev.map(s => s.id));
      return [...prev, ...valid.map(s => existingIds.has(s.id) ? { ...s, id: uid() } : s)];
    });
    setCurrentScenarioId(valid[0].id);
    setWhatIfOverrides({});
    setView('dashboard');
  }, []);

  const handleWizardComplete = useCallback(() => setView('dashboard'), []);

  const handleExport = useCallback(() => {
    const payload = { version: 3, scenarios, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), {
      href: url, download: `retirement-plan-${new Date().toISOString().slice(0, 10)}.json`,
    });
    link.click();
    URL.revokeObjectURL(url);
  }, [scenarios]);

  const handleImport = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try { handleLoadScenario(JSON.parse(e.target.result)); }
      catch { alert('Invalid file. Please select a valid JSON file.'); }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [handleLoadScenario]);

  const handleSwitchScenario = useCallback((id) => {
    setCurrentScenarioId(id);
    setWhatIfOverrides({});
  }, []);

  const handleDuplicateScenario = useCallback(() => {
    const copy = { ...currentScenario, id: uid(), name: `${currentScenario.name} (copy)`, createdAt: new Date().toISOString() };
    setScenarios((prev) => [...prev, copy]);
    setCurrentScenarioId(copy.id);
    setWhatIfOverrides({});
  }, [currentScenario]);

  const handleDeleteScenario = useCallback((id) => {
    setScenarios((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((s) => s.id !== id);
      if (id === currentScenarioId) { setCurrentScenarioId(next[0].id); setWhatIfOverrides({}); }
      return next;
    });
    if (authUser) {
      deleteScenarioFromCloud(authUser.id, id).catch(() => {});
    }
  }, [currentScenarioId, authUser]);

  const handleOverrideChange = useCallback((key, value) => {
    setWhatIfOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleResetOverrides = useCallback(() => setWhatIfOverrides({}), []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const menuAction = (fn) => () => { setMenuOpen(false); fn(); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {isPastDue && (
        <div className="bg-red-600 text-white text-center py-2 text-sm">
          Your payment failed.{' '}
          <button type="button" onClick={openBillingPortal}
            className="underline font-semibold hover:text-red-100 transition-colors">
            Update your card
          </button>{' '}
          to keep access.
        </div>
      )}
      {view !== 'wizard' && view !== 'save-nudge' && view !== 'landing' && (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-3">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight shrink-0">
            RetirePlanner.ca
          </h1>

          <div className="flex items-center gap-2 min-w-0">
            {authUser && scenarios.length > 0 && (
              <select value={currentScenarioId || ''} onChange={(e) => handleSwitchScenario(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-sunset-400 max-w-[180px]">
                {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}

            {authUser && saveStatus === 'saving' && <span className="text-xs text-gray-400 shrink-0">Saving...</span>}
            {authUser && saveStatus === 'saved' && <span className="text-xs text-green-600 shrink-0">Saved</span>}
            {authUser && saveStatus === 'error' && <span className="text-xs text-red-500 shrink-0">Save failed</span>}

            <div className="relative" ref={menuRef}>
              <button type="button" onClick={() => setMenuOpen(v => !v)}
                className={`p-1.5 rounded-lg transition-colors ${
                  menuOpen ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`} aria-label="Actions menu">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl
                                border border-gray-200 py-1.5 z-50">
                  {!authUser && (
                    <>
                      <button onClick={menuAction(() => setSignInOpen(true))}
                        className="menu-item font-semibold text-orange-500">
                        Sign in to save & manage →
                      </button>
                      <div className="border-t border-gray-100 my-1.5 mx-3" />
                    </>
                  )}

                  {authUser && (
                    <>
                      <button onClick={menuAction(() => { setWizardStep(0); setView('wizard'); })} className="menu-item">Edit Plan</button>
                      <button onClick={menuAction(handleStartNew)} className="menu-item">New Plan</button>
                      <button onClick={menuAction(() => handleRenameScenario())} className="menu-item">Rename Plan</button>
                      <button onClick={menuAction(handleDuplicateScenario)} className="menu-item">Duplicate Plan</button>
                      {currentScenario && (
                        <GatedButton featureName="PDF Export"
                          onClick={menuAction(() => openPrintReport(effectiveScenario, projectionData, currentScenario.name))}
                          className="menu-item w-full text-left">PDF Report</GatedButton>
                      )}
                      {currentScenario && (
                        <GatedButton featureName="Audit Export"
                          onClick={menuAction(() => downloadAudit(effectiveScenario, projectionData))}
                          className="menu-item w-full text-left">Calculation Audit</GatedButton>
                      )}
                      <div className="border-t border-gray-100 my-1.5 mx-3" />
                      <button onClick={menuAction(handleExport)} className="menu-item">Export</button>
                      <button onClick={menuAction(() => importInputRef.current?.click())} className="menu-item">Import</button>
                      <div className="border-t border-gray-100 my-1.5 mx-3" />
                    </>
                  )}

                  <button onClick={menuAction(() => { if (confirm('Clear everything and start over?')) { localStorage.clear(); location.reload(); } })}
                    className="menu-item text-gray-400 hover:!text-gray-600">Start Over</button>

                  {authUser && scenarios.length > 1 && (
                    <>
                      <div className="border-t border-gray-100 my-1.5 mx-3" />
                      <button onClick={menuAction(() => { if (confirm(`Delete "${currentScenario?.name}"?`)) handleDeleteScenario(currentScenarioId); })}
                        className="menu-item text-red-600 hover:!bg-red-50">Delete Plan</button>
                    </>
                  )}
                </div>
              )}
            </div>

            <input ref={importInputRef} type="file" accept=".json,application/json"
              onChange={handleImport} className="hidden" aria-label="Import scenario file" />

            <EnvironmentBadge />
            <SubscriptionBadge />
            <AccountMenu onAdmin={isAdmin ? () => setView('admin') : null} open={signInOpen} onOpenChange={setSignInOpen} />
          </div>
        </div>

        <nav className="px-4 sm:px-6 lg:px-10 pb-2 flex gap-1">
          {NAV_TABS.map((tab) => (
            <button key={tab.key} type="button" onClick={() => setView(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150 ${
                view === tab.key ? 'bg-sunset-50 text-sunset-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      )}

      <main className="flex-1">
        <div className="view-enter" key={view}>
          {view === 'landing' && (
            <LandingPage onTryAnonymous={() => {
              const newScenario = createDefaultScenario('My Plan');
              setScenarios([newScenario]);
              setCurrentScenarioId(newScenario.id);
              setView('wizard');
            }} />
          )}
          {view === 'wizard' && currentScenario && (
            <WizardShell scenario={currentScenario} onChange={handleScenarioChange}
              onComplete={handleWizardComplete} currentStep={wizardStep} onStepChange={setWizardStep} />
          )}
          {view === 'dashboard' && currentScenario && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              {isPaid
                ? <WhatIfPanel scenario={currentScenario} overrides={whatIfOverrides}
                    onOverrideChange={handleOverrideChange} onReset={handleResetOverrides}
                    expanded={whatIfExpanded} onToggle={() => setWhatIfExpanded(v => !v)} />
                : <UpgradePrompt variant="compact" featureName="What-If Analysis" />
              }
              <Dashboard scenario={effectiveScenario} projectionData={projectionData}
                onScenarioChange={handleScenarioChange} isPaid={isPaid} />
            </div>
          )}
          {view === 'debt' && currentScenario && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              <DebtView scenario={currentScenario} projectionData={projectionData} onNavigate={(v) => setView(v)} />
            </div>
          )}
          {view === 'compare' && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              {isPaid
                ? <CompareView scenarios={scenarios} onNavigate={(v) => setView(v)} />
                : <UpgradePrompt variant="full" featureName="Compare" />
              }
            </div>
          )}
          {view === 'estate' && currentScenario && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              {isPaid
                ? <EstateView scenario={currentScenario} projectionData={projectionData}
                    onNavigate={(v) => setView(v)}
                    lifeExpectancyOverride={whatIfOverrides.lifeExpectancy}
                    onLifeExpectancyChange={(v) => handleOverrideChange('lifeExpectancy', v)} />
                : <UpgradePrompt variant="full" featureName="Estate Planning" />
              }
            </div>
          )}
          {view === 'save-nudge' && <SaveNudgeScreen onSkip={() => setView('dashboard')} />}
          {view === 'my-plans' && (
            <MyPlansView
              scenarios={scenarios}
              onSelect={(id) => { setCurrentScenarioId(id); setWhatIfOverrides({}); setView('dashboard'); }}
              onStartNew={handleStartNew}
            />
          )}
          {view === 'admin' && isAdmin && <AdminView />}
        </div>
      </main>

      <footer className="py-4 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400">
          RetirePlanner.ca &middot; Not financial advice &middot;{' '}
          <a href="/privacy" className="hover:underline">Privacy</a>
          {' '}&middot;{' '}
          <a href="/terms" className="hover:underline">Terms</a>
        </p>
      </footer>
    </div>
  );
}
