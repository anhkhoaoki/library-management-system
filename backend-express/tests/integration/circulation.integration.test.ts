import request from 'supertest';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';
import { roleAuthHeader } from '../helpers/auth.helper';
import { Role } from '../../src/types/roles';
import { CopyStatus, BorrowStatus, FineStatus, ReservationStatus } from '@prisma/client';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

jest.mock('../../src/modules/notifications/notifications.service', () => ({
  notifyReservationReady: jest.fn().mockResolvedValue(undefined),
  notifyBorrowApproved: jest.fn().mockResolvedValue(undefined),
  notifyFineCreated: jest.fn().mockResolvedValue(undefined),
}));

import prisma from '../../src/config/database';
import app from '../../src/app';

const db = prisma as unknown as PrismaMock;

const activeReader = {
  id: 'reader-1',
  status: 'ACTIVE',
  role: { name: 'READER' },
  fullName: 'Nguyễn Văn Đọc',
  branchId: 'branch-1',
};

const availableCopy = {
  id: 'copy-1',
  barcode: 'BK-0001',
  status: CopyStatus.AVAILABLE,
  bookId: 'book-1',
  book: { id: 'book-1', title: 'Clean Architecture', availableCopies: 2 },
};

describe('Circulation Integration Tests (Kiểm thử tích hợp Lưu thông Mượn / Trả / Phạt / Đặt trước)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.systemConfig.findUnique.mockResolvedValue(null);
  });

  describe('POST /api/v1/circulation/borrow (UC-CIR-01)', () => {
    it('trả về 403 Forbidden khi bạn đọc (READER) tự gọi API phát hành mượn', async () => {
      const response = await request(app)
        .post('/api/v1/circulation/borrow')
        .set(roleAuthHeader(Role.READER))
        .send({ userId: 'reader-1', barcode: 'BK-0001' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('trả về 400 khi thiếu trường dữ liệu bắt buộc (userId hoặc barcode)', async () => {
      const response = await request(app)
        .post('/api/v1/circulation/borrow')
        .set(roleAuthHeader(Role.LIBRARIAN))
        .send({ barcode: 'BK-0001' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('bắt buộc');
    });

    it('trả về 403 khi bạn đọc đang có khoản tiền phạt chưa thanh toán', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(1); // 1 khoản phạt PENDING

      const response = await request(app)
        .post('/api/v1/circulation/borrow')
        .set(roleAuthHeader(Role.LIBRARIAN))
        .send({ userId: 'reader-1', barcode: 'BK-0001' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('khoản phạt chưa thanh toán');
    });

    it('trả về 201 Created khi Thủ thư phát hành mượn tài liệu thành công', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count.mockResolvedValue(1); // chưa vượt giới hạn 5 cuốn
      db.physicalCopy.findUnique.mockResolvedValue(availableCopy);
      db.reservation.findFirst.mockResolvedValue(null);

      const createdRecord = {
        id: 'borrow-rec-1',
        userId: 'reader-1',
        physicalCopyId: 'copy-1',
        borrowDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: BorrowStatus.ACTIVE,
      };

      db.borrowRecord.create.mockResolvedValue(createdRecord);
      db.physicalCopy.update.mockResolvedValue({ ...availableCopy, status: CopyStatus.BORROWED });
      db.book.update.mockResolvedValue({});
      db.auditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/circulation/borrow')
        .set(roleAuthHeader(Role.LIBRARIAN))
        .send({ userId: 'reader-1', barcode: 'BK-0001' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.borrowRecordId).toBe('borrow-rec-1');
      expect(response.body.data.bookTitle).toBe('Clean Architecture');
    });
  });

  describe('POST /api/v1/circulation/return (UC-CIR-02)', () => {
    it('trả về 403 khi bạn đọc cố gọi endpoint trả sách', async () => {
      const response = await request(app)
        .post('/api/v1/circulation/return')
        .set(roleAuthHeader(Role.READER))
        .send({ barcode: 'BK-0001' });

      expect(response.status).toBe(403);
    });

    it('trả về 200 khi Thủ thư xử lý trả sách thành công đúng hạn', async () => {
      db.physicalCopy.findUnique.mockResolvedValue(availableCopy);

      const activeBorrow = {
        id: 'borrow-rec-1',
        userId: 'reader-1',
        physicalCopyId: 'copy-1',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // chưa quá hạn
        status: BorrowStatus.ACTIVE,
      };
      db.borrowRecord.findFirst.mockResolvedValue(activeBorrow);
      db.borrowRecord.update.mockResolvedValue({ ...activeBorrow, status: BorrowStatus.RETURNED });
      db.physicalCopy.update.mockResolvedValue({ ...availableCopy, status: CopyStatus.AVAILABLE });
      db.book.update.mockResolvedValue({});
      db.reservation.findFirst.mockResolvedValue(null);
      db.auditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/circulation/return')
        .set(roleAuthHeader(Role.LIBRARIAN))
        .send({ barcode: 'BK-0001' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overdueDays).toBe(0);
      expect(response.body.data.fine).toBeNull();
    });
  });

  describe('POST /api/v1/circulation/borrow-records/:id/renew (UC-CIR-04)', () => {
    it('trả về 422 khi sách đang mượn đã bị quá hạn (không cho gia hạn)', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.findUnique.mockResolvedValue({
        id: 'borrow-1',
        userId: 'reader-1',
        renewCount: 0,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // trễ 2 ngày
        status: BorrowStatus.ACTIVE,
        physicalCopy: { bookId: 'book-1', book: { availableCopies: 1 } },
      });

      const response = await request(app)
        .post('/api/v1/circulation/borrow-records/borrow-1/renew')
        .set(roleAuthHeader(Role.READER, 'reader-1'));

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('quá hạn');
    });

    it('trả về 200 khi bạn đọc gia hạn mượn sách thành công', async () => {
      const now = new Date();
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.findUnique.mockResolvedValue({
        id: 'borrow-1',
        userId: 'reader-1',
        renewCount: 0,
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        status: BorrowStatus.ACTIVE,
        physicalCopy: { bookId: 'book-1', book: { availableCopies: 1 } },
      });
      db.reservation.count.mockResolvedValue(0);
      db.borrowRecord.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/circulation/borrow-records/borrow-1/renew')
        .set(roleAuthHeader(Role.READER, 'reader-1'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.renewCount).toBe(1);
      expect(response.body.data.message).toBe('Gia hạn thành công');
    });
  });

  describe('POST /api/v1/circulation/reservations (UC-CIR-05)', () => {
    it('trả về 403 khi bạn đọc đang có sách quá hạn', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count.mockResolvedValueOnce(1); // 1 sách quá hạn

      const response = await request(app)
        .post('/api/v1/circulation/reservations')
        .set(roleAuthHeader(Role.READER, 'reader-1'))
        .send({ bookId: 'book-available' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('quá hạn');
    });

    it('trả về 201 Created khi đặt trước sách thành công (khi sách đã hết bản in)', async () => {
      db.user.findUnique.mockResolvedValue(activeReader);
      db.fine.count.mockResolvedValue(0);
      db.borrowRecord.count
        .mockResolvedValueOnce(0) // không có sách quá hạn
        .mockResolvedValueOnce(0); // chưa mượn cuốn này
      db.book.findUnique.mockResolvedValue({
        id: 'book-empty',
        title: 'Sách Quý Hết Hàng',
        availableCopies: 0,
      });
      db.borrowRecord.findFirst.mockResolvedValue(null);
      db.reservation.findFirst.mockResolvedValue(null); // chưa từng đặt trước
      db.reservation.count.mockResolvedValue(2); // trước đó đã có 2 người xếp hàng

      db.reservation.create.mockResolvedValue({
        id: 'res-1',
        userId: 'reader-1',
        bookId: 'book-empty',
        status: ReservationStatus.WAITING,
        queuePosition: 3,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/v1/circulation/reservations')
        .set(roleAuthHeader(Role.READER, 'reader-1'))
        .send({ bookId: 'book-empty' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queuePosition).toBe(3);
    });
  });

  describe('POST /api/v1/circulation/fines/:id/pay (UC-CIR-03)', () => {
    it('trả về 403 khi bạn đọc tự thanh toán fine endpoint của thủ thư', async () => {
      const response = await request(app)
        .post('/api/v1/circulation/fines/fine-1/pay')
        .set(roleAuthHeader(Role.READER));

      expect(response.status).toBe(403);
    });

    it('trả về 200 khi Thủ thư xác nhận thanh toán tiền phạt thành công', async () => {
      db.fine.findUnique.mockResolvedValue({
        id: 'fine-1',
        totalAmount: 20000,
        status: FineStatus.PENDING,
        userId: 'reader-1',
      });
      db.fine.update.mockResolvedValue({});
      db.auditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/circulation/fines/fine-1/pay')
        .set(roleAuthHeader(Role.LIBRARIAN));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Thanh toán phí phạt thành công');
    });
  });

  describe('GET /api/v1/circulation/lookup/:barcode', () => {
    it('trả về 200 cùng thông tin bản sao và sách tương ứng', async () => {
      db.physicalCopy.findUnique.mockResolvedValue({
        id: 'copy-1',
        barcode: 'BK-9999',
        status: CopyStatus.AVAILABLE,
        book: { id: 'book-1', title: 'Clean Architecture', authorNames: ['Uncle Bob'] },
      });

      const response = await request(app)
        .get('/api/v1/circulation/lookup/BK-9999')
        .set(roleAuthHeader(Role.LIBRARIAN));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.barcode).toBe('BK-9999');
      expect(response.body.data.book.title).toBe('Clean Architecture');
    });

    it('trả về 404 khi mã vạch không tồn tại', async () => {
      db.physicalCopy.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/circulation/lookup/NOT-FOUND')
        .set(roleAuthHeader(Role.LIBRARIAN));

      expect(response.status).toBe(404);
    });
  });
});
