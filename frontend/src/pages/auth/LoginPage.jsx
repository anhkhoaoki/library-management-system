import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email không được để trống';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email không hợp lệ';
    
    if (!password) newErrors.password = 'Mật khẩu không được để trống';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setError('');
    
    const result = await login(email, password);
    
    if (result.success) {
      const role = result.user.role;
      if (role === 'ADMIN') navigate('/dashboard/admin');
      else if (role === 'LIBRARIAN') navigate('/dashboard/librarian');
      else navigate('/dashboard/student');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex bg-background text-on-background min-h-screen font-body-md w-full">
      {/* Left Side: Conceptual Image (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary-fixed-dim">
        <div className="absolute inset-0 bg-black/20 z-10"></div>
        <img
          alt="Modern library interior"
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuALSM_z-pCiODGiAgU_Hr1xfEOF46juwVyCcQbj7io-ZtMKqh0CQ0EZoKfRzXo972grdD0v3KU4M_DaKK6KzYGJ2YrQzLpmPWJa16bLnN9SbE0Nd2-_MVR0TeYmGdSSbTGfRrBVG0xXCSlBbxPDd5YPjw6ee5Oslzy64GTOH9osDmtn447OXRKBC9oUofoAO_nS-ibY7HBzKXg93hrShb06Qp52mR61UmTB-0JaL0VcaMT3pK3OEoVCgwoWBbhfFoEsYoEaczaSyamh"
        />
        {/* Overlay Content */}
        <div className="relative z-20 flex flex-col justify-end p-margin-desktop h-full w-full text-white">
          <div className="mb-stack-lg max-w-xl">
            <h1 className="font-display-lg text-display-lg mb-stack-md drop-shadow-md">
              Khám phá tri thức vô tận.
            </h1>
            <p className="font-body-lg text-body-lg opacity-90 drop-shadow">
              Hệ thống quản lý thư viện thông minh được tăng cường bởi AI, giúp bạn tìm kiếm, nghiên cứu và quản lý tài nguyên một cách tối ưu.
            </p>
          </div>
          {/* AI Indicator Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 w-fit">
            <span className="material-symbols-outlined text-secondary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
            <span className="font-label-md text-label-md text-white">Được hỗ trợ bởi AI Engine 2.0</span>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-margin-mobile md:p-margin-desktop relative overflow-hidden">
        {/* Subtle Ambient AI Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none z-0 bg-[radial-gradient(circle_at_center,_rgba(13,148,136,0.15)_0%,_transparent_70%)] animate-[subtle-pulse_8s_infinite_ease-in-out]"></div>
        
        <div className="w-full max-w-[440px] relative z-10 bg-surface-container-lowest p-stack-lg rounded-xl shadow-sm border border-outline-variant/30">
          {/* Brand / Header */}
          <div className="flex flex-col items-center mb-stack-lg text-center">
            <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-lg flex items-center justify-center mb-stack-sm shadow-sm">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_library
              </span>
            </div>
            <div className="font-headline-md text-headline-md font-bold text-primary mb-1">
              Intellectual Heritage
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">Hệ thống thư viện thông minh</p>
          </div>

          <div className="mb-stack-lg">
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">
              Chào mừng trở lại
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Vui lòng đăng nhập để truy cập không gian làm việc của bạn.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-error-container text-on-error-container rounded-lg text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {/* Primary Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
            {/* Input Group: Email/Username */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-stack-sm" htmlFor="email">
                Email hoặc Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className={`material-symbols-outlined ${errors.email ? 'text-error' : 'text-outline'}`}>person</span>
                </div>
                <input
                  className={`w-full pl-10 pr-3 py-3 bg-surface-container-low border rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 transition-all ${
                    errors.email 
                      ? 'border-error focus:ring-error/20 focus:border-error' 
                      : 'border-outline-variant focus:ring-secondary focus:border-secondary focus:bg-surface-container-lowest'
                  }`}
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  placeholder="nhap_email@truong.edu.vn"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-error font-label-sm">{errors.email}</p>}
            </div>

            {/* Input Group: Password */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-stack-sm" htmlFor="password">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className={`material-symbols-outlined ${errors.password ? 'text-error' : 'text-outline'}`}>lock</span>
                </div>
                <input
                  className={`w-full pl-10 pr-10 py-3 bg-surface-container-low border rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 transition-all ${
                    errors.password 
                      ? 'border-error focus:ring-error/20 focus:border-error' 
                      : 'border-outline-variant focus:ring-secondary focus:border-secondary focus:bg-surface-container-lowest'
                  }`}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  placeholder="••••••••"
                />
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface focus:outline-none"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-error font-label-sm">{errors.password}</p>}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center">
                <input
                  className="h-4 w-4 text-primary focus:ring-primary border-outline-variant rounded rounded-sm bg-surface-container-lowest"
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="ml-2 block font-label-md text-label-md text-on-surface-variant cursor-pointer" htmlFor="remember-me">
                  Ghi nhớ đăng nhập
                </label>
              </div>
              <div className="text-sm">
                <a className="font-label-md text-label-md text-primary hover:text-on-primary-fixed-variant hover:underline transition-all" href="#">
                  Quên mật khẩu?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <button
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm font-title-lg text-title-lg text-on-primary bg-primary hover:bg-on-primary-fixed-variant focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all mt-stack-sm"
              type="submit"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              {!loading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-stack-lg relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface-container-lowest font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Người dùng mới
              </span>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-stack-lg text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-label-md text-label-md font-semibold text-primary hover:text-on-primary-fixed-variant hover:underline transition-all">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Footer links for policy */}
        <div className="absolute bottom-margin-mobile md:bottom-margin-desktop left-0 w-full text-center">
          <div className="flex justify-center gap-4 font-label-sm text-label-sm text-outline">
            <a className="hover:text-on-surface transition-colors" href="#">Bảo mật</a>
            <a className="hover:text-on-surface transition-colors" href="#">Điều khoản</a>
            <a className="hover:text-on-surface transition-colors" href="#">Trợ giúp</a>
          </div>
        </div>
      </div>
    </div>
  );
}
