const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const { createAuthStore, registerUser, loginUser, requireRole } = require('../auth');

const seedUsers = [
  { id: 'u1', email: 'admin@parakh.local', passwordHash: bcrypt.hashSync('StrongPass123!', 10), role: 'admin', name: 'Admin User' }
];

test('registerUser creates a user with a safe role and hashed password', async () => {
  const store = createAuthStore(seedUsers);
  const user = await registerUser(store, {
    name: 'Inspector One',
    email: 'inspector@parakh.local',
    password: 'StrongPass123!',
    role: 'inspector'
  });

  assert.equal(user.role, 'inspector');
  assert.notEqual(user.passwordHash, 'StrongPass123!');
  assert.equal(user.email, 'inspector@parakh.local');
});

test('loginUser verifies password and returns a token payload', async () => {
  const store = createAuthStore([
    { id: 'u2', email: 'inspector@parakh.local', passwordHash: bcrypt.hashSync('StrongPass123!', 10), role: 'inspector', name: 'Inspector One' }
  ]);
  const user = await loginUser(store, 'inspector@parakh.local', 'StrongPass123!');
  assert.equal(user.role, 'inspector');
  assert.ok(user.token);
});

test('requireRole blocks access for unauthorized roles', async () => {
  const req = { user: { role: 'inspector' } };
  const res = { statusCode: 200, json(payload) { this.payload = payload; return this; }, status(code) { this.statusCode = code; return this; } };

  const next = () => { throw new Error('next should not be called'); };
  const result = requireRole('admin')(req, res, next);

  assert.equal(res.statusCode, 403);
  assert.equal(result, undefined);
});
