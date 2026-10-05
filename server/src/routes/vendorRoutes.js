import express from 'express';
import { getVendors, getVendorById, createVendor, updateVendor } from '../controllers/vendorController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getVendors);
router.get('/:id', getVendorById);
router.post('/', authorizeRoles('ADMIN', 'FINANCE_STAFF'), createVendor);
router.put('/:id', authorizeRoles('ADMIN', 'FINANCE_STAFF'), updateVendor);

export default router;
