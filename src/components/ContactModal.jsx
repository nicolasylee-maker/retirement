import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function ContactModal({ userEmail, onClose }) {
  const [email, setEmail] = useState(userEmail);
  const [message, setMessage] = useState('');

  function handleSend() {
    const subject = encodeURIComponent('RetirePlanner.ca — Contact');
    const body = encodeURIComponent(
      email ? `From: ${email}\n\n${message}` : message
    );
    window.location.href = `mailto:help@retireplanner.ca?subject=${subject}&body=${body}`;
    onClose();
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

        <button
          type="button"
          onClick={handleSend}
          disabled={!message.trim()}
          className="w-full py-2 rounded-lg text-sm font-medium
                     bg-indigo-600 text-white hover:bg-indigo-700
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Open in email app
        </button>
      </div>
    </div>,
    document.body
  );
}
