import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui';
import { NetworkStatus } from './components/NetworkStatus';
import { PolicyPage } from './pages/PolicyPage';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { PrincipalLogin } from './pages/auth/PrincipalLogin';

// Teacher Pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { Classrooms } from './pages/teacher/Classrooms';
import { ClassroomDetail } from './pages/teacher/ClassroomDetail';
import { QuizBuilder } from './pages/teacher/QuizBuilder';
import { QuizAnalytics } from './pages/teacher/QuizAnalytics';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { MyClassrooms } from './pages/student/MyClassrooms';
import { SubjectHub } from './pages/student/SubjectHub';
import { QuizPlayer } from './pages/student/QuizPlayer';
import { ResultReview } from './pages/student/ResultReview';
import { QuestionTracker } from './pages/student/QuestionTracker';

// Shared Pages
import { RevisionFeed } from './pages/RevisionFeed';
import { MeetingHub } from './pages/MeetingHub';

// Principal Pages
import { PrincipalDashboard } from './pages/principal/PrincipalDashboard';
import { TeacherManagement } from './pages/principal/TeacherManagement';
import { StudentManagement } from './pages/principal/StudentManagement';
import { ClassroomTracker } from './pages/principal/ClassroomTracker';

const homeForRole = (role) =>
  role === 'PRINCIPAL' ? '/principal/dashboard'
  : role === 'TEACHER' ? '/teacher/dashboard'
  : '/student/dashboard';

const pageMetadata = [
  ['/terms', 'Terms of Use', 'Read the draft terms of use for EduTrack.'],
  ['/privacy', 'Privacy Policy', 'Read the draft privacy policy for EduTrack.'],
  ['/login', 'Sign in', 'Sign in to your EduTrack learning account.'],
  ['/register', 'Create account', 'Create an EduTrack account to access classroom learning tools.'],
  ['/principal-login', 'Principal sign in', 'Sign in to the EduTrack school authority portal.'],
  ['/principal/dashboard', 'School overview', 'Review school activity, classrooms, students, and teacher approvals.'],
  ['/principal/teachers', 'Teacher management', 'Manage teacher accounts and review classroom performance.'],
  ['/principal/students', 'Student management', 'Review student enrolments, quiz history, and learning progress.'],
  ['/principal/classrooms', 'Classroom tracker', 'Track school classrooms, teachers, and student progress.'],
  ['/teacher/dashboard', 'Teacher dashboard', 'Manage classrooms, students, quizzes, and learning resources.'],
  ['/teacher/classrooms', 'Classrooms', 'View and manage your classrooms in EduTrack.'],
  ['/teacher/classrooms/:classroomId', 'Classroom details', 'Review classroom subjects, students, and assignments.'],
  ['/teacher/quizzes/new', 'Quiz builder', 'Create quizzes and add questions for your students.'],
  ['/teacher/analytics/:quizId', 'Quiz analytics', 'Review student results and performance for this quiz.'],
  ['/teacher/revision', 'Revision studio', 'Share revision notes and media with your classes.'],
  ['/student/dashboard', 'Student dashboard', 'Review assignments, quiz results, and learning progress.'],
  ['/student/classrooms', 'My classrooms', 'View your enrolled classrooms and class subjects.'],
  ['/student/subjects/:subjectId', 'Subject hub', 'Review assignments and quiz history for this subject.'],
  ['/student/quiz/:assignmentId', 'Take a quiz', 'Complete your assigned quiz and submit your answers.'],
  ['/student/results/:attemptId', 'Quiz results', 'Review your submitted quiz answers and score.'],
  ['/student/tracker', 'Question tracker', 'Track quiz questions, results, and areas to revisit.'],
  ['/student/revision', 'Revision feed', 'Review class notes and resources shared by your teachers.'],
  ['/meetings', 'Meetings', 'Schedule and manage classroom and individual meetings.']
];

const PageMetadata = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const [, title, description] = pageMetadata.find(([route]) =>
      route === pathname || (route.includes(':') && new RegExp(`^${route.replace(/:[^/]+/g, '[^/]+')}$`).test(pathname))
    ) || ['', 'Page not found', 'The page you requested could not be found.'];
    document.title = `${title} | EduTrack`;
    let descriptionTag = document.querySelector('meta[name="description"]');
    if (!descriptionTag) {
      descriptionTag = document.createElement('meta');
      descriptionTag.name = 'description';
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.content = description;
  }, [pathname]);

  return null;
};

const ProtectedRoute = ({ children, allowedRole }) => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-[#f8fafc]"><Spinner size="lg" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }
  return children;
};

const RootRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-[#f8fafc]"><Spinner size="lg" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(user.role)} replace />;
};

function App() {
  return (
    <>
    <PageMetadata />
    <NetworkStatus />
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* ── Public Auth ── */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ── Principal-only login (separate from /login) ── */}
      <Route path="/principal-login" element={<PrincipalLogin />} />
      <Route path="/terms" element={<PolicyPage type="terms" />} />
      <Route path="/privacy" element={<PolicyPage type="privacy" />} />

      {/* ── Principal Routes ── */}
      <Route path="/principal/dashboard" element={<ProtectedRoute allowedRole="PRINCIPAL"><PrincipalDashboard /></ProtectedRoute>} />
      <Route path="/principal/teachers" element={<ProtectedRoute allowedRole="PRINCIPAL"><TeacherManagement /></ProtectedRoute>} />
      <Route path="/principal/students" element={<ProtectedRoute allowedRole="PRINCIPAL"><StudentManagement /></ProtectedRoute>} />
      <Route path="/principal/classrooms" element={<ProtectedRoute allowedRole="PRINCIPAL"><ClassroomTracker /></ProtectedRoute>} />

      {/* ── Teacher Routes ── */}
      <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRole="TEACHER"><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/classrooms" element={<ProtectedRoute allowedRole="TEACHER"><Classrooms /></ProtectedRoute>} />
      <Route path="/teacher/classrooms/:classroomId" element={<ProtectedRoute allowedRole="TEACHER"><ClassroomDetail /></ProtectedRoute>} />
      <Route path="/teacher/quizzes/new" element={<ProtectedRoute allowedRole="TEACHER"><QuizBuilder /></ProtectedRoute>} />
      <Route path="/teacher/analytics/:quizId" element={<ProtectedRoute allowedRole="TEACHER"><QuizAnalytics /></ProtectedRoute>} />
      <Route path="/teacher/revision" element={<ProtectedRoute allowedRole="TEACHER"><RevisionFeed /></ProtectedRoute>} />

      {/* ── Student Routes ── */}
      <Route path="/student/dashboard" element={<ProtectedRoute allowedRole="STUDENT"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/classrooms" element={<ProtectedRoute allowedRole="STUDENT"><MyClassrooms /></ProtectedRoute>} />
      <Route path="/student/subjects/:subjectId" element={<ProtectedRoute allowedRole="STUDENT"><SubjectHub /></ProtectedRoute>} />
      <Route path="/student/quiz/:assignmentId" element={<ProtectedRoute allowedRole="STUDENT"><QuizPlayer /></ProtectedRoute>} />
      <Route path="/student/results/:attemptId" element={<ProtectedRoute allowedRole="STUDENT"><ResultReview /></ProtectedRoute>} />
      <Route path="/student/tracker" element={<ProtectedRoute allowedRole="STUDENT"><QuestionTracker /></ProtectedRoute>} />
      <Route path="/student/revision" element={<ProtectedRoute allowedRole="STUDENT"><RevisionFeed /></ProtectedRoute>} />

      {/* ── Shared (all logged-in roles) ── */}
      <Route path="/meetings" element={<ProtectedRoute><MeetingHub /></ProtectedRoute>} />

      {/* ── 404 ── */}
      <Route path="*" element={
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#4338ca]">EduTrack</p>
          <h1 className="mb-4 text-6xl font-bold text-[#0f172a]">404</h1>
          <p className="mb-6 text-slate-500">We couldn’t find the page you’re looking for.</p>
          <Link to="/" className="rounded-lg bg-[#4338ca] px-4 py-2.5 font-medium text-white hover:bg-[#3730a3]">Go to your dashboard</Link>
        </div>
      } />
    </Routes>
    </>
  );
}

export default App;
