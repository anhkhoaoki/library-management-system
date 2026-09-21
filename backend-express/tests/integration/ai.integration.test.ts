import request from 'supertest';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';
import { roleAuthHeader } from '../helpers/auth.helper';
import { Role } from '../../src/types/roles';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

jest.mock('../../src/config/ai-service', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import prisma from '../../src/config/database';
import aiServiceClient from '../../src/config/ai-service';
import app from '../../src/app';

const db = prisma as unknown as PrismaMock;
const mockAiClient = aiServiceClient as unknown as {
  get: jest.Mock;
  post: jest.Mock;
};

describe('AI Integration Tests (Kiểm thử tích hợp Dịch vụ Trí tuệ Nhân tạo)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/ai/search (UC-AI-01: Natural Language Search)', () => {
    it('trả về 200 cùng danh sách sách tìm kiếm ngữ nghĩa thành công từ AI', async () => {
      mockAiClient.post.mockResolvedValue({
        data: {
          results: [
            {
              book_id: 'book-ai-1',
              title: 'Học máy cơ bản',
              score: 0.95,
            },
          ],
        },
      });

      db.book.findMany.mockResolvedValue([
        {
          id: 'book-ai-1',
          title: 'Học máy cơ bản',
          authorNames: ['Vũ Hữu Tiệp'],
          availableCopies: 2,
        },
      ]);

      const response = await request(app)
        .post('/api/v1/ai/search')
        .send({ query: 'sách machine learning cho người mới' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /api/v1/ai/chat (UC-AI-02: AI Chatbot Assistant)', () => {
    it('trả về 401 Unauthorized khi trò chuyện mà không đăng nhập', async () => {
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .send({ message: 'Chào bạn, thư viện mở cửa đến mấy giờ?' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('trả về 400 khi tin nhắn gửi lên bị rỗng', async () => {
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .set(roleAuthHeader(Role.READER, 'reader-1'))
        .send({ message: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('bắt buộc');
    });

    it('trả về 200 cùng phản hồi từ chatbot AI khi có token hợp lệ', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'reader-1',
        fullName: 'Nguyễn Văn Đọc',
      });
      db.chatHistory.findMany.mockResolvedValue([]);
      db.borrowRecord.findMany.mockResolvedValue([]);
      db.chatHistory.create.mockResolvedValue({});

      mockAiClient.post.mockResolvedValue({
        data: {
          reply: 'Chào bạn! Thư viện mở cửa từ 8h00 đến 21h00 các ngày trong tuần.',
          sessionId: 'session-xyz-123',
        },
      });

      const response = await request(app)
        .post('/api/v1/ai/chat')
        .set(roleAuthHeader(Role.READER, 'reader-1'))
        .send({ message: 'Thư viện mở cửa giờ nào?' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reply).toContain('8h00 đến 21h00');
    });
  });

  describe('GET /api/v1/ai/recommendations (UC-AI-03)', () => {
    it('trả về 401 Unauthorized khi truy cập danh sách gợi ý mà không có token', async () => {
      const response = await request(app).get('/api/v1/ai/recommendations');
      expect(response.status).toBe(401);
    });

    it('trả về 200 cùng danh sách sách gợi ý cho bạn đọc', async () => {
      db.user.findUnique.mockResolvedValue({ id: 'reader-1' });
      db.borrowRecord.findMany.mockResolvedValue([
        { physicalCopy: { book: { categoryId: 'cat-tech' } } },
      ]);

      mockAiClient.post.mockResolvedValue({
        data: {
          recommendations: [
            { id: 'rec-1', title: 'Clean Architecture', authorNames: ['Uncle Bob'] },
          ],
        },
      });

      const response = await request(app)
        .get('/api/v1/ai/recommendations')
        .set(roleAuthHeader(Role.READER, 'reader-1'));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/v1/ai/catalog/isbn/:isbn (UC-CAT-03)', () => {
    it('trả về 403 Forbidden khi bạn đọc (READER) cố tra cứu biên mục tự động', async () => {
      const response = await request(app)
        .get('/api/v1/ai/catalog/isbn/9780132350884')
        .set(roleAuthHeader(Role.READER));

      expect(response.status).toBe(403);
    });

    it('trả về 200 khi Thủ thư (LIBRARIAN) tra cứu biên mục sách tự động thành công', async () => {
      mockAiClient.get.mockResolvedValue({
        data: {
          title: 'Clean Code',
          authors: ['Robert C. Martin'],
          publisher: 'Prentice Hall',
          publishedDate: '2008',
          description: 'A handbook of agile software craftsmanship',
        },
      });

      const response = await request(app)
        .get('/api/v1/ai/catalog/isbn/9780132350884')
        .set(roleAuthHeader(Role.LIBRARIAN));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Clean Code');
    });

    it('trả về 404 khi dịch vụ AI không tìm thấy sách theo ISBN', async () => {
      mockAiClient.get.mockRejectedValue({
        response: { status: 404 },
      });

      const response = await request(app)
        .get('/api/v1/ai/catalog/isbn/0000000000000')
        .set(roleAuthHeader(Role.LIBRARIAN));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/ai/catalog/summarize (UC-CAT-04)', () => {
    it('trả về 403 khi READER gọi chức năng tóm tắt', async () => {
      const response = await request(app)
        .post('/api/v1/ai/catalog/summarize')
        .set(roleAuthHeader(Role.READER))
        .send({ title: 'Sách mới', authorNames: ['Tác giả'] });

      expect(response.status).toBe(403);
    });

    it('trả về 200 khi Thủ thư yêu cầu AI tạo tóm tắt nội dung sách thành công', async () => {
      mockAiClient.post.mockResolvedValue({
        data: {
          summary: 'Tóm tắt ngắn gọn cuốn sách về các nguyên lý lập trình sạch...',
        },
      });

      const response = await request(app)
        .post('/api/v1/ai/catalog/summarize')
        .set(roleAuthHeader(Role.LIBRARIAN))
        .send({
          title: 'Clean Code',
          authorNames: ['Robert C. Martin'],
          category: 'Công nghệ thông tin',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toContain('nguyên lý lập trình');
    });
  });
});
