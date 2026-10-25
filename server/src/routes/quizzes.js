const express = require('express');
const prisma = require('../lib/store');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// List quizzes for subject (TEACHER)
router.get('/subject/:subjectId', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { subjectId } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { classroom: true }
    });
    if (!subject || subject.classroom.teacherId !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized for this subject');
    }

    const quizzes = await prisma.quiz.findMany({
      where: { subjectId },
      include: { _count: { select: { quizQuestions: true, quizAttempts: true } } }
    });
    res.json(quizzes);
  } catch (error) {
    next(error);
  }
});

// TEACHER: List quizzes for a classroom (across all its subjects) — used by assignment modal
router.get('/classroom/:classroomId', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { classroomId } = req.params;

    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, teacherId: req.user.id }
    });
    if (!classroom) {
      res.status(403);
      throw new Error('Not authorized for this classroom');
    }

    const subjects = await prisma.subject.findMany({ where: { classroomId } });
    const subjectIds = subjects.map(s => s.id);

    const quizzes = await prisma.quiz.findMany({
      where: { subjectId: { in: subjectIds } },
      include: {
        subject: true,
        _count: { select: { quizQuestions: true } }
      }
    });
    res.json(quizzes);
  } catch (error) {
    next(error);
  }
});

// Get quiz detail with questions (TEACHER | STUDENT)
router.get('/:id', async (req, res, next) => {
  try {
    const quizId = req.params.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        subject: { include: { classroom: true } },
        quizQuestions: {
          include: { question: true }
        }
      }
    });

    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    // Access control
    if (req.user.role === 'TEACHER') {
      if (quiz.subject.classroom.teacherId !== req.user.id) {
        res.status(403);
        throw new Error('Not authorized for this quiz');
      }
    } else {
      const enrollment = await prisma.classEnrollment.findUnique({
        where: {
          classroomId_studentId: {
            classroomId: quiz.subject.classroomId,
            studentId: req.user.id
          }
        }
      });
      if (!enrollment) {
        res.status(403);
        throw new Error('Not enrolled in the classroom for this quiz');
      }
    }

    // Format questions and options
    // Options may be stored as an array (legacy seed) or as an {A,B,C,D} object (teacher-created).
    // Always normalise to {A,B,C,D} so the quiz player can render option cards correctly.
    const KEYS = ['A', 'B', 'C', 'D'];

    const formattedQuiz = {
      ...quiz,
      questions: quiz.quizQuestions.map(qq => {
        const rawOptions = JSON.parse(qq.question.options);
        let optionsObj;
        let correctOption = qq.question.correctOption;

        if (Array.isArray(rawOptions)) {
          // Legacy array format — convert to {A,B,C,D}
          optionsObj = {};
          KEYS.forEach((k, i) => {
            if (rawOptions[i] !== undefined) optionsObj[k] = rawOptions[i];
          });
          // If correctOption is stored as the answer text, map it back to the key letter
          const textIdx = rawOptions.indexOf(correctOption);
          if (textIdx !== -1) correctOption = KEYS[textIdx];
        } else {
          // Already an object
          optionsObj = rawOptions;
        }

        return {
          ...qq.question,
          options: optionsObj,
          correctOption,
          marks: qq.marks
        };
      })
    };
    delete formattedQuiz.quizQuestions;

    // Hide correctOption and explanation from students during quiz
    if (req.user.role === 'STUDENT') {
      formattedQuiz.questions.forEach(q => {
        delete q.correctOption;
        delete q.explanation;
      });
    }

    res.json(formattedQuiz);
  } catch (error) {
    next(error);
  }
});

// Create quiz (TEACHER) — supports customQuestion objects that get created first
router.post('/', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { subjectId, title, description, timeLimitMinutes, totalMarks, questions } = req.body;

    if (!subjectId || !title || !questions || !Array.isArray(questions)) {
      res.status(400);
      throw new Error('Missing required fields');
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { classroom: true }
    });
    if (!subject || subject.classroom.teacherId !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized for this subject');
    }

    // For any customQuestion entries, create the question first and get its real ID
    const resolvedQuestions = [];
    for (const q of questions) {
      if (q.customQuestion) {
        const cq = q.customQuestion;
        const created = await prisma.question.create({
          data: {
            subjectId,
            topic: cq.topic || 'General',
            questionText: cq.text || cq.questionText,
            options: JSON.stringify(cq.options),
            correctOption: cq.correctOption,
            explanation: cq.explanation || '',
            difficulty: (cq.difficulty || 'MEDIUM').toUpperCase()
          }
        });
        resolvedQuestions.push({ questionId: created.id, marks: q.marks || 1 });
      } else {
        resolvedQuestions.push({ questionId: q.questionId, marks: q.marks || 1 });
      }
    }

    const quiz = await prisma.quiz.create({
      data: {
        subjectId,
        title,
        description,
        timeLimitMinutes: timeLimitMinutes || 30,
        totalMarks: totalMarks || resolvedQuestions.reduce((sum, q) => sum + q.marks, 0),
        createdById: req.user.id,
        quizQuestions: {
          create: resolvedQuestions
        }
      },
      include: { quizQuestions: true }
    });

    res.status(201).json(quiz);
  } catch (error) {
    next(error);
  }
});

// Update quiz metadata (TEACHER)
router.put('/:id', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const { title, description, timeLimitMinutes, totalMarks } = req.body;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { subject: { include: { classroom: true } } }
    });
    if (!quiz || quiz.subject.classroom.teacherId !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized for this quiz');
    }

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: { title, description, timeLimitMinutes, totalMarks }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete quiz (TEACHER)
router.delete('/:id', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const quizId = req.params.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { subject: { include: { classroom: true } } }
    });
    if (!quiz || quiz.subject.classroom.teacherId !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized for this quiz');
    }

    await prisma.quiz.delete({ where: { id: quizId } });
    res.json({ message: 'Quiz deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
