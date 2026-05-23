import React, { useState, useEffect, useContext } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

export default function ProfilePage() {
  const { user, setUser } = useContext(AuthContext);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: '',
    role: '',
    branchName: '',
  });

  // Password fields
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await api.get('/users/me');
      const data = response.data.data;
      
      // Determine branch name from branchId
      let branchName = 'Thư viện Cơ sở 1 - Lý Thường Kiệt';
      if (data.branchId === 'branch-cs-02') {
        branchName = 'Thư viện Cơ sở 2 - Dĩ An';
      }

      setProfileData({
        fullName: data.fullName || '',
        email: data.email || '',
        phone: data.phone || '',
        avatarUrl: data.avatarUrl || '',
        role: data.role || 'READER',
        branchName: branchName,
      });
    } catch (err) {
      setErrorMsg('Không thể tải thông tin hồ sơ của bạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const response = await api.patch('/users/me', {
        fullName: profileData.fullName,
        phone: profileData.phone,
        avatarUrl: profileData.avatarUrl,
      });
      const updatedUser = response.data.data;

      // Update local storage and context to keep everything in sync
      const newUserContext = { ...user, ...updatedUser };
      setUser(newUserContext);
      localStorage.setItem('user', JSON.stringify(newUserContext));

      setSuccessMsg('Cập nhật hồ sơ cá nhân thành công!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Cập nhật hồ sơ thất bại.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    setUpdatingPassword(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await api.post('/users/me/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setSuccessMsg('Đổi mật khẩu thành công!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <MainLayout role={user?.role?.toLowerCase() === 'librarian' ? 'librarian' : user?.role?.toLowerCase() === 'admin' ? 'admin' : 'student'} userName={user?.fullName} userRole={user?.role === 'LIBRARIAN' ? 'Thủ thư' : user?.role === 'ADMIN' ? 'Quản trị viên' : 'Sinh viên'}>
        <div className="flex items-center justify-center h-[400px]">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      </MainLayout>
    );
  }

  const userRoleText = profileData.role === 'LIBRARIAN' ? 'Thủ thư' : profileData.role === 'ADMIN' ? 'Quản trị viên' : 'Sinh viên';
  const userRoleCode = profileData.role.toLowerCase() === 'librarian' ? 'librarian' : profileData.role.toLowerCase() === 'admin' ? 'admin' : 'student';

  return (
    <MainLayout role={userRoleCode} userName={profileData.fullName} userRole={userRoleText}>
      <div className="flex flex-col gap-stack-lg animate-in fade-in duration-300">
        {/* Header */}
        <header className="pb-stack-sm border-b border-outline-variant">
          <h2 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-primary font-bold">Hồ sơ cá nhân & Cài đặt</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">Quản lý thông tin tài khoản và cấu hình cấu hình tùy chỉnh của bạn trên hệ thống BkLib.</p>
        </header>

        {/* Success/Error Alerts */}
        {successMsg && (
          <div className="bg-success/10 text-success p-4 rounded-xl flex items-center gap-2 border border-success/30 animate-in slide-in-from-top-4">
            <span className="material-symbols-outlined">check_circle</span>
            <span className="font-body-md font-bold">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-error/10 text-error p-4 rounded-xl flex items-center gap-2 border border-error/30 animate-in slide-in-from-top-4">
            <span className="material-symbols-outlined">error</span>
            <span className="font-body-md font-bold">{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left Column: Profile Info & Security */}
          <div className="lg:col-span-8 space-y-gutter">
            {/* Profile Card */}
            <form onSubmit={handleUpdateProfile} className="bg-white rounded-xl p-stack-lg shadow-sm border border-outline-variant transition-all hover:shadow-md">
              <h3 className="font-title-lg text-title-lg text-on-surface mb-stack-md border-b border-outline-variant pb-2 font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">badge</span>
                Thông tin cơ bản
              </h3>
              <div className="flex flex-col md:flex-row gap-gutter items-start">
                <div className="flex flex-col items-center gap-4 shrink-0">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 bg-primary-container/20 flex items-center justify-center font-bold text-4xl text-primary shadow-inner">
                    {profileData.avatarUrl ? (
                      <img
                        alt="User profile avatar"
                        className="w-full h-full object-cover"
                        src={profileData.avatarUrl}
                      />
                    ) : (
                      profileData.fullName.charAt(0)
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      const newUrl = prompt('Nhập link hình ảnh avatar của bạn:', profileData.avatarUrl);
                      if (newUrl !== null) {
                        setProfileData(prev => ({ ...prev, avatarUrl: newUrl }));
                      }
                    }}
                    className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-label-md text-label-md px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-outline-variant"
                  >
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    Cập nhật ảnh
                  </button>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-stack-md w-full">
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant font-bold">Họ và tên</label>
                    <input
                      className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3"
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant font-bold">Email đăng nhập</label>
                    <input
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md text-outline px-4 py-3 cursor-not-allowed opacity-75"
                      type="email"
                      value={profileData.email}
                      disabled
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant font-bold">Số điện thoại</label>
                    <input
                      className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant font-bold">
                      {profileData.role === 'READER' ? 'Chi nhánh sinh hoạt chính' : 'Chi nhánh công tác'}
                    </label>
                    <input
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md text-outline px-4 py-3 cursor-not-allowed opacity-75"
                      type="text"
                      value={profileData.branchName}
                      disabled
                    />
                  </div>
                </div>
              </div>
              <div className="mt-stack-lg flex justify-end">
                <button 
                  type="submit" 
                  disabled={savingProfile}
                  className="bg-primary text-on-primary hover:bg-primary-container px-6 py-3 rounded-lg font-label-md text-label-md transition-colors flex items-center gap-2 font-bold disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">{savingProfile ? 'progress_activity' : 'save'}</span>
                  {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>

            {/* Security Settings */}
            <form onSubmit={handleChangePassword} className="bg-white rounded-xl p-stack-lg shadow-sm border border-outline-variant transition-all hover:shadow-md">
              <h3 className="font-title-lg text-title-lg text-on-surface mb-stack-md border-b border-outline-variant pb-2 font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">security</span>
                Bảo mật & Đổi mật khẩu
              </h3>
              <div className="space-y-stack-md max-w-md">
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Mật khẩu hiện tại</label>
                  <input
                    className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3"
                    placeholder="Nhập mật khẩu hiện tại"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Mật khẩu mới</label>
                  <input
                    className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3"
                    placeholder="Tối thiểu 6 ký tự"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Xác nhận mật khẩu mới</label>
                  <input
                    className="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3"
                    placeholder="Nhập lại mật khẩu mới"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={updatingPassword}
                  className="bg-white border-2 border-primary text-primary hover:bg-primary/5 px-6 py-3 rounded-lg font-label-md text-label-md transition-colors mt-4 font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">{updatingPassword ? 'progress_activity' : 'key'}</span>
                  {updatingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Notifications & Additional Settings */}
          <div className="lg:col-span-4 space-y-gutter">
            {/* Notification Settings */}
            <section className="bg-white rounded-xl p-stack-lg shadow-sm border border-outline-variant transition-all hover:shadow-md">
              <h3 className="font-title-lg text-title-lg text-on-surface mb-stack-md border-b border-outline-variant pb-2 font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">notifications</span>
                Cài đặt thông báo
              </h3>
              <div className="space-y-stack-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface font-bold">Nhắc trả tài liệu</h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Nhận email trước ngày hết hạn</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input className="sr-only peer" type="checkbox" defaultChecked />
                    <div className="w-11 h-6 bg-outline rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface font-bold">Đặt chỗ sẵn sàng</h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Nhận thông báo khi sách sẵn sàng</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input className="sr-only peer" type="checkbox" defaultChecked />
                    <div className="w-11 h-6 bg-outline rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface font-bold">Truyền thông & Tin tức</h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Các thông báo, sự kiện của BkLib</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input className="sr-only peer" type="checkbox" />
                    <div className="w-11 h-6 bg-outline rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* Role-based Info Card */}
            {profileData.role === 'READER' ? (
              <section className="bg-gradient-to-br from-white to-[#f0fdff] rounded-xl p-stack-lg border border-secondary/30 relative overflow-hidden shadow-[0_0_15px_rgba(13,148,136,0.15)] transition-all hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
                  <div>
                    <h3 className="font-title-lg text-title-lg text-on-surface mb-2 font-bold">Trợ lý AI gợi ý</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-4 leading-relaxed">
                      Chào <strong>{profileData.fullName}</strong>! Dựa trên sở thích của bạn, hệ thống AI khuyên bạn nên khám phá các tài liệu mới trong danh mục <strong>Khoa học Máy tính</strong> được cập nhật tuần này.
                    </p>
                    <span className="text-secondary font-label-md text-label-md font-bold flex items-center gap-1 cursor-pointer hover:underline">
                      Xem danh mục gợi ý <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </section>
            ) : (
              <section className="bg-gradient-to-br from-white to-primary-container/10 rounded-xl p-stack-lg border border-primary/20 relative overflow-hidden transition-all hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>supervised_user_circle</span>
                  <div>
                    <h3 className="font-title-lg text-title-lg text-on-surface mb-2 font-bold">Vai trò cán bộ</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-4 leading-relaxed">
                      Bạn đang đăng nhập với tư cách **{userRoleText}**. Bạn có toàn quyền thực hiện các nghiệp vụ quản lý kho sách, lưu thông tài liệu và hỗ trợ bạn đọc tại chi nhánh **{profileData.branchName}**.
                    </p>
                    <span className="text-primary font-label-md text-label-md font-bold flex items-center gap-1 cursor-pointer hover:underline">
                      Xem nhật ký hoạt động <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
