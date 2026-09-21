import request from 'supertest';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';
import { roleAuthHeader } from '../helpers/auth.helper';
import { Role } from '../../src/types/roles';
import { TransferStatus } from '@prisma/client';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

import prisma from '../../src/config/database';
import app from '../../src/app';

const db = prisma as unknown as PrismaMock;

describe('Branches Integration Tests (Kiểm thử tích hợp Luân chuyển & Chi nhánh thư viện)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/branches/transfer-request (UC-CIR-06)', () => {
    it('trả về 401 Unauthorized khi không có token xác thực', async () => {
      const response = await request(app)
        .post('/api/v1/branches/transfer-request')
        .send({ bookId: 'book-1', toBranchId: 'branch-2' });

      expect(response.status).toBe(401);
    });

    it('trả về 201 Created khi bạn đọc hoặc thủ thư tạo yêu cầu chuyển sách liên chi nhánh', async () => {
      db.book.findUnique.mockResolvedValue({ id: 'book-1', title: 'Giáo trình Mạng Máy Tính' });
      db.branch.findUnique.mockResolvedValue({ id: 'branch-2', name: 'Cơ sở Dĩ An' });
      db.physicalCopy.findFirst.mockResolvedValue({
        id: 'copy-branch-1',
        branchId: 'branch-1',
        branch: { id: 'branch-1', name: 'Cơ sở 1' },
      });

      db.branchTransfer.create.mockResolvedValue({
        id: 'transfer-1',
        physicalCopyId: 'copy-branch-1',
        fromBranchId: 'branch-1',
        toBranchId: 'branch-2',
        status: TransferStatus.REQUESTED,
        requestedById: 'user-reader-1',
      });
      db.physicalCopy.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/branches/transfer-request')
        .set(roleAuthHeader(Role.READER, 'user-reader-1'))
        .send({ bookId: 'book-1', toBranchId: 'branch-2' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transferId).toBe('transfer-1');
    });
  });

  describe('GET /api/v1/branches/transfers/pending', () => {
    it('trả về 403 Forbidden khi bạn đọc (READER) cố xem danh sách chuyển sách chờ xử lý', async () => {
      const response = await request(app)
        .get('/api/v1/branches/transfers/pending')
        .set(roleAuthHeader(Role.READER));

      expect(response.status).toBe(403);
    });

    it('trả về 200 cùng danh sách yêu cầu chuyển sách khi Thủ thư (LIBRARIAN) truy cập', async () => {
      db.branchTransfer.findMany.mockResolvedValue([
        {
          id: 'transfer-1',
          status: TransferStatus.REQUESTED,
          fromBranch: { name: 'Cơ sở 1' },
          toBranch: { name: 'Cơ sở 2' },
        },
      ]);

      const response = await request(app)
        .get('/api/v1/branches/transfers/pending')
        .set(roleAuthHeader(Role.LIBRARIAN, 'lib-1', 'branch-1'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('PATCH /api/v1/branches/transfers/:id/status', () => {
    it('trả về 403 khi bạn đọc (READER) cố duyệt trạng thái điều chuyển', async () => {
      const response = await request(app)
        .patch('/api/v1/branches/transfers/transfer-1/status')
        .set(roleAuthHeader(Role.READER))
        .send({ status: TransferStatus.IN_TRANSIT });

      expect(response.status).toBe(403);
    });

    it('trả về 200 khi Thủ thư cập nhật trạng thái luân chuyển sách thành công', async () => {
      db.branchTransfer.findUnique.mockResolvedValue({
        id: 'transfer-1',
        status: TransferStatus.REQUESTED,
        copyId: 'copy-1',
      });
      db.branchTransfer.update.mockResolvedValue({
        id: 'transfer-1',
        status: TransferStatus.IN_TRANSIT,
      });

      const response = await request(app)
        .patch('/api/v1/branches/transfers/transfer-1/status')
        .set(roleAuthHeader(Role.LIBRARIAN))
        .send({ status: TransferStatus.IN_TRANSIT });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(TransferStatus.IN_TRANSIT);
    });
  });
});
