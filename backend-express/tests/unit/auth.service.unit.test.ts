import jwt from 'jsonwebtoken';
import { UserStatus } from '@prisma/client';
import { PrismaMock } from '../helpers/prisma.mock';
import { Role } from '../../src/types/roles';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

jest.mock('../../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'unit-test-jwt-secret',
    JWT_REFRESH_SECRET: 'unit-test-jwt-refresh',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    BCRYPT_ROUNDS: 4,
  },
}));

jest.mock('../../src/config/mailer', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendResetPasswordEmail: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

import bcrypt from 'bcryptjs';
import prisma from '../../src/config/database';
import { sendOtpEmail } from '../../src/config/mailer';
import * as authService from '../../src/modules/auth/auth.service';

const prismaMock = prisma as unknown as PrismaMock;

const readerUser = {
  id: 'user-1',
  email: 'reader@example.com',
  passwordHash: 'hashed-password',
  fullName: 'Nguyen Van A',
  status: UserStatus.ACTIVE,
  failedLoginCount: 0,
  lockedUntil: null,
  branchId: null,
  avatarUrl: null,
  role: { name: Role.READER },
};

describe('auth.service — kiểm thử đơn vị tài khoản (UC-ACC-01/02/03)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sendOtpEmail as jest.Mock).mockResolvedValue(undefined);
  });

  describe('register (UC-ACC-01)', () => {
    it('ném 409 khi email đã tồn tại', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'exists' });
      await expect(
        authService.register({
          email: 'reader@example.com',
          password: 'password1',
          fullName: 'A',
        }),
      ).rejects.toMatchObject({ statusCode: 409, message: 'Email đã được đăng ký trong hệ thống' });
    });

    it('ném 409 khi mã sinh viên trùng', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'other' });
      await expect(
        authService.register({
          email: 'new@example.com',
          password: 'password1',
          fullName: 'A',
          studentId: '2211526',
        }),
      ).rejects.toMatchObject({ statusCode: 409, message: 'Mã số sinh viên đã được sử dụng' });
    });

    it('tạo user PENDING_VERIFICATION, OTP và gửi email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.role.findUnique.mockResolvedValue({ id: 'role-reader', name: 'READER' });
      prismaMock.user.create.mockResolvedValue({ id: 'user-1' });
      prismaMock.otpToken.create.mockResolvedValue({});

      const result = await authService.register({
        email: 'new@example.com',
        password: 'password1',
        fullName: 'A',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('password1', 4);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            status: UserStatus.PENDING_VERIFICATION,
            roleId: 'role-reader',
          }),
        }),
      );
      expect(prismaMock.otpToken.create).toHaveBeenCalled();
      expect(sendOtpEmail).toHaveBeenCalled();
      expect(result.userId).toBe('user-1');
    });
  });

  describe('verifyOtp (UC-ACC-01)', () => {
    it('ném 404 khi không có tài khoản', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(
        authService.verifyOtp({ email: 'x@y.com', token: '111111', type: 'REGISTER' }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('ném 400 khi OTP sai hoặc hết hạn', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaMock.otpToken.findFirst.mockResolvedValue(null);
      await expect(
        authService.verifyOtp({ email: 'x@y.com', token: '000000', type: 'REGISTER' }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn',
      });
    });

    it('kích hoạt tài khoản khi OTP REGISTER hợp lệ', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaMock.otpToken.findFirst.mockResolvedValue({ id: 'otp-1' });
      prismaMock.otpToken.update.mockResolvedValue({});
      prismaMock.user.update.mockResolvedValue({});

      const result = await authService.verifyOtp({
        email: 'x@y.com',
        token: '123456',
        type: 'REGISTER',
      });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: UserStatus.ACTIVE },
      });
      expect(result.message).toBe('Xác thực thành công');
    });
  });

  describe('login (UC-ACC-03)', () => {
    it('ném 401 khi email không tồn tại (không lộ thông tin)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(
        authService.login({ email: 'ghost@example.com', password: 'x' }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Tài khoản hoặc mật khẩu không chính xác',
      });
    });

    it('ném 423 khi tài khoản đang bị khóa tạm', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...readerUser,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      });
      await expect(
        authService.login({ email: readerUser.email, password: 'password1' }),
      ).rejects.toMatchObject({ statusCode: 423 });
    });

    it('ném 403 khi tài khoản bị SUSPENDED', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...readerUser,
        status: UserStatus.SUSPENDED,
      });
      await expect(
        authService.login({ email: readerUser.email, password: 'password1' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('ném 403 khi chưa xác thực email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...readerUser,
        status: UserStatus.PENDING_VERIFICATION,
      });
      await expect(
        authService.login({ email: readerUser.email, password: 'password1' }),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Tài khoản chưa được xác thực email',
      });
    });

    it('tăng failedLoginCount khi sai mật khẩu', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prismaMock.user.findUnique.mockResolvedValue({ ...readerUser, failedLoginCount: 1 });
      prismaMock.user.update.mockResolvedValue({});

      await expect(
        authService.login({ email: readerUser.email, password: 'wrong' }),
      ).rejects.toMatchObject({ statusCode: 401 });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { failedLoginCount: 2 },
      });
    });

    it('khóa 15 phút sau 5 lần đăng nhập sai', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      prismaMock.user.findUnique.mockResolvedValue({ ...readerUser, failedLoginCount: 4 });
      prismaMock.user.update.mockResolvedValue({});

      await expect(
        authService.login({ email: readerUser.email, password: 'wrong' }),
      ).rejects.toMatchObject({ statusCode: 401 });

      const updateArg = prismaMock.user.update.mock.calls[0][0];
      expect(updateArg.data.failedLoginCount).toBe(0);
      expect(updateArg.data.lockedUntil).toBeInstanceOf(Date);
    });

    it('trả accessToken, refreshToken và reset fail count khi đúng mật khẩu', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaMock.user.findUnique.mockResolvedValue(readerUser);
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.auditLog.create.mockResolvedValue({});

      const result = await authService.login(
        { email: readerUser.email, password: 'password1' },
        '127.0.0.1',
        'jest',
      );

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.email).toBe(readerUser.email);
      expect(result.user.role).toBe(Role.READER);
      const decoded = jwt.verify(result.accessToken, 'unit-test-jwt-secret') as { userId: string };
      expect(decoded.userId).toBe('user-1');
      expect(prismaMock.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('ném 401 khi refresh token sai', async () => {
      await expect(authService.refreshToken('invalid')).rejects.toMatchObject({ statusCode: 401 });
    });

    it('cấp accessToken mới khi refresh token và user ACTIVE', async () => {
      const token = jwt.sign(
        { userId: 'user-1', email: readerUser.email, role: Role.READER },
        'unit-test-jwt-refresh',
        { expiresIn: '1h' },
      );
      prismaMock.user.findUnique.mockResolvedValue(readerUser);

      const result = await authService.refreshToken(token);
      expect(result.accessToken).toBeTruthy();
      const decoded = jwt.verify(result.accessToken, 'unit-test-jwt-secret') as { userId: string };
      expect(decoded.userId).toBe('user-1');
    });
  });

  describe('forgotPassword / resetPassword (UC-ACC-02)', () => {
    it('forgotPassword vẫn trả cùng message khi email không tồn tại', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const result = await authService.forgotPassword('ghost@example.com');
      expect(result.message).toMatch(/Nếu email tồn tại/);
      expect(prismaMock.otpToken.create).not.toHaveBeenCalled();
    });

    it('forgotPassword tạo OTP RESET_PASSWORD khi email tồn tại', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaMock.otpToken.create.mockResolvedValue({});
      await authService.forgotPassword(readerUser.email);
      expect(prismaMock.otpToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'RESET_PASSWORD', userId: 'user-1' }),
        }),
      );
      expect(sendOtpEmail).toHaveBeenCalled();
    });

    it('resetPassword ném 400 khi OTP không hợp lệ', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaMock.otpToken.findFirst.mockResolvedValue(null);
      await expect(
        authService.resetPassword(readerUser.email, '000000', 'newpass12'),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('resetPassword cập nhật hash và đánh dấu OTP đã dùng', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prismaMock.otpToken.findFirst.mockResolvedValue({ id: 'otp-1' });
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.otpToken.update.mockResolvedValue({});

      const result = await authService.resetPassword(readerUser.email, '123456', 'newpass12');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass12', 4);
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(prismaMock.otpToken.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(result.message).toBe('Mật khẩu đã được đặt lại thành công');
    });
  });
});
