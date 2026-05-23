import prisma from '../../config/database';
import bcrypt from 'bcryptjs';
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
      role: { select: { name: true } },
      status: true,
      branchId: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) throw createError('Người dùng không tồn tại', 404);
  return {
    ...user,
    role: user.role.name,
  };
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
      role: { select: { name: true } },
      status: true,
      branchId: true,
      studentId: true,
      readerCode: true,
    },
  });

  if (!user) throw createError('Không tìm thấy bạn đọc với mã này', 404);
  return {
    ...user,
    role: user.role.name,
  };
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

  const where: any = { userId };
  if (query.status && Object.values(BorrowStatus).includes(query.status as BorrowStatus)) {
    where.status = query.status as BorrowStatus;
  }
  if (query.fromDate || query.toDate) {
    where.borrowedAt = {
      ...(query.fromDate && { gte: new Date(query.fromDate) }),
      ...(query.toDate && { lte: new Date(query.toDate) }),
    };
  }

  const [total, records] = await Promise.all([
    prisma.borrowRecord.count({ where }),
    prisma.borrowRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: { borrowedAt: 'desc' },
      include: {
        physicalCopy: {
          include: { book: { select: { title: true, authorNames: true, coverImageUrl: true } } },
        },
        fine: true,
      },
    }),
  ]);

  return {
    data: records,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Reader Dashboard Stats ──────────────────────────────────
export const getDashboardStats = async (userId: string) => {
  const [borrowingCount, overdueCount, reservationCount, totalFine] = await Promise.all([
    prisma.borrowRecord.count({ where: { userId, status: BorrowStatus.ACTIVE } }),
    prisma.borrowRecord.count({ where: { userId, status: BorrowStatus.OVERDUE } }),
    prisma.reservation.count({ where: { userId, status: { in: ['WAITING', 'READY_FOR_PICKUP'] } } }),
    prisma.fine.aggregate({
      where: { userId, status: 'PENDING' },
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    borrowingCount,
    overdueCount,
    reservationCount,
    totalFine: Number(totalFine._sum.totalAmount || 0),
  };
};

// ─── Get User Reservations ───────────────────────────────────
export const getReservations = async (userId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    prisma.reservation.count({ where: { userId } }),
    prisma.reservation.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        book: { select: { title: true, authorNames: true, coverImageUrl: true } },
      },
    }),
  ]);

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── Get User Fines ──────────────────────────────────────────
export const getFines = async (userId: string) => {
  return prisma.fine.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      borrowRecord: {
        include: {
          physicalCopy: {
            include: { book: { select: { title: true } } },
          },
        },
      },
    },
  });
};

// ─── Change Password ─────────────────────────────────────────
export const changePassword = async (
  userId: string,
  data: { currentPassword?: string; newPassword?: string }
) => {
  if (!data.currentPassword || !data.newPassword) {
    throw createError('Mật khẩu cũ và mật khẩu mới là bắt buộc', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createError('Người dùng không tồn tại', 404);

  const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!isValid) throw createError('Mật khẩu cũ không chính xác', 400);

  const passwordHash = await bcrypt.hash(data.newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { message: 'Đổi mật khẩu thành công' };
};
