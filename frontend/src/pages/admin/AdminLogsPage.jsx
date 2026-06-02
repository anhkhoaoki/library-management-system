import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import api from '../../utils/api';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Trạng thái lưu trữ giá trị ĐANG NHẬP trên giao diện
  const [searchInput, setSearchInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [riskLevelInput, setRiskLevelInput] = useState('all');

  // Trạng thái thực tế dùng để GỬI API
  const [activeFilters, setActiveFilters] = useState({
    search: '',
    dateFilter: '',
    riskLevelFilter: 'all'
  });

  // Phân trang
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Hàm gọi API dựa vào các bộ lọc thực tế
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { search, dateFilter, riskLevelFilter } = activeFilters;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { action: search.trim().toUpperCase() }),
        ...(riskLevelFilter !== 'all' && { riskLevel: riskLevelFilter.toUpperCase() })
      });

      // XỬ LÝ LỖI MÚI GIỜ BẰNG CÁCH NỚI RỘNG KHOẢNG THỜI GIAN ĐẦU NGÀY - CUỐI NGÀY
      if (dateFilter) {
        // Tạo mốc bắt đầu ngày (00:00:00) theo giờ địa phương của User
        const fromDateLocal = new Date(`${dateFilter}T00:00:00`);
        // Tạo mốc kết thúc ngày (23:59:59) theo giờ địa phương của User
        const toDateLocal = new Date(`${dateFilter}T23:59:59.999`);

        // Gửi chuỗi ISO chính xác đã đồng bộ múi giờ quốc tế về Backend
        params.append('fromDate', fromDateLocal.toISOString());
        params.append('toDate', toDateLocal.toISOString());
      }

      const response = await api.get(`/admin/audit-logs?${params}`);
      
      if (response.data.success) {
        setLogs(response.data.data || response.data.logs || []);
        setTotalPages(response.data.meta?.totalPages || response.data.totalPages || 1);
        setTotalLogs(response.data.meta?.total || response.data.totalLogs || 0);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Không thể tải nhật ký kiểm toán. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [page, activeFilters]);

  // Tự động gọi lại API khi số trang hoặc bộ lọc kích hoạt thay đổi
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Hành động khi bấm nút "Lọc dữ liệu" hoặc nhấn Enter
  const handleApplyFilters = () => {
    setPage(1);
    setActiveFilters({
      search: searchInput,
      dateFilter: dateInput,
      riskLevelFilter: riskLevelInput
    });
  };

  // Hành động khi bấm nút "Đặt lại"
  const handleResetFilters = () => {
    setSearchInput('');
    setDateInput('');
    setRiskLevelInput('all');
    setPage(1);
    setActiveFilters({
      search: '',
      dateFilter: '',
      riskLevelFilter: 'all'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getLevelDisplay = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'Critical';
      case 'HIGH': return 'High';
      case 'WARNING': 
      case 'MEDIUM': return 'Warning';
      default: return 'Info';
    }
  };

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
            <label className="font-label-sm text-label-sm text-on-surface-variant">Tìm kiếm hành động</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                className="w-full bg-surface hover:bg-surface-container focus:bg-surface-container-lowest border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg pl-10 pr-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-shadow"
                placeholder="Nhập hành động (Ấn Enter hoặc nút Lọc)..."
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
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
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-unit w-48">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Mức độ rủi ro</label>
            <select 
              className="w-full bg-surface hover:bg-surface-container focus:bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface outline-none transition-shadow"
              value={riskLevelInput}
              onChange={(e) => setRiskLevelInput(e.target.value)}
            >
              <option value="all">Tất cả mức độ</option>
              <option value="info">Thông tin (Info)</option>
              <option value="warning">Cảnh báo (Warning)</option>
              <option value="critical">Nghiêm trọng (Critical)</option>
            </select>
          </div>
          <div className="flex gap-stack-sm">
            <button 
              onClick={handleApplyFilters}
              className="bg-primary text-on-primary font-label-md text-label-md px-stack-md py-2 rounded-lg flex items-center gap-unit hover:opacity-90 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Lọc dữ liệu
            </button>
            <button 
              onClick={handleResetFilters}
              className="bg-transparent border border-outline text-on-surface-variant font-label-md text-label-md px-stack-md py-2 rounded-lg flex items-center gap-unit hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              Đặt lại
            </button>
          </div>
        </section>

        {/* Data Table */}
        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-variant flex flex-col overflow-hidden">
          <div className="overflow-x-auto min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-full pt-20">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full pt-20 text-error">
                <span className="material-symbols-outlined text-[48px] mb-2">error</span>
                <p>{error}</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full pt-20 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] mb-2">manage_search</span>
                <p>Không tìm thấy nhật ký nào phù hợp</p>
              </div>
            ) : (
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
                  {logs.map((log) => {
                    const isAi = log.userId === null && log.action?.toLowerCase().includes('ai');
                    const userName = log.user?.fullName || log.user?.email || 'Hệ thống';
                    const level = getLevelDisplay(log.riskLevel);
                    
                    return (
                      <tr key={log.id} className="hover:bg-surface-container-low transition-colors group relative">
                        <td className="py-stack-sm px-stack-md font-body-md text-body-md text-on-surface">
                          {isAi && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-secondary"></div>}
                          <div className={`flex items-center gap-unit ${isAi ? 'pl-1' : ''}`}>
                            <span className="material-symbols-outlined text-outline text-[16px]">schedule</span>
                            {formatDate(log.createdAt)}
                          </div>
                        </td>
                        <td className="py-stack-sm px-stack-md">
                          <div className="flex items-center gap-stack-sm">
                            {isAi ? (
                              <div className="w-8 h-8 rounded-full bg-surface-container-highest text-primary flex items-center justify-center font-label-sm font-bold relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-secondary-fixed to-transparent opacity-30"></div>
                                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                              </div>
                            ) : (
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-label-sm font-bold ${
                                  level === 'Critical' || level === 'High' 
                                    ? 'bg-error-container text-on-error-container' 
                                    : 'bg-primary-container text-on-primary-container'
                                  }`}
                              >
                                {getInitials(userName)}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className={`font-label-md text-label-md ${isAi ? 'text-secondary' : 'text-on-surface'}`}>{userName}</span>
                              <span className="font-label-sm text-label-sm text-outline">{log.ipAddress || 'System Internal'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-stack-sm px-stack-md font-label-md text-label-md text-on-surface font-mono text-[13px]">{log.action}</td>
                        <td className="py-stack-sm px-stack-md font-body-md text-body-md text-on-surface-variant truncate max-w-[300px]" title={log.details || log.description}>
                          {log.details || log.description}
                        </td>
                        <td className="py-stack-sm px-stack-md">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-label-sm text-label-sm ${
                              level === 'Critical' || level === 'High'
                                ? 'bg-error-container text-on-error-container'
                                : level === 'Warning'
                                ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant'
                                : 'bg-surface-container text-on-surface'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {level === 'Critical' || level === 'High' ? 'dangerous' : level === 'Warning' ? 'warning' : 'info'}
                            </span>
                            {level}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          {!loading && !error && logs.length > 0 && (
            <div className="bg-surface-container-lowest border-t border-surface-variant p-stack-sm px-stack-md flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline">
                Hiển thị {((page - 1) * 20) + 1}-{Math.min(page * 20, totalLogs)} trong số {totalLogs} bản ghi
              </span>
              <div className="flex items-center gap-unit">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, index, array) => (
                    <React.Fragment key={p}>
                      {index > 0 && array[index - 1] !== p - 1 && <span className="text-outline mx-1">...</span>}
                      <button 
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg font-label-sm ${
                          page === p 
                            ? 'bg-primary-container text-on-primary-container font-bold' 
                            : 'hover:bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                ))}

                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}