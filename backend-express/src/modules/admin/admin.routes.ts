import { Router } from 'express';
import * as adminController from './admin.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { Role } from '../../types/roles';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ─── Dashboard & Reports (Admin + Librarian) ──────────────────

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Lấy dữ liệu dashboard tổng quan (Admin / Librarian)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dữ liệu thống kê tổng quan
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalBooks: { type: integer }
 *                         totalUsers: { type: integer }
 *                         activeBorrows: { type: integer }
 *                         overdueCount: { type: integer }
 *                         totalFines: { type: number }
 *       403:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-ADM-01
router.get('/dashboard', authorize(Role.ADMIN, Role.LIBRARIAN), adminController.getDashboard);

/**
 * @swagger
 * /api/v1/admin/reports/export:
 *   get:
 *     summary: Xuất báo cáo hệ thống (Admin / Librarian)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [borrow, overdue, fine, inventory]
 *         description: Loại báo cáo cần xuất
 *         example: borrow
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD)
 *         example: "2025-01-01"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD)
 *         example: "2025-12-31"
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, excel]
 *           default: json
 *         description: Định dạng xuất file
 *     responses:
 *       200:
 *         description: Dữ liệu báo cáo hoặc file Excel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-ADM-02
router.get('/reports/export', authorize(Role.ADMIN, Role.LIBRARIAN), adminController.getReport);

// ─── User Management (Admin only) ────────────────────────────

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Lấy danh sách tất cả người dùng (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [READER, LIBRARIAN, ADMIN]
 *         description: Lọc theo vai trò
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo tên hoặc email
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserProfile'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       403:
 *         description: Không có quyền (chỉ Admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-ACC-06
router.get('/users', authorize(Role.ADMIN), adminController.listUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái tài khoản người dùng (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, SUSPENDED]
 *                 example: SUSPENDED
 *     responses:
 *       200:
 *         description: Trạng thái người dùng đã được cập nhật
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/users/:id/status', authorize(Role.ADMIN), adminController.updateUserStatus);

/**
 * @swagger
 * /api/v1/admin/users/{id}/role:
 *   patch:
 *     summary: Cập nhật vai trò người dùng (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [READER, LIBRARIAN, ADMIN]
 *                 example: LIBRARIAN
 *     responses:
 *       200:
 *         description: Vai trò đã được cập nhật
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/users/:id/role', authorize(Role.ADMIN), adminController.updateUserRole);

// ─── System Config (Admin only) ──────────────────────────────

/**
 * @swagger
 * /api/v1/admin/system-config:
 *   get:
 *     summary: Lấy cấu hình hệ thống (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cấu hình hệ thống hiện tại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-ADM-04
router.get('/system-config', authorize(Role.ADMIN), adminController.getSystemConfig);

/**
 * @swagger
 * /api/v1/admin/system-config:
 *   put:
 *     summary: Cập nhật cấu hình hệ thống (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Cấu hình hệ thống (key-value pairs)
 *             example:
 *               maxBorrowDays: 14
 *               maxRenewCount: 2
 *               finePerDay: 2000
 *     responses:
 *       200:
 *         description: Cấu hình đã được cập nhật
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/system-config', authorize(Role.ADMIN), adminController.updateSystemConfig);

// ─── Branch Management (Admin + Librarian) ───────────────────

/**
 * @swagger
 * /api/v1/admin/branches:
 *   get:
 *     summary: Lấy danh sách chi nhánh (Admin / Librarian)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách chi nhánh
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Branch'
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-ADM-05
router.get('/branches', authorize(Role.ADMIN, Role.LIBRARIAN), adminController.getBranches);

/**
 * @swagger
 * /api/v1/admin/branches:
 *   post:
 *     summary: Thêm chi nhánh mới (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBranchRequest'
 *     responses:
 *       201:
 *         description: Chi nhánh đã được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Branch'
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/branches', authorize(Role.ADMIN), adminController.createBranch);

/**
 * @swagger
 * /api/v1/admin/branches/{id}:
 *   put:
 *     summary: Cập nhật thông tin chi nhánh (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID chi nhánh
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBranchRequest'
 *     responses:
 *       200:
 *         description: Chi nhánh đã được cập nhật
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy chi nhánh
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/branches/:id', authorize(Role.ADMIN), adminController.updateBranch);

/**
 * @swagger
 * /api/v1/admin/branches/{id}:
 *   delete:
 *     summary: Xóa chi nhánh (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID chi nhánh
 *     responses:
 *       200:
 *         description: Chi nhánh đã được xóa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy chi nhánh
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/branches/:id', authorize(Role.ADMIN), adminController.deleteBranch);

// ─── Audit Logs (Admin only) ─────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Xem nhật ký kiểm toán hệ thống (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Lọc theo loại hành động
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Lọc theo ID người thực hiện
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Từ ngày (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Đến ngày (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Danh sách nhật ký kiểm toán
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       403:
 *         description: Không có quyền (chỉ Admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-ADM-06
router.get('/audit-logs', authorize(Role.ADMIN), adminController.getAuditLogs);

export default router;
