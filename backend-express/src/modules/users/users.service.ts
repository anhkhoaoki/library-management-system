import prisma from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import { BorrowStatus } from '@prisma/client';

// ─── UC-ACC-04: Get Profile ──────────────────────────────────
export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      branchId: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) throw createError('Người dùng không tồn tại', 404);
  return user;
};

// ─── Lookup User (Librarian/Admin) ───────────────────────────
export const lookupUserByCode = async (code: string) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: code },
        { username: code },
        { studentId: code }, // Assuming studentId was successfully added or will be
        { readerCode: code },
      ],
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      branchId: true,
      studentId: true,
      readerCode: true,
    },
  });

  if (!user) throw createError('Không tìm thấy bạn đọc với mã này', 404);
  return user;
};

// ─── UC-ACC-04: Update Profile ───────────────────────────────
export const updateProfile = async (
  userId: string,
  data: { fullName?: string; phone?: string; avatarUrl?: string }
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createError('Người dùng không tồn tại', 404);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.fullName && { fullName: data.fullName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      avatarUrl: true,
      updatedAt: true,
    },
  });

  return updated;
};

// ─── UC-ACC-05: Borrow History ───────────────────────────────
export const getBorrowHistory = async (
  userId: string,
  query: {
    status?: string;
    page?: number;
    limit?: number;
    fromDate?: string;
    toDate?: string;
  }
) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = { userId };

  if (query.status && Object.values(BorrowStatus).includes(query.status as BorrowStatus)) {
    where['status'] = query.status as BorrowStatus;
  }

  if (query.fromDate || query.toDate) {
    where['borrowedAt'] = {
      ...(query.fromDate && { gte: new Date(query.fromDate) }),
      ...(query.toDate && { lte: new Date(query.toDate) }),
    };
  }

  // Sequential queries (no transactions)
  const total = await prisma.borrowRecord.count({ where });

  const records = await prisma.borrowRecord.findMany({
    where,
    skip,
    take: limit,
    orderBy: { borrowedAt: 'desc' },
    select: {
      id: true,
      borrowedAt: true,
      dueDate: true,
      returnedAt: true,
      status: true,
      renewCount: true,
      physicalCopy: {
        select: {
          barcode: true,
          book: {
            select: {
              id: true,
              title: true,
              authorNames: true,
              coverImageUrl: true,
              isbn: true,
            },
          },
        },
      },
      fine: {
        select: {
          totalAmount: true,
          status: true,
          daysOverdue: true,
        },
      },
    },
  });

  if (total === 0) {
    return {
      message: 'Bạn chưa có lịch sử mượn tài liệu nào',
      data: [],
      pagination: { total: 0, page, limit, totalPages: 0 },
    };
  }

  return {
    data: records,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
