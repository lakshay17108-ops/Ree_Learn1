import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { AppShell } from '../../components/layout/AppShell';
import {
  Button, Card, Badge, Spinner, EmptyState, Modal
} from '../../components/ui';
import { School, Users, Plus, Copy, Check, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const inputCls = 'w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent';

export const Classrooms = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', section: '' });
  const [copiedCode, setCopiedCode] = useState(null);
  const [copyError, setCopyError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { data: classrooms, isLoading, isError } = useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const { data } = await api.get('/classrooms');
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/classrooms', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['classrooms']);
      queryClient.invalidateQueries(['teacher-stats']);
      setShowModal(false);
      setForm({ name: '', section: '' });
      setSuccessMessage('Classroom created successfully.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/classrooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['classrooms']);
      queryClient.invalidateQueries(['teacher-stats']);
      setSuccessMessage('Classroom deleted successfully.');
    }
  });

  const copyCode = async (code) => {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setSuccessMessage('Join code copied.');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      setCopyError('Could not copy the join code. Please select and copy it manually.');
    }
  };

  if (isLoading) return (
    <AppShell title="Classrooms">
      <div className="flex justify-center mt-20"><Spinner /></div>
    </AppShell>
  );

  return (
    <AppShell title="Classrooms">
      {isError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Could not load classrooms. Please refresh and try again.</p>}
      {copyError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{copyError}</p>}
      {successMessage && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{successMessage}</p>}
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Classrooms</h1>
          <p className="text-slate-500 text-sm mt-0.5">{classrooms?.length ?? 0} classroom{classrooms?.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Classroom
        </Button>
      </div>

      {/* Grid */}
      {classrooms?.length === 0 ? (
        <EmptyState
          icon={School}
          title="No classrooms yet"
          description="Create your first classroom to start assigning quizzes and managing students."
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Create Classroom
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {classrooms?.map(c => (
            <div key={c.id} className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <School className="w-5 h-5 text-[#4338ca]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0f172a]">{c.name}</h3>
                    <p className="text-sm text-slate-400">Section {c.section}</p>
                  </div>
                </div>
                {deleteMutation.isError && deleteMutation.variables === c.id && <p role="alert" className="mb-2 text-xs text-red-700">{deleteMutation.error.response?.data?.error || 'Could not delete this classroom.'}</p>}
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${c.name} — ${c.section}"? This cannot be undone.`)) {
                      deleteMutation.mutate(c.id);
                    }
                  }}
                  className="text-slate-300 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Join code */}
              <div className="flex-1" />
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e2e8f0]">
                <button
                  onClick={() => copyCode(c.joinCode)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#0f172a] transition-colors"
                  title="Copy join code"
                >
                  {c.joinCode}
                  {copiedCode === c.joinCode
                    ? <Check className="w-3 h-3 text-emerald-600" />
                    : <Copy className="w-3 h-3 text-slate-400" />
                  }
                </button>
                <Link
                  to={`/teacher/classrooms/${c.id}`}
                  className="flex items-center gap-1 text-sm font-medium text-[#4338ca] hover:underline"
                >
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Classroom Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Classroom">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Class Name *</label>
            <input
              type="text"
              className={inputCls}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Section *</label>
            <input
              type="text"
              className={inputCls}
              value={form.section}
              onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
            />
          </div>
          <p className="text-xs text-slate-400">A unique 6-character join code will be generated automatically.</p>
          {createMutation.isError && <p role="alert" className="text-sm text-red-700">{createMutation.error.response?.data?.error || 'Could not create the classroom. Please try again.'}</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate(form)}
            loading={createMutation.isPending}
            disabled={!form.name || !form.section}
          >
            Create Classroom
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
};
