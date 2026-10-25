const express = require('express');
const prisma = require('../lib/store');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// TEACHER: Quiz analytics summary
router.get('/quiz/:quizId/summary', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { quizId } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        subject: { include: { classroom: true } },
        quizQuestions: { include: { question: true } }
      }
    });

    if (!quiz || quiz.subject.classroom.teacherId !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized for this quiz');
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        student: { select: { id: true, name: true, email: true } },
        studentAnswers: true
      }
    });

    // Leaderboard
    const leaderboard = attempts.map(a => ({
      studentId: a.student.id,
      studentName: a.student.name,
      score: a.score,
      totalScore: a.totalScore,
      percentage: a.totalScore > 0 ? Math.round((a.score / a.totalScore) * 100) : 0,
      timeSpentSeconds: a.timeSpentSeconds,
      submittedAt: a.submittedAt
    })).sort((a, b) => b.score - a.score || (a.timeSpentSeconds || 0) - (b.timeSpentSeconds || 0));

    // Per-question accuracy map
    const perQuestionMap = {};
    quiz.quizQuestions.forEach(qq => {
      perQuestionMap[qq.questionId] = {
        questionId: qq.questionId,
        questionText: qq.question.questionText,
        topic: qq.question.topic,
        difficulty: qq.question.difficulty,
        correctCount: 0,
        totalAttempts: 0,
        accuracyPercent: 0
      };
    });

    // Student matrix (gradebook rows)
    const studentMatrix = attempts.map(a => {
      const answers = [];
      a.studentAnswers.forEach(ans => {
        if (perQuestionMap[ans.questionId]) {
          perQuestionMap[ans.questionId].totalAttempts++;
          if (ans.isCorrect) perQuestionMap[ans.questionId].correctCount++;
        }
        answers.push({
          questionId: ans.questionId,
          selectedOption: ans.selectedOption,
          isCorrect: ans.isCorrect
        });
      });
      return {
        studentId: a.student.id,
        studentName: a.student.name,
        score: a.score,
        totalScore: a.totalScore,
        percentage: a.totalScore > 0 ? Math.round((a.score / a.totalScore) * 100) : 0,
        answers
      };
    });

    const perQuestion = Object.values(perQuestionMap).map(pq => ({
      ...pq,
      accuracyPercent: pq.totalAttempts > 0 ? Math.round((pq.correctCount / pq.totalAttempts) * 100) : 0
    }));

    const studentsAttempted = attempts.length;
    const classAverage = studentsAttempted > 0
      ? Math.round(leaderboard.reduce((s, l) => s + l.percentage, 0) / studentsAttempted)
      : 0;
    const highestScore = leaderboard.length > 0 ? leaderboard[0].percentage : 0;

    res.json({
      quizId,
      quizTitle: quiz.title,
      subjectName: quiz.subject.name,
      studentsAttempted,
      classAverage,
      highestScore,
      leaderboard,
      perQuestion,
      studentMatrix
    });
  } catch (error) {
    next(error);
  }
});

// STUDENT: Question tracker — returns stats + filtered questions
router.get('/tracker', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const { subjectId, topic, difficulty, result } = req.query;

    // Build nested filter carefully
    let questionFilter = {};
    if (subjectId) questionFilter.subjectId = subjectId;
    if (topic) questionFilter.topic = { contains: topic };
    if (difficulty && difficulty !== 'All') questionFilter.difficulty = difficulty.toUpperCase();

    const where = {
      studentId: req.user.id,
      ...(Object.keys(questionFilter).length > 0 ? { question: questionFilter } : {})
    };
    if (result === 'correct') where.isCorrect = true;
    if (result === 'incorrect') where.isCorrect = false;

    const answers = await prisma.studentQuestionAnswer.findMany({
      where,
      include: {
        question: {
          include: { subject: true }
        },
        attempt: { select: { submittedAt: true } }
      },
      orderBy: { attempt: { submittedAt: 'desc' } }
    });

    // Deduplicate — keep latest answer per question
    const map = new Map();
    answers.forEach(a => {
      if (!map.has(a.questionId)) {
        map.set(a.questionId, {
          questionId: a.questionId,
          questionText: a.question.questionText,
          topic: a.question.topic,
          difficulty: a.question.difficulty,
          subjectName: a.question.subject.name,
          subjectId: a.question.subjectId,
          lastAttemptDate: a.attempt.submittedAt,
          isCorrect: a.isCorrect,
          explanation: a.question.explanation,
          selectedOption: a.selectedOption
        });
      }
    });

    const questions = Array.from(map.values());

    // Compute stats from the full (unfiltered) set for this student
    const allAnswers = await prisma.studentQuestionAnswer.findMany({
      where: { studentId: req.user.id },
      orderBy: { attempt: { submittedAt: 'desc' } }
    });
    const allMap = new Map();
    allAnswers.forEach(a => {
      if (!allMap.has(a.questionId)) allMap.set(a.questionId, a.isCorrect);
    });
    const total = allMap.size;
    const correct = Array.from(allMap.values()).filter(Boolean).length;
    const incorrect = total - correct;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    res.json({
      stats: { total, correct, incorrect, accuracy },
      questions
    });
  } catch (error) {
    next(error);
  }
});

// STUDENT: Subject performance trend (returns quiz attempt history + subject info)
router.get('/subject/:subjectId/trend', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const { subjectId } = req.params;

    // Get subject info
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { classroom: true }
    });

    if (!subject) {
      res.status(404);
      throw new Error('Subject not found');
    }

    // Verify student is enrolled
    const enrollment = await prisma.classEnrollment.findUnique({
      where: {
        classroomId_studentId: {
          classroomId: subject.classroomId,
          studentId: req.user.id
        }
      }
    });
    if (!enrollment) {
      res.status(403);
      throw new Error('Not enrolled in this classroom');
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        studentId: req.user.id,
        quiz: { subjectId }
      },
      include: { quiz: true },
      orderBy: { submittedAt: 'asc' }
    });

    const history = attempts.map(a => ({
      attemptId: a.id,
      quizTitle: a.quiz.title,
      score: a.score,
      totalScore: a.totalScore,
      percentage: a.totalScore > 0 ? Math.round((a.score / a.totalScore) * 100) : 0,
      submittedAt: a.submittedAt
    }));

    const trend = history.map(h => h.percentage);
    const avgScore = history.length > 0
      ? Math.round(history.reduce((s, h) => s + h.percentage, 0) / history.length)
      : 0;
    const bestScore = history.length > 0 ? Math.max(...history.map(h => h.percentage)) : 0;

    res.json({
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      classroomName: `${subject.classroom.name} — ${subject.classroom.section}`,
      stats: {
        quizzes: history.length,
        avgScore,
        bestScore
      },
      history,
      trend
    });
  } catch (error) {
    next(error);
  }
});

// TEACHER: Dashboard stats
router.get('/dashboard/teacher', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: req.user.id },
      include: {
        enrollments: true,
        subjects: {
          include: { quizzes: { include: { quizAttempts: true } } }
        }
      }
    });

    const classroomCount = classrooms.length;
    const studentSet = new Set();
    let quizCount = 0;
    let totalScore = 0;
    let totalMaxScore = 0;

    classrooms.forEach(c => {
      c.enrollments.forEach(e => studentSet.add(e.studentId));
      c.subjects.forEach(s => {
        quizCount += s.quizzes.length;
        s.quizzes.forEach(q => {
          q.quizAttempts.forEach(a => {
            totalScore += a.score;
            totalMaxScore += a.totalScore;
          });
        });
      });
    });

    const avgScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    res.json({
      classroomCount,
      studentCount: studentSet.size,
      quizCount,
      avgScore
    });
  } catch (error) {
    next(error);
  }
});

// STUDENT: Dashboard stats
router.get('/dashboard/student', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: { studentId: req.user.id }
    });

    const quizzesTaken = attempts.length;
    let totalScore = 0;
    let totalMaxScore = 0;

    attempts.forEach(a => {
      totalScore += a.score;
      totalMaxScore += a.totalScore;
    });

    const avgScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    const enrollments = await prisma.classEnrollment.findMany({
      where: { studentId: req.user.id },
      select: { classroomId: true }
    });
    const classroomIds = enrollments.map(e => e.classroomId);

    const assignments = await prisma.assignment.findMany({
      where: {
        OR: [
          { classroomId: { in: classroomIds }, assignedToStudentId: null },
          { assignedToStudentId: req.user.id }
        ]
      },
      include: { quizAttempts: { where: { studentId: req.user.id } } }
    });

    const pendingCount = assignments.filter(a => a.quizAttempts.length === 0).length;

    res.json({
      quizzesTaken,
      avgScore,
      pendingCount
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
