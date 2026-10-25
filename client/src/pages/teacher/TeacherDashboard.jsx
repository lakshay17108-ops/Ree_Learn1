import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { AppShell } from '../../components/layout/AppShell';
import { StatCard, Card, Badge, Spinner, EmptyState, Modal, Button, Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui';
import { Users, School, FileText, TrendingUp, Plus, Copy, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [form, setForm] = useState({ name: '', section: '' });
  const [copiedCode, setCopiedCode] = useState(null);
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: async () => (await api.get('/analytics/dashboard/teacher')).data
  });

  const { data: classrooms, isLoading: classesLoading, isError: classesError } = useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => (await api.get('/classrooms')).data
  });

  const createClassMutation = useMutation({
    mutationFn: (data) => api.post('/classrooms', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['classrooms']);
      queryClient.invalidateQueries(['teacher-stats']);
      setShowNewClassModal(false);
      setForm({ name: '', section: '' });
      setSuccessMessage('Classroom created successfully.');
    },
    onError: error => setActionError(error.response?.data?.error || 'Could not create the classroom. Please try again.')
  });

  const copyCode = async (code) => {
    setActionError('');
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setSuccessMessage('Join code copied.');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      setActionError('Could not copy the join code. Please select and copy it manually.');
    }
  };

  if (statsLoading || classesLoading) {
    return <AppShell title="Dashboard"><div className="flex justify-center mt-20"><Spinner /></div></AppShell>;
  }

  return (
    <AppShell title="Teacher Dashboard">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0f172a]">Welcome back, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-slate-500 mt-1 text-sm">Here's an overview of your classes and students.</p>
      </div>
      {(statsError || classesError || actionError) && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError || 'Some dashboard information could not be loaded. Please refresh and try again.'}</p>}
      {successMessage && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{successMessage}</p>}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Classrooms" value={stats?.classroomCount ?? 0} icon={School} />
        <StatCard title="Total Students" value={stats?.studentCount ?? 0} icon={Users} color="bg-emerald-500" />
        <StatCard title="Quizzes Created" value={stats?.quizCount ?? 0} icon={FileText} color="bg-amber-500" />
        <StatCard title="Class Avg Score" value={stats?.avgScore ? `${stats.avgScore.toFixed(1)}%` : '—'} icon={TrendingUp} color="bg-indigo-500" />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setShowNewClassModal(true)}
          className="inline-flex items-center gap-2 bg-[#4338ca] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#3730a3] transition-colors"
        >
          <Plus className="w-4 h-4" /> New Classroom
        </button>
        <button
          onClick={() => navigate('/teacher/quizzes/new')}
          className="inline-flex items-center gap-2 bg-white border border-[#e2e8f0] text-[#0f172a] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#f8fafc] transition-colors"
        >
          <FileText className="w-4 h-4" /> Build Quiz
        </button>
      </div>

      {/* Classrooms grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#0f172a]">Your Classrooms</h2>
          <Link to="/teacher/classrooms" className="text-sm font-medium text-[#4338ca] hover:underline">View All →</Link>
        </div>
        {classrooms?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {classrooms.slice(0, 3).map(c => (
              <div key={c.id} className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-[#0f172a]">{c.name}</h3>
                    <p className="text-sm text-slate-400">Section {c.section}</p>
                  </div>
                  <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <School className="w-5 h-5 text-[#4338ca]" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => copyCode(c.joinCode)}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold text-[#0f172a] transition-colors"
                    title="Copy join code"
                  >
                    {c.joinCode}
                    {copiedCode === c.joinCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                  <Link to={`/teacher/classrooms/${c.id}`} className="text-sm font-medium text-[#4338ca] hover:underline">
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={School} title="No Classrooms Yet" description="Create a classroom to get started." action={
            <button
              onClick={() => setShowNewClassModal(true)}
              className="bg-[#4338ca] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#3730a3]"
            >
              Create Classroom
            </button>
          } />
        )}
      </div>

      {/* New Classroom Modal */}
      <Modal isOpen={showNewClassModal} onClose={() => setShowNewClassModal(false)} title="Create New Classroom">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Class Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Section</label>
            <input
              type="text"
              value={form.section}
              onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowNewClassModal(false)}>Cancel</Button>
          <Button
            onClick={() => createClassMutation.mutate(form)}
            loading={createClassMutation.isPending}
            disabled={!form.name || !form.section}
          >
            Create Classroom
          </Button>
        </div>
        {createClassMutation.isError && <p role="alert" className="mt-3 text-sm text-red-700">{createClassMutation.error.response?.data?.error || 'Could not create the classroom. Please try again.'}</p>}
      </Modal>
    </AppShell>
  );
};
