import { Request, Response, NextFunction } from 'express';
import * as adminService from './admin.service';
import { UserStatus, Role } from '@prisma/client';

// ─── UC-ACC-06: User Management ──────────────────────────────
export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, status, search, page, limit } = req.query;
    const result = await adminService.listUsers({
      role: role as string, status: status as string, search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!status || !Object.values(UserStatus).includes(status)) {
      res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      return;
    }
    const result = await adminService.updateUserStatus(req.params.id, req.user!.userId, status as UserStatus);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    if (!role || !Object.values(Role).includes(role)) {
      res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' });
      return;
    }
    const result = await adminService.updateUserRole(req.params.id, req.user!.userId, role as Role);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ─── UC-ADM-01: Dashboard ────────────────────────────────────
export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.status(200).json({ success: true, data: stats });
  } catch (err) { next(err); }
};

// ─── UC-ADM-02: Reports ──────────────────────────────────────
export const getReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, fromDate, toDate } = req.query;
    if (!type) { res.status(400).json({ success: false, message: 'type là bắt buộc' }); return; }
    const data = await adminService.getReportData({
      type: type as 'most_borrowed' | 'fines' | 'overdue',
      fromDate: fromDate as string,
      toDate: toDate as string,
    });
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── UC-ADM-04: System Config ────────────────────────────────
export const getSystemConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const configs = await adminService.getSystemConfig();
    res.status(200).json({ success: true, data: configs });
  } catch (err) { next(err); }
};

export const updateSystemConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { updates } = req.body; // Array of { key, value }
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ success: false, message: 'updates phải là mảng không rỗng' });
      return;
    }
    const result = await adminService.updateSystemConfig(updates, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ─── UC-ADM-05: Branch Management ────────────────────────────
export const getBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ success: true, data: await adminService.getBranches() });
  } catch (err) { next(err); }
};

export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, address, phone, managerId } = req.body;
    if (!name || !address) { res.status(400).json({ success: false, message: 'name và address là bắt buộc' }); return; }
    const branch = await adminService.createBranch({ name, address, phone, managerId });
    res.status(201).json({ success: true, data: branch });
  } catch (err) { next(err); }
};

export const updateBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branch = await adminService.updateBranch(req.params.id, req.body);
    res.status(200).json({ success: true, data: branch });
  } catch (err) { next(err); }
};

export const deleteBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.deleteBranch(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ─── UC-ADM-06: Audit Logs ───────────────────────────────────
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.getAuditLogs({
      userId: req.query.userId as string,
      action: req.query.action as string,
      riskLevel: req.query.riskLevel as string,
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};
