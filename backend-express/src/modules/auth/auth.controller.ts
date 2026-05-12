import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import {
  registerDto,
  loginDto,
  verifyOtpDto,
  forgotPasswordDto,
  resetPasswordDto,
  refreshTokenDto,
} from './auth.dto';

// ─── UC-ACC-01 ───────────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = registerDto.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400).json({ success: false, message: error.details.map(d => d.message).join(', ') });
      return;
    }
    const result = await authService.register(value);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = verifyOtpDto.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }
    const result = await authService.verifyOtp(value);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ─── UC-ACC-03 ───────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = loginDto.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await authService.login(value, ipAddress, userAgent);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = refreshTokenDto.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }
    const result = await authService.refreshToken(value.refreshToken);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response) => {
  // Stateless JWT: client discards token; in production use a token blacklist
  res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
};

// ─── UC-ACC-02 ───────────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = forgotPasswordDto.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }
    const result = await authService.forgotPassword(value.email);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = resetPasswordDto.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, message: error.details[0].message });
      return;
    }
    const result = await authService.resetPassword(value.token, value.newPassword);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
