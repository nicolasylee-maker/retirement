import React, { useEffect, useMemo, useState } from 'react';
import Button from '../../components/Button';
import WizardSidePanel from './WizardSidePanel';
import { STEP_LABELS, WIZARD_STEPS } from '../../constants/defaults';
import { trackEvent } from '../../utils/analytics';
import PersonalInfoStep from './PersonalInfoStep';
import GovBenefitsStep from './GovBenefitsStep';
import PensionsStep from './PensionsStep';
import SavingsStep from './SavingsStep';
import OtherAssetsStep from './OtherAssetsStep';
import LiabilitiesStep, { validateLiabilities } from './LiabilitiesStep';
import ExpensesStep from './ExpensesStep';
import WithdrawalStep from './WithdrawalStep';
import EstateStep from './EstateStep';

const WIZARD_CHECKPOINT_KEY = 'rp-wizard-step';

const STEP_COMPONENTS = [
  PersonalInfoStep,
  GovBenefitsStep,
  PensionsStep,
  SavingsStep,
  OtherAssetsStep,
  LiabilitiesStep,
  ExpensesStep,
  WithdrawalStep,
  EstateStep,
];

export default function WizardShell({
  scenario,
  onChange,
  onComplete,
  currentStep,
  onStepChange,
  isNewScenario,
  onExit,
}) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS - 1;
  const StepComponent = STEP_COMPONENTS[currentStep];

  const [dismissedDots, setDismissedDots] = useState(new Set());
  const dismissDot = (id) => setDismissedDots(prev => new Set([...prev, id]));

  const [visitedSteps, setVisitedSteps] = useState(() => {
    if (!isNewScenario || localStorage.getItem(`rp-wiz-${scenario.id}`)) {
      return new Set(Array.from({ length: WIZARD_STEPS }, (_, i) => i));
    }
    return new Set([currentStep]);
  });
  const allStepsVisited = visitedSteps.size >= WIZARD_STEPS;

  const stepErrors = useMemo(() => {
    if (currentStep === 5) return validateLiabilities(scenario);
    return null;
  }, [currentStep, scenario]);
  const hasStepErrors = stepErrors && Object.keys(stepErrors).length > 0;

  // Persist step to localStorage so the user resumes where they left off
  useEffect(() => {
    localStorage.setItem(WIZARD_CHECKPOINT_KEY, String(currentStep));
  }, [currentStep]);

  const handleBack = () => {
    if (isFirstStep) {
      onExit?.();
    } else {
      onStepChange(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      localStorage.removeItem(WIZARD_CHECKPOINT_KEY);
      localStorage.setItem(`rp-wiz-${scenario.id}`, '1');
      trackEvent('scenario_created');
      setVisitedSteps(prev => new Set([...prev, currentStep]));
      onComplete();
    } else {
      const nextStep = currentStep + 1;
      trackEvent('wizard_step_completed', { step: nextStep });
      setVisitedSteps(prev => new Set([...prev, nextStep]));
      onStepChange(nextStep);
    }
  };

  const getStepState = (index) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'future';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left sidebar — desktop only */}
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-200 fixed top-0 left-0 h-screen shrink-0 z-10">
        {/* Plan name */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Plan</label>
          <input
            type="text"
            value={scenario.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            className="mt-0.5 w-full text-sm font-semibold text-gray-800 border-0 border-b border-transparent
                       hover:border-gray-300 focus:border-sunset-400 focus:ring-0
                       bg-transparent px-0 py-0.5 truncate"
            placeholder="Name this plan..."
          />
        </div>

        {/* Step list */}
        <nav className="flex-1 overflow-y-auto py-1">
          {STEP_LABELS.map((label, index) => {
            const state = getStepState(index);
            return (
              <button
                key={index}
                type="button"
                onClick={() => onStepChange(index)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors duration-150 cursor-pointer
                  ${state === 'current'
                    ? 'bg-sunset-50 border-r-2 border-sunset-500'
                    : 'hover:bg-gray-50'
                  }`}
              >
                <span className={`flex items-center justify-center rounded-full font-bold shrink-0
                  ${state === 'current'
                    ? 'w-6 h-6 text-[11px] bg-sunset-500 text-white shadow-sm'
                    : state === 'completed'
                      ? 'w-5 h-5 text-[10px] bg-sunset-500 text-white'
                      : 'w-5 h-5 text-[10px] border-2 border-gray-300 text-gray-500'
                  }`}
                >
                  {state === 'completed' ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className={`text-sm font-medium truncate
                  ${state === 'current'
                    ? 'text-sunset-700'
                    : state === 'completed'
                      ? 'text-gray-700'
                      : 'text-gray-600'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

      </aside>

      {/* Mobile header — small screens only */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-800 truncate">{scenario.name || 'New Plan'}</span>
            <span className="text-xs text-gray-400">{currentStep + 1} / {WIZARD_STEPS}</span>
          </div>
          {/* Tappable progress segments — h-6 hit area, h-1.5 visual bar */}
          <div className="flex gap-1">
            {STEP_LABELS.map((label, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onStepChange(index)}
                className="flex-1 flex items-center justify-center h-6 cursor-pointer"
                title={label}
              >
                <span className={`w-full h-1.5 rounded-full transition-colors duration-200
                  ${index < currentStep ? 'bg-sunset-500'
                    : index === currentStep ? 'bg-sunset-400'
                    : 'bg-gray-200'}`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs font-medium text-sunset-600 mt-1.5">{STEP_LABELS[currentStep]}</p>
        </div>
      </div>

      {/* Main content area — offset by left sidebar and right panel on desktop */}
      <div className="flex-1 min-w-0 lg:ml-56 lg:mr-64">
        {/* Spacer for mobile fixed header */}
        <div className="h-20 lg:hidden" />

        {/* Step content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 view-enter" key={currentStep}>
          <StepComponent
            scenario={scenario}
            onChange={onChange}
            dismissedDots={dismissedDots}
            dismissDot={dismissDot}
          />
        </div>

        {/* Bottom spacer — clears mobile sticky footer */}
        <div className="pb-20 lg:pb-4" />
      </div>

      {/* Right panel — desktop only (lg+); hosts Back/Next + live step summary */}
      <WizardSidePanel
        scenario={scenario}
        currentStep={currentStep}
        isLastStep={isLastStep}
        isFirstStep={isFirstStep}
        onNext={handleNext}
        onBack={handleBack}
        onComplete={onComplete}
        nextDisabled={hasStepErrors}
        viewResultsDisabled={!allStepsVisited}
      />

      {/* Mobile sticky footer — hidden on desktop */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={handleBack}
            className="min-h-[44px] flex-1"
          >
            Back
          </Button>
          <span className="text-xs text-gray-400 shrink-0">
            {currentStep + 1} / {WIZARD_STEPS}
          </span>
          <Button variant="primary" onClick={handleNext} disabled={hasStepErrors} className="min-h-[44px] flex-1">
            {isLastStep ? 'Finish' : 'Next'}
          </Button>
        </div>
        <Button variant="secondary" onClick={onComplete} disabled={!allStepsVisited} className="w-full min-h-[44px] text-sm">
          View Results
        </Button>
      </div>
    </div>
  );
}
