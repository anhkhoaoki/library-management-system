import prisma from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import { BookStatus } from '@prisma/client';
import * as xlsx from 'xlsx';
import { fetchBookInfoByIsbn } from './books.utils';

// ─── UC-EXP-01: Search / List Books ─────────────────────────
export const searchBooks = async (query: {
  q?: string;
  field?: 'title' | 'author' | 'isbn' | 'all';
  categoryId?: string;
  page?: number;
  limit?: number;
}) => {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 12, 50);
  const skip = (page - 1) * limit;
  const keyword = query.q?.trim();
  const field = query.field || 'all';

  const where: Record<string, unknown> = { status: BookStatus.ACTIVE };

  if (keyword) {
    const conditions: Record<string, unknown>[] = [];
    if (field === 'all' || field === 'title') {
      conditions.push({ title: { contains: keyword, mode: 'insensitive' } });
    }
    if (field === 'all' || field === 'author') {
      conditions.push({ authorNames: { hasSome: [keyword] } });
    }
    if (field === 'all' || field === 'isbn') {
      conditions.push({ isbn: { contains: keyword } });
    }
    if (conditions.length > 0) where['OR'] = conditions;
  }

  if (query.categoryId) where['categoryId'] = query.categoryId;

  const [total, books] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        authorNames: true,
        isbn: true,
        publishYear: true,
        coverImageUrl: true,
        availableCopies: true,
        totalCopies: true,
        averageRating: true,
        reviewCount: true,
        category: { select: { id: true, name: true } },
        digitalResources: { select: { id: true, resourceType: true } },
      },
    }),
  ]);

  if (total === 0) {
    return {
      message: 'Không tìm thấy tài liệu phù hợp với từ khóa của bạn',
      data: [],
      pagination: { total: 0, page, limit, totalPages: 0 },
    };
  }

  return {
    data: books,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── UC-CAT-01: Get Book Detail ──────────────────────────────
export const getBookById = async (bookId: string) => {
  const book = await prisma.book.findFirst({
    where: { id: bookId, status: BookStatus.ACTIVE },
    include: {
      category: true,
      physicalCopies: {
        where: { status: { not: 'LOST' } },
        select: { 
          id: true, 
          barcode: true, 
          status: true, 
          branchId: true, 
          location: true,
          branch: { select: { id: true, name: true } }
        },
      },
      digitalResources: {
        select: { id: true, resourceType: true, maxConcurrentUsers: true, currentUsers: true },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          rating: true,
          content: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!book) throw createError('Tài liệu không tồn tại hoặc đã bị xóa', 404);
  return book;
};

// ─── UC-CAT-01: Create Book ──────────────────────────────────
export const createBook = async (data: {
  isbn?: string;
  title: string;
  authorNames: string[];
  publisher?: string;
  publishYear?: number;
  language?: string;
  categoryId?: string;
  description?: string;
  coverImageUrl?: string;
  createdById?: string;
}) => {
  if (data.isbn) {
    const existing = await prisma.book.findUnique({ where: { isbn: data.isbn } });
    if (existing) throw createError('Mã ISBN đã tồn tại trong hệ thống', 409);
  }

  // Validate categoryId exists before inserting (avoid FK constraint crash)
  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw createError(
        `Danh mục không tồn tại (categoryId: "${data.categoryId}"). ` +
        'Vui lòng gọi GET /api/v1/books/categories để lấy danh sách ID hợp lệ.',
        400
      );
    }
  }

  const book = await prisma.book.create({
    data: {
      isbn: data.isbn,
      title: data.title,
      authorNames: data.authorNames,
      publisher: data.publisher,
      publishYear: data.publishYear,
      language: data.language ?? 'vi',
      categoryId: data.categoryId,
      description: data.description,
      coverImageUrl: data.coverImageUrl,
      createdById: data.createdById,
    },
  });

  return book;
};

// ─── UC-CAT-01: Update Book ──────────────────────────────────
export const updateBook = async (bookId: string, data: Partial<{
  title: string;
  authorNames: string[];
  publisher: string;
  publishYear: number;
  language: string;
  categoryId: string;
  description: string;
  aiSummary: string;
  aiSummaryFlag: boolean;
  coverImageUrl: string;
}>) => {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || book.status === BookStatus.DELETED) {
    throw createError('Tài liệu không tồn tại', 404);
  }

  return prisma.book.update({ where: { id: bookId }, data });
};

// ─── UC-CAT-01: Soft Delete Book ─────────────────────────────
export const deleteBook = async (bookId: string) => {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || book.status === BookStatus.DELETED) {
    throw createError('Tài liệu không tồn tại', 404);
  }

  // Check if any copy is currently borrowed
  const activeBorrows = await prisma.borrowRecord.count({
    where: {
      physicalCopy: { bookId },
      status: 'ACTIVE',
    },
  });

  if (activeBorrows > 0) {
    throw createError(
      'Không thể xóa tài liệu đang được mượn. Vui lòng chờ tất cả bản mượn được trả lại',
      422
    );
  }

  await prisma.book.update({
    where: { id: bookId },
    data: { status: BookStatus.DELETED, deletedAt: new Date() },
  });

  return { message: 'Xóa tài liệu thành công' };
};

// ─── UC-EXP-03: Submit Review ────────────────────────────────
export const submitReview = async (
  userId: string,
  bookId: string,
  data: { rating: number; content?: string }
) => {
  if (data.rating < 1 || data.rating > 5) {
    throw createError('Số sao đánh giá phải từ 1 đến 5', 400);
  }

  // Check if user has borrowed or digitally accessed the book
  const hasBorrowed = await prisma.borrowRecord.count({
    where: { userId, physicalCopy: { bookId } },
  });

  const hasAccessed = await prisma.digitalAccessLog.count({
    where: { userId, digitalResource: { bookId } },
  });

  if (hasBorrowed === 0 && hasAccessed === 0) {
    throw createError(
      'Bạn cần mượn hoặc đọc tài liệu này trước khi có thể để lại nhận xét',
      403
    );
  }

  // Upsert review (one per user per book)
  const review = await prisma.review.upsert({
    where: { userId_bookId: { userId, bookId } },
    update: { rating: data.rating, content: data.content },
    create: { userId, bookId, rating: data.rating, content: data.content },
  });

  // Recalculate average rating
  const stats = await prisma.review.aggregate({
    where: { bookId, isVisible: true },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.book.update({
    where: { id: bookId },
    data: {
      averageRating: stats._avg.rating ?? 0,
      reviewCount: stats._count.rating,
    },
  });

  return review;
};

// ─── UC-EXP-02: Digital Access ───────────────────────────────
export const accessDigitalResource = async (resourceId: string, userId: string) => {
  const resource = await prisma.digitalResource.findUnique({
    where: { id: resourceId },
    include: { book: { select: { title: true } } },
  });

  if (!resource) throw createError('Tài nguyên kỹ thuật số không tồn tại', 404);

  if (resource.currentUsers >= resource.maxConcurrentUsers) {
    throw createError(
      'Tất cả các bản sao kỹ thuật số hiện đang được sử dụng. Vui lòng thử lại sau',
      429
    );
  }

  // Increment concurrent user count
  await prisma.digitalResource.update({
    where: { id: resourceId },
    data: { currentUsers: { increment: 1 } },
  });

  // Log access
  const accessLog = await prisma.digitalAccessLog.create({
    data: { digitalResourceId: resourceId, userId },
  });

  return {
    accessLogId: accessLog.id,
    fileUrl: resource.fileUrl,
    resourceType: resource.resourceType,
    bookTitle: resource.book.title,
  };
};

// ─── UC-EXP-02: End Digital Session ─────────────────────────
export const endDigitalSession = async (accessLogId: string) => {
  const log = await prisma.digitalAccessLog.findUnique({ where: { id: accessLogId } });
  if (!log || log.endedAt) return;

  const endedAt = new Date();
  const durationSeconds = Math.floor((endedAt.getTime() - log.accessedAt.getTime()) / 1000);

  await prisma.digitalAccessLog.update({
    where: { id: accessLogId },
    data: { endedAt, durationSeconds },
  });

  await prisma.digitalResource.update({
    where: { id: log.digitalResourceId },
    data: { currentUsers: { decrement: 1 } },
  });

  return { message: 'Phiên đọc đã kết thúc' };
};

// ─── Get All Categories ───────────────────────────────────────
export const getCategories = async () => {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { books: true } } },
  });
};

// ─── Get Book Info By ISBN ──────────────────────────────────
export const getBookInfoByIsbn = async (isbn: string) => {
  const info = await fetchBookInfoByIsbn(isbn);
  if (!info) throw createError('Không tìm thấy thông tin sách cho mã ISBN này', 404);
  return info;
};

// ─── Bulk Import From Excel ─────────────────────────────────
export const importBooksFromExcel = async (buffer: Buffer, createdById: string) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet) as any[];

  if (data.length === 0) throw createError('File Excel không có dữ liệu', 400);

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const row of data) {
    try {
      // Map Excel columns to Book fields
      // Expected columns: ISBN, Tiêu đề, Tác giả, Nhà xuất bản, Năm XB, Ngôn ngữ, Danh mục, Mô tả
      const isbn = row['ISBN']?.toString();
      const title = row['Tiêu đề'] || row['Title'];
      const authorRaw = row['Tác giả'] || row['Authors'];
      const publisher = row['Nhà xuất bản'] || row['Publisher'];
      const publishYear = row['Năm XB'] || row['Year'];
      const language = row['Ngôn ngữ'] || row['Language'] || 'vi';
      const categoryName = row['Danh mục'] || row['Category'];
      const description = row['Mô tả'] || row['Description'];

      if (!title) throw new Error('Tiêu đề là bắt buộc');

      // Find or create category
      let categoryId = undefined;
      if (categoryName) {
        let category = await prisma.category.findFirst({ where: { name: categoryName } });
        if (!category) {
          category = await prisma.category.create({ data: { name: categoryName } });
        }
        categoryId = category.id;
      }

      const authorNames = typeof authorRaw === 'string' 
        ? authorRaw.split(',').map(a => a.trim()) 
        : (Array.isArray(authorRaw) ? authorRaw : []);

      // Check duplicate ISBN
      if (isbn) {
        const existing = await prisma.book.findUnique({ where: { isbn } });
        if (existing) throw new Error(`Mã ISBN ${isbn} đã tồn tại`);
      }

      await prisma.book.create({
        data: {
          isbn,
          title,
          authorNames,
          publisher: publisher?.toString(),
          publishYear: publishYear ? parseInt(publishYear.toString()) : undefined,
          language: language?.toString(),
          categoryId,
          description: description?.toString(),
          createdById,
        },
      });

      results.success++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`Dòng "${row['Tiêu đề'] || 'Không tên'}": ${err.message}`);
    }
  }

  return results;
};
