import { BorrowStatus } from '@prisma/client';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('new-hash'),
}));

import bcrypt from 'bcryptjs';
import prisma from '../../src/config/database';
import * as usersService from '../../src/modules/users/users.service';

const db = prisma as unknown as PrismaMock;

describe('users.service — kiểm thử đơn vị hồ sơ / thống kê / đổi mật khẩu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile (UC-ACC-04)', () => {
    it('ném 404 khi user không tồn tại', async () => {
      db.user.findUnique.mockResolvedValue(null);
      await expect(usersService.getProfile('u-missing')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('trả role dạng string từ quan hệ role.name', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        fullName: 'A',
        role: { name: 'READER' },
      });
      const profile = await usersService.getProfile('u1');
      expect(profile.role).toBe('READER');
    });
  });

  describe('lookupUserByCode', () => {
    it('ném 404 khi không khớp mã', async () => {
      db.user.findFirst.mockResolvedValue(null);
      await expect(usersService.lookupUserByCode('2211526')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateProfile (UC-ACC-04)', () => {
    it('ném 409 khi studentId thuộc user khác', async () => {
      db.user.findUnique
        .mockResolvedValueOnce({ id: 'u1' })
        .mockResolvedValueOnce({ id: 'u2', studentId: '2211526' });
      await expect(
        usersService.updateProfile('u1', { studentId: '2211526' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('getBorrowHistory (UC-ACC-05)', () => {
    it('lọc theo BorrowStatus hợp lệ và phân trang', async () => {
      db.borrowRecord.count.mockResolvedValue(25);
      db.borrowRecord.findMany.mockResolvedValue([{ id: 'br-1' }]);

      const result = await usersService.getBorrowHistory('u1', {
        status: BorrowStatus.ACTIVE,
        page: 2,
        limit: 10,
      });

      expect(result.pagination).toEqual({ total: 25, page: 2, limit: 10, totalPages: 3 });
      expect(db.borrowRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', status: BorrowStatus.ACTIVE },
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('getDashboardStats', () => {
    it('gom số đang mượn, quá hạn, giữ chỗ và tổng phạt', async () => {
      db.borrowRecord.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
      db.reservation.count.mockResolvedValue(2);
      db.fine.aggregate.mockResolvedValue({ _sum: { totalAmount: 15000 } });

      const stats = await usersService.getDashboardStats('u1');
      expect(stats).toEqual({
        borrowingCount: 3,
        overdueCount: 1,
        reservationCount: 2,
        totalFine: 15000,
      });
    });

    it('totalFine = 0 khi không có khoản PENDING', async () => {
      db.borrowRecord.count.mockResolvedValue(0);
      db.reservation.count.mockResolvedValue(0);
      db.fine.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
      const stats = await usersService.getDashboardStats('u1');
      expect(stats.totalFine).toBe(0);
    });
  });

  describe('getReservations', () => {
    it('tính totalPages theo công thức ceil', async () => {
      db.reservation.count.mockResolvedValue(11);
      db.reservation.findMany.mockResolvedValue([]);
      const result = await usersService.getReservations('u1', 1, 10);
      expect(result.pagination.totalPages).toBe(2);
    });
  });

  describe('changePassword', () => {
    it('ném 400 khi thiếu mật khẩu', async () => {
      await expect(usersService.changePassword('u1', {})).rejects.toMatchObject({ statusCode: 400 });
    });

    it('ném 400 khi mật khẩu cũ sai', async () => {
      db.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: 'old' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        usersService.changePassword('u1', { currentPassword: 'x', newPassword: 'newpass12' }),
      ).rejects.toMatchObject({ statusCode: 400, message: 'Mật khẩu cũ không chính xác' });
    });

    it('hash mật khẩu mới khi xác thực thành công', async () => {
      db.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: 'old' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      db.user.update.mockResolvedValue({});
      const result = await usersService.changePassword('u1', {
        currentPassword: 'oldpass12',
        newPassword: 'newpass12',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass12', 10);
      expect(result.message).toBe('Đổi mật khẩu thành công');
    });
  });
});
