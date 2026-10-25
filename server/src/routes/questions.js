const express = require('express');
const prisma = require('../lib/store');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireRole('TEACHER'));

const verifySubjectOwnership = async (subjectId, teacherId) => {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { classroom: true }
  });
  if (!subject || subject.classroom.teacherId !== teacherId) {
    throw new Error('Not authorized for this subject');
  }
};

const verifyQuestionOwnership = async (questionId, teacherId) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { subject: { include: { classroom: true } } }
  });
  if (!question || question.subject.classroom.teacherId !== teacherId) {
    throw new Error('Not authorized for this question');
  }
  return question;
};

router.get('/subject/:subjectId', async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { topic, difficulty } = req.query;

    await verifySubjectOwnership(subjectId, req.user.id);

    const where = { subjectId };
    if (topic) where.topic = topic;
    if (difficulty) where.difficulty = difficulty;

    const questions = await prisma.question.findMany({ where });
    
    // Parse options for client
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    res.json(parsedQuestions);
  } catch (error) {
    if (error.message.includes('Not authorized')) res.status(403);
    next(error);
  }
});

router.post('/subject/:subjectId', async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { topic, questionText, options, correctOption, explanation, difficulty } = req.body;

    await verifySubjectOwnership(subjectId, req.user.id);

    if (!topic || !questionText || !options || !correctOption || !explanation) {
      res.status(400);
      throw new Error('Missing required fields');
    }

    const question = await prisma.question.create({
      data: {
        subjectId,
        topic,
        questionText,
        options: JSON.stringify(options),
        correctOption,
        explanation,
        difficulty: difficulty || 'MEDIUM'
      }
    });

    res.status(201).json({ ...question, options: JSON.parse(question.options) });
  } catch (error) {
    if (error.message.includes('Not authorized')) res.status(403);
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const questionId = req.params.id;
    const { topic, questionText, options, correctOption, explanation, difficulty } = req.body;

    await verifyQuestionOwnership(questionId, req.user.id);

    const data = {};
    if (topic) data.topic = topic;
    if (questionText) data.questionText = questionText;
    if (options) data.options = JSON.stringify(options);
    if (correctOption) data.correctOption = correctOption;
    if (explanation) data.explanation = explanation;
    if (difficulty) data.difficulty = difficulty;

    const updated = await prisma.question.update({
      where: { id: questionId },
      data
    });

    res.json({ ...updated, options: JSON.parse(updated.options) });
  } catch (error) {
    if (error.message.includes('Not authorized')) res.status(403);
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const questionId = req.params.id;
    await verifyQuestionOwnership(questionId, req.user.id);

    await prisma.question.delete({ where: { id: questionId } });
    res.json({ message: 'Question deleted' });
  } catch (error) {
    if (error.message.includes('Not authorized')) res.status(403);
    next(error);
  }
});

module.exports = router;
