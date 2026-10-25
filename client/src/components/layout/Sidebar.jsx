import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  BookOpen, LayoutDashboard, Users, FileText, CheckCircle,
  GraduationCap, LogOut, Clapperboard, CalendarDays,
  ShieldCheck, School, UserCheck, X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar = ({ isOpen = false, onClose = () => {}, onNavigate = () => {} }) => {
  const { user, isTeacher, isStudent, isPrincipal, logout } = useAuth();

  const teacherLinks = [
    { name: 'Dashboard', to: '/teacher/dashboard', icon: LayoutDashboard },
    { name: 'Classrooms', to: '/teacher/classrooms', icon: Users },
    { name: 'Quiz Builder', to: '/teacher/quizzes/new', icon: FileText },
    { name: 'Revision Studio', to: '/teacher/revision', icon: Clapperboard },
    { name: 'Meetings', to: '/meetings', icon: CalendarDays },
  ];

  const studentLinks = [
    { name: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
    { name: 'My Classrooms', to: '/student/classrooms', icon: GraduationCap },
    { name: 'Question Tracker', to: '/student/tracker', icon: CheckCircle },
    { name: 'Revision Feed', to: '/student/revision', icon: Clapperboard },
    { name: 'Meetings', to: '/meetings', icon: CalendarDays },
  ];

  const principalLinks = [
    { name: 'Dashboard', to: '/principal/dashboard', icon: ShieldCheck },
    { name: 'Teachers', to: '/principal/teachers', icon: UserCheck },
    { name: 'Students', to: '/principal/students', icon: GraduationCap },
    { name: 'Classrooms', to: '/principal/classrooms', icon: School },
    { name: 'Meetings', to: '/meetings', icon: CalendarDays },
  ];

  const links = isPrincipal ? principalLinks : isTeacher ? teacherLinks : isStudent ? studentLinks : [];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const roleBadge = isPrincipal ? 'Principal Portal' : isTeacher ? 'Teacher Portal' : 'Student Portal';
  const roleColor = isPrincipal ? 'text-teal-400' : isTeacher ? 'text-indigo-400' : 'text-violet-400';
  const homePath = isPrincipal ? '/principal/dashboard' : isTeacher ? '/teacher/dashboard' : '/student/dashboard';

  return (
    <>
      {isOpen && <button aria-label="Close navigation menu" className="fixed inset-0 z-30 bg-slate-950/50 md:hidden" onClick={onClose} />}
      <aside id="main-navigation" className={`fixed left-0 top-0 z-40 flex h-dvh w-64 flex-col bg-[#0f172a] text-white transition-transform duration-200 md:z-20 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Main navigation">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <Link to={homePath} onClick={onNavigate} aria-label="EduTrack dashboard" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#4338ca]">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="truncate text-lg font-bold tracking-wide text-white">EduTrack</span>
          </Link>
          <button type="button" onClick={onClose} aria-label="Close navigation menu" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-3">
          <span className={`text-[10px] font-semibold uppercase tracking-widest ${roleColor}`}>
            {roleBadge}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#4338ca] text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <link.icon className="h-4 w-4 flex-shrink-0" />
              <span>{link.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#4338ca] text-xs font-bold">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.name}</p>
              {user?.email && <a href={`mailto:${user.email}`} className="block truncate text-xs text-slate-400 hover:text-white">{user.email}</a>}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};
