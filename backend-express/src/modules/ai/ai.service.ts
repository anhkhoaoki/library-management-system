import aiServiceClient from '../../config/ai-service';
import { createError } from '../../middlewares/error.middleware';
import prisma from '../../config/database';

// ─── UC-CAT-03: Auto-Catalog by ISBN ─────────────────────────
// Node.js calls the Python FastAPI /catalog/isbn/{isbn} endpoint
export const getBookInfoByIsbn = async (isbn: string) => {
  try {
    const response = await aiServiceClient.get(`/catalog/isbn/${isbn}`);
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number } };
    if (axiosError.response?.status === 404) {
      throw createError(
        'Không tìm thấy dữ liệu tự động cho mã ISBN này. Vui lòng nhập thủ công',
        404
      );
    }
    throw createError(
      'Dịch vụ AI đang không khả dụng. Vui lòng thử lại sau',
      503
    );
  }
};

// ─── UC-CAT-04: AI Book Summarization ────────────────────────
// Node.js calls the Python FastAPI /catalog/summarize endpoint
export const generateBookSummary = async (data: {
  title: string;
  authorNames: string[];
  category?: string;
  existingDescription?: string;
}) => {
  try {
    const response = await aiServiceClient.post('/catalog/summarize', data);
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number } };
    if (axiosError.response?.status === 422) {
      throw createError(
        'Thông tin đầu vào không đủ để AI tạo tóm tắt. Vui lòng bổ sung tên tác giả',
        422
      );
    }
    throw createError('Dịch vụ AI đang không khả dụng. Vui lòng thử lại sau', 503);
  }
};

// ─── UC-AI-01: Natural Language Search ───────────────────────
export const naturalLanguageSearch = async (query: string, userId?: string) => {
  try {
    const response = await aiServiceClient.post('/search/semantic', {
      query,
      userId,
      limit: 20,
    });
    
    // Đảm bảo trả về đúng định dạng mà Frontend mong đợi ở response.data.data
    return {
      data: response.data.results || [], 
      pagination: { total: response.data.results?.length || 0, page: 1, limit: 12, totalPages: 1 }
    };
  } catch {
    console.warn('[AI Search] Falling back to basic keyword search');
    const results = await prisma.book.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { authorNames: { hasSome: [query] } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });

    return {
      data: results,
      isFallback: true,
      message: 'Tính năng tìm kiếm thông minh đang bảo trì. Đang dùng tìm kiếm cơ bản.',
    };
  }
};
// ─── UC-AI-02: Chatbot ───────────────────────────────────────
export const chatWithBot = async (userId: string, message: string) => {
  // Fetch recent chat history for context
  const history = await prisma.chatHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Fetch user-specific context data for personalized queries
  const userContext = await prisma.borrowRecord.findMany({
    where: { userId, status: 'ACTIVE' },
    select: {
      dueDate: true,
      physicalCopy: {
        select: { book: { select: { title: true } } },
      },
    },
    take: 5,
  });

  try {
    const response = await aiServiceClient.post('/chat/message', {
      userId,
      message,
      chatHistory: history.reverse(),
      userContext: {
        activeBorrows: userContext.map((r) => ({
          title: r.physicalCopy.book.title,
          dueDate: r.dueDate,
        })),
      },
    });

    // Save conversation
    await prisma.chatHistory.create({
      data: { userId, role: 'user', content: message },
    });
    await prisma.chatHistory.create({
      data: { userId, role: 'assistant', content: response.data.reply },
    });

    return response.data;
  } catch {
    return {
      reply:
        'Xin lỗi, tôi chỉ là trợ lý ảo hỗ trợ các nghiệp vụ thư viện. Vui lòng liên hệ thủ thư qua số hotline để được giải đáp cụ thể.',
    };
  }
};

// ─── UC-AI-03: Personalized Recommendations ──────────────────
export const getRecommendations = async (userId: string) => {
  // Collect user signals
  const [borrowHistory, reviews] = await Promise.all([
    prisma.borrowRecord.findMany({
      where: { userId },
      orderBy: { borrowedAt: 'desc' },
      take: 20,
      select: {
        physicalCopy: {
          select: {
            book: { select: { id: true, categoryId: true, authorNames: true } },
          },
        },
      },
    }),
    prisma.review.findMany({
      where: { userId },
      select: { bookId: true, rating: true },
    }),
  ]);

  // Cold start: return popular books if no history
  if (borrowHistory.length === 0) {
    const popularBooks = await prisma.book.findMany({
      where: { status: 'ACTIVE', availableCopies: { gt: 0 } },
      orderBy: [{ reviewCount: 'desc' }, { averageRating: 'desc' }],
      take: 10,
      select: {
        id: true,
        title: true,
        authorNames: true,
        coverImageUrl: true,
        averageRating: true,
        availableCopies: true,
      },
    });

    return {
      recommendations: popularBooks,
      reason: 'popular',
      message: 'Các tài liệu phổ biến nhất tại thư viện',
    };
  }

  try {
    const borrowedBookIds = borrowHistory.map(
      (r) => r.physicalCopy.book.id
    );

    const response = await aiServiceClient.post('/recommend/personalized', {
      userId,
      borrowedBookIds,
      ratings: reviews,
    });

    return response.data;
  } catch {
    // Fallback: content-based recommendation using same category
    const topCategory = borrowHistory[0]?.physicalCopy.book.categoryId;
    const fallback = await prisma.book.findMany({
      where: {
        status: 'ACTIVE',
        categoryId: topCategory ?? undefined,
        id: {
          notIn: borrowHistory.map((r) => r.physicalCopy.book.id),
        },
      },
      orderBy: { averageRating: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        authorNames: true,
        coverImageUrl: true,
        averageRating: true,
      },
    });

    return {
      recommendations: fallback,
      reason: 'category_based',
      message: 'Dựa trên thể loại bạn thường đọc',
    };
  }
};
