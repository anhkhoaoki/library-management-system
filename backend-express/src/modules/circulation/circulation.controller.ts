import { Request, Response, NextFunction } from 'express';
import * as circulationService from './circulation.service';
import { Role } from '../../types/roles';

// UC-CIR-01: Borrow
export const borrowDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, barcode } = req.body;
    if (!userId || !barcode) {
      res.status(400).json({ success: false, message: 'userId và barcode là bắt buộc' });
      return;
    }
    const result = await circulationService.borrowDocument({
      userId,
      barcode,
      processedById: req.user!.userId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// UC-CIR-02 + UC-CIR-03: Return
export const returnDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { barcode } = req.body;
    if (!barcode) {
      res.status(400).json({ success: false, message: 'barcode là bắt buộc' });
      return;
    }
    const result = await circulationService.returnDocument({
      barcode,
      processedById: req.user!.userId,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// UC-CIR-03: Pay Fine
export const payFine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await circulationService.payFine(id, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// UC-CIR-04: Renew
export const renewBorrowRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await circulationService.renewBorrowRecord(id, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// UC-CIR-05: Reserve
export const reserveBook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookId } = req.body;
    if (!bookId) {
      res.status(400).json({ success: false, message: 'bookId là bắt buộc' });
      return;
    }
    const result = await circulationService.reserveBook(req.user!.userId, bookId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const lookupCopy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { barcode } = req.params;
    const copy = await circulationService.lookupCopyByBarcode(barcode);
    res.status(200).json({ success: true, data: copy });
  } catch (err) { next(err); }
};

export const getPendingReservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reservations = await circulationService.getPendingReservations();
    res.status(200).json({ success: true, data: reservations });
  } catch (err) { next(err); }
};

export const returnDocumentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recordId } = req.body;
    const processedById = req.user!.userId;
    const result = await circulationService.returnDocumentById(recordId, processedById);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const cancelReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const role = req.user!.role;
    const result = await circulationService.cancelReservation(id, userId, role);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};
