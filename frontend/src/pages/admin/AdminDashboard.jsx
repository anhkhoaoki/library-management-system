import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api'; 

export default function AdminDashboard() {
  // Trạng thái lưu dữ liệu tổng quan
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalUsers: 0,
    activeBorrows: 0,
    overdueCount: 0,
    totalFines: 0
  });
  
  // Trạng thái lưu danh sách nhật ký hoạt động gần đây từ API
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/admin/dashboard');
        
        if (isMounted && response.data?.success) {
          const apiData = response.data.data;
          
          // 1. Ánh xạ chính xác từ object "overview" của Backend
          if (apiData?.overview) {
            setStats({
              totalBooks: apiData.overview.totalBooks ?? 0,
              totalUsers: apiData.overview.totalUsers ?? 0,
              activeBorrows: apiData.overview.activeBorrows ?? 0,
              overdueCount: apiData.overview.overdueCount ?? 0,
              // Chuyển đổi "totalPendingFineAmount" từ chuỗi "150000" thành số thực tế
              totalFines: apiData.overview.totalPendingFineAmount ? Number(apiData.overview.totalPendingFineAmount) : 0
            });
          }

          // 2. Lấy danh sách hoạt động gần đây thực tế
          if (apiData?.recentActivities) {
            setRecentLogs(apiData.recentActivities);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (isMounted) {
          setError('Không thể tải dữ liệu thống kê hệ thống.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardStats();

    return () => {
      isMounted = false;
    };
  }, []);

  // Định dạng tiền tệ VND
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Định dạng thời gian log hiển thị thân thiện (Giờ:Phút Ngày/Tháng)
  const formatLogTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Xác định Icon tương ứng với từng loại hành động hệ thống
  const getActionIcon = (action) => {
    switch (action?.toUpperCase()) {
      case 'LOGIN': return { name: 'login', color: 'text-primary' };
      case 'LOGOUT': return { name: 'logout', color: 'text-outline' };
      case 'CREATE': return { name: 'add_circle', color: 'text-secondary' };
      case 'UPDATE': return { name: 'edit', color: 'text-tertiary' };
      case 'DELETE': return { name: 'delete', color: 'text-error' };
      default: return { name: 'info', color: 'text-blue-500' };
    }
  };

  return (
    <MainLayout role="admin" userName="Admin" userRole="Quản trị viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Header Section */}
        <div className="mb-stack-lg">
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-2">
            Tổng quan hệ thống
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Xem tình trạng hoạt động và số liệu thống kê mới nhất từ cơ sở dữ liệu thư viện.
          </p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded-xl border border-error flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined">error</span>
            <p className="font-body-md">{error}</p>
          </div>
        )}

        {/* Metrics Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
          
          {/* 1. Tổng số thành viên */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start mb-2">
              <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                <span className="material-symbols-outlined text-2xl">group</span>
              </div>
              <span className="font-label-sm text-label-sm text-primary bg-primary-container px-2 py-1 rounded-full">
                Hệ thống
              </span>
            </div>
            <div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-1">Tổng số thành viên</p>
              {loading ? (
                <div className="h-9 w-24 bg-surface-variant animate-pulse rounded"></div>
              ) : (
                <p className="font-display-md text-display-md text-on-background">
                  {stats.totalUsers.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* 2. Tổng số tài liệu */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start mb-2">
              <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                <span className="material-symbols-outlined text-2xl">library_books</span>
              </div>
              <span className="font-label-sm text-label-sm text-tertiary bg-tertiary-container px-2 py-1 rounded-full">
                Đầu sách
              </span>
            </div>
            <div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-1">Tổng số tài liệu</p>
              {loading ? (
                <div className="h-9 w-24 bg-surface-variant animate-pulse rounded"></div>
              ) : (
                <p className="font-display-md text-display-md text-on-background">
                  {stats.totalBooks.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* 3. Đang được mượn */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start mb-2">
              <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                <span className="material-symbols-outlined text-2xl">book_2</span>
              </div>
              {stats.overdueCount > 0 && (
                <span className="font-label-sm text-label-sm text-error bg-error-container px-2 py-1 rounded-full flex items-center gap-0.5 animate-pulse">
                  <span className="material-symbols-outlined text-[14px]">warning</span> {stats.overdueCount} Quá hạn
                </span>
              )}
            </div>
            <div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-1">Đang được mượn</p>
              {loading ? (
                <div className="h-9 w-24 bg-surface-variant animate-pulse rounded"></div>
              ) : (
                <p className="font-display-md text-display-md text-on-background">
                  {stats.activeBorrows.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* 4. Tổng tiền phạt */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start mb-2">
              <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">payments</span>
              </div>
              <span className="font-label-sm text-label-sm text-error bg-error-container px-2 py-1 rounded-full">
                Phạt tích lũy
              </span>
            </div>
            <div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-1">Tổng tiền phạt hoãn</p>
              {loading ? (
                <div className="h-9 w-32 bg-surface-variant animate-pulse rounded"></div>
              ) : (
                <p className="font-headline-md text-headline-md text-error font-bold break-all">
                  {formatCurrency(stats.totalFines)}
                </p>
              )}
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
              <p className="font-body-md text-body-md text-outline">Biểu đồ thống kê đang phát triển...</p>
            </div>
          </div>

          {/* ĐỔI THÀNH NHẬT KÝ HOẠT ĐỘNG THỰC TẾ (RECENT ACTIVITIES) */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-title-lg text-title-lg text-on-background">Nhật ký hoạt động</h3>
             <Link to="/dashboard/admin/logs" className="font-label-sm text-label-sm text-primary hover:underline">
              Xem tất cả
            </Link>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="text-center text-on-surface-variant pt-10 font-body-md">
                  Chưa ghi nhận hoạt động nào.
                </div>
              ) : (
                recentLogs.map((log) => {
                  const iconConfig = getActionIcon(log.action);
                  return (
                    <div key={log.id} className="flex gap-3 items-start border-b border-surface-variant pb-2 last:border-0">
                      <div className="mt-0.5">
                        <span className={`material-symbols-outlined ${iconConfig.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                          {iconConfig.name}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body-md text-body-md text-on-background truncate">
                          <span className="font-bold">{log.user?.fullName || 'Hệ thống'}</span> đã thực hiện hành động <span className="font-mono text-xs bg-surface-variant px-1 rounded text-secondary">{log.action}</span> trên mục {log.entityType}
                        </p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          IP: {log.ipAddress} • {formatLogTime(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
        </div>
      </div>
    </MainLayout>
  );
}