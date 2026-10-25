const express = require('express');
const prisma = require('../lib/store');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get assignments for student helper
const getStudentAssignments = async (studentId, filter = 'all') => {
  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId },
    select: { classroomId: true }
  });
  const classroomIds = enrollments.map(e => e.classroomId);

  const assignments = await prisma.assignment.findMany({
    where: {
      OR: [
        { classroomId: { in: classroomIds }, assignedToStudentId: null },
        { assignedToStudentId: studentId }
      ]
    },
    include: {
      quiz: {
        include: { subject: true }
      },
      quizAttempts: {
        where: { studentId }
      }
    },
    orderBy: { dueDate: 'asc' }
  });

  const formatted = assignments.map(a => {
    const attempt = a.quizAttempts[0] || null;
    return {
      ...a,
      quizAttempts: undefined,
      myAttempt: attempt,
      status: attempt ? 'COMPLETED' : (new Date() > new Date(a.dueDate) ? 'OVERDUE' : 'PENDING')
    };
  });

  if (filter === 'pending') {
    return formatted.filter(a => !a.myAttempt);
  } else if (filter === 'completed') {
    return formatted.filter(a => !!a.myAttempt);
  }
  return formatted;
};

// STUDENT: List my assignments
router.get('/mine', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const assignments = await getStudentAssignments(req.user.id, 'all');
    res.json(assignments);
  } catch (error) {
    next(error);
  }
});

// STUDENT: List pending assignments
router.get('/mine/pending', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const assignments = await getStudentAssignments(req.user.id, 'pending');
    res.json(assignments);
  } catch (error) {
    next(error);
  }
});

// STUDENT: List completed assignments
router.get('/mine/completed', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const assignments = await getStudentAssignments(req.user.id, 'completed');
    res.json(assignments);
  } catch (error) {
    next(error);
  }
});

// TEACHER: List assignments for classroom
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

    const assignments = await prisma.assignment.findMany({
      where: { classroomId },
      include: {
        quiz: { include: { subject: true } },
        assignedToStudent: { select: { id: true, name: true, email: true } },
        quizAttempts: {
          include: { student: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    next(error);
  }
});

// STUDENT: Get single assignment by ID
router.get('/:id', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const assignmentId = req.params.id;

    // Find enrolled classrooms for authorization
    const enrollments = await prisma.classEnrollment.findMany({
      where: { studentId: req.user.id },
      select: { classroomId: true }
    });
    const classroomIds = enrollments.map(e => e.classroomId);

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        OR: [
          { classroomId: { in: classroomIds }, assignedToStudentId: null },
          { assignedToStudentId: req.user.id }
        ]
      },
      include: {
        quiz: {
          include: { subject: true }
        },
        quizAttempts: {
          where: { studentId: req.user.id }
        }
      }
    });

    if (!assignment) {
      res.status(404);
      throw new Error('Assignment not found');
    }

    const attempt = assignment.quizAttempts[0] || null;
    res.json({
      ...assignment,
      quizAttempts: undefined,
      myAttempt: attempt,
      status: attempt ? 'COMPLETED' : (new Date() > new Date(assignment.dueDate) ? 'OVERDUE' : 'PENDING')
    });
  } catch (error) {
    next(error);
  }
});

// TEACHER: Create assignment
router.post('/', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { quizId, classroomId, assignedToStudentId, dueDate } = req.body;

    if (!quizId || !classroomId || !dueDate) {
      res.status(400);
      throw new Error('Missing required fields');
    }

    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, teacherId: req.user.id }
    });
    if (!classroom) {
      res.status(403);
      throw new Error('Not authorized for this classroom');
    }

    const assignment = await prisma.assignment.create({
      data: {
        quizId,
        classroomId,
        assignedToStudentId: assignedToStudentId || null,
        dueDate: new Date(dueDate)
      },
      include: {
        quiz: { include: { subject: true } },
        assignedToStudent: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
});

// TEACHER: Delete assignment
router.delete('/:id', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const assignmentId = req.params.id;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { classroom: true }
    });

    if (!assignment || assignment.classroom.teacherId !== req.user.id) {
      res.status(403);
      throw new Error('Not authorized for this assignment');
    }

    await prisma.assignment.delete({ where: { id: assignmentId } });
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
