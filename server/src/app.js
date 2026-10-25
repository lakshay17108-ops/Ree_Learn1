require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { verifyToken } = require('./middleware/auth');
const errorHandler = require('./middleware/error');
const store = require('./lib/store');

const authRouter = require('./routes/auth');
const classroomsRouter = require('./routes/classrooms');
const subjectsRouter = require('./routes/subjects');
const questionsRouter = require('./routes/questions');
const quizzesRouter = require('./routes/quizzes');
const assignmentsRouter = require('./routes/assignments');
const attemptsRouter = require('./routes/attempts');
const analyticsRouter = require('./routes/analytics');
const revisionRouter = require('./routes/revision');
const principalRouter = require('./routes/principal');
const meetingsRouter = require('./routes/meetings');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
];

const isSameOrigin = (origin, host) => {
  try {
    const parsedOrigin = new URL(origin);
    return ['http:', 'https:'].includes(parsedOrigin.protocol) && parsedOrigin.host === host;
  } catch {
    return false;
  }
};

app.use((req, res, next) => cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || isSameOrigin(origin, req.get('host'))) {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
})(req, res, next));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/classrooms', verifyToken, classroomsRouter);
app.use('/api/subjects', verifyToken, subjectsRouter);
app.use('/api/questions', verifyToken, questionsRouter);
app.use('/api/quizzes', verifyToken, quizzesRouter);
app.use('/api/assignments', verifyToken, assignmentsRouter);
app.use('/api/attempts', verifyToken, attemptsRouter);
app.use('/api/analytics', verifyToken, analyticsRouter);
app.use('/api/revision', verifyToken, revisionRouter);
app.use('/api/principal', verifyToken, principalRouter);
app.use('/api/meetings', verifyToken, meetingsRouter);

// Health check
app.get('/api/health', async (req, res, next) => {
  try {
    const health = await store.$health();
    res.json({ status: 'ok', ...health });
  } catch (error) {
    next(error);
  }
});

// Error handling
app.use(errorHandler);

module.exports = app;
