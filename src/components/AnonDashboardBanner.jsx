import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function formatCutoff(dateStr) {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-CA', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function AnonDashboardBanner({ betaPromo }) {
  const { signInWithGoogle, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleMagicLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError('');
    try {
      await signInWithMagicLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send link. Try again.');
    } finally {
      setSending(false);
    }
  }

  const headline = betaPromo
    ? `Sign in before ${formatCutoff(betaPromo.cutoff)} — get ${betaPromo.days} days free`
    : 'Sign in to unlock AI Insights, Compare, Estate & more';

  return (
    <div className="mx-4 sm:mx-6 lg:mx-10 mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* Headline */}
      <p className="text-sm font-semibold text-indigo-900 shrink-0 mr-1">{headline}</p>

      {/* Google button */}
      <button
        type="button"
        onClick={() => signInWithGoogle()}
        className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <GoogleIcon />
        Sign in with Google
      </button>

      <span className="text-xs text-indigo-400 font-medium shrink-0">or</span>

      {/* Magic link */}
      {sent ? (
        <p className="text-sm font-medium text-green-700">
          Check your inbox — link sent to {email}
        </p>
      ) : (
        <form onSubmit={handleMagicLink} className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-48 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={sending}
            className="shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-1.5 transition-colors"
          >
            {sending ? 'Sending…' : 'Send link'}
          </button>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </form>
      )}
    </div>
  );
}
