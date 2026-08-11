import prisma from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import { NotificationType, NotificationChannel } from '@prisma/client';
import nodemailer from 'nodemailer';
import { sendMail } from '../../config/mailer';

// ─── Yêu cầu mượn đã được thủ thư duyệt ─────────────────────
export const notifyBorrowApproved = async (
  userId: string,
  bookTitle: string,
  bookId: string,
  dueDate: Date,
) => {
  const dueStr = dueDate.toLocaleDateString('vi-VN');
  const title = 'Yêu cầu mượn sách đã được duyệt';
  const content = `Thủ thư đã xác nhận cho bạn mượn cuốn "${bookTitle}". Hạn trả: ${dueStr}.`;

  await prisma.notification.create({
    data: {
      userId,
      type: NotificationType.SYSTEM,
      channel: NotificationChannel.IN_APP,
      title,
      content,
      relatedId: bookId,
      relatedType: 'Book',
    },
  });

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } }),
    prisma.notificationSetting.findUnique({ where: { userId } }),
  ]);

  const emailEnabled = settings?.emailEnabled !== false;
  const reservationReady = settings?.reservationReady !== false;

  if (emailEnabled && reservationReady && user?.email) {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #1a1a2e; margin-bottom: 8px;">✅ Yêu cầu mượn sách đã được duyệt</h2>
          <p style="color: #4b5563;">Xin chào ${user.fullName || 'bạn đọc'},</p>
          <p style="color: #4b5563;">Thủ thư đã xác nhận cho bạn mượn cuốn <strong>"${bookTitle}"</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">Hạn trả: <strong>${dueStr}</strong>. Bạn có thể xem sách tại mục "Sách đang mượn".</p>
        </div>
      `;
      await sendMail({ to: user.email, subject: `[Thư viện] ${title}`, html });
    } catch (error) {
      console.error('[Email] Failed to send borrow approved notification:', error);
    }
  }
};

// ─── Sách đặt chỗ đã có sẵn (chờ đến quầy — không phải duyệt mượn) ──
export const notifyReservationReady = async (
  userId: string,
  bookTitle: string,
  bookId: string,
) => {
  const title = 'Sách đặt giữ chỗ đã sẵn sàng';
  const content = `Cuốn sách "${bookTitle}" bạn đặt chỗ đã có tại thư viện. Vui lòng đến quầy thủ thư để xác nhận mượn trong vòng 3 ngày.`;

  await prisma.notification.create({
    data: {
      userId,
      type: NotificationType.RESERVATION_READY,
      channel: NotificationChannel.IN_APP,
      title,
      content,
      relatedId: bookId,
      relatedType: 'Book',
    },
  });

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } }),
    prisma.notificationSetting.findUnique({ where: { userId } }),
  ]);

  const emailEnabled = settings?.emailEnabled !== false;
  const reservationReady = settings?.reservationReady !== false;

  if (emailEnabled && reservationReady && user?.email) {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #1a1a2e; margin-bottom: 8px;">📚 Sách đặt giữ chỗ đã sẵn sàng</h2>
          <p style="color: #4b5563;">Xin chào ${user.fullName || 'bạn đọc'},</p>
          <p style="color: #4b5563;">Cuốn sách <strong>"${bookTitle}"</strong> bạn đặt chỗ đã có tại thư viện.</p>
          <p style="color: #6b7280; font-size: 14px;">Vui lòng đến quầy thủ thư để xác nhận mượn trong vòng <strong>3 ngày</strong> kể từ hôm nay.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Đây là email tự động từ hệ thống Thư viện số.</p>
        </div>
      `;
      await sendMail({ to: user.email, subject: `[Thư viện] ${title}`, html });

      await prisma.notification.create({
        data: {
          userId,
          type: NotificationType.RESERVATION_READY,
          channel: NotificationChannel.EMAIL,
          title,
          content,
          relatedId: bookId,
          relatedType: 'Book',
        },
      });
    } catch (error) {
      console.error('[Email] Failed to send reservation ready notification:', error);
    }
  }
};

// ─── UC-NOT-02: Get Notifications ────────────────────────────
export const getNotifications = async (userId: string, page = 1, limit = 20, allChannels = false) => {
  const skip = (page - 1) * limit;
  const whereClause: any = { userId };
  
  if (!allChannels) {
    whereClause.channel = NotificationChannel.IN_APP;
  }

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where: whereClause }),
    prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  const unreadCount = await prisma.notification.count({
    where: { ...whereClause, isRead: false },
  });

  if (total === 0) {
    return {
      message: 'Bạn không có thông báo nào mới',
      data: [],
      unreadCount: 0,
      pagination: { total: 0, page, limit, totalPages: 0 },
    };
  }

  return {
    data: notifications,
    unreadCount,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── UC-NOT-02: Mark Notification as Read ────────────────────
export const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) throw createError('Thông báo không tồn tại', 404);
  if (notification.isRead) return { message: 'Thông báo đã được đọc trước đó' };

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });

  return { message: 'Đã đánh dấu đã đọc' };
};

// ─── Mark all as read ─────────────────────────────────────────
export const markAllAsRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { message: 'Đã đánh dấu tất cả thông báo là đã đọc' };
};

// ─── UC-NOT-01: Get Notification Settings ────────────────────
export const getNotificationSettings = async (userId: string) => {
  let settings = await prisma.notificationSetting.findUnique({ where: { userId } });

  // Auto-create defaults if not exists
  if (!settings) {
    settings = await prisma.notificationSetting.create({ data: { userId } });
  }

  return settings;
};

// ─── UC-NOT-01: Update Notification Settings ─────────────────
export const updateNotificationSettings = async (
  userId: string,
  data: Partial<{
    emailEnabled: boolean;
    smsEnabled: boolean;
    inAppEnabled: boolean;
    dueDateReminder: boolean;
    reservationReady: boolean;
    fineNotice: boolean;
    broadcast: boolean;
  }>
) => {
  // If enabling SMS, check phone number exists
  if (data.smsEnabled) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (!user?.phone) {
      throw createError(
        'Vui lòng cập nhật số điện thoại trước khi kích hoạt tính năng này',
        422
      );
    }
  }

  const settings = await prisma.notificationSetting.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  return settings;
};

// ─── UC-NOT-03: Broadcast Notification ───────────────────────
export const broadcastNotification = async (data: {
  title: string;
  content: string;
  channel: NotificationChannel;
  targetRole?: string; // null = all
  senderId: string;
}) => {
  if (!data.title?.trim() || !data.content?.trim()) {
    throw createError('Vui lòng nhập đầy đủ nội dung thông báo', 400);
  }

  const userWhere: Record<string, unknown> = { status: 'ACTIVE' };
  if (data.targetRole) {
    userWhere['role'] = { name: data.targetRole };
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, email: true, phone: true },
  });

  if (users.length === 0) {
    throw createError('Không có người dùng nào trong nhóm đích', 404);
  }

  // Create all notifications sequentially in batches
  const batchSize = 100;
  let created = 0;

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await prisma.notification.createMany({
      data: batch.map((u) => ({
        userId: u.id,
        type: NotificationType.BROADCAST,
        channel: data.channel,
        title: data.title,
        content: data.content,
      })),
    });
    created += batch.length;
  }

  // Handle external channel dispatch
  if (data.channel === NotificationChannel.EMAIL) {
    try {
      let transporter;
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
      } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }
      
      const emails = users.map(u => u.email).filter(Boolean);
      if (emails.length > 0) {
        const info = await transporter.sendMail({
          from: '"BkLib System" <no-reply@bklib.edu.vn>',
          bcc: emails.join(','),
          subject: data.title,
          html: data.content,
        });
        console.log("Email sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      console.error("Lỗi gửi Email (Nodemailer):", error);
    }
  } else if (data.channel === NotificationChannel.SMS) {
    const phones = users.map(u => u.phone).filter(Boolean);
    console.log(`[SMS Gateway] Giả lập gửi tin nhắn SMS đến ${phones.length} số điện thoại. Tiêu đề: ${data.title}`);
  }

  // Write audit log
  await prisma.auditLog.create({
    data: {
      userId: data.senderId,
      action: 'CREATE',
      entityType: 'Notification',
      newData: {
        title: data.title,
        targetRole: data.targetRole ?? 'ALL',
        recipientCount: created,
      },
      riskLevel: 'INFO',
    },
  });

  let responseMessage = `Gửi thông báo thành công đến ${created} người dùng`;
  if (data.channel === NotificationChannel.SMS) {
    responseMessage = `Đã giả lập gửi SMS thành công đến ${created} số điện thoại! (Vì SMS yêu cầu dịch vụ trả phí 3rd-party nên hệ thống giả lập gửi tin nhắn).`;
  } else if (data.channel === NotificationChannel.EMAIL) {
    responseMessage = `Đã gửi Email thành công đến ${created} địa chỉ!`;
  }

  return {
    message: responseMessage,
    recipientCount: created,
  };
};
