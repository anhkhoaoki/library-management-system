import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api';

export default function ReportsPage() {
  const [exporting, setExporting] = useState(false);
  const [timeFilter, setTimeFilter] = useState('30');
  const [fullDashboardData, setFullDashboardData] = useState(null);
  const [overview, setOverview] = useState({
    totalBooks: 0,
    totalUsers: 0,
    activeBorrows: 0,
    overdueCount: 0,
    newBorrowsToday: 0,
    returnsToday: 0,
    pendingFines: 0,
    totalPendingFineAmount: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [topBorrowedCopies, setTopBorrowedCopies] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (fullDashboardData) {
      if (timeFilter === '7') setTrendData(fullDashboardData.weeklyTrend || []);
      else if (timeFilter === '14') setTrendData(fullDashboardData.trend14 || []);
      else if (timeFilter === '21') setTrendData(fullDashboardData.trend21 || []);
      else if (timeFilter === '30') setTrendData(fullDashboardData.monthlyTrend || []);
    }
  }, [timeFilter, fullDashboardData]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const dashboardRes = await api.get('/admin/dashboard');
      const dashboardData = dashboardRes.data.data || {};
      
      setFullDashboardData(dashboardData);
      setOverview(dashboardData.overview || {
        totalBooks: 0,
        totalUsers: 0,
        activeBorrows: 0,
        overdueCount: 0,
        newBorrowsToday: 0,
        returnsToday: 0,
        pendingFines: 0,
        totalPendingFineAmount: 0,
      });
      setTrendData(dashboardData.monthlyTrend || []);
      setRecentActivities(dashboardData.recentActivities || []);
      setNotice(dashboardData.notice || '');
      setTopBorrowedCopies(dashboardData.topBooks || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu báo cáo từ máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

  const handleExport = async () => {
    try {
      setExporting(true);
      // Giả lập thời gian xuất báo cáo
      await new Promise(resolve => setTimeout(resolve, 800));
      const exportData = {
        generatedAt: new Date().toISOString(),
        timeFilter: timeFilter === '7' ? '1 tuần qua' : timeFilter === '14' ? '2 tuần qua' : timeFilter === '21' ? '3 tuần qua' : '1 tháng qua',
        overview,
        trendData,
        topBorrowedBooks: topBorrowedCopies,
        recentActivities,
      };
      
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', dataStr);
      downloadAnchorNode.setAttribute('download', `library_report_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (error) {
      alert('Có lỗi xảy ra khi xuất báo cáo: ' + (error.message));
    } finally {
      setExporting(false);
    }
  };

  const chartMax = Math.max(...trendData.map((item) => Math.max(item.borrows || 0, item.returns || 0)), 1);

  return (
    <MainLayout role="librarian" userName="Bùi Thị Chi" userRole="Thủ thư">
      <div className="flex flex-col gap-stack-lg">
        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-stack-md mb-stack-lg">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-background">Báo cáo & Thống kê</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Tổng quan hoạt động và dự báo thư viện</p>
          </div>
          <div className="flex items-center gap-stack-sm">
            <div className="flex items-center bg-surface-container-low rounded-lg border border-outline-variant px-3 py-2 text-on-surface-variant cursor-pointer hover:bg-surface-container transition-colors relative">
              <span className="material-symbols-outlined text-[20px] mr-2">calendar_month</span>
              <select 
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-transparent font-label-md text-label-md outline-none appearance-none cursor-pointer pr-4 text-on-surface"
              >
                <option value="7">1 tuần trước</option>
                <option value="14">2 tuần trước</option>
                <option value="21">3 tuần trước</option>
                <option value="30">1 tháng trước</option>
              </select>
              <span className="material-symbols-outlined text-[20px] absolute right-2 pointer-events-none text-on-surface-variant">arrow_drop_down</span>
            </div>
            <button 
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center bg-primary text-on-primary font-label-md text-label-md px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {exporting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <span className="material-symbols-outlined text-[20px] mr-2">download</span>
              )}
              {exporting ? 'Đang xuất...' : 'Xuất báo cáo'}
              {!exporting && <span className="material-symbols-outlined text-[20px] ml-1">arrow_drop_down</span>}
            </button>
          </div>
        </div>

        {notice && (
          <div className="rounded-lg border border-secondary/30 bg-secondary-container/20 px-4 py-3 text-sm text-on-surface-variant">
            {notice}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-16 text-on-surface-variant">Đang tải dữ liệu báo cáo...</div>
        ) : error ? (
          <div className="rounded-lg border border-error/30 bg-error-container/20 px-4 py-3 text-sm text-error">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-stack-lg">
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">library_books</span>
                  </div>
                  <span className="flex items-center text-secondary font-label-md text-label-md bg-secondary-container/20 px-2 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[16px] mr-1">trending_up</span> {overview.newBorrowsToday}
                  </span>
                </div>
                <p className="font-label-md text-label-md text-on-surface-variant">Lượt mượn hôm nay</p>
                <h3 className="font-headline-md text-headline-md text-on-background mt-1">{overview.newBorrowsToday}</h3>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined">keyboard_return</span>
                  </div>
                  <span className="flex items-center text-secondary font-label-md text-label-md bg-secondary-container/20 px-2 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[16px] mr-1">trending_up</span> {overview.returnsToday}
                  </span>
                </div>
                <p className="font-label-md text-label-md text-on-surface-variant">Lượt trả hôm nay</p>
                <h3 className="font-headline-md text-headline-md text-on-background mt-1">{overview.returnsToday}</h3>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-error-container/50 flex items-center justify-center text-error">
                    <span className="material-symbols-outlined">warning</span>
                  </div>
                  <span className="flex items-center text-error font-label-md text-label-md bg-error-container/30 px-2 py-1 rounded-full">
                    <span className="material-symbols-outlined text-[16px] mr-1">trending_down</span> {overview.overdueCount}
                  </span>
                </div>
                <p className="font-label-md text-label-md text-on-surface-variant">Sách quá hạn</p>
                <h3 className="font-headline-md text-headline-md text-on-background mt-1 text-error">{overview.overdueCount}</h3>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined">group</span>
                  </div>
                </div>
                <p className="font-label-md text-label-md text-on-surface-variant">Độc giả tích cực</p>
                <h3 className="font-headline-md text-headline-md text-on-background mt-1">{overview.totalUsers}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-stack-lg">
              <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col min-h-[400px]">
                <h3 className="font-title-lg text-title-lg text-on-background mb-6">Biểu đồ số lượt mượn & trả sách</h3>
                <div className="flex-1 flex flex-col gap-2 relative">
                  <div className="flex-1 flex items-end justify-between border-b border-l border-outline-variant pb-0 pl-2 relative">
                    <div className="w-full h-full absolute inset-0 flex flex-col justify-between pt-2 pb-0 opacity-10 pointer-events-none">
                      <div className="border-b border-outline w-full h-0"></div>
                      <div className="border-b border-outline w-full h-0"></div>
                      <div className="border-b border-outline w-full h-0"></div>
                      <div className="border-b border-outline w-full h-0"></div>
                    </div>
                    <div className="flex gap-1 w-full justify-around h-full items-end pt-8 z-10">
                      {(() => {
                        if (trendData.length === 0) return <div className="text-sm text-on-surface-variant m-auto pb-6">Chưa có dữ liệu xu hướng trong thời gian này.</div>;
                        const maxVal = Math.max(...trendData.map(d => Math.max(d.borrows || 0, d.returns || 0)), 0);
                        if (maxVal === 0) {
                          return <div className="text-sm text-on-surface-variant m-auto italic pb-6">Không có lượt mượn hay trả nào trong khoảng thời gian này.</div>;
                        }
                        
                        return trendData.map((item) => {
                          const borrowHeight = ((item.borrows || 0) / maxVal) * 100;
                          const returnHeight = ((item.returns || 0) / maxVal) * 100;
                          return (
                            <div key={item.date || item.label} className="flex flex-col items-center h-full justify-end flex-1 min-w-0 group relative">
                              <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all bg-inverse-surface text-inverse-on-surface text-xs p-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-lg">
                                <div className="font-bold border-b border-outline/30 pb-0.5 mb-0.5">{item.label}</div>
                                <div className="text-sky-300">Mượn: {item.borrows || 0}</div>
                                <div className="text-emerald-300">Trả: {item.returns || 0}</div>
                              </div>
                              <div className="flex gap-[2px] items-end h-full w-full justify-center">
                                <div className="w-1/2 max-w-[12px] bg-primary rounded-t-sm hover:brightness-110 transition-all" style={{ height: `${borrowHeight}%`, minHeight: borrowHeight > 0 ? '4px' : '0' }}></div>
                                <div className="w-1/2 max-w-[12px] bg-emerald-500 rounded-t-sm hover:brightness-110 transition-all" style={{ height: `${returnHeight}%`, minHeight: returnHeight > 0 ? '4px' : '0' }}></div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                  {/* X-Axis labels */}
                  {trendData.length > 0 && Math.max(...trendData.map(d => Math.max(d.borrows || 0, d.returns || 0)), 0) > 0 && (
                    <div className="flex justify-between pl-2">
                      {trendData.map((item, idx) => {
                        const showLabel = trendData.length <= 14 || idx % 3 === 0 || idx === trendData.length - 1;
                        return (
                          <div key={idx} className="flex-1 flex justify-center min-w-0">
                            {showLabel ? (
                              <span className="font-label-sm text-[10px] sm:text-xs text-on-surface-variant truncate">{item.label}</span>
                            ) : (
                              <span className="w-1 h-1 bg-outline-variant rounded-full opacity-50 mt-1"></span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Mượn</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Trả</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
                <h3 className="font-title-lg text-title-lg text-on-background mb-4">Sách mượn nhiều nhất</h3>
                <ul className="flex flex-col gap-4">
                  {topBorrowedCopies.length > 0 ? topBorrowedCopies.slice(0, 5).map((item, index) => (
                    <li key={item.id || index} className="flex items-center gap-3 border-b border-outline-variant/30 pb-3 last:border-0 last:pb-0">
                      <img src={item.image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=200'} alt={item.title || 'Book'} className="w-10 h-14 object-cover rounded shadow-sm bg-surface-variant" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-label-md text-label-md font-semibold text-on-background line-clamp-2" title={item.title}>{item.title || 'Sách không xác định'}</h4>
                        <p className="font-label-sm text-label-sm text-on-surface-variant truncate mt-0.5">{item.category || 'Khác'}</p>
                      </div>
                      <div className="text-right pl-2">
                        <span className="font-headline-sm text-headline-sm text-primary font-bold">{item.count ?? 0}</span>
                        <p className="font-label-sm text-[10px] text-on-surface-variant">lượt</p>
                      </div>
                    </li>
                  )) : <li className="text-sm text-on-surface-variant">Chưa có dữ liệu mượn sách để hiển thị.</li>}
                </ul>
              </div>
            </div>

            <div className="relative bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">history</span>
                  </div>
                  <div>
                    <h3 className="font-title-lg text-title-lg text-on-background">Nhật ký hoạt động thư viện</h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Cập nhật theo thời gian thực từ hệ thống</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-0 relative before:absolute before:inset-y-0 before:left-4 before:w-px before:bg-outline-variant/50 ml-1">
                {recentActivities.length > 0 ? recentActivities.map((activity, index) => {
                  let icon = 'info';
                  let iconBg = 'bg-surface-variant';
                  let iconColor = 'text-on-surface-variant';
                  if (activity.action === 'CREATE' || activity.action === 'ADD') { icon = 'add_circle'; iconBg = 'bg-secondary-container'; iconColor = 'text-secondary'; }
                  else if (activity.action === 'UPDATE' || activity.action === 'EDIT') { icon = 'edit'; iconBg = 'bg-tertiary-container'; iconColor = 'text-tertiary'; }
                  else if (activity.action === 'DELETE' || activity.action === 'REMOVE') { icon = 'delete'; iconBg = 'bg-error-container'; iconColor = 'text-error'; }
                  else if (activity.action === 'LOGIN') { icon = 'login'; iconBg = 'bg-primary-container'; iconColor = 'text-primary'; }

                  const timeStr = activity.createdAt ? new Date(activity.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : 'Vừa xong';
                  const dateStr = activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'}) : '';
                  
                  return (
                    <div key={activity.id || index} className="relative pl-12 py-3 group">
                      <div className={`absolute left-[3px] top-4 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-surface-container-lowest ${iconBg} ${iconColor} z-10 transition-transform group-hover:scale-110`}>
                        <span className="material-symbols-outlined text-[14px]">{icon}</span>
                      </div>
                      <div className="bg-white hover:bg-surface-container-low transition-colors p-4 rounded-xl border border-outline-variant/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="font-body-md text-body-md text-on-background">
                            <span className="font-semibold">{activity.user?.fullName || 'Người dùng ẩn danh'}</span> đã thực hiện <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-variant text-on-surface-variant">{activity.action}</span> trên mục <span className="font-semibold text-primary">{activity.entityType || 'Hệ thống'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-on-surface-variant whitespace-nowrap bg-surface-container-lowest px-2 py-1 rounded-md border border-outline-variant/20">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span className="font-label-sm text-xs">{timeStr} {dateStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                }) : <div className="pl-12 py-4 text-sm text-on-surface-variant italic">Chưa ghi nhận hoạt động nào gần đây.</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
