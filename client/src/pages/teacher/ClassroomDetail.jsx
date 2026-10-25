import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { AppShell } from '../../components/layout/AppShell';
import {
  Button, Card, Badge, Spinner, Table, TableHead, TableBody,
  TableRow, TableHeaderCell, TableCell, Modal, EmptyState
} from '../../components/ui';
import { Users, BookOpen, Clipboard, Trash2, Plus, Check, BarChart2, UserCheck } from 'lucide-react';

const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const inputCls = 'w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent';

export const ClassroomDetail = () => {
  const { classroomId } = useParams();
  const [activeTab, setActiveTab] = useState('roster');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ quizId: '', scope: 'class', studentId: '', dueDate: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' });
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();

  // Classroom + roster
  const { data: classroom, isLoading: classLoading } = useQuery({
    queryKey: ['classroom', classroomId],
    queryFn: async () => {
      const { data } = await api.get(`/classrooms/${classroomId}`);
      return data;
    }
  });

  // Subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects', classroomId],
    queryFn: async () => {
      const { data } = await api.get(`/subjects/classroom/${classroomId}`);
      return data;
    },
    enabled: activeTab === 'subjects' || activeTab === 'assignments'
  });

  // Assignments
  const { data: assignments, isLoading: assignLoading } = useQuery({
    queryKey: ['assignments', classroomId],
    queryFn: async () => {
      const { data } = await api.get(`/assignments/classroom/${classroomId}`);
      return data;
    },
    enabled: activeTab === 'assignments'
  });

  // Quizzes for assignment modal
  const { data: quizzes } = useQuery({
    queryKey: ['quizzes-classroom', classroomId],
    queryFn: async () => {
      const { data } = await api.get(`/quizzes/classroom/${classroomId}`);
      return data;
    },
    enabled: isAssignModalOpen
  });

  // Mutations
  const removeStudent = useMutation({
    mutationFn: (studentId) => api.delete(`/classrooms/${classroomId}/students/${studentId}`),
    onSuccess: () => queryClient.invalidateQueries(['classroom', classroomId])
  });

  const addSubject = useMutation({
    mutationFn: (data) => api.post(`/subjects/classroom/${classroomId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['subjects', classroomId]);
      setSubjectForm({ name: '', code: '' });
    }
  });

  const createAssignment = useMutation({
    mutationFn: (data) => api.post('/assignments', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assignments', classroomId]);
      setIsAssignModalOpen(false);
      setAssignForm({ quizId: '', scope: 'class', studentId: '', dueDate: '' });
    }
  });

  const deleteAssignment = useMutation({
    mutationFn: (id) => api.delete(`/assignments/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['assignments', classroomId])
  });

  const copyJoinCode = () => {
    navigator.clipboard.writeText(classroom.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAssign = () => {
    if (!assignForm.quizId || !assignForm.dueDate) return;
    createAssignment.mutate({
      quizId: assignForm.quizId,
      classroomId,
      assignedToStudentId: assignForm.scope === 'individual' ? assignForm.studentId : null,
      dueDate: assignForm.dueDate
    });
  };

  // Derive student list from enrollments
  const students = classroom?.enrollments?.map(e => ({ ...e.student, enrolledAt: e.enrolledAt })) || [];

  if (classLoading) return <AppShell title="Classroom"><div className="flex justify-center mt-20"><Spinner /></div></AppShell>;
  if (!classroom) return <AppShell title="Not Found"><p className="text-slate-500 mt-8 text-center">Classroom not found.</p></AppShell>;

  const tabs = [
    { key: 'roster', label: 'Roster', icon: Users },
    { key: 'subjects', label: 'Subjects', icon: BookOpen },
    { key: 'assignments', label: 'Assignments', icon: BarChart2 },
  ];

  return (
    <AppShell title={`${classroom.name} — ${classroom.section}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">{classroom.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">Section {classroom.section} · {students.length} student{students.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={copyJoinCode}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg text-sm font-medium text-[#0f172a] transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Clipboard className="w-4 h-4 text-slate-400" />}
          Join Code: <span className="font-mono font-bold text-[#4338ca]">{classroom.joinCode}</span>
          {copied && <span className="text-xs text-emerald-600">Copied!</span>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#e2e8f0] mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-[#4338ca] text-[#4338ca]'
                : 'border-transparent text-slate-500 hover:text-[#0f172a]'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ROSTER TAB */}
      {activeTab === 'roster' && (
        <Card title="Student Roster">
          {students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students enrolled yet"
              description={`Share the join code "${classroom.joinCode}" for students to enroll.`}
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Student</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Enrolled</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-[#4338ca]">
                          {s.name?.charAt(0).toUpperCase()}
                        </div>
                        {s.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500"><a href={`mailto:${s.email}`} className="hover:text-[#4338ca]">{s.email}</a></TableCell>
                    <TableCell className="text-slate-400 text-xs">{formatDate(s.enrolledAt)}</TableCell>
                    <TableCell>
                      <button
                        className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                        onClick={() => {
                          if (window.confirm(`Remove ${s.name} from this classroom?`)) {
                            removeStudent.mutate(s.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* SUBJECTS TAB */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          <Card title="Subjects">
            {subjectsLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : subjects?.length === 0 ? (
              <EmptyState icon={BookOpen} title="No subjects yet" description="Add a subject to this classroom below." />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Subject Name</TableHeaderCell>
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>Questions</TableHeaderCell>
                    <TableHeaderCell>Quizzes</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subjects?.map(sub => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell><Badge variant="info">{sub.code}</Badge></TableCell>
                      <TableCell className="text-slate-500">{sub._count?.questions ?? 0}</TableCell>
                      <TableCell className="text-slate-500">{sub._count?.quizzes ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Add Subject form */}
          <Card title="Add New Subject">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Subject Name</label>
                <input
                  type="text"
                  className={inputCls}
                  value={subjectForm.name}
                  onChange={e => setSubjectForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="w-40">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Code</label>
                <input
                  type="text"
                  className={inputCls}
                  value={subjectForm.code}
                  onChange={e => setSubjectForm(f => ({ ...f, code: e.target.value }))}
                />
              </div>
              <Button
                onClick={() => addSubject.mutate(subjectForm)}
                loading={addSubject.isPending}
                disabled={!subjectForm.name || !subjectForm.code}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Subject
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ASSIGNMENTS TAB */}
      {activeTab === 'assignments' && (
        <Card
          title="Assignments"
          action={
            <Button onClick={() => setIsAssignModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Assign Quiz
            </Button>
          }
        >
          {assignLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : assignments?.length === 0 ? (
            <EmptyState icon={BarChart2} title="No assignments yet" description="Assign a quiz to the entire class or individual students." />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Quiz</TableHeaderCell>
                  <TableHeaderCell>Assigned To</TableHeaderCell>
                  <TableHeaderCell>Due Date</TableHeaderCell>
                  <TableHeaderCell>Submissions</TableHeaderCell>
                  <TableHeaderCell></TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments?.map(a => {
                  const isOverdue = new Date() > new Date(a.dueDate);
                  const submissionCount = a.quizAttempts?.length ?? 0;
                  const totalTarget = a.assignedToStudentId ? 1 : students.length;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{a.quiz?.title}</p>
                          <p className="text-xs text-slate-400">{a.quiz?.subject?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.assignedToStudent ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-[#4338ca]" />
                            <span className="text-sm">{a.assignedToStudent.name}</span>
                          </div>
                        ) : (
                          <Badge variant="default">Entire Class</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isOverdue ? 'danger' : 'warning'}>
                          {formatDate(a.dueDate)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${submissionCount >= totalTarget ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {submissionCount} / {totalTarget}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/teacher/analytics/${a.quizId}`}
                            className="text-xs text-[#4338ca] hover:underline font-medium"
                          >
                            Analytics
                          </Link>
                          <button
                            className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                            onClick={() => {
                              if (window.confirm('Delete this assignment?')) {
                                deleteAssignment.mutate(a.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Assign Quiz Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Quiz">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Select Quiz</label>
            <select
              className={inputCls}
              value={assignForm.quizId}
              onChange={e => setAssignForm(f => ({ ...f, quizId: e.target.value }))}
            >
              <option value="">-- Choose a Quiz --</option>
              {quizzes?.map(q => (
                <option key={q.id} value={q.id}>{q.title} ({q.subject?.name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Assign To</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={assignForm.scope === 'class'}
                  onChange={() => setAssignForm(f => ({ ...f, scope: 'class', studentId: '' }))}
                  className="accent-[#4338ca]"
                />
                <span className="text-sm">Entire Class</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={assignForm.scope === 'individual'}
                  onChange={() => setAssignForm(f => ({ ...f, scope: 'individual' }))}
                  className="accent-[#4338ca]"
                />
                <span className="text-sm">Individual Student</span>
              </label>
            </div>
          </div>

          {assignForm.scope === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Select Student</label>
              <select
                className={inputCls}
                value={assignForm.studentId}
                onChange={e => setAssignForm(f => ({ ...f, studentId: e.target.value }))}
              >
                <option value="">-- Choose Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Due Date</label>
            <input
              type="datetime-local"
              className={inputCls}
              value={assignForm.dueDate}
              onChange={e => setAssignForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAssign}
            loading={createAssignment.isPending}
            disabled={!assignForm.quizId || !assignForm.dueDate || (assignForm.scope === 'individual' && !assignForm.studentId)}
          >
            Assign Quiz
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
};
