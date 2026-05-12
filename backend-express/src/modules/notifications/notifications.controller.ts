import { Request, Response, NextFunction } from 'express';
import * as notificationsService from './notifications.service';
import { NotificationChannel } from '@prisma/client';

// UC-NOT-02
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const result = await notificationsService.getNotifications(req.user!.userId, page, limit);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationsService.markAsRead(req.params.id, req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationsService.markAllAsRead(req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// UC-NOT-01
export const getNotificationSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await notificationsService.getNotificationSettings(req.user!.userId);
    res.status(200).json({ success: true, data: settings });
  } catch (err) { next(err); }
};

export const updateNotificationSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await notificationsService.updateNotificationSettings(req.user!.userId, req.body);
    res.status(200).json({ success: true, data: settings });
  } catch (err) { next(err); }
};

// UC-NOT-03
export const broadcastNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, content, channel, targetRole } = req.body;
    if (!title || !content) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ nội dung thông báo' });
      return;
    }
    const result = await notificationsService.broadcastNotification({
      title,
      content,
      channel: (channel as NotificationChannel) ?? NotificationChannel.IN_APP,
      targetRole,
      senderId: req.user!.userId,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};
