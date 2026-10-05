import express from 'express';
import { getReconciliations, matchReconciliation } from '../controllers/reconciliationController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getReconciliations);
router.post('/match', authorizeRoles('ADMIN', 'FINANCE_STAFF'), matchReconciliation);

export default router;
