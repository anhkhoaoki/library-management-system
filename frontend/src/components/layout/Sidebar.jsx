import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const sidebarConfig = {
  student: [
    { name: 'Trang chủ', icon: 'home', path: '/dashboard/student' },
    { name: 'Tra cứu AI', icon: 'auto_awesome', path: '/dashboard/student/search' },
    { name: 'Sách đang mượn', icon: 'book', path: '/dashboard/student/borrowed-books' },
    { name: 'Lịch sử', icon: 'history', path: '/dashboard/student/history' },
    { name: 'Đặt chỗ', icon: 'event_seat', path: '/dashboard/student/reservations' },
    { name: 'Tài nguyên số', icon: 'cloud_download', path: '/dashboard/student/digital-resources' },
    { name: 'Hồ sơ', icon: 'person', path: '/dashboard/student/profile' },
  ],
  admin: [
    { name: 'Dashboard', icon: 'dashboard', path: '/dashboard/admin' },
    { name: 'Quản lý tài khoản', icon: 'manage_accounts', path: '/dashboard/admin/users' },
    { name: 'Cấu hình hệ thống', icon: 'settings_system_daydream', path: '/dashboard/admin/settings' },
    { name: 'Quản lý chi nhánh', icon: 'storefront', path: '/dashboard/admin/branches' },
    { name: 'Nhật ký hệ thống', icon: 'list_alt', path: '/dashboard/admin/logs' },
    { name: 'Sao lưu', icon: 'backup', path: '/dashboard/admin/backup' },
  ],
  librarian: [
    { name: 'Trang chủ', icon: 'home', path: '/dashboard/librarian' },
    { name: 'Quản lý lưu thông', icon: 'sync_alt', path: '/dashboard/librarian/circulation' },
    { name: 'Quản lý danh mục', icon: 'category', path: '/dashboard/librarian/catalog' },
    { name: 'Truyền thông', icon: 'campaign', path: '/dashboard/librarian/news' },
    { name: 'Luân chuyển sách', icon: 'local_shipping', path: '/dashboard/librarian/transfers' },
    { name: 'Báo cáo', icon: 'bar_chart', path: '/dashboard/librarian/reports' },
  ],
};

export default function Sidebar({ role = 'student' }) {
  const location = useLocation();
  const menuItems = sidebarConfig[role] || [];

  return (
    <aside className="hidden md:flex flex-col bg-white dark:bg-inverse-surface shadow-md h-full w-[280px] py-stack-md border-r border-outline-variant dark:border-outline fixed left-0 top-0 z-40">
      <div className="px-gutter mb-stack-lg">
        <div className="flex items-center gap-stack-sm mb-unit">
          <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            account_balance
          </span>
          <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">
            Intellectual Heritage
          </h1>
        </div>
        <p className="font-label-sm text-label-sm text-on-surface-variant">Hệ thống quản lý thông minh</p>
      </div>

      <nav className="flex-1 flex flex-col gap-stack-sm px-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-stack-md px-stack-md py-stack-sm rounded-lg mx-2 transition-all duration-150 ${
                isActive
                  ? 'bg-primary-container text-on-primary-container dark:bg-primary-fixed-dim dark:text-on-primary-fixed scale-[0.98]'
                  : 'text-on-surface-variant dark:text-outline-variant hover:bg-surface-container-low hover:bg-surface-container dark:hover:bg-on-tertiary-fixed-variant'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "" }}>
                {item.icon}
              </span>
              <span className="font-label-md text-label-md font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-stack-md border-t border-outline-variant">
        <Link
          to={`/dashboard/${role}/settings`}
          className="flex items-center gap-stack-md px-stack-md py-stack-sm text-on-surface-variant dark:text-outline-variant hover:bg-surface-container-low mx-2 rounded-lg hover:bg-surface-container dark:hover:bg-on-tertiary-fixed-variant transition-all"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-label-md text-label-md">Cài đặt</span>
        </Link>
        <Link
          to="/login"
          className="flex items-center gap-stack-md px-stack-md py-stack-sm text-on-surface-variant dark:text-outline-variant hover:bg-surface-container-low mx-2 rounded-lg hover:bg-surface-container dark:hover:bg-on-tertiary-fixed-variant transition-all"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-label-md text-label-md">Đăng xuất</span>
        </Link>
      </div>
    </aside>
  );
}
