import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui';
import { LegalLinks } from '../PolicyPage';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user);
      navigate(data.user.role === 'PRINCIPAL'
        ? '/principal/dashboard'
        : data.user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-border">
        <div className="flex flex-col items-center">
          <Link to="/" aria-label="EduTrack home" className="rounded-lg focus:outline-none focus:ring-2 focus:ring-brand">
            <BookOpen className="w-12 h-12 text-brand" />
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900">Sign in to your account</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email address</label>
              <input
                type="email"
                required
                className="mt-1 block w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                className="mt-1 block w-full border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" loading={loading}>Sign In</Button>
          <div className="text-sm text-center">
            <Link to="/register" className="font-medium text-brand hover:text-brand-dark">
              Don't have an account? Register
            </Link>
          </div>
          <LegalLinks className="justify-center" />
        </form>
      </div>
    </div>
  );
};
