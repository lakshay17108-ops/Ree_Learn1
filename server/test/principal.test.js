const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const test = require('node:test');
const bcrypt = require('bcryptjs');

const storePath = path.join(os.tmpdir(), `reelearn-principal-test-${crypto.randomUUID()}.json`);
process.env.JSON_STORE_PATH = storePath;
process.env.PRINCIPAL_EMAIL = 'principal@example.test';
process.env.PRINCIPAL_PASSWORD = 'A-long-test-password-123!';
const { ensureConfiguredPrincipal } = require('../src/lib/principal');
const store = require('../src/lib/store');

test.after(async () => {
  await fs.promises.rm(storePath, { force: true });
  await fs.promises.rm(`${storePath}.${process.pid}.tmp`, { force: true });
  delete process.env.PRINCIPAL_EMAIL;
  delete process.env.PRINCIPAL_PASSWORD;
  delete process.env.JSON_STORE_PATH;
});

test('does not provision a principal for a different email', async () => {
  assert.equal(await ensureConfiguredPrincipal('other@example.test'), null);
  assert.equal(await store.user.count(), 0);
});

test('provisions the configured principal and returns the same account on subsequent calls', async () => {
  const principal = await ensureConfiguredPrincipal('PRINCIPAL@example.test');
  const again = await ensureConfiguredPrincipal('principal@example.test');

  assert.equal(principal.id, again.id);
  assert.equal(principal.email, 'principal@example.test');
  assert.equal(principal.role, 'PRINCIPAL');
  assert.equal(await bcrypt.compare(process.env.PRINCIPAL_PASSWORD, principal.passwordHash), true);
  assert.equal(await store.user.count(), 1);
});
