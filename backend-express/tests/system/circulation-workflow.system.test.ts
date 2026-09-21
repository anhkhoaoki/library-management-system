import request from 'supertest';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';
import { roleAuthHeader } from '../helpers/auth.helper';
import { Role } from '../../src/types/roles';
import { CopyStatus, BorrowStatus, BookStatus } from '@prisma/client';

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

describe('System Test 2: Quy trình Lưu thông Mượn - Gia hạn - Trả sách (Circulation E2E)', () => {
  const bookId = 'book-sys-1';
  const copyBarcode = 'BK-SYS-0001';
  const copyId = 'copy-sys-1';
  const readerId = 'reader-sys-1';
  const librarianId = 'librarian-sys-1';
  const borrowRecordId = 'borrow-sys-rec-1';

  beforeEach(() => {
    jest.clearAllMocks();
    db.systemConfig.findUnique.mockResolvedValue(null);
  });

  it('Bước 1: Thủ thư thêm tài liệu mới vào kho thư viện', async () => {
    db.book.findUnique.mockResolvedValue(null);
    db.category.findUnique.mockResolvedValue({ id: 'cat-tech', name: 'Khoa học Công nghệ' });
    db.book.create.mockResolvedValue({
      id: bookId,
      title: 'Hệ thống Phân tán Hiện đại',
      authorNames: ['Martin Kleppmann'],
      isbn: '9781449373320',
      totalCopies: 2,
      availableCopies: 2,
      status: BookStatus.ACTIVE,
    });

    const res = await request(app)
      .post('/api/v1/books')
      .set(roleAuthHeader(Role.LIBRARIAN, librarianId))
      .send({
        title: 'Hệ thống Phân tán Hiện đại',
        authorNames: ['Martin Kleppmann'],
        isbn: '9781449373320',
        categoryId: 'cat-tech',
        initialCopies: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(bookId);
  });

  it('Bước 2: Bạn đọc tìm kiếm sách trong danh mục trực tuyến', async () => {
    db.book.findMany.mockResolvedValue([
      {
        id: bookId,
        title: 'Hệ thống Phân tán Hiện đại',
        authorNames: ['Martin Kleppmann'],
        availableCopies: 2,
        status: BookStatus.ACTIVE,
      },
    ]);
    db.book.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/books/search')
      .query({ q: 'Phân tán' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].id).toBe(bookId);
    expect(res.body.data[0].availableCopies).toBe(2);
  });

  it('Bước 3: Thủ thư phát hành mượn sách cho bạn đọc', async () => {
    db.user.findUnique.mockResolvedValue({
      id: readerId,
      status: 'ACTIVE',
      role: { name: 'READER' },
      fullName: 'Bạn Đọc Hệ Thống',
    });
    db.fine.count.mockResolvedValue(0);
    db.borrowRecord.count.mockResolvedValue(1); // đang mượn 1 cuốn, chưa vượt quá 5

    const copyMock = {
      id: copyId,
      barcode: copyBarcode,
      status: CopyStatus.AVAILABLE,
      bookId,
      book: { id: bookId, title: 'Hệ thống Phân tán Hiện đại', availableCopies: 2 },
    };
    db.physicalCopy.findUnique.mockResolvedValue(copyMock);
    db.reservation.findFirst.mockResolvedValue(null);

    db.borrowRecord.create.mockResolvedValue({
      id: borrowRecordId,
      userId: readerId,
      physicalCopyId: copyId,
      borrowDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: BorrowStatus.ACTIVE,
    });
    db.physicalCopy.update.mockResolvedValue({ ...copyMock, status: CopyStatus.BORROWED });
    db.book.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/circulation/borrow')
      .set(roleAuthHeader(Role.LIBRARIAN, librarianId))
      .send({ userId: readerId, barcode: copyBarcode });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.borrowRecordId).toBe(borrowRecordId);
    expect(res.body.data.bookTitle).toBe('Hệ thống Phân tán Hiện đại');
  });

  it('Bước 4: Bạn đọc kiểm tra danh sách sách đang mượn trong hồ sơ', async () => {
    db.borrowRecord.findMany.mockResolvedValue([
      {
        id: borrowRecordId,
        status: BorrowStatus.ACTIVE,
        borrowDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        renewCount: 0,
        physicalCopy: {
          barcode: copyBarcode,
          book: { title: 'Hệ thống Phân tán Hiện đại' },
        },
      },
    ]);
    db.borrowRecord.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/users/me/borrow-history')
      .set(roleAuthHeader(Role.READER, readerId));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(borrowRecordId);
  });

  it('Bước 5: Bạn đọc yêu cầu gia hạn thời gian mượn sách', async () => {
    const now = new Date();
    db.user.findUnique.mockResolvedValue({ id: readerId, status: 'ACTIVE' });
    db.fine.count.mockResolvedValue(0);
    db.borrowRecord.findUnique.mockResolvedValue({
      id: borrowRecordId,
      userId: readerId,
      renewCount: 0,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // còn 2 ngày nữa hạn
      status: BorrowStatus.ACTIVE,
      physicalCopy: { bookId, book: { availableCopies: 1 } },
    });
    db.reservation.count.mockResolvedValue(0);
    db.borrowRecord.update.mockResolvedValue({});

    const res = await request(app)
      .post(`/api/v1/circulation/borrow-records/${borrowRecordId}/renew`)
      .set(roleAuthHeader(Role.READER, readerId));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.renewCount).toBe(1);
    expect(res.body.data.message).toBe('Gia hạn thành công');
  });

  it('Bước 6: Bạn đọc cố gia hạn quá số lần quy định và bị hệ thống từ chối', async () => {
    db.user.findUnique.mockResolvedValue({ id: readerId, status: 'ACTIVE' });
    db.fine.count.mockResolvedValue(0);
    db.borrowRecord.findUnique.mockResolvedValue({
      id: borrowRecordId,
      userId: readerId,
      renewCount: 2, // Đã hết 2 lượt gia hạn tối đa
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: BorrowStatus.ACTIVE,
      physicalCopy: { bookId, book: { availableCopies: 1 } },
    });

    const res = await request(app)
      .post(`/api/v1/circulation/borrow-records/${borrowRecordId}/renew`)
      .set(roleAuthHeader(Role.READER, readerId));

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('giới hạn gia hạn');
  });

  it('Bước 7: Bạn đọc mang sách đến trả tại quầy và được ghi nhận thành công', async () => {
    const copyMock = {
      id: copyId,
      barcode: copyBarcode,
      status: CopyStatus.BORROWED,
      bookId,
      book: { id: bookId, title: 'Hệ thống Phân tán Hiện đại', availableCopies: 1 },
    };
    db.physicalCopy.findUnique.mockResolvedValue(copyMock);

    const activeBorrow = {
      id: borrowRecordId,
      userId: readerId,
      physicalCopyId: copyId,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // trả đúng hạn
      status: BorrowStatus.ACTIVE,
    };
    db.borrowRecord.findFirst.mockResolvedValue(activeBorrow);
    db.borrowRecord.update.mockResolvedValue({ ...activeBorrow, status: BorrowStatus.RETURNED });
    db.physicalCopy.update.mockResolvedValue({ ...copyMock, status: CopyStatus.AVAILABLE });
    db.book.update.mockResolvedValue({});
    db.reservation.findFirst.mockResolvedValue(null);
    db.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/circulation/return')
      .set(roleAuthHeader(Role.LIBRARIAN, librarianId))
      .send({ barcode: copyBarcode });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overdueDays).toBe(0);
    expect(res.body.data.fine).toBeNull();
  });
});
