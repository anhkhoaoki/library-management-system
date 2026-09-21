import { BookStatus } from '@prisma/client';
import * as xlsx from 'xlsx';
import { createPrismaMock, PrismaMock } from '../helpers/prisma.mock';

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/prisma.mock').createPrismaMock(),
}));

jest.mock('../../src/modules/books/books.utils', () => ({
  fetchBookInfoByIsbn: jest.fn(),
}));

jest.mock('../../src/modules/books/digital-content.service', () => ({
  buildAudiobookHtml: jest.fn().mockReturnValue('<html>audio</html>'),
  buildEbookHtml: jest.fn().mockReturnValue('<html>ebook</html>'),
  resolveContentForResource: jest.fn().mockReturnValue({ mode: 'ebook-html' }),
}));

import prisma from '../../src/config/database';
import * as booksService from '../../src/modules/books/books.service';
import { fetchBookInfoByIsbn } from '../../src/modules/books/books.utils';

const db = prisma as unknown as PrismaMock;

describe('books.service — kiểm thử đơn vị danh mục / tìm kiếm / đánh giá', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchBooks (UC-EXP-01)', () => {
    it('giới hạn page size tối đa 200 và trả empty message khi không có kết quả', async () => {
      db.book.count.mockResolvedValue(0);
      db.book.findMany.mockResolvedValue([]);

      const result = await booksService.searchBooks({ q: 'xyz', page: 1, limit: 999 });
      expect(result.data).toEqual([]);
      expect(result.pagination.limit).toBe(200);
      expect(result.message).toMatch(/Không tìm thấy tài liệu/);
    });

    it('tìm theo title/author/isbn khi field=all', async () => {
      db.book.count.mockResolvedValue(1);
      db.book.findMany.mockResolvedValue([{ id: 'b1', title: 'Clean Code' }]);

      const result = await booksService.searchBooks({ q: 'Clean', field: 'all' });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalPages).toBe(1);
      const where = db.book.findMany.mock.calls[0][0].where;
      expect(where.status).toBe(BookStatus.ACTIVE);
      expect(where.OR).toHaveLength(3);
    });
  });

  describe('getBookById (UC-CAT-01)', () => {
    it('ném 404 khi sách không ACTIVE', async () => {
      db.book.findFirst.mockResolvedValue(null);
      await expect(booksService.getBookById('missing')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('kèm earliestDueDate khi availableCopies = 0', async () => {
      const due = new Date('2026-09-10');
      db.book.findFirst.mockResolvedValue({ id: 'b1', availableCopies: 0, title: 'X' });
      db.borrowRecord.findFirst.mockResolvedValue({ dueDate: due });
      const result = await booksService.getBookById('b1');
      expect(result.earliestDueDate).toEqual(due);
    });
  });

  describe('createBook (UC-CAT-01)', () => {
    it('ném 409 khi ISBN trùng', async () => {
      db.book.findUnique.mockResolvedValue({ id: 'exists' });
      await expect(
        booksService.createBook({ isbn: '9780132350884', title: 'Clean Code', authorNames: ['Uncle Bob'] }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('ném 400 khi categoryId không tồn tại', async () => {
      db.book.findUnique.mockResolvedValue(null);
      db.category.findUnique.mockResolvedValue(null);
      await expect(
        booksService.createBook({
          title: 'X',
          authorNames: ['A'],
          categoryId: 'cat-bad',
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('tạo sách với totalCopies từ copiesByBranch', async () => {
      db.book.findUnique.mockResolvedValue(null);
      db.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      db.branch.findUnique.mockResolvedValue({ id: 'br-1' });
      db.book.create.mockResolvedValue({ id: 'book-1', isbn: '1234567890123' });
      db.physicalCopy.findUnique.mockResolvedValue(null);
      db.physicalCopy.create.mockResolvedValue({});

      await booksService.createBook({
        isbn: '1234567890123',
        title: 'Clean Code',
        authorNames: ['Uncle Bob'],
        categoryId: 'cat-1',
        copiesByBranch: { 'br-1': { quantity: 2, location: 'Kệ A' } },
      });

      expect(db.book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalCopies: 2, availableCopies: 2 }),
        }),
      );
      expect(db.physicalCopy.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteBook (UC-CAT-01)', () => {
    it('ném 404 nếu đã xóa mềm', async () => {
      db.book.findUnique.mockResolvedValue({ id: 'b1', status: BookStatus.DELETED });
      await expect(booksService.deleteBook('b1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('ném 422 nếu còn phiếu mượn ACTIVE', async () => {
      db.book.findUnique.mockResolvedValue({ id: 'b1', status: BookStatus.ACTIVE });
      db.borrowRecord.count.mockResolvedValue(1);
      await expect(booksService.deleteBook('b1')).rejects.toMatchObject({ statusCode: 422 });
    });

    it('soft-delete khi không còn bản đang mượn', async () => {
      db.book.findUnique.mockResolvedValue({ id: 'b1', status: BookStatus.ACTIVE });
      db.borrowRecord.count.mockResolvedValue(0);
      db.book.update.mockResolvedValue({});
      const result = await booksService.deleteBook('b1');
      expect(result.message).toBe('Xóa tài liệu thành công');
      expect(db.book.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { status: BookStatus.DELETED, deletedAt: expect.any(Date) },
      });
    });
  });

  describe('submitReview (UC-EXP-03)', () => {
    it('ném 400 khi rating ngoài 1–5', async () => {
      await expect(
        booksService.submitReview('u1', 'b1', { rating: 6 }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('ném 403 khi chưa mượn / chưa đọc số', async () => {
      db.borrowRecord.count.mockResolvedValue(0);
      db.digitalAccessLog.count.mockResolvedValue(0);
      await expect(
        booksService.submitReview('u1', 'b1', { rating: 5, content: 'Hay' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('upsert review và cập nhật averageRating', async () => {
      db.borrowRecord.count.mockResolvedValue(1);
      db.digitalAccessLog.count.mockResolvedValue(0);
      db.review.upsert.mockResolvedValue({ id: 'r1', rating: 5 });
      db.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { rating: 2 } });
      db.book.update.mockResolvedValue({});

      const review = await booksService.submitReview('u1', 'b1', { rating: 5, content: 'Hay' });
      expect(review.id).toBe('r1');
      expect(db.book.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { averageRating: 4.5, reviewCount: 2 },
      });
    });
  });

  describe('accessDigitalResource / endDigitalSession (UC-EXP-02)', () => {
    it('ném 404 khi resource không tồn tại', async () => {
      db.digitalResource.findUnique.mockResolvedValue(null);
      await expect(booksService.accessDigitalResource('d1', 'u1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('ném 429 khi hết slot đồng thời', async () => {
      db.digitalResource.findUnique.mockResolvedValue({
        id: 'd1',
        currentUsers: 3,
        maxConcurrentUsers: 3,
        resourceType: 'PDF',
        book: { id: 'b1', title: 'X' },
      });
      db.digitalAccessLog.count.mockResolvedValue(3);
      await expect(booksService.accessDigitalResource('d1', 'u1')).rejects.toMatchObject({
        statusCode: 429,
      });
    });

    it('endDigitalSession ném 403 khi không phải chủ phiên', async () => {
      db.digitalAccessLog.findUnique.mockResolvedValue({
        id: 'log-1',
        userId: 'other',
        endedAt: null,
        digitalResource: { book: { title: 'X' } },
      });
      await expect(booksService.endDigitalSession('log-1', 'u1')).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('physical copy', () => {
    it('addPhysicalCopy ném 422 khi barcode trùng', async () => {
      db.physicalCopy.findUnique.mockResolvedValue({ id: 'c1' });
      await expect(
        booksService.addPhysicalCopy('b1', { barcode: 'BK-1', branchId: 'br-1' }),
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('deletePhysicalCopy ném 422 khi đang BORROWED', async () => {
      db.physicalCopy.findUnique.mockResolvedValue({ id: 'c1', status: 'BORROWED', bookId: 'b1' });
      await expect(booksService.deletePhysicalCopy('c1')).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  describe('getBookInfoByIsbn', () => {
    it('ném 404 khi không tra cứu được', async () => {
      (fetchBookInfoByIsbn as jest.Mock).mockResolvedValue(null);
      await expect(booksService.getBookInfoByIsbn('000')).rejects.toMatchObject({ statusCode: 404 });
    });
  });
  describe('searchBooks — các nhánh lọc và phân trang', () => {
    it('dùng giá trị mặc định khi page/limit không truyền', async () => {
      db.book.count.mockResolvedValue(13);
      db.book.findMany.mockResolvedValue([]);

      const result = await booksService.searchBooks({});
      expect(db.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 12,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result.pagination).toEqual(
        expect.objectContaining({ total: 13, page: 1, limit: 12, totalPages: 2 }),
      );
    });

    it('lọc riêng theo title và categoryId', async () => {
      db.book.count.mockResolvedValue(1);
      db.book.findMany.mockResolvedValue([{ id: 'b1' }]);

      await booksService.searchBooks({
        q: 'Clean',
        field: 'title',
        categoryId: 'cat-1',
        page: 2,
        limit: 5,
      });

      const where = db.book.findMany.mock.calls[0][0].where;
      expect(where).toEqual({
        status: BookStatus.ACTIVE,
        OR: [{ title: { contains: 'Clean', mode: 'insensitive' } }],
        categoryId: 'cat-1',
      });
      expect(db.book.findMany.mock.calls[0][0].skip).toBe(5);
      expect(db.book.findMany.mock.calls[0][0].take).toBe(5);
    });

    it('lọc riêng theo author', async () => {
      db.book.count.mockResolvedValue(1);
      db.book.findMany.mockResolvedValue([{ id: 'b1' }]);

      await booksService.searchBooks({ q: 'Martin', field: 'author' });
      const where = db.book.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([{ authorNames: { hasSome: ['Martin'] } }]);
    });

    it('lọc riêng theo isbn', async () => {
      db.book.count.mockResolvedValue(1);
      db.book.findMany.mockResolvedValue([{ id: 'b1' }]);

      await booksService.searchBooks({ q: '978', field: 'isbn' });
      const where = db.book.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([{ isbn: { contains: '978' } }]);
    });

    it('trim keyword và bỏ OR khi q chỉ chứa khoảng trắng', async () => {
      db.book.count.mockResolvedValue(1);
      db.book.findMany.mockResolvedValue([{ id: 'b1' }]);

      await booksService.searchBooks({ q: '   ', field: 'all' });
      const where = db.book.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ status: BookStatus.ACTIVE });
    });
  });

  describe('getBookById — các nhánh earliestDueDate', () => {
    it('trả earliestDueDate là null khi hết sách nhưng không có bản đang mượn', async () => {
      db.book.findFirst.mockResolvedValue({ id: 'b1', availableCopies: 0 });
      db.borrowRecord.findFirst.mockResolvedValue(null);

      const result = await booksService.getBookById('b1');
      expect(result.earliestDueDate).toBeNull();
    });

    it('không truy vấn borrowRecord khi vẫn còn sách', async () => {
      db.book.findFirst.mockResolvedValue({ id: 'b1', availableCopies: 2 });
      const result = await booksService.getBookById('b1');

      expect(result.earliestDueDate).toBeNull();
      expect(db.borrowRecord.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('createBook — validation và barcode', () => {
    it('ném 400 khi branch trong copiesByBranch không tồn tại', async () => {
      db.book.findUnique.mockResolvedValue(null);
      db.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      db.branch.findUnique.mockResolvedValue(null);

      await expect(
        booksService.createBook({
          title: 'Book',
          authorNames: ['A'],
          categoryId: 'cat-1',
          copiesByBranch: { 'missing-branch': { quantity: 1 } },
        }),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(db.book.create).not.toHaveBeenCalled();
    });

    it('không tạo physical copy khi quantity bằng 0', async () => {
      db.book.findUnique.mockResolvedValue(null);
      db.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      db.branch.findUnique.mockResolvedValue(null);
      db.book.create.mockResolvedValue({ id: 'book-1' });

      await booksService.createBook({
        title: 'Book',
        authorNames: ['A'],
        categoryId: 'cat-1',
        copiesByBranch: { 'br-1': { quantity: 0 } },
      });

      expect(db.book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalCopies: 0, availableCopies: 0 }),
        }),
      );
      expect(db.physicalCopy.create).not.toHaveBeenCalled();
    });

    it('dùng id sách làm prefix khi không có ISBN', async () => {
      db.book.findUnique.mockResolvedValue(null);
      db.branch.findUnique.mockResolvedValue({ id: 'br-1' });
      db.book.create.mockResolvedValue({ id: 'book-ABCD' });
      db.physicalCopy.findUnique.mockResolvedValue(null);
      db.physicalCopy.create.mockResolvedValue({});

      await booksService.createBook({
        title: 'Book',
        authorNames: ['A'],
        copiesByBranch: { 'br-1': { quantity: 1, location: 'Kệ B' } },
      });

      expect(db.physicalCopy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            barcode: 'BK-ABCD-0001',
            location: 'Kệ B',
          }),
        }),
      );
    });

    it('đổi barcode khi barcode sinh tự động đã tồn tại', async () => {
      db.book.findUnique.mockResolvedValue(null);
      db.branch.findUnique.mockResolvedValue({ id: 'br-1' });
      db.book.create.mockResolvedValue({ id: 'book-1', isbn: '1234567890123' });
      db.physicalCopy.findUnique.mockResolvedValue({ id: 'existing' });
      db.physicalCopy.count.mockResolvedValue(7);
      db.physicalCopy.create.mockResolvedValue({});

      await booksService.createBook({
        isbn: '1234567890123',
        title: 'Book',
        authorNames: ['A'],
        copiesByBranch: { 'br-1': { quantity: 1 } },
      });

      expect(db.physicalCopy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ barcode: 'BK-0123-0008' }),
        }),
      );
    });
  });

  describe('updateBook (UC-CAT-01)', () => {
    it('ném 404 khi sách không tồn tại', async () => {
      db.book.findUnique.mockResolvedValue(null);

      await expect(booksService.updateBook('missing', { title: 'New' }))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('ném 404 khi sách đã DELETED', async () => {
      db.book.findUnique.mockResolvedValue({ id: 'b1', status: BookStatus.DELETED });

      await expect(booksService.updateBook('b1', { title: 'New' }))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('cập nhật thông tin sách khi không có copiesByBranch', async () => {
      db.book.findUnique.mockResolvedValue({ id: 'b1', status: BookStatus.ACTIVE });
      db.book.update.mockResolvedValue({ id: 'b1', title: 'New' });

      const result = await booksService.updateBook('b1', {
        title: 'New',
        authorNames: ['Author'],
      });

      expect(result.title).toBe('New');
      expect(db.book.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { title: 'New', authorNames: ['Author'] },
      });
    });

    it('tăng số physical copy khi targetQty lớn hơn hiện tại', async () => {
      db.book.findUnique.mockResolvedValue({
        id: 'b1',
        status: BookStatus.ACTIVE,
        isbn: '9780132350884',
      });
      db.physicalCopy.findMany
        .mockResolvedValueOnce([
          { id: 'c1', status: 'AVAILABLE' },
        ])
        .mockResolvedValueOnce([
          { id: 'c1', status: 'AVAILABLE' },
          { id: 'c2', status: 'AVAILABLE' },
          { id: 'c3', status: 'AVAILABLE' },
        ]);
      db.physicalCopy.findUnique.mockResolvedValue(null);
      db.physicalCopy.create.mockResolvedValue({});
      db.physicalCopy.updateMany.mockResolvedValue({ count: 3 });
      db.book.update.mockResolvedValue({ id: 'b1', totalCopies: 3, availableCopies: 3 });

      await booksService.updateBook('b1', {
        copiesByBranch: { 'br-1': { quantity: 3, location: 'Kệ A' } },
      });

      expect(db.physicalCopy.create).toHaveBeenCalledTimes(2);
      expect(db.physicalCopy.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            barcode: 'BK-0884-0002',
            branchId: 'br-1',
            location: 'Kệ A',
          }),
        }),
      );
      expect(db.physicalCopy.updateMany).toHaveBeenCalled();
      expect(db.book.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: expect.objectContaining({ totalCopies: 3, availableCopies: 3 }),
      });
    });

    it('giảm số physical copy và chỉ xóa bản AVAILABLE', async () => {
      db.book.findUnique.mockResolvedValue({
        id: 'b1',
        status: BookStatus.ACTIVE,
        isbn: '1234567890123',
      });
      db.physicalCopy.findMany
        .mockResolvedValueOnce([
          { id: 'c1', status: 'AVAILABLE' },
          { id: 'c2', status: 'BORROWED' },
          { id: 'c3', status: 'AVAILABLE' },
        ])
        .mockResolvedValueOnce([
          { id: 'c2', status: 'BORROWED' },
        ]);
      db.physicalCopy.delete.mockResolvedValue({});
      db.physicalCopy.updateMany.mockResolvedValue({ count: 1 });
      db.book.update.mockResolvedValue({ id: 'b1' });

      await booksService.updateBook('b1', {
        copiesByBranch: { 'br-1': { quantity: 1, location: 'Kệ C' } },
      });

      expect(db.physicalCopy.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(db.book.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: expect.objectContaining({ totalCopies: 1, availableCopies: 0 }),
      });
    });

    it('không xóa quá số bản AVAILABLE khi target thấp hơn current', async () => {
      db.book.findUnique.mockResolvedValue({
        id: 'b1',
        status: BookStatus.ACTIVE,
        isbn: '1234567890123',
      });
      db.physicalCopy.findMany
        .mockResolvedValueOnce([
          { id: 'c1', status: 'BORROWED' },
          { id: 'c2', status: 'BORROWED' },
        ])
        .mockResolvedValueOnce([
          { id: 'c1', status: 'BORROWED' },
          { id: 'c2', status: 'BORROWED' },
        ]);
      db.physicalCopy.updateMany.mockResolvedValue({ count: 2 });
      db.book.update.mockResolvedValue({ id: 'b1' });

      await booksService.updateBook('b1', {
        copiesByBranch: { 'br-1': { quantity: 0 } },
      });

      expect(db.physicalCopy.delete).not.toHaveBeenCalled();
    });

    it('đổi barcode sinh ra khi barcode mới bị trùng', async () => {
      db.book.findUnique.mockResolvedValue({
        id: 'b1',
        status: BookStatus.ACTIVE,
        isbn: '1234567890123',
      });
      db.physicalCopy.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'new', status: 'AVAILABLE' }]);
      db.physicalCopy.findUnique.mockResolvedValue({ id: 'collision' });
      db.physicalCopy.count.mockResolvedValue(5);
      db.physicalCopy.create.mockResolvedValue({});
      db.physicalCopy.updateMany.mockResolvedValue({ count: 1 });
      db.book.update.mockResolvedValue({ id: 'b1' });

      await booksService.updateBook('b1', {
        copiesByBranch: { 'br-1': { quantity: 1 } },
      });

      expect(db.physicalCopy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ barcode: 'BK-0123-0006' }),
        }),
      );
    });
  });

  describe('listDigitalResources (UC-EXP-02)', () => {
    it('áp dụng resourceType, keyword và giới hạn tối đa 100', async () => {
      db.digitalResource.count.mockResolvedValue(1);
      db.digitalResource.findMany.mockResolvedValue([
        {
          id: 'd1',
          bookId: 'b1',
          resourceType: 'PDF',
          maxConcurrentUsers: 3,
          currentUsers: 1,
          _count: { accessLogs: 12 },
          book: { id: 'b1', title: 'Clean Code' },
        },
      ]);

      const result = await booksService.listDigitalResources({
        resourceType: 'PDF',
        q: 'Clean',
        page: 2,
        limit: 999,
      });

      expect(result.pagination).toEqual({
        total: 1,
        page: 2,
        limit: 100,
        totalPages: 1,
      });
      expect(result.data[0]).toEqual(expect.objectContaining({
        accessCount: 12,
        isAvailable: true,
      }));

      const where = db.digitalResource.findMany.mock.calls[0][0].where;
      expect(where.resourceType).toBe('PDF');
      expect(where.book.OR).toHaveLength(2);
    });

    it('trả isAvailable=false khi currentUsers đạt maxConcurrentUsers', async () => {
      db.digitalResource.count.mockResolvedValue(1);
      db.digitalResource.findMany.mockResolvedValue([
        {
          id: 'd1',
          bookId: 'b1',
          resourceType: 'PDF',
          maxConcurrentUsers: 2,
          currentUsers: 2,
          _count: { accessLogs: 4 },
          book: { id: 'b1', title: 'Book' },
        },
      ]);

      const result = await booksService.listDigitalResources({});
      expect(result.data[0].isAvailable).toBe(false);
    });
  });

  describe('getUserActiveDigitalSession', () => {
    it('trả null khi user không có phiên đang mở', async () => {
      db.digitalAccessLog.findFirst.mockResolvedValue(null);
      await expect(booksService.getUserActiveDigitalSession('u1')).resolves.toBeNull();
    });

    it('map đầy đủ thông tin phiên đang mở', async () => {
      const accessedAt = new Date('2026-09-01T10:00:00Z');
      db.digitalAccessLog.findFirst.mockResolvedValue({
        id: 'log-1',
        accessedAt,
        digitalResource: {
          id: 'd1',
          fileUrl: '/file.pdf',
          resourceType: 'PDF',
          bookId: 'b1',
          book: {
            id: 'b1',
            title: 'Clean Code',
            coverImageUrl: '/cover.jpg',
            authorNames: ['Robert C. Martin'],
          },
        },
      });

      const result = await booksService.getUserActiveDigitalSession('u1');
      expect(result).toEqual({
        accessLogId: 'log-1',
        fileUrl: '/file.pdf',
        resourceType: 'PDF',
        bookTitle: 'Clean Code',
        bookId: 'b1',
        resourceId: 'd1',
        coverImageUrl: '/cover.jpg',
        authorNames: ['Robert C. Martin'],
        accessedAt,
      });
    });
  });

  describe('accessDigitalResource — happy path và đồng bộ slot', () => {
    it('đồng bộ currentUsers với số session thực tế trước khi mở phiên', async () => {
      db.digitalResource.findUnique.mockResolvedValue({
        id: 'd1',
        currentUsers: 0,
        maxConcurrentUsers: 3,
        resourceType: 'PDF',
        book: {
          id: 'b1',
          title: 'Clean Code',
          authorNames: ['Author'],
          description: 'Desc',
          publisher: 'Publisher',
          publishYear: 2008,
          coverImageUrl: '/cover.jpg',
        },
      });
      db.digitalAccessLog.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(5);
      db.digitalAccessLog.findMany.mockResolvedValue([]);
      db.digitalResource.update.mockResolvedValue({});
      db.digitalAccessLog.create.mockResolvedValue({ id: 'log-1' });
      (require('../../src/modules/books/digital-content.service').resolveContentForResource as jest.Mock)
        .mockReturnValueOnce({ mode: 'ebook-html', embedUrl: 'embed', streamUrl: undefined, label: 'Ebook' });

      const result = await booksService.accessDigitalResource('d1', 'u1');

      expect(db.digitalResource.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { currentUsers: 2 },
      });
      expect(db.digitalAccessLog.create).toHaveBeenCalledWith({
        data: { digitalResourceId: 'd1', userId: 'u1' },
      });
      expect(result).toEqual(expect.objectContaining({
        accessLogId: 'log-1',
        contentMode: 'ebook-html',
        embedUrl: 'embed',
        streamUrl: null,
        contentLabel: 'Ebook',
        accessCount: 5,
      }));
    });

    it('không mở phiên khi slot đầy sau khi đồng bộ', async () => {
      db.digitalResource.findUnique.mockResolvedValue({
        id: 'd1',
        currentUsers: 1,
        maxConcurrentUsers: 2,
        resourceType: 'PDF',
        book: { id: 'b1', title: 'Book' },
      });
      db.digitalAccessLog.count.mockResolvedValue(2);

      await expect(booksService.accessDigitalResource('d1', 'u1'))
        .rejects.toMatchObject({ statusCode: 429 });

      expect(db.digitalAccessLog.create).not.toHaveBeenCalled();
    });
  });

  describe('renderDigitalView', () => {
    it('ném 403 khi user chưa có active log', async () => {
      db.digitalAccessLog.findFirst.mockResolvedValue(null);

      await expect(booksService.renderDigitalView('d1', 'u1'))
        .rejects.toMatchObject({ statusCode: 403 });
    });

    it('ném 404 khi resource biến mất sau khi kiểm tra session', async () => {
      db.digitalAccessLog.findFirst.mockResolvedValue({ id: 'log-1' });
      db.digitalResource.findUnique.mockResolvedValue(null);

      await expect(booksService.renderDigitalView('d1', 'u1'))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('gọi buildEbookHtml cho PDF và EPUB', async () => {
      db.digitalAccessLog.findFirst.mockResolvedValue({ id: 'log-1' });
      db.digitalResource.findUnique.mockResolvedValue({
        resourceType: 'EPUB',
        book: {
          title: 'Book',
          authorNames: ['Author'],
          description: 'Desc',
          publisher: 'Pub',
          publishYear: 2020,
          isbn: '123',
          coverImageUrl: '/cover',
        },
      });

      const ebook = require('../../src/modules/books/digital-content.service').buildEbookHtml as jest.Mock;
      ebook.mockReturnValueOnce('<html>epub</html>');

      const result = await booksService.renderDigitalView('d1', 'u1');
      expect(result).toBe('<html>epub</html>');
      expect(ebook).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Book',
        resourceType: 'EPUB',
      }));
    });

    it('gọi buildAudiobookHtml cho AUDIOBOOK', async () => {
      db.digitalAccessLog.findFirst.mockResolvedValue({ id: 'log-1' });
      db.digitalResource.findUnique.mockResolvedValue({
        resourceType: 'AUDIOBOOK',
        book: {
          title: 'Audio Book',
          authorNames: ['Author'],
          description: 'Desc',
        },
      });

      const audio = require('../../src/modules/books/digital-content.service').buildAudiobookHtml as jest.Mock;
      audio.mockReturnValueOnce('<html>audio-2</html>');

      await expect(booksService.renderDigitalView('d1', 'u1'))
        .resolves.toBe('<html>audio-2</html>');
      expect(audio).toHaveBeenCalled();
    });

    it('ném 400 với loại resource không hỗ trợ HTML', async () => {
      db.digitalAccessLog.findFirst.mockResolvedValue({ id: 'log-1' });
      db.digitalResource.findUnique.mockResolvedValue({
        resourceType: 'VIDEO',
        book: {
          title: 'Video',
          authorNames: ['Author'],
          description: 'Desc',
        },
      });

      await expect(booksService.renderDigitalView('d1', 'u1'))
        .rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('endDigitalSession / endAllUserDigitalSessions', () => {
    it('trả message khi access log không tồn tại', async () => {
      db.digitalAccessLog.findUnique.mockResolvedValue(null);

      await expect(booksService.endDigitalSession('missing', 'u1')).resolves.toEqual({
        message: 'Phiên đọc không tồn tại',
        durationSeconds: 0,
        bookTitle: undefined,
      });
    });

    it('không cập nhật database khi phiên đã kết thúc', async () => {
      db.digitalAccessLog.findUnique.mockResolvedValue({
        id: 'log-1',
        userId: 'u1',
        endedAt: new Date(),
        durationSeconds: 42,
        digitalResource: { resourceType: 'PDF', book: { title: 'Book' } },
      });

      const result = await booksService.endDigitalSession('log-1', 'u1');
      expect(result).toEqual({
        message: 'Phiên đọc đã kết thúc',
        durationSeconds: 42,
        bookTitle: 'Book',
        resourceType: 'PDF',
      });
      expect(db.digitalAccessLog.update).not.toHaveBeenCalled();
    });

    it('kết thúc active session và giảm currentUsers', async () => {
      const accessedAt = new Date(Date.now() - 5000);
      db.digitalAccessLog.findUnique.mockResolvedValue({
        id: 'log-1',
        userId: 'u1',
        accessedAt,
        endedAt: null,
        digitalResourceId: 'd1',
        digitalResource: {
          currentUsers: 1,
          resourceType: 'PDF',
          book: { title: 'Book' },
        },
      });
      db.digitalAccessLog.update.mockResolvedValue({});
      db.digitalResource.update.mockResolvedValue({});

      const result = await booksService.endDigitalSession('log-1', 'u1');

      expect(result.message).toBe('Phiên đọc đã kết thúc');
      expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(db.digitalResource.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { currentUsers: 0 },
      });
    });

    it('không giảm currentUsers xuống số âm', async () => {
      const accessedAt = new Date(Date.now() - 1000);
      db.digitalAccessLog.findUnique.mockResolvedValue({
        id: 'log-1',
        userId: 'u1',
        accessedAt,
        endedAt: null,
        digitalResourceId: 'd1',
        digitalResource: {
          currentUsers: 0,
          resourceType: 'PDF',
          book: { title: 'Book' },
        },
      });
      db.digitalAccessLog.update.mockResolvedValue({});
      db.digitalResource.update.mockResolvedValue({});

      await booksService.endDigitalSession('log-1', 'u1');
      expect(db.digitalResource.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { currentUsers: 0 },
      });
    });

    it('endAllUserDigitalSessions kết thúc tất cả phiên active', async () => {
      db.digitalAccessLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          accessedAt: new Date(Date.now() - 3000),
          digitalResourceId: 'd1',
          digitalResource: {
            currentUsers: 2,
            resourceType: 'PDF',
            book: { title: 'Book 1' },
          },
        },
        {
          id: 'log-2',
          accessedAt: new Date(Date.now() - 2000),
          digitalResourceId: 'd2',
          digitalResource: {
            currentUsers: 1,
            resourceType: 'EPUB',
            book: { title: 'Book 2' },
          },
        },
      ]);
      db.digitalAccessLog.update.mockResolvedValue({});
      db.digitalResource.update.mockResolvedValue({});

      const result = await booksService.endAllUserDigitalSessions('u1');
      expect(result).toEqual({ endedCount: 2 });
      expect(db.digitalAccessLog.update).toHaveBeenCalledTimes(2);
      expect(db.digitalResource.update).toHaveBeenCalledTimes(2);
    });

    it('endAllUserDigitalSessions trả endedCount=0 khi không có session', async () => {
      db.digitalAccessLog.findMany.mockResolvedValue([]);
      await expect(booksService.endAllUserDigitalSessions('u1'))
        .resolves.toEqual({ endedCount: 0 });
    });
  });

  describe('getCategories', () => {
    it('lấy danh mục theo tên tăng dần và kèm số lượng sách', async () => {
      db.category.findMany.mockResolvedValue([
        { id: 'c1', name: 'A', _count: { books: 2 } },
      ]);

      const result = await booksService.getCategories();
      expect(result).toEqual([{ id: 'c1', name: 'A', _count: { books: 2 } }]);
      expect(db.category.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        include: { _count: { select: { books: true } } },
      });
    });
  });

  describe('importBooksFromExcel', () => {
    const makeExcelBuffer = (rows: any[]) => {
      const workbook = xlsx.utils.book_new();
      const sheet = xlsx.utils.json_to_sheet(rows);
      xlsx.utils.book_append_sheet(workbook, sheet, 'Books');
      return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    };

    it('ném 400 khi file Excel không có dữ liệu', async () => {
      const buffer = makeExcelBuffer([]);
      await expect(booksService.importBooksFromExcel(buffer, 'admin'))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('import thành công, tạo category mới và map authorNames', async () => {
      db.category.findFirst.mockResolvedValue(null);
      db.category.create.mockResolvedValue({ id: 'cat-new', name: 'Programming' });
      db.book.findUnique.mockResolvedValue(null);
      db.book.create.mockResolvedValue({ id: 'b1' });

      const buffer = makeExcelBuffer([{
        ISBN: '1234567890123',
        'Tiêu đề': 'Clean Code',
        'Tác giả': 'Robert C. Martin, Uncle Bob',
        'Nhà xuất bản': 'PH',
        'Năm XB': 2008,
        'Ngôn ngữ': 'en',
        'Danh mục': 'Programming',
        'Mô tả': 'A book',
      }]);

      const result = await booksService.importBooksFromExcel(buffer, 'admin');

      expect(result).toEqual({ success: 1, failed: 0, errors: [] });
      expect(db.category.create).toHaveBeenCalledWith({ data: { name: 'Programming' } });
      expect(db.book.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isbn: '1234567890123',
          title: 'Clean Code',
          authorNames: ['Robert C. Martin', 'Uncle Bob'],
          categoryId: 'cat-new',
          createdById: 'admin',
          publishYear: 2008,
        }),
      });
    });

    it('dùng category có sẵn và hỗ trợ cột tiếng Anh', async () => {
      db.category.findFirst.mockResolvedValue({ id: 'cat-1', name: 'Programming' });
      db.book.findUnique.mockResolvedValue(null);
      db.book.create.mockResolvedValue({ id: 'b1' });

      const buffer = makeExcelBuffer([{
        ISBN: '1111111111111',
        Title: 'Book',
        Authors: 'Author',
        Publisher: 'Publisher',
        Year: '2020',
        Language: 'en',
        Category: 'Programming',
        Description: 'Desc',
      }]);

      const result = await booksService.importBooksFromExcel(buffer, 'admin');
      expect(result.success).toBe(1);
      expect(db.category.create).not.toHaveBeenCalled();
      expect(db.book.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Book',
          authorNames: ['Author'],
          publishYear: 2020,
          categoryId: 'cat-1',
          language: 'en',
        }),
      });
    });

    it('ghi nhận lỗi theo từng dòng và vẫn tiếp tục import dòng sau', async () => {
      db.category.findFirst.mockResolvedValue(null);
      db.category.create.mockResolvedValue({ id: 'cat-1', name: 'Cat' });
      db.book.findUnique
        .mockResolvedValueOnce({ id: 'duplicate' })
        .mockResolvedValueOnce(null);
      db.book.create.mockResolvedValue({ id: 'b2' });

      const buffer = makeExcelBuffer([
        { ISBN: '1111111111111', 'Tiêu đề': 'Duplicate', 'Danh mục': 'Cat' },
        { ISBN: '2222222222222', 'Tiêu đề': 'Valid', 'Danh mục': 'Cat' },
      ]);

      const result = await booksService.importBooksFromExcel(buffer, 'admin');
      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Mã ISBN 1111111111111 đã tồn tại');
    });

    it('ghi nhận lỗi khi thiếu Tiêu đề', async () => {
      const buffer = makeExcelBuffer([{ ISBN: '1234567890123', 'Tác giả': 'Author' }]);
      const result = await booksService.importBooksFromExcel(buffer, 'admin');

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Tiêu đề là bắt buộc');
    });
  });

  describe('physical copy management', () => {
    it('addPhysicalCopy tạo copy và đồng bộ tổng số bản', async () => {
      db.physicalCopy.findUnique.mockResolvedValue(null);
      db.physicalCopy.create.mockResolvedValue({
        id: 'c1',
        bookId: 'b1',
        barcode: 'BK-1',
        branchId: 'br-1',
      });
      db.physicalCopy.findMany.mockResolvedValue([
        { status: 'AVAILABLE' },
        { status: 'BORROWED' },
      ]);
      db.book.update.mockResolvedValue({});

      const result = await booksService.addPhysicalCopy('b1', {
        barcode: 'BK-1',
        branchId: 'br-1',
        condition: 'NEW',
      });

      expect(result.id).toBe('c1');
      expect(db.book.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { totalCopies: 2, availableCopies: 1 },
      });
    });

    it('updatePhysicalCopy ném 404 khi copy không tồn tại', async () => {
      db.physicalCopy.findUnique.mockResolvedValue(null);
      await expect(booksService.updatePhysicalCopy('missing', { location: 'A' }))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('updatePhysicalCopy ném 422 khi đổi sang barcode đã tồn tại', async () => {
      db.physicalCopy.findUnique
        .mockResolvedValueOnce({ id: 'c1', barcode: 'OLD', bookId: 'b1' })
        .mockResolvedValueOnce({ id: 'c2', barcode: 'NEW' });

      await expect(
        booksService.updatePhysicalCopy('c1', { barcode: 'NEW' }),
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('updatePhysicalCopy cập nhật và đồng bộ số lượng', async () => {
      db.physicalCopy.findUnique.mockResolvedValueOnce({
        id: 'c1',
        barcode: 'OLD',
        bookId: 'b1',
      });
      db.physicalCopy.update.mockResolvedValue({
        id: 'c1',
        barcode: 'NEW',
        bookId: 'b1',
      });
      db.physicalCopy.findMany.mockResolvedValue([
        { status: 'AVAILABLE' },
        { status: 'DAMAGED' },
      ]);
      db.book.update.mockResolvedValue({});

      const result = await booksService.updatePhysicalCopy('c1', {
        barcode: 'NEW',
        branchId: 'br-2',
        location: 'Kệ D',
        condition: 'GOOD',
        status: 'AVAILABLE',
      });

      expect(result.barcode).toBe('NEW');
      expect(db.physicalCopy.update).toHaveBeenCalled();
      expect(db.book.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { totalCopies: 2, availableCopies: 1 },
      });
    });

    it('deletePhysicalCopy ném 404 khi copy không tồn tại', async () => {
      db.physicalCopy.findUnique.mockResolvedValue(null);
      await expect(booksService.deletePhysicalCopy('missing'))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('deletePhysicalCopy ném 422 khi có lịch sử mượn/luân chuyển/đặt chỗ', async () => {
      db.physicalCopy.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'AVAILABLE',
        bookId: 'b1',
      });
      db.borrowRecord.count.mockResolvedValue(1);
      db.branchTransfer.count.mockResolvedValue(0);
      db.reservation.count.mockResolvedValue(0);

      await expect(booksService.deletePhysicalCopy('c1'))
        .rejects.toMatchObject({ statusCode: 422 });
      expect(db.physicalCopy.delete).not.toHaveBeenCalled();
    });

    it('deletePhysicalCopy xóa thành công và đồng bộ số lượng', async () => {
      db.physicalCopy.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'AVAILABLE',
        bookId: 'b1',
      });
      db.borrowRecord.count.mockResolvedValue(0);
      db.branchTransfer.count.mockResolvedValue(0);
      db.reservation.count.mockResolvedValue(0);
      db.physicalCopy.delete.mockResolvedValue({});
      db.physicalCopy.findMany.mockResolvedValue([
        { status: 'AVAILABLE' },
      ]);
      db.book.update.mockResolvedValue({});

      const result = await booksService.deletePhysicalCopy('c1');
      expect(result).toEqual({ success: true });
      expect(db.physicalCopy.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(db.book.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { totalCopies: 1, availableCopies: 1 },
      });
    });

    it('deletePhysicalCopy chặn khi có branch transfer hoặc reservation', async () => {
      db.physicalCopy.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'AVAILABLE',
        bookId: 'b1',
      });
      db.borrowRecord.count.mockResolvedValue(0);
      db.branchTransfer.count.mockResolvedValue(1);
      db.reservation.count.mockResolvedValue(1);

      await expect(booksService.deletePhysicalCopy('c1'))
        .rejects.toMatchObject({ statusCode: 422 });
    });
  });

});
