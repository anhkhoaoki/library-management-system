import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';

// UC-ACC-04
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const profile = await usersService.getProfile(userId);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { fullName, phone, avatarUrl } = req.body;
    const updated = await usersService.updateProfile(userId, { fullName, phone, avatarUrl });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// UC-ACC-05
export const getBorrowHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let userId = req.user!.userId;
    if ((req.user!.role === 'LIBRARIAN' || req.user!.role === 'ADMIN') && req.query.userId) {
      userId = req.query.userId as string;
    }
    const query = {
      status: req.query.status as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
    };
    const result = await usersService.getBorrowHistory(userId, query);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const lookupUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const user = await usersService.lookupUserByCode(code);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let userId = req.user!.userId;
    if ((req.user!.role === 'LIBRARIAN' || req.user!.role === 'ADMIN') && req.query.userId) {
      userId = req.query.userId as string;
    }
    const stats = await usersService.getDashboardStats(userId);
    res.status(200).json({ success: true, data: stats });
  } catch (err) { next(err); }
};

export const getReservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let userId = req.user!.userId;
    if ((req.user!.role === 'LIBRARIAN' || req.user!.role === 'ADMIN') && req.query.userId) {
      userId = req.query.userId as string;
    }
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const result = await usersService.getReservations(userId, page, limit);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getFines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let userId = req.user!.userId;
    if ((req.user!.role === 'LIBRARIAN' || req.user!.role === 'ADMIN') && req.query.userId) {
      userId = req.query.userId as string;
    }
    const fines = await usersService.getFines(userId);
    res.status(200).json({ success: true, data: fines });
  } catch (err) { next(err); }
};
