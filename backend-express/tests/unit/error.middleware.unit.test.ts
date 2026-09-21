import { Request, Response, NextFunction } from 'express';
import { createError, errorMiddleware, AppError } from '../../src/middlewares/error.middleware';

jest.mock('../../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

describe('error.middleware — createError & errorMiddleware', () => {
  it('createError gán message, statusCode và isOperational', () => {
    const err = createError('Email đã được đăng ký trong hệ thống', 409);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Email đã được đăng ký trong hệ thống');
    expect(err.statusCode).toBe(409);
    expect(err.isOperational).toBe(true);
  });

  it('errorMiddleware trả JSON success=false với đúng HTTP status', () => {
    const err: AppError = createError('Tài liệu không tồn tại', 404);
    const req = {} as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    errorMiddleware(err, req, res, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Tài liệu không tồn tại',
    });
  });

  it('errorMiddleware mặc định 500 khi không có statusCode', () => {
    const err: AppError = new Error('boom');
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    errorMiddleware(err, {} as Request, res, jest.fn());

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'boom' }),
    );
  });
});
