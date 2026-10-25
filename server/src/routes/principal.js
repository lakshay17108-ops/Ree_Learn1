const express = require('express');
const prisma = require('../lib/store');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireRole('PRINCIPAL'));

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Compute average score percentage from an array of QuizAttempt rows */
const avgScore = (attempts) => {
  const pcts = attempts
    .filter(a => a.totalScore > 0)
    .map(a => Math.round((a.score / a.totalScore) * 100));
  return pcts.length ? Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length) : null;
};

const publicUser = ({ passwordHash, ...u }) => u;

// ─── GET /principal/overview ───────────────────────────────────────────────────
router.get('/overview', async (req, res, next) => {
  try {
    const [pendingTeachers, classrooms, teacherCount, studentCount] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'TEACHER', approvalStatus: 'PENDING' },
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.classroom.findMany({
        include: {
          teacher: { select: { id: true, name: true, email: true } },
          enrollments: { include: { student: { select: { id: true, name: true, email: true } } } }
        },
        orderBy: [{ name: 'asc' }, { section: 'asc' }]
      }),
      prisma.user.count({ where: { role: 'TEACHER', approvalStatus: 'APPROVED' } }),
      prisma.user.count({ where: { role: 'STUDENT' } })
    ]);

    const classroomIds = classrooms.map(c => c.id);
    const studentIds = [...new Set(classrooms.flatMap(c => c.enrollments.map(({ student }) => student.id)))];
    const attempts = studentIds.length && classroomIds.length
      ? await prisma.quizAttempt.findMany({
        where: {
          studentId: { in: studentIds },
          quiz: { subject: { classroomId: { in: classroomIds } } }
        },
        include: { quiz: { select: { id: true, title: true, subject: { select: { name: true, classroomId: true } } } } },
        orderBy: { submittedAt: 'desc' }
      })
      : [];

    const attemptsByStudentAndClassroom = new Map();
    attempts.forEach(a => {
      const key = `${a.quiz.subject.classroomId}:${a.studentId}`;
      const grouped = attemptsByStudentAndClassroom.get(key) || [];
      grouped.push(a);
      attemptsByStudentAndClassroom.set(key, grouped);
    });

    const classReports = classrooms.map(classroom => {
      const students = classroom.enrollments.map(({ student }) => {
        const sa = attemptsByStudentAndClassroom.get(`${classroom.id}:${student.id}`) || [];
        const pcts = sa.map(a => a.totalScore > 0 ? Math.round((a.score / a.totalScore) * 100) : 0);
        return {
          ...student,
          quizzesTaken: new Set(sa.map(a => a.quiz.id)).size,
          averageScore: pcts.length ? Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length) : null,
          latestAttempt: sa[0] ? {
            quizTitle: sa[0].quiz.title,
            subjectName: sa[0].quiz.subject.name,
            percentage: pcts[0],
            submittedAt: sa[0].submittedAt
          } : null
        };
      });
      const avgs = students.filter(s => s.averageScore !== null).map(s => s.averageScore);
      return {
        id: classroom.id, name: classroom.name, section: classroom.section,
        teacher: classroom.teacher, studentCount: students.length,
        classAverage: avgs.length ? Math.round(avgs.reduce((s, v) => s + v, 0) / avgs.length) : null,
        students
      };
    });

    // Recent activity: last 8 quiz attempts across school
    const recentActivity = attempts.slice(0, 8).map(a => ({
      type: 'QUIZ_ATTEMPT',
      studentId: a.studentId,
      quizTitle: a.quiz.title,
      subjectName: a.quiz.subject.name,
      percentage: a.totalScore > 0 ? Math.round((a.score / a.totalScore) * 100) : 0,
      submittedAt: a.submittedAt
    }));

    res.json({
      pendingTeachers,
      classrooms: classReports,
      recentActivity,
      summary: {
        pendingTeacherCount: pendingTeachers.length,
        approvedTeacherCount: teacherCount,
        classroomCount: classrooms.length,
        studentCount
      }
    });
  } catch (error) { next(error); }
});

// ─── PUT /principal/teachers/:teacherId/approval ───────────────────────────────
router.put('/teachers/:teacherId/approval', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400); throw new Error('Approval status must be APPROVED or REJECTED');
    }
    const teacher = await prisma.user.findFirst({ where: { id: req.params.teacherId, role: 'TEACHER' } });
    if (!teacher) { res.status(404); throw new Error('Teacher account not found'); }
    const updated = await prisma.user.update({
      where: { id: teacher.id },
      data: { approvalStatus: status, approvedAt: status === 'APPROVED' ? new Date() : null, approvedById: req.user.id },
      select: { id: true, name: true, email: true, approvalStatus: true, approvedAt: true }
    });
    res.json(updated);
  } catch (error) { next(error); }
});

// ─── GET /principal/teachers ───────────────────────────────────────────────────
router.get('/teachers', async (req, res, next) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true, name: true, email: true, approvalStatus: true,
        approvedAt: true, createdAt: true, avatarUrl: true,
        classroomsCreated: {
          select: {
            id: true, name: true, section: true,
            enrollments: { select: { studentId: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // For each approved teacher, fetch all quiz attempts in their classrooms
    const teacherRows = await Promise.all(teachers.map(async t => {
      const classroomIds = t.classroomsCreated.map(c => c.id);
      const totalStudents = new Set(
        t.classroomsCreated.flatMap(c => c.enrollments.map(e => e.studentId))
      ).size;

      let classAverage = null;
      if (classroomIds.length) {
        const attempts = await prisma.quizAttempt.findMany({
          where: { quiz: { subject: { classroomId: { in: classroomIds } } } },
          select: { score: true, totalScore: true }
        });
        classAverage = avgScore(attempts);
      }

      return {
        id: t.id, name: t.name, email: t.email,
        approvalStatus: t.approvalStatus, approvedAt: t.approvedAt,
        createdAt: t.createdAt, avatarUrl: t.avatarUrl,
        classroomCount: t.classroomsCreated.length,
        totalStudents,
        classAverage
      };
    }));

    res.json(teacherRows);
  } catch (error) { next(error); }
});

// ─── GET /principal/teachers/:id ───────────────────────────────────────────────
router.get('/teachers/:id', async (req, res, next) => {
  try {
    const teacher = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'TEACHER' },
      select: {
        id: true, name: true, email: true, approvalStatus: true,
        approvedAt: true, createdAt: true, avatarUrl: true,
        classroomsCreated: {
          include: {
            subjects: { select: { id: true, name: true, code: true } },
            enrollments: {
              include: { student: { select: { id: true, name: true, email: true } } }
            }
          }
        }
      }
    });
    if (!teacher) { res.status(404); throw new Error('Teacher not found'); }

    const classroomIds = teacher.classroomsCreated.map(c => c.id);
    const allStudentIds = [...new Set(
      teacher.classroomsCreated.flatMap(c => c.enrollments.map(e => e.student.id))
    )];

    const attempts = classroomIds.length
      ? await prisma.quizAttempt.findMany({
        where: { quiz: { subject: { classroomId: { in: classroomIds } } } },
        include: {
          student: { select: { id: true, name: true } },
          quiz: { select: { id: true, title: true, subject: { select: { name: true, classroomId: true } } } }
        },
        orderBy: { submittedAt: 'desc' }
      })
      : [];

    const attemptsByClassroom = new Map();
    attempts.forEach(a => {
      const cId = a.quiz.subject.classroomId;
      const arr = attemptsByClassroom.get(cId) || [];
      arr.push(a);
      attemptsByClassroom.set(cId, arr);
    });

    const classrooms = teacher.classroomsCreated.map(c => {
      const cAttempts = attemptsByClassroom.get(c.id) || [];
      const students = c.enrollments.map(({ student }) => {
        const sa = cAttempts.filter(a => a.studentId === student.id);
        return { ...student, quizzesTaken: new Set(sa.map(a => a.quizId)).size, averageScore: avgScore(sa) };
      });
      return {
        id: c.id, name: c.name, section: c.section,
        subjects: c.subjects, students,
        studentCount: students.length,
        classAverage: avgScore(cAttempts)
      };
    });

    res.json({
      ...publicUser(teacher),
      classrooms,
      totalStudents: allStudentIds.length,
      totalClassrooms: classroomIds.length,
      overallAverage: avgScore(attempts)
    });
  } catch (error) { next(error); }
});

// ─── GET /principal/students ───────────────────────────────────────────────────
router.get('/students', async (req, res, next) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true, name: true, email: true, createdAt: true, avatarUrl: true,
        classEnrollments: {
          include: { classroom: { select: { id: true, name: true, section: true } } }
        },
        quizAttempts: { select: { score: true, totalScore: true, submittedAt: true } }
      },
      orderBy: { name: 'asc' }
    });

    const rows = students.map(s => ({
      id: s.id, name: s.name, email: s.email,
      createdAt: s.createdAt, avatarUrl: s.avatarUrl,
      enrolledClassrooms: s.classEnrollments.length,
      classrooms: s.classEnrollments.map(e => e.classroom),
      quizzesTaken: s.quizAttempts.length,
      averageScore: avgScore(s.quizAttempts),
      lastActive: s.quizAttempts[0]?.submittedAt ?? null
    }));

    res.json(rows);
  } catch (error) { next(error); }
});

// ─── GET /principal/students/:id ──────────────────────────────────────────────
router.get('/students/:id', async (req, res, next) => {
  try {
    const student = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'STUDENT' },
      select: {
        id: true, name: true, email: true, createdAt: true, avatarUrl: true,
        classEnrollments: {
          include: {
            classroom: {
              include: {
                teacher: { select: { id: true, name: true } },
                subjects: { select: { id: true, name: true, code: true } }
              }
            }
          }
        },
        quizAttempts: {
          include: {
            quiz: {
              select: {
                id: true, title: true,
                subject: { select: { name: true, classroom: { select: { id: true, name: true, section: true } } } }
              }
            }
          },
          orderBy: { submittedAt: 'desc' }
        }
      }
    });
    if (!student) { res.status(404); throw new Error('Student not found'); }

    const attempts = student.quizAttempts.map(a => ({
      id: a.id,
      quizTitle: a.quiz.title,
      subjectName: a.quiz.subject.name,
      classroomName: `${a.quiz.subject.classroom.name} ${a.quiz.subject.classroom.section}`,
      classroomId: a.quiz.subject.classroom.id,
      score: a.score, totalScore: a.totalScore,
      percentage: a.totalScore > 0 ? Math.round((a.score / a.totalScore) * 100) : 0,
      timeSpentSeconds: a.timeSpentSeconds,
      submittedAt: a.submittedAt
    }));

    res.json({
      id: student.id, name: student.name, email: student.email,
      createdAt: student.createdAt, avatarUrl: student.avatarUrl,
      classrooms: student.classEnrollments.map(e => ({
        id: e.classroom.id, name: e.classroom.name, section: e.classroom.section,
        teacher: e.classroom.teacher, subjects: e.classroom.subjects,
        enrolledAt: e.enrolledAt
      })),
      attempts,
      summary: {
        totalClassrooms: student.classEnrollments.length,
        totalAttempts: attempts.length,
        averageScore: avgScore(student.quizAttempts)
      }
    });
  } catch (error) { next(error); }
});

// ─── GET /principal/classrooms/:id ────────────────────────────────────────────
router.get('/classrooms/:id', async (req, res, next) => {
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        subjects: { select: { id: true, name: true, code: true } },
        enrollments: {
          include: { student: { select: { id: true, name: true, email: true } } }
        }
      }
    });
    if (!classroom) { res.status(404); throw new Error('Classroom not found'); }

    const studentIds = classroom.enrollments.map(e => e.student.id);
    const attempts = studentIds.length
      ? await prisma.quizAttempt.findMany({
        where: {
          studentId: { in: studentIds },
          quiz: { subject: { classroomId: classroom.id } }
        },
        include: {
          quiz: { select: { id: true, title: true, subject: { select: { id: true, name: true } } } }
        },
        orderBy: { submittedAt: 'desc' }
      })
      : [];

    const attemptsByStudent = new Map();
    attempts.forEach(a => {
      const arr = attemptsByStudent.get(a.studentId) || [];
      arr.push(a);
      attemptsByStudent.set(a.studentId, arr);
    });

    const students = classroom.enrollments.map(({ student }) => {
      const sa = attemptsByStudent.get(student.id) || [];
      return {
        ...student,
        quizzesTaken: new Set(sa.map(a => a.quizId)).size,
        averageScore: avgScore(sa),
        latestAttempt: sa[0] ? {
          quizTitle: sa[0].quiz.title,
          subjectName: sa[0].quiz.subject.name,
          percentage: sa[0].totalScore > 0 ? Math.round((sa[0].score / sa[0].totalScore) * 100) : 0,
          submittedAt: sa[0].submittedAt
        } : null,
        attempts: sa.map(a => ({
          id: a.id, quizTitle: a.quiz.title, subjectName: a.quiz.subject.name,
          score: a.score, totalScore: a.totalScore,
          percentage: a.totalScore > 0 ? Math.round((a.score / a.totalScore) * 100) : 0,
          submittedAt: a.submittedAt
        }))
      };
    });

    res.json({
      id: classroom.id, name: classroom.name, section: classroom.section,
      joinCode: classroom.joinCode, createdAt: classroom.createdAt,
      teacher: classroom.teacher, subjects: classroom.subjects,
      students, studentCount: students.length,
      classAverage: avgScore(attempts)
    });
  } catch (error) { next(error); }
});

// ─── DELETE /principal/students/:id ───────────────────────────────────────────
router.delete('/students/:id', async (req, res, next) => {
  try {
    const student = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'STUDENT' }
    });
    if (!student) { res.status(404); throw new Error('Student not found'); }

    await prisma.user.delete({ where: { id: student.id } });
    res.json({ message: `Student "${student.name}" has been removed.` });
  } catch (error) { next(error); }
});

// ─── DELETE /principal/teachers/:id ───────────────────────────────────────────
router.delete('/teachers/:id', async (req, res, next) => {
  try {
    const teacher = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'TEACHER' }
    });
    if (!teacher) { res.status(404); throw new Error('Teacher not found'); }

    await prisma.user.delete({ where: { id: teacher.id } });
    res.json({ message: `Teacher "${teacher.name}" has been removed.` });
  } catch (error) { next(error); }
});

module.exports = router;