import { Router } from 'express';
import * as usersController from './users.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Lấy thông tin hồ sơ cá nhân
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin hồ sơ người dùng hiện tại
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Chưa xác thực
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-ACC-04
router.get('/me', usersController.getProfile);

/**
 * @swagger
 * /api/v1/users/me:
 *   patch:
 *     summary: Cập nhật thông tin hồ sơ cá nhân
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Chưa xác thực
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/me', usersController.updateProfile);

/**
 * @swagger
 * /api/v1/users/me/borrow-history:
 *   get:
 *     summary: Xem lịch sử mượn sách của bản thân
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng bản ghi mỗi trang
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [BORROWING, RETURNED, OVERDUE]
 *         description: Lọc theo trạng thái mượn
 *     responses:
 *       200:
 *         description: Danh sách lịch sử mượn sách
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Chưa xác thực
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-ACC-05
router.get('/me/borrow-history', usersController.getBorrowHistory);

/**
 * @swagger
 * /api/v1/users/lookup/{code}:
 *   get:
 *     summary: Tra cứu bạn đọc theo mã (Librarian / Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Email, Username hoặc StudentID
 *     responses:
 *       200:
 *         description: Thông tin bạn đọc
 *       404:
 *         description: Không tìm thấy
 */
router.get('/lookup/:code', authorize(Role.LIBRARIAN, Role.ADMIN), usersController.lookupUser);

export default router;
