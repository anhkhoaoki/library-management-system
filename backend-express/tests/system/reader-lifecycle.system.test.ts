import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';
import { authHeader } from '../helpers/auth.helper';
import { UserStatus } from '@prisma/client';

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

describe('System Test 1: Toàn bộ Vòng đời Bạn đọc (Identity & Reader Lifecycle E2E)', () => {
  const testEmail = 'nguyenvana@student.edu.vn';
  const initialPassword = 'Password@123';
  const newPassword = 'NewPassword@456';
  const otpCode = '654321';
  let accessToken: string;
  let refreshToken: string;
  let currentPasswordHash: string;

  beforeAll(async () => {
    currentPasswordHash = await bcrypt.hash(initialPassword, 4);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Bước 1: Khách thực hiện đăng ký tài khoản mới trên hệ thống', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.role.findUnique.mockResolvedValue({ id: 'role-reader', name: 'READER' });
    db.user.create.mockResolvedValue({
      id: 'reader-e2e-1',
      email: testEmail,
      fullName: 'Nguyễn Văn A',
      status: UserStatus.PENDING_VERIFICATION,
    });
    db.otpToken.create.mockResolvedValue({
      id: 'otp-e2e-1',
      token: otpCode,
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: initialPassword,
        fullName: 'Nguyễn Văn A',
        phone: '0909123456',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBe('reader-e2e-1');
  });

  it('Bước 2: Bạn đọc nhập mã OTP nhận được để kích hoạt tài khoản', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'reader-e2e-1',
      email: testEmail,
      status: UserStatus.PENDING_VERIFICATION,
    });
    db.otpToken.findFirst.mockResolvedValue({
      id: 'otp-e2e-1',
      token: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    db.user.update.mockResolvedValue({
      id: 'reader-e2e-1',
      status: UserStatus.ACTIVE,
    });
    db.otpToken.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        email: testEmail,
        token: otpCode,
        type: 'REGISTER',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('Xác thực thành công');
  });

  it('Bước 3: Bạn đọc đăng nhập vào hệ thống để lấy Access & Refresh Token', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'reader-e2e-1',
      email: testEmail,
      passwordHash: currentPasswordHash,
      status: UserStatus.ACTIVE,
      role: { name: 'READER' },
    });
    db.user.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: initialPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();

    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('Bước 4: Bạn đọc dùng Access Token xem thông tin hồ sơ của mình', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'reader-e2e-1',
      email: testEmail,
      fullName: 'Nguyễn Văn A',
      phone: '0909123456',
      status: UserStatus.ACTIVE,
      role: { name: 'READER' },
      avatarUrl: null,
      studentId: null,
      readerCode: 'RD-2026-001',
      branchId: null,
      branch: null,
      lastLoginAt: new Date(),
      createdAt: new Date(),
    });

    const res = await request(app)
      .get('/api/v1/users/me')
      .set(authHeader(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.fullName).toBe('Nguyễn Văn A');
  });

  it('Bước 5: Bạn đọc cập nhật thông tin cá nhân (Họ tên và Số điện thoại)', async () => {
    db.user.update.mockResolvedValue({
      id: 'reader-e2e-1',
      fullName: 'Nguyễn Văn A (Cập nhật)',
      phone: '0909888999',
    });

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(authHeader(accessToken))
      .send({
        fullName: 'Nguyễn Văn A (Cập nhật)',
        phone: '0909888999',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe('Nguyễn Văn A (Cập nhật)');
  });

  it('Bước 6: Bạn đọc tiến hành đổi mật khẩu đăng nhập', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'reader-e2e-1',
      passwordHash: currentPasswordHash,
    });
    const newHash = await bcrypt.hash(newPassword, 4);
    db.user.update.mockImplementation(async (args: any) => {
      currentPasswordHash = newHash;
      return { id: 'reader-e2e-1' };
    });

    const res = await request(app)
      .post('/api/v1/users/me/change-password')
      .set(authHeader(accessToken))
      .send({
        currentPassword: initialPassword,
        newPassword: newPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Đổi mật khẩu thành công');
  });

  it('Bước 7: Bạn đọc thử đăng nhập lại bằng mật khẩu cũ và bị từ chối', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'reader-e2e-1',
      email: testEmail,
      passwordHash: currentPasswordHash,
      status: UserStatus.ACTIVE,
      role: { name: 'READER' },
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: initialPassword, // mật khẩu cũ
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('không chính xác');
  });

  it('Bước 8: Bạn đọc đăng nhập thành công với mật khẩu mới', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'reader-e2e-1',
      email: testEmail,
      passwordHash: currentPasswordHash,
      status: UserStatus.ACTIVE,
      role: { name: 'READER' },
    });
    db.user.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: newPassword, // mật khẩu mới
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it('Bước 9: Bạn đọc đăng xuất an toàn khỏi hệ thống', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set(authHeader(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Đăng xuất thành công');
  });
});
