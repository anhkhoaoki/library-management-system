import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // State mới cho xác nhận mật khẩu
  const [showForgotNewPass, setShowForgotNewPass] = useState(false); // Ẩn/hiện pass mới
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false); // Ẩn/hiện confirm pass
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

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

  // BƯỚC 1: Gửi yêu cầu OTP đến Email
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Vui lòng nhập email');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess('Mã OTP đã được gửi đến email của bạn.');
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Lỗi gửi yêu cầu');
    } finally {
      setForgotLoading(false);
    }
  };

  // BƯỚC 2: Xác thực mã OTP tạm thời ở giao diện
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setForgotError('Vui lòng nhập đầy đủ mã OTP 6 số');
      return;
    }
    setForgotError('');
    setForgotSuccess('Mã OTP hợp lệ. Vui lòng thiết lập mật khẩu mới.');
    setForgotStep(3);
  };

  // BƯỚC 3: Kiểm tra khớp mật khẩu & gọi API lưu thay đổi
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setForgotError('Vui lòng nhập đầy đủ thông tin mật khẩu');
      return;
    }

    // Logic kiểm tra mật khẩu nhập lại có khớp không
    if (newPassword !== confirmPassword) {
      setForgotError('Mật khẩu xác nhận không trùng khớp!');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    try {
      await api.post('/auth/reset-password', { 
        email: forgotEmail, 
        token: otpCode, 
        newPassword 
      });
      alert('Đổi mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.');
      setShowForgotModal(false);
      
      // Reset sạch state về ban đầu
      setForgotStep(1);
      setForgotEmail('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex bg-background text-on-background min-h-screen font-body-md w-full">
      {/* Left Side: Conceptual Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary-fixed-dim">
        <div className="absolute inset-0 bg-black/20 z-10"></div>
        <img
          alt="Modern library interior"
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=1920"
        />
        <div className="relative z-20 flex flex-col justify-end p-margin-desktop h-full w-full text-white">
          <div className="mb-stack-lg max-w-xl">
            <h1 className="font-display-lg text-display-lg mb-stack-md drop-shadow-md">
              Khám phá tri thức vô tận.
            </h1>
            <p className="font-body-lg text-body-lg opacity-90 drop-shadow">
              Hệ thống quản lý thư viện hiện đại, giúp bạn tìm kiếm, nghiên cứu và quản lý tài nguyên một cách tối ưu.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 w-fit">
            <span className="material-symbols-outlined text-secondary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>
              menu_book
            </span>
            <span className="font-label-md text-label-md text-white">BkLib – Thư viện trực tuyến</span>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-margin-mobile md:p-margin-desktop relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none z-0 bg-[radial-gradient(circle_at_center,_rgba(13,148,136,0.15)_0%,_transparent_70%)] animate-[subtle-pulse_8s_infinite_ease-in-out]"></div>
        
        <div className="w-full max-w-[440px] relative z-10 bg-surface-container-lowest p-stack-lg rounded-xl shadow-sm border border-outline-variant/30">
          <div className="flex flex-col items-center mb-stack-lg text-center">
            <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-lg flex items-center justify-center mb-stack-sm shadow-sm">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_library
              </span>
            </div>
            <div className="font-headline-md text-headline-md font-bold text-primary mb-1">
              BkLib
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">Hệ thống thư viện trực tuyến</p>
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
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
                <button 
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotStep(1);
                    setForgotError('');
                    setForgotSuccess('');
                    setForgotEmail(email);
                  }}
                  className="font-label-md text-label-md text-primary hover:text-on-primary-fixed-variant hover:underline transition-all"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm font-title-lg text-title-lg text-on-primary bg-primary hover:bg-on-primary-fixed-variant focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all mt-stack-sm"
              type="submit"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              {!loading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
            </button>
          </form>

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

          <div className="mt-stack-lg text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-label-md text-label-md font-semibold text-primary hover:text-on-primary-fixed-variant hover:underline transition-all">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        <div className="absolute bottom-margin-mobile md:bottom-margin-desktop left-0 w-full text-center">
          <div className="flex justify-center gap-4 font-label-sm text-label-sm text-outline">
            <a className="hover:text-on-surface transition-colors" href="#">Bảo mật</a>
            <a className="hover:text-on-surface transition-colors" href="#">Điều khoản</a>
            <a className="hover:text-on-surface transition-colors" href="#">Trợ giúp</a>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal (Đã tích hợp Xác nhận mật khẩu tại Bước 3) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-stack-md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
              <h3 className="font-title-lg text-on-surface">
                Quên mật khẩu {forgotStep > 1 && `(Bước ${forgotStep}/3)`}
              </h3>
              <button onClick={() => setShowForgotModal(false)} className="text-on-surface-variant hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-stack-md">
              {forgotError && (
                <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {forgotError}
                </div>
              )}
              {forgotSuccess && (
                <div className="mb-4 p-3 bg-success-container text-on-success-container rounded-lg text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {forgotSuccess}
                </div>
              )}
              
              {/* BƯỚC 1: NHẬP EMAIL */}
              {forgotStep === 1 && (
                <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                  <p className="text-sm text-on-surface-variant mb-2">Nhập địa chỉ email của bạn, hệ thống sẽ gửi mã xác thực gồm 6 chữ số.</p>
                  <div>
                    <label className="block font-label-sm text-on-surface mb-1">Email đã đăng ký</label>
                    <input
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="email@truong.edu.vn"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => setShowForgotModal(false)} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low font-bold">Hủy</button>
                    <button type="submit" disabled={forgotLoading} className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                      {forgotLoading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                      Gửi mã OTP
                    </button>
                  </div>
                </form>
              )}

              {/* BƯỚC 2: NHẬP OTP XÁC THỰC */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                  <p className="text-sm text-on-surface-variant mb-2">Vui lòng kiểm tra email và nhập mã xác thực OTP gửi tới <strong>{forgotEmail}</strong>.</p>
                  <div>
                    <label className="block font-label-sm text-on-surface mb-1">Mã xác thực (OTP)</label>
                    <input
                      className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:outline-none tracking-widest text-center text-lg font-bold"
                      type="text"
                      required
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      placeholder="123456"
                      maxLength="6"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => { setForgotStep(1); setForgotError(''); setForgotSuccess(''); }} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low font-bold">Quay lại</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90">
                      Xác thực mã OTP
                    </button>
                  </div>
                </form>
              )}

              {/* BƯỚC 3: NHẬP MẬT KHẨU MỚI & XÁC NHẬN MẬT KHẨU */}
              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                  <p className="text-sm text-on-surface-variant mb-2">Mã xác thực chính xác! Vui lòng thiết lập mật khẩu mới (nhập 2 lần).</p>
                  
                  {/* Ô nhập mật khẩu mới */}
                  <div>
                    <label className="block font-label-sm text-on-surface mb-1">Mật khẩu mới</label>
                    <div className="relative">
                      <input
                        className="w-full pl-3 pr-10 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                        type={showForgotNewPass ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự"
                        minLength="8"
                      />
                      <button
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface focus:outline-none"
                        type="button"
                        onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showForgotNewPass ? 'visibility' : 'visibility_off'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Ô xác nhận mật khẩu mới */}
                  <div>
                    <label className="block font-label-sm text-on-surface mb-1">Xác nhận mật khẩu mới</label>
                    <div className="relative">
                      <input
                        className="w-full pl-3 pr-10 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                        type={showForgotConfirmPass ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu giống ô trên"
                        minLength="6"
                      />
                      <button
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface focus:outline-none"
                        type="button"
                        onClick={() => setShowForgotConfirmPass(!showForgotConfirmPass)}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showForgotConfirmPass ? 'visibility' : 'visibility_off'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => { setForgotStep(2); setForgotError(''); setForgotSuccess(''); }} className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low font-bold">Quay lại</button>
                    <button type="submit" disabled={forgotLoading} className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                      {forgotLoading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                      Xác nhận đổi mật khẩu
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}