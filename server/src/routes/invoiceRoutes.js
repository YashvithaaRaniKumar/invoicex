import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  checkDuplicate,
  createInvoice,
  updateInvoice,
} from '../controllers/invoiceController.js';
import {
  verifyInvoice,
  rejectVerification,
} from '../controllers/verificationController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Invoice management routes
router.get('/', getInvoices);
router.post('/check-duplicate', checkDuplicate);
router.get('/:id', getInvoiceById);
router.post('/', authorizeRoles('ADMIN', 'FINANCE_STAFF'), createInvoice);
router.put('/:id', authorizeRoles('ADMIN', 'FINANCE_STAFF'), updateInvoice);

// Verification actions on invoices
router.post('/:id/verify', authorizeRoles('ADMIN', 'FINANCE_STAFF'), verifyInvoice);
router.post('/:id/reject-verification', authorizeRoles('ADMIN', 'FINANCE_STAFF'), rejectVerification);

export default router;
