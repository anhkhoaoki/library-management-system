import { BorrowStatus, CopyStatus, FineStatus, ReservationStatus } from '@prisma/client';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

jest.mock('../../src/modules/notifications/notifications.service', () => ({
  notifyReservationReady: jest.fn().mockResolvedValue(undefined),
  notifyBorrowApproved: jest.fn().mockResolvedValue(undefined),
}));

import prisma from '../../src/config/database';
import * as circulation from '../../src/modules/circulation/circulation.service';
import {
  notifyReservationReady,
  notifyBorrowApproved,
} from '../../src/modules/notifications/notifications.service';

const db = prisma as unknown as PrismaMock;

const activeReader = {
  id: 'user-1',
  status: 'ACTIVE',
  role: { name: 'READER' },
  branchId: 'branch-1',
};

const availableCopy = {
  id: 'copy-1',
  barcode: 'BK-1234-0001',
  status: CopyStatus.AVAILABLE,
  bookId: 'book-1',
  book: { title: 'Clean Code', id: 'book-1', availableCopies: 3 },
};

describe('circulation.service — kiểm thử đơn vị mượn/trả/phạt/đặt chỗ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.systemConfig.findUnique.mockResolvedValue(null);
  });

  describe('borrowDocument (UC-CIR-01)', () => {
    it('ném 404 khi bạn đọc không tồn tại', async () => {
      db.user.findUnique.mockResolvedValue(null);
      await expect(
        circulation.borrowDocument({ userId: 'x', barcode: 'B1', processedById: 'lib-1' }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('ném 403 khi thẻ thư viện không ACTIVE', async () => {
      db.user.findUnique.mockResolvedValue({ ...activeReader, status: 'SUSPENDED' });
      await expect(
        circulation.borrowDocument({ userId: 'user-1', barcode: 'B1', processedById: 'lib-1' }),
      ).rejects.toMatchObject({ statusCode: 403, message: 'Thẻ thư viện của bạn đọc đang bị khóa' });
    });

    it('ném 403 khi còn khoản phạt chưa thanh toán', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(1);
      await expect(
        circulation.borrowDocument({ userId: 'user-1', barcode: 'B1', processedById: 'lib-1' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('ném 422 khi vượt giới hạn mượn', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count.mockResolvedValue(5);
      await expect(
        circulation.borrowDocument({ userId: 'user-1', barcode: 'B1', processedById: 'lib-1' }),
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('ném 404 khi không tìm thấy mã vạch', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count.mockResolvedValue(0);
      db.physicalCopy.findUnique.mockResolvedValue(null);
      await expect(
        circulation.borrowDocument({ userId: 'user-1', barcode: 'NOPE', processedById: 'lib-1' }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('ném 422 khi bản sao không khả dụng', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count.mockResolvedValue(0);
      db.physicalCopy.findUnique.mockResolvedValue({ ...availableCopy, status: CopyStatus.BORROWED });
      await expect(
        circulation.borrowDocument({ userId: 'user-1', barcode: availableCopy.barcode, processedById: 'lib-1' }),
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('ném 422 khi bản RESERVED không thuộc người mượn', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count.mockResolvedValue(0);
      db.physicalCopy.findUnique.mockResolvedValue({ ...availableCopy, status: CopyStatus.RESERVED });
      db.reservation.findFirst.mockResolvedValue(null);
      await expect(
        circulation.borrowDocument({ userId: 'user-1', barcode: availableCopy.barcode, processedById: 'lib-1' }),
      ).rejects.toMatchObject({
        statusCode: 422,
        message: 'Tài liệu này đang được giữ chỗ cho người khác. Không thể cho mượn',
      });
    });

    it('tạo phiếu mượn, đổi trạng thái BORROWED và ghi audit khi thành công', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count.mockResolvedValue(0);
      db.physicalCopy.findUnique.mockResolvedValue(availableCopy);
      db.borrowRecord.create.mockResolvedValue({
        id: 'br-1',
        borrowedAt: new Date(),
        dueDate: new Date(),
      });
      db.physicalCopy.update.mockResolvedValue({});
      db.reservation.findFirst.mockResolvedValue(null);
      db.book.update.mockResolvedValue({});
      db.auditLog.create.mockResolvedValue({});

      const result = await circulation.borrowDocument({
        userId: 'user-1',
        barcode: availableCopy.barcode,
        processedById: 'lib-1',
      });

      expect(result.borrowRecordId).toBe('br-1');
      expect(result.bookTitle).toBe('Clean Code');
      expect(db.physicalCopy.update).toHaveBeenCalledWith({
        where: { id: 'copy-1' },
        data: { status: CopyStatus.BORROWED },
      });
      expect(db.book.update).toHaveBeenCalledWith({
        where: { id: 'book-1' },
        data: { availableCopies: { decrement: 1 } },
      });
      expect(notifyBorrowApproved).not.toHaveBeenCalled();
    });

    it('fulfill reservation và gọi notifyBorrowApproved khi đang giữ chỗ', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count.mockResolvedValue(0);
      db.physicalCopy.findUnique.mockResolvedValue({ ...availableCopy, status: CopyStatus.RESERVED });
      db.reservation.findFirst
        .mockResolvedValueOnce({ id: 'res-ready' })
        .mockResolvedValueOnce({ id: 'res-ready' });
      db.borrowRecord.create.mockResolvedValue({
        id: 'br-2',
        borrowedAt: new Date(),
        dueDate: new Date(),
      });
      db.physicalCopy.update.mockResolvedValue({});
      db.reservation.update.mockResolvedValue({});
      db.auditLog.create.mockResolvedValue({});

      await circulation.borrowDocument({
        userId: 'user-1',
        barcode: availableCopy.barcode,
        processedById: 'lib-1',
      });

      expect(db.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-ready' },
        data: { status: ReservationStatus.FULFILLED },
      });
      expect(notifyBorrowApproved).toHaveBeenCalled();
      expect(db.book.update).not.toHaveBeenCalled();
    });
  });

  describe('returnDocument (UC-CIR-02 / UC-CIR-03)', () => {
    const borrowRecord = {
      id: 'br-1',
      userId: 'user-1',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    };

    it('ném 404 khi mã vạch không tồn tại', async () => {
      db.physicalCopy.findUnique.mockResolvedValue(null);
      await expect(
        circulation.returnDocument({ barcode: 'X', processedById: 'lib-1' }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('ném 404 khi không có phiếu mượn ACTIVE', async () => {
      db.physicalCopy.findUnique.mockResolvedValue(availableCopy);
      db.borrowRecord.findFirst.mockResolvedValue(null);
      await expect(
        circulation.returnDocument({ barcode: availableCopy.barcode, processedById: 'lib-1' }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('trả đúng hạn: không tạo phạt, tăng availableCopies', async () => {
      db.physicalCopy.findUnique.mockResolvedValue(availableCopy);
      db.borrowRecord.findFirst.mockResolvedValue(borrowRecord);
      db.borrowRecord.update.mockResolvedValue({});
      db.reservation.findFirst.mockResolvedValue(null);
      db.physicalCopy.update.mockResolvedValue({});
      db.book.update.mockResolvedValue({});
      db.auditLog.create.mockResolvedValue({});

      const result = await circulation.returnDocument({
        barcode: availableCopy.barcode,
        processedById: 'lib-1',
      });

      expect(result.overdueDays).toBe(0);
      expect(result.fine).toBeNull();
      expect(db.fine.create).not.toHaveBeenCalled();
      expect(db.book.update).toHaveBeenCalledWith({
        where: { id: 'book-1' },
        data: { availableCopies: { increment: 1 } },
      });
    });

    it('trả trễ hạn: tạo Fine PENDING theo số ngày * đơn giá', async () => {
      const overdueRecord = {
        ...borrowRecord,
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      };
      db.physicalCopy.findUnique.mockResolvedValue(availableCopy);
      db.borrowRecord.findFirst.mockResolvedValue(overdueRecord);
      db.fine.create.mockResolvedValue({
        id: 'fine-1',
        totalAmount: 6000,
        status: FineStatus.PENDING,
      });
      db.borrowRecord.update.mockResolvedValue({});
      db.reservation.findFirst.mockResolvedValue(null);
      db.physicalCopy.update.mockResolvedValue({});
      db.book.update.mockResolvedValue({});
      db.auditLog.create.mockResolvedValue({});

      const result = await circulation.returnDocument({
        barcode: availableCopy.barcode,
        processedById: 'lib-1',
      });

      expect(result.overdueDays).toBeGreaterThan(0);
      expect(db.fine.create).toHaveBeenCalled();
      expect(result.fine?.fineId).toBe('fine-1');
    });

    it('nếu có hàng đợi WAITING thì chuyển copy sang RESERVED và thông báo', async () => {
      db.physicalCopy.findUnique.mockResolvedValue(availableCopy);
      db.borrowRecord.findFirst.mockResolvedValue(borrowRecord);
      db.borrowRecord.update.mockResolvedValue({});
      db.reservation.findFirst.mockResolvedValue({ id: 'res-next', userId: 'user-2' });
      db.physicalCopy.update.mockResolvedValue({});
      db.reservation.update.mockResolvedValue({});
      db.auditLog.create.mockResolvedValue({});

      await circulation.returnDocument({
        barcode: availableCopy.barcode,
        processedById: 'lib-1',
      });

      expect(db.physicalCopy.update).toHaveBeenCalledWith({
        where: { id: 'copy-1' },
        data: { status: CopyStatus.RESERVED },
      });
      expect(notifyReservationReady).toHaveBeenCalledWith('user-2', 'Clean Code', 'book-1');
      expect(db.book.update).not.toHaveBeenCalled();
    });
  });

  describe('payFine (UC-CIR-03)', () => {
    it('ném 404 khi không có khoản phạt', async () => {
      db.fine.findUnique.mockResolvedValue(null);
      await expect(circulation.payFine('f1', 'lib-1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('ném 400 khi đã thanh toán', async () => {
      db.fine.findUnique.mockResolvedValue({ id: 'f1', status: FineStatus.PAID, totalAmount: 2000 });
      await expect(circulation.payFine('f1', 'lib-1')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('cập nhật PAID và ghi audit', async () => {
      db.fine.findUnique.mockResolvedValue({ id: 'f1', status: FineStatus.PENDING, totalAmount: 4000 });
      db.fine.update.mockResolvedValue({});
      db.auditLog.create.mockResolvedValue({});
      const result = await circulation.payFine('f1', 'lib-1');
      expect(result.message).toBe('Thanh toán phí phạt thành công');
      expect(db.fine.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { status: FineStatus.PAID, paidAt: expect.any(Date) },
      });
    });
  });

  describe('renewBorrowRecord (UC-CIR-04)', () => {
    const activeBorrow = {
      id: 'br-1',
      userId: 'user-1',
      status: BorrowStatus.ACTIVE,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      renewCount: 0,
      physicalCopy: {
        bookId: 'book-1',
        book: { availableCopies: 1 },
      },
    };

    it('ném 403 khi còn phạt PENDING', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(2);
      await expect(circulation.renewBorrowRecord('br-1', 'user-1')).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('ném 403 khi gia hạn phiếu của người khác', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.findUnique.mockResolvedValue({ ...activeBorrow, userId: 'other' });
      await expect(circulation.renewBorrowRecord('br-1', 'user-1')).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('ném 422 khi sách đã quá hạn', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.findUnique.mockResolvedValue({
        ...activeBorrow,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      await expect(circulation.renewBorrowRecord('br-1', 'user-1')).rejects.toMatchObject({
        statusCode: 422,
      });
    });

    it('ném 422 khi đã hết lượt gia hạn', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.findUnique.mockResolvedValue({ ...activeBorrow, renewCount: 2 });
      await expect(circulation.renewBorrowRecord('br-1', 'user-1')).rejects.toMatchObject({
        statusCode: 422,
      });
    });

    it('kéo dài hạn trả khi hợp lệ', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.findUnique.mockResolvedValue(activeBorrow);
      db.reservation.count.mockResolvedValue(0);
      db.borrowRecord.update.mockResolvedValue({});

      const result = await circulation.renewBorrowRecord('br-1', 'user-1');
      expect(result.message).toBe('Gia hạn thành công');
      expect(result.renewCount).toBe(1);
      expect(db.borrowRecord.update).toHaveBeenCalledWith({
        where: { id: 'br-1' },
        data: { dueDate: expect.any(Date), renewCount: { increment: 1 } },
      });
    });
  });

  describe('reserveBook (UC-CIR-05)', () => {
    it('ném 403 khi đang có sách quá hạn', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count.mockResolvedValueOnce(1);
      await expect(circulation.reserveBook('user-1', 'book-1')).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('ném 422 khi đang mượn đúng cuốn đó', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      db.book.findUnique.mockResolvedValue({ id: 'book-1', availableCopies: 0, title: 'Clean Code' });
      db.borrowRecord.findFirst.mockResolvedValue({ id: 'br-x' });
      await expect(circulation.reserveBook('user-1', 'book-1')).rejects.toMatchObject({
        statusCode: 422,
        message: 'Bạn đang mượn cuốn sách này rồi',
      });
    });

    it('đưa vào hàng WAITING khi hết bản in', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count.mockResolvedValue(0);
      db.book.findUnique.mockResolvedValue({ id: 'book-1', availableCopies: 0, title: 'Clean Code' });
      db.borrowRecord.findFirst.mockResolvedValue(null);
      db.reservation.findFirst.mockResolvedValue(null);
      db.reservation.count.mockResolvedValue(2);
      db.reservation.create.mockResolvedValue({
        id: 'res-1',
        status: ReservationStatus.WAITING,
        queuePosition: 3,
      });

      const result = await circulation.reserveBook('user-1', 'book-1');
      expect(result.queuePosition).toBe(3);
      expect(result.message).toMatch(/vị trí thứ 3/);
      expect(db.book.update).not.toHaveBeenCalled();
    });

    it('READY_FOR_PICKUP khi còn availableCopies và giữ bản in', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count.mockResolvedValue(0);
      db.book.findUnique.mockResolvedValue({ id: 'book-1', availableCopies: 2, title: 'Clean Code' });
      db.borrowRecord.findFirst.mockResolvedValue(null);
      db.reservation.findFirst.mockResolvedValue(null);
      db.reservation.count.mockResolvedValue(0);
      db.physicalCopy.findFirst.mockResolvedValue({ id: 'copy-1' });
      db.reservation.create.mockResolvedValue({
        id: 'res-1',
        status: ReservationStatus.READY_FOR_PICKUP,
        queuePosition: 1,
      });
      db.book.update.mockResolvedValue({});
      db.physicalCopy.update.mockResolvedValue({});

      const result = await circulation.reserveBook('user-1', 'book-1');
      expect(result.message).toMatch(/3 ngày/);
      expect(db.physicalCopy.update).toHaveBeenCalledWith({
        where: { id: 'copy-1' },
        data: { status: CopyStatus.RESERVED },
      });
      expect(notifyReservationReady).toHaveBeenCalled();
    });
  });

  describe('cancelReservation', () => {
    it('READER không hủy đặt chỗ của người khác', async () => {
      db.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        userId: 'other',
        status: ReservationStatus.WAITING,
        book: { title: 'X' },
      });
      await expect(
        circulation.cancelReservation('res-1', 'user-1', 'READER'),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('không hủy khi FULFILLED', async () => {
      db.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        userId: 'user-1',
        status: ReservationStatus.FULFILLED,
        book: { title: 'X' },
      });
      await expect(
        circulation.cancelReservation('res-1', 'user-1', 'READER'),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('hủy WAITING thì giảm queuePosition các vị trí sau', async () => {
      db.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        userId: 'user-1',
        bookId: 'book-1',
        status: ReservationStatus.WAITING,
        queuePosition: 1,
        book: { title: 'Clean Code' },
      });
      db.reservation.update.mockResolvedValue({});
      db.reservation.findMany.mockResolvedValue([{ id: 'res-2', queuePosition: 2 }]);

      const result = await circulation.cancelReservation('res-1', 'user-1', 'READER');
      expect(result.message).toBe('Đã hủy đặt chỗ thành công');
      expect(db.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-2' },
        data: { queuePosition: 1 },
      });
    });
  });

  describe('lookupCopyByBarcode', () => {
    it('ném 404 khi không có copy', async () => {
      db.physicalCopy.findUnique.mockResolvedValue(null);
      await expect(circulation.lookupCopyByBarcode('X')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('trả copy khi tìm thấy', async () => {
      db.physicalCopy.findUnique.mockResolvedValue(availableCopy);
      await expect(circulation.lookupCopyByBarcode('BK-1234-0001')).resolves.toEqual(availableCopy);
    });
  });
});
