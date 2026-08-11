import prisma from '../../config/database';
import { createError } from '../../middlewares/error.middleware';
import { BookStatus } from '@prisma/client';
import * as xlsx from 'xlsx';
import { fetchBookInfoByIsbn } from './books.utils';
import {
  buildAudiobookHtml,
  buildEbookHtml,
  resolveContentForResource,
} from './digital-content.service';

// ─── UC-EXP-01: Search / List Books ─────────────────────────
export const searchBooks = async (query: {
  q?: string;
  field?: 'title' | 'author' | 'isbn' | 'all';
  categoryId?: string;
  page?: number;
  limit?: number;
}) => {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 12, 200); // Tăng giới hạn để AI Service có thể lấy đủ sách cho embedding
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

  // Nếu hết sách → tìm bản copy có dueDate gần nhất để hiện thị "dự kiến có sẵn sau X ngày"
  let earliestDueDate: Date | null = null;
  if (book.availableCopies === 0) {
    const earliestBorrow = await prisma.borrowRecord.findFirst({
      where: {
        physicalCopy: { bookId },
        status: { in: ['ACTIVE', 'OVERDUE'] },
      },
      orderBy: { dueDate: 'asc' },
      select: { dueDate: true },
    });
    earliestDueDate = earliestBorrow?.dueDate ?? null;
  }

  return { ...book, earliestDueDate };
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
  copiesByBranch?: Record<string, { quantity: number; location?: string }>;
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

  // Validate branches in copiesByBranch
  let totalCopiesSum = 0;
  if (data.copiesByBranch) {
    for (const branchId in data.copiesByBranch) {
      const quantity = data.copiesByBranch[branchId]?.quantity || 0;
      if (quantity > 0) {
        const branch = await prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch) {
          throw createError(`Chi nhánh không tồn tại: ${branchId}`, 400);
        }
        totalCopiesSum += quantity;
      }
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
      totalCopies: totalCopiesSum,
      availableCopies: totalCopiesSum,
    },
  });

  // Create PhysicalCopy records for each branch
  if (data.copiesByBranch && totalCopiesSum > 0) {
    const prefix = data.isbn?.replace(/[^0-9]/g, '').slice(-4) || book.id.slice(-4);
    let copyIndex = 1;

    for (const branchId in data.copiesByBranch) {
      const branchInfo = data.copiesByBranch[branchId];
      const quantity = branchInfo?.quantity || 0;
      const location = branchInfo?.location || null;

      if (quantity > 0) {
        for (let i = 1; i <= quantity; i++) {
          const barcode = `BK-${prefix}-${String(copyIndex).padStart(4, '0')}`;
          const existingCopy = await prisma.physicalCopy.findUnique({ where: { barcode } });
          let finalBarcode = barcode;
          if (existingCopy) {
            const count = await prisma.physicalCopy.count({
              where: { barcode: { startsWith: `BK-${prefix}-` } }
            });
            finalBarcode = `BK-${prefix}-${String(count + copyIndex).padStart(4, '0')}`;
          }

          await prisma.physicalCopy.create({
            data: {
              bookId: book.id,
              branchId,
              barcode: finalBarcode,
              location: location || null,
              condition: 'GOOD',
              status: 'AVAILABLE',
            },
          });
          copyIndex++;
        }
      }
    }
  }

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
  copiesByBranch: Record<string, { quantity: number; location?: string }>;
}>) => {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || book.status === BookStatus.DELETED) {
    throw createError('Tài liệu không tồn tại', 404);
  }

  const { copiesByBranch, ...bookData } = data;

  if (copiesByBranch) {
    const prefix = book.isbn?.replace(/[^0-9]/g, '').slice(-4) || book.id.slice(-4);

    for (const branchId in copiesByBranch) {
      const branchInfo = copiesByBranch[branchId];
      const targetQty = branchInfo?.quantity || 0;
      const location = branchInfo?.location || null;

      const currentCopies = await prisma.physicalCopy.findMany({
        where: { bookId, branchId },
      });
      const currentQty = currentCopies.length;

      if (targetQty > currentQty) {
        const diff = targetQty - currentQty;
        for (let i = 1; i <= diff; i++) {
          const barcode = `BK-${prefix}-${String(currentQty + i).padStart(4, '0')}`;
          const existingCopy = await prisma.physicalCopy.findUnique({ where: { barcode } });
          let finalBarcode = barcode;
          if (existingCopy) {
            const count = await prisma.physicalCopy.count({
              where: { barcode: { startsWith: `BK-${prefix}-` } }
            });
            finalBarcode = `BK-${prefix}-${String(count + i).padStart(4, '0')}`;
          }

          await prisma.physicalCopy.create({
            data: {
              bookId,
              branchId,
              barcode: finalBarcode,
              location,
              condition: 'GOOD',
              status: 'AVAILABLE',
            },
          });
        }
      } else if (targetQty < currentQty) {
        const diff = currentQty - targetQty;
        const availableCopies = currentCopies.filter(c => c.status === 'AVAILABLE');
        const toDeleteCount = Math.min(diff, availableCopies.length);
        
        for (let i = 0; i < toDeleteCount; i++) {
          await prisma.physicalCopy.delete({
            where: { id: availableCopies[i].id },
          });
        }
      }

      if (location !== undefined) {
        await prisma.physicalCopy.updateMany({
          where: { bookId, branchId },
          data: { location },
        });
      }
    }

    const allCopies = await prisma.physicalCopy.findMany({
      where: { bookId },
    });
    const totalCopies = allCopies.length;
    const availableCopies = allCopies.filter(c => c.status === 'AVAILABLE').length;

    Object.assign(bookData, { totalCopies, availableCopies });
  }

  return prisma.book.update({ where: { id: bookId }, data: bookData });
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

// ─── UC-EXP-02: List Digital Resources ───────────────────────
export const listDigitalResources = async (query: {
  resourceType?: string;
  q?: string;
  page?: number;
  limit?: number;
}) => {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 100);
  const skip = (page - 1) * limit;
  const keyword = query.q?.trim();

  const where: Record<string, unknown> = {
    book: { status: BookStatus.ACTIVE },
  };

  if (query.resourceType) {
    where['resourceType'] = query.resourceType;
  }

  if (keyword) {
    where['book'] = {
      status: BookStatus.ACTIVE,
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { authorNames: { hasSome: [keyword] } },
      ],
    };
  }

  const [total, resources] = await Promise.all([
    prisma.digitalResource.count({ where }),
    prisma.digitalResource.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authorNames: true,
            coverImageUrl: true,
            category: { select: { id: true, name: true } },
          },
        },
        _count: { select: { accessLogs: true } },
      },
    }),
  ]);

  const data = resources.map((r) => ({
    id: r.id,
    bookId: r.bookId,
    resourceType: r.resourceType,
    maxConcurrentUsers: r.maxConcurrentUsers,
    currentUsers: r.currentUsers,
    accessCount: r._count.accessLogs,
    isAvailable: r.currentUsers < r.maxConcurrentUsers,
    book: r.book,
  }));

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

// ─── UC-EXP-02: Active digital session ───────────────────────
export const getUserActiveDigitalSession = async (userId: string) => {
  const log = await prisma.digitalAccessLog.findFirst({
    where: { userId, endedAt: null },
    orderBy: { accessedAt: 'desc' },
    include: {
      digitalResource: {
        include: {
          book: {
            select: { id: true, title: true, coverImageUrl: true, authorNames: true },
          },
        },
      },
    },
  });

  if (!log) return null;

  return {
    accessLogId: log.id,
    fileUrl: log.digitalResource.fileUrl,
    resourceType: log.digitalResource.resourceType,
    bookTitle: log.digitalResource.book.title,
    bookId: log.digitalResource.bookId,
    resourceId: log.digitalResource.id,
    coverImageUrl: log.digitalResource.book.coverImageUrl,
    authorNames: log.digitalResource.book.authorNames,
    accessedAt: log.accessedAt,
  };
};

// ─── UC-EXP-02: Digital Access ───────────────────────────────
export const accessDigitalResource = async (resourceId: string, userId: string) => {
  const resource = await prisma.digitalResource.findUnique({
    where: { id: resourceId },
    include: {
      book: {
        select: {
          id: true,
          title: true,
          authorNames: true,
          description: true,
          publisher: true,
          publishYear: true,
          coverImageUrl: true,
        },
      },
    },
  });

  if (!resource) throw createError('Tài nguyên kỹ thuật số không tồn tại', 404);

  // Đồng bộ slot với số phiên thực tế (tránh báo đầy oan)
  const activeCount = await prisma.digitalAccessLog.count({
    where: { digitalResourceId: resourceId, endedAt: null },
  });
  if (activeCount !== resource.currentUsers) {
    await prisma.digitalResource.update({
      where: { id: resourceId },
      data: { currentUsers: activeCount },
    });
    resource.currentUsers = activeCount;
  }

  if (resource.currentUsers >= resource.maxConcurrentUsers) {
    throw createError(
      'Tất cả các bản sao kỹ thuật số hiện đang được sử dụng. Vui lòng thử lại sau',
      429
    );
  }

  // Tự kết thúc phiên cũ của cùng user trước khi mở phiên mới
  await endAllUserDigitalSessions(userId);

  // Increment concurrent user count
  await prisma.digitalResource.update({
    where: { id: resourceId },
    data: { currentUsers: { increment: 1 } },
  });

  // Log access
  const accessLog = await prisma.digitalAccessLog.create({
    data: { digitalResourceId: resourceId, userId },
  });

  const accessCount = await prisma.digitalAccessLog.count({
    where: { digitalResourceId: resourceId },
  });

  const content = resolveContentForResource(
    resource.book.title,
    resource.resourceType as 'PDF' | 'EPUB' | 'AUDIOBOOK' | 'VIDEO',
  );

  return {
    accessLogId: accessLog.id,
    contentMode: content.mode,
    embedUrl: content.embedUrl || null,
    streamUrl: content.streamUrl || null,
    contentLabel: content.label || null,
    viewUrl: `/books/digital/view/${resourceId}`,
    resourceType: resource.resourceType,
    bookTitle: resource.book.title,
    bookId: resource.book.id,
    resourceId,
    coverImageUrl: resource.book.coverImageUrl,
    authorNames: resource.book.authorNames,
    description: resource.book.description,
    publisher: resource.book.publisher,
    publishYear: resource.book.publishYear,
    accessCount,
    maxConcurrentUsers: resource.maxConcurrentUsers,
  };
};

// ─── UC-EXP-02: Render e-book HTML (PDF/EPUB) ────────────────
export const renderDigitalView = async (resourceId: string, userId: string) => {
  const activeLog = await prisma.digitalAccessLog.findFirst({
    where: { userId, digitalResourceId: resourceId, endedAt: null },
    orderBy: { accessedAt: 'desc' },
  });

  if (!activeLog) {
    throw createError('Bạn cần bắt đầu phiên truy cập trước khi xem tài liệu', 403);
  }

  const resource = await prisma.digitalResource.findUnique({
    where: { id: resourceId },
    include: {
      book: {
        select: {
          title: true,
          authorNames: true,
          description: true,
          publisher: true,
          publishYear: true,
          isbn: true,
          coverImageUrl: true,
        },
      },
    },
  });

  if (!resource) throw createError('Tài nguyên kỹ thuật số không tồn tại', 404);

  const book = resource.book;

  if (resource.resourceType === 'PDF' || resource.resourceType === 'EPUB') {
    return buildEbookHtml({
      title: book.title,
      authorNames: book.authorNames,
      description: book.description,
      publisher: book.publisher,
      publishYear: book.publishYear,
      isbn: book.isbn,
      coverImageUrl: book.coverImageUrl,
      resourceType: resource.resourceType,
    });
  }

  if (resource.resourceType === 'AUDIOBOOK') {
    return buildAudiobookHtml({
      title: book.title,
      authorNames: book.authorNames,
      description: book.description,
    });
  }

  throw createError('Loại tài liệu này không hỗ trợ xem qua trình duyệt HTML', 400);
};

// ─── UC-EXP-02: End Digital Session ─────────────────────────
const finalizeDigitalSession = async (log: {
  id: string;
  accessedAt: Date;
  digitalResourceId: string;
  digitalResource: { currentUsers: number; book: { title: string }; resourceType: string };
}) => {
  const endedAt = new Date();
  const durationSeconds = Math.floor((endedAt.getTime() - log.accessedAt.getTime()) / 1000);

  await prisma.digitalAccessLog.update({
    where: { id: log.id },
    data: { endedAt, durationSeconds },
  });

  const nextUsers = Math.max(0, log.digitalResource.currentUsers - 1);
  await prisma.digitalResource.update({
    where: { id: log.digitalResourceId },
    data: { currentUsers: nextUsers },
  });

  return {
    message: 'Phiên đọc đã kết thúc',
    durationSeconds,
    bookTitle: log.digitalResource.book.title,
    resourceType: log.digitalResource.resourceType,
  };
};

export const endDigitalSession = async (accessLogId: string, userId?: string) => {
  const log = await prisma.digitalAccessLog.findUnique({
    where: { id: accessLogId },
    include: {
      digitalResource: {
        include: { book: { select: { title: true } } },
      },
    },
  });

  if (!log) {
    return { message: 'Phiên đọc không tồn tại', durationSeconds: 0, bookTitle: undefined };
  }

  if (userId && log.userId !== userId) {
    throw createError('Không có quyền kết thúc phiên này', 403);
  }

  if (log.endedAt) {
    return {
      message: 'Phiên đọc đã kết thúc',
      durationSeconds: log.durationSeconds ?? 0,
      bookTitle: log.digitalResource.book.title,
      resourceType: log.digitalResource.resourceType,
    };
  }

  return finalizeDigitalSession(log);
};

/** Kết thúc mọi phiên đang mở của user — tránh chồng phiên / tắc nghẽn slot */
export const endAllUserDigitalSessions = async (userId: string) => {
  const activeLogs = await prisma.digitalAccessLog.findMany({
    where: { userId, endedAt: null },
    include: {
      digitalResource: {
        include: { book: { select: { title: true } } },
      },
    },
  });

  for (const log of activeLogs) {
    await finalizeDigitalSession(log);
  }

  return { endedCount: activeLogs.length };
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
