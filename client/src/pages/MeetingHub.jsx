import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock3, Link2, MapPin, Plus, Send, Users, X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Button, EmptyState, Modal, Spinner } from '../components/ui';

const fieldClass = 'mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15';
const formatLocalDateTime = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const futureDateTime = () => formatLocalDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000));
const toIsoDate = value => value ? new Date(value).toISOString() : undefined;

const audienceLabel = meeting => {
  if (meeting.audience === 'CLASSROOM') return `${meeting.classroom?.name} · ${meeting.classroom?.section}`;
  if (meeting.audience === 'ALL_TEACHERS') return 'All teachers';
  if (meeting.audience === 'ALL_STUDENTS') return 'All students';
  return 'Individual meeting';
};

const statusClass = {
  REQUESTED: 'bg-amber-100 text-amber-900',
  SCHEDULED: 'bg-emerald-100 text-emerald-900',
  DECLINED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-slate-100 text-slate-500'
};

export const MeetingHub = () => {
  const { user, isTeacher, isStudent, isPrincipal } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState('ALL');
  const [responseDrafts, setResponseDrafts] = useState({});
  const [formError, setFormError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [draft, setDraft] = useState({ audience: 'INDIVIDUAL', recipientId: '', classroomId: '', title: '', description: '', scheduledAt: futureDateTime(), preferredAt: '', durationMins: 30, location: '', meetingUrl: '' });

  const { data: options, isLoading: loadingOptions } = useQuery({
    queryKey: ['meeting-options'],
    queryFn: async () => (await api.get('/meetings/options')).data
  });
  const { data: meetings = [], isLoading: loadingMeetings, isError } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => (await api.get('/meetings')).data
  });
  const refreshMeetings = () => queryClient.invalidateQueries({ queryKey: ['meetings'] });

  const createMutation = useMutation({
    mutationFn: payload => api.post('/meetings', payload),
    onSuccess: () => {
      refreshMeetings();
      setShowModal(false);
      setFormError('');
      setStatusMessage(isStudent ? 'Meeting request sent.' : 'Meeting scheduled successfully.');
      setDraft({ audience: 'INDIVIDUAL', recipientId: '', classroomId: '', title: '', description: '', scheduledAt: futureDateTime(), preferredAt: '', durationMins: 30, location: '', meetingUrl: '' });
    },
    onError: error => setFormError(error.response?.data?.error || 'Could not create this meeting.')
  });

  const responseMutation = useMutation({
    mutationFn: ({ meetingId, payload }) => api.put(`/meetings/${meetingId}`, payload),
    onSuccess: (_, variables) => {
      setResponseDrafts(current => ({ ...current, [variables.meetingId]: undefined }));
      setStatusMessage(variables.payload.status === 'DECLINED' ? 'Meeting request declined.' : 'Meeting request scheduled.');
      refreshMeetings();
    }
  });
  const cancelMutation = useMutation({
    mutationFn: meetingId => api.put(`/meetings/${meetingId}`, { status: 'CANCELLED' }),
    onSuccess: () => {
      setStatusMessage('Meeting cancelled.');
      refreshMeetings();
    }
  });

  const people = useMemo(() => {
    if (isStudent) return [...(options?.principals || []), ...(options?.people || [])];
    if (isTeacher) return options?.people || [];
    return options?.people || [];
  }, [isPrincipal, isStudent, isTeacher, options]);

  const visibleMeetings = meetings.filter(meeting => tab === 'ALL' || meeting.status === tab);

  const openComposer = () => {
    setDraft({ audience: 'INDIVIDUAL', recipientId: '', classroomId: '', title: '', description: '', scheduledAt: futureDateTime(), preferredAt: '', durationMins: 30, location: '', meetingUrl: '' });
    setFormError('');
    setShowModal(true);
  };

  const submitMeeting = event => {
    event.preventDefault();
    const payload = {
      audience: draft.audience,
      title: draft.title,
      description: draft.description,
      durationMins: Number(draft.durationMins),
      ...(draft.audience === 'INDIVIDUAL' ? { recipientId: draft.recipientId } : {}),
      ...(draft.audience === 'CLASSROOM' ? { classroomId: draft.classroomId } : {}),
      ...(isStudent ? { preferredAt: toIsoDate(draft.preferredAt) } : {
        scheduledAt: toIsoDate(draft.scheduledAt),
        location: draft.location,
        meetingUrl: draft.meetingUrl
      })
    };
    createMutation.mutate(payload);
  };

  const respondToRequest = (meeting, status) => {
    if (status === 'DECLINED') return responseMutation.mutate({ meetingId: meeting.id, payload: { status } });
    const response = responseDrafts[meeting.id] || {};
    responseMutation.mutate({
      meetingId: meeting.id,
      payload: {
        status,
        scheduledAt: toIsoDate(response.scheduledAt || futureDateTime()),
        durationMins: Number(response.durationMins || meeting.durationMins),
        location: response.location || '',
        meetingUrl: response.meetingUrl || ''
      }
    });
  };

  const title = isPrincipal ? 'School meetings' : isTeacher ? 'Meetings with students' : 'Meetings';

  return (
    <AppShell title={title}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-800"><CalendarDays className="h-4 w-4" /> Meetings and requests</p>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">Schedule conversations with the right people and keep requests in one place.</p>
          </div>
          <Button onClick={openComposer} disabled={loadingOptions}><Plus className="mr-1.5 h-4 w-4" /> {isStudent ? 'Request a meeting' : 'Schedule a meeting'}</Button>
        </header>
        {statusMessage && <p role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{statusMessage}</p>}

        <div className="mb-5 flex border-b border-slate-200">
          {[
            ['ALL', 'All'],
            ['REQUESTED', 'Requests'],
            ['SCHEDULED', 'Scheduled']
          ].map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`border-b-2 px-4 py-2.5 text-sm font-medium ${tab === value ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
        </div>

        {(loadingOptions || loadingMeetings) && <div className="flex justify-center py-16"><Spinner /></div>}
        {isError && <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">Could not load meetings. Refresh and try again.</p>}
        {!loadingMeetings && !isError && visibleMeetings.length === 0 && <EmptyState icon={CalendarDays} title={tab === 'REQUESTED' ? 'No open requests' : tab === 'SCHEDULED' ? 'No scheduled meetings' : 'No meetings yet'} description={isStudent ? 'Request a conversation with a teacher or principal when you need one.' : 'Create a meeting for a student, class, or school-wide group.'} action={<Button onClick={openComposer}><Plus className="mr-1.5 h-4 w-4" /> {isStudent ? 'Request a meeting' : 'Schedule a meeting'}</Button>} />}

        <div className="space-y-4">
          {visibleMeetings.map(meeting => {
            const isIncomingRequest = meeting.status === 'REQUESTED' && meeting.recipientId === user.id;
            const isOrganizer = meeting.createdById === user.id;
            const response = responseDrafts[meeting.id] || { scheduledAt: futureDateTime(), durationMins: meeting.durationMins };
            return <article key={meeting.id} className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-1 text-[11px] font-semibold ${statusClass[meeting.status] || statusClass.CANCELLED}`}>{meeting.status === 'REQUESTED' ? 'REQUEST' : meeting.status}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Users className="h-3.5 w-3.5" /> {audienceLabel(meeting)}</span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">{meeting.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {meeting.createdById === user.id ? 'Created by you' : `From ${meeting.createdBy.name}`}
                    {meeting.audience === 'INDIVIDUAL' && meeting.recipientId && <span> · {meeting.recipientId === user.id ? 'To you' : `To ${meeting.recipient.name}`}</span>}
                  </p>
                </div>
                {meeting.status === 'SCHEDULED' && <div className="min-w-44 text-sm text-slate-700"><p className="flex items-center gap-2 font-medium"><CalendarDays className="h-4 w-4 text-teal-800" />{meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString() : 'Time pending'}</p><p className="mt-1 flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{meeting.durationMins} minutes</p></div>}
              </div>
              {meeting.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{meeting.description}</p>}
              {meeting.status === 'REQUESTED' && meeting.preferredAt && <p className="mt-3 text-xs text-slate-500">Preferred time: {new Date(meeting.preferredAt).toLocaleString()}</p>}
              {meeting.status === 'SCHEDULED' && <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                {meeting.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{meeting.location}</span>}
                {meeting.meetingUrl && <a href={meeting.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-teal-800 hover:underline"><Link2 className="h-3.5 w-3.5" />Join meeting</a>}
              </div>}

              {isIncomingRequest && <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-3 text-sm font-semibold text-slate-800">Respond to this request</p>
                <div className="grid gap-2 sm:grid-cols-[1.3fr_100px_1fr_1.3fr]">
                  <label className="text-xs text-slate-600">Schedule at<input className={fieldClass} type="datetime-local" min={futureDateTime()} value={response.scheduledAt} onChange={event => setResponseDrafts(current => ({ ...current, [meeting.id]: { ...response, scheduledAt: event.target.value } }))} /></label>
                  <label className="text-xs text-slate-600">Minutes<input className={fieldClass} type="number" min="15" max="240" step="15" value={response.durationMins} onChange={event => setResponseDrafts(current => ({ ...current, [meeting.id]: { ...response, durationMins: event.target.value } }))} /></label>
                  <label className="text-xs text-slate-600">Location<input className={fieldClass} value={response.location || ''} onChange={event => setResponseDrafts(current => ({ ...current, [meeting.id]: { ...response, location: event.target.value } }))} /></label>
                  <label className="text-xs text-slate-600">Meeting link<input className={fieldClass} type="url" value={response.meetingUrl || ''} onChange={event => setResponseDrafts(current => ({ ...current, [meeting.id]: { ...response, meetingUrl: event.target.value } }))} /></label>
                </div>
                <div className="mt-3 flex gap-2"><Button size="sm" loading={responseMutation.isPending} onClick={() => respondToRequest(meeting, 'SCHEDULED')}><CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Schedule</Button><Button size="sm" variant="secondary" disabled={responseMutation.isPending} onClick={() => respondToRequest(meeting, 'DECLINED')}><X className="mr-1 h-3.5 w-3.5" /> Decline</Button></div>
              </div>}
              {(isOrganizer || isPrincipal) && !['CANCELLED', 'DECLINED'].includes(meeting.status) && <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(meeting.id)} className="text-xs font-medium text-slate-500 hover:text-red-700">Cancel meeting</button></div>}
              {responseMutation.isError && responseMutation.variables?.meetingId === meeting.id && <p role="alert" className="mt-2 text-xs text-red-700">{responseMutation.error.response?.data?.error || 'Could not update this request.'}</p>}
              {cancelMutation.isError && cancelMutation.variables === meeting.id && <p role="alert" className="mt-2 text-xs text-red-700">{cancelMutation.error.response?.data?.error || 'Could not cancel this meeting.'}</p>}
            </article>;
          })}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isStudent ? 'Request a meeting' : 'Schedule a meeting'}>
        <form onSubmit={submitMeeting} className="space-y-4">
          {!isStudent && <label className="block text-sm font-medium text-slate-700">Who is this for?
            <select className={fieldClass} value={draft.audience} onChange={event => setDraft(current => ({ ...current, audience: event.target.value, recipientId: '', classroomId: '' }))}>
              <option value="INDIVIDUAL">Individual</option>
              <option value="CLASSROOM">Classroom group</option>
              {isPrincipal && <><option value="ALL_TEACHERS">All teachers</option><option value="ALL_STUDENTS">All students</option></>}
            </select>
          </label>}

          {draft.audience === 'INDIVIDUAL' && <label className="block text-sm font-medium text-slate-700">{isStudent ? 'Teacher or principal' : isTeacher ? 'Student' : 'Teacher or student'}
            <select required className={fieldClass} value={draft.recipientId} onChange={event => setDraft(current => ({ ...current, recipientId: event.target.value }))}>
              <option value="">Choose a person</option>
              {isStudent && options?.principals.length > 0 && <optgroup label="Principals">{options.principals.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</optgroup>}
              <optgroup label={isStudent ? 'Your teachers' : isTeacher ? 'Your students' : 'School directory'}>{people.map(person => <option key={person.id} value={person.id}>{person.name} · {person.role.toLowerCase()}</option>)}</optgroup>
            </select>
          </label>}

          {draft.audience === 'CLASSROOM' && <label className="block text-sm font-medium text-slate-700">Classroom
            <select required className={fieldClass} value={draft.classroomId} onChange={event => setDraft(current => ({ ...current, classroomId: event.target.value }))}>
              <option value="">Choose a classroom</option>{options?.classrooms.map(classroom => <option key={classroom.id} value={classroom.id}>{classroom.name} · {classroom.section}</option>)}
            </select>
          </label>}

          <label className="block text-sm font-medium text-slate-700">Meeting title<input required maxLength={120} className={fieldClass} value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} /></label>
          <label className="block text-sm font-medium text-slate-700">Details<textarea maxLength={2000} className={`${fieldClass} min-h-24 resize-y`} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} /></label>

          {isStudent ? <label className="block text-sm font-medium text-slate-700">Preferred time <span className="font-normal text-slate-400">(optional)</span><input className={fieldClass} type="datetime-local" min={futureDateTime()} value={draft.preferredAt} onChange={event => setDraft(current => ({ ...current, preferredAt: event.target.value }))} /></label> : <>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Date and time<input required className={fieldClass} type="datetime-local" min={futureDateTime()} value={draft.scheduledAt} onChange={event => setDraft(current => ({ ...current, scheduledAt: event.target.value }))} /></label><label className="block text-sm font-medium text-slate-700">Duration in minutes<input required className={fieldClass} type="number" min="15" max="240" step="15" value={draft.durationMins} onChange={event => setDraft(current => ({ ...current, durationMins: event.target.value }))} /></label></div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Location <span className="font-normal text-slate-400">(optional)</span><input className={fieldClass} value={draft.location} onChange={event => setDraft(current => ({ ...current, location: event.target.value }))} /></label><label className="block text-sm font-medium text-slate-700">Meeting link <span className="font-normal text-slate-400">(optional)</span><input className={fieldClass} type="url" value={draft.meetingUrl} onChange={event => setDraft(current => ({ ...current, meetingUrl: event.target.value }))} /></label></div>
          </>}

          {isStudent && <p className="text-xs text-slate-500">This sends a private request. The teacher or principal will schedule a time or decline it.</p>}
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button type="submit" loading={createMutation.isPending}><Send className="mr-1.5 h-4 w-4" />{isStudent ? 'Send request' : 'Schedule meeting'}</Button></div>
        </form>
      </Modal>
    </AppShell>
  );
};