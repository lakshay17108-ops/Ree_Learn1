const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const models = [
  'user', 'classroom', 'classEnrollment', 'subject', 'question', 'quiz',
  'quizQuestion', 'assignment', 'quizAttempt', 'studentQuestionAnswer',
  'revisionPost', 'revisionInteraction', 'revisionReview', 'meeting'
];
const emptyData = () => Object.fromEntries(models.map(model => [model, []]));
const storePath = process.env.JSON_STORE_PATH || (process.env.VERCEL
  ? path.join(os.tmpdir(), 'reelearn-stage.json')
  : path.join(__dirname, '..', '..', 'data', 'reelearn.json'));

const relations = {
  user: {
    classroomsCreated: ['classroom', 'id', 'teacherId', true],
    classEnrollments: ['classEnrollment', 'id', 'studentId', true],
    quizzesCreated: ['quiz', 'id', 'createdById', true],
    assignments: ['assignment', 'id', 'assignedToStudentId', true],
    quizAttempts: ['quizAttempt', 'id', 'studentId', true],
    studentAnswers: ['studentQuestionAnswer', 'id', 'studentId', true],
    revisionPosts: ['revisionPost', 'id', 'createdById', true],
    revisionActions: ['revisionInteraction', 'id', 'studentId', true],
    revisionReviews: ['revisionReview', 'id', 'studentId', true],
    meetingsCreated: ['meeting', 'id', 'createdById', true],
    meetingInvites: ['meeting', 'id', 'recipientId', true]
  },
  classroom: {
    teacher: ['user', 'teacherId', 'id', false],
    enrollments: ['classEnrollment', 'id', 'classroomId', true],
    subjects: ['subject', 'id', 'classroomId', true],
    assignments: ['assignment', 'id', 'classroomId', true],
    meetings: ['meeting', 'id', 'classroomId', true]
  },
  classEnrollment: {
    classroom: ['classroom', 'classroomId', 'id', false],
    student: ['user', 'studentId', 'id', false]
  },
  subject: {
    classroom: ['classroom', 'classroomId', 'id', false],
    questions: ['question', 'id', 'subjectId', true],
    quizzes: ['quiz', 'id', 'subjectId', true],
    revisionPosts: ['revisionPost', 'id', 'subjectId', true]
  },
  question: {
    subject: ['subject', 'subjectId', 'id', false],
    quizQuestions: ['quizQuestion', 'id', 'questionId', true],
    studentAnswers: ['studentQuestionAnswer', 'id', 'questionId', true]
  },
  quiz: {
    subject: ['subject', 'subjectId', 'id', false],
    createdBy: ['user', 'createdById', 'id', false],
    quizQuestions: ['quizQuestion', 'id', 'quizId', true],
    assignments: ['assignment', 'id', 'quizId', true],
    quizAttempts: ['quizAttempt', 'id', 'quizId', true]
  },
  quizQuestion: {
    quiz: ['quiz', 'quizId', 'id', false],
    question: ['question', 'questionId', 'id', false]
  },
  assignment: {
    quiz: ['quiz', 'quizId', 'id', false],
    classroom: ['classroom', 'classroomId', 'id', false],
    assignedToStudent: ['user', 'assignedToStudentId', 'id', false],
    quizAttempts: ['quizAttempt', 'id', 'assignmentId', true]
  },
  quizAttempt: {
    quiz: ['quiz', 'quizId', 'id', false],
    assignment: ['assignment', 'assignmentId', 'id', false],
    student: ['user', 'studentId', 'id', false],
    studentAnswers: ['studentQuestionAnswer', 'id', 'attemptId', true]
  },
  studentQuestionAnswer: {
    attempt: ['quizAttempt', 'attemptId', 'id', false],
    student: ['user', 'studentId', 'id', false],
    question: ['question', 'questionId', 'id', false]
  },
  revisionPost: {
    subject: ['subject', 'subjectId', 'id', false],
    createdBy: ['user', 'createdById', 'id', false],
    interactions: ['revisionInteraction', 'id', 'postId', true],
    reviews: ['revisionReview', 'id', 'postId', true]
  },
  revisionInteraction: {
    post: ['revisionPost', 'postId', 'id', false],
    student: ['user', 'studentId', 'id', false]
  },
  revisionReview: {
    post: ['revisionPost', 'postId', 'id', false],
    student: ['user', 'studentId', 'id', false]
  },
  meeting: {
    createdBy: ['user', 'createdById', 'id', false],
    recipient: ['user', 'recipientId', 'id', false],
    classroom: ['classroom', 'classroomId', 'id', false]
  }
};

const cascadeRelations = [
  ['user', 'classroom', 'teacherId', 'cascade'],
  ['user', 'classEnrollment', 'studentId', 'cascade'],
  ['user', 'quiz', 'createdById', 'cascade'],
  ['user', 'assignment', 'assignedToStudentId', 'cascade'],
  ['user', 'quizAttempt', 'studentId', 'cascade'],
  ['user', 'studentQuestionAnswer', 'studentId', 'cascade'],
  ['user', 'revisionPost', 'createdById', 'cascade'],
  ['user', 'revisionInteraction', 'studentId', 'cascade'],
  ['user', 'revisionReview', 'studentId', 'cascade'],
  ['user', 'meeting', 'createdById', 'cascade'],
  ['user', 'meeting', 'recipientId', 'cascade'],
  ['classroom', 'classEnrollment', 'classroomId', 'cascade'],
  ['classroom', 'subject', 'classroomId', 'cascade'],
  ['classroom', 'assignment', 'classroomId', 'cascade'],
  ['classroom', 'meeting', 'classroomId', 'cascade'],
  ['subject', 'question', 'subjectId', 'cascade'],
  ['subject', 'quiz', 'subjectId', 'cascade'],
  ['subject', 'revisionPost', 'subjectId', 'cascade'],
  ['question', 'quizQuestion', 'questionId', 'cascade'],
  ['question', 'studentQuestionAnswer', 'questionId', 'cascade'],
  ['quiz', 'quizQuestion', 'quizId', 'cascade'],
  ['quiz', 'assignment', 'quizId', 'cascade'],
  ['quiz', 'quizAttempt', 'quizId', 'cascade'],
  ['assignment', 'quizAttempt', 'assignmentId', 'setNull'],
  ['quizAttempt', 'studentQuestionAnswer', 'attemptId', 'cascade'],
  ['revisionPost', 'revisionInteraction', 'postId', 'cascade'],
  ['revisionPost', 'revisionReview', 'postId', 'cascade']
];

const defaults = {
  user: { approvalStatus: 'APPROVED', approvedAt: null, approvedById: null, avatarUrl: null, createdAt: 'now' },
  classroom: { createdAt: 'now' },
  classEnrollment: { enrolledAt: 'now' },
  question: { difficulty: 'MEDIUM' },
  quiz: { description: null, timeLimitMinutes: 30, totalMarks: 10 },
  quizQuestion: { marks: 1 },
  assignment: { assignedToStudentId: null, createdAt: 'now' },
  quizAttempt: { assignmentId: null, timeSpentSeconds: null, submittedAt: 'now' },
  revisionPost: { content: '', mediaUrl: null, mediaType: null, createdAt: 'now' },
  revisionInteraction: { liked: false, saved: false, priority: false, understanding: null, updatedAt: 'now' },
  revisionReview: { createdAt: 'now', updatedAt: 'now' },
  meeting: { recipientId: null, classroomId: null, description: '', status: 'SCHEDULED', scheduledAt: null, preferredAt: null, durationMins: 30, location: null, meetingUrl: null, createdAt: 'now', updatedAt: 'now' }
};

let state;
let loading;
let databaseInitialization;
let writeQueue = Promise.resolve();
const databasePool = process.env.DATABASE_URL
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000
  })
  : null;

const clone = value => JSON.parse(JSON.stringify(value));
const valueOf = value => value instanceof Date ? value.toISOString() : value;
const getUniqueFields = where => {
  const flattened = {};
  for (const [key, value] of Object.entries(where || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(flattened, value);
    } else {
      flattened[key] = value;
    }
  }
  return flattened;
};

async function load() {
  if (databasePool) {
    if (!databaseInitialization) {
      databaseInitialization = (async () => {
        await databasePool.query(`
          CREATE TABLE IF NOT EXISTS reelearn_state (
            id SMALLINT PRIMARY KEY CHECK (id = 1),
            data JSONB NOT NULL
          )
        `);
        await databasePool.query(
          'INSERT INTO reelearn_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING',
          [JSON.stringify(emptyData())]
        );
      })().catch(error => {
        databaseInitialization = null;
        throw error;
      });
    }
    await databaseInitialization;
    const { rows } = await databasePool.query('SELECT data FROM reelearn_state WHERE id = 1');
    if (!rows[0]) throw new Error('PostgreSQL application state row is missing');
    state = { ...emptyData(), ...rows[0].data };
    for (const model of models) {
      if (!Array.isArray(state[model])) throw new Error(`Invalid PostgreSQL store: "${model}" must be an array`);
    }
    return;
  }

  if (process.env.VERCEL) {
    throw new Error('DATABASE_URL must be configured for the Vercel API deployment');
  }
  if (state) return;
  if (!loading) {
    loading = (async () => {
      await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
      try {
        const content = await fs.promises.readFile(storePath, 'utf8');
        const parsed = JSON.parse(content);
        state = { ...emptyData(), ...parsed };
        for (const model of models) {
          if (!Array.isArray(state[model])) throw new Error(`Invalid JSON store: "${model}" must be an array`);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        state = emptyData();
        await persist(state);
      }
    })();
  }
  await loading;
}

async function persist(data) {
  const tempPath = `${storePath}.${process.pid}.tmp`;
  await fs.promises.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.promises.rename(tempPath, storePath);
}

function mutate(work) {
  const task = writeQueue.then(async () => {
    await load();
    if (databasePool) {
      const connection = await databasePool.connect();
      try {
        await connection.query('BEGIN');
        const { rows } = await connection.query(
          'SELECT data FROM reelearn_state WHERE id = 1 FOR UPDATE'
        );
        if (!rows[0]) throw new Error('PostgreSQL application state row is missing');
        const draft = { ...emptyData(), ...rows[0].data };
        const result = await work(draft);
        await connection.query(
          'UPDATE reelearn_state SET data = $1::jsonb WHERE id = 1',
          [JSON.stringify(draft)]
        );
        await connection.query('COMMIT');
        state = draft;
        return clone(result);
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      } finally {
        connection.release();
      }
    }
    const draft = clone(state);
    const result = await work(draft);
    await persist(draft);
    state = draft;
    return clone(result);
  });
  writeQueue = task.catch(() => {});
  return task;
}

function compare(left, operator, right) {
  left = valueOf(left);
  right = valueOf(right);
  if (right && typeof right === 'object' && !Array.isArray(right) && !(right instanceof Date)) {
    return Object.entries(right).every(([op, value]) => {
      value = valueOf(value);
      switch (op) {
        case 'equals': return compare(left, 'equals', value);
        case 'in': return value.some(item => compare(left, 'equals', item));
        case 'notIn': return !value.some(item => compare(left, 'equals', item));
        case 'not': return !compare(left, 'equals', value);
        case 'contains': return typeof left === 'string' && left.includes(value);
        case 'startsWith': return typeof left === 'string' && left.startsWith(value);
        case 'endsWith': return typeof left === 'string' && left.endsWith(value);
        case 'gt': return left > value;
        case 'gte': return left >= value;
        case 'lt': return left < value;
        case 'lte': return left <= value;
        default: return false;
      }
    });
  }
  switch (operator) {
    case 'equals': return left === right;
    case 'gt': return left > right;
    case 'gte': return left >= right;
    case 'lt': return left < right;
    case 'lte': return left <= right;
    default: return false;
  }
}

function relationRows(data, model, row, relation) {
  const definition = relations[model]?.[relation];
  if (!definition) return undefined;
  const [target, localKey, foreignKey, many] = definition;
  const rows = data[target].filter(item => row[localKey] != null && item[foreignKey] === row[localKey]);
  return many ? rows : (rows[0] || null);
}

function matches(data, model, row, where = {}) {
  if (!row) return false;
  return Object.entries(where || {}).every(([key, expected]) => {
    if (key === 'AND') return (Array.isArray(expected) ? expected : [expected]).every(item => matches(data, model, row, item));
    if (key === 'OR') return (Array.isArray(expected) ? expected : [expected]).some(item => matches(data, model, row, item));
    if (key === 'NOT') return !(Array.isArray(expected) ? expected : [expected]).some(item => matches(data, model, row, item));

    if (relations[model]?.[key]) {
      const value = relationRows(data, model, row, key);
      const [target, , , many] = relations[model][key];
      if (many) {
        if (Object.hasOwn(expected || {}, 'some')) return value.some(item => matches(data, target, item, expected.some));
        if (Object.hasOwn(expected || {}, 'none')) return !value.some(item => matches(data, target, item, expected.none));
        if (Object.hasOwn(expected || {}, 'every')) return value.every(item => matches(data, target, item, expected.every));
        return value.some(item => matches(data, target, item, expected));
      }
      if (expected === null || expected?.is === null) return value === null;
      const filter = expected?.is ?? expected?.isNot;
      if (expected && Object.hasOwn(expected, 'isNot')) return !matches(data, target, value, filter);
      return matches(data, target, value, filter || expected);
    }
    return compare(row[key], 'equals', expected);
  });
}

function sortRows(data, model, rows, orderBy) {
  const orderings = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  if (!orderings.length) return rows;
  return rows.sort((a, b) => {
    for (const ordering of orderings) {
      const [key, requestedOrder] = Object.entries(ordering)[0] || [];
      let value = requestedOrder;
      let left = a;
      let right = b;
      let field = key;
      if (relations[model]?.[key]) {
        const nested = Object.entries(value)[0] || [];
        field = nested[0];
        left = relationRows(data, model, a, key);
        right = relationRows(data, model, b, key);
        if (Array.isArray(left)) left = left[0];
        if (Array.isArray(right)) right = right[0];
        value = nested[1];
      }
      const av = left?.[field];
      const bv = right?.[field];
      if (av === bv) continue;
      const result = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : 1;
      return value === 'desc' ? -result : result;
    }
    return 0;
  });
}

function project(data, model, row, args = {}) {
  if (!row) return null;
  const result = args.select
    ? {}
    : { ...row };
  if (args.select) {
    for (const [key, selected] of Object.entries(args.select)) {
      if (!selected) continue;
      if (relations[model]?.[key]) {
        result[key] = projectRelation(data, model, row, key, selected);
      } else if (key === '_count') {
        result._count = countRelations(data, model, row, selected);
      } else {
        result[key] = row[key];
      }
    }
  }
  if (args.include) {
    for (const [key, included] of Object.entries(args.include)) {
      if (!included) continue;
      if (relations[model]?.[key]) result[key] = projectRelation(data, model, row, key, included);
      else if (key === '_count') result._count = countRelations(data, model, row, included);
    }
  }
  return result;
}

function projectRelation(data, model, row, relation, options) {
  const definition = relations[model][relation];
  const [target, , , many] = definition;
  let related = relationRows(data, model, row, relation);
  if (many) {
    const args = options === true ? {} : options;
    related = related.filter(item => matches(data, target, item, args.where));
    related = sortRows(data, target, related, args.orderBy);
    if (args.take != null) related = related.slice(0, args.take);
    return related.map(item => project(data, target, item, args));
  }
  return project(data, target, related, options === true ? {} : options);
}

function countRelations(data, model, row, options) {
  const selection = options.select || {};
  const counts = {};
  for (const [relation, selected] of Object.entries(selection)) {
    if (selected && relations[model]?.[relation]) {
      const related = relationRows(data, model, row, relation);
      counts[relation] = Array.isArray(related) ? related.length : Number(!!related);
    }
  }
  return counts;
}

function uniqueError(model) {
  const error = new Error(`Unique constraint failed for ${model}`);
  error.code = 'P2002';
  return error;
}

function notFoundError(model) {
  const error = new Error(`Record to update or delete does not exist in ${model}`);
  error.code = 'P2025';
  return error;
}

function findRaw(data, model, where) {
  const criteria = getUniqueFields(where);
  return data[model].find(row => Object.entries(criteria).every(([key, value]) => compare(row[key], 'equals', value))) || null;
}

function createRaw(data, model, args) {
  const now = new Date().toISOString();
  const row = { ...(defaults[model] || {}) };
  for (const [key, value] of Object.entries(args.data || {})) {
    if (key !== 'quizQuestions') row[key] = valueOf(value);
  }
  for (const [key, value] of Object.entries(row)) {
    if (value === 'now') row[key] = now;
  }
  if (!row.id && model !== 'quizQuestion') row.id = crypto.randomUUID();
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) delete row[key];
  }
  if (model === 'quizQuestion') {
    if (data.quizQuestion.some(item => item.quizId === row.quizId && item.questionId === row.questionId)) throw uniqueError(model);
  } else if (row.id && data[model].some(item => item.id === row.id)) {
    throw uniqueError(model);
  }
  if (model === 'user' && data.user.some(item => item.email === row.email)) throw uniqueError(model);
  if (model === 'classroom' && data.classroom.some(item => item.joinCode === row.joinCode)) throw uniqueError(model);
  if (model === 'classEnrollment' && data.classEnrollment.some(item => item.classroomId === row.classroomId && item.studentId === row.studentId)) throw uniqueError(model);
  if (model === 'revisionInteraction' && data.revisionInteraction.some(item => item.postId === row.postId && item.studentId === row.studentId)) throw uniqueError(model);
  if (model === 'revisionReview' && data.revisionReview.some(item => item.postId === row.postId && item.studentId === row.studentId)) throw uniqueError(model);
  data[model].push(row);

  if (model === 'quiz' && args.data?.quizQuestions?.create) {
    const nested = Array.isArray(args.data.quizQuestions.create) ? args.data.quizQuestions.create : [args.data.quizQuestions.create];
    for (const item of nested) createRaw(data, 'quizQuestion', { data: { ...item, quizId: row.id } });
  }
  return project(data, model, row, args);
}

function updateRaw(data, model, args) {
  const row = findRaw(data, model, args.where);
  if (!row) throw notFoundError(model);
  Object.assign(row, Object.fromEntries(Object.entries(args.data || {}).filter(([, value]) => value !== undefined).map(([key, value]) => [key, valueOf(value)])));
  if (defaults[model]?.updatedAt) row.updatedAt = new Date().toISOString();
  return project(data, model, row, args);
}

function deleteRaw(data, model, args) {
  const row = findRaw(data, model, args.where);
  if (!row) throw notFoundError(model);
  deleteRecord(data, model, row);
  return project(data, model, row, args);
}

function deleteRecord(data, model, row) {
  for (const [parent, child, foreignKey, behavior] of cascadeRelations) {
    if (parent !== model || row.id == null) continue;
    if (behavior === 'setNull') {
      data[child].forEach(item => {
        if (item[foreignKey] === row.id) item[foreignKey] = null;
      });
    } else {
      data[child].filter(item => item[foreignKey] === row.id).slice().forEach(item => deleteRecord(data, child, item));
    }
  }
  const index = data[model].indexOf(row);
  if (index !== -1) data[model].splice(index, 1);
}

function createClient(getData, runMutation, runQuery) {
  const client = {};
  for (const model of models) {
    client[model] = {
      findUnique: args => runQuery(data => project(data, model, findRaw(data, model, args.where), args)),
      findFirst: args => runQuery(data => {
        let rows = data[model].filter(row => matches(data, model, row, args.where));
        rows = sortRows(data, model, rows, args.orderBy);
        return project(data, model, rows[0] || null, args);
      }),
      findMany: args => runQuery(data => {
        let rows = data[model].filter(row => matches(data, model, row, args?.where));
        rows = sortRows(data, model, rows, args?.orderBy);
        if (args?.skip) rows = rows.slice(args.skip);
        if (args?.take != null) rows = rows.slice(0, args.take);
        return rows.map(row => project(data, model, row, args));
      }),
      count: args => runQuery(data => data[model].filter(row => matches(data, model, row, args?.where)).length),
      create: args => runMutation(data => createRaw(data, model, args)),
      createMany: args => runMutation(data => {
        const rows = Array.isArray(args.data) ? args.data : [args.data];
        let count = 0;
        for (const row of rows) {
          try {
            createRaw(data, model, { data: row });
            count++;
          } catch (error) {
            if (!args.skipDuplicates || error.code !== 'P2002') throw error;
          }
        }
        return { count };
      }),
      update: args => runMutation(data => updateRaw(data, model, args)),
      upsert: args => runMutation(data => {
        const existing = findRaw(data, model, args.where);
        return existing
          ? updateRaw(data, model, { ...args, data: args.update })
          : createRaw(data, model, { ...args, data: args.create });
      }),
      delete: args => runMutation(data => deleteRaw(data, model, args)),
      deleteMany: args => runMutation(data => {
        const rows = data[model].filter(row => matches(data, model, row, args?.where));
        rows.slice().forEach(row => deleteRecord(data, model, row));
        return { count: rows.length };
      })
    };
  }
  client.$transaction = callback => runMutation(async data => {
    const transactionClient = createClient(
      () => data,
      work => Promise.resolve(work(data)),
      work => Promise.resolve(work(data))
    );
    return callback(transactionClient);
  });
  client.$health = async () => {
    await load();
    return { storage: databasePool ? 'postgresql' : 'local-json' };
  };
  client.$disconnect = async () => {
    if (databasePool) await databasePool.end();
  };
  return client;
}

module.exports = createClient(
  () => state,
  work => mutate(work),
  async work => {
    await writeQueue;
    await load();
    return clone(work(state));
  }
);
