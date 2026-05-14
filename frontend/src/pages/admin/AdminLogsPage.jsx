import React from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function AdminLogsPage() {
  const logs = [
    {
      id: 1,
      time: '24/10/2023 15:42',
      user: 'SuperAdmin_01',
      ip: '192.168.1.105',
      action: 'Khóa tài khoản thủ thư',
      details: 'Đã khóa tài khoản ID: LIB-992 vì phát hiện thao tác chỉnh sửa danh mục hàng loạt không hợp lệ.',
      level: 'Critical',
      initials: 'SA',
      type: 'user',
    },
    {
      id: 2,
      time: '24/10/2023 14:15',
      user: 'AI Catalog Engine',
      ip: 'System Automated',
      action: 'Cập nhật siêu dữ liệu (Metadata)',
      details: 'Tự động gán nhãn chủ đề cho 145 tài liệu mới nhập dựa trên NLP.',
      level: 'Info',
      isAi: true,
      type: 'ai',
    },
    {
      id: 3,
      time: '24/10/2023 11:30',
      user: 'Librarian_Tran',
      ip: '10.0.0.45',
      action: 'Đăng nhập thất bại (x3)',
      details: 'Sai mật khẩu 3 lần liên tiếp tại cổng quản trị nội bộ.',
      level: 'Warning',
      initials: 'L1',
      type: 'user',
    },
    {
      id: 4,
      time: '24/10/2023 09:05',
      user: 'Librarian_Nguyen',
      ip: '10.0.0.50',
      action: 'Thêm sách mới',
      details: 'Thêm ấn bản "Sapiens: Lược sử loài người" (ISBN: 9786043152643) vào kho Khoa Học.',
      level: 'Info',
      initials: 'L2',
      type: 'user',
    },
  ];

  return (
    <MainLayout role="admin" userName="Admin" userRole="Quản trị viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header */}
        <header className="flex flex-col gap-unit">
          <h1 className="font-headline-lg text-headline-lg font-bold text-primary">Nhật ký kiểm toán</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Giám sát và phân tích toàn bộ lịch sử thao tác hệ thống, cấu hình và quản lý dữ liệu.
          </p>
        </header>

        {/* Filters Surface */}
        <section className="bg-surface-container-lowest rounded-xl shadow-sm p-stack-md flex flex-wrap items-end gap-stack-md border border-surface-variant">
          <div className="flex flex-col gap-unit flex-1 min-w-[200px]">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Tìm kiếm thao tác / người dùng</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                className="w-full bg-surface hover:bg-surface-container focus:bg-surface-container-lowest border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg pl-10 pr-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-shadow"
                placeholder="Nhập ID, tên hoặc hành động..."
                type="text"
              />
            </div>
          </div>
          <div className="flex flex-col gap-unit w-48">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Thời gian từ</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">calendar_today</span>
              <input
                className="w-full bg-surface hover:bg-surface-container focus:bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg pl-10 pr-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-shadow"
                type="date"
              />
            </div>
          </div>
          <div className="flex flex-col gap-unit w-48">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Mức độ cảnh báo</label>
            <select className="w-full bg-surface hover:bg-surface-container focus:bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-shadow appearance-none">
              <option value="all">Tất cả mức độ</option>
              <option value="info">Thông tin (Info)</option>
              <option value="warning">Cảnh báo (Warning)</option>
              <option value="critical">Nghiêm trọng (Critical)</option>
            </select>
          </div>
          <div className="flex gap-stack-sm">
            <button className="bg-primary text-on-primary font-label-md text-label-md px-stack-md py-2 rounded-lg flex items-center gap-unit hover:opacity-90 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Lọc dữ liệu
            </button>
            <button className="bg-transparent border border-outline text-on-surface-variant font-label-md text-label-md px-stack-md py-2 rounded-lg flex items-center gap-unit hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              Đặt lại
            </button>
          </div>
        </section>

        {/* Data Table */}
        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-variant flex flex-col overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-surface-variant">
                <tr>
                  <th className="py-stack-sm px-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase w-48">Thời gian</th>
                  <th className="py-stack-sm px-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase">Người thực hiện</th>
                  <th className="py-stack-sm px-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase">Hành động</th>
                  <th className="py-stack-sm px-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase">Chi tiết</th>
                  <th className="py-stack-sm px-stack-md font-label-sm text-label-sm text-on-surface-variant uppercase w-32">Mức độ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low transition-colors group relative">
                    <td className="py-stack-sm px-stack-md font-body-md text-body-md text-on-surface">
                      {log.isAi && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-secondary"></div>}
                      <div className={`flex items-center gap-unit ${log.isAi ? 'pl-1' : ''}`}>
                        <span className="material-symbols-outlined text-outline text-[16px]">schedule</span>
                        {log.time}
                      </div>
                    </td>
                    <td className="py-stack-sm px-stack-md">
                      <div className="flex items-center gap-stack-sm">
                        {log.isAi ? (
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest text-primary flex items-center justify-center font-label-sm font-bold relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-secondary-fixed to-transparent opacity-30"></div>
                            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                          </div>
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-label-sm font-bold ${
                              log.level === 'Critical' ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container'
                            }`}
                          >
                            {log.initials}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className={`font-label-md text-label-md ${log.isAi ? 'text-secondary' : 'text-on-surface'}`}>{log.user}</span>
                          <span className="font-label-sm text-label-sm text-outline">{log.ip}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-stack-sm px-stack-md font-label-md text-label-md text-on-surface">{log.action}</td>
                    <td className="py-stack-sm px-stack-md font-body-md text-body-md text-on-surface-variant truncate max-w-[300px]" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-stack-sm px-stack-md">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-label-sm text-label-sm ${
                          log.level === 'Critical'
                            ? 'bg-error-container text-on-error-container'
                            : log.level === 'Warning'
                            ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant'
                            : 'bg-surface-container text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {log.level === 'Critical' ? 'dangerous' : log.level === 'Warning' ? 'warning' : 'info'}
                        </span>
                        {log.level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="bg-surface-container-lowest border-t border-surface-variant p-stack-sm px-stack-md flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline">Hiển thị 1-4 trong số 1,240 bản ghi</span>
            <div className="flex items-center gap-unit">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-container text-on-primary-container font-label-sm font-bold">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant font-label-sm">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant font-label-sm">3</button>
              <span className="text-outline">...</span>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
