import { CopyStatus, TransferStatus, ReservationStatus } from '@prisma/client';
import { PrismaMock } from '../helpers/prisma.mock';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

jest.mock('../../src/modules/notifications/notifications.service', () => ({
  notifyReservationReady: jest.fn().mockResolvedValue(undefined),
}));

import prisma from '../../src/config/database';
import * as branchService from '../../src/modules/branches/branch.service';
import { notifyReservationReady } from '../../src/modules/notifications/notifications.service';

const db = prisma as unknown as PrismaMock;

describe('branch.service — kiểm thử đơn vị luân chuyển liên chi nhánh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransferRequest', () => {
    it('ném 404 khi không có bản sao AVAILABLE ở chi nhánh khác', async () => {
      db.physicalCopy.findFirst.mockResolvedValue(null);
      await expect(
        branchService.createTransferRequest({
          userId: 'u1',
          bookId: 'b1',
          toBranchId: 'br-2',
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('tạo transfer REQUESTED và đổi copy sang TRANSFERRING', async () => {
      db.physicalCopy.findFirst.mockResolvedValue({
        id: 'copy-1',
        branchId: 'br-1',
        branch: { name: 'Cơ sở 1' },
      });
      db.branchTransfer.create.mockResolvedValue({
        id: 'tr-1',
        status: TransferStatus.REQUESTED,
      });
      db.physicalCopy.update.mockResolvedValue({});

      const result = await branchService.createTransferRequest({
        userId: 'u1',
        bookId: 'b1',
        toBranchId: 'br-2',
      });

      expect(result.transferId).toBe('tr-1');
      expect(result.fromBranch).toBe('Cơ sở 1');
      expect(db.physicalCopy.update).toHaveBeenCalledWith({
        where: { id: 'copy-1' },
        data: { status: CopyStatus.TRANSFERRING },
      });
    });
  });

  describe('updateTransferStatus', () => {
    it('ném 404 khi không có yêu cầu', async () => {
      db.branchTransfer.findUnique.mockResolvedValue(null);
      await expect(
        branchService.updateTransferStatus('tr-x', TransferStatus.ARRIVED, 'lib-1'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('khi ARRIVED: giữ RESERVED, tạo reservation và thông báo', async () => {
      db.branchTransfer.findUnique.mockResolvedValue({
        id: 'tr-1',
        physicalCopyId: 'copy-1',
        toBranchId: 'br-2',
        requestedById: 'u1',
        physicalCopy: { bookId: 'b1', book: { title: 'Clean Code' } },
      });
      db.branchTransfer.update.mockResolvedValue({ id: 'tr-1', status: TransferStatus.ARRIVED });
      db.physicalCopy.update.mockResolvedValue({});
      db.reservation.create.mockResolvedValue({});

      await branchService.updateTransferStatus('tr-1', TransferStatus.ARRIVED, 'lib-1');

      expect(db.physicalCopy.update).toHaveBeenCalledWith({
        where: { id: 'copy-1' },
        data: { branchId: 'br-2', status: CopyStatus.RESERVED },
      });
      expect(db.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            status: ReservationStatus.READY_FOR_PICKUP,
          }),
        }),
      );
      expect(notifyReservationReady).toHaveBeenCalledWith('u1', 'Clean Code', 'b1');
    });
  });
});
