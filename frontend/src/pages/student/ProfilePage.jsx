import React from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function ProfilePage() {
  return (
    <MainLayout role="student" userName="Minh Tuấn" userRole="Sinh viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Header */}
        <header>
          <h2 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-primary">Hồ sơ cá nhân & Cài đặt</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">Quản lý thông tin tài khoản và tùy chỉnh trải nghiệm thư viện của bạn.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left Column: Profile Info */}
          <div className="lg:col-span-8 space-y-gutter">
            {/* Profile Card */}
            <section className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-sm border border-surface-container-highest transition-shadow duration-300">
              <h3 className="font-title-lg text-title-lg text-on-surface mb-stack-md border-b border-surface-variant pb-2">Thông tin cơ bản</h3>
              <div className="flex flex-col md:flex-row gap-gutter items-start">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-container">
                    <img
                      alt="User profile avatar"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4oAzRv1YJI2gv1pKn59DRT4D5uLNRvG08Okfnzoa_VICjHXfYMD_mr-53db0Z0akDPy0-Oe798qiSa-qji6TpW2zfq-zwVa870RJPTvB4cChVoxGNGBA44husRZeeSzzc4b-gZ47XQXHiNXAgBGm8VChmFjdwQ9q1mfwYlOHkacrbDL1EqT_OU6FO6zzifv5FI5dU5u1khxSMRuMrF0Bm_4DjphAq5O75m0oehq9uEAPgNM3EzVzvJ1Ootvz5h4BHzmp1dWjCVxQb"
                    />
                  </div>
                  <button className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-label-md text-label-md px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    Cập nhật ảnh
                  </button>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-stack-md w-full">
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant">Họ và tên</label>
                    <input
                      className="w-full bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3"
                      type="text"
                      defaultValue="Nguyễn Văn A"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant">Email</label>
                    <input
                      className="w-full bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3"
                      type="email"
                      defaultValue="nguyenvana@academic.edu.vn"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant">Số điện thoại</label>
                    <input
                      className="w-full bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3"
                      type="tel"
                      defaultValue="0901234567"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant">Chi nhánh sinh hoạt chính</label>
                    <select className="w-full bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3 appearance-none">
                      <option>Thư viện Trung tâm - Cơ sở 1</option>
                      <option>Thư viện Khoa học tự nhiên</option>
                      <option>Phòng đọc thông minh AI</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-stack-lg flex justify-end">
                <button className="bg-primary text-on-primary hover:bg-primary-container px-6 py-3 rounded-lg font-label-md text-label-md transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">save</span>
                  Lưu thay đổi
                </button>
              </div>
            </section>

            {/* Security Settings */}
            <section className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-sm border border-surface-container-highest transition-shadow duration-300">
              <h3 className="font-title-lg text-title-lg text-on-surface mb-stack-md border-b border-surface-variant pb-2">Bảo mật</h3>
              <div className="space-y-stack-md max-w-md">
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant">Mật khẩu hiện tại</label>
                  <input
                    className="w-full bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3"
                    placeholder="••••••••"
                    type="password"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant">Mật khẩu mới</label>
                  <input
                    className="w-full bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3"
                    placeholder="Nhập mật khẩu mới"
                    type="password"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant">Xác nhận mật khẩu mới</label>
                  <input
                    className="w-full bg-surface-container-low border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary rounded-lg font-body-md text-body-md text-on-surface px-4 py-3"
                    placeholder="Nhập lại mật khẩu mới"
                    type="password"
                  />
                </div>
                <button className="border border-primary text-primary hover:bg-surface-container px-6 py-3 rounded-lg font-label-md text-label-md transition-colors mt-4">
                  Cập nhật mật khẩu
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Notifications & AI Settings */}
          <div className="lg:col-span-4 space-y-gutter">
            {/* Notification Settings */}
            <section className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-sm border border-surface-container-highest transition-shadow duration-300">
              <h3 className="font-title-lg text-title-lg text-on-surface mb-stack-md border-b border-surface-variant pb-2">Cài đặt thông báo</h3>
              <div className="space-y-stack-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface">Nhắc trả sách</h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Nhận email/SMS trước ngày hết hạn</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input className="sr-only peer" type="checkbox" defaultChecked />
                    <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface">Sách đặt chỗ đã về</h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Thông báo khi tài liệu sẵn sàng</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input className="sr-only peer" type="checkbox" defaultChecked />
                    <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface">Tin tức thư viện</h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Bản tin, sự kiện và hội thảo mới</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input className="sr-only peer" type="checkbox" />
                    <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* AI Insights Card */}
            <section className="bg-gradient-to-br from-surface-container-lowest to-[#f0fdff] rounded-xl p-stack-lg border border-secondary/30 relative overflow-hidden shadow-[0_0_15px_rgba(13,148,136,0.15)]">
              <div className="absolute top-4 right-4 bg-secondary-container text-on-secondary-container px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">AI Insight</div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <div>
                  <h3 className="font-title-lg text-title-lg text-on-surface mb-2">Thói quen đọc của bạn</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4">Dựa trên lịch sử mượn, bạn thường đọc sách chuyên ngành <strong>Khoa học dữ liệu</strong> vào cuối tuần. Chúng tôi đã chuẩn bị một danh sách tài nguyên mới cho bạn.</p>
                  <button className="text-secondary font-label-md text-label-md font-bold flex items-center hover:underline">
                    Xem gợi ý <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
