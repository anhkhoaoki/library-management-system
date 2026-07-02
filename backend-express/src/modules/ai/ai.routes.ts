import { Router } from 'express';
import * as aiController from './ai.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { Role } from '../../types/roles';

const router = Router();

/**
 * @swagger
 * /api/v1/ai/catalog/isbn/{isbn}:
 *   get:
 *     summary: Tra cứu thông tin sách qua ISBN bằng AI (Librarian / Admin)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: isbn
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã ISBN của sách
 *         example: "978-3-16-148410-0"
 *     responses:
 *       200:
 *         description: Thông tin sách được trả về từ AI
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Book'
 *       403:
 *         description: Không có quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy thông tin sách với ISBN này
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-CAT-03: ISBN Cataloging (Librarian only)
router.get(
  '/catalog/isbn/:isbn',
  authenticate,
  authorize(Role.LIBRARIAN, Role.ADMIN),
  aiController.getBookInfoByIsbn
);

/**
 * @swagger
 * /api/v1/ai/catalog/summarize:
 *   post:
 *     summary: Tóm tắt nội dung sách bằng AI (Librarian / Admin)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SummarizeRequest'
 *     responses:
 *       200:
 *         description: Tóm tắt nội dung được tạo thành công
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
 *                         summary:
 *                           type: string
 *                           example: "Cuốn sách này giới thiệu về lập trình TypeScript..."
 *       403:
 *         description: Không có quyền
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-CAT-04: Summarization (Librarian only)
router.post(
  '/catalog/summarize',
  authenticate,
  authorize(Role.LIBRARIAN, Role.ADMIN),
  aiController.generateBookSummary
);

router.post(
  '/catalog/summarize/stream',
  authenticate,
  authorize(Role.LIBRARIAN, Role.ADMIN),
  aiController.generateBookSummaryStream
);

/**
 * @swagger
 * /api/v1/ai/search:
 *   post:
 *     summary: Tìm kiếm sách bằng ngôn ngữ tự nhiên (public)
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NaturalLanguageSearchRequest'
 *           example:
 *             query: "sách về lập trình python cho người mới bắt đầu"
 *     responses:
 *       200:
 *         description: Kết quả tìm kiếm từ AI
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
 */
// UC-AI-01: Natural Language Search (public)
router.post('/search', aiController.naturalLanguageSearch);

/**
 * @swagger
 * /api/v1/ai/chat:
 *   post:
 *     summary: Chat với thư viện AI (cần đăng nhập để cá nhân hóa)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *           example:
 *             message: "Tôi muốn tìm sách về trí tuệ nhân tạo"
 *             sessionId: "session-uuid-here"
 *     responses:
 *       200:
 *         description: Phản hồi từ AI chatbot
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
 *                         reply:
 *                           type: string
 *                           example: "Tôi có thể gợi ý cho bạn các cuốn sách sau..."
 *                         sessionId:
 *                           type: string
 *       401:
 *         description: Chưa xác thực
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-AI-02: Chatbot (requires auth for personalized responses)
router.post('/chat', authenticate, aiController.chatWithBot);
router.post('/chat/stream', authenticate, aiController.chatWithBotStream);


/**
 * @swagger
 * /api/v1/ai/recommendations:
 *   get:
 *     summary: Lấy gợi ý sách cá nhân hóa từ AI (cần đăng nhập)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng sách gợi ý tối đa
 *     responses:
 *       200:
 *         description: Danh sách sách được AI gợi ý dựa trên lịch sử đọc
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
 *       401:
 *         description: Chưa xác thực
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// UC-AI-03: Recommendations (requires auth)
router.get('/recommendations', authenticate, aiController.getRecommendations);

// ─── Internal endpoints cho Function Calling tools (Python AI Service) ───────
// Xác thực bằng X-Internal-Key header thay vì JWT
const internalKeyMiddleware = (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction): void => {
  const key = req.headers['x-internal-key'];
  if (key !== (process.env.INTERNAL_API_KEY || 'internal-api-key')) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
};

router.get('/internal/user/:userId/borrows', internalKeyMiddleware, aiController.getUserBorrows);
router.get('/internal/user/:userId/fines', internalKeyMiddleware, aiController.getUserFines);
router.get('/internal/user/:userId/reservations', internalKeyMiddleware, aiController.getUserReservations);

export default router;
