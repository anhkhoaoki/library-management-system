import React, { useState, useEffect, useContext } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

export default function LibrarianDashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [pendingReservations, setPendingReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, reservationsRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/circulation/reservations/pending')
        ]);
        setStats(statsRes.data.data);
        setPendingReservations(reservationsRes.data.data);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <MainLayout role="librarian" userName={user?.fullName} userRole="Thủ thư">
        <div className="flex items-center justify-center h-[400px]">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      </MainLayout>
    );
  }

  const overview = stats?.overview || {};
  const recentActivities = stats?.recentActivities || [];

  return (
    <MainLayout role="librarian" userName={user?.fullName} userRole="Thủ thư">
      <div className="flex flex-col gap-stack-lg">
        {/* Header & Quick Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-stack-md">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-surface">Tổng quan hôm nay</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-stack-sm">Hệ thống đang hoạt động ổn định.</p>
          </div>
          <div className="flex gap-stack-sm">
            <Link 
              to="/dashboard/librarian/circulation"
              className="flex items-center gap-stack-sm px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-all shadow-sm"
            >
              <span className="material-symbols-outlined">qr_code_scanner</span>
              Lưu thông sách
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-outline-variant">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary-container rounded-lg text-on-primary-container">
                <span className="material-symbols-outlined">book</span>
              </div>
              <span className="font-label-sm text-on-surface-variant">Đang mượn</span>
            </div>
            <h3 className="font-headline-lg text-on-surface">{overview.activeBorrows || 0}</h3>
          </div>

          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-outline-variant">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-error-container rounded-lg text-on-error-container">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <span className="font-label-sm text-on-surface-variant">Quá hạn</span>
            </div>
            <h3 className="font-headline-lg text-on-surface">{overview.overdueCount || 0}</h3>
          </div>

          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-outline-variant">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-secondary-container rounded-lg text-on-secondary-container">
                <span className="material-symbols-outlined">event_seat</span>
              </div>
              <span className="font-label-sm text-on-surface-variant">Yêu cầu mới</span>
            </div>
            <h3 className="font-headline-lg text-on-surface">{pendingReservations.length}</h3>
          </div>

          <div className="bg-white p-stack-md rounded-xl shadow-sm border border-outline-variant">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-tertiary-container rounded-lg text-on-tertiary-container">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <span className="font-label-sm text-on-surface-variant">Phí phạt</span>
            </div>
            <h3 className="font-headline-lg text-on-surface">{(overview.totalPendingFineAmount || 0).toLocaleString()}đ</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* Pending Reservations List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-outline-variant p-stack-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-title-lg text-title-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">pending_actions</span>
                Yêu cầu chờ xử lý
              </h3>
              <Link to="/dashboard/librarian/circulation" className="text-primary hover:underline text-sm font-bold">Xử lý tại quầy</Link>
            </div>
            
            <div className="space-y-4">
              {pendingReservations.length === 0 ? (
                <p className="text-on-surface-variant text-center py-10 italic">Không có yêu cầu nào đang chờ.</p>
              ) : (
                pendingReservations.map(res => (
                  <div key={res.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${res.status === 'READY_FOR_PICKUP' ? 'bg-success-container text-on-success-container' : 'bg-warning-container text-on-warning-container'}`}>
                        {res.user.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-label-md text-on-surface font-bold">{res.book.title}</h4>
                        <p className="text-xs text-on-surface-variant">{res.user.fullName} ({res.user.readerCode || res.user.studentId})</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide border ${res.status === 'READY_FOR_PICKUP' ? 'bg-success-container text-on-success-container border-success' : 'bg-warning-container text-on-warning-container border-warning'}`}>
                          {res.status === 'READY_FOR_PICKUP' ? '✓ Có sẵn - Chờ lấy' : '⏳ Đang chờ sách trả'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/dashboard/librarian/circulation', { state: { reservationId: res.id, readerCode: res.user.readerCode || res.user.email } })}
                      className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary-container transition-colors"
                    >
                      Xử lý
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant p-stack-md">
            <h3 className="font-title-lg text-on-surface mb-6">Hoạt động gần đây</h3>
            <div className="space-y-6">
              {recentActivities.length === 0 ? (
                <p className="text-on-surface-variant text-center py-10 italic">Chưa có hoạt động.</p>
              ) : (
                recentActivities.map((act, index) => (
                  <div key={act.id} className="flex gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center shrink-0 z-10">
                      <span className="material-symbols-outlined text-sm">
                        {act.action === 'BORROW' ? 'how_to_reg' : act.action === 'RETURN' ? 'keyboard_return' : 'edit'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">{act.user?.fullName} - {act.action}</p>
                      <p className="text-[10px] text-on-surface-variant">{act.entityType}: {act.entityId}</p>
                      <p className="text-[10px] text-outline mt-1">{new Date(act.createdAt).toLocaleString('vi-VN')}</p>
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
