import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { AppShell } from '../../components/layout/AppShell';
import { Card, Spinner, Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, Badge, Button } from '../../components/ui';
import { CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const dueDateBadge = (dueDate) => {
  const diff = new Date(dueDate) - new Date();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diff < 0) return { variant: 'danger', label: `Overdue by ${Math.abs(days)} day(s)` };
  if (days === 0) return { variant: 'danger', label: 'Due today' };
  if (days <= 2) return { variant: 'warning', label: `Due in ${days} day(s)` };
  return { variant: 'warning', label: `Due ${formatDate(dueDate)}` };
};

export const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['student-stats'],
    queryFn: async () => (await api.get('/analytics/dashboard/student')).data
  });

  const { data: pending, isLoading: pendingLoading, isError: pendingError } = useQuery({
    queryKey: ['assignments-pending'],
    queryFn: async () => (await api.get('/assignments/mine/pending')).data
  });

  const { data: attempts, isLoading: attemptsLoading, isError: attemptsError } = useQuery({
    queryKey: ['my-attempts'],
    queryFn: async () => (await api.get('/attempts/mine')).data
  });

  if (statsLoading || pendingLoading || attemptsLoading) {
    return <AppShell title="Dashboard"><div className="flex justify-center mt-20"><Spinner /></div></AppShell>;
  }

  return (
    <AppShell title="My Dashboard">
      {/* Profile card */}
      <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] flex items-center gap-5 mb-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#4338ca] flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">{user?.name}</h2>
          {user?.email && <a href={`mailto:${user.email}`} className="text-sm text-slate-500 hover:text-[#4338ca]">{user.email}</a>}
          <p className="text-xs text-slate-400 mt-0.5">Student Account</p>
        </div>
        {(statsError || pendingError || attemptsError) && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Some dashboard information could not be loaded. Please refresh and try again.</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0f172a]">{stats?.quizzesTaken ?? 0}</p>
            <p className="text-sm text-slate-500">Quizzes Taken</p>
          </div>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#4338ca]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0f172a]">{stats?.avgScore ? `${stats.avgScore.toFixed(1)}%` : '—'}</p>
            <p className="text-sm text-slate-500">Average Score</p>
          </div>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0f172a]">{stats?.pendingCount ?? 0}</p>
            <p className="text-sm text-slate-500">Pending Assignments</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Assignments */}
        <div>
          <h3 className="text-base font-semibold text-[#0f172a] mb-4">Pending Assignments</h3>
          {pending?.length > 0 ? (
            <div className="space-y-3">
              {pending.map(p => {
                const badge = dueDateBadge(p.dueDate);
                return (
                  <div key={p.id} className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h4 className="font-semibold text-[#0f172a] text-sm">{p.quiz?.title || 'Quiz'}</h4>
                        <p className="text-xs text-slate-400">{p.quiz?.subject?.name}</p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <button
                      onClick={() => navigate(`/student/quiz/${p.id}`)}
                      className="mt-3 w-full bg-[#4338ca] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#3730a3] transition-colors"
                    >
                      Start Quiz
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-8 text-center shadow-sm">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">All caught up! No pending assignments.</p>
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div>
          <h3 className="text-base font-semibold text-[#0f172a] mb-4">Recent Results</h3>
          {attempts?.length > 0 ? (
            <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Quiz</TableHeaderCell>
                    <TableHeaderCell>Score</TableHeaderCell>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell></TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attempts.slice(0, 5).map(a => {
                    const pct = a.totalScore > 0 ? ((a.score / a.totalScore) * 100).toFixed(0) : 0;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.quiz?.title || 'Quiz'}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${pct >= 70 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {pct}%
                          </span>
                          <span className="text-slate-400 text-xs ml-1">({a.score}/{a.totalScore})</span>
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">{formatDate(a.submittedAt)}</TableCell>
                        <TableCell>
                          <Link to={`/student/results/${a.id}`} className="text-[#4338ca] hover:underline text-xs font-medium">
                            Review
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-8 text-center shadow-sm">
              <p className="text-slate-500 text-sm">No quiz attempts yet. Complete an assignment to see your results here.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};
