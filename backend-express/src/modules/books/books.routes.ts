import { Router } from 'express';
import * as booksController from './books.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { Role } from '@prisma/client';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─── Public routes ────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/books:
 *   get:
 *     summary: Liệt kê hoặc tìm kiếm sách (public)
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Lọc theo danh mục
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *     responses:
 *       200:
 *         description: Danh sách sách
 */
router.get('/', booksController.searchBooks);

/**
 * @swagger
 * /api/v1/books/search:
 *   get:
 *     summary: Tìm kiếm sách (public)
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (tiêu đề, tác giả, ISBN)
 *         example: TypeScript
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Lọc theo danh mục
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Danh sách sách phù hợp
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
 *                         $ref: '#/components/schemas/Book'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/search', booksController.searchBooks);          // UC-EXP-01

/**
 * @swagger
 * /api/v1/books/categories:
 *   get:
 *     summary: Lấy danh sách danh mục sách (public)
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Danh sách danh mục
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
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 */
router.get('/categories', booksController.getCategories);

/**
 * @swagger
 * /api/v1/books/digital/sessions/{logId}/end:
 *   patch:
 *     summary: Kết thúc phiên đọc tài liệu số
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phiên đọc
 *     responses:
 *       200:
 *         description: Phiên đọc đã kết thúc
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Chưa xác thực
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/digital/sessions/:logId/end', authenticate, booksController.endDigitalSession);

/**
 * @swagger
 * /api/v1/books/{id}:
 *   get:
 *     summary: Lấy chi tiết một cuốn sách (public)
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sách
 *     responses:
 *       200:
 *         description: Thông tin chi tiết sách
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Book'
 *       404:
 *         description: Không tìm thấy sách
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', booksController.getBookById);

/**
 * @swagger
 * /api/v1/books/{id}/reviews:
 *   get:
 *     summary: Lấy danh sách đánh giá của sách (public)
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sách
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Danh sách đánh giá
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get('/:id/reviews', booksController.getReviews);

// ─── Protected routes (all authenticated) ─────────────────────

/**
 * @swagger
 * /api/v1/books/{id}/reviews:
 *   post:
 *     summary: Gửi đánh giá sách (cần đăng nhập)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sách
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewRequest'
 *     responses:
 *       201:
 *         description: Đánh giá đã được ghi nhận
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Chưa xác thực
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/reviews', authenticate, booksController.submitReview);         // UC-EXP-03

/**
 * @swagger
 * /api/v1/books/{id}/digital/{resourceId}:
 *   get:
 *     summary: Truy cập tài liệu số (cần đăng nhập)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sách
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID tài nguyên số
 *     responses:
 *       200:
 *         description: URL truy cập tài liệu số
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Chưa xác thực
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/digital/:resourceId', authenticate, booksController.accessDigitalResource); // UC-EXP-02

// ─── Librarian / Admin routes ─────────────────────────────────

/**
 * @swagger
 * /api/v1/books:
 *   post:
 *     summary: Thêm sách mới vào thư viện (Librarian / Admin)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookRequest'
 *     responses:
 *       201:
 *         description: Sách đã được thêm thành công
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Book'
 *       401:
 *         description: Chưa xác thực
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
router.post('/', authenticate, authorize(Role.LIBRARIAN, Role.ADMIN), booksController.createBook);    // UC-CAT-01

/**
 * @swagger
 * /api/v1/books/{id}:
 *   put:
 *     summary: Cập nhật thông tin sách (Librarian / Admin)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sách
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookRequest'
 *     responses:
 *       200:
 *         description: Cập nhật sách thành công
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
 *         description: Không tìm thấy sách
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', authenticate, authorize(Role.LIBRARIAN, Role.ADMIN), booksController.updateBook);

/**
 * @swagger
 * /api/v1/books/{id}:
 *   delete:
 *     summary: Xóa sách khỏi thư viện (Librarian / Admin)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID sách
 *     responses:
 *       200:
 *         description: Xóa sách thành công
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
 *         description: Không tìm thấy sách
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', authenticate, authorize(Role.LIBRARIAN, Role.ADMIN), booksController.deleteBook);

/**
 * @swagger
 * /api/v1/books/isbn/{isbn}:
 *   get:
 *     summary: Lấy thông tin sách từ mã ISBN (Librarian / Admin)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: isbn
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã ISBN 10 hoặc 13
 *     responses:
 *       200:
 *         description: Thông tin sách từ API bên thứ 3
 *       404:
 *         description: Không tìm thấy thông tin
 */
router.get('/isbn/:isbn', authenticate, authorize(Role.LIBRARIAN, Role.ADMIN), booksController.getInfoByIsbn);

/**
 * @swagger
 * /api/v1/books/import:
 *   post:
 *     summary: Nhập danh sách sách hàng loạt từ file Excel (Librarian / Admin)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Kết quả nhập dữ liệu
 */
router.post('/import', authenticate, authorize(Role.LIBRARIAN, Role.ADMIN), upload.single('file'), booksController.importBooks);

export default router;
