import React, { useRef, useState } from 'react';
import Card from '../components/Card';

export default function NewPersonScreen({ onStartNew, onLoadFile, onCancel }) {
  const [name, setName] = useState('');
  const fileInputRef = useRef(null);

  const handleStartFresh = () => {
    if (!name.trim()) return;
    onStartNew(name.trim());
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        onLoadFile(data);
      } catch {
        alert('Invalid file. Please select a valid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Add a Person</h1>
          <p className="text-sm text-gray-500 mt-1">Start a new plan or import an existing one</p>
        </div>

        {/* Name input */}
        <div className="mb-6">
          <label htmlFor="new-person-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="new-person-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartFresh()}
            placeholder="e.g. Jane"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Action cards */}
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <Card
            className={`flex flex-col items-center text-center transition-opacity ${!name.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={name.trim() ? handleStartFresh : undefined}
          >
            <div className="w-14 h-14 rounded-full bg-sunset-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-sunset-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Start Fresh</h2>
            <p className="text-sm text-gray-500">
              Create a new retirement plan from scratch using the name above
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
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Load from File</h2>
            <p className="text-sm text-gray-500">
              Import a previously saved JSON file (name field is ignored)
            </p>
          </Card>
        </div>

        {/* Cancel */}
        <div className="text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Load person file"
      />
    </div>
  );
}
