import React, { useEffect } from 'react';
import Button from '../../components/Button';
import { STEP_LABELS, WIZARD_STEPS } from '../../constants/defaults';
import { trackEvent } from '../../utils/analytics';
import PersonalInfoStep from './PersonalInfoStep';
import GovBenefitsStep from './GovBenefitsStep';
import PensionsStep from './PensionsStep';
import SavingsStep from './SavingsStep';
import OtherAssetsStep from './OtherAssetsStep';
import LiabilitiesStep from './LiabilitiesStep';
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
}) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS - 1;
  const StepComponent = STEP_COMPONENTS[currentStep];

  // Persist step to localStorage so the user resumes where they left off
  useEffect(() => {
    localStorage.setItem(WIZARD_CHECKPOINT_KEY, String(currentStep));
  }, [currentStep]);

  const handleBack = () => {
    if (!isFirstStep) onStepChange(currentStep - 1);
  };

  const handleNext = () => {
    if (isLastStep) {
      localStorage.removeItem(WIZARD_CHECKPOINT_KEY);
      trackEvent('wizard_completed');
      onComplete();
    } else {
      trackEvent('wizard_step_completed', { step: currentStep + 1 });
      onStepChange(currentStep + 1);
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

        {/* View Results button */}
        <div className="px-3 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onComplete}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sunset-500 hover:bg-sunset-600
                       text-white text-sm font-semibold rounded-lg transition-colors duration-150 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Results
          </button>
        </div>
      </aside>

      {/* Mobile header — small screens only */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-800 truncate">{scenario.name || 'New Plan'}</span>
            <span className="text-xs text-gray-400">{currentStep + 1} / {WIZARD_STEPS}</span>
          </div>
          <div className="flex gap-1">
            {STEP_LABELS.map((label, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onStepChange(index)}
                className={`flex-1 h-1.5 rounded-full transition-colors duration-200 cursor-pointer
                  ${index < currentStep ? 'bg-sunset-500 hover:bg-sunset-600'
                    : index === currentStep ? 'bg-sunset-400'
                    : 'bg-gray-200 hover:bg-gray-300'}`}
                title={label}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-sunset-600 mt-1.5">{STEP_LABELS[currentStep]}</p>
        </div>
      </div>

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="flex-1 min-w-0 lg:ml-56">
        {/* Spacer for mobile fixed header */}
        <div className="h-20 lg:hidden" />

        {/* Step content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 view-enter" key={currentStep}>
          <StepComponent
            scenario={scenario}
            onChange={onChange}
          />
        </div>

        {/* Navigation buttons */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-4">
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={isFirstStep}
            >
              Back
            </Button>

            <span className="text-sm text-gray-400 hidden lg:inline">
              {currentStep + 1} / {WIZARD_STEPS}
            </span>

            <Button variant="primary" onClick={handleNext}>
              {isLastStep ? 'View Dashboard' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
