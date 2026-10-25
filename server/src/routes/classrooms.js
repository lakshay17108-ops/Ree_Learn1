const express = require('express');
const prisma = require('../lib/store');
const { requireRole } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// STUDENT: Get enrolled classrooms
router.get('/enrolled', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { studentId: req.user.id },
      include: {
        classroom: {
          include: { teacher: true }
        }
      }
    });
    const classrooms = enrollments.map(e => e.classroom);
    res.json(classrooms);
  } catch (error) {
    next(error);
  }
});

// STUDENT: Join classroom
router.post('/join', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const { joinCode } = req.body;
    if (!joinCode) {
      res.status(400);
      throw new Error('Join code is required');
    }

    const classroom = await prisma.classroom.findUnique({ where: { joinCode } });
    if (!classroom) {
      res.status(404);
      throw new Error('Classroom not found');
    }

    const enrollment = await prisma.classEnrollment.create({
      data: {
        classroomId: classroom.id,
        studentId: req.user.id
      }
    });

    res.status(201).json(classroom);
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400);
      return next(new Error('Already enrolled in this classroom'));
    }
    next(error);
  }
});

// TEACHER: List own classrooms
router.get('/', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: req.user.id }
    });
    res.json(classrooms);
  } catch (error) {
    next(error);
  }
});

// TEACHER: Create classroom
router.post('/', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { name, section } = req.body;
    if (!name || !section) {
      res.status(400);
      throw new Error('Name and section are required');
    }

    const joinCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const classroom = await prisma.classroom.create({
      data: {
        name,
        section,
        joinCode,
        teacherId: req.user.id
      }
    });
    res.status(201).json(classroom);
  } catch (error) {
    next(error);
  }
});

// TEACHER: Get classroom details + students
router.get('/:id', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const classroom = await prisma.classroom.findFirst({
      where: { id: req.params.id, teacherId: req.user.id },
      include: {
        enrollments: {
          include: { student: true }
        }
      }
    });

    if (!classroom) {
      res.status(404);
      throw new Error('Classroom not found');
    }

    res.json(classroom);
  } catch (error) {
    next(error);
  }
});

// TEACHER: Delete classroom
router.delete('/:id', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const classroom = await prisma.classroom.findFirst({
      where: { id: req.params.id, teacherId: req.user.id }
    });

    if (!classroom) {
      res.status(404);
      throw new Error('Classroom not found');
    }

    await prisma.classroom.delete({ where: { id: classroom.id } });
    res.json({ message: 'Classroom deleted' });
  } catch (error) {
    next(error);
  }
});

// TEACHER: Remove student enrollment
router.delete('/:id/students/:sid', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const classroom = await prisma.classroom.findFirst({
      where: { id: req.params.id, teacherId: req.user.id }
    });

    if (!classroom) {
      res.status(404);
      throw new Error('Classroom not found');
    }

    await prisma.classEnrollment.delete({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId: req.params.sid
        }
      }
    });

    res.json({ message: 'Student removed from classroom' });
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404);
      return next(new Error('Student enrollment not found'));
    }
    next(error);
  }
});

module.exports = router;
