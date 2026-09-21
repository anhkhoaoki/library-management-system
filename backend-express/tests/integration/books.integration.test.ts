import request from 'supertest';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';
import { roleAuthHeader } from '../helpers/auth.helper';
import { Role } from '../../src/types/roles';
import { BookStatus } from '@prisma/client';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

import prisma from '../../src/config/database';
import app from '../../src/app';

const db = prisma as unknown as PrismaMock;

describe('Books Integration Tests (Kiểm thử tích hợp Quản lý Sách & Danh mục)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/books/search (UC-EXP-01)', () => {
    it('trả về 200 cùng danh sách sách và thông tin phân trang', async () => {
      const mockBooks = [
        {
          id: 'book-1',
          title: 'Lập trình Clean Code',
          authorNames: ['Robert C. Martin'],
          isbn: '9780132350884',
          totalCopies: 5,
          availableCopies: 3,
          status: BookStatus.ACTIVE,
        },
      ];

      db.book.findMany.mockResolvedValue(mockBooks);
      db.book.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/books/search')
        .query({ q: 'Clean Code', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Lập trình Clean Code');
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('GET /api/v1/books/categories', () => {
    it('trả về 200 cùng danh sách các thể loại sách', async () => {
      db.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Khoa học Máy tính', code: 'CS' },
        { id: 'cat-2', name: 'Kinh tế', code: 'ECO' },
      ]);

      const response = await request(app).get('/api/v1/books/categories');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Khoa học Máy tính');
    });
  });

  describe('GET /api/v1/books/:id (UC-CAT-01)', () => {
    it('trả về 200 cùng thông tin chi tiết sách khi ID tồn tại', async () => {
      db.book.findFirst.mockResolvedValue({
        id: 'book-100',
        title: 'Design Patterns',
        authorNames: ['Gang of Four'],
        status: BookStatus.ACTIVE,
        availableCopies: 2,
        physicalCopies: [],
        reviews: [],
      });

      const response = await request(app).get('/api/v1/books/book-100');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Design Patterns');
    });

    it('trả về 404 khi không tìm thấy sách theo ID', async () => {
      db.book.findFirst.mockResolvedValue(null);

      const response = await request(app).get('/api/v1/books/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/books (Phân quyền RBAC)', () => {
    it('trả về 401 Unauthorized khi không đính kèm token', async () => {
      const response = await request(app)
        .post('/api/v1/books')
        .send({ title: 'Sách mới' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('trả về 403 Forbidden khi bạn đọc (READER) cố tạo sách', async () => {
      const response = await request(app)
        .post('/api/v1/books')
        .set(roleAuthHeader(Role.READER))
        .send({
          title: 'Sách Hack',
          authorNames: ['Hacker'],
          isbn: '1234567890123',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('không có quyền');
    });

    it('trả về 201 Created khi Thủ thư (LIBRARIAN) tạo sách mới hợp lệ', async () => {
      db.book.findUnique.mockResolvedValue(null); // No duplicate ISBN
      db.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Công nghệ' });
      db.book.create.mockResolvedValue({
        id: 'new-book-1',
        title: 'Trí tuệ nhân tạo hiện đại',
        authorNames: ['Stuart Russell', 'Peter Norvig'],
        isbn: '9780136042594',
        status: BookStatus.ACTIVE,
      });

      const response = await request(app)
        .post('/api/v1/books')
        .set(roleAuthHeader(Role.LIBRARIAN))
        .send({
          title: 'Trí tuệ nhân tạo hiện đại',
          authorNames: ['Stuart Russell', 'Peter Norvig'],
          isbn: '9780136042594',
          categoryId: 'cat-1',
          initialCopies: 3,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('new-book-1');
    });
  });

  describe('PUT /api/v1/books/:id', () => {
    it('trả về 403 khi READER cố cập nhật thông tin sách', async () => {
      const response = await request(app)
        .put('/api/v1/books/book-1')
        .set(roleAuthHeader(Role.READER))
        .send({ title: 'Tên mới' });

      expect(response.status).toBe(403);
    });

    it('trả về 200 khi LIBRARIAN cập nhật sách thành công', async () => {
      db.book.findUnique.mockResolvedValue({ id: 'book-1', title: 'Tên cũ', status: BookStatus.ACTIVE });
      db.book.update.mockResolvedValue({ id: 'book-1', title: 'Tên đã cập nhật' });

      const response = await request(app)
        .put('/api/v1/books/book-1')
        .set(roleAuthHeader(Role.LIBRARIAN))
        .send({ title: 'Tên đã cập nhật' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Tên đã cập nhật');
    });
  });

  describe('DELETE /api/v1/books/:id', () => {
    it('trả về 403 khi READER cố xóa sách', async () => {
      const response = await request(app)
        .delete('/api/v1/books/book-1')
        .set(roleAuthHeader(Role.READER));

      expect(response.status).toBe(403);
    });

    it('trả về 200 khi ADMIN thực hiện xóa sách (soft delete)', async () => {
      db.book.findUnique.mockResolvedValue({ id: 'book-1', status: BookStatus.ACTIVE });
      db.borrowRecord.count.mockResolvedValue(0); // Không có bản sao đang được mượn
      db.book.update.mockResolvedValue({ id: 'book-1', status: BookStatus.DELETED });

      const response = await request(app)
        .delete('/api/v1/books/book-1')
        .set(roleAuthHeader(Role.ADMIN));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/books/:id/reviews (UC-EXP-03)', () => {
    it('trả về 400 khi thiếu thông tin rating', async () => {
      const response = await request(app)
        .post('/api/v1/books/book-1/reviews')
        .set(roleAuthHeader(Role.READER))
        .send({ content: 'Sách rất hay nhưng quên đánh giá sao' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('rating là bắt buộc');
    });

    it('trả về 201 khi bạn đọc gửi đánh giá sách hợp lệ', async () => {
      db.book.findUnique.mockResolvedValue({ id: 'book-1', status: BookStatus.ACTIVE });
      db.review.upsert.mockResolvedValue({
        id: 'review-1',
        bookId: 'book-1',
        userId: 'user-reader-1',
        rating: 5,
        content: 'Cuốn sách tuyệt vời!',
      });
      db.review.aggregate.mockResolvedValue({
        _avg: { rating: 5.0 },
        _count: { id: 1 },
      });
      db.book.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/books/book-1/reviews')
        .set(roleAuthHeader(Role.READER))
        .send({
          rating: 5,
          content: 'Cuốn sách tuyệt vời!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(5);
    });
  });
});
