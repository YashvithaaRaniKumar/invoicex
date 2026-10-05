import express from 'express';
import {
  getExceptions,
  getExceptionById,
  assignException,
  updateExceptionStatus,
  resolveException,
  reopenException,
} from '../controllers/exceptionController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getExceptions);
router.get('/:id', getExceptionById);
router.post('/:id/assign', authorizeRoles('ADMIN', 'FINANCE_STAFF', 'APPROVER'), assignException);
router.put('/:id/status', authorizeRoles('ADMIN', 'FINANCE_STAFF', 'APPROVER'), updateExceptionStatus);
router.post('/:id/resolve', authorizeRoles('ADMIN', 'FINANCE_STAFF'), resolveException);
router.post('/:id/reopen', authorizeRoles('ADMIN', 'FINANCE_STAFF', 'APPROVER'), reopenException);

export default router;
