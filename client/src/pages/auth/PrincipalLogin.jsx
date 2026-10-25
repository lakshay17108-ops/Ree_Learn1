import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui';
import { LegalLinks } from '../PolicyPage';

export const PrincipalLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      if (data.user.role !== 'PRINCIPAL') {
        setError('Access denied. This portal is for school authority only.');
        return;
      }
      login(data.token, data.user);
      navigate('/principal/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0f172a]">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-gradient-to-br from-[#0f172a] to-[#1e293b] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-72 h-72 bg-teal-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <Link to="/" aria-label="EduTrack home" className="inline-flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center shadow-xl shadow-teal-900">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white tracking-wide">EduTrack</span>
          </Link>
          <div className="space-y-4 max-w-md">
            <h2 className="text-4xl font-bold text-white leading-snug">School Authority Portal</h2>
            <p className="text-slate-400 text-lg">
              Track classroom progress, manage teacher registrations, monitor every student's learning journey and host meetings — all in one place.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 text-left">
            {[
              { title: 'Teacher Approvals', desc: 'Review & approve teacher registrations instantly' },
              { title: 'Student Tracking', desc: 'Full quiz history & performance per student' },
              { title: 'Classroom Analytics', desc: 'Class averages, subjects, and drill-down reports' },
              { title: 'Meeting Management', desc: 'Host meetings with classes, teachers or individuals' },
            ].map(f => (
              <div key={f.title} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-semibold text-teal-400">{f.title}</p>
                <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#f8fafc]">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <Link to="/" aria-label="EduTrack home" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">EduTrack</span>
          </Link>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
              <span className="text-xs font-semibold uppercase tracking-widest text-teal-700">Principal Portal</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Sign in</h1>
            <p className="text-slate-500 mt-1 text-sm">Enter your school authority credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <span>⚠️</span> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
              ) : 'Sign in to portal'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            This portal is restricted to school principals and higher authorities only.<br />
            <span className="text-slate-500">Students and teachers use the</span>{' '}
            <Link to="/login" className="text-teal-700 font-medium hover:underline">main login page</Link>.
          </p>
          <LegalLinks className="mt-4 justify-center" />
        </div>
      </div>
    </div>
  );
};
