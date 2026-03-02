// DEPRECATED: This component is no longer imported by App.jsx as of the
// app-state-refactor. It will be replaced by the onboarding-ux spec in a
// separate branch. Do not delete this file until that spec is implemented.
import React, { useRef } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import SunsetIllustration from '../components/SunsetIllustration';

export default function WelcomeScreen({ onStartNew, onLoadScenario }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        onLoadScenario(data);
      } catch {
        alert('Invalid scenario file. Please select a valid JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero section */}
      <div className="gradient-sunset text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <SunsetIllustration />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
            Ontario Retirement Planner
          </h1>
          <p className="text-xl text-white/90 font-medium">
            Plan your future with confidence
          </p>
        </div>
      </div>

      {/* Action cards */}
      <div className="flex-1 flex items-start justify-center px-4 -mt-8">
        <div className="max-w-2xl w-full grid sm:grid-cols-2 gap-6">
          <Card className="flex flex-col items-center text-center" onClick={onStartNew}>
            <div className="w-14 h-14 rounded-full bg-sunset-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-sunset-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Start New Plan</h2>
            <p className="text-sm text-gray-500">
              Create a personalized retirement plan from scratch
            </p>
          </Card>

          <Card
            className="flex flex-col items-center text-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Load Saved Plan</h2>
            <p className="text-sm text-gray-500">
              Import a previously saved scenario from a JSON file
            </p>
          </Card>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Load scenario file"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center">
        <p className="text-xs text-gray-400">
          Built for Ontarians. Not financial advice.
        </p>
      </div>
    </div>
  );
}
