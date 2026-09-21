import request from 'supertest';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';
import { roleAuthHeader } from '../helpers/auth.helper';
import { Role } from '../../src/types/roles';
import { CopyStatus, BorrowStatus, FineStatus } from '@prisma/client';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

jest.mock('../../src/modules/notifications/notifications.service', () => ({
  notifyFineCreated: jest.fn().mockResolvedValue(undefined),
  notifyBorrowApproved: jest.fn().mockResolvedValue(undefined),
  notifyReservationReady: jest.fn().mockResolvedValue(undefined),
}));

import prisma from '../../src/config/database';
import app from '../../src/app';

const db = prisma as unknown as PrismaMock;

describe('System Test 4: Xử lý Quá hạn, Phạt và Khôi phục Quyền mượn (Overdue & Penalty E2E)', () => {
  const readerId = 'reader-penalty-1';
  const librarianId = 'librarian-1';
  const overdueBarcode = 'BK-OVERDUE-01';
  const nextBookBarcode = 'BK-NEXT-02';
  const fineId = 'fine-sys-1';

  beforeEach(() => {
    jest.clearAllMocks();
    db.systemConfig.findUnique.mockResolvedValue(null);
  });

  it('Bước 1: Trả sách bị trễ hạn -> Hệ thống tự động ghi nhận số ngày quá hạn và tạo khoản phạt PENDING', async () => {
    const overdueCopy = {
      id: 'copy-overdue-1',
      barcode: overdueBarcode,
      status: CopyStatus.BORROWED,
      bookId: 'book-1',
      book: { id: 'book-1', title: 'Cấu trúc Dữ liệu & Giải thuật', availableCopies: 0 },
    };
    db.physicalCopy.findUnique.mockResolvedValue(overdueCopy);

    const overdueBorrow = {
      id: 'borrow-rec-overdue',
      userId: readerId,
      physicalCopyId: 'copy-overdue-1',
      dueDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // Trễ 4 ngày
      status: BorrowStatus.ACTIVE,
    };
    db.borrowRecord.findFirst.mockResolvedValue(overdueBorrow);

    db.fine.create.mockResolvedValue({
      id: fineId,
      borrowRecordId: 'borrow-rec-overdue',
      userId: readerId,
      totalAmount: 8000, // 4 ngày * 2000đ
      status: FineStatus.PENDING,
    });
    db.borrowRecord.update.mockResolvedValue({ ...overdueBorrow, status: BorrowStatus.RETURNED });
    db.physicalCopy.update.mockResolvedValue({ ...overdueCopy, status: CopyStatus.AVAILABLE });
    db.book.update.mockResolvedValue({});
    db.reservation.findFirst.mockResolvedValue(null);
    db.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/circulation/return')
      .set(roleAuthHeader(Role.LIBRARIAN, librarianId))
      .send({ barcode: overdueBarcode });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overdueDays).toBeGreaterThanOrEqual(4);
    expect(res.body.data.fine).toBeDefined();
    expect(res.body.data.fine.fineId).toBe(fineId);
  });

  it('Bước 2: Bạn đọc cố mượn sách mới nhưng bị chặn do còn khoản phạt chưa nộp', async () => {
    db.user.findUnique.mockResolvedValue({
      id: readerId,
      status: 'ACTIVE',
      role: { name: 'READER' },
    });
    db.fine.count.mockResolvedValue(1); // 1 khoản phạt chưa thanh toán

    const res = await request(app)
      .post('/api/v1/circulation/borrow')
      .set(roleAuthHeader(Role.LIBRARIAN, librarianId))
      .send({ userId: readerId, barcode: nextBookBarcode });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('khoản phạt chưa thanh toán');
  });

  it('Bước 3: Bạn đọc tra cứu danh sách các khoản phạt trong hồ sơ cá nhân', async () => {
    db.fine.findMany.mockResolvedValue([
      {
        id: fineId,
        totalAmount: 8000,
        status: FineStatus.PENDING,
        createdAt: new Date(),
        borrowRecord: {
          physicalCopy: {
            book: { title: 'Cấu trúc Dữ liệu & Giải thuật' },
          },
        },
      },
    ]);

    const res = await request(app)
      .get('/api/v1/users/me/fines')
      .set(roleAuthHeader(Role.READER, readerId));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe(FineStatus.PENDING);
    expect(res.body.data[0].totalAmount).toBe(8000);
  });

  it('Bước 4: Bạn đọc nộp phạt tại quầy; Thủ thư xử lý thanh toán hoàn tất (PAID)', async () => {
    db.fine.findUnique.mockResolvedValue({
      id: fineId,
      totalAmount: 8000,
      status: FineStatus.PENDING,
      userId: readerId,
    });
    db.fine.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post(`/api/v1/circulation/fines/${fineId}/pay`)
      .set(roleAuthHeader(Role.LIBRARIAN, librarianId));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('Thanh toán phí phạt thành công');
  });

  it('Bước 5: Quyền mượn sách được khôi phục; Bạn đọc mượn tài liệu mới thành công', async () => {
    db.user.findUnique.mockResolvedValue({
      id: readerId,
      status: 'ACTIVE',
      role: { name: 'READER' },
      fullName: 'Bạn Đọc Đã Nộp Phạt',
    });
    db.fine.count.mockResolvedValue(0); // Không còn phạt
    db.borrowRecord.count.mockResolvedValue(0);

    const nextCopy = {
      id: 'copy-next-1',
      barcode: nextBookBarcode,
      status: CopyStatus.AVAILABLE,
      bookId: 'book-2',
      book: { id: 'book-2', title: 'Học Máy Toàn Thư', availableCopies: 3 },
    };
    db.physicalCopy.findUnique.mockResolvedValue(nextCopy);
    db.reservation.findFirst.mockResolvedValue(null);

    db.borrowRecord.create.mockResolvedValue({
      id: 'borrow-rec-new-1',
      userId: readerId,
      physicalCopyId: 'copy-next-1',
      status: BorrowStatus.ACTIVE,
    });
    db.physicalCopy.update.mockResolvedValue({ ...nextCopy, status: CopyStatus.BORROWED });
    db.book.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/circulation/borrow')
      .set(roleAuthHeader(Role.LIBRARIAN, librarianId))
      .send({ userId: readerId, barcode: nextBookBarcode });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.borrowRecordId).toBe('borrow-rec-new-1');
  });
});
