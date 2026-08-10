import prisma from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import { UserStatus, AuditAction, BookStatus, BorrowStatus, FineStatus } from '@prisma/client';
import { Role } from '../../types/roles';
import fs from 'fs';
import path from 'path';

// Define backup directory
const BACKUP_DIR = path.join(process.cwd(), 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const formatBytes = (sizeBytes: number) => {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getBackupFilePath = (filename: string) => path.join(BACKUP_DIR, filename);

// Helper format ngày theo giờ địa phương (tránh lệch ngày do UTC ISOString)
const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (d: Date): string => {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${month}`;
};

const buildTrendSeries = (
  days: number,
  borrowRecords: Array<{ borrowedAt?: Date | string | null }>,
  returnRecords: Array<{ returnedAt?: Date | string | null }>
) => {
  const trendMap: Record<string, { date: string; label: string; borrows: number; returns: number }> = {};
  const today = new Date();

  // Tạo chuỗi ngày liên tục từ (days - 1) ngày trước đến hôm nay
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatDateKey(date);
    const labelStr = formatDateLabel(date);

    trendMap[dateStr] = {
      date: dateStr,
      label: labelStr,
      borrows: 0,
      returns: 0,
    };
  }

  borrowRecords.forEach((record) => {
    const borrowedAt = record.borrowedAt;
    if (!borrowedAt) return;
    const dateStr = formatDateKey(new Date(borrowedAt));
    if (trendMap[dateStr]) {
      trendMap[dateStr].borrows += 1;
    }
  });

  returnRecords.forEach((record) => {
    const returnedAt = record.returnedAt;
    if (!returnedAt) return;
    const dateStr = formatDateKey(new Date(returnedAt));
    if (trendMap[dateStr]) {
      trendMap[dateStr].returns += 1;
    }
  });

  return Object.values(trendMap);
};

const getLatestBackupSnapshot = () => {
  if (!fs.existsSync(BACKUP_DIR)) return null;

  const files = fs.readdirSync(BACKUP_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort((a, b) => b.localeCompare(a));

  if (files.length === 0) return null;

  const latestFile = files[0];
  const latestPath = getBackupFilePath(latestFile);

  try {
    const parsed = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
    return {
      filename: latestFile,
      metadata: parsed.metadata ?? {},
      recordCounts: parsed.recordCounts ?? {},
      users: Array.isArray(parsed.users) ? parsed.users : [],
      books: Array.isArray(parsed.books) ? parsed.books : [],
      physicalCopies: Array.isArray(parsed.physicalCopies) ? parsed.physicalCopies : [],
      borrowRecords: Array.isArray(parsed.borrowRecords) ? parsed.borrowRecords : [],
      fines: Array.isArray(parsed.fines) ? parsed.fines : [],
      branches: Array.isArray(parsed.branches) ? parsed.branches : [],
      systemConfigs: Array.isArray(parsed.systemConfigs) ? parsed.systemConfigs : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    };
  } catch {
    return null;
  }
};

// ─── UC-ACC-06: List All Users ───────────────────────────────
export const listUsers = async (query: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.role && Object.values(Role).includes(query.role as Role)) {
    where['role'] = { name: query.role };
  }
  if (query.status && Object.values(UserStatus).includes(query.status as UserStatus)) {
    where['status'] = query.status as UserStatus;
  }
  if (query.search) {
    where['OR'] = [
      { fullName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: { select: { name: true } }, status: true, lastLoginAt: true, createdAt: true,
        branch: { select: { id: true, name: true } },
      },
    }),
  ]);

  const mappedUsers = users.map((user) => ({
    ...user,
    role: user.role.name,
  }));

  return {
    data: mappedUsers,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── UC-ACC-06: Update User Status (Lock/Unlock) ─────────────
export const updateUserStatus = async (
  targetUserId: string,
  requesterId: string,
  newStatus: UserStatus
) => {
  if (targetUserId === requesterId) {
    throw createError('Bạn không thể tự khóa tài khoản của chính mình', 422);
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw createError('Người dùng không tồn tại', 404);

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { status: newStatus },
    select: { id: true, email: true, status: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: requesterId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: targetUserId,
      oldData: { status: target.status },
      newData: { status: newStatus },
      riskLevel: newStatus === UserStatus.BANNED ? 'CRITICAL' : 'WARNING',
    },
  });

  return updated;
};

// ─── UC-ACC-06: Change User Role ─────────────────────────────
export const updateUserRole = async (
  targetUserId: string,
  requesterId: string,
  newRole: Role
) => {
  if (targetUserId === requesterId) {
    throw createError('Bạn không thể thay đổi quyền của chính mình', 422);
  }

  const roleRecord = await prisma.role.findUnique({ where: { name: newRole } });
  if (!roleRecord) throw createError('Vai trò không hợp lệ', 404);

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { role: true },
  });
  if (!target) throw createError('Người dùng không tồn tại', 404);

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { roleId: roleRecord.id },
    select: { id: true, email: true, role: { select: { name: true } } },
  });

  await prisma.auditLog.create({
    data: {
      userId: requesterId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: targetUserId,
      oldData: { role: target.role.name },
      newData: { role: newRole },
      riskLevel: 'WARNING',
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    role: updated.role.name,
  };
};

// ─── UC-ADM-01: Dashboard Stats ──────────────────────────────
export const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fallbackSnapshot = getLatestBackupSnapshot();

  let overview = {
    totalBooks: 0,
    totalUsers: 0,
    activeBorrows: 0,
    overdueCount: 0,
    newBorrowsToday: 0,
    returnsToday: 0,
    pendingFines: 0,
    totalPendingFineAmount: 0,
  };
  let weeklyTrend: Array<{ date: string; label: string; borrows: number; returns: number }> = [];
  let trend14: Array<{ date: string; label: string; borrows: number; returns: number }> = [];
  let trend21: Array<{ date: string; label: string; borrows: number; returns: number }> = [];
  let monthlyTrend: Array<{ date: string; label: string; borrows: number; returns: number }> = [];
  let recentActivities: Array<Record<string, unknown>> = [];
  let topBooks: Array<any> = [];
  let dataSource = 'database';
  let notice: string | null = null;

  try {
    const [
      totalBooks,
      totalUsers,
      activeBorrows,
      overdueCount,
      newBorrowsToday,
      returnsToday,
      pendingFines,
      totalFinesAmount,
    ] = await Promise.all([
      prisma.book.count({ where: { status: { not: BookStatus.DELETED } } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.borrowRecord.count({ where: { status: BorrowStatus.ACTIVE } }),
      prisma.borrowRecord.count({
        where: { status: BorrowStatus.ACTIVE, dueDate: { lt: new Date() } },
      }),
      prisma.borrowRecord.count({ where: { borrowedAt: { gte: today } } }),
      prisma.borrowRecord.count({ where: { returnedAt: { gte: today } } }),
      prisma.fine.count({ where: { status: FineStatus.PENDING } }),
      prisma.fine.aggregate({
        where: { status: FineStatus.PENDING },
        _sum: { totalAmount: true },
      }),
    ]);

    overview = {
      totalBooks,
      totalUsers,
      activeBorrows,
      overdueCount,
      newBorrowsToday,
      returnsToday,
      pendingFines,
      totalPendingFineAmount: Number(totalFinesAmount._sum.totalAmount ?? 0),
    };

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 29);
    monthAgo.setHours(0, 0, 0, 0);

    const [recentBorrowsMonth, recentReturnsMonth] = await Promise.all([
      prisma.borrowRecord.findMany({
        where: { borrowedAt: { gte: monthAgo } },
        select: { borrowedAt: true },
      }),
      prisma.borrowRecord.findMany({
        where: { returnedAt: { gte: monthAgo }, status: BorrowStatus.RETURNED },
        select: { returnedAt: true },
      }),
    ]);

    weeklyTrend = buildTrendSeries(7, recentBorrowsMonth, recentReturnsMonth);
    trend14 = buildTrendSeries(14, recentBorrowsMonth, recentReturnsMonth);
    trend21 = buildTrendSeries(21, recentBorrowsMonth, recentReturnsMonth);
    monthlyTrend = buildTrendSeries(30, recentBorrowsMonth, recentReturnsMonth);

    recentActivities = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true } },
      },
    });

    const mostBorrowedCopies = await prisma.borrowRecord.groupBy({
      by: ['physicalCopyId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 100,
    });

    const bookMap = new Map();
    await Promise.all(
      mostBorrowedCopies.map(async (record) => {
        const copy = await prisma.physicalCopy.findUnique({
          where: { id: record.physicalCopyId },
          include: { book: { include: { category: true } } },
        });
        if (copy && copy.book) {
          const bookId = copy.book.id;
          if (bookMap.has(bookId)) {
            bookMap.get(bookId).count += record._count.id;
          } else {
            bookMap.set(bookId, {
              id: bookId,
              title: copy.book.title,
              category: copy.book.category?.name || 'Khác',
              count: record._count.id,
              image: copy.book.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=200'
            });
          }
        }
      })
    );
    
    topBooks = Array.from(bookMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);

    if (fallbackSnapshot && Object.values(overview).every((value) => Number(value) === 0)) {
      throw new Error('No live data available');
    }
  } catch (error) {
    if (fallbackSnapshot) {
      dataSource = 'backup-fallback';
      notice = 'Kết nối cơ sở dữ liệu hiện không khả dụng nên hệ thống đang hiển thị dữ liệu từ bản sao lưu gần nhất.';

      overview = {
        totalBooks: fallbackSnapshot.books.length,
        totalUsers: fallbackSnapshot.users.length,
        activeBorrows: fallbackSnapshot.borrowRecords.filter((record: { status?: string }) => record.status === 'ACTIVE').length,
        overdueCount: fallbackSnapshot.borrowRecords.filter((record: { status?: string; dueDate?: string }) => record.status === 'ACTIVE' && record.dueDate && new Date(record.dueDate) < new Date()).length,
        newBorrowsToday: fallbackSnapshot.borrowRecords.filter((record: { borrowedAt?: string }) => record.borrowedAt && new Date(record.borrowedAt) >= today).length,
        returnsToday: fallbackSnapshot.borrowRecords.filter((record: { returnedAt?: string }) => record.returnedAt && new Date(record.returnedAt) >= today).length,
        pendingFines: fallbackSnapshot.fines.filter((fine: { status?: string }) => fine.status === 'PENDING').length,
        totalPendingFineAmount: fallbackSnapshot.fines
          .filter((fine: { status?: string }) => fine.status === 'PENDING')
          .reduce((sum: number, fine: { totalAmount?: number | string }) => sum + Number(fine.totalAmount ?? 0), 0),
      };

      const fallbackBorrows = fallbackSnapshot.borrowRecords.map((record: { borrowedAt?: string | Date | null }) => ({ borrowedAt: record.borrowedAt ? new Date(record.borrowedAt) : null }));
      const fallbackReturns = fallbackSnapshot.borrowRecords
          .filter((record: { status?: string; returnedAt?: string | Date | null }) => record.status === 'RETURNED')
          .map((record: { returnedAt?: string | Date | null }) => ({ returnedAt: record.returnedAt ? new Date(record.returnedAt) : null }));

      weeklyTrend = buildTrendSeries(7, fallbackBorrows, fallbackReturns);
      trend14 = buildTrendSeries(14, fallbackBorrows, fallbackReturns);
      trend21 = buildTrendSeries(21, fallbackBorrows, fallbackReturns);
      monthlyTrend = buildTrendSeries(30, fallbackBorrows, fallbackReturns);
      recentActivities = fallbackSnapshot.auditLogs.slice(0, 5).map((log: Record<string, unknown>) => log);
    } else {
      notice = 'Hiện chưa có dữ liệu live hoặc bản sao lưu nào để hiển thị.';
    }
  }

  return {
    overview,
    weeklyTrend,
    trend14,
    trend21,
    monthlyTrend,
    recentActivities,
    topBooks,
    generatedAt: new Date().toISOString(),
    dataSource,
    chartDescription: 'Biểu đồ sử dụng dữ liệu mượn sách thực tế từ cơ sở dữ liệu thư viện hoặc bản sao lưu gần nhất khi CSDL không khả dụng.',
    notice,
  };
};

// ─── UC-ADM-04: Get System Config ────────────────────────────
export const getSystemConfig = async () => {
  const configs = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
  return configs;
};

// ─── UC-ADM-04: Update System Config ─────────────────────────
export const updateSystemConfig = async (
  updates: { key: string; value: string }[],
  updatedById: string
) => {
  const results = [];

  for (const update of updates) {
    const numVal = parseFloat(update.value);
    if (!isNaN(numVal) && numVal < 0) {
      throw createError(`Giá trị cấu hình "${update.key}" không được âm`, 400);
    }

    const existing = await prisma.systemConfig.findUnique({ where: { key: update.key } });
    const oldValue = existing?.value ?? null;

    const config = await prisma.systemConfig.upsert({
      where: { key: update.key },
      update: { value: update.value, updatedById },
      create: { key: update.key, value: update.value, updatedById },
    });

    await prisma.auditLog.create({
      data: {
        userId: updatedById,
        action: AuditAction.CONFIG_CHANGE,
        entityType: 'SystemConfig',
        entityId: update.key,
        oldData: { value: oldValue },
        newData: { value: update.value },
        riskLevel: 'WARNING',
      },
    });

    results.push(config);
  }

  return results;
};

// ─── UC-ADM-05: Branch Management ────────────────────────────
export const getBranches = async () =>
  prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });

export const createBranch = async (data: {
  name: string;
  address: string;
  phone?: string;
  managerId?: string;
}) => prisma.branch.create({ data });

export const updateBranch = async (branchId: string, data: Partial<{
  name: string; address: string; phone: string; managerId: string; isActive: boolean;
}>) => {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw createError('Chi nhánh không tồn tại', 404);
  return prisma.branch.update({ where: { id: branchId }, data });
};

export const deleteBranch = async (branchId: string) => {
  const copiesCount = await prisma.physicalCopy.count({ where: { branchId } });
  const usersCount = await prisma.user.count({ where: { branchId } });

  if (copiesCount > 0 || usersCount > 0) {
    throw createError(
      `Không thể xóa chi nhánh này vì còn ${copiesCount} bản sách và ${usersCount} nhân sự. Vui lòng thuyên chuyển trước khi xóa.`,
      422
    );
  }

  await prisma.branch.update({
    where: { id: branchId },
    data: { isActive: false },
  });

  return { message: 'Đã vô hiệu hóa chi nhánh thành công' };
};

// ─── UC-ADM-06: Audit Logs ────────────────────────────────────
export const getAuditLogs = async (query: {
  userId?: string;
  action?: string;
  riskLevel?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}) => {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 200);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.userId) where['userId'] = query.userId;
  if (query.action) where['action'] = query.action;
  if (query.riskLevel) where['riskLevel'] = query.riskLevel;
  if (query.fromDate || query.toDate) {
    where['createdAt'] = {
      ...(query.fromDate && { gte: new Date(query.fromDate) }),
      ...(query.toDate && { lte: new Date(query.toDate) }),
    };
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, fullName: true, role: true } },
      },
    }),
  ]);

  return {
    data: logs,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── UC-ADM-02: Export Report Data ───────────────────────────
export const getReportData = async (query: {
  type: 'most_borrowed' | 'fines' | 'overdue';
  fromDate?: string;
  toDate?: string;
}) => {
  const dateFilter: Record<string, unknown> = {};
  if (query.fromDate || query.toDate) {
    dateFilter['gte'] = query.fromDate ? new Date(query.fromDate) : undefined;
    dateFilter['lte'] = query.toDate ? new Date(query.toDate) : undefined;
  }

  if (query.type === 'most_borrowed') {
    return prisma.borrowRecord.groupBy({
      by: ['physicalCopyId'],
      where: Object.keys(dateFilter).length ? { borrowedAt: dateFilter } : undefined,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
  }

  if (query.type === 'fines') {
    return prisma.fine.findMany({
      where: Object.keys(dateFilter).length ? { createdAt: dateFilter } : undefined,
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        borrowRecord: {
          select: {
            physicalCopy: { select: { book: { select: { title: true } } } },
          },
        },
      },
      orderBy: { totalAmount: 'desc' },
    });
  }

  if (query.type === 'overdue') {
    return prisma.borrowRecord.findMany({
      where: { status: 'ACTIVE', dueDate: { lt: new Date() } },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        physicalCopy: { select: { book: { select: { title: true, isbn: true } } } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  throw createError('Loại báo cáo không hợp lệ', 400);
};

// ─── UC-ADM-07: Backup Management ──────────────────────────────
export const getBackups = async () => {
  if (!fs.existsSync(BACKUP_DIR)) return { backups: [], summary: { totalBackups: 0, latestBackupAt: null, totalSizeBytes: 0, totalSize: formatBytes(0) } };

  const files = fs.readdirSync(BACKUP_DIR)
    .filter((file) => file.endsWith('.json') || file.endsWith('.zip'))
    .sort((a, b) => b.localeCompare(a));

  const backups = files.map((filename, index) => {
    const filePath = getBackupFilePath(filename);
    const stats = fs.statSync(filePath);
    let recordCounts: Record<string, number> = {};
    let metadata: Record<string, unknown> = {};
    let sourceLabel = 'Sao lưu hệ thống';
    let note = 'File này lưu snapshot dữ liệu hiện tại của hệ thống.';

    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      metadata = parsed.metadata ?? {};
      recordCounts = parsed.recordCounts ?? {};
      sourceLabel = metadata.source === 'database' ? 'Snapshot CSDL' : 'Sao lưu hệ thống';
      note = typeof metadata.note === 'string' ? metadata.note : 'File này lưu snapshot dữ liệu hiện tại của hệ thống.';
    } catch {
      // Ignore invalid backup file and keep default values
    }

    return {
      id: index + 1,
      filename,
      time: stats.mtime.toISOString(),
      sizeBytes: stats.size,
      size: formatBytes(stats.size),
      type: sourceLabel,
      status: 'Success',
      isLatest: false,
      recordCounts,
      source: metadata.source === 'database' ? 'database' : 'system',
      note,
      restoreScope: Array.isArray(metadata.restoreScope) ? metadata.restoreScope : ['systemConfigs', 'branches'],
    };
  });

  backups.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  if (backups.length > 0) {
    backups[0].isLatest = true;
  }

  const totalSizeBytes = backups.reduce((sum, backup) => sum + (backup.sizeBytes || 0), 0);
  return {
    backups,
    summary: {
      totalBackups: backups.length,
      latestBackupAt: backups[0]?.time ?? null,
      totalSizeBytes,
      totalSize: formatBytes(totalSizeBytes),
    },
  };
};

export const createBackup = async (userId: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `Backup_ToanHethong_${timestamp}.json`;
  const filePath = getBackupFilePath(filename);

  const [users, books, physicalCopies, borrowRecords, fines, branches, systemConfigs, auditLogs] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, email: true, fullName: true, status: true, roleId: true, branchId: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.book.findMany({
      select: {
        id: true, title: true, authorNames: true, isbn: true, status: true, availableCopies: true, totalCopies: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.physicalCopy.findMany({
      select: {
        id: true, bookId: true, branchId: true, barcode: true, status: true, condition: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.borrowRecord.findMany({
      select: {
        id: true, userId: true, physicalCopyId: true, borrowedAt: true, dueDate: true, returnedAt: true, status: true, renewCount: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.fine.findMany({
      select: {
        id: true, borrowRecordId: true, userId: true, daysOverdue: true, dailyRate: true, totalAmount: true, status: true, createdAt: true,
      },
    }),
    prisma.branch.findMany({
      select: {
        id: true, name: true, address: true, phone: true, managerId: true, isActive: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.systemConfig.findMany(),
    prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, action: true, entityType: true, entityId: true, riskLevel: true, createdAt: true,
      },
    }),
  ]);

  const data = {
    metadata: {
      createdAt: new Date().toISOString(),
      createdBy: userId,
      version: '2.1',
      source: 'database',
      snapshotType: 'database-snapshot',
      note: 'File này lưu snapshot dữ liệu hiện tại của hệ thống thư viện. Khi phục hồi, hệ thống chỉ áp dụng lại cấu hình và danh sách chi nhánh từ file này.',
      restoreScope: ['systemConfigs', 'branches'],
    },
    recordCounts: {
      users: users.length,
      books: books.length,
      physicalCopies: physicalCopies.length,
      borrowRecords: borrowRecords.length,
      fines: fines.length,
      branches: branches.length,
      systemConfigs: systemConfigs.length,
      auditLogs: auditLogs.length,
    },
    users,
    books,
    physicalCopies,
    borrowRecords,
    fines,
    branches,
    systemConfigs,
    auditLogs,
  };

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  await prisma.auditLog.create({
    data: {
      userId,
      action: AuditAction.CONFIG_CHANGE,
      entityType: 'Backup',
      entityId: filename,
      riskLevel: 'WARNING',
    },
  });

  return { filename, message: 'Đã tạo bản sao lưu thực từ cơ sở dữ liệu thành công' };
};

export const restoreBackup = async (filename: string, userId: string) => {
  const filePath = getBackupFilePath(filename);
  if (!fs.existsSync(filePath)) {
    throw createError('File sao lưu không tồn tại', 404);
  }

  const snapshot = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const systemConfigs = snapshot.systemConfigs ?? [];
  const branches = snapshot.branches ?? [];

  await prisma.$transaction(async (tx) => {
    for (const config of systemConfigs) {
      await tx.systemConfig.upsert({
        where: { key: config.key },
        create: {
          key: config.key,
          value: config.value,
          description: config.description ?? null,
          updatedById: config.updatedById ?? null,
        },
        update: {
          value: config.value,
          description: config.description ?? null,
          updatedById: config.updatedById ?? null,
        },
      });
    }

    for (const branch of branches) {
      await tx.branch.upsert({
        where: { id: branch.id },
        create: {
          id: branch.id,
          name: branch.name,
          address: branch.address,
          phone: branch.phone ?? null,
          managerId: branch.managerId ?? null,
          isActive: branch.isActive ?? true,
        },
        update: {
          name: branch.name,
          address: branch.address,
          phone: branch.phone ?? null,
          managerId: branch.managerId ?? null,
          isActive: branch.isActive ?? true,
        },
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: AuditAction.CONFIG_CHANGE,
      entityType: 'Restore',
      entityId: filename,
      riskLevel: 'CRITICAL',
    },
  });

  return {
    message: 'Đã áp dụng cấu hình hệ thống và chi nhánh từ bản sao lưu thành công',
    restoredScope: ['systemConfigs', 'branches'],
  };
};

export const deleteBackup = async (filename: string, userId: string) => {
  const filePath = getBackupFilePath(filename);
  if (!fs.existsSync(filePath)) {
    throw createError('File sao lưu không tồn tại', 404);
  }

  fs.unlinkSync(filePath);

  await prisma.auditLog.create({
    data: {
      userId,
      action: AuditAction.DELETE,
      entityType: 'Backup',
      entityId: filename,
      riskLevel: 'WARNING',
    },
  });

  return { message: 'Đã xoá bản sao lưu khỏi server' };
};