import express from 'express';
import {
  getPayments,
  getApprovedQueue,
  schedulePayment,
  processPayment,
} from '../controllers/paymentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getPayments);
router.get('/approved-queue', getApprovedQueue);
router.post('/schedule', authorizeRoles('ADMIN', 'FINANCE_STAFF'), schedulePayment);
router.post('/:id/process', authorizeRoles('ADMIN', 'FINANCE_STAFF'), processPayment);

export default router;
