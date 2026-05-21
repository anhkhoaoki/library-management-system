import { Request, Response, NextFunction } from 'express';
import * as branchService from './branch.service';

export const requestTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookId, toBranchId } = req.body;
    const userId = req.user!.userId;
    const result = await branchService.createTransferRequest({ userId, bookId, toBranchId });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getPendingTransfers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Librarians see transfers for their own branch
    const branchId = req.user!.branchId; 
    const transfers = await branchService.getPendingTransfers(branchId || undefined);
    res.status(200).json({ success: true, data: transfers });
  } catch (err) { next(err); }
};

export const updateTransferStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const processedById = req.user!.userId;
    const result = await branchService.updateTransferStatus(id, status, processedById);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};
