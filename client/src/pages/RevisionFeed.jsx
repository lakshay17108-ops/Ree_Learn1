import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bookmark, Check, Clapperboard, FileText, Flag, Heart, Image, MessageSquareText,
  Play, Plus, Search, Send, Upload, Video, X
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Button, EmptyState, Modal, Spinner } from '../components/ui';

const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15';
const actionClass = 'inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors';

const errorMessage = (error) => error?.response?.data?.error || 'Something went wrong. Please try again.';

const compressImage = async (file) => {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob) throw new Error('This image could not be compressed. Try a different image.');
  if (blob.size >= file.size) return file;
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${baseName}.${extension}`, { type: blob.type, lastModified: file.lastModified });
};

const RevisionMedia = ({ post }) => {
  return post.mediaType === 'IMAGE'
    ? <img src={post.mediaUrl} alt={post.title} className="mx-auto max-h-[560px] w-full object-contain" />
    : <video src={post.mediaUrl} controls playsInline className="mx-auto max-h-[560px] w-full" />;
};

export const RevisionFeed = () => {
  const { isTeacher } = useAuth();
  const queryClient = useQueryClient();
  const [classroomId, setClassroomId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState({ subjectId: '', title: '', content: '' });
  const [media, setMedia] = useState(null);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [formError, setFormError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['revision-subjects'],
    queryFn: async () => (await api.get('/revision/subjects')).data
  });

  const classrooms = useMemo(() => {
    const byId = new Map();
    subjects.forEach(subject => byId.set(subject.classroom.id, subject.classroom));
    return [...byId.values()];
  }, [subjects]);

  const visibleSubjects = useMemo(
    () => subjects.filter(subject => !classroomId || subject.classroomId === classroomId),
    [subjects, classroomId]
  );

  const { data: posts = [], isLoading: loadingPosts, isError } = useQuery({
    queryKey: ['revision-posts', classroomId, subjectId],
    queryFn: async () => (await api.get('/revision/posts', {
      params: { ...(classroomId ? { classroomId } : {}), ...(subjectId ? { subjectId } : {}) }
    })).data
  });

  const refreshPosts = () => queryClient.invalidateQueries({ queryKey: ['revision-posts'] });

  const publishMutation = useMutation({
    mutationFn: async () => {
      let uploadedMedia = {};
      if (media) {
        if (!/^(image|video)\//.test(media.type)) {
          throw new Error('Choose an image or video file.');
        }
        if (media.size > 75 * 1024 * 1024) {
          throw new Error('Media must be 75 MB or smaller.');
        }

        const { data: upload } = await api.post('/revision/upload-signature', { subjectId: draft.subjectId });
        const body = new FormData();
        body.append('file', media);
        body.append('api_key', upload.apiKey);
        body.append('timestamp', upload.timestamp);
        body.append('public_id', upload.publicId);
        body.append('signature', upload.signature);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(upload.cloudName)}/auto/upload`, {
          method: 'POST',
          body
        });
        let result;
        try {
          result = await response.json();
        } catch (error) {
          throw new Error('Cloudinary returned an invalid upload response.');
        }
        const uploadedType = result.resource_type === 'image' ? 'IMAGE' : result.resource_type === 'video' ? 'VIDEO' : null;
        if (!response.ok || !result.secure_url || result.public_id !== upload.publicId
          || uploadedType !== (media.type.startsWith('image/') ? 'IMAGE' : 'VIDEO')) {
          throw new Error(result.error?.message || 'Could not upload media to Cloudinary.');
        }
        uploadedMedia = { mediaUrl: result.secure_url, mediaType: uploadedType };
      }

      return api.post('/revision/posts', { ...draft, ...uploadedMedia });
    },
    onSuccess: () => {
      refreshPosts();
      setShowComposer(false);
      setDraft({ subjectId: '', title: '', content: '' });
      setMedia(null);
      setFormError('');
      setStatusMessage('Revision post published successfully.');
    },
    onError: error => setFormError(errorMessage(error))
  });

  const actionMutation = useMutation({
    mutationFn: ({ postId, action }) => api.put(`/revision/posts/${postId}/interaction`, action),
    onSuccess: refreshPosts
  });

  const reviewMutation = useMutation({
    mutationFn: ({ postId, message }) => api.put(`/revision/posts/${postId}/review`, { message }),
    onSuccess: (_, variables) => {
      setReviewDrafts(current => ({ ...current, [variables.postId]: '' }));
      refreshPosts();
    }
  });

  const filteredPosts = useMemo(() => posts.filter(post => {
    if (tab === 'saved' && !post.interaction?.saved) return false;
    if (tab === 'priority' && !post.interaction?.priority) return false;
    const query = search.trim().toLowerCase();
    return !query || `${post.title} ${post.content} ${post.subject.name}`.toLowerCase().includes(query);
  }), [posts, search, tab]);

  const updateAction = (post, patch) => actionMutation.mutate({ postId: post.id, action: patch });

  return (
    <AppShell title={isTeacher ? 'Revision Studio' : 'Revision Feed'}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-800">
              <Clapperboard className="h-4 w-4" /> {isTeacher ? 'Teaching resources' : 'Quick revision'}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{isTeacher ? 'Revision Studio' : 'Revision Feed'}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isTeacher ? 'Share short notes and media with your classes.' : 'Browse class notes, revisit key ideas, and tell your teacher what would help.'}
            </p>
          </div>
          {isTeacher && <Button onClick={() => { setDraft({ subjectId: subjects[0]?.id || '', title: '', content: '' }); setShowComposer(true); }} disabled={!subjects.length}>
            <Plus className="mr-1.5 h-4 w-4" /> Share a revision post
          </Button>}
        </header>
        {statusMessage && <p role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{statusMessage}</p>}

        <div className="mb-6 grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[minmax(150px,0.8fr)_minmax(180px,1fr)_minmax(180px,1fr)]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input aria-label="Search revision posts" className={`${inputClass} pl-9`} value={search} onChange={event => setSearch(event.target.value)} />
          </label>
          <select aria-label="Filter by classroom" className={inputClass} value={classroomId} onChange={event => { setClassroomId(event.target.value); setSubjectId(''); }}>
            <option value="">All classrooms</option>
            {classrooms.map(classroom => <option key={classroom.id} value={classroom.id}>{classroom.name} · {classroom.section}</option>)}
          </select>
          <select aria-label="Filter by subject" className={inputClass} value={subjectId} onChange={event => setSubjectId(event.target.value)}>
            <option value="">All subjects</option>
            {visibleSubjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </div>

        {!isTeacher && <div className="mb-5 flex border-b border-slate-200">
          {[['all', 'All posts'], ['saved', 'Saved'], ['priority', 'Priority']].map(([value, label]) => (
            <button key={value} onClick={() => setTab(value)} className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === value ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {label}
            </button>
          ))}
        </div>}

        {(loadingSubjects || loadingPosts) && <div className="flex justify-center py-16"><Spinner /></div>}
        {isError && <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">Could not load revision posts. Please refresh and try again.</p>}

        {!loadingSubjects && !loadingPosts && !isError && filteredPosts.length === 0 && (
          <EmptyState
            icon={isTeacher ? FileText : Clapperboard}
            title={tab === 'saved' ? 'Nothing saved yet' : tab === 'priority' ? 'No priority posts' : isTeacher ? 'No revision posts yet' : 'Your feed is ready'}
            description={isTeacher ? 'Choose a subject and share your first revision note or media post.' : 'New revision posts from your teachers will appear here.'}
            action={isTeacher && subjects.length > 0 ? <Button onClick={() => { setDraft({ subjectId: subjects[0].id, title: '', content: '' }); setShowComposer(true); }}><Plus className="mr-1.5 h-4 w-4" /> Create a post</Button> : null}
          />
        )}

        <div className="space-y-5">
          {filteredPosts.map(post => <article key={post.id} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {post.mediaUrl && <div className="relative bg-slate-950">
              <RevisionMedia post={post} />
              {post.mediaType === 'VIDEO' && <span className="absolute left-3 top-3 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white"><Play className="h-3 w-3" /> Video</span>}
            </div>}
            <div className="p-5 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-teal-800">{post.subject.classroom.name} · {post.subject.classroom.section}</span>
                <span aria-hidden="true">/</span><span>{post.subject.name}</span>
                <span aria-hidden="true">/</span><span>{new Date(post.createdAt).toLocaleDateString()}</span>
                {isTeacher && <span className="ml-auto text-slate-400">Shared by {post.createdBy.name}</span>}
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{post.title}</h2>
              {post.content && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{post.content}</p>}

              {!isTeacher && <>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <button onClick={() => updateAction(post, { liked: !post.interaction?.liked })} className={`${actionClass} ${post.interaction?.liked ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'}`} aria-pressed={!!post.interaction?.liked}>
                    <Heart className={`h-4 w-4 ${post.interaction?.liked ? 'fill-current' : ''}`} /> {post.likes} {post.likes === 1 ? 'like' : 'likes'}
                  </button>
                  <button onClick={() => updateAction(post, { saved: !post.interaction?.saved })} className={`${actionClass} ${post.interaction?.saved ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-800'}`} aria-pressed={!!post.interaction?.saved}>
                    <Bookmark className={`h-4 w-4 ${post.interaction?.saved ? 'fill-current' : ''}`} /> {post.interaction?.saved ? 'Saved' : 'Save'}
                  </button>
                  <button onClick={() => updateAction(post, { priority: !post.interaction?.priority })} className={`${actionClass} ${post.interaction?.priority ? 'bg-orange-50 text-orange-800' : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-800'}`} aria-pressed={!!post.interaction?.priority}>
                    <Flag className={`h-4 w-4 ${post.interaction?.priority ? 'fill-current' : ''}`} /> {post.interaction?.priority ? 'Priority' : 'Mark priority'}
                  </button>
                  <label className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Check className="h-4 w-4 text-teal-700" /> How are you feeling?
                    <select aria-label="Understanding status" className="max-w-36 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs" value={post.interaction?.understanding || ''} onChange={event => updateAction(post, { understanding: event.target.value || null })}>
                      <option value="">Choose</option><option value="GOT_IT">Got it</option><option value="REVIEW_AGAIN">Revisit</option><option value="CONFUSED">I'm stuck</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 rounded-md bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><MessageSquareText className="h-4 w-4 text-teal-800" /> Leave private feedback</div>
                  <p className="mb-3 text-xs text-slate-500">Only your teacher can see this. Your name is never shown.</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <textarea aria-label="Private feedback" className={`${inputClass} min-h-20 flex-1 resize-y`} maxLength={1000} value={reviewDrafts[post.id] ?? post.review?.message ?? ''} onChange={event => setReviewDrafts(current => ({ ...current, [post.id]: event.target.value }))} />
                    <Button className="self-end sm:self-start" disabled={!(reviewDrafts[post.id] ?? post.review?.message ?? '').trim()} loading={reviewMutation.isPending && reviewMutation.variables?.postId === post.id} onClick={() => reviewMutation.mutate({ postId: post.id, message: (reviewDrafts[post.id] ?? post.review?.message ?? '').trim() })}>
                      <Send className="mr-1.5 h-4 w-4" /> {post.review ? 'Update feedback' : 'Send feedback'}
                    </Button>
                  </div>
                  {reviewMutation.isError && reviewMutation.variables?.postId === post.id && <p role="alert" className="mt-2 text-xs text-red-700">{errorMessage(reviewMutation.error)}</p>}
                </div>
              </>}

              {isTeacher && <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><MessageSquareText className="h-4 w-4 text-teal-800" /> Student feedback <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{post.reviews.length}</span></div>
                {post.reviews.length ? <div className="space-y-2">
                  {post.reviews.map((review, index) => <div key={`${post.id}-${index}`} className="rounded-md border-l-2 border-teal-700 bg-slate-50 px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{review.message}</p>
                    <p className="mt-2 text-[11px] text-slate-400">Anonymous · {new Date(review.updatedAt).toLocaleDateString()}</p>
                  </div>)}
                </div> : <p className="text-sm text-slate-500">No feedback yet.</p>}
              </div>}
            </div>
          </article>)}
        </div>
      </div>

      <Modal isOpen={showComposer} onClose={() => { setShowComposer(false); setFormError(''); }} title="Share a revision post">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Class and subject
            <select className={`${inputClass} mt-1.5`} value={draft.subjectId} onChange={event => setDraft(current => ({ ...current, subjectId: event.target.value }))}>
              <option value="">Choose a subject</option>
              {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.classroom.name} · {subject.classroom.section} / {subject.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Title
            <input className={`${inputClass} mt-1.5`} maxLength={120} value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="block text-sm font-medium text-slate-700">Notes
            <textarea className={`${inputClass} mt-1.5 min-h-32 resize-y`} maxLength={10000} value={draft.content} onChange={event => setDraft(current => ({ ...current, content: event.target.value }))} />
          </label>
          <label className="block text-sm font-medium text-slate-700">Photo or video <span className="font-normal text-slate-400">(optional, up to 75 MB)</span>
            <span className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 hover:border-teal-700">
              {media?.type.startsWith('video/') ? <Video className="h-5 w-5 text-teal-800" /> : <Image className="h-5 w-5 text-teal-800" />}
              <span className="min-w-0 flex-1 truncate">{media ? media.name : 'Choose an image or video'}</span>
              <Upload className="h-4 w-4 shrink-0 text-slate-400" />
              <input className="sr-only" type="file" accept="image/*,video/*" onChange={async event => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setFormError('');
                if (file.size > 75 * 1024 * 1024) {
                  setFormError('Choose a file smaller than 75 MB.');
                  return;
                }
                try {
                  setMedia(await compressImage(file));
                } catch (error) {
                  setFormError(error.message || 'Could not prepare this image for upload.');
                }
              }} />
            </span>
          </label>
          {media && <button onClick={() => setMedia(null)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-700"><X className="h-3.5 w-3.5" /> Remove media</button>}
          <p className="text-xs text-slate-500">Your post is shared only with students enrolled in this classroom.</p>
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setShowComposer(false); setFormError(''); }}>Cancel</Button>
          <Button loading={publishMutation.isPending} disabled={!draft.subjectId || !draft.title.trim() || (!draft.content.trim() && !media)} onClick={() => publishMutation.mutate()}>
            <Plus className="mr-1.5 h-4 w-4" /> Publish post
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
};