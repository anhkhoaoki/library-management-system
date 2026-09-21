/** Stub @prisma/client enums so unit tests run without a generated Prisma client. */

export enum Role {
  GUEST = 'GUEST',
  READER = 'READER',
  LIBRARIAN = 'LIBRARIAN',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export enum BookStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

export enum CopyStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  RESERVED = 'RESERVED',
  TRANSFERRING = 'TRANSFERRING',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
}

export enum BorrowStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
}

export enum FineStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  WAIVED = 'WAIVED',
}

export enum ReservationStatus {
  WAITING = 'WAITING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum TransferStatus {
  REQUESTED = 'REQUESTED',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationType {
  DUE_DATE_REMINDER = 'DUE_DATE_REMINDER',
  RESERVATION_READY = 'RESERVATION_READY',
  FINE_NOTICE = 'FINE_NOTICE',
  BROADCAST = 'BROADCAST',
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  BORROW = 'BORROW',
  RETURN = 'RETURN',
  FINE_PAID = 'FINE_PAID',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
}

export enum ResourceType {
  PDF = 'PDF',
  EPUB = 'EPUB',
  AUDIOBOOK = 'AUDIOBOOK',
  VIDEO = 'VIDEO',
}

export class PrismaClient {
  constructor(_opts?: unknown) {}
}
