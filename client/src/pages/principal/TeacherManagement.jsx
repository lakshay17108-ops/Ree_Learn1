import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check, X, Search, Users, GraduationCap, BarChart2,
  ChevronRight, ArrowLeft, Mail, Calendar, School, Clock, Trash2
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { Button, Spinner } from '../../components/ui';
import api from '../../api/axios';

const statusBadge = (status) => {
  if (status === 'APPROVED') return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Approved</span>;
  if (status === 'PENDING') return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Pending</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">Rejected</span>;
};

const ScoreBar = ({ score }) => {
  if (score === null) return <span className="text-slate-400 text-sm">—</span>;
  const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-medium text-slate-700">{score}%</span>
    </div>
  );
};

const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'T';

// ─── Teacher Detail Panel ────────────────────────────────────────────────────
const TeacherDetail = ({ teacherId, onBack }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['principal-teacher', teacherId],
    queryFn: async () => (await api.get(`/principal/teachers/${teacherId}`)).data
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!data) return null;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to teachers
      </button>

      {/* Teacher header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 flex flex-wrap gap-6 items-start">
        <div className="w-16 h-16 rounded-full bg-teal-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {getInitials(data.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-slate-900">{data.name}</h2>
            {statusBadge(data.approvalStatus)}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
            <a href={`mailto:${data.email}`} className="flex items-center gap-1.5 hover:text-teal-700"><Mail className="w-3.5 h-3.5" />{data.email}</a>
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {new Date(data.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex gap-6">
          {[
            { label: 'Classrooms', value: data.totalClassrooms },
            { label: 'Students', value: data.totalStudents },
            { label: 'School avg', value: data.overallAverage !== null ? `${data.overallAverage}%` : '—' }
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Classrooms */}
      <h3 className="text-base font-semibold text-slate-900 mb-3">Classrooms ({data.classrooms.length})</h3>
      {data.classrooms.length ? (
        <div className="space-y-4">
          {data.classrooms.map(c => (
            <details key={c.id} open className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center">
                    <School className="w-5 h-5 text-teal-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.name} · {c.section}</p>
                    <p className="text-xs text-slate-500">{c.studentCount} students · {c.subjects.length} subjects</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Class avg</p>
                    <ScoreBar score={c.classAverage} />
                  </div>
                </div>
              </summary>
              <div className="border-t border-slate-100 overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5 text-left font-semibold">Student</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Quizzes taken</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Average score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {c.students.length ? c.students.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800">{s.name}</p>
                          <a href={`mailto:${s.email}`} className="text-xs text-slate-500 hover:text-teal-700">{s.email}</a>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{s.quizzesTaken}</td>
                        <td className="px-5 py-3"><ScoreBar score={s.averageScore} /></td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-5 py-4 text-center text-slate-400">No students enrolled</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl px-6 py-8 text-center text-sm text-slate-500">
          This teacher hasn't created any classrooms yet.
        </div>
      )}
    </div>
  );
};

// ─── Main TeacherManagement Page ─────────────────────────────────────────────
export const TeacherManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL | PENDING | APPROVED | REJECTED
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['principal-teachers'],
    queryFn: async () => (await api.get('/principal/teachers')).data
  });

  const approvalMutation = useMutation({
    mutationFn: ({ teacherId, status }) => api.put(`/principal/teachers/${teacherId}/approval`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principal-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['principal-overview'] });
    }
  });

  const deleteTeacher = useMutation({
    mutationFn: (id) => api.delete(`/principal/teachers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principal-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['principal-overview'] });
      setConfirmDelete(null);
    }
  });

  const filtered = teachers.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || t.approvalStatus === filter;
    return matchSearch && matchFilter;
  });

  const pendingCount = teachers.filter(t => t.approvalStatus === 'PENDING').length;

  if (selectedId) return (
    <AppShell title="Teacher Management">
      <div className="mx-auto max-w-5xl">
        <TeacherDetail teacherId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    </AppShell>
  );

  return (
    <AppShell title="Teacher Management">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-teal-700">Principal Portal</p>
            <h1 className="text-2xl font-bold text-slate-900">Teacher Management</h1>
            <p className="mt-1 text-sm text-slate-500">Approve registrations, view classroom assignments and student performance.</p>
          </div>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
              {pendingCount} awaiting approval
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
            />
          </div>
          <div className="flex gap-1.5 bg-slate-100 rounded-lg p-1">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                {f === 'PENDING' && pendingCount > 0 && <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px]">{pendingCount}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filtered.length ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Teacher</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-left font-semibold">Classrooms</th>
                    <th className="px-5 py-3 text-left font-semibold">Students</th>
                    <th className="px-5 py-3 text-left font-semibold">Class avg</th>
                    <th className="px-5 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(teacher => (
                    <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {getInitials(teacher.name)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{teacher.name}</p>
                            <a href={`mailto:${teacher.email}`} className="text-xs text-slate-500 hover:text-teal-700">{teacher.email}</a>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{statusBadge(teacher.approvalStatus)}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <School className="w-3.5 h-3.5 text-slate-400" />{teacher.classroomCount}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <Users className="w-3.5 h-3.5 text-slate-400" />{teacher.totalStudents}
                        </span>
                      </td>
                      <td className="px-5 py-3.5"><ScoreBar score={teacher.classAverage} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {teacher.approvalStatus === 'PENDING' && (
                            <>
                              <button
                                onClick={() => approvalMutation.mutate({ teacherId: teacher.id, status: 'APPROVED' })}
                                disabled={approvalMutation.isPending}
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1.5 transition-colors disabled:opacity-60"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => approvalMutation.mutate({ teacherId: teacher.id, status: 'REJECTED' })}
                                disabled={approvalMutation.isPending}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 hover:border-red-300 hover:text-red-700 text-slate-600 text-xs font-semibold px-2.5 py-1.5 transition-colors disabled:opacity-60"
                              >
                                <X className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedId(teacher.id)}
                            className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 text-xs font-semibold px-2 py-1.5 transition-colors"
                          >
                            View <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: teacher.id, name: teacher.name })}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Remove teacher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl px-6 py-12 text-center text-sm text-slate-500">
            {search ? `No teachers matching "${search}"` : 'No teachers found.'}
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">Remove Teacher</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Are you sure you want to permanently remove <span className="font-semibold text-slate-800">{confirmDelete.name}</span>?
              This will delete their account and all associated classrooms, subjects, and quiz data.
            </p>
            {deleteTeacher.isError && (
              <p className="text-xs text-red-600 text-center mb-3">
                {deleteTeacher.error?.response?.data?.error || 'Failed to remove teacher.'}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTeacher.mutate(confirmDelete.id)}
                disabled={deleteTeacher.isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {deleteTeacher.isPending ? 'Removing…' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};
