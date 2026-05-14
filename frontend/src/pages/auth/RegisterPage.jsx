import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Họ tên không được để trống';
    else if (formData.fullName.length < 2) newErrors.fullName = 'Họ tên phải có ít nhất 2 ký tự';
    
    if (!formData.email) newErrors.email = 'Email không được để trống';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email không hợp lệ';
    
    if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại phải có 10-11 chữ số';
    }
    
    if (!formData.password) newErrors.password = 'Mật khẩu không được để trống';
    else if (formData.password.length < 8) newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu nhập lại không khớp';
    }
    
    if (!formData.terms) {
      newErrors.terms = 'Bạn phải đồng ý với điều khoản';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error for field being edited
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setError('');
    
    const result = await register(
      formData.fullName,
      formData.email,
      formData.password,
      formData.phone
    );
    
    if (result.success) {
      navigate('/verify-otp', { state: { email: formData.email, type: 'REGISTER' } });
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex bg-surface min-h-screen font-body-md w-full">
      {/* Left Side: Visual Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface-container-low overflow-hidden flex-col justify-between p-12">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            alt="Library background"
            className="w-full h-full object-cover opacity-80"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_jRIZ3Fa4yIzRsdchFGx6D3Ne2vftcpEogpl44idT6zL6_H6dNKfAIOB6hHm-K2ItzOb7IReovdObGE677XOlvT7UO7zgZfsVumi3qQUvVNqizwonGbufuHe6v5zLqAKRJ7qWRRGLHHn6hJAsbKBbrPe_QzlPsvwkaOMUDN88bl6OK1tuG0vrIYQXMblsubUaO3sf5-eP08_ipVJ8pmPKbqhoArQ1yGtHLiKYApQ9PsV6cN1cHqebBO6TNqUunaHrdF7xoZW-R5E_"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/10 mix-blend-multiply"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <span className="material-symbols-outlined text-4xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            <span className="font-headline-md text-headline-md text-white tracking-tight">Intellectual Heritage</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-white max-w-lg mb-6 drop-shadow-md">
            Khám phá tri thức không giới hạn.
          </h1>
          <p className="font-body-lg text-body-lg text-white/90 max-w-md drop-shadow">
            Hệ thống thư viện thông minh tích hợp AI giúp bạn dễ dàng tìm kiếm, quản lý và mở rộng nguồn tài nguyên học thuật.
          </p>
        </div>

        <div className="relative z-10 flex gap-4">
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white font-label-md text-label-md flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified</span> Hơn 1M+ tài liệu
          </div>
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white font-label-md text-label-md flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">psychology</span> AI Hỗ trợ
          </div>
        </div>
      </div>

      {/* Right Side: Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile Header Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            <span className="font-headline-md text-headline-md text-primary font-bold">Intellectual Heritage</span>
          </div>

          <div className="mb-8">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Tham gia Cộng đồng Trí tuệ</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Tạo tài khoản để bắt đầu trải nghiệm hệ thống quản lý thư viện thông minh.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-error-container text-on-error-container rounded-lg text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block font-label-md text-label-md text-on-surface-variant mb-1">
                Họ tên
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className={`material-symbols-outlined ${errors.fullName ? 'text-error' : 'text-outline'}`}>person</span>
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className={`w-full pl-10 pr-4 py-2.5 bg-surface-container-low border rounded-lg font-body-md text-body-md text-on-surface focus:bg-surface focus:ring-1 transition-all placeholder:text-outline-variant outline-none ${
                    errors.fullName ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary'
                  }`}
                />
              </div>
              {errors.fullName && <p className="mt-1 text-xs text-error font-label-sm">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block font-label-md text-label-md text-on-surface-variant mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className={`material-symbols-outlined ${errors.email ? 'text-error' : 'text-outline'}`}>mail</span>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@university.edu.vn"
                  className={`w-full pl-10 pr-4 py-2.5 bg-surface-container-low border rounded-lg font-body-md text-body-md text-on-surface focus:bg-surface focus:ring-1 transition-all placeholder:text-outline-variant outline-none ${
                    errors.email ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary'
                  }`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-error font-label-sm">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block font-label-md text-label-md text-on-surface-variant mb-1">
                Số điện thoại
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className={`material-symbols-outlined ${errors.phone ? 'text-error' : 'text-outline'}`}>call</span>
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="090 123 4567"
                  className={`w-full pl-10 pr-4 py-2.5 bg-surface-container-low border rounded-lg font-body-md text-body-md text-on-surface focus:bg-surface focus:ring-1 transition-all placeholder:text-outline-variant outline-none ${
                    errors.phone ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary'
                  }`}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-error font-label-sm">{errors.phone}</p>}
            </div>

            {/* Password Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Password */}
              <div>
                <label htmlFor="password" className="block font-label-md text-label-md text-on-surface-variant mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className={`material-symbols-outlined ${errors.password ? 'text-error' : 'text-outline'}`}>lock</span>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-4 py-2.5 bg-surface-container-low border rounded-lg font-body-md text-body-md text-on-surface focus:bg-surface focus:ring-1 transition-all placeholder:text-outline-variant outline-none ${
                      errors.password ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary'
                    }`}
                  />
                </div>
                {errors.password && <p className="mt-1 text-xs text-error font-label-sm">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block font-label-md text-label-md text-on-surface-variant mb-1">
                  Nhập lại mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className={`material-symbols-outlined ${errors.confirmPassword ? 'text-error' : 'text-outline'}`}>lock_reset</span>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-4 py-2.5 bg-surface-container-low border rounded-lg font-body-md text-body-md text-on-surface focus:bg-surface focus:ring-1 transition-all placeholder:text-outline-variant outline-none ${
                      errors.confirmPassword ? 'border-error focus:border-error focus:ring-error/20' : 'border-outline-variant focus:border-secondary focus:ring-secondary'
                    }`}
                  />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-error font-label-sm">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={formData.terms}
                    onChange={handleChange}
                    className={`w-4 h-4 rounded focus:ring-offset-surface bg-surface-container-low transition-colors ${
                      errors.terms ? 'border-error text-error focus:ring-error' : 'border-outline-variant text-primary focus:ring-primary'
                    }`}
                  />
                </div>
                <div className="text-sm">
                  <label htmlFor="terms" className="font-body-md text-body-md text-on-surface-variant">
                    Tôi đồng ý với các{' '}
                    <a href="#" className="text-primary hover:text-primary-container font-medium underline">
                      điều khoản dịch vụ
                    </a>
                    {' '}và{' '}
                    <a href="#" className="text-primary hover:text-primary-container font-medium underline">
                      chính sách bảo mật
                    </a>
                    {' '}của hệ thống.
                  </label>
                </div>
              </div>
              {errors.terms && <p className="text-xs text-error font-label-sm ml-8">{errors.terms}</p>}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary text-white font-label-md text-label-md font-bold rounded-lg hover:bg-primary-container hover:shadow-md active:scale-[0.98] disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                <span>{loading ? 'Đang đăng ký...' : 'Đăng ký'}</span>
                {!loading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Đã có tài khoản?{' '}
              <Link to="/login" className="font-bold text-primary hover:text-primary-container hover:underline transition-colors">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
