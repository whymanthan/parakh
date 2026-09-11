const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const DEFAULT_ROLE = 'inspector';
const ALLOWED_ROLES = new Set(['admin', 'inspector', 'officer', 'manufacturer']);

function createAuthStore(initialUsers = []) {
  return {
    users: initialUsers.map((user) => ({
      id: user.id || `user_${Math.random().toString(36).slice(2, 10)}`,
      name: user.name || '',
      email: user.email || '',
      passwordHash: user.passwordHash || '',
      role: ALLOWED_ROLES.has(user.role) ? user.role : DEFAULT_ROLE,
    })),
  };
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'dev-secret-change-me',
    { expiresIn: '8h' }
  );
}

async function registerUser(store, { name, email, password, role }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password || !String(password).trim()) {
    throw new Error('Email and password are required.');
  }

  const existing = store.users.find((user) => user.email === normalizedEmail);
  if (existing) {
    throw new Error('User already exists.');
  }

  const safeRole = ALLOWED_ROLES.has(role) ? role : DEFAULT_ROLE;
  const user = {
    id: `user_${Math.random().toString(36).slice(2, 10)}`,
    name: String(name || '').trim() || normalizedEmail,
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role: safeRole,
  };

  store.users.push(user);
  return { ...user, passwordHash: undefined };
}

async function loginUser(store, email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = store.users.find((entry) => entry.email === normalizedEmail);
  if (!user) {
    throw new Error('Invalid credentials.');
  }

  const candidatePassword = String(password || '');
  const hashLooksLikeBcrypt = typeof user.passwordHash === 'string' && user.passwordHash.startsWith('$2');
  const passwordMatch = hashLooksLikeBcrypt
    ? await bcrypt.compare(candidatePassword, user.passwordHash)
    : user.passwordHash === candidatePassword;

  if (!passwordMatch) {
    throw new Error('Invalid credentials.');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: signToken(user),
  };
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ error: `Role '${role}' required.` });
      return;
    }
    next();
  };
}

function authMiddlewareOptional(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    req.user = decoded;
    return next();
  } catch (err) {
    req.user = null;
    return next();
  }
}

module.exports = {
  createAuthStore,
  registerUser,
  loginUser,
  authMiddleware,
  authMiddlewareOptional,
  requireRole,
  DEFAULT_ROLE,
  ALLOWED_ROLES,
  signToken,
};
