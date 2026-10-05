import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { logAuditEvent } from '../middleware/auditLogger.js';

/**
 * =========================================================================
 * FEATURE: User Authentication & Role-Based Access Control (RBAC)
 * =========================================================================
 * - WHAT IT DOES     : Verifies corporate email & password with bcrypt hash comparison.
 *                      Generates a secure JSON Web Token (JWT) encoding identity and RBAC role.
 * - REACT COMPONENT  : client/src/pages/LoginPage.jsx (handleSubmit)
 * - API CALLED       : axiosClient.post('/auth/login', { email, password })
 * - EXPRESS ROUTE    : POST /api/auth/login in server/src/routes/authRoutes.js
 * - POSTGRESQL TABLES: users, audit_logs
 *
 * 7-STEP ARCHITECTURE FLOW:
 *   1. React UI       : User enters email & password on Login page.
 *   2. Axios API Call : Sends credentials to `/api/auth/login`.
 *   3. Express Route  : Forwards to authController.login.
 *   4. Controller     : Queries PostgreSQL `users` table and compares password hash using bcrypt.
 *   5. PostgreSQL     : Returns user record with role (ADMIN, FINANCE_STAFF, APPROVER).
 *   6. Response       : Returns JWT token and user profile object.
 *   7. React UI Update: Saves token to localStorage, sets user context, and redirects to `/dashboard`.
 * =========================================================================
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email address and password.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const normalizedEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@invoicex.local`;

    // Query user by email
    const result = await query(
      `SELECT id, full_name, email, password_hash, role, department 
       FROM users 
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const rawUser = result.rows[0];

    // Verify bcrypt password hash
    const isMatch = await bcrypt.compare(password, rawUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    const user = sanitizeUser(rawUser);

    // Sign JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
      },
      process.env.JWT_SECRET || 'invoicex_platform_secret_jwt_key_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Audit log
    await logAuditEvent({
      userId: user.id,
      entityName: 'USER',
      entityId: user.id,
      action: 'LOGIN',
      metadata: { email: user.email, role: user.role },
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred during login.',
    });
  }
};

/**
 * Sanitize corporate user persona names and domain
 */
const sanitizeUser = (u) => {
  if (!u) return u;
  let full_name = u.full_name;
  if (!full_name || /Priya\s*Nair/i.test(full_name)) full_name = 'Finance Specialist';
  else if (/Amitabh\s*Verma/i.test(full_name)) full_name = 'AP Approver';
  else if (/Rajesh\s*Sharma/i.test(full_name)) full_name = 'System Administrator';

  let cleanEmail = u.email || '';
  if (cleanEmail.includes('@') && !cleanEmail.endsWith('@invoicex.local')) {
    cleanEmail = cleanEmail.split('@')[0] + '@invoicex.local';
  }
  return {
    ...u,
    full_name,
    email: cleanEmail,
  };
};

/**
 * GET /api/auth/me
 * Retrieves current active user profile
 */
export const getMe = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, full_name, email, role, department, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(result.rows[0]),
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving user.' });
  }
};

/**
 * GET /api/users
 * Returns list of team members for task assignment dropdowns
 */
export const getUsers = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, full_name, email, role, department FROM users ORDER BY full_name ASC'
    );
    return res.status(200).json({
      success: true,
      users: result.rows.map(sanitizeUser),
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch team members.' });
  }
};

export default {
  login,
  getMe,
  getUsers,
};
