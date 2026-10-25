require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('../node_modules/.prisma/sqlite-client');
const prisma = require('../src/lib/prisma');
const { uploadFile } = require('../src/lib/cloudinary');

const modelNames = [
  'user',
  'classroom',
  'classEnrollment',
  'subject',
  'question',
  'quiz',
  'quizQuestion',
  'assignment',
  'quizAttempt',
  'studentQuestionAnswer',
  'revisionPost',
  'revisionInteraction',
  'revisionReview',
  'meeting'
];

const main = async () => {
  const configuredSqlitePath = process.env.SQLITE_DATABASE_URL?.replace(/^file:/, '');
  const sqlitePath = configuredSqlitePath
    ? path.isAbsolute(configuredSqlitePath) ? configuredSqlitePath : path.resolve(__dirname, configuredSqlitePath)
    : path.resolve(__dirname, 'dev.db');
  const sqliteUrl = `file:${sqlitePath.replace(/\\/g, '/')}`;
  const sqlite = new PrismaClient({ datasources: { db: { url: sqliteUrl } } });

  try {
    for (const modelName of modelNames) {
      const count = await prisma[modelName].count();
      if (count !== 0) {
        throw new Error(`PostgreSQL is not empty (${modelName} contains ${count} rows). Use a fresh database before migrating.`);
      }
    }

    const records = {};
    for (const modelName of modelNames) {
      records[modelName] = await sqlite[modelName].findMany();
    }

    const revisionUploads = path.join(__dirname, '../uploads/revision');
    for (const post of records.revisionPost) {
      if (!post.mediaUrl?.startsWith('/revision/media/')) continue;
      const filename = path.basename(post.mediaUrl);
      if (filename !== post.mediaUrl.slice('/revision/media/'.length)) {
        throw new Error(`Invalid local media path for revision post ${post.id}`);
      }
      const localPath = path.join(revisionUploads, filename);
      if (!fs.existsSync(localPath)) {
        throw new Error(`Missing local media file for revision post ${post.id}: ${localPath}`);
      }
      const uploaded = await uploadFile(localPath, `reelearn/revision/${post.id}`);
      post.mediaUrl = uploaded.secureUrl;
      console.log(`Uploaded revision media for post ${post.id}`);
    }

    await prisma.$transaction(async transaction => {
      for (const modelName of modelNames) {
        const rows = records[modelName];
        if (rows.length) {
          await transaction[modelName].createMany({ data: rows });
        }
      }
    }, { timeout: 600000 });

    for (const modelName of modelNames) {
      const count = await prisma[modelName].count();
      if (count !== records[modelName].length) {
        throw new Error(`Migration verification failed for ${modelName}: expected ${records[modelName].length} rows, found ${count}`);
      }
      console.log(`Migrated ${count} ${modelName} records`);
    }
    console.log('SQLite data migration to PostgreSQL completed successfully.');
  } finally {
    await sqlite.$disconnect();
  }
};

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
