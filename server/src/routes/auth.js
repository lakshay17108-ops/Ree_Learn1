const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/store');
const { ensureConfiguredPrincipal } = require('../lib/principal');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const publicUser = ({ passwordHash, ...user }) => user;

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password || !role) {
      res.status(400);
      throw new Error('All fields are required');
    }

    if (!['TEACHER', 'STUDENT'].includes(role)) {
      res.status(400);
      throw new Error('Invalid role');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400);
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), passwordHash, role, approvalStatus: role === 'TEACHER' ? 'PENDING' : 'APPROVED' }
    });

    if (role === 'TEACHER') {
      return res.status(202).json({
        message: 'Your teacher account is awaiting principal approval.',
        user: publicUser(user)
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user: publicUser(user), token });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Email and password are required');
    }

    let user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      user = await ensureConfiguredPrincipal(email);
    }
    if (!user) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    if (user.role === 'TEACHER' && user.approvalStatus !== 'APPROVED') {
      res.status(403);
      throw new Error(user.approvalStatus === 'REJECTED'
        ? 'Your teacher account was not approved. Contact your principal.'
        : 'Your teacher account is awaiting principal approval.');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ user: publicUser(user), token });
  } catch (error) {
    next(error);
  }
});

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    res.json(publicUser(req.user));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
