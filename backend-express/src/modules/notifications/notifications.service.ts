import prisma from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import { NotificationType, NotificationChannel } from '@prisma/client';

// ─── UC-NOT-02: Get Notifications ────────────────────────────
export const getNotifications = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
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
  if (data.targetRole) userWhere['role'] = data.targetRole;

  const users = await prisma.user.findMany({
    where: userWhere,
    select: { id: true },
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

  return {
    message: `Gửi thông báo thành công đến ${created} người dùng`,
    recipientCount: created,
  };
};
