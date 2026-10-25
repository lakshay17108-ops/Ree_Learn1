import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { AppShell } from '../../components/layout/AppShell';
import {
  Card, Badge, Spinner, Table, TableHead, TableBody,
  TableRow, TableHeaderCell, TableCell, EmptyState, Button
} from '../../components/ui';
import { CheckCircle2, XCircle, Filter, BookOpen } from 'lucide-react';

const inputCls = 'w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent';
const DIFF_COLORS = { EASY: 'success', MEDIUM: 'warning', HARD: 'danger' };

export const QuestionTracker = () => {
  const [filters, setFilters] = useState({ topic: '', difficulty: '', result: '' });
  const [appliedFilters, setAppliedFilters] = useState({ topic: '', difficulty: '', result: '' });
  const [expandedId, setExpandedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['question-tracker', appliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedFilters.topic) params.append('topic', appliedFilters.topic);
      if (appliedFilters.difficulty && appliedFilters.difficulty !== 'All') params.append('difficulty', appliedFilters.difficulty);
      if (appliedFilters.result && appliedFilters.result !== 'All') params.append('result', appliedFilters.result.toLowerCase());
      const { data } = await api.get(`/analytics/tracker?${params.toString()}`);
      return data;
    }
  });

  const applyFilters = () => setAppliedFilters({ ...filters });
  const clearFilters = () => {
    const empty = { topic: '', difficulty: '', result: '' };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  const questions = data?.questions || [];
  const stats = data?.stats || { total: 0, correct: 0, incorrect: 0, accuracy: 0 };

  if (isLoading) return (
    <AppShell title="Question Tracker">
      <div className="flex justify-center mt-20"><Spinner /></div>
    </AppShell>
  );

  return (
    <AppShell title="Question Tracker">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#0f172a]">{stats.total}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Total Seen</p>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{stats.correct}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Correct</p>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-500">{stats.incorrect}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Incorrect</p>
        </div>
        <div className="bg-[#4338ca] rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-white">{stats.accuracy}%</p>
          <p className="text-xs text-indigo-200 uppercase tracking-wide mt-1">Accuracy</p>
        </div>
      </div>

      {/* Accuracy bar */}
      {stats.total > 0 && (
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[#0f172a]">Overall Accuracy</p>
            <span className={`text-sm font-bold ${stats.accuracy >= 70 ? 'text-emerald-600' : stats.accuracy >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
              {stats.accuracy}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${stats.accuracy >= 70 ? 'bg-emerald-500' : stats.accuracy >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${stats.accuracy}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Topic</label>
            <input
              type="text"
              className={inputCls}
              value={filters.topic}
              onChange={e => setFilters(f => ({ ...f, topic: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Difficulty</label>
            <select className={inputCls} value={filters.difficulty} onChange={e => setFilters(f => ({ ...f, difficulty: e.target.value }))}>
              <option value="">All</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Result</label>
            <select className={inputCls} value={filters.result} onChange={e => setFilters(f => ({ ...f, result: e.target.value }))}>
              <option value="">All</option>
              <option value="correct">Correct</option>
              <option value="incorrect">Incorrect</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={applyFilters}>
              <Filter className="w-4 h-4 mr-1.5" /> Filter
            </Button>
            <Button variant="secondary" onClick={clearFilters}>Clear</Button>
          </div>
        </div>
      </Card>

      {/* Questions table */}
      {questions.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No questions found"
          description="Complete quizzes to start tracking your questions here."
        />
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Question</TableHeaderCell>
                <TableHeaderCell>Subject</TableHeaderCell>
                <TableHeaderCell>Topic</TableHeaderCell>
                <TableHeaderCell>Difficulty</TableHeaderCell>
                <TableHeaderCell>Last Attempt</TableHeaderCell>
                <TableHeaderCell>Result</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {questions.map((q) => (
                <React.Fragment key={q.questionId}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expandedId === q.questionId ? null : q.questionId)}
                  >
                    <TableCell className="max-w-xs">
                      <p className="font-medium text-[#0f172a] line-clamp-2">{q.questionText}</p>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">{q.subjectName}</TableCell>
                    <TableCell><Badge variant="default">{q.topic}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={DIFF_COLORS[q.difficulty] || 'default'}>{q.difficulty}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                      {new Date(q.lastAttemptDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      {q.isCorrect
                        ? <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-xs font-medium text-emerald-700">Correct</span></div>
                        : <div className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-red-400" /><span className="text-xs font-medium text-red-700">Incorrect</span></div>
                      }
                    </TableCell>
                  </TableRow>
                  {expandedId === q.questionId && (
                    <TableRow>
                      <TableCell colSpan={6} className="!py-0 !px-0 border-t-0">
                        <div className="bg-indigo-50 border-l-4 border-[#4338ca] px-6 py-4">
                          <p className="text-sm font-medium text-[#0f172a] mb-2">{q.questionText}</p>
                          <p className="text-xs font-bold text-[#4338ca] uppercase tracking-wide mb-1">Explanation</p>
                          <p className="text-sm text-indigo-900 leading-relaxed">{q.explanation || 'No explanation provided.'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </AppShell>
  );
};
