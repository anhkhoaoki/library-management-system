import prisma from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import {
  BorrowStatus,
  CopyStatus,
  FineStatus,
  ReservationStatus,
  AuditAction,
} from '@prisma/client';

// ─── Configuration keys ──────────────────────────────────────
const CONFIG_KEYS = {
  BORROW_DURATION: 'borrow_duration_days',
  MAX_BORROW_READER: 'max_borrow_limit_reader',
  MAX_BORROW_FACULTY: 'max_borrow_limit_faculty',
  FINE_RATE: 'fine_rate_per_day',
  MAX_RENEW: 'max_renew_count',
  RENEW_DURATION: 'renew_duration_days',
  HOLIDAY_DATES: 'holiday_dates',
} as const;

// ─── Helper: Load a system config value ──────────────────────
const getConfig = async (key: string, defaultValue: string): Promise<string> => {
  const config = await prisma.systemConfig.findUnique({ where: { key } });
  return config?.value ?? defaultValue;
};

// ─── Helper: Count overdue days excluding holidays ────────────
const calcOverdueDays = async (dueDate: Date, returnDate: Date): Promise<number> => {
  if (returnDate <= dueDate) return 0;

  const holidayConfig = await getConfig(CONFIG_KEYS.HOLIDAY_DATES, '[]');
  const holidays: string[] = JSON.parse(holidayConfig);

  let overdueDays = 0;
  const cursor = new Date(dueDate);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= returnDate) {
    const dateStr = cursor.toISOString().split('T')[0];
    if (!holidays.includes(dateStr)) {
      overdueDays++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return overdueDays;
};

// ─── UC-CIR-01: Borrow Physical Document ─────────────────────
export const borrowDocument = async (data: {
  userId: string;
  barcode: string;
  processedById: string;
}) => {
  // Step 1: Verify user exists and is active
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    include: { role: true },
  });
  if (!user) throw createError('Người dùng không tồn tại', 404);
  if (user.status !== 'ACTIVE') {
    throw createError('Thẻ thư viện của bạn đọc đang bị khóa', 403);
  }

  // Step 2: Check unpaid fines
  const unpaidFines = await prisma.fine.count({
    where: { userId: data.userId, status: FineStatus.PENDING },
  });
  if (unpaidFines > 0) {
    throw createError(
      'Bạn đọc có khoản phạt chưa thanh toán. Vui lòng thanh toán trước khi mượn thêm sách',
      403
    );
  }

  // Step 3: Check borrow limit based on role
  const maxBorrowKey =
    user.role.name === 'READER' ? CONFIG_KEYS.MAX_BORROW_READER : CONFIG_KEYS.MAX_BORROW_FACULTY;
  const maxBorrow = parseInt(await getConfig(maxBorrowKey, '5'), 10);

  const currentBorrowCount = await prisma.borrowRecord.count({
    where: { userId: data.userId, status: BorrowStatus.ACTIVE },
  });

  if (currentBorrowCount >= maxBorrow) {
    throw createError(
      `Vượt quá giới hạn mượn (tối đa ${maxBorrow} tài liệu). Vui lòng trả bớt sách cũ`,
      422
    );
  }

  // Step 4: Find physical copy by barcode
  const physicalCopy = await prisma.physicalCopy.findUnique({
    where: { barcode: data.barcode },
    include: { book: true },
  });
  if (!physicalCopy) throw createError('Không tìm thấy tài liệu với mã vạch này', 404);

  if (physicalCopy.status !== CopyStatus.AVAILABLE && physicalCopy.status !== CopyStatus.RESERVED) {
    throw createError(
      `Tài liệu hiện không khả dụng (trạng thái: ${physicalCopy.status})`,
      422
    );
  }

  // Step 5: Check if reserved by someone else
  const reservation = await prisma.reservation.findFirst({
    where: {
      bookId: physicalCopy.bookId,
      status: { in: [ReservationStatus.READY_FOR_PICKUP, ReservationStatus.WAITING] },
      userId: { not: data.userId },
    },
  });
  if (reservation && physicalCopy.status === CopyStatus.RESERVED) {
    throw createError(
      'Tài liệu này đang được giữ chỗ cho người khác. Không thể cho mượn',
      422
    );
  }

  // Step 6: Calculate due date
  const borrowDurationDays = parseInt(await getConfig(CONFIG_KEYS.BORROW_DURATION, '14'), 10);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + borrowDurationDays);

  // Step 7: Create borrow record
  const borrowRecord = await prisma.borrowRecord.create({
    data: {
      userId: data.userId,
      physicalCopyId: physicalCopy.id,
      dueDate,
      processedById: data.processedById,
      status: BorrowStatus.ACTIVE,
    },
  });

  // Step 8: Update copy status
  await prisma.physicalCopy.update({
    where: { id: physicalCopy.id },
    data: { status: CopyStatus.BORROWED },
  });

  // Step 9: Fulfill active reservation for this user if exists
  const reservationToFulfill = await prisma.reservation.findFirst({
    where: {
      userId: data.userId,
      bookId: physicalCopy.bookId,
      status: { in: [ReservationStatus.READY_FOR_PICKUP, ReservationStatus.WAITING] },
    },
  });

  // Step 10: Update book available count (only if not already reserved/accounted for)
  if (!reservationToFulfill) {
    await prisma.book.update({
      where: { id: physicalCopy.bookId },
      data: { availableCopies: { decrement: 1 } },
    });
  } else {
    await prisma.reservation.update({
      where: { id: reservationToFulfill.id },
      data: { status: ReservationStatus.FULFILLED },
    });
  }

  // Step 11: Write audit log
  await prisma.auditLog.create({
    data: {
      userId: data.processedById,
      action: AuditAction.BORROW,
      entityType: 'BorrowRecord',
      entityId: borrowRecord.id,
      newData: {
        userId: data.userId,
        bookTitle: physicalCopy.book.title,
        barcode: data.barcode,
        dueDate,
      },
      riskLevel: 'INFO',
    },
  });

  return {
    borrowRecordId: borrowRecord.id,
    bookTitle: physicalCopy.book.title,
    barcode: data.barcode,
    borrowedAt: borrowRecord.borrowedAt,
    dueDate: borrowRecord.dueDate,
  };
};

// ─── UC-CIR-02 + UC-CIR-03: Return Document ──────────────────
export const returnDocument = async (data: {
  barcode: string;
  processedById: string;
}) => {
  // Step 1: Find physical copy
  const physicalCopy = await prisma.physicalCopy.findUnique({
    where: { barcode: data.barcode },
    include: { book: true },
  });
  if (!physicalCopy) throw createError('Không tìm thấy tài liệu với mã vạch này', 404);

  // Step 2: Find active borrow record for this copy
  const borrowRecord = await prisma.borrowRecord.findFirst({
    where: {
      physicalCopyId: physicalCopy.id,
      status: BorrowStatus.ACTIVE,
    },
  });
  if (!borrowRecord) {
    throw createError('Không tìm thấy phiếu mượn hợp lệ cho tài liệu này', 404);
  }

  const returnedAt = new Date();

  // Step 3: Calculate overdue (UC-CIR-03)
  let fineRecord = null;
  const overdueDays = await calcOverdueDays(borrowRecord.dueDate, returnedAt);

  if (overdueDays > 0) {
    const dailyRate = parseFloat(await getConfig(CONFIG_KEYS.FINE_RATE, '2000'));
    const totalAmount = overdueDays * dailyRate;

    fineRecord = await prisma.fine.create({
      data: {
        borrowRecordId: borrowRecord.id,
        userId: borrowRecord.userId,
        daysOverdue: overdueDays,
        dailyRate,
        totalAmount,
        status: FineStatus.PENDING,
      },
    });
  }

  // Step 4: Close borrow record
  await prisma.borrowRecord.update({
    where: { id: borrowRecord.id },
    data: {
      returnedAt,
      status: BorrowStatus.RETURNED,
    },
  });

  // Step 5: Check if book has a reservation queue
  const nextReservation = await prisma.reservation.findFirst({
    where: {
      bookId: physicalCopy.bookId,
      status: ReservationStatus.WAITING,
    },
    orderBy: { queuePosition: 'asc' },
  });

  if (nextReservation) {
    // Mark copy as reserved, update reservation status
    await prisma.physicalCopy.update({
      where: { id: physicalCopy.id },
      data: { status: CopyStatus.RESERVED },
    });

    await prisma.reservation.update({
      where: { id: nextReservation.id },
      data: {
        status: ReservationStatus.READY_FOR_PICKUP,
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days to pick up
      },
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: nextReservation.userId,
        type: 'RESERVATION_READY',
        title: 'Sách đặt giữ chỗ đã sẵn sàng',
        content: `Cuốn sách "${physicalCopy.book.title}" bạn đặt chỗ đã có tại thư viện. Vui lòng đến nhận trong vòng 3 ngày.`,
        relatedId: physicalCopy.bookId,
        relatedType: 'Book',
      },
    });
  } else {
    // No reservation queue - set copy to available
    await prisma.physicalCopy.update({
      where: { id: physicalCopy.id },
      data: { status: CopyStatus.AVAILABLE },
    });

    await prisma.book.update({
      where: { id: physicalCopy.bookId },
      data: { availableCopies: { increment: 1 } },
    });
  }

  // Step 6: Audit log
  await prisma.auditLog.create({
    data: {
      userId: data.processedById,
      action: AuditAction.RETURN,
      entityType: 'BorrowRecord',
      entityId: borrowRecord.id,
      newData: {
        returnedAt,
        overdueDays,
        fineAmount: fineRecord?.totalAmount ?? 0,
      },
      riskLevel: overdueDays > 0 ? 'WARNING' : 'INFO',
    },
  });

  return {
    borrowRecordId: borrowRecord.id,
    bookTitle: physicalCopy.book.title,
    returnedAt,
    overdueDays,
    fine: fineRecord
      ? {
          fineId: fineRecord.id,
          amount: fineRecord.totalAmount,
          status: fineRecord.status,
          message: `Trễ hạn ${overdueDays} ngày. Tổng tiền phạt: ${fineRecord.totalAmount.toString()}đ`,
        }
      : null,
  };
};

// ─── UC-CIR-03: Pay Fine ─────────────────────────────────────
export const payFine = async (fineId: string, processedById: string) => {
  const fine = await prisma.fine.findUnique({ where: { id: fineId } });
  if (!fine) throw createError('Không tìm thấy khoản phạt', 404);
  if (fine.status === FineStatus.PAID) throw createError('Khoản phạt đã được thanh toán', 400);

  await prisma.fine.update({
    where: { id: fineId },
    data: { status: FineStatus.PAID, paidAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: processedById,
      action: AuditAction.FINE_PAID,
      entityType: 'Fine',
      entityId: fineId,
      newData: { paidAt: new Date(), amount: fine.totalAmount },
      riskLevel: 'INFO',
    },
  });

  return { message: 'Thanh toán phí phạt thành công', amount: fine.totalAmount };
};

// ─── UC-CIR-04: Renew Document ───────────────────────────────
export const renewBorrowRecord = async (borrowRecordId: string, userId: string) => {
  const borrowRecord = await prisma.borrowRecord.findUnique({
    where: { id: borrowRecordId },
    include: { physicalCopy: { include: { book: true } } },
  });

  if (!borrowRecord) throw createError('Không tìm thấy phiếu mượn', 404);
  if (borrowRecord.userId !== userId) throw createError('Không có quyền gia hạn phiếu mượn này', 403);
  if (borrowRecord.status !== BorrowStatus.ACTIVE) {
    throw createError('Phiếu mượn không còn hiệu lực', 422);
  }

  const now = new Date();
  if (now > borrowRecord.dueDate) {
    throw createError('Sách đã quá hạn, không thể gia hạn trực tuyến. Vui lòng đến thư viện', 422);
  }

  // Check renew count limit
  const maxRenew = parseInt(await getConfig(CONFIG_KEYS.MAX_RENEW, '2'), 10);
  if (borrowRecord.renewCount >= maxRenew) {
    throw createError(`Đã đạt giới hạn gia hạn tối đa (${maxRenew} lần)`, 422);
  }

  // Check if someone has reserved this book
  const hasReservation = await prisma.reservation.count({
    where: {
      bookId: borrowRecord.physicalCopy.bookId,
      status: { in: [ReservationStatus.WAITING, ReservationStatus.READY_FOR_PICKUP] },
    },
  });
  if (hasReservation > 0) {
    throw createError(
      'Tài liệu này đang được người khác yêu cầu. Vui lòng trả đúng hạn',
      422
    );
  }

  // Extend due date
  const renewDays = parseInt(await getConfig(CONFIG_KEYS.RENEW_DURATION, '7'), 10);
  const newDueDate = new Date(borrowRecord.dueDate);
  newDueDate.setDate(newDueDate.getDate() + renewDays);

  await prisma.borrowRecord.update({
    where: { id: borrowRecordId },
    data: {
      dueDate: newDueDate,
      renewCount: { increment: 1 },
    },
  });

  return {
    message: 'Gia hạn thành công',
    newDueDate,
    renewCount: borrowRecord.renewCount + 1,
  };
};

// ─── UC-CIR-05: Reserve Book / Hold ──────────────────────────
export const reserveBook = async (userId: string, bookId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw createError('Người dùng không tồn tại', 404);
  if (user.status !== 'ACTIVE') throw createError('Tài khoản bị khóa', 403);

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw createError('Tài liệu không tồn tại', 404);

  // Check if available
  const isAvailable = book.availableCopies > 0;

  // Check if the user is already borrowing this book
  const isBorrowing = await prisma.borrowRecord.findFirst({
    where: {
      userId,
      physicalCopy: { bookId },
      status: BorrowStatus.ACTIVE,
    },
  });
  if (isBorrowing) throw createError('Bạn đang mượn cuốn sách này rồi', 422);

  // Check if already reserved
  const alreadyReserved = await prisma.reservation.findFirst({
    where: {
      userId,
      bookId,
      status: { in: [ReservationStatus.WAITING, ReservationStatus.READY_FOR_PICKUP] },
    },
  });
  if (alreadyReserved) throw createError('Bạn đã đặt giữ chỗ cuốn sách này rồi', 422);

  const queueCount = await prisma.reservation.count({
    where: {
      bookId,
      status: { in: [ReservationStatus.WAITING, ReservationStatus.READY_FOR_PICKUP] },
    },
  });

  const reservation = await prisma.reservation.create({
    data: {
      userId,
      bookId,
      queuePosition: queueCount + 1,
      status: isAvailable ? ReservationStatus.READY_FOR_PICKUP : ReservationStatus.WAITING,
      expiresAt: isAvailable ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null,
    },
  });

  if (isAvailable) {
    await prisma.book.update({
      where: { id: bookId },
      data: { availableCopies: { decrement: 1 } },
    });
  }

  return {
    reservationId: reservation.id,
    status: reservation.status,
    queuePosition: reservation.queuePosition,
    message: isAvailable 
      ? 'Sách đang có sẵn và đã được giữ cho bạn. Vui lòng đến nhận trong 3 ngày.'
      : `Đặt giữ chỗ thành công. Bạn đang ở vị trí thứ ${reservation.queuePosition} trong hàng đợi`,
  };
};

// ─── Librarian: Get Pending Reservations ─────────────────────
export const getPendingReservations = async () => {
  return prisma.reservation.findMany({
    where: {
      status: { in: [ReservationStatus.WAITING, ReservationStatus.READY_FOR_PICKUP] },
    },
    include: {
      user: { select: { fullName: true, studentId: true, readerCode: true } },
      book: { select: { title: true, isbn: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
};

// ─── Return by Record ID ─────────────────────────────────────
export const returnDocumentById = async (borrowRecordId: string, processedById: string) => {
  const borrowRecord = await prisma.borrowRecord.findUnique({
    where: { id: borrowRecordId },
    include: { physicalCopy: { include: { book: true } } },
  });

  if (!borrowRecord || borrowRecord.status !== BorrowStatus.ACTIVE) {
    throw createError('Bản ghi mượn không hợp lệ hoặc đã được trả', 404);
  }

  // We reuse the logic from returnDocument but using the record we found
  return returnDocument({
    barcode: borrowRecord.physicalCopy.barcode,
    processedById,
  });
};

// ─── Lookup Physical Copy (Librarian/Admin) ──────────────────
export const lookupCopyByBarcode = async (barcode: string) => {
  const copy = await prisma.physicalCopy.findUnique({
    where: { barcode },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          authorNames: true,
          isbn: true,
          coverImageUrl: true,
        },
      },
      branch: { select: { id: true, name: true } },
    },
  });

  if (!copy) throw createError('Không tìm thấy tài liệu với mã vạch này', 404);
  return copy;
};

export const cancelReservation = async (reservationId: string, userId: string, role: string) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) throw createError('Không tìm thấy đặt chỗ', 404);
  
  if (role === 'READER' && reservation.userId !== userId) {
    throw createError('Bạn không có quyền hủy đặt chỗ này', 403);
  }

  if (reservation.status === ReservationStatus.FULFILLED || reservation.status === ReservationStatus.CANCELLED) {
    throw createError('Không thể hủy đặt chỗ ở trạng thái này', 400);
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: ReservationStatus.CANCELLED },
  });

  if (reservation.status === ReservationStatus.READY_FOR_PICKUP) {
    await prisma.book.update({
      where: { id: reservation.bookId },
      data: { availableCopies: { increment: 1 } },
    });
  }

  return { message: 'Đã hủy đặt chỗ thành công' };
};
