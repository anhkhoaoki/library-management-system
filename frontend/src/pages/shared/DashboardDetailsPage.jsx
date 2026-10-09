import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

export default function DashboardDetailsPage({ role }) {
  const { type } = useParams(); // 'all_users', 'all_books', 'active_borrows', 'fines', 'overdue', 'pending_reservations'
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Map type to display name
  const titles = {
    all_users: 'Danh sách Thành viên',
    all_books: 'Danh mục Tài liệu',
    active_borrows: 'Sách đang được mượn',
    fines: 'Thông tin Phí phạt',
    overdue: 'Sách quá hạn trả',
    pending_reservations: 'Yêu cầu Mượn chờ xử lý',
  };

  const icons = {
    all_users: 'group',
    all_books: 'library_books',
    active_borrows: 'book_2',
    fines: 'payments',
    overdue: 'warning',
    pending_reservations: 'event_seat',
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/admin/reports/export?type=${type}`);
        if (response.data?.success) {
          setData(response.data.data || []);
        }
      } catch (err) {
        console.error('Error fetching detail data:', err);
        setError('Không thể tải dữ liệu chi tiết.');
      } finally {
        setLoading(false);
      }
    };
    if (type) fetchData();
  }, [type]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col justify-center items-center h-[300px] text-primary">
          <span className="material-symbols-outlined animate-spin text-5xl mb-4">progress_activity</span>
          <p className="font-body-lg">Đang tải dữ liệu...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-error-container text-on-error-container p-6 rounded-2xl border border-error flex items-center justify-center gap-3">
          <span className="material-symbols-outlined text-3xl">error</span>
          <p className="font-body-lg">{error}</p>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-container-lowest rounded-2xl border border-surface-variant border-dashed">
          <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">inbox</span>
          <p className="font-body-lg text-on-surface-variant">Không có dữ liệu cho mục này.</p>
        </div>
      );
    }

    // ─── 1. ALL USERS ──────────────────────────────────────────────
    if (type === 'all_users') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.map(item => (
            <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md hover:border-primary/50 transition-all group flex flex-col items-center text-center">
              <div className="relative mb-4">
                {item.avatarUrl ? (
                  <img src={item.avatarUrl} alt={item.fullName} className="w-20 h-20 rounded-full object-cover border-4 border-surface-container" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-3xl font-bold border-4 border-white shadow-sm">
                    {item.fullName.charAt(0)}
                  </div>
                )}
                {item.status === 'ACTIVE' ? (
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                ) : (
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-error border-2 border-white rounded-full"></span>
                )}
              </div>
              <h3 className="font-title-md font-bold text-on-surface line-clamp-1">{item.fullName}</h3>
              <p className="text-sm text-on-surface-variant mb-2">{item.email}</p>
              
              <div className="mt-auto pt-4 flex flex-col gap-2 w-full">
                {item.readerCode && (
                  <div className="bg-surface-container-low px-3 py-1.5 rounded-lg text-xs flex justify-between font-mono">
                    <span className="text-outline">Mã thẻ:</span>
                    <span className="font-bold text-on-surface">{item.readerCode}</span>
                  </div>
                )}
                <div className="flex gap-2 w-full">
                  <span className="flex-1 bg-secondary-container text-on-secondary-container text-xs font-bold py-1.5 rounded-lg">
                    {item.role?.name || 'READER'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // ─── 2. ALL BOOKS ──────────────────────────────────────────────
    if (type === 'all_books') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.map(item => (
            <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant hover:shadow-md hover:border-primary/50 transition-all flex flex-col">
              <div className="h-48 w-full bg-surface-variant relative">
                {item.coverImageUrl ? (
                  <img src={item.coverImageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-outline opacity-50 bg-surface-container-high">
                    <span className="material-symbols-outlined text-5xl mb-2">menu_book</span>
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm">
                  {item.category?.name || 'Chưa phân loại'}
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-title-md font-bold text-on-surface line-clamp-2 mb-1">{item.title}</h3>
                <p className="text-sm text-on-surface-variant mb-4 line-clamp-1">{Array.isArray(item.authorNames) ? item.authorNames.join(', ') : item.authorNames}</p>
                
                <div className="mt-auto">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-outline">Kho sách:</span>
                    <span className="text-sm font-bold text-on-surface">{item.availableCopies} / {item.totalCopies} cuốn</span>
                  </div>
                  <div className="w-full bg-surface-variant rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full" 
                      style={{ width: `${item.totalCopies > 0 ? (item.availableCopies / item.totalCopies) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // ─── 3. ACTIVE BORROWS & OVERDUE ──────────────────────────────
    if (type === 'active_borrows' || type === 'overdue') {
      return (
        <div className="flex flex-col gap-4">
          {data.map(item => {
            const isOverdue = new Date(item.dueDate) < new Date();
            return (
              <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-outline-variant hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-6">
                
                {/* Book Info */}
                <div className="flex gap-4 items-center flex-1 min-w-0">
                  {item.physicalCopy?.book?.coverImageUrl ? (
                    <img src={item.physicalCopy.book.coverImageUrl} alt="Book Cover" className="w-16 h-20 object-cover rounded shadow-sm" />
                  ) : (
                    <div className="w-16 h-20 bg-surface-variant rounded flex items-center justify-center text-outline">
                      <span className="material-symbols-outlined">book</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-title-md font-bold text-on-surface line-clamp-1 mb-1">{item.physicalCopy?.book?.title}</h4>
                    <p className="text-xs text-on-surface-variant mb-2">Mã sách: <span className="font-mono bg-surface-container px-1 py-0.5 rounded text-on-surface">{item.physicalCopy?.book?.isbn || 'N/A'}</span></p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-medium border border-outline-variant">
                        Đang mượn
                      </span>
                      {isOverdue && (
                        <span className="text-xs px-2 py-0.5 rounded bg-error-container text-on-error-container font-bold flex items-center gap-1 animate-pulse">
                          <span className="material-symbols-outlined text-[12px]">warning</span> Quá hạn
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 md:border-l md:border-surface-variant md:pl-6 min-w-0">
                  <p className="text-xs text-outline mb-1 uppercase tracking-wider font-bold">Người mượn</p>
                  <div className="flex items-center gap-3">
                    {item.user?.avatarUrl ? (
                      <img src={item.user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                        {item.user?.fullName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-body-md font-bold text-on-surface line-clamp-1">{item.user?.fullName}</p>
                      <p className="text-xs text-on-surface-variant font-mono">{item.user?.readerCode || item.user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex-1 md:border-l md:border-surface-variant md:pl-6 flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-outline">Ngày mượn:</span>
                    <span className="text-sm font-medium text-on-surface">{new Date(item.borrowedAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-outline">Hạn trả:</span>
                    <span className={`text-sm font-bold ${isOverdue ? 'text-error' : 'text-on-surface'}`}>
                      {new Date(item.dueDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      );
    }

    // ─── 4. FINES ──────────────────────────────────────────────────
    if (type === 'fines') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-outline-variant flex items-center gap-5 hover:shadow-md transition-shadow relative overflow-hidden">
              {/* Highlight bar for status */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.status === 'PENDING' ? 'bg-warning' : item.status === 'PAID' ? 'bg-emerald-500' : 'bg-outline-variant'}`}></div>
              
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${item.status === 'PENDING' ? 'bg-warning-container text-warning' : 'bg-success-container text-success'}`}>
                <span className="material-symbols-outlined text-3xl">{item.status === 'PENDING' ? 'schedule' : 'check_circle'}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-title-md font-bold text-on-surface line-clamp-1">{item.user?.fullName}</h4>
                <p className="text-sm text-on-surface-variant line-clamp-1 mb-2 italic">"{item.borrowRecord?.physicalCopy?.book?.title}"</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${item.status === 'PENDING' ? 'bg-warning text-on-warning' : 'bg-success text-on-success'}`}>
                    {item.status}
                  </span>
                  <span className="text-xs text-outline">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-outline mb-1">Số tiền phạt</p>
                <p className="font-display-sm font-bold text-error">
                  {item.totalAmount?.toLocaleString('vi-VN')}đ
                </p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // ─── 5. PENDING RESERVATIONS ───────────────────────────────────
    if (type === 'pending_reservations') {
      return (
        <div className="flex flex-col gap-4">
          {data.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-outline-variant hover:shadow-md transition-all flex items-center justify-between">
              
              <div className="flex gap-4 items-center min-w-0">
                <div className="w-12 h-12 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                  {item.user?.fullName?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-title-md font-bold text-on-surface truncate">{item.user?.fullName}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide border whitespace-nowrap ${item.status === 'READY_FOR_PICKUP' ? 'bg-success-container text-on-success-container border-success' : 'bg-warning-container text-on-warning-container border-warning'}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant flex items-center gap-1 line-clamp-1">
                    <span className="material-symbols-outlined text-sm">book</span>
                    <span className="italic">{item.book?.title}</span>
                  </p>
                </div>
              </div>
              
              <div className="text-right shrink-0">
                <p className="text-xs text-outline mb-1">Ngày đặt giữ chỗ</p>
                <p className="font-body-md font-bold text-on-surface">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</p>
                <p className="text-xs text-on-surface-variant mt-1">{new Date(item.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</p>
              </div>

            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <MainLayout role={role} userName={user?.fullName} userRole={role === 'admin' ? 'Quản trị viên' : 'Thủ thư'}>
      <div className="flex flex-col gap-stack-lg max-w-7xl mx-auto pb-10">
        
        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-primary to-primary-container rounded-3xl p-8 overflow-hidden shadow-sm">
          <div className="absolute -right-10 -top-10 text-primary-fixed opacity-30 transform rotate-12 pointer-events-none">
            <span className="material-symbols-outlined" style={{ fontSize: '200px' }}>
              {icons[type] || 'monitoring'}
            </span>
          </div>
          
          <div className="relative z-10 flex items-center gap-6">
            <button 
              onClick={() => navigate(-1)} 
              className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all backdrop-blur-sm"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  Chi tiết Thống kê
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm">
                  {data.length} Bản ghi
                </span>
              </div>
              <h2 className="font-display-sm md:font-display-md text-white font-bold">
                {titles[type] || 'Danh sách Dữ liệu'}
              </h2>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="w-full">
          {renderContent()}
        </div>
        
      </div>
    </MainLayout>
  );
}
