import {
  registerDto,
  loginDto,
  verifyOtpDto,
  forgotPasswordDto,
  resetPasswordDto,
  refreshTokenDto,
} from '../../src/modules/auth/auth.dto';

describe('Auth DTO — kiểm thử đơn vị validate đầu vào (UC-ACC)', () => {
  describe('registerDto', () => {
    const valid = {
      email: 'reader@example.com',
      password: 'password1',
      fullName: 'Nguyen Van A',
    };

    it('chấp nhận payload đăng ký hợp lệ', () => {
      const { error, value } = registerDto.validate(valid);
      expect(error).toBeUndefined();
      expect(value.email).toBe(valid.email);
    });

    it('từ chối email không hợp lệ', () => {
      const { error } = registerDto.validate({ ...valid, email: 'khong-phai-email' });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toMatch(/Email không hợp lệ/);
    });

    it('từ chối mật khẩu ngắn hơn 8 ký tự', () => {
      const { error } = registerDto.validate({ ...valid, password: '1234567' });
      expect(error).toBeDefined();
      expect(error?.details[0].message).toMatch(/ít nhất 8 ký tự/);
    });

    it('từ chối thiếu họ tên', () => {
      const { email, password } = valid;
      const { error } = registerDto.validate({ email, password });
      expect(error).toBeDefined();
    });

    it('từ chối số điện thoại không đúng định dạng', () => {
      const { error } = registerDto.validate({ ...valid, phone: 'abc' });
      expect(error).toBeDefined();
    });

    it('chấp nhận SĐT 10 số', () => {
      const { error } = registerDto.validate({ ...valid, phone: '0901234567' });
      expect(error).toBeUndefined();
    });
  });

  describe('loginDto', () => {
    it('yêu cầu email và mật khẩu', () => {
      expect(loginDto.validate({}).error).toBeDefined();
      expect(loginDto.validate({ email: 'a@b.com', password: 'x' }).error).toBeUndefined();
    });
  });

  describe('verifyOtpDto', () => {
    it('chỉ chấp nhận type REGISTER | RESET_PASSWORD | MFA', () => {
      const base = { email: 'a@b.com', token: '123456' };
      expect(verifyOtpDto.validate({ ...base, type: 'REGISTER' }).error).toBeUndefined();
      expect(verifyOtpDto.validate({ ...base, type: 'OTHER' }).error).toBeDefined();
    });
  });

  describe('forgotPasswordDto / resetPasswordDto / refreshTokenDto', () => {
    it('forgotPassword yêu cầu email hợp lệ', () => {
      expect(forgotPasswordDto.validate({ email: 'bad' }).error).toBeDefined();
      expect(forgotPasswordDto.validate({ email: 'a@b.com' }).error).toBeUndefined();
    });

    it('resetPassword yêu cầu mật khẩu mới tối thiểu 8 ký tự', () => {
      const { error } = resetPasswordDto.validate({
        email: 'a@b.com',
        token: '111111',
        newPassword: 'short',
      });
      expect(error).toBeDefined();
    });

    it('refreshToken bắt buộc chuỗi refreshToken', () => {
      expect(refreshTokenDto.validate({}).error).toBeDefined();
      expect(refreshTokenDto.validate({ refreshToken: 'tok' }).error).toBeUndefined();
    });
  });
});
