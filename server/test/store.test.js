const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const crypto = require('node:crypto');

const storePath = path.join(os.tmpdir(), `reelearn-store-test-${crypto.randomUUID()}.json`);
process.env.JSON_STORE_PATH = storePath;
const store = require('../src/lib/store');

test.after(async () => {
  await fs.promises.rm(storePath, { force: true });
  await fs.promises.rm(`${storePath}.${process.pid}.tmp`, { force: true });
});

test('persists related records, supports nested queries and cascades deletes', async () => {
  const teacher = await store.user.create({
    data: { name: 'Test Teacher', email: 'teacher@example.test', passwordHash: 'hash', role: 'TEACHER' }
  });
  const classroom = await store.classroom.create({
    data: { name: 'Grade 8', section: 'A', joinCode: 'TST001', teacherId: teacher.id }
  });
  const subject = await store.subject.create({
    data: { classroomId: classroom.id, name: 'Math', code: 'MATH' }
  });
  const question = await store.question.create({
    data: {
      subjectId: subject.id,
      topic: 'Fractions',
      questionText: 'What is 1/2?',
      options: JSON.stringify(['one half', 'one third']),
      correctOption: 'one half',
      explanation: 'A half is one of two equal parts.'
    }
  });
  const quiz = await store.quiz.create({
    data: {
      subjectId: subject.id,
      createdById: teacher.id,
      title: 'Fractions',
      quizQuestions: { create: [{ questionId: question.id, marks: 2 }] }
    }
  });

  const matchingQuiz = await store.quiz.findFirst({
    where: { subject: { classroom: { teacherId: teacher.id } } },
    include: { subject: { include: { classroom: true } }, quizQuestions: { include: { question: true } } }
  });
  assert.equal(matchingQuiz.id, quiz.id);
  assert.equal(matchingQuiz.subject.classroom.id, classroom.id);
  assert.equal(matchingQuiz.quizQuestions[0].question.id, question.id);

  const student = await store.user.create({
    data: { name: 'Test Student', email: 'student@example.test', passwordHash: 'hash', role: 'STUDENT' }
  });
  await store.classEnrollment.create({ data: { classroomId: classroom.id, studentId: student.id } });
  const attempts = await store.quizAttempt.findMany({
    where: { quiz: { subject: { classroom: { enrollments: { some: { studentId: student.id } } } } } }
  });
  assert.deepEqual(attempts, []);

  const reloaded = JSON.parse(await fs.promises.readFile(storePath, 'utf8'));
  assert.equal(reloaded.quiz[0].id, quiz.id);

  await store.user.delete({ where: { id: teacher.id } });
  assert.equal(await store.classroom.count(), 0);
  assert.equal(await store.subject.count(), 0);
  assert.equal(await store.quiz.count(), 0);
  assert.equal(await store.quizQuestion.count(), 0);
});

test('supports atomic transaction-style writes and compound unique lookups', async () => {
  const student = await store.user.create({
    data: { name: 'Another Student', email: 'another@example.test', passwordHash: 'hash', role: 'STUDENT' }
  });
  const teacher = await store.user.create({
    data: { name: 'Another Teacher', email: 'another-teacher@example.test', passwordHash: 'hash', role: 'TEACHER' }
  });
  const classroom = await store.classroom.create({
    data: { name: 'Grade 9', section: 'B', joinCode: 'TST002', teacherId: teacher.id }
  });

  const enrollment = await store.$transaction(async tx => {
    const created = await tx.classEnrollment.create({ data: { classroomId: classroom.id, studentId: student.id } });
    return tx.classEnrollment.findUnique({
      where: { classroomId_studentId: { classroomId: classroom.id, studentId: student.id } }
    }).then(found => ({ created, found }));
  });

  assert.equal(enrollment.found.id, enrollment.created.id);
  assert.equal(enrollment.found.studentId, student.id);
});
