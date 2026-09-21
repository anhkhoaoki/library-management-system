import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';
import { roleAuthHeader } from '../helpers/auth.helper';
import { Role } from '../../src/types/roles';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

import prisma from '../../src/config/database';
import app from '../../src/app';

const db = prisma as unknown as PrismaMock;

describe('Auth Integration Tests (Kiểm thử tích hợp Xác thực & Đăng nhập)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register (UC-ACC-01)', () => {
    it('trả về 201 khi đăng ký tài khoản mới hợp lệ', async () => {
      db.user.findUnique.mockResolvedValue(null);
      db.role.findUnique.mockResolvedValue({ id: 'role-reader', name: 'READER' });
      db.user.create.mockResolvedValue({
        id: 'new-user-1',
        email: 'newuser@student.edu.vn',
        fullName: 'Nguyễn Văn Mới',
        status: 'PENDING_VERIFICATION',
        role: { name: 'READER' },
      });
      db.otpToken.create.mockResolvedValue({
        id: 'otp-1',
        token: '123456',
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@student.edu.vn',
          password: 'Password@123',
          fullName: 'Nguyễn Văn Mới',
          phone: '0912345678',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe('new-user-1');
      expect(response.body.data.message).toContain('Mã OTP đã được gửi');
    });

    it('trả về 400 khi dữ liệu đầu vào không hợp lệ (mật khẩu quá ngắn)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123',
          fullName: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    it('trả về 409 khi email đã tồn tại trên hệ thống', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'exist@student.edu.vn',
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'exist@student.edu.vn',
          password: 'Password@123',
          fullName: 'Đã Tồn Tại',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email đã được đăng ký');
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('trả về 200 khi xác thực mã OTP kích hoạt thành công', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'user-pending',
        email: 'pending@student.edu.vn',
        status: 'PENDING_VERIFICATION',
      });
      db.otpToken.findFirst.mockResolvedValue({
        id: 'token-1',
        token: '123456',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      db.user.update.mockResolvedValue({
        id: 'user-pending',
        status: 'ACTIVE',
      });
      db.otpToken.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: 'pending@student.edu.vn',
          token: '123456',
          type: 'REGISTER',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('thành công');
    });

    it('trả về 400 khi mã OTP không chính xác hoặc hết hạn', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'user-pending',
        email: 'pending@student.edu.vn',
        status: 'PENDING_VERIFICATION',
      });
      db.otpToken.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: 'pending@student.edu.vn',
          token: '999999',
          type: 'REGISTER',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login (UC-ACC-03)', () => {
    it('trả về 200 cùng accessToken và refreshToken khi đăng nhập hợp lệ', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass@123', 4);
      db.user.findUnique.mockResolvedValue({
        id: 'user-active-1',
        email: 'reader@library.edu.vn',
        passwordHash,
        status: 'ACTIVE',
        role: { name: 'READER' },
      });
      db.user.update.mockResolvedValue({});
      db.auditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'reader@library.edu.vn',
          password: 'CorrectPass@123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe('reader@library.edu.vn');
    });

    it('trả về 401 khi mật khẩu sai', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass@123', 4);
      db.user.findUnique.mockResolvedValue({
        id: 'user-active-1',
        email: 'reader@library.edu.vn',
        passwordHash,
        status: 'ACTIVE',
        role: { name: 'READER' },
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'reader@library.edu.vn',
          password: 'WrongPassword@999',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('không chính xác');
    });

    it('trả về 403 khi tài khoản đang bị khóa hoặc cấm', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass@123', 4);
      db.user.findUnique.mockResolvedValue({
        id: 'user-banned',
        email: 'banned@library.edu.vn',
        passwordHash,
        status: 'BANNED',
        role: { name: 'READER' },
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'banned@library.edu.vn',
          password: 'CorrectPass@123',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('bị khóa');
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('trả về 200 và cặp token mới khi refreshToken hợp lệ', async () => {
      const refreshToken = jwt.sign(
        { userId: 'user-active-1', email: 'reader@library.edu.vn', role: 'READER' },
        process.env.JWT_REFRESH_SECRET || 'unit-test-jwt-refresh',
        { expiresIn: '7d' }
      );

      db.user.findUnique.mockResolvedValue({
        id: 'user-active-1',
        email: 'reader@library.edu.vn',
        status: 'ACTIVE',
        role: { name: 'READER' },
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('trả về 401 khi refreshToken không hợp lệ hoặc sai chữ ký', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid-token-signature' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('trả về 401 khi gọi logout mà không có token', async () => {
      const response = await request(app).post('/api/v1/auth/logout');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('trả về 200 thông báo đăng xuất thành công khi có token hợp lệ', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set(roleAuthHeader(Role.READER));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Đăng xuất thành công');
    });
  });

  describe('POST /api/v1/auth/forgot-password & reset-password (UC-ACC-02)', () => {
    it('trả về 200 thông báo an toàn khi yêu cầu quên mật khẩu (dù email có tồn tại hay không)', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'reader@library.edu.vn',
      });
      db.otpToken.create.mockResolvedValue({ token: 'reset-token-123' });

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'reader@library.edu.vn' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('hướng dẫn đặt lại mật khẩu');
    });

    it('trả về 400 khi đặt lại mật khẩu với token/OTP không chính xác', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'reader@library.edu.vn',
      });
      db.otpToken.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: 'reader@library.edu.vn',
          token: 'wrong-otp',
          newPassword: 'NewPassword@123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
