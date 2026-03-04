import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const FUNCTION_URL =
  'https://kovxoeovijedvxmulbke.supabase.co/functions/v1/send-contact';

export default function ContactModal({ userEmail, onClose }) {
  const [email, setEmail] = useState(userEmail);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  async function handleSend() {
    setStatus('sending');
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error('send failed');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-xl"
        >
          &times;
        </button>

        {status === 'sent' ? (
          <div className="py-6 text-center">
            <p className="text-2xl mb-2">✓</p>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Message sent!</h2>
            <p className="text-sm text-gray-500 mb-4">We&apos;ll get back to you soon.</p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Get in touch</h2>
            <p className="text-sm text-gray-500 mb-4">
              Questions, bugs, or suggestions — we&apos;d love to hear from you.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Your email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3
                         focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4
                         focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white"
            />

            {status === 'error' && (
              <p className="text-xs text-red-500 mb-3">
                Something went wrong — please try again or email us directly at hello@retireplanner.ca
              </p>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={!message.trim() || status === 'sending'}
              className="w-full py-2 rounded-lg text-sm font-medium
                         bg-indigo-600 text-white hover:bg-indigo-700
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
