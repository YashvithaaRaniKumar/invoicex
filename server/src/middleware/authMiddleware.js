import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Middleware
 * Validates Authorization: Bearer <token> header and attaches user payload to req.user
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token after "Bearer"

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'invoicex_platform_secret_jwt_key_2026');
    req.user = decoded; // { id, email, role, full_name, department }
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication session. Please log in again.',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * @param  {...string} allowedRoles - Array of roles permitted (e.g., 'ADMIN', 'FINANCE_STAFF')
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user?.role}' is not authorized to perform this action.`,
      });
    }
    next();
  };
};

export default {
  authenticateToken,
  authorizeRoles,
};
