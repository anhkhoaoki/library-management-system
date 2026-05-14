import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp } = useAuth();
  
  const email = location.state?.email;
  const type = location.state?.type || 'REGISTER';

  if (!email) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await verifyOtp(email, otp, type);
    if (result.success) {
      alert('Xác thực thành công! Bạn có thể đăng nhập ngay bây giờ.');
      navigate('/login');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex bg-surface min-h-screen font-body-md w-full items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest p-stack-lg rounded-xl shadow-sm border border-outline-variant/30 text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Xác thực tài khoản</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Mã OTP đã được gửi đến email <strong>{email}</strong>. Vui lòng kiểm tra và nhập mã vào bên dưới.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Nhập mã OTP"
              className="w-full text-center text-3xl tracking-[1em] py-4 bg-surface-container-low border border-outline-variant rounded-lg font-bold text-primary focus:bg-surface focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
              maxLength={6}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full py-3 px-4 bg-primary text-white font-label-md text-label-md font-bold rounded-lg hover:bg-primary-container disabled:opacity-50 transition-all flex justify-center items-center gap-2"
          >
            {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
            <span className="material-symbols-outlined text-[18px]">verified</span>
          </button>
        </form>

        <div className="mt-8">
          <button className="text-primary hover:underline font-medium text-sm">
            Gửi lại mã OTP (sau 60s)
          </button>
        </div>
      </div>
    </div>
  );
}
