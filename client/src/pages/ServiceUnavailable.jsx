import React from 'react';
import { Link } from 'react-router-dom';
import { Home, RefreshCw, WifiOff } from 'lucide-react';

export const ServiceUnavailable = ({ offline = false, recovered = false, onRetry, onHome }) => (
  <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-10">
    <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/60 sm:p-10">
      <div className="relative mx-auto mb-6 flex h-36 w-44 items-center justify-center" aria-hidden="true">
        <svg viewBox="0 0 176 132" className="absolute inset-0 h-full w-full" fill="none">
          <path d="M47 95h78a24 24 0 0 0 2-48 40 40 0 0 0-76-4 27 27 0 0 0-4 52Z" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="3"/>
          <path d="m66 71 12 12m0-12L66 83m34-12 12 12m0-12-12 12" stroke="#6366F1" strokeLinecap="round" strokeWidth="4"/>
          <circle cx="43" cy="34" r="5" fill="#A5B4FC"/><circle cx="139" cy="25" r="4" fill="#C4B5FD"/>
          <path d="M88 4v10m-47 9-7-7m101 4 7-7" stroke="#A5B4FC" strokeLinecap="round" strokeWidth="3"/>
        </svg>
        <span className="relative mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg">
          <WifiOff className="h-6 w-6" />
        </span>
      </div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">EduTrack connection</p>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{recovered ? 'Connection restored' : offline ? 'You’re offline' : 'We hit a connection problem'}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
        {recovered
          ? 'Your device is back online. Try again to reload EduTrack.'
          : offline
            ? 'Your device is not connected to the internet. Check your connection, then try again.'
            : 'EduTrack could not reach the service or encountered a server problem. Your work may not have been saved. Check your connection and try again.'}
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {onRetry ? (
          <button type="button" onClick={onRetry} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        ) : (
          <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        )}
        {onHome ? (
          <button type="button" onClick={onHome} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Home className="h-4 w-4" /> Go to home
          </button>
        ) : (
          <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Home className="h-4 w-4" /> Go to home
          </Link>
        )}
      </div>
      <p className="mt-6 text-xs text-slate-400">We won’t retry automatically. You can try again when you’re ready.</p>
    </section>
  </main>
);
