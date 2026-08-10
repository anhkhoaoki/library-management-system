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
  
  // Lưu đồng thời dữ liệu biểu đồ cả tuần và tháng (Tránh gọi lại API khi bấm chuyển tab)
  const [trends, setTrends] = useState({
    weekly: [],
    monthly: []
  });
  const [chartMode, setChartMode] = useState('weekly');
  const [meta, setMeta] = useState({ lastUpdated: '', source: 'database', description: '', notice: '' });
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
              totalFines: apiData.overview.totalPendingFineAmount ? Number(apiData.overview.totalPendingFineAmount) : 0
            });
          }

          // 2. Lấy danh sách hoạt động gần đây
          if (apiData?.recentActivities) {
            setRecentLogs(apiData.recentActivities);
          }

          // 3. Lưu đồng thời cả weeklyTrend và monthlyTrend
          setTrends({
            weekly: apiData?.weeklyTrend || [],
            monthly: apiData?.monthlyTrend || []
          });

          setMeta({
            lastUpdated: apiData?.generatedAt || '',
            source: apiData?.dataSource || 'database',
            description: apiData?.chartDescription || '',
            notice: apiData?.notice || ''
          });

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
  }, []); // Chỉ kích hoạt 1 lần khi mount trang

  // Lấy dữ liệu biểu đồ đang được chọn
  const chartData = chartMode === 'monthly' ? trends.monthly : trends.weekly;

  // Định dạng tiền tệ VND
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Định dạng thời gian log hiển thị (Giờ:Phút Ngày/Tháng)
  const formatLogTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Ưu tiên dùng field 'label' từ Backend (VD: "06/08") để tránh lệch múi giờ UTC khi parse Date ở FE
  const getDateLabel = (day) => {
    if (day.label) return day.label;
    if (day.date) {
      const parts = day.date.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
    }
    return '';
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
          {meta.lastUpdated && (
            <p className="font-label-sm text-label-sm text-primary mt-2">
              Cập nhật từ {meta.source === 'database' ? 'cơ sở dữ liệu' : meta.source === 'backup-fallback' ? 'bản sao lưu gần nhất' : 'nguồn dữ liệu'} lúc {new Date(meta.lastUpdated).toLocaleString('vi-VN')}
            </p>
          )}
          {meta.notice && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {meta.notice}
            </div>
          )}
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
            </div>
            <div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-1">Tổng tiền phạt tồn đọng</p>
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
          {/* Chart Area - Cột đôi hiển thị Lượt mượn & Lượt trả */}
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-surface-variant flex flex-col min-w-0">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
              <div>
                <h3 className="font-title-lg text-title-lg text-on-background">
                  {chartMode === 'weekly' ? 'Biểu đồ số lượt mượn & trả sách trong 7 ngày qua' : 'Biểu đồ số lượt mượn & trả sách trong 30 ngày qua'}
                </h3>
                {/* Chú thích màu sắc (Legend) */}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-primary inline-block"></span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Lượt mượn</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Lượt trả</span>
                  </div>
                </div>
              </div>

              {/* Nút chuyển đổi Tuần / Tháng */}
              <div className="flex gap-2 bg-surface-variant p-1 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setChartMode('weekly')}
                  className={`font-label-sm text-label-sm px-4 py-1.5 rounded-md transition-all ${chartMode === 'weekly' ? 'bg-primary text-on-primary shadow' : 'text-on-surface-variant hover:bg-surface-container'}`}
                >
                  Tuần
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('monthly')}
                  className={`font-label-sm text-label-sm px-4 py-1.5 rounded-md transition-all ${chartMode === 'monthly' ? 'bg-primary text-on-primary shadow' : 'text-on-surface-variant hover:bg-surface-container'}`}
                >
                  Tháng
                </button>
              </div>
            </div>
            
            {/* Vùng vẽ biểu đồ */}
            <div className="relative flex-1 min-h-[280px] w-full mt-2 flex flex-col">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : chartData.length > 0 ? (
                (() => {
                  // Lấy giá trị lớn nhất giữa mượn và trả để tính độ cao cột Y
                  const maxDataVal = Math.max(
                    ...chartData.map((d) => Math.max(d.borrows ?? d.borrowCount ?? d.count ?? 0, d.returns ?? d.returnCount ?? 0)),
                    0
                  );

                  let yTicks = [];
                  let effectiveMax = 5;

                  if (maxDataVal <= 5) {
                    effectiveMax = 5;
                    yTicks = [5, 4, 3, 2, 1, 0];
                  } else {
                    const step = Math.ceil(maxDataVal / 4);
                    effectiveMax = step * 4;
                    yTicks = [step * 4, step * 3, step * 2, step * 1, 0];
                  }

                  return (
                    <>
                      {/* 1. KHU VỰC CỘT VÀ LƯỚI TRỤC Y */}
                      <div className="relative flex-1 w-full pl-8 pr-2 pb-0">
                        
                        {/* TRỤC ĐỨNG (Y-AXIS LINE) */}
                        <div className="absolute left-8 top-0 bottom-0 border-l-2 border-outline-variant pointer-events-none z-20"></div>

                        {/* Trục Y và Grid lines đứt nét */}
                        <div className="absolute inset-0 pl-8 pr-2 flex flex-col justify-between pointer-events-none text-outline-variant text-xs font-mono">
                          {yTicks.map((tickValue, i) => (
                            <div key={i} className="flex items-center w-full h-0 border-t border-dashed border-outline-variant/60 relative">
                              <span className="absolute -left-8 w-6 text-right text-on-surface-variant -translate-y-1/2 pr-1">
                                {tickValue}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Các nhóm cột biểu đồ (Mượn & Trả) */}
                        <div className={`relative z-10 flex items-end justify-between w-full h-full ${chartData.length > 14 ? 'gap-0.5' : 'gap-2'}`}>
                          {chartData.map((day, idx) => {
                            const borrowVal = day.borrows ?? day.borrowCount ?? day.count ?? 0;
                            const returnVal = day.returns ?? day.returnCount ?? 0;

                            const borrowHeight = (borrowVal / effectiveMax) * 100;
                            const returnHeight = (returnVal / effectiveMax) * 100;

                            const dateLabel = getDateLabel(day);

                            return (
                              <div key={idx} className="flex flex-col items-center flex-1 min-w-0 h-full justify-end group relative">
                                
                                {/* Tooltip hiển thị cả 2 chỉ số khi hover */}
                                <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-all bg-inverse-surface text-inverse-on-surface text-xs p-2 rounded-md pointer-events-none whitespace-nowrap z-30 shadow-lg transform -translate-y-1 group-hover:-translate-y-0 duration-200 flex flex-col gap-0.5">
                                  <span className="font-semibold text-[11px] border-b border-outline/30 pb-0.5 mb-0.5">{dateLabel}</span>
                                  <span className="text-sky-300 font-medium">Mượn: {borrowVal} lượt</span>
                                  <span className="text-emerald-300 font-medium">Trả: {returnVal} lượt</span>
                                  <svg className="absolute text-inverse-surface h-2 w-full left-0 top-full" viewBox="0 0 255 255">
                                    <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                                  </svg>
                                </div>

                                {/* Nhóm 2 cột Mượn và Trả đứng cạnh nhau */}
                                <div className="flex items-end justify-center w-full gap-[2px] sm:gap-1 h-full">
                                  {/* Cột Lượt Mượn (Xanh dương) */}
                                  <div
                                    className="w-1/2 max-w-[20px] bg-gradient-to-t from-primary-container to-primary hover:brightness-110 transition-all duration-200 rounded-t-sm shadow-sm"
                                    style={{ height: `${borrowHeight}%`, minHeight: borrowHeight > 0 ? '4px' : '0' }}
                                  ></div>

                                  {/* Cột Lượt Trả (Xanh lá) */}
                                  <div
                                    className="w-1/2 max-w-[20px] bg-gradient-to-t from-emerald-200 to-emerald-500 hover:brightness-110 transition-all duration-200 rounded-t-sm shadow-sm"
                                    style={{ height: `${returnHeight}%`, minHeight: returnHeight > 0 ? '4px' : '0' }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. ĐƯỜNG TRỤC HOÀNH VÀ NHÃN NGÀY THÁNG */}
                      <div className="w-full pl-8 pr-2 pt-2.5 border-t-2 border-outline-variant flex justify-between items-center">
                        {chartData.map((day, idx) => {
                          const dateLabel = getDateLabel(day);
                          const showLabel = chartData.length <= 14 || idx % 4 === 0 || idx === chartData.length - 1;

                          return (
                            <div key={idx} className="flex-1 flex justify-center items-center min-w-0">
                              {showLabel ? (
                                <span className="text-on-surface-variant font-label-sm text-[10px] sm:text-xs truncate">
                                  {dateLabel}
                                </span>
                              ) : (
                                <span className="w-1 h-1 bg-outline-variant rounded-full opacity-50"></span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="font-body-md text-on-surface-variant italic">Không có dữ liệu mượn/trả sách trong khoảng thời gian này.</p>
                </div>
              )}
            </div>
          </div>

          {/* NHẬT KÝ HOẠT ĐỘNG THỰC TẾ (RECENT ACTIVITIES) */}
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
                          IP: {log.ipAddress || 'Không xác định'} • {formatLogTime(log.createdAt)}
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