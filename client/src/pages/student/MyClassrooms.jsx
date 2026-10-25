import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { AppShell } from '../../components/layout/AppShell';
import {
  Button, Card, Badge, Spinner, EmptyState, Modal
} from '../../components/ui';
import { GraduationCap, BookOpen, Plus, ArrowRight, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const inputCls = 'w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent';

export const MyClassrooms = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const { data: classrooms, isLoading } = useQuery({
    queryKey: ['enrolled-classrooms'],
    queryFn: async () => {
      const { data } = await api.get('/classrooms/enrolled');
      return data;
    }
  });

  const joinMutation = useMutation({
    mutationFn: (code) => api.post('/classrooms/join', { joinCode: code }),
    onSuccess: () => {
      queryClient.invalidateQueries(['enrolled-classrooms']);
      setShowJoinModal(false);
      setJoinCode('');
      setJoinError('');
    },
    onError: (err) => {
      setJoinError(err.response?.data?.error || 'Invalid join code. Please try again.');
    }
  });

  // For each classroom, fetch its subjects
  const { data: subjectsByClassroom } = useQuery({
    queryKey: ['student-subjects', classrooms?.map(c => c.id)],
    queryFn: async () => {
      if (!classrooms?.length) return {};
      const results = await Promise.all(
        classrooms.map(c => api.get(`/subjects/classroom/${c.id}`).then(r => ({ classroomId: c.id, subjects: r.data })))
      );
      const map = {};
      results.forEach(r => { map[r.classroomId] = r.subjects; });
      return map;
    },
    enabled: !!classrooms?.length
  });

  if (isLoading) return (
    <AppShell title="My Classrooms">
      <div className="flex justify-center mt-20"><Spinner /></div>
    </AppShell>
  );

  return (
    <AppShell title="My Classrooms">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">My Classrooms</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Enrolled in {classrooms?.length ?? 0} classroom{classrooms?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowJoinModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Join Classroom
        </Button>
      </div>

      {/* Classrooms */}
      {classrooms?.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No classrooms yet"
          description="Ask your teacher for a join code to enroll in your first classroom."
          action={
            <Button onClick={() => setShowJoinModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Join Classroom
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {classrooms?.map(c => {
            const subjects = subjectsByClassroom?.[c.id] || [];
            return (
              <div key={c.id} className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden">
                {/* Classroom header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#4338ca] flex items-center justify-center">
                      <GraduationCap className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[#0f172a]">{c.name}</h2>
                      <p className="text-xs text-slate-400">Section {c.section}</p>
                    </div>
                  </div>
                  {c.teacher && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5" />
                      {c.teacher.name}
                    </div>
                  )}
                </div>

                {/* Subjects grid */}
                <div className="p-6">
                  {subjects.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No subjects added yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {subjects.map(sub => (
                        <Link
                          key={sub.id}
                          to={`/student/subjects/${sub.id}`}
                          className="flex items-center justify-between p-4 border border-[#e2e8f0] rounded-xl hover:border-[#4338ca]/50 hover:bg-indigo-50/50 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#4338ca] transition-colors">
                              <BookOpen className="w-4 h-4 text-[#4338ca] group-hover:text-white transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#0f172a]">{sub.name}</p>
                              <p className="text-xs text-slate-400">{sub.code}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#4338ca] transition-colors" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join Classroom Modal */}
      <Modal isOpen={showJoinModal} onClose={() => { setShowJoinModal(false); setJoinCode(''); setJoinError(''); }} title="Join a Classroom">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Enter the 6-character join code provided by your teacher.</p>
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Join Code</label>
            <input
              type="text"
              className={`${inputCls} font-mono text-lg text-center uppercase tracking-widest`}
              maxLength={10}
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && joinCode.trim()) joinMutation.mutate(joinCode.trim()); }}
            />
            {joinError && (
              <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                ⚠ {joinError}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError(''); }}>
            Cancel
          </Button>
          <Button
            onClick={() => joinMutation.mutate(joinCode.trim())}
            loading={joinMutation.isPending}
            disabled={!joinCode.trim()}
          >
            Join Classroom
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
};
