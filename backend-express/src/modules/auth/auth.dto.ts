import Joi from 'joi';

export const registerDto = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
    'any.required': 'Mật khẩu là bắt buộc',
  }),
  fullName: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[0-9]{10,11}$/).optional(),
});

export const loginDto = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const verifyOtpDto = Joi.object({
  email: Joi.string().email().required(),
  token: Joi.string().required(),
  type: Joi.string().valid('REGISTER', 'RESET_PASSWORD', 'MFA').required(),
});

export const forgotPasswordDto = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordDto = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

export const refreshTokenDto = Joi.object({
  refreshToken: Joi.string().required(),
});
