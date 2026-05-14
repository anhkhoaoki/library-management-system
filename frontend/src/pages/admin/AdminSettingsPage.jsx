import React from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function AdminSettingsPage() {
  return (
    <MainLayout role="admin" userName="Admin" userRole="Quản trị viên">
      <div className="flex flex-col gap-stack-lg">
        <header className="flex flex-col gap-unit">
          <h1 className="font-headline-lg text-headline-lg font-bold text-primary">Cấu hình hệ thống</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Thiết lập các tham số vận hành, quy định mượn trả và cấu hình bảo mật hệ thống.
          </p>
        </header>

        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-stack-lg flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-stack-md text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline">
              <span className="material-symbols-outlined text-4xl">settings_suggest</span>
            </div>
            <div>
              <h3 className="font-title-lg text-title-lg text-on-surface">Tính năng đang phát triển</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto">
                Trang cấu hình chi tiết đang được hoàn thiện để cung cấp khả năng tùy chỉnh tối đa cho quản trị viên.
              </p>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
