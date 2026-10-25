import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays, Check, GraduationCap, School, ShieldCheck,
  Users, X, ArrowRight, UserCheck, TrendingUp, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { AppShell } from '../../components/layout/AppShell';
import { Button, Spinner } from '../../components/ui';

const StatCard = ({ label, value, icon: Icon, color, href }) => (
  <Link
    to={href}
    className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-300 hover:shadow-md transition-all group"
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 transition-colors" />
  </Link>
);

export const PrincipalDashboard = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['principal-overview'],
    queryFn: async () => (await api.get('/principal/overview')).data
  });

  const approvalMutation = useMutation({
    mutationFn: ({ teacherId, status }) => api.put(`/principal/teachers/${teacherId}/approval`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['principal-overview'] })
  });

  if (isLoading) return (
    <AppShell title="School Overview">
      <div className="flex justify-center py-20"><Spinner /></div>
    </AppShell>
  );

  return (
    <AppShell title="School Overview">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-800">
              <ShieldCheck className="h-4 w-4" /> Principal portal
            </p>
            <h1 className="text-2xl font-bold text-slate-900">School Overview</h1>
            <p className="mt-1 text-sm text-slate-500">Your complete school management dashboard.</p>
          </div>
          <Link
            to="/meetings"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-800 px-4 text-sm font-medium text-white hover:bg-teal-900 transition-colors"
          >
            <CalendarDays className="h-4 w-4" /> Open Meetings
          </Link>
        </header>

        {isError && (
          <p role="alert" className="mb-5 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            Could not load the school overview.
          </p>
        )}

        {/* Stats grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pending approvals"
            value={data?.summary.pendingTeacherCount ?? 0}
            icon={ShieldCheck}
            color="bg-amber-500"
            href="/principal/teachers"
          />
          <StatCard
            label="Approved teachers"
            value={data?.summary.approvedTeacherCount ?? 0}
            icon={UserCheck}
            color="bg-teal-600"
            href="/principal/teachers"
          />
          <StatCard
            label="Total classrooms"
            value={data?.summary.classroomCount ?? 0}
            icon={School}
            color="bg-indigo-600"
            href="/principal/classrooms"
          />
          <StatCard
            label="Total students"
            value={data?.summary.studentCount ?? 0}
            icon={Users}
            color="bg-violet-600"
            href="/principal/students"
          />
        </div>

        {/* Quick actions */}
        <section className="mb-8">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { to: '/principal/teachers', label: 'Manage Teachers', desc: 'Approvals, classrooms & performance', icon: UserCheck, color: 'text-teal-700 bg-teal-50' },
              { to: '/principal/students', label: 'Track Students', desc: 'Quiz history & enrolments', icon: GraduationCap, color: 'text-indigo-700 bg-indigo-50' },
              { to: '/principal/classrooms', label: 'Classroom Tracker', desc: 'Drill down into any classroom', icon: School, color: 'text-violet-700 bg-violet-50' },
            ].map(a => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-md transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 transition-colors" />
              </Link>
            ))}
          </div>
        </section>

        {/* Pending approvals */}
        {(data?.pendingTeachers?.length > 0) && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Pending Teacher Approvals</h2>
                <p className="mt-0.5 text-sm text-slate-500">New teacher accounts cannot sign in until approved.</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                {data.pendingTeachers.length} pending
              </span>
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
              {data.pendingTeachers.map(teacher => (
                <div key={teacher.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{teacher.name}</p>
                    <p className="text-xs text-slate-500"><a href={`mailto:${teacher.email}`} className="hover:text-teal-700">{teacher.email}</a> · requested {new Date(teacher.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={approvalMutation.isPending && approvalMutation.variables?.teacherId === teacher.id && approvalMutation.variables?.status === 'APPROVED'}
                      onClick={() => approvalMutation.mutate({ teacherId: teacher.id, status: 'APPROVED' })}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={approvalMutation.isPending}
                      onClick={() => approvalMutation.mutate({ teacherId: teacher.id, status: 'REJECTED' })}
                    >
                      <X className="mr-1 h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {approvalMutation.isError && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {approvalMutation.error.response?.data?.error || 'Could not update this teacher account.'}
              </p>
            )}
          </section>
        )}

        {/* Recent activity */}
        {data?.recentActivity?.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {data.recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      Quiz completed: <span className="font-medium">{a.quizTitle}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-slate-500">{a.subjectName}</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${a.percentage >= 75 ? 'text-emerald-700' : a.percentage >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                      {a.percentage}%
                    </p>
                    <p className="text-xs text-slate-400">{new Date(a.submittedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
};