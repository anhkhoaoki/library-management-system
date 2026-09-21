import request from 'supertest';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';
import { roleAuthHeader } from '../helpers/auth.helper';
import { Role } from '../../src/types/roles';
import { CopyStatus, BorrowStatus, ReservationStatus } from '@prisma/client';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

jest.mock('../../src/modules/notifications/notifications.service', () => ({
  notifyReservationReady: jest.fn().mockResolvedValue(undefined),
  notifyBorrowApproved: jest.fn().mockResolvedValue(undefined),
}));

import prisma from '../../src/config/database';
import { notifyReservationReady } from '../../src/modules/notifications/notifications.service';
import app from '../../src/app';

const db = prisma as unknown as PrismaMock;

describe('System Test 3: Hàng đợi Đặt trước và Giữ chỗ Tài liệu (Reservation Queue E2E)', () => {
  const bookId = 'book-hot-1';
  const copyBarcode = 'BK-HOT-0001';
  const copyId = 'copy-hot-1';
  const readerAId = 'reader-queue-a';
  const readerBId = 'reader-queue-b';
  const librarianId = 'librarian-1';

  beforeEach(() => {
    jest.clearAllMocks();
    db.systemConfig.findUnique.mockResolvedValue(null);
  });

  it('Bước 1: Bạn đọc A cố mượn sách nhưng sách đã hết bản sao khả dụng', async () => {
    db.user.findUnique.mockResolvedValue({ id: readerAId, status: 'ACTIVE', role: { name: 'READER' } });
    db.fine.count.mockResolvedValue(0);
    db.borrowRecord.count.mockResolvedValue(0);
    db.physicalCopy.findUnique.mockResolvedValue({
      id: copyId,
      barcode: copyBarcode,
      status: CopyStatus.BORROWED, // Đang được người khác mượn
      bookId,
      book: { id: bookId, title: 'Giải thuật Chuyên sâu', availableCopies: 0 },
    });

    const res = await request(app)
      .post('/api/v1/circulation/borrow')
      .set(roleAuthHeader(Role.LIBRARIAN, librarianId))
      .send({ userId: readerAId, barcode: copyBarcode });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('Bước 2: Bạn đọc A đăng ký đặt trước và đứng đầu hàng đợi (Vị trí 1)', async () => {
    db.user.findUnique.mockResolvedValue({ id: readerAId, status: 'ACTIVE' });
    db.fine.count.mockResolvedValue(0);
    db.borrowRecord.count.mockResolvedValue(0);
    db.book.findUnique.mockResolvedValue({
      id: bookId,
      title: 'Giải thuật Chuyên sâu',
      availableCopies: 0,
    });
    db.borrowRecord.findFirst.mockResolvedValue(null);
    db.reservation.findFirst.mockResolvedValue(null);
    db.reservation.count.mockResolvedValue(0); // Chưa có ai trước đó

    db.reservation.create.mockResolvedValue({
      id: 'res-a',
      userId: readerAId,
      bookId,
      status: ReservationStatus.WAITING,
      queuePosition: 1,
    });

    const res = await request(app)
      .post('/api/v1/circulation/reservations')
      .set(roleAuthHeader(Role.READER, readerAId))
      .send({ bookId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.queuePosition).toBe(1);
  });

  it('Bước 3: Bạn đọc B cũng đặt trước và xếp ở vị trí thứ 2 trong hàng đợi', async () => {
    db.user.findUnique.mockResolvedValue({ id: readerBId, status: 'ACTIVE' });
    db.fine.count.mockResolvedValue(0);
    db.borrowRecord.count.mockResolvedValue(0);
    db.book.findUnique.mockResolvedValue({
      id: bookId,
      title: 'Giải thuật Chuyên sâu',
      availableCopies: 0,
    });
    db.borrowRecord.findFirst.mockResolvedValue(null);
    db.reservation.findFirst.mockResolvedValue(null);
    db.reservation.count.mockResolvedValue(1); // Đã có Bạn đọc A

    db.reservation.create.mockResolvedValue({
      id: 'res-b',
      userId: readerBId,
      bookId,
      status: ReservationStatus.WAITING,
      queuePosition: 2,
    });

    const res = await request(app)
      .post('/api/v1/circulation/reservations')
      .set(roleAuthHeader(Role.READER, readerBId))
      .send({ bookId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.queuePosition).toBe(2);
  });

  it('Bước 4: Người mượn cũ trả sách -> Hệ thống tự động chuyển Bạn đọc A sang READY_FOR_PICKUP và gửi thông báo', async () => {
    const copyMock = {
      id: copyId,
      barcode: copyBarcode,
      status: CopyStatus.BORROWED,
      bookId,
      book: { id: bookId, title: 'Giải thuật Chuyên sâu', availableCopies: 0 },
    };
    db.physicalCopy.findUnique.mockResolvedValue(copyMock);

    const activeBorrow = {
      id: 'borrow-old-1',
      userId: 'old-borrower',
      physicalCopyId: copyId,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: BorrowStatus.ACTIVE,
    };
    db.borrowRecord.findFirst.mockResolvedValue(activeBorrow);
    db.borrowRecord.update.mockResolvedValue({ ...activeBorrow, status: BorrowStatus.RETURNED });

    // Có Bạn đọc A đang đợi vị trí đầu tiên
    db.reservation.findFirst.mockResolvedValue({
      id: 'res-a',
      userId: readerAId,
      bookId,
      status: ReservationStatus.WAITING,
      user: { fullName: 'Bạn Đọc A' },
    });

    db.reservation.update.mockResolvedValue({
      id: 'res-a',
      status: ReservationStatus.READY_FOR_PICKUP,
    });
    db.physicalCopy.update.mockResolvedValue({ ...copyMock, status: CopyStatus.RESERVED });
    db.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/circulation/return')
      .set(roleAuthHeader(Role.LIBRARIAN, librarianId))
      .send({ barcode: copyBarcode });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(notifyReservationReady).toHaveBeenCalledWith(
      readerAId,
      'Giải thuật Chuyên sâu',
      bookId
    );
  });

  it('Bước 5: Bạn đọc A đến nhận sách -> Thủ thư phát hành sách và hoàn tất đặt trước (FULFILLED)', async () => {
    db.user.findUnique.mockResolvedValue({ id: readerAId, status: 'ACTIVE', role: { name: 'READER' } });
    db.fine.count.mockResolvedValue(0);
    db.borrowRecord.count.mockResolvedValue(0);

    const reservedCopy = {
      id: copyId,
      barcode: copyBarcode,
      status: CopyStatus.RESERVED, // Đang giữ chỗ
      bookId,
      book: { id: bookId, title: 'Giải thuật Chuyên sâu', availableCopies: 0 },
    };
    db.physicalCopy.findUnique.mockResolvedValue(reservedCopy);

    // Tìm thấy reservation READY_FOR_PICKUP của chính Bạn đọc A
    db.reservation.findFirst.mockResolvedValue({
      id: 'res-a',
      userId: readerAId,
      bookId,
      status: ReservationStatus.READY_FOR_PICKUP,
    });

    db.borrowRecord.create.mockResolvedValue({
      id: 'borrow-rec-a',
      userId: readerAId,
      physicalCopyId: copyId,
      status: BorrowStatus.ACTIVE,
    });
    db.physicalCopy.update.mockResolvedValue({ ...reservedCopy, status: CopyStatus.BORROWED });
    db.reservation.update.mockResolvedValue({ id: 'res-a', status: ReservationStatus.FULFILLED });
    db.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/circulation/borrow')
      .set(roleAuthHeader(Role.LIBRARIAN, librarianId))
      .send({ userId: readerAId, barcode: copyBarcode });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.borrowRecordId).toBe('borrow-rec-a');
  });
});
