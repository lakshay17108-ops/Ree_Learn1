const express = require('express');
const prisma = require('../lib/store');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

const KEYS = ['A', 'B', 'C', 'D'];

/**
 * Normalise a raw Question record so that:
 *  - options is always {A,B,C,D} (not an array)
 *  - correctOption is always a letter key ('A'|'B'|'C'|'D')
 *
 * Seeded questions store options as a JSON array and correctOption as the
 * full answer text.  Teacher-created questions already use the object/letter
 * format.  This helper handles both.
 */
function normalizeQuestion(question) {
  const rawOptions = typeof question.options === 'string'
    ? JSON.parse(question.options)
    : question.options;

  let optionsObj;
  let correctOption = question.correctOption;

  if (Array.isArray(rawOptions)) {
    optionsObj = {};
    KEYS.forEach((k, i) => {
      if (rawOptions[i] !== undefined) optionsObj[k] = rawOptions[i];
    });
    const textIdx = rawOptions.indexOf(correctOption);
    if (textIdx !== -1) correctOption = KEYS[textIdx];
  } else {
    optionsObj = rawOptions;
  }

  return { ...question, options: optionsObj, correctOption };
}

// STUDENT: Submit quiz attempt
router.post('/', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const { assignmentId, quizId, answers, timeSpentSeconds } = req.body;

    if (!quizId || !answers || !Array.isArray(answers)) {
      res.status(400);
      throw new Error('quizId and answers array are required');
    }

    // Verify quiz exists and get its questions to calculate score
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        quizQuestions: {
          include: { question: true }
        }
      }
    });

    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    let score = 0;
    let totalScore = 0;
    const answerData = [];

    const questionMap = new Map();
    quiz.quizQuestions.forEach(qq => {
      questionMap.set(qq.questionId, { ...qq, question: normalizeQuestion(qq.question) });
      totalScore += qq.marks;
    });

    for (const ans of answers) {
      const qq = questionMap.get(ans.questionId);
      if (!qq) continue; // Skip answers for questions not in this quiz

      const isCorrect = ans.selectedOption === qq.question.correctOption;
      if (isCorrect) {
        score += qq.marks;
      }

      answerData.push({
        questionId: ans.questionId,
        selectedOption: ans.selectedOption,
        isCorrect
      });
    }

    // Save attempt using transaction
    const attempt = await prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.quizAttempt.create({
        data: {
          quizId,
          assignmentId: assignmentId || null,
          studentId: req.user.id,
          score,
          totalScore,
          timeSpentSeconds
        }
      });

      if (answerData.length > 0) {
        await tx.studentQuestionAnswer.createMany({
          data: answerData.map(a => ({
            ...a,
            attemptId: createdAttempt.id,
            studentId: req.user.id
          }))
        });
      }

      return await tx.quizAttempt.findUnique({
        where: { id: createdAttempt.id },
        include: {
          studentAnswers: {
            include: { question: true }
          }
        }
      });
    });

    // Format response
    const response = {
      ...attempt,
      studentAnswers: attempt.studentAnswers.map(a => ({
        ...a,
        question: normalizeQuestion(a.question)
      }))
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// STUDENT: List all my attempts
router.get('/mine', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: { studentId: req.user.id },
      include: {
        quiz: { include: { subject: true } }
      },
      orderBy: { submittedAt: 'desc' }
    });
    res.json(attempts);
  } catch (error) {
    next(error);
  }
});

// STUDENT: Get full attempt detail
router.get('/:id', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const attemptId = req.params.id;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: true,
        studentAnswers: {
          include: { question: true }
        }
      }
    });

    if (!attempt || attempt.studentId !== req.user.id) {
      res.status(404);
      throw new Error('Attempt not found');
    }

    const formatted = {
      ...attempt,
      studentAnswers: attempt.studentAnswers.map(ans => {
        const normQ = normalizeQuestion(ans.question);
        return {
          id: ans.id,
          questionId: ans.questionId,
          questionText: normQ.questionText,
          options: normQ.options,
          correctOption: normQ.correctOption,
          selectedOption: ans.selectedOption,
          isCorrect: ans.isCorrect,
          explanation: normQ.explanation
        };
      })
    };

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
