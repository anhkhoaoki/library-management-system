import React from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function AdminDashboard() {
  return (
    <MainLayout role="admin" userName="Admin" userRole="Quản trị viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Header Section */}
        <div className="mb-stack-lg">
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-2">
            Tổng quan hệ thống
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Xem tình trạng hoạt động và số liệu thống kê mới nhất.
          </p>
        </div>

        {/* Metrics Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
          {/* Total Users */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                <span className="material-symbols-outlined text-2xl">group</span>
              </div>
              <span className="font-label-sm text-label-sm text-secondary bg-secondary-fixed-dim px-2 py-1 rounded-full">
                +12%
              </span>
            </div>
            <div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-1">Tổng số thành viên</p>
              <p className="font-display-lg text-display-lg text-on-background">24,592</p>
            </div>
          </div>

          {/* Total Documents */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                <span className="material-symbols-outlined text-2xl">library_books</span>
              </div>
              <span className="font-label-sm text-label-sm text-secondary bg-secondary-fixed-dim px-2 py-1 rounded-full">
                +5%
              </span>
            </div>
            <div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-1">Tổng số tài liệu</p>
              <p className="font-display-lg text-display-lg text-on-background">142,850</p>
            </div>
          </div>

          {/* System Status AI Card */}
          <div
            className="bg-surface-container-lowest rounded-xl p-6 relative overflow-hidden flex flex-col justify-between"
            style={{
              boxShadow: '0 0 15px rgba(13, 148, 136, 0.2)',
              border: '1px solid rgba(13, 148, 136, 0.3)',
            }}
          >
            <div className="absolute top-0 right-0 p-2">
              <span className="font-label-sm text-label-sm bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full border border-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span> AI Active
              </span>
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-2xl">dns</span>
              </div>
            </div>
            <div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-1">Dung lượng lưu trữ</p>
              <div className="flex items-end gap-2 mb-2">
                <p className="font-headline-md text-headline-md text-on-background">68%</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant pb-1">Đã dùng (3.4TB/5TB)</p>
              </div>
              <div className="w-full bg-surface-variant rounded-full h-2">
                <div className="bg-secondary h-2 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Logs Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* Chart Area */}
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-title-lg text-title-lg text-on-background">Lượt truy cập hệ thống</h3>
              <div className="flex gap-2">
                <button className="font-label-sm text-label-sm px-3 py-1 bg-surface-variant text-on-surface rounded-md">
                  Tuần
                </button>
                <button className="font-label-sm text-label-sm px-3 py-1 bg-primary text-on-primary rounded-md">
                  Tháng
                </button>
              </div>
            </div>
            <div className="h-64 bg-surface flex items-center justify-center rounded-lg border border-outline-variant border-dashed">
              <p className="font-body-md text-body-md text-outline">Biểu đồ đang được tải...</p>
            </div>
          </div>

          {/* Recent Audit Logs */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-title-lg text-title-lg text-on-background">Nhật ký hoạt động</h3>
              <a href="#" className="font-label-sm text-label-sm text-primary hover:underline">
                Xem tất cả
              </a>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {/* Log Item 1 */}
              <div className="flex gap-3">
                <div className="mt-1">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                <div>
                  <p className="font-body-md text-body-md text-on-background">Sao lưu dữ liệu thành công</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Hệ thống • 10 phút trước</p>
                </div>
              </div>

              {/* Log Item 2 */}
              <div className="flex gap-3">
                <div className="mt-1">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    person_add
                  </span>
                </div>
                <div>
                  <p className="font-body-md text-body-md text-on-background">Thêm 5 tài khoản thủ thư mới</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Admin_Q • 1 giờ trước</p>
                </div>
              </div>

              {/* Log Item 3 */}
              <div className="flex gap-3">
                <div className="mt-1">
                  <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                    warning
                  </span>
                </div>
                <div>
                  <p className="font-body-md text-body-md text-on-background">Cảnh báo: CPU server &gt; 85%</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Hệ thống • 3 giờ trước</p>
                </div>
              </div>

              {/* Log Item 4 */}
              <div className="flex gap-3">
                <div className="mt-1">
                  <span className="material-symbols-outlined text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                    settings
                  </span>
                </div>
                <div>
                  <p className="font-body-md text-body-md text-on-background">Cập nhật cấu hình phân quyền</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">SuperAdmin • Hôm qua</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
