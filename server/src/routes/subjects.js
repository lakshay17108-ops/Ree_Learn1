const express = require('express');
const prisma = require('../lib/store');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// TEACHER: List ALL subjects across teacher's classrooms (for QuizBuilder subject picker)
router.get('/', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: req.user.id },
      include: {
        subjects: true
      }
    });

    const subjects = classrooms.flatMap(c =>
      c.subjects.map(s => ({ ...s, classroomName: c.name, classroomSection: c.section }))
    );

    res.json(subjects);
  } catch (error) {
    next(error);
  }
});

// List subjects for classroom (TEACHER | STUDENT)
router.get('/classroom/:classroomId', async (req, res, next) => {
  try {
    const { classroomId } = req.params;

    if (req.user.role === 'STUDENT') {
      const enrollment = await prisma.classEnrollment.findUnique({
        where: {
          classroomId_studentId: { classroomId, studentId: req.user.id }
        }
      });
      if (!enrollment) {
        res.status(403);
        throw new Error('Not enrolled in this classroom');
      }
    } else if (req.user.role === 'TEACHER') {
      const classroom = await prisma.classroom.findFirst({
        where: { id: classroomId, teacherId: req.user.id }
      });
      if (!classroom) {
        res.status(403);
        throw new Error('Not authorized for this classroom');
      }
    }

    const subjects = await prisma.subject.findMany({
      where: { classroomId },
      include: {
        _count: { select: { questions: true, quizzes: true } }
      }
    });
    res.json(subjects);
  } catch (error) {
    next(error);
  }
});

// Create subject (TEACHER)
router.post('/classroom/:classroomId', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { classroomId } = req.params;
    const { name, code } = req.body;

    if (!name || !code) {
      res.status(400);
      throw new Error('Name and code are required');
    }

    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, teacherId: req.user.id }
    });
    if (!classroom) {
      res.status(403);
      throw new Error('Not authorized for this classroom');
    }

    const subject = await prisma.subject.create({
      data: { name, code, classroomId }
    });

    res.status(201).json(subject);
  } catch (error) {
    next(error);
  }
});

// Update subject (TEACHER)
router.put('/:id', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const subjectId = req.params.id;

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { classroom: true }
    });

    if (!subject || subject.classroom.teacherId !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to update this subject');
    }

    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: { name, code }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete subject (TEACHER)
router.delete('/:id', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const subjectId = req.params.id;

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: { classroom: true }
    });

    if (!subject || subject.classroom.teacherId !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized to delete this subject');
    }

    await prisma.subject.delete({ where: { id: subjectId } });
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
