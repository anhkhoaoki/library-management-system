import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { createError } from '../../middlewares/error.middleware';
import { UserStatus, AuditAction } from '@prisma/client';
import { AuthPayload } from '../../middlewares/auth.middleware';
import { sendOtpEmail, sendResetPasswordEmail } from '../../config/mailer';

// ─── Constants ──────────────────────────────────────────────
const OTP_EXPIRES_MINUTES = 10;
const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MINUTES = 15;

// ─── Token Helpers ───────────────────────────────────────────
const generateAccessToken = (payload: AuthPayload): string =>
  jwt.sign(payload as object, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as unknown as number });

const generateRefreshToken = (payload: AuthPayload): string =>
  jwt.sign(payload as object, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as number });

// ─── UC-ACC-01: Register ─────────────────────────────────────
export const register = async (data: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}) => {
  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw createError('Email đã được đăng ký trong hệ thống', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      phone: data.phone,
      status: UserStatus.PENDING_VERIFICATION,
    },
  });

  // Generate OTP
  const otpToken = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

  await prisma.otpToken.create({
    data: {
      userId: user.id,
      token: otpToken,
      type: 'REGISTER',
      expiresAt,
    },
  });

  // Gửi OTP qua email
  await sendOtpEmail(data.email, otpToken, OTP_EXPIRES_MINUTES);

  return { message: 'Mã OTP đã được gửi đến email của bạn', userId: user.id };
};

// ─── UC-ACC-01: Verify OTP ───────────────────────────────────
export const verifyOtp = async (data: {
  email: string;
  token: string;
  type: string;
}) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw createError('Tài khoản không tồn tại', 404);

  const otpRecord = await prisma.otpToken.findFirst({
    where: {
      userId: user.id,
      token: data.token,
      type: data.type,
      usedAt: null,
      expiresAt: { gte: new Date() },
    },
  });

  if (!otpRecord) {
    throw createError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
  }

  // Mark OTP as used
  await prisma.otpToken.update({
    where: { id: otpRecord.id },
    data: { usedAt: new Date() },
  });

  if (data.type === 'REGISTER') {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: UserStatus.ACTIVE },
    });
  }

  return { message: 'Xác thực thành công' };
};

// ─── UC-ACC-03: Login ────────────────────────────────────────
export const login = async (
  data: { email: string; password: string },
  ipAddress?: string,
  userAgent?: string
) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  // Generic message to prevent user enumeration
  if (!user) {
    throw createError('Tài khoản hoặc mật khẩu không chính xác', 401);
  }

  // Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    throw createError(
      `Tài khoản tạm khóa, vui lòng thử lại sau ${minutesLeft} phút`,
      423
    );
  }

  // Check account status
  if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BANNED) {
    throw createError(
      'Tài khoản của bạn đã bị khóa, vui lòng liên hệ Admin',
      403
    );
  }

  if (user.status === UserStatus.PENDING_VERIFICATION) {
    throw createError('Tài khoản chưa được xác thực email', 403);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

  if (!isPasswordValid) {
    const newFailCount = user.failedLoginCount + 1;
    const updateData: Record<string, unknown> = { failedLoginCount: newFailCount };

    if (newFailCount >= MAX_FAILED_LOGINS) {
      updateData.lockedUntil = new Date(
        Date.now() + LOCK_DURATION_MINUTES * 60 * 1000
      );
      updateData.failedLoginCount = 0;
    }

    await prisma.user.update({ where: { id: user.id }, data: updateData });

    throw createError('Tài khoản hoặc mật khẩu không chính xác', 401);
  }

  // Reset failed count on success
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  // Generate tokens
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Write audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
      riskLevel: 'INFO',
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      branchId: user.branchId,
    },
  };
};

// ─── Refresh Token ───────────────────────────────────────────
export const refreshToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthPayload;

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw createError('Tài khoản không hợp lệ', 401);
    }

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(payload);
    return { accessToken: newAccessToken };
  } catch {
    throw createError('Refresh token không hợp lệ hoặc đã hết hạn', 401);
  }
};

// ─── UC-ACC-02: Forgot Password ──────────────────────────────
export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent user enumeration
  if (!user) {
    return { message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu' };
  }

  // Tạo mã OTP 6 số (giống flow đăng kí)
  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

  await prisma.otpToken.create({
    data: {
      userId: user.id,
      token: resetToken,
      type: 'RESET_PASSWORD',
      expiresAt,
    },
  });

  // Gửi OTP qua email
  await sendOtpEmail(email, resetToken, 15);

  return { message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu' };
};

// ─── UC-ACC-02: Reset Password ───────────────────────────────
export const resetPassword = async (email: string, token: string, newPassword: string) => {
  // Xác định user trước — giới hạn phạm vi OTP theo đúng tài khoản
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw createError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
  }

  const otpRecord = await prisma.otpToken.findFirst({
    where: {
      userId: user.id,
      token,
      type: 'RESET_PASSWORD',
      usedAt: null,
      expiresAt: { gte: new Date() },
    },
  });

  if (!otpRecord) {
    throw createError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await prisma.otpToken.update({
    where: { id: otpRecord.id },
    data: { usedAt: new Date() },
  });

  return { message: 'Mật khẩu đã được đặt lại thành công' };
};
