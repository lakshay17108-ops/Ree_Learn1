import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { AppShell } from '../../components/layout/AppShell';
import { Button, Card, Badge, Spinner, EmptyState } from '../../components/ui';
import { BookOpen, Plus, Trash2, ChevronRight } from 'lucide-react';

const inputCls = 'w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent';

const DIFFICULTY_COLORS = { EASY: 'success', MEDIUM: 'warning', HARD: 'danger' };

export const QuizBuilder = () => {
  const [step, setStep] = useState(1);
  const [quizInfo, setQuizInfo] = useState({
    title: '',
    description: '',
    subjectId: '',
    timeLimitMinutes: 30,
    totalMarks: 10
  });
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newQ, setNewQ] = useState({
    topic: '',
    questionText: '',
    options: { A: '', B: '', C: '', D: '' },
    correctOption: 'A',
    explanation: '',
    difficulty: 'MEDIUM'
  });
  const [creating, setCreating] = useState(false);
  const [questionFeedback, setQuestionFeedback] = useState('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch all teacher's subjects across classrooms
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: async () => {
      const { data } = await api.get('/subjects');
      return data;
    }
  });

  // Fetch question bank for selected subject
  const { data: questionBank, isLoading: bankLoading } = useQuery({
    queryKey: ['question-bank', quizInfo.subjectId],
    queryFn: async () => {
      const { data } = await api.get(`/questions/subject/${quizInfo.subjectId}`);
      return data;
    },
    enabled: !!quizInfo.subjectId && step === 2
  });

  const publishMutation = useMutation({
    mutationFn: (quizData) => api.post('/quizzes', quizData),
    onSuccess: () => navigate('/teacher/dashboard')
  });

  const addFromBank = (q) => {
    if (!selectedQuestions.find(sq => sq.id === q.id)) {
      setSelectedQuestions(prev => [...prev, { ...q, marks: 1 }]);
    }
  };

  const removeQuestion = (id) => {
    setSelectedQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleCreateAndAdd = async () => {
    if (!newQ.topic || !newQ.questionText || !newQ.explanation) return;
    setQuestionFeedback('');
    const allOptionsFilled = ['A', 'B', 'C', 'D'].every(k => newQ.options[k]?.trim());
    if (!allOptionsFilled) {
      setQuestionFeedback('Fill in all four answer options before saving.');
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post(`/questions/subject/${quizInfo.subjectId}`, {
        topic: newQ.topic,
        questionText: newQ.questionText,
        options: newQ.options,
        correctOption: newQ.correctOption,
        explanation: newQ.explanation,
        difficulty: newQ.difficulty
      });
      setSelectedQuestions(prev => [...prev, { ...data, marks: 1 }]);
      setQuestionFeedback('Question created and added to the quiz.');
      // Refresh the question bank so the new question appears
      queryClient.invalidateQueries({ queryKey: ['question-bank', quizInfo.subjectId] });
      setShowCreateForm(false);
      setNewQ({ topic: '', questionText: '', options: { A: '', B: '', C: '', D: '' }, correctOption: 'A', explanation: '', difficulty: 'MEDIUM' });
    } catch (e) {
      setQuestionFeedback(e.response?.data?.error || e.message || 'Could not create this question.');
    }
    setCreating(false);
  };

  const handlePublish = () => {
    publishMutation.mutate({
      subjectId: quizInfo.subjectId,
      title: quizInfo.title,
      description: quizInfo.description,
      timeLimitMinutes: quizInfo.timeLimitMinutes,
      totalMarks: quizInfo.totalMarks,
      questions: selectedQuestions.map(q => ({ questionId: q.id, marks: q.marks }))
    });
  };

  const steps = ['Quiz Info', 'Add Questions', 'Review & Publish'];

  return (
    <AppShell title="Quiz Builder">
      {questionFeedback && <p role={questionFeedback.includes('created and added') ? 'status' : 'alert'} className={`mb-4 rounded-lg border p-3 text-sm ${questionFeedback.includes('created and added') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{questionFeedback}</p>}
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((label, i) => {
          const s = i + 1;
          const active = step === s;
          const done = step > s;
          return (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-[#4338ca] text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {done ? '✓' : s}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${active ? 'text-[#0f172a]' : 'text-slate-400'}`}>{label}</span>
              </div>
              {s < steps.length && <div className="flex-1 h-px bg-slate-200 max-w-12" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* STEP 1: Quiz Info */}
      {step === 1 && (
        <Card className="max-w-2xl mx-auto" title="Quiz Details">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
            <div>
              <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Quiz Title *</label>
              <input required className={inputCls} value={quizInfo.title} onChange={e => setQuizInfo(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Description</label>
              <textarea className={inputCls} rows="2" value={quizInfo.description} onChange={e => setQuizInfo(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Subject *</label>
              {subjectsLoading ? <Spinner size="sm" /> : (
                <select required className={inputCls} value={quizInfo.subjectId} onChange={e => setQuizInfo(f => ({ ...f, subjectId: e.target.value }))}>
                  <option value="">-- Select Subject --</option>
                  {subjects?.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name} ({sub.classroomName} — {sub.classroomSection})</option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Time Limit (mins)</label>
                <input type="number" required min="1" className={inputCls} value={quizInfo.timeLimitMinutes} onChange={e => setQuizInfo(f => ({ ...f, timeLimitMinutes: parseInt(e.target.value) || 30 }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Total Marks</label>
                <input type="number" required min="1" className={inputCls} value={quizInfo.totalMarks} onChange={e => setQuizInfo(f => ({ ...f, totalMarks: parseInt(e.target.value) || 10 }))} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={!quizInfo.title || !quizInfo.subjectId}>
                Next: Add Questions →
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* STEP 2: Add Questions */}
      {step === 2 && (
        <div className="space-y-6">
          {!showCreateForm ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Question Bank */}
              <Card title="Question Bank" description={`Questions for this subject (${questionBank?.length ?? 0} available)`}>
                {bankLoading ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : (!questionBank || questionBank.length === 0) ? (
                  <EmptyState
                    icon={BookOpen}
                    title="No questions in bank"
                    description="Create a new question below to get started."
                  />
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {questionBank.map(q => {
                      const alreadyAdded = !!selectedQuestions.find(sq => sq.id === q.id);
                      return (
                        <div key={q.id} className={`p-3.5 border rounded-xl transition-all ${alreadyAdded ? 'border-emerald-200 bg-emerald-50' : 'border-[#e2e8f0] hover:border-[#4338ca]/40'}`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-medium text-[#0f172a] line-clamp-2">{q.questionText}</p>
                            <Badge variant={DIFFICULTY_COLORS[q.difficulty] || 'default'}>{q.difficulty}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{q.topic}</span>
                            {alreadyAdded ? (
                              <span className="text-xs font-medium text-emerald-600">✓ Added</span>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={() => addFromBank(q)}>+ Add</Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
                  <Button variant="ghost" onClick={() => setShowCreateForm(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Create New Question
                  </Button>
                </div>
              </Card>

              {/* Selected Questions */}
              <Card title={`Selected Questions (${selectedQuestions.length})`}>
                {selectedQuestions.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-4 text-center">No questions selected yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto">
                    {selectedQuestions.map((sq, i) => (
                      <div key={sq.id} className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 w-5 flex-shrink-0">{i + 1}.</span>
                        <p className="flex-1 text-sm text-[#0f172a] line-clamp-1">{sq.questionText}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              className="w-14 px-2 py-1 border border-[#e2e8f0] rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#4338ca]"
                              value={sq.marks}
                              onChange={e => {
                                const updated = [...selectedQuestions];
                                updated[i] = { ...updated[i], marks: parseInt(e.target.value) || 1 };
                                setSelectedQuestions(updated);
                              }}
                            />
                            <span className="text-xs text-slate-400">pt</span>
                          </div>
                          <button className="text-red-400 hover:text-red-600 p-1" onClick={() => removeQuestion(sq.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between mt-5 pt-4 border-t border-[#e2e8f0]">
                  <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                  <Button onClick={() => setStep(3)} disabled={selectedQuestions.length === 0}>
                    Review & Publish →
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            /* Create New Question Form */
            <Card className="max-w-2xl mx-auto" title="Create New Question">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Topic *</label>
                    <input className={inputCls} value={newQ.topic} onChange={e => setNewQ(f => ({ ...f, topic: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Difficulty</label>
                    <select className={inputCls} value={newQ.difficulty} onChange={e => setNewQ(f => ({ ...f, difficulty: e.target.value }))}>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Question Text *</label>
                  <textarea className={inputCls} rows="3" value={newQ.questionText} onChange={e => setNewQ(f => ({ ...f, questionText: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Options (select the correct answer)</label>
                  <div className="space-y-2">
                    {['A', 'B', 'C', 'D'].map(opt => (
                      <div key={opt} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${newQ.correctOption === opt ? 'border-emerald-400 bg-emerald-50' : 'border-[#e2e8f0]'}`}>
                        <input
                          type="radio"
                          name="correctOpt"
                          checked={newQ.correctOption === opt}
                          onChange={() => setNewQ(f => ({ ...f, correctOption: opt }))}
                          className="accent-emerald-500"
                        />
                        <span className="font-bold text-sm text-slate-500 w-5">{opt}.</span>
                        <input
                          className="flex-1 bg-transparent text-sm outline-none text-[#0f172a] placeholder-slate-400"
                          value={newQ.options[opt]}
                          onChange={e => setNewQ(f => ({ ...f, options: { ...f.options, [opt]: e.target.value } }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Explanation *</label>
                  <textarea className={inputCls} rows="2" value={newQ.explanation} onChange={e => setNewQ(f => ({ ...f, explanation: e.target.value }))} />
                </div>
                <div className="flex justify-between pt-2 border-t border-[#e2e8f0]">
                  <Button variant="secondary" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                  <Button
                    onClick={handleCreateAndAdd}
                    loading={creating}
                    disabled={!newQ.topic || !newQ.questionText || !newQ.explanation || !['A','B','C','D'].every(k => newQ.options[k]?.trim())}
                  >
                    Save & Add to Quiz
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* STEP 3: Review & Publish */}
      {step === 3 && (
        <Card className="max-w-3xl mx-auto" title="Review & Publish">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
            <div><p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Title</p><p className="font-semibold text-sm text-[#0f172a]">{quizInfo.title}</p></div>
            <div><p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Time Limit</p><p className="font-semibold text-sm text-[#0f172a]">{quizInfo.timeLimitMinutes} mins</p></div>
            <div><p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Marks</p><p className="font-semibold text-sm text-[#0f172a]">{quizInfo.totalMarks}</p></div>
            <div><p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Questions</p><p className="font-semibold text-sm text-[#0f172a]">{selectedQuestions.length}</p></div>
          </div>

          <h4 className="font-semibold text-[#0f172a] mb-3 text-sm uppercase tracking-wide">Questions</h4>
          <div className="space-y-2 mb-6">
            {selectedQuestions.map((q, i) => (
              <div key={q.id} className="flex items-center justify-between p-3 border border-[#e2e8f0] rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400">{i + 1}</span>
                  <p className="text-sm text-[#0f172a]">{q.questionText}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={DIFFICULTY_COLORS[q.difficulty] || 'default'}>{q.difficulty}</Badge>
                  <Badge variant="default">{q.marks} pt</Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-[#e2e8f0]">
            <Button variant="secondary" onClick={() => setStep(2)}>← Edit Questions</Button>
            <Button onClick={handlePublish} loading={publishMutation.isPending}>
              Publish Quiz
            </Button>
          </div>
          {publishMutation.isError && <p role="alert" className="mt-3 text-sm text-red-700">{publishMutation.error.response?.data?.error || 'Could not publish the quiz. Please try again.'}</p>}
        </Card>
      )}
    </AppShell>
  );
};
