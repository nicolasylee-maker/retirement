import React from 'react';

export default function ProgressBar({ currentStep, totalSteps, labels = [], onStepClick }) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i);

  const getStepState = (index) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'future';
  };

  const handleClick = (index) => {
    if (onStepClick && index < currentStep) {
      onStepClick(index);
    }
  };

  return (
    <div className="w-full">
      {/* Mobile: simple text */}
      <div className="sm:hidden text-center">
        <span className="text-sm font-medium text-gray-600">
          Step {currentStep + 1} of {totalSteps}
        </span>
        {labels[currentStep] && (
          <p className="text-sm font-semibold text-sunset-600 mt-1">
            {labels[currentStep]}
          </p>
        )}
        {/* Mobile progress bar */}
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sunset-500 to-sunset-400 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: circles and lines */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between">
          {steps.map((index) => {
            const state = getStepState(index);
            const isClickable = state === 'completed' && onStepClick;

            return (
              <React.Fragment key={index}>
                {/* Connector line */}
                {index > 0 && (
                  <div className="flex-1 h-0.5 mx-2">
                    <div
                      className={`h-full rounded ${
                        index <= currentStep ? 'bg-sunset-400' : 'bg-gray-200'
                      } transition-colors duration-300`}
                    />
                  </div>
                )}

                {/* Step circle + label */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleClick(index)}
                    disabled={!isClickable}
                    className={`
                      flex items-center justify-center rounded-full font-semibold text-sm
                      transition-all duration-300 focus:outline-none
                      ${state === 'current'
                        ? 'w-10 h-10 bg-sunset-500 text-white shadow-md ring-4 ring-sunset-100'
                        : state === 'completed'
                          ? 'w-8 h-8 bg-sunset-500 text-white'
                          : 'w-8 h-8 border-2 border-gray-300 text-gray-400 bg-white'
                      }
                      ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-sunset-200' : 'cursor-default'}
                    `}
                    aria-label={`Step ${index + 1}${labels[index] ? `: ${labels[index]}` : ''}`}
                  >
                    {state === 'completed' ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </button>

                  {labels[index] && (
                    <span
                      className={`mt-2 text-xs font-medium whitespace-nowrap ${
                        state === 'current'
                          ? 'text-sunset-600'
                          : state === 'completed'
                            ? 'text-gray-600'
                            : 'text-gray-400'
                      }`}
                    >
                      {labels[index]}
                    </span>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
