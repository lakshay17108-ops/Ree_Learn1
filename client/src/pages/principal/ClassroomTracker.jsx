import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, School, Users, ArrowLeft, CalendarDays,
  BookOpen, GraduationCap, ChevronRight, Clock
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { Spinner } from '../../components/ui';
import api from '../../api/axios';

const ScoreBar = ({ score, showLabel = true }) => {
  if (score === null || score === undefined) return <span className="text-slate-400 text-sm">No data</span>;
  const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 75 ? 'text-emerald-700' : score >= 50 ? 'text-amber-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      {showLabel && <span className={`text-sm font-semibold ${textColor}`}>{score}%</span>}
    </div>
  );
};

const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'S';

// ─── Classroom Detail View ────────────────────────────────────────────────────
const ClassroomDetail = ({ classroomId, onBack }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['principal-classroom', classroomId],
    queryFn: async () => (await api.get(`/principal/classrooms/${classroomId}`)).data
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!data) return null;

  const handleScheduleMeeting = () => {
    navigate(`/meetings?classroomId=${classroomId}&classroomName=${encodeURIComponent(`${data.name} ${data.section}`)}`);
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to classrooms
      </button>

      {/* Classroom header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <School className="w-7 h-7 text-teal-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{data.name} · {data.section}</h2>
              <p className="text-sm text-slate-500 mt-1">
                Teacher: <span className="font-medium text-slate-700">{data.teacher.name}</span>
                <span className="text-slate-400 mx-2">·</span>
                <a href={`mailto:${data.teacher.email}`} className="hover:text-teal-700">{data.teacher.email}</a>
              </p>
              <p className="text-xs text-slate-400 mt-1">Created {new Date(data.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <button
            onClick={handleScheduleMeeting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors"
          >
            <CalendarDays className="w-4 h-4" /> Schedule Class Meeting
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Students enrolled', value: data.studentCount, icon: Users },
            { label: 'Subjects', value: data.subjects.length, icon: BookOpen },
            { label: 'Class average', value: data.classAverage !== null ? `${data.classAverage}%` : '—', icon: GraduationCap },
            { label: 'Join code', value: data.joinCode, icon: School },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-lg p-3 flex items-center gap-3">
              <s.icon className="w-4 h-4 text-teal-700 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {data.subjects.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.subjects.map(s => (
              <span key={s.id} className="inline-block bg-teal-50 text-teal-700 border border-teal-200 text-xs font-medium px-3 py-1 rounded-full">
                {s.name} <span className="text-teal-400">({s.code})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Class average score bar */}
      {data.classAverage !== null && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <p className="text-sm font-semibold text-slate-700 mb-2">Overall Class Performance</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${data.classAverage >= 75 ? 'bg-emerald-500' : data.classAverage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${data.classAverage}%` }}
              />
            </div>
            <span className="text-lg font-bold text-slate-900 w-12">{data.classAverage}%</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Average across all quiz attempts in this classroom</p>
        </div>
      )}

      {/* Students table */}
      <h3 className="text-base font-semibold text-slate-900 mb-3">Students ({data.studentCount})</h3>
      {data.students.length ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Student</th>
                  <th className="px-5 py-3 text-left font-semibold">Quizzes taken</th>
                  <th className="px-5 py-3 text-left font-semibold">Average score</th>
                  <th className="px-5 py-3 text-left font-semibold">Latest result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {getInitials(s.name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{s.name}</p>
                          <a href={`mailto:${s.email}`} className="text-xs text-slate-500 hover:text-teal-700">{s.email}</a>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{s.quizzesTaken}</td>
                    <td className="px-5 py-3.5"><ScoreBar score={s.averageScore} /></td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {s.latestAttempt ? (
                        <div>
                          <p className="text-slate-700 font-medium text-xs">{s.latestAttempt.quizTitle}</p>
                          <p className="text-xs text-slate-400">{s.latestAttempt.percentage}% · {new Date(s.latestAttempt.submittedAt).toLocaleDateString()}</p>
                        </div>
                      ) : <span className="text-slate-400">No quizzes taken</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl px-6 py-8 text-center text-sm text-slate-500">
          No students are enrolled in this classroom yet.
        </div>
      )}
    </div>
  );
};

// ─── Main ClassroomTracker Page ───────────────────────────────────────────────
export const ClassroomTracker = () => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['principal-overview'],
    queryFn: async () => (await api.get('/principal/overview')).data
  });

  const classrooms = overview?.classrooms ?? [];

  const filtered = classrooms.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.section.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher.name.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedId) return (
    <AppShell title="Classroom Tracker">
      <div className="mx-auto max-w-5xl">
        <ClassroomDetail classroomId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    </AppShell>
  );

  return (
    <AppShell title="Classroom Tracker">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-teal-700">Principal Portal</p>
            <h1 className="text-2xl font-bold text-slate-900">Classroom Tracker</h1>
            <p className="mt-1 text-sm text-slate-500">View every classroom, drill down into student scores, and schedule meetings.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {classrooms.length} classrooms
          </span>
        </div>

        {/* Search */}
        <div className="mb-5 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
          />
        </div>

        {/* Classroom cards */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filtered.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                    <School className="w-5 h-5 text-teal-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{c.name} · {c.section}</p>
                    <p className="text-xs text-slate-500 truncate">Teacher: {c.teacher.name}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 transition-colors mt-0.5" />
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {c.studentCount} students
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {c.classAverage !== null ? `${c.classAverage}% avg` : 'No quiz data'}
                  </span>
                </div>

                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  {c.classAverage !== null && (
                    <div
                      className={`h-full rounded-full ${c.classAverage >= 75 ? 'bg-emerald-500' : c.classAverage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${c.classAverage}%` }}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl px-6 py-12 text-center text-sm text-slate-500">
            {search ? `No classrooms matching "${search}"` : 'No classrooms have been created yet.'}
          </div>
        )}
      </div>
    </AppShell>
  );
};
