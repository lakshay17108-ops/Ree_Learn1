require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');
const { verifyToken } = require('./middleware/auth');
const errorHandler = require('./middleware/error');

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

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
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
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
