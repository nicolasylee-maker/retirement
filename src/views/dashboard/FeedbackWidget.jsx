import React, { useState, useEffect } from 'react';

export default function FeedbackWidget() {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'yes-thanks' | 'no-form' | 'final'
  const [body, setBody] = useState('');

  useEffect(() => {
    if (phase !== 'yes-thanks') return;
    const timer = setTimeout(() => setPhase('final'), 3000);
    return () => clearTimeout(timer);
  }, [phase]);

  function handleSend() {
    const url = `mailto:hello@retireplanner.ca?subject=${encodeURIComponent('Dashboard Feedback')}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    setPhase('final');
  }

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
      {phase === 'idle' && (
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">Is this tool helpful for your retirement planning?</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setPhase('yes-thanks')}
              className="px-4 py-1.5 text-sm rounded-lg border border-green-400 text-green-700
                         hover:bg-green-50 transition-colors"
            >
              Yes, very helpful
            </button>
            <button
              type="button"
              onClick={() => setPhase('no-form')}
              className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-500
                         hover:bg-gray-100 transition-colors"
            >
              Something&apos;s not right
            </button>
          </div>
        </div>
      )}

      {phase === 'yes-thanks' && (
        <p className="text-sm text-gray-500 text-center">
          Thanks! If you&apos;d like to share what you found most useful, email us at{' '}
          <a href="mailto:hello@retireplanner.ca" className="text-blue-600 hover:underline">
            hello@retireplanner.ca
          </a>
        </p>
      )}

      {phase === 'no-form' && (
        <div>
          <textarea
            rows={3}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="What was confusing or incorrect?"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-2
                       focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none bg-white"
          />
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600
                       hover:bg-gray-100 transition-colors"
          >
            Send Feedback
          </button>
        </div>
      )}

      {phase === 'final' && (
        <p className="text-sm text-gray-500 text-center">Thanks for your feedback</p>
      )}
    </div>
  );
}
