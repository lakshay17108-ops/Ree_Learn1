import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, BarChart2, ArrowLeft,
  Mail, Calendar, School, Clock, ChevronRight, Trash2
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { Spinner } from '../../components/ui';
import api from '../../api/axios';

const ScoreBar = ({ score }) => {
  if (score === null || score === undefined) return <span className="text-slate-400 text-sm">—</span>;
  const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-semibold ${score >= 75 ? 'text-emerald-700' : score >= 50 ? 'text-amber-700' : 'text-red-700'}`}>{score}%</span>
    </div>
  );
};

const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'S';

// ─── Student Detail Panel ─────────────────────────────────────────────────────
const StudentDetail = ({ studentId, onBack }) => {
  const [activeTab, setActiveTab] = useState('attempts');
  const { data, isLoading } = useQuery({
    queryKey: ['principal-student', studentId],
    queryFn: async () => (await api.get(`/principal/students/${studentId}`)).data
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!data) return null;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to students
      </button>

      {/* Student header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex flex-wrap gap-6 items-start">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {getInitials(data.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{data.name}</h2>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <a href={`mailto:${data.email}`} className="flex items-center gap-1.5 hover:text-indigo-700"><Mail className="w-3.5 h-3.5" />{data.email}</a>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {new Date(data.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-6">
            {[
              { label: 'Classrooms', value: data.summary.totalClassrooms },
              { label: 'Quizzes taken', value: data.summary.totalAttempts },
              { label: 'Overall avg', value: data.summary.averageScore !== null ? `${data.summary.averageScore}%` : '—' }
            ].map(s => (
              <div key={s.label} className="text-center px-4 border-l border-slate-100 first:border-0">
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
        {[
          { key: 'attempts', label: 'Quiz History', icon: BarChart2 },
          { key: 'classrooms', label: 'Classrooms', icon: School }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Quiz Attempts */}
      {activeTab === 'attempts' && (
        data.attempts.length ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Quiz</th>
                    <th className="px-5 py-3 text-left font-semibold">Subject</th>
                    <th className="px-5 py-3 text-left font-semibold">Classroom</th>
                    <th className="px-5 py-3 text-left font-semibold">Score</th>
                    <th className="px-5 py-3 text-left font-semibold">Date</th>
                    <th className="px-5 py-3 text-left font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.attempts.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-medium text-slate-900">{a.quizTitle}</td>
                      <td className="px-5 py-3.5 text-slate-600">{a.subjectName}</td>
                      <td className="px-5 py-3.5 text-slate-500">{a.classroomName}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <ScoreBar score={a.percentage} />
                          <span className="text-xs text-slate-400">{a.score}/{a.totalScore} marks</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{new Date(a.submittedAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {a.timeSpentSeconds ? (
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.floor(a.timeSpentSeconds / 60)}m</span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl px-6 py-12 text-center text-sm text-slate-500">
            This student hasn't taken any quizzes yet.
          </div>
        )
      )}

      {/* Tab: Classrooms */}
      {activeTab === 'classrooms' && (
        data.classrooms.length ? (
          <div className="space-y-3">
            {data.classrooms.map(c => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap gap-4 items-start">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <School className="w-5 h-5 text-teal-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{c.name} · {c.section}</p>
                  <p className="text-sm text-slate-500 mt-0.5">Teacher: {c.teacher.name}</p>
                  {c.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.subjects.map(s => (
                        <span key={s.id} className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{s.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  Enrolled {new Date(c.enrolledAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl px-6 py-12 text-center text-sm text-slate-500">
            This student isn't enrolled in any classrooms.
          </div>
        )
      )}
    </div>
  );
};

// ─── Main StudentManagement Page ──────────────────────────────────────────────
export const StudentManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name | score | quizzes
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['principal-students'],
    queryFn: async () => (await api.get('/principal/students')).data
  });

  const deleteStudent = useMutation({
    mutationFn: (id) => api.delete(`/principal/students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principal-students'] });
      queryClient.invalidateQueries({ queryKey: ['principal-overview'] });
      setConfirmDelete(null);
    }
  });

  const filtered = students
    .filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.classrooms.some(c => c.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'score') return (b.averageScore ?? -1) - (a.averageScore ?? -1);
      if (sortBy === 'quizzes') return b.quizzesTaken - a.quizzesTaken;
      return a.name.localeCompare(b.name);
    });

  if (selectedId) return (
    <AppShell title="Student Management">
      <div className="mx-auto max-w-5xl">
        <StudentDetail studentId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    </AppShell>
  );

  return (
    <AppShell title="Student Management">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-teal-700">Principal Portal</p>
            <h1 className="text-2xl font-bold text-slate-900">Student Management</h1>
            <p className="mt-1 text-sm text-slate-500">Track every student's enrolments, quiz records and performance.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {students.length} students
          </span>
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Sort:</span>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {[
                { key: 'name', label: 'Name' },
                { key: 'score', label: 'Score' },
                { key: 'quizzes', label: 'Quizzes' }
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${sortBy === s.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
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
                    <th className="px-5 py-3 text-left font-semibold">Student</th>
                    <th className="px-5 py-3 text-left font-semibold">Classrooms</th>
                    <th className="px-5 py-3 text-left font-semibold">Quizzes taken</th>
                    <th className="px-5 py-3 text-left font-semibold">Average score</th>
                    <th className="px-5 py-3 text-left font-semibold">Last active</th>
                    <th className="px-5 py-3 text-left font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(student => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedId(student.id)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {getInitials(student.name)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{student.name}</p>
                            <a href={`mailto:${student.email}`} className="text-xs text-slate-500 hover:text-indigo-700">{student.email}</a>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {student.classrooms.slice(0, 2).map(c => (
                            <span key={c.id} className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">{c.name} {c.section}</span>
                          ))}
                          {student.classrooms.length > 2 && (
                            <span className="text-xs text-slate-400">+{student.classrooms.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{student.quizzesTaken}</td>
                      <td className="px-5 py-3.5"><ScoreBar score={student.averageScore} /></td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {student.lastActive ? new Date(student.lastActive).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedId(student.id)}
                            className="p-1.5 text-slate-400 hover:text-teal-700 rounded transition-colors"
                            title="View details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: student.id, name: student.name })}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Remove student"
                          >
                            <Trash2 className="w-4 h-4" />
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
            {search ? `No students matching "${search}"` : 'No students found.'}
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
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">Remove Student</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Are you sure you want to permanently remove <span className="font-semibold text-slate-800">{confirmDelete.name}</span>?
              This will delete their account, all enrolments, and quiz records.
            </p>
            {deleteStudent.isError && (
              <p className="text-xs text-red-600 text-center mb-3">
                {deleteStudent.error?.response?.data?.error || 'Failed to remove student.'}
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
                onClick={() => deleteStudent.mutate(confirmDelete.id)}
                disabled={deleteStudent.isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {deleteStudent.isPending ? 'Removing…' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};
