import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createDefaultScenario } from './constants/defaults';
import { projectScenario } from './engines/projectionEngine';
import { openPrintReport } from './utils/openPrintReport';
import { downloadAudit } from './utils/downloadAudit';
import { downloadExcelAudit } from './utils/excel/index.js';
import { GA } from './utils/analytics';
import VisualAudit from './views/audit/VisualAudit';
import { openBillingPortal, startCheckout } from './services/stripeService';
import WizardShell from './views/wizard/WizardShell';
import BasicWizardView from './views/wizard/BasicWizardView';
import ModePicker from './components/ModePicker';
import Dashboard from './views/dashboard/Dashboard';
import CompareView from './views/compare/CompareView';
import EstateView from './views/estate/EstateView';
import DebtView from './views/debt/DebtView';
import WhatIfPanel from './views/WhatIfPanel';
import BetaWelcomeBanner from './components/BetaWelcomeBanner';
import AnonDashboardBanner from './components/AnonDashboardBanner';
import { LandingPage } from './views/LandingPage';
import MyPlansView from './views/MyPlansView';
import ReturningHomeView from './views/ReturningHomeView';
import ScenarioPickerView from './views/ScenarioPickerView';
import { getPickerTarget } from './utils/returningUserFlow.js';
import AdminView from './views/admin/AdminView';
import RecommendationsTab from './views/recommendations/RecommendationsTab';
import ReadinessView from './views/readiness/ReadinessView';
import { runOptimization } from './engines/optimizerEngine';
import AccountMenu from './components/AccountMenu';
import MobileMenu from './components/MobileMenu';
import ContactModal from './components/ContactModal';
import SubscriptionBadge from './components/SubscriptionBadge';
import UpgradePrompt from './components/UpgradePrompt';
import { GatedButton } from './components/GatedButton';
import { EnvironmentBadge } from './components/EnvironmentBadge';
import { useSubscription } from './contexts/SubscriptionContext';
import { useAuth } from './contexts/AuthContext';
import { useCloudSync } from './hooks/useCloudSync';
import { supabase } from './services/supabaseClient';
import { deleteScenario as deleteScenarioFromCloud, saveScenario } from './services/scenarioService';
import { getAiRecommendation } from './services/geminiService';
import { computeHash } from './components/AiInsight';
import { buildDashboardAiData, buildDebtAiData, buildCompareAiData, buildEstateAiData } from './utils/buildAiData';

const WIZARD_CHECKPOINT_KEY = 'rp-wizard-step';
const MODE_SEEN_KEY = 'rp-mode-seen';
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

function uniqueName(base, existingNames) {
  if (!existingNames.includes(base)) return base;
  let i = 2;
  while (existingNames.includes(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

const NAV_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )},
  { key: 'debt', label: 'Debt', icon: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )},
  { key: 'compare', label: 'Compare', icon: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  )},
  { key: 'estate', label: 'Estate', icon: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { key: 'deep-dive', label: 'Deep Dive', icon: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
    </svg>
  )},
  { key: 'recommendations', label: 'Optimize', special: true, icon: (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  )},
];

const STORAGE_KEY = 'retirement-planner-data';
const CHOICE_SEEN_KEY = 'rp-choice-seen';
const ANON_SESSION_KEY = 'rp-anonymous-session';
const ANON_STORAGE_KEY = 'rp-anonymous-session-backup'; // localStorage cross-tab backup
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
  const { isPaid, isPastDue, refresh: refreshSubscription, simulateFreeUser, setSimulateFreeUser, isOverride, override, overrideDaysRemaining } = useSubscription();
  const { user: authUser, isLoading: authLoading } = useAuth();

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
    if (saved?.scenarios?.length > 0) {
      if (sessionStorage.getItem(ANON_SESSION_KEY)) {
        // Restore the exact view the anon user was in. Views not in this list
        // fall back to the full wizard as a safe default.
        const anonRestorable = ['wizard', 'wizard-basic', 'landing', 'dashboard'];
        if (anonRestorable.includes(saved.view)) return saved.view;
        return 'wizard';
      }
      return saved.view || 'dashboard';
    }
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
  const [showModePicker, setShowModePicker] = useState(false);
  const [whatIfOverrides, setWhatIfOverrides] = useState({});
  const [whatIfExpanded, setWhatIfExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pickerAction, setPickerAction] = useState('results');
  const [wizardIsNew, setWizardIsNew] = useState(false);
  const importInputRef = useRef(null);
  const prevAuthUserRef = useRef(authUser);
  const wasAnonRef = useRef(false);

  useEffect(() => {
    // Persist the current view. readiness-rank is a one-time transition screen — always
    // restore to dashboard instead. wizard/wizard-basic are preserved so refresh restores
    // the correct in-progress mode.
    const data = { scenarios, currentScenarioId, view: view === 'readiness-rank' ? 'dashboard' : view };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [scenarios, currentScenarioId, view]);

  // Restore What If panel collapse preference for this user
  useEffect(() => {
    if (!authUser) return;
    const stored = localStorage.getItem(`whatif-expanded:${authUser.id}`);
    if (stored !== null) setWhatIfExpanded(stored === 'true');
  }, [authUser?.id]);

  // On sign-out, clear all state and return to landing page.
  // On sign-in, clear ANON_SESSION_KEY (may linger from a prior anonymous session)
  // and correct the view if we landed on wizard due to it.
  useEffect(() => {
    const wasLoggedIn = prevAuthUserRef.current !== null;
    const justLoggedIn = prevAuthUserRef.current === null && authUser !== null;
    prevAuthUserRef.current = authUser;

    if (wasLoggedIn && authUser === null) {
      setScenarios([]);
      setCurrentScenarioId(null);
      setWizardStep(0);
      setWhatIfOverrides({});
      setShowBetaWelcome(false);
      setView('landing');
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(WIZARD_CHECKPOINT_KEY);
      sessionStorage.removeItem(CHOICE_SEEN_KEY);
      sessionStorage.removeItem(MODE_SEEN_KEY);
      sessionStorage.removeItem(ANON_SESSION_KEY);
      localStorage.removeItem(ANON_STORAGE_KEY);
    }

    if (justLoggedIn) {
      wasAnonRef.current = !!(sessionStorage.getItem(ANON_SESSION_KEY) || localStorage.getItem(ANON_STORAGE_KEY));
      if (wasAnonRef.current) {
        sessionStorage.removeItem(ANON_SESSION_KEY);
        localStorage.removeItem(ANON_STORAGE_KEY);
        setView(v => (v === 'wizard' || v === 'wizard-basic') ? 'dashboard' : v);
      }
    }
  }, [authUser]);

  // If the user started checkout as anon (magic link / Google redirect away from the page),
  // resume checkout automatically when they land back signed in.
  // Suppress all interstitial screens (returning-home, ModePicker) before the async Stripe
  // redirect fires by marking both session keys and moving off 'landing'.
  useEffect(() => {
    if (!authUser) return;
    const pendingPriceId = sessionStorage.getItem('rp-pending-checkout');
    if (!pendingPriceId) return;
    sessionStorage.removeItem('rp-pending-checkout');
    sessionStorage.setItem(CHOICE_SEEN_KEY, '1');
    sessionStorage.setItem(MODE_SEEN_KEY, '1');
    setView(v => v === 'landing' ? 'dashboard' : v);
    startCheckout(pendingPriceId).catch(() => {});
  }, [authUser]);

  // Clear stale anonymous data when returning to the site after closing the browser.
  // sessionStorage is cleared on browser close, so if there are scenarios in
  // localStorage but no auth user and no anonymous session flag, it's stale.
  useEffect(() => {
    if (authLoading) return;
    if (authUser) return;
    if (sessionStorage.getItem(ANON_SESSION_KEY)) return;
    if (scenarios.length === 0) return;
    // Stale anonymous data — reset to landing
    setScenarios([]);
    setCurrentScenarioId(null);
    setWizardStep(0);
    setWhatIfOverrides({});
    setView('landing');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(WIZARD_CHECKPOINT_KEY);
    localStorage.removeItem(ANON_STORAGE_KEY);
  }, [authLoading, authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show the choice screen once per browser session for logged-in users with scenarios.
  // Covers the case where view initialises to 'dashboard' from localStorage (handleSignIn
  // only redirects when the user came from 'landing' or 'wizard').
  useEffect(() => {
    if (authLoading) return;
    if (!authUser) return;
    if (scenarios.length === 0) return;
    if (sessionStorage.getItem(CHOICE_SEEN_KEY)) return;
    sessionStorage.setItem(CHOICE_SEEN_KEY, '1');
    setView('returning-home');
  }, [authLoading, authUser, scenarios.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const DATA_VIEWS = ['dashboard', 'wizard', 'wizard-basic', 'save-nudge', 'compare', 'estate', 'deep-dive', 'recommendations', 'debt'];
    if (!DATA_VIEWS.includes(view)) return;
    if (scenarios.length === 0) { setView('landing'); return; }
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
  const optimizationResult = useMemo(
    () => (currentScenario && view === 'recommendations' ? runOptimization(currentScenario) : null),
    [currentScenario, view],
  );
  const isAdmin = authUser?.email === ADMIN_EMAIL;
  const adminBypass = isAdmin && !simulateFreeUser;

  const handleSignIn = useCallback((cloudScenarios, { fetchError } = {}) => {
    if (cloudScenarios.length > 0) {
      // Returning user — replace state with cloud data
      setScenarios(cloudScenarios);
      setCurrentScenarioId(cloudScenarios[0].id);
      setWhatIfOverrides({});
      setView(prev => (prev === 'landing' || prev === 'wizard' || prev === 'wizard-basic') ? 'returning-home' : prev);
      return;
    }
    if (fetchError) {
      // Fetch failed — don't create a fallback "My Plan" that would auto-save as a ghost row.
      return;
    }
    // Cloud genuinely empty
    const fallback = createDefaultScenario('My Plan');
    if (wasAnonRef.current) {
      // Converting anon user — keep their local scenarios, they'll auto-save to cloud
      setScenarios(prev => prev.length > 0 ? prev : [fallback]);
      setCurrentScenarioId(prev => prev || fallback.id);
    } else {
      // Deleted or brand-new user — trust cloud, start fresh
      setScenarios([fallback]);
      setCurrentScenarioId(fallback.id);
      localStorage.removeItem(STORAGE_KEY);
    }
    wasAnonRef.current = false;
    sessionStorage.setItem(CHOICE_SEEN_KEY, '1'); // skip returning-home for new users
    setView(prev => {
      if (prev !== 'landing') return prev;
      if (!sessionStorage.getItem(MODE_SEEN_KEY)) {
        setShowModePicker(true);
        return prev; // stay on landing until mode is chosen
      }
      return 'wizard';
    });
  }, []);

  const { saveStatus, syncDone } = useCloudSync({
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
    const otherNames = scenarios.filter(s => s.id !== currentScenarioId).map(s => s.name);
    const finalName = uniqueName(name.trim(), otherNames);
    const renamed = { ...currentScenario, name: finalName };
    setScenarios((prev) => prev.map((s) => (s.id === currentScenarioId ? renamed : s)));
    if (authUser) {
      saveScenario(authUser.id, renamed).catch((err) =>
        console.error('[rename] cloud save failed:', err)
      );
    }
  }, [currentScenario, currentScenarioId, authUser, scenarios]);

  const handleStartNew = useCallback(() => {
    const name = uniqueName('My Plan', scenarios.map(s => s.name));
    const newScenario = createDefaultScenario(name);
    setScenarios((prev) => [...prev, newScenario]);
    setCurrentScenarioId(newScenario.id);
    setWizardStep(0);
    localStorage.removeItem(WIZARD_CHECKPOINT_KEY);
    setWhatIfOverrides({});
    setWizardIsNew(true);
    setView('wizard');
    if (authUser) {
      saveScenario(authUser.id, newScenario).catch((err) =>
        console.error('[start-new] cloud save failed:', err)
      );
    }
  }, [authUser, scenarios]);

  const handleLoadScenario = useCallback(async (jsonData) => {
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
      .map(s => {
        const migrated = migrateScenario(s);
        const SCENARIO_KEYS = Object.keys(createDefaultScenario());
        const sanitized = Object.fromEntries(
          Object.entries(migrated).filter(([k]) => SCENARIO_KEYS.includes(k))
        );
        return { ...createDefaultScenario(), ...sanitized, id: uid() };
      });
    if (valid.length === 0) { alert('No valid scenarios found in this file.'); return; }
    setScenarios((prev) => [...prev, ...valid]);
    setCurrentScenarioId(valid[0].id);
    setWhatIfOverrides({});
    setView('dashboard');

    // Persist all imported scenarios to cloud immediately
    if (authUser) {
      try {
        await Promise.all(valid.map(s => saveScenario(authUser.id, s)));
      } catch (err) {
        console.error('[import-sync] save failed:', err);
      }
    }
  }, [authUser]);

  const handleWizardComplete = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    handleScenarioChange({ wizardMode: 'full' });
    setAutoAiPending(true);
    localStorage.setItem('rp-auto-ai-pending', '1');
    setWizardIsNew(false);
    setView('readiness-rank');
  }, [handleScenarioChange]);

  const handleModeSelect = useCallback((mode) => {
    sessionStorage.setItem(MODE_SEEN_KEY, '1');
    setShowModePicker(false);
    if (mode === 'basic') {
      // Apply Basic-mode smart defaults so preset pills show selected state on first render
      handleScenarioChange({
        monthlyExpenses: 5000,  // Comfortable preset
        cppMonthly: 815,        // Average preset
        oasMonthly: 713,        // Average preset
        // realReturn: 0.04 + inflationRate: 0.025 already match Balanced in createDefaultScenario
      });
      setView('wizard-basic');
    } else {
      setView('wizard');
    }
  }, [handleScenarioChange]);

  const handleBasicComplete = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    handleScenarioChange({ wizardMode: 'basic' });
    localStorage.setItem(`rp-wiz-${currentScenarioId}`, '1');
    localStorage.removeItem(WIZARD_CHECKPOINT_KEY);
    setAutoAiPending(true);
    localStorage.setItem('rp-auto-ai-pending', '1');
    setWizardIsNew(false);
    setView('readiness-rank');
  }, [handleScenarioChange, currentScenarioId]);

  const handleWizardExit = useCallback(() => {
    const hasMultiple = scenarios.length > 1;
    setView(authUser && hasMultiple ? 'my-plans' : 'landing');
  }, [authUser, scenarios.length]);

  const handleChoiceViewResults = useCallback(() => {
    sessionStorage.setItem(CHOICE_SEEN_KEY, '1');
    const { skip, scenarioId } = getPickerTarget(scenarios);
    if (skip) {
      setCurrentScenarioId(scenarioId);
      setWhatIfOverrides({});
      setView('dashboard');
    } else {
      setPickerAction('results');
      setView('scenario-picker');
    }
  }, [scenarios]);

  const handleChoiceEditPlan = useCallback(() => {
    sessionStorage.setItem(CHOICE_SEEN_KEY, '1');
    setPickerAction('edit');
    setView('scenario-picker');
  }, []);

  const handleChoiceCreateNew = useCallback(() => {
    sessionStorage.setItem(CHOICE_SEEN_KEY, '1');
    handleStartNew();
  }, [handleStartNew]);

  const handlePickerSelect = useCallback((id) => {
    setCurrentScenarioId(id);
    setWhatIfOverrides({});
    if (pickerAction === 'edit') {
      setWizardStep(0);
      setWizardIsNew(false);
      setView('wizard');
    } else {
      setView('dashboard');
    }
  }, [pickerAction]);

  const handleExport = useCallback(() => {
    if (!currentScenario) return;
    const payload = { version: 3, scenarios: [currentScenario], exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const name = (currentScenario.name || 'plan').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
    const link = Object.assign(document.createElement('a'), {
      href: url, download: `${name}-${new Date().toISOString().slice(0, 10)}.json`,
    });
    link.click();
    URL.revokeObjectURL(url);
  }, [currentScenario]);

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
    const copyName = uniqueName(`${currentScenario.name} (copy)`, scenarios.map(s => s.name));
    const copy = { ...currentScenario, id: uid(), name: copyName, createdAt: new Date().toISOString() };
    setScenarios((prev) => [...prev, copy]);
    setCurrentScenarioId(copy.id);
    setWhatIfOverrides({});
    if (authUser) {
      saveScenario(authUser.id, copy).catch((err) =>
        console.error('[duplicate] cloud save failed:', err)
      );
    }
  }, [currentScenario, authUser, scenarios]);

  const handleDeleteScenario = useCallback((id) => {
    setScenarios((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((s) => s.id !== id);
      if (id === currentScenarioId) { setCurrentScenarioId(next[0].id); setWhatIfOverrides({}); }
      return next;
    });
    if (authUser) {
      deleteScenarioFromCloud(authUser.id, id).catch((err) =>
        console.error('[delete] cloud delete failed:', err)
      );
    }
  }, [currentScenarioId, authUser]);

  const handleOverrideChange = useCallback((key, value) => {
    setWhatIfOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleResetOverrides = useCallback(() => setWhatIfOverrides({}), []);

  const whatIfActive = Object.keys(whatIfOverrides).length > 0;

  const handleEditAssumptions = useCallback(() => {
    setWizardIsNew(false);
    if (currentScenario?.wizardMode === 'basic') {
      setView('wizard-basic');
      return;
    }
    const keys = Object.keys(whatIfOverrides);
    const step = (keys.length === 1 && keys[0] === 'lifeExpectancy') ? 0 : 6;
    setWizardStep(step);
    setView('wizard');
  }, [whatIfOverrides, currentScenario]);

  const handleSaveInsight = useCallback((type, text, hash) => {
    const generatedAt = new Date().toISOString();
    const newInsight = { text, hash, generatedAt };
    setScenarios((prev) => prev.map((s) =>
      s.id === currentScenarioId
        ? { ...s, aiInsights: { ...s.aiInsights, [type]: newInsight } }
        : s,
    ));
    // Save immediately (bypass the 1s debounce) so insights survive tab close or a fast refresh.
    // The debounced auto-save in useCloudSync still fires as a retry on top of this.
    if (authUser && currentScenario?.id === currentScenarioId) {
      const updated = { ...currentScenario, aiInsights: { ...currentScenario.aiInsights, [type]: newInsight } };
      saveScenario(authUser.id, updated).catch(() => {});
    }
  }, [currentScenarioId, authUser, currentScenario]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [autoAiPending, setAutoAiPending] = useState(() => !!localStorage.getItem('rp-auto-ai-pending'));
  const [showBetaWelcome, setShowBetaWelcome] = useState(false);
  const [betaPromo, setBetaPromo] = useState(null);
  const GATED_TABS = new Set(['compare', 'estate', 'deep-dive']);

  useEffect(() => {
    supabase
      .from('admin_config')
      .select('config_key, config_value')
      .like('config_key', 'beta_promotion_%')
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map(r => [r.config_key, r.config_value]));
        const cutoff = map.beta_promotion_cutoff;
        const days = parseInt(map.beta_promotion_days, 10);
        if (cutoff && cutoff !== 'null' && new Date(cutoff + 'T23:59:59') >= new Date() && days > 0) {
          setBetaPromo({ cutoff, days });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'cancelled') {
      history.replaceState(null, '', window.location.pathname);
      // ANON_SESSION_KEY may cause view initializer to land on wizard even for
      // authenticated users; anyone reaching Stripe checkout should go to dashboard.
      setView(v => v === 'wizard' ? 'dashboard' : v);
    } else if (params.get('checkout') === 'success') {
      GA.subscriptionStart();
      setCheckoutSuccess(true);
      setCheckoutPending(true);
      history.replaceState(null, '', window.location.pathname);
      setTimeout(() => setCheckoutSuccess(false), 5000);
      // Poll every 2s until isPaid or 60s cap
      const startTime = Date.now();
      const interval = setInterval(() => {
        refreshSubscription();
        if (Date.now() - startTime >= 60000) {
          clearInterval(interval);
          setCheckoutPending(false);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (view !== 'dashboard' || !isOverride) return;
    const key = `rp-beta-welcome-${authUser?.id ?? 'anon'}`;
    if (localStorage.getItem(key)) return;
    setShowBetaWelcome(true);
  }, [view, isOverride, authUser?.id]);

  // When subscription unlocks after checkout, auto-generate all AI insights
  useEffect(() => {
    if (!isPaid || !checkoutPending) return;
    setCheckoutPending(false);

    const scenario = scenarios.find(s => s.id === currentScenarioId) || scenarios[0];
    if (!scenario) return;

    const proj = projectScenario(scenario);

    const jobs = [
      { type: 'dashboard', data: buildDashboardAiData(scenario, proj) },
      { type: 'debt', data: buildDebtAiData(scenario, proj) },
      { type: 'estate', data: buildEstateAiData(scenario, proj) },
    ];

    if (scenarios.length >= 2) {
      const compareData = buildCompareAiData(scenarios);
      if (compareData) jobs.push({ type: 'compare', data: compareData });
    }

    // Set loading markers so AiInsight shows shimmer immediately
    const scenarioId = scenario.id;
    const loadingMarkers = {};
    jobs.forEach(({ type }) => { loadingMarkers[type] = { _loading: true }; });
    setScenarios(prev => prev.map(s =>
      s.id === scenarioId
        ? { ...s, aiInsights: { ...s.aiInsights, ...loadingMarkers } }
        : s,
    ));

    jobs.forEach(({ type, data }) => {
      const hash = computeHash(data);
      getAiRecommendation(type, data, true)
        .then(text => handleSaveInsight(type, text, hash))
        .catch(() => {
          // Clear loading marker on failure
          setScenarios(prev => prev.map(s =>
            s.id === scenarioId && s.aiInsights?.[type]?._loading
              ? { ...s, aiInsights: { ...s.aiInsights, [type]: null } }
              : s,
          ));
        });
    });
  }, [isPaid, checkoutPending]); // eslint-disable-line react-hooks/exhaustive-deps

  // After new wizard completion, auto-generate AI insights for paid users (beta/stripe)
  useEffect(() => {
    if (!isPaid || !autoAiPending) return;
    setAutoAiPending(false);
    localStorage.removeItem('rp-auto-ai-pending');

    const scenario = scenarios.find(s => s.id === currentScenarioId) || scenarios[0];
    if (!scenario) return;
    const proj = projectScenario(scenario);

    const jobs = [
      { type: 'dashboard', data: buildDashboardAiData(scenario, proj) },
      { type: 'debt',      data: buildDebtAiData(scenario, proj) },
      { type: 'estate',    data: buildEstateAiData(scenario, proj) },
    ];
    if (scenarios.length >= 2) {
      const cd = buildCompareAiData(scenarios);
      if (cd) jobs.push({ type: 'compare', data: cd });
    }

    const scenarioId = scenario.id;
    const markers = {};
    jobs.forEach(({ type }) => { markers[type] = { _loading: true }; });
    setScenarios(prev => prev.map(s =>
      s.id === scenarioId ? { ...s, aiInsights: { ...s.aiInsights, ...markers } } : s
    ));
    jobs.forEach(({ type, data }) => {
      const hash = computeHash(data);
      getAiRecommendation(type, data, true)
        .then(text => handleSaveInsight(type, text, hash))
        .catch(() => {
          setScenarios(prev => prev.map(s =>
            s.id === scenarioId && s.aiInsights?.[type]?._loading
              ? { ...s, aiInsights: { ...s.aiInsights, [type]: null } }
              : s
          ));
        });
    });
  }, [isPaid, autoAiPending]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabClick = useCallback((tabKey) => {
    if (!isPaid && GATED_TABS.has(tabKey)) {
      setUpgradeModalOpen(true);
      return;
    }
    window.scrollTo(0, 0);
    setView(tabKey);
  }, [isPaid]); // eslint-disable-line react-hooks/exhaustive-deps
  const menuRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  // Track header height for sticky sub-navs (Deep Dive phase timeline)
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  });

  const menuAction = (fn) => () => { setMenuOpen(false); fn(); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {checkoutSuccess && (
        <div className="bg-green-600 text-white text-center py-2 text-sm font-medium">
          Welcome to RetirePlanner Pro! Your access is now active.
        </div>
      )}
      {checkoutPending && createPortal(
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <svg className="animate-spin h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-lg font-semibold text-gray-800">Activating your Pro access…</p>
          <p className="text-sm text-gray-500">This usually takes a few seconds.</p>
        </div>,
        document.body
      )}
      {isPastDue && (
        <div className="bg-red-600 text-white text-center py-2 text-sm">
          Your payment failed.{' '}
          <button
            type="button"
            onClick={async () => {
              try { await openBillingPortal(); }
              catch { alert('Could not open billing portal. Please try again.'); }
            }}
            className="underline font-semibold hover:text-red-100 transition-colors"
          >
            Update your card
          </button>{' '}
          to keep access.
        </div>
      )}
      {view !== 'wizard' && view !== 'wizard-basic' && view !== 'landing' && view !== 'admin'
        && view !== 'returning-home' && view !== 'scenario-picker' && (
      <header ref={headerRef} className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div ref={menuRef} className="px-4 sm:px-6 lg:px-10 py-2">

          {/* Desktop (md+): single row — logo | inline tabs | actions */}
          <div className="hidden md:flex items-center gap-3">
            <h1 className="text-base font-bold text-sunset-600 tracking-tight shrink-0">
              RetirePlanner.ca
            </h1>

            {/* Inline tabs */}
            <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-hide">
              {NAV_TABS.map((tab) => (
                <button key={tab.key} type="button" onClick={() => handleTabClick(tab.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    tab.special
                      ? (view === tab.key ? 'bg-purple-50 text-purple-700' : 'text-purple-400 hover:text-purple-600 hover:bg-purple-50')
                      : (view === tab.key ? 'bg-sunset-50 text-sunset-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
                  }`}>
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {authUser && scenarios.length > 0 && (
                <div className="flex items-center gap-2 max-w-[180px]">
                  <select value={currentScenarioId || ''} onChange={(e) => handleSwitchScenario(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1
                               focus:outline-none focus:ring-2 focus:ring-sunset-400 w-full min-w-0">
                    {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {saveStatus === 'saving' && <span className="text-xs text-gray-400 shrink-0">Saving...</span>}
                  {saveStatus === 'saved' && <span className="text-xs text-green-600 shrink-0">Saved</span>}
                  {saveStatus === 'error' && <span className="text-xs text-red-500 shrink-0">Save failed</span>}
                </div>
              )}
              {(authUser || view !== 'dashboard') && (
              <div className="relative">
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
                        <button onClick={menuAction(() => { setWizardStep(0); setWizardIsNew(false); setView('wizard'); })} className="menu-item">Edit Plan</button>
                        <GatedButton featureName="Multiple Plans" onClick={menuAction(handleStartNew)} className="menu-item w-full text-left">New Plan</GatedButton>
                        <button onClick={menuAction(() => handleRenameScenario())} className="menu-item">Rename Plan</button>
                        <GatedButton featureName="Multiple Plans" onClick={menuAction(handleDuplicateScenario)} className="menu-item w-full text-left">Duplicate Plan</GatedButton>
                        {currentScenario && (
                          <GatedButton featureName="PDF Export" bypass={adminBypass}
                            onClick={menuAction(() => { GA.exportPdf(); openPrintReport(effectiveScenario, projectionData, currentScenario.name); })}
                            className="menu-item w-full text-left">PDF Report</GatedButton>
                        )}
                        {currentScenario && (
                          <GatedButton featureName="Excel Report" bypass={adminBypass}
                            onClick={menuAction(() => { GA.exportExcel(); downloadExcelAudit(effectiveScenario, projectionData, optimizationResult); })}
                            className="menu-item w-full text-left">📊 Excel Report</GatedButton>
                        )}
                        {isAdmin && currentScenario && (
                          <button onClick={menuAction(() => downloadAudit(effectiveScenario, projectionData, optimizationResult))}
                            className="menu-item">Calculation Audit</button>
                        )}
                        <button onClick={menuAction(handleExport)} className="menu-item">Export</button>
                        <GatedButton featureName="Multiple Plans" onClick={menuAction(() => importInputRef.current?.click())} className="menu-item w-full text-left">Import</GatedButton>
                        <div className="border-t border-gray-100 my-1.5 mx-3" />
                      </>
                    )}
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
              )}
              <input ref={importInputRef} type="file" accept=".json,application/json"
                onChange={handleImport} className="hidden" aria-label="Import scenario file" />
              {isAdmin && (
                <button type="button" onClick={() => setSimulateFreeUser(v => !v)}
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    simulateFreeUser ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
                  }`}>
                  {simulateFreeUser ? 'Free Preview' : 'Pro View'}
                </button>
              )}
              <EnvironmentBadge />
              <SubscriptionBadge />
              {(authUser || view !== 'dashboard') && (
                <AccountMenu onAdmin={isAdmin ? () => setView('admin') : null} open={signInOpen} onOpenChange={setSignInOpen} />
              )}
            </div>
          </div>

          {/* Mobile: row 1 — hamburger + logo + actions */}
          <div className="flex md:hidden items-center justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Open navigation menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-base font-bold text-sunset-600 tracking-tight">
                RetirePlanner.ca
              </h1>
            </div>
            <div className="flex items-center gap-1">
              {(authUser || view !== 'dashboard') && (
              <div className="relative">
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
                        <button onClick={menuAction(() => { setWizardStep(0); setWizardIsNew(false); setView('wizard'); })} className="menu-item">Edit Plan</button>
                        <GatedButton featureName="Multiple Plans" onClick={menuAction(handleStartNew)} className="menu-item w-full text-left">New Plan</GatedButton>
                        <button onClick={menuAction(() => handleRenameScenario())} className="menu-item">Rename Plan</button>
                        <GatedButton featureName="Multiple Plans" onClick={menuAction(handleDuplicateScenario)} className="menu-item w-full text-left">Duplicate Plan</GatedButton>
                        {currentScenario && (
                          <GatedButton featureName="PDF Export" bypass={adminBypass}
                            onClick={menuAction(() => { GA.exportPdf(); openPrintReport(effectiveScenario, projectionData, currentScenario.name); })}
                            className="menu-item w-full text-left">PDF Report</GatedButton>
                        )}
                        {currentScenario && (
                          <GatedButton featureName="Excel Report" bypass={adminBypass}
                            onClick={menuAction(() => { GA.exportExcel(); downloadExcelAudit(effectiveScenario, projectionData, optimizationResult); })}
                            className="menu-item w-full text-left">📊 Excel Report</GatedButton>
                        )}
                        {isAdmin && currentScenario && (
                          <button onClick={menuAction(() => downloadAudit(effectiveScenario, projectionData, optimizationResult))}
                            className="menu-item">Calculation Audit</button>
                        )}
                        <button onClick={menuAction(handleExport)} className="menu-item">Export</button>
                        <GatedButton featureName="Multiple Plans" onClick={menuAction(() => importInputRef.current?.click())} className="menu-item w-full text-left">Import</GatedButton>
                        <div className="border-t border-gray-100 my-1.5 mx-3" />
                      </>
                    )}
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
              )}
              <input ref={importInputRef} type="file" accept=".json,application/json"
                onChange={handleImport} className="hidden" aria-label="Import scenario file" />
              <SubscriptionBadge />
              {(authUser || view !== 'dashboard') && (
                <AccountMenu onAdmin={isAdmin ? () => setView('admin') : null} open={signInOpen} onOpenChange={setSignInOpen} />
              )}
            </div>
          </div>

          {/* Mobile: row 2 — scenario picker (if signed in) */}
          {authUser && scenarios.length > 0 && (
            <div className="md:hidden mt-1.5 flex items-center gap-2">
              <select value={currentScenarioId || ''} onChange={(e) => handleSwitchScenario(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-sunset-400 flex-1">
                {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {saveStatus === 'saving' && <span className="text-xs text-gray-400 shrink-0">Saving...</span>}
              {saveStatus === 'saved' && <span className="text-xs text-green-600 shrink-0">Saved</span>}
              {saveStatus === 'error' && <span className="text-xs text-red-500 shrink-0">Save failed</span>}
            </div>
          )}
        </div>{/* end header inner */}

        {/* Mobile only: slide-out navigation menu */}
        <MobileMenu
          tabs={NAV_TABS}
          view={view}
          onTabClick={handleTabClick}
          gatedTabs={GATED_TABS}
          isPaid={isPaid}
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Anon sign-in bar — slim strip, only on dashboard, disappears on auth */}
        {!authUser && view === 'dashboard' && (
          <AnonDashboardBanner betaPromo={betaPromo} headerBar />
        )}
      </header>
      )}

      <main className="flex-1">
        {authLoading && view !== 'landing' ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-gray-500">Loading your plans…</p>
          </div>
        ) : (
        <>
        {showModePicker && (
          <ModePicker
            onSelectBasic={() => handleModeSelect('basic')}
            onSelectFull={() => handleModeSelect('full')}
          />
        )}
        {showBetaWelcome && view === 'dashboard' && (
          <BetaWelcomeBanner
            overrideDaysRemaining={overrideDaysRemaining}
            onDismiss={() => {
              localStorage.setItem(`rp-beta-welcome-${authUser?.id ?? 'anon'}`, '1');
              setShowBetaWelcome(false);
            }}
          />
        )}
        <div className="view-enter" key={view}>
          {view === 'landing' && (
            authUser || authLoading
              ? <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                  <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <p className="text-sm text-gray-500">Loading your plans…</p>
                </div>
              : <LandingPage onTryAnonymous={() => {
                  sessionStorage.setItem(ANON_SESSION_KEY, '1');
                  localStorage.setItem(ANON_STORAGE_KEY, '1');
                  const newScenario = createDefaultScenario('My Plan');
                  setScenarios([newScenario]);
                  setCurrentScenarioId(newScenario.id);
                  setWizardIsNew(true);
                  if (!sessionStorage.getItem(MODE_SEEN_KEY)) {
                    setShowModePicker(true);
                  } else {
                    setView('wizard');
                  }
                }} />
          )}
          {view === 'wizard' && currentScenario && (
            <WizardShell scenario={currentScenario} onChange={handleScenarioChange}
              onComplete={handleWizardComplete} currentStep={wizardStep} onStepChange={setWizardStep}
              isNewScenario={wizardIsNew} onExit={handleWizardExit} />
          )}
          {view === 'wizard-basic' && currentScenario && (
            <BasicWizardView
              scenario={currentScenario}
              onChange={handleScenarioChange}
              onComplete={handleBasicComplete}
              onExit={handleWizardExit}
            />
          )}
          {view === 'readiness-rank' && currentScenario && (
            <ReadinessView
              scenario={currentScenario}
              onContinue={() => {
                window.scrollTo({ top: 0, behavior: 'instant' });
                setWhatIfExpanded(false);
                setView('dashboard');
              }}
            />
          )}
          {view === 'dashboard' && currentScenario && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4 pb-20 md:pb-4">
              <WhatIfPanel scenario={currentScenario} overrides={whatIfOverrides}
                onOverrideChange={handleOverrideChange} onReset={handleResetOverrides}
                onEditAssumptions={handleEditAssumptions}
                expanded={whatIfExpanded} onToggle={() => {
                  setWhatIfExpanded(v => {
                    const next = !v;
                    if (authUser) localStorage.setItem(`whatif-expanded:${authUser.id}`, String(next));
                    return next;
                  });
                }} />
              <Dashboard scenario={effectiveScenario} projectionData={projectionData}
                onScenarioChange={handleScenarioChange} isPaid={isPaid}
                aiInsights={effectiveScenario.aiInsights} onSaveInsight={handleSaveInsight}
                whatIfActive={whatIfActive} onEditAssumptions={handleEditAssumptions}
                isBasicMode={currentScenario?.wizardMode === 'basic'}
                onImproveAccuracy={() => { setWizardStep(0); setView('wizard'); }} />
            </div>
          )}
          {view === 'debt' && currentScenario && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              <DebtView scenario={currentScenario} projectionData={projectionData} onNavigate={(v) => setView(v)}
                aiInsights={currentScenario.aiInsights} onSaveInsight={handleSaveInsight} />
            </div>
          )}
          {view === 'compare' && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              {isPaid
                ? <CompareView scenarios={scenarios} onNavigate={(v) => setView(v)}
                    aiInsights={currentScenario?.aiInsights} onSaveInsight={handleSaveInsight} />
                : <UpgradePrompt variant="full" featureName="Compare" feature="compare" />
              }
            </div>
          )}
          {view === 'estate' && currentScenario && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              {isPaid
                ? <EstateView scenario={currentScenario} projectionData={projectionData}
                    onNavigate={(v) => setView(v)}
                    lifeExpectancyOverride={whatIfOverrides.lifeExpectancy}
                    onLifeExpectancyChange={(v) => handleOverrideChange('lifeExpectancy', v)}
                    onScenarioChange={handleScenarioChange}
                    aiInsights={currentScenario.aiInsights} onSaveInsight={handleSaveInsight} />
                : <UpgradePrompt variant="full" featureName="Estate Planning" feature="estate" />
              }
            </div>
          )}
          {view === 'recommendations' && currentScenario && (
            <div className="px-4 sm:px-6 lg:px-10 py-4 space-y-4">
              <RecommendationsTab
                result={optimizationResult}
                isPaid={isPaid}
                onScenarioChange={handleScenarioChange}
                onUpgrade={() => setUpgradeModalOpen(true)}
                onViewDashboard={() => setView('dashboard')}
                scenario={currentScenario}
                aiInsights={currentScenario?.aiInsights}
                onSaveInsight={handleSaveInsight}
              />
            </div>
          )}
          {view === 'deep-dive' && currentScenario && (
            <div className="flex-1">
              {isPaid || adminBypass
                ? <VisualAudit scenario={effectiveScenario} projectionData={projectionData} optimizationResult={optimizationResult} />
                : <div className="px-4 sm:px-6 lg:px-10 py-4"><UpgradePrompt variant="full" featureName="Deep Dive" feature="deepDive" /></div>
              }
            </div>
          )}
          {view === 'returning-home' && authUser && (
            <ReturningHomeView
              userName={authUser.user_metadata?.full_name || authUser.email}
              onViewResults={handleChoiceViewResults}
              onEditPlan={handleChoiceEditPlan}
              onCreateNew={handleChoiceCreateNew}
              onAdmin={isAdmin ? () => setView('admin') : null}
            />
          )}
          {view === 'scenario-picker' && (
            <ScenarioPickerView
              scenarios={scenarios}
              action={pickerAction}
              activeScenarioId={currentScenarioId}
              onSelect={handlePickerSelect}
              onCreateNew={handleStartNew}
              onBack={() => setView('returning-home')}
            />
          )}
          {view === 'my-plans' && (
            <MyPlansView
              scenarios={scenarios}
              onSelect={(id) => { setCurrentScenarioId(id); setWhatIfOverrides({}); setView('dashboard'); }}
              onStartNew={handleStartNew}
            />
          )}
          {view === 'admin' && isAdmin && <AdminView onClose={() => setView('dashboard')} />}
        </div>
        </>
        )}
      </main>

      {upgradeModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setUpgradeModalOpen(false); }}
        >
          <div className="relative mx-4">
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(false)}
              className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600 text-xl leading-none"
              aria-label="Close"
            >
              &times;
            </button>
            <UpgradePrompt variant="full" modal />
          </div>
        </div>,
        document.body
      )}

      {view !== 'landing' && <footer className="py-3 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-y-0 sm:gap-x-1 text-xs text-gray-400">
          <span className="text-sunset-600 font-semibold min-h-[36px] sm:min-h-0 flex items-center">RetirePlanner.ca</span>
          <span className="hidden sm:inline">&middot; Not financial advice &middot;</span>
          <span className="sm:hidden text-gray-300 text-[10px]">Not financial advice</span>
          <a href="/privacy" className="min-h-[44px] sm:min-h-0 flex items-center hover:underline">Privacy</a>
          <span className="hidden sm:inline">&middot;</span>
          <a href="/terms" className="min-h-[44px] sm:min-h-0 flex items-center hover:underline">Terms</a>
          <span className="hidden sm:inline">&middot;</span>
          <button
            type="button"
            onClick={() => setContactOpen(true)}
            className="min-h-[44px] sm:min-h-0 flex items-center hover:underline"
          >
            Contact
          </button>
        </div>
      </footer>}

      {contactOpen && (
        <ContactModal
          userEmail={authUser?.email ?? ''}
          onClose={() => setContactOpen(false)}
        />
      )}

    </div>
  );
}
