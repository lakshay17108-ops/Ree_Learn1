import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Scale } from 'lucide-react';

const draftNotice = (
  <div role="note" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
    <strong>Draft policy:</strong> This page is a starting point, not a final legal document. The service owner should review it, complete the highlighted operational decisions, and obtain appropriate legal advice before relying on it.
  </div>
);

const sections = {
  terms: {
    title: 'Terms of Use',
    description: 'Draft terms for using EduTrack.',
    icon: Scale,
    content: [
      ['Using EduTrack', 'EduTrack provides tools for school leaders, teachers, and students to manage classrooms, learning resources, quizzes, results, and meetings. By using the service, you agree to follow these draft terms and any rules set by your school.'],
      ['Accounts and school access', 'Keep your sign-in credentials private and use only the account and role assigned to you. School leaders and teachers should manage classroom access responsibly. Contact your school administrator if you believe an account has been used without permission.'],
      ['Learning content', 'Only upload or share material that you are permitted to use and that is appropriate for its intended classroom audience. Do not use EduTrack to publish unlawful, harmful, or unrelated material. Teachers and schools are responsible for reviewing content they share with students.'],
      ['Availability and changes', 'EduTrack may be unavailable during maintenance, service interruptions, or technical issues. Features may change as the service develops. This draft does not make a service-level or uptime guarantee.'],
      ['School and student responsibilities', 'Schools should ensure they have the authority and any required permissions to create accounts and use student information in EduTrack. Students should use the service for their learning activities and follow their school’s instructions.'],
      ['Terms that need owner review', 'Before publication, the service owner should decide the legal entity responsible for EduTrack, the effective date, the governing jurisdiction, age and consent requirements, dispute process, and how users can close accounts or raise concerns.']
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'Draft information about data used by EduTrack.',
    icon: ShieldCheck,
    content: [
      ['Information used by the service', 'EduTrack uses account details such as a user’s name, email address, and role. Depending on how the service is used, it also handles classroom membership, subjects, quizzes and questions, student answers and results, revision posts and feedback, meeting details, and uploaded revision media.'],
      ['How information supports the service', 'This information is used to sign users in, provide role-specific classroom tools, assign and complete quizzes, show learning progress, share revision resources, and arrange meetings.'],
      ['Authentication in your browser', 'The current client stores an authentication token in browser local storage so a signed-in user can continue using the service. Anyone with access to an unlocked browser profile may be able to access that session. Sign out on shared devices.'],
      ['School-managed information', 'EduTrack is designed for school communities. Schools and their authorized staff should determine that they have the required authority and permissions before adding students or sharing student information. Use only the information needed for classroom activities.'],
      ['Retention, deletion, and service providers', 'This draft does not define retention periods, deletion timelines, backups, hosting or infrastructure providers, or any additional recipients of information. The service owner must document and verify these practices before publishing a final policy; this page does not claim that data is deleted after a particular period or is never shared.'],
      ['Your choices and privacy questions', 'For now, contact the school that manages your account to ask about access, correction, or removal of school-related information. A direct privacy contact for the service has not been provided yet and should be added before publication.'],
      ['Details that need owner review', 'Before publication, the service owner should confirm the responsible organization and privacy contact, hosting and subprocessors, applicable age and consent rules, retention and deletion practices, security measures, user rights, and the effective date and governing jurisdiction.']
    ]
  }
};

export const LegalLinks = ({ className = '' }) => (
  <nav aria-label="Legal pages" className={`flex flex-wrap gap-x-4 gap-y-2 text-xs ${className}`}>
    <Link to="/terms" className="font-medium text-indigo-700 hover:underline">Terms of Use</Link>
    <Link to="/privacy" className="font-medium text-indigo-700 hover:underline">Privacy Policy</Link>
  </nav>
);

export const PolicyPage = ({ type }) => {
  const policy = sections[type];
  const Icon = policy.icon;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Icon className="h-5 w-5" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">EduTrack · Draft</p>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{policy.title}</h1>
            </div>
          </div>
          <p className="mb-6 text-sm text-slate-600">{policy.description}</p>
          {draftNotice}
          <div className="space-y-6">
            {policy.content.map(([heading, text]) => (
              <section key={heading}>
                <h2 className="mb-2 text-base font-semibold text-slate-900">{heading}</h2>
                <p className="text-sm leading-7 text-slate-600">{text}</p>
              </section>
            ))}
          </div>
          <div className="mt-8 border-t border-slate-200 pt-5">
            <p className="text-xs leading-5 text-slate-500">This draft is based on the visible EduTrack application features. It is not legal advice and is not ready to represent unverified operational or legal practices.</p>
            <LegalLinks className="mt-3 text-sm" />
          </div>
        </article>
      </div>
    </main>
  );
};
