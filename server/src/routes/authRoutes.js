import express from 'express';
import { login, getMe, getUsers } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public login endpoint
router.post('/login', login);

// Authenticated session routes
router.get('/me', authenticateToken, getMe);
router.get('/users', authenticateToken, getUsers);

export default router;
