import { Router } from 'express';
import * as circulationController from './circulation.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/circulation/borrow:
 *   post:
 *     summary: Tạo phiếu mượn sách (Librarian / Admin)
 *     tags: [Circulation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BorrowRequest'
 *     responses:
 *       201:
 *         description: Phiếu mượn đã được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Sách không còn bản sao hoặc người dùng đang bị khóa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không có quyền thực hiện thao tác này
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-CIR-01: Borrow (Librarian only)
router.post('/borrow', authorize(Role.LIBRARIAN, Role.ADMIN), circulationController.borrowDocument);

/**
 * @swagger
 * /api/v1/circulation/return:
 *   post:
 *     summary: Xử lý trả sách (Librarian / Admin)
 *     tags: [Circulation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReturnRequest'
 *     responses:
 *       200:
 *         description: Trả sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Phiếu mượn không hợp lệ hoặc đã được trả
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-CIR-02 + UC-CIR-03: Return (Librarian only)
router.post('/return', authorize(Role.LIBRARIAN, Role.ADMIN), circulationController.returnDocument);

/**
 * @swagger
 * /api/v1/circulation/fines/{id}/pay:
 *   post:
 *     summary: Thanh toán tiền phạt (Librarian / Admin)
 *     tags: [Circulation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID khoản phạt
 *     responses:
 *       200:
 *         description: Thanh toán tiền phạt thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Không tìm thấy khoản phạt
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-CIR-03: Pay fine (Librarian or Admin)
router.post('/fines/:id/pay', authorize(Role.LIBRARIAN, Role.ADMIN), circulationController.payFine);

/**
 * @swagger
 * /api/v1/circulation/borrow-records/{id}/renew:
 *   post:
 *     summary: Gia hạn mượn sách (Reader tự phục vụ)
 *     tags: [Circulation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID bản ghi mượn
 *     responses:
 *       200:
 *         description: Gia hạn thành công, ngày hết hạn mới được cập nhật
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Đã hết số lần gia hạn hoặc sách đang quá hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy bản ghi mượn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-CIR-04: Renew (Reader self-service)
router.post('/borrow-records/:id/renew', circulationController.renewBorrowRecord);

/**
 * @swagger
 * /api/v1/circulation/reservations:
 *   post:
 *     summary: Đặt trước sách (Reader tự phục vụ)
 *     tags: [Circulation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservationRequest'
 *     responses:
 *       201:
 *         description: Đặt trước thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Sách đang có sẵn hoặc đã đặt trước rồi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-CIR-05: Reserve (Reader self-service)
router.post('/reservations', circulationController.reserveBook);

export default router;
