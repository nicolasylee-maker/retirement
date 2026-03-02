import { useState } from 'react'

const ENV_CONFIG = {
  local:  { label: 'LOCAL', bg: 'bg-red-600',    text: 'text-white', note: 'Local Supabase (laptop)' },
  dev:    { label: 'DEV',   bg: 'bg-orange-500',  text: 'text-white', note: 'Cloud dev project (no real users)' },
  prod:   { label: 'PROD',  bg: 'bg-green-600',   text: 'text-white', note: 'Production — real users' },
}

export function EnvironmentBadge() {
  const [open, setOpen] = useState(false)
  const env = import.meta.env.VITE_ENV
  const config = ENV_CONFIG[env]

  // Only show badge in non-production environments, or when explicitly set
  if (!config || (env === 'prod' && import.meta.env.PROD)) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${config.bg} ${config.text} text-xs font-bold px-2 py-0.5 rounded cursor-pointer`}
      >
        {config.label}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className={`${config.bg} ${config.text} text-sm font-bold px-3 py-1 rounded inline-block mb-3`}>
              {config.label}
            </div>
            <p className="text-gray-700 text-sm mb-2">{config.note}</p>
            <p className="text-gray-500 text-xs font-mono break-all mb-4">
              {import.meta.env.VITE_SUPABASE_URL || '(no VITE_SUPABASE_URL set)'}
            </p>
            {env !== 'prod' && (
              <p className="text-green-700 text-xs">You are safe — no real users can see this.</p>
            )}
            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
