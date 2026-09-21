import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../src/middlewares/auth.middleware';
import { Role } from '../../src/types/roles';

jest.mock('../../src/config/env', () => ({
  env: {
    JWT_SECRET: 'unit-test-jwt-secret',
    JWT_REFRESH_SECRET: 'unit-test-jwt-refresh',
  },
}));

const mockRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json, res: { status } as unknown as Response };
};

describe('auth.middleware — authenticate & authorize', () => {
  describe('authenticate', () => {
    it('trả 401 khi thiếu header Authorization', () => {
      const { status, json, res } = mockRes();
      const req = { headers: {} } as Request;
      authenticate(req, res, jest.fn());
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({
        success: false,
        message: 'Không có token xác thực',
      });
    });

    it('trả 401 khi token không hợp lệ', () => {
      const { status, json, res } = mockRes();
      const req = { headers: { authorization: 'Bearer not-a-jwt' } } as Request;
      authenticate(req, res, jest.fn());
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({
        success: false,
        message: 'Token không hợp lệ',
      });
    });

    it('trả 401 khi token hết hạn', () => {
      const token = jwt.sign(
        { userId: 'u1', email: 'a@b.com', role: Role.READER, exp: Math.floor(Date.now() / 1000) - 60 },
        'unit-test-jwt-secret',
      );
      const { status, json, res } = mockRes();
      const req = { headers: { authorization: `Bearer ${token}` } } as Request;
      authenticate(req, res, jest.fn());
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({
        success: false,
        message: 'Token đã hết hạn',
      });
    });

    it('gán req.user và gọi next khi token hợp lệ', () => {
      const token = jwt.sign(
        { userId: 'u1', email: 'a@b.com', role: Role.LIBRARIAN },
        'unit-test-jwt-secret',
        { expiresIn: '1h' },
      );
      const { res } = mockRes();
      const req = { headers: { authorization: `Bearer ${token}` } } as Request;
      const next = jest.fn() as NextFunction;
      authenticate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user?.userId).toBe('u1');
      expect(req.user?.role).toBe(Role.LIBRARIAN);
    });
  });

  describe('authorize', () => {
    it('trả 401 khi chưa xác thực', () => {
      const { status, json, res } = mockRes();
      const req = {} as Request;
      authorize(Role.ADMIN)(req, res, jest.fn());
      expect(status).toHaveBeenCalledWith(401);
    });

    it('trả 403 khi vai trò không được phép', () => {
      const { status, json, res } = mockRes();
      const req = { user: { userId: 'u1', email: 'a@b.com', role: Role.READER } } as Request;
      authorize(Role.ADMIN, Role.LIBRARIAN)(req, res, jest.fn());
      expect(status).toHaveBeenCalledWith(403);
      expect(json).toHaveBeenCalledWith({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này',
      });
    });

    it('cho phép ADMIN đi tiếp', () => {
      const { res } = mockRes();
      const req = { user: { userId: 'u1', email: 'a@b.com', role: Role.ADMIN } } as Request;
      const next = jest.fn() as NextFunction;
      authorize(Role.ADMIN)(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
