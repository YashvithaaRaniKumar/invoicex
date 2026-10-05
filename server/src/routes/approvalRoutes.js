import express from 'express';
import {
  getPendingApprovals,
  approveInvoice,
  rejectInvoice,
  requestCorrection,
} from '../controllers/approvalController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/pending', getPendingApprovals);
router.post('/:id/approve', authorizeRoles('ADMIN', 'APPROVER'), approveInvoice);
router.post('/:id/reject', authorizeRoles('ADMIN', 'APPROVER'), rejectInvoice);
router.post('/:id/request-correction', authorizeRoles('ADMIN', 'APPROVER'), requestCorrection);

export default router;
