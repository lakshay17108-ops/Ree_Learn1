require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/store');

async function main() {
  const email = process.env.PRINCIPAL_EMAIL?.trim().toLowerCase();
  const password = process.env.PRINCIPAL_PASSWORD;
  const name = process.env.PRINCIPAL_NAME?.trim() || 'School Principal';

  if (!email || !password || password.length < 12) {
    throw new Error('Set PRINCIPAL_EMAIL and a PRINCIPAL_PASSWORD of at least 12 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`An account already exists for ${email}; no account was changed.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const principal = await prisma.user.create({
    data: { name, email, passwordHash, role: 'PRINCIPAL', approvalStatus: 'APPROVED' },
    select: { id: true, name: true, email: true, role: true }
  });

  console.log(`Created principal account: ${principal.email}`);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());