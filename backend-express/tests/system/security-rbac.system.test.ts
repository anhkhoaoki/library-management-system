import request from 'supertest';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';
import {
  roleAuthHeader,
  generateExpiredToken,
  generateTamperedToken,
  authHeader,
} from '../helpers/auth.helper';
import { Role } from '../../src/types/roles';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

import prisma from '../../src/config/database';
import app from '../../src/app';

const db = prisma as unknown as PrismaMock;

describe('System Test 5: An ninh, Phân quyền RBAC & Khả năng Chịu lỗi Toàn hệ thống (Security E2E)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Kiểm soát Danh tính & Xác thực Token (Authentication Enforcement)', () => {
    it('từ chối 401 khi truy cập endpoint bảo vệ mà không có token', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Không có token xác thực');
    });

    it('từ chối 401 khi token bị làm giả mạo chữ ký (Tampered Token)', async () => {
      const tamperedToken = generateTamperedToken();
      const res = await request(app)
        .get('/api/v1/users/me')
        .set(authHeader(tamperedToken));

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Token không hợp lệ');
    });

    it('từ chối 401 khi token đã hết hạn sử dụng (Expired Token)', async () => {
      const expiredToken = generateExpiredToken();
      const res = await request(app)
        .get('/api/v1/users/me')
        .set(authHeader(expiredToken));

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Token đã hết hạn');
    });
  });

  describe('2. Kiểm soát Phân quyền RBAC Đa cấp (Role-Based Access Control)', () => {
    it('Bạn đọc (READER) bị chặn 403 khi cố tạo sách mới', async () => {
      const res = await request(app)
        .post('/api/v1/books')
        .set(roleAuthHeader(Role.READER))
        .send({ title: 'Sách Trái Phép' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('không có quyền');
    });

    it('Bạn đọc (READER) bị chặn 403 khi cố truy cập danh sách luân chuyển nội bộ', async () => {
      const res = await request(app)
        .get('/api/v1/branches/transfers/pending')
        .set(roleAuthHeader(Role.READER));

      expect(res.status).toBe(403);
    });

    it('Thủ thư (LIBRARIAN) bị chặn 403 khi cố gọi API cập nhật vai trò người dùng (Chỉ ADMIN được phép)', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/users/target-user/role')
        .set(roleAuthHeader(Role.LIBRARIAN))
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Quản trị viên (ADMIN) có toàn quyền thực hiện cập nhật vai trò người dùng', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'target-user',
        email: 'user@test.local',
        role: { name: 'READER' },
      });
      db.role.findUnique.mockResolvedValue({ id: 'role-lib', name: 'LIBRARIAN' });
      db.user.update.mockResolvedValue({
        id: 'target-user',
        email: 'user@test.local',
        role: { name: 'LIBRARIAN' },
      });
      db.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .patch('/api/v1/admin/users/target-user/role')
        .set(roleAuthHeader(Role.ADMIN))
        .send({ role: 'LIBRARIAN' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('LIBRARIAN');
    });
  });

  describe('3. Tiêu đề An toàn Bảo mật HTTP (Helmet Security Headers)', () => {
    it('phản hồi HTTP phải chứa các tiêu đề bảo vệ an ninh bắt buộc', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-dns-prefetch-control']).toBeDefined();
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('4. Khả năng Chịu lỗi & Bảo toàn Dữ liệu (Fault Tolerance)', () => {
    it('trả về 404 có cấu trúc thống nhất cho các endpoint không tồn tại', async () => {
      const res = await request(app).get('/api/v1/non-existent-route-999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Endpoint không tồn tại');
    });

    it('xử lý an toàn khi body JSON bị gửi sai cấu trúc', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "broken-json'); // cú pháp json thiếu ngoặc đóng

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
