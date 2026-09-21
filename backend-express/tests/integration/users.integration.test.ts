import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';
import { roleAuthHeader } from '../helpers/auth.helper';
import { Role } from '../../src/types/roles';
import { BorrowStatus, UserStatus } from '@prisma/client';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

import prisma from '../../src/config/database';
import app from '../../src/app';

const db = prisma as unknown as PrismaMock;

describe('Users Integration Tests (Kiểm thử tích hợp Hồ sơ & Tài khoản người dùng)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/users/me (UC-ACC-04)', () => {
    it('trả về 401 Unauthorized khi truy cập không có token', async () => {
      const response = await request(app).get('/api/v1/users/me');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('trả về 200 cùng thông tin hồ sơ của người dùng khi có token hợp lệ', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'user-reader-1',
        email: 'reader@library.edu.vn',
        fullName: 'Nguyễn Văn Đọc',
        phone: '0987654321',
        avatarUrl: null,
        studentId: 'SV12345',
        readerCode: 'RD-0001',
        role: { name: 'READER' },
        status: UserStatus.ACTIVE,
        branchId: 'branch-1',
        branch: { id: 'branch-1', name: 'Thư viện Trung tâm' },
        lastLoginAt: new Date(),
        createdAt: new Date(),
      });

      const response = await request(app)
        .get('/api/v1/users/me')
        .set(roleAuthHeader(Role.READER, 'user-reader-1'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('reader@library.edu.vn');
      expect(response.body.data.role).toBe('READER');
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('trả về 200 khi cập nhật thông tin cá nhân thành công', async () => {
      db.user.update.mockResolvedValue({
        id: 'user-reader-1',
        fullName: 'Nguyễn Văn Đọc Mới',
        phone: '0911223344',
      });

      const response = await request(app)
        .patch('/api/v1/users/me')
        .set(roleAuthHeader(Role.READER, 'user-reader-1'))
        .send({
          fullName: 'Nguyễn Văn Đọc Mới',
          phone: '0911223344',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fullName).toBe('Nguyễn Văn Đọc Mới');
    });
  });

  describe('GET /api/v1/users/me/borrow-history (UC-ACC-05)', () => {
    it('trả về 200 cùng danh sách lịch sử mượn trả của người dùng', async () => {
      db.borrowRecord.findMany.mockResolvedValue([
        {
          id: 'br-1',
          status: BorrowStatus.RETURNED,
          borrowDate: new Date(),
          physicalCopy: { barcode: 'BK-0001', book: { title: 'Lập trình TypeScript' } },
        },
      ]);
      db.borrowRecord.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/users/me/borrow-history')
        .query({ page: 1, limit: 10 })
        .set(roleAuthHeader(Role.READER, 'user-reader-1'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('POST /api/v1/users/me/change-password', () => {
    it('trả về 400 khi thiếu mật khẩu cũ hoặc mật khẩu mới', async () => {
      const response = await request(app)
        .post('/api/v1/users/me/change-password')
        .set(roleAuthHeader(Role.READER, 'user-reader-1'))
        .send({ currentPassword: 'OldPassword@123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('bắt buộc');
    });

    it('trả về 400 khi mật khẩu hiện tại không chính xác', async () => {
      const currentHash = await bcrypt.hash('CorrectPass@123', 4);
      db.user.findUnique.mockResolvedValue({
        id: 'user-reader-1',
        passwordHash: currentHash,
      });

      const response = await request(app)
        .post('/api/v1/users/me/change-password')
        .set(roleAuthHeader(Role.READER, 'user-reader-1'))
        .send({
          currentPassword: 'WrongPass@999',
          newPassword: 'BrandNewPass@123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('không chính xác');
    });

    it('trả về 200 khi đổi mật khẩu thành công', async () => {
      const currentHash = await bcrypt.hash('CorrectPass@123', 4);
      db.user.findUnique.mockResolvedValue({
        id: 'user-reader-1',
        passwordHash: currentHash,
      });
      db.user.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/users/me/change-password')
        .set(roleAuthHeader(Role.READER, 'user-reader-1'))
        .send({
          currentPassword: 'CorrectPass@123',
          newPassword: 'BrandNewPass@123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Đổi mật khẩu thành công');
    });
  });

  describe('GET /api/v1/users/lookup/:code', () => {
    it('trả về 403 Forbidden khi bạn đọc (READER) tra cứu thông tin bạn đọc khác', async () => {
      const response = await request(app)
        .get('/api/v1/users/lookup/SV12345')
        .set(roleAuthHeader(Role.READER));

      expect(response.status).toBe(403);
    });

    it('trả về 200 khi Thủ thư (LIBRARIAN) tra cứu bạn đọc theo mã số thành công', async () => {
      db.user.findFirst.mockResolvedValue({
        id: 'reader-found',
        email: 'student@edu.vn',
        fullName: 'Trần Văn Sinh Viên',
        studentId: 'SV12345',
        role: { name: 'READER' },
        status: UserStatus.ACTIVE,
      });

      const response = await request(app)
        .get('/api/v1/users/lookup/SV12345')
        .set(roleAuthHeader(Role.LIBRARIAN));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fullName).toBe('Trần Văn Sinh Viên');
    });
  });
});
