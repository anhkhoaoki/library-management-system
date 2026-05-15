import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';

export default function LibrarianDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/dashboard');
        setStats(response.data.data);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <MainLayout role="librarian" userName="Thủ thư" userRole="Thủ thư">
        <div className="flex items-center justify-center h-[400px]">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      </MainLayout>
    );
  }

  const overview = stats?.overview || {};
  const activities = stats?.recentActivities || [];

  return (
    <MainLayout role="librarian" userName="Bùi Thị Chi" userRole="Thủ thư">
      <div className="flex flex-col gap-stack-lg">
        {/* Header & Quick Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-stack-md">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-surface">Tổng quan hôm nay</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-stack-sm">Chào buổi sáng, hệ thống đang hoạt động ổn định.</p>
          </div>
          <div className="flex gap-stack-sm">
            <Link 
              to="/librarian/circulation"
              className="flex items-center gap-stack-sm px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm hover:shadow-md"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                qr_code_scanner
              </span>
              Mượn sách
            </Link>
            <Link 
              to="/librarian/circulation"
              className="flex items-center gap-stack-sm px-6 py-3 bg-surface-container-lowest text-primary border border-primary rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined">keyboard_return</span>
              Trả sách
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {/* Stat Card 1 */}
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex flex-col justify-between">
            <div className="flex justify-between items-start mb-stack-md">
              <div className="p-2 bg-primary-container rounded-lg text-on-primary-container">
                <span className="material-symbols-outlined">book</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Đang mượn</span>
            </div>
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{overview.activeBorrows || 0}</h3>
              <p className="font-label-sm text-label-sm text-secondary mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                Đang lưu thông
              </p>
            </div>
          </div>
          {/* Stat Card 2 */}
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex flex-col justify-between">
            <div className="flex justify-between items-start mb-stack-md">
              <div className="p-2 bg-error-container rounded-lg text-on-error-container">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Quá hạn</span>
            </div>
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{overview.overdueCount || 0}</h3>
              <p className="font-label-sm text-label-sm text-error mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">notifications</span>
                Cần xử lý ngay
              </p>
            </div>
          </div>
          {/* Stat Card 3 */}
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex flex-col justify-between">
            <div className="flex justify-between items-start mb-stack-md">
              <div className="p-2 bg-secondary-container rounded-lg text-on-secondary-container">
                <span className="material-symbols-outlined">event_seat</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Hôm nay</span>
            </div>
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{overview.newBorrowsToday || 0}</h3>
              <p className="font-label-sm text-label-sm text-secondary mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Số lượt mượn mới
              </p>
            </div>
          </div>
          {/* Stat Card 4 */}
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex flex-col justify-between">
            <div className="flex justify-between items-start mb-stack-md">
              <div className="p-2 bg-tertiary-container rounded-lg text-on-tertiary-container">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Phí phạt chờ</span>
            </div>
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{(overview.totalPendingFineAmount || 0).toLocaleString()}đ</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                Tổng {overview.pendingFines || 0} phiếu
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area: AI Forecast & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* AI Forecast Section (Spans 2 columns) */}
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-stack-md relative overflow-hidden group hover:shadow-[0_0_20px_rgba(13,148,136,0.15)] transition-shadow">
            {/* Wisdom Glow Background Effect */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary-fixed opacity-20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex justify-between items-center mb-stack-md">
              <div className="flex items-center gap-stack-sm">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
                <h3 className="font-title-lg text-title-lg text-on-surface">Dự báo nhu cầu AI</h3>
              </div>
              <span className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded font-label-sm text-label-sm font-bold">
                AI Insight
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mb-stack-lg">
              Các tựa sách sau được dự báo sẽ thiếu hụt trong 7 ngày tới dựa trên xu hướng mượn và phân tích học phần.
            </p>
            <div className="space-y-stack-sm">
              <div className="flex items-center justify-between p-stack-sm bg-surface rounded-lg border-l-4 border-secondary hover:shadow-md transition-shadow">
                <div className="flex items-center gap-stack-md">
                  <div className="w-12 h-16 bg-surface-variant rounded overflow-hidden flex items-center justify-center">
                    <span className="material-symbols-outlined text-outline">book</span>
                  </div>
                  <div>
                    <h4 className="font-label-md text-label-md text-on-surface font-bold">Lập trình Web nâng cao</h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Phạm Hoàng Thái</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-label-md text-label-md text-error">Tồn kho: 1</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Dự báo cần: 12</span>
                </div>
              </div>
            </div>
          </div>
          {/* Recent Activities (1 column) */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-stack-md">
            <h3 className="font-title-lg text-title-lg text-on-surface mb-stack-md">Hoạt động gần đây</h3>
            <div className="space-y-stack-md">
              {activities.length === 0 ? (
                <p className="text-on-surface-variant text-center py-10 italic">Chưa có hoạt động nào</p>
              ) : (
                activities.map((act, index) => (
                  <div key={act.id} className="flex gap-stack-sm relative">
                    {index < activities.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-[-16px] w-[2px] bg-surface-variant"></div>
                    )}
                    <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center shrink-0 z-10">
                      <span className="material-symbols-outlined text-[16px]">
                        {act.action === 'BORROW' ? 'how_to_reg' : act.action === 'RETURN' ? 'keyboard_return' : 'edit'}
                      </span>
                    </div>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">
                        {act.user?.fullName || 'Hệ thống'} - {act.action}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {act.entityType}: {act.entityId}
                      </p>
                      <p className="font-label-sm text-label-sm text-outline mt-1">
                        {new Date(act.createdAt).toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
