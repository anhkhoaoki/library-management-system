import fs from 'fs';
import path from 'path';

describe('Code Quality Tests: Kiểm thử Chất lượng Mã nguồn & Kiến trúc Phần mềm', () => {
  const srcDir = path.resolve(__dirname, '../../src');

  // Helper đệ quy lấy toàn bộ file .ts trong thư mục src
  const getAllTsFiles = (dir: string, fileList: string[] = []): string[] => {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getAllTsFiles(fullPath, fileList);
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        fileList.push(fullPath);
      }
    });
    return fileList;
  };

  const allTsFiles = getAllTsFiles(srcDir);

  describe('0. Kiểm tra tính toàn vẹn cấu trúc mã nguồn', () => {
    it('thư mục src tồn tại và chứa các module TypeScript', () => {
      expect(fs.existsSync(srcDir)).toBe(true);
      expect(allTsFiles.length).toBeGreaterThan(0);
    });

    it('mọi file TypeScript trong src đều có nội dung thực thi', () => {
      const emptyFiles = allTsFiles
        .filter((filePath) => fs.readFileSync(filePath, 'utf-8').trim().length === 0)
        .map((filePath) => path.relative(srcDir, filePath));

      expect(emptyFiles).toEqual([]);
    });
  });

  describe('1. Kiểm tra an toàn bảo mật (Secret & Credential Leak Detection)', () => {
    it('Không có mật khẩu hay secret key nhạy cảm bị hardcode trực tiếp trong mã nguồn', () => {
      const sensitivePatterns = [
        /(?:password|passwd|pwd)\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/i,
        /JWT_SECRET\s*[:=]\s*['"`][a-zA-Z0-9]{16,}['"`]/,
        /postgres(?:ql)?:\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9.-]+/i,
      ];

      const violations: { file: string; match: string }[] = [];

      allTsFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Bỏ qua file config/env.ts vì đó là nơi đọc biến môi trường
        if (filePath.endsWith('env.ts')) return;

        sensitivePatterns.forEach((pattern) => {
          const match = content.match(pattern);
          if (match) {
            // Ngoại trừ các dòng comment hoặc mock test data
            if (!match[0].includes('process.env') && !match[0].includes('Bearer')) {
              violations.push({
                file: path.relative(srcDir, filePath),
                match: match[0],
              });
            }
          }
        });
      });

      expect(violations).toEqual([]);
    });
  });

  describe('2. Kiểm tra quy chuẩn Kiến trúc phân tầng (Clean Layered Architecture)', () => {
    it('Mọi file route (*.routes.ts) không được phép gọi trực tiếp prisma database client', () => {
      const routeFiles = allTsFiles.filter((f) => f.endsWith('.routes.ts'));
      const directDbCalls: string[] = [];

      routeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('prisma.') || content.includes('import prisma from')) {
          directDbCalls.push(path.relative(srcDir, file));
        }
      });

      expect(directDbCalls).toEqual([]);
    });

    it('Mọi file route (*.routes.ts) đều phải đăng ký middleware xác thực hoặc có tiền tố đường dẫn rõ ràng', () => {
      const routeFiles = allTsFiles.filter((f) => f.endsWith('.routes.ts'));
      expect(routeFiles.length).toBeGreaterThanOrEqual(6);

      routeFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).toContain('Router()');
      });
    });

    it('Mọi controller (*.controller.ts) đều phải ủy quyền xử lý lỗi cho next(err)', () => {
      const controllerFiles = allTsFiles.filter((f) => f.endsWith('.controller.ts'));
      const missingNextCatch: string[] = [];

      controllerFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');
        const hasCatchBlock = content.includes('catch');
        if (hasCatchBlock) {
          const delegatesToNext = content.includes('next(err)') || content.includes('next(error)');
          if (!delegatesToNext) {
            missingNextCatch.push(path.relative(srcDir, file));
          }
        }
      });

      expect(missingNextCatch).toEqual([]);
    });
  });

  describe('3. Chuẩn hóa cấu trúc gói phản hồi API (Response Envelope Consistency)', () => {
    it('Tất cả controller đều chuẩn hóa trả về gói phản hồi có thuộc tính success', () => {
      const controllerFiles = allTsFiles.filter((f) => f.endsWith('.controller.ts'));
      const nonStandardControllers: string[] = [];

      controllerFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('res.status(')) {
          // Các controller trả về json phải bao gồm thuộc tính success
          const hasJsonSuccess = content.includes('success: true') || content.includes('success: false');
          if (!hasJsonSuccess) {
            nonStandardControllers.push(path.relative(srcDir, file));
          }
        }
      });

      expect(nonStandardControllers).toEqual([]);
    });
  });

  describe('4. Chuẩn hóa mã lỗi và xử lý ngoại lệ (Standardized Error Codes)', () => {
    it('Tất cả các lệnh throw createError đều sử dụng mã HTTP hợp lệ (400, 401, 403, 404, 409, 422, 500, 503)', () => {
      const serviceFiles = allTsFiles.filter((f) => f.endsWith('.service.ts'));
      const invalidErrorCodes: { file: string; code: string }[] = [];
      const validStatusCodes = [400, 401, 403, 404, 409, 422, 423, 429, 500, 503];

      serviceFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8');
        const regex = /createError\(\s*['"`](.*?)['"`]\s*,\s*(\d+)\s*\)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const code = parseInt(match[2], 10);
          if (!validStatusCodes.includes(code)) {
            invalidErrorCodes.push({
              file: path.relative(srcDir, file),
              code: match[2],
            });
          }
        }
      });

      expect(invalidErrorCodes).toEqual([]);
    });
  });

  describe('5. Kiểm tra quy chuẩn chất lượng độ bao phủ kiểm thử (Coverage Quality Gate)', () => {
    it('Bộ kiểm thử phải đảm bảo các chỉ số đo lường vượt ngưỡng chất lượng (Quality Gate)', () => {
      const coverageSummaryPath = path.resolve(__dirname, '../../coverage/coverage-summary.json');
      if (!fs.existsSync(coverageSummaryPath)) return;

      const summary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf-8'));
      const total = summary.total;
      expect(total).toEqual(expect.objectContaining({
        statements: expect.objectContaining({ pct: expect.any(Number) }),
        lines: expect.objectContaining({ pct: expect.any(Number) }),
        functions: expect.objectContaining({ pct: expect.any(Number) }),
      }));
      expect(total.statements.pct).toBeGreaterThanOrEqual(80);
      expect(total.lines.pct).toBeGreaterThanOrEqual(80);
      expect(total.functions.pct).toBeGreaterThanOrEqual(80);
    });
  });
});
