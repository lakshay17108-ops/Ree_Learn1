const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const store = require('./store');

let provisioning;

const getConfiguredEmail = () => process.env.PRINCIPAL_EMAIL?.trim().toLowerCase();

async function ensureConfiguredPrincipal(email) {
  const configuredEmail = getConfiguredEmail();
  const password = process.env.PRINCIPAL_PASSWORD;

  if (!configuredEmail && !password) return null;
  if (!configuredEmail || !password || password.length < 12) {
    throw new Error('Configure both PRINCIPAL_EMAIL and a PRINCIPAL_PASSWORD of at least 12 characters.');
  }
  if (email?.trim().toLowerCase() !== configuredEmail) return null;

  if (!provisioning) {
    provisioning = (async () => {
      const existing = await store.user.findUnique({ where: { email: configuredEmail } });
      if (existing) {
        if (existing.role !== 'PRINCIPAL') {
          throw new Error('PRINCIPAL_EMAIL belongs to an account that is not a principal.');
        }
        return existing;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const id = `principal-${crypto.createHash('sha256').update(configuredEmail).digest('hex')}`;
      try {
        return await store.user.create({
          data: {
            id,
            name: process.env.PRINCIPAL_NAME?.trim() || 'School Principal',
            email: configuredEmail,
            passwordHash,
            role: 'PRINCIPAL',
            approvalStatus: 'APPROVED'
          }
        });
      } catch (error) {
        if (error.code !== 'P2002') throw error;
        const concurrentlyCreated = await store.user.findUnique({ where: { email: configuredEmail } });
        if (concurrentlyCreated?.role === 'PRINCIPAL') return concurrentlyCreated;
        throw error;
      }
    })().catch(error => {
      provisioning = null;
      throw error;
    });
  }

  return provisioning;
}

module.exports = { ensureConfiguredPrincipal, getConfiguredEmail };
