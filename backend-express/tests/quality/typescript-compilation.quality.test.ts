import { execSync } from 'child_process';
import path from 'path';

describe('TypeScript Compilation Quality Tests (Kiểm thử Độ tin cậy Kiểu dữ liệu & Biên dịch tĩnh)', () => {
  it('toàn bộ mã nguồn TypeScript của backend phải biên dịch thành công 100% không có lỗi (0 type errors)', () => {
    const projectRoot = path.resolve(__dirname, '../..');

    try {
      // Thực thi lệnh tsc --noEmit để kiểm tra toàn bộ project
      const output = execSync('npx tsc --noEmit', {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // Nếu không có lỗi, output trả về rỗng và exit code là 0
      expect(output).toBe('');
    } catch (error: any) {
      // Nếu có lỗi biên dịch, in thông tin lỗi rõ ràng ra test output
      const stdout = error.stdout || '';
      const stderr = error.stderr || '';
      const failureMessage = `TypeScript compilation failed:\n${stdout}\n${stderr}`;
      expect(failureMessage).toBe('');
    }
  });
});
