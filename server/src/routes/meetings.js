const express = require('express');
const prisma = require('../lib/store');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const meetingInclude = {
  createdBy: { select: { id: true, name: true, role: true } },
  recipient: { select: { id: true, name: true, role: true } },
  classroom: { select: { id: true, name: true, section: true, teacher: { select: { id: true, name: true } } } }
};

router.get('/options', async (req, res, next) => {
  try {
    const principals = await prisma.user.findMany({
      where: { role: 'PRINCIPAL', approvalStatus: 'APPROVED' },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' }
    });
    let classrooms = [];
    let people = [];

    if (req.user.role === 'PRINCIPAL') {
      classrooms = await prisma.classroom.findMany({
        include: {
          teacher: { select: { id: true, name: true, role: true } },
          enrollments: { include: { student: { select: { id: true, name: true, role: true } } } }
        },
        orderBy: [{ name: 'asc' }, { section: 'asc' }]
      });
      people = await prisma.user.findMany({
        where: { role: { in: ['TEACHER', 'STUDENT'] }, approvalStatus: 'APPROVED' },
        select: { id: true, name: true, role: true },
        orderBy: { name: 'asc' }
      });
    } else if (req.user.role === 'TEACHER') {
      classrooms = await prisma.classroom.findMany({
        where: { teacherId: req.user.id },
        include: {
          teacher: { select: { id: true, name: true, role: true } },
          enrollments: { include: { student: { select: { id: true, name: true, role: true } } } }
        },
        orderBy: [{ name: 'asc' }, { section: 'asc' }]
      });
      people = [...new Map(classrooms.flatMap(classroom => classroom.enrollments.map(({ student }) => [student.id, student]))).values()];
    } else {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { studentId: req.user.id },
        include: { classroom: { include: { teacher: { select: { id: true, name: true, role: true } } } } }
      });
      classrooms = enrollments.map(enrollment => enrollment.classroom);
      people = [...new Map(classrooms.map(classroom => [classroom.teacher.id, classroom.teacher])).values()];
    }

    res.json({ principals, classrooms, people });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    let where;
    if (req.user.role === 'PRINCIPAL') {
      where = {};
    } else if (req.user.role === 'TEACHER') {
      const classrooms = await prisma.classroom.findMany({ where: { teacherId: req.user.id }, select: { id: true } });
      where = {
        OR: [
          { createdById: req.user.id },
          { recipientId: req.user.id },
          { audience: 'CLASSROOM', classroomId: { in: classrooms.map(classroom => classroom.id) } },
          { audience: 'ALL_TEACHERS' }
        ]
      };
    } else {
      const enrollments = await prisma.classEnrollment.findMany({ where: { studentId: req.user.id }, select: { classroomId: true } });
      where = {
        OR: [
          { createdById: req.user.id },
          { recipientId: req.user.id },
          { audience: 'CLASSROOM', classroomId: { in: enrollments.map(enrollment => enrollment.classroomId) } },
          { audience: 'ALL_STUDENTS' }
        ]
      };
    }
    const meetings = await prisma.meeting.findMany({ where, include: meetingInclude, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }] });
    res.json(meetings);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { audience, recipientId, classroomId, title, description = '', scheduledAt, preferredAt, durationMins = 30, location, meetingUrl } = req.body;
    if (!['INDIVIDUAL', 'CLASSROOM', 'ALL_TEACHERS', 'ALL_STUDENTS'].includes(audience)) {
      res.status(400);
      throw new Error('Choose a valid meeting audience');
    }
    if (!title?.trim() || title.trim().length > 120 || description.length > 2000) {
      res.status(400);
      throw new Error('Add a title (up to 120 characters) and keep details under 2000 characters');
    }
    if (!Number.isInteger(Number(durationMins)) || Number(durationMins) < 15 || Number(durationMins) > 240) {
      res.status(400);
      throw new Error('Meeting duration must be between 15 and 240 minutes');
    }

    const isRequest = req.user.role === 'STUDENT';
    if (isRequest && audience !== 'INDIVIDUAL') {
      res.status(403);
      throw new Error('Students can request an individual meeting only');
    }
    if (req.user.role === 'TEACHER' && !['INDIVIDUAL', 'CLASSROOM'].includes(audience)) {
      res.status(403);
      throw new Error('Teachers can schedule individual or classroom meetings only');
    }

    let targetClassroomId = null;
    let targetRecipientId = null;
    if (audience === 'CLASSROOM') {
      if (!classroomId) {
        res.status(400);
        throw new Error('Choose a classroom');
      }
      const classroom = await prisma.classroom.findFirst({
        where: {
          id: classroomId,
          ...(req.user.role === 'TEACHER' ? { teacherId: req.user.id } : {})
        }
      });
      if (!classroom) {
        res.status(403);
        throw new Error('Not authorized to schedule for this classroom');
      }
      targetClassroomId = classroom.id;
    } else if (audience === 'INDIVIDUAL') {
      if (!recipientId || recipientId === req.user.id) {
        res.status(400);
        throw new Error('Choose another participant');
      }
      const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
      if (!recipient || recipient.approvalStatus !== 'APPROVED') {
        res.status(404);
        throw new Error('Participant not found');
      }
      if (req.user.role === 'STUDENT') {
        if (!['TEACHER', 'PRINCIPAL'].includes(recipient.role)) {
          res.status(403);
          throw new Error('You can request a meeting with a teacher or principal');
        }
        if (recipient.role === 'TEACHER') {
          const enrollment = await prisma.classEnrollment.findFirst({
            where: { studentId: req.user.id, classroom: { teacherId: recipient.id } }
          });
          if (!enrollment) {
            res.status(403);
            throw new Error('You can request a teacher you share a classroom with');
          }
        }
      } else if (req.user.role === 'TEACHER') {
        const enrollment = await prisma.classEnrollment.findFirst({
          where: { studentId: recipient.id, classroom: { teacherId: req.user.id } }
        });
        if (recipient.role !== 'STUDENT' || !enrollment) {
          res.status(403);
          throw new Error('You can schedule an individual meeting with a student in your class');
        }
      } else if (!['TEACHER', 'STUDENT'].includes(recipient.role)) {
        res.status(400);
        throw new Error('Choose a teacher or student');
      }
      targetRecipientId = recipient.id;
    } else if (req.user.role !== 'PRINCIPAL') {
      res.status(403);
      throw new Error('Only a principal can schedule school-wide meetings');
    }

    const parsedSchedule = scheduledAt ? new Date(scheduledAt) : null;
    const parsedPreference = preferredAt ? new Date(preferredAt) : null;
    if (isRequest && parsedPreference && (!Number.isFinite(parsedPreference.getTime()) || parsedPreference <= new Date())) {
      res.status(400);
      throw new Error('Preferred time must be in the future');
    }
    if (!isRequest && (!parsedSchedule || !Number.isFinite(parsedSchedule.getTime()) || parsedSchedule <= new Date())) {
      res.status(400);
      throw new Error('Choose a meeting time in the future');
    }

    const meeting = await prisma.meeting.create({
      data: {
        createdById: req.user.id,
        recipientId: targetRecipientId,
        classroomId: targetClassroomId,
        audience,
        title: title.trim(),
        description: description.trim(),
        status: isRequest ? 'REQUESTED' : 'SCHEDULED',
        scheduledAt: isRequest ? null : parsedSchedule,
        preferredAt: parsedPreference,
        durationMins: Number(durationMins),
        location: location?.trim() || null,
        meetingUrl: meetingUrl?.trim() || null
      },
      include: meetingInclude
    });
    res.status(201).json(meeting);
  } catch (error) {
    next(error);
  }
});

router.put('/:meetingId', async (req, res, next) => {
  try {
    const meeting = await prisma.meeting.findUnique({ where: { id: req.params.meetingId } });
    if (!meeting) {
      res.status(404);
      throw new Error('Meeting not found');
    }
    const { status } = req.body;
    let data;
    if (status === 'CANCELLED') {
      if (meeting.createdById !== req.user.id && req.user.role !== 'PRINCIPAL') {
        res.status(403);
        throw new Error('Only the organizer can cancel this meeting');
      }
      if (meeting.status === 'CANCELLED' || meeting.status === 'DECLINED') {
        res.status(400);
        throw new Error('This meeting is already closed');
      }
      data = { status };
    } else if (['SCHEDULED', 'DECLINED'].includes(status)) {
      if (meeting.status !== 'REQUESTED' || meeting.recipientId !== req.user.id || req.user.role === 'STUDENT') {
        res.status(403);
        throw new Error('Only the requested teacher or principal can respond');
      }
      if (status === 'SCHEDULED') {
        const scheduledAt = new Date(req.body.scheduledAt);
        if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date()) {
          res.status(400);
          throw new Error('Choose a meeting time in the future');
        }
        const durationMins = Number(req.body.durationMins || meeting.durationMins);
        if (!Number.isInteger(durationMins) || durationMins < 15 || durationMins > 240) {
          res.status(400);
          throw new Error('Meeting duration must be between 15 and 240 minutes');
        }
        data = {
          status,
          scheduledAt,
          durationMins,
          location: req.body.location?.trim() || null,
          meetingUrl: req.body.meetingUrl?.trim() || null
        };
      } else {
        data = { status };
      }
    } else {
      res.status(400);
      throw new Error('Choose a valid meeting response');
    }

    const updated = await prisma.meeting.update({
      where: { id: meeting.id },
      data,
      include: meetingInclude
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;