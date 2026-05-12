import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Library Management System API',
      version: '1.0.0',
      description:
        'API tài liệu cho hệ thống quản lý thư viện tích hợp AI. Sử dụng nút **Authorize** để nhập JWT token trước khi gọi các endpoint yêu cầu xác thực.',
      contact: {
        name: 'DATN - Library System',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập JWT access token. Lấy token từ POST /api/v1/auth/login',
        },
      },
      schemas: {
        // ─── Common ──────────────────────────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Thành công' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Lỗi xảy ra' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 10 },
          },
        },

        // ─── Auth ────────────────────────────────────────────────
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'fullName'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 6, example: 'password123' },
            fullName: { type: 'string', example: 'Nguyễn Văn A' },
            phone: { type: 'string', example: '0901234567' },
          },
        },
        VerifyOtpRequest: {
          type: 'object',
          required: ['email', 'otp'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            otp: { type: 'string', example: '123456' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@library.com' },
            password: { type: 'string', example: 'password123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                user: { $ref: '#/components/schemas/UserProfile' },
              },
            },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: { type: 'string' },
            newPassword: { type: 'string', minLength: 6, example: 'newPassword123' },
          },
        },

        // ─── Users ───────────────────────────────────────────────
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['READER', 'LIBRARIAN', 'ADMIN'] },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            fullName: { type: 'string', example: 'Nguyễn Văn B' },
            phone: { type: 'string', example: '0901234567' },
            address: { type: 'string', example: 'Hà Nội' },
          },
        },

        // ─── Books ───────────────────────────────────────────────
        Book: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string', example: 'Lập trình TypeScript' },
            author: { type: 'string', example: 'Tác giả A' },
            isbn: { type: 'string', example: '978-3-16-148410-0' },
            category: { type: 'string', example: 'Công nghệ' },
            publisher: { type: 'string', example: 'NXB Giáo Dục' },
            publishedYear: { type: 'integer', example: 2023 },
            description: { type: 'string' },
            coverImage: { type: 'string', format: 'uri' },
            availableCopies: { type: 'integer', example: 3 },
            totalCopies: { type: 'integer', example: 5 },
          },
        },
        CreateBookRequest: {
          type: 'object',
          required: ['title', 'author'],
          properties: {
            title: { type: 'string', example: 'Lập trình TypeScript' },
            author: { type: 'string', example: 'Tác giả A' },
            isbn: { type: 'string', example: '978-3-16-148410-0' },
            categoryId: { type: 'string' },
            publisher: { type: 'string' },
            publishedYear: { type: 'integer', example: 2023 },
            description: { type: 'string' },
            totalCopies: { type: 'integer', example: 5 },
          },
        },
        ReviewRequest: {
          type: 'object',
          required: ['rating'],
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 4 },
            comment: { type: 'string', example: 'Sách hay, đọc rất thú vị' },
          },
        },

        // ─── Circulation ─────────────────────────────────────────
        BorrowRequest: {
          type: 'object',
          required: ['userId', 'bookId'],
          properties: {
            userId: { type: 'string', example: 'user-uuid-here' },
            bookId: { type: 'string', example: 'book-uuid-here' },
            branchId: { type: 'string', example: 'branch-uuid-here' },
            dueDate: { type: 'string', format: 'date', example: '2025-06-01' },
          },
        },
        ReturnRequest: {
          type: 'object',
          required: ['borrowRecordId'],
          properties: {
            borrowRecordId: { type: 'string', example: 'borrow-record-uuid' },
            condition: { type: 'string', enum: ['GOOD', 'DAMAGED', 'LOST'], example: 'GOOD' },
          },
        },
        ReservationRequest: {
          type: 'object',
          required: ['bookId'],
          properties: {
            bookId: { type: 'string', example: 'book-uuid-here' },
            branchId: { type: 'string', example: 'branch-uuid-here' },
          },
        },

        // ─── Notifications ───────────────────────────────────────
        NotificationSettings: {
          type: 'object',
          properties: {
            emailEnabled: { type: 'boolean', example: true },
            smsEnabled: { type: 'boolean', example: false },
            pushEnabled: { type: 'boolean', example: true },
            dueDateReminder: { type: 'boolean', example: true },
            overdueAlert: { type: 'boolean', example: true },
          },
        },
        BroadcastRequest: {
          type: 'object',
          required: ['title', 'message'],
          properties: {
            title: { type: 'string', example: 'Thông báo hệ thống' },
            message: { type: 'string', example: 'Thư viện sẽ đóng cửa ngày 01/06' },
            targetRole: { type: 'string', enum: ['READER', 'LIBRARIAN', 'ADMIN', 'ALL'], example: 'ALL' },
          },
        },

        // ─── Admin ───────────────────────────────────────────────
        Branch: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Chi nhánh Quận 1' },
            address: { type: 'string', example: '123 Nguyễn Huệ, Q.1, TP.HCM' },
            phone: { type: 'string', example: '028-1234-5678' },
            isActive: { type: 'boolean', example: true },
          },
        },
        CreateBranchRequest: {
          type: 'object',
          required: ['name', 'address'],
          properties: {
            name: { type: 'string', example: 'Chi nhánh Quận 1' },
            address: { type: 'string', example: '123 Nguyễn Huệ, Q.1, TP.HCM' },
            phone: { type: 'string', example: '028-1234-5678' },
          },
        },

        // ─── AI ──────────────────────────────────────────────────
        NaturalLanguageSearchRequest: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', example: 'sách về lập trình python cho người mới bắt đầu' },
          },
        },
        ChatRequest: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', example: 'Tôi muốn tìm sách về trí tuệ nhân tạo' },
            sessionId: { type: 'string', example: 'session-uuid-here' },
          },
        },
        SummarizeRequest: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', example: 'Nội dung sách cần tóm tắt...' },
            language: { type: 'string', example: 'vi' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Xác thực & phân quyền người dùng' },
      { name: 'Users', description: 'Quản lý hồ sơ người dùng' },
      { name: 'Books', description: 'Quản lý sách & danh mục' },
      { name: 'Circulation', description: 'Mượn, trả, gia hạn & đặt trước sách' },
      { name: 'Notifications', description: 'Thông báo & cài đặt thông báo' },
      { name: 'Admin', description: 'Quản trị hệ thống (Admin / Librarian)' },
      { name: 'AI', description: 'Tính năng AI: tìm kiếm ngôn ngữ tự nhiên, chatbot, gợi ý sách' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
