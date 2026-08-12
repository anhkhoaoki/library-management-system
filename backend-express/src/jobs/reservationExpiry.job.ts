import cron from 'node-cron';
import prisma from '../config/database';
import { ReservationStatus, CopyStatus } from '@prisma/client';

/**
 * Job: Tự động hủy (EXPIRED) các đặt chỗ READY_FOR_PICKUP đã quá hạn lấy sách.
 * Chạy mỗi ngày lúc 01:00 sáng.
 *
 * Khi hủy:
 *  - Reservation → EXPIRED
 *  - PhysicalCopy (đang RESERVED) → AVAILABLE trở lại
 *  - Book.availableCopies += 1
 *  - Chuyển sang reservation tiếp theo trong hàng đợi (WAITING → READY_FOR_PICKUP) nếu có
 */
export const startReservationExpiryJob = () => {
  // Chạy lúc 01:00 AM mỗi ngày
  cron.schedule('0 1 * * *', async () => {
    console.log('[CRON] Running reservation expiry job...');

    try {
      const now = new Date();

      // Tìm tất cả đặt chỗ READY_FOR_PICKUP đã quá expiresAt
      const expired = await prisma.reservation.findMany({
        where: {
          status: ReservationStatus.READY_FOR_PICKUP,
          expiresAt: { lt: now },
        },
        include: {
          book: true,
        },
      });

      if (expired.length === 0) {
        console.log('[CRON] No expired reservations found.');
        return;
      }

      console.log(`[CRON] Found ${expired.length} expired reservation(s). Processing...`);

      for (const reservation of expired) {
        // 1. Mark reservation as EXPIRED
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.EXPIRED },
        });

        // 2. Release the reserved physical copy back to AVAILABLE
        const reservedCopy = await prisma.physicalCopy.findFirst({
          where: {
            bookId: reservation.bookId,
            status: CopyStatus.RESERVED,
          },
        });

        if (reservedCopy) {
          await prisma.physicalCopy.update({
            where: { id: reservedCopy.id },
            data: { status: CopyStatus.AVAILABLE },
          });
        }

        // 3. Restore availableCopies count on the book
        await prisma.book.update({
          where: { id: reservation.bookId },
          data: { availableCopies: { increment: 1 } },
        });

        // 4. Promote the next WAITING reservation in queue if any
        const nextInQueue = await prisma.reservation.findFirst({
          where: {
            bookId: reservation.bookId,
            status: ReservationStatus.WAITING,
          },
          orderBy: { queuePosition: 'asc' },
        });

        if (nextInQueue) {
          const newExpiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days
          await prisma.reservation.update({
            where: { id: nextInQueue.id },
            data: {
              status: ReservationStatus.READY_FOR_PICKUP,
              expiresAt: newExpiresAt,
            },
          });

          // Also reserve a copy for next user
          const nextCopy = await prisma.physicalCopy.findFirst({
            where: { bookId: reservation.bookId, status: CopyStatus.AVAILABLE },
          });
          if (nextCopy) {
            await prisma.physicalCopy.update({
              where: { id: nextCopy.id },
              data: { status: CopyStatus.RESERVED },
            });
            await prisma.book.update({
              where: { id: reservation.bookId },
              data: { availableCopies: { decrement: 1 } },
            });
          }

          // Send in-app notification to next user
          await prisma.notification.create({
            data: {
              userId: nextInQueue.userId,
              type: 'RESERVATION_READY',
              channel: 'IN_APP',
              title: 'Sách đặt giữ chỗ đã sẵn sàng',
              content: `Cuốn sách "${reservation.book.title}" đã đến lượt của bạn. Vui lòng đến quầy thư viện nhận sách trong vòng 3 ngày.`,
              relatedId: reservation.bookId,
              relatedType: 'Book',
            },
          });

          console.log(`[CRON] Promoted reservation ${nextInQueue.id} → READY_FOR_PICKUP for book "${reservation.book.title}"`);
        }

        console.log(`[CRON] Expired reservation ${reservation.id} for book "${reservation.book.title}"`);
      }

      console.log(`[CRON] Reservation expiry job complete. ${expired.length} reservation(s) expired.`);
    } catch (err) {
      console.error('[CRON] Error in reservation expiry job:', err);
    }
  });

  console.log('[CRON] Reservation expiry job scheduled (daily at 01:00 AM).');
};
