import prisma from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import { TransferStatus, CopyStatus } from '@prisma/client';

export const createTransferRequest = async (data: {
  userId: string;
  bookId: string;
  toBranchId: string;
}) => {
  // Step 1: Find a branch that has the book available
  const availableCopy = await prisma.physicalCopy.findFirst({
    where: {
      bookId: data.bookId,
      branchId: { not: data.toBranchId },
      status: CopyStatus.AVAILABLE,
    },
    include: { branch: true },
  });

  if (!availableCopy) {
    throw createError('Không tìm thấy bản sao khả dụng ở các chi nhánh khác', 404);
  }

  // Step 2: Create transfer record
  const transfer = await prisma.branchTransfer.create({
    data: {
      physicalCopyId: availableCopy.id,
      requestedById: data.userId,
      fromBranchId: availableCopy.branchId,
      toBranchId: data.toBranchId,
      status: TransferStatus.REQUESTED,
    },
  });

  // Step 3: Update copy status to TRANSFERRING
  await prisma.physicalCopy.update({
    where: { id: availableCopy.id },
    data: { status: CopyStatus.TRANSFERRING },
  });

  return {
    transferId: transfer.id,
    fromBranch: availableCopy.branch.name,
    status: transfer.status,
    message: 'Yêu cầu luân chuyển sách đã được gửi đi',
  };
};

export const getPendingTransfers = async (branchId?: string) => {
  return prisma.branchTransfer.findMany({
    where: {
      OR: [
        { fromBranchId: branchId },
        { toBranchId: branchId },
      ],
      status: { in: [TransferStatus.REQUESTED, TransferStatus.IN_TRANSIT] },
    },
    include: {
      physicalCopy: { include: { book: { select: { title: true } } } },
      // Use raw query or separate lookups if relations are not in schema for requestedBy
    },
    orderBy: { requestedAt: 'desc' },
  });
};

export const updateTransferStatus = async (
  transferId: string,
  status: TransferStatus,
  processedById: string
) => {
  const transfer = await prisma.branchTransfer.findUnique({
    where: { id: transferId },
    include: { physicalCopy: { include: { book: true } } },
  });

  if (!transfer) throw createError('Không tìm thấy yêu cầu luân chuyển', 404);

  const updatedTransfer = await prisma.branchTransfer.update({
    where: { id: transferId },
    data: { 
      status,
      ...(status === TransferStatus.ARRIVED && { arrivedAt: new Date() }),
    },
  });

  // Update physical copy branch and status if arrived
  if (status === TransferStatus.ARRIVED) {
    await prisma.physicalCopy.update({
      where: { id: transfer.physicalCopyId },
      data: { 
        branchId: transfer.toBranchId,
        status: CopyStatus.AVAILABLE // Make it available at the new branch
      },
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: transfer.requestedById,
        type: 'SYSTEM',
        title: 'Sách luân chuyển đã về đến nơi',
        content: `Cuốn sách "${transfer.physicalCopy.book.title}" bạn yêu cầu từ chi nhánh khác đã về đến chi nhánh của bạn.`,
        relatedId: transfer.physicalCopy.bookId,
        relatedType: 'Book',
      },
    });
  }

  return updatedTransfer;
};
