import { Router } from 'express';
import * as branchController from './branch.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { Role } from '../../types/roles';

const router = Router();

router.use(authenticate);

// UC-CIR-06: Inter-branch Request (Readers & Librarians)
router.post('/transfer-request', branchController.requestTransfer);

// Librarian Management of Transfers
router.get('/transfers/pending', authorize(Role.LIBRARIAN, Role.ADMIN), branchController.getPendingTransfers);
router.patch('/transfers/:id/status', authorize(Role.LIBRARIAN, Role.ADMIN), branchController.updateTransferStatus);

export default router;
