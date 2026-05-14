import React from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function AdminBackupPage() {
  const backups = [
    {
      id: 1,
      filename: 'Backup_ToanHethong_20231025.zip',
      time: '25/10/2023 02:00',
      size: '12.4 GB',
      type: 'Tự động (Hệ thống)',
      status: 'Success',
      isLatest: true,
    },
    {
      id: 2,
      filename: 'Backup_TruocCapNhat_v2.4.zip',
      time: '24/10/2023 15:30',
      size: '12.3 GB',
      type: 'Thủ công (Admin)',
      status: 'Success',
    },
    {
      id: 3,
      filename: 'Backup_ToanHethong_20231024.zip',
      time: '24/10/2023 02:00',
      size: '12.1 GB',
      type: 'Tự động (Hệ thống)',
      status: 'Archived',
    },
  ];

  return (
    <MainLayout role="admin" userName="Admin" userRole="Quản trị viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-surface mb-unit">Sao lưu & Phục hồi</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Quản lý an toàn dữ liệu hệ thống thư viện và thiết lập các điểm khôi phục.</p>
          </div>
          <button className="bg-primary text-on-primary hover:opacity-90 transition-colors rounded-lg px-stack-md py-stack-md flex items-center justify-center gap-2 shadow-sm w-full md:w-auto font-label-md text-label-md">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              backup
            </span>
            Tạo bản sao lưu mới
          </button>
        </div>

        {/* Bento Grid: Status & Storage */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-stack-lg">
          {/* System Health Card */}
          <div className="md:col-span-4 bg-surface-container-lowest rounded-xl shadow-sm p-stack-lg flex flex-col justify-between border-l-4 border-secondary-container relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-fixed-dim rounded-full opacity-10 blur-xl"></div>
            <div>
              <div className="flex items-center gap-2 mb-stack-sm">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  health_and_safety
                </span>
                <h3 className="font-title-lg text-title-lg text-on-surface">Trạng thái Hệ thống</h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">Hệ thống đang hoạt động ổn định. Bản sao lưu tự động tiếp theo dự kiến vào 02:00 AM ngày mai.</p>
            </div>
            <div className="mt-stack-md flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-secondary"></span>
              <span className="font-label-md text-label-md text-on-surface">An toàn & Đồng bộ</span>
            </div>
          </div>
          {/* Storage Analytics Card */}
          <div className="md:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm p-stack-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-stack-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">storage</span>
                <h3 className="font-title-lg text-title-lg text-on-surface">Dung lượng Lưu trữ Đám mây</h3>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-variant text-on-surface-variant px-2 py-1 rounded">Vùng: ap-southeast-1</span>
            </div>
            <div className="mb-stack-sm">
              <div className="flex justify-between font-label-md text-label-md mb-2">
                <span className="text-on-surface">Đã sử dụng: 428 GB</span>
                <span className="text-on-surface-variant">Tổng: 1000 GB</span>
              </div>
              <div className="w-full bg-surface-container-highest rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: '42.8%' }}></div>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">Bạn còn 572 GB khả dụng cho các bản sao lưu trong tương lai. Có thể chứa khoảng ~40 bản sao lưu toàn phần nữa.</p>
          </div>
        </div>

        {/* Section Title */}
        <h3 className="font-headline-lg text-headline-lg text-on-surface mb-stack-md">Danh sách Bản sao lưu</h3>

        {/* Backup Records List */}
        <div className="flex flex-col gap-stack-md">
          {backups.map((backup) => (
            <div
              key={backup.id}
              className="bg-surface-container-lowest rounded-xl shadow-sm p-stack-md flex flex-col md:flex-row md:items-center justify-between border border-transparent hover:border-outline-variant transition-all hover:shadow-md"
            >
              <div className="flex items-start md:items-center gap-stack-md mb-stack-md md:mb-0">
                <div className={`w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0 ${backup.status === 'Archived' ? 'opacity-70' : ''}`}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {backup.status === 'Success' ? 'cloud_done' : 'cloud_done'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-unit">
                    <h4 className="font-title-lg text-title-lg text-on-surface">{backup.filename}</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 font-label-sm text-label-sm border ${
                        backup.status === 'Success' ? 'bg-secondary-container text-on-secondary-container border-secondary-fixed' : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      {backup.status === 'Success' ? 'Thành công' : 'Đã lưu trữ'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body-md text-body-md text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span> {backup.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">hard_drive</span> {backup.size}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">
                        {backup.type.includes('Tự động') ? 'smart_toy' : 'person'}
                      </span>{' '}
                      {backup.type}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-stack-sm md:ml-stack-md self-end md:self-auto">
                <button className="text-primary hover:bg-surface-container-high rounded px-3 py-2 font-label-md text-label-md transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  Tải về
                </button>
                <button className="border border-outline text-primary hover:bg-surface-container-highest rounded px-4 py-2 font-label-md text-label-md transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">settings_backup_restore</span>
                  Phục hồi
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
