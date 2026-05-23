import prisma from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import { UserStatus, AuditAction } from '@prisma/client';
import { Role } from '../../types/roles';

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
    prisma.book.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.borrowRecord.count({ where: { status: 'ACTIVE' } }),
    prisma.borrowRecord.count({
      where: { status: 'ACTIVE', dueDate: { lt: new Date() } },
    }),
    prisma.borrowRecord.count({ where: { borrowedAt: { gte: today } } }),
    prisma.borrowRecord.count({ where: { returnedAt: { gte: today } } }),
    prisma.fine.count({ where: { status: 'PENDING' } }),
    prisma.fine.aggregate({
      where: { status: 'PENDING' },
      _sum: { totalAmount: true },
    }),
  ]);

  // Weekly borrow trend (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyTrend = await prisma.borrowRecord.groupBy({
    by: ['borrowedAt'],
    where: { borrowedAt: { gte: weekAgo } },
    _count: { id: true },
  });

  return {
    overview: {
      totalBooks,
      totalUsers,
      activeBorrows,
      overdueCount,
      newBorrowsToday,
      returnsToday,
      pendingFines,
      totalPendingFineAmount: totalFinesAmount._sum.totalAmount ?? 0,
    },
    weeklyTrend,
    recentActivities: await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true } },
      },
    }),
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
    // Validate: value must not be negative number
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
