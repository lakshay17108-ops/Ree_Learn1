const express = require('express');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const prisma = require('../lib/prisma');
const { createUploadSignature } = require('../lib/cloudinary');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '../../uploads/revision');

const getPost = (postId) => prisma.revisionPost.findUnique({
  where: { id: postId },
  include: { subject: { include: { classroom: true } } }
});

const canAccessPost = async (post, user) => user.role === 'TEACHER'
  ? post.subject.classroom.teacherId === user.id
  : !!await prisma.classEnrollment.findUnique({
    where: { classroomId_studentId: { classroomId: post.subject.classroomId, studentId: user.id } }
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
    const signature = createUploadSignature(publicId, timestamp);
    res.json({ ...signature, publicId, timestamp });
  } catch (error) {
    next(error);
  }
});

router.get('/media/:mediaId', async (req, res, next) => {
  try {
    const mediaId = req.params.mediaId;
    let post = await prisma.revisionPost.findFirst({
      where: { mediaUrl: `/revision/media/${mediaId}` },
      include: { subject: { include: { classroom: true } } }
    });
    if (!post) post = await prisma.revisionPost.findUnique({
      where: { id: mediaId },
      include: { subject: { include: { classroom: true } } }
    });
    const isLegacyFile = !!post?.mediaUrl?.startsWith('/revision/media/');
    if (!post || !post.mediaUrl) {
      res.status(404);
      throw new Error('Revision media not found');
    }
    if (!await canAccessPost(post, req.user)) {
      res.status(403);
      throw new Error('Not authorized to view this revision media');
    }

    if (isLegacyFile) {
      const filename = path.basename(post.mediaUrl);
      if (filename !== post.mediaUrl.slice('/revision/media/'.length)) {
        res.status(404);
        throw new Error('Revision media not found');
      }
      res.sendFile(path.join(uploadDir, filename), error => {
        if (error) next(error);
      });
      return;
    }

    let mediaUrl;
    try {
      mediaUrl = new URL(post.mediaUrl);
    } catch (error) {
      res.status(502);
      throw new Error('Stored revision media URL is invalid');
    }
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (mediaUrl.protocol !== 'https:' || mediaUrl.hostname !== 'res.cloudinary.com' || !cloudName || mediaUrl.pathname.split('/')[1] !== cloudName) {
      res.status(502);
      throw new Error('Stored revision media URL is invalid');
    }
    const request = https.get(mediaUrl, {
      headers: req.headers.range ? { Range: req.headers.range } : {}
    }, upstream => {
      res.status(upstream.statusCode || 502);
      for (const header of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
        if (upstream.headers[header]) res.setHeader(header, upstream.headers[header]);
      }
      res.setHeader('Cache-Control', 'private, no-store');
      upstream.on('error', error => {
        if (res.headersSent) res.destroy(error);
        else next(error);
      });
      upstream.pipe(res);
    });
    request.on('error', error => {
      if (res.headersSent) res.destroy(error);
      else next(error);
    });
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
        mediaUrl: post.mediaUrl ? `/revision/media/${post.id}` : null,
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
      let parsedMediaUrl;
      try {
        parsedMediaUrl = new URL(mediaUrl);
      } catch (error) {
        res.status(400);
        throw new Error('Invalid revision media URL');
      }
      if (!['IMAGE', 'VIDEO'].includes(mediaType)
        || parsedMediaUrl.protocol !== 'https:'
        || parsedMediaUrl.hostname !== 'res.cloudinary.com'
        || parsedMediaUrl.pathname.split('/')[1] !== process.env.CLOUDINARY_CLOUD_NAME
        || !parsedMediaUrl.pathname.includes(`/${mediaType === 'IMAGE' ? 'image' : 'video'}/upload/`)) {
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
    res.status(201).json({
      ...post,
      mediaUrl: post.mediaUrl ? `/revision/media/${post.id}` : null,
      likes: 0,
      interaction: null,
      reviews: []
    });
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
    const { liked, saved, priority, understanding } = req.body;
    const data = {};
    for (const key of ['liked', 'saved', 'priority']) {
      if (typeof req.body[key] === 'boolean') data[key] = req.body[key];
    }
    if (understanding === null || ['GOT_IT', 'REVIEW_AGAIN', 'CONFUSED'].includes(understanding)) data.understanding = understanding;
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