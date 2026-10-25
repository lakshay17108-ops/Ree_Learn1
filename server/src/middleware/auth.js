const jwt = require('jsonwebtoken');
const prisma = require('../lib/store');
const { ensureConfiguredPrincipal, getConfiguredEmail } = require('../lib/principal');

const verifyToken = async (req, res, next) => {
  let decoded;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const isConfiguredPrincipal = decoded.role === 'PRINCIPAL'
      && decoded.email?.trim().toLowerCase() === getConfiguredEmail();
    const user = isConfiguredPrincipal
      ? await ensureConfiguredPrincipal(decoded.email)
      : await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.role === 'TEACHER' && user.approvalStatus !== 'APPROVED') {
      return res.status(403).json({ error: 'Teacher account is not approved' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
