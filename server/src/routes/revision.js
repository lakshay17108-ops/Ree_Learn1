const express = require('express');
const crypto = require('crypto');
const prisma = require('../lib/store');
const { createUploadSignature } = require('../lib/cloudinary');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

const getPost = (postId) => prisma.revisionPost.findUnique({
  where: { id: postId },
  include: { subject: { include: { classroom: true } } }
});

router.get('/subjects', async (req, res, next) => {
  try {
    const where = req.user.role === 'TEACHER'
      ? { classroom: { teacherId: req.user.id } }
      : { classroom: { enrollments: { some: { studentId: req.user.id } } } };
    const subjects = await prisma.subject.findMany({
      where,
      include: { classroom: { select: { id: true, name: true, section: true } } },
      orderBy: [{ classroom: { name: 'asc' } }, { name: 'asc' }]
    });
    res.json(subjects);
  } catch (error) {
    next(error);
  }
});

router.post('/upload-signature', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { subjectId } = req.body;
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, classroom: { teacherId: req.user.id } }
    });
    if (!subject) {
      res.status(403);
      throw new Error('Not authorized to upload media for this subject');
    }

    const publicId = `reelearn/revision/${crypto.randomUUID()}`;
    const timestamp = Math.floor(Date.now() / 1000);
    res.json({ ...createUploadSignature(publicId, timestamp), publicId, timestamp });
  } catch (error) {
    next(error);
  }
});

// Media is now served directly from Cloudinary URLs stored in DB
// This endpoint redirects to the Cloudinary URL for backward compat
router.get('/media/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const post = await prisma.revisionPost.findFirst({
      where: { mediaUrl: { contains: filename } },
      include: { subject: { include: { classroom: true } } }
    });
    if (!post) {
      res.status(404);
      throw new Error('Revision media not found');
    }
    const authorized = req.user.role === 'TEACHER'
      ? post.subject.classroom.teacherId === req.user.id
      : !!await prisma.classEnrollment.findUnique({
        where: { classroomId_studentId: { classroomId: post.subject.classroomId, studentId: req.user.id } }
      });
    if (!authorized) {
      res.status(403);
      throw new Error('Not authorized to view this revision media');
    }
    // Redirect to Cloudinary URL
    res.redirect(post.mediaUrl);
  } catch (error) {
    next(error);
  }
});

router.get('/posts', async (req, res, next) => {
  try {
    const isTeacher = req.user.role === 'TEACHER';
    const where = {
      subject: {
        ...(req.query.subjectId ? { id: req.query.subjectId } : {}),
        classroom: {
          ...(req.query.classroomId ? { id: req.query.classroomId } : {}),
          ...(isTeacher
            ? { teacherId: req.user.id }
            : { enrollments: { some: { studentId: req.user.id } } })
        }
      }
    };
    const posts = await prisma.revisionPost.findMany({
      where,
      include: {
        subject: { include: { classroom: { select: { id: true, name: true, section: true } } } },
        createdBy: { select: { name: true } },
        interactions: isTeacher
          ? { where: { liked: true }, select: { id: true } }
          : { where: { OR: [{ liked: true }, { studentId: req.user.id }] }, select: { studentId: true, liked: true, saved: true, priority: true, understanding: true } },
        reviews: isTeacher
          ? { select: { message: true, createdAt: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } }
          : { where: { studentId: req.user.id }, select: { message: true, createdAt: true, updatedAt: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(posts.map(({ interactions, reviews, ...post }) => {
      const myInteraction = interactions.find(item => item.studentId === req.user.id) || null;
      return {
        ...post,
        likes: isTeacher ? interactions.length : interactions.filter(item => item.liked).length,
        interaction: isTeacher ? null : myInteraction,
        review: isTeacher ? undefined : (reviews[0] || null),
        reviews: isTeacher ? reviews : undefined
      };
    }));
  } catch (error) {
    next(error);
  }
});

router.post('/posts', requireRole('TEACHER'), async (req, res, next) => {
  try {
    const { subjectId, title, content = '', mediaUrl, mediaType } = req.body;
    if (!subjectId || !title?.trim() || (!content.trim() && !mediaUrl)) {
      res.status(400);
      throw new Error('Choose a subject, add a title, and provide notes or media');
    }
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, classroom: { teacherId: req.user.id } }
    });
    if (!subject) {
      res.status(403);
      throw new Error('Not authorized to post in this subject');
    }

    if (mediaUrl) {
      let uploadedMedia;
      try {
        uploadedMedia = new URL(mediaUrl);
      } catch (error) {
        res.status(400);
        throw new Error('Invalid revision media URL');
      }
      const expectedResource = mediaType === 'IMAGE' ? 'image' : mediaType === 'VIDEO' ? 'video' : null;
      if (!expectedResource
        || uploadedMedia.protocol !== 'https:'
        || uploadedMedia.hostname !== 'res.cloudinary.com'
        || uploadedMedia.pathname.split('/')[1] !== process.env.CLOUDINARY_CLOUD_NAME
        || !uploadedMedia.pathname.includes(`/${expectedResource}/upload/reelearn/revision/`)) {
        res.status(400);
        throw new Error('Revision media must be uploaded to this Cloudinary account');
      }
    }

    const post = await prisma.revisionPost.create({
      data: {
        subjectId,
        createdById: req.user.id,
        title: title.trim(),
        content: content.trim(),
        mediaUrl: mediaUrl || null,
        mediaType: mediaUrl ? mediaType : null
      },
      include: { subject: { include: { classroom: { select: { id: true, name: true, section: true } } } }, createdBy: { select: { name: true } } }
    });
    res.status(201).json({ ...post, likes: 0, interaction: null, reviews: [] });
  } catch (error) {
    next(error);
  }
});

router.put('/posts/:postId/interaction', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const post = await getPost(req.params.postId);
    if (!post || !await prisma.classEnrollment.findUnique({
      where: { classroomId_studentId: { classroomId: post.subject.classroomId, studentId: req.user.id } }
    })) {
      res.status(404);
      throw new Error('Revision post not found');
    }
    const data = {};
    for (const key of ['liked', 'saved', 'priority']) {
      if (typeof req.body[key] === 'boolean') data[key] = req.body[key];
    }
    if (req.body.understanding === null || ['GOT_IT', 'REVIEW_AGAIN', 'CONFUSED'].includes(req.body.understanding)) data.understanding = req.body.understanding;
    if (!Object.keys(data).length) {
      res.status(400);
      throw new Error('No valid revision action provided');
    }
    const interaction = await prisma.revisionInteraction.upsert({
      where: { postId_studentId: { postId: post.id, studentId: req.user.id } },
      create: { postId: post.id, studentId: req.user.id, ...data },
      update: data
    });
    res.json(interaction);
  } catch (error) {
    next(error);
  }
});

router.put('/posts/:postId/review', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const message = req.body.message?.trim();
    if (!message || message.length > 1000) {
      res.status(400);
      throw new Error('Review must be between 1 and 1000 characters');
    }
    const post = await getPost(req.params.postId);
    if (!post || !await prisma.classEnrollment.findUnique({
      where: { classroomId_studentId: { classroomId: post.subject.classroomId, studentId: req.user.id } }
    })) {
      res.status(404);
      throw new Error('Revision post not found');
    }
    const review = await prisma.revisionReview.upsert({
      where: { postId_studentId: { postId: post.id, studentId: req.user.id } },
      create: { postId: post.id, studentId: req.user.id, message },
      update: { message }
    });
    res.json({ message: review.message, createdAt: review.createdAt, updatedAt: review.updatedAt });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
