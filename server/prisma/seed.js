require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');
  
  // Cleanup in reverse order
  await prisma.studentQuestionAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.question.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classEnrollment.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('Cleaned up previous data.');

  // Create users
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const teacher = await prisma.user.create({
    data: { name: 'Dr. Sarah Mitchell', email: 'teacher@reelearn.dev', passwordHash, role: 'TEACHER' }
  });

  const studentsData = [
    { name: 'Alice Chen', email: 'alice@student.dev' },
    { name: 'Bob Kumar', email: 'bob@student.dev' },
    { name: 'Carol Osei', email: 'carol@student.dev' },
    { name: 'Dave Martin', email: 'dave@student.dev' },
    { name: 'Eve Patel', email: 'eve@student.dev' }
  ];

  const students = {};
  for (const s of studentsData) {
    const user = await prisma.user.create({
      data: { name: s.name, email: s.email, passwordHash, role: 'STUDENT' }
    });
    students[s.name.split(' ')[0]] = user;
  }

  // Create classrooms
  const classA = await prisma.classroom.create({
    data: { name: 'Grade 10', section: 'A', joinCode: 'GR10SA', teacherId: teacher.id }
  });
  const classB = await prisma.classroom.create({
    data: { name: 'Grade 11', section: 'B', joinCode: 'GR11SB', teacherId: teacher.id }
  });

  // Enrollments
  await prisma.classEnrollment.createMany({
    data: [
      { classroomId: classA.id, studentId: students['Alice'].id },
      { classroomId: classA.id, studentId: students['Bob'].id },
      { classroomId: classA.id, studentId: students['Carol'].id },
      { classroomId: classB.id, studentId: students['Dave'].id },
      { classroomId: classB.id, studentId: students['Eve'].id }
    ]
  });

  // Subjects
  const math10 = await prisma.subject.create({
    data: { classroomId: classA.id, name: 'Mathematics', code: 'MATH101' }
  });
  const sci10 = await prisma.subject.create({
    data: { classroomId: classA.id, name: 'Science', code: 'SCI101' }
  });
  const eng10 = await prisma.subject.create({
    data: { classroomId: classA.id, name: 'English', code: 'ENG101' }
  });
  const math11 = await prisma.subject.create({
    data: { classroomId: classB.id, name: 'Advanced Math', code: 'MATH201' }
  });

  // Helper for options
  const createQ = async (subjId, topic, diff, text, opts, corr, expl) => {
    return await prisma.question.create({
      data: {
        subjectId: subjId,
        topic,
        difficulty: diff,
        questionText: text,
        options: JSON.stringify(opts),
        correctOption: corr,
        explanation: expl
      }
    });
  };

  // Math Questions (8)
  const mathQs = [];
  mathQs.push(await createQ(math10.id, 'Quadratic Equations', 'EASY', 'What is the standard form of a quadratic equation?', ['ax^2 + bx + c = 0', 'y = mx + b', 'A = pi*r^2', 'a^2 + b^2 = c^2'], 'ax^2 + bx + c = 0', 'The standard form represents a parabola in algebra.'));
  mathQs.push(await createQ(math10.id, 'Quadratic Equations', 'MEDIUM', 'Find the roots of x^2 - 5x + 6 = 0.', ['x=2, x=3', 'x=-2, x=-3', 'x=1, x=6', 'x=-1, x=-6'], 'x=2, x=3', 'Factoring x^2 - 5x + 6 gives (x-2)(x-3)=0.'));
  mathQs.push(await createQ(math10.id, 'Quadratic Equations', 'HARD', 'What is the discriminant of 2x^2 - 4x + 5 = 0?', ['-24', '24', '56', '-56'], '-24', 'The discriminant is b^2 - 4ac, so 16 - 40 = -24.'));
  mathQs.push(await createQ(math10.id, 'Linear Algebra', 'EASY', 'What is a matrix?', ['A rectangular array of numbers', 'A type of equation', 'A geometric shape', 'A fraction'], 'A rectangular array of numbers', 'Matrices are used to organize numerical data.'));
  mathQs.push(await createQ(math10.id, 'Linear Algebra', 'MEDIUM', 'How do you multiply two matrices?', ['By multiplying rows of the first by columns of the second', 'By adding them', 'By dividing elements', 'You cannot'], 'By multiplying rows of the first by columns of the second', 'This is called the dot product method for matrices.'));
  mathQs.push(await createQ(math10.id, 'Linear Algebra', 'HARD', 'What is the determinant of a 2x2 matrix [[a,b],[c,d]]?', ['ad - bc', 'ac - bd', 'ab - cd', 'a+b+c+d'], 'ad - bc', 'This fundamental formula applies to 2x2 matrices.'));
  mathQs.push(await createQ(math10.id, 'Geometry', 'EASY', 'What is the sum of angles in a triangle?', ['180 degrees', '360 degrees', '90 degrees', '270 degrees'], '180 degrees', 'The sum of interior angles in any Euclidean planar triangle is 180 degrees.'));
  mathQs.push(await createQ(math10.id, 'Geometry', 'MEDIUM', 'What is the Pythagorean theorem?', ['a^2 + b^2 = c^2', 'E=mc^2', 'F=ma', 'V=IR'], 'a^2 + b^2 = c^2', 'It relates the lengths of the sides of a right triangle.'));

  // Science Questions (6)
  const sciQs = [];
  sciQs.push(await createQ(sci10.id, "Newton's Laws", 'EASY', 'What is Newton\'s First Law?', ['Inertia', 'F=ma', 'Action-Reaction', 'Gravity'], 'Inertia', 'An object remains at rest or in uniform motion unless acted upon by a force.'));
  sciQs.push(await createQ(sci10.id, "Newton's Laws", 'MEDIUM', 'What is the formula for force?', ['F=ma', 'F=m/a', 'F=m+a', 'F=m-a'], 'F=ma', 'Force equals mass times acceleration.'));
  sciQs.push(await createQ(sci10.id, "Newton's Laws", 'HARD', 'If a 10kg object accelerates at 2m/s^2, what is the force?', ['20N', '5N', '12N', '8N'], '20N', 'Using F=ma, 10 * 2 = 20 Newtons.'));
  sciQs.push(await createQ(sci10.id, 'Chemical Reactions', 'EASY', 'What is H2O?', ['Water', 'Salt', 'Acid', 'Base'], 'Water', 'It is composed of two hydrogen atoms and one oxygen atom.'));
  sciQs.push(await createQ(sci10.id, 'Chemical Reactions', 'MEDIUM', 'What is combustion?', ['Burning in presence of oxygen', 'Freezing', 'Melting', 'Dissolving'], 'Burning in presence of oxygen', 'Combustion is an exothermic reaction with oxygen.'));
  sciQs.push(await createQ(sci10.id, 'Chemical Reactions', 'HARD', 'Balance: H2 + O2 -> H2O', ['2H2 + O2 -> 2H2O', 'H2 + O2 -> H2O2', 'H2 + O2 -> 2H2O', '2H2 + 2O2 -> 2H2O'], '2H2 + O2 -> 2H2O', 'Conservation of mass requires equal numbers of atoms on both sides.'));

  // English Questions (4)
  const engQs = [];
  engQs.push(await createQ(eng10.id, 'Grammar', 'EASY', 'What is a noun?', ['A person, place, or thing', 'An action word', 'A describing word', 'A connecting word'], 'A person, place, or thing', 'Nouns represent entities or concepts.'));
  engQs.push(await createQ(eng10.id, 'Grammar', 'MEDIUM', 'Which sentence is grammatically correct?', ['He goes to school.', 'He go to school.', 'He going to school.', 'He gone to school.'], 'He goes to school.', 'Third-person singular requires "goes".'));
  engQs.push(await createQ(eng10.id, 'Literature', 'EASY', 'Who wrote Romeo and Juliet?', ['William Shakespeare', 'Charles Dickens', 'Mark Twain', 'Jane Austen'], 'William Shakespeare', 'Shakespeare is a famous English playwright.'));
  engQs.push(await createQ(eng10.id, 'Literature', 'MEDIUM', 'What is a metaphor?', ['A direct comparison without using like or as', 'A comparison using like or as', 'An exaggeration', 'A sound word'], 'A direct comparison without using like or as', 'Metaphors state that one thing is another.'));

  // Quizzes
  const quiz1 = await prisma.quiz.create({
    data: {
      subjectId: math10.id,
      title: 'Algebra Fundamentals',
      description: 'Test your algebra skills',
      timeLimitMinutes: 30,
      totalMarks: 5,
      createdById: teacher.id,
      quizQuestions: {
        create: mathQs.slice(0, 5).map(q => ({ questionId: q.id, marks: 1 }))
      }
    }
  });

  const quiz2 = await prisma.quiz.create({
    data: {
      subjectId: sci10.id,
      title: 'Physics & Chemistry Basics',
      description: 'Science basics',
      timeLimitMinutes: 45,
      totalMarks: 6,
      createdById: teacher.id,
      quizQuestions: {
        create: sciQs.slice(0, 6).map(q => ({ questionId: q.id, marks: 1 }))
      }
    }
  });

  const quiz3 = await prisma.quiz.create({
    data: {
      subjectId: eng10.id,
      title: 'English Proficiency',
      description: 'Test your grammar and lit knowledge',
      timeLimitMinutes: 20,
      totalMarks: 4,
      createdById: teacher.id,
      quizQuestions: {
        create: engQs.slice(0, 4).map(q => ({ questionId: q.id, marks: 1 }))
      }
    }
  });

  // Assignments
  const now = new Date();
  const a1 = await prisma.assignment.create({
    data: { quizId: quiz1.id, classroomId: classA.id, dueDate: new Date(now.getTime() + 7*24*60*60*1000) }
  });
  const a2 = await prisma.assignment.create({
    data: { quizId: quiz2.id, classroomId: classA.id, dueDate: new Date(now.getTime() + 5*24*60*60*1000) }
  });
  const a3 = await prisma.assignment.create({
    data: { quizId: quiz3.id, classroomId: classA.id, assignedToStudentId: students['Alice'].id, dueDate: new Date(now.getTime() + 3*24*60*60*1000) }
  });
  const a4 = await prisma.assignment.create({
    data: { quizId: quiz1.id, classroomId: classA.id, assignedToStudentId: students['Bob'].id, dueDate: new Date(now.getTime() - 2*24*60*60*1000) }
  });

  // Attempts
  // Helper to generate answers
  const generateAnswers = (questions, correctCount, attemptId, studentId) => {
    return questions.map((q, idx) => {
      const isCorrect = idx < correctCount;
      const options = JSON.parse(q.options);
      const selectedOption = isCorrect ? q.correctOption : options.find(o => o !== q.correctOption);
      return {
        attemptId,
        studentId,
        questionId: q.id,
        selectedOption,
        isCorrect
      };
    });
  };

  // Alice Quiz 1
  const att1 = await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      assignmentId: a1.id,
      studentId: students['Alice'].id,
      score: 4,
      totalScore: 5,
      timeSpentSeconds: 1200
    }
  });
  await prisma.studentQuestionAnswer.createMany({
    data: generateAnswers(mathQs.slice(0, 5), 4, att1.id, students['Alice'].id)
  });

  // Bob Quiz 2
  const att2 = await prisma.quizAttempt.create({
    data: {
      quizId: quiz2.id,
      assignmentId: a2.id,
      studentId: students['Bob'].id,
      score: 5,
      totalScore: 6,
      timeSpentSeconds: 1800
    }
  });
  await prisma.studentQuestionAnswer.createMany({
    data: generateAnswers(sciQs.slice(0, 6), 5, att2.id, students['Bob'].id)
  });

  // Carol Quiz 1
  const att3 = await prisma.quizAttempt.create({
    data: {
      quizId: quiz1.id,
      assignmentId: a1.id,
      studentId: students['Carol'].id,
      score: 3,
      totalScore: 5,
      timeSpentSeconds: 900
    }
  });
  await prisma.studentQuestionAnswer.createMany({
    data: generateAnswers(mathQs.slice(0, 5), 3, att3.id, students['Carol'].id)
  });

  console.log('Seeding completed successfully!');
  const users = await prisma.user.count();
  const questions = await prisma.question.count();
  const assignments = await prisma.assignment.count();
  console.log(`Created ${users} users, ${questions} questions, ${assignments} assignments.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
